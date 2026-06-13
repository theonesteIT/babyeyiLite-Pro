#!/usr/bin/env node
/**
 * Reassign a school primary key (e.g. legacy id 0 → normal auto-increment id).
 * Updates every table in the schema that has a school_id column.
 *
 * Usage:
 *   node scripts/reassign-school-id.js --from=0
 *   node scripts/reassign-school-id.js --from=0 --to=7
 *   node scripts/reassign-school-id.js --from=0 --dry-run
 */
'use strict';

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const { promisePool } = require('../config/database');

function parseArgs(argv) {
  const opts = { from: null, to: null, dryRun: false };
  for (const arg of argv) {
    if (arg === '--dry-run') opts.dryRun = true;
    else if (arg.startsWith('--from=')) opts.from = Number(arg.split('=')[1]);
    else if (arg.startsWith('--to=')) opts.to = Number(arg.split('=')[1]);
    else if (arg === '--help' || arg === '-h') {
      console.log(`
Reassign schools.id and cascade school_id in all related tables.

Options:
  --from=N     Current school id (required)
  --to=N       Target id (default: MAX(id)+1)
  --dry-run    Preview only
  --help       Show help
`);
      process.exit(0);
    }
  }
  return opts;
}

async function listSchoolIdTables(conn) {
  const [rows] = await conn.query(
    `SELECT DISTINCT TABLE_NAME
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND COLUMN_NAME = 'school_id'
     ORDER BY TABLE_NAME`,
  );
  return rows.map((r) => r.TABLE_NAME);
}

async function countRefs(conn, table, schoolId) {
  const [[row]] = await conn.query(
    `SELECT COUNT(*) AS c FROM \`${table}\` WHERE school_id = ?`,
    [schoolId],
  );
  return Number(row.c) || 0;
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.from == null || Number.isNaN(opts.from) || opts.from < 0) {
    console.error('Provide --from=N (current school id).');
    process.exit(1);
  }

  const conn = await promisePool.getConnection();
  try {
    const [[school]] = await conn.query(
      'SELECT id, school_name, school_code FROM schools WHERE id = ? LIMIT 1',
      [opts.from],
    );
    if (!school) {
      console.error(`No school found with id=${opts.from}`);
      process.exit(1);
    }

    let newId = opts.to;
    if (newId == null || Number.isNaN(newId)) {
      const [[maxRow]] = await conn.query('SELECT COALESCE(MAX(id), 0) AS m FROM schools');
      newId = Number(maxRow.m) + 1;
    }
    if (newId < 0 || Number.isNaN(newId)) {
      console.error('Invalid --to id');
      process.exit(1);
    }
    if (newId === opts.from) {
      console.error('--from and --to must differ');
      process.exit(1);
    }

    const [[conflict]] = await conn.query('SELECT id, school_name FROM schools WHERE id = ? LIMIT 1', [newId]);
    if (conflict) {
      console.error(`Target id ${newId} already used by "${conflict.school_name}". Pick another --to= value.`);
      process.exit(1);
    }

    const tables = await listSchoolIdTables(conn);
    const plan = [];
    for (const table of tables) {
      const count = await countRefs(conn, table, opts.from);
      if (count > 0) plan.push({ table, count, action: 'update school_id' });
    }
    plan.push({ table: 'schools', count: 1, action: `UPDATE id ${opts.from} → ${newId}` });

    console.log('School id reassignment');
    console.log(`  School : ${school.school_name} (${school.school_code})`);
    console.log(`  From   : ${opts.from}`);
    console.log(`  To     : ${newId}`);
    console.log(`  Mode   : ${opts.dryRun ? 'DRY RUN' : 'LIVE'}`);
    console.log('\nPlanned changes:');
    for (const step of plan) {
      console.log(`  - ${step.table}: ${step.count} row(s) — ${step.action}`);
    }
    console.log('');

    if (opts.dryRun) {
      console.log('Re-run without --dry-run to apply.');
      return;
    }

    await conn.beginTransaction();
    try {
      for (const { table } of plan) {
        if (table === 'schools') continue;
        await conn.query(`UPDATE \`${table}\` SET school_id = ? WHERE school_id = ?`, [newId, opts.from]);
      }
      await conn.query('UPDATE schools SET id = ? WHERE id = ?', [newId, opts.from]);
      await conn.query('ALTER TABLE schools AUTO_INCREMENT = ?', [newId + 1]);
      await conn.commit();
      console.log(`Done. "${school.school_name}" is now id=${newId}.`);
      console.log(`schools AUTO_INCREMENT set to ${newId + 1}.`);
    } catch (err) {
      await conn.rollback();
      throw err;
    }
  } finally {
    conn.release();
    await promisePool.end();
  }
}

main().catch((err) => {
  console.error('Failed:', err.message);
  process.exit(1);
});
