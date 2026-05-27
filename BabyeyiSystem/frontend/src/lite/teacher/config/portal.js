/**
 * Teacher portal configuration shared across teacher-facing screens.
 */
export const PORTAL = {
  id: 'teacher',
  /** In-app routes under BabyeyiSystem (/lite/teacher/*) */
  basePath: '/lite/teacher',
  sessionKey: 'teacher_logged_in',
  documentTitle: 'Babyeyi · Shule Teacher',
  loadingMessage: 'Loading Shule Teacher...',
  brandLine: 'Teaching & classroom delivery',
  roleLabel: 'Shule Teacher',
  loginBadge: 'Shule Teacher | Secure',
  loginEyebrow: 'Educators workspace',
  loginTitle: 'Babyeyi',
  loginHeroLine:
    'Plan lessons, manage classroom records, and stay on top of academic delivery with focused teaching tools.',
  loginHeroHighlight: 'Teaching team',
  loginFormTitle: 'Shule Teacher',
  loginFormSubtitle: 'Sign in to manage classes, marks, attendance, and teaching tasks.',
  emailLabel: 'Teacher email',
  emailPlaceholder: 'teacher@school.rw',
  profileFallback: 'Teacher',
  heroImage: '/teacher.jpg',
  heroImageAlt: 'Shule Teacher',
  searchPlaceholder: 'Search classes, learners, tools...',
  copy: {
    tichaAiExplainer:
      'Use TichaAI to draft teaching plans, parent communication, summaries, and practical classroom support content.',
  },
};
