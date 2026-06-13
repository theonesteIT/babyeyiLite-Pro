/**
 * Teacher class-room QR / RFID period check-in (entry + exit).
 */
const { randomBytes } = require('crypto');

function trimStr(v) {
  if (v === undefined || v === null) return '';
  return String(v).trim();
}

function dayOfWeekName(d = new Date()) {
  return ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][d.getDay()];
}

function timeToMins(t) {
  const [h, m] = String(t || '00:00').slice(0, 5).split(':').map(Number);
  return (Number.isFinite(h) ? h : 0) * 60 + (Number.isFinite(m) ? m : 0);
}

function toDateSql(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function generateQrToken() {
  return randomBytes(16).toString('hex');
}

function normalizePeriodLabel(startTime) {
  const [hRaw, mRaw] = String(startTime || '00:00').split(':');
  const h = Number(hRaw || 0);
  const m = Number(mRaw || 0);
  const total = h * 60 + m;
  if (total < 540) return 'P1';
  if (total < 600) return 'P2';
  if (total < 660) return 'P3';
  if (total < 720) return 'P4';
  if (total < 780) return 'P5';
  if (total < 840) return 'P6';
  return 'P7';
}

async function syncTeacherClassCheckInRow(promisePool, {
  schoolId, teacherId, className, subjectName, startTime, date, status, scanSource,
}) {
  const period = normalizePeriodLabel(startTime);
  const attStatus = status === 'LATE' ? 'Late' : 'Present';
  const source = 'RFID';
  await promisePool.query(
    `INSERT INTO attendance_teacher_class
     (school_id, teacher_id, class_id, period, course, attendance_date, check_time, status, source)
     VALUES (?, ?, ?, ?, ?, ?, NOW(), ?, ?)
     ON DUPLICATE KEY UPDATE check_time = VALUES(check_time), status = VALUES(status), source = VALUES(source), course = VALUES(course)`,
    [schoolId, teacherId, className, period, subjectName, date, attStatus, source]
  ).catch(() => {});
}

async function getTeacherPeriodSettings(promisePool, schoolId) {
  const [[row]] = await promisePool.query(
    'SELECT * FROM school_teacher_period_settings WHERE school_id = ? LIMIT 1',
    [schoolId]
  );
  return {
    term: trimStr(row?.term) || 'Term 1',
    academic_year: trimStr(row?.academic_year) || '2025-2026',
    late_threshold_minutes: Number(row?.late_threshold_minutes) || 10,
  };
}

async function processTeacherClassRoomCheckIn(promisePool, {
  schoolId,
  teacherId,
  teacherName,
  className,
  scanSource = 'QR_CLASS',
  now = new Date(),
}) {
  const date = toDateSql(now);
  const day = dayOfWeekName(now);
  const nowHm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const settings = await getTeacherPeriodSettings(promisePool, schoolId);
  const lateThreshold = Number(settings.late_threshold_minutes || 10);
  const GRACE = 5;

  let [slots] = await promisePool.query(
    `SELECT id, class_name, subject_name, day_of_week, start_time, end_time, staff_id
     FROM academic_timetables
     WHERE school_id = ? AND staff_id = ? AND LOWER(TRIM(class_name)) = LOWER(TRIM(?))
       AND LOWER(day_of_week) = LOWER(?)
       AND TRIM(COALESCE(term,'')) = ? AND TRIM(COALESCE(academic_year,'')) = ?
       AND (extra_activity_id IS NULL OR extra_activity_id = 0)
     ORDER BY start_time ASC`,
    [schoolId, teacherId, className, day, settings.term, settings.academic_year]
  );

  if (!slots?.length) {
    [slots] = await promisePool.query(
      `SELECT id, class_name, subject_name, day_of_week, start_time, end_time, staff_id
       FROM academic_timetables
       WHERE school_id = ? AND staff_id = ? AND LOWER(TRIM(class_name)) = LOWER(TRIM(?))
         AND LOWER(day_of_week) = LOWER(?)
         AND (extra_activity_id IS NULL OR extra_activity_id = 0)
       ORDER BY start_time ASC`,
      [schoolId, teacherId, className, day]
    );
  }

  const currentSlot = (slots || []).find((s) => {
    const start = timeToMins(s.start_time);
    const end = timeToMins(s.end_time);
    const cur = timeToMins(nowHm);
    return cur >= (start - GRACE) && cur <= (end + GRACE);
  });

  if (!currentSlot) {
    return {
      ok: false,
      code: 'NO_LESSON_NOW',
      message: `No scheduled lesson for ${className} at this time`,
      data: { class_name: className, day, time: nowHm, today_slots: slots },
    };
  }

  const startHm = String(currentSlot.start_time).slice(0, 5);
  const endHm = String(currentSlot.end_time).slice(0, 5);

  const [[existing]] = await promisePool.query(
    `SELECT id, entry_time, exit_time, status, late_minutes
     FROM teacher_period_attendance
     WHERE school_id = ? AND teacher_id = ? AND period_date = ?
       AND class_name = ? AND subject_name = ? AND start_time = ? AND end_time = ?
     LIMIT 1`,
    [schoolId, teacherId, date, currentSlot.class_name, currentSlot.subject_name, currentSlot.start_time, currentSlot.end_time]
  );

  if (!existing) {
    const lateMinutes = Math.max(0, timeToMins(nowHm) - timeToMins(startHm));
    const status = lateMinutes > lateThreshold ? 'LATE' : 'ON_TIME';
    const [ins] = await promisePool.query(
      `INSERT INTO teacher_period_attendance
       (school_id, teacher_id, class_name, subject_name, day_of_week, period_date, start_time, end_time, entry_time, status, late_minutes, scan_source)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [schoolId, teacherId, currentSlot.class_name, currentSlot.subject_name, day, date,
        currentSlot.start_time, currentSlot.end_time, now, status, lateMinutes, scanSource]
    );
    if (status === 'LATE') {
      await promisePool.query(
        `INSERT INTO dos_teacher_period_alerts (school_id, alert_type, title, message, teacher_id, teacher_name, class_name, subject_name, period_date)
         VALUES (?, 'late', 'Late Entry', ?, ?, ?, ?, ?, ?)`,
        [schoolId, `${teacherName} is ${lateMinutes} min late for ${currentSlot.subject_name} (${currentSlot.class_name})`,
          teacherId, teacherName, currentSlot.class_name, currentSlot.subject_name, date]
      ).catch(() => {});
    }
    await syncTeacherClassCheckInRow(promisePool, {
      schoolId, teacherId, className: currentSlot.class_name, subjectName: currentSlot.subject_name,
      startTime: currentSlot.start_time, date, status, scanSource,
    });
    return {
      ok: true,
      action: 'entry',
      message: status === 'LATE' ? 'Late entry recorded — lesson started' : 'Entry recorded — lesson started',
      data: {
        id: ins.insertId,
        teacher_name: teacherName,
        class_name: currentSlot.class_name,
        subject_name: currentSlot.subject_name,
        period: `${startHm}-${endHm}`,
        entry_time: nowHm,
        status,
        late_minutes: lateMinutes,
        scan_source: scanSource,
      },
    };
  }

  if (!existing.exit_time) {
    const exitIsBefore = timeToMins(nowHm) < timeToMins(endHm);
    const exitStatus = exitIsBefore ? 'BEFORE' : 'ON_TIME';
    await promisePool.query(
      'UPDATE teacher_period_attendance SET exit_time = ?, exit_status = ?, scan_source = ? WHERE id = ?',
      [now, exitStatus, scanSource, existing.id]
    );
    return {
      ok: true,
      action: 'exit',
      message: exitIsBefore ? 'Exit recorded (before period end)' : 'Exit recorded — period complete',
      data: {
        id: existing.id,
        class_name: currentSlot.class_name,
        subject_name: currentSlot.subject_name,
        exit_time: nowHm,
        exit_status: exitStatus,
      },
    };
  }

  return {
    ok: true,
    action: 'duplicate',
    code: 'PERIOD_COMPLETED',
    message: 'Attendance already completed for this period',
    data: { id: existing.id, class_name: currentSlot.class_name },
  };
}

module.exports = {
  trimStr,
  dayOfWeekName,
  timeToMins,
  toDateSql,
  generateQrToken,
  getTeacherPeriodSettings,
  processTeacherClassRoomCheckIn,
};
