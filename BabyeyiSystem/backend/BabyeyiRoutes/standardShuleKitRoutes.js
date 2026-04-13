'use strict';

/**
 * Standard ShuleKit — pre-defined grade kits (Super Admin CRUD + public read).
 */

const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { promisePool } = require('../config/database');
let mtnMomo = null;
try {
  mtnMomo = require('./mtnMomoCollection');
} catch (_) {
  mtnMomo = null;
}

const router = express.Router();

const GRADE_LEVELS = ['Nursery', 'Pre-primary', 'Upper-Primary', 'O-Level', 'A-Level'];

const UPLOAD_REL = 'uploads/standard-shule-kits';
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

function resolveUserId(req) {
  return req.session?.userId || req.session?.user?.id || req.user?.id || null;
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

async function migrateRequirementColumns() {
  const [[dbRow]] = await promisePool.query('SELECT DATABASE() AS n');
  const dbName = dbRow?.n;
  if (!dbName) return;
  const [cols] = await promisePool.query(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'standard_shule_kit_requirements'`,
    [dbName]
  );
  const names = new Set((cols || []).map((c) => c.COLUMN_NAME));
  if (!names.has('quantity')) {
    await promisePool.query(
      `ALTER TABLE standard_shule_kit_requirements
       ADD COLUMN quantity INT UNSIGNED NOT NULL DEFAULT 1 AFTER amount_frw`
    );
  }
  if (!names.has('image_url')) {
    await promisePool.query(
      `ALTER TABLE standard_shule_kit_requirements
       ADD COLUMN image_url VARCHAR(512) NULL AFTER quantity`
    );
  }
}

async function ensureTables() {
  if (tablesReady) return;
  if (!ensureLock) {
    ensureLock = (async () => {
      await promisePool.query(`
        CREATE TABLE IF NOT EXISTS standard_shule_kits (
          id INT UNSIGNED NOT NULL AUTO_INCREMENT,
          grade_level VARCHAR(64) NOT NULL,
          description TEXT NULL,
          image_url VARCHAR(512) NULL,
          status ENUM('draft','active','inactive') NOT NULL DEFAULT 'draft',
          sort_order INT NOT NULL DEFAULT 0,
          created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          PRIMARY KEY (id),
          UNIQUE KEY uq_ssk_grade (grade_level),
          KEY idx_ssk_status (status),
          KEY idx_ssk_sort (sort_order)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);

      await promisePool.query(`
        CREATE TABLE IF NOT EXISTS standard_shule_kit_requirements (
          id INT UNSIGNED NOT NULL AUTO_INCREMENT,
          kit_id INT UNSIGNED NOT NULL,
          title VARCHAR(500) NOT NULL,
          amount_frw DECIMAL(12,2) NOT NULL DEFAULT 0,
          quantity INT UNSIGNED NOT NULL DEFAULT 1,
          image_url VARCHAR(512) NULL,
          sort_order INT NOT NULL DEFAULT 0,
          created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (id),
          KEY idx_sskr_kit (kit_id),
          CONSTRAINT fk_sskr_kit FOREIGN KEY (kit_id) REFERENCES standard_shule_kits(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);

      await promisePool.query(`
        CREATE TABLE IF NOT EXISTS standard_shule_kit_requests (
          id INT UNSIGNED NOT NULL AUTO_INCREMENT,
          request_no VARCHAR(40) NOT NULL,
          kit_id INT UNSIGNED NOT NULL,
          student_id INT UNSIGNED NOT NULL,
          school_id INT UNSIGNED NOT NULL,
          agent_user_id INT UNSIGNED NULL,
          requester_name VARCHAR(160) NOT NULL,
          requester_contact VARCHAR(120) NOT NULL,
          delivery_option ENUM('AT_SCHOOL','AT_HOME') NOT NULL DEFAULT 'AT_SCHOOL',
          delivery_address VARCHAR(500) NULL,
          province VARCHAR(120) NULL,
          district VARCHAR(120) NULL,
          sector VARCHAR(120) NULL,
          total_frw DECIMAL(12,2) NOT NULL DEFAULT 0,
          payment_status ENUM('awaiting_payment','paid','failed') NOT NULL DEFAULT 'awaiting_payment',
          status ENUM('submitted','paid','processing','completed','cancelled') NOT NULL DEFAULT 'submitted',
          created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          PRIMARY KEY (id),
          UNIQUE KEY uq_sskr_request_no (request_no),
          KEY idx_sskr_agent (agent_user_id),
          KEY idx_sskr_school (school_id),
          KEY idx_sskr_status (status, payment_status),
          CONSTRAINT fk_sskr_req_kit FOREIGN KEY (kit_id) REFERENCES standard_shule_kits(id) ON DELETE RESTRICT
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);

      await promisePool.query(`
        CREATE TABLE IF NOT EXISTS standard_shule_kit_request_payments (
          id INT UNSIGNED NOT NULL AUTO_INCREMENT,
          request_id INT UNSIGNED NOT NULL,
          payment_ref VARCHAR(128) NULL,
          payment_method VARCHAR(64) NULL,
          amount_paid DECIMAL(12,2) NOT NULL DEFAULT 0,
          payment_status ENUM('pending','paid','failed') NOT NULL DEFAULT 'pending',
          provider_response LONGTEXT NULL,
          created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          PRIMARY KEY (id),
          KEY idx_sskrp_request (request_id),
          CONSTRAINT fk_sskrp_request FOREIGN KEY (request_id) REFERENCES standard_shule_kit_requests(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);

      await migrateRequirementColumns();

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
    console.error('[standard-shule-kits] ensureTables:', e);
    res.status(500).json({ success: false, message: 'Database setup failed for standard ShuleKit' });
  }
});

if (!fs.existsSync(UPLOAD_ABS)) {
  fs.mkdirSync(UPLOAD_ABS, { recursive: true });
}

const uploadAny = multer({
  storage: multer.diskStorage({
    destination(_req, _file, cb) {
      cb(null, UPLOAD_ABS);
    },
    filename(_req, file, cb) {
      const ext = path.extname(file.originalname) || '.png';
      const base = path.basename(file.originalname, ext).replace(/\s+/g, '-').slice(0, 40);
      cb(null, `ssk-${base}-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
    },
  }),
  limits: { fileSize: 4 * 1024 * 1024, files: 48 },
  fileFilter(_req, file, cb) {
    const ok = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.mimetype);
    cb(ok ? null : new Error('Only image files are allowed'), ok);
  },
});

