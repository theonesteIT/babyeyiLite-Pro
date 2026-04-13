// ================================================================
// school-add.js — School Registration Routes  v2.2
//
// FIXED (matched to actual `users` table schema):
//   ✅ password_hash  (was: password)
//   ✅ first_name + last_name  (was: full_name)
//   ✅ role_id via roles lookup  (was: role text column)
//   ✅ force_password_change  (was: must_change_password)
//   ✅ user_uid auto-generated  (required NOT NULL UNIQUE)
//   ✅ is_verified = 1
//   ✅ School code optional on login (manager logs in with email+password only)
//
// ROUTES:
//   POST   /api/schools
//   GET    /api/schools
//   GET    /api/schools/districts
//   POST   /api/schools/bulk-delete
//   GET    /api/schools/:id
//   PUT    /api/schools/:id
//   DELETE /api/schools/:id
//   GET    /api/schools/check-code
//   GET    /api/schools/check-username
//   GET    /api/schools/check-email
//   GET    /api/schools/:id/summary
//   PUT    /api/schools/:id/status
//   POST   /api/schools/:id/logo
//   POST   /api/schools/:id/signature
//   POST   /api/schools/:id/stamp
//   GET    /api/locations/provinces
//   GET    /api/locations/districts
//   GET    /api/locations/sectors
//   GET    /api/locations/cells
// ================================================================

const express    = require('express');
const router     = express.Router();
const multer     = require('multer');
const path       = require('path');
const fs         = require('fs');
const bcrypt     = require('bcryptjs');
const nodemailer = require('nodemailer');

// ── DB ────────────────────────────────────────────────────────
const { promisePool: db } = require('../config/database');
const { getDistrictCode, DISTRICTS_ALPHA } = require('../utils/rwandaDistrictCodes');

async function ensureSchoolsExtraColumns(conn) {
  await conn.query('ALTER TABLE schools ADD COLUMN district_code VARCHAR(2) NULL').catch(() => {});
  await conn.query('ALTER TABLE schools ADD COLUMN a_level_combinations JSON NULL').catch(() => {});
  await conn.query('ALTER TABLE schools ADD COLUMN tvet_trades JSON NULL').catch(() => {});
  await conn.query('ALTER TABLE schools ADD COLUMN is_skeleton TINYINT(1) NOT NULL DEFAULT 0').catch(() => {});
}

/** Next 3-digit numeric school code (001–999), based on existing numeric codes only. */
async function getNextNumericSchoolCode(conn) {
  const [rows] = await conn.query(
    `SELECT school_code FROM schools WHERE deleted_at IS NULL AND school_code REGEXP '^[0-9]{1,3}$'`
  );
  let max = 0;
  for (const r of rows) {
    const n = parseInt(r.school_code, 10);
    if (!Number.isNaN(n) && n > max) max = n;
  }
  const next = max + 1;
  if (next > 999) throw new Error('Maximum school codes (999) reached');
  return String(next).padStart(3, '0');
}

