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

function configureVapid() {
  if (vapidConfigured) return true;
  const wp = loadWebPush();
  if (!wp) return false;
  const pub = process.env.VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  const sub = process.env.VAPID_SUBJECT || 'mailto:admin@localhost';
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

module.exports = {
  ensureWebPushTable,
  upsertSubscription,
  removeSubscription,
  sendWebPushToUser,
  getVapidPublicKey,
  isWebPushConfigured,
};
