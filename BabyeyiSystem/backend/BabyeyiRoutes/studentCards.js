const express = require('express');
const PDFDocument = require('pdfkit');
const path = require('path');
const fs = require('fs');
const QRCode = require('qrcode');
const { promisePool } = require('../config/database');
const { requireRole } = require('../middleware/deoAuth');
const { loadApprovedBabyeyiPricing } = require('./babyeyiPublicPricingCore');

const router = express.Router();

const ALLOWED_ROLES = [
  'SUPER_ADMIN',
  'FULL_SYSTEM_CONTROLLER',
  'SCHOOL_ADMIN',
  'SCHOOL_MANAGER',
  'DOS',
];

function buildAbsoluteUploadPath(raw) {
  if (!raw) return null;
  const clean = String(raw).replace(/^\/+/, '');
  const candidate = path.join(__dirname, '..', clean);
  return fs.existsSync(candidate) ? candidate : null;
}

function buildStudentProfileUrl(req, studentId) {
  const origin = process.env.PUBLIC_APP_BASE_URL || `${req.protocol}://${req.get('host')}`;
  return `${origin}/online-service/dashboard?student=${encodeURIComponent(studentId)}`;
}

async function toQrDataUrl(content) {
  return QRCode.toDataURL(content, {
    errorCorrectionLevel: 'H',
    margin: 1,
    width: 280,
  });
}

async function getStudentCardRow(studentId) {
  const [rows] = await promisePool.query(
    `SELECT st.id, st.student_uid, st.student_code, st.first_name, st.last_name, st.birth_year, st.gender,
            st.class_name, st.academic_year, st.student_photo, st.updated_at AS student_updated_at,
            sc.id AS school_id, sc.school_name, sc.logo_url, sc.website,
            sc.phone AS school_phone, sc.email AS school_email, sc.postal_address,
            sc.head_teacher_name, sc.head_signature_url,
            sc.province, sc.district, sc.sector
     FROM students st
     JOIN schools sc ON sc.id = st.school_id
     WHERE st.id = ? AND st.school_id IS NOT NULL
     LIMIT 1`,
    [studentId]
  );
  return rows[0] || null;
}

/**
 * Public QR profile — accepts EITHER:
 *   - numeric DB id  (e.g. 893)      ← legacy cards
 *   - student_code string (e.g. 150010001) ← cards printed after the fix
 * No login required.
 */
async function getPublicStudentProfileRow(identifier) {
  // If the identifier is purely numeric treat it as the DB primary key first,
  // but also fall back to student_code so old cards still work.
  const asNum = Number(identifier);
  const isNumericId = Number.isInteger(asNum) && asNum > 0 && String(identifier).trim() === String(asNum);

  const [rows] = await promisePool.query(
    `SELECT st.id, st.student_uid, st.student_code, st.first_name, st.last_name, st.birth_year, st.gender,
            st.class_name, st.academic_year, st.student_photo, st.updated_at AS student_updated_at,
            sc.id AS school_id, sc.school_name, sc.logo_url, sc.website,
            sc.phone AS school_phone, sc.email AS school_email, sc.postal_address,
            sc.province, sc.district, sc.sector
     FROM students st
     LEFT JOIN schools sc ON sc.id = st.school_id
     WHERE ${isNumericId ? 'st.id = ? OR st.student_code = ?' : 'st.student_code = ? OR st.student_uid = ?'}
     LIMIT 1`,
    isNumericId ? [asNum, String(identifier).trim()] : [String(identifier).trim(), String(identifier).trim()]
  );
  return rows[0] || null;
}

