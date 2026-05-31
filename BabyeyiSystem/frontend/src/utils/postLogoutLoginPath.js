/**
 * After sign-out (or session loss), send users back to the portal they belong to:
 * Other (Agent, DEO, NESA, Super Admin…) → /login/other
 * Babyeyi Pro → /login/pro
 * Babyeyi Lite → /login/lite
 */
import { shouldUseProApp } from './proAppEntry';
import { isOtherPortalRole, OTHER_PORTAL_LOGIN_PATH } from './otherPortalEntry';
import {
  getLiteStaffHomePath,
  isLiteDisciplineStaff,
  LITE_SHULE_AVANCE_ONLY,
} from './liteStaffEntry';
import { shouldUseTeacherPortal } from './teacherPortalEntry';

const KEY = 'babyeyi_post_logout_login_path';

export const LOGIN_PATH_LITE = '/login/lite';
export const LOGIN_PATH_PRO = '/login/pro';
export const LOGIN_PATH_OTHER = OTHER_PORTAL_LOGIN_PATH;
export const LOGIN_PATH_LEGACY = '/login';

const ALLOWED = new Set([
  LOGIN_PATH_LEGACY,
  LOGIN_PATH_LITE,
  LOGIN_PATH_PRO,
  LOGIN_PATH_OTHER,
]);

/** Resolve login page from session user (role + school Pro flag). */
export function resolvePostLogoutLoginPath(user) {
  if (!user || user === false) return null;
  const roleCode = String(user.role?.code || user.role_code || '').toUpperCase();

  if (isOtherPortalRole(roleCode)) {
    return LOGIN_PATH_OTHER;
  }

  if (shouldUseProApp(user)) {
    return LOGIN_PATH_PRO;
  }

  if (
    shouldUseTeacherPortal(user, roleCode)
    || getLiteStaffHomePath(roleCode, user)
    || LITE_SHULE_AVANCE_ONLY.has(roleCode)
    || isLiteDisciplineStaff(user)
  ) {
    return LOGIN_PATH_LITE;
  }

  if (roleCode === 'SCHOOL_ADMIN' || roleCode === 'SCHOOL_MANAGER') {
    return LOGIN_PATH_LITE;
  }

  if (roleCode === 'PARENT' || roleCode === 'STUDENT') {
    return '/parents/login';
  }

  return LOGIN_PATH_LITE;
}

export function setPostLogoutLoginPath(path) {
  if (path && ALLOWED.has(path)) {
    localStorage.setItem(KEY, path);
  } else if (path === '/parents/login') {
    localStorage.setItem(KEY, path);
  } else {
    localStorage.removeItem(KEY);
  }
}

/** Persist the correct login URL for this user (call after login or session/me). */
export function syncPostLogoutLoginPath(user) {
  const path = resolvePostLogoutLoginPath(user);
  if (path) setPostLogoutLoginPath(path);
}

export function getPostLogoutLoginPath() {
  const v = localStorage.getItem(KEY);
  if (v === '/parents/login') return v;
  return v && ALLOWED.has(v) ? v : LOGIN_PATH_LITE;
}

/** Full URL for cross-app logout (e.g. babyeyipro → BabyeyiSystem login). */
export function getPostLogoutLoginUrl(platformOrigin) {
  const path = getPostLogoutLoginPath();
  const base = String(platformOrigin || '').replace(/\/$/, '') || '';
  return base ? `${base}${path}` : path;
}

/** Same-origin redirect after session loss (lite DOS / accountant portals). */
export function redirectToBabyeyiLogin() {
  const path = getPostLogoutLoginPath();
  if (typeof window !== 'undefined') {
    window.location.assign(path.startsWith('/') ? path : `/${path}`);
  }
}
