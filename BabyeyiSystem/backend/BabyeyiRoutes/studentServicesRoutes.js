'use strict';

/**
 * Student / voucher services — Super Admin catalog, pricing, future orders.
 * Tables: services, service_prices, service_orders, service_payments, vouchers, voucher_redemptions
 */

const express = require('express');
const crypto = require('crypto');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const xlsx = require('xlsx');
const PDFDocument = require('pdfkit');
const { promisePool } = require('../config/database');
let mtnMomo = null;
try {
  mtnMomo = require('./mtnMomoCollection');
} catch (_) {
  mtnMomo = null;
}

const router = express.Router();

const UPLOAD_REL = 'uploads/service-icons';
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
  const code = (req.user.role_code || '').toUpperCase();
  if (code !== 'AGENT') {
    return res.status(403).json({ success: false, message: 'Access denied' });
  }
  next();
}

let tablesReady = false;
let ensureLock = null;

async function ensureTables() {
  if (tablesReady) return;
  if (!ensureLock) {
    ensureLock = (async () => {
      await promisePool.query(`
        CREATE TABLE IF NOT EXISTS services (
          id INT UNSIGNED NOT NULL AUTO_INCREMENT,
          service_code VARCHAR(64) NOT NULL,
          name VARCHAR(255) NOT NULL,
          category VARCHAR(100) NOT NULL DEFAULT 'Voucher',
          description TEXT NULL,
          short_tagline VARCHAR(500) NULL,
          icon_url VARCHAR(512) NULL,
          academic_year VARCHAR(32) NOT NULL,
          eligibility_levels JSON NULL,
          default_pricing_type ENUM('global','by_level','by_school') NOT NULL DEFAULT 'global',
          validity_start DATE NULL,
          validity_end DATE NULL,
          redemption_method VARCHAR(255) NULL,
          delivery_method VARCHAR(255) NULL,
          stock_quantity INT NULL DEFAULT NULL,
          payment_rules TEXT NULL,
          terms_conditions TEXT NULL,
          status ENUM('draft','active','inactive','archived') NOT NULL DEFAULT 'draft',
          created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          PRIMARY KEY (id),
          UNIQUE KEY uq_services_code (service_code),
          KEY idx_services_status_year (status, academic_year)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);

      await promisePool.query(`ALTER TABLE services ADD COLUMN IF NOT EXISTS created_by_role VARCHAR(40) NOT NULL DEFAULT 'SUPER_ADMIN'`);
      await promisePool.query(`ALTER TABLE services ADD COLUMN IF NOT EXISTS created_by_user_id INT UNSIGNED NULL`);
      await promisePool.query(`ALTER TABLE services ADD COLUMN IF NOT EXISTS is_shop_product TINYINT(1) NOT NULL DEFAULT 0`);
      await promisePool.query(`ALTER TABLE services ADD COLUMN IF NOT EXISTS deleted_at DATETIME NULL`);
      await promisePool.query(`ALTER TABLE services ADD COLUMN IF NOT EXISTS available_sizes JSON NULL`);
      await promisePool.query(`ALTER TABLE services ADD COLUMN IF NOT EXISTS shoe_categories JSON NULL`);
      await promisePool.query(`ALTER TABLE services ADD COLUMN IF NOT EXISTS delivery_fee DECIMAL(12,2) NOT NULL DEFAULT 0`);

      await promisePool.query(`
    CREATE TABLE IF NOT EXISTS service_prices (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT,
      service_id INT UNSIGNED NOT NULL,
      pricing_type ENUM('global','level','school') NOT NULL,
      school_id INT UNSIGNED NULL,
      level VARCHAR(64) NULL,
      academic_year VARCHAR(32) NOT NULL,
      amount DECIMAL(12,2) NOT NULL DEFAULT 0,
      currency VARCHAR(10) NOT NULL DEFAULT 'FRW',
      is_active TINYINT(1) NOT NULL DEFAULT 1,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY idx_sp_service (service_id),
      KEY idx_sp_school (school_id),
      CONSTRAINT fk_sp_service FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);

  await promisePool.query(`
    CREATE TABLE IF NOT EXISTS service_orders (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT,
      order_number VARCHAR(40) NOT NULL,
      service_id INT UNSIGNED NOT NULL,
      student_id INT UNSIGNED NULL,
      parent_id INT UNSIGNED NULL,
      school_id INT UNSIGNED NULL,
      academic_year VARCHAR(32) NOT NULL,
      amount DECIMAL(12,2) NOT NULL DEFAULT 0,
      currency VARCHAR(10) NOT NULL DEFAULT 'FRW',
      payment_status ENUM('pending','awaiting_payment','paid','failed','refunded') NOT NULL DEFAULT 'pending',
      order_status ENUM('pending','awaiting_payment','paid','voucher_issued','redeemed','cancelled','expired') NOT NULL DEFAULT 'pending',
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uq_order_number (order_number),
      KEY idx_so_service (service_id),
      CONSTRAINT fk_so_service FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE RESTRICT
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
  await promisePool.query(`ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS quantity INT UNSIGNED NOT NULL DEFAULT 1`);
  await promisePool.query(`ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS unit_amount DECIMAL(12,2) NOT NULL DEFAULT 0`);
  await promisePool.query(`ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS batch_ref VARCHAR(64) NULL`);
  await promisePool.query(`ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS delivery_mode ENUM('AT_SCHOOL','AT_HOME') NULL`);
  await promisePool.query(`ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS delivery_address VARCHAR(500) NULL`);
  await promisePool.query(`ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS buyer_name VARCHAR(160) NULL`);
  await promisePool.query(`ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS buyer_contact VARCHAR(120) NULL`);
  await promisePool.query(`ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS agent_user_id INT UNSIGNED NULL`);
  await promisePool.query(`ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS source_channel VARCHAR(50) NOT NULL DEFAULT 'PUBLIC'`);
  await promisePool.query(`ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS fulfillment_status VARCHAR(40) NOT NULL DEFAULT 'Pending'`);

  await promisePool.query(`
    CREATE TABLE IF NOT EXISTS service_payments (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT,
      order_id INT UNSIGNED NOT NULL,
      payment_ref VARCHAR(128) NULL,
      payment_method VARCHAR(64) NULL,
      amount_paid DECIMAL(12,2) NOT NULL DEFAULT 0,
      transaction_fee DECIMAL(12,2) NOT NULL DEFAULT 0,
      total_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
      payment_date DATETIME NULL,
      payment_status ENUM('pending','paid','failed','refunded') NOT NULL DEFAULT 'pending',
      provider_response LONGTEXT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY idx_pay_order (order_id),
      CONSTRAINT fk_pay_order FOREIGN KEY (order_id) REFERENCES service_orders(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);

  await promisePool.query(`
    CREATE TABLE IF NOT EXISTS vouchers (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT,
      voucher_code VARCHAR(48) NOT NULL,
      order_id INT UNSIGNED NOT NULL,
      student_id INT UNSIGNED NULL,
      service_id INT UNSIGNED NOT NULL,
      issue_date DATE NULL,
      expiry_date DATE NULL,
      status ENUM('pending','paid','redeemed','expired','cancelled') NOT NULL DEFAULT 'pending',
      qr_code_path VARCHAR(512) NULL,
      redeemed_at DATETIME NULL,
      redeemed_by INT UNSIGNED NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uq_voucher_code (voucher_code),
      KEY idx_v_order (order_id),
      KEY idx_v_service (service_id),
      CONSTRAINT fk_v_order FOREIGN KEY (order_id) REFERENCES service_orders(id) ON DELETE CASCADE,
      CONSTRAINT fk_v_service FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE RESTRICT
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);

  await promisePool.query(`
    CREATE TABLE IF NOT EXISTS voucher_redemptions (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT,
      voucher_id INT UNSIGNED NOT NULL,
      school_id INT UNSIGNED NOT NULL,
      redeemed_by_user_id INT UNSIGNED NULL,
      redeemed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      notes TEXT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY idx_vr_voucher (voucher_id),
      CONSTRAINT fk_vr_voucher FOREIGN KEY (voucher_id) REFERENCES vouchers(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);

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
    console.error('[student-services] ensureTables:', e);
    res.status(500).json({ success: false, message: 'Database setup failed for student services' });
  }
});

if (!fs.existsSync(UPLOAD_ABS)) {
  fs.mkdirSync(UPLOAD_ABS, { recursive: true });
}

const upload = multer({
  storage: multer.diskStorage({
    destination(_req, _file, cb) {
      cb(null, UPLOAD_ABS);
    },
    filename(_req, file, cb) {
      const ext = path.extname(file.originalname) || '.png';
      const base = path.basename(file.originalname, ext).replace(/\s+/g, '-').slice(0, 40);
      cb(null, `svc-${base}-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
    },
  }),
  limits: { fileSize: 3 * 1024 * 1024 },
  fileFilter(_req, file, cb) {
    const ok = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.mimetype);
    cb(ok ? null : new Error('Only image files are allowed'), ok);
  },
});

function parseEligibility(val) {
  if (val == null || val === '') return null;
  if (Array.isArray(val)) return JSON.stringify(val);
  if (typeof val === 'string') {
    try {
      const j = JSON.parse(val);
      return Array.isArray(j) ? JSON.stringify(j) : null;
    } catch {
      return null;
    }
  }
  return null;
}

function decodeRow(service) {
  if (!service) return service;
  let el = service.eligibility_levels;
  if (Buffer.isBuffer(el)) el = el.toString('utf8');
  try {
    if (typeof el === 'string') {
      service.eligibility_levels = JSON.parse(el);
    } else if (Array.isArray(el)) {
      service.eligibility_levels = el;
    } else if (el && typeof el === 'object') {
      service.eligibility_levels = el;
    } else {
      service.eligibility_levels = [];
    }
  } catch {
    service.eligibility_levels = [];
  }
  for (const key of ['available_sizes', 'shoe_categories']) {
    let v = service[key];
    if (Buffer.isBuffer(v)) v = v.toString('utf8');
    try {
      if (typeof v === 'string') service[key] = JSON.parse(v);
      else if (Array.isArray(v)) service[key] = v;
      else service[key] = [];
    } catch {
      service[key] = [];
    }
  }
  if (service.delivery_fee != null) service.delivery_fee = Number(service.delivery_fee);
  return service;
}

function eligibilityToDb(existingRaw, incomingField) {
  if (incomingField !== undefined) return parseEligibility(incomingField);
  if (existingRaw == null) return null;
  if (typeof existingRaw === 'string') return existingRaw;
  if (Buffer.isBuffer(existingRaw)) return existingRaw.toString('utf8');
  return JSON.stringify(existingRaw);
}

async function attachPriceSummary(serviceIds) {
  if (!serviceIds.length) return {};
  const [rows] = await promisePool.query(
    `SELECT service_id,
            MIN(amount) AS price_min,
            MAX(amount) AS price_max
     FROM service_prices
     WHERE service_id IN (?) AND is_active = 1
     GROUP BY service_id`,
    [serviceIds]
  );
  const map = {};
  for (const r of rows) {
    map[r.service_id] = {
      price_min: r.price_min != null ? Number(r.price_min) : null,
      price_max: r.price_max != null ? Number(r.price_max) : null,
    };
  }
  return map;
}

/** Public catalog — active services (optional ?category= or all) */
router.get('/public/services', async (req, res) => {
  try {
    const category = req.query.category;
    const where = ['status = ?', 'deleted_at IS NULL'];
    const params = ['active'];
    if (category && String(category).toLowerCase() !== 'all') {
      where.push('category = ?');
      params.push(category);
    }
    const [rows] = await promisePool.query(
      `SELECT id, service_code, name, category, description, short_tagline, icon_url,
              academic_year, eligibility_levels, default_pricing_type,
              validity_start, validity_end, redemption_method, delivery_method,
              stock_quantity, terms_conditions, status, available_sizes, shoe_categories, delivery_fee
       FROM services
       WHERE ${where.join(' AND ')}
       ORDER BY name ASC`,
      params
    );
    const list = rows.map(decodeRow);
    const ids = list.map((s) => s.id);
    const prices = await attachPriceSummary(ids);
    for (const s of list) {
      const p = prices[s.id] || {};
      s.price_from = p.price_min;
      s.price_to = p.price_max;
    }
    res.json({ success: true, data: list });
  } catch (e) {
    console.error('[student-services] public list', e);
    res.status(500).json({ success: false, message: e.message });
  }
});

router.get('/public/services/:idOrCode', async (req, res) => {
  try {
    const q = req.params.idOrCode;
    const isNum = /^\d+$/.test(q);
    const [rows] = await promisePool.query(
      isNum
        ? `SELECT * FROM services WHERE id = ? AND status = 'active' AND deleted_at IS NULL LIMIT 1`
        : `SELECT * FROM services WHERE service_code = ? AND status = 'active' AND deleted_at IS NULL LIMIT 1`,
      [isNum ? parseInt(q, 10) : q]
    );
    if (!rows.length) {
      return res.status(404).json({ success: false, message: 'Service not found' });
    }
    const service = decodeRow(rows[0]);
    const [prices] = await promisePool.query(
      `SELECT * FROM service_prices WHERE service_id = ? AND is_active = 1 ORDER BY pricing_type, level, school_id`,
      [service.id]
    );
    service.prices = prices;
    const pm = await attachPriceSummary([service.id]);
    const p = pm[service.id] || {};
    service.price_from = p.price_min;
    service.price_to = p.price_max;
    res.json({ success: true, data: service });
  } catch (e) {
    console.error('[student-services] public get', e);
    res.status(500).json({ success: false, message: e.message });
  }
});

/** Admin — list all services (includes draft/archived) */
router.get('/admin/services', requireSuper, async (req, res) => {
  try {
    const { status, category, search } = req.query;
    const where = ['1=1', 'deleted_at IS NULL'];
    const params = [];
    if (status) {
      where.push('status = ?');
      params.push(status);
    }
    if (category) {
      where.push('category = ?');
      params.push(category);
    }
    if (search) {
      where.push('(name LIKE ? OR service_code LIKE ?)');
      const t = `%${search}%`;
      params.push(t, t);
    }
    const [rows] = await promisePool.query(
      `SELECT * FROM services WHERE ${where.join(' AND ')} ORDER BY updated_at DESC`,
      params
    );
    const list = rows.map(decodeRow);
    const ids = list.map((s) => s.id);
    const prices = await attachPriceSummary(ids);
    for (const s of list) {
      const p = prices[s.id] || {};
      s.price_from = p.price_min;
      s.price_to = p.price_max;
    }
    res.json({ success: true, data: list });
  } catch (e) {
    console.error('[student-services] admin list', e);
    res.status(500).json({ success: false, message: e.message });
  }
});

router.get('/admin/services/:id', requireSuper, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const [rows] = await promisePool.query(`SELECT * FROM services WHERE id = ? LIMIT 1`, [id]);
    if (!rows.length) {
      return res.status(404).json({ success: false, message: 'Not found' });
    }
    const service = decodeRow(rows[0]);
    const [prices] = await promisePool.query(
      `SELECT * FROM service_prices WHERE service_id = ? ORDER BY id ASC`,
      [id]
    );
    service.prices = prices;
    res.json({ success: true, data: service });
  } catch (e) {
    console.error('[student-services] admin get', e);
    res.status(500).json({ success: false, message: e.message });
  }
});

function normalizePricesPayload(raw, academicYear, defaultPricingType) {
  let arr = raw;
  if (typeof raw === 'string') {
    try {
      arr = JSON.parse(raw);
    } catch {
      throw new Error('Invalid prices JSON');
    }
  }
  if (!Array.isArray(arr)) {
    if (defaultPricingType === 'global' && raw != null && typeof raw === 'object' && raw.amount != null) {
      arr = [{ pricing_type: 'global', amount: raw.amount, academic_year: academicYear }];
    } else {
      arr = [];
    }
  }
  const out = [];
  for (const row of arr) {
    const type = (row.pricing_type || '').toLowerCase();
    const year = row.academic_year || academicYear;
    if (!year) throw new Error('Each price needs academic_year or set service academic year');
    if (type === 'global') {
      out.push({
        pricing_type: 'global',
        school_id: null,
        level: null,
        academic_year: year,
        amount: Number(row.amount),
        currency: row.currency || 'FRW',
        is_active: row.is_active !== false ? 1 : 0,
      });
    } else if (type === 'level') {
      out.push({
        pricing_type: 'level',
        school_id: null,
        level: String(row.level || '').trim() || null,
        academic_year: year,
        amount: Number(row.amount),
        currency: row.currency || 'FRW',
        is_active: row.is_active !== false ? 1 : 0,
      });
    } else if (type === 'school') {
      out.push({
        pricing_type: 'school',
        school_id: row.school_id != null ? parseInt(row.school_id, 10) : null,
        level: null,
        academic_year: year,
        amount: Number(row.amount),
        currency: row.currency || 'FRW',
        is_active: row.is_active !== false ? 1 : 0,
      });
    }
  }

  if (defaultPricingType === 'global' && out.length === 0) {
    throw new Error('Add at least one global price');
  }
  if (defaultPricingType === 'by_level' && !out.some((r) => r.pricing_type === 'level')) {
    throw new Error('Add at least one level price');
  }
  if (defaultPricingType === 'by_school' && !out.some((r) => r.pricing_type === 'school' && r.school_id)) {
    throw new Error('Add at least one school-specific price');
  }

  for (const r of out) {
    if (Number.isNaN(r.amount) || r.amount < 0) throw new Error('Invalid amount');
    if (r.pricing_type === 'school' && !r.school_id) throw new Error('School price requires school_id');
    if (r.pricing_type === 'level' && !r.level) throw new Error('Level price requires level');
  }
  return out;
}

async function savePrices(conn, serviceId, pricesNorm) {
  await conn.query(`DELETE FROM service_prices WHERE service_id = ?`, [serviceId]);
  for (const p of pricesNorm) {
    await conn.query(
      `INSERT INTO service_prices (service_id, pricing_type, school_id, level, academic_year, amount, currency, is_active)
       VALUES (?,?,?,?,?,?,?,?)`,
      [serviceId, p.pricing_type, p.school_id, p.level, p.academic_year, p.amount, p.currency, p.is_active]
    );
  }
}

function bodyFromMultipart(req) {
  const b = req.body || {};
  return {
    service_code: b.service_code,
    name: b.name,
    category: b.category,
    description: b.description,
    short_tagline: b.short_tagline,
    academic_year: b.academic_year,
    eligibility_levels: b.eligibility_levels,
    default_pricing_type: b.default_pricing_type,
    validity_start: b.validity_start || null,
    validity_end: b.validity_end || null,
    redemption_method: b.redemption_method,
    delivery_method: b.delivery_method,
    stock_quantity: b.stock_quantity === '' ? null : b.stock_quantity,
    payment_rules: b.payment_rules,
    terms_conditions: b.terms_conditions,
    available_sizes: b.available_sizes,
    shoe_categories: b.shoe_categories,
    delivery_fee: b.delivery_fee,
    status: b.status,
    prices: b.prices,
  };
}

function parseJsonArray(val) {
  if (val == null || val === '') return JSON.stringify([]);
  if (Array.isArray(val)) return JSON.stringify(val);
  if (typeof val === 'string') {
    try {
      const j = JSON.parse(val);
      return JSON.stringify(Array.isArray(j) ? j : []);
    } catch {
      return JSON.stringify(
        String(val)
          .split(',')
          .map((x) => x.trim())
          .filter(Boolean)
      );
    }
  }
  return JSON.stringify([]);
}

function resolveUserId(req) {
  return req.session?.userId || req.session?.user?.id || req.user?.id || null;
}

router.post('/admin/services', requireSuper, upload.single('icon'), async (req, res) => {
  const conn = await promisePool.getConnection();
  try {
    const b = req.file ? bodyFromMultipart(req) : req.body;
    const {
      service_code,
      name,
      category = 'Voucher',
      description,
      short_tagline,
      academic_year,
      eligibility_levels,
      default_pricing_type = 'global',
      validity_start,
      validity_end,
      redemption_method,
      delivery_method,
      stock_quantity,
      payment_rules,
      terms_conditions,
      available_sizes,
      shoe_categories,
      delivery_fee,
      status = 'draft',
      prices,
    } = b;

    if (!service_code || !name || !academic_year) {
      return res.status(400).json({ success: false, message: 'service_code, name, and academic_year are required' });
    }

    const elig = parseEligibility(eligibility_levels);
    const pricesNorm = normalizePricesPayload(prices, academic_year, default_pricing_type);

    let icon_url = null;
    if (req.file) {
      icon_url = `/${UPLOAD_REL}/${req.file.filename}`.replace(/\\/g, '/');
    }

    await conn.beginTransaction();

    const [ins] = await conn.query(
      `INSERT INTO services (
        service_code, name, category, description, short_tagline, icon_url, academic_year,
        eligibility_levels, default_pricing_type, validity_start, validity_end,
        redemption_method, delivery_method, stock_quantity, payment_rules, terms_conditions, available_sizes, shoe_categories, delivery_fee, status,
        created_by_role, created_by_user_id, is_shop_product
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        String(service_code).trim(),
        String(name).trim(),
        category,
        description || null,
        short_tagline || null,
        icon_url,
        academic_year,
        elig,
        default_pricing_type,
        validity_start || null,
        validity_end || null,
        redemption_method || null,
        delivery_method || null,
        stock_quantity != null && stock_quantity !== '' ? parseInt(stock_quantity, 10) : null,
        payment_rules || null,
        terms_conditions || null,
        parseJsonArray(available_sizes),
        parseJsonArray(shoe_categories),
        delivery_fee != null && delivery_fee !== '' ? Number(delivery_fee) : 0,
        status,
        'SUPER_ADMIN',
        resolveUserId(req),
        category === 'Agent Shop' ? 1 : 0,
      ]
    );
    const serviceId = ins.insertId;
    await savePrices(conn, serviceId, pricesNorm);
    await conn.commit();

    const [[row]] = await promisePool.query(`SELECT * FROM services WHERE id = ?`, [serviceId]);
    res.status(201).json({ success: true, data: decodeRow(row) });
  } catch (e) {
    await conn.rollback();
    if (e.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ success: false, message: 'Service code already exists' });
    }
    console.error('[student-services] create', e);
    res.status(400).json({ success: false, message: e.message || 'Create failed' });
  } finally {
    conn.release();
  }
});

router.put('/admin/services/:id', requireSuper, upload.single('icon'), async (req, res) => {
  const conn = await promisePool.getConnection();
  try {
    const id = parseInt(req.params.id, 10);
    const [[existing]] = await conn.query(`SELECT * FROM services WHERE id = ? LIMIT 1`, [id]);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Not found' });
    }

    const b = req.file ? bodyFromMultipart(req) : req.body;
    const {
      service_code,
      name,
      category,
      description,
      short_tagline,
      academic_year,
      eligibility_levels,
      default_pricing_type,
      validity_start,
      validity_end,
      redemption_method,
      delivery_method,
      stock_quantity,
      payment_rules,
      terms_conditions,
      available_sizes,
      shoe_categories,
      delivery_fee,
      status,
      prices,
    } = b;

    const elig = eligibilityToDb(existing.eligibility_levels, eligibility_levels);
    const ay = academic_year || existing.academic_year;
    const dpt = default_pricing_type || existing.default_pricing_type;

    let pricesNorm = null;
    if (prices !== undefined) {
      pricesNorm = normalizePricesPayload(prices, ay, dpt);
    }

    let icon_url = existing.icon_url;
    if (req.file) {
      icon_url = `/${UPLOAD_REL}/${req.file.filename}`.replace(/\\/g, '/');
    }

    await conn.beginTransaction();

    await conn.query(
      `UPDATE services SET
        service_code = COALESCE(?, service_code),
        name = COALESCE(?, name),
        category = COALESCE(?, category),
        description = ?,
        short_tagline = ?,
        icon_url = ?,
        academic_year = COALESCE(?, academic_year),
        eligibility_levels = ?,
        default_pricing_type = COALESCE(?, default_pricing_type),
        validity_start = ?,
        validity_end = ?,
        redemption_method = ?,
        delivery_method = ?,
        stock_quantity = ?,
        payment_rules = ?,
        terms_conditions = ?,
        available_sizes = ?,
        shoe_categories = ?,
        delivery_fee = ?,
        is_shop_product = ?,
        status = COALESCE(?, status)
      WHERE id = ?`,
      [
        service_code != null ? String(service_code).trim() : null,
        name != null ? String(name).trim() : null,
        category || null,
        description !== undefined ? description : existing.description,
        short_tagline !== undefined ? short_tagline : existing.short_tagline,
        icon_url,
        academic_year || null,
        elig,
        default_pricing_type || null,
        validity_start !== undefined ? validity_start || null : existing.validity_start,
        validity_end !== undefined ? validity_end || null : existing.validity_end,
        redemption_method !== undefined ? redemption_method : existing.redemption_method,
        delivery_method !== undefined ? delivery_method : existing.delivery_method,
        stock_quantity !== undefined ? (stock_quantity === '' || stock_quantity == null ? null : parseInt(stock_quantity, 10)) : existing.stock_quantity,
        payment_rules !== undefined ? payment_rules : existing.payment_rules,
        terms_conditions !== undefined ? terms_conditions : existing.terms_conditions,
        available_sizes !== undefined ? parseJsonArray(available_sizes) : (existing.available_sizes || JSON.stringify([])),
        shoe_categories !== undefined ? parseJsonArray(shoe_categories) : (existing.shoe_categories || JSON.stringify([])),
        delivery_fee !== undefined ? (delivery_fee === '' || delivery_fee == null ? 0 : Number(delivery_fee)) : (existing.delivery_fee || 0),
        (category !== undefined ? category : existing.category) === 'Agent Shop' ? 1 : 0,
        status || null,
        id,
      ]
    );

    if (pricesNorm) await savePrices(conn, id, pricesNorm);
    await conn.commit();

    const [[row]] = await promisePool.query(`SELECT * FROM services WHERE id = ?`, [id]);
    const [prRows] = await promisePool.query(`SELECT * FROM service_prices WHERE service_id = ?`, [id]);
    const service = decodeRow(row);
    service.prices = prRows;
    res.json({ success: true, data: service });
  } catch (e) {
    await conn.rollback();
    if (e.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ success: false, message: 'Service code already exists' });
    }
    console.error('[student-services] update', e);
    res.status(400).json({ success: false, message: e.message || 'Update failed' });
  } finally {
    conn.release();
  }
});

// ═══════════════════════════════════════════════════════════════
// Agent shop products CRUD
// ═══════════════════════════════════════════════════════════════
router.get('/agent/shop-products', requireAgent, async (req, res) => {
  try {
    const userId = resolveUserId(req);
    const [rows] = await promisePool.query(
      `SELECT * FROM services
       WHERE deleted_at IS NULL
         AND is_shop_product = 1
         AND created_by_role = 'AGENT'
         AND created_by_user_id = ?
       ORDER BY updated_at DESC`,
      [userId]
    );
    res.json({ success: true, data: rows.map(decodeRow) });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message || 'Failed to list products' });
  }
});

router.post('/agent/shop-products', requireAgent, upload.single('icon'), async (req, res) => {
  const conn = await promisePool.getConnection();
  try {
    const userId = resolveUserId(req);
    const b = req.file ? bodyFromMultipart(req) : req.body;
    const service_code = String(b.service_code || '').trim();
    const name = String(b.name || '').trim();
    const academic_year = String(b.academic_year || '').trim() || `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`;
    const amount = Number(b.global_amount ?? b.amount ?? 0);
    if (!service_code || !name || Number.isNaN(amount) || amount < 0) {
      return res.status(400).json({ success: false, message: 'service_code, name and amount are required.' });
    }
    const icon_url = req.file ? `/${UPLOAD_REL}/${req.file.filename}`.replace(/\\/g, '/') : null;
    await conn.beginTransaction();
    const [ins] = await conn.query(
      `INSERT INTO services (
        service_code, name, category, description, short_tagline, icon_url, academic_year,
        eligibility_levels, default_pricing_type, stock_quantity, status,
        created_by_role, created_by_user_id, is_shop_product
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,1)`,
      [
        service_code,
        name,
        'Agent Shop',
        b.description || null,
        b.short_tagline || null,
        icon_url,
        academic_year,
        JSON.stringify([]),
        'global',
        b.stock_quantity != null && b.stock_quantity !== '' ? parseInt(b.stock_quantity, 10) : null,
        b.status || 'active',
        'AGENT',
        userId,
      ]
    );
    await conn.query(
      `INSERT INTO service_prices (service_id, pricing_type, school_id, level, academic_year, amount, currency, is_active)
       VALUES (?, 'global', NULL, NULL, ?, ?, 'FRW', 1)`,
      [ins.insertId, academic_year, amount]
    );
    await conn.commit();
    const [[row]] = await promisePool.query(`SELECT * FROM services WHERE id = ? LIMIT 1`, [ins.insertId]);
    res.status(201).json({ success: true, data: decodeRow(row) });
  } catch (e) {
    await conn.rollback();
    res.status(400).json({ success: false, message: e.message || 'Create failed' });
  } finally {
    conn.release();
  }
});

router.put('/agent/shop-products/:id', requireAgent, upload.single('icon'), async (req, res) => {
  const conn = await promisePool.getConnection();
  try {
    const userId = resolveUserId(req);
    const id = parseInt(req.params.id, 10);
    const [[existing]] = await conn.query(
      `SELECT * FROM services WHERE id = ? AND deleted_at IS NULL AND is_shop_product = 1 AND created_by_role='AGENT' AND created_by_user_id = ? LIMIT 1`,
      [id, userId]
    );
    if (!existing) return res.status(404).json({ success: false, message: 'Product not found' });
    const b = req.file ? bodyFromMultipart(req) : req.body;
    const icon_url = req.file ? `/${UPLOAD_REL}/${req.file.filename}`.replace(/\\/g, '/') : existing.icon_url;
    await conn.beginTransaction();
    await conn.query(
      `UPDATE services
       SET name = COALESCE(?, name),
           description = ?,
           short_tagline = ?,
           icon_url = ?,
           stock_quantity = ?,
           status = COALESCE(?, status),
           updated_at = NOW()
       WHERE id = ?`,
      [
        b.name ? String(b.name).trim() : null,
        b.description !== undefined ? b.description : existing.description,
        b.short_tagline !== undefined ? b.short_tagline : existing.short_tagline,
        icon_url,
        b.stock_quantity !== undefined ? (b.stock_quantity === '' ? null : parseInt(b.stock_quantity, 10)) : existing.stock_quantity,
        b.status || null,
        id,
      ]
    );
    if (b.global_amount !== undefined || b.amount !== undefined) {
      const amount = Number(b.global_amount ?? b.amount);
      if (Number.isNaN(amount) || amount < 0) throw new Error('Invalid amount');
      await conn.query(`DELETE FROM service_prices WHERE service_id = ?`, [id]);
      await conn.query(
        `INSERT INTO service_prices (service_id, pricing_type, school_id, level, academic_year, amount, currency, is_active)
         VALUES (?, 'global', NULL, NULL, ?, ?, 'FRW', 1)`,
        [id, b.academic_year || existing.academic_year, amount]
      );
    }
    await conn.commit();
    res.json({ success: true, message: 'Product updated' });
  } catch (e) {
    await conn.rollback();
    res.status(400).json({ success: false, message: e.message || 'Update failed' });
  } finally {
    conn.release();
  }
});

router.delete('/agent/shop-products/:id', requireAgent, async (req, res) => {
  try {
    const userId = resolveUserId(req);
    const id = parseInt(req.params.id, 10);
    const [up] = await promisePool.query(
      `UPDATE services
       SET deleted_at = NOW(), status='archived'
       WHERE id = ? AND is_shop_product = 1 AND created_by_role='AGENT' AND created_by_user_id = ?`,
      [id, userId]
    );
    if (!up.affectedRows) return res.status(404).json({ success: false, message: 'Product not found' });
    res.json({ success: true, message: 'Archived' });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message || 'Delete failed' });
  }
});

