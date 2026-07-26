'use strict';

const { promisePool } = require('../config/database');
const { insertRoleIfMissing } = require('./roleInsert');
const { ensureRolesPrimaryKey } = require('./coreAuthSchema');

/**
 * Ensures the FULL_SYSTEM_CONTROLLER role exists (separate dashboard from SUPER_ADMIN).
 */
async function ensureFullSystemControllerRole() {
  try {
    await ensureRolesPrimaryKey();
    const id = await insertRoleIfMissing({
      roleName: 'Full System Controller',
      roleCode: 'FULL_SYSTEM_CONTROLLER',
      description: 'Platform-wide control — uses the System Controller dashboard (not the Super Admin UI)',
      permissions: '["*"]',
      isSystemRole: true,
    });
    if (id) {
      const [rows] = await promisePool.query(
        "SELECT id FROM roles WHERE role_code = 'FULL_SYSTEM_CONTROLLER' LIMIT 1",
      );
      if (rows.length === 1) {
        console.log('✅  Role FULL_SYSTEM_CONTROLLER ready');
      }
    }
  } catch (e) {
    console.error('⚠️  ensureFullSystemControllerRole:', e.message);
  }
}

module.exports = { ensureFullSystemControllerRole };
