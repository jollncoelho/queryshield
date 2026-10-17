/**
 * Tests de la couche de persistance, de l'identification et du rate limiting.
 *
 * Les tests de depot sont joues DEUX FOIS, sur SQLite puis sur le repli
 * memoire : les deux implementations doivent se comporter a l'identique, sinon
 * le mode degrade introduirait des differences de facturation invisibles.
 *
 * Lancement : npm run test:store
 */

import { randomUUID } from 'node:crypto';
import { existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { createMemoryRepositories } from '../src/lib/db/memory';
import { createSqliteRepositories } from '../src/lib/db/sqlite';
import { closeRepositories, getRepositories, getStorageStatus } from '../src/lib/db';
import type { LicenseRecord, Repositories } from '../src/lib/db/types';
import { licenseUsability, generateLicenseKey } from '../src/lib/license';
import { hashIp, normaliseIp, resolveClientIdentity, resolveClientIp } from '../src/lib/security/client-ip';
import { buildPolicies, evaluateRateLimit, rateLimitDisabled } from '../src/lib/security/rate-limit';

// ---------------------------------------------------------------------------
// Micro-matrice de tests
// ---------------------------------------------------------------------------

let passed = 0;
const failures: string[] = [];
let currentSuite = '';

function suite(name: string): void {
  currentSuite = name;
  console.log(`\n${name}`);
}

function check(name: string, fn: () => void): void {
  try {
    fn();
    passed += 1;
    console.log(`  OK     ${name}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    failures.push(`[${currentSuite}] ${name} — ${message}`);
    console.log(`  ECHEC  ${name}`);
    console.log(`         ${message}`);
  }
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function assertEqual<T>(actual: T, expected: T, label: string): void {
  if (actual !== expected) {
    throw new Error(`${label} : attendu ${JSON.stringify(expected)}, obtenu ${JSON.stringify(actual)}`);
  }
}

function makeLicense(overrides: Partial<LicenseRecord> = {}): LicenseRecord {
  const now = Date.now();
  return {
    key: generateLicenseKey('pro'),
    plan: 'pro',
    status: 'active',
    clientId: 'client-1',
    email: null,
    stripeCustomerId: null,
    stripeSubscriptionId: null,
    currentPeriodEnd: null,
    createdAt: now,
    updatedAt: now,
    note: null,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Suite commune aux deux implementations
// ---------------------------------------------------------------------------

function storeSuite(label: string, repositories: Repositories): void {
  suite(`Depots — ${label}`);

  // --- Quota ---------------------------------------------------------------
  check('le quota autorise exactement `limit` analyses puis bloque', () => {
    const subject = `sujet-${randomUUID()}`;
    const limit = 3;
    for (let index = 1; index <= limit; index += 1) {
      const result = repositories.quota.consume(subject, '2026-01-01', limit);
      assert(result.allowed, `analyse ${index} devrait etre autorisee`);
      assertEqual(result.used, index, `compteur apres ${index} analyse(s)`);
    }
    const blocked = repositories.quota.consume(subject, '2026-01-01', limit);
    assert(!blocked.allowed, 'la 4e analyse devrait etre refusee');
    assertEqual(blocked.used, limit, 'compteur bloque');
  });

  check('le compteur ne depasse jamais la limite, meme martele', () => {
    const subject = `martele-${randomUUID()}`;
    for (let index = 0; index < 50; index += 1) repositories.quota.consume(subject, '2026-01-01', 5);
    assertEqual(repositories.quota.peek(subject, '2026-01-01'), 5, 'compteur plafonne');
  });

  check('peek ne consomme pas de quota', () => {
    const subject = `peek-${randomUUID()}`;
    repositories.quota.consume(subject, '2026-01-02', 10);
    repositories.quota.peek(subject, '2026-01-02');
    repositories.quota.peek(subject, '2026-01-02');
    assertEqual(repositories.quota.peek(subject, '2026-01-02'), 1, 'compteur inchange');
  });

  check('le quota est cloisonne par jour', () => {
    const subject = `jour-${randomUUID()}`;
    repositories.quota.consume(subject, '2026-02-01', 2);
    repositories.quota.consume(subject, '2026-02-01', 2);
    const nextDay = repositories.quota.consume(subject, '2026-02-02', 2);
    assert(nextDay.allowed, 'le lendemain doit repartir de zero');
    assertEqual(nextDay.used, 1, 'compteur du lendemain');
  });

  check('le quota est cloisonne par sujet', () => {
    const a = `iso-a-${randomUUID()}`;
    const b = `iso-b-${randomUUID()}`;
    repositories.quota.consume(a, '2026-03-01', 1);
    const other = repositories.quota.consume(b, '2026-03-01', 1);
    assert(other.allowed, 'un autre sujet ne doit pas etre penalise');
  });

  check('une limite nulle bloque immediatement', () => {
    const result = repositories.quota.consume(`zero-${randomUUID()}`, '2026-04-01', 0);
    assert(!result.allowed, 'une limite de zero doit refuser');
    assertEqual(result.used, 0, 'aucune consommation');
  });

  check('reset remet le compteur a zero', () => {
    const subject = `reset-${randomUUID()}`;
    repositories.quota.consume(subject, '2026-05-01', 5);
    repositories.quota.reset(subject, '2026-05-01');
    assertEqual(repositories.quota.peek(subject, '2026-05-01'), 0, 'compteur apres reset');
  });

  // --- Licences ------------------------------------------------------------
  check('creation et lecture d une licence par cle', () => {
    const record = makeLicense({ note: 'test' });
    repositories.licenses.create(record);
    const found = repositories.licenses.findByKey(record.key);
    assert(found, 'licence introuvable apres creation');
    assertEqual(found.plan, 'pro', 'offre');
    assertEqual(found.note, 'test', 'note');
  });

  check('lecture d une licence par identifiant d abonnement', () => {
    const record = makeLicense({ stripeSubscriptionId: `sub_${randomUUID()}` });
    repositories.licenses.create(record);
    const found = repositories.licenses.findBySubscriptionId(record.stripeSubscriptionId as string);
    assert(found, 'licence introuvable par abonnement');
    assertEqual(found.key, record.key, 'cle retrouvee');
  });

  check('listByClient filtre par porteur', () => {
    const clientId = `porteur-${randomUUID()}`;
    repositories.licenses.create(makeLicense({ clientId }));
    repositories.licenses.create(makeLicense({ clientId }));
    repositories.licenses.create(makeLicense({ clientId: 'autre' }));
    assertEqual(repositories.licenses.listByClient(clientId).length, 2, 'licences du porteur');
  });

  check('update modifie les champs demandes et renvoie false sur cle inconnue', () => {
    const record = makeLicense();
    repositories.licenses.create(record);
    const updated = repositories.licenses.update(record.key, {
      status: 'past_due',
      currentPeriodEnd: 1234567890,
    });
    assert(updated, 'update devrait reussir');
    const reread = repositories.licenses.findByKey(record.key);
    assertEqual(reread?.status, 'past_due', 'statut mis a jour');
    assertEqual(reread?.currentPeriodEnd, 1234567890, 'echeance mise a jour');
    assertEqual(reread?.plan, 'pro', 'offre inchangee');

    assertEqual(repositories.licenses.update('QS-INEXISTANTE', { status: 'active' }), false, 'cle inconnue');
  });

  check('findByKey renvoie undefined pour une cle inconnue', () => {
    assertEqual(repositories.licenses.findByKey('QS-PRO-AAAA-BBBB-CCCC'), undefined, 'resultat');
  });

  // --- Rate limiting -------------------------------------------------------
  check('le journal de rate limiting compte les requetes de la fenetre', () => {
    const bucket = `seau-${randomUUID()}`;
    const now = 1_000_000;
    assertEqual(repositories.rateLimit.hit(bucket, now, 60_000), 1, 'premier hit');
    assertEqual(repositories.rateLimit.hit(bucket, now + 10, 60_000), 2, 'deuxieme hit');
    assertEqual(repositories.rateLimit.count(bucket, now + 20, 60_000), 2, 'count');
  });

  check('les entrees sortent de la fenetre glissante', () => {
    const bucket = `glissant-${randomUUID()}`;
    const now = 2_000_000;
    repositories.rateLimit.hit(bucket, now, 60_000);
    repositories.rateLimit.hit(bucket, now + 30_000, 60_000);
    assertEqual(repositories.rateLimit.count(bucket, now + 61_000, 60_000), 1, 'apres expiration du premier');
    assertEqual(repositories.rateLimit.count(bucket, now + 91_000, 60_000), 0, 'apres expiration des deux');
  });

  check('oldest renvoie la plus ancienne entree de la fenetre', () => {
    const bucket = `ancien-${randomUUID()}`;
    const now = 3_000_000;
    assertEqual(repositories.rateLimit.oldest(bucket, now, 60_000), null, 'seau vide');
    repositories.rateLimit.hit(bucket, now + 5_000, 60_000);
    repositories.rateLimit.hit(bucket, now + 40_000, 60_000);
    assertEqual(repositories.rateLimit.oldest(bucket, now + 50_000, 60_000), now + 5_000, 'plus ancienne');
  });

  check('cleanup supprime les entrees trop anciennes', () => {
    const bucket = `nettoyage-${randomUUID()}`;
    const now = 4_000_000;
    repositories.rateLimit.hit(bucket, now, 60_000);
    repositories.rateLimit.hit(bucket, now + 100_000, 60_000);
    const removed = repositories.rateLimit.cleanup(now + 50_000);
    assert(removed >= 1, `cleanup devrait supprimer au moins une entree, obtenu ${removed}`);
    assertEqual(repositories.rateLimit.count(bucket, now + 100_000, 600_000), 1, 'entree recente conservee');
  });

  // --- Statistiques --------------------------------------------------------
  check('les evenements d usage sont enregistres et agreges', () => {
    const since = Date.now() - 1000;
    repositories.usage.record({
      ts: Date.now(),
      clientId: 'stats',
      plan: 'pro',
      channel: 'sms',
      verdict: 'dangerous',
      score: 88,
      durationMs: 12,
      blocked: false,
    });
    repositories.usage.record({
      ts: Date.now(),
      clientId: 'stats',
      plan: 'pro',
      channel: 'sms',
      verdict: 'dangerous',
      score: 91,
      durationMs: 15,
      blocked: false,
    });
    repositories.usage.record({
      ts: Date.now(),
      clientId: 'stats',
      plan: 'pro',
      channel: 'email',
      verdict: 'safe',
      score: 0,
      durationMs: 9,
      blocked: false,
    });

    assert(repositories.usage.countSince(since) >= 3, 'comptage des evenements');
    const breakdown = repositories.usage.verdictBreakdown(since);
    const dangerous = breakdown.find((entry) => entry.verdict === 'dangerous');
    assert(dangerous, 'verdict dangerous absent de la repartition');
    assertEqual(dangerous.total, 2, 'total dangerous');
  });
}

// ---------------------------------------------------------------------------
// Tests transverses : licences, IP, politiques de debit
// ---------------------------------------------------------------------------

function crossCuttingSuite(): void {
  suite('Etat des licences');

  const now = Date.now();

  check('une licence active sans echeance reste utilisable', () => {
    assertEqual(licenseUsability(makeLicense({ currentPeriodEnd: null }), now), 'usable', 'statut');
  });

  check('une licence active depassee est expiree', () => {
    const license = makeLicense({ currentPeriodEnd: now - 1000 });
    assertEqual(licenseUsability(license, now), 'expired', 'statut');
  });

  check('canceled conserve l acces jusqu a la fin de la periode payee', () => {
    const license = makeLicense({ status: 'canceled', currentPeriodEnd: now + 86_400_000 });
    assertEqual(licenseUsability(license, now), 'usable', 'statut');
  });

  check('past_due conserve l acces pendant le delai de grace', () => {
    const license = makeLicense({ status: 'past_due', currentPeriodEnd: now + 3_600_000 });
    assertEqual(licenseUsability(license, now), 'usable', 'statut');
  });

  check('revoked coupe l acces immediatement, meme si la periode court encore', () => {
    const license = makeLicense({ status: 'revoked', currentPeriodEnd: now + 86_400_000 });
    assertEqual(licenseUsability(license, now), 'revoked', 'statut');
  });

  suite('Format des cles de licence');

  check('les cles sont au format attendu et sans caracteres ambigus', () => {
    for (let index = 0; index < 200; index += 1) {
      const key = generateLicenseKey('pro');
      assert(/^QS-PRO-[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}$/.test(key), `format invalide : ${key}`);
      assert(!/[O0IL1]/.test(key.slice(7)), `caractere ambigu dans ${key}`);
    }
  });

  check('les cles generees sont distinctes', () => {
    const keys = new Set<string>();
    for (let index = 0; index < 2000; index += 1) keys.add(generateLicenseKey('business'));
    assertEqual(keys.size, 2000, 'collisions detectees');
  });

  suite('Normalisation des adresses IP');

  check('les IPv4 valides sont acceptees', () => {
    assertEqual(normaliseIp('203.0.113.5'), '203.0.113.5', 'IPv4 simple');
    assertEqual(normaliseIp('  203.0.113.5  '), '203.0.113.5', 'espaces');
  });

  check('les IPv4 invalides sont rejetees', () => {
    assertEqual(normaliseIp('999.0.0.1'), null, 'octet hors bornes');
    assertEqual(normaliseIp('203.0.113'), null, 'octets manquants');
    assertEqual(normaliseIp('pas-une-ip'), null, 'texte libre');
    assertEqual(normaliseIp(''), null, 'chaine vide');
    assertEqual(normaliseIp(null), null, 'null');
  });

  check('les formes IPv6 sont normalisees', () => {
    assertEqual(normaliseIp('[2001:db8::1]:443'), '2001:db8::1', 'crochets et port');
    assertEqual(normaliseIp('2001:DB8::1'), '2001:db8::1', 'casse');
    assertEqual(normaliseIp('::ffff:203.0.113.5'), '203.0.113.5', 'IPv4 mappee');
  });

  check('une valeur trop longue est rejetee', () => {
    assertEqual(normaliseIp('1'.repeat(60)), null, 'longueur');
  });

  suite('Extraction de l IP derriere un proxy');

  check('x-real-ip est prioritaire', () => {
    const headers = new Headers({ 'x-real-ip': '198.51.100.7', 'x-forwarded-for': '1.2.3.4' });
    const result = resolveClientIp(headers);
    assertEqual(result.ip, '198.51.100.7', 'IP retenue');
    assertEqual(result.source, 'x-real-ip', 'source');
  });

  check('avec un proxy de confiance, la derniere entree XFF est retenue', () => {
    // Un attaquant place une fausse IP en tete ; nginx ajoute la vraie a la fin.
    const headers = new Headers({ 'x-forwarded-for': '1.2.3.4, 198.51.100.7' });
    const result = resolveClientIp(headers);
    assertEqual(result.ip, '198.51.100.7', 'IP retenue');
  });

  check('avec deux proxys de confiance, la bonne entree est retenue', () => {
    const previous = process.env.QUERYSHIELD_TRUSTED_PROXY_HOPS;
    process.env.QUERYSHIELD_TRUSTED_PROXY_HOPS = '2';
    try {
      const headers = new Headers({ 'x-forwarded-for': '1.2.3.4, 198.51.100.7, 10.0.0.1' });
      const result = resolveClientIp(headers);
      assertEqual(result.ip, '198.51.100.7', 'IP retenue');
    } finally {
      if (previous === undefined) delete process.env.QUERYSHIELD_TRUSTED_PROXY_HOPS;
      else process.env.QUERYSHIELD_TRUSTED_PROXY_HOPS = previous;
    }
  });

  check('avec zero proxy de confiance, aucun en-tete n est cru', () => {
    const previous = process.env.QUERYSHIELD_TRUSTED_PROXY_HOPS;
    process.env.QUERYSHIELD_TRUSTED_PROXY_HOPS = '0';
    try {
      const headers = new Headers({ 'x-real-ip': '198.51.100.7', 'x-forwarded-for': '1.2.3.4' });
      const result = resolveClientIp(headers);
      assertEqual(result.ip, null, 'aucune IP');
      assertEqual(result.source, 'untrusted', 'source');
    } finally {
      if (previous === undefined) delete process.env.QUERYSHIELD_TRUSTED_PROXY_HOPS;
      else process.env.QUERYSHIELD_TRUSTED_PROXY_HOPS = previous;
    }
  });

  check('une XFF plus courte que le nombre de sauts est rejetee', () => {
    const previous = process.env.QUERYSHIELD_TRUSTED_PROXY_HOPS;
    process.env.QUERYSHIELD_TRUSTED_PROXY_HOPS = '3';
    try {
      const headers = new Headers({ 'x-forwarded-for': '198.51.100.7' });
      assertEqual(resolveClientIp(headers).ip, null, 'IP');
    } finally {
      if (previous === undefined) delete process.env.QUERYSHIELD_TRUSTED_PROXY_HOPS;
      else process.env.QUERYSHIELD_TRUSTED_PROXY_HOPS = previous;
    }
  });

  check('sans aucun en-tete, l appelant tombe dans le seau commun', () => {
    const identity = resolveClientIdentity(new Headers());
    assertEqual(identity.bucket, 'untrusted', 'seau');
    assertEqual(identity.trusted, false, 'fiabilite');
  });

  suite('Condensation des adresses IP');

  check('le condensat ne contient pas l IP et est stable sur la journee', () => {
    const now = Date.now();
    const first = hashIp('203.0.113.5', now);
    const second = hashIp('203.0.113.5', now + 1000);
    assertEqual(first, second, 'stabilite intra-journaliere');
    assert(!first.includes('203'), 'IP presente dans le condensat');
    assert(first.startsWith('v4:'), 'prefixe de famille');
  });

  check('le condensat change le lendemain', () => {
    const dayOne = hashIp('203.0.113.5', Date.parse('2026-01-01T10:00:00Z'));
    const dayTwo = hashIp('203.0.113.5', Date.parse('2026-01-02T10:00:00Z'));
    assert(dayOne !== dayTwo, 'le sel devrait tourner chaque jour');
  });

  check('deux IP differentes donnent deux condensats differents', () => {
    const now = Date.now();
    assert(hashIp('203.0.113.5', now) !== hashIp('203.0.113.6', now), 'collision');
  });

  check('IPv4 et IPv6 sont distinguees', () => {
    const now = Date.now();
    assert(hashIp('203.0.113.5', now).startsWith('v4:'), 'famille IPv4');
    assert(hashIp('2001:db8::1', now).startsWith('v6:'), 'famille IPv6');
  });

  suite('Politiques de limitation de debit');

  check('les offres payantes disposent de seuils plus larges', () => {
    const free = buildPolicies(false);
    const paid = buildPolicies(true);
    assert(free.length === 3, 'trois politiques');
    assert(paid.length === 3, 'trois politiques');
    assert(paid[0].max > free[0].max, 'seuil de rafale');
    assert(paid[1].max > free[1].max, 'seuil soutenu');
    assertEqual(free[2].max, paid[2].max, 'le seuil global est commun');
    assertEqual(free[2].scope, 'global', 'portee du filet global');
  });

  check('la politique globale est evaluee en dernier recours', () => {
    const policies = buildPolicies(false);
    assertEqual(policies[2].id, 'global', 'identifiant');
    assertEqual(policies[2].windowMs, 60_000, 'fenetre');
  });
}

// ---------------------------------------------------------------------------
// Rate limiting de bout en bout, via le singleton
// ---------------------------------------------------------------------------

function rateLimitSuite(): void {
  suite('Limitation de debit de bout en bout');

  if (rateLimitDisabled()) {
    console.log('  (ignore : QUERYSHIELD_RATELIMIT_DISABLED=true)');
    return;
  }

  const policies = buildPolicies(false);
  const burst = policies[0].max;

  check('la rafale est bloquee au-dela du seuil', () => {
    const identity = { bucket: `rafale-${randomUUID()}`, source: 'x-real-ip' as const, trusted: true };
    const now = Date.now();

    for (let index = 1; index <= burst; index += 1) {
      const decision = evaluateRateLimit({ identity, paid: false, now });
      assert(decision.allowed, `requete ${index} devrait passer (max ${burst})`);
    }

    const blocked = evaluateRateLimit({ identity, paid: false, now });
    assert(!blocked.allowed, 'la requete suivante devrait etre bloquee');
    assertEqual(blocked.blockedBy, 'burst-free', 'politique declenchee');
    assertEqual(blocked.scope, 'identity', 'portee');
    assert(blocked.retryAfterSeconds >= 1, 'Retry-After doit etre au moins 1 seconde');
    assert(blocked.retryAfterSeconds <= 60, `Retry-After trop grand : ${blocked.retryAfterSeconds}`);
  });

  check('le blocage ne s applique qu au seau concerne', () => {
    const blocked = { bucket: `bloque-${randomUUID()}`, source: 'x-real-ip' as const, trusted: true };
    const other = { bucket: `libre-${randomUUID()}`, source: 'x-real-ip' as const, trusted: true };
    const now = Date.now();

    for (let index = 0; index <= burst; index += 1) evaluateRateLimit({ identity: blocked, paid: false, now });
    assert(!evaluateRateLimit({ identity: blocked, paid: false, now }).allowed, 'seau sature');

    const decision = evaluateRateLimit({ identity: other, paid: false, now });
    assert(decision.allowed, 'un autre appelant ne doit pas etre penalise');
  });

  check('une offre payante tolere davantage de requetes', () => {
    const identity = { bucket: `payant-${randomUUID()}`, source: 'x-real-ip' as const, trusted: true };
    const now = Date.now();
    const paidBurst = buildPolicies(true)[0].max;

    for (let index = 0; index <= burst; index += 1) {
      const decision = evaluateRateLimit({ identity, paid: true, now });
      assert(decision.allowed, `requete payante ${index + 1} refusee alors que le seuil est ${paidBurst}`);
    }
  });

  check('le blocage est actif meme si l identite est inconnue', () => {
    const identity = { bucket: 'untrusted', source: 'untrusted' as const, trusted: false };
    const now = Date.now() + 3_600_000;
    let blockedOnce = false;
    for (let index = 0; index <= burst; index += 1) {
      const decision = evaluateRateLimit({ identity, paid: false, now });
      if (!decision.allowed) blockedOnce = true;
    }
    assert(blockedOnce, 'le seau commun doit finir par saturer');
  });
}

// ---------------------------------------------------------------------------
// Persistance sur disque
// ---------------------------------------------------------------------------

function durabilitySuite(file: string): void {
  suite('Durabilite sur disque');

  check('les donnees survivent a la fermeture de la connexion', () => {
    const key = generateLicenseKey('business');
    const first = createSqliteRepositories({ file, silent: true });
    first.licenses.create(makeLicense({ key, plan: 'business' }));
    first.quota.consume('durable', '2026-06-01', 10);
    first.close();

    const second = createSqliteRepositories({ file, silent: true });
    const found = second.licenses.findByKey(key);
    assert(found, 'licence perdue apres reouverture');
    assertEqual(found.plan, 'business', 'offre conservee');
    assertEqual(second.quota.peek('durable', '2026-06-01'), 1, 'compteur conserve');
    second.close();
  });

  check('les migrations sont idempotentes au redemarrage', () => {
    const before = createSqliteRepositories({ file, silent: true });
    const countBefore = before.licenses.listAll(1000).length;
    before.close();

    const after = createSqliteRepositories({ file, silent: true });
    assertEqual(after.licenses.listAll(1000).length, countBefore, 'aucune donnee alteree');
    after.close();
  });
}

// ---------------------------------------------------------------------------
// Execution
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const file = join(tmpdir(), `queryshield-test-${randomUUID()}.db`);
  const memory = createMemoryRepositories('test');
  const sqlite = createSqliteRepositories({ file, silent: true });

  storeSuite('SQLite', sqlite);
  storeSuite('memoire', memory);

  sqlite.close();
  memory.close();

  durabilitySuite(file);

  process.env.QUERYSHIELD_DB_DRIVER = 'sqlite';
  process.env.QUERYSHIELD_DB_FILE = file;
  closeRepositories();

  const status = getStorageStatus();
  assertEqual(status.driver, 'sqlite', 'le singleton devrait utiliser SQLite');

  crossCuttingSuite();
  rateLimitSuite();

  check('le singleton expose le meme jeu de depots', () => {
    const repositories = getRepositories();
    assert(repositories.licenses && repositories.quota && repositories.rateLimit && repositories.usage, 'depots');
  });

  closeRepositories();

  // Nettoyage des fichiers de test (base, journal WAL, index partage).
  for (const suffix of ['', '-wal', '-shm']) {
    const target = `${file}${suffix}`;
    if (existsSync(target)) {
      try {
        rmSync(target, { force: true });
      } catch {
        /* sans consequence sur le resultat des tests */
      }
    }
  }

  console.log('');
  if (failures.length === 0) {
    console.log(`${passed} test(s) conforme(s).`);
  } else {
    console.log(`${passed} test(s) conforme(s), ${failures.length} echec(s) :`);
    for (const failure of failures) console.log(`  - ${failure}`);
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