// Super admin shop products list (all owners) + create/edit/delete
router.get('/admin/shop-products', requireSuper, async (_req, res) => {
  try {
    const [rows] = await promisePool.query(
      `SELECT s.*, u.first_name, u.last_name
       FROM services s
       LEFT JOIN users u ON u.id = s.created_by_user_id
       WHERE s.deleted_at IS NULL AND s.is_shop_product = 1
       ORDER BY s.updated_at DESC`
    );
    res.json({ success: true, data: rows.map(decodeRow) });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message || 'Failed to list shop products' });
  }
});

// Public shop catalog by agent
router.get('/public/shop/products', async (req, res) => {
  try {
    const agentUserId = parseInt(req.query.agent_user_id, 10);
    if (!agentUserId) return res.status(400).json({ success: false, message: 'agent_user_id is required' });
    const [rows] = await promisePool.query(
      `SELECT s.id, s.service_code, s.name, s.description, s.short_tagline, s.icon_url, s.stock_quantity
       FROM services s
       WHERE s.deleted_at IS NULL
         AND s.is_shop_product = 1
         AND s.status = 'active'
         AND (
           (s.created_by_role='AGENT' AND s.created_by_user_id = ?)
           OR s.created_by_role='SUPER_ADMIN'
         )
       ORDER BY s.name ASC`,
      [agentUserId]
    );
    const ids = rows.map((r) => r.id);
    const prices = await attachPriceSummary(ids);
    const out = rows.map((r) => ({ ...r, price: prices[r.id]?.price_min ?? 0 }));
    res.json({ success: true, data: out });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message || 'Failed to load shop products' });
  }
});

