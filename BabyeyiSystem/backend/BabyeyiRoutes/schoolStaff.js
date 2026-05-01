// ================================================================
// schoolStaff.js — School Manager / DOS: staff accounts + identity
//
//   GET    /api/school/staff
//   POST   /api/school/staff          — auto password + email when password omitted
//   PATCH  /api/school/staff/:userId
//   DELETE /api/school/staff/:userId
//   PUT    /api/school/staff/:userId/identity
//   POST   /api/school/staff/:userId/photo
//
// Allowed creators: SCHOOL_ADMIN, SCHOOL_MANAGER, DOS
// ================================================================

const express = require('express');
const fs = require('fs');
const fsp = require('fs').promises;
const path = require('path');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const nodemailer = require('nodemailer');
const { promisePool } = require('../config/database');
const { requireRole } = require('../middleware/deoAuth');
const { computeProAccessEffective } = require('../utils/schoolSubscription');

const router = express.Router();

const CREATOR_ROLES = ['SCHOOL_ADMIN', 'SCHOOL_MANAGER', 'DOS'];
const STAFF_CARD_ROLES = ['SUPER_ADMIN', 'FULL_SYSTEM_CONTROLLER', 'SCHOOL_ADMIN', 'SCHOOL_MANAGER', 'DOS'];
const CREATABLE_ROLE_CODES = [
  'TEACHER', 'ACCOUNTANT', 'HOD', 'DOS',
  'GATE_OFFICER', 'LIBRARIAN', 'STORE_MANAGER',
  'SECRETARY', 'HR', 'DISCIPLINE', 'SCHOOL_MANAGER', 'SCHOOL_DIRECTOR',
];
const ROLE_CODE_ALIASES = {
  DISCIPLINE: ['DISCIPLINE_STAFF', 'HOD'],
  STORE_MANAGER: ['STOREKEEPER'],
  SCHOOL_MANAGER: ['SCHOOL MANAGER'],
  SCHOOL_DIRECTOR: ['SCHOOL DIRECTOR'],
};
const CUSTOM_ROLE_CODE_RE = /^[A-Z][A-Z0-9_]{1,63}$/;

const STAFF_ID_DIR = path.join(__dirname, '..', 'uploads', 'staff-identity-photos');
if (!fs.existsSync(STAFF_ID_DIR)) {
  try {
    fs.mkdirSync(STAFF_ID_DIR, { recursive: true });
  } catch (e) {
    console.warn('[schoolStaff] mkdir staff-identity-photos:', e.message);
  }
}

/** Sync guard — must run before multipart parsing so the request body stream is not held behind async DB work. */
function requireSessionUser(req, res, next) {
  const uid = req.session?.userId ?? req.session?.user?.id;
  if (!uid) {
    return res.status(401).json({ success: false, message: 'Not authenticated', code: 'NOT_AUTHENTICATED' });
  }
  next();
}

/** Memory storage: parse file before role check, then write to disk only after auth + Pro checks pass. */
const staffPhotoMemory = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const m = String(file.mimetype || '').toLowerCase();
    const ok = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(m);
    if (ok) return cb(null, true);
    cb(new Error('Only image files are allowed (JPEG, PNG, WebP).'));
  },
});

function staffPhotoFilename(userId, mimetype) {
  const m = (mimetype || '').toLowerCase();
  const ext = m.includes('png') ? '.png' : m.includes('webp') ? '.webp' : '.jpg';
  return `staff-${userId}-${Date.now()}${ext}`;
}

const STAFF_PHOTO_MAX_BYTES = 5 * 1024 * 1024;
const STAFF_PHOTO_MIMES = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp']);

/**
 * Multipart (field `photo`) OR JSON `{ photoBase64, mimeType? }` / data URL in photoBase64.
 * JSON avoids busboy "Unexpected end of form" on some browsers / mobile when multipart streams fail.
 */
function extractStaffPhotoBuffer(req) {
  const ct = String(req.headers['content-type'] || '').toLowerCase();
  if (ct.includes('application/json')) {
    const body = req.body && typeof req.body === 'object' ? req.body : {};
    let raw = body.photoBase64 ?? body.photo_data ?? body.photo;
    if (raw == null || raw === '') {
      return { err: 'Send JSON: { "photoBase64": "<base64 or data URL>", "mimeType": "image/jpeg" }' };
    }
    if (typeof raw !== 'string') {
      return { err: 'photoBase64 must be a string.' };
    }
    raw = raw.trim();
    let mime = body.mimeType || body.mime_type || null;
    if (raw.startsWith('data:')) {
      const comma = raw.indexOf(',');
      if (comma === -1) {
        return { err: 'Invalid data URL (missing comma).' };
      }
      const header = raw.slice(5, comma);
      const mediaType = String(header.split(';')[0] || '').trim();
      mime = mime || mediaType || null;
      raw = raw.slice(comma + 1).replace(/\s/g, '');
    }
    let buf;
    try {
      buf = Buffer.from(raw, 'base64');
    } catch {
      return { err: 'Invalid base64 image data.' };
    }
    if (!buf.length) {
      return { err: 'Decoded image is empty.' };
    }
    if (buf.length > STAFF_PHOTO_MAX_BYTES) {
      return { err: 'Image too large (max 5 MB).' };
    }
    const mt = String(mime || 'image/jpeg').toLowerCase();
    if (!STAFF_PHOTO_MIMES.has(mt)) {
      return { err: 'Only JPEG, PNG, or WebP images are allowed.' };
    }
    return { buf, mime: mt };
  }
  const buf = req.file?.buffer;
  if (!buf || !Buffer.isBuffer(buf) || !buf.length) {
    return { err: 'No image uploaded (multipart field: photo).' };
  }
  if (buf.length > STAFF_PHOTO_MAX_BYTES) {
    return { err: 'Image too large (max 5 MB).' };
  }
  const mt = String(req.file.mimetype || 'image/jpeg').toLowerCase();
  if (!STAFF_PHOTO_MIMES.has(mt)) {
    return { err: 'Only JPEG, PNG, or WebP images are allowed.' };
  }
  return { buf, mime: mt };
}

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587', 10),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

function resolveSchoolId(req) {
  return (
    req.ctx?.schoolId ||
    req.session?.school_id ||
    req.session?.schoolId ||
    req.session?.user?.school_id ||
    req.session?.user?.schoolId ||
    req.session?.user?.school?.id ||
    req.user?.school_id ||
    req.user?.schoolId ||
    null
  );
}

