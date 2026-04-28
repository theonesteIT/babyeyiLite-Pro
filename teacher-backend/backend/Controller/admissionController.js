// ================================================================
//  admissionController.js  —  BabyEyi / EduRwanda  v1.0
//
//  Handles:
//    GET    /api/admissions/school/:schoolId          → get form for school
//    POST   /api/admissions/school/:schoolId          → create/replace form
//    PUT    /api/admissions/forms/:formId             → update form meta + questions
//    PATCH  /api/admissions/forms/:formId/status      → open / close / pause
//    DELETE /api/admissions/forms/:formId             → delete form
//    GET    /api/admissions/forms/:formId/public      → public form (no auth)
//    POST   /api/admissions/forms/:formId/apply       → submit application (public)
//    GET    /api/admissions/forms/:formId/applications→ list applications (manager)
//    PATCH  /api/admissions/applications/:appId/status→ update app status
// ================================================================
'use strict';

const path = require('path');
const fs   = require('fs');
const { promisePool } = require('../config/database');

// ── Helpers ───────────────────────────────────────────────────
function tryJson(v) {
  if (!v) return null;
  if (typeof v === 'object') return v;
  try { return JSON.parse(v); } catch { return null; }
}

function toJson(v) {
  if (v === null || v === undefined) return null;
  if (typeof v === 'string') return v;
  return JSON.stringify(v);
}

function toUrl(p) {
  if (!p) return null;
  const norm = p.replace(/\\/g, '/');
  const idx  = norm.indexOf('uploads/');
  if (idx === -1) return p;
  return '/' + norm.slice(idx);
}

function genRef() {
  const now = new Date();
  const yr  = now.getFullYear();
  const seq = String(Math.floor(Math.random() * 999999) + 1).padStart(6, '0');
  return `APP-${yr}-${seq}`;
}

// Shape a form row from DB
function shapeForm(row, questions = []) {
  return {
    id:                  row.id,
    schoolId:            row.school_id,
    miniWebsiteId:       row.mini_website_id || null,
    title:               row.title,
    description:         row.description || null,
    academicYear:        row.academic_year || null,
    applicationStart:    row.application_start || null,
    applicationDeadline: row.application_deadline || null,
    maxApplicants:       row.max_applicants || null,
    status:              row.status,
    createdAt:           row.created_at,
    updatedAt:           row.updated_at,
    questions:           questions.map(shapeQuestion),
  };
}

function shapeQuestion(q) {
  return {
    id:            q.id,
    formId:        q.form_id,
    sortOrder:     q.sort_order,
    label:         q.label,
    questionType:  q.question_type,
    placeholder:   q.placeholder || null,
    options:       tryJson(q.options_json) || [],
    isRequired:    !!q.is_required,
    allowMultiple: !!q.allow_multiple,
    maxFiles:      q.max_files || 5,
  };
}

async function getQuestions(formId) {
  const [rows] = await promisePool.query(
    `SELECT * FROM admission_form_questions WHERE form_id = ? ORDER BY sort_order, id`,
    [formId]
  );
  return rows;
}

