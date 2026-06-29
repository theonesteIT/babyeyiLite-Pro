#!/usr/bin/env node
/**
 * Seed core roles + a school SUPER_ADMIN account (idempotent).
 * Credentials and secrets must be set in .env — never hardcode passwords in this file.
 *
 * Required in BabyeyiSystem/backend/.env:
 *   BOOTSTRAP_SCHOOL_ADMIN_EMAIL
 *   BOOTSTRAP_SCHOOL_ADMIN_PASSWORD
 *
 * Optional:
 *   BOOTSTRAP_SCHOOL_NAME, BOOTSTRAP_SCHOOL_PROVINCE, BOOTSTRAP_SCHOOL_DISTRICT,
 *   BOOTSTRAP_SCHOOL_SECTOR, BOOTSTRAP_SCHOOL_PHONE
 *
 *   cd BabyeyiSystem/backend && node scripts/bootstrap-st-theo-school.js
 */
'use strict';

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const bcrypt = require('bcryptjs');
const { promisePool } = require('../config/database');
const { ensureCoreAuthSchema } = require('../utils/coreAuthSchema');
const { ensureCoreRoles } = require('../utils/coreRolesSchema');
const { ensureSchoolsTable } = require('../utils/schoolsSchema');
const { getDistrictCode, formatSchoolCode } = require('../utils/rwandaDistrictCodes');

function loadBootstrapConfig() {
  const email = String(process.env.BOOTSTRAP_SCHOOL_ADMIN_EMAIL || '').trim().toLowerCase();
  const password = String(process.env.BOOTSTRAP_SCHOOL_ADMIN_PASSWORD || '');

  if (!email || !password) {
    throw new Error(
      'Set BOOTSTRAP_SCHOOL_ADMIN_EMAIL and BOOTSTRAP_SCHOOL_ADMIN_PASSWORD in .env before running this script.',
    );
  }

  return {
    email,
    password,
    schoolName: String(process.env.BOOTSTRAP_SCHOOL_NAME || 'St Theo School').trim(),
    province: String(process.env.BOOTSTRAP_SCHOOL_PROVINCE || 'Kigali City').trim(),
    district: String(process.env.BOOTSTRAP_SCHOOL_DISTRICT || 'Gasabo').trim(),
    sector: String(process.env.BOOTSTRAP_SCHOOL_SECTOR || 'Remera').trim(),
    phone: String(process.env.BOOTSTRAP_SCHOOL_PHONE || '0780000000').trim(),
    firstName: String(process.env.BOOTSTRAP_SCHOOL_ADMIN_FIRST_NAME || 'St Theo').trim(),
    lastName: String(process.env.BOOTSTRAP_SCHOOL_ADMIN_LAST_NAME || 'School').trim(),
  };
}

function generateUserUID(prefix = 'SA') {
  const ts = Date.now().toString().slice(-6);
  const rnd = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `${prefix}-${ts}${rnd}`;
}

async function getNextDistrictSchoolCode(conn, districtCode) {
  const dd = String(districtCode || '').padStart(2, '0').slice(-2);
  const [rows] = await conn.query(
    `SELECT school_code, district_code FROM schools
     WHERE deleted_at IS NULL AND (district_code = ? OR school_code LIKE ?)`,
    [dd, `${dd}%`],
  );
  let max = 0;
  for (const r of rows) {
    const exact = String(r.school_code || '').match(new RegExp(`^${dd}([0-9]{3})$`));
    let n = exact ? parseInt(exact[1], 10) : NaN;
    if (Number.isNaN(n)) {
      const slash = String(r.school_code || '').match(new RegExp(`^${dd}\\/([0-9]{3})$`));
      if (slash) n = parseInt(slash[1], 10);
    }
    if (!Number.isNaN(n) && n > max) max = n;
  }
  return formatSchoolCode(dd, max + 1);
}

