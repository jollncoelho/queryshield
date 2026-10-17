/**
 * Tests hors ligne du moteur heuristique.
 *
 * Ces tests n'ont besoin d'aucun serveur : ils appellent directement
 * `analyzeSync`. Ils couvrent en priorite le faux negatif signale sur le
 * terrain — un message d'hameconnage note 0 — et verifient surtout que les
 * nouvelles regles ne creent PAS de faux positifs sur les expediteurs
 * officiels.
 *
 * Lancement : npm run test:engine
 */

import { BRANDS } from '../src/lib/engine/brands';
import {
  RANDOMNESS_HIGH,
  RANDOMNESS_MEDIUM,
  RANDOMNESS_MIN_LENGTH,
  assessDomainRandomness,
  detectInstitutionalMimicry,
  detectTldAsLabel,
  findInstitutionalMimicry,
  lureTokensInHost,
} from '../src/lib/engine/domain-reputation';
import { analyzeSync } from '../src/lib/engine/index';
import { analyzeSenderDomain, extractSenderFromText, parseSender } from '../src/lib/engine/sender';
import { checkSiteSync, isPrivateHost, normalizeSiteInput } from '../src/lib/engine/site';
import { isPrivateAddress } from '../src/lib/engine/site-network';
import type { NetworkReport } from '../src/lib/engine/site';
import { secondLevelLabel } from '../src/lib/engine/text';
import type { AnalyzeResult, Channel } from '../src/lib/engine/types';

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

function run(input: { text: string; channel?: Channel; subject?: string; sender?: string }): AnalyzeResult {
  return analyzeSync({ channel: 'email', ...input });
}

/** Accepte aussi bien un resultat de message qu'un resultat de verification de site. */
function ids(result: { findings: { id: string }[] }): Set<string> {
  return new Set(result.findings.map((item) => item.id));
}

function has(result: { findings: { id: string }[] }, id: string): boolean {
  return ids(result).has(id);
}

// ---------------------------------------------------------------------------
// 1. Faux negatif signale : appat financier + domaine aleatoire
// ---------------------------------------------------------------------------

suite('Faux negatif — appat financier depuis un domaine genere');

const RANDOM_DOMAIN = 'kdvmghvjusprqsfhsgdxjmsx.com';

check('le domaine signale est bien reconnu comme genere automatiquement', () => {
  const assessment = assessDomainRandomness(secondLevelLabel(RANDOM_DOMAIN));
  assert(
    assessment.score >= RANDOMNESS_HIGH,
    `score ${assessment.score} < seuil ${RANDOMNESS_HIGH} (signaux : ${assessment.signals.join(', ')})`,
  );
});

check('le domaine officiel du referentiel ne declenche jamais la regle', () => {
  for (const brand of BRANDS) {
    for (const domain of brand.domains) {
      const sld = secondLevelLabel(domain);
      if (sld.length < RANDOMNESS_MIN_LENGTH) continue;
      const assessment = assessDomainRandomness(sld);
      assert(
        assessment.score < RANDOMNESS_HIGH,
        `${domain} (${sld}) obtient ${assessment.score} : faux positif sur un domaine officiel`,
      );
    }
  }
});

check('message sans lien et sans demande d identifiants -> risque eleve', () => {
  const result = run({
    text: [
      'De : "Service Recompenses" <contact@' + RANDOM_DOMAIN + '>',
      'Objet : Votre bonus vous attend',
      '',
      'Bonjour,',
      'Vous avez ete selectionne pour recevoir un bonus exceptionnel de 500 EUR.',
      'Votre cagnotte reste disponible pendant 48 heures.',
    ].join('\n'),
  });

  assert(result.score > 75, `score attendu > 75, obtenu ${result.score}`);
  assertEqual(result.verdict, 'dangerous', 'verdict');
  assert(has(result, 'sender-random-domain'), 'sender-random-domain attendu');
  assert(
    has(result, 'combo-lure-with-untrusted-sender'),
    'la regle de combinaison appat + expediteur non officiel devait se declencher',
  );
});

check('la regle de combinaison se declenche aussi via le champ expediteur dedie', () => {
  const result = run({
    sender: `Promotions <promo@${RANDOM_DOMAIN}>`,
    text: 'Bonjour, vous avez gagne un bonus de 500 EUR. Reclamez votre gain des maintenant.',
  });

  assert(result.score > 75, `score attendu > 75, obtenu ${result.score}`);
  assert(has(result, 'combo-lure-with-untrusted-sender'), 'combinaison attendue');
});

// ---------------------------------------------------------------------------
// 2. Usurpation institutionnelle
// ---------------------------------------------------------------------------

