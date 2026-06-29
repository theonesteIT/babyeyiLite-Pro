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

async function ensureSchoolsTable() {
  await promisePool.query(`
    CREATE TABLE IF NOT EXISTS schools (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      school_name VARCHAR(255) NOT NULL,
      school_code VARCHAR(50) NOT NULL,
      education_levels LONGTEXT NOT NULL,
      school_category ENUM('Day','Boarding','Day & Boarding','Other','PRIMARY','NINE_TWELVE_YBE_GS') NOT NULL,
      school_status VARCHAR(100) NULL,
      ownership_type ENUM('Government','Government-Aided','Private') NOT NULL,
      year_established INT NULL,
      province VARCHAR(100) NOT NULL DEFAULT '',
      district VARCHAR(100) NOT NULL DEFAULT '',
      sector VARCHAR(100) NOT NULL DEFAULT '',
      cell VARCHAR(100) NOT NULL DEFAULT '',
      village VARCHAR(100) NOT NULL DEFAULT '',
      full_address TEXT NOT NULL,
      map_url VARCHAR(500) NULL,
      phone VARCHAR(30) NOT NULL DEFAULT '',
      email VARCHAR(255) NOT NULL,
      postal_address VARCHAR(255) NULL,
      website VARCHAR(500) NULL,
      head_teacher_name VARCHAR(255) NOT NULL DEFAULT '',
      head_teacher_phone VARCHAR(30) NOT NULL DEFAULT '',
      head_teacher_email VARCHAR(255) NULL,
      deputy_head_name VARCHAR(255) NULL,
      logo_url VARCHAR(500) NULL,
      head_signature_url VARCHAR(500) NULL,
      school_stamp_url VARCHAR(500) NULL,
      manager_user_id INT UNSIGNED NULL,
      admin_id INT UNSIGNED NULL,
      status ENUM('active','inactive','suspended','deleted','pending') NOT NULL DEFAULT 'pending',
      is_active TINYINT(1) NOT NULL DEFAULT 1,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      deleted_at DATETIME NULL,
      district_code VARCHAR(2) NULL,
      a_level_combinations LONGTEXT NULL,
      tvet_trades LONGTEXT NULL,
      is_skeleton TINYINT(1) NOT NULL DEFAULT 0,
      subscription_plan ENUM('lite','pro') NOT NULL DEFAULT 'lite',
      pro_enabled TINYINT(1) NOT NULL DEFAULT 0,
      pro_start_date DATETIME NULL,
      pro_end_date DATETIME NULL,
      boarding_type VARCHAR(50) NULL,
      vision TEXT NULL,
      shule_avance_max_percent DECIMAL(5,2) NOT NULL DEFAULT 25.00,
      UNIQUE KEY uq_schools_code (school_code),
      UNIQUE KEY uq_schools_email (email),
      KEY idx_schools_province (province),
      KEY idx_schools_district (district),
      KEY idx_schools_sector (sector),
      KEY idx_schools_admin (admin_id),
      KEY idx_schools_status (status),
      KEY idx_schools_deleted (deleted_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await runDDL('ALTER TABLE schools ADD COLUMN district_code VARCHAR(2) NULL');
  await runDDL('ALTER TABLE schools ADD COLUMN a_level_combinations LONGTEXT NULL');
  await runDDL('ALTER TABLE schools ADD COLUMN tvet_trades LONGTEXT NULL');
  await runDDL('ALTER TABLE schools ADD COLUMN is_skeleton TINYINT(1) NOT NULL DEFAULT 0');
  await runDDL("ALTER TABLE schools ADD COLUMN subscription_plan ENUM('lite','pro') NOT NULL DEFAULT 'lite'");
  await runDDL('ALTER TABLE schools ADD COLUMN pro_enabled TINYINT(1) NOT NULL DEFAULT 0');
  await runDDL('ALTER TABLE schools ADD COLUMN pro_start_date DATETIME NULL');
  await runDDL('ALTER TABLE schools ADD COLUMN pro_end_date DATETIME NULL');
  await runDDL('ALTER TABLE schools ADD COLUMN boarding_type VARCHAR(50) NULL');
  await runDDL('ALTER TABLE schools ADD COLUMN vision TEXT NULL');
  await runDDL('ALTER TABLE schools ADD COLUMN shule_avance_max_percent DECIMAL(5,2) NOT NULL DEFAULT 25.00');
  await promisePool.query('ALTER TABLE schools MODIFY year_established INT NULL').catch(() => {});
  await promisePool.query('ALTER TABLE schools MODIFY head_teacher_email VARCHAR(255) NULL').catch(() => {});
}

module.exports = { ensureSchoolsTable };
