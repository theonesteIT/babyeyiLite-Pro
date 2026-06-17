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
//   GET    /api/students/registry-stats → gender / class aggregates (filtered)
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
const axios        = require('axios');
const { execSync } = require('child_process');

const router       = express.Router();
const { promisePool } = require('../config/database');
const { requireRole } = require('../middleware/deoAuth');
const {
  getDistrictCode,
  formatStudentUid,
  parseSchoolCodeNumeric,
} = require('../utils/rwandaDistrictCodes');
const {
  ensureStudentYearEnrollmentsTable,
  backfillSchoolEnrollments,
  syncEnrollmentFromStudent,
  enrollmentYearFilter,
  enrollmentClassSelect,
} = require('./studentYearEnrollments');
const {
  optimizeStudentPortraitBuffer,
  optimizeStudentPortraitFile,
  replaceUploadWithOptimizedPortrait,
} = require('../utils/studentPhotoOptimize');

// ── Allowed roles ────────────────────────────────────────────────
// DOS can also register/import students (same StudentsPage UX as School Manager).
const SCHOOL_ROLES = ['SCHOOL_ADMIN', 'SCHOOL_MANAGER', 'ACCOUNTANT', 'DOS'];
/** HOD may list students (read-only discipline workflow); mutations stay SCHOOL_ROLES */
const STUDENT_LIST_ROLES = [
  ...SCHOOL_ROLES,
  'HOD',
  'DISCIPLINE',
  'DISCIPLINE_STAFF',
  'SUPER_ADMIN',
  'FULL_SYSTEM_CONTROLLER',
];
/** RFID / fingerprint partial updates — platform operators may act on behalf of a selected school. */
const STUDENT_IDENTITY_ROLES = [...SCHOOL_ROLES, 'SUPER_ADMIN', 'FULL_SYSTEM_CONTROLLER'];

const ELEVATED_SCHOOL_SCOPERS = ['SUPER_ADMIN', 'FULL_SYSTEM_CONTROLLER'];

function requesterRoleUpper(req) {
  return String(req.user?.role_code || '').toUpperCase();
}