async function getStudentCardPayload(req, studentId) {
  const row = await getStudentCardRow(studentId);
  if (!row) return null;
  const qrContent = buildStudentProfileUrl(req, row.id);
  const qrDataUrl = await toQrDataUrl(qrContent);
  const issued = row.student_updated_at ? new Date(row.student_updated_at) : new Date();
  const dateIssuedStr = `${String(issued.getDate()).padStart(2, '0')} / ${String(issued.getMonth() + 1).padStart(2, '0')} / ${issued.getFullYear()}`;
  const locationLine = [row.sector, row.district, row.province].filter(Boolean).join(' · ');
  return {
    id: row.id,
    school_id: row.school_id,
    student_code: row.student_code || row.student_uid || `ST-${row.id}`,
    full_name: `${row.first_name || ''} ${row.last_name || ''}`.trim(),
    date_of_birth: row.birth_year ? String(row.birth_year) : '-',
    gender: row.gender || '-',
    class_name: row.class_name || '-',
    school_name: row.school_name || '-',
    academic_year: row.academic_year || '-',
    date_issued: dateIssuedStr,
    website: row.website ? String(row.website).trim() : null,
    postal_address: row.postal_address ? String(row.postal_address).trim() : null,
    school_phone: row.school_phone ? String(row.school_phone).trim() : null,
    school_email: row.school_email ? String(row.school_email).trim() : null,
    location_line: locationLine || null,
    head_teacher_name: row.head_teacher_name ? String(row.head_teacher_name).trim() : null,
    head_signature_url: row.head_signature_url ? String(row.head_signature_url).trim() : null,
    head_signature_path: buildAbsoluteUploadPath(row.head_signature_url),
    student_photo_url: row.student_photo ? `/uploads/student-profile-photos/${row.student_photo}` : null,
    student_photo_path: row.student_photo ? buildAbsoluteUploadPath(`/uploads/student-profile-photos/${row.student_photo}`) : null,
    school_logo_url: row.logo_url || null,
    school_logo_path: buildAbsoluteUploadPath(row.logo_url),
    country_logo_url: process.env.COUNTRY_LOGO_URL || null,
    country_logo_path: buildAbsoluteUploadPath(process.env.COUNTRY_LOGO_URL || ''),
    qr_content: qrContent,
    qr_data_url: qrDataUrl,
  };
}

// Public profile lookup for QR page (no login required).
// Accepts numeric DB id OR student_code string (e.g. 150010001).
router.get('/students/public/:id', async (req, res) => {
  try {
    const identifier = String(req.params.id || '').trim();
    if (!identifier) {
      return res.status(400).json({ success: false, message: 'Invalid student id or code' });
    }

    const row = await getPublicStudentProfileRow(identifier);
    if (!row) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    return res.json({
      success: true,
      data: {
        id: row.id,
        full_name: `${row.first_name || ''} ${row.last_name || ''}`.trim(),
        first_name: row.first_name || '',
        last_name: row.last_name || '',
        code: row.student_code || row.student_uid || `ST-${row.id}`,
        student_code: row.student_code || row.student_uid || `ST-${row.id}`,
        student_uid: row.student_uid || null,
        birth_year: row.birth_year || null,
        gender: row.gender || null,
        class_name: row.class_name || null,
        academic_year: row.academic_year || null,
        student_photo: row.student_photo || null,
        photo_url: row.student_photo ? `/uploads/student-profile-photos/${row.student_photo}` : null,
        school_id: row.school_id,
        school_name: row.school_name || null,
        logo_url: row.logo_url || null,
        school_phone: row.school_phone || null,
        school_email: row.school_email || null,
        school_website: row.website || null,
        postal_address: row.postal_address || null,
        province: row.province || null,
        district: row.district || null,
        sector: row.sector || null,
      },
    });
  } catch (err) {
    console.error('GET /students/public/:id error:', err);
    return res.status(500).json({ success: false, message: 'Failed to load public student profile' });
  }
});

function normStr(v) {
  return String(v || '').trim();
}

function yearMatchesRow(rowYear, inputLabel) {
  const a = rowYear === null || rowYear === undefined ? '' : String(rowYear);
  const b = normStr(inputLabel);
  if (!b) return true;
  if (a === b) return true;
  const num = parseInt(a, 10);
  if (!Number.isNaN(num) && b.startsWith(String(num))) return true;
  if (b.includes('-')) {
    const first = b.split('-')[0];
    if (a === first) return true;
  }
  return false;
}

function termMatchesRow(rowTerm, inputTerm) {
  const b = normStr(inputTerm);
  if (!b) return true;
  const a = rowTerm === null || rowTerm === undefined ? '' : String(rowTerm).trim();
  return a.toLowerCase() === b.toLowerCase();
}

