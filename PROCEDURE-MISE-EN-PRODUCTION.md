# Procédure de mise en production — Or du Temps
# ================================================
# À lire de haut en bas, dans l'ordre.
# Durée estimée : 20-30 minutes si le VPS est déjà configuré.


==============================================================
ÉTAPE 1 — INSTALLER PM2 SUR LE VPS
==============================================================

PM2 est le gestionnaire de processus Node.js. Il s'assure que
le serveur redémarre automatiquement si le VPS redémarre ou si
le serveur plante.

Connecte-toi à ton VPS en SSH :

    ssh root@IP_DU_VPS

Puis installe PM2 globalement :

    npm install -g pm2

Génère la commande de démarrage automatique (systemd) :

    pm2 startup systemd

  --> Cette commande va afficher une ligne commençant par "sudo env ...".
      Copie-la et exécute-la exactement comme indiqué.
      Exemple de ce que tu verras :
      sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u root --hp /root

Exécute la ligne affichée, puis continue.


==============================================================
ÉTAPE 2 — CRÉER LE FICHIER .env DE PRODUCTION SUR LE VPS
==============================================================

Le fichier .env contient tous les secrets du site (mot de passe
admin, identifiants email, etc.). Il ne doit JAMAIS être dans git.

Sur le VPS, toujours connecté en SSH :

    cp /var/www/ordutemps/.env.example /var/www/ordutemps/.env
    nano /var/www/ordutemps/.env

Tu verras un fichier avec des valeurs à remplir. Voici le détail
de chaque variable :

  PORT=3000
    → Le port sur lequel tourne le serveur Node.js.
      Laisse 3000. Ne change pas sauf si tu as un conflit.

  SMTP_HOST=smtp.example.com
    → L'adresse du serveur SMTP de ton fournisseur email.
      Exemples courants :
        OVH      : ssl0.ovh.net
        Brevo    : smtp-relay.brevo.com
        Gmail    : smtp.gmail.com
        Postmark : smtp.postmarkapp.com

  SMTP_PORT=587
    → Le port SMTP. Laisse 587 (standard TLS).
      Utilise 465 uniquement si ton fournisseur l'exige (SSL direct).

  EMAIL_USER=votre-adresse@example.com
    → L'adresse email qui envoie les messages (identifiant SMTP).
      Ex : contact@ordutemps.fr

  EMAIL_PASS=votre-mot-de-passe
    → Le mot de passe (ou token API) du compte email ci-dessus.
      Attention : avec Gmail, il faut un "mot de passe d'application"
      (pas ton mot de passe Gmail normal).

  EMAIL_TO=contact@ordutemps.fr
    → L'adresse qui REÇOIT les messages du formulaire de contact.
      C'est l'email d'Emma (ou le tien pour les tests).

  CALENDLY_URL=https://calendly.com/emma-garcia
    → L'URL Calendly d'Emma pour les réservations.
      À récupérer depuis son compte Calendly.

  ADMIN_PASSWORD=changez-moi-en-production
    → LE MOT DE PASSE DE L'ESPACE ADMIN /emma
      OBLIGATOIRE : remplace-le par un mot de passe fort.
      Minimum 8 caractères. Exemple : OrDuTemps@2026!
      NOTE : tu pourras aussi le changer depuis l'interface admin
      une fois le site en ligne.

  ALLOWED_ORIGINS=https://ordutemps.fr,https://www.ordutemps.fr
    → Les domaines autorisés à appeler l'API. Laisse tel quel.

Une fois rempli, sauvegarde avec Ctrl+O, Entrée, puis Ctrl+X.


==============================================================
ÉTAPE 3 — METTRE À JOUR LA CONFIG NGINX
==============================================================

La nouvelle config Nginx ajoute le "proxy" vers Node.js.
Sans ça, le formulaire de contact et le panel admin /emma
ne fonctionnent PAS en production (erreur 404 sur les API).

