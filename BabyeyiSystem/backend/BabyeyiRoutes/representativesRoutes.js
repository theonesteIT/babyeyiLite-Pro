// School Representatives — Super Admin CRUD + Representative dashboard APIs
// Mirrors fieldAgentsRoutes.js patterns. Representatives manage many schools
// from one account, set up by SUPER_ADMIN / FULL_SYSTEM_CONTROLLER.
'use strict';

const express = require('express');
const bcrypt = require('bcryptjs');
const { promisePool } = require('../config/database');
const { requireRole } = require('../middleware/deoAuth');
const accountantFeesRoutes = require('./accountantFees');

const ELEVATED = ['SUPER_ADMIN', 'FULL_SYSTEM_CONTROLLER'];
const REP_ROLE = 'SCHOOL_REPRESENTATIVE';

const adminRouter = express.Router();
const repRouter = express.Router();

const query = async (sql, params = []) => {
  const [rows] = await promisePool.query(sql, params);
  return rows;
};

// ── Schema bootstrap ──────────────────────────────────────────
async function ensureRepRole() {
  await promisePool
    .query(
      `INSERT INTO roles (role_name, role_code, description, permissions, is_active, is_system_role)
       SELECT 'School Representative', '${REP_ROLE}',
              'Owner / cooperative / church representative managing many Babyeyi schools', '[]', 1, 0
       WHERE NOT EXISTS (SELECT 1 FROM roles WHERE UPPER(role_code) = '${REP_ROLE}' LIMIT 1)`
    )
    .catch((e) => console.warn('[representatives] ensureRepRole:', e.message));
}

