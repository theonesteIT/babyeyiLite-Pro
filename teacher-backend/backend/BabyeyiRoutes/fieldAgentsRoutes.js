// Field agents: Super Admin CRUD + Agent dashboard APIs
'use strict';

const express = require('express');
const bcrypt = require('bcryptjs');
const { promisePool } = require('../config/database');
const { requireRole } = require('../middleware/deoAuth');
const { PROVINCES_FULL } = require('../data/rwandaProvincesFull');

const ELEVATED = ['SUPER_ADMIN', 'FULL_SYSTEM_CONTROLLER'];

const adminRouter = express.Router();
const agentRouter = express.Router();

const query = async (sql, params = []) => {
  const [rows] = await promisePool.query(sql, params);
  return rows;
};

async function ensureAgentRole() {
  await promisePool.query(`
    INSERT INTO roles (role_name, role_code, description, permissions, is_active, is_system_role)
    SELECT 'Field Agent', 'AGENT', 'Regional field coverage for schools and fees', '[]', 1, 0
    WHERE NOT EXISTS (SELECT 1 FROM roles WHERE UPPER(role_code) = 'AGENT' LIMIT 1)
  `).catch((e) => console.warn('[fieldAgents] ensureAgentRole:', e.message));
}

async function ensureProfileTable() {
  await promisePool.query(`
    CREATE TABLE IF NOT EXISTS field_agent_profiles (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      user_id INT UNSIGNED NOT NULL,
      province VARCHAR(120) NOT NULL,
      district VARCHAR(120) NOT NULL,
      all_sectors TINYINT(1) NOT NULL DEFAULT 0,
      sectors_json JSON NOT NULL,
      national_id VARCHAR(64) DEFAULT NULL,
      gender VARCHAR(20) DEFAULT NULL,
      date_of_birth DATE DEFAULT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_fap_user (user_id),
      KEY idx_fap_district (district),
      KEY idx_fap_province (province)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `).catch((e) => console.warn('[fieldAgents] ensureProfileTable:', e.message));
}

function districtsForProvince(province) {
  const p = PROVINCES_FULL[province];
  if (!p?.districts) return [];
  return Object.keys(p.districts).sort();
}

function sectorsForDistrict(province, district) {
  const p = PROVINCES_FULL[province];
  const d = p?.districts?.[district];
  return Array.isArray(d?.sectors) ? [...d.sectors] : [];
}

function normalizeSectorsPayload(allSectors, selectedSectors, province, district) {
  const canonical = sectorsForDistrict(province, district);
  if (allSectors) {
    return { all_sectors: 1, sectors_json: JSON.stringify(canonical), list: canonical };
  }
  const sel = Array.isArray(selectedSectors) ? selectedSectors.map((s) => String(s).trim()).filter(Boolean) : [];
  const valid = sel.filter((s) => canonical.includes(s));
  if (!valid.length) {
    throw new Error('Select at least one valid sector for this district.');
  }
  return { all_sectors: 0, sectors_json: JSON.stringify(valid), list: valid };
}

async function getProfileByUserId(userId) {
  const rows = await query(
    'SELECT * FROM field_agent_profiles WHERE user_id = ? LIMIT 1',
    [userId]
  );
  return rows[0] || null;
}

function parseSectorsFromProfile(profile) {
  if (!profile) return [];
  let sectors = [];
  try {
    sectors = typeof profile.sectors_json === 'string' ? JSON.parse(profile.sectors_json) : profile.sectors_json;
  } catch {
    sectors = [];
  }
  return Array.isArray(sectors) ? sectors : [];
}

/** For session/me — always from DB so dashboard matches Super Admin assignment */
async function getAgentSessionPayload(userId) {
  const profile = await getProfileByUserId(userId);
  if (!profile) return null;
  const sectors = parseSectorsFromProfile(profile);
  return {
    province: profile.province,
    district: profile.district,
    all_sectors: !!profile.all_sectors,
    sectors,
  };
}

async function assertSectorInAssignment(userId, sector) {
  const s = String(sector || '').trim();
  if (!s) return;
  const profile = await getProfileByUserId(userId);
  if (!profile) {
    const e = new Error('No field assignment found for your account.');
    e.statusCode = 403;
    throw e;
  }
  const allowed = new Set(parseSectorsFromProfile(profile));
  if (!allowed.has(s)) {
    const e = new Error('That sector is not part of your assigned coverage.');
    e.statusCode = 403;
    throw e;
  }
}

