/**
 * Configuration des langues.
 *
 * Quatre langues sont prises en charge. Le francais est la langue de reference :
 * c'est lui qui definit la forme du dictionnaire (voir `locales/fr.ts`), et
 * toute cle manquante dans une autre langue provoque une erreur de compilation
 * plutot qu'un texte vide a l'ecran.
 */

export const LOCALES = ['fr', 'en', 'pt', 'es'] as const;

export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = 'fr';

/** Cookie qui memorise le choix explicite de l'utilisateur. */
export const LOCALE_COOKIE = 'qs_locale';

/** Duree de memorisation du choix : un an. */
export const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export interface LocaleDescriptor {
  /** Nom de la langue, ecrit dans la langue elle-meme. */
  label: string;
  /** Code a deux lettres, affiche dans le selecteur. */
  short: string;
  /** Valeur de l'attribut `lang` du document. */
  htmlLang: string;
  /** Balise Open Graph. */
  ogLocale: string;
}

export const LOCALE_DESCRIPTORS: Record<Locale, LocaleDescriptor> = {
  fr: { label: 'Français', short: 'FR', htmlLang: 'fr', ogLocale: 'fr_FR' },
  en: { label: 'English', short: 'EN', htmlLang: 'en', ogLocale: 'en_GB' },
  pt: { label: 'Português', short: 'PT', htmlLang: 'pt', ogLocale: 'pt_PT' },
  es: { label: 'Español', short: 'ES', htmlLang: 'es', ogLocale: 'es_ES' },
};

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (LOCALES as readonly string[]).includes(value);
}

/**
 * Choisit la meilleure langue parmi celles annoncees par le navigateur.
 *
 * `Accept-Language: pt-BR,pt;q=0.9,en;q=0.8` doit donner `pt` : on ne compare
 * donc pas la chaine entiere, seulement la partie avant le tiret.
 */
export function negotiateLocale(acceptLanguage: string | null | undefined): Locale | null {
  if (!acceptLanguage) return null;

  const entries = acceptLanguage
    .split(',')
    .map((part) => {
      const [tag, ...params] = part.trim().split(';');
      const quality = params
        .map((param) => param.trim())
        .find((param) => param.startsWith('q='));
      const score = quality ? Number.parseFloat(quality.slice(2)) : 1;
      return { tag: tag.trim().toLowerCase(), score: Number.isFinite(score) ? score : 0 };
    })
    .filter((entry) => entry.tag.length > 0)
    .sort((a, b) => b.score - a.score);

  for (const entry of entries) {
    const base = entry.tag.split('-')[0];
    if (isLocale(base)) return base;
  }
  return null;
}

/**
 * Choisit la langue a utiliser : le choix explicite d'abord, puis la langue du
 * navigateur, puis le francais.
 */
export function resolveLocale(
  cookieValue: string | undefined | null,
  acceptLanguage: string | null | undefined,
): Locale {
  if (isLocale(cookieValue)) return cookieValue;
  return negotiateLocale(acceptLanguage) ?? DEFAULT_LOCALE;
}