// ── Email transporter ─────────────────────────────────────────
const transporter = nodemailer.createTransport({
  host:   process.env.SMTP_HOST || 'smtp.gmail.com',
  port:   parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// ── Generate a unique user_uid ────────────────────────────────
function generateUserUID(prefix = 'SM') {
  const ts  = Date.now().toString().slice(-6);
  const rnd = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `${prefix}-${ts}${rnd}`;
}

// ── Look up role_id by role_code ──────────────────────────────
async function getRoleId(conn, roleCode) {
  const [rows] = await conn.query(
    'SELECT id FROM roles WHERE role_code = ? LIMIT 1', [roleCode]
  );
  return rows[0]?.id ?? null;
}

/**
 * sendWelcomeEmail — non-fatal fire-and-forget
 */
async function sendWelcomeEmail({ to, schoolName, schoolCode, username, password, district, province }) {
  const from     = process.env.SMTP_FROM || `"Smart Education" <${process.env.SMTP_USER}>`;
  const loginUrl = `${process.env.FRONTEND_URL || 'http://localhost:5174'}/login`;

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>School Registration Successful</title>
</head>
<body style="margin:0;padding:0;background:#f0f7ff;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f7ff;padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
        <tr>
          <td style="background:linear-gradient(135deg,#1d4ed8,#2563eb);border-radius:16px 16px 0 0;padding:40px 40px 32px;text-align:center;">
            <div style="font-size:42px;margin-bottom:12px;">🏫</div>
            <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:800;">School Registered Successfully!</h1>
            <p style="margin:8px 0 0;color:#bfdbfe;font-size:14px;">Smart Education Management System</p>
          </td>
        </tr>
        <tr>
          <td style="background:#ffffff;padding:40px;border-left:1px solid #dbeafe;border-right:1px solid #dbeafe;">
            <p style="margin:0 0 20px;color:#1e3a8a;font-size:15px;line-height:1.6;">
              Hello,<br/><br/>
              Congratulations! <strong>${schoolName}</strong> has been successfully registered.
              Below are the login credentials for the school manager account.
            </p>

            <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:12px;padding:20px;margin-bottom:24px;">
              <p style="margin:0 0 12px;color:#1d4ed8;font-size:12px;font-weight:700;text-transform:uppercase;">📋 School Details</p>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr><td style="color:#64748b;font-size:13px;padding:4px 0;width:40%;">School Name</td><td style="color:#1e3a8a;font-size:13px;font-weight:600;">${schoolName}</td></tr>
                <tr><td style="color:#64748b;font-size:13px;padding:4px 0;">School Code</td><td style="color:#1e3a8a;font-size:13px;font-weight:600;font-family:monospace;">${schoolCode}</td></tr>
                <tr><td style="color:#64748b;font-size:13px;padding:4px 0;">Location</td><td style="color:#1e3a8a;font-size:13px;font-weight:600;">${district}, ${province}</td></tr>
              </table>
            </div>

            <div style="background:#0f172a;border-radius:12px;padding:24px;margin-bottom:24px;">
              <p style="margin:0 0 16px;color:#94a3b8;font-size:12px;font-weight:700;text-transform:uppercase;">🔐 Login Credentials</p>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr><td style="color:#64748b;font-size:13px;padding:6px 0;width:35%;">Email</td><td style="color:#60a5fa;font-size:13px;font-weight:600;">${to}</td></tr>
                <tr><td style="color:#64748b;font-size:13px;padding:6px 0;">Username</td><td style="color:#60a5fa;font-size:13px;font-weight:600;font-family:monospace;">${username}</td></tr>
                <tr>
                  <td style="color:#64748b;font-size:13px;padding:6px 0;">Password</td>
                  <td style="padding:6px 0;">
                    <span style="background:#1e3a8a;color:#ffffff;font-family:monospace;font-size:14px;font-weight:700;padding:4px 12px;border-radius:6px;letter-spacing:1px;">${password}</span>
                  </td>
                </tr>
              </table>
            </div>

            <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:16px;margin-bottom:24px;">
              <p style="margin:0;color:#166534;font-size:13px;line-height:1.7;">
                <strong>💡 How to login:</strong><br/>
                Go to the login page, enter your <strong>email</strong> and <strong>password</strong> above.<br/>
                The <em>School Code</em> field is <strong>optional</strong> — you do not need to fill it in.
              </p>
            </div>

            <div style="background:#fefce8;border:1px solid #fde047;border-radius:10px;padding:16px;margin-bottom:28px;">
              <p style="margin:0;color:#854d0e;font-size:13px;line-height:1.6;">
                ⚠️ <strong>Important:</strong> You will be prompted to change your password on first login.
                Keep these credentials confidential.
              </p>
            </div>

            <div style="text-align:center;">
              <a href="${loginUrl}" style="display:inline-block;background:linear-gradient(135deg,#1d4ed8,#2563eb);color:#ffffff;text-decoration:none;font-size:15px;font-weight:700;padding:14px 36px;border-radius:10px;">
                Login to Your School Portal →
              </a>
            </div>
          </td>
        </tr>
        <tr>
          <td style="background:#f8fafc;border:1px solid #dbeafe;border-top:none;border-radius:0 0 16px 16px;padding:24px 40px;text-align:center;">
            <p style="margin:0;color:#94a3b8;font-size:12px;line-height:1.8;">
              Smart Education Management System<br/>
              This is an automated message — do not reply directly.<br/>
              If you did not request this, contact support immediately.
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const text = `
School Registration Successful — Smart Education

School: ${schoolName} (${schoolCode})
Location: ${district}, ${province}

LOGIN CREDENTIALS
-----------------
Email:    ${to}
Username: ${username}
Password: ${password}

HOW TO LOGIN:
Go to: ${loginUrl}
Enter your email and password. School Code is OPTIONAL — leave it blank.

IMPORTANT: Change your password on first login. Keep credentials confidential.
  `.trim();

  try {
    await transporter.sendMail({
      from,
      to,
      subject: `✅ School Account Created — ${schoolName} | Smart Education`,
      text,
      html,
    });
    console.log(`📧  Welcome email sent to ${to}`);
  } catch (err) {
    console.error(`⚠️  Failed to send welcome email to ${to}:`, err.message);
  }
}

// ── Upload directories ────────────────────────────────────────
const dirs = ['uploads/school-logos', 'uploads/school-signatures', 'uploads/school-stamps'];
dirs.forEach(d => { if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true }); });

