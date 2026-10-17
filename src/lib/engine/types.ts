/**
 * QueryShield - contrats de donnees du moteur d'analyse.
 *
 * Toutes les interfaces de ce fichier sont partagees entre :
 *  - le moteur heuristique embarque (src/lib/engine)
 *  - le microservice Python de phase 2 (engine-py), qui doit renvoyer
 *    des `Finding[]` au meme format pour pouvoir etre fusionnes.
 */

export type Channel = 'email' | 'sms' | 'messaging' | 'unknown';

export type Severity = 'critical' | 'high' | 'medium' | 'low' | 'info';

export type Verdict = 'safe' | 'suspicious' | 'dangerous';

export type FindingCategory =
  | 'lien'
  | 'identite'
  | 'ingenierie-sociale'
  | 'donnees-sensibles'
  | 'entetes-email'
  | 'contenu'
  | 'metadata';

export type EngineSource = 'heuristique' | 'llm';

export interface Finding {
  /** Identifiant stable de la regle (sert de cle de deduplication). */
  id: string;
  category: FindingCategory;
  severity: Severity;
  /** Titre court affiche a l'utilisateur. */
  title: string;
  /** Explication en langage naturel : pourquoi c'est un signal. */
  detail: string;
  /** Extrait du message ou de l'en-tete qui a declenche la regle. */
  evidence?: string;
  /**
   * Valeurs dynamiques a inserer dans le texte traduit du constat.
   *
   * Le texte de `title`/`detail` ci-dessus est toujours produit en francais par
   * le moteur : c'est le repli quand aucune traduction n'est disponible. Quand
   * une traduction existe (voir `src/lib/i18n/finding.ts`), les fragments
   * variables — noms de marques, signaux, mots-cles — sont reprises ici sous
   * forme de parametres, puis substitues dans le gabarit traduit.
   */
  params?: Record<string, string | number>;
  /** Contribution de la regle au score brut. */
  weight: number;
  /** Moteur ayant produit le constat. */
  sources: EngineSource[];
}

export interface Iocs {
  urls: string[];
  domains: string[];
  emails: string[];
  phones: string[];
  ibans: string[];
  crypto: string[];
  files: string[];
}

export interface AnalyzeInput {
  text: string;
  channel?: Channel;
  /** En-tetes bruts d'un e-mail (From, Received, Authentication-Results...). */
  rawHeaders?: string;
  subject?: string;
  sender?: string;
}

export interface SignalBreakdown {
  critical: number;
  high: number;
  medium: number;
  low: number;
  info: number;
}

export interface CategoryScore {
  category: FindingCategory;
  score: number;
  findings: number;
}

export interface AnalyzeResult {
  /** Score de risque 0-100. */
  score: number;
  verdict: Verdict;
  /** Confiance dans l'evaluation, 0-1 (qualite du signal disponible). */
  confidence: number;
  /** Phrase de synthese pour l'aide a la decision. */
  summary: string;
  findings: Finding[];
  iocs: Iocs;
  signals: SignalBreakdown;
  categories: CategoryScore[];
  /** Recommandations d'action concretes. */
  recommendations: string[];
  meta: {
    engine: string;
    version: string;
    durationMs: number;
    analyzedAt: string;
    textLength: number;
    channel: Channel;
    headersProvided: boolean;
    llmUsed: boolean;
  };
}

export const SEVERITY_WEIGHT: Record<Severity, number> = {
  critical: 35,
  high: 20,
  medium: 9,
  low: 3,
  info: 0,
};

export const SEVERITY_LABEL: Record<Severity, string> = {
  critical: 'Critique',
  high: 'Eleve',
  medium: 'Modere',
  low: 'Faible',
  info: 'Information',
};

export const VERDICT_LABEL: Record<Verdict, string> = {
  safe: 'Aucun signal preoccupant',
  suspicious: 'Suspect - verifier avant d agir',
  dangerous: 'Tres probablement frauduleux',
};

export const CATEGORY_LABEL: Record<FindingCategory, string> = {
  lien: 'Liens et domaines',
  identite: 'Usurpation d identite',
  'ingenierie-sociale': 'Ingenierie sociale',
  'donnees-sensibles': 'Demande de donnees sensibles',
  'entetes-email': 'Authentification de l e-mail',
  contenu: 'Contenu et mise en forme',
  metadata: 'Contexte du message',
};

export function emptyIocs(): Iocs {
  return { urls: [], domains: [], emails: [], phones: [], ibans: [], crypto: [], files: [] };
}

export function emptySignals(): SignalBreakdown {
  return { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
}
