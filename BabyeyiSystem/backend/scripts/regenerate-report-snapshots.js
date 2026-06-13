'use strict';
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { promisePool } = require('../config/database');
const { generateClassReportsBatch, ensureReportTables } = require('../BabyeyiRoutes/dosStudentReports');
const { fetchSchoolAcademicContext } = require('../utils/teacherAssignmentsSchema');

async function main() {
  const schoolId = Number(process.argv[2] || 7);
  const [[u]] = await promisePool.query(
    'SELECT id FROM users WHERE school_id = ? AND deleted_at IS NULL ORDER BY id ASC LIMIT 1',
    [schoolId],
  );
  const userId = u?.id || 95;
  await ensureReportTables();
  const ctx = await fetchSchoolAcademicContext(schoolId);
  const terms = ['Term 1', 'Term 2', 'Term 3'];
  const [rows] = await promisePool.query(
    `SELECT DISTINCT class_name FROM teacher_assignments
     WHERE school_id = ? AND academic_year = ? AND status = 'active'
     ORDER BY class_name`,
    [schoolId, ctx.academicYear],
  );
  const classes = rows.map((r) => r.class_name).filter(Boolean);
  let total = 0;
  for (const term of terms) {
    for (const className of classes) {
      for (const reportType of ['mid_term', 'final']) {
        const r = await generateClassReportsBatch(schoolId, userId, {
          academicYear: ctx.academicYear,
          term,
          reportType,
          className,
        });
        total += r.generated || 0;
      }
    }
  }
  console.log(`Regenerated ${total} report snapshots for school ${schoolId}`);
  await promisePool.end();
}

main().catch(async (e) => {
  console.error(e);
  try { await promisePool.end(); } catch (_) {}
  process.exit(1);
});