// ── Multer ────────────────────────────────────────────────────
const schoolMediaStorage = multer.diskStorage({
  destination(_req, file, cb) {
    const map = {
      logo:          'uploads/school-logos/',
      headSignature: 'uploads/school-signatures/',
      stamp:         'uploads/school-stamps/',
    };
    cb(null, map[file.fieldname] || 'uploads/');
  },
  filename(_req, file, cb) {
    const ext  = path.extname(file.originalname);
    const base = path.basename(file.originalname, ext).replace(/\s+/g, '-');
    cb(null, `${base}-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
  },
});

const schoolMediaUpload = multer({
  storage: schoolMediaStorage,
  limits:  { fileSize: 5 * 1024 * 1024, files: 3, fields: 40 },
  fileFilter(_req, file, cb) {
    const ok = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    ok.includes(file.mimetype) ? cb(null, true) : cb(new Error(`Invalid file type: ${file.mimetype}`));
  },
});

const VALID_LEVELS     = ['nursery', 'primary', 'o_level', 'a_level', 'tvet'];
const VALID_CATEGORIES = ['Day', 'Boarding', 'Day & Boarding'];
const VALID_OWNERSHIP  = ['Government', 'Government-Aided', 'Private'];

// ── Role code for school managers ─────────────────────────────
// If your roles table uses 'SCHOOL_MANAGER' instead, change this.
const SCHOOL_MANAGER_ROLE_CODE = 'SCHOOL_ADMIN';

// ════════════════════════════════════════════════════════════════
// LOCATION ENDPOINTS
// ════════════════════════════════════════════════════════════════

router.get('/locations/provinces', (_req, res) => {
  res.json({
    success: true,
    data: ['Kigali City', 'Northern Province', 'Southern Province', 'Eastern Province', 'Western Province'],
  });
});

router.get('/locations/districts', async (req, res) => {
  try {
    const { province } = req.query;
    if (!province) return res.status(400).json({ success: false, message: 'province is required' });
    const [rows] = await db.query(
      'SELECT DISTINCT district FROM rwanda_locations WHERE province = ? ORDER BY district', [province]
    );
    res.json({ success: true, data: rows.map(r => r.district) });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.get('/locations/sectors', async (req, res) => {
  try {
    const { province, district } = req.query;
    if (!province || !district)
      return res.status(400).json({ success: false, message: 'province and district are required' });
    const [rows] = await db.query(
      'SELECT DISTINCT sector FROM rwanda_locations WHERE province = ? AND district = ? ORDER BY sector',
      [province, district]
    );
    res.json({ success: true, data: rows.map(r => r.sector) });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.get('/locations/cells', async (req, res) => {
  try {
    const { province, district, sector } = req.query;
    if (!province || !district || !sector)
      return res.status(400).json({ success: false, message: 'province, district, and sector are required' });
    const [rows] = await db.query(
      'SELECT DISTINCT cell FROM rwanda_locations WHERE province = ? AND district = ? AND sector = ? ORDER BY cell',
      [province, district, sector]
    );
    res.json({ success: true, data: rows.map(r => r.cell) });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// ════════════════════════════════════════════════════════════════
// VALIDATION ENDPOINTS
// ════════════════════════════════════════════════════════════════

router.get('/schools/check-code', async (req, res) => {
  try {
    const { code, excludeId } = req.query;
    if (!code) return res.status(400).json({ success: false, message: 'code is required' });
    const sql    = excludeId
      ? 'SELECT id FROM schools WHERE school_code = ? AND id != ? AND deleted_at IS NULL'
      : 'SELECT id FROM schools WHERE school_code = ? AND deleted_at IS NULL';
    const params = excludeId ? [code.toUpperCase(), excludeId] : [code.toUpperCase()];
    const [rows] = await db.query(sql, params);
    res.json({ success: true, available: rows.length === 0 });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.get('/schools/check-username', async (req, res) => {
  try {
    const { username, excludeId } = req.query;
    if (!username) return res.status(400).json({ success: false, message: 'username is required' });
    const sql    = excludeId
      ? 'SELECT id FROM users WHERE username = ? AND id != ?'
      : 'SELECT id FROM users WHERE username = ?';
    const params = excludeId ? [username, excludeId] : [username];
    const [rows] = await db.query(sql, params);
    res.json({ success: true, available: rows.length === 0 });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.get('/schools/check-email', async (req, res) => {
  try {
    const { email, excludeId } = req.query;
    if (!email) return res.status(400).json({ success: false, message: 'email is required' });
    const sql    = excludeId
      ? 'SELECT id FROM users WHERE email = ? AND id != ?'
      : 'SELECT id FROM users WHERE email = ?';
    const params = excludeId ? [email, excludeId] : [email];
    const [rows] = await db.query(sql, params);
    res.json({ success: true, available: rows.length === 0 });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// Next 3-digit school code (for Super Admin / forms). Optional ?district=Name → include districtCode 01–30
router.get('/schools/next-school-code', async (req, res) => {
  const conn = await db.getConnection();
  try {
    await ensureSchoolsExtraColumns(conn);
    const next = await getNextNumericSchoolCode(conn);
    const district = req.query.district;
    const districtCode = district ? getDistrictCode(String(district)) : null;
    res.json({ success: true, data: { schoolCode: next, districtCode } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  } finally {
    conn.release();
  }
});

// ════════════════════════════════════════════════════════════════
// SCHOOL LIST
// ════════════════════════════════════════════════════════════════

router.get('/schools', async (req, res) => {
  try {
    const {
      province, district, sector, ownership, category,
      level, status, search, page = 1, limit = 20,
    } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const where  = ['s.deleted_at IS NULL'];
    const params = [];

    if (province)  { where.push('s.province = ?');        params.push(province); }
    if (district)  { where.push('s.district = ?');        params.push(district); }
    if (sector)    { where.push('s.sector = ?');          params.push(sector); }
    if (ownership) { where.push('s.ownership_type = ?');  params.push(ownership); }
    if (category)  { where.push('s.school_category = ?'); params.push(category); }
    if (status)    { where.push('s.status = ?');          params.push(status); }
    if (level)     { where.push('JSON_CONTAINS(s.education_levels, JSON_QUOTE(?))'); params.push(level); }
    if (search) {
      where.push('(s.school_name LIKE ? OR s.school_code LIKE ? OR s.district LIKE ?)');
      const t = `%${search}%`;
      params.push(t, t, t);
    }

    const baseSql = `FROM schools s WHERE ${where.join(' AND ')}`;

    const [[rows], [countRows]] = await Promise.all([
      db.query(
        `SELECT s.id, s.school_name, s.school_code, s.province, s.district, s.district_code, s.sector,
                s.cell, s.village, s.phone, s.email, s.ownership_type, s.school_category,
                s.education_levels, s.year_established, s.head_teacher_name,
                s.logo_url, s.status, s.created_at,
                s.a_level_combinations, s.tvet_trades, s.is_skeleton,
                s.subscription_plan, s.pro_enabled, s.pro_start_date, s.pro_end_date, s.school_status
         ${baseSql} ORDER BY s.school_name ASC LIMIT ? OFFSET ?`,
        [...params, parseInt(limit), offset]
      ),
      db.query(`SELECT COUNT(*) AS total ${baseSql}`, params),
    ]);

    const schools = rows.map(r => {
      try {
        r.education_levels = typeof r.education_levels === 'string'
          ? JSON.parse(r.education_levels) : r.education_levels;
      } catch (_) {}
      try {
        if (r.a_level_combinations != null && typeof r.a_level_combinations === 'string') {
          r.a_level_combinations = JSON.parse(r.a_level_combinations);
        }
      } catch (_) {}
      try {
        if (r.tvet_trades != null && typeof r.tvet_trades === 'string') {
          r.tvet_trades = JSON.parse(r.tvet_trades);
        }
      } catch (_) {}
      r.is_skeleton = Boolean(r.is_skeleton);
      return r;
    });

    res.json({
      success: true, data: schools,
      total: countRows[0].total, page: parseInt(page), limit: parseInt(limit),
    });
  } catch (err) {
    console.error('GET /schools error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

/** Districts that appear on at least one non-deleted school (for Super Admin filters). */
router.get('/schools/districts', async (_req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT DISTINCT district FROM schools
       WHERE deleted_at IS NULL AND district IS NOT NULL AND TRIM(district) <> ''
       ORDER BY district ASC`
    );
    res.json({ success: true, data: rows.map(r => r.district) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * Minimal school shell (no manager) — listed on public registration by location.
 * JSON body: schoolName, province, district, sector, ownership, levels[], aLevelCombinations[]?, tvetTrades[]?
 */
router.post('/schools/skeleton', async (req, res) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    await ensureSchoolsExtraColumns(conn);

    const {
      schoolName,
      province, district, sector, cell, village,
      ownership,
      levels: levelsRaw,
      aLevelCombinations: combosRaw,
      tvetTrades: tvetTradesRaw,
    } = req.body || {};

    if (!schoolName || !String(schoolName).trim()) {
      await conn.rollback();
      return res.status(400).json({ success: false, message: 'schoolName is required' });
    }
    if (!province || !district || !sector) {
      await conn.rollback();
      return res.status(400).json({ success: false, message: 'province, district, and sector are required' });
    }
    if (!VALID_OWNERSHIP.includes(ownership)) {
      await conn.rollback();
      return res.status(400).json({
        success: false,
        message: `ownership must be: ${VALID_OWNERSHIP.join(' | ')}`,
      });
    }

    let levels = [];
    try {
      levels = typeof levelsRaw === 'string' ? JSON.parse(levelsRaw) : (levelsRaw || []);
    } catch (_) {
      levels = [];
    }
    if (!Array.isArray(levels) || !levels.length) {
      await conn.rollback();
      return res.status(400).json({ success: false, message: 'At least one school level is required' });
    }
    const invalid = levels.filter(l => !VALID_LEVELS.includes(l));
    if (invalid.length) {
      await conn.rollback();
      return res.status(400).json({
        success: false,
        message: `Invalid levels: ${invalid.join(', ')}. Allowed: ${VALID_LEVELS.join(', ')}`,
      });
    }

    let combos = [];
    try {
      combos = typeof combosRaw === 'string' ? JSON.parse(combosRaw) : (combosRaw || []);
    } catch (_) {
      combos = [];
    }
    if (!Array.isArray(combos)) combos = [];
    combos = [...new Set(combos.map(c => String(c).trim().toUpperCase()).filter(Boolean))];
    if (levels.includes('a_level') && !combos.length) {
      await conn.rollback();
      return res.status(400).json({
        success: false,
        message: 'Add at least one A-Level combination when A-Level is selected',
      });
    }
    if (!levels.includes('a_level')) combos = [];

    let tvetTrades = [];
    try {
      const raw =
        typeof tvetTradesRaw === 'string' ? JSON.parse(tvetTradesRaw) : (tvetTradesRaw || []);
      tvetTrades = Array.isArray(raw)
        ? [...new Set(raw.map(x => String(x).trim()).filter(Boolean))]
        : [];
    } catch (_) {
      tvetTrades = [];
    }
    if (levels.includes('tvet') && !tvetTrades.length) {
      await conn.rollback();
      return res.status(400).json({
        success: false,
        message: 'Add at least one TVET trade when TVET is selected',
      });
    }
    if (!levels.includes('tvet')) tvetTrades = [];

    const finalSchoolCode = await getNextNumericSchoolCode(conn);
    const districtCode = getDistrictCode(district) || null;
    const cellVal = cell && String(cell).trim() ? String(cell).trim() : String(sector).trim();
    const villageVal = village && String(village).trim() ? String(village).trim() : String(sector).trim();
    const fullAddress = `${sector}, ${district}, ${province}`;
    const yearEstablished = new Date().getFullYear();
    const category = 'Day';
    const PLACEHOLDER_PHONE = '000000000';
    const PLACEHOLDER_EMAIL = `pending+${finalSchoolCode}@school.babyeyi.local`;
    const PLACEHOLDER_HEAD = 'Pending registration';

    const combosJson = combos.length ? JSON.stringify(combos) : null;
    const tvetJson = tvetTrades.length ? JSON.stringify(tvetTrades) : null;

    const [schoolResult] = await conn.query(
      `INSERT INTO schools (
        school_name, school_code, education_levels, school_category, ownership_type, year_established,
        province, district, district_code, sector, cell, village, full_address, map_url,
        phone, email, postal_address, website,
        head_teacher_name, head_teacher_phone, head_teacher_email, deputy_head_name,
        logo_url, head_signature_url, school_stamp_url,
        a_level_combinations, tvet_trades, is_skeleton,
        status, created_at, updated_at
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,'pending',NOW(),NOW())`,
      [
        String(schoolName).trim(),
        finalSchoolCode,
        JSON.stringify(levels),
        category,
        ownership,
        yearEstablished,
        province,
        district,
        districtCode,
        sector,
        cellVal,
        villageVal,
        fullAddress,
        null,
        PLACEHOLDER_PHONE,
        PLACEHOLDER_EMAIL,
        '',
        null,
        PLACEHOLDER_HEAD,
        PLACEHOLDER_PHONE,
        PLACEHOLDER_EMAIL,
        null,
        null,
        null,
        null,
        combosJson,
        tvetJson,
        1,
      ]
    );

    await conn.commit();
    return res.status(201).json({
      success: true,
      message:
        'School shell created. It appears on the public school registration page for this location.',
      data: {
        id: schoolResult.insertId,
        school_code: finalSchoolCode,
        district_code: districtCode,
        education_levels: levels,
        a_level_combinations: combos,
        tvet_trades: tvetTrades,
        is_skeleton: true,
      },
    });
  } catch (err) {
    await conn.rollback();
    console.error('POST /schools/skeleton error:', err);
    return res.status(500).json({ success: false, message: err.message });
  } finally {
    conn.release();
  }
});

// ════════════════════════════════════════════════════════════════
// CREATE SCHOOL
// Column mapping for `users` table:
//   password_hash | first_name | last_name | role_id | force_password_change | user_uid
// ════════════════════════════════════════════════════════════════

router.post(
  '/schools',
  schoolMediaUpload.fields([
    { name: 'logo',          maxCount: 1 },
    { name: 'headSignature', maxCount: 1 },
    { name: 'stamp',         maxCount: 1 },
  ]),
  async (req, res) => {
    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();

      const {
        schoolName, schoolCode, levels: levelsRaw, category, ownership, yearEstablished,
        province, district, sector, cell, village, fullAddress, mapUrl,
        phone, email, postal, website,
        headName, headPhone, headEmail, deputyName,
        managerEmail, username, password,
      } = req.body;

      await ensureSchoolsExtraColumns(conn);

      // ── Required fields (schoolCode optional → auto 001, 002, …) ──
      const required = {
        schoolName, category, ownership,
        province, district, sector,
        phone, email,
        headName,
        managerEmail, username, password,
      };
      const missing = Object.entries(required)
        .filter(([, v]) => !v || !String(v).trim())
        .map(([k]) => k);
      if (missing.length) {
        await conn.rollback();
        return res.status(400).json({ success: false, message: `Missing required fields: ${missing.join(', ')}` });
      }

      // ── Validate levels ───────────────────────────────────
      let levels = [];
      try { levels = typeof levelsRaw === 'string' ? JSON.parse(levelsRaw) : (levelsRaw || []); } catch (_) {}
      if (!levels.length) {
        await conn.rollback();
        return res.status(400).json({ success: false, message: 'At least one education level is required' });
      }
      const invalidLevels = levels.filter(l => !VALID_LEVELS.includes(l));
      if (invalidLevels.length) {
        await conn.rollback();
        return res.status(400).json({ success: false, message: `Invalid education levels: ${invalidLevels.join(', ')}` });
      }
      if (!VALID_CATEGORIES.includes(category)) {
        await conn.rollback();
        return res.status(400).json({ success: false, message: `Invalid category. Must be: ${VALID_CATEGORIES.join(' | ')}` });
      }
      if (!VALID_OWNERSHIP.includes(ownership)) {
        await conn.rollback();
        return res.status(400).json({ success: false, message: `Invalid ownership. Must be: ${VALID_OWNERSHIP.join(' | ')}` });
      }

      // ── Email & password validation ───────────────────────
      const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRe.test(email)) {
        await conn.rollback();
        return res.status(400).json({ success: false, message: 'Invalid school email' });
      }
      if (headEmail && !emailRe.test(headEmail)) {
        await conn.rollback();
        return res.status(400).json({ success: false, message: 'Invalid head teacher email' });
      }
      if (!emailRe.test(managerEmail)) {
        await conn.rollback();
        return res.status(400).json({ success: false, message: 'Invalid manager email' });
      }
      if (password.length < 8) {
        await conn.rollback();
        return res.status(400).json({ success: false, message: 'Password must be at least 8 characters' });
      }
      if (!/^[a-z0-9_]+$/.test(username)) {
        await conn.rollback();
        return res.status(400).json({ success: false, message: 'Username may only contain lowercase letters, numbers, and underscores' });
      }

      let finalSchoolCode = schoolCode != null ? String(schoolCode).trim() : '';
      if (!finalSchoolCode || finalSchoolCode.toUpperCase() === 'AUTO') {
        finalSchoolCode = await getNextNumericSchoolCode(conn);
      } else {
        finalSchoolCode = finalSchoolCode.toUpperCase();
      }

      const districtCode = getDistrictCode(district) || null;

      // ── Uniqueness checks ─────────────────────────────────
      const [codeCheck] = await conn.query(
        'SELECT id FROM schools WHERE school_code = ? AND deleted_at IS NULL',
        [finalSchoolCode]
      );
      if (codeCheck.length) {
        await conn.rollback();
        return res.status(409).json({ success: false, message: `School code "${schoolCode}" is already in use` });
      }

      const [userCheck] = await conn.query(
        'SELECT id FROM users WHERE username = ?', [username.trim()]
      );
      if (userCheck.length) {
        await conn.rollback();
        return res.status(409).json({ success: false, message: `Username "${username}" is already taken` });
      }

      const [emailCheck] = await conn.query(
        'SELECT id FROM users WHERE email = ?', [managerEmail.trim().toLowerCase()]
      );
      if (emailCheck.length) {
        await conn.rollback();
        return res.status(409).json({ success: false, message: `Email "${managerEmail}" is already registered` });
      }

      // ── Resolve role_id (try SCHOOL_ADMIN then SCHOOL_MANAGER) ──
      let roleId = await getRoleId(conn, SCHOOL_MANAGER_ROLE_CODE);
      if (!roleId) roleId = await getRoleId(conn, 'SCHOOL_MANAGER');
      if (!roleId) {
        await conn.rollback();
        return res.status(500).json({
          success: false,
          message: `Role "${SCHOOL_MANAGER_ROLE_CODE}" not found in roles table. ` +
                   `Run: INSERT INTO roles (role_code, role_name) VALUES ('SCHOOL_ADMIN','School Admin');`,
        });
      }

      // ── File paths ────────────────────────────────────────
      // Store clean URLs (relative to /uploads) so the frontend can fetch them reliably.
      const logoUrl = req.files?.logo?.[0]?.filename
        ? `/uploads/school-logos/${req.files.logo[0].filename}`
        : null;
      const signatureUrl = req.files?.headSignature?.[0]?.filename
        ? `/uploads/school-signatures/${req.files.headSignature[0].filename}`
        : null;
      const stampUrl = req.files?.stamp?.[0]?.filename
        ? `/uploads/school-stamps/${req.files.stamp[0].filename}`
        : null;

      // ── Insert school ─────────────────────────────────────
      const [schoolResult] = await conn.query(`
        INSERT INTO schools (
          school_name, school_code, education_levels, school_category, ownership_type, year_established,
          province, district, district_code, sector, cell, village, full_address, map_url,
          phone, email, postal_address, website,
          head_teacher_name, head_teacher_phone, head_teacher_email, deputy_head_name,
          logo_url, head_signature_url, school_stamp_url,
          status, created_at, updated_at
        ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,'pending',NOW(),NOW())
      `, [
        schoolName.trim(),
        finalSchoolCode,
        JSON.stringify(levels),
        category,
        ownership,
        yearEstablished || null,
        province, district, districtCode, sector,
        cell    || sector,
        village || sector,
        fullAddress ? fullAddress.trim() : `${sector}, ${district}, ${province}`,
        mapUrl || null,
        phone.trim(),
        email.trim().toLowerCase(),
        postal ? postal.trim() : null,
        website || null,
        headName.trim(),
        headPhone  ? headPhone.trim()              : null,
        headEmail  ? headEmail.trim().toLowerCase() : null,
        deputyName ? deputyName.trim()             : null,
        logoUrl, signatureUrl, stampUrl,
      ]);
      const schoolId = schoolResult.insertId;

      // ── Insert manager user ───────────────────────────────
      // Columns: user_uid, username, email, password_hash,
      //          first_name, last_name, role_id, school_id,
      //          province, district, sector,
      //          is_active, is_verified, force_password_change
      const passwordHash = await bcrypt.hash(password, 12);
      const userUID      = generateUserUID('SM');

      // Split headName into first / last name
      const nameParts = headName.trim().split(/\s+/);
      const firstName = nameParts[0];
      const lastName  = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '-';

      const [userResult] = await conn.query(`
        INSERT INTO users (
          user_uid, username, email, password_hash,
          first_name, last_name,
          role_id, school_id,
          province, district, sector,
          is_active, is_verified, force_password_change,
          created_at, updated_at
        ) VALUES (?,?,?,?,?,?,?,?,?,?,?,0,1,1,NOW(),NOW())
      `, [
        userUID,
        username.trim(),
        managerEmail.trim().toLowerCase(),
        passwordHash,
        firstName,
        lastName,
        roleId,
        schoolId,
        province,
        district,
        sector,
      ]);
      const managerId = userResult.insertId;

      // ── Link manager back to school ───────────────────────
      // Only if the column exists — ignore error silently if not
      await conn.query(
        'UPDATE schools SET manager_user_id = ? WHERE id = ?',
        [managerId, schoolId]
      ).catch(() => {});

      await conn.commit();

      // ── Send welcome email (fire-and-forget) ─────────────
      sendWelcomeEmail({
        to:         managerEmail.trim().toLowerCase(),
        schoolName: schoolName.trim(),
        schoolCode: finalSchoolCode,
        username:   username.trim(),
        password,           // plain text — still in scope before GC
        district,
        province,
      }).catch(e => console.error('sendWelcomeEmail unhandled:', e.message));

      return res.status(201).json({
        success: true,
        message: `School "${schoolName}" registered successfully. Login credentials sent to ${managerEmail}.`,
        data: {
          school_id:     schoolId,
          school_name:   schoolName.trim(),
          school_code:   finalSchoolCode,
          district_code: districtCode,
          manager_id:    managerId,
          manager_uid:   userUID,
          manager_email: managerEmail.trim().toLowerCase(),
          username:      username.trim(),
          district,
          province,
          logo_url:      logoUrl,
        status:        'pending',
          created_at:    new Date().toISOString(),
          login_hint:    'Manager can log in with email + password. School code is optional.',
        },
      });

    } catch (err) {
      await conn.rollback();
      console.error('POST /schools error:', err);
      return res.status(500).json({ success: false, message: err.message });
    } finally {
      conn.release();
    }
  }
);

// ════════════════════════════════════════════════════════════════
// BULK / DELETE ALL (must be before GET /schools/:id)
// ════════════════════════════════════════════════════════════════

router.post('/schools/bulk-delete', async (req, res) => {
  const conn = await db.getConnection();
  try {
    const { ids, deleteAll, confirmPhrase } = req.body || {};
    await conn.beginTransaction();

    if (deleteAll === true) {
      if (confirmPhrase !== 'DELETE_ALL_SCHOOLS') {
        await conn.rollback();
        return res.status(400).json({
          success: false,
          message: 'Type the confirmation phrase exactly: DELETE_ALL_SCHOOLS',
        });
      }
      const [rows] = await conn.query('SELECT id FROM schools WHERE deleted_at IS NULL');
      const schoolIds = rows.map(r => r.id);
      if (!schoolIds.length) {
        await conn.commit();
        return res.json({ success: true, message: 'No schools to delete', deleted: 0 });
      }
      await conn.query(
        "UPDATE schools SET deleted_at = NOW(), status = 'deleted', updated_at = NOW() WHERE deleted_at IS NULL"
      );
      await conn.query(
        'UPDATE users SET is_active = 0, updated_at = NOW() WHERE school_id IN (?)',
        [schoolIds]
      );
      await conn.commit();
      return res.json({
        success: true,
        message: `Deleted ${schoolIds.length} school(s)`,
        deleted: schoolIds.length,
      });
    }

    if (!Array.isArray(ids) || !ids.length) {
      await conn.rollback();
      return res.status(400).json({
        success: false,
        message: 'Send { "ids": [1,2,3] } or { "deleteAll": true, "confirmPhrase": "DELETE_ALL_SCHOOLS" }',
      });
    }
    const cleanIds = [...new Set(ids.map(id => parseInt(id, 10)).filter(n => !Number.isNaN(n) && n > 0))];
    if (!cleanIds.length) {
      await conn.rollback();
      return res.status(400).json({ success: false, message: 'No valid school ids' });
    }
    const ph = cleanIds.map(() => '?').join(',');
    const [found] = await conn.query(
      `SELECT id FROM schools WHERE deleted_at IS NULL AND id IN (${ph})`,
      cleanIds
    );
    if (!found.length) {
      await conn.rollback();
      return res.status(404).json({ success: false, message: 'No matching schools found' });
    }
    const toDelete = found.map(r => r.id);
    const ph2 = toDelete.map(() => '?').join(',');
    await conn.query(
      `UPDATE schools SET deleted_at = NOW(), status = 'deleted', updated_at = NOW() WHERE id IN (${ph2})`,
      toDelete
    );
    await conn.query(
      `UPDATE users SET is_active = 0, updated_at = NOW() WHERE school_id IN (${ph2})`,
      toDelete
    );
    await conn.commit();
    res.json({
      success: true,
      message: `Deleted ${toDelete.length} school(s)`,
      deleted: toDelete.length,
    });
  } catch (err) {
    await conn.rollback();
    console.error('POST /schools/bulk-delete error:', err);
    res.status(500).json({ success: false, message: err.message });
  } finally {
    conn.release();
  }
});

// ════════════════════════════════════════════════════════════════
// GET SINGLE SCHOOL
// ════════════════════════════════════════════════════════════════

router.get('/schools/:id', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT s.*,
             u.username  AS manager_username,
             u.email     AS manager_email,
             u.is_active AS manager_active,
             u.user_uid  AS manager_uid
      FROM schools s
      LEFT JOIN users u ON u.id = s.manager_user_id
      WHERE s.id = ? AND s.deleted_at IS NULL
    `, [req.params.id]);

    if (!rows.length) return res.status(404).json({ success: false, message: 'School not found' });
    const school = rows[0];
    try {
      if (typeof school.education_levels === 'string')
        school.education_levels = JSON.parse(school.education_levels);
    } catch (_) {}
    res.json({ success: true, data: school });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// ════════════════════════════════════════════════════════════════
// SCHOOL SUMMARY
// ════════════════════════════════════════════════════════════════

router.get('/schools/:id/summary', async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT id, school_name, school_code, district, province, sector, phone, email,
              logo_url, status, head_teacher_name, school_category, ownership_type, education_levels
       FROM schools WHERE id = ? AND deleted_at IS NULL`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'School not found' });
    const s = rows[0];
    try {
      if (typeof s.education_levels === 'string') s.education_levels = JSON.parse(s.education_levels);
    } catch (_) {}
    res.json({ success: true, data: s });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// ════════════════════════════════════════════════════════════════
