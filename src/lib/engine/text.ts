/**
 * Utilitaires bas niveau : manipulation de domaines, distance d'edition,
 * detection d'obfuscation Unicode.
 */

import { MULTI_PART_SUFFIXES } from './brands';

/** Distance de Levenshtein, avec coupure anticipee pour rester bon marche. */
export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (Math.abs(a.length - b.length) > 3) return 4;

  const previous = new Array<number>(b.length + 1);
  const current = new Array<number>(b.length + 1);

  for (let j = 0; j <= b.length; j += 1) previous[j] = j;

  for (let i = 1; i <= a.length; i += 1) {
    current[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a.charCodeAt(i - 1) === b.charCodeAt(j - 1) ? 0 : 1;
      current[j] = Math.min(previous[j] + 1, current[j - 1] + 1, previous[j - 1] + cost);
    }
    for (let j = 0; j <= b.length; j += 1) previous[j] = current[j];
  }

  return previous[b.length];
}

/** Extrait l'hote d'une URL, sans dependre d'un parseur tolerant aux entrees cassees. */
export function hostFromUrl(rawUrl: string): string | null {
  const candidate = rawUrl.trim().replace(/^hxxps?:\/\//i, 'http://');
  try {
    const parsed = new URL(candidate.includes('://') ? candidate : `http://${candidate}`);
    return parsed.hostname.toLowerCase() || null;
  } catch {
    return null;
  }
}

/** Extrait le chemin + la query d'une URL (pour l'analyse des mots-cles). */
export function pathFromUrl(rawUrl: string): string {
  const candidate = rawUrl.trim().replace(/^hxxps?:\/\//i, 'http://');
  try {
    const parsed = new URL(candidate.includes('://') ? candidate : `http://${candidate}`);
    return `${parsed.pathname}${parsed.search}`;
  } catch {
    return '';
  }
}

/** Vrai si l'URL est en clair (http) — donc non chiffree. */
export function isPlainHttp(rawUrl: string): boolean {
  return /^http:\/\//i.test(rawUrl.trim()) && !/^http:\/\/localhost/i.test(rawUrl.trim());
}

/**
 * Domaine enregistrable approche (sans liste de suffixes publics complete).
 * `secure.login.paypal.com.evil.xyz` -> `evil.xyz`
 */
export function registrableDomain(host: string): string {
  const labels = host.toLowerCase().replace(/\.$/, '').split('.').filter(Boolean);
  if (labels.length <= 2) return labels.join('.');

  const lastTwo = labels.slice(-2).join('.');
  if (MULTI_PART_SUFFIXES.has(lastTwo) && labels.length >= 3) {
    return labels.slice(-3).join('.');
  }
  return lastTwo;
}

/** Etiquette de second niveau : `evil.xyz` -> `evil`. */
export function secondLevelLabel(host: string): string {
  const registrable = registrableDomain(host);
  const labels = registrable.split('.');
  return labels.length > 1 ? labels[0] : registrable;
}

/** TLD effectif, en tenant compte des suffixes a deux parties. */
export function effectiveTld(host: string): string {
  const registrable = registrableDomain(host);
  return registrable.slice(registrable.indexOf('.') + 1);
}

const ZERO_WIDTH = /[\u200B-\u200F\u202A-\u202E\u2060-\u2064\uFEFF\u00AD]/;

export function hasZeroWidthChars(value: string): boolean {
  return ZERO_WIDTH.test(value);
}

export function countZeroWidthChars(value: string): number {
  const matches = value.match(/[\u200B-\u200F\u202A-\u202E\u2060-\u2064\uFEFF\u00AD]/g);
  return matches ? matches.length : 0;
}

/** Ratio de caracteres non latins (cyrillique, grec, arabe, etc.). */
export function nonLatinRatio(value: string): number {
  const letters = value.match(/\p{L}/gu);
  if (!letters || letters.length === 0) return 0;
  let nonLatin = 0;
  for (const char of letters) {
    if (!/[\p{Script=Latin}]/u.test(char)) nonLatin += 1;
  }
  return nonLatin / letters.length;
}

/** Vrai si le texte melange alphabet latin et alphabet non latin. */
export function hasMixedScripts(value: string): boolean {
  const ratio = nonLatinRatio(value);
  return ratio > 0.05 && ratio < 0.95;
}

/** Caracteres homoglyphes cyrilliques/grecs souvent utilises pour deguiser un domaine. */
const HOMOGLYPHS = new Set([
  'а', 'е', 'о', 'р', 'с', 'х', 'у', 'і', 'ј', 'ѕ', 'ԁ', 'ɡ', 'ν', 'ο', 'ρ', 'τ',
  'α', 'β', 'ε', 'ι', 'κ', 'μ', 'η', 'ӏ', 'ь', 'ъ', 'ѡ', 'ѵ',
]);

export function homoglyphCount(value: string): number {
  let count = 0;
  for (const char of value.toLowerCase()) {
    if (HOMOGLYPHS.has(char)) count += 1;
  }
  return count;
}

export function truncate(value: string, max = 120): string {
  const flat = value.replace(/\s+/g, ' ').trim();
  return flat.length > max ? `${flat.slice(0, max - 1)}…` : flat;
}

/** Extrait un extrait de texte centre sur une correspondance. */
export function snippetAround(text: string, index: number, radius = 48): string {
  const start = Math.max(0, index - radius);
  const end = Math.min(text.length, index + radius);
  const prefix = start > 0 ? '…' : '';
  const suffix = end < text.length ? '…' : '';
  return `${prefix}${text.slice(start, end).replace(/\s+/g, ' ').trim()}${suffix}`;
}

/** Neutralise une URL pour l'afficher sans risque de clic accidentel. */
export function defang(value: string): string {
  return value
    .replace(/^https?:\/\//i, (match) => match.replace(':', '[:]'))
    .replace(/\./g, '[.]');
}

export function unique<T>(values: T[]): T[] {
  return Array.from(new Set(values));
}

/** Vrai si le message est essentiellement en majuscules (>= 60 % de lettres). */
export function isMostlyUppercase(value: string): boolean {
  const letters = value.match(/\p{L}/gu);
  if (!letters || letters.length < 12) return false;
  const upper = letters.filter((char) => char === char.toUpperCase() && char !== char.toLowerCase());
  return upper.length / letters.length >= 0.6;
}
