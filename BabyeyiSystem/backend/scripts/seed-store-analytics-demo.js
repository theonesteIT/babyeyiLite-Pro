'use strict';

/**
 * Seeds ~10 stock-in + ~10 stock-out records each for Food, Other, and Uniform
 * so the storekeeper Analytics page has realistic charts.
 *
 * Usage:
 *   node scripts/seed-store-analytics-demo.js
 *   node scripts/seed-store-analytics-demo.js --school-id=1
 *   node scripts/seed-store-analytics-demo.js --clear
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { promisePool } = require('../config/database');

const COUNT = 10;
const DEMO_PREFIX = 'DEMO-ANALYTICS';
const NOTE = '[analytics-demo]';

const FOOD_ITEMS = ['Rice', 'Maize flour', 'Beans', 'Cooking oil', 'Sugar', 'Milk powder', 'Tomatoes', 'Onions', 'Salt', 'Tea leaves'];
const OTHER_CATEGORIES = ['Stationery', 'Cleaning', 'Lab', 'Sports', 'ICT', 'Furniture', 'Medical', 'Kitchen', 'Maintenance', 'Safety'];
const OTHER_ITEMS = ['Chalk box', 'Bleach', 'Beakers set', 'Footballs', 'USB drives', 'Plastic chairs', 'First aid kit', 'Serving spoons', 'Paint tins', 'Fire extinguisher'];
const UNIFORM_ITEMS = ['School Shirt', 'School Trouser', 'School Skirt', 'School Tie', 'School Sweater', 'Sports Jersey', 'Sports Shorts', 'School Socks', 'School Blazer', 'PE T-shirt'];
const CLASSES = ['P1 A', 'P2 B', 'P3 A', 'P4 B', 'P5 A', 'P6 B', 'S1 A', 'S2 B', 'S3 A', 'S4 B'];

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

function inferAcademicYear() {
  const y = new Date().getFullYear();
  const m = new Date().getMonth();
  return m >= 8 ? `${y}/${y + 1}` : `${y - 1}/${y}`;
}

async function resolveSchoolId(explicit) {
  if (explicit && explicit > 0) return explicit;
  const [rows] = await promisePool.query(
    `SELECT id FROM schools ORDER BY id ASC LIMIT 1`
  ).catch(() => [[]]);
  if (!rows.length) {
    const [alt] = await promisePool.query(`SELECT school_id AS id FROM users WHERE school_id IS NOT NULL GROUP BY school_id ORDER BY school_id LIMIT 1`);
    if (alt.length) return alt[0].id;
    throw new Error('No school found. Pass --school-id=N');
  }
  return rows[0].id;
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
  const [foodIns] = await promisePool.query(
    `SELECT id FROM store_food_stock_ins WHERE school_id = ? AND (invoice_number LIKE ? OR note LIKE ?)`,
    [schoolId, `${DEMO_PREFIX}%`, `%${NOTE}%`]
  );
  const foodIds = foodIns.map((r) => r.id);
  if (foodIds.length) {
    await promisePool.query(
      `UPDATE store_food_consumptions SET deleted_at = NOW() WHERE school_id = ? AND food_stock_in_id IN (?)`,
      [schoolId, foodIds]
    );
    await promisePool.query(
      `UPDATE store_food_stock_ins SET deleted_at = NOW() WHERE school_id = ? AND id IN (?)`,
      [schoolId, foodIds]
    );
  }

  const [otherIns] = await promisePool.query(
    `SELECT id FROM store_other_stock_ins WHERE school_id = ? AND (invoice_number LIKE ? OR note LIKE ?)`,
    [schoolId, `${DEMO_PREFIX}%`, `%${NOTE}%`]
  );
  const otherIds = otherIns.map((r) => r.id);
  if (otherIds.length) {
    await promisePool.query(
      `UPDATE store_other_stock_outs SET deleted_at = NOW() WHERE school_id = ? AND other_stock_in_id IN (?)`,
      [schoolId, otherIds]
    );
    await promisePool.query(
      `UPDATE store_other_stock_ins SET deleted_at = NOW() WHERE school_id = ? AND id IN (?)`,
      [schoolId, otherIds]
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
    await promisePool.query(`UPDATE store_uniform_issues SET deleted_at = NOW() WHERE id IN (?)`, [issueIds]);
  }

  await promisePool.query(
    `UPDATE store_finished_goods SET deleted_at = NOW() WHERE school_id = ? AND note LIKE ?`,
    [schoolId, `%${NOTE}%`]
  );

  console.log('Cleared previous demo rows for school', schoolId);
}

async function seedFood(schoolId, academicYear, term) {
  const stockInIds = [];
  for (let i = 0; i < COUNT; i++) {
    try {
    const qty = 50 + i * 10;
    const unitCost = 800 + i * 120;
    const totalCost = qty * unitCost;
    const receiveDate = dateDaysAgo(150 - i * 12);
    const [ins] = await promisePool.query(
      `INSERT INTO store_food_stock_ins
       (school_id, academic_year, term, receive_date, invoice_number, item_name, quantity, unit_type,
        unit_cost, total_cost, remaining_quantity, min_level, expiry_date, store_location, note)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'kg', ?, ?, ?, 5, ?, 'Main store', ?)`,
      [
        schoolId,
        academicYear,
        term,
        receiveDate,
        `${DEMO_PREFIX}-FOOD-IN-${String(i + 1).padStart(2, '0')}`,
        FOOD_ITEMS[i],
        qty,
        unitCost,
        totalCost,
        qty,
        dateDaysAgo(-30 + i * 5),
        NOTE,
      ]
    );
    stockInIds.push({ id: ins.insertId, qty, item: FOOD_ITEMS[i] });
    } catch (e) {
      e.step = `food stock-in #${i + 1}`;
      throw e;
    }
  }

  for (let i = 0; i < COUNT; i++) {
    try {
    const batch = stockInIds[i];
    const consumeQty = 5 + i * 2;
    const remainingAfter = Math.max(0, batch.qty - consumeQty);
    const consumptionDate = dateDaysAgo(90 - i * 8);
    await promisePool.query(
      `INSERT INTO store_food_consumptions
       (school_id, food_stock_in_id, academic_year, term, consumption_date, quantity, unit_type,
        allocated_to, allocated_other, note, remaining_after)
       VALUES (?, ?, ?, ?, ?, ?, 'kg', 'Kitchen', NULL, ?, ?)`,
      [schoolId, batch.id, academicYear, term, consumptionDate, consumeQty, NOTE, remainingAfter]
    );
    await promisePool.query(
      `UPDATE store_food_stock_ins SET remaining_quantity = ? WHERE id = ? AND school_id = ?`,
      [remainingAfter, batch.id, schoolId]
    );
    } catch (e) {
      e.step = `food consumption #${i + 1}`;
      throw e;
    }
  }

  console.log(`Food: ${COUNT} stock-ins + ${COUNT} consumptions`);
}

async function seedOther(schoolId, academicYear, term) {
  const stockInIds = [];
  for (let i = 0; i < COUNT; i++) {
    const qty = 20 + i * 5;
    const unitCost = 1500 + i * 200;
    const totalCost = qty * unitCost;
    const receiveDate = dateDaysAgo(140 - i * 11);
    const [ins] = await promisePool.query(
      `INSERT INTO store_other_stock_ins
       (school_id, academic_year, term, receive_date, invoice_number, category, item_name, quantity, unit_type,
        unit_cost, total_cost, remaining_quantity, min_level, store_location, note)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pcs', ?, ?, ?, 3, 'Supply room', ?)`,
      [
        schoolId,
        academicYear,
        term,
        receiveDate,
        `${DEMO_PREFIX}-OTHER-IN-${String(i + 1).padStart(2, '0')}`,
        OTHER_CATEGORIES[i],
        OTHER_ITEMS[i],
        qty,
        unitCost,
        totalCost,
        qty,
        NOTE,
      ]
    );
    stockInIds.push({ id: ins.insertId, qty });
  }

  for (let i = 0; i < COUNT; i++) {
    const batch = stockInIds[i];
    const issueQty = 2 + i;
    const remainingAfter = Math.max(0, batch.qty - issueQty);
    const issueDate = dateDaysAgo(75 - i * 7);
    await promisePool.query(
      `INSERT INTO store_other_stock_outs
       (school_id, other_stock_in_id, academic_year, term, issue_date, quantity, unit_type,
        issued_to, issued_other, note, remaining_after)
       VALUES (?, ?, ?, ?, ?, ?, 'pcs', 'Department', NULL, ?, ?)`,
      [schoolId, batch.id, academicYear, term, issueDate, issueQty, NOTE, remainingAfter]
    );
    await promisePool.query(
      `UPDATE store_other_stock_ins SET remaining_quantity = ? WHERE id = ? AND school_id = ?`,
      [remainingAfter, batch.id, schoolId]
    );
  }

  console.log(`Other: ${COUNT} stock-ins + ${COUNT} issues (outs)`);
}

async function seedUniform(schoolId, academicYear, term) {
  let students = [];
  try {
    const [rows] = await promisePool.query(
      `SELECT id, student_uid, student_code, first_name, last_name, class_name
       FROM students WHERE school_id = ? ORDER BY id ASC LIMIT ?`,
      [schoolId, COUNT]
    );
    students = rows;
  } catch (_) {
    const [rows] = await promisePool.query(
      `SELECT id, student_uid, student_code, first_name, last_name
       FROM students WHERE school_id = ? ORDER BY id ASC LIMIT ?`,
      [schoolId, COUNT]
    );
    students = rows;
  }

  if (!students.length) {
    console.warn('Uniform: no students found — skipping uniform issues (finished goods still seeded)');
  }

  const finishedGoodIds = [];
  for (let i = 0; i < COUNT; i++) {
    const stock = 200 + i * 25;
    const price = 12000 + i * 1500;
    const [ins] = await promisePool.query(
      `INSERT INTO store_finished_goods
       (school_id, uniform_name, size, stock, avg_cost, selling_price, academic_year, term, note)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        schoolId,
        UNIFORM_ITEMS[i],
        ['S', 'M', 'L', 'XL', '28', '30', '32', '34', '36', '38'][i],
        stock,
        price * 0.6,
        price,
        academicYear,
        term,
        NOTE,
      ]
    );
    finishedGoodIds.push({ id: ins.insertId, name: UNIFORM_ITEMS[i], price });
  }
  console.log(`Uniform stock-in: ${COUNT} finished goods`);

  if (!students.length) return;

  for (let i = 0; i < COUNT; i++) {
    const stu = students[i % students.length];
    const fg = finishedGoodIds[i % finishedGoodIds.length];
    const className = stu.class_name || CLASSES[i];
    const pieces = 2 + (i % 3);
    const unitPrice = fg.price;
    const lineTotal = pieces * unitPrice;
    const issueNo = `${DEMO_PREFIX}-UNI-${String(i + 1).padStart(2, '0')}`;
    const issueDate = dateDaysAgo(120 - i * 10);
    const studentName = `${stu.first_name || ''} ${stu.last_name || ''}`.trim() || `Student ${stu.id}`;
    const studentUid = stu.student_uid || stu.student_code || String(stu.id);

    const [insIssue] = await promisePool.query(
      `INSERT INTO store_uniform_issues
       (school_id, issue_no, academic_year, term, class_name, students_count, total_pieces, total_amount,
        issued_by_name, status, created_at)
       VALUES (?, ?, ?, ?, ?, 1, ?, ?, 'Demo Seeder', 'posted', ?)`,
      [schoolId, issueNo, academicYear, term, className, pieces, lineTotal, `${issueDate} 10:00:00`]
    );
    const issueId = insIssue.insertId;

    await promisePool.query(
      `INSERT INTO store_uniform_issue_lines
       (issue_id, school_id, finished_good_id, item_name, qty_per_student, unit_price, total_qty, line_total)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [issueId, schoolId, fg.id, fg.name, pieces, unitPrice, pieces, lineTotal]
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
        fg.name,
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
  }

  console.log(`Uniform stock-out: ${COUNT} uniform issues`);
}

(async () => {
  const { schoolId: explicitId, clear } = parseArgs();
  console.log(`Database: ${process.env.DB_NAME} @ ${process.env.DB_HOST}`);

  const schoolId = await resolveSchoolId(explicitId);
  const { academicYear, term } = await resolveAcademic(schoolId);
  console.log(`School ID: ${schoolId} | Year: ${academicYear} | Term: ${term}`);

  if (clear) await clearDemoData(schoolId);

  try {
    await seedFood(schoolId, academicYear, term);
    await seedOther(schoolId, academicYear, term);
    await seedUniform(schoolId, academicYear, term);
  } catch (e) {
    console.error('Seed failed at:', e.step || 'unknown', e.message || e);
    process.exit(1);
  }

  console.log('\nDone. Open Storekeeper → Analytics and click Refresh.');
  console.log('To remove demo data: node scripts/seed-store-analytics-demo.js --clear --school-id=' + schoolId);
  await promisePool.end();
})().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
