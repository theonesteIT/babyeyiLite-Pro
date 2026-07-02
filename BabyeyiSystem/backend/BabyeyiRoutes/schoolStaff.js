// ================================================================
// schoolStaff.js — School Manager / DOS: staff accounts + identity
//
//   GET    /api/school/staff
//   POST   /api/school/staff          — auto password + email when password omitted
//   PATCH  /api/school/staff/:userId
//   PUT    /api/school/staff/:userId      — same as PATCH (proxy / legacy clients)
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
const { ensureCoreAuthSchema } = require('../utils/coreAuthSchema');
const { requireRole } = require('../middleware/deoAuth');
const { computeProAccessEffective } = require('../utils/schoolSubscription');

const router = express.Router();

const CREATOR_ROLES = ['SCHOOL_ADMIN', 'SCHOOL_MANAGER', 'DOS', 'ACCOUNTANT'];
/** Smart Access + staff directory: elevated roles scope with `school_id` query / header. */
const SMART_ACCESS_STAFF_ROLES = [...CREATOR_ROLES, 'SUPER_ADMIN', 'FULL_SYSTEM_CONTROLLER'];
const STAFF_CARD_ROLES = ['SUPER_ADMIN', 'FULL_SYSTEM_CONTROLLER', 'SCHOOL_ADMIN', 'SCHOOL_MANAGER', 'DOS', 'ACCOUNTANT'];
const CREATABLE_ROLE_CODES = [
  'TEACHER', 'ACCOUNTANT', 'HOD', 'DOS',
  'GATE_OFFICER', 'GATE_KEEPER', 'LIBRARIAN', 'STORE_MANAGER', 'UNIFORM_MANAGER', 'ASSETS_MANAGER',
  'SECRETARY', 'HR', 'DISCIPLINE', 'SCHOOL_MANAGER', 'SCHOOL_DIRECTOR',
];
const ROLE_CODE_ALIASES = {
  /** Do not alias to HOD — that sends DOD staff to Shule Avance instead of the conduct portal. */
  DISCIPLINE: ['DISCIPLINE_STAFF', 'HEAD_OF_DISCIPLINE'],
  GATE_KEEPER: ['GATE_OFFICER'],
  GATE_OFFICER: ['GATE_KEEPER'],
  STORE_MANAGER: ['STOREKEEPER'],
  UNIFORM_MANAGER: ['UNIFORM_MANAGER'],
  ASSETS_MANAGER: ['ASSET_MANAGER'],
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

function normImportKey(v) {
  return String(v || '').trim().toLowerCase();
}

/** Excel sometimes truncates long national IDs — allow near-matches (mirrors frontend import). */
function nationalIdsMatch(a, b) {
  const x = normImportKey(a);
  const y = normImportKey(b);
  if (!x || !y) return false;
  if (x === y) return true;
  if (x.length >= 8 && y.length >= 8) {
    if (x.startsWith(y) || y.startsWith(x)) return Math.abs(x.length - y.length) <= 3;
    if (x.endsWith(y) || y.endsWith(x)) return Math.abs(x.length - y.length) <= 3;
  }
  return false;
}

function parseHrProfileJson(raw) {
  if (!raw) return {};
  try {
    return typeof raw === 'string' ? JSON.parse(raw || '{}') : (raw || {});
  } catch {
    return {};
  }
}

/** Find staff user_id by National ID / RSSB within a school (exact + fuzzy NID). */
async function findStaffUserIdForImport(poolOrConn, schoolId, { nationalId = '', rssbNumber = '' } = {}) {
  const nid = trimStr(nationalId);
  const rssb = normImportKey(rssbNumber);
  if (!nid && !rssb) return null;

  if (nid) {
    const [[exact]] = await poolOrConn.query(
      `SELECT st.user_id
       FROM staff st
       INNER JOIN users u ON u.id = st.user_id AND u.deleted_at IS NULL
       WHERE st.school_id = ? AND st.national_id = ?
       LIMIT 1`,
      [schoolId, nid]
    );
    if (exact?.user_id) return Number(exact.user_id);
  }

  const [rows] = await poolOrConn.query(
    `SELECT st.user_id, st.national_id, st.hr_profile_json
     FROM staff st
     INNER JOIN users u ON u.id = st.user_id AND u.deleted_at IS NULL
     WHERE st.school_id = ?`,
    [schoolId]
  );

  for (const r of rows || []) {
    const hr = parseHrProfileJson(r.hr_profile_json);
    const hrNid = hr.national_id || hr.nid || '';
    const hrRssb = normImportKey(hr.rssb_number || hr.rssb || '');
    if (nid && (nationalIdsMatch(r.national_id, nid) || nationalIdsMatch(hrNid, nid))) {
      return Number(r.user_id);
    }
    if (rssb && hrRssb && hrRssb === rssb) {
      return Number(r.user_id);
    }
  }
  return null;
}

async function loadStaffRowForImport(poolOrConn, schoolId, userId) {
  const [[row]] = await poolOrConn.query(
    `SELECT u.id, u.email, u.phone, u.first_name, u.last_name,
            st.full_name, st.gender, st.national_id, st.payroll_basic_salary, st.hr_profile_json
     FROM users u
     INNER JOIN staff st ON st.user_id = u.id AND st.school_id = ?
     WHERE u.id = ? AND u.deleted_at IS NULL
     LIMIT 1`,
    [schoolId, userId]
  );
  return row || null;
}

function wantsImportUpsert(body) {
  return body?.import_upsert === true
    || body?.import_upsert === 1
    || String(body?.import_upsert || '') === '1';
}

/** Link an existing user account to a staff row at this school (spreadsheet import repair). */
async function linkOrphanUserToStaff(conn, schoolId, userId, importCtx) {
  const { body, resolvedUsername, staffIdPreferred } = importCtx || {};
  if (!body) return false;

  const [[user]] = await conn.query(
    'SELECT id, school_id, first_name, last_name FROM users WHERE id = ? AND deleted_at IS NULL LIMIT 1',
    [userId]
  );
  if (!user) return false;

  const userSchoolId = user.school_id == null ? null : Number(user.school_id);
  if (userSchoolId && userSchoolId !== Number(schoolId)) return false;
  if (await getStaffRowForSchool(schoolId, userId)) return true;

  if (!user.school_id) {
    await conn.query('UPDATE users SET school_id = ?, updated_at = NOW() WHERE id = ?', [schoolId, userId]);
  }

  const firstName = trimStr(body.first_name) || trimStr(user.first_name);
  const lastName = trimStr(body.last_name) || trimStr(user.last_name);
  const fullName = trimStr(body.full_name) || `${firstName} ${lastName}`.trim();
  const staffIdLabel = await allocateUniqueStaffSchoolCode(conn, schoolId, staffIdPreferred);
  const gender = trimStr(body.gender) || null;
  const dateOfBirth = trimStr(body.date_of_birth) || null;
  const nationalId = trimStr(body.national_id) || null;
  const department = trimStr(body.department) || null;
  const employmentType = trimStr(body.employment_type) || null;
  const jobTitle = trimStr(body.job_title) || null;
  const hrProfileJson = body.hr_profile_json != null
    ? (typeof body.hr_profile_json === 'string' ? body.hr_profile_json : JSON.stringify(body.hr_profile_json))
    : null;

  await conn.query(
    `INSERT INTO staff (
       user_id, school_id, staff_id, username, created_at,
       full_name, gender, date_of_birth, national_id,
       employment_type, job_title, department, employment_status,
       payroll_basic_salary, payroll_payment_method, payroll_bank_name,
       payroll_account_number, payroll_account_holder, payroll_mobile_money_phone,
       account_enabled, hr_profile_json
     ) VALUES (?,?,?,?,NOW(),?,?,?,?,?,?,'Active',?,?,?,?,?,0,?)`,
    [
      userId,
      schoolId,
      staffIdLabel,
      resolvedUsername || trimStr(body.username) || `staff${userId}`,
      fullName,
      gender,
      dateOfBirth,
      nationalId,
      employmentType,
      jobTitle,
      department,
      body.payroll_basic_salary ?? null,
      trimStr(body.payroll_payment_method) || null,
      trimStr(body.payroll_bank_name) || null,
      trimStr(body.payroll_account_number) || null,
      trimStr(body.payroll_account_holder) || null,
      trimStr(body.payroll_mobile_money_phone) || null,
      hrProfileJson,
    ]
  );
  return true;
}

/** Spreadsheet import: update existing staff instead of 409 when import_upsert is set. */
async function redirectImportUpsertToUpdate(req, res, conn, schoolId, existingUserId, releaseState, importCtx = null) {
  const userId = Number(existingUserId);
  if (!Number.isFinite(userId)) return false;
  let row = await getStaffRowForSchool(schoolId, userId);
  if (!row && importCtx) {
    const linked = await linkOrphanUserToStaff(conn, schoolId, userId, importCtx);
    if (linked) row = await getStaffRowForSchool(schoolId, userId);
  }
  if (!row) return false;
  if (releaseState) releaseState.connReleased = true;
  conn.release();
  req.params.userId = String(userId);
  await handleStaffProfileUpdate(req, res);
  return true;
}

function normalizeRfidUid(value) {
  const raw = trimStr(value);
  return raw ? raw.toUpperCase() : null;
}

async function assertRfidAvailable(poolOrConn, schoolId, rfid, excludeUserId = null) {
  if (!rfid) return { ok: true, rfid: null };
  const normalized = normalizeRfidUid(rfid);
  if (!normalized) return { ok: true, rfid: null };
  const params = [schoolId, normalized];
  let sql = 'SELECT id FROM users WHERE school_id = ? AND rfid_uid = ? AND deleted_at IS NULL';
  if (excludeUserId) {
    sql += ' AND id != ?';
    params.push(excludeUserId);
  }
  sql += ' LIMIT 1';
  const [[dup]] = await poolOrConn.query(sql, params);
  if (dup) {
    return { ok: false, message: 'This RFID is already assigned at your school.' };
  }
  return { ok: true, rfid: normalized };
}

/** True if any row uses this human-readable staff_id (UNIQUE on staff.staff_id is global). */
async function isStaffHumanIdTaken(conn, code) {
  const c = trimStr(code);
  if (!c) return false;
  const [[row]] = await conn.query(
    'SELECT id FROM staff WHERE UPPER(TRIM(staff_id)) = UPPER(TRIM(?)) LIMIT 1',
    [c]
  );
  return !!row;
}

/**
 * Returns a unique staff_id. Uses the client's preferred value when free globally;
 * otherwise bumps XX-### for that prefix using all rows (matches UNIQUE staff.staff_id).
 */
async function allocateUniqueStaffSchoolCode(conn, schoolId, preferredRaw) {
  void schoolId;
  const preferred = trimStr(preferredRaw);
  if (preferred && !(await isStaffHumanIdTaken(conn, preferred))) {
    return preferred;
  }

  let prefix = 'ST';
  const prefUp = preferred.toUpperCase();
  const prefMatch = prefUp.match(/^([A-Z]{2})-/);
  if (prefMatch) prefix = prefMatch[1];

  const [rows] = await conn.query(
    'SELECT staff_id FROM staff WHERE staff_id IS NOT NULL AND TRIM(staff_id) <> \'\''
  );

  let maxNum = 0;
  for (const row of rows || []) {
    const code = trimStr(row.staff_id).toUpperCase();
    const m = code.match(/^([A-Z]{2})-(\d+)$/);
    if (m && m[1] === prefix) {
      const n = parseInt(m[2], 10);
      if (Number.isFinite(n)) maxNum = Math.max(maxNum, n);
    }
  }
  if (preferred) {
    const pm = prefUp.match(/^([A-Z]{2})-(\d+)$/);
    if (pm && pm[1] === prefix) {
      const n = parseInt(pm[2], 10);
      if (Number.isFinite(n)) maxNum = Math.max(maxNum, n);
    }
  }

  let next = maxNum + 1;
  let candidate = `${prefix}-${String(next).padStart(3, '0')}`;
  for (let guard = 0; guard < 5000; guard += 1) {
    if (!(await isStaffHumanIdTaken(conn, candidate))) return candidate;
    next += 1;
    candidate = `${prefix}-${String(next).padStart(3, '0')}`;
  }
  return generateUserUID(prefix);
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

    const roleId = await insertRoleRow(conn, {
      roleName: roleCodeToName(roleCode),
      roleCode,
      description: 'System staff role auto-created from HR Center',
      isSystemRole: true,
    });
    return { ok: true, roleRow: { id: roleId, role_code: roleCode } };
  }

  // Do not allow assigning non-creatable system roles via this endpoint.
  // Non-creatable code: allow assigning an existing *custom* role (is_system_role = 0),
  // otherwise only allow creating a brand-new code that matches CUSTOM_ROLE_CODE_RE.
  const existing = await findActiveRoleByCode(conn, roleCode);
  if (existing) {
    const [[roleMeta]] = await conn.query(
      'SELECT COALESCE(is_system_role, 1) AS is_system_role FROM roles WHERE id = ? LIMIT 1',
      [existing.id]
    );
    const isSystem = Number(roleMeta?.is_system_role) === 1;
    if (!isSystem) {
      return { ok: true, roleRow: existing };
    }
    return {
      ok: false,
      message: `Role must be one of: ${CREATABLE_ROLE_CODES.join(', ')} or a new custom role.`,
    };
  }

  if (!CUSTOM_ROLE_CODE_RE.test(roleCode)) {
    return { ok: false, message: 'Custom role format is invalid.' };
  }

  const roleName = roleCodeToName(roleCode);

  const roleId = await insertRoleRow(conn, {
    roleName: roleName || 'Custom Role',
    roleCode,
    description: 'Custom role created from HR Center',
    isSystemRole: false,
  });
  return { ok: true, roleRow: { id: roleId, role_code: roleCode } };
}

