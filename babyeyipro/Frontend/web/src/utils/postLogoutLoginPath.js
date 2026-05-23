/**
 * Remember which BabyeyiSystem login page to use after sign-out from the Pro app.
 * Must stay in sync with BabyeyiSystem/frontend/src/utils/postLogoutLoginPath.js
 */
const KEY = 'babyeyi_post_logout_login_path';

const ALLOWED = new Set(['/login', '/login/lite', '/login/pro']);

const DEFAULT_PLATFORM_ORIGIN = 'http://localhost:5173';

export function setPostLogoutLoginPath(path) {
  if (path && ALLOWED.has(path)) {
    localStorage.setItem(KEY, path);
  } else {
    localStorage.removeItem(KEY);
  }
}

export function getPostLogoutLoginPath() {
  const v = localStorage.getItem(KEY);
  return v && ALLOWED.has(v) ? v : '/login/pro';
}

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
