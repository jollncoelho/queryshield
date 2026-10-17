/**
 * Analyse semantique et comportementale du message (ingenierie sociale).
 *
 * Le moteur applique le lexique, puis des heuristiques de contenu et de
 * contexte. Les regles sensibles exigent un verbe de sollicitation : un
 * message qui mentionne simplement « mot de passe » ne declenche rien.
 */

import { ACTION_PHRASES, LEXICON, SOLICITATION_RE, type LexRule } from './lexicon';
import { BRAND_KEYS, normalizeForMatch } from './brands';
import {
  countZeroWidthChars,
  hasMixedScripts,
  hasZeroWidthChars,
  isMostlyUppercase,
  nonLatinRatio,
  snippetAround,
  truncate,
} from './text';
import { SEVERITY_WEIGHT, type Channel, type Finding } from './types';

function windowAround(text: string, index: number, length: number, radius: number): string {
  return text.slice(Math.max(0, index - radius), Math.min(text.length, index + length + radius));
}

function applyRule(rule: LexRule, text: string, senderTrusted: boolean): Finding | null {
  for (const pattern of rule.patterns) {
    const match = pattern.exec(text);
    if (!match) continue;

    if (rule.requiresSolicitation) {
      const window = windowAround(text, match.index, match[0].length, rule.window ?? 110);
      if (!SOLICITATION_RE.test(window)) continue;
    }

    // Un expediteur officiel verifie beneficie d'une severite reduite sur les
    // regles de promotion : une marque connue a le droit d'annoncer une offre.
    const severity =
      senderTrusted && rule.severityIfTrustedSender ? rule.severityIfTrustedSender : rule.severity;

    return {
      id: rule.id,
      category: rule.category,
      severity,
      title: rule.title,
      detail: rule.detail,
      evidence: snippetAround(text, match.index, 52),
      weight: SEVERITY_WEIGHT[severity],
      sources: ['heuristique'],
    };
  }
  return null;
}

/** Detecte les noms de marque disloques pour passer sous les filtres. */
function detectObfuscatedBrand(text: string): string | null {
  const normalised = normalizeForMatch(
    text
      .replace(/[0]/g, 'o')
      .replace(/[1!|]/g, 'i')
      .replace(/[3]/g, 'e')
      .replace(/[4@]/g, 'a')
      .replace(/[5$]/g, 's')
      .replace(/[7]/g, 't'),
  );

  const direct = normalizeForMatch(text);

  for (const entry of BRAND_KEYS) {
    if (entry.token.length < 6) continue;
    if (!normalised.includes(entry.token)) continue;
    // La marque est citee normalement : ce n'est pas de l'obfuscation.
    if (direct.includes(entry.token)) continue;
    return entry.brand.name;
  }
  return null;
}

export interface SocialAnalysis {
  findings: Finding[];
  /** Vrai si le message demande explicitement quelque chose. */
  hasSolicitation: boolean;
  /** Identifiants des regles de donnees sensibles declenchees. */
  sensitiveRuleIds: string[];
  /** Categories d'ingenierie sociale detectees, pour la synthese. */
  themes: string[];
  /** Vrai si un appat (gain, casino, investissement) a ete detecte. */
  lureDetected: boolean;
}

export interface SocialContext {
  /** Vrai si l'expediteur est le domaine officiel d'une marque du referentiel. */
  senderTrusted?: boolean;
}

/** Regles dont la presence classe le message comme porteur d'un appat. */
const LURE_RULE_IDS = new Set([
  'lex-financial-lure',
  'lex-guaranteed-returns',
  'lex-gambling-lure',
  'lex-withdrawal-bait',
]);

