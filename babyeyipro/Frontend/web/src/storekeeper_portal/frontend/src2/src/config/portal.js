/**
 * Storekeeper portal — school store, inventory, stock management, issue & receive items.
 */
export const PORTAL = {
  id: 'storekeeper',
  /** NavLink prefix — mounted at /storekeeper/* */
  basePath: '/storekeeper',
  sessionKey: 'storekeeper_logged_in',
  documentTitle: 'Babyeyi · Storekeeper',
  loadingMessage: 'Loading Store Portal…',
  brandLine: 'School store & inventory',
  roleLabel: 'Storekeeper',
  loginBadge: 'Store Portal | Secure',
  loginEyebrow: 'School stores',
  loginTitle: 'Babyeyi',
  loginHeroLine:
    'Manage school inventory, process requisitions, track stock levels, and record all goods received and issued.',
  loginHeroHighlight: 'Store team',
  loginFormTitle: 'Store portal',
  loginFormSubtitle: 'Sign in to manage inventory, stock, and requisitions.',
  emailLabel: 'Work email',
  emailPlaceholder: 'store@school.rw',
  profileFallback: 'Storekeeper',
  heroImage: '/teacher.jpg',
  heroImageAlt: 'School',
  searchPlaceholder: 'Search items, categories…',
  copy: {
    requisitionsExplainer:
      'Requisitions from departments arrive here for processing. Review each request, confirm stock availability, and issue items or flag shortfalls.',
  },
};
