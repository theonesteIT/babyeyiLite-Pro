'use strict';

const { promisePool } = require('../config/database');

/**
 * Ensures the FULL_SYSTEM_CONTROLLER role exists (separate dashboard from SUPER_ADMIN).
 */
async function ensureFullSystemControllerRole() {
  try {
    const [rows] = await promisePool.query(
      "SELECT id FROM roles WHERE role_code = 'FULL_SYSTEM_CONTROLLER' LIMIT 1"
    );
    if (rows.length) return;
    await promisePool.query(
      `INSERT INTO roles (role_name, role_code, description, permissions, is_active, is_system_role)
       VALUES (?, ?, ?, ?, 1, 1)`,
      [
        'Full System Controller',
        'FULL_SYSTEM_CONTROLLER',
        'Platform-wide control — uses the System Controller dashboard (not the Super Admin UI)',
        '["*"]',
      ]
    );
    console.log('✅  Role FULL_SYSTEM_CONTROLLER created');
  } catch (e) {
    console.error('⚠️  ensureFullSystemControllerRole:', e.message);
  }
}

module.exports = { ensureFullSystemControllerRole };
