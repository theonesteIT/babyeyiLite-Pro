import { PORTAL } from '../../../config/portal';

/** Mounted under `/dos/student-marks-reports/*` */
export const STUDENT_MARKS_REPORTS_BASE = `${PORTAL.basePath}/student-marks-reports`;

export function smr(page = 'dashboard') {
  const segment = page === 'dashboard' || page === '' ? 'dashboard' : String(page).replace(/^\//, '');
  return `${STUDENT_MARKS_REPORTS_BASE}/${segment}`;
}

export function marksReportsPageKey(pathname = '') {
  const prefix = `${STUDENT_MARKS_REPORTS_BASE}/`;
  if (!pathname.startsWith(prefix)) {
    if (pathname === STUDENT_MARKS_REPORTS_BASE || pathname === `${STUDENT_MARKS_REPORTS_BASE}/`) {
      return 'dashboard';
    }
    return '';
  }
  const rest = pathname.slice(prefix.length).split('/')[0];
  return rest || 'dashboard';
}
