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
const CREATABLE_ROLE_CODES = [
  'TEACHER', 'ACCOUNTANT', 'HOD', 'DOS',
  'GATE_OFFICER', 'LIBRARIAN', 'STORE_MANAGER',
];

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
    req.session?.school_id ||
    req.session?.user?.school_id ||
    req.session?.user?.school?.id ||
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

async function ensureStaffIdentityColumns() {
  await promisePool.query('ALTER TABLE users ADD COLUMN rfid_uid VARCHAR(64) NULL').catch(() => {});
  await promisePool.query('ALTER TABLE users ADD COLUMN fingerprint_id VARCHAR(128) NULL').catch(() => {});
  await promisePool.query('ALTER TABLE users ADD COLUMN identity_remarks VARCHAR(512) NULL').catch(() => {});
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
         st.username AS staff_login_username
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
    const body = req.body || {};
    const firstName = trimStr(body.first_name);
    const lastName = trimStr(body.last_name);
    const email = trimStr(body.email).toLowerCase();
    const username = trimStr(body.username);
    let password = body.password != null ? String(body.password) : '';
    const phone = trimStr(body.phone) || null;
    const roleCode = trimStr(body.role_code).toUpperCase();
    const staffIdLabel = trimStr(body.staff_id) || null;

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
    if (!CREATABLE_ROLE_CODES.includes(roleCode)) {
      return res.status(400).json({
        success: false,
        message: `Role must be one of: ${CREATABLE_ROLE_CODES.join(', ')}`,
      });
    }

    const [[roleRow]] = await conn.query(
      'SELECT id FROM roles WHERE UPPER(role_code) = ? AND is_active = 1 LIMIT 1',
      [roleCode]
    );
    if (!roleRow) {
      return res.status(400).json({ success: false, message: 'Unknown or inactive role.' });
    }

    const [[dupEmail]] = await conn.query(
      'SELECT id FROM users WHERE LOWER(email) = ? AND deleted_at IS NULL LIMIT 1',
      [email]
    );
    if (dupEmail) {
      return res.status(409).json({ success: false, message: 'An account with this email already exists.' });
    }

    const [[dupUser]] = await conn.query(
      'SELECT id FROM users WHERE LOWER(username) = ? AND deleted_at IS NULL LIMIT 1',
      [username.toLowerCase()]
    );
    if (dupUser) {
      return res.status(409).json({ success: false, message: 'This username is already taken.' });
    }

    const [[dupStaffUser]] = await conn.query(
      'SELECT id FROM staff WHERE LOWER(username) = ? LIMIT 1',
      [username.toLowerCase()]
    );
    if (dupStaffUser) {
      return res.status(409).json({ success: false, message: 'This staff username is already in use.' });
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

    await conn.query(
      `INSERT INTO staff (user_id, school_id, staff_id, username, created_at)
       VALUES (?,?,?,?,NOW())`,
      [newUserId, schoolId, staffIdLabel, username]
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
        role_code: roleCode,
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
    const isActive = body.is_active !== undefined ? !!body.is_active : undefined;
    const roleCode = body.role_code != null ? trimStr(body.role_code).toUpperCase() : null;

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
    if (isActive !== undefined) {
      updates.push('is_active = ?');
      params.push(isActive ? 1 : 0);
    }
    if (roleCode) {
      if (!CREATABLE_ROLE_CODES.includes(roleCode)) {
        return res.status(400).json({ success: false, message: 'Invalid role.' });
      }
      const [[rr]] = await promisePool.query(
        'SELECT id FROM roles WHERE UPPER(role_code) = ? AND is_active = 1 LIMIT 1',
        [roleCode]
      );
      if (!rr) return res.status(400).json({ success: false, message: 'Unknown role.' });
      updates.push('role_id = ?');
      params.push(rr.id);
    }

    if (!updates.length) {
      return res.json({ success: true, message: 'Nothing to update.' });
    }

    params.push(userId, schoolId);
    await promisePool.query(
      `UPDATE users SET ${updates.join(', ')}, updated_at = NOW() WHERE id = ? AND school_id = ? AND deleted_at IS NULL`,
      params
    );

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
    const rfid = trimStr(body.rfid_uid || body.rfidUid);
    const fp = trimStr(body.fingerprint_id || body.fingerprintId);
    const remarks = trimStr(body.identity_remarks || body.identityRemarks);

    if (!rfid || !fp) {
      return res.status(400).json({ success: false, message: 'RFID UID and Fingerprint ID are required.' });
    }

    const [[dupR]] = await promisePool.query(
      `SELECT id FROM users WHERE school_id = ? AND rfid_uid = ? AND id != ? AND deleted_at IS NULL LIMIT 1`,
      [schoolId, rfid, userId]
    );
    if (dupR) {
      return res.status(409).json({ success: false, message: 'This RFID is already assigned at your school.' });
    }
    const [[dupF]] = await promisePool.query(
      `SELECT id FROM users WHERE school_id = ? AND fingerprint_id = ? AND id != ? AND deleted_at IS NULL LIMIT 1`,
      [schoolId, fp, userId]
    );
    if (dupF) {
      return res.status(409).json({ success: false, message: 'This fingerprint ID is already assigned at your school.' });
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
