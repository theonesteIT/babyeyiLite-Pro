#!/usr/bin/env node
/**
 * Compare MySQL schemas (structure only, no data).
 *
 * Local dump:
 *   node scripts/compare-db-schema.mjs dump --out schema-local.json
 *
 * On server (SSH):
 *   cd /path/to/BabyeyiSystem/backend && node scripts/compare-db-schema.mjs dump --out schema-server.json
 *
 * Compare two dumps:
 *   node scripts/compare-db-schema.mjs diff schema-local.json schema-server.json
 *
 * Compare local .env DB vs remote (set REMOTE_* env vars):
 *   node scripts/compare-db-schema.mjs remote
 */
'use strict';

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });

function connFromEnv(prefix = '') {
  const p = prefix ? `${prefix}_` : '';
  return {
    host: process.env[`${p}DB_HOST`] || process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env[`${p}DB_PORT`] || process.env.DB_PORT || 3306),
    user: process.env[`${p}DB_USER`] || process.env.DB_USER || 'root',
    password: process.env[`${p}DB_PASSWORD`] ?? process.env.DB_PASSWORD ?? '',
    database: process.env[`${p}DB_NAME`] || process.env.DB_NAME || 'babyeyi',
  };
}

async function fetchSchema(config) {
  const pool = mysql.createPool({ ...config, connectionLimit: 2 });
  const db = config.database;

  const [tables] = await pool.query(
    `SELECT TABLE_NAME AS name, ENGINE, TABLE_COLLATION AS collation
     FROM information_schema.tables
     WHERE table_schema = ? AND table_type = 'BASE TABLE'
     ORDER BY TABLE_NAME`,
    [db],
  );

  const [columns] = await pool.query(
    `SELECT TABLE_NAME AS table_name, COLUMN_NAME AS column_name,
            COLUMN_TYPE AS column_type, IS_NULLABLE AS is_nullable,
            COLUMN_DEFAULT AS column_default, EXTRA AS extra,
            COLUMN_KEY AS column_key, ORDINAL_POSITION AS pos
     FROM information_schema.columns
     WHERE table_schema = ?
     ORDER BY TABLE_NAME, ORDINAL_POSITION`,
    [db],
  );

  const [indexes] = await pool.query(
    `SELECT TABLE_NAME AS table_name, INDEX_NAME AS index_name,
            NON_UNIQUE AS non_unique, SEQ_IN_INDEX AS seq,
            COLUMN_NAME AS column_name
     FROM information_schema.statistics
     WHERE table_schema = ?
     ORDER BY TABLE_NAME, INDEX_NAME, SEQ_IN_INDEX`,
    [db],
  );

  let migrations = [];
  try {
    const [rows] = await pool.query('SELECT * FROM schema_migrations ORDER BY 1');
    migrations = rows;
  } catch {
    migrations = null;
  }

  await pool.end();

  const byTable = {};
  for (const c of columns) {
    if (!byTable[c.table_name]) byTable[c.table_name] = [];
    byTable[c.table_name].push({
      name: c.column_name,
      type: c.column_type,
      nullable: c.is_nullable,
      default: c.column_default,
      extra: c.extra,
      key: c.column_key,
    });
  }

  const idxByTable = {};
  for (const i of indexes) {
    const k = `${i.table_name}\0${i.index_name}`;
    if (!idxByTable[k]) {
      idxByTable[k] = {
        table: i.table_name,
        name: i.index_name,
        unique: i.non_unique === 0,
        columns: [],
      };
    }
    idxByTable[k].columns.push(i.column_name);
  }

  return {
    database: db,
    host: config.host,
    exportedAt: new Date().toISOString(),
    tableCount: tables.length,
    tables: tables.map((t) => t.name),
    tableMeta: Object.fromEntries(tables.map((t) => [t.name, { engine: t.ENGINE, collation: t.collation }])),
    columns: byTable,
    indexes: Object.values(idxByTable),
    schema_migrations: migrations,
  };
}

