/**
 * Verifications reseau d'un site — sans jamais ouvrir le site.
 *
 * LA REGLE ABSOLUE DE CE MODULE : aucun paquet HTTP n'est envoye a l'hote
 * analyse. Ouvrir la page suspecte revelerait a l'attaquant qu'il a ete
 * detecte, et lui livrerait l'adresse IP de la victime. Trois sources
 * externes sont interrogees a la place :
 *
 *  1. la resolution DNS — le nom existe-t-il seulement ?
 *  2. l'annuaire des domaines (RDAP) — quand le domaine a-t-il ete enregistre,
 *     et chez quel registrar ? Un domaine de trois jours qui se presente comme
 *     une banque est presque toujours frauduleux ;
 *  3. la reputation (Google Safe Browsing), si une cle API est configuree.
 *
 * Ce qu'un appelant doit savoir avant d'activer cette option : l'adresse
 * analysee est transmise au resolveur DNS, au registre du domaine et,
 * le cas echeant, a Google. C'est la contrepartie d'un verdict beaucoup plus
 * solide. Le site lui-meme n'est jamais contacte, ni maintenant ni plus tard.
 */

import { promises as dns } from 'node:dns';

import { isPrivateHost, type NetworkReport, type SiteIdentity } from './site';

const DEFAULT_TIMEOUT_MS = 6000;
const IPV4_RE = /^\d{1,3}(?:\.\d{1,3}){3}$/;

/**
 * Identification envoyee aux services interroges.
 *
 * Ce n'est pas cosmetique : `rdap.org` repond 403 aux requetes depourvues de
 * User-Agent explicite (le client par defaut de Node en est victime). S'annoncer
 * clairement est de toute facon la regle quand on interroge un annuaire public.
 */
const USER_AGENT = 'QueryShield/0.1 (+https://query-intel.com; verification de domaine)';

function isIpLiteral(host: string): boolean {
  return IPV4_RE.test(host) || host.includes(':');
}

/**
 * Vrai si l'adresse appartient au reseau interne, a la boucle locale ou a une
 * plage reservee.
 *
 * C'est le garde-fou central de la resolution DNS : meme si un nom d'hote se
 * resout vers une adresse interne (annuaire d'entreprise, DNS rebinding),
 * l'adresse n'est jamais remontee dans le rapport. L'API ne peut donc pas
 * servir de sonde du reseau interne.
 */
export function isPrivateAddress(address: string): boolean {
  const value = address.trim().toLowerCase();

  if (value.includes(':')) {
    if (value === '::1' || value === '::') return true;
    if (/^f[cd][0-9a-f]{2}:/.test(value)) return true; // fc00::/7 unique local
    if (/^fe[89ab][0-9a-f]:/.test(value)) return true; // fe80::/10 lien local
    const mapped = value.match(/::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/);
    if (mapped) return isPrivateAddress(mapped[1]);
    return false;
  }

  const parts = value.split('.').map(Number);
  if (parts.length !== 4 || parts.some((part) => Number.isNaN(part) || part < 0 || part > 255)) {
    return true;
  }

  const [a, b] = parts;
  if (a === 0 || a === 10 || a === 127) return true;
  if (a === 169 && b === 254) return true; // lien local
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
  if (a >= 224) return true; // multicast et reserve
  return false;
}