async function lookupRoleIdByCode(conn, roleCode) {
  const [[row]] = await conn.query(
    'SELECT id FROM roles WHERE UPPER(role_code) = ? ORDER BY id DESC LIMIT 1',
    [String(roleCode || '').toUpperCase()],
  );
  return Number(row?.id) || null;
}

/** roles.id has no reliable AUTO_INCREMENT (legacy id=0 row + FK) — allocate next id explicitly. */
async function allocateNextRoleId(conn) {
  const [[row]] = await conn.query('SELECT COALESCE(MAX(id), 0) AS m FROM roles');
  return Number(row?.m || 0) + 1;
}

async function insertRoleRow(conn, { roleName, roleCode, description, isSystemRole }) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const nextId = await allocateNextRoleId(conn);
    try {
      await conn.query(
        `INSERT INTO roles (id, role_name, role_code, description, permissions, is_active, is_system_role)
         VALUES (?, ?, ?, ?, '[]', 1, ?)`,
        [nextId, roleName, roleCode, description, isSystemRole ? 1 : 0],
      );
      return nextId;
    } catch (err) {
      if (err?.code === 'ER_DUP_ENTRY' && attempt < 2) continue;
      throw err;
    }
  }
  return null;
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
    "ALTER TABLE staff ADD COLUMN hr_profile_json JSON NULL",
    "ALTER TABLE staff ADD COLUMN payroll_account_holder VARCHAR(180) NULL",
  ];
  for (const sql of changes) {
    // Compatible with environments where IF NOT EXISTS is unavailable.
    // Duplicate-column errors are intentionally ignored.
    await promisePool.query(sql).catch(() => {});
  }
}

