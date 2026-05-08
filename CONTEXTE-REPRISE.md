# Contexte de reprise — Or du Temps
# Charge ce fichier en début de conversation avec :
# "Lis CONTEXTE-REPRISE.md et dis-moi ce qui me reste à faire"


## QU'EST-CE QUE CE PROJET ?

Site vitrine premium pour Emma Garcia, praticienne de massage à Albi
et Toulouse. Stack : Node.js + Express.js (backend) + HTML/CSS/JS
vanilla (frontend). Déploiement sur VPS Ubuntu 22.04 via GitHub Actions.

Repo : branche principale = claude/review-website-commercialization-M410o


## CE QUI A ÉTÉ FAIT (code déjà modifié et prêt à déployer)

Les fichiers suivants ont été améliorés et sont dans le repo :

  server.js
    - Rate limiting ajouté (express-rate-limit)
        * Formulaire contact : 5 messages / 15 min / IP
        * Auth admin : 10 tentatives / min / IP
        * Changement mot de passe : 5 / heure / IP
    - Logging structuré JSON (avec timestamp) sur stdout
    - Backup automatique de config.json avant chaque sauvegarde
      (conserve les 10 dernières versions dans data/backups/)
    - Validation des images par magic bytes (contenu réel, pas extension)
    - Échappement HTML dans les emails (anti-injection)
    - CORS restrictif (configurable via ALLOWED_ORIGINS dans .env)
    - Mot de passe admin minimum 8 caractères (au lieu de 6)
    - Gestionnaire d'erreurs global Express

  .github/workflows/deploy.yml
    - Backup de /var/www/ordutemps avant chaque déploiement
      (garde les 3 dernières versions pour rollback)
    - npm ci ajouté (les dépendances s'installent automatiquement)
    - Redémarrage PM2 automatique après chaque déploiement
    - Rollback automatique si la vérification HTTP échoue
    - data/ et assets/uploads/ exclus du rsync
      (les données d'Emma ne sont plus écrasées à chaque deploy)

  devops/nginx/ordutemps.conf
    - Proxy /api/* → Node.js port 3000 (CRITIQUE : sans ça, le formulaire
      de contact et l'admin /emma ne fonctionnent pas en production)
    - Proxy /emma → Node.js avec headers noindex

  .env.example
    - Variable ALLOWED_ORIGINS ajoutée
    - Mot de passe par défaut remplacé par "changez-moi-en-production"

  package.json
    - express-rate-limit ^7.5.1 ajouté aux dépendances
    - package-lock.json généré (npm install déjà fait en local)


## CE QUI RESTE À FAIRE (étapes manuelles sur le VPS)

Ces étapes sont à faire dans l'ordre. Le détail complet est dans
le fichier PROCEDURE-MISE-EN-PRODUCTION.md.

  ÉTAPE 1 — Installer PM2 sur le VPS
    ssh root@IP_DU_VPS
    npm install -g pm2
    pm2 startup systemd
    → exécuter la commande affichée

  ÉTAPE 2 — Créer le .env de production
    cp /var/www/ordutemps/.env.example /var/www/ordutemps/.env
    nano /var/www/ordutemps/.env
    → remplir : SMTP_HOST, SMTP_PORT, EMAIL_USER, EMAIL_PASS,
                EMAIL_TO, CALENDLY_URL, ADMIN_PASSWORD (fort !),
                ALLOWED_ORIGINS=https://ordutemps.fr,https://www.ordutemps.fr

  ÉTAPE 3 — Mettre à jour la config Nginx
    sudo cp /var/www/ordutemps/devops/nginx/ordutemps.conf \
            /etc/nginx/sites-available/ordutemps
    sudo nginx -t
    sudo systemctl reload nginx

  ÉTAPE 4 — Autoriser deploy à recharger nginx sans mot de passe
    echo "deploy ALL=(root) NOPASSWD: /usr/sbin/nginx -t, /bin/systemctl reload nginx" \
      | sudo tee /etc/sudoers.d/deploy-nginx
    sudo chmod 440 /etc/sudoers.d/deploy-nginx

  ÉTAPE 5 — Premier lancement de PM2
    cd /var/www/ordutemps
    npm ci --omit=dev
    pm2 start server.js --name ordutemps --restart-delay=3000 --max-restarts=5
    pm2 save
    pm2 logs ordutemps   ← vérifier qu'il affiche "serveur démarré"

  ÉTAPE 6 — Vérifier les secrets GitHub (si pas encore fait)
    github.com → repo → Settings → Secrets and variables → Actions
    Secrets requis : VPS_HOST, VPS_USER, VPS_SSH_KEY, VPS_PORT

  ÉTAPE 7 — Pousser le code pour déclencher le déploiement
    git add -A
    git commit -m "feat: sécurité, rate limiting, PM2, rollback, proxy nginx"
    git push origin main
    → suivre le pipeline sur github.com → Actions

  ÉTAPE 8 — Vérifier que tout fonctionne
    - https://ordutemps.fr → site s'affiche
    - Formulaire de contact → envoyer un message test
    - https://ordutemps.fr/emma → panel admin accessible

  ÉTAPE 9 — Changer le mot de passe admin depuis l'interface
    → /emma → onglet Sécurité → nouveau mot de passe fort (12+ carac.)


## PROBLÈME CRITIQUE À NE PAS OUBLIER

Avant les modifications, la config Nginx ne proxiait PAS vers Node.js.
Le formulaire de contact et le panel admin /emma ne fonctionnaient
pas du tout en production (erreur 404 sur tous les appels /api/*).

La nouvelle config corrige ça. L'Étape 3 (mise à jour Nginx)
est donc indispensable pour que le site soit pleinement fonctionnel.


## FICHIERS UTILES DANS LE REPO

  PROCEDURE-MISE-EN-PRODUCTION.md  ← guide détaillé étape par étape
  .env.example                     ← template à copier en .env sur le VPS
  devops/setup.sh                  ← setup initial VPS (si pas encore fait)
  devops/nginx/ordutemps.conf      ← config Nginx à jour
  devops/README.md                 ← architecture et commandes utiles


## COMMANDES DE DIAGNOSTIC RAPIDE (sur le VPS)

  pm2 status                             ← état du serveur Node.js
  pm2 logs ordutemps --lines 30          ← logs récents
  curl http://localhost:3000/api/config  ← tester Node.js directement
  sudo nginx -t                          ← vérifier la config Nginx
  ls /var/www/ordutemps/data/backups/   ← voir les backups de config
