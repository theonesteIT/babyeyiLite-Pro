/**
 * Partner & platform admin portal — roles that sign in without a school code.
 */

export const OTHER_PORTAL_LOGIN_PATH = '/login/other';

export const OTHER_PORTAL_ROLES = new Set([
  'SUPER_ADMIN',
  'FULL_SYSTEM_CONTROLLER',
  'NESA_ADMIN',
  'DEO',
  'AGENT',
  'SHULE_AVANCE_PARTNER',
]);

export function isOtherPortalRole(roleCode) {
  return OTHER_PORTAL_ROLES.has(String(roleCode || '').toUpperCase());
}

export const OTHER_PORTAL_ROLE_CHIPS = [
  { key: 'superAdmin', label: 'Super Admin' },
  { key: 'agent', label: 'Agent' },
  { key: 'deo', label: 'DEO' },
  { key: 'nesa', label: 'NESA Admin' },
  { key: 'avance', label: 'Shule Avance' },
];