function diffSchemas(a, b) {
  const onlyA = a.tables.filter((t) => !b.tables.includes(t)).sort();
  const onlyB = b.tables.filter((t) => !a.tables.includes(t)).sort();
  const shared = a.tables.filter((t) => b.tables.includes(t)).sort();

  const columnDiffs = [];
  const indexDiffs = [];

  for (const table of shared) {
    const ac = a.columns[table] || [];
    const bc = b.columns[table] || [];
    const aNames = new Set(ac.map((c) => c.name));
    const bNames = new Set(bc.map((c) => c.name));

    for (const n of [...aNames].filter((x) => !bNames.has(x)).sort()) {
      columnDiffs.push({ kind: 'column_only_local', table, column: n, local: ac.find((c) => c.name === n) });
    }
    for (const n of [...bNames].filter((x) => !aNames.has(x)).sort()) {
      columnDiffs.push({ kind: 'column_only_server', table, column: n, server: bc.find((c) => c.name === n) });
    }
    for (const n of [...aNames].filter((x) => bNames.has(x))) {
      const ca = ac.find((c) => c.name === n);
      const cb = bc.find((c) => c.name === n);
      const sig = (c) => `${c.type}|${c.nullable}|${c.default}|${c.extra}`;
      if (sig(ca) !== sig(cb)) {
        columnDiffs.push({ kind: 'column_type_mismatch', table, column: n, local: ca, server: cb });
      }
    }
  }

  const idxSig = (list, table) =>
    (list || [])
      .filter((i) => i.table === table)
      .map((i) => `${i.name}:${i.unique}:${i.columns.join(',')}`)
      .sort()
      .join(';');

  for (const table of shared) {
    const ai = idxSig(a.indexes, table);
    const bi = idxSig(b.indexes, table);
    if (ai !== bi) indexDiffs.push({ table, local: ai, server: bi });
  }

  return { onlyLocalTables: onlyA, onlyServerTables: onlyB, columnDiffs, indexDiffs };
}

function printReport(aLabel, bLabel, a, b, diff) {
  console.log('\n=== Schema comparison ===');
  console.log(`A (${aLabel}): ${a.database} @ ${a.host} — ${a.tableCount} tables`);
  console.log(`B (${bLabel}): ${b.database} @ ${b.host} — ${b.tableCount} tables`);
  console.log(`Exported: ${a.exportedAt} vs ${b.exportedAt}\n`);

  if (diff.onlyLocalTables.length) {
    console.log(`Tables only on LOCAL (${diff.onlyLocalTables.length}):`);
    diff.onlyLocalTables.forEach((t) => console.log(`  + ${t}`));
  }
  if (diff.onlyServerTables.length) {
    console.log(`Tables only on SERVER (${diff.onlyServerTables.length}):`);
    diff.onlyServerTables.forEach((t) => console.log(`  + ${t}`));
  }
  if (!diff.onlyLocalTables.length && !diff.onlyServerTables.length) {
    console.log('Table names: MATCH (same set)');
  }

  const colOnlyLocal = diff.columnDiffs.filter((d) => d.kind === 'column_only_local');
  const colOnlyServer = diff.columnDiffs.filter((d) => d.kind === 'column_only_server');
  const colMismatch = diff.columnDiffs.filter((d) => d.kind === 'column_type_mismatch');

  if (colOnlyLocal.length) {
    console.log(`\nColumns only on LOCAL (${colOnlyLocal.length}):`);
    colOnlyLocal.slice(0, 80).forEach((d) => console.log(`  + ${d.table}.${d.column} (${d.local?.type})`));
    if (colOnlyLocal.length > 80) console.log(`  ... and ${colOnlyLocal.length - 80} more`);
  }
  if (colOnlyServer.length) {
    console.log(`\nColumns only on SERVER (${colOnlyServer.length}):`);
    colOnlyServer.slice(0, 80).forEach((d) => console.log(`  + ${d.table}.${d.column} (${d.server?.type})`));
    if (colOnlyServer.length > 80) console.log(`  ... and ${colOnlyServer.length - 80} more`);
  }
  if (colMismatch.length) {
    console.log(`\nColumn type mismatches (${colMismatch.length}):`);
    colMismatch.slice(0, 40).forEach((d) => {
      console.log(`  ~ ${d.table}.${d.column}`);
      console.log(`      local:  ${d.local?.type} null=${d.local?.nullable} def=${d.local?.default}`);
      console.log(`      server: ${d.server?.type} null=${d.server?.nullable} def=${d.server?.default}`);
    });
  }
  if (diff.indexDiffs.length) {
    console.log(`\nIndex differences on shared tables (${diff.indexDiffs.length}) — review manually`);
    diff.indexDiffs.slice(0, 15).forEach((d) => console.log(`  ~ ${d.table}`));
  }

  const migA = a.schema_migrations;
  const migB = b.schema_migrations;
  if (migA && migB) {
    const namesA = migA.map((r) => r.name || Object.values(r)[0]).sort();
    const namesB = migB.map((r) => r.name || Object.values(r)[0]).sort();
    const onlyMigLocal = namesA.filter((n) => !namesB.includes(n));
    const onlyMigServer = namesB.filter((n) => !namesA.includes(n));
    if (onlyMigLocal.length || onlyMigServer.length) {
      console.log('\nschema_migrations:');
      onlyMigLocal.forEach((n) => console.log(`  only local:  ${n}`));
      onlyMigServer.forEach((n) => console.log(`  only server: ${n}`));
    } else {
      console.log('\nschema_migrations: MATCH');
    }
  }

  const issues =
    diff.onlyLocalTables.length +
    diff.onlyServerTables.length +
    diff.columnDiffs.length +
    diff.indexDiffs.length;
  console.log(issues === 0 ? '\n✅ Schemas match (tables + columns).' : `\n⚠️  ${issues} difference(s) found.`);
}

