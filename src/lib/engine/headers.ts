/**
 * Analyse des en-tetes bruts d'un e-mail.
 *
 * C'est la partie la plus fiable du moteur : SPF, DKIM et DMARC sont des
 * mecanismes d'authentification verifiables. Un echec DMARC sur un message
 * qui se reclame d'une banque est un signal quasi certain.
 *
 * Entree : le texte brut des en-tetes (collé depuis « Afficher l'original »).
 */

import { lookupLegitDomain, matchBrandsIn } from './brands';
import { registrableDomain, truncate } from './text';
import { SEVERITY_WEIGHT, type Finding } from './types';

export interface ParsedHeaders {
  from?: string;
  fromAddress?: string;
  fromDomain?: string;
  fromDisplayName?: string;
  replyTo?: string;
  replyToDomain?: string;
  returnPath?: string;
  returnPathDomain?: string;
  messageId?: string;
  messageIdDomain?: string;
  receivedCount: number;
  dkimSignaturePresent: boolean;
  authenticationResults: string[];
  receivedSpf: string[];
  subject?: string;
  auth: { spf?: string; dkim?: string; dmarc?: string };
}

export interface HeaderAnalysis {
  findings: Finding[];
  parsed: ParsedHeaders;
  /** Vrai si des en-tetes exploitables ont ete fournis. */
  usable: boolean;
}

const FREE_MAILBOXES = new Set([
  'gmail.com', 'googlemail.com', 'outlook.com', 'outlook.fr', 'hotmail.com', 'hotmail.fr',
  'live.com', 'live.fr', 'msn.com', 'yahoo.com', 'yahoo.fr', 'free.fr', 'orange.fr',
  'sfr.fr', 'laposte.net', 'wanadoo.fr', 'protonmail.com', 'proton.me', 'gmx.com',
  'gmx.fr', 'aol.com', 'icloud.com', 'me.com', 'yandex.com', 'mail.ru', 'zoho.com',
  'tutanota.com', 'tuta.io', 'web.de', 'bluewin.ch',
]);

/** Replie les en-tetes sur plusieurs lignes (continuation par espace/tabulation). */
export function unfoldHeaders(raw: string): string[] {
  const lines = raw.replace(/\r\n/g, '\n').split('\n');
  const unfolded: string[] = [];
  for (const line of lines) {
    if (/^[ \t]/.test(line) && unfolded.length > 0) {
      unfolded[unfolded.length - 1] += ` ${line.trim()}`;
    } else if (line.trim().length > 0) {
      unfolded.push(line);
    }
  }
  return unfolded;
}

function domainOf(address: string | undefined): string | undefined {
  if (!address) return undefined;
  const match = /@([^\s>;,]+)/.exec(address);
  if (!match) return undefined;
  return registrableDomain(match[1].toLowerCase().replace(/[.>;,]+$/, ''));
}

function addressOf(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const match = /<([^>]+)>/.exec(value);
  const candidate = match ? match[1] : value;
  return candidate.trim().toLowerCase() || undefined;
}

function displayNameOf(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const match = /^\s*"?([^"<]*?)"?\s*</.exec(value);
  const name = (match ? match[1] : '').trim();
  return name.length > 0 ? name : undefined;
}

function firstAuthResult(authResults: string[], key: string): string | undefined {
  for (const line of authResults) {
    const match = new RegExp(`${key}\\s*=\\s*([a-z]+)`, 'i').exec(line);
    if (match) return match[1].toLowerCase();
  }
  return undefined;
}

export function parseHeaders(raw: string): ParsedHeaders {
  const map = new Map<string, string[]>();
  for (const line of unfoldHeaders(raw)) {
    const separator = line.indexOf(':');
    if (separator <= 0) continue;
    const name = line.slice(0, separator).trim().toLowerCase();
    const value = line.slice(separator + 1).trim();
    const existing = map.get(name);
    if (existing) existing.push(value);
    else map.set(name, [value]);
  }

  const first = (name: string): string | undefined => map.get(name)?.[0];
  const all = (name: string): string[] => map.get(name) ?? [];

  const from = first('from');
  const replyTo = first('reply-to');
  const returnPath = first('return-path');
  const messageId = first('message-id');
  const authenticationResults = [
    ...all('authentication-results'),
    ...all('arc-authentication-results'),
  ];
  const receivedSpf = all('received-spf');

  const messageIdValue = messageId ? /<([^>]+)>/.exec(messageId)?.[1] ?? messageId : undefined;
  const messageIdDomain = messageIdValue
    ? registrableDomain(messageIdValue.split('@').pop() ?? '')
    : undefined;

  return {
    from,
    fromAddress: addressOf(from),
    fromDomain: domainOf(from),
    fromDisplayName: displayNameOf(from),
    replyTo,
    replyToDomain: domainOf(replyTo),
    returnPath,
    returnPathDomain: domainOf(returnPath),
    messageId,
    messageIdDomain: messageIdDomain && messageIdDomain.length > 3 ? messageIdDomain : undefined,
    receivedCount: all('received').length,
    dkimSignaturePresent: map.has('dkim-signature'),
    authenticationResults,
    receivedSpf,
    subject: first('subject'),
    auth: {
      spf: firstAuthResult(authenticationResults, 'spf'),
      dkim: firstAuthResult(authenticationResults, 'dkim'),
      dmarc: firstAuthResult(authenticationResults, 'dmarc'),
    },
  };
}

