import { NextResponse } from 'next/server';

import { getRepositories, getStorageStatus } from '@/lib/db';
import { CLIENT_COOKIE, consumeQuota, peekQuota, resolveEntitlement, type Entitlement } from '@/lib/license';
import { resolveClientIdentity } from '@/lib/security/client-ip';
import { evaluateRateLimit, rateLimitHeaders, type RateLimitDecision } from '@/lib/security/rate-limit';
import {
  MAX_SITE_INPUT_LENGTH,
  checkSiteSync,
  normalizeSiteInput,
} from '@/lib/engine/site';
import { activeChecksEnabled, collectNetworkReport } from '@/lib/engine/site-network';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_BODY_BYTES = 16 * 1024;

interface CheckSiteBody {
  url?: unknown;
  /** Active les verifications reseau (DNS, RDAP, reputation). */
  active?: unknown;
}

function asString(value: unknown, max: number): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  if (trimmed.length === 0) return undefined;
  return trimmed.slice(0, max);
}

function recordUsage(
  entitlement: Entitlement,
  verdict: string,
  score: number,
  durationMs: number,
  blocked = false,
): void {
  try {
    getRepositories().usage.record({
      ts: Date.now(),
      clientId: entitlement.clientId,
      plan: entitlement.plan,
      channel: 'site',
      verdict,
      score,
      durationMs,
      blocked,
    });
  } catch {
    /* les statistiques ne doivent jamais faire echouer une analyse */
  }
}

export async function POST(request: Request) {
  const startedAt = Date.now();

  const declaredLength = Number(request.headers.get('content-length') ?? '0');
  if (Number.isFinite(declaredLength) && declaredLength > MAX_BODY_BYTES) {
    return NextResponse.json(
      { error: 'payload_too_large', message: 'Requete trop volumineuse.' },
      { status: 413 },
    );
  }

  const { entitlement, isNew } = resolveEntitlement(request);
  const identity = resolveClientIdentity(request.headers);

  const decision: RateLimitDecision = evaluateRateLimit({ identity, paid: entitlement.paid });
  if (!decision.allowed) {
    recordUsage(entitlement, 'rate_limited', 0, Date.now() - startedAt, true);
    return NextResponse.json(
      {
        error: 'rate_limited',
        message:
          decision.scope === 'global'
            ? 'Le service recoit trop de requetes en ce moment. Reessayez dans quelques instants.'
            : `Trop de requetes depuis votre connexion. Reessayez dans ${decision.retryAfterSeconds} seconde(s).`,
        retryAfterSeconds: decision.retryAfterSeconds,
        policy: decision.blockedBy,
        identityTrusted: decision.identityTrusted,
      },
      { status: 429, headers: rateLimitHeaders(decision) },
    );
  }

  const quotaBefore = peekQuota(entitlement);
  if (quotaBefore.exceeded) {
    recordUsage(entitlement, 'quota_exceeded', 0, Date.now() - startedAt, true);
    return NextResponse.json(
      {
        error: 'quota_exceeded',
        message: `Quota quotidien atteint (${quotaBefore.limit} verifications par jour sur l offre ${entitlement.plan}).`,
        quota: quotaBefore,
        plan: entitlement.plan,
        licenseStatus: entitlement.licenseStatus ?? null,
      },
      { status: 429, headers: rateLimitHeaders(decision) },
    );
  }

  let body: CheckSiteBody;
  try {
    body = (await request.json()) as CheckSiteBody;
  } catch {
    return NextResponse.json(
      { error: 'invalid_json', message: 'Corps de requete illisible.' },
      { status: 400, headers: rateLimitHeaders(decision) },
    );
  }

  const rawUrl = asString(body.url, MAX_SITE_INPUT_LENGTH);
  if (!rawUrl) {
    return NextResponse.json(
      {
        error: 'missing_url',
        message: 'Aucune adresse a verifier. Saisissez un nom de domaine ou une adresse complete.',
      },
      { status: 400, headers: rateLimitHeaders(decision) },
    );
  }

  const parsed = normalizeSiteInput(rawUrl);
  if (!parsed) {
    return NextResponse.json(
      {
        error: 'invalid_url',
        message:
          'Cette entree n est pas une adresse de site exploitable. Utilisez un nom de domaine (exemple.com) ou une adresse complete (https://exemple.com/page). Les adresses de reseau interne ne sont pas acceptees.',
      },
      { status: 400, headers: rateLimitHeaders(decision) },
    );
  }

  // --- Verifications reseau, uniquement sur demande explicite -------------
  const wantsActive = body.active === true;
  const network = wantsActive
    ? await collectNetworkReport(parsed, { enabled: activeChecksEnabled() })
    : null;

  const result = checkSiteSync(rawUrl, { network });

  const quota = consumeQuota(entitlement);
  recordUsage(entitlement, result.verdict, result.score, Date.now() - startedAt);

  const response = NextResponse.json(
    {
      ...result,
      quota,
      plan: entitlement.plan,
      licenseStatus: entitlement.licenseStatus ?? null,
      serverDurationMs: Date.now() - startedAt,
    },
    { status: 200, headers: rateLimitHeaders(decision) },
  );

  if (isNew) {
    response.cookies.set(CLIENT_COOKIE, entitlement.clientId, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60 * 24 * 365,
    });
  }

  response.headers.set('Cache-Control', 'no-store, max-age=0');
  return response;
}

export async function GET() {
  const storage = getStorageStatus();
  return NextResponse.json({
    endpoint: '/api/check-site',
    method: 'POST',
    body: {
      url: 'string (obligatoire) — nom de domaine ou adresse complete',
      active: 'boolean (optionnel) — active les verifications reseau',
    },
    verdicts: {
      official: 'domaine officiel verifie d une organisation',
      unknown: 'rien de suspect, mais rien ne confirme l authenticite',
      suspicious: 'anomalies structurelles sans imitation identifiable',
      phishing: 'le domaine imite une organisation connue',
    },
    network: {
      enabled: activeChecksEnabled(),
      sources: ['resolution DNS', 'RDAP (annuaire des domaines)', 'Google Safe Browsing (si configure)'],
      note: 'Le site analyse n est JAMAIS ouvert ni contacte.',
    },
    auth: {
      header: 'x-qs-license',
      alternative: 'Authorization: Bearer QS-...',
    },
    rateLimit: {
      headers: ['RateLimit-Limit', 'RateLimit-Remaining', 'Retry-After'],
    },
    storage: {
      driver: storage.driver,
      durable: !storage.degraded,
    },
  });
}
