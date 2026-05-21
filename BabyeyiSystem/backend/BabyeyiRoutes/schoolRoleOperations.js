const express = require('express');
const { promisePool } = require('../config/database');
const { requireRole } = require('../middleware/deoAuth');
const { computeProAccessEffective } = require('../utils/schoolSubscription');

const router = express.Router();

const LIBRARY_ROLES = ['LIBRARIAN', 'SCHOOL_ADMIN', 'SCHOOL_MANAGER'];
const STOCK_ROLES = ['STORE_MANAGER', 'SCHOOL_ADMIN', 'SCHOOL_MANAGER'];
const GATE_ROLES = ['GATE_KEEPER', 'GATE_OFFICER', 'SCHOOL_ADMIN', 'SCHOOL_MANAGER'];
/** Discipline portal (HOD / DISCIPLINE / DISCIPLINE_STAFF / TEACHER) uses same gate UI as DOS — must be allowed here. */
const GATE_ATTENDANCE_ADMIN_ROLES = [
  'GATE_OFFICER',
  'DOS',
  'SCHOOL_ADMIN',
  'SCHOOL_MANAGER',
  'HOD',
  'DISCIPLINE',
  'DISCIPLINE_STAFF',
  'TEACHER',
  'SCHOOL_REPRESENTATIVE',
];

let tablesReady = false;
let permissionTrackingReady = false;

function resolveSchoolId(req) {
  return (
    req.query?.school_id ||
    req.body?.school_id ||
    req.user?.school_id ||
    req.session?.school_id ||
    req.session?.user?.school_id ||
    req.session?.user?.school?.id ||
    null
  );
}

function resolveUserId(req) {
  return req.user?.id || req.session?.userId || req.session?.user?.id || null;
}

function cleanStr(value, max = 255) {
  return String(value == null ? '' : value).trim().slice(0, max);
}

function cleanOptional(value, max = 255) {
  const v = cleanStr(value, max);
  return v || null;
}

function cleanNumber(value, fallback = 0) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return n;
}

function normalizeUid(value) {
  return String(value == null ? '' : value).trim().toUpperCase();
}

