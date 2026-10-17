/**
 * Identification de l'appelant pour la limitation de debit.
 *
 * DEUX PROBLEMES DIFFICILES, TRAITES ICI.
 *
 * 1. X-Forwarded-For est falsifiable. Un client peut envoyer l'en-tete qu'il
 *    veut. La seule facon d'en extraire une IP fiable est de savoir COMBIEN de
 *    proxys de confiance se trouvent devant l'application : la bonne entree est
 *    alors celle situee `hops` positions depuis la droite, car c'est le dernier
 *    proxy de confiance qui a ecrit la valeur. Si l'application est exposee
 *    directement, aucun en-tete n'est fiable et l'appelant est place dans un
 *    seau commun.
 *
 * 2. Une adresse IP est une donnee personnelle. La conserver en clair dans une
 *    table de limitation de debit serait contradictoire avec la promesse de
 *    confidentialite du produit. On ne stocke donc qu'un condensat HMAC-SHA256,
 *    avec un sel renouvele chaque jour : impossible de relier les requetes d'un
 *    meme utilisateur d'un jour sur l'autre, et impossible de remonter a l'IP.
 */

import { createHmac } from 'node:crypto';

export type IpSource = 'x-real-ip' | 'x-forwarded-for' | 'untrusted';

export interface ClientIdentity {
  /** Condensat sale de l'IP. Jamais l'IP elle-meme. */
  bucket: string;
  source: IpSource;
  /** Vrai si l'IP provient d'une source consideree comme fiable. */
  trusted: boolean;
}

const IPV4_RE = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
const IPV6_RE = /^[0-9a-f:]+$/i;

/** Normalise une IP, ou renvoie null si la valeur n'en est pas une. */
export function normaliseIp(raw: string | null | undefined): string | null {
  if (!raw) return null;

  let value = raw.trim().toLowerCase();
  if (value.length === 0 || value.length > 45) return null;

  // Retire les crochets et un eventuel port : « [::1]:4321 » -> « ::1 »
  if (value.startsWith('[')) {
    const closing = value.indexOf(']');
    if (closing === -1) return null;
    value = value.slice(1, closing);
  } else if (value.includes(':')) {
    const parts = value.split(':');
    if (parts.length === 2 && /^\d+$/.test(parts[1])) value = parts[0];
  }

  // IPv4 mappee en IPv6 : « ::ffff:203.0.113.5 » -> « 203.0.113.5 »
  const mapped = /^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/.exec(value);
  if (mapped) value = mapped[1];

  const ipv4 = IPV4_RE.exec(value);
  if (ipv4) {
    const octets = ipv4.slice(1).map(Number);
    if (octets.some((octet) => octet > 255)) return null;
    return value;
  }

  if (IPV6_RE.test(value) && value.includes(':')) return value;

  return null;
}

/** Nombre de proxys de confiance devant l'application. */
export function trustedProxyHops(): number {
  const raw = process.env.QUERYSHIELD_TRUSTED_PROXY_HOPS;
  if (raw === undefined) return 1;
  const value = Number(raw);
  if (!Number.isFinite(value) || value < 0) return 1;
  return Math.min(5, Math.floor(value));
}

function firstValid(candidates: string[]): string | null {
  for (const candidate of candidates) {
    const normalised = normaliseIp(candidate);
    if (normalised) return normalised;
  }
  return null;
}

/**
 * Determine l'IP de l'appelant.
 *
 * `x-real-ip` est privilegie quand il est present : nginx l'ecrase avec
 * `$remote_addr`, ce qui en fait une valeur plus difficile a falsifier que la
 * liste X-Forwarded-For, ou il faut compter les sauts.
 */
export function resolveClientIp(headers: Headers): { ip: string | null; source: IpSource } {
  const hops = trustedProxyHops();

  if (hops === 0) {
    return { ip: null, source: 'untrusted' };
  }

  const realIp = firstValid([headers.get('x-real-ip') ?? '']);
  if (realIp) return { ip: realIp, source: 'x-real-ip' };

  const forwarded = headers.get('x-forwarded-for');
  if (forwarded) {
    const entries = forwarded
      .split(',')
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0);

    // L'entree fiable est celle ecrite par le dernier proxy de confiance.
    const index = entries.length - hops;
    if (index >= 0) {
      const candidate = firstValid([entries[index]]);
      if (candidate) return { ip: candidate, source: 'x-forwarded-for' };
    }
  }

  return { ip: null, source: 'untrusted' };
}

/** Sel de condensation. Renouvele chaque jour pour empecher tout suivi. */
export function dailySalt(now = Date.now()): string {
  const base = process.env.QUERYSHIELD_IP_SALT?.trim() || 'queryshield-sel-non-configure';
  const day = new Date(now).toISOString().slice(0, 10);
  return `${base}:${day}`;
}

/**
 * Condense une IP en identifiant de seau stable sur la journee, non reversible.
 * Le prefixe conserve la version du protocole, utile au diagnostic sans
 * reveler l'adresse.
 */
export function hashIp(ip: string, now = Date.now()): string {
  const family = ip.includes(':') ? 'v6' : 'v4';
  const digest = createHmac('sha256', dailySalt(now)).update(ip).digest('hex').slice(0, 24);
  return `${family}:${digest}`;
}

/**
 * Identite complete de l'appelant. En l'absence de source fiable, tous les
 * appelants partagent le seau « untrusted » : la limitation reste active, mais
 * elle ne peut plus distinguer les clients entre eux. C'est le comportement
 * correct : mieux vaut un seau commun qu'une protection illusoire.
 */
export function resolveClientIdentity(headers: Headers, now = Date.now()): ClientIdentity {
  const { ip, source } = resolveClientIp(headers);
  if (!ip) {
    return { bucket: 'untrusted', source: 'untrusted', trusted: false };
  }
  return { bucket: hashIp(ip, now), source, trusted: true };
}

/** Indique si la configuration permet une limitation par IP reellement fiable. */
export function isRateLimitIdentityReliable(): boolean {
  return trustedProxyHops() > 0;
}
