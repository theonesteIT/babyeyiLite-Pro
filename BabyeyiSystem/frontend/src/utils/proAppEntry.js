/**
 * Babyeyi Pro (babyeyipro unified web) entry URLs — same API session as Lite.
 * VITE_PRO_APP_URL = origin only, e.g. http://localhost:5174
 */

const PRO_BASE = (import.meta.env.VITE_PRO_APP_URL || '').replace(/\/$/, '');

/** Roles that use a Pro portal path (must match babyeyipro PortalGate). */
const ROLE_TO_PRO_PATH = {
  SCHOOL_ADMIN: '/manager',
  SCHOOL_MANAGER: '/manager',
  SCHOOL_REPRESENTATIVE: '/representative',
  NETWORK_REPRESENTATIVE: '/representative',
  ACCOUNTANT: '/accountant',
  DOS: '/dos',
  LIBRARIAN: '/librarian',
  STOREKEEPER: '/storekeeper',
  STORE_MANAGER: '/storekeeper',
  DISCIPLINE: '/discipline',
  DISCIPLINE_STAFF: '/discipline-staff',
  HEAD_OF_DISCIPLINE: '/discipline',
  TEACHER: '/teacher',
  HOD: '/teacher',
  GATE_OFFICER: '/gatekeeper',
  GATE_KEEPER: '/gatekeeper',
};

/**
 * Platform-wide Pro roles that are NOT bound to a single school.
 * These users (e.g. school representatives overseeing many schools)
 * always have Pro access regardless of any one school's subscription
 * because they operate at network / national level.
 */
const PLATFORM_PRO_ROLES = new Set([
  'SCHOOL_REPRESENTATIVE',
  'NETWORK_REPRESENTATIVE',
]);

export function isPlatformProRole(roleCode) {
  if (!roleCode) return false;
  return PLATFORM_PRO_ROLES.has(String(roleCode).toUpperCase());
}

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
  const code = user.role?.code || user.role_code;
  if (!getProPortalPathForRole(code)) return false;
  // Platform-wide roles (representatives) are not tied to a single school's
  // subscription — they always go to their Pro portal.
  if (isPlatformProRole(code)) return true;
  const school = user.school;
  const pro =
    school?.pro_access_effective === true || school?.pro_access_effective === 1;
  return !!pro;
}

export function hasProBaseUrl() {
  return !!PRO_BASE;
}
