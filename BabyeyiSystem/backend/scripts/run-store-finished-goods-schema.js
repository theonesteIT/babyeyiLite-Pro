'use strict';

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { promisePool } = require('../config/database');

const sql = `CREATE TABLE IF NOT EXISTS store_finished_goods (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  school_id INT UNSIGNED NOT NULL,
  fabric_receipt_id INT UNSIGNED NULL,
  uniform_name VARCHAR(120) NOT NULL,
  size VARCHAR(40) NULL,
  stock DECIMAL(14,2) NOT NULL DEFAULT 0,
  avg_cost DECIMAL(14,2) NULL,
  selling_price DECIMAL(14,2) NULL,
  academic_year VARCHAR(64) NULL,
  term VARCHAR(32) NULL,
  note TEXT NULL,
  deleted_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_finished_goods_school (school_id),
  KEY idx_finished_goods_fabric (fabric_receipt_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`;

(async () => {
  console.log(`Database: ${process.env.DB_NAME} @ ${process.env.DB_HOST}`);
  await promisePool.query(sql);
  console.log('OK: store_finished_goods');
  const [[t]] = await promisePool.query("SHOW TABLES LIKE 'store_finished_goods'");
  console.log('Verify:', t ? 'present' : 'MISSING');
  await promisePool.end();
})().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
