'use strict';

const { promisePool } = require('../config/database');

const DEFAULT_WEIGHTS = {
  marks_weight: 40,
  attendance_weight: 20,
  behaviour_weight: 15,
  homework_weight: 15,
  participation_weight: 10,
};

let tableReady = false;

async function ensureAcademicHealthTable() {
  if (tableReady) return;
  await promisePool.query(`
    CREATE TABLE IF NOT EXISTS school_academic_health_weights (
      school_id INT UNSIGNED NOT NULL PRIMARY KEY,
      marks_weight DECIMAL(5,2) NOT NULL DEFAULT 40,
      attendance_weight DECIMAL(5,2) NOT NULL DEFAULT 20,
      behaviour_weight DECIMAL(5,2) NOT NULL DEFAULT 15,
      homework_weight DECIMAL(5,2) NOT NULL DEFAULT 15,
      participation_weight DECIMAL(5,2) NOT NULL DEFAULT 10,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
  tableReady = true;
}

function normalizeWeights(row = {}) {
  return {
    marks_weight: Number(row.marks_weight ?? DEFAULT_WEIGHTS.marks_weight),
    attendance_weight: Number(row.attendance_weight ?? DEFAULT_WEIGHTS.attendance_weight),
    behaviour_weight: Number(row.behaviour_weight ?? DEFAULT_WEIGHTS.behaviour_weight),
    homework_weight: Number(row.homework_weight ?? DEFAULT_WEIGHTS.homework_weight),
    participation_weight: Number(row.participation_weight ?? DEFAULT_WEIGHTS.participation_weight),
  };
}

function formulaExpression(weights) {
  const w = normalizeWeights(weights);
  return `Health = (Marks × ${w.marks_weight}%) + (Attendance × ${w.attendance_weight}%) + (Behaviour × ${w.behaviour_weight}%) + (Homework × ${w.homework_weight}%) + (Participation × ${w.participation_weight}%)`;
}

async function getSchoolAcademicHealthWeights(schoolId) {
  await ensureAcademicHealthTable();
  const [[row]] = await promisePool.query(
    'SELECT * FROM school_academic_health_weights WHERE school_id = ? LIMIT 1',
    [schoolId],
  );
  const weights = normalizeWeights(row || DEFAULT_WEIGHTS);
  return { ...weights, formula: formulaExpression(weights) };
}

async function saveSchoolAcademicHealthWeights(schoolId, payload) {
  await ensureAcademicHealthTable();
  const weights = normalizeWeights(payload);
  const total = weights.marks_weight + weights.attendance_weight + weights.behaviour_weight
    + weights.homework_weight + weights.participation_weight;
  if (Math.abs(total - 100) > 0.05) {
    throw new Error('Academic health weights must total 100%');
  }
  await promisePool.query(
    `INSERT INTO school_academic_health_weights
       (school_id, marks_weight, attendance_weight, behaviour_weight, homework_weight, participation_weight)
     VALUES (?,?,?,?,?,?)
     ON DUPLICATE KEY UPDATE
       marks_weight = VALUES(marks_weight),
       attendance_weight = VALUES(attendance_weight),
       behaviour_weight = VALUES(behaviour_weight),
       homework_weight = VALUES(homework_weight),
       participation_weight = VALUES(participation_weight)`,
    [schoolId, weights.marks_weight, weights.attendance_weight, weights.behaviour_weight,
      weights.homework_weight, weights.participation_weight],
  );
  return getSchoolAcademicHealthWeights(schoolId);
}

module.exports = {
  DEFAULT_WEIGHTS,
  formulaExpression,
  getSchoolAcademicHealthWeights,
  saveSchoolAcademicHealthWeights,
};