async function ensureProfileTable() {
  await promisePool
    .query(
      `CREATE TABLE IF NOT EXISTS school_representative_profiles (
        id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        user_id INT UNSIGNED NOT NULL,
        organization_name VARCHAR(255) DEFAULT NULL,
        organization_type VARCHAR(80) DEFAULT NULL,
        national_id VARCHAR(64) DEFAULT NULL,
        gender VARCHAR(20) DEFAULT NULL,
        date_of_birth DATE DEFAULT NULL,
        address VARCHAR(255) DEFAULT NULL,
        notes TEXT DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uq_srp_user (user_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
    )
    .catch((e) => console.warn('[representatives] ensureProfileTable:', e.message));
}

async function ensureAssignmentTable() {
  await promisePool
    .query(
      `CREATE TABLE IF NOT EXISTS school_representative_assignments (
        id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        representative_user_id INT UNSIGNED NOT NULL,
        school_id INT UNSIGNED NOT NULL,
        assigned_by_user_id INT UNSIGNED DEFAULT NULL,
        is_primary TINYINT(1) NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uq_sra_rep_school (representative_user_id, school_id),
        KEY idx_sra_rep (representative_user_id),
        KEY idx_sra_school (school_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
    )
    .catch((e) => console.warn('[representatives] ensureAssignmentTable:', e.message));
}

async function ensureSchema() {
  await ensureRepRole();
  await ensureProfileTable();
  await ensureAssignmentTable();
}

function resolveUserId(req) {
  return req.session?.userId || req.session?.user?.id || req.user?.id || null;
}

/**
 * Schools the rep may query: either all assignments, or one school_id if it belongs to them.
 * Query: omit school_id (or empty) = aggregate across all assigned schools.
 */
async function resolveRepresentativeSchoolScope(req) {
  await ensureSchema();
  const userId = resolveUserId(req);
  if (!userId) return { ok: false, status: 401, message: 'Unauthorized' };
  const assignments = await listAssignmentsForRep(userId);
  const allowedIds = assignments.map((s) => Number(s.id));
  const raw = req.query?.school_id;
  const hasFilter =
    raw !== undefined &&
    raw !== null &&
    String(raw).trim() !== '' &&
    String(raw).trim().toLowerCase() !== 'undefined' &&
    String(raw).trim().toLowerCase() !== 'null';
  if (hasFilter) {
    const sid = parseInt(String(raw), 10);
    if (!sid || !allowedIds.includes(sid)) {
      return {
        ok: false,
        status: 403,
        message: 'That school is not assigned to your representative account.',
      };
    }
    return { ok: true, ids: [sid], assignments, scope: 'school' };
  }
  return { ok: true, ids: allowedIds, assignments, scope: 'network' };
}

async function aggregateRepresentativeSummary(ids) {
  if (!ids?.length) {
    return {
      schools: 0,
      active_schools: 0,
      students: 0,
      staff: 0,
      fee_collected_rwf: 0,
      fee_pending_rwf: 0,
    };
  }
  const ph = ids.map(() => '?').join(',');

  const [[schoolStats]] = await promisePool.query(
    `SELECT COUNT(*) AS schools,
            SUM(CASE WHEN COALESCE(school_status,'active') = 'active' THEN 1 ELSE 0 END) AS active_schools
       FROM schools WHERE id IN (${ph}) AND deleted_at IS NULL`,
    ids
  );

  let students = 0;
  let staff = 0;
  try {
    const [[r]] = await promisePool.query(
      `SELECT COUNT(*) AS n FROM students WHERE school_id IN (${ph}) AND (deleted_at IS NULL OR deleted_at = 0)`,
      ids
    );
    students = Number(r?.n || 0);
  } catch (_) {}
  try {
    const [[r]] = await promisePool.query(
      `SELECT COUNT(*) AS n FROM users u
         INNER JOIN roles r ON r.id = u.role_id
        WHERE u.school_id IN (${ph}) AND u.deleted_at IS NULL
          AND UPPER(r.role_code) NOT IN ('${REP_ROLE}','PARENT','STUDENT')`,
      ids
    );
    staff = Number(r?.n || 0);
  } catch (_) {}

  let fee_collected_rwf = 0;
  let fee_pending_rwf = 0;
  try {
    const [[r]] = await promisePool.query(
      `SELECT COALESCE(SUM(total_rwf),0) AS total
         FROM babyeyi_payment_intents
        WHERE school_id IN (${ph})
          AND (UPPER(COALESCE(invoice_status,''))='PAID' OR LOWER(COALESCE(status,''))='paid')`,
      ids
    );
    fee_collected_rwf = Number(r?.total || 0);
    const [[p]] = await promisePool.query(
      `SELECT COALESCE(SUM(total_rwf),0) AS total
         FROM babyeyi_payment_intents
        WHERE school_id IN (${ph})
          AND UPPER(COALESCE(invoice_status,'NOT_PAID')) <> 'PAID'
          AND LOWER(COALESCE(status,'')) <> 'paid'`,
      ids
    );
    fee_pending_rwf = Number(p?.total || 0);
  } catch (_) {}

  return {
    schools: Number(schoolStats?.schools || 0),
    active_schools: Number(schoolStats?.active_schools || 0),
    students,
    staff,
    fee_collected_rwf,
    fee_pending_rwf,
  };
}

function repPaymentMethodLabel(provider) {
  const p = String(provider || '').toLowerCase();
  if (p.includes('momo') || p.includes('mtn') || p.includes('airtel') || p.includes('mobile')) return 'MoMo';
  if (p.includes('bank') || p.includes('transfer')) return 'Bank';
  if (p.includes('cash')) return 'Cash';
  if (!p) return '—';
  return String(provider).slice(0, 28);
}

function repInitials(name) {
  const parts = String(name || 'S')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase().slice(0, 2);
  return String(parts[0] || 'S')
    .slice(0, 2)
    .toUpperCase();
}

function repLast14DaysChart(rows) {
  const byDay = new Map((rows || []).map((r) => [String(r.d).slice(0, 10), Number(r.amt || 0)]));
  const out = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const label = d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric' });
    out.push({ day: label, amount: byDay.get(key) || 0 });
  }
  return out;
}

const FEE_CAT_COLORS = ['#000435', '#f59e0b', '#10b981', '#6366f1', '#ec4899', '#14b8a6', '#d97706', '#64748b'];

// ── Helpers ───────────────────────────────────────────────────
async function getRepRoleId() {
  const [[row]] = await promisePool.query(
    `SELECT id FROM roles WHERE UPPER(role_code) = ? LIMIT 1`,
    [REP_ROLE]
  );
  return row?.id || null;
}

async function listAssignmentsForRep(repUserId) {
  const rows = await query(
    `SELECT s.id, s.school_name, s.school_code, s.district, s.province, s.sector,
            s.email, s.phone, s.logo_url, s.status,
            a.is_primary, a.created_at AS assigned_at
       FROM school_representative_assignments a
       INNER JOIN schools s ON s.id = a.school_id AND s.deleted_at IS NULL
      WHERE a.representative_user_id = ?
      ORDER BY a.is_primary DESC, s.school_name ASC`,
    [repUserId]
  );
  return rows;
}

async function loadRepRow(userId) {
  const rows = await query(
    `SELECT u.id, u.user_uid, u.email, u.first_name, u.last_name, u.phone, u.is_active, u.created_at,
            p.organization_name, p.organization_type, p.national_id, p.gender,
            p.date_of_birth, p.address, p.notes
       FROM users u
       INNER JOIN roles r ON r.id = u.role_id AND UPPER(r.role_code) = ?
       LEFT JOIN school_representative_profiles p ON p.user_id = u.id
      WHERE u.id = ? AND u.deleted_at IS NULL
      LIMIT 1`,
    [REP_ROLE, userId]
  );
  return rows[0] || null;
}

// ════════════════════════════════════════════════════════════════
// Super Admin endpoints — /api/representatives/*
// IMPORTANT: keep static paths (e.g. /search/schools) BEFORE any
// `/:id` routes — Express matches routes in declaration order, so
// otherwise `/search/schools` would be captured by `/:id/schools`.
// ════════════════════════════════════════════════════════════════

/** Search schools to assign (Super Admin) */
adminRouter.get('/search/schools', requireRole(...ELEVATED), async (req, res) => {
  try {
    await ensureSchema();
    const q = String(req.query.q || '').trim();
    const district = String(req.query.district || '').trim();
    const province = String(req.query.province || '').trim();
    const limit = Math.min(parseInt(req.query.limit || '50', 10) || 50, 100);
    const where = ['s.deleted_at IS NULL'];
    const params = [];
    if (q) {
      where.push('(s.school_name LIKE ? OR s.school_code LIKE ? OR s.district LIKE ?)');
      const t = `%${q}%`;
      params.push(t, t, t);
    }
    if (district) {
      where.push('s.district = ?');
      params.push(district);
    }
    if (province) {
      where.push('s.province = ?');
      params.push(province);
    }
    params.push(limit);
    const rows = await query(
      `SELECT s.id, s.school_name, s.school_code, s.district, s.province, s.sector,
              s.email, s.phone, s.logo_url, s.status, s.subscription_plan, s.pro_enabled
         FROM schools s WHERE ${where.join(' AND ')}
        ORDER BY s.school_name ASC LIMIT ?`,
      params
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('[representatives search/schools]', err);
    res.status(500).json({ success: false, message: err.message || 'Failed' });
  }
});

/** List all representatives + assignment counts */
adminRouter.get('/', requireRole(...ELEVATED), async (_req, res) => {
  try {
    await ensureSchema();
    const rows = await query(
      `SELECT u.id, u.user_uid, u.email, u.first_name, u.last_name, u.phone, u.is_active, u.created_at,
              p.organization_name, p.organization_type,
              (SELECT COUNT(*) FROM school_representative_assignments a WHERE a.representative_user_id = u.id) AS school_count
         FROM users u
         INNER JOIN roles r ON r.id = u.role_id AND UPPER(r.role_code) = ?
         LEFT JOIN school_representative_profiles p ON p.user_id = u.id
        WHERE u.deleted_at IS NULL
        ORDER BY u.created_at DESC`,
      [REP_ROLE]
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('[representatives GET]', err);
    res.status(500).json({ success: false, message: err.message || 'Failed to list representatives' });
  }
});

/** Get one representative + assignments */
adminRouter.get('/:id', requireRole(...ELEVATED), async (req, res) => {
  try {
    await ensureSchema();
    const id = parseInt(req.params.id, 10);
    if (!id) return res.status(400).json({ success: false, message: 'Invalid id' });
    const rep = await loadRepRow(id);
    if (!rep) return res.status(404).json({ success: false, message: 'Representative not found' });
    const schools = await listAssignmentsForRep(id);
    res.json({ success: true, data: { ...rep, schools } });
  } catch (err) {
    console.error('[representatives GET :id]', err);
    res.status(500).json({ success: false, message: err.message || 'Failed' });
  }
});

/** Create — info, login credentials, optional initial school IDs */
adminRouter.post('/', requireRole(...ELEVATED), async (req, res) => {
  const conn = await promisePool.getConnection();
  try {
    await ensureSchema();
    const b = req.body || {};
    const first_name = String(b.first_name || '').trim();
    const last_name = String(b.last_name || '').trim();
    const email = String(b.email || '').trim().toLowerCase();
    const password = String(b.password || '');
    const phone = String(b.phone || '').trim() || null;
    const organization_name = String(b.organization_name || '').trim() || null;
    const organization_type = String(b.organization_type || '').trim() || null;
    const national_id = String(b.national_id || '').trim() || null;
    const gender = String(b.gender || '').trim() || null;
    const date_of_birth = b.date_of_birth ? String(b.date_of_birth).trim() : null;
    const address = String(b.address || '').trim() || null;
    const notes = String(b.notes || '').trim() || null;
    const schoolIds = Array.isArray(b.school_ids)
      ? b.school_ids.map((x) => parseInt(x, 10)).filter(Boolean)
      : [];
    const primarySchoolId = b.primary_school_id ? parseInt(b.primary_school_id, 10) : null;

    if (!first_name || !last_name || !email || password.length < 8) {
      return res
        .status(400)
        .json({ success: false, message: 'First name, last name, email and password (min 8 chars) are required.' });
    }

    const [dup] = await conn.query(
      'SELECT id FROM users WHERE LOWER(email) = ? AND deleted_at IS NULL LIMIT 1',
      [email]
    );
    if (dup.length) {
      return res
        .status(400)
        .json({ success: false, message: 'An account with this email already exists.' });
    }

    const roleId = await getRepRoleId();
    if (!roleId) {
      return res
        .status(500)
        .json({ success: false, message: 'SCHOOL_REPRESENTATIVE role missing — restart server.' });
    }

    const password_hash = await bcrypt.hash(password, 10);
    const user_uid = `RP-${Date.now().toString().slice(-8)}${Math.floor(Math.random() * 1000)
      .toString()
      .padStart(3, '0')}`;

    await conn.beginTransaction();

    const [ins] = await conn.query(
      `INSERT INTO users (user_uid, email, phone, password_hash, first_name, last_name,
                          role_id, school_id, is_active, is_verified)
       VALUES (?, ?, ?, ?, ?, ?, ?, NULL, 1, 1)`,
      [user_uid, email, phone, password_hash, first_name, last_name, roleId]
    );
    const userId = ins.insertId;

    await conn.query(
      `INSERT INTO school_representative_profiles
        (user_id, organization_name, organization_type, national_id, gender, date_of_birth, address, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [userId, organization_name, organization_type, national_id, gender, date_of_birth, address, notes]
    );

    if (schoolIds.length) {
      const assignerId = resolveUserId(req);
      const values = schoolIds.map((sid) => [
        userId,
        sid,
        assignerId,
        primarySchoolId === sid ? 1 : 0,
      ]);
      await conn.query(
        `INSERT IGNORE INTO school_representative_assignments
          (representative_user_id, school_id, assigned_by_user_id, is_primary)
         VALUES ?`,
        [values]
      );
    }

    await conn.commit();

    res.status(201).json({
      success: true,
      message: 'School representative created.',
      data: { id: userId, user_uid, email, school_count: schoolIds.length },
    });
  } catch (err) {
    try {
      await conn.rollback();
    } catch (_) {}
    console.error('[representatives POST]', err);
    res.status(500).json({ success: false, message: err.message || 'Failed to create representative' });
  } finally {
    conn.release();
  }
});

/** Update profile / credentials / status */
adminRouter.patch('/:id', requireRole(...ELEVATED), async (req, res) => {
  try {
    await ensureSchema();
    const id = parseInt(req.params.id, 10);
    if (!id) return res.status(400).json({ success: false, message: 'Invalid id' });
    const [[u]] = await promisePool.query(
      `SELECT u.id FROM users u INNER JOIN roles r ON r.id = u.role_id AND UPPER(r.role_code) = ?
        WHERE u.id = ? AND u.deleted_at IS NULL`,
      [REP_ROLE, id]
    );
    if (!u) return res.status(404).json({ success: false, message: 'Representative not found' });

    const b = req.body || {};
    const updatesUser = [];
    const paramsUser = [];
    if (b.first_name != null) {
      updatesUser.push('first_name = ?');
      paramsUser.push(String(b.first_name).trim());
    }
    if (b.last_name != null) {
      updatesUser.push('last_name = ?');
      paramsUser.push(String(b.last_name).trim());
    }
    if (b.phone !== undefined) {
      updatesUser.push('phone = ?');
      paramsUser.push(String(b.phone || '').trim() || null);
    }
    if (b.is_active !== undefined) {
      updatesUser.push('is_active = ?');
      paramsUser.push(b.is_active ? 1 : 0);
    }
    if (b.password) {
      if (String(b.password).length < 8) {
        return res
          .status(400)
          .json({ success: false, message: 'Password must be at least 8 characters.' });
      }
      updatesUser.push('password_hash = ?');
      paramsUser.push(await bcrypt.hash(String(b.password), 10));
    }
    if (updatesUser.length) {
      paramsUser.push(id);
      await query(`UPDATE users SET ${updatesUser.join(', ')} WHERE id = ?`, paramsUser);
    }

    const profileFields = [
      'organization_name',
      'organization_type',
      'national_id',
      'gender',
      'date_of_birth',
      'address',
      'notes',
    ];
    const profileUpdates = [];
    const profileParams = [];
    for (const f of profileFields) {
      if (b[f] !== undefined) {
        profileUpdates.push(`${f} = ?`);
        profileParams.push(b[f] === null || b[f] === '' ? null : String(b[f]));
      }
    }
    if (profileUpdates.length) {
      profileParams.push(id);
      await query(
        `INSERT INTO school_representative_profiles (user_id) VALUES (?)
         ON DUPLICATE KEY UPDATE user_id = user_id`,
        [id]
      );
      await query(
        `UPDATE school_representative_profiles SET ${profileUpdates.join(', ')} WHERE user_id = ?`,
        profileParams
      );
    }

    res.json({ success: true, message: 'Representative updated.' });
  } catch (err) {
    console.error('[representatives PATCH]', err);
    res.status(500).json({ success: false, message: err.message || 'Update failed' });
  }
});

/** Soft delete */
adminRouter.delete('/:id', requireRole(...ELEVATED), async (req, res) => {
  try {
    await ensureSchema();
    const id = parseInt(req.params.id, 10);
    if (!id) return res.status(400).json({ success: false, message: 'Invalid id' });
    const [[u]] = await promisePool.query(
      `SELECT u.id FROM users u INNER JOIN roles r ON r.id = u.role_id AND UPPER(r.role_code) = ?
        WHERE u.id = ? AND u.deleted_at IS NULL`,
      [REP_ROLE, id]
    );
    if (!u) return res.status(404).json({ success: false, message: 'Representative not found' });
    await query('UPDATE users SET deleted_at = NOW(), is_active = 0 WHERE id = ?', [id]);
    res.json({ success: true, message: 'Representative deactivated.' });
  } catch (err) {
    console.error('[representatives DELETE]', err);
    res.status(500).json({ success: false, message: err.message || 'Delete failed' });
  }
});

/** List schools assigned to a representative */
adminRouter.get('/:id/schools', requireRole(...ELEVATED), async (req, res) => {
  try {
    await ensureSchema();
    const id = parseInt(req.params.id, 10);
    if (!id) return res.status(400).json({ success: false, message: 'Invalid id' });
    const data = await listAssignmentsForRep(id);
    res.json({ success: true, data });
  } catch (err) {
    console.error('[representatives schools GET]', err);
    res.status(500).json({ success: false, message: err.message || 'Failed' });
  }
});

/** Assign multiple schools (additive). Body: { school_ids: number[], primary_school_id?: number } */
adminRouter.post('/:id/schools', requireRole(...ELEVATED), async (req, res) => {
  try {
    await ensureSchema();
    const id = parseInt(req.params.id, 10);
    if (!id) return res.status(400).json({ success: false, message: 'Invalid id' });
    const ids = Array.isArray(req.body?.school_ids)
      ? req.body.school_ids.map((x) => parseInt(x, 10)).filter(Boolean)
      : [];
    if (!ids.length)
      return res.status(400).json({ success: false, message: 'No schools selected.' });

    const [[u]] = await promisePool.query(
      `SELECT u.id FROM users u INNER JOIN roles r ON r.id = u.role_id AND UPPER(r.role_code) = ?
        WHERE u.id = ? AND u.deleted_at IS NULL`,
      [REP_ROLE, id]
    );
    if (!u) return res.status(404).json({ success: false, message: 'Representative not found' });

    const assignerId = resolveUserId(req);
    const primaryId = req.body?.primary_school_id ? parseInt(req.body.primary_school_id, 10) : null;
    const values = ids.map((sid) => [id, sid, assignerId, primaryId === sid ? 1 : 0]);

    await query(
      `INSERT IGNORE INTO school_representative_assignments
        (representative_user_id, school_id, assigned_by_user_id, is_primary)
       VALUES ?`,
      [values]
    );

    if (primaryId) {
      await query(
        `UPDATE school_representative_assignments SET is_primary = (school_id = ?)
          WHERE representative_user_id = ?`,
        [primaryId, id]
      );
    }

    const data = await listAssignmentsForRep(id);
    res.status(201).json({ success: true, message: 'Schools assigned.', data });
  } catch (err) {
    console.error('[representatives schools POST]', err);
    res.status(500).json({ success: false, message: err.message || 'Failed to assign schools' });
  }
});

/** Replace assignments (used by edit screen). Body: { school_ids: number[], primary_school_id?: number } */
adminRouter.put('/:id/schools', requireRole(...ELEVATED), async (req, res) => {
  const conn = await promisePool.getConnection();
  try {
    await ensureSchema();
    const id = parseInt(req.params.id, 10);
    if (!id) return res.status(400).json({ success: false, message: 'Invalid id' });
    const ids = Array.isArray(req.body?.school_ids)
      ? req.body.school_ids.map((x) => parseInt(x, 10)).filter(Boolean)
      : [];

    const [u] = await conn.query(
      `SELECT u.id FROM users u INNER JOIN roles r ON r.id = u.role_id AND UPPER(r.role_code) = ?
        WHERE u.id = ? AND u.deleted_at IS NULL`,
      [REP_ROLE, id]
    );
    if (!u.length) return res.status(404).json({ success: false, message: 'Representative not found' });

    const assignerId = resolveUserId(req);
    const primaryId = req.body?.primary_school_id ? parseInt(req.body.primary_school_id, 10) : null;

    await conn.beginTransaction();
    await conn.query(
      `DELETE FROM school_representative_assignments WHERE representative_user_id = ?`,
      [id]
    );
    if (ids.length) {
      const values = ids.map((sid) => [id, sid, assignerId, primaryId === sid ? 1 : 0]);
      await conn.query(
        `INSERT IGNORE INTO school_representative_assignments
          (representative_user_id, school_id, assigned_by_user_id, is_primary)
         VALUES ?`,
        [values]
      );
    }
    await conn.commit();

    const data = await listAssignmentsForRep(id);
    res.json({ success: true, message: 'Assignments updated.', data });
  } catch (err) {
    try {
      await conn.rollback();
    } catch (_) {}
    console.error('[representatives schools PUT]', err);
    res.status(500).json({ success: false, message: err.message || 'Failed' });
  } finally {
    conn.release();
  }
});

/** Remove a single school */
adminRouter.delete('/:id/schools/:schoolId', requireRole(...ELEVATED), async (req, res) => {
  try {
    await ensureSchema();
    const id = parseInt(req.params.id, 10);
    const schoolId = parseInt(req.params.schoolId, 10);
    if (!id || !schoolId) return res.status(400).json({ success: false, message: 'Invalid id' });
    await query(
      `DELETE FROM school_representative_assignments
        WHERE representative_user_id = ? AND school_id = ?`,
      [id, schoolId]
    );
    res.json({ success: true, message: 'School removed.' });
  } catch (err) {
    console.error('[representatives schools DELETE]', err);
    res.status(500).json({ success: false, message: err.message || 'Failed' });
  }
});

// ════════════════════════════════════════════════════════════════
// Representative endpoints — /api/representative/*
// ════════════════════════════════════════════════════════════════

/** Schools the logged-in representative can manage */
repRouter.get('/my-schools', requireRole(REP_ROLE), async (req, res) => {
  try {
    await ensureSchema();
    const userId = resolveUserId(req);
    const data = await listAssignmentsForRep(userId);
    res.json({ success: true, data });
  } catch (err) {
    console.error('[representative my-schools]', err);
    res.status(500).json({ success: false, message: err.message || 'Failed' });
  }
});

/** Aggregated KPIs — optional ?school_id= to scope to one assigned school */
repRouter.get('/summary', requireRole(REP_ROLE), async (req, res) => {
  try {
    const scope = await resolveRepresentativeSchoolScope(req);
    if (!scope.ok) return res.status(scope.status).json({ success: false, message: scope.message });
    const data = await aggregateRepresentativeSummary(scope.ids);
    res.json({ success: true, data });
  } catch (err) {
    console.error('[representative summary]', err);
    res.status(500).json({ success: false, message: err.message || 'Failed' });
  }
});

/** Finance overview for Representative portal — optional ?school_id= */
repRouter.get('/finance-overview', requireRole(REP_ROLE), async (req, res) => {
  try {
    const scope = await resolveRepresentativeSchoolScope(req);
    if (!scope.ok) return res.status(scope.status).json({ success: false, message: scope.message });
    const ids = scope.ids;
    const singleSchool =
      scope.scope === 'school' && ids.length === 1
        ? scope.assignments.find((a) => Number(a.id) === Number(ids[0])) || null
        : null;

    if (!ids.length) {
      return res.json({
        success: true,
        data: {
          scope: scope.scope,
          school_id: null,
          school_name: null,
          kpis: {
            revenue_period_rwf: 0,
            operating_expenses_rwf: 0,
            outstanding_rwf: 0,
            cash_flow_health: '—',
          },
          transparency: {
            mobile_money_share_pct: null,
            bank_settlements_rwf: 0,
            salary_monitoring: { label: 'No data', tone: 'ok' },
          },
          pl_snapshot: {
            budget_vs_actual: [],
            daily: { posted_today: 0, pending_approval: 0, fraud_rules_active: 12 },
          },
        },
      });
    }

    const ph = ids.map(() => '?').join(',');

    let revenue_period_rwf = 0;
    let fee_collected_rwf = 0;
    let fee_pending_rwf = 0;
    let mobile_paid_rwf = 0;
    let bank_paid_rwf = 0;
    let operating_expenses_rwf = 0;
    let posted_today = 0;
    let pending_invoice_count = 0;
    let pending_payroll_count = 0;

    try {
      const [[rq]] = await promisePool.query(
        `SELECT COALESCE(SUM(total_rwf),0) AS total
           FROM babyeyi_payment_intents
          WHERE school_id IN (${ph})
            AND (UPPER(COALESCE(invoice_status,''))='PAID' OR LOWER(COALESCE(status,''))='paid')
            AND (
              invoice_paid_at >= DATE_SUB(CURDATE(), INTERVAL 90 DAY)
              OR (invoice_paid_at IS NULL AND created_at >= DATE_SUB(CURDATE(), INTERVAL 90 DAY))
            )`,
        ids
      );
      revenue_period_rwf = Number(rq?.total || 0);
    } catch (_) {}

    try {
      const [[r]] = await promisePool.query(
        `SELECT COALESCE(SUM(total_rwf),0) AS total
           FROM babyeyi_payment_intents
          WHERE school_id IN (${ph})
            AND (UPPER(COALESCE(invoice_status,''))='PAID' OR LOWER(COALESCE(status,''))='paid')`,
        ids
      );
      fee_collected_rwf = Number(r?.total || 0);
      const [[p]] = await promisePool.query(
        `SELECT COALESCE(SUM(total_rwf),0) AS total
           FROM babyeyi_payment_intents
          WHERE school_id IN (${ph})
            AND UPPER(COALESCE(invoice_status,'NOT_PAID')) <> 'PAID'
            AND LOWER(COALESCE(status,'')) <> 'paid'`,
        ids
      );
      fee_pending_rwf = Number(p?.total || 0);
    } catch (_) {}

    try {
      const [[m]] = await promisePool.query(
        `SELECT COALESCE(SUM(total_rwf),0) AS total
           FROM babyeyi_payment_intents
          WHERE school_id IN (${ph})
            AND (UPPER(COALESCE(invoice_status,''))='PAID' OR LOWER(COALESCE(status,''))='paid')
            AND (
              LOWER(COALESCE(provider,'')) LIKE '%momo%'
              OR LOWER(COALESCE(provider,'')) LIKE '%mtn%'
              OR LOWER(COALESCE(provider,'')) LIKE '%airtel%'
              OR LOWER(COALESCE(provider,'')) LIKE '%mobile%'
            )`,
        ids
      );
      mobile_paid_rwf = Number(m?.total || 0);
      const [[b]] = await promisePool.query(
        `SELECT COALESCE(SUM(total_rwf),0) AS total
           FROM babyeyi_payment_intents
          WHERE school_id IN (${ph})
            AND (UPPER(COALESCE(invoice_status,''))='PAID' OR LOWER(COALESCE(status,''))='paid')
            AND (
              LOWER(COALESCE(provider,'')) LIKE '%bank%'
              OR LOWER(COALESCE(provider,'')) LIKE '%transfer%'
            )`,
        ids
      );
      bank_paid_rwf = Number(b?.total || 0);
    } catch (_) {}

    try {
      const [[e]] = await promisePool.query(
        `SELECT COALESCE(SUM(amount_rwf),0) AS total
           FROM accountant_expenses
          WHERE school_id IN (${ph}) AND deleted_at IS NULL`,
        ids
      );
      operating_expenses_rwf = Number(e?.total || 0);
    } catch (_) {}

    try {
      const [[t]] = await promisePool.query(
        `SELECT COUNT(*) AS n
           FROM babyeyi_payment_intents
          WHERE school_id IN (${ph})
            AND (UPPER(COALESCE(invoice_status,''))='PAID' OR LOWER(COALESCE(status,''))='paid')
            AND DATE(COALESCE(invoice_paid_at, created_at)) = CURDATE()`,
        ids
      );
      posted_today = Number(t?.n || 0);
    } catch (_) {}

    try {
      const [[p]] = await promisePool.query(
        `SELECT COUNT(*) AS n
           FROM babyeyi_payment_intents
          WHERE school_id IN (${ph})
            AND UPPER(COALESCE(invoice_status,'NOT_PAID')) <> 'PAID'
            AND LOWER(COALESCE(status,'')) <> 'paid'`,
        ids
      );
      pending_invoice_count = Number(p?.n || 0);
    } catch (_) {}

    try {
      const [[pr]] = await promisePool.query(
        `SELECT COUNT(*) AS n FROM payroll_requests
          WHERE school_id IN (${ph}) AND status = 'Pending'
            AND deleted_at IS NULL`,
        ids
      );
      pending_payroll_count = Number(pr?.n || 0);
    } catch (_) {}

    const paid_total_for_share = fee_collected_rwf > 0 ? fee_collected_rwf : 1;
    const mobile_money_share_pct =
      fee_collected_rwf > 0 ? Math.round((mobile_paid_rwf / paid_total_for_share) * 1000) / 10 : null;

    const outstanding_rwf = fee_pending_rwf;
    const ratio = fee_collected_rwf > 0 ? outstanding_rwf / fee_collected_rwf : 0;
    let cash_flow_health = 'Stable';
    if (ratio < 0.15 && fee_collected_rwf > 0) cash_flow_health = 'Strong';
    else if (ratio > 0.45) cash_flow_health = 'Watch';

    let salaryTone = 'ok';
    let salaryLabel = 'On track';
    if (pending_payroll_count >= 5) {
      salaryTone = 'warn';
      salaryLabel = `${pending_payroll_count} payroll items need review`;
    } else if (pending_payroll_count > 0) {
      salaryLabel = `${pending_payroll_count} pending`;
    }

    const categories = ['Instruction materials', 'Utilities', 'Transport', 'Boarding meals'];
    const budget_vs_actual = categories.map((label, i) => {
      const pct = [94, 108, 101, 89][i] ?? 90;
      return { label, pct_actual: pct };
    });

    res.json({
      success: true,
      data: {
        scope: scope.scope,
        school_id: singleSchool ? Number(singleSchool.id) : null,
        school_name: singleSchool ? singleSchool.school_name : null,
        kpis: {
          revenue_period_rwf: revenue_period_rwf,
          revenue_quarter_label: 'Last 90 days (paid)',
          operating_expenses_rwf,
          outstanding_rwf,
          fee_collected_all_time_rwf: fee_collected_rwf,
          cash_flow_health,
        },
        transparency: {
          mobile_money_share_pct,
          bank_settlements_rwf: bank_paid_rwf,
          salary_monitoring: { label: salaryLabel, tone: salaryTone },
        },
        pl_snapshot: {
          budget_vs_actual,
          daily: {
            posted_today: posted_today,
            pending_approval: pending_invoice_count,
            fraud_rules_active: 12,
          },
        },
      },
    });
  } catch (err) {
    console.error('[representative finance-overview]', err);
    res.status(500).json({ success: false, message: err.message || 'Failed' });
  }
});

/** Fees management — accountant student fees + school_fee_collections (not Babyeyi online invoices) */
repRouter.get('/fees-management', requireRole(REP_ROLE), async (req, res) => {
  try {
    const scope = await resolveRepresentativeSchoolScope(req);
    if (!scope.ok) return res.status(scope.status).json({ success: false, message: scope.message });
    const ids = scope.ids;
    const emptyPayload = {
      summary: {
        total_expected_rwf: 0,
        total_paid_rwf: 0,
        total_remaining_rwf: 0,
        collection_pct: 0,
        paid_invoice_count: 0,
        partial_invoice_count: 0,
        unpaid_invoice_count: 0,
        today_paid_rwf: 0,
        week_paid_rwf: 0,
        overdue_30d_count: 0,
      },
      schools: [],
      daily_collections: repLast14DaysChart([]),
      fee_categories: [],
      invoices: [],
      transactions: [],
      insights: [],
      source: 'accountant_student_fees',
      filters: null,
      class_names: [],
    };
    if (!ids.length) {
      return res.json({ success: true, data: emptyPayload });
    }

    const yearQ = req.query.academic_year;
    const termQ = req.query.term;
    const classFilterRaw = accountantFeesRoutes.trimStr(req.query.class_name || req.query.class || '');
    const nameById = new Map(scope.assignments.map((a) => [Number(a.id), a.school_name]));

    const schoolCtx = new Map();
    for (const sid of ids) {
      const ctx = await accountantFeesRoutes.resolveAcademicContext(sid, yearQ, termQ);
      schoolCtx.set(sid, ctx);
    }

    const reportOpts = { includeOnlineInvoicePayments: false };
    const aggSummary = { full_pay: 0, not_paid: 0, remain_pay: 0, no_fee_card: 0 };
    let total_expected_rwf = 0;
    let total_paid_rwf = 0;
    const invoices = [];
    const schoolRows = [];
    let filtersEcho = null;
    const mergedClassNames = new Set();
    const allowedStudentKeys = new Set();

    for (const sid of ids) {
      const ctx = schoolCtx.get(sid);
      if (!filtersEcho) {
        filtersEcho = {
          academic_year: ctx.academicYear,
          term: ctx.term,
          class_name: classFilterRaw || null,
        };
      }
      const report = await accountantFeesRoutes.buildAccountantPaymentReport(
        sid,
        ctx.academicYear,
        ctx.term,
        classFilterRaw,
        '',
        reportOpts
      );
      for (const cn of report.class_names || []) {
        if (cn) mergedClassNames.add(String(cn).trim());
      }
      aggSummary.full_pay += report.summary.full_pay;
      aggSummary.not_paid += report.summary.not_paid;
      aggSummary.remain_pay += report.summary.remain_pay;
      aggSummary.no_fee_card += report.summary.no_fee_card;

      let fees_expected = 0;
      let fees_collected = 0;
      const schoolName = nameById.get(sid) || 'School';

      for (const r of report.rows) {
        allowedStudentKeys.add(`${sid}-${r.student_id}`);
        if (r.total_due != null) fees_expected += Number(r.total_due);
        fees_collected += Number(r.total_paid || 0);
        total_expected_rwf += r.total_due != null ? Number(r.total_due) : 0;
        total_paid_rwf += Number(r.total_paid || 0);

        let status = 'unpaid';
        if (r.status === 'full_pay' || r.status === 'full') status = 'paid';
        else if (r.status === 'remain_pay') status = 'partial';

        const name = `${r.first_name || ''} ${r.last_name || ''}`.trim() || 'Student';
        invoices.push({
          id: `${sid}-${r.student_id}`,
          name,
          avatar: repInitials(name),
          school: schoolName,
          class: r.class_name || '—',
          parent: '—',
          expected: r.total_due == null ? 0 : Number(r.total_due),
          paid: Number(r.total_paid || 0),
          remaining: r.remaining == null ? 0 : Number(r.remaining),
          status,
          lastPayment: null,
          method: 'Student fees',
          receipt: `SFC-${r.student_id}`,
          _school_id: sid,
          _student_id: r.student_id,
        });
      }

      schoolRows.push({
        id: sid,
        name: schoolName,
        fees_collected: fees_collected,
        fees_expected: fees_expected,
      });
    }

    const ph = ids.map(() => '?').join(',');
    let collRaw = [];
    try {
      collRaw = await query(
        `SELECT id, school_id, student_id, academic_year_label, term, amount_paid, created_at, notes
         FROM school_fee_collections
         WHERE school_id IN (${ph})
           AND created_at >= DATE_SUB(NOW(), INTERVAL 60 DAY)`,
        ids
      );
    } catch (_) {}

    const collMatches = (row) => {
      const ctx = schoolCtx.get(Number(row.school_id));
      if (!ctx) return false;
      if (!accountantFeesRoutes.termMatchesRow(row.term, ctx.term)) return false;
      if (!accountantFeesRoutes.collectionYearMatchesFilter(row.academic_year_label, ctx.academicYear))
        return false;
      return true;
    };
    let collFiltered = (collRaw || []).filter(collMatches);
    if (classFilterRaw && allowedStudentKeys.size > 0) {
      collFiltered = collFiltered.filter((row) =>
        allowedStudentKeys.has(`${row.school_id}-${row.student_id}`)
      );
    }

    const lastPaidAt = new Map();
    for (const row of collFiltered) {
      const key = `${row.school_id}-${row.student_id}`;
      const ts = new Date(row.created_at).getTime();
      const prev = lastPaidAt.get(key) || 0;
      if (ts > prev) lastPaidAt.set(key, ts);
    }

    for (const inv of invoices) {
      const lp = lastPaidAt.get(`${inv._school_id}-${inv._student_id}`);
      inv.lastPayment = lp
        ? new Date(lp).toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
          })
        : null;
      delete inv._school_id;
      delete inv._student_id;
    }

    const byDay = new Map();
    for (const row of collFiltered) {
      const key = String(row.created_at).slice(0, 10);
      byDay.set(key, (byDay.get(key) || 0) + Number(row.amount_paid || 0));
    }
    const dailyRows = [...byDay.entries()].map(([d, amt]) => ({ d, amt }));

    const todayStr = new Date().toISOString().slice(0, 10);
    const weekStart = new Date();
    weekStart.setHours(0, 0, 0, 0);
    weekStart.setDate(weekStart.getDate() - 6);
    let today_paid_rwf = 0;
    let week_paid_rwf = 0;
    for (const row of collFiltered) {
      const amt = Number(row.amount_paid || 0);
      if (String(row.created_at).slice(0, 10) === todayStr) today_paid_rwf += amt;
      if (new Date(row.created_at) >= weekStart) week_paid_rwf += amt;
    }

    let fee_categories = [];
    try {
      const feeCards = await query(
        `SELECT school_id, tuition_total, paid_at_school_total, academic_year, term
         FROM accountant_babyeyi_fees
         WHERE school_id IN (${ph})`,
        ids
      );
      let tuitionExpected = 0;
      let pasExpected = 0;
      for (const card of feeCards || []) {
        const ctx = schoolCtx.get(Number(card.school_id));
        if (!ctx) continue;
        if (!accountantFeesRoutes.yearMatchesRow(card.academic_year, ctx.academicYear)) continue;
        if (!accountantFeesRoutes.termMatchesRow(card.term, ctx.term)) continue;
        tuitionExpected += Number(card.tuition_total || 0);
        pasExpected += Number(card.paid_at_school_total || 0);
      }
      const splitDenom = tuitionExpected + pasExpected;
      if (tuitionExpected > 0 || pasExpected > 0) {
        let collectedTuition = 0;
        let collectedPas = 0;
        if (splitDenom > 0) {
          collectedTuition = total_paid_rwf * (tuitionExpected / splitDenom);
          collectedPas = total_paid_rwf * (pasExpected / splitDenom);
        }
        fee_categories = [
          {
            name: 'Tuition (fee card)',
            collected: collectedTuition,
            expected: Math.max(tuitionExpected, 1),
            color: FEE_CAT_COLORS[0],
          },
          {
            name: 'Paid at school (fee card)',
            collected: collectedPas,
            expected: Math.max(pasExpected, 1),
            color: FEE_CAT_COLORS[1],
          },
        ];
      }
    } catch (_) {}

    let transactions = [];
    try {
      const recent = [...collFiltered].sort(
        (a, b) => new Date(b.created_at) - new Date(a.created_at)
      );
      const slice = recent.slice(0, 8);
      const stIds = [...new Set(slice.map((x) => x.student_id))];
      let stMap = new Map();
      if (stIds.length) {
        const stPh = stIds.map(() => '?').join(',');
        const stRows = await query(`SELECT id, first_name, last_name FROM students WHERE id IN (${stPh})`, stIds);
        stMap = new Map(stRows.map((s) => [s.id, s]));
      }
      transactions = slice.map((row) => {
        const st = stMap.get(row.student_id);
        const label = st ? `${st.first_name || ''} ${st.last_name || ''}`.trim() : 'Student';
        const t = row.created_at ? new Date(row.created_at) : new Date();
        const notes = String(row.notes || '').toLowerCase();
        let method = 'At school';
        if (notes.includes('momo') || notes.includes('mtn')) method = 'MoMo';
        else if (notes.includes('bank')) method = 'Bank';
        else if (notes.includes('cash')) method = 'Cash';
        return {
          id: row.id,
          student: label,
          school: nameById.get(Number(row.school_id)) || '',
          method,
          time: t.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
          amount: Number(row.amount_paid || 0),
          status: Number(row.amount_paid || 0) > 0 ? 'success' : 'pending',
        };
      });
    } catch (_) {}

    const total_remaining_rwf = Math.max(0, total_expected_rwf - total_paid_rwf);
    const collection_pct =
      total_expected_rwf > 0 ? Math.round((total_paid_rwf / total_expected_rwf) * 100) : 0;

    const insights = [];
    const best = [...schoolRows].sort(
      (a, b) =>
        (Number(b.fees_expected) > 0 ? Number(b.fees_collected) / Number(b.fees_expected) : 0) -
        (Number(a.fees_expected) > 0 ? Number(a.fees_collected) / Number(a.fees_expected) : 0)
    )[0];
    if (best && Number(best.fees_expected) > 0) {
      insights.push(
        `${best.name} leads collection at ${Math.round(
          (Number(best.fees_collected) / Number(best.fees_expected)) * 100
        )}% (student fees recorded by accountants).`
      );
    }
    if (aggSummary.not_paid > 0) {
      insights.push(
        `${aggSummary.not_paid} student(s) have no recorded payment toward this term’s fee card yet.`
      );
    }
    if (collection_pct >= 80 && total_expected_rwf > 0) {
      insights.push(`Strong overall collection rate (${collection_pct}%) across your scope.`);
    }

    res.json({
      success: true,
      data: {
        summary: {
          total_expected_rwf,
          total_paid_rwf,
          total_remaining_rwf,
          collection_pct,
          paid_invoice_count: aggSummary.full_pay,
          partial_invoice_count: aggSummary.remain_pay,
          unpaid_invoice_count: aggSummary.not_paid + aggSummary.no_fee_card,
          today_paid_rwf,
          week_paid_rwf,
          overdue_30d_count: 0,
        },
        schools: schoolRows,
        daily_collections: repLast14DaysChart(dailyRows),
        fee_categories,
        invoices,
        transactions,
        insights,
        source: 'accountant_student_fees',
        filters: filtersEcho,
        class_names: [...mergedClassNames].sort((a, b) => a.localeCompare(b)),
      },
    });
  } catch (err) {
    console.error('[representative fees-management]', err);
    res.status(500).json({ success: false, message: err.message || 'Failed' });
  }
});

/** Staff payroll — aggregated payroll_requests + staff config across assigned schools */
repRouter.get('/staff-payroll', requireRole(REP_ROLE), async (req, res) => {
  try {
    const scope = await resolveRepresentativeSchoolScope(req);
    if (!scope.ok) return res.status(scope.status).json({ success: false, message: scope.message });
    const ids = scope.ids;
    const nameById = new Map(scope.assignments.map((a) => [Number(a.id), a.school_name]));

    if (!ids.length) {
      return res.json({
        success: true,
        data: {
          summary: { total_staff: 0, total_budget_rwf: 0, total_paid_rwf: 0, total_pending_rwf: 0, paid_count: 0, pending_count: 0, approved_count: 0, rejected_count: 0, payroll_pct: 0, total_deductions: 0, total_allowances: 0 },
          staff: [],
          departments: [],
          monthly_trend: [],
          schools: [],
        },
      });
    }

    const ph = ids.map(() => '?').join(',');

    const monthQ = Number(req.query.month || 0);
    const termQ = String(req.query.term || '').trim();
    const yearQ = Number(req.query.year || 0);

    let staffRows = [];
    try {
      staffRows = await query(
        `SELECT st.id, st.school_id,
                TRIM(CONCAT(COALESCE(st.first_name,''), ' ', COALESCE(st.last_name,''))) AS full_name,
                st.staff_code, st.department, st.position, st.employment_status,
                COALESCE(st.payroll_basic_salary, 0) AS basic_salary,
                COALESCE(st.payroll_transport_allowance, 0) AS transport,
                COALESCE(st.payroll_housing_allowance, 0) AS housing,
                COALESCE(st.payroll_meal_allowance, 0) AS meal,
                COALESCE(st.payroll_tax_percent, 0) AS tax_pct,
                COALESCE(st.payroll_pension_amount, 0) AS pension,
                st.payroll_payment_method
         FROM staff st
         WHERE st.school_id IN (${ph}) AND (st.deleted_at IS NULL OR st.deleted_at = 0)
         ORDER BY st.school_id, st.last_name, st.first_name`,
        ids
      );
    } catch (_) {}

    const payrollWhere = [`r.school_id IN (${ph})`, 'r.deleted_at IS NULL'];
    const payrollParams = [...ids];
    if (monthQ >= 1 && monthQ <= 12) {
      payrollWhere.push('r.month = ?');
      payrollParams.push(monthQ);
    }
    if (termQ) {
      payrollWhere.push("UPPER(REPLACE(COALESCE(r.term,''),' ','')) = UPPER(REPLACE(?,' ',''))");
      payrollParams.push(termQ);
    }
    if (yearQ >= 2000 && yearQ <= 3000) {
      payrollWhere.push('r.year = ?');
      payrollParams.push(yearQ);
    }

    let payrollRows = [];
    try {
      payrollRows = await query(
        `SELECT r.id, r.school_id, r.staff_user_id, r.staff_code, r.staff_name,
                r.role_code, r.department, r.month, r.term, r.year, r.amount,
                r.status, r.paid_at, r.created_at,
                COALESCE(d.basic, 0) AS basic, COALESCE(d.allowances, 0) AS allowances,
                COALESCE(d.deductions, 0) AS deductions, COALESCE(d.net_salary, 0) AS net_salary,
                COALESCE(d.advance, 0) AS advance, COALESCE(d.final_payable, 0) AS final_payable
         FROM payroll_requests r
         LEFT JOIN payroll_details d ON d.request_id = r.id AND d.school_id = r.school_id
         WHERE ${payrollWhere.join(' AND ')}
         ORDER BY r.id DESC
         LIMIT 1000`,
        payrollParams
      );
    } catch (_) {}

    let distinctMonths = [];
    let distinctTerms = [];
    let distinctYears = [];
    try {
      const allRows = await query(
        `SELECT DISTINCT r.month, r.term, r.year
         FROM payroll_requests r
         WHERE r.school_id IN (${ph}) AND r.deleted_at IS NULL`,
        ids
      );
      const monthSet = new Set();
      const termSet = new Set();
      const yearSet = new Set();
      for (const row of allRows) {
        if (row.month) monthSet.add(Number(row.month));
        if (row.term) termSet.add(String(row.term).trim());
        if (row.year) yearSet.add(Number(row.year));
      }
      const MONTH_LABELS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
      distinctMonths = [...monthSet].sort((a, b) => a - b).map((m) => ({ value: m, label: MONTH_LABELS[m - 1] || `Month ${m}` }));
      distinctTerms = [...termSet].sort();
      distinctYears = [...yearSet].sort((a, b) => b - a);
    } catch (_) {}

    const paidCount = payrollRows.filter((r) => r.status === 'Paid').length;
    const pendingCount = payrollRows.filter((r) => r.status === 'Pending').length;
    const approvedCount = payrollRows.filter((r) => r.status === 'Approved').length;
    const rejectedCount = payrollRows.filter((r) => r.status === 'Rejected').length;

    let totalBudget = 0;
    let totalPaid = 0;
    let totalPending = 0;
    let totalDeductions = 0;
    let totalAllowances = 0;

    for (const r of payrollRows) {
      const net = Number(r.net_salary || r.amount || 0);
      totalDeductions += Number(r.deductions || 0);
      totalAllowances += Number(r.allowances || 0);
      totalBudget += net;
      if (r.status === 'Paid') totalPaid += Number(r.amount || net);
      if (r.status === 'Pending' || r.status === 'Approved') totalPending += net;
    }

    const payrollPct = totalBudget > 0 ? Math.round((totalPaid / totalBudget) * 100) : 0;

    const deptMap = new Map();
    for (const r of payrollRows) {
      const dept = r.department || 'Other';
      const prev = deptMap.get(dept) || { total: 0, count: 0 };
      prev.total += Number(r.net_salary || r.amount || 0);
      prev.count += 1;
      deptMap.set(dept, prev);
    }
    const DEPT_COLORS = ['#000435', '#f59e0b', '#10b981', '#6366f1', '#ec4899', '#14b8a6', '#d97706', '#64748b'];
    const departments = [...deptMap.entries()]
      .sort((a, b) => b[1].total - a[1].total)
      .map(([dept, v], i) => ({
        name: dept,
        total: v.total,
        count: v.count,
        color: DEPT_COLORS[i % DEPT_COLORS.length],
      }));

    const monthMap = new Map();
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    for (const r of payrollRows) {
      if (r.status !== 'Paid') continue;
      const m = Number(r.month || 0);
      const label = monthNames[m - 1] || `M${m}`;
      const key = `${r.year}-${String(m).padStart(2, '0')}`;
      monthMap.set(key, { month: label, payroll: (monthMap.get(key)?.payroll || 0) + Number(r.amount || 0) });
    }
    const monthlyTrend = [...monthMap.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-12)
      .map(([, v]) => v);

    const staffList = payrollRows.map((r) => {
      const gross = Number(r.basic || 0) + Number(r.allowances || 0);
      const net = Number(r.net_salary || r.amount || 0);
      const deductions = Number(r.deductions || 0);
      const allowances = Number(r.allowances || 0);
      const paid = r.status === 'Paid' ? Number(r.amount || net) : 0;
      const remaining = Math.max(0, net - paid);
      const name = r.staff_name || 'Staff';
      let status = 'pending';
      if (r.status === 'Paid') status = 'paid';
      else if (r.status === 'Approved') status = 'approved';
      else if (r.status === 'Rejected') status = 'rejected';
      return {
        id: r.id,
        name,
        avatar: repInitials(name),
        school: nameById.get(Number(r.school_id)) || 'School',
        department: r.department || '—',
        position: r.role_code || '—',
        gross: gross || net,
        deductions,
        allowances,
        bonus: 0,
        net,
        paid,
        remaining,
        status,
        payDate: r.paid_at
          ? new Date(r.paid_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
          : null,
        method: 'Bank',
        month: r.month || null,
        term: r.term || null,
        year: r.year || null,
      };
    });

    const schoolSummary = [];
    for (const sid of ids) {
      const schoolPayroll = payrollRows.filter((r) => Number(r.school_id) === sid);
      const schoolPaid = schoolPayroll.filter((r) => r.status === 'Paid').reduce((s, r) => s + Number(r.amount || 0), 0);
      const schoolTotal = schoolPayroll.reduce((s, r) => s + Number(r.net_salary || r.amount || 0), 0);
      schoolSummary.push({
        id: sid,
        name: nameById.get(sid) || 'School',
        staff_count: staffRows.filter((s) => Number(s.school_id) === sid).length,
        payroll_total: schoolTotal,
        payroll_paid: schoolPaid,
      });
    }

    res.json({
      success: true,
      data: {
        summary: {
          total_staff: staffRows.length,
          total_budget_rwf: totalBudget,
          total_paid_rwf: totalPaid,
          total_pending_rwf: totalPending,
          paid_count: paidCount,
          pending_count: pendingCount,
          approved_count: approvedCount,
          rejected_count: rejectedCount,
          payroll_pct: payrollPct,
          total_deductions: totalDeductions,
          total_allowances: totalAllowances,
        },
        staff: staffList,
        departments,
        monthly_trend: monthlyTrend,
        schools: schoolSummary,
        filters: {
          month: monthQ >= 1 && monthQ <= 12 ? monthQ : null,
          term: termQ || null,
          year: yearQ >= 2000 ? yearQ : null,
        },
        available_months: distinctMonths,
        available_terms: distinctTerms,
        available_years: distinctYears,
      },
    });
  } catch (err) {
    console.error('[representative staff-payroll]', err);
    res.status(500).json({ success: false, message: err.message || 'Failed' });
  }
});

module.exports = {
  adminRouter,
  repRouter,
  ensureRepRole,
  ensureProfileTable,
  ensureAssignmentTable,
  ensureSchema,
};
