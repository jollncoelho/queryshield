import { NextResponse } from 'next/server';
import { ENGINE_NAME, ENGINE_VERSION } from '@/lib/engine';
import { remoteEngineConfig } from '@/lib/engine/remote';
import { getRepositories, getStorageStatus } from '@/lib/db';
import { isRateLimitIdentityReliable, trustedProxyHops } from '@/lib/security/client-ip';
import { rateLimitDisabled } from '@/lib/security/rate-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Sonde de supervision.
 *
 * Elle expose volontairement l'etat du stockage et de la limitation de debit :
 * un service qui tourne en mode degrade doit pouvoir etre detecte par une sonde
 * automatique, pas decouvert par un utilisateur mecontent.
 */
export async function GET() {
  const remote = remoteEngineConfig();
  const storage = getStorageStatus();

  let reachable = true;
  try {
    getRepositories().usage.countSince(Date.now() - 60_000);
  } catch {
    reachable = false;
  }

  const degraded = storage.degraded || !reachable;

  return NextResponse.json(
    {
      status: degraded ? 'degraded' : 'ok',
      service: 'queryshield',
      engine: ENGINE_NAME,
      version: ENGINE_VERSION,
      semanticEngine: remote ? 'configure' : 'absent (heuristiques seules)',
      billing: process.env.STRIPE_SECRET_KEY ? 'configure' : 'absent',
      storage: {
        driver: storage.driver,
        durable: !storage.degraded,
        reachable,
        reason: storage.reason,
      },
      rateLimit: {
        enabled: !rateLimitDisabled(),
        identitySource: isRateLimitIdentityReliable()
          ? `proxys de confiance : ${trustedProxyHops()}`
          : 'aucune source fiable (seau commun)',
        ipSaltConfigured: Boolean(process.env.QUERYSHIELD_IP_SALT),
      },
      timestamp: new Date().toISOString(),
    },
    { status: 200, headers: { 'Cache-Control': 'no-store' } },
  );
}