// UPDATE SCHOOL
// ════════════════════════════════════════════════════════════════

router.put(
  '/schools/:id',
  schoolMediaUpload.fields([
    { name: 'logo',          maxCount: 1 },
    { name: 'headSignature', maxCount: 1 },
    { name: 'stamp',         maxCount: 1 },
  ]),
  async (req, res) => {
    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();

      const [existing] = await conn.query(
        'SELECT id, school_code FROM schools WHERE id = ? AND deleted_at IS NULL', [req.params.id]
      );
      if (!existing.length) {
        await conn.rollback();
        return res.status(404).json({ success: false, message: 'School not found' });
      }

      if (req.body.schoolCode && req.body.schoolCode.toUpperCase() !== existing[0].school_code) {
        const [dupe] = await conn.query(
          'SELECT id FROM schools WHERE school_code = ? AND id != ? AND deleted_at IS NULL',
          [req.body.schoolCode.toUpperCase(), req.params.id]
        );
        if (dupe.length) {
          await conn.rollback();
          return res.status(409).json({ success: false, message: 'School code already in use' });
        }
      }

      const fieldMap = {
        schoolName: 'school_name', schoolCode: 'school_code', category: 'school_category',
        ownership: 'ownership_type', yearEstablished: 'year_established',
        province: 'province', district: 'district', sector: 'sector',
        cell: 'cell', village: 'village', fullAddress: 'full_address', mapUrl: 'map_url',
        phone: 'phone', email: 'email', postal: 'postal_address', website: 'website',
        headName: 'head_teacher_name', headPhone: 'head_teacher_phone',
        headEmail: 'head_teacher_email', deputyName: 'deputy_head_name',
      };

      const setClauses = ['updated_at = NOW()'];
      const params     = [];

      Object.entries(fieldMap).forEach(([bodyKey, colName]) => {
        if (req.body[bodyKey] !== undefined) {
          const val = colName === 'school_code'
            ? req.body[bodyKey].toUpperCase().trim()
            : String(req.body[bodyKey]).trim();
          setClauses.push(`${colName} = ?`);
          params.push(val);
        }
      });

      if (req.body.levels !== undefined) {
        let levels = [];
        try { levels = typeof req.body.levels === 'string' ? JSON.parse(req.body.levels) : req.body.levels; } catch (_) {}
        setClauses.push('education_levels = ?');
        params.push(JSON.stringify(levels));
      }

      if (req.files?.logo?.[0]) {
        setClauses.push('logo_url = ?');
        params.push(`/uploads/school-logos/${req.files.logo[0].filename}`);
      }
      if (req.files?.headSignature?.[0]) {
        setClauses.push('head_signature_url = ?');
        params.push(`/uploads/school-signatures/${req.files.headSignature[0].filename}`);
      }
      if (req.files?.stamp?.[0]) {
        setClauses.push('school_stamp_url = ?');
        params.push(`/uploads/school-stamps/${req.files.stamp[0].filename}`);
      }

      if (req.body.district !== undefined) {
        const dc = getDistrictCode(String(req.body.district).trim()) || null;
        setClauses.push('district_code = ?');
        params.push(dc);
      }

      params.push(req.params.id);
      await conn.query(`UPDATE schools SET ${setClauses.join(', ')} WHERE id = ?`, params);
      await conn.commit();

      const [updated] = await db.query('SELECT * FROM schools WHERE id = ?', [req.params.id]);
      try {
        if (typeof updated[0].education_levels === 'string')
          updated[0].education_levels = JSON.parse(updated[0].education_levels);
      } catch (_) {}

      res.json({ success: true, message: 'School updated successfully', data: updated[0] });
    } catch (err) {
      await conn.rollback();
      res.status(500).json({ success: false, message: err.message });
    } finally {
      conn.release();
    }
  }
);

