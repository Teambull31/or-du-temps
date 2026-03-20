#!/bin/bash
# ============================================================
#  Or du Temps — Setup VPS (Ubuntu 22.04)
#  À exécuter UNE SEULE FOIS sur ton VPS :
#
#  DOMAIN=ordutemps.fr EMAIL=ton@email.com bash setup.sh
#
#  Prérequis : Nginx déjà installé (foodmatch en place)
# ============================================================
set -euo pipefail

# ── Variables ────────────────────────────────────────────────
DOMAIN="${DOMAIN:-ordutemps.fr}"
EMAIL="${EMAIL:-ton@email.com}"
APP_DIR="/var/www/ordutemps"
DEPLOY_USER="deploy"          # Utilisateur dédié au déploiement
NGINX_CONF_SRC="$(dirname "$0")/nginx/ordutemps.conf"

echo ""
echo "✨  Or du Temps — Setup VPS"
echo "════════════════════════════"
echo "  Domaine  : $DOMAIN"
echo "  Dossier  : $APP_DIR"
echo "  Certbot  : $EMAIL"
echo ""

# ── 0. Vérifications ─────────────────────────────────────────
if [ "$EUID" -ne 0 ]; then
  echo "❌  Ce script doit être exécuté en root (sudo bash setup.sh)"
  exit 1
fi

if ! command -v nginx &>/dev/null; then
  echo "❌  Nginx n'est pas installé. Lance d'abord le setup foodmatch."
  exit 1
fi

# ── 1. Certbot (déjà installé via foodmatch, mais on vérifie) ─
if ! command -v certbot &>/dev/null; then
  apt-get update -qq
  apt-get install -y certbot python3-certbot-nginx
  echo "✅  Certbot installé"
else
  echo "✅  Certbot déjà présent"
fi

# ── 2. Utilisateur deploy (partagé avec foodmatch si existe) ──
if ! id "$DEPLOY_USER" &>/dev/null; then
  useradd --system --no-create-home --shell /bin/bash "$DEPLOY_USER"
  echo "✅  Utilisateur '$DEPLOY_USER' créé"
else
  echo "✅  Utilisateur '$DEPLOY_USER' déjà présent"
fi

# Clé SSH pour GitHub Actions
DEPLOY_HOME="/home/$DEPLOY_USER"
mkdir -p "$DEPLOY_HOME/.ssh"
chmod 700 "$DEPLOY_HOME/.ssh"

if [ ! -f "$DEPLOY_HOME/.ssh/authorized_keys" ]; then
  touch "$DEPLOY_HOME/.ssh/authorized_keys"
  chmod 600 "$DEPLOY_HOME/.ssh/authorized_keys"
fi
chown -R "$DEPLOY_USER:$DEPLOY_USER" "$DEPLOY_HOME"

echo ""
echo "  ┌──────────────────────────────────────────────────────┐"
echo "  │  Génère une paire de clés SSH sur TON PC :           │"
echo "  │                                                       │"
echo "  │  ssh-keygen -t ed25519 -C 'github-ordutemps'        │"
echo "  │                                                       │"
echo "  │  Puis colle la clé PUBLIQUE (.pub) ici :             │"
echo "  └──────────────────────────────────────────────────────┘"
echo ""
read -r -p "  Colle la clé publique SSH (ou Entrée pour passer) : " PUBKEY
if [ -n "$PUBKEY" ]; then
  echo "$PUBKEY" >> "$DEPLOY_HOME/.ssh/authorized_keys"
  echo "✅  Clé SSH ajoutée pour '$DEPLOY_USER'"
fi

# ── 3. Dossier web ────────────────────────────────────────────
mkdir -p "$APP_DIR"
chown "$DEPLOY_USER:www-data" "$APP_DIR"
chmod 755 "$APP_DIR"
echo "✅  Dossier $APP_DIR créé"

