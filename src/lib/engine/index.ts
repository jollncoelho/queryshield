/**
 * QueryShield - orchestrateur du moteur d'analyse.
 *
 * Point d'entree unique, utilise par la route API et par les tests.
 *
 * Garanties de confidentialite appliquees ici :
 *  - aucune ecriture sur disque, aucune base de donnees, aucune journalisation
 *    du contenu ;
 *  - aucune requete vers les liens contenus dans le message analyse ;
 *  - le texte est tronque a MAX_INPUT_LENGTH avant traitement ;
 *  - le microservice LLM est optionnel et ne recoit jamais les en-tetes bruts.
 */

import { extract } from './extract';
import { analyzeHeaders } from './headers';
import { analyzeWithRemoteEngine, remoteEngineConfig } from './remote';
import { analyzeSenderDomain, extractSenderFromText, type SenderSignals } from './sender';
import { analyzeSocial } from './social';
import { analyzeUrls } from './url';
import { buildResult, score } from './scoring';
import { emptyIocs, type AnalyzeInput, type AnalyzeResult, type Channel, type Finding } from './types';

export const ENGINE_NAME = 'queryshield-heuristic';
export const ENGINE_VERSION = '0.1.0';
export const MAX_INPUT_LENGTH = 20000;

const VALID_CHANNELS: Channel[] = ['email', 'sms', 'messaging', 'unknown'];

function normaliseChannel(channel: Channel | undefined): Channel {
  return channel && VALID_CHANNELS.includes(channel) ? channel : 'unknown';
}

/**
 * Determine l'expediteur a analyser, et a partir de quelle source.
 *
 * Deux sources, dans l'ordre de fiabilite :
 *  1. le champ dedie `sender` (interface ou appel direct de l'API) ;
 *  2. l'en-tete visible colle avec le message (« De : ... », « From: ... »).
 *
 * La seconde source est essentielle. La plupart des utilisateurs collent
 * simplement l'e-mail recu, sans savoir extraire les en-tetes bruts : sans
 * cette lecture, aucun controle d'expediteur n'avait lieu et un message
 * frauduleux pouvait obtenir un score nul. C'etait la cause principale du
 * faux negatif constate sur le terrain.
 */
function resolveSender(input: AnalyzeInput, text: string): SenderSignals | null {
  const explicit = input.sender?.trim();
  if (explicit) return analyzeSenderDomain(explicit, { origin: 'champ dedie' });

  const pasted = extractSenderFromText(text);
  if (pasted) return analyzeSenderDomain(pasted, { origin: 'corps du message' });

  return null;
}

/**
 * Vrai si un expediteur a ete identifie et que son domaine n'est pas un
 * domaine officiel du referentiel. C'est cette information qui autorise la
 * regle de combinaison « appat + expediteur non officiel ».
 */
function senderIsUntrusted(sender: SenderSignals | null): boolean {
  if (!sender || !sender.parsed.domain) return false;
  return !sender.trusted;
}

export interface AnalyzeOptions {
  /** Desactive l'appel au microservice LLM (tests, mode degrade). */
  skipRemote?: boolean;
}

/** Version synchrone : heuristiques uniquement. Utilisee par les tests. */
export function analyzeSync(input: AnalyzeInput): AnalyzeResult {
  const startedAt = Date.now();
  const text = (input.text ?? '').slice(0, MAX_INPUT_LENGTH);
  const channel = normaliseChannel(input.channel);
  const headers = analyzeHeaders(input.rawHeaders);
  // Les en-tetes bruts couvrent deja l'expediteur (SPF/DKIM/DMARC + From).
  // Le controle complementaire ne s'execute donc que lorsque l'utilisateur
  // n'a fourni que le texte : c'est le cas le plus frequent.
  const sender = headers.usable ? null : resolveSender(input, text);

  const extracted = extract(text);
  const linkAnalysis = analyzeUrls(extracted.urls, extracted.anchors, text);
  const social = analyzeSocial(text, channel, extracted.urls.length > 0, input.subject, {
    senderTrusted: sender?.trusted ?? false,
  });

  const findings: Finding[] = [
    ...linkAnalysis.findings,
    ...social.findings,
    ...headers.findings,
    ...(sender?.findings ?? []),
  ];

  const scoring = score(findings, {
    hasUrls: extracted.urls.length > 0,
    suspiciousDomainCount: linkAnalysis.suspiciousDomains.length,
    headersUsable: headers.usable,
    textLength: text.length,
    llmUsed: false,
    senderUntrusted: senderIsUntrusted(sender),
  });

  return buildResult(
    scoring,
    extracted.iocs.urls.length > 0 ? extracted.iocs : emptyIocs(),
    {
      engine: ENGINE_NAME,
      version: ENGINE_VERSION,
      durationMs: Date.now() - startedAt,
      analyzedAt: new Date().toISOString(),
      textLength: text.length,
      channel,
      headersProvided: headers.usable,
      llmUsed: false,
    },
  );
}

/** Version complete : heuristiques + microservice LLM optionnel. */
export async function analyze(
  input: AnalyzeInput,
  options: AnalyzeOptions = {},
): Promise<AnalyzeResult> {
  const startedAt = Date.now();
  const text = (input.text ?? '').slice(0, MAX_INPUT_LENGTH);
  const channel = normaliseChannel(input.channel);
  const headers = analyzeHeaders(input.rawHeaders);
  const sender = headers.usable ? null : resolveSender(input, text);

  const extracted = extract(text);
  const linkAnalysis = analyzeUrls(extracted.urls, extracted.anchors, text);
  const social = analyzeSocial(text, channel, extracted.urls.length > 0, input.subject, {
    senderTrusted: sender?.trusted ?? false,
  });

  let llmFindings: Finding[] = [];
  let llmUsed = false;

  const config = remoteEngineConfig();
  if (config && !options.skipRemote && text.trim().length > 0) {
    llmFindings = await analyzeWithRemoteEngine(
      {
        text,
        channel,
        subject: input.subject,
        sender: input.sender,
        rawHeaders: input.rawHeaders,
      },
      config,
    );
    llmUsed = llmFindings.length > 0;
  }

  const findings: Finding[] = [
    ...linkAnalysis.findings,
    ...social.findings,
    ...headers.findings,
    ...(sender?.findings ?? []),
    ...llmFindings,
  ];

  const scoring = score(findings, {
    hasUrls: extracted.urls.length > 0,
    suspiciousDomainCount: linkAnalysis.suspiciousDomains.length,
    headersUsable: headers.usable,
    textLength: text.length,
    llmUsed,
    senderUntrusted: senderIsUntrusted(sender),
  });

  return buildResult(scoring, extracted.iocs, {
    engine: llmUsed ? `${ENGINE_NAME}+llm` : ENGINE_NAME,
    version: ENGINE_VERSION,
    durationMs: Date.now() - startedAt,
    analyzedAt: new Date().toISOString(),
    textLength: text.length,
    channel,
    headersProvided: headers.usable,
    llmUsed,
  });
}

export type { AnalyzeInput, AnalyzeResult, Channel, Finding } from './types';
export { defang } from './text';
export { analyzeSenderDomain, extractSenderFromText, parseSender, FREE_MAILBOXES } from './sender';
export {
  assessDomainRandomness,
  detectInstitutionalMimicry,
  detectTldAsLabel,
  lureTokensInHost,
  shannonEntropy,
} from './domain-reputation';