function classMatchesBabyeyi(row, className) {
  const c = normStr(className);
  if (!c) return false;
  const primary = normStr(row.class_name);
  if (primary && primary.toLowerCase() === c.toLowerCase()) return true;
  try {
    const arr = typeof row.classes_json === 'string' ? JSON.parse(row.classes_json) : row.classes_json;
    if (Array.isArray(arr)) {
      return arr.some((x) => String(x).trim().toLowerCase() === c.toLowerCase());
    }
  } catch {
    /* ignore */
  }
  return false;
}

async function safeInsightQuery(sql, params = []) {
  try {
    const [rows] = await promisePool.query(sql, params);
    return rows || [];
  } catch {
    return [];
  }
}

async function findApprovedBabyeyiForClass(schoolId, className, academicYearLabel, termLabel) {
  const rows = await safeInsightQuery(
    `SELECT id, school_id, academic_year, term, class_name, classes_json, status, total_fee
     FROM school_babyeyi
     WHERE school_id = ? AND is_active = 1 AND status = 'approved'
     ORDER BY created_at DESC, id DESC
     LIMIT 200`,
    [schoolId]
  );
  for (const r of rows) {
    if (
      classMatchesBabyeyi(r, className)
      && yearMatchesRow(r.academic_year, academicYearLabel || '')
      && termMatchesRow(r.term, termLabel || '')
    ) {
      return r;
    }
  }
  const archRows = await safeInsightQuery(
    `SELECT babyeyi_id, school_id, academic_year, term, class_name, classes_json
     FROM accountant_babyeyi_fee_archive
     WHERE school_id = ?
     ORDER BY updated_at DESC`,
    [schoolId]
  );
  for (const a of archRows) {
    if (
      classMatchesBabyeyi(a, className)
      && yearMatchesRow(a.academic_year, academicYearLabel || '')
      && termMatchesRow(a.term, termLabel || '')
    ) {
      return {
        id: a.babyeyi_id,
        school_id: a.school_id,
        academic_year: a.academic_year,
        term: a.term,
        class_name: a.class_name,
        status: 'approved',
      };
    }
  }
  return null;
}

function parseAcademicYearStart(academicYear) {
  const m = String(academicYear || '').match(/(\d{4})/);
  return m ? Number(m[1]) : null;
}

