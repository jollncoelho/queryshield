import { createHmac, timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';
import { applySubscriptionUpdate, revokeLicense } from '@/lib/license';
import { getRepositories } from '@/lib/db';
import type { LicenseStatus, Plan } from '@/lib/db/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Webhook Stripe — desormais persistant.
 *
 * La signature est verifiee selon le schema officiel :
 *   signed_payload = "<timestamp>.<corps brut>"
 *   signature       = HMAC-SHA256(signed_payload, STRIPE_WEBHOOK_SECRET)
 *
 * Le corps est lu tel quel (request.text()) : toute re-serialisation
 * invaliderait la signature.
 *
 * Idempotence : les traitements cherchent l'abonnement par son identifiant
 * Stripe avant de creer quoi que ce soit. Une livraison repetee du meme
 * evenement met donc a jour un enregistrement existant au lieu d'en creer un
 * second.
 */

const TOLERANCE_SECONDS = 300;

function verifySignature(rawBody: string, header: string | null, secret: string): boolean {
  if (!header) return false;

  const parts = header.split(',').reduce<Record<string, string>>((accumulator, part) => {
    const [key, value] = part.split('=').map((item) => item.trim());
    if (key && value) accumulator[key] = value;
    return accumulator;
  }, {});

  const timestamp = parts.t;
  const provided = parts.v1;
  if (!timestamp || !provided) return false;

  const age = Math.abs(Math.floor(Date.now() / 1000) - Number(timestamp));
  if (!Number.isFinite(age) || age > TOLERANCE_SECONDS) return false;

  const expected = createHmac('sha256', secret).update(`${timestamp}.${rawBody}`).digest('hex');

  const expectedBuffer = Buffer.from(expected, 'utf8');
  const providedBuffer = Buffer.from(provided, 'utf8');
  if (expectedBuffer.length !== providedBuffer.length) return false;

  return timingSafeEqual(expectedBuffer, providedBuffer);
}

/** Statuts Stripe -> statuts de licence. */
function mapStatus(stripeStatus: string | undefined): LicenseStatus {
  switch (stripeStatus) {
    case 'active':
    case 'trialing':
      return 'active';
    case 'past_due':
    case 'incomplete':
      return 'past_due';
    case 'canceled':
    case 'unpaid':
    case 'incomplete_expired':
      return 'canceled';
    default:
      return 'past_due';
  }
}

function mapPlan(plan: string | undefined): Exclude<Plan, 'free'> {
  return plan === 'business' ? 'business' : 'pro';
}

/** Stripe exprime les dates en secondes ; on stocke des millisecondes. */
function toMillis(seconds: unknown): number | null {
  if (typeof seconds !== 'number' || !Number.isFinite(seconds) || seconds <= 0) return null;
  return Math.floor(seconds * 1000);
}

interface StripeObject {
  id?: string;
  subscription?: string | null;
  customer?: string | null;
  client_reference_id?: string | null;
  customer_details?: { email?: string | null } | null;
  customer_email?: string | null;
  status?: string;
  current_period_end?: number;
  ended_at?: number | null;
  metadata?: Record<string, string> | null;
  lines?: { data?: { price?: { id?: string } }[] };
}

interface StripeEvent {
  id?: string;
  type?: string;
  data?: { object?: StripeObject };
}

export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: 'webhook_not_configured', message: 'STRIPE_WEBHOOK_SECRET est absent.' },
      { status: 501 },
    );
  }

  const rawBody = await request.text();

  if (!verifySignature(rawBody, request.headers.get('stripe-signature'), secret)) {
    return NextResponse.json({ error: 'invalid_signature' }, { status: 400 });
  }

  let event: StripeEvent;
  try {
    event = JSON.parse(rawBody) as StripeEvent;
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const object = event.data?.object ?? {};
  const metadata = (object.metadata ?? {}) as Record<string, string>;
  const subscriptionId = object.subscription ?? (event.type?.startsWith('customer.subscription') ? object.id : undefined);

  const result: Record<string, unknown> = {
    received: true,
    event: event.type ?? 'unknown',
    handled: false,
  };

  try {
    switch (event.type) {
      // Un paiement vient d'aboutir : on rattache l'abonnement au porteur.
      // La periode exacte arrive avec les evenements customer.subscription.*,
      // qui suivent immediatement.
      case 'checkout.session.completed': {
        if (!subscriptionId) break;
        const license = applySubscriptionUpdate({
          stripeSubscriptionId: subscriptionId,
          status: 'active',
          plan: mapPlan(metadata.plan),
          clientId: object.client_reference_id ?? metadata.client_id ?? null,
          email: object.customer_details?.email ?? object.customer_email ?? null,
          stripeCustomerId: object.customer ?? null,
          note: 'cree via checkout Stripe',
        });
        result.handled = true;
        result.licenseIssued = true;
        result.plan = license.plan;
        break;
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        if (!object.id) break;
        const status = mapStatus(object.status);
        const license = applySubscriptionUpdate({
          stripeSubscriptionId: object.id,
          status,
          plan: mapPlan(metadata.plan),
          clientId: metadata.client_id ?? null,
          stripeCustomerId: object.customer ?? null,
          currentPeriodEnd:
            status === 'canceled' ? toMillis(object.ended_at) : toMillis(object.current_period_end),
          note: `stripe:${object.status ?? 'inconnu'}`,
        });
        result.handled = true;
        result.plan = license.plan;
        result.status = license.status;
        break;
      }

      // Echec de paiement : l'acces reste ouvert jusqu'a la fin de la periode
      // deja payee, mais le statut signale l'incident.
      case 'invoice.payment_failed': {
        const target = subscriptionId;
        if (!target) break;
        const existing = getRepositories().licenses.findBySubscriptionId(target);
        if (!existing) break;
        applySubscriptionUpdate({
          stripeSubscriptionId: target,
          status: 'past_due',
          note: 'echec de paiement',
        });
        result.handled = true;
        break;
      }

      case 'charge.refunded':
      case 'charge.dispute.created': {
        // Fraude ou litige : la licence est coupee immediatement.
        const customer = object.customer;
        if (!customer) break;
        const candidates = getRepositories().licenses.listAll(500).filter(
          (license) => license.stripeCustomerId === customer,
        );
        for (const candidate of candidates) {
          revokeLicense(candidate.key, `revoquee : ${event.type}`);
        }
        result.handled = true;
        result.revoked = candidates.length;
        break;
      }

      default:
        break;
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    // Un doublon de livraison n'est pas une erreur : repondre 200 evite que
    // Stripe reessaie pendant trois jours pour rien.
    if (/unique|duplicate|deja existante/i.test(message)) {
      return NextResponse.json({ ...result, duplicate: true });
    }

    console.error(`[queryshield/webhook] echec du traitement ${event.type} : ${message}`);
    // Erreur reelle : on demande a Stripe de reessayer.
    return NextResponse.json({ error: 'processing_failed', message }, { status: 500 });
  }

  return NextResponse.json(result);
}