async function assertSchoolInAssignment(userId, schoolId) {
  const id = parseInt(schoolId, 10);
  if (!id) return;
  const { clause, params } = await schoolCoverageClause(userId);
  const rows = await query(
    `SELECT 1 AS ok FROM schools s WHERE s.deleted_at IS NULL ${clause} AND s.id = ? LIMIT 1`,
    [...params, id]
  );
  if (!rows.length) {
    const e = new Error('That school is outside your assigned district and sectors.');
    e.statusCode = 403;
    throw e;
  }
}

/** @returns {{ clause: string, params: any[] }} for SQL ... WHERE 1=1 */
async function schoolCoverageClause(agentUserId) {
  const profile = await getProfileByUserId(agentUserId);
  if (!profile) return { clause: ' AND 1=0 ', params: [] };
  const sectors = parseSectorsFromProfile(profile);
  if (!sectors.length) return { clause: ' AND 1=0 ', params: [] };
  const ph = sectors.map(() => '?').join(',');
  return {
    clause: ` AND s.province = ? AND s.district = ? AND s.sector IN (${ph}) `,
    params: [profile.province, profile.district, ...sectors],
  };
}

function resolveUserId(req) {
  return req.session?.userId || req.session?.user?.id || null;
}

// ── Static geo (for forms) ─────────────────────────────────────
adminRouter.get('/rwanda-geo', requireRole(...ELEVATED), (_req, res) => {
  res.json({ success: true, data: PROVINCES_FULL });
});

/** Agents only receive their assigned province / district / sectors (not the full country). */
agentRouter.get('/rwanda-geo', requireRole('AGENT'), async (req, res) => {
  try {
    const userId = resolveUserId(req);
    const profile = await getProfileByUserId(userId);
    if (!profile) {
      return res.json({
        success: true,
        data: {},
        assignment: null,
        message: 'No coverage profile — ask a Super Admin to complete your assignment.',
      });
    }
    const sectors = parseSectorsFromProfile(profile);
    const scoped = {
      [profile.province]: {
        districts: {
          [profile.district]: { sectors },
        },
      },
    };
    res.json({
      success: true,
      data: scoped,
      assignment: {
        province: profile.province,
        district: profile.district,
        all_sectors: !!profile.all_sectors,
        sectors,
      },
    });
  } catch (err) {
    console.error('[agent/rwanda-geo]', err);
    res.status(500).json({ success: false, message: err.message || 'Failed' });
  }
});

/** Canonical assignment from DB (same rules as all dashboard queries). */
agentRouter.get('/my-coverage', requireRole('AGENT'), async (req, res) => {
  try {
    const userId = resolveUserId(req);
    const payload = await getAgentSessionPayload(userId);
    if (!payload) {
      return res.status(403).json({
        success: false,
        message: 'Your account has no district/sector assignment. Contact Super Admin.',
        code: 'AGENT_NO_COVERAGE',
      });
    }
    res.json({ success: true, data: payload });
  } catch (err) {
    console.error('[agent/my-coverage]', err);
    res.status(500).json({ success: false, message: err.message || 'Failed' });
  }
});

// ── Super Admin CRUD ───────────────────────────────────────────
adminRouter.get('/meta/districts', requireRole(...ELEVATED), (req, res) => {
  const province = String(req.query.province || '').trim();
  if (!province || !PROVINCES_FULL[province]) {
    return res.status(400).json({ success: false, message: 'Invalid province' });
  }
  res.json({ success: true, data: { districts: districtsForProvince(province) } });
});

adminRouter.get('/meta/sectors', requireRole(...ELEVATED), (req, res) => {
  const province = String(req.query.province || '').trim();
  const district = String(req.query.district || '').trim();
  if (!province || !district) {
    return res.status(400).json({ success: false, message: 'province and district required' });
  }
  const sectors = sectorsForDistrict(province, district);
  if (!sectors.length) {
    return res.status(400).json({ success: false, message: 'Unknown district for province' });
  }
  res.json({ success: true, data: { sectors } });
});