suite('Usurpation institutionnelle');

check('un mot institutionnel deforme est reconnu', () => {
  assertEqual(findInstitutionalMimicry('overnmentarious'), 'government', 'deformation de « government »');
  assertEqual(findInstitutionalMimicry('gouvernement'), 'gouvernement', 'mot exact');
  assertEqual(findInstitutionalMimicry('impots'), 'impots', 'mot exact court');
});

check('le domaine deforme est signale comme imitateur', () => {
  const mimicry = detectInstitutionalMimicry('secure.overnmentarious.com');
  assert(mimicry !== null, 'aucune imitation detectee');
  assertEqual(mimicry?.word, 'government', 'mot institutionnel');
});

check('une extension connue utilisee en sous-domaine est signalee', () => {
  assertEqual(detectTldAsLabel('impots.gouv.fr.secure-login.xyz'), 'gouv.fr', 'suffixe compose detourne');
  assertEqual(detectTldAsLabel('paypal.com.secure-login.xyz'), 'com', 'extension simple detournee');
  assertEqual(detectTldAsLabel('www.impots.gouv.fr'), null, 'domaine officiel non signale');
  assertEqual(detectTldAsLabel('exemple.com'), null, 'domaine simple non signale');
});

check('l institution usurpee est detectee dans le message', () => {
  const result = run({
    text: [
      'De : "Direction Generale" <service@secure.overnmentarious.com>',
      'Objet : Votre remboursement',
      '',
      'Bonjour, un remboursement de 240 EUR vous est du. Merci de confirmer votre identite.',
    ].join('\n'),
  });

  assert(has(result, 'sender-institutional-mimicry'), 'sender-institutional-mimicry attendu');
  assertEqual(result.verdict, 'dangerous', 'verdict');
});

// ---------------------------------------------------------------------------
// 3. Lexique etendu : casino, bonus, retrait
// ---------------------------------------------------------------------------

suite('Lexique etendu — pieges a appat');

check('les jetons d appat sont reconnus dans le domaine', () => {
  const tokens = lureTokensInHost('lucky-spin-bonus-casino.com');
  assert(tokens.includes('casino'), `« casino » absent de ${tokens.join(', ')}`);
  assert(tokens.includes('bonus'), `« bonus » absent de ${tokens.join(', ')}`);
  assert(tokens.includes('lucky'), `« lucky » absent de ${tokens.join(', ')}`);
});

check('une offre de casino sans demande d identifiants est penalisee', () => {
  const result = run({
    text: [
      'De : "Lucky Spin" <promo@lucky-spin-bonus-casino.com>',
      'Objet : 50 free spins offerts',
      '',
      'Profitez de 50 free spins et d un bonus de bienvenue de 200 EUR.',
      'Deposez 20 EUR pour activer votre bonus.',
    ].join('\n'),
  });

  assert(has(result, 'lex-gambling-lure'), 'lex-gambling-lure attendu');
  assert(result.score > 75, `score attendu > 75, obtenu ${result.score}`);
  assertEqual(result.verdict, 'dangerous', 'verdict');
});

check('un retrait de gains conditionne est penalise', () => {
  const result = run({
    sender: 'support@claim-your-prize-now.top',
    text: 'Felicitations, vous avez gagne 1 500 EUR. Pour retirer vos gains, vous devez d abord regler des frais de deblocage de 45 EUR.',
  });

  assert(
    has(result, 'lex-withdrawal-bait') || has(result, 'lex-financial-lure'),
    'regle d appat attendue',
  );
  assert(result.score > 75, `score attendu > 75, obtenu ${result.score}`);
});

// ---------------------------------------------------------------------------
// 4. Garde anti-faux-positif
// ---------------------------------------------------------------------------

suite('Garde anti-faux-positif');

check('expediteur officiel + promotion -> pas de combinaison', () => {
  const result = run({
    sender: 'La Poste <no-reply@laposte.fr>',
    subject: 'Votre commande a ete expediee',
    text: [
      'Bonjour,',
      'Votre commande n°CMD-88213 a ete expediee ce matin.',
      'Suivez son acheminement depuis votre espace client : https://www.laposte.fr/outils/suivi-colis?id=CMD-88213',
    ].join('\n'),
  });

  assert(!has(result, 'combo-lure-with-untrusted-sender'), 'combinaison interdite sur domaine officiel');
  assertEqual(result.verdict, 'safe', 'verdict');
});