# Fichier index temporaire (évite 404 avant le 1er déploiement)
if [ ! -f "$APP_DIR/index.html" ]; then
  cat > "$APP_DIR/index.html" <<'HTML'
<!DOCTYPE html><html><head><meta charset="UTF-8">
<title>Or du Temps — Bientôt en ligne</title></head>
<body style="background:#0A0806;color:#C9A84C;font-family:sans-serif;
display:flex;align-items:center;justify-content:center;height:100vh;margin:0">
<h1>Or du Temps — Bientôt en ligne ✨</h1></body></html>
HTML
  chown "$DEPLOY_USER:www-data" "$APP_DIR/index.html"
  echo "✅  Page provisoire créée"
fi

# ── 4. Config Nginx ───────────────────────────────────────────
# Vérifier si les zones rate-limiting sont déjà dans nginx.conf
if ! grep -q "limit_req_zone" /etc/nginx/nginx.conf; then
  echo ""
  echo "  ⚠️  Les zones rate-limiting ne sont pas dans /etc/nginx/nginx.conf"
  echo "  Ajout automatique dans le bloc http {}..."
  sed -i '/http {/a\    limit_req_zone  $binary_remote_addr zone=req_per_ip:10m rate=20r/s;\n    limit_conn_zone $binary_remote_addr zone=conn_per_ip:10m;' /etc/nginx/nginx.conf
  echo "✅  Zones rate-limiting ajoutées"
else
  echo "✅  Zones rate-limiting déjà présentes (foodmatch)"
fi

# Copie la config Nginx
if [ -f "$NGINX_CONF_SRC" ]; then
  cp "$NGINX_CONF_SRC" /etc/nginx/sites-available/ordutemps
else
  echo "⚠️  Fichier nginx/ordutemps.conf introuvable à côté de ce script."
  echo "   Copie-le manuellement dans /etc/nginx/sites-available/ordutemps"
fi

# Remplace le placeholder du domaine si la conf utilise des variables
sed -i "s/ordutemps\.fr/$DOMAIN/g" /etc/nginx/sites-available/ordutemps 2>/dev/null || true

# Active le site
ln -sf /etc/nginx/sites-available/ordutemps /etc/nginx/sites-enabled/ordutemps

# Test syntaxe
nginx -t
systemctl reload nginx
echo "✅  Nginx configuré et rechargé"

# ── 5. Certificat SSL Let's Encrypt ──────────────────────────
echo ""
echo "📜  Génération du certificat SSL pour $DOMAIN..."
certbot --nginx \
  -d "$DOMAIN" \
  -d "www.$DOMAIN" \
  --non-interactive \
  --agree-tos \
  --email "$EMAIL" \
  --redirect
systemctl reload nginx
echo "✅  HTTPS activé (Let's Encrypt)"

# ── 6. Renouvellement automatique ────────────────────────────
if ! crontab -l 2>/dev/null | grep -q "certbot renew"; then
  (crontab -l 2>/dev/null; echo "0 3 * * * certbot renew --quiet && systemctl reload nginx") | crontab -
  echo "✅  Renouvellement SSL automatique (cron 03h00)"
fi

# ── 7. Résumé ─────────────────────────────────────────────────
echo ""
echo "════════════════════════════════════════════"
echo "🎉  Or du Temps est prêt !"
echo ""
echo "  Site live     : https://$DOMAIN"
echo "  Fichiers web  : $APP_DIR"
echo "  Config Nginx  : /etc/nginx/sites-available/ordutemps"
echo ""
echo "  Prochaine étape — dans ton repo GitHub :"
echo "  Settings → Secrets → Actions → ajouter :"
echo "    VPS_HOST     = IP de ton VPS"
echo "    VPS_USER     = $DEPLOY_USER"
echo "    VPS_SSH_KEY  = contenu de ta clé PRIVÉE SSH"
echo "    VPS_PORT     = 22 (ou ton port SSH personnalisé)"
echo "════════════════════════════════════════════"
echo ""
