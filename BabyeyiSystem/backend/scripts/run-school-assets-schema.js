'use strict';

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { promisePool } = require('../config/database');

const sql = `
CREATE TABLE IF NOT EXISTS school_assets (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  school_id INT UNSIGNED NOT NULL,
  asset_code VARCHAR(40) NOT NULL,
  asset_name VARCHAR(200) NOT NULL,
  label_tag VARCHAR(80) NULL,
  asset_type VARCHAR(32) NULL,
  category VARCHAR(120) NULL,
  description TEXT NULL,
  location VARCHAR(200) NULL,
  supplier_name VARCHAR(160) NULL,
  upi VARCHAR(80) NULL,
  sku VARCHAR(80) NULL,
  serial_number VARCHAR(120) NULL,
  brand VARCHAR(120) NULL,
  material VARCHAR(40) NULL,
  size_label VARCHAR(80) NULL,
  purchase_date DATE NULL,
  unit_price DECIMAL(14,2) NULL,
  opening_amount DECIMAL(14,2) NULL,
  invoice_number VARCHAR(80) NULL,
  funding_source VARCHAR(120) NULL,
  dep_mode VARCHAR(40) NULL,
  dep_rate DECIMAL(8,4) NULL,
  dep_years DECIMAL(8,2) NULL,
  decimal_dep DECIMAL(12,6) NULL,
  annual_dep DECIMAL(14,2) NULL,
  total_dep DECIMAL(14,2) NULL,
  net_book_value DECIMAL(14,2) NULL,
  quantity DECIMAL(14,2) NOT NULL DEFAULT 1,
  unit VARCHAR(20) NOT NULL DEFAULT 'PCS',
  condition_code VARCHAR(20) NOT NULL DEFAULT 'GOOD',
  notes TEXT NULL,
  status VARCHAR(40) NOT NULL DEFAULT 'Active',
  created_by INT UNSIGNED NULL,
  deleted_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_school_asset_code (school_id, asset_code),
  KEY idx_school_assets_school (school_id),
  KEY idx_school_assets_status (school_id, status),
  KEY idx_school_assets_category (school_id, category)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`;

(async () => {
  console.log(`Database: ${process.env.DB_NAME} @ ${process.env.DB_HOST}`);
  await promisePool.query(sql);
  console.log('OK: school_assets');
  await promisePool.end();
})().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