function isAllowedRequirementImageUrl(u) {
  if (!u || typeof u !== 'string') return false;
  const s = u.replace(/\\/g, '/').trim();
  return s.startsWith('/uploads/standard-shule-kits/');
}

/** @param {{ allowKeepImageUrl?: boolean }} opts */
function parseRequirements(raw, opts = {}) {
  const { allowKeepImageUrl = false } = opts;
  if (raw == null || raw === '') return [];
  let arr;
  if (typeof raw === 'string') {
    try {
      arr = JSON.parse(raw);
    } catch {
      return [];
    }
  } else if (Array.isArray(raw)) {
    arr = raw;
  } else {
    return [];
  }
  return arr
    .map((r, i) => {
      let qty = parseInt(r.quantity, 10);
      if (!Number.isFinite(qty) || qty < 1) qty = 1;
      if (qty > 999_999) qty = 999_999;
      let keepUrl = null;
      if (allowKeepImageUrl && r.image_url != null && typeof r.image_url === 'string') {
        const t = r.image_url.trim();
        if (t && isAllowedRequirementImageUrl(t)) keepUrl = t.replace(/\\/g, '/').trim();
      }
      return {
        title: String(r.title || r.name || '').trim(),
        amount_frw: Math.max(0, Number(r.amount_frw ?? r.amount ?? 0) || 0),
        quantity: qty,
        clear_image: !!r.clear_image,
        image_url: keepUrl,
        sort_order: Number(r.sort_order) >= 0 ? Number(r.sort_order) : i,
      };
    })
    .filter((r) => r.title.length > 0);
}

