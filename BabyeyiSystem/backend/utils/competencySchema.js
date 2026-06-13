'use strict';

const { promisePool } = require('../config/database');

const DEFAULT_CATEGORIES = [
  'Communication',
  'Problem Solving',
  'Research Skills',
  'Collaboration',
  'Leadership',
];

const RATING_LEVELS = ['Excellent', 'Very Good', 'Good', 'Needs Improvement'];

let ready = false;

async function ensureCompetencyTables() {
  if (ready) return;

  await promisePool.query(`
    CREATE TABLE IF NOT EXISTS school_competency_categories (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      school_id INT UNSIGNED NOT NULL,
      name VARCHAR(120) NOT NULL,
      sort_order INT NOT NULL DEFAULT 0,
      is_active TINYINT(1) NOT NULL DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_school_competency_name (school_id, name),
      INDEX idx_school_comp_order (school_id, sort_order)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  await promisePool.query(`
    CREATE TABLE IF NOT EXISTS student_competency_ratings (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      school_id INT UNSIGNED NOT NULL,
      student_id INT UNSIGNED NOT NULL,
      category_id INT UNSIGNED NOT NULL,
      academic_year VARCHAR(32) NOT NULL,
      term VARCHAR(32) NOT NULL,
      class_name VARCHAR(120) NULL,
      rating VARCHAR(40) NOT NULL,
      teacher_user_id INT UNSIGNED NULL,
      teacher_assignment_id INT UNSIGNED NULL,
      recorded_by_user_id INT UNSIGNED NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_student_comp_rating (school_id, student_id, category_id, academic_year, term),
      INDEX idx_comp_class_term (school_id, class_name, academic_year, term)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  ready = true;
}

async function seedDefaultCompetencyCategoriesIfEmpty(schoolId) {
  await ensureCompetencyTables();
  const [[row]] = await promisePool.query(
    'SELECT COUNT(*) AS c FROM school_competency_categories WHERE school_id = ?',
    [schoolId],
  );
  if (Number(row?.c) > 0) return;
  let order = 1;
  for (const name of DEFAULT_CATEGORIES) {
    await promisePool.query(
      `INSERT INTO school_competency_categories (school_id, name, sort_order, is_active)
       VALUES (?,?,?,1)`,
      [schoolId, name, order],
    );
    order += 1;
  }
}

async function listCompetencyCategories(schoolId, { activeOnly = true } = {}) {
  await seedDefaultCompetencyCategoriesIfEmpty(schoolId);
  let sql = 'SELECT * FROM school_competency_categories WHERE school_id = ?';
  if (activeOnly) sql += ' AND is_active = 1';
  sql += ' ORDER BY sort_order ASC, id ASC';
  const [rows] = await promisePool.query(sql, [schoolId]);
  return rows;
}

module.exports = {
  RATING_LEVELS,
  DEFAULT_CATEGORIES,
  ensureCompetencyTables,
  seedDefaultCompetencyCategoriesIfEmpty,
  listCompetencyCategories,
};