// Public shop quote & checkout
router.post('/public/shop/quote', async (req, res) => {
  try {
    const items = Array.isArray(req.body?.items) ? req.body.items : [];
    const deliveryMode = String(req.body?.delivery_mode || 'AT_SCHOOL').toUpperCase();
    const homeFee = deliveryMode === 'AT_HOME' ? 2500 : 0;
    if (!items.length) return res.status(400).json({ success: false, message: 'No cart items.' });
    const ids = items.map((i) => parseInt(i.service_id, 10)).filter(Boolean);
    if (!ids.length) return res.status(400).json({ success: false, message: 'Invalid cart items.' });
    const [rows] = await promisePool.query(
      `SELECT id, name, stock_quantity
       FROM services
       WHERE id IN (?) AND deleted_at IS NULL AND is_shop_product = 1 AND status = 'active'`,
      [ids]
    );
    const map = new Map(rows.map((r) => [r.id, r]));
    const prices = await attachPriceSummary(ids);
    const lines = [];
    let subtotal = 0;
    for (const it of items) {
      const id = parseInt(it.service_id, 10);
      const qty = Math.max(1, parseInt(it.quantity, 10) || 1);
      const svc = map.get(id);
      if (!svc) continue;
      if (svc.stock_quantity != null && qty > Number(svc.stock_quantity)) {
        return res.status(400).json({ success: false, message: `${svc.name}: quantity exceeds stock` });
      }
      const unit = Number(prices[id]?.price_min || 0);
      const lineTotal = unit * qty;
      subtotal += lineTotal;
      lines.push({ service_id: id, service_name: svc.name, quantity: qty, unit_price: unit, line_total: lineTotal });
    }
    if (!lines.length) return res.status(400).json({ success: false, message: 'No valid items in cart.' });
    res.json({ success: true, data: { lines, subtotal, delivery_fee: homeFee, total: subtotal + homeFee, delivery_mode: deliveryMode } });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message || 'Quote failed' });
  }
});