Sur le VPS :

    sudo cp /var/www/ordutemps/devops/nginx/ordutemps.conf \
            /etc/nginx/sites-available/ordutemps

Vérifie que la syntaxe est correcte :

    sudo nginx -t

  --> Tu dois voir : "syntax is ok" et "test is successful"
      Si tu vois une erreur, copie-la et contacte-moi.

Recharge Nginx pour appliquer la config :

    sudo systemctl reload nginx


==============================================================
ÉTAPE 4 — AUTORISER LE DÉPLOIEMENT AUTOMATIQUE SANS MOT DE PASSE
==============================================================

Le pipeline GitHub Actions recharge Nginx via SSH. Pour ça,
l'utilisateur "deploy" doit pouvoir utiliser sudo sur nginx
sans qu'on lui demande un mot de passe.

Sur le VPS (en root) :

    echo "deploy ALL=(root) NOPASSWD: /usr/sbin/nginx -t, /bin/systemctl reload nginx" \
      | sudo tee /etc/sudoers.d/deploy-nginx

    sudo chmod 440 /etc/sudoers.d/deploy-nginx

Vérifie que ça a bien été pris en compte :

    sudo visudo -c
  --> Doit afficher : "parsed OK"

NOTE : Si l'utilisateur deploy n'existe pas encore sur ton VPS,
lance d'abord le script de setup :

    DOMAIN=ordutemps.fr EMAIL=ton@email.com bash /var/www/ordutemps/devops/setup.sh


==============================================================
ÉTAPE 5 — LANCER LE SERVEUR NODE.JS POUR LA PREMIÈRE FOIS
==============================================================

Cette étape est à faire UNE SEULE FOIS manuellement.
Après, c'est PM2 et le pipeline qui s'en occupent.

Sur le VPS :

    cd /var/www/ordutemps
    npm ci --omit=dev

Démarre le serveur avec PM2 :

    pm2 start server.js --name ordutemps --restart-delay=3000 --max-restarts=5

Sauvegarde la liste des processus PM2 (pour le redémarrage auto) :

    pm2 save

Vérifie que ça tourne bien :

    pm2 status
  --> Doit afficher "ordutemps" avec le statut "online"

Vérifie les logs pour détecter d'éventuelles erreurs :

    pm2 logs ordutemps --lines 20

  --> Si tu vois "Or du Temps — serveur démarré", c'est bon.
  --> Si tu vois une erreur, c'est probablement le .env mal configuré.
      Relis l'Étape 2.

Teste que le serveur répond localement :

    curl http://localhost:3000/api/config
  --> Doit retourner {} ou un JSON de configuration


==============================================================
ÉTAPE 6 — POUSSER LE CODE POUR DÉCLENCHER LE PREMIER DÉPLOIEMENT
==============================================================

Retourne sur ta machine locale (plus sur le VPS).

Assure-toi que les secrets GitHub sont bien configurés.
Va sur : github.com → ton repo → Settings → Secrets and variables
         → Actions → New repository secret

