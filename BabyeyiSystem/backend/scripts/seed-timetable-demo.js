'use strict';

/**
 * Seeds 8 teachers, 11 courses, course configs, teacher profiles, and P5 assignments
 * for timetable testing.
 *
 * Usage:
 *   node scripts/seed-timetable-demo.js
 *   node scripts/seed-timetable-demo.js --school-id=1
 *   node scripts/seed-timetable-demo.js --clear
 *
 * All seeded teachers use password: Timetable123
 * Emails: *@timetable-seed.local
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { promisePool } = require('../config/database');
const { runTimetableDemoSeed, SEED_TAG, DEFAULT_PASSWORD, TEACHERS } = require('../utils/timetableDemoSeed');

function parseArgs() {
  let schoolId = null;
  let clear = false;
  for (const a of process.argv.slice(2)) {
    if (a === '--clear') clear = true;
    const m = a.match(/^--school-id=(\d+)$/i);
    if (m) schoolId = Number(m[1]);
  }
  if (!schoolId && process.env.SEED_SCHOOL_ID) schoolId = Number(process.env.SEED_SCHOOL_ID);
  return { schoolId, clear };
}

async function resolveSchoolId(explicit) {
  if (explicit && explicit > 0) return explicit;
  const [rows] = await promisePool.query('SELECT id, school_name FROM schools ORDER BY id ASC LIMIT 1');
  if (rows.length) return rows[0].id;
  const [alt] = await promisePool.query(
    'SELECT school_id AS id FROM users WHERE school_id IS NOT NULL GROUP BY school_id ORDER BY school_id LIMIT 1',
  );
  if (alt.length) return alt[0].id;
  throw new Error('No school found. Pass --school-id=N');
}

async function main() {
  const { schoolId: explicitId, clear } = parseArgs();
  const schoolId = await resolveSchoolId(explicitId);
  const result = await runTimetableDemoSeed(schoolId, { clear });

  console.log('\n══════════════════════════════════════════════════════════');
  console.log(`  Timetable demo seed complete — school_id: ${schoolId}`);
  console.log('══════════════════════════════════════════════════════════');
  console.log(`  Classes: ${result.classes.join(', ')}`);
  console.log(`  Subjects: ${result.subjects.join(', ')}`);
  console.log(`  Teachers: ${result.teacher_count} (password: ${DEFAULT_PASSWORD})`);
  console.log(`  Assignments: ${result.assignment_count}`);
  console.log('──────────────────────────────────────────────────────────');
  for (const t of result.teachers) {
    console.log(`  ${t.staff_id}  ${t.name}  ${t.email}  user:${t.user_id}`);
  }
  console.log('──────────────────────────────────────────────────────────');
  console.log('  Next: import student Excel files (seed-students/) then generate timetables.');
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
