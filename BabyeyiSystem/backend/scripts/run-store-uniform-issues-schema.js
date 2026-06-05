'use strict';

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { promisePool } = require('../config/database');

const tables = [
  `CREATE TABLE IF NOT EXISTS store_uniform_issues (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    school_id INT UNSIGNED NOT NULL,
    issue_no VARCHAR(32) NOT NULL,
    academic_year VARCHAR(64) NULL,
    term VARCHAR(32) NULL,
    class_name VARCHAR(120) NULL,
    students_count INT UNSIGNED NOT NULL DEFAULT 0,
    total_pieces DECIMAL(14,2) NOT NULL DEFAULT 0,
    total_amount DECIMAL(14,2) NOT NULL DEFAULT 0,
    issued_by_user_id INT UNSIGNED NULL,
    issued_by_name VARCHAR(180) NULL,
    status VARCHAR(24) NOT NULL DEFAULT 'posted',
    deleted_at DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_uniform_issue_no (school_id, issue_no),
    KEY idx_uniform_issue_school (school_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  `CREATE TABLE IF NOT EXISTS store_uniform_issue_lines (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    issue_id INT UNSIGNED NOT NULL,
    school_id INT UNSIGNED NOT NULL,
    finished_good_id INT UNSIGNED NULL,
    item_name VARCHAR(120) NOT NULL,
    qty_per_student DECIMAL(14,2) NOT NULL DEFAULT 0,
    unit_price DECIMAL(14,2) NOT NULL DEFAULT 0,
    total_qty DECIMAL(14,2) NOT NULL DEFAULT 0,
    line_total DECIMAL(14,2) NOT NULL DEFAULT 0,
    KEY idx_uniform_issue_lines_issue (issue_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  `CREATE TABLE IF NOT EXISTS store_uniform_issue_student_lines (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    issue_id INT UNSIGNED NOT NULL,
    school_id INT UNSIGNED NOT NULL,
    student_id INT UNSIGNED NOT NULL,
    student_uid VARCHAR(50) NULL,
    student_name VARCHAR(200) NULL,
    finished_good_id INT UNSIGNED NULL,
    item_name VARCHAR(120) NOT NULL,
    quantity DECIMAL(14,2) NOT NULL DEFAULT 0,
    unit_price DECIMAL(14,2) NOT NULL DEFAULT 0,
    amount DECIMAL(14,2) NOT NULL DEFAULT 0,
    academic_year VARCHAR(64) NULL,
    term VARCHAR(32) NULL,
    class_name VARCHAR(120) NULL,
    issue_date DATE NULL,
    KEY idx_uniform_stu_lines_student (school_id, student_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  `CREATE TABLE IF NOT EXISTS store_uniform_student_charges (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    school_id INT UNSIGNED NOT NULL,
    issue_id INT UNSIGNED NOT NULL,
    student_id INT UNSIGNED NOT NULL,
    academic_year VARCHAR(64) NULL,
    term VARCHAR(32) NULL,
    class_name VARCHAR(120) NULL,
    amount_rwf DECIMAL(14,2) NOT NULL DEFAULT 0,
    description VARCHAR(255) NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'pending_accounting',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY idx_uniform_charges_student (school_id, student_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
];

(async () => {
  console.log(`Database: ${process.env.DB_NAME} @ ${process.env.DB_HOST}`);
  for (const sql of tables) {
    await promisePool.query(sql);
  }
  await promisePool.query(`CREATE TABLE IF NOT EXISTS store_uniform_issue_students (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    issue_id INT UNSIGNED NOT NULL,
    school_id INT UNSIGNED NOT NULL,
    student_id INT UNSIGNED NOT NULL,
    student_uid VARCHAR(50) NULL,
    student_name VARCHAR(200) NULL,
    total_qty DECIMAL(14,2) NOT NULL DEFAULT 0,
    total_amount DECIMAL(14,2) NOT NULL DEFAULT 0,
    KEY idx_uniform_issue_stu_issue (issue_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
  await promisePool.query(`CREATE TABLE IF NOT EXISTS store_uniform_issue_slots (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    student_issue_id INT UNSIGNED NOT NULL,
    issue_id INT UNSIGNED NOT NULL,
    school_id INT UNSIGNED NOT NULL,
    student_id INT UNSIGNED NOT NULL,
    slot_number TINYINT UNSIGNED NOT NULL,
    slot_name VARCHAR(80) NULL,
    label_name VARCHAR(120) NOT NULL,
    finished_good_id INT UNSIGNED NULL,
    quantity DECIMAL(14,2) NOT NULL DEFAULT 0,
    unit_price DECIMAL(14,2) NOT NULL DEFAULT 0,
    total_amount DECIMAL(14,2) NOT NULL DEFAULT 0,
    KEY idx_uniform_slots_issue (issue_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
  await promisePool.query('ALTER TABLE store_uniform_issue_slots ADD COLUMN slot_name VARCHAR(80) NULL').catch(() => {});
  await promisePool.query('ALTER TABLE store_movements ADD COLUMN finished_good_id INT UNSIGNED NULL').catch(() => {});
  await promisePool.query('ALTER TABLE store_movements ADD COLUMN uniform_issue_id INT UNSIGNED NULL').catch(() => {});
  console.log('OK: uniform issue tables');
  await promisePool.end();
})().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
