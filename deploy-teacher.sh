#!/bin/bash
# ================================================================
# deploy-teacher.sh — Deployment Script for Teacher Portal & Backend
# Usage: bash /root/apps/babyeyiLite-Pro/deploy-teacher.sh
# ================================================================

set -e

REPO_DIR="/root/apps/babyeyiLite-Pro"
BACKEND_DIR="$REPO_DIR/BabyeyiSystem/backend"
TEACHER_DIR="$REPO_DIR/teacher-portal/frontend"
ENV_FILE="$BACKEND_DIR/.env"

echo ""
echo "=========================================================="
echo "   TEACHER PORTAL & BACKEND DEPLOYMENT - $(date '+%Y-%m-%d %H:%M:%S')"
echo "=========================================================="
echo ""

# ================================================================
# STEP 1: Pull latest code from GitHub
# ================================================================
echo "[1/7] Pulling latest code from GitHub..."
cd "$REPO_DIR"

# Save current branch name
BRANCH=$(git rev-parse --abbrev-ref HEAD)
echo "  Branch: $BRANCH"

# Stash any local changes so pull doesn't fail
git stash 2>/dev/null && echo "  Local changes stashed" || true

# Pull latest
git pull origin "$BRANCH"
echo "  Git pull complete"

# Show what changed
echo "  Latest commit: $(git log -1 --pretty='%h - %s (%an)')"
echo ""

# ================================================================
# STEP 2: Fix backend .env MTN MoMo variable names
# ================================================================
echo "[2/7] Fixing backend .env MTN MoMo variables..."

add_env_if_missing() {
  local KEY="$1"
  local VAL="$2"
  if ! grep -q "^${KEY}=" "$ENV_FILE" 2>/dev/null; then
    echo "${KEY}=${VAL}" >> "$ENV_FILE"
    echo "  Added: ${KEY}"
  fi
}

MOMO_BASE=$(grep "^MOMO_BASE_URL=" "$ENV_FILE" 2>/dev/null | cut -d'=' -f2-)
MOMO_SUB=$(grep "^MOMO_SUBSCRIPTION_KEY=" "$ENV_FILE" 2>/dev/null | cut -d'=' -f2-)
MOMO_USER=$(grep "^MOMO_API_USER_ID=" "$ENV_FILE" 2>/dev/null | cut -d'=' -f2-)
MOMO_KEY=$(grep "^MOMO_API_KEY=" "$ENV_FILE" 2>/dev/null | cut -d'=' -f2-)
MOMO_ENV=$(grep "^MOMO_ENVIRONMENT=" "$ENV_FILE" 2>/dev/null | cut -d'=' -f2-)

add_env_if_missing "MTN_MOMO_BASE_URL" "${MOMO_BASE:-https://proxy.momoapi.mtn.co.rw}"
add_env_if_missing "MTN_MOMO_SUBSCRIPTION_KEY" "$MOMO_SUB"
add_env_if_missing "MTN_MOMO_API_USER" "$MOMO_USER"
add_env_if_missing "MTN_MOMO_API_KEY" "$MOMO_KEY"
add_env_if_missing "MTN_MOMO_TARGET_ENVIRONMENT" "${MOMO_ENV:-mtnrwanda}"
add_env_if_missing "MTN_MOMO_CURRENCY" "RWF"

# Always clear callback URL — prevents MTN 500 INVALID_CALLBACK_URL_HOST
sed -i 's|^MOMO_CALLBACK_URL=.*|MOMO_CALLBACK_URL=|g' "$ENV_FILE"
sed -i 's|^MTN_MOMO_CALLBACK_URL=.*|MTN_MOMO_CALLBACK_URL=|g' "$ENV_FILE"
echo "  Callback URLs cleared (prevents MTN 500 error)"

# Clear stale shell-level vars from any previous export $(cat .env) usage
unset MOMO_CALLBACK_URL MTN_MOMO_CALLBACK_URL 2>/dev/null || true
echo "  Stale shell env vars cleared"
echo ""

# ================================================================
# STEP 3: Fix database missing columns
# ================================================================
echo "[3/7] Fixing database columns..."

DB_NAME=$(grep -E "^(DB_NAME|DATABASE|MYSQL_DB|DB_DATABASE)=" "$ENV_FILE" 2>/dev/null | head -1 | cut -d'=' -f2-)
DB_USER=$(grep -E "^(DB_USER|MYSQL_USER|DB_USERNAME)=" "$ENV_FILE" 2>/dev/null | head -1 | cut -d'=' -f2-)
DB_PASS=$(grep -E "^(DB_PASS|MYSQL_PASSWORD|DB_PASSWORD)=" "$ENV_FILE" 2>/dev/null | head -1 | cut -d'=' -f2-)
DB_HOST=$(grep -E "^(DB_HOST|MYSQL_HOST)=" "$ENV_FILE" 2>/dev/null | head -1 | cut -d'=' -f2-)
DB_HOST="${DB_HOST:-localhost}"