function generateUserUID(prefix = 'ST') {
  const ts = Date.now().toString().slice(-6);
  const rnd = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `${prefix}-${ts}${rnd}`;
}

/** Same style as public school registration — easy to copy. */
function generateStaffPassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789abcdefghjkmnpqrstuvwxyz';
  let s = '';
  for (let i = 0; i < 10; i += 1) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

function trimStr(v) {
  if (v === undefined || v === null) return '';
  return String(v).trim();
}

function normalizeCustomRoleCode(raw) {
  const normalized = String(raw || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/_+/g, '_');
  return normalized;
}

function roleCodeToName(roleCode) {
  return String(roleCode || '')
    .split('_')
    .filter(Boolean)
    .map((s) => s.charAt(0) + s.slice(1).toLowerCase())
    .join(' ') || 'Custom Role';
}

function candidateRoleCodes(roleCode) {
  const base = String(roleCode || '').toUpperCase();
  if (!base) return [];
  const aliases = ROLE_CODE_ALIASES[base] || [];
  return [base, ...aliases.map((a) => String(a || '').toUpperCase())]
    .filter(Boolean)
    .filter((v, i, arr) => arr.indexOf(v) === i);
}

async function findActiveRoleByCode(conn, roleCode) {
  const codes = candidateRoleCodes(roleCode);
  for (const code of codes) {
    const [[row]] = await conn.query(
      'SELECT id, UPPER(role_code) AS role_code FROM roles WHERE UPPER(role_code) = ? AND is_active = 1 LIMIT 1',
      [code]
    );
    if (row?.id) return row;
  }
  return null;
}

async function resolveStaffAssignableRole(conn, rawRoleCode, customRoleName = '') {
  const incoming = trimStr(rawRoleCode).toUpperCase();
  const normalizedCustom = normalizeCustomRoleCode(customRoleName);
  const roleCode = incoming === 'CUSTOM' ? normalizedCustom : incoming;

  if (!roleCode) {
    return { ok: false, message: 'Role is required.' };
  }

  if (CREATABLE_ROLE_CODES.includes(roleCode)) {
    const roleRow = await findActiveRoleByCode(conn, roleCode);
    if (roleRow) return { ok: true, roleRow };

    // Self-heal missing/inactive system roles so role assignment never blocks HR.
    const codes = candidateRoleCodes(roleCode);
    for (const code of codes) {
      const [[inactiveRow]] = await conn.query(
        'SELECT id FROM roles WHERE UPPER(role_code) = ? LIMIT 1',
        [code]
      );
      if (inactiveRow?.id) {
        await conn.query(
          'UPDATE roles SET is_active = 1, role_name = COALESCE(NULLIF(role_name, \'\'), ?), updated_at = NOW() WHERE id = ?',
          [roleCodeToName(roleCode), inactiveRow.id]
        );
        return { ok: true, roleRow: { id: inactiveRow.id, role_code: roleCode } };
      }
    }

    const [insertedRole] = await conn.query(
      `INSERT INTO roles (role_name, role_code, description, permissions, is_active, is_system_role)
       VALUES (?, ?, ?, ?, 1, 1)`,
      [roleCodeToName(roleCode), roleCode, 'System staff role auto-created from HR Center', '[]']
    );
    return { ok: true, roleRow: { id: insertedRole.insertId, role_code: roleCode } };
  }

  // Do not allow assigning non-creatable system roles via this endpoint.
  const existing = await findActiveRoleByCode(conn, roleCode);
  if (existing) {
    return { ok: false, message: `Role must be one of: ${CREATABLE_ROLE_CODES.join(', ')} or a new custom role.` };
  }

  if (!CUSTOM_ROLE_CODE_RE.test(roleCode)) {
    return { ok: false, message: 'Custom role format is invalid.' };
  }

  const roleName = roleCodeToName(roleCode);

  const [inserted] = await conn.query(
    `INSERT INTO roles (role_name, role_code, description, permissions, is_active, is_system_role)
     VALUES (?, ?, ?, ?, 1, 0)`,
    [roleName || 'Custom Role', roleCode, 'Custom role created from HR Center', '[]']
  );
  return { ok: true, roleRow: { id: inserted.insertId, role_code: roleCode } };
}

async function ensureStaffIdentityColumns() {
  await promisePool.query('ALTER TABLE users ADD COLUMN rfid_uid VARCHAR(64) NULL').catch(() => {});
  await promisePool.query('ALTER TABLE users ADD COLUMN fingerprint_id VARCHAR(128) NULL').catch(() => {});
  await promisePool.query('ALTER TABLE users ADD COLUMN identity_remarks VARCHAR(512) NULL').catch(() => {});
  await promisePool.query('ALTER TABLE users MODIFY COLUMN rfid_uid VARCHAR(64) NULL').catch(() => {});
  await promisePool.query('ALTER TABLE users MODIFY COLUMN fingerprint_id VARCHAR(128) NULL').catch(() => {});
  await promisePool.query('ALTER TABLE users MODIFY COLUMN identity_remarks VARCHAR(512) NULL').catch(() => {});
}

