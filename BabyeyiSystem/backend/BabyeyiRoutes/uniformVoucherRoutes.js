'use strict';

/**
 * Uniform Voucher — catalog, public booking, MoMo payment, Super Admin + Agent APIs.
 */

const express = require('express');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { promisePool } = require('../config/database');

let mtnMomo = null;
try {
  mtnMomo = require('./mtnMomoCollection');
} catch (_) {
  mtnMomo = null;
}

const router = express.Router();

const UPLOAD_REL = 'uploads/uniform-vouchers';
const UPLOAD_ABS = path.join(__dirname, '..', UPLOAD_REL);

function requireSuper(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Not authenticated' });
  }
  const code = (req.user.role_code || '').toUpperCase();
  if (!['SUPER_ADMIN', 'FULL_SYSTEM_CONTROLLER'].includes(code)) {
    return res.status(403).json({ success: false, message: 'Access denied' });
  }
  next();
}

function requireAgent(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Not authenticated' });
  }
  if ((req.user.role_code || '').toUpperCase() !== 'AGENT') {
    return res.status(403).json({ success: false, message: 'Access denied' });
  }
  next();
}

function normalizeRwPhone(raw) {
  let v = String(raw || '').trim().replace(/[\s\-()]/g, '');
  if (v.startsWith('+250')) v = `0${v.slice(4)}`;
  else if (v.startsWith('250') && v.length === 12) v = `0${v.slice(3)}`;
  if (/^[27]\d{8}$/.test(v)) v = `0${v}`;
  if (/^07[2389]\d{7}$/.test(v)) return v;
  return null;
}

function toMsisdn250(raw) {
  const local = normalizeRwPhone(raw);
  if (!local) return null;
  return `250${local.slice(1)}`;
}

let tablesReady = false;
let ensureLock = null;

async function findStudentByCode(raw) {
  const code = String(raw || '').trim();
  if (!code || code.length < 2) return null;
  const upper = code.toUpperCase();
  const [rows] = await promisePool.query(
    `SELECT s.id, s.school_id, s.student_uid, s.student_code, s.sdm_code,
            s.first_name, s.last_name, s.class_name, s.academic_year, s.gender,
            s.province, s.district, s.sector, s.cell, s.village,
            s.father_full_name, s.father_phone, s.mother_full_name, s.mother_phone,
            sc.school_name, sc.school_code, sc.district AS school_district, sc.sector AS school_sector,
            sc.province AS school_province
     FROM students s
     LEFT JOIN schools sc ON sc.id = s.school_id
     WHERE TRIM(UPPER(s.student_uid)) = ?
        OR TRIM(s.student_uid) = ?
        OR (s.student_code IS NOT NULL AND TRIM(s.student_code) = ?)
        OR (s.sdm_code IS NOT NULL AND TRIM(UPPER(s.sdm_code)) = ?)
     ORDER BY s.id ASC
     LIMIT 1`,
    [upper, code, code, upper]
  );
  return rows[0] || null;
}

async function getAgentProfile(userId) {
  const [rows] = await promisePool.query(
    'SELECT user_id, district, all_sectors, sectors_json FROM field_agent_profiles WHERE user_id = ? LIMIT 1',
    [userId]
  );
  return rows[0] || null;
}

function parseSectorsJson(profile) {
  if (!profile?.sectors_json) return [];
  try {
    const j =
      typeof profile.sectors_json === 'string' ? JSON.parse(profile.sectors_json) : profile.sectors_json;
    return Array.isArray(j) ? j : [];
  } catch {
    return [];
  }
}

async function pickAgentUserIdForSchool(district, sector) {
  const d = String(district || '').trim();
  const sec = String(sector || '').trim();
  if (!d) return null;
  const [rows] = await promisePool.query(
    'SELECT user_id, all_sectors, sectors_json FROM field_agent_profiles WHERE district = ?',
    [d]
  );
  for (const r of rows || []) {
    if (Number(r.all_sectors) === 1) return r.user_id;
    const list = parseSectorsJson(r);
    if (sec && list.some((x) => String(x).trim() === sec)) return r.user_id;
  }
  return null;
}

