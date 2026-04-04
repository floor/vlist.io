#!/bin/bash
# =============================================================================
# vlist.io — Initial Server Setup (Debian + PM2 + nginx)
# Run once on floor.io to set up the deployment target
# =============================================================================

set -e

APP_DIR="/home/floor/vlist.io"
REPO="git@github.com:floor/vlist.io.git"

echo "🚀 Setting up vlist.io on $(hostname)"
echo ""

# ─────────────────────────────────────────────────────────────────────────────
# 1. Clone repository
# ─────────────────────────────────────────────────────────────────────────────

if [ -d "$APP_DIR" ]; then
    echo "⚠️  $APP_DIR already exists — skipping clone"
else
    echo "📦 Cloning repository..."
    sudo mkdir -p "$APP_DIR"
    sudo chown "$USER:$USER" "$APP_DIR"
    git clone "$REPO" "$APP_DIR"
fi

cd "$APP_DIR"

# ─────────────────────────────────────────────────────────────────────────────
# 2. Install dependencies & build
# ─────────────────────────────────────────────────────────────────────────────

echo "📦 Installing dependencies..."
bun install --frozen-lockfile

echo "🔨 Building sandbox..."
bun run build:sandbox

# ─────────────────────────────────────────────────────────────────────────────
# 3. PM2 — start the Bun server
# ─────────────────────────────────────────────────────────────────────────────

echo "⚙️  Starting PM2 process..."

# Create log directory
sudo mkdir -p /var/log/pm2
sudo chown "$USER:$USER" /var/log/pm2

pm2 start ecosystem.config.cjs
pm2 save

echo ""
echo "   PM2 status:"
pm2 list

# ─────────────────────────────────────────────────────────────────────────────
# 4. nginx — install vhost
# ─────────────────────────────────────────────────────────────────────────────

NGINX_CONF="/etc/nginx/sites-enabled/vlist.io.conf"

if [ -L "$NGINX_CONF" ]; then
    echo "⚠️  nginx vhost already linked — skipping"
else
    echo "🌐 Installing nginx vhost..."
    sudo ln -s "$APP_DIR/nginx/vlist.io.conf" "$NGINX_CONF"
    sudo nginx -t && sudo systemctl reload nginx
fi

# ─────────────────────────────────────────────────────────────────────────────
# 5. SSL — certbot
# ─────────────────────────────────────────────────────────────────────────────

echo ""
echo "🔒 SSL setup (run manually):"
echo ""
echo "   sudo certbot --nginx -d vlist.io -d www.vlist.io"
echo ""
echo "   After certbot runs, uncomment the ssl_ lines in:"
echo "   $APP_DIR/nginx/vlist.io.conf"
echo "   Then: sudo nginx -t && sudo systemctl reload nginx"

# ─────────────────────────────────────────────────────────────────────────────
# 6. GitHub Actions secrets
# ─────────────────────────────────────────────────────────────────────────────

echo ""
echo "🔑 GitHub Actions secrets needed (Settings → Secrets → Actions):"
echo ""
echo "   SERVER_HOST     → floor.io (or IP address)"
echo "   SERVER_USER     → $USER"
echo "   SERVER_SSH_KEY  → contents of ~/.ssh/deploy_key (private key)"
echo "   SERVER_PORT     → 22 (optional, defaults to 22)"
echo ""
echo "   Generate a deploy key:"
echo "   ssh-keygen -t ed25519 -C 'vlist.io-deploy' -f ~/.ssh/vlist_deploy"
echo "   cat ~/.ssh/vlist_deploy.pub >> ~/.ssh/authorized_keys"
echo "   Then paste the private key (~/.ssh/vlist_deploy) as SERVER_SSH_KEY"

# ─────────────────────────────────────────────────────────────────────────────
# Done
# ─────────────────────────────────────────────────────────────────────────────

echo ""
echo "✅ Setup complete!"
echo ""
echo "   Site:    http://localhost:3338 (direct)"
echo "   Proxy:   https://vlist.io (after DNS + SSL)"
echo "   Logs:    pm2 logs vlist.io"
echo "   Status:  pm2 status"
echo "   Restart: pm2 reload vlist.io"
