/**
 * Agregation, ponderation et verdict.
 *
 * Le score n'est pas une simple somme : les poids passent par une courbe
 * logarithmique (les signaux se renforcent puis saturent) et un jeu de regles
 * de decision explicites peut relever le verdict. Ces regles sont volontaires :
 * elles rendent le comportement du moteur auditable, contrairement a un score
 * opaque.
 */

import {
  CATEGORY_LABEL,
  SEVERITY_WEIGHT,
  emptySignals,
  type AnalyzeResult,
  type CategoryScore,
  type Finding,
  type FindingCategory,
  type SignalBreakdown,
  type Verdict,
} from './types';

export interface ScoringContext {
  hasUrls: boolean;
  suspiciousDomainCount: number;
  headersUsable: boolean;
  textLength: number;
  llmUsed: boolean;
  /**
   * Vrai lorsqu'un expediteur a ete identifie et que son domaine n'est pas un
   * domaine officiel du referentiel. Sert a la regle de combinaison
   * « promesse financiere + expediteur non officiel ».
   */
  senderUntrusted?: boolean;
}

export interface ScoringOutput {
  score: number;
  verdict: Verdict;
  confidence: number;
  summary: string;
  signals: SignalBreakdown;
  categories: CategoryScore[];
  recommendations: string[];
  findings: Finding[];
}

const SENSITIVE_RULES = new Set([
  'lex-credential-request',
  'lex-credential-2fa',
  'lex-bank-data-request',
  'lex-crypto-seed-request',
  'lex-identity-documents',
  'lex-direct-payment',
]);

const AUTHORITY_RULES = new Set([
  'lex-authority-public',
  'lex-authority-carrier',
  'hdr-displayname-brand-mismatch',
  'url-brand-impersonation',
  'url-typosquat',
  'url-anchor-mismatch',
]);

const THREAT_RULES = new Set([
  'lex-threat-suspension',
  'lex-threat-legal',
  'lex-threat-payment',
  'lex-authority-support',
]);

/**
 * Promesses d'argent facile. Leur point commun : aucune organisation
 * verifiee n'ecrit ce genre de message depuis un domaine qui n'est pas le
 * sien. Une seule de ces regles suffit, combinee a un expediteur non
 * officiel, pour conclure a une fraude.
 */
const LURE_RULES = new Set([
  'lex-financial-lure',
  'lex-guaranteed-returns',
  'lex-gambling-lure',
  'lex-withdrawal-bait',
]);

/** Constats produits par l'analyse structurelle de l'expediteur. */
const SENDER_RULES = new Set([
  'sender-random-domain',
  'sender-random-domain-weak',
  'sender-institutional-mimicry',
  'sender-tld-as-label',
  'sender-lure-domain',
  'sender-brand-impersonation',
  'sender-displayname-mismatch',
]);

/** Un lien est considere comme « douteux » a partir de cette severite. */
const LINK_RULES = new Set([
  'url-brand-impersonation',
  'url-typosquat',
  'url-ip-literal',
  'url-punycode',
  'url-homoglyph',
  'url-userinfo-trick',
  'url-anchor-mismatch',
  'url-shortener',
  'url-risky-tld',
  'url-dangerous-scheme',
  'url-redirect-param',
  'url-heavy-encoding',
  'url-odd-port',
  'url-plain-http-sensitive',
  'url-zero-width',
]);

function combo(
  id: string,
  severity: Finding['severity'],
  category: FindingCategory,
  title: string,
  detail: string,
  sources: string[],
): Finding {
  return {
    id,
    category,
    severity,
    title,
    detail,
    evidence: sources.join('  +  '),
    weight: SEVERITY_WEIGHT[severity],
    sources: ['heuristique'],
  };
}

