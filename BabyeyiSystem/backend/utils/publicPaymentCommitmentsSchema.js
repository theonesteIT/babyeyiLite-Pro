'use strict';

const { promisePool } = require('../config/database');

let ready = false;

async function ensurePublicPaymentCommitmentsSchema() {
  if (ready) return;
  await promisePool.query(`
    CREATE TABLE IF NOT EXISTS public_payment_commitments (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT,
      school_id INT UNSIGNED NOT NULL,
      babyeyi_id INT NOT NULL DEFAULT 0,
      student_id INT UNSIGNED NULL,
      student_code VARCHAR(64) NULL,
      student_name VARCHAR(200) NULL,
      class_name VARCHAR(120) NULL,
      academic_year VARCHAR(64) NULL,
      term VARCHAR(64) NULL,
      parent_phone VARCHAR(32) NULL,
      pay_path VARCHAR(120) NOT NULL DEFAULT '/paid-at-school',
      total_due_rwf DECIMAL(14,2) NOT NULL DEFAULT 0,
      amount_paid_rwf DECIMAL(14,2) NOT NULL DEFAULT 0,
      remaining_rwf DECIMAL(14,2) NOT NULL DEFAULT 0,
      promise_date DATE NOT NULL,
      days_until_promise INT NULL,
      status VARCHAR(24) NOT NULL DEFAULT 'active',
      last_reminder_at DATETIME NULL,
      payment_intent_id INT UNSIGNED NULL,
      payload_json LONGTEXT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY idx_ppc_active (status, promise_date),
      KEY idx_ppc_student (school_id, student_id),
      KEY idx_ppc_phone (parent_phone)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  ready = true;
}

module.exports = { ensurePublicPaymentCommitmentsSchema };
