/**
 * English dictionary.
 *
 * Typed against the French reference (`Dictionary = typeof fr`), so a missing
 * or misspelled key is a compile error rather than a blank label.
 */

import type { Dictionary } from './fr';

export const en: Dictionary = {
  meta: {
    languageName: 'English',
    switchLabel: 'Language',
    title: 'QueryShield — Suspicious message analysis and scam detection',
    description:
      'Paste an email, an SMS or a suspicious message: QueryShield rates the risk, explains every signal it detects and helps you decide before you act.',
    ogTitle: 'QueryShield — Suspicious message analysis',
    ogDescription:
      'Phishing and scam detection through heuristic and semantic analysis. Risk score, explained signals, no data retained.',
  },

  nav: {
    analyzer: 'Analyzer',
    site: 'Check a website',
    pricing: 'Pricing',
    api: 'API',
    account: 'My account',
    privacy: 'Privacy',
  },

  header: {
    support: 'support@query-intel.com',
    openAccess: 'Get access',
  },

  footer: {
    tagline:
      'Analysis of suspicious messages and website verification for phishing, scam and fraud detection. A query-intel.com service.',
    ecosystem: 'Discover the query-intel.com ecosystem',
    productTitle: 'Product',
    legalTitle: 'Legal',
    resourcesTitle: 'Resources',
    linkAnalyzer: 'Message analyzer',
    linkSite: 'Check a website',
    linkPricing: 'Plans and pricing',
    linkApiDocs: 'API documentation',
    linkHealth: 'Service status',
    linkPrivacy: 'Privacy policy',
    linkTerms: 'Terms and disclaimer',
    linkMentions: 'Legal notice',
    disclaimer:
      'QueryShield provides an automated risk assessment and a probability score. No automated system is 100% reliable: the score is a decision aid and does not replace checking with the organisation concerned, nor professional advice. Submitted messages are processed in memory and are not retained.',
    rights: '© {year} query-intel.com — QueryShield. All rights reserved.',
    legalNotice:
      'The legal texts are drawn up in French and that version prevails. Only the French version is legally binding.',
  },

  common: {
    scoreAria: 'Risk score {score} out of 100',
    outOf: 'OUT OF 100',
    clear: 'Clear',
    copyReport: 'Copy report',
    engine: 'Engine',
    duration: 'Duration',
    quotaToday: 'Today’s quota',
    headers: 'Headers',
    headersAnalyzed: 'analysed',
    headersMissing: 'not provided',
    confidenceChip: 'Reliability {level} ({percent}%)',
    confidenceHigh: 'high',
    confidenceMedium: 'medium',
    confidenceLow: 'low',
    noSignal: 'No signal triggered',
    noFindingsDetail:
      'No rule was triggered. The message contains no suspicious link, no request for sensitive data and no social-engineering pattern detectable by static analysis.',
    signalsDetected: 'Signals detected',
    categoriesTitle: 'Signal breakdown',
    semanticActive: 'Semantic pass active',
    rulesTriggered: '{count} rule triggered',
    rulesTriggeredPlural: '{count} rules triggered',
    trigger: 'Triggering element',
    whatToDo: 'What to do now',
    semantic: 'Semantic',
    privacyShort: 'Static analysis · no data retained',
    networkError: 'The service is unreachable. Check your connection and try again.',
    genericError: 'The analysis failed. Please try again in a moment.',
    errors: {
      rate_limited: 'Too many requests from your connection. Wait a moment and try again.',
      quota_exceeded: 'Daily quota reached. Upgrade your plan to continue.',
      payload_too_large: 'The message is too large. Shorten it and try again.',
      invalid_json: 'Unreadable request. Reload the page and try again.',
      missing_text: 'Nothing to analyse. Paste the message you received (4 characters minimum).',
      missing_url: 'No address to check. Enter a domain name or a full address.',
      invalid_url:
        'This entry is not a usable website address. Use a domain name (example.com) or a full address (https://example.com/page). Internal network addresses are not accepted.',
    },
    siteContactedNever: 'the site is never opened',
  },

  severity: {
    critical: 'Critical',
    high: 'High',
    medium: 'Moderate',
    low: 'Low',
    info: 'Information',
  },

  category: {
    lien: 'Links and domains',
    identite: 'Identity spoofing',
    'ingenierie-sociale': 'Social engineering',
    'donnees-sensibles': 'Request for sensitive data',
    'entetes-email': 'Email authentication',
    contenu: 'Content and formatting',
    metadata: 'Message context',
  },

  verdict: {
    safe: 'Low risk',
    suspicious: 'Suspicious',
    dangerous: 'Likely fraud',
    safeSummary:
      'No fraud indicator was detected. The message contains no doubtful link, no request for sensitive data and no characteristic time pressure.',
  },

  siteVerdict: {
    official: 'Verified official site',
    unknown: 'Authenticity not verifiable',
    suspicious: 'Suspicious site',
    phishing: 'Fraudulent site',
  },

  home: {
    chip: 'Decision aid · static analysis · no data retained',
    titleLead: 'Check a suspicious message',
    titleAccent: 'before',
    titleTail: 'you act.',
    intro:
      'QueryShield analyses emails, text messages and instant messages for phishing, scams and fraud. The engine does not just say “dangerous”: it explains every signal it detects and tells you what to do.',
    ctaAnalyze: 'Analyse a message',
    ctaSite: 'Check a website',
    ctaPricing: 'See plans',
    ctaApi: 'Integrate the API',
    stepsTitle: 'How it works',
    step1Title: 'Paste the message',
    step1Body:
      'Email, SMS, WhatsApp or Telegram message. You can add the raw headers to trigger the SPF, DKIM and DMARC checks.',
    step2Title: 'The engine analyses',
    step2Body:
      'Links and identifiers are extracted, domains are compared against official brands, the social-engineering lexicon is applied, and the signals are weighted.',
    step3Title: 'You decide',
    step3Body:
      'A risk score, the list of signals with their explanation, and the concrete actions to take. The report can be exported for your records.',
    coverageTitle: 'What the engine detects',
    coverageIntro:
      'Over 80 heuristic rules, organised into independent families of signals. The convergence of several families raises the score: that is what makes the verdict reliable.',
    coverage1Title: 'Domain spoofing',
    coverage1Body:
      'Typosquatting, Cyrillic homoglyphs, punycode, misleading subdomains, raw IP addresses, URL shorteners.',
    coverage2Title: 'Social engineering',
    coverage2Body:
      'Time pressure, threat of suspension, fake technical support, financial lure, demands for secrecy, remote takeover.',
    coverage3Title: 'Sensitive requests',
    coverage3Body:
      'Passwords, SMS codes, two-factor codes, bank details, crypto recovery phrases, identity documents.',
    coverage4Title: 'Email authentication',
    coverage4Body:
      'Reading of SPF, DKIM and DMARC results, inconsistency between From, Reply-To and Return-Path, display name spoofing a brand.',
    coverage5Title: 'Risky payment methods',
    coverage5Body:
      'Instant transfers, prepaid vouchers, Transcash or PCS cards, premium-rate numbers, fake customs fees.',
    coverage6Title: 'Technical obfuscation',
    coverage6Body:
      'Invisible characters, mixed alphabets, broken-up brand names, heavily encoded URLs, hidden redirects.',
    warningTitle: 'Disclaimer',
    warningBody:
      'QueryShield provides an automated risk assessment and a probability score. No automated system is 100% reliable: a fraudulent message may trigger no signal, and a legitimate message may trigger some. The report is a decision aid and does not replace checking with the organisation concerned, nor the advice of a professional.',
    warningLink: 'Read the full terms',
    ctaTitle: 'Need regular access or a higher volume?',
    ctaBody:
      'Monthly and annual plans, API access with a licence key, quotas suited to teams. Card payment via Stripe.',
    ctaButton: 'See the plans',
  },

  analyzer: {
    channelEmail: 'Email',
    channelSms: 'SMS',
    channelMessaging: 'Messaging',
    channelOther: 'Other',
    senderPlaceholder: 'Sender (optional) — e.g. “Customer Service <contact@domain.com>”',
    senderLabel: 'Sender address',
    subjectPlaceholder: 'Message subject (optional)',
    subjectLabel: 'Message subject',
    textPlaceholder:
      'Paste the suspicious message here, keeping the links as they are.\n\nExample: “Your parcel is held, pay the fee within 24h: http://example.top/…”',
    textLabel: 'Message to analyse',
    senderHelp:
      'The sender is analysed automatically if it appears in the pasted text (a “From: …” line). Entering it here is still more reliable: it is the domain after the @ sign that determines whether the address is genuine.',
    headersShow: '+ Add the raw email headers (SPF / DKIM / DMARC)',
    headersHide: '− Hide the raw headers',
    headersPlaceholder:
      'Paste the full headers here.\n\nIn Gmail: “More” menu > “Show original”.\nIn Outlook: “Options” > “Message properties”.',
    headersLabel: 'Raw email headers',
    headersHelp:
      'This is the most reliable check: SPF, DKIM and DMARC tell you whether the sending domain is genuine. Without headers, the sender domain is still analysed from the field above or from the “From: …” line of the message.',
    samplesLabel: 'Demonstration samples',
    submit: 'Analyse this message',
    submitting: 'Analysing…',
    privacyNote: 'Processed in memory · no message retained · no link opened',
    disclaimer:
      'This report is a decision aid based on an automated analysis. No system guarantees 100% reliable detection: if in doubt, check directly with the organisation concerned using a number you have found yourself.',
  },

  samples: {
    'sms-colis': { label: 'SMS — parcel held', hint: 'Fake customs fees' },
    'email-banque': { label: 'Email — fake bank', hint: 'Failing DMARC headers' },
    'faux-conseiller': { label: 'Messaging — fake adviser', hint: 'SMS code request + imposed secrecy' },
    'faux-support': { label: 'Fake technical support', hint: 'Remote takeover' },
    'faux-gain': { label: 'Fake prize / crypto', hint: 'Financial lure and recovery phrase' },
    'faux-gain-sans-lien': { label: 'Fake prize — no link', hint: 'Random domain, no credential request' },
    'fausse-administration': { label: 'Fake public authority', hint: 'Domain imitating an institution' },
    casino: { label: 'Casino offer', hint: 'Unsolicited gambling lure' },
    legitime: { label: 'Legitimate message', hint: 'Control case' },
  },

  site: {
    metaTitle: 'Check a website',
    metaDescription:
      'Find out whether a website address is genuine, suspicious or fraudulent. The analysed site is never opened.',
    chip: 'Address verification · static analysis · the site is never opened',
    titleLead: 'Is this site',
    titleAccent: 'really',
    titleTail: 'the one it claims to be?',
    intro:
      'Paste a website address or a domain name. QueryShield compares the domain against a reference list of organisations, detects imitations and, if you enable it, checks the domain age with the official registry. The suspicious site is never contacted: opening it would warn the attacker.',
    ctaAnalyzer: 'Analyse a message',
    ctaApi: 'Integrate the API',
    criteriaTitle: 'What is checked',
    criteria1Title: 'Brand impersonation',
    criteria1Body:
      'The domain reuses the name of a bank, a carrier or a public body without being one of its official domains.',
    criteria2Title: 'Misleading similarity',
    criteria2Body:
      'Typosquatting (one character apart), Cyrillic homoglyphs, punycode encoding, a known extension used as a subdomain.',
    criteria3Title: 'Automatically generated domain',
    criteria3Body:
      'Abnormal entropy, runs of consonants, no vowels: the signature of domains registered in bulk for a campaign.',
    criteria4Title: 'Age and reputation',
    criteria4Body:
      'Optional checks: the domain registration date from the official registry (RDAP) and known reports.',
    limitsTitle: 'What the result does not say',
    limitsBody:
      '“No sign of fraud” does not mean “trusted site”. A domain unknown to our reference list comes out as not verifiable, and that is deliberate: we would rather show uncertainty than false reassurance. This check does not replace typing the official address yourself, nor professional advice when in doubt.',
    formTitle: 'Check a website address',
    urlPlaceholder: 'example.com or https://example.com/page',
    urlLabel: 'Website address to check',
    activeLabel: 'Active verification',
    activeBody:
      'queries the domain registry (age and registrar) and the site’s reputation. Far more reliable, but the address is then passed to those services.',
    activeNeverContacted: 'The site itself is never contacted',
    activeTail: ', neither now nor later.',
    submit: 'Check this site',
    submitting: 'Checking…',
    examplesLabel: 'Examples',
    exampleOfficial: 'Official site',
    exampleBank: 'Bank imitation',
    exampleSubdomain: 'Misleading subdomain',
    exampleRandom: 'Random domain',
    organisation: 'Organisation: {name} ({category})',
    impersonated: 'Impersonated organisation: {brands}',
    knownOrganisation: 'a known organisation',
    host: 'Host',
    domain: 'Domain',
    extension: 'Extension',
    activeChip: 'Active verification',
    networkTitle: 'Network checks',
    networkSource: 'source: domain registry · the site was not contacted',
    dnsResolution: 'DNS resolution',
    dnsNotChecked: 'not checked',
    dnsAddresses: '{count} address(es)',
    dnsFails: 'does not resolve',
    domainAge: 'Domain age',
    domainAgeDays: '{days} day(s)',
    domainAgeUnknown: 'unavailable',
    registeredOn: 'Registered on',
    registrar: 'Registrar',
    reputation: 'Reputation',
    reputationFlagged: 'flagged',
    reputationClean: 'no report',
    reputationNotChecked: 'not checked',
    reputationUnavailable:
      'The reputation check could not be carried out. This does not mean the site is clean: no opinion was obtained, in either direction.',
    footnote:
      'This check is a decision aid. The analysed site is never opened: the report relies on the domain structure, the brand reference list and, if you enabled it, the domain registry. No system guarantees 100% reliable detection.',
    summaryOfficial:
      '{host} is the official domain of {brand}. You can sign in there with confidence, provided you typed the address yourself.',
    summaryPhishing:
      'Risk score {score}/100: {host} imitates {brands} without being its official domain. Do not enter any data on this site.',
    summarySuspicious:
      'Risk score {score}/100: {host} shows structural anomalies without imitating any identifiable organisation. Treat this site as untrusted until verified.',
    summaryUnknown:
      'No sign of fraud detected on {host}, but this domain belongs to no organisation in our reference list. We therefore cannot confirm that it is genuine: finding no problem is not a validation.',
    summaryInvalid:
      'This entry is not a usable website address. Enter a domain name (example.com) or a full address (https://example.com/page).',
  },

  siteRecs: {
    'site-rec-invalid-input':
      'Check the format of the address: a domain name contains at least one dot and ends with an extension (.fr, .com, .gouv.fr...).',
    'site-rec-type-address':
      'Type the address yourself in the browser bar rather than clicking a link you received: it is the only way to be certain you reach the right site.',
    'site-rec-check-padlock':
      'Check that the browser padlock is present and that the domain name shown is exact, with no typo.',
    'site-rec-unknown-org':
      'No organisation in our reference list matches this domain. If it claims to be your bank, your operator or a public authority, it is not their official site.',
    'site-rec-use-search':
      'To check a service, go through a search engine or an official document, never through the link you want to verify.',
    'site-rec-no-credentials': 'Do not enter any username, password or card number on this site.',
    'site-rec-report-brand':
      'This site imitates a known organisation. Go to the official site by typing its address yourself, and report the attempt through the imitated organisation customer area or support desk.',
    'site-rec-inspect-chars':
      'The domain uses visually deceptive characters (mixed alphabet or international encoding). Copy the address and paste it into a text editor: foreign characters become obvious there.',
    'site-rec-expand-shortener':
      'The address goes through a shortener: the real destination is invisible before the click. Expand it with a resolver tool before doing anything.',
    'site-rec-domain-gone':
      'This domain name no longer resolves: the site was probably taken down after serving a campaign. The link you received therefore comes from an old or fraudulent message.',
    'site-rec-domain-young':
      'This domain was registered very recently. Fraudulent sites are set up for a few days or weeks: the youth of the domain is itself a reason for caution.',
    'site-rec-safe-browsing':
      'This site appears on the Google Safe Browsing list of dangerous sites. Do not visit it and delete the message that contained it.',
    'site-rec-report-authority':
      'Report the address: the Pharos platform (internet-signalement.gouv.fr) for fraudulent content, or Signal Spam for emails.',
  },

  randomSignals: {
    'entropy-very-high': 'very high entropy ({value} bits per character)',
    'entropy-high': 'high entropy ({value} bits per character)',
    'consonant-run': '{value} consecutive consonants',
    'no-vowel': 'no vowel at all',
    'few-vowels': 'almost no vowels ({value} %)',
    'interleaved-digits': 'digits interleaved in the name',
    'very-long': 'unusually long name ({value} characters)',
  },

  findings: {
    'url-dangerous-scheme': {
      title: 'Dangerous URL scheme',
      detail:
        'The address uses a `data:`, `javascript:` or `file:` scheme. This kind of address runs code or opens a local file without going through a website: it has no reason to appear in a legitimate message.',
    },
    'url-ip-literal': {
      title: 'Link to a raw IP address',
      detail:
        'The link points directly at an IP address instead of a domain name. Official services always use a domain; a raw IP avoids blocklists and certificates.',
    },
    'url-punycode': {
      title: 'Domain encoded in punycode',
      detail:
        'The domain contains an `xn--` label. This is the encoding for non-Latin characters: it makes a name look identical to an official brand while the domain is actually different.',
    },
    'url-homoglyph': {
      title: 'Domain with homoglyph characters',
      detail:
        'The domain mixes the Latin alphabet with visually identical Cyrillic or Greek characters. This is the most effective way to imitate a brand: to the eye, the domain is indistinguishable.',
    },
    'url-userinfo-trick': {
      title: 'Domain hidden behind an @ sign',
      detail:
        'The URL contains an @ sign before the path. Everything before the @ is ignored by the browser: the domain actually visited is not the one shown first.',
    },
    'url-risky-tld': {
      title: 'High-risk domain extension',
      detail:
        'The domain extension is among those heavily used by phishing campaigns, because they are sold cheaply and without identity checks.',
    },
    'url-shortener': {
      title: 'Shortened link',
      detail:
        'The link goes through a shortening service: the real destination is invisible before the click. For an unsolicited message, treat the destination as unknown.',
    },
    'url-brand-impersonation': {
      title: 'Domain impersonating a known brand',
      detail:
        'The domain reuses the name of {brands} without being an official domain of that brand. This is the most common signature of targeted phishing.',
    },
    'url-typosquat': {
      title: 'Typo imitating an official domain',
      detail:
        'The domain differs by a single character from an official domain. This technique (typosquatting) exploits a typo or a quick read of the message.',
    },
    'url-typosquat-approx': {
      title: 'Domain visually close to an official one',
      detail:
        'The domain closely resembles an official domain without being identical to it. Check it character by character before taking any action.',
    },
    'url-random-domain': {
      title: 'Automatically generated domain',
      detail:
        'The domain resembles no readable name ({signals}). Randomly produced domains are registered in bulk for a few days: they have no history, no reputation and no reason to appear in a legitimate message.',
    },
    'url-random-domain-weak': {
      title: 'Unusual domain name',
      detail:
        'The structure of the domain is unusual ({signals}). A signal to be confirmed by the other checks.',
    },
    'url-institutional-mimicry': {
      title: 'Domain imitating an institution',
      detail:
        'The domain reuses the vocabulary of a public institution ({words}) without being an official domain. Public bodies use .gouv.fr or .gov domains: a commercial variant is an impersonation.',
    },
    'url-tld-as-label': {
      title: 'Extension diverted into a subdomain',
      detail:
        'The address contains a known extension (.com, .gov, .fr…) in a position that is not the final extension. The domain actually registered is the part that follows, but the eye stops on the part before it: the arrangement exists only to mislead the reader.',
    },
    'url-lure-keywords': {
      title: 'Bait terms in the domain',
      detail:
        'The domain contains terms designed to attract ({tokens}). A domain name chosen for its sales pitch is almost always a domain registered for a bulk mailing campaign.',
    },
    'url-sensitive-path': {
      title: 'Login keywords in the link',
      detail:
        'The link contains login or payment terms ({keywords}) on a domain that is not the one of the announced organisation. They are there to reassure the victim.',
    },
    'url-sensitive-path-strong': {
      title: 'Login keywords in the link',
      detail:
        'The link piles up several login or payment terms ({keywords}) on a domain that is not the one of the announced organisation. They are there to reassure the victim.',
    },
    'url-plain-http-sensitive': {
      title: 'Sensitive page served over HTTP',
      detail:
        'The link points to a login or payment page without encryption. No legitimate service collects credentials over HTTP.',
    },
    'url-many-subdomains': {
      title: 'Stacked subdomains',
      detail:
        'The domain has an unusual number of subdomains. The stacking pushes the real domain out of the visible area of the address bar.',
    },
    'url-long-host': {
      title: 'Abnormally long domain name',
      detail:
        'The domain name is very long. Domains generated automatically by phishing kits often are.',
    },
    'url-many-hyphens': {
      title: 'Multiple hyphens in the domain',
      detail:
        'The domain chains several hyphens, a pattern typical of domains generated to imitate an official name.',
    },
    'url-odd-port': {
      title: 'Non-standard port',
      detail:
        'The address specifies a non-standard port. Official sites do not use them, and it often points to an attacker’s server.',
    },
    'url-redirect-param': {
      title: 'Redirect to a hidden destination',
      detail:
        'The link contains a redirect parameter. The page shown may look legitimate while sending you to another site after validation.',
    },
    'url-heavy-encoding': {
      title: 'Heavily encoded URL',
      detail:
        'The link contains many escape sequences. The encoding hides the real destination and bypasses filters.',
    },
    'url-zero-width': {
      title: 'Invisible characters in the link',
      detail:
        'The link contains zero-width characters, invisible on screen. They serve only to deceive filters and the human eye.',
    },
    'url-anchor-mismatch': {
      title: 'Link text differs from its destination',
      detail:
        'The link text shows one domain, but the link points to another. This is direct evidence of deceptive intent.',
    },
    'site-official-domain': {
      title: 'Verified official domain',
      detail:
        'This domain is registered as the official domain of {brand}. It is a trusted address: messages and links pointing here are consistent.',
    },
    'site-impersonates-brand': {
      title: 'This site impersonates a known organisation',
      detail:
        'The domain reuses the name of {brands} without being one of its official domains. This is the very definition of a phishing site: it imitates an organisation to harvest credentials or payments.',
    },
    'site-insecure-scheme': {
      title: 'Address over HTTP, without encryption',
      detail:
        'The address provided is `http://`. No serious retailer or bank still operates this way: the connection is not encrypted and nothing guarantees the identity of the server.',
    },
    'site-not-resolving': {
      title: 'The domain does not resolve',
      detail:
        'DNS resolution of this domain name fails. The site no longer exists, or was never configured to answer: this is common for domains registered and then abandoned after a phishing campaign.',
    },
    'site-newly-registered': {
      title: 'Domain registered very recently',
      detail:
        'This domain was registered {days} day(s) ago (on {date}). Phishing sites live for a few days to a few weeks: a brand-new domain presenting itself as an established organisation is almost always fraudulent.',
    },
    'site-recently-registered': {
      title: 'Recent domain',
      detail:
        'This domain was registered {days} day(s) ago. That is not abnormal in itself, but a domain under six months old cannot have the history of an established organisation.',
    },
    'site-safe-browsing-flagged': {
      title: 'Site flagged as dangerous',
      detail:
        'This site appears on a public list of dangerous sites ({threats}). It is already identified as distributing malicious content or as a phishing site.',
    },
  },
};