// ── GET form for a school ──────────────────────────────────────
exports.getBySchool = async (req, res) => {
  try {
    const { schoolId } = req.params;
    const [rows] = await promisePool.query(
      `SELECT * FROM admission_forms WHERE school_id = ? AND deleted_at IS NULL ORDER BY id DESC LIMIT 1`,
      [schoolId]
    );
    if (!rows.length) return res.json({ success: true, data: null });
    const questions = await getQuestions(rows[0].id);
    return res.json({ success: true, data: shapeForm(rows[0], questions) });
  } catch (err) {
    console.error('[admission] getBySchool:', err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── GET public form (no auth — by formId) ─────────────────────
exports.getPublic = async (req, res) => {
  try {
    const { formId } = req.params;
    const [rows] = await promisePool.query(
      `SELECT af.*, s.school_name, smw.slug, smw.color_theme, smw.custom_colors, smw.cover_url
       FROM admission_forms af
       LEFT JOIN schools s ON s.id = af.school_id
       LEFT JOIN school_mini_websites smw ON smw.school_id = af.school_id
       WHERE af.id = ? AND af.deleted_at IS NULL LIMIT 1`,
      [formId]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Form not found' });
    const form = rows[0];

    // Count applications
    const [[countRow]] = await promisePool.query(
      `SELECT COUNT(*) AS cnt FROM admission_applications WHERE form_id = ?`,
      [formId]
    );

    const questions = await getQuestions(formId);
    const data = {
      ...shapeForm(form, questions),
      schoolName:   form.school_name || null,
      slug:         form.slug        || null,
      colorTheme:   form.color_theme || 'blue',
      customColors: tryJson(form.custom_colors) || null,
      coverUrl:     toUrl(form.cover_url),
      applicantsCount: countRow.cnt || 0,
      spotsRemaining: form.max_applicants
        ? Math.max(0, form.max_applicants - countRow.cnt)
        : null,
    };
    return res.json({ success: true, data });
  } catch (err) {
    console.error('[admission] getPublic:', err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── GET public form by mini-website slug ─────────────────────
exports.getBySlug = async (req, res) => {
  try {
    const { slug } = req.params;
    const [rows] = await promisePool.query(
      `SELECT af.*, s.school_name, smw.slug, smw.color_theme, smw.custom_colors, smw.cover_url
       FROM school_mini_websites smw
       JOIN admission_forms af ON af.school_id = smw.school_id
       LEFT JOIN schools s ON s.id = smw.school_id
       WHERE smw.slug = ? AND af.deleted_at IS NULL
       ORDER BY af.id DESC LIMIT 1`,
      [slug]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'No admission form for this school' });
    const form = rows[0];
    const [[countRow]] = await promisePool.query(
      `SELECT COUNT(*) AS cnt FROM admission_applications WHERE form_id = ?`,
      [form.id]
    );
    const questions = await getQuestions(form.id);
    const data = {
      ...shapeForm(form, questions),
      schoolName:      form.school_name || null,
      slug:            form.slug        || null,
      colorTheme:      form.color_theme || 'blue',
      customColors:    tryJson(form.custom_colors) || null,
      coverUrl:        toUrl(form.cover_url),
      applicantsCount: countRow.cnt || 0,
      spotsRemaining:  form.max_applicants
        ? Math.max(0, form.max_applicants - countRow.cnt)
        : null,
    };
    return res.json({ success: true, data });
  } catch (err) {
    console.error('[admission] getBySlug:', err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── CREATE / UPDATE full form (manager) ───────────────────────
exports.upsert = async (req, res) => {
  const conn = await promisePool.getConnection();
  try {
    await conn.beginTransaction();
    const { schoolId } = req.params;
    const b = req.body;

    // Find existing form for school (one per school for now)
    const [existing] = await conn.query(
      `SELECT id FROM admission_forms WHERE school_id = ? AND deleted_at IS NULL ORDER BY id DESC LIMIT 1`,
      [schoolId]
    );

    let formId;
    const formData = [
      b.title               || 'Online Admission Application',
      b.description         || null,
      b.academicYear        || null,
      b.applicationStart    || null,
      b.applicationDeadline || null,
      b.maxApplicants       ? parseInt(b.maxApplicants) : null,
      b.status              || 'draft',
    ];

    if (existing.length > 0) {
      formId = existing[0].id;
      await conn.query(
        `UPDATE admission_forms SET
           title = ?, description = ?, academic_year = ?,
           application_start = ?, application_deadline = ?,
           max_applicants = ?, status = ?, updated_at = NOW()
         WHERE id = ?`,
        [...formData, formId]
      );
    } else {
      const [ins] = await conn.query(
        `INSERT INTO admission_forms
           (school_id, title, description, academic_year, application_start,
            application_deadline, max_applicants, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [schoolId, ...formData]
      );
      formId = ins.insertId;
    }

    // Replace questions: delete all, re-insert
    await conn.query(`DELETE FROM admission_form_questions WHERE form_id = ?`, [formId]);

    const questions = Array.isArray(b.questions) ? b.questions : [];
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.label) continue;
      await conn.query(
        `INSERT INTO admission_form_questions
           (form_id, sort_order, label, question_type, placeholder,
            options_json, is_required, allow_multiple, max_files)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          formId, i,
          q.label,
          q.questionType || 'text',
          q.placeholder  || null,
          toJson(q.options || []),
          q.isRequired !== false ? 1 : 0,
          q.allowMultiple ? 1 : 0,
          q.maxFiles || 5,
        ]
      );
    }

    await conn.commit();
    const qs = await getQuestions(formId);
    const [formRow] = await conn.query(`SELECT * FROM admission_forms WHERE id = ?`, [formId]);
    return res.json({ success: true, data: shapeForm(formRow[0], qs), message: 'Admission form saved' });
  } catch (err) {
    await conn.rollback();
    console.error('[admission] upsert:', err.message);
    return res.status(500).json({ success: false, message: err.message });
  } finally {
    conn.release();
  }
};

// ── PATCH status ──────────────────────────────────────────────
exports.patchStatus = async (req, res) => {
  try {
    const { formId } = req.params;
    const { status } = req.body;
    if (!['draft','open','closed','paused'].includes(status))
      return res.status(400).json({ success: false, message: 'Invalid status' });
    await promisePool.query(`UPDATE admission_forms SET status = ? WHERE id = ?`, [status, formId]);
    return res.json({ success: true, message: `Form status set to ${status}` });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── DELETE form ───────────────────────────────────────────────
exports.remove = async (req, res) => {
  try {
    const { formId } = req.params;
    await promisePool.query(`UPDATE admission_forms SET deleted_at = NOW() WHERE id = ?`, [formId]);
    return res.json({ success: true, message: 'Form deleted' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── SUBMIT application (public, multipart for file uploads) ───
exports.apply = async (req, res) => {
  const conn = await promisePool.getConnection();
  try {
    await conn.beginTransaction();
    const { formId } = req.params;

    // Verify form is open
    const [formRows] = await conn.query(
      `SELECT * FROM admission_forms WHERE id = ? AND deleted_at IS NULL LIMIT 1`,
      [formId]
    );
    if (!formRows.length) return res.status(404).json({ success: false, message: 'Form not found' });
    const form = formRows[0];
    if (form.status !== 'open') {
      await conn.rollback();
      return res.status(400).json({ success: false, message: 'Admissions are not currently open' });
    }

    // Check capacity
    if (form.max_applicants) {
      const [[cnt]] = await conn.query(
        `SELECT COUNT(*) AS c FROM admission_applications WHERE form_id = ?`, [formId]
      );
      if (cnt.c >= form.max_applicants) {
        await conn.rollback();
        return res.status(400).json({ success: false, message: 'No remaining spots — admissions are full' });
      }
    }

    const b = req.body;
    let ref;
    let tries = 0;
    while (tries < 5) {
      ref = genRef();
      const [[ck]] = await conn.query(
        `SELECT id FROM admission_applications WHERE reference_no = ?`, [ref]
      );
      if (!ck) break;
      tries++;
    }

    const [ins] = await conn.query(
      `INSERT INTO admission_applications
         (form_id, school_id, reference_no, applicant_name, applicant_email, applicant_phone, status)
       VALUES (?, ?, ?, ?, ?, ?, 'pending')`,
      [formId, form.school_id, ref, b.applicantName || 'Unknown', b.applicantEmail || null, b.applicantPhone || null]
    );
    const appId = ins.insertId;

    // Save answers
    const answers = tryJson(b.answers) || {};
    const uploadedFiles = req.files || {};

    const [questions] = await conn.query(
      `SELECT * FROM admission_form_questions WHERE form_id = ? ORDER BY sort_order`, [formId]
    );

    for (const q of questions) {
      const key = `q_${q.id}`;
      let answerText = null;
      let answerJson = null;
      let filesJson  = null;

      if (q.question_type === 'file' || q.question_type === 'multifile') {
        const fileArr = uploadedFiles[key] || [];
        filesJson = fileArr.map(f => ({
          url:  toUrl(f.path),
          name: f.originalname,
          size: f.size,
        }));
      } else if (q.question_type === 'multiselect') {
        const raw = answers[key];
        answerJson = Array.isArray(raw) ? raw : (raw ? [raw] : []);
      } else {
        answerText = answers[key] != null ? String(answers[key]) : null;
      }

      await conn.query(
        `INSERT INTO admission_app_answers (application_id, question_id, answer_text, answer_json, files_json)
         VALUES (?, ?, ?, ?, ?)`,
        [appId, q.id, answerText, toJson(answerJson), toJson(filesJson)]
      );
    }

    await conn.commit();
    return res.json({
      success: true,
      message: 'Application submitted successfully!',
      data: { referenceNo: ref, applicantName: b.applicantName },
    });
  } catch (err) {
    await conn.rollback();
    console.error('[admission] apply:', err.message);
    return res.status(500).json({ success: false, message: err.message });
  } finally {
    conn.release();
  }
};

// ── GET applications list (manager) ──────────────────────────
exports.listApplications = async (req, res) => {
  try {
    const { formId } = req.params;
    const [rows] = await promisePool.query(
      `SELECT id, reference_no, applicant_name, applicant_email, applicant_phone,
              status, submitted_at, reviewed_at
       FROM admission_applications WHERE form_id = ? ORDER BY submitted_at DESC`,
      [formId]
    );
    const [[cnt]]= await promisePool.query(
      `SELECT COUNT(*) AS total FROM admission_applications WHERE form_id = ?`, [formId]
    );
    return res.json({ success: true, data: rows, total: cnt.total });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── GET single application with answers (manager) ────────────
exports.getApplication = async (req, res) => {
  try {
    const { appId } = req.params;
    const [appRows] = await promisePool.query(
      `SELECT * FROM admission_applications WHERE id = ? LIMIT 1`, [appId]
    );
    if (!appRows.length) return res.status(404).json({ success: false, message: 'Not found' });
    const [answers] = await promisePool.query(
      `SELECT a.*, q.label, q.question_type
       FROM admission_app_answers a
       JOIN admission_form_questions q ON q.id = a.question_id
       WHERE a.application_id = ? ORDER BY q.sort_order`,
      [appId]
    );
    return res.json({
      success: true,
      data: {
        ...appRows[0],
        answers: answers.map(a => ({
          questionId:   a.question_id,
          label:        a.label,
          questionType: a.question_type,
          answerText:   a.answer_text,
          answerJson:   tryJson(a.answer_json),
          filesJson:    tryJson(a.files_json),
        })),
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── PATCH application status ──────────────────────────────────
exports.patchAppStatus = async (req, res) => {
  try {
    const { appId } = req.params;
    const { status, notes } = req.body;
    const valid = ['pending','reviewed','accepted','rejected','waitlisted'];
    if (!valid.includes(status))
      return res.status(400).json({ success: false, message: 'Invalid status' });
    await promisePool.query(
      `UPDATE admission_applications SET status = ?, notes = ?, reviewed_at = NOW() WHERE id = ?`,
      [status, notes || null, appId]
    );
    return res.json({ success: true, message: `Application ${status}` });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── Stats for public page ─────────────────────────────────────
exports.getStats = async (req, res) => {
  try {
    const { formId } = req.params;
    const [rows] = await promisePool.query(
      `SELECT max_applicants, application_start, application_deadline, status, academic_year
       FROM admission_forms WHERE id = ? AND deleted_at IS NULL LIMIT 1`,
      [formId]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Form not found' });
    const f = rows[0];
    const [[cnt]] = await promisePool.query(
      `SELECT COUNT(*) AS c FROM admission_applications WHERE form_id = ?`, [formId]
    );
    const now  = new Date();
    const start= f.application_start    ? new Date(f.application_start)    : null;
    const dead = f.application_deadline ? new Date(f.application_deadline) : null;
    let daysRemaining = null;
    if (dead && dead > now) daysRemaining = Math.ceil((dead - now) / 86400000);

    return res.json({
      success: true,
      data: {
        status:          f.status,
        academicYear:    f.academic_year,
        applicationStart: f.application_start,
        applicationDeadline: f.application_deadline,
        maxApplicants:   f.max_applicants || null,
        applicantsCount: cnt.c,
        spotsRemaining:  f.max_applicants ? Math.max(0, f.max_applicants - cnt.c) : null,
        daysRemaining,
        isOpen:          f.status === 'open',
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/admissions/track/:referenceNo  — public, no auth
exports.trackApplication = async (req, res) => {
  try {
    const { referenceNo } = req.params;

    // Find application by reference number
    const [apps] = await promisePool.query(
      `SELECT a.*
       FROM admission_applications a
       WHERE a.reference_no = ? LIMIT 1`,
      [referenceNo]
    );
    if (!apps.length) {
      return res.status(404).json({
        success: false,
        message: 'Application not found. Please check your reference number.',
      });
    }

    const app = apps[0];

    // Load full answers with question labels
    const [answers] = await promisePool.query(
      `SELECT
         aa.question_id,
         aa.answer_text,
         aa.answer_json,
         aa.files_json,
         q.label,
         q.question_type
       FROM admission_app_answers aa
       JOIN admission_form_questions q ON q.id = aa.question_id
       WHERE aa.application_id = ?
       ORDER BY q.sort_order`,
      [app.id]
    );

    // Load form details
    const [forms] = await promisePool.query(
      `SELECT id, title, academic_year, status,
              application_start, application_deadline, max_applicants
       FROM admission_forms WHERE id = ? LIMIT 1`,
      [app.form_id]
    );

    // Load school details (safe subset — no sensitive data)
    const [schools] = await promisePool.query(
      `SELECT
         s.id, s.school_name, s.district, s.province, s.sector,
         s.full_address, s.phone, s.email, s.website,
         s.logo_url, s.head_teacher_name, s.head_teacher_phone
       FROM schools s
       WHERE s.id = ? AND s.deleted_at IS NULL LIMIT 1`,
      [app.school_id]
    );

    const school = schools[0] || null;

    // Shape answer payloads
    const shapedAnswers = answers.map(a => ({
      questionId:   a.question_id,
      label:        a.label,
      questionType: a.question_type,
      answerText:   a.answer_text  || null,
      answerJson:   tryJson(a.answer_json) || null,
      filesJson:    tryJson(a.files_json)  || [],
    }));

    // Normalize file paths in filesJson
    shapedAnswers.forEach(a => {
      if (Array.isArray(a.filesJson)) {
        a.filesJson = a.filesJson.map(f => ({
          ...f,
          url: toUrl(f.url),
        }));
      }
    });

    return res.json({
      success: true,
      data: {
        application: {
          id:              app.id,
          reference_no:    app.reference_no,
          applicant_name:  app.applicant_name,
          applicant_email: app.applicant_email,
          applicant_phone: app.applicant_phone,
          status:          app.status,
          submitted_at:    app.submitted_at,
          reviewed_at:     app.reviewed_at,
          created_at:      app.created_at,
          // NOTE: 'notes' field is intentionally omitted — internal only
          answers:         shapedAnswers,
        },
        form: forms[0] ? {
          id:           forms[0].id,
          title:        forms[0].title,
          academicYear: forms[0].academic_year,
          status:       forms[0].status,
          deadline:     forms[0].application_deadline,
        } : null,
        school: school ? {
          id:           school.id,
          schoolName:   school.school_name,
          district:     school.district,
          province:     school.province,
          address:      school.full_address,
          phone:        school.phone,
          email:        school.email,
          website:      school.website,
          logoUrl:      toUrl(school.logo_url),
          headTeacher:  school.head_teacher_name,
          headPhone:    school.head_teacher_phone,
        } : null,
      },
    });
  } catch (err) {
    console.error('[admission] trackApplication:', err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
};
