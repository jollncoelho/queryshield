/**
 * Analyse de l'adresse de l'expediteur.
 *
 * POURQUOI CE MODULE EXISTE.
 *
 * L'analyse SPF/DKIM/DMARC exige les en-tetes bruts, que la plupart des
 * utilisateurs ne savent pas extraire. Resultat : l'expediteur n'etait analyse
 * que dans le cas favorable. C'etait le principal trou du moteur — un message
 * sans lien visible pouvait obtenir un score nul alors que son expediteur etait
 * manifestement frauduleux.
 *
 * Ce module couvre le cas courant : on dispose seulement du nom et de l'adresse
 * affiches. C'est peu, mais c'est deja beaucoup :
 *
 *  - un domaine genere automatiquement se reconnait a sa structure ;
 *  - une institution usurpee se reconnait a un mot deforme ;
 *  - une extension connue utilisee comme sous-domaine trahit un montage ;
 *  - un domaine officiel connu permet au contraire de blanchir le message.
 */

import { lookupLegitDomain, matchBrandsIn } from './brands';
import {
  LURE_DOMAIN_TOKENS,
  RANDOMNESS_HIGH,
  RANDOMNESS_MEDIUM,
  RANDOMNESS_MIN_LENGTH,
  assessDomainRandomness,
  detectInstitutionalMimicry,
  detectTldAsLabel,
  lureTokensInHost,
} from './domain-reputation';
import { registrableDomain, secondLevelLabel, truncate } from './text';
import { SEVERITY_WEIGHT, type Finding } from './types';

/** Messageries grand public : une organisation n'ecrit jamais depuis celles-ci. */
export const FREE_MAILBOXES = new Set([
  'gmail.com', 'googlemail.com', 'outlook.com', 'outlook.fr', 'hotmail.com', 'hotmail.fr',
  'live.com', 'live.fr', 'msn.com', 'yahoo.com', 'yahoo.fr', 'free.fr', 'orange.fr',
  'sfr.fr', 'laposte.net', 'wanadoo.fr', 'protonmail.com', 'proton.me', 'gmx.com',
  'gmx.fr', 'aol.com', 'icloud.com', 'me.com', 'yandex.com', 'mail.ru', 'zoho.com',
  'tutanota.com', 'tuta.io', 'web.de', 'bluewin.ch', 'mail.com', 'inbox.com',
  '163.com', 'qq.com', 'naver.com', 'daum.net',
]);

export interface ParsedSender {
  address: string | null;
  /** Domaine enregistrable, ou null si l'adresse est illisible. */
  domain: string | null;
  displayName: string | null;
}

const EMAIL_RE = /[\p{L}0-9._%+-]+@[\p{L}0-9.-]+\.[\p{L}]{2,24}/u;

/** Analyse une valeur de type « Nom affiche <adresse@domaine.tld> » ou « adresse@domaine.tld ». */
export function parseSender(raw: string): ParsedSender {
  const value = raw.trim();
  if (value.length === 0) return { address: null, domain: null, displayName: null };

  const addressMatch = EMAIL_RE.exec(value);
  const address = addressMatch ? addressMatch[0].toLowerCase() : null;

  const displayMatch = /^\s*"?([^"<]*?)"?\s*</.exec(value);
  const displayName = displayMatch && displayMatch[1].trim().length > 0 ? displayMatch[1].trim() : null;

  let domain: string | null = null;
  if (address) {
    const host = address.split('@').pop() ?? '';
    const normalised = host.replace(/[.>;,]+$/, '');
    if (normalised.includes('.') && !normalised.startsWith('.') && !normalised.endsWith('.')) {
      domain = registrableDomain(normalised);
    }
  }

  return { address, domain, displayName };
}

/**
 * Cherche un expediteur dans le corps du message.
 *
 * On se limite aux lignes explicitement introduites par « De : », « From: » ou
 * « Repondre a : ». Deviner a partir de la premiere adresse rencontree serait
 * dangereux : ce serait souvent celle du destinataire.
 */
