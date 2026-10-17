/**
 * Limitation de debit.
 *
 * Trois politiques sont evaluees a chaque requete :
 *
 *  1. rafale (60 s)      — empeche le martelage automatise ;
 *  2. soutenue (15 min)  — empeche la consommation lente et continue ;
 *  3. globale (60 s)     — filet de securite si les identites sont falsifiees
 *                          ou si l'attaque est distribuee.
 *
 * Les seuils dependent de l'offre : un porteur de licence dispose de marges
 * plus larges qu'un appelant anonyme.
 *
 * IMPORTANT — ce que cette protection n'est PAS. Elle s'appuie sur l'adresse IP,
 * donc sur des en-tetes HTTP. Si l'application est exposee directement sans
 * proxy correctement configure, un attaquant peut falsifier X-Forwarded-For et
 * contourner la limitation par identite ; seul le filet global reste efficace.
 * La protection de reference doit etre posee au niveau du reverse proxy
 * (directive `limit_req` de nginx). Voir la section deploiement du README.
 */

import { getRepositories } from '../db';
import type { ClientIdentity } from './client-ip';

export type RateLimitScope = 'identity' | 'global';

export interface RateLimitPolicy {
  id: string;
  scope: RateLimitScope;
  windowMs: number;
  max: number;
}

export interface RateLimitDecision {
  allowed: boolean;
  /** Politique ayant bloque la requete, ou null si elle est autorisee. */
  blockedBy: string | null;
  scope: RateLimitScope | null;
  limit: number;
  remaining: number;
  retryAfterSeconds: number;
  /** Vrai si la limitation repose sur une identite fiable. */
  identityTrusted: boolean;
}

const MINUTE = 60_000;
const QUARTER = 15 * MINUTE;

function numberFromEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw.trim() === '') return fallback;
  const value = Number(raw);
  return Number.isFinite(value) && value >= 0 ? Math.floor(value) : fallback;
}

export function rateLimitDisabled(): boolean {
  return (process.env.QUERYSHIELD_RATELIMIT_DISABLED ?? '').toLowerCase() === 'true';
}

/** Construit les politiques applicables pour une offre donnee. */
export function buildPolicies(paid: boolean): RateLimitPolicy[] {
  return [
    {
      id: paid ? 'burst-paid' : 'burst-free',
      scope: 'identity',
      windowMs: MINUTE,
      max: paid
        ? numberFromEnv('QUERYSHIELD_RATELIMIT_BURST_PAID', 60)
        : numberFromEnv('QUERYSHIELD_RATELIMIT_BURST_FREE', 15),
    },
    {
      id: paid ? 'sustained-paid' : 'sustained-free',
      scope: 'identity',
      windowMs: QUARTER,
      max: paid
        ? numberFromEnv('QUERYSHIELD_RATELIMIT_SUSTAINED_PAID', 800)
        : numberFromEnv('QUERYSHIELD_RATELIMIT_SUSTAINED_FREE', 100),
    },
    {
      id: 'global',
      scope: 'global',
      windowMs: MINUTE,
      max: numberFromEnv('QUERYSHIELD_RATELIMIT_GLOBAL', 900),
    },
  ];
}

function bucketKey(policy: RateLimitPolicy, identity: ClientIdentity): string {
  return policy.scope === 'global' ? 'global' : `${policy.id}:${identity.bucket}`;
}

export interface EvaluateOptions {
  identity: ClientIdentity;
  /** Vrai si l'appelant presente une licence valide. */
  paid: boolean;
  now?: number;
}

export function evaluateRateLimit(options: EvaluateOptions): RateLimitDecision {
  const now = options.now ?? Date.now();

  if (rateLimitDisabled()) {
    return {
      allowed: true,
      blockedBy: null,
      scope: null,
      limit: 0,
      remaining: Number.MAX_SAFE_INTEGER,
      retryAfterSeconds: 0,
      identityTrusted: options.identity.trusted,
    };
  }

  const { rateLimit } = getRepositories();
  const policies = buildPolicies(options.paid);

  let blocked: { policy: RateLimitPolicy; oldest: number | null } | null = null;
  let tightestRemaining = Number.MAX_SAFE_INTEGER;
  let tightestLimit = 0;

  for (const policy of policies) {
    const key = bucketKey(policy, options.identity);

    // Toute requete est enregistree, y compris celles qui seront refusees :
    // sans cela, un attaquant pourrait marteler sans jamais faire monter le
    // compteur.
    const count = rateLimit.hit(key, now, policy.windowMs);
    const remaining = Math.max(0, policy.max - count);

    if (remaining < tightestRemaining) {
      tightestRemaining = remaining;
      tightestLimit = policy.max;
    }

    if (count > policy.max && !blocked) {
      blocked = { policy, oldest: rateLimit.oldest(key, now, policy.windowMs) };
    }
  }

  if (!blocked) {
    return {
      allowed: true,
      blockedBy: null,
      scope: null,
      limit: tightestLimit,
      remaining: tightestRemaining,
      retryAfterSeconds: 0,
      identityTrusted: options.identity.trusted,
    };
  }

  // Un emplacement se libere quand la plus ancienne requete de la fenetre en
  // sort. C'est exact, contrairement a un `Retry-After` egal a la fenetre.
  const oldest = blocked.oldest ?? now;
  const retryAfterSeconds = Math.max(1, Math.ceil((oldest + blocked.policy.windowMs - now) / 1000));

  return {
    allowed: false,
    blockedBy: blocked.policy.id,
    scope: blocked.policy.scope,
    limit: blocked.policy.max,
    remaining: 0,
    retryAfterSeconds,
    identityTrusted: options.identity.trusted,
  };
}

/** En-tetes normalises a poser sur la reponse. */
export function rateLimitHeaders(decision: RateLimitDecision): Record<string, string> {
  if (rateLimitDisabled() || decision.limit === 0) return {};

  const headers: Record<string, string> = {
    'RateLimit-Limit': String(decision.limit),
    'RateLimit-Remaining': String(decision.remaining),
  };

  if (!decision.allowed) {
    headers['Retry-After'] = String(decision.retryAfterSeconds);
  }

  return headers;
}
