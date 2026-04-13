'use strict';

/**
 * GET /api/notifications/statistics
 * Aggregates in-app notification counts for the school manager console (transfer queue, etc.).
 */
const express = require('express');
const router = express.Router();
const { executeQuery } = require('../config/database');

function resolveSchoolId(req) {
  const v =
    req.user?.school_id ||
    req.user?.school?.id ||
    req.session?.user?.school_id ||
    req.session?.user?.school?.id ||
    req.session?.school_id;
  return v ? Number(v) : null;
}

router.get('/statistics', async (req, res) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    const schoolId = resolveSchoolId(req);
    if (!schoolId) {
      return res.status(403).json({ success: false, message: 'No school context' });
    }
    const role = String(req.user.role_code || '').toUpperCase();
    if (
      !['SCHOOL_ADMIN', 'SCHOOL_MANAGER', 'SUPER_ADMIN', 'FULL_SYSTEM_CONTROLLER', 'DEO'].includes(
        role
      )
    ) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    let total = 0;
    let pending = 0;
    try {
      const rows = await executeQuery(
        `SELECT COUNT(*) AS c,
                COALESCE(SUM(CASE WHEN is_read = 0 THEN 1 ELSE 0 END), 0) AS unread
         FROM student_transfer_notifications
         WHERE school_id = ?`,
        [schoolId]
      );
      const row = Array.isArray(rows) ? rows[0] : rows;
      total = Number(row?.c ?? 0);
      pending = Number(row?.unread ?? 0);
    } catch (e) {
      if (!String(e.message || '').includes('student_transfer_notifications')) throw e;
    }

    const sent = Math.max(0, total - pending);
    res.json({
      success: true,
      data: {
        total_notifications: total,
        sent_count: sent,
        failed_count: 0,
        pending_count: pending,
        email_count: 0,
        sms_count: 0,
        both_count: 0,
      },
    });
  } catch (err) {
    console.error('[notifications/statistics]', err.message);
    res.status(500).json({ success: false, message: 'Failed to load notification statistics' });
  }
});

module.exports = router;
