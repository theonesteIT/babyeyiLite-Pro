'use strict';

const express = require('express');
const { promisePool } = require('../config/database');
const { requireRole } = require('../middleware/deoAuth');

const router = express.Router();
const PORTAL_ROLES = ['TEACHER', 'HOD', 'DOS', 'SCHOOL_ADMIN', 'SCHOOL_MANAGER', 'ACCOUNTANT'];

function resolveUserId(req) {
  return req.session?.userId || req.session?.user?.id || req.user?.id || null;
}

function resolveSchoolId(req) {
  return (
    req.session?.school_id ||
    req.session?.user?.school_id ||
    req.user?.school_id ||
    null
  );
}

let tableReady = false;
async function ensureShuleTable() {
  if (tableReady) return;
  await promisePool.query(`
    CREATE TABLE IF NOT EXISTS pro_shule_avance_applications (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      user_id INT UNSIGNED NOT NULL,
      school_id INT UNSIGNED NOT NULL,
      amount_requested DECIMAL(14,2) NOT NULL,
      purpose TEXT NULL,
      repayment_term_months INT NOT NULL DEFAULT 6,
      status ENUM('pending','reviewed','disbursed','completed','cancelled') NOT NULL DEFAULT 'pending',
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      KEY idx_shule_user (user_id),
      KEY idx_shule_school (school_id),
      KEY idx_shule_status (status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
  tableReady = true;
}

router.use(async (_req, res, next) => {
  try {
    await ensureShuleTable();
    next();
  } catch (e) {
    console.error('[shule-avance] init:', e);
    res.status(500).json({ success: false, message: 'Service unavailable' });
  }
});

router.get('/shule-avance/status', requireRole(PORTAL_ROLES), async (req, res) => {
  try {
    const userId = resolveUserId(req);
    const schoolId = resolveSchoolId(req);
    if (!schoolId) return res.status(400).json({ success: false, message: 'No school linked' });

    const [rows] = await promisePool.query(
      `SELECT id, amount_requested, repayment_term_months, status, purpose, created_at
       FROM pro_shule_avance_applications
       WHERE user_id = ? AND school_id = ?
       ORDER BY created_at DESC`,
      [userId, schoolId]
    );

    const active = rows.find((r) => ['pending', 'reviewed', 'disbursed'].includes(r.status));
    const history = rows.filter((r) => ['completed', 'cancelled', 'disbursed'].includes(r.status) || r.status === 'completed');

    res.json({
      success: true,
      has_active_application: !!active,
      active_loan: active || null,
      history: history.length ? history : rows,
    });
  } catch (err) {
    console.error('GET /services/shule-avance/status:', err);
    res.status(500).json({ success: false, message: 'Failed to load status' });
  }
});

router.post('/shule-avance/apply', requireRole(PORTAL_ROLES), async (req, res) => {
  try {
    const userId = resolveUserId(req);
    const schoolId = resolveSchoolId(req);
    if (!schoolId) return res.status(400).json({ success: false, message: 'No school linked' });

    const { amount_requested, purpose, repayment_term_months } = req.body;
    const amt = Number(amount_requested);
    if (!amt || amt <= 0) return res.status(400).json({ success: false, message: 'Invalid amount' });

    const [existing] = await promisePool.query(
      `SELECT id FROM pro_shule_avance_applications
       WHERE user_id = ? AND school_id = ? AND status IN ('pending','reviewed','disbursed')
       LIMIT 1`,
      [userId, schoolId]
    );
    if (existing.length) {
      return res.status(409).json({ success: false, message: 'You already have an active application.' });
    }

    const term = Math.min(36, Math.max(3, Number(repayment_term_months) || 6));
    const [r] = await promisePool.query(
      `INSERT INTO pro_shule_avance_applications
       (user_id, school_id, amount_requested, purpose, repayment_term_months, status)
       VALUES (?, ?, ?, ?, ?, 'pending')`,
      [userId, schoolId, amt, String(purpose || '').slice(0, 2000), term]
    );

    res.json({ success: true, message: 'Application submitted', id: r.insertId });
  } catch (err) {
    console.error('POST /services/shule-avance/apply:', err);
    res.status(500).json({ success: false, message: 'Application failed' });
  }
});

router.delete('/shule-avance/cancel/:id', requireRole(PORTAL_ROLES), async (req, res) => {
  try {
    const userId = resolveUserId(req);
    const schoolId = resolveSchoolId(req);
    const id = Number(req.params.id);
    if (!schoolId || !id) return res.status(400).json({ success: false, message: 'Invalid request' });

    const [r] = await promisePool.query(
      `UPDATE pro_shule_avance_applications SET status = 'cancelled'
       WHERE id = ? AND user_id = ? AND school_id = ? AND status = 'pending'`,
      [id, userId, schoolId]
    );
    if (!r.affectedRows) {
      return res.status(404).json({ success: false, message: 'Nothing to cancel' });
    }
    res.json({ success: true, message: 'Cancelled' });
  } catch (err) {
    console.error('DELETE /services/shule-avance/cancel:', err);
    res.status(500).json({ success: false, message: 'Cancel failed' });
  }
});

module.exports = router;