export function computeCombos(
  findings: Finding[],
  context: Pick<ScoringContext, 'senderUntrusted'> = {},
): Finding[] {
  const ids = new Set(findings.map((item) => item.id));
  const has = (id: string) => ids.has(id);
  const hasAny = (set: Set<string>) => Array.from(set).some((id) => ids.has(id));
  const combos: Finding[] = [];

  const hasSensitive = hasAny(SENSITIVE_RULES);
  const hasDoubtfulLink = hasAny(LINK_RULES);
  const hasAuthority = hasAny(AUTHORITY_RULES) || hasAny(SENDER_RULES);
  const hasThreat = hasAny(THREAT_RULES);
  const hasUrgency = has('lex-urgency');
  const hasSecrecy = has('lex-secrecy-pressure');
  const hasLure = hasAny(LURE_RULES);
  const hasRemote = has('lex-remote-access');

  /** Le domaine de l'expediteur a lui seul porte un signal structurel. */
  const hasSenderSignal = hasAny(SENDER_RULES);
  /** Le message se reclame d'une organisation (marque, administration, menace). */
  const hasClaimedOrganisation = hasAny(AUTHORITY_RULES) || hasThreat;

  // « Non officiel » : soit le domaine de l'expediteur a declenche un signal
  // structurel, soit il n'appartient simplement a aucune organisation verifiee
  // du referentiel.
  const senderUntrusted = Boolean(context.senderUntrusted) || hasSenderSignal;

  if (hasSensitive && hasDoubtfulLink) {
    combos.push(
      combo(
        'combo-sensitive-request-with-link',
        'critical',
        'donnees-sensibles',
        'Demande sensible combinee a un lien douteux',
        'Le message reclame des donnees confidentielles ET propose un lien non fiable pour les saisir. Cette combinaison constitue le scenario d hameconnage complet : c est le signal le plus grave que le moteur puisse produire.',
        ['demande de donnees sensibles', 'lien non fiable'],
      ),
    );
  }

  if (hasAuthority && hasUrgency && hasDoubtfulLink) {
    combos.push(
      combo(
        'combo-impersonation-with-urgency',
        'high',
        'identite',
        'Usurpation d organisation avec urgence',
        'Le message se reclame d une organisation reconnue, impose un delai court et renvoie vers un lien non fiable. Les trois ingredients de l hameconnage sont reunis.',
        ['usurpation d organisation', 'pression temporelle', 'lien non fiable'],
      ),
    );
  }

  if (hasThreat && hasDoubtfulLink) {
    combos.push(
      combo(
        'combo-threat-with-link',
        'high',
        'ingenierie-sociale',
        'Menace assortie d un lien',
        'Le message agite une consequence grave (suspension, amende, poursuites) et fournit un lien pour y remedier. La menace sert uniquement a faire cliquer.',
        ['menace', 'lien non fiable'],
      ),
    );
  }

  if (hasSecrecy && (hasSensitive || hasLure)) {
    combos.push(
      combo(
        'combo-secrecy-scenario',
        'critical',
        'ingenierie-sociale',
        'Scenario de manipulation caracterise',
        'Le message combine une injonction au secret avec une demande financiere ou de donnees. C est le schema des fraudes au faux conseiller bancaire, concu pour empecher toute verification aupres d un tiers.',
        ['injonction au secret', 'demande financiere ou de donnees'],
      ),
    );
  }

  if (hasRemote && (hasThreat || hasUrgency)) {
    combos.push(
      combo(
        'combo-remote-takeover',
        'critical',
        'ingenierie-sociale',
        'Tentative de prise de controle de l appareil',
        'Le message pousse a installer un outil de prise en main a distance en s appuyant sur un pretexte alarmant. Une fois l outil installe, l escroc realise les operations a votre place.',
        ['prise de controle a distance', 'pretexte alarmant'],
      ),
    );
  }

  if (hasLure && (hasSensitive || has('lex-direct-payment'))) {
    combos.push(
      combo(
        'combo-lure-then-request',
        'high',
        'ingenierie-sociale',
        'Appat financier suivi d une demande',
        'Le message cree un espoir de gain puis reclame une somme, des frais ou des donnees. C est la structure de la fraude au faux gain et de l arnaque au faux investissement.',
        ['appat financier', 'demande de paiement ou de donnees'],
      ),
    );
  }

  // --- Appat financier depuis un domaine non officiel ---------------------
  // Regle demandee explicitement : elle ne depend PAS d'une demande
  // d'identifiants. Le simple fait qu'une promesse d'argent arrive depuis un
  // domaine qui n'est pas celui d'un operateur verifie suffit a conclure.
  //
  // Garde-fou : le declenchement exige en plus un element objectif — signal
  // structurel sur le domaine, lien douteux, ou organisation revendiquee. Sans
  // lui, un message interne parfaitement legitime (« votre bulletin de paie
  // inclut une prime exceptionnelle ») serait classe frauduleux, ce qui
  // detruirait la confiance dans l'outil. Le cas signale sur le terrain
  // (domaine aleatoire) satisfait evidemment cette condition.
  if (hasLure && senderUntrusted && (hasSenderSignal || hasDoubtfulLink || hasClaimedOrganisation)) {
    combos.push(
      combo(
        'combo-lure-with-untrusted-sender',
        'critical',
        'ingenierie-sociale',
        'Promesse financiere depuis un domaine non officiel',
        'Le message promet un gain, un bonus, un retrait ou un rendement ET provient d un domaine qui n est pas celui d une organisation verifiee. Cette combinaison suffit a conclure a une fraude : une offre financiere reelle est toujours emise depuis le domaine officiel de l operateur. Aucune demande d identifiants n est necessaire pour que le risque soit eleve.',
        ['promesse financiere', 'domaine expediteur non officiel'],
      ),
    );
  }

  const strongCategories = new Set(
    findings.filter((item) => item.severity === 'high' || item.severity === 'critical').map((item) => item.category),
  );
  if (strongCategories.size >= 3) {
    combos.push(
      combo(
        'combo-convergence',
        'high',
        'metadata',
        'Convergence de signaux independants',
        `Le message presente des signaux forts dans ${strongCategories.size} familles differentes (${Array.from(strongCategories)
          .map((category) => CATEGORY_LABEL[category])
          .join(', ')}). La convergence de signaux independants rend l erreur d analyse tres improbable.`,
        Array.from(strongCategories).map((category) => CATEGORY_LABEL[category]),
      ),
    );
  }

  return combos;
}

