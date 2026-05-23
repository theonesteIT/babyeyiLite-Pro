const express = require('express');
const { promisePool } = require('../config/database');
const { requireRole } = require('../middleware/deoAuth');
const { notifyStudentParentsPermission } = require('./parentStudentNotifications');

const router = express.Router();
const SCHOOL_ROLES = ['SCHOOL_ADMIN', 'SCHOOL_MANAGER', 'DOS', 'REGISTRAR', 'HOD', 'TEACHER', 'DISCIPLINE', 'DISCIPLINE_STAFF'];
const APPROVAL_ROLES = ['SCHOOL_ADMIN', 'SCHOOL_MANAGER', 'DOS', 'REGISTRAR', 'HOD', 'DISCIPLINE', 'DISCIPLINE_STAFF'];

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
  await promisePool.query(`ALTER TABLE student_permissions ADD COLUMN actual_out_at DATETIME NULL`).catch(() => {});
  await promisePool.query(`ALTER TABLE student_permissions ADD COLUMN actual_return_at DATETIME NULL`).catch(() => {});
  await promisePool.query(`ALTER TABLE student_permissions ADD COLUMN gate_scan_state ENUM('NOT_USED','OUT','BACK','EXCEEDED') NOT NULL DEFAULT 'NOT_USED'`).catch(() => {});
  await promisePool.query(`ALTER TABLE student_permissions ADD COLUMN exceeded_minutes INT UNSIGNED NOT NULL DEFAULT 0`).catch(() => {});
  await promisePool.query(`ALTER TABLE student_permissions ADD COLUMN last_gate_action_at DATETIME NULL`).catch(() => {});

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

    const { student_id, starts_at, ends_at, reason, permission_type, notify_parent } = req.body;

    if (!student_id || !starts_at || !ends_at) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    const studentId = Number(student_id);
    const safeType = ['MEDICAL', 'FAMILY', 'OFFICIAL', 'OTHER'].includes(String(permission_type || '').toUpperCase())
      ? String(permission_type || '').toUpperCase()
      : 'OTHER';

    // Default status to APPROVED if the user has approval role, else PENDING
    const userRole = String(req.user?.role_code || req.session?.user?.role_code || '').toUpperCase();
    const initialStatus = APPROVAL_ROLES.includes(userRole) ? 'APPROVED' : 'PENDING';
    const approvedBy = initialStatus === 'APPROVED' ? userId : null;

    const [[studentRow]] = await promisePool.query(
      `SELECT s.id, s.first_name, s.last_name, sc.school_name
       FROM students s
       LEFT JOIN schools sc ON sc.id = s.school_id
       WHERE s.id = ? AND s.school_id = ?
       LIMIT 1`,
      [studentId, schoolId]
    );
    if (!studentRow) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    const [result] = await promisePool.query(
      `INSERT INTO student_permissions (school_id, student_id, starts_at, ends_at, reason, permission_type, status, requested_by_user_id, approved_by_user_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [schoolId, studentId, starts_at, ends_at, reason || null, safeType, initialStatus, userId, approvedBy]
    );

    const shouldNotify = notify_parent !== false && notify_parent !== 'false' && notify_parent !== 0;
    let parent_notifications = null;
    if (shouldNotify) {
      const studentName =
        `${String(studentRow.first_name || '').trim()} ${String(studentRow.last_name || '').trim()}`.trim() ||
        'Your child';
      try {
        parent_notifications = await notifyStudentParentsPermission(studentId, {
          permissionId: result.insertId,
          schoolId,
          schoolName: studentRow.school_name,
          studentName,
          permissionType: safeType,
          status: initialStatus,
          startsAt: starts_at,
          endsAt: ends_at,
          reason: reason || null,
        });
      } catch (notifyErr) {
        console.warn('[POST /permissions] parent notify:', notifyErr.message);
        parent_notifications = { error: notifyErr.message };
      }
    }

    res.status(201).json({
      success: true,
      message: initialStatus === 'APPROVED' ? 'Permission granted' : 'Permission request submitted',
      permission_id: result.insertId,
      parent_notifications,
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

    let parent_notifications = null;
    if (status === 'APPROVED' && req.body?.notify_parent !== false) {
      const [[perm]] = await promisePool.query(
        `SELECT p.id, p.student_id, p.starts_at, p.ends_at, p.reason, p.permission_type, p.status,
                s.first_name, s.last_name, sc.school_name
         FROM student_permissions p
         JOIN students s ON s.id = p.student_id
         LEFT JOIN schools sc ON sc.id = p.school_id
         WHERE p.id = ? AND p.school_id = ?
         LIMIT 1`,
        [req.params.id, schoolId]
      );
      if (perm) {
        const studentName =
          `${String(perm.first_name || '').trim()} ${String(perm.last_name || '').trim()}`.trim() ||
          'Your child';
        try {
          parent_notifications = await notifyStudentParentsPermission(perm.student_id, {
            permissionId: perm.id,
            schoolId,
            schoolName: perm.school_name,
            studentName,
            permissionType: perm.permission_type,
            status: 'APPROVED',
            startsAt: perm.starts_at,
            endsAt: perm.ends_at,
            reason: perm.reason,
          });
        } catch (notifyErr) {
          console.warn('[PATCH /permissions/status] parent notify:', notifyErr.message);
        }
      }
    }

    res.json({
      success: true,
      message: `Permission ${status.toLowerCase()} successfully`,
      parent_notifications,
    });
  } catch (err) {
    console.error('PATCH /api/permissions/status:', err);
    res.status(500).json({ success: false, message: 'Failed to update permission' });
  }
});

// PUT /api/permissions/:id
router.put('/permissions/:id', requireRole(SCHOOL_ROLES), async (req, res) => {
  try {
    await ensureStudentPermissionTables();
    const schoolId = resolveSchoolId(req);
    if (!schoolId) return res.status(400).json({ success: false, message: 'Invalid session' });

    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ success: false, message: 'Invalid permission id' });

    const { starts_at, ends_at, reason, permission_type } = req.body || {};
    if (!starts_at || !ends_at) {
      return res.status(400).json({ success: false, message: 'starts_at and ends_at are required' });
    }

    const [[existing]] = await promisePool.query(
      `SELECT id, status FROM student_permissions WHERE id = ? AND school_id = ? LIMIT 1`,
      [id, schoolId]
    );
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Permission record not found' });
    }
    if (String(existing.status || '').toUpperCase() === 'CANCELLED') {
      return res.status(400).json({ success: false, message: 'Cancelled permission cannot be edited' });
    }

    const safeType = ['MEDICAL', 'FAMILY', 'OFFICIAL', 'OTHER'].includes(String(permission_type || '').toUpperCase())
      ? String(permission_type || '').toUpperCase()
      : 'OTHER';

    await promisePool.query(
      `UPDATE student_permissions
       SET starts_at = ?, ends_at = ?, reason = ?, permission_type = ?
       WHERE id = ? AND school_id = ?`,
      [starts_at, ends_at, reason || null, safeType, id, schoolId]
    );

    return res.json({ success: true, message: 'Permission updated successfully' });
  } catch (err) {
    console.error('PUT /api/permissions/:id:', err);
    return res.status(500).json({ success: false, message: 'Failed to update permission' });
  }
});

router.ensureStudentPermissionTables = ensureStudentPermissionTables;
module.exports = router;
