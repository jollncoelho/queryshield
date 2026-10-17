/**
 * Petites correspondances entre une valeur technique et sa traduction.
 *
 * Ces fonctions existent pour eviter que chaque composant reimplemente la meme
 * table de correspondance — et surtout pour qu'une valeur ajoutee cote moteur
 * provoque une erreur de compilation plutot qu'un libelle manquant a l'ecran.
 */

import type { ConfidenceLevel } from '../ui';
import type { Dictionary } from './locales/fr';

const CONFIDENCE_KEYS: Record<ConfidenceLevel, keyof Dictionary['common']> = {
  high: 'confidenceHigh',
  medium: 'confidenceMedium',
  low: 'confidenceLow',
};

export function confidenceLabel(level: ConfidenceLevel, t: Dictionary): string {
  return String(t.common[CONFIDENCE_KEYS[level]]);
}

/**
 * Choisit le message d'erreur a afficher.
 *
 * L'API renvoie a la fois un code stable (`error`) et un message francais. Le
 * code est traduit ici ; le message du serveur ne sert que de repli, pour
 * qu'une erreur non prevue reste lisible plutot que remplacee par un texte
 * generique.
 */
export function apiErrorMessage(
  payload: { error?: string; message?: string },
  t: Dictionary,
  fallback: string,
): string {
  const catalogue = t.common.errors as Record<string, string | undefined>;
  const code = payload.error;
  if (code && catalogue[code]) return catalogue[code];
  return payload.message ?? fallback;
}