/** Deduplique par identifiant de regle en fusionnant les moteurs sources. */
export function dedupeFindings(findings: Finding[]): Finding[] {
  const byId = new Map<string, Finding>();
  for (const item of findings) {
    const existing = byId.get(item.id);
    if (!existing) {
      byId.set(item.id, { ...item, sources: [...item.sources] });
      continue;
    }
    for (const source of item.sources) {
      if (!existing.sources.includes(source)) existing.sources.push(source);
    }
    if (!existing.evidence && item.evidence) existing.evidence = item.evidence;
  }
  return Array.from(byId.values());
}

const SEVERITY_ORDER: Record<Finding['severity'], number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
  info: 4,
};

export function sortFindings(findings: Finding[]): Finding[] {
  return [...findings].sort((a, b) => {
    const bySeverity = SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity];
    if (bySeverity !== 0) return bySeverity;
    return b.weight - a.weight;
  });
}

function buildRecommendations(findings: Finding[], verdict: Verdict): string[] {
  const ids = new Set(findings.map((item) => item.id));
  const recommendations: string[] = [];

  if (verdict === 'safe') {
    recommendations.push(
      'Aucun signe de fraude detecte. Le message peut toutefois contenir des elements que l analyse statique ne couvre pas : restez attentif si une demande d argent ou de donnees apparait ensuite.',
    );
    recommendations.push(
      'En cas de doute, contactez l organisme par un numero ou une adresse que vous avez trouves vous-meme, jamais depuis le message.',
    );
    return recommendations;
  }

  recommendations.push(
    'Ne cliquez sur aucun lien et n ouvrez aucune piece jointe de ce message avant verification.',
  );

  if (
    ids.has('lex-credential-request') ||
    ids.has('lex-credential-2fa') ||
    ids.has('combo-sensitive-request-with-link')
  ) {
    recommendations.push(
      'Ne transmettez jamais un mot de passe, un code recu par SMS ou un code de double authentification. Aucun service legitime ne les demande.',
    );
  }

  if (ids.has('lex-bank-data-request') || ids.has('lex-direct-payment')) {
    recommendations.push(
      'N effectuez aucun virement et ne saisissez aucune donnee de carte bancaire. Contactez votre banque avec le numero figurant au dos de votre carte.',
    );
  }

  if (ids.has('lex-crypto-seed-request')) {
    recommendations.push(
      'Ne communiquez jamais votre phrase de recuperation ni votre cle privee. Quiconque les obtient peut vider le portefeuille de facon irreversible.',
    );
  }

  if (ids.has('lex-secrecy-pressure') || ids.has('combo-secrecy-scenario')) {
    recommendations.push(
      'L injonction au secret est en soi un signal de fraude. Parlez-en a un proche et a votre banque : c est exactement ce que l escroc cherche a empecher.',
    );
  }

  if (
    ids.has('combo-lure-with-untrusted-sender') ||
    ids.has('lex-gambling-lure') ||
    ids.has('lex-withdrawal-bait') ||
    ids.has('lex-financial-lure') ||
    ids.has('lex-guaranteed-returns')
  ) {
    recommendations.push(
      'N envoyez jamais d argent et ne payez aucun « frais » de deblocage, de dossier ou de retrait pour obtenir un gain. Un gain reel ne se paie jamais d avance.',
    );
  }

  if (
    ids.has('sender-free-mailbox') ||
    ids.has('sender-random-domain') ||
    ids.has('sender-institutional-mimicry') ||
    ids.has('sender-tld-as-label') ||
    ids.has('sender-lure-domain')
  ) {
    recommendations.push(
      'Verifiez l adresse reelle de l expediteur, c est-a-dire le domaine situe apres l arobase, et non le nom affiche : c est la seule partie que l expediteur ne peut pas falsifier.',
    );
  }

  if (ids.has('lex-remote-access') || ids.has('combo-remote-takeover')) {
    recommendations.push(
      'N installez aucun logiciel de prise en main a distance (TeamViewer, AnyDesk...) a la demande d un interlocuteur non sollicite.',
    );
  }

  if (
    ids.has('url-brand-impersonation') ||
    ids.has('url-typosquat') ||
    ids.has('hdr-displayname-brand-mismatch') ||
    ids.has('sender-brand-impersonation') ||
    ids.has('sender-displayname-mismatch')
  ) {
    recommendations.push(
      'Rendez-vous sur le site officiel en saisissant vous-meme l adresse dans le navigateur, puis verifiez votre compte depuis cet espace.',
    );
  }

  if (ids.has('url-shortener')) {
    recommendations.push(
      'Un lien raccourci masque sa destination. Developpez-le avec un outil de resolution avant tout clic, ou ignorez-le.',
    );
  }

  recommendations.push(
    'Signalez le message : Signal Spam (signal-spam.fr) pour les e-mails, 33700 (33700.fr) pour les SMS et appels indesirables, ou la plateforme Pharos pour les contenus frauduleux.',
  );

  return recommendations;
}

