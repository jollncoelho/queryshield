/**
 * Client du microservice d'analyse Python (phase 2).
 *
 * Le microservice ajoute une passe LLM semantique (Ollama local) et renvoie
 * des constats au meme format que le moteur heuristique. Il est strictement
 * optionnel : s'il est absent, mal configure ou trop lent, l'analyse continue
 * avec les seules heuristiques. Une panne du LLM ne doit jamais degrader le
 * service.
 */

import type { Finding, Severity } from './types';

const VALID_SEVERITIES: Severity[] = ['critical', 'high', 'medium', 'low', 'info'];

export interface RemoteEngineConfig {
  url: string;
  token?: string;
  timeoutMs: number;
}

export function remoteEngineConfig(): RemoteEngineConfig | null {
  const url = process.env.QUERYSHIELD_ENGINE_URL?.trim();
  if (!url) return null;
  return {
    url: url.replace(/\/$/, ''),
    token: process.env.QUERYSHIELD_ENGINE_TOKEN?.trim() || undefined,
    timeoutMs: Number(process.env.QUERYSHIELD_ENGINE_TIMEOUT_MS ?? 8000),
  };
}

interface RemotePayload {
  text: string;
  channel: string;
  subject?: string;
  sender?: string;
  rawHeaders?: string;
}

function isFinding(value: unknown): value is Finding {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.id === 'string' &&
    typeof candidate.title === 'string' &&
    typeof candidate.detail === 'string' &&
    typeof candidate.severity === 'string' &&
    VALID_SEVERITIES.includes(candidate.severity as Severity)
  );
}

/**
 * Interroge le microservice. Renvoie un tableau vide en cas d'echec :
 * l'appelant ne doit jamais avoir a gerer une exception ici.
 */
export async function analyzeWithRemoteEngine(
  payload: RemotePayload,
  config: RemoteEngineConfig,
): Promise<Finding[]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.timeoutMs);

  try {
    const response = await fetch(`${config.url}/analyze`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(config.token ? { authorization: `Bearer ${config.token}` } : {}),
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    if (!response.ok) return [];

    const data: unknown = await response.json();
    const list =
      typeof data === 'object' && data !== null && Array.isArray((data as { findings?: unknown }).findings)
        ? ((data as { findings: unknown[] }).findings)
        : [];

    return list.filter(isFinding).map((item) => ({
      ...item,
      category: item.category ?? 'ingenierie-sociale',
      weight: item.weight ?? 0,
      sources: ['llm'] as const,
    })) as Finding[];
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
  }
}
