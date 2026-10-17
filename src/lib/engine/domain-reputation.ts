/**
 * Reputation structurelle des domaines.
 *
 * Ce module repond a une classe de phishing que les listes de marques ne
 * couvrent pas : les domaines generes automatiquement et l'usurpation
 * d'institutions qui ne sont pas des marques deposees (gouvernements,
 * administrations, services fiscaux).
 *
 * Deux mesures sont combinees, jamais utilisees seules :
 *
 *  - l'entropie de Shannon, qui mesure l'imprevisibilite d'une chaine. Un
 *    domaine tire au hasard a une entropie nettement plus elevee qu'un mot ;
 *  - des indices structurels (suite de consonnes, absence de voyelle, chiffres
 *    intercales), car l'entropie seule produit des faux positifs sur les
 *    domaines longs mais prononcables.
 *
 * Le seuil de decision exige un cumul de plusieurs indices. La suite de tests
 * verifie explicitement qu'aucun des domaines officiels du referentiel n'est
 * signale : c'est la garde contre le faux positif.
 */

import { MULTI_PART_SUFFIXES } from './brands';
import { KNOWN_TLDS } from './extract';
import { levenshtein } from './text';

/** Entropie de Shannon, en bits par caractere. */
export function shannonEntropy(value: string): number {
  if (value.length === 0) return 0;

  const counts = new Map<string, number>();
  for (const char of value) counts.set(char, (counts.get(char) ?? 0) + 1);

  let entropy = 0;
  for (const count of counts.values()) {
    const probability = count / value.length;
    entropy -= probability * Math.log2(probability);
  }
  return entropy;
}

const VOWELS = new Set(['a', 'e', 'i', 'o', 'u', 'y', 'à', 'â', 'ä', 'é', 'è', 'ê', 'ë', 'î', 'ï', 'ô', 'ö', 'ù', 'û', 'ü', 'œ']);

export function vowelRatio(value: string): number {
  const letters = value.match(/\p{L}/gu) ?? [];
  if (letters.length === 0) return 0;
  const vowels = letters.filter((char) => VOWELS.has(char.toLowerCase())).length;
  return vowels / letters.length;
}

/** Plus longue suite de consonnes consecutives. */
export function longestConsonantRun(value: string): number {
  let longest = 0;
  let current = 0;
  for (const char of value.toLowerCase()) {
    if (!/\p{L}/u.test(char)) {
      current = 0;
      continue;
    }
    if (VOWELS.has(char)) {
      current = 0;
    } else {
      current += 1;
      if (current > longest) longest = current;
    }
  }
  return longest;
}

/** Vrai si la chaine alterne chiffres et lettres de facon typique d'un identifiant genere. */
function hasInterleavedDigits(value: string): boolean {
  return /\d[a-z]\d/i.test(value) || /[a-z]\d[a-z]\d/i.test(value);
}

/**
 * Indices de generation automatique, sous forme de codes traduisibles.
 *
 * Le moteur produit toujours le libelle francais (`signals`) : c'est le repli
 * quand aucune traduction n'est disponible. Les codes ci-dessous permettent a
 * la couche de presentation (voir `src/lib/i18n`) de reconstruire le meme
 * message dans une autre langue.
 */
export type RandomSignalCode =
  | 'entropy-very-high'
  | 'entropy-high'
  | 'consonant-run'
  | 'no-vowel'
  | 'few-vowels'
  | 'interleaved-digits'
  | 'very-long';

export interface RandomSignal {
  code: RandomSignalCode;
  /** Valeur numerique associee (entropie, nombre, pourcentage, longueur). */
  value?: string;
}

export interface RandomnessAssessment {
  /** Cumul des indices. En dessous de 2, aucune conclusion. */
  score: number;
  entropy: number;
  consonantRun: number;
  vowelRatio: number;
  /** Libelles francais, dans l'ordre de detection. */
  signals: string[];
  /** Memes indices, sous forme de codes traduisibles. */
  signalCodes: RandomSignal[];
}

/**
 * Evalue le caractere « genere automatiquement » d'une etiquette de domaine.
 * N'est applique qu'aux etiquettes d'au moins 10 caracteres : en dessous, les
 * mesures ne sont pas fiables.
 */
