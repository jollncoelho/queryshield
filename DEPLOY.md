# Déploiement de QueryShield sur `shield.query-intel.com`

Ce guide explique comment mettre QueryShield en ligne en tant que sous-domaine
du vitrine `query-intel.com`, puis l'épingler dans la section « Arsenal ».

> Rappel d'architecture : QueryShield est une application **Next.js 15** avec un
> backend (routes API + base). Il ne peut pas être inclus dans une page
> statique. Le vitrine `query-intel.com` est déjà hébergé sur **Vercel**, donc
> le déploiement se fait naturellement sur Vercel, exactement comme votre
> `ghostint.query-intel.com`.

---

## 1. Prérequis

- Un compte **Vercel** (le même qui héberge déjà `query-intel.com`).
- L'accès **DNS** du domaine `query-intel.com` (pour créer le sous-domaine).
- (Recommandé) un dépôt **GitHub** où pousser le code — Vercel se branche
  dessus et redéploie automatiquement à chaque `push` (comme `ghostint`).

## 2. Préparer le dépôt (local)

Le dossier `queryshield/` n'est pas encore un dépôt git. Depuis ce dossier :

```bash
git init
git add -A
git commit -m "QueryShield: analyse anti-arnaque + verificateur de site"
```

Puis reliez-le à un nouveau dépôt GitHub (créez-le vide côté GitHub d'abord) :

```bash
git remote add origin https://github.com/jollncoelho/queryshield.git
git branch -M main
git push -u origin main
```

> ⚠️ Si le `git push` se bloque en mode interactif sur cette machine, utilisez :
> ```bash
> GIT_TERMINAL_PROMPT=0 GCM_INTERACTIVE=never git push -u origin main
> ```

## 3. Créer le projet Vercel

### Option A — via l'interface (recommandée, déploiement automatique)

1. Vercel → **Add New… → Project** → importez le dépôt `queryshield`.
2. Framework preset : **Next.js** (détecté automatiquement).
3. Build command : `next build` — Output : Auto (pas de réglage).
4. **Root Directory** : laissez `queryshield/` si le dépôt contient d'autres
   dossiers, sinon `/`.
5. Cliquez **Deploy**. Le premier déploiement génère une URL `*.vercel.app`.

### Option B — via la CLI (rapide, sans dépôt)

```bash
npm i -g vercel
vercel            # première fois : login + lien du projet
vercel --prod     # mise en production
```

## 4. Variables d'environnement (Vercel → Settings → Environment Variables)

| Variable | Valeur (production) | Pourquoi |
|---|---|---|
| `NEXT_PUBLIC_APP_URL` | `https://shield.query-intel.com` | Redirections Stripe, liens absolus |
| `QUERYSHIELD_DB_DRIVER` | `memory` | **Important** : le FS de Vercel est éphémère et partagé entre instances. Le pilote `memory` évite toute dépendance au disque. Les quotas/limites de débit deviennent alors par-instance (acceptable en phase de lancement ; voir §7). |
| `QUERYSHIELD_TRUSTED_PROXY_HOPS` | `1` | Vercel est derrière un proxy : sans cela, la limitation de débit verrait toujours la même IP et bloquerait tout le monde. |
| `QUERYSHIELD_FREE_DAILY_QUOTA` | `10` | Plafond d'analyses/jour (réglable). |
| `QUERYSHIELD_IP_SALT` | chaîne aléatoire longue | Sel de hachage des IP (anti-abus, confidentiel). |
| `QUERYSHIELD_SITE_ACTIVE` | `true` | Active les vérifications réseau du vérificateur de site (RDAP, âge du domaine). |
| `GOOGLE_SAFE_BROWSING_API_KEY` | *(optionnel)* | Si fournie, la réputation Google Safe Browsing est consultée. Sans elle, le rapport le dit explicitement. |
| `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` / `STRIPE_PRICE_*` | *(optionnel)* | Laissez vide tant la facturation n'est pas branchée : les boutons restent inertes sans casser. |

> Ne copiez **pas** le `better-sqlite3` côté client. Le module est déjà
> externalisé dans `next.config.mjs` (`serverExternalPackages`), donc le build
> Vercel ne tente pas de le bundler.

## 5. Brancher le sous-domaine `shield.query-intel.com`

1. Vercel → projet → **Settings → Domains**.
2. Ajoutez `shield.query-intel.com`.
3. Vercel donne un enregistrement à créer côté DNS (généralement un **CNAME**
   `shield` → `cname.vercel-dns.com`, ou un A/AAAA selon la proposition).
4. Dans la gestion DNS de `query-intel.com`, ajoutez cet enregistrement.
   - Comme `www.query-intel.com` pointe déjà sur Vercel, le domaine
     `query-intel.com` est probablement déjà « claimé » dans un projet Vercel :
     ajoutez simplement le sous-domaine au **projet QueryShield**.
5. Attendez la propagation (quelques minutes) puis vérifiez le HTTPS
   (Vercel émet le certificat automatiquement).

> Vous pouvez aussi choisir `queryshield.query-intel.com` (plus proche du nom
> produit) — la procédure est identique, adaptez l'URL partout.

## 6. Vérifier le déploiement

```bash
curl https://shield.query-intel.com/api/health
# -> {"status":"ok", ...}

curl -X POST https://shield.query-intel.com/api/analyze \
  -H "content-type: application/json" \
  -d '{"text":"Votre colis est bloque, reglez les frais sous 24h http://chronopost-livraison-suivi.top/frais","channel":"sms"}'
```

Ouvrez `https://shield.query-intel.com` : le pied de page doit afficher
« Découvrir l'écosystème query-intel.com » (lien vers le vitrine).

## 7. Intégrer dans le vitrine (section Arsenal)

Le fichier [`deploy/vitrine-arsenal-card.html`](./deploy/vitrine-arsenal-card.html)
contient une carte prête à coller, au même style sombre que les autres outils.
Copiez-la à la suite de Ghosint / Tracker / Gods Eye et ajustez l'URL du
`href` si vous avez pris un autre sous-domaine.

## 8. Notes et limites (phase de lancement)

- **Persistance** : avec `QUERYSHIELD_DB_DRIVER=memory`, les licences, quotas
  et compteurs de débit ne survivent pas au redémarrage et ne sont pas partagés
  entre les instances Vercel. Pour une persistance réelle, passez plus tard à
  un stockage externe (Upstash Redis, Neon Postgres, ou un volume Vercel).
  L'application dégrade proprement (`degraded: true`) sans jamais planter.
- **Rate limiting** : en mode `memory`, la protection anti-abus est
  par-instance. Suffisant pour un lancement ; à durcir si le trafic monte.
- **Pas de `base` path** : le site est servi depuis la racine du sous-domaine
  (pas de `/queryshield/`). Ne touchez pas à un éventuel `basePath` dans
  `next.config.mjs` — ce serait casser les assets en production.
- **Rollback** : Vercel conserve chaque déploiement ; un retour en arrière est
  instantané depuis l'onglet **Deployments**.

## 9. Mise à jour

Avec l'option Git : `git push` sur `main` → Vercel redéploie tout seul (même
mécanisme que `ghostint`). Avec la CLI : `vercel --prod` depuis ce dossier.
