'use strict';

const { promisePool } = require('../config/database');

let ready = false;

async function ensureSchoolMonitoringTables() {
  if (ready) return;

  await promisePool.query(`
    CREATE TABLE IF NOT EXISTS user_sessions (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      session_key VARCHAR(128) NOT NULL,
      user_id INT UNSIGNED NULL,
      school_id INT UNSIGNED NULL,
      role_code VARCHAR(64) NULL,
      product_tier VARCHAR(16) NULL,
      ip_address VARCHAR(64) NULL,
      user_agent VARCHAR(255) NULL,
      device_label VARCHAR(120) NULL,
      status VARCHAR(24) NOT NULL DEFAULT 'online',
      login_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      last_activity_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      logout_at DATETIME NULL,
      is_forced_logout TINYINT(1) NOT NULL DEFAULT 0,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_user_sessions_key (session_key),
      KEY idx_user_sessions_user (user_id, status, last_activity_at),
      KEY idx_user_sessions_school (school_id, status, last_activity_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await promisePool.query(`
    CREATE TABLE IF NOT EXISTS login_attempts (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      user_id INT UNSIGNED NULL,
      school_id INT UNSIGNED NULL,
      role_code VARCHAR(64) NULL,
      identifier_hint VARCHAR(120) NULL,
      outcome VARCHAR(24) NOT NULL DEFAULT 'failed',
      ip_address VARCHAR(64) NULL,
      user_agent VARCHAR(255) NULL,
      product_tier VARCHAR(16) NULL,
      failure_reason VARCHAR(255) NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      KEY idx_login_attempts_time (created_at),
      KEY idx_login_attempts_user (user_id, created_at),
      KEY idx_login_attempts_school (school_id, created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await promisePool.query(`
    CREATE TABLE IF NOT EXISTS activity_logs (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      user_id INT UNSIGNED NULL,
      school_id INT UNSIGNED NULL,
      role_code VARCHAR(64) NULL,
      module VARCHAR(64) NULL,
      action_type VARCHAR(80) NOT NULL,
      action_summary VARCHAR(500) NULL,
      entity_type VARCHAR(64) NULL,
      entity_id VARCHAR(80) NULL,
      before_value TEXT NULL,
      after_value TEXT NULL,
      risk_level VARCHAR(24) NULL,
      ip_address VARCHAR(64) NULL,
      user_agent VARCHAR(255) NULL,
      product_tier VARCHAR(16) NULL,
      source_table VARCHAR(64) NULL,
      source_id BIGINT UNSIGNED NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      KEY idx_activity_logs_time (created_at),
      KEY idx_activity_logs_user (user_id, created_at),
      KEY idx_activity_logs_school (school_id, created_at),
      KEY idx_activity_logs_module (module, created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await promisePool.query(`
    CREATE TABLE IF NOT EXISTS audit_trails (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      user_id INT UNSIGNED NULL,
      school_id INT UNSIGNED NULL,
      trail_type VARCHAR(64) NOT NULL,
      description VARCHAR(500) NULL,
      meta_json JSON NULL,
      ip_address VARCHAR(64) NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      KEY idx_audit_trails_time (created_at),
      KEY idx_audit_trails_user (user_id, created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await promisePool.query(`
    CREATE TABLE IF NOT EXISTS suspicious_activities (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      user_id INT UNSIGNED NULL,
      school_id INT UNSIGNED NULL,
      threat_type VARCHAR(80) NOT NULL,
      detail TEXT NULL,
      risk_level VARCHAR(24) NOT NULL DEFAULT 'High',
      status VARCHAR(24) NOT NULL DEFAULT 'Pending',
      ip_address VARCHAR(64) NULL,
      activity_log_id BIGINT UNSIGNED NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      resolved_at DATETIME NULL,
      KEY idx_suspicious_school (school_id, status, created_at),
      KEY idx_suspicious_user (user_id, created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await promisePool.query(`
    CREATE TABLE IF NOT EXISTS user_devices (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      user_id INT UNSIGNED NOT NULL,
      device_fingerprint VARCHAR(64) NOT NULL,
      device_label VARCHAR(120) NULL,
      user_agent VARCHAR(255) NULL,
      first_seen_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      last_seen_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      last_ip VARCHAR(64) NULL,
      is_trusted TINYINT(1) NOT NULL DEFAULT 0,
      UNIQUE KEY uq_user_device (user_id, device_fingerprint),
      KEY idx_user_devices_user (user_id, last_seen_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await promisePool.query(`
    CREATE TABLE IF NOT EXISTS school_monitoring_logs (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      school_id INT UNSIGNED NOT NULL,
      log_date DATE NOT NULL,
      online_peak INT UNSIGNED NOT NULL DEFAULT 0,
      activities_count INT UNSIGNED NOT NULL DEFAULT 0,
      login_success INT UNSIGNED NOT NULL DEFAULT 0,
      login_failed INT UNSIGNED NOT NULL DEFAULT 0,
      suspicious_count INT UNSIGNED NOT NULL DEFAULT 0,
      meta_json JSON NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uq_school_monitor_day (school_id, log_date),
      KEY idx_school_monitor_date (log_date)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await promisePool.query(`
    CREATE TABLE IF NOT EXISTS user_status_tracking (
      user_id INT UNSIGNED NOT NULL PRIMARY KEY,
      school_id INT UNSIGNED NULL,
      status VARCHAR(24) NOT NULL DEFAULT 'offline',
      last_seen_at DATETIME NULL,
      last_ip VARCHAR(64) NULL,
      session_id BIGINT UNSIGNED NULL,
      is_disabled TINYINT(1) NOT NULL DEFAULT 0,
      is_locked TINYINT(1) NOT NULL DEFAULT 0,
      is_suspicious TINYINT(1) NOT NULL DEFAULT 0,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      KEY idx_user_status_school (school_id, status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  ready = true;
}

module.exports = { ensureSchoolMonitoringTables };
