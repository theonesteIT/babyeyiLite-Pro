/**
 * Lite staff home routes — used by Login and portal guards.
 */

export const LITE_DISCIPLINE_HOME = '/lite/discipline';

export const LITE_DISCIPLINE_ROLE_CODES = new Set([
  'DISCIPLINE',
  'DISCIPLINE_STAFF',
  'HEAD_OF_DISCIPLINE',
]);

/** Roles that only get Shule Avance (cashout/deals), not a full department portal. */
export const LITE_SHULE_AVANCE_ONLY = new Set([
  'HOD',
  'LIBRARIAN',
  'STORE_MANAGER',
  'STOREKEEPER',
  'GATE_OFFICER',
  'GATE_KEEPER',
  'SECRETARY',
  'HR',
]);

export const LITE_ROLE_HOME = {
  DOS: '/lite/dos',
  ACCOUNTANT: '/lite/accountant',
  DISCIPLINE: LITE_DISCIPLINE_HOME,
  DISCIPLINE_STAFF: LITE_DISCIPLINE_HOME,
  HEAD_OF_DISCIPLINE: LITE_DISCIPLINE_HOME,
};

function roleNameLooksLikeDiscipline(name) {
  const n = String(name || '').toUpperCase();
  return /\b(HEAD\s+OF\s+)?DISCIPLINE\b/.test(n) || /\bDOD\b/.test(n);
}

/**
 * True when this user should use the Lite conduct portal (not Shule Avance-only shell).
 * Handles mis-assigned HOD role_code when role_name is still "Head of Discipline".
 */
export function isLiteDisciplineStaff(user) {
  if (!user || user === false) return false;
  const code = String(user?.role?.code || user?.role_code || '').toUpperCase();
  if (LITE_DISCIPLINE_ROLE_CODES.has(code)) return true;
  const name = user?.role?.name || user?.role_name || '';
  return roleNameLooksLikeDiscipline(name);
}

export function getLiteStaffHomePath(roleCode, user) {
  const rc = String(roleCode || '').toUpperCase();
  if (isLiteDisciplineStaff(user)) return LITE_DISCIPLINE_HOME;
  if (LITE_ROLE_HOME[rc]) return LITE_ROLE_HOME[rc];
  if (LITE_SHULE_AVANCE_ONLY.has(rc)) return '/lite/shule-avance';
  return null;
}
