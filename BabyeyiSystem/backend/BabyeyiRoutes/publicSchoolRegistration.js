// ================================================================
// publicSchoolRegistration.js — Public School Registration Routes
//
// PURPOSE:
//   Public users can register a school, which is created as:
//     - schools.status = 'pending'
//     - manager user is_active = 0
//     - manager user force_password_change = 1
//   Super Admin must activate the school before manager can log in.
//
// ROUTES:
//   POST /api/public/schools/register
// ================================================================
const express = require('express');
const router = express.Router();

const multer = require('multer');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');

// ── DB ────────────────────────────────────────────────────────
const { promisePool: db } = require('../config/database');
const { getDistrictCode, formatSchoolCode } = require('../utils/rwandaDistrictCodes');

async function ensureSchoolsExtraColumns(conn) {
  await conn.query('ALTER TABLE schools ADD COLUMN district_code VARCHAR(2) NULL').catch(() => {});
  await conn.query('ALTER TABLE schools ADD COLUMN a_level_combinations JSON NULL').catch(() => {});
  await conn.query('ALTER TABLE schools ADD COLUMN tvet_trades JSON NULL').catch(() => {});
  await conn.query('ALTER TABLE schools ADD COLUMN is_skeleton TINYINT(1) NOT NULL DEFAULT 0').catch(() => {});
  await conn.query('ALTER TABLE schools MODIFY postal_address VARCHAR(255) NULL').catch(() => {});
  await conn.query('ALTER TABLE schools MODIFY year_established INT NULL').catch(() => {});
  await conn.query('ALTER TABLE schools MODIFY head_teacher_email VARCHAR(255) NULL').catch(() => {});
}

/** Short, easy-to-copy password for school managers (8 chars, unambiguous). */
function generateManagerPassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789abcdefghjkmnpqrstuvwxyz';
  let s = '';
  for (let i = 0; i < 8; i += 1) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

async function generateUniqueManagerUsername(conn, managerEmail, schoolId) {
  const local = String(managerEmail)
    .trim()
    .toLowerCase()
    .split('@')[0]
    .replace(/[^a-z0-9_]/g, '_')
    .replace(/_+/g, '_')
    .slice(0, 24) || 'manager';
  let base = `${local}_sm${schoolId}`;
  let usernameFinal = base;
  let n = 0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const [rows] = await conn.query('SELECT id FROM users WHERE username = ? LIMIT 1', [usernameFinal]);
    if (!rows.length) return usernameFinal;
    n += 1;
    usernameFinal = `${base}_${n}`;
    if (n > 50) {
      usernameFinal = `sm_${schoolId}_${Date.now().toString(36)}`;
      const [r2] = await conn.query('SELECT id FROM users WHERE username = ? LIMIT 1', [usernameFinal]);
      if (!r2.length) return usernameFinal;
    }
  }
}

async function getNextDistrictSchoolCode(conn, districtCode) {
  const dd = String(districtCode || '').padStart(2, '0').slice(-2);
  if (!/^[0-9]{2}$/.test(dd)) throw new Error('Invalid district code');
  const [rows] = await conn.query(
    `SELECT school_code, district_code
     FROM schools
     WHERE deleted_at IS NULL
       AND (district_code = ? OR school_code LIKE ?)`,
    [dd, `${dd}%`]
  );
  let max = 0;
  for (const r of rows) {
    const exact = String(r.school_code || '').match(new RegExp(`^${dd}([0-9]{3})$`));
    let n = exact ? parseInt(exact[1], 10) : NaN;
    if (Number.isNaN(n)) {
      const slash = String(r.school_code || '').match(new RegExp(`^${dd}\\/([0-9]{3})$`));
      if (slash) n = parseInt(slash[1], 10);
    }
    if (!Number.isNaN(n) && n > max) max = n;
  }
  const next = max + 1;
  if (next > 999) throw new Error(`Maximum school codes (999) reached for district ${dd}`);
  return formatSchoolCode(dd, next);
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
  // Allow generous number of text fields because the form is large
  limits:  { fileSize: 5 * 1024 * 1024, files: 3, fields: 120 },
  fileFilter(_req, file, cb) {
    const ok = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    ok.includes(file.mimetype) ? cb(null, true) : cb(new Error(`Invalid file type: ${file.mimetype}`));
  },
});

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

// ── Helpers ───────────────────────────────────────────────────
function generateUserUID(prefix = 'SM') {
  const ts  = Date.now().toString().slice(-6);
  const rnd = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `${prefix}-${ts}${rnd}`;
}

