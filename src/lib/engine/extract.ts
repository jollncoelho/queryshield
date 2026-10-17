/**
 * Extraction des indicateurs de compromission (IOC) presents dans un message.
 * Aucune requete reseau n'est effectuee : tout est statique et deterministe.
 */

import { DANGEROUS_EXTENSIONS } from './brands';
import { hostFromUrl, unique } from './text';
import { emptyIocs, type Iocs } from './types';

/** TLD acceptes pour la detection de domaines ecrits en clair. */
export const KNOWN_TLDS = new Set([
  'com', 'org', 'net', 'int', 'edu', 'gov', 'mil', 'info', 'biz', 'name', 'pro', 'aero',
  'museum', 'coop', 'jobs', 'mobi', 'travel', 'tel', 'asia', 'cat', 'post', 'xxx',
  'fr', 'be', 'ch', 'lu', 'mc', 'ca', 'us', 'uk', 'de', 'es', 'it', 'nl', 'pt', 'ie',
  'at', 'se', 'no', 'dk', 'fi', 'is', 'pl', 'cz', 'sk', 'hu', 'ro', 'bg', 'gr', 'hr',
  'si', 'ee', 'lv', 'lt', 'ru', 'ua', 'by', 'md', 'rs', 'ba', 'mk', 'al', 'tr', 'cy',
  'mt', 'li', 'ad', 'sm', 'va', 'gi', 'im', 'je', 'gg', 'fo', 'gl', 'ax',
  'br', 'ar', 'mx', 'cl', 'co', 'pe', 've', 'ec', 'uy', 'py', 'bo', 'cr', 'pa', 'do',
  'gt', 'sv', 'hn', 'ni', 'cu', 'jm', 'tt', 'bb', 'bs', 'ht',
  'za', 'ng', 'ke', 'gh', 'ma', 'dz', 'tn', 'eg', 'ly', 'sn', 'ci', 'cm', 'bf', 'ml',
  'ne', 'tg', 'bj', 'ga', 'cd', 'cg', 'mg', 'mu', 're', 'gp', 'mq', 'gf', 'yt', 'pm',
  'wf', 'nc', 'pf', 'vu', 'ao', 'mz', 'zm', 'zw', 'bw', 'na', 'tz', 'ug', 'rw', 'et',
  'cn', 'jp', 'kr', 'tw', 'hk', 'mo', 'sg', 'my', 'th', 'vn', 'id', 'ph', 'in', 'pk',
  'bd', 'lk', 'np', 'mm', 'kh', 'la', 'mn', 'kz', 'uz', 'kg', 'tj', 'tm', 'az', 'am',
  'ge', 'il', 'sa', 'ae', 'qa', 'kw', 'bh', 'om', 'jo', 'lb', 'sy', 'iq', 'ir', 'af',
  'au', 'nz', 'fj', 'pg', 'ws', 'to', 'sb', 'tv', 'ki', 'nr', 'pw', 'fm', 'mh', 'gu',
  'mp', 'as', 'pr', 'vi', 'aw', 'cw', 'sx', 'bq', 'sr', 'gy', 'bz', 'ag', 'dm', 'gd',
  'kn', 'lc', 'vc', 'ms', 'ai', 'vg', 'ky', 'tc', 'bm', 'fk', 'sh', 'io', 'ac', 'su',
  'eu', 'рф', 'app', 'dev', 'blog', 'shop', 'store', 'site', 'online', 'space', 'website',
  'cloud', 'tech', 'digital', 'agency', 'studio', 'design', 'media', 'news', 'live',
  'life', 'world', 'today', 'email', 'group', 'team', 'work', 'works', 'zone', 'city',
  'click', 'link', 'top', 'xyz', 'club', 'vip', 'win', 'bid', 'download', 'stream',
  'racing', 'date', 'party', 'review', 'science', 'gdn', 'ooo', 'rest', 'icu', 'buzz',
  'zip', 'mov', 'tk', 'ml', 'ga', 'cf', 'gq', 'men', 'quest', 'cyou', 'sbs', 'cfd',
  'monster', 'bar', 'beauty', 'casa', 'surf', 'fit', 'loan', 'kim', 'country', 'lol',
  'pw', 'cc', 'me', 'tv', 'fm', 'gg', 'sh', 'st', 'nu', 'ws', 'to', 'gd', 'vc', 'vg',
  'am', 'la', 'ly', 'gl', 'so', 'sc', 'sl', 'td', 'gn', 'gm', 'gw', 'lr', 'ss', 'sd',
  'er', 'dj', 'so', 'km', 'st', 'sz', 'ls', 'bi', 'mw', 'cv', 'mr', 'eh', 'tn',
]);

const CANDIDATE_HOST_RE =
  /(?:[\p{L}0-9](?:[\p{L}0-9-]{0,61}[\p{L}0-9])?\.)+[\p{L}]{2,24}/giu;

