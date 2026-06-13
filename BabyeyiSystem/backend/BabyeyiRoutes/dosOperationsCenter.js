/**
 * DOS School Operations Command Center + Class Room QR codes
 */
const express = require('express');
const QRCode = require('qrcode');
const { promisePool } = require('../config/database');
const { requireRole } = require('../middleware/deoAuth');
const ensureAcademicTables = require('./teacherPortal').ensureAcademicTables;
const {
  trimStr, dayOfWeekName, timeToMins, toDateSql, generateQrToken, getTeacherPeriodSettings,
} = require('../lib/classRoomScan');
const { collectSchoolRegisteredClassNames } = require('../utils/gradebookLabels');

const router = express.Router();
const DOS_LIVE_ROLES = ['DOS', 'SCHOOL_ADMIN', 'SCHOOL_MANAGER', 'ACCOUNTANT', 'SCHOOL_REPRESENTATIVE'];
const DOS_ADMIN = ['DOS', 'SCHOOL_ADMIN', 'SCHOOL_MANAGER'];

function resolveSchoolId(req) {
  return req.query?.school_id || req.body?.school_id
    || req.session?.school_id || req.session?.user?.school_id || req.session?.user?.school?.id || null;
}

let tablesReady = false;
async function ensureOpsTables() {
  if (tablesReady) return;
  await ensureAcademicTables();
  await promisePool.query(`
    CREATE TABLE IF NOT EXISTS class_room_qr_codes (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      school_id INT UNSIGNED NOT NULL,
      class_name VARCHAR(120) NOT NULL,
      qr_token VARCHAR(64) NOT NULL,
      term VARCHAR(32) NULL,
      academic_year VARCHAR(32) NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_crq_token (qr_token),
      KEY idx_crq_school (school_id),
      UNIQUE KEY uq_crq_class_term (school_id, class_name, term, academic_year)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
  tablesReady = true;
}

function slotLateMinutes(startTime, referenceHm) {
  if (!referenceHm || !startTime) return 0;
  return Math.max(0, timeToMins(referenceHm) - timeToMins(startTime));
}

function isEntryLate(startTime, entryHm, lateThreshold) {
  return slotLateMinutes(startTime, entryHm) > Number(lateThreshold || 0);
}

function classifySlotStatus(slot, periodLog, nowMins, lateThreshold = 10) {
  const start = timeToMins(slot.start_time);
  const end = timeToMins(slot.end_time);
  const threshold = Number(lateThreshold || 0);
  if (slot.is_break || /break|lunch|correction/i.test(slot.period_name || '')) return 'break';

  if (periodLog?.entry_time) {
    const entryHm = periodLog.entry_hm || String(periodLog.entry_time).slice(0, 5);
    const isLate = isEntryLate(slot.start_time, entryHm, threshold)
      || String(periodLog.status || '').toUpperCase() === 'LATE';
    if (periodLog.exit_time) return isLate ? 'late' : 'completed';
    return isLate ? 'late' : 'live';
  }

  if (!periodLog && nowMins > end) return 'missing';
  if (!periodLog && nowMins >= start && nowMins < end) {
    if (nowMins > start + threshold) return 'late';
    return 'waiting';
  }

  return 'scheduled';
}

function getCurrentBellPeriod(periods, nowMins) {
  for (const p of periods) {
    const start = timeToMins(p.start_time);
    const end = timeToMins(p.end_time);
    if (nowMins >= start && nowMins < end) return p;
  }
  return null;
}

function periodRemainingSeconds(period, nowMins) {
  if (!period) return 0;
  return Math.max(0, (timeToMins(period.end_time) - nowMins) * 60);
}

/** GET /api/dos/operations-center/filters */
router.get('/dos/operations-center/filters', requireRole(DOS_LIVE_ROLES), async (req, res) => {
  try {
    await ensureOpsTables();
    const schoolId = resolveSchoolId(req);
    if (!schoolId) return res.status(400).json({ success: false, message: 'Invalid session' });

    const settings = await getTeacherPeriodSettings(promisePool, schoolId);
    const term = trimStr(req.query.term) || settings.term;
    const academicYear = trimStr(req.query.academic_year) || settings.academic_year;

    const [termRows] = await promisePool.query(
      `SELECT DISTINCT TRIM(term) AS v FROM academic_timetables
       WHERE school_id = ? AND term IS NOT NULL AND TRIM(term) != ''
       ORDER BY v ASC`,
      [schoolId]
    );
    const [yearRows] = await promisePool.query(
      `SELECT DISTINCT TRIM(academic_year) AS v FROM academic_timetables
       WHERE school_id = ? AND academic_year IS NOT NULL AND TRIM(academic_year) != ''
       ORDER BY v DESC`,
      [schoolId]
    );
    const [registryRows, studentClassRows, timetableClassRows] = await Promise.all([
      promisePool.query(
        'SELECT group_name, stream_name, combination FROM school_classes WHERE school_id = ?',
        [schoolId]
      ).then(([rows]) => rows || []),
      promisePool.query(
        `SELECT DISTINCT class_name FROM students
         WHERE school_id = ? AND class_name IS NOT NULL AND TRIM(class_name) <> ''`,
        [schoolId]
      ).then(([rows]) => (rows || []).map((r) => r.class_name)),
      promisePool.query(
        `SELECT DISTINCT class_name FROM academic_timetables
         WHERE school_id = ? AND class_name IS NOT NULL AND TRIM(class_name) <> ''`,
        [schoolId]
      ).then(([rows]) => (rows || []).map((r) => r.class_name)),
    ]);

    const allClasses = collectSchoolRegisteredClassNames({
      registryRows,
      studentClassNames: studentClassRows,
      timetableClassNames: timetableClassRows,
    });

    return res.json({
      success: true,
      data: {
        current: { term: settings.term, academic_year: settings.academic_year },
        selected: { term, academic_year: academicYear },
        terms: (termRows || []).map((r) => r.v).filter(Boolean),
        academic_years: (yearRows || []).map((r) => r.v).filter(Boolean),
        classes: allClasses,
        late_threshold_minutes: settings.late_threshold_minutes,
      },
    });
  } catch (err) {
    console.error('GET /dos/operations-center/filters:', err);
    return res.status(500).json({ success: false, message: 'Failed to load filters' });
  }
});

/** GET /api/dos/operations-center/live */
router.get('/dos/operations-center/live', requireRole(DOS_LIVE_ROLES), async (req, res) => {
  try {
    await ensureOpsTables();
    const schoolId = resolveSchoolId(req);
    if (!schoolId) return res.status(400).json({ success: false, message: 'Invalid session' });

    const now = new Date();
    const date = toDateSql(now);
    const day = dayOfWeekName(now);
    const nowHm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const nowMins = timeToMins(nowHm);
    const settings = await getTeacherPeriodSettings(promisePool, schoolId);
    const lateThreshold = Number(settings.late_threshold_minutes || 10);
    const filterTerm = trimStr(req.query.term) || settings.term;
    const filterYear = trimStr(req.query.academic_year) || settings.academic_year;
    const filterClass = trimStr(req.query.class_name);

    const [periods] = await promisePool.query(
      `SELECT id, period_name, start_time, end_time, is_break, sort_order
       FROM school_periods WHERE school_id = ? ORDER BY sort_order ASC, start_time ASC`,
      [schoolId]
    );

    const currentPeriod = getCurrentBellPeriod(periods || [], nowMins);
    const remainingSec = periodRemainingSeconds(currentPeriod, nowMins);

    const [todaySlots] = await promisePool.query(
      `SELECT tt.id, tt.class_name, tt.subject_name, tt.staff_id AS teacher_id, tt.start_time, tt.end_time,
              tt.extra_activity_id,
              TRIM(CONCAT(COALESCE(u.first_name,''), ' ', COALESCE(u.last_name,''))) AS teacher_name,
              u.rfid_uid AS card_uid
       FROM academic_timetables tt
       LEFT JOIN users u ON u.id = tt.staff_id
       WHERE tt.school_id = ? AND LOWER(tt.day_of_week) = LOWER(?)
         AND TRIM(COALESCE(tt.term,'')) = ? AND TRIM(COALESCE(tt.academic_year,'')) = ?
       ORDER BY tt.start_time ASC`,
      [schoolId, day, filterTerm, filterYear]
    );

    const currentPeriodSlots = currentPeriod
      ? (todaySlots || []).filter((s) => {
        const ps = timeToMins(currentPeriod.start_time);
        const pe = timeToMins(currentPeriod.end_time);
        const ss = timeToMins(s.start_time);
        const se = timeToMins(s.end_time);
        return ss < pe && ps < se;
      })
      : [];

    const teachingSlots = currentPeriodSlots.filter((s) => !s.extra_activity_id);
    const uniqueClasses = [...new Set(teachingSlots.map((s) => s.class_name))];

    const [periodLogs] = await promisePool.query(
      `SELECT tpa.*, TIME_FORMAT(tpa.entry_time, '%H:%i') AS entry_hm,
              TIME_FORMAT(tpa.exit_time, '%H:%i') AS exit_hm,
              TRIM(CONCAT(COALESCE(u.first_name,''), ' ', COALESCE(u.last_name,''))) AS teacher_name
       FROM teacher_period_attendance tpa
       LEFT JOIN users u ON u.id = tpa.teacher_id
       WHERE tpa.school_id = ? AND tpa.period_date = ?`,
      [schoolId, date]
    );

    const logByClass = new Map();
    for (const log of periodLogs || []) {
      const key = `${log.class_name}__${String(log.start_time).slice(0, 5)}`;
      logByClass.set(key, log);
    }

    const classCards = uniqueClasses.map((className) => {
      const slot = teachingSlots.find((s) => s.class_name === className);
      const key = `${className}__${String(slot?.start_time || '').slice(0, 5)}`;
      const log = logByClass.get(key);
      const status = classifySlotStatus(
        { start_time: slot?.start_time, end_time: slot?.end_time, period_name: currentPeriod?.period_name },
        log,
        nowMins,
        lateThreshold
      );
      const entryHm = log?.entry_hm || (log?.entry_time ? String(log.entry_time).slice(0, 5) : null);
      const computedLateMinutes = entryHm
        ? slotLateMinutes(slot?.start_time, entryHm)
        : (status === 'late' && !log?.entry_time ? Math.max(0, nowMins - timeToMins(slot?.start_time)) : 0);
      const progress = slot && log?.entry_time && !log?.exit_time
        ? Math.min(100, Math.round(((nowMins - timeToMins(slot.start_time)) / Math.max(1, timeToMins(slot.end_time) - timeToMins(slot.start_time))) * 100))
        : (log?.exit_time ? 100 : 0);

      return {
        class_name: className,
        subject_name: slot?.subject_name || '—',
        teacher_id: slot?.teacher_id,
        teacher_name: slot?.teacher_name || 'Unassigned',
        start_time: String(slot?.start_time || '').slice(0, 5),
        end_time: String(slot?.end_time || '').slice(0, 5),
        status,
        rfid_verified: Boolean(log?.entry_time),
        qr_verified: log?.scan_source === 'QR_CLASS' || log?.scan_source === 'QR',
        students_present: null,
        students_total: null,
        lesson_progress_pct: progress,
        entry_time: log?.entry_hm || null,
        exit_time: log?.exit_hm || null,
        late_minutes: log?.late_minutes || computedLateMinutes || 0,
      };
    });

    let teachersInClass = 0;
    let missingTeachers = 0;
    let lateTeachers = 0;
    for (const c of classCards) {
      if (c.status === 'live' || c.status === 'completed') teachersInClass += 1;
      else if (c.status === 'missing' || c.status === 'waiting') missingTeachers += 1;
      if (c.status === 'late' || c.late_minutes > 0) lateTeachers += 1;
    }

    const [alerts] = await promisePool.query(
      `SELECT id, alert_type, title, message, teacher_name, class_name, subject_name, period_date, is_read, created_at
       FROM dos_teacher_period_alerts
       WHERE school_id = ? AND period_date = ?
       ORDER BY created_at DESC LIMIT 30`,
      [schoolId, date]
    );

    const [streamEvents] = await promisePool.query(
      `(SELECT 'period' AS source, tpa.id, tpa.teacher_name, tpa.class_name, tpa.subject_name,
               tpa.entry_time AS event_time, tpa.status AS event_type, tpa.scan_source
        FROM teacher_period_attendance tpa
        WHERE tpa.school_id = ? AND tpa.period_date = ?
        ORDER BY COALESCE(tpa.entry_time, tpa.created_at) DESC LIMIT 20)
       UNION ALL
       (SELECT 'gate' AS source, e.id, e.person_name AS teacher_name, '' AS class_name, e.event_type AS subject_name,
               e.created_at AS event_time, e.event_type, e.scan_method AS scan_source
        FROM school_gate_attendance_events e
        WHERE e.school_id = ? AND DATE(e.created_at) = ?
        ORDER BY e.created_at DESC LIMIT 10)`,
      [schoolId, date, schoolId, date]
    ).catch(() => [[]]);

    const activityStream = [];
    for (const log of (periodLogs || []).slice(0, 25)) {
      if (log.entry_hm) {
        activityStream.push({
          time: log.entry_hm,
          message: `${log.teacher_name || 'Teacher'} entered ${log.class_name}`,
          type: log.status === 'LATE' ? 'late' : 'entry',
        });
      }
      if (log.exit_hm) {
        activityStream.push({
          time: log.exit_hm,
          message: `${log.teacher_name || 'Teacher'} left ${log.class_name} — period ${log.exit_status === 'BEFORE' ? 'ended early' : 'complete'}`,
          type: 'exit',
        });
      }
    }
    activityStream.sort((a, b) => b.time.localeCompare(a.time));

    const [teachers] = await promisePool.query(
      `SELECT u.id AS teacher_id,
              TRIM(CONCAT(COALESCE(u.first_name,''), ' ', COALESCE(u.last_name,''))) AS teacher_name,
              u.rfid_uid AS card_uid
       FROM staff st
       INNER JOIN users u ON u.id = st.user_id
       INNER JOIN roles r ON r.id = u.role_id
       WHERE st.school_id = ? AND u.deleted_at IS NULL AND u.is_active = 1
         AND r.role_code IN ('TEACHER', 'HOD', 'DOS')
       ORDER BY teacher_name ASC`,
      [schoolId]
    );

    const teacherRadar = (teachers || []).map((t) => {
      const activeLog = (periodLogs || []).find((l) => l.teacher_id === t.teacher_id && l.entry_time && !l.exit_time);
      const expectedSlot = teachingSlots.find((s) => s.teacher_id === t.teacher_id);
      const todayCount = (periodLogs || []).filter((l) => l.teacher_id === t.teacher_id && l.entry_time).length;
      const slotStart = expectedSlot ? timeToMins(expectedSlot.start_time) : null;
      const slotEnd = expectedSlot ? timeToMins(expectedSlot.end_time) : null;
      let status = 'expected';
      if (activeLog) {
        status = (isEntryLate(expectedSlot?.start_time, activeLog.entry_hm, lateThreshold)
          || activeLog.status === 'LATE') ? 'late' : 'teaching';
      } else if (expectedSlot && slotEnd != null && nowMins > slotEnd) {
        status = 'missing';
      } else if (expectedSlot && slotStart != null && slotEnd != null
        && nowMins >= slotStart && nowMins < slotEnd && nowMins > slotStart + lateThreshold) {
        status = 'late';
      } else if (expectedSlot) {
        status = 'expected';
      }
      return {
        teacher_id: t.teacher_id,
        teacher_name: t.teacher_name,
        current_class: activeLog?.class_name || expectedSlot?.class_name || null,
        subject: activeLog?.subject_name || expectedSlot?.subject_name || null,
        status,
        check_in: activeLog?.entry_hm || null,
        punctuality_pct: todayCount > 0 ? Math.round(((periodLogs || []).filter((l) => l.teacher_id === t.teacher_id && l.status === 'ON_TIME').length / todayCount) * 100) : null,
        card_uid: t.card_uid,
      };
    });

    let displayClassCards = classCards;
    if (filterClass) {
      displayClassCards = classCards.filter(
        (c) => String(c.class_name || '').toLowerCase() === filterClass.toLowerCase()
      );
    }

    const attendanceMarkedClasses = displayClassCards.filter((c) => Boolean(c.entry_time)).length;
    const totalDisplayClasses = displayClassCards.length;
    const attendedClasses = displayClassCards.filter((c) => ['live', 'completed', 'late'].includes(c.status)).length;

    const periodTimeline = (periods || []).map((p) => {
      const start = timeToMins(p.start_time);
      const end = timeToMins(p.end_time);
      let status = 'upcoming';
      if (nowMins >= end) status = 'past';
      else if (nowMins >= start && nowMins < end) status = 'current';
      const slotsInPeriod = (todaySlots || []).filter((s) => {
        if (s.extra_activity_id) return false;
        const ss = timeToMins(s.start_time);
        const se = timeToMins(s.end_time);
        return ss < end && start < se;
      });
      const uniqueInPeriod = [...new Set(slotsInPeriod.map((s) => s.class_name))];
      const liveInPeriod = uniqueInPeriod.filter((cn) => {
        const slot = slotsInPeriod.find((s) => s.class_name === cn);
        const key = `${cn}__${String(slot?.start_time || '').slice(0, 5)}`;
        const log = logByClass.get(key);
        return Boolean(log?.entry_time);
      }).length;
      return {
        id: p.id,
        name: p.period_name,
        start_time: String(p.start_time).slice(0, 5),
        end_time: String(p.end_time).slice(0, 5),
        is_break: Boolean(p.is_break),
        status,
        class_count: uniqueInPeriod.length,
        live_count: liveInPeriod,
      };
    });

    return res.json({
      success: true,
      data: {
        server_time: now.toISOString(),
        date,
        day,
        term: filterTerm,
        academic_year: filterYear,
        filters: {
          term: filterTerm,
          academic_year: filterYear,
          class_name: filterClass || null,
        },
        stats: {
          active_classes: attendedClasses,
          total_classes: totalDisplayClasses,
          teachers_in_class: displayClassCards.filter((c) => ['live', 'completed', 'late'].includes(c.status)).length,
          missing_teachers: displayClassCards.filter((c) => ['missing', 'waiting'].includes(c.status)).length,
          late_teachers: displayClassCards.filter((c) => c.status === 'late').length,
          live_attendance_pct: totalDisplayClasses
            ? Math.round((attendanceMarkedClasses / totalDisplayClasses) * 1000) / 10
            : 0,
          live_attendance_marked: attendanceMarkedClasses,
          live_attendance_total: totalDisplayClasses,
          late_threshold_minutes: lateThreshold,
        },
        current_period: currentPeriod ? {
          name: currentPeriod.period_name,
          start_time: String(currentPeriod.start_time).slice(0, 5),
          end_time: String(currentPeriod.end_time).slice(0, 5),
          remaining_seconds: remainingSec,
          is_break: Boolean(currentPeriod.is_break),
        } : null,
        class_cards: displayClassCards,
        all_class_names: uniqueClasses,
        period_timeline: periodTimeline,
        today_slots_count: (todaySlots || []).filter((s) => !s.extra_activity_id).length,
        has_timetable: (todaySlots || []).length > 0,
        empty_reason: (todaySlots || []).length === 0
          ? `No timetable rows for ${day} · ${filterTerm} · ${filterYear}. Generate or apply the timetable for this term.`
          : (currentPeriod && uniqueClasses.length === 0
            ? `No classes scheduled during ${currentPeriod.period_name} (${String(currentPeriod.start_time).slice(0, 5)}–${String(currentPeriod.end_time).slice(0, 5)}).`
            : null),
        activity_stream: activityStream.slice(0, 30),
        alerts: (alerts || []).map((a) => ({
          ...a,
          priority: a.alert_type === 'missed' ? 'high' : a.alert_type === 'late' ? 'medium' : 'low',
        })),
        teacher_radar: teacherRadar,
        insights: {
          teacher_punctuality_pct: teacherRadar.filter((t) => t.punctuality_pct != null).length
            ? Math.round(teacherRadar.reduce((s, t) => s + (t.punctuality_pct || 0), 0) / teacherRadar.filter((t) => t.punctuality_pct != null).length)
            : null,
          unattended: missingTeachers,
          alerts_count: (alerts || []).filter((a) => !a.is_read).length,
        },
        late_threshold_minutes: settings.late_threshold_minutes,
      },
    });
  } catch (err) {
    console.error('GET /dos/operations-center/live:', err);
    return res.status(500).json({ success: false, message: 'Failed to load live operations' });
  }
});

/** GET /api/dos/class-qr-codes */
router.get('/dos/class-qr-codes', requireRole(DOS_ADMIN), async (req, res) => {
  try {
    await ensureOpsTables();
    const schoolId = resolveSchoolId(req);
    if (!schoolId) return res.status(400).json({ success: false, message: 'Invalid session' });
    const settings = await getTeacherPeriodSettings(promisePool, schoolId);
    const [registryRows, studentClassRows, timetableClassRows] = await Promise.all([
      promisePool.query(
        'SELECT group_name, stream_name, combination FROM school_classes WHERE school_id = ?',
        [schoolId]
      ).then(([rows]) => rows || []),
      promisePool.query(
        `SELECT DISTINCT class_name FROM students
         WHERE school_id = ? AND class_name IS NOT NULL AND TRIM(class_name) <> ''`,
        [schoolId]
      ).then(([rows]) => (rows || []).map((r) => r.class_name)),
      promisePool.query(
        `SELECT DISTINCT class_name FROM academic_timetables
         WHERE school_id = ? AND class_name IS NOT NULL AND TRIM(class_name) <> ''`,
        [schoolId]
      ).then(([rows]) => (rows || []).map((r) => r.class_name)),
    ]);
    const allRegisteredClasses = collectSchoolRegisteredClassNames({
      registryRows,
      studentClassNames: studentClassRows,
      timetableClassNames: timetableClassRows,
    });

    const [rows] = await promisePool.query(
      'SELECT * FROM class_room_qr_codes WHERE school_id = ? AND term = ? AND academic_year = ? ORDER BY class_name ASC',
      [schoolId, settings.term, settings.academic_year]
    );
    return res.json({
      success: true,
      data: rows,
      meta: {
        ...settings,
        registered_classes: allRegisteredClasses,
        registered_class_count: allRegisteredClasses.length,
      },
    });
  } catch (err) {
    console.error('GET /dos/class-qr-codes:', err);
    return res.status(500).json({ success: false, message: 'Failed to load QR codes' });
  }
});

/** POST /api/dos/class-qr-codes/generate */
router.post('/dos/class-qr-codes/generate', requireRole(DOS_ADMIN), async (req, res) => {
  try {
    await ensureOpsTables();
    const schoolId = resolveSchoolId(req);
    if (!schoolId) return res.status(400).json({ success: false, message: 'Invalid session' });
    const settings = await getTeacherPeriodSettings(promisePool, schoolId);
    const classNames = Array.isArray(req.body?.class_names) ? req.body.class_names.map(trimStr).filter(Boolean) : [];

    let names = classNames;
    if (!names.length) {
      const [registryRows, studentClassRows, timetableClassRows] = await Promise.all([
        promisePool.query(
          'SELECT group_name, stream_name, combination FROM school_classes WHERE school_id = ?',
          [schoolId]
        ).then(([rows]) => rows || []),
        promisePool.query(
          `SELECT DISTINCT class_name FROM students
           WHERE school_id = ? AND class_name IS NOT NULL AND TRIM(class_name) <> ''`,
          [schoolId]
        ).then(([rows]) => (rows || []).map((r) => r.class_name)),
        promisePool.query(
          `SELECT DISTINCT class_name FROM academic_timetables
           WHERE school_id = ? AND class_name IS NOT NULL AND TRIM(class_name) <> ''`,
          [schoolId]
        ).then(([rows]) => (rows || []).map((r) => r.class_name)),
      ]);
      names = collectSchoolRegisteredClassNames({
        registryRows,
        studentClassNames: studentClassRows,
        timetableClassNames: timetableClassRows,
      });
    }

    const created = [];
    for (const className of names) {
      const token = generateQrToken();
      await promisePool.query(
        `INSERT INTO class_room_qr_codes (school_id, class_name, qr_token, term, academic_year)
         VALUES (?,?,?,?,?)
         ON DUPLICATE KEY UPDATE qr_token = VALUES(qr_token), updated_at = NOW()`,
        [schoolId, className, token, settings.term, settings.academic_year]
      );
      created.push({ class_name: className, qr_token: token });
    }

    const [rows] = await promisePool.query(
      'SELECT * FROM class_room_qr_codes WHERE school_id = ? AND term = ? AND academic_year = ?',
      [schoolId, settings.term, settings.academic_year]
    );
    return res.json({ success: true, message: `QR codes ready for ${created.length} class(es)`, data: rows });
  } catch (err) {
    console.error('POST /dos/class-qr-codes/generate:', err);
    return res.status(500).json({ success: false, message: 'Failed to generate QR codes' });
  }
});

/** GET /api/dos/class-qr-codes/:className/image?size=512 */
router.get('/dos/class-qr-codes/:className/image', requireRole(DOS_LIVE_ROLES), async (req, res) => {
  try {
    await ensureOpsTables();
    const schoolId = resolveSchoolId(req);
    const className = trimStr(req.params.className);
    const size = Math.min(1024, Math.max(128, Number(req.query.size) || 400));
    const settings = await getTeacherPeriodSettings(promisePool, schoolId);

    const [[row]] = await promisePool.query(
      'SELECT qr_token FROM class_room_qr_codes WHERE school_id = ? AND class_name = ? AND term = ? AND academic_year = ? LIMIT 1',
      [schoolId, className, settings.term, settings.academic_year]
    );
    if (!row) return res.status(404).json({ success: false, message: 'QR not generated for this class' });

    const payload = `BABYEYICLS:${row.qr_token}`;
    const png = await QRCode.toBuffer(payload, { width: size, margin: 2, errorCorrectionLevel: 'M' });
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'private, max-age=3600');
    return res.send(png);
  } catch (err) {
    console.error('GET class-qr image:', err);
    return res.status(500).json({ success: false, message: 'Failed to generate image' });
  }
});

module.exports = router;
