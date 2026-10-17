/**
 * Verification d'un site web : est-ce le vrai, ou une imitation ?
 *
 * CE MODULE NE CONTACTE JAMAIS LE SITE ANALYSE.
 *
 * C'est la difference de fond avec un simple scanner d'URL. Ouvrir la page
 * suspecte, c'est prevenir l'attaquant qu'on l'a detecte (et lui livrer
 * l'adresse IP de la victime). Toutes les verifications de ce fichier sont donc
 * statiques : structure du domaine, comparaison au referentiel de marques,
 * analyse du chemin. Les verifications reseau optionnelles (voir
 * `site-network.ts`) interrogent l'annuaire des domaines et un service de
 * reputation, jamais le site lui-meme.
 *
 * La question posee par l'utilisateur est « ce site est-il authentique ? ».
 * Trois reponses sont possibles, et l'absence de reponse en est une :
 *
 *  - `official`  : le domaine est le domaine officiel verifie d'une organisation
 *  - `phishing`  : le domaine imite une organisation connue
 *  - `suspicious`: signaux structurels, sans imitation identifiable
 *  - `unknown`   : rien de suspect, mais rien ne permet de confirmer non plus
 *
 * Le cas `unknown` est traite avec honnetete : un domaine inconnu n'est pas un
 * domaine sur. Ne pas savoir n'est pas la meme chose que rassurer.
 */

import { lookupLegitDomain, matchBrandsIn, type Brand } from './brands';
import { score } from './scoring';
import {
  defang,
  effectiveTld,
  registrableDomain,
  secondLevelLabel,
  truncate,
} from './text';
import { SEVERITY_WEIGHT, type CategoryScore, type Finding, type SignalBreakdown } from './types';
import { analyzeUrls } from './url';

export const MAX_SITE_INPUT_LENGTH = 2048;

export type SiteVerdict = 'official' | 'unknown' | 'suspicious' | 'phishing';

export interface SiteIdentity {
  /** URL normalisee, avec schema. */
  url: string;
  host: string;
  registrable: string;
  sld: string;
  tld: string;
  /** Vrai si l'entree ne precisait aucun schema (domaine saisi seul). */
  schemeAdded: boolean;
  /** Vrai si l'URL a ete fournie en http:// au lieu de https://. */
  plainHttp: boolean;
  path: string;
}

const IPV4_RE = /^\d{1,3}(?:\.\d{1,3}){3}$/;
const SCHEME_RE = /^([a-z][a-z0-9+.-]*):\/\//i;

/**
 * Suffixes qui designent le reseau interne, dans plusieurs langues. Sans cette
 * liste, un appelant pourrait soumettre un nom d'hote d'entreprise et utiliser
 * la verification DNS comme sonde du reseau interne.
 */
const PRIVATE_HOST_RE =
  /^(?:localhost|.*\.(?:localhost|local|internal|internet|interne|intranet|corp|home|lan|test|example|invalid|onion|home\.arpa|in-addr\.arpa))$/i;

/**
 * Restaure une URL volontairement neutralisee pour l'affichage.
 * `hxxps://exemple[.]com` -> `https://exemple.com`
 */
function unDefang(value: string): string {
  return value
    .replace(/\s+/g, '')
    .replace(/\[\.\]|\(\.\)|\{\.\}|\[dot\]|\(dot\)/gi, '.')
    .replace(/\bhxxps:/gi, 'https:')
    .replace(/\bhxxp:/gi, 'http:');
}

/**
 * Vrai si l'hote designe le reseau interne ou la machine locale.
 *
 * Sans ce garde-fou, la resolution DNS optionnelle transformerait l'API en
 * outil de sondage du reseau interne (SSRF) : un appelant pourrait soumettre
 * `admin.interne` ou `192.168.1.1` et lire la reponse.
 */
export function isPrivateHost(host: string): boolean {
  const value = host.toLowerCase().replace(/\.$/, '');
  if (value.length === 0) return true;
  if (PRIVATE_HOST_RE.test(value)) return true;
  if (value === '0.0.0.0' || value === '::1' || value === '[::1]') return true;

  const ipv4 = value.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4) {
    const [a, b] = [Number(ipv4[1]), Number(ipv4[2])];
    if (a === 10) return true;
    if (a === 127) return true;
    if (a === 0) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    return false;
  }

  // IPv6 : boucle locale, lien local, unique local.
  if (value.includes(':')) {
    if (/^f[cd][0-9a-f]{2}:/i.test(value)) return true;
    if (/^fe80:/i.test(value)) return true;
    return true; // toute adresse IPv6 litterale est refusee : inutile ici
  }

  // Un hote sans point ne peut pas etre un domaine public.
  return !value.includes('.');
}

