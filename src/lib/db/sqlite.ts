/**
 * Implementation SQLite de la couche de persistance.
 *
 * SQLite est le bon choix pour un VPS mono-instance : un seul fichier, aucune
 * infrastructure a administrer, transactions ACID, et un debit tres largement
 * suffisant pour ce type de charge. Le mode WAL permet des lectures concurrentes
 * pendant les ecritures.
 *
 * Limite a connaitre : SQLite n'est pas partageable entre plusieurs machines.
 * Si le service doit tourner sur plusieurs instances (ou en serverless), il faut
 * basculer sur Postgres ou Redis en implementant les memes interfaces.
 */

import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import Database from 'better-sqlite3';
import { MIGRATIONS } from './schema';
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

type Row = Record<string, unknown>;

function rowToLicense(row: Row): LicenseRecord {
  return {
    key: String(row.key),
    plan: String(row.plan) as Plan,
    status: String(row.status) as LicenseRecord['status'],
    clientId: (row.client_id as string | null) ?? null,
    email: (row.email as string | null) ?? null,
    stripeCustomerId: (row.stripe_customer_id as string | null) ?? null,
    stripeSubscriptionId: (row.stripe_subscription_id as string | null) ?? null,
    currentPeriodEnd: row.current_period_end === null ? null : Number(row.current_period_end),
    createdAt: Number(row.created_at),
    updatedAt: Number(row.updated_at),
    note: (row.note as string | null) ?? null,
  };
}

/** Colonnes modifiables par `update`, avec leur nom en base. */
const LICENSE_COLUMNS: Record<string, string> = {
  plan: 'plan',
  status: 'status',
  clientId: 'client_id',
  email: 'email',
  stripeCustomerId: 'stripe_customer_id',
  stripeSubscriptionId: 'stripe_subscription_id',
  currentPeriodEnd: 'current_period_end',
  note: 'note',
};

export interface SqliteRepositoriesOptions {
  file: string;
  /** Desactive les messages d'information (utilise par les tests). */
  silent?: boolean;
}

