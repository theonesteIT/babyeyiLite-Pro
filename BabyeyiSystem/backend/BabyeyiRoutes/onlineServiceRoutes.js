const express = require('express');
const bcrypt = require('bcryptjs');
const { promisePool } = require('../config/database');

const router = express.Router();

let tableReady = false;
let tableReadyPromise = null;

function normalizePhone(raw) {
  if (!raw) return null;
  let v = String(raw).replace(/[\s\-().]/g, '');
  v = v.replace(/[^\d+]/g, '');
  if (v.startsWith('+250')) v = `0${v.slice(4)}`;
  else if (v.startsWith('250') && v.length === 12) v = `0${v.slice(3)}`;
  if (/^[27]\d{8}$/.test(v)) v = `0${v}`;
  if (/^07[2-9]\d{7}$/.test(v)) return v;
  if (/^078\d{7}$/.test(v)) return v;
  if (/^079\d{7}$/.test(v)) return v;
  if (/^025\d{7}$/.test(v)) return v;
  return null;
}

function normalizeSchoolPasswordInput(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

async function ensureOnlineServiceColumns() {
  if (tableReady) return;
  if (tableReadyPromise) return tableReadyPromise;
  tableReadyPromise = (async () => {
    await promisePool.query('ALTER TABLE students ADD COLUMN student_password_hash VARCHAR(255) NULL').catch(() => {});
    await promisePool.query('ALTER TABLE students ADD COLUMN student_force_password_change TINYINT(1) NOT NULL DEFAULT 1').catch(() => {});
    tableReady = true;
  })();
  try {
    await tableReadyPromise;
  } finally {
    tableReadyPromise = null;
  }
}

function requireStudentSession(req, res) {
  const role = String(req.session?.user?.role?.code || req.session?.roleCode || '').toUpperCase();
  const studentId = Number(req.session?.user?.student_id || 0);
  if (role !== 'STUDENT' || !studentId) {
    res.status(401).json({ success: false, message: 'Student session required' });
    return null;
  }
  return studentId;
}

async function safeQuery(sql, params = []) {
  try {
    const [rows] = await promisePool.query(sql, params);
    return rows || [];
  } catch (_err) {
    return [];
  }
}

function norm(v) {
  return String(v || '').trim();
}

function parseAcademicYearStart(academicYear) {
  const m = String(academicYear || '').match(/(\d{4})/);
  return m ? Number(m[1]) : null;
}

router.get('/online-service/dashboard-data', async (req, res) => {
  try {
    await ensureOnlineServiceColumns();
    const studentId = requireStudentSession(req, res);
    if (!studentId) return;
    const schoolId = Number(req.session?.user?.school_id || req.session?.school_id || 0);

    const profileRows = await safeQuery(
      `SELECT s.id, s.student_uid, s.student_code, s.first_name, s.last_name, s.class_name, s.academic_year, s.gender, s.discipline_marks,
              sc.id AS school_id, sc.school_name
       FROM students s
       INNER JOIN schools sc ON sc.id = s.school_id
       WHERE s.id = ? AND s.school_id = ?
       LIMIT 1`,
      [studentId, schoolId]
    );
    const profile = profileRows?.[0] || null;
    if (!profile) {
      return res.status(404).json({ success: false, message: 'Student profile not found' });
    }

    const selectedAcademicYear = norm(req.query?.academic_year || req.query?.year || profile?.academic_year || '');
    const selectedTerm = norm(req.query?.term || '');

    const yearsSet = new Set([norm(profile?.academic_year)].filter(Boolean));
    const termsSet = new Set();

    const settingsRows = await safeQuery(
      `SELECT current_academic_year, active_terms_json
       FROM school_academic_settings
       WHERE school_id = ?
       LIMIT 1`,
      [schoolId]
    );
    if (settingsRows[0]?.current_academic_year) yearsSet.add(norm(settingsRows[0].current_academic_year));
    try {
      const terms = settingsRows[0]?.active_terms_json
        ? (Array.isArray(settingsRows[0].active_terms_json)
          ? settingsRows[0].active_terms_json
          : JSON.parse(settingsRows[0].active_terms_json))
        : [];
      (terms || []).forEach((t) => termsSet.add(norm(t)));
    } catch (_e) {}

    const attendanceRows = await safeQuery(
      `SELECT
         al.record_date,
         ar.status,
         tt.subject_name,
         tt.start_time,
         tt.end_time,
         tt.day_of_week,
         tt.term,
         tt.academic_year
       FROM academic_attendance_records ar
       INNER JOIN academic_attendance_logs al ON al.id = ar.log_id
       LEFT JOIN academic_timetables tt ON tt.id = al.timetable_id
       WHERE ar.student_id = ? AND al.school_id = ?
       ${selectedAcademicYear ? "AND TRIM(COALESCE(tt.academic_year, '')) = ?" : ''}
       ${selectedTerm ? "AND TRIM(COALESCE(tt.term, '')) = ?" : ''}
       ORDER BY al.record_date DESC
       LIMIT 120`,
      [studentId, schoolId, ...(selectedAcademicYear ? [selectedAcademicYear] : []), ...(selectedTerm ? [selectedTerm] : [])]
    );
    const attendanceCalendar = attendanceRows.map((r) => ({
      date: r.record_date,
      status: String(r.status || '').toLowerCase(),
    }));
    attendanceRows.forEach((r) => {
      if (norm(r.academic_year)) yearsSet.add(norm(r.academic_year));
      if (norm(r.term)) termsSet.add(norm(r.term));
    });
    const periodAttendance = attendanceRows.map((r) => ({
      date: r.record_date,
      status: String(r.status || '').toLowerCase(),
      subject_name: r.subject_name || 'Subject',
      day_of_week: r.day_of_week || null,
      time_range: (r.start_time && r.end_time) ? `${r.start_time} - ${r.end_time}` : null,
      term: r.term || null,
      academic_year: r.academic_year || null,
    }));
    const presentLike = attendanceCalendar.filter((r) => r.status === 'present' || r.status === 'late').length;
    const attendancePct = attendanceCalendar.length
      ? Math.round((presentLike / attendanceCalendar.length) * 100)
      : 0;
    const monthlyAttendance = attendanceCalendar.slice(0, 30);
    const monthlyPresent = monthlyAttendance.filter((r) => r.status === 'present').length;
    const monthlyAbsent = monthlyAttendance.filter((r) => r.status === 'absent').length;
    const monthlyLate = monthlyAttendance.filter((r) => r.status === 'late').length;

    const markRows = await safeQuery(
      `SELECT a.subject_name, a.assessment_name, a.max_score, a.created_at AS assessment_date, m.score_obtained
       FROM academic_marks m
       INNER JOIN academic_assessments a ON a.id = m.assessment_id
       WHERE m.student_id = ? AND m.school_id = ?
       ORDER BY a.created_at DESC, m.id DESC
       LIMIT 200`,
      [studentId, schoolId]
    );
    const marks = markRows.map((r) => {
      const max = Number(r.max_score || 100);
      const score = Number(r.score_obtained || 0);
      return {
        subject_name: r.subject_name || 'Subject',
        assessment_name: r.assessment_name || 'Assessment',
        score_obtained: score,
        max_score: max,
        percent: max > 0 ? Math.round((score / max) * 100) : 0,
        assessment_date: r.assessment_date || null,
      };
    });
    const averageGrade = marks.length
      ? Math.round(marks.reduce((sum, r) => sum + Number(r.percent || 0), 0) / marks.length)
      : 0;
    const latestBySubject = {};
    marks.forEach((m) => {
      if (!latestBySubject[m.subject_name]) latestBySubject[m.subject_name] = m;
    });

    const disciplineRows = await safeQuery(
      `SELECT lesson_subject, description, marks_deducted, marks_remaining_after, created_at
       FROM discipline_cases
       WHERE school_id = ? AND student_id = ?
       ORDER BY created_at DESC
       LIMIT 120`,
      [schoolId, studentId]
    );
    const disciplineCases = disciplineRows.map((r) => ({
      lesson_subject: r.lesson_subject || 'General',
      description: r.description || '',
      marks_deducted: Number(r.marks_deducted || 0),
      marks_remaining_after: Number(r.marks_remaining_after || 0),
      created_at: r.created_at || null,
    }));
    const disciplineDeducted = disciplineCases.reduce((sum, c) => sum + Number(c.marks_deducted || 0), 0);
    const disciplineScore = Number(profile.discipline_marks != null ? profile.discipline_marks : Math.max(0, 100 - disciplineDeducted));

    const logYearStart = parseAcademicYearStart(selectedAcademicYear);
    const disciplineLogRows = await safeQuery(
      `SELECT action, marks, reason, notes, action_date, created_at, previous_marks, new_marks
       FROM discipline_mark_logs
       WHERE school_id = ? AND student_id = ? AND undone_at IS NULL
       ${selectedAcademicYear && logYearStart ? 'AND (YEAR(COALESCE(action_date, created_at)) = ? OR YEAR(COALESCE(action_date, created_at)) = ?)' : ''}
       ORDER BY created_at DESC
       LIMIT 200`,
      [
        schoolId,
        studentId,
        ...(selectedAcademicYear && logYearStart ? [logYearStart, logYearStart + 1] : []),
      ]
    );
    const disciplineLogs = disciplineLogRows.map((r) => ({
      action: r.action,
      marks: Number(r.marks || 0),
      reason: r.reason || '',
      notes: r.notes || '',
      action_date: r.action_date || null,
      created_at: r.created_at || null,
      previous_marks: Number(r.previous_marks || 0),
      new_marks: Number(r.new_marks || 0),
    }));

    const feeRows = await safeQuery(
      `SELECT id, academic_year_label, term, class_name, total_due, amount_paid, balance_remaining, notes, created_at
       FROM school_fee_collections
       WHERE school_id = ? AND student_id = ?
       ${selectedAcademicYear ? "AND TRIM(COALESCE(academic_year_label, '')) = ?" : ''}
       ${selectedTerm ? "AND TRIM(COALESCE(term, '')) = ?" : ''}
       ORDER BY created_at DESC
       LIMIT 120`,
      [schoolId, studentId, ...(selectedAcademicYear ? [selectedAcademicYear] : []), ...(selectedTerm ? [selectedTerm] : [])]
    );
    const payments = feeRows.map((r) => ({
      id: r.id,
      academic_year: r.academic_year_label,
      term: r.term,
      class_name: r.class_name,
      total_due: Number(r.total_due || 0),
      amount_paid: Number(r.amount_paid || 0),
      balance_remaining: Number(r.balance_remaining || 0),
      notes: r.notes || '',
      created_at: r.created_at || null,
    }));
    payments.forEach((p) => {
      if (norm(p.academic_year)) yearsSet.add(norm(p.academic_year));
      if (norm(p.term)) termsSet.add(norm(p.term));
    });
    const totalDue = payments.reduce((sum, p) => sum + Number(p.total_due || 0), 0);
    const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount_paid || 0), 0);
    const feesBalance = Math.max(0, totalDue - totalPaid);

    const gateRows = await safeQuery(
      `SELECT attendance_date, morning_check_in, morning_status, evening_check_out, evening_status, term, academic_year
       FROM school_gate_attendance_records
       WHERE school_id = ? AND person_type = 'STUDENT' AND person_id = ?
       ${selectedAcademicYear ? "AND TRIM(COALESCE(academic_year, '')) = ?" : ''}
       ${selectedTerm ? "AND TRIM(COALESCE(term, '')) = ?" : ''}
       ORDER BY attendance_date DESC
       LIMIT 180`,
      [schoolId, studentId, ...(selectedAcademicYear ? [selectedAcademicYear] : []), ...(selectedTerm ? [selectedTerm] : [])]
    );
    gateRows.forEach((r) => {
      if (norm(r.academic_year)) yearsSet.add(norm(r.academic_year));
      if (norm(r.term)) termsSet.add(norm(r.term));
    });
    const gateRecords = gateRows.map((r) => ({
      attendance_date: r.attendance_date,
      morning_check_in: r.morning_check_in || null,
      morning_status: r.morning_status || null,
      evening_check_out: r.evening_check_out || null,
      evening_status: r.evening_status || null,
      term: r.term || null,
      academic_year: r.academic_year || null,
    }));

    const timetableRows = await safeQuery(
      `SELECT
         tt.id,
         tt.class_name,
         tt.subject_name,
         tt.day_of_week,
         tt.start_time,
         tt.end_time,
         tt.room,
         tt.term,
         tt.academic_year,
         TRIM(CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, ''))) AS teacher_name
       FROM academic_timetables tt
       LEFT JOIN users u ON u.id = tt.staff_id
       WHERE tt.school_id = ? AND TRIM(COALESCE(tt.class_name, '')) = ?
       ${selectedAcademicYear ? "AND TRIM(COALESCE(tt.academic_year, '')) = ?" : ''}
       ${selectedTerm ? "AND TRIM(COALESCE(tt.term, '')) = ?" : ''}
       ORDER BY FIELD(tt.day_of_week, "Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"), tt.start_time ASC, tt.id ASC`,
      [
        schoolId,
        norm(profile.class_name),
        ...(selectedAcademicYear ? [selectedAcademicYear] : []),
        ...(selectedTerm ? [selectedTerm] : []),
      ]
    );
    timetableRows.forEach((r) => {
      if (norm(r.academic_year)) yearsSet.add(norm(r.academic_year));
      if (norm(r.term)) termsSet.add(norm(r.term));
    });
    const timetable = timetableRows.map((r) => ({
      id: r.id,
      class_name: r.class_name,
      subject_name: r.subject_name,
      day_of_week: r.day_of_week,
      start_time: r.start_time,
      end_time: r.end_time,
      room: r.room || '',
      term: r.term || null,
      academic_year: r.academic_year || null,
      teacher_name: r.teacher_name || 'Not assigned',
    }));

    const messageRows = await safeQuery(
      `SELECT m.id, m.body, m.created_at, m.sender_type, m.sender_user_id, u.first_name, u.last_name
       FROM school_chat_messages m
       LEFT JOIN users u ON u.id = m.sender_user_id
       WHERE m.school_id = ?
       ORDER BY m.created_at DESC
       LIMIT 40`,
      [schoolId]
    );
    const messages = messageRows.map((m) => ({
      id: m.id,
      body: m.body || '',
      created_at: m.created_at || null,
      sender_type: m.sender_type || 'USER',
      sender_name: `${m.first_name || ''} ${m.last_name || ''}`.trim() || 'Staff',
    }));

    return res.json({
      success: true,
      data: {
        profile: {
          id: profile.id,
          full_name: `${profile.first_name || ''} ${profile.last_name || ''}`.trim(),
          student_uid: profile.student_uid,
          student_code: profile.student_code || profile.student_uid,
          class_name: profile.class_name || null,
          academic_year: profile.academic_year || null,
          school_id: Number(profile.school_id || schoolId),
          discipline_marks: Number(profile.discipline_marks || 0),
          school_name: profile.school_name || null,
          gender: profile.gender || null,
          status: 'Active',
        },
        attendance: {
          percentage: attendancePct,
          today_status: attendanceCalendar[0]?.status || null,
          monthly_summary: { present: monthlyPresent, absent: monthlyAbsent, late: monthlyLate },
          calendar: attendanceCalendar,
          period_records: periodAttendance,
          gate_records: gateRecords,
          gate_summary: {
            morning_checked: gateRecords.filter((r) => !!r.morning_check_in).length,
            evening_checked: gateRecords.filter((r) => !!r.evening_check_out).length,
          },
        },
        marks: {
          average_grade: averageGrade,
          latest_by_subject: Object.values(latestBySubject).slice(0, 14),
          assessments: marks.slice(0, 50),
          timetable,
        },
        discipline: {
          score: disciplineScore,
          behavior_grade: disciplineScore >= 85 ? 'A' : disciplineScore >= 70 ? 'B' : disciplineScore >= 50 ? 'C' : 'D',
          incidents: disciplineCases,
          mark_logs: disciplineLogs,
          current_marks: Number(profile.discipline_marks || 0),
          positive_events: 0,
          negative_events: disciplineCases.length,
        },
        fees: {
          total_due: totalDue,
          total_paid: totalPaid,
          balance: feesBalance,
          payments,
          transactions: payments,
        },
        filters: {
          academic_year: selectedAcademicYear || null,
          term: selectedTerm || null,
          available_academic_years: Array.from(yearsSet).filter(Boolean).sort((a, b) => String(b).localeCompare(String(a))),
          available_terms: Array.from(termsSet).filter(Boolean),
        },
        messages: {
          unread_count: 0,
          recent: messages,
        },
      },
    });
  } catch (err) {
    console.error('GET /online-service/dashboard-data', err);
    return res.status(500).json({ success: false, message: 'Failed to load student dashboard data' });
  }
});