if [ -n "$DB_NAME" ] && [ -n "$DB_USER" ]; then
  mysql -u"$DB_USER" -p"$DB_PASS" -h"$DB_HOST" "$DB_NAME" 2>/dev/null << SQLEOF || echo "  Columns may already exist (safe to ignore)"
    SET @e1 = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='babyeyi_payments' AND COLUMN_NAME='pay_channel');
    SET @s1 = IF(@e1=0,'ALTER TABLE babyeyi_payments ADD COLUMN pay_channel VARCHAR(24) NOT NULL DEFAULT ''babyeyi''','SELECT 1');
    PREPARE p1 FROM @s1; EXECUTE p1; DEALLOCATE PREPARE p1;

    SET @e2 = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='babyeyi_student_requirements' AND COLUMN_NAME='cost');
    SET @s2 = IF(@e2=0,'ALTER TABLE babyeyi_student_requirements ADD COLUMN cost DECIMAL(14,2) NULL','SELECT 1');
    PREPARE p2 FROM @s2; EXECUTE p2; DEALLOCATE PREPARE p2;
SQLEOF
  echo "  Database columns OK"
else
  echo "  WARNING: DB credentials not found in .env - skipping"
fi
echo ""

# ================================================================
# STEP 4: Create/update PM2 ecosystem.config.js
# ================================================================
echo "[4/7] Setting up PM2 ecosystem.config.js..."

cat > "$BACKEND_DIR/ecosystem.config.js" << 'ECOEOF'
require('dotenv').config({ path: __dirname + '/.env' });
module.exports = {
  apps: [{
    name: 'babyeyi-backend',
    script: 'server.js',
    cwd: '/root/apps/babyeyiLite-Pro/BabyeyiSystem/backend',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '500M',
    env: { ...process.env, NODE_ENV: 'production' }
  }]
}
ECOEOF
echo "  ecosystem.config.js ready"
echo ""

# ================================================================
# STEP 5: Backend — install dependencies & restart
# ================================================================
echo "[5/7] Backend: npm install + pm2 restart..."
cd "$BACKEND_DIR"
npm install --prefer-offline 2>&1 | tail -3

# Clean restart so no stale env vars survive
pm2 delete babyeyi-backend 2>/dev/null || true
pm2 start "$BACKEND_DIR/ecosystem.config.js"
pm2 save
echo "  Backend restarted OK"
echo ""

# ================================================================
# STEP 6: Build Teacher portal frontend
# ================================================================
echo "[6/7] Building Teacher portal frontend..."

# Ensure we create .env.production to set the API URL during build
# This effectively replaces the python localhost:5100 text replacement
echo "VITE_API_URL=https://babyeyi.rw" > "$TEACHER_DIR/.env.production"
echo "VITE_UPLOADS_BASE=https://babyeyi.rw" >> "$TEACHER_DIR/.env.production"
echo "VITE_SOCKET_URL=https://babyeyi.rw" >> "$TEACHER_DIR/.env.production"

cd "$TEACHER_DIR"
npm install --prefer-offline 2>&1 | tail -2
npm run build 2>&1 | tail -2
rm -rf /var/www/ticha/*
cp -r dist/* /var/www/ticha/
echo "  OK: deployed to /var/www/ticha/"
echo ""

# ================================================================
# STEP 7: Set file permissions & Reload Nginx
# ================================================================
echo "[7/7] Setting file permissions and reloading Nginx..."
chown -R www-data:www-data /var/www/ticha
chmod -R 755 /var/www/ticha
echo "  Permissions set for /var/www/ticha"

nginx -t && systemctl reload nginx
echo "  Nginx reloaded"
echo ""

# ================================================================
# SUMMARY
# ================================================================
echo "=========================================================="
echo "   TEACHER PORTAL & BACKEND DEPLOYMENT COMPLETE"
echo "=========================================================="
echo ""
echo "  /var/www/ticha              Teacher portal"
echo ""
echo "  Git commit: $(cd $REPO_DIR && git log -1 --pretty='%h - %s')"
echo ""
echo "  Backend status:"
pm2 list | grep babyeyi
echo ""
echo "  Check logs: pm2 logs babyeyi-backend --lines 30"
echo ""
