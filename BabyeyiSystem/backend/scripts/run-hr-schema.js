'use strict';

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { promisePool } = require('../config/database');

const statements = [
  {
    label: 'hr_departments table',
    sql: `CREATE TABLE IF NOT EXISTS hr_departments (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT,
      school_id INT UNSIGNED NOT NULL,
      name VARCHAR(120) NOT NULL,
      parent_id INT UNSIGNED NULL,
      head_name VARCHAR(180) NULL,
      budget_rwf DECIMAL(14,2) NULL,
      is_active TINYINT(1) NOT NULL DEFAULT 1,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uq_hr_dept_school_name (school_id, name),
      KEY idx_hr_dept_school (school_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  },
  { label: 'staff.hr_profile_json', sql: 'ALTER TABLE staff ADD COLUMN hr_profile_json JSON NULL' },
  { label: 'staff.payroll_account_holder', sql: 'ALTER TABLE staff ADD COLUMN payroll_account_holder VARCHAR(180) NULL' },
];

(async () => {
  console.log(`Database: ${process.env.DB_NAME} @ ${process.env.DB_HOST}:${process.env.DB_PORT || 3306}`);
  for (const { label, sql } of statements) {
    try {
      await promisePool.query(sql);
      console.log('OK:', label);
    } catch (e) {
      if (e.code === 'ER_DUP_FIELDNAME') {
        console.log('SKIP (already exists):', label);
      } else {
        console.error('FAIL:', label, '-', e.message);
        process.exitCode = 1;
      }
    }
  }

  const [[t]] = await promisePool.query("SHOW TABLES LIKE 'hr_departments'");
  const [cols] = await promisePool.query(
    "SHOW COLUMNS FROM staff WHERE Field IN ('hr_profile_json','payroll_account_holder')"
  );
  console.log('Verify hr_departments:', t ? 'present' : 'missing');
  console.log('Verify staff columns:', cols.map((c) => c.Field).join(', ') || 'none');
  await promisePool.end();
})();
