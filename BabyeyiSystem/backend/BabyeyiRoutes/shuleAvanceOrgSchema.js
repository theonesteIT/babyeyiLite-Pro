'use strict';

const db = require('../config/database');

let ready = false;

async function ensureShuleAvancePartnerRole() {
  try {
    const [rows] = await db.promisePool.query(
      "SELECT id FROM roles WHERE role_code = 'SHULE_AVANCE_PARTNER' LIMIT 1"
    );
    if (rows.length) return;
    await db.promisePool.query(
      `INSERT INTO roles (role_name, role_code, description, permissions, is_active, is_system_role)
       VALUES (?, ?, ?, ?, 1, 1)`,
      [
        'ShuleAvance Partner',
        'SHULE_AVANCE_PARTNER',
        'Financing partner — reviews ShuleAvance requests routed to their organization',
        '[]',
      ]
    );
  } catch (e) {
    console.warn('[shuleAvanceOrgSchema] ensureShuleAvancePartnerRole:', e.message);
  }
}

async function ensureShuleAvanceOrgTables() {
  if (ready) return;
  await ensureShuleAvancePartnerRole();
  await db.promisePool.execute(`
    CREATE TABLE IF NOT EXISTS pro_shule_avance_organizations (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      user_id INT UNSIGNED NOT NULL,
      org_name VARCHAR(200) NOT NULL,
      org_type VARCHAR(32) NOT NULL DEFAULT 'INTERNAL_PARTNER',
      login_username VARCHAR(120) NOT NULL,
      contact_person VARCHAR(180) NULL,
      contact_email VARCHAR(180) NOT NULL,
      contact_phone VARCHAR(40) NULL,
      address TEXT NULL,
      logo_url VARCHAR(500) NULL,
      description TEXT NULL,
      notes TEXT NULL,
      is_active TINYINT(1) NOT NULL DEFAULT 1,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_sa_org_login_username (login_username),
      UNIQUE KEY uq_sa_org_user (user_id),
      KEY idx_sa_org_active (is_active)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  await db.promisePool.execute(
    `CREATE UNIQUE INDEX uq_sa_org_contact_email ON pro_shule_avance_organizations (contact_email)`
  ).catch(() => {});
  await db.promisePool
    .execute(
      `ALTER TABLE pro_shule_avance_organizations
       ADD COLUMN applicant_categories_json JSON NULL COMMENT 'Allowed applicant types e.g. ["PARENT","TEACHER"]'`
    )
    .catch((e) => {
      if (!String(e.message || '').includes('Duplicate column')) {
        console.warn('[shuleAvanceOrgSchema] applicant_categories_json:', e.message);
      }
    });
  await db.promisePool
    .execute(
      `ALTER TABLE pro_shule_avance_organizations
       ADD COLUMN rate_percent DECIMAL(7,3) NULL COMMENT 'Annual rate in percent, e.g. 12.5 for 12.5%'`
    )
    .catch((e) => {
      if (!String(e.message || '').includes('Duplicate column')) {
        console.warn('[shuleAvanceOrgSchema] rate_percent:', e.message);
      }
    });
  await db.promisePool
    .execute(
      `ALTER TABLE pro_shule_avance_organizations
       ADD COLUMN rate_is_monthly TINYINT(1) NOT NULL DEFAULT 0 COMMENT '1 when rate_percent is monthly rate'`
    )
    .catch((e) => {
      if (!String(e.message || '').includes('Duplicate column')) {
        console.warn('[shuleAvanceOrgSchema] rate_is_monthly:', e.message);
      }
    });
  await db.promisePool
    .execute(
      `ALTER TABLE pro_shule_avance_organizations
       ADD COLUMN disbursement_account_type VARCHAR(24) NOT NULL DEFAULT 'SCHOOL_ACCOUNT'
       COMMENT 'Where financed money is put: PERSONAL_ACCOUNT | SCHOOL_ACCOUNT | OTHER'`
    )
    .catch((e) => {
      if (!String(e.message || '').includes('Duplicate column')) {
        console.warn('[shuleAvanceOrgSchema] disbursement_account_type:', e.message);
      }
    });
  ready = true;
}

module.exports = { ensureShuleAvanceOrgTables, ensureShuleAvancePartnerRole };