function genOrderNo() {
  return `UVO-${new Date().getFullYear()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
}

function genVoucherNo() {
  return `UNI-${new Date().getFullYear()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
}

async function seedDefaultItemsIfEmpty() {
  const [[c]] = await promisePool.query('SELECT COUNT(*) AS n FROM uniform_voucher_items');
  if (Number(c?.n) > 0) return;
  const school = [
    ['school', 'Shirt', 'Classic school shirt', '["XS","S","M","L","XL","38","40","42"]', '["Navy","White"]', 12000, 1],
    ['school', 'Trousers', 'Tailored school trousers', '["22","24","26","28","30","32","34","36","38","40"]', '["Navy","Black"]', 15000, 2],
    ['school', 'Skirt', 'Pleated school skirt', '["22","24","26","28","30","32"]', '["Navy"]', 14000, 3],
    ['school', 'Sweater', 'V-neck pullover', '["XS","S","M","L","XL"]', '["Navy","Grey"]', 18000, 4],
    ['school', 'Blazer', 'Formal blazer', '["XS","S","M","L","XL"]', '["Navy"]', 35000, 5],
    ['school', 'Tie', 'School tie', '["One size"]', '["Striped navy"]', 5000, 6],
    ['school', 'Socks', 'Knee-high socks', '["S","M","L"]', '["Navy","White"]', 3000, 7],
    ['school', 'Belt', 'Leather belt', '["S","M","L","XL"]', '["Black","Brown"]', 4000, 8],
  ];
  const sports = [
    ['sports', 'Sports T-shirt', 'Breathable PE shirt', '["XS","S","M","L","XL"]', '["House colours"]', 8000, 1],
    ['sports', 'Sports trousers', 'Track pants', '["XS","S","M","L","XL"]', '["Navy","Black"]', 12000, 2],
    ['sports', 'Shorts', 'PE shorts', '["XS","S","M","L","XL"]', '["Navy"]', 7000, 3],
    ['sports', 'Tracksuit', 'Warm-up tracksuit', '["XS","S","M","L","XL"]', '["Navy"]', 28000, 4],
    ['sports', 'Sports shoes', 'Indoor / outdoor trainers', '["30","32","34","36","38","40","42","44"]', '["Black","White"]', 25000, 5],
  ];
  const ins = [];
  for (const row of [...school, ...sports]) {
    ins.push(row);
  }
  for (const [ut, name, desc, sizes, colors, price, so] of ins) {
    await promisePool.query(
      `INSERT INTO uniform_voucher_items
       (uniform_type, name, description, sizes_json, colors_json, price_rwf, stock_qty, gender_scope, is_active, sort_order)
       VALUES (?,?,?,?,?,?, NULL, 'any', 1, ?)`,
      [ut, name, desc, sizes, colors, price, so]
    );
  }
}

async function ensureTables() {
  if (tablesReady) return;
  if (!ensureLock) {
    ensureLock = (async () => {
      await promisePool.query(`
        CREATE TABLE IF NOT EXISTS uniform_voucher_items (
          id INT UNSIGNED NOT NULL AUTO_INCREMENT,
          uniform_type ENUM('school','sports') NOT NULL,
          name VARCHAR(200) NOT NULL,
          description TEXT NULL,
          image_url VARCHAR(512) NULL,
          sizes_json JSON NOT NULL,
          colors_json JSON NULL,
          price_rwf INT UNSIGNED NOT NULL DEFAULT 0,
          stock_qty INT NULL,
          gender_scope ENUM('any','male','female') NOT NULL DEFAULT 'any',
          is_active TINYINT(1) NOT NULL DEFAULT 1,
          sort_order INT NOT NULL DEFAULT 0,
          created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          PRIMARY KEY (id),
          KEY idx_uvi_type_active (uniform_type, is_active)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);

      await promisePool.query(`
        CREATE TABLE IF NOT EXISTS uniform_voucher_orders (
          id INT UNSIGNED NOT NULL AUTO_INCREMENT,
          order_number VARCHAR(40) NOT NULL,
          voucher_number VARCHAR(40) NOT NULL,
          student_id INT UNSIGNED NOT NULL,
          school_id INT UNSIGNED NULL,
          uniform_type ENUM('school','sports') NOT NULL,
          order_district VARCHAR(120) NULL,
          order_sector VARCHAR(120) NULL,
          student_detail_json JSON NOT NULL,
          school_detail_json JSON NULL,
          lines_json JSON NOT NULL,
          delivery_method ENUM('school','home') NOT NULL,
          delivery_detail_json JSON NULL,
          subtotal_rwf INT UNSIGNED NOT NULL,
          delivery_fee_rwf INT UNSIGNED NOT NULL DEFAULT 0,
          total_rwf INT UNSIGNED NOT NULL,
          booking_status VARCHAR(32) NOT NULL DEFAULT 'Booked',
          payment_status VARCHAR(24) NOT NULL DEFAULT 'Unpaid',
          delivery_status VARCHAR(48) NOT NULL DEFAULT 'Waiting',
          payer_name VARCHAR(160) NULL,
          payer_phone VARCHAR(64) NULL,
          payment_method VARCHAR(32) NULL,
          payment_reference VARCHAR(160) NULL,
          payment_provider_json LONGTEXT NULL,
          assigned_agent_user_id INT UNSIGNED NULL,
          notes TEXT NULL,
          created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          PRIMARY KEY (id),
          UNIQUE KEY uq_uvo_order (order_number),
          UNIQUE KEY uq_uvo_voucher (voucher_number),
          KEY idx_uvo_student (student_id),
          KEY idx_uvo_school (school_id),
          KEY idx_uvo_loc (order_district, order_sector),
          KEY idx_uvo_pay (payment_status, booking_status),
          KEY idx_uvo_agent (assigned_agent_user_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);

      await seedDefaultItemsIfEmpty();
      tablesReady = true;
    })().catch((err) => {
      ensureLock = null;
      throw err;
    });
  }
  await ensureLock;
}

router.use(async (_req, res, next) => {
  try {
    await ensureTables();
    next();
  } catch (e) {
    console.error('[uniform-vouchers] ensureTables:', e);
    res.status(500).json({ success: false, message: 'Database setup failed' });
  }
});

if (!fs.existsSync(UPLOAD_ABS)) {
  fs.mkdirSync(UPLOAD_ABS, { recursive: true });
}

const uploadItemImage = multer({
  storage: multer.diskStorage({
    destination(_req, _file, cb) {
      cb(null, UPLOAD_ABS);
    },
    filename(_req, file, cb) {
      const ext = path.extname(file.originalname) || '.png';
      const base = path.basename(file.originalname, ext).replace(/\s+/g, '-').slice(0, 36);
      cb(null, `uv-${base}-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
    },
  }),
  limits: { fileSize: 4 * 1024 * 1024 },
  fileFilter(_req, file, cb) {
    const ok = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.mimetype);
    cb(ok ? null : new Error('Only image files'), ok);
  },
});

function parseJsonField(row, key) {
  const v = row[key];
  if (v == null) return null;
  if (typeof v === 'object') return v;
  try {
    return JSON.parse(String(v));
  } catch {
    return null;
  }
}

async function decrementStockForLines(conn, linesJson) {
  let lines = linesJson;
  if (linesJson == null) return;
  if (typeof linesJson === 'string') {
    try {
      lines = JSON.parse(linesJson);
    } catch {
      return;
    }
  }
  if (!Array.isArray(lines)) return;
  for (const ln of lines) {
    const iid = parseInt(ln.item_id, 10);
    const q = parseInt(ln.qty, 10) || 1;
    if (!iid) continue;
    await conn.query(
      'UPDATE uniform_voucher_items SET stock_qty = CASE WHEN stock_qty IS NULL THEN NULL ELSE GREATEST(0, stock_qty - ?) END WHERE id = ?',
      [q, iid]
    );
  }
}

function mapItemRow(r) {
  return {
    id: r.id,
    uniform_type: r.uniform_type,
    name: r.name,
    description: r.description || '',
    image_url: r.image_url || null,
    sizes: parseJsonField(r, 'sizes_json') || [],
    colors: parseJsonField(r, 'colors_json') || [],
    price_rwf: Number(r.price_rwf || 0),
    stock_qty: r.stock_qty == null ? null : Number(r.stock_qty),
    gender_scope: r.gender_scope || 'any',
    is_active: !!(r.is_active === 1 || r.is_active === true),
    sort_order: Number(r.sort_order || 0),
  };
}

/** ── Public: catalog ─────────────────────────────────────────── */
router.get('/public/items', async (req, res) => {
  try {
    const t = String(req.query.type || '').toLowerCase();
    const type = t === 'sports' ? 'sports' : t === 'school' ? 'school' : null;
    let sql = `SELECT * FROM uniform_voucher_items WHERE is_active = 1`;
    const params = [];
    if (type) {
      sql += ` AND uniform_type = ?`;
      params.push(type);
    }
    sql += ` ORDER BY uniform_type ASC, sort_order ASC, id ASC`;
    const [rows] = await promisePool.query(sql, params);
    res.json({ success: true, data: rows.map(mapItemRow) });
  } catch (e) {
    console.error('[uniform-vouchers/public/items]', e);
    res.status(500).json({ success: false, message: e.message || 'Failed' });
  }
});

/** ── Public: student lookup ──────────────────────────────────── */
router.post('/public/lookup-student', async (req, res) => {
  try {
    const code = String(req.body?.student_code ?? req.body?.code ?? '').trim();
    if (!code) {
      return res.status(400).json({ success: false, message: 'student_code is required' });
    }
    const row = await findStudentByCode(code);
    if (!row) {
      return res.json({ success: false, notFound: true, message: 'Student not found. Check the code.' });
    }
    const student = {
      id: row.id,
      student_code: row.student_code || row.student_uid,
      student_uid: row.student_uid,
      sdm_code: row.sdm_code,
      first_name: row.first_name,
      last_name: row.last_name,
      full_name: `${row.first_name || ''} ${row.last_name || ''}`.trim(),
      gender: row.gender || null,
      class_name: row.class_name || null,
      academic_year: row.academic_year || null,
      province: row.province || null,
      district: row.district || null,
      sector: row.sector || null,
      cell: row.cell || null,
      village: row.village || null,
      school_id: row.school_id,
      school_name: row.school_name || null,
      school_code: row.school_code || null,
      school_district: row.school_district || null,
      school_sector: row.school_sector || null,
      school_province: row.school_province || null,
      parent_guardian: {
        father_name: row.father_full_name || null,
        father_phone: row.father_phone || null,
        mother_name: row.mother_full_name || null,
        mother_phone: row.mother_phone || null,
      },
    };
    res.json({ success: true, data: { student } });
  } catch (e) {
    console.error('[uniform-vouchers/public/lookup-student]', e);
    res.status(500).json({ success: false, message: e.message || 'Lookup failed' });
  }
});

function deliveryFeeRw(method) {
  return method === 'home' ? 2500 : 0;
}

/** ── Public: create order (before payment) ───────────────────── */
router.post('/public/orders', async (req, res) => {
  const conn = await promisePool.getConnection();
  try {
    const b = req.body || {};
    const code = String(b.student_code || '').trim();
    const uniformType = String(b.uniform_type || '').toLowerCase() === 'sports' ? 'sports' : 'school';
    const linesIn = Array.isArray(b.lines) ? b.lines : [];
    const deliveryMethod = String(b.delivery_method || '').toLowerCase() === 'home' ? 'home' : 'school';
    const deliveryDetail = b.delivery_detail && typeof b.delivery_detail === 'object' ? b.delivery_detail : {};

    if (!code) {
      return res.status(400).json({ success: false, message: 'student_code is required' });
    }
    if (!linesIn.length) {
      return res.status(400).json({ success: false, message: 'Select at least one uniform item' });
    }

    const student = await findStudentByCode(code);
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    if (deliveryMethod === 'home') {
      const need = ['district', 'sector', 'cell', 'village', 'phone', 'full_address'];
      const miss = need.filter((k) => !String(deliveryDetail[k] || '').trim());
      if (miss.length) {
        return res.status(400).json({ success: false, message: `Home delivery requires: ${miss.join(', ')}` });
      }
    }

    const itemIds = linesIn.map((l) => parseInt(l.item_id, 10)).filter((n) => n > 0);
    if (!itemIds.length) {
      return res.status(400).json({ success: false, message: 'Invalid line items' });
    }
    const [itemRows] = await conn.query(
      `SELECT * FROM uniform_voucher_items WHERE id IN (${itemIds.map(() => '?').join(',')})
       AND is_active = 1 AND uniform_type = ?`,
      [...itemIds, uniformType]
    );
    const byId = new Map((itemRows || []).map((r) => [r.id, r]));
    const resolvedLines = [];
    let subtotal = 0;
    for (const L of linesIn) {
      const id = parseInt(L.item_id, 10);
      const row = byId.get(id);
      if (!row) continue;
      const qty = Math.max(1, Math.min(99, parseInt(L.qty, 10) || 1));
      const size = String(L.size || '').trim();
      const color = String(L.color || '').trim();
      let sizes = [];
      let colors = [];
      try {
        sizes = typeof row.sizes_json === 'string' ? JSON.parse(row.sizes_json) : row.sizes_json;
      } catch {
        sizes = [];
      }
      try {
        colors = row.colors_json
          ? typeof row.colors_json === 'string'
            ? JSON.parse(row.colors_json)
            : row.colors_json
          : [];
      } catch {
        colors = [];
      }
      if (!Array.isArray(sizes)) sizes = [];
      if (!Array.isArray(colors)) colors = [];
      if (size && sizes.length && !sizes.map(String).includes(size)) {
        return res.status(400).json({ success: false, message: `Invalid size for ${row.name}` });
      }
      if (color && colors.length && !colors.map(String).includes(color)) {
        return res.status(400).json({ success: false, message: `Invalid colour for ${row.name}` });
      }
      const unit = Math.round(Number(row.price_rwf) || 0);
      if (row.stock_qty != null) {
        const st = Number(row.stock_qty);
        if (st < qty) {
          return res.status(400).json({ success: false, message: `Insufficient stock for ${row.name}` });
        }
      }
      subtotal += unit * qty;
      resolvedLines.push({
        item_id: id,
        name: row.name,
        size: size || (sizes[0] ? String(sizes[0]) : ''),
        color: color || (colors[0] ? String(colors[0]) : '') || null,
        qty,
        unit_price_rwf: unit,
        line_total_rwf: unit * qty,
      });
    }
    if (!resolvedLines.length) {
      return res.status(400).json({ success: false, message: 'No valid items for this uniform type' });
    }

    const fee = deliveryFeeRw(deliveryMethod);
    const total = subtotal + fee;

    const districtForAgent = student.school_district || student.district || '';
    const sectorForAgent = student.school_sector || student.sector || '';
    const agentUserId = await pickAgentUserIdForSchool(districtForAgent, sectorForAgent);

    const studentDetail = {
      id: student.id,
      student_code: student.student_code || student.student_uid,
      first_name: student.first_name,
      last_name: student.last_name,
      gender: student.gender,
      class_name: student.class_name,
      district: student.district,
      sector: student.sector,
      cell: student.cell,
      village: student.village,
      parent_guardian: {
        father_name: student.father_full_name,
        father_phone: student.father_phone,
        mother_name: student.mother_full_name,
        mother_phone: student.mother_phone,
      },
    };
    const schoolDetail = {
      school_id: student.school_id,
      school_name: student.school_name,
      school_code: student.school_code,
      district: student.school_district,
      sector: student.school_sector,
      province: student.school_province,
    };

    const orderNo = genOrderNo();
    const voucherNo = genVoucherNo();

    await conn.beginTransaction();
    const [ins] = await conn.query(
      `INSERT INTO uniform_voucher_orders (
        order_number, voucher_number, student_id, school_id, uniform_type,
        order_district, order_sector, student_detail_json, school_detail_json,
        lines_json, delivery_method, delivery_detail_json,
        subtotal_rwf, delivery_fee_rwf, total_rwf,
        booking_status, payment_status, delivery_status,
        assigned_agent_user_id
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        orderNo,
        voucherNo,
        student.id,
        student.school_id || null,
        uniformType,
        districtForAgent || null,
        sectorForAgent || null,
        JSON.stringify(studentDetail),
        JSON.stringify(schoolDetail),
        JSON.stringify(resolvedLines),
        deliveryMethod,
        JSON.stringify(deliveryDetail),
        subtotal,
        fee,
        total,
        'Booked',
        'Unpaid',
        'Waiting',
        agentUserId,
      ]
    );
    const orderId = ins.insertId;

    await conn.commit();
    res.json({
      success: true,
      data: {
        order_id: orderId,
        order_number: orderNo,
        voucher_number: voucherNo,
        total_rwf: total,
        subtotal_rwf: subtotal,
        delivery_fee_rwf: fee,
      },
    });
  } catch (e) {
    try {
      await conn.rollback();
    } catch (_) {}
    console.error('[uniform-vouchers/public/orders]', e);
    res.status(500).json({ success: false, message: e.message || 'Could not create order' });
  } finally {
    conn.release();
  }
});

router.get('/public/track/:voucherNumber', async (req, res) => {
  try {
    const vn = String(req.params.voucherNumber || '').trim();
    if (!vn) return res.status(400).json({ success: false, message: 'Invalid voucher' });
    const [rows] = await promisePool.query(
      `SELECT order_number, voucher_number, uniform_type, booking_status, payment_status, delivery_status,
              total_rwf, lines_json, student_detail_json, school_detail_json, delivery_method,
              delivery_detail_json, created_at, updated_at
       FROM uniform_voucher_orders WHERE voucher_number = ? LIMIT 1`,
      [vn]
    );
    const o = rows[0];
    if (!o) return res.status(404).json({ success: false, message: 'Order not found' });
    res.json({
      success: true,
      data: {
        order_number: o.order_number,
        voucher_number: o.voucher_number,
        uniform_type: o.uniform_type,
        booking_status: o.booking_status,
        payment_status: o.payment_status,
        delivery_status: o.delivery_status,
        total_rwf: Number(o.total_rwf),
        lines: parseJsonField(o, 'lines_json') || [],
        student: parseJsonField(o, 'student_detail_json') || {},
        school: parseJsonField(o, 'school_detail_json') || {},
        delivery_method: o.delivery_method,
        delivery_detail: parseJsonField(o, 'delivery_detail_json'),
        created_at: o.created_at,
        updated_at: o.updated_at,
      },
    });
  } catch (e) {
    console.error('[uniform-vouchers/public/track]', e);
    res.status(500).json({ success: false, message: e.message || 'Failed' });
  }
});

router.post('/public/pay-momo', async (req, res) => {
  const conn = await promisePool.getConnection();
  try {
    const orderId = parseInt(req.body?.order_id, 10);
    const momoPhone = String(req.body?.momo_phone || req.body?.payer_phone || '').trim();
    const payerName = String(req.body?.payer_name || '').trim();
    const msisdn = toMsisdn250(momoPhone);
    if (!orderId) {
      return res.status(400).json({ success: false, message: 'order_id is required' });
    }
    if (!msisdn) {
      return res.status(400).json({ success: false, message: 'Enter a valid Rwanda MTN number.' });
    }
    if (!payerName) {
      return res.status(400).json({ success: false, message: 'Payer name is required' });
    }

    await conn.beginTransaction();
    const [[o]] = await conn.query(
      `SELECT * FROM uniform_voucher_orders WHERE id = ? FOR UPDATE`,
      [orderId]
    );
    if (!o) {
      await conn.rollback();
      return res.status(404).json({ success: false, message: 'Order not found' });
    }
    if (!['Unpaid', 'Pending'].includes(String(o.payment_status))) {
      await conn.rollback();
      return res.status(400).json({ success: false, message: 'Order is not awaiting payment' });
    }

    const total = Math.round(Number(o.total_rwf) || 0);
    if (total < 100) {
      await conn.rollback();
      return res.status(400).json({ success: false, message: 'Invalid amount' });
    }

    const externalId = `uvo-${orderId}-${Date.now()}`.slice(0, 64);
    let statusUpper = 'PENDING';
    let providerPayload = {};
    if (mtnMomo && mtnMomo.mtnMomoEnabled && mtnMomo.mtnMomoEnabled()) {
      const mtn = await mtnMomo.requestToPay({
        amount: total,
        currency: 'RWF',
        externalId,
        msisdn250: msisdn,
        payerMessage: `Uniform voucher ${o.voucher_number}`.slice(0, 80),
        payeeNote: o.order_number,
      });
      providerPayload = mtn.responseBody && typeof mtn.responseBody === 'object' ? mtn.responseBody : {};
      statusUpper = mtnMomo.mapMtnStatusToUpper(providerPayload.status);
    }

    const paySt = statusUpper === 'SUCCESSFUL' ? 'Paid' : 'Pending';
    const [ur] = await conn.query(
      `UPDATE uniform_voucher_orders SET
        payer_name = ?, payer_phone = ?, payment_method = 'momo',
        payment_reference = ?, payment_provider_json = ?,
        payment_status = ?,
        booking_status = CASE WHEN ? = 'SUCCESSFUL' THEN 'Confirmed' ELSE booking_status END,
        delivery_status = CASE WHEN ? = 'SUCCESSFUL' THEN 'Processing' ELSE delivery_status END
       WHERE id = ? AND payment_status IN ('Unpaid','Pending')`,
      [
        payerName,
        normalizeRwPhone(momoPhone) || momoPhone,
        externalId,
        JSON.stringify({ mtn: providerPayload }),
        paySt,
        statusUpper,
        statusUpper,
        orderId,
      ]
    );
    if (statusUpper === 'SUCCESSFUL' && ur.affectedRows > 0) {
      await decrementStockForLines(conn, o.lines_json);
    }
    await conn.commit();
    res.json({
      success: true,
      data: {
        order_id: orderId,
        order_number: o.order_number,
        voucher_number: o.voucher_number,
        mtn_status: statusUpper,
      },
    });
  } catch (e) {
    try {
      await conn.rollback();
    } catch (_) {}
    console.error('[uniform-vouchers/public/pay-momo]', e);
    res.status(500).json({ success: false, message: e.message || 'Payment failed' });
  } finally {
    conn.release();
  }
});

router.get('/public/pay-status/:orderId', async (req, res) => {
  try {
    const orderId = parseInt(req.params.orderId, 10);
    if (!orderId) return res.status(400).json({ success: false, message: 'Invalid id' });
    const [rows] = await promisePool.query(
      `SELECT payment_status, payment_provider_json, lines_json FROM uniform_voucher_orders WHERE id = ? LIMIT 1`,
      [orderId]
    );
    const row = rows[0];
    if (!row) return res.status(404).json({ success: false, message: 'Not found' });
    let provider = {};
    try {
      provider = row.payment_provider_json ? JSON.parse(row.payment_provider_json) : {};
    } catch {
      provider = {};
    }
    const mtnStatus = provider?.mtn?.status ? String(provider.mtn.status).toUpperCase() : '';
    const mapped = mtnStatus
      ? mtnMomo && typeof mtnMomo.mapMtnStatusToUpper === 'function'
        ? mtnMomo.mapMtnStatusToUpper(mtnStatus)
        : mtnStatus
      : String(row.payment_status || '').toLowerCase() === 'paid'
        ? 'SUCCESSFUL'
        : 'PENDING';

    if (mapped === 'SUCCESSFUL' && String(row.payment_status).toLowerCase() !== 'paid') {
      const conn = await promisePool.getConnection();
      try {
        await conn.beginTransaction();
        const [ur2] = await conn.query(
          `UPDATE uniform_voucher_orders SET payment_status='Paid', booking_status='Confirmed',
           delivery_status='Processing' WHERE id = ? AND payment_status IN ('Unpaid','Pending')`,
          [orderId]
        );
        if (ur2.affectedRows > 0) {
          await decrementStockForLines(conn, row.lines_json);
        }
        await conn.commit();
      } catch (e2) {
        try {
          await conn.rollback();
        } catch (_) {}
        throw e2;
      } finally {
        conn.release();
      }
    }
    const [again] = await promisePool.query(
      `SELECT payment_status FROM uniform_voucher_orders WHERE id = ? LIMIT 1`,
      [orderId]
    );
    res.json({
      success: true,
      data: {
        status: mapped,
        mtn_status: mapped,
        payment_status: again[0]?.payment_status || row.payment_status,
      },
    });
  } catch (e) {
    console.error('[uniform-vouchers/public/pay-status]', e);
    res.status(500).json({ success: false, message: e.message || 'Failed' });
  }
});

/** ── Admin: items ────────────────────────────────────────────── */
router.get('/admin/items', requireSuper, async (_req, res) => {
  try {
    const [rows] = await promisePool.query(
      'SELECT * FROM uniform_voucher_items ORDER BY uniform_type, sort_order, id'
    );
    res.json({ success: true, data: rows.map(mapItemRow) });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

router.post('/admin/items', requireSuper, uploadItemImage.single('image'), async (req, res) => {
  try {
    const uniform_type = String(req.body.uniform_type || 'school').toLowerCase() === 'sports' ? 'sports' : 'school';
    const name = String(req.body.name || '').trim();
    if (!name) return res.status(400).json({ success: false, message: 'name is required' });
    let sizes = [];
    let colors = [];
    try {
      sizes = req.body.sizes_json ? JSON.parse(req.body.sizes_json) : JSON.parse(req.body.sizes || '[]');
    } catch {
      sizes = String(req.body.sizes || '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
    }
    try {
      colors = req.body.colors_json ? JSON.parse(req.body.colors_json) : JSON.parse(req.body.colors || '[]');
    } catch {
      colors = String(req.body.colors || '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
    }
    if (!Array.isArray(sizes) || !sizes.length) {
      return res.status(400).json({ success: false, message: 'sizes_json or sizes (comma list) required' });
    }
    const price_rwf = Math.max(0, parseInt(req.body.price_rwf, 10) || 0);
    const stock_raw = req.body.stock_qty;
    const stock_qty =
      stock_raw === '' || stock_raw === undefined || stock_raw === null
        ? null
        : Math.max(0, parseInt(stock_raw, 10));
    const gender_scope =
      String(req.body.gender_scope || 'any').toLowerCase() === 'female'
        ? 'female'
        : String(req.body.gender_scope || 'any').toLowerCase() === 'male'
          ? 'male'
          : 'any';
    const is_active = String(req.body.is_active || '1') === '0' ? 0 : 1;
    const sort_order = parseInt(req.body.sort_order, 10) || 0;
    const description = String(req.body.description || '').trim();
    let image_url = String(req.body.image_url || '').trim() || null;
    if (req.file) {
      image_url = `/${UPLOAD_REL}/${req.file.filename}`.replace(/\\/g, '/');
    }
    const [ins] = await promisePool.query(
      `INSERT INTO uniform_voucher_items
       (uniform_type, name, description, image_url, sizes_json, colors_json, price_rwf, stock_qty, gender_scope, is_active, sort_order)
       VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
      [
        uniform_type,
        name,
        description || null,
        image_url,
        JSON.stringify(sizes),
        colors.length ? JSON.stringify(colors) : null,
        price_rwf,
        stock_qty,
        gender_scope,
        is_active,
        sort_order,
      ]
    );
    res.json({ success: true, data: { id: ins.insertId } });
  } catch (e) {
    console.error('[uniform-vouchers/admin/items POST]', e);
    res.status(500).json({ success: false, message: e.message || 'Failed' });
  }
});

router.put('/admin/items/:id', requireSuper, uploadItemImage.single('image'), async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!id) return res.status(400).json({ success: false, message: 'Invalid id' });
    const [[existing]] = await promisePool.query('SELECT * FROM uniform_voucher_items WHERE id = ?', [id]);
    if (!existing) return res.status(404).json({ success: false, message: 'Not found' });

    const uniform_type =
      req.body.uniform_type != null
        ? String(req.body.uniform_type).toLowerCase() === 'sports'
          ? 'sports'
          : 'school'
        : existing.uniform_type;
    const name = req.body.name != null ? String(req.body.name).trim() : existing.name;
    const description =
      req.body.description !== undefined ? String(req.body.description || '').trim() : existing.description;
    let sizes_json = existing.sizes_json;
    if (req.body.sizes_json != null || req.body.sizes != null) {
      try {
        sizes_json = JSON.stringify(
          req.body.sizes_json ? JSON.parse(req.body.sizes_json) : JSON.parse(req.body.sizes || '[]')
        );
      } catch {
        sizes_json = JSON.stringify(
          String(req.body.sizes || '')
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
        );
      }
    }
    let colors_json = existing.colors_json;
    if (req.body.colors_json != null || req.body.colors != null) {
      try {
        const arr = req.body.colors_json ? JSON.parse(req.body.colors_json) : JSON.parse(req.body.colors || '[]');
        colors_json = arr.length ? JSON.stringify(arr) : null;
      } catch {
        const arr = String(req.body.colors || '')
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);
        colors_json = arr.length ? JSON.stringify(arr) : null;
      }
    }
    const price_rwf =
      req.body.price_rwf != null ? Math.max(0, parseInt(req.body.price_rwf, 10) || 0) : existing.price_rwf;
    let stock_qty = existing.stock_qty;
    if (req.body.stock_qty !== undefined) {
      const stock_raw = req.body.stock_qty;
      stock_qty =
        stock_raw === '' || stock_raw === null ? null : Math.max(0, parseInt(stock_raw, 10));
    }
    const gender_scope = req.body.gender_scope != null ? String(req.body.gender_scope) : existing.gender_scope;
    const is_active =
      req.body.is_active != null ? (String(req.body.is_active) === '0' ? 0 : 1) : existing.is_active;
    const sort_order =
      req.body.sort_order != null ? parseInt(req.body.sort_order, 10) || 0 : existing.sort_order;
    let image_url = existing.image_url;
    if (req.file) {
      image_url = `/${UPLOAD_REL}/${req.file.filename}`.replace(/\\/g, '/');
    } else if (req.body.image_url !== undefined) {
      image_url = String(req.body.image_url || '').trim() || null;
    }

    await promisePool.query(
      `UPDATE uniform_voucher_items SET
        uniform_type=?, name=?, description=?, image_url=?, sizes_json=?, colors_json=?,
        price_rwf=?, stock_qty=?, gender_scope=?, is_active=?, sort_order=?
       WHERE id=?`,
      [
        uniform_type,
        name,
        description || null,
        image_url,
        sizes_json,
        colors_json,
        price_rwf,
        stock_qty,
        gender_scope,
        is_active,
        sort_order,
        id,
      ]
    );
    res.json({ success: true });
  } catch (e) {
    console.error('[uniform-vouchers/admin/items PUT]', e);
    res.status(500).json({ success: false, message: e.message || 'Failed' });
  }
});

router.delete('/admin/items/:id', requireSuper, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!id) return res.status(400).json({ success: false, message: 'Invalid id' });
    const [[row]] = await promisePool.query('SELECT id, image_url FROM uniform_voucher_items WHERE id = ? LIMIT 1', [id]);
    if (!row) return res.status(404).json({ success: false, message: 'Not found' });
    const u = String(row.image_url || '')
      .replace(/\\/g, '/')
      .trim();
    if (u.startsWith(`/${UPLOAD_REL}/`) || u.startsWith(`${UPLOAD_REL}/`)) {
      const file = path.basename(u.split('/').filter(Boolean).pop() || '');
      if (file && !file.includes('..') && !file.includes('/') && file !== '.' && file !== '..') {
        const abs = path.resolve(path.join(UPLOAD_ABS, file));
        const root = path.resolve(UPLOAD_ABS);
        if (abs === root || abs.startsWith(`${root}${path.sep}`)) {
          try {
            fs.unlinkSync(abs);
          } catch (_) {
            /* ignore missing file */
          }
        }
      }
    }
    await promisePool.query('DELETE FROM uniform_voucher_items WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (e) {
    console.error('[uniform-vouchers/admin/items DELETE]', e);
    res.status(500).json({ success: false, message: e.message || 'Delete failed' });
  }
});

/** ── Admin: orders list / patch ─────────────────────────────── */
router.get('/admin/orders', requireSuper, async (req, res) => {
  try {
    const q = String(req.query.q || '').trim();
    const pay = String(req.query.payment_status || '').trim();
    const book = String(req.query.booking_status || '').trim();
    let sql = `SELECT o.* FROM uniform_voucher_orders o WHERE 1=1`;
    const params = [];
    if (pay) {
      sql += ` AND o.payment_status = ?`;
      params.push(pay);
    }
    if (book) {
      sql += ` AND o.booking_status = ?`;
      params.push(book);
    }
    if (q) {
      const like = `%${q}%`;
      sql += ` AND (
        o.order_number LIKE ? OR o.voucher_number LIKE ?
        OR o.order_district LIKE ? OR o.order_sector LIKE ?
        OR JSON_UNQUOTE(JSON_EXTRACT(o.student_detail_json, '$.first_name')) LIKE ?
        OR JSON_UNQUOTE(JSON_EXTRACT(o.student_detail_json, '$.last_name')) LIKE ?
        OR JSON_UNQUOTE(JSON_EXTRACT(o.student_detail_json, '$.student_code')) LIKE ?
        OR JSON_UNQUOTE(JSON_EXTRACT(o.school_detail_json, '$.school_name')) LIKE ?
      )`;
      params.push(like, like, like, like, like, like, like, like);
    }
    sql += ` ORDER BY o.id DESC LIMIT 500`;
    const [rows] = await promisePool.query(sql, params);
    res.json({ success: true, data: rows });
  } catch (e) {
    console.error('[uniform-vouchers/admin/orders]', e);
    res.status(500).json({ success: false, message: e.message });
  }
});

router.patch('/admin/orders/:id', requireSuper, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!id) return res.status(400).json({ success: false, message: 'Invalid id' });
    const b = req.body || {};
    const fields = [];
    const vals = [];
    const allowed = [
      'booking_status',
      'payment_status',
      'delivery_status',
      'notes',
      'assigned_agent_user_id',
    ];
    for (const k of allowed) {
      if (b[k] !== undefined && b[k] !== null && b[k] !== '') {
        fields.push(`${k} = ?`);
        vals.push(b[k]);
      }
    }
    if (!fields.length) {
      return res.status(400).json({ success: false, message: 'No updates' });
    }
    vals.push(id);
    await promisePool.query(`UPDATE uniform_voucher_orders SET ${fields.join(', ')} WHERE id = ?`, vals);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

/** ── Agent: orders in coverage ───────────────────────────────── */
router.get('/agent/orders', requireAgent, async (req, res) => {
  try {
    const profile = await getAgentProfile(req.user.id);
    if (!profile) {
      return res.json({ success: true, data: [], message: 'No agent profile' });
    }
    const district = String(profile.district || '').trim();
    const sectors = parseSectorsJson(profile);
    const allSectors = Number(profile.all_sectors) === 1;

    let sql = `SELECT o.* FROM uniform_voucher_orders o WHERE o.order_district = ?`;
    const params = [district];
    if (!allSectors && sectors.length) {
      sql += ` AND (o.order_sector IS NULL OR o.order_sector IN (${sectors.map(() => '?').join(',')}))`;
      params.push(...sectors);
    }
    sql += ` ORDER BY o.id DESC LIMIT 300`;
    const [rows] = await promisePool.query(sql, params);
    res.json({ success: true, data: rows });
  } catch (e) {
    console.error('[uniform-vouchers/agent/orders]', e);
    res.status(500).json({ success: false, message: e.message });
  }
});

router.patch('/agent/orders/:id', requireAgent, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!id) return res.status(400).json({ success: false, message: 'Invalid id' });
    const profile = await getAgentProfile(req.user.id);
    if (!profile) return res.status(403).json({ success: false, message: 'No profile' });
    const [[o]] = await promisePool.query(
      'SELECT id, order_district, order_sector FROM uniform_voucher_orders WHERE id = ? LIMIT 1',
      [id]
    );
    if (!o) return res.status(404).json({ success: false, message: 'Not found' });
    if (String(o.order_district || '').trim() !== String(profile.district || '').trim()) {
      return res.status(403).json({ success: false, message: 'Outside your district' });
    }
    const sectors = parseSectorsJson(profile);
    if (Number(profile.all_sectors) !== 1 && o.order_sector && sectors.length) {
      if (!sectors.includes(String(o.order_sector))) {
        return res.status(403).json({ success: false, message: 'Outside your sectors' });
      }
    }
    const delivery_status = String(req.body?.delivery_status || '').trim();
    const notes = req.body?.notes !== undefined ? String(req.body.notes) : null;
    if (!delivery_status && notes == null) {
      return res.status(400).json({ success: false, message: 'delivery_status or notes required' });
    }
    if (delivery_status) {
      await promisePool.query(
        `UPDATE uniform_voucher_orders SET delivery_status = ?, notes = COALESCE(?, notes) WHERE id = ?`,
        [delivery_status, notes, id]
      );
    } else if (notes != null) {
      await promisePool.query(`UPDATE uniform_voucher_orders SET notes = ? WHERE id = ?`, [notes, id]);
    }
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

router.get('/admin/summary', requireSuper, async (_req, res) => {
  try {
    const [[c]] = await promisePool.query('SELECT COUNT(*) AS n FROM uniform_voucher_orders');
    const [[paid]] = await promisePool.query(
      `SELECT COUNT(*) AS n, COALESCE(SUM(total_rwf),0) AS sum_rwf FROM uniform_voucher_orders WHERE payment_status = 'Paid'`
    );
    const [[pending]] = await promisePool.query(
      `SELECT COUNT(*) AS n FROM uniform_voucher_orders WHERE payment_status IN ('Unpaid','Pending')`
    );
    res.json({
      success: true,
      data: {
        orders_total: Number(c?.n || 0),
        paid_count: Number(paid?.n || 0),
        paid_volume_rwf: Number(paid?.sum_rwf || 0),
        pending_payment_count: Number(pending?.n || 0),
      },
    });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

module.exports = router;
