'use strict';

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { promisePool } = require('../config/database');

const sql = `CREATE TABLE IF NOT EXISTS store_fabric_receipts (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  school_id INT UNSIGNED NOT NULL,
  academic_year VARCHAR(64) NULL,
  term VARCHAR(32) NULL,
  supplier_id INT UNSIGNED NULL,
  purchase_date DATE NULL,
  invoice_number VARCHAR(80) NULL,
  fabric_type VARCHAR(120) NOT NULL,
  color VARCHAR(80) NULL,
  meters DECIMAL(14,2) NOT NULL DEFAULT 0,
  unit_cost DECIMAL(14,2) NULL,
  total_cost DECIMAL(14,2) NULL,
  remaining_meters DECIMAL(14,2) NOT NULL DEFAULT 0,
  note TEXT NULL,
  deleted_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_fabric_rcpt_school (school_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`;

(async () => {
  console.log(`Database: ${process.env.DB_NAME} @ ${process.env.DB_HOST}`);
  await promisePool.query(sql);
  console.log('OK: store_fabric_receipts');
  const [[t]] = await promisePool.query("SHOW TABLES LIKE 'store_fabric_receipts'");
  console.log('Verify:', t ? 'present' : 'MISSING');
  await promisePool.end();
})().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
