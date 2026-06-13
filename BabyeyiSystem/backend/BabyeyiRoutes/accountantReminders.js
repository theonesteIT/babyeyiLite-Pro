'use strict';

/**
 * Fee reminder campaigns for accountant portal.
 *
 * Tables (runtime ensure):
 *   school_fee_reminder_campaigns — one row per send/schedule batch
 *   school_fee_reminder_logs       — one row per student × channel attempt
 *   school_fee_reminder_rules      — optional automation rules
 *
 * Mount: portalOperations.js → router.use(require('./accountantReminders'))
 */

const express = require('express');
const nodemailer = require('nodemailer');
const { promisePool } = require('../config/database');
const accountantFees = require('./accountantFees');
const { isWebPushConfigured } = require('./webPushSubscriptions');
const {
  sendWebPushToParentPhones,
  collectParentPhonesForStudent,
  ensureParentWebPushTable,
} = require('./parentWebPush');
const { buildRemainPayHref } = require('../utils/publicPayDeepLink');

const router = express.Router();

const ACCOUNTANT_READ = ['ACCOUNTANT', 'SCHOOL_ADMIN', 'SCHOOL_MANAGER'];
const ACCOUNTANT_WRITE = ['ACCOUNTANT', 'SCHOOL_ADMIN', 'SCHOOL_MANAGER'];

const TEMPLATE_KEYS = ['gentle', 'urgent', 'final', 'exam', 'pta', 'transport'];
const CHANNEL_KEYS = ['email', 'sms', 'push', 'in_system'];
const CAMPAIGN_STATUSES = ['draft', 'scheduled', 'delivered', 'partial', 'failed', 'cancelled'];

let tablesReady = false;

function resolveUserId(req) {
  return req.session?.userId || req.session?.user?.id || req.user?.id || null;
}
function resolveRoleCode(req) {
  return String(req.user?.role_code || req.session?.user?.role?.code || '').toUpperCase();
}
function resolveSchoolId(req) {
  return req.session?.school_id || req.session?.user?.school_id || req.session?.user?.school?.id || req.user?.school_id || null;
}
function requireAuth(req, res, next) {
  const userId = resolveUserId(req);
  const schoolId = resolveSchoolId(req);
  if (!userId) return res.status(401).json({ success: false, message: 'Not authenticated' });
  if (!schoolId) return res.status(400).json({ success: false, message: 'No school linked to this account' });
  req.ctx = { userId, schoolId, roleCode: resolveRoleCode(req) };
  next();
}
function requireRole(allowed) {
  return (req, res, next) => {
    if (!allowed.includes(req.ctx?.roleCode)) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    next();
  };
}

function trimStr(v) {
  return String(v ?? '').trim();
}

/** Rwanda mobile — same rules as parentPortal / students.js */
function normalizeParentPhone(raw) {
  if (!raw) return null;
  let v = String(raw).replace(/[\s\-().]/g, '');
  v = v.replace(/[^\d+]/g, '');
  if (v.startsWith('+250')) v = '0' + v.slice(4);
  else if (v.startsWith('250') && v.length === 12) v = '0' + v.slice(3);
  if (/^[27]\d{8}$/.test(v)) v = '0' + v;
  if (/^07[2-9]\d{7}$/.test(v)) return v;
  if (/^078\d{7}$/.test(v)) return v;
  if (/^079\d{7}$/.test(v)) return v;
  if (/^025\d{7}$/.test(v)) return v;
  return null;
}

function formatBalanceRwf(amount) {
  return Number(amount || 0).toLocaleString('en-US');
}

function renderTemplate(text, vars = {}) {
  let out = String(text || '');
  for (const [key, val] of Object.entries(vars)) {
    out = out.replace(new RegExp(`\\{${key}\\}`, 'g'), String(val ?? ''));
  }
  return out;
}

let reminderMailer = null;
function getReminderMailer() {
  if (reminderMailer !== null) return reminderMailer;
  if (!process.env.SMTP_USER) {
    reminderMailer = false;
    return null;
  }
  reminderMailer = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_SECURE === 'true',
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
  return reminderMailer;
}

async function sendReminderEmail({ to, subject, text, html = null }) {
  if (!to || !subject || (!text && !html)) return { ok: false, error: 'Missing recipient or content' };
  const transport = getReminderMailer();
  if (!transport) {
    console.warn('[fee-reminders/email] SMTP not configured — skipped:', subject);
    return { ok: false, error: 'SMTP not configured on server' };
  }
  try {
    const from = process.env.SMTP_FROM || `"School Fees" <${process.env.SMTP_USER}>`;
    await transport.sendMail({ from, to, subject, text, html });
    return { ok: true };
  } catch (err) {
    const msg = err.message || 'SMTP error';
    console.error('[fee-reminders/email]', msg);
    return { ok: false, error: msg };
  }
}

let parentNotifyTableReady = false;
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

async function enrichStudentsWithPushFlag(students) {
  await ensureParentWebPushTable().catch(() => {});
  const pushPhones = new Set();
  const [subRows] = await promisePool
    .query(
      `SELECT DISTINCT parent_phone FROM parent_web_push_subscriptions WHERE notify_fee_reminders = 1`
    )
    .catch(() => [[]]);
  for (const r of subRows || []) {
    const p = normalizeParentPhone(r.parent_phone);
    if (p) pushPhones.add(p);
  }

  const studentIds = students.map((s) => Number(s.student_id)).filter((id) => id > 0);
  const phonesByStudent = new Map();
  if (studentIds.length) {
    const ph = studentIds.map(() => '?').join(',');
    const [stRows] = await promisePool.query(
      `SELECT id, father_phone, mother_phone FROM students WHERE id IN (${ph})`,
      studentIds
    );
    const [accRows] = await promisePool
      .query(`SELECT student_id, parent_phone FROM student_access WHERE student_id IN (${ph})`, studentIds)
      .catch(() => [[]]);
    for (const r of stRows || []) {
      const id = Number(r.id);
      const set = phonesByStudent.get(id) || new Set();
      const f = normalizeParentPhone(r.father_phone);
      const m = normalizeParentPhone(r.mother_phone);
      if (f) set.add(f);
      if (m) set.add(m);
      phonesByStudent.set(id, set);
    }
    for (const r of accRows || []) {
      const id = Number(r.student_id);
      const set = phonesByStudent.get(id) || new Set();
      const p = normalizeParentPhone(r.parent_phone);
      if (p) set.add(p);
      phonesByStudent.set(id, set);
    }
  }

  return students.map((s) => {
    const set =
      phonesByStudent.get(Number(s.student_id)) ||
      new Set([normalizeParentPhone(s.parent_phone)].filter(Boolean));
    const has_push = [...set].some((p) => pushPhones.has(p));
    return { ...s, has_push };
  });
}

