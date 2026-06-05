'use strict';

/**
 * Applies store_suppliers table + columns directly to the configured database.
 * Usage: node scripts/run-store-suppliers-schema.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { promisePool } = require('../config/database');

const statements = [
  {
    label: 'store_suppliers table',
    sql: `CREATE TABLE IF NOT EXISTS store_suppliers (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      school_id INT UNSIGNED NOT NULL,
      name VARCHAR(220) NOT NULL,
      contact_person VARCHAR(180) NULL,
      phone VARCHAR(40) NULL,
      email VARCHAR(180) NULL,
      tin VARCHAR(64) NULL,
      website VARCHAR(255) NULL,
      address TEXT NULL,
      categories VARCHAR(255) NULL,
      status VARCHAR(32) NOT NULL DEFAULT 'Active',
      last_purchase_date DATE NULL,
      note TEXT NULL,
      deleted_at DATETIME NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      KEY idx_store_sup_school (school_id),
      KEY idx_store_sup_status (school_id, status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  },
  { label: 'store_suppliers.tin', sql: 'ALTER TABLE store_suppliers ADD COLUMN tin VARCHAR(64) NULL' },
  { label: 'store_suppliers.website', sql: 'ALTER TABLE store_suppliers ADD COLUMN website VARCHAR(255) NULL' },
  { label: 'store_suppliers.status', sql: "ALTER TABLE store_suppliers ADD COLUMN status VARCHAR(32) NOT NULL DEFAULT 'Active'" },
  { label: 'store_suppliers.last_purchase_date', sql: 'ALTER TABLE store_suppliers ADD COLUMN last_purchase_date DATE NULL' },
  { label: 'store_suppliers.created_at', sql: 'ALTER TABLE store_suppliers ADD COLUMN created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP' },
];

(async () => {
  console.log(`Database: ${process.env.DB_NAME} @ ${process.env.DB_HOST}:${process.env.DB_PORT || 3306}`);
  for (const { label, sql } of statements) {
    try {
      await promisePool.query(sql);
      console.log('OK:', label);
    } catch (e) {
      if (e.code === 'ER_DUP_FIELDNAME' || e.code === 'ER_TABLE_EXISTS_ERROR') {
        console.log('SKIP (already exists):', label);
      } else {
        console.error('FAIL:', label, '-', e.message);
        process.exitCode = 1;
      }
    }
  }

  const [[t]] = await promisePool.query("SHOW TABLES LIKE 'store_suppliers'");
  const [cols] = await promisePool.query('SHOW COLUMNS FROM store_suppliers');
  console.log('Verify store_suppliers:', t ? 'present' : 'MISSING');
  console.log('Columns:', cols.map((c) => c.Field).join(', '));
  await promisePool.end();
})();