function buildSummary(findings: Finding[], verdict: Verdict, score: number): string {
  const critical = findings.filter((item) => item.severity === 'critical');
  const high = findings.filter((item) => item.severity === 'high');
  const medium = findings.filter((item) => item.severity === 'medium');

  if (verdict === 'safe') {
    if (findings.length === 0) {
      return 'Aucun indicateur de fraude n a ete detecte. Le message ne presente ni lien douteux, ni demande de donnees sensibles, ni pression temporelle caracteristique.';
    }
    return `Le message ne presente que des signaux faibles (${findings.length}). Rien ne permet de conclure a une fraude, mais une verification manuelle reste recommandee si une demande vous est adressee.`;
  }

  const parts: string[] = [];
  if (critical.length > 0) parts.push(`${critical.length} signal(aux) critique(s)`);
  if (high.length > 0) parts.push(`${high.length} signal(aux) fort(s)`);
  if (medium.length > 0) parts.push(`${medium.length} signal(aux) modere(s)`);

  const headline = critical[0] ?? high[0] ?? medium[0];
  const verdictText =
    verdict === 'dangerous'
      ? `Score de risque ${score}/100 : le message est tres probablement frauduleux.`
      : `Score de risque ${score}/100 : le message est suspect et doit etre verifie avant toute action.`;

  return `${verdictText} ${parts.join(', ')} convergent. Principal element declencheur : ${headline.title.toLowerCase()}.`;
}

