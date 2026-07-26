/**

 * Remember which BabyeyiSystem login page to use after sign-out from the Pro app.

 * Must stay in sync with BabyeyiSystem/frontend/src/utils/postLogoutLoginPath.js

 */

const KEY = 'babyeyi_post_logout_login_path';



const LOGIN_PATH_LITE = '/login/lite';

const LOGIN_PATH_PRO = '/login/pro';

const LOGIN_PATH_OTHER = '/login/other';

const LOGIN_PATH_LEGACY = '/login';



const ALLOWED = new Set([LOGIN_PATH_LEGACY, LOGIN_PATH_LITE, LOGIN_PATH_PRO, LOGIN_PATH_OTHER]);



const OTHER_PORTAL_ROLES = new Set([

  'SUPER_ADMIN',

  'FULL_SYSTEM_CONTROLLER',

  'NESA_ADMIN',

  'DEO',

  'AGENT',

  'SHULE_AVANCE_PARTNER',

]);



const PLATFORM_PRO_ROLES = new Set(['SCHOOL_REPRESENTATIVE', 'NETWORK_REPRESENTATIVE']);



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

  UNIFORM_MANAGER: '/uniform-manager',

  ASSETS_MANAGER: '/assets',

  ASSET_MANAGER: '/assets',

  DISCIPLINE: '/discipline',

  DISCIPLINE_STAFF: '/discipline-staff',

  HEAD_OF_DISCIPLINE: '/discipline',

  TEACHER: '/teacher',

  HOD: '/teacher',

  GATE_OFFICER: '/gatekeeper',

  GATE_KEEPER: '/gatekeeper',

};



function shouldUseProApp(user) {

  if (!user) return false;

  const code = String(user.role?.code || user.role_code || '').toUpperCase();

  if (!ROLE_TO_PRO_PATH[code]) return false;

  if (PLATFORM_PRO_ROLES.has(code)) return true;

  const school = user.school;

  return school?.pro_access_effective === true || school?.pro_access_effective === 1;

}



/** All Pro portal sign-outs land on LoginPro (/login/pro). */
export function resolvePostLogoutLoginPath(_user) {
  return LOGIN_PATH_PRO;
}



export function setPostLogoutLoginPath(path) {

  if (path && ALLOWED.has(path)) {

    localStorage.setItem(KEY, path);

  } else {

    localStorage.removeItem(KEY);

  }

}



export function syncPostLogoutLoginPath(_user) {
  setPostLogoutLoginPath(LOGIN_PATH_PRO);
}



export function getPostLogoutLoginPath() {
  return LOGIN_PATH_PRO;
}



const DEFAULT_PLATFORM_ORIGIN = 'http://localhost:5173';



export function babyeyiPlatformOrigin() {

  const env = String(import.meta.env.VITE_BABYEYI_LOGIN_URL || `${DEFAULT_PLATFORM_ORIGIN}/login/pro`).trim();

  if (/^https?:\/\//i.test(env)) {

    const stripped = env.replace(/\/login\/?.*$/i, '').replace(/\/$/, '');

    return stripped || DEFAULT_PLATFORM_ORIGIN;

  }

  return DEFAULT_PLATFORM_ORIGIN;

}



/** Always returns an absolute URL (never a same-origin /login path that would stay under /pro). */

export function resolveBabyeyiLoginUrl() {

  const path = getPostLogoutLoginPath();

  const origin = babyeyiPlatformOrigin();

  return `${origin.replace(/\/$/, '')}${path}`;

}



export function getPostLogoutLoginUrl(platformOrigin) {

  const path = getPostLogoutLoginPath();

  const base = String(platformOrigin || '').replace(/\/$/, '');

  if (base && /^https?:\/\//i.test(base)) {

    return `${base}${path}`;

  }

  return resolveBabyeyiLoginUrl();

}



export function redirectToBabyeyiLogin() {

  window.location.assign(resolveBabyeyiLoginUrl());

}



const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:5100') + '/api';



/** Clear session cookie on API, then leave Pro for Babyeyi login. */

export async function performProLogout() {

  try {

    await fetch(`${API_BASE}/session/logout`, {

      method: 'POST',

      credentials: 'include',

      headers: { 'Content-Type': 'application/json' },

    });

  } catch (_) {

    /* still redirect — user must leave Pro even if API is unreachable */

  }

  window.location.assign(resolveBabyeyiLoginUrl());

}


