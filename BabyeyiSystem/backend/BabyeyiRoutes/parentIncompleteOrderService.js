'use strict';

/**
 * Server-side incomplete parent orders (ClassKit, ShuleKit, services) until payment completes.
 * Reminders at 7, 14, 21 days; auto-delete at 25 days.
 */

const { promisePool } = require('../config/database');
const { normalizeParentPhone, sendWebPushToParentPhones } = require('./parentWebPush');
const { insertParentPortalNotification } = require('./parentStudentNotifications');

const TABLE = 'parent_incomplete_orders';
const REMINDER_DAYS = [7, 14, 21];
const AUTO_DELETE_DAYS = 25;

let tableReady = false;

function trimStr(v) {
  return String(v ?? '').trim();
}

async function ensureIncompleteOrderTable() {
  if (tableReady) return;
  await promisePool.query(`
    CREATE TABLE IF NOT EXISTS ${TABLE} (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      parent_phone VARCHAR(30) NOT NULL,
      student_id INT UNSIGNED NULL,
      service_type VARCHAR(40) NOT NULL,
      status VARCHAR(24) NOT NULL DEFAULT 'incomplete',
      resume_token VARCHAR(80) NOT NULL,
      resume_url TEXT NULL,
      share_url TEXT NULL,
      kit_title VARCHAR(200) NULL,
      child_name VARCHAR(200) NULL,
      total_rwf INT UNSIGNED NOT NULL DEFAULT 0,
      delivery VARCHAR(20) NULL,
      payment_method VARCHAR(20) NULL,
      snapshot_json LONGTEXT NULL,
      reminder_week TINYINT UNSIGNED NOT NULL DEFAULT 0,
      last_reminder_at DATETIME NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      last_activity_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      completed_at DATETIME NULL,
      UNIQUE KEY uq_pio_parent_token (parent_phone, resume_token),
      KEY idx_pio_parent_active (parent_phone, status, created_at),
      KEY idx_pio_created (created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  tableReady = true;
}

function displayServiceLabel(serviceType) {
  const t = trimStr(serviceType).toLowerCase();
  if (t === 'shulekit') return 'ShuleKit';
  if (t === 'classkit') return 'ClassKit';
  if (t === 'shoes_voucher') return 'Shoes voucher';
  if (t === 'uniform_voucher') return 'Uniform voucher';
  return trimStr(serviceType) || 'Order';
}

function reminderCopy(week, row) {
  const label = row.kit_title || displayServiceLabel(row.service_type);
  const child = row.child_name ? ` for ${row.child_name}` : '';
  const amount =
    Number(row.total_rwf) > 0 ? ` (${Number(row.total_rwf).toLocaleString('en-US')} RWF)` : '';
  if (week === 1) {
    return {
      title: `Reminder — finish your ${label} order`,
      body: `You started${child}${amount} one week ago. Continue checkout, copy your link, or share on WhatsApp.`,
    };
  }
  if (week === 2) {
    return {
      title: `Second reminder — ${label} still unpaid`,
      body: `Two weeks since you started${child}. Complete payment when you are ready.`,
    };
  }
  return {
    title: `Final reminder — ${label}`,
    body: `Three weeks without payment${child}. This saved order will be removed soon if you do not finish.`,
  };
}

async function upsertIncompleteOrder({
  parentPhone,
  studentId,
  serviceType,
  status,
  resumeToken,
  resumeUrl,
  shareUrl,
  kitTitle,
  childName,
  totalRwf,
  delivery,
  paymentMethod,
  snapshot,
}) {
  const phone = normalizeParentPhone(parentPhone);
  const token = trimStr(resumeToken);
  if (!phone || !token) return { ok: false, error: 'parent_phone_and_resume_token_required' };

  const svc = trimStr(serviceType) || 'classkit';
  const st = trimStr(status) || 'incomplete';
  if (!['incomplete', 'pending_payment'].includes(st)) {
    return { ok: false, error: 'invalid_status' };
  }

  await ensureIncompleteOrderTable();
  const snapJson = snapshot && typeof snapshot === 'object' ? JSON.stringify(snapshot) : null;

  await promisePool.query(
    `INSERT INTO ${TABLE}
      (parent_phone, student_id, service_type, status, resume_token, resume_url, share_url,
       kit_title, child_name, total_rwf, delivery, payment_method, snapshot_json, last_activity_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
     ON DUPLICATE KEY UPDATE
       student_id = VALUES(student_id),
       service_type = VALUES(service_type),
       status = VALUES(status),
       resume_url = VALUES(resume_url),
       share_url = VALUES(share_url),
       kit_title = VALUES(kit_title),
       child_name = VALUES(child_name),
       total_rwf = VALUES(total_rwf),
       delivery = VALUES(delivery),
       payment_method = VALUES(payment_method),
       snapshot_json = VALUES(snapshot_json),
       last_activity_at = NOW(),
       completed_at = NULL`,
    [
      phone,
      Number(studentId) > 0 ? Number(studentId) : null,
      svc,
      st,
      token,
      trimStr(resumeUrl) || null,
      trimStr(shareUrl) || null,
      trimStr(kitTitle) || null,
      trimStr(childName) || null,
      Math.max(0, Math.floor(Number(totalRwf) || 0)),
      trimStr(delivery) || null,
      trimStr(paymentMethod) || null,
      snapJson,
    ]
  );

  return { ok: true };
}

async function markIncompleteOrderComplete(parentPhone, resumeToken) {
  const phone = normalizeParentPhone(parentPhone);
  const token = trimStr(resumeToken);
  if (!phone || !token) return { ok: false };

  await ensureIncompleteOrderTable();
  const [r] = await promisePool.query(
    `UPDATE ${TABLE}
     SET status = 'completed', completed_at = NOW(), last_activity_at = NOW()
     WHERE parent_phone = ? AND resume_token = ? AND completed_at IS NULL`,
    [phone, token]
  );
  return { ok: true, updated: (r?.affectedRows || 0) > 0 };
}

async function deleteIncompleteOrder(parentPhone, resumeToken) {
  const phone = normalizeParentPhone(parentPhone);
  const token = trimStr(resumeToken);
  if (!phone || !token) return { ok: false };

  await ensureIncompleteOrderTable();
  await promisePool.query(`DELETE FROM ${TABLE} WHERE parent_phone = ? AND resume_token = ?`, [
    phone,
    token,
  ]);
  return { ok: true };
}

async function listIncompleteOrdersForParent(parentPhone) {
  const phone = normalizeParentPhone(parentPhone);
  if (!phone) return [];

  await ensureIncompleteOrderTable();
  const [rows] = await promisePool.query(
    `SELECT id, parent_phone, student_id, service_type, status, resume_token, resume_url, share_url,
            kit_title, child_name, total_rwf, delivery, payment_method, snapshot_json,
            reminder_week, last_reminder_at, created_at, last_activity_at
     FROM ${TABLE}
     WHERE parent_phone = ?
       AND completed_at IS NULL
       AND status IN ('incomplete', 'pending_payment')
     ORDER BY last_activity_at DESC, id DESC
     LIMIT 50`,
    [phone]
  );

  return (rows || []).map((r) => {
    let snapshot = null;
    try {
      snapshot = r.snapshot_json ? JSON.parse(r.snapshot_json) : null;
    } catch {
      snapshot = null;
    }
    return {
      id: r.id,
      service_type: r.service_type,
      status: r.status,
      resume_token: r.resume_token,
      resume_url: r.resume_url,
      share_url: r.share_url,
      kit_title: r.kit_title,
      child_name: r.child_name,
      total_rwf: r.total_rwf,
      delivery: r.delivery,
      payment_method: r.payment_method,
      snapshot,
      reminder_week: r.reminder_week,
      created_at: r.created_at,
      last_activity_at: r.last_activity_at,
    };
  });
}

async function sendReminderForRow(row, week) {
  const phone = row.parent_phone;
  const copy = reminderCopy(week, row);
  const payload = {
    kind: 'incomplete_kit_order',
    resume_token: row.resume_token,
    resume_url: row.resume_url,
    share_url: row.share_url,
    service_type: row.service_type,
    status: row.status,
    reminder_week: week,
    total_rwf: row.total_rwf,
  };

  await insertParentPortalNotification({
    targetPhone: phone,
    studentId: row.student_id || null,
    type: 'INCOMPLETE_ORDER_REMINDER',
    title: copy.title,
    body: copy.body,
    payload,
  });

  try {
    await sendWebPushToParentPhones([phone], {
      title: copy.title,
      body: copy.body,
      tag: `incomplete-order-w${week}-${row.resume_token}`,
      url: row.share_url || row.resume_url || '/parents/orders',
    });
  } catch (e) {
    console.warn('[incomplete-order/push]', e.message);
  }

  await promisePool.query(
    `UPDATE ${TABLE} SET reminder_week = ?, last_reminder_at = NOW() WHERE id = ?`,
    [week, row.id]
  );
}

async function runIncompleteOrderSchedulerTick() {
  await ensureIncompleteOrderTable();
  const summary = { reminders: 0, deleted: 0 };

  const [expired] = await promisePool.query(
    `SELECT id, parent_phone, resume_token
     FROM ${TABLE}
     WHERE completed_at IS NULL
       AND status IN ('incomplete', 'pending_payment')
       AND created_at <= DATE_SUB(NOW(), INTERVAL ? DAY)`,
    [AUTO_DELETE_DAYS]
  );
  for (const row of expired || []) {
    await promisePool.query(`DELETE FROM ${TABLE} WHERE id = ?`, [row.id]);
    summary.deleted += 1;
  }

  for (let w = 0; w < REMINDER_DAYS.length; w += 1) {
    const days = REMINDER_DAYS[w];
    const week = w + 1;
    const [due] = await promisePool.query(
      `SELECT id, parent_phone, student_id, service_type, status, resume_token, resume_url, share_url,
              kit_title, child_name, total_rwf, reminder_week
       FROM ${TABLE}
       WHERE completed_at IS NULL
         AND status IN ('incomplete', 'pending_payment')
         AND reminder_week < ?
         AND created_at <= DATE_SUB(NOW(), INTERVAL ? DAY)
         AND created_at > DATE_SUB(NOW(), INTERVAL ? DAY)`,
      [week, days, AUTO_DELETE_DAYS]
    );
    for (const row of due || []) {
      try {
        await sendReminderForRow(row, week);
        summary.reminders += 1;
      } catch (e) {
        console.warn('[incomplete-order/reminder]', e.message);
      }
    }
  }

  return summary;
}

module.exports = {
  ensureIncompleteOrderTable,
  upsertIncompleteOrder,
  markIncompleteOrderComplete,
  deleteIncompleteOrder,
  listIncompleteOrdersForParent,
  runIncompleteOrderSchedulerTick,
  AUTO_DELETE_DAYS,
  REMINDER_DAYS,
};