// ════════════════════════════════════════════════════════════════
// STATUS TOGGLE
// ════════════════════════════════════════════════════════════════

router.put('/schools/:id/status', async (req, res) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const { status } = req.body;
    const valid = ['active', 'inactive', 'suspended', 'pending'];
    if (!valid.includes(status))
      return res.status(400).json({ success: false, message: `status must be: ${valid.join(' | ')}` });

    const [rows] = await conn.query(
      'SELECT id FROM schools WHERE id = ? AND deleted_at IS NULL', [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'School not found' });

    await conn.query('UPDATE schools SET status = ?, updated_at = NOW() WHERE id = ?', [status, req.params.id]);

    // Keep manager login consistent with school approval:
    // - active   => users.is_active = 1
    // - pending/inactive/suspended => users.is_active = 0
    const userActive = status === 'active' ? 1 : 0;
    await conn.query(
      'UPDATE users SET is_active = ?, updated_at = NOW() WHERE school_id = ? AND deleted_at IS NULL',
      [userActive, req.params.id]
    );

    await conn.commit();
    res.json({ success: true, message: `School status set to "${status}"` });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ success: false, message: err.message });
  } finally {
    conn.release();
  }
});

// ════════════════════════════════════════════════════════════════
// INDIVIDUAL MEDIA UPLOADS
// ════════════════════════════════════════════════════════════════

