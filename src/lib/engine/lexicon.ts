/**
 * Lexique d'ingenierie sociale (francais + anglais).
 *
 * Chaque regle porte une severite et un texte explicatif. Le moteur ne se
 * contente pas de compter les mots-cles : les regles marquees
 * `requiresSolicitation` ne se declenchent que si un verbe de sollicitation
 * apparait a proximite, ce qui divise fortement les faux positifs sur les
 * messages transactionnels legitimes.
 */

import type { FindingCategory, Severity } from './types';

export interface LexRule {
  id: string;
  category: FindingCategory;
  severity: Severity;
  title: string;
  detail: string;
  patterns: RegExp[];
  /** Exige un verbe de sollicitation dans une fenetre autour de la correspondance. */
  requiresSolicitation?: boolean;
  /** Fenetre (en caracteres) autour de la correspondance. Defaut : 110. */
  window?: number;
  /**
   * Severite retenue lorsque l'expediteur est un domaine officiel verifie.
   * Permet de ne pas penaliser une communication legitime d'une marque qui
   * parlerait de promotions : la regle passe en signal faible au lieu de
   * disparaitre, ce qui garde le raisonnement auditable.
   */
  severityIfTrustedSender?: Severity;
}

/** Verbes et formulations par lesquels un escroc reclame quelque chose. */
export const SOLICITATION_RE = new RegExp(
  [
    'communique[zr]', 'transmett(?:ez|re)', 'envoy(?:ez|er)', 'saisiss(?:ez|e)',
    'entr(?:ez|er)', 'indiqu(?:ez|er)', 'confirm(?:ez|er)', 'valid(?:ez|er)',
    'renseign(?:ez|er)', 'fourniss(?:ez|er)', 'renseigner', 'nous (?:avons )?besoin',
    'merci de (?:nous )?(?:envoyer|indiquer|fournir|confirmer|valider|communiquer)',
    'r[ée]pondez (?:avec|par|en)', 'reply with', 'provide', 'send (?:us|me)',
    'enter your', 'confirm your', 'update your', 'share your', 'fill in',
    'mettez [àa] jour vos', 'mettre [àa] jour vos', 'v[ée]rifiez vos',
  ].join('|'),
  'i',
);

