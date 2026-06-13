'use strict';

const { promisePool } = require('../config/database');

let repairChecked = false;

function tableDdlHasIdAutoIncrementPrimaryKey(ddl) {
  if (!ddl) return false;
  return /PRIMARY KEY\s*\(\s*`id`\s*\)/i.test(ddl)
    && /`id`\s+int[^,]*AUTO_INCREMENT/i.test(ddl);
}

function tableDdlHasMarkUniqueKey(ddl) {
  if (!ddl) return false;
  return /UNIQUE KEY\s+`?uq_student_assessment`?\s*\(\s*`assessment_id`\s*,\s*`student_id`\s*\)/i.test(ddl);
}

async function fetchCreateTable(tableName) {
  const [rows] = await promisePool.query(`SHOW CREATE TABLE \`${tableName}\``);
  return rows[0]?.['Create Table'] || '';
}

async function assignSequentialIds(tableName, whereClause = 'id = 0') {
  const [rows] = await promisePool.query(
    `SELECT id FROM \`${tableName}\` WHERE ${whereClause} ORDER BY created_at ASC, id ASC`
  );
  if (!rows.length) return 0;

  const [[maxRow]] = await promisePool.query(
    `SELECT COALESCE(MAX(id), 0) AS m FROM \`${tableName}\` WHERE id > 0`
  );
  let nextId = Math.max(Number(maxRow?.m) || 0, 0) + 1;

  if (tableName === 'academic_assessments') {
    const [detailRows] = await promisePool.query(
      `SELECT school_id, class_name, subject_name, assessment_name, column_slug
       FROM academic_assessments
       WHERE ${whereClause}
       ORDER BY created_at ASC, school_id, class_name, subject_name, assessment_name, column_slug`
    );
    for (const row of detailRows) {
      await promisePool.query(
        `UPDATE academic_assessments SET id = ?
         WHERE id = 0 AND school_id = ? AND class_name = ? AND subject_name = ?
           AND assessment_name = ? AND (column_slug <=> ?)
         LIMIT 1`,
        [nextId++, row.school_id, row.class_name, row.subject_name, row.assessment_name, row.column_slug]
      );
    }
    return detailRows.length;
  }

  await promisePool.query(
    `ALTER TABLE \`${tableName}\` ADD COLUMN _repair_seq INT UNSIGNED NULL`
  ).catch((e) => {
    if (e.code !== 'ER_DUP_FIELDNAME') throw e;
  });
  await promisePool.query('SET @repair_seq := 0');
  await promisePool.query(
    `UPDATE \`${tableName}\` SET _repair_seq = (@repair_seq := @repair_seq + 1)
     WHERE ${whereClause}
     ORDER BY created_at ASC, school_id, student_id, assessment_id`
  );
  await promisePool.query(
    `UPDATE \`${tableName}\` SET id = _repair_seq WHERE ${whereClause} AND _repair_seq IS NOT NULL`
  );
  await promisePool.query(
    `ALTER TABLE \`${tableName}\` DROP COLUMN _repair_seq`
  ).catch(() => {});

  return rows.length;
}

async function repairAcademicAssessmentsTable() {
  const ddl = await fetchCreateTable('academic_assessments');
  if (!ddl) return { repaired: false };

  const needsRepair = !tableDdlHasIdAutoIncrementPrimaryKey(ddl);
  if (!needsRepair) return { repaired: false };

  const [[zeroRows]] = await promisePool.query(
    'SELECT COUNT(*) AS c FROM academic_assessments WHERE id = 0'
  );
  let reassigned = 0;
  if (Number(zeroRows?.c) > 0) {
    reassigned = await assignSequentialIds('academic_assessments', 'id = 0');
  }

  // Marks tied to assessment_id=0 cannot be mapped back to individual assessments.
  const [delMarks] = await promisePool.query(
    'DELETE FROM academic_marks WHERE assessment_id = 0'
  );

  await promisePool.query(
    'ALTER TABLE academic_assessments MODIFY id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY'
  );

  return {
    repaired: true,
    assessments_reassigned: reassigned,
    orphan_marks_deleted: delMarks.affectedRows || 0,
  };
}

async function repairAcademicMarksTable() {
  const ddl = await fetchCreateTable('academic_marks');
  if (!ddl) return { repaired: false };

  const needsPk = !tableDdlHasIdAutoIncrementPrimaryKey(ddl);
  const needsUnique = !tableDdlHasMarkUniqueKey(ddl);
  if (!needsPk && !needsUnique) return { repaired: false };

  const [[zeroRows]] = await promisePool.query(
    'SELECT COUNT(*) AS c FROM academic_marks WHERE id = 0'
  );
  let reassigned = 0;
  if (Number(zeroRows?.c) > 0) {
    reassigned = await assignSequentialIds('academic_marks', 'id = 0');
  }

  if (needsPk) {
    await promisePool.query(
      'ALTER TABLE academic_marks MODIFY id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY'
    );
  }

  if (needsUnique) {
    await promisePool.query(
      'ALTER TABLE academic_marks ADD UNIQUE KEY uq_student_assessment (assessment_id, student_id)'
    ).catch(async (e) => {
      if (e.code !== 'ER_DUP_ENTRY') throw e;
      await promisePool.query(`
        DELETE m1 FROM academic_marks m1
        INNER JOIN academic_marks m2
          ON m1.assessment_id = m2.assessment_id
         AND m1.student_id = m2.student_id
         AND m1.id < m2.id
      `);
      await promisePool.query(
        'ALTER TABLE academic_marks ADD UNIQUE KEY uq_student_assessment (assessment_id, student_id)'
      );
    });
  }

  return { repaired: true, marks_reassigned: reassigned };
}

/**
 * One-time repair when academic_assessments / academic_marks lost AUTO_INCREMENT + PRIMARY KEY.
 * Without unique assessment ids every column in Marks Center shows the same mark.
 */
async function ensureAcademicMarksSchemaIntegrity() {
  if (repairChecked) return null;
  repairChecked = true;

  const assessmentResult = await repairAcademicAssessmentsTable();
  const marksResult = await repairAcademicMarksTable();

  if (assessmentResult.repaired || marksResult.repaired) {
    console.warn('[academicMarksSchemaRepair]', { assessmentResult, marksResult });
  }

  return { assessmentResult, marksResult };
}

module.exports = {
  ensureAcademicMarksSchemaIntegrity,
  repairAcademicAssessmentsTable,
  repairAcademicMarksTable,
};
