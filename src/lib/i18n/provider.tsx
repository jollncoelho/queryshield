'use client';

/**
 * Contexte de traduction pour les composants client.
 *
 * Le dictionnaire resolu est fourni par le layout serveur : une seule langue
 * traverse la frontiere serveur/client, au lieu des quatre. Les composants
 * client appellent `useI18n()` et n'ont jamais a savoir quelle langue est
 * active.
 */

import { createContext, useContext, useMemo, type ReactNode } from 'react';

import type { Finding } from '../engine/types';
import { DEFAULT_LOCALE, type Locale } from './config';
import { localizeFinding, type LocalizedFinding } from './finding';
import { interpolate, type MessageParams } from './interpolate';
import { fr, type Dictionary } from './locales/fr';

export interface I18nValue {
  locale: Locale;
  /** Dictionnaire de la langue active. */
  t: Dictionary;
  /** Remplit un gabarit traduit (`{count}`...) avec ses parametres. */
  format: (template: string, params?: MessageParams) => string;
  /** Traduit un constat du moteur, avec repli sur le texte francais. */
  finding: (finding: Finding) => LocalizedFinding;
}

function createValue(locale: Locale, dictionary: Dictionary): I18nValue {
  return {
    locale,
    t: dictionary,
    format: interpolate,
    finding: (item) => localizeFinding(item, dictionary),
  };
}

/**
 * Valeur par defaut en francais. Elle evite un plantage si un composant est
 * rendu hors du fournisseur : on degrade vers la langue de reference au lieu
 * d'afficher une page blanche.
 */
const I18nContext = createContext<I18nValue>(createValue(DEFAULT_LOCALE, fr));

interface I18nProviderProps {
  locale: Locale;
  dictionary: Dictionary;
  children: ReactNode;
}

export function I18nProvider({ locale, dictionary, children }: I18nProviderProps) {
  const value = useMemo(() => createValue(locale, dictionary), [locale, dictionary]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  return useContext(I18nContext);
}
