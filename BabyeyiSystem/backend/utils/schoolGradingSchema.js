'use strict';

const { promisePool } = require('../config/database');

/** Default Rwanda-style letter bands (DOS can edit per school). */
const DEFAULT_GRADE_BANDS = [
  { letter: 'A', min_percent: 80, max_percent: 100, remark: 'EXCELLENT' },
  { letter: 'B', min_percent: 75, max_percent: 79, remark: 'VERY GOOD' },
  { letter: 'C', min_percent: 70, max_percent: 74, remark: 'GOOD' },
  { letter: 'D', min_percent: 60, max_percent: 69, remark: 'SATISFACTORY' },
  { letter: 'E', min_percent: 50, max_percent: 59, remark: 'ADEQUATE' },
  { letter: 'F', min_percent: 0, max_percent: 49, remark: 'FAIR' },
];

let tableReady = false;

async function ensureSchoolGradingTable() {
  if (tableReady) return;
  await promisePool.query(`
    CREATE TABLE IF NOT EXISTS school_grading_bands (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      school_id INT UNSIGNED NOT NULL,
      letter CHAR(1) NOT NULL,
      min_percent DECIMAL(5,2) NOT NULL,
      max_percent DECIMAL(5,2) NOT NULL,
      remark VARCHAR(80) NOT NULL,
      sort_order INT NOT NULL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_school_grade_letter (school_id, letter),
      INDEX idx_school_grade_order (school_id, sort_order)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
  tableReady = true;
}

async function seedDefaultGradingBandsIfEmpty(schoolId) {
  await ensureSchoolGradingTable();
  const [[row]] = await promisePool.query(
    'SELECT COUNT(*) AS c FROM school_grading_bands WHERE school_id = ?',
    [schoolId],
  );
  if (Number(row?.c) > 0) return;
  let order = 1;
  for (const band of DEFAULT_GRADE_BANDS) {
    await promisePool.query(
      `INSERT INTO school_grading_bands (school_id, letter, min_percent, max_percent, remark, sort_order)
       VALUES (?,?,?,?,?,?)`,
      [schoolId, band.letter, band.min_percent, band.max_percent, band.remark, order],
    );
    order += 1;
  }
}

async function getSchoolGradingScale(schoolId) {
  await seedDefaultGradingBandsIfEmpty(schoolId);
  const [rows] = await promisePool.query(
    `SELECT letter, min_percent, max_percent, remark, sort_order
     FROM school_grading_bands WHERE school_id = ?
     ORDER BY sort_order ASC, min_percent DESC`,
    [schoolId],
  );
  return rows.map((r) => ({
    letter: String(r.letter).toUpperCase(),
    min_percent: Number(r.min_percent),
    max_percent: Number(r.max_percent),
    remark: String(r.remark || '').trim(),
    sort_order: Number(r.sort_order) || 0,
  }));
}

async function saveSchoolGradingScale(schoolId, bands) {
  await ensureSchoolGradingTable();
  if (!Array.isArray(bands) || !bands.length) {
    throw new Error('bands[] required');
  }
  await promisePool.query('DELETE FROM school_grading_bands WHERE school_id = ?', [schoolId]);
  let order = 1;
  for (const b of bands) {
    const letter = String(b.letter || '').trim().toUpperCase().slice(0, 1);
    const min = Number(b.min_percent);
    const max = Number(b.max_percent);
    const remark = String(b.remark || '').trim();
    if (!letter || !Number.isFinite(min) || !Number.isFinite(max) || !remark) continue;
    await promisePool.query(
      `INSERT INTO school_grading_bands (school_id, letter, min_percent, max_percent, remark, sort_order)
       VALUES (?,?,?,?,?,?)`,
      [schoolId, letter, min, max, remark, order],
    );
    order += 1;
  }
  return getSchoolGradingScale(schoolId);
}

function gradeFromPercent(pct, bands = DEFAULT_GRADE_BANDS) {
  if (pct == null || !Number.isFinite(Number(pct))) return null;
  const v = Number(pct);
  const sorted = [...(bands || DEFAULT_GRADE_BANDS)].sort((a, b) => b.min_percent - a.min_percent);
  for (const band of sorted) {
    if (v >= Number(band.min_percent) && v <= Number(band.max_percent)) {
      return String(band.letter).toUpperCase();
    }
  }
  const lowest = sorted[sorted.length - 1];
  return lowest ? String(lowest.letter).toUpperCase() : 'F';
}

function gradeRemark(grade, bands = DEFAULT_GRADE_BANDS) {
  if (!grade) return null;
  const g = String(grade).toUpperCase().slice(0, 1);
  const band = (bands || DEFAULT_GRADE_BANDS).find((b) => String(b.letter).toUpperCase() === g);
  return band?.remark || null;
}

function enrichSubjectRowGrades(row, bands) {
  const grade = gradeFromPercent(row.average, bands);
  return {
    ...row,
    grade,
    grade_remark: gradeRemark(grade, bands),
  };
}

module.exports = {
  DEFAULT_GRADE_BANDS,
  ensureSchoolGradingTable,
  seedDefaultGradingBandsIfEmpty,
  getSchoolGradingScale,
  saveSchoolGradingScale,
  gradeFromPercent,
  gradeRemark,
  enrichSubjectRowGrades,
};
