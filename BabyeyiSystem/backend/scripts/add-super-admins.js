#!/usr/bin/env node
/** Add extra SUPER_ADMIN accounts (idempotent). Credentials come from env only — never commit passwords. */
'use strict';

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const bcrypt = require('bcryptjs');
const { promisePool } = require('../config/database');
const { ensureCoreRoles } = require('../utils/coreRolesSchema');

/**
 * Parse EXTRA_SUPER_ADMINS from .env (JSON array).
 * Example:
 * EXTRA_SUPER_ADMINS=[{"email":"admin2@school.rw","password":"...","first_name":"Super","last_name":"Admin Two"}]
 */
function loadExtraAdminsFromEnv() {
  const raw = String(process.env.EXTRA_SUPER_ADMINS || '').trim();
  if (!raw) return [];

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(
      'EXTRA_SUPER_ADMINS must be valid JSON array, e.g. [{"email":"...","password":"...","first_name":"...","last_name":"..."}]',
    );
  }

  if (!Array.isArray(parsed)) {
    throw new Error('EXTRA_SUPER_ADMINS must be a JSON array');
  }

  return parsed.map((entry, i) => {
    const email = String(entry?.email || '').trim().toLowerCase();
    const password = String(entry?.password || '');
    const first_name = String(entry?.first_name || entry?.firstName || 'Super').trim();
    const last_name = String(entry?.last_name || entry?.lastName || 'Admin').trim();

    if (!email || !password) {
      throw new Error(`EXTRA_SUPER_ADMINS[${i}] requires email and password`);
    }

    return { email, password, first_name, last_name };
  });
}

function generateUserUID() {
  return `SA-${Date.now().toString().slice(-6)}${Math.floor(Math.random() * 900 + 100)}`;
}

async function main() {
  const extraAdmins = loadExtraAdminsFromEnv();
  if (!extraAdmins.length) {
    console.log('No EXTRA_SUPER_ADMINS in .env — nothing to create or update.');
    console.log('Set EXTRA_SUPER_ADMINS in BabyeyiSystem/backend/.env (JSON array) then re-run this script.');
    await promisePool.end();
    return;
  }

  await ensureCoreRoles();
  const [[role]] = await promisePool.query(
    "SELECT id FROM roles WHERE role_code = 'SUPER_ADMIN' LIMIT 1",
  );
  if (!role) throw new Error('SUPER_ADMIN role missing');

  for (const admin of extraAdmins) {
    const [[existing]] = await promisePool.query(
      'SELECT id FROM users WHERE email = ? AND deleted_at IS NULL LIMIT 1',
      [admin.email],
    );
    const hash = await bcrypt.hash(admin.password, 10);
    if (existing) {
      await promisePool.query(
        'UPDATE users SET password_hash = ?, role_id = ?, is_active = 1, is_verified = 1 WHERE id = ?',
        [hash, role.id, existing.id],
      );
      console.log(`Updated: ${admin.email}`);
    } else {
      await promisePool.query(
        `INSERT INTO users (user_uid, email, password_hash, first_name, last_name, role_id, is_active, is_verified, created_at)
         VALUES (?,?,?,?,?,?,1,1,NOW())`,
        [generateUserUID(), admin.email, hash, admin.first_name, admin.last_name, role.id],
      );
      console.log(`Created: ${admin.email}`);
    }
  }

  const [all] = await promisePool.query(
    `SELECT u.email, u.first_name, u.last_name FROM users u
     JOIN roles r ON r.id = u.role_id
     WHERE r.role_code = 'SUPER_ADMIN' AND u.deleted_at IS NULL
     ORDER BY u.id`,
  );
  console.log('\nAll SUPER_ADMIN accounts:', all.length);
  for (const u of all) console.log(`  - ${u.email} (${u.first_name} ${u.last_name})`);

  await promisePool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