function todayDateStr() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// Public school insights for QR profile (discipline, marks, gate, period attendance, class Babyeyi).
router.get('/students/public/:id/school-insights', async (req, res) => {
  try {
    const identifier = String(req.params.id || '').trim();
    if (!identifier) {
      return res.status(400).json({ success: false, message: 'Invalid student id or code' });
    }

    const row = await getPublicStudentProfileRow(identifier);
    if (!row) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    const studentId = Number(row.id);
    const schoolId = Number(row.school_id);
    if (!studentId || !schoolId) {
      return res.status(404).json({ success: false, message: 'Student school not found' });
    }

    const settingsRows = await safeInsightQuery(
      `SELECT current_academic_year, active_terms_json
       FROM school_academic_settings
       WHERE school_id = ?
       LIMIT 1`,
      [schoolId]
    );
    let defaultTerm = '';
    try {
      const terms = settingsRows[0]?.active_terms_json
        ? (Array.isArray(settingsRows[0].active_terms_json)
          ? settingsRows[0].active_terms_json
          : JSON.parse(settingsRows[0].active_terms_json))
        : [];
      defaultTerm = normStr(terms?.[0]);
    } catch {
      defaultTerm = '';
    }

    const selectedAcademicYear = normStr(
      req.query?.academic_year || req.query?.year || settingsRows[0]?.current_academic_year || row.academic_year || ''
    );
    const selectedTerm = normStr(req.query?.term || defaultTerm);
    const today = todayDateStr();
    const className = normStr(row.class_name);

    const profileRows = await safeInsightQuery(
      `SELECT discipline_marks FROM students WHERE id = ? AND school_id = ? LIMIT 1`,
      [studentId, schoolId]
    );
    const disciplineMarksStored = Number(profileRows[0]?.discipline_marks ?? 0);

    const disciplineRows = await safeInsightQuery(
      `SELECT lesson_subject, description, marks_deducted, marks_remaining_after, created_at
       FROM discipline_cases
       WHERE school_id = ? AND student_id = ?
       ORDER BY created_at DESC
       LIMIT 80`,
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
    const disciplineScore = Number.isFinite(disciplineMarksStored) && disciplineMarksStored > 0
      ? disciplineMarksStored
      : Math.max(0, 100 - disciplineDeducted);

    const logYearStart = parseAcademicYearStart(selectedAcademicYear);
    const disciplineLogRows = await safeInsightQuery(
      `SELECT action, marks, reason, notes, action_date, created_at, previous_marks, new_marks
       FROM discipline_mark_logs
       WHERE school_id = ? AND student_id = ? AND undone_at IS NULL
       ${selectedAcademicYear && logYearStart ? 'AND (YEAR(COALESCE(action_date, created_at)) = ? OR YEAR(COALESCE(action_date, created_at)) = ?)' : ''}
       ORDER BY created_at DESC
       LIMIT 80`,
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

    const markRows = await safeInsightQuery(
      `SELECT a.subject_name, a.assessment_name, a.max_score, a.created_at AS assessment_date, m.score_obtained
       FROM academic_marks m
       INNER JOIN academic_assessments a ON a.id = m.assessment_id
       WHERE m.student_id = ? AND m.school_id = ?
       ORDER BY a.created_at DESC, m.id DESC
       LIMIT 120`,
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

    const gateRows = await safeInsightQuery(
      `SELECT attendance_date, morning_check_in, morning_status, evening_check_out, evening_status, term, academic_year
       FROM school_gate_attendance_records
       WHERE school_id = ? AND person_type = 'STUDENT' AND person_id = ?
       ${selectedAcademicYear ? "AND TRIM(COALESCE(academic_year, '')) = ?" : ''}
       ${selectedTerm ? "AND TRIM(COALESCE(term, '')) = ?" : ''}
       ORDER BY attendance_date DESC
       LIMIT 60`,
      [schoolId, studentId, ...(selectedAcademicYear ? [selectedAcademicYear] : []), ...(selectedTerm ? [selectedTerm] : [])]
    );
    const gateRecords = gateRows.map((r) => ({
      attendance_date: r.attendance_date,
      morning_check_in: r.morning_check_in || null,
      morning_status: r.morning_status || null,
      evening_check_out: r.evening_check_out || null,
      evening_status: r.evening_status || null,
      term: r.term || null,
      academic_year: r.academic_year || null,
    }));
    const gateTodayRow = gateRecords.find((r) => {
      const d = r.attendance_date ? String(r.attendance_date).slice(0, 10) : '';
      return d === today;
    }) || null;

    const attendanceRows = await safeInsightQuery(
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
       ORDER BY al.record_date DESC, tt.start_time ASC
       LIMIT 120`,
      [studentId, schoolId, ...(selectedAcademicYear ? [selectedAcademicYear] : []), ...(selectedTerm ? [selectedTerm] : [])]
    );
    const periodRecords = attendanceRows.map((r) => ({
      date: r.record_date,
      status: String(r.status || '').toLowerCase(),
      subject_name: r.subject_name || 'Subject',
      day_of_week: r.day_of_week || null,
      time_range: (r.start_time && r.end_time) ? `${r.start_time} - ${r.end_time}` : null,
      term: r.term || null,
      academic_year: r.academic_year || null,
    }));
    const periodToday = periodRecords.filter((r) => {
      const d = r.date ? String(r.date).slice(0, 10) : '';
      return d === today;
    });

    const timetableRows = await safeInsightQuery(
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
        className,
        ...(selectedAcademicYear ? [selectedAcademicYear] : []),
        ...(selectedTerm ? [selectedTerm] : []),
      ]
    );
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

    let babyeyi = null;
    if (className) {
      const babyeyiRow = await findApprovedBabyeyiForClass(
        schoolId,
        className,
        selectedAcademicYear,
        selectedTerm
      );
      if (babyeyiRow?.id) {
        const pricing = await loadApprovedBabyeyiPricing(babyeyiRow.id, schoolId);
        if (pricing.ok) {
          babyeyi = {
            babyeyi_id: babyeyiRow.id,
            class_name: className,
            academic_year: babyeyiRow.academic_year || selectedAcademicYear || null,
            term: babyeyiRow.term || selectedTerm || null,
            ...pricing.data,
          };
        }
      }
    }

    return res.json({
      success: true,
      data: {
        student_id: studentId,
        school_id: schoolId,
        class_name: className || null,
        filters: {
          academic_year: selectedAcademicYear || null,
          term: selectedTerm || null,
          today,
        },
        discipline: {
          score: disciplineScore,
          behavior_grade: disciplineScore >= 85 ? 'A' : disciplineScore >= 70 ? 'B' : disciplineScore >= 50 ? 'C' : 'D',
          current_marks: disciplineMarksStored,
          incidents: disciplineCases,
          mark_logs: disciplineLogs,
          negative_events: disciplineCases.length,
        },
        marks: {
          average_grade: averageGrade,
          latest_by_subject: Object.values(latestBySubject).slice(0, 20),
          assessments: marks.slice(0, 60),
        },
        gate: {
          today: gateTodayRow,
          recent: gateRecords.slice(0, 14),
        },
        period_attendance: {
          today: periodToday,
          recent: periodRecords.slice(0, 30),
          timetable,
        },
        babyeyi,
      },
    });
  } catch (err) {
    console.error('GET /students/public/:id/school-insights', err);
    return res.status(500).json({ success: false, message: 'Failed to load student school insights' });
  }
});

function drawCardPage(doc, card) {
  const W = 980;
  const H = 560;
  const M = 24;
  const blue = '#0A2C61';
  const gold = '#D4A22A';

  doc.addPage({ size: [W, H], margin: 0 });
  doc.roundedRect(M, M, W - M * 2, H - M * 2, 28).fillAndStroke('#FFFFFF', blue);

  doc.roundedRect(M, H - 86, W - M * 2, 62, 24).fill(blue);
  doc.fillColor(gold).fontSize(16).font('Helvetica-Bold').text('DISCIPLINE • KNOWLEDGE • EXCELLENCE', M + 240, H - 62, { align: 'center', width: 500 });
  doc.fillColor('#FFFFFF').fontSize(12).font('Helvetica').text('www.babyeyi.rw', M + 240, H - 42, { align: 'center', width: 500 });

  doc.fillColor(blue).font('Helvetica-Bold').fontSize(48).text(card.school_name || 'SCHOOL', 190, 44, { width: 600 });
  doc.fillColor(gold).fontSize(20).text('QUALITY EDUCATION, BRIGHTER TOMORROW', 192, 102, { width: 560 });
  doc.fillColor(blue).fontSize(34).text('STUDENT ID CARD', 300, 142, { width: 420 });

  doc.roundedRect(52, 176, 220, 286, 24).lineWidth(2).stroke('#123B74');
  if (card.student_photo_path && fs.existsSync(card.student_photo_path)) {
    doc.image(card.student_photo_path, 64, 188, { width: 196, height: 262, fit: [196, 262] });
  } else {
    doc.fillColor('#EEF3FF').rect(64, 188, 196, 262).fill();
    doc.fillColor('#5C6F91').font('Helvetica-Bold').fontSize(20).text('PHOTO', 130, 300);
  }

  if (card.school_logo_path && fs.existsSync(card.school_logo_path)) {
    doc.image(card.school_logo_path, 34, 28, { width: 130, height: 130, fit: [130, 130] });
  }
  if (card.country_logo_path && fs.existsSync(card.country_logo_path)) {
    doc.image(card.country_logo_path, W - 174, 28, { width: 130, height: 130, fit: [130, 130] });
  }

  const sx = 300;
  const sy = 224;
  const gap = 46;
  const labels = [
    ['STUDENT CODE', card.student_code],
    ['FULL NAME', card.full_name],
    ['DATE OF BIRTH', card.date_of_birth],
    ['GENDER', card.gender],
    ['CLASS', card.class_name],
    ['ACADEMIC YEAR', card.academic_year],
  ];
  labels.forEach(([k, v], i) => {
    const y = sy + i * gap;
    doc.fillColor('#111').font('Helvetica-Bold').fontSize(27).text(k, sx, y, { width: 260 });
    doc.fontSize(27).text(':', sx + 255, y);
    doc.fillColor(blue).text(String(v || '-'), sx + 292, y, { width: 360 });
  });

  if (card.qr_data_url) {
    doc.image(card.qr_data_url, W - 212, H - 228, { width: 150, height: 150 });
  }
}

router.get('/student-cards/students', requireRole(ALLOWED_ROLES), async (req, res) => {
  try {
    const {
      province = '',
      district = '',
      sector = '',
      school_id = '',
      class_name = '',
      q = '',
      limit = '100',
    } = req.query;
    const where = ['st.school_id = sc.id', 'sc.deleted_at IS NULL'];
    const params = [];
    if (province) { where.push('sc.province = ?'); params.push(String(province).trim()); }
    if (district) { where.push('sc.district = ?'); params.push(String(district).trim()); }
    if (sector) { where.push('sc.sector = ?'); params.push(String(sector).trim()); }
    if (school_id) { where.push('sc.id = ?'); params.push(Number(school_id)); }
    if (class_name) { where.push('st.class_name = ?'); params.push(String(class_name).trim()); }
    if (q) {
      const like = `%${String(q).trim()}%`;
      where.push("(st.first_name LIKE ? OR st.last_name LIKE ? OR CONCAT(st.first_name,' ',st.last_name) LIKE ? OR st.student_uid LIKE ? OR st.student_code LIKE ?)");
      params.push(like, like, like, like, like);
    }
    const maxLimit = Math.min(Math.max(Number(limit) || 100, 1), 500);
    const [rows] = await promisePool.query(
      `SELECT st.id, st.first_name, st.last_name, st.student_uid, st.student_code,
              st.gender, st.birth_year, st.class_name, st.academic_year, st.student_photo,
              sc.id AS school_id, sc.school_name, sc.logo_url,
              sc.phone AS school_phone, sc.email AS school_email, sc.postal_address, sc.website AS school_website,
              sc.province, sc.district, sc.sector
       FROM students st
       JOIN schools sc ON ${where.join(' AND ')}
       ORDER BY sc.school_name ASC, st.class_name ASC, st.first_name ASC, st.last_name ASC
       LIMIT ?`,
      [...params, maxLimit]
    );
    const data = rows.map((r) => ({
      ...r,
      full_name: `${r.first_name || ''} ${r.last_name || ''}`.trim(),
      photo_url: r.student_photo ? `/uploads/student-profile-photos/${r.student_photo}` : null,
      code: r.student_code || r.student_uid || `ST-${r.id}`,
    }));
    res.json({ success: true, data });
  } catch (err) {
    console.error('GET /student-cards/students error:', err);
    res.status(500).json({ success: false, message: 'Failed to load student cards list' });
  }
});

router.get('/student-cards/filters/schools', requireRole(ALLOWED_ROLES), async (req, res) => {
  try {
    const { province = '', district = '', sector = '' } = req.query;
    const where = ['deleted_at IS NULL'];
    const params = [];
    if (province) { where.push('province = ?'); params.push(String(province).trim()); }
    if (district) { where.push('district = ?'); params.push(String(district).trim()); }
    if (sector) { where.push('sector = ?'); params.push(String(sector).trim()); }
    const [rows] = await promisePool.query(
      `SELECT id, school_name, province, district, sector
       FROM schools
       WHERE ${where.join(' AND ')}
       ORDER BY school_name ASC`,
      params
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('GET /student-cards/filters/schools error:', err);
    res.status(500).json({ success: false, message: 'Failed to load schools' });
  }
});

router.get('/student-cards/filters/classes', requireRole(ALLOWED_ROLES), async (req, res) => {
  try {
    const schoolId = Number(req.query.school_id || 0);
    if (!schoolId) return res.status(400).json({ success: false, message: 'school_id is required' });
    const [rows] = await promisePool.query(
      `SELECT TRIM(class_name) AS class_name
       FROM students
       WHERE school_id = ? AND class_name IS NOT NULL AND TRIM(class_name) <> ''
       GROUP BY TRIM(class_name)
       ORDER BY TRIM(class_name) ASC`,
      [schoolId]
    );
    res.json({ success: true, data: rows.map((r) => r.class_name) });
  } catch (err) {
    console.error('GET /student-cards/filters/classes error:', err);
    res.status(500).json({ success: false, message: 'Failed to load classes' });
  }
});

router.get('/student-cards/:studentId/template', requireRole(ALLOWED_ROLES), async (req, res) => {
  try {
    const studentId = Number(req.params.studentId);
    if (!studentId) return res.status(400).json({ success: false, message: 'Invalid student id' });
    const data = await getStudentCardPayload(req, studentId);
    if (!data) return res.status(404).json({ success: false, message: 'Student not found' });
    res.json({ success: true, data });
  } catch (err) {
    console.error('GET /student-cards/:studentId/template error:', err);
    res.status(500).json({ success: false, message: 'Failed to load card template data' });
  }
});

router.get('/student-cards/:studentId/pdf', requireRole(ALLOWED_ROLES), async (req, res) => {
  try {
    const studentId = Number(req.params.studentId);
    if (!studentId) return res.status(400).json({ success: false, message: 'Invalid student id' });
    const card = await getStudentCardPayload(req, studentId);
    if (!card) return res.status(404).json({ success: false, message: 'Student not found' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="student-card-${card.student_code}.pdf"`);
    const doc = new PDFDocument({ autoFirstPage: false });
    doc.pipe(res);
    drawCardPage(doc, card);
    doc.end();
  } catch (err) {
    console.error('GET /student-cards/:studentId/pdf error:', err);
    res.status(500).json({ success: false, message: 'Failed to generate card PDF' });
  }
});

router.post('/student-cards/bulk/pdf', requireRole(ALLOWED_ROLES), async (req, res) => {
  try {
    const idsRaw = Array.isArray(req.body?.student_ids) ? req.body.student_ids : [];
    const ids = [...new Set(idsRaw.map((x) => Number(x)).filter((x) => Number.isInteger(x) && x > 0))];
    if (!ids.length) return res.status(400).json({ success: false, message: 'student_ids is required' });
    if (ids.length > 300) return res.status(400).json({ success: false, message: 'Maximum 300 cards per bulk export' });
    const cards = [];
    for (const id of ids) {
      const payload = await getStudentCardPayload(req, id);
      if (payload) cards.push(payload);
    }
    if (!cards.length) return res.status(404).json({ success: false, message: 'No matching students found' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="student-cards-bulk.pdf"');
    const doc = new PDFDocument({ autoFirstPage: false });
    doc.pipe(res);
    cards.forEach((card) => drawCardPage(doc, card));
    doc.end();
  } catch (err) {
    console.error('POST /student-cards/bulk/pdf error:', err);
    res.status(500).json({ success: false, message: 'Failed to export bulk card PDF' });
  }
});

router.post('/student-cards/cache/refresh/:studentId', requireRole(ALLOWED_ROLES), async (req, res) => {
  try {
    const studentId = Number(req.params.studentId);
    if (!studentId) return res.status(400).json({ success: false, message: 'Invalid student id' });
    const card = await getStudentCardPayload(req, studentId);
    if (!card) return res.status(404).json({ success: false, message: 'Student not found' });
    await promisePool.query(
      `CREATE TABLE IF NOT EXISTS student_card_cache (
         student_id INT UNSIGNED NOT NULL PRIMARY KEY,
         payload_json LONGTEXT NOT NULL,
         updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
       ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
    );
    await promisePool.query(
      `INSERT INTO student_card_cache (student_id, payload_json, updated_at)
       VALUES (?, ?, NOW())
       ON DUPLICATE KEY UPDATE payload_json = VALUES(payload_json), updated_at = NOW()`,
      [studentId, JSON.stringify(card)]
    );
    res.json({ success: true, message: 'Student card cache refreshed', data: { student_id: studentId } });
  } catch (err) {
    console.error('POST /student-cards/cache/refresh/:studentId error:', err);
    res.status(500).json({ success: false, message: 'Failed to refresh student card cache' });
  }
});

module.exports = router;
