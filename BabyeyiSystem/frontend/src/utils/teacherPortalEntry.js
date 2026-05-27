/**
 * Lite-school teacher portal — in-app at /lite/teacher (same session as BabyeyiSystem).
 */

import { shouldUseProApp } from './proAppEntry';

const LITE_TEACHER_BASE = '/lite/teacher';

export function getTeacherPortalUrl(path = '') {
  const p = path && !path.startsWith('/') ? `/${path}` : path || '';
  return `${LITE_TEACHER_BASE}${p}`;
}

/** True when path is in-app (not external origin). */
export function isInternalTeacherPortalUrl(url) {
  return url && !/^https?:\/\//i.test(url);
}

/** Lite-school teachers use full teacher portal; Pro schools use babyeyipro /teacher. */
export function shouldUseTeacherPortal(user, roleCode) {
  if (!user) return false;
  if (String(roleCode || '').toUpperCase() !== 'TEACHER') return false;
  if (shouldUseProApp(user)) return false;
  return true;
}

export function hasTeacherPortalBaseUrl() {
  return true;
}
