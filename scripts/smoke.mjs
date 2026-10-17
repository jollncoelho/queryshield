/**
 * Test de fumee du moteur.
 *
 * Envoie les exemples de demonstration a l'API locale et verifie que chaque
 * message obtient le verdict attendu. A lancer avec le serveur deja demarre :
 *
 *   npm run dev
 *   npm run smoke
 */

const BASE_URL = process.env.QUERYSHIELD_BASE_URL ?? 'http://localhost:4321';

const CASES = [
  {
    label: 'SMS colis bloque',
    expect: 'dangerous',
    payload: {
      channel: 'sms',
      text: "CHRONOPOST : Votre colis n°3Z89FR est bloque au centre de tri. Des frais de dedouanement de 2,49 EUR sont requis sous 24h pour la livraison. Reglez ici : http://chronopost-livraison-suivi.top/frais-colis",
    },
  },
  {
    label: 'Fausse banque avec en-tetes DMARC en echec',
    expect: 'dangerous',
    payload: {
      channel: 'email',
      subject: 'Action requise : verification de votre compte',
      text: "Cher client, nous avons detecte une activite inhabituelle sur votre compte. Votre acces sera suspendu sous 48h. Merci de saisir vos coordonnees bancaires et le code recu par SMS sur notre portail : http://securite-credit-agricole.xyz/verification-client",
      rawHeaders: [
        'Authentication-Results: mx.google.com; spf=fail smtp.mailfrom=credit-agricole-info.xyz; dkim=none; dmarc=fail header.from=credit-agricole-info.xyz',
        'From: "Credit Agricole Securite" <securite@credit-agricole-info.xyz>',
        'Reply-To: recuperation-compte@mail-recuperation.top',
        'Message-ID: <8f2c1a@mail-recuperation.top>',
      ].join('\n'),
    },
  },
  {
    label: 'Faux conseiller bancaire',
    expect: 'dangerous',
    payload: {
      channel: 'messaging',
      text: "Bonjour, je suis conseiller au service fraude de votre banque. Nous avons detecte une tentative de paiement de 890 EUR. Pour bloquer l'operation, communiquez-moi le code a 6 chiffres que vous venez de recevoir par SMS. Ne parlez a personne de cet appel, l'operation est confidentielle.",
    },
  },
  {
    label: 'Faux support technique',
    expect: 'dangerous',
    payload: {
      channel: 'unknown',
      text: "ALERTE : votre ordinateur est infecte par un virus. Vos fichiers seront chiffres si vous n'agissez pas immediatement. Appelez le 0899 123 456 (2,99 EUR par appel) pour joindre le support Microsoft. Nos techniciens prendront en main votre PC avec TeamViewer.",
    },
  },
  {
    label: 'Faux gain crypto',
    expect: 'dangerous',
    payload: {
      channel: 'email',
      subject: 'FELICITATIONS',
      text: "FELICITATIONS ! Vous avez ete selectionne pour recevoir un bonus de 4 500 EUR en Bitcoin. Notre plateforme garantit un rendement de 18 % par mois. Pour activer votre compte, transmettez votre phrase de recuperation a 12 mots puis reglez les frais d'activation de 250 EUR par virement instantane.",
    },
  },
  {
    label: 'Faux gain depuis un domaine genere',
    expect: 'dangerous',
    payload: {
      channel: 'email',
      subject: 'Votre bonus vous attend',
      text: [
        'De : "Service Recompenses" <contact@kdvmghvjusprqsfhsgdxjmsx.com>',
        'Objet : Votre bonus vous attend',
        '',
        'Bonjour,',
        'Vous avez ete selectionne pour recevoir un bonus exceptionnel de 500 EUR.',
        'Votre cagnotte reste disponible pendant 48 heures.',
      ].join('\n'),
    },
  },
  {
    label: 'Fausse administration (domaine deforme)',
    expect: 'dangerous',
    payload: {
      channel: 'email',
      subject: 'Votre remboursement',
      text: [
        'De : "Direction Generale" <service@secure.overnmentarious.com>',
        'Objet : Votre remboursement',
        '',
        'Bonjour, un remboursement de 240 EUR vous est du. Merci de confirmer votre identite.',
      ].join('\n'),
    },
  },
  {
    label: 'Offre de casino non sollicitee',
    expect: 'dangerous',
    payload: {
      channel: 'email',
      subject: '50 free spins offerts',
      text: [
        'De : "Lucky Spin" <promo@lucky-spin-bonus-casino.com>',
        'Objet : 50 free spins offerts',
        '',
        'Profitez de 50 free spins et d un bonus de bienvenue de 200 EUR.',
        'Deposez 20 EUR pour activer votre bonus.',
      ].join('\n'),
    },
  },
  {
    label: 'Notification RH legitime (controle)',
    expect: 'safe',
    payload: {
      channel: 'email',
      sender: 'RH <rh@exemple-organisme.fr>',
      subject: 'Votre bulletin de paie de juin',
      text: 'Bonjour, votre bulletin de paie de juin inclut une prime exceptionnelle liee a l anciennete. Le detail figure en page 2 de votre espace.',
    },
  },
  {
    label: 'Message legitime (controle)',
    expect: 'safe',
    payload: {
      channel: 'email',
      subject: 'Votre commande CMD-88213 a ete expediee',
      text: "Bonjour, votre commande n°CMD-88213 a ete expediee ce matin depuis notre entrepot de Lille. Vous pouvez suivre son acheminement depuis votre espace client : https://www.laposte.fr/outils/suivi-colis?id=CMD-88213",
    },
  },
  {
    label: 'Newsletter neutre (controle)',
    expect: 'safe',
    payload: {
      channel: 'email',
      text: "Bonjour, les inscriptions a notre prochaine session de formation sont ouvertes. Le programme complet est disponible sur https://www.exemple-organisme.fr/formations/2026. A bientot.",
    },
  },
];

async function run() {
  let passed = 0;
  const failures = [];

  for (const testCase of CASES) {
    let payload;
    try {
      const response = await fetch(`${BASE_URL}/api/analyze`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(testCase.payload),
      });
      payload = await response.json();
    } catch (error) {
      failures.push(`${testCase.label} — appel impossible (${error.message})`);
      console.log(`  ERREUR  ${testCase.label} — ${error.message}`);
      continue;
    }

    const ok = payload.verdict === testCase.expect;
    if (ok) passed += 1;

    const line = [
      ok ? '  OK    ' : '  ECHEC ',
      testCase.label.padEnd(46),
      `attendu=${testCase.expect}`.padEnd(20),
      `obtenu=${payload.verdict}`.padEnd(20),
      `score=${String(payload.score).padStart(3)}`,
      `signaux=${payload.findings?.length ?? 0}`,
    ].join(' ');

    console.log(line);

    if (!ok) {
      failures.push(
        `${testCase.label} — attendu ${testCase.expect}, obtenu ${payload.verdict} (score ${payload.score})`,
      );
      for (const finding of payload.findings ?? []) {
        console.log(`            - [${finding.severity}] ${finding.id} : ${finding.title}`);
      }
    }
  }

  console.log('');
  console.log(`${passed}/${CASES.length} cas conformes.`);

  if (failures.length > 0) {
    console.log('');
    console.log('Echecs :');
    for (const failure of failures) console.log(`  - ${failure}`);
    process.exitCode = 1;
  }
}

run();
