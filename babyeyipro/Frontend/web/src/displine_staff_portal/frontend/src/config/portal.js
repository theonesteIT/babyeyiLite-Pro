/**
 * Discipline / Head of Discipline portal — student conduct & behaviour.
 */
export const PORTAL = {
  id: 'discipline',
  /** localStorage key for this app (legacy teacher portal key still accepted in AuthContext for migration) */
  sessionKey: 'conduct_staff_logged_in',
  documentTitle: 'Babyeyi · Conduct',
  loadingMessage: 'Loading Conduct Portal…',
  brandLine: 'Student conduct',
  roleLabel: 'Head of discipline',
  loginBadge: 'Conduct Portal | Secure',
  loginEyebrow: 'Student affairs',
  loginTitle: 'Babyeyi',
  loginHeroLine:
    'Track learner conduct, log incidents, and keep behaviour standards visible alongside attendance and marks.',
  loginHeroHighlight: 'Discipline team',
  loginFormTitle: 'Conduct portal',
  loginFormSubtitle: 'Sign in to manage behaviour and discipline records.',
  emailLabel: 'Work email',
  emailPlaceholder: 'discipline@school.rw',
  profileFallback: 'Conduct staff',
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
      'Periods and classes come from the same academic timetable teachers use. This screen is read-only for Head of discipline: you see the roll teachers have saved for that date and period (when available), plus approved leave windows. Recording attendance is blocked for your role server-side — use Student permissions to approve excused time, and ask class teachers to correct rolls if needed.',
    timetableExplainer:
      'Read-only view of the school’s published timetable (for HoD / DOS roles: all periods). Use it for duty rounds, knowing where classes should be, and coordinating movement — not as “your” teaching timetable. Adding or changing periods is done in school manager / academic configuration.',
    dashboardTodaySchedule:
      'Today’s school-wide periods: orientation for duties, corridor checks, and knowing where teaching blocks run. It is not your personal lesson list.',
    conductSettingsExplainer:
      'Administrative setting only: the maximum conduct marks each learner starts with. Daily cases and deductions are on Learners & discipline and Conduct reports.',
  },
};