router.post('/public/shop/checkout', async (req, res) => {
  const conn = await promisePool.getConnection();
  try {
    const b = req.body || {};
    const agentUserId = parseInt(b.agent_user_id, 10);
    const studentCode = String(b.student_code || '').trim();
    const buyerName = String(b.buyer_name || '').trim();
    const buyerContact = String(b.buyer_contact || '').trim();
    const deliveryMode = String(b.delivery_mode || '').toUpperCase();
    const deliveryAddress = String(b.delivery_address || '').trim();
    const items = Array.isArray(b.items) ? b.items : [];
    if (!agentUserId || !studentCode || !buyerName || !buyerContact || !items.length) {
      return res.status(400).json({ success: false, message: 'Missing required checkout fields.' });
    }
    const student = await findStudentRowByCode(studentCode);
    if (!student) return res.status(404).json({ success: false, message: 'Student not found.' });
    const ids = items.map((i) => parseInt(i.service_id, 10)).filter(Boolean);
    const [rows] = await promisePool.query(
      `SELECT id, name, stock_quantity
       FROM services WHERE id IN (?) AND deleted_at IS NULL AND is_shop_product = 1 AND status='active'`,
      [ids]
    );
    const map = new Map(rows.map((r) => [r.id, r]));
    const prices = await attachPriceSummary(ids);
    const lines = [];
    let subtotal = 0;
    for (const it of items) {
      const id = parseInt(it.service_id, 10);
      const qty = Math.max(1, parseInt(it.quantity, 10) || 1);
      const svc = map.get(id);
      if (!svc) continue;
      if (svc.stock_quantity != null && qty > Number(svc.stock_quantity)) {
        return res.status(400).json({ success: false, message: `${svc.name}: quantity exceeds stock` });
      }
      const unit = Number(prices[id]?.price_min || 0);
      const lineTotal = unit * qty;
      subtotal += lineTotal;
      lines.push({ service_id: id, service_name: svc.name, quantity: qty, unit_price: unit, line_total: lineTotal });
    }
    const deliveryFee = deliveryMode === 'AT_HOME' ? 2500 : 0;
    const total = subtotal + deliveryFee;
    const batchRef = `SHOP-${Date.now()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
    await conn.beginTransaction();
    for (let i = 0; i < lines.length; i += 1) {
      const ln = lines[i];
      const rowAmount = ln.line_total + (i === 0 ? deliveryFee : 0);
      const orderNo = `SHP-${new Date().getFullYear()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
      await conn.query(
        `INSERT INTO service_orders (
          order_number, service_id, student_id, school_id, academic_year, amount, unit_amount, quantity, currency,
          payment_status, order_status, batch_ref, delivery_mode, delivery_address, buyer_name, buyer_contact, agent_user_id, source_channel
        ) VALUES (?,?,?,?,?,?,?,?, 'FRW', 'awaiting_payment', 'awaiting_payment',?,?,?,?,?,?, 'PUBLIC_SHOP')`,
        [
          orderNo,
          ln.service_id,
          student.id,
          student.school_id,
          student.academic_year || '',
          rowAmount,
          ln.unit_price,
          ln.quantity,
          batchRef,
          deliveryMode || 'AT_SCHOOL',
          deliveryAddress || null,
          buyerName,
          buyerContact,
          agentUserId,
        ]
      );
    }
    await conn.commit();
    res.status(201).json({
      success: true,
      data: {
        batch_ref: batchRef,
        student: {
          id: student.id,
          student_code: student.student_code,
          student_uid: student.student_uid,
          first_name: student.first_name,
          last_name: student.last_name,
          class_name: student.class_name,
          school_id: student.school_id,
          school_name: student.school_name,
        },
        lines,
        subtotal,
        delivery_fee: deliveryFee,
        total,
      },
    });
  } catch (e) {
    await conn.rollback();
    res.status(500).json({ success: false, message: e.message || 'Checkout failed' });
  } finally {
    conn.release();
  }
});

