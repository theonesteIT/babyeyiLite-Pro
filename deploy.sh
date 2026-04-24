#!/bin/bash
# ================================================================
# deploy.sh — Babyeyi Full Deployment Script with Git Pull
# Usage: bash /root/deploy.sh
# Auto-fixes: git pull, localhost hardcoding, MTN env vars,
#             DB columns, PM2 ecosystem, all 3 frontends, nginx
# ================================================================

set -e

REPO_DIR="/root/apps/babyeyiLite-Pro"
BACKEND_DIR="$REPO_DIR/BabyeyiSystem/backend"
FRONTEND_DIR="$REPO_DIR/BabyeyiSystem/frontend"
PRO_DIR="$REPO_DIR/babyeyipro/Frontend/web"
TEACHER_DIR="$REPO_DIR/teacher-portal/frontend"
ENV_FILE="$BACKEND_DIR/.env"

echo ""
echo "=========================================================="
echo "   BABYEYI FULL DEPLOYMENT - $(date '+%Y-%m-%d %H:%M:%S')"
echo "=========================================================="
echo ""

# ================================================================
# STEP 1: Pull latest code from GitHub
# ================================================================
echo "[1/9] Pulling latest code from GitHub..."
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
# STEP 2: Fix hardcoded localhost:5100 in all source files
# ================================================================
echo "[2/9] Fixing hardcoded localhost:5100 in source files..."

python3 - << 'PYEOF'
import os

BASE = "/root/apps/babyeyiLite-Pro"
PROD = "https://babyeyi.rw"

fixes = {
    BASE + "/BabyeyiSystem/frontend/src/Pages/Nesa Page/NESAPages/FeeLimitsView.jsx": [
        ('const BASE_URL = "http://localhost:5100"',
         'const BASE_URL = import.meta.env.VITE_API_URL || "' + PROD + '"'),
    ],
    BASE + "/BabyeyiSystem/frontend/src/Pages/Public Page/ApplicationStatusTracker.jsx": [
        ('const SERVER       = "http://localhost:5100"',
         'const SERVER = import.meta.env.VITE_API_URL || "' + PROD + '"'),
    ],
    BASE + "/BabyeyiSystem/frontend/src/Pages/School Manager/components/SchoolMiniWebsitePage.jsx": [
        ('const SERVER        = "http://localhost:5100"',
         'const SERVER = import.meta.env.VITE_API_URL || "' + PROD + '"'),
    ],
    BASE + "/BabyeyiSystem/frontend/src/Pages/School Manager/components/UpdateBabyeyi.jsx": [
        ('const API_BASE   = "http://localhost:5100/api"',
         'const API_BASE = (import.meta.env.VITE_API_URL || "' + PROD + '") + "/api"'),
        ('const ASSET_BASE = "http://localhost:5100"',
         'const ASSET_BASE = import.meta.env.VITE_API_URL || "' + PROD + '"'),
    ],
    BASE + "/BabyeyiSystem/frontend/src/Pages/School Manager/components/BabyeyiList.jsx": [
        ('const API_BASE        = "http://localhost:5100/api"',
         'const API_BASE = (import.meta.env.VITE_API_URL || "' + PROD + '") + "/api"'),
        ('const ASSET_BASE      = "http://localhost:5100"',
         'const ASSET_BASE = import.meta.env.VITE_API_URL || "' + PROD + '"'),
    ],
    BASE + "/BabyeyiSystem/frontend/src/Pages/School Manager/components/OtherPages.jsx": [
        ('const API_BASE = "http://localhost:5100/api"',
         'const API_BASE = (import.meta.env.VITE_API_URL || "' + PROD + '") + "/api"'),
    ],
    BASE + "/BabyeyiSystem/frontend/src/Pages/School Manager/components/BabyeyiVerifyPage.jsx": [
        ('const API_BASE        = "http://localhost:5100/api"',
         'const API_BASE = (import.meta.env.VITE_API_URL || "' + PROD + '") + "/api"'),
        ('const ASSET_BASE      = "http://localhost:5100"',
         'const ASSET_BASE = import.meta.env.VITE_API_URL || "' + PROD + '"'),
    ],
    BASE + "/BabyeyiSystem/frontend/src/Pages/School Manager/components/AdmissionApplyPage.jsx": [
        ('const API = "http://localhost:5100/api/admissions"',
         'const API = (import.meta.env.VITE_API_URL || "' + PROD + '") + "/api/admissions"'),
        ('const SERVER = "http://localhost:5100"',
         'const SERVER = import.meta.env.VITE_API_URL || "' + PROD + '"'),
    ],
    BASE + "/BabyeyiSystem/frontend/src/Pages/School Manager/components/BabyeyiPDF.jsx": [
        ('const API_BASE   = "http://localhost:5100/api"',
         'const API_BASE = (import.meta.env.VITE_API_URL || "' + PROD + '") + "/api"'),
        ('const ASSET_BASE = "http://localhost:5100"',
         'const ASSET_BASE = import.meta.env.VITE_API_URL || "' + PROD + '"'),
    ],
    BASE + "/BabyeyiSystem/frontend/src/Pages/School Manager/components/AdmissionFormBuilder.jsx": [
        ('const API = "http://localhost:5100/api/admissions"',
         'const API = (import.meta.env.VITE_API_URL || "' + PROD + '") + "/api/admissions"'),
    ],
    BASE + "/BabyeyiSystem/frontend/src/Pages/School Manager/components/ApplicantDetailModal.jsx": [
        ('const SERVER = "http://localhost:5100"',
         'const SERVER = import.meta.env.VITE_API_URL || "' + PROD + '"'),
    ],
    BASE + "/BabyeyiSystem/frontend/src/Pages/School Manager/components/Babyeyi.jsx": [
        ('const API_BASE   = "http://localhost:5100/api"',
         'const API_BASE = (import.meta.env.VITE_API_URL || "' + PROD + '") + "/api"'),
        ('const ASSET_BASE = "http://localhost:5100"',
         'const ASSET_BASE = import.meta.env.VITE_API_URL || "' + PROD + '"'),
    ],
    BASE + "/babyeyipro/Frontend/web/src/manager/pages/Students.jsx": [
        ('src={`http://localhost:5100${student.student_photo_url}`}',
         'src={`${import.meta.env.VITE_API_URL || "' + PROD + '"}${student.student_photo_url}`}'),
        ('src={`http://localhost:5100${s.student_photo_url}`}',
         'src={`${import.meta.env.VITE_API_URL || "' + PROD + '"}${s.student_photo_url}`}'),
    ],
    BASE + "/babyeyipro/Frontend/web/src/displine_staff_portal/frontend/src/components/StudentDisciplineModal.jsx": [
        ('src={`http://localhost:5100${student.student_photo_url}`}',
         'src={`${import.meta.env.VITE_API_URL || "' + PROD + '"}${student.student_photo_url}`}'),
    ],
    BASE + "/babyeyipro/Frontend/web/src/accountant_portal/frontend/src/components/StudentDisciplineModal.jsx": [
        ('src={`http://localhost:5100${student.student_photo_url}`}',
         'src={`${import.meta.env.VITE_API_URL || "' + PROD + '"}${student.student_photo_url}`}'),
    ],
}

