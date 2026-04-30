const express = require('express');
const PDFDocument = require('pdfkit');
const path = require('path');
const fs = require('fs');
const QRCode = require('qrcode');
const { promisePool } = require('../config/database');
const { requireRole } = require('../middleware/deoAuth');

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

/** Public QR profile — include students even when school_id is missing (JOIN would drop them). */
async function getPublicStudentProfileRow(studentId) {
  const [rows] = await promisePool.query(
    `SELECT st.id, st.student_uid, st.student_code, st.first_name, st.last_name, st.birth_year, st.gender,
            st.class_name, st.academic_year, st.student_photo, st.updated_at AS student_updated_at,
            sc.id AS school_id, sc.school_name, sc.logo_url, sc.website,
            sc.phone AS school_phone, sc.email AS school_email, sc.postal_address,
            sc.province, sc.district, sc.sector
     FROM students st
     LEFT JOIN schools sc ON sc.id = st.school_id
     WHERE st.id = ?
     LIMIT 1`,
    [studentId]
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
router.get('/students/public/:id', async (req, res) => {
  try {
    const studentId = Number(req.params.id);
    if (!studentId) {
      return res.status(400).json({ success: false, message: 'Invalid student id' });
    }

    const row = await getPublicStudentProfileRow(studentId);
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
