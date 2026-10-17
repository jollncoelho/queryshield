/**
 * Heuristiques de liens et de domaines.
 *
 * C'est le coeur technique de QueryShield : un message d'hameconnage se
 * reconnait d'abord a la destination qu'il propose. Toutes les verifications
 * sont statiques (aucune resolution DNS, aucune requete vers l'URL analysee),
 * donc le moteur ne declenche jamais le lien suspect.
 */

import { BRANDS, RISKY_TLDS, SENSITIVE_URL_KEYWORDS, URL_SHORTENERS, lookupLegitDomain, matchBrandsIn } from './brands';
import {
  RANDOMNESS_HIGH,
  RANDOMNESS_MEDIUM,
  RANDOMNESS_MIN_LENGTH,
  assessDomainRandomness,
  detectInstitutionalMimicry,
  detectTldAsLabel,
  lureTokensInHost,
  type RandomSignal,
} from './domain-reputation';
import type { HtmlAnchor } from './extract';
import {
  defang,
  effectiveTld,
  hasMixedScripts,
  hasZeroWidthChars,
  hostFromUrl,
  homoglyphCount,
  isPlainHttp,
  levenshtein,
  pathFromUrl,
  registrableDomain,
  secondLevelLabel,
  truncate,
  unique,
} from './text';
import { SEVERITY_WEIGHT, type Finding } from './types';

interface UrlObservation {
  url: string;
  host: string;
  registrable: string;
  sld: string;
  tld: string;
  path: string;
  raw: string;
}

/** Domaines de second niveau officiels, indexes pour la detection de typosquat. */
const BRAND_SLD_INDEX: { sld: string; brandName: string }[] = (() => {
  const entries: { sld: string; brandName: string }[] = [];
  const seen = new Set<string>();
  for (const brand of BRANDS) {
    for (const domain of brand.domains) {
      const sld = domain.split('.')[0].toLowerCase();
      if (sld.length < 4 || seen.has(sld)) continue;
      seen.add(sld);
      entries.push({ sld, brandName: brand.name });
    }
  }
  return entries;
})();

const IPV4_RE = /^\d{1,3}(?:\.\d{1,3}){3}$/;
const REDIRECT_PARAM_RE = /[?&](?:url|u|next|goto|redirect|redir|target|dest|destination|continue|return|returnurl|link|out)=/i;
const ENCODED_SEQUENCE_RE = /%[0-9a-f]{2}/gi;

function observe(url: string): UrlObservation | null {
  const host = hostFromUrl(url);
  if (!host) return null;
  const registrable = registrableDomain(host);
  return {
    url,
    host,
    registrable,
    sld: secondLevelLabel(host),
    tld: effectiveTld(host),
    path: pathFromUrl(url),
    raw: url,
  };
}

function finding(
  id: string,
  severity: Finding['severity'],
  category: Finding['category'],
  title: string,
  detail: string,
  evidence: string[],
  params?: Finding['params'],
): Finding {
  return {
    id,
    category,
    severity,
    title,
    detail,
    evidence: evidence.slice(0, 3).map((value) => truncate(defang(value), 110)).join('  |  '),
    params,
    weight: SEVERITY_WEIGHT[severity],
    sources: ['heuristique'],
  };
}

export interface UrlAnalysis {
  findings: Finding[];
  /** Domaines qui ont declenche au moins un signal d'usurpation. */
  suspiciousDomains: string[];
}

/**
 * Serialise les indices de generation automatique en une chaine compacte
 * (`entropy-high=3.51|consonant-run=7`) transportee dans `Finding.params`.
 *
 * Les codes sont ensuite rendus dans la langue de l'utilisateur par
 * `src/lib/i18n/finding.ts`. Un tableau d'objets ne peut pas traverser une
 * frontiere JSON/HTTP ; une chaine si.
 */
function encodeRandomSignals(signals: RandomSignal[]): string {
  return signals.map((item) => (item.value ? `${item.code}=${item.value}` : item.code)).join('|');
}