export function score(
  allFindings: Finding[],
  context: ScoringContext,
): ScoringOutput {
  const combos = computeCombos(allFindings, context);
  const findings = sortFindings(dedupeFindings([...allFindings, ...combos]));

  const raw = findings.reduce((total, item) => total + item.weight, 0);
  let score = raw === 0 ? 0 : Math.round(100 * (1 - Math.exp(-raw / 48)));

  const criticals = findings.filter((item) => item.severity === 'critical').length;
  const highs = findings.filter((item) => item.severity === 'high').length;

  // Regles de decision explicites, appliquees apres le calcul du score.
  if (criticals >= 2) score = Math.max(score, 82);
  else if (criticals === 1 && raw >= 30) score = Math.max(score, 72);
  else if (criticals === 1) score = Math.max(score, 48);

  if (highs >= 3) score = Math.max(score, 68);
  else if (highs >= 2 && raw >= 45) score = Math.max(score, 60);

  // Exigence produit explicite : une promesse financiere emise depuis un
  // domaine non officiel place le message en risque eleve, meme si le corps
  // du texte ne demande aucun identifiant. Le plancher garantit que la regle
  // de combinaison se traduit toujours par un verdict « tres probablement
  // frauduleux ».
  if (findings.some((item) => item.id === 'combo-lure-with-untrusted-sender')) {
    score = Math.max(score, 78);
  }

  score = Math.min(100, Math.max(0, score));

  let verdict: Verdict = 'safe';
  if (score >= 60) verdict = 'dangerous';
  else if (score >= 28) verdict = 'suspicious';

  // Confiance : qualite du signal disponible, pas certitude du verdict.
  let confidence = 0.48;
  if (context.hasUrls) confidence += 0.18;
  if (context.headersUsable) confidence += 0.22;
  if (context.textLength > 220) confidence += 0.08;
  if (criticals > 0) confidence += 0.06;
  if (context.suspiciousDomainCount > 0) confidence += 0.05;
  if (context.textLength < 25) confidence = Math.min(confidence, 0.3);
  confidence = Math.min(0.96, Math.round(confidence * 100) / 100);

  const signals = emptySignals();
  for (const item of findings) signals[item.severity] += 1;

  const categoryMap = new Map<FindingCategory, CategoryScore>();
  for (const item of findings) {
    const current = categoryMap.get(item.category) ?? {
      category: item.category,
      score: 0,
      findings: 0,
    };
    current.score += item.weight;
    current.findings += 1;
    categoryMap.set(item.category, current);
  }
  const categories = Array.from(categoryMap.values()).sort((a, b) => b.score - a.score);

  return {
    score,
    verdict,
    confidence,
    summary: buildSummary(findings, verdict, score),
    signals,
    categories,
    recommendations: buildRecommendations(findings, verdict),
    findings,
  };
}

export function buildResult(
  scoring: ScoringOutput,
  iocs: AnalyzeResult['iocs'],
  meta: AnalyzeResult['meta'],
): AnalyzeResult {
  return {
    score: scoring.score,
    verdict: scoring.verdict,
    confidence: scoring.confidence,
    summary: scoring.summary,
    findings: scoring.findings,
    iocs,
    signals: scoring.signals,
    categories: scoring.categories,
    recommendations: scoring.recommendations,
    meta,
  };
}