/**
 * Normalise l'entree utilisateur en une identite de site exploitable.
 * Accepte `exemple.com`, `www.exemple.com/page`, `https://exemple.com?x=1`,
 * ainsi que les formes neutralisees `hxxps://exemple[.]com`.
 */
export function normalizeSiteInput(raw: string): SiteIdentity | null {
  const cleaned = unDefang(raw.trim()).slice(0, MAX_SITE_INPUT_LENGTH);
  if (cleaned.length < 4) return null;

  const schemeMatch = cleaned.match(SCHEME_RE);
  const schemeAdded = !schemeMatch;
  if (schemeMatch && !/^https?$/i.test(schemeMatch[1])) return null;

  const candidate = schemeAdded ? `https://${cleaned}` : cleaned;

  let parsed: URL;
  try {
    parsed = new URL(candidate);
  } catch {
    return null;
  }

  const host = parsed.hostname.toLowerCase().replace(/\.$/, '');
  if (!host) return null;
  if (!host.includes('.') && !IPV4_RE.test(host)) return null;
  if (isPrivateHost(host)) return null;

  return {
    url: parsed.toString(),
    host,
    registrable: registrableDomain(host),
    sld: secondLevelLabel(host),
    tld: effectiveTld(host),
    schemeAdded,
    plainHttp: parsed.protocol === 'http:',
    path: `${parsed.pathname}${parsed.search}`,
  };
}

export interface NetworkReport {
  /** Vrai si des verifications reseau ont ete tentees. */
  attempted: boolean;
  /** Vrai si le nom de domaine se resout. null si la verification n'a pas eu lieu. */
  resolves: boolean | null;
  addresses: string[];
  registeredAt: string | null;
  domainAgeDays: number | null;
  registrar: string | null;
  /** Reputation : 'clean' | 'flagged' | 'unavailable'. */
  reputation: 'clean' | 'flagged' | 'unavailable' | null;
  reputationSource: string | null;
  threats: string[];
  errors: string[];
}

/**
 * Recommandation d'action.
 *
 * Le texte francais est produit par le moteur ; l'identifiant permet a la
 * couche de presentation d'afficher la meme recommandation dans la langue de
 * l'utilisateur (voir `src/lib/i18n`, section `siteRecs`).
 */
export interface SiteRecommendation {
  id: string;
  text: string;
}

export interface SiteCheckResult {
  query: string;
  identity: SiteIdentity | null;
  verdict: SiteVerdict;
  /** Score de risque 0-100. */
  score: number;
  confidence: number;
  summary: string;
  /** Renseigne si le domaine est le domaine officiel verifie d'une organisation. */
  officialBrand: { name: string; category: string } | null;
  /** Marques que le domaine cherche a imiter. */
  impersonatedBrands: string[];
  findings: Finding[];
  signals: SignalBreakdown;
  categories: CategoryScore[];
  recommendations: SiteRecommendation[];
  network: NetworkReport | null;
  meta: {
    engine: string;
    version: string;
    durationMs: number;
    checkedAt: string;
    active: boolean;
    /** Rappel explicite : le site lui-meme n'a jamais ete ouvert. */
    siteContacted: false;
  };
}

export const SITE_ENGINE_NAME = 'queryshield-site';
export const SITE_ENGINE_VERSION = '0.1.0';

function siteFinding(
  id: string,
  severity: Finding['severity'],
  category: Finding['category'],
  title: string,
  detail: string,
  evidence: string,
  params?: Finding['params'],
): Finding {
  return {
    id,
    category,
    severity,
    title,
    detail,
    evidence: truncate(defang(evidence), 120),
    params,
    weight: SEVERITY_WEIGHT[severity],
    sources: ['heuristique'],
  };
}

/**
 * Verifications propres a l'analyse d'un site, en complement de celles de
 * `analyzeUrls` (qui couvre deja typosquatting, homoglyphes, punycode,
 * usurpation de marque, extension detournee, etc.).
 */
