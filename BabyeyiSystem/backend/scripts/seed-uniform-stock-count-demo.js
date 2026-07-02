'use strict';

/**
 * Seeds fabric stock-in, fabric stock-out, finished uniforms, and uniform issues
 * so General Stock Count reports show realistic opening / in / out / closing rows.
 *
 * Usage:
 *   node scripts/seed-uniform-stock-count-demo.js
 *   node scripts/seed-uniform-stock-count-demo.js --school-id=1
 *   node scripts/seed-uniform-stock-count-demo.js --clear
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { promisePool } = require('../config/database');

const DEMO_PREFIX = 'DEMO-GSC';
const DEMO_STUDENT_PREFIX = 'DEMO-GSC-STU';
const NOTE = '[uniform-stock-count-demo]';
const DEMO_STUDENT_COUNT = 40;

const FIRST_NAMES = {
  M: ['Jean', 'Eric', 'Patrick', 'David', 'Kevin', 'Emmanuel', 'Alex', 'Samuel'],
  F: ['Grace', 'Alice', 'Marie', 'Claire', 'Diane', 'Joy', 'Esther', 'Sarah'],
};
const LAST_NAMES = ['Mukamana', 'Niyonsenga', 'Habimana', 'Uwase', 'Irakoze', 'Nshimiyimana', 'Bizimana', 'Uwineza'];

const FABRIC_TYPES = [
  { type: 'White Sheet', color: 'White' },
  { type: 'Blue Sheet', color: 'Navy' },
  { type: 'Khaki Sheet', color: 'Khaki' },
  { type: 'Green Sheet', color: 'Green' },
  { type: 'White Sheet', color: 'Cream' },
];

const SUPPLIERS = ['ABC Textiles Ltd', 'Kigali Fabrics', 'East Africa Supplies', 'Uniform Warehouse', 'Prime Stitch Co'];

const UNIFORM_CATALOG = [
  { name: 'School Shirt', sizes: ['S', 'M', 'L', 'XL'] },
  { name: 'School Trouser', sizes: ['28', '30', '32', '34'] },
  { name: 'School Skirt', sizes: ['S', 'M', 'L'] },
  { name: 'School Tie', sizes: ['One'] },
  { name: 'School Sweater', sizes: ['S', 'M', 'L', 'XL'] },
  { name: 'Sports Jersey', sizes: ['S', 'M', 'L'] },
  { name: 'School Socks', sizes: ['One'] },
  { name: 'School Blazer', sizes: ['M', 'L', 'XL'] },
];

const CLASSES = ['P4 A', 'P5 B', 'S1 MPC', 'S2 Science', 'S3 Arts', 'S4 MPC', 'S5 MPC', 'S6 B'];

function parseArgs() {
  const args = process.argv.slice(2);
  let schoolId = null;
  let clear = false;
  for (const a of args) {
    if (a === '--clear') clear = true;
    const m = a.match(/^--school-id=(\d+)$/i);
    if (m) schoolId = Number(m[1]);
  }
  if (!schoolId && process.env.SEED_SCHOOL_ID) schoolId = Number(process.env.SEED_SCHOOL_ID);
  return { schoolId, clear };
}

function dateDaysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

function datetimeDaysAgo(n, hour = 10) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString().slice(0, 19).replace('T', ' ');
}

function inferAcademicYear() {
  const y = new Date().getFullYear();
  const m = new Date().getMonth();
  return m >= 8 ? `${y}/${y + 1}` : `${y - 1}/${y}`;
}

async function resolveSchoolId(explicit) {
  if (explicit && explicit > 0) return explicit;
  const [rows] = await promisePool.query(`SELECT id FROM schools ORDER BY id ASC LIMIT 1`).catch(() => [[]]);
  if (rows.length) return rows[0].id;
  const [alt] = await promisePool.query(
    `SELECT school_id AS id FROM users WHERE school_id IS NOT NULL GROUP BY school_id ORDER BY school_id LIMIT 1`
  );
  if (alt.length) return alt[0].id;
  throw new Error('No school found. Pass --school-id=N');
}

async function resolveAcademic(schoolId) {
  const [[row]] = await promisePool.query(
    `SELECT current_academic_year, active_terms_json FROM school_academic_settings WHERE school_id = ? LIMIT 1`,
    [schoolId]
  ).catch(() => [[null]]);
  let term = 'Term 1';
  try {
    if (row?.active_terms_json) {
      const parsed = typeof row.active_terms_json === 'string' ? JSON.parse(row.active_terms_json) : row.active_terms_json;
      if (Array.isArray(parsed) && parsed[0]) term = String(parsed[0]);
    }
  } catch (_) {}
  return {
    academicYear: String(row?.current_academic_year || '').trim() || inferAcademicYear(),
    term,
  };
}

async function clearDemoData(schoolId) {
  const [receipts] = await promisePool.query(
    `SELECT id FROM store_fabric_receipts WHERE school_id = ? AND (invoice_number LIKE ? OR note LIKE ?)`,
    [schoolId, `${DEMO_PREFIX}%`, `%${NOTE}%`]
  );
  const receiptIds = receipts.map((r) => r.id);
  if (receiptIds.length) {
    await promisePool.query(
      `UPDATE store_fabric_stockouts SET deleted_at = NOW() WHERE school_id = ? AND fabric_receipt_id IN (?)`,
      [schoolId, receiptIds]
    );
    await promisePool.query(
      `UPDATE store_fabric_receipts SET deleted_at = NOW() WHERE school_id = ? AND id IN (?)`,
      [schoolId, receiptIds]
    );
  }

  const [issues] = await promisePool.query(
    `SELECT id FROM store_uniform_issues WHERE school_id = ? AND issue_no LIKE ?`,
    [schoolId, `${DEMO_PREFIX}%`]
  );
  const issueIds = issues.map((r) => r.id);
  if (issueIds.length) {
    await promisePool.query(`DELETE FROM store_uniform_issue_slots WHERE issue_id IN (?)`, [issueIds]);
    await promisePool.query(`DELETE FROM store_uniform_issue_students WHERE issue_id IN (?)`, [issueIds]);
    await promisePool.query(`DELETE FROM store_uniform_issue_student_lines WHERE issue_id IN (?)`, [issueIds]);
    await promisePool.query(`DELETE FROM store_uniform_issue_lines WHERE issue_id IN (?)`, [issueIds]);
    await promisePool.query(`DELETE FROM store_uniform_student_charges WHERE issue_id IN (?)`, [issueIds]);
    await promisePool.query(`DELETE FROM store_uniform_issues WHERE id IN (?)`, [issueIds]);
  }

  await promisePool.query(
    `UPDATE store_finished_goods SET deleted_at = NOW() WHERE school_id = ? AND note LIKE ?`,
    [schoolId, `%${NOTE}%`]
  );

  await promisePool.query(
    `DELETE FROM students WHERE school_id = ? AND student_uid LIKE ?`,
    [schoolId, `${DEMO_STUDENT_PREFIX}%`]
  ).catch(() => {});

  console.log('Cleared previous General Stock Count demo data for school', schoolId);
}

async function ensureDemoStudents(schoolId, academicYear) {
  let students = [];
  try {
    const [rows] = await promisePool.query(
      `SELECT id, student_uid, student_code, first_name, last_name, class_name
       FROM students WHERE school_id = ? ORDER BY id ASC LIMIT ?`,
      [schoolId, DEMO_STUDENT_COUNT]
    );
    students = rows;
  } catch (_) {
    students = [];
  }

  if (students.length >= 10) return students;

  let inserted = 0;
  for (let i = 0; i < DEMO_STUDENT_COUNT; i += 1) {
    const gender = i % 2 === 0 ? 'Female' : 'Male';
    const first = FIRST_NAMES[gender === 'Male' ? 'M' : 'F'][i % 8];
    const last = LAST_NAMES[i % LAST_NAMES.length];
    const className = CLASSES[i % CLASSES.length];
    const studentUid = `${DEMO_STUDENT_PREFIX}-${String(i + 1).padStart(3, '0')}`;

    const [[exists]] = await promisePool.query(
      `SELECT id FROM students WHERE school_id = ? AND student_uid = ? LIMIT 1`,
      [schoolId, studentUid]
    ).catch(() => [[null]]);

    if (exists?.id) {
      students.push({ id: exists.id, student_uid: studentUid, first_name: first, last_name: last, class_name: className });
      continue;
    }

    try {
      const [ins] = await promisePool.query(
        `INSERT INTO students
         (student_uid, school_id, first_name, last_name, gender, class_name, academic_year)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [studentUid, schoolId, first, last, gender, className, academicYear]
      );
      students.push({
        id: ins.insertId,
        student_uid: studentUid,
        first_name: first,
        last_name: last,
        class_name: className,
      });
      inserted += 1;
    } catch (e) {
      console.warn('Could not insert demo student:', e.message || e);
    }
  }

  if (inserted) console.log(`Demo students: ${inserted} created for uniform stock-outs`);
  return students;
}

async function seedFabric(schoolId, academicYear, term) {
  const receiptIds = [];
  let seq = 0;

  for (let monthOffset = 0; monthOffset < 6; monthOffset += 1) {
    for (let j = 0; j < FABRIC_TYPES.length; j += 1) {
      seq += 1;
      const spec = FABRIC_TYPES[j];
      const daysAgo = monthOffset * 28 + j * 3 + 2;
      const purchaseDate = dateDaysAgo(daysAgo);
      const meters = 120 + seq * 15;
      const unitCost = 2200 + j * 180;
      const totalCost = meters * unitCost;
      const supplier = SUPPLIERS[j % SUPPLIERS.length];

      const [ins] = await promisePool.query(
        `INSERT INTO store_fabric_receipts
         (school_id, academic_year, term, purchase_date, invoice_number, fabric_type, color,
          meters, unit_cost, total_cost, remaining_meters, note, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          schoolId,
          academicYear,
          term,
          purchaseDate,
          `${DEMO_PREFIX}-GRN-${String(seq).padStart(3, '0')}`,
          spec.type,
          spec.color,
          meters,
          unitCost,
          totalCost,
          meters,
          `${NOTE} Supplier: ${supplier}`,
          datetimeDaysAgo(daysAgo),
        ]
      );
      receiptIds.push({ id: ins.insertId, meters, unitCost, purchaseDate, spec });
    }
  }

  let outCount = 0;
  for (let i = 0; i < receiptIds.length; i += 1) {
    const batch = receiptIds[i];
    const purchaseDaysAgo = Math.max(1, Math.floor((Date.now() - new Date(batch.purchaseDate).getTime()) / 86400000));
    let remaining = batch.meters;
    const outsPerReceipt = 1 + (i % 3);

    for (let o = 0; o < outsPerReceipt && remaining > 20; o += 1) {
      const metersOut = Math.min(18 + (i + o) * 6, remaining * 0.35);
      remaining = Math.max(0, remaining - metersOut);
      const outDate = dateDaysAgo(Math.max(1, purchaseDaysAgo - 3 - o * 7));

      await promisePool.query(
        `INSERT INTO store_fabric_stockouts
         (school_id, fabric_receipt_id, academic_year, term, out_date, meters_out, purpose, note, remaining_after)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          schoolId,
          batch.id,
          academicYear,
          term,
          outDate,
          metersOut,
          o === 0 ? 'Production / cutting' : 'Tailoring workshop',
          NOTE,
          remaining,
        ]
      );
      outCount += 1;
    }

    await promisePool.query(
      `UPDATE store_fabric_receipts SET remaining_meters = ? WHERE id = ? AND school_id = ?`,
      [remaining, batch.id, schoolId]
    );
  }

  console.log(`Fabric: ${receiptIds.length} stock-ins + ${outCount} stock-outs`);
  return receiptIds;
}

async function seedFinishedGoods(schoolId, academicYear, term, fabricReceipts) {
  const finishedIds = [];
  let seq = 0;

  for (const item of UNIFORM_CATALOG) {
    for (const size of item.sizes) {
      seq += 1;
      const daysAgo = (seq % 24) * 4 + 3;
      const stock = 80 + (seq % 12) * 15;
      const selling = 8000 + (seq % 10) * 1200;
      const cost = Math.round(selling * 0.65);
      const fabric = fabricReceipts[seq % fabricReceipts.length];

      const [ins] = await promisePool.query(
        `INSERT INTO store_finished_goods
         (school_id, fabric_receipt_id, uniform_name, size, stock, avg_cost, selling_price,
          academic_year, term, note, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          schoolId,
          fabric?.id || null,
          item.name,
          size,
          stock,
          cost,
          selling,
          academicYear,
          term,
          NOTE,
          datetimeDaysAgo(daysAgo),
        ]
      );
      finishedIds.push({
        id: ins.insertId,
        name: item.name,
        size,
        stock,
        selling,
        cost,
        createdDaysAgo: daysAgo,
      });
    }
  }

  console.log(`Finished uniforms: ${finishedIds.length} stock-in records`);
  return finishedIds;
}

async function seedUniformIssues(schoolId, academicYear, term, finishedIds) {
  const students = await ensureDemoStudents(schoolId, academicYear);

  if (!students.length) {
    console.warn('No students available — skipping uniform issue stock-outs');
    return 0;
  }

  const issueTarget = Math.min(finishedIds.length * 2, 55);
  let count = 0;
  for (let i = 0; i < issueTarget; i += 1) {
    const fg = finishedIds[i % finishedIds.length];
    const stu = students[i % students.length];
    const pieces = 1 + (i % 4);
    const unitPrice = fg.selling;
    const lineTotal = pieces * unitPrice;
    const daysAgo = (i % 24) * 5 + 2;
    const issueDate = dateDaysAgo(daysAgo);
    const className = stu.class_name || CLASSES[i % CLASSES.length];
    const issueNo = `${DEMO_PREFIX}-UI-${String(i + 1).padStart(3, '0')}`;
    const studentName = `${stu.first_name || ''} ${stu.last_name || ''}`.trim() || `Student ${stu.id}`;
    const studentUid = stu.student_uid || stu.student_code || String(stu.id);

    const [insIssue] = await promisePool.query(
      `INSERT INTO store_uniform_issues
       (school_id, issue_no, academic_year, term, class_name, students_count, total_pieces, total_amount,
        issued_by_name, status, created_at)
       VALUES (?, ?, ?, ?, ?, 1, ?, ?, 'Uniform Manager Demo', 'posted', ?)`,
      [schoolId, issueNo, academicYear, term, className, pieces, lineTotal, datetimeDaysAgo(daysAgo)]
    );
    const issueId = insIssue.insertId;

    await promisePool.query(
      `INSERT INTO store_uniform_issue_lines
       (issue_id, school_id, finished_good_id, item_name, qty_per_student, unit_price, total_qty, line_total)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [issueId, schoolId, fg.id, `${fg.name} (${fg.size})`, pieces, unitPrice, pieces, lineTotal]
    );

    await promisePool.query(
      `INSERT INTO store_uniform_issue_student_lines
       (issue_id, school_id, student_id, student_uid, student_name, finished_good_id, item_name,
        quantity, unit_price, amount, academic_year, term, class_name, issue_date)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        issueId,
        schoolId,
        stu.id,
        studentUid,
        studentName,
        fg.id,
        `${fg.name} (${fg.size})`,
        pieces,
        unitPrice,
        lineTotal,
        academicYear,
        term,
        className,
        issueDate,
      ]
    );

    await promisePool.query(
      `UPDATE store_finished_goods SET stock = GREATEST(0, stock - ?) WHERE id = ? AND school_id = ?`,
      [pieces, fg.id, schoolId]
    );
    count += 1;
  }

  console.log(`Uniform stock-out: ${count} issue records`);
  return count;
}

(async () => {
  const { schoolId: explicitId, clear } = parseArgs();
  console.log(`Database: ${process.env.DB_NAME} @ ${process.env.DB_HOST}`);

  const schoolId = await resolveSchoolId(explicitId);
  const { academicYear, term } = await resolveAcademic(schoolId);
  console.log(`School ID: ${schoolId} | Year: ${academicYear} | Term: ${term}`);

  if (clear) await clearDemoData(schoolId);

  try {
    const fabrics = await seedFabric(schoolId, academicYear, term);
    const finished = await seedFinishedGoods(schoolId, academicYear, term, fabrics);
    await seedUniformIssues(schoolId, academicYear, term, finished);
  } catch (e) {
    console.error('Seed failed:', e.message || e);
    process.exit(1);
  }

  console.log('\nDone. Open Uniform Manager → Reports → General Stock Count and click Refresh.');
  console.log('Try date range: last 6 months, or switch between Finished uniforms / Fabric stock.');
  console.log(`IMPORTANT: Demo data is for school ${schoolId} only. Log in as that school, or re-run with your school id.`);
  console.log(`Clear demo: node scripts/seed-uniform-stock-count-demo.js --clear --school-id=${schoolId}`);
  await promisePool.end();
})().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
