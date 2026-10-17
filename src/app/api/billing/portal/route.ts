import { NextResponse } from 'next/server';
import { getRepositories } from '@/lib/db';
import { readClientId } from '@/lib/license';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Ouvre une session du portail de gestion Stripe : factures, changement de
 * moyen de paiement, resiliation.
 *
 * Aucune dependance npm : l'API REST de Stripe est appelee directement.
 */
export async function POST(request: Request) {
  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret) {
    return NextResponse.json(
      {
        error: 'billing_not_configured',
        message: 'La facturation n est pas activee sur cette instance.',
      },
      { status: 501 },
    );
  }

  const { clientId } = readClientId(request);
  const candidates = getRepositories().licenses.listByClient(clientId);
  const customerId = candidates.find((license) => license.stripeCustomerId)?.stripeCustomerId;

  if (!customerId) {
    return NextResponse.json(
      {
        error: 'no_customer',
        message: 'Aucun abonnement Stripe n est rattache a ce navigateur.',
      },
      { status: 404 },
    );
  }

  const baseUrl = (process.env.NEXT_PUBLIC_APP_URL ?? new URL(request.url).origin).replace(/\/$/, '');

  const params = new URLSearchParams({
    customer: customerId,
    return_url: `${baseUrl}/compte`,
  });

  try {
    const response = await fetch('https://api.stripe.com/v1/billing_portal/sessions', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${secret}`,
        'content-type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    const payload = (await response.json()) as { url?: string; error?: { message?: string } };

    if (!response.ok) {
      return NextResponse.json(
        {
          error: 'stripe_error',
          message: payload.error?.message ?? 'Stripe a refuse l ouverture du portail.',
        },
        { status: 502 },
      );
    }

    return NextResponse.json({ url: payload.url });
  } catch {
    return NextResponse.json(
      { error: 'stripe_unreachable', message: 'Stripe est injoignable depuis ce serveur.' },
      { status: 502 },
    );
  }
}
