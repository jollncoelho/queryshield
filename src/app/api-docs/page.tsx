import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Documentation API',
  description:
    'Integrez le moteur d analyse QueryShield dans vos propres outils : analyse de message, sante du service, facturation et licences.',
};

const ENDPOINTS = [
  {
    method: 'POST',
    path: '/api/analyze',
    title: 'Analyser un message',
    body: `{
  "text": "Votre colis est bloque, reglez les frais sous 24h : http://exemple.top/x",
  "channel": "sms",
  "subject": "optionnel, e-mail uniquement",
  "rawHeaders": "optionnel, en-tetes bruts de l e-mail",
  "sender": "optionnel, adresse de l expediteur"
}`,
    response: `{
  "score": 91,
  "verdict": "dangerous",
  "confidence": 0.84,
  "summary": "Score de risque 91/100 : le message est tres probablement frauduleux.",
  "findings": [
    {
      "id": "url-brand-impersonation",
      "category": "identite",
      "severity": "high",
      "title": "Domaine usurpant une marque connue",
      "detail": "Le domaine reprend le nom d une marque...",
      "evidence": "hxxp://chronopost-livraison-suivi[.]top/frais-colis",
      "weight": 20,
      "sources": ["heuristique"]
    }
  ],
  "iocs": {
    "urls": ["http://chronopost-livraison-suivi.top/frais-colis"],
    "domains": ["chronopost-livraison-suivi.top"],
    "emails": [],
    "phones": [],
    "ibans": [],
    "crypto": [],
    "files": []
  },
  "signals": { "critical": 0, "high": 3, "medium": 4, "low": 1, "info": 0 },
  "categories": [{ "category": "lien", "score": 47, "findings": 4 }],
  "recommendations": ["Ne cliquez sur aucun lien..."],
  "quota": { "used": 1, "limit": 10, "remaining": 9 },
  "plan": "free"
}`,
    notes: [
      'Le champ `text` est obligatoire (4 caracteres minimum, 20 000 maximum).',
      '`channel` accepte : email, sms, messaging, unknown.',
      'Le contenu recu n est ni stocke, ni journalise, ni transmis a un tiers publicitaire.',
      'Les liens presents dans le message ne sont jamais ouverts ni resolus par le moteur.',
    ],
  },
  {
    method: 'POST',
    path: '/api/check-site',
    title: 'Verifier l authenticite d un site',
    body: `{
  "url": "credit-agricole-securite.xyz",
  "active": false
}`,
    response: `{
  "verdict": "phishing",
  "score": 79,
  "confidence": 0.55,
  "officialBrand": null,
  "impersonatedBrands": ["Credit Agricole"],
  "identity": { "host": "credit-agricole-securite.xyz", "registrable": "credit-agricole-securite.xyz", "tld": "xyz" },
  "findings": [
    {
      "id": "site-impersonates-brand",
      "severity": "critical",
      "title": "Ce site se fait passer pour une organisation connue",
      "params": { "brands": "Credit Agricole" }
    }
  ],
  "recommendations": [
    { "id": "site-rec-no-credentials", "text": "Ne saisissez ni identifiant, ni mot de passe..." }
  ],
  "network": null,
  "meta": { "active": false, "siteContacted": false }
}`,
    notes: [
      'Le site analyse n est JAMAIS ouvert ni contacte : toutes les verifications sont statiques.',
      '`active: true` interroge en plus l annuaire des domaines (RDAP) et la reputation du site. Le nom de domaine est alors transmis a ces services tiers.',
      '`verdict` vaut : official, unknown, suspicious ou phishing.',
      '`unknown` signifie « rien de suspect, mais rien ne confirme non plus » : ce n est pas une validation.',
      'Les adresses de reseau interne et les plages privees sont refusees (400).',
    ],
  },
  {
    method: 'GET',
    path: '/api/health',
    title: 'Etat du service',
    body: null,
    response: `{
  "status": "ok",
  "service": "queryshield",
  "engine": "queryshield-heuristic",
  "version": "0.1.0",
  "semanticEngine": "absent (heuristiques seules)",
  "billing": "absent"
}`,
    notes: ['Utile pour les sondes de supervision et les integrations CI.'],
  },
  {
    method: 'POST',
    path: '/api/billing/checkout',
    title: 'Ouvrir une session de paiement',
    body: `{
  "plan": "pro",
  "interval": "monthly"
}`,
    response: `{ "url": "https://checkout.stripe.com/c/pay/cs_test_..." }`,
    notes: [
      'Repond 501 tant que STRIPE_SECRET_KEY et les identifiants de prix ne sont pas configures.',
      'L appelant doit rediriger l utilisateur vers l URL renvoyee.',
    ],
  },
  {
    method: 'POST',
    path: '/api/billing/webhook',
    title: 'Recevoir les evenements Stripe',
    body: 'corps brut envoye par Stripe',
    response: `{ "received": true, "event": "checkout.session.completed" }`,
    notes: [
      'La signature `stripe-signature` est verifiee en HMAC-SHA256 avec tolerance de 300 secondes.',
      'Aucune re-serialisation du corps : la verification porte sur les octets bruts.',
    ],
  },
];

