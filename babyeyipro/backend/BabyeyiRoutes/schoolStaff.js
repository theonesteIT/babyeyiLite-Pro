// ================================================================
// schoolStaff.js — School Manager creates staff accounts (workers)
//
//   GET  /api/school/staff     — list users linked to this school
//   POST /api/school/staff     — create user + staff row
//
// Allowed creators: SCHOOL_ADMIN, SCHOOL_MANAGER
// Creatable roles: TEACHER, ACCOUNTANT, HOD, DOS, GATE_OFFICER, LIBRARIAN, STORE_MANAGER
// ================================================================

const express = require('express');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const multer = require('multer');
const { promisePool } = require('../config/database');
const { requireRole } = require('../middleware/deoAuth');

const router = express.Router();

// ── Staff photo upload ────────────────────────────────────────────
const STAFF_PHOTO_DIR = path.join(__dirname, '..', 'uploads', 'staff-photos');
if (!fs.existsSync(STAFF_PHOTO_DIR)) fs.mkdirSync(STAFF_PHOTO_DIR, { recursive: true });

const staffPhotoUpload = multer({
  storage: multer.diskStorage({
    destination(_req, _file, cb) { cb(null, STAFF_PHOTO_DIR); },
    filename(_req, file, cb) {
      const extRaw = path.extname(file.originalname || '').toLowerCase();
      const ext = ['.jpg', '.jpeg', '.png', '.webp'].includes(extRaw) ? extRaw : '.jpg';
      cb(null, `staff-${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`);
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter(_req, file, cb) {
    cb(null, ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(file.mimetype));
  },
});

const { sendStaffInvitation, sendStaffPasswordResend } = require('../utils/emailService');

const CREATOR_ROLES = ['SCHOOL_ADMIN', 'SCHOOL_MANAGER'];
const CREATABLE_ROLE_CODES = [
  'TEACHER', 'ACCOUNTANT', 'HOD', 'DOS',
  'GATE_OFFICER', 'LIBRARIAN', 'STORE_MANAGER',
];

function resolveSchoolId(req) {
  return (
    req.session?.school_id ||
    req.session?.user?.school_id ||
    req.session?.user?.school?.id ||
    req.user?.school_id ||
    null
  );
}

function generateUserUID(prefix = 'ST') {
  const ts = Date.now().toString().slice(-6);
  const rnd = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `${prefix}-${ts}${rnd}`;
}

function generateRandomPassword(length = 10) {
  return crypto.randomBytes(Math.ceil(length / 2)).toString('hex').slice(0, length);
}

function trimStr(v) {
  if (v === undefined || v === null) return '';
  return String(v).trim();
}

// ════════════════════════════════════════════════════════════════
// GET /api/school/staff
// ════════════════════════════════════════════════════════════════
router.get('/school/staff', requireRole(CREATOR_ROLES), async (req, res) => {
  try {
    const schoolId = resolveSchoolId(req);
    if (!schoolId) {
      return res.status(400).json({ success: false, message: 'School not found in session.' });
    }

    const [rows] = await promisePool.query(
      `SELECT
         u.id,
         u.user_uid,
         u.email,
         u.username,
         u.phone,
         u.first_name,
         u.last_name,
         u.photo,
         u.district,
         u.province,
         u.sector,
         u.is_active,
         u.created_at,
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
// POST /api/school/staff — multipart/form-data (photo optional)
// ════════════════════════════════════════════════════════════════
router.post('/school/staff',
  requireRole(CREATOR_ROLES),
  (req, res, next) => staffPhotoUpload.single('photo')(req, res, (err) => {
    if (err) return res.status(400).json({ success: false, message: err.message || 'Photo upload failed' });
    next();
  }),
  async (req, res) => {
  const conn = await promisePool.getConnection();
  try {
    const schoolId = resolveSchoolId(req);
    if (!schoolId) {
      return res.status(400).json({ success: false, message: 'School not found in session.' });
    }

    const body = req.body || {};
    const firstName = trimStr(body.first_name);
    const lastName = trimStr(body.last_name);
    const email = trimStr(body.email).toLowerCase();
    let username = trimStr(body.username);
    const phone = trimStr(body.phone) || null;
    const roleCode = trimStr(body.role_code).toUpperCase();
    const rfidUid = trimStr(body.rfid_uid) || null;
    const fingerprintId = trimStr(body.fingerprint_id) || null;
    const identityRemarks = trimStr(body.identity_remarks) || null;

    // Auto-generate credentials
    const password = generateRandomPassword(10);
    const staffIdLabel = generateUserUID('ST');

    if (!firstName || !lastName) {
      return res.status(400).json({ success: false, message: 'First and last name are required.' });
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ success: false, message: 'Valid email is required.' });
    }

    // Auto-generate username if not provided
    if (!username) {
      const base = `${firstName}.${lastName}`.toLowerCase().replace(/[^a-z0-9]/g, '');
      username = base || 'staff';
      
      let isUnique = false;
      let attempt = 0;
      while (!isUnique && attempt < 5) {
        const checkName = (attempt === 0 && username.length >= 3) ? username : `${username}${Math.floor(Math.random() * 900) + 100}`;
        const [[dup]] = await conn.query('SELECT id FROM users WHERE LOWER(username) = ? LIMIT 1', [checkName]);
        if (!dup) {
          username = checkName;
          isUnique = true;
        }
        attempt++;
      }
    }

    if (username.length < 3) {
      return res.status(400).json({ success: false, message: 'Username must be at least 3 characters.' });
    }
    if (!CREATABLE_ROLE_CODES.includes(roleCode)) {
      return res.status(400).json({
        success: false,
        message: `Role must be one of: ${CREATABLE_ROLE_CODES.join(', ')}`,
      });
    }

    // Biometric Uniqueness Check
    if (rfidUid) {
      const [[dupRfid]] = await conn.query('SELECT user_id FROM staff WHERE rfid_uid = ? LIMIT 1', [rfidUid]);
      if (dupRfid) return res.status(409).json({ success: false, message: 'This RFID UID is already registered to another staff member.' });
      const [[dupRfidStud]] = await conn.query('SELECT id FROM students WHERE rfid_uid = ? LIMIT 1', [rfidUid]);
      if (dupRfidStud) return res.status(409).json({ success: false, message: 'This RFID UID is reserved by a student.' });
    }
    if (fingerprintId) {
      const [[dupFp]] = await conn.query('SELECT user_id FROM staff WHERE fingerprint_id = ? LIMIT 1', [fingerprintId]);
      if (dupFp) return res.status(409).json({ success: false, message: 'This Fingerprint ID is already registered to another staff member.' });
      const [[dupFpStud]] = await conn.query('SELECT id FROM students WHERE fingerprint_id = ? LIMIT 1', [fingerprintId]);
      if (dupFpStud) return res.status(409).json({ success: false, message: 'This Fingerprint ID is reserved by a student.' });
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
    const photoUrl = req.file ? `/uploads/staff-photos/${req.file.filename}` : null;

    await conn.beginTransaction();

    const [userResult] = await conn.query(
      `INSERT INTO users (
         user_uid, username, email, phone, password_hash,
         first_name, last_name, photo,
         role_id, school_id,
         is_active, is_verified, force_password_change,
         created_at, updated_at
       ) VALUES (?,?,?,?,?,?,?,?,?,?,1,1,1,NOW(),NOW())`,
      [
        userUid,
        username,
        email,
        phone,
        passwordHash,
        firstName,
        lastName,
        photoUrl,
        roleRow.id,
        schoolId,
      ]
    );

    const newUserId = userResult.insertId;

    await conn.query(
      `INSERT INTO staff (user_id, school_id, staff_id, username, created_at, rfid_uid, fingerprint_id, identity_remarks)
       VALUES (?,?,?,?,NOW(),?,?,?)`,
      [newUserId, schoolId, staffIdLabel, username, rfidUid, fingerprintId, identityRemarks]
    );

    await conn.commit();

    // Send the invitation email
    await sendStaffInvitation(email, firstName, lastName, staffIdLabel, username, password);

    return res.status(201).json({
      success: true,
      message: 'Staff account created and invitation sent.',
      data: {
        id: newUserId,
        user_uid: userUid,
        staff_id: staffIdLabel,
        email,
        username,
        role_code: roleCode,
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
// POST /api/school/staff/:id/resend-invite
// ════════════════════════════════════════════════════════════════
router.post('/school/staff/:id/resend-invite', requireRole(CREATOR_ROLES), async (req, res) => {
  try {
    const schoolId = resolveSchoolId(req);
    const staffUserId = req.params.id;

    if (!schoolId) {
      return res.status(400).json({ success: false, message: 'School not found in session.' });
    }

    // Verify staff belongs to this school
    const [[staffRow]] = await promisePool.query(
      `SELECT st.user_id, u.email, u.first_name, u.username
       FROM staff st
       INNER JOIN users u ON u.id = st.user_id
       WHERE (u.user_uid = ? OR u.id = ? OR st.staff_id = ?) AND st.school_id = ? LIMIT 1`,
      [staffUserId, staffUserId, staffUserId, schoolId]
    );

    if (!staffRow) {
      return res.status(404).json({ success: false, message: 'Staff member not found in your school.' });
    }

    const newPassword = generateRandomPassword(10);
    const newPasswordHash = await bcrypt.hash(newPassword, 12);

    await promisePool.query(
      'UPDATE users SET password_hash = ?, force_password_change = 1, updated_at = NOW() WHERE id = ?',
      [newPasswordHash, staffRow.user_id]
    );

    // Send the new credentials
    await sendStaffPasswordResend(staffRow.email, staffRow.first_name, staffRow.username, newPassword);

    return res.json({ success: true, message: 'New invitation with fresh credentials sent.' });
  } catch (err) {
    console.error('POST /api/school/staff/resend-invite:', err);
    return res.status(500).json({ success: false, message: 'Failed to resend invitation.' });
  }
});

// ════════════════════════════════════════════════════════════════
// PUT /api/school/staff/:id
// ════════════════════════════════════════════════════════════════
router.put('/school/staff/:id', requireRole(CREATOR_ROLES), async (req, res) => {
  const conn = await promisePool.getConnection();
  try {
    const schoolId = resolveSchoolId(req);
    const staffId = req.params.id; // Usually the 'user.id' or 'user.user_uid'
    
    if (!schoolId) {
      return res.status(400).json({ success: false, message: 'School not found in session.' });
    }

    // Verify staff belongs to this school
    const [[staffRow]] = await conn.query(
      `SELECT st.user_id, st.id as staff_row_id
       FROM staff st
       INNER JOIN users u ON u.id = st.user_id
       WHERE (u.user_uid = ? OR u.id = ? OR st.staff_id = ?) AND st.school_id = ? LIMIT 1`,
      [staffId, staffId, staffId, schoolId]
    );

    if (!staffRow) {
      return res.status(404).json({ success: false, message: 'Staff member not found in your school.' });
    }

    const body = req.body || {};
    const rfidUid = trimStr(body.rfid_uid) || null;
    const fingerprintId = trimStr(body.fingerprint_id) || null;
    const identityRemarks = trimStr(body.identity_remarks) || null;
    
    // Biometric Uniqueness Check
    if (rfidUid) {
      const [[dupRfid]] = await conn.query('SELECT user_id FROM staff WHERE rfid_uid = ? AND user_id != ? LIMIT 1', [rfidUid, staffRow.user_id]);
      if (dupRfid) return res.status(409).json({ success: false, message: 'This RFID UID is already registered to another staff member.' });
      const [[dupRfidStud]] = await conn.query('SELECT id FROM students WHERE rfid_uid = ? LIMIT 1', [rfidUid]);
      if (dupRfidStud) return res.status(409).json({ success: false, message: 'This RFID UID is reserved by a student.' });
    }
    if (fingerprintId) {
      const [[dupFp]] = await conn.query('SELECT user_id FROM staff WHERE fingerprint_id = ? AND user_id != ? LIMIT 1', [fingerprintId, staffRow.user_id]);
      if (dupFp) return res.status(409).json({ success: false, message: 'This Fingerprint ID is already registered to another staff member.' });
      const [[dupFpStud]] = await conn.query('SELECT id FROM students WHERE fingerprint_id = ? LIMIT 1', [fingerprintId]);
      if (dupFpStud) return res.status(409).json({ success: false, message: 'This Fingerprint ID is reserved by a student.' });
    }

    await conn.query(
      'UPDATE staff SET rfid_uid = ?, fingerprint_id = ?, identity_remarks = ? WHERE user_id = ? AND school_id = ?',
      [rfidUid, fingerprintId, identityRemarks, staffRow.user_id, schoolId]
    );
    
    return res.json({ success: true, message: 'Staff biometric profile updated.' });
  } catch (err) {
    console.error('PUT /api/school/staff/:id:', err);
    return res.status(500).json({ success: false, message: err.message || 'Failed to update staff profile.' });
  } finally {
    conn.release();
  }
});

// ════════════════════════════════════════════════════════════════
// PUT /api/school/staff/:id/identity/photo
// ════════════════════════════════════════════════════════════════
router.put('/school/staff/:id/identity/photo',
  requireRole(CREATOR_ROLES),
  (req, res, next) => staffPhotoUpload.single('photo')(req, res, (err) => {
    if (err) return res.status(400).json({ success: false, message: err.message || 'Photo upload failed' });
    next();
  }),
  async (req, res) => {
    try {
      const schoolId = resolveSchoolId(req);
      const staffId = req.params.id; // user_uid or user.id

      if (!req.file) {
        return res.status(400).json({ success: false, message: 'No photo provided.' });
      }

      const [[staffRow]] = await promisePool.query(
        `SELECT st.user_id, u.photo
         FROM staff st
         INNER JOIN users u ON u.id = st.user_id
         WHERE (u.user_uid = ? OR u.id = ? OR st.staff_id = ?) AND st.school_id = ? LIMIT 1`,
        [staffId, staffId, staffId, schoolId]
      );

      if (!staffRow) {
        return res.status(404).json({ success: false, message: 'Staff member not found.' });
      }

      const photoUrl = `/uploads/staff-photos/${req.file.filename}`;

      await promisePool.query(
        'UPDATE users SET photo = ?, updated_at = NOW() WHERE id = ?',
        [photoUrl, staffRow.user_id]
      );

      return res.json({ success: true, message: 'Staff photo uploaded securely.', photo_url: photoUrl });
    } catch (err) {
      console.error('PUT /api/school/staff/:id/identity/photo:', err);
      return res.status(500).json({ success: false, message: 'Internal server error while saving photo.' });
    }
  }
);

module.exports = router;

