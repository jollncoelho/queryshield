/**
 * Traduction des constats produits par le moteur.
 *
 * Le moteur renvoie un identifiant de regle stable (`url-risky-tld`,
 * `site-newly-registered`...) et, pour les constats dont le texte est
 * dynamique, les valeurs a inserer dans `finding.params`. La mise en forme
 * traduite est choisie ici.
 *
 * Repli volontaire : si une regle n'a pas encore de traduction, on affiche le
 * texte francais du moteur plutot que rien. Une regle non traduite reste donc
 * lisible, elle n'est simplement pas localisee.
 */

import type { Finding } from '../engine/types';
import { interpolate, type MessageParams } from './interpolate';
import type { Dictionary } from './locales/fr';

export interface LocalizedFinding {
  title: string;
  detail: string;
}

/**
 * Rend les indices de generation automatique dans la langue courante.
 *
 * Le moteur les transporte sous forme compacte
 * (`entropy-high=3.51|consonant-run=7`) parce qu'un tableau d'objets ne
 * traverse pas proprement une frontiere JSON. Un code inconnu est laisse tel
 * quel : mieux vaut un code brut visible qu'un texte vide.
 */
function localizeRandomSignals(encoded: string, dictionary: Dictionary): string {
  const catalogue = dictionary.randomSignals as Record<string, string | undefined>;
  return encoded
    .split('|')
    .filter((entry) => entry.length > 0)
    .map((entry) => {
      const separator = entry.indexOf('=');
      const code = separator === -1 ? entry : entry.slice(0, separator);
      const value = separator === -1 ? '' : entry.slice(separator + 1);
      const template = catalogue[code];
      if (!template) return entry;
      return interpolate(template, { value });
    })
    .join(', ');
}

export function localizeFinding(finding: Finding, dictionary: Dictionary): LocalizedFinding {
  const catalogue = dictionary.findings as Record<string, LocalizedFinding | undefined>;
  const entry = catalogue[finding.id];

  if (!entry) {
    return { title: finding.title, detail: finding.detail };
  }

  const params: MessageParams = { ...finding.params };
  const encoded = params.signalCodes;

  if (typeof encoded === 'string' && encoded.length > 0) {
    params.signals = localizeRandomSignals(encoded, dictionary);
  }
  delete params.signalCodes;

  return {
    title: entry.title,
    detail: interpolate(entry.detail, params),
  };
}

/** Vrai si la regle dispose d'une traduction dans ce dictionnaire. */
export function hasTranslation(findingId: string, dictionary: Dictionary): boolean {
  const catalogue = dictionary.findings as Record<string, LocalizedFinding | undefined>;
  return catalogue[findingId] !== undefined;
}
