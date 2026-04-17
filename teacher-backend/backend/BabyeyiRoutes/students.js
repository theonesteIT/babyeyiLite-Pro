// ================================================================
// students.js — Student Management (School Manager)  v1.2
//
// ROUTES (mounted under /api):
//   GET    /api/students           → list students (paginated)
//   POST   /api/students           → create a single student
//   PUT    /api/students/:id       → update student
//   DELETE /api/students/:id       → delete student
//   POST   /api/students/bulk-delete → delete many by id (same school)
//   POST   /api/students/delete-all  → delete every student in school (typed confirm)
//   GET    /api/students/export.xlsx → export Excel
//   GET    /api/students/export.pdf  → export PDF
//   POST   /api/students/import    → import many students from Excel
//
// Parent portal (public, separate router): /api/parent-portal/*
//   Uses father_phone / mother_phone on this table — see parentPortal.js
//
// FIX v1.2 (on top of v1.1):
//   - Handles TWO canonical Urubuto array-row layouts:
//       Layout A (with ordinal): col0=#  col1=ID  col2=FName ...
//       Layout B (no ordinal):   col0=ID col1=FName col2=LName ...
//     Previously the code always assumed Layout A, so Layout B files
//     (like sample3.xlsx where col0 IS the student ID) had every row
//     rejected because the "ordinal" check used the 12-digit ID value
//     which is > 100000. → "No valid student rows found to import."
//   - detectCanonicalLayout() auto-detects which layout is present
//     by checking whether col0 of the first data row is a valid
//     student ID (Layout B) or a small integer (Layout A).
// ================================================================

const express      = require('express');
const multer       = require('multer');
const xlsx         = require('xlsx');
const PDFDocument  = require('pdfkit');
const path         = require('path');
const fs           = require('fs');
const crypto       = require('crypto');

const router       = express.Router();
const { promisePool } = require('../config/database');
const { requireRole } = require('../middleware/deoAuth');
const {
  getDistrictCode,
  formatStudentCode,
  parseSchoolCodeNumeric,
} = require('../utils/rwandaDistrictCodes');

// ── Allowed roles ────────────────────────────────────────────────
// DOS can also register/import students (same StudentsPage UX as School Manager).
const SCHOOL_ROLES = ['SCHOOL_ADMIN', 'SCHOOL_MANAGER', 'ACCOUNTANT', 'DOS'];
/** Read-only list: managers, HOD, and teachers (marks / attendance UIs). Mutations stay SCHOOL_ROLES */
const STUDENT_LIST_ROLES = [...SCHOOL_ROLES, 'HOD', 'TEACHER'];

// ── Student profile photo uploads (DOS identity wizard) ──────────
const STUDENT_PHOTO_DIR = path.join(__dirname, '..', 'uploads', 'student-profile-photos');
if (!fs.existsSync(STUDENT_PHOTO_DIR)) {
  fs.mkdirSync(STUDENT_PHOTO_DIR, { recursive: true });
}

