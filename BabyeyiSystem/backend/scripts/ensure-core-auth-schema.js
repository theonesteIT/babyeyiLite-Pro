#!/usr/bin/env node
/**
 * Create core auth tables (roles, users, staff) when missing.
 *
 *   cd BabyeyiSystem/backend
 *   node scripts/ensure-core-auth-schema.js
 */
'use strict';

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const { promisePool } = require('../config/database');
const { ensureCoreAuthSchema } = require('../utils/coreAuthSchema');

async function tableExists(name) {
  const [[row]] = await promisePool.query(
    `SELECT COUNT(*) AS c FROM information_schema.tables
     WHERE table_schema = DATABASE() AND table_name = ?`,
    [name],
  );
  return Number(row.c) > 0;
}

async function main() {
  const beforeRoles = await tableExists('roles');
  const beforeUsers = await tableExists('users');
  const beforeStaff = await tableExists('staff');

  await ensureCoreAuthSchema();

  const afterRoles = await tableExists('roles');
  const afterUsers = await tableExists('users');
  const afterStaff = await tableExists('staff');

  console.log('Core auth schema');
  console.log(`  roles: ${beforeRoles ? 'already existed' : 'CREATED'}`);
  console.log(`  users: ${beforeUsers ? 'already existed' : 'CREATED'}`);
  console.log(`  staff: ${beforeStaff ? 'already existed' : 'CREATED'}`);

  if (!beforeRoles || !beforeUsers || !beforeStaff) {
    console.log('\nTables are ready. Restart the API server if it is running.');
    console.log('If login still fails, user accounts may need to be recreated (e.g. POST /api/auth/signup-super-admin).');
  }

  await promisePool.end();
}

main().catch(async (err) => {
  console.error('Failed:', err.message);
  try {
    await promisePool.end();
  } catch (_) {}
  process.exit(1);
});
