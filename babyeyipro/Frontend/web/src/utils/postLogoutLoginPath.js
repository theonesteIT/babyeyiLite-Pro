/**
 * Remember which BabyeyiSystem login page to use after sign-out from the Pro app.
 * Must stay in sync with BabyeyiSystem/frontend/src/utils/postLogoutLoginPath.js
 */
const KEY = 'babyeyi_post_logout_login_path';

const ALLOWED = new Set(['/login', '/login/lite', '/login/pro']);

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

export function getPostLogoutLoginUrl(platformOrigin) {
  const path = getPostLogoutLoginPath();
  const base = String(platformOrigin || '').replace(/\/$/, '') || '';
  return base ? `${base}${path}` : path;
}

export function babyeyiPlatformOrigin() {
  const env = String(import.meta.env.VITE_BABYEYI_LOGIN_URL || 'http://localhost:5173/login/pro').trim();
  return env.replace(/\/login\/?.*$/i, '') || 'http://localhost:5173';
}

export function redirectToBabyeyiLogin() {
  window.location.href = getPostLogoutLoginUrl(babyeyiPlatformOrigin());
}
