'use strict';

const { promisePool } = require('../config/database');

async function runDDL(sql) {
  try {
    await promisePool.query(sql);
  } catch (e) {
    if (e.code === 'ER_DUP_FIELDNAME' || e.code === 'ER_DUP_KEYNAME' || e.code === 'ER_DUP_INDEX') return;
    throw e;
  }
}

async function ensureBabyeyiCoreSchema() {
  await promisePool.query(`
    CREATE TABLE IF NOT EXISTS school_babyeyi (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      doc_id VARCHAR(30) NOT NULL,
      school_id INT UNSIGNED NOT NULL,
      school_name VARCHAR(255) NOT NULL,
      school_code VARCHAR(50) NOT NULL DEFAULT '',
      school_sector VARCHAR(100) NOT NULL DEFAULT '',
      school_district VARCHAR(100) NOT NULL DEFAULT '',
      school_province VARCHAR(100) NOT NULL DEFAULT '',
      class_name VARCHAR(100) NOT NULL DEFAULT '',
      classes_json LONGTEXT NULL,
      term ENUM('Term 1','Term 2','Term 3') NOT NULL,
      academic_year VARCHAR(9) NOT NULL,
      education_level VARCHAR(50) NOT NULL DEFAULT '',
      school_category VARCHAR(50) NOT NULL DEFAULT '',
      ownership_type VARCHAR(50) NULL,
      payments LONGTEXT NOT NULL,
      parent_message TEXT NULL,
      show_parent_message TINYINT(1) NOT NULL DEFAULT 1,
      total_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
      bank_name VARCHAR(255) NOT NULL DEFAULT '',
      bank_account_no VARCHAR(100) NOT NULL DEFAULT '',
      bank_branch VARCHAR(255) NULL,
      head_teacher_name VARCHAR(255) NULL,
      integrity_hash VARCHAR(64) NULL,
      qr_payload VARCHAR(255) NULL,
      qr_code_url VARCHAR(500) NULL,
      qr_code_path VARCHAR(500) NULL,
      qr_view_url VARCHAR(1000) NULL,
      pdf_url VARCHAR(500) NULL,
      pdf_path VARCHAR(500) NULL,
      pdf_name VARCHAR(255) NULL,
      school_logo_url VARCHAR(500) NULL,
      supporting_doc_url VARCHAR(500) NULL,
      status ENUM('draft','submitted','approved','rejected','pending') NOT NULL DEFAULT 'draft',
      submitted_at DATETIME NULL,
      deo_status ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
      deo_name VARCHAR(255) NULL,
      deo_title VARCHAR(255) NULL,
      deo_notes TEXT NULL,
      deo_reviewed_at DATETIME NULL,
      approval_document_url VARCHAR(500) NULL,
      rejection_document_url VARCHAR(500) NULL,
      deo_signature_url VARCHAR(500) NULL,
      deo_stamp_url VARCHAR(500) NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      deleted_at DATETIME NULL,
      is_active TINYINT(1) NOT NULL DEFAULT 1,
      exceeds_limit TINYINT(1) NOT NULL DEFAULT 0,
      total_fee DECIMAL(12,2) NULL DEFAULT 0.00,
      nesa_limit DECIMAL(12,2) NULL,
      banks_json LONGTEXT NULL,
      translations_json LONGTEXT NULL,
      content_i18n LONGTEXT NULL,
      translation_status VARCHAR(32) NULL,
      UNIQUE KEY uq_sb_doc_id (doc_id),
      KEY idx_sb_school (school_id),
      KEY idx_sb_sector (school_sector),
      KEY idx_sb_district (school_district),
      KEY idx_sb_term (term),
      KEY idx_sb_year (academic_year),
      KEY idx_sb_status (status),
      KEY idx_sb_submitted (submitted_at),
      KEY idx_sb_deo (deo_status),
      KEY idx_sb_deleted (deleted_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await promisePool.query(`
    CREATE TABLE IF NOT EXISTS babyeyi_payments (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      babyeyi_id INT NOT NULL,
      name VARCHAR(200) NOT NULL,
      amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
      sort_order INT NULL DEFAULT 0,
      pay_channel VARCHAR(16) NOT NULL DEFAULT 'babyeyi',
      KEY idx_bp_babyeyi (babyeyi_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await promisePool.query(`
    CREATE TABLE IF NOT EXISTS babyeyi_class_requirements (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      babyeyi_id INT NOT NULL,
      information TEXT NOT NULL,
      item VARCHAR(300) NULL,
      details TEXT NULL,
      sort_order INT NULL DEFAULT 0,
      KEY idx_bcr_babyeyi (babyeyi_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await promisePool.query(`
    CREATE TABLE IF NOT EXISTS babyeyi_signatures (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      babyeyi_id INT NOT NULL,
      director_sig_path VARCHAR(500) NULL,
      director_sig_name VARCHAR(200) NULL,
      accountant_sig_path VARCHAR(500) NULL,
      accountant_sig_name VARCHAR(200) NULL,
      stamp_path VARCHAR(500) NULL,
      stamp_name VARCHAR(200) NULL,
      school_logo_path VARCHAR(255) NULL,
      school_logo_name VARCHAR(255) NULL,
      gov_logo_path VARCHAR(255) NULL,
      gov_logo_name VARCHAR(255) NULL,
      other_logo_path VARCHAR(255) NULL,
      other_logo_name VARCHAR(255) NULL,
      qr_code_path VARCHAR(500) NULL,
      qr_code_name VARCHAR(255) NULL,
      qr_view_url VARCHAR(1000) NULL,
      UNIQUE KEY uq_bs_babyeyi (babyeyi_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await promisePool.query(`
    CREATE TABLE IF NOT EXISTS babyeyi_student_requirements (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      babyeyi_id INT NOT NULL,
      item VARCHAR(300) NOT NULL,
      description TEXT NULL,
      quantity VARCHAR(50) NULL,
      cost DECIMAL(12,2) NULL,
      sort_order INT NULL DEFAULT 0,
      pay_channel VARCHAR(24) NOT NULL DEFAULT 'babyeyi',
      KEY idx_bsr_babyeyi (babyeyi_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await promisePool.query(`
    CREATE TABLE IF NOT EXISTS babyeyi_doc_ids (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      doc_id VARCHAR(30) NOT NULL,
      babyeyi_id INT NOT NULL,
      created_at DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uq_bdi_doc_id (doc_id),
      KEY idx_bdi_babyeyi (babyeyi_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await promisePool.query(`
    CREATE TABLE IF NOT EXISTS babyeyi_audit_log (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      babyeyi_id INT UNSIGNED NOT NULL,
      doc_id VARCHAR(30) NOT NULL DEFAULT '',
      action VARCHAR(100) NOT NULL,
      changed_by INT NULL,
      actor_id INT UNSIGNED NULL,
      actor_name VARCHAR(255) NULL,
      actor_role VARCHAR(100) NULL,
      old_status VARCHAR(50) NULL,
      new_status VARCHAR(50) NULL,
      changes LONGTEXT NULL,
      old_values LONGTEXT NULL,
      new_values LONGTEXT NULL,
      user_id INT UNSIGNED NULL,
      ip_address VARCHAR(45) NULL,
      user_agent VARCHAR(500) NULL,
      notes TEXT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      KEY idx_bal_babyeyi (babyeyi_id),
      KEY idx_bal_doc (doc_id),
      KEY idx_bal_action (action),
      KEY idx_bal_actor (actor_id),
      KEY idx_bal_created (created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await runDDL('ALTER TABLE babyeyi_audit_log ADD COLUMN old_values LONGTEXT NULL');
  await runDDL('ALTER TABLE babyeyi_audit_log ADD COLUMN new_values LONGTEXT NULL');
  await runDDL('ALTER TABLE babyeyi_audit_log ADD COLUMN user_id INT UNSIGNED NULL');
  await runDDL('ALTER TABLE babyeyi_audit_log ADD COLUMN changed_by INT NULL');

  /** Existing DBs created before new columns — IF NOT EXISTS is not on all MySQL/MariaDB builds. */
  await runDDL('ALTER TABLE school_babyeyi ADD COLUMN parent_message TEXT NULL');
  await runDDL('ALTER TABLE school_babyeyi ADD COLUMN show_parent_message TINYINT(1) NOT NULL DEFAULT 1');
  await runDDL('ALTER TABLE school_babyeyi ADD COLUMN classes_json LONGTEXT NULL');
  await runDDL('ALTER TABLE school_babyeyi ADD COLUMN education_level VARCHAR(50) NOT NULL DEFAULT \'\'');
  await runDDL('ALTER TABLE school_babyeyi ADD COLUMN banks_json LONGTEXT NULL');
  await runDDL('ALTER TABLE school_babyeyi ADD COLUMN total_fee DECIMAL(12,2) NULL DEFAULT 0.00');
  await runDDL('ALTER TABLE school_babyeyi ADD COLUMN nesa_limit DECIMAL(12,2) NULL');
  await runDDL('ALTER TABLE school_babyeyi ADD COLUMN exceeds_limit TINYINT(1) NOT NULL DEFAULT 0');
  await runDDL('ALTER TABLE school_babyeyi ADD COLUMN translations_json LONGTEXT NULL');
  await runDDL('ALTER TABLE school_babyeyi ADD COLUMN content_i18n LONGTEXT NULL');
  await runDDL('ALTER TABLE school_babyeyi ADD COLUMN translation_status VARCHAR(32) NULL');
  await runDDL('ALTER TABLE school_babyeyi ADD COLUMN integrity_hash VARCHAR(64) NULL');
  await runDDL('ALTER TABLE school_babyeyi ADD COLUMN qr_code_path VARCHAR(500) NULL');
  await runDDL('ALTER TABLE school_babyeyi ADD COLUMN qr_view_url VARCHAR(1000) NULL');
  await runDDL('ALTER TABLE school_babyeyi ADD COLUMN pdf_path VARCHAR(500) NULL');
  await runDDL('ALTER TABLE school_babyeyi ADD COLUMN pdf_name VARCHAR(255) NULL');
  await runDDL('ALTER TABLE school_babyeyi ADD COLUMN is_active TINYINT(1) NOT NULL DEFAULT 1');
  await runDDL('ALTER TABLE school_babyeyi ADD COLUMN deleted_at DATETIME NULL');

  try {
    await promisePool.query(
      "ALTER TABLE school_babyeyi MODIFY COLUMN status ENUM('draft','submitted','approved','rejected','pending') NOT NULL DEFAULT 'draft'"
    );
  } catch (e) {
    console.warn('[babyeyiSchema] school_babyeyi.status enum:', e.message);
  }
}

module.exports = { ensureBabyeyiCoreSchema };
