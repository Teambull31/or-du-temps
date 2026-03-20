# Or du Temps — DevOps

Déploiement automatique d'un site statique sur VPS Ubuntu 22.04 via GitHub Actions.

## Architecture

```
GitHub (push main)
      │
      ▼
GitHub Actions (rsync + SSH)
      │
      ▼
VPS Ubuntu 22.04
├── Nginx (site statique)
│   └── ordutemps.fr → /var/www/ordutemps/
└── Certbot (HTTPS automatique)
```

---

## Setup initial — à faire UNE SEULE FOIS

### Étape 1 — Clé SSH de déploiement

Sur **ton PC** (pas le VPS), génère une paire de clés dédiée :

```bash
ssh-keygen -t ed25519 -C "github-ordutemps" -f ~/.ssh/ordutemps_deploy
```

Ça crée deux fichiers :
- `~/.ssh/ordutemps_deploy` → **clé privée** (pour GitHub)
- `~/.ssh/ordutemps_deploy.pub` → **clé publique** (pour le VPS)

### Étape 2 — Setup du VPS

Connecte-toi en root à ton VPS, puis :

```bash
# Clone le repo (ou copie juste le dossier devops/)
git clone https://github.com/TON-USER/or-du-temps.git /tmp/or-du-temps

# Lance le script (remplace les valeurs)
DOMAIN=ordutemps.fr EMAIL=ton@email.com bash /tmp/or-du-temps/devops/setup.sh
```

Le script va :
- Créer l'utilisateur `deploy`
- Te demander de coller ta clé publique SSH
- Créer `/var/www/ordutemps/`
- Configurer le virtual host Nginx
- Obtenir le certificat Let's Encrypt
- Configurer le renouvellement automatique

### Étape 3 — Secrets GitHub

Dans ton repo GitHub : **Settings → Secrets and variables → Actions → New secret**

| Nom | Valeur |
|-----|--------|
| `VPS_HOST` | IP de ton VPS (ex : `51.210.xxx.xxx`) |
| `VPS_USER` | `deploy` |
| `VPS_SSH_KEY` | Contenu de `~/.ssh/ordutemps_deploy` (clé **privée**) |
| `VPS_PORT` | `22` (ou ton port SSH si tu l'as changé) |

### Étape 4 — Autoriser Nginx à se recharger sans mot de passe

Sur le VPS, en root :

```bash
echo "deploy ALL=(root) NOPASSWD: /usr/sbin/nginx -t, /bin/systemctl reload nginx" \
  > /etc/sudoers.d/deploy-nginx
chmod 440 /etc/sudoers.d/deploy-nginx
```

---

## Déploiement

```
git add -A
git commit -m "mise à jour du site"
git push origin main
```

→ GitHub Actions déploie automatiquement en ~30 secondes.

Tu peux aussi déclencher un déploiement manuel depuis :
**GitHub → Actions → Deploy Or du Temps → Run workflow**

---

## Structure des fichiers

```
or-du-temps/
├── index.html              ← Site principal
├── emma.html               ← Panel admin (non indexé)
├── style.css
├── script.js
├── mentions-legales.html
├── 404.html
├── robots.txt
├── sitemap.xml
├── devops/
│   ├── README.md           ← Ce fichier
│   ├── setup.sh            ← Script de setup VPS (une seule fois)
│   └── nginx/
│       └── ordutemps.conf  ← Config Nginx virtual host
└── .github/
    └── workflows/
        └── deploy.yml      ← Pipeline GitHub Actions
```

---

## Commandes utiles sur le VPS

```bash
# Vérifier que Nginx est OK
sudo nginx -t

# Voir les logs d'accès Or du Temps
sudo tail -f /var/log/nginx/access.log | grep ordutemps

# Voir les logs d'erreur
sudo tail -f /var/log/nginx/error.log

# Renouveler le certificat SSL manuellement
sudo certbot renew --nginx

# Voir les sites Nginx actifs
ls /etc/nginx/sites-enabled/
```

---

## Cohabitation avec foodmatch

Les deux sites sont **totalement indépendants** :

| | Or du Temps | FoodMatch |
|---|---|---|
| Domaine | `ordutemps.fr` | `foodmatch.online` |
| Dossier | `/var/www/ordutemps` | `/var/www/foodmatch` |
| Config Nginx | `sites-enabled/ordutemps` | `sites-enabled/foodmatch` |
| Runtime | Aucun (statique) | PM2 + Node.js port 3001 |
| Déploiement | rsync (GitHub Actions) | git pull + npm build |
