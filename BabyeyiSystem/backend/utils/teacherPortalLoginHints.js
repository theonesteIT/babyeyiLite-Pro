'use strict';

/** Known seed accounts — DOS can show these on teacher cards for portal login */
const SEED_EMAIL_HINTS = [
  { suffix: '@wisdom-p5-seed.local', password: 'Wisdom2026', label: 'Wisdom P5 seed' },
  { suffix: '@timetable-seed.local', password: 'Timetable123', label: 'Timetable demo seed' },
  { suffix: '@wisdom-seed.local', password: 'Wisdom2026', label: 'Wisdom seed' },
];

function portalLoginHintForEmail(email) {
  const e = String(email || '').trim().toLowerCase();
  if (!e) return null;
  for (const row of SEED_EMAIL_HINTS) {
    if (e.endsWith(row.suffix)) {
      return { password: row.password, seed_label: row.label };
    }
  }
  return null;
}

function enrichTeacherPortalLogin(row) {
  const hint = portalLoginHintForEmail(row.email);
  return {
    ...row,
    portal_login_email: row.email || null,
    portal_login_password: hint?.password || null,
    portal_login_seed: hint?.seed_label || null,
  };
}

module.exports = {
  SEED_EMAIL_HINTS,
  portalLoginHintForEmail,
  enrichTeacherPortalLogin,
};
