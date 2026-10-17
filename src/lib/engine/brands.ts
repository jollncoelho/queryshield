/**
 * Referentiel de marques et d'entites frequemment usurpees.
 *
 * `domains` contient les domaines enregistrables LEGITIMES de chaque marque.
 * Tout autre domaine contenant le nom de la marque est considere comme suspect.
 *
 * Le referentiel est volontairement centre sur le marche francophone, ou se
 * concentre l'essentiel des campagnes d'hameconnage (banques, colis, impots,
 * sante, telecoms). Ajouter une entree = une ligne.
 */

export interface Brand {
  /** Nom affiche dans les constats. */
  name: string;
  category: BrandCategory;
  /** Domaines enregistrables officiels (sans sous-domaine, sans www). */
  domains: string[];
  /** Variantes textuelles reconnues dans le corps du message. */
  aliases?: string[];
}

export type BrandCategory =
  | 'banque'
  | 'service-public'
  | 'livraison'
  | 'ecommerce'
  | 'telecom-energie'
  | 'tech'
  | 'crypto'
  | 'assurance-sante'
  | 'transport'
  | 'emploi';

export const BRANDS: Brand[] = [
  // --- Banques et fintech --------------------------------------------------
  { name: 'Crédit Agricole', category: 'banque', domains: ['credit-agricole.fr', 'ca.fr'], aliases: ['credit agricole'] },
  { name: 'BNP Paribas', category: 'banque', domains: ['bnpparibas.net', 'bnpparibas.fr', 'mabanque.bnpparibas'] },
  { name: 'Société Générale', category: 'banque', domains: ['societegenerale.fr', 'sg.fr'], aliases: ['societe generale'] },
  { name: 'LCL', category: 'banque', domains: ['lcl.fr'] },
  { name: 'Caisse d\'Épargne', category: 'banque', domains: ['caisse-epargne.fr'], aliases: ['caisse epargne'] },
  { name: 'Banque Populaire', category: 'banque', domains: ['banquepopulaire.fr'] },
  { name: 'La Banque Postale', category: 'banque', domains: ['labanquepostale.fr', 'banque-postale.fr'], aliases: ['banque postale'] },
  { name: 'Crédit Mutuel', category: 'banque', domains: ['creditmutuel.fr'], aliases: ['credit mutuel'] },
  { name: 'CIC', category: 'banque', domains: ['cic.fr'] },
  { name: 'Boursorama', category: 'banque', domains: ['boursorama.com'] },
  { name: 'Fortuneo', category: 'banque', domains: ['fortuneo.fr'] },
  { name: 'Hello bank!', category: 'banque', domains: ['hellobank.fr'] },
  { name: 'Monabanq', category: 'banque', domains: ['monabanq.com'] },
  { name: 'Qonto', category: 'banque', domains: ['qonto.com', 'qonto.eu'] },
  { name: 'Revolut', category: 'banque', domains: ['revolut.com'] },
  { name: 'N26', category: 'banque', domains: ['n26.com'] },
  { name: 'Wise', category: 'banque', domains: ['wise.com'] },
  { name: 'PayPal', category: 'banque', domains: ['paypal.com', 'paypal.fr'] },
  { name: 'Stripe', category: 'banque', domains: ['stripe.com'] },
  { name: 'American Express', category: 'banque', domains: ['americanexpress.com', 'amex.fr'] },

  // --- Services publics ---------------------------------------------------
  { name: 'Impôts / DGFiP', category: 'service-public', domains: ['impots.gouv.fr'], aliases: ['dgfip', 'direction generale des finances'] },
  { name: 'Ameli / Assurance Maladie', category: 'service-public', domains: ['ameli.fr', 'lassurance-maladie.fr'], aliases: ['assurance maladie', 'cpam'] },
  { name: 'CAF', category: 'service-public', domains: ['caf.fr'] },
  { name: 'URSSAF', category: 'service-public', domains: ['urssaf.fr'] },
  { name: 'France Travail', category: 'service-public', domains: ['francetravail.fr', 'pole-emploi.fr'], aliases: ['pole emploi'] },
  { name: 'ANTS', category: 'service-public', domains: ['ants.gouv.fr'] },
  { name: 'Service-Public', category: 'service-public', domains: ['service-public.fr'] },
  { name: 'Mes droits sociaux', category: 'service-public', domains: ['mesdroitssociaux.gouv.fr'] },
  { name: 'Assurance retraite', category: 'service-public', domains: ['lassuranceretraite.fr'] },
  { name: 'Mairie / collectivité', category: 'service-public', domains: [], aliases: ['votre mairie'] },

  // --- Livraison et logistique -------------------------------------------
  { name: 'La Poste', category: 'livraison', domains: ['laposte.fr', 'laposte.net'] },
  { name: 'Chronopost', category: 'livraison', domains: ['chronopost.fr'] },
  { name: 'Colissimo', category: 'livraison', domains: ['colissimo.fr'] },
  { name: 'Mondial Relay', category: 'livraison', domains: ['mondialrelay.fr'] },
  { name: 'DHL', category: 'livraison', domains: ['dhl.com', 'dhl.fr'] },
  { name: 'UPS', category: 'livraison', domains: ['ups.com'] },
  { name: 'FedEx', category: 'livraison', domains: ['fedex.com'] },
  { name: 'DPD', category: 'livraison', domains: ['dpd.com', 'dpd.fr'] },
  { name: 'GLS', category: 'livraison', domains: ['gls-group.com'] },
  { name: 'Amazon', category: 'livraison', domains: ['amazon.fr', 'amazon.com', 'amazon.de'] },

  // --- E-commerce ---------------------------------------------------------
  { name: 'Cdiscount', category: 'ecommerce', domains: ['cdiscount.com'] },
  { name: 'Fnac', category: 'ecommerce', domains: ['fnac.com'] },
  { name: 'LeBonCoin', category: 'ecommerce', domains: ['leboncoin.fr'] },
  { name: 'Vinted', category: 'ecommerce', domains: ['vinted.fr', 'vinted.com'] },
  { name: 'Temu', category: 'ecommerce', domains: ['temu.com'] },
  { name: 'AliExpress', category: 'ecommerce', domains: ['aliexpress.com'] },
  { name: 'Rakuten', category: 'ecommerce', domains: ['rakuten.fr'] },
  { name: 'eBay', category: 'ecommerce', domains: ['ebay.fr', 'ebay.com'] },
  { name: 'Back Market', category: 'ecommerce', domains: ['backmarket.fr'] },
  { name: 'Manomano', category: 'ecommerce', domains: ['manomano.fr'] },
  { name: 'Darty', category: 'ecommerce', domains: ['darty.com'] },
  { name: 'Boulanger', category: 'ecommerce', domains: ['boulanger.com'] },

  // --- Télécoms et énergie ------------------------------------------------
  { name: 'Orange', category: 'telecom-energie', domains: ['orange.fr', 'orange.com'] },
  { name: 'SFR', category: 'telecom-energie', domains: ['sfr.fr'] },
  { name: 'Bouygues Telecom', category: 'telecom-energie', domains: ['bouyguestelecom.fr'] },
  { name: 'Free', category: 'telecom-energie', domains: ['free.fr'] },
  { name: 'EDF', category: 'telecom-energie', domains: ['edf.fr'] },
  { name: 'Engie', category: 'telecom-energie', domains: ['engie.com', 'engie.fr'] },
  { name: 'TotalEnergies', category: 'telecom-energie', domains: ['totalenergies.com'] },
  { name: 'Veolia', category: 'telecom-energie', domains: ['veolia.com'] },

  // --- Tech et services en ligne -----------------------------------------
  { name: 'Microsoft', category: 'tech', domains: ['microsoft.com', 'live.com', 'outlook.com', 'office.com', 'microsoftonline.com'] },
  { name: 'Apple', category: 'tech', domains: ['apple.com', 'icloud.com'] },
  { name: 'Google', category: 'tech', domains: ['google.com', 'gmail.com', 'youtube.com'] },
  { name: 'Netflix', category: 'tech', domains: ['netflix.com'] },
  { name: 'Spotify', category: 'tech', domains: ['spotify.com'] },
  { name: 'Meta / Facebook', category: 'tech', domains: ['facebook.com', 'meta.com', 'instagram.com', 'whatsapp.com'] },
  { name: 'LinkedIn', category: 'tech', domains: ['linkedin.com'] },
  { name: 'Dropbox', category: 'tech', domains: ['dropbox.com'] },
  { name: 'Adobe', category: 'tech', domains: ['adobe.com'] },
  { name: 'Steam', category: 'tech', domains: ['steampowered.com'] },
  { name: 'Telegram', category: 'tech', domains: ['telegram.org'] },
  { name: 'X / Twitter', category: 'tech', domains: ['x.com', 'twitter.com'] },

  // --- Crypto -------------------------------------------------------------
  { name: 'Binance', category: 'crypto', domains: ['binance.com'] },
  { name: 'Coinbase', category: 'crypto', domains: ['coinbase.com'] },
  { name: 'Kraken', category: 'crypto', domains: ['kraken.com'] },
  { name: 'Ledger', category: 'crypto', domains: ['ledger.com'] },
  { name: 'Trezor', category: 'crypto', domains: ['trezor.io'] },
  { name: 'MetaMask', category: 'crypto', domains: ['metamask.io'] },
  { name: 'Crypto.com', category: 'crypto', domains: ['crypto.com'] },
  { name: 'Bitpanda', category: 'crypto', domains: ['bitpanda.com'] },

  // --- Assurance et santé -------------------------------------------------
  { name: 'MAIF', category: 'assurance-sante', domains: ['maif.fr'] },
  { name: 'Macif', category: 'assurance-sante', domains: ['macif.fr'] },
  { name: 'Matmut', category: 'assurance-sante', domains: ['matmut.fr'] },
  { name: 'AXA', category: 'assurance-sante', domains: ['axa.fr'] },
  { name: 'Allianz', category: 'assurance-sante', domains: ['allianz.fr'] },
  { name: 'Groupama', category: 'assurance-sante', domains: ['groupama.fr'] },
  { name: 'Harmonie Mutuelle', category: 'assurance-sante', domains: ['harmonie-mutuelle.fr'] },

  // --- Transport ----------------------------------------------------------
  { name: 'SNCF Connect', category: 'transport', domains: ['sncf-connect.com', 'sncf.com'] },
  { name: 'Ouigo', category: 'transport', domains: ['ouigo.com'] },
  { name: 'RATP', category: 'transport', domains: ['ratp.fr'] },
  { name: 'Uber', category: 'transport', domains: ['uber.com'] },
  { name: 'BlaBlaCar', category: 'transport', domains: ['blablacar.fr'] },
  { name: 'Air France', category: 'transport', domains: ['airfrance.fr', 'airfrance.com'] },
  { name: 'Ryanair', category: 'transport', domains: ['ryanair.com'] },

  // --- Emploi -------------------------------------------------------------
  { name: 'Indeed', category: 'emploi', domains: ['indeed.com', 'indeed.fr'] },
  { name: 'Malt', category: 'emploi', domains: ['malt.fr'] },
  { name: 'Upwork', category: 'emploi', domains: ['upwork.com'] },
  { name: 'Fiverr', category: 'emploi', domains: ['fiverr.com'] },
];

