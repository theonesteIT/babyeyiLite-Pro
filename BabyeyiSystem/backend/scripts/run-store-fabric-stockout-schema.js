'use strict';

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { promisePool } = require('../config/database');

const sql = `CREATE TABLE IF NOT EXISTS store_fabric_stockouts (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  school_id INT UNSIGNED NOT NULL,
  fabric_receipt_id INT UNSIGNED NOT NULL,
  academic_year VARCHAR(64) NULL,
  term VARCHAR(32) NULL,
  out_date DATE NOT NULL,
  meters_out DECIMAL(14,2) NOT NULL DEFAULT 0,
  purpose VARCHAR(200) NULL,
  note TEXT NULL,
  remaining_after DECIMAL(14,2) NOT NULL DEFAULT 0,
  deleted_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_fabric_out_school (school_id),
  KEY idx_fabric_out_receipt (fabric_receipt_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`;

(async () => {
  console.log(`Database: ${process.env.DB_NAME} @ ${process.env.DB_HOST}`);
  await promisePool.query(sql);
  console.log('OK: store_fabric_stockouts');
  const [[t]] = await promisePool.query("SHOW TABLES LIKE 'store_fabric_stockouts'");
  console.log('Verify:', t ? 'present' : 'MISSING');
  await promisePool.end();
})().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
