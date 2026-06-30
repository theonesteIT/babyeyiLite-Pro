'use strict';

/**
 * Email, web push, and in-app (parent portal) alerts for a student's linked parents.
 */

const nodemailer = require('nodemailer');
const { promisePool } = require('../config/database');
const {
  collectParentPhonesForStudent,
  sendWebPushToParentPhones,
  normalizeParentPhone,
} = require('./parentWebPush');
const { sendParentSms, isSmsConfigured, sanitizeSmsText } = require('../utils/smsNotifications');

let parentNotifyTableReady = false;
let mailer = null;

function trimStr(v) {
  return String(v ?? '').trim();
}

function isValidEmail(raw) {
  const v = trimStr(raw);
  return v && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

function getMailer() {
  if (mailer !== null) return mailer;
  if (!process.env.SMTP_USER) {
    mailer = false;
    return null;
  }
  mailer = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_SECURE === 'true',
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
  return mailer;
}

async function sendParentEmail({ to, subject, text }) {
  if (!isValidEmail(to) || !subject || !text) return { ok: false, error: 'Missing recipient or content' };
  const transport = getMailer();
  if (!transport) {
    console.warn('[parent-notify/email] SMTP not configured — skipped:', subject);
    return { ok: false, error: 'SMTP not configured' };
  }
  try {
    const from = process.env.SMTP_FROM || `"Babyeyi" <${process.env.SMTP_USER}>`;
    await transport.sendMail({ from, to: trimStr(to), subject, text });
    return { ok: true };
  } catch (err) {
    console.error('[parent-notify/email]', err.message);
    return { ok: false, error: err.message || 'SMTP error' };
  }
}

async function ensureParentNotificationTable() {
  if (parentNotifyTableReady) return;
  await promisePool.query(`
    CREATE TABLE IF NOT EXISTS parent_portal_notifications (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      target_parent_phone VARCHAR(30) NOT NULL,
      source_parent_phone VARCHAR(30) NULL,
      student_id INT UNSIGNED NULL,
      type VARCHAR(80) NOT NULL,
      title VARCHAR(200) NOT NULL,
      body TEXT NULL,
      payload_json LONGTEXT NULL,
      read_at DATETIME NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      KEY idx_ppn_target_phone (target_parent_phone),
      KEY idx_ppn_student (student_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  parentNotifyTableReady = true;
}

async function insertParentPortalNotification({
  targetPhone,
  studentId,
  type,
  title,
  body,
  payload = {},
}) {
  const phone = normalizeParentPhone(targetPhone);
  if (!phone) return false;
  await ensureParentNotificationTable();
  await promisePool.query(
    `INSERT INTO parent_portal_notifications
      (target_parent_phone, source_parent_phone, student_id, type, title, body, payload_json)
     VALUES (?, NULL, ?, ?, ?, ?, ?)`,
    [phone, studentId || null, type, title, body || null, JSON.stringify(payload)]
  );
  return true;
}

async function collectParentEmailsForStudent(studentId) {
  const id = Number(studentId);
  if (!id) return [];
  const emails = new Set();

  const [rows] = await promisePool.query(
    `SELECT father_email, mother_email FROM students WHERE id = ? LIMIT 1`,
    [id]
  );
  const st = rows?.[0];
  if (st) {
    if (isValidEmail(st.father_email)) emails.add(trimStr(st.father_email).toLowerCase());
    if (isValidEmail(st.mother_email)) emails.add(trimStr(st.mother_email).toLowerCase());
  }

  const phones = await collectParentPhonesForStudent(id);
  if (phones.length) {
    const ph = phones.map(() => '?').join(',');
    const [acc] = await promisePool
      .query(
        `SELECT father_email, mother_email, recovery_email
         FROM parent_portal_accounts WHERE phone IN (${ph})`,
        phones
      )
      .catch(() => [[]]);
    for (const r of acc || []) {
      if (isValidEmail(r.father_email)) emails.add(trimStr(r.father_email).toLowerCase());
      if (isValidEmail(r.mother_email)) emails.add(trimStr(r.mother_email).toLowerCase());
      if (isValidEmail(r.recovery_email)) emails.add(trimStr(r.recovery_email).toLowerCase());
    }
  }

  return [...emails];
}

const DISCIPLINE_REASON_RW = {
  'Late to class': 'Yatinze mu ishuri',
  Absence: 'Kubura mu ishuri',
  Fighting: 'Kurwana',
  Disrespect: 'Kutubaha',
  'Uniform violation': 'Kutagira uniforme',
  Other: 'Ikindi',
};

function disciplineReasonKinyarwanda(reason) {
  const key = trimStr(reason);
  if (!key) return '';
  return DISCIPLINE_REASON_RW[key] || key;
}

function buildDisciplineSmsBody(opts = {}) {
  const studentName = trimStr(opts.studentName) || 'Your child';
  const schoolName = trimStr(opts.schoolName) || 'School';
  const marks = Number(opts.marks);
  const remaining = Number(opts.remaining);
  const maximum = Number(opts.maximum);
  const reason = trimStr(opts.reason).slice(0, 80);
  const subject = trimStr(opts.lessonSubject).slice(0, 60);
  const reasonRw = disciplineReasonKinyarwanda(reason).slice(0, 80);
  const caseLabel = reason || subject;

  const marksText = Number.isFinite(marks) ? String(marks) : '';
  const balanceText =
    Number.isFinite(remaining) && Number.isFinite(maximum)
      ? `${remaining}/${maximum}`
      : Number.isFinite(remaining)
        ? String(remaining)
        : '';

  const englishParts = [`${schoolName}: ${studentName} -${marksText} conduct marks.`];
  if (caseLabel) englishParts.push(`Reason: ${caseLabel}.`);
  if (balanceText) englishParts.push(`Left ${balanceText}.`);

  const kinyarwandaParts = [`${studentName} yakuwe amanota ${marksText}.`];
  if (caseLabel) kinyarwandaParts.push(`Impamvu: ${reasonRw || caseLabel}.`);
  if (balanceText) kinyarwandaParts.push(`Asigaye ${balanceText}.`);

  // Keep bilingual SMS short — long GET URLs and multi-part SMS reduce delivery rates.
  return sanitizeSmsText(`EN ${englishParts.join(' ')} | RW ${kinyarwandaParts.join(' ')}`);
}

const PERMISSION_TYPE_LABELS = {
  MEDICAL: 'Medical',
  FAMILY: 'Family',
  OFFICIAL: 'Official',
  OTHER: 'Other',
};

function formatPermissionDateTime(value) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString('en-GB', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

/**
 * Email + in-app + web push to all parents linked to a student.
 */
async function notifyStudentParentsChannels(studentId, opts = {}) {
  const id = Number(studentId);
  const summary = {
    email: { sent: 0, failed: 0, skipped: 0 },
    push: { sent: 0, skipped: null },
    in_app: { sent: 0, skipped: 0 },
    sms: { sent: 0, failed: 0, skipped: 0 },
  };
  if (!id) return summary;

  const title = trimStr(opts.title) || 'Babyeyi';
  const body = trimStr(opts.body) || '';
  const type = trimStr(opts.type) || 'SCHOOL_ALERT';
  const payload = opts.payload && typeof opts.payload === 'object' ? opts.payload : {};
  const pushTag = trimStr(opts.pushTag) || `babyeyi-${type.toLowerCase()}`;
  const category = opts.category || 'discipline';
  const sendSmsFlag = opts.sms === true;

  const phones = await collectParentPhonesForStudent(id);
  if (!phones.length) {
    summary.in_app.skipped = 'no_parent_phones';
    summary.push.skipped = 'no_parent_phones';
    if (sendSmsFlag) summary.sms.skipped = 'no_parent_phones';
  } else {
    for (const phone of phones) {
      try {
        const ok = await insertParentPortalNotification({
          targetPhone: phone,
          studentId: id,
          type,
          title,
          body,
          payload,
        });
        if (ok) summary.in_app.sent += 1;
      } catch (e) {
        console.warn('[parent-notify/in-app]', e.message);
      }
    }

    try {
      const pushResult = await sendWebPushToParentPhones(
        phones,
        {
          title,
          body: body.replace(/\n/g, ' ').slice(0, 240),
          tag: pushTag,
          url: opts.url || '/parents/home',
        },
        { category }
      );
      summary.push.sent = Number(pushResult.sent || 0);
      if (!summary.push.sent) summary.push.skipped = pushResult.skipped || 'not_delivered';
    } catch (e) {
      console.warn('[parent-notify/push]', e.message);
      summary.push.skipped = e.message;
    }

    if (sendSmsFlag) {
      if (!isSmsConfigured()) {
        summary.sms.skipped = 'sms_not_configured';
      } else {
        const smsText = sanitizeSmsText(
          trimStr(opts.smsBody) ||
            [title, body.replace(/\n/g, ' ')].filter(Boolean).join(' - ').slice(0, 480)
        );
        summary.sms.details = [];
        for (const phone of phones) {
          try {
            const sms = await sendParentSms({ phone, message: smsText });
            summary.sms.details.push({
              phone,
              sent: !!sms.sent,
              skipped: sms.skipped || null,
              error: sms.error || null,
              providerCode: sms.providerCode || null,
              messagePreview: smsText.slice(0, 120),
            });
            if (sms.sent) summary.sms.sent += 1;
            else summary.sms.failed += 1;
          } catch (e) {
            console.warn('[parent-notify/sms]', e.message);
            summary.sms.details.push({ phone, sent: false, error: e.message });
            summary.sms.failed += 1;
          }
        }
        if (summary.sms.sent === 0 && summary.sms.failed > 0) {
          summary.sms.skipped = summary.sms.details[0]?.skipped || 'sms_send_failed';
          summary.sms.error = summary.sms.details[0]?.error || null;
        }
      }
    }
  }

  const emails = await collectParentEmailsForStudent(id);
  if (!emails.length) {
    summary.email.skipped = 'no_parent_emails';
  } else {
    for (const to of emails) {
      const mail = await sendParentEmail({ to, subject: title, text: body });
      if (mail.ok) summary.email.sent += 1;
      else summary.email.failed += 1;
    }
  }

  return summary;
}

/**
 * Notify all parents linked to a student (portal access + father/mother phones).
 * @returns {{ email: { sent: number, failed: number }, push: { sent: number, skipped?: string }, in_app: { sent: number } }}
 */
async function notifyStudentParentsPermission(studentId, opts = {}) {
  const studentName = trimStr(opts.studentName) || 'Your child';
  const schoolName = trimStr(opts.schoolName) || 'School';
  const permissionType = PERMISSION_TYPE_LABELS[String(opts.permissionType || '').toUpperCase()] || 'Permission';
  const status = String(opts.status || 'PENDING').toUpperCase();
  const startsAt = opts.startsAt;
  const endsAt = opts.endsAt;
  const permissionId = opts.permissionId;

  const statusLine =
    status === 'APPROVED'
      ? 'approved'
      : status === 'REJECTED'
        ? 'not approved'
        : status === 'CANCELLED'
          ? 'cancelled'
          : 'submitted (pending approval)';

  const title = `${schoolName}: Permission ${statusLine}`;
  const body = [
    `${studentName} has a ${permissionType.toLowerCase()} permission ${statusLine}.`,
    startsAt ? `Leave from: ${formatPermissionDateTime(startsAt)}` : null,
    endsAt ? `Expected return: ${formatPermissionDateTime(endsAt)}` : null,
    trimStr(opts.reason) ? `Details: ${trimStr(opts.reason).slice(0, 280)}` : null,
    'Open the Parent portal for more information.',
  ]
    .filter(Boolean)
    .join('\n');

  return notifyStudentParentsChannels(studentId, {
    type: 'STUDENT_PERMISSION',
    title,
    body,
    payload: {
      permission_id: permissionId || null,
      student_id: Number(studentId),
      school_id: opts.schoolId || null,
      status,
      permission_type: opts.permissionType || null,
    },
    pushTag: `student-permission-${permissionId || studentId}`,
    category: 'discipline',
  });
}

/**
 * Parent alert when conduct marks are deducted (Set Marks — remove).
 */
async function notifyStudentParentsDiscipline(studentId, opts = {}) {
  const studentName = trimStr(opts.studentName) || 'Your child';
  const schoolName = trimStr(opts.schoolName) || 'School';
  const marks = Number(opts.marks);
  const remaining = Number(opts.remaining);
  const maximum = Number(opts.maximum);
  const reason = trimStr(opts.reason).slice(0, 280);
  const studentRef = trimStr(opts.studentRef) || String(studentId);

  const title = `${schoolName}: Conduct update`;
  const body = [
    `${studentName}: ${Number.isFinite(marks) ? marks : '—'} conduct mark(s) deducted.`,
    reason ? `Reason: ${reason}` : null,
    Number.isFinite(remaining) && Number.isFinite(maximum)
      ? `Remaining: ${remaining} of ${maximum} marks.`
      : Number.isFinite(remaining)
        ? `Remaining: ${remaining} marks.`
        : null,
    'Open the Parent portal for details.',
  ]
    .filter(Boolean)
    .join('\n');

  const detailsUrl = `/parents/student-details/${encodeURIComponent(studentRef)}?tab=discipline`;

  return notifyStudentParentsChannels(studentId, {
    type: 'DISCIPLINE_MARKS',
    title,
    body,
    url: detailsUrl,
    smsBody: buildDisciplineSmsBody({
      studentName,
      schoolName,
      marks,
      remaining,
      maximum,
      reason,
    }),
    payload: {
      student_id: Number(studentId),
      student_ref: studentRef,
      school_id: opts.schoolId || null,
      action: 'remove',
      marks_deducted: marks,
      remaining_marks: remaining,
      maximum_marks: maximum,
      reason,
      log_id: opts.logId || null,
      tab: 'discipline',
    },
    pushTag: `discipline-marks-${studentId}-${opts.logId || Date.now()}`,
    category: 'discipline',
    sms: true,
  });
}

/**
 * Parent alert when a teacher publishes or updates academic marks.
 */
async function notifyStudentParentsMarks(studentId, opts = {}) {
  const studentName = trimStr(opts.studentName) || 'Your child';
  const schoolName = trimStr(opts.schoolName) || 'School';
  const subject = trimStr(opts.subject) || 'Subject';
  const assessmentName = trimStr(opts.assessmentName) || 'Assessment';
  const score = opts.score;
  const maxScore = opts.maxScore;
  const markCodeLabel = trimStr(opts.markCodeLabel);
  const teacherName = trimStr(opts.teacherName) || 'Teacher';
  const studentRef = trimStr(opts.studentRef) || String(studentId);

  const scoreLine = markCodeLabel
    ? `Status: ${markCodeLabel}`
    : (score != null && maxScore != null ? `Score: ${score}/${maxScore}` : 'New marks recorded');

  const title = `${schoolName}: New marks — ${subject}`;
  const body = [
    `${studentName} — ${assessmentName} (${subject}).`,
    scoreLine,
    `Recorded by ${teacherName}.`,
    'Open Academics in the Parent portal for full details.',
  ].join('\n');

  const detailsUrl = `/parents/student-details/${encodeURIComponent(studentRef)}?tab=academic`;

  return notifyStudentParentsChannels(studentId, {
    type: 'MARKS_PUBLISHED',
    title,
    body,
    url: detailsUrl,
    payload: {
      student_id: Number(studentId),
      student_ref: studentRef,
      school_id: opts.schoolId || null,
      subject,
      assessment_name: assessmentName,
      score: score != null ? Number(score) : null,
      max_score: maxScore != null ? Number(maxScore) : null,
      mark_code_label: markCodeLabel || null,
      teacher_name: teacherName,
      tab: 'academic',
    },
    pushTag: `marks-${studentId}-${opts.assessmentId || 'new'}`,
    category: 'school_activity',
  });
}

module.exports = {
  notifyStudentParentsChannels,
  notifyStudentParentsPermission,
  notifyStudentParentsDiscipline,
  notifyStudentParentsMarks,
  buildDisciplineSmsBody,
  collectParentEmailsForStudent,
  insertParentPortalNotification,
};
