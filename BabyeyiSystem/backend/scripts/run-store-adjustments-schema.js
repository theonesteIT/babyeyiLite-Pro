'use strict';

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { promisePool } = require('../config/database');

const sql = `CREATE TABLE IF NOT EXISTS store_stock_adjustments (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  school_id INT UNSIGNED NOT NULL,
  source_type VARCHAR(32) NOT NULL,
  source_id INT UNSIGNED NOT NULL,
  item_name VARCHAR(160) NOT NULL,
  category VARCHAR(120) NULL,
  unit VARCHAR(40) NULL,
  mode VARCHAR(16) NOT NULL DEFAULT 'decrease',
  reason VARCHAR(120) NOT NULL,
  note TEXT NULL,
  quantity DECIMAL(14,2) NOT NULL DEFAULT 0,
  quantity_before DECIMAL(14,2) NOT NULL DEFAULT 0,
  quantity_after DECIMAL(14,2) NOT NULL DEFAULT 0,
  academic_year VARCHAR(64) NULL,
  term VARCHAR(32) NULL,
  adjustment_date DATE NOT NULL,
  deleted_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_adj_school (school_id),
  KEY idx_adj_date (school_id, adjustment_date),
  KEY idx_adj_source (school_id, source_type, source_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`;

(async () => {
  console.log(`Database: ${process.env.DB_NAME} @ ${process.env.DB_HOST}`);
  await promisePool.query(sql);
  console.log('OK: store_stock_adjustments');
  await promisePool.end();
})().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