export const LEXICON: LexRule[] = [
  // --- Urgence -------------------------------------------------------------
  {
    id: 'lex-urgency',
    category: 'ingenierie-sociale',
    severity: 'medium',
    title: 'Pression temporelle',
    detail:
      'Le message impose un delai tres court. L urgence artificielle est le levier numero un de l hameconnage : elle empeche la victime de verifier aupres de la source officielle.',
    patterns: [
      /\b(imm[ée]diatement|dans les? (?:24|48|72) ?h(?:eures)?|sous \d+ ?h(?:eures)?|avant ce soir|aujourd'?hui avant|derni[èe]re chance|dernier (?:avertissement|rappel|d[ée]lai)|d[ée]lai expir[ée]|expire (?:aujourd'?hui|dans|bient[ôo]t)|sans plus attendre|au plus vite|en urgence|urgent(?:e)?|act now|immediately|within \d+ hours|final notice|expires today|last warning|action required|time[- ]sensitive|limited time)\b/i,
    ],
  },

  // --- Menaces -------------------------------------------------------------
  {
    id: 'lex-threat-suspension',
    category: 'ingenierie-sociale',
    severity: 'high',
    title: 'Menace de suspension de compte',
    detail:
      'Le message annonce une suspension, un blocage ou une fermeture de compte. Aucun organisme serieux ne gere ce type de situation par un message non sollicite contenant un lien.',
    patterns: [
      /(?:compte|acc[èe]s|espace client|carte|forfait|ligne|abonnement|profil|portefeuille)[^.!?\n]{0,40}(?:suspendu|suspendue|bloqu[ée]|cl[ôo]tur[ée]|d[ée]sactiv[ée]|restreint|verrouill[ée]|sera (?:ferm[ée]|supprim[ée]|cl[ôo]tur[ée]|d[ée]sactiv[ée])|a [ée]t[ée] (?:ferm[ée]|suspendu|bloqu[ée]))/i,
      /(?:account|access|card|subscription|profile)[^.!?\n]{0,40}(?:suspended|blocked|closed|deactivated|restricted|locked|will be (?:closed|terminated|suspended))/i,
    ],
  },
  {
    id: 'lex-threat-legal',
    category: 'ingenierie-sociale',
    severity: 'high',
    title: 'Menace judiciaire ou financiere',
    detail:
      'Le message agite des poursuites, une amende ou un huissier. C est une intimidation classique destinee a provoquer un paiement immediat sans verification.',
    patterns: [
      /\b(poursuites? (?:judiciaires?|p[ée]nales?)|contentieux|huissier|saisie (?:sur|de)|sous peine de|amende (?:de |forfaitaire)|majoration de \d|plainte (?:sera|est) d[ée]pos[ée]e?|poursuites judiciaires|recouvrement forc[ée]|mise en demeure)\b/i,
    ],
  },
  {
    id: 'lex-threat-payment',
    category: 'ingenierie-sociale',
    severity: 'medium',
    title: 'Incident de paiement ou de livraison invoque',
    detail:
      'Le message invoque un paiement refuse, un colis bloque ou une commande en souffrance. Ce pretexte est tres utilise pour faire cliquer vers une page de saisie de carte bancaire.',
    patterns: [
      /(?:votre|le|la|une?)\s(?:paiement|pr[ée]l[èe]vement|colis|commande|livraison|transaction|transfert|remboursement|facture)[^.!?\n]{0,40}(?:refus[ée]|rejet[ée]|bloqu[ée]|en attente|suspendu|impossible|[ée]chou[ée]|non (?:livr[ée]|pay[ée])|introuvable|n a pas pu)/i,
    ],
  },

  // --- Usurpation d'autorite ----------------------------------------------
  {
    id: 'lex-authority-public',
    category: 'identite',
    severity: 'low',
    title: 'Reference a une administration',
    detail:
      'Le message se reclame d une administration. Prise isolement cette mention est banale, mais combinee a une urgence et a un lien elle caracterise une usurpation.',
    patterns: [
      /\b(imp[ôo]ts?|dgfip|finances publiques|ameli|assurance maladie|cpam|urssaf|caf|france travail|p[ôo]le emploi|ants|service-public|tr[ée]sor public|pr[ée]fecture|gendarme(?:rie)?|police nationale|dgccrf|mairie|centre des imp[ôo]ts)\b/i,
    ],
  },
  {
    id: 'lex-authority-carrier',
    category: 'identite',
    severity: 'low',
    title: 'Reference a un transporteur',
    detail:
      'Le message se reclame d un transporteur ou d un service de livraison. Pretexte tres courant pour obtenir un paiement de « frais » inexistants.',
    patterns: [
      /\b(chronopost|colissimo|la poste|mondial relay|dhl|ups|fedex|dpd|gls|bpost|hermes|suivi de colis|numero de suivi)\b/i,
    ],
  },
  {
    id: 'lex-authority-support',
    category: 'identite',
    severity: 'high',
    title: 'Faux support technique',
    detail:
      'Le message se presente comme un support technique et evoque une infection ou une compromission. Ce scenario conduit presque toujours a une prise de controle a distance de la machine.',
    patterns: [
      /(?:votre|le)\s(?:ordinateur|appareil|pc|mac|syst[èe]me|t[ée]l[ée]phone|compte)\s(?:est\s)?(?:infect[ée]|compromis|pirat[ée]|bloqu[ée]|vuln[ée]rable)/i,
      /\b(virus|malware|rancongiciel|ransomware)\s(?:d[ée]tect[ée]|trouv[ée]|identifi[ée])/i,
      /\bsupport (?:technique|microsoft|apple|windows|google)\b/i,
      /\bvos fichiers (?:ont [ée]t[ée]|seront|vont [êe]tre) (?:chiffr[ée]s|supprim[ée]s|vol[ée]s)\b/i,
    ],
  },

  // --- Acces a distance ----------------------------------------------------
  {
    id: 'lex-remote-access',
    category: 'ingenierie-sociale',
    severity: 'high',
    title: 'Prise de controle a distance',
    detail:
      'Le message demande d installer un outil de prise en main a distance ou un logiciel. Une fois connecte, l escroc pilote la machine et les operations bancaires.',
    patterns: [
      /\b(teamviewer|anydesk|ultraviewer|rustdesk|supremo|logmein|ammyy)\b/i,
      /\b(?:prise en main|[àa] distance|acc[èe]s distant)[^.!?\n]{0,30}(?:de votre|sur votre|votre (?:ordinateur|pc|machine))/i,
      /\b(?:installez|t[ée]l[ée]chargez|lancez)[^.!?\n]{0,40}(?:ce|cette|cet)\s(?:logiciel|application|outil|programme|extension)/i,
    ],
  },

  // --- Donnees sensibles (sollicitation explicite) ------------------------
  {
    id: 'lex-credential-request',
    category: 'donnees-sensibles',
    severity: 'critical',
    title: 'Demande de mot de passe ou de code',
    detail:
      'Le message reclame un mot de passe, un identifiant ou un code recu par SMS. Aucun service legitime ne demande jamais ces elements, meme par telephone. C est le signal le plus fort du moteur.',
    patterns: [
      /(?:mot de passe|password|identifiant|code (?:de )?s[ée]curit[ée]|code (?:de )?validation|code [àa] \d chiffres|code de connexion|code re[çc]u par sms|code sms|otp|one[- ]time|code d acc[èe]s|code confidentiel)/i,
    ],
    requiresSolicitation: true,
  },
  {
    id: 'lex-credential-2fa',
    category: 'donnees-sensibles',
    severity: 'critical',
    title: 'Demande de code de double authentification',
    detail:
      'Le message demande de transmettre un code de double authentification. Cela signifie que l escroc possede deja le mot de passe et tente de finaliser une connexion a votre place.',
    patterns: [
      /(?:double authentification|2fa|authentification [àa] deux facteurs|code [àa] usage unique|validation en deux [ée]tapes|code temporaire)/i,
    ],
    requiresSolicitation: true,
  },
  {
    id: 'lex-bank-data-request',
    category: 'donnees-sensibles',
    severity: 'critical',
    title: 'Demande de donnees bancaires',
    detail:
      'Le message reclame des informations de carte bancaire ou un RIB. C est une tentative de fraude directe : aucune banque ne collecte ces donnees par message.',
    patterns: [
      /(?:num[ée]ro de carte|cryptogramme|cvv|cvc|code [àa] 3 chiffres|coordonn[ée]es bancaires|informations bancaires|donn[ée]es bancaires|iban|rib|code de carte|date d expiration de (?:la|votre) carte)/i,
    ],
    requiresSolicitation: true,
  },
  {
    id: 'lex-crypto-seed-request',
    category: 'donnees-sensibles',
    severity: 'critical',
    title: 'Demande de phrase de recuperation crypto',
    detail:
      'Le message reclame une phrase de recuperation, une cle privee ou l installation d un portefeuille. La phrase de recuperation donne un acces total et irreversible aux fonds.',
    patterns: [
      /(?:phrase de r[ée]cup[ée]ration|seed phrase|seed|12 mots|24 mots|cl[ée] priv[ée]|private key|phrase secr[èe]te)/i,
    ],
    requiresSolicitation: true,
  },
  {
    id: 'lex-identity-documents',
    category: 'donnees-sensibles',
    severity: 'high',
    title: 'Collecte de documents d identite',
    detail:
      'Le message demande une piece d identite, un justificatif ou un numero de securite sociale. Ces documents servent a l ouverture de comptes frauduleux a votre nom.',
    patterns: [
      /(?:pi[èe]ce d identit[ée]|carte d identit[ée]|passeport|permis de conduire|num[ée]ro de s[ée]curit[ée] sociale|justificatif de domicile|copie de votre (?:carte|passeport)|photo de votre (?:carte|passeport))/i,
    ],
    requiresSolicitation: true,
  },

  // --- Secret impose -------------------------------------------------------
  {
    id: 'lex-secrecy-pressure',
    category: 'ingenierie-sociale',
    severity: 'critical',
    title: 'Injonction au secret',
    detail:
      'Le message demande de ne rien dire, notamment a votre banque. Cette consigne n a aucun fondement legitime : elle sert uniquement a empecher le declenchement des procedures de protection.',
    patterns: [
      /(?:ne (?:le )?dites (?:rien|[àa] personne)|ne parlez (?:àa personne|[àa] personne)|n en parlez [àa] personne|ne parlez pas de (?:ceci|cela|cette)|rest(?:ez|e) (?:discret|discrete|confidentiel)|op[ée]ration confidentielle|sans en informer|ne contactez pas|ne raccrochez pas|ne quittez pas des yeux|agissez seul)/i,
    ],
  },

  // --- Appats financiers ---------------------------------------------------
  {
    id: 'lex-financial-lure',
    category: 'ingenierie-sociale',
    severity: 'medium',
    title: 'Appat financier',
    detail:
      'Le message promet un gain, un remboursement ou une opportunite d investissement. L appat financier sert a faire baisser la vigilance avant la demande de donnees ou de paiement.',
    patterns: [
      /\b(vous avez gagn[ée]|vous [êe]tes s[ée]lectionn[ée]|f[ée]licitations[^.!?\n]{0,30}(?:gagn|s[ée]lectionn|tirage|loterie)|cagnotte|h[ée]ritage|succession [àa] r[ée]gler|remboursement (?:de |d un montant)|prime exceptionnelle|bonus exceptionnel|allocation exceptionnelle)\b/i,
      /\b(investissement (?:garanti|s[ûu]r|rentable|miracle)|rendement (?:garanti|assur[ée]|de \d)|gains? garantis?|sans aucun risque|doubler (?:votre|ton) (?:capital|argent)|revenu compl[ée]mentaire|travail [àa] domicile[^.!?\n]{0,25}(?:gagner|revenu|\d+ ?€))\b/i,
      // Couverture anglophone : une part importante des campagnes ciblees sur
      // l'Europe est redigee en anglais, y compris a destination d'utilisateurs
      // francophones.
      /\b(you(?:'ve| have) won|you are (?:a )?winner|you have been selected|congratulations[^.!?\n]{0,30}(?:won|winner|selected|prize)|claim your (?:prize|reward|bonus|winnings)|unclaimed (?:funds|money|prize)|lucky winner|exclusive (?:reward|offer) for you)\b/i,
      /\b(guaranteed (?:returns?|profit|income)|risk[- ]free (?:investment|profit)|\d{2,3}\s?%\s?(?:per|a) (?:month|week|day|year)|double your (?:money|investment|capital)|passive income)\b/i,
    ],
  },
  {
    id: 'lex-gambling-lure',
    category: 'ingenierie-sociale',
    severity: 'high',
    title: 'Appat de casino ou de paris',
    detail:
      'Le message propose des tours gratuits, un bonus de bienvenue ou un pari avantageux. Ces envois de masse servent a collecter des coordonnees bancaires a l inscription, ou a faire deposer de l argent sur une plateforme sans licence. Le signal est fort des lors que l expediteur n est pas un operateur officiel verifie.',
    patterns: [
      /\b(free ?spins?|no[- ]deposit bonus|welcome bonus|deposit bonus|match bonus|bonus code|promo code|claim (?:your )?bonus|jackpot|slot(?:s| machine)?|roulette|blackjack|poker|betting|sports?book|wager|odds booster|cashback bonus)\b/i,
      /\b(casino|gambling|bet(?:ting)? (?:now|today)|play now|spin to win|mega ?win|big ?win|instant win|daily jackpot)\b/i,
      /\b(tours? gratuits?|bonus de bienvenue|bonus sans d[ée]p[ôo]t|machine [àa] sous|paris sportifs|pariez|jouez (?:maintenant|et gagnez)|cagnotte|gros lot)\b/i,
      /\b(?:deposit|deposer|d[ée]p[ôo]t)[^.!?\n]{0,30}(?:\d+\s?(?:€|\$|EUR|USD)|to (?:claim|unlock|activate|withdraw))/i,
    ],
    severityIfTrustedSender: 'low',
  },
  {
    id: 'lex-withdrawal-bait',
    category: 'ingenierie-sociale',
    severity: 'high',
    title: 'Retrait de gains conditionne',
    detail:
      'Le message annonce des gains a retirer mais subordonne le retrait a une action prealable : verifier un compte, payer des frais ou saisir des coordonnees bancaires. C est le mecanisme central de la fraude au faux gain : la victime croit recuperer un pactole et paie pour rien.',
    patterns: [
      /\b(?:withdraw|retirer|r[ée]cup[ée]rer|encaisse[rz]?)[^.!?\n]{0,60}(?:verif|confirm|activ|d[ée]bloqu|claim|frais|fee|tax|identif|coordonn[ée]es|bank|bancaire)/i,
      /\b(?:before you can|in order to|to be able to)[^.!?\n]{0,40}(?:withdraw|claim|receive|get)[^.!?\n]{0,40}(?:you (?:must|need)|verify|pay|confirm)/i,
      /\b(?:release fee|processing fee|withdrawal fee|clearance fee|frais de (?:retrait|d[ée]blocage|traitement)|taxe de (?:d[ée]blocage|transfert))/i,
    ],
  },
  {
    id: 'lex-guaranteed-returns',
    category: 'ingenierie-sociale',
    severity: 'high',
    title: 'Rendement garanti',
    detail:
      'Le message promet un rendement garanti ou un pourcentage de gain anormal. Aucun placement legitime ne garantit un rendement, et ce type d offre releve presque toujours de la fraude.',
    patterns: [
      /\b(?:rendement|gain|profit|b[ée]n[ée]fice)s? (?:garanti|assur[ée]|fixe)s?\b/i,
      /\b\d{2,3}\s?%\s?(?:par|de)\s?(?:mois|semaine|jour|an)\b/i,
      /\b(?:capital|mise)\s(?:doubl[ée]|tripl[ée])/i,
    ],
  },

  // --- Actions demandees ---------------------------------------------------
  {
    id: 'lex-action-click',
    category: 'ingenierie-sociale',
    severity: 'medium',
    title: 'Appel au clic',
    detail:
      'Le message pousse explicitement a cliquer sur un lien. Verifiez toujours la destination reelle avant de cliquer, et privilegiez la saisie manuelle de l adresse officielle.',
    patterns: [
      /\b(cliquez (?:ici|sur ce lien|ci-dessous|sur le lien|maintenant)|cliquez pour (?:v[ée]rifier|confirmer|vous connecter|activer|d[ée]bloquer|r[ée]clamer)|ouvrez ce lien|suivez ce lien|acc[ée]dez (?:ici|[àa] votre)|connectez[- ]vous (?:ici|via|en cliquant)|click here|verify now|confirm now|update now|r[ée]pondez (?:oui|stop|1|o)\b)/i,
    ],
  },
  {
    id: 'lex-qr-code',
    category: 'ingenierie-sociale',
    severity: 'medium',
    title: 'Renvoi vers un QR code',
    detail:
      'Le message renvoie vers un QR code. Le QR code masque totalement l adresse de destination : c est un vecteur d hameconnage de plus en plus utilise (faux avis de contravention, faux courriers).',
    patterns: [
      /\b(scannez|scannez le|flashez)[^.!?\n]{0,25}(?:qr ?code|code qr)/i,
      /\bqr ?code\b[^.!?\n]{0,25}(?:ci[- ]dessous|ci[- ]joint|pour (?:payer|valider|acc[ée]der))/i,
    ],
  },
  {
    id: 'lex-direct-payment',
    category: 'donnees-sensibles',
    severity: 'high',
    title: 'Demande de paiement direct',
    detail:
      'Le message reclame un virement, des frais ou un paiement par coupon prepaye. Les moyens de paiement non reversibles sont le signe d une fraude financiere.',
    patterns: [
      /\b(?:r[ée]gler|payer|verser|effectuer un virement|envoyer (?:de )?l argent)[^.!?\n]{0,60}(?:imm[ée]diatement|maintenant|au plus vite|sous \d|sans (?:plus )?attendre|dans les plus brefs)/i,
      /\b(?:frais|droit)s? d[ e](?:d[ée]douanement|livraison|dossier|notaire|d[ée]blocage|traitement|ouverture|activation|mise en service|r[ée]exp[ée]dition)\b/i,
      /\b(?:avance de frais|caution [àa] verser|paiement des frais|r[ée]gler les frais|frais [àa] r[ée]gler)\b/i,
      /\b(?:western union|moneygram|carte (?:transcash|pcs|neosurf)|coupon (?:pcs|paysafecard)|carte pr[ée]pay[ée]|paiement par (?:mandat|coupon|carte pr[ée]pay[ée]))\b/i,
      /\b(?:par|via|en)\s(?:virement instantan[ée]|wero|paylib|carte pr[ée]pay[ée]|coupon pcs)\b/i,
      /\b(paiement instantan[ée]|wero|paylib|virement instantan[ée])[^.!?\n]{0,30}(?:pour (?:lib[ée]rer|d[ée]bloquer|valider|activer))/i,
    ],
  },
  {
    id: 'lex-premium-phone',
    category: 'donnees-sensibles',
    severity: 'high',
    title: 'Numero surtaxe',
    detail:
      'Le message incite a appeler un numero surtaxe (08 9x / 08 0x). Ces numeros sont factures plusieurs euros la minute et servent a extraire de l argent sans contrepartie.',
    patterns: [
      /\b0 ?8 ?(?:9|0|1)\d(?:[ .-]?\d{2}){3}\b/,
      /\b(?:num[ée]ro surtax[ée]|appelez le 08|prix de l appel|\d,\d{2} ?€ ?\/ ?(?:min|appel))/i,
    ],
  },

  // --- Pretextes professionnels -------------------------------------------
  {
    id: 'lex-job-scam',
    category: 'ingenierie-sociale',
    severity: 'medium',
    title: 'Pretexte de recrutement',
    detail:
      'Le message propose un emploi ou une mission et demande des documents ou un premier versement. Les fausses offres d emploi servent au blanchiment ou au vol d identite.',
    patterns: [
      /\b(offre d emploi|recrutement|mission (?:freelance|ponctuelle|simple)|t[ée]l[ée]travail|poste [àa] pourvoir|entretien (?:t[ée]l[ée]phonique|par whatsapp|sur telegram)|salaire (?:de )?\d{3,}|r[ée]mun[ée]ration attractive|petits boulots?)\b/i,
      /\b(?:envoyez|transmettez)[^.!?\n]{0,25}(?:votre cv|votre rib|vos coordonn[ée]es bancaires|pi[èe]ce d identit[ée])/i,
    ],
  },
  {
    id: 'lex-romance-relationship',
    category: 'ingenierie-sociale',
    severity: 'low',
    title: 'Pretexte affectif ou relationnel',
    detail:
      'Le message installe une relation personnelle avant de formuler une demande. Ce scenario (fraude sentimentale) precede presque toujours une demande d argent ou de cryptomonnaie.',
    patterns: [
      /\b(je t aime|mon amour|ma ch[ée]rie|nous sommes destin[ée]s|je veux te conna[îi]tre|une belle rencontre|tu me manques)\b/i,
    ],
  },

  // --- Mise en forme suspecte ---------------------------------------------
  {
    id: 'lex-generic-greeting',
    category: 'contenu',
    severity: 'low',
    title: 'Formule d appel generique',
    detail:
      'Le message s adresse a « Cher client » sans nom. Les organismes avec lesquels vous avez un compte vous nomment. L anonymat trahit un envoi de masse.',
    patterns: [
      /^\s*(?:cher(?:e)? (?:client|cliente|abonn[ée]|utilisateur|utilisatrice|internaute|monsieur|madame|membre|titulaire)|dear (?:customer|user|client|member|sir|madam)|madame,?\s+monsieur,?\s*$)/im,
    ],
  },
  {
    id: 'lex-excessive-urgency-format',
    category: 'contenu',
    severity: 'low',
    title: 'Mise en forme agressive',
    detail:
      'Le message abuse des majuscules et des points d exclamation. Cette mise en forme est typique des envois de masse et vise a declencher une reaction emotionnelle.',
    patterns: [
      /(?:[A-ZÀ-Ý]{12,}|!{3,}|\?{3,})/,
    ],
  },
  {
    id: 'lex-unicode-obfuscation',
    category: 'contenu',
    severity: 'high',
    title: 'Caracteres invisibles ou melanges d alphabets',
    detail:
      'Le message contient des caracteres de largeur nulle ou melange plusieurs alphabets. Cette technique sert a contourner les filtres anti-spam et a deguiser des noms de domaine.',
    patterns: [],
  },
];

/** Libelles d appel a l action, utilises par les heuristiques de contenu. */
export const ACTION_PHRASES = [
  'cliquez', 'cliquer', 'connectez', 'verifier', 'vérifier', 'confirmer', 'valider',
  'mettre a jour', 'mettre à jour', 'regler', 'régler', 'payer', 'appeler', 'rappeler',
  'repondre', 'répondre', 'telecharger', 'télécharger', 'activer', 'debloquer', 'débloquer',
];
