const express = require('express');
const { promisePool } = require('../config/database');
const { requireRole } = require('../middleware/deoAuth');

const router = express.Router();
const SCHOOL_ROLES = ['SCHOOL_ADMIN', 'SCHOOL_MANAGER', 'DOS', 'REGISTRAR', 'HOD', 'TEACHER'];
const APPROVAL_ROLES = ['SCHOOL_ADMIN', 'SCHOOL_MANAGER', 'DOS', 'REGISTRAR'];

let tablesReady = false;

async function ensureStudentPermissionTables() {
  if (tablesReady) return;

  await promisePool.query(`
    CREATE TABLE IF NOT EXISTS student_permissions (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      school_id INT UNSIGNED NOT NULL,
      student_id INT UNSIGNED NOT NULL,
      starts_at DATETIME NOT NULL,
      ends_at DATETIME NOT NULL,
      reason TEXT NULL,
      permission_type ENUM('MEDICAL', 'FAMILY', 'OFFICIAL', 'OTHER') DEFAULT 'OTHER',
      status ENUM('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED') DEFAULT 'PENDING',
      requested_by_user_id INT UNSIGNED NOT NULL,
      approved_by_user_id INT UNSIGNED NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_perm_school (school_id),
      INDEX idx_perm_student (student_id),
      INDEX idx_perm_dates (starts_at, ends_at),
      INDEX idx_perm_status (status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  tablesReady = true;
  console.log('✅ Student Permission Tables Verified');
}

function resolveSchoolId(req) {
  return (
    req.session?.school_id ||
    req.session?.user?.school_id ||
    req.user?.school_id ||
    null
  );
}

function resolveUserId(req) {
  return req.session?.userId || req.session?.user?.id || req.user?.id || null;
}

// ════════════════════════════════════════════════════════════════
// PERMISSION MANAGEMENT
// ════════════════════════════════════════════════════════════════

// GET /api/permissions
router.get('/permissions', requireRole(SCHOOL_ROLES), async (req, res) => {
  try {
    await ensureStudentPermissionTables();
    const schoolId = resolveSchoolId(req);
    if (!schoolId) return res.status(400).json({ success: false, message: 'Invalid session' });

    const { status, student_id } = req.query;
    let sql = `
      SELECT p.*, s.first_name, s.last_name, s.student_uid, s.class_name,
             u_req.first_name as req_first, u_req.last_name as req_last,
             u_app.first_name as app_first, u_app.last_name as app_last
      FROM student_permissions p
      JOIN students s ON p.student_id = s.id
      JOIN users u_req ON p.requested_by_user_id = u_req.id
      LEFT JOIN users u_app ON p.approved_by_user_id = u_app.id
      WHERE p.school_id = ?
    `;
    const params = [schoolId];

    if (status) {
      sql += ' AND p.status = ?';
      params.push(status);
    }
    if (student_id) {
      sql += ' AND p.student_id = ?';
      params.push(student_id);
    }

    sql += ' ORDER BY p.created_at DESC LIMIT 500';

    const [rows] = await promisePool.query(sql, params);
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('GET /api/permissions:', err);
    res.status(500).json({ success: false, message: 'Failed to load permissions' });
  }
});

// POST /api/permissions
router.post('/permissions', requireRole(SCHOOL_ROLES), async (req, res) => {
  try {
    await ensureStudentPermissionTables();
    const schoolId = resolveSchoolId(req);
    const userId = resolveUserId(req);
    if (!schoolId) return res.status(400).json({ success: false, message: 'Invalid session' });

    const { student_id, starts_at, ends_at, reason, permission_type } = req.body;

    if (!student_id || !starts_at || !ends_at) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    // Default status to APPROVED if the user has approval role, else PENDING
    const userRole = req.user?.role_code || req.session?.user?.role_code;
    const initialStatus = APPROVAL_ROLES.includes(userRole) ? 'APPROVED' : 'PENDING';
    const approvedBy = initialStatus === 'APPROVED' ? userId : null;

    const [result] = await promisePool.query(
      `INSERT INTO student_permissions (school_id, student_id, starts_at, ends_at, reason, permission_type, status, requested_by_user_id, approved_by_user_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [schoolId, student_id, starts_at, ends_at, reason || null, permission_type || 'OTHER', initialStatus, userId, approvedBy]
    );

    res.status(201).json({ 
      success: true, 
      message: initialStatus === 'APPROVED' ? 'Permission granted' : 'Permission request submitted',
      permission_id: result.insertId 
    });
  } catch (err) {
    console.error('POST /api/permissions:', err);
    res.status(500).json({ success: false, message: 'Failed to create permission' });
  }
});

// PATCH /api/permissions/:id/status
router.patch('/permissions/:id/status', requireRole(APPROVAL_ROLES), async (req, res) => {
  try {
    await ensureStudentPermissionTables();
    const schoolId = resolveSchoolId(req);
    const userId = resolveUserId(req);
    if (!schoolId) return res.status(400).json({ success: false, message: 'Invalid session' });

    const { status } = req.body; // APPROVED, REJECTED, CANCELLED
    if (!['APPROVED', 'REJECTED', 'CANCELLED'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    const [result] = await promisePool.query(
      `UPDATE student_permissions SET status = ?, approved_by_user_id = ?
       WHERE id = ? AND school_id = ?`,
      [status, status === 'APPROVED' ? userId : null, req.params.id, schoolId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Permission record not found' });
    }

    res.json({ success: true, message: `Permission ${status.toLowerCase()} successfully` });
  } catch (err) {
    console.error('PATCH /api/permissions/status:', err);
    res.status(500).json({ success: false, message: 'Failed to update permission' });
  }
});

router.ensureStudentPermissionTables = ensureStudentPermissionTables;
module.exports = router;