function filterByModalRecipients(students, filters = {}) {
  const f = filters || {};
  const hasBucket =
    f.not_paid || f.partial || f.overdue || f.small_balance || f.smallBalance;
  if (!hasBucket) return [];

  let list = students.filter((s) => {
    if (f.not_paid && s.status === 'unpaid') return true;
    if (f.partial && s.status === 'partial') return true;
    if (f.overdue && s.overdue_days > 7) return true;
    if ((f.small_balance || f.smallBalance) && s.balance > 0 && s.balance < 50000) return true;
    return false;
  });

  const className = trimStr(f.class_name);
  if (className) {
    list = list.filter((s) => trimStr(s.class_name) === className);
  }

  const q = trimStr(f.q).toLowerCase();
  if (q) {
    list = list.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        String(s.id || '').toLowerCase().includes(q) ||
        String(s.student_code || '').toLowerCase().includes(q)
    );
  }
  return list;
}

function computeBucketCounts(students) {
  return {
    not_paid: students.filter((s) => s.status === 'unpaid').length,
    partial: students.filter((s) => s.status === 'partial').length,
    overdue: students.filter((s) => s.overdue_days > 7).length,
    small_balance: students.filter((s) => s.balance > 0 && s.balance < 50000).length,
  };
}

function computeChannelReach(targets) {
  const uniqueParents = new Set();
  let emails = 0;
  let push = 0;
  let inSystem = 0;

  for (const s of targets) {
    const phone = normalizeParentPhone(s.parent_phone);
    if (phone) {
      uniqueParents.add(phone);
      inSystem += 1;
      if (s.has_push) push += 1;
    }
    if (s.has_email) emails += 1;
  }

  return {
    parents_selected: uniqueParents.size || targets.length,
    emails_ready: emails,
    push_ready: push,
    in_system_ready: inSystem,
  };
}

function buildTemplateVars(student, schoolName, deadline) {
  return {
    ParentName: student.parent_name || 'Parent',
    StudentName: student.name || 'Student',
    Balance: formatBalanceRwf(student.balance),
    Class: student.class_name || '—',
    SchoolName: schoolName || 'School',
    Deadline: trimStr(deadline) || '—',
  };
}