const ERRORS = [
  { code: '400 missing_text', meaning: 'Le champ text est absent ou trop court.' },
  { code: '400 missing_url', meaning: 'Aucune adresse de site n a ete fournie.' },
  {
    code: '400 invalid_url',
    meaning: 'Adresse inexploitable, ou hote interne / plage privee refuse par le garde-fou SSRF.',
  },
  { code: '400 invalid_json', meaning: 'Le corps de la requete n est pas un JSON valide.' },
  { code: '413 payload_too_large', meaning: 'Corps de requete au-dela de la limite annoncee.' },
  { code: '429 rate_limited', meaning: 'Trop de requetes depuis la meme origine.' },
  { code: '429 quota_exceeded', meaning: 'Quota quotidien de l offre atteint.' },
  { code: '501 billing_not_configured', meaning: 'La facturation n est pas activee sur cette instance.' },
  { code: '502 stripe_error', meaning: 'Stripe a refuse la creation de la session.' },
];

export default function ApiDocsPage() {
  return (
    <div className="mx-auto max-w-4xl px-5 py-14">
      <h1 className="text-[30px] font-medium tracking-[-0.01em] text-slate-50">Documentation API</h1>
      <p className="mt-4 max-w-2xl text-[14px] leading-relaxed text-slate-400">
        Toutes les capacites du produit sont exposees par API. Les endpoints d analyse sont disponibles sur l offre
        gratuite dans la limite du quota quotidien ; au-dela, une cle de licence est requise dans l en-tete
        <code className="mx-1 rounded bg-ink-800 px-1.5 py-0.5 font-mono text-[12px] text-brand-300">x-qs-license</code>.
      </p>

      <section className="mt-8 qs-card p-5">
        <p className="qs-label">Authentification</p>
        <pre className="mt-3 overflow-x-auto rounded-lg border border-line bg-ink-900 p-3.5 font-mono text-[11.5px] leading-relaxed text-slate-300">
{`curl -X POST https://queryshield.query-intel.com/api/analyze \\
  -H "content-type: application/json" \\
  -H "x-qs-license: VOTRE_CLE" \\
  -d '{"text":"Votre colis est bloque : http://exemple.top/x","channel":"sms"}'`}
        </pre>
        <p className="mt-3 text-[11.5px] leading-relaxed text-slate-500">
          Sans cle de licence, la requete est rattachee a un identifiant anonyme depose en cookie et soumise au quota
          de l offre Decouverte.
        </p>
      </section>

      <div className="mt-10 space-y-8">
        {ENDPOINTS.map((endpoint) => (
          <section key={endpoint.path} className="qs-card overflow-hidden">
            <div className="flex flex-wrap items-center gap-3 border-b border-line/70 px-5 py-3.5">
              <span className="rounded-md border border-brand-500/40 bg-brand-500/10 px-2 py-0.5 font-mono text-[11px] text-brand-300">
                {endpoint.method}
              </span>
              <code className="font-mono text-[13px] text-slate-200">{endpoint.path}</code>
              <span className="text-[12px] text-slate-500">{endpoint.title}</span>
            </div>

            <div className="space-y-4 p-5">
              {endpoint.body && (
                <div>
                  <p className="qs-label">Requete</p>
                  <pre className="mt-2 overflow-x-auto rounded-lg border border-line bg-ink-900 p-3.5 font-mono text-[11.5px] leading-relaxed text-slate-300">
{endpoint.body}
                  </pre>
                </div>
              )}

              <div>
                <p className="qs-label">Reponse</p>
                <pre className="mt-2 overflow-x-auto rounded-lg border border-line bg-ink-900 p-3.5 font-mono text-[11.5px] leading-relaxed text-slate-300">
{endpoint.response}
                </pre>
              </div>

              <ul className="space-y-1.5">
                {endpoint.notes.map((note) => (
                  <li key={note} className="flex gap-2.5 text-[12px] leading-relaxed text-slate-400">
                    <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-brand-500" />
                    {note}
                  </li>
                ))}
              </ul>
            </div>
          </section>
        ))}
      </div>

      <section className="mt-10 qs-card p-5">
        <h2 className="text-[15px] font-medium text-slate-100">Codes d erreur</h2>
        <dl className="mt-4 divide-y divide-line/70">
          {ERRORS.map((error) => (
            <div key={error.code} className="flex flex-wrap gap-3 py-2.5">
              <dt className="w-64 shrink-0 font-mono text-[11.5px] text-amber-300">{error.code}</dt>
              <dd className="text-[12px] text-slate-400">{error.meaning}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="mt-10 qs-card p-5">
        <h2 className="text-[15px] font-medium text-slate-100">Comprendre le score</h2>
        <ul className="mt-4 space-y-2.5 text-[12.5px] leading-relaxed text-slate-400">
          <li>
            <strong className="font-medium text-slate-200">0 a 27 — risque faible.</strong> Aucun signal fort. Le
            message peut toutefois contenir des elements hors du perimetre de l analyse statique.
          </li>
          <li>
            <strong className="font-medium text-slate-200">28 a 59 — suspect.</strong> Au moins un signal notable.
            Verifiez aupres de l organisme concerne avant toute action.
          </li>
          <li>
            <strong className="font-medium text-slate-200">60 a 100 — fraude probable.</strong> Plusieurs signaux
            convergent, ou un signal critique est present. Ne cliquez sur rien et n envoyez aucune donnee.
          </li>
        </ul>
        <p className="mt-4 text-[11.5px] leading-relaxed text-slate-500">
          Le score est calcule par une courbe logarithmique sur la somme des poids, puis releve par des regles de
          decision explicites (deux signaux critiques, trois signaux forts, convergence de trois familles de signaux).
          Le champ `confidence` mesure la qualite du signal disponible, pas la certitude du verdict.
        </p>
      </section>
    </div>
  );
}