export function extractSenderFromText(text: string): string | null {
  const patterns = [
    /(?:^|\n)\s*(?:de|from)\s*:\s*([^\n]{5,160})/i,
    /(?:^|\n)\s*(?:r[ée]pondre [àa]|reply[- ]to)\s*:\s*([^\n]{5,160})/i,
  ];
  for (const pattern of patterns) {
    const match = pattern.exec(text);
    if (!match) continue;
    if (EMAIL_RE.test(match[1])) return match[1].trim();
  }
  return null;
}

export interface SenderSignals {
  parsed: ParsedSender;
  /** Marque officielle dont le domaine releve, si c'est le cas. */
  officialBrand: string | null;
  /** Vrai si l'expediteur est le domaine officiel d'une marque du referentiel. */
  trusted: boolean;
  findings: Finding[];
}

export interface AnalyzeSenderOptions {
  /** Origine de l'adresse, reprise dans le texte des constats. */
  origin: 'champ dedie' | 'en-tete brut' | 'corps du message';
}

function finding(
  id: string,
  severity: Finding['severity'],
  category: Finding['category'],
  title: string,
  detail: string,
  evidence: string,
): Finding {
  return {
    id,
    category,
    severity,
    title,
    detail,
    evidence: truncate(evidence, 120),
    weight: SEVERITY_WEIGHT[severity],
    sources: ['heuristique'],
  };
}

/**
 * Examine la structure du domaine de l'expediteur.
 *
 * Renvoie aussi `trusted` : c'est ce drapeau qui autorise les regles de
 * promotion a retomber en severite faible quand l'expediteur est bien le
 * domaine officiel d'une marque connue.
 */
