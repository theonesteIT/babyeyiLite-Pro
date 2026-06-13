'use strict';

const express = require('express');
const { promisePool } = require('../config/database');
const {
  isWebPushConfigured,
  getVapidPublicKey,
  configureVapid,
} = require('./webPushSubscriptions');

const router = express.Router();

let webPush = null;
let tableReady = false;

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

async function ensureGuestPushTable() {
  if (tableReady) return;
  await promisePool.query(`
    CREATE TABLE IF NOT EXISTS public_guest_push_subscriptions (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      endpoint VARCHAR(768) NOT NULL,
      p256dh VARCHAR(255) NOT NULL,
      auth VARCHAR(255) NOT NULL,
      student_code VARCHAR(64) NULL,
      notify_fee_reminders TINYINT(1) NOT NULL DEFAULT 1,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_public_guest_push_endpoint (endpoint(512)),
      KEY idx_public_guest_push_student (student_code)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  tableReady = true;
}

function parseSubscription(body) {
  const sub = body?.subscription || body;
  const endpoint = String(sub?.endpoint || '').trim();
  const p256dh = String(sub?.keys?.p256dh || sub?.p256dh || '').trim();
  const auth = String(sub?.keys?.auth || sub?.auth || '').trim();
  if (!endpoint || !p256dh || !auth) return null;
  return { endpoint, p256dh, auth };
}

async function upsertGuestSubscription(subscription, studentCode = null) {
  await ensureGuestPushTable();
  const sub = parseSubscription({ subscription });
  if (!sub) throw new Error('Invalid push subscription');
  const code = studentCode != null ? String(studentCode).trim() || null : null;
  await promisePool.query(
    `INSERT INTO public_guest_push_subscriptions (endpoint, p256dh, auth, student_code, notify_fee_reminders)
     VALUES (?, ?, ?, ?, 1)
     ON DUPLICATE KEY UPDATE
       p256dh = VALUES(p256dh),
       auth = VALUES(auth),
       student_code = COALESCE(VALUES(student_code), student_code),
       notify_fee_reminders = 1,
       updated_at = NOW()`,
    [sub.endpoint, sub.p256dh, sub.auth, code]
  );
  return sub.endpoint;
}

async function linkGuestSubscriptionToStudent(endpoint, studentCode) {
  await ensureGuestPushTable();
  const ep = String(endpoint || '').trim();
  const code = String(studentCode || '').trim();
  if (!ep || !code) return false;
  const [r] = await promisePool.query(
    `UPDATE public_guest_push_subscriptions SET student_code = ?, updated_at = NOW() WHERE endpoint = ?`,
    [code, ep]
  );
  return (r.affectedRows || 0) > 0;
}

router.get('/push/vapid-key', (_req, res) => {
  const ok = isWebPushConfigured();
  const publicKey = getVapidPublicKey();
  res.json({
    success: ok && !!publicKey,
    configured: ok && !!publicKey,
    publicKey: ok ? publicKey : null,
  });
});

router.post('/push/subscribe', async (req, res) => {
  try {
    if (!isWebPushConfigured()) {
      return res.status(503).json({ success: false, message: 'Web Push is not configured on this server' });
    }
    const studentCode = req.body?.student_code || req.body?.code || null;
    const endpoint = await upsertGuestSubscription(req.body, studentCode);
    res.json({ success: true, data: { endpoint } });
  } catch (err) {
    console.error('[public/push/subscribe]', err);
    res.status(400).json({ success: false, message: err.message || 'Failed to save subscription' });
  }
});

router.post('/push/link-student', async (req, res) => {
  try {
    await ensureGuestPushTable();
    const endpoint = String(req.body?.endpoint || '').trim();
    const studentCode = String(req.body?.student_code || req.body?.code || '').trim();
    if (!endpoint || !studentCode) {
      return res.status(400).json({ success: false, message: 'endpoint and student_code are required' });
    }
    const linked = await linkGuestSubscriptionToStudent(endpoint, studentCode);
    if (!linked && req.body?.subscription) {
      await upsertGuestSubscription(req.body, studentCode);
    }
    res.json({ success: true });
  } catch (err) {
    console.error('[public/push/link-student]', err);
    res.status(400).json({ success: false, message: err.message || 'Failed to link subscription' });
  }
});

async function sendWebPushToStudentCode(studentCode, payload, opts = {}) {
  if (!configureVapid()) return { sent: 0, skipped: 'vapid_not_configured' };
  const wp = loadWebPush();
  if (!wp) return { sent: 0, skipped: 'web_push_module_missing' };

  await ensureGuestPushTable();
  const code = String(studentCode || '').trim();
  if (!code) return { sent: 0, skipped: 'no_code' };

  const [rows] = await promisePool.query(
    `SELECT endpoint, p256dh, auth FROM public_guest_push_subscriptions
     WHERE student_code = ? AND notify_fee_reminders = 1`,
    [code]
  );
  if (!rows?.length) return { sent: 0, skipped: 'no_subscriptions' };

  const body = JSON.stringify({
    title: payload.title || 'Babyeyi',
    body: payload.body || '',
    tag: payload.tag || 'babyeyi-fee-reminder',
    url: payload.url || '/remainder-student-pay-fees',
  });

  let sent = 0;
  for (const row of rows) {
    try {
      await wp.sendNotification(
        { endpoint: row.endpoint, keys: { p256dh: row.p256dh, auth: row.auth } },
        body,
        { TTL: 86_400 }
      );
      sent += 1;
    } catch (e) {
      if (e.statusCode === 404 || e.statusCode === 410) {
        await promisePool.query('DELETE FROM public_guest_push_subscriptions WHERE endpoint = ?', [row.endpoint]).catch(() => {});
      }
      console.warn('[public-guest-push] send failed:', e.message);
    }
  }
  return { sent };
}

module.exports = router;
module.exports.ensureGuestPushTable = ensureGuestPushTable;
module.exports.sendWebPushToStudentCode = sendWebPushToStudentCode;
module.exports.upsertGuestSubscription = upsertGuestSubscription;
module.exports.linkGuestSubscriptionToStudent = linkGuestSubscriptionToStudent;
