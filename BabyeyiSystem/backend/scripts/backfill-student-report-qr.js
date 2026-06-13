#!/usr/bin/env node
/**
 * Backfill qr_data in dos_student_report_snapshots.snapshot_json
 * so existing reports use scannable URL QRs (no full re-generation).
 *
 * Usage:
 *   cd BabyeyiSystem/backend
 *   node scripts/backfill-student-report-qr.js              # update legacy/missing only
 *   node scripts/backfill-student-report-qr.js --dry-run    # preview changes
 *   node scripts/backfill-student-report-qr.js --force      # rewrite all snapshot QRs
 *   node scripts/backfill-student-report-qr.js --school-id=3
 *
 * Env (same as report generation):
 *   PUBLIC_REPORT_URL=https://babyeyi.rw
 *   FRONTEND_URL=http://localhost:5173
 */
'use strict';

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const { promisePool } = require('../config/database');
const {
  ensureReportTables,
  buildReportQrData,
  isLegacyQrData,
  buildPublicReportUrl,
} = require('../BabyeyiRoutes/dosStudentReports');

function parseArgs(argv) {
  const opts = { dryRun: false, force: false, schoolId: null, limit: null };
  for (const arg of argv) {
    if (arg === '--dry-run') opts.dryRun = true;
    else if (arg === '--force') opts.force = true;
    else if (arg.startsWith('--school-id=')) opts.schoolId = Number(arg.split('=')[1]) || null;
    else if (arg.startsWith('--limit=')) opts.limit = Number(arg.split('=')[1]) || null;
    else if (arg === '--help' || arg === '-h') {
      console.log(`
Backfill student report QR URLs in snapshot_json.

Options:
  --dry-run           Show what would change without writing
  --force             Update every snapshot (even if already a URL)
  --school-id=N       Only snapshots for this school
  --limit=N           Process at most N rows
  --help, -h          Show this help
`);
      process.exit(0);
    }
  }
  return opts;
}

function needsUpdate(currentQr, nextQr, force) {
  if (!nextQr) return false;
  if (force) return currentQr !== nextQr;
  if (!currentQr) return true;
  if (isLegacyQrData(currentQr)) return true;
  if (!String(currentQr).startsWith('http')) return true;
  return false;
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const sampleUrl = buildPublicReportUrl(1);

  console.log('Student report QR backfill');
  console.log('  PUBLIC_REPORT_URL:', process.env.PUBLIC_REPORT_URL || process.env.FRONTEND_URL || '(default localhost:5173)');
  console.log('  Sample URL:', sampleUrl);
  console.log('  Mode:', opts.dryRun ? 'DRY RUN' : 'LIVE', opts.force ? '| force all' : '| legacy/missing only');
  if (opts.schoolId) console.log('  School filter:', opts.schoolId);
  if (opts.limit) console.log('  Limit:', opts.limit);
  console.log('');

  await ensureReportTables();

  const params = [];
  let sql = `SELECT id, school_id, student_id, status, snapshot_json
             FROM dos_student_report_snapshots
             WHERE 1=1`;
  if (opts.schoolId) {
    sql += ' AND school_id = ?';
    params.push(opts.schoolId);
  }
  sql += ' ORDER BY id ASC';
  if (opts.limit && opts.limit > 0) {
    sql += ' LIMIT ?';
    params.push(opts.limit);
  }

  const [rows] = await promisePool.query(sql, params);
  console.log(`Found ${rows.length} snapshot(s) to inspect.\n`);

  let updated = 0;
  let skipped = 0;
  let failed = 0;

  for (const row of rows) {
    let snapshot;
    try {
      snapshot = JSON.parse(row.snapshot_json || '{}');
    } catch (err) {
      failed += 1;
      console.error(`  [FAIL] id=${row.id} — invalid snapshot_json: ${err.message}`);
      continue;
    }

    const nextQr = buildReportQrData(row.id);
    const currentQr = snapshot.qr_data || null;

    if (!needsUpdate(currentQr, nextQr, opts.force)) {
      skipped += 1;
      continue;
    }

    snapshot.qr_data = nextQr;
    snapshot.snapshot_id = row.id;
    const nextJson = JSON.stringify(snapshot);

    const label = snapshot.name || snapshot.student_uid || `student#${row.student_id}`;
    console.log(`  [UPDATE] id=${row.id} school=${row.school_id} status=${row.status} ${label}`);
    console.log(`           ${currentQr ? String(currentQr).slice(0, 72) : '(none)'} → ${nextQr}`);

    if (!opts.dryRun) {
      try {
        await promisePool.query(
          'UPDATE dos_student_report_snapshots SET snapshot_json = ? WHERE id = ?',
          [nextJson, row.id],
        );
        updated += 1;
      } catch (err) {
        failed += 1;
        console.error(`  [FAIL] id=${row.id} — ${err.message}`);
      }
    } else {
      updated += 1;
    }
  }

  console.log('');
  console.log('Done.');
  console.log(`  ${opts.dryRun ? 'Would update' : 'Updated'}: ${updated}`);
  console.log(`  Skipped (already URL): ${skipped}`);
  if (failed) console.log(`  Failed: ${failed}`);
  if (opts.dryRun && updated) {
    console.log('\nRe-run without --dry-run to apply changes.');
  }
  if (updated && !opts.dryRun) {
    console.log('\nNote: Already-printed PDFs keep the old QR until you re-export PDFs from DOS.');
  }

  await promisePool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
