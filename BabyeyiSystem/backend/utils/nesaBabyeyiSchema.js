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

async function ensureBabyeyiIncreaseRequestsTable() {
  await promisePool.query(`
    CREATE TABLE IF NOT EXISTS babyeyi_increase_requests (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      babyeyi_id INT NOT NULL,
      school_id INT NULL,
      school_name VARCHAR(255) NULL,
      sector VARCHAR(100) NULL,
      district VARCHAR(100) NULL,
      category VARCHAR(100) NULL,
      level VARCHAR(100) NULL,
      academic_year VARCHAR(20) NULL,
      term VARCHAR(50) NULL,
      class VARCHAR(20) NULL,
      reason VARCHAR(200) NOT NULL DEFAULT '',
      request_reasons_json TEXT NULL,
      other_reason VARCHAR(255) NULL,
      description TEXT NULL,
      current_limit DECIMAL(12,2) NOT NULL DEFAULT 0,
      requested_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
      excess_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
      parent_rep_doc_path VARCHAR(500) NULL,
      parent_rep_doc_name VARCHAR(200) NULL,
      budget_doc_path VARCHAR(500) NULL,
      budget_doc_name VARCHAR(200) NULL,
      nesa_status ENUM('pending','approved','rejected','revision','recommended','nesa_rejected') NULL DEFAULT 'pending',
      nesa_notes TEXT NULL,
      submitted_at DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
      reviewed_at DATETIME NULL,
      reviewed_by INT NULL,
      approval_letter_path VARCHAR(500) NULL,
      approval_letter_name VARCHAR(255) NULL,
      deo_signature_path VARCHAR(500) NULL,
      deo_signature_name VARCHAR(255) NULL,
      deo_stamp_path VARCHAR(500) NULL,
      deo_stamp_name VARCHAR(255) NULL,
      rejection_letter_path VARCHAR(500) NULL,
      rejection_letter_name VARCHAR(255) NULL,
      rejection_signature_path VARCHAR(500) NULL,
      rejection_signature_name VARCHAR(255) NULL,
      rejection_stamp_path VARCHAR(500) NULL,
      rejection_stamp_name VARCHAR(255) NULL,
      deo_notes TEXT NULL,
      deo_reviewed_at DATETIME NULL,
      deo_id INT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      KEY idx_bir_babyeyi (babyeyi_id),
      KEY idx_bir_school (school_id),
      KEY idx_bir_sector (sector),
      KEY idx_bir_district (district),
      KEY idx_bir_nesa_status (nesa_status),
      KEY idx_bir_deo (deo_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
}

async function ensureFeeLimitsTable() {
  await promisePool.query(`
    CREATE TABLE IF NOT EXISTS fee_limits (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      category ENUM('Public','Private','Boarding','TVET') NOT NULL,
      level ENUM('Nursery','Primary','Secondary','University') NOT NULL,
      term ENUM('Term 1','Term 2','Term 3','Full Year') NOT NULL DEFAULT 'Term 1',
      academic_year VARCHAR(20) NOT NULL DEFAULT '2024-2025',
      max_amount DECIMAL(12,2) NOT NULL,
      regulation_ref VARCHAR(100) NULL,
      effective_date DATE NULL,
      notes TEXT NULL,
      document_path VARCHAR(500) NULL,
      document_name VARCHAR(255) NULL,
      created_by INT UNSIGNED NULL,
      updated_by INT UNSIGNED NULL,
      is_active TINYINT(1) NOT NULL DEFAULT 1,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      KEY idx_fl_category (category),
      KEY idx_fl_level (level),
      KEY idx_fl_year (academic_year),
      KEY idx_fl_active (is_active)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
}

async function ensureNesaAcademicYearsTable() {
  await promisePool.query(`
    CREATE TABLE IF NOT EXISTS nesa_academic_years (
      academic_year VARCHAR(9) NOT NULL PRIMARY KEY,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      created_by INT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
}

async function ensureNesaBabyeyiSchema() {
  const { ensureBabyeyiCoreSchema } = require('./babyeyiSchema');
  await ensureBabyeyiCoreSchema();
  await ensureBabyeyiIncreaseRequestsTable();
  await ensureFeeLimitsTable();
  await ensureNesaAcademicYearsTable();
  await runDDL(`
    CREATE TABLE IF NOT EXISTS fee_limit_audit_log (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      fee_limit_id INT UNSIGNED NOT NULL,
      action VARCHAR(64) NOT NULL,
      changed_by INT UNSIGNED NULL,
      old_values LONGTEXT NULL,
      new_values LONGTEXT NULL,
      ip_address VARCHAR(64) NULL,
      user_agent VARCHAR(500) NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      KEY idx_fla_fee_limit (fee_limit_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
}

module.exports = {
  ensureNesaBabyeyiSchema,
  ensureBabyeyiIncreaseRequestsTable,
  ensureFeeLimitsTable,
  ensureNesaAcademicYearsTable,
};
