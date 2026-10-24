# Licences QueryShield — offres, clés et limites

> Vérifié le 2026-10-24 en local (serveur `next start` + SQLite) : sans clé
> `plan=free / limit=10`, avec une clé `pro` `plan=pro / limit=1000`, avec une
> clé inconnue `plan=free / limit=10 / licenseStatus=unknown`.

## Ce qui distingue le gratuit du payant

Une seule chose, aujourd'hui : **le nombre d'analyses par jour**. Toutes les
détections (heuristiques, imitation de marque, âge du domaine, RDAP) sont
identiques quel que soit l'offre. Il n'y a aucun verrou de fonctionnalité.

| Offre | Quota / jour | Rate limiting | Clé |
|---|---|---|---|
| `free` | **10** (variable `QUERYSHIELD_FREE_DAILY_QUOTA`) | palier anonyme | aucune |
| `pro` | **1 000** | palier « payant » | `QS-PRO-XXXX-XXXX-XXXX` |
| `business` | **10 000** | palier « payant » | `QS-BIZ-XXXX-XXXX-XXXX` |

Le compteur est journalier et se réinitialise à minuit UTC. Il est tenu :

- **sans clé** : par un identifiant anonyme de navigateur (cookie `qs_client`) ;
- **avec clé** : par la clé elle-même, ce qui **mutualise le quota entre tous
  les appareils** du même acheteur.

L'alphabet des clés exclut volontairement les caractères ambigus (`O`, `0`,
`I`, `1`, `L`) : une clé est souvent recopiée à la main depuis un e-mail.

## Émettre une clé

L'outil existe déjà : `tools/license.ts`, exposé via `npm run license`.

```bash
# licence d'un an
npm run license -- issue --plan pro --email client@exemple.com --days 365

# licence sans expiration (usage interne, propriétaire)
npm run license -- issue --plan business --note "licence perso"
```

Autres commandes :

```bash
npm run license -- list                  # toutes les clés
npm run license -- show QS-...           # détail d'une clé
npm run license -- revoke QS-...         # révocation immédiate
npm run license -- quota lic:QS-...      # consommation d'un porteur
npm run license -- reset-quota lic:QS-...  # remise à zéro du compteur
npm run license -- stats                 # licences actives + analyses sur 30 j
```

La base ciblée dépend de `QUERYSHIELD_DB_FILE` (défaut `./data/queryshield.db`).
L'outil affiche un avertissement explicite si le stockage est dégradé — c'est
le garde-fou qui manquait pour repérer le problème décrit plus bas.

## Côté client

La clé se transmet dans l'en-tête `x-qs-license` (ou `Authorization: Bearer QS-…`).

- **Extension** : champ « Clé de licence » dans les réglages.
- **Site** : même champ dans `/compte`.

La réponse de l'API expose `plan`, `quota.limit` et `licenseStatus` :

| `licenseStatus` | Signification |
|---|---|
| `null` | aucune clé présentée → offre gratuite |
| `usable` | clé valide |
| `expired` | abonnement échu |
| `revoked` | clé révoquée (fraude, chargeback) |
| `unknown` | **clé présentée mais inconnue de la base** |

Le cas `unknown` mérite une explication dans l'interface : sans lui, un acheteur
qui se trompe d'un caractère voit simplement « offre gratuite » et croit s'être
fait avoir.

## Le blocage actuel : la production ne stocke rien

`https://shield.query-intel.com/api/health` répond :

```json
"storage": { "driver": "memory", "durable": false, "reason": "QUERYSHIELD_DB_DRIVER=memory : aucun stockage durable." }
```

Autrement dit **les licences et les quotas vivent en RAM** et disparaissent à
chaque redémarrage ou démarrage à froid de la fonction serverless. Conséquence
concrète : une clé émise serait perdue, et un acheteur verrait son quota retomber
à 10 analyses sans prévenir.

C'est structurel : SQLite suppose un système de fichiers inscriptible et une
seule instance, ce que Vercel serverless ne fournit pas (le commentaire en tête
de `src/lib/db/sqlite.ts` le dit explicitement).

### Trois sorties possibles

1. **Héberger le service sur un VPS** (Railway, Fly.io, Scaleway, Hetzner) avec
   le volume SQLite existant. Le moins de travail : le code est déjà prêt, il
   suffit de définir `QUERYSHIELD_DB_DRIVER=sqlite` et `QUERYSHIELD_DB_FILE` sur
   un disque persistant.
2. **Basculer sur une base réseau** — Turso/libSQL (compatible SQL presque à
   l'identique avec `better-sqlite3`), Neon/Postgres, ou Upstash Redis. Il faut
   réimplémenter les interfaces de `src/lib/db/types.ts` ; les routes et le
   moteur de licences n'ont pas à changer.
3. **Rester en serverless sans licences durables** — possible, mais alors il ne
   faut pas vendre de clés.

Tant que ce point n'est pas tranché, toute clé émise n'a de valeur qu'en local.