export function analyzeSenderDomain(
  raw: string,
  options: AnalyzeSenderOptions,
): SenderSignals {
  const parsed = parseSender(raw);
  const findings: Finding[] = [];

  if (!parsed.domain) {
    return { parsed, officialBrand: null, trusted: false, findings };
  }

  const host = (parsed.address ?? '').split('@').pop() ?? parsed.domain;
  const legit = lookupLegitDomain(parsed.domain);
  const isFreeMailbox = FREE_MAILBOXES.has(parsed.domain);

  // Point cle : plusieurs messageries grand public (gmail.com, outlook.com,
  // live.com, free.fr...) figurent aussi au referentiel de marques, car les
  // marques concernees en sont proprietaires. Sans cette exclusion, une
  // adresse `xxx@gmail.com` serait consideree comme un expediteur officiel
  // « Google » : elle serait blanchie, et surtout elle desactiverait la
  // severite des regles d'appat (drapeau `senderTrusted`). C'etait un facteur
  // direct du faux negatif constate.
  const officialBrand = legit && !isFreeMailbox ? legit.name : null;
  const trusted = Boolean(legit) && !isFreeMailbox;

  // --- Domaine officiel : signal positif, on s'arrete la -------------------
  if (trusted) {
    return { parsed, officialBrand, trusted, findings };
  }

  const sld = secondLevelLabel(host);

  // --- 1. Domaine genere automatiquement ----------------------------------
  if (sld.length >= RANDOMNESS_MIN_LENGTH) {
    const assessment = assessDomainRandomness(sld);
    if (assessment.score >= RANDOMNESS_HIGH) {
      findings.push(
        finding(
          'sender-random-domain',
          'high',
          'identite',
          'Domaine expediteur genere automatiquement',
          `Le domaine de l expediteur (${parsed.domain}) ne ressemble a aucun nom lisible : ${assessment.signals.join(', ')}. Les campagnes de fraude enregistrent des domaines par lots, souvent produits aleatoirement, puis les abandonnent apres quelques jours.`,
          `${parsed.address ?? host}`,
        ),
      );
    } else if (assessment.score >= RANDOMNESS_MEDIUM) {
      findings.push(
        finding(
          'sender-random-domain-weak',
          'medium',
          'identite',
          'Domaine expediteur atypique',
          `La structure du domaine expediteur est inhabituelle : ${assessment.signals.join(', ')}. Signal a confirmer par les autres controles.`,
          `${parsed.address ?? host}`,
        ),
      );
    }
  }

  // --- 2. Usurpation institutionnelle -------------------------------------
  const mimicry = detectInstitutionalMimicry(host);
  if (mimicry) {
    findings.push(
      finding(
        'sender-institutional-mimicry',
        'high',
        'identite',
        'Domaine imitant une institution',
        `Le domaine de l expediteur reprend le vocabulaire d une institution publique (« ${mimicry.word} », dans l etiquette « ${mimicry.label} ») sans en etre un domaine officiel. Une administration ecrit depuis un domaine en .gouv.fr ou .gov : jamais depuis un domaine commercial.`,
        `${parsed.address ?? host}`,
      ),
    );
  }

  // --- 3. Extension connue utilisee comme sous-domaine --------------------
  const tldAsLabel = detectTldAsLabel(host);
  if (tldAsLabel) {
    findings.push(
      finding(
        'sender-tld-as-label',
        'high',
        'identite',
        'Extension detournee en sous-domaine',
        `Le domaine de l expediteur contient « .${tldAsLabel} » a une position qui n est pas l extension finale. Le domaine reellement enregistre est ${parsed.domain}, mais l oeil s arrete sur la partie qui precede. Montage typique pour faire croire a une adresse officielle.`,
        `${parsed.address ?? host}`,
      ),
    );
  }

  // --- 4. Termes d'appat dans le domaine ----------------------------------
  const lureTokens = lureTokensInHost(host);
  if (lureTokens.length > 0) {
    findings.push(
      finding(
        'sender-lure-domain',
        'medium',
        'identite',
        'Termes d appat dans le domaine expediteur',
        `Le domaine de l expediteur contient ${lureTokens.map((token) => `« ${token} »`).join(', ')}. Un domaine choisi pour contenir un argument commercial est presque toujours un domaine d envoi de masse, enregistre pour l occasion.`,
        `${parsed.address ?? host}`,
      ),
    );
  }

  // --- 5. Marque reprise sans etre le domaine officiel --------------------
  // Les boites grand public sont exclues : le domaine appartient bien a la
  // marque (gmail.com -> Google), mais l'utiliser n'est pas une usurpation.
  const claimed = isFreeMailbox ? [] : matchBrandsIn(host);
  if (claimed.length > 0) {
    findings.push(
      finding(
        'sender-brand-impersonation',
        'high',
        'identite',
        'Expediteur usurpant une marque',
        `Le domaine de l expediteur reprend le nom de ${claimed.map((brand) => brand.name).join(', ')} sans etre un domaine officiel de cette marque. Le nom affiche et l adresse peuvent sembler justes : seul le domaine enregistre compte.`,
        `${parsed.address ?? host}`,
      ),
    );
  }

  // --- 6. Messagerie grand public ----------------------------------------
  if (isFreeMailbox) {
    findings.push(
      finding(
        'sender-free-mailbox',
        'medium',
        'identite',
        'Expediteur sur une messagerie grand public',
        `L adresse provient d une boite grand public (${parsed.domain}). Une banque, une administration ou un grand site marchand n ecrit jamais depuis une adresse personnelle. Ce signal est courant dans les arnaques au faux conseiller et les fausses offres d emploi.`,
        `${parsed.displayName ? `${truncate(parsed.displayName, 40)} ` : ''}<${parsed.address ?? host}>`,
      ),
    );
  }

  // --- 7. Nom affiche trompeur -------------------------------------------
  // Le nom affiche est confronte a une marque citee, que l'adresse soit une
  // boite grand public ou non : le montage « nom affiche credible sur une
  // adresse personnelle » est justement le cas le plus frequent.
  const displayClaim = parsed.displayName ? matchBrandsIn(parsed.displayName) : [];
  const nameClaims = claimed.length > 0 ? claimed : displayClaim;
  if (parsed.displayName && nameClaims.length > 0) {
    findings.push(
      finding(
        'sender-displayname-mismatch',
        'high',
        'identite',
        'Nom affiche different de l adresse reelle',
        `L expediteur se presente comme « ${truncate(parsed.displayName, 50)} » alors que l adresse reelle est ${parsed.address}. Le nom affiche est libre : n importe qui peut y ecrire ce qu il veut.`,
        `${truncate(parsed.displayName, 50)} <${parsed.address ?? host}>`,
      ),
    );
  }

  return { parsed, officialBrand, trusted, findings };
}

/** Rappel des jetons d'appat, expose pour les tests et la documentation. */
export { LURE_DOMAIN_TOKENS };
