'use strict';

const { promisePool } = require('../config/database');

async function ensureRolesTable() {
  await promisePool.query(`
    CREATE TABLE IF NOT EXISTS roles (
      id INT UNSIGNED NOT NULL,
      role_name VARCHAR(120) NOT NULL,
      role_code VARCHAR(64) NOT NULL,
      description TEXT NULL,
      permissions JSON NULL,
      is_active TINYINT(1) NOT NULL DEFAULT 1,
      is_system_role TINYINT(1) NOT NULL DEFAULT 0,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_roles_code (role_code),
      KEY idx_roles_active (is_active)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
}

async function ensureRolesPrimaryKey() {
  await ensureRolesTable();
  const [idx] = await promisePool.query(
    `SELECT 1 FROM information_schema.statistics
     WHERE table_schema = DATABASE() AND table_name = 'roles' AND index_name = 'PRIMARY'
     LIMIT 1`,
  );
  if (!idx.length) {
    await promisePool.query('ALTER TABLE roles ADD PRIMARY KEY (id)');
  }

  // roles.id may not use AUTO_INCREMENT (legacy id=0 + FK from users). HR staff import
  // allocates explicit ids in schoolStaff.js — no ALTER required here.
}

async function ensureUsersTable() {
  await promisePool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      user_uid VARCHAR(32) NOT NULL,
      username VARCHAR(120) NULL,
      email VARCHAR(255) NULL,
      phone VARCHAR(30) NULL,
      password_hash VARCHAR(255) NOT NULL,
      first_name VARCHAR(100) NOT NULL DEFAULT '',
      last_name VARCHAR(100) NOT NULL DEFAULT '',
      photo VARCHAR(500) NULL,
      role_id INT UNSIGNED NOT NULL,
      school_id INT UNSIGNED NULL,
      province VARCHAR(100) NULL,
      district VARCHAR(100) NULL,
      sector VARCHAR(100) NULL,
      is_active TINYINT(1) NOT NULL DEFAULT 1,
      is_verified TINYINT(1) NOT NULL DEFAULT 0,
      is_locked TINYINT(1) NOT NULL DEFAULT 0,
      locked_until DATETIME NULL,
      failed_login_attempts INT UNSIGNED NOT NULL DEFAULT 0,
      force_password_change TINYINT(1) NOT NULL DEFAULT 0,
      last_login DATETIME NULL,
      last_login_ip VARCHAR(64) NULL,
      rfid_uid VARCHAR(64) NULL,
      fingerprint_id VARCHAR(128) NULL,
      identity_remarks VARCHAR(512) NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      deleted_at DATETIME NULL,
      UNIQUE KEY uq_users_uid (user_uid),
      UNIQUE KEY uq_users_email (email),
      KEY idx_users_role (role_id),
      KEY idx_users_school (school_id),
      KEY idx_users_username (username),
      KEY idx_users_phone (phone),
      KEY idx_users_deleted (deleted_at),
      CONSTRAINT fk_users_role FOREIGN KEY (role_id) REFERENCES roles(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
}

async function ensureStaffTable() {
  await promisePool.query(`
    CREATE TABLE IF NOT EXISTS staff (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      user_id INT UNSIGNED NOT NULL,
      school_id INT UNSIGNED NOT NULL,
      staff_id VARCHAR(64) NOT NULL,
      username VARCHAR(120) NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      full_name VARCHAR(180) NULL,
      gender VARCHAR(24) NULL,
      date_of_birth DATE NULL,
      national_id VARCHAR(64) NULL,
      passport_number VARCHAR(64) NULL,
      address TEXT NULL,
      employment_type VARCHAR(32) NULL,
      job_title VARCHAR(120) NULL,
      date_of_employment DATE NULL,
      contract_start_date DATE NULL,
      contract_end_date DATE NULL,
      employment_status VARCHAR(32) NULL,
      department VARCHAR(80) NULL,
      sub_department VARCHAR(80) NULL,
      payroll_basic_salary DECIMAL(14,2) NULL,
      payroll_transport_allowance DECIMAL(14,2) NULL,
      payroll_housing_allowance DECIMAL(14,2) NULL,
      payroll_meal_allowance DECIMAL(14,2) NULL,
      payroll_other_allowances JSON NULL,
      payroll_tax_percent DECIMAL(8,2) NULL,
      payroll_pension_amount DECIMAL(14,2) NULL,
      payroll_other_deductions JSON NULL,
      payroll_payment_frequency VARCHAR(24) NULL,
      payroll_payment_method VARCHAR(24) NULL,
      payroll_bank_name VARCHAR(120) NULL,
      payroll_account_number VARCHAR(120) NULL,
      payroll_account_holder VARCHAR(180) NULL,
      payroll_mobile_money_phone VARCHAR(30) NULL,
      payroll_part_time_rate DECIMAL(14,2) NULL,
      payroll_part_time_unit VARCHAR(30) NULL,
      allow_advance TINYINT(1) NULL DEFAULT 0,
      max_advance_limit DECIMAL(14,2) NULL,
      advance_deduction_type VARCHAR(16) NULL,
      advance_deduction_value DECIMAL(14,2) NULL,
      account_enabled TINYINT(1) NULL DEFAULT 1,
      hr_profile_json JSON NULL,
      termination_date DATE NULL,
      termination_reason TEXT NULL,
      terminated_at DATETIME NULL,
      terminated_by_user_id INT UNSIGNED NULL,
      UNIQUE KEY uq_staff_user_school (user_id, school_id),
      KEY idx_staff_school (school_id),
      KEY idx_staff_staff_id (staff_id),
      KEY idx_staff_username (username),
      CONSTRAINT fk_staff_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
}

async function ensureCoreAuthSchema() {
  await ensureRolesPrimaryKey();
  await ensureUsersTable();
  await ensureStaffTable();
}

module.exports = {
  ensureRolesTable,
  ensureRolesPrimaryKey,
  ensureUsersTable,
  ensureStaffTable,
  ensureCoreAuthSchema,
};
