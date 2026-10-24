/**
 * Licences, offres et quotas.
 *
 * Tout est desormais persiste : les licences vivent dans la table `licenses` et
 * les compteurs de quota dans `quota_usage`. Un redemarrage du service ne perd
 * plus rien.
 *
 * Deux notions distinctes, a ne pas confondre :
 *  - le PLAN decoule de la licence presentee (ou de l'absence de licence) ;
 *  - le SUJET de quota est ce sur quoi le compteur journalier est tenu. Sans
 *    licence, c'est l'identifiant anonyme du navigateur ; avec une licence,
 *    c'est la licence elle-meme, ce qui mutualise le quota entre tous les
 *    appareils du compte.
 */

import { randomBytes, randomUUID } from 'node:crypto';
import { getRepositories } from './db';
import type { LicenseRecord, Plan } from './db/types';

export const PLAN_QUOTA: Record<Plan, number> = {
  free: Number(process.env.QUERYSHIELD_FREE_DAILY_QUOTA ?? 10),
  pro: 1000,
  business: 10000,
};

export const CLIENT_COOKIE = 'qs_client';
export const LICENSE_HEADER = 'x-qs-license';

/**
 * Alphabet sans caracteres ambigus (pas de O/0, I/1/L) : une cle de licence est
 * souvent recopiee a la main depuis un e-mail.
 */
const KEY_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

function randomGroup(length = 4): string {
  const bytes = randomBytes(length);
  let out = '';
  for (let index = 0; index < length; index += 1) {
    out += KEY_ALPHABET[bytes[index] % KEY_ALPHABET.length];
  }
  return out;
}

/** Cle de licence lisible : QS-PRO-4F2A-9C1B-7E3D. */
export function generateLicenseKey(plan: Plan): string {
  const tag = plan === 'business' ? 'BIZ' : plan === 'pro' ? 'PRO' : 'FREE';
  return `QS-${tag}-${randomGroup()}-${randomGroup()}-${randomGroup()}`;
}

// --- Etat d'une licence ----------------------------------------------------

/**
 * Etat d'une licence presentee.
 *
 * `unknown` est distinct de l'absence de cle : il signifie qu'une cle a bien
 * ete transmise mais qu'elle n'existe pas dans notre base. Sans cette
 * distinction, un acheteur qui se trompe d'un caractere — ou a qui l'on a
 * donne une cle emise depuis une autre base — voyait simplement « offre
 * gratuite », sans aucun moyen de comprendre que sa cle etait refusee.
 */
export type LicenseUsability = 'usable' | 'expired' | 'revoked' | 'unknown';

/**
 * Une licence est utilisable si elle n'a pas ete revoquee et si sa periode
 * n'est pas terminee.
 *
 * Les statuts `past_due` et `canceled` conservent l'acces jusqu'a la fin de la
 * periode deja payee : c'est le comportement de Stripe, et c'est equitable pour
 * l'utilisateur. `revoked` coupe immediatement (fraude, chargeback).
 *
 * Une licence sans date de fin (emise manuellement) n'expire jamais.
 */
export function licenseUsability(license: LicenseRecord, now = Date.now()): LicenseUsability {
  if (license.status === 'revoked') return 'revoked';
  if (license.currentPeriodEnd !== null && license.currentPeriodEnd <= now) return 'expired';
  return 'usable';
}

// --- Cycle de vie ----------------------------------------------------------

export interface IssueLicenseInput {
  plan: Exclude<Plan, 'free'>;
  clientId?: string | null;
  email?: string | null;
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
  currentPeriodEnd?: number | null;
  note?: string | null;
}

export function issueLicense(input: IssueLicenseInput): LicenseRecord {
  const { licenses } = getRepositories();
  const now = Date.now();

  const record: LicenseRecord = {
    key: generateLicenseKey(input.plan),
    plan: input.plan,
    status: 'active',
    clientId: input.clientId ?? null,
    email: input.email ?? null,
    stripeCustomerId: input.stripeCustomerId ?? null,
    stripeSubscriptionId: input.stripeSubscriptionId ?? null,
    currentPeriodEnd: input.currentPeriodEnd ?? null,
    createdAt: now,
    updatedAt: now,
    note: input.note ?? null,
  };

  licenses.create(record);
  return record;
}

export function revokeLicense(key: string, note?: string): boolean {
  const { licenses } = getRepositories();
  return licenses.update(key, {
    status: 'revoked',
    ...(note === undefined ? {} : { note }),
  });
}

/**
 * Applique un evenement d'abonnement Stripe.
 *
 * Si aucun enregistrement ne correspond a l'abonnement, une licence est creee :
 * c'est le chemin normal apres un paiement reussi. Sinon l'enregistrement est
 * mis a jour, ce qui couvre les changements de plan, les renouvellements et les
 * resiliations.
 */
export interface SubscriptionUpdate {
  stripeSubscriptionId: string;
  status: LicenseRecord['status'];
  plan?: Exclude<Plan, 'free'>;
  clientId?: string | null;
  email?: string | null;
  stripeCustomerId?: string | null;
  currentPeriodEnd?: number | null;
  note?: string | null;
}