function sumRequirements(rows) {
  return rows.reduce((s, r) => {
    const q = Math.max(1, parseInt(r.quantity, 10) || 1);
    return s + Number(r.amount_frw || 0) * q;
  }, 0);
}

function unlinkAllUploadedFiles(req) {
  for (const f of req.files || []) {
    if (f.path) {
      try {
        fs.unlinkSync(f.path);
      } catch (_) {
        /* ignore */
      }
    }
  }
}

function reqImageFilesByIndex(req) {
  const map = {};
  for (const f of req.files || []) {
    const m = /^req_image_(\d+)$/.exec(f.fieldname || '');
    if (m) map[Number(m[1])] = f;
  }
  return map;
}

function deleteImageFileIfLocal(imageUrl) {
  if (!imageUrl || typeof imageUrl !== 'string') return;
  const u = imageUrl.replace(/\\/g, '/').trim();
  if (!u.startsWith('/uploads/standard-shule-kits/')) return;
  const name = path.basename(u);
  if (!/^[a-zA-Z0-9._-]+$/.test(name)) return;
  const abs = path.join(UPLOAD_ABS, name);
  if (fs.existsSync(abs)) {
    try {
      fs.unlinkSync(abs);
    } catch (_) {
      /* ignore */
    }
  }
}

async function loadKitWithRequirements(id) {
  const [kits] = await promisePool.query(
    `SELECT id, grade_level, description, image_url, status, sort_order, created_at, updated_at
     FROM standard_shule_kits WHERE id = ? LIMIT 1`,
    [id]
  );
  const kit = kits[0];
  if (!kit) return null;
  const [reqs] = await promisePool.query(
    `SELECT id, title, amount_frw, quantity, image_url, sort_order FROM standard_shule_kit_requirements
     WHERE kit_id = ? ORDER BY sort_order ASC, id ASC`,
    [id]
  );
  const requirements = reqs.map((r) => {
    const qty = Math.max(1, parseInt(r.quantity, 10) || 1);
    const unit = Number(r.amount_frw);
    return {
      id: r.id,
      title: r.title,
      amount_frw: unit,
      quantity: qty,
      image_url: r.image_url || null,
      line_total_frw: unit * qty,
      sort_order: r.sort_order,
    };
  });
  const cover_image_url =
    requirements.find((r) => r.image_url)?.image_url || kit.image_url || null;
  return {
    ...kit,
    requirements,
    total_frw: sumRequirements(requirements),
    cover_image_url,
  };
}

