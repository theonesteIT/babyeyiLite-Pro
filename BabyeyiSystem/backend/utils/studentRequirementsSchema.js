'use strict';

const { promisePool } = require('../config/database');

async function runDDL(sql) {
  try {
    await promisePool.query(sql);
  } catch (e) {
    if (e.code === 'ER_DUP_FIELDNAME' || e.code === 'ER_DUP_KEYNAME' || e.code === 'ER_DUP_INDEX') return;
    throw e;
  }
}

async function ensureStudentRequirementsTable() {
  await promisePool.query(`
    CREATE TABLE IF NOT EXISTS student_requirements (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(300) NOT NULL,
      description TEXT NULL,
      quantity VARCHAR(50) NULL,
      default_price DECIMAL(12,2) NULL DEFAULT NULL,
      image_url VARCHAR(512) NULL DEFAULT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_student_req_name (name(255))
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await runDDL('ALTER TABLE student_requirements ADD COLUMN default_price DECIMAL(12,2) NULL DEFAULT NULL AFTER name');
  await runDDL('ALTER TABLE student_requirements ADD COLUMN image_url VARCHAR(512) NULL DEFAULT NULL AFTER default_price');
  await runDDL('ALTER TABLE student_requirements ADD COLUMN description TEXT NULL');
  await runDDL('ALTER TABLE student_requirements ADD COLUMN quantity VARCHAR(50) NULL');
}

async function seedStudentRequirementsIfEmpty() {
  const [[row]] = await promisePool.query('SELECT COUNT(*) AS c FROM student_requirements');
  if (Number(row?.c) > 0) return;

  try {
    const [fromBabyeyi] = await promisePool.query(
      `SELECT DISTINCT TRIM(item) AS name
       FROM babyeyi_student_requirements
       WHERE item IS NOT NULL AND TRIM(item) != ''`,
    );
    if (fromBabyeyi.length) {
      for (const r of fromBabyeyi) {
        if (!r.name) continue;
        await promisePool.query('INSERT IGNORE INTO student_requirements (name) VALUES (?)', [r.name]);
      }
      return;
    }
  } catch (_) {
    /* babyeyi_student_requirements may not exist yet */
  }

  const defaults = [
    ['Exercise Books', 'A4 ruled, 80gsm', '2 per term'],
    ['School Uniform', 'Complete set', '1 set'],
    ['Mathematical Set', 'Geometry instruments', '1'],
    ['Pens & Pencils', 'Blue/black pens, HB pencils', 'As needed'],
    ['School Bag', 'Standard backpack', '1'],
  ];
  for (const [name, description, quantity] of defaults) {
    await promisePool.query(
      'INSERT IGNORE INTO student_requirements (name, description, quantity) VALUES (?,?,?)',
      [name, description, quantity],
    );
  }
}

async function fetchStudentRequirementsCatalog() {
  await ensureStudentRequirementsTable();
  await seedStudentRequirementsIfEmpty();

  try {
    const [rows] = await promisePool.query(
      'SELECT id, name, description, quantity FROM student_requirements ORDER BY id ASC',
    );
    return rows || [];
  } catch (e) {
    if (e.code !== 'ER_BAD_FIELD_ERROR') throw e;
    const [rows] = await promisePool.query('SELECT id, name FROM student_requirements ORDER BY id ASC');
    return (rows || []).map((r) => ({ ...r, description: null, quantity: null }));
  }
}

module.exports = {
  ensureStudentRequirementsTable,
  seedStudentRequirementsIfEmpty,
  fetchStudentRequirementsCatalog,
};
