/**
 * Implementation en memoire — repli degrade.
 *
 * Ce n'est PAS un mode de production : les donnees disparaissent au
 * redemarrage et chaque instance a sa propre copie. Il existe pour deux raisons :
 *
 *  1. le service ne doit pas tomber si aucun stockage durable n'est disponible
 *     (systeme de fichiers en lecture seule, par exemple en serverless) ;
 *  2. les tests unitaires ont besoin d'un socle jetable.
 *
 * Quand ce mode est actif, `degradedReason` est renseigne et /api/health
 * l'expose : l'anomalie doit etre visible, jamais silencieuse.
 */

import type {
  LicenseRecord,
  LicenseRepository,
  Plan,
  QuotaConsumeResult,
  QuotaRepository,
  RateLimitRepository,
  Repositories,
  UsageEventRecord,
  UsageRepository,
} from './types';

export function createMemoryRepositories(degradedReason: string | null = null): Repositories {
  const licenseTable = new Map<string, LicenseRecord>();
  const quotaTable = new Map<string, number>();
  const rateTable = new Map<string, number[]>();
  const usageEvents: UsageEventRecord[] = [];

  const quotaKey = (clientId: string, day: string) => `${clientId}\u0000${day}`;

  const licenses: LicenseRepository = {
    create(record) {
      if (licenseTable.has(record.key)) {
        throw new Error(`licence deja existante : ${record.key}`);
      }
      licenseTable.set(record.key, { ...record });
    },
    findByKey(key) {
      const found = licenseTable.get(key);
      return found ? { ...found } : undefined;
    },
    findBySubscriptionId(subscriptionId) {
      for (const record of licenseTable.values()) {
        if (record.stripeSubscriptionId === subscriptionId) return { ...record };
      }
      return undefined;
    },
    listByClient(clientId) {
      return Array.from(licenseTable.values())
        .filter((record) => record.clientId === clientId)
        .sort((a, b) => b.createdAt - a.createdAt)
        .map((record) => ({ ...record }));
    },
    listAll(limit = 200) {
      return Array.from(licenseTable.values())
        .sort((a, b) => b.createdAt - a.createdAt)
        .slice(0, limit)
        .map((record) => ({ ...record }));
    },
    update(key, patch) {
      const existing = licenseTable.get(key);
      if (!existing) return false;
      licenseTable.set(key, { ...existing, ...patch, key, updatedAt: Date.now() });
      return true;
    },
  };

  const quota: QuotaRepository = {
    consume(clientId, day, limit): QuotaConsumeResult {
      if (limit <= 0) return { used: 0, limit, allowed: false };
      const key = quotaKey(clientId, day);
      const used = quotaTable.get(key) ?? 0;
      if (used >= limit) return { used, limit, allowed: false };
      const next = used + 1;
      quotaTable.set(key, next);
      return { used: next, limit, allowed: true };
    },
    peek(clientId, day) {
      return quotaTable.get(quotaKey(clientId, day)) ?? 0;
    },
    reset(clientId, day) {
      quotaTable.delete(quotaKey(clientId, day));
    },
  };

  const rateLimit: RateLimitRepository = {
    hit(bucket, now, windowMs) {
      const hits = rateTable.get(bucket) ?? [];
      hits.push(now);
      const threshold = now - windowMs;
      const kept = hits.filter((ts) => ts > threshold);
      rateTable.set(bucket, kept);
      return kept.length;
    },
    count(bucket, now, windowMs) {
      const hits = rateTable.get(bucket) ?? [];
      const threshold = now - windowMs;
      return hits.filter((ts) => ts > threshold).length;
    },
    oldest(bucket, now, windowMs) {
      const hits = rateTable.get(bucket) ?? [];
      const threshold = now - windowMs;
      const inWindow = hits.filter((ts) => ts > threshold);
      return inWindow.length === 0 ? null : Math.min(...inWindow);
    },
    cleanup(before) {
      let removed = 0;
      for (const [bucket, hits] of rateTable.entries()) {
        const kept = hits.filter((ts) => ts > before);
        removed += hits.length - kept.length;
        if (kept.length === 0) rateTable.delete(bucket);
        else rateTable.set(bucket, kept);
      }
      return removed;
    },
  };

  const usage: UsageRepository = {
    record(event) {
      usageEvents.push({ ...event });
      // Borne memoire : on ne garde que les 10 000 derniers evenements.
      if (usageEvents.length > 10000) usageEvents.splice(0, usageEvents.length - 10000);
    },
    countSince(ts) {
      return usageEvents.filter((event) => event.ts > ts).length;
    },
    verdictBreakdown(ts) {
      const counts = new Map<string, number>();
      for (const event of usageEvents) {
        if (event.ts <= ts) continue;
        counts.set(event.verdict, (counts.get(event.verdict) ?? 0) + 1);
      }
      return Array.from(counts.entries())
        .map(([verdict, total]) => ({ verdict, total }))
        .sort((a, b) => b.total - a.total);
    },
  };

  return {
    driver: 'memory',
    degradedReason,
    licenses,
    quota,
    rateLimit,
    usage,
    close() {
      licenseTable.clear();
      quotaTable.clear();
      rateTable.clear();
      usageEvents.length = 0;
    },
  };
}

export type { Plan };