router.post('/online-service/login', async (req, res) => {
  try {
    await ensureOnlineServiceColumns();
    const studentCode = String(req.body?.studentCode || '').trim();
    const password = String(req.body?.password || '');

    if (!studentCode || !password) {
      return res.status(400).json({ success: false, message: 'Student code and password are required' });
    }

    const [rows] = await promisePool.query(
      `SELECT
         s.id, s.student_uid, s.student_code, s.first_name, s.last_name, s.class_name, s.academic_year,
         s.father_phone, s.mother_phone,
         s.student_password_hash, s.student_force_password_change,
         sc.id AS school_id, sc.school_name, sc.school_code
       FROM students s
       INNER JOIN schools sc ON sc.id = s.school_id
       WHERE (
         TRIM(COALESCE(s.student_code, '')) = ?
         OR TRIM(COALESCE(s.student_uid, '')) = ?
       )
       AND sc.deleted_at IS NULL
       LIMIT 1`,
      [studentCode, studentCode]
    );

    const student = rows?.[0];
    if (!student) {
      return res.status(401).json({ success: false, message: 'Invalid student code or password' });
    }

    let passwordValid = false;
    const hasCustomPassword = !!student.student_password_hash;

    if (hasCustomPassword) {
      passwordValid = await bcrypt.compare(password, student.student_password_hash);
    } else {
      const expected = normalizeSchoolPasswordInput(student.school_name);
      const provided = normalizeSchoolPasswordInput(password);
      passwordValid = !!expected && provided === expected;
    }

    if (!passwordValid) {
      return res.status(401).json({ success: false, message: 'Invalid student code or password' });
    }

    const forcePasswordChange = hasCustomPassword ? !!Number(student.student_force_password_change || 0) : true;
    const linkedParentPhone = normalizePhone(student.father_phone) || normalizePhone(student.mother_phone) || null;
    if (!hasCustomPassword) {
      await promisePool.query(
        'UPDATE students SET student_force_password_change = 1 WHERE id = ?',
        [student.id]
      ).catch(() => {});
    }

    req.session.regenerate((regenErr) => {
      if (regenErr) {
        console.error('[online-service/login] session.regenerate:', regenErr);
        return res.status(500).json({ success: false, message: 'Session error. Try again.' });
      }

      req.session.userId = null;
      req.session.roleCode = 'STUDENT';
      req.session.school_id = Number(student.school_id);
      req.session.user = {
        id: `student-${student.id}`,
        student_id: Number(student.id),
        student_uid: student.student_uid,
        student_code: student.student_code || student.student_uid,
        first_name: student.first_name,
        last_name: student.last_name,
        full_name: `${student.first_name || ''} ${student.last_name || ''}`.trim(),
        class_name: student.class_name || null,
        academic_year: student.academic_year || null,
        role: { code: 'STUDENT', name: 'Student' },
        school_id: Number(student.school_id),
        school: {
          id: Number(student.school_id),
          name: student.school_name,
          code: student.school_code,
        },
        parent_phone: linkedParentPhone,
        chat_as_parent: !!linkedParentPhone,
        force_password_change: forcePasswordChange,
      };

      req.session.save((saveErr) => {
        if (saveErr) {
          console.error('[online-service/login] session.save:', saveErr);
          return res.status(500).json({ success: false, message: 'Session save failed' });
        }
        return res.json({
          success: true,
          message: 'Login successful',
          role: 'STUDENT',
          redirect: '/online-service/dashboard',
        });
      });
    });
  } catch (err) {
    console.error('POST /online-service/login', err);
    return res.status(500).json({ success: false, message: 'Failed to login student' });
  }
});