router.post('/schools/:id/logo', schoolMediaUpload.single('logo'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });
    const url = `/uploads/school-logos/${req.file.filename}`;
    await db.query('UPDATE schools SET logo_url = ?, updated_at = NOW() WHERE id = ?', [url, req.params.id]);
    res.json({ success: true, message: 'Logo uploaded', logo_url: url });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.post('/schools/:id/signature', schoolMediaUpload.single('headSignature'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });
    const url = `/uploads/school-signatures/${req.file.filename}`;
    await db.query('UPDATE schools SET head_signature_url = ?, updated_at = NOW() WHERE id = ?', [url, req.params.id]);
    res.json({ success: true, message: 'Signature uploaded', signature_url: url });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.post('/schools/:id/stamp', schoolMediaUpload.single('stamp'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });
    const url = `/uploads/school-stamps/${req.file.filename}`;
    await db.query('UPDATE schools SET school_stamp_url = ?, updated_at = NOW() WHERE id = ?', [url, req.params.id]);
    res.json({ success: true, message: 'Stamp uploaded', stamp_url: url });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// ════════════════════════════════════════════════════════════════
// SOFT DELETE
// ════════════════════════════════════════════════════════════════

router.delete('/schools/:id', async (req, res) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const [rows] = await conn.query(
      'SELECT id, school_name FROM schools WHERE id = ? AND deleted_at IS NULL', [req.params.id]
    );
    if (!rows.length) {
      await conn.rollback();
      return res.status(404).json({ success: false, message: 'School not found' });
    }

    await conn.query(
      "UPDATE schools SET deleted_at = NOW(), status = 'deleted', updated_at = NOW() WHERE id = ?",
      [req.params.id]
    );
    await conn.query(
      'UPDATE users SET is_active = 0, updated_at = NOW() WHERE school_id = ?',
      [req.params.id]
    );

    await conn.commit();
    res.json({ success: true, message: `School "${rows[0].school_name}" deleted` });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ success: false, message: err.message });
  } finally {
    conn.release();
  }
});

// ── Multer error handler ───────────────────────────────────────
router.use((err, _req, res, _next) => {
  if (err.code === 'LIMIT_FILE_SIZE')       return res.status(400).json({ success: false, message: 'File too large (max 5 MB)' });
  if (err.code === 'LIMIT_UNEXPECTED_FILE') return res.status(400).json({ success: false, message: `Unexpected field: ${err.field}` });
  if (err.code === 'LIMIT_FIELD_COUNT')     return res.status(400).json({ success: false, message: 'Too many form fields' });
  res.status(400).json({ success: false, message: err.message });
});

// One-time style backfill: set district_code from district name where missing (alphabetical 01–30).
setImmediate(async () => {
  try {
    const conn = await db.getConnection();
    try {
      await ensureSchoolsExtraColumns(conn);
    } finally {
      conn.release();
    }
    for (const name of DISTRICTS_ALPHA) {
      const code = getDistrictCode(name);
      await db.query(
        'UPDATE schools SET district_code = ? WHERE district = ? AND deleted_at IS NULL AND (district_code IS NULL OR district_code = "")',
        [code, name]
      );
    }
  } catch (e) {
    console.warn('[school-add] district_code backfill:', e.message);
  }
});

module.exports = router;