router.post('/public/shop/pay-momo', async (req, res) => {
  try {
    const batchRef = String(req.body?.batch_ref || '').trim();
    const payerPhone = String(req.body?.payer_phone || '').trim();
    if (!batchRef || !payerPhone) return res.status(400).json({ success: false, message: 'batch_ref and payer_phone are required' });
    if (!mtnMomo || !mtnMomo.mtnMomoEnabled || !mtnMomo.mtnMomoEnabled()) {
      return res.status(503).json({ success: false, message: 'Mobile Money collection is not available right now.' });
    }
    const msisdn = toMsisdn250(payerPhone);
    if (!msisdn) return res.status(400).json({ success: false, message: 'Invalid Rwanda MTN number.' });
    const [orders] = await promisePool.query(
      `SELECT * FROM service_orders WHERE batch_ref = ? AND payment_status IN ('pending','awaiting_payment')`,
      [batchRef]
    );
    if (!orders.length) return res.status(404).json({ success: false, message: 'No pending shop order found.' });
    const total = Math.round(orders.reduce((s, o) => s + Number(o.amount || 0), 0));
    const externalId = `shop-${batchRef}`.slice(0, 64);
    const mtn = await mtnMomo.requestToPay({
      amount: total,
      currency: 'RWF',
      externalId,
      msisdn250: msisdn,
      payerMessage: 'Babyeyi Agent Shop',
      payeeNote: `Batch ${batchRef}`,
    });
    const mtnBody = mtn.responseBody && typeof mtn.responseBody === 'object' ? mtn.responseBody : null;
    const statusUpper = mtnBody ? mtnMomo.mapMtnStatusToUpper(mtnBody.status) : 'PENDING';
    await promisePool.query(
      `INSERT INTO service_payments (order_id, payment_ref, payment_method, amount_paid, transaction_fee, total_amount, payment_date, payment_status, provider_response)
       VALUES (?, ?, 'mtn_momo', ?, 0, ?, NOW(), ?, ?)`,
      [orders[0].id, externalId, total, total, statusUpper === 'SUCCESSFUL' ? 'paid' : 'pending', JSON.stringify({ mtn: mtnBody, batch_ref: batchRef })]
    );
    if (statusUpper === 'SUCCESSFUL') {
      await promisePool.query(
        `UPDATE service_orders
         SET payment_status='paid', order_status='paid', updated_at=NOW()
         WHERE batch_ref = ?`,
        [batchRef]
      );
    }
    res.json({ success: true, data: { batch_ref: batchRef, amount_rwf: total, mtn_status: statusUpper } });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message || 'Payment failed' });
  }
});

router.get('/public/shop/pay-status/:batchRef', async (req, res) => {
  try {
    const batchRef = String(req.params.batchRef || '').trim();
    if (!batchRef) return res.status(400).json({ success: false, message: 'batchRef is required' });
    const paymentRef = `shop-${batchRef}`.slice(0, 64);
    const [rows] = await promisePool.query(
      `SELECT id, payment_status, provider_response, created_at
       FROM service_payments
       WHERE payment_ref = ?
       ORDER BY id DESC
       LIMIT 1`,
      [paymentRef]
    );
    const row = rows[0];
    if (!row) return res.status(404).json({ success: false, message: 'Payment not found' });
    let provider = {};
    try {
      provider = row.provider_response ? JSON.parse(row.provider_response) : {};
    } catch {
      provider = {};
    }
    const mtnStatus = provider?.mtn?.status ? String(provider.mtn.status).toUpperCase() : '';
    const mapped = mtnStatus
      ? (mtnMomo && typeof mtnMomo.mapMtnStatusToUpper === 'function' ? mtnMomo.mapMtnStatusToUpper(mtnStatus) : mtnStatus)
      : (String(row.payment_status || '').toUpperCase() === 'PAID' ? 'SUCCESSFUL' : 'PENDING');
    if (mapped === 'SUCCESSFUL') {
      await promisePool.query(
        `UPDATE service_orders
         SET payment_status='paid', order_status='paid', updated_at=NOW()
         WHERE batch_ref = ?`,
        [batchRef]
      );
    }
    return res.json({ success: true, data: { status: mapped } });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message || 'Status check failed' });
  }
});