function hhmm(value) {
  const m = String(value == null ? '' : value).trim().match(/^(\d{1,2}):(\d{2})/);
  if (!m) return null;
  const h = Number(m[1]);
  const mm = Number(m[2]);
  if (!Number.isFinite(h) || !Number.isFinite(mm) || h < 0 || h > 23 || mm < 0 || mm > 59) return null;
  return `${String(h).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

function minutesOf(value) {
  const t = hhmm(value);
  if (!t) return null;
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

function currentSchoolDateAndMinutes(date = new Date()) {
  // Use fixed school timezone so gate windows are deterministic
  // regardless of server OS timezone settings.
  const tz = process.env.SCHOOL_TIMEZONE || 'Africa/Kigali';
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date);
  const get = (type) => parts.find((p) => p.type === type)?.value || '00';
  const dateStr = `${get('year')}-${get('month')}-${get('day')}`;
  const mins = Number(get('hour')) * 60 + Number(get('minute'));
  return { dateStr, mins };
}

function currentSchoolDateTimeSql(date = new Date()) {
  const tz = process.env.SCHOOL_TIMEZONE || 'Africa/Kigali';
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(date);
  const get = (type) => parts.find((p) => p.type === type)?.value || '00';
  return `${get('year')}-${get('month')}-${get('day')} ${get('hour')}:${get('minute')}:${get('second')}`;
}

function parseStudentRefFromQrRaw(rawValue) {
  const raw = cleanStr(rawValue, 2048);
  if (!raw) return null;
  const simpleCode = raw.match(/^([A-Za-z0-9_-]{2,64})$/);
  if (simpleCode) return simpleCode[1];

  try {
    const url = new URL(raw);
    const path = String(url.pathname || '').replace(/\/+$/, '');
    const parts = path.split('/').filter(Boolean);
    const idx = parts.findIndex((p) => p === 'v' || p === 'qr-student-profile');
    if (idx >= 0 && parts[idx + 1]) {
      return cleanStr(parts[idx + 1], 64);
    }
  } catch (_err) {}

  const pathOnly = raw.match(/\/(?:v|qr-student-profile)\/([A-Za-z0-9_-]{1,64})(?:[/?#]|$)/i);
  if (pathOnly?.[1]) return cleanStr(pathOnly[1], 64);
  return null;
}

async function ensurePermissionTrackingColumns() {
  if (permissionTrackingReady) return;
  await promisePool.query(
    `ALTER TABLE student_permissions
     ADD COLUMN actual_out_at DATETIME NULL`
  ).catch(() => {});
  await promisePool.query(
    `ALTER TABLE student_permissions
     ADD COLUMN actual_return_at DATETIME NULL`
  ).catch(() => {});
  await promisePool.query(
    `ALTER TABLE student_permissions
     ADD COLUMN gate_scan_state ENUM('NOT_USED','OUT','BACK','EXCEEDED') NOT NULL DEFAULT 'NOT_USED'`
  ).catch(() => {});
  await promisePool.query(
    `ALTER TABLE student_permissions
     ADD COLUMN exceeded_minutes INT UNSIGNED NOT NULL DEFAULT 0`
  ).catch(() => {});
  await promisePool.query(
    `ALTER TABLE student_permissions
     ADD COLUMN last_gate_action_at DATETIME NULL`
  ).catch(() => {});
  permissionTrackingReady = true;
}

async function ensureSchoolRoleOpsTables() {
  if (tablesReady) return;

  await promisePool.query(`
    CREATE TABLE IF NOT EXISTS school_library_books (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      school_id INT UNSIGNED NOT NULL,
      title VARCHAR(220) NOT NULL,
      author VARCHAR(180) NULL,
      isbn VARCHAR(80) NULL,
      category VARCHAR(120) NULL,
      quantity_total INT NOT NULL DEFAULT 1,
      quantity_available INT NOT NULL DEFAULT 1,
      shelf_location VARCHAR(120) NULL,
      status ENUM('ACTIVE','INACTIVE') NOT NULL DEFAULT 'ACTIVE',
      created_by_user_id INT UNSIGNED NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      KEY idx_library_school (school_id),
      KEY idx_library_status (status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  await promisePool.query(`
    CREATE TABLE IF NOT EXISTS school_library_checkouts (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      school_id INT UNSIGNED NOT NULL,
      book_id INT UNSIGNED NOT NULL,
      borrower_name VARCHAR(180) NOT NULL,
      borrower_type ENUM('STUDENT','STAFF','VISITOR') NOT NULL DEFAULT 'STUDENT',
      borrower_ref VARCHAR(120) NULL,
      issued_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      due_date DATE NULL,
      returned_at DATETIME NULL,
      status ENUM('ISSUED','RETURNED') NOT NULL DEFAULT 'ISSUED',
      notes TEXT NULL,
      created_by_user_id INT UNSIGNED NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      KEY idx_checkouts_school (school_id),
      KEY idx_checkouts_book (book_id),
      KEY idx_checkouts_status (status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  await promisePool.query(`
    CREATE TABLE IF NOT EXISTS school_stock_items (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      school_id INT UNSIGNED NOT NULL,
      item_name VARCHAR(200) NOT NULL,
      sku VARCHAR(80) NULL,
      category VARCHAR(120) NULL,
      unit VARCHAR(40) NOT NULL DEFAULT 'pcs',
      reorder_level DECIMAL(10,2) NOT NULL DEFAULT 0,
      opening_qty DECIMAL(10,2) NOT NULL DEFAULT 0,
      current_qty DECIMAL(10,2) NOT NULL DEFAULT 0,
      status ENUM('ACTIVE','INACTIVE') NOT NULL DEFAULT 'ACTIVE',
      created_by_user_id INT UNSIGNED NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      KEY idx_stock_items_school (school_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  await promisePool.query(`
    CREATE TABLE IF NOT EXISTS school_stock_movements (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      school_id INT UNSIGNED NOT NULL,
      item_id INT UNSIGNED NOT NULL,
      movement_type ENUM('IN','OUT','ADJUSTMENT') NOT NULL,
      quantity_change DECIMAL(10,2) NOT NULL,
      reason VARCHAR(220) NULL,
      movement_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      created_by_user_id INT UNSIGNED NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      KEY idx_stock_mv_school (school_id),
      KEY idx_stock_mv_item (item_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  await promisePool.query(`
    CREATE TABLE IF NOT EXISTS school_gate_logs (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      school_id INT UNSIGNED NOT NULL,
      person_name VARCHAR(180) NOT NULL,
      person_type ENUM('STUDENT','STAFF','VISITOR') NOT NULL DEFAULT 'STUDENT',
      person_ref VARCHAR(120) NULL,
      action_type ENUM('IN','OUT') NOT NULL,
      logged_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      notes TEXT NULL,
      created_by_user_id INT UNSIGNED NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      KEY idx_gate_school (school_id),
      KEY idx_gate_person (person_type),
      KEY idx_gate_time (logged_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  await promisePool.query(`
    CREATE TABLE IF NOT EXISTS school_gate_attendance_settings (
      school_id INT UNSIGNED NOT NULL PRIMARY KEY,
      morning_deadline VARCHAR(5) NOT NULL DEFAULT '08:00',
      morning_cutoff VARCHAR(5) NOT NULL DEFAULT '10:00',
      evening_start VARCHAR(5) NOT NULL DEFAULT '16:00',
      evening_cutoff VARCHAR(5) NOT NULL DEFAULT '19:00',
      updated_by_user_id INT UNSIGNED NULL,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  await promisePool.query(`
    CREATE TABLE IF NOT EXISTS school_gate_attendance_records (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      school_id INT UNSIGNED NOT NULL,
      attendance_date DATE NOT NULL,
      card_uid VARCHAR(64) NOT NULL,
      person_type ENUM('STUDENT','STAFF') NOT NULL,
      person_id INT UNSIGNED NOT NULL,
      person_name VARCHAR(180) NOT NULL,
      person_ref VARCHAR(120) NULL,
      morning_check_in DATETIME NULL,
      morning_status ENUM('OnTime','Late') NULL,
      morning_device_id VARCHAR(80) NULL,
      evening_check_out DATETIME NULL,
      evening_status ENUM('Exit') NULL,
      evening_device_id VARCHAR(80) NULL,
      academic_year VARCHAR(32) NULL,
      term VARCHAR(32) NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_gate_card_day (school_id, attendance_date, card_uid),
      KEY idx_gate_att_school_day (school_id, attendance_date),
      KEY idx_gate_att_person_day (school_id, person_type, person_id, attendance_date),
      KEY idx_gate_att_term_year (school_id, term, academic_year)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
  await promisePool.query('ALTER TABLE school_gate_attendance_records ADD COLUMN academic_year VARCHAR(32) NULL').catch(() => {});
  await promisePool.query('ALTER TABLE school_gate_attendance_records ADD COLUMN term VARCHAR(32) NULL').catch(() => {});
  await promisePool.query('ALTER TABLE school_gate_attendance_records ADD KEY idx_gate_att_term_year (school_id, term, academic_year)').catch(() => {});

  await promisePool.query(`
    CREATE TABLE IF NOT EXISTS school_gate_attendance_events (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      school_id INT UNSIGNED NULL,
      device_id VARCHAR(80) NULL,
      card_uid VARCHAR(64) NULL,
      result_code VARCHAR(64) NOT NULL,
      http_status INT NOT NULL,
      message VARCHAR(255) NULL,
      session_type VARCHAR(16) NULL,
      person_type VARCHAR(16) NULL,
      person_id INT UNSIGNED NULL,
      attendance_date DATE NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      KEY idx_gate_event_school_time (school_id, created_at),
      KEY idx_gate_event_code_time (result_code, created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  tablesReady = true;
}

async function getSchoolGateAttendanceSettings(schoolId) {
  const [[row]] = await promisePool.query(
    `SELECT morning_deadline, morning_cutoff, evening_start, evening_cutoff
     FROM school_gate_attendance_settings
     WHERE school_id = ?
     LIMIT 1`,
    [schoolId]
  );
  return {
    morning_deadline: hhmm(row?.morning_deadline) || '08:00',
    morning_cutoff: hhmm(row?.morning_cutoff) || '10:00',
    evening_start: hhmm(row?.evening_start) || '16:00',
    evening_cutoff: hhmm(row?.evening_cutoff) || '19:00',
  };
}

async function logGateAttendanceEvent({
  schoolId = null,
  deviceId = null,
  cardUid = null,
  resultCode = 'UNKNOWN',
  httpStatus = 500,
  message = null,
  sessionType = null,
  personType = null,
  personId = null,
  attendanceDate = null,
}) {
  try {
    await promisePool.query(
      `INSERT INTO school_gate_attendance_events
       (school_id, device_id, card_uid, result_code, http_status, message, session_type, person_type, person_id, attendance_date)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [schoolId, deviceId, cardUid, resultCode, Number(httpStatus || 0), message, sessionType, personType, personId, attendanceDate]
    );
  } catch (err) {
    console.error('[gate_attendance] failed to log event:', err.message);
  }
}

async function getSchoolAcademicMetaForDate(schoolId, dateStr) {
  const [[row]] = await promisePool.query(
    `SELECT current_academic_year, active_terms_json
     FROM school_academic_settings
     WHERE school_id = ?
     LIMIT 1`,
    [schoolId]
  ).catch(() => [[null]]);

  const currentAcademicYear = String(row?.current_academic_year || '').trim() || null;
  let terms = ['Term 1', 'Term 2', 'Term 3'];
  try {
    if (row?.active_terms_json) {
      const parsed = Array.isArray(row.active_terms_json)
        ? row.active_terms_json
        : JSON.parse(row.active_terms_json);
      if (Array.isArray(parsed) && parsed.length) {
        terms = parsed.map((x) => String(x || '').trim()).filter(Boolean);
      }
    }
  } catch (_) {}
  const d = new Date(`${dateStr}T12:00:00`);
  const month = d.getMonth() + 1;
  let inferredTerm = terms[0] || 'Term 1';
  if (terms.length >= 3) {
    if (month >= 9 && month <= 12) inferredTerm = terms[0];
    else if (month >= 1 && month <= 4) inferredTerm = terms[1] || terms[0];
    else inferredTerm = terms[2] || terms[terms.length - 1];
  } else if (terms.length === 2) {
    inferredTerm = month >= 9 || month <= 2 ? terms[0] : terms[1];
  }
  return { academicYear: currentAcademicYear, term: inferredTerm };
}

function inferAcademicYearFromDate(date = new Date()) {
  const y = date.getFullYear();
  const m = date.getMonth() + 1;
  return m >= 9 ? `${y}-${y + 1}` : `${y - 1}-${y}`;
}

async function resolveAcademicContext(schoolId, academicYearRaw, termRaw, dateStr = null) {
  const explicitYear = cleanStr(academicYearRaw, 40);
  const explicitTerm = cleanStr(termRaw, 40);
  if (explicitYear && explicitTerm) {
    return { academicYear: explicitYear, term: explicitTerm };
  }
  const baseDate = dateStr || currentSchoolDateAndMinutes().dateStr;
  const meta = await getSchoolAcademicMetaForDate(schoolId, baseDate);
  return {
    academicYear: explicitYear || cleanStr(meta?.academicYear, 40) || inferAcademicYearFromDate(),
    term: explicitTerm || cleanStr(meta?.term, 40) || 'Term 1',
  };
}

/** Gate attendance dashboard + RFID taps — available on Lite and Pro. */
function isGateAttendanceFeaturePath(req) {
  const orig = String(req.originalUrl || '').split('?')[0];
  if (/^\/api\/gate\/attendance(\/|$)/i.test(orig)) return true;
  if (/^\/api\/gate_attendance(\/|$)/i.test(orig)) return true;
  const p = String(req.path || req.url || '').split('?')[0];
  if (/^\/gate\/attendance(\/|$)/i.test(p)) return true;
  return /^\/gate_attendance(\/|$)/i.test(p);
}

async function ensureProSchoolAccess(req, res, next) {
  try {
    if (isGateAttendanceFeaturePath(req)) {
      return next();
    }
    const schoolId = resolveSchoolId(req);
    if (!schoolId) {
      return res.status(400).json({ success: false, message: 'School context missing.' });
    }
    const [[schoolRow]] = await promisePool.query(
      `SELECT subscription_plan, pro_enabled, pro_end_date
       FROM schools WHERE id = ? AND deleted_at IS NULL LIMIT 1`,
      [schoolId]
    );
    if (!computeProAccessEffective(schoolRow || null)) {
      return res.status(403).json({
        success: false,
        code: 'PRO_REQUIRED',
        message: 'This feature is available for Pro schools only.',
      });
    }
    return next();
  } catch (err) {
    console.error('[schoolRoleOperations] pro check failed:', err);
    return res.status(500).json({ success: false, message: 'Failed to verify school subscription.' });
  }
}

async function recalculateStockCurrentQty(schoolId, itemId) {
  const [[item]] = await promisePool.query(
    `SELECT opening_qty FROM school_stock_items WHERE id = ? AND school_id = ? LIMIT 1`,
    [itemId, schoolId]
  );
  if (!item) return;
  const [[agg]] = await promisePool.query(
    `SELECT COALESCE(SUM(quantity_change), 0) AS delta
     FROM school_stock_movements WHERE school_id = ? AND item_id = ?`,
    [schoolId, itemId]
  );
  const nextQty = cleanNumber(item.opening_qty, 0) + cleanNumber(agg?.delta, 0);
  await promisePool.query(
    `UPDATE school_stock_items SET current_qty = ? WHERE id = ? AND school_id = ?`,
    [nextQty, itemId, schoolId]
  );
}

/**
 * This router is mounted at `/api` alongside many other modules.
 * Only `/library/*`, `/stock/*`, and `/gate/*` belong here — otherwise we must
 * immediately `next('router')` so requests like `GET /api/schools` reach
 * `school-add.js` instead of failing with "School context missing."
 */
function isRoleOpsPath(req) {
  const orig = String(req.originalUrl || '').split('?')[0];
  if (/^\/api\/(library|stock|gate|iot|school\/calendar-events)(\/|$)/i.test(orig)) return true;
  if (/^\/api\/gate_attendance(\/|$)/i.test(orig)) return true;
  const p = String(req.path || req.url || '').split('?')[0];
  if (/^\/(library|stock|gate|iot|school\/calendar-events)(\/|$)/i.test(p)) return true;
  return /^\/gate_attendance(\/|$)/i.test(p);
}

router.use((req, res, next) => {
  if (!isRoleOpsPath(req)) return next('router');
  next();
});

router.use(async (_req, res, next) => {
  try {
    await ensureSchoolRoleOpsTables();
    next();
  } catch (err) {
    console.error('[schoolRoleOperations] table init failed:', err);
    res.status(500).json({ success: false, message: 'Failed to initialize role operation tables.' });
  }
});

router.post('/gate_attendance', async (req, res, next) => {
  try {
    const deviceID = cleanOptional(req.body?.deviceID || req.body?.device_id, 80);
    const validDevice = /^(ATT|CLASSATT)[_-]?[A-Za-z0-9]{2,}$/i.test(String(deviceID || ''));
    const sendResult = async (status, payload, meta = {}) => {
      await logGateAttendanceEvent({
        schoolId: meta.schoolId ?? null,
        deviceId: deviceID,
        cardUid: meta.cardUid ?? null,
        resultCode: payload?.code || 'UNKNOWN',
        httpStatus: status,
        message: payload?.message || null,
        sessionType: meta.sessionType || null,
        personType: meta.personType || null,
        personId: meta.personId || null,
        attendanceDate: meta.attendanceDate || null,
      });
      return res.status(status).json(payload);
    };

    if (!validDevice) {
      return sendResult(403, {
        success: false,
        code: 'INVALID_DEVICE_ID',
        message: 'Invalid deviceID. Attendance is allowed only for ATT devices with identifier (example: ATT_12345).',
      });
    }
    const cardUID = normalizeUid(req.body?.cardUID || req.body?.card_uid);
    if (!cardUID) return sendResult(400, { success: false, code: 'INVALID_CARD', message: 'cardUID is required.' });

    // CLASSATT_* readers: use DOS teacher period attendance flow
    if (/^CLASSATT[_-]?[A-Za-z0-9]{2,}$/i.test(String(deviceID || ''))) {
      await promisePool.query(`
        CREATE TABLE IF NOT EXISTS school_teacher_period_settings (
          school_id INT UNSIGNED NOT NULL PRIMARY KEY,
          academic_year VARCHAR(32) NOT NULL,
          term VARCHAR(32) NOT NULL,
          late_threshold_minutes INT UNSIGNED NOT NULL DEFAULT 10,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          updated_by_user_id INT UNSIGNED NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `);
      await promisePool.query(`
        CREATE TABLE IF NOT EXISTS teacher_period_attendance (
          id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
          school_id INT UNSIGNED NOT NULL,
          teacher_id INT UNSIGNED NOT NULL,
          class_name VARCHAR(120) NOT NULL,
          subject_name VARCHAR(255) NOT NULL,
          day_of_week ENUM('Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday') NOT NULL,
          period_date DATE NOT NULL,
          start_time VARCHAR(10) NOT NULL,
          end_time VARCHAR(10) NOT NULL,
          entry_time DATETIME NULL,
          exit_time DATETIME NULL,
          status ENUM('ON_TIME','LATE','BEFORE') NULL,
          exit_status ENUM('ON_TIME','BEFORE') NULL,
          late_minutes INT UNSIGNED NOT NULL DEFAULT 0,
          scan_source VARCHAR(64) NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          UNIQUE KEY uq_teacher_period (school_id, teacher_id, period_date, class_name, subject_name, start_time, end_time),
          KEY idx_tpa_school_date (school_id, period_date),
          KEY idx_tpa_teacher_date (school_id, teacher_id, period_date)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `);

      const [[teacher]] = await promisePool.query(
        `SELECT st.school_id, u.id AS teacher_id,
                TRIM(CONCAT(COALESCE(u.first_name,''), ' ', COALESCE(u.last_name,''))) AS teacher_name
         FROM staff st
         INNER JOIN users u ON u.id = st.user_id
         WHERE UPPER(TRIM(COALESCE(u.rfid_uid, ''))) = ?
         LIMIT 1`,
        [cardUID]
      );
      if (!teacher) {
        return sendResult(404, {
          success: false,
          code: 'UNKNOWN_CARD',
          message: 'Card not registered',
          data: { card_uid: cardUID, device_id: deviceID },
        }, { cardUid: cardUID });
      }

      const schoolId = Number(teacher.school_id || 0);
      const { dateStr, mins } = currentSchoolDateAndMinutes();
      const nowHm = `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`;
      const day = new Intl.DateTimeFormat('en-US', { weekday: 'long', timeZone: process.env.SCHOOL_TIMEZONE || 'Africa/Kigali' }).format(new Date());

      const [[ctx]] = await promisePool.query(
        'SELECT academic_year, term FROM school_active_academic_context WHERE school_id = ? LIMIT 1',
        [schoolId]
      ).catch(() => [[null]]);
      const [[setRow]] = await promisePool.query(
        'SELECT academic_year, term, late_threshold_minutes FROM school_teacher_period_settings WHERE school_id = ? LIMIT 1',
        [schoolId]
      );
      const settings = {
        academic_year: setRow?.academic_year || ctx?.academic_year || '2025-2026',
        term: setRow?.term || ctx?.term || 'Term 1',
        late_threshold_minutes: Number(setRow?.late_threshold_minutes || 10),
      };

      const [slots] = await promisePool.query(
        `SELECT id, class_name, subject_name, start_time, end_time
         FROM academic_timetables
         WHERE school_id = ? AND staff_id = ? AND day_of_week = ? AND term = ? AND academic_year = ?
         ORDER BY start_time ASC`,
        [schoolId, teacher.teacher_id, day, settings.term, settings.academic_year]
      );
      const toMins = (t) => {
        const [h, m] = String(t || '00:00').slice(0, 5).split(':').map(Number);
        return (Number.isFinite(h) ? h : 0) * 60 + (Number.isFinite(m) ? m : 0);
      };
      const current = (slots || []).find((s) => mins >= toMins(s.start_time) && mins <= toMins(s.end_time));
      if (!current) {
        return sendResult(200, {
          success: false,
          code: 'NO_CLASS_ASSIGNED',
          message: 'No class assigned now',
          data: { teacher: teacher.teacher_name, day, time: nowHm, ...settings },
        }, { schoolId, cardUid: cardUID, attendanceDate: dateStr, personType: 'STAFF', personId: teacher.teacher_id });
      }

      const startHm = String(current.start_time).slice(0, 5);
      const endHm = String(current.end_time).slice(0, 5);
      const [[existing]] = await promisePool.query(
        `SELECT id, entry_time, exit_time, status, exit_status, late_minutes
         FROM teacher_period_attendance
         WHERE school_id = ? AND teacher_id = ? AND period_date = ?
           AND class_name = ? AND subject_name = ? AND start_time = ? AND end_time = ?
         LIMIT 1`,
        [schoolId, teacher.teacher_id, dateStr, current.class_name, current.subject_name, current.start_time, current.end_time]
      );

      if (!existing) {
        const lateMinutes = Math.max(0, toMins(nowHm) - toMins(startHm));
        const status = lateMinutes > settings.late_threshold_minutes ? 'LATE' : 'ON_TIME';
        const [ins] = await promisePool.query(
          `INSERT INTO teacher_period_attendance
           (school_id, teacher_id, class_name, subject_name, day_of_week, period_date, start_time, end_time, entry_time, status, late_minutes, scan_source)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), ?, ?, ?)`,
          [schoolId, teacher.teacher_id, current.class_name, current.subject_name, day, dateStr, current.start_time, current.end_time, status, lateMinutes, deviceID]
        );
        return sendResult(200, {
          success: true,
          action: 'entry',
          code: status === 'LATE' ? 'LATE_ENTRY' : 'ENTRY_RECORDED',
          message: status === 'LATE' ? 'Late entry recorded' : 'Entry recorded',
          data: {
            id: ins.insertId,
            teacher_id: teacher.teacher_id,
            teacher_name: teacher.teacher_name,
            class_name: current.class_name,
            subject_name: current.subject_name,
            period: `${startHm}-${endHm}`,
            start_time: startHm,
            end_time: endHm,
            date: dateStr,
            entry_time: nowHm,
            exit_time: null,
            status,
            exit_status: null,
            late_minutes: lateMinutes,
            term: settings.term,
            academic_year: settings.academic_year,
          },
        }, { schoolId, cardUid: cardUID, attendanceDate: dateStr, personType: 'STAFF', personId: teacher.teacher_id, sessionType: 'class_entry' });
      }

      if (!existing.exit_time) {
        const exitStatus = toMins(nowHm) < toMins(endHm) ? 'BEFORE' : 'ON_TIME';
        await promisePool.query(
          'UPDATE teacher_period_attendance SET exit_time = NOW(), exit_status = ?, scan_source = ? WHERE id = ?',
          [exitStatus, deviceID, existing.id]
        );
        return sendResult(200, {
          success: true,
          action: 'exit',
          code: exitStatus === 'BEFORE' ? 'EARLY_EXIT' : 'EXIT_RECORDED',
          message: exitStatus === 'BEFORE' ? 'Exit recorded before period ended' : 'Exit recorded',
          data: {
            id: existing.id,
            teacher_id: teacher.teacher_id,
            teacher_name: teacher.teacher_name,
            class_name: current.class_name,
            subject_name: current.subject_name,
            period: `${startHm}-${endHm}`,
            start_time: startHm,
            end_time: endHm,
            date: dateStr,
            entry_time: existing.entry_time ? String(existing.entry_time).slice(11, 16) : null,
            exit_time: nowHm,
            status: existing.status,
            exit_status: exitStatus,
            late_minutes: Number(existing.late_minutes || 0),
            term: settings.term,
            academic_year: settings.academic_year,
          },
        }, { schoolId, cardUid: cardUID, attendanceDate: dateStr, personType: 'STAFF', personId: teacher.teacher_id, sessionType: 'class_exit' });
      }

      return sendResult(200, {
        success: true,
        action: 'duplicate',
        code: 'PERIOD_ATTENDANCE_COMPLETED',
        message: 'you doneee your all attendance for this period',
      }, { schoolId, cardUid: cardUID, attendanceDate: dateStr, personType: 'STAFF', personId: teacher.teacher_id, sessionType: 'class_done' });
    }

    const [studentRows] = await promisePool.query(
      `SELECT s.id, s.school_id, CONCAT(COALESCE(s.first_name, ''), ' ', COALESCE(s.last_name, '')) AS person_name, s.student_uid AS person_ref
       FROM students s
       WHERE UPPER(TRIM(COALESCE(s.rfid_uid, ''))) = ?
       LIMIT 2`,
      [cardUID]
    );
    const [staffRows] = await promisePool.query(
      `SELECT u.id, u.school_id, TRIM(CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, ''))) AS person_name, u.user_uid AS person_ref
       FROM users u
       WHERE UPPER(TRIM(COALESCE(u.rfid_uid, ''))) = ? AND u.deleted_at IS NULL
       LIMIT 2`,
      [cardUID]
    );
    const matches = [
      ...(studentRows || []).map((r) => ({ ...r, person_type: 'STUDENT' })),
      ...(staffRows || []).map((r) => ({ ...r, person_type: 'STAFF' })),
    ];
    if (!matches.length) {
      return sendResult(404, {
        success: false,
        code: 'CARD_NOT_REGISTERED',
        message: 'You are not exist in system. Card not registered.',
        data: { card_uid: cardUID, device_id: deviceID },
      }, { cardUid: cardUID });
    }
    if (matches.length > 1) {
      return sendResult(409, {
        success: false,
        code: 'DUPLICATE_CARD_UID',
        message: 'Card UID is linked to multiple users. Please fix card registration first.',
      }, { cardUid: cardUID });
    }
    const person = matches[0];
    const schoolId = Number(person.school_id || 0);
    if (!schoolId) return sendResult(400, { success: false, code: 'SCHOOL_NOT_FOUND', message: 'Card owner has no school.' }, { cardUid: cardUID });

    const settings = await getSchoolGateAttendanceSettings(schoolId);
    const { dateStr, mins } = currentSchoolDateAndMinutes();
    const morningDeadlineM = minutesOf(settings.morning_deadline);
    const morningCutoffM = minutesOf(settings.morning_cutoff);
    const eveningStartM = minutesOf(settings.evening_start);
    const eveningCutoffM = minutesOf(settings.evening_cutoff);
    if (
      morningDeadlineM == null ||
      morningCutoffM == null ||
      eveningStartM == null ||
      eveningCutoffM == null ||
      morningDeadlineM > morningCutoffM ||
      eveningStartM >= eveningCutoffM ||
      morningCutoffM >= eveningStartM
    ) {
      return sendResult(403, {
        success: false,
        code: 'INVALID_GATE_SETTINGS',
        message:
          'Gate time settings are invalid. Ensure: morning deadline <= morning cutoff < evening open < evening close.',
      }, { schoolId, cardUid: cardUID, attendanceDate: dateStr });
    }

    const [[existing]] = await promisePool.query(
      `SELECT id, morning_check_in, morning_status, evening_check_out, evening_status
       FROM school_gate_attendance_records
       WHERE school_id = ? AND attendance_date = ? AND card_uid = ?
       LIMIT 1`,
      [schoolId, dateStr, cardUID]
    );

    if (!existing) {
      // If first tap happens in evening window, allow direct exit log (no morning record).
      if (mins >= eveningStartM && mins <= eveningCutoffM) {
        const academicMeta = await getSchoolAcademicMetaForDate(schoolId, dateStr);
        await promisePool.query(
          `INSERT INTO school_gate_attendance_records
           (school_id, attendance_date, card_uid, person_type, person_id, person_name, person_ref, evening_check_out, evening_status, evening_device_id, academic_year, term)
           VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), 'Exit', ?, ?, ?)`,
          [
            schoolId,
            dateStr,
            cardUID,
            person.person_type,
            person.id,
            String(person.person_name || '').trim() || 'Unknown',
            person.person_ref || null,
            deviceID,
            academicMeta.academicYear,
            academicMeta.term,
          ]
        );
        return sendResult(200, {
          success: true,
          code: 'EVENING_RECORDED_NO_MORNING',
          message: 'Evening exit attendance recorded (no morning entry found).',
          data: {
            session: 'evening',
            status: 'Exit',
            date: dateStr,
            card_uid: cardUID,
            person: { type: person.person_type, id: person.id, name: person.person_name, ref: person.person_ref || null },
          },
        }, { schoolId, cardUid: cardUID, attendanceDate: dateStr, personType: person.person_type, personId: person.id, sessionType: 'evening' });
      }

      if (morningCutoffM != null && mins > morningCutoffM) {
        return sendResult(403, {
          success: false,
          code: 'MORNING_WINDOW_CLOSED',
          message: `Morning attendance window closed at ${settings.morning_cutoff}. Wait until evening exit opens at ${settings.evening_start}.`,
          data: { card_uid: cardUID, date: dateStr },
        }, { schoolId, cardUid: cardUID, attendanceDate: dateStr, personType: person.person_type, personId: person.id, sessionType: 'morning' });
      }
      const morningStatus = morningDeadlineM != null && mins > morningDeadlineM ? 'Late' : 'OnTime';
      const academicMeta = await getSchoolAcademicMetaForDate(schoolId, dateStr);
      await promisePool.query(
        `INSERT INTO school_gate_attendance_records
         (school_id, attendance_date, card_uid, person_type, person_id, person_name, person_ref, morning_check_in, morning_status, morning_device_id, academic_year, term)
         VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), ?, ?, ?, ?)`,
        [
          schoolId,
          dateStr,
          cardUID,
          person.person_type,
          person.id,
          String(person.person_name || '').trim() || 'Unknown',
          person.person_ref || null,
          morningStatus,
          deviceID,
          academicMeta.academicYear,
          academicMeta.term,
        ]
      );
      return sendResult(200, {
        success: true,
        code: 'MORNING_RECORDED',
        message: morningStatus === 'Late' ? 'Morning attendance recorded as Late.' : 'Morning attendance recorded.',
        data: {
          session: 'morning',
          status: morningStatus,
          date: dateStr,
          card_uid: cardUID,
          person: { type: person.person_type, id: person.id, name: person.person_name, ref: person.person_ref || null },
        },
      }, { schoolId, cardUid: cardUID, attendanceDate: dateStr, personType: person.person_type, personId: person.id, sessionType: 'morning' });
    }

    if (!existing.evening_check_out) {
      if (eveningStartM != null && mins < eveningStartM) {
        return sendResult(403, {
          success: false,
          code: 'EVENING_NOT_OPEN',
          message: `Evening exit attendance opens at ${settings.evening_start}.`,
          data: { card_uid: cardUID, date: dateStr },
        }, { schoolId, cardUid: cardUID, attendanceDate: dateStr, personType: person.person_type, personId: person.id, sessionType: 'evening' });
      }
      if (eveningCutoffM != null && mins > eveningCutoffM) {
        return sendResult(403, {
          success: false,
          code: 'EVENING_WINDOW_CLOSED',
          message: `Evening exit attendance closed at ${settings.evening_cutoff}.`,
          data: { card_uid: cardUID, date: dateStr },
        }, { schoolId, cardUid: cardUID, attendanceDate: dateStr, personType: person.person_type, personId: person.id, sessionType: 'evening' });
      }
      await promisePool.query(
        `UPDATE school_gate_attendance_records
         SET evening_check_out = NOW(), evening_status = 'Exit', evening_device_id = ?
         WHERE id = ?`,
        [deviceID, existing.id]
      );
      return sendResult(200, {
        success: true,
        code: 'EVENING_RECORDED',
        message: 'Evening exit attendance recorded.',
        data: {
          session: 'evening',
          status: 'Exit',
          date: dateStr,
          card_uid: cardUID,
          person: { type: person.person_type, id: person.id, name: person.person_name, ref: person.person_ref || null },
        },
      }, { schoolId, cardUid: cardUID, attendanceDate: dateStr, personType: person.person_type, personId: person.id, sessionType: 'evening' });
    }

    return sendResult(200, {
      success: false,
      code: 'ALREADY_COMPLETED',
      message: 'Morning and evening attendance already recorded for today.',
      data: {
        card_uid: cardUID,
        date: dateStr,
        morning_check_in: existing.morning_check_in,
        evening_check_out: existing.evening_check_out,
      },
    }, { schoolId, cardUid: cardUID, attendanceDate: dateStr, personType: person.person_type, personId: person.id });
  } catch (err) {
    console.error('POST /gate_attendance', err);
    return next(err);
  }
});

router.use(ensureProSchoolAccess);

router.post('/gate/scan/verify', requireRole(GATE_ROLES), async (req, res) => {
  try {
    await ensurePermissionTrackingColumns();
    const schoolId = resolveSchoolId(req);
    const userId = resolveUserId(req);
    if (!schoolId) return res.status(400).json({ success: false, code: 'SCHOOL_CONTEXT_MISSING', message: 'School context missing.' });

    const raw = cleanStr(req.body?.raw || req.body?.qr_raw || req.body?.value, 2048);
    const deviceId = cleanOptional(req.body?.device_id || req.body?.deviceId, 80);
    const gatePoint = cleanOptional(req.body?.gate_point || req.body?.gatePoint, 80);
    const actionTypeRaw = cleanStr(req.body?.action_type || req.body?.scan_mode || 'EXIT', 20).toUpperCase();
    const actionType = actionTypeRaw === 'RETURN' || actionTypeRaw === 'BACK' ? 'RETURN' : 'EXIT';
    const parsedRef = parseStudentRefFromQrRaw(raw);
    const nowLocal = currentSchoolDateTimeSql();
    const { dateStr } = currentSchoolDateAndMinutes();

    const logEvent = async (payload, httpStatus, personId = null) => {
      await logGateAttendanceEvent({
        schoolId,
        deviceId,
        cardUid: cleanOptional(parsedRef || raw, 64),
        resultCode: payload?.reasonCode || payload?.code || 'UNKNOWN',
        httpStatus,
        message: payload?.message || null,
        sessionType: 'gate_scan_verify',
        personType: personId ? 'STUDENT' : null,
        personId: personId || null,
        attendanceDate: dateStr,
      });
      return payload;
    };

    if (!raw || !parsedRef) {
      const payload = await logEvent({
        success: false,
        allowed: false,
        reasonCode: 'INVALID_QR',
        message: 'Invalid QR data. Use a valid student QR code.',
      }, 400);
      return res.status(400).json(payload);
    }

    const [studentRows] = await promisePool.query(
      `SELECT
         s.id,
         s.school_id,
         TRIM(CONCAT(COALESCE(s.first_name,''), ' ', COALESCE(s.last_name,''))) AS full_name,
         s.first_name,
         s.last_name,
         COALESCE(s.class_name, '') AS class_name,
         COALESCE(s.student_uid, '') AS student_uid,
         COALESCE(s.student_code, '') AS student_code
       FROM students s
       WHERE s.school_id = ?
         AND (
           CAST(s.id AS CHAR) = ?
           OR UPPER(COALESCE(s.student_uid, '')) = UPPER(?)
           OR UPPER(COALESCE(s.student_code, '')) = UPPER(?)
         )
       LIMIT 1`,
      [schoolId, parsedRef, parsedRef, parsedRef]
    );
    const student = studentRows?.[0];
    if (!student) {
      const payload = await logEvent({
        success: false,
        allowed: false,
        reasonCode: 'STUDENT_NOT_FOUND',
        message: 'Student not found for this school.',
      }, 404);
      return res.status(404).json(payload);
    }

    const studentPayload = {
      id: student.id,
      first_name: student.first_name,
      last_name: student.last_name,
      full_name: student.full_name || `${student.first_name || ''} ${student.last_name || ''}`.trim(),
      class_name: student.class_name || null,
      student_uid: student.student_uid || null,
      student_code: student.student_code || null,
    };

    if (actionType === 'EXIT') {
      const [activeRows] = await promisePool.query(
        `SELECT id, starts_at, ends_at, reason, permission_type, status, approved_by_user_id,
                actual_out_at, actual_return_at, gate_scan_state, exceeded_minutes
         FROM student_permissions
         WHERE school_id = ?
           AND student_id = ?
           AND status = 'APPROVED'
           AND starts_at <= ?
           AND ends_at >= ?
         ORDER BY ends_at ASC
         LIMIT 1`,
        [schoolId, student.id, nowLocal, nowLocal]
      );
      const activePerm = activeRows?.[0] || null;
      if (!activePerm) {
        const [latestRows] = await promisePool.query(
          `SELECT id, starts_at, ends_at, reason, permission_type, status, gate_scan_state
           FROM student_permissions
           WHERE school_id = ? AND student_id = ?
           ORDER BY ends_at DESC, id DESC
           LIMIT 1`,
          [schoolId, student.id]
        );
        const latest = latestRows?.[0] || null;
        const reasonCode = latest && ['BACK', 'EXCEEDED'].includes(String(latest.gate_scan_state || '')) ? 'PERMISSION_EXPIRED' : (latest ? 'NO_ACTIVE_PERMISSION_WINDOW' : 'NO_PERMISSION');
        const message = reasonCode === 'PERMISSION_EXPIRED'
          ? 'This permission is already completed/expired. Request a new permission.'
          : (latest ? 'Student has no active permission at this time.' : 'Student has no permission assigned.');
        const denied = await logEvent({
          success: true,
          allowed: false,
          action: 'EXIT',
          reasonCode,
          message,
          student: studentPayload,
          permission: latest ? { id: latest.id, starts_at: latest.starts_at, ends_at: latest.ends_at, status: latest.status, reason: latest.reason, permission_type: latest.permission_type, gate_scan_state: latest.gate_scan_state || 'NOT_USED', is_active_now: false } : null,
          meta: { parsed_ref: parsedRef, gate_point: gatePoint },
        }, 200, student.id);
        await promisePool.query(
          `INSERT INTO school_gate_logs
           (school_id, person_name, person_type, person_ref, action_type, notes, created_by_user_id)
           VALUES (?, ?, 'STUDENT', ?, 'IN', ?, ?)`,
          [schoolId, studentPayload.full_name || 'Unknown Student', studentPayload.student_code || studentPayload.student_uid || String(student.id), `Gate exit denied (${reasonCode}) at ${gatePoint || 'main_gate'}.`, userId]
        ).catch(() => {});
        return res.json(denied);
      }

      if (String(activePerm.gate_scan_state || 'NOT_USED') === 'OUT') {
        return res.json(await logEvent({
          success: true,
          allowed: false,
          action: 'EXIT',
          reasonCode: 'ALREADY_OUT',
          message: 'Student is already marked out of school.',
          student: studentPayload,
          permission: { id: activePerm.id, starts_at: activePerm.starts_at, ends_at: activePerm.ends_at, status: activePerm.status, reason: activePerm.reason, permission_type: activePerm.permission_type, gate_scan_state: 'OUT', is_active_now: true },
          meta: { parsed_ref: parsedRef, gate_point: gatePoint },
        }, 200, student.id));
      }

      if (['BACK', 'EXCEEDED'].includes(String(activePerm.gate_scan_state || ''))) {
        return res.json(await logEvent({
          success: true,
          allowed: false,
          action: 'EXIT',
          reasonCode: 'PERMISSION_EXPIRED',
          message: 'Permission already completed. Request a new permission.',
          student: studentPayload,
          permission: { id: activePerm.id, starts_at: activePerm.starts_at, ends_at: activePerm.ends_at, status: activePerm.status, reason: activePerm.reason, permission_type: activePerm.permission_type, gate_scan_state: activePerm.gate_scan_state, is_active_now: false },
          meta: { parsed_ref: parsedRef, gate_point: gatePoint },
        }, 200, student.id));
      }

      await promisePool.query(
        `UPDATE student_permissions
         SET actual_out_at = COALESCE(actual_out_at, ?),
             gate_scan_state = 'OUT',
             last_gate_action_at = ?,
             exceeded_minutes = 0
         WHERE id = ?`,
        [nowLocal, nowLocal, activePerm.id]
      );

      const payload = await logEvent({
        success: true,
        allowed: true,
        action: 'EXIT',
        reasonCode: 'EXIT_ALLOWED',
        message: 'Allowed. Student marked out of school.',
        student: studentPayload,
        permission: {
          id: activePerm.id,
          starts_at: activePerm.starts_at,
          ends_at: activePerm.ends_at,
          status: activePerm.status,
          reason: activePerm.reason,
          permission_type: activePerm.permission_type,
          approved_by_user_id: activePerm.approved_by_user_id || null,
          gate_scan_state: 'OUT',
          actual_out_at: nowLocal,
          actual_return_at: null,
          exceeded_minutes: 0,
          is_active_now: true,
        },
        meta: { parsed_ref: parsedRef, gate_point: gatePoint },
      }, 200, student.id);

      await promisePool.query(
        `INSERT INTO school_gate_logs
         (school_id, person_name, person_type, person_ref, action_type, notes, created_by_user_id)
         VALUES (?, ?, 'STUDENT', ?, 'OUT', ?, ?)`,
        [schoolId, studentPayload.full_name || 'Unknown Student', studentPayload.student_code || studentPayload.student_uid || String(student.id), `Marked OUT by gate scan (permission #${activePerm.id}) at ${gatePoint || 'main_gate'}.`, userId]
      ).catch(() => {});
      return res.json(payload);
    }

    const [outRows] = await promisePool.query(
      `SELECT id, starts_at, ends_at, reason, permission_type, status, approved_by_user_id,
              actual_out_at, actual_return_at, gate_scan_state, exceeded_minutes,
              TIMESTAMPDIFF(MINUTE, ends_at, ?) AS exceed_now_minutes
       FROM student_permissions
       WHERE school_id = ?
         AND student_id = ?
         AND status = 'APPROVED'
         AND (gate_scan_state = 'OUT' OR (actual_out_at IS NOT NULL AND actual_return_at IS NULL))
       ORDER BY COALESCE(actual_out_at, starts_at) DESC, id DESC
       LIMIT 1`,
      [nowLocal, schoolId, student.id]
    );
    const activeOut = outRows?.[0] || null;
    if (!activeOut) {
      const [latestRows] = await promisePool.query(
        `SELECT id, starts_at, ends_at, reason, permission_type, status, gate_scan_state
         FROM student_permissions
         WHERE school_id = ? AND student_id = ?
         ORDER BY ends_at DESC, id DESC
         LIMIT 1`,
        [schoolId, student.id]
      );
      const latest = latestRows?.[0] || null;
      const reasonCode = latest && ['BACK', 'EXCEEDED'].includes(String(latest.gate_scan_state || '')) ? 'PERMISSION_EXPIRED' : 'NO_ACTIVE_OUT_RECORD';
      const message = reasonCode === 'PERMISSION_EXPIRED'
        ? 'Permission already completed. Request a new permission.'
        : 'Student is not currently marked out of school.';
      return res.json(await logEvent({
        success: true,
        allowed: false,
        action: 'RETURN',
        reasonCode,
        message,
        student: studentPayload,
        permission: latest ? { id: latest.id, starts_at: latest.starts_at, ends_at: latest.ends_at, status: latest.status, reason: latest.reason, permission_type: latest.permission_type, gate_scan_state: latest.gate_scan_state || 'NOT_USED', is_active_now: false } : null,
        meta: { parsed_ref: parsedRef, gate_point: gatePoint },
      }, 200, student.id));
    }

    const exceededMinutes = Math.max(0, Number(activeOut.exceed_now_minutes || 0));
    const exceeded = exceededMinutes > 0;
    await promisePool.query(
      `UPDATE student_permissions
       SET actual_return_at = ?,
           gate_scan_state = ?,
           exceeded_minutes = ?,
           last_gate_action_at = ?
       WHERE id = ?`,
      [nowLocal, exceeded ? 'EXCEEDED' : 'BACK', exceededMinutes, nowLocal, activeOut.id]
    );

    const payload = await logEvent({
      success: true,
      allowed: !exceeded,
      action: 'RETURN',
      reasonCode: exceeded ? 'RETURN_EXCEEDED' : 'RETURN_ON_TIME',
      message: exceeded
        ? `Back to school recorded but exceeded return time by ${exceededMinutes} minute(s).`
        : 'Back to school recorded on time.',
      student: studentPayload,
      permission: {
        id: activeOut.id,
        starts_at: activeOut.starts_at,
        ends_at: activeOut.ends_at,
        status: activeOut.status,
        reason: activeOut.reason,
        permission_type: activeOut.permission_type,
        approved_by_user_id: activeOut.approved_by_user_id || null,
        gate_scan_state: exceeded ? 'EXCEEDED' : 'BACK',
        actual_out_at: activeOut.actual_out_at || null,
        actual_return_at: nowLocal,
        exceeded_minutes: exceededMinutes,
        exceeded_hours: Number((exceededMinutes / 60).toFixed(2)),
        exceeded_days: Number((exceededMinutes / 1440).toFixed(2)),
        is_active_now: false,
      },
      meta: { parsed_ref: parsedRef, gate_point: gatePoint },
    }, 200, student.id);

    await promisePool.query(
      `INSERT INTO school_gate_logs
       (school_id, person_name, person_type, person_ref, action_type, notes, created_by_user_id)
       VALUES (?, ?, 'STUDENT', ?, 'IN', ?, ?)`,
      [
        schoolId,
        studentPayload.full_name || 'Unknown Student',
        studentPayload.student_code || studentPayload.student_uid || String(student.id),
        exceeded
          ? `Returned EXCEEDED by ${exceededMinutes} minute(s) (permission #${activeOut.id}) at ${gatePoint || 'main_gate'}.`
          : `Returned ON TIME (permission #${activeOut.id}) at ${gatePoint || 'main_gate'}.`,
        userId,
      ]
    ).catch(() => {});

    return res.json(payload);
  } catch (err) {
    console.error('POST /gate/scan/verify', err);
    return res.status(500).json({ success: false, code: 'VERIFY_FAILED', message: 'Failed to verify gate scan.' });
  }
});

router.get('/gate/scan/logs', requireRole(GATE_ROLES), async (req, res) => {
  try {
    const schoolId = resolveSchoolId(req);
    if (!schoolId) return res.status(400).json({ success: false, message: 'School context missing.' });
    const limit = Math.min(300, Math.max(10, Number(req.query?.limit) || 100));
    const [rows] = await promisePool.query(
      `SELECT
         e.id,
         e.school_id,
         e.device_id,
         e.card_uid,
         e.result_code,
         e.http_status,
         e.message,
         e.session_type,
         e.person_type,
         e.person_id,
         e.attendance_date,
         e.created_at,
         TRIM(CONCAT(COALESCE(s.first_name,''), ' ', COALESCE(s.last_name,''))) AS student_name,
         COALESCE(s.class_name, '') AS class_name,
         COALESCE(s.student_uid, '') AS student_uid,
         COALESCE(s.student_code, '') AS student_code
       FROM school_gate_attendance_events e
       LEFT JOIN students s
         ON e.person_type = 'STUDENT'
        AND e.person_id = s.id
        AND s.school_id = e.school_id
       WHERE e.school_id = ?
         AND e.session_type = 'gate_scan_verify'
       ORDER BY e.id DESC
       LIMIT ?`,
      [schoolId, limit]
    );
    return res.json({ success: true, data: rows || [] });
  } catch (err) {
    console.error('GET /gate/scan/logs', err);
    return res.status(500).json({ success: false, message: 'Failed to load gate scan logs.' });
  }
});

router.get('/gate/attendance/settings', requireRole(GATE_ATTENDANCE_ADMIN_ROLES), async (req, res) => {
  try {
    const schoolId = resolveSchoolId(req);
    if (!schoolId) return res.status(400).json({ success: false, message: 'School context missing.' });
    const data = await getSchoolGateAttendanceSettings(schoolId);
    return res.json({ success: true, data });
  } catch (err) {
    console.error('GET /gate/attendance/settings', err);
    return res.status(500).json({ success: false, message: 'Failed to load gate attendance settings.' });
  }
});

router.put('/gate/attendance/settings', requireRole(GATE_ATTENDANCE_ADMIN_ROLES), async (req, res) => {
  try {
    const schoolId = resolveSchoolId(req);
    const userId = resolveUserId(req);
    if (!schoolId) return res.status(400).json({ success: false, message: 'School context missing.' });
    const morningDeadline = hhmm(req.body?.morningDeadline || req.body?.morning_deadline);
    const morningCutoff = hhmm(req.body?.morningCutoff || req.body?.morning_cutoff);
    const eveningStart = hhmm(req.body?.eveningStart || req.body?.evening_start);
    const eveningCutoff = hhmm(req.body?.eveningCutoff || req.body?.evening_cutoff);
    if (!morningDeadline || !morningCutoff || !eveningStart || !eveningCutoff) {
      return res.status(400).json({ success: false, message: 'All four time settings are required in HH:MM format.' });
    }
    const mDeadline = minutesOf(morningDeadline);
    const mCutoff = minutesOf(morningCutoff);
    const eStart = minutesOf(eveningStart);
    const eCutoff = minutesOf(eveningCutoff);
    if (mDeadline > mCutoff) {
      return res.status(400).json({ success: false, message: 'Morning on-time deadline must be before or equal to morning cutoff.' });
    }
    if (eStart >= eCutoff) {
      return res.status(400).json({ success: false, message: 'Evening exit open time must be before evening exit close time.' });
    }
    if (mCutoff >= eStart) {
      return res.status(400).json({ success: false, message: 'Morning cutoff must be before evening exit open time.' });
    }
    await promisePool.query(
      `INSERT INTO school_gate_attendance_settings
       (school_id, morning_deadline, morning_cutoff, evening_start, evening_cutoff, updated_by_user_id)
       VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         morning_deadline = VALUES(morning_deadline),
         morning_cutoff = VALUES(morning_cutoff),
         evening_start = VALUES(evening_start),
         evening_cutoff = VALUES(evening_cutoff),
         updated_by_user_id = VALUES(updated_by_user_id)`,
      [schoolId, morningDeadline, morningCutoff, eveningStart, eveningCutoff, userId]
    );
    return res.json({
      success: true,
      data: {
        morning_deadline: morningDeadline,
        morning_cutoff: morningCutoff,
        evening_start: eveningStart,
        evening_cutoff: eveningCutoff,
      },
      message: 'Gate attendance settings saved.',
    });
  } catch (err) {
    console.error('PUT /gate/attendance/settings', err);
    return res.status(500).json({ success: false, message: 'Failed to save gate attendance settings.' });
  }
});

router.get('/gate/attendance/latest-event', requireRole(GATE_ATTENDANCE_ADMIN_ROLES), async (req, res) => {
  try {
    const schoolId = resolveSchoolId(req);
    if (!schoolId) return res.status(400).json({ success: false, message: 'School context missing.' });
    const [[row]] = await promisePool.query(
      `SELECT
         id, school_id, device_id, card_uid, result_code, http_status, message,
         session_type, person_type, person_id, attendance_date, created_at
       FROM school_gate_attendance_events
       WHERE school_id = ?
       ORDER BY id DESC
       LIMIT 1`,
      [schoolId]
    );
    return res.json({ success: true, data: row || null });
  } catch (err) {
    console.error('GET /gate/attendance/latest-event', err);
    return res.status(500).json({ success: false, message: 'Failed to load latest gate event.' });
  }
});

router.get('/gate/attendance/today', requireRole(GATE_ATTENDANCE_ADMIN_ROLES), async (req, res) => {
  try {
    const schoolId = resolveSchoolId(req);
    if (!schoolId) return res.status(400).json({ success: false, message: 'School context missing.' });
    const date = cleanStr(req.query?.date, 20) || currentSchoolDateAndMinutes().dateStr;
    const [rows] = await promisePool.query(
      `SELECT
         id, attendance_date, card_uid, person_type, person_id, person_name, person_ref,
         morning_check_in, morning_status, evening_check_out, evening_status, term, academic_year
       FROM school_gate_attendance_records
       WHERE school_id = ? AND attendance_date = ?
       ORDER BY COALESCE(morning_check_in, created_at) DESC, id DESC`,
      [schoolId, date]
    );
    return res.json({ success: true, data: rows || [] });
  } catch (err) {
    console.error('GET /gate/attendance/today', err);
    return res.status(500).json({ success: false, message: 'Failed to load today gate attendance.' });
  }
});

router.get('/gate/attendance/logs', requireRole(GATE_ATTENDANCE_ADMIN_ROLES), async (req, res) => {
  try {
    const schoolId = resolveSchoolId(req);
    if (!schoolId) return res.status(400).json({ success: false, message: 'School context missing.' });

    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(200, Math.max(10, Number(req.query.limit) || 50));
    const offset = (page - 1) * limit;

    const fromDate = cleanStr(req.query.from_date, 20);
    const toDate = cleanStr(req.query.to_date, 20);
    const role = cleanStr(req.query.role, 20).toUpperCase();
    const session = cleanStr(req.query.session, 20).toLowerCase();
    const termQ = cleanStr(req.query.term, 40);
    const academicYearQ = cleanStr(req.query.academic_year, 40);
    const q = cleanStr(req.query.search, 120).toLowerCase();
    const contextDate = fromDate || toDate || currentSchoolDateAndMinutes().dateStr;
    const { term, academicYear } = await resolveAcademicContext(schoolId, academicYearQ, termQ, contextDate);

    let where = 'WHERE school_id = ?';
    const params = [schoolId];

    if (fromDate) { where += ' AND attendance_date >= ?'; params.push(fromDate); }
    if (toDate) { where += ' AND attendance_date <= ?'; params.push(toDate); }
    if (role && ['STUDENT', 'STAFF'].includes(role)) { where += ' AND person_type = ?'; params.push(role); }
    if (term) { where += ' AND term = ?'; params.push(term); }
    if (academicYear) { where += ' AND academic_year = ?'; params.push(academicYear); }
    if (session === 'morning_only') where += ' AND morning_check_in IS NOT NULL AND evening_check_out IS NULL';
    if (session === 'evening_only') where += ' AND morning_check_in IS NULL AND evening_check_out IS NOT NULL';
    if (session === 'both') where += ' AND morning_check_in IS NOT NULL AND evening_check_out IS NOT NULL';
    if (q) {
      where += ` AND (
        LOWER(COALESCE(person_name,'')) LIKE ?
        OR LOWER(COALESCE(person_ref,'')) LIKE ?
        OR LOWER(COALESCE(card_uid,'')) LIKE ?
      )`;
      const like = `%${q}%`;
      params.push(like, like, like);
    }

    const [[countRow]] = await promisePool.query(
      `SELECT COUNT(*) AS total
       FROM school_gate_attendance_records
       ${where}`,
      params
    );
    const total = Number(countRow?.total || 0);

    const [rows] = await promisePool.query(
      `SELECT
         id, attendance_date, card_uid, person_type, person_id, person_name, person_ref,
         morning_check_in, morning_status, evening_check_out, evening_status,
         term, academic_year, created_at, updated_at
       FROM school_gate_attendance_records
       ${where}
       ORDER BY attendance_date DESC, COALESCE(evening_check_out, morning_check_in, created_at) DESC, id DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    return res.json({
      success: true,
      data: rows || [],
      pagination: {
        page,
        limit,
        total,
        total_pages: Math.max(1, Math.ceil(total / limit)),
      },
      meta: { term, academic_year: academicYear },
    });
  } catch (err) {
    console.error('GET /gate/attendance/logs', err);
    return res.status(500).json({ success: false, message: 'Failed to load gate attendance logs.' });
  }
});

router.delete('/gate/attendance/today/:cardUid', requireRole(GATE_ATTENDANCE_ADMIN_ROLES), async (req, res) => {
  try {
    const schoolId = resolveSchoolId(req);
    if (!schoolId) return res.status(400).json({ success: false, message: 'School context missing.' });
    const cardUid = normalizeUid(req.params?.cardUid);
    const date = cleanStr(req.query?.date, 20) || currentSchoolDateAndMinutes().dateStr;
    if (!cardUid) return res.status(400).json({ success: false, message: 'cardUid is required.' });
    const [del] = await promisePool.query(
      `DELETE FROM school_gate_attendance_records
       WHERE school_id = ? AND attendance_date = ? AND card_uid = ?`,
      [schoolId, date, cardUid]
    );
    return res.json({ success: true, deleted: Number(del?.affectedRows || 0) });
  } catch (err) {
    console.error('DELETE /gate/attendance/today/:cardUid', err);
    return res.status(500).json({ success: false, message: 'Failed to delete gate attendance record.' });
  }
});

router.post('/gate/attendance/today/delete-selected', requireRole(GATE_ATTENDANCE_ADMIN_ROLES), async (req, res) => {
  try {
    const schoolId = resolveSchoolId(req);
    if (!schoolId) return res.status(400).json({ success: false, message: 'School context missing.' });
    const date = cleanStr(req.body?.date, 20) || currentSchoolDateAndMinutes().dateStr;
    const raw = Array.isArray(req.body?.card_uids) ? req.body.card_uids : [];
    const cardUids = [...new Set(raw.map((x) => normalizeUid(x)).filter(Boolean))].slice(0, 500);
    if (!cardUids.length) return res.status(400).json({ success: false, message: 'No card_uids provided.' });
    const placeholders = cardUids.map(() => '?').join(',');
    const [del] = await promisePool.query(
      `DELETE FROM school_gate_attendance_records
       WHERE school_id = ? AND attendance_date = ? AND card_uid IN (${placeholders})`,
      [schoolId, date, ...cardUids]
    );
    return res.json({ success: true, deleted: Number(del?.affectedRows || 0) });
  } catch (err) {
    console.error('POST /gate/attendance/today/delete-selected', err);
    return res.status(500).json({ success: false, message: 'Failed to delete selected gate records.' });
  }
});

router.delete('/gate/attendance/today', requireRole(GATE_ATTENDANCE_ADMIN_ROLES), async (req, res) => {
  try {
    const schoolId = resolveSchoolId(req);
    if (!schoolId) return res.status(400).json({ success: false, message: 'School context missing.' });
    const date = cleanStr(req.query?.date, 20) || currentSchoolDateAndMinutes().dateStr;
    const [del] = await promisePool.query(
      `DELETE FROM school_gate_attendance_records
       WHERE school_id = ? AND attendance_date = ?`,
      [schoolId, date]
    );
    return res.json({ success: true, deleted: Number(del?.affectedRows || 0) });
  } catch (err) {
    console.error('DELETE /gate/attendance/today', err);
    return res.status(500).json({ success: false, message: 'Failed to delete all gate records for date.' });
  }
});

router.get('/library/books', requireRole(LIBRARY_ROLES), async (req, res) => {
  try {
    const schoolId = resolveSchoolId(req);
    if (!schoolId) return res.status(400).json({ success: false, message: 'School context missing.' });
    const [rows] = await promisePool.query(
      `SELECT * FROM school_library_books WHERE school_id = ? ORDER BY id DESC`,
      [schoolId]
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('GET /library/books', err);
    res.status(500).json({ success: false, message: 'Failed to load books.' });
  }
});

router.post('/library/books', requireRole(LIBRARY_ROLES), async (req, res) => {
  try {
    const schoolId = resolveSchoolId(req);
    const userId = resolveUserId(req);
    if (!schoolId) return res.status(400).json({ success: false, message: 'School context missing.' });
    const title = cleanStr(req.body?.title, 220);
    if (!title) return res.status(400).json({ success: false, message: 'Book title is required.' });
    const quantityTotal = Math.max(0, Math.floor(cleanNumber(req.body?.quantity_total, 1)));
    const quantityAvailable = Math.max(
      0,
      Math.min(quantityTotal, Math.floor(cleanNumber(req.body?.quantity_available, quantityTotal)))
    );
    const [result] = await promisePool.query(
      `INSERT INTO school_library_books
       (school_id, title, author, isbn, category, quantity_total, quantity_available, shelf_location, status, created_by_user_id)
       VALUES (?,?,?,?,?,?,?,?,?,?)`,
      [
        schoolId,
        title,
        cleanOptional(req.body?.author, 180),
        cleanOptional(req.body?.isbn, 80),
        cleanOptional(req.body?.category, 120),
        quantityTotal || 1,
        quantityAvailable || quantityTotal || 1,
        cleanOptional(req.body?.shelf_location, 120),
        cleanStr(req.body?.status || 'ACTIVE', 10).toUpperCase() === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE',
        userId,
      ]
    );
    res.status(201).json({ success: true, data: { id: result.insertId } });
  } catch (err) {
    console.error('POST /library/books', err);
    res.status(500).json({ success: false, message: 'Failed to create book.' });
  }
});

router.put('/library/books/:id', requireRole(LIBRARY_ROLES), async (req, res) => {
  try {
    const schoolId = resolveSchoolId(req);
    const id = Number(req.params.id);
    if (!schoolId || !id) return res.status(400).json({ success: false, message: 'Invalid request.' });
    const title = cleanStr(req.body?.title, 220);
    if (!title) return res.status(400).json({ success: false, message: 'Book title is required.' });
    const quantityTotal = Math.max(0, Math.floor(cleanNumber(req.body?.quantity_total, 1)));
    const quantityAvailable = Math.max(
      0,
      Math.min(quantityTotal, Math.floor(cleanNumber(req.body?.quantity_available, quantityTotal)))
    );
    await promisePool.query(
      `UPDATE school_library_books
       SET title = ?, author = ?, isbn = ?, category = ?, quantity_total = ?, quantity_available = ?, shelf_location = ?, status = ?
       WHERE id = ? AND school_id = ?`,
      [
        title,
        cleanOptional(req.body?.author, 180),
        cleanOptional(req.body?.isbn, 80),
        cleanOptional(req.body?.category, 120),
        quantityTotal || 1,
        quantityAvailable || quantityTotal || 1,
        cleanOptional(req.body?.shelf_location, 120),
        cleanStr(req.body?.status || 'ACTIVE', 10).toUpperCase() === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE',
        id,
        schoolId,
      ]
    );
    res.json({ success: true, message: 'Book updated.' });
  } catch (err) {
    console.error('PUT /library/books/:id', err);
    res.status(500).json({ success: false, message: 'Failed to update book.' });
  }
});

router.delete('/library/books/:id', requireRole(LIBRARY_ROLES), async (req, res) => {
  try {
    const schoolId = resolveSchoolId(req);
    const id = Number(req.params.id);
    if (!schoolId || !id) return res.status(400).json({ success: false, message: 'Invalid request.' });
    await promisePool.query(`DELETE FROM school_library_books WHERE id = ? AND school_id = ?`, [id, schoolId]);
    await promisePool.query(`DELETE FROM school_library_checkouts WHERE school_id = ? AND book_id = ?`, [schoolId, id]);
    res.json({ success: true, message: 'Book deleted.' });
  } catch (err) {
    console.error('DELETE /library/books/:id', err);
    res.status(500).json({ success: false, message: 'Failed to delete book.' });
  }
});

router.get('/library/checkouts', requireRole(LIBRARY_ROLES), async (req, res) => {
  try {
    const schoolId = resolveSchoolId(req);
    if (!schoolId) return res.status(400).json({ success: false, message: 'School context missing.' });
    const [rows] = await promisePool.query(
      `SELECT c.*, b.title AS book_title
       FROM school_library_checkouts c
       LEFT JOIN school_library_books b ON b.id = c.book_id
       WHERE c.school_id = ?
       ORDER BY c.id DESC`,
      [schoolId]
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('GET /library/checkouts', err);
    res.status(500).json({ success: false, message: 'Failed to load checkouts.' });
  }
});

router.post('/library/checkouts', requireRole(LIBRARY_ROLES), async (req, res) => {
  const conn = await promisePool.getConnection();
  try {
    const schoolId = resolveSchoolId(req);
    const userId = resolveUserId(req);
    if (!schoolId) return res.status(400).json({ success: false, message: 'School context missing.' });
    const bookId = Number(req.body?.book_id);
    const borrowerName = cleanStr(req.body?.borrower_name, 180);
    if (!bookId || !borrowerName) {
      return res.status(400).json({ success: false, message: 'Book and borrower name are required.' });
    }
    await conn.beginTransaction();
    const [[book]] = await conn.query(
      `SELECT id, quantity_available FROM school_library_books WHERE id = ? AND school_id = ? LIMIT 1`,
      [bookId, schoolId]
    );
    if (!book) {
      await conn.rollback();
      return res.status(404).json({ success: false, message: 'Book not found.' });
    }
    if (Number(book.quantity_available) <= 0) {
      await conn.rollback();
      return res.status(400).json({ success: false, message: 'No available copies for checkout.' });
    }
    await conn.query(
      `INSERT INTO school_library_checkouts
       (school_id, book_id, borrower_name, borrower_type, borrower_ref, due_date, notes, created_by_user_id)
       VALUES (?,?,?,?,?,?,?,?)`,
      [
        schoolId,
        bookId,
        borrowerName,
        cleanStr(req.body?.borrower_type || 'STUDENT', 10).toUpperCase() === 'STAFF' ? 'STAFF' : (cleanStr(req.body?.borrower_type || 'STUDENT', 10).toUpperCase() === 'VISITOR' ? 'VISITOR' : 'STUDENT'),
        cleanOptional(req.body?.borrower_ref, 120),
        cleanOptional(req.body?.due_date, 30),
        cleanOptional(req.body?.notes, 5000),
        userId,
      ]
    );
    await conn.query(
      `UPDATE school_library_books SET quantity_available = GREATEST(quantity_available - 1, 0) WHERE id = ? AND school_id = ?`,
      [bookId, schoolId]
    );
    await conn.commit();
    res.status(201).json({ success: true, message: 'Checkout recorded.' });
  } catch (err) {
    await conn.rollback().catch(() => {});
    console.error('POST /library/checkouts', err);
    res.status(500).json({ success: false, message: 'Failed to create checkout.' });
  } finally {
    conn.release();
  }
});

router.put('/library/checkouts/:id', requireRole(LIBRARY_ROLES), async (req, res) => {
  try {
    const schoolId = resolveSchoolId(req);
    const id = Number(req.params.id);
    if (!schoolId || !id) return res.status(400).json({ success: false, message: 'Invalid request.' });
    const borrowerName = cleanStr(req.body?.borrower_name, 180);
    if (!borrowerName) return res.status(400).json({ success: false, message: 'Borrower name is required.' });
    await promisePool.query(
      `UPDATE school_library_checkouts
       SET borrower_name = ?, borrower_type = ?, borrower_ref = ?, due_date = ?, notes = ?
       WHERE id = ? AND school_id = ?`,
      [
        borrowerName,
        cleanStr(req.body?.borrower_type || 'STUDENT', 10).toUpperCase() === 'STAFF' ? 'STAFF' : (cleanStr(req.body?.borrower_type || 'STUDENT', 10).toUpperCase() === 'VISITOR' ? 'VISITOR' : 'STUDENT'),
        cleanOptional(req.body?.borrower_ref, 120),
        cleanOptional(req.body?.due_date, 30),
        cleanOptional(req.body?.notes, 5000),
        id,
        schoolId,
      ]
    );
    res.json({ success: true, message: 'Checkout updated.' });
  } catch (err) {
    console.error('PUT /library/checkouts/:id', err);
    res.status(500).json({ success: false, message: 'Failed to update checkout.' });
  }
});

router.patch('/library/checkouts/:id/return', requireRole(LIBRARY_ROLES), async (req, res) => {
  const conn = await promisePool.getConnection();
  try {
    const schoolId = resolveSchoolId(req);
    const id = Number(req.params.id);
    if (!schoolId || !id) return res.status(400).json({ success: false, message: 'Invalid request.' });
    await conn.beginTransaction();
    const [[checkout]] = await conn.query(
      `SELECT id, book_id, status FROM school_library_checkouts WHERE id = ? AND school_id = ? LIMIT 1`,
      [id, schoolId]
    );
    if (!checkout) {
      await conn.rollback();
      return res.status(404).json({ success: false, message: 'Checkout not found.' });
    }
    if (checkout.status === 'RETURNED') {
      await conn.rollback();
      return res.json({ success: true, message: 'Checkout already returned.' });
    }
    await conn.query(
      `UPDATE school_library_checkouts SET status = 'RETURNED', returned_at = NOW() WHERE id = ? AND school_id = ?`,
      [id, schoolId]
    );
    await conn.query(
      `UPDATE school_library_books
       SET quantity_available = LEAST(quantity_available + 1, quantity_total)
       WHERE id = ? AND school_id = ?`,
      [checkout.book_id, schoolId]
    );
    await conn.commit();
    res.json({ success: true, message: 'Book returned successfully.' });
  } catch (err) {
    await conn.rollback().catch(() => {});
    console.error('PATCH /library/checkouts/:id/return', err);
    res.status(500).json({ success: false, message: 'Failed to return book.' });
  } finally {
    conn.release();
  }
});

router.delete('/library/checkouts/:id', requireRole(LIBRARY_ROLES), async (req, res) => {
  const conn = await promisePool.getConnection();
  try {
    const schoolId = resolveSchoolId(req);
    const id = Number(req.params.id);
    if (!schoolId || !id) return res.status(400).json({ success: false, message: 'Invalid request.' });
    await conn.beginTransaction();
    const [[checkout]] = await conn.query(
      `SELECT id, book_id, status FROM school_library_checkouts WHERE id = ? AND school_id = ? LIMIT 1`,
      [id, schoolId]
    );
    if (!checkout) {
      await conn.rollback();
      return res.status(404).json({ success: false, message: 'Checkout not found.' });
    }
    await conn.query(`DELETE FROM school_library_checkouts WHERE id = ? AND school_id = ?`, [id, schoolId]);
    if (checkout.status === 'ISSUED') {
      await conn.query(
        `UPDATE school_library_books
         SET quantity_available = LEAST(quantity_available + 1, quantity_total)
         WHERE id = ? AND school_id = ?`,
        [checkout.book_id, schoolId]
      );
    }
    await conn.commit();
    res.json({ success: true, message: 'Checkout removed.' });
  } catch (err) {
    await conn.rollback().catch(() => {});
    console.error('DELETE /library/checkouts/:id', err);
    res.status(500).json({ success: false, message: 'Failed to delete checkout.' });
  } finally {
    conn.release();
  }
});

router.get('/stock/items', requireRole(STOCK_ROLES), async (req, res) => {
  try {
    const schoolId = resolveSchoolId(req);
    if (!schoolId) return res.status(400).json({ success: false, message: 'School context missing.' });
    const [rows] = await promisePool.query(
      `SELECT * FROM school_stock_items WHERE school_id = ? ORDER BY id DESC`,
      [schoolId]
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('GET /stock/items', err);
    res.status(500).json({ success: false, message: 'Failed to load stock items.' });
  }
});

router.post('/stock/items', requireRole(STOCK_ROLES), async (req, res) => {
  try {
    const schoolId = resolveSchoolId(req);
    const userId = resolveUserId(req);
    if (!schoolId) return res.status(400).json({ success: false, message: 'School context missing.' });
    const itemName = cleanStr(req.body?.item_name, 200);
    if (!itemName) return res.status(400).json({ success: false, message: 'Item name is required.' });
    const openingQty = cleanNumber(req.body?.opening_qty, 0);
    const [result] = await promisePool.query(
      `INSERT INTO school_stock_items
       (school_id, item_name, sku, category, unit, reorder_level, opening_qty, current_qty, status, created_by_user_id)
       VALUES (?,?,?,?,?,?,?,?,?,?)`,
      [
        schoolId,
        itemName,
        cleanOptional(req.body?.sku, 80),
        cleanOptional(req.body?.category, 120),
        cleanStr(req.body?.unit || 'pcs', 40),
        Math.max(0, cleanNumber(req.body?.reorder_level, 0)),
        openingQty,
        openingQty,
        cleanStr(req.body?.status || 'ACTIVE', 10).toUpperCase() === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE',
        userId,
      ]
    );
    res.status(201).json({ success: true, data: { id: result.insertId } });
  } catch (err) {
    console.error('POST /stock/items', err);
    res.status(500).json({ success: false, message: 'Failed to create stock item.' });
  }
});

router.put('/stock/items/:id', requireRole(STOCK_ROLES), async (req, res) => {
  try {
    const schoolId = resolveSchoolId(req);
    const id = Number(req.params.id);
    if (!schoolId || !id) return res.status(400).json({ success: false, message: 'Invalid request.' });
    const itemName = cleanStr(req.body?.item_name, 200);
    if (!itemName) return res.status(400).json({ success: false, message: 'Item name is required.' });
    await promisePool.query(
      `UPDATE school_stock_items
       SET item_name = ?, sku = ?, category = ?, unit = ?, reorder_level = ?, opening_qty = ?, status = ?
       WHERE id = ? AND school_id = ?`,
      [
        itemName,
        cleanOptional(req.body?.sku, 80),
        cleanOptional(req.body?.category, 120),
        cleanStr(req.body?.unit || 'pcs', 40),
        Math.max(0, cleanNumber(req.body?.reorder_level, 0)),
        cleanNumber(req.body?.opening_qty, 0),
        cleanStr(req.body?.status || 'ACTIVE', 10).toUpperCase() === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE',
        id,
        schoolId,
      ]
    );
    await recalculateStockCurrentQty(schoolId, id);
    res.json({ success: true, message: 'Stock item updated.' });
  } catch (err) {
    console.error('PUT /stock/items/:id', err);
    res.status(500).json({ success: false, message: 'Failed to update stock item.' });
  }
});

router.delete('/stock/items/:id', requireRole(STOCK_ROLES), async (req, res) => {
  try {
    const schoolId = resolveSchoolId(req);
    const id = Number(req.params.id);
    if (!schoolId || !id) return res.status(400).json({ success: false, message: 'Invalid request.' });
    await promisePool.query(`DELETE FROM school_stock_movements WHERE school_id = ? AND item_id = ?`, [schoolId, id]);
    await promisePool.query(`DELETE FROM school_stock_items WHERE id = ? AND school_id = ?`, [id, schoolId]);
    res.json({ success: true, message: 'Stock item deleted.' });
  } catch (err) {
    console.error('DELETE /stock/items/:id', err);
    res.status(500).json({ success: false, message: 'Failed to delete stock item.' });
  }
});

router.get('/stock/movements', requireRole(STOCK_ROLES), async (req, res) => {
  try {
    const schoolId = resolveSchoolId(req);
    if (!schoolId) return res.status(400).json({ success: false, message: 'School context missing.' });
    const [rows] = await promisePool.query(
      `SELECT m.*, i.item_name
       FROM school_stock_movements m
       LEFT JOIN school_stock_items i ON i.id = m.item_id
       WHERE m.school_id = ?
       ORDER BY m.id DESC`,
      [schoolId]
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('GET /stock/movements', err);
    res.status(500).json({ success: false, message: 'Failed to load stock movements.' });
  }
});

router.post('/stock/movements', requireRole(STOCK_ROLES), async (req, res) => {
  try {
    const schoolId = resolveSchoolId(req);
    const userId = resolveUserId(req);
    if (!schoolId) return res.status(400).json({ success: false, message: 'School context missing.' });
    const itemId = Number(req.body?.item_id);
    if (!itemId) return res.status(400).json({ success: false, message: 'Item is required.' });
    const movementTypeRaw = cleanStr(req.body?.movement_type, 20).toUpperCase();
    const movementType = ['IN', 'OUT', 'ADJUSTMENT'].includes(movementTypeRaw) ? movementTypeRaw : 'IN';
    const quantity = Math.abs(cleanNumber(req.body?.quantity, 0));
    if (!quantity) return res.status(400).json({ success: false, message: 'Quantity must be greater than zero.' });
    const quantityChange = movementType === 'OUT' ? -quantity : quantity;
    await promisePool.query(
      `INSERT INTO school_stock_movements
       (school_id, item_id, movement_type, quantity_change, reason, movement_date, created_by_user_id)
       VALUES (?,?,?,?,?,?,?)`,
      [
        schoolId,
        itemId,
        movementType,
        quantityChange,
        cleanOptional(req.body?.reason, 220),
        cleanOptional(req.body?.movement_date, 40) || new Date(),
        userId,
      ]
    );
    await recalculateStockCurrentQty(schoolId, itemId);
    res.status(201).json({ success: true, message: 'Stock movement recorded.' });
  } catch (err) {
    console.error('POST /stock/movements', err);
    res.status(500).json({ success: false, message: 'Failed to create stock movement.' });
  }
});

router.put('/stock/movements/:id', requireRole(STOCK_ROLES), async (req, res) => {
  try {
    const schoolId = resolveSchoolId(req);
    const id = Number(req.params.id);
    if (!schoolId || !id) return res.status(400).json({ success: false, message: 'Invalid request.' });
    const [[prev]] = await promisePool.query(
      `SELECT id, item_id FROM school_stock_movements WHERE id = ? AND school_id = ? LIMIT 1`,
      [id, schoolId]
    );
    if (!prev) return res.status(404).json({ success: false, message: 'Movement not found.' });
    const itemId = Number(req.body?.item_id);
    if (!itemId) return res.status(400).json({ success: false, message: 'Item is required.' });
    const movementTypeRaw = cleanStr(req.body?.movement_type, 20).toUpperCase();
    const movementType = ['IN', 'OUT', 'ADJUSTMENT'].includes(movementTypeRaw) ? movementTypeRaw : 'IN';
    const quantity = Math.abs(cleanNumber(req.body?.quantity, 0));
    if (!quantity) return res.status(400).json({ success: false, message: 'Quantity must be greater than zero.' });
    const quantityChange = movementType === 'OUT' ? -quantity : quantity;
    await promisePool.query(
      `UPDATE school_stock_movements
       SET item_id = ?, movement_type = ?, quantity_change = ?, reason = ?, movement_date = ?
       WHERE id = ? AND school_id = ?`,
      [
        itemId,
        movementType,
        quantityChange,
        cleanOptional(req.body?.reason, 220),
        cleanOptional(req.body?.movement_date, 40) || new Date(),
        id,
        schoolId,
      ]
    );
    await recalculateStockCurrentQty(schoolId, prev.item_id);
    if (Number(prev.item_id) !== itemId) await recalculateStockCurrentQty(schoolId, itemId);
    res.json({ success: true, message: 'Stock movement updated.' });
  } catch (err) {
    console.error('PUT /stock/movements/:id', err);
    res.status(500).json({ success: false, message: 'Failed to update stock movement.' });
  }
});

router.delete('/stock/movements/:id', requireRole(STOCK_ROLES), async (req, res) => {
  try {
    const schoolId = resolveSchoolId(req);
    const id = Number(req.params.id);
    if (!schoolId || !id) return res.status(400).json({ success: false, message: 'Invalid request.' });
    const [[prev]] = await promisePool.query(
      `SELECT item_id FROM school_stock_movements WHERE id = ? AND school_id = ? LIMIT 1`,
      [id, schoolId]
    );
    if (!prev) return res.status(404).json({ success: false, message: 'Movement not found.' });
    await promisePool.query(`DELETE FROM school_stock_movements WHERE id = ? AND school_id = ?`, [id, schoolId]);
    await recalculateStockCurrentQty(schoolId, prev.item_id);
    res.json({ success: true, message: 'Stock movement deleted.' });
  } catch (err) {
    console.error('DELETE /stock/movements/:id', err);
    res.status(500).json({ success: false, message: 'Failed to delete stock movement.' });
  }
});

router.get('/gate/logs', requireRole(GATE_ROLES), async (req, res) => {
  try {
    const schoolId = resolveSchoolId(req);
    if (!schoolId) return res.status(400).json({ success: false, message: 'School context missing.' });
    const [rows] = await promisePool.query(
      `SELECT * FROM school_gate_logs WHERE school_id = ? ORDER BY logged_at DESC, id DESC`,
      [schoolId]
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('GET /gate/logs', err);
    res.status(500).json({ success: false, message: 'Failed to load gate logs.' });
  }
});

router.post('/gate/logs', requireRole(GATE_ROLES), async (req, res) => {
  try {
    const schoolId = resolveSchoolId(req);
    const userId = resolveUserId(req);
    if (!schoolId) return res.status(400).json({ success: false, message: 'School context missing.' });
    const personName = cleanStr(req.body?.person_name, 180);
    if (!personName) return res.status(400).json({ success: false, message: 'Person name is required.' });
    const personTypeRaw = cleanStr(req.body?.person_type, 15).toUpperCase();
    const personType = ['STUDENT', 'STAFF', 'VISITOR'].includes(personTypeRaw) ? personTypeRaw : 'STUDENT';
    const actionRaw = cleanStr(req.body?.action_type, 8).toUpperCase();
    const actionType = actionRaw === 'OUT' ? 'OUT' : 'IN';
    await promisePool.query(
      `INSERT INTO school_gate_logs
       (school_id, person_name, person_type, person_ref, action_type, logged_at, notes, created_by_user_id)
       VALUES (?,?,?,?,?,?,?,?)`,
      [
        schoolId,
        personName,
        personType,
        cleanOptional(req.body?.person_ref, 120),
        actionType,
        cleanOptional(req.body?.logged_at, 40) || new Date(),
        cleanOptional(req.body?.notes, 5000),
        userId,
      ]
    );
    res.status(201).json({ success: true, message: 'Gate log created.' });
  } catch (err) {
    console.error('POST /gate/logs', err);
    res.status(500).json({ success: false, message: 'Failed to create gate log.' });
  }
});

router.put('/gate/logs/:id', requireRole(GATE_ROLES), async (req, res) => {
  try {
    const schoolId = resolveSchoolId(req);
    const id = Number(req.params.id);
    if (!schoolId || !id) return res.status(400).json({ success: false, message: 'Invalid request.' });
    const personName = cleanStr(req.body?.person_name, 180);
    if (!personName) return res.status(400).json({ success: false, message: 'Person name is required.' });
    const personTypeRaw = cleanStr(req.body?.person_type, 15).toUpperCase();
    const personType = ['STUDENT', 'STAFF', 'VISITOR'].includes(personTypeRaw) ? personTypeRaw : 'STUDENT';
    const actionRaw = cleanStr(req.body?.action_type, 8).toUpperCase();
    const actionType = actionRaw === 'OUT' ? 'OUT' : 'IN';
    await promisePool.query(
      `UPDATE school_gate_logs
       SET person_name = ?, person_type = ?, person_ref = ?, action_type = ?, logged_at = ?, notes = ?
       WHERE id = ? AND school_id = ?`,
      [
        personName,
        personType,
        cleanOptional(req.body?.person_ref, 120),
        actionType,
        cleanOptional(req.body?.logged_at, 40) || new Date(),
        cleanOptional(req.body?.notes, 5000),
        id,
        schoolId,
      ]
    );
    res.json({ success: true, message: 'Gate log updated.' });
  } catch (err) {
    console.error('PUT /gate/logs/:id', err);
    res.status(500).json({ success: false, message: 'Failed to update gate log.' });
  }
});

router.delete('/gate/logs/:id', requireRole(GATE_ROLES), async (req, res) => {
  try {
    const schoolId = resolveSchoolId(req);
    const id = Number(req.params.id);
    if (!schoolId || !id) return res.status(400).json({ success: false, message: 'Invalid request.' });
    await promisePool.query(`DELETE FROM school_gate_logs WHERE id = ? AND school_id = ?`, [id, schoolId]);
    res.json({ success: true, message: 'Gate log deleted.' });
  } catch (err) {
    console.error('DELETE /gate/logs/:id', err);
    res.status(500).json({ success: false, message: 'Failed to delete gate log.' });
  }
});

// ════════════════════════════════════════════════════════════════
// IoT / ATTENDANCE EVENTS  (school-scoped time-window definitions)
// ════════════════════════════════════════════════════════════════
async function ensureIotTables() {
  await promisePool.query(`
    CREATE TABLE IF NOT EXISTS school_iot_events (
      id            INT AUTO_INCREMENT PRIMARY KEY,
      school_id     INT NOT NULL,
      event_name    VARCHAR(255) NOT NULL,
      start_time    VARCHAR(10)  NOT NULL DEFAULT '07:00',
      end_time      VARCHAR(10)  NOT NULL DEFAULT '08:00',
      late_threshold VARCHAR(10),
      target_group  ENUM('STUDENTS','STAFF','BOTH') NOT NULL DEFAULT 'STUDENTS',
      residency_filter ENUM('ALL','BOARDING','DAY') NOT NULL DEFAULT 'ALL',
      created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_iot_school (school_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
  await promisePool.query(`
    CREATE TABLE IF NOT EXISTS school_calendar_events (
      id          INT AUTO_INCREMENT PRIMARY KEY,
      school_id   INT NOT NULL,
      title       VARCHAR(255) NOT NULL,
      event_date  DATE NOT NULL,
      end_date    DATE,
      event_type  ENUM('HOLIDAY','EXAM','SPORT','CEREMONY','MEETING','TERM','OTHER') NOT NULL DEFAULT 'OTHER',
      description TEXT,
      color       VARCHAR(20) DEFAULT '#1E3A5F',
      created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_cal_school_date (school_id, event_date)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
}

router.get('/iot/events', requireRole(GATE_ATTENDANCE_ADMIN_ROLES), async (req, res) => {
  try {
    const schoolId = resolveSchoolId(req);
    if (!schoolId) return res.status(400).json({ success: false, message: 'School context missing.' });
    await ensureIotTables();
    const [rows] = await promisePool.query(
      'SELECT * FROM school_iot_events WHERE school_id = ? ORDER BY start_time ASC',
      [schoolId]
    );
    return res.json({ success: true, data: rows });
  } catch (err) {
    console.error('GET /iot/events', err);
    return res.status(500).json({ success: false, message: 'Failed to load attendance events.' });
  }
});

router.post('/iot/events', requireRole(GATE_ATTENDANCE_ADMIN_ROLES), async (req, res) => {
  try {
    const schoolId = resolveSchoolId(req);
    if (!schoolId) return res.status(400).json({ success: false, message: 'School context missing.' });
    await ensureIotTables();
    const { event_name, start_time, end_time, late_threshold, target_group, residency_filter } = req.body || {};
    if (!event_name || !start_time || !end_time) {
      return res.status(400).json({ success: false, message: 'event_name, start_time, end_time are required.' });
    }
    const [result] = await promisePool.query(
      `INSERT INTO school_iot_events (school_id, event_name, start_time, end_time, late_threshold, target_group, residency_filter)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [schoolId, event_name, start_time, end_time, late_threshold || start_time, target_group || 'STUDENTS', residency_filter || 'ALL']
    );
    const [[row]] = await promisePool.query('SELECT * FROM school_iot_events WHERE id = ?', [result.insertId]);
    return res.json({ success: true, data: row });
  } catch (err) {
    console.error('POST /iot/events', err);
    return res.status(500).json({ success: false, message: 'Failed to create attendance event.' });
  }
});

router.put('/iot/events/:id', requireRole(GATE_ATTENDANCE_ADMIN_ROLES), async (req, res) => {
  try {
    const schoolId = resolveSchoolId(req);
    const id = Number(req.params.id);
    if (!schoolId || !id) return res.status(400).json({ success: false, message: 'Invalid request.' });
    await ensureIotTables();
    const { event_name, start_time, end_time, late_threshold, target_group, residency_filter } = req.body || {};
    await promisePool.query(
      `UPDATE school_iot_events SET event_name=?, start_time=?, end_time=?, late_threshold=?, target_group=?, residency_filter=?
       WHERE id=? AND school_id=?`,
      [event_name, start_time, end_time, late_threshold, target_group, residency_filter, id, schoolId]
    );
    const [[row]] = await promisePool.query('SELECT * FROM school_iot_events WHERE id = ?', [id]);
    return res.json({ success: true, data: row });
  } catch (err) {
    console.error('PUT /iot/events/:id', err);
    return res.status(500).json({ success: false, message: 'Failed to update attendance event.' });
  }
});

router.delete('/iot/events/:id', requireRole(GATE_ATTENDANCE_ADMIN_ROLES), async (req, res) => {
  try {
    const schoolId = resolveSchoolId(req);
    const id = Number(req.params.id);
    if (!schoolId || !id) return res.status(400).json({ success: false, message: 'Invalid request.' });
    await promisePool.query('DELETE FROM school_iot_events WHERE id = ? AND school_id = ?', [id, schoolId]);
    return res.json({ success: true });
  } catch (err) {
    console.error('DELETE /iot/events/:id', err);
    return res.status(500).json({ success: false, message: 'Failed to delete attendance event.' });
  }
});

// ════════════════════════════════════════════════════════════════
// SCHOOL CALENDAR EVENTS
// ════════════════════════════════════════════════════════════════
const CALENDAR_READ_ROLES = [
  ...GATE_ATTENDANCE_ADMIN_ROLES,
  'ACCOUNTANT', 'STOREKEEPER', 'STORE_MANAGER', 'LIBRARIAN',
  'SCHOOL_REPRESENTATIVE', 'NETWORK_REPRESENTATIVE',
];

router.get('/school/calendar-events', requireRole(CALENDAR_READ_ROLES), async (req, res) => {
  try {
    const schoolId = resolveSchoolId(req);
    if (!schoolId) return res.status(400).json({ success: false, message: 'School context missing.' });
    await ensureIotTables();
    const year  = req.query.year  ? Number(req.query.year)  : new Date().getFullYear();
    const month = req.query.month ? Number(req.query.month) : null;
    let where = 'school_id = ?';
    const params = [schoolId];
    if (month) {
      where += ' AND YEAR(event_date) = ? AND MONTH(event_date) = ?';
      params.push(year, month);
    } else {
      where += ' AND YEAR(event_date) = ?';
      params.push(year);
    }
    const [rows] = await promisePool.query(
      `SELECT * FROM school_calendar_events WHERE ${where} ORDER BY event_date ASC`,
      params
    );
    return res.json({ success: true, data: rows });
  } catch (err) {
    console.error('GET /school/calendar-events', err);
    return res.status(500).json({ success: false, message: 'Failed to load calendar events.' });
  }
});

router.post('/school/calendar-events', requireRole(GATE_ATTENDANCE_ADMIN_ROLES), async (req, res) => {
  try {
    const schoolId = resolveSchoolId(req);
    if (!schoolId) return res.status(400).json({ success: false, message: 'School context missing.' });
    await ensureIotTables();
    const { title, event_date, end_date, event_type, description, color } = req.body || {};
    if (!title || !event_date) {
      return res.status(400).json({ success: false, message: 'title and event_date are required.' });
    }
    const [result] = await promisePool.query(
      `INSERT INTO school_calendar_events (school_id, title, event_date, end_date, event_type, description, color)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [schoolId, title, event_date, end_date || null, event_type || 'OTHER', description || null, color || '#1E3A5F']
    );
    const [[row]] = await promisePool.query('SELECT * FROM school_calendar_events WHERE id = ?', [result.insertId]);
    return res.json({ success: true, data: row });
  } catch (err) {
    console.error('POST /school/calendar-events', err);
    return res.status(500).json({ success: false, message: 'Failed to create calendar event.' });
  }
});

router.delete('/school/calendar-events/:id', requireRole(GATE_ATTENDANCE_ADMIN_ROLES), async (req, res) => {
  try {
    const schoolId = resolveSchoolId(req);
    const id = Number(req.params.id);
    if (!schoolId || !id) return res.status(400).json({ success: false, message: 'Invalid request.' });
    await promisePool.query('DELETE FROM school_calendar_events WHERE id = ? AND school_id = ?', [id, schoolId]);
    return res.json({ success: true });
  } catch (err) {
    console.error('DELETE /school/calendar-events/:id', err);
    return res.status(500).json({ success: false, message: 'Failed to delete calendar event.' });
  }
});

module.exports = router;
