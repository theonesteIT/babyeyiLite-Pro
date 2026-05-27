import { PORTAL } from '../../../config/portal';

/** Mounted under `/dos/student-promotion/*` */
export const STUDENT_PROMOTION_BASE = `${PORTAL.basePath}/student-promotion`;

/**
 * Build a DOS student-promotion path (e.g. sp('promote-class') → /dos/student-promotion/promote-class).
 */
export function sp(page = 'dashboard') {
  const segment = page === 'dashboard' || page === '' ? 'dashboard' : String(page).replace(/^\//, '');
  return `${STUDENT_PROMOTION_BASE}/${segment}`;
}

/** Match current location to a promotion sub-page key. */
export function promotionPageKey(pathname = '') {
  const prefix = `${STUDENT_PROMOTION_BASE}/`;
  if (!pathname.startsWith(prefix)) {
    if (pathname === STUDENT_PROMOTION_BASE || pathname === `${STUDENT_PROMOTION_BASE}/`) {
      return 'dashboard';
    }
    return '';
  }
  const rest = pathname.slice(prefix.length).split('/')[0];
  return rest || 'dashboard';
}
