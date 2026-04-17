const express = require('express');
const { promisePool } = require('../config/database');
const { requireRole } = require('../middleware/deoAuth');
const { computeProAccessEffective } = require('../utils/schoolSubscription');

const router = express.Router();

const LIBRARY_ROLES = ['LIBRARIAN', 'SCHOOL_ADMIN', 'SCHOOL_MANAGER'];
const STOCK_ROLES = ['STORE_MANAGER', 'SCHOOL_ADMIN', 'SCHOOL_MANAGER'];
const GATE_ROLES = ['GATE_OFFICER', 'SCHOOL_ADMIN', 'SCHOOL_MANAGER'];

let tablesReady = false;

function resolveSchoolId(req) {
  return (
    req.user?.school_id ||
    req.session?.school_id ||
    req.session?.user?.school_id ||
    req.session?.user?.school?.id ||
    null
  );
}

function resolveUserId(req) {
  return req.user?.id || req.session?.userId || req.session?.user?.id || null;
}

function cleanStr(value, max = 255) {
  return String(value == null ? '' : value).trim().slice(0, max);
}

function cleanOptional(value, max = 255) {
  const v = cleanStr(value, max);
  return v || null;
}

function cleanNumber(value, fallback = 0) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return n;
}

async function ensureSchoolRoleOpsTables() {
  if (tablesReady) return;

  await promisePool.query(`
    CREATE TABLE IF NOT EXISTS school_library_books (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      school_id INT UNSIGNED NOT NULL,
      title VARCHAR(220) NOT NULL,
      author VARCHAR(180) NULL,
      isbn VARCHAR(80) NULL,
      category VARCHAR(120) NULL,
      quantity_total INT NOT NULL DEFAULT 1,
      quantity_available INT NOT NULL DEFAULT 1,
      shelf_location VARCHAR(120) NULL,
      status ENUM('ACTIVE','INACTIVE') NOT NULL DEFAULT 'ACTIVE',
      created_by_user_id INT UNSIGNED NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      KEY idx_library_school (school_id),
      KEY idx_library_status (status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  await promisePool.query(`
    CREATE TABLE IF NOT EXISTS school_library_checkouts (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      school_id INT UNSIGNED NOT NULL,
      book_id INT UNSIGNED NOT NULL,
      borrower_name VARCHAR(180) NOT NULL,
      borrower_type ENUM('STUDENT','STAFF','VISITOR') NOT NULL DEFAULT 'STUDENT',
      borrower_ref VARCHAR(120) NULL,
      issued_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      due_date DATE NULL,
      returned_at DATETIME NULL,
      status ENUM('ISSUED','RETURNED') NOT NULL DEFAULT 'ISSUED',
      notes TEXT NULL,
      created_by_user_id INT UNSIGNED NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      KEY idx_checkouts_school (school_id),
      KEY idx_checkouts_book (book_id),
      KEY idx_checkouts_status (status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  await promisePool.query(`
    CREATE TABLE IF NOT EXISTS school_stock_items (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      school_id INT UNSIGNED NOT NULL,
      item_name VARCHAR(200) NOT NULL,
      sku VARCHAR(80) NULL,
      category VARCHAR(120) NULL,
      unit VARCHAR(40) NOT NULL DEFAULT 'pcs',
      reorder_level DECIMAL(10,2) NOT NULL DEFAULT 0,
      opening_qty DECIMAL(10,2) NOT NULL DEFAULT 0,
      current_qty DECIMAL(10,2) NOT NULL DEFAULT 0,
      status ENUM('ACTIVE','INACTIVE') NOT NULL DEFAULT 'ACTIVE',
      created_by_user_id INT UNSIGNED NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      KEY idx_stock_items_school (school_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  await promisePool.query(`
    CREATE TABLE IF NOT EXISTS school_stock_movements (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      school_id INT UNSIGNED NOT NULL,
      item_id INT UNSIGNED NOT NULL,
      movement_type ENUM('IN','OUT','ADJUSTMENT') NOT NULL,
      quantity_change DECIMAL(10,2) NOT NULL,
      reason VARCHAR(220) NULL,
      movement_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      created_by_user_id INT UNSIGNED NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      KEY idx_stock_mv_school (school_id),
      KEY idx_stock_mv_item (item_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  await promisePool.query(`
    CREATE TABLE IF NOT EXISTS school_gate_logs (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      school_id INT UNSIGNED NOT NULL,
      person_name VARCHAR(180) NOT NULL,
      person_type ENUM('STUDENT','STAFF','VISITOR') NOT NULL DEFAULT 'STUDENT',
      person_ref VARCHAR(120) NULL,
      action_type ENUM('IN','OUT') NOT NULL,
      logged_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      notes TEXT NULL,
      created_by_user_id INT UNSIGNED NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      KEY idx_gate_school (school_id),
      KEY idx_gate_person (person_type),
      KEY idx_gate_time (logged_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  tablesReady = true;
}

async function ensureProSchoolAccess(req, res, next) {
  try {
    const schoolId = resolveSchoolId(req);
    if (!schoolId) {
      return res.status(400).json({ success: false, message: 'School context missing.' });
    }
    const [[schoolRow]] = await promisePool.query(
      `SELECT subscription_plan, pro_enabled, pro_end_date
       FROM schools WHERE id = ? AND deleted_at IS NULL LIMIT 1`,
      [schoolId]
    );
    if (!computeProAccessEffective(schoolRow || null)) {
      return res.status(403).json({
        success: false,
        code: 'PRO_REQUIRED',
        message: 'This feature is available for Pro schools only.',
      });
    }
    return next();
  } catch (err) {
    console.error('[schoolRoleOperations] pro check failed:', err);
    return res.status(500).json({ success: false, message: 'Failed to verify school subscription.' });
  }
}

async function recalculateStockCurrentQty(schoolId, itemId) {
  const [[item]] = await promisePool.query(
    `SELECT opening_qty FROM school_stock_items WHERE id = ? AND school_id = ? LIMIT 1`,
    [itemId, schoolId]
  );
  if (!item) return;
  const [[agg]] = await promisePool.query(
    `SELECT COALESCE(SUM(quantity_change), 0) AS delta
     FROM school_stock_movements WHERE school_id = ? AND item_id = ?`,
    [schoolId, itemId]
  );
  const nextQty = cleanNumber(item.opening_qty, 0) + cleanNumber(agg?.delta, 0);
  await promisePool.query(
    `UPDATE school_stock_items SET current_qty = ? WHERE id = ? AND school_id = ?`,
    [nextQty, itemId, schoolId]
  );
}

/**
 * This router is mounted at `/api` alongside many other modules.
 * Only `/library/*`, `/stock/*`, and `/gate/*` belong here — otherwise we must
 * immediately `next('router')` so requests like `GET /api/schools` reach
 * `school-add.js` instead of failing with "School context missing."
 */
function isRoleOpsPath(req) {
  const orig = String(req.originalUrl || '').split('?')[0];
  if (/^\/api\/(library|stock|gate)(\/|$)/i.test(orig)) return true;
  const p = String(req.path || req.url || '').split('?')[0];
  return /^\/(library|stock|gate)(\/|$)/i.test(p);
}

router.use((req, res, next) => {
  if (!isRoleOpsPath(req)) return next('router');
  next();
});

router.use(async (_req, res, next) => {
  try {
    await ensureSchoolRoleOpsTables();
    next();
  } catch (err) {
    console.error('[schoolRoleOperations] table init failed:', err);
    res.status(500).json({ success: false, message: 'Failed to initialize role operation tables.' });
  }
});

router.use(ensureProSchoolAccess);

router.get('/library/books', requireRole(LIBRARY_ROLES), async (req, res) => {
  try {
    const schoolId = resolveSchoolId(req);
    if (!schoolId) return res.status(400).json({ success: false, message: 'School context missing.' });
    const [rows] = await promisePool.query(
      `SELECT * FROM school_library_books WHERE school_id = ? ORDER BY id DESC`,
      [schoolId]
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('GET /library/books', err);
    res.status(500).json({ success: false, message: 'Failed to load books.' });
  }
});

router.post('/library/books', requireRole(LIBRARY_ROLES), async (req, res) => {
  try {
    const schoolId = resolveSchoolId(req);
    const userId = resolveUserId(req);
    if (!schoolId) return res.status(400).json({ success: false, message: 'School context missing.' });
    const title = cleanStr(req.body?.title, 220);
    if (!title) return res.status(400).json({ success: false, message: 'Book title is required.' });
    const quantityTotal = Math.max(0, Math.floor(cleanNumber(req.body?.quantity_total, 1)));
    const quantityAvailable = Math.max(
      0,
      Math.min(quantityTotal, Math.floor(cleanNumber(req.body?.quantity_available, quantityTotal)))
    );
    const [result] = await promisePool.query(
      `INSERT INTO school_library_books
       (school_id, title, author, isbn, category, quantity_total, quantity_available, shelf_location, status, created_by_user_id)
       VALUES (?,?,?,?,?,?,?,?,?,?)`,
      [
        schoolId,
        title,
        cleanOptional(req.body?.author, 180),
        cleanOptional(req.body?.isbn, 80),
        cleanOptional(req.body?.category, 120),
        quantityTotal || 1,
        quantityAvailable || quantityTotal || 1,
        cleanOptional(req.body?.shelf_location, 120),
        cleanStr(req.body?.status || 'ACTIVE', 10).toUpperCase() === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE',
        userId,
      ]
    );
    res.status(201).json({ success: true, data: { id: result.insertId } });
  } catch (err) {
    console.error('POST /library/books', err);
    res.status(500).json({ success: false, message: 'Failed to create book.' });
  }
});

router.put('/library/books/:id', requireRole(LIBRARY_ROLES), async (req, res) => {
  try {
    const schoolId = resolveSchoolId(req);
    const id = Number(req.params.id);
    if (!schoolId || !id) return res.status(400).json({ success: false, message: 'Invalid request.' });
    const title = cleanStr(req.body?.title, 220);
    if (!title) return res.status(400).json({ success: false, message: 'Book title is required.' });
    const quantityTotal = Math.max(0, Math.floor(cleanNumber(req.body?.quantity_total, 1)));
    const quantityAvailable = Math.max(
      0,
      Math.min(quantityTotal, Math.floor(cleanNumber(req.body?.quantity_available, quantityTotal)))
    );
    await promisePool.query(
      `UPDATE school_library_books
       SET title = ?, author = ?, isbn = ?, category = ?, quantity_total = ?, quantity_available = ?, shelf_location = ?, status = ?
       WHERE id = ? AND school_id = ?`,
      [
        title,
        cleanOptional(req.body?.author, 180),
        cleanOptional(req.body?.isbn, 80),
        cleanOptional(req.body?.category, 120),
        quantityTotal || 1,
        quantityAvailable || quantityTotal || 1,
        cleanOptional(req.body?.shelf_location, 120),
        cleanStr(req.body?.status || 'ACTIVE', 10).toUpperCase() === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE',
        id,
        schoolId,
      ]
    );
    res.json({ success: true, message: 'Book updated.' });
  } catch (err) {
    console.error('PUT /library/books/:id', err);
    res.status(500).json({ success: false, message: 'Failed to update book.' });
  }
});

router.delete('/library/books/:id', requireRole(LIBRARY_ROLES), async (req, res) => {
  try {
    const schoolId = resolveSchoolId(req);
    const id = Number(req.params.id);
    if (!schoolId || !id) return res.status(400).json({ success: false, message: 'Invalid request.' });
    await promisePool.query(`DELETE FROM school_library_books WHERE id = ? AND school_id = ?`, [id, schoolId]);
    await promisePool.query(`DELETE FROM school_library_checkouts WHERE school_id = ? AND book_id = ?`, [schoolId, id]);
    res.json({ success: true, message: 'Book deleted.' });
  } catch (err) {
    console.error('DELETE /library/books/:id', err);
    res.status(500).json({ success: false, message: 'Failed to delete book.' });
  }
});

router.get('/library/checkouts', requireRole(LIBRARY_ROLES), async (req, res) => {
  try {
    const schoolId = resolveSchoolId(req);
    if (!schoolId) return res.status(400).json({ success: false, message: 'School context missing.' });
    const [rows] = await promisePool.query(
      `SELECT c.*, b.title AS book_title
       FROM school_library_checkouts c
       LEFT JOIN school_library_books b ON b.id = c.book_id
       WHERE c.school_id = ?
       ORDER BY c.id DESC`,
      [schoolId]
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('GET /library/checkouts', err);
    res.status(500).json({ success: false, message: 'Failed to load checkouts.' });
  }
});

router.post('/library/checkouts', requireRole(LIBRARY_ROLES), async (req, res) => {
  const conn = await promisePool.getConnection();
  try {
    const schoolId = resolveSchoolId(req);
    const userId = resolveUserId(req);
    if (!schoolId) return res.status(400).json({ success: false, message: 'School context missing.' });
    const bookId = Number(req.body?.book_id);
    const borrowerName = cleanStr(req.body?.borrower_name, 180);
    if (!bookId || !borrowerName) {
      return res.status(400).json({ success: false, message: 'Book and borrower name are required.' });
    }
    await conn.beginTransaction();
    const [[book]] = await conn.query(
      `SELECT id, quantity_available FROM school_library_books WHERE id = ? AND school_id = ? LIMIT 1`,
      [bookId, schoolId]
    );
    if (!book) {
      await conn.rollback();
      return res.status(404).json({ success: false, message: 'Book not found.' });
    }
    if (Number(book.quantity_available) <= 0) {
      await conn.rollback();
      return res.status(400).json({ success: false, message: 'No available copies for checkout.' });
    }
    await conn.query(
      `INSERT INTO school_library_checkouts
       (school_id, book_id, borrower_name, borrower_type, borrower_ref, due_date, notes, created_by_user_id)
       VALUES (?,?,?,?,?,?,?,?)`,
      [
        schoolId,
        bookId,
        borrowerName,
        cleanStr(req.body?.borrower_type || 'STUDENT', 10).toUpperCase() === 'STAFF' ? 'STAFF' : (cleanStr(req.body?.borrower_type || 'STUDENT', 10).toUpperCase() === 'VISITOR' ? 'VISITOR' : 'STUDENT'),
        cleanOptional(req.body?.borrower_ref, 120),
        cleanOptional(req.body?.due_date, 30),
        cleanOptional(req.body?.notes, 5000),
        userId,
      ]
    );
    await conn.query(
      `UPDATE school_library_books SET quantity_available = GREATEST(quantity_available - 1, 0) WHERE id = ? AND school_id = ?`,
      [bookId, schoolId]
    );
    await conn.commit();
    res.status(201).json({ success: true, message: 'Checkout recorded.' });
  } catch (err) {
    await conn.rollback().catch(() => {});
    console.error('POST /library/checkouts', err);
    res.status(500).json({ success: false, message: 'Failed to create checkout.' });
  } finally {
    conn.release();
  }
});

router.put('/library/checkouts/:id', requireRole(LIBRARY_ROLES), async (req, res) => {
  try {
    const schoolId = resolveSchoolId(req);
    const id = Number(req.params.id);
    if (!schoolId || !id) return res.status(400).json({ success: false, message: 'Invalid request.' });
    const borrowerName = cleanStr(req.body?.borrower_name, 180);
    if (!borrowerName) return res.status(400).json({ success: false, message: 'Borrower name is required.' });
    await promisePool.query(
      `UPDATE school_library_checkouts
       SET borrower_name = ?, borrower_type = ?, borrower_ref = ?, due_date = ?, notes = ?
       WHERE id = ? AND school_id = ?`,
      [
        borrowerName,
        cleanStr(req.body?.borrower_type || 'STUDENT', 10).toUpperCase() === 'STAFF' ? 'STAFF' : (cleanStr(req.body?.borrower_type || 'STUDENT', 10).toUpperCase() === 'VISITOR' ? 'VISITOR' : 'STUDENT'),
        cleanOptional(req.body?.borrower_ref, 120),
        cleanOptional(req.body?.due_date, 30),
        cleanOptional(req.body?.notes, 5000),
        id,
        schoolId,
      ]
    );
    res.json({ success: true, message: 'Checkout updated.' });
  } catch (err) {
    console.error('PUT /library/checkouts/:id', err);
    res.status(500).json({ success: false, message: 'Failed to update checkout.' });
  }
});

router.patch('/library/checkouts/:id/return', requireRole(LIBRARY_ROLES), async (req, res) => {
  const conn = await promisePool.getConnection();
  try {
    const schoolId = resolveSchoolId(req);
    const id = Number(req.params.id);
    if (!schoolId || !id) return res.status(400).json({ success: false, message: 'Invalid request.' });
    await conn.beginTransaction();
    const [[checkout]] = await conn.query(
      `SELECT id, book_id, status FROM school_library_checkouts WHERE id = ? AND school_id = ? LIMIT 1`,
      [id, schoolId]
    );
    if (!checkout) {
      await conn.rollback();
      return res.status(404).json({ success: false, message: 'Checkout not found.' });
    }
    if (checkout.status === 'RETURNED') {
      await conn.rollback();
      return res.json({ success: true, message: 'Checkout already returned.' });
    }
    await conn.query(
      `UPDATE school_library_checkouts SET status = 'RETURNED', returned_at = NOW() WHERE id = ? AND school_id = ?`,
      [id, schoolId]
    );
    await conn.query(
      `UPDATE school_library_books
       SET quantity_available = LEAST(quantity_available + 1, quantity_total)
       WHERE id = ? AND school_id = ?`,
      [checkout.book_id, schoolId]
    );
    await conn.commit();
    res.json({ success: true, message: 'Book returned successfully.' });
  } catch (err) {
    await conn.rollback().catch(() => {});
    console.error('PATCH /library/checkouts/:id/return', err);
    res.status(500).json({ success: false, message: 'Failed to return book.' });
  } finally {
    conn.release();
  }
});

router.delete('/library/checkouts/:id', requireRole(LIBRARY_ROLES), async (req, res) => {
  const conn = await promisePool.getConnection();
  try {
    const schoolId = resolveSchoolId(req);
    const id = Number(req.params.id);
    if (!schoolId || !id) return res.status(400).json({ success: false, message: 'Invalid request.' });
    await conn.beginTransaction();
    const [[checkout]] = await conn.query(
      `SELECT id, book_id, status FROM school_library_checkouts WHERE id = ? AND school_id = ? LIMIT 1`,
      [id, schoolId]
    );
    if (!checkout) {
      await conn.rollback();
      return res.status(404).json({ success: false, message: 'Checkout not found.' });
    }
    await conn.query(`DELETE FROM school_library_checkouts WHERE id = ? AND school_id = ?`, [id, schoolId]);
    if (checkout.status === 'ISSUED') {
      await conn.query(
        `UPDATE school_library_books
         SET quantity_available = LEAST(quantity_available + 1, quantity_total)
         WHERE id = ? AND school_id = ?`,
        [checkout.book_id, schoolId]
      );
    }
    await conn.commit();
    res.json({ success: true, message: 'Checkout removed.' });
  } catch (err) {
    await conn.rollback().catch(() => {});
    console.error('DELETE /library/checkouts/:id', err);
    res.status(500).json({ success: false, message: 'Failed to delete checkout.' });
  } finally {
    conn.release();
  }
});

router.get('/stock/items', requireRole(STOCK_ROLES), async (req, res) => {
  try {
    const schoolId = resolveSchoolId(req);
    if (!schoolId) return res.status(400).json({ success: false, message: 'School context missing.' });
    const [rows] = await promisePool.query(
      `SELECT * FROM school_stock_items WHERE school_id = ? ORDER BY id DESC`,
      [schoolId]
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('GET /stock/items', err);
    res.status(500).json({ success: false, message: 'Failed to load stock items.' });
  }
});

router.post('/stock/items', requireRole(STOCK_ROLES), async (req, res) => {
  try {
    const schoolId = resolveSchoolId(req);
    const userId = resolveUserId(req);
    if (!schoolId) return res.status(400).json({ success: false, message: 'School context missing.' });
    const itemName = cleanStr(req.body?.item_name, 200);
    if (!itemName) return res.status(400).json({ success: false, message: 'Item name is required.' });
    const openingQty = cleanNumber(req.body?.opening_qty, 0);
    const [result] = await promisePool.query(
      `INSERT INTO school_stock_items
       (school_id, item_name, sku, category, unit, reorder_level, opening_qty, current_qty, status, created_by_user_id)
       VALUES (?,?,?,?,?,?,?,?,?,?)`,
      [
        schoolId,
        itemName,
        cleanOptional(req.body?.sku, 80),
        cleanOptional(req.body?.category, 120),
        cleanStr(req.body?.unit || 'pcs', 40),
        Math.max(0, cleanNumber(req.body?.reorder_level, 0)),
        openingQty,
        openingQty,
        cleanStr(req.body?.status || 'ACTIVE', 10).toUpperCase() === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE',
        userId,
      ]
    );
    res.status(201).json({ success: true, data: { id: result.insertId } });
  } catch (err) {
    console.error('POST /stock/items', err);
    res.status(500).json({ success: false, message: 'Failed to create stock item.' });
  }
});

router.put('/stock/items/:id', requireRole(STOCK_ROLES), async (req, res) => {
  try {
    const schoolId = resolveSchoolId(req);
    const id = Number(req.params.id);
    if (!schoolId || !id) return res.status(400).json({ success: false, message: 'Invalid request.' });
    const itemName = cleanStr(req.body?.item_name, 200);
    if (!itemName) return res.status(400).json({ success: false, message: 'Item name is required.' });
    await promisePool.query(
      `UPDATE school_stock_items
       SET item_name = ?, sku = ?, category = ?, unit = ?, reorder_level = ?, opening_qty = ?, status = ?
       WHERE id = ? AND school_id = ?`,
      [
        itemName,
        cleanOptional(req.body?.sku, 80),
        cleanOptional(req.body?.category, 120),
        cleanStr(req.body?.unit || 'pcs', 40),
        Math.max(0, cleanNumber(req.body?.reorder_level, 0)),
        cleanNumber(req.body?.opening_qty, 0),
        cleanStr(req.body?.status || 'ACTIVE', 10).toUpperCase() === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE',
        id,
        schoolId,
      ]
    );
    await recalculateStockCurrentQty(schoolId, id);
    res.json({ success: true, message: 'Stock item updated.' });
  } catch (err) {
    console.error('PUT /stock/items/:id', err);
    res.status(500).json({ success: false, message: 'Failed to update stock item.' });
  }
});

router.delete('/stock/items/:id', requireRole(STOCK_ROLES), async (req, res) => {
  try {
    const schoolId = resolveSchoolId(req);
    const id = Number(req.params.id);
    if (!schoolId || !id) return res.status(400).json({ success: false, message: 'Invalid request.' });
    await promisePool.query(`DELETE FROM school_stock_movements WHERE school_id = ? AND item_id = ?`, [schoolId, id]);
    await promisePool.query(`DELETE FROM school_stock_items WHERE id = ? AND school_id = ?`, [id, schoolId]);
    res.json({ success: true, message: 'Stock item deleted.' });
  } catch (err) {
    console.error('DELETE /stock/items/:id', err);
    res.status(500).json({ success: false, message: 'Failed to delete stock item.' });
  }
});

router.get('/stock/movements', requireRole(STOCK_ROLES), async (req, res) => {
  try {
    const schoolId = resolveSchoolId(req);
    if (!schoolId) return res.status(400).json({ success: false, message: 'School context missing.' });
    const [rows] = await promisePool.query(
      `SELECT m.*, i.item_name
       FROM school_stock_movements m
       LEFT JOIN school_stock_items i ON i.id = m.item_id
       WHERE m.school_id = ?
       ORDER BY m.id DESC`,
      [schoolId]
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('GET /stock/movements', err);
    res.status(500).json({ success: false, message: 'Failed to load stock movements.' });
  }
});

router.post('/stock/movements', requireRole(STOCK_ROLES), async (req, res) => {
  try {
    const schoolId = resolveSchoolId(req);
    const userId = resolveUserId(req);
    if (!schoolId) return res.status(400).json({ success: false, message: 'School context missing.' });
    const itemId = Number(req.body?.item_id);
    if (!itemId) return res.status(400).json({ success: false, message: 'Item is required.' });
    const movementTypeRaw = cleanStr(req.body?.movement_type, 20).toUpperCase();
    const movementType = ['IN', 'OUT', 'ADJUSTMENT'].includes(movementTypeRaw) ? movementTypeRaw : 'IN';
    const quantity = Math.abs(cleanNumber(req.body?.quantity, 0));
    if (!quantity) return res.status(400).json({ success: false, message: 'Quantity must be greater than zero.' });
    const quantityChange = movementType === 'OUT' ? -quantity : quantity;
    await promisePool.query(
      `INSERT INTO school_stock_movements
       (school_id, item_id, movement_type, quantity_change, reason, movement_date, created_by_user_id)
       VALUES (?,?,?,?,?,?,?)`,
      [
        schoolId,
        itemId,
        movementType,
        quantityChange,
        cleanOptional(req.body?.reason, 220),
        cleanOptional(req.body?.movement_date, 40) || new Date(),
        userId,
      ]
    );
    await recalculateStockCurrentQty(schoolId, itemId);
    res.status(201).json({ success: true, message: 'Stock movement recorded.' });
  } catch (err) {
    console.error('POST /stock/movements', err);
    res.status(500).json({ success: false, message: 'Failed to create stock movement.' });
  }
});

router.put('/stock/movements/:id', requireRole(STOCK_ROLES), async (req, res) => {
  try {
    const schoolId = resolveSchoolId(req);
    const id = Number(req.params.id);
    if (!schoolId || !id) return res.status(400).json({ success: false, message: 'Invalid request.' });
    const [[prev]] = await promisePool.query(
      `SELECT id, item_id FROM school_stock_movements WHERE id = ? AND school_id = ? LIMIT 1`,
      [id, schoolId]
    );
    if (!prev) return res.status(404).json({ success: false, message: 'Movement not found.' });
    const itemId = Number(req.body?.item_id);
    if (!itemId) return res.status(400).json({ success: false, message: 'Item is required.' });
    const movementTypeRaw = cleanStr(req.body?.movement_type, 20).toUpperCase();
    const movementType = ['IN', 'OUT', 'ADJUSTMENT'].includes(movementTypeRaw) ? movementTypeRaw : 'IN';
    const quantity = Math.abs(cleanNumber(req.body?.quantity, 0));
    if (!quantity) return res.status(400).json({ success: false, message: 'Quantity must be greater than zero.' });
    const quantityChange = movementType === 'OUT' ? -quantity : quantity;
    await promisePool.query(
      `UPDATE school_stock_movements
       SET item_id = ?, movement_type = ?, quantity_change = ?, reason = ?, movement_date = ?
       WHERE id = ? AND school_id = ?`,
      [
        itemId,
        movementType,
        quantityChange,
        cleanOptional(req.body?.reason, 220),
        cleanOptional(req.body?.movement_date, 40) || new Date(),
        id,
        schoolId,
      ]
    );
    await recalculateStockCurrentQty(schoolId, prev.item_id);
    if (Number(prev.item_id) !== itemId) await recalculateStockCurrentQty(schoolId, itemId);
    res.json({ success: true, message: 'Stock movement updated.' });
  } catch (err) {
    console.error('PUT /stock/movements/:id', err);
    res.status(500).json({ success: false, message: 'Failed to update stock movement.' });
  }
});

router.delete('/stock/movements/:id', requireRole(STOCK_ROLES), async (req, res) => {
  try {
    const schoolId = resolveSchoolId(req);
    const id = Number(req.params.id);
    if (!schoolId || !id) return res.status(400).json({ success: false, message: 'Invalid request.' });
    const [[prev]] = await promisePool.query(
      `SELECT item_id FROM school_stock_movements WHERE id = ? AND school_id = ? LIMIT 1`,
      [id, schoolId]
    );
    if (!prev) return res.status(404).json({ success: false, message: 'Movement not found.' });
    await promisePool.query(`DELETE FROM school_stock_movements WHERE id = ? AND school_id = ?`, [id, schoolId]);
    await recalculateStockCurrentQty(schoolId, prev.item_id);
    res.json({ success: true, message: 'Stock movement deleted.' });
  } catch (err) {
    console.error('DELETE /stock/movements/:id', err);
    res.status(500).json({ success: false, message: 'Failed to delete stock movement.' });
  }
});

router.get('/gate/logs', requireRole(GATE_ROLES), async (req, res) => {
  try {
    const schoolId = resolveSchoolId(req);
    if (!schoolId) return res.status(400).json({ success: false, message: 'School context missing.' });
    const [rows] = await promisePool.query(
      `SELECT * FROM school_gate_logs WHERE school_id = ? ORDER BY logged_at DESC, id DESC`,
      [schoolId]
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('GET /gate/logs', err);
    res.status(500).json({ success: false, message: 'Failed to load gate logs.' });
  }
});

router.post('/gate/logs', requireRole(GATE_ROLES), async (req, res) => {
  try {
    const schoolId = resolveSchoolId(req);
    const userId = resolveUserId(req);
    if (!schoolId) return res.status(400).json({ success: false, message: 'School context missing.' });
    const personName = cleanStr(req.body?.person_name, 180);
    if (!personName) return res.status(400).json({ success: false, message: 'Person name is required.' });
    const personTypeRaw = cleanStr(req.body?.person_type, 15).toUpperCase();
    const personType = ['STUDENT', 'STAFF', 'VISITOR'].includes(personTypeRaw) ? personTypeRaw : 'STUDENT';
    const actionRaw = cleanStr(req.body?.action_type, 8).toUpperCase();
    const actionType = actionRaw === 'OUT' ? 'OUT' : 'IN';
    await promisePool.query(
      `INSERT INTO school_gate_logs
       (school_id, person_name, person_type, person_ref, action_type, logged_at, notes, created_by_user_id)
       VALUES (?,?,?,?,?,?,?,?)`,
      [
        schoolId,
        personName,
        personType,
        cleanOptional(req.body?.person_ref, 120),
        actionType,
        cleanOptional(req.body?.logged_at, 40) || new Date(),
        cleanOptional(req.body?.notes, 5000),
        userId,
      ]
    );
    res.status(201).json({ success: true, message: 'Gate log created.' });
  } catch (err) {
    console.error('POST /gate/logs', err);
    res.status(500).json({ success: false, message: 'Failed to create gate log.' });
  }
});

router.put('/gate/logs/:id', requireRole(GATE_ROLES), async (req, res) => {
  try {
    const schoolId = resolveSchoolId(req);
    const id = Number(req.params.id);
    if (!schoolId || !id) return res.status(400).json({ success: false, message: 'Invalid request.' });
    const personName = cleanStr(req.body?.person_name, 180);
    if (!personName) return res.status(400).json({ success: false, message: 'Person name is required.' });
    const personTypeRaw = cleanStr(req.body?.person_type, 15).toUpperCase();
    const personType = ['STUDENT', 'STAFF', 'VISITOR'].includes(personTypeRaw) ? personTypeRaw : 'STUDENT';
    const actionRaw = cleanStr(req.body?.action_type, 8).toUpperCase();
    const actionType = actionRaw === 'OUT' ? 'OUT' : 'IN';
    await promisePool.query(
      `UPDATE school_gate_logs
       SET person_name = ?, person_type = ?, person_ref = ?, action_type = ?, logged_at = ?, notes = ?
       WHERE id = ? AND school_id = ?`,
      [
        personName,
        personType,
        cleanOptional(req.body?.person_ref, 120),
        actionType,
        cleanOptional(req.body?.logged_at, 40) || new Date(),
        cleanOptional(req.body?.notes, 5000),
        id,
        schoolId,
      ]
    );
    res.json({ success: true, message: 'Gate log updated.' });
  } catch (err) {
    console.error('PUT /gate/logs/:id', err);
    res.status(500).json({ success: false, message: 'Failed to update gate log.' });
  }
});

router.delete('/gate/logs/:id', requireRole(GATE_ROLES), async (req, res) => {
  try {
    const schoolId = resolveSchoolId(req);
    const id = Number(req.params.id);
    if (!schoolId || !id) return res.status(400).json({ success: false, message: 'Invalid request.' });
    await promisePool.query(`DELETE FROM school_gate_logs WHERE id = ? AND school_id = ?`, [id, schoolId]);
    res.json({ success: true, message: 'Gate log deleted.' });
  } catch (err) {
    console.error('DELETE /gate/logs/:id', err);
    res.status(500).json({ success: false, message: 'Failed to delete gate log.' });
  }
});

module.exports = router;