function analyzeSiteIdentity(identity: SiteIdentity): {
  findings: Finding[];
  officialBrand: Brand | null;
  impersonatedBrands: string[];
} {
  const findings: Finding[] = [];
  const official = lookupLegitDomain(identity.registrable);

  // --- Domaine officiel : le seul signal positif du moteur ----------------
  if (official) {
    findings.push(
      siteFinding(
        'site-official-domain',
        'info',
        'identite',
        'Domaine officiel verifie',
        `Ce domaine est enregistre comme le domaine officiel de ${official.name}. C est une adresse de confiance : les messages et les liens qui pointent ici sont coherents.`,
        identity.host,
        { brand: official.name },
      ),
    );
    return { findings, officialBrand: official, impersonatedBrands: [] };
  }

  // --- Imitation d'une marque connue --------------------------------------
  // `analyzeUrls` produit deja `url-brand-impersonation`, mais ici la question
  // posee est differente : l'utilisateur demande explicitement « ce site
  // est-il authentique ? ». On formule donc la reponse en ces termes.
  const claimed = matchBrandsIn(identity.host);
  if (claimed.length > 0) {
    const brandNames = claimed.map((brand) => brand.name);
    findings.push(
      siteFinding(
        'site-impersonates-brand',
        'critical',
        'identite',
        'Ce site se fait passer pour une organisation connue',
        `Le domaine reprend le nom de ${brandNames.join(', ')} sans etre un de ses domaines officiels. C est la definition meme d un site d hameconnage : il imite une organisation pour recueillir des identifiants ou des paiements.`,
        identity.host,
        { brands: brandNames.join(', ') },
      ),
    );
  }

  // --- Schema non chiffre -------------------------------------------------
  if (identity.plainHttp) {
    findings.push(
      siteFinding(
        'site-insecure-scheme',
        'low',
        'lien',
        'Adresse en HTTP, sans chiffrement',
        'L adresse fournie est en `http://`. Aucun site marchand ou bancaire serieux ne fonctionne encore ainsi : la connexion n est pas chiffree et rien ne garantit l identite du serveur.',
        identity.url,
      ),
    );
  }

  return { findings, officialBrand: null, impersonatedBrands: claimed.map((brand) => brand.name) };
}

function buildSiteSummary(
  verdict: SiteVerdict,
  score: number,
  official: Brand | null,
  impersonated: string[],
  identity: SiteIdentity | null,
): string {
  const host = identity ? truncate(identity.host, 60) : 'ce domaine';

  switch (verdict) {
    case 'official':
      return `${host} est le domaine officiel de ${official?.name ?? 'cette organisation'}. Vous pouvez vous y connecter en confiance, a condition d avoir vous-meme saisi l adresse.`;

    case 'phishing':
      return `Score de risque ${score}/100 : ${host} imite ${impersonated.length > 0 ? impersonated.join(', ') : 'une organisation connue'} sans en etre le domaine officiel. Ne saisissez aucune donnee sur ce site.`;

    case 'suspicious':
      return `Score de risque ${score}/100 : ${host} presente des anomalies structurelles sans imiter d organisation identifiable. Traitez ce site comme non fiable jusqu a verification.`;

    default:
      return `Aucun signe de fraude detecte sur ${host}, mais ce domaine n appartient a aucune organisation de notre referentiel. Nous ne pouvons donc pas confirmer qu il est authentique : ne pas detecter de probleme n est pas une validation.`;
  }
}