check('expediteur officiel d administration -> aucun signal', () => {
  const result = run({
    sender: 'Direction generale des Finances publiques <no-reply@impots.gouv.fr>',
    subject: 'Votre avis d imposition',
    text: [
      'Bonjour,',
      'Votre avis d imposition est disponible dans votre espace particulier sur impots.gouv.fr.',
      'Reference de dossier : 2026-118843.',
    ].join('\n'),
  });

  assertEqual(result.verdict, 'safe', 'verdict');
  assert(!has(result, 'sender-institutional-mimicry'), 'une administration officielle ne doit pas etre signalee');
  assert(!has(result, 'combo-lure-with-untrusted-sender'), 'aucune combinaison attendue');
});

check('newsletter neutre sans appat -> aucun signal', () => {
  const result = run({
    sender: 'Contact <contact@exemple-organisme.fr>',
    text: 'Bonjour, les inscriptions a notre prochaine session de formation sont ouvertes. Le programme est disponible sur https://www.exemple-organisme.fr/formations/2026. A bientot.',
  });

  assertEqual(result.verdict, 'safe', 'verdict');
});

check('message purement informatif contenant « bonus » hors appat', () => {
  // « bonus » seul, dans une phrase neutre et sans promesse, ne doit pas
  // suffire : la regle de casino exige un motif d offre, pas le mot isole.
  const result = run({
    sender: 'RH <rh@exemple-organisme.fr>',
    text: 'Bonjour, votre bulletin de paie de juin inclut une prime exceptionnelle liee a l anciennete. Le detail figure en page 2.',
  });

  assert(!has(result, 'lex-gambling-lure'), 'la regle casino ne devait pas se declencher');
  assert(!has(result, 'combo-lure-with-untrusted-sender'), 'aucune combinaison attendue');
  assert(result.verdict !== 'dangerous', `verdict inattendu : ${result.verdict} (score ${result.score})`);
});

check('domaine long mais prononcable -> pas de signal de generation', () => {
  // Garde-fou : l'entropie seule produirait un faux positif sur les noms
  // longs et lisibles.
  const assessment = assessDomainRandomness('creditagricole');
  assert(
    assessment.score < RANDOMNESS_MEDIUM,
    `« creditagricole » obtient ${assessment.score} (signaux : ${assessment.signals.join(', ')})`,
  );
});

// ---------------------------------------------------------------------------
// 5. Lecture de l expediteur
// ---------------------------------------------------------------------------

suite('Lecture de l expediteur');

check('lecture d une valeur « Nom <adresse> »', () => {
  const parsed = parseSender('"Service Client" <contact@exemple.fr>');
  assertEqual(parsed.address, 'contact@exemple.fr', 'adresse');
  assertEqual(parsed.domain, 'exemple.fr', 'domaine');
  assertEqual(parsed.displayName, 'Service Client', 'nom affiche');
});

check('extraction depuis un message colle', () => {
  const extracted = extractSenderFromText('De : Banque <alerte@securite-banque.xyz>\nObjet : Urgent\n\nBonjour...');
  assertEqual(extracted, 'Banque <alerte@securite-banque.xyz>', 'expediteur extrait');
});

check('aucune extraction abusive sans ligne d en-tete', () => {
  assertEqual(extractSenderFromText('Bonjour, ecrivez-moi a contact@exemple.fr'), null, 'extraction');
});

check('une adresse de boite grand public est signalee', () => {
  const signals = analyzeSenderDomain('Conseiller <conseiller.banque@gmail.com>', { origin: 'champ dedie' });
  assert(signals.findings.some((item) => item.id === 'sender-free-mailbox'), 'sender-free-mailbox attendu');
  assertEqual(signals.trusted, false, 'drapeau trusted');
});

check('un domaine officiel est marque comme fiable', () => {
  const signals = analyzeSenderDomain('La Poste <no-reply@laposte.fr>', { origin: 'champ dedie' });
  assertEqual(signals.trusted, true, 'drapeau trusted');
  assertEqual(signals.findings.length, 0, 'aucun constat attendu');
});

// ---------------------------------------------------------------------------
// 6. Non-regression du reste du moteur
// ---------------------------------------------------------------------------

suite('Non-regression');

check('faux conseiller bancaire toujours detecte', () => {
  const result = run({
    channel: 'messaging',
    text: "Bonjour, je suis conseiller au service fraude de votre banque. Nous avons detecte une tentative de paiement de 890 EUR. Pour bloquer l'operation, communiquez-moi le code a 6 chiffres que vous venez de recevoir par SMS. Ne parlez a personne de cet appel, l'operation est confidentielle.",
  });
  assertEqual(result.verdict, 'dangerous', 'verdict');
});

