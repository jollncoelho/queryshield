/**
 * Tests hors ligne de la couche de traduction.
 *
 * Trois choses sont verifiees ici, et ce sont exactement les trois qui cassent
 * en silence dans un site multilingue :
 *
 *  1. les quatre dictionnaires portent le meme jeu de cles. Le typage le
 *     garantit deja a la compilation, mais le test couvre aussi les cartes
 *     indexees par identifiant (`findings`, `siteRecs`, `randomSignals`), que
 *     TypeScript ne controle pas de la meme facon ;
 *  2. toute regle de lien ou de site reellement produite par le moteur a une
 *     traduction dans les quatre langues — sinon l'interface bascule en
 *     francais au milieu d'une page anglaise ;
 *  3. la substitution des fragments variables fonctionne, y compris pour les
 *     indices de generation automatique transportes sous forme compacte.
 *
 * Lancement : npm run test:i18n
 */

import { analyzeSync } from '../src/lib/engine/index';
import { checkSiteSync } from '../src/lib/engine/site';
import { getDictionary } from '../src/lib/i18n/index';
import { DEFAULT_LOCALE, negotiateLocale, resolveLocale, isLocale } from '../src/lib/i18n/config';
import { localizeFinding } from '../src/lib/i18n/finding';
import { interpolate } from '../src/lib/i18n/interpolate';
import { en } from '../src/lib/i18n/locales/en';
import { es } from '../src/lib/i18n/locales/es';
import { fr, type Dictionary } from '../src/lib/i18n/locales/fr';
import { pt } from '../src/lib/i18n/locales/pt';
import { SAMPLES } from '../src/lib/samples';
import type { Finding } from '../src/lib/engine/types';

// ---------------------------------------------------------------------------
// Micro-matrice de tests (meme forme que tools/test-engine.ts)
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

/** Collecte tous les chemins de cles d'un objet, y compris dans les tableaux de valeurs. */
function keyPaths(value: unknown, prefix = ''): string[] {
  if (value === null || typeof value !== 'object') return [prefix];

  return Object.entries(value as Record<string, unknown>).flatMap(([key, child]) =>
    keyPaths(child, prefix ? `${prefix}.${key}` : key),
  );
}

const LOCALES = { fr, en, pt, es } as const;
type LocaleCode = keyof typeof LOCALES;

function finding(partial: Partial<Finding> & { id: string }): Finding {
  return {
    category: 'lien',
    severity: 'high',
    title: 'titre du moteur',
    detail: 'detail du moteur',
    weight: 20,
    sources: ['heuristique'],
    ...partial,
  };
}

// ---------------------------------------------------------------------------
// 1. Parite des dictionnaires
// ---------------------------------------------------------------------------

suite('Parite des dictionnaires');

const referenceKeys = keyPaths(fr).sort();

for (const code of Object.keys(LOCALES) as LocaleCode[]) {
  check(`« ${code} » expose exactement les memes cles que « fr »`, () => {
    const actual = keyPaths(LOCALES[code]).sort();
    const missing = referenceKeys.filter((key) => !actual.includes(key));
    const extra = actual.filter((key) => !referenceKeys.includes(key));

    assert(missing.length === 0, `cles manquantes : ${missing.join(', ')}`);
    assert(extra.length === 0, `cles en trop : ${extra.join(', ')}`);
  });
}

check('chaque libelle traduit est non vide', () => {
  for (const [code, dictionary] of Object.entries(LOCALES)) {
    for (const path of keyPaths(dictionary)) {
      const value = path
        .split('.')
        .reduce<unknown>((node, key) => (node as Record<string, unknown>)?.[key], dictionary);
      assert(typeof value === 'string' && value.trim().length > 0, `${code} / ${path} est vide`);
    }
  }
});

check('getDictionary() renvoie le dictionnaire demande', () => {
  assertEqual(getDictionary('en').meta.languageName, 'English', 'en');
  assertEqual(getDictionary('pt').meta.languageName, 'Português', 'pt');
  assertEqual(getDictionary('es').meta.languageName, 'Español', 'es');
  assertEqual(getDictionary('fr').meta.languageName, 'Français', 'fr');
});