export function createSqliteRepositories(options: SqliteRepositoriesOptions): Repositories {
  const { file, silent = false } = options;

  if (file !== ':memory:') {
    mkdirSync(dirname(file), { recursive: true });
  }

  const db = new Database(file);
  db.pragma('journal_mode = WAL');
  db.pragma('synchronous = NORMAL');
  db.pragma('foreign_keys = ON');
  db.pragma('busy_timeout = 5000');

  // --- Migrations ----------------------------------------------------------
  db.exec(
    `CREATE TABLE IF NOT EXISTS schema_migrations (
       version    INTEGER PRIMARY KEY,
       applied_at INTEGER NOT NULL
     )`,
  );

  const applied = new Set(
    (db.prepare('SELECT version FROM schema_migrations').all() as Row[]).map((row) =>
      Number(row.version),
    ),
  );

  const applyMigration = db.transaction((version: number, statements: string[]) => {
    for (const statement of statements) db.exec(statement);
    db.prepare('INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)').run(
      version,
      Date.now(),
    );
  });

  let migrated = 0;
  for (const migration of MIGRATIONS) {
    if (applied.has(migration.version)) continue;
    applyMigration(migration.version, migration.statements);
    migrated += 1;
  }

  if (migrated > 0 && !silent) {
    console.info(`[queryshield/db] ${migrated} migration(s) appliquee(s) sur ${file}`);
  }

  // --- Licences ------------------------------------------------------------
  const licenses: LicenseRepository = {
    create(record) {
      db.prepare(
        `INSERT INTO licenses (
           key, plan, status, client_id, email,
           stripe_customer_id, stripe_subscription_id,
           current_period_end, created_at, updated_at, note
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ).run(
        record.key,
        record.plan,
        record.status,
        record.clientId,
        record.email,
        record.stripeCustomerId,
        record.stripeSubscriptionId,
        record.currentPeriodEnd,
        record.createdAt,
        record.updatedAt,
        record.note,
      );
    },

    findByKey(key) {
      const row = db.prepare('SELECT * FROM licenses WHERE key = ?').get(key) as Row | undefined;
      return row ? rowToLicense(row) : undefined;
    },

    findBySubscriptionId(subscriptionId) {
      const row = db
        .prepare('SELECT * FROM licenses WHERE stripe_subscription_id = ?')
        .get(subscriptionId) as Row | undefined;
      return row ? rowToLicense(row) : undefined;
    },

    listByClient(clientId) {
      const rows = db
        .prepare('SELECT * FROM licenses WHERE client_id = ? ORDER BY created_at DESC')
        .all(clientId) as Row[];
      return rows.map(rowToLicense);
    },

    listAll(limit = 200) {
      const rows = db
        .prepare('SELECT * FROM licenses ORDER BY created_at DESC LIMIT ?')
        .all(limit) as Row[];
      return rows.map(rowToLicense);
    },

    update(key, patch) {
      const assignments: string[] = [];
      const values: unknown[] = [];

      for (const [field, column] of Object.entries(LICENSE_COLUMNS)) {
        const value = (patch as Record<string, unknown>)[field];
        if (value === undefined) continue;
        assignments.push(`${column} = ?`);
        values.push(value);
      }

      if (assignments.length === 0) return false;

      assignments.push('updated_at = ?');
      values.push(Date.now(), key);

      const result = db
        .prepare(`UPDATE licenses SET ${assignments.join(', ')} WHERE key = ?`)
        .run(...(values as never[]));

      return result.changes > 0;
    },
  };

  // --- Quota ---------------------------------------------------------------
  const readUsed = db.prepare('SELECT used FROM quota_usage WHERE client_id = ? AND day = ?');

  // L'UPSERT conditionnel est l'element cle : l'increment et le controle de
  // limite se font dans une seule instruction atomique. Deux requetes
  // simultanees ne peuvent donc pas depasser le quota.
  const consumeStatement = db.prepare(
    `INSERT INTO quota_usage (client_id, day, used)
     VALUES (?, ?, 1)
     ON CONFLICT (client_id, day) DO UPDATE SET used = used + 1
       WHERE quota_usage.used < ?
     RETURNING used`,
  );

  const quota: QuotaRepository = {
    consume(clientId, day, limit): QuotaConsumeResult {
      if (limit <= 0) {
        return { used: 0, limit, allowed: false };
      }

      const updated = consumeStatement.get(clientId, day, limit) as Row | undefined;
      if (updated) {
        const used = Number(updated.used);
        return { used, limit, allowed: true };
      }

      const current = readUsed.get(clientId, day) as Row | undefined;
      return { used: current ? Number(current.used) : 0, limit, allowed: false };
    },

    peek(clientId, day) {
      const row = readUsed.get(clientId, day) as Row | undefined;
      return row ? Number(row.used) : 0;
    },

    reset(clientId, day) {
      db.prepare('DELETE FROM quota_usage WHERE client_id = ? AND day = ?').run(clientId, day);
    },
  };

  // --- Rate limiting -------------------------------------------------------
  const insertHit = db.prepare('INSERT INTO rate_limit_hits (bucket, ts) VALUES (?, ?)');
  const countHits = db.prepare(
    'SELECT COUNT(*) AS total FROM rate_limit_hits WHERE bucket = ? AND ts > ?',
  );

  const registerHit = db.transaction((bucket: string, now: number, windowMs: number): number => {
    insertHit.run(bucket, now);
    const row = countHits.get(bucket, now - windowMs) as Row;
    return Number(row.total);
  });

  const rateLimit: RateLimitRepository = {
    hit(bucket, now, windowMs) {
      return registerHit(bucket, now, windowMs);
    },
    count(bucket, now, windowMs) {
      const row = countHits.get(bucket, now - windowMs) as Row;
      return Number(row.total);
    },
    oldest(bucket, now, windowMs) {
      const row = db
        .prepare('SELECT MIN(ts) AS oldest FROM rate_limit_hits WHERE bucket = ? AND ts > ?')
        .get(bucket, now - windowMs) as Row;
      return row.oldest === null || row.oldest === undefined ? null : Number(row.oldest);
    },
    cleanup(before) {
      const result = db.prepare('DELETE FROM rate_limit_hits WHERE ts <= ?').run(before);
      return result.changes;
    },
  };

  // --- Usage ---------------------------------------------------------------
  const insertUsage = db.prepare(
    `INSERT INTO usage_events (ts, client_id, plan, channel, verdict, score, duration_ms, blocked)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  );

  const usage: UsageRepository = {
    record(event: UsageEventRecord) {
      insertUsage.run(
        event.ts,
        event.clientId,
        event.plan,
        event.channel,
        event.verdict,
        event.score,
        event.durationMs,
        event.blocked ? 1 : 0,
      );
    },
    countSince(ts) {
      const row = db.prepare('SELECT COUNT(*) AS total FROM usage_events WHERE ts > ?').get(ts) as Row;
      return Number(row.total);
    },
    verdictBreakdown(ts) {
      const rows = db
        .prepare(
          `SELECT verdict, COUNT(*) AS total FROM usage_events
           WHERE ts > ? GROUP BY verdict ORDER BY total DESC`,
        )
        .all(ts) as Row[];
      return rows.map((row) => ({ verdict: String(row.verdict), total: Number(row.total) }));
    },
  };

  return {
    driver: 'sqlite',
    degradedReason: null,
    licenses,
    quota,
    rateLimit,
    usage,
    close() {
      db.close();
    },
  };
}
