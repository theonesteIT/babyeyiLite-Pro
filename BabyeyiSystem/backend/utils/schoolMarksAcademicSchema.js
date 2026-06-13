'use strict';

const { promisePool } = require('../config/database');
const { ensureSchoolGradebookSchema, seedDefaultGradebookColumnsIfEmpty } = require('./schoolGradebookSchema');
const { ensureAcademicMarksSchemaIntegrity } = require('./academicMarksSchemaRepair');

const DEFAULT_ASSESSMENT_TYPES = [
  { name: 'Homework', slug: 'homework', weight_percent: 10, sort_order: 1 },
  { name: 'Quiz', slug: 'quiz', weight_percent: 10, sort_order: 2 },
  { name: 'Class Test (CAT)', slug: 'cat', weight_percent: 20, sort_order: 3 },
  { name: 'Project', slug: 'project', weight_percent: 10, sort_order: 4 },
  { name: 'Practical', slug: 'practical', weight_percent: 10, sort_order: 5 },
  { name: 'Mid-Term Exam', slug: 'mid_term', weight_percent: 15, sort_order: 6 },
  { name: 'End-Term Exam', slug: 'end_term', weight_percent: 25, sort_order: 7 },
];

async function ensureSchoolMarksAcademicTables() {
  await ensureSchoolGradebookSchema();
  await ensureAcademicMarksSchemaIntegrity();

  await promisePool.query(`
    CREATE TABLE IF NOT EXISTS school_class_subjects (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      school_id INT UNSIGNED NOT NULL,
      class_name VARCHAR(120) NOT NULL,
      subject_id INT UNSIGNED NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uq_school_class_subject (school_id, class_name, subject_id),
      INDEX idx_school_class (school_id, class_name)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  await promisePool.query(`
    CREATE TABLE IF NOT EXISTS school_assessment_types (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      school_id INT UNSIGNED NOT NULL,
      name VARCHAR(120) NOT NULL,
      slug VARCHAR(40) NOT NULL,
      weight_percent DECIMAL(5,2) NOT NULL DEFAULT 0,
      sort_order INT NOT NULL DEFAULT 0,
      is_active TINYINT(1) NOT NULL DEFAULT 1,
      school_level VARCHAR(32) NOT NULL DEFAULT 'ALL',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_school_level_slug (school_id, school_level, slug),
      INDEX idx_school_level_order (school_id, school_level, sort_order)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
}

async function seedDefaultAssessmentTypesIfEmpty(schoolId, schoolLevel = 'ALL') {
  const [[row]] = await promisePool.query(
    'SELECT COUNT(*) AS c FROM school_assessment_types WHERE school_id = ? AND school_level = ?',
    [schoolId, schoolLevel]
  );
  if (Number(row?.c) > 0) return;

  for (const t of DEFAULT_ASSESSMENT_TYPES) {
    await promisePool.query(
      `INSERT INTO school_assessment_types (school_id, name, slug, weight_percent, sort_order, is_active, school_level)
       VALUES (?,?,?,?,?,1,?)`,
      [schoolId, t.name, t.slug, t.weight_percent, t.sort_order, schoolLevel]
    );
  }
  await syncAssessmentTypesToGradebookColumns(schoolId);
}

async function syncAssessmentTypesToGradebookColumns(schoolId) {
  const [types] = await promisePool.query(
    `SELECT slug, name, sort_order, weight_percent FROM school_assessment_types
     WHERE school_id = ? AND is_active = 1
     ORDER BY sort_order ASC, id ASC`,
    [schoolId]
  );
  for (const t of types) {
    await promisePool.query(
      `INSERT INTO school_gradebook_columns (school_id, slug, label, sort_order, default_max_score)
       VALUES (?,?,?,?,?)
       ON DUPLICATE KEY UPDATE label=VALUES(label), sort_order=VALUES(sort_order), default_max_score=VALUES(default_max_score)`,
      [schoolId, t.slug, t.name, t.sort_order, t.weight_percent]
    );
  }
}

function slugifyAssessmentName(name) {
  return String(name || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 40) || 'type';
}

module.exports = {
  ensureSchoolMarksAcademicTables,
  seedDefaultAssessmentTypesIfEmpty,
  syncAssessmentTypesToGradebookColumns,
  slugifyAssessmentName,
  DEFAULT_ASSESSMENT_TYPES,
};
