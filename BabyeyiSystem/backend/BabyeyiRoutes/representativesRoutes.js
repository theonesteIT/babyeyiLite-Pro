// School Representatives — Super Admin CRUD + Representative dashboard APIs
// Mirrors fieldAgentsRoutes.js patterns. Representatives manage many schools
// from one account, set up by SUPER_ADMIN / FULL_SYSTEM_CONTROLLER.
'use strict';

const express = require('express');
const bcrypt = require('bcryptjs');
const { promisePool } = require('../config/database');
const { requireRole } = require('../middleware/deoAuth');

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

/** Aggregated KPIs across the rep's schools (defensive — only counts what exists) */
repRouter.get('/summary', requireRole(REP_ROLE), async (req, res) => {
  try {
    await ensureSchema();
    const userId = resolveUserId(req);
    const ids = (await listAssignmentsForRep(userId)).map((s) => s.id);
    if (!ids.length) {
      return res.json({
        success: true,
        data: {
          schools: 0,
          active_schools: 0,
          students: 0,
          staff: 0,
          fee_collected_rwf: 0,
          fee_pending_rwf: 0,
        },
      });
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

    res.json({
      success: true,
      data: {
        schools: Number(schoolStats?.schools || 0),
        active_schools: Number(schoolStats?.active_schools || 0),
        students,
        staff,
        fee_collected_rwf,
        fee_pending_rwf,
      },
    });
  } catch (err) {
    console.error('[representative summary]', err);
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