// ---------------------------------------------------------------------------
// 2. Couverture des regles produites par le moteur
// ---------------------------------------------------------------------------

suite('Couverture des regles');

/**
 * Corpus volontairement large : l'objectif n'est pas de tester la detection
 * (tools/test-engine.ts s'en charge) mais de faire remonter le maximum
 * d'identifiants de regles differentes.
 */
const CORPUS = [
  'Urgent : votre colis est bloque. Reglez ici : http://192.168.4.7/pay',
  'Connexion requise : https://paypal.com.secure-login.xyz/account/verify',
  'Remboursement : https://impots.gouv.fr.remboursement-fast.top/login',
  'Gains debloques : http://casino-bonus-jackpot.xyz/retrait',
  'Votre compte : https://xn--pypal-4ve.com/signin',
  'Cliquez : https://bit.ly/3xYz',
  'Offre limitee : http://exemple.top/a?url=http://evil.example/%68%74%74%70%73%3a%2f%2f',
  'Facture : https://facture-secure-2024-urgent-paiement-immediat.com/paie',
  'Suivi : http://exemple.com:8443/account/update/password/verify/login',
  'Texte du lien : <a href="http://evil.example/">https://banque-officielle.fr</a>',
  'Piece jointe : javascript:alert(1)',
  'Adresse : https://kdvmghvjusprqsfhsgdxjmsx.com/a',
  'Compte : https://impots.gouv.fr.secure-login.xyz',
  'Virement : https://credit-agricole-securite.xyz',
  'Message : https://a.b.c.d.e.exemple.com/x',
  'Retrait : https://win-big-lottery-sweepstake-prize.xyz',
];

function collectMessageRuleIds(): Set<string> {
  const ids = new Set<string>();
  for (const text of CORPUS) {
    const result = analyzeSync({ text, channel: 'email' });
    for (const item of result.findings) {
      if (item.id.startsWith('url-')) ids.add(item.id);
    }
  }
  return ids;
}

const SITE_CORPUS = [
  'https://www.laposte.fr/outils/suivi-colis',
  'credit-agricole-securite.xyz',
  'https://impots.gouv.fr.secure-login.xyz/remboursement',
  'https://kdvmghvjusprqsfhsgdxjmsx.com',
  'http://exemple-inconnu.com/connexion',
];

function collectSiteRuleIds(): Set<string> {
  const ids = new Set<string>();
  for (const url of SITE_CORPUS) {
    const result = checkSiteSync(url, {
      network: {
        attempted: true,
        resolves: false,
        addresses: [],
        registeredAt: '2026-10-10T00:00:00Z',
        domainAgeDays: 2,
        registrar: 'Exemple Registrar',
        reputation: 'flagged',
        reputationSource: 'test',
        threats: ['SOCIAL_ENGINEERING'],
        errors: [],
      },
    });
    for (const item of result.findings) {
      if (item.id.startsWith('site-') || item.id.startsWith('url-')) ids.add(item.id);
    }
  }
  return ids;
}

const observedRuleIds = new Set([...collectMessageRuleIds(), ...collectSiteRuleIds()]);

check('le corpus declenche un nombre significatif de regles', () => {
  assert(
    observedRuleIds.size >= 20,
    `seulement ${observedRuleIds.size} regles observees : le corpus ne couvre plus assez de cas`,
  );
});

for (const code of Object.keys(LOCALES) as LocaleCode[]) {
  check(`« ${code} » traduit toutes les regles url-* et site-* observees`, () => {
    const catalogue = LOCALES[code].findings as Record<string, unknown>;
    const missing = Array.from(observedRuleIds).filter((id) => !catalogue[id]);
    assert(missing.length === 0, `regles sans traduction : ${missing.join(', ')}`);
  });
}

