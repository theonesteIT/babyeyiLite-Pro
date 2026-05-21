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

/** Pro module keys unlocked when a Lite school is upgraded (same DB — data is retained). */
const PRO_SCHOOL_MODULE_KEYS = [
  'students',
  'staff',
  'attendance',
  'marks',
  'finance',
  'accounting',
  'library',
  'store',
  'discipline',
  'gate',
  'payroll',
  'requisitions',
  'timetable',
  'hr',
  'reports',
  'admissions',
  'parents',
  'budget',
  'shule_avance',
];

async function safeCount(pool, sql, params) {
  try {
    const [[row]] = await pool.query(sql, params);
    return Number(row?.cnt ?? row?.total ?? 0);
  } catch (e) {
    if (String(e.message || '').includes("doesn't exist")) return null;
    throw e;
  }
}

/**
 * Counts existing school records so Super Admin can confirm Lite data carries into Pro.
 */
async function getSchoolDataRetentionSummary(pool, schoolId) {
  if (!schoolId) return {};
  const summary = {
    students: await safeCount(
      pool,
      'SELECT COUNT(*) AS cnt FROM students WHERE school_id = ?',
      [schoolId]
    ),
    staff: await safeCount(
      pool,
      'SELECT COUNT(*) AS cnt FROM staff WHERE school_id = ?',
      [schoolId]
    ),
    staff_users: await safeCount(
      pool,
      `SELECT COUNT(*) AS cnt FROM users u
       INNER JOIN staff st ON st.user_id = u.id
       WHERE st.school_id = ? AND u.deleted_at IS NULL`,
      [schoolId]
    ),
    period_attendance: await safeCount(
      pool,
      'SELECT COUNT(*) AS cnt FROM teacher_period_attendance WHERE school_id = ?',
      [schoolId]
    ),
    gate_attendance: await safeCount(
      pool,
      'SELECT COUNT(*) AS cnt FROM school_gate_attendance_records WHERE school_id = ?',
      [schoolId]
    ),
    shule_avance_requests: await safeCount(
      pool,
      'SELECT COUNT(*) AS cnt FROM shule_avance_requests WHERE school_id = ?',
      [schoolId]
    ),
  };
  return Object.fromEntries(
    Object.entries(summary).filter(([, v]) => v != null)
  );
}

/**
 * When upgrading Lite → Pro, enable platform modules (data already keyed by school_id).
 */
async function enableAllProModulesForSchool(pool, schoolId) {
  if (!schoolId) return;
  for (const moduleKey of PRO_SCHOOL_MODULE_KEYS) {
    await pool.query(
      `INSERT INTO school_module_access (school_id, module_key, is_enabled)
       VALUES (?, ?, 1)
       ON DUPLICATE KEY UPDATE is_enabled = 1, updated_at = NOW()`,
      [schoolId, moduleKey]
    ).catch((e) => {
      if (String(e.message || '').includes('school_module_access')) return;
      throw e;
    });
  }
}

/**
 * Run after subscription changes: unlock Pro modules when school gains effective Pro access.
 * @returns {{ upgraded_from_lite: boolean, data_retained: object|null }}
 */
async function applyProUpgradeSideEffects(pool, schoolId, beforeRow, afterRow) {
  const wasPro = computeProAccessEffective(beforeRow);
  const isProNow = computeProAccessEffective(afterRow);
  if (wasPro || !isProNow) {
    return { upgraded_from_lite: false, data_retained: null };
  }
  await enableAllProModulesForSchool(pool, schoolId);
  const data_retained = await getSchoolDataRetentionSummary(pool, schoolId);
  return { upgraded_from_lite: true, data_retained };
}

module.exports = {
  computeProAccessEffective,
  isSchoolAccessBlocked,
  loadSchoolModules,
  loadPermissionKeysForRole,
  mergeLegacyRolePermissionsJson,
  roleHasPermissionKey,
  PRO_SCHOOL_MODULE_KEYS,
  enableAllProModulesForSchool,
  getSchoolDataRetentionSummary,
  applyProUpgradeSideEffects,
};