async function findStudentByCode(raw) {
  const code = String(raw || '').trim();
  if (!code || code.length < 2) return null;
  const upper = code.toUpperCase();
  const [rows] = await promisePool.query(
    `SELECT s.id, s.school_id, s.student_uid, s.student_code, s.sdm_code, s.first_name, s.last_name, s.class_name,
            sc.school_name, sc.province, sc.district, sc.sector
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

async function findAgentForSchoolSector(province, district, sector) {
  if (!province || !district || !sector) return null;
  const [rows] = await promisePool.query(
    `SELECT p.user_id, p.sectors_json
     FROM field_agent_profiles p
     INNER JOIN users u ON u.id = p.user_id
     INNER JOIN roles r ON r.id = u.role_id
     WHERE u.deleted_at IS NULL AND u.is_active = 1
       AND UPPER(r.role_code) = 'AGENT'
       AND p.province = ? AND p.district = ?`,
    [province, district]
  );
  for (const row of rows) {
    let sectors = [];
    try {
      sectors = typeof row.sectors_json === 'string' ? JSON.parse(row.sectors_json || '[]') : row.sectors_json;
    } catch {
      sectors = [];
    }
    if (Array.isArray(sectors) && sectors.includes(sector)) return row.user_id;
  }
  return null;
}

/** Public — active kits only */
router.get('/public/kits', async (_req, res) => {
  try {
    const [kits] = await promisePool.query(
      `SELECT id, grade_level, description, image_url, status, sort_order
       FROM standard_shule_kits
       WHERE status = 'active'
       ORDER BY sort_order ASC, FIELD(grade_level, ${GRADE_LEVELS.map(() => '?').join(',')}) ASC, grade_level ASC`,
      GRADE_LEVELS
    );
    const out = [];
    for (const k of kits) {
      const full = await loadKitWithRequirements(k.id);
      if (full) out.push(full);
    }
    res.json({ success: true, data: out, grade_levels: GRADE_LEVELS });
  } catch (e) {
    console.error('[standard-shule-kits/public/kits]', e);
    res.status(500).json({ success: false, message: 'Failed to load kits' });
  }
});

router.get('/public/kits/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!id) return res.status(400).json({ success: false, message: 'Invalid id' });
    const full = await loadKitWithRequirements(id);
    if (!full || full.status !== 'active') {
      return res.status(404).json({ success: false, message: 'Kit not found' });
    }
    res.json({ success: true, data: full, grade_levels: GRADE_LEVELS });
  } catch (e) {
    console.error('[standard-shule-kits/public/kits/:id]', e);
    res.status(500).json({ success: false, message: 'Failed to load kit' });
  }
});

router.post('/public/requests/prepare', async (req, res) => {
  try {
    const kitId = parseInt(req.body?.kit_id, 10);
    const studentCode = String(req.body?.student_code || '').trim();
    const deliveryOption = String(req.body?.delivery_option || 'AT_SCHOOL').toUpperCase();
    const deliveryAddress = String(req.body?.delivery_address || '').trim();
    const requesterName = String(req.body?.requester_name || '').trim();
    const requesterContact = String(req.body?.requester_contact || '').trim();
    if (!kitId || !studentCode || !requesterName || !requesterContact) {
      return res.status(400).json({ success: false, message: 'kit_id, student_code, requester_name and requester_contact are required' });
    }
    if (!['AT_SCHOOL', 'AT_HOME'].includes(deliveryOption)) {
      return res.status(400).json({ success: false, message: 'delivery_option must be AT_SCHOOL or AT_HOME' });
    }
    if (deliveryOption === 'AT_HOME' && !deliveryAddress) {
      return res.status(400).json({ success: false, message: 'delivery_address is required for home delivery' });
    }
    const kit = await loadKitWithRequirements(kitId);
    if (!kit || kit.status !== 'active') {
      return res.status(404).json({ success: false, message: 'Standard kit not found' });
    }
    const student = await findStudentByCode(studentCode);
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }
    const deliveryFee = deliveryOption === 'AT_HOME' ? 2500 : 0;
    const total = Number(kit.total_frw || 0) + deliveryFee;
    const agentUserId = await findAgentForSchoolSector(student.province, student.district, student.sector);
    res.json({
      success: true,
      data: {
        kit: {
          id: kit.id,
          grade_level: kit.grade_level,
          total_frw: Number(kit.total_frw || 0),
        },
        student: {
          id: student.id,
          student_uid: student.student_uid,
          student_code: student.student_code,
          first_name: student.first_name,
          last_name: student.last_name,
          class_name: student.class_name,
          school_id: student.school_id,
          school_name: student.school_name,
          province: student.province,
          district: student.district,
          sector: student.sector,
        },
        requester_name: requesterName,
        requester_contact: requesterContact,
        delivery_option: deliveryOption,
        delivery_address: deliveryOption === 'AT_HOME' ? deliveryAddress : null,
        delivery_fee_frw: deliveryFee,
        total_frw: total,
        agent_user_id: agentUserId || null,
      },
    });
  } catch (e) {
    console.error('[standard-shule-kits/public/requests/prepare]', e);
    res.status(500).json({ success: false, message: e.message || 'Could not prepare request' });
  }
});

router.post('/public/requests/pay-momo', async (req, res) => {
  const conn = await promisePool.getConnection();
  try {
    const prepared = req.body?.prepared || {};
    const momoPhone = String(req.body?.momo_phone || '').trim();
    const msisdn = toMsisdn250(momoPhone);
    if (!msisdn) {
      return res.status(400).json({ success: false, message: 'Enter a valid Rwanda MTN number.' });
    }
    if (!prepared?.kit?.id || !prepared?.student?.id || !prepared?.student?.school_id || !prepared?.requester_name || !prepared?.requester_contact) {
      return res.status(400).json({ success: false, message: 'Invalid request payload' });
    }
    const reqNo = `SKR-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;
    const total = Math.max(0, Number(prepared.total_frw || 0));
    if (total < 100) return res.status(400).json({ success: false, message: 'Amount too low' });

    await conn.beginTransaction();
    const [ins] = await conn.query(
      `INSERT INTO standard_shule_kit_requests (
        request_no, kit_id, student_id, school_id, agent_user_id,
        requester_name, requester_contact, delivery_option, delivery_address,
        province, district, sector, total_frw, payment_status, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'awaiting_payment', 'submitted')`,
      [
        reqNo,
        prepared.kit.id,
        prepared.student.id,
        prepared.student.school_id,
        prepared.agent_user_id || null,
        prepared.requester_name,
        prepared.requester_contact,
        prepared.delivery_option || 'AT_SCHOOL',
        prepared.delivery_address || null,
        prepared.student.province || null,
        prepared.student.district || null,
        prepared.student.sector || null,
        total,
      ]
    );
    const requestId = ins.insertId;
    const externalId = `skr-${requestId}-${Date.now()}`.slice(0, 64);
    let statusUpper = 'PENDING';
    let providerPayload = {};
    if (mtnMomo && mtnMomo.mtnMomoEnabled && mtnMomo.mtnMomoEnabled()) {
      const mtn = await mtnMomo.requestToPay({
        amount: Math.round(total),
        currency: 'RWF',
        externalId,
        msisdn250: msisdn,
        payerMessage: `Standard Kit ${prepared.kit.grade_level || ''}`.slice(0, 80),
        payeeNote: `Request ${reqNo}`,
      });
      providerPayload = mtn.responseBody && typeof mtn.responseBody === 'object' ? mtn.responseBody : {};
      statusUpper = mtnMomo.mapMtnStatusToUpper(providerPayload.status);
    }
    await conn.query(
      `INSERT INTO standard_shule_kit_request_payments (request_id, payment_ref, payment_method, amount_paid, payment_status, provider_response)
       VALUES (?, ?, 'mtn_momo', ?, ?, ?)`,
      [requestId, externalId, total, statusUpper === 'SUCCESSFUL' ? 'paid' : 'pending', JSON.stringify({ mtn: providerPayload })]
    );
    if (statusUpper === 'SUCCESSFUL') {
      await conn.query(
        `UPDATE standard_shule_kit_requests
         SET payment_status='paid', status='paid', updated_at=NOW()
         WHERE id = ?`,
        [requestId]
      );
    }
    await conn.commit();
    res.json({
      success: true,
      data: {
        request_id: requestId,
        request_no: reqNo,
        mtn_status: statusUpper,
      },
    });
  } catch (e) {
    try {
      await conn.rollback();
    } catch (_) {}
    console.error('[standard-shule-kits/public/requests/pay-momo]', e);
    res.status(500).json({ success: false, message: e.message || 'Payment failed' });
  } finally {
    conn.release();
  }
});