async function getRoleId(conn, roleCode) {
  const [rows] = await conn.query(
    'SELECT id FROM roles WHERE role_code = ? LIMIT 1', [roleCode]
  );
  return rows[0]?.id ?? null;
}

async function sendWelcomeEmailPending({ to, schoolName, schoolCode, password, district, province }) {
  const from     = process.env.SMTP_FROM || `"Smart Education" <${process.env.SMTP_USER}>`;
  const loginUrl = `${process.env.FRONTEND_URL || 'http://localhost:5174'}/login`;

  const subject = `School Registration Submitted — Pending Approval | ${schoolName}`;
  const text = `
Hello,

Your school registration has been submitted and is currently PENDING approval by the Super Admin.

School: ${schoolName} (${schoolCode})
Location: ${district}, ${province}

MANAGER LOGIN (active after Super Admin approval)
Use your email address and this password:

Email:    ${to}
Password: ${password}

Open: ${loginUrl}
Sign in with your email and the password above (no username needed).

Important: You will be asked to change your password on first login. Keep this email safe.
`.trim();

  try {
    await transporter.sendMail({ from, to, subject, text });
  } catch (err) {
    console.error(`⚠️  Failed to send pending email to ${to}:`, err.message);
  }
}

const VALID_LEVELS     = ['nursery', 'primary', 'o_level', 'a_level', 'tvet'];
const VALID_CATEGORIES = ['Day', 'Boarding', 'Day & Boarding'];
const VALID_OWNERSHIP  = ['Government', 'Government-Aided', 'Private'];

const SCHOOL_MANAGER_ROLE_CODE = 'SCHOOL_ADMIN';