function buildSiteRecommendations(
  verdict: SiteVerdict,
  findings: Finding[],
  official: Brand | null,
  identity: SiteIdentity | null,
): SiteRecommendation[] {
  const ids = new Set(findings.map((item) => item.id));
  const recommendations: SiteRecommendation[] = [];

  if (verdict === 'official') {
    recommendations.push({
      id: 'site-rec-type-address',
      text: 'Saisissez l adresse vous-meme dans la barre du navigateur plutot que de cliquer sur un lien recu : c est le seul moyen d etre certain d arriver sur le bon site.',
    });
    recommendations.push({
      id: 'site-rec-check-padlock',
      text: 'Verifiez que le cadenas du navigateur est present et que le nom de domaine affiche est exact, sans faute de frappe.',
    });
    return recommendations;
  }

  if (verdict === 'unknown') {
    recommendations.push({
      id: 'site-rec-unknown-org',
      text: 'Aucune organisation de notre referentiel ne correspond a ce domaine. S il se presente comme votre banque, votre operateur ou une administration, il ne s agit pas de son site officiel.',
    });
    recommendations.push({
      id: 'site-rec-use-search',
      text: 'Pour verifier un service, passez par un moteur de recherche ou par un document officiel, jamais par le lien que vous voulez controler.',
    });
    return recommendations;
  }

  recommendations.push({
    id: 'site-rec-no-credentials',
    text: 'Ne saisissez ni identifiant, ni mot de passe, ni numero de carte sur ce site.',
  });

  if (ids.has('site-impersonates-brand') || ids.has('url-brand-impersonation')) {
    recommendations.push({
      id: 'site-rec-report-brand',
      text: 'Ce site imite une organisation connue. Rendez-vous sur le site officiel en saisissant son adresse vous-meme, et signalez la tentative depuis l espace client ou le service client de l organisation imitee.',
    });
  }

  if (ids.has('url-homoglyph') || ids.has('url-punycode')) {
    recommendations.push({
      id: 'site-rec-inspect-chars',
      text: 'Le domaine utilise des caracteres visuellement trompeurs (alphabet melange ou encodage international). Copiez l adresse et collez-la dans un editeur de texte : les caracteres etrangers y apparaissent clairement.',
    });
  }

  if (ids.has('url-shortener')) {
    recommendations.push({
      id: 'site-rec-expand-shortener',
      text: 'L adresse passe par un raccourcisseur : la destination reelle est invisible avant le clic. Developpez-la avec un outil de resolution avant toute action.',
    });
  }

  if (ids.has('site-not-resolving')) {
    recommendations.push({
      id: 'site-rec-domain-gone',
      text: 'Ce nom de domaine ne se resout plus : le site a probablement ete retire apres avoir servi a une campagne. Le lien recu provient donc d un message ancien ou frauduleux.',
    });
  }

  if (ids.has('site-newly-registered')) {
    recommendations.push({
      id: 'site-rec-domain-young',
      text: 'Ce domaine a ete enregistre tres recemment. Les sites frauduleux sont montes pour quelques jours ou quelques semaines : la jeunesse du domaine est en soi un signal de mefiance.',
    });
  }

  if (ids.has('site-safe-browsing-flagged')) {
    recommendations.push({
      id: 'site-rec-safe-browsing',
      text: 'Ce site figure sur la liste des sites dangereux de Google Safe Browsing. N y accedez pas et supprimez le message qui le contenait.',
    });
  }

  if (identity) {
    recommendations.push({
      id: 'site-rec-report-authority',
      text: 'Signalez l adresse : la plateforme Pharos (internet-signalement.gouv.fr) pour les contenus frauduleux, ou Signal Spam pour les e-mails.',
    });
  }

  return recommendations;
}

export interface SiteCheckOptions {
  /** Resultat des verifications reseau, deja collecte. */
  network?: NetworkReport | null;
}

/**
 * Analyse statique d'un site. Aucune entree/sortie : utilisable hors ligne et
 * dans les tests.
 */