async function ensureStaffProfessionalColumns() {
  const changes = [
    "ALTER TABLE staff ADD COLUMN full_name VARCHAR(180) NULL",
    "ALTER TABLE staff ADD COLUMN gender VARCHAR(24) NULL",
    "ALTER TABLE staff ADD COLUMN date_of_birth DATE NULL",
    "ALTER TABLE staff ADD COLUMN national_id VARCHAR(64) NULL",
    "ALTER TABLE staff ADD COLUMN passport_number VARCHAR(64) NULL",
    "ALTER TABLE staff ADD COLUMN address TEXT NULL",
    "ALTER TABLE staff ADD COLUMN employment_type VARCHAR(32) NULL",
    "ALTER TABLE staff ADD COLUMN job_title VARCHAR(120) NULL",
    "ALTER TABLE staff ADD COLUMN date_of_employment DATE NULL",
    "ALTER TABLE staff ADD COLUMN contract_start_date DATE NULL",
    "ALTER TABLE staff ADD COLUMN contract_end_date DATE NULL",
    "ALTER TABLE staff ADD COLUMN employment_status VARCHAR(32) NULL",
    "ALTER TABLE staff ADD COLUMN department VARCHAR(80) NULL",
    "ALTER TABLE staff ADD COLUMN sub_department VARCHAR(80) NULL",
    "ALTER TABLE staff ADD COLUMN payroll_basic_salary DECIMAL(14,2) NULL",
    "ALTER TABLE staff ADD COLUMN payroll_transport_allowance DECIMAL(14,2) NULL",
    "ALTER TABLE staff ADD COLUMN payroll_housing_allowance DECIMAL(14,2) NULL",
    "ALTER TABLE staff ADD COLUMN payroll_meal_allowance DECIMAL(14,2) NULL",
    "ALTER TABLE staff ADD COLUMN payroll_other_allowances JSON NULL",
    "ALTER TABLE staff ADD COLUMN payroll_tax_percent DECIMAL(8,2) NULL",
    "ALTER TABLE staff ADD COLUMN payroll_pension_amount DECIMAL(14,2) NULL",
    "ALTER TABLE staff ADD COLUMN payroll_other_deductions JSON NULL",
    "ALTER TABLE staff ADD COLUMN payroll_payment_frequency VARCHAR(24) NULL",
    "ALTER TABLE staff ADD COLUMN payroll_payment_method VARCHAR(24) NULL",
    "ALTER TABLE staff ADD COLUMN payroll_bank_name VARCHAR(120) NULL",
    "ALTER TABLE staff ADD COLUMN payroll_account_number VARCHAR(120) NULL",
    "ALTER TABLE staff ADD COLUMN payroll_mobile_money_phone VARCHAR(30) NULL",
    "ALTER TABLE staff ADD COLUMN payroll_part_time_rate DECIMAL(14,2) NULL",
    "ALTER TABLE staff ADD COLUMN payroll_part_time_unit VARCHAR(30) NULL",
    "ALTER TABLE staff ADD COLUMN allow_advance TINYINT(1) NULL DEFAULT 0",
    "ALTER TABLE staff ADD COLUMN max_advance_limit DECIMAL(14,2) NULL",
    "ALTER TABLE staff ADD COLUMN advance_deduction_type VARCHAR(16) NULL",
    "ALTER TABLE staff ADD COLUMN advance_deduction_value DECIMAL(14,2) NULL",
    "ALTER TABLE staff ADD COLUMN account_enabled TINYINT(1) NULL DEFAULT 1",
  ];
  for (const sql of changes) {
    // Compatible with environments where IF NOT EXISTS is unavailable.
    // Duplicate-column errors are intentionally ignored.
    await promisePool.query(sql).catch(() => {});
  }
}

async function ensureProSchoolForStaffFeature(req, res) {
  const schoolId = resolveSchoolId(req);
  if (!schoolId) {
    res.status(400).json({ success: false, message: 'School not found in session.' });
    return null;
  }
  const [[schoolRow]] = await promisePool.query(
    `SELECT id, school_name, subscription_plan, pro_enabled, pro_end_date
     FROM schools WHERE id = ? AND deleted_at IS NULL LIMIT 1`,
    [schoolId]
  );
  const isPro = computeProAccessEffective(schoolRow || null);
  if (!isPro) {
    res.status(403).json({
      success: false,
      code: 'PRO_REQUIRED',
      message: 'School Team and staff management are available for Pro schools only.',
    });
    return null;
  }
  return { schoolId, schoolName: schoolRow?.school_name || 'Your school' };
}

async function getStaffRowForSchool(schoolId, userId) {
  const [rows] = await promisePool.query(
    `SELECT u.id, u.email, u.first_name, u.last_name, u.school_id, u.photo,
            u.rfid_uid, u.fingerprint_id, u.identity_remarks,
            r.role_code, st.school_id AS st_school
     FROM staff st
     INNER JOIN users u ON u.id = st.user_id AND u.deleted_at IS NULL
     INNER JOIN roles r ON r.id = u.role_id
     WHERE st.user_id = ? AND st.school_id = ?
     LIMIT 1`,
    [userId, schoolId]
  );
  return rows[0] || null;
}

function resolveRequesterRole(req) {
  return String(
    req.user?.role_code ||
    req.session?.user?.role?.code ||
    req.session?.user?.role_code ||
    req.session?.roleCode ||
    ''
  ).toUpperCase();
}

function isSchoolScopedRole(roleCode) {
  return roleCode === 'SCHOOL_ADMIN' || roleCode === 'SCHOOL_MANAGER' || roleCode === 'DOS';
}

async function sendStaffCredentialsEmail({
  to,
  firstName,
  schoolName,
  username,
  password,
}) {
  const from = process.env.SMTP_FROM || `"Babyeyi" <${process.env.SMTP_USER}>`;
  const loginUrl = `${process.env.FRONTEND_URL || 'http://localhost:5174'}/login`;
  const html = `
<!DOCTYPE html><html><body style="font-family:Segoe UI,Arial,sans-serif;background:#f8fafc;padding:24px;">
  <div style="max-width:560px;margin:0 auto;background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:28px;">
    <h1 style="color:#000435;font-size:20px;margin:0 0 12px;">Welcome to Babyeyi — staff account</h1>
    <p style="color:#334155;font-size:14px;line-height:1.6;">Hello ${firstName || ''},</p>
    <p style="color:#334155;font-size:14px;line-height:1.6;">
      <strong>${schoolName}</strong> has created an account for you. Use the credentials below to sign in at the staff login page.
    </p>
    <div style="background:#FFFBEB;border:1px solid #FBBF24;border-radius:10px;padding:16px;margin:16px 0;">
      <p style="margin:0 0 8px;font-size:12px;font-weight:700;color:#854d0e;text-transform:uppercase;">Login</p>
      <p style="margin:4px 0;font-size:14px;"><strong>Email</strong><br/>${to}</p>
      <p style="margin:4px 0;font-size:14px;"><strong>Username</strong><br/><span style="font-family:monospace">${username}</span></p>
      <p style="margin:4px 0;font-size:14px;"><strong>Temporary password</strong><br/>
        <span style="font-family:monospace;background:#000435;color:#FBBF24;padding:4px 10px;border-radius:6px;display:inline-block;">${password}</span>
      </p>
    </div>
    <p style="color:#64748b;font-size:13px;">After login, open your profile and change this password. School code is optional on login if your email is unique.</p>
    <p style="margin-top:20px;"><a href="${loginUrl}" style="display:inline-block;background:#000435;color:#FBBF24;text-decoration:none;font-weight:700;padding:12px 24px;border-radius:8px;">Open login</a></p>
  </div>
</body></html>`;
  const text = `Babyeyi staff account\n\nSchool: ${schoolName}\nEmail: ${to}\nUsername: ${username}\nTemporary password: ${password}\n\nLogin: ${loginUrl}\n\nChange your password after signing in.`;
  try {
    await transporter.sendMail({
      from,
      to,
      subject: `Your Babyeyi staff login — ${schoolName}`,
      text,
      html,
    });
    console.log(`[schoolStaff] Welcome email sent to ${to}`);
  } catch (e) {
    console.error('[schoolStaff] Email failed:', e.message);
  }
}