router.get('/public/requests/pay-status/:requestId', async (req, res) => {
  try {
    const requestId = parseInt(req.params.requestId, 10);
    if (!requestId) return res.status(400).json({ success: false, message: 'Invalid request id' });
    const [rows] = await promisePool.query(
      `SELECT payment_status, provider_response
       FROM standard_shule_kit_request_payments
       WHERE request_id = ?
       ORDER BY id DESC
       LIMIT 1`,
      [requestId]
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
        `UPDATE standard_shule_kit_requests
         SET payment_status='paid', status='paid', updated_at=NOW()
         WHERE id = ?`,
        [requestId]
      );
    }
    res.json({ success: true, data: { status: mapped } });
  } catch (e) {
    console.error('[standard-shule-kits/public/requests/pay-status]', e);
    res.status(500).json({ success: false, message: e.message || 'Status check failed' });
  }
});

router.get('/admin/requests', requireSuper, async (req, res) => {
  try {
    const status = String(req.query.status || '').trim();
    const delivery = String(req.query.delivery_option || '').trim();
    const search = String(req.query.search || '').trim();
    let sql = `
      SELECT r.*, k.grade_level, s.first_name, s.last_name, s.student_code, sc.school_name,
             au.first_name AS agent_first_name, au.last_name AS agent_last_name
      FROM standard_shule_kit_requests r
      LEFT JOIN standard_shule_kits k ON k.id = r.kit_id
      LEFT JOIN students s ON s.id = r.student_id
      LEFT JOIN schools sc ON sc.id = r.school_id
      LEFT JOIN users au ON au.id = r.agent_user_id
      WHERE 1=1`;
    const params = [];
    if (status) { sql += ' AND r.payment_status = ?'; params.push(status); }
    if (delivery) { sql += ' AND r.delivery_option = ?'; params.push(delivery); }
    if (search) {
      sql += ' AND (r.request_no LIKE ? OR r.requester_name LIKE ? OR r.requester_contact LIKE ? OR sc.school_name LIKE ? OR s.student_code LIKE ?)';
      const like = `%${search}%`;
      params.push(like, like, like, like, like);
    }
    sql += ' ORDER BY r.created_at DESC LIMIT 1000';
    const [rows] = await promisePool.query(sql, params);
    res.json({ success: true, data: rows });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message || 'Failed to load requests' });
  }
});

