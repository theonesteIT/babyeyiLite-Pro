// ================================================================
// storekeeper.js — School store: inventory, movements, requisitions (read/update)
//   GET/POST/PATCH/DELETE /api/store/inventory
//   GET/POST /api/store/movements
//   GET /api/store/requisitions
//   PATCH /api/store/requisitions/:id/status   (id = numeric PK or req_code e.g. REQ-1001)
//   GET/POST/PATCH/DELETE /api/store/suppliers
// ════════════════════════════════════════════════════════════════

const express = require('express');
const { promisePool } = require('../config/database');
const { requireRole } = require('../middleware/deoAuth');

const router = express.Router();

const STORE_ACCESS = [
  'STORE_MANAGER', 'SCHOOL_ADMIN', 'SCHOOL_MANAGER', 'ACCOUNTANT', 'DOS', 'HOD',
];

function resolveSchoolId(req) {
  return (
    req.session?.school_id ||
    req.session?.user?.school_id ||
    req.session?.user?.school?.id ||
    null
  );
}

function trimStr(v) {
  if (v === undefined || v === null) return '';
  return String(v).trim();
}

let storeTablesReady = false;
async function ensureStoreTables() {
  if (storeTablesReady) return;
  await promisePool.query(`
    CREATE TABLE IF NOT EXISTS school_store_items (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      school_id INT UNSIGNED NOT NULL,
      name VARCHAR(255) NOT NULL,
      category VARCHAR(120) NOT NULL DEFAULT 'Other',
      term VARCHAR(32) NULL,
      academic_year VARCHAR(64) NULL,
      unit VARCHAR(32) NOT NULL DEFAULT 'pcs',
      quantity DECIMAL(14,3) NOT NULL DEFAULT 0,
      reorder_level DECIMAL(14,3) NOT NULL DEFAULT 0,
      unit_cost DECIMAL(14,2) NOT NULL DEFAULT 0,
      location VARCHAR(255) NULL,
      note TEXT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      KEY idx_ssi_school (school_id),
      KEY idx_ssi_name (school_id, name)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  await promisePool.query(`
    CREATE TABLE IF NOT EXISTS school_store_movements (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      school_id INT UNSIGNED NOT NULL,
      item_id INT UNSIGNED NOT NULL,
      movement_type VARCHAR(32) NOT NULL,
      term VARCHAR(32) NULL,
      academic_year VARCHAR(64) NULL,
      movement_date DATE NULL,
      quantity DECIMAL(14,3) NOT NULL,
      stock_after DECIMAL(14,3) NOT NULL DEFAULT 0,
      unit_cost DECIMAL(14,2) NULL,
      ref_no VARCHAR(120) NULL,
      note TEXT NULL,
      created_by_user_id INT UNSIGNED NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      KEY idx_ssm_school (school_id),
      KEY idx_ssm_item (item_id),
      KEY idx_ssm_created (created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  await promisePool.query(`ALTER TABLE school_store_items ADD COLUMN term VARCHAR(32) NULL`).catch(() => {});
  await promisePool.query(`ALTER TABLE school_store_items ADD COLUMN academic_year VARCHAR(64) NULL`).catch(() => {});
  await promisePool.query(`ALTER TABLE school_store_movements ADD COLUMN term VARCHAR(32) NULL`).catch(() => {});
  await promisePool.query(`ALTER TABLE school_store_movements ADD COLUMN academic_year VARCHAR(64) NULL`).catch(() => {});
  await promisePool.query(`ALTER TABLE school_store_movements ADD COLUMN movement_date DATE NULL`).catch(() => {});
  await promisePool.query(`ALTER TABLE school_store_movements ADD COLUMN stock_after DECIMAL(14,3) NOT NULL DEFAULT 0`).catch(() => {});
  storeTablesReady = true;
}

let reqTableReady = false;
async function ensureRequisitionsTable() {
  if (reqTableReady) return;
  await promisePool.query(`
    CREATE TABLE IF NOT EXISTS school_requisitions (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      school_id INT UNSIGNED NOT NULL,
      req_code VARCHAR(40) NOT NULL,
      dept VARCHAR(120) NOT NULL,
      requester VARCHAR(180) NOT NULL,
      items TEXT NOT NULL,
      amount DECIMAL(14,2) NOT NULL DEFAULT 0,
      submitted_date DATE NOT NULL,
      status ENUM('pending','approved','rejected','issued') NOT NULL DEFAULT 'pending',
      attachment_name VARCHAR(255) NULL,
      note TEXT NULL,
      created_by_user_id INT UNSIGNED NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      approved_by_user_id INT UNSIGNED NULL,
      approved_at DATETIME NULL,
      INDEX idx_sr_school (school_id),
      INDEX idx_sr_status (status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  try {
    await promisePool.query(`
      ALTER TABLE school_requisitions
      MODIFY COLUMN status ENUM('pending','approved','rejected','issued') NOT NULL DEFAULT 'pending'
    `);
  } catch (_) { /* already migrated */ }
  reqTableReady = true;
}

let suppliersTableReady = false;
async function ensureSuppliersTable() {
  if (suppliersTableReady) return;
  await promisePool.query(`
    CREATE TABLE IF NOT EXISTS school_store_suppliers (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      school_id INT UNSIGNED NOT NULL,
      name VARCHAR(255) NOT NULL,
      contact_person VARCHAR(180) NULL,
      phone VARCHAR(64) NULL,
      email VARCHAR(180) NULL,
      address VARCHAR(500) NULL,
      categories VARCHAR(255) NULL,
      note TEXT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      KEY idx_sss_school (school_id),
      KEY idx_sss_name (school_id, name)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  suppliersTableReady = true;
}

async function resolveRequisitionRowId(schoolId, idParam) {
  const raw = trimStr(idParam);
  if (!raw) return null;
  if (/^\d+$/.test(raw)) {
    const [[r]] = await promisePool.query(
      'SELECT id FROM school_requisitions WHERE school_id = ? AND id = ? LIMIT 1',
      [schoolId, Number(raw)]
    );
    return r?.id || null;
  }
  const [[r2]] = await promisePool.query(
    'SELECT id FROM school_requisitions WHERE school_id = ? AND req_code = ? LIMIT 1',
    [schoolId, raw]
  );
  return r2?.id || null;
}

// ════════════════════════════════════════════════════════════════
// INVENTORY
// ════════════════════════════════════════════════════════════════
router.get('/store/inventory', requireRole(STORE_ACCESS), async (req, res) => {
  try {
    const schoolId = resolveSchoolId(req);
    if (!schoolId) return res.status(400).json({ success: false, message: 'School not found in session.' });
    await ensureStoreTables();
    const [rows] = await promisePool.query(
      `SELECT id, name, category, term, academic_year, unit, quantity, reorder_level, unit_cost, location, note
       FROM school_store_items WHERE school_id = ? ORDER BY name ASC`,
      [schoolId]
    );
    const data = rows.map((r) => ({
      id: r.id,
      name: r.name,
      category: r.category,
      term: r.term || '',
      academic_year: r.academic_year || '',
      unit: r.unit,
      quantity: Number(r.quantity),
      reorder_level: Number(r.reorder_level),
      unit_cost: Number(r.unit_cost),
      location: r.location || '',
      note: r.note || '',
    }));
    return res.json({ success: true, data });
  } catch (err) {
    console.error('GET /store/inventory:', err);
    return res.status(500).json({ success: false, message: 'Failed to load inventory' });
  }
});

router.post('/store/inventory', requireRole(STORE_ACCESS), async (req, res) => {
  try {
    const schoolId = resolveSchoolId(req);
    const userId = req.session?.userId || req.session?.user?.id;
    if (!schoolId || !userId) return res.status(400).json({ success: false, message: 'Invalid session.' });
    await ensureStoreTables();
    const b = req.body || {};
    const name = trimStr(b.name);
    if (!name) return res.status(400).json({ success: false, message: 'name is required.' });
    const [ins] = await promisePool.query(
      `INSERT INTO school_store_items
        (school_id, name, category, term, academic_year, unit, quantity, reorder_level, unit_cost, location, note)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        schoolId,
        name,
        trimStr(b.category) || 'Other',
        trimStr(b.term) || null,
        trimStr(b.academic_year) || null,
        trimStr(b.unit) || 'pcs',
        Number(b.quantity) || 0,
        Number(b.reorder_level) || 0,
        Number(b.unit_cost) || 0,
        trimStr(b.location) || null,
        trimStr(b.note) || null,
      ]
    );
    return res.status(201).json({ success: true, data: { id: ins.insertId } });
  } catch (err) {
    console.error('POST /store/inventory:', err);
    return res.status(500).json({ success: false, message: 'Failed to create item' });
  }
});

router.patch('/store/inventory/:id', requireRole(STORE_ACCESS), async (req, res) => {
  try {
    const schoolId = resolveSchoolId(req);
    if (!schoolId) return res.status(400).json({ success: false, message: 'School not found in session.' });
    await ensureStoreTables();
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ success: false, message: 'Invalid id.' });
    const b = req.body || {};
    const [[cur]] = await promisePool.query(
      'SELECT name, category, term, academic_year, unit, quantity, reorder_level, unit_cost, location, note FROM school_store_items WHERE id = ? AND school_id = ?',
      [id, schoolId]
    );
    if (!cur) return res.status(404).json({ success: false, message: 'Item not found.' });
    const name = b.name !== undefined ? trimStr(b.name) : cur.name;
    const category = b.category !== undefined ? trimStr(b.category) : cur.category;
    const term = b.term !== undefined ? trimStr(b.term) : cur.term;
    const academic_year = b.academic_year !== undefined ? trimStr(b.academic_year) : cur.academic_year;
    const unit = b.unit !== undefined ? trimStr(b.unit) : cur.unit;
    const quantity = b.quantity !== undefined ? Number(b.quantity) : Number(cur.quantity);
    const reorder_level = b.reorder_level !== undefined ? Number(b.reorder_level) : Number(cur.reorder_level);
    const unit_cost = b.unit_cost !== undefined ? Number(b.unit_cost) : Number(cur.unit_cost);
    const location = b.location !== undefined ? trimStr(b.location) : cur.location;
    const note = b.note !== undefined ? trimStr(b.note) : cur.note;
    await promisePool.query(
      `UPDATE school_store_items SET name=?, category=?, term=?, academic_year=?, unit=?, quantity=?, reorder_level=?, unit_cost=?, location=?, note=?
       WHERE id = ? AND school_id = ?`,
      [name, category, term || null, academic_year || null, unit, quantity, reorder_level, unit_cost, location || null, note || null, id, schoolId]
    );
    return res.json({ success: true });
  } catch (err) {
    console.error('PATCH /store/inventory/:id:', err);
    return res.status(500).json({ success: false, message: 'Failed to update item' });
  }
});

router.delete('/store/inventory/:id', requireRole(STORE_ACCESS), async (req, res) => {
  try {
    const schoolId = resolveSchoolId(req);
    if (!schoolId) return res.status(400).json({ success: false, message: 'School not found in session.' });
    await ensureStoreTables();
    const id = Number(req.params.id);
    await promisePool.query('DELETE FROM school_store_items WHERE id = ? AND school_id = ?', [id, schoolId]);
    return res.json({ success: true });
  } catch (err) {
    console.error('DELETE /store/inventory/:id:', err);
    return res.status(500).json({ success: false, message: 'Failed to delete item' });
  }
});

// ════════════════════════════════════════════════════════════════
// MOVEMENTS
// ════════════════════════════════════════════════════════════════
router.get('/store/movements', requireRole(STORE_ACCESS), async (req, res) => {
  try {
    const schoolId = resolveSchoolId(req);
    if (!schoolId) return res.status(400).json({ success: false, message: 'School not found in session.' });
    await ensureStoreTables();
    const term = trimStr(req.query?.term);
    const academicYear = trimStr(req.query?.academic_year);
    const specificDate = trimStr(req.query?.date);
    const where = ['m.school_id = ?'];
    const params = [schoolId];
    if (term) {
      where.push('m.term = ?');
      params.push(term);
    }
    if (academicYear) {
      where.push('m.academic_year = ?');
      params.push(academicYear);
    }
    if (specificDate) {
      where.push('DATE(COALESCE(m.movement_date, m.created_at)) = ?');
      params.push(specificDate);
    }
    const [rows] = await promisePool.query(
      `SELECT m.id, m.item_id, i.name AS item_name, m.movement_type AS type, m.term, m.academic_year,
              m.movement_date, m.quantity, m.stock_after, i.quantity AS current_item_stock,
              m.unit_cost, m.ref_no AS ref, m.note, m.created_at
       FROM school_store_movements m
       INNER JOIN school_store_items i ON i.id = m.item_id AND i.school_id = m.school_id
       WHERE ${where.join(' AND ')}
       ORDER BY m.created_at DESC
       LIMIT 500`,
      params
    );
    const normalizeType = (raw) => {
      const t = String(raw || '').toLowerCase();
      if (t === 'received' || t === 'stock_in') return 'stock_in';
      if (t === 'issued' || t === 'stock_out') return 'stock_out';
      if (t === 'returned') return 'returned';
      return 'adjusted';
    };
    const data = rows.map((r) => ({
      id: r.id,
      item_id: r.item_id,
      item_name: r.item_name,
      type: normalizeType(r.type),
      term: r.term || '',
      academic_year: r.academic_year || '',
      movement_date: r.movement_date || null,
      quantity: Number(r.quantity),
      stock_after: Number(r.stock_after || r.current_item_stock || 0),
      unit_cost: r.unit_cost != null ? Number(r.unit_cost) : null,
      ref: r.ref || '',
      note: r.note || '',
      created_at: r.created_at,
    }));
    return res.json({ success: true, data });
  } catch (err) {
    console.error('GET /store/movements:', err);
    return res.status(500).json({ success: false, message: 'Failed to load movements' });
  }
});

router.post('/store/movements', requireRole(STORE_ACCESS), async (req, res) => {
  const conn = await promisePool.getConnection();
  try {
    const schoolId = resolveSchoolId(req);
    const userId = req.session?.userId || req.session?.user?.id;
    if (!schoolId || !userId) {
      conn.release();
      return res.status(400).json({ success: false, message: 'Invalid session.' });
    }
    await ensureStoreTables();
    const b = req.body || {};
    const itemId = Number(b.item_id);
    const qty = Number(b.quantity);
    const rawType = trimStr(b.type).toLowerCase();
    const type = rawType === 'received' || rawType === 'stock_in'
      ? 'stock_in'
      : rawType === 'issued' || rawType === 'stock_out'
        ? 'stock_out'
        : rawType === 'returned'
          ? 'returned'
          : rawType === 'adjusted'
            ? 'adjusted'
            : '';
    if (!itemId || !qty || qty <= 0 || !['stock_in', 'stock_out', 'adjusted', 'returned'].includes(type)) {
      conn.release();
      return res.status(400).json({ success: false, message: 'Invalid movement payload.' });
    }
    await conn.beginTransaction();
    const [[item]] = await conn.query(
      'SELECT id, quantity, term, academic_year FROM school_store_items WHERE id = ? AND school_id = ? FOR UPDATE',
      [itemId, schoolId]
    );
    if (!item) {
      await conn.rollback();
      conn.release();
      return res.status(404).json({ success: false, message: 'Item not found.' });
    }
    let newQty = Number(item.quantity);
    if (type === 'stock_in' || type === 'returned') newQty += qty;
    else if (type === 'stock_out') newQty -= qty;
    else if (type === 'adjusted') newQty = qty;
    if (newQty < 0) {
      await conn.rollback();
      conn.release();
      return res.status(400).json({ success: false, message: 'Insufficient stock for this movement.' });
    }
    await conn.query('UPDATE school_store_items SET quantity = ? WHERE id = ? AND school_id = ?', [newQty, itemId, schoolId]);
    const uc = b.unit_cost != null && b.unit_cost !== '' ? Number(b.unit_cost) : null;
    await conn.query(
      `INSERT INTO school_store_movements
        (school_id, item_id, movement_type, term, academic_year, movement_date, quantity, stock_after, unit_cost, ref_no, note, created_by_user_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        schoolId,
        itemId,
        type,
        trimStr(b.term) || trimStr(item.term) || null,
        trimStr(b.academic_year) || trimStr(item.academic_year) || null,
        trimStr(b.movement_date || b.date) || null,
        qty,
        newQty,
        uc,
        trimStr(b.ref) || null,
        trimStr(b.note) || null,
        userId,
      ]
    );
    await conn.commit();
    conn.release();
    return res.status(201).json({ success: true });
  } catch (err) {
    await conn.rollback().catch(() => {});
    conn.release();
    console.error('POST /store/movements:', err);
    return res.status(500).json({ success: false, message: 'Failed to record movement' });
  }
});

// ════════════════════════════════════════════════════════════════
// REQUISITIONS (shared table with accountant module)
// ════════════════════════════════════════════════════════════════
router.get('/store/requisitions', requireRole(STORE_ACCESS), async (req, res) => {
  try {
    const schoolId = resolveSchoolId(req);
    if (!schoolId) return res.status(400).json({ success: false, message: 'School not found in session.' });
    await ensureRequisitionsTable();
    const [rows] = await promisePool.query(
      `SELECT id, req_code, dept, requester, items, amount, submitted_date, status, attachment_name, note
       FROM school_requisitions
       WHERE school_id = ?
       ORDER BY submitted_date DESC, id DESC
       LIMIT 300`,
      [schoolId]
    );
    const data = rows.map((r) => ({
      id: r.req_code || `REQ-${String(r.id).padStart(4, '0')}`,
      db_id: r.id,
      dept: r.dept,
      requester: r.requester,
      items: r.items,
      amount: Number(r.amount || 0),
      submitted: r.submitted_date,
      status: r.status,
      attachmentName: r.attachment_name || '',
      note: r.note || '',
    }));
    return res.json({ success: true, data });
  } catch (err) {
    console.error('GET /store/requisitions:', err);
    return res.status(500).json({ success: false, message: 'Failed to load requisitions' });
  }
});

router.patch('/store/requisitions/:id/status', requireRole(STORE_ACCESS), async (req, res) => {
  try {
    const schoolId = resolveSchoolId(req);
    const userId = req.session?.userId || req.session?.user?.id;
    if (!schoolId || !userId) return res.status(400).json({ success: false, message: 'Invalid session.' });
    await ensureRequisitionsTable();
    const rowId = await resolveRequisitionRowId(schoolId, req.params.id);
    const status = trimStr(req.body?.status).toLowerCase();
    if (!rowId || !['pending', 'approved', 'rejected', 'issued'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid payload.' });
    }
    await promisePool.query(
      `UPDATE school_requisitions
       SET status = ?, approved_by_user_id = ?, approved_at = NOW()
       WHERE id = ? AND school_id = ?`,
      [status, userId, rowId, schoolId]
    );
    return res.json({ success: true });
  } catch (err) {
    console.error('PATCH /store/requisitions/:id/status:', err);
    return res.status(500).json({ success: false, message: 'Failed to update requisition status' });
  }
});

// ════════════════════════════════════════════════════════════════
// SUPPLIERS
// ════════════════════════════════════════════════════════════════
router.get('/store/suppliers', requireRole(STORE_ACCESS), async (req, res) => {
  try {
    const schoolId = resolveSchoolId(req);
    if (!schoolId) return res.status(400).json({ success: false, message: 'School not found in session.' });
    await ensureSuppliersTable();
    const [rows] = await promisePool.query(
      `SELECT id, name, contact_person, phone, email, address, categories, note
       FROM school_store_suppliers WHERE school_id = ? ORDER BY name ASC`,
      [schoolId]
    );
    const data = rows.map((r) => ({
      id: r.id,
      name: r.name,
      contact_person: r.contact_person || '',
      phone: r.phone || '',
      email: r.email || '',
      address: r.address || '',
      categories: r.categories || '',
      note: r.note || '',
    }));
    return res.json({ success: true, data });
  } catch (err) {
    console.error('GET /store/suppliers:', err);
    return res.status(500).json({ success: false, message: 'Failed to load suppliers' });
  }
});

router.post('/store/suppliers', requireRole(STORE_ACCESS), async (req, res) => {
  try {
    const schoolId = resolveSchoolId(req);
    if (!schoolId) return res.status(400).json({ success: false, message: 'School not found in session.' });
    await ensureSuppliersTable();
    const b = req.body || {};
    const name = trimStr(b.name);
    if (!name) return res.status(400).json({ success: false, message: 'name is required.' });
    const [ins] = await promisePool.query(
      `INSERT INTO school_store_suppliers
        (school_id, name, contact_person, phone, email, address, categories, note)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        schoolId,
        name,
        trimStr(b.contact_person) || null,
        trimStr(b.phone) || null,
        trimStr(b.email) || null,
        trimStr(b.address) || null,
        trimStr(b.categories) || null,
        trimStr(b.note) || null,
      ]
    );
    return res.status(201).json({ success: true, data: { id: ins.insertId } });
  } catch (err) {
    console.error('POST /store/suppliers:', err);
    return res.status(500).json({ success: false, message: 'Failed to create supplier' });
  }
});

router.patch('/store/suppliers/:id', requireRole(STORE_ACCESS), async (req, res) => {
  try {
    const schoolId = resolveSchoolId(req);
    if (!schoolId) return res.status(400).json({ success: false, message: 'School not found in session.' });
    await ensureSuppliersTable();
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ success: false, message: 'Invalid id.' });
    const b = req.body || {};
    const [[cur]] = await promisePool.query(
      'SELECT name, contact_person, phone, email, address, categories, note FROM school_store_suppliers WHERE id = ? AND school_id = ?',
      [id, schoolId]
    );
    if (!cur) return res.status(404).json({ success: false, message: 'Supplier not found.' });
    const name = b.name !== undefined ? trimStr(b.name) : cur.name;
    const contact_person = b.contact_person !== undefined ? trimStr(b.contact_person) : cur.contact_person;
    const phone = b.phone !== undefined ? trimStr(b.phone) : cur.phone;
    const email = b.email !== undefined ? trimStr(b.email) : cur.email;
    const address = b.address !== undefined ? trimStr(b.address) : cur.address;
    const categories = b.categories !== undefined ? trimStr(b.categories) : cur.categories;
    const note = b.note !== undefined ? trimStr(b.note) : cur.note;
    await promisePool.query(
      `UPDATE school_store_suppliers SET name=?, contact_person=?, phone=?, email=?, address=?, categories=?, note=?
       WHERE id = ? AND school_id = ?`,
      [
        name,
        contact_person || null,
        phone || null,
        email || null,
        address || null,
        categories || null,
        note || null,
        id,
        schoolId,
      ]
    );
    return res.json({ success: true });
  } catch (err) {
    console.error('PATCH /store/suppliers/:id:', err);
    return res.status(500).json({ success: false, message: 'Failed to update supplier' });
  }
});

router.delete('/store/suppliers/:id', requireRole(STORE_ACCESS), async (req, res) => {
  try {
    const schoolId = resolveSchoolId(req);
    if (!schoolId) return res.status(400).json({ success: false, message: 'School not found in session.' });
    await ensureSuppliersTable();
    const id = Number(req.params.id);
    await promisePool.query('DELETE FROM school_store_suppliers WHERE id = ? AND school_id = ?', [id, schoolId]);
    return res.json({ success: true });
  } catch (err) {
    console.error('DELETE /store/suppliers/:id:', err);
    return res.status(500).json({ success: false, message: 'Failed to delete supplier' });
  }
});

module.exports = router;