/** Neutralise une promesse qui depasse le delai imparti. */
function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${label}: delai depasse`)), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

// ---------------------------------------------------------------------------
// 1. Resolution DNS
// ---------------------------------------------------------------------------

export interface ResolutionResult {
  /** null lorsque la verification n'a pas ete tentee (adresse IP, hote interne). */
  resolves: boolean | null;
  addresses: string[];
  error: string | null;
}

export async function resolveHost(host: string, timeoutMs = DEFAULT_TIMEOUT_MS): Promise<ResolutionResult> {
  if (isPrivateHost(host) || isIpLiteral(host)) {
    return { resolves: null, addresses: [], error: null };
  }

  try {
    const records = await withTimeout(
      dns.lookup(host, { all: true, verbatim: true }),
      timeoutMs,
      'dns',
    );

    const all = records.map((record) => record.address);
    const publicAddresses = all.filter((address) => !isPrivateAddress(address));

    // Un nom public qui ne resout que vers des adresses internes est un signal
    // en soi (DNS rebinding, ou tentative de sonder le reseau) : on ne remonte
    // aucune adresse.
    if (publicAddresses.length === 0 && all.length > 0) {
      return { resolves: true, addresses: [], error: 'dns: seules des adresses privees ont ete renvoyees' };
    }

    return { resolves: true, addresses: publicAddresses.slice(0, 8), error: null };
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    // ENOTFOUND = le nom n'existe pas. Les autres codes traduisent une panne
    // temporaire du resolveur : on ne conclut rien.
    if (code === 'ENOTFOUND') return { resolves: false, addresses: [], error: null };
    return { resolves: true, addresses: [], error: code ?? (error as Error).message };
  }
}

// ---------------------------------------------------------------------------
// 2. Annuaire des domaines (RDAP)
// ---------------------------------------------------------------------------

export interface RegistrationResult {
  registeredAt: string | null;
  ageDays: number | null;
  registrar: string | null;
  error: string | null;
}

interface RdapEntity {
  roles?: string[];
  vcardArray?: unknown;
}

function readRegistrarName(entities: unknown): string | null {
  if (!Array.isArray(entities)) return null;
  for (const raw of entities as RdapEntity[]) {
    if (!raw || !Array.isArray(raw.roles) || !raw.roles.includes('registrar')) continue;
    const vcard = raw.vcardArray;
    if (!Array.isArray(vcard) || !Array.isArray(vcard[1])) continue;
    for (const field of vcard[1] as unknown[]) {
      if (!Array.isArray(field)) continue;
      // Format jCard : ["fn", {}, "text", "Nom du registrar"]
      if (field[0] === 'fn' && typeof field[3] === 'string' && field[3].trim().length > 0) {
        return field[3].trim();
      }
    }
  }
  return null;
}

export function domainAgeInDays(registeredAt: string | null, now = Date.now()): number | null {
  if (!registeredAt) return null;
  const timestamp = Date.parse(registeredAt);
  if (Number.isNaN(timestamp)) return null;
  const days = Math.floor((now - timestamp) / 86_400_000);
  return days < 0 ? 0 : days;
}

/**
 * Interroge RDAP (successeur de WHOIS, format JSON, sans cle API).
 * `rdap.org` redirige vers le registre competent selon l'extension.
 */
export async function lookupRegistration(
  registrable: string,
  timeoutMs = DEFAULT_TIMEOUT_MS,
): Promise<RegistrationResult> {
  const endpoint = `https://rdap.org/domain/${encodeURIComponent(registrable)}`;

  try {
    const response = await fetch(endpoint, {
      headers: {
        accept: 'application/rdap+json, application/json',
        'user-agent': USER_AGENT,
      },
      signal: AbortSignal.timeout(timeoutMs),
      redirect: 'follow',
    });

    if (!response.ok) {
      return { registeredAt: null, ageDays: null, registrar: null, error: `rdap: HTTP ${response.status}` };
    }

    const data: unknown = await response.json();
    if (typeof data !== 'object' || data === null) {
      return { registeredAt: null, ageDays: null, registrar: null, error: 'rdap: reponse illisible' };
    }

    const events = Array.isArray((data as { events?: unknown }).events)
      ? ((data as { events: { eventAction?: string; eventDate?: string }[] }).events)
      : [];
    const registration = events.find((event) => event.eventAction === 'registration');
    const registeredAt = typeof registration?.eventDate === 'string' ? registration.eventDate : null;

    return {
      registeredAt,
      ageDays: domainAgeInDays(registeredAt),
      registrar: readRegistrarName((data as { entities?: unknown }).entities),
      error: null,
    };
  } catch (error) {
    return {
      registeredAt: null,
      ageDays: null,
      registrar: null,
      error: `rdap: ${(error as Error).message}`,
    };
  }
}

// ---------------------------------------------------------------------------
// 3. Reputation (Google Safe Browsing)
// ---------------------------------------------------------------------------

export interface ReputationResult {
  flagged: boolean;
  threats: string[];
  error: string | null;
}

/**
 * Google Safe Browsing v4 — « threatMatches:find ».
 * Sans cle API configuree, la verification est simplement ignoree : le rapport
 * indique alors que la reputation n'a pas pu etre consultee, il ne pretend pas
 * que le site est propre.
 */
