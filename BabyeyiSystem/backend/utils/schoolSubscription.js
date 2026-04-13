'use strict';

/**
 * Master DB (babyeyi) subscription helpers — plan + Pro window + module map.
 */

function computeProAccessEffective(row) {
  if (!row) return false;
  const end = row.pro_end_date ? new Date(row.pro_end_date) : null;
  if (end && !Number.isNaN(end.getTime()) && end < new Date()) return false;

  const plan = String(row.subscription_plan || 'lite').toLowerCase();
  if (plan !== 'pro') return false;
  // Pro plan: on by default; only `pro_enabled = 0` opts out (no need to set pro_enabled = 1).
  if (row.pro_enabled != null && Number(row.pro_enabled) === 0) return false;
  return true;
}

/**
 * Block login when new school_status is inactive/suspended, or legacy status is not active.
 */
function isSchoolAccessBlocked(accessStatus, legacyStatus) {
  const a = String(accessStatus || 'active').toLowerCase();
  if (a === 'suspended' || a === 'inactive') return true;
  const l = String(legacyStatus || '').toLowerCase();
  if (l === 'pending' || l === 'inactive' || l === 'suspended') return true;
  return false;
}

async function loadSchoolModules(promisePool, schoolId) {
  if (!schoolId) return {};
  try {
    const [rows] = await promisePool.query(
      `SELECT module_key, is_enabled FROM school_module_access WHERE school_id = ?`,
      [schoolId]
    );
    const out = {};
    for (const r of rows || []) {
      out[r.module_key] = Number(r.is_enabled) === 1;
    }
    return out;
  } catch (e) {
    if (String(e.message || '').includes('school_module_access')) return {};
    throw e;
  }
}

async function loadPermissionKeysForRole(promisePool, roleId) {
  if (!roleId) return [];
  try {
    const [rows] = await promisePool.query(
      `SELECT permission_key FROM role_permissions WHERE role_id = ?`,
      [roleId]
    );
    return (rows || []).map(r => r.permission_key);
  } catch (e) {
    if (String(e.message || '').includes('role_permissions')) return [];
    throw e;
  }
}

function mergeLegacyRolePermissionsJson(rolePermissionsJson, keysFromTable) {
  const fromTable = new Set(keysFromTable || []);
  if (rolePermissionsJson != null && rolePermissionsJson !== '') {
    try {
      const parsed = typeof rolePermissionsJson === 'string' ? JSON.parse(rolePermissionsJson) : rolePermissionsJson;
      if (Array.isArray(parsed)) {
        parsed.forEach(k => fromTable.add(k));
      }
    } catch (_) {}
  }
  return [...fromTable];
}

function roleHasPermissionKey(permissionKeys, requiredKey) {
  if (!requiredKey) return true;
  if (!permissionKeys || !permissionKeys.length) return false;
  if (permissionKeys.includes('*')) return true;
  return permissionKeys.includes(requiredKey);
}

module.exports = {
  computeProAccessEffective,
  isSchoolAccessBlocked,
  loadSchoolModules,
  loadPermissionKeysForRole,
  mergeLegacyRolePermissionsJson,
  roleHasPermissionKey,
};
