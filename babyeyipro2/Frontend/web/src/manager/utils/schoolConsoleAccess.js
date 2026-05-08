/**
 * Full school console (ported Lite toolkit at /manager/school-console).
 * Visible when the school has effective Pro access OR the user has the explicit permission.
 */
export const SCHOOL_CONSOLE_PERMISSION = 'pro.school_console.access'

export function canAccessSchoolConsole(sessionUser) {
  if (!sessionUser || sessionUser === false) return false
  const school = sessionUser.school
  const pro =
    school &&
    (school.pro_access_effective === true || school.pro_access_effective === 1)
  const keys = Array.isArray(sessionUser.permission_keys) ? sessionUser.permission_keys : []
  const keyOk =
    keys.includes('*') ||
    keys.includes(SCHOOL_CONSOLE_PERMISSION)
  return !!(pro || keyOk)
}
