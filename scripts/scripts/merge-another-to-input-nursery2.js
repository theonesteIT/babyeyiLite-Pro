#!/usr/bin/env node
'use strict';

/**
 * Merges N2 from input-nursery2.json with all SMATT csvjson exports in Another/
 * into input-nursery2.json (bulk-attach format).
 *
 * Usage: node merge-another-to-input-nursery2.js
 */

const fs = require('fs');
const path = require('path');

const base = __dirname;
const anotherDir = path.join(base, 'Another');
const outPath = path.join(base, 'input-nursery2.json');

function normClass(c) {
  return String(c).replace(/\s+/g, '').trim();
}

function extractClassFromTitle(t) {
  const m = String(t).match(/SMATT\s*-\s*Students\s*-\s*(.+?)\s*-\s*\d{4}-\d{4}/i);
  if (!m) return null;
  return normClass(m[1]);
}

function parseCsvjson(arr) {
  let currentClass = null;
  let inData = false;
  const rows = [];
  for (const row of arr) {
    const c0 = row[''];
    const c1 = row['__1'];
    if (typeof c0 === 'string' && c0.includes('SMATT - Students -')) {
      currentClass = extractClassFromTitle(c0);
      inData = false;
      continue;
    }
    if (c0 === 'No' && c1 === 'Student ID') {
      inData = true;
      continue;
    }
    if (!inData || !currentClass) continue;
    const last = row['__2'];
    const first = row['__3'];
    const pic = row['__4'];
    if (typeof last !== 'string' || !last.trim()) continue;
    if (typeof first !== 'string') continue;
    const picRaw = pic === '' || pic === null || pic === undefined ? null : Number(pic);
    const picId = Number.isFinite(picRaw) ? picRaw : null;
    const studentName = `${last.trim()} ${first.trim()}`.replace(/\s+/g, ' ').trim();
    rows.push({
      student_name: studentName,
      class: currentClass,
      pic_id: picId,
      flag: picId != null ? 'confirmed' : 'no_photo',
    });
  }
  return rows;
}

function keyOf(s) {
  return `${s.class}|${s.pic_id != null ? String(s.pic_id) : 'nop'}|${s.student_name.toLowerCase()}`;
}

function main() {
  const existing = JSON.parse(fs.readFileSync(outPath, 'utf8'));
  const n2Students = (existing.students || []).filter((s) => s.class === 'N2');
  const all = [...n2Students];
  const seen = new Set(all.map(keyOf));

  function addUnique(list) {
    for (const s of list) {
      const k = keyOf(s);
      if (seen.has(k)) continue;
      seen.add(k);
      all.push(s);
    }
  }

  const anotherFiles = fs.existsSync(anotherDir)
    ? fs.readdirSync(anotherDir).filter((x) => x.endsWith('.json')).sort()
    : [];

  for (const f of anotherFiles) {
    const raw = JSON.parse(fs.readFileSync(path.join(anotherDir, f), 'utf8'));
    addUnique(parseCsvjson(raw));
  }

  const flag_summary = {
    confirmed: all.filter((s) => s.flag === 'confirmed').length,
    no_photo: all.filter((s) => s.flag === 'no_photo').length,
    total: all.length,
  };
  const counts_by_class = {};
  for (const s of all) {
    counts_by_class[s.class] = (counts_by_class[s.class] || 0) + 1;
  }

  const out = {
    total: all.length,
    students: all,
    flag_summary,
    counts_by_class,
    source: {
      n2_from: 'input-nursery2.json (N2 rows preserved before merge)',
      another_dir: 'Another',
      another_files: anotherFiles,
    },
  };

  fs.writeFileSync(outPath, JSON.stringify(out, null, 2));
  console.log('Wrote', outPath);
  console.log('Total students:', all.length);
  console.log('By class:', counts_by_class);
}

main();