export function applySubscriptionUpdate(update: SubscriptionUpdate): LicenseRecord {
  const { licenses } = getRepositories();
  const existing = licenses.findBySubscriptionId(update.stripeSubscriptionId);

  if (!existing) {
    return issueLicense({
      plan: update.plan ?? 'pro',
      clientId: update.clientId ?? null,
      email: update.email ?? null,
      stripeCustomerId: update.stripeCustomerId ?? null,
      stripeSubscriptionId: update.stripeSubscriptionId,
      currentPeriodEnd: update.currentPeriodEnd ?? null,
      note: update.note ?? null,
    });
  }

  const patch: Partial<Omit<LicenseRecord, 'key'>> = { status: update.status };
  if (update.plan !== undefined) patch.plan = update.plan;
  if (update.clientId !== undefined) patch.clientId = update.clientId;
  if (update.email !== undefined) patch.email = update.email;
  if (update.stripeCustomerId !== undefined) patch.stripeCustomerId = update.stripeCustomerId;
  if (update.currentPeriodEnd !== undefined) patch.currentPeriodEnd = update.currentPeriodEnd;
  if (update.note !== undefined) patch.note = update.note;

  licenses.update(existing.key, patch);
  return licenses.findByKey(existing.key) ?? existing;
}

// --- Entitlement -----------------------------------------------------------

export interface Entitlement {
  plan: Plan;
  dailyQuota: number;
  clientId: string;
  /** Cle de licence presentee, si elle est exploitable. */
  licenseKey?: string;
  licenseStatus?: LicenseUsability;
  /** Identifiant sur lequel le compteur journalier est tenu. */
  quotaSubject: string;
  paid: boolean;
}

export function readClientId(request: Request): { clientId: string; isNew: boolean } {
  const cookieHeader = request.headers.get('cookie') ?? '';
  const match = cookieHeader
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${CLIENT_COOKIE}=`));

  if (match) {
    const value = match.slice(CLIENT_COOKIE.length + 1);
    if (/^[0-9a-f-]{36}$/i.test(value)) return { clientId: value, isNew: false };
  }
  return { clientId: randomUUID(), isNew: true };
}

/** Lit la cle presentee : en-tete dedie, ou jeton porteur en repli. */
export function readLicenseKey(request: Request): string | null {
  const direct = request.headers.get(LICENSE_HEADER)?.trim();
  if (direct) return direct;

  const authorization = request.headers.get('authorization');
  if (authorization && authorization.toLowerCase().startsWith('bearer ')) {
    const token = authorization.slice(7).trim();
    if (token.toUpperCase().startsWith('QS-')) return token;
  }
  return null;
}

export function resolveEntitlement(
  request: Request,
  now = Date.now(),
): { entitlement: Entitlement; isNew: boolean } {
  const { clientId, isNew } = readClientId(request);
  const presentedKey = readLicenseKey(request);

  if (presentedKey) {
    const license = getRepositories().licenses.findByKey(presentedKey);
    if (license) {
      const usability = licenseUsability(license, now);
      if (usability === 'usable') {
        return {
          entitlement: {
            plan: license.plan,
            dailyQuota: PLAN_QUOTA[license.plan],
            clientId,
            licenseKey: license.key,
            licenseStatus: usability,
            quotaSubject: `lic:${license.key}`,
            paid: license.plan !== 'free',
          },
          isNew,
        };
      }
      // Licence presentee mais inexploitable : on retombe sur l'offre gratuite
      // en conservant le statut, pour que l'appelant puisse expliquer pourquoi.
      return {
        entitlement: {
          plan: 'free',
          dailyQuota: PLAN_QUOTA.free,
          clientId,
          licenseKey: license.key,
          licenseStatus: usability,
          quotaSubject: `anon:${clientId}`,
          paid: false,
        },
        isNew,
      };
    }

    // Une cle a ete transmise mais elle n'existe pas : on le signale
    // explicitement (`unknown`) au lieu de laisser croire a une absence de cle.
    return {
      entitlement: {
        plan: 'free',
        dailyQuota: PLAN_QUOTA.free,
        clientId,
        licenseKey: presentedKey,
        licenseStatus: 'unknown',
        quotaSubject: `anon:${clientId}`,
        paid: false,
      },
      isNew,
    };
  }

  return {
    entitlement: {
      plan: 'free',
      dailyQuota: PLAN_QUOTA.free,
      clientId,
      quotaSubject: `anon:${clientId}`,
      paid: false,
    },
    isNew,
  };
}

// --- Quota -----------------------------------------------------------------

export interface QuotaState {
  used: number;
  limit: number;
  remaining: number;
  exceeded: boolean;
}

export function today(now = Date.now()): string {
  return new Date(now).toISOString().slice(0, 10);
}

/** Incremente le compteur du jour. Atomique : aucune course possible. */
export function consumeQuota(entitlement: Entitlement, now = Date.now()): QuotaState {
  const result = getRepositories().quota.consume(
    entitlement.quotaSubject,
    today(now),
    entitlement.dailyQuota,
  );
  return {
    used: result.used,
    limit: result.limit,
    remaining: Math.max(0, result.limit - result.used),
    exceeded: !result.allowed,
  };
}

export function peekQuota(entitlement: Entitlement, now = Date.now()): QuotaState {
  const used = getRepositories().quota.peek(entitlement.quotaSubject, today(now));
  return {
    used,
    limit: entitlement.dailyQuota,
    remaining: Math.max(0, entitlement.dailyQuota - used),
    exceeded: used >= entitlement.dailyQuota,
  };
}

export type { LicenseRecord, Plan };