export function analyzeUrls(urls: string[], anchors: HtmlAnchor[], rawText: string): UrlAnalysis {
  const observations = urls.map(observe).filter((value): value is UrlObservation => Boolean(value));
  const findings: Finding[] = [];
  const suspiciousDomains = new Set<string>();

  const push = (
    id: string,
    severity: Finding['severity'],
    category: Finding['category'],
    title: string,
    detail: string,
    evidence: string[],
    markDomain = false,
    params?: Finding['params'],
  ) => {
    const clean = unique(evidence);
    if (clean.length === 0) return;
    findings.push(finding(id, severity, category, title, detail, clean, params));
    if (markDomain) {
      for (const value of clean) {
        const host = hostFromUrl(value);
        if (host) suspiciousDomains.add(host);
      }
    }
  };

  // --- 1. Schema dangereux (invisible pour l'extracteur d'URL) -------------
  const dangerousScheme = rawText.match(/\b(?:data|javascript|vbscript|file)\s*:/gi) ?? [];
  push(
    'url-dangerous-scheme',
    'critical',
    'lien',
    'Schema d URL dangereux',
    'Le contenu embarque un lien `data:`, `javascript:` ou `file:`. Ce type de lien execute du code ou ouvre un fichier local sans passer par un site web : il n a aucune raison d etre present dans un message legitime.',
    dangerousScheme,
  );

  // --- 2. Adresse IP en dur ------------------------------------------------
  const ipHosts = observations.filter((obs) => IPV4_RE.test(obs.host));
  push(
    'url-ip-literal',
    'high',
    'lien',
    'Lien vers une adresse IP brute',
    'Le lien pointe directement sur une adresse IP au lieu d un nom de domaine. Les services officiels utilisent toujours un domaine ; l IP brute evite les listes de blocage et les certificats.',
    ipHosts.map((obs) => obs.raw),
    true,
  );

  // --- 3. Punycode ---------------------------------------------------------
  const punycode = observations.filter((obs) => obs.host.split('.').some((label) => label.startsWith('xn--')));
  push(
    'url-punycode',
    'high',
    'lien',
    'Domaine encode en punycode',
    'Le domaine contient un libelle `xn--`. C est l encodage des caracteres non latins : il permet d afficher un nom visuellement identique a celui d une marque officielle alors que le domaine est different.',
    punycode.map((obs) => obs.raw),
    true,
  );

  // --- 4. Homoglyphes / melange d alphabets -------------------------------
  const homoglyphHosts = observations.filter(
    (obs) => hasMixedScripts(obs.host) || homoglyphCount(obs.host) > 0,
  );
  push(
    'url-homoglyph',
    'critical',
    'lien',
    'Domaine avec caracteres homoglyphes',
    'Le domaine melange alphabet latin et caracteres cyrilliques ou grecs visuellement identiques. C est la technique la plus efficace pour imiter une marque : a l oeil, le domaine est indiscernable.',
    homoglyphHosts.map((obs) => obs.raw),
    true,
  );

  // --- 5. Userinfo dans l URL ---------------------------------------------
  const userinfo = observations.filter((obs) => {
    const withoutScheme = obs.raw.replace(/^[a-z][a-z0-9+.-]*:\/\//i, '');
    const beforeSlash = withoutScheme.split('/')[0];
    return beforeSlash.includes('@');
  });
  push(
    'url-userinfo-trick',
    'high',
    'lien',
    'Domaine masque par un arobase',
    'L URL contient une arobase avant le chemin. Tout ce qui precede l arobase est ignore par le navigateur : le domaine reellement visite n est pas celui qui apparait en premier.',
    userinfo.map((obs) => obs.raw),
    true,
  );

  // --- 6. TLD a risque -----------------------------------------------------
  const riskyTld = observations.filter((obs) => RISKY_TLDS.has(obs.tld));
  push(
    'url-risky-tld',
    'medium',
    'lien',
    'Extension de domaine a risque',
    'L extension du domaine figure parmi celles massivement utilisees par les campagnes d hameconnage, car elles sont vendues a bas prix et sans verification d identite.',
    riskyTld.map((obs) => `${obs.raw}`),
    true,
  );

  // --- 7. Raccourcisseur ---------------------------------------------------
  const shorteners = observations.filter((obs) => URL_SHORTENERS.has(obs.registrable));
  push(
    'url-shortener',
    'medium',
    'lien',
    'Lien raccourci',
    'Le lien passe par un service de raccourcissement : la destination reelle est invisible avant le clic. Pour un message non sollicite, considerer la destination comme inconnue.',
    shorteners.map((obs) => obs.raw),
    true,
  );

  // --- 8. Usurpation de marque par le domaine -----------------------------
  const brandImpersonation: string[] = [];
  const brandLabels: string[] = [];
  for (const obs of observations) {
    if (lookupLegitDomain(obs.registrable)) continue;
    const matched = matchBrandsIn(obs.host);
    if (matched.length === 0) continue;
    brandImpersonation.push(obs.raw);
    for (const brand of matched) brandLabels.push(brand.name);
  }
  push(
    'url-brand-impersonation',
    'high',
    'identite',
    'Domaine usurpant une marque connue',
    `Le domaine reprend le nom d une marque (${unique(brandLabels).slice(0, 4).join(', ')}) sans etre un domaine officiel de cette marque. C est la signature la plus frequente de l hameconnage cible.`,
    brandImpersonation,
    true,
    { brands: unique(brandLabels).slice(0, 4).join(', ') },
  );

  // --- 9. Typosquatting ----------------------------------------------------
  const typoExact: string[] = [];
  const typoApprox: string[] = [];
  for (const obs of observations) {
    if (lookupLegitDomain(obs.registrable)) continue;
    if (obs.sld.length < 5) continue;
    for (const entry of BRAND_SLD_INDEX) {
      if (Math.abs(entry.sld.length - obs.sld.length) > 2) continue;
      const distance = levenshtein(obs.sld, entry.sld);
      if (distance === 1) {
        typoExact.push(`${obs.raw}  (proche de ${entry.sld})`);
        break;
      }
      if (distance === 2 && obs.sld.length >= 8) {
        typoApprox.push(`${obs.raw}  (proche de ${entry.sld})`);
        break;
      }
    }
  }
  push(
    'url-typosquat',
    'high',
    'identite',
    'Faute de frappe imitant un domaine officiel',
    'Le domaine differe d un seul caractere d un domaine officiel. Cette technique (typosquatting) exploite une faute de frappe ou une lecture rapide du message.',
    typoExact,
    true,
  );
  push(
    'url-typosquat-approx',
    'medium',
    'identite',
    'Domaine visuellement proche d un officiel',
    'Le domaine ressemble fortement a un domaine officiel, sans lui etre identique. Verifiez caractere par caractere avant toute action.',
    typoApprox,
    true,
  );

  // --- 9bis. Structure du domaine : generation automatique ----------------
  // Les listes de marques ne couvrent pas les domaines tires au hasard, qui
  // sont pourtant le cas le plus frequent dans les campagnes de masse.
  const randomHigh: string[] = [];
  const randomMedium: string[] = [];
  const randomSignals: string[] = [];
  const randomSignalCodes: RandomSignal[] = [];
  for (const obs of observations) {
    if (lookupLegitDomain(obs.registrable)) continue;
    if (obs.sld.length < RANDOMNESS_MIN_LENGTH) continue;
    const assessment = assessDomainRandomness(obs.sld);
    if (assessment.score >= RANDOMNESS_HIGH) {
      randomHigh.push(obs.raw);
      if (randomSignals.length === 0) {
        randomSignals.push(...assessment.signals);
        randomSignalCodes.push(...assessment.signalCodes);
      }
    } else if (assessment.score >= RANDOMNESS_MEDIUM) {
      randomMedium.push(obs.raw);
      if (randomSignals.length === 0) {
        randomSignals.push(...assessment.signals);
        randomSignalCodes.push(...assessment.signalCodes);
      }
    }
  }
  // Les codes sont transmis a la couche de presentation pour etre rendus dans
  // la langue de l'utilisateur ; `signals` reste le repli en francais.
  const randomSignalParam = encodeRandomSignals(randomSignalCodes);
  push(
    'url-random-domain',
    'high',
    'lien',
    'Domaine genere automatiquement',
    `Le domaine du lien ne ressemble a aucun nom lisible${randomSignals.length > 0 ? ` : ${randomSignals.join(', ')}` : ''}. Les domaines produits aleatoirement sont enregistres par lots pour quelques jours : ils n ont ni histoire, ni reputation, ni raison d etre dans un message legitime.`,
    randomHigh,
    true,
    { signals: randomSignals.join(', '), signalCodes: randomSignalParam },
  );
  push(
    'url-random-domain-weak',
    'medium',
    'lien',
    'Domaine au nom inhabituel',
    `La structure du domaine du lien est inhabituelle${randomSignals.length > 0 ? ` : ${randomSignals.join(', ')}` : ''}. Signal a confirmer par les autres controles.`,
    randomMedium,
    true,
    { signals: randomSignals.join(', '), signalCodes: randomSignalParam },
  );

  // --- 9ter. Usurpation institutionnelle ----------------------------------
  const institutional: string[] = [];
  const institutionalWords: string[] = [];
  for (const obs of observations) {
    if (lookupLegitDomain(obs.registrable)) continue;
    const mimicry = detectInstitutionalMimicry(obs.host);
    if (!mimicry) continue;
    institutional.push(obs.raw);
    institutionalWords.push(mimicry.word);
  }
  push(
    'url-institutional-mimicry',
    'high',
    'identite',
    'Domaine imitant une institution',
    `Le domaine reprend le vocabulaire d une institution publique (${unique(institutionalWords).slice(0, 4).join(', ')}) sans en etre un domaine officiel. Les administrations utilisent des domaines en .gouv.fr ou .gov : une variante commerciale est une usurpation.`,
    institutional,
    true,
    { words: unique(institutionalWords).slice(0, 4).join(', ') },
  );

  // --- 9quater. Extension connue detournee en sous-domaine ----------------
  const tldAsLabel: string[] = [];
  for (const obs of observations) {
    if (detectTldAsLabel(obs.host)) tldAsLabel.push(obs.raw);
  }
  push(
    'url-tld-as-label',
    'high',
    'lien',
    'Extension detournee en sous-domaine',
    'Le lien contient une extension connue (.com, .gov, .fr...) a une position qui n est pas l extension finale. Le domaine reellement enregistre est celui qui suit, mais l oeil s arrete sur la partie qui precede : le montage sert uniquement a tromper la lecture.',
    tldAsLabel,
    true,
  );

  // --- 9quinquies. Termes d'appat dans le domaine -------------------------
  const lureHosts: string[] = [];
  const lureTokens = new Set<string>();
  for (const obs of observations) {
    if (lookupLegitDomain(obs.registrable)) continue;
    const tokens = lureTokensInHost(obs.host);
    if (tokens.length === 0) continue;
    lureHosts.push(obs.raw);
    for (const token of tokens) lureTokens.add(token);
  }
  push(
    'url-lure-keywords',
    'medium',
    'lien',
    'Termes d appat dans le domaine',
    `Le domaine contient des termes destines a attirer (${Array.from(lureTokens).slice(0, 4).join(', ')}). Un nom de domaine choisi pour son argument commercial est presque toujours un domaine enregistre pour une campagne d envoi de masse.`,
    lureHosts,
    true,
    { tokens: Array.from(lureTokens).slice(0, 4).join(', ') },
  );

  // --- 10. Mots-cles sensibles dans le chemin -----------------------------
  // Exemption volontaire : si le domaine est le domaine officiel de la marque
  // concernee, la presence de /account, /update ou /suivi est parfaitement
  // normale. Sans cette exemption, chaque lien legitime vers un espace client
  // declencherait un signal.
  const keywordHits: string[] = [];
  const keywordSet = new Set<string>();
  for (const obs of observations) {
    if (lookupLegitDomain(obs.registrable)) continue;
    const haystack = `${obs.host}${obs.path}`.toLowerCase();
    const localHits = SENSITIVE_URL_KEYWORDS.filter((keyword) => haystack.includes(keyword));
    if (localHits.length === 0) continue;
    for (const keyword of localHits) keywordSet.add(keyword);
    keywordHits.push(obs.raw);
  }
  push(
    keywordSet.size >= 2 ? 'url-sensitive-path-strong' : 'url-sensitive-path',
    keywordSet.size >= 2 ? 'medium' : 'low',
    'lien',
    'Mots-cles d authentification dans le lien',
    `Le lien contient des termes de connexion ou de paiement (${Array.from(keywordSet).slice(0, 5).join(', ')}) sur un domaine qui n est pas celui de l organisation annoncee. Ils sont places la pour rassurer la victime.`,
    keywordHits,
    false,
    { keywords: Array.from(keywordSet).slice(0, 5).join(', ') },
  );

  // --- 11. HTTP en clair sur une page sensible ----------------------------
  const plainHttpSensitive = observations.filter(
    (obs) =>
      !lookupLegitDomain(obs.registrable) &&
      isPlainHttp(obs.raw) &&
      SENSITIVE_URL_KEYWORDS.some((keyword) => `${obs.host}${obs.path}`.toLowerCase().includes(keyword)),
  );
  push(
    'url-plain-http-sensitive',
    'medium',
    'lien',
    'Page sensible servie en HTTP',
    'Le lien pointe vers une page de connexion ou de paiement sans chiffrement. Aucun service legitime ne collecte d identifiants en HTTP.',
    plainHttpSensitive.map((obs) => obs.raw),
  );

  // --- 12. Structure de domaine anormale ----------------------------------
  const manyLabels = observations.filter((obs) => obs.host.split('.').length > 4);
  push(
    'url-many-subdomains',
    'low',
    'lien',
    'Empilement de sous-domaines',
    'Le domaine comporte un nombre inhabituel de sous-domaines. L empilement sert a repousser le domaine reel hors de la zone visible de la barre d adresse.',
    manyLabels.map((obs) => obs.raw),
  );

  const longHosts = observations.filter((obs) => obs.host.length > 35);
  push(
    'url-long-host',
    'low',
    'lien',
    'Nom de domaine anormalement long',
    'Le nom de domaine est tres long. Les domaines generes automatiquement par les kits d hameconnage le sont souvent.',
    longHosts.map((obs) => obs.raw),
  );

  const manyHyphens = observations.filter(
    (obs) => (obs.sld.match(/-/g) ?? []).length >= 3,
  );
  push(
    'url-many-hyphens',
    'low',
    'lien',
    'Tirets multiples dans le domaine',
    'Le domaine enchaine plusieurs tirets, motif typique des domaines generes pour imiter un nom officiel.',
    manyHyphens.map((obs) => obs.raw),
  );

  const oddPorts = observations.filter((obs) => {
    const match = obs.host.match(/:(\d+)$/);
    if (!match) return false;
    return !['80', '443', '8080', '8443'].includes(match[1]);
  });
  push(
    'url-odd-port',
    'medium',
    'lien',
    'Port non standard',
    'Le lien precise un port non standard. Les sites officiels n en utilisent pas et cela traduit souvent un serveur d attaque.',
    oddPorts.map((obs) => obs.raw),
  );

  const redirects = observations.filter((obs) => REDIRECT_PARAM_RE.test(obs.path));
  push(
    'url-redirect-param',
    'medium',
    'lien',
    'Redirection vers une destination cachee',
    'Le lien contient un parametre de redirection. La page affichee peut sembler legitime tout en renvoyant vers un autre site apres validation.',
    redirects.map((obs) => obs.raw),
  );

  const encoded = observations.filter(
    (obs) => (obs.raw.match(ENCODED_SEQUENCE_RE) ?? []).length >= 8,
  );
  push(
    'url-heavy-encoding',
    'medium',
    'lien',
    'URL fortement encodee',
    'Le lien contient de nombreuses sequences d echappement. L encodage sert a masquer la destination reelle et a contourner les filtres.',
    encoded.map((obs) => obs.raw),
  );

  const zeroWidth = observations.filter((obs) => hasZeroWidthChars(obs.raw));
  push(
    'url-zero-width',
    'high',
    'lien',
    'Caracteres invisibles dans le lien',
    'Le lien contient des caracteres de largeur nulle, invisibles a l ecran. Ils servent uniquement a tromper les filtres et l oeil humain.',
    zeroWidth.map((obs) => obs.raw),
    true,
  );

  // --- 13. Discordance entre texte affiche et destination -----------------
  const mismatches: string[] = [];
  for (const anchor of anchors) {
    const hrefHost = hostFromUrl(anchor.href);
    if (!hrefHost) continue;
    const anchorText = anchor.text.trim();
    if (!/\.[a-z]{2,24}/i.test(anchorText)) continue;
    const textHost = hostFromUrl(anchorText);
    if (!textHost) continue;
    if (registrableDomain(textHost) !== registrableDomain(hrefHost)) {
      mismatches.push(`texte « ${truncate(anchorText, 40)} » -> ${anchor.href}`);
    }
  }
  push(
    'url-anchor-mismatch',
    'critical',
    'lien',
    'Texte du lien different de sa destination',
    'Le texte affiche du lien indique un domaine, mais le lien pointe vers un autre domaine. C est une preuve directe d intention trompeuse.',
    mismatches,
  );

  return { findings, suspiciousDomains: Array.from(suspiciousDomains) };
}