/** Session school, or for Super Admin / Controller: `school_id` query / `X-Babyeyi-School-Id` header. */
function resolveEffectiveSchoolId(req) {
  const base = resolveSchoolId(req);
  if (!ELEVATED_SCHOOL_SCOPERS.includes(requesterRoleUpper(req))) return base;
  const raw = req.query.school_id ?? req.headers['x-babyeyi-school-id'];
  const id = Number(raw);
  if (Number.isFinite(id) && id > 0) return id;
  return base;
}

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
      const ext = ['.jpg', '.jpeg', '.png'].includes(extRaw) ? extRaw : '.jpg';
      cb(null, `student-${Date.now()}-${crypto.randomBytes(8).toString('hex')}${ext}`);
    },
  }),
  limits: { fileSize: 12 * 1024 * 1024, files: 1 },
  fileFilter(_req, file, cb) {
    const ok = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(file.mimetype);
    if (ok) return cb(null, true);
    cb(new Error('Only image files are allowed (jpg/png).'));
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
  limits: { fileSize: 50 * 1024 * 1024, files: 2 },
  fileFilter(_req, file, cb) {
    if (file.fieldname === 'photos_zip') {
      const name = String(file.originalname || '').toLowerCase();
      const ok = name.endsWith('.zip')
        || ['application/zip', 'application/x-zip-compressed', 'multipart/x-zip'].includes(file.mimetype);
      return ok ? cb(null, true) : cb(new Error('photos_zip must be a .zip file'));
    }
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

function resolveClassNameFromBody(body, fallback = '') {
  const stream = trimStr(body?.stream ?? body?.stream_name ?? body?.streamName ?? '');
  const classPart = trimStr(
    body?.class_name ?? body?.className ?? body?.class ?? body?.group_name ?? body?.groupName ?? '',
  );
  if (classPart && stream) {
    const baseOnly = !classPart.includes(' ') || classPart.split(/\s+/).length === 1;
    if (baseOnly) return `${classPart} ${stream}`.replace(/\s+/g, ' ').trim();
    return classPart;
  }
  const resolved = classPart || trimStr(fallback);
  return resolved || null;
}

/** Optional parent national ID — trim only, max 64 chars. */
function optionalNationalId(v) {
  const s = trimStr(v);
  if (!s) return null;
  return s.length > 64 ? s.slice(0, 64) : s;
}

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

/** Urubuto / SDMS learner registration id for sdm_code (same digit rule as import row gate). */
function externalRegistrationIdForSdm(raw) {
  const s = normalizeStudentId(raw);
  if (!isValidStudentId(s)) return null;
  return s;
}

/** If a digit string normalizes as a Rwanda mobile number, it is not a student UID heuristic. */
function digitStringLooksLikeRwandaPhone(digits) {
  return Boolean(normalizePhone(digits));
}

/**
 * True only for the school's real official code: DD (district) + SSS (school) + NNNN (seq), 9 digits.
 * Rejects phone numbers, Urubuto 12-digit IDs, and arbitrary 9-digit values.
 */
function isOfficialNineDigitCodeForSchool(uidStr, districtName, schoolCodeRaw) {
  if (!/^\d{9}$/.test(uidStr)) return false;
  const dd = getDistrictCode(districtName) || '01';
  const ss = parseSchoolCodeNumeric(schoolCodeRaw);
  const prefix = `${String(dd).padStart(2, '0').slice(-2)}${ss}`;
  return uidStr.startsWith(prefix);
}

/** Use a file/manual UID as student_uid only if it is a real school official code, not a phone. */
function shouldTrustImportedStudentUid(uidStr, districtName, schoolCodeRaw) {
  if (!isOfficialNineDigitCodeForSchool(uidStr, districtName, schoolCodeRaw)) return false;
  if (digitStringLooksLikeRwandaPhone(uidStr)) return false;
  return true;
}

function formattedStudentCodeFromUid(uid) {
  const s = String(uid || '').trim();
  if (!/^\d{9}$/.test(s)) return null;
  return s;
}

const PROVINCE_MAP = {
  north: 'North', nortn: 'North', northn: 'North', norht: 'North', northh: 'North',
  'northern province': 'North', northern: 'North',
  south: 'South', 'southern province': 'South', southern: 'South',
  east: 'East', 'eastern province': 'East', eastern: 'East',
  west: 'West', 'western province': 'West', western: 'West',
  nothern: 'North', // common typo in data
  kigali: 'Kigali', 'kigali city': 'Kigali', 'kigali city ': 'Kigali',
  kiali: 'Kigali', 'kiali city': 'Kigali', kialicity: 'Kigali',
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
 * Shorter Urubuto export: ID + names + parents only (no province…village columns).
 * __7 = Mother name (not Father Email).
 */
function looksLikeUrubutoCompactObjectHeaderRow(r) {
  if (!r || typeof r !== 'object') return false;
  if (normalizeHeaderKeyStr(r.__12)) return false;
  const id = normalizeHeaderKeyStr(r['']);
  const f = normalizeHeaderKeyStr(r.__1);
  const l = normalizeHeaderKeyStr(r.__2);
  const g = normalizeHeaderKeyStr(r.__3);
  const by = normalizeHeaderKeyStr(r.__4);
  const father = normalizeHeaderKeyStr(r.__5);
  const fTel = normalizeHeaderKeyStr(r.__6);
  const mother = normalizeHeaderKeyStr(r.__7);
  const mTel = normalizeHeaderKeyStr(r.__8);
  return (
    id === 'id' &&
    (f === 'fname' || f.startsWith('f')) &&
    (l === 'lname' || l.startsWith('l')) &&
    g === 'gender' &&
    (by === 'birthyear' || by.includes('birth')) &&
    father === 'father' &&
    (fTel === 'fathertel' || (fTel.includes('father') && fTel.includes('tel'))) &&
    mother === 'mother' &&
    (mTel === 'mothertel' || (mTel.includes('mother') && mTel.includes('tel')))
  );
}

/** Row whose empty-key column is exactly "NAMES" / "NAME" (nursery class list exports). */
function findNurseryNamesListHeaderIndex(objectRows) {
  const limit = Math.min(objectRows.length, 60);
  for (let i = 0; i < limit; i += 1) {
    const r = objectRows[i];
    if (!r || typeof r !== 'object') continue;
    const cell = trimStr(r['']);
    if (/^names?$/i.test(cell)) return i;
  }
  return -1;
}

function objectRowHasNoNamesKeys(r) {
  if (!r || typeof r !== 'object') return false;
  const keys = Object.keys(r).map((k) => normalizeHeaderKeyStr(k));
  const hasNo = keys.some((k) => ['no', 'num', 'number', 'sno', 'sn'].includes(k));
  const hasNames = keys.some((k) => ['names', 'name', 'studentname', 'fullname'].includes(k));
  return hasNo && hasNames;
}

function readNoNamesObjectRowByKeyKind(r, kinds) {
  if (!r || typeof r !== 'object') return '';
  for (const [key, val] of Object.entries(r)) {
    const k = normalizeHeaderKeyStr(key);
    if (kinds.includes(k)) return trimStr(val);
  }
  return '';
}

function readNoNamesObjectRowOrdinal(r) {
  return readNoNamesObjectRowByKeyKind(r, ['no', 'num', 'number', 'sno', 'sn']);
}

function readNoNamesObjectRowName(r) {
  const raw = readNoNamesObjectRowByKeyKind(r, ['names', 'name', 'studentname', 'fullname']);
  return stripLeadingNoiseFromNameText(raw);
}

function isLikelyNoNamesHeaderRow(r) {
  const nameVal = readNoNamesObjectRowByKeyKind(r, ['names', 'name', 'studentname', 'fullname']);
  if (/^names?$/i.test(nameVal)) return true;
  const noVal = readNoNamesObjectRowOrdinal(r);
  if (/^no$/i.test(noVal)) return true;
  return false;
}

function findNoNamesListHeaderIndex(objectRows) {
  const limit = Math.min(objectRows.length, 60);
  for (let i = 0; i < limit; i += 1) {
    const r = objectRows[i];
    if (!objectRowHasNoNamesKeys(r)) continue;
    if (isLikelyNoNamesHeaderRow(r)) return i;
  }
  return -1;
}

function findNoNamesDataStartIndex(objectRows) {
  const limit = objectRows.length;
  for (let i = 0; i < limit; i += 1) {
    const r = objectRows[i];
    if (!objectRowHasNoNamesKeys(r)) continue;
    const no = readNoNamesObjectRowOrdinal(r);
    const name = readNoNamesObjectRowName(r);
    if (cellLooksLikeRowOrdinal(no) && name && !/^names?$/i.test(name)) return i;
  }
  return -1;
}

function findNoNamesArrayHeaderIndex(rawRows) {
  const limit = Math.min(rawRows.length, 40);
  for (let i = 0; i < limit; i += 1) {
    const row = rawRows[i];
    if (!Array.isArray(row)) continue;
    const t = row.map(normalizeHeaderKey);
    const hasNo = t.some((x) => ['no', 'num', 'number', 'sno', 'sn'].includes(x));
    const hasNames = t.some((x) => ['names', 'name', 'studentname', 'fullname'].includes(x));
    if (hasNo && hasNames) return i;
  }
  return -1;
}

function findNameColumnIndexInHeaders(headerCells) {
  if (!Array.isArray(headerCells)) return -1;
  for (let i = 0; i < headerCells.length; i += 1) {
    const k = normalizeHeaderKey(headerCells[i]);
    if (['names', 'name', 'studentname', 'fullname'].includes(k)) return i;
  }
  return -1;
}

function headerCellsLookLikeNoNamesLayout(headerCells) {
  if (!Array.isArray(headerCells)) return false;
  const t = headerCells.map(normalizeHeaderKey);
  const hasNo = t.some((x) => ['no', 'num', 'number', 'sno', 'sn'].includes(x));
  const hasNames = t.some((x) => ['names', 'name', 'studentname', 'fullname'].includes(x));
  return hasNo && hasNames;
}

function readObjectRowByAliases(r, aliases = []) {
  if (!r || typeof r !== 'object') return '';
  const aliasSet = new Set(aliases.map((a) => normalizeHeaderKeyStr(a)));
  for (const [key, val] of Object.entries(r)) {
    if (aliasSet.has(normalizeHeaderKeyStr(key))) return trimStr(val);
  }
  return '';
}

function normalizeAgeToBirthYear(ageRaw) {
  const age = Number(trimStr(ageRaw));
  if (!Number.isFinite(age) || age < 3 || age > 35) return null;
  const y = new Date().getFullYear() - Math.round(age);
  return isLikelyYear(y) ? y : null;
}

function headerCellsLookLikeRichRoster(headerCells) {
  if (!headerCellsLookLikeNoNamesLayout(headerCells)) return false;
  const t = headerCells.map(normalizeHeaderKey);
  return (
    t.some((x) => ['code', 'sdmsid', 'sdms', 'sdmcode', 'sdm', 'studentcode'].includes(x))
    || t.includes('gender')
    || t.includes('district')
    || t.includes('age')
  );
}

function objectRowHasRichRosterKeys(r) {
  if (!r || typeof r !== 'object' || !objectRowHasNoNamesKeys(r)) return false;
  const keys = Object.keys(r).map((k) => normalizeHeaderKeyStr(k));
  if (keys.some((k) => ['code', 'sdmsid', 'sdms', 'sdmcode', 'sdm', 'studentcode'].includes(k))) return true;
  if (keys.some((k) => ['gender', 'district', 'fathername', 'mothername', 'age'].includes(k))) return true;
  const code = readObjectRowByAliases(r, ['Code', 'SDMS ID', 'SDMS', 'SDM Code', 'SDM']);
  return cellLooksLikeRegistrationId(code);
}

function objectRowLooksLikeRichRosterData(r) {
  if (!objectRowHasNoNamesKeys(r) || isLikelyNoNamesHeaderRow(r)) return false;
  return objectRowHasRichRosterKeys(r);
}

const RICH_ROSTER_CODE_ALIASES = ['Code', 'SDMS ID', 'SDMS', 'SDM Code', 'SDM', 'Student Code'];
const RICH_ROSTER_NAME_ALIASES = ['Names', 'NAMES', 'Name', 'Student Name', 'Full Name'];
const RICH_ROSTER_GENDER_ALIASES = ['Gender', 'Sex', 'Igitsina'];
const RICH_ROSTER_AGE_ALIASES = ['Age', 'AGE'];
const RICH_ROSTER_BIRTH_ALIASES = ['Birth Year', 'BirthYear', 'Year Of Birth', 'DOB Year'];
const RICH_ROSTER_FATHER_NAME_ALIASES = ['Father Name', 'FatherName', 'Father Full Name', 'Father'];
const RICH_ROSTER_MOTHER_NAME_ALIASES = ['Mother Name', 'MotherName', 'Mother Full Name', 'Mother'];
const RICH_ROSTER_FATHER_PHONE_ALIASES = ['Father Phone', 'Father Tel', 'FatherPhone', 'Father Tel.'];
const RICH_ROSTER_MOTHER_PHONE_ALIASES = ['Mother Phone', 'Mother Tel', 'MotherPhone', 'Mother Tel.'];
const RICH_ROSTER_STUDENT_ID_ALIASES = ['Student ID', 'StudentID', 'Student Id', 'School ID', 'Official ID'];
const RICH_ROSTER_PHOTO_ALIASES = ['Photo', 'Photo URL', 'Photo Url', 'Image', 'Picture', 'photo', 'Photo File'];

const IMPORT_PHOTO_EXTS = new Set(['.jpg', '.jpeg', '.png', '.webp']);

function extractImportPhotosZip(zipPath) {
  const dest = path.join(TEMP_DIR, `import-photos-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`);
  fs.mkdirSync(dest, { recursive: true });
  try {
    if (process.platform === 'win32') {
      const zp = zipPath.replace(/'/g, "''");
      const dp = dest.replace(/'/g, "''");
      execSync(
        `powershell -NoProfile -Command "Expand-Archive -LiteralPath '${zp}' -DestinationPath '${dp}' -Force"`,
        { stdio: 'pipe' },
      );
    } else {
      execSync(`unzip -o -q ${JSON.stringify(zipPath)} -d ${JSON.stringify(dest)}`, { stdio: 'pipe' });
    }
  } catch (err) {
    fs.rmSync(dest, { recursive: true, force: true });
    throw new Error('Could not extract photos ZIP. Use a standard .zip or put photo URLs in the Excel.');
  }
  return dest;
}

function buildImportPhotoIndex(rootDir) {
  const map = new Map();
  const visit = (dir) => {
    let entries;
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const ent of entries) {
      const p = path.join(dir, ent.name);
      if (ent.isDirectory()) { visit(p); continue; }
      const ext = path.extname(ent.name).toLowerCase();
      if (!IMPORT_PHOTO_EXTS.has(ext)) continue;
      const stem = path.basename(ent.name, ext).replace(/\s+/g, '');
      if (!stem) continue;
      map.set(stem, p);
      const digits = normalizeStudentId(stem);
      if (digits) map.set(digits, p);
    }
  };
  visit(rootDir);
  return map;
}

async function storeImportPhotoFile(sourcePath) {
  return optimizeStudentPortraitFile(sourcePath, STUDENT_PHOTO_DIR);
}

async function downloadImportPhotoFromUrl(urlRaw) {
  const url = trimStr(urlRaw);
  if (!/^https?:\/\//i.test(url)) return null;
  const res = await axios.get(url, {
    responseType: 'arraybuffer',
    timeout: 20000,
    maxContentLength: 12 * 1024 * 1024,
  });
  const outBuffer = await optimizeStudentPortraitBuffer(Buffer.from(res.data));
  const filename = `student-${Date.now()}-${crypto.randomBytes(8).toString('hex')}.jpg`;
  fs.writeFileSync(path.join(STUDENT_PHOTO_DIR, filename), outBuffer);
  return filename;
}

async function resolveImportStudentPhoto({ photoRaw, sdmCode, studentUid, photoIndex }) {
  const keys = [];
  const raw = trimStr(photoRaw);
  if (raw) {
    if (/^https?:\/\//i.test(raw)) {
      try { return await downloadImportPhotoFromUrl(raw); } catch { return null; }
    }
    const stem = path.basename(raw, path.extname(raw)).replace(/\s+/g, '');
    keys.push(stem, normalizeStudentId(stem));
  }
  if (sdmCode) keys.push(String(sdmCode), normalizeStudentId(sdmCode));
  if (studentUid) keys.push(String(studentUid), normalizeStudentId(studentUid));
  for (const k of keys) {
    if (!k) continue;
    const hit = photoIndex?.get(k);
    if (hit && fs.existsSync(hit)) return await storeImportPhotoFile(hit);
  }
  return null;
}

function parseRichRosterFieldsFromValues(values) {
  const {
    fullName, codeRaw, studentIdRaw, photoRaw, genderRaw, ageRaw, birthYearRaw,
    provinceRaw, districtRaw, sectorRaw, cellRaw, villageRaw,
    fatherName, motherName, fatherPhoneRaw, motherPhoneRaw,
  } = values;

  const { first_name, last_name } = splitFullNameForStudentImport(fullName);
  const sdm_code = externalRegistrationIdForSdm(codeRaw) || null;
  const gender = genderRaw ? normalizeGender(genderRaw) : null;
  const birth_year = normalizeBirthYearValue(birthYearRaw) || normalizeAgeToBirthYear(ageRaw);

  const province = normalizeProvinceLabel(cleanLocationToken(provinceRaw));
  const district = cleanLocationToken(districtRaw);
  const sector = cleanLocationToken(sectorRaw);
  const cell = cleanLocationToken(cellRaw);
  const village = cleanLocationToken(villageRaw);

  const locationMissing = [];
  if (!province) locationMissing.push('Province');
  if (!district) locationMissing.push('District');
  if (!sector) locationMissing.push('Sector');
  if (!cell) locationMissing.push('Cell');
  if (!village) locationMissing.push('Village');

  const hasManyDigits = (v) => String(v || '').replace(/\D/g, '').length >= 6;
  let father_phone = normalizePhone(fatherPhoneRaw);
  let mother_phone = normalizePhone(motherPhoneRaw);
  const phoneWarnings = { count: 0 };
  if (fatherPhoneRaw && !father_phone && hasManyDigits(fatherPhoneRaw)) { phoneWarnings.count += 1; father_phone = null; }
  if (motherPhoneRaw && !mother_phone && hasManyDigits(motherPhoneRaw)) { phoneWarnings.count += 1; mother_phone = null; }

  const preferred_student_uid = normalizeStudentId(studentIdRaw) || null;

  return {
    first_name,
    last_name,
    sdm_code,
    preferred_student_uid,
    photo_raw: trimStr(photoRaw) || null,
    gender,
    birth_year,
    province,
    district,
    sector,
    cell,
    village,
    father_full_name: trimStr(fatherName) || null,
    father_phone,
    mother_full_name: trimStr(motherName) || null,
    mother_phone,
    import_missing_fields: JSON.stringify(locationMissing),
    phoneWarnings: phoneWarnings.count,
  };
}

function parseRichRosterObjectRow(r) {
  return parseRichRosterFieldsFromValues({
    fullName: readNoNamesObjectRowName(r) || readObjectRowByAliases(r, RICH_ROSTER_NAME_ALIASES),
    codeRaw: readObjectRowByAliases(r, RICH_ROSTER_CODE_ALIASES),
    studentIdRaw: readObjectRowByAliases(r, RICH_ROSTER_STUDENT_ID_ALIASES),
    photoRaw: readObjectRowByAliases(r, RICH_ROSTER_PHOTO_ALIASES),
    genderRaw: readObjectRowByAliases(r, RICH_ROSTER_GENDER_ALIASES),
    ageRaw: readObjectRowByAliases(r, RICH_ROSTER_AGE_ALIASES),
    birthYearRaw: readObjectRowByAliases(r, RICH_ROSTER_BIRTH_ALIASES),
    provinceRaw: readObjectRowByAliases(r, ['Province', 'Intara']),
    districtRaw: readObjectRowByAliases(r, ['District', 'Akarere']),
    sectorRaw: readObjectRowByAliases(r, ['Sector', 'Umurenge']),
    cellRaw: readObjectRowByAliases(r, ['Cell', 'Akagari']),
    villageRaw: readObjectRowByAliases(r, ['Village', 'Umudugudu']),
    fatherName: readObjectRowByAliases(r, RICH_ROSTER_FATHER_NAME_ALIASES),
    motherName: readObjectRowByAliases(r, RICH_ROSTER_MOTHER_NAME_ALIASES),
    fatherPhoneRaw: readObjectRowByAliases(r, RICH_ROSTER_FATHER_PHONE_ALIASES),
    motherPhoneRaw: readObjectRowByAliases(r, RICH_ROSTER_MOTHER_PHONE_ALIASES),
  });
}

function parseRichRosterArrayRow(row, headerCells) {
  return parseRichRosterFieldsFromValues({
    fullName: stripLeadingNoiseFromNameText(readFromRowByAliases(row, headerCells, RICH_ROSTER_NAME_ALIASES)),
    codeRaw: readFromRowByAliases(row, headerCells, RICH_ROSTER_CODE_ALIASES),
    studentIdRaw: readFromRowByAliases(row, headerCells, RICH_ROSTER_STUDENT_ID_ALIASES),
    photoRaw: readFromRowByAliases(row, headerCells, RICH_ROSTER_PHOTO_ALIASES),
    genderRaw: readFromRowByAliases(row, headerCells, RICH_ROSTER_GENDER_ALIASES),
    ageRaw: readFromRowByAliases(row, headerCells, RICH_ROSTER_AGE_ALIASES),
    birthYearRaw: readFromRowByAliases(row, headerCells, RICH_ROSTER_BIRTH_ALIASES),
    provinceRaw: readFromRowByAliases(row, headerCells, ['Province', 'Intara']),
    districtRaw: readFromRowByAliases(row, headerCells, ['District', 'Akarere']),
    sectorRaw: readFromRowByAliases(row, headerCells, ['Sector', 'Umurenge']),
    cellRaw: readFromRowByAliases(row, headerCells, ['Cell', 'Akagari']),
    villageRaw: readFromRowByAliases(row, headerCells, ['Village', 'Umudugudu']),
    fatherName: readFromRowByAliases(row, headerCells, RICH_ROSTER_FATHER_NAME_ALIASES),
    motherName: readFromRowByAliases(row, headerCells, RICH_ROSTER_MOTHER_NAME_ALIASES),
    fatherPhoneRaw: readFromRowByAliases(row, headerCells, RICH_ROSTER_FATHER_PHONE_ALIASES),
    motherPhoneRaw: readFromRowByAliases(row, headerCells, RICH_ROSTER_MOTHER_PHONE_ALIASES),
  });
}

/** True when a cell is a 9–15 digit registration id (not a person's name). */
function cellLooksLikeRegistrationId(val) {
  const s = normalizeStudentId(val);
  if (!isValidStudentId(s)) return false;
  if (digitStringLooksLikeRwandaPhone(s)) return false;
  return true;
}

/** True when a cell is a small row ordinal (NO / # column), not part of a name. */
function cellLooksLikeRowOrdinal(val) {
  const s = trimStr(val);
  if (!/^\d{1,5}$/.test(s)) return false;
  const n = Number(s);
  return Number.isInteger(n) && n > 0 && n < 100000;
}

/** Remove leading SDMS ids and row ordinals accidentally pasted into a name cell. */
function stripLeadingNoiseFromNameText(full) {
  const s = trimStr(full).replace(/\s+/g, ' ');
  if (!s) return '';
  const parts = s.split(' ').filter(Boolean);
  while (parts.length) {
    const first = parts[0];
    if (cellLooksLikeRegistrationId(first) || cellLooksLikeRowOrdinal(first)) {
      parts.shift();
      continue;
    }
    break;
  }
  return parts.join(' ');
}

/** @deprecated alias */
function stripLeadingRegistrationIdsFromNameText(full) {
  return stripLeadingNoiseFromNameText(full);
}

/**
 * When a row has both official Student ID and SDMS ID before names, skip the extra id column.
 * e.g. # | 230010001 | 130713220035 | AGANWA | Angela
 */
function resolveImportNameColumnOffset(row, base) {
  const afterId = trimStr(row?.[base + 1]);
  const afterThat = trimStr(row?.[base + 2]);
  if (!cellLooksLikeRegistrationId(afterId)) return 1;
  if (afterThat && !cellLooksLikeRegistrationId(afterThat) && /[A-Za-z]/.test(afterThat)) return 2;
  if (afterThat && cellLooksLikeRegistrationId(afterThat)) return 2;
  return 1;
}

function cleanImportedStudentNames(first_name, last_name, fullName) {
  let fn = trimStr(first_name);
  let ln = trimStr(last_name);
  const full = stripLeadingNoiseFromNameText(fullName);

  if (cellLooksLikeRegistrationId(fn) || cellLooksLikeRowOrdinal(fn)) fn = '';
  if (cellLooksLikeRegistrationId(ln) || cellLooksLikeRowOrdinal(ln)) ln = '';

  if (full) {
    const sp = splitFullNameForStudentImport(full);
    if (!fn) fn = sp.first_name;
    if (!ln) ln = sp.last_name;
  }

  if (fn && !ln) {
    const sp = splitFullNameForStudentImport(fn);
    fn = sp.first_name;
    ln = sp.last_name;
  }

  if (
    fn && ln
    && trimStr(fn) === trimStr(ln)
    && /\s/.test(trimStr(fn))
  ) {
    const sp = splitFullNameForStudentImport(fn);
    fn = sp.first_name;
    ln = sp.last_name;
  }

  return { first_name: fn, last_name: ln };
}

/**
 * Single cell with full display name → first + last without duplicating in "First Last" UI.
 * Given names = all tokens except the last; last token = family name (common in Rwanda lists).
 */
function splitFullNameForStudentImport(full) {
  const s = stripLeadingNoiseFromNameText(full);
  if (!s) return { first_name: '', last_name: '' };
  const parts = s.split(' ').filter(Boolean);
  if (parts.length === 1) {
    return { first_name: parts[0], last_name: '-' };
  }
  return {
    first_name: parts.slice(0, -1).join(' '),
    last_name: parts[parts.length - 1],
  };
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
    'firstname', 'lastname', 'studentid', 'registrationnumber', 'name', 'names', 'code',
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
    if (!isValidStudentId(c)) continue;
    if (digitStringLooksLikeRwandaPhone(c)) continue;
    uid = c;
    break;
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

// ── Official internal UID: DD + SSS + NNNN (9 digits) ──
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
    `SELECT COALESCE(MAX(
      CASE
        WHEN student_code REGEXP '^[0-9]{2}/[0-9]{3}/[0-9]{4}$'
          THEN CAST(SUBSTRING_INDEX(student_code, '/', -1) AS UNSIGNED)
        WHEN student_code REGEXP '^[0-9]{9}$'
          THEN CAST(RIGHT(student_code, 4) AS UNSIGNED)
        ELSE 0
      END
    ), 0) AS m
     FROM students WHERE school_id = ?`,
    [schoolId]
  );
  const seq = (Number(row?.m) || 0) + 1;
  if (seq > 9999) throw new Error('Student sequence limit (9999) reached for this school');
  return formatStudentUid(dCode, sNum, seq);
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
    `SELECT COALESCE(MAX(
      CASE
        WHEN student_code REGEXP '^[0-9]{2}/[0-9]{3}/[0-9]{4}$'
          THEN CAST(SUBSTRING_INDEX(student_code, '/', -1) AS UNSIGNED)
        WHEN student_code REGEXP '^[0-9]{9}$'
          THEN CAST(RIGHT(student_code, 4) AS UNSIGNED)
        ELSE 0
      END
    ), 0) AS m
     FROM students WHERE school_id = ?`,
    [schoolId]
  );
  let seq = Number(row?.m || 0);
  return () => {
    seq += 1;
    if (seq > 9999) throw new Error('Student sequence limit exceeded');
    return formatStudentUid(dCode, sNum, seq);
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
  await promisePool.query('ALTER TABLE students ADD COLUMN discipline_marks DECIMAL(8,2) NULL').catch(() => {});
  await promisePool.query('ALTER TABLE students ADD COLUMN student_photo VARCHAR(255) NULL').catch(() => {});
  await promisePool.query('ALTER TABLE students ADD COLUMN rfid_uid VARCHAR(64) NULL').catch(() => {});
  await promisePool.query('ALTER TABLE students ADD COLUMN fingerprint_id VARCHAR(128) NULL').catch(() => {});
  await promisePool.query('ALTER TABLE students ADD COLUMN identity_remarks TEXT NULL').catch(() => {});
  await promisePool.query('ALTER TABLE students ADD COLUMN father_national_id VARCHAR(64) NULL').catch(() => {});
  await promisePool.query('ALTER TABLE students ADD COLUMN mother_national_id VARCHAR(64) NULL').catch(() => {});
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
    const schoolId = resolveEffectiveSchoolId(req);
    if (!schoolId) {
      const needParam = ELEVATED_SCHOOL_SCOPERS.includes(requesterRoleUpper(req)) && !resolveSchoolId(req);
      return res.status(400).json({
        success: false,
        message: needParam ? 'school_id is required (query or X-Babyeyi-School-Id header).' : 'School not found in session.',
      });
    }

    const q = trimStr(req.query.q || '');
    const { page, limit, offset } = parsePagination(req);
    const paginationEnabled = String(req.query.paginate || 'true').toLowerCase() !== 'false';

    const classFilter = trimStr(req.query.class_name || req.query.class || '');
    const yearFilter = trimStr(req.query.academic_year || req.query.year || '');

    if (yearFilter) {
      await ensureStudentYearEnrollmentsTable();
      await backfillSchoolEnrollments(schoolId);
    }

    const yearScope = enrollmentYearFilter(yearFilter, 'ey', 's');
    const fromClause = yearFilter ? `FROM students s ${yearScope.join}` : 'FROM students s';
    const schoolWhere = `WHERE s.school_id = ?${yearScope.where}`;

    let sql = `
      SELECT s.id, s.student_uid, s.student_code, s.school_id, s.first_name, s.last_name, s.gender, s.birth_year,
             s.nationality, s.province, s.district, s.sector, s.cell, s.village,
             ${yearFilter ? `${yearScope.classCol} AS class_name, COALESCE(NULLIF(TRIM(ey.academic_year), ''), s.academic_year) AS academic_year` : 's.class_name, s.academic_year'},
             ${yearFilter ? enrollmentClassSelect('ey') + ',' : ''}
             s.sdm_code, s.discipline_marks,
             s.student_photo, s.rfid_uid, s.fingerprint_id, s.identity_remarks,
             s.father_full_name, s.father_phone, s.father_email, s.father_national_id,
             s.mother_full_name, s.mother_phone, s.mother_email, s.mother_national_id,
             s.import_missing_fields, s.source_row_json, s.created_at, s.updated_at
      ${fromClause}
      ${schoolWhere}
    `;
    let countSql = `SELECT COUNT(*) AS total ${fromClause} ${schoolWhere}`;
    const params = [schoolId, ...yearScope.params];
    const countParams = [schoolId, ...yearScope.params];

    if (q) {
      const whereSearch = ` AND (s.student_uid LIKE ? OR s.student_code LIKE ? OR s.sdm_code LIKE ? OR s.first_name LIKE ? OR s.last_name LIKE ? OR CONCAT(s.first_name,' ',s.last_name) LIKE ?)`;
      sql += whereSearch;
      countSql += whereSearch;
      const like = `%${q}%`;
      params.push(like, like, like, like, like, like);
      countParams.push(like, like, like, like, like, like);
    }

    if (classFilter) {
      const classCol = yearFilter ? yearScope.classCol : 's.class_name';
      sql += ` AND TRIM(COALESCE(${classCol}, '')) = ?`;
      countSql += ` AND TRIM(COALESCE(${classCol}, '')) = ?`;
      params.push(classFilter);
      countParams.push(classFilter);
    }

    sql += ' ORDER BY s.student_uid ASC, s.created_at DESC';
    if (paginationEnabled) { sql += ' LIMIT ? OFFSET ?'; params.push(limit, offset); }

    const [rows] = await promisePool.query(sql, params);
    const [[countRow]] = await promisePool.query(countSql, countParams);
    const total = Number(countRow?.total || rows.length || 0);

    const withPhotoUrl = (rows || []).map((r) => ({
      ...r,
      class_name: r.roster_class_name || r.class_name,
      academic_year: r.roster_academic_year || r.academic_year,
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
// GET /api/students/registry-stats — gender totals + class list (filtered by q/year)
// Optional class_name narrows gender counts to one class (TRIM match).
// ════════════════════════════════════════════════════════════════
router.get('/students/registry-stats', requireRole(STUDENT_LIST_ROLES), async (req, res) => {
  try {
    await ensureStudentsTable();
    const schoolId = resolveEffectiveSchoolId(req);
    if (!schoolId) {
      const needParam = ELEVATED_SCHOOL_SCOPERS.includes(requesterRoleUpper(req)) && !resolveSchoolId(req);
      return res.status(400).json({
        success: false,
        message: needParam ? 'school_id is required (query or X-Babyeyi-School-Id header).' : 'School not found in session.',
      });
    }

    const q = trimStr(req.query.q || '');
    const yearFilter = trimStr(req.query.academic_year || req.query.year || '');
    const classFilter = trimStr(req.query.class_name || req.query.class || '');

    if (yearFilter) {
      await ensureStudentYearEnrollmentsTable();
      await backfillSchoolEnrollments(schoolId);
    }

    const yearScope = enrollmentYearFilter(yearFilter, 'ey', 's');
    const fromStudents = yearFilter ? `students s ${yearScope.join}` : 'students s';
    const params = [schoolId, ...yearScope.params];
    let where = `s.school_id = ?${yearScope.where}`;
    if (q) {
      where +=
        ` AND (s.student_uid LIKE ? OR s.student_code LIKE ? OR s.sdm_code LIKE ? OR s.first_name LIKE ? OR s.last_name LIKE ? OR CONCAT(s.first_name,' ',s.last_name) LIKE ?)`;
      const like = `%${q}%`;
      params.push(like, like, like, like, like, like);
    }

    const classCol = yearFilter ? yearScope.classCol : 's.class_name';
    const classListSql =
      `SELECT TRIM(${classCol}) AS class_name, COUNT(*) AS cnt FROM ${fromStudents} WHERE ${where}` +
      ` AND TRIM(COALESCE(${classCol}, '')) <> '' GROUP BY TRIM(${classCol}) ORDER BY TRIM(${classCol})`;

    let genderWhere = where;
    const genderParams = [...params];
    if (classFilter) {
      genderWhere += ` AND TRIM(COALESCE(${classCol}, '')) = ?`;
      genderParams.push(classFilter);
    }

    const genderSql =
      `SELECT COUNT(*) AS total,` +
      ` SUM(CASE WHEN s.gender = 'Male' THEN 1 ELSE 0 END) AS male,` +
      ` SUM(CASE WHEN s.gender = 'Female' THEN 1 ELSE 0 END) AS female,` +
      ` SUM(CASE WHEN s.gender IS NULL OR s.gender NOT IN ('Male','Female') THEN 1 ELSE 0 END) AS unspecified` +
      ` FROM ${fromStudents} WHERE ${genderWhere}`;

    const [[wholeRow]] = await promisePool.query(
      `SELECT COUNT(*) AS t FROM ${fromStudents} WHERE ${where}`,
      params
    );
    const [classRows] = await promisePool.query(classListSql, params);
    const [[genderRow]] = await promisePool.query(genderSql, genderParams);

    await ensureStudentYearEnrollmentsTable();
    const [yearRows] = await promisePool.query(
      `SELECT DISTINCT TRIM(academic_year) AS academic_year
       FROM (
         SELECT TRIM(academic_year) AS academic_year FROM student_year_enrollments WHERE school_id = ?
         UNION
         SELECT TRIM(academic_year) AS academic_year FROM students WHERE school_id = ?
       ) yrs
       WHERE TRIM(COALESCE(academic_year, '')) <> ''
       ORDER BY academic_year DESC`,
      [schoolId, schoolId]
    );

    let currentAcademicYear = yearFilter || '';
    if (!currentAcademicYear) {
      const [[settingsRow]] = await promisePool
        .query(
          `SELECT current_academic_year FROM school_academic_settings WHERE school_id = ? LIMIT 1`,
          [schoolId]
        )
        .catch(() => [[null]]);
      currentAcademicYear = trimStr(settingsRow?.current_academic_year) || '';
    }

    const academicYears = (yearRows || [])
      .map((r) => trimStr(r.academic_year))
      .filter(Boolean);
    if (currentAcademicYear && !academicYears.includes(currentAcademicYear)) {
      academicYears.unshift(currentAcademicYear);
    }

    return res.json({
      success: true,
      total: Number(genderRow?.total ?? 0),
      rosterAllClasses: Number(wholeRow?.t ?? 0),
      male: Number(genderRow?.male ?? 0),
      female: Number(genderRow?.female ?? 0),
      unspecified: Number(genderRow?.unspecified ?? 0),
      classes: (classRows || []).map((r) => ({
        class_name: trimStr(r.class_name),
        count: Number(r.cnt ?? 0),
      })),
      academic_years: academicYears,
      current_academic_year: currentAcademicYear,
    });
  } catch (err) {
    console.error('GET /api/students/registry-stats error:', err);
    return res.status(500).json({ success: false, message: 'Failed to load registry stats' });
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

    const body = req.body || {};
    const rawBodyUid = body.student_uid !== undefined && body.student_uid !== null ? trimStr(body.student_uid) : null;
    const studentUid = rawBodyUid !== null && rawBodyUid !== ''
      ? rawBodyUid
      : existing.student_uid;

    if (rawBodyUid !== null && rawBodyUid !== '') {
      const [[schoolRowPut]] = await promisePool.query(
        'SELECT district, school_code FROM schools WHERE id = ? AND deleted_at IS NULL LIMIT 1',
        [schoolId]
      );
      if (!shouldTrustImportedStudentUid(studentUid, schoolRowPut?.district, schoolRowPut?.school_code)) {
        return res.status(400).json({
          success: false,
          message:
            'Student ID must be this school\'s official 9-digit code (district + school + sequence). Do not use phone numbers.',
        });
      }
    }

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
    const studentCodeVal = cur?.student_code || formattedStudentCodeFromUid(studentUid);

    const cls = 'class_name' in body || 'className' in body || 'stream' in body || 'class' in body
      ? resolveClassNameFromBody(body)
      : cur?.class_name ?? null;
    const ay = 'academic_year' in body || 'academicYear' in body
      ? trimStr(body.academic_year || body.academicYear) || null
      : cur?.academic_year ?? null;
    const sdm = 'sdm_code' in body || 'sdmCode' in body
      ? trimStr(body.sdm_code || body.sdmCode) || null
      : cur?.sdm_code ?? null;

    await promisePool.query(
      `UPDATE students SET student_uid=?, student_code=?, first_name=?, last_name=?, gender=?, birth_year=?,
       nationality=?, province=?, district=?, sector=?, cell=?, village=?,
       class_name=?, academic_year=?, sdm_code=?,
       father_full_name=?, father_phone=?, father_email=?, father_national_id=?,
       mother_full_name=?, mother_phone=?, mother_email=?, mother_national_id=?, updated_at=NOW()
       WHERE id=? AND school_id=?`,
      [
        studentUid, studentCodeVal, trimStr(body.first_name), trimStr(body.last_name), gender, year,
        body.nationality || 'Rwandan', body.province, body.district, body.sector, body.cell, body.village,
        cls, ay, sdm,
        body.father_full_name || null, fatherPhone, body.father_email || null,
        optionalNationalId(body.father_national_id ?? body.fatherNationalId ?? body.FatherNational_ID),
        body.mother_full_name || null, motherPhone, body.mother_email || null,
        optionalNationalId(body.mother_national_id ?? body.motherNationalId ?? body.MotherNational_ID),
        studentId, schoolId,
      ]
    );
    if (ay) {
      await syncEnrollmentFromStudent(promisePool, {
        schoolId,
        studentId,
        academicYear: ay,
        className: cls,
      }).catch(() => {});
    }
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
  requireRole(STUDENT_IDENTITY_ROLES),
  (req, res, next) => studentPhotoUpload.single('photo')(req, res, (err) => {
    if (err) return res.status(400).json({ success: false, message: err.message || 'Photo upload failed' });
    next();
  }),
  async (req, res) => {
    try {
      await ensureStudentsTable();
      const schoolId = resolveEffectiveSchoolId(req);
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

      const old = existing.student_photo ? String(existing.student_photo) : '';
      const filename = await replaceUploadWithOptimizedPortrait(req.file.path, STUDENT_PHOTO_DIR);
      await promisePool.query(
        'UPDATE students SET student_photo = ?, updated_at = NOW() WHERE id = ? AND school_id = ?',
        [filename, studentId, schoolId]
      );

      if (old && old !== filename && /^[a-zA-Z0-9._-]+$/.test(old)) {
        fs.unlink(path.join(STUDENT_PHOTO_DIR, old), () => {});
      }

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
// PUT /api/students/:id/identity  — partial RFID / fingerprint / remarks (Smart Access, HR, etc.)
// Any omitted field keeps its current DB value; explicit null clears a credential.
// ════════════════════════════════════════════════════════════════
function coalesceIdentityToken(body, currentVal, snake, camel) {
  const hasSnake = Object.prototype.hasOwnProperty.call(body, snake);
  const hasCamel = Object.prototype.hasOwnProperty.call(body, camel);
  if (!hasSnake && !hasCamel) return currentVal;
  const raw = hasSnake ? body[snake] : body[camel];
  if (raw === null || raw === undefined) return null;
  const t = trimStr(raw);
  return t === '' ? null : t;
}

router.put('/students/:id/identity', requireRole(STUDENT_IDENTITY_ROLES), async (req, res) => {
  try {
    await ensureStudentsTable();
    const schoolId = resolveEffectiveSchoolId(req);
    const studentId = Number(req.params.id);
    if (!schoolId || Number.isNaN(studentId)) {
      return res.status(400).json({ success: false, message: 'Invalid request' });
    }

    const body = req.body || {};

    const [[current]] = await promisePool.query(
      'SELECT id, rfid_uid, fingerprint_id, identity_remarks, student_photo FROM students WHERE id = ? AND school_id = ? LIMIT 1',
      [studentId, schoolId]
    );
    if (!current) return res.status(404).json({ success: false, message: 'Student not found' });

    const nextRfid = coalesceIdentityToken(body, current.rfid_uid, 'rfid_uid', 'rfidUid');
    const nextFp = coalesceIdentityToken(body, current.fingerprint_id, 'fingerprint_id', 'fingerprintId');
    const nextRemarks = coalesceIdentityToken(body, current.identity_remarks, 'identity_remarks', 'identityRemarks');

    if (nextRfid) {
      const [[dupRfid]] = await promisePool.query(
        'SELECT id FROM students WHERE school_id = ? AND rfid_uid = ? AND id != ? LIMIT 1',
        [schoolId, nextRfid, studentId]
      );
      if (dupRfid) {
        return res.status(409).json({
          success: false,
          code: 'RFID_DUPLICATE',
          message: `This card (${nextRfid}) is already assigned to another learner. Open that student and clear the card, or use a different card.`,
        });
      }
    }
    if (nextFp) {
      const [[dupFp]] = await promisePool.query(
        'SELECT id FROM students WHERE school_id = ? AND fingerprint_id = ? AND id != ? LIMIT 1',
        [schoolId, nextFp, studentId]
      );
      if (dupFp) {
        return res.status(409).json({
          success: false,
          code: 'FINGERPRINT_DUPLICATE',
          message: `This fingerprint ID (${nextFp}) is already assigned to another learner. Clear it on that student first, or use a new ID.`,
        });
      }
    }

    await promisePool.query(
      'UPDATE students SET rfid_uid = ?, fingerprint_id = ?, identity_remarks = ?, updated_at = NOW() WHERE id = ? AND school_id = ?',
      [nextRfid, nextFp, nextRemarks, studentId, schoolId]
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
      `SELECT student_uid, student_code, first_name, last_name, gender, birth_year, nationality,
              province, district, sector, cell, village,
              class_name, academic_year, sdm_code,
              father_full_name, father_phone, father_email, father_national_id,
              mother_full_name, mother_phone, mother_email, mother_national_id, created_at
       FROM students WHERE school_id = ? ORDER BY created_at DESC`,
      [schoolId]
    );

    const data = rows.map((r) => ({
      StudentID: r.student_uid,
      OfficialStudentCode: r.student_code || '',
      FirstName: r.first_name, LastName: r.last_name,
      Gender: r.gender, BirthYear: r.birth_year, Nationality: r.nationality,
      ClassName: r.class_name || '', AcademicYear: r.academic_year || '', SDMCode: r.sdm_code || '',
      Province: r.province, District: r.district, Sector: r.sector, Cell: r.cell, Village: r.village,
      FatherName: r.father_full_name || '', FatherPhone: r.father_phone || '', FatherEmail: r.father_email || '',
      FatherNational_ID: r.father_national_id || '',
      MotherName: r.mother_full_name || '', MotherPhone: r.mother_phone || '', MotherEmail: r.mother_email || '',
      MotherNational_ID: r.mother_national_id || '',
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
      `SELECT student_uid, first_name, last_name, gender, birth_year, district, sector, village
       FROM students WHERE school_id = ? ORDER BY created_at DESC`,
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
      doc.fontSize(10).text(
        `${idx + 1}. ${r.student_uid} - ${r.first_name} ${r.last_name} | ${r.gender || '-'} | ${r.birth_year || '-'} | ${r.village}, ${r.sector}, ${r.district}`
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
      academic_year, academicYear,
      sdm_code, sdmCode,
      father_full_name, father_phone, father_email, father_national_id, fatherNationalId, FatherNational_ID,
      mother_full_name, mother_phone, mother_email, mother_national_id, motherNationalId, MotherNational_ID,
    } = req.body || {};
    const fatherNationalIdVal = optionalNationalId(
      father_national_id ?? fatherNationalId ?? FatherNational_ID
    );
    const motherNationalIdVal = optionalNationalId(
      mother_national_id ?? motherNationalId ?? MotherNational_ID
    );
    const classNameVal = resolveClassNameFromBody(req.body);
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

    const [[schoolRow]] = await promisePool.query(
      'SELECT district, school_code FROM schools WHERE id = ? AND deleted_at IS NULL LIMIT 1',
      [schoolId]
    );

    const rawUid = trimStr(student_uid);
    const useAuto = autoId === true || autoId === 'true' || !rawUid;

    let uid;
    if (useAuto) {
      uid = await generateStudentUID(schoolId);
    } else if (shouldTrustImportedStudentUid(rawUid, schoolRow?.district, schoolRow?.school_code)) {
      uid = rawUid;
    } else {
      return res.status(400).json({
        success: false,
        message:
          'Student ID must be this school\'s official 9-digit code (district + school + sequence), or enable auto-generate. Do not use phone numbers.',
      });
    }

    const officialCode = formattedStudentCodeFromUid(uid);

    const [[dup]] = await promisePool.query(
      'SELECT id FROM students WHERE student_uid = ? AND school_id = ? LIMIT 1',
      [uid, schoolId]
    );
    if (dup) return res.status(409).json({ success: false, message: `Student ID "${uid}" already exists for this school` });

    const [result] = await promisePool.query(
      `INSERT INTO students (student_uid, student_code, school_id, first_name, last_name, gender, birth_year, nationality,
         province, district, sector, cell, village,
         class_name, academic_year, sdm_code,
         father_full_name, father_phone, father_email, father_national_id,
         mother_full_name, mother_phone, mother_email, mother_national_id)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        uid, officialCode, schoolId, trimStr(first_name), trimStr(last_name), normalizedGender, year,
        nationality || 'Rwandan', province, district, sector, cell, village,
        classNameVal, academicYearVal, sdmCodeVal,
        father_full_name || null, fPhone, father_email || null, fatherNationalIdVal,
        mother_full_name || null, mPhone, mother_email || null, motherNationalIdVal,
      ]
    );
    if (academicYearVal) {
      await syncEnrollmentFromStudent(promisePool, {
        schoolId,
        studentId: result.insertId,
        academicYear: academicYearVal,
        className: classNameVal,
      }).catch(() => {});
    }
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
  excelUpload.fields([{ name: 'file', maxCount: 1 }, { name: 'photos_zip', maxCount: 1 }]),
  async (req, res) => {
    await ensureStudentsTable();
    const schoolId = resolveSchoolId(req);
    if (!schoolId) return res.status(400).json({ success: false, message: 'School not found in session.' });
    const excelFile = req.files?.file?.[0];
    const zipFile = req.files?.photos_zip?.[0];
    if (!excelFile?.path) return res.status(400).json({ success: false, message: 'Excel file is required' });

    let photoExtractDir = null;
    let photoIndex = new Map();

    try {
      if (zipFile?.path) {
        photoExtractDir = extractImportPhotosZip(zipFile.path);
        photoIndex = buildImportPhotoIndex(photoExtractDir);
      }

      // ── 1. Parse workbook ──────────────────────────────────────
      const workbook = xlsx.readFile(excelFile.path);

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

      const defaultClass = resolveClassNameFromBody(req.body);
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

      const nurseryNamesHeaderIdx = findNurseryNamesListHeaderIndex(objectRows);
      const noNamesHeaderIdx = findNoNamesListHeaderIndex(objectRows);
      const noNamesDataStartIdx = findNoNamesDataStartIndex(objectRows);

      const readSimpleListImportExtras = (sourceRow, headerCells) => {
        if (!sourceRow) {
          return { photo_raw: null, preferred_student_uid: null, sdm_code: null };
        }
        if (headerCells && Array.isArray(sourceRow)) {
          return {
            photo_raw: trimStr(readFromRowByAliases(sourceRow, headerCells, RICH_ROSTER_PHOTO_ALIASES)) || null,
            preferred_student_uid: normalizeStudentId(
              readFromRowByAliases(sourceRow, headerCells, RICH_ROSTER_STUDENT_ID_ALIASES),
            ) || null,
            sdm_code: externalRegistrationIdForSdm(
              readFromRowByAliases(sourceRow, headerCells, RICH_ROSTER_CODE_ALIASES),
            ) || null,
          };
        }
        if (sourceRow && typeof sourceRow === 'object' && !Array.isArray(sourceRow)) {
          return {
            photo_raw: trimStr(readObjectRowByAliases(sourceRow, RICH_ROSTER_PHOTO_ALIASES)) || null,
            preferred_student_uid: normalizeStudentId(
              readObjectRowByAliases(sourceRow, RICH_ROSTER_STUDENT_ID_ALIASES),
            ) || null,
            sdm_code: externalRegistrationIdForSdm(
              readObjectRowByAliases(sourceRow, RICH_ROSTER_CODE_ALIASES),
            ) || null,
          };
        }
        return { photo_raw: null, preferred_student_uid: null, sdm_code: null };
      };

      const appendSimpleNameListRow = (fullName, sourceRow, headerCells = null) => {
        const full = stripLeadingNoiseFromNameText(fullName);
        if (!full || /^names?$/i.test(full)) {
          skippedRows += 1;
          return;
        }
        const { first_name: fn, last_name: ln } = splitFullNameForStudentImport(full);
        if (!fn || !ln) {
          skippedRows += 1;
          return;
        }
        const uid = nextUid();
        if (seenImportUids.has(uid)) {
          skippedRows += 1;
          return;
        }
        seenImportUids.add(uid);
        const extras = readSimpleListImportExtras(sourceRow, headerCells);
        const locationMissing = ['Province', 'District', 'Sector', 'Cell', 'Village'];
        toInsert.push({
          uid,
          preferred_student_uid: extras.preferred_student_uid,
          photo_raw: extras.photo_raw,
          sdm_code: extras.sdm_code,
          first_name: fn,
          last_name: ln,
          gender: null,
          birth_year: null,
          nationality: 'Rwandan',
          province: '',
          district: '',
          sector: '',
          cell: '',
          village: '',
          father_full_name: null,
          father_phone: null,
          father_email: null,
          mother_full_name: null,
          mother_phone: null,
          mother_email: null,
          import_missing_fields: JSON.stringify(locationMissing),
          source_row_json: JSON.stringify(sourceRow),
        });
      };

      const appendRichRosterRow = (parsed, sourceRow) => {
        if (!parsed?.first_name || !parsed?.last_name) {
          skippedRows += 1;
          return;
        }
        const uid = nextUid();
        if (seenImportUids.has(uid)) {
          skippedRows += 1;
          return;
        }
        seenImportUids.add(uid);
        phoneWarnings += Number(parsed.phoneWarnings || 0);
        toInsert.push({
          uid,
          preferred_student_uid: parsed.preferred_student_uid || null,
          photo_raw: parsed.photo_raw || null,
          sdm_code: parsed.sdm_code,
          first_name: parsed.first_name,
          last_name: parsed.last_name,
          gender: parsed.gender || null,
          birth_year: parsed.birth_year || null,
          nationality: 'Rwandan',
          province: parsed.province || '',
          district: parsed.district || '',
          sector: parsed.sector || '',
          cell: parsed.cell || '',
          village: parsed.village || '',
          father_full_name: parsed.father_full_name,
          father_phone: parsed.father_phone,
          father_email: null,
          mother_full_name: parsed.mother_full_name,
          mother_phone: parsed.mother_phone,
          mother_email: null,
          import_missing_fields: parsed.import_missing_fields,
          source_row_json: JSON.stringify(sourceRow),
        });
      };

      if (nurseryNamesHeaderIdx >= 0) {
        // ── FORMAT N: Nursery / simple class list (one full name per row in column "") ──
        for (let i = nurseryNamesHeaderIdx + 1; i < objectRows.length; i += 1) {
          const r = objectRows[i];
          if (!r || typeof r !== 'object') {
            skippedRows += 1;
            continue;
          }
          appendSimpleNameListRow(trimStr(r['']), r);
        }
      } else if (noNamesHeaderIdx >= 0 || noNamesDataStartIdx >= 0) {
        // ── FORMAT NN: NO + NAMES (simple) or NO + Code + NAMES + … (rich class roster) ──
        const start = noNamesHeaderIdx >= 0 ? noNamesHeaderIdx + 1 : noNamesDataStartIdx;
        const headerRow = noNamesHeaderIdx >= 0 ? objectRows[noNamesHeaderIdx] : null;
        const richRoster = headerRow
          ? objectRowHasRichRosterKeys(headerRow)
          : objectRowLooksLikeRichRosterData(objectRows[start]);
        for (let i = start; i < objectRows.length; i += 1) {
          const r = objectRows[i];
          if (!r || typeof r !== 'object' || !objectRowHasNoNamesKeys(r)) {
            skippedRows += 1;
            continue;
          }
          if (richRoster || objectRowLooksLikeRichRosterData(r)) {
            appendRichRosterRow(parseRichRosterObjectRow(r), r);
          } else {
            appendSimpleNameListRow(readNoNamesObjectRowName(r), r);
          }
        }
      } else {
      const isUrubutoCompactLayout = looksLikeUrubutoCompactObjectHeaderRow(objectRows[0]);
      const isUrubutoObjectFormat =
        looksLikeUrubutoObjectHeaderRow(objectRows[0]) || isUrubutoCompactLayout;

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
          const sdmCode = externalRegistrationIdForSdm(r['']);

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

          const hasManyDigits = (v) => String(v || '').replace(/\D/g, '').length >= 6;

          let province;
          let district;
          let sector;
          let cell;
          let village;
          let nationalityLabel;
          let fatherPhone;
          let motherPhone;
          let fatherEmail;
          let motherEmail;
          let locationMissing;

          if (isUrubutoCompactLayout) {
            province = '';
            district = '';
            sector = '';
            cell = '';
            village = '';
            nationalityLabel = 'Rwandan';
            fatherPhone = normalizePhone(r.__6);
            motherPhone = normalizePhone(r.__8);
            if (r.__6 && !fatherPhone && hasManyDigits(r.__6)) { phoneWarnings += 1; fatherPhone = null; }
            if (r.__8 && !motherPhone && hasManyDigits(r.__8)) { phoneWarnings += 1; motherPhone = null; }
            fatherEmail = null;
            motherEmail = null;
            locationMissing = ['Province', 'District', 'Sector', 'Cell', 'Village'];
          } else {
            province = normalizeProvinceLabel(cleanLocationToken(trimStr(r.__12)));
            district = cleanLocationToken(trimStr(r.__13));
            sector   = cleanLocationToken(trimStr(r.__14));
            cell     = cleanLocationToken(trimStr(r.__15));
            village  = cleanLocationToken(trimStr(r.__16));
            nationalityLabel = normalizeNationalityLabel(trimStr(r.__11)) || 'Rwandan';
            fatherPhone = normalizePhone(r.__6);
            motherPhone = normalizePhone(r.__9);
            if (r.__6 && !fatherPhone && hasManyDigits(r.__6)) { phoneWarnings += 1; fatherPhone = null; }
            if (r.__9 && !motherPhone && hasManyDigits(r.__9)) { phoneWarnings += 1; motherPhone = null; }
            fatherEmail = trimStr(r.__7)  || null;
            motherEmail = trimStr(r.__10) || null;
            locationMissing = [];
            if (!province) locationMissing.push('Province');
            if (!district) locationMissing.push('District');
            if (!sector)   locationMissing.push('Sector');
            if (!cell)     locationMissing.push('Cell');
            if (!village)  locationMissing.push('Village');
          }

          toInsert.push({
            uid,
            sdm_code:         sdmCode,
            first_name:       first,
            last_name:        last,
            gender:           gender || null,
            birth_year:       birth  || null,
            nationality:      nationalityLabel,
            province,
            district,
            sector,
            cell,
            village,
            father_full_name: trimStr(r.__5)  || null,
            father_phone:     fatherPhone,
            father_email:     fatherEmail,
            mother_full_name: isUrubutoCompactLayout ? (trimStr(r.__7) || null) : (trimStr(r.__8) || null),
            mother_phone:     motherPhone,
            mother_email:     motherEmail,
            import_missing_fields: JSON.stringify(locationMissing),
            source_row_json:  JSON.stringify(r),
          });
        }

      } else {
        // ── FORMAT B / C: array rows ─────────────────────────────
        const noNamesArrayIdx = findNoNamesArrayHeaderIndex(rawRows);
        const canonicalIndex = findUrubutoHeaderIndex(rawRows);

        if (noNamesArrayIdx >= 0 && canonicalIndex < 0) {
          const nnHeaderCells = rawRows[noNamesArrayIdx] || [];
          const nameColIdx = findNameColumnIndexInHeaders(nnHeaderCells);
          const richRosterArray = headerCellsLookLikeRichRoster(nnHeaderCells);
          const nnDataRows = rawRows.slice(noNamesArrayIdx + 1);
          for (let i = 0; i < nnDataRows.length; i += 1) {
            const row = nnDataRows[i];
            if (isBlankArrayRow(row)) continue;
            if (nameColIdx < 0) {
              skippedRows += 1;
              continue;
            }
            if (richRosterArray) {
              appendRichRosterRow(parseRichRosterArrayRow(row, nnHeaderCells), row);
            } else {
              appendSimpleNameListRow(trimStr(row[nameColIdx]), row, nnHeaderCells);
            }
          }
        } else {
        const headerInfo     = detectHeaderRow(rawRows);
        const headerIndex    = canonicalIndex >= 0 ? canonicalIndex : headerInfo.index;
        const headerCells    = rawRows[headerIndex] || [];
        const dataRows       = rawRows.slice(headerIndex + 1);
        const headerTrusted  = Number(headerInfo.score || 0) >= 4 || canonicalIndex >= 0;
        const canonicalUrubuto = canonicalIndex >= 0;
        const isNoNamesLayout = headerCellsLookLikeNoNamesLayout(headerCells);

        for (let i = 0; i < dataRows.length; i += 1) {
          const row    = dataRows[i];
          const rowNum = headerIndex + i + 2;
          if (isBlankArrayRow(row)) continue;

          if (isNoNamesLayout && headerCellsLookLikeRichRoster(headerCells)) {
            appendRichRosterRow(parseRichRosterArrayRow(row, headerCells), row);
            continue;
          }

          if (isNoNamesLayout) {
            const nameColIdx = findNameColumnIndexInHeaders(headerCells);
            if (nameColIdx >= 0) {
              appendSimpleNameListRow(trimStr(row[nameColIdx]), row, headerCells);
              continue;
            }
          }

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

            const nameOffset = resolveImportNameColumnOffset(row, base);
            const extraIdCol = nameOffset > 1 ? normalizeStudentId(row?.[base + 1]) : '';
            let sdmCode = extraIdCol
              ? externalRegistrationIdForSdm(extraIdCol)
              : externalRegistrationIdForSdm(strictUid);

            let strictFirst = trimStr(row?.[base + nameOffset]);
            let strictLast  = trimStr(row?.[base + nameOffset + 1]);
            const cleanedNames = cleanImportedStudentNames(strictFirst, strictLast, '');
            strictFirst = cleanedNames.first_name;
            strictLast  = cleanedNames.last_name;

            if (!strictFirst || !strictLast) {
              const fullInOne = stripLeadingRegistrationIdsFromNameText(trimStr(row?.[base + nameOffset]));
              if (fullInOne) {
                const sp = splitFullNameForStudentImport(fullInOne);
                strictFirst = sp.first_name;
                strictLast  = sp.last_name;
              }
            }

            const fieldShift = nameOffset - 1;
            const strictGender = normalizeGender(row?.[base + 3 + fieldShift]);
            const strictBirth  = normalizeBirthYearValue(row?.[base + 4 + fieldShift]);

            if (!strictFirst || !strictLast) {
              errors.push(`Row ${rowNum}: missing first or last name`);
              skippedRows += 1;
              continue;
            }

            const hasManyDigits  = (v) => String(v || '').replace(/\D/g, '').length >= 6;
            const fatherPhoneRaw = trimStr(row?.[base + 6 + fieldShift]);
            const motherPhoneRaw = trimStr(row?.[base + 9 + fieldShift]);
            let fatherPhone = normalizePhone(fatherPhoneRaw);
            let motherPhone = normalizePhone(motherPhoneRaw);
            if (fatherPhoneRaw && !fatherPhone && hasManyDigits(fatherPhoneRaw)) { phoneWarnings += 1; fatherPhone = null; }
            if (motherPhoneRaw && !motherPhone && hasManyDigits(motherPhoneRaw)) { phoneWarnings += 1; motherPhone = null; }

            const province = normalizeProvinceLabel(cleanLocationToken(trimStr(row?.[base + 12 + fieldShift])));
            const district = cleanLocationToken(trimStr(row?.[base + 13 + fieldShift]));
            const sector   = cleanLocationToken(trimStr(row?.[base + 14 + fieldShift]));
            const cell     = cleanLocationToken(trimStr(row?.[base + 15 + fieldShift]));
            const village  = cleanLocationToken(trimStr(row?.[base + 16 + fieldShift]));

            const locationMissing = [];
            if (!province) locationMissing.push('Province');
            if (!district) locationMissing.push('District');
            if (!sector)   locationMissing.push('Sector');
            if (!cell)     locationMissing.push('Cell');
            if (!village)  locationMissing.push('Village');

            toInsert.push({
              uid:              strictUid,
              sdm_code:         sdmCode,
              first_name:       strictFirst,
              last_name:        strictLast,
              gender:           strictGender || null,
              birth_year:       strictBirth  || null,
              nationality:      normalizeNationalityLabel(trimStr(row?.[base + 11 + fieldShift])) || 'Rwandan',
              province, district, sector, cell, village,
              father_full_name: trimStr(row?.[base + 5 + fieldShift])  || null,
              father_phone:     fatherPhone,
              father_email:     trimStr(row?.[base + 7 + fieldShift])  || null,
              mother_full_name: trimStr(row?.[base + 8 + fieldShift])  || null,
              mother_phone:     motherPhone,
              mother_email:     trimStr(row?.[base + 10 + fieldShift]) || null,
              import_missing_fields: JSON.stringify(locationMissing),
              source_row_json:  JSON.stringify(row),
            });
            continue;
          }

          // Generic / non-canonical path
          let first_name  = readFromRowByAliases(row, headerCells, ['F. Name','F Name','FirstName','First Name','Given Name']);
          let last_name   = readFromRowByAliases(row, headerCells, ['L. Name','L Name','LastName','Last Name','Surname']);
          let fullName    = readFromRowByAliases(row, headerCells, ['Names','NAMES','Name','Student Name','Full Name']);

          if (isNoNamesLayout) {
            const nameColIdx = findNameColumnIndexInHeaders(headerCells);
            const nm = nameColIdx >= 0 ? stripLeadingNoiseFromNameText(trimStr(row[nameColIdx])) : '';
            if (nm) {
              fullName = nm;
              first_name = '';
              last_name = '';
            }
          }
          let genderRaw   = readFromRowByAliases(row, headerCells, ['Gender','Sex','Igitsina']);
          let birth_year  = readFromRowByAliases(row, headerCells, ['BirthYear','Birth Year','DOB Year','Year Of Birth']);
          let nationality = readFromRowByAliases(row, headerCells, ['Nationality','Country']);
          let province    = readFromRowByAliases(row, headerCells, ['Province','Intara']);
          let district    = readFromRowByAliases(row, headerCells, ['District','Akarere']);
          let sector      = readFromRowByAliases(row, headerCells, ['Sector','Umurenge']);
          let cell        = readFromRowByAliases(row, headerCells, ['Cell','Akagari']);
          let village     = readFromRowByAliases(row, headerCells, ['Village','Umudugudu']);

          if (!headerTrusted && !isNoNamesLayout) {
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

          // Strong fixed fallback (skip when NO is column 0)
          if (!isNoNamesLayout) {
            first_name = first_name || trimStr(row?.[1]);
            last_name  = last_name  || trimStr(row?.[2]);
          }
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
            if (!last_name && parts.length === 1) last_name = '-';
          }

          const cleanedGenericNames = cleanImportedStudentNames(first_name, last_name, fullName);
          first_name = cleanedGenericNames.first_name;
          last_name = cleanedGenericNames.last_name;

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
            if (isValidStudentId(c0) && !digitStringLooksLikeRwandaPhone(c0)) uid = c0;
          }
          if (!uid) {
            const h = extractHeuristicFromRow(row);
            if (h.uid) uid = h.uid;
          }
          if (!uid) uid = nextUid();

          if (seenImportUids.has(uid)) { skippedRows += 1; continue; }
          seenImportUids.add(uid);

          let sdm_code = readFromRowByAliases(row, headerCells, [
            'Code', 'SDMS ID', 'SDMS', 'SDM Code', 'SDMCode', 'SDM', 'SDMSID',
          ]);
          if (!sdm_code) {
            const ordinal = Number(trimStr(row?.[0]));
            const idBase = Number.isInteger(ordinal) && ordinal > 0 && ordinal < 100000 ? 1 : 0;
            const maybeSdm = normalizeStudentId(row?.[idBase + 1]);
            const maybeUid = normalizeStudentId(row?.[idBase]);
            if (
              maybeSdm && maybeSdm !== maybeUid && maybeSdm !== uid
              && cellLooksLikeRegistrationId(maybeSdm)
            ) {
              sdm_code = maybeSdm;
            }
          }
          sdm_code = externalRegistrationIdForSdm(sdm_code) || null;

          const preferred_student_uid = normalizeStudentId(
            readFromRowByAliases(row, headerCells, RICH_ROSTER_STUDENT_ID_ALIASES)
          ) || null;
          const photo_raw = trimStr(readFromRowByAliases(row, headerCells, RICH_ROSTER_PHOTO_ALIASES)) || null;

          toInsert.push({
            uid,
            preferred_student_uid,
            photo_raw,
            sdm_code,
            first_name,
            last_name,
            gender: gender || null, birth_year: year || null,
            nationality: normalizeNationalityLabel(nationality || inferLocationFromRowTail(row).nationality || 'Rwandan') || 'Rwandan',
            province, district, sector, cell, village,
            father_full_name: readFromRowByAliases(row, headerCells, ['FatherName','Father Name','Father Full Name']) || null,
            father_phone: fPhone,
            father_email: readFromRowByAliases(row, headerCells, ['Father Email.','Father Email','FatherEmail']) || null,
            father_national_id: optionalNationalId(
              readFromRowByAliases(row, headerCells, [
                'Father National ID', 'FatherNational_ID', 'Father National Id', 'Father NID', 'Father NationalID',
              ])
            ),
            mother_full_name: readFromRowByAliases(row, headerCells, ['MotherName','Mother Name','Mother Full Name']) || null,
            mother_phone: mPhone,
            mother_email: readFromRowByAliases(row, headerCells, ['Mother Email.','Mother Email','MotherEmail']) || null,
            mother_national_id: optionalNationalId(
              readFromRowByAliases(row, headerCells, [
                'Mother National ID', 'MotherNational_ID', 'Mother National Id', 'Mother NID', 'Mother NationalID',
              ])
            ),
            import_missing_fields: JSON.stringify(locationMissing),
            source_row_json: JSON.stringify(row),
          });
        }
        }
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

      const [[schoolMeta]] = await promisePool.query(
        'SELECT district, school_code FROM schools WHERE id = ? AND deleted_at IS NULL LIMIT 1',
        [schoolId]
      );

      // Backfill SDMS / Urubuto registration id for generic rows (official student_uid uses nextUid).
      for (const s of toInsert) {
        if (s.sdm_code) continue;
        const ext = externalRegistrationIdForSdm(s.uid);
        if (!ext) continue;
        if (!shouldTrustImportedStudentUid(ext, schoolMeta?.district, schoolMeta?.school_code)) {
          s.sdm_code = ext;
        }
      }

      // ── 4. DB upsert ───────────────────────────────────────────
      const conn = await promisePool.getConnection();
      try {
        await conn.beginTransaction();
        let inserted = 0, updated = 0, duplicatesSkipped = 0, replacedSkipped = 0;
        let photosAttached = 0;

        for (const s of toInsert) {
          const normUid = trimStr(s.uid);
          const sdmVal = trimStr(s.sdm_code);
          const cand = [...new Set([normUid, sdmVal].filter(Boolean))];
          // Match by Babyeyi official student_uid OR by SDMS / Urubuto id stored in sdm_code
          // eslint-disable-next-line no-await-in-loop
          let existing = null;
          if (cand.length) {
            const ph = cand.map(() => '?').join(',');
            const [[ex]] = await conn.query(
              `SELECT id FROM students WHERE school_id = ? AND (student_uid IN (${ph}) OR sdm_code IN (${ph})) LIMIT 1`,
              [schoolId, ...cand, ...cand]
            );
            existing = ex;
          }

          if (importMode === 'insert_only' && existing)      { duplicatesSkipped += 1; continue; }
          if (importMode === 'replace_by_student_id' && !existing) { replacedSkipped += 1; continue; }

          if (existing) {
            const natU = trimStr(s.nationality) ? normalizeNationalityLabel(s.nationality) : null;
            const locU = (v) => {
              const t = trimStr(v);
              return t === '' ? null : t;
            };
            const [[existingRow]] = await conn.query(
              'SELECT student_uid, sdm_code FROM students WHERE id = ? LIMIT 1',
              [existing.id],
            );
            // eslint-disable-next-line no-await-in-loop
            const photoFilename = await resolveImportStudentPhoto({
              photoRaw: s.photo_raw,
              sdmCode: sdmVal || existingRow?.sdm_code,
              studentUid: trimStr(s.preferred_student_uid) || existingRow?.student_uid || normUid,
              photoIndex,
            });
            if (photoFilename) photosAttached += 1;
            // eslint-disable-next-line no-await-in-loop
            await conn.query(
              `UPDATE students SET
                 first_name=?, last_name=?, gender=?, birth_year=?, nationality=?,
                 province=?, district=?, sector=?, cell=?, village=?,
                 class_name=?, academic_year=?,
                 sdm_code=COALESCE(?, sdm_code),
                 student_photo=COALESCE(?, student_photo),
                 father_full_name=?, father_phone=?, father_email=?, father_national_id=?,
                 mother_full_name=?, mother_phone=?, mother_email=?, mother_national_id=?,
                 import_missing_fields=?, source_row_json=?, updated_at=NOW()
               WHERE id=?`,
              [
                s.first_name, s.last_name, s.gender, s.birth_year, natU,
                locU(s.province), locU(s.district), locU(s.sector), locU(s.cell), locU(s.village),
                s.class_name || null, s.academic_year || null,
                trimStr(s.sdm_code) || null,
                photoFilename,
                s.father_full_name, s.father_phone, s.father_email, s.father_national_id || null,
                s.mother_full_name, s.mother_phone, s.mother_email, s.mother_national_id || null,
                s.import_missing_fields || null, s.source_row_json || null,
                existing.id,
              ]
            );
            updated += 1;
          } else {
            // Only persist Excel UID if it matches this school's official 9-digit pattern (DD+SSS+NNNN).
            // Otherwise always allocate — never store phone numbers or Urubuto 12-digit IDs as student_uid.
            const preferredUid = trimStr(s.preferred_student_uid);
            const uidStr = String(preferredUid || s.uid || '').trim();
            const officialNew = shouldTrustImportedStudentUid(uidStr, schoolMeta?.district, schoolMeta?.school_code)
              ? uidStr
              : nextUid();
            const officialCode = formattedStudentCodeFromUid(officialNew);

            const nat = trimStr(s.nationality)
              ? normalizeNationalityLabel(s.nationality)
              : null;
            const loc = (v) => {
              const t = trimStr(v);
              return t === '' ? null : t;
            };

            // eslint-disable-next-line no-await-in-loop
            const photoFilename = await resolveImportStudentPhoto({
              photoRaw: s.photo_raw,
              sdmCode: sdmVal,
              studentUid: officialNew,
              photoIndex,
            });
            if (photoFilename) photosAttached += 1;

            await conn.query(
              `INSERT INTO students (
                 student_uid, student_code, school_id, first_name, last_name, gender, birth_year, nationality,
                 province, district, sector, cell, village,
                 class_name, academic_year, sdm_code, student_photo,
                 father_full_name, father_phone, father_email, father_national_id,
                 mother_full_name, mother_phone, mother_email, mother_national_id,
                 import_missing_fields, source_row_json
               ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
              [
                officialNew, officialCode, schoolId,
                s.first_name, s.last_name, s.gender, s.birth_year, nat,
                loc(s.province), loc(s.district), loc(s.sector), loc(s.cell), loc(s.village),
                s.class_name || null, s.academic_year || null, trimStr(s.sdm_code) || null,
                photoFilename,
                s.father_full_name, s.father_phone, s.father_email, s.father_national_id || null,
                s.mother_full_name, s.mother_phone, s.mother_email, s.mother_national_id || null,
                s.import_missing_fields || null, s.source_row_json || null,
              ]
            );
            inserted += 1;
          }
        }

        await conn.commit();
        conn.release();

        await backfillSchoolEnrollments(schoolId).catch(() => {});

        skippedRows += duplicatesSkipped + replacedSkipped;
        const modeLabel = importMode === 'insert_only' ? 'Insert only' : 'Replace by Student ID';

        return res.json({
          success: true,
          message: `Import completed (${modeLabel}): ${inserted} inserted, ${updated} updated, ${skippedRows} skipped.`,
          inserted, updated, skipped: skippedRows,
          processed: toInsert.length + skippedRows,
          importMode, phoneWarnings, duplicatesSkipped, replacedSkipped,
          photosAttached,
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
      if (excelFile?.path) fs.unlink(excelFile.path, () => {});
      if (zipFile?.path) fs.unlink(zipFile.path, () => {});
      if (photoExtractDir) fs.rmSync(photoExtractDir, { recursive: true, force: true });
    }
  }
);

// ── Multer error handler ─────────────────────────────────────────
router.use((err, _req, res, _next) => {
  if (err.code === 'LIMIT_FILE_SIZE')       return res.status(400).json({ success: false, message: 'File too large (max 50 MB)' });
  if (err.code === 'LIMIT_UNEXPECTED_FILE') return res.status(400).json({ success: false, message: `Unexpected file field: ${err.field}` });
  return res.status(400).json({ success: false, message: err.message || 'Upload error' });
});

module.exports = router;
module.exports.ensureStudentsTable = ensureStudentsTable;
module.exports.ensureStudentsExtraColumns = ensureStudentsExtraColumns;