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
const { promisePool } = require('../config/database');
const { requireRole } = require('../middleware/deoAuth');

const router = express.Router();

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
    null
  );
}

function generateUserUID(prefix = 'ST') {
  const ts = Date.now().toString().slice(-6);
  const rnd = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `${prefix}-${ts}${rnd}`;
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
// POST /api/school/staff
// Body: first_name, last_name, email, username, password, phone?,
//       role_code, staff_id? (optional display id)
// ════════════════════════════════════════════════════════════════
router.post('/school/staff', requireRole(CREATOR_ROLES), async (req, res) => {
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
    const username = trimStr(body.username);
    const password = body.password != null ? String(body.password) : '';
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
    if (!password || password.length < 8) {
      return res.status(400).json({ success: false, message: 'Password must be at least 8 characters.' });
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
       ) VALUES (?,?,?,?,?,?,?,?,?,1,1,0,NOW(),NOW())`,
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

    return res.status(201).json({
      success: true,
      message: 'Staff account created.',
      data: {
        id: newUserId,
        user_uid: userUid,
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

module.exports = router;