Les 4 secrets à avoir :
  VPS_HOST    = IP de ton VPS (ex : 51.210.xxx.xxx)
  VPS_USER    = deploy
  VPS_SSH_KEY = contenu de ta clé privée SSH (~/.ssh/ordutemps_deploy)
  VPS_PORT    = 22 (ou ton port SSH si tu l'as changé)

Pour récupérer le contenu de ta clé privée :

    cat ~/.ssh/ordutemps_deploy

  --> Copie tout (de "-----BEGIN OPENSSH PRIVATE KEY-----"
      jusqu'à "-----END OPENSSH PRIVATE KEY-----" inclus)

Une fois les secrets configurés, pousse le code :

    git add -A
    git commit -m "feat: sécurité, rate limiting, PM2, rollback, proxy nginx"
    git push origin main

Va sur GitHub → Actions pour suivre le déploiement en direct.
Le pipeline doit passer par ces étapes dans l'ordre :
  ✅ Checkout
  ✅ Configurer SSH
  ✅ Backup de la version actuelle
  ✅ Déployer les fichiers (rsync)
  ✅ npm ci
  ✅ Redémarrer PM2
  ✅ Recharger Nginx
  ✅ Vérification HTTP → le site doit répondre 200


==============================================================
ÉTAPE 7 — VÉRIFIER QUE TOUT FONCTIONNE
==============================================================

Ouvre ton navigateur et teste dans l'ordre :

  1. Le site principal :
     https://ordutemps.fr
     → Doit s'afficher normalement

  2. Le formulaire de contact :
     → Envoie un message test depuis le site
     → Emma doit recevoir l'email (vérifie les spams aussi)

  3. Le panel admin :
     https://ordutemps.fr/emma
     → Doit demander le mot de passe (celui que tu as mis dans .env)
     → Modifie un petit texte et sauvegarde
     → Recharge le site et vérifie que la modif apparaît

  Si quelque chose ne marche pas :
  - Formulaire → vérifier les logs : pm2 logs ordutemps
  - Admin 404  → vérifier que nginx a bien la nouvelle config (Étape 3)
  - Email      → vérifier les credentials SMTP dans .env


==============================================================
ÉTAPE 8 — CHANGER LE MOT DE PASSE ADMIN DEPUIS L'INTERFACE
==============================================================

Une fois connectée à l'espace admin, va dans l'onglet "Sécurité"
et change le mot de passe pour quelque chose de définitif et fort.

Le nouveau mot de passe sera stocké dans data/admin.json sur le VPS
et prendra le dessus sur la valeur dans .env.

Recommandations pour le mot de passe :
  - Minimum 12 caractères
  - Mélange majuscules, minuscules, chiffres, symboles
  - Exemple : OrDuTemps@Albi2026!
  - Garde-le dans un gestionnaire de mots de passe (Bitwarden, etc.)


==============================================================
POUR LES DÉPLOIEMENTS SUIVANTS
==============================================================

Après cette mise en production initiale, chaque déploiement
se fait simplement avec :

    git add -A
    git commit -m "description des changements"
    git push origin main

Le pipeline s'occupe de tout automatiquement :
  - Backup de l'ancienne version
  - Déploiement des nouveaux fichiers
  - Installation des dépendances si nécessaire
  - Redémarrage de Node.js
  - Vérification que le site répond
  - Rollback automatique si quelque chose se passe mal


==============================================================
COMMANDES UTILES SUR LE VPS
==============================================================

Voir les logs du serveur Node.js en temps réel :
    pm2 logs ordutemps

Voir le statut de PM2 :
    pm2 status

Redémarrer le serveur manuellement :
    pm2 restart ordutemps

Voir les logs Nginx :
    sudo tail -f /var/log/nginx/error.log

Vérifier que le serveur répond :
    curl http://localhost:3000/api/config

Voir les backups de configuration :
    ls -la /var/www/ordutemps/data/backups/

Restaurer un backup manuellement :
    cp /var/www/ordutemps/data/backups/config-2026-01-15T10-30-00.json \
       /var/www/ordutemps/data/config.json
    pm2 restart ordutemps


==============================================================
EN CAS DE PROBLÈME
==============================================================

Le site n'affiche pas la bonne version après un deploy :
  → Vide le cache du navigateur (Ctrl+Shift+R)
  → Vérifie pm2 status (le processus doit être "online")

Le formulaire de contact retourne une erreur :
  → pm2 logs ordutemps → cherche "Erreur envoi email"
  → Vérifie les variables SMTP dans .env

L'admin /emma ne répond pas :
  → sudo nginx -t (vérifier la config nginx)
  → curl http://localhost:3000/emma (tester Node.js directement)
  → Si Node.js ne répond pas : pm2 restart ordutemps

PM2 n'est plus en ligne après un redémarrage du VPS :
  → Refaire : pm2 startup systemd (et exécuter la commande affichée)
  → Puis : pm2 save