// GET /api/public/schools/next-school-code — no auth (next district school code DDSSS)
router.get('/next-school-code', async (req, res) => {
  const conn = await db.getConnection();
  try {
    await ensureSchoolsExtraColumns(conn);
    const districtCode = req.query.district ? getDistrictCode(String(req.query.district)) : null;
    if (!districtCode) {
      return res.status(400).json({ success: false, message: 'district is required and must be valid' });
    }
    const next = await getNextDistrictSchoolCode(conn, districtCode);
    res.json({ success: true, data: { schoolCode: next, districtCode } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  } finally {
    conn.release();
  }
});

// ============================================================
// POST /api/public/schools/register
// ============================================================
router.post(
  '/register',
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
        managerEmail,
        aLevelCombinations: combosBody,
        tvetTrades: tvetTradesBody,
      } = req.body;

      await ensureSchoolsExtraColumns(conn);

      const required = {
        schoolName, category, ownership,
        province, district, sector,
        phone, email,
        headName,
        headPhone,
        managerEmail,
      };
      const missing = Object.entries(required)
        .filter(([, v]) => !v || !String(v).trim())
        .map(([k]) => k);
      if (missing.length) {
        await conn.rollback();
        return res.status(400).json({ success: false, message: `Missing required fields: ${missing.join(', ')}` });
      }

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

      let combosArr = [];
      if (levels.includes('a_level') && combosBody !== undefined && combosBody !== '') {
        try {
          const parsed = typeof combosBody === 'string' ? JSON.parse(combosBody) : combosBody;
          if (Array.isArray(parsed)) {
            combosArr = [...new Set(parsed.map(x => String(x).trim().toUpperCase()).filter(Boolean))];
          }
        } catch (_) { /* keep empty */ }
      }

      let tvetTradesArr = [];
      if (levels.includes('tvet') && tvetTradesBody !== undefined && tvetTradesBody !== '') {
        try {
          const parsed = typeof tvetTradesBody === 'string' ? JSON.parse(tvetTradesBody) : tvetTradesBody;
          if (Array.isArray(parsed)) {
            tvetTradesArr = [...new Set(parsed.map(x => String(x).trim()).filter(Boolean))];
          }
        } catch (_) { /* keep empty */ }
      }
      if (!VALID_CATEGORIES.includes(category)) {
        await conn.rollback();
        return res.status(400).json({ success: false, message: `Invalid category. Must be: ${VALID_CATEGORIES.join(' | ')}` });
      }
      if (!VALID_OWNERSHIP.includes(ownership)) {
        await conn.rollback();
        return res.status(400).json({ success: false, message: `Invalid ownership. Must be: ${VALID_OWNERSHIP.join(' | ')}` });
      }

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
      if (!req.files?.headSignature?.[0]) {
        await conn.rollback();
        return res.status(400).json({ success: false, message: 'Head teacher signature image is required' });
      }
      if (!req.files?.stamp?.[0]) {
        await conn.rollback();
        return res.status(400).json({ success: false, message: 'School stamp / seal image is required' });
      }

      const districtCode = getDistrictCode(district) || null;
      if (!districtCode) {
        await conn.rollback();
        return res.status(400).json({ success: false, message: 'Invalid district; cannot generate school code.' });
      }
      let finalSchoolCode = schoolCode != null ? String(schoolCode).trim().toUpperCase() : '';
      if (!finalSchoolCode || finalSchoolCode === 'AUTO') {
        finalSchoolCode = await getNextDistrictSchoolCode(conn, districtCode);
      } else if (!new RegExp(`^${districtCode}[0-9]{3}$`).test(finalSchoolCode)) {
        await conn.rollback();
        return res.status(400).json({
          success: false,
          message: `School code must match district format ${districtCode}001`,
        });
      }

      const [codeCheck] = await conn.query(
        'SELECT id FROM schools WHERE school_code = ? AND deleted_at IS NULL',
        [finalSchoolCode]
      );
      if (codeCheck.length) {
        await conn.rollback();
        return res.status(409).json({ success: false, message: `School code "${schoolCode}" is already in use` });
      }
      const [emailCheck] = await conn.query('SELECT id FROM users WHERE email = ?', [String(managerEmail).trim().toLowerCase()]);
      if (emailCheck.length) {
        await conn.rollback();
        return res.status(409).json({ success: false, message: `Email "${managerEmail}" is already registered` });
      }

      let roleId = await getRoleId(conn, SCHOOL_MANAGER_ROLE_CODE);
      if (!roleId) roleId = await getRoleId(conn, 'SCHOOL_MANAGER');
      if (!roleId) {
        await conn.rollback();
        return res.status(500).json({ success: false, message: `Role "${SCHOOL_MANAGER_ROLE_CODE}" not found in roles table.` });
      }

      // Store clean URLs (relative to /uploads) so the frontend can fetch them reliably.
      const logoUrl = req.files?.logo?.[0]?.filename
        ? `/uploads/school-logos/${req.files.logo[0].filename}`
        : null;
      const signatureUrl = `/uploads/school-signatures/${req.files.headSignature[0].filename}`;
      const stampUrl = `/uploads/school-stamps/${req.files.stamp[0].filename}`;

      const [schoolResult] = await conn.query(`
        INSERT INTO schools (
          school_name, school_code, education_levels, school_category, ownership_type, year_established,
          province, district, district_code, sector, cell, village, full_address, map_url,
          phone, email, postal_address, website,
          head_teacher_name, head_teacher_phone, head_teacher_email, deputy_head_name,
          a_level_combinations, tvet_trades,
          logo_url, head_signature_url, school_stamp_url,
          status, created_at, updated_at
        ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,'pending',NOW(),NOW())
      `, [
        String(schoolName).trim(),
        finalSchoolCode,
        JSON.stringify(levels),
        category,
        ownership,
        yearEstablished || null,
        province, district, districtCode, sector,
        cell    || sector,
        village || sector,
        fullAddress ? String(fullAddress).trim() : `${sector}, ${district}, ${province}`,
        mapUrl || null,
        String(phone).trim(),
        String(email).trim().toLowerCase(),
        postal ? String(postal).trim() : null,
        website || null,
        String(headName).trim(),
        String(headPhone).trim(),
        headEmail  ? String(headEmail).trim().toLowerCase() : null,
        deputyName ? String(deputyName).trim() : null,
        combosArr.length ? JSON.stringify(combosArr) : null,
        tvetTradesArr.length ? JSON.stringify(tvetTradesArr) : null,
        logoUrl, signatureUrl, stampUrl,
      ]);
      const schoolId = schoolResult.insertId;

      const plainPassword = generateManagerPassword();
      const usernameFinal = await generateUniqueManagerUsername(
        conn,
        String(managerEmail).trim(),
        schoolId
      );
      const passwordHash = await bcrypt.hash(plainPassword, 12);
      const userUID      = generateUserUID('SM');

      const nameParts = String(headName).trim().split(/\s+/);
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
        usernameFinal,
        String(managerEmail).trim().toLowerCase(),
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

      await conn.query('UPDATE schools SET manager_user_id = ? WHERE id = ?', [managerId, schoolId]).catch(() => {});

      await conn.commit();

      sendWelcomeEmailPending({
        to:         String(managerEmail).trim().toLowerCase(),
        schoolName: String(schoolName).trim(),
        schoolCode: finalSchoolCode,
        password: plainPassword,
        district,
        province,
      }).catch(() => {});

      return res.status(201).json({
        success: true,
        message: 'Registration submitted. Your school is pending Super Admin approval.',
        data: {
          school_id: schoolId,
          school_code: finalSchoolCode,
          district_code: districtCode,
          status: 'pending',
          manager_id: managerId,
          manager_email: String(managerEmail).trim().toLowerCase(),
          manager_password: plainPassword,
        },
      });
    } catch (err) {
      await conn.rollback();
      console.error('POST /public/schools/register error:', err);
      return res.status(500).json({ success: false, message: err.message });
    } finally {
      conn.release();
    }
  }
);