// ════════════════════════════════════════════════════════════════
// GET /api/school/staff
// ════════════════════════════════════════════════════════════════
router.get('/school/staff', requireRole(CREATOR_ROLES), async (req, res) => {
  try {
    await ensureStaffIdentityColumns();
    await ensureStaffProfessionalColumns();
    const ctx = await ensureProSchoolForStaffFeature(req, res);
    if (!ctx) return;
    const { schoolId } = ctx;

    const [rows] = await promisePool.query(
      `SELECT
         u.id,
         u.user_uid,
         u.email,
         u.username,
         u.phone,
         u.first_name,
         u.last_name,
         u.is_active,
         u.created_at,
         u.photo,
         u.rfid_uid,
         u.fingerprint_id,
         u.identity_remarks,
         r.role_code,
         r.role_name,
         st.staff_id,
         st.username AS staff_login_username,
         st.full_name,
         st.gender,
         st.date_of_birth,
         st.national_id,
         st.passport_number,
         st.address,
         st.employment_type,
         st.job_title,
         st.date_of_employment,
         st.contract_start_date,
         st.contract_end_date,
         st.employment_status,
         st.department,
         st.sub_department,
         st.payroll_basic_salary,
         st.payroll_transport_allowance,
         st.payroll_housing_allowance,
         st.payroll_meal_allowance,
         st.payroll_other_allowances,
         st.payroll_tax_percent,
         st.payroll_pension_amount,
         st.payroll_other_deductions,
         st.payroll_payment_frequency,
         st.payroll_payment_method,
         st.payroll_bank_name,
         st.payroll_account_number,
         st.payroll_mobile_money_phone,
         st.payroll_part_time_rate,
         st.payroll_part_time_unit,
         st.allow_advance,
         st.max_advance_limit,
         st.advance_deduction_type,
         st.advance_deduction_value,
         st.account_enabled
       FROM staff st
       INNER JOIN users u ON u.id = st.user_id AND u.deleted_at IS NULL
       INNER JOIN roles r ON r.id = u.role_id
       WHERE st.school_id = ?
       ORDER BY u.created_at DESC`,
      [schoolId]
    );

    return res.json({ success: true, data: rows });
  } catch (err) {
    console.error('GET /api/school/staff:', err);
    return res.status(500).json({ success: false, message: 'Failed to list staff' });
  }
});

// ════════════════════════════════════════════════════════════════
// GET /api/staff/filters/roles
// Used by Super Admin staff card template page
// ════════════════════════════════════════════════════════════════
router.get('/staff/filters/roles', requireRole(STAFF_CARD_ROLES), async (req, res) => {
  try {
    const roleCode = resolveRequesterRole(req);
    const where = ['u.deleted_at IS NULL', 'sc.deleted_at IS NULL'];
    const params = [];

    const requestedSchoolId = Number(req.query.school_id || 0);
    if (isSchoolScopedRole(roleCode)) {
      const ownSchoolId = resolveSchoolId(req);
      if (!ownSchoolId) {
        return res.status(400).json({ success: false, message: 'School not found in session.' });
      }
      where.push('st.school_id = ?');
      params.push(Number(ownSchoolId));
    } else if (requestedSchoolId > 0) {
      where.push('st.school_id = ?');
      params.push(requestedSchoolId);
    }

    const [rows] = await promisePool.query(
      `SELECT DISTINCT UPPER(r.role_code) AS role_code
       FROM staff st
       INNER JOIN users u ON u.id = st.user_id
       INNER JOIN roles r ON r.id = u.role_id
       INNER JOIN schools sc ON sc.id = st.school_id
       WHERE ${where.join(' AND ')}
       ORDER BY UPPER(r.role_code) ASC`,
      params
    );

    return res.json({ success: true, data: rows.map((r) => r.role_code).filter(Boolean) });
  } catch (err) {
    console.error('GET /api/staff/filters/roles:', err);
    return res.status(500).json({ success: false, message: 'Failed to load staff roles' });
  }
});

// ════════════════════════════════════════════════════════════════
// GET /api/staff
// Super Admin: cross-school filters
// School roles: automatically restricted to own school
// ════════════════════════════════════════════════════════════════
router.get('/staff', requireRole(STAFF_CARD_ROLES), async (req, res) => {
  try {
    const roleCode = resolveRequesterRole(req);
    const {
      province = '',
      district = '',
      sector = '',
      school_id = '',
      role = '',
      q = '',
      limit = '100',
    } = req.query || {};

    const where = ['u.deleted_at IS NULL', 'sc.deleted_at IS NULL'];
    const params = [];

    if (province) { where.push('sc.province = ?'); params.push(String(province).trim()); }
    if (district) { where.push('sc.district = ?'); params.push(String(district).trim()); }
    if (sector) { where.push('sc.sector = ?'); params.push(String(sector).trim()); }

    const requestedSchoolId = Number(school_id || 0);
    if (isSchoolScopedRole(roleCode)) {
      const ownSchoolId = resolveSchoolId(req);
      if (!ownSchoolId) {
        return res.status(400).json({ success: false, message: 'School not found in session.' });
      }
      where.push('st.school_id = ?');
      params.push(Number(ownSchoolId));
    } else if (requestedSchoolId > 0) {
      where.push('st.school_id = ?');
      params.push(requestedSchoolId);
    }

    if (role) {
      where.push('UPPER(r.role_code) = ?');
      params.push(String(role).trim().toUpperCase());
    }
    if (q) {
      const like = `%${String(q).trim()}%`;
      where.push(
        `(u.first_name LIKE ? OR u.last_name LIKE ? OR CONCAT(u.first_name, ' ', u.last_name) LIKE ? OR st.staff_id LIKE ? OR u.user_uid LIKE ? OR st.full_name LIKE ?)`
      );
      params.push(like, like, like, like, like, like);
    }

    const maxLimit = Math.min(Math.max(Number(limit) || 100, 1), 500);

    const [rows] = await promisePool.query(
      `SELECT
         u.id,
         u.user_uid,
         u.first_name,
         u.last_name,
         u.phone,
         u.email,
         u.photo AS photo_url,
         u.is_active,
         u.created_at,
         st.school_id,
         st.staff_id AS staff_code,
         st.full_name,
         st.gender,
         st.job_title,
         st.department,
         st.employment_status,
         r.role_code,
         r.role_name,
         sc.school_name,
         sc.logo_url,
         sc.phone AS school_phone,
         sc.email AS school_email,
         sc.website AS school_website,
         sc.postal_address,
         sc.province,
         sc.district,
         sc.sector
       FROM staff st
       INNER JOIN users u ON u.id = st.user_id
       INNER JOIN roles r ON r.id = u.role_id
       INNER JOIN schools sc ON sc.id = st.school_id
       WHERE ${where.join(' AND ')}
       ORDER BY sc.school_name ASC, u.first_name ASC, u.last_name ASC
       LIMIT ?`,
      [...params, maxLimit]
    );

    const data = rows.map((row) => ({
      ...row,
      code: row.staff_code || row.user_uid || `STF-${row.id}`,
      role: row.role_name || row.role_code || row.job_title || '-',
      status:
        String(row.employment_status || '').trim() ||
        (Number(row.is_active) === 1 ? 'Active' : 'Inactive'),
    }));

    return res.json({ success: true, data });
  } catch (err) {
    console.error('GET /api/staff:', err);
    return res.status(500).json({ success: false, message: 'Failed to load staff list' });
  }
});