export function analyzeSocial(
  text: string,
  channel: Channel,
  hasUrls: boolean,
  subject?: string,
  context: SocialContext = {},
): SocialAnalysis {
  const senderTrusted = context.senderTrusted ?? false;
  const findings: Finding[] = [];
  const themes: string[] = [];

  for (const rule of LEXICON) {
    if (rule.id === 'lex-unicode-obfuscation') continue;
    const result = applyRule(rule, text, senderTrusted);
    if (result) {
      findings.push(result);
      themes.push(rule.title);
    }
  }

  // --- Obfuscation Unicode -------------------------------------------------
  if (hasZeroWidthChars(text)) {
    const count = countZeroWidthChars(text);
    findings.push({
      id: 'content-zero-width',
      category: 'contenu',
      severity: 'high',
      title: 'Caracteres invisibles dans le texte',
      detail: `Le message contient ${count} caracteres de largeur nulle ou de controle d ecriture. Ils sont invisibles et servent a contourner les filtres anti-spam ou a masquer une partie du texte.`,
      evidence: `${count} caractere(s) invisible(s) detecte(s)`,
      weight: SEVERITY_WEIGHT.high,
      sources: ['heuristique'],
    });
  }

  if (hasMixedScripts(text) && nonLatinRatio(text) > 0.1) {
    findings.push({
      id: 'content-mixed-scripts',
      category: 'contenu',
      severity: 'medium',
      title: 'Melange d alphabets dans le corps du message',
      detail:
        'Le corps du message melange plusieurs alphabets. Cette technique sert a deguiser des mots-cles (noms de marques, termes bancaires) pour echapper aux filtres.',
      evidence: `Ratio de caracteres non latins : ${Math.round(nonLatinRatio(text) * 100)} %`,
      weight: SEVERITY_WEIGHT.medium,
      sources: ['heuristique'],
    });
  }

  // --- Mise en forme -------------------------------------------------------
  const alreadyFlaggedFormat = findings.some((item) => item.id === 'lex-excessive-urgency-format');
  if (!alreadyFlaggedFormat && isMostlyUppercase(text)) {
    findings.push({
      id: 'content-all-caps',
      category: 'contenu',
      severity: 'low',
      title: 'Message en majuscules',
      detail:
        'Le message est ecrit majoritairement en majuscules. Cette mise en forme vise a provoquer une reaction emotionnelle immediate.',
      evidence: truncate(text, 90),
      weight: SEVERITY_WEIGHT.low,
      sources: ['heuristique'],
    });
  }

  // --- Nom de marque disloque ---------------------------------------------
  const obfuscated = detectObfuscatedBrand(text);
  if (obfuscated) {
    findings.push({
      id: 'content-obfuscated-brand',
      category: 'contenu',
      severity: 'medium',
      title: 'Nom de marque volontairement altere',
      detail: `Le message mentionne la marque « ${obfuscated} » en intercalant des caracteres ou en remplacant des lettres par des chiffres. Cette alteration n a qu un objectif : passer sous les filtres automatiques.`,
      evidence: truncate(text, 90),
      weight: SEVERITY_WEIGHT.medium,
      sources: ['heuristique'],
    });
  }

  // --- Contexte : message court avec lien ---------------------------------
  const trimmed = text.trim();
  if (hasUrls && trimmed.length <= 180 && channel !== 'email') {
    findings.push({
      id: 'context-short-message-with-link',
      category: 'metadata',
      severity: 'medium',
      title: 'Message tres court contenant un lien',
      detail:
        'Le message est bref et contient un lien. Un expediteur legitime accompagne generalement un lien d un contexte : numero de commande, reference de dossier, nom du destinataire.',
      evidence: truncate(trimmed, 90),
      weight: SEVERITY_WEIGHT.medium,
      sources: ['heuristique'],
    });
  }

  // --- Absence de reference personnalisee ---------------------------------
  const hasReference = /\b(?:n[°o]\s?\d|r[ée]f[ée]rence|commande\s?\d|dossier\s?\d|facture\s?\d|contrat\s?\d|transaction\s?\d)/i.test(
    text,
  );
  // Le signal n'a de sens que si le message demande quelque chose : un message
  // purement informatif (invitation, annonce) n'a aucune raison de porter une
  // reference de dossier. On exige donc un verbe d'action.
  const lowered = text.toLowerCase();
  const hasAction = ACTION_PHRASES.some((phrase) => lowered.includes(phrase));
  if (hasUrls && !hasReference && hasAction && trimmed.length > 120) {
    findings.push({
      id: 'context-no-reference',
      category: 'metadata',
      severity: 'low',
      title: 'Aucune reference de dossier',
      detail:
        'Le message ne contient aucune reference verifiable (numero de commande, de dossier ou de facture). Les envois legitimes en comportent presque toujours une.',
      evidence: 'Aucune reference de type « commande n°… » ou « dossier … »',
      weight: SEVERITY_WEIGHT.low,
      sources: ['heuristique'],
    });
  }

  // --- Objet de l'e-mail ---------------------------------------------------
  if (subject) {
    const urgentSubject = /(?:urgent|action requise|dernier avertissement|suspendu|bloqu[ée]|impay[ée]|v[ée]rification requise|confirmez|s[ée]curit[ée]|verify|alert)/i.exec(
      subject,
    );
    if (urgentSubject) {
      findings.push({
        id: 'context-urgent-subject',
        category: 'metadata',
        severity: 'low',
        title: 'Objet alarmiste',
        detail:
          'L objet du message utilise un vocabulaire alarmiste. Un objet anxiogene est concu pour etre ouvert avant toute reflexion.',
        evidence: truncate(subject, 90),
        weight: SEVERITY_WEIGHT.low,
        sources: ['heuristique'],
      });
    }
  }

  const sensitiveRuleIds = findings
    .filter((item) => item.category === 'donnees-sensibles')
    .map((item) => item.id);

  const lureDetected = findings.some((item) => LURE_RULE_IDS.has(item.id));

  return {
    findings,
    hasSolicitation: SOLICITATION_RE.test(text),
    sensitiveRuleIds,
    themes,
    lureDetected,
  };
}