adminRouter.get('/agents', requireRole(...ELEVATED), async (_req, res) => {
  try {
    await ensureAgentRole();
    await ensureProfileTable();
    const rows = await query(
      `SELECT u.id, u.user_uid, u.email, u.first_name, u.last_name, u.phone, u.is_active, u.created_at,
              p.province, p.district, p.all_sectors, p.sectors_json, p.national_id, p.gender, p.date_of_birth
       FROM users u
       INNER JOIN roles r ON r.id = u.role_id AND UPPER(r.role_code) = 'AGENT'
       LEFT JOIN field_agent_profiles p ON p.user_id = u.id
       WHERE u.deleted_at IS NULL
       ORDER BY u.created_at DESC`
    );
    const data = rows.map((r) => {
      let sectors = [];
      try {
        sectors = typeof r.sectors_json === 'string' ? JSON.parse(r.sectors_json) : r.sectors_json;
      } catch {
        sectors = [];
      }
      return { ...r, sectors: Array.isArray(sectors) ? sectors : [], sectors_json: undefined };
    });
    res.json({ success: true, data });
  } catch (err) {
    console.error('[field-agents GET]', err);
    res.status(500).json({ success: false, message: err.message || 'Failed to list agents' });
  }
});

adminRouter.post('/agents', requireRole(...ELEVATED), async (req, res) => {
  try {
    await ensureAgentRole();
    await ensureProfileTable();
    const b = req.body || {};
    const first_name = String(b.first_name || '').trim();
    const last_name = String(b.last_name || '').trim();
    const email = String(b.email || '').trim().toLowerCase();
    const password = String(b.password || '');
    const phone = String(b.phone || '').trim() || null;
    const province = String(b.province || '').trim();
    const district = String(b.district || '').trim();
    const all_sectors = !!b.all_sectors;
    const national_id = String(b.national_id || '').trim() || null;
    const gender = String(b.gender || '').trim() || null;
    const date_of_birth = b.date_of_birth ? String(b.date_of_birth).trim() : null;

    if (!first_name || !last_name || !email || password.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'First name, last name, email and password (min 8 characters) are required.',
      });
    }
    if (!province || !district) {
      return res.status(400).json({ success: false, message: 'Province and district are required.' });
    }
    let sectorPack;
    try {
      sectorPack = normalizeSectorsPayload(all_sectors, b.sectors, province, district);
    } catch (e) {
      return res.status(400).json({ success: false, message: e.message });
    }

    const [dup] = await query('SELECT id FROM users WHERE LOWER(email) = ? AND deleted_at IS NULL LIMIT 1', [email]);
    if (dup) {
      return res.status(400).json({ success: false, message: 'An account with this email already exists.' });
    }

    const [[roleRow]] = await promisePool.query(
      "SELECT id FROM roles WHERE UPPER(role_code) = 'AGENT' LIMIT 1"
    );
    if (!roleRow) {
      return res.status(500).json({ success: false, message: 'AGENT role missing — run DB migration or restart server.' });
    }

    const password_hash = await bcrypt.hash(password, 10);
    const user_uid = `AG-${Date.now().toString().slice(-8)}${Math.floor(Math.random() * 1000)
      .toString()
      .padStart(3, '0')}`;

    const [ins] = await promisePool.query(
      `INSERT INTO users (user_uid, email, phone, password_hash, first_name, last_name, role_id, school_id, province, district, sector, is_active, is_verified)
       VALUES (?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, NULL, 1, 1)`,
      [user_uid, email, phone, password_hash, first_name, last_name, roleRow.id, province, district]
    );
    const userId = ins.insertId;

    await query(
      `INSERT INTO field_agent_profiles (user_id, province, district, all_sectors, sectors_json, national_id, gender, date_of_birth)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        province,
        district,
        sectorPack.all_sectors,
        JSON.stringify(sectorPack.list),
        national_id,
        gender,
        date_of_birth || null,
      ]
    );

    res.status(201).json({
      success: true,
      message: 'Field agent registered.',
      data: { id: userId, user_uid, email },
    });
  } catch (err) {
    console.error('[field-agents POST]', err);
    res.status(500).json({ success: false, message: err.message || 'Failed to create agent' });
  }
});

adminRouter.patch('/agents/:id', requireRole(...ELEVATED), async (req, res) => {
  try {
    await ensureProfileTable();
    const id = parseInt(req.params.id, 10);
    if (!id) return res.status(400).json({ success: false, message: 'Invalid id' });
    const [[u]] = await promisePool.query(
      `SELECT u.id FROM users u INNER JOIN roles r ON r.id = u.role_id AND UPPER(r.role_code) = 'AGENT' WHERE u.id = ? AND u.deleted_at IS NULL`,
      [id]
    );
    if (!u) return res.status(404).json({ success: false, message: 'Agent not found' });

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
        return res.status(400).json({ success: false, message: 'Password must be at least 8 characters.' });
      }
      updatesUser.push('password_hash = ?');
      paramsUser.push(await bcrypt.hash(String(b.password), 10));
    }
    if (updatesUser.length) {
      paramsUser.push(id);
      await query(`UPDATE users SET ${updatesUser.join(', ')} WHERE id = ?`, paramsUser);
    }

    const profile = await getProfileByUserId(id);
    const geoUpdate =
      b.province != null || b.district != null || b.all_sectors !== undefined || b.sectors != null;
    if (profile && geoUpdate) {
      const province = b.province != null ? String(b.province).trim() : profile.province;
      const district = b.district != null ? String(b.district).trim() : profile.district;
      const allSectors = b.all_sectors !== undefined ? !!b.all_sectors : !!profile.all_sectors;
      let prevSectors = [];
      try {
        const raw = profile.sectors_json;
        prevSectors = typeof raw === 'string' ? JSON.parse(raw || '[]') : raw || [];
      } catch {
        prevSectors = [];
      }
      if (!Array.isArray(prevSectors)) prevSectors = [];
      const sectorPack = normalizeSectorsPayload(
        allSectors,
        b.sectors != null ? b.sectors : prevSectors,
        province,
        district
      );
      await query(
        `UPDATE field_agent_profiles SET province=?, district=?, all_sectors=?, sectors_json=?
         WHERE user_id=?`,
        [province, district, sectorPack.all_sectors, JSON.stringify(sectorPack.list), id]
      );
    }
    if (profile && (b.national_id !== undefined || b.gender !== undefined || b.date_of_birth !== undefined)) {
      await query(
        `UPDATE field_agent_profiles SET
         national_id = COALESCE(?, national_id),
         gender = COALESCE(?, gender),
         date_of_birth = COALESCE(?, date_of_birth)
         WHERE user_id = ?`,
        [
          b.national_id !== undefined ? String(b.national_id || '').trim() || null : null,
          b.gender !== undefined ? String(b.gender || '').trim() || null : null,
          b.date_of_birth !== undefined ? (b.date_of_birth ? String(b.date_of_birth) : null) : null,
          id,
        ]
      );
    }

    res.json({ success: true, message: 'Agent updated.' });
  } catch (err) {
    console.error('[field-agents PATCH]', err);
    res.status(500).json({ success: false, message: err.message || 'Update failed' });
  }
});

adminRouter.delete('/agents/:id', requireRole(...ELEVATED), async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!id) return res.status(400).json({ success: false, message: 'Invalid id' });
    const [[u]] = await promisePool.query(
      `SELECT u.id FROM users u INNER JOIN roles r ON r.id = u.role_id AND UPPER(r.role_code) = 'AGENT' WHERE u.id = ? AND u.deleted_at IS NULL`,
      [id]
    );
    if (!u) return res.status(404).json({ success: false, message: 'Agent not found' });
    await query('UPDATE users SET deleted_at = NOW(), is_active = 0 WHERE id = ?', [id]);
    res.json({ success: true, message: 'Agent deactivated.' });
  } catch (err) {
    console.error('[field-agents DELETE]', err);
    res.status(500).json({ success: false, message: err.message || 'Delete failed' });
  }
});

// ── Agent dashboard ────────────────────────────────────────────
agentRouter.get('/summary', requireRole('AGENT'), async (req, res) => {
  try {
    const userId = resolveUserId(req);
    const assign = await getAgentSessionPayload(userId);
    if (!assign?.sectors?.length) {
      return res.json({
        success: true,
        data: {
          schools_in_coverage: 0,
          total_collected_rwf: 0,
          paid_transactions: 0,
          pending_amount_rwf: 0,
          pending_transactions: 0,
          assignment: assign,
          no_coverage: !assign,
        },
      });
    }
    const { clause, params } = await schoolCoverageClause(userId);
    const [[schools]] = await promisePool.query(
      `SELECT COUNT(*) AS n FROM schools s WHERE s.deleted_at IS NULL ${clause}`,
      params
    );
    const [[paid]] = await promisePool.query(
      `SELECT COALESCE(SUM(i.total_rwf), 0) AS total, COUNT(*) AS cnt
       FROM babyeyi_payment_intents i
       INNER JOIN schools s ON s.id = i.school_id AND s.deleted_at IS NULL
       WHERE (UPPER(COALESCE(i.invoice_status,'')) = 'PAID' OR LOWER(COALESCE(i.status,'')) = 'paid')
       ${clause}`,
      params
    );
    const [[pending]] = await promisePool.query(
      `SELECT COALESCE(SUM(i.total_rwf), 0) AS total, COUNT(*) AS cnt
       FROM babyeyi_payment_intents i
       INNER JOIN schools s ON s.id = i.school_id AND s.deleted_at IS NULL
       WHERE UPPER(COALESCE(i.invoice_status,'NOT_PAID')) <> 'PAID'
         AND LOWER(COALESCE(i.status,'')) <> 'paid'
       ${clause}`,
      params
    );
    res.json({
      success: true,
      data: {
        schools_in_coverage: Number(schools?.n || 0),
        total_collected_rwf: Number(paid?.total || 0),
        paid_transactions: Number(paid?.cnt || 0),
        pending_amount_rwf: Number(pending?.total || 0),
        pending_transactions: Number(pending?.cnt || 0),
        assignment: assign,
      },
    });
  } catch (err) {
    console.error('[agent/summary]', err);
    res.status(500).json({ success: false, message: err.message || 'Failed' });
  }
});

agentRouter.get('/schools', requireRole('AGENT'), async (req, res) => {
  try {
    const userId = resolveUserId(req);
    const sector = String(req.query.sector || '').trim();
    await assertSectorInAssignment(userId, sector);
    const { clause, params } = await schoolCoverageClause(userId);
    const cell = String(req.query.cell || '').trim();
    const q = String(req.query.search || '').trim();
    let sql = `SELECT s.id, s.school_name, s.school_code, s.province, s.district, s.sector, s.cell, s.status, s.phone, s.email
               FROM schools s WHERE s.deleted_at IS NULL ${clause}`;
    const p = [...params];
    if (sector) {
      sql += ' AND s.sector = ?';
      p.push(sector);
    }
    if (cell) {
      sql += ' AND s.cell = ?';
      p.push(cell);
    }
    if (q) {
      sql += ' AND (s.school_name LIKE ? OR s.school_code LIKE ?)';
      const like = `%${q}%`;
      p.push(like, like);
    }
    sql += ' ORDER BY s.school_name ASC LIMIT 500';
    const rows = await query(sql, p);
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('[agent/schools]', err);
    const code = err.statusCode || 500;
    res.status(code).json({ success: false, message: err.message || 'Failed' });
  }
});

agentRouter.get('/schools/filters', requireRole('AGENT'), async (req, res) => {
  try {
    const userId = resolveUserId(req);
    const { clause, params } = await schoolCoverageClause(userId);
    const sectors = await query(
      `SELECT DISTINCT s.sector AS name FROM schools s WHERE s.deleted_at IS NULL ${clause} ORDER BY s.sector`,
      params
    );
    const cells = await query(
      `SELECT DISTINCT s.cell AS name FROM schools s WHERE s.deleted_at IS NULL ${clause} ORDER BY s.cell`,
      params
    );
    res.json({
      success: true,
      data: {
        sectors: sectors.map((r) => r.name).filter(Boolean),
        cells: cells.map((r) => r.name).filter(Boolean),
      },
    });
  } catch (err) {
    console.error('[agent/schools/filters]', err);
    res.status(500).json({ success: false, message: err.message || 'Failed' });
  }
});

agentRouter.get('/reports/summary', requireRole('AGENT'), async (req, res) => {
  try {
    const userId = resolveUserId(req);
    const { clause, params } = await schoolCoverageClause(userId);
    const from = String(req.query.date_from || '').trim();
    const to = String(req.query.date_to || '').trim();
    let dateSql = '';
    const p = [...params];
    if (from) {
      dateSql += ' AND DATE(i.created_at) >= ?';
      p.push(from);
    }
    if (to) {
      dateSql += ' AND DATE(i.created_at) <= ?';
      p.push(to);
    }
    const byMonth = await query(
      `SELECT DATE_FORMAT(i.created_at, '%Y-%m') AS period,
              COALESCE(SUM(CASE WHEN UPPER(COALESCE(i.invoice_status,'')) = 'PAID' OR LOWER(COALESCE(i.status,'')) = 'paid' THEN i.total_rwf ELSE 0 END), 0) AS paid_rwf,
              COUNT(*) AS intents
       FROM babyeyi_payment_intents i
       INNER JOIN schools s ON s.id = i.school_id AND s.deleted_at IS NULL
       WHERE 1=1 ${clause} ${dateSql}
       GROUP BY DATE_FORMAT(i.created_at, '%Y-%m')
       ORDER BY period DESC
       LIMIT 24`,
      p
    );
    res.json({ success: true, data: { by_month: byMonth } });
  } catch (err) {
    console.error('[agent/reports/summary]', err);
    res.status(500).json({ success: false, message: err.message || 'Failed' });
  }
});

/** Service lines aligned with public /services narrative — revenue where data exists */
agentRouter.get('/services/revenue', requireRole('AGENT'), async (req, res) => {
  try {
    const userId = resolveUserId(req);
    const { clause, params } = await schoolCoverageClause(userId);
    const [[babyeyi]] = await promisePool.query(
      `SELECT COALESCE(SUM(i.total_rwf), 0) AS total
       FROM babyeyi_payment_intents i
       INNER JOIN schools s ON s.id = i.school_id AND s.deleted_at IS NULL
       WHERE (UPPER(COALESCE(i.invoice_status,'')) = 'PAID' OR LOWER(COALESCE(i.status,'')) = 'paid')
       ${clause}`,
      params
    );
    const total = Number(babyeyi?.total || 0);
    const services = [
      { key: 'babyeyi_fees', title: 'School fees (Babyeyi)', description: 'Document-based fees & requirements paid through Babyeyi.', amount_rwf: total },
      { key: 'shulecard', title: 'ShuleCard', description: 'Digital payments via ShuleCard.', amount_rwf: 0 },
      { key: 'shuleshoe', title: 'ShuleShoe Voucher', description: 'Footwear voucher programme.', amount_rwf: 0 },
      { key: 'uniform', title: 'Uniform Voucher', description: 'Uniform support.', amount_rwf: 0 },
      { key: 'shulekit', title: 'ShuleKit', description: 'Educational kits.', amount_rwf: 0 },
      { key: 'classkit', title: 'ClassKit / supplies', description: 'Classroom supplies orders.', amount_rwf: 0 },
    ];
    res.json({ success: true, data: { services, note: 'Only Babyeyi school-fee collections are aggregated from payment records in this release.' } });
  } catch (err) {
    console.error('[agent/services/revenue]', err);
    res.status(500).json({ success: false, message: err.message || 'Failed' });
  }
});

agentRouter.get('/school-fees', requireRole('AGENT'), async (req, res) => {
  try {
    const userId = resolveUserId(req);
    const sector = String(req.query.sector || '').trim();
    const schoolId = parseInt(req.query.school_id, 10);
    await assertSectorInAssignment(userId, sector);
    await assertSchoolInAssignment(userId, schoolId);
    const { clause, params } = await schoolCoverageClause(userId);
    const cell = String(req.query.cell || '').trim();
    const academicYear = String(req.query.academic_year || '').trim();
    const term = String(req.query.term || '').trim();
    let sql = `
      SELECT i.id, i.invoice_no, i.invoice_status, i.status, i.total_rwf, i.created_at, i.invoice_paid_at,
             s.id AS school_id, s.school_name, s.school_code, s.sector, s.cell,
             b.term, b.academic_year, b.class_name
      FROM babyeyi_payment_intents i
      INNER JOIN schools s ON s.id = i.school_id AND s.deleted_at IS NULL
      LEFT JOIN school_babyeyi b ON b.id = i.babyeyi_id
      WHERE 1=1 ${clause}`;
    const p = [...params];
    if (sector) {
      sql += ' AND s.sector = ?';
      p.push(sector);
    }
    if (cell) {
      sql += ' AND s.cell = ?';
      p.push(cell);
    }
    if (schoolId) {
      sql += ' AND s.id = ?';
      p.push(schoolId);
    }
    if (academicYear) {
      sql += ' AND (b.academic_year LIKE ? OR b.academic_year = ?)';
      p.push(`%${academicYear}%`, academicYear);
    }
    if (term) {
      sql += ' AND b.term = ?';
      p.push(term);
    }
    sql += ' ORDER BY i.created_at DESC LIMIT 800';
    const rows = await query(sql, p);
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('[agent/school-fees]', err);
    const code = err.statusCode || 500;
    res.status(code).json({ success: false, message: err.message || 'Failed' });
  }
});

module.exports = {
  adminRouter,
  agentRouter,
  ensureAgentRole,
  ensureProfileTable,
  getProfileByUserId,
  getAgentSessionPayload,
};
