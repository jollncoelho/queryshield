/**
 * Point d'entree unique de la couche de persistance.
 *
 * Le jeu de depots est cree une seule fois par processus. Il est memorise sur
 * `globalThis` et non dans une variable de module : en developpement, Next.js
 * reevalue les modules a chaque rechargement, ce qui ouvrirait une connexion
 * SQLite supplementaire a chaque fois.
 *
 * Si SQLite ne peut pas etre ouvert (systeme de fichiers en lecture seule), on
 * bascule sur le repli memoire en exposant clairement la raison. Le service
 * reste utilisable, mais l'anomalie est visible dans /api/health.
 */

import { resolve } from 'node:path';
import { createMemoryRepositories } from './memory';
import { createSqliteRepositories } from './sqlite';
import type { Repositories } from './types';

const CLEANUP_INTERVAL_MS = 10 * 60 * 1000;

interface GlobalStore {
  repositories?: Repositories;
  cleanupTimer?: NodeJS.Timeout;
}

const globalStore = globalThis as unknown as GlobalStore;

export const DEFAULT_DB_FILE = './data/queryshield.db';

function resolveDbFile(): string {
  const configured = process.env.QUERYSHIELD_DB_FILE?.trim();
  if (!configured) return resolve(process.cwd(), DEFAULT_DB_FILE);
  if (configured === ':memory:') return configured;
  return resolve(process.cwd(), configured);
}

function create(): Repositories {
  const driver = (process.env.QUERYSHIELD_DB_DRIVER ?? 'sqlite').trim().toLowerCase();

  if (driver === 'memory') {
    return createMemoryRepositories('QUERYSHIELD_DB_DRIVER=memory : aucun stockage durable.');
  }

  const file = resolveDbFile();
  try {
    const repositories = createSqliteRepositories({ file });

    // Nettoyage periodique du journal de rate limiting. `unref()` evite que ce
    // minuteur maintienne le processus en vie.
    const timer = setInterval(() => {
      const cutoff = Date.now() - 24 * 60 * 60 * 1000;
      try {
        repositories.rateLimit.cleanup(cutoff);
      } catch {
        /* un echec de nettoyage ne doit jamais interrompre le service */
      }
    }, CLEANUP_INTERVAL_MS);
    timer.unref?.();
    globalStore.cleanupTimer = timer;

    return repositories;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(
      `[queryshield/db] SQLite indisponible (${file}) : ${message}. ` +
        'Repli sur le stockage en memoire : les licences et les quotas ne survivront pas au redemarrage.',
    );
    return createMemoryRepositories(
      `SQLite indisponible (${message}). Stockage en memoire : donnees perdues au redemarrage.`,
    );
  }
}

export function getRepositories(): Repositories {
  if (!globalStore.repositories) {
    globalStore.repositories = create();
  }
  return globalStore.repositories;
}

export interface StorageStatus {
  driver: string;
  file: string | null;
  degraded: boolean;
  reason: string | null;
}

export function getStorageStatus(): StorageStatus {
  const repositories = getRepositories();
  return {
    driver: repositories.driver,
    file: repositories.driver === 'sqlite' ? resolveDbFile() : null,
    degraded: repositories.driver !== 'sqlite',
    reason: repositories.degradedReason,
  };
}

/** Ferme la connexion. Reserve aux tests et a l'arret propre du processus. */
export function closeRepositories(): void {
  if (globalStore.cleanupTimer) {
    clearInterval(globalStore.cleanupTimer);
    globalStore.cleanupTimer = undefined;
  }
  globalStore.repositories?.close();
  globalStore.repositories = undefined;
}

export type {
  LicenseRecord,
  LicenseRepository,
  LicenseStatus,
  Plan,
  QuotaRepository,
  RateLimitRepository,
  Repositories,
  UsageEventRecord,
  UsageRepository,
} from './types';
