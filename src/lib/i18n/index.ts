/**
 * Point d'entree des traductions.
 *
 * `getDictionary()` est utilisable cote serveur comme cote client. Les quatre
 * dictionnaires sont importes statiquement : leur taille reste modeste et cela
 * evite toute lecture de fichier a l'execution.
 */

import { DEFAULT_LOCALE, type Locale } from './config';
import { en } from './locales/en';
import { es } from './locales/es';
import { fr, type Dictionary } from './locales/fr';
import { pt } from './locales/pt';

const DICTIONARIES: Record<Locale, Dictionary> = { fr, en, pt, es };

export function getDictionary(locale: Locale): Dictionary {
  return DICTIONARIES[locale] ?? DICTIONARIES[DEFAULT_LOCALE];
}

export { DEFAULT_LOCALE, LOCALES, LOCALE_COOKIE, LOCALE_COOKIE_MAX_AGE, LOCALE_DESCRIPTORS } from './config';
export { isLocale, negotiateLocale, resolveLocale } from './config';
export type { Locale } from './config';
export type { Dictionary } from './locales/fr';
export { interpolate } from './interpolate';
export type { MessageParams } from './interpolate';
export { localizeFinding } from './finding';
