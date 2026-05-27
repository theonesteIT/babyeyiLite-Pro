'use strict';

const { promisePool } = require('../config/database');
const { sendWebPushToUser, sendWebPushToSchoolRoles } = require('./webPushSubscriptions');

let tablesReady = false;
let schedulerStarted = false;

const REMINDER_DAYS = [7, 3, 1];

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
  const migrations = [
    'ALTER TABLE school_action_plan_activities ADD COLUMN reminded_7d_end TINYINT(1) NOT NULL DEFAULT 0',
    'ALTER TABLE school_action_plan_activities ADD COLUMN reminded_3d_end TINYINT(1) NOT NULL DEFAULT 0',
    'ALTER TABLE school_action_plan_activities ADD COLUMN reminded_1d_end TINYINT(1) NOT NULL DEFAULT 0',
  ];
  for (const sql of migrations) {
    await promisePool.query(sql).catch(() => {});
  }
  tablesReady = true;
}

async function insertInAppNotification({ schoolId, userId, type, title, body, url, entityType, entityId, tag }) {
  if (!userId || !schoolId) return;
  await ensureNotificationTables();
  const t = String(tag || '').slice(0, 191);
  if (t) {
    await promisePool.query(
      `INSERT INTO staff_portal_notifications
       (school_id, user_id, type, title, body, url, entity_type, entity_id, tag, is_read)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
       ON DUPLICATE KEY UPDATE
         title = VALUES(title), body = VALUES(body), url = VALUES(url),
         is_read = 0, created_at = NOW()`,
      [schoolId, userId, type, title, body || null, url || null, entityType || null, entityId || null, t]
    );
    return;
  }
  await promisePool.query(
    `INSERT INTO staff_portal_notifications
     (school_id, user_id, type, title, body, url, entity_type, entity_id, tag)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL)`,
    [schoolId, userId, type, title, body || null, url || null, entityType || null, entityId || null]
  );
}

function pushToUser(userId, payload) {
  if (!userId) return;
  setImmediate(() => {
    sendWebPushToUser(userId, payload).catch(() => {});
  });
}

function pushToSchoolRoles(schoolId, roleCodes, payload) {
  setImmediate(() => {
    sendWebPushToSchoolRoles(schoolId, roleCodes, payload).catch(() => {});
  });
}

async function notifyUserChannels({ schoolId, userId, type, title, body, url, entityType, entityId, tag, push }) {
  await insertInAppNotification({ schoolId, userId, type, title, body, url, entityType, entityId, tag });
  if (push) pushToUser(userId, push);
}

/**
 * Notify managers when an action plan is submitted for approval.
 */
async function notifyActionPlanSubmitted(schoolId, plan) {
  if (!schoolId || !plan) return;
  const title = plan.title || 'Action plan';
  const body = `${title} was submitted and needs your approval.`;
  const url = '/manager/finance/action-plans';
  const tag = `ap-submit-${plan.id}`;
  const push = { title: 'Action plan pending approval', body, tag, url };

  pushToSchoolRoles(schoolId, ['SCHOOL_MANAGER', 'SCHOOL_ADMIN'], push);

  const [managers] = await promisePool.query(
    `SELECT DISTINCT u.id
     FROM users u
     INNER JOIN roles r ON r.id = u.role_id
     WHERE u.school_id = ? AND r.role_code IN ('SCHOOL_MANAGER', 'SCHOOL_ADMIN') AND u.deleted_at IS NULL`,
    [schoolId]
  );
  for (const row of managers || []) {
    await insertInAppNotification({
      schoolId,
      userId: row.id,
      type: 'action_plan_approval',
      title: 'Action plan pending approval',
      body,
      url,
      entityType: 'action_plan',
      entityId: plan.id,
      tag,
    });
  }
}

/**
 * Notify accountant (plan creator) when manager reviews.
 */
async function notifyActionPlanReviewed(schoolId, plan, status, notes) {
  const creatorId = Number(plan.created_by_user_id || plan.createdByUserId);
  if (!schoolId || !creatorId) return;

  const title = plan.title || 'Action plan';
  let pushTitle = 'Action plan updated';
  let body = title;
  if (status === 'approved') {
    pushTitle = 'Action plan approved';
    body = `${title} was approved.${notes ? ` Note: ${notes}` : ''}`;
  } else if (status === 'cancelled') {
    pushTitle = 'Action plan rejected';
    body = `${title} was rejected.${notes ? ` Reason: ${notes}` : ''}`;
  } else if (status === 'ongoing') {
    pushTitle = 'Action plan marked ongoing';
    body = `${title} is now ongoing.${notes ? ` Note: ${notes}` : ''}`;
  }

  const url = '/accountant/action-plan';
  const tag = `ap-review-${plan.id}-${status}`;

  await notifyUserChannels({
    schoolId,
    userId: creatorId,
    type: 'action_plan_review',
    title: pushTitle,
    body,
    url,
    entityType: 'action_plan',
    entityId: plan.id,
    tag,
    push: { title: pushTitle, body, tag, url },
  });
}