async function ensureProSchoolForStaffFeature(req, res) {
  const role = resolveRequesterRole(req);
  const elevated = role === 'SUPER_ADMIN' || role === 'FULL_SYSTEM_CONTROLLER';
  let schoolId = resolveSchoolId(req);
  if (elevated) {
    const raw = req.query.school_id ?? req.headers['x-babyeyi-school-id'];
    const id = Number(raw);
    if (Number.isFinite(id) && id > 0) schoolId = id;
  }
  if (!schoolId) {
    res.status(400).json({
      success: false,
      message: elevated ? 'school_id is required (query or X-Babyeyi-School-Id header).' : 'School not found in session.',
    });
    return null;
  }
  const [[schoolRow]] = await promisePool.query(
    `SELECT id, school_name, subscription_plan, pro_enabled, pro_end_date
     FROM schools WHERE id = ? AND deleted_at IS NULL LIMIT 1`,
    [schoolId]
  );
  const isPro = computeProAccessEffective(schoolRow || null);
  const liteHrCreator = CREATOR_ROLES.includes(role);
  if (!isPro && !elevated && !liteHrCreator) {
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
  positionLabel,
}) {
  const from = process.env.SMTP_FROM || `"Babyeyi" <${process.env.SMTP_USER}>`;
  const loginUrl = `${process.env.FRONTEND_URL || 'http://localhost:5174'}/login`;
  const safeName = String(firstName || 'there').replace(/</g, '');
  const safeSchool = String(schoolName || 'Your school').replace(/</g, '');
  const roleLine = positionLabel ? `<p style="margin:0;color:#94a3b8;font-size:13px;">${String(positionLabel).replace(/</g, '')}</p>` : '';
  const html = `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:'Segoe UI',Roboto,Arial,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f1f5f9;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" style="max-width:520px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,4,53,0.08);">
        <tr>
          <td style="background:linear-gradient(135deg,#000435 0%,#1e3a5f 100%);padding:28px 32px;text-align:center;">
            <p style="margin:0 0 6px;font-size:11px;letter-spacing:0.2em;text-transform:uppercase;color:#FBBF24;font-weight:600;">Babyeyi</p>
            <h1 style="margin:0;font-size:22px;font-weight:600;color:#ffffff;line-height:1.3;">Your staff portal is ready</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:32px;">
            <p style="margin:0 0 12px;font-size:15px;color:#334155;line-height:1.6;">Hello <strong>${safeName}</strong>,</p>
            <p style="margin:0 0 20px;font-size:14px;color:#64748b;line-height:1.65;">
              <strong style="color:#000435;">${safeSchool}</strong> has created your staff account. Sign in to access your personal dashboard, attendance, and school tools.
            </p>
            ${roleLine}
            <table role="presentation" width="100%" style="margin:24px 0;background:#fffbeb;border:1px solid #fcd34d;border-radius:12px;">
              <tr><td style="padding:20px 22px;">
                <p style="margin:0 0 14px;font-size:11px;font-weight:700;color:#92400e;text-transform:uppercase;letter-spacing:0.08em;">Login credentials</p>
                <table role="presentation" width="100%" style="font-size:14px;color:#334155;">
                  <tr><td style="padding:6px 0;color:#94a3b8;width:110px;vertical-align:top;">Login email</td><td style="padding:6px 0;font-weight:600;color:#000435;">${to}</td></tr>
                  <tr><td style="padding:6px 0;color:#94a3b8;vertical-align:top;">Username</td><td style="padding:6px 0;font-family:ui-monospace,monospace;font-weight:600;color:#000435;">${username}</td></tr>
                  <tr><td style="padding:6px 0;color:#94a3b8;vertical-align:top;">Password</td><td style="padding:6px 0;">
                    <span style="display:inline-block;font-family:ui-monospace,monospace;font-size:15px;font-weight:700;background:#000435;color:#FBBF24;padding:8px 14px;border-radius:8px;letter-spacing:0.05em;">${password}</span>
                  </td></tr>
                </table>
              </td></tr>
            </table>
            <p style="margin:0 0 24px;font-size:13px;color:#94a3b8;line-height:1.5;">For security, change this password after your first login. Keep these details confidential.</p>
            <table role="presentation" cellspacing="0" cellpadding="0"><tr><td style="border-radius:10px;background:#c87800;">
              <a href="${loginUrl}" style="display:inline-block;padding:14px 28px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;">Sign in to Babyeyi</a>
            </td></tr></table>
            <p style="margin:20px 0 0;font-size:12px;color:#cbd5e1;word-break:break-all;">${loginUrl}</p>
          </td>
        </tr>
        <tr>
          <td style="padding:16px 32px 24px;border-top:1px solid #f1f5f9;text-align:center;">
            <p style="margin:0;font-size:11px;color:#94a3b8;">© Babyeyi · School management platform</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
  const text = `Babyeyi — Your staff portal is ready\n\nHello ${safeName},\n\n${safeSchool} has created your account.\n\nLogin email: ${to}\nUsername: ${username}\nTemporary password: ${password}\n\nSign in: ${loginUrl}\n\nChange your password after the first login.`;
  try {
    await transporter.sendMail({
      from,
      to,
      subject: `Your Babyeyi staff login — ${safeSchool}`,
      text,
      html,
    });
    console.log(`[schoolStaff] Welcome email sent to ${to}`);
    return true;
  } catch (e) {
    console.error('[schoolStaff] Email failed:', e.message);
    return false;
  }
}

// ════════════════════════════════════════════════════════════════
// GET /api/school/staff
// ════════════════════════════════════════════════════════════════
router.get('/school/staff', requireRole(SMART_ACCESS_STAFF_ROLES), async (req, res) => {
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
         st.account_enabled,
         st.hr_profile_json,
         st.payroll_account_holder
       FROM staff st
       INNER JOIN users u ON u.id = st.user_id AND u.deleted_at IS NULL
       INNER JOIN roles r ON r.id = u.role_id
       WHERE st.school_id = ?
       ORDER BY u.created_at DESC`,
      [schoolId]
    );

    return res.json({ success: true, data: rows.map((r) => ({ ...r, user_id: r.id })) });
  } catch (err) {
    console.error('GET /api/school/staff:', err);
    return res.status(500).json({ success: false, message: 'Failed to list staff' });
  }
});

// GET /api/school/staff/import-lookup?national_id=&rssb_number=
router.get('/school/staff/import-lookup', requireRole(SMART_ACCESS_STAFF_ROLES), async (req, res) => {
  try {
    const ctx = await ensureProSchoolForStaffFeature(req, res);
    if (!ctx) return;
    const { schoolId } = ctx;
    const nationalId = trimStr(req.query?.national_id || req.query?.nationalId);
    const rssbNumber = trimStr(req.query?.rssb_number || req.query?.rssbNumber);
    const userId = await findStaffUserIdForImport(promisePool, schoolId, { nationalId, rssbNumber });
    if (!userId) {
      return res.status(404).json({ success: false, message: 'No matching employee found.' });
    }
    const row = await loadStaffRowForImport(promisePool, schoolId, userId);
    if (!row) {
      return res.status(404).json({ success: false, message: 'Employee record not found.' });
    }
    return res.json({ success: true, data: row });
  } catch (err) {
    console.error('GET /api/school/staff/import-lookup:', err);
    return res.status(500).json({ success: false, message: 'Import lookup failed' });
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
  const connReleaseState = { connReleased: false };
  try {
    await ensureCoreAuthSchema();
    await ensureStaffProfessionalColumns();
    const body = req.body || {};
    const firstName = trimStr(body.first_name);
    const lastName = trimStr(body.last_name);
    const username = trimStr(body.username);
    let password = body.password != null ? String(body.password) : '';
    const phone = trimStr(body.phone) || null;
    const customRoleName = trimStr(body.custom_role_name || body.role_name || body.job_title);
    const roleCode = trimStr(body.role_code).toUpperCase();
    const staffIdPreferred = trimStr(body.staff_id || body.staff_code) || '';
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
    const payrollAccountHolder = trimStr(body.payroll_account_holder) || null;
    const payrollMobileMoneyPhone = trimStr(body.payroll_mobile_money_phone) || null;
    const hrProfileJson = body.hr_profile_json != null
      ? (typeof body.hr_profile_json === 'string' ? body.hr_profile_json : JSON.stringify(body.hr_profile_json))
      : null;
    const payrollPartTimeRate = body.payroll_part_time_rate ?? null;
    const payrollPartTimeUnit = trimStr(body.payroll_part_time_unit) || null;
    const allowAdvance = body.allow_advance ? 1 : 0;
    const maxAdvanceLimit = body.max_advance_limit ?? null;
    const advanceDeductionType = trimStr(body.advance_deduction_type) || null;
    const advanceDeductionValue = body.advance_deduction_value ?? null;
    const accountEnabled = body.account_enabled === false ? 0 : 1;
    const sendWelcomeEmail = body.send_welcome_email !== false;

    const STAFF_NO_EMAIL_DOMAIN = 'staff.noemail.local';

    if (!firstName || !lastName) {
      return res.status(400).json({ success: false, message: 'First and last name are required.' });
    }
    const emailInput = trimStr(body.email).toLowerCase();
    if (emailInput && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailInput)) {
      return res.status(400).json({ success: false, message: 'Email format is invalid.', field: 'email' });
    }
    const userUid = generateUserUID('ST');
    const email =
      emailInput && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailInput)
        ? emailInput
        : `${userUid.toLowerCase().replace(/[^a-z0-9]/g, '')}@${STAFF_NO_EMAIL_DOMAIN}`;
    const usedPlaceholderEmail = email.endsWith(`@${STAFF_NO_EMAIL_DOMAIN}`);
    if (accountEnabled && (!username || username.length < 3)) {
      return res.status(400).json({ success: false, message: 'Username must be at least 3 characters.' });
    }
    const resolvedUsername = username && username.length >= 3
      ? username
      : `${String(firstName || 'staff').toLowerCase().replace(/[^a-z0-9]/g, '')}${Date.now().toString().slice(-5)}`;
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
    const importCtx = wantsImportUpsert(body)
      ? { body, roleRow, resolvedUsername, staffIdPreferred }
      : null;

    const [[dupEmail]] = await conn.query(
      'SELECT id, deleted_at FROM users WHERE LOWER(email) = ? LIMIT 1',
      [email]
    );
    if (dupEmail && !dupEmail.deleted_at) {
      const emailUserId = Number(dupEmail.id) || null;
      if (emailUserId && importCtx) {
        const redirected = await redirectImportUpsertToUpdate(req, res, conn, schoolId, emailUserId, connReleaseState, importCtx);
        if (redirected) return;
      }
      return res.status(409).json({
        success: false,
        code: 'DUPLICATE_EMAIL',
        field: 'email',
        message: 'An account with this email already exists.',
        existingUserId: emailUserId,
      });
    }
    const [[dupUser]] = await conn.query(
      'SELECT id FROM users WHERE LOWER(username) = ? AND deleted_at IS NULL LIMIT 1',
      [resolvedUsername.toLowerCase()]
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
      [resolvedUsername.toLowerCase()]
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
      const existingUserId = await findStaffUserIdForImport(conn, schoolId, { nationalId });
      if (existingUserId) {
        if (wantsImportUpsert(body)) {
          const redirected = await redirectImportUpsertToUpdate(req, res, conn, schoolId, existingUserId, connReleaseState, importCtx);
          if (redirected) return;
        }
        return res.status(409).json({
          success: false,
          code: 'DUPLICATE_NATIONAL_ID',
          field: 'national_id',
          message: 'This national ID/passport is already in use.',
          existingUserId,
        });
      }
    }

    if (phone) {
      const [[dupPhone]] = await conn.query(
        'SELECT id FROM users WHERE phone = ? AND deleted_at IS NULL LIMIT 1',
        [phone]
      );
      if (dupPhone) {
        const phoneUserId = Number(dupPhone.id) || null;
        if (phoneUserId && wantsImportUpsert(body)) {
          const redirected = await redirectImportUpsertToUpdate(req, res, conn, schoolId, phoneUserId, connReleaseState, importCtx);
          if (redirected) return;
        }
        return res.status(409).json({
          success: false,
          code: 'DUPLICATE_PHONE',
          field: 'phone',
          message: 'An account with this phone number already exists.',
          existingUserId: phoneUserId,
        });
      }
    }

    const staffIdLabel = await allocateUniqueStaffSchoolCode(conn, schoolId, staffIdPreferred);

    const passwordHash = await bcrypt.hash(password, 12);

    await conn.beginTransaction();

    if (dupEmail?.deleted_at) {
      await conn.query('DELETE FROM staff WHERE user_id = ?', [dupEmail.id]);
      await conn.query('DELETE FROM users WHERE id = ?', [dupEmail.id]);
    }

    const [userResult] = await conn.query(
      `INSERT INTO users (
         user_uid, username, email, phone, password_hash,
         first_name, last_name,
         role_id, school_id,
         is_active, is_verified, force_password_change,
         created_at, updated_at
       ) VALUES (?,?,?,?,?,?,?,?,?,?,1,1,NOW(),NOW())`,
      [
        userUid,
        resolvedUsername,
        email,
        phone,
        passwordHash,
        firstName,
        lastName,
        roleRow.id,
        schoolId,
        accountEnabled ? 1 : 0,
      ]
    );

    const newUserId = userResult.insertId;

    const rfidCheck = await assertRfidAvailable(conn, schoolId, body.rfid_uid || body.rfidUid);
    if (!rfidCheck.ok) {
      await conn.rollback();
      return res.status(409).json({ success: false, message: rfidCheck.message, field: 'rfid_uid' });
    }
    if (rfidCheck.rfid) {
      await conn.query('UPDATE users SET rfid_uid = ? WHERE id = ?', [rfidCheck.rfid, newUserId]);
    }

    const staffInsertValues = [
      newUserId, schoolId, staffIdLabel, resolvedUsername, new Date(),
      fullName, gender, dateOfBirth, nationalId, passportNumber, address,
      employmentType, jobTitle, dateOfEmployment, contractStartDate, contractEndDate, employmentStatus,
      department, subDepartment,
      payrollBasicSalary, payrollTransportAllowance, payrollHousingAllowance, payrollMealAllowance,
      payrollOtherAllowances ? JSON.stringify(payrollOtherAllowances) : null,
      payrollTaxPercent, payrollPensionAmount,
      payrollOtherDeductions ? JSON.stringify(payrollOtherDeductions) : null,
      payrollPaymentFrequency, payrollPaymentMethod, payrollBankName, payrollAccountNumber, payrollAccountHolder, payrollMobileMoneyPhone,
      payrollPartTimeRate, payrollPartTimeUnit,
      allowAdvance, maxAdvanceLimit, advanceDeductionType, advanceDeductionValue, accountEnabled,
      hrProfileJson,
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
         payroll_payment_frequency, payroll_payment_method, payroll_bank_name, payroll_account_number, payroll_account_holder, payroll_mobile_money_phone,
         payroll_part_time_rate, payroll_part_time_unit,
         allow_advance, max_advance_limit, advance_deduction_type, advance_deduction_value, account_enabled,
         hr_profile_json
       ) VALUES (${placeholders})`,
      staffInsertValues
    );

    await conn.commit();

    let emailSent = false;
    if (accountEnabled && sendWelcomeEmail && !usedPlaceholderEmail) {
      emailSent = await sendStaffCredentialsEmail({
        to: email,
        firstName,
        schoolName,
        username: resolvedUsername,
        password,
        positionLabel: jobTitle || roleRow.role_name || roleCode,
      });
    }

    let message = 'Staff record created.';
    if (!accountEnabled) {
      message = 'Employee saved. Portal login was not enabled — you can enable it later from the profile.';
    } else if (usedPlaceholderEmail) {
      message = autoPassword
        ? 'Staff created. Add a login email to send welcome credentials.'
        : 'Staff account created.';
    } else if (emailSent) {
      message = autoPassword
        ? 'Staff account created. Login credentials were sent by email.'
        : 'Staff account created. Welcome email sent with login details.';
    } else if (sendWelcomeEmail) {
      message = 'Staff account created. Welcome email could not be sent — share credentials manually.';
    } else {
      message = 'Staff account created. Share login credentials with the employee.';
    }

    return res.status(201).json({
      success: true,
      message,
      data: {
        id: newUserId,
        user_uid: userUid,
        email: usedPlaceholderEmail ? null : email,
        username: resolvedUsername,
        role_code: roleRow.role_code || roleCode,
        password_sent_by_email: emailSent,
        account_enabled: !!accountEnabled,
        staff_id: staffIdLabel,
      },
    });
  } catch (err) {
    await conn.rollback().catch(() => {});
    console.error('POST /api/school/staff:', err);
    const raw = String(err?.message || '');
    if (raw.includes('Duplicate') && raw.toLowerCase().includes('staff_id')) {
      return res.status(409).json({
        success: false,
        code: 'DUPLICATE_STAFF_ID',
        field: 'staff_id',
        message:
          'That staff ID is already used at your school. Please reopen Add Staff to get the next available code, or contact support.',
      });
    }
    if (raw.includes("Duplicate entry '0'") || (raw.includes('Duplicate entry') && raw.includes('PRIMARY'))) {
      return res.status(409).json({
        success: false,
        code: 'ROLE_ID_CONFLICT',
        message:
          'Role assignment failed (database roles table needs repair). Restart the API server, then run: cd BabyeyiSystem/backend && npm run ensure:auth-schema',
      });
    }
    if (raw.includes('Duplicate') && raw.toLowerCase().includes('email')) {
      return res.status(409).json({
        success: false,
        code: 'DUPLICATE_EMAIL',
        field: 'email',
        message: 'An account with this email already exists.',
      });
    }
    return res.status(500).json({ success: false, message: err.message || 'Failed to create staff' });
  } finally {
    if (!connReleaseState.connReleased) conn.release();
  }
});

// ════════════════════════════════════════════════════════════════
// PATCH / PUT /api/school/staff/:userId — profile + payroll fields
// ════════════════════════════════════════════════════════════════
async function handleStaffProfileUpdate(req, res) {
  try {
    await ensureStaffIdentityColumns();
    await ensureStaffProfessionalColumns();
    const ctx = await ensureProSchoolForStaffFeature(req, res);
    if (!ctx) return;
    const { schoolId, schoolName } = ctx;
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
    const username = body.username !== undefined ? trimStr(body.username) : undefined;
    const sendWelcomeEmail = body.send_welcome_email !== false;
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
    let newPasswordPlain = null;
    if (password !== undefined && password.length > 0) {
      if (password.length < 8) {
        return res.status(400).json({ success: false, message: 'Password must be at least 8 characters.' });
      }
      newPasswordPlain = password;
      const passwordHash = await bcrypt.hash(password, 12);
      updates.push('password_hash = ?');
      params.push(passwordHash);
      updates.push('force_password_change = ?');
      params.push(1);
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
    if (body.rfid_uid !== undefined || body.rfidUid !== undefined) {
      const rfidCheck = await assertRfidAvailable(promisePool, schoolId, body.rfid_uid || body.rfidUid, userId);
      if (!rfidCheck.ok) {
        return res.status(409).json({ success: false, message: rfidCheck.message, field: 'rfid_uid' });
      }
      updates.push('rfid_uid = ?');
      params.push(rfidCheck.rfid);
    }

    const staffSet = [];
    const staffParams = [];
    const putStaff = (field, parser = (v) => v) => {
      if (body[field] !== undefined) {
        staffSet.push(`${field} = ?`);
        staffParams.push(parser(body[field]));
      }
    };
    if (username !== undefined) {
      if (!username || username.length < 3) {
        return res.status(400).json({ success: false, message: 'Username must be at least 3 characters.' });
      }
      const [[dupUser]] = await promisePool.query(
        'SELECT id FROM users WHERE LOWER(username) = ? AND id != ? AND deleted_at IS NULL LIMIT 1',
        [username.toLowerCase(), userId]
      );
      if (dupUser) {
        return res.status(409).json({ success: false, message: 'This username is already taken.', field: 'username' });
      }
      updates.push('username = ?');
      params.push(username);
      staffSet.push('username = ?');
      staffParams.push(username);
    }
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
    putStaff('payroll_account_holder', (v) => (v == null ? null : trimStr(v)));
    putStaff('payroll_mobile_money_phone', (v) => (v == null ? null : trimStr(v)));
    putStaff('hr_profile_json', (v) => (v == null ? null : (typeof v === 'string' ? v : JSON.stringify(v))));
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
      params.push(userId);
      await promisePool.query(
        `UPDATE users SET ${updates.join(', ')}, updated_at = NOW() WHERE id = ? AND deleted_at IS NULL`,
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

    let emailSent = false;
    if (newPasswordPlain && sendWelcomeEmail) {
      const [[userRow]] = await promisePool.query(
        `SELECT u.email, u.username, u.first_name, st.job_title, r.role_name
         FROM users u
         INNER JOIN staff st ON st.user_id = u.id AND st.school_id = ?
         INNER JOIN roles r ON r.id = u.role_id
         WHERE u.id = ? AND u.deleted_at IS NULL LIMIT 1`,
        [schoolId, userId]
      );
      const toEmail = userRow?.email;
      if (toEmail && !String(toEmail).includes('staff.noemail.local')) {
        emailSent = await sendStaffCredentialsEmail({
          to: toEmail,
          firstName: userRow.first_name || firstName || row.first_name,
          schoolName,
          username: username || userRow.username,
          password: newPasswordPlain,
          positionLabel: userRow.job_title || userRow.role_name,
        });
      }
    }

    return res.json({
      success: true,
      message: emailSent ? 'Updated. New login credentials were sent by email.' : 'Updated.',
      data: { action: 'updated', password_sent_by_email: emailSent },
    });
  } catch (err) {
    console.error('PATCH/PUT /api/school/staff/:userId', err);
    return res.status(500).json({ success: false, message: err.message || 'Update failed' });
  }
}

router.patch('/school/staff/:userId', requireRole(CREATOR_ROLES), handleStaffProfileUpdate);
router.put('/school/staff/:userId', requireRole(CREATOR_ROLES), handleStaffProfileUpdate);

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
router.put('/school/staff/:userId/identity', requireRole(SMART_ACCESS_STAFF_ROLES), async (req, res) => {
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
    const rfidCheck = await assertRfidAvailable(promisePool, schoolId, body.rfid_uid || body.rfidUid, userId);
    if (!rfidCheck.ok) {
      return res.status(409).json({ success: false, message: rfidCheck.message });
    }
    const rfid = rfidCheck.rfid;
    const fp = trimStr(body.fingerprint_id || body.fingerprintId) || null;
    const remarks = trimStr(body.identity_remarks || body.identityRemarks);
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
  requireRole(SMART_ACCESS_STAFF_ROLES),
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

// ════════════════════════════════════════════════════════════════
// GET/PATCH /api/school/shule-avance-policy — school-wide max advance % (Lite + Pro managers)
// ════════════════════════════════════════════════════════════════
const DEFAULT_SHULE_AVANCE_MAX_PERCENT = 25;

async function ensureSchoolShuleAvancePolicyColumn() {
  await promisePool
    .query(
      `ALTER TABLE schools ADD COLUMN shule_avance_max_percent DECIMAL(5,2) NOT NULL DEFAULT ${DEFAULT_SHULE_AVANCE_MAX_PERCENT}`
    )
    .catch(() => {});
}

router.get('/school/shule-avance-policy', requireRole(CREATOR_ROLES), async (req, res) => {
  try {
    const ctx = await ensureProSchoolForStaffFeature(req, res);
    if (!ctx) return;
    await ensureSchoolShuleAvancePolicyColumn();
    const [[row]] = await promisePool.query(
      `SELECT shule_avance_max_percent FROM schools WHERE id = ? AND deleted_at IS NULL LIMIT 1`,
      [ctx.schoolId]
    );
    const pct = Number(row?.shule_avance_max_percent);
    return res.json({
      success: true,
      data: {
        max_percent: Number.isFinite(pct) && pct > 0 && pct <= 100 ? pct : DEFAULT_SHULE_AVANCE_MAX_PERCENT,
      },
    });
  } catch (err) {
    console.error('GET /school/shule-avance-policy', err);
    return res.status(500).json({ success: false, message: 'Failed to load policy.' });
  }
});

router.patch('/school/shule-avance-policy', requireRole(CREATOR_ROLES), async (req, res) => {
  try {
    const ctx = await ensureProSchoolForStaffFeature(req, res);
    if (!ctx) return;
    const body = req.body || {};
    const raw = body.max_percent ?? body.maxPercent ?? body.shule_avance_max_percent;
    const pct = Number(raw);
    if (!Number.isFinite(pct) || pct <= 0 || pct > 100) {
      return res.status(400).json({ success: false, message: 'max_percent must be between 1 and 100.' });
    }
    await ensureSchoolShuleAvancePolicyColumn();
    await promisePool.query(
      `UPDATE schools SET shule_avance_max_percent = ?, updated_at = NOW() WHERE id = ?`,
      [pct, ctx.schoolId]
    );
    return res.json({ success: true, message: 'Shule Avance policy saved.', data: { max_percent: pct } });
  } catch (err) {
    console.error('PATCH /school/shule-avance-policy', err);
    return res.status(500).json({ success: false, message: 'Failed to save policy.' });
  }
});

module.exports = router;
