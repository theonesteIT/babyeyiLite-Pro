'use strict';

/**
 * Delete all marks + report snapshots for a school, re-seed from teacher_assignments, regenerate reports.
 *
 * Usage:
 *   node scripts/reset-and-reseed-marks-reports.js
 *   node scripts/reset-and-reseed-marks-reports.js --school-id=7
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { promisePool } = require('../config/database');
const { runTermMarksSeed } = require('../utils/marksReportsDemoSeed');

function parseSchoolId() {
  for (const a of process.argv.slice(2)) {
    const m = a.match(/^--school-id=(\d+)$/i);
    if (m) return Number(m[1]);
  }
  if (process.env.SEED_SCHOOL_ID) return Number(process.env.SEED_SCHOOL_ID);
  return null;
}

async function resolveSchoolId(explicit) {
  if (explicit && explicit > 0) return explicit;
  const [rows] = await promisePool.query('SELECT id FROM schools ORDER BY id ASC LIMIT 1');
  if (rows.length) return rows[0].id;
  throw new Error('No school found. Pass --school-id=N');
}

async function resolveSeedUserId(schoolId) {
  const [rows] = await promisePool.query(
    `SELECT u.id FROM users u
     INNER JOIN roles r ON r.id = u.role_id
     WHERE u.school_id = ? AND UPPER(r.role_code) IN ('DOS','SCHOOL_ADMIN','SCHOOL_MANAGER')
       AND u.deleted_at IS NULL
     ORDER BY u.id ASC LIMIT 1`,
    [schoolId],
  );
  if (rows[0]?.id) return rows[0].id;
  const [fallback] = await promisePool.query(
    'SELECT id FROM users WHERE school_id = ? AND deleted_at IS NULL ORDER BY id ASC LIMIT 1',
    [schoolId],
  );
  return fallback[0]?.id || 1;
}

async function main() {
  const schoolId = await resolveSchoolId(parseSchoolId());
  const userId = await resolveSeedUserId(schoolId);

  console.log(`Resetting marks & reports for school_id=${schoolId}...`);

  const result = await runTermMarksSeed(schoolId, userId, {
    clearAllMarks: true,
    clearReports: true,
    generateReports: true,
    terms: ['Term 1', 'Term 2', 'Term 3'],
  });

  console.log('\n══════════════════════════════════════════════════════════');
  console.log(`  Reset & reseed complete — school_id: ${schoolId}`);
  console.log('══════════════════════════════════════════════════════════');
  if (result.cleared) {
    console.log(`  Marks deleted: ${result.cleared.marks_deleted}`);
    console.log(`  Assessments deleted: ${result.cleared.assessments_deleted}`);
  }
  if (result.cleared_reports) {
    console.log(`  Report snapshots deleted: ${result.cleared_reports.snapshots_deleted}`);
    console.log(`  Report batches deleted: ${result.cleared_reports.batches_deleted}`);
  }
  console.log(`  Academic year: ${result.academic_year}`);
  console.log(`  Terms: ${result.terms.join(', ')}`);
  console.log(`  Classes: ${(result.classes || []).join(', ')}`);
  console.log(`  New assessments: ${result.assessments_created}`);
  console.log(`  New marks: ${result.marks_created}`);
  console.log(`  Reports generated: ${result.reports_generated}`);
  console.log('══════════════════════════════════════════════════════════\n');

  await promisePool.end();
}

main().catch(async (err) => {
  console.error('Reset failed:', err);
  try { await promisePool.end(); } catch (_) {}
  process.exit(1);
});