// ════════════════════════════════════════════════════════════════
// GET /api/staff/public/:id
// Public profile lookup for QR scans (no login required)
// Accepts staff_id/code OR numeric user id
// ════════════════════════════════════════════════════════════════
router.get('/staff/public/:id', async (req, res) => {
  try {
    const rawId = String(req.params.id || '').trim();
    if (!rawId) {
      return res.status(400).json({ success: false, message: 'Invalid staff id' });
    }

    const asNum = Number(rawId);
    const isNumericId = Number.isInteger(asNum) && asNum > 0 && String(asNum) === rawId;

    const [rows] = await promisePool.query(
      `SELECT
         u.id,
         u.user_uid,
         u.first_name,
         u.last_name,
         u.phone,
         u.email,
         u.photo AS photo_url,
         u.is_active,
         u.created_at,
         st.school_id,
         st.staff_id AS staff_code,
         st.full_name,
         st.gender,
         st.job_title,
         st.department,
         st.employment_status,
         r.role_code,
         r.role_name,
         sc.school_name,
         sc.logo_url,
         sc.phone AS school_phone,
         sc.email AS school_email,
         sc.website AS school_website,
         sc.postal_address,
         sc.province,
         sc.district,
         sc.sector
       FROM staff st
       INNER JOIN users u ON u.id = st.user_id AND u.deleted_at IS NULL
       INNER JOIN roles r ON r.id = u.role_id
       LEFT JOIN schools sc ON sc.id = st.school_id
       WHERE ${isNumericId ? '(u.id = ? OR st.staff_id = ? OR u.user_uid = ?)' : '(st.staff_id = ? OR u.user_uid = ?)'}
       LIMIT 1`,
      isNumericId ? [asNum, rawId, rawId] : [rawId, rawId]
    );

    const row = rows[0];
    if (!row) {
      return res.status(404).json({ success: false, message: 'Staff member not found' });
    }

    return res.json({
      success: true,
      data: {
        ...row,
        code: row.staff_code || row.user_uid || `STF-${row.id}`,
        role: row.role_name || row.role_code || row.job_title || '-',
        status:
          String(row.employment_status || '').trim() ||
          (Number(row.is_active) === 1 ? 'Active' : 'Inactive'),
      },
    });
  } catch (err) {
    console.error('GET /api/staff/public/:id:', err);
    return res.status(500).json({ success: false, message: 'Failed to load public staff profile' });
  }
});