const studentPhotoUpload = multer({
  storage: multer.diskStorage({
    destination(_req, _file, cb) { cb(null, STUDENT_PHOTO_DIR); },
    filename(_req, file, cb) {
      const extRaw = path.extname(file.originalname || '').toLowerCase();
      const ext = ['.jpg', '.jpeg', '.png', '.webp'].includes(extRaw) ? extRaw : '.jpg';
      cb(null, `student-${Date.now()}-${crypto.randomBytes(8).toString('hex')}${ext}`);
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter(_req, file, cb) {
    const ok = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(file.mimetype);
    if (ok) return cb(null, true);
    cb(new Error('Only image files are allowed (jpg/png/webp).'));
  },
});

function toStudentPhotoUrl(filename) {
  if (!filename) return null;
  return `/uploads/student-profile-photos/${filename}`;
}

// ── Temp upload dir ──────────────────────────────────────────────
const TEMP_DIR = path.join(__dirname, '..', 'uploads', 'temp');
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
  console.log('📁  Created:', TEMP_DIR);
}

// ── Multer for Excel import ──────────────────────────────────────
const excelStorage = multer.diskStorage({
  destination(_req, _file, cb) { cb(null, TEMP_DIR); },
  filename(_req, file, cb) {
    const ext  = path.extname(file.originalname) || '.xlsx';
    const base = path.basename(file.originalname, ext).replace(/\s+/g, '-');
    cb(null, `${base}-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
  },
});

const excelUpload = multer({
  storage: excelStorage,
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter(_req, file, cb) {
    const okTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
    ];
    if (okTypes.includes(file.mimetype)) return cb(null, true);
    cb(new Error('Only Excel files are allowed (.xlsx, .xls)'));
  },
});

// ════════════════════════════════════════════════════════════════
// HELPERS
// ════════════════════════════════════════════════════════════════

function resolveSchoolId(req) {
  return (
    req.session?.school_id ||
    req.session?.user?.school_id ||
    req.user?.school_id ||
    req.user?.school?.id ||
    null
  );
}

/**
 * normalizePhone — Rwanda mobile numbers.
 *
 * Handles all common Excel export variants:
 *   788823273   (9 digits — Excel stripped leading 0)
 *   0788823273  (10 digits — correct local format)
 *   +250788823273 or 250788823273 (international)
 *
 * Valid prefixes after leading 0: 072–079 (mobile), also 025x (MTN data).
 */
function normalizePhone(raw) {
  if (!raw) return null;
  let v = String(raw).replace(/[\s\-().]/g, '');

  // Remove any non-digit/+ characters except leading +
  v = v.replace(/[^\d+]/g, '');

  // Strip international prefix → local 10-digit form
  if (v.startsWith('+250')) v = '0' + v.slice(4);
  else if (v.startsWith('250') && v.length === 12) v = '0' + v.slice(3);

  // 9 digits → Excel stripped the leading zero (common with number cells)
  if (/^[27]\d{8}$/.test(v)) v = '0' + v;

  // Final check: must be 10 digits starting with 07x or 025x
  if (/^07[2-9]\d{7}$/.test(v)) return v;
  if (/^078\d{7}$/.test(v)) return v;   // 078 series
  if (/^079\d{7}$/.test(v)) return v;   // 079 series
  if (/^025\d{7}$/.test(v)) return v;   // 025 data numbers

  return null;
}

function trimStr(v) { return String(v ?? '').trim(); }

function normalizeHeaderKey(key) {
  return String(key || '')
    .toLowerCase()
    .replace(/\u00a0/g, ' ')
    .replace(/[^a-z0-9]/g, '');
}

function normalizeGender(raw) {
  const v = trimStr(raw).toLowerCase();
  if (!v) return null;
  if (['male', 'm', 'boy', 'garcon', 'garçon', 'umuhungu'].includes(v)) return 'Male';
  if (['female', 'f', 'girl', 'fille', 'umukobwa'].includes(v)) return 'Female';
  return null;
}

function isLikelyYear(v) {
  const n = Number(v);
  const y = new Date().getFullYear();
  return Number.isFinite(n) && n >= 1990 && n <= y;
}

function excelSerialToYear(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 30000 || n > 70000) return null;
  const ms  = Math.round((n - 25569) * 86400 * 1000);
  const d   = new Date(ms);
  const y   = d.getUTCFullYear();
  return Number.isFinite(y) ? y : null;
}

function normalizeBirthYearValue(raw) {
  const s = trimStr(raw);
  if (!s) return null;
  // Date strings like 3/23/2002  or  1/6/2005
  const m1 = s.match(/(\d{4})/);
  if (m1) {
    const y = Number(m1[1]);
    if (isLikelyYear(y)) return y;
  }
  const direct = Number(raw);
  if (isLikelyYear(direct)) return direct;
  const serialYear = excelSerialToYear(raw);
  if (serialYear && isLikelyYear(serialYear)) return serialYear;
  return null;
}

function normalizeStudentId(raw) {
  const s = trimStr(raw);
  if (!s) return '';
  // Excel may store large integers as floats: 202526266468.00
  if (/^\d+(\.0+)?$/.test(s)) return s.replace(/\.0+$/, '');
  return s;
}

/**
 * isValidStudentId — must be 9–15 digits.
 * Urubuto IDs are typically 12 digits (e.g. 202526266468).
 * We accept 9–15 to allow slightly different formats.
 */
function isValidStudentId(uid) {
  return /^\d{9,15}$/.test(uid);
}

const PROVINCE_MAP = {
  north: 'North', nortn: 'North', northn: 'North', norht: 'North', northh: 'North',
  'northern province': 'North', northern: 'North',
  south: 'South', 'southern province': 'South', southern: 'South',
  east: 'East', 'eastern province': 'East', eastern: 'East',
  west: 'West', 'western province': 'West', western: 'West',
  nothern: 'North', // common typo in data
  kigali: 'Kigali', 'kigali city': 'Kigali', 'kigali city ': 'Kigali',
};

function normalizeProvinceLabel(v) {
  const s = trimStr(v);
  return PROVINCE_MAP[s.toLowerCase()] || s;
}

function normalizeNationalityLabel(v) {
  const s = trimStr(v).toLowerCase();
  if (!s) return '';
  if (['rwanda', 'rwandan', 'rwadan', 'rwandan '].includes(s)) return 'Rwandan';
  return trimStr(v);
}

function cleanLocationToken(v) {
  const s = trimStr(v);
  if (!s) return '';
  if (/^\d{6,}$/.test(s)) return ''; // reject phone-like numeric values
  return s;
}

function isBlankArrayRow(row) {
  if (!Array.isArray(row)) return true;
  return row.every((v) => trimStr(v) === '');
}

function normalizeHeaderKeyStr(key) {
  return String(key || '').toLowerCase().replace(/\u00a0/g, ' ').replace(/[^a-z0-9]/g, '');
}

// ─── Urubuto object-row shape detection ─────────────────────────
//
// When xlsx parses a Urubuto export with sheet_to_json (no header:1),
// the first row (header) becomes the key map:
//   key "[SCHOOL :...]" → "#"   (ordinal column)
//   key ""              → "ID"
//   key "__1"           → "F. Name"
//   ...
//   key "__16"          → "Village"
//
// We detect this by checking that row[0] has these characteristics.

function looksLikeUrubutoObjectHeaderRow(r) {
  if (!r || typeof r !== 'object') return false;
  // The ordinal column key is the long school string OR a plain "#"
  // The ID column is always keyed ""
  const id    = normalizeHeaderKeyStr(r['']);
  const f     = normalizeHeaderKeyStr(r.__1);
  const l     = normalizeHeaderKeyStr(r.__2);
  const g     = normalizeHeaderKeyStr(r.__3);
  const by    = normalizeHeaderKeyStr(r.__4);
  const prov  = normalizeHeaderKeyStr(r.__12);
  const dist  = normalizeHeaderKeyStr(r.__13);
  const sect  = normalizeHeaderKeyStr(r.__14);
  const cell  = normalizeHeaderKeyStr(r.__15);
  const vil   = normalizeHeaderKeyStr(r.__16);

  return (
    id === 'id' &&
    (f === 'fname' || f === 'firstname' || f === 'fname' || f === 'fname' || f.startsWith('f')) &&
    (l === 'lname' || l === 'lastname' || l.startsWith('l')) &&
    g === 'gender' &&
    (by === 'birthyear' || by.includes('birth')) &&
    prov === 'province' &&
    dist === 'district' &&
    sect === 'sector' &&
    cell === 'cell' &&
    vil === 'village'
  );
}

/**
 * isUrubutoStudentObjectRow — determines if an object row is a real
 * student data row (not a header, footer, or blank metadata row).
 *
 * Rules:
 *  1. The ordinal column value must be a positive integer.
 *  2. The ID column value must be a 9–15 digit number.
 *
 * This is the KEY fix: previously, header rows (ordinal="#", id="ID")
 * and footer/metadata rows were being processed as students.
 */
function isUrubutoStudentObjectRow(r, ordinalKey) {
  // ordinal must be a positive integer
  const ordinalRaw = r[ordinalKey];
  const ordinal    = Number(ordinalRaw);
  if (!Number.isInteger(ordinal) || ordinal < 1 || ordinal > 999999) return false;

  // ID must be valid numeric student ID
  const uid = normalizeStudentId(r['']);
  return isValidStudentId(uid);
}

// ─── Array-row (header:1) helpers ───────────────────────────────

function detectHeaderRow(rawRows) {
  const importantTokens = [
    'firstname', 'lastname', 'studentid', 'registrationnumber', 'name',
    'gender', 'sex', 'birthyear', 'yearofbirth',
    'province', 'district', 'sector', 'cell', 'village',
    'amazina', 'igitsina', 'intara', 'akarere', 'umurenge', 'akagari', 'umudugudu',
  ];

  let bestIndex = 0;
  let bestScore = -1;
  const scanLimit = Math.min(rawRows.length, 25);

  for (let i = 0; i < scanLimit; i += 1) {
    const row = rawRows[i];
    if (!Array.isArray(row)) continue;
    const normalizedCells = row.map((c) => normalizeHeaderKey(c)).filter(Boolean);
    if (!normalizedCells.length) continue;

    let score = 0;
    for (const token of importantTokens) {
      if (normalizedCells.some((c) => c.includes(token))) score += 1;
    }
    if (normalizedCells.length >= 4 && normalizedCells.length <= 30) score += 2;

    if (score > bestScore) {
      bestScore = score;
      bestIndex = i;
    }
  }

  return { index: bestIndex, score: bestScore };
}

function findUrubutoHeaderIndex(rawRows) {
  const limit = Math.min(rawRows.length, 40);
  for (let i = 0; i < limit; i += 1) {
    const row = Array.isArray(rawRows[i]) ? rawRows[i] : [];
    const t   = row.map(normalizeHeaderKey);
    const hasId    = t.includes('id');
    const hasF     = t.some((x) => x === 'fname' || x === 'firstname' || x === 'fname');
    const hasL     = t.some((x) => x === 'lname' || x === 'lastname');
    const hasGender = t.includes('gender');
    const hasBirth  = t.some((x) => x.includes('birthyear') || x.includes('birth'));
    const hasLoc    = t.includes('province') && t.includes('district') && t.includes('sector') && t.includes('cell') && t.includes('village');
    if (hasId && hasF && hasL && hasGender && hasBirth && hasLoc) return i;
  }
  return -1;
}

function readFromRowByAliases(rowValues, headerCells, aliases = []) {
  if (!Array.isArray(rowValues) || !Array.isArray(headerCells)) return '';
  const aliasSet = new Set(aliases.map((a) => normalizeHeaderKey(a)));
  for (let i = 0; i < headerCells.length; i += 1) {
    const hk = normalizeHeaderKey(headerCells[i]);
    if (!hk || !aliasSet.has(hk)) continue;
    const val = rowValues[i];
    if (val !== undefined && val !== null && trimStr(val) !== '') return val;
  }
  return '';
}

function readFromFixedIndexes(rowValues, indexes = []) {
  if (!Array.isArray(rowValues)) return '';
  for (const idx of indexes) {
    const val = rowValues[idx];
    if (val !== undefined && val !== null && trimStr(val) !== '') return val;
  }
  return '';
}

function inferLocationByProvinceMarker(rowValues) {
  const PROVINCE_MARKERS = new Set([
    'north', 'south', 'east', 'west', 'kigali',
    'northern', 'southern', 'eastern', 'western',
    'northern province', 'southern province', 'eastern province', 'western province', 'kigali city',
  ]);
  const cells = (rowValues || []).map(trimStr);
  for (let i = 0; i < cells.length; i += 1) {
    const c = cells[i].toLowerCase();
    if (!PROVINCE_MARKERS.has(c)) continue;
    return {
      province: normalizeProvinceLabel(cells[i]),
      district: cleanLocationToken(cells[i + 1]),
      sector:   cleanLocationToken(cells[i + 2]),
      cell:     cleanLocationToken(cells[i + 3]),
      village:  cleanLocationToken(cells[i + 4]),
    };
  }
  return { province: '', district: '', sector: '', cell: '', village: '' };
}

function inferLocationFromRowTail(rowValues) {
  const cells    = (rowValues || []).map(trimStr);
  const natIdx   = cells.findIndex((c) => /^rwandan$/i.test(c));
  if (natIdx >= 0 && cells.length >= natIdx + 6) {
    return {
      nationality: cells[natIdx] || '',
      province:    cells[natIdx + 1] || '',
      district:    cells[natIdx + 2] || '',
      sector:      cells[natIdx + 3] || '',
      cell:        cells[natIdx + 4] || '',
      village:     cells[natIdx + 5] || '',
    };
  }
  const nonEmpty = cells.filter(Boolean);
  if (nonEmpty.length >= 5) {
    const last5 = nonEmpty.slice(-5);
    return { nationality: '', province: last5[0], district: last5[1], sector: last5[2], cell: last5[3], village: last5[4] };
  }
  return { nationality: '', province: '', district: '', sector: '', cell: '', village: '' };
}

function extractHeuristicFromRow(rowValues) {
  const cells    = (rowValues || []).map(trimStr);
  const nonEmpty = cells.filter(Boolean);
  if (!nonEmpty.length) return { uid: '', first_name: '', last_name: '', genderRaw: '', birth_year: '', nationality: '', province: '', district: '', sector: '', cell: '', village: '' };

  let uid = '';
  for (const c of nonEmpty) {
    if (isValidStudentId(c)) { uid = c; break; }
  }

  let genderIdx = -1;
  for (let i = 0; i < nonEmpty.length; i += 1) {
    if (normalizeGender(nonEmpty[i])) { genderIdx = i; break; }
  }

  let birthYear = '';
  if (genderIdx >= 0 && nonEmpty[genderIdx + 1]) {
    const y = Number(nonEmpty[genderIdx + 1]);
    if (isLikelyYear(y)) birthYear = String(y);
    else {
      const sy = excelSerialToYear(nonEmpty[genderIdx + 1]);
      if (sy) birthYear = String(sy);
    }
  }
  if (!birthYear) {
    for (const c of nonEmpty) {
      if (isLikelyYear(c)) { birthYear = String(Number(c)); break; }
    }
  }

  let lastName = '', firstName = '';
  if (genderIdx >= 2) {
    const ml = nonEmpty[genderIdx - 2];
    const mf = nonEmpty[genderIdx - 1];
    if (!/^\d+$/.test(ml)) lastName  = ml;
    if (!/^\d+$/.test(mf)) firstName = mf;
  }

  const byProv = inferLocationByProvinceMarker(nonEmpty);
  const byTail = inferLocationFromRowTail(nonEmpty);
  const nationality = byTail.nationality || (nonEmpty.includes('Rwandan') ? 'Rwandan' : '');

  return {
    uid, first_name: firstName, last_name: lastName,
    genderRaw:  genderIdx >= 0 ? nonEmpty[genderIdx] : '',
    birth_year: birthYear,
    nationality,
    province: byProv.province || cleanLocationToken(byTail.province),
    district: byProv.district || cleanLocationToken(byTail.district),
    sector:   byProv.sector   || cleanLocationToken(byTail.sector),
    cell:     byProv.cell     || cleanLocationToken(byTail.cell),
    village:  byProv.village  || cleanLocationToken(byTail.village),
  };
}

function parsePagination(req) {
  const page   = Math.max(Number(req.query.page)  || 1,  1);
  const limit  = Math.min(Math.max(Number(req.query.limit) || 20, 1), 3000);
  const offset = (page - 1) * limit;
  return { page, limit, offset };
}

// ── Official 9-digit student code: DD (district) + SSS (school) + NNNN (seq) ──
async function generateStudentUID(schoolId) {
  await ensureStudentsTable();
  await ensureStudentsExtraColumns();
  const [[school]] = await promisePool.query(
    'SELECT district, school_code FROM schools WHERE id = ? AND deleted_at IS NULL LIMIT 1',
    [schoolId]
  );
  if (!school) throw new Error('School not found');
  const dCode = getDistrictCode(school.district) || '01';
  const sNum = parseSchoolCodeNumeric(school.school_code);
  const [[row]] = await promisePool.query(
    `SELECT COALESCE(MAX(CAST(RIGHT(student_code, 4) AS UNSIGNED)), 0) AS m
     FROM students WHERE school_id = ? AND student_code REGEXP '^[0-9]{9}$'`,
    [schoolId]
  );
  const seq = (Number(row?.m) || 0) + 1;
  if (seq > 9999) throw new Error('Student sequence limit (9999) reached for this school');
  return formatStudentCode(dCode, sNum, seq);
}

async function createImportUidAllocator(schoolId) {
  await ensureStudentsTable();
  await ensureStudentsExtraColumns();
  const [[school]] = await promisePool.query(
    'SELECT district, school_code FROM schools WHERE id = ? LIMIT 1',
    [schoolId]
  );
  const dCode = getDistrictCode(school?.district) || '01';
  const sNum = parseSchoolCodeNumeric(school?.school_code);
  const [[row]] = await promisePool.query(
    `SELECT COALESCE(MAX(CAST(RIGHT(student_code, 4) AS UNSIGNED)), 0) AS m
     FROM students WHERE school_id = ? AND student_code REGEXP '^[0-9]{9}$'`,
    [schoolId]
  );
  let seq = Number(row?.m || 0);
  return () => {
    seq += 1;
    if (seq > 9999) throw new Error('Student sequence limit exceeded');
    return formatStudentCode(dCode, sNum, seq);
  };
}

// ── Table bootstrap ──────────────────────────────────────────────
let studentsTableReady   = false;
let studentsTablePromise = null;

async function ensureStudentsExtraColumns() {
  await promisePool.query('ALTER TABLE students ADD COLUMN class_name VARCHAR(120) NULL').catch(() => {});
  await promisePool.query('ALTER TABLE students ADD COLUMN academic_year VARCHAR(32) NULL').catch(() => {});
  await promisePool.query('ALTER TABLE students ADD COLUMN student_code VARCHAR(15) NULL').catch(() => {});
  await promisePool.query('ALTER TABLE students ADD COLUMN sdm_code VARCHAR(64) NULL').catch(() => {});
  await promisePool.query('ALTER TABLE students ADD COLUMN residency_status ENUM(\'DAY\', \'BOARDING\') DEFAULT \'DAY\'').catch(() => {});
  await promisePool.query('ALTER TABLE students ADD COLUMN class_id INT UNSIGNED NULL').catch(() => {});
  await promisePool.query('ALTER TABLE students ADD KEY idx_students_class_id (class_id)').catch(() => {});
  await promisePool.query('ALTER TABLE students ADD KEY idx_students_school_rfid (school_id, rfid_uid)').catch(() => {});
  await promisePool.query('ALTER TABLE students ADD KEY idx_students_school_fingerprint (school_id, fingerprint_id)').catch(() => {});
}

async function ensureStudentsTable() {
  if (studentsTableReady) return;
  if (studentsTablePromise) return studentsTablePromise;

  studentsTablePromise = (async () => {
    await promisePool.query(`
      CREATE TABLE IF NOT EXISTS students (
        id                INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        student_uid       VARCHAR(50)  NOT NULL,
        school_id         INT UNSIGNED NOT NULL,
        first_name        VARCHAR(100) NOT NULL,
        last_name         VARCHAR(100) NOT NULL,
        gender            ENUM('Male','Female') NULL,
        birth_year        INT          NULL,
        nationality       VARCHAR(100) NOT NULL DEFAULT 'Rwandan',
        province          VARCHAR(100) NOT NULL,
        district          VARCHAR(100) NOT NULL,
        sector            VARCHAR(100) NOT NULL,
        cell              VARCHAR(100) NOT NULL,
        village           VARCHAR(100) NOT NULL,
        father_full_name  VARCHAR(150) NULL,
        father_phone      VARCHAR(30)  NULL,
        father_email      VARCHAR(150) NULL,
        mother_full_name  VARCHAR(150) NULL,
        mother_phone      VARCHAR(30)  NULL,
        mother_email      VARCHAR(150) NULL,
        class_id          INT UNSIGNED NULL,
        class_name        VARCHAR(120) NULL,
        import_missing_fields TEXT NULL,
        source_row_json   LONGTEXT NULL,
        created_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uq_student_uid_school (student_uid, school_id),
        KEY idx_students_school_id (school_id),
        KEY idx_students_student_uid (student_uid)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    studentsTableReady = true;
  })();

  try {
    await studentsTablePromise;
    await promisePool.query('ALTER TABLE students ADD COLUMN import_missing_fields TEXT NULL').catch(() => {});
    await promisePool.query('ALTER TABLE students ADD COLUMN source_row_json LONGTEXT NULL').catch(() => {});
    await promisePool.query("ALTER TABLE students MODIFY COLUMN gender ENUM('Male','Female') NULL").catch(() => {});
    await promisePool.query('ALTER TABLE students MODIFY COLUMN birth_year INT NULL').catch(() => {});
    // Allow partial imports: Excel may omit location; school edits later
    for (const col of ['province', 'district', 'sector', 'cell', 'village', 'nationality']) {
      await promisePool.query(`ALTER TABLE students MODIFY COLUMN ${col} VARCHAR(100) NULL`).catch(() => {});
    }
    await promisePool.query('ALTER TABLE students MODIFY COLUMN father_phone VARCHAR(160) NULL').catch(() => {});
    await promisePool.query('ALTER TABLE students MODIFY COLUMN mother_phone VARCHAR(160) NULL').catch(() => {});
    await promisePool.query('ALTER TABLE students MODIFY COLUMN father_email VARCHAR(255) NULL').catch(() => {});
    await promisePool.query('ALTER TABLE students MODIFY COLUMN mother_email VARCHAR(255) NULL').catch(() => {});
    await ensureStudentsExtraColumns();
  } finally {
    studentsTablePromise = null;
  }
}

// ════════════════════════════════════════════════════════════════
// GET /api/students
// ════════════════════════════════════════════════════════════════
router.get('/students', requireRole(STUDENT_LIST_ROLES), async (req, res) => {
  try {
    await ensureStudentsTable();
    const schoolId = resolveSchoolId(req);
    if (!schoolId) return res.status(400).json({ success: false, message: 'School not found in session.' });

    const q = trimStr(req.query.q || '');
    const { page, limit, offset } = parsePagination(req);
    const paginationEnabled = String(req.query.paginate || 'true').toLowerCase() !== 'false';

    let sql = `
      SELECT s.id, s.student_uid, s.student_code, s.school_id, s.first_name, s.last_name, s.gender, s.birth_year,
             s.nationality, s.province, s.district, s.sector, s.cell, s.village,
             s.class_id, s.class_name, s.academic_year, s.sdm_code,
             s.student_photo, s.rfid_uid, s.fingerprint_id, s.identity_remarks,
             s.residency_status,
             s.father_full_name, s.father_phone, s.father_email,
             s.mother_full_name, s.mother_phone, s.mother_email,
             s.import_missing_fields, s.source_row_json, s.created_at, s.updated_at,
             c.group_name AS class_group_name, c.stream_name AS class_stream_name, c.combination AS class_combination
      FROM students s
      LEFT JOIN school_classes c ON s.class_id = c.id
      WHERE s.school_id = ?
    `;
    let countSql = 'SELECT COUNT(*) AS total FROM students s LEFT JOIN school_classes c ON s.class_id = c.id WHERE s.school_id = ?';
    const params = [schoolId], countParams = [schoolId];

    if (q) {
      const whereSearch = ` AND (s.student_uid LIKE ? OR s.student_code LIKE ? OR s.sdm_code LIKE ? OR s.first_name LIKE ? OR s.last_name LIKE ? OR CONCAT(s.first_name,' ',s.last_name) LIKE ? OR c.group_name LIKE ? OR c.stream_name LIKE ? OR c.combination LIKE ? OR s.class_name LIKE ?)`;
      sql      += whereSearch;
      countSql += whereSearch;
      const like = `%${q}%`;
      params.push(like, like, like, like, like, like, like, like, like, like);
      countParams.push(like, like, like, like, like, like, like, like, like, like);
    }

    const classFilter = trimStr(req.query.class_name || req.query.class || '');
    const yearFilter = trimStr(req.query.academic_year || req.query.year || '');

    if (classFilter) {
      const filterStr = ` AND (s.class_name = ? OR c.group_name = ? OR CONCAT_WS(' ', c.group_name, c.stream_name, c.combination) = ?)`;
      sql += filterStr;
      countSql += filterStr;
      params.push(classFilter, classFilter, classFilter);
      countParams.push(classFilter, classFilter, classFilter);
    }

    if (yearFilter) {
      sql += ' AND s.academic_year = ?';
      countSql += ' AND s.academic_year = ?';
      params.push(yearFilter);
      countParams.push(yearFilter);
    }

    sql += ' ORDER BY s.student_uid ASC, s.created_at DESC';
    if (paginationEnabled) { sql += ' LIMIT ? OFFSET ?'; params.push(limit, offset); }

    const [rows]        = await promisePool.query(sql, params);
    const [[countRow]]  = await promisePool.query(countSql, countParams);
    const total         = Number(countRow?.total || rows.length || 0);

    const withPhotoUrl = (rows || []).map((r) => ({
      ...r,
      student_photo_url: r.student_photo ? toStudentPhotoUrl(r.student_photo) : null,
    }));

    return res.json({
      success: true, data: withPhotoUrl, total, page: paginationEnabled ? page : 1,
      limit: paginationEnabled ? limit : rows.length,
      totalPages: paginationEnabled ? Math.max(Math.ceil(total / limit), 1) : 1,
    });
  } catch (err) {
    console.error('GET /api/students error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch students' });
  }
});

// ════════════════════════════════════════════════════════════════
// PUT /api/students/:id
// ════════════════════════════════════════════════════════════════
router.put('/students/:id', requireRole(SCHOOL_ROLES), async (req, res) => {
  try {
    await ensureStudentsTable();
    const schoolId  = resolveSchoolId(req);
    const studentId = Number(req.params.id);
    if (!schoolId || Number.isNaN(studentId)) return res.status(400).json({ success: false, message: 'Invalid request' });

    const [[existing]] = await promisePool.query(
      'SELECT id, student_uid FROM students WHERE id = ? AND school_id = ? LIMIT 1',
      [studentId, schoolId]
    );
    if (!existing) return res.status(404).json({ success: false, message: 'Student not found' });

    const body       = req.body || {};
    const studentUid = body.student_uid ? trimStr(body.student_uid) : existing.student_uid;

    if (!body.first_name || !body.last_name || !body.province || !body.district || !body.sector || !body.cell || !body.village)
      return res.status(400).json({ success: false, message: 'Missing required fields' });

    const gender = trimStr(body.gender) ? normalizeGender(body.gender) : null;
    if (trimStr(body.gender) && !gender) return res.status(400).json({ success: false, message: 'Invalid gender' });

    const birthYearRaw = body.birth_year;
    const year = (birthYearRaw === undefined || birthYearRaw === null || trimStr(birthYearRaw) === '')
      ? null : normalizeBirthYearValue(birthYearRaw);
    if (birthYearRaw !== undefined && birthYearRaw !== null && trimStr(birthYearRaw) !== '' && !year)
      return res.status(400).json({ success: false, message: 'Invalid birth year' });

    const fatherPhone = body.father_phone ? normalizePhone(body.father_phone) : null;
    const motherPhone = body.mother_phone ? normalizePhone(body.mother_phone) : null;
    if (body.father_phone && !fatherPhone) return res.status(400).json({ success: false, message: 'Invalid father phone' });
    if (body.mother_phone && !motherPhone) return res.status(400).json({ success: false, message: 'Invalid mother phone' });

    const [[dupUid]] = await promisePool.query(
      'SELECT id FROM students WHERE student_uid = ? AND school_id = ? AND id != ? LIMIT 1',
      [studentUid, schoolId, studentId]
    );
    if (dupUid) return res.status(409).json({ success: false, message: `Student ID "${studentUid}" already exists` });

    const [[cur]] = await promisePool.query(
      'SELECT student_code, class_name, academic_year, sdm_code FROM students WHERE id = ? AND school_id = ? LIMIT 1',
      [studentId, schoolId]
    );
    const studentCodeVal = cur?.student_code || (/^\d{9}$/.test(studentUid) ? studentUid : null);

    const cls = 'class_name' in body || 'className' in body
      ? trimStr(body.class_name || body.className) || null
      : cur?.class_name ?? null;
    const cid = 'class_id' in body || 'classId' in body
      ? Number(body.class_id || body.classId) || null
      : cur?.class_id ?? null;
    const ay = 'academic_year' in body || 'academicYear' in body
      ? trimStr(body.academic_year || body.academicYear) || null
      : cur?.academic_year ?? null;
    const sdm = 'sdm_code' in body || 'sdmCode' in body
      ? trimStr(body.sdm_code || body.sdmCode) || null
      : cur?.sdm_code ?? null;

    const rfidUidVal = 'rfid_uid' in body || 'rfidUid' in body ? trimStr(body.rfid_uid || body.rfidUid) || null : undefined;
    const fingerprintIdVal = 'fingerprint_id' in body || 'fingerprintId' in body ? trimStr(body.fingerprint_id || body.fingerprintId) || null : undefined;
    const identityRemarksVal = 'identity_remarks' in body || 'identityRemarks' in body ? trimStr(body.identity_remarks || body.identityRemarks) || null : undefined;

    if (rfidUidVal !== undefined && rfidUidVal) {
      const [[dupRfid]] = await promisePool.query(
        'SELECT id FROM students WHERE school_id = ? AND rfid_uid = ? AND id != ? LIMIT 1',
        [schoolId, rfidUidVal, studentId]
      );
      if (dupRfid) return res.status(409).json({ success: false, message: `RFID UID "${rfidUidVal}" is already assigned to another student` });
    }

    if (fingerprintIdVal !== undefined && fingerprintIdVal) {
      const [[dupFp]] = await promisePool.query(
        'SELECT id FROM students WHERE school_id = ? AND fingerprint_id = ? AND id != ? LIMIT 1',
        [schoolId, fingerprintIdVal, studentId]
      );
      if (dupFp) return res.status(409).json({ success: false, message: `Fingerprint ID "${fingerprintIdVal}" is already assigned to another student` });
    }

    // Build conditional updates for biometric fields so we don't accidentally blank them out if not sent
    let biometricUpdates = '';
    const biometricVals = [];
    if (rfidUidVal !== undefined) { biometricUpdates += ', rfid_uid=?'; biometricVals.push(rfidUidVal); }
    if (fingerprintIdVal !== undefined) { biometricUpdates += ', fingerprint_id=?'; biometricVals.push(fingerprintIdVal); }
    if (identityRemarksVal !== undefined) { biometricUpdates += ', identity_remarks=?'; biometricVals.push(identityRemarksVal); }

    await promisePool.query(
      `UPDATE students SET student_uid=?, student_code=?, first_name=?, last_name=?, gender=?, birth_year=?,
       nationality=?, province=?, district=?, sector=?, cell=?, village=?,
       class_name=?, class_id=?, academic_year=?, sdm_code=?, residency_status=?,
       father_full_name=?, father_phone=?, father_email=?,
       mother_full_name=?, mother_phone=?, mother_email=?${biometricUpdates}, updated_at=NOW()
       WHERE id=? AND school_id=?`,
      [
        studentUid, studentCodeVal, trimStr(body.first_name), trimStr(body.last_name), gender, year,
        body.nationality || 'Rwandan', body.province, body.district, body.sector, body.cell, body.village,
        cls, cid, ay, sdm, body.residency_status || 'DAY',
        body.father_full_name || null, fatherPhone, body.father_email || null,
        body.mother_full_name || null, motherPhone, body.mother_email || null,
        ...biometricVals,
        studentId, schoolId,
      ]
    );
    return res.json({ success: true, message: 'Student updated' });
  } catch (err) {
    console.error('PUT /api/students/:id error:', err);
    return res.status(500).json({ success: false, message: 'Failed to update student' });
  }
});

// ════════════════════════════════════════════════════════════════
// PUT /api/students/:id/identity/photo  (multipart field "photo")
// ════════════════════════════════════════════════════════════════
router.put(
  '/students/:id/identity/photo',
  requireRole(SCHOOL_ROLES),
  (req, res, next) => studentPhotoUpload.single('photo')(req, res, (err) => {
    if (err) return res.status(400).json({ success: false, message: err.message || 'Photo upload failed' });
    next();
  }),
  async (req, res) => {
    try {
      await ensureStudentsTable();
      const schoolId = resolveSchoolId(req);
      const studentId = Number(req.params.id);
      if (!schoolId || Number.isNaN(studentId)) {
        return res.status(400).json({ success: false, message: 'Invalid request' });
      }
      if (!req.file?.filename) {
        return res.status(400).json({ success: false, message: 'Photo file is required (field: photo)' });
      }

      const [[existing]] = await promisePool.query(
        'SELECT id, student_photo FROM students WHERE id = ? AND school_id = ? LIMIT 1',
        [studentId, schoolId]
      );
      if (!existing) return res.status(404).json({ success: false, message: 'Student not found' });

      // Remove old file best-effort (do not block on failure)
      const old = existing.student_photo ? String(existing.student_photo) : '';
      if (old && /^[a-zA-Z0-9._-]+$/.test(old)) {
        const oldPath = path.join(STUDENT_PHOTO_DIR, old);
        fs.unlink(oldPath, () => {});
      }

      const filename = req.file.filename;
      await promisePool.query(
        'UPDATE students SET student_photo = ?, updated_at = NOW() WHERE id = ? AND school_id = ?',
        [filename, studentId, schoolId]
      );

      return res.json({
        success: true,
        message: 'Student photo saved',
        data: {
          id: studentId,
          student_photo: filename,
          student_photo_url: toStudentPhotoUrl(filename),
        },
      });
    } catch (err) {
      console.error('PUT /api/students/:id/identity/photo error:', err);
      return res.status(500).json({ success: false, message: 'Failed to save student photo' });
    }
  }
);

// ════════════════════════════════════════════════════════════════
// PUT /api/students/:id/identity  { rfid_uid, fingerprint_id, identity_remarks }
// ════════════════════════════════════════════════════════════════
router.put('/students/:id/identity', requireRole(SCHOOL_ROLES), async (req, res) => {
  try {
    await ensureStudentsTable();
    const schoolId = resolveSchoolId(req);
    const studentId = Number(req.params.id);
    if (!schoolId || Number.isNaN(studentId)) {
      return res.status(400).json({ success: false, message: 'Invalid request' });
    }

    const body = req.body || {};
    const rfidUid = trimStr(body.rfid_uid || body.rfidUid || '');
    const fingerprintId = trimStr(body.fingerprint_id || body.fingerprintId || '');
    const remarks = trimStr(body.identity_remarks || body.identityRemarks || '');

    if (!rfidUid) return res.status(400).json({ success: false, message: 'RFID UID Code is required' });
    if (!fingerprintId) return res.status(400).json({ success: false, message: 'Fingerprint ID is required' });

    const [[existing]] = await promisePool.query(
      'SELECT id FROM students WHERE id = ? AND school_id = ? LIMIT 1',
      [studentId, schoolId]
    );
    if (!existing) return res.status(404).json({ success: false, message: 'Student not found' });

    const [[dupRfid]] = await promisePool.query(
      'SELECT id FROM students WHERE school_id = ? AND rfid_uid = ? AND id != ? LIMIT 1',
      [schoolId, rfidUid, studentId]
    );
    if (dupRfid) {
      return res.status(409).json({ success: false, message: `RFID UID "${rfidUid}" is already assigned to another student` });
    }

    const [[dupFp]] = await promisePool.query(
      'SELECT id FROM students WHERE school_id = ? AND fingerprint_id = ? AND id != ? LIMIT 1',
      [schoolId, fingerprintId, studentId]
    );
    if (dupFp) {
      return res.status(409).json({ success: false, message: `Fingerprint ID "${fingerprintId}" is already assigned to another student` });
    }

    await promisePool.query(
      'UPDATE students SET rfid_uid = ?, fingerprint_id = ?, identity_remarks = ?, updated_at = NOW() WHERE id = ? AND school_id = ?',
      [rfidUid, fingerprintId, remarks || null, studentId, schoolId]
    );

    const [[row]] = await promisePool.query(
      'SELECT id, student_photo, rfid_uid, fingerprint_id, identity_remarks FROM students WHERE id = ? AND school_id = ? LIMIT 1',
      [studentId, schoolId]
    );

    return res.json({
      success: true,
      message: 'Identity credentials saved',
      data: {
        id: row.id,
        rfid_uid: row.rfid_uid,
        fingerprint_id: row.fingerprint_id,
        identity_remarks: row.identity_remarks,
        student_photo_url: row.student_photo ? toStudentPhotoUrl(row.student_photo) : null,
      },
    });
  } catch (err) {
    console.error('PUT /api/students/:id/identity error:', err);
    return res.status(500).json({ success: false, message: 'Failed to save identity credentials' });
  }
});

// ════════════════════════════════════════════════════════════════
// DELETE /api/students/:id
// ════════════════════════════════════════════════════════════════
router.delete('/students/:id', requireRole(SCHOOL_ROLES), async (req, res) => {
  try {
    await ensureStudentsTable();
    const schoolId  = resolveSchoolId(req);
    const studentId = Number(req.params.id);
    if (!schoolId || Number.isNaN(studentId)) return res.status(400).json({ success: false, message: 'Invalid request' });
    const [result] = await promisePool.query(
      'DELETE FROM students WHERE id = ? AND school_id = ?',
      [studentId, schoolId]
    );
    if (!result.affectedRows) return res.status(404).json({ success: false, message: 'Student not found' });
    return res.json({ success: true, message: 'Student deleted' });
  } catch (err) {
    console.error('DELETE /api/students/:id error:', err);
    return res.status(500).json({ success: false, message: 'Failed to delete student' });
  }
});

// ════════════════════════════════════════════════════════════════
// POST /api/students/bulk-delete  { ids: number[] }
// ════════════════════════════════════════════════════════════════
router.post('/students/bulk-delete', requireRole(SCHOOL_ROLES), async (req, res) => {
  try {
    await ensureStudentsTable();
    const schoolId = resolveSchoolId(req);
    if (!schoolId) return res.status(400).json({ success: false, message: 'School not found in session.' });

    const raw = req.body?.ids;
    const ids = Array.isArray(raw)
      ? raw.map((x) => Number(x)).filter((n) => Number.isFinite(n) && n > 0)
      : [];
    const unique = [...new Set(ids)];
    if (!unique.length) {
      return res.status(400).json({ success: false, message: 'No student IDs provided.' });
    }
    if (unique.length > 2000) {
      return res.status(400).json({ success: false, message: 'Too many IDs in one request (max 2000).' });
    }

    const ph = unique.map(() => '?').join(',');
    const [result] = await promisePool.query(
      `DELETE FROM students WHERE school_id = ? AND id IN (${ph})`,
      [schoolId, ...unique]
    );
    return res.json({
      success: true,
      message: 'Students deleted',
      deleted: Number(result.affectedRows || 0),
    });
  } catch (err) {
    console.error('POST /api/students/bulk-delete error:', err);
    return res.status(500).json({ success: false, message: 'Failed to delete students' });
  }
});

// ════════════════════════════════════════════════════════════════
// POST /api/students/delete-all  { confirmPhrase: "DELETE ALL STUDENTS" }
// ════════════════════════════════════════════════════════════════
router.post('/students/delete-all', requireRole(SCHOOL_ROLES), async (req, res) => {
  try {
    await ensureStudentsTable();
    const schoolId = resolveSchoolId(req);
    if (!schoolId) return res.status(400).json({ success: false, message: 'School not found in session.' });

    const phrase = String(req.body?.confirmPhrase || '').trim();
    if (phrase !== 'DELETE ALL STUDENTS') {
      return res.status(400).json({
        success: false,
        message: 'Confirmation phrase does not match. Type: DELETE ALL STUDENTS',
      });
    }

    const [result] = await promisePool.query('DELETE FROM students WHERE school_id = ?', [schoolId]);
    return res.json({
      success: true,
      message: 'All students removed for this school',
      deleted: Number(result.affectedRows || 0),
    });
  } catch (err) {
    console.error('POST /api/students/delete-all error:', err);
    return res.status(500).json({ success: false, message: 'Failed to delete all students' });
  }
});

// ════════════════════════════════════════════════════════════════
// GET /api/students/export.xlsx
// ════════════════════════════════════════════════════════════════
router.get('/students/export.xlsx', requireRole(SCHOOL_ROLES), async (req, res) => {
  try {
    await ensureStudentsTable();
    const schoolId = resolveSchoolId(req);
    if (!schoolId) return res.status(400).json({ success: false, message: 'School not found in session' });

    const [rows] = await promisePool.query(
      `SELECT s.student_uid, s.student_code, s.first_name, s.last_name, s.gender, s.birth_year, s.nationality,
              s.province, s.district, s.sector, s.cell, s.village,
              s.class_id, s.class_name, s.academic_year, s.sdm_code,
              s.father_full_name, s.father_phone, s.father_email,
              s.mother_full_name, s.mother_phone, s.mother_email, s.created_at,
              c.group_name AS class_group_name, c.stream_name AS class_stream_name
       FROM students s
       LEFT JOIN school_classes c ON s.class_id = c.id
       WHERE s.school_id = ? ORDER BY s.created_at DESC`,
      [schoolId]
    );

    const data = rows.map((r) => ({
      StudentID: r.student_uid,
      OfficialStudentCode: r.student_code || '',
      SDMCode: r.sdm_code || '',
      FirstName: r.first_name, LastName: r.last_name,
      Gender: r.gender, BirthYear: r.birth_year, Nationality: r.nationality,
      ClassName: r.class_group_name ? `${r.class_group_name} ${r.class_stream_name || ''} ${r.class_combination || ''}`.trim() : (r.class_name || ''),
      AcademicYear: r.academic_year || '',
      Province: r.province, District: r.district, Sector: r.sector, Cell: r.cell, Village: r.village,
      FatherName: r.father_full_name || '', FatherPhone: r.father_phone || '', FatherEmail: r.father_email || '',
      MotherName: r.mother_full_name || '', MotherPhone: r.mother_phone || '', MotherEmail: r.mother_email || '',
      CreatedAt: r.created_at,
    }));

    const wb     = xlsx.utils.book_new();
    const ws     = xlsx.utils.json_to_sheet(data);
    xlsx.utils.book_append_sheet(wb, ws, 'Students');
    const buffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="students-school-${schoolId}.xlsx"`);
    return res.send(buffer);
  } catch (err) {
    console.error('GET /api/students/export.xlsx error:', err);
    return res.status(500).json({ success: false, message: 'Failed to export Excel' });
  }
});

// ════════════════════════════════════════════════════════════════
// GET /api/students/export.pdf
// ════════════════════════════════════════════════════════════════
router.get('/students/export.pdf', requireRole(SCHOOL_ROLES), async (req, res) => {
  try {
    await ensureStudentsTable();
    const schoolId = resolveSchoolId(req);
    if (!schoolId) return res.status(400).json({ success: false, message: 'School not found in session' });

    const [rows] = await promisePool.query(
      `SELECT s.student_uid, s.first_name, s.last_name, s.gender, s.birth_year, s.district, s.sector, s.village,
              c.group_name, c.stream_name, s.class_name
       FROM students s
       LEFT JOIN school_classes c ON s.class_id = c.id
       WHERE s.school_id = ? ORDER BY s.created_at DESC`,
      [schoolId]
    );

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="students-school-${schoolId}.pdf"`);

    const doc = new PDFDocument({ margin: 36, size: 'A4' });
    doc.pipe(res);
    doc.fontSize(16).text(`Registered Students - School ${schoolId}`, { align: 'left' });
    doc.moveDown(0.5);
    doc.fontSize(10).fillColor('#555').text(`Generated at: ${new Date().toLocaleString()}`);
    doc.moveDown(1);
    doc.fillColor('#000');

    if (!rows.length) { doc.fontSize(12).text('No students found.'); doc.end(); return; }

    rows.forEach((r, idx) => {
      if (doc.y > 760) doc.addPage();
      const cls = r.group_name ? `${r.group_name} ${r.stream_name || ''}`.trim() : (r.class_name || 'N/A');
      doc.fontSize(10).text(
        `${idx + 1}. ${r.student_uid} - ${r.first_name} ${r.last_name} | ${cls} | ${r.gender || '-'} | ${r.birth_year || '-'} | ${r.village}, ${r.sector}, ${r.district}`
      );
    });
    doc.end();
    return;
  } catch (err) {
    console.error('GET /api/students/export.pdf error:', err);
    return res.status(500).json({ success: false, message: 'Failed to export PDF' });
  }
});

// ════════════════════════════════════════════════════════════════
// POST /api/students  — create single student
// ════════════════════════════════════════════════════════════════
router.post('/students', requireRole(SCHOOL_ROLES), async (req, res) => {
  try {
    await ensureStudentsTable();
    const schoolId = resolveSchoolId(req);
    if (!schoolId) return res.status(400).json({ success: false, message: 'School not found in session.' });

    const {
      student_uid, autoId = true,
      first_name, last_name, gender, birth_year, nationality = 'Rwandan',
      province, district, sector, cell, village,
      class_name, className,
      class_id, classId,
      academic_year, academicYear,
      sdm_code, sdmCode,
      father_full_name, father_phone, father_email,
      mother_full_name, mother_phone, mother_email,
      rfid_uid, fingerprint_id, identity_remarks,
      residency_status,
    } = req.body || {};
    const classNameVal = trimStr(class_name || className) || null;
    const classIdVal = Number(class_id || classId) || null;
    const academicYearVal = trimStr(academic_year || academicYear) || null;
    const sdmCodeVal = trimStr(sdm_code || sdmCode) || null;

    const required = { first_name, last_name, province, district, sector, cell, village };
    const missing  = Object.entries(required)
      .filter(([, v]) => v === undefined || v === null || trimStr(v) === '')
      .map(([k]) => k);
    if (missing.length) return res.status(400).json({ success: false, message: `Missing required fields: ${missing.join(', ')}` });

    const year = (birth_year === undefined || birth_year === null || trimStr(birth_year) === '')
      ? null : normalizeBirthYearValue(birth_year);
    if (birth_year !== undefined && birth_year !== null && trimStr(birth_year) !== '' && !year)
      return res.status(400).json({ success: false, message: 'Invalid birth year' });

    const normalizedGender = trimStr(gender) ? normalizeGender(gender) : null;
    if (trimStr(gender) && !normalizedGender) return res.status(400).json({ success: false, message: 'Gender must be Male or Female' });

    const fPhone = normalizePhone(father_phone);
    const mPhone = normalizePhone(mother_phone);
    if (father_phone && !fPhone) return res.status(400).json({ success: false, message: 'Invalid father phone (use Rwandan format)' });
    if (mother_phone && !mPhone) return res.status(400).json({ success: false, message: 'Invalid mother phone (use Rwandan format)' });

    let uid = student_uid && trimStr(student_uid);
    if (!uid || autoId) uid = await generateStudentUID(schoolId);

    const officialCode = /^\d{9}$/.test(uid) ? uid : null;

    const [[dup]] = await promisePool.query(
      'SELECT id FROM students WHERE student_uid = ? AND school_id = ? LIMIT 1',
      [uid, schoolId]
    );
    if (dup) return res.status(409).json({ success: false, message: `Student ID "${uid}" already exists for this school` });

    const rfidUidVal = trimStr(rfid_uid) || null;
    const fingerprintIdVal = trimStr(fingerprint_id) || null;
    const identityRemarksVal = trimStr(identity_remarks) || null;

    if (rfidUidVal) {
      const [[dupRfid]] = await promisePool.query(
        'SELECT id FROM students WHERE school_id = ? AND rfid_uid = ? LIMIT 1',
        [schoolId, rfidUidVal]
      );
      if (dupRfid) return res.status(409).json({ success: false, message: `RFID UID "${rfidUidVal}" is already assigned to another student` });
    }

    if (fingerprintIdVal) {
      const [[dupFp]] = await promisePool.query(
        'SELECT id FROM students WHERE school_id = ? AND fingerprint_id = ? LIMIT 1',
        [schoolId, fingerprintIdVal]
      );
      if (dupFp) return res.status(409).json({ success: false, message: `Fingerprint ID "${fingerprintIdVal}" is already assigned to another student` });
    }

    const [result] = await promisePool.query(
      `INSERT INTO students (student_uid, student_code, school_id, first_name, last_name, gender, birth_year, nationality,
         province, district, sector, cell, village,
         class_name, class_id, academic_year, sdm_code,
         father_full_name, father_phone, father_email,
         mother_full_name, mother_phone, mother_email,
         rfid_uid, fingerprint_id, identity_remarks,
         residency_status)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        uid, officialCode, schoolId, trimStr(first_name), trimStr(last_name), normalizedGender, year,
        nationality || 'Rwandan', province, district, sector, cell, village,
        classNameVal, classIdVal, academicYearVal, sdmCodeVal,
        father_full_name || null, fPhone, father_email || null,
        mother_full_name || null, mPhone, mother_email || null,
        rfidUidVal, fingerprintIdVal, identityRemarksVal,
        req.body?.residency_status || 'DAY',
      ]
    );
    return res.status(201).json({
      success: true,
      message: 'Student created',
      data: { id: result.insertId, student_uid: uid, student_code: officialCode },
    });
  } catch (err) {
    console.error('POST /api/students error:', err);
    return res.status(500).json({ success: false, message: 'Failed to create student' });
  }
});

// ════════════════════════════════════════════════════════════════
// POST /api/students/import  — Excel bulk import
// ════════════════════════════════════════════════════════════════
router.post(
  '/students/import',
  requireRole(SCHOOL_ROLES),
  excelUpload.single('file'),
  async (req, res) => {
    await ensureStudentsTable();
    const schoolId = resolveSchoolId(req);
    if (!schoolId) return res.status(400).json({ success: false, message: 'School not found in session.' });
    if (!req.file?.path)  return res.status(400).json({ success: false, message: 'Excel file is required' });

    try {
      // ── 1. Parse workbook ──────────────────────────────────────
      const workbook = xlsx.readFile(req.file.path);

      // Pick the sheet with the most data rows
      let bestSheet = null, bestRowCount = 0;
      for (const name of workbook.SheetNames || []) {
        const s    = workbook.Sheets[name];
        if (!s) continue;
        const rows = xlsx.utils.sheet_to_json(s, { header: 1, defval: '' });
        if (rows.length > bestRowCount) { bestRowCount = rows.length; bestSheet = name; }
      }
      if (!bestSheet) return res.status(400).json({ success: false, message: 'No sheets found in Excel file.' });

      const sheet      = workbook.Sheets[bestSheet];
      const objectRows = xlsx.utils.sheet_to_json(sheet, { defval: '' });
      const rawRows    = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: '' });

      if (!objectRows.length || rawRows.length < 2)
        return res.status(400).json({ success: false, message: 'The uploaded Excel file is empty or invalid.' });

      const importModeRaw = trimStr(req.body?.importMode || 'insert_only').toLowerCase();
      const importMode    = ['insert_only', 'replace_by_student_id'].includes(importModeRaw)
        ? importModeRaw : 'insert_only';

      const defaultClass = trimStr(req.body?.class_name || '');
      const defaultYear = trimStr(req.body?.academic_year || '');
      if (!defaultClass || !defaultYear) {
        return res.status(400).json({
          success: false,
          message: 'Class and academic year are required. Set them before uploading the Excel file.',
        });
      }

      const toInsert      = [];
      const errors        = [];
      let   skippedRows   = 0;
      let   phoneWarnings = 0;
      const seenImportUids = new Set();
      const nextUid        = await createImportUidAllocator(schoolId);

      // ── 2. Detect format ───────────────────────────────────────
      //
      // Priority A: Urubuto "object-row" format
      //   objectRows[0] looks like the header map (key "" = "ID", etc.)
      //
      // Priority B: Urubuto "array-row" format
      //   rawRows has a header row detected by findUrubutoHeaderIndex
      //
      // Priority C: Generic header-aliased format
      //

      const isUrubutoObjectFormat = looksLikeUrubutoObjectHeaderRow(objectRows[0]);

      if (isUrubutoObjectFormat) {
        // ── FORMAT A: Urubuto object rows ────────────────────────
        //
        // objectRows[0]  = header map  (skip)
        // objectRows[1…] = student data rows
        //
        // The ordinal column key is the long school-name string
        // (the first key in the header row object).
        const ordinalKey = Object.keys(objectRows[0])[0]; // "[SCHOOL :...]"

        for (let i = 1; i < objectRows.length; i += 1) {
          const r      = objectRows[i];
          const rowNum = i + 1; // 1-based for error messages

          // ── STRICT GATE: must be a real student row ──────────
          if (!isUrubutoStudentObjectRow(r, ordinalKey)) {
            skippedRows += 1;
            continue;
          }

          const uid = normalizeStudentId(r['']);

          // Deduplicate within this upload
          if (seenImportUids.has(uid)) {
            skippedRows += 1;
            continue;
          }
          seenImportUids.add(uid);

          const first  = trimStr(r.__1);
          const last   = trimStr(r.__2);
          const gender = normalizeGender(r.__3);
          const birth  = normalizeBirthYearValue(r.__4);

          if (!first || !last) {
            errors.push(`Row ${rowNum} (ID ${uid}): missing first or last name`);
            skippedRows += 1;
            continue;
          }

          // Location (columns 12–16)
          const province = normalizeProvinceLabel(cleanLocationToken(trimStr(r.__12)));
          const district = cleanLocationToken(trimStr(r.__13));
          const sector   = cleanLocationToken(trimStr(r.__14));
          const cell     = cleanLocationToken(trimStr(r.__15));
          const village  = cleanLocationToken(trimStr(r.__16));

          const locationMissing = [];
          if (!province) locationMissing.push('Province');
          if (!district) locationMissing.push('District');
          if (!sector)   locationMissing.push('Sector');
          if (!cell)     locationMissing.push('Cell');
          if (!village)  locationMissing.push('Village');

          // Phones (columns 6 and 9)
          const hasManyDigits = (v) => String(v || '').replace(/\D/g, '').length >= 6;
          let fatherPhone = normalizePhone(r.__6);
          let motherPhone = normalizePhone(r.__9);
          if (r.__6 && !fatherPhone && hasManyDigits(r.__6)) { phoneWarnings += 1; fatherPhone = null; }
          if (r.__9 && !motherPhone && hasManyDigits(r.__9)) { phoneWarnings += 1; motherPhone = null; }

          toInsert.push({
            uid,
            first_name:       first,
            last_name:        last,
            gender:           gender || null,
            birth_year:       birth  || null,
            nationality:      normalizeNationalityLabel(trimStr(r.__11)) || 'Rwandan',
            province,
            district,
            sector,
            cell,
            village,
            father_full_name: trimStr(r.__5)  || null,
            father_phone:     fatherPhone,
            father_email:     trimStr(r.__7)  || null,
            mother_full_name: trimStr(r.__8)  || null,
            mother_phone:     motherPhone,
            mother_email:     trimStr(r.__10) || null,
            import_missing_fields: JSON.stringify(locationMissing),
            source_row_json:  JSON.stringify(r),
            residency_status: 'DAY',
          });
        }

      } else {
        // ── FORMAT B / C: array rows ─────────────────────────────
        const canonicalIndex = findUrubutoHeaderIndex(rawRows);
        const headerInfo     = detectHeaderRow(rawRows);
        const headerIndex    = canonicalIndex >= 0 ? canonicalIndex : headerInfo.index;
        const headerCells    = rawRows[headerIndex] || [];
        const dataRows       = rawRows.slice(headerIndex + 1);
        const headerTrusted  = Number(headerInfo.score || 0) >= 4 || canonicalIndex >= 0;
        const canonicalUrubuto = canonicalIndex >= 0;

        for (let i = 0; i < dataRows.length; i += 1) {
          const row    = dataRows[i];
          const rowNum = headerIndex + i + 2;
          if (isBlankArrayRow(row)) continue;

          // ── Canonical Urubuto array-row strict gate ──────────────
          //
          // Two possible layouts depending on whether the export includes
          // a leading "#" ordinal column:
          //
          //   Layout A  (with ordinal — e.g. Urubuto web export):
          //     col 0 = #(ordinal)  col 1 = ID  col 2 = FName  col 3 = LName ...
          //
          //   Layout B  (no ordinal — e.g. sample3.xlsx direct export):
          //     col 0 = ID  col 1 = FName  col 2 = LName  col 3 = Gender ...
          //
          // We detect the layout once from the first non-blank data row:
          //   - If col 0 is a valid student ID → Layout B (base = 0)
          //   - Otherwise assume Layout A       (base = 1)
          //
          if (canonicalUrubuto) {
            const maybeId0 = normalizeStudentId(row?.[0]);
            const maybeId1 = normalizeStudentId(row?.[1]);

            // Layout B: col0 is directly the student ID
            // Layout A: col0 is a small ordinal number, col1 is the student ID
            const layoutB = isValidStudentId(maybeId0);
            const base    = layoutB ? 0 : 1; // column offset to student ID

            const strictUid = normalizeStudentId(row?.[base]);

            // For Layout A, additionally verify the ordinal in col 0 looks sane
            if (!layoutB) {
              const ordinal = Number(trimStr(row?.[0]));
              const validOrdinal = Number.isInteger(ordinal) && ordinal > 0 && ordinal < 100000;
              if (!validOrdinal || !isValidStudentId(strictUid)) { skippedRows += 1; continue; }
            } else {
              // Layout B: just need a valid ID in col 0
              if (!isValidStudentId(strictUid)) { skippedRows += 1; continue; }
            }

            if (seenImportUids.has(strictUid)) { skippedRows += 1; continue; }
            seenImportUids.add(strictUid);

            const strictFirst  = trimStr(row?.[base + 1]);
            const strictLast   = trimStr(row?.[base + 2]);
            const strictGender = normalizeGender(row?.[base + 3]);
            const strictBirth  = normalizeBirthYearValue(row?.[base + 4]);

            if (!strictFirst || !strictLast) {
              errors.push(`Row ${rowNum}: missing first or last name`);
              skippedRows += 1;
              continue;
            }

            const hasManyDigits  = (v) => String(v || '').replace(/\D/g, '').length >= 6;
            const fatherPhoneRaw = trimStr(row?.[base + 6]);
            const motherPhoneRaw = trimStr(row?.[base + 9]);
            let fatherPhone = normalizePhone(fatherPhoneRaw);
            let motherPhone = normalizePhone(motherPhoneRaw);
            if (fatherPhoneRaw && !fatherPhone && hasManyDigits(fatherPhoneRaw)) { phoneWarnings += 1; fatherPhone = null; }
            if (motherPhoneRaw && !motherPhone && hasManyDigits(motherPhoneRaw)) { phoneWarnings += 1; motherPhone = null; }

            const province = normalizeProvinceLabel(cleanLocationToken(trimStr(row?.[base + 12])));
            const district = cleanLocationToken(trimStr(row?.[base + 13]));
            const sector   = cleanLocationToken(trimStr(row?.[base + 14]));
            const cell     = cleanLocationToken(trimStr(row?.[base + 15]));
            const village  = cleanLocationToken(trimStr(row?.[base + 16]));

            const locationMissing = [];
            if (!province) locationMissing.push('Province');
            if (!district) locationMissing.push('District');
            if (!sector)   locationMissing.push('Sector');
            if (!cell)     locationMissing.push('Cell');
            if (!village)  locationMissing.push('Village');

            toInsert.push({
              uid:              strictUid,
              first_name:       strictFirst,
              last_name:        strictLast,
              gender:           strictGender || null,
              birth_year:       strictBirth  || null,
              nationality:      normalizeNationalityLabel(trimStr(row?.[base + 11])) || 'Rwandan',
              province, district, sector, cell, village,
              father_full_name: trimStr(row?.[base + 5])  || null,
              father_phone:     fatherPhone,
              father_email:     trimStr(row?.[base + 7])  || null,
              mother_full_name: trimStr(row?.[base + 8])  || null,
              mother_phone:     motherPhone,
              mother_email:     trimStr(row?.[base + 10]) || null,
              import_missing_fields: JSON.stringify(locationMissing),
              source_row_json:  JSON.stringify(row),
              residency_status: 'DAY',
            });
            continue;
          }

          // Generic / non-canonical path
          let first_name  = readFromRowByAliases(row, headerCells, ['F. Name','F Name','FirstName','First Name','Given Name']);
          let last_name   = readFromRowByAliases(row, headerCells, ['L. Name','L Name','LastName','Last Name','Surname']);
          const fullName  = readFromRowByAliases(row, headerCells, ['Name','Student Name']);
          let genderRaw   = readFromRowByAliases(row, headerCells, ['Gender','Sex','Igitsina']);
          let birth_year  = readFromRowByAliases(row, headerCells, ['BirthYear','Birth Year','DOB Year','Year Of Birth']);
          let nationality = readFromRowByAliases(row, headerCells, ['Nationality','Country']);
          let province    = readFromRowByAliases(row, headerCells, ['Province','Intara']);
          let district    = readFromRowByAliases(row, headerCells, ['District','Akarere']);
          let sector      = readFromRowByAliases(row, headerCells, ['Sector','Umurenge']);
          let cell        = readFromRowByAliases(row, headerCells, ['Cell','Akagari']);
          let village     = readFromRowByAliases(row, headerCells, ['Village','Umudugudu']);

          if (!headerTrusted) {
            first_name = first_name || readFromFixedIndexes(row, [2, 0]);
            last_name  = last_name  || readFromFixedIndexes(row, [3, 1]);
            genderRaw  = genderRaw  || readFromFixedIndexes(row, [4, 3]);
            birth_year = birth_year || readFromFixedIndexes(row, [5, 4]);
            province   = province   || readFromFixedIndexes(row, [6, 5]);
            district   = district   || readFromFixedIndexes(row, [7, 6]);
            sector     = sector     || readFromFixedIndexes(row, [8, 7]);
            cell       = cell       || readFromFixedIndexes(row, [9, 8]);
            village    = village    || readFromFixedIndexes(row, [10, 9]);
          }

          // Strong fixed fallback
          first_name = first_name || trimStr(row?.[1]);
          last_name  = last_name  || trimStr(row?.[2]);
          genderRaw  = genderRaw  || trimStr(row?.[3]);
          birth_year = birth_year || trimStr(row?.[4]);
          nationality = nationality || trimStr(row?.[11]);
          province   = province   || trimStr(row?.[12]);
          district   = district   || trimStr(row?.[13]);
          sector     = sector     || trimStr(row?.[14]);
          cell       = cell       || trimStr(row?.[15]);
          village    = village    || trimStr(row?.[16]);

          if (!first_name || !last_name) {
            const h = extractHeuristicFromRow(row);
            first_name  = first_name  || h.first_name;
            last_name   = last_name   || h.last_name;
            genderRaw   = genderRaw   || h.genderRaw;
            birth_year  = birth_year  || h.birth_year;
            nationality = nationality || h.nationality;
            province    = province    || h.province;
            district    = district    || h.district;
            sector      = sector      || h.sector;
            cell        = cell        || h.cell;
            village     = village     || h.village;
          }

          if ((!first_name || !last_name) && fullName) {
            const parts = trimStr(fullName).split(/\s+/).filter(Boolean);
            if (!first_name && parts.length) first_name = parts[0];
            if (!last_name  && parts.length > 1) last_name = parts.slice(1).join(' ');
          }

          province = normalizeProvinceLabel(cleanLocationToken(province));
          district = cleanLocationToken(district);
          sector   = cleanLocationToken(sector);
          cell     = cleanLocationToken(cell);
          village  = cleanLocationToken(village);

          if (!first_name || !last_name) {
            const values = (Array.isArray(row) ? row : []).map(trimStr).filter(Boolean);
            if (values.length >= 4) errors.push(`Row ${rowNum}: missing first or last name`);
            skippedRows += 1;
            continue;
          }

          const locationMissing = [];
          if (!province) locationMissing.push('Province');
          if (!district) locationMissing.push('District');
          if (!sector)   locationMissing.push('Sector');
          if (!cell)     locationMissing.push('Cell');
          if (!village)  locationMissing.push('Village');

          const year   = birth_year ? normalizeBirthYearValue(birth_year) : null;
          const gender = genderRaw  ? normalizeGender(genderRaw) : null;

          const rawFPhone = readFromRowByAliases(row, headerCells, ['Father Tel.','Father Tel','FatherPhone','Father Phone']);
          const rawMPhone = readFromRowByAliases(row, headerCells, ['Mother Tel.','Mother Tel','MotherPhone','Mother Phone']);
          const hasManyDigits = (v) => String(v || '').replace(/\D/g, '').length >= 6;
          let fPhone = normalizePhone(rawFPhone);
          let mPhone = normalizePhone(rawMPhone);
          if (rawFPhone && !fPhone && hasManyDigits(rawFPhone)) { phoneWarnings += 1; fPhone = null; }
          if (rawMPhone && !mPhone && hasManyDigits(rawMPhone)) { phoneWarnings += 1; mPhone = null; }

          let uid = normalizeStudentId(
            readFromRowByAliases(row, headerCells, ['ID','Id','StudentID','Student ID','Registration Number'])
          );
          if (!uid) {
            const c0 = normalizeStudentId(row?.[0]);
            if (isValidStudentId(c0)) uid = c0;
          }
          if (!uid) {
            const h = extractHeuristicFromRow(row);
            if (h.uid) uid = h.uid;
          }
          if (!uid) uid = nextUid();

          if (seenImportUids.has(uid)) { skippedRows += 1; continue; }
          seenImportUids.add(uid);

          toInsert.push({
            uid, first_name, last_name,
            gender: gender || null, birth_year: year || null,
            nationality: normalizeNationalityLabel(nationality || inferLocationFromRowTail(row).nationality || 'Rwandan') || 'Rwandan',
            province, district, sector, cell, village,
            father_full_name: readFromRowByAliases(row, headerCells, ['FatherName','Father Name','Father Full Name']) || null,
            father_phone: fPhone,
            father_email: readFromRowByAliases(row, headerCells, ['Father Email.','Father Email','FatherEmail']) || null,
            mother_full_name: readFromRowByAliases(row, headerCells, ['MotherName','Mother Name','Mother Full Name']) || null,
            mother_phone: mPhone,
            mother_email: readFromRowByAliases(row, headerCells, ['Mother Email.','Mother Email','MotherEmail']) || null,
            import_missing_fields: JSON.stringify(locationMissing),
            source_row_json: JSON.stringify(row),
            residency_status: 'DAY',
          });
        }
      }

      // ── 3. Nothing to insert ───────────────────────────────────
      if (!toInsert.length) {
        return res.status(400).json({ success: false, message: 'No valid student rows found to import.', errors });
      }

      // Apply batch class / academic year to every imported row
      for (const s of toInsert) {
        s.class_name = defaultClass;
        s.academic_year = defaultYear;
      }

      // ── 4. DB upsert ───────────────────────────────────────────
      const conn = await promisePool.getConnection();
      try {
        await conn.beginTransaction();
        let inserted = 0, updated = 0, duplicatesSkipped = 0, replacedSkipped = 0;

        for (const s of toInsert) {
          // eslint-disable-next-line no-await-in-loop
          const [[existing]] = await conn.query(
            'SELECT id FROM students WHERE student_uid = ? AND school_id = ? LIMIT 1',
            [s.uid, schoolId]
          );

          if (importMode === 'insert_only' && existing)      { duplicatesSkipped += 1; continue; }
          if (importMode === 'replace_by_student_id' && !existing) { replacedSkipped += 1; continue; }

          if (existing) {
            const natU = trimStr(s.nationality) ? normalizeNationalityLabel(s.nationality) : null;
            const locU = (v) => {
              const t = trimStr(v);
              return t === '' ? null : t;
            };
            // eslint-disable-next-line no-await-in-loop
            await conn.query(
              `UPDATE students SET
                 first_name=?, last_name=?, gender=?, birth_year=?, nationality=?,
                 province=?, district=?, sector=?, cell=?, village=?,
                 class_name=?, academic_year=?,
                 father_full_name=?, father_phone=?, father_email=?,
                 mother_full_name=?, mother_phone=?, mother_email=?,
                 import_missing_fields=?, source_row_json=?, updated_at=NOW()
               WHERE id=?`,
              [
                s.first_name, s.last_name, s.gender, s.birth_year, natU,
                locU(s.province), locU(s.district), locU(s.sector), locU(s.cell), locU(s.village),
                s.class_name || null, s.academic_year || null,
                s.father_full_name, s.father_phone, s.father_email,
                s.mother_full_name, s.mother_phone, s.mother_email,
                s.import_missing_fields || null, s.source_row_json || null,
                existing.id,
              ]
            );
            updated += 1;
          } else {
            // Official 9-digit ID (DD + school + seq): use Excel value only if already exactly 9 digits.
            // Urubuto / other exports often use 12-digit IDs — allocate next school code instead.
            // eslint-disable-next-line no-await-in-loop
            const uidStr = String(s.uid || '').trim();
            const officialNew = /^\d{9}$/.test(uidStr) ? uidStr : nextUid();
            const officialCode = officialNew;

            const nat = trimStr(s.nationality)
              ? normalizeNationalityLabel(s.nationality)
              : null;
            const loc = (v) => {
              const t = trimStr(v);
              return t === '' ? null : t;
            };

            await conn.query(
              `INSERT INTO students (
                 student_uid, student_code, school_id, first_name, last_name, gender, birth_year, nationality,
                 province, district, sector, cell, village,
                 class_name, academic_year, sdm_code,
                 father_full_name, father_phone, father_email,
                 mother_full_name, mother_phone, mother_email,
                 import_missing_fields, source_row_json
               ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
              [
                officialNew, officialCode, schoolId,
                s.first_name, s.last_name, s.gender, s.birth_year, nat,
                loc(s.province), loc(s.district), loc(s.sector), loc(s.cell), loc(s.village),
                s.class_name || null, s.academic_year || null, null,
                s.father_full_name, s.father_phone, s.father_email,
                s.mother_full_name, s.mother_phone, s.mother_email,
                s.import_missing_fields || null, s.source_row_json || null,
              ]
            );
            inserted += 1;
          }
        }

        await conn.commit();
        conn.release();

        skippedRows += duplicatesSkipped + replacedSkipped;
        const modeLabel = importMode === 'insert_only' ? 'Insert only' : 'Replace by Student ID';

        return res.json({
          success: true,
          message: `Import completed (${modeLabel}): ${inserted} inserted, ${updated} updated, ${skippedRows} skipped.`,
          inserted, updated, skipped: skippedRows,
          processed: toInsert.length + skippedRows,
          importMode, phoneWarnings, duplicatesSkipped, replacedSkipped,
          errors,
        });
      } catch (e) {
        await conn.rollback();
        conn.release();
        console.error('POST /api/students/import DB error:', e);
        return res.status(500).json({ success: false, message: 'Import failed during database write.' });
      }
    } catch (err) {
      console.error('POST /api/students/import error:', err);
      return res.status(500).json({ success: false, message: 'Import failed.' });
    } finally {
      if (req.file?.path) fs.unlink(req.file.path, () => {});
    }
  }
);

// ── Multer error handler ─────────────────────────────────────────
router.use((err, _req, res, _next) => {
  if (err.code === 'LIMIT_FILE_SIZE')       return res.status(400).json({ success: false, message: 'File too large (max 5 MB)' });
  if (err.code === 'LIMIT_UNEXPECTED_FILE') return res.status(400).json({ success: false, message: `Unexpected file field: ${err.field}` });
  return res.status(400).json({ success: false, message: err.message || 'Upload error' });
});

module.exports = router;