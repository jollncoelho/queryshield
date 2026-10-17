/**
 * Dictionnaire francais — LANGUE DE REFERENCE.
 *
 * C'est ce fichier qui definit la forme du dictionnaire : les autres langues
 * sont typees a partir de lui (`Dictionary = typeof fr`). Une cle oubliee dans
 * une traduction fait donc echouer `npm run typecheck`, elle ne se transforme
 * pas silencieusement en texte vide a l'ecran.
 *
 * Les fragments variables sont notes `{ainsi}` et remplaces par
 * `interpolate()` (voir `./interpolate.ts`).
 */

export const fr = {
  meta: {
    languageName: 'Français',
    switchLabel: 'Langue',
    title: 'QueryShield — Analyse de messages suspects et detection d arnaques',
    description:
      'Collez un e-mail, un SMS ou un message suspect : QueryShield evalue le niveau de risque, explique chaque signal detecte et vous aide a decider avant d agir.',
    ogTitle: 'QueryShield — Analyse de messages suspects',
    ogDescription:
      'Detection d hameconnage et d arnaques par analyse heuristique et semantique. Score de risque, signaux expliques, aucune donnee conservee.',
  },

  nav: {
    analyzer: 'Analyseur',
    site: 'Verifier un site',
    pricing: 'Tarifs',
    api: 'API',
    account: 'Mon compte',
    privacy: 'Confidentialite',
  },

  header: {
    support: 'support@query-intel.com',
    openAccess: 'Ouvrir un acces',
  },

  footer: {
    tagline:
      'Analyse de messages suspects et verification de sites pour la detection d hameconnage, d arnaques et de fraude. Un service de l ecosysteme query-intel.com.',
    // Lien vers le site vitrine (nom propre, non traduit). URL code en dur.
    ecosystem: 'Decouvrir l ecosysteme query-intel.com',
    productTitle: 'Produit',
    legalTitle: 'Legal',
    resourcesTitle: 'Ressources',
    linkAnalyzer: 'Analyseur de message',
    linkSite: 'Verifier un site',
    linkPricing: 'Offres et tarifs',
    linkApiDocs: 'Documentation API',
    linkHealth: 'Etat du service',
    linkPrivacy: 'Politique de confidentialite',
    linkTerms: 'Conditions et avertissement',
    linkMentions: 'Mentions legales',
    disclaimer:
      'QueryShield fournit une evaluation automatisee du niveau de risque et un score de probabilite. Aucun systeme automatise n est fiable a 100 % : le score constitue une aide a la decision et ne remplace ni la verification aupres de l organisme concerne, ni un conseil professionnel. Les messages soumis sont analyses en memoire et ne sont pas conserves.',
    rights: '© {year} query-intel.com — QueryShield. Tous droits reserves.',
    legalNotice:
      'Les textes juridiques sont etablis en francais et font foi dans cette langue. Seule la version francaise est opposable.',
  },

  common: {
    scoreAria: 'Score de risque {score} sur 100',
    outOf: 'SUR 100',
    clear: 'Effacer',
    copyReport: 'Copier le rapport',
    engine: 'Moteur',
    duration: 'Duree',
    quotaToday: 'Quota du jour',
    headers: 'En-tetes',
    headersAnalyzed: 'analyses',
    headersMissing: 'non fournis',
    confidenceChip: 'Fiabilite {level} ({percent} %)',
    confidenceHigh: 'elevee',
    confidenceMedium: 'moyenne',
    confidenceLow: 'faible',
    noSignal: 'Aucun signal declenche',
    noFindingsDetail:
      'Aucune regle ne s est declenchee. Le message ne contient ni lien douteux, ni demande de donnees sensibles, ni schema d ingenierie sociale identifiable par analyse statique.',
    signalsDetected: 'Signaux detectes',
    categoriesTitle: 'Repartition des signaux',
    semanticActive: 'Passe semantique active',
    rulesTriggered: '{count} regle declenchee',
    rulesTriggeredPlural: '{count} regles declenchees',
    trigger: 'Element declencheur',
    whatToDo: 'Que faire maintenant',
    semantic: 'Semantique',
    privacyShort: 'Analyse statique · aucune donnee conservee',
    networkError: 'Le service est injoignable. Verifiez votre connexion puis reessayez.',
    genericError: 'L analyse a echoue. Reessayez dans un instant.',
    /**
     * Messages d'erreur renvoyes par l'API, indexes par leur code (`error`).
     * L'interface prefere cette version traduite au message francais du
     * serveur, qui reste le repli.
     */
    errors: {
      rate_limited: 'Trop de requetes depuis votre connexion. Patientez quelques instants puis reessayez.',
      quota_exceeded: 'Quota quotidien atteint. Passez a une offre superieure pour continuer.',
      payload_too_large: 'Message trop volumineux. Reduisez sa taille puis reessayez.',
      invalid_json: 'Requete illisible. Rechargez la page puis reessayez.',
      missing_text: 'Aucun contenu a analyser. Collez le message recu (4 caracteres minimum).',
      missing_url: 'Aucune adresse a verifier. Saisissez un nom de domaine ou une adresse complete.',
      invalid_url:
        'Cette entree n est pas une adresse de site exploitable. Utilisez un nom de domaine (exemple.com) ou une adresse complete (https://exemple.com/page). Les adresses de reseau interne ne sont pas acceptees.',
    },
    siteContactedNever: 'le site n est jamais ouvert',
  },

  severity: {
    critical: 'Critique',
    high: 'Eleve',
    medium: 'Modere',
    low: 'Faible',
    info: 'Information',
  },

  category: {
    lien: 'Liens et domaines',
    identite: 'Usurpation d identite',
    'ingenierie-sociale': 'Ingenierie sociale',
    'donnees-sensibles': 'Demande de donnees sensibles',
    'entetes-email': 'Authentification de l e-mail',
    contenu: 'Contenu et mise en forme',
    metadata: 'Contexte du message',
  },

  verdict: {
    safe: 'Risque faible',
    suspicious: 'Suspect',
    dangerous: 'Fraude probable',
    safeSummary:
      'Aucun indicateur de fraude n a ete detecte. Le message ne presente ni lien douteux, ni demande de donnees sensibles, ni pression temporelle caracteristique.',
  },

  siteVerdict: {
    official: 'Site officiel verifie',
    unknown: 'Authenticite non verifiable',
    suspicious: 'Site suspect',
    phishing: 'Site frauduleux',
  },

  home: {
    chip: 'Aide a la decision · analyse statique · aucune donnee conservee',
    titleLead: 'Verifiez un message suspect',
    titleAccent: 'avant',
    titleTail: 'd agir.',
    intro:
      'QueryShield analyse les e-mails, les SMS et les messages instantanes a la recherche de tentatives d hameconnage, d arnaques et de fraude. Le moteur ne se contente pas de dire « dangereux » : il explique chaque signal detecte et indique la conduite a tenir.',
    ctaAnalyze: 'Analyser un message',
    ctaSite: 'Verifier un site',
    ctaPricing: 'Voir les offres',
    ctaApi: 'Integrer l API',
    stepsTitle: 'Comment ca marche',
    step1Title: 'Collez le message',
    step1Body:
      'E-mail, SMS, message WhatsApp ou Telegram. Vous pouvez ajouter les en-tetes bruts pour declencher la verification SPF, DKIM et DMARC.',
    step2Title: 'Le moteur analyse',
    step2Body:
      'Extraction des liens et des identifiants, comparaison des domaines aux marques officielles, application du lexique d ingenierie sociale, ponderation des signaux.',
    step3Title: 'Vous decidez',
    step3Body:
      'Un score de risque, la liste des signaux avec leur explication, et les actions concretes a mener. Le rapport est exportable pour vos dossiers.',
    coverageTitle: 'Ce que le moteur detecte',
    coverageIntro:
      'Plus de 80 regles heuristiques, organisees en familles de signaux independantes. La convergence de plusieurs familles fait monter le score : c est elle qui rend le verdict fiable.',
    coverage1Title: 'Usurpation de domaine',
    coverage1Body:
      'Typosquatting, homoglyphes cyrilliques, punycode, sous-domaines trompeurs, adresses IP brutes, raccourcisseurs.',
    coverage2Title: 'Ingenierie sociale',
    coverage2Body:
      'Pression temporelle, menace de suspension, faux support technique, appat financier, injonction au secret, prise de main a distance.',
    coverage3Title: 'Demandes sensibles',
    coverage3Body:
      'Mots de passe, codes recus par SMS, codes de double authentification, coordonnees bancaires, phrases de recuperation crypto, pieces d identite.',
    coverage4Title: 'Authentification e-mail',
    coverage4Body:
      'Lecture des resultats SPF, DKIM et DMARC, incoherence entre From, Reply-To et Return-Path, nom affiche usurpant une marque.',
    coverage5Title: 'Moyens de paiement a risque',
    coverage5Body:
      'Virements instantanes, coupons prepayes, cartes Transcash ou PCS, numeros surtaxes, faux frais de dedouanement.',
    coverage6Title: 'Obfuscation technique',
    coverage6Body:
      'Caracteres invisibles, melange d alphabets, marques disloquees, URLs fortement encodees, redirections cachees.',
    warningTitle: 'Avertissement',
    warningBody:
      'QueryShield fournit une evaluation automatisee du niveau de risque et un score de probabilite. Aucun systeme automatise n est fiable a 100 % : un message peut etre frauduleux sans declencher de signal, et un message legitime peut en declencher. Le rapport constitue une aide a la decision et ne remplace ni la verification aupres de l organisme concerne, ni l avis d un professionnel.',
    warningLink: 'Lire les conditions completes',
    ctaTitle: 'Besoin d un acces regulier ou d un volume plus eleve ?',
    ctaBody:
      'Offres mensuelles et annuelles, acces API avec cle de licence, quotas adaptes aux equipes. Paiement par carte bancaire via Stripe.',
    ctaButton: 'Consulter les offres',
  },

  analyzer: {
    channelEmail: 'E-mail',
    channelSms: 'SMS',
    channelMessaging: 'Messagerie',
    channelOther: 'Autre',
    senderPlaceholder: 'Expediteur (optionnel) — ex. « Service Client <contact@domaine.com> »',
    senderLabel: 'Adresse de l expediteur',
    subjectPlaceholder: 'Objet du message (optionnel)',
    subjectLabel: 'Objet du message',
    textPlaceholder:
      'Collez ici le message suspect, en conservant les liens tels quels.\n\nExemple : « Votre colis est bloque, reglez les frais sous 24h : http://exemple.top/… »',
    textLabel: 'Message a analyser',
    senderHelp:
      'L expediteur est analyse automatiquement s il figure dans le texte colle (ligne « De : ... »). Le renseigner ici reste plus fiable : c est le domaine apres l arobase qui determine si l adresse est authentique.',
    headersShow: '+ Ajouter les en-tetes bruts de l e-mail (SPF / DKIM / DMARC)',
    headersHide: '− Masquer les en-tetes bruts',
    headersPlaceholder:
      'Collez ici les en-tetes complets.\n\nDans Gmail : menu « Plus » > « Afficher l original ».\nDans Outlook : « Options » > « Proprietes du message ».',
    headersLabel: 'En-tetes bruts de l e-mail',
    headersHelp:
      'C est la verification la plus fiable : SPF, DKIM et DMARC permettent de savoir si le domaine expediteur est authentique. Sans en-tetes, le domaine de l expediteur est tout de meme analyse a partir du champ ci-dessus ou de la ligne « De : ... » du message.',
    samplesLabel: 'Exemples de demonstration',
    submit: 'Analyser ce message',
    submitting: 'Analyse en cours…',
    privacyNote: 'Traitement en memoire · aucun message conserve · aucun lien ouvert',
    disclaimer:
      'Ce rapport est une aide a la decision fondee sur une analyse automatisee. Aucun systeme ne garantit une detection fiable a 100 % : en cas de doute, verifiez directement aupres de l organisme concerne par un numero que vous avez trouve vous-meme.',
  },

  /**
   * Libelles des exemples de demonstration. Seuls les libelles sont traduits :
   * le contenu des messages reste en francais, comme les explications des
   * regles du moteur d'analyse.
   */
  samples: {
    'sms-colis': { label: 'SMS — colis bloque', hint: 'Faux frais de dedouanement' },
    'email-banque': { label: 'E-mail — fausse banque', hint: 'En-tetes DMARC en echec' },
    'faux-conseiller': { label: 'Messagerie — faux conseiller', hint: 'Demande de code SMS + secret impose' },
    'faux-support': { label: 'Faux support technique', hint: 'Prise en main a distance' },
    'faux-gain': { label: 'Faux gain / crypto', hint: 'Appat financier et phrase de recuperation' },
    'faux-gain-sans-lien': {
      label: 'Faux gain — sans lien',
      hint: 'Domaine aleatoire, aucune demande d identifiants',
    },
    'fausse-administration': { label: 'Fausse administration', hint: 'Domaine imitant une institution' },
    casino: { label: 'Offre de casino', hint: 'Appat de jeu non sollicite' },
    legitime: { label: 'Message legitime', hint: 'Cas de controle' },
  },

  site: {
    metaTitle: 'Verifier un site',
    metaDescription:
      'Verifiez si une adresse de site est authentique, suspecte ou frauduleuse. Le site analyse n est jamais ouvert.',
    chip: 'Verification d adresse · analyse statique · le site n est jamais ouvert',
    titleLead: 'Ce site est-il',
    titleAccent: 'vraiment',
    titleTail: 'celui qu il pretend etre ?',
    intro:
      'Collez une adresse de site ou un nom de domaine. QueryShield compare le domaine au referentiel des organisations francophones, detecte les imitations et, si vous l activez, verifie l age du domaine aupres de l annuaire officiel. Le site suspect n est jamais contacte : l ouvrir reviendrait a prevenir l attaquant.',
    ctaAnalyzer: 'Analyser un message',
    ctaApi: 'Integrer l API',
    criteriaTitle: 'Ce qui est verifie',
    criteria1Title: 'Usurpation de marque',
    criteria1Body:
      'Le domaine reprend le nom d une banque, d un transporteur ou d une administration sans etre un de ses domaines officiels.',
    criteria2Title: 'Ressemblance trompeuse',
    criteria2Body:
      'Typosquatting (une lettre d ecart), homoglyphes cyrilliques, encodage punycode, extension connue detournee en sous-domaine.',
    criteria3Title: 'Domaine genere automatiquement',
    criteria3Body:
      'Entropie anormale, suites de consonnes, absence de voyelle : la signature des domaines enregistres par lots pour une campagne.',
    criteria4Title: 'Age et reputation',
    criteria4Body:
      'Verifications optionnelles : date d enregistrement du domaine via l annuaire officiel (RDAP) et signalements connus.',
    limitsTitle: 'Ce que le resultat ne dit pas',
    limitsBody:
      '« Aucun signe de fraude » ne signifie pas « site de confiance ». Un domaine inconnu de notre referentiel ressort comme non verifiable, et c est volontaire : nous preferons afficher une incertitude plutot qu une fausse reassurance. Cette verification ne remplace pas la saisie manuelle de l adresse officielle, ni l avis d un professionnel en cas de doute.',
    formTitle: 'Verifier une adresse de site',
    urlPlaceholder: 'exemple.com ou https://exemple.com/page',
    urlLabel: 'Adresse du site a verifier',
    activeLabel: 'Verification active',
    activeBody:
      'interroge l annuaire des domaines (age et registrar) et la reputation du site. Beaucoup plus fiable, mais l adresse est alors transmise a ces services.',
    activeNeverContacted: 'Le site lui-meme n est jamais contacte',
    activeTail: ', ni maintenant ni plus tard.',
    submit: 'Verifier ce site',
    submitting: 'Verification en cours…',
    examplesLabel: 'Exemples',
    exampleOfficial: 'Site officiel',
    exampleBank: 'Imitation de banque',
    exampleSubdomain: 'Sous-domaine trompeur',
    exampleRandom: 'Domaine aleatoire',
    organisation: 'Organisation : {name} ({category})',
    impersonated: 'Organisation imitee : {brands}',
    knownOrganisation: 'une organisation connue',
    host: 'Hote',
    domain: 'Domaine',
    extension: 'Extension',
    activeChip: 'Verification active',
    networkTitle: 'Verifications reseau',
    networkSource: 'source : annuaire des domaines · le site n a pas ete contacte',
    dnsResolution: 'Resolution DNS',
    dnsNotChecked: 'non verifiee',
    dnsAddresses: '{count} adresse(s)',
    dnsFails: 'ne se resout pas',
    domainAge: 'Age du domaine',
    domainAgeDays: '{days} jour(s)',
    domainAgeUnknown: 'indisponible',
    registeredOn: 'Enregistre le',
    registrar: 'Registrar',
    reputation: 'Reputation',
    reputationFlagged: 'signale',
    reputationClean: 'aucun signalement',
    reputationNotChecked: 'non consultee',
    reputationUnavailable:
      'La verification de reputation n a pas pu etre effectuee. Cela ne signifie pas que le site est propre : aucun avis n a ete obtenu, ni dans un sens ni dans l autre.',
    footnote:
      'Cette verification est une aide a la decision. Le site analyse n est jamais ouvert : le rapport repose sur la structure du domaine, le referentiel de marques et, si vous l avez activee, sur l annuaire des domaines. Aucun systeme ne garantit une detection fiable a 100 %.',
    summaryOfficial:
      '{host} est le domaine officiel de {brand}. Vous pouvez vous y connecter en confiance, a condition d avoir vous-meme saisi l adresse.',
    summaryPhishing:
      'Score de risque {score}/100 : {host} imite {brands} sans en etre le domaine officiel. Ne saisissez aucune donnee sur ce site.',
    summarySuspicious:
      'Score de risque {score}/100 : {host} presente des anomalies structurelles sans imiter d organisation identifiable. Traitez ce site comme non fiable jusqu a verification.',
    summaryUnknown:
      'Aucun signe de fraude detecte sur {host}, mais ce domaine n appartient a aucune organisation de notre referentiel. Nous ne pouvons donc pas confirmer qu il est authentique : ne pas detecter de probleme n est pas une validation.',
    summaryInvalid:
      'Cette entree n est pas une adresse de site exploitable. Saisissez un nom de domaine (exemple.com) ou une adresse complete (https://exemple.com/page).',
  },

  /**
   * Recommandations d'action du verificateur de site, indexees par
   * `SiteRecommendation.id`. Le texte francais du moteur sert de repli si un
   * identifiant venait a manquer ici.
   */
  siteRecs: {
    'site-rec-invalid-input':
      'Verifiez la forme de l adresse : un nom de domaine contient au moins un point et se termine par une extension (.fr, .com, .gouv.fr...).',
    'site-rec-type-address':
      'Saisissez l adresse vous-meme dans la barre du navigateur plutot que de cliquer sur un lien recu : c est le seul moyen d etre certain d arriver sur le bon site.',
    'site-rec-check-padlock':
      'Verifiez que le cadenas du navigateur est present et que le nom de domaine affiche est exact, sans faute de frappe.',
    'site-rec-unknown-org':
      'Aucune organisation de notre referentiel ne correspond a ce domaine. S il se presente comme votre banque, votre operateur ou une administration, il ne s agit pas de son site officiel.',
    'site-rec-use-search':
      'Pour verifier un service, passez par un moteur de recherche ou par un document officiel, jamais par le lien que vous voulez controler.',
    'site-rec-no-credentials':
      'Ne saisissez ni identifiant, ni mot de passe, ni numero de carte sur ce site.',
    'site-rec-report-brand':
      'Ce site imite une organisation connue. Rendez-vous sur le site officiel en saisissant son adresse vous-meme, et signalez la tentative depuis l espace client ou le service client de l organisation imitee.',
    'site-rec-inspect-chars':
      'Le domaine utilise des caracteres visuellement trompeurs (alphabet melange ou encodage international). Copiez l adresse et collez-la dans un editeur de texte : les caracteres etrangers y apparaissent clairement.',
    'site-rec-expand-shortener':
      'L adresse passe par un raccourcisseur : la destination reelle est invisible avant le clic. Developpez-la avec un outil de resolution avant toute action.',
    'site-rec-domain-gone':
      'Ce nom de domaine ne se resout plus : le site a probablement ete retire apres avoir servi a une campagne. Le lien recu provient donc d un message ancien ou frauduleux.',
    'site-rec-domain-young':
      'Ce domaine a ete enregistre tres recemment. Les sites frauduleux sont montes pour quelques jours ou quelques semaines : la jeunesse du domaine est en soi un signal de mefiance.',
    'site-rec-safe-browsing':
      'Ce site figure sur la liste des sites dangereux de Google Safe Browsing. N y accedez pas et supprimez le message qui le contenait.',
    'site-rec-report-authority':
      'Signalez l adresse : la plateforme Pharos (internet-signalement.gouv.fr) pour les contenus frauduleux, ou Signal Spam pour les e-mails.',
  },

  /**
   * Indices de generation automatique d'un domaine. Le moteur transmet des
   * codes (`entropy-high`, `consonant-run`...) et la couche de presentation les
   * remet en forme ici (voir `finding.ts`).
   */
  randomSignals: {
    'entropy-very-high': 'entropie tres elevee ({value} bits par caractere)',
    'entropy-high': 'entropie elevee ({value} bits par caractere)',
    'consonant-run': '{value} consonnes consecutives',
    'no-vowel': 'aucune voyelle',
    'few-vowels': 'quasi aucune voyelle ({value} %)',
    'interleaved-digits': 'chiffres intercalés dans le nom',
    'very-long': 'nom tres long ({value} caracteres)',
  },

  /**
   * Messages des regles de detection affichees par le verificateur de site :
   * les regles propres au site, et les regles de domaine que l analyse d'une
   * adresse declenche. Les explications des regles de message (lexique
   * d'ingenierie sociale, en-tetes) restent en francais a ce stade.
   */
  findings: {
    'url-dangerous-scheme': {
      title: 'Schema d URL dangereux',
      detail:
        'L adresse utilise un schema `data:`, `javascript:` ou `file:`. Ce type d adresse execute du code ou ouvre un fichier local sans passer par un site web : elle n a aucune raison d etre presente dans un message legitime.',
    },
    'url-ip-literal': {
      title: 'Lien vers une adresse IP brute',
      detail:
        'Le lien pointe directement sur une adresse IP au lieu d un nom de domaine. Les services officiels utilisent toujours un domaine ; l IP brute evite les listes de blocage et les certificats.',
    },
    'url-punycode': {
      title: 'Domaine encode en punycode',
      detail:
        'Le domaine contient un libelle `xn--`. C est l encodage des caracteres non latins : il permet d afficher un nom visuellement identique a celui d une marque officielle alors que le domaine est different.',
    },
    'url-homoglyph': {
      title: 'Domaine avec caracteres homoglyphes',
      detail:
        'Le domaine melange alphabet latin et caracteres cyrilliques ou grecs visuellement identiques. C est la technique la plus efficace pour imiter une marque : a l oeil, le domaine est indiscernable.',
    },
    'url-userinfo-trick': {
      title: 'Domaine masque par un arobase',
      detail:
        'L URL contient une arobase avant le chemin. Tout ce qui precede l arobase est ignore par le navigateur : le domaine reellement visite n est pas celui qui apparait en premier.',
    },
    'url-risky-tld': {
      title: 'Extension de domaine a risque',
      detail:
        'L extension du domaine figure parmi celles massivement utilisees par les campagnes d hameconnage, car elles sont vendues a bas prix et sans verification d identite.',
    },
    'url-shortener': {
      title: 'Lien raccourci',
      detail:
        'Le lien passe par un service de raccourcissement : la destination reelle est invisible avant le clic. Pour un message non sollicite, considerer la destination comme inconnue.',
    },
    'url-brand-impersonation': {
      title: 'Domaine usurpant une marque connue',
      detail:
        'Le domaine reprend le nom d une marque ({brands}) sans etre un domaine officiel de cette marque. C est la signature la plus frequente de l hameconnage cible.',
    },
    'url-typosquat': {
      title: 'Faute de frappe imitant un domaine officiel',
      detail:
        'Le domaine differe d un seul caractere d un domaine officiel. Cette technique (typosquatting) exploite une faute de frappe ou une lecture rapide du message.',
    },
    'url-typosquat-approx': {
      title: 'Domaine visuellement proche d un officiel',
      detail:
        'Le domaine ressemble fortement a un domaine officiel, sans lui etre identique. Verifiez caractere par caractere avant toute action.',
    },
    'url-random-domain': {
      title: 'Domaine genere automatiquement',
      detail:
        'Le domaine ne ressemble a aucun nom lisible ({signals}). Les domaines produits aleatoirement sont enregistres par lots pour quelques jours : ils n ont ni histoire, ni reputation, ni raison d etre dans un message legitime.',
    },
    'url-random-domain-weak': {
      title: 'Domaine au nom inhabituel',
      detail:
        'La structure du domaine est inhabituelle ({signals}). Signal a confirmer par les autres controles.',
    },
    'url-institutional-mimicry': {
      title: 'Domaine imitant une institution',
      detail:
        'Le domaine reprend le vocabulaire d une institution publique ({words}) sans en etre un domaine officiel. Les administrations utilisent des domaines en .gouv.fr ou .gov : une variante commerciale est une usurpation.',
    },
    'url-tld-as-label': {
      title: 'Extension detournee en sous-domaine',
      detail:
        'L adresse contient une extension connue (.com, .gov, .fr...) a une position qui n est pas l extension finale. Le domaine reellement enregistre est celui qui suit, mais l oeil s arrete sur la partie qui precede : le montage sert uniquement a tromper la lecture.',
    },
    'url-lure-keywords': {
      title: 'Termes d appat dans le domaine',
      detail:
        'Le domaine contient des termes destines a attirer ({tokens}). Un nom de domaine choisi pour son argument commercial est presque toujours un domaine enregistre pour une campagne d envoi de masse.',
    },
    'url-sensitive-path': {
      title: 'Mots-cles d authentification dans le lien',
      detail:
        'Le lien contient des termes de connexion ou de paiement ({keywords}) sur un domaine qui n est pas celui de l organisation annoncee. Ils sont places la pour rassurer la victime.',
    },
    'url-sensitive-path-strong': {
      title: 'Mots-cles d authentification dans le lien',
      detail:
        'Le lien accumule plusieurs termes de connexion ou de paiement ({keywords}) sur un domaine qui n est pas celui de l organisation annoncee. Ils sont places la pour rassurer la victime.',
    },
    'url-plain-http-sensitive': {
      title: 'Page sensible servie en HTTP',
      detail:
        'Le lien pointe vers une page de connexion ou de paiement sans chiffrement. Aucun service legitime ne collecte d identifiants en HTTP.',
    },
    'url-many-subdomains': {
      title: 'Empilement de sous-domaines',
      detail:
        'Le domaine comporte un nombre inhabituel de sous-domaines. L empilement sert a repousser le domaine reel hors de la zone visible de la barre d adresse.',
    },
    'url-long-host': {
      title: 'Nom de domaine anormalement long',
      detail:
        'Le nom de domaine est tres long. Les domaines generes automatiquement par les kits d hameconnage le sont souvent.',
    },
    'url-many-hyphens': {
      title: 'Tirets multiples dans le domaine',
      detail:
        'Le domaine enchaine plusieurs tirets, motif typique des domaines generes pour imiter un nom officiel.',
    },
    'url-odd-port': {
      title: 'Port non standard',
      detail:
        'L adresse precise un port non standard. Les sites officiels n en utilisent pas et cela traduit souvent un serveur d attaque.',
    },
    'url-redirect-param': {
      title: 'Redirection vers une destination cachee',
      detail:
        'Le lien contient un parametre de redirection. La page affichee peut sembler legitime tout en renvoyant vers un autre site apres validation.',
    },
    'url-heavy-encoding': {
      title: 'URL fortement encodee',
      detail:
        'Le lien contient de nombreuses sequences d echappement. L encodage sert a masquer la destination reelle et a contourner les filtres.',
    },
    'url-zero-width': {
      title: 'Caracteres invisibles dans le lien',
      detail:
        'Le lien contient des caracteres de largeur nulle, invisibles a l ecran. Ils servent uniquement a tromper les filtres et l oeil humain.',
    },
    'url-anchor-mismatch': {
      title: 'Texte du lien different de sa destination',
      detail:
        'Le texte affiche du lien indique un domaine, mais le lien pointe vers un autre domaine. C est une preuve directe d intention trompeuse.',
    },
    'site-official-domain': {
      title: 'Domaine officiel verifie',
      detail:
        'Ce domaine est enregistre comme le domaine officiel de {brand}. C est une adresse de confiance : les messages et les liens qui pointent ici sont coherents.',
    },
    'site-impersonates-brand': {
      title: 'Ce site se fait passer pour une organisation connue',
      detail:
        'Le domaine reprend le nom de {brands} sans etre un de ses domaines officiels. C est la definition meme d un site d hameconnage : il imite une organisation pour recueillir des identifiants ou des paiements.',
    },
    'site-insecure-scheme': {
      title: 'Adresse en HTTP, sans chiffrement',
      detail:
        'L adresse fournie est en `http://`. Aucun site marchand ou bancaire serieux ne fonctionne encore ainsi : la connexion n est pas chiffree et rien ne garantit l identite du serveur.',
    },
    'site-not-resolving': {
      title: 'Le domaine ne se resout pas',
      detail:
        'La resolution DNS de ce nom de domaine echoue. Le site n existe plus, ou n a jamais ete configure pour repondre : c est frequent pour les domaines enregistres puis abandonnes apres une campagne d hameconnage.',
    },
    'site-newly-registered': {
      title: 'Domaine enregistre tres recemment',
      detail:
        'Ce domaine a ete enregistre il y a {days} jour(s) (le {date}). Les sites d hameconnage vivent quelques jours a quelques semaines : un domaine neuf qui se presente comme une organisation etablie est presque toujours frauduleux.',
    },
    'site-recently-registered': {
      title: 'Domaine recent',
      detail:
        'Ce domaine a ete enregistre il y a {days} jour(s). Ce n est pas anormal en soi, mais un domaine de moins de six mois ne peut pas avoir l anciennete d une organisation etablie.',
    },
    'site-safe-browsing-flagged': {
      title: 'Site signale comme dangereux',
      detail:
        'Ce site figure sur une liste publique de sites dangereux ({threats}). Il est deja identifie comme distributeur de contenu malveillant ou comme site d hameconnage.',
    },
  },
};

export type Dictionary = typeof fr;