check('faux support technique toujours detecte', () => {
  const result = run({
    text: "ALERTE : votre ordinateur est infecte par un virus. Vos fichiers seront chiffres si vous n'agissez pas immediatement. Appelez le 0899 123 456 (2,99 EUR par appel) pour joindre le support Microsoft. Nos techniciens prendront en main votre PC avec TeamViewer.",
  });
  assertEqual(result.verdict, 'dangerous', 'verdict');
});

check('SMS colis bloque toujours detecte', () => {
  const result = run({
    channel: 'sms',
    text: 'CHRONOPOST : Votre colis n°3Z89FR est bloque au centre de tri. Des frais de dedouanement de 2,49 EUR sont requis sous 24h pour la livraison. Reglez ici : http://chronopost-livraison-suivi.top/frais-colis',
  });
  assertEqual(result.verdict, 'dangerous', 'verdict');
});

// ---------------------------------------------------------------------------
// 7. Verification de site
// ---------------------------------------------------------------------------

suite('Verification de site — lecture de l adresse');

check('un domaine saisi seul est accepte', () => {
  const identity = normalizeSiteInput('exemple.com');
  assert(identity !== null, 'identite nulle');
  assertEqual(identity?.host, 'exemple.com', 'hote');
  assertEqual(identity?.registrable, 'exemple.com', 'domaine');
  assertEqual(identity?.schemeAdded, true, 'schema ajoute');
});

check('une adresse complete est acceptee', () => {
  const identity = normalizeSiteInput('https://www.laposte.fr/outils/suivi-colis?id=1');
  assertEqual(identity?.host, 'www.laposte.fr', 'hote');
  assertEqual(identity?.registrable, 'laposte.fr', 'domaine');
  assertEqual(identity?.schemeAdded, false, 'schema present');
});

check('une adresse neutralisee est acceptee', () => {
  const identity = normalizeSiteInput('hxxps://credit-agricole-securite[.]xyz/login');
  assertEqual(identity?.registrable, 'credit-agricole-securite.xyz', 'domaine');
  assertEqual(identity?.host, 'credit-agricole-securite.xyz', 'hote');
});

check('les schemas dangereux sont refuses', () => {
  assertEqual(normalizeSiteInput('javascript:alert(1)'), null, 'javascript');
  assertEqual(normalizeSiteInput('data:text/html,<h1>x'), null, 'data');
  assertEqual(normalizeSiteInput('ftp://exemple.com'), null, 'ftp');
});

check('les hotes internes sont refuses', () => {
  assertEqual(normalizeSiteInput('localhost'), null, 'localhost');
  assertEqual(normalizeSiteInput('http://192.168.1.10/admin'), null, 'adresse privee');
  assertEqual(normalizeSiteInput('admin.interne'), null, 'suffixe interne');
  assertEqual(normalizeSiteInput('routeur.local'), null, 'suffixe .local');
  assertEqual(normalizeSiteInput('intranet'), null, 'hote sans point');
});

check('les plages d adresses privees sont reconnues', () => {
  assertEqual(isPrivateAddress('10.0.0.1'), true, '10/8');
  assertEqual(isPrivateAddress('172.16.5.4'), true, '172.16/12');
  assertEqual(isPrivateAddress('172.32.5.4'), false, 'hors 172.16/12');
  assertEqual(isPrivateAddress('192.168.0.1'), true, '192.168/16');
  assertEqual(isPrivateAddress('169.254.1.1'), true, 'lien local');
  assertEqual(isPrivateAddress('127.0.0.1'), true, 'boucle locale');
  assertEqual(isPrivateAddress('::1'), true, 'IPv6 boucle locale');
  assertEqual(isPrivateAddress('fd00::1'), true, 'IPv6 unique local');
  assertEqual(isPrivateAddress('8.8.8.8'), false, 'adresse publique');
});

check('le garde-fou d hote interne est coherent', () => {
  assertEqual(isPrivateHost('exemple.com'), false, 'domaine public');
  assertEqual(isPrivateHost('machine.corp'), true, 'suffixe corp');
  assertEqual(isPrivateHost('192.168.1.1'), true, 'adresse privee');
});

suite('Verification de site — verdicts');

check('le domaine officiel est reconnu comme tel', () => {
  const result = checkSiteSync('https://www.laposte.fr/outils/suivi-colis');
  assertEqual(result.verdict, 'official', 'verdict');
  assertEqual(result.score, 0, 'score');
  assertEqual(result.officialBrand?.name, 'La Poste', 'organisation');
  assert(has(result, 'site-official-domain'), 'site-official-domain attendu');
});

