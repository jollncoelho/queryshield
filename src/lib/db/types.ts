/**
 * Contrats de la couche de persistance.
 *
 * Deux implementations satisfont ces interfaces :
 *  - SQLite (`./sqlite.ts`) : stockage reel, fichier unique, transactionnel.
 *    C'est le mode de production sur un VPS.
 *  - Memoire (`./memory.ts`) : repli degrade quand aucun stockage durable n'est
 *    disponible (systeme de fichiers en lecture seule). Le service continue de
 *    fonctionner mais perd ses donnees au redemarrage ; l'etat est expose par
 *    /api/health pour que l'anomalie soit visible.
 *
 * Les implementations de Postgres ou de Redis n'ont qu'a satisfaire ces memes
 * interfaces : aucun code metier n'a besoin d'etre modifie.
 */

export type Plan = 'free' | 'pro' | 'business';

export type LicenseStatus = 'active' | 'past_due' | 'canceled' | 'revoked';

export interface LicenseRecord {
  key: string;
  plan: Plan;
  status: LicenseStatus;
  /** Identifiant anonyme du porteur (cookie), quand la licence y est rattachee. */
  clientId: string | null;
  email: string | null;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  /** Fin de periode d'abonnement, en millisecondes epoch. */
  currentPeriodEnd: number | null;
  createdAt: number;
  updatedAt: number;
  note: string | null;
}

export interface LicenseRepository {
  create(record: LicenseRecord): void;
  findByKey(key: string): LicenseRecord | undefined;
  findBySubscriptionId(subscriptionId: string): LicenseRecord | undefined;
  listByClient(clientId: string): LicenseRecord[];
  listAll(limit?: number): LicenseRecord[];
  update(key: string, patch: Partial<Omit<LicenseRecord, 'key'>>): boolean;
}

export interface QuotaConsumeResult {
  used: number;
  limit: number;
  allowed: boolean;
}

export interface QuotaRepository {
  /**
   * Incremente le compteur du jour de facon atomique et indique si l'analyse
   * est autorisee. Le compteur n'est pas incremente au-dela de la limite.
   */
  consume(clientId: string, day: string, limit: number): QuotaConsumeResult;
  /** Lit le compteur sans l'incrementer. */
  peek(clientId: string, day: string): number;
  /** Remet le compteur a zero (outil d'administration). */
  reset(clientId: string, day: string): void;
}

export interface RateLimitRepository {
  /**
   * Enregistre une requete et renvoie le nombre de requetes de ce seau
   * presentes dans la fenetre [now - windowMs, now].
   */
  hit(bucket: string, now: number, windowMs: number): number;
  /** Supprime les entrees anterieures a `before`. Renvoie le nombre supprime. */
  cleanup(before: number): number;
  /** Nombre d'entrees du seau dans la fenetre, sans enregistrer de requete. */
  count(bucket: string, now: number, windowMs: number): number;
  /**
   * Horodatage de la plus ancienne requete encore presente dans la fenetre.
   * Sert a calculer un en-tete `Retry-After` exact plutot qu'approximatif :
   * un emplacement se libere quand cette entree sort de la fenetre.
   */
  oldest(bucket: string, now: number, windowMs: number): number | null;
}

export interface UsageEventRecord {
  ts: number;
  clientId: string | null;
  plan: Plan;
  channel: string;
  verdict: string;
  score: number;
  durationMs: number;
  blocked: boolean;
}

export interface UsageRepository {
  record(event: UsageEventRecord): void;
  countSince(ts: number): number;
  /** Repartition des verdicts depuis `ts`, pour le tableau de bord. */
  verdictBreakdown(ts: number): { verdict: string; total: number }[];
}

export type DriverName = 'sqlite' | 'memory';

export interface Repositories {
  driver: DriverName;
  /** Message d'explication quand le mode degrade est actif. */
  degradedReason: string | null;
  licenses: LicenseRepository;
  quota: QuotaRepository;
  rateLimit: RateLimitRepository;
  usage: UsageRepository;
  close(): void;
}
