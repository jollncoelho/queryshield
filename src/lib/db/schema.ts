/**
 * Schema de la base et gestion des migrations.
 *
 * Regle : une migration est immuable une fois livree. Pour faire evoluer le
 * schema, on ajoute une entree a la suite ; on ne modifie jamais une entree
 * existante. Les versions deja appliquees sont enregistrees dans
 * `schema_migrations`, ce qui rend le demarrage idempotent.
 */

export interface Migration {
  version: number;
  name: string;
  statements: string[];
}

export const MIGRATIONS: Migration[] = [
  {
    version: 1,
    name: 'initial',
    statements: [
      `CREATE TABLE IF NOT EXISTS licenses (
         key                      TEXT PRIMARY KEY,
         plan                     TEXT    NOT NULL,
         status                   TEXT    NOT NULL,
         client_id                TEXT,
         email                    TEXT,
         stripe_customer_id       TEXT,
         stripe_subscription_id   TEXT,
         current_period_end       INTEGER,
         created_at               INTEGER NOT NULL,
         updated_at               INTEGER NOT NULL,
         note                     TEXT
       )`,
      `CREATE INDEX IF NOT EXISTS idx_licenses_client ON licenses (client_id)`,
      `CREATE INDEX IF NOT EXISTS idx_licenses_subscription ON licenses (stripe_subscription_id)`,

      // Compteur de quota : une ligne par (porteur, jour). La cle primaire
      // composite rend l'increment atomique via un UPSERT.
      `CREATE TABLE IF NOT EXISTS quota_usage (
         client_id TEXT    NOT NULL,
         day       TEXT    NOT NULL,
         used      INTEGER NOT NULL DEFAULT 0,
         PRIMARY KEY (client_id, day)
       )`,

      // Rate limiting par fenetre glissante : un journal d'horodatages.
      // Volontairement sans cle etrangere : le nettoyage est periodique.
      `CREATE TABLE IF NOT EXISTS rate_limit_hits (
         id     INTEGER PRIMARY KEY AUTOINCREMENT,
         bucket TEXT    NOT NULL,
         ts     INTEGER NOT NULL
       )`,
      `CREATE INDEX IF NOT EXISTS idx_rate_limit_bucket_ts ON rate_limit_hits (bucket, ts)`,

      // Statistiques d'usage. Ne contient JAMAIS le contenu d'un message :
      // uniquement des metadonnees d'exploitation.
      `CREATE TABLE IF NOT EXISTS usage_events (
         id          INTEGER PRIMARY KEY AUTOINCREMENT,
         ts          INTEGER NOT NULL,
         client_id   TEXT,
         plan        TEXT    NOT NULL,
         channel     TEXT    NOT NULL,
         verdict     TEXT    NOT NULL,
         score       INTEGER NOT NULL,
         duration_ms INTEGER NOT NULL,
         blocked     INTEGER NOT NULL DEFAULT 0
       )`,
      `CREATE INDEX IF NOT EXISTS idx_usage_events_ts ON usage_events (ts)`,
    ],
  },
];

export const SCHEMA_VERSION = MIGRATIONS[MIGRATIONS.length - 1]?.version ?? 0;

/**
 * Traduit les marqueurs de parametres (`?`) en marqueurs numerotes ($1, $2...)
 * pour les moteurs qui l'exigent, et inversement.
 */
export function toNumberedPlaceholders(sql: string): string {
  let index = 0;
  return sql.replace(/\?/g, () => `$${(index += 1)}`);
}