export function assessDomainRandomness(label: string): RandomnessAssessment {
  const value = label.toLowerCase();
  const entropy = shannonEntropy(value);
  const consonantRun = longestConsonantRun(value);
  const vowels = vowelRatio(value);
  const signals: string[] = [];
  const signalCodes: RandomSignal[] = [];
  let score = 0;

  if (entropy >= 3.7) {
    score += 2;
    signals.push(`entropie tres elevee (${entropy.toFixed(2)} bits/caractere)`);
    signalCodes.push({ code: 'entropy-very-high', value: entropy.toFixed(2) });
  } else if (entropy >= 3.4) {
    score += 1;
    signals.push(`entropie elevee (${entropy.toFixed(2)} bits/caractere)`);
    signalCodes.push({ code: 'entropy-high', value: entropy.toFixed(2) });
  }

  if (consonantRun >= 7) {
    score += 2;
    signals.push(`${consonantRun} consonnes consecutives`);
    signalCodes.push({ code: 'consonant-run', value: String(consonantRun) });
  } else if (consonantRun >= 6) {
    score += 1;
    signals.push(`${consonantRun} consonnes consecutives`);
    signalCodes.push({ code: 'consonant-run', value: String(consonantRun) });
  }

  const letters = (value.match(/\p{L}/gu) ?? []).length;
  if (letters >= 8 && vowels === 0) {
    score += 2;
    signals.push('aucune voyelle');
    signalCodes.push({ code: 'no-vowel' });
  } else if (letters >= 10 && vowels < 0.18) {
    score += 1;
    signals.push(`quasi aucune voyelle (${Math.round(vowels * 100)} %)`);
    signalCodes.push({ code: 'few-vowels', value: String(Math.round(vowels * 100)) });
  }

  if (hasInterleavedDigits(value)) {
    score += 2;
    signals.push('chiffres intercalés dans le nom');
    signalCodes.push({ code: 'interleaved-digits' });
  }

  if (value.length >= 20) {
    score += 1;
    signals.push(`nom tres long (${value.length} caracteres)`);
    signalCodes.push({ code: 'very-long', value: String(value.length) });
  }

  return { score, entropy, consonantRun, vowelRatio: vowels, signals, signalCodes };
}

/** Seuils de decision, volontairement prudents. */
export const RANDOMNESS_HIGH = 4;
export const RANDOMNESS_MEDIUM = 2;
export const RANDOMNESS_MIN_LENGTH = 10;

// ---------------------------------------------------------------------------
// Usurpation institutionnelle
// ---------------------------------------------------------------------------

/**
 * Institutions et fonctions publiques qui ne sont pas des marques deposees mais
 * sont massivement usurpees : un faux « remboursement d'impots » ou une fausse
 * « amende » ne cite aucune marque, donc le referentiel de marques ne voit rien.
 */
export const INSTITUTIONAL_WORDS: string[] = [
  'government',
  'governement',
  'gouvernement',
  'ministere',
  'ministry',
  'treasury',
  'customs',
  'douane',
  'impots',
  'fisc',
  'taxrefund',
  'taxrebate',
  'revenue',
  'socialsecurity',
  'securitesociale',
  'administration',
  'prefecture',
  'ambassade',
  'embassy',
  'citizen',
  'citoyen',
  'official',
  'officiel',
  'authority',
  'autorite',
  'justice',
  'tribunal',
  'police',
  'gendarme',
  'notary',
  'notaire',
  'bank',
  'banque',
  'insurance',
  'assurance',
  'pension',
  'retraite',
  'subsidy',
  'subvention',
  'allowance',
  'allocation',
  'benefits',
  'refund',
  'remboursement',
];

/** Jetons courts, compares par inclusion exacte uniquement. */
const INSTITUTIONAL_SHORT = new Set(['gov', 'gouv', 'irs', 'hmrc', 'ato', 'dgfi', 'dgfip']);

const INSTITUTIONAL_MIN_MATCH = 6;

/**
 * Cherche dans une etiquette un mot institutionnel, y compris legerement
 * deforme. La tolerance d'un caractere couvre les variantes fautives
 * volontaires (« overnmentarious » pour « government ») qui servent a passer
 * sous les filtres tout en restant lisibles pour une victime.
 */