// ════════════════════════════════════════════════════════════════
// POST /api/school/staff
// Body: first_name, last_name, email, username, password? (omit = auto-generate & email),
//       phone?, role_code, staff_id?
// ════════════════════════════════════════════════════════════════
router.post('/school/staff', requireRole(CREATOR_ROLES), async (req, res) => {
  const ctx = await ensureProSchoolForStaffFeature(req, res);
  if (!ctx) return;
  const { schoolId, schoolName } = ctx;

  const conn = await promisePool.getConnection();
  try {
    await ensureStaffProfessionalColumns();
    const body = req.body || {};
    const firstName = trimStr(body.first_name);
    const lastName = trimStr(body.last_name);
    const email = trimStr(body.email).toLowerCase();
    const username = trimStr(body.username);
    let password = body.password != null ? String(body.password) : '';
    const phone = trimStr(body.phone) || null;
    const customRoleName = trimStr(body.custom_role_name || body.role_name || body.job_title);
    const roleCode = trimStr(body.role_code).toUpperCase();
    const staffIdLabel = trimStr(body.staff_id) || null;
    const fullName = trimStr(body.full_name) || `${firstName} ${lastName}`.trim();
    const gender = trimStr(body.gender) || null;
    const dateOfBirth = trimStr(body.date_of_birth) || null;
    const nationalId = trimStr(body.national_id) || null;
    const passportNumber = trimStr(body.passport_number) || null;
    const address = trimStr(body.address) || null;
    const employmentType = trimStr(body.employment_type) || null;
    const jobTitle = trimStr(body.job_title) || null;
    const dateOfEmployment = trimStr(body.date_of_employment) || null;
    const contractStartDate = trimStr(body.contract_start_date) || null;
    const contractEndDate = trimStr(body.contract_end_date) || null;
    const employmentStatus = trimStr(body.employment_status) || 'Active';
    const department = trimStr(body.department) || null;
    const subDepartment = trimStr(body.sub_department) || null;
    const payrollBasicSalary = body.payroll_basic_salary ?? null;
    const payrollTransportAllowance = body.payroll_transport_allowance ?? null;
    const payrollHousingAllowance = body.payroll_housing_allowance ?? null;
    const payrollMealAllowance = body.payroll_meal_allowance ?? null;
    const payrollOtherAllowances = body.payroll_other_allowances ?? null;
    const payrollTaxPercent = body.payroll_tax_percent ?? null;
    const payrollPensionAmount = body.payroll_pension_amount ?? null;
    const payrollOtherDeductions = body.payroll_other_deductions ?? null;
    const payrollPaymentFrequency = trimStr(body.payroll_payment_frequency) || null;
    const payrollPaymentMethod = trimStr(body.payroll_payment_method) || null;
    const payrollBankName = trimStr(body.payroll_bank_name) || null;
    const payrollAccountNumber = trimStr(body.payroll_account_number) || null;
    const payrollMobileMoneyPhone = trimStr(body.payroll_mobile_money_phone) || null;
    const payrollPartTimeRate = body.payroll_part_time_rate ?? null;
    const payrollPartTimeUnit = trimStr(body.payroll_part_time_unit) || null;
    const allowAdvance = body.allow_advance ? 1 : 0;
    const maxAdvanceLimit = body.max_advance_limit ?? null;
    const advanceDeductionType = trimStr(body.advance_deduction_type) || null;
    const advanceDeductionValue = body.advance_deduction_value ?? null;
    const accountEnabled = body.account_enabled === false ? 0 : 1;

    if (!firstName || !lastName) {
      return res.status(400).json({ success: false, message: 'First and last name are required.' });
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ success: false, message: 'Valid email is required.' });
    }
    if (!username || username.length < 3) {
      return res.status(400).json({ success: false, message: 'Username must be at least 3 characters.' });
    }
    const autoPassword = !password || password.length < 8;
    if (!autoPassword && password.length < 8) {
      return res.status(400).json({ success: false, message: 'Password must be at least 8 characters.' });
    }
    if (autoPassword) {
      password = generateStaffPassword();
    }
    const roleResolution = await resolveStaffAssignableRole(conn, roleCode, customRoleName);
    if (!roleResolution.ok) {
      return res.status(400).json({ success: false, message: roleResolution.message });
    }
    const roleRow = roleResolution.roleRow;

    const [[dupEmail]] = await conn.query(
      'SELECT id FROM users WHERE LOWER(email) = ? AND deleted_at IS NULL LIMIT 1',
      [email]
    );
    if (dupEmail) {
      return res.status(409).json({
        success: false,
        code: 'DUPLICATE_EMAIL',
        field: 'email',
        message: 'An account with this email already exists.',
      });
    }

    const [[dupUser]] = await conn.query(
      'SELECT id FROM users WHERE LOWER(username) = ? AND deleted_at IS NULL LIMIT 1',
      [username.toLowerCase()]
    );
    if (dupUser) {
      return res.status(409).json({
        success: false,
        code: 'DUPLICATE_USERNAME',
        field: 'username',
        message: 'This username is already taken.',
      });
    }

    const [[dupStaffUser]] = await conn.query(
      `SELECT st.id
       FROM staff st
       INNER JOIN users u ON u.id = st.user_id
       WHERE LOWER(st.username) = ?
         AND u.deleted_at IS NULL
       LIMIT 1`,
      [username.toLowerCase()]
    );
    if (dupStaffUser) {
      return res.status(409).json({
        success: false,
        code: 'DUPLICATE_STAFF_USERNAME',
        field: 'username',
        message: 'This staff username is already in use.',
      });
    }
    if (nationalId) {
      const [[dupNationalId]] = await conn.query(
        'SELECT id FROM staff WHERE national_id = ? LIMIT 1',
        [nationalId]
      );
      if (dupNationalId) {
        return res.status(409).json({
          success: false,
          code: 'DUPLICATE_NATIONAL_ID',
          field: 'national_id',
          message: 'This national ID/passport is already in use.',
        });
      }
    }

    if (phone) {
      const [[dupPhone]] = await conn.query(
        'SELECT id FROM users WHERE phone = ? AND deleted_at IS NULL LIMIT 1',
        [phone]
      );
      if (dupPhone) {
        return res.status(409).json({
          success: false,
          code: 'DUPLICATE_PHONE',
          field: 'phone',
          message: 'An account with this phone number already exists.',
        });
      }
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const userUid = generateUserUID('ST');

    await conn.beginTransaction();

    const [userResult] = await conn.query(
      `INSERT INTO users (
         user_uid, username, email, phone, password_hash,
         first_name, last_name,
         role_id, school_id,
         is_active, is_verified, force_password_change,
         created_at, updated_at
       ) VALUES (?,?,?,?,?,?,?,?,?,1,1,1,NOW(),NOW())`,
      [
        userUid,
        username,
        email,
        phone,
        passwordHash,
        firstName,
        lastName,
        roleRow.id,
        schoolId,
      ]
    );

    const newUserId = userResult.insertId;

    const staffInsertValues = [
      newUserId, schoolId, staffIdLabel, username, new Date(),
      fullName, gender, dateOfBirth, nationalId, passportNumber, address,
      employmentType, jobTitle, dateOfEmployment, contractStartDate, contractEndDate, employmentStatus,
      department, subDepartment,
      payrollBasicSalary, payrollTransportAllowance, payrollHousingAllowance, payrollMealAllowance,
      payrollOtherAllowances ? JSON.stringify(payrollOtherAllowances) : null,
      payrollTaxPercent, payrollPensionAmount,
      payrollOtherDeductions ? JSON.stringify(payrollOtherDeductions) : null,
      payrollPaymentFrequency, payrollPaymentMethod, payrollBankName, payrollAccountNumber, payrollMobileMoneyPhone,
      payrollPartTimeRate, payrollPartTimeUnit,
      allowAdvance, maxAdvanceLimit, advanceDeductionType, advanceDeductionValue, accountEnabled,
    ];
    const placeholders = staffInsertValues.map(() => '?').join(',');
    await conn.query(
      `INSERT INTO staff (
         user_id, school_id, staff_id, username, created_at,
         full_name, gender, date_of_birth, national_id, passport_number, address,
         employment_type, job_title, date_of_employment, contract_start_date, contract_end_date, employment_status,
         department, sub_department,
         payroll_basic_salary, payroll_transport_allowance, payroll_housing_allowance, payroll_meal_allowance,
         payroll_other_allowances, payroll_tax_percent, payroll_pension_amount, payroll_other_deductions,
         payroll_payment_frequency, payroll_payment_method, payroll_bank_name, payroll_account_number, payroll_mobile_money_phone,
         payroll_part_time_rate, payroll_part_time_unit,
         allow_advance, max_advance_limit, advance_deduction_type, advance_deduction_value, account_enabled
       ) VALUES (${placeholders})`,
      staffInsertValues
    );

    await conn.commit();

    sendStaffCredentialsEmail({
      to: email,
      firstName,
      schoolName,
      username,
      password,
    });

    return res.status(201).json({
      success: true,
      message: autoPassword
        ? 'Staff account created. A temporary password was sent by email.'
        : 'Staff account created.',
      data: {
        id: newUserId,
        user_uid: userUid,
        email,
        username,
        role_code: roleRow.role_code || roleCode,
        password_sent_by_email: autoPassword,
      },
    });
  } catch (err) {
    await conn.rollback().catch(() => {});
    console.error('POST /api/school/staff:', err);
    return res.status(500).json({ success: false, message: err.message || 'Failed to create staff' });
  } finally {
    conn.release();
  }
});