function finding(
  id: string,
  severity: Finding['severity'],
  title: string,
  detail: string,
  evidence?: string,
): Finding {
  return {
    id,
    category: 'entetes-email',
    severity,
    title,
    detail,
    evidence,
    weight: SEVERITY_WEIGHT[severity],
    sources: ['heuristique'],
  };
}

export function analyzeHeaders(rawHeaders: string | undefined): HeaderAnalysis {
  const empty: ParsedHeaders = {
    receivedCount: 0,
    dkimSignaturePresent: false,
    authenticationResults: [],
    receivedSpf: [],
    auth: {},
  };

  if (!rawHeaders || rawHeaders.trim().length < 12) {
    return { findings: [], parsed: empty, usable: false };
  }

  const parsed = parseHeaders(rawHeaders);
  const findings: Finding[] = [];
  const looksLikeHeaders = Boolean(parsed.from || parsed.fromDomain || parsed.receivedCount > 0);

  if (!looksLikeHeaders) {
    return { findings: [], parsed, usable: false };
  }

  const { auth } = parsed;

  // --- Resultats d'authentification ---------------------------------------
  if (auth.dmarc === 'fail') {
    findings.push(
      finding(
        'hdr-dmarc-fail',
        'critical',
        'Echec DMARC',
        'Le domaine expeditieur a echoue au controle DMARC. Cela signifie que l expediteur n est pas autorise a envoyer au nom de ce domaine : le nom affiche est tres probablement usurpe.',
        `dmarc=fail`,
      ),
    );
  }
  if (auth.spf === 'fail') {
    findings.push(
      finding(
        'hdr-spf-fail',
        'high',
        'Echec SPF',
        'Le serveur d envoi n est pas autorise par le domaine expeditieur (SPF en echec). Le message a ete envoye depuis une infrastructure tierce.',
        `spf=fail`,
      ),
    );
  }
  if (auth.spf === 'softfail') {
    findings.push(
      finding(
        'hdr-spf-softfail',
        'medium',
        'SPF en softfail',
        'Le domaine expeditieur signale que le serveur d envoi n est pas pleinement autorise. Signal d alerte a confirmer avec les autres controles.',
        `spf=softfail`,
      ),
    );
  }
  if (auth.dkim === 'fail') {
    findings.push(
      finding(
        'hdr-dkim-fail',
        'high',
        'Echec DKIM',
        'La signature cryptographique du message ne correspond pas. Le contenu a pu etre modifie en transit, ou le message a ete forge.',
        `dkim=fail`,
      ),
    );
  }

  const authPass = auth.spf === 'pass' && auth.dkim === 'pass' && auth.dmarc === 'pass';
  if (authPass) {
    findings.push(
      finding(
        'hdr-auth-pass',
        'info',
        'Authentification du domaine conforme',
        'SPF, DKIM et DMARC sont tous validés. Le message provient bien du domaine annonce. Attention : cela prouve l origine du domaine, pas l honnetete de son contenu.',
        'spf=pass dkim=pass dmarc=pass',
      ),
    );
  }

  if (!parsed.dkimSignaturePresent && parsed.authenticationResults.length === 0) {
    findings.push(
      finding(
        'hdr-no-dkim',
        'medium',
        'Aucune signature DKIM',
        'Le message n est pas signe cryptographiquement. Un e-mail professionnel ou bancaire est presque toujours signe.',
        'En-tete DKIM-Signature absent',
      ),
    );
  }

  if (parsed.authenticationResults.length === 0 && parsed.receivedSpf.length === 0) {
    findings.push(
      finding(
        'hdr-no-auth-results',
        'low',
        'Aucun resultat d authentification',
        'Aucun en-tete Authentication-Results ou Received-SPF n a ete fourni. L authenticite du domaine ne peut donc pas etre verifiee : le verdict repose uniquement sur le contenu.',
        'En-tetes d authentification absents',
      ),
    );
  }

  // --- Coherence des domaines ---------------------------------------------
  if (
    parsed.fromDomain &&
    parsed.replyToDomain &&
    parsed.fromDomain !== parsed.replyToDomain
  ) {
    findings.push(
      finding(
        'hdr-replyto-mismatch',
        'high',
        'Adresse de reponse differente de l expediteur',
        'Le champ Reply-To pointe vers un autre domaine que le champ From. L expediteur veut que votre reponse parte ailleurs : motif classique de la fraude au faux fournisseur.',
        `From : ${parsed.fromDomain}  ->  Reply-To : ${parsed.replyToDomain}`,
      ),
    );
  }

  if (
    parsed.fromDomain &&
    parsed.returnPathDomain &&
    parsed.fromDomain !== parsed.returnPathDomain
  ) {
    findings.push(
      finding(
        'hdr-returnpath-mismatch',
        'medium',
        'Domaine de retour different',
        'Le Return-Path ne correspond pas au domaine du champ From, ce qui indique un envoi via un service tiers ou une infrastructure de masse.',
        `From : ${parsed.fromDomain}  ->  Return-Path : ${parsed.returnPathDomain}`,
      ),
    );
  }

  if (
    parsed.fromDomain &&
    parsed.messageIdDomain &&
    parsed.fromDomain !== parsed.messageIdDomain
  ) {
    findings.push(
      finding(
        'hdr-messageid-mismatch',
        'low',
        'Identifiant de message incoherent',
        'Le domaine du Message-ID differe du domaine expeditieur. Signal faible, souvent present sur les envois via une plateforme externe.',
        `From : ${parsed.fromDomain}  ->  Message-ID : ${parsed.messageIdDomain}`,
      ),
    );
  }

  // --- Nom affiche trompeur ------------------------------------------------
  const displayName = parsed.fromDisplayName;
  if (displayName && parsed.fromDomain) {
    const legitBrand = lookupLegitDomain(parsed.fromDomain);
    const claimedBrands = matchBrandsIn(displayName);

    // Le nom affiche revendique une marque qui n'est pas celle du domaine
    // d'envoi. La comparaison porte sur des cles de marque normalisees, ce qui
    // evite de confondre « Credit Agricole » et « Credit Mutuel ».
    const mismatched = claimedBrands.filter(
      (brand) => !legitBrand || brand.name !== legitBrand.name,
    );

    if (claimedBrands.length > 0 && mismatched.length > 0) {
      findings.push(
        finding(
          'hdr-displayname-brand-mismatch',
          'high',
          'Nom affiche usurpant une marque',
          `L expediteur se presente comme « ${claimedBrands.map((brand) => brand.name).join(', ')} » alors que le domaine reel d envoi est ${parsed.fromDomain}. Le nom affiche est libre : seul le domaine compte.`,
          `${truncate(displayName, 60)} <${parsed.fromAddress ?? '?'}>`,
        ),
      );
    }

    if (FREE_MAILBOXES.has(parsed.fromDomain)) {
      findings.push(
        finding(
          'hdr-free-mailbox',
          'medium',
          'Expediteur sur une messagerie grand public',
          `Le message provient d une boite grand public (${parsed.fromDomain}). Une banque, une administration ou un grand site marchand n ecrit jamais depuis une adresse personnelle.`,
          `${truncate(displayName, 60)} <${parsed.fromAddress ?? '?'}>`,
        ),
      );
    }

    if (/@/.test(displayName)) {
      findings.push(
        finding(
          'hdr-displayname-contains-address',
          'medium',
          'Adresse e-mail dans le nom affiche',
          'Le nom affiche contient une adresse e-mail. Cette mise en forme sert a faire croire que l adresse visible est celle de l expediteur.',
          truncate(displayName, 70),
        ),
      );
    }
  }

  // --- Chaine de transport -------------------------------------------------
  if (parsed.receivedCount > 8) {
    findings.push(
      finding(
        'hdr-long-received-chain',
        'low',
        'Chaine de transport anormalement longue',
        'Le message a traverse de nombreux serveurs. Un relais excessif accompagne souvent les envois automatises ou anonymises.',
        `${parsed.receivedCount} en-tetes Received`,
      ),
    );
  }

  return { findings, parsed, usable: true };
}
