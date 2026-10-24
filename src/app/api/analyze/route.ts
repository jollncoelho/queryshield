import { NextResponse } from 'next/server';
import { analyze, MAX_INPUT_LENGTH } from '@/lib/engine';
import { CLIENT_COOKIE, consumeQuota, peekQuota, resolveEntitlement, type Entitlement } from '@/lib/license';
import { getRepositories, getStorageStatus } from '@/lib/db';
import { resolveClientIdentity } from '@/lib/security/client-ip';
import { evaluateRateLimit, rateLimitHeaders, type RateLimitDecision } from '@/lib/security/rate-limit';
import type { Channel } from '@/lib/engine/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const VALID_CHANNELS: Channel[] = ['email', 'sms', 'messaging', 'unknown'];
const MAX_HEADERS_LENGTH = 30000;
const MAX_BODY_BYTES = 128 * 1024;

interface AnalyzeBody {
  text?: unknown;
  channel?: unknown;
  rawHeaders?: unknown;
  subject?: unknown;
  sender?: unknown;
}

function asString(value: unknown, max: number): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  if (trimmed.length === 0) return undefined;
  return trimmed.slice(0, max);
}

/** Trace l'evenement sans jamais enregistrer le contenu du message. */
function recordUsage(
  entitlement: Entitlement,
  channel: string,
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
      channel,
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

  // --- 0. Taille annoncee ------------------------------------------------
  // Rejeter tot evite de lire un corps volumineux pour rien.
  const declaredLength = Number(request.headers.get('content-length') ?? '0');
  if (Number.isFinite(declaredLength) && declaredLength > MAX_BODY_BYTES) {
    return NextResponse.json(
      { error: 'payload_too_large', message: 'Message trop volumineux (128 Ko maximum).' },
      { status: 413 },
    );
  }

  // --- 1. Identite et offre ----------------------------------------------
  const { entitlement, isNew } = resolveEntitlement(request);
  const identity = resolveClientIdentity(request.headers);

  // --- 2. Limitation de debit --------------------------------------------
  // Avant toute analyse : c'est ce qui protege reellement le service.
  const decision: RateLimitDecision = evaluateRateLimit({
    identity,
    paid: entitlement.paid,
  });

  if (!decision.allowed) {
    recordUsage(entitlement, 'unknown', 'rate_limited', 0, Date.now() - startedAt, true);

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

  // --- 3. Quota de l'offre -----------------------------------------------
  const quotaBefore = peekQuota(entitlement);
  if (quotaBefore.exceeded) {
    recordUsage(entitlement, 'unknown', 'quota_exceeded', 0, Date.now() - startedAt, true);

    const suffix =
      entitlement.licenseStatus === 'unknown'
        ? ' La cle de licence presentee n a pas ete reconnue : verifiez-la (un caractere de trop suffit a la rendre invalide).'
        : entitlement.licenseStatus === 'expired'
          ? ' Votre abonnement a expire : renouvelez-le pour retrouver un quota complet.'
          : entitlement.licenseStatus === 'revoked'
            ? ' Cette licence a ete revoquee.'
            : ' Passez a une offre superieure pour continuer.';

    return NextResponse.json(
      {
        error: 'quota_exceeded',
        message: `Quota quotidien atteint (${quotaBefore.limit} analyses par jour sur l offre ${entitlement.plan}).${suffix}`,
        quota: quotaBefore,
        plan: entitlement.plan,
        licenseStatus: entitlement.licenseStatus ?? null,
      },
      { status: 429, headers: rateLimitHeaders(decision) },
    );
  }

  // --- 4. Lecture du corps -----------------------------------------------
  let body: AnalyzeBody;
  try {
    body = (await request.json()) as AnalyzeBody;
  } catch {
    return NextResponse.json(
      { error: 'invalid_json', message: 'Corps de requete illisible.' },
      { status: 400, headers: rateLimitHeaders(decision) },
    );
  }

  const text = asString(body.text, MAX_INPUT_LENGTH);
  if (!text || text.length < 4) {
    return NextResponse.json(
      {
        error: 'missing_text',
        message: 'Aucun contenu a analyser. Collez le message recu (4 caracteres minimum).',
      },
      { status: 400, headers: rateLimitHeaders(decision) },
    );
  }

  const channel = VALID_CHANNELS.includes(body.channel as Channel)
    ? (body.channel as Channel)
    : 'unknown';

  // --- 5. Analyse --------------------------------------------------------
  const result = await analyze({
    text,
    channel,
    rawHeaders: asString(body.rawHeaders, MAX_HEADERS_LENGTH),
    subject: asString(body.subject, 400),
    sender: asString(body.sender, 400),
  });

  // --- 6. Consommation du quota ------------------------------------------
  const quota = consumeQuota(entitlement);

  recordUsage(entitlement, channel, result.verdict, result.score, Date.now() - startedAt);

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

  // Aucune mise en cache : un message analyse ne doit jamais se retrouver
  // dans un cache intermediaire.
  response.headers.set('Cache-Control', 'no-store, max-age=0');
  return response;
}

export async function GET() {
  const storage = getStorageStatus();
  return NextResponse.json({
    endpoint: '/api/analyze',
    method: 'POST',
    body: {
      text: 'string (obligatoire)',
      channel: 'email | sms | messaging | unknown',
      rawHeaders: 'string (optionnel, en-tetes bruts de l e-mail)',
      subject: 'string (optionnel)',
      sender: 'string (optionnel)',
    },
    auth: {
      header: 'x-qs-license',
      alternative: 'Authorization: Bearer QS-...',
    },
    rateLimit: {
      scope: 'par adresse IP condensee et par licence',
      headers: ['RateLimit-Limit', 'RateLimit-Remaining', 'Retry-After'],
    },
    storage: {
      driver: storage.driver,
      durable: !storage.degraded,
    },
    note: 'Le contenu soumis n est ni stocke ni journalise. Les adresses IP sont condensees avec un sel renouvele chaque jour.',
  });
}