// ════════════════════════════════════════════════════════════════
// PATCH /api/school/staff/:userId
// ════════════════════════════════════════════════════════════════
router.patch('/school/staff/:userId', requireRole(CREATOR_ROLES), async (req, res) => {
  try {
    await ensureStaffIdentityColumns();
    await ensureStaffProfessionalColumns();
    const ctx = await ensureProSchoolForStaffFeature(req, res);
    if (!ctx) return;
    const { schoolId } = ctx;
    const userId = parseInt(req.params.userId, 10);
    if (!Number.isFinite(userId)) {
      return res.status(400).json({ success: false, message: 'Invalid user id' });
    }

    const row = await getStaffRowForSchool(schoolId, userId);
    if (!row) {
      return res.status(404).json({ success: false, message: 'Staff member not found.' });
    }

    const body = req.body || {};
    const firstName = body.first_name != null ? trimStr(body.first_name) : null;
    const lastName = body.last_name != null ? trimStr(body.last_name) : null;
    const phone = body.phone !== undefined ? (trimStr(body.phone) || null) : undefined;
    const email = body.email != null ? trimStr(body.email).toLowerCase() : null;
    const password = body.password !== undefined ? String(body.password || '').trim() : undefined;
    const isActive = body.is_active !== undefined ? !!body.is_active : undefined;
    const roleCode = body.role_code != null ? trimStr(body.role_code).toUpperCase() : null;
    const customRoleName = trimStr(body.custom_role_name || body.role_name || body.job_title);

    const updates = [];
    const params = [];

    if (firstName != null) {
      updates.push('first_name = ?');
      params.push(firstName);
    }
    if (lastName != null) {
      updates.push('last_name = ?');
      params.push(lastName);
    }
    if (phone !== undefined) {
      updates.push('phone = ?');
      params.push(phone);
    }
    if (email != null) {
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({ success: false, message: 'Valid email is required.' });
      }
      const [[dupEmail]] = await promisePool.query(
        'SELECT id FROM users WHERE LOWER(email) = ? AND id != ? AND deleted_at IS NULL LIMIT 1',
        [email, userId]
      );
      if (dupEmail) {
        return res.status(409).json({ success: false, message: 'An account with this email already exists.' });
      }
      updates.push('email = ?');
      params.push(email);
    }
    if (password !== undefined && password.length > 0) {
      if (password.length < 8) {
        return res.status(400).json({ success: false, message: 'Password must be at least 8 characters.' });
      }
      const passwordHash = await bcrypt.hash(password, 12);
      updates.push('password_hash = ?');
      params.push(passwordHash);
      updates.push('force_password_change = ?');
      params.push(0);
    }
    if (isActive !== undefined) {
      updates.push('is_active = ?');
      params.push(isActive ? 1 : 0);
    }
    if (roleCode) {
      const roleResolution = await resolveStaffAssignableRole(promisePool, roleCode, customRoleName);
      if (!roleResolution.ok) {
        return res.status(400).json({ success: false, message: roleResolution.message });
      }
      const rr = roleResolution.roleRow;
      updates.push('role_id = ?');
      params.push(rr.id);
    }

    const staffSet = [];
    const staffParams = [];
    const putStaff = (field, parser = (v) => v) => {
      if (body[field] !== undefined) {
        staffSet.push(`${field} = ?`);
        staffParams.push(parser(body[field]));
      }
    };
    putStaff('full_name', (v) => (v == null ? null : trimStr(v)));
    putStaff('gender', (v) => (v == null ? null : trimStr(v)));
    putStaff('date_of_birth', (v) => (v == null ? null : trimStr(v)));
    putStaff('national_id', (v) => (v == null ? null : trimStr(v)));
    putStaff('passport_number', (v) => (v == null ? null : trimStr(v)));
    putStaff('address', (v) => (v == null ? null : trimStr(v)));
    putStaff('employment_type', (v) => (v == null ? null : trimStr(v)));
    putStaff('job_title', (v) => (v == null ? null : trimStr(v)));
    putStaff('date_of_employment', (v) => (v == null ? null : trimStr(v)));
    putStaff('contract_start_date', (v) => (v == null ? null : trimStr(v)));
    putStaff('contract_end_date', (v) => (v == null ? null : trimStr(v)));
    putStaff('employment_status', (v) => (v == null ? null : trimStr(v)));
    putStaff('department', (v) => (v == null ? null : trimStr(v)));
    putStaff('sub_department', (v) => (v == null ? null : trimStr(v)));
    putStaff('payroll_basic_salary');
    putStaff('payroll_transport_allowance');
    putStaff('payroll_housing_allowance');
    putStaff('payroll_meal_allowance');
    putStaff('payroll_other_allowances', (v) => (v == null ? null : JSON.stringify(v)));
    putStaff('payroll_tax_percent');
    putStaff('payroll_pension_amount');
    putStaff('payroll_other_deductions', (v) => (v == null ? null : JSON.stringify(v)));
    putStaff('payroll_payment_frequency', (v) => (v == null ? null : trimStr(v)));
    putStaff('payroll_payment_method', (v) => (v == null ? null : trimStr(v)));
    putStaff('payroll_bank_name', (v) => (v == null ? null : trimStr(v)));
    putStaff('payroll_account_number', (v) => (v == null ? null : trimStr(v)));
    putStaff('payroll_mobile_money_phone', (v) => (v == null ? null : trimStr(v)));
    putStaff('payroll_part_time_rate');
    putStaff('payroll_part_time_unit', (v) => (v == null ? null : trimStr(v)));
    putStaff('allow_advance', (v) => (v ? 1 : 0));
    putStaff('max_advance_limit');
    putStaff('advance_deduction_type', (v) => (v == null ? null : trimStr(v)));
    putStaff('advance_deduction_value');
    putStaff('account_enabled', (v) => (v ? 1 : 0));

    if (!updates.length && !staffSet.length) {
      return res.json({ success: true, message: 'Nothing to update.' });
    }

    if (updates.length) {
      params.push(userId, schoolId);
      await promisePool.query(
        `UPDATE users SET ${updates.join(', ')}, updated_at = NOW() WHERE id = ? AND school_id = ? AND deleted_at IS NULL`,
        params
      );
    }
    if (staffSet.length) {
      staffParams.push(userId, schoolId);
      await promisePool.query(
        `UPDATE staff SET ${staffSet.join(', ')} WHERE user_id = ? AND school_id = ?`,
        staffParams
      );
    }

    return res.json({ success: true, message: 'Updated.' });
  } catch (err) {
    console.error('PATCH /api/school/staff/:userId', err);
    return res.status(500).json({ success: false, message: err.message || 'Update failed' });
  }
});