/** TLD generiques bon marche, sur-representes dans les campagnes d'hameconnage. */
export const RISKY_TLDS = new Set([
  'zip', 'mov', 'tk', 'ml', 'ga', 'cf', 'gq', 'top', 'xyz', 'buzz', 'click', 'rest',
  'icu', 'lol', 'country', 'work', 'kim', 'loan', 'men', 'quest', 'cyou', 'sbs',
  'cfd', 'monster', 'bar', 'beauty', 'casa', 'surf', 'fit', 'life', 'live', 'online',
  'site', 'space', 'store', 'website', 'shop', 'link', 'email', 'info', 'pro', 'pw',
  'cc', 'su', 'ws', 'am', 'to', 'gd', 'vg', 'club', 'vip', 'win', 'bid', 'download',
  'stream', 'racing', 'date', 'party', 'review', 'science', 'gdn', 'ooo', 'ph', 'tw',
  'cc', 'in', 'ru', 'cn', 'biz', 'name', 'mobi', 'asia',
]);

/** Suffixes en deux parties a ne pas confondre avec un domaine enregistrable. */
export const MULTI_PART_SUFFIXES = new Set([
  'co.uk', 'org.uk', 'ac.uk', 'gov.uk', 'co.jp', 'or.jp', 'ne.jp', 'com.au', 'net.au',
  'org.au', 'com.br', 'com.mx', 'com.ar', 'co.nz', 'co.za', 'com.tr', 'com.cn',
  'com.hk', 'com.sg', 'com.tw', 'co.in', 'co.kr', 'gouv.fr', 'asso.fr', 'com.fr',
]);