router.get('/agent/shop-orders', requireAgent, async (req, res) => {
  try {
    const userId = resolveUserId(req);
    const status = String(req.query.status || '').trim().toLowerCase();
    const deliveryMode = String(req.query.delivery_mode || '').trim().toUpperCase();
    const from = String(req.query.date_from || '').trim();
    const to = String(req.query.date_to || '').trim();
    const search = String(req.query.search || '').trim();
    let sql = `
      SELECT o.*, s.name AS product_name, st.first_name, st.last_name, st.student_code, sc.school_name
      FROM service_orders o
      LEFT JOIN services s ON s.id = o.service_id
      LEFT JOIN students st ON st.id = o.student_id
      LEFT JOIN schools sc ON sc.id = o.school_id
      WHERE o.agent_user_id = ? AND o.source_channel LIKE 'PUBLIC_SHOP%'`;
    const params = [userId];
    if (status) { sql += ' AND o.payment_status = ?'; params.push(status); }
    if (deliveryMode) { sql += ' AND o.delivery_mode = ?'; params.push(deliveryMode); }
    if (from) { sql += ' AND DATE(o.created_at) >= ?'; params.push(from); }
    if (to) { sql += ' AND DATE(o.created_at) <= ?'; params.push(to); }
    if (search) {
      sql += ' AND (o.batch_ref LIKE ? OR o.buyer_name LIKE ? OR o.buyer_contact LIKE ? OR st.student_code LIKE ? OR s.name LIKE ?)';
      const like = `%${search}%`;
      params.push(like, like, like, like, like);
    }
    sql += ' ORDER BY o.created_at DESC LIMIT 800';
    const [rows] = await promisePool.query(sql, params);
    res.json({ success: true, data: rows });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message || 'Failed to load shop orders' });
  }
});

router.patch('/admin/services/:id/status', requireSuper, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { status } = req.body || {};
    if (!['draft', 'active', 'inactive', 'archived'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }
    await promisePool.query(`UPDATE services SET status = ? WHERE id = ?`, [status, id]);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

router.delete('/admin/services/:id', requireSuper, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!id) return res.status(400).json({ success: false, message: 'Invalid id' });
    const [up] = await promisePool.query(
      `UPDATE services SET status = 'archived', deleted_at = NOW() WHERE id = ? AND deleted_at IS NULL`,
      [id]
    );
    if (!up.affectedRows) {
      return res.status(404).json({ success: false, message: 'Service not found or already removed' });
    }
    res.json({ success: true, message: 'Removed' });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

const SHOES_SERVICE_WHERE = `(LOWER(s.name) LIKE '%shoe%' OR LOWER(s.service_code) LIKE '%shoe%' OR JSON_LENGTH(s.available_sizes) > 0)`;

async function queryShoesOrdersExportRows(search) {
  let sql = `
      SELECT o.order_number, s.name AS service_name, st.student_code,
             CONCAT(COALESCE(st.first_name,''),' ',COALESCE(st.last_name,'')) AS student_name,
             sc.school_name, o.amount, o.payment_status, o.fulfillment_status, o.buyer_name, o.buyer_contact, o.created_at
      FROM service_orders o
      INNER JOIN services s ON s.id = o.service_id
      LEFT JOIN students st ON st.id = o.student_id
      LEFT JOIN schools sc ON sc.id = o.school_id
      WHERE ${SHOES_SERVICE_WHERE}
    `;
  const params = [];
  if (String(search || '').trim()) {
    const like = `%${String(search).trim()}%`;
    sql += ` AND (o.order_number LIKE ? OR o.buyer_name LIKE ? OR o.buyer_contact LIKE ? OR st.student_code LIKE ? OR sc.school_name LIKE ?)`;
    params.push(like, like, like, like, like);
  }
  sql += ` ORDER BY o.created_at DESC`;
  const [rows] = await promisePool.query(sql, params);
  return rows;
}

router.get('/admin/shoes/agents', requireSuper, async (req, res) => {
  try {
    const [rows] = await promisePool.query(
      `SELECT u.id, u.first_name, u.last_name, u.email, u.phone
       FROM users u
       INNER JOIN roles r ON r.id = u.role_id AND UPPER(TRIM(r.role_code)) = 'AGENT'
       WHERE u.deleted_at IS NULL AND (u.is_active IS NULL OR u.is_active = 1)
       ORDER BY u.last_name ASC, u.first_name ASC, u.id ASC`
    );
    const data = rows.map((u) => {
      const name = `${u.first_name || ''} ${u.last_name || ''}`.trim() || `User #${u.id}`;
      return {
        id: u.id,
        first_name: u.first_name,
        last_name: u.last_name,
        email: u.email,
        phone: u.phone,
        label: `${name} (#${u.id})${u.email ? ` · ${u.email}` : ''}`,
      };
    });
    res.json({ success: true, data });
  } catch (e) {
    console.error('[student-services] admin/shoes/agents', e);
    res.status(500).json({ success: false, message: e.message || 'Failed to load agents' });
  }
});

router.get('/admin/shoes/orders', requireSuper, async (req, res) => {
  try {
    const paymentStatus = String(req.query.payment_status || '').trim().toLowerCase();
    const fulfillmentStatus = String(req.query.fulfillment_status || '').trim();
    const search = String(req.query.search || '').trim();
    let sql = `
      SELECT o.id, o.order_number, o.amount, o.currency, o.payment_status, o.order_status, o.fulfillment_status,
             o.delivery_mode, o.delivery_address, o.buyer_name, o.buyer_contact, o.agent_user_id, o.created_at,
             s.id AS service_id, s.name AS service_name, s.service_code,
             st.student_code, st.first_name, st.last_name, st.class_name,
             sc.school_name
      FROM service_orders o
      INNER JOIN services s ON s.id = o.service_id
      LEFT JOIN students st ON st.id = o.student_id
      LEFT JOIN schools sc ON sc.id = o.school_id
      WHERE ${SHOES_SERVICE_WHERE}
    `;
    const params = [];
    if (paymentStatus) {
      sql += ` AND o.payment_status = ?`;
      params.push(paymentStatus);
    }
    if (fulfillmentStatus) {
      sql += ` AND o.fulfillment_status = ?`;
      params.push(fulfillmentStatus);
    }
    if (search) {
      const like = `%${search}%`;
      sql += ` AND (o.order_number LIKE ? OR o.buyer_name LIKE ? OR o.buyer_contact LIKE ? OR st.student_code LIKE ? OR sc.school_name LIKE ?)`;
      params.push(like, like, like, like, like);
    }
    sql += ` ORDER BY o.created_at DESC LIMIT 1200`;
    const [rows] = await promisePool.query(sql, params);
    res.json({ success: true, data: rows });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message || 'Failed to load shoes orders' });
  }
});

router.patch('/admin/shoes/orders/:id/status', requireSuper, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const fulfillmentStatus = String(req.body?.fulfillment_status || '').trim();
    const agentUserId = req.body?.agent_user_id != null ? parseInt(req.body.agent_user_id, 10) : null;
    const allowed = ['Pending', 'Paid', 'Approved', 'Processing', 'Ready for delivery', 'Delivered', 'Completed', 'Rejected'];
    if (!allowed.includes(fulfillmentStatus)) {
      return res.status(400).json({ success: false, message: 'Invalid fulfillment_status' });
    }
    await promisePool.query(
      `UPDATE service_orders SET fulfillment_status = ?, agent_user_id = COALESCE(?, agent_user_id), updated_at = NOW() WHERE id = ?`,
      [fulfillmentStatus, Number.isFinite(agentUserId) ? agentUserId : null, id]
    );
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message || 'Failed to update order status' });
  }
});