export function findInstitutionalMimicry(label: string): string | null {
  const value = label.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (value.length < 5) return null;

  if (INSTITUTIONAL_SHORT.has(value)) return value;

  // Passe 1 : correspondances exactes ou par inclusion, en privilegiant le mot
  // le plus long. Cette passe est traitee en premier pour que l'ordre de la
  // liste n'ait aucune influence : une orthographe correcte doit toujours
  // l'emporter sur une variante fautive (« gouvernement » avant
  // « governement »), sinon le resultat dependrait d'un detail de tri.
  let exact: string | null = null;
  for (const word of INSTITUTIONAL_WORDS) {
    if (value === word || value.includes(word)) {
      if (!exact || word.length > exact.length) exact = word;
    }
  }
  if (exact) return exact;

  // Passe 2 : correspondance approchee. La tolerance d'un caractere couvre les
  // deformations volontaires (« overnmentarious » pour « government ») qui
  // servent a passer sous les filtres tout en restant lisibles.
  if (value.length < INSTITUTIONAL_MIN_MATCH) return null;

  for (const word of INSTITUTIONAL_WORDS) {
    for (const width of [word.length - 1, word.length, word.length + 1]) {
      if (width < INSTITUTIONAL_MIN_MATCH || width > value.length) continue;
      for (let start = 0; start + width <= value.length; start += 1) {
        const window = value.slice(start, start + width);
        if (levenshtein(window, word) <= 1) return word;
      }
    }
  }

  return null;
}

/** Renvoie l'etiquette qui imite une institution, ou null. */
export function detectInstitutionalMimicry(host: string): { label: string; word: string } | null {
  for (const label of host.toLowerCase().split('.')) {
    const word = findInstitutionalMimicry(label);
    if (word) return { label, word };
  }
  return null;
}

/**
 * Detecte une extension connue utilisee comme sous-domaine plutot que comme
 * extension finale : `paypal.com.secure-login.xyz`. Le domaine reel est
 * `secure-login.xyz`, mais l'oeil s'arrete sur « paypal.com ».
 *
 * Les suffixes composes (« gouv.fr », « co.uk ») sont testes avant les
 * extensions simples : c'est ce qui permet de reconnaitre le montage classique
 * `impots.gouv.fr.secure-login.xyz`, ou le leurre est justement la paire
 * « gouv.fr » et non le seul « fr ».
 */
export function detectTldAsLabel(host: string): string | null {
  const labels = host.toLowerCase().split('.').filter(Boolean);
  if (labels.length < 3) return null;

  // La derniere etiquette est l'extension reelle : on ne l'examine pas.
  for (let index = 0; index < labels.length - 1; index += 1) {
    if (index + 1 < labels.length - 1) {
      const pair = `${labels[index]}.${labels[index + 1]}`;
      if (MULTI_PART_SUFFIXES.has(pair)) return pair;
    }
    if (KNOWN_TLDS.has(labels[index])) return labels[index];
  }
  return null;
}

// ---------------------------------------------------------------------------
// Termes d'appat dans le domaine lui-meme
// ---------------------------------------------------------------------------

/**
 * Un domaine qui contient « bonus », « casino » ou « jackpot » annonce son
 * intention avant meme l'ouverture du message.
 */
export const LURE_DOMAIN_TOKENS: string[] = [
  'casino', 'bonus', 'jackpot', 'freespin', 'spin', 'slot', 'poker', 'roulette',
  'betting', 'betwin', 'bet365', 'lucky', 'prize', 'winner', 'winning', 'lottery',
  'loto', 'gamble', 'gaming', 'wager', 'promo', 'offer', 'voucher', 'coupon',
  'cashback', 'jackpotwin', 'megawin', 'bigwin', 'sweepstake', 'giveaway',
  'gain', 'gagnant', 'cagnotte', 'parions', 'parisportif', 'machinesasous',
];

export function lureTokensInHost(host: string): string[] {
  const haystack = host.toLowerCase().replace(/[^a-z0-9]/g, '');
  return LURE_DOMAIN_TOKENS.filter((token) => haystack.includes(token));
}
