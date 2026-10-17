import { NextResponse } from 'next/server';
import { resolveEntitlement } from '@/lib/license';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Interval = 'monthly' | 'yearly';
type PaidPlan = 'pro' | 'business';

const PRICE_ENV: Record<string, string | undefined> = {
  'pro:monthly': process.env.STRIPE_PRICE_PRO_MONTHLY,
  'pro:yearly': process.env.STRIPE_PRICE_PRO_YEARLY,
  'business:monthly': process.env.STRIPE_PRICE_BUSINESS_MONTHLY,
  'business:yearly': process.env.STRIPE_PRICE_BUSINESS_YEARLY,
};

/**
 * Cree une session Stripe Checkout (mode abonnement).
 *
 * Aucune dependance npm : l'API REST de Stripe est appelee directement en
 * `application/x-www-form-urlencoded`, ce qui evite d'embarquer le SDK pour
 * un seul appel.
 */
export async function POST(request: Request) {
  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret) {
    return NextResponse.json(
      {
        error: 'billing_not_configured',
        message:
          'La facturation n est pas encore activee sur cette instance. Renseignez STRIPE_SECRET_KEY et les identifiants de prix dans .env.local pour ouvrir les abonnements.',
      },
      { status: 501 },
    );
  }

  let body: { plan?: unknown; interval?: unknown };
  try {
    body = (await request.json()) as { plan?: unknown; interval?: unknown };
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const plan = body.plan === 'business' ? 'business' : body.plan === 'pro' ? 'pro' : null;
  const interval: Interval = body.interval === 'yearly' ? 'yearly' : 'monthly';

  if (!plan) {
    return NextResponse.json(
      { error: 'invalid_plan', message: 'Offre inconnue. Valeurs acceptees : pro, business.' },
      { status: 400 },
    );
  }

  const priceId = PRICE_ENV[`${plan}:${interval}`];
  if (!priceId) {
    return NextResponse.json(
      {
        error: 'price_not_configured',
        message: `Aucun identifiant de prix configure pour l offre ${plan} (${interval}).`,
      },
      { status: 501 },
    );
  }

  const { entitlement } = resolveEntitlement(request);
  const baseUrl = (process.env.NEXT_PUBLIC_APP_URL ?? new URL(request.url).origin).replace(/\/$/, '');

  const params = new URLSearchParams({
    mode: 'subscription',
    'line_items[0][price]': priceId,
    'line_items[0][quantity]': '1',
    success_url: `${baseUrl}/compte?paiement=succes`,
    cancel_url: `${baseUrl}/tarifs?paiement=annule`,
    client_reference_id: entitlement.clientId,
    allow_promotion_codes: 'true',
    // Les metadonnees sont posees a la fois sur la session et sur l'abonnement :
    // le webhook peut ainsi traiter l'evenement checkout.session.completed sans
    // attendre customer.subscription.created.
    'metadata[plan]': plan,
    'metadata[client_id]': entitlement.clientId,
    'subscription_data[metadata][plan]': plan,
    'subscription_data[metadata][client_id]': entitlement.clientId,
  });

  try {
    const stripeResponse = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${secret}`,
        'content-type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    const payload = (await stripeResponse.json()) as { url?: string; error?: { message?: string } };

    if (!stripeResponse.ok) {
      return NextResponse.json(
        {
          error: 'stripe_error',
          message: payload.error?.message ?? 'Stripe a refuse la creation de la session.',
        },
        { status: 502 },
      );
    }

    return NextResponse.json({ url: payload.url }, { status: 200 });
  } catch {
    return NextResponse.json(
      { error: 'stripe_unreachable', message: 'Stripe est injoignable depuis ce serveur.' },
      { status: 502 },
    );
  }
}