async function main() {
  const cfg = loadBootstrapConfig();

  await ensureCoreAuthSchema();
  await ensureCoreRoles();
  await ensureSchoolsTable();

  const conn = await promisePool.getConnection();
  try {
    await conn.beginTransaction();

    const [[saRole]] = await conn.query(
      "SELECT id FROM roles WHERE role_code = 'SUPER_ADMIN' LIMIT 1",
    );
    if (!saRole) throw new Error('SUPER_ADMIN role missing after seed');

    let userId;
    const [[existingUser]] = await conn.query(
      'SELECT id, role_id FROM users WHERE email = ? AND deleted_at IS NULL LIMIT 1',
      [cfg.email],
    );

    if (existingUser) {
      userId = existingUser.id;
      await conn.query('UPDATE users SET role_id = ?, is_active = 1, is_verified = 1 WHERE id = ?', [
        saRole.id,
        userId,
      ]);
      const hash = await bcrypt.hash(cfg.password, 10);
      await conn.query('UPDATE users SET password_hash = ? WHERE id = ?', [hash, userId]);
      console.log(`Updated existing user ${cfg.email} → SUPER_ADMIN`);
    } else {
      const hash = await bcrypt.hash(cfg.password, 10);
      const userUid = generateUserUID('SA');
      const [userRes] = await conn.query(
        `INSERT INTO users
           (user_uid, email, password_hash, first_name, last_name,
            province, district, sector, role_id, is_active, is_verified, created_at)
         VALUES (?,?,?,?,?,?,?,?,?,1,1,NOW())`,
        [userUid, cfg.email, hash, cfg.firstName, cfg.lastName, cfg.province, cfg.district, cfg.sector, saRole.id],
      );
      userId = userRes.insertId;
      console.log(`Created SUPER_ADMIN: ${cfg.email} (id=${userId})`);
    }

    const districtCode = getDistrictCode(cfg.district);
    let schoolId;
    const [[existingSchool]] = await conn.query(
      'SELECT id FROM schools WHERE email = ? AND deleted_at IS NULL LIMIT 1',
      [cfg.email],
    );

    if (existingSchool) {
      schoolId = existingSchool.id;
      await conn.query(
        `UPDATE schools SET school_name = ?, admin_id = ?, manager_user_id = ?,
         province = ?, district = ?, district_code = ?, sector = ?, status = 'active', is_active = 1
         WHERE id = ?`,
        [cfg.schoolName, userId, userId, cfg.province, cfg.district, districtCode, cfg.sector, schoolId],
      );
      console.log(`Updated school id=${schoolId} (${cfg.schoolName})`);
    } else {
      const schoolCode = await getNextDistrictSchoolCode(conn, districtCode);
      const [schoolRes] = await conn.query(
        `INSERT INTO schools (
          school_name, school_code, education_levels, school_category, ownership_type,
          province, district, district_code, sector, cell, village, full_address,
          phone, email, head_teacher_name, head_teacher_phone, head_teacher_email,
          admin_id, manager_user_id, status, is_active, subscription_plan, pro_enabled,
          created_at, updated_at
        ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,'active',1,'pro',1,NOW(),NOW())`,
        [
          cfg.schoolName,
          schoolCode,
          JSON.stringify(['Primary', 'Secondary']),
          'Day',
          'Private',
          cfg.province,
          cfg.district,
          districtCode,
          cfg.sector,
          cfg.sector,
          cfg.sector,
          `${cfg.sector}, ${cfg.district}, ${cfg.province}`,
          cfg.phone,
          cfg.email,
          cfg.schoolName,
          cfg.phone,
          cfg.email,
          userId,
          userId,
        ],
      );
      schoolId = schoolRes.insertId;
      console.log(`Created school: ${cfg.schoolName} (id=${schoolId}, code=${schoolCode})`);
    }

    await conn.query('UPDATE users SET school_id = ? WHERE id = ?', [schoolId, userId]).catch(() => {});

    await conn.commit();
    console.log('\n✅  Bootstrap complete');
    console.log(`   Email:  ${cfg.email}`);
    console.log(`   Role:   SUPER_ADMIN`);
    console.log(`   School: ${cfg.schoolName} (id=${schoolId})`);
    console.log('   Password was set from BOOTSTRAP_SCHOOL_ADMIN_PASSWORD in .env (not printed).');
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
    await promisePool.end();
  }
}

main().catch((e) => {
  console.error('❌', e.message);
  process.exit(1);
});
