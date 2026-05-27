'use strict';

const { promisePool } = require('../config/database');
const { sendWebPushToUser } = require('./webPushSubscriptions');

const DISTRICT_PORTAL_SCHOOL_ID = 0;
let prefsReady = false;

async function ensureDeoPrefsTable() {
  if (prefsReady) return;
  await promisePool.query(`
    CREATE TABLE IF NOT EXISTS deo_user_settings (
      user_id INT UNSIGNED NOT NULL PRIMARY KEY,
      email_notifications TINYINT(1) NOT NULL DEFAULT 1,
      push_notifications TINYINT(1) NOT NULL DEFAULT 1,
      in_app_notifications TINYINT(1) NOT NULL DEFAULT 1,
      dark_mode TINYINT(1) NOT NULL DEFAULT 0,
      default_academic_year VARCHAR(32) NULL,
      default_term VARCHAR(32) NULL,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
  await promisePool.query(
    `ALTER TABLE deo_user_settings ADD COLUMN default_academic_year VARCHAR(32) NULL`
  ).catch(() => {});
  await promisePool.query(
    `ALTER TABLE deo_user_settings ADD COLUMN default_term VARCHAR(32) NULL`
  ).catch(() => {});
  prefsReady = true;
}

async function ensureNotificationTables() {
  await promisePool.query(`
    CREATE TABLE IF NOT EXISTS staff_portal_notifications (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      school_id INT UNSIGNED NOT NULL DEFAULT 0,
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
}

async function getDeoPrefs(userId) {
  await ensureDeoPrefsTable();
  const [[row]] = await promisePool.query(
    `SELECT email_notifications, push_notifications, in_app_notifications, dark_mode,
            default_academic_year, default_term
     FROM deo_user_settings WHERE user_id = ?`,
    [userId]
  );
  return {
    emailNotifications: row ? Boolean(row.email_notifications) : true,
    pushNotifications: row ? Boolean(row.push_notifications) : true,
    inAppNotifications: row ? Boolean(row.in_app_notifications) : true,
    darkMode: row ? Boolean(row.dark_mode) : false,
    defaultAcademicYear: row?.default_academic_year || '',
    defaultTerm: row?.default_term || '',
  };
}

async function saveDeoPrefs(userId, prefs) {
  await ensureDeoPrefsTable();
  await promisePool.query(
    `INSERT INTO deo_user_settings
       (user_id, email_notifications, push_notifications, in_app_notifications, dark_mode,
        default_academic_year, default_term)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       email_notifications = VALUES(email_notifications),
       push_notifications = VALUES(push_notifications),
       in_app_notifications = VALUES(in_app_notifications),
       dark_mode = VALUES(dark_mode),
       default_academic_year = VALUES(default_academic_year),
       default_term = VALUES(default_term)`,
    [
      userId,
      prefs.emailNotifications ? 1 : 0,
      prefs.pushNotifications ? 1 : 0,
      prefs.inAppNotifications ? 1 : 0,
      prefs.darkMode ? 1 : 0,
      prefs.defaultAcademicYear || null,
      prefs.defaultTerm || null,
    ]
  );
}

async function findDeoUsersInDistrict(district) {
  if (!district) return [];
  const districtMatch = `CONVERT(COALESCE(u.district_assigned, u.district) USING utf8mb4) COLLATE utf8mb4_unicode_ci
    = CONVERT(? USING utf8mb4) COLLATE utf8mb4_unicode_ci`;
  const [rows] = await promisePool.query(
    `SELECT u.id, u.email, u.first_name, u.last_name, COALESCE(u.school_id, 0) AS school_id
     FROM users u
     INNER JOIN roles r ON r.id = u.role_id
     WHERE u.deleted_at IS NULL AND (u.is_active = 1 OR u.is_active IS NULL)
       AND r.role_code IN ('DEO', 'deo', 'district_officer', 'district_education_officer')
       AND ${districtMatch}`,
    [district]
  );
  return rows || [];
}

async function insertInAppForDeo(userId, { type, title, body, url, entityType, entityId, tag }) {
  await ensureNotificationTables();
  const t = String(tag || '').slice(0, 191);
  if (t) {
    await promisePool.query(
      `INSERT INTO staff_portal_notifications
       (school_id, user_id, type, title, body, url, entity_type, entity_id, tag, is_read)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
       ON DUPLICATE KEY UPDATE title = VALUES(title), body = VALUES(body), url = VALUES(url),
         is_read = 0, created_at = NOW()`,
      [DISTRICT_PORTAL_SCHOOL_ID, userId, type, title, body || null, url || null, entityType || null, entityId || null, t]
    );
    return;
  }
  await promisePool.query(
    `INSERT INTO staff_portal_notifications
     (school_id, user_id, type, title, body, url, entity_type, entity_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [DISTRICT_PORTAL_SCHOOL_ID, userId, type, title, body || null, url || null, entityType || null, entityId || null]
  );
}

async function sendDeoEmail(email, subject, text) {
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
    console.warn('[district-deo-email]', e.message);
  }
}

/**
 * Notify all DEO users in a district when a school manager creates a Babyeyi (lite / full).
 */
async function notifyDistrictDeosNewBabyeyi(payload) {
  const {
    district,
    babyeyiId,
    schoolName,
    docId,
    status,
    exceeds,
    className,
    term,
    academicYear,
  } = payload || {};
  if (!district || !babyeyiId) return;

  const deos = await findDeoUsersInDistrict(district);
  if (!deos.length) return;

  const title = exceeds
    ? `New Babyeyi — fee exceeds limit`
    : status === 'pending'
      ? `New Babyeyi pending review`
      : `New school Babyeyi submitted`;
  const body = `${schoolName || 'A school'} submitted Babyeyi ${docId || `#${babyeyiId}`}`
    + (className ? ` · ${className}` : '')
    + (term ? ` · ${term}` : '')
    + (academicYear ? ` · ${academicYear}` : '')
    + (exceeds ? ' — requires district action.' : '.');
  const url = '/district-babyeyi-dashboard';
  const tag = `deo-babyeyi-${babyeyiId}`;
  const pushPayload = { title, body, tag, url: url };

  for (const deo of deos) {
    const prefs = await getDeoPrefs(deo.id);
    if (prefs.inAppNotifications) {
      await insertInAppForDeo(deo.id, {
        type: 'babyeyi_new',
        title,
        body,
        url,
        entityType: 'babyeyi',
        entityId: babyeyiId,
        tag,
      });
    }
    if (prefs.pushNotifications) {
      setImmediate(() => {
        sendWebPushToUser(deo.id, pushPayload).catch(() => {});
      });
    }
    if (prefs.emailNotifications && deo.email) {
      setImmediate(() => {
        sendDeoEmail(
          deo.email,
          title,
          `Hello ${deo.first_name || 'Officer'},\n\n${body}\n\nSign in to the DEO portal to review.\n`
        );
      });
    }
  }
}

/**
 * Notify district DEOs when NESA approves or rejects a fee increase request.
 */
async function notifyDistrictDeosNesaDecision({
  decision,
  schoolName,
  district,
  babyeyiId,
  requestId,
  notes,
  docId,
}) {
  if (!district) return;

  const approved = decision === 'approved';
  const title = approved ? 'NESA approved fee increase' : 'NESA rejected fee increase';
  const body = approved
    ? `${schoolName || 'A school'} — NESA approved the Babyeyi fee increase.`
      + (docId ? ` ${docId}.` : '')
      + (notes ? ` Note: ${notes}` : '')
    : `${schoolName || 'A school'} — NESA rejected the fee increase request.`
      + (notes ? ` Reason: ${notes}` : '');
  const url = '/district-babyeyi-dashboard';
  const tag = `deo-nesa-${decision}-${requestId || babyeyiId}`;
  const pushPayload = { title, body, tag, url };
  const notifType = approved ? 'nesa_approved' : 'nesa_rejected';

  const deos = await findDeoUsersInDistrict(district);
  for (const deo of deos) {
    const prefs = await getDeoPrefs(deo.id);
    if (prefs.inAppNotifications) {
      await insertInAppForDeo(deo.id, {
        type: notifType,
        title,
        body,
        url,
        entityType: 'increase_request',
        entityId: requestId || babyeyiId || null,
        tag,
      });
    }
    if (prefs.pushNotifications) {
      setImmediate(() => {
        sendWebPushToUser(deo.id, pushPayload).catch(() => {});
      });
    }
    if (prefs.emailNotifications && deo.email) {
      setImmediate(() => {
        sendDeoEmail(
          deo.email,
          title,
          `Hello ${deo.first_name || 'Officer'},\n\n${body}\n\nSign in to the DEO portal for details.\n`
        );
      });
    }
  }
}

async function listNotificationsForUser(userId, limit = 40) {
  await ensureNotificationTables();
  const [rows] = await promisePool.query(
    `SELECT id, type, title, body, url, entity_type, entity_id, tag, is_read, created_at
     FROM staff_portal_notifications
     WHERE user_id = ?
     ORDER BY is_read ASC, created_at DESC
     LIMIT ?`,
    [userId, Math.min(100, Math.max(1, limit))]
  );
  return rows.map((r) => ({
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

async function countUnread(userId) {
  await ensureNotificationTables();
  const [[row]] = await promisePool.query(
    `SELECT COUNT(*) AS c FROM staff_portal_notifications WHERE user_id = ? AND is_read = 0`,
    [userId]
  );
  return Number(row?.c || 0);
}

module.exports = {
  ensureDeoPrefsTable,
  getDeoPrefs,
  saveDeoPrefs,
  notifyDistrictDeosNewBabyeyi,
  notifyDistrictDeosNesaDecision,
  listNotificationsForUser,
  countUnread,
  DISTRICT_PORTAL_SCHOOL_ID,
};
