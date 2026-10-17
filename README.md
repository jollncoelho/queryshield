# QueryShield

Analyse anti-arnaque des messages : e-mail, SMS et messagerie instantanee.
Collez un message suspect, obtenez un score de risque, la liste des signaux
detectes avec leur explication, et les actions concretes a mener.

Verification d'authenticite d'un site : indiquez une adresse, sachez si elle
est officielle, suspecte ou frauduleuse — sans jamais ouvrir le site analyse.

Interface disponible en **francais, anglais, portugais et espagnol**.

Un service de l'ecosysteme **query-intel.com** — support : support@query-intel.com

---

## 1. Ce que fait le projet

| Capacite | Etat |
|---|---|
| Moteur heuristique (80+ regles) | Operationnel |
| Analyse d'URL et de domaines | Operationnel |
| Reputation structurelle des domaines (entropie, imitation d'institution) | Operationnel |
| Analyse de l'expediteur sans en-tetes bruts | Operationnel |
| Analyse des en-tetes SPF / DKIM / DMARC | Operationnel |
| Verification d'authenticite d'un site, sans jamais l'ouvrir | Operationnel |
| Scoring, verdict, confiance, recommandations | Operationnel |
| Interface web (analyseur, verificateur de site, tarifs, documentation, legal) | Operationnel |
| Interface en francais, anglais, portugais et espagnol | Operationnel |
| API REST avec quotas et licences | Operationnel |
| Persistance des licences, quotas et compteurs (SQLite, WAL) | Operationnel |
| Limitation de debit par IP condensee | Operationnel |
| Facturation Stripe (checkout + webhook signe + portail) | Code livre, a activer par configuration |
| Passe semantique par modele de langage | Microservice livre (phase 2), optionnel |

## 2. Architecture

```
Navigateur / client API
        |
        v
Next.js (produit + facturation)            <-- src/
  - UI : analyseur, verificateur de site, tarifs, documentation, pages legales
  - UI multilingue : fr / en / pt / es, langue resolue cote serveur
  - POST /api/analyze     -> limitation de debit -> quota -> moteur heuristique
  - POST /api/check-site  -> limitation de debit -> quota -> moteur de site
                             (+ DNS / RDAP / reputation, sur demande explicite)
  - POST /api/billing/checkout, /api/billing/portal, /api/billing/webhook
        |
        |  QUERYSHIELD_ENGINE_URL (optionnel)
        v
Microservice Python (passe semantique)     <-- engine-py/
  - FastAPI, POST /analyze
  - Ollama local (defaut) ou API compatible OpenAI
  - Renvoie des Finding[] fusionnes par le moteur principal

Stockage (licences, quotas, compteurs de debit)   <-- src/lib/db/
  - SQLite en mode WAL (defaut), ou repli memoire explicite
  - Abstraction par depot : le pilote est remplacable sans toucher a l'API
```

Le moteur principal est **autonome**. Le microservice Python est un
enrichissement : s'il est absent, lent ou en panne, l'analyse aboutit quand
meme avec les seules heuristiques. Une panne du LLM ne degrade jamais le
service.

## 3. Le moteur d'analyse

Le moteur est organise en familles de signaux independantes, puis agrege.

| Module | Fichier | Role |
|---|---|---|
| Extraction | `src/lib/engine/extract.ts` | URLs, domaines, e-mails, telephones, IBAN, adresses crypto, fichiers |
| Liens et domaines | `src/lib/engine/url.ts` | Typosquatting, homoglyphes, punycode, IP brute, arobase, TLD a risque, raccourcisseurs, redirections, discordance texte/lien |
| Reputation des domaines | `src/lib/engine/domain-reputation.ts` | Domaines generes automatiquement (entropie, suites de consonnes), imitation d'institution, extension detournee en sous-domaine, termes d'appat |
| Expediteur | `src/lib/engine/sender.ts` | Analyse du domaine de l'expediteur **sans en-tetes bruts** : generation, imitation, messagerie grand public, nom affiche trompeur |
| Ingenierie sociale | `src/lib/engine/social.ts` + `lexicon.ts` | Urgence, menace, faux support, appat financier, casino et jeux, retrait conditionne, injonction au secret, prise en main a distance, obfuscation |
| En-tetes e-mail | `src/lib/engine/headers.ts` | SPF, DKIM, DMARC, incoherence From / Reply-To / Return-Path, nom affiche usurpe |
| Referentiel | `src/lib/engine/brands.ts` | ~100 marques et entites francophones frequemment usurpees |
| Scoring | `src/lib/engine/scoring.ts` | Ponderation, courbe logarithmique, regles de decision, confiance |
| Verification de site | `src/lib/engine/site.ts` | Verdict d'authenticite d'une adresse : domaine officiel, imitation de marque, schema non chiffre |
| Verifications reseau | `src/lib/engine/site-network.ts` | Resolution DNS, age du domaine (RDAP), reputation (Google Safe Browsing). **Le site analyse n'est jamais contacte** |
| Traductions | `src/lib/i18n/` | Quatre langues (fr, en, pt, es) : interface, verificateur de site, messages d'erreur |

### Deux principes de conception

**Les regles sensibles exigent un verbe de sollicitation.** Un message qui
mentionne simplement « mot de passe » ne declenche rien. Il faut une demande
explicite a proximite (« communiquez », « saisissez », « transmettez »). Cela
divise fortement les faux positifs sur les messages transactionnels legitimes.

**Les signaux se renforcent.** Un lien douteux seul reste modere. Un lien
douteux *plus* une demande de donnees bancaires produit un constat critique
supplementaire (`combo-sensitive-request-with-link`). C'est la convergence qui
fait monter le score, pas la somme brute.

### Les regles d'appat ne dependent pas d'une demande d'identifiants

Une classe de fraude ne reclame jamais de mot de passe : la fausse promesse de
gain. Le message annonce un bonus, un remboursement, des tours de casino ou un
retrait a debloquer, et se contente de faire cliquer ou payer. Ce type de
message est traite par une regle de combinaison dediee.

`combo-lure-with-untrusted-sender` se declenche lorsqu'une promesse financiere
(`lex-financial-lure`, `lex-guaranteed-returns`, `lex-gambling-lure`,
`lex-withdrawal-bait`) est emise depuis un domaine qui n'est pas celui d'un
operateur verifie, et qu'au moins un element objectif confirme l'intention :
signal structurel sur le domaine, lien douteux, ou organisation revendiquee.
Le score est alors porte a **78/100 minimum**, verdict « tres probablement
frauduleux », meme si le corps du texte ne demande aucun identifiant.

La condition objective est un garde-fou deliberе : sans elle, un message
interne parfaitement legitime (« votre bulletin de paie inclut une prime
exceptionnelle ») serait classe frauduleux, ce qui ruinerait la confiance dans
l'outil. Le cas reel a l'origine de cette regle — domaine aleatoire de 24
caracteres sans voyelle — satisfait evidemment la condition.

### Le domaine de l'expediteur est analyse meme sans en-tetes bruts

L'analyse SPF / DKIM / DMARC exige les en-tetes bruts, que la plupart des
utilisateurs ne savent pas extraire. Auparavant, l'expediteur n'etait donc
analyse que dans le cas favorable, et un message frauduleux pouvait obtenir un
score nul. Desormais :

- si l'utilisateur fournit les en-tetes bruts, l'analyse complete s'applique ;
- sinon, le domaine de l'expediteur est analyse a partir du champ dedie de
  l'interface, ou de la ligne « De : ... » du message colle.

Un point important : plusieurs messageries grand public (`gmail.com`,
`outlook.com`, `live.com`, `free.fr`...) figurent au referentiel de marques,
car les marques concernees en sont proprietaires. Elles en sont explicitement
exclues. Sans cette exclusion, une adresse `xxx@gmail.com` serait consideree
comme un expediteur officiel « Google » : elle serait blanchie, et surtout elle
desactiverait la severite des regles d'appat.

### La verification de site n'ouvre jamais le site

Un scanner d'URL classique ouvre la page pour l'analyser. C'est exactement ce
qu'il ne faut pas faire : la requete previent l'attaquant qu'il a ete detecte et
lui livre l'adresse IP de la victime. QueryShield ne contacte donc jamais le
site soumis. Toutes les verifications sont statiques :

- structure du domaine (entropie, suites de consonnes, extension detournee) ;
- comparaison au referentiel de marques et detection de typosquatting ;
- lecture du chemin (mots-cles de connexion ou de paiement) ;
- **optionnellement**, interrogation de l'annuaire des domaines (RDAP, pour la
  date d'enregistrement et le registrar) et d'un service de reputation. Ces
  services tiers recoivent l'adresse du domaine, jamais le site lui-meme.

Le verdict comporte quatre valeurs, et l'absence de reponse en est une :

| Verdict | Signification |
|---|---|
| `official` | Le domaine est le domaine officiel verifie d'une organisation du referentiel |
| `phishing` | Le domaine imite une organisation connue, ou figure sur une liste de sites dangereux |
| `suspicious` | Anomalies structurelles, sans imitation identifiable |
| `unknown` | Rien de suspect, mais **rien ne confirme l'authenticite non plus** |

Le cas `unknown` est volontairement distinct de « site sur » : un domaine
inconnu de notre referentiel n'est pas un domaine de confiance, et ne pas
trouver de probleme n'est pas une validation. Le resultat affiche cette
incertitude plutot qu'une fausse reassurance.

Un signalement de reputation prime sur le referentiel : un domaine officiel
peut avoir ete compromis, et un avis externe negatif est un fait plus recent
que notre liste.

Les hotes internes et les plages d'adresses privees sont refuses en amont
(`isPrivateHost`). Sans ce garde-fou, la resolution DNS optionnelle
transformerait l'API en outil de sondage du reseau interne.

### Calcul du score

```
poids   : critical 35, high 20, medium 9, low 3, info 0
score   = 100 x (1 - exp(-somme / 48))          # saturation progressive
puis    regles de decision explicites :
          2 signaux critiques            -> score minimal 82
          1 critique + somme >= 30       -> score minimal 72
          1 critique                     -> score minimal 48
          3 signaux forts                -> score minimal 68
          appat + expediteur non fiable  -> score minimal 78
verdict : < 28 faible | 28-59 suspect | >= 60 fraude probable
```

`confidence` mesure la **qualite du signal disponible** (presence d'URL,
presence d'en-tetes, longueur du message), pas la certitude du verdict. Un
message de 12 caracteres sans lien ne peut pas produire une evaluation fiable :
la confiance est plafonnee.

### Quatre langues : fr, en, pt, es

L'interface et le verificateur de site sont disponibles en francais, anglais,
portugais et espagnol. La langue est resolue **cote serveur**, dans cet ordre :
cookie de choix explicite, puis en-tete `Accept-Language` du navigateur, puis le
francais. Le selecteur du bandeau superieur pose le cookie puis rafraichit la
page : il n'y a donc jamais de page a moitie traduite.

Trois principes structurent la couche de traduction :

**Le francais definit la forme du dictionnaire.** `Dictionary = typeof fr` :
une cle oubliee dans une autre langue fait echouer `npm run typecheck`, elle ne
se transforme pas silencieusement en texte vide a l'ecran.

**Le moteur reste monolingue.** Il produit toujours ses constats en francais,
avec un identifiant de regle stable (`url-risky-tld`, `site-newly-registered`...)
et, pour les textes dynamiques, les valeurs a inserer dans `finding.params`.
La traduction est appliquee au moment de l'affichage (`src/lib/i18n/finding.ts`).
Consequence assumee : **les explications des regles du moteur d'analyse
(lexique d'ingenierie sociale, en-tetes) restent en francais** ; l'interface, le
verificateur de site et ses messages de detection sont, eux, traduits.

**Le repli est visible, jamais silencieux.** Une regle sans traduction affiche
le texte francais du moteur ; un gabarit dont un parametre manque laisse
`{parametre}` apparent plutot que d'ecrire « undefined ». Un trou de traduction
se voit, il ne se deguise pas.

Les indices de generation automatique d'un domaine (entropie, suites de
consonnes...) circulent sous forme de codes compacts (`entropy-high=3.51`) et
sont remis en forme dans la langue active.

## 4. Installation

```bash
cd queryshield
npm install
cp .env.example .env.local     # puis ajuster si besoin
npm run dev                    # http://localhost:4321
```

Aucune variable d'environnement n'est requise pour utiliser l'analyseur.
`STRIPE_SECRET_KEY` et les identifiants de prix sont necessaires uniquement
pour ouvrir les abonnements.

### Verification rapide

```bash
npm run typecheck     # typage strict
npm test              # moteur (43 cas) + traductions (32 cas) + persistance et debit (64 cas), hors ligne
```

Chaque suite est aussi lancable seule : `npm run test:engine`, `npm run test:i18n`,
`npm run test:store`.

Avec le serveur de developpement demarre :

```bash
curl http://localhost:4321/api/health

curl -X POST http://localhost:4321/api/analyze \
  -H "content-type: application/json" \
  -d '{"text":"Votre colis est bloque, reglez les frais de dedouanement sous 24h : http://chronopost-livraison-suivi.top/frais-colis","channel":"sms"}'

# Verification de site, sans verification reseau
curl -X POST http://localhost:4321/api/check-site \
  -H "content-type: application/json" \
  -d '{"url":"credit-agricole-securite.xyz","active":false}'
```

L'interface suit la langue annoncee par le navigateur. Pour la forcer :

```bash
curl -H "Accept-Language: en-GB" http://localhost:4321/verifier-site
```

## 5. Configuration

| Variable | Role | Defaut |
|---|---|---|
| `NEXT_PUBLIC_APP_URL` | Base des redirections Stripe | `http://localhost:4321` |
| `QUERYSHIELD_DB_FILE` | Fichier SQLite (licences, quotas, debit) | `./data/queryshield.db` |
| `QUERYSHIELD_DB_DRIVER` | `sqlite` ou `memory` (non durable) | `sqlite` |
| `QUERYSHIELD_IP_SALT` | Sel du condensat d'adresse IP | sel de developpement |
| `QUERYSHIELD_TRUSTED_PROXY_HOPS` | Nombre de proxys de confiance devant l'application | `0` |
| `QUERYSHIELD_RATELIMIT_DISABLED` | Desactive la limitation de debit (tests) | `false` |
| `QUERYSHIELD_SITE_ACTIVE` | Active les verifications reseau du verificateur de site | `true` |
| `GOOGLE_SAFE_BROWSING_API_KEY` | Active la verification de reputation des sites | desactivee |
| `QUERYSHIELD_ENGINE_URL` | Active la passe semantique | desactivee |
| `QUERYSHIELD_ENGINE_TOKEN` | Jeton partage avec le microservice | aucun |
| `QUERYSHIELD_ENGINE_TIMEOUT_MS` | Delai maximal de la passe LLM | `8000` |
| `QUERYSHIELD_FREE_DAILY_QUOTA` | Analyses gratuites par jour | `10` |
| `STRIPE_SECRET_KEY` | Active la facturation | vide |
| `STRIPE_WEBHOOK_SECRET` | Verification de signature du webhook | vide |
| `STRIPE_PRICE_PRO_MONTHLY` / `_YEARLY` | Identifiants de prix Pro | vides |
| `STRIPE_PRICE_BUSINESS_MONTHLY` / `_YEARLY` | Identifiants de prix Business | vides |

### Limitation de debit

Trois seuils glissants, evalues dans cet ordre : rafale (15 requetes par
minute, 60 pour une offre payante), debit soutenu (100 ou 800 par quart
d'heure), et plafond global du service (900 par minute). Les reponses portent
les en-tetes `RateLimit-Limit`, `RateLimit-Remaining` et `Retry-After`.

Les adresses IP ne sont jamais stockees en clair : elles sont condensees par
HMAC-SHA256 avec un sel renouvele chaque jour. Les compteurs d'une journee
donnee ne sont donc pas correlables avec ceux de la veille.

**Cette limitation ne remplace pas celle du reverse proxy.** Placez nginx (ou
l'equivalent) devant l'application et appliquez-y un `limit_req` : c'est le
seul niveau qui absorbe un debit anormal avant qu'il n'atteigne Node.js.

### Gestion des licences

```bash
npm run license -- issue --plan pro --email client@exemple.fr
npm run license -- list
npm run license -- show QS-PRO-XXXX-XXXX-XXXX
npm run license -- revoke QS-PRO-XXXX-XXXX-XXXX
npm run license -- quota QS-PRO-XXXX-XXXX-XXXX
npm run license -- reset-quota QS-PRO-XXXX-XXXX-XXXX
npm run license -- stats
```

## 6. Microservice Python (optionnel)

```bash
cd engine-py
python -m venv .venv
.venv/Scripts/pip install -r requirements.txt      # Windows
.venv/bin/pip install -r requirements.txt          # Linux / macOS
python main.py                                     # ecoute sur 127.0.0.1:8100
```

Puis, cote Next.js :

```
QUERYSHIELD_ENGINE_URL=http://127.0.0.1:8100
QUERYSHIELD_ENGINE_TOKEN=change-me
```

Le modele par defaut est `hermes3:8b` servi par Ollama. Voir
`engine-py/README.md` pour les autres fournisseurs.

## 7. Avant mise en production — points a traiter

Cette base est fonctionnelle mais **non prete pour une ouverture au public**.
Les elements suivants sont volontairement laisses en l'etat et doivent etre
traites.

**Bloquants legaux**

- Renseigner les mentions legales (`src/app/legal/mentions/page.tsx`) : editeur,
  SIREN, adresse, responsable de publication, hebergeur. Obligation legale.
- Faire relire la politique de confidentialite et les conditions d'utilisation
  par un juriste. Les textes fournis sont un socle serieux, pas une validation.

**Bloquants techniques**

- ~~**Persistance des quotas et des licences.**~~ **Traite.** Les licences, les
  quotas et les compteurs de debit sont persistes en SQLite (mode WAL) derriere
  une abstraction par depot (`src/lib/db/`). Le pilote est remplacable sans
  toucher a l'API : passer a Postgres ou Redis consiste a ecrire une nouvelle
  implementation de l'interface `Repositories`.
- ~~**Activation des licences.**~~ **Traite.** Le webhook Stripe verifie la
  signature et ecrit l'etat d'abonnement de facon idempotente (les evenements
  rejoues ne creent pas de doublons). `/api/analyze` resout l'offre a partir de
  cet etat.
- ~~**Limitation de debit.**~~ **Traite** cote application (voir section 5).
  **Reste a faire** cote infrastructure : un `limit_req` nginx en amont, qui
  absorbe le trafic anormal avant Node.js.
- **Base de donnees en production.** Le fichier SQLite convient a une instance
  unique avec volume persistant. En deploiement serverless multi-instances, il
  faut basculer sur une base partagee (Postgres) : sinon chaque instance a son
  propre fichier et les quotas redeviennent approximatifs.
- **Sauvegarde du sel d'adresse IP.** `QUERYSHIELD_IP_SALT` doit etre fixe et
  sauvegarde. Le renouveler remet a zero les compteurs de debit en cours.

**Points de vigilance produit**

- **Acces aux SMS sur mobile.** C'est le point le plus contraint de la phase 2.
  Android permet de lire les SMS avec l'autorisation `RECEIVE_SMS`, mais cette
  permission est refusee par Google Play pour une application non messagerie
  par defaut : il faut passer par une application d'assistance ou un partage
  manuel. **iOS ne permet pas du tout a une application tierce de lire les SMS
  ni les notifications d'autres applications.** Sur iPhone, l'integration
  realiste passe par un clavier personnalise, une extension de partage ou un
  raccourci. Prevoir cette difference dans la conception mobile.
- **Analyse des en-tetes.** SPF, DKIM et DMARC ne sont exploitables que si
  l'utilisateur fournit les en-tetes bruts. Le domaine de l'expediteur est
  toutefois analyse meme sans eux (champ dedie ou ligne « De : ... »), ce qui
  couvre les cas les plus courants. La confiance est degradee quand les
  en-tetes sont absents, car la verification d'authenticite n'a pas eu lieu.
- **Confidentialite et donnees de tiers.** Un message recu contient souvent des
  donnees personnelles concernant d'autres personnes. Meme sans conservation,
  le traitement doit etre documente (registre des traitements, analyse d'impact
  si le volume devient significatif). Le traitement sans persistance est un
  argument fort : ne le sacrifiez pas pour du confort produit.

## 8. Depannage

**`next build` echoue avec `EPERM ... .next\trace` ou un blocage de suppression massive.**

Deux causes possibles, toutes deux liees a l'environnement Windows, jamais au code :

1. **Le serveur de developpement tourne encore.** `next dev` et `next build`
   partagent le meme repertoire `.next`. Arreter le serveur avant de builder :
   ```bash
   # arreter le processus npm run dev, puis
   rm -rf .next tsconfig.tsbuildinfo
   npm run build
   ```
2. **Un antivirus ou un indexeur verrouille `.next/trace`.** Next.js ouvre ce
   fichier de trace pendant le build. Ajouter le dossier du projet aux
   exclusions de l'antivirus, ou builder depuis un autre chemin.

**Verification sans build complet.** Le typage et le comportement du moteur se
controlent sans passer par `next build` :

```bash
npm run typecheck     # tsc --noEmit
npm test              # moteur + persistance, entierement hors ligne
npm run dev           # dans un premier terminal
npm run smoke         # dans un second terminal (API reelle)
```

`npm test` compile les outils dans `.tools/` puis execute les trois suites :
`test-engine` (43 cas : detection, faux positifs, lecture de l'expediteur,
verification de site), `test-i18n` (32 cas : parite des dictionnaires,
couverture des regles, negociation de la langue) et `test-store` (64 cas :
persistance, licences, condensation d'IP, debit). Aucun serveur n'est necessaire.

`npm run smoke` envoie onze messages a l'API locale (huit frauduleux, trois
legitimes de controle) et verifie le verdict attendu de chacun.

**L'interface s'affiche dans la mauvaise langue.** La langue est resolue cote
serveur : cookie `qs_locale`, puis en-tete `Accept-Language`, puis le francais.
Un cookie residuel d'un test precedent l'emporte donc sur le navigateur. Le
supprimer depuis les outils de developpement, ou le redefinir a la main :

```bash
curl -H "Cookie: qs_locale=en" http://localhost:4321/
```

**Une phrase reste en francais dans une page traduite.** C'est le comportement
prevu pour les explications du moteur d'analyse, qui n'ont pas encore de
traduction (voir la section 3). Si une regle du verificateur de site affiche du
francais, la traduction manque : `npm run test:i18n` liste les identifiants
concernes.

**Le limiteur de debit bloque le test de fumee.** Enchainees rapidement, les
onze requetes declenchent le seuil de rafale (`429`, politique `burst-free`).
Attendre une minute, ou lancer le serveur avec `QUERYSHIELD_RATELIMIT_DISABLED=true`.

## 9. Structure du depot

```
queryshield/
├── src/
│   ├── app/                     # routes Next.js (App Router)
│   │   ├── page.tsx             # analyseur
│   │   ├── verifier-site/       # verification d'authenticite d'un site
│   │   ├── compte/              # licence et quota
│   │   ├── tarifs/              # offres
│   │   ├── api-docs/            # documentation API
│   │   ├── legal/               # confidentialite, conditions, mentions
│   │   └── api/                 # analyze, check-site, health, billing
│   ├── components/              # interface
│   └── lib/
│       ├── engine/              # moteur d'analyse (dont site.ts, site-network.ts)
│       ├── i18n/                # traductions fr / en / pt / es
│       │   └── locales/         # un dictionnaire par langue (fr = reference)
│       ├── db/                  # persistance (SQLite + repli memoire)
│       ├── security/            # condensation d'IP, limitation de debit
│       ├── license.ts           # acces, plans, quotas
│       ├── samples.ts           # exemples de demonstration
│       └── ui.ts                # styles partages
├── tools/                       # suites de tests hors ligne et CLI de licences
│   ├── test-engine.ts           # moteur heuristique (43 cas)
│   ├── test-i18n.ts             # parite des dictionnaires et couverture (32 cas)
│   └── test-store.ts            # persistance, licences, debit (64 cas)
├── scripts/smoke.mjs            # test de fumee de l'API
├── engine-py/                   # microservice semantique (phase 2)
├── data/                        # base SQLite (ignoree par git)
├── .env.example
└── README.md
```

## 10. Suite du plan

| Phase | Contenu |
|---|---|
| 1 (livree) | Moteur heuristique, analyseur web, API, socle de facturation |
| 2 | Passe semantique LLM en production, persistance des licences et quotas |
| 3 | Extension de navigateur : analyse d'un e-mail ouvert et lecture directe des en-tetes |
| 4 | Application mobile Android (lecture des SMS), puis integration iOS par extension de partage |
| 5 | Retour d'experience : boucle de signalement, ajustement des poids sur cas reels |

## 11. Avertissement

QueryShield fournit une evaluation automatisee du niveau de risque et un score
de probabilite. Aucun systeme automatise n'est fiable a 100 % : un message peut
etre frauduleux sans declencher de signal, et un message legitime peut en
declencher. Le rapport constitue une aide a la decision et ne remplace ni la
verification aupres de l'organisme concerne, ni l'avis d'un professionnel.

Les messages soumis sont traites en memoire et ne sont pas conserves. Les liens
contenus dans les messages analyses ne sont jamais ouverts ni resolus.

## 12. Journal des modifications

**Correction d'un faux negatif signale sur le terrain** — un message
d'hameconnage obtenait un score nul.

Cause identifiee : l'expediteur n'etait analyse que si les en-tetes bruts
etaient fournis, et un message sans lien ni mot-cle sensible ne produisait
aucun signal.

Corrections apportees :

| Ajout | Fichier |
|---|---|
| Reputation structurelle des domaines : entropie de Shannon, suites de consonnes, absence de voyelle | `src/lib/engine/domain-reputation.ts` |
| Imitation d'institution, y compris les deformations volontaires d'un caractere | `src/lib/engine/domain-reputation.ts` |
| Extension connue detournee en sous-domaine, suffixes composes inclus (`gouv.fr`) | `src/lib/engine/domain-reputation.ts` |
| Termes d'appat dans le domaine lui-meme | `src/lib/engine/domain-reputation.ts` |
| Analyse de l'expediteur sans en-tetes bruts | `src/lib/engine/sender.ts` |
| Regles d'appat casino, jeux et retrait conditionne, avec couverture anglophone | `src/lib/engine/lexicon.ts` |
| Regle de combinaison appat + expediteur non fiable (plancher 78/100) | `src/lib/engine/scoring.ts` |
| Champ expediteur dans l'interface et dans les exemples | `src/components/Analyzer.tsx`, `src/lib/samples.ts` |

Deux faux positifs corriges au passage :

- **Les messageries grand public etaient considerees comme des expediteurs
  officiels.** `gmail.com`, `outlook.com`, `live.com` et `free.fr` figurent au
  referentiel de marques, car ces marques en sont proprietaires. Une adresse
  `xxx@gmail.com` etait donc blanchie — et desactivait la severite des regles
  d'appat. Elles en sont desormais exclues.
- **L'ordre de la liste des mots institutionnels decidait du resultat.** Le mot
  fautif « governement » l'emportait sur « gouvernement » par simple effet de
  tri. Les correspondances exactes sont maintenant evaluees avant les
  correspondances approchees.

**Faux negatifs detectes apres correction** : aucun sur la batterie de tests
(43 cas moteur, 32 cas traductions, 64 cas persistance et debit).

### Verification de site

Fonction ajoutee : dire si une adresse de site est authentique, suspecte ou
frauduleuse, **sans jamais ouvrir le site**.

| Ajout | Fichier |
|---|---|
| Moteur de verdict (`official`, `unknown`, `suspicious`, `phishing`) | `src/lib/engine/site.ts` |
| Normalisation de l'entree : `exemple.com`, URL complete, forme neutralisee `hxxps://exemple[.]com` | `src/lib/engine/site.ts` |
| Garde-fou SSRF : hotes internes et plages privees refuses | `src/lib/engine/site.ts` |
| Verifications reseau optionnelles : DNS, RDAP (age, registrar), Google Safe Browsing | `src/lib/engine/site-network.ts` |
| Route `POST /api/check-site`, memes quota et limitation de debit que l'analyse | `src/app/api/check-site/route.ts` |
| Page et composant de verification | `src/app/verifier-site/page.tsx`, `src/components/SiteChecker.tsx` |

Points de conception :

- **Le cas « non verifiable » est traite comme une reponse.** Un domaine inconnu
  n'est pas un domaine de confiance : ne pas detecter de probleme n'est pas une
  validation. Le verdict `unknown` l'affiche explicitement.
- **Un signalement de reputation prime sur le referentiel.** Un domaine officiel
  peut avoir ete compromis ; un avis externe negatif est plus recent que notre
  liste.
- **L'agent utilisateur explicite est obligatoire.** `rdap.org` renvoie 403 au
  user-agent par defaut de Node : sans en-tete `User-Agent`, la verification
  d'age de domaine echoue silencieusement.

### Quatre langues

| Ajout | Fichier |
|---|---|
| Resolution de la langue : cookie, puis `Accept-Language`, puis francais | `src/lib/i18n/config.ts` |
| Dictionnaires `fr` (reference typee), `en`, `pt`, `es` | `src/lib/i18n/locales/` |
| Contexte client et selecteur de langue | `src/lib/i18n/provider.tsx`, `src/components/LanguageSwitcher.tsx` |
| Traduction des constats du moteur, avec repli francais | `src/lib/i18n/finding.ts` |
| Messages d'erreur de l'API traduits a partir de leur code | `src/lib/i18n/labels.ts` |
| Suite de tests : parite des dictionnaires et couverture des regles | `tools/test-i18n.ts` |

Deux details qui ont demande un detour :

- **Les indices de generation automatique d'un domaine sont des phrases
  francaises** (« entropie elevee (3.51 bits/caractere) »). Ils sont desormais
  transportes sous forme de codes (`entropy-high=3.51`) et remis en forme dans
  la langue active. Les chaines francaises restent produites par le moteur,
  comme repli.
- **Les recommandations du verificateur de site etaient des phrases sans
  identifiant.** Elles portent maintenant un `id` stable, ce qui permet de les
  traduire tout en conservant le texte francais pour les consommateurs de
  l'API.