router.get('/admin/shoes/orders/export', requireSuper, async (req, res) => {
  try {
    const format = String(req.query.format || 'csv').toLowerCase().trim();
    const search = String(req.query.search || '').trim();
    const rows = await queryShoesOrdersExportRows(search);
    const header = ['Order Number', 'Service', 'Student Code', 'Student Name', 'School', 'Amount', 'Payment Status', 'Fulfillment Status', 'Buyer Name', 'Buyer Contact', 'Created At'];
    const rowArr = (r) => [
      r.order_number,
      r.service_name,
      r.student_code,
      r.student_name,
      r.school_name,
      r.amount,
      r.payment_status,
      r.fulfillment_status,
      r.buyer_name,
      r.buyer_contact,
      r.created_at,
    ];

    if (format === 'xlsx') {
      const wb = xlsx.utils.book_new();
      const aoa = [header, ...rows.map(rowArr)];
      const ws = xlsx.utils.aoa_to_sheet(aoa);
      xlsx.utils.book_append_sheet(wb, ws, 'Shoes orders');
      const buffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="shoes-voucher-orders-${Date.now()}.xlsx"`);
      return res.send(buffer);
    }

    if (format === 'pdf') {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="shoes-voucher-orders-${Date.now()}.pdf"`);
      const doc = new PDFDocument({ margin: 28, size: 'A4', layout: 'landscape' });
      doc.pipe(res);
      doc.fontSize(13).fillColor('#111').text('Shoes voucher orders', { align: 'left' });
      doc.moveDown(0.25);
      doc.fontSize(8).fillColor('#444').text(`Generated: ${new Date().toLocaleString()}${search ? ` · Search: ${search}` : ''}`);
      doc.moveDown(0.5);
      if (!rows.length) {
        doc.fontSize(11).text('No orders in this filter.');
        doc.end();
        return;
      }
      const pdfHeader = ['Order', 'Service', 'Student', 'School', 'Amount', 'Pay', 'Fulfillment', 'Created'];
      const pdfRow = (r) => [
        r.order_number,
        r.service_name,
        `${r.student_code || ''} ${r.student_name || ''}`.trim(),
        r.school_name,
        r.amount,
        r.payment_status,
        r.fulfillment_status,
        r.created_at,
      ];
      const lineH = 10;
      let y = doc.y;
      const left = 28;
      const colW = [78, 108, 118, 100, 52, 48, 88, 118];
      doc.fontSize(6.5).fillColor('#333').font('Helvetica-Bold');
      let x = left;
      pdfHeader.forEach((lab, i) => {
        doc.text(String(lab), x, y, { width: colW[i] });
        x += colW[i];
      });
      y += lineH + 3;
      doc.font('Helvetica').fillColor('#000').fontSize(6);
      rows.forEach((r) => {
        if (y > 530) {
          doc.addPage();
          y = 28;
        }
        const cells = pdfRow(r).map((c) => String(c ?? ''));
        x = left;
        cells.forEach((cell, i) => {
          doc.text(cell.slice(0, 48), x, y, { width: colW[i] });
          x += colW[i];
        });
        y += lineH;
      });
      doc.end();
      return;
    }

    const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const csv = [header.map(esc).join(','), ...rows.map((r) => rowArr(r).map(esc).join(','))].join('\n');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="shoes-voucher-orders-${Date.now()}.csv"`);
    return res.send(csv);
  } catch (e) {
    console.error('[student-services] shoes export', e);
    res.status(500).json({ success: false, message: e.message || 'Failed to export' });
  }
});

// ═══════════════════════════════════════════════════════════════
// Public: student lookup + price quote (same code resolution as parent portal)
// ═══════════════════════════════════════════════════════════════

async function findStudentRowByCode(raw) {
  const code = String(raw || '').trim();
  if (!code || code.length < 2) return null;
  const upper = code.toUpperCase();
  const [rows] = await promisePool.query(
    `SELECT s.id, s.school_id, s.student_uid, s.student_code, s.sdm_code,
            s.first_name, s.last_name, s.class_name, s.academic_year,
            sc.school_name, sc.school_code
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

/**
 * Map class_name → canonical level (must match Super Admin "By level" labels):
 * Nursery (N1–N3), Pre-primary (P1–P3), Upper-Primary (P4–P6), O-Level (S1–S3), A-Level (S4–S6).
 */
function normalizeClassToken(raw) {
  let s = String(raw || '')
    .trim()
    .replace(/[\uFEFF\u200B-\u200D\u2060]/g, '');
  try {
    s = s.normalize('NFKC');
  } catch (_) {}
  return s
    .replace(/[–—−‐]/g, '-')
    .replace(/\s+/g, ' ')
    .trim();
}

function inferLevelFromClass(className) {
  const raw = normalizeClassToken(className);
  if (!raw) return null;
  const c = raw.toUpperCase();

  if (/\bNURSERY\b|\bNURS\b/.test(c) && !/\bP\s*[1-6]\b/.test(c)) return 'Nursery';
  if (/\bN\s*[123]\b|\bN[123]\b/.test(c)) return 'Nursery';

  const pLoose = c.match(/\bP\s*[\.\-]?\s*([1-6])\b/) || c.match(/^P\s*[\.\-]?\s*([1-6])$/);
  if (pLoose) {
    const n = parseInt(pLoose[1], 10);
    if (n >= 1 && n <= 3) return 'Pre-primary';
    if (n >= 4 && n <= 6) return 'Upper-Primary';
  }
  const pPrimary = c.match(/\bPRIMARY\s+([1-6])\b/);
  if (pPrimary) {
    const n = parseInt(pPrimary[1], 10);
    if (n >= 1 && n <= 3) return 'Pre-primary';
    if (n >= 4 && n <= 6) return 'Upper-Primary';
  }
  const pry = c.match(/\bPRY\s*[\.\-]?\s*([1-6])\b/);
  if (pry) {
    const n = parseInt(pry[1], 10);
    if (n >= 1 && n <= 3) return 'Pre-primary';
    if (n >= 4 && n <= 6) return 'Upper-Primary';
  }

  const sDigit = c.match(/\bS\s*[\.\-]?\s*([1-6])\b/) || c.match(/^S\s*[\.\-]?\s*([1-6])$/);
  if (sDigit) {
    const n = parseInt(sDigit[1], 10);
    if (n >= 1 && n <= 3) return 'O-Level';
    if (n >= 4 && n <= 6) return 'A-Level';
  }
  if (/O[\s'-]*LEVEL/.test(c)) return 'O-Level';
  if (/A[\s'-]*LEVEL/.test(c)) return 'A-Level';

  return null;
}

function normLevel(s) {
  return String(s || '')
    .trim()
    .toLowerCase()
    .replace(/['']/g, '')
    .replace(/[–—−‐]/g, '-')
    .replace(/\s+/g, ' ')
    .trim();
}

/** DB level labels → canonical bands (handles legacy Super Admin names). */
function canonicalLevelBandKey(s) {
  const n = normLevel(s);
  if (!n) return '';
  if (n === 'nursery' || n === 'nursary') return 'nursery';
  if (n === 'pre-primary' || n === 'preprimary' || n === 'primary-1-3') return 'pre-primary';
  if (n === 'upper-primary' || n === 'upperprimary' || n === 'primary-4-6') return 'upper-primary';
  if (n === 'primary') return 'primary';
  if (n === 'o-level' || n === 'olevel' || n === "o'level") return 'o-level';
  if (n === 'a-level' || n === 'alevel' || n === "a'level") return 'a-level';
  return n;
}

function inferredLevelMatchesRow(inferred, dbLevel) {
  const want = canonicalLevelBandKey(inferred);
  const rl = canonicalLevelBandKey(dbLevel);
  if (want && rl && want === rl) return true;
  /** Legacy: one "Primary" row covered all P1–P6 before Pre-primary / Upper-Primary split */
  if (rl === 'primary' && (want === 'pre-primary' || want === 'upper-primary')) return true;
  const a = normLevel(inferred).replace(/-/g, '');
  const b = normLevel(dbLevel).replace(/-/g, '');
  return a === b && a.length > 0;
}

function isActivePriceRow(r) {
  return r && (r.is_active === 1 || r.is_active === true || String(r.is_active) === '1');
}

function pricingTypeIs(r, t) {
  return String(r.pricing_type || '').toLowerCase() === t;
}

function normalizeServicePricingType(t) {
  return String(t || '')
    .trim()
    .toLowerCase()
    .replace(/-/g, '_')
    .replace(/\s+/g, '_');
}

function pickPriceRow(rows, { schoolId, academicYear, inferredLevel, serviceDefaultType, serviceYear }) {
  const svcType = normalizeServicePricingType(serviceDefaultType);

  const yearMatch = (r) => {
    if (!r.academic_year) return true;
    const ry = String(r.academic_year).trim();
    const sy = String(academicYear || '').trim();
    const sv = String(serviceYear || '').trim();
    return ry === sy || ry === sv;
  };

  const allActive = (rows || []).filter((r) => isActivePriceRow(r));
  const active = allActive.filter((r) => yearMatch(r));

  if (svcType === 'global') {
    const glob = active.find((r) => pricingTypeIs(r, 'global'));
    if (glob) return { row: glob, rule: 'global' };
    return { row: null, rule: null };
  }

  if (svcType === 'by_school') {
    const sch = active.find(
      (r) => pricingTypeIs(r, 'school') && Number(r.school_id) === Number(schoolId)
    );
    if (sch) return { row: sch, rule: 'school' };
  }
  if (svcType === 'by_level' && inferredLevel) {
    const findLevel = (pool) =>
      pool.find((r) => pricingTypeIs(r, 'level') && inferredLevelMatchesRow(inferredLevel, r.level));
    let lvl = findLevel(active);
    if (!lvl) {
      lvl = findLevel(allActive);
      if (lvl) return { row: lvl, rule: 'level_year_relaxed' };
    } else {
      return { row: lvl, rule: 'level' };
    }
  }
  const glob = active.find((r) => pricingTypeIs(r, 'global'));
  if (glob) return { row: glob, rule: 'global' };

  if (svcType === 'by_school') {
    const glob2 = allActive.find((r) => pricingTypeIs(r, 'global'));
    if (glob2) return { row: glob2, rule: 'global_fallback' };
  }
  return { row: null, rule: null };
}

function resolveAmountFromQuote(service, priceRows, student) {
  const inferred = inferLevelFromClass(student.class_name);
  const { row, rule } = pickPriceRow(priceRows, {
    schoolId: student.school_id,
    academicYear: student.academic_year,
    inferredLevel: inferred,
    serviceDefaultType: service.default_pricing_type,
    serviceYear: service.academic_year,
  });
  if (!row) {
    const dpt = normalizeServicePricingType(service.default_pricing_type);
    let message =
      'No price configured for this student. Ask the school or Super Admin to set pricing.';
    if (dpt === 'by_level' && !inferred) {
      message =
        'Could not read this student\'s class level from the class field. Use a standard class like P2, N1, or S3 (or ask the school to correct the student record), then try again.';
    } else if (dpt === 'by_level' && inferred) {
      message = `No price row matches level "${inferred}". In Super Admin (Voucher Services), add level pricing for that band or check the academic year on the price rows.`;
    }
    return {
      amount: null,
      currency: 'FRW',
      inferred_level: inferred,
      pricing_rule: null,
      message,
    };
  }
  return {
    amount: Number(row.amount),
    currency: row.currency || 'FRW',
    inferred_level: inferred,
    pricing_rule: rule,
    price_row_id: row.id,
  };
}

/**
 * POST /public/quote
 * body: { service_id | service_code, student_code }
 */
router.post('/public/quote', async (req, res) => {
  try {
    const body = req.body || {};
    const codeRaw = body.student_code ?? body.code ?? '';
    const sid = body.service_id != null ? parseInt(body.service_id, 10) : null;
    const sCode = body.service_code != null ? String(body.service_code).trim() : '';

    if (!String(codeRaw).trim()) {
      return res.status(400).json({ success: false, message: 'student_code is required' });
    }

    const student = await findStudentRowByCode(codeRaw);
    if (!student) {
      return res.json({ success: false, notFound: true, message: 'Student not found. Check the code or SDM ID.' });
    }

    let service;
    if (sid) {
      const [sr] = await promisePool.query(
        `SELECT * FROM services WHERE id = ? AND status = 'active' AND deleted_at IS NULL LIMIT 1`,
        [sid]
      );
      service = sr[0];
    } else if (sCode) {
      const [sr] = await promisePool.query(
        `SELECT * FROM services WHERE service_code = ? AND status = 'active' AND deleted_at IS NULL LIMIT 1`,
        [sCode]
      );
      service = sr[0];
    } else {
      return res.status(400).json({ success: false, message: 'service_id or service_code is required' });
    }
    if (!service) {
      return res.status(404).json({ success: false, message: 'Service not found or inactive' });
    }

    const [priceRows] = await promisePool.query(
      `SELECT * FROM service_prices WHERE service_id = ? AND is_active = 1`,
      [service.id]
    );

    const quote = resolveAmountFromQuote(service, priceRows, student);
    if (quote.amount == null || Number.isNaN(quote.amount)) {
      return res.json({
        success: false,
        message: quote.message || 'Could not determine price',
        data: {
          service: decodeRow({ ...service }),
          student: {
            id: student.id,
            first_name: student.first_name,
            last_name: student.last_name,
            class_name: student.class_name,
            school_name: student.school_name,
            school_code: student.school_code,
          },
          inferred_level: quote.inferred_level,
        },
      });
    }

    return res.json({
      success: true,
      data: {
        service: decodeRow({ ...service }),
        student: {
          id: student.id,
          first_name: student.first_name,
          last_name: student.last_name,
          class_name: student.class_name,
          academic_year: student.academic_year,
          school_id: student.school_id,
          school_name: student.school_name,
          school_code: student.school_code,
          student_code: student.student_code,
          student_uid: student.student_uid,
        },
        amount: quote.amount,
        currency: quote.currency,
        inferred_level: quote.inferred_level,
        pricing_rule: quote.pricing_rule,
        price_row_id: quote.price_row_id,
      },
    });
  } catch (e) {
    console.error('[student-services/public/quote]', e);
    res.status(500).json({ success: false, message: e.message || 'Quote failed' });
  }
});

/**
 * POST /public/pay-momo — create order + MTN MoMo request (re-quote server-side)
 */
router.post('/public/pay-momo', async (req, res) => {
  try {
    if (!mtnMomo || !mtnMomo.mtnMomoEnabled || !mtnMomo.mtnMomoEnabled()) {
      return res.status(503).json({ success: false, message: 'Mobile Money collection is not available right now.' });
    }
    const body = req.body || {};
    const codeRaw = body.student_code ?? body.code ?? '';
    const serviceId = parseInt(body.service_id, 10);
    const payerName = String(body.payer_name || '').trim();
    const payerPhone = String(body.payer_phone || '').trim();
    if (!serviceId || !String(codeRaw).trim()) {
      return res.status(400).json({ success: false, message: 'service_id and student_code are required' });
    }
    if (!payerName || !payerPhone) {
      return res.status(400).json({ success: false, message: 'Payer name and phone are required' });
    }
    const msisdn = toMsisdn250(payerPhone);
    if (!msisdn) {
      return res.status(400).json({ success: false, message: 'Enter a valid Rwanda MTN number (e.g. 078…).' });
    }

    const student = await findStudentRowByCode(codeRaw);
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    const [[service]] = await promisePool.query(
      `SELECT * FROM services WHERE id = ? AND status = 'active' AND deleted_at IS NULL LIMIT 1`,
      [serviceId]
    );
    if (!service) {
      return res.status(404).json({ success: false, message: 'Service not found' });
    }

    const [priceRows] = await promisePool.query(
      `SELECT * FROM service_prices WHERE service_id = ? AND is_active = 1`,
      [serviceId]
    );
    const quote = resolveAmountFromQuote(service, priceRows, student);
    const amount = Math.round(Number(quote.amount));
    if (!amount || amount < 1 || Number.isNaN(amount)) {
      return res.status(400).json({ success: false, message: quote.message || 'Invalid amount' });
    }

    const orderNo = `SVC-${new Date().getFullYear()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
    const conn = await promisePool.getConnection();
    let orderId;
    try {
      await conn.beginTransaction();
      const [ins] = await conn.query(
        `INSERT INTO service_orders (
          order_number, service_id, student_id, school_id, academic_year,
          amount, currency, payment_status, order_status
        ) VALUES (?,?,?,?,?,?, 'FRW', 'awaiting_payment', 'awaiting_payment')`,
        [
          orderNo,
          serviceId,
          student.id,
          student.school_id,
          service.academic_year || student.academic_year || '',
          amount,
        ]
      );
      orderId = ins.insertId;
      await conn.commit();
    } catch (e) {
      await conn.rollback();
      throw e;
    } finally {
      conn.release();
    }

    const externalId = `svc-${orderId}-${Date.now()}`.slice(0, 64);
    let mtnBody = null;
    try {
      const mtn = await mtnMomo.requestToPay({
        amount,
        currency: 'RWF',
        externalId,
        msisdn250: msisdn,
        payerMessage: String(service.name || 'Babyeyi service').slice(0, 80),
        payeeNote: payerName ? `Payer: ${payerName.slice(0, 80)}` : 'Babyeyi student service',
      });
      mtnBody = mtn.responseBody && typeof mtn.responseBody === 'object' ? mtn.responseBody : null;
    } catch (e) {
      console.error('[student-services/pay-momo]', e);
      return res.status(502).json({
        success: false,
        message: e.message || 'MoMo request failed',
        order_id: orderId,
        order_number: orderNo,
      });
    }

    const statusUpper = mtnBody ? mtnMomo.mapMtnStatusToUpper(mtnBody.status) : 'PENDING';

    await promisePool.query(
      `INSERT INTO service_payments (
        order_id, payment_ref, payment_method, amount_paid, transaction_fee, total_amount,
        payment_date, payment_status, provider_response
      ) VALUES (?,?,?,?,?,?,NOW(),?,?)`,
      [
        orderId,
        externalId,
        'mtn_momo',
        amount,
        0,
        amount,
        statusUpper === 'SUCCESSFUL' ? 'paid' : 'pending',
        JSON.stringify({ mtn: mtnBody, payer_name: payerName, payer_phone: payerPhone }),
      ]
    );

    if (statusUpper === 'SUCCESSFUL') {
      await promisePool.query(
        `UPDATE service_orders SET payment_status = 'paid', order_status = 'paid', updated_at = NOW() WHERE id = ?`,
        [orderId]
      );
    }

    return res.json({
      success: true,
      data: {
        order_id: orderId,
        order_number: orderNo,
        amount_rwf: amount,
        mtn_status: statusUpper,
        message:
          statusUpper === 'SUCCESSFUL'
            ? 'Payment successful.'
            : 'Request sent to your phone. Approve the MTN MoMo prompt to complete payment.',
      },
    });
  } catch (e) {
    console.error('[student-services/public/pay-momo]', e);
    res.status(500).json({ success: false, message: e.message || 'Payment failed' });
  }
});

module.exports = router;