async function cmdDump(outPath) {
  const schema = await fetchSchema(connFromEnv());
  fs.writeFileSync(outPath, JSON.stringify(schema, null, 2));
  console.log(`Wrote ${schema.tableCount} tables → ${outPath}`);
}

/** One line per column — easy to diff with server mysql export */
function schemaToFlatLines(schema) {
  const lines = [`# database=${schema.database} tables=${schema.tableCount} exported=${schema.exportedAt}`];
  for (const table of schema.tables.sort()) {
    for (const c of schema.columns[table] || []) {
      lines.push(
        `${table}.${c.name}|${c.type}|${c.nullable}|${c.default}|${c.extra}|${c.key}`,
      );
    }
  }
  return lines.join('\n') + '\n';
}

async function cmdDumpFlat(outPath) {
  const schema = await fetchSchema(connFromEnv());
  fs.writeFileSync(outPath, schemaToFlatLines(schema));
  const colCount = Object.values(schema.columns).reduce((n, arr) => n + arr.length, 0);
  console.log(`Wrote ${schema.tableCount} tables, ${colCount} columns → ${outPath}`);
}

async function cmdDiff(fileA, fileB) {
  const a = JSON.parse(fs.readFileSync(fileA, 'utf8'));
  const b = JSON.parse(fs.readFileSync(fileB, 'utf8'));
  printReport(path.basename(fileA), path.basename(fileB), a, b, diffSchemas(a, b));
}

async function cmdDiffFlat(fileA, fileB) {
  const read = (f) =>
    fs
      .readFileSync(f, 'utf8')
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith('#'));
  const a = new Set(read(fileA));
  const b = new Set(read(fileB));
  const onlyA = [...a].filter((x) => !b.has(x)).sort();
  const onlyB = [...b].filter((x) => !a.has(x)).sort();
  console.log(`\n=== Flat schema diff ===`);
  console.log(`${path.basename(fileA)}: ${a.size} column lines`);
  console.log(`${path.basename(fileB)}: ${b.size} column lines`);
  if (onlyA.length) {
    console.log(`\nOnly in LOCAL (${onlyA.length}):`);
    onlyA.slice(0, 60).forEach((l) => console.log(`  + ${l.split('|')[0]}`));
    if (onlyA.length > 60) console.log(`  ... ${onlyA.length - 60} more`);
  }
  if (onlyB.length) {
    console.log(`\nOnly on SERVER (${onlyB.length}):`);
    onlyB.slice(0, 60).forEach((l) => console.log(`  + ${l.split('|')[0]}`));
    if (onlyB.length > 60) console.log(`  ... ${onlyB.length - 60} more`);
  }
  if (!onlyA.length && !onlyB.length) console.log('\n✅ Column lists match.');
  else console.log(`\n⚠️  ${onlyA.length + onlyB.length} line difference(s).`);
}

async function cmdRemote() {
  const local = await fetchSchema(connFromEnv());
  const remote = await fetchSchema(connFromEnv('REMOTE'));
  printReport('local', 'server', local, remote, diffSchemas(local, remote));
}

async function main() {
  const [cmd, ...args] = process.argv.slice(2);
  if (cmd === 'dump') {
    const outIdx = args.indexOf('--out');
    const out = outIdx >= 0 ? args[outIdx + 1] : 'schema-dump.json';
    await cmdDump(out);
  } else if (cmd === 'dump-flat') {
    const outIdx = args.indexOf('--out');
    const out = outIdx >= 0 ? args[outIdx + 1] : 'schema-flat.txt';
    await cmdDumpFlat(out);
  } else if (cmd === 'diff') {
    if (args.length < 2) {
      console.error('Usage: node scripts/compare-db-schema.mjs diff <local.json> <server.json>');
      process.exit(1);
    }
    await cmdDiff(args[0], args[1]);
  } else if (cmd === 'diff-flat') {
    if (args.length < 2) {
      console.error('Usage: node scripts/compare-db-schema.mjs diff-flat <local.txt> <server.txt>');
      process.exit(1);
    }
    await cmdDiffFlat(args[0], args[1]);
  } else if (cmd === 'remote') {
    await cmdRemote();
  } else {
    console.log(`Usage:
  node scripts/compare-db-schema.mjs dump --out schema-local.json
  node scripts/compare-db-schema.mjs dump-flat --out schema-local.txt
  node scripts/compare-db-schema.mjs diff schema-local.json schema-server.json
  REMOTE_DB_HOST=10.10.139.68 REMOTE_DB_USER=... REMOTE_DB_PASSWORD=... REMOTE_DB_NAME=babyeyi \\
    node scripts/compare-db-schema.mjs remote`);
    process.exit(1);
  }
}

main().catch((e) => {
  console.error('Failed:', e.message);
  process.exit(1);
});
