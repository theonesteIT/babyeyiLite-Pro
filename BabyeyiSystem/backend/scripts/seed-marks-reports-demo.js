'use strict';

/**
 * Seeds demo teacher assignments, term marks (Term 1–3), and generates Mid-Term + Final reports.
 *
 * Usage:
 *   node scripts/seed-marks-reports-demo.js
 *   node scripts/seed-marks-reports-demo.js --school-id=7
 *   node scripts/seed-marks-reports-demo.js --school-id=7 --no-reports
 *   node scripts/seed-marks-reports-demo.js --class=P5A
 *   node scripts/seed-marks-reports-demo.js --school-id=7 --no-timetable
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { promisePool } = require('../config/database');
const { runMarksReportsDemoSeed, SEED_TAG } = require('../utils/marksReportsDemoSeed');

function parseArgs() {
  let schoolId = null;
  let clear = true;
  let generateReports = true;
  let seedTimetable = true;
  let classes = null;

  for (const a of process.argv.slice(2)) {
    if (a === '--no-clear') clear = false;
    if (a === '--no-reports') generateReports = false;
    if (a === '--no-timetable') seedTimetable = false;
    const sid = a.match(/^--school-id=(\d+)$/i);
    if (sid) schoolId = Number(sid[1]);
    const cls = a.match(/^--class=(.+)$/i);
    if (cls) classes = [cls[1].trim()];
  }
  if (!schoolId && process.env.SEED_SCHOOL_ID) schoolId = Number(process.env.SEED_SCHOOL_ID);
  return { schoolId, clear, generateReports, seedTimetable, classes };
}

async function resolveSchoolId(explicit) {
  if (explicit && explicit > 0) return explicit;
  const [rows] = await promisePool.query('SELECT id, school_name FROM schools ORDER BY id ASC LIMIT 1');
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
  const { schoolId: explicitId, clear, generateReports, seedTimetable, classes } = parseArgs();
  const schoolId = await resolveSchoolId(explicitId);
  const userId = await resolveSeedUserId(schoolId);

  const result = await runMarksReportsDemoSeed(schoolId, userId, {
    clear,
    seedTimetable,
    generateReports,
    classes,
  });

  console.log('\n══════════════════════════════════════════════════════════');
  console.log(`  ${SEED_TAG} complete — school_id: ${schoolId}`);
  console.log('══════════════════════════════════════════════════════════');
  console.log(`  Academic year: ${result.academic_year}`);
  console.log(`  Terms: ${result.terms.join(', ')}`);
  console.log(`  Classes: ${result.classes.join(', ')}`);
  console.log(`  Students added: ${result.students_inserted}`);
  console.log(`  Teacher assignments: ${result.teacher_assignments_created}`);
  console.log(`  Assessments: ${result.assessments_created}  Marks: ${result.marks_created}`);
  console.log(`  Reports generated: ${result.reports_generated}`);
  console.log('──────────────────────────────────────────────────────────');
  console.log('  Open DOS → Student Marks Reports → Mid-Term / Final Reports');
  console.log('  Or POST /api/dos/student-reports/seed-demo from the DOS portal');
  console.log('══════════════════════════════════════════════════════════\n');

  await promisePool.end();
}

main().catch(async (err) => {
  console.error(`[${SEED_TAG}] Failed:`, err);
  try {
    await promisePool.end();
  } catch (_) {}
  process.exit(1);
});
