'use strict';

const { promisePool } = require('../config/database');

let webPush = null;
let vapidConfigured = false;
let tableReady = false;

function loadWebPush() {
  if (!webPush) {
    try {
      webPush = require('web-push');
    } catch (e) {
      return null;
    }
  }
  return webPush;
}

function resolveVapidSubject() {
  const explicit = trimStr(process.env.VAPID_SUBJECT);
  if (explicit) return explicit;
  const smtpUser = trimStr(process.env.SMTP_USER);
  if (smtpUser && smtpUser.includes('@')) {
    return smtpUser.startsWith('mailto:') ? smtpUser : `mailto:${smtpUser}`;
  }
  const smtpFrom = trimStr(process.env.SMTP_FROM);
  const fromMatch = smtpFrom.match(/<([^>]+@[^>]+)>/);
  if (fromMatch?.[1]) return `mailto:${fromMatch[1].trim()}`;
  return 'mailto:admin@localhost';
}

function trimStr(v) {
  return String(v ?? '').trim();
}

function configureVapid() {
  if (vapidConfigured) return true;
  const wp = loadWebPush();
  if (!wp) return false;
  const pub = process.env.VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  const sub = resolveVapidSubject();
  if (!pub || !priv) return false;
  wp.setVapidDetails(sub, pub, priv);
  vapidConfigured = true;
  return true;
}

async function ensureWebPushTable() {
  if (tableReady) return;
  await promisePool.query(`
    CREATE TABLE IF NOT EXISTS web_push_subscriptions (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      user_id INT UNSIGNED NOT NULL,
      endpoint VARCHAR(2048) NOT NULL,
      p256dh VARCHAR(255) NOT NULL,
      auth VARCHAR(255) NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_web_push_endpoint (endpoint(512)),
      KEY idx_web_push_user (user_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  tableReady = true;
}

function isWebPushConfigured() {
  return !!(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
}

function getVapidPublicKey() {
  return process.env.VAPID_PUBLIC_KEY || '';
}

async function upsertSubscription(userId, subscription) {
  await ensureWebPushTable();
  const endpoint = String(subscription?.endpoint || '');
  const keys = subscription?.keys || {};
  const p256dh = String(keys.p256dh || '');
  const auth = String(keys.auth || '');
  if (!endpoint || !p256dh || !auth) {
    const err = new Error('Invalid push subscription');
    err.status = 400;
    throw err;
  }
  await promisePool.query(
    `INSERT INTO web_push_subscriptions (user_id, endpoint, p256dh, auth)
     VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE user_id = VALUES(user_id), p256dh = VALUES(p256dh), auth = VALUES(auth), updated_at = NOW()`,
    [userId, endpoint.slice(0, 2048), p256dh, auth]
  );
}

async function removeSubscription(userId, endpoint) {
  await ensureWebPushTable();
  const ep = String(endpoint || '').slice(0, 2048);
  if (!ep) return;
  await promisePool.query(`DELETE FROM web_push_subscriptions WHERE user_id = ? AND endpoint = ?`, [userId, ep]);
}

/**
 * @param {number} userId
 * @param {{ title?: string, body?: string, tag?: string, url?: string }} payload
 */
async function sendWebPushToUser(userId, payload) {
  if (!configureVapid()) return;
  const wp = loadWebPush();
  if (!wp) return;
  await ensureWebPushTable();
  const [rows] = await promisePool.query(
    `SELECT endpoint, p256dh, auth FROM web_push_subscriptions WHERE user_id = ?`,
    [userId]
  );
  if (!rows?.length) return;

  const body = JSON.stringify({
    title: payload.title || 'Ticha Avance',
    body: payload.body || '',
    tag: payload.tag || 'ticha-avance',
    url: payload.url || '/shule-avance',
  });

  for (const row of rows) {
    const sub = {
      endpoint: row.endpoint,
      keys: { p256dh: row.p256dh, auth: row.auth },
    };
    try {
      await wp.sendNotification(sub, body, { TTL: 86_400 });
    } catch (e) {
      const code = e.statusCode;
      if (code === 404 || code === 410) {
        try {
          await promisePool.query(`DELETE FROM web_push_subscriptions WHERE endpoint = ?`, [row.endpoint]);
        } catch (_) {
          /* ignore */
        }
      }
      console.warn('[web-push] send failed:', e.message);
    }
  }
}

/**
 * Send web push to every subscribed user in a school matching role codes.
 * @param {number} schoolId
 * @param {string|string[]} roleCodes
 * @param {{ title?: string, body?: string, tag?: string, url?: string }} payload
 */
async function sendWebPushToSchoolRoles(schoolId, roleCodes, payload) {
  if (!configureVapid()) return;
  const accepted = Array.isArray(roleCodes) ? roleCodes : [roleCodes];
  if (!accepted.length) return;
  try {
    const placeholders = accepted.map(() => '?').join(',');
    const [rows] = await promisePool.query(
      `SELECT DISTINCT u.id
       FROM users u
       LEFT JOIN roles r ON r.id = u.role_id
       WHERE u.school_id = ? AND r.role_code IN (${placeholders}) AND u.deleted_at IS NULL`,
      [schoolId, ...accepted]
    );
    for (const row of rows || []) {
      const uid = Number(row.id);
      if (!uid) continue;
      setImmediate(() => {
        sendWebPushToUser(uid, payload).catch((e) =>
          console.warn('[web-push] role notify:', e.message)
        );
      });
    }
  } catch (e) {
    console.warn('[web-push] sendWebPushToSchoolRoles:', e.message);
  }
}

module.exports = {
  ensureWebPushTable,
  configureVapid,
  upsertSubscription,
  removeSubscription,
  sendWebPushToUser,
  sendWebPushToSchoolRoles,
  getVapidPublicKey,
  isWebPushConfigured,
};