function daysUntilDate(dateVal) {
  if (!dateVal) return null;
  const end = new Date(dateVal);
  if (Number.isNaN(end.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  return Math.round((end - today) / 86400000);
}

/**
 * Send reminders for activities ending in 7, 3, or 1 day(s).
 */
async function processActivityEndReminders(schoolId) {
  await ensureNotificationTables();
  const params = schoolId ? [schoolId] : [];
  const schoolFilter = schoolId ? 'AND a.school_id = ?' : '';

  const [rows] = await promisePool.query(
    `SELECT a.*, p.title AS plan_title, p.created_by_user_id
     FROM school_action_plan_activities a
     INNER JOIN school_action_plans p ON p.id = a.action_plan_id AND p.school_id = a.school_id
     WHERE a.deleted_at IS NULL AND p.deleted_at IS NULL
       AND a.planned_end IS NOT NULL
       AND a.status NOT IN ('completed', 'cancelled')
       ${schoolFilter}`,
    params
  );

  for (const row of rows || []) {
    const days = daysUntilDate(row.planned_end);
    if (!REMINDER_DAYS.includes(days)) continue;

    const col = days === 7 ? 'reminded_7d_end' : days === 3 ? 'reminded_3d_end' : 'reminded_1d_end';
    if (Number(row[col])) continue;

    const actName = row.activity_name || 'Activity';
    const planTitle = row.plan_title || 'Action plan';
    const endLabel = new Date(row.planned_end).toLocaleDateString('en-RW', { month: 'short', day: 'numeric', year: 'numeric' });
    const title = days === 1 ? 'Activity ends tomorrow' : `Activity ends in ${days} days`;
    const body = `${actName} (${planTitle}) ends on ${endLabel}.`;
    const url = '/accountant/action-plan';
    const tag = `ap-act-end-${row.id}-${days}d`;
    const push = { title, body, tag, url };

    const notifyUserIds = new Set();
    if (row.responsible_user_id) notifyUserIds.add(Number(row.responsible_user_id));
    if (row.created_by_user_id) notifyUserIds.add(Number(row.created_by_user_id));

    const [staff] = await promisePool.query(
      `SELECT DISTINCT u.id
       FROM users u
       INNER JOIN roles r ON r.id = u.role_id
       WHERE u.school_id = ? AND r.role_code IN ('ACCOUNTANT', 'SCHOOL_MANAGER', 'SCHOOL_ADMIN') AND u.deleted_at IS NULL`,
      [row.school_id]
    );
    for (const s of staff || []) notifyUserIds.add(Number(s.id));

    for (const uid of notifyUserIds) {
      if (!uid) continue;
      await notifyUserChannels({
        schoolId: row.school_id,
        userId: uid,
        type: 'activity_deadline',
        title,
        body,
        url,
        entityType: 'activity',
        entityId: row.id,
        tag: `${tag}-u${uid}`,
        push,
      });
    }

    pushToSchoolRoles(row.school_id, ['ACCOUNTANT', 'SCHOOL_MANAGER'], push);

    await promisePool.query(
      `UPDATE school_action_plan_activities SET ${col} = 1 WHERE id = ? AND school_id = ?`,
      [row.id, row.school_id]
    );
  }
}

async function processAllSchoolsActivityReminders() {
  const [schools] = await promisePool.query(
    `SELECT DISTINCT school_id FROM school_action_plan_activities WHERE deleted_at IS NULL`
  );
  try {
    const { processAllSchoolsActivityTimeline } = require('./actionPlanTimeline');
    await processAllSchoolsActivityTimeline();
  } catch (e) {
    console.warn('[action-plan-timeline]:', e.message);
  }
  for (const s of schools || []) {
    if (s.school_id) await processActivityEndReminders(s.school_id);
  }
}

function startActivityReminderScheduler() {
  if (schedulerStarted) return;
  schedulerStarted = true;
  const run = () => {
    processAllSchoolsActivityReminders().catch((e) => {
      console.warn('[action-plan-reminders]:', e.message);
    });
  };
  setTimeout(run, 30_000);
  setInterval(run, 6 * 60 * 60 * 1000);
}

async function listNotificationsForUser(userId, schoolId, limit = 40) {
  await ensureNotificationTables();
  const [rows] = await promisePool.query(
    `SELECT id, type, title, body, url, entity_type, entity_id, tag, is_read, created_at
     FROM staff_portal_notifications
     WHERE user_id = ? AND school_id = ?
     ORDER BY is_read ASC, created_at DESC
     LIMIT ?`,
    [userId, schoolId, Math.min(100, Math.max(1, limit))]
  );
  return rows.map((r) => ({
    id: r.id,
    type: r.type,
    title: r.title,
    body: r.body || '',
    message: r.body || r.title,
    url: r.url || '',
    entityType: r.entity_type,
    entityId: r.entity_id,
    tag: r.tag,
    isRead: Boolean(r.is_read),
    createdAt: r.created_at,
  }));
}

async function markNotificationRead(userId, schoolId, notificationId) {
  await ensureNotificationTables();
  await promisePool.query(
    `UPDATE staff_portal_notifications SET is_read = 1
     WHERE id = ? AND user_id = ? AND school_id = ?`,
    [notificationId, userId, schoolId]
  );
}

async function markAllNotificationsRead(userId, schoolId) {
  await ensureNotificationTables();
  await promisePool.query(
    `UPDATE staff_portal_notifications SET is_read = 1 WHERE user_id = ? AND school_id = ? AND is_read = 0`,
    [userId, schoolId]
  );
}

module.exports = {
  ensureNotificationTables,
  notifyActionPlanSubmitted,
  notifyActionPlanReviewed,
  processActivityEndReminders,
  processAllSchoolsActivityReminders,
  startActivityReminderScheduler,
  listNotificationsForUser,
  markNotificationRead,
  markAllNotificationsRead,
};
