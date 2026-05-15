/**
 * After sign-out (or session loss), send users back to the same entry they used to sign in:
 * Lite portal → /login/lite, Pro school-manager → /login/pro, default staff → /login.
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
  return v && ALLOWED.has(v) ? v : '/login';
}
