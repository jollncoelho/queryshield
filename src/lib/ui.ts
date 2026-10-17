import clsx, { type ClassValue } from 'clsx';
import type { Severity, Verdict } from './engine/types';
import type { SiteVerdict } from './engine/site';

export function cn(...values: ClassValue[]): string {
  return clsx(values);
}

/**
 * Habillage visuel d'un verdict.
 *
 * Seule la mise en forme vit ici : le libelle affiche vient du dictionnaire de
 * la langue active (voir `src/lib/i18n`). Cela evite qu'un verdict reste en
 * francais dans une interface traduite.
 */
export interface VerdictStyle {
  text: string;
  bg: string;
  border: string;
  hex: string;
  icon: string;
}

export const VERDICT_STYLE: Record<Verdict, VerdictStyle> = {
  safe: {
    text: 'text-emerald-300',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/35',
    hex: '#22C55E',
    icon: 'shield-check',
  },
  suspicious: {
    text: 'text-amber-300',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/35',
    hex: '#F59E0B',
    icon: 'shield-alert',
  },
  dangerous: {
    text: 'text-red-300',
    bg: 'bg-red-500/10',
    border: 'border-red-500/35',
    hex: '#EF4444',
    icon: 'shield-x',
  },
};

/**
 * Verdicts de la verification de site. La question posee n'est pas la meme que
 * pour un message : « ce site est-il authentique ? ». Le cas « non
 * verifiable » est volontairement distinct de « risque faible » : ne pas
 * trouver de probleme n'est pas une validation.
 */
export const SITE_VERDICT_STYLE: Record<SiteVerdict, VerdictStyle> = {
  official: {
    text: 'text-emerald-300',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/35',
    hex: '#22C55E',
    icon: 'shield-check',
  },
  unknown: {
    text: 'text-slate-300',
    bg: 'bg-slate-500/10',
    border: 'border-slate-500/35',
    hex: '#94A3B8',
    icon: 'shield-question',
  },
  suspicious: {
    text: 'text-amber-300',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/35',
    hex: '#F59E0B',
    icon: 'shield-alert',
  },
  phishing: {
    text: 'text-red-300',
    bg: 'bg-red-500/10',
    border: 'border-red-500/35',
    hex: '#EF4444',
    icon: 'shield-x',
  },
};

export const SEVERITY_STYLE: Record<Severity, { text: string; bg: string; border: string; hex: string }> = {
  critical: { text: 'text-red-300', bg: 'bg-red-500/10', border: 'border-red-500/40', hex: '#EF4444' },
  high: { text: 'text-orange-300', bg: 'bg-orange-500/10', border: 'border-orange-500/40', hex: '#F97316' },
  medium: { text: 'text-amber-300', bg: 'bg-amber-500/10', border: 'border-amber-500/40', hex: '#F59E0B' },
  low: { text: 'text-slate-300', bg: 'bg-slate-500/10', border: 'border-slate-500/40', hex: '#94A3B8' },
  info: { text: 'text-brand-300', bg: 'bg-brand-500/10', border: 'border-brand-500/40', hex: '#00F2FE' },
};

/** Niveau de fiabilite, a traduire par l'appelant (`common.confidence*`). */
export type ConfidenceLevel = 'high' | 'medium' | 'low';

export function confidenceKey(confidence: number): ConfidenceLevel {
  if (confidence >= 0.8) return 'high';
  if (confidence >= 0.6) return 'medium';
  return 'low';
}

/**
 * Neutralise une URL pour l'affichage : impossible de cliquer dessus par
 * accident depuis le rapport.
 */
export function defang(value: string): string {
  return value
    .replace(/^https?:\/\//i, (match) => match.replace(':', '[:]'))
    .replace(/\./g, '[.]');
}