fixed = 0
clean = 0
for path, replacements in fixes.items():
    if not os.path.exists(path):
        continue
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()
    original = content
    for old, new in replacements:
        content = content.replace(old, new)
    if content != original:
        with open(path, "w", encoding="utf-8") as f:
            f.write(content)
        fixed += 1
        print("  FIXED: " + os.path.basename(path))
    else:
        clean += 1

print("  RESULT: " + str(fixed) + " files fixed, " + str(clean) + " already clean")
PYEOF
echo ""

# ================================================================
# STEP 3: Fix backend .env MTN MoMo variable names
# ================================================================
echo "[3/9] Fixing backend .env MTN MoMo variables..."

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
# STEP 4: Fix database missing columns
# ================================================================
echo "[4/9] Fixing database columns..."

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
# STEP 5: Create/update PM2 ecosystem.config.js
# ================================================================
echo "[5/9] Setting up PM2 ecosystem.config.js..."

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
# STEP 6: Backend — install dependencies & restart
# ================================================================
echo "[6/9] Backend: npm install + pm2 restart..."
cd "$BACKEND_DIR"
npm install --prefer-offline 2>&1 | tail -3

# Clean restart so no stale env vars survive
pm2 delete babyeyi-backend 2>/dev/null || true
pm2 start "$BACKEND_DIR/ecosystem.config.js"
pm2 save
echo "  Backend restarted OK"
echo ""

# ================================================================
# STEP 7: Build all three frontends
# ================================================================
echo "[7/9] Building all frontends..."

echo "  --> BabyeyiSystem frontend..."
cd "$FRONTEND_DIR"
npm install --prefer-offline 2>&1 | tail -2
npm run build 2>&1 | tail -2
rm -rf /var/www/babyeyi/*
cp -r dist/* /var/www/babyeyi/
echo "  OK: deployed to /var/www/babyeyi/"

echo "  --> Pro app frontend..."
cd "$PRO_DIR"
npm install --prefer-offline 2>&1 | tail -2
npm run build 2>&1 | tail -2
rm -rf /var/www/babyeyipro/*
cp -r dist/* /var/www/babyeyipro/
echo "  OK: deployed to /var/www/babyeyipro/"

echo "  --> Teacher portal frontend..."
cd "$TEACHER_DIR"
npm install --prefer-offline 2>&1 | tail -2
npm run build 2>&1 | tail -2
rm -rf /var/www/ticha/*
cp -r dist/* /var/www/ticha/
echo "  OK: deployed to /var/www/ticha/"
echo ""

# ================================================================
# STEP 8: Set file permissions
# ================================================================
echo "[8/9] Setting file permissions..."
chown -R www-data:www-data /var/www/babyeyi /var/www/babyeyipro /var/www/ticha
chmod -R 755 /var/www/babyeyi /var/www/babyeyipro /var/www/ticha
echo "  Permissions set"
echo ""

# ================================================================
# STEP 9: Reload Nginx
# ================================================================
echo "[9/9] Reloading Nginx..."
nginx -t && systemctl reload nginx
echo "  Nginx reloaded"
echo ""

# ================================================================
# SUMMARY
# ================================================================
echo "=========================================================="
echo "   DEPLOYMENT COMPLETE - $(date '+%Y-%m-%d %H:%M:%S')"
echo "=========================================================="
echo ""
echo "  https://babyeyi.rw          BabyeyiSystem"
echo "  https://babyeyi.rw/pro      Pro app"
echo "  /var/www/ticha              Teacher portal"
echo ""
echo "  Git commit: $(cd $REPO_DIR && git log -1 --pretty='%h - %s')"
echo ""
echo "  Backend status:"
pm2 list | grep babyeyi
echo ""
echo "  Check logs: pm2 logs babyeyi-backend --lines 30"
echo ""
