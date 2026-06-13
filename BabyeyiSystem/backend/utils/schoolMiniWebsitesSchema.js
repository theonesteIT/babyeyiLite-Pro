'use strict';

const { promisePool } = require('../config/database');

let tableReadyCache = null;

async function hasSchoolMiniWebsitesTable() {
  if (tableReadyCache !== null) return tableReadyCache;
  try {
    const [rows] = await promisePool.query(
      `SELECT 1 FROM information_schema.tables
       WHERE table_schema = DATABASE() AND table_name = 'school_mini_websites'
       LIMIT 1`
    );
    tableReadyCache = rows.length > 0;
  } catch {
    tableReadyCache = false;
  }
  return tableReadyCache;
}

/** SQL fragment for published mini-website slug, or NULL when the table is absent. */
async function miniWebsiteSlugSelect(schoolIdExpr = 's.school_id') {
  if (!(await hasSchoolMiniWebsitesTable())) {
    return 'NULL AS mini_website_slug';
  }
  return `(SELECT m.slug FROM school_mini_websites m
           WHERE m.school_id = ${schoolIdExpr} AND m.status = 'published'
           ORDER BY m.id DESC LIMIT 1) AS mini_website_slug`;
}

async function ensureSchoolMiniWebsitesSchema() {
  await promisePool.query(`
    CREATE TABLE IF NOT EXISTS school_mini_websites (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT,
      school_id INT UNSIGNED NOT NULL,
      slug VARCHAR(160) NOT NULL,
      status ENUM('draft','published','suspended') NOT NULL DEFAULT 'draft',
      published_at DATETIME NULL,
      cover_url VARCHAR(500) NULL,
      about_image_url VARCHAR(500) NULL,
      mission_image_url VARCHAR(500) NULL,
      background TEXT NULL,
      mission TEXT NULL,
      vision TEXT NULL,
      core_values LONGTEXT NULL,
      facebook VARCHAR(400) NULL,
      twitter VARCHAR(400) NULL,
      instagram VARCHAR(400) NULL,
      template VARCHAR(60) NOT NULL DEFAULT 'modern',
      color_theme VARCHAR(60) NOT NULL DEFAULT 'blue',
      custom_colors LONGTEXT NULL,
      sections LONGTEXT NULL,
      a_level_combinations LONGTEXT NULL,
      tvet_trades LONGTEXT NULL,
      admission LONGTEXT NULL,
      admission_form_id INT UNSIGNED NULL,
      fees LONGTEXT NULL,
      albums LONGTEXT NULL,
      international_primary_programs TEXT NULL,
      international_other_programs TEXT NULL,
      news_items TEXT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uq_mini_website_school (school_id),
      UNIQUE KEY uq_mini_website_slug (slug),
      KEY idx_mini_website_status (status),
      KEY idx_mini_website_admission_form (admission_form_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  tableReadyCache = true;
}

module.exports = {
  hasSchoolMiniWebsitesTable,
  miniWebsiteSlugSelect,
  ensureSchoolMiniWebsitesSchema,
};