const EXPLICIT_URL_RE =
  /(?:https?:\/\/|hxxps?:\/\/|ftp:\/\/|www\.)[^\s<>"'`()[\]{}|\\^]+/gi;

const EMAIL_RE = /[\p{L}0-9._%+-]+@[\p{L}0-9.-]+\.[\p{L}]{2,24}/giu;

const FR_PHONE_RE = /(?:\+33|0033|0)[\s.-]?[1-9](?:[\s.-]?\d{2}){4}\b/g;
const INTL_PHONE_RE = /\+\d{1,3}(?:[\s.-]?\d{2,4}){2,5}\b/g;

const IBAN_RE = /\b[A-Z]{2}\d{2}(?:[ ]?[A-Z0-9]{4}){2,7}(?:[ ]?[A-Z0-9]{1,3})?\b/g;
const BTC_RE = /\b(?:bc1[\p{L}0-9]{25,62}|[13][a-km-zA-HJ-NP-Z1-9]{25,34})\b/gu;
const ETH_RE = /\b0x[a-fA-F0-9]{40}\b/g;

const FILE_RE = new RegExp(
  `\\b[\\p{L}0-9_\\-. ]{1,60}\\.(${Array.from(DANGEROUS_EXTENSIONS).join('|')})\\b`,
  'giu',
);

export interface HtmlAnchor {
  text: string;
  href: string;
}

export interface ExtractResult {
  iocs: Iocs;
  /** URLs completes trouvees (dedupliquees, ordre d'apparition). */
  urls: string[];
  /** Domaines cites sans schema http (dedupliques). */
  bareDomains: string[];
  anchors: HtmlAnchor[];
}

function normaliseUrl(raw: string): string {
  const trimmed = raw.replace(/[.,;:!?)"'>\]}]+$/, '');
  if (/^hxxps?:\/\//i.test(trimmed)) return trimmed.replace(/^hxxp/i, 'http');
  if (/^www\./i.test(trimmed)) return `http://${trimmed}`;
  if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed)) return `http://${trimmed}`;
  return trimmed;
}

function isKnownHost(host: string): boolean {
  const labels = host.split('.');
  const tld = labels[labels.length - 1].toLowerCase();
  if (tld.startsWith('xn--')) return true;
  return KNOWN_TLDS.has(tld);
}

/** Extrait les balises <a href> si l'utilisateur a colle du HTML source. */
export function extractAnchors(text: string): HtmlAnchor[] {
  const anchors: HtmlAnchor[] = [];
  const re = /<a\b[^>]*href\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(text)) !== null) {
    anchors.push({
      href: match[1].trim(),
      text: match[2].replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim(),
    });
    if (anchors.length >= 50) break;
  }
  return anchors;
}

export function extract(text: string): ExtractResult {
  const iocs = emptyIocs();
  const urls: string[] = [];
  const bareDomains: string[] = [];
  const consumed = new Set<string>();

  // 1. URLs explicites
  const explicitMatches = text.match(EXPLICIT_URL_RE) ?? [];
  for (const raw of explicitMatches) {
    const normalised = normaliseUrl(raw);
    const host = hostFromUrl(normalised);
    if (!host || !isKnownHost(host)) continue;
    consumed.add(host);
    urls.push(normalised);
  }

  // 2. Domaines ecrits en clair (sans schema)
  const candidateMatches = text.match(CANDIDATE_HOST_RE) ?? [];
  for (const raw of candidateMatches) {
    const host = raw.toLowerCase().replace(/\.$/, '');
    if (consumed.has(host)) continue;
    if (!isKnownHost(host)) continue;
    if (host.split('.').length < 2) continue;
    consumed.add(host);
    bareDomains.push(host);
    urls.push(`http://${host}`);
  }

  iocs.urls = unique(urls);
  iocs.domains = unique(
    iocs.urls.map((url) => hostFromUrl(url)).filter((host): host is string => Boolean(host)),
  );

  iocs.emails = unique((text.match(EMAIL_RE) ?? []).map((value) => value.toLowerCase()));
  iocs.phones = unique([
    ...(text.match(FR_PHONE_RE) ?? []),
    ...(text.match(INTL_PHONE_RE) ?? []),
  ]).map((value) => value.trim());

  iocs.ibans = unique(
    (text.match(IBAN_RE) ?? [])
      .map((value) => value.replace(/\s+/g, ''))
      .filter((value) => value.length >= 15 && value.length <= 34),
  );

  iocs.crypto = unique([...(text.match(BTC_RE) ?? []), ...(text.match(ETH_RE) ?? [])]);

  iocs.files = unique(
    (text.match(FILE_RE) ?? []).map((value) => value.trim()).filter((value) => value.length <= 64),
  );

  return {
    iocs,
    urls: iocs.urls,
    bareDomains: unique(bareDomains),
    anchors: extractAnchors(text),
  };
}
