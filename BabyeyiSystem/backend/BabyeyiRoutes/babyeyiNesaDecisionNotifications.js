'use strict';

const { promisePool } = require('../config/database');
const { sendWebPushToUser, sendWebPushToSchoolRoles } = require('./webPushSubscriptions');
const { notifyDistrictDeosNesaDecision } = require('./districtDeoNotifications');

let tablesReady = false;

async function ensureNotificationTables() {
  if (tablesReady) return;
  await promisePool.query(`
    CREATE TABLE IF NOT EXISTS staff_portal_notifications (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      school_id INT UNSIGNED NOT NULL,
      user_id INT UNSIGNED NOT NULL,
      type VARCHAR(64) NOT NULL DEFAULT 'info',
      title VARCHAR(255) NOT NULL,
      body TEXT NULL,
      url VARCHAR(512) NULL,
      entity_type VARCHAR(64) NULL,
      entity_id INT UNSIGNED NULL,
      tag VARCHAR(191) NULL,
      is_read TINYINT(1) NOT NULL DEFAULT 0,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      KEY idx_spn_user (user_id, is_read, created_at),
      KEY idx_spn_school (school_id, created_at),
      UNIQUE KEY uq_spn_user_tag (user_id, tag)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
  tablesReady = true;
}

async function sendPlainEmail(email, subject, text) {
  if (!email) return;
  try {
    const paths = ['../utils/emailService', '../../utils/emailService', '../BabyeyiRoutes/emailService'];
    let sendEmail = null;
    for (const p of paths) {
      try {
        sendEmail = require(p).sendEmail;
        break;
      } catch {
        /* try next */
      }
    }
    if (sendEmail) await sendEmail(email, subject, text);
  } catch (e) {
    console.warn('[babyeyiNesaDecision-email]', e.message);
  }
}

async function findSchoolManagers(schoolId) {
  if (!schoolId) return [];
  const [rows] = await promisePool.query(
    `SELECT DISTINCT u.id, u.email, u.first_name, u.last_name
     FROM users u
     INNER JOIN roles r ON r.id = u.role_id
     WHERE u.school_id = ?
       AND u.deleted_at IS NULL
       AND (u.is_active = 1 OR u.is_active IS NULL)
       AND r.role_code IN ('SCHOOL_MANAGER', 'SCHOOL_ADMIN', 'SCHOOL_ADMINISTRATOR')`,
    [schoolId]
  );
  return rows || [];
}

async function getSchoolContact(schoolId) {
  if (!schoolId) return null;
  const [[row]] = await promisePool.query(
    `SELECT id, school_name, email, head_teacher_email
     FROM schools WHERE id = ? LIMIT 1`,
    [schoolId]
  );
  return row || null;
}

async function insertInAppForSchool({ schoolId, userId, type, title, body, url, entityType, entityId, tag }) {
  if (!schoolId || !userId) return;
  await ensureNotificationTables();
  const t = String(tag || '').slice(0, 191);
  if (t) {
    await promisePool.query(
      `INSERT INTO staff_portal_notifications
       (school_id, user_id, type, title, body, url, entity_type, entity_id, tag, is_read)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
       ON DUPLICATE KEY UPDATE title = VALUES(title), body = VALUES(body), url = VALUES(url),
         is_read = 0, created_at = NOW()`,
      [schoolId, userId, type, title, body || null, url || null, entityType || null, entityId || null, t]
    );
    return;
  }
  await promisePool.query(
    `INSERT INTO staff_portal_notifications
     (school_id, user_id, type, title, body, url, entity_type, entity_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [schoolId, userId, type, title, body || null, url || null, entityType || null, entityId || null]
  );
}

async function notifySchoolNesaDecision({
  decision,
  schoolId,
  schoolName,
  babyeyiId,
  requestId,
  notes,
  docId,
}) {
  if (!schoolId) return;

  const approved = decision === 'approved';
  const title = approved ? 'NESA approved your Babyeyi request' : 'NESA rejected your Babyeyi request';
  const body = approved
    ? `NESA has approved the fee increase request for ${schoolName || 'your school'}.`
      + (docId ? ` Document: ${docId}.` : '')
      + (notes ? ` Note: ${notes}` : '')
    : `NESA has rejected the fee increase request for ${schoolName || 'your school'}.`
      + (notes ? ` Reason: ${notes}` : ' Please review and resubmit if needed.');
  const url = '/school-babyeyi-dashboard';
  const tag = `school-nesa-${decision}-${requestId || babyeyiId}`;
  const push = { title, body, tag, url };
  const notifType = approved ? 'nesa_approved' : 'nesa_rejected';

  const managers = await findSchoolManagers(schoolId);
  for (const m of managers) {
    await insertInAppForSchool({
      schoolId,
      userId: m.id,
      type: notifType,
      title,
      body,
      url,
      entityType: 'babyeyi_request',
      entityId: requestId || babyeyiId || null,
      tag,
    });
    setImmediate(() => {
      sendWebPushToUser(m.id, push).catch(() => {});
    });
  }

  setImmediate(() => {
    sendWebPushToSchoolRoles(schoolId, ['SCHOOL_MANAGER', 'SCHOOL_ADMIN'], push).catch(() => {});
  });

  const school = await getSchoolContact(schoolId);
  const emails = new Set();
  const addEmail = (e) => {
    const v = String(e || '').trim().toLowerCase();
    if (v && v.includes('@') && !v.endsWith('@school.babyeyi.local')) emails.add(v);
  };
  addEmail(school?.email);
  addEmail(school?.head_teacher_email);
  for (const m of managers) addEmail(m.email);

  const subject = approved
    ? `NESA approved Babyeyi fee increase — ${schoolName || school?.school_name || 'School'}`
    : `NESA rejected Babyeyi fee increase — ${schoolName || school?.school_name || 'School'}`;
  const text = [
    `Dear ${schoolName || school?.school_name || 'School'},`,
    '',
    body,
    '',
    'Sign in to your school Babyeyi portal for full details.',
    '',
    '— Babyeyi / NESA Rwanda',
  ].join('\n');

  for (const to of emails) {
    setImmediate(() => {
      sendPlainEmail(to, subject, text).catch(() => {});
    });
  }
}

/**
 * Notify district DEOs and school when NESA approves or rejects a fee increase request.
 * @param {'approved'|'rejected'} decision
 */
async function notifyNesaDecision({
  decision,
  schoolName,
  district,
  schoolId,
  babyeyiId,
  requestId,
  notes,
  docId,
}) {
  if (!decision) return;

  await notifyDistrictDeosNesaDecision({
    decision,
    schoolName,
    district,
    babyeyiId,
    requestId,
    notes,
    docId,
  });

  await notifySchoolNesaDecision({
    decision,
    schoolId,
    schoolName,
    babyeyiId,
    requestId,
    notes,
    docId,
  });
}

async function listSchoolNotificationsForUser(userId, schoolId, limit = 40) {
  await ensureNotificationTables();
  const [rows] = await promisePool.query(
    `SELECT id, type, title, body, url, entity_type, entity_id, tag, is_read, created_at
     FROM staff_portal_notifications
     WHERE user_id = ? AND school_id = ?
     ORDER BY is_read ASC, created_at DESC
     LIMIT ?`,
    [userId, schoolId, Math.min(100, Math.max(1, limit))]
  );
  return (rows || []).map((r) => ({
    id: r.id,
    type: r.type,
    title: r.title,
    body: r.body || '',
    url: r.url || '',
    entityType: r.entity_type,
    entityId: r.entity_id,
    tag: r.tag,
    isRead: Boolean(r.is_read),
    createdAt: r.created_at,
  }));
}

async function countSchoolUnread(userId, schoolId) {
  await ensureNotificationTables();
  const [[row]] = await promisePool.query(
    `SELECT COUNT(*) AS c FROM staff_portal_notifications
     WHERE user_id = ? AND school_id = ? AND is_read = 0`,
    [userId, schoolId]
  );
  return Number(row?.c || 0);
}

module.exports = {
  ensureNotificationTables,
  notifyNesaDecision,
  listSchoolNotificationsForUser,
  countSchoolUnread,
};