// ════════════════════════════════════════════════════════════════
// DELETE /api/school/staff/:userId — soft-delete user
// ════════════════════════════════════════════════════════════════
router.delete('/school/staff/:userId', requireRole(CREATOR_ROLES), async (req, res) => {
  try {
    const ctx = await ensureProSchoolForStaffFeature(req, res);
    if (!ctx) return;
    const { schoolId } = ctx;
    const userId = parseInt(req.params.userId, 10);
    if (!Number.isFinite(userId)) {
      return res.status(400).json({ success: false, message: 'Invalid user id' });
    }

    const row = await getStaffRowForSchool(schoolId, userId);
    if (!row) {
      return res.status(404).json({ success: false, message: 'Staff member not found.' });
    }

    const creatorId = req.session?.userId || req.session?.user?.id;
    if (creatorId && Number(creatorId) === userId) {
      return res.status(400).json({ success: false, message: 'You cannot delete your own account here.' });
    }

    await promisePool.query(
      `UPDATE users SET deleted_at = NOW(), is_active = 0, updated_at = NOW()
       WHERE id = ? AND school_id = ?`,
      [userId, schoolId]
    );

    return res.json({ success: true, message: 'Account removed.' });
  } catch (err) {
    console.error('DELETE /api/school/staff/:userId', err);
    return res.status(500).json({ success: false, message: err.message || 'Delete failed' });
  }
});

// ════════════════════════════════════════════════════════════════
// PUT /api/school/staff/:userId/identity
// ════════════════════════════════════════════════════════════════
router.put('/school/staff/:userId/identity', requireRole(CREATOR_ROLES), async (req, res) => {
  try {
    await ensureStaffIdentityColumns();
    const ctx = await ensureProSchoolForStaffFeature(req, res);
    if (!ctx) return;
    const { schoolId } = ctx;
    const userId = parseInt(req.params.userId, 10);
    if (!Number.isFinite(userId)) {
      return res.status(400).json({ success: false, message: 'Invalid user id' });
    }

    const row = await getStaffRowForSchool(schoolId, userId);
    if (!row) {
      return res.status(404).json({ success: false, message: 'Staff member not found.' });
    }

    const body = req.body || {};
    const rfid = trimStr(body.rfid_uid || body.rfidUid) || null;
    const fp = trimStr(body.fingerprint_id || body.fingerprintId) || null;
    const remarks = trimStr(body.identity_remarks || body.identityRemarks);

    if (rfid) {
      const [[dupR]] = await promisePool.query(
        `SELECT id FROM users WHERE school_id = ? AND rfid_uid = ? AND id != ? AND deleted_at IS NULL LIMIT 1`,
        [schoolId, rfid, userId]
      );
      if (dupR) {
        return res.status(409).json({ success: false, message: 'This RFID is already assigned at your school.' });
      }
    }
    if (fp) {
      const [[dupF]] = await promisePool.query(
        `SELECT id FROM users WHERE school_id = ? AND fingerprint_id = ? AND id != ? AND deleted_at IS NULL LIMIT 1`,
        [schoolId, fp, userId]
      );
      if (dupF) {
        return res.status(409).json({ success: false, message: 'This fingerprint ID is already assigned at your school.' });
      }
    }

    await promisePool.query(
      `UPDATE users SET rfid_uid = ?, fingerprint_id = ?, identity_remarks = ?, updated_at = NOW()
       WHERE id = ? AND school_id = ? AND deleted_at IS NULL`,
      [rfid, fp, remarks || null, userId, schoolId]
    );

    const [[out]] = await promisePool.query(
      `SELECT id, photo, rfid_uid, fingerprint_id, identity_remarks FROM users WHERE id = ? AND school_id = ? LIMIT 1`,
      [userId, schoolId]
    );

    return res.json({ success: true, message: 'Identity saved.', data: out });
  } catch (err) {
    console.error('PUT identity', err);
    return res.status(500).json({ success: false, message: err.message || 'Failed' });
  }
});

// ════════════════════════════════════════════════════════════════
// POST /api/school/staff/:userId/photo
// - Content-Type: application/json → { photoBase64, mimeType? } (recommended; avoids multipart issues)
// - Content-Type: multipart/form-data → field "photo" (multer memory)
// ════════════════════════════════════════════════════════════════
router.post(
  '/school/staff/:userId/photo',
  requireSessionUser,
  (req, res, next) => {
    const ct = String(req.headers['content-type'] || '').toLowerCase();
    if (ct.includes('application/json')) {
      return next();
    }
    staffPhotoMemory.single('photo')(req, res, (err) => {
      if (err) {
        const msg = err.message || 'Photo upload failed';
        const code = err.code;
        if (code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ success: false, message: 'File too large (max 5 MB).' });
        }
        return res.status(400).json({ success: false, message: msg });
      }
      next();
    });
  },
  requireRole(CREATOR_ROLES),
  async (req, res) => {
    try {
      const ctx = await ensureProSchoolForStaffFeature(req, res);
      if (!ctx) return;
      const { schoolId } = ctx;
      const userId = parseInt(req.params.userId, 10);
      if (!Number.isFinite(userId)) {
        return res.status(400).json({ success: false, message: 'Invalid user id' });
      }

      const extracted = extractStaffPhotoBuffer(req);
      if (extracted.err) {
        return res.status(400).json({ success: false, message: extracted.err });
      }
      const { buf, mime } = extracted;

      const row = await getStaffRowForSchool(schoolId, userId);
      if (!row) {
        return res.status(404).json({ success: false, message: 'Staff member not found.' });
      }

      const filename = staffPhotoFilename(userId, mime);
      const absPath = path.join(STAFF_ID_DIR, filename);
      await fsp.writeFile(absPath, buf);

      const photoPath = `/uploads/staff-identity-photos/${filename}`;
      await promisePool.query(
        'UPDATE users SET photo = ?, updated_at = NOW() WHERE id = ? AND school_id = ?',
        [photoPath, userId, schoolId]
      );

      return res.json({ success: true, message: 'Photo saved.', data: { photo: photoPath } });
    } catch (err) {
      console.error('POST staff photo', err);
      return res.status(500).json({ success: false, message: err.message || 'Failed' });
    }
  }
);

module.exports = router;
