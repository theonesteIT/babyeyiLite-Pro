'use strict';

/** Aligned with express-session cookie in server.js (default browser session length). */
const SESSION_DEFAULT_MS = 8 * 60 * 60 * 1000;
const SESSION_REMEMBER_MS = 30 * 24 * 60 * 60 * 1000;

function parseRememberMe(body = {}) {
  const v = body.remember_me ?? body.rememberMe;
  if (v === true || v === 1) return true;
  if (typeof v === 'string') {
    const s = v.trim().toLowerCase();
    return s === '1' || s === 'true' || s === 'yes' || s === 'on';
  }
  return false;
}

/**
 * Sets session cookie maxAge for this session. Call inside the session.regenerate
 * callback (after regenerate succeeds) or before session.save when reusing the session.
 */
function applyRememberMeToSession(req, body) {
  if (!req.session || !req.session.cookie) return;
  req.session.cookie.maxAge = parseRememberMe(body) ? SESSION_REMEMBER_MS : SESSION_DEFAULT_MS;
}

module.exports = {
  parseRememberMe,
  applyRememberMeToSession,
  SESSION_DEFAULT_MS,
  SESSION_REMEMBER_MS,
};
