# Déploiement Or du Temps — Guide VPS (Ubuntu 22.04)

## Prérequis
- Un VPS Ubuntu 22.04 (OVH, Infomaniak, Hetzner...)
- Un nom de domaine pointant vers l'IP de ton VPS
- Accès root SSH

---

## Étape 1 — Connexion et mise à jour du serveur

```bash
ssh root@<IP_VPS>
apt update && apt upgrade -y
```

---

## Étape 2 — Créer un utilisateur non-root

```bash
adduser emma
usermod -aG sudo emma

# Copier ta clé SSH vers le nouvel utilisateur
rsync --archive --chown=emma:emma ~/.ssh /home/emma
```

Se reconnecter avec le nouvel utilisateur pour la suite :
```bash
ssh emma@<IP_VPS>
```

---

## Étape 3 — Installer Node.js 20 (LTS)

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
node -v   # doit afficher v20.x.x
npm -v
```

---

## Étape 4 — Installer PM2 (gestionnaire de processus)

```bash
sudo npm install -g pm2
```

---

## Étape 5 — Installer Nginx (reverse proxy)

```bash
sudo apt install -y nginx
sudo systemctl enable nginx
sudo systemctl start nginx
```

---

## Étape 6 — Configurer le pare-feu (UFW)

```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
sudo ufw status
```

---

## Étape 7 — Déployer le site

### Option A — Cloner depuis GitHub

```bash
cd /var/www
sudo git clone https://github.com/Teambull31/or-du-temps.git ordutemps
sudo chown -R emma:emma /var/www/ordutemps
cd /var/www/ordutemps
git checkout main   # ou la branche souhaitée
npm install --omit=dev
```

### Option B — Uploader les fichiers via SFTP

Depuis ton ordinateur (FileZilla, Cyberduck, ou scp) :
```bash
scp -r /chemin/local/or-du-temps emma@<IP_VPS>:/var/www/ordutemps
```

---

## Étape 8 — Configurer les variables d'environnement

```bash
cd /var/www/ordutemps
cp .env.example .env
nano .env
```

Remplir les valeurs :
```
PORT=3000
SMTP_HOST=smtp.example.com       # ex: ssl0.ovh.net pour OVH
SMTP_PORT=587
EMAIL_USER=contact@ordutemps.fr
EMAIL_PASS=ton-mot-de-passe-smtp
EMAIL_TO=contact@ordutemps.fr
CALENDLY_URL=https://calendly.com/emma-garcia
```

**Sécuriser le fichier .env :**
```bash
chmod 600 .env
```

---

## Étape 9 — Démarrer l'application avec PM2

```bash
cd /var/www/ordutemps
pm2 start server.js --name "ordutemps"
pm2 save
pm2 startup   # suivre la commande affichée pour l'autostart au reboot
```

Vérifier que ça tourne :
```bash
pm2 status
pm2 logs ordutemps
```

---

## Étape 10 — Configurer Nginx comme reverse proxy

```bash
sudo nano /etc/nginx/sites-available/ordutemps
```

Coller cette configuration (remplacer `ordutemps.fr` par ton domaine) :

```nginx
server {
    listen 80;
    server_name ordutemps.fr www.ordutemps.fr;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Activer le site et recharger Nginx :
```bash
sudo ln -s /etc/nginx/sites-available/ordutemps /etc/nginx/sites-enabled/
sudo nginx -t        # vérifier la config (doit afficher "ok")
sudo systemctl reload nginx
```

---

## Étape 11 — Certificat SSL gratuit (HTTPS) avec Let's Encrypt

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d ordutemps.fr -d www.ordutemps.fr
```

Suivre les instructions (entrer l'email, accepter les CGU).

Certbot modifie automatiquement la config Nginx pour le HTTPS.

**Renouvellement automatique** (déjà configuré par certbot, vérifier) :
```bash
sudo systemctl status certbot.timer
# ou tester manuellement :
sudo certbot renew --dry-run
```

---

## Étape 12 — Vérification finale

```bash
# Le serveur Node tourne
pm2 status

# Nginx est actif
sudo systemctl status nginx

# Le site répond
curl -I https://ordutemps.fr
```

Ouvrir dans le navigateur :
- `https://ordutemps.fr` → page d'accueil
- `https://ordutemps.fr/mentions-legales.html` → mentions légales
- `https://ordutemps.fr/robots.txt` → robots.txt
- `https://ordutemps.fr/sitemap.xml` → sitemap

---

## Commandes utiles au quotidien

```bash
# Voir les logs en temps réel
pm2 logs ordutemps

# Redémarrer l'app après une mise à jour
pm2 restart ordutemps

# Mettre à jour le site depuis git
cd /var/www/ordutemps
git pull origin main
npm install --omit=dev
pm2 restart ordutemps

# Recharger Nginx
sudo systemctl reload nginx

# Statut général
pm2 status && sudo systemctl status nginx
```

---

## DNS — Configuration chez ton registrar

Dans l'interface de gestion de ton nom de domaine, ajouter :

| Type | Nom | Valeur | TTL |
|------|-----|--------|-----|
| A | @ | `<IP_VPS>` | 3600 |
| A | www | `<IP_VPS>` | 3600 |

> Propagation DNS : 15 min à 48h selon les registrars.

---

## Fournisseurs SMTP recommandés (pour l'envoi d'emails)

| Fournisseur | Gratuit | Notes |
|-------------|---------|-------|
| **OVH / email pro** | Inclus avec le domaine | SMTP : `ssl0.ovh.net`, port 465/587 |
| **Brevo (ex-Sendinblue)** | 300 emails/jour | Fiable, bonne délivrabilité |
| **Gmail SMTP** | Oui (500/jour) | Nécessite un "mot de passe d'application" |
| **Postmark** | 100/mois gratuit | Excellent pour la délivrabilité |
