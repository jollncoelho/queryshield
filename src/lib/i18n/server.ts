/**
 * Resolution de la langue cote serveur.
 *
 * Ordre de priorite : le cookie de choix explicite, puis l'en-tete
 * `Accept-Language` du navigateur, puis le francais. Le cookie est pose par le
 * selecteur de langue (voir `components/LanguageSwitcher.tsx`).
 */

import { cookies, headers } from 'next/headers';

import { LOCALE_COOKIE, resolveLocale, type Locale } from './config';
import { getDictionary } from './index';
import type { Dictionary } from './locales/fr';

export async function resolveServerLocale(): Promise<Locale> {
  const [cookieStore, headerStore] = await Promise.all([cookies(), headers()]);
  return resolveLocale(
    cookieStore.get(LOCALE_COOKIE)?.value,
    headerStore.get('accept-language'),
  );
}

export async function getServerDictionary(): Promise<{ locale: Locale; t: Dictionary }> {
  const locale = await resolveServerLocale();
  return { locale, t: getDictionary(locale) };
}
