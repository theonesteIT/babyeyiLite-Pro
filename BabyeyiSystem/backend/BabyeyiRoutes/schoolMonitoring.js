'use strict';

const express = require('express');
const { promisePool } = require('../config/database');
const { requireRole } = require('../middleware/deoAuth');
const { ensureSchoolMonitoringTables } = require('../utils/schoolMonitoringSchema');
const {
  sessionPresenceStatus,
  parseDevice,
  recordAuditTrail,
  closeUserSessions,
} = require('../utils/schoolMonitoringHelpers');

const router = express.Router();
router.use(requireRole('SUPER_ADMIN', 'FULL_SYSTEM_CONTROLLER'));

const query = async (sql, params = []) => {
  const [rows] = await promisePool.query(sql, params);
  return rows;
};

router.use(async (_req, res, next) => {
  try {
    await ensureSchoolMonitoringTables();
    next();
  } catch (e) {
    res.status(500).json({ success: false, message: e.message || 'Monitoring storage init failed' });
  }
});

function formatName(r) {
  return `${r?.first_name || ''} ${r?.last_name || ''}`.trim() || r?.email || 'Unknown';
}

// GET /api/superadmin/school-monitor/overview
router.get('/overview', async (_req, res) => {
  try {
    const [[onlineUsers]] = await promisePool.query(
      `SELECT COUNT(DISTINCT us.user_id) AS c FROM user_sessions us
       INNER JOIN users u ON u.id = us.user_id AND u.deleted_at IS NULL
       WHERE us.logout_at IS NULL AND us.last_activity_at >= DATE_SUB(NOW(), INTERVAL 20 MINUTE)`
    );
    const [[schoolsOnline]] = await promisePool.query(
      `SELECT COUNT(DISTINCT school_id) AS c FROM user_sessions
       WHERE school_id IS NOT NULL AND logout_at IS NULL
         AND last_activity_at >= DATE_SUB(NOW(), INTERVAL 20 MINUTE)`
    );
    const [[districtsActive]] = await promisePool.query(
      `SELECT COUNT(DISTINCT s.district) AS c
       FROM user_sessions us
       INNER JOIN schools s ON s.id = us.school_id
       WHERE us.last_activity_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR) AND s.district IS NOT NULL`
    );
    const [[activitiesToday]] = await promisePool.query(
      `SELECT COUNT(*) AS c FROM activity_logs WHERE DATE(created_at) = CURDATE()`
    );
    const [[suspicious]] = await promisePool.query(
      `SELECT COUNT(*) AS c FROM suspicious_activities WHERE status IN ('Pending','Active')`
    );
    const [[disabled]] = await promisePool.query(
      `SELECT COUNT(*) AS c FROM users WHERE deleted_at IS NULL AND (is_active = 0 OR is_locked = 1)`
    );
    const [[logins]] = await promisePool.query(
      `SELECT
         SUM(outcome = 'success') AS success_count,
         SUM(outcome != 'success') AS failed_count
       FROM login_attempts WHERE created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)`
    );
    const [mostActive] = await promisePool.query(
      `SELECT s.school_name AS name, COUNT(al.id) AS cnt
       FROM activity_logs al
       INNER JOIN schools s ON s.id = al.school_id
       WHERE al.created_at >= DATE_SUB(NOW(), INTERVAL 1 DAY)
       GROUP BY s.id, s.school_name
       ORDER BY cnt DESC LIMIT 1`
    );

    res.json({
      success: true,
      cards: {
        onlineUsers: Number(onlineUsers?.c || 0),
        schoolsOnline: Number(schoolsOnline?.c || 0),
        activeDistricts: Number(districtsActive?.c || 0),
        activitiesToday: Number(activitiesToday?.c || 0),
        suspiciousActivities: Number(suspicious?.c || 0),
        disabledAccounts: Number(disabled?.c || 0),
        loginSuccess: Number(logins?.success_count || 0),
        loginFailed: Number(logins?.failed_count || 0),
        mostActiveSchool: mostActive[0]?.name || '—',
      },
    });
  } catch (e) {
    console.error('[school-monitor/overview]', e);
    res.status(500).json({ success: false, message: e.message });
  }
});

