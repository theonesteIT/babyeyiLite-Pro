/**
 * Lite schools (no effective Pro) — teachers use the same full portal as Pro schools.
 */

export const LITE_TEACHER_HOME = '/';

export function isLiteSchoolTeacher(teacher) {
  if (!teacher) return false;
  const school = teacher.school;
  if (!school) return false;
  const pro =
    school.pro_access_effective === true || school.pro_access_effective === 1;
  return !pro;
}

/** All authenticated teacher routes are available on Lite. */
export function isLiteTeacherPathAllowed() {
  return true;
}
