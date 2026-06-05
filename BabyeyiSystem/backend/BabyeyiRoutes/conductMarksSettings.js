'use strict';

/**
 * School conduct marks bounds (minimum floor + maximum / default starting balance).
 * Shared by discipline portal and DOS student promotion.
 */

const { promisePool } = require('../config/database');

let columnsReady = false;

async function columnExists(tableName, columnName) {
  const [[row]] = await promisePool.query(
    `SELECT 1 AS ok FROM information_schema.columns
     WHERE table_schema = DATABASE()
       AND table_name = ?
       AND column_name = ?
     LIMIT 1`,
    [tableName, columnName]
  );
  return !!row;
}

async function ensureColumn(tableName, columnName, ddl) {
  if (await columnExists(tableName, columnName)) return;
  await promisePool.query(ddl);
}

async function ensureConductMarksColumns() {
  if (columnsReady) return;
  await promisePool.query(`
    CREATE TABLE IF NOT EXISTS school_discipline_default_marks (
      school_id INT UNSIGNED NOT NULL PRIMARY KEY,
      default_marks DECIMAL(8,2) NOT NULL DEFAULT 40.00,
      minimum_marks DECIMAL(8,2) NOT NULL DEFAULT 0.00,
      last_updated DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      updated_by INT UNSIGNED NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
  await ensureColumn(
    'school_discipline_default_marks',
    'minimum_marks',
    `ALTER TABLE school_discipline_default_marks
     ADD COLUMN minimum_marks DECIMAL(8,2) NOT NULL DEFAULT 0.00`
  );
  columnsReady = true;
}

async function syncConductMaxMarks(schoolId, maxMarks, userId = null) {
  await promisePool.query(
    `INSERT INTO school_discipline_settings (school_id, total_marks, updated_by_user_id)
     VALUES (?,?,?)
     ON DUPLICATE KEY UPDATE
       total_marks = VALUES(total_marks),
       updated_by_user_id = VALUES(updated_by_user_id)`,
    [schoolId, maxMarks, userId]
  );
}

async function getConductBoundsForSchool(schoolId) {
  await ensureConductMarksColumns();
  const sid = Number(schoolId);
  if (!sid) {
    return { default_marks: 40, max_marks: 40, minimum_marks: 0, min_marks: 0 };
  }

  const hasMinimumMarks = await columnExists('school_discipline_default_marks', 'minimum_marks');
  const [[row]] = await promisePool.query(
    hasMinimumMarks
      ? `SELECT default_marks, minimum_marks, last_updated, updated_by
         FROM school_discipline_default_marks
         WHERE school_id = ?
         LIMIT 1`
      : `SELECT default_marks, last_updated, updated_by
         FROM school_discipline_default_marks
         WHERE school_id = ?
         LIMIT 1`,
    [sid]
  );

  if (row && row.default_marks != null) {
    const max = Number(row.default_marks);
    const min = hasMinimumMarks ? Number(row.minimum_marks ?? 0) : 0;
    return {
      default_marks: max,
      max_marks: max,
      minimum_marks: Number.isFinite(min) ? min : 0,
      min_marks: Number.isFinite(min) ? min : 0,
      last_updated: row.last_updated || null,
      updated_by: row.updated_by || null,
    };
  }

  const [[legacy]] = await promisePool.query(
    'SELECT total_marks FROM school_discipline_settings WHERE school_id = ? LIMIT 1',
    [sid]
  );
  const max = legacy?.total_marks != null ? Number(legacy.total_marks) : 40;
  return {
    default_marks: max,
    max_marks: max,
    minimum_marks: 0,
    min_marks: 0,
    last_updated: null,
    updated_by: null,
  };
}

async function saveConductBoundsForSchool(
  schoolId,
  { default_marks: defaultMarks, minimum_marks: minimumMarks },
  userId
) {
  await ensureConductMarksColumns();
  const max = Number(defaultMarks);
  const min = Number(minimumMarks ?? 0);
  if (Number.isNaN(max) || max < 1 || max > 10000) {
    const err = new Error('default_marks must be a number between 1 and 10000.');
    err.status = 400;
    throw err;
  }
  if (Number.isNaN(min) || min < 0 || min > 10000) {
    const err = new Error('minimum_marks must be a number between 0 and 10000.');
    err.status = 400;
    throw err;
  }
  if (min > max) {
    const err = new Error('minimum_marks cannot be greater than default_marks (maximum).');
    err.status = 400;
    throw err;
  }

  await promisePool.query(
    `INSERT INTO school_discipline_default_marks (school_id, default_marks, minimum_marks, updated_by)
     VALUES (?,?,?,?)
     ON DUPLICATE KEY UPDATE
       default_marks = VALUES(default_marks),
       minimum_marks = VALUES(minimum_marks),
       updated_by = VALUES(updated_by)`,
    [schoolId, max, min, userId]
  );
  await syncConductMaxMarks(schoolId, max, userId);
  return getConductBoundsForSchool(schoolId);
}

async function getConductMaxMarks(schoolId) {
  const bounds = await getConductBoundsForSchool(schoolId);
  return bounds.max_marks;
}

module.exports = {
  ensureConductMarksColumns,
  getConductBoundsForSchool,
  saveConductBoundsForSchool,
  getConductMaxMarks,
  syncConductMaxMarks,
};
