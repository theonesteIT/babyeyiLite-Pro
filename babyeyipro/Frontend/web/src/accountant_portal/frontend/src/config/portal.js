/**
 * Accountant portal — fees, invoices, expenses, payroll.
 */
export const PORTAL = {
  id: 'accountant',
  /** localStorage key for this app (legacy key still accepted in AuthContext for migration) */
  sessionKey: 'accountant_logged_in',
  documentTitle: 'Babyeyi · Accountant',
  loadingMessage: 'Loading Accountant Portal…',
  brandLine: 'Finance & accounting',
  roleLabel: 'Accountant',
  loginBadge: 'Accountant Portal | Secure',
  loginEyebrow: 'Finance office',
  loginTitle: 'Babyeyi',
  loginHeroLine:
    'Track fees, invoices, requisitions, payroll, and expenses with school-wide visibility and clear audit trails.',
  loginHeroHighlight: 'Finance team',
  loginFormTitle: 'Accountant portal',
  loginFormSubtitle: 'Sign in to manage fees, invoices, payroll and expenses.',
  emailLabel: 'Work email',
  emailPlaceholder: 'accountant@school.rw',
  profileFallback: 'Accountant',
  /** Shared hero banner (replace file in public/ if you add a dedicated asset) */
  heroImage: '/teacher.jpg',
  heroImageAlt: 'School',
  searchPlaceholder: 'Search learners, tools…',

  /**
   * Oversight-only: UI shows saved rolls from teachers; HoD cannot POST attendance (enforced in API).
   */
  attendanceReadOnly: true,

  /**
   * Teacher portal and school manager share the same academic data (timetables, attendance logs).
   * These lines explain how discipline staff should read “teacher-looking” screens.
   */
  copy: {
    attendanceExplainer:
      'Attendance data is shared across the system. In the accountant portal, it is typically used for context and reporting, not daily roll-calling.',
    timetableExplainer:
      'Timetable data is shared across the system. In the accountant portal, it is provided for operational awareness and cross-checks.',
    dashboardTodaySchedule:
      'Today’s schedule is system-wide context for coordination and reporting.',
    conductSettingsExplainer:
      'This portal focuses on finance modules. Conduct settings are managed by discipline leadership.',
  },
};