/** Domaines de redirection raccourcis. */
export const URL_SHORTENERS = new Set([
  'bit.ly', 'tinyurl.com', 't.co', 'goo.gl', 'cutt.ly', 'is.gd', 'ow.ly', 'rb.gy',
  'rebrand.ly', 'tiny.cc', 'lnkd.in', 'buff.ly', 'shorturl.at', 'urlz.fr', 'trib.al',
  'surl.li', 'shrtco.de', 'bl.ink', 'clck.ru', 'vk.cc', 'u.to', 'soo.gd', 'qr.ae',
  'snip.ly', 'short.io', '1url.com', 'po.st', 'mcaf.ee', 's.id', 'gg.gg', 'shorte.st',
]);

/** Extensions de fichiers dangereuses en piece jointe ou en telechargement direct. */
export const DANGEROUS_EXTENSIONS = new Set([
  'exe', 'scr', 'com', 'pif', 'bat', 'cmd', 'msi', 'vbs', 'vbe', 'js', 'jse', 'wsf',
  'wsh', 'ps1', 'psm1', 'hta', 'cpl', 'jar', 'apk', 'dmg', 'iso', 'img', 'lnk',
  'reg', 'docm', 'xlsm', 'pptm', 'dotm', 'xlam', 'svg', 'chm', 'msc', 'gadget',
]);

