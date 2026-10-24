# Déployer QueryShield sur un VPS (Node + SQLite)

Objectif : faire tourner le site et l'API sur une machine à **système de
fichiers persistant**, pour que les licences et les quotas survivent aux
redémarrages — ce que Vercel serverless ne permet pas.

**Pourquoi cette piste** : le code est déjà écrit pour SQLite. Il n'y a rien à
réimplémenter, seulement à définir deux variables d'environnement et à monter un
volume. Les alternatives (Turso, Neon, Upstash) exigeraient de réécrire
`src/lib/db/types.ts`.

## Ce qui a été vérifié en local

Sur une base placée **hors du dossier du projet** (comme le fera un volume) :

| Vérification | Résultat |
|---|---|
| `/api/health` | `status=ok`, `driver=sqlite`, `durable=true` |
| Clé `pro` présentée | `plan=pro`, `limit=1000`, `licenseStatus=usable` |
| Clé inconnue | `plan=free`, `limit=10`, `licenseStatus=unknown` |
| Redémarrage complet du serveur | clé toujours valide, compteur de quota conservé (`used=2`) |

Non vérifié ici : l'unité systemd et le certificat Caddy (pas de Linux sous la
main). Les chemins et options sont commentés pour être adaptés.

## 1. Prérequis

- Un VPS Debian 12 ou Ubuntu 24.04, 1 vCPU / 1 Go de RAM suffit.
- Un nom de domaine pointant vers l'IP du VPS (enregistrement `A`).
- Node.js 22 et les outils de compilation (`better-sqlite3` est un module natif).

```bash
sudo apt update && sudo apt install -y curl build-essential python3
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
node -v   # doit afficher v22.x
```

## 2. Compte de service et code

```bash
sudo useradd --system --create-home --shell /usr/sbin/nologin queryshield

sudo mkdir -p /opt/queryshield
sudo chown queryshield:queryshield /opt/queryshield

# Depuis votre machine : git clone puis rsync, ou directement sur le VPS :
sudo -u queryshield git clone https://github.com/jollncoelho/queryshield.git /opt/queryshield
cd /opt/queryshield
sudo -u queryshield npm ci
sudo -u queryshield npm run build
```

## 3. Répertoire d'état (le point critique)

```bash
sudo mkdir -p /var/lib/queryshield
sudo chown queryshield:queryshield /var/lib/queryshield
sudo chmod 750 /var/lib/queryshield
```

C'est **là** que vit la base, jamais dans `/opt/queryshield` : le code est
remplacé à chaque mise à jour, le répertoire d'état non.

Si l'unité systemd fournie est utilisée, `StateDirectory=queryshield` crée et
protège ce dossier automatiquement.

## 4. Variables d'environnement

```bash
sudo -u queryshield tee /opt/queryshield/.env.production > /dev/null <<'EOF'
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://shield.query-intel.com

# --- stockage durable (l'essentiel) ---
QUERYSHIELD_DB_DRIVER=sqlite
QUERYSHIELD_DB_FILE=/var/lib/queryshield/queryshield.db

# --- securite ---
QUERYSHIELD_IP_SALT=remplacer-par-une-chaine-aleatoire-longue
QUERYSHIELD_TRUSTED_PROXY_HOPS=1

# --- quotas ---
QUERYSHIELD_FREE_DAILY_QUOTA=10

# --- optionnel ---
# GOOGLE_SAFE_BROWSING_API_KEY=
# STRIPE_SECRET_KEY=
# STRIPE_WEBHOOK_SECRET=
EOF

sudo chown queryshield:queryshield /opt/queryshield/.env.production
sudo chmod 600 /opt/queryshield/.env.production
```

`QUERYSHIELD_TRUSTED_PROXY_HOPS=1` est indispensable derrière Caddy ou nginx :
sans cela, toutes les requêtes semblent venir de `127.0.0.1` et la limitation de
débit ne protège plus rien.

## 5. Démarrage du service

```bash
sudo cp /opt/queryshield/deploy/queryshield.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now queryshield
sudo systemctl status queryshield --no-pager
```

Vérification décisive :

```bash
curl -s http://127.0.0.1:4321/api/health | grep -o '"driver":"[a-z]*"'
# doit afficher "driver":"sqlite" — si c'est "memory", le chemin de la base
# n'est pas accessible en écriture et les licences seront perdues.
```

## 6. HTTPS

```bash
sudo apt install -y caddy
sudo cp /opt/queryshield/deploy/Caddyfile /etc/caddy/Caddyfile
sudo nano /etc/caddy/Caddyfile     # adapter le domaine
sudo systemctl reload caddy
```

Caddy demande le certificat automatiquement. Tester ensuite
`https://<domaine>/api/health`.

## 7. Reprendre les clés déjà émises

Si des clés existent en local dans `data/queryshield.db`, copier le fichier
**service arrêté** (avec ses annexes `-wal` et `-shm`) :

```bash
sudo systemctl stop queryshield
sudo cp data/queryshield.db data/queryshield.db-wal data/queryshield.db-shm \
        /var/lib/queryshield/ 2>/dev/null
sudo chown queryshield:queryshield /var/lib/queryshield/queryshield.db*
sudo systemctl start queryshield
```

Sinon, réémettre les clés directement sur le serveur :

```bash
cd /opt/queryshield
sudo -u queryshield env $(sudo cat /dev/null) \
  QUERYSHIELD_DB_FILE=/var/lib/queryshield/queryshield.db \
  npm run license -- issue --plan pro --email client@exemple.com --days 365
```

## 8. Sauvegardes

La base est un simple fichier : une copie suffit, mais elle doit être
**cohérente** (ne pas copier un fichier en cours d'écriture). Le plus sûr :

```bash
# sauvegarde atomique via l'API SQLite
sudo -u queryshield node -e "
  const D = require('/opt/queryshield/node_modules/better-sqlite3');
  const db = new D('/var/lib/queryshield/queryshield.db');
  db.backup('/var/lib/queryshield/backup-' + new Date().toISOString().slice(0,10) + '.db')
    .then(() => { console.log('sauvegarde OK'); db.close(); });
"
```

À mettre dans une tâche cron quotidienne, et à copier hors du VPS.

## 9. Mise à jour

```bash
cd /opt/queryshield
sudo -u queryshield git pull
sudo -u queryshield npm ci
sudo -u queryshield npm run build
sudo systemctl restart queryshield
```

Le répertoire `/var/lib/queryshield` n'est pas touché : les licences et les
quotas restent en place. Les migrations de schéma s'appliquent au démarrage.

## 10. Après la bascule

- L'extension pointe par défaut sur `https://shield.query-intel.com` : si le
  domaine ne change pas (simple changement d'enregistrement DNS), rien à faire.
- Sinon, mettre à jour `DEFAULT_API_BASE` dans `shared/api.js` de l'extension,
  et l'adresse API dans les réglages.
- Vérifier que le site répond en `https` avant de couper Vercel.