check('les identifiants de recommandation du verificateur de site sont traduits', () => {
  const emitted = new Set<string>();
  for (const url of [...SITE_CORPUS, 'pas-une-adresse', 'https://www.impots.gouv.fr']) {
    for (const item of checkSiteSync(url).recommendations) emitted.add(item.id);
  }

  assert(emitted.size >= 4, `seulement ${emitted.size} recommandations observees`);

  for (const code of Object.keys(LOCALES) as LocaleCode[]) {
    const catalogue = LOCALES[code].siteRecs as Record<string, string | undefined>;
    const missing = Array.from(emitted).filter((id) => !catalogue[id]);
    assert(missing.length === 0, `${code} : recommandations sans traduction : ${missing.join(', ')}`);
  }
});

check('chaque regle traduite porte un titre et un detail non vides', () => {
  for (const [code, dictionary] of Object.entries(LOCALES)) {
    for (const [id, entry] of Object.entries(dictionary.findings as Record<string, { title: string; detail: string }>)) {
      assert(entry.title.trim().length > 0, `${code} / ${id} : titre vide`);
      assert(entry.detail.trim().length > 0, `${code} / ${id} : detail vide`);
    }
  }
});

check('chaque exemple de demonstration a un libelle traduit', () => {
  const missing: string[] = [];

  for (const [code, dictionary] of Object.entries(LOCALES)) {
    const catalogue = dictionary.samples as Record<string, { label: string; hint: string } | undefined>;
    for (const sample of SAMPLES) {
      const entry = catalogue[sample.id];
      if (!entry || entry.label.trim().length === 0 || entry.hint.trim().length === 0) {
        missing.push(`${code}/${sample.id}`);
      }
    }
  }

  assert(missing.length === 0, `exemples sans libelle traduit : ${missing.join(', ')}`);
});

// ---------------------------------------------------------------------------
// 3. Substitution des fragments variables
// ---------------------------------------------------------------------------

suite('Substitution des fragments');

check('un parametre present est remplace', () => {
  assertEqual(interpolate('Bonjour {nom}, {n} message(s)', { nom: 'Ada', n: 3 }), 'Bonjour Ada, 3 message(s)', 'rendu');
});

check('un parametre absent laisse le gabarit intact', () => {
  assertEqual(interpolate('Valeur : {inconnu}', {}), 'Valeur : {inconnu}', 'rendu');
});

check('sans parametres, le gabarit est renvoye tel quel', () => {
  assertEqual(interpolate('Aucun {champ}'), 'Aucun {champ}', 'rendu');
});

check('un parametre numerique est converti en texte', () => {
  assertEqual(interpolate('{count} regle(s)', { count: 0 }), '0 regle(s)', 'rendu');
});

// ---------------------------------------------------------------------------
// 4. Negociation de la langue
// ---------------------------------------------------------------------------

suite('Negociation de la langue');

check('un en-tete simple est reconnu', () => {
  assertEqual(negotiateLocale('en'), 'en', 'en');
  assertEqual(negotiateLocale('pt'), 'pt', 'pt');
  assertEqual(negotiateLocale('es'), 'es', 'es');
});

check('une variante regionale retombe sur la langue de base', () => {
  assertEqual(negotiateLocale('pt-BR,pt;q=0.9,en;q=0.8'), 'pt', 'pt-BR');
  assertEqual(negotiateLocale('es-419'), 'es', 'es-419');
  assertEqual(negotiateLocale('fr-CA'), 'fr', 'fr-CA');
});

check('la langue de plus haute priorite est retenue', () => {
  assertEqual(negotiateLocale('de;q=0.9,en;q=0.7,fr;q=0.3'), 'en', 'en avant fr');
  assertEqual(negotiateLocale('de;q=0.9,fr;q=0.7,en;q=0.3'), 'fr', 'fr avant en');
});

check('une langue non prise en charge est ignoree', () => {
  assertEqual(negotiateLocale('de,it,ja'), null, 'aucune correspondance');
  assertEqual(negotiateLocale(''), null, 'en-tete vide');
  assertEqual(negotiateLocale(null), null, 'en-tete absent');
});