/** Mots-cles sensibles dans l'URL (chemin ou hote). */
export const SENSITIVE_URL_KEYWORDS = [
  'login', 'signin', 'logon', 'secure', 'securite', 'verify', 'verification', 'verifier',
  'account', 'compte', 'update', 'mise-a-jour', 'confirm', 'confirmation', 'confirmer',
  'wallet', 'portefeuille', 'seed', 'recovery', 'recuperation', 'kyc', 'validation',
  'valider', 'connexion', 'authentification', 'auth', 'password', 'mot-de-passe',
  'paiement', 'payment', 'facture', 'invoice', 'remboursement', 'refund', 'colis',
  'livraison', 'suivi', 'tracking', 'amende', 'contravention', 'impots', 'taxe',
  'support', 'service-client', 'assistance', 'unlock', 'debloquer', 'suspended',
  'restore', 'reinitialiser', 'reset', 'otp', 'code', 'gift', 'cadeau', 'bonus',
];

export const BRAND_TOKEN_MIN_LENGTH = 5;

/** Table pre-calculee : domaine legitime -> marque. */
export const LEGIT_DOMAIN_INDEX: Map<string, Brand> = (() => {
  const index = new Map<string, Brand>();
  for (const brand of BRANDS) {
    for (const domain of brand.domains) {
      index.set(domain.toLowerCase(), brand);
    }
  }
  return index;
})();

export interface BrandToken {
  token: string;
  brand: Brand;
}

/**
 * Normalise une chaine pour la comparaison de marque : minuscules, accents
 * retires, tout caractere non alphanumerique supprime.
 *
 * « Credit Agricole Securite » -> « creditagricolesecurite »
 */
export function normalizeForMatch(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '');
}

/**
 * Cles de marque NORMALISEES, utilisees pour detecter une marque citee dans un
 * nom d'expediteur ou dans un nom de domaine.
 *
 * On compare des chaines completes plutot que des mots isoles : le jeton
 * « credit » apparait a la fois dans « Credit Agricole » et « Credit Mutuel »,
 * et une comparaison par mot produirait une attribution de marque erronee. La
 * cle « creditagricole » leve cette ambiguite.
 */
export const BRAND_KEYS: BrandToken[] = (() => {
  const seen = new Set<string>();
  const keys: BrandToken[] = [];
  const candidates: { raw: string; brand: Brand }[] = [];

  for (const brand of BRANDS) {
    candidates.push({ raw: brand.name, brand });
    for (const alias of brand.aliases ?? []) candidates.push({ raw: alias, brand });
    for (const domain of brand.domains) {
      const sld = domain.split('.')[0];
      candidates.push({ raw: sld, brand });
      candidates.push({ raw: domain, brand });
    }
  }

  for (const candidate of candidates) {
    const key = normalizeForMatch(candidate.raw);
    if (key.length < BRAND_TOKEN_MIN_LENGTH) continue;
    if (seen.has(key)) continue;
    seen.add(key);
    keys.push({ token: key, brand: candidate.brand });
  }

  return keys.sort((a, b) => b.token.length - a.token.length);
})();

/**
 * Retrouve les marques citees dans une chaine libre (nom d'expediteur, hote).
 * Renvoie au plus `limit` marques distinctes.
 */
export function matchBrandsIn(value: string, limit = 4): Brand[] {
  const haystack = normalizeForMatch(value);
  if (haystack.length < BRAND_TOKEN_MIN_LENGTH) return [];

  const matched: Brand[] = [];
  for (const entry of BRAND_KEYS) {
    if (!haystack.includes(entry.token)) continue;
    if (matched.some((brand) => brand.name === entry.brand.name)) continue;
    matched.push(entry.brand);
    if (matched.length >= limit) break;
  }
  return matched;
}

/** Vrai si le domaine appartient bien a la marque indiquee. */
export function domainBelongsToBrand(registrable: string, brand: Brand): boolean {
  return brand.domains.some((domain) => domain.toLowerCase() === registrable.toLowerCase());
}

/** Retrouve la marque associee a un domaine enregistrable legitime. */
export function lookupLegitDomain(registrable: string): Brand | undefined {
  return LEGIT_DOMAIN_INDEX.get(registrable.toLowerCase());
}
