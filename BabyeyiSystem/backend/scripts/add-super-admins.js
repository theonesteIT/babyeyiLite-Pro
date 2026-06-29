#!/usr/bin/env node
/** Add extra SUPER_ADMIN accounts (idempotent). */
'use strict';

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const bcrypt = require('bcryptjs');
const { promisePool } = require('../config/database');
const { ensureCoreRoles } = require('../utils/coreRolesSchema');

const EXTRA_ADMINS = [
  {
    email: 'superadmin2@babyeyi.rw',
    password: 'BabyeyiAdmin2@',
    first_name: 'Super',
    last_name: 'Admin Two',
  },
  {
    email: 'superadmin3@babyeyi.rw',
    password: 'BabyeyiAdmin3@',
    first_name: 'Super',
    last_name: 'Admin Three',
  },
];

function generateUserUID() {
  return `SA-${Date.now().toString().slice(-6)}${Math.floor(Math.random() * 900 + 100)}`;
}

async function main() {
  await ensureCoreRoles();
  const [[role]] = await promisePool.query(
    "SELECT id FROM roles WHERE role_code = 'SUPER_ADMIN' LIMIT 1",
  );
  if (!role) throw new Error('SUPER_ADMIN role missing');

  for (const admin of EXTRA_ADMINS) {
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