async function tableExists(tableName) {
  const rows = await query(
    `SELECT 1 AS ok FROM information_schema.tables
     WHERE table_schema = DATABASE() AND table_name = ? LIMIT 1`,
    [tableName]
  );
  return rows.length > 0;
}

// GET /api/superadmin/school-monitor/filters/provinces
router.get('/filters/provinces', async (_req, res) => {
  try {
    const names = new Set();
    const schoolRows = await query(
      `SELECT DISTINCT province AS name FROM schools
       WHERE deleted_at IS NULL AND province IS NOT NULL AND TRIM(province) != ''
       ORDER BY province`
    );
    schoolRows.forEach((r) => { if (r.name) names.add(r.name); });

    if (await tableExists('rwanda_locations')) {
      try {
        const locRows = await query(
          `SELECT DISTINCT province AS name FROM rwanda_locations
           WHERE province IS NOT NULL AND TRIM(province) != ''`
        );
        locRows.forEach((r) => { if (r.name) names.add(r.name); });
      } catch { /* optional reference table */ }
    }

    res.json({ success: true, data: [...names].sort() });
  } catch (e) {
    console.error('[school-monitor/filters/provinces]', e);
    res.status(500).json({ success: false, message: e.message || 'Failed to load provinces' });
  }
});

router.get('/filters/districts', async (req, res) => {
  try {
    const province = String(req.query.province || '').trim();
    let rows;
    if (province) {
      rows = await query(
        `SELECT DISTINCT district AS name FROM schools
         WHERE deleted_at IS NULL AND province = ? AND district IS NOT NULL AND district != ''
         ORDER BY district`,
        [province]
      );
    } else {
      rows = await query(
        `SELECT DISTINCT district AS name FROM schools
         WHERE deleted_at IS NULL AND district IS NOT NULL AND district != ''
         ORDER BY district`
      );
    }
    res.json({ success: true, data: rows.map((r) => r.name) });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

router.get('/filters/sectors', async (req, res) => {
  try {
    const district = String(req.query.district || '').trim();
    if (!district) return res.json({ success: true, data: [] });
    const rows = await query(
      `SELECT DISTINCT sector AS name FROM schools
       WHERE deleted_at IS NULL AND district = ? AND sector IS NOT NULL AND sector != ''
       ORDER BY sector`,
      [district]
    );
    res.json({ success: true, data: rows.map((r) => r.name) });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// GET /api/superadmin/school-monitor/hierarchy/sectors?district=Gasabo
router.get('/hierarchy/sectors', async (req, res) => {
  try {
    const district = String(req.query.district || '').trim();
    if (!district) return res.status(400).json({ success: false, message: 'district required' });
    const rows = await query(
      `SELECT
         COALESCE(NULLIF(TRIM(s.sector), ''), 'Unassigned') AS sector,
         COUNT(DISTINCT s.id) AS schools,
         COUNT(DISTINCT CASE WHEN ust.status IN ('online','idle') AND ust.last_seen_at >= DATE_SUB(NOW(), INTERVAL 20 MINUTE) THEN ust.user_id END) AS online_users
       FROM schools s
       LEFT JOIN user_status_tracking ust ON ust.school_id = s.id
       WHERE s.deleted_at IS NULL AND (s.status IS NULL OR s.status = 'active') AND s.district = ?
       GROUP BY COALESCE(NULLIF(TRIM(s.sector), ''), 'Unassigned')
       ORDER BY online_users DESC, schools DESC`,
      [district]
    );
    res.json({
      success: true,
      data: rows.map((r) => ({
        sector: r.sector,
        schools: Number(r.schools || 0),
        onlineUsers: Number(r.online_users || 0),
      })),
    });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// GET /api/superadmin/school-monitor/hierarchy/schools?district=&sector=
router.get('/hierarchy/schools', async (req, res) => {
  try {
    const district = String(req.query.district || '').trim();
    const sector = String(req.query.sector || '').trim();
    const where = ['s.deleted_at IS NULL', '(s.status IS NULL OR s.status = \'active\')'];
    const params = [];
    if (district) { where.push('s.district = ?'); params.push(district); }
    if (sector) {
      if (sector === 'Unassigned') where.push('(s.sector IS NULL OR TRIM(s.sector) = \'\')');
      else { where.push('s.sector = ?'); params.push(sector); }
    }
    const rows = await query(
      `SELECT
         s.id, s.school_name AS name, s.school_code AS code, s.district, s.sector, s.province,
         s.school_status AS access_status, s.subscription_plan, s.pro_enabled,
         COUNT(DISTINCT CASE WHEN ust.status IN ('online','idle') AND ust.last_seen_at >= DATE_SUB(NOW(), INTERVAL 20 MINUTE) THEN ust.user_id END) AS online_users,
         (SELECT COUNT(*) FROM activity_logs al WHERE al.school_id = s.id AND DATE(al.created_at) = CURDATE()) AS activities_today,
         (SELECT MAX(us.last_activity_at) FROM user_sessions us WHERE us.school_id = s.id) AS last_activity
       FROM schools s
       LEFT JOIN user_status_tracking ust ON ust.school_id = s.id
       WHERE ${where.join(' AND ')}
       GROUP BY s.id, s.school_name, s.school_code, s.district, s.sector, s.province, s.school_status, s.subscription_plan, s.pro_enabled
       ORDER BY online_users DESC, activities_today DESC
       LIMIT 200`,
      params
    );
    res.json({
      success: true,
      data: rows.map((r) => ({
        id: r.id,
        name: r.name,
        code: r.code,
        district: r.district,
        sector: r.sector || '—',
        province: r.province,
        status: Number(r.online_users) > 0 ? 'Active' : 'Idle',
        product: Number(r.pro_enabled) === 1 ? 'pro' : 'lite',
        onlineUsers: Number(r.online_users || 0),
        activitiesToday: Number(r.activities_today || 0),
        lastActivity: r.last_activity,
      })),
    });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// GET /api/superadmin/school-monitor/schools/:schoolId
router.get('/schools/:schoolId', async (req, res) => {
  try {
    const schoolId = Number(req.params.schoolId);
    const [school] = await query(
      `SELECT s.*, s.school_name AS name, s.school_code AS code,
         (SELECT COUNT(*) FROM users u WHERE u.school_id = s.id AND u.deleted_at IS NULL) AS total_users,
         (SELECT COUNT(DISTINCT us.user_id) FROM user_sessions us
          WHERE us.school_id = s.id AND us.logout_at IS NULL
            AND us.last_activity_at >= DATE_SUB(NOW(), INTERVAL 20 MINUTE)) AS online_users,
         (SELECT MAX(us.last_activity_at) FROM user_sessions us WHERE us.school_id = s.id) AS last_activity,
         (SELECT MAX(us.login_at) FROM user_sessions us WHERE us.school_id = s.id) AS last_login
       FROM schools s WHERE s.id = ? AND s.deleted_at IS NULL LIMIT 1`,
      [schoolId]
    );
    if (!school) return res.status(404).json({ success: false, message: 'School not found' });
    res.json({
      success: true,
      school: {
        id: school.id,
        name: school.name,
        code: school.code,
        district: school.district,
        sector: school.sector,
        province: school.province,
        status: school.school_status || school.status || 'active',
        product: Number(school.pro_enabled) === 1 ? 'pro' : 'lite',
        totalUsers: Number(school.total_users || 0),
        onlineUsers: Number(school.online_users || 0),
        lastActivity: school.last_activity,
        lastLogin: school.last_login,
      },
    });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// GET /api/superadmin/school-monitor/schools/:schoolId/users
router.get('/schools/:schoolId/users', async (req, res) => {
  try {
    const schoolId = Number(req.params.schoolId);
    const rows = await query(
      `SELECT
         u.id, u.first_name, u.last_name, u.email, u.phone, u.photo,
         u.is_active, u.is_locked, u.last_login, u.last_login_ip,
         r.role_code, r.role_name,
         ust.status AS track_status, ust.is_suspicious, ust.last_seen_at,
         us.device_label, us.ip_address AS session_ip, us.login_at, us.last_activity_at
       FROM users u
       LEFT JOIN roles r ON r.id = u.role_id
       LEFT JOIN user_status_tracking ust ON ust.user_id = u.id
       LEFT JOIN user_sessions us ON us.user_id = u.id AND us.logout_at IS NULL
         AND us.id = (
           SELECT MAX(us2.id) FROM user_sessions us2 WHERE us2.user_id = u.id AND us2.logout_at IS NULL
         )
       WHERE u.school_id = ? AND u.deleted_at IS NULL
       ORDER BY ust.last_seen_at DESC, u.last_login DESC
       LIMIT 300`,
      [schoolId]
    );
    res.json({
      success: true,
      users: rows.map((r) => {
        let status = sessionPresenceStatus(r.last_activity_at || r.last_seen_at || r.last_login);
        if (!r.is_active) status = 'disabled';
        else if (r.is_locked) status = 'locked';
        else if (Number(r.is_suspicious) === 1) status = 'suspicious';
        return {
          id: r.id,
          name: formatName(r),
          role: r.role_name || r.role_code,
          email: r.email,
          phone: r.phone,
          photo: r.photo,
          status,
          loginTime: r.login_at || r.last_login,
          lastActivity: r.last_activity_at || r.last_seen_at || r.last_login,
          device: r.device_label || '—',
          ip: r.session_ip || r.last_login_ip || '—',
          isActive: !!r.is_active,
          isLocked: !!r.is_locked,
        };
      }),
    });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// GET /api/superadmin/school-monitor/users/:userId
router.get('/users/:userId', async (req, res) => {
  try {
    const userId = Number(req.params.userId);
    const [u] = await query(
      `SELECT u.*, r.role_code, r.role_name, s.school_name, s.school_code, s.district, s.pro_enabled, s.subscription_plan
       FROM users u
       LEFT JOIN roles r ON r.id = u.role_id
       LEFT JOIN schools s ON s.id = u.school_id
       WHERE u.id = ? AND u.deleted_at IS NULL LIMIT 1`,
      [userId]
    );
    if (!u) return res.status(404).json({ success: false, message: 'User not found' });

    let timeline = await query(
      `SELECT created_at, action_summary AS action, module, risk_level, ip_address, 'activity' AS kind
       FROM activity_logs WHERE user_id = ? ORDER BY created_at DESC LIMIT 50`,
      [userId]
    );
    try {
      const platformRows = await query(
        `SELECT created_at,
                CONCAT(COALESCE(action_summary, event_type, ''), '') AS action,
                COALESCE(entity_type, 'System') AS module,
                'Low' AS risk_level, ip_address, 'platform' AS kind
         FROM platform_activity_logs WHERE user_id = ? ORDER BY created_at DESC LIMIT 25`,
        [userId]
      );
      timeline = [...timeline, ...platformRows];
    } catch { /* platform table optional */ }

    const operations = await query(
      `SELECT id, module, action_type, action_summary, before_value, after_value, risk_level, ip_address, user_agent, created_at
       FROM activity_logs WHERE user_id = ? ORDER BY created_at DESC LIMIT 80`,
      [userId]
    );

    const devices = await query(
      `SELECT device_label, user_agent, last_ip, first_seen_at, last_seen_at, is_trusted
       FROM user_devices WHERE user_id = ? ORDER BY last_seen_at DESC`,
      [userId]
    );

    const [session] = await query(
      `SELECT * FROM user_sessions WHERE user_id = ? AND logout_at IS NULL
       ORDER BY last_activity_at DESC LIMIT 1`,
      [userId]
    );

    const sortedTimeline = (timeline || [])
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 50);

    res.json({
      success: true,
      profile: {
        id: u.id,
        name: formatName(u),
        role: u.role_name || u.role_code,
        school: u.school_name,
        schoolCode: u.school_code,
        district: u.district,
        email: u.email,
        phone: u.phone,
        photo: u.photo,
        lastLogin: u.last_login,
        lastLoginIp: u.last_login_ip,
        isActive: !!u.is_active,
        isLocked: !!u.is_locked,
        product: Number(u.pro_enabled) === 1 ? 'pro' : 'lite',
        status: sessionPresenceStatus(session[0]?.last_activity_at || u.last_login),
        device: session[0]?.device_label || parseDevice(session[0]?.user_agent),
        ip: session[0]?.ip_address || u.last_login_ip,
        sessionStarted: session[0]?.login_at,
        lastActivity: session[0]?.last_activity_at,
      },
      timeline: sortedTimeline.map((t) => ({
        time: t.created_at,
        action: t.action,
        module: t.module || 'System',
        risk: t.risk_level || 'Low',
        ip: t.ip_address,
      })),
      operations,
      devices,
      replay: sortedTimeline.slice(0, 12).map((t, i) => ({ step: i + 1, ...t })),
    });
  } catch (e) {
    console.error('[school-monitor/users/:id]', e);
    res.status(500).json({ success: false, message: e.message });
  }
});

// POST /api/superadmin/school-monitor/users/:userId/action
router.post('/users/:userId/action', async (req, res) => {
  try {
    const userId = Number(req.params.userId);
    const action = String(req.body?.action || '').trim().toLowerCase();
    const adminId = req.user?.id || req.session?.userId;
    const [target] = await query('SELECT id, school_id, email FROM users WHERE id = ? AND deleted_at IS NULL', [userId]);
    if (!target) return res.status(404).json({ success: false, message: 'User not found' });

    if (action === 'disable') {
      await promisePool.query('UPDATE users SET is_active = 0 WHERE id = ?', [userId]);
      await closeUserSessions(userId, true);
    } else if (action === 'enable') {
      await promisePool.query('UPDATE users SET is_active = 1, is_locked = 0, locked_until = NULL WHERE id = ?', [userId]);
      await promisePool.query('UPDATE user_status_tracking SET is_disabled = 0, is_locked = 0 WHERE user_id = ?', [userId]);
    } else if (action === 'lock' || action === 'suspend') {
      await promisePool.query(
        'UPDATE users SET is_locked = 1, locked_until = DATE_ADD(NOW(), INTERVAL 24 HOUR) WHERE id = ?',
        [userId]
      );
      await closeUserSessions(userId, true);
    } else if (action === 'force_logout') {
      await closeUserSessions(userId, true);
    } else {
      return res.status(400).json({ success: false, message: 'Invalid action' });
    }

    await recordAuditTrail({
      userId: adminId,
      schoolId: target.school_id,
      trailType: `superadmin_${action}`,
      description: `SuperAdmin performed ${action} on user ${target.email}`,
      meta: { target_user_id: userId, action },
      ip: req.ip,
    });

    res.json({ success: true, message: `User ${action} applied` });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

router.get('/live-users', async (_req, res) => {
  try {
    const rows = await query(
      `SELECT u.id, u.first_name, u.last_name, u.email, u.photo,
              r.role_name, s.school_name, s.district,
              us.device_label, us.ip_address, us.product_tier, us.last_activity_at, us.login_at,
              ust.status, ust.is_suspicious
       FROM user_sessions us
       INNER JOIN users u ON u.id = us.user_id AND u.deleted_at IS NULL
       LEFT JOIN roles r ON r.id = u.role_id
       LEFT JOIN schools s ON s.id = us.school_id
       LEFT JOIN user_status_tracking ust ON ust.user_id = u.id
       WHERE us.logout_at IS NULL AND us.last_activity_at >= DATE_SUB(NOW(), INTERVAL 30 MINUTE)
       ORDER BY us.last_activity_at DESC
       LIMIT 150`
    );
    res.json({
      success: true,
      users: rows.map((r) => ({
        id: r.id,
        name: formatName(r),
        role: r.role_name,
        school: r.school_name,
        district: r.district,
        device: r.device_label,
        ip: r.ip_address,
        product: r.product_tier,
        status: Number(r.is_suspicious) ? 'suspicious' : sessionPresenceStatus(r.last_activity_at),
        lastActivity: r.last_activity_at,
        loginAt: r.login_at,
      })),
    });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

router.get('/suspicious', async (_req, res) => {
  try {
    const rows = await query(
      `SELECT sa.*, u.first_name, u.last_name, u.email, s.school_name
       FROM suspicious_activities sa
       LEFT JOIN users u ON u.id = sa.user_id
       LEFT JOIN schools s ON s.id = sa.school_id
       ORDER BY sa.created_at DESC LIMIT 80`
    );
    res.json({ success: true, data: rows });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

router.get('/analytics', async (_req, res) => {
  try {
    const byRole = await query(
      `SELECT role_code AS name, COUNT(*) AS count FROM activity_logs
       WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY) AND role_code IS NOT NULL
       GROUP BY role_code ORDER BY count DESC LIMIT 10`
    );
    const byDay = await query(
      `SELECT DATE(created_at) AS day, COUNT(*) AS count FROM activity_logs
       WHERE created_at >= DATE_SUB(NOW(), INTERVAL 14 DAY)
       GROUP BY DATE(created_at) ORDER BY day`
    );
    const topSchools = await query(
      `SELECT s.school_name AS name, COUNT(al.id) AS count
       FROM activity_logs al
       INNER JOIN schools s ON s.id = al.school_id
       WHERE al.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
       GROUP BY s.id, s.school_name ORDER BY count DESC LIMIT 8`
    );
    const districtHeat = await query(
      `SELECT s.district AS name, COUNT(DISTINCT al.user_id) AS users, COUNT(al.id) AS activities
       FROM activity_logs al
       INNER JOIN schools s ON s.id = al.school_id
       WHERE al.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY) AND s.district IS NOT NULL
       GROUP BY s.district ORDER BY activities DESC LIMIT 10`
    );
    res.json({ success: true, byRole, byDay, topSchools, districtHeat });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

router.get('/alerts', async (_req, res) => {
  try {
    const rows = await query(
      `(SELECT 'suspicious' AS type, threat_type AS title, detail AS message, created_at FROM suspicious_activities WHERE status = 'Pending' ORDER BY created_at DESC LIMIT 15)
       UNION ALL
       (SELECT 'login_failed' AS type, 'Failed login' AS title, failure_reason AS message, created_at FROM login_attempts WHERE outcome != 'success' ORDER BY created_at DESC LIMIT 10)
       ORDER BY created_at DESC LIMIT 20`
    );
    res.json({ success: true, alerts: rows });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

router.get('/disabled-users', async (_req, res) => {
  try {
    const rows = await query(
      `SELECT u.id, u.first_name, u.last_name, u.email, u.is_active, u.is_locked, s.school_name, r.role_name
       FROM users u
       LEFT JOIN schools s ON s.id = u.school_id
       LEFT JOIN roles r ON r.id = u.role_id
       WHERE u.deleted_at IS NULL AND (u.is_active = 0 OR u.is_locked = 1)
       ORDER BY u.updated_at DESC LIMIT 100`
    );
    res.json({ success: true, users: rows.map((r) => ({
      id: r.id,
      name: formatName(r),
      email: r.email,
      school: r.school_name,
      role: r.role_name,
      disabled: !r.is_active,
      locked: !!r.is_locked,
    })) });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

router.get('/map', async (_req, res) => {
  try {
    const rows = await query(
      `SELECT s.district, s.province,
         COUNT(DISTINCT s.id) AS schools,
         COUNT(DISTINCT CASE WHEN ust.status IN ('online','idle') AND ust.last_seen_at >= DATE_SUB(NOW(), INTERVAL 30 MINUTE) THEN ust.user_id END) AS online_users,
         (SELECT COUNT(*) FROM activity_logs al INNER JOIN schools sx ON sx.id = al.school_id WHERE sx.district = s.district AND al.created_at >= DATE_SUB(NOW(), INTERVAL 1 DAY)) AS activities
       FROM schools s
       LEFT JOIN user_status_tracking ust ON ust.school_id = s.id
       WHERE s.deleted_at IS NULL AND s.district IS NOT NULL
       GROUP BY s.district, s.province
       ORDER BY activities DESC`
    );
    const maxAct = Math.max(1, ...rows.map((r) => Number(r.activities || 0)));
    res.json({
      success: true,
      districts: rows.map((r) => {
        const pct = Math.round((Number(r.activities || 0) / maxAct) * 100);
        let level = 'low';
        if (pct > 66) level = 'high';
        else if (pct > 33) level = 'medium';
        return { ...r, activityLevel: level, activityPct: pct };
      }),
    });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

module.exports = router;
