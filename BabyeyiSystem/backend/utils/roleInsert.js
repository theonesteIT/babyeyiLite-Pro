'use strict';

const { promisePool } = require('../config/database');

async function allocateNextRoleId(conn) {
  const [[row]] = await conn.query('SELECT COALESCE(MAX(id), 0) AS m FROM roles');
  return Number(row?.m || 0) + 1;
}

/**
 * Insert a role when missing. roles.id has no reliable AUTO_INCREMENT (legacy id=0 row).
 */
async function insertRoleIfMissing(
  { roleName, roleCode, description = '', permissions = '[]', isSystemRole = false },
  connIn,
) {
  const conn = connIn || promisePool;
  const [existing] = await conn.query('SELECT id FROM roles WHERE role_code = ? LIMIT 1', [roleCode]);
  if (existing.length) return existing[0].id;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const nextId = await allocateNextRoleId(conn);
    try {
      await conn.query(
        `INSERT INTO roles (id, role_name, role_code, description, permissions, is_active, is_system_role)
         VALUES (?, ?, ?, ?, ?, 1, ?)`,
        [nextId, roleName, roleCode, description, permissions, isSystemRole ? 1 : 0],
      );
      return nextId;
    } catch (err) {
      if (err.code === 'ER_DUP_ENTRY') {
        const [again] = await conn.query('SELECT id FROM roles WHERE role_code = ? LIMIT 1', [roleCode]);
        if (again.length) return again[0].id;
        if (attempt < 2) continue;
      }
      if (err.code === 'ER_LOCK_DEADLOCK' && attempt < 2) {
        await new Promise((r) => setTimeout(r, 50 * (attempt + 1)));
        continue;
      }
      throw err;
    }
  }
  return null;
}

module.exports = { allocateNextRoleId, insertRoleIfMissing };
