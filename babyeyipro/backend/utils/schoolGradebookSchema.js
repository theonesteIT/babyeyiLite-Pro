'use strict';

const { promisePool } = require('../config/database');

async function ensureSchoolGradebookSchema() {
  await promisePool.query(`
    CREATE TABLE IF NOT EXISTS school_gradebook_columns (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      school_id INT UNSIGNED NOT NULL,
      slug VARCHAR(40) NOT NULL,
      label VARCHAR(120) NOT NULL,
      sort_order INT NOT NULL DEFAULT 0,
      default_max_score DECIMAL(8,2) NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uq_school_slug (school_id, slug),
      INDEX idx_school_order (school_id, sort_order)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  await promisePool
    .query(
      'ALTER TABLE academic_assessments ADD COLUMN column_slug VARCHAR(40) NULL AFTER assessment_type'
    )
    .catch(() => {});
}

async function seedDefaultGradebookColumnsIfEmpty(schoolId) {
  const [[row]] = await promisePool.query(
    'SELECT COUNT(*) AS c FROM school_gradebook_columns WHERE school_id = ?',
    [schoolId]
  );
  if (Number(row?.c) > 0) return;
  await promisePool.query(
    `INSERT INTO school_gradebook_columns (school_id, slug, label, sort_order, default_max_score) VALUES
     (?, 'cat1', 'CAT 1', 1, 30),
     (?, 'cat2', 'CAT 2', 2, 30),
     (?, 'exam', 'Examination', 3, 40)`,
    [schoolId, schoolId, schoolId]
  );
}

module.exports = {
  ensureSchoolGradebookSchema,
  seedDefaultGradebookColumnsIfEmpty,
};