check('une imitation de banque est classee frauduleuse', () => {
  const result = checkSiteSync('credit-agricole-securite.xyz');
  assertEqual(result.verdict, 'phishing', 'verdict');
  assert(has(result, 'site-impersonates-brand'), 'site-impersonates-brand attendu');
  assert(result.score >= 60, `score attendu >= 60, obtenu ${result.score}`);
  assert(
    result.impersonatedBrands.some((name) => name.includes('Crédit Agricole')),
    `marque imitee absente : ${result.impersonatedBrands.join(', ')}`,
  );
});

check('une extension connue detournee en sous-domaine est signalee', () => {
  const result = checkSiteSync('https://impots.gouv.fr.secure-login.xyz/remboursement');
  assert(
    has(result, 'url-tld-as-label') || has(result, 'site-impersonates-brand'),
    'signal de sous-domaine trompeur attendu',
  );
  assertEqual(result.verdict, 'phishing', 'verdict');
});

check('un domaine genere automatiquement est signale', () => {
  const result = checkSiteSync('https://kdvmghvjusprqsfhsgdxjmsx.com');
  assert(has(result, 'url-random-domain'), 'url-random-domain attendu');
  assert(result.score >= 28, `score attendu >= 28, obtenu ${result.score}`);
});

check('un domaine inconnu mais propre est « non verifiable », pas « sur »', () => {
  const result = checkSiteSync('https://exemple-organisme.fr/formations');
  assertEqual(result.verdict, 'unknown', 'verdict');
  assert(result.summary.includes('confirmer') || result.summary.includes('authentique'), 'resume non concluant');
});

check('une entree illisible ne produit pas de faux verdict', () => {
  const result = checkSiteSync('pas une adresse');
  assertEqual(result.verdict, 'unknown', 'verdict');
  assertEqual(result.identity, null, 'identite');
  assertEqual(result.score, 0, 'score');
});

check('le site analyse n est jamais declare comme contacte', () => {
  const result = checkSiteSync('https://exemple-organisme.fr');
  assertEqual(result.meta.siteContacted, false, 'siteContacted');
});

suite('Verification de site — verifications reseau');

function networkReport(overrides: Partial<NetworkReport>): NetworkReport {
  return {
    attempted: true,
    resolves: true,
    addresses: ['93.184.216.34'],
    registeredAt: null,
    domainAgeDays: null,
    registrar: null,
    reputation: null,
    reputationSource: null,
    threats: [],
    errors: [],
    ...overrides,
  };
}

check('un domaine neuf est fortement penalise', () => {
  const result = checkSiteSync('https://promo-remboursement-2026.com', {
    network: networkReport({ registeredAt: '2026-10-09T00:00:00Z', domainAgeDays: 3 }),
  });
  assert(has(result, 'site-newly-registered'), 'site-newly-registered attendu');
  assert(result.score >= 28, `score attendu >= 28, obtenu ${result.score}`);
});

check('un domaine de six mois est signale plus moderement', () => {
  const result = checkSiteSync('https://boutique-exemple.com', {
    network: networkReport({ domainAgeDays: 120 }),
  });
  assert(has(result, 'site-recently-registered'), 'site-recently-registered attendu');
  assert(!has(result, 'site-newly-registered'), 'regle forte non attendue');
});

check('un domaine ancien ne declenche rien sur l age', () => {
  const result = checkSiteSync('https://boutique-exemple.com', {
    network: networkReport({ domainAgeDays: 3200 }),
  });
  assert(!has(result, 'site-newly-registered'), 'regle forte non attendue');
  assert(!has(result, 'site-recently-registered'), 'regle moderee non attendue');
});

check('un domaine qui ne se resout pas est signale', () => {
  const result = checkSiteSync('https://disparu-exemple.com', {
    network: networkReport({ resolves: false, addresses: [] }),
  });
  assert(has(result, 'site-not-resolving'), 'site-not-resolving attendu');
});

check('un signalement de reputation prime sur le referentiel', () => {
  const result = checkSiteSync('https://www.laposte.fr', {
    network: networkReport({ reputation: 'flagged', threats: ['SOCIAL_ENGINEERING'] }),
  });
  assertEqual(result.verdict, 'phishing', 'verdict');
  assert(has(result, 'site-safe-browsing-flagged'), 'site-safe-browsing-flagged attendu');
});

// ---------------------------------------------------------------------------

console.log('');
console.log(`${passed}/${passed + failures.length} cas conformes.`);

if (failures.length > 0) {
  console.log('');
  console.log('Echecs :');
  for (const failure of failures) console.log(`  - ${failure}`);
  process.exitCode = 1;
}