// ============================================================
// POST /api/public/schools/claim
//
// CLAIM flow:
// - Uses an existing pre-registered school by `school_code`
// - Creates a manager user with:
//   - is_active = 0
//   - force_password_change = 1
// - Updates school_category from the claim form (Day | Boarding | Day & Boarding); keeps ownership_type / education_levels unless overridden
// - Updates contact + leadership fields on the existing school
// ============================================================
router.post(
  '/claim',
  schoolMediaUpload.fields([
    { name: 'logo',          maxCount: 1 },
    { name: 'headSignature', maxCount: 1 },
    { name: 'stamp',         maxCount: 1 },
  ]),
  async (req, res) => {
    const conn = await db.getConnection();
    try {
      await ensureSchoolsExtraColumns(conn);
      await conn.beginTransaction();

      const {
        schoolCode,
        category: categoryBody,
        province, district, sector, cell, village,
        phone, email, postal, website,
        headName, headPhone, headEmail, deputyName,
        mapUrl,
        managerEmail,
        levels: levelsBody,
        aLevelCombinations: combosBody,
        tvetTrades: tvetTradesBody,
      } = req.body;

      const required = {
        schoolCode,
        category: categoryBody,
        province, district, sector,
        phone, email,
        headName,
        headPhone,
        managerEmail,
      };

      const missing = Object.entries(required)
        .filter(([, v]) => v === undefined || v === null || !String(v).trim())
        .map(([k]) => k);

      if (missing.length) {
        await conn.rollback();
        return res.status(400).json({ success: false, message: `Missing required fields: ${missing.join(', ')}` });
      }

      const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRe.test(String(email).trim())) {
        await conn.rollback();
        return res.status(400).json({ success: false, message: 'Invalid school email' });
      }
      if (!emailRe.test(String(managerEmail).trim())) {
        await conn.rollback();
        return res.status(400).json({ success: false, message: 'Invalid manager email' });
      }
      if (headEmail && !emailRe.test(String(headEmail).trim())) {
        await conn.rollback();
        return res.status(400).json({ success: false, message: 'Invalid head teacher email' });
      }

      const categoryTrim = categoryBody != null ? String(categoryBody).trim() : '';
      if (!categoryTrim) {
        await conn.rollback();
        return res.status(400).json({ success: false, message: 'School category is required (Day, Boarding, or Day & Boarding)' });
      }
      if (!VALID_CATEGORIES.includes(categoryTrim)) {
        await conn.rollback();
        return res.status(400).json({
          success: false,
          message: `Invalid school category. Must be: ${VALID_CATEGORIES.join(' | ')}`,
        });
      }

      if (!req.files?.headSignature?.[0]) {
        await conn.rollback();
        return res.status(400).json({ success: false, message: 'Head teacher signature image is required' });
      }
      if (!req.files?.stamp?.[0]) {
        await conn.rollback();
        return res.status(400).json({ success: false, message: 'School stamp / seal image is required' });
      }

      const schoolCodeNorm = String(schoolCode).toUpperCase().trim();
      const [schoolRows] = await conn.query(
        'SELECT * FROM schools WHERE school_code = ? AND deleted_at IS NULL LIMIT 1',
        [schoolCodeNorm]
      );
      const school = schoolRows?.[0];
      if (!school) {
        await conn.rollback();
        return res.status(404).json({ success: false, message: `School code "${schoolCodeNorm}" not found` });
      }

      if (school.manager_user_id) {
        await conn.rollback();
        return res.status(409).json({ success: false, message: 'This school already has a manager. Please contact Super Admin.' });
      }

      const [userCheckByEmail] = await conn.query(
        'SELECT id FROM users WHERE email = ?',
        [String(managerEmail).trim().toLowerCase()]
      );
      if (userCheckByEmail.length) {
        await conn.rollback();
        return res.status(409).json({ success: false, message: `Email "${managerEmail}" is already registered` });
      }

      let roleId = await getRoleId(conn, SCHOOL_MANAGER_ROLE_CODE);
      if (!roleId) roleId = await getRoleId(conn, 'SCHOOL_MANAGER');
      if (!roleId) {
        await conn.rollback();
        return res.status(500).json({ success: false, message: `Role "${SCHOOL_MANAGER_ROLE_CODE}" not found in roles table.` });
      }

      const logoUrl = req.files?.logo?.[0]?.filename
        ? `/uploads/school-logos/${req.files.logo[0].filename}`
        : school.logo_url;
      const signatureUrl = `/uploads/school-signatures/${req.files.headSignature[0].filename}`;
      const stampUrl = `/uploads/school-stamps/${req.files.stamp[0].filename}`;

      const cellVal = cell && String(cell).trim() ? String(cell).trim() : String(sector).trim();
      const villageVal = village && String(village).trim() ? String(village).trim() : String(sector).trim();

      const districtCodeClaim = getDistrictCode(String(district).trim()) || null;

      const headPhoneToSet = String(headPhone).trim();
      const headEmailToSet = headEmail && String(headEmail).trim() ? String(headEmail).trim().toLowerCase() : school.head_teacher_email;
      const deputyToSet = deputyName && String(deputyName).trim() ? String(deputyName).trim() : school.deputy_head_name;
      const postalToSet =
        postal && String(postal).trim() ? String(postal).trim() : null;
      const websiteToSet = website ? String(website).trim() : school.website;
      const mapUrlToSet = mapUrl ? String(mapUrl).trim() : school.map_url;

      let eduLevels = school.education_levels;
      try {
        eduLevels = typeof eduLevels === 'string' ? JSON.parse(eduLevels) : eduLevels;
      } catch (_) {
        eduLevels = [];
      }
      if (!Array.isArray(eduLevels)) eduLevels = [];

      if (levelsBody !== undefined && levelsBody !== '') {
        try {
          const parsed = typeof levelsBody === 'string' ? JSON.parse(levelsBody) : levelsBody;
          if (Array.isArray(parsed) && parsed.length) eduLevels = parsed;
        } catch (_) { /* keep existing */ }
      }

      let combosArr = school.a_level_combinations;
      try {
        if (combosArr != null && typeof combosArr === 'string') combosArr = JSON.parse(combosArr);
      } catch (_) {
        combosArr = [];
      }
      if (!Array.isArray(combosArr)) combosArr = [];

      if (combosBody !== undefined && combosBody !== '') {
        try {
          const p = typeof combosBody === 'string' ? JSON.parse(combosBody) : combosBody;
          if (Array.isArray(p)) {
            combosArr = [...new Set(p.map(x => String(x).trim().toUpperCase()).filter(Boolean))];
          }
        } catch (_) { /* keep existing */ }
      }

      let tvetTradesArr = school.tvet_trades;
      try {
        if (tvetTradesArr != null && typeof tvetTradesArr === 'string') tvetTradesArr = JSON.parse(tvetTradesArr);
      } catch (_) {
        tvetTradesArr = [];
      }
      if (!Array.isArray(tvetTradesArr)) tvetTradesArr = [];
      if (tvetTradesBody !== undefined && tvetTradesBody !== '') {
        try {
          const p = typeof tvetTradesBody === 'string' ? JSON.parse(tvetTradesBody) : tvetTradesBody;
          if (Array.isArray(p)) {
            tvetTradesArr = [...new Set(p.map(x => String(x).trim()).filter(Boolean))];
          }
        } catch (_) { /* keep existing */ }
      }

      const eduJson = JSON.stringify(eduLevels);
      const combosJson = combosArr.length ? JSON.stringify(combosArr) : null;
      const tvetTradesJson = tvetTradesArr.length ? JSON.stringify(tvetTradesArr) : null;

      const plainPassword = generateManagerPassword();
      const usernameFinal = await generateUniqueManagerUsername(
        conn,
        String(managerEmail).trim(),
        school.id
      );

      // Update school first (so manager_user_id matches the manager account)
      await conn.query(
        `
        UPDATE schools SET
          manager_user_id = NULL,
          status = 'pending',
          school_category = ?,
          province = ?, district = ?, district_code = ?, sector = ?,
          cell = ?, village = ?,
          full_address = ?,
          map_url = ?,
          phone = ?, email = ?,
          postal_address = ?, website = ?,
          head_teacher_name = ?,
          head_teacher_phone = ?,
          head_teacher_email = ?,
          deputy_head_name = ?,
          logo_url = ?,
          head_signature_url = ?,
          school_stamp_url = ?,
          education_levels = ?,
          a_level_combinations = ?,
          tvet_trades = ?,
          is_skeleton = 0
        WHERE id = ? AND deleted_at IS NULL
        `,
        [
          categoryTrim,
          province, district, districtCodeClaim, sector,
          cellVal, villageVal,
          `${sector}, ${district}, ${province}`,
          mapUrlToSet,
          String(phone).trim(),
          String(email).trim().toLowerCase(),
          postalToSet,
          websiteToSet,
          String(headName).trim(),
          headPhoneToSet,
          headEmailToSet,
          deputyToSet,
          logoUrl,
          signatureUrl,
          stampUrl,
          eduJson,
          combosJson,
          tvetTradesJson,
          school.id,
        ]
      );

      const passwordHash = await bcrypt.hash(plainPassword, 12);
      const userUID = generateUserUID('SM');

      const nameParts = String(headName).trim().split(/\s+/);
      const firstName = nameParts[0];
      const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '-';

      const [userResult] = await conn.query(
        `
        INSERT INTO users (
          user_uid, username, email, password_hash,
          first_name, last_name,
          role_id, school_id,
          province, district, sector,
          is_active, is_verified, force_password_change,
          created_at, updated_at
        ) VALUES (?,?,?,?,?,?,?,?,?,?,?,0,1,1,NOW(),NOW())
        `,
        [
          userUID,
          usernameFinal,
          String(managerEmail).trim().toLowerCase(),
          passwordHash,
          firstName,
          lastName,
          roleId,
          school.id,
          province,
          district,
          sector,
        ]
      );

      const managerId = userResult.insertId;
      await conn.query('UPDATE schools SET manager_user_id = ? WHERE id = ?', [managerId, school.id]);

      await conn.commit();

      sendWelcomeEmailPending({
        to: String(managerEmail).trim().toLowerCase(),
        schoolName: String(school.school_name || school.id).trim(),
        schoolCode: schoolCodeNorm,
        password: plainPassword,
        district: String(district).trim(),
        province: String(province).trim(),
      }).catch(() => {});

      return res.status(201).json({
        success: true,
        message: 'Registration submitted. Your school is pending Super Admin approval.',
        data: {
          school_id: school.id,
          district_code: districtCodeClaim,
          status: 'pending',
          manager_id: managerId,
          manager_email: String(managerEmail).trim().toLowerCase(),
          manager_password: plainPassword,
        },
      });
    } catch (err) {
      await conn.rollback();
      console.error('POST /api/public/schools/claim error:', err);
      return res.status(500).json({ success: false, message: err.message });
    } finally {
      conn.release();
    }
  }
);

// ============================================================
// GET /api/public/schools  — list pre-registered schools by location
// Query: province, district, sector (required)
// ============================================================
router.get('/', async (req, res) => {
  const conn = await db.getConnection();
  try {
    await ensureSchoolsExtraColumns(conn);
    const { province, district, sector } = req.query;
    if (!province || !district || !sector) {
      return res.status(400).json({
        success: false,
        message: 'province, district and sector are required',
      });
    }

    const [rows] = await conn.query(
      `SELECT
         id,
         school_name,
         school_code,
         province,
         district,
         district_code,
         sector,
         cell,
         village,
         school_category,
         ownership_type,
         education_levels,
         a_level_combinations,
         tvet_trades,
         is_skeleton,
         year_established
       FROM schools
       WHERE deleted_at IS NULL
         AND province = ?
         AND district = ?
         AND sector   = ?
       ORDER BY school_name ASC`,
      [province, district, sector]
    );

    const data = rows.map(r => {
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

    return res.json({ success: true, data });
  } catch (err) {
    console.error('GET /api/public/schools error:', err);
    return res.status(500).json({ success: false, message: 'Failed to load schools' });
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

module.exports = router;

