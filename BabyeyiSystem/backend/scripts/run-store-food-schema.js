'use strict';

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { promisePool } = require('../config/database');

const tables = [
  `CREATE TABLE IF NOT EXISTS store_food_stock_ins (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    school_id INT UNSIGNED NOT NULL,
    academic_year VARCHAR(64) NULL,
    term VARCHAR(32) NULL,
    supplier_id INT UNSIGNED NULL,
    receive_date DATE NULL,
    invoice_number VARCHAR(80) NULL,
    item_name VARCHAR(160) NOT NULL,
    quantity DECIMAL(14,2) NOT NULL DEFAULT 0,
    unit_type VARCHAR(32) NOT NULL DEFAULT 'kg',
    unit_cost DECIMAL(14,2) NULL,
    total_cost DECIMAL(14,2) NULL,
    remaining_quantity DECIMAL(14,2) NOT NULL DEFAULT 0,
    min_level DECIMAL(14,2) NOT NULL DEFAULT 0,
    note TEXT NULL,
    deleted_at DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    KEY idx_food_in_school (school_id),
    KEY idx_food_in_year_term (school_id, academic_year, term),
    KEY idx_food_in_item (school_id, item_name)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  `CREATE TABLE IF NOT EXISTS store_food_consumptions (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    school_id INT UNSIGNED NOT NULL,
    food_stock_in_id INT UNSIGNED NOT NULL,
    academic_year VARCHAR(64) NULL,
    term VARCHAR(32) NULL,
    consumption_date DATE NOT NULL,
    quantity DECIMAL(14,2) NOT NULL DEFAULT 0,
    unit_type VARCHAR(32) NOT NULL DEFAULT 'kg',
    allocated_to VARCHAR(120) NOT NULL,
    allocated_other VARCHAR(200) NULL,
    note TEXT NULL,
    remaining_after DECIMAL(14,2) NOT NULL DEFAULT 0,
    deleted_at DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY idx_food_out_school (school_id),
    KEY idx_food_out_stock (food_stock_in_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  `CREATE TABLE IF NOT EXISTS store_food_alert_settings (
    school_id INT UNSIGNED NOT NULL PRIMARY KEY,
    low_stock_enabled TINYINT(1) NOT NULL DEFAULT 1,
    expiry_alerts_enabled TINYINT(1) NOT NULL DEFAULT 1,
    expiry_alert_days INT UNSIGNED NOT NULL DEFAULT 14,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
];

const alters = [
  `ALTER TABLE store_food_stock_ins ADD COLUMN expiry_date DATE NULL`,
  `ALTER TABLE store_food_stock_ins ADD COLUMN store_location VARCHAR(200) NULL`,
];

(async () => {
  console.log(`Database: ${process.env.DB_NAME} @ ${process.env.DB_HOST}`);
  for (const sql of tables) {
    await promisePool.query(sql);
  }
  for (const sql of alters) {
    await promisePool.query(sql).catch(() => {});
  }
  console.log('OK: store_food_stock_ins, store_food_consumptions, store_food_alert_settings');
  await promisePool.end();
})().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
