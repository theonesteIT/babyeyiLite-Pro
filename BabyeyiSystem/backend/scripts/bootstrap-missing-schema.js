#!/usr/bin/env node
/**
 * One-time: create tables that exist locally but may be missing on production.
 * Safe: CREATE TABLE IF NOT EXISTS only — no DROP, no data delete.
 *
 *   cd BabyeyiSystem/backend && node scripts/bootstrap-missing-schema.js
 */
'use strict';

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const { promisePool } = require('../config/database');
const { ensureSchoolMonitoringTables } = require('../utils/schoolMonitoringSchema');
const { ensurePlatformActivityTable } = require('../utils/platformActivityLog');
const { ensureDeoPrefsTable } = require('../BabyeyiRoutes/districtDeoNotifications');
const { ensureNotificationTables: ensureStaffPortalNotifications } = require('../BabyeyiRoutes/nesaNotifications');
const { saveNesaPrefs } = require('../BabyeyiRoutes/nesaNotifications');
const { ensureParentWebPushTable } = require('../BabyeyiRoutes/parentWebPush');
const { ensureStudentYearEnrollmentsTable } = require('../BabyeyiRoutes/studentYearEnrollments');

async function ensureFeeReminderTables() {
  await promisePool.query(`
    CREATE TABLE IF NOT EXISTS school_fee_reminder_campaigns (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      school_id INT UNSIGNED NOT NULL,
      created_by_user_id INT UNSIGNED NOT NULL,
      campaign_code VARCHAR(32) NOT NULL,
      title VARCHAR(160) NOT NULL,
      template_key VARCHAR(32) NOT NULL,
      academic_year VARCHAR(64) NOT NULL,
      term VARCHAR(64) NOT NULL,
      subject_line VARCHAR(255) NULL,
      message_body TEXT NULL,
      channels_json JSON NULL,
      filters_json JSON NULL,
      schedule_mode VARCHAR(16) NOT NULL DEFAULT 'now',
      scheduled_at DATETIME NULL,
      sent_at DATETIME NULL,
      recipient_count INT UNSIGNED NOT NULL DEFAULT 0,
      delivered_count INT UNSIGNED NOT NULL DEFAULT 0,
      failed_count INT UNSIGNED NOT NULL DEFAULT 0,
      status VARCHAR(24) NOT NULL DEFAULT 'delivered',
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_rem_campaign_code (school_id, campaign_code),
      KEY idx_rem_campaign_school (school_id, created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
  await promisePool.query(`
    CREATE TABLE IF NOT EXISTS school_fee_reminder_logs (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      school_id INT UNSIGNED NOT NULL,
      campaign_id INT UNSIGNED NOT NULL,
      student_id INT UNSIGNED NOT NULL,
      channel VARCHAR(24) NOT NULL,
      delivery_status VARCHAR(24) NOT NULL DEFAULT 'sent',
      parent_name VARCHAR(200) NULL,
      parent_email VARCHAR(255) NULL,
      parent_phone VARCHAR(64) NULL,
      balance_rwf DECIMAL(14,2) NULL,
      error_message VARCHAR(255) NULL,
      sent_at DATETIME NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      KEY idx_rem_log_campaign (campaign_id),
      KEY idx_rem_log_student (school_id, student_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
  await promisePool.query(`
    CREATE TABLE IF NOT EXISTS school_fee_reminder_rules (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      school_id INT UNSIGNED NOT NULL,
      created_by_user_id INT UNSIGNED NOT NULL,
      name VARCHAR(160) NOT NULL,
      is_active TINYINT(1) NOT NULL DEFAULT 1,
      condition_text VARCHAR(255) NOT NULL,
      extra_condition VARCHAR(255) NULL,
      action_text VARCHAR(160) NOT NULL,
      channels_json JSON NULL,
      frequency VARCHAR(64) NOT NULL DEFAULT 'Once',
      next_run_label VARCHAR(64) NULL,
      deleted_at DATETIME NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      KEY idx_rem_rule_school (school_id, deleted_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
  await promisePool.query(`
    CREATE TABLE IF NOT EXISTS school_fee_reminder_rule_runs (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      school_id INT UNSIGNED NOT NULL,
      rule_id INT UNSIGNED NOT NULL,
      campaign_id INT UNSIGNED NULL,
      students_matched INT UNSIGNED NOT NULL DEFAULT 0,
      reached_count INT UNSIGNED NOT NULL DEFAULT 0,
      delivered_count INT UNSIGNED NOT NULL DEFAULT 0,
      failed_count INT UNSIGNED NOT NULL DEFAULT 0,
      status VARCHAR(24) NOT NULL DEFAULT 'sent',
      error_message VARCHAR(255) NULL,
      ran_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      KEY idx_rrr_rule (rule_id),
      KEY idx_rrr_school (school_id, ran_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
}

async function ensureNesaAcademicYearsTable() {
  await promisePool.query(`
    CREATE TABLE IF NOT EXISTS nesa_academic_years (
      academic_year VARCHAR(9) NOT NULL PRIMARY KEY,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      created_by INT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
}

async function tableCount() {
  const [[row]] = await promisePool.query(
    `SELECT COUNT(*) AS c FROM information_schema.tables
     WHERE table_schema = DATABASE() AND table_type = 'BASE TABLE'`,
  );
  return Number(row.c);
}

async function main() {
  const before = await tableCount();
  console.log(`Tables before: ${before}`);

  await ensureSchoolMonitoringTables();
  console.log('  ✓ school monitoring (8 tables)');

  await ensurePlatformActivityTable();
  console.log('  ✓ platform_activity_logs');

  await ensureDeoPrefsTable();
  await ensureStaffPortalNotifications();
  console.log('  ✓ deo_user_settings + staff_portal_notifications');

  await saveNesaPrefs(0, {
    emailNotifications: true,
    pushNotifications: true,
    inAppNotifications: true,
    defaultAcademicYear: '',
    defaultTerm: '',
  }).catch(() => {});
  await ensureNesaAcademicYearsTable();
  console.log('  ✓ nesa_user_settings + nesa_academic_years');

  await ensureParentWebPushTable();
  console.log('  ✓ parent_web_push_subscriptions');

  await ensureStudentYearEnrollmentsTable();
  console.log('  ✓ student_year_enrollments');

  await ensureFeeReminderTables();
  console.log('  ✓ school_fee_reminder_* (4 tables)');

  const after = await tableCount();
  console.log(`\nTables after: ${after} (+${after - before})`);
  await promisePool.end();
  process.exit(0);
}

main().catch(async (e) => {
  console.error('Bootstrap failed:', e.message);
  try {
    await promisePool.end();
  } catch (_) {}
  process.exit(1);
});
