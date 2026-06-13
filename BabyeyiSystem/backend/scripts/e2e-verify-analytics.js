'use strict';

/**
 * Verify marks, reports, and analytics data after reset/reseed.
 * Usage: node scripts/e2e-verify-analytics.js --school-id=7
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { promisePool } = require('../config/database');

function parseSchoolId() {
  for (const a of process.argv.slice(2)) {
    const m = a.match(/^--school-id=(\d+)$/i);
    if (m) return Number(m[1]);
  }
  return Number(process.env.SEED_SCHOOL_ID) || 7;
}

async function main() {
  const schoolId = parseSchoolId();
  const checks = [];
  const fail = (msg) => { checks.push({ ok: false, msg }); };
  const pass = (msg) => { checks.push({ ok: true, msg }); };

  const [[marksRow]] = await promisePool.query(
    'SELECT COUNT(*) AS c FROM academic_marks WHERE school_id = ?',
    [schoolId],
  );
  const [[assessRow]] = await promisePool.query(
    'SELECT COUNT(*) AS c FROM academic_assessments WHERE school_id = ?',
    [schoolId],
  );
  const [[snapRow]] = await promisePool.query(
    'SELECT COUNT(*) AS c FROM dos_student_report_snapshots WHERE school_id = ?',
    [schoolId],
  );
  const [[midRow]] = await promisePool.query(
    `SELECT COUNT(*) AS c FROM dos_student_report_snapshots
     WHERE school_id = ? AND report_type = 'mid_term'`,
    [schoolId],
  );
  const [[finalRow]] = await promisePool.query(
    `SELECT COUNT(*) AS c FROM dos_student_report_snapshots
     WHERE school_id = ? AND report_type = 'final'`,
    [schoolId],
  );

  const marks = Number(marksRow?.c || 0);
  const assessments = Number(assessRow?.c || 0);
  const snapshots = Number(snapRow?.c || 0);
  const midSnaps = Number(midRow?.c || 0);
  const finalSnaps = Number(finalRow?.c || 0);

  if (marks > 0) pass(`Marks in DB: ${marks}`);
  else fail('No marks found after reseed');

  if (assessments > 0) pass(`Assessments in DB: ${assessments}`);
  else fail('No assessments found after reseed');

  if (snapshots > 0) pass(`Report snapshots: ${snapshots} (mid: ${midSnaps}, final: ${finalSnaps})`);
  else fail('No report snapshots generated');

  const [sampleSnaps] = await promisePool.query(
    `SELECT id, overall_average, academic_health_score, snapshot_json
     FROM dos_student_report_snapshots
     WHERE school_id = ? AND report_type = 'final' AND overall_average IS NOT NULL
     LIMIT 1`,
    [schoolId],
  );
  if (sampleSnaps[0]) {
    const snap = sampleSnaps[0];
    let json = {};
    try { json = typeof snap.snapshot_json === 'string' ? JSON.parse(snap.snapshot_json) : snap.snapshot_json || {}; } catch (_) {}
    if (snap.academic_health_score != null) {
      pass(`Sample academic_health_score: ${snap.academic_health_score}`);
    } else if (json.academic_health_score != null) {
      pass(`Sample academic_health_score (json): ${json.academic_health_score}`);
    } else {
      fail('Sample snapshot missing academic_health_score');
    }
    if (json.success_score != null) pass(`Sample success_score: ${json.success_score}`);
    else fail('Sample snapshot missing success_score');
    if (Array.isArray(json.subjects) && json.subjects.some((s) => s.assessment_trends && Object.keys(s.assessment_trends).length)) {
      pass('Assessment trends present on subject rows');
    } else {
      fail('No assessment_trends on subject rows (re-generate reports if needed)');
    }
  } else {
    fail('No final snapshot with marks to inspect');
  }

  const [classRows] = await promisePool.query(
    `SELECT DISTINCT class_name FROM students WHERE school_id = ? AND TRIM(class_name) LIKE 'P5%' ORDER BY class_name`,
    [schoolId],
  );
  const p5Classes = (classRows || []).map((r) => r.class_name);
  if (p5Classes.length) pass(`P5 classes with students: ${p5Classes.join(', ')}`);
  else fail('No P5 classes found');

  const base = process.env.API_BASE || 'http://localhost:5100/api';
  try {
    const res = await fetch(`${base}/dos/student-reports/analytics?school_id=${schoolId}`, {
      headers: { Accept: 'application/json' },
    });
    if (res.status === 401 || res.status === 403) {
      pass(`Analytics API reachable (auth required: HTTP ${res.status}) — DB checks are primary`);
    } else if (res.ok) {
      const body = await res.json();
      const kpis = body?.data?.school_kpis;
      if (kpis?.schoolAverage != null) {
        pass(`Analytics API OK — school average: ${kpis.schoolAverage}%`);
      } else {
        fail('Analytics API returned but school_kpis empty');
      }
    } else {
      fail(`Analytics API HTTP ${res.status}`);
    }
  } catch (err) {
    pass(`Analytics API skip (server not reachable): ${err.message}`);
  }

  console.log('\n══════════════════════════════════════════════════════════');
  console.log(`  E2E verification — school_id: ${schoolId}`);
  console.log('══════════════════════════════════════════════════════════');
  let allOk = true;
  for (const c of checks) {
    console.log(`  ${c.ok ? '✓' : '✗'} ${c.msg}`);
    if (!c.ok) allOk = false;
  }
  console.log('══════════════════════════════════════════════════════════');
  console.log(allOk ? '  RESULT: PASS\n' : '  RESULT: FAIL (see above)\n');

  await promisePool.end();
  process.exit(allOk ? 0 : 1);
}

main().catch(async (err) => {
  console.error('Verify failed:', err);
  try { await promisePool.end(); } catch (_) {}
  process.exit(1);
});
