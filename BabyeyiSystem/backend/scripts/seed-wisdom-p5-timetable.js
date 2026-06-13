'use strict';

/**
 * P5A–P5H real staffing (ST THEO / Wisdom layout) — full reset + courses + assignments.
 *
 * Usage:
 *   node scripts/seed-wisdom-p5-timetable.js --school-id=7
 *   node scripts/seed-wisdom-p5-timetable.js --school-id=7 --no-clear
 *
 * Password for all seeded teachers: Wisdom2026
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { promisePool } = require('../config/database');
const { runWisdomP5TimetableSeed, SEED_TAG, DEFAULT_PASSWORD } = require('../utils/wisdomP5TimetableSeed');

function parseArgs() {
  let schoolId = null;
  let fullClear = true;
  for (const a of process.argv.slice(2)) {
    if (a === '--no-clear') fullClear = false;
    const m = a.match(/^--school-id=(\d+)$/i);
    if (m) schoolId = Number(m[1]);
  }
  if (!schoolId && process.env.SEED_SCHOOL_ID) schoolId = Number(process.env.SEED_SCHOOL_ID);
  return { schoolId, fullClear };
}

async function resolveSchoolId(explicit) {
  if (explicit && explicit > 0) return explicit;
  const [rows] = await promisePool.query('SELECT id, school_name FROM schools ORDER BY id ASC LIMIT 1');
  if (rows.length) return rows[0].id;
  throw new Error('No school found. Pass --school-id=N');
}

async function main() {
  const { schoolId: explicitId, fullClear } = parseArgs();
  const schoolId = await resolveSchoolId(explicitId);
  const result = await runWisdomP5TimetableSeed(schoolId, { fullClear, syncTeacherAssignments: true });

  console.log('\n══════════════════════════════════════════════════════════');
  console.log(`  ${SEED_TAG} import complete — school_id: ${schoolId}`);
  console.log('══════════════════════════════════════════════════════════');
  console.log(`  Classes: ${result.classes.join(', ')}`);
  console.log(`  Courses: ${result.courses.join(', ')}`);
  console.log(`  Timetable assignments: ${result.timetable_assignments}`);
  console.log(`  Teacher assignments (marks): ${result.teacher_assignments_synced}`);
  console.log(`  Teachers: ${result.teacher_count} (password: ${DEFAULT_PASSWORD})`);
  console.log('──────────────────────────────────────────────────────────');
  for (const t of result.teachers) {
    console.log(`  ${t.staff_id}  ${t.name}  ${t.email}`);
  }
  console.log('──────────────────────────────────────────────────────────');
  console.log('  Next: DOS → Timetable → Generator (see steps in portal)');
  console.log('══════════════════════════════════════════════════════════\n');

  await promisePool.end();
}

main().catch(async (err) => {
  console.error(`[${SEED_TAG}] Failed:`, err);
  try { await promisePool.end(); } catch (_) {}
  process.exit(1);
});
