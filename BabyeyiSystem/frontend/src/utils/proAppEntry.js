/**
 * Babyeyi Pro (babyeyipro unified web) entry URLs — same API session as Lite.
 * VITE_PRO_APP_URL = origin only, e.g. http://localhost:5174
 */

const PRO_BASE = (import.meta.env.VITE_PRO_APP_URL || '').replace(/\/$/, '');

/** Roles that use a Pro portal path (must match babyeyipro PortalGate). */
const ROLE_TO_PRO_PATH = {
  SCHOOL_ADMIN: '/manager',
  SCHOOL_MANAGER: '/manager',
  ACCOUNTANT: '/accountant',
  DOS: '/dos',
  LIBRARIAN: '/librarian',
  STOREKEEPER: '/storekeeper',
  STORE_MANAGER: '/storekeeper',
  DISCIPLINE_STAFF: '/discipline-staff',
  TEACHER: '/teacher',
  HOD: '/teacher',
  GATE_OFFICER: '/gatekeeper',
  GATE_KEEPER: '/gatekeeper',
};

export function getProPortalPathForRole(roleCode) {
  if (!roleCode) return null;
  return ROLE_TO_PRO_PATH[String(roleCode).toUpperCase()] || null;
}

export function getProEntryUrl(roleCode) {
  if (!PRO_BASE) return null;
  const path = getProPortalPathForRole(roleCode);
  if (!path) return null;
  return `${PRO_BASE}${path}`;
}

export function shouldUseProApp(user) {
  if (!user || !PRO_BASE) return false;
  const school = user.school;
  const pro =
    school?.pro_access_effective === true || school?.pro_access_effective === 1;
  if (!pro) return false;
  const code = user.role?.code || user.role_code;
  return !!getProPortalPathForRole(code);
}

export function hasProBaseUrl() {
  return !!PRO_BASE;
}