check('le cookie prime sur l en-tete du navigateur', () => {
  assertEqual(resolveLocale('en', 'fr-FR'), 'en', 'cookie respecte');
});

check('sans cookie, l en-tete du navigateur decide', () => {
  assertEqual(resolveLocale(undefined, 'pt-PT'), 'pt', 'pt');
});

check('sans aucune indication, le francais est servi', () => {
  assertEqual(resolveLocale(undefined, undefined), DEFAULT_LOCALE, 'defaut');
  assertEqual(resolveLocale('klingon', 'de'), 'fr', 'valeur invalide ignoree');
});

check('isLocale() ne retient que les codes pris en charge', () => {
  assert(isLocale('en'), 'en accepte');
  assert(!isLocale('EN'), 'la casse doit etre stricte');
  assert(!isLocale('de'), 'de refuse');
  assert(!isLocale(42), 'un nombre est refuse');
});

// ---------------------------------------------------------------------------
// 5. Localisation des constats du moteur
// ---------------------------------------------------------------------------

suite('Localisation des constats');

check('une regle traduite utilise le gabarit de la langue', () => {
  const item = finding({ id: 'url-risky-tld' });
  const rendered = localizeFinding(item, en);
  assertEqual(rendered.title, 'High-risk domain extension', 'titre');
  assert(rendered.detail.includes('phishing campaigns'), `detail traduit : ${rendered.detail}`);
  assert(rendered.detail !== item.detail, 'le detail ne doit pas rester celui du moteur');
});

check('les parametres sont substitues dans la langue cible', () => {
  const item = finding({ id: 'url-institutional-mimicry', params: { words: 'gouvernement' } });
  const rendered = localizeFinding(item, en);
  assert(rendered.detail.includes('gouvernement'), `« gouvernement » doit apparaitre : ${rendered.detail}`);
  assert(!rendered.detail.includes('{words}'), 'aucun gabarit residuel');
});

check('les indices de generation automatique sont rendus depuis leurs codes', () => {
  const item = finding({
    id: 'url-random-domain',
    params: { signalCodes: 'entropy-high=3.51|consonant-run=7' },
  });

  const english = localizeFinding(item, en);
  assert(english.detail.includes('high entropy (3.51 bits per character)'), `entropie : ${english.detail}`);
  assert(english.detail.includes('7 consecutive consonants'), `consonnes : ${english.detail}`);

  const spanish = localizeFinding(item, es);
  assert(spanish.detail.includes('entropía alta (3.51 bits por carácter)'), `es : ${spanish.detail}`);
  assert(spanish.detail.includes('7 consonantes consecutivas'), `es : ${spanish.detail}`);

  assert(!english.detail.includes('signalCodes'), 'la cle technique ne doit pas fuir');
});

check('un code inconnu est laisse visible plutot que supprime', () => {
  const item = finding({ id: 'url-random-domain', params: { signalCodes: 'code-inexistant=1' } });
  const rendered = localizeFinding(item, en);
  assert(rendered.detail.includes('code-inexistant=1'), `code brut attendu : ${rendered.detail}`);
});

check('un constat sans traduction retombe sur le texte francais du moteur', () => {
  const item = finding({ id: 'lex-casino-lure', title: 'Titre moteur', detail: 'Detail moteur' });
  const rendered = localizeFinding(item, en);
  assertEqual(rendered.title, 'Titre moteur', 'titre de repli');
  assertEqual(rendered.detail, 'Detail moteur', 'detail de repli');
});

check('les parametres sont substitues dans le resume du verificateur de site', () => {
  const rendered = localizeFinding(
    finding({ id: 'site-newly-registered', params: { days: 2, date: '2026-10-10' } }),
    pt,
  );
  assert(rendered.detail.includes('2 dia(s)'), `jours : ${rendered.detail}`);
  assert(rendered.detail.includes('2026-10-10'), `date : ${rendered.detail}`);
  assert(!rendered.detail.includes('{days}'), 'aucun gabarit residuel');
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