router.get('/agent/requests', requireAgent, async (req, res) => {
  try {
    const userId = resolveUserId(req);
    const status = String(req.query.status || '').trim();
    const delivery = String(req.query.delivery_option || '').trim();
    const search = String(req.query.search || '').trim();
    let sql = `
      SELECT r.*, k.grade_level, s.first_name, s.last_name, s.student_code, sc.school_name
      FROM standard_shule_kit_requests r
      LEFT JOIN standard_shule_kits k ON k.id = r.kit_id
      LEFT JOIN students s ON s.id = r.student_id
      LEFT JOIN schools sc ON sc.id = r.school_id
      WHERE r.agent_user_id = ?`;
    const params = [userId];
    if (status) { sql += ' AND r.payment_status = ?'; params.push(status); }
    if (delivery) { sql += ' AND r.delivery_option = ?'; params.push(delivery); }
    if (search) {
      sql += ' AND (r.request_no LIKE ? OR r.requester_name LIKE ? OR r.requester_contact LIKE ? OR sc.school_name LIKE ? OR s.student_code LIKE ?)';
      const like = `%${search}%`;
      params.push(like, like, like, like, like);
    }
    sql += ' ORDER BY r.created_at DESC LIMIT 1000';
    const [rows] = await promisePool.query(sql, params);
    res.json({ success: true, data: rows });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message || 'Failed to load requests' });
  }
});

/** Admin */
router.get('/admin/kits', requireSuper, async (_req, res) => {
  try {
    const [kits] = await promisePool.query(
      `SELECT id, grade_level, description, image_url, status, sort_order, created_at, updated_at
       FROM standard_shule_kits
       ORDER BY sort_order ASC, FIELD(grade_level, ${GRADE_LEVELS.map(() => '?').join(',')}) ASC, grade_level ASC`,
      GRADE_LEVELS
    );
    const out = [];
    for (const k of kits) {
      const full = await loadKitWithRequirements(k.id);
      if (full) out.push(full);
    }
    res.json({ success: true, data: out, grade_levels: GRADE_LEVELS });
  } catch (e) {
    console.error('[standard-shule-kits/admin/kits]', e);
    res.status(500).json({ success: false, message: 'Failed to load kits' });
  }
});

router.get('/admin/kits/:id', requireSuper, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!id) return res.status(400).json({ success: false, message: 'Invalid id' });
    const full = await loadKitWithRequirements(id);
    if (!full) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data: full, grade_levels: GRADE_LEVELS });
  } catch (e) {
    console.error('[standard-shule-kits/admin/kits/:id]', e);
    res.status(500).json({ success: false, message: 'Failed to load kit' });
  }
});

