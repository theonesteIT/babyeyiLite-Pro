'use strict';

const { promisePool } = require('../config/database');
const { sendWebPushToUser } = require('./webPushSubscriptions');

const NESA_PORTAL_SCHOOL_ID = 0;
let prefsReady = false;

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

async function ensureNesaPrefsTable() {
  if (prefsReady) return;
  await promisePool.query(`
    CREATE TABLE IF NOT EXISTS nesa_user_settings (
      user_id INT UNSIGNED NOT NULL PRIMARY KEY,
      email_notifications TINYINT(1) NOT NULL DEFAULT 1,
      push_notifications TINYINT(1) NOT NULL DEFAULT 1,
      in_app_notifications TINYINT(1) NOT NULL DEFAULT 1,
      default_academic_year VARCHAR(32) NULL,
      default_term VARCHAR(32) NULL,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
  await promisePool.query(
    `ALTER TABLE nesa_user_settings ADD COLUMN default_academic_year VARCHAR(32) NULL`
  ).catch(() => {});
  await promisePool.query(
    `ALTER TABLE nesa_user_settings ADD COLUMN default_term VARCHAR(32) NULL`
  ).catch(() => {});
  prefsReady = true;
}

async function findNesaUsers() {
  const [rows] = await promisePool.query(
    `SELECT u.id, u.email, u.first_name, u.last_name
     FROM users u
     INNER JOIN roles r ON r.id = u.role_id
     WHERE u.deleted_at IS NULL AND (u.is_active = 1 OR u.is_active IS NULL)
       AND r.role_code IN ('NESA_ADMIN', 'NESA_OFFICER', 'SUPER_ADMIN')`
  );
  return rows || [];
}

async function getNesaPrefs(userId) {
  await ensureNesaPrefsTable();
  const [[row]] = await promisePool.query(
    `SELECT email_notifications, push_notifications, in_app_notifications,
            default_academic_year, default_term
     FROM nesa_user_settings WHERE user_id = ?`,
    [userId]
  );
  return {
    emailNotifications: row ? Boolean(row.email_notifications) : true,
    pushNotifications: row ? Boolean(row.push_notifications) : true,
    inAppNotifications: row ? Boolean(row.in_app_notifications) : true,
    defaultAcademicYear: row?.default_academic_year || '',
    defaultTerm: row?.default_term || '',
  };
}

async function saveNesaPrefs(userId, prefs) {
  await ensureNesaPrefsTable();
  await promisePool.query(
    `INSERT INTO nesa_user_settings
       (user_id, email_notifications, push_notifications, in_app_notifications,
        default_academic_year, default_term)
     VALUES (?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       email_notifications = VALUES(email_notifications),
       push_notifications = VALUES(push_notifications),
       in_app_notifications = VALUES(in_app_notifications),
       default_academic_year = VALUES(default_academic_year),
       default_term = VALUES(default_term)`,
    [
      userId,
      prefs.emailNotifications ? 1 : 0,
      prefs.pushNotifications ? 1 : 0,
      prefs.inAppNotifications ? 1 : 0,
      prefs.defaultAcademicYear || null,
      prefs.defaultTerm || null,
    ]
  );
}

async function insertInAppForNesa(userId, { type, title, body, url, entityType, entityId, tag }) {
  await ensureNotificationTables();
  const t = String(tag || '').slice(0, 191);
  if (t) {
    await promisePool.query(
      `INSERT INTO staff_portal_notifications
       (school_id, user_id, type, title, body, url, entity_type, entity_id, tag, is_read)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
       ON DUPLICATE KEY UPDATE title = VALUES(title), body = VALUES(body), url = VALUES(url),
         is_read = 0, created_at = NOW()`,
      [NESA_PORTAL_SCHOOL_ID, userId, type, title, body || null, url || null, entityType || null, entityId || null, t]
    );
    return;
  }
  await promisePool.query(
    `INSERT INTO staff_portal_notifications
     (school_id, user_id, type, title, body, url, entity_type, entity_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [NESA_PORTAL_SCHOOL_ID, userId, type, title, body || null, url || null, entityType || null, entityId || null]
  );
}

/**
 * Notify all NESA admins when a DEO recommends a fee increase to NESA.
 */
async function notifyNesaDeoRecommended({ schoolName, district, babyeyiId, requestId }) {
  const users = await findNesaUsers();
  if (!users.length) return;

  const title = 'DEO recommended fee increase';
  const body = `${schoolName || 'A school'} (${district || '—'}) — ready for NESA review.`;
  const url = '/nesa-babyeyi-dashboard';
  const tag = `nesa_deo_rec_${requestId || babyeyiId}`;

  for (const u of users) {
    const prefs = await getNesaPrefs(u.id);
    if (prefs.inAppNotifications) {
      await insertInAppForNesa(u.id, {
        type: 'request',
        title,
        body,
        url,
        entityType: 'increase_request',
        entityId: requestId || null,
        tag,
      });
    }
    if (prefs.pushNotifications) {
      sendWebPushToUser(u.id, { title, body, tag, url }).catch((e) =>
        console.warn('[nesaNotifications] web push:', e.message)
      );
    }
  }
}

module.exports = {
  ensureNotificationTables,
  getNesaPrefs,
  saveNesaPrefs,
  insertInAppForNesa,
  notifyNesaDeoRecommended,
};
