'use strict';

/**
 * Web Push subscriptions for parent portal (keyed by parent phone, not users.id).
 */

const { promisePool } = require('../config/database');
const {
  ensureWebPushTable,
  isWebPushConfigured,
  getVapidPublicKey,
  configureVapid,
} = require('./webPushSubscriptions');

let webPush = null;
let parentPushTableReady = false;

function loadWebPush() {
  if (!webPush) {
    try {
      webPush = require('web-push');
    } catch (_) {
      return null;
    }
  }
  return webPush;
}

/** Rwanda mobile — aligned with parentPortal.js */
function normalizeParentPhone(raw) {
  if (!raw) return null;
  let v = String(raw).replace(/[\s\-().]/g, '');
  v = v.replace(/[^\d+]/g, '');
  if (v.startsWith('+250')) v = '0' + v.slice(4);
  else if (v.startsWith('250') && v.length === 12) v = '0' + v.slice(3);
  if (/^[27]\d{8}$/.test(v)) v = '0' + v;
  if (/^07[2-9]\d{7}$/.test(v)) return v;
  if (/^078\d{7}$/.test(v)) return v;
  if (/^079\d{7}$/.test(v)) return v;
  if (/^025\d{7}$/.test(v)) return v;
  return null;
}

async function ensureParentWebPushTable() {
  if (parentPushTableReady) return;
  await ensureWebPushTable();
  await promisePool.query(`
    CREATE TABLE IF NOT EXISTS parent_web_push_subscriptions (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      parent_phone VARCHAR(30) NOT NULL,
      endpoint VARCHAR(2048) NOT NULL,
      p256dh VARCHAR(255) NOT NULL,
      auth VARCHAR(255) NOT NULL,
      notify_fee_reminders TINYINT(1) NOT NULL DEFAULT 1,
      notify_discipline TINYINT(1) NOT NULL DEFAULT 1,
      notify_school_activity TINYINT(1) NOT NULL DEFAULT 1,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_parent_push_endpoint (endpoint(512)),
      KEY idx_parent_push_phone (parent_phone)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  await promisePool
    .query(
      `ALTER TABLE parent_portal_accounts
       ADD COLUMN push_notifications_enabled TINYINT(1) NOT NULL DEFAULT 0`
    )
    .catch(() => {});
  parentPushTableReady = true;
}

async function upsertParentSubscription(parentPhone, subscription, prefs = {}) {
  await ensureParentWebPushTable();
  const phone = normalizeParentPhone(parentPhone);
  if (!phone) {
    const err = new Error('Invalid parent phone');
    err.status = 400;
    throw err;
  }
  const endpoint = String(subscription?.endpoint || '');
  const keys = subscription?.keys || {};
  const p256dh = String(keys.p256dh || '');
  const auth = String(keys.auth || '');
  if (!endpoint || !p256dh || !auth) {
    const err = new Error('Invalid push subscription');
    err.status = 400;
    throw err;
  }

  const fee = prefs.notify_fee_reminders !== false ? 1 : 0;
  const discipline = prefs.notify_discipline !== false ? 1 : 0;
  const activity = prefs.notify_school_activity !== false ? 1 : 0;

  await promisePool.query(
    `INSERT INTO parent_web_push_subscriptions
      (parent_phone, endpoint, p256dh, auth, notify_fee_reminders, notify_discipline, notify_school_activity)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       parent_phone = VALUES(parent_phone),
       p256dh = VALUES(p256dh),
       auth = VALUES(auth),
       notify_fee_reminders = VALUES(notify_fee_reminders),
       notify_discipline = VALUES(notify_discipline),
       notify_school_activity = VALUES(notify_school_activity),
       updated_at = NOW()`,
    [phone, endpoint.slice(0, 2048), p256dh, auth, fee, discipline, activity]
  );

  await promisePool.query(
    'UPDATE parent_portal_accounts SET push_notifications_enabled = 1 WHERE phone = ?',
    [phone]
  );

  return phone;
}

async function removeParentSubscription(parentPhone, endpoint) {
  await ensureParentWebPushTable();
  const phone = normalizeParentPhone(parentPhone);
  const ep = String(endpoint || '').slice(0, 2048);
  if (phone && ep) {
    await promisePool.query(
      'DELETE FROM parent_web_push_subscriptions WHERE parent_phone = ? AND endpoint = ?',
      [phone, ep]
    );
  } else if (ep) {
    await promisePool.query('DELETE FROM parent_web_push_subscriptions WHERE endpoint = ?', [ep]);
  }
  if (phone) {
    const [[row]] = await promisePool.query(
      'SELECT COUNT(*) AS c FROM parent_web_push_subscriptions WHERE parent_phone = ?',
      [phone]
    );
    if (Number(row?.c || 0) === 0) {
      await promisePool.query(
        'UPDATE parent_portal_accounts SET push_notifications_enabled = 0 WHERE phone = ?',
        [phone]
      );
    }
  }
}

async function updateParentPushPreferences(parentPhone, prefs = {}) {
  await ensureParentWebPushTable();
  const phone = normalizeParentPhone(parentPhone);
  if (!phone) return;
  const sets = [];
  const params = [];
  if (prefs.notify_fee_reminders != null) {
    sets.push('notify_fee_reminders = ?');
    params.push(prefs.notify_fee_reminders ? 1 : 0);
  }
  if (prefs.notify_discipline != null) {
    sets.push('notify_discipline = ?');
    params.push(prefs.notify_discipline ? 1 : 0);
  }
  if (prefs.notify_school_activity != null) {
    sets.push('notify_school_activity = ?');
    params.push(prefs.notify_school_activity ? 1 : 0);
  }
  if (!sets.length) return;
  params.push(phone);
  await promisePool.query(
    `UPDATE parent_web_push_subscriptions SET ${sets.join(', ')}, updated_at = NOW() WHERE parent_phone = ?`,
    params
  );
}

async function getParentPushStatus(parentPhone) {
  await ensureParentWebPushTable();
  const phone = normalizeParentPhone(parentPhone);
  if (!phone) {
    return { subscribed: false, subscription_count: 0, preferences: null };
  }
  const [rows] = await promisePool.query(
    `SELECT notify_fee_reminders, notify_discipline, notify_school_activity
     FROM parent_web_push_subscriptions WHERE parent_phone = ? LIMIT 1`,
    [phone]
  );
  const [[acc]] = await promisePool.query(
    'SELECT push_notifications_enabled FROM parent_portal_accounts WHERE phone = ? LIMIT 1',
    [phone]
  );
  const [[countRow]] = await promisePool.query(
    'SELECT COUNT(*) AS c FROM parent_web_push_subscriptions WHERE parent_phone = ?',
    [phone]
  );
  const count = Number(countRow?.c || 0);
  const pref = rows[0] || null;
  return {
    subscribed: count > 0,
    subscription_count: count,
    account_enabled: Number(acc?.push_notifications_enabled || 0) === 1,
    preferences: pref
      ? {
          notify_fee_reminders: !!pref.notify_fee_reminders,
          notify_discipline: !!pref.notify_discipline,
          notify_school_activity: !!pref.notify_school_activity,
        }
      : {
          notify_fee_reminders: true,
          notify_discipline: true,
          notify_school_activity: true,
        },
  };
}

/**
 * @param {string} parentPhone
 * @param {{ title?: string, body?: string, tag?: string, url?: string }} payload
 * @param {{ category?: 'fee_reminders'|'discipline'|'school_activity' }} [opts]
 */
/** All phones that may receive alerts for a student (registration + portal access). */
async function collectParentPhonesForStudent(studentId) {
  const id = Number(studentId);
  if (!id) return [];
  const phones = new Set();
  const [rows] = await promisePool.query(
    `SELECT father_phone, mother_phone FROM students WHERE id = ? LIMIT 1`,
    [id]
  );
  const st = rows?.[0];
  if (st) {
    const f = normalizeParentPhone(st.father_phone);
    const m = normalizeParentPhone(st.mother_phone);
    if (f) phones.add(f);
    if (m) phones.add(m);
  }
  const [access] = await promisePool.query(
    `SELECT DISTINCT parent_phone FROM student_access WHERE student_id = ?`,
    [id]
  ).catch(() => [[]]);
  for (const r of access || []) {
    const p = normalizeParentPhone(r.parent_phone);
    if (p) phones.add(p);
  }
  return [...phones];
}

/**
 * Try every known parent phone for a student; returns total devices notified.
 */
async function sendWebPushToParentPhones(phones, payload, opts = {}) {
  const uniq = [...new Set((phones || []).map((p) => normalizeParentPhone(p)).filter(Boolean))];
  if (!uniq.length) return { sent: 0, skipped: 'no_phones' };
  let totalSent = 0;
  let lastSkip = null;
  for (const phone of uniq) {
    const r = await sendWebPushToParentPhone(phone, payload, opts);
    totalSent += Number(r.sent || 0);
    if (r.skipped) lastSkip = r.skipped;
  }
  if (totalSent === 0) return { sent: 0, skipped: lastSkip || 'no_subscriptions' };
  return { sent: totalSent };
}

/**
 * When a parent enables push on their login phone, mirror the same device subscription
 * to father/mother phones on linked students so fee campaigns can reach them.
 */
async function mirrorSubscriptionToStudentParentPhones(loginPhone, subscription, prefs = {}) {
  const phone = normalizeParentPhone(loginPhone);
  if (!phone) return;
  const extra = new Set();
  const [rows] = await promisePool.query(
    `SELECT DISTINCT s.father_phone, s.mother_phone
     FROM student_access sa
     INNER JOIN students s ON s.id = sa.student_id
     WHERE sa.parent_phone = ?`,
    [phone]
  ).catch(() => [[]]);
  for (const r of rows || []) {
    const f = normalizeParentPhone(r.father_phone);
    const m = normalizeParentPhone(r.mother_phone);
    if (f && f !== phone) extra.add(f);
    if (m && m !== phone) extra.add(m);
  }
  for (const alt of extra) {
    try {
      await upsertParentSubscription(alt, subscription, prefs);
    } catch (e) {
      console.warn('[parent-web-push] mirror subscription to', alt, ':', e.message);
    }
  }
}

async function sendWebPushToParentPhone(parentPhone, payload, opts = {}) {
  if (!configureVapid()) return { sent: 0, skipped: 'vapid_not_configured' };
  const wp = loadWebPush();
  if (!wp) return { sent: 0, skipped: 'web_push_module_missing' };

  await ensureParentWebPushTable();
  const phone = normalizeParentPhone(parentPhone);
  if (!phone) return { sent: 0, skipped: 'invalid_phone' };

  const category = opts.category || 'school_activity';
  const colMap = {
    fee_reminders: 'notify_fee_reminders',
    discipline: 'notify_discipline',
    school_activity: 'notify_school_activity',
  };
  const col = colMap[category] || 'notify_school_activity';

  const [rows] = await promisePool.query(
    `SELECT endpoint, p256dh, auth FROM parent_web_push_subscriptions
     WHERE parent_phone = ? AND ${col} = 1`,
    [phone]
  );
  if (!rows?.length) return { sent: 0, skipped: 'no_subscriptions' };

  const body = JSON.stringify({
    title: payload.title || 'Babyeyi',
    body: payload.body || '',
    tag: payload.tag || 'babyeyi-parent',
    url: payload.url || '/parents/home',
  });

  let sent = 0;
  for (const row of rows) {
    const sub = {
      endpoint: row.endpoint,
      keys: { p256dh: row.p256dh, auth: row.auth },
    };
    try {
      await wp.sendNotification(sub, body, { TTL: 86_400 });
      sent += 1;
    } catch (e) {
      const code = e.statusCode;
      if (code === 404 || code === 410) {
        try {
          await promisePool.query('DELETE FROM parent_web_push_subscriptions WHERE endpoint = ?', [
            row.endpoint,
          ]);
        } catch (_) {
          /* ignore */
        }
      }
      console.warn('[parent-web-push] send failed:', e.message);
    }
  }
  return { sent };
}

async function notifyStudentParentsPush(studentId, payload, opts = {}) {
  const phones = await collectParentPhonesForStudent(studentId);
  if (!phones.length) return;
  await sendWebPushToParentPhones(phones, payload, opts);
}

module.exports = {
  normalizeParentPhone,
  ensureParentWebPushTable,
  upsertParentSubscription,
  removeParentSubscription,
  updateParentPushPreferences,
  getParentPushStatus,
  collectParentPhonesForStudent,
  sendWebPushToParentPhone,
  sendWebPushToParentPhones,
  mirrorSubscriptionToStudentParentPhones,
  notifyStudentParentsPush,
  isWebPushConfigured,
  getVapidPublicKey,
};