router.post('/admin/kits', requireSuper, uploadAny.any(), async (req, res) => {
  const conn = await promisePool.getConnection();
  try {
    const grade_level = String(req.body.grade_level || '').trim();
    if (!GRADE_LEVELS.includes(grade_level)) {
      unlinkAllUploadedFiles(req);
      return res.status(400).json({ success: false, message: `grade_level must be one of: ${GRADE_LEVELS.join(', ')}` });
    }
    const description = String(req.body.description || '').trim() || null;
    const status = ['draft', 'active', 'inactive'].includes(req.body.status) ? req.body.status : 'draft';
    const sort_order = Math.max(0, parseInt(req.body.sort_order, 10) || 0);
    const requirements = parseRequirements(req.body.requirements, { allowKeepImageUrl: false });
    if (requirements.length === 0) {
      unlinkAllUploadedFiles(req);
      return res.status(400).json({ success: false, message: 'Add at least one requirement with a title and price' });
    }

    const [[existing]] = await conn.query(
      'SELECT id FROM standard_shule_kits WHERE grade_level = ? LIMIT 1',
      [grade_level]
    );
    if (existing) {
      unlinkAllUploadedFiles(req);
      return res.status(409).json({ success: false, message: `A kit for “${grade_level}” already exists. Edit or delete it first.` });
    }

    const byIdx = reqImageFilesByIndex(req);

    await conn.beginTransaction();
    const [ins] = await conn.query(
      `INSERT INTO standard_shule_kits (grade_level, description, image_url, status, sort_order)
       VALUES (?, ?, NULL, ?, ?)`,
      [grade_level, description, status, sort_order]
    );
    const kitId = ins.insertId;
    for (let i = 0; i < requirements.length; i++) {
      const r = requirements[i];
      const f = byIdx[i];
      let img = null;
      if (f?.filename) {
        img = `/${UPLOAD_REL}/${f.filename}`.replace(/\\/g, '/');
      }
      await conn.query(
        `INSERT INTO standard_shule_kit_requirements (kit_id, title, amount_frw, quantity, image_url, sort_order)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [kitId, r.title, r.amount_frw, r.quantity, img, r.sort_order ?? i]
      );
    }
    await conn.commit();
    const full = await loadKitWithRequirements(kitId);
    res.status(201).json({ success: true, data: full });
  } catch (e) {
    try {
      await conn.rollback();
    } catch (_) {
      /* ignore */
    }
    unlinkAllUploadedFiles(req);
    console.error('[standard-shule-kits POST]', e);
    res.status(500).json({ success: false, message: e.message || 'Create failed' });
  } finally {
    conn.release();
  }
});

router.put('/admin/kits/:id', requireSuper, uploadAny.any(), async (req, res) => {
  const conn = await promisePool.getConnection();
  try {
    const id = parseInt(req.params.id, 10);
    if (!id) {
      unlinkAllUploadedFiles(req);
      return res.status(400).json({ success: false, message: 'Invalid id' });
    }

    const [[row]] = await conn.query('SELECT * FROM standard_shule_kits WHERE id = ? LIMIT 1', [id]);
    if (!row) {
      unlinkAllUploadedFiles(req);
      return res.status(404).json({ success: false, message: 'Not found' });
    }

    const grade_level = String(req.body.grade_level || '').trim();
    if (!GRADE_LEVELS.includes(grade_level)) {
      unlinkAllUploadedFiles(req);
      return res.status(400).json({ success: false, message: `grade_level must be one of: ${GRADE_LEVELS.join(', ')}` });
    }
    const description = String(req.body.description || '').trim() || null;
    const status = ['draft', 'active', 'inactive'].includes(req.body.status) ? req.body.status : row.status;
    const sort_order = Math.max(0, parseInt(req.body.sort_order, 10) || row.sort_order || 0);
    const requirements = parseRequirements(req.body.requirements, { allowKeepImageUrl: true });
    if (requirements.length === 0) {
      unlinkAllUploadedFiles(req);
      return res.status(400).json({ success: false, message: 'Add at least one requirement with a title and price' });
    }

    const [[conflict]] = await conn.query(
      'SELECT id FROM standard_shule_kits WHERE grade_level = ? AND id <> ? LIMIT 1',
      [grade_level, id]
    );
    if (conflict) {
      unlinkAllUploadedFiles(req);
      return res.status(409).json({ success: false, message: `Another kit already uses grade “${grade_level}”.` });
    }

    const [oldReqRows] = await conn.query(
      `SELECT image_url FROM standard_shule_kit_requirements WHERE kit_id = ? ORDER BY sort_order ASC, id ASC`,
      [id]
    );
    const oldUrlSet = new Set(
      oldReqRows.map((o) => o.image_url).filter((u) => u && isAllowedRequirementImageUrl(u))
    );

    const byIdx = reqImageFilesByIndex(req);
    const finalImages = [];
    for (let i = 0; i < requirements.length; i++) {
      const r = requirements[i];
      const f = byIdx[i];
      let img = null;
      if (f?.filename) {
        img = `/${UPLOAD_REL}/${f.filename}`.replace(/\\/g, '/');
      } else if (r.clear_image) {
        img = null;
      } else if (r.image_url && oldUrlSet.has(r.image_url)) {
        img = r.image_url;
      }
      finalImages.push(img);
    }
    const kept = new Set(finalImages.filter(Boolean));

    await conn.beginTransaction();
    await conn.query(
      `UPDATE standard_shule_kits SET grade_level = ?, description = ?, image_url = NULL, status = ?, sort_order = ? WHERE id = ?`,
      [grade_level, description, status, sort_order, id]
    );
    await conn.query('DELETE FROM standard_shule_kit_requirements WHERE kit_id = ?', [id]);
    for (let i = 0; i < requirements.length; i++) {
      const r = requirements[i];
      await conn.query(
        `INSERT INTO standard_shule_kit_requirements (kit_id, title, amount_frw, quantity, image_url, sort_order)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [id, r.title, r.amount_frw, r.quantity, finalImages[i], r.sort_order ?? i]
      );
    }
    await conn.commit();

    for (const o of oldReqRows) {
      if (o.image_url && !kept.has(o.image_url)) {
        deleteImageFileIfLocal(o.image_url);
      }
    }
    if (row.image_url) {
      deleteImageFileIfLocal(row.image_url);
    }

    const full = await loadKitWithRequirements(id);
    res.json({ success: true, data: full });
  } catch (e) {
    try {
      await conn.rollback();
    } catch (_) {
      /* ignore */
    }
    unlinkAllUploadedFiles(req);
    console.error('[standard-shule-kits PUT]', e);
    res.status(500).json({ success: false, message: e.message || 'Update failed' });
  } finally {
    conn.release();
  }
});

router.delete('/admin/kits/:id', requireSuper, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!id) return res.status(400).json({ success: false, message: 'Invalid id' });
    const [[row]] = await promisePool.query(
      'SELECT image_url FROM standard_shule_kits WHERE id = ? LIMIT 1',
      [id]
    );
    if (!row) return res.status(404).json({ success: false, message: 'Not found' });
    const [reqImgs] = await promisePool.query(
      'SELECT image_url FROM standard_shule_kit_requirements WHERE kit_id = ?',
      [id]
    );
    await promisePool.query('DELETE FROM standard_shule_kits WHERE id = ?', [id]);
    for (const r of reqImgs) {
      deleteImageFileIfLocal(r.image_url);
    }
    deleteImageFileIfLocal(row.image_url);
    res.json({ success: true, message: 'Deleted' });
  } catch (e) {
    console.error('[standard-shule-kits DELETE]', e);
    res.status(500).json({ success: false, message: 'Delete failed' });
  }
});

module.exports = router;
module.exports.GRADE_LEVELS = GRADE_LEVELS;