export function checkSiteSync(
  raw: string,
  options: SiteCheckOptions = {},
): SiteCheckResult {
  const startedAt = Date.now();
  const query = truncate(raw.trim(), 200);
  const identity = normalizeSiteInput(raw);

  if (!identity) {
    return {
      query,
      identity: null,
      verdict: 'unknown',
      score: 0,
      confidence: 0,
      summary:
        'Cette entree n est pas une adresse de site exploitable. Saisissez un nom de domaine (exemple.com) ou une adresse complete (https://exemple.com/page).',
      officialBrand: null,
      impersonatedBrands: [],
      findings: [],
      signals: { critical: 0, high: 0, medium: 0, low: 0, info: 0 },
      categories: [],
      recommendations: [
        {
          id: 'site-rec-invalid-input',
          text: 'Verifiez la forme de l adresse : un nom de domaine contient au moins un point et se termine par une extension (.fr, .com, .gouv.fr...).',
        },
      ],
      network: null,
      meta: {
        engine: SITE_ENGINE_NAME,
        version: SITE_ENGINE_VERSION,
        durationMs: Date.now() - startedAt,
        checkedAt: new Date().toISOString(),
        active: false,
        siteContacted: false,
      },
    };
  }

  const linkAnalysis = analyzeUrls([identity.url], [], identity.url);
  const siteAnalysis = analyzeSiteIdentity(identity);

  const findings: Finding[] = [...linkAnalysis.findings, ...siteAnalysis.findings];

  // --- Verifications reseau (deja collectees, jamais le site lui-meme) ----
  const network = options.network ?? null;
  if (network?.attempted) {
    if (network.resolves === false) {
      findings.push(
        siteFinding(
          'site-not-resolving',
          'medium',
          'lien',
          'Le domaine ne se resout pas',
          'La resolution DNS de ce nom de domaine echoue. Le site n existe plus, ou n a jamais ete configure pour repondre : c est frequent pour les domaines enregistres puis abandonnes apres une campagne d hameconnage.',
          identity.host,
        ),
      );
    }

    if (network.domainAgeDays !== null && network.domainAgeDays <= 30) {
      findings.push(
        siteFinding(
          'site-newly-registered',
          'high',
          'identite',
          'Domaine enregistre tres recemment',
          `Ce domaine a ete enregistre il y a ${network.domainAgeDays} jour(s)${network.registeredAt ? ` (le ${network.registeredAt.slice(0, 10)})` : ''}. Les sites d hameconnage vivent quelques jours a quelques semaines : un domaine neuf qui se presente comme une organisation etablie est presque toujours frauduleux.`,
          identity.registrable,
          {
            days: network.domainAgeDays,
            date: network.registeredAt ? network.registeredAt.slice(0, 10) : '',
          },
        ),
      );
    } else if (network.domainAgeDays !== null && network.domainAgeDays <= 180) {
      findings.push(
        siteFinding(
          'site-recently-registered',
          'medium',
          'identite',
          'Domaine recent',
          `Ce domaine a ete enregistre il y a ${network.domainAgeDays} jour(s). Ce n est pas anormal en soi, mais un domaine de moins de six mois ne peut pas avoir l anciennete d une organisation etablie.`,
          identity.registrable,
          { days: network.domainAgeDays },
        ),
      );
    }

    if (network.reputation === 'flagged') {
      findings.push(
        siteFinding(
          'site-safe-browsing-flagged',
          'critical',
          'lien',
          'Site signale comme dangereux',
          `Ce site figure sur une liste publique de sites dangereux${network.threats.length > 0 ? ` (${network.threats.join(', ')})` : ''}. Il est deja identifie comme distributeur de contenu malveillant ou comme site d hameconnage.`,
          identity.host,
          { threats: network.threats.join(', ') },
        ),
      );
    }
  }

  const official = siteAnalysis.officialBrand;

  const scoring = score(findings, {
    hasUrls: true,
    suspiciousDomainCount: linkAnalysis.suspiciousDomains.length,
    headersUsable: false,
    textLength: identity.url.length,
    llmUsed: false,
    senderUntrusted: false,
  });

  let verdict: SiteVerdict;
  if (network?.reputation === 'flagged') {
    // Un signalement de reputation prime sur le referentiel : un domaine
    // officiel peut avoir ete compromis, et un avis externe negatif est un
    // fait plus recent que notre liste.
    verdict = 'phishing';
  } else if (official) {
    verdict = 'official';
  } else if (scoring.score >= 60) {
    verdict = 'phishing';
  } else if (scoring.score >= 28) {
    verdict = 'suspicious';
  } else {
    verdict = 'unknown';
  }

  // Un domaine officiel ne doit jamais ressortir avec un score de risque.
  const finalScore = verdict === 'official' ? 0 : scoring.score;

  // Confiance : abondance de signal disponible, pas certitude du verdict.
  let confidence = official ? 0.9 : 0.4;
  if (network?.attempted) confidence += 0.15;
  if (network?.domainAgeDays !== null && network?.domainAgeDays !== undefined) confidence += 0.2;
  if (network?.reputation === 'flagged') confidence = Math.max(confidence, 0.95);
  if (verdict === 'unknown' && !network?.attempted) confidence = Math.min(confidence, 0.5);
  confidence = Math.min(0.96, Math.round(confidence * 100) / 100);

  return {
    query,
    identity,
    verdict,
    score: finalScore,
    confidence,
    summary: buildSiteSummary(
      verdict,
      finalScore,
      official,
      siteAnalysis.impersonatedBrands,
      identity,
    ),
    officialBrand: official ? { name: official.name, category: official.category } : null,
    impersonatedBrands: siteAnalysis.impersonatedBrands,
    findings: scoring.findings,
    signals: scoring.signals,
    categories: scoring.categories,
    recommendations: buildSiteRecommendations(verdict, findings, official, identity),
    network,
    meta: {
      engine: SITE_ENGINE_NAME,
      version: SITE_ENGINE_VERSION,
      durationMs: Date.now() - startedAt,
      checkedAt: new Date().toISOString(),
      active: Boolean(network?.attempted),
      siteContacted: false,
    },
  };
}