export async function lookupReputation(
  url: string,
  apiKey: string | undefined,
  timeoutMs = DEFAULT_TIMEOUT_MS,
): Promise<ReputationResult | null> {
  if (!apiKey) return null;

  const endpoint = `https://safebrowsing.googleapis.com/v4/threatMatches:find?key=${encodeURIComponent(apiKey)}`;

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'user-agent': USER_AGENT,
      },
      signal: AbortSignal.timeout(timeoutMs),
      body: JSON.stringify({
        client: { clientId: 'queryshield', clientVersion: '0.1.0' },
        threatInfo: {
          threatTypes: [
            'MALWARE',
            'SOCIAL_ENGINEERING',
            'UNWANTED_SOFTWARE',
            'POTENTIALLY_HARMFUL_APPLICATION',
          ],
          platformTypes: ['ANY_PLATFORM'],
          threatEntryTypes: ['URL'],
          threatEntries: [{ url }],
        },
      }),
    });

    if (!response.ok) {
      return { flagged: false, threats: [], error: `safe-browsing: HTTP ${response.status}` };
    }

    const data: unknown = await response.json();
    const matches = Array.isArray((data as { matches?: unknown }).matches)
      ? ((data as { matches: { threatType?: string }[] }).matches)
      : [];
    const threats = Array.from(
      new Set(matches.map((match) => match.threatType).filter((value): value is string => Boolean(value))),
    );

    return { flagged: matches.length > 0, threats, error: null };
  } catch (error) {
    return { flagged: false, threats: [], error: `safe-browsing: ${(error as Error).message}` };
  }
}

// ---------------------------------------------------------------------------
// Orchestration
// ---------------------------------------------------------------------------

export interface CollectNetworkOptions {
  timeoutMs?: number;
  /** Interrupteur global cote serveur. */
  enabled?: boolean;
  safeBrowsingKey?: string;
}

export function activeChecksEnabled(): boolean {
  const value = (process.env.QUERYSHIELD_SITE_ACTIVE ?? 'true').trim().toLowerCase();
  return value !== 'false' && value !== '0' && value !== 'off';
}

function emptyReport(): NetworkReport {
  return {
    attempted: false,
    resolves: null,
    addresses: [],
    registeredAt: null,
    domainAgeDays: null,
    registrar: null,
    reputation: null,
    reputationSource: null,
    threats: [],
    errors: [],
  };
}

/**
 * Rassemble les trois verifications en parallele. Ne leve jamais : toute panne
 * d'une source se traduit par une information absente, jamais par un echec de
 * l'analyse.
 */
export async function collectNetworkReport(
  identity: SiteIdentity,
  options: CollectNetworkOptions = {},
): Promise<NetworkReport> {
  if (!options.enabled || isPrivateHost(identity.host)) return emptyReport();

  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const safeBrowsingKey = options.safeBrowsingKey ?? process.env.GOOGLE_SAFE_BROWSING_API_KEY?.trim();

  const report = emptyReport();
  report.attempted = true;

  const [resolution, registration, reputation] = await Promise.all([
    isIpLiteral(identity.host)
      ? Promise.resolve<ResolutionResult | null>(null)
      : resolveHost(identity.host, timeoutMs).catch(() => null),
    isIpLiteral(identity.host)
      ? Promise.resolve<RegistrationResult | null>(null)
      : lookupRegistration(identity.registrable, timeoutMs).catch(() => null),
    lookupReputation(identity.url, safeBrowsingKey, timeoutMs).catch(() => null),
  ]);

  if (resolution) {
    report.resolves = resolution.resolves;
    report.addresses = resolution.addresses;
    if (resolution.error) report.errors.push(resolution.error);
  }

  if (registration) {
    report.registeredAt = registration.registeredAt;
    report.domainAgeDays = registration.ageDays;
    report.registrar = registration.registrar;
    if (registration.error) report.errors.push(registration.error);
  }

  if (reputation) {
    report.reputation = reputation.error ? 'unavailable' : reputation.flagged ? 'flagged' : 'clean';
    report.reputationSource = 'Google Safe Browsing';
    report.threats = reputation.threats;
    if (reputation.error) report.errors.push(reputation.error);
  } else {
    // Aucune cle configuree : on le dit explicitement plutot que de laisser
    // croire a une reputation vierge.
    report.reputation = 'unavailable';
    report.reputationSource = null;
  }

  return report;
}