router.put('/online-service/change-password', async (req, res) => {
  try {
    await ensureOnlineServiceColumns();
    const studentId = requireStudentSession(req, res);
    if (!studentId) return;

    const currentPassword = String(req.body?.currentPassword || '');
    const newPassword = String(req.body?.newPassword || '');

    if (newPassword.length < 8) {
      return res.status(400).json({ success: false, message: 'New password must be at least 8 characters' });
    }

    const [rows] = await promisePool.query(
      `SELECT s.id, s.student_password_hash, s.student_force_password_change, sc.school_name
       FROM students s
       INNER JOIN schools sc ON sc.id = s.school_id
       WHERE s.id = ?
       LIMIT 1`,
      [studentId]
    );
    const student = rows?.[0];
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student account not found' });
    }

    const isForced = !!Number(student.student_force_password_change || 0);
    let currentValid = false;

    if (student.student_password_hash) {
      currentValid = await bcrypt.compare(currentPassword, student.student_password_hash);
    } else {
      const expected = normalizeSchoolPasswordInput(student.school_name);
      const provided = normalizeSchoolPasswordInput(currentPassword);
      currentValid = !!expected && provided === expected;
    }

    if (!isForced && !currentPassword) {
      return res.status(400).json({ success: false, message: 'Current password is required' });
    }
    if (!isForced && !currentValid) {
      return res.status(400).json({ success: false, message: 'Current password is incorrect' });
    }
    if (isForced && currentPassword && !currentValid) {
      return res.status(400).json({ success: false, message: 'Current password is incorrect' });
    }

    const newHash = await bcrypt.hash(newPassword, 10);
    await promisePool.query(
      `UPDATE students
       SET student_password_hash = ?, student_force_password_change = 0, updated_at = NOW()
       WHERE id = ?`,
      [newHash, studentId]
    );

    if (req.session?.user) {
      req.session.user.force_password_change = false;
    }

    return res.json({ success: true, message: 'Password changed successfully' });
  } catch (err) {
    console.error('PUT /online-service/change-password', err);
    return res.status(500).json({ success: false, message: 'Failed to change password' });
  }
});

module.exports = router;