async function deliverCampaignNow({
  schoolId,
  schoolName,
  campaignId,
  targets,
  channels,
  subject,
  messageBody,
  deadline,
  academicYear,
  term,
}) {
  let delivered = 0;
  let failed = 0;

  for (const student of targets) {
    const vars = buildTemplateVars(student, schoolName, deadline);
    const renderedSubject = renderTemplate(subject, vars) || 'Fee Reminder';
    const renderedBody = renderTemplate(messageBody, vars);
    const parentPhone = student.parent_phone;

    for (const channel of channels) {
      let status = 'sent';
      let errorMessage = null;

      try {
        if (channel === 'email') {
          if (!student.has_email || !student.parent_email) {
            status = 'skipped';
            errorMessage = 'No parent email on student registration';
          } else {
            const mail = await sendReminderEmail({
              to: student.parent_email,
              subject: renderedSubject,
              text: renderedBody,
            });
            if (!mail.ok) {
              status = 'failed';
              errorMessage = mail.error || 'Email delivery failed (SMTP)';
            }
          }
        } else if (channel === 'in_system') {
          const phone = normalizeParentPhone(parentPhone);
          if (!phone) {
            status = 'skipped';
            errorMessage = 'No parent phone on student registration';
          } else {
            await insertParentPortalNotification({
              targetPhone: phone,
              studentId: student.student_id,
              type: 'FEE_REMINDER',
              title: renderedSubject,
              body: renderedBody,
              payload: {
                campaign_id: campaignId,
                school_id: schoolId,
                student_id: student.student_id,
                balance_rwf: student.balance,
              },
            });
          }
        } else if (channel === 'push') {
          const phones = await collectParentPhonesForStudent(student.student_id);
          if (!phones.length) {
            status = 'skipped';
            errorMessage = 'No parent phone on student registration';
          } else if (!isWebPushConfigured()) {
            status = 'skipped';
            errorMessage = 'Web Push not configured on server';
          } else {
            const payUrl = buildRemainPayHref('/paid-at-school', {
              code: student.student_code || student.id,
              remain: student.balance,
              year: academicYear,
              term,
            });
            const pushResult = await sendWebPushToParentPhones(
              phones,
              {
                title: renderedSubject,
                body: renderedBody.slice(0, 240),
                tag: `fee-reminder-${campaignId}-${student.student_id}`,
                url: payUrl,
              },
              { category: 'fee_reminders' }
            );
            if (Number(pushResult.sent || 0) > 0) {
              status = 'sent';
            } else {
              status = 'skipped';
              errorMessage =
                pushResult.skipped === 'no_subscriptions'
                  ? 'No device subscribed — parent must enable notifications in Parent portal (phone must match student record)'
                  : `Push not delivered (${pushResult.skipped || 'unknown'})`;
            }
          }
        } else if (channel === 'sms') {
          status = 'skipped';
          errorMessage = 'SMS not enabled';
        }
      } catch (err) {
        status = 'failed';
        errorMessage = err.message || 'Delivery error';
      }

      if (status === 'sent') delivered += 1;
      else if (status === 'failed') failed += 1;

      await promisePool.query(
        `INSERT INTO school_fee_reminder_logs (
          school_id, campaign_id, student_id, channel, delivery_status,
          parent_name, parent_email, parent_phone, balance_rwf, error_message, sent_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [
          schoolId,
          campaignId,
          student.student_id,
          channel,
          status,
          student.parent_name,
          student.parent_email || null,
          student.parent_phone || null,
          student.balance,
          errorMessage,
        ]
      );
    }
  }

  return { delivered, failed };
}

function inferAcademicYearFromDate(date = new Date()) {
  const y = date.getFullYear();
  const m = date.getMonth() + 1;
  return m >= 9 ? `${y}-${y + 1}` : `${y - 1}-${y}`;
}

function inferTermFromMonth(terms = [], date = new Date()) {
  const month = date.getMonth() + 1;
  if (!Array.isArray(terms) || !terms.length) return 'Term 1';
  if (terms.length >= 3) {
    if (month >= 9 && month <= 12) return terms[0];
    if (month >= 1 && month <= 4) return terms[1] || terms[0];
    return terms[2] || terms[terms.length - 1];
  }
  if (terms.length === 2) return month >= 9 || month <= 2 ? terms[0] : terms[1];
  return terms[0];
}

function parseTermsJson(raw, fallback = ['Term 1', 'Term 2', 'Term 3']) {
  if (!raw) return [...fallback];
  try {
    const parsed = Array.isArray(raw) ? raw : JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length) {
      return parsed.map((x) => String(x).trim()).filter(Boolean);
    }
  } catch (_) { /* keep fallback */ }
  return [...fallback];
}

/** Manager Preferences → school_academic_year_registry + school_academic_settings */
async function loadSchoolAcademicCalendar(schoolId) {
  const defaultTerms = ['Term 1', 'Term 2', 'Term 3'];
  const yearsSet = new Set();
  const termsByYear = {};

  const [registryRows] = await promisePool
    .query(
      `SELECT academic_year, active_terms_json, is_current
       FROM school_academic_year_registry
       WHERE school_id = ?
       ORDER BY academic_year DESC`,
      [schoolId]
    )
    .catch(() => [[]]);

  let currentAcademicYear = '';
  for (const row of registryRows || []) {
    const year = trimStr(row.academic_year);
    if (!year) continue;
    yearsSet.add(year);
    termsByYear[year] = parseTermsJson(row.active_terms_json, defaultTerms);
    if (Number(row.is_current) === 1) currentAcademicYear = year;
  }

  const [[legacy]] = await promisePool
    .query(
      `SELECT current_academic_year, active_terms_json
       FROM school_academic_settings WHERE school_id = ? LIMIT 1`,
      [schoolId]
    )
    .catch(() => [[null]]);

  const legacyYear = trimStr(legacy?.current_academic_year);
  const legacyTerms = parseTermsJson(legacy?.active_terms_json, defaultTerms);
  if (legacyYear) {
    yearsSet.add(legacyYear);
    if (!termsByYear[legacyYear]) termsByYear[legacyYear] = legacyTerms;
    if (!currentAcademicYear) currentAcademicYear = legacyYear;
  }

  const [studentYearRows] = await promisePool
    .query(
      `SELECT DISTINCT TRIM(academic_year) AS academic_year
       FROM students
       WHERE school_id = ? AND academic_year IS NOT NULL AND TRIM(academic_year) <> ''`,
      [schoolId]
    )
    .catch(() => [[]]);
  for (const r of studentYearRows || []) {
    const y = trimStr(r.academic_year);
    if (y) {
      yearsSet.add(y);
      if (!termsByYear[y]) termsByYear[y] = [...defaultTerms];
    }
  }

  const y = new Date().getFullYear();
  for (let i = -2; i <= 2; i += 1) {
    const start = y + i;
    yearsSet.add(`${start}-${start + 1}`);
  }

  if (!currentAcademicYear) {
    currentAcademicYear = legacyYear || inferAcademicYearFromDate();
    yearsSet.add(currentAcademicYear);
    if (!termsByYear[currentAcademicYear]) termsByYear[currentAcademicYear] = legacyTerms;
  }

  const academicYears = [...yearsSet].filter(Boolean).sort((a, b) => String(b).localeCompare(String(a)));
  const terms = termsByYear[currentAcademicYear] || legacyTerms || defaultTerms;
  const defaultTerm = inferTermFromMonth(terms);

  return {
    currentAcademicYear,
    academicYears,
    terms,
    termsByYear,
    defaultTerm,
  };
}

async function ensureReminderTables() {
  if (tablesReady) return;

  await promisePool.query(`
    CREATE TABLE IF NOT EXISTS school_fee_reminder_campaigns (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      school_id INT UNSIGNED NOT NULL,
      created_by_user_id INT UNSIGNED NOT NULL,
      campaign_code VARCHAR(32) NOT NULL,
      title VARCHAR(160) NOT NULL,
      template_key VARCHAR(32) NOT NULL,
      academic_year VARCHAR(64) NOT NULL,
      term VARCHAR(64) NOT NULL,
      subject_line VARCHAR(255) NULL,
      message_body TEXT NULL,
      channels_json JSON NULL,
      filters_json JSON NULL,
      schedule_mode VARCHAR(16) NOT NULL DEFAULT 'now',
      scheduled_at DATETIME NULL,
      sent_at DATETIME NULL,
      recipient_count INT UNSIGNED NOT NULL DEFAULT 0,
      delivered_count INT UNSIGNED NOT NULL DEFAULT 0,
      failed_count INT UNSIGNED NOT NULL DEFAULT 0,
      status VARCHAR(24) NOT NULL DEFAULT 'delivered',
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_rem_campaign_code (school_id, campaign_code),
      KEY idx_rem_campaign_school (school_id, created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  await promisePool.query(`
    CREATE TABLE IF NOT EXISTS school_fee_reminder_logs (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      school_id INT UNSIGNED NOT NULL,
      campaign_id INT UNSIGNED NOT NULL,
      student_id INT UNSIGNED NOT NULL,
      channel VARCHAR(24) NOT NULL,
      delivery_status VARCHAR(24) NOT NULL DEFAULT 'sent',
      parent_name VARCHAR(200) NULL,
      parent_email VARCHAR(255) NULL,
      parent_phone VARCHAR(64) NULL,
      balance_rwf DECIMAL(14,2) NULL,
      error_message VARCHAR(255) NULL,
      sent_at DATETIME NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      KEY idx_rem_log_campaign (campaign_id),
      KEY idx_rem_log_student (school_id, student_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  await promisePool.query(`
    CREATE TABLE IF NOT EXISTS school_fee_reminder_rules (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      school_id INT UNSIGNED NOT NULL,
      created_by_user_id INT UNSIGNED NOT NULL,
      name VARCHAR(160) NOT NULL,
      is_active TINYINT(1) NOT NULL DEFAULT 1,
      condition_text VARCHAR(255) NOT NULL,
      extra_condition VARCHAR(255) NULL,
      action_text VARCHAR(160) NOT NULL,
      channels_json JSON NULL,
      frequency VARCHAR(64) NOT NULL DEFAULT 'Once',
      next_run_label VARCHAR(64) NULL,
      deleted_at DATETIME NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      KEY idx_rem_rule_school (school_id, deleted_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  await promisePool
    .query(
      `ALTER TABLE school_fee_reminder_rules
       ADD COLUMN send_time VARCHAR(8) NULL COMMENT 'HH:MM daily send time'`
    )
    .catch(() => {});
  await promisePool
    .query(
      `ALTER TABLE school_fee_reminder_rules
       ADD COLUMN last_sent_at DATETIME NULL`
    )
    .catch(() => {});
  await promisePool
    .query(
      `ALTER TABLE school_fee_reminder_rules
       ADD COLUMN last_reached_count INT UNSIGNED NOT NULL DEFAULT 0`
    )
    .catch(() => {});
  await promisePool
    .query(
      `ALTER TABLE school_fee_reminder_rules
       ADD COLUMN academic_year VARCHAR(64) NULL`
    )
    .catch(() => {});
  await promisePool
    .query(
      `ALTER TABLE school_fee_reminder_rules
       ADD COLUMN term VARCHAR(64) NULL`
    )
    .catch(() => {});
  await promisePool
    .query(
      `ALTER TABLE school_fee_reminder_rules
       ADD COLUMN class_name VARCHAR(120) NULL COMMENT 'All or specific class'`
    )
    .catch(() => {});
  await promisePool
    .query(
      `ALTER TABLE school_fee_reminder_rules
       ADD COLUMN require_fee_card TINYINT(1) NOT NULL DEFAULT 1`
    )
    .catch(() => {});

  tablesReady = true;
}

function mapUiStatus(reportStatus, remaining) {
  const s = String(reportStatus || '').toLowerCase();
  if (s === 'no_fee_card') return 'no_fee';
  if (s === 'full_pay' || s === 'full') return 'paid';
  if (s === 'remain_pay') return 'partial';
  if (s === 'not_paid') return 'unpaid';
  const bal = remaining == null ? null : Number(remaining);
  if (bal != null && bal > 0) return 'unpaid';
  return 'no_fee';
}

function pickParentContact(row) {
  const fatherName = trimStr(row.father_full_name);
  const motherName = trimStr(row.mother_full_name);
  const fatherEmail = trimStr(row.father_email);
  const motherEmail = trimStr(row.mother_email);
  const fatherPhone = trimStr(row.father_phone);
  const motherPhone = trimStr(row.mother_phone);

  if (fatherEmail || fatherPhone) {
    return {
      parent_name: fatherName || motherName || 'Parent',
      parent_email: fatherEmail || motherEmail || '',
      parent_phone: fatherPhone || motherPhone || '',
    };
  }
  return {
    parent_name: motherName || fatherName || 'Parent',
    parent_email: motherEmail || fatherEmail || '',
    parent_phone: motherPhone || fatherPhone || '',
  };
}

async function loadLastPaymentMap(schoolId, academicYear, term) {
  const [rows] = await promisePool.query(
    `SELECT student_id, MAX(created_at) AS last_paid_at
     FROM school_fee_collections
     WHERE school_id = ?
     GROUP BY student_id`,
    [schoolId]
  ).catch(() => [[]]);

  const map = new Map();
  for (const r of rows || []) {
    map.set(Number(r.student_id), r.last_paid_at ? new Date(r.last_paid_at) : null);
  }
  return map;
}

function computeOverdueDays(uiStatus, lastPaidAt) {
  if (uiStatus === 'paid' || uiStatus === 'no_fee') return 0;
  if (!lastPaidAt) return 14;
  const diff = Math.floor((Date.now() - lastPaidAt.getTime()) / (1000 * 60 * 60 * 24));
  return Math.max(0, diff);
}

async function buildReminderStudents(schoolId, academicYear, term, options = {}) {
  const classFilter = trimStr(options.class_name);
  const statusFilter = trimStr(options.status);
  const searchQ = trimStr(options.q).toLowerCase();

  const report = await accountantFees.buildAccountantPaymentReport(
    schoolId,
    academicYear,
    term,
    classFilter,
    statusFilter === 'unpaid'
      ? 'not_paid'
      : statusFilter === 'partial'
        ? 'remain_pay'
        : statusFilter === 'paid'
          ? 'full_pay'
          : statusFilter === 'no_fee'
            ? 'no_fee_card'
            : '',
    { includeOnlineInvoicePayments: true }
  );

  const studentIds = report.rows.map((r) => Number(r.student_id)).filter((id) => id > 0);
  let parentById = new Map();
  if (studentIds.length) {
    const placeholders = studentIds.map(() => '?').join(',');
    const [parentRows] = await promisePool.query(
      `SELECT id, father_full_name, father_phone, father_email,
              mother_full_name, mother_phone, mother_email
       FROM students WHERE school_id = ? AND id IN (${placeholders})`,
      [schoolId, ...studentIds]
    );
    parentById = new Map(parentRows.map((r) => [Number(r.id), r]));
  }

  const lastPaidMap = await loadLastPaymentMap(schoolId, academicYear, term);

  let students = report.rows.map((r) => {
    const remaining = r.remaining == null ? null : Number(r.remaining);
    const uiStatus = mapUiStatus(r.status, remaining);
    const parentRow = parentById.get(Number(r.student_id)) || {};
    const parent = pickParentContact(parentRow);
    const lastPaid = lastPaidMap.get(Number(r.student_id)) || null;
    const overdue = computeOverdueDays(uiStatus, lastPaid);
    const name = `${trimStr(r.first_name)} ${trimStr(r.last_name)}`.trim() || 'Student';

    const studentCode = trimStr(r.student_code) || trimStr(r.student_uid) || '';

    return {
      student_id: Number(r.student_id),
      id: studentCode || String(r.student_id),
      student_code: studentCode,
      name,
      class_name: trimStr(r.class_name) || '—',
      balance: remaining == null ? null : remaining,
      report_status: r.status,
      total_due: r.total_due == null ? null : Number(r.total_due),
      total_paid: Number(r.total_paid || 0),
      status: uiStatus,
      report_status: r.status,
      parent_name: parent.parent_name,
      parent_email: parent.parent_email,
      parent_phone: parent.parent_phone,
      overdue_days: overdue,
      has_email: !!parent.parent_email,
      has_phone: !!parent.parent_phone,
    };
  });

  if (options.overdue_min) {
    const min = Number(options.overdue_min) || 0;
    students = students.filter((s) => s.overdue_days >= min);
  }
  if (options.small_balance) {
    students = students.filter((s) => s.balance > 0 && s.balance < 50000);
  }
  if (searchQ) {
    students = students.filter(
      (s) =>
        s.name.toLowerCase().includes(searchQ) ||
        String(s.id).toLowerCase().includes(searchQ) ||
        String(s.student_code || '').toLowerCase().includes(searchQ)
    );
  }

  students = await enrichStudentsWithPushFlag(students);

  return {
    filters: { academic_year: academicYear, term, class_name: classFilter || null },
    class_names: report.class_names || [],
    summary: {
      total_students: students.length,
      unpaid: students.filter((s) => s.status === 'unpaid').length,
      partial: students.filter((s) => s.status === 'partial').length,
      paid: students.filter((s) => s.status === 'paid').length,
      no_fee: students.filter((s) => s.status === 'no_fee').length,
      total_balance: students.reduce((a, s) => a + Number(s.balance || 0), 0),
      overdue_15_plus: students.filter((s) => s.overdue_days >= 15).length,
    },
    students,
    report_summary: report.summary,
  };
}

function summarizeDeliveryLogs(logs = []) {
  const summary = {};
  for (const row of logs) {
    const ch = row.channel || 'unknown';
    const st = row.delivery_status || 'unknown';
    if (!summary[ch]) summary[ch] = { sent: 0, failed: 0, skipped: 0 };
    if (summary[ch][st] != null) summary[ch][st] += 1;
    else summary[ch][st] = 1;
  }
  return summary;
}

function buildDeliveryNotes(summary = {}, logs = []) {
  const notes = [];
  const emailFailed = Number(summary.email?.failed || 0);
  const pushFailed = Number(summary.push?.failed || 0);
  const pushSkipped = Number(summary.push?.skipped || 0);
  const pushSent = Number(summary.push?.sent || 0);
  const inSystemSent = Number(summary.in_system?.sent || 0);

  if (emailFailed > 0) {
    const sample = (logs || []).find(
      (l) => l.channel === 'email' && l.delivery_status === 'failed' && l.error_message
    );
    const err = String(sample?.error_message || '');
    if (/535|BadCredentials|Username and Password not accepted/i.test(err)) {
      notes.push(
        'Email failed: Gmail rejected the SMTP password. Create a new Google App Password and update SMTP_PASS in backend .env, then restart the server.'
      );
    } else {
      notes.push(`Email failed (${emailFailed}): ${err.slice(0, 120) || 'SMTP error'}`);
    }
  }
  if (pushFailed > 0) {
    notes.push('Push failed: server error — restart the backend after the latest update.');
  }
  if (pushSkipped > 0 && pushSent === 0) {
    notes.push(
      'Push skipped: no device subscribed. Parent must enable notifications in the Parent portal (phone must match the student record).'
    );
  }
  if (inSystemSent > 0) {
    notes.push(`In-system: ${inSystemSent} notification(s) saved in the parent portal inbox.`);
  }
  if (pushSent > 0) {
    notes.push(`Push: ${pushSent} browser notification(s) sent.`);
  }
  return notes;
}

function mapCampaignRow(r) {
  let channels = [];
  let filters = {};
  try {
    channels = r.channels_json ? (Array.isArray(r.channels_json) ? r.channels_json : JSON.parse(r.channels_json)) : [];
  } catch (_) { channels = []; }
  try {
    filters = r.filters_json ? (typeof r.filters_json === 'object' ? r.filters_json : JSON.parse(r.filters_json)) : {};
  } catch (_) { filters = {}; }

  const recipientCount = Number(r.recipient_count || 0);
  const delivered = Number(r.delivered_count || 0);
  const failed = Number(r.failed_count || 0);
  const attempts = delivered + failed;
  const rate = attempts > 0 ? Math.round((delivered / attempts) * 100) : 0;

  return {
    id: r.campaign_code || `C${r.id}`,
    db_id: r.id,
    date: r.sent_at
      ? new Date(r.sent_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
      : new Date(r.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
    type: r.title,
    template: r.template_key,
    recipients: recipientCount,
    channels: (channels || []).map((c) => {
      const m = { email: 'Email', sms: 'SMS', push: 'Push', in_system: 'In-System' };
      return m[c] || c;
    }),
    status: r.status === 'partial' ? 'Partial' : r.status === 'failed' ? 'Failed' : 'Delivered',
    rate,
    paid_after: 0,
    failed,
    academic_year: r.academic_year,
    term: r.term,
    subject: r.subject_line,
    message_body: r.message_body || '',
    sent_at_iso: r.sent_at || r.created_at,
  };
}

function formatRuleSendTime(raw) {
  const t = trimStr(raw);
  if (!t) return null;
  const m = t.match(/^(\d{1,2}):(\d{2})/);
  if (!m) return null;
  const h = Math.min(23, Math.max(0, parseInt(m[1], 10)));
  const min = Math.min(59, Math.max(0, parseInt(m[2], 10)));
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
}

function formatTimeDisplay(sendTime) {
  const t = formatRuleSendTime(sendTime);
  if (!t) return '—';
  const [h, min] = t.split(':').map((x) => parseInt(x, 10));
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${String(min).padStart(2, '0')} ${ampm}`;
}

function mapRuleRow(r) {
  let channels = 'Email';
  try {
    const arr = r.channels_json ? (Array.isArray(r.channels_json) ? r.channels_json : JSON.parse(r.channels_json)) : [];
    if (arr.length) {
      channels = arr
        .map((c) => ({ email: 'Email', sms: 'SMS', push: 'Push', in_system: 'In-System' }[c] || c))
        .join(' + ');
    }
  } catch (_) { /* keep default */ }
  const sendTime = formatRuleSendTime(r.send_time);
  const lastSent = r.last_sent_at ? new Date(r.last_sent_at) : null;
  return {
    id: r.id,
    active: !!r.is_active,
    name: r.name,
    condition: r.condition_text,
    extra: r.extra_condition || '',
    action: r.action_text,
    channel: channels,
    frequency: r.frequency,
    nextRun: r.next_run_label || '—',
    send_time: sendTime,
    send_time_display: sendTime ? formatTimeDisplay(sendTime) : '—',
    last_sent_at: lastSent ? lastSent.toISOString() : null,
    last_sent_display: lastSent
      ? lastSent.toLocaleString('en-GB', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })
      : 'Not sent yet',
    last_reached_count: Number(r.last_reached_count || 0),
    academic_year: r.academic_year || '',
    term: r.term || '',
    class_name: r.class_name || 'All',
    require_fee_card: r.require_fee_card !== 0 && r.require_fee_card !== false,
    scope_display: [r.academic_year, r.term, r.class_name || 'All']
      .filter((x) => trimStr(x))
      .join(' · ') || 'School default year/term',
  };
}

function parseChannels(body = {}) {
  const raw = body.channels || body.channels_json || {};
  const list = [];
  if (Array.isArray(raw)) {
    raw.forEach((c) => {
      const k = String(c).toLowerCase().replace(/\s+/g, '_');
      if (CHANNEL_KEYS.includes(k)) list.push(k);
    });
  } else if (typeof raw === 'object') {
    if (raw.all || raw.all_channels) {
      return ['email', 'push', 'in_system'];
    }
    if (raw.email) list.push('email');
    if (raw.sms) list.push('sms');
    if (raw.push) list.push('push');
    if (raw.inSystem || raw.in_system) list.push('in_system');
    if (
      list.length >= 3 &&
      list.includes('email') &&
      list.includes('push') &&
      list.includes('in_system')
    ) {
      return ['email', 'push', 'in_system'];
    }
  }
  if (!list.length && body.channel) {
    const s = String(body.channel).toLowerCase();
    if (s.includes('all')) return [...CHANNEL_KEYS.filter((k) => k !== 'sms')];
    if (s.includes('email')) list.push('email');
    if (s.includes('push')) list.push('push');
    if (s.includes('sms')) list.push('sms');
    if (s.includes('in-system') || s.includes('in system')) list.push('in_system');
  }
  return list.length ? list : ['email'];
}

// ─── Routes ─────────────────────────────────────────────────────────

router.get('/accountant/fee-reminders/options', requireAuth, requireRole(ACCOUNTANT_READ), async (req, res) => {
  try {
    const { schoolId } = req.ctx;
    const calendar = await loadSchoolAcademicCalendar(schoolId);
    const [[school]] = await promisePool.query(
      'SELECT id, COALESCE(school_name, name) AS name FROM schools WHERE id = ? LIMIT 1',
      [schoolId]
    ).catch(() => [[null]]);

    res.json({
      success: true,
      data: {
        school_name: school?.name || 'School',
        academic_years: calendar.academicYears,
        current_academic_year: calendar.currentAcademicYear,
        default_term: calendar.defaultTerm,
        terms: calendar.terms,
        terms_by_year: calendar.termsByYear,
        templates: TEMPLATE_KEYS,
        channels: CHANNEL_KEYS,
      },
    });
  } catch (err) {
    console.error('[fee-reminders/options]', err);
    res.status(500).json({ success: false, message: 'Failed to load reminder options' });
  }
});

router.get('/accountant/fee-reminders/recipient-preview', requireAuth, requireRole(ACCOUNTANT_READ), async (req, res) => {
  try {
    const { schoolId } = req.ctx;
    const academicYear = trimStr(req.query.academic_year);
    const term = trimStr(req.query.term);
    if (!academicYear || !term) {
      return res.status(400).json({ success: false, message: 'academic_year and term are required' });
    }

    const payload = await buildReminderStudents(schoolId, academicYear, term, {
      class_name: req.query.class_name,
    });

    const filters = {
      not_paid: req.query.not_paid === '1' || req.query.not_paid === 'true',
      partial: req.query.partial === '1' || req.query.partial === 'true',
      overdue: req.query.overdue === '1' || req.query.overdue === 'true',
      small_balance: req.query.small_balance === '1' || req.query.small_balance === 'true',
      q: req.query.q,
    };

    const buckets = computeBucketCounts(payload.students);
    const targets = filterByModalRecipients(payload.students, filters);
    const channels = computeChannelReach(targets);

    res.json({
      success: true,
      data: {
        buckets,
        ...channels,
        matching_students: targets.length,
      },
    });
  } catch (err) {
    console.error('[fee-reminders/recipient-preview]', err);
    res.status(500).json({ success: false, message: 'Failed to load recipient preview' });
  }
});

router.get('/accountant/fee-reminders/students', requireAuth, requireRole(ACCOUNTANT_READ), async (req, res) => {
  try {
    const { schoolId } = req.ctx;
    const academicYear = trimStr(req.query.academic_year);
    const term = trimStr(req.query.term);
    if (!academicYear || !term) {
      return res.status(400).json({ success: false, message: 'academic_year and term are required' });
    }

    const data = await buildReminderStudents(schoolId, academicYear, term, {
      class_name: req.query.class_name,
      status: req.query.status,
      q: req.query.q,
      overdue_min: req.query.overdue_min,
      small_balance: req.query.small_balance === '1' || req.query.small_balance === 'true',
    });

    res.json({ success: true, data });
  } catch (err) {
    console.error('[fee-reminders/students]', err);
    res.status(500).json({ success: false, message: 'Failed to load students for reminders' });
  }
});

router.get('/accountant/fee-reminders/campaigns', requireAuth, requireRole(ACCOUNTANT_READ), async (req, res) => {
  try {
    await ensureReminderTables();
    const { schoolId } = req.ctx;
    const [rows] = await promisePool.query(
      `SELECT * FROM school_fee_reminder_campaigns
       WHERE school_id = ?
       ORDER BY COALESCE(sent_at, created_at) DESC
       LIMIT 100`,
      [schoolId]
    );
    res.json({ success: true, data: rows.map(mapCampaignRow) });
  } catch (err) {
    console.error('[fee-reminders/campaigns GET]', err);
    res.status(500).json({ success: false, message: 'Failed to load campaigns' });
  }
});

router.get('/accountant/fee-reminders/campaigns/:id', requireAuth, requireRole(ACCOUNTANT_READ), async (req, res) => {
  try {
    await ensureReminderTables();
    const { schoolId } = req.ctx;
    const id = Number(req.params.id);
    const [[camp]] = await promisePool.query(
      `SELECT * FROM school_fee_reminder_campaigns WHERE school_id = ? AND id = ? LIMIT 1`,
      [schoolId, id]
    );
    if (!camp) return res.status(404).json({ success: false, message: 'Campaign not found' });

    const [logs] = await promisePool.query(
      `SELECT * FROM school_fee_reminder_logs WHERE campaign_id = ? ORDER BY id ASC LIMIT 500`,
      [id]
    );

    res.json({
      success: true,
      data: {
        campaign: mapCampaignRow(camp),
        logs,
        delivery_summary: summarizeDeliveryLogs(logs),
      },
    });
  } catch (err) {
    console.error('[fee-reminders/campaigns/:id]', err);
    res.status(500).json({ success: false, message: 'Failed to load campaign' });
  }
});

router.post('/accountant/fee-reminders/campaigns', requireAuth, requireRole(ACCOUNTANT_WRITE), async (req, res) => {
  try {
    await ensureReminderTables();
    const { schoolId, userId } = req.ctx;
    const body = req.body || {};
    const academicYear = trimStr(body.academic_year);
    const term = trimStr(body.term);
    let templateKey = trimStr(body.template_key || body.template);
    const title = trimStr(body.title) || templateKey || 'Fee Reminder';
    const subject = trimStr(body.subject || body.subject_line);
    const messageBody = trimStr(body.body || body.message_body);
    const scheduleMode = trimStr(body.schedule_mode || 'now') === 'schedule' ? 'schedule' : 'now';
    const channels = parseChannels(body);

    if (!academicYear || !term) {
      return res.status(400).json({ success: false, message: 'academic_year and term are required' });
    }
    if (!subject || !messageBody) {
      return res.status(400).json({ success: false, message: 'subject and message body are required' });
    }
    if (!templateKey && subject && messageBody) {
      templateKey = 'gentle';
    }
    if (!TEMPLATE_KEYS.includes(templateKey)) {
      return res.status(400).json({
        success: false,
        message: `Invalid template_key. Use one of: ${TEMPLATE_KEYS.join(', ')}`,
      });
    }

    const filters = body.filters || {};
    const deadline = trimStr(body.deadline || filters.deadline);
    const studentPayload = await buildReminderStudents(schoolId, academicYear, term, {
      class_name: filters.class_name,
      status: filters.status,
      q: filters.q,
      overdue_min: filters.overdue_min,
      small_balance: filters.small_balance,
    });

    let targets = filterByModalRecipients(studentPayload.students, filters);
    if (Array.isArray(body.student_ids) && body.student_ids.length) {
      const idSet = new Set(body.student_ids.map((x) => Number(x)));
      targets = targets.filter((s) => idSet.has(s.student_id));
    }

    if (!targets.length) {
      return res.status(400).json({ success: false, message: 'No students match the selected recipients' });
    }

    const [[schoolRow]] = await promisePool.query(
      'SELECT COALESCE(school_name, name) AS name FROM schools WHERE id = ? LIMIT 1',
      [schoolId]
    ).catch(() => [[{ name: 'School' }]]);
    const schoolName = schoolRow?.name || 'School';

    const filtersStored = { ...filters, deadline: deadline || null };

    const campaignCode = `REM-${Date.now().toString(36).toUpperCase().slice(-8)}`;
    const now = new Date();
    const scheduledAt = scheduleMode === 'schedule' && body.scheduled_at ? new Date(body.scheduled_at) : null;
    const sentAt = scheduleMode === 'now' ? now : null;
    const status = scheduleMode === 'schedule' ? 'scheduled' : 'delivered';

    const [ins] = await promisePool.query(
      `INSERT INTO school_fee_reminder_campaigns (
        school_id, created_by_user_id, campaign_code, title, template_key,
        academic_year, term, subject_line, message_body, channels_json, filters_json,
        schedule_mode, scheduled_at, sent_at, recipient_count, delivered_count, failed_count, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        schoolId,
        userId,
        campaignCode,
        title,
        templateKey,
        academicYear,
        term,
        subject || null,
        messageBody || null,
        JSON.stringify(channels),
        JSON.stringify(filtersStored),
        scheduleMode,
        scheduledAt,
        sentAt,
        targets.length,
        0,
        0,
        status,
      ]
    );

    const campaignId = ins.insertId;

    let deliveredCount = 0;
    let failedCount = 0;

    if (scheduleMode === 'now') {
      const result = await deliverCampaignNow({
        schoolId,
        schoolName,
        campaignId,
        targets,
        channels,
        subject,
        messageBody,
        deadline,
        academicYear,
        term,
      });
      deliveredCount = result.delivered;
      failedCount = result.failed;
      const finalStatus =
        failedCount > 0 && deliveredCount > 0
          ? 'partial'
          : failedCount > 0 && deliveredCount === 0
            ? 'failed'
            : 'delivered';
      await promisePool.query(
        `UPDATE school_fee_reminder_campaigns
         SET delivered_count = ?, failed_count = ?, status = ?
         WHERE id = ?`,
        [deliveredCount, failedCount, finalStatus, campaignId]
      );
    }

    const [[row]] = await promisePool.query(
      'SELECT * FROM school_fee_reminder_campaigns WHERE id = ? LIMIT 1',
      [campaignId]
    );

    let deliverySummary = null;
    let deliveryNotes = [];
    if (scheduleMode === 'now') {
      const [logs] = await promisePool.query(
        'SELECT channel, delivery_status, error_message FROM school_fee_reminder_logs WHERE campaign_id = ?',
        [campaignId]
      );
      deliverySummary = summarizeDeliveryLogs(logs);
      deliveryNotes = buildDeliveryNotes(deliverySummary, logs);
    }

    const partialDelivery = failedCount > 0 && deliveredCount > 0;
    const allFailed = failedCount > 0 && deliveredCount === 0;

    res.status(201).json({
      success: true,
      message:
        scheduleMode === 'schedule'
          ? 'Campaign scheduled'
          : allFailed
            ? 'Campaign created but all deliveries failed'
            : partialDelivery
              ? 'Campaign sent with some delivery failures'
              : 'Campaign sent',
      data: {
        ...mapCampaignRow(row),
        delivery_summary: deliverySummary,
        delivery_notes: deliveryNotes,
      },
    });
  } catch (err) {
    console.error('[fee-reminders/campaigns POST]', err);
    res.status(500).json({ success: false, message: 'Failed to create campaign' });
  }
});

router.post('/accountant/fee-reminders/rules/preview-match', requireAuth, requireRole(ACCOUNTANT_READ), async (req, res) => {
  try {
    await ensureReminderTables();
    const { schoolId } = req.ctx;
    const body = req.body || {};
    const condition = trimStr(body.condition);
    if (!condition) {
      return res.status(400).json({ success: false, message: 'condition is required' });
    }
    const academicYear = trimStr(body.academic_year || body.academicYear);
    const termName = trimStr(body.term);
    if (!academicYear || !termName) {
      return res.status(400).json({ success: false, message: 'academic_year and term are required' });
    }

    const ruleScheduler = require('./feeReminderRuleScheduler');
    if (!ruleScheduler.parseRuleCondition(condition)) {
      return res.status(400).json({ success: false, message: 'Invalid IF condition' });
    }
    const extra = trimStr(body.extra);
    if (extra && !ruleScheduler.parseRuleCondition(extra)) {
      return res.status(400).json({ success: false, message: 'Invalid AND condition' });
    }

    const pseudoRule = {
      school_id: schoolId,
      academic_year: academicYear,
      term: termName,
      class_name: trimStr(body.class_name || body.className) || 'All',
      require_fee_card: body.require_fee_card !== false && body.requireFeeCard !== false ? 1 : 0,
      condition_text: condition,
      extra_condition: extra || null,
    };
    const scope = await ruleScheduler.buildRuleTargetStudents(pseudoRule);
    res.json({
      success: true,
      data: {
        academic_year: scope.academicYear,
        term: scope.term,
        class_name: scope.className,
        require_fee_card: scope.requireFeeCard,
        total_students: scope.totalStudents,
        with_fee_card: scope.withFeeCardCount,
        in_scope: scope.inScopeCount,
        matched: scope.matched.length,
        class_names: scope.class_names,
      },
    });
  } catch (err) {
    console.error('[fee-reminders/rules preview-match]', err);
    res.status(500).json({ success: false, message: 'Failed to preview rule match' });
  }
});

router.get('/accountant/fee-reminders/rules/condition-examples', requireAuth, requireRole(ACCOUNTANT_READ), async (req, res) => {
  try {
    const ruleScheduler = require('./feeReminderRuleScheduler');
    res.json({
      success: true,
      data: {
        examples: ruleScheduler.CONDITION_EXAMPLES,
        tips: [
          'Use Balance < 400000 or Balance >= 50000 (RWF, no commas required)',
          'Combine with AND: e.g. IF Balance > 0 AND Overdue > 7 days',
          'Status = unpaid | partial | paid | no_fee',
          'Spaces around < > = are optional: Balance<400000 works',
        ],
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to load examples' });
  }
});

router.get('/accountant/fee-reminders/rules', requireAuth, requireRole(ACCOUNTANT_READ), async (req, res) => {
  try {
    await ensureReminderTables();
    const { schoolId } = req.ctx;
    const [rows] = await promisePool.query(
      `SELECT * FROM school_fee_reminder_rules
       WHERE school_id = ? AND deleted_at IS NULL
       ORDER BY id DESC`,
      [schoolId]
    );
    res.json({ success: true, data: rows.map(mapRuleRow) });
  } catch (err) {
    console.error('[fee-reminders/rules GET]', err);
    res.status(500).json({ success: false, message: 'Failed to load rules' });
  }
});

router.post('/accountant/fee-reminders/rules', requireAuth, requireRole(ACCOUNTANT_WRITE), async (req, res) => {
  try {
    await ensureReminderTables();
    const { schoolId, userId } = req.ctx;
    const body = req.body || {};
    const name = trimStr(body.name);
    const condition = trimStr(body.condition);
    const action = trimStr(body.action);
    if (!name || !condition || !action) {
      return res.status(400).json({ success: false, message: 'name, condition, and action are required' });
    }

    const ruleScheduler = require('./feeReminderRuleScheduler');
    if (!ruleScheduler.parseRuleCondition(condition)) {
      return res.status(400).json({
        success: false,
        message:
          'Invalid IF condition. Examples: Balance < 400000, Balance > 0, Status = unpaid, Overdue > 7 days',
      });
    }
    const extra = trimStr(body.extra);
    if (extra && !ruleScheduler.parseRuleCondition(extra)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid AND condition. Example: Overdue > 7 days',
      });
    }

    const sendTime = formatRuleSendTime(body.send_time || body.sendTime);
    if (!sendTime) {
      return res.status(400).json({ success: false, message: 'send_time is required (e.g. 07:30)' });
    }

    const academicYear = trimStr(body.academic_year || body.academicYear);
    const termName = trimStr(body.term);
    if (!academicYear || !termName) {
      return res.status(400).json({ success: false, message: 'academic_year and term are required' });
    }
    const className = trimStr(body.class_name || body.className) || 'All';
    const requireFeeCard =
      body.require_fee_card === false || body.requireFeeCard === false ? 0 : 1;

    const channels = parseChannels(body);
    const [ins] = await promisePool.query(
      `INSERT INTO school_fee_reminder_rules (
        school_id, created_by_user_id, name, is_active, condition_text, extra_condition,
        action_text, channels_json, frequency, next_run_label, send_time,
        academic_year, term, class_name, require_fee_card
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        schoolId,
        userId,
        name,
        body.active === false || body.is_active === false ? 0 : 1,
        condition,
        trimStr(body.extra) || null,
        action,
        JSON.stringify(channels),
        trimStr(body.frequency) || 'Once',
        trimStr(body.nextRun || body.next_run) || '—',
        sendTime,
        academicYear,
        termName,
        className,
        requireFeeCard,
      ]
    );

    const [[row]] = await promisePool.query(
      'SELECT * FROM school_fee_reminder_rules WHERE id = ? LIMIT 1',
      [ins.insertId]
    );
    res.status(201).json({ success: true, data: mapRuleRow(row) });
  } catch (err) {
    console.error('[fee-reminders/rules POST]', err);
    res.status(500).json({ success: false, message: 'Failed to create rule' });
  }
});

router.patch('/accountant/fee-reminders/rules/:id', requireAuth, requireRole(ACCOUNTANT_WRITE), async (req, res) => {
  try {
    await ensureReminderTables();
    const { schoolId } = req.ctx;
    const id = Number(req.params.id);
    const body = req.body || {};

    const updates = [];
    const params = [];
    if (body.name != null) { updates.push('name = ?'); params.push(trimStr(body.name)); }
    if (body.condition != null) { updates.push('condition_text = ?'); params.push(trimStr(body.condition)); }
    if (body.extra != null) { updates.push('extra_condition = ?'); params.push(trimStr(body.extra)); }
    if (body.action != null) { updates.push('action_text = ?'); params.push(trimStr(body.action)); }
    if (body.frequency != null) { updates.push('frequency = ?'); params.push(trimStr(body.frequency)); }
    if (body.nextRun != null || body.next_run != null) {
      updates.push('next_run_label = ?');
      params.push(trimStr(body.nextRun || body.next_run));
    }
    if (body.active != null || body.is_active != null) {
      updates.push('is_active = ?');
      params.push(body.active === false || body.is_active === false ? 0 : 1);
    }
    if (body.channels != null) {
      updates.push('channels_json = ?');
      params.push(JSON.stringify(parseChannels(body)));
    }
    if (body.send_time != null || body.sendTime != null) {
      updates.push('send_time = ?');
      params.push(formatRuleSendTime(body.send_time || body.sendTime));
    }
    if (body.academic_year != null || body.academicYear != null) {
      updates.push('academic_year = ?');
      params.push(trimStr(body.academic_year || body.academicYear));
    }
    if (body.term != null) {
      updates.push('term = ?');
      params.push(trimStr(body.term));
    }
    if (body.class_name != null || body.className != null) {
      updates.push('class_name = ?');
      params.push(trimStr(body.class_name || body.className) || 'All');
    }
    if (body.require_fee_card != null || body.requireFeeCard != null) {
      updates.push('require_fee_card = ?');
      params.push(body.require_fee_card === false || body.requireFeeCard === false ? 0 : 1);
    }
    if (body.condition != null) {
      const ruleScheduler = require('./feeReminderRuleScheduler');
      if (!ruleScheduler.parseRuleCondition(trimStr(body.condition))) {
        return res.status(400).json({ success: false, message: 'Invalid IF condition' });
      }
    }
    if (body.extra != null && trimStr(body.extra)) {
      const ruleScheduler = require('./feeReminderRuleScheduler');
      if (!ruleScheduler.parseRuleCondition(trimStr(body.extra))) {
        return res.status(400).json({ success: false, message: 'Invalid AND condition' });
      }
    }
    if (!updates.length) {
      return res.status(400).json({ success: false, message: 'No fields to update' });
    }

    params.push(schoolId, id);
    const [result] = await promisePool.query(
      `UPDATE school_fee_reminder_rules SET ${updates.join(', ')} WHERE school_id = ? AND id = ? AND deleted_at IS NULL`,
      params
    );
    if (!result.affectedRows) return res.status(404).json({ success: false, message: 'Rule not found' });

    const [[row]] = await promisePool.query(
      'SELECT * FROM school_fee_reminder_rules WHERE id = ? LIMIT 1',
      [id]
    );
    res.json({ success: true, data: mapRuleRow(row) });
  } catch (err) {
    console.error('[fee-reminders/rules PATCH]', err);
    res.status(500).json({ success: false, message: 'Failed to update rule' });
  }
});

router.post('/accountant/fee-reminders/rules/:id/run-now', requireAuth, requireRole(ACCOUNTANT_WRITE), async (req, res) => {
  try {
    await ensureReminderTables();
    const { schoolId } = req.ctx;
    const id = Number(req.params.id);
    const [[rule]] = await promisePool.query(
      `SELECT * FROM school_fee_reminder_rules
       WHERE school_id = ? AND id = ? AND deleted_at IS NULL LIMIT 1`,
      [schoolId, id]
    );
    if (!rule) return res.status(404).json({ success: false, message: 'Rule not found' });

    const ruleScheduler = require('./feeReminderRuleScheduler');
    const result = await ruleScheduler.executeReminderRule(rule, { force: true });
    if (result.skipped && result.reason) {
      return res.status(400).json({ success: false, message: result.reason, data: result });
    }
    const scopeLine = [result.academic_year, result.term, result.class_name].filter(Boolean).join(' · ');
    res.json({
      success: true,
      message:
        result.matched > 0
          ? `Sent to ${result.reached} parent(s) · ${scopeLine}`
          : result.total_in_scope != null
            ? `No students matched (${result.total_in_scope} with fee card in scope · ${scopeLine})`
            : 'No students matched this rule right now',
      data: result,
    });
  } catch (err) {
    console.error('[fee-reminders/rules run-now]', err);
    res.status(500).json({ success: false, message: err.message || 'Failed to run rule' });
  }
});

function parseRuleChannelsJson(channelsJson) {
  let arr = [];
  try {
    arr = channelsJson
      ? Array.isArray(channelsJson)
        ? channelsJson
        : JSON.parse(channelsJson)
      : [];
  } catch (_) {
    arr = [];
  }
  if (!arr.length) return ['email', 'push', 'in_system'];
  return arr.filter((c) => ['email', 'push', 'in_system', 'sms'].includes(c));
}

router.delete('/accountant/fee-reminders/rules/:id', requireAuth, requireRole(ACCOUNTANT_WRITE), async (req, res) => {
  try {
    await ensureReminderTables();
    const { schoolId } = req.ctx;
    const id = Number(req.params.id);
    const [result] = await promisePool.query(
      `UPDATE school_fee_reminder_rules SET deleted_at = NOW() WHERE school_id = ? AND id = ? AND deleted_at IS NULL`,
      [schoolId, id]
    );
    if (!result.affectedRows) return res.status(404).json({ success: false, message: 'Rule not found' });
    res.json({ success: true, message: 'Rule deleted' });
  } catch (err) {
    console.error('[fee-reminders/rules DELETE]', err);
    res.status(500).json({ success: false, message: 'Failed to delete rule' });
  }
});

const ruleScheduler = require('./feeReminderRuleScheduler');
ruleScheduler.initFeeReminderRuleRunner({
  ensureReminderTables,
  loadSchoolAcademicCalendar,
  buildReminderStudents,
  enrichStudentsWithPushFlag,
  deliverCampaignNow,
  inferAcademicYearFromDate,
  inferTermFromMonth,
});

module.exports = router;
