// ================================================================
// publicBabyeyiPay.js — Public (no auth) pricing preview + payment intents
// for school mini-site Babyeyi finder. Requires ?school_id= to match.
//
// Mounted at:
//   /api/public/babyeyi-pay
//   /api/parent-portal/public/babyeyi-finder   (same routes — parent / mobile label)
//
// Student code lookup (step 1 of guest pay) lives in parentPortal.js:
//   POST /api/parent-portal/public/babyeyi-finder/student-lookup
//   POST /api/public/student-code-lookup
// ================================================================

const express = require('express');
const axios = require('axios');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const xlsx = require('xlsx');
const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');
const fs = require('fs');
const path = require('path');
const router = express.Router();
const db = require('../config/database');
const { getBabyeyiFinderDiscoveryPayload } = require('./babyeyiFinderDiscovery');
const { loadApprovedBabyeyiPricing } = require('./babyeyiPublicPricingCore');
const {
  quoteBabyeyiPayBalance,
  validateBabyeyiPaymentAgainstBalance,
  loadFeesForSelection,
} = require('./babyeyiPayBalanceCore');
const { ensureShuleAvanceOrgTables } = require('./shuleAvanceOrgSchema');
const { requireRole } = require('../middleware/deoAuth');
const {
  mtnMomoEnabled,
  requestToPay: mtnRequestToPay,
  getRequestToPayStatus: mtnGetRequestToPayStatus,
  mapMtnStatusToUpper,
} = require('./mtnMomoCollection');
const { resolveGuestShareFromReq, ensureClasskitShareTable } = require('./classkitShareService');
const { resolveSchoolIdFromInput } = require('./schoolResolvePublic');

const query = (sql, params = []) => db.query(sql, params);

const SQL_JOIN_STUDENT_REQ_BY_ITEM = `LEFT JOIN student_requirements sr ON CONVERT(TRIM(LOWER(sr.name)) USING utf8mb4) COLLATE utf8mb4_unicode_ci = CONVERT(TRIM(LOWER(bsr.item)) USING utf8mb4) COLLATE utf8mb4_unicode_ci`;
const VALID_INTENT_STATUSES = new Set(['submitted', 'paid', 'failed', 'draft']);
const XENTRIPAY_API_BASE = String(process.env.XENTRIPAY_API_BASE || 'https://xentripay.com').replace(/\/+$/, '');
const XENTRIPAY_TOKEN = String(process.env.XENTRIPAY_BEARER_TOKEN || '').trim();
const XENTRIPAY_WEBHOOK_TOKEN = String(process.env.XENTRIPAY_WEBHOOK_TOKEN || '').trim();
const XENTRIPAY_MAX_RETRY = Math.max(1, Number(process.env.XENTRIPAY_MAX_RETRY || 3));
const XENTRIPAY_RETRY_COOLDOWN_MIN = Math.max(0, Number(process.env.XENTRIPAY_RETRY_COOLDOWN_MIN || 2));

function normalizeEmail(raw) {
  const v = String(raw || '').trim().toLowerCase();
  if (!v || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return null;
  return v;
}

const SHULE_APPLICANT_CAT_DEFAULT = ['Parent', 'Teacher', 'Director'];

function parseShuleOrgApplicantCategoriesJson(j) {
  try {
    const p = j == null ? null : typeof j === 'string' ? JSON.parse(j) : j;
    if (!Array.isArray(p) || !p.length) return [...SHULE_APPLICANT_CAT_DEFAULT];
    const out = [];
    const seen = new Set();
    for (const x of p) {
      const t = String(x).trim().replace(/\s+/g, ' ');
      if (!t || t.length > 120) continue;
      const k = t.toLowerCase();
      if (seen.has(k)) continue;
      seen.add(k);
      out.push(t);
      if (out.length >= 30) break;
    }
    return out.length ? out : [...SHULE_APPLICANT_CAT_DEFAULT];
  } catch (_) {
    return [...SHULE_APPLICANT_CAT_DEFAULT];
  }
}

function computeInvoiceStatusFromIntentStatus(intentStatus, paymentPlan = null) {
  const s = String(intentStatus || '').trim().toLowerCase();
  if (s === 'paid') return 'PAID';
  if (s === 'draft') return 'DRAFT';
  const method = String(paymentPlan?.method || '').trim().toLowerCase();
  if (s === 'submitted' && (method === 'loan' || method === 'shule_avance')) return 'PENDING_APPROVAL';
  return 'NOT_PAID';
}

function makeInvoiceNo(intentId) {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const n = String(intentId || 0).padStart(8, '0');
  return `INV-${yyyy}${mm}${dd}-${n}`;
}

async function resolvePayerEmailFromStudent(schoolId, selectedStudent = {}, fallbackEmail = null) {
  const direct = normalizeEmail(fallbackEmail);
  if (direct) return direct;
  const studentUid = String(selectedStudent?.student_uid || '').trim();
  const studentCode = String(selectedStudent?.student_code || '').trim();
  const sdmCode = String(selectedStudent?.sdm_code || '').trim();
  if (!schoolId || (!studentUid && !studentCode && !sdmCode)) return null;
  const upperUid = studentUid.toUpperCase();
  const upperSdm = sdmCode.toUpperCase();
  try {
    const [rows] = await db.promisePool.query(
      `SELECT father_email, mother_email
       FROM students
       WHERE school_id = ?
         AND (
           (? <> '' AND (TRIM(UPPER(student_uid)) = ? OR TRIM(student_uid) = ?))
           OR (? <> '' AND TRIM(student_code) = ?)
           OR (? <> '' AND TRIM(UPPER(sdm_code)) = ?)
         )
       ORDER BY id ASC
       LIMIT 1`,
      [schoolId, studentUid, upperUid, studentUid, studentCode, studentCode, sdmCode, upperSdm]
    );
    const row = rows?.[0];
    return normalizeEmail(row?.father_email) || normalizeEmail(row?.mother_email) || null;
  } catch (e) {
    console.warn('[publicBabyeyiPay] resolvePayerEmailFromStudent:', e.message);
    return null;
  }
}

function xentripayEnabled() {
  return !!XENTRIPAY_TOKEN;
}

function normalizeRwandaPhone(raw) {
  let v = String(raw || '').trim();
  v = v.replace(/[\s\-().]/g, '').replace(/[^\d+]/g, '');
  if (v.startsWith('+250')) v = `0${v.slice(4)}`;
  else if (v.startsWith('250') && v.length === 12) v = `0${v.slice(3)}`;
  if (/^[27]\d{8}$/.test(v)) v = `0${v}`;
  if (/^07[2389]\d{7}$/.test(v)) return v;
  return null;
}

async function sendSmsNotification({ phone, message }) {
  const localPhone = normalizeRwandaPhone(phone);
  const text = String(message || '').trim();
  if (!localPhone || !text) return { sent: false, skipped: 'invalid_phone_or_message' };
  const smsApiUrl = String(process.env.SMS_API_URL || '').trim();
  if (!smsApiUrl) {
    console.warn('[invoice/sms] SMS_API_URL not set — sms not sent');
    return { sent: false, skipped: 'sms_not_configured' };
  }
  try {
    const headers = { 'Content-Type': 'application/json' };
    const bearer = String(process.env.SMS_API_BEARER || '').trim();
    if (bearer) headers.Authorization = `Bearer ${bearer}`;
    await axios.post(
      smsApiUrl,
      {
        to: `250${localPhone.slice(1)}`,
        message: text.slice(0, 600),
        sender: String(process.env.SMS_SENDER || 'BABYEYI').slice(0, 16),
      },
      { headers, timeout: 20000 }
    );
    return { sent: true };
  } catch (err) {
    console.warn('[invoice/sms] send failed:', err.message);
    return { sent: false, skipped: 'sms_send_failed' };
  }
}

function toMsisdn250(rawPhone) {
  const local = normalizeRwandaPhone(rawPhone);
  if (!local) return null;
  return `250${local.slice(1)}`;
}

async function xentripayCollectionInitiate({ email, name, amount, cnumber, msisdn }) {
  const body = {
    email,
    cname: name,
    amount: Math.round(Number(amount || 0)),
    cnumber,
    msisdn,
    currency: 'RWF',
    pmethod: 'momo',
    chargesIncluded: 'true',
  };
  const { data } = await axios.post(
    `${XENTRIPAY_API_BASE}/api/collections/initiate`,
    body,
    {
      headers: {
        Authorization: `Bearer ${XENTRIPAY_TOKEN}`,
        'Content-Type': 'application/json',
      },
      timeout: 25000,
    }
  );
  return data || {};
}

async function xentripayCheckStatus(reference) {
  if (!reference) throw new Error('Missing reference for status check');
  const { data } = await axios.get(
    `${XENTRIPAY_API_BASE}/api/payment-requests/check-status`,
    {
      params: { customerRef: reference },
      headers: { Authorization: `Bearer ${XENTRIPAY_TOKEN}` },
      timeout: 25000,
    }
  );
  return data || {};
}

function extractReferenceFromProviderPayload(payloadRaw) {
  if (!payloadRaw) return null;
  let payload = payloadRaw;
  try {
    if (typeof payloadRaw === 'string') payload = JSON.parse(payloadRaw);
  } catch (_) {
    return null;
  }
  const top = isObject(payload) ? payload : {};
  const data = isObject(top.data) ? top.data : {};
  return firstNonEmpty(
    top.refid,
    top.customerReference,
    top.customerRef,
    top.reference,
    top.reference_number,
    top.internalRef,
    top.externalTransactionRef,
    top.tid,
    data.refid,
    data.customerReference,
    data.customerRef,
    data.reference,
    data.reference_number,
    data.internalRef,
    data.externalTransactionRef,
    data.tid
  );
}

function extractProviderErrorMessage(payloadRaw) {
  if (!payloadRaw) return null;
  let payload = payloadRaw;
  try {
    if (typeof payloadRaw === 'string') payload = JSON.parse(payloadRaw);
  } catch (_) {
    const raw = String(payloadRaw || '').trim();
    return raw ? raw.slice(0, 255) : null;
  }
  const top = isObject(payload) ? payload : {};
  const errorObj = isObject(top.error) ? top.error : {};
  const data = isObject(top.data) ? top.data : {};
  return firstNonEmpty(
    errorObj.message,
    errorObj.error,
    top.message,
    top.error,
    data.message,
    data.error,
    top.statusMessage,
    data.statusMessage
  );
}

function isObject(v) {
  return v && typeof v === 'object' && !Array.isArray(v);
}

function firstNonEmpty(...vals) {
  for (const v of vals) {
    const x = String(v ?? '').trim();
    if (x) return x;
  }
  return null;
}

/** Never expose raw WAF HTML (Request Rejected pages) to parents in the UI. */
function sanitizeGatewayMessageForPublic(raw) {
  const s = String(raw ?? '').trim();
  if (!s) return null;
  if (/<\s*html[\s>]/i.test(s) || /request rejected/i.test(s)) {
    const sidMatch = s.match(/support ID is:\s*([0-9]+)/i);
    const ref = sidMatch ? ` Support reference: ${sidMatch[1]}.` : '';
    return `MoMo could not be reached (the request was blocked before MTN’s API).${ref} Try again later or contact the school — they may need MTN to allowlist the payment server’s network.`;
  }
  return s.slice(0, 500);
}

function summarizeGatewayErrorForClient(payload) {
  if (!payload || !payload.error) return null;
  const e = payload.error;
  let out = null;
  if (typeof e === 'string') out = e;
  else if (e && typeof e === 'object') {
    const m = e.message || e.err || e.error;
    if (typeof m === 'string') out = m;
    else {
      try {
        out = JSON.stringify(e);
      } catch (_) {
        out = 'Gateway error';
      }
    }
  }
  return sanitizeGatewayMessageForPublic(out);
}

let invoiceMailer = null;
function getInvoiceMailer() {
  if (invoiceMailer !== null) return invoiceMailer;
  if (!process.env.SMTP_USER) {
    invoiceMailer = false;
    return null;
  }
  invoiceMailer = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
  return invoiceMailer;
}

async function sendInvoiceEmail({ to, subject, text, html = null, attachments = [] }) {
  if (!to || !subject || (!text && !html)) return false;
  const transport = getInvoiceMailer();
  if (!transport) {
    console.warn('[invoice/email] SMTP_USER not set — email not sent:', subject);
    return false;
  }
  try {
    const from = process.env.SMTP_FROM || `"Babyeyi Invoices" <${process.env.SMTP_USER}>`;
    await transport.sendMail({ from, to, subject, text, html, attachments });
    return true;
  } catch (err) {
    console.error('[invoice/email] send failed:', err.message);
    return false;
  }
}

async function notifyInvoiceStatusByIntentId(intentId, reason = '') {
  const id = Number(intentId || 0);
  if (!id) return { sent: false, skipped: 'invalid_intent_id' };
  const [rows] = await db.promisePool.execute(
    `SELECT i.id, i.invoice_no, i.invoice_status, i.invoice_paid_at, i.invoice_notified_not_paid_at, i.invoice_notified_paid_at,
            i.total_rwf, i.payer_name, i.payer_phone, i.payer_email,
            s.school_name,
            JSON_UNQUOTE(JSON_EXTRACT(i.payload_json, '$.selected_student.student_name')) AS student_name
     FROM babyeyi_payment_intents i
     LEFT JOIN schools s ON s.id = i.school_id
     WHERE i.id = ?
     LIMIT 1`,
    [id]
  );
  const row = rows?.[0];
  if (!row) return { sent: false, skipped: 'intent_not_found' };
  const email = normalizeEmail(row.payer_email);
  if (!email) return { sent: false, skipped: 'missing_email' };
  const status = String(row.invoice_status || 'NOT_PAID').toUpperCase();
  const alreadySent =
    status === 'PAID'
      ? !!row.invoice_notified_paid_at
      : !!row.invoice_notified_not_paid_at;
  if (alreadySent) return { sent: false, skipped: 'already_notified' };

  const amount = Number(row.total_rwf || 0).toLocaleString();
  const invoiceNo = row.invoice_no || `INV-${row.id}`;
  const studentName = row.student_name || 'Student';
  const schoolName = row.school_name || 'School';
  const payerName = row.payer_name || 'Parent/Guardian';
  const payerPhone = normalizeRwandaPhone(row.payer_phone);
  const paidAt = row.invoice_paid_at ? new Date(row.invoice_paid_at).toLocaleString() : null;

  const subject =
    status === 'PAID'
      ? `Invoice Paid - ${invoiceNo}`
      : `Invoice Created - ${invoiceNo} (Not Paid)`;
  const invoiceUrl = `${String(process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/+$/, '')}/invoices`;
  const statusChipBg = status === 'PAID' ? '#DBEAFE' : '#FEF3C7';
  const statusChipFg = status === 'PAID' ? '#1E3A8A' : '#92400E';
  const html = `
  <div style="font-family:Montserrat,Arial,sans-serif;background:#f8fafc;padding:22px;">
    <div style="max-width:700px;margin:0 auto;background:#ffffff;border:1px solid #FDEAA0;border-radius:16px;overflow:hidden;">
      <div style="padding:16px 20px;background:linear-gradient(90deg,#FFFBE8,#EAF2FF);border-bottom:1px solid #FDEAA0;">
        <div style="font-size:20px;font-weight:900;color:#1A1200;">Babyeyi Invoice</div>
        <div style="font-size:12px;color:#7A5C00;margin-top:2px;">Professional school payment invoice</div>
      </div>
      <div style="padding:18px 20px;">
        <div style="display:inline-block;padding:5px 10px;border-radius:999px;background:${statusChipBg};color:${statusChipFg};font-size:12px;font-weight:800;margin-bottom:12px;">${status}</div>
        <p style="margin:0 0 10px 0;color:#334155;">Hello ${payerName},</p>
        <p style="margin:0 0 14px 0;color:#475569;">${status === 'PAID' ? 'Your payment has been confirmed.' : 'An invoice was created and is currently not paid.'}</p>
        <table style="width:100%;border-collapse:collapse;font-size:13px;">
          <tr><td style="padding:6px 0;color:#64748B;">Invoice</td><td style="padding:6px 0;color:#0F172A;font-weight:700;">${invoiceNo}</td></tr>
          <tr><td style="padding:6px 0;color:#64748B;">Student</td><td style="padding:6px 0;color:#0F172A;font-weight:700;">${studentName}</td></tr>
          <tr><td style="padding:6px 0;color:#64748B;">School</td><td style="padding:6px 0;color:#0F172A;font-weight:700;">${schoolName}</td></tr>
          <tr><td style="padding:6px 0;color:#64748B;">Amount</td><td style="padding:6px 0;color:#0F172A;font-weight:700;">${amount} RWF</td></tr>
          ${paidAt ? `<tr><td style="padding:6px 0;color:#64748B;">Paid at</td><td style="padding:6px 0;color:#0F172A;font-weight:700;">${paidAt}</td></tr>` : ''}
        </table>
        <a href="${invoiceUrl}" style="display:inline-block;margin-top:16px;padding:10px 14px;border-radius:10px;background:#1A1200;color:#FEBF10;text-decoration:none;font-size:12px;font-weight:800;">Open invoices dashboard</a>
      </div>
    </div>
  </div>`;
  const text =
    status === 'PAID'
      ? `Hello ${payerName},

Your payment has been confirmed.

Invoice: ${invoiceNo}
Student: ${studentName}
School: ${schoolName}
Amount: ${amount} RWF
Status: PAID
Paid at: ${paidAt || 'Confirmed'}

Thank you.
${reason ? `\nReference: ${reason}` : ''}`
      : `Hello ${payerName},

An invoice has been created for your selected school payment.

Invoice: ${invoiceNo}
Student: ${studentName}
School: ${schoolName}
Amount: ${amount} RWF
Status: NOT_PAID

Please complete payment to update this invoice to PAID.
${reason ? `\nReference: ${reason}` : ''}`;

  let attachments = [];
  try {
    const bundle = await getInvoiceDetailBundleById(id);
    const pdfBuffer = await generateInvoicePdfBuffer(bundle);
    attachments = [{
      filename: `${safeFilenamePart(invoiceNo)}.pdf`,
      content: pdfBuffer,
      contentType: 'application/pdf',
    }];
  } catch (e) {
    console.warn('[invoice/email] pdf attachment skipped:', e.message);
  }
  const ok = await sendInvoiceEmail({ to: email, subject, text, html, attachments });
  const smsMessage = status === 'PAID'
    ? `Babyeyi: Payment confirmed. Invoice ${invoiceNo}, ${amount} RWF, Student ${studentName}. Thank you.`
    : `Babyeyi: Payment request created. Invoice ${invoiceNo}, ${amount} RWF, Student ${studentName}. Please pay on time.`;
  const smsResult = payerPhone ? await sendSmsNotification({ phone: payerPhone, message: smsMessage }) : { sent: false, skipped: 'missing_phone' };
  if (!ok && !smsResult.sent) return { sent: false, skipped: 'send_failed' };
  if (status === 'PAID') {
    await db.promisePool.execute(
      `UPDATE babyeyi_payment_intents SET invoice_notified_paid_at = NOW(), invoice_sent_at = NOW() WHERE id = ?`,
      [id]
    );
  } else {
    await db.promisePool.execute(
      `UPDATE babyeyi_payment_intents SET invoice_notified_not_paid_at = NOW(), invoice_sent_at = NOW() WHERE id = ?`,
      [id]
    );
  }
  return { sent: true, status, to: email, sms: smsResult.sent };
}

async function markShuleAvanceNotificationSent(intentId, which /* 'submitted_at' | 'approved_at' */) {
  const id = Number(intentId || 0);
  if (!id) return;
  const [[row]] = await db.promisePool.execute(
    `SELECT payload_json FROM babyeyi_payment_intents WHERE id = ? LIMIT 1`,
    [id]
  );
  let payload = {};
  try {
    payload = JSON.parse(row?.payload_json || '{}');
  } catch (_) {}
  if (!payload.payment_plan) payload.payment_plan = {};
  if (!payload.payment_plan.shule_avance) payload.payment_plan.shule_avance = {};
  const sa = payload.payment_plan.shule_avance;
  if (!sa.email_notifications) sa.email_notifications = {};
  sa.email_notifications[which] = new Date().toISOString();
  await db.promisePool.execute(
    `UPDATE babyeyi_payment_intents SET payload_json = ? WHERE id = ?`,
    [JSON.stringify(payload), id]
  );
}

/** ShuleAvance: email applicant when request is submitted or when partner approves (PDF attached when SMTP is configured). */
async function sendShuleAvanceFinancingApplicantEmail(intentId, phase) {
  const id = Number(intentId || 0);
  if (!id || (phase !== 'submitted' && phase !== 'approved')) {
    return { sent: false, skipped: 'invalid_args' };
  }
  const which = phase === 'submitted' ? 'submitted_at' : 'approved_at';
  const [rows] = await db.promisePool.execute(
    `SELECT id, invoice_no, invoice_status, total_rwf, payer_name, payer_email, payer_phone, payload_json
     FROM babyeyi_payment_intents WHERE id = ? LIMIT 1`,
    [id]
  );
  const row = rows?.[0];
  if (!row) return { sent: false, skipped: 'intent_not_found' };
  let payload = {};
  try {
    payload = JSON.parse(row.payload_json || '{}');
  } catch (_) {}
  if (String(payload?.payment_plan?.method || '').toLowerCase() !== 'shule_avance') {
    return { sent: false, skipped: 'not_shule' };
  }
  const sa = payload.payment_plan.shule_avance || {};
  const en = sa.email_notifications || {};
  if (en[which]) return { sent: false, skipped: 'already_sent' };

  const to =
    normalizeEmail(sa.applicant_notification_email) ||
    normalizeEmail(row.payer_email);
  if (!to) return { sent: false, skipped: 'no_email' };

  const payerName = row.payer_name || 'Hello';
  const invoiceNo = row.invoice_no || `INV-${id}`;
  const amount = Number(row.total_rwf || 0).toLocaleString();
  const invStatus = String(row.invoice_status || 'NOT_PAID').toUpperCase();
  const orgName = sa.organization_name || 'ShuleAvance partner';
  const apiBase = String(
    process.env.API_PUBLIC_BASE_URL || process.env.BACKEND_PUBLIC_URL || ''
  ).replace(/\/+$/, '');
  const pdfLink = apiBase
    ? `${apiBase}/api/public/babyeyi-pay/invoice/${id}.pdf?invoice_no=${encodeURIComponent(invoiceNo)}`
    : '';

  const subject =
    phase === 'approved'
      ? `ShuleAvance approved — ${invoiceNo}`
      : `ShuleAvance request received — ${invoiceNo}`;

  const bodyHtml =
    phase === 'approved'
      ? `<p>Hello ${payerName},</p>
<p><strong>${orgName}</strong> has <strong>approved</strong> your ShuleAvance financing request.</p>
<p>Invoice <strong>${invoiceNo}</strong> is now <strong>${invStatus}</strong>. Amount: <strong>${amount} RWF</strong>.</p>
${pdfLink ? `<p><a href="${pdfLink}">Download invoice PDF</a></p>` : ''}`
      : `<p>Hello ${payerName},</p>
<p>Your ShuleAvance financing request has been sent to <strong>${orgName}</strong> for review.</p>
<p>Invoice <strong>${invoiceNo}</strong> · status <strong>${invStatus}</strong> · amount <strong>${amount} RWF</strong>.</p>
<p>You will receive another email when the partner updates your request (for example, if it is approved).</p>
${pdfLink ? `<p><a href="${pdfLink}">Download invoice PDF</a></p>` : ''}`;

  let attachments = [];
  try {
    const bundle = await getInvoiceDetailBundleById(id);
    const pdfBuffer = await generateInvoicePdfBuffer(bundle);
    attachments = [{
      filename: `${safeFilenamePart(invoiceNo)}.pdf`,
      content: pdfBuffer,
      contentType: 'application/pdf',
    }];
  } catch (e) {
    console.warn('[shule-avance/email] pdf skip:', e.message);
  }

  const text = bodyHtml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  const html = `<div style="font-family:system-ui,Segoe UI,sans-serif;font-size:15px;color:#0f172a;max-width:640px;line-height:1.5">${bodyHtml}</div>`;
  const ok = await sendInvoiceEmail({ to, subject, text, html, attachments });
  if (ok) await markShuleAvanceNotificationSent(id, which);
  return { sent: ok, to };
}

async function sendUnpaidReminderForIntent(row, stage) {
  const id = Number(row?.id || 0);
  if (!id) return { sent: false, skipped: 'invalid_intent_id' };
  const email = normalizeEmail(row?.payer_email);
  const phone = normalizeRwandaPhone(row?.payer_phone);
  const amount = Number(row?.total_rwf || 0).toLocaleString();
  const invoiceNo = row?.invoice_no || `INV-${id}`;
  const studentName = row?.student_name || 'Student';
  const schoolName = row?.school_name || 'School';
  const payerName = row?.payer_name || 'Parent/Guardian';
  const dueAt = row?.invoice_due_at ? new Date(row.invoice_due_at) : null;
  const dueLabel = dueAt ? dueAt.toLocaleDateString() : 'today';
  const stageLabel = stage === 'DUE' ? 'due today' : `${stage} days to due date`;
  const text = `Hello ${payerName},

Babyeyi payment reminder (${stageLabel}).
Invoice: ${invoiceNo}
Student: ${studentName}
School: ${schoolName}
Amount: ${amount} RWF
Due date: ${dueLabel}

Please complete payment to avoid delay.`;

  const subject = `Invoice Reminder - ${invoiceNo} (${stageLabel})`;
  const html = `<div style="font-family:Arial,sans-serif;padding:16px;background:#f8fafc;">
    <div style="max-width:640px;margin:0 auto;background:#fff;border:1px solid #e2e8f0;border-radius:10px;padding:16px;">
      <h3 style="margin:0 0 8px 0;color:#0f172a;">Babyeyi payment reminder</h3>
      <p style="margin:0 0 10px 0;color:#334155;">Hello ${payerName}, this invoice is <strong>${stageLabel}</strong>.</p>
      <p style="margin:0;color:#475569;">Invoice: <strong>${invoiceNo}</strong><br/>Student: <strong>${studentName}</strong><br/>School: <strong>${schoolName}</strong><br/>Amount: <strong>${amount} RWF</strong><br/>Due date: <strong>${dueLabel}</strong></p>
    </div>
  </div>`;
  const smsText = `Babyeyi reminder: ${invoiceNo} for ${studentName}, ${amount} RWF, due ${dueLabel}.`;
  const emailOk = email ? await sendInvoiceEmail({ to: email, subject, text, html }) : false;
  const smsOk = phone ? (await sendSmsNotification({ phone, message: smsText })).sent : false;
  return { sent: emailOk || smsOk, email: emailOk, sms: smsOk };
}

function extractXentriWebhookEvent(payload = {}) {
  const top = isObject(payload) ? payload : {};
  const data = isObject(top.data) ? top.data : {};
  const nested = isObject(top.payload) ? top.payload : {};
  const rawEvent = firstNonEmpty(
    top.event,
    top.eventType,
    top.type,
    top.topic,
    data.event,
    nested.event
  );
  const rawStatus = firstNonEmpty(
    top.status,
    top.transactionStatus,
    data.status,
    data.transactionStatus,
    nested.status
  );
  const reference = firstNonEmpty(
    top.customerReference,
    top.customerRef,
    top.refid,
    top.reference,
    top.reference_number,
    top.internalRef,
    top.externalTransactionRef,
    top.tid,
    data.customerReference,
    data.customerRef,
    data.refid,
    data.reference,
    data.reference_number,
    data.internalRef,
    data.externalTransactionRef,
    data.tid,
    nested.customerReference,
    nested.customerRef,
    nested.refid,
    nested.reference,
    nested.reference_number,
    nested.internalRef,
    nested.externalTransactionRef,
    nested.tid
  );
  const providerStatus = String(rawStatus || rawEvent || 'PENDING').trim().toUpperCase();
  return {
    event: String(rawEvent || '').trim().toUpperCase() || null,
    providerStatus,
    reference,
    payload: top,
  };
}

function mapProviderToLocalStatus(providerStatus = '') {
  const s = String(providerStatus || '').toUpperCase();
  if (['COMPLETED', 'SUCCESS', 'SUCCEEDED', 'COLLECTION_SUCCESSFUL', 'PAYMENT_SUCCESSFUL'].includes(s)) return 'paid';
  if (['FAILED', 'REJECTED', 'CANCELLED', 'COLLECTION_FAILED', 'PAYMENT_FAILED'].includes(s)) return 'failed';
  return 'submitted';
}

function parseRequirementQuantity(raw) {
  if (raw == null || raw === '') return 1;
  const s = String(raw).trim();
  const m = s.match(/(\d+(?:\.\d+)?)/);
  if (m) {
    const n = parseFloat(m[1]);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return 1;
}

/** MariaDB-safe: true JSON boolean at $.public_pay_no_login (avoids JSON_CONTAINS + CAST(... AS JSON) parse issues). */
const SQL_PAYLOAD_GUEST_FINDER = `(
  IFNULL(JSON_UNQUOTE(JSON_EXTRACT(COALESCE(i.payload_json, '{}'), '$.public_pay_no_login')), '') IN ('true', '1')
)`;

function buildIntentFilters(q = {}) {
  const search = String(q.search || '').trim();
  const district = String(q.district || '').trim();
  const sector = String(q.sector || '').trim();
  const schoolId = Number(q.school_id || 0);
  const status = String(q.status || '').trim().toLowerCase();
  const invoiceStatus = String(q.invoice_status || '').trim().toUpperCase();
  const dateFrom = String(q.date_from || '').trim();
  const dateTo = String(q.date_to || '').trim();
  const channel = String(q.channel || 'all').trim().toLowerCase();

  const whereParts = [];
  const params = [];
  if (search) {
    whereParts.push(`(
      COALESCE(i.payer_name, '') LIKE ?
      OR COALESCE(i.payer_phone, '') LIKE ?
      OR COALESCE(i.payer_email, '') LIKE ?
      OR COALESCE(s.school_name, '') LIKE ?
      OR COALESCE(JSON_UNQUOTE(JSON_EXTRACT(i.payload_json, '$.selected_student.student_name')), '') LIKE ?
      OR COALESCE(JSON_UNQUOTE(JSON_EXTRACT(i.payload_json, '$.selected_student.student_uid')), '') LIKE ?
      OR COALESCE(JSON_UNQUOTE(JSON_EXTRACT(i.payload_json, '$.selected_student.student_code')), '') LIKE ?
      OR COALESCE(JSON_UNQUOTE(JSON_EXTRACT(i.payload_json, '$.selected_student.sdm_code')), '') LIKE ?
    )`);
    const like = `%${search}%`;
    params.push(like, like, like, like, like, like, like, like);
  }
  if (channel === 'guest_finder') {
    whereParts.push(`${SQL_PAYLOAD_GUEST_FINDER} = 1`);
  } else if (channel === 'other') {
    whereParts.push(`NOT (${SQL_PAYLOAD_GUEST_FINDER} = 1)`);
  }
  if (district) {
    whereParts.push('COALESCE(s.district, \'\') = ?');
    params.push(district);
  }
  if (sector) {
    whereParts.push('COALESCE(s.sector, \'\') = ?');
    params.push(sector);
  }
  if (schoolId) {
    whereParts.push('i.school_id = ?');
    params.push(schoolId);
  }
  if (status && VALID_INTENT_STATUSES.has(status)) {
    whereParts.push('LOWER(COALESCE(i.status, \'draft\')) = ?');
    params.push(status);
  }
  if (invoiceStatus && ['NOT_PAID', 'PAID'].includes(invoiceStatus)) {
    whereParts.push('UPPER(COALESCE(i.invoice_status, \'NOT_PAID\')) = ?');
    params.push(invoiceStatus);
  }
  if (dateFrom) {
    whereParts.push('DATE(i.created_at) >= ?');
    params.push(dateFrom);
  }
  if (dateTo) {
    whereParts.push('DATE(i.created_at) <= ?');
    params.push(dateTo);
  }
  return {
    where: whereParts.length ? `WHERE ${whereParts.join(' AND ')}` : '',
    params,
  };
}

function safeFilenamePart(s) {
  return String(s || 'export').replace(/[^a-zA-Z0-9._-]+/g, '_').slice(0, 120);
}

function resolveBabyeyiLogoPath() {
  const candidates = [
    path.join(__dirname, '..', '..', 'frontend', 'public', '1BABYEYI LOGO FINAL.png'),
    path.join(__dirname, '..', '..', 'public', '1BABYEYI LOGO FINAL.png'),
    path.join(process.cwd(), 'frontend', 'public', '1BABYEYI LOGO FINAL.png'),
  ];
  for (const p of candidates) {
    try {
      if (fs.existsSync(p)) return p;
    } catch (_) {}
  }
  return null;
}

function buildInvoiceFilters(q = {}, scope = {}) {
  const where = [];
  const params = [];
  const search = String(q.search || '').trim();
  const invoiceStatus = String(q.invoice_status || '').trim().toUpperCase();
  const dateFrom = String(q.date_from || '').trim();
  const dateTo = String(q.date_to || '').trim();
  const student = String(q.student || '').trim();
  const email = String(q.email || '').trim();
  const className = String(q.class_name || '').trim();
  const term = String(q.term || '').trim();
  const academicYear = String(q.academic_year || '').trim();
  const schoolId = Number(scope.schoolId || q.school_id || 0);

  if (schoolId) {
    where.push('i.school_id = ?');
    params.push(schoolId);
  }
  if (invoiceStatus && ['NOT_PAID', 'PAID'].includes(invoiceStatus)) {
    where.push('UPPER(COALESCE(i.invoice_status, \'NOT_PAID\')) = ?');
    params.push(invoiceStatus);
  }
  if (className) {
    where.push('COALESCE(b.class_name, \'\') = ?');
    params.push(className);
  }
  if (term) {
    where.push('COALESCE(b.term, \'\') = ?');
    params.push(term);
  }
  if (academicYear) {
    where.push('COALESCE(CAST(b.academic_year AS CHAR), \'\') LIKE ?');
    params.push(`%${academicYear}%`);
  }
  if (dateFrom) {
    where.push('DATE(i.created_at) >= ?');
    params.push(dateFrom);
  }
  if (dateTo) {
    where.push('DATE(i.created_at) <= ?');
    params.push(dateTo);
  }
  if (student) {
    const like = `%${student}%`;
    where.push(`(
      COALESCE(JSON_UNQUOTE(JSON_EXTRACT(i.payload_json, '$.selected_student.student_name')), '') LIKE ?
      OR COALESCE(JSON_UNQUOTE(JSON_EXTRACT(i.payload_json, '$.selected_student.student_uid')), '') LIKE ?
      OR COALESCE(JSON_UNQUOTE(JSON_EXTRACT(i.payload_json, '$.selected_student.student_code')), '') LIKE ?
      OR COALESCE(JSON_UNQUOTE(JSON_EXTRACT(i.payload_json, '$.selected_student.sdm_code')), '') LIKE ?
    )`);
    params.push(like, like, like, like);
  }
  if (email) {
    where.push('COALESCE(i.payer_email, \'\') LIKE ?');
    params.push(`%${email}%`);
  }
  if (search) {
    const like = `%${search}%`;
    where.push(`(
      COALESCE(i.invoice_no, '') LIKE ?
      OR COALESCE(i.payer_name, '') LIKE ?
      OR COALESCE(i.payer_phone, '') LIKE ?
      OR COALESCE(i.payer_email, '') LIKE ?
      OR COALESCE(s.school_name, '') LIKE ?
      OR COALESCE(JSON_UNQUOTE(JSON_EXTRACT(i.payload_json, '$.selected_student.student_name')), '') LIKE ?
      OR COALESCE(JSON_UNQUOTE(JSON_EXTRACT(i.payload_json, '$.selected_student.student_uid')), '') LIKE ?
      OR COALESCE(JSON_UNQUOTE(JSON_EXTRACT(i.payload_json, '$.selected_student.student_code')), '') LIKE ?
      OR COALESCE(JSON_UNQUOTE(JSON_EXTRACT(i.payload_json, '$.selected_student.sdm_code')), '') LIKE ?
    )`);
    params.push(like, like, like, like, like, like, like, like, like);
  }
  return { where: where.length ? `WHERE ${where.join(' AND ')}` : '', params };
}

async function getInvoiceDetailBundleById(id) {
  const [rows] = await db.promisePool.execute(
    `SELECT i.*, s.school_name, s.district, s.sector,
            b.class_name, b.term, b.academic_year
     FROM babyeyi_payment_intents i
     LEFT JOIN schools s ON s.id = i.school_id
     LEFT JOIN school_babyeyi b ON b.id = i.babyeyi_id
     WHERE i.id = ?
     LIMIT 1`,
    [id]
  );
  const intent = rows?.[0];
  if (!intent) return null;
  let payload = {};
  try { payload = JSON.parse(intent.payload_json || '{}'); } catch { payload = {}; }
  const feeIds = Array.isArray(payload.selected_fee_ids) ? payload.selected_fee_ids : [];
  const reqIds = Array.isArray(payload.selected_requirement_ids) ? payload.selected_requirement_ids : [];

  let fees = [];
  if (feeIds.length > 0) {
    let metaRow = null;
    try {
      const [metaRows] = await db.promisePool.execute(
        `SELECT id, school_id, academic_year, term, class_name, status, total_fee
         FROM school_babyeyi WHERE id = ? LIMIT 1`,
        [intent.babyeyi_id]
      );
      metaRow = metaRows?.[0] || null;
    } catch (_) {
      metaRow = null;
    }
    if (metaRow) {
      fees = await loadFeesForSelection(intent.babyeyi_id, feeIds, metaRow);
    }
  }
  let requirements = [];
  if (reqIds.length > 0) {
    const ph = reqIds.map(() => '?').join(',');
    const [reqRows] = await db.promisePool.execute(
      `SELECT bsr.id AS babyeyi_requirement_id, bsr.item AS requirement_name, bsr.description, bsr.quantity,
              COALESCE(rp.price, sr.default_price, bsr.cost, 0) AS unit_price
       FROM babyeyi_student_requirements bsr
       LEFT JOIN requirement_prices rp ON rp.babyeyi_id = bsr.babyeyi_id AND rp.babyeyi_requirement_id = bsr.id
       ${SQL_JOIN_STUDENT_REQ_BY_ITEM}
       WHERE bsr.babyeyi_id = ? AND bsr.id IN (${ph})
       ORDER BY bsr.sort_order, bsr.id`,
      [intent.babyeyi_id, ...reqIds]
    );
    requirements = (reqRows || []).map((r) => {
      const qty = parseRequirementQuantity(r.quantity);
      const unit = Number(r.unit_price || 0);
      const line = Math.round(unit * qty * 100) / 100;
      return { ...r, quantity_value: qty, unit_price_rwf: unit, line_total_rwf: line };
    });
  }
  const feesTotal = fees.reduce((s, f) => s + Number(f.amount || 0), 0);
  const reqTotal = requirements.reduce((s, r) => s + Number(r.line_total_rwf || 0), 0);
  const selectedTotal = Math.round((feesTotal + reqTotal) * 100) / 100;
  const intentTotal = Number(intent.total_rwf || 0);
  const students = Array.isArray(payload?.selected_students) && payload.selected_students.length
    ? payload.selected_students
    : (payload?.selected_student ? [payload.selected_student] : []);
  const studentCount = Math.max(1, Number(students.length || 1));

  return {
    invoice: {
      id: intent.id,
      invoice_no: intent.invoice_no || `INV-${intent.id}`,
      invoice_status: intent.invoice_status || 'NOT_PAID',
      invoice_paid_at: intent.invoice_paid_at || null,
      amount_rwf: intentTotal,
      created_at: intent.created_at,
    },
    intent: {
      school_id: intent.school_id,
      status: intent.status,
      payer_name: intent.payer_name,
      payer_phone: intent.payer_phone,
      payer_email: intent.payer_email,
      school_name: intent.school_name,
      class_name: intent.class_name,
      term: intent.term,
      academic_year: intent.academic_year,
      provider: intent.provider || null,
      provider_status: intent.provider_status || null,
    },
    selected_fees: fees,
    selected_requirements: requirements,
    totals: {
      per_student_fees_rwf: Math.round(feesTotal * 100) / 100,
      per_student_requirements_rwf: Math.round(reqTotal * 100) / 100,
      per_student_total_rwf: selectedTotal,
      selected_fees_rwf: Math.round((feesTotal * studentCount) * 100) / 100,
      selected_requirements_rwf: Math.round((reqTotal * studentCount) * 100) / 100,
      selected_total_rwf: Math.round((selectedTotal * studentCount) * 100) / 100,
      students_count: studentCount,
      invoice_total_rwf: intentTotal,
    },
    student: students[0] || payload?.selected_student || null,
    students,
  };
}

async function generateInvoicePdfBuffer(bundle) {
  const frontendBase = String(process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/+$/, '');
  const qrPayloadUrl = `${frontendBase}/invoice-verify/${encodeURIComponent(bundle.invoice.id)}?invoice_no=${encodeURIComponent(bundle.invoice.invoice_no)}`;
  const qrPng = await QRCode.toBuffer(qrPayloadUrl, {
    type: 'png',
    width: 220,
    margin: 1,
    color: { dark: '#0F172A', light: '#FFFFFF' },
  });

  return new Promise((resolve, reject) => {
    try {
      const M = 48;
      const TABLE_W = 515;
      const doc = new PDFDocument({ margin: M, size: 'A4' });
      const chunks = [];
      doc.on('data', (c) => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const ink = '#0F172A';
      const muted = '#64748B';
      const border = '#E2E8F0';
      const logoPath = resolveBabyeyiLogoPath();

      const invSt = String(bundle.invoice.invoice_status || 'NOT_PAID').toUpperCase();
      const statusLabel = invSt.replace(/_/g, ' ');
      const statusStyle = (() => {
        switch (invSt) {
          case 'PAID':
            return { bg: '#DCFCE7', fg: '#166534' };
          case 'PENDING_APPROVAL':
            return { bg: '#EEF2FF', fg: '#3730A3' };
          case 'APPROVED':
            return { bg: '#D1FAE5', fg: '#065F46' };
          case 'REJECTED':
            return { bg: '#FEE2E2', fg: '#991B1B' };
          case 'DRAFT':
            return { bg: '#F1F5F9', fg: '#475569' };
          case 'NOT_PAID':
            return { bg: '#FFFBEB', fg: '#B45309' };
          default:
            return { bg: '#F8FAFC', fg: ink };
        }
      })();

      const hr = (yy) => {
        doc.save();
        doc.strokeColor(border).lineWidth(0.5);
        doc.moveTo(M, yy).lineTo(doc.page.width - M, yy).stroke();
        doc.restore();
      };

      let y = M;
      doc.save();
      doc.strokeColor(ink).lineWidth(2);
      doc.moveTo(M, y).lineTo(doc.page.width - M, y).stroke();
      doc.restore();
      y += 14;

      const headerTop = y;
      const logoBox = 68;
      const logoPad = 7;
      const qrSize = 76;
      const rightColW = Math.max(108, qrSize + 8);
      const pageW = doc.page.width;
      const rightColLeft = pageW - M - rightColW;

      doc.save();
      doc.roundedRect(M, headerTop, logoBox, logoBox, 11).fill('#0F172A');
      if (logoPath) {
        try {
          doc.image(logoPath, M + logoPad, headerTop + logoPad, { fit: [logoBox - logoPad * 2, logoBox - logoPad * 2] });
        } catch (_) {}
      } else {
        doc.fillColor('#FBBF24').font('Helvetica-Bold').fontSize(14).text('B', M + 26, headerTop + 24);
      }
      doc.restore();

      const titleX = M + logoBox + 14;
      const titleMaxW = rightColLeft - titleX - 12;
      doc.fillColor(ink).font('Helvetica-Bold').fontSize(20).text('Invoice', titleX, headerTop + 4, { width: titleMaxW });
      doc.fillColor(muted).font('Helvetica').fontSize(9).text('Babyeyi · school payment statement', titleX, headerTop + 28, { width: titleMaxW });

      const pillW = Math.min(118, rightColW);
      const pillH = 24;
      const pillX = pageW - M - pillW;
      const pillY = headerTop;
      doc.save();
      doc.roundedRect(pillX, pillY, pillW, pillH, 6).fill(statusStyle.bg);
      doc.fillColor(statusStyle.fg).font('Helvetica-Bold').fontSize(8)
        .text(statusLabel.toUpperCase(), pillX + 6, pillY + 8, { width: pillW - 12, align: 'center' });
      doc.restore();

      const qrX = pageW - M - qrSize;
      const qrY = pillY + pillH + 8;
      doc.image(qrPng, qrX, qrY, { fit: [qrSize, qrSize] });
      doc.strokeColor(border).lineWidth(0.75);
      doc.roundedRect(qrX - 1, qrY - 1, qrSize + 2, qrSize + 2, 4).stroke();
      doc.fillColor(muted).font('Helvetica').fontSize(6.5)
        .text('Verify', qrX, qrY + qrSize + 3, { width: qrSize, align: 'center' });

      y = Math.max(headerTop + logoBox, qrY + qrSize + 18);
      hr(y);
      y += 14;

      const kv = (label, leftVal, rightLabel, rightVal) => {
        doc.fillColor(muted).font('Helvetica').fontSize(8).text(label, M, y);
        doc.fillColor(ink).font('Helvetica-Bold').fontSize(10).text(String(leftVal), M, y + 11, { width: 240 });
        if (rightLabel != null) {
          doc.fillColor(muted).font('Helvetica').fontSize(8).text(rightLabel, 300, y);
          doc.fillColor(ink).font('Helvetica').fontSize(10).text(String(rightVal), 300, y + 11, { width: TABLE_W - 252 });
        }
        y += 34;
      };

      kv('Invoice number', bundle.invoice.invoice_no, 'Date', new Date(bundle.invoice.created_at).toLocaleDateString());
      kv('School', bundle.intent.school_name || 'School', 'Students', Number(bundle.totals?.students_count || 1));
      kv('Payer', bundle.intent.payer_name || 'Parent/Guardian', 'Email', bundle.intent.payer_email || '—');

      const studentsLine = (bundle.students || [])
        .map((s) => `${s.student_name || 'Student'} (${s.class_name || '—'})`)
        .join(' · ');
      doc.fillColor(muted).font('Helvetica').fontSize(8).text('Learners', M, y);
      doc.fillColor(ink).font('Helvetica').fontSize(9).text(studentsLine || '—', M, y + 11, { width: TABLE_W });
      y += 28;
      hr(y);
      y += 12;

      const sectionTitle = (t) => {
        doc.fillColor(ink).font('Helvetica-Bold').fontSize(10).text(t.toUpperCase(), M, y);
        y += 14;
        doc.strokeColor(border).lineWidth(0.75);
        doc.moveTo(M, y).lineTo(M + 160, y).stroke();
        y += 10;
      };

      if ((bundle.students || []).length > 0) {
        sectionTitle('Per-student breakdown');
        doc.fillColor(muted).font('Helvetica-Bold').fontSize(8);
        doc.text('Student', M, y);
        doc.text('Class', 300, y);
        doc.text('Share (RWF)', 420, y, { width: M + TABLE_W - 420, align: 'right' });
        y += 14;
        hr(y);
        y += 6;
        const share = Number(bundle.totals?.per_student_total_rwf || 0);
        (bundle.students || []).forEach((s) => {
          if (y > 700) {
            doc.addPage();
            y = M;
          }
          doc.fillColor(ink).font('Helvetica').fontSize(9).text(String(s.student_name || 'Student'), M, y, { width: 250 });
          doc.text(String(s.class_name || '—'), 300, y, { width: 100 });
          doc.font('Helvetica-Bold').text(share.toLocaleString(), 420, y, { width: M + TABLE_W - 420, align: 'right' });
          y += 16;
        });
        y += 12;
      }

      sectionTitle('Fee items');
      doc.fillColor(muted).font('Helvetica-Bold').fontSize(8);
      doc.text('Item', M, y);
      doc.text('Amount (RWF)', 420, y, { width: M + TABLE_W - 420, align: 'right' });
      y += 14;
      hr(y);
      y += 6;
      if ((bundle.selected_fees || []).length === 0) {
        doc.fillColor(muted).font('Helvetica-Oblique').fontSize(9).text('No fee items on this invoice.', M, y);
        y += 18;
      } else {
        (bundle.selected_fees || []).forEach((f) => {
          if (y > 720) {
            doc.addPage();
            y = M;
          }
          doc.fillColor(ink).font('Helvetica').fontSize(9).text(String(f.name || 'Fee item'), M, y, { width: 360 });
          doc.font('Helvetica-Bold').text(Number(f.amount || 0).toLocaleString(), 420, y, { width: M + TABLE_W - 420, align: 'right' });
          y += 16;
        });
      }
      y += 10;

      sectionTitle('Requirement items');
      doc.fillColor(muted).font('Helvetica-Bold').fontSize(8);
      doc.text('Item', M, y);
      doc.text('Qty', 300, y, { width: 44, align: 'right' });
      doc.text('Unit', 352, y, { width: 60, align: 'right' });
      doc.text('Line (RWF)', 420, y, { width: M + TABLE_W - 420, align: 'right' });
      y += 14;
      hr(y);
      y += 6;
      if ((bundle.selected_requirements || []).length === 0) {
        doc.fillColor(muted).font('Helvetica-Oblique').fontSize(9).text('No requirement items on this invoice.', M, y);
        y += 18;
      } else {
        (bundle.selected_requirements || []).forEach((r) => {
          if (y > 720) {
            doc.addPage();
            y = M;
          }
          doc.fillColor(ink).font('Helvetica').fontSize(9).text(String(r.requirement_name || 'Requirement'), M, y, { width: 240 });
          doc.text(Number(r.quantity_value || 1).toLocaleString(), 300, y, { width: 44, align: 'right' });
          doc.text(Number(r.unit_price_rwf || 0).toLocaleString(), 352, y, { width: 60, align: 'right' });
          doc.font('Helvetica-Bold').text(Number(r.line_total_rwf || 0).toLocaleString(), 420, y, { width: M + TABLE_W - 420, align: 'right' });
          y += 16;
        });
      }

      y += 16;
      hr(y);
      y += 14;
      const sumX = 300;
      doc.fillColor(muted).font('Helvetica').fontSize(9).text('Fees total (all students)', sumX, y);
      doc.fillColor(ink).font('Helvetica').fontSize(10).text(`${Number(bundle.totals.selected_fees_rwf || 0).toLocaleString()} RWF`, sumX + 120, y, { width: 155, align: 'right' });
      y += 18;
      doc.fillColor(muted).font('Helvetica').fontSize(9).text('Requirements total (all students)', sumX, y);
      doc.fillColor(ink).font('Helvetica').fontSize(10).text(`${Number(bundle.totals.selected_requirements_rwf || 0).toLocaleString()} RWF`, sumX + 120, y, { width: 155, align: 'right' });
      y += 22;
      doc.strokeColor(ink).lineWidth(0.75);
      doc.moveTo(sumX, y).lineTo(M + TABLE_W, y).stroke();
      y += 10;
      doc.fillColor(ink).font('Helvetica-Bold').fontSize(11).text('Amount due', sumX, y);
      doc.font('Helvetica-Bold').fontSize(12).text(`${Number(bundle.invoice.amount_rwf || 0).toLocaleString()} RWF`, sumX + 120, y, { width: 155, align: 'right' });

      doc.fillColor('#94A3B8').font('Helvetica').fontSize(7)
        .text(`Generated ${new Date().toLocaleString()} · Babyeyi`, M, doc.page.height - 36, { width: TABLE_W, align: 'center' });
      doc.end();
    } catch (e) {
      reject(e);
    }
  });
}

/** Public PDF receipt — PAID intents only; same verify URL as invoice. */
async function generatePaymentReceiptPdfBuffer(bundle) {
  const frontendBase = String(process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/+$/, '');
  const qrPayloadUrl = `${frontendBase}/invoice-verify/${encodeURIComponent(bundle.invoice.id)}?invoice_no=${encodeURIComponent(bundle.invoice.invoice_no)}`;
  const qrPng = await QRCode.toBuffer(qrPayloadUrl, {
    type: 'png',
    width: 220,
    margin: 1,
    color: { dark: '#0F172A', light: '#FFFFFF' },
  });

  return new Promise((resolve, reject) => {
    try {
      const M = 48;
      const TABLE_W = 515;
      const doc = new PDFDocument({ margin: M, size: 'A4' });
      const chunks = [];
      doc.on('data', (c) => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const ink = '#0F172A';
      const muted = '#64748B';
      const border = '#E2E8F0';
      const logoPath = resolveBabyeyiLogoPath();
      const paidPill = { bg: '#DCFCE7', fg: '#166534' };

      const hr = (yy) => {
        doc.save();
        doc.strokeColor(border).lineWidth(0.5);
        doc.moveTo(M, yy).lineTo(doc.page.width - M, yy).stroke();
        doc.restore();
      };

      let y = M;
      doc.save();
      doc.strokeColor(ink).lineWidth(2);
      doc.moveTo(M, y).lineTo(doc.page.width - M, y).stroke();
      doc.restore();
      y += 14;

      const headerTop = y;
      const logoBox = 68;
      const logoPad = 7;
      const qrSize = 76;
      const rightColW = Math.max(108, qrSize + 8);
      const pageW = doc.page.width;
      const rightColLeft = pageW - M - rightColW;

      doc.save();
      doc.roundedRect(M, headerTop, logoBox, logoBox, 11).fill('#0F172A');
      if (logoPath) {
        try {
          doc.image(logoPath, M + logoPad, headerTop + logoPad, { fit: [logoBox - logoPad * 2, logoBox - logoPad * 2] });
        } catch (_) {}
      } else {
        doc.fillColor('#FBBF24').font('Helvetica-Bold').fontSize(14).text('B', M + 26, headerTop + 24);
      }
      doc.restore();

      const titleX = M + logoBox + 14;
      const titleMaxW = rightColLeft - titleX - 12;
      doc.fillColor(ink).font('Helvetica-Bold').fontSize(20).text('Payment receipt', titleX, headerTop + 4, { width: titleMaxW });
      doc.fillColor(muted).font('Helvetica').fontSize(9).text('Paid · keep for your records', titleX, headerTop + 28, { width: titleMaxW });

      const pillW = Math.min(118, rightColW);
      const pillH = 24;
      const pillX = pageW - M - pillW;
      const pillY = headerTop;
      doc.save();
      doc.roundedRect(pillX, pillY, pillW, pillH, 6).fill(paidPill.bg);
      doc.fillColor(paidPill.fg).font('Helvetica-Bold').fontSize(8)
        .text('PAID', pillX + 6, pillY + 8, { width: pillW - 12, align: 'center' });
      doc.restore();

      const qrX = pageW - M - qrSize;
      const qrY = pillY + pillH + 8;
      doc.image(qrPng, qrX, qrY, { fit: [qrSize, qrSize] });
      doc.strokeColor(border).lineWidth(0.75);
      doc.roundedRect(qrX - 1, qrY - 1, qrSize + 2, qrSize + 2, 4).stroke();
      doc.fillColor(muted).font('Helvetica').fontSize(6.5)
        .text('Verify', qrX, qrY + qrSize + 3, { width: qrSize, align: 'center' });

      y = Math.max(headerTop + logoBox, qrY + qrSize + 18);
      hr(y);
      y += 14;

      const kv = (a, av, b, bv) => {
        doc.fillColor(muted).font('Helvetica').fontSize(8).text(a, M, y);
        doc.fillColor(ink).font('Helvetica-Bold').fontSize(10).text(String(av), M, y + 11, { width: 240 });
        if (b != null) {
          doc.fillColor(muted).font('Helvetica').fontSize(8).text(b, 300, y);
          doc.fillColor(ink).font('Helvetica').fontSize(10).text(String(bv), 300, y + 11, { width: TABLE_W - 252 });
        }
        y += 34;
      };

      kv('Receipt / invoice no.', bundle.invoice.invoice_no, 'Issued', new Date(bundle.invoice.created_at).toLocaleDateString());
      if (bundle.invoice.invoice_paid_at) {
        doc.fillColor(muted).font('Helvetica').fontSize(8).text('Payment confirmed', M, y);
        doc.fillColor(ink).font('Helvetica-Bold').fontSize(10).text(new Date(bundle.invoice.invoice_paid_at).toLocaleString(), M, y + 11);
        y += 28;
      }
      kv('School', bundle.intent.school_name || 'School', 'Students', Number(bundle.totals?.students_count || 1));
      doc.fillColor(muted).font('Helvetica').fontSize(8).text('Payer', M, y);
      doc.fillColor(ink).font('Helvetica').fontSize(10).text(bundle.intent.payer_name || 'Parent/Guardian', M, y + 11);
      y += 28;

      const studentsLine = (bundle.students || [])
        .map((s) => `${s.student_name || 'Student'} (${s.class_name || '—'})`)
        .join(' · ');
      doc.fillColor(muted).font('Helvetica').fontSize(8).text('Learners', M, y);
      doc.fillColor(ink).font('Helvetica').fontSize(9).text(studentsLine || '—', M, y + 11, { width: TABLE_W });
      y += 28;
      hr(y);
      y += 14;

      doc.fillColor(muted).font('Helvetica-Bold').fontSize(10).text('AMOUNT RECEIVED', M, y);
      y += 16;
      doc.fillColor(ink).font('Helvetica-Bold').fontSize(22).text(`${Number(bundle.invoice.amount_rwf || 0).toLocaleString()} RWF`, M, y);
      y += 36;

      const section = (label) => {
        doc.fillColor(ink).font('Helvetica-Bold').fontSize(10).text(label.toUpperCase(), M, y);
        y += 12;
        doc.strokeColor(border).lineWidth(0.75);
        doc.moveTo(M, y).lineTo(M + 140, y).stroke();
        y += 10;
      };

      section('Fee items');
      doc.fillColor(muted).font('Helvetica-Bold').fontSize(8);
      doc.text('Item', M, y);
      doc.text('RWF', 420, y, { width: M + TABLE_W - 420, align: 'right' });
      y += 12;
      hr(y);
      y += 6;
      if (!(bundle.selected_fees || []).length) {
        doc.fillColor(muted).font('Helvetica-Oblique').fontSize(9).text('No fee lines on this receipt.', M, y);
        y += 16;
      } else {
        (bundle.selected_fees || []).forEach((f) => {
          doc.fillColor(ink).font('Helvetica').fontSize(9).text(String(f.name || 'Fee'), M, y, { width: 360 });
          doc.font('Helvetica-Bold').text(Number(f.amount || 0).toLocaleString(), 420, y, { width: M + TABLE_W - 420, align: 'right' });
          y += 14;
        });
      }
      y += 12;

      section('Requirements');
      doc.fillColor(muted).font('Helvetica-Bold').fontSize(8);
      doc.text('Item', M, y);
      doc.text('Line (RWF)', 420, y, { width: M + TABLE_W - 420, align: 'right' });
      y += 12;
      hr(y);
      y += 6;
      (bundle.selected_requirements || []).forEach((r) => {
        if (y > 720) {
          doc.addPage();
          y = M;
        }
        doc.fillColor(ink).font('Helvetica').fontSize(9).text(String(r.requirement_name || '—'), M, y, { width: 360 });
        doc.font('Helvetica-Bold').text(Number(r.line_total_rwf || 0).toLocaleString(), 420, y, { width: M + TABLE_W - 420, align: 'right' });
        y += 14;
      });

      doc.fillColor('#94A3B8').font('Helvetica').fontSize(7)
        .text('Babyeyi · Generated electronically · Valid without signature', M, doc.page.height - 32, { width: TABLE_W, align: 'center' });
      doc.end();
    } catch (e) {
      reject(e);
    }
  });
}

const ensureIntentTable = async () => {
  try {
    await db.promisePool.execute(`
      CREATE TABLE IF NOT EXISTS babyeyi_payment_intents (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        school_id INT UNSIGNED NOT NULL,
        babyeyi_id INT UNSIGNED NOT NULL,
        payload_json LONGTEXT NOT NULL,
        total_rwf DECIMAL(14,2) NOT NULL DEFAULT 0,
        payer_name VARCHAR(180) NULL,
        payer_phone VARCHAR(40) NULL,
        payer_email VARCHAR(180) NULL,
        status VARCHAR(40) DEFAULT 'draft',
        invoice_no VARCHAR(40) NULL,
        invoice_status VARCHAR(20) NOT NULL DEFAULT 'NOT_PAID',
        invoice_paid_at DATETIME NULL,
        invoice_sent_at DATETIME NULL,
        invoice_notified_not_paid_at DATETIME NULL,
        invoice_notified_paid_at DATETIME NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_school (school_id),
        INDEX idx_babyeyi (babyeyi_id),
        INDEX idx_payer_phone (payer_phone),
        INDEX idx_invoice_status (invoice_status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    await db.promisePool.execute(`ALTER TABLE babyeyi_payment_intents ADD COLUMN payer_name VARCHAR(180) NULL`).catch(() => {});
    await db.promisePool.execute(`ALTER TABLE babyeyi_payment_intents ADD COLUMN payer_phone VARCHAR(40) NULL`).catch(() => {});
    await db.promisePool.execute(`ALTER TABLE babyeyi_payment_intents ADD COLUMN payer_email VARCHAR(180) NULL`).catch(() => {});
    await db.promisePool.execute(`ALTER TABLE babyeyi_payment_intents ADD COLUMN invoice_no VARCHAR(40) NULL`).catch(() => {});
    await db.promisePool.execute(`ALTER TABLE babyeyi_payment_intents ADD COLUMN invoice_status VARCHAR(20) NOT NULL DEFAULT 'NOT_PAID'`).catch(() => {});
    await db.promisePool.execute(`ALTER TABLE babyeyi_payment_intents ADD COLUMN invoice_paid_at DATETIME NULL`).catch(() => {});
    await db.promisePool.execute(`ALTER TABLE babyeyi_payment_intents ADD COLUMN invoice_sent_at DATETIME NULL`).catch(() => {});
    await db.promisePool.execute(`ALTER TABLE babyeyi_payment_intents ADD COLUMN invoice_notified_not_paid_at DATETIME NULL`).catch(() => {});
    await db.promisePool.execute(`ALTER TABLE babyeyi_payment_intents ADD COLUMN invoice_notified_paid_at DATETIME NULL`).catch(() => {});
    await db.promisePool.execute(`ALTER TABLE babyeyi_payment_intents ADD COLUMN invoice_due_at DATETIME NULL`).catch(() => {});
    await db.promisePool.execute(`ALTER TABLE babyeyi_payment_intents ADD COLUMN provider VARCHAR(40) NULL`).catch(() => {});
    await db.promisePool.execute(`ALTER TABLE babyeyi_payment_intents ADD COLUMN provider_status VARCHAR(40) NULL`).catch(() => {});
    await db.promisePool.execute(`ALTER TABLE babyeyi_payment_intents ADD COLUMN provider_reference VARCHAR(120) NULL`).catch(() => {});
    await db.promisePool.execute(`ALTER TABLE babyeyi_payment_intents ADD COLUMN provider_tid VARCHAR(80) NULL`).catch(() => {});
    await db.promisePool.execute(`ALTER TABLE babyeyi_payment_intents ADD COLUMN provider_authkey VARCHAR(180) NULL`).catch(() => {});
    await db.promisePool.execute(`ALTER TABLE babyeyi_payment_intents ADD COLUMN provider_payload_json LONGTEXT NULL`).catch(() => {});
    await db.promisePool.execute(`ALTER TABLE babyeyi_payment_intents ADD COLUMN last_provider_check_at DATETIME NULL`).catch(() => {});
    await db.promisePool.execute(`ALTER TABLE babyeyi_payment_intents ADD COLUMN retry_count INT UNSIGNED NOT NULL DEFAULT 0`).catch(() => {});
    await db.promisePool.execute(`ALTER TABLE babyeyi_payment_intents ADD COLUMN last_retry_at DATETIME NULL`).catch(() => {});
    await db.promisePool.execute(`ALTER TABLE babyeyi_payment_intents ADD INDEX idx_payer_phone (payer_phone)`).catch(() => {});
    await db.promisePool.execute(`ALTER TABLE babyeyi_payment_intents ADD INDEX idx_invoice_status (invoice_status)`).catch(() => {});
    await db.promisePool.execute(`ALTER TABLE babyeyi_payment_intents ADD UNIQUE KEY uq_invoice_no (invoice_no)`).catch(() => {});
  } catch (e) {
    console.warn('[publicBabyeyiPay] ensureIntentTable:', e.message);
  }
};

const ensureInvoiceReminderLogTable = async () => {
  try {
    await db.promisePool.execute(`
      CREATE TABLE IF NOT EXISTS babyeyi_invoice_reminder_logs (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        intent_id BIGINT UNSIGNED NOT NULL,
        reminder_stage VARCHAR(20) NOT NULL,
        sent_sms TINYINT(1) NOT NULL DEFAULT 0,
        sent_email TINYINT(1) NOT NULL DEFAULT 0,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uq_birl_intent_stage (intent_id, reminder_stage),
        KEY idx_birl_created (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  } catch (e) {
    console.warn('[publicBabyeyiPay] ensureInvoiceReminderLogTable:', e.message);
  }
};

const ensureLoanRepaymentTable = async () => {
  try {
    await db.promisePool.execute(`
      CREATE TABLE IF NOT EXISTS babyeyi_loan_repayments (
        id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        intent_id INT UNSIGNED NOT NULL,
        receipt_no VARCHAR(80) NULL,
        amount_rwf DECIMAL(12,2) NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'pending',
        paid_by_phone VARCHAR(30) NULL,
        note VARCHAR(255) NULL,
        reviewed_by VARCHAR(120) NULL,
        reviewed_at DATETIME NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uq_blr_receipt (receipt_no),
        KEY idx_blr_intent (intent_id),
        KEY idx_blr_phone (paid_by_phone),
        KEY idx_blr_status (status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    await db.promisePool.execute(`ALTER TABLE babyeyi_loan_repayments ADD COLUMN receipt_no VARCHAR(80) NULL`).catch(() => {});
    await db.promisePool.execute(`ALTER TABLE babyeyi_loan_repayments ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'pending'`).catch(() => {});
    await db.promisePool.execute(`ALTER TABLE babyeyi_loan_repayments ADD COLUMN reviewed_by VARCHAR(120) NULL`).catch(() => {});
    await db.promisePool.execute(`ALTER TABLE babyeyi_loan_repayments ADD COLUMN reviewed_at DATETIME NULL`).catch(() => {});
    await db.promisePool.execute(`ALTER TABLE babyeyi_loan_repayments ADD UNIQUE KEY uq_blr_receipt (receipt_no)`).catch(() => {});
    await db.promisePool.execute(`ALTER TABLE babyeyi_loan_repayments ADD KEY idx_blr_status (status)`).catch(() => {});
  } catch (e) {
    console.warn('[publicBabyeyiPay] ensureLoanRepaymentTable:', e.message);
  }
};

const ensureParentLimitedAccessTables = async () => {
  try {
    await db.promisePool.execute(`
      CREATE TABLE IF NOT EXISTS student_access (
        id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        parent_portal_account_id INT UNSIGNED NULL,
        parent_phone VARCHAR(30) NOT NULL,
        student_id INT UNSIGNED NOT NULL,
        access_type ENUM('FULL','LIMITED') NOT NULL DEFAULT 'LIMITED',
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uq_parent_student (parent_phone, student_id),
        KEY idx_parent_student_student (student_id),
        KEY idx_parent_student_type (access_type)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    await db.promisePool.execute(`
      CREATE TABLE IF NOT EXISTS parent_student_activity_logs (
        id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        parent_portal_account_id INT UNSIGNED NULL,
        parent_phone VARCHAR(30) NOT NULL,
        student_id INT UNSIGNED NOT NULL,
        access_type ENUM('FULL','LIMITED') NOT NULL DEFAULT 'LIMITED',
        action_type VARCHAR(80) NOT NULL,
        endpoint VARCHAR(160) NULL,
        payload_json LONGTEXT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        KEY idx_psal_parent_phone (parent_phone),
        KEY idx_psal_student (student_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    await db.promisePool.execute(`
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
  } catch (e) {
    console.warn('[publicBabyeyiPay] ensureParentLimitedAccessTables:', e.message);
  }
};

async function processLimitedAccessPaymentEffects({ intentId, schoolId, payload, payerPhone, amountRwf }) {
  try {
    await ensureParentLimitedAccessTables();
    const pPhone = normalizeRwandaPhone(payerPhone);
    const studentId = Number(payload?.selected_student?.student_id || 0);
    if (!pPhone || !studentId) return;
    const [[acc]] = await db.promisePool.execute(
      `SELECT access_type FROM student_access WHERE parent_phone = ? AND student_id = ? LIMIT 1`,
      [pPhone, studentId]
    );
    const accessType = String(acc?.access_type || '').toUpperCase();
    if (accessType !== 'LIMITED') return;
    await db.promisePool.execute(
      `INSERT INTO parent_student_activity_logs
        (parent_portal_account_id, parent_phone, student_id, access_type, action_type, endpoint, payload_json)
       VALUES (NULL, ?, ?, 'LIMITED', 'create_payment', '/api/public/babyeyi-pay/intent', ?)`,
      [pPhone, studentId, JSON.stringify({ intent_id: intentId, school_id: schoolId, total_rwf: amountRwf || 0 })]
    );
    const [rows] = await db.promisePool.execute(
      `SELECT first_name, last_name, father_phone, mother_phone FROM students WHERE id = ? LIMIT 1`,
      [studentId]
    );
    const st = rows?.[0];
    if (!st) return;
    const studentName = `${st.first_name || ''} ${st.last_name || ''}`.trim() || 'your child';
    const targets = [normalizeRwandaPhone(st.father_phone), normalizeRwandaPhone(st.mother_phone)]
      .filter(Boolean)
      .filter((phone) => phone !== pPhone);
    if (!targets.length) return;
    const uniq = Array.from(new Set(targets));
    for (const t of uniq) {
      await db.promisePool.execute(
        `INSERT INTO parent_portal_notifications
          (target_parent_phone, source_parent_phone, student_id, type, title, body, payload_json)
         VALUES (?, ?, ?, 'LIMITED_ACCESS_PAYMENT', ?, ?, ?)`,
        [
          t,
          pPhone,
          studentId,
          'Limited-access payment activity',
          `A limited-access parent made a payment for ${studentName}.`,
          JSON.stringify({ intent_id: intentId, school_id: schoolId, student_id: studentId, amount_rwf: amountRwf || 0 }),
        ]
      );
    }
  } catch (e) {
    console.warn('[publicBabyeyiPay] processLimitedAccessPaymentEffects:', e.message);
  }
}

const ensureWebhookLogsTable = async () => {
  try {
    await db.promisePool.execute(`
      CREATE TABLE IF NOT EXISTS xentripay_webhook_logs (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        event_type VARCHAR(120) NULL,
        provider_status VARCHAR(60) NULL,
        reference_value VARCHAR(160) NULL,
        intent_id BIGINT UNSIGNED NULL,
        matched_intent TINYINT(1) NOT NULL DEFAULT 0,
        processing_status VARCHAR(40) NOT NULL DEFAULT 'received',
        error_message VARCHAR(255) NULL,
        payload_json LONGTEXT NULL,
        headers_json LONGTEXT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        processed_at DATETIME NULL,
        KEY idx_xwl_created (created_at),
        KEY idx_xwl_ref (reference_value),
        KEY idx_xwl_intent (intent_id),
        KEY idx_xwl_status (processing_status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  } catch (e) {
    console.warn('[publicBabyeyiPay] ensureWebhookLogsTable:', e.message);
  }
};

function resolveLoanTotalDue(intentTotal, payload = {}) {
  const due = Number(payload?.payment_plan?.loanSummary?.totalDue);
  if (Number.isFinite(due) && due > 0) return due;
  return Number(intentTotal || 0);
}

function toDateOnly(v) {
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}
function addMonths(d, months) {
  const x = new Date(d.getTime());
  x.setMonth(x.getMonth() + months);
  return x;
}
function diffFullMonths(from, to) {
  let m = (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth());
  if (to.getDate() < from.getDate()) m -= 1;
  return Math.max(0, m);
}
function buildLoanPlan(intentTotal, payload = {}, createdAt) {
  const baseDue = resolveLoanTotalDue(intentTotal, payload);
  const months = Math.max(1, Number(payload?.payment_plan?.loanMonths || 1));
  const extensionMonths = Math.max(0, Number(payload?.payment_plan?.extensionMonths || 0));
  const startDate = toDateOnly(createdAt) || new Date();
  const dueDate = addMonths(startDate, months + extensionMonths);
  const now = new Date();
  const overdueMonths = now > dueDate ? diffFullMonths(dueDate, now) : 0;
  const overdueExtra = Math.round((baseDue * 0.02 * overdueMonths) * 100) / 100;
  const totalDue = Math.round((baseDue + overdueExtra) * 100) / 100;
  return {
    months,
    extension_months: extensionMonths,
    due_date: dueDate,
    overdue_months: overdueMonths,
    overdue_extra_rwf: overdueExtra,
    total_due_rwf: totalDue,
    monthly_installment_rwf: Math.round((totalDue / months) * 100) / 100,
  };
}

// GET /api/.../babyeyi-finder/  or  /api/public/babyeyi-pay/  — discovery (no auth)
router.get('/', (_req, res) => {
  res.json(getBabyeyiFinderDiscoveryPayload());
});

// GET /api/public/babyeyi-pay/pricing/:babyeyiId?school_id= | ?school_code=
router.get('/pricing/:babyeyiId', async (req, res) => {
  try {
    const babyeyiId = parseInt(req.params.babyeyiId, 10);
    const resolved = await resolveSchoolIdFromInput(req.query);
    if (!resolved.schoolId) {
      return res.status(400).json({
        success: false,
        message: resolved.message || 'school_id or school_code is required',
      });
    }
    const result = await loadApprovedBabyeyiPricing(babyeyiId, resolved.schoolId);
    if (!result.ok) {
      return res.status(result.status).json({ success: false, message: result.message });
    }
    return res.json({ success: true, data: result.data });
  } catch (err) {
    console.error('[public/babyeyi-pay/pricing]', err);
    return res.status(500).json({ success: false, message: err.message || 'Failed to load pricing' });
  }
});

// POST /api/public/babyeyi-pay/quote-balance — remaining amount per student / line (no auth)
router.post('/quote-balance', async (req, res) => {
  try {
    const body = req.body || {};
    const resolved = await resolveSchoolIdFromInput(body);
    if (!resolved.schoolId) {
      return res.status(400).json({
        success: false,
        message: resolved.message || 'school_id or school_code is required',
      });
    }
    const result = await quoteBabyeyiPayBalance({
      schoolId: resolved.schoolId,
      babyeyiId: body.babyeyi_id,
      selectedFeeIds: body.selected_fee_ids,
      selectedReqIds: body.selected_requirement_ids,
      selectedStudents: body.selected_students,
      school_counter_credits_rwf: body.school_counter_credits_rwf ?? body.schoolCounterCreditsRwf ?? null,
    });
    if (!result.ok) {
      return res.status(result.status).json({ success: false, message: result.message });
    }
    return res.json({ success: true, data: result.data });
  } catch (err) {
    console.error('[public/babyeyi-pay/quote-balance]', err);
    return res.status(500).json({ success: false, message: err.message || 'Failed to quote balance' });
  }
});

// GET /api/public/babyeyi-pay/shule-avance-organizations — active partners for public picker
router.get('/shule-avance-organizations', async (_req, res) => {
  try {
    await ensureShuleAvanceOrgTables();
    const [rows] = await db.promisePool.execute(
      `SELECT id, org_name, org_type, description, logo_url, applicant_categories_json, rate_percent, rate_is_monthly, disbursement_account_type
       FROM pro_shule_avance_organizations
       WHERE is_active = 1
       ORDER BY org_name ASC`
    );
    const data = (rows || []).map((r) => {
      const cats = parseShuleOrgApplicantCategoriesJson(r.applicant_categories_json);
      const { applicant_categories_json, ...rest } = r;
      const disbursement = String(r?.disbursement_account_type || 'SCHOOL_ACCOUNT').trim().toUpperCase();
      return {
        ...rest,
        applicant_categories: cats,
        disbursement_account_type:
          disbursement === 'PERSONAL_ACCOUNT' || disbursement === 'OTHER' ? disbursement : 'SCHOOL_ACCOUNT',
      };
    });
    return res.json({ success: true, data });
  } catch (e) {
    console.error('[public/babyeyi-pay/shule-avance-organizations]', e);
    return res.status(500).json({ success: false, message: 'Failed to load organizations' });
  }
});

// POST /api/public/babyeyi-pay/intent
router.post('/intent', async (req, res) => {
  try {
    await ensureIntentTable();
    const body = req.body || {};

    const guestCk = body.classkit_guest_checkout === true || body.classkit_guest_checkout === 'true';
    if (guestCk) {
      try {
        await ensureClasskitShareTable();
      } catch (_) {}
      const shareRow = await resolveGuestShareFromReq(req);
      if (!shareRow) {
        return res.status(401).json({
          success: false,
          message:
            'This checkout requires the ClassKit/ShuleKit link to be unlocked with the code sent to the parent email or SMS.',
          code: 'CLASSKIT_SHARE_AUTH',
        });
      }
      const sel = body.selected_student || body.selectedStudent || {};
      const sidBody = Number(sel.student_id || sel.id || 0);
      if (!sidBody || sidBody !== Number(shareRow.student_id)) {
        return res.status(403).json({
          success: false,
          message: 'Student selection does not match the verified resume link.',
          code: 'CLASSKIT_SHARE_MISMATCH',
        });
      }
    }

    const resolved = await resolveSchoolIdFromInput(body);
    if (!resolved.schoolId) {
      return res.status(400).json({
        success: false,
        message: resolved.message || 'school_id or school_code is required',
      });
    }
    const schoolId = resolved.schoolId;
    body.school_id = schoolId;
    const babyeyiId = parseInt(body.babyeyi_id, 10);
    const total_rwf = parseFloat(body.total_rwf);
    if (!babyeyiId || Number.isNaN(total_rwf) || total_rwf < 0) {
      return res.status(400).json({ success: false, message: 'Invalid payload' });
    }
    const [[b]] = await db.promisePool.execute(
      `SELECT id FROM school_babyeyi WHERE id=? AND school_id=? AND is_active=1 AND status='approved' LIMIT 1`,
      [babyeyiId, schoolId]
    );
    if (!b) return res.status(404).json({ success: false, message: 'Babyeyi not found' });

    const balanceCheck = await validateBabyeyiPaymentAgainstBalance(body);
    if (!balanceCheck.ok) {
      return res.status(balanceCheck.status).json({
        success: false,
        message: balanceCheck.message,
        code: balanceCheck.code || 'BABYEYI_BALANCE',
        details: balanceCheck.details || null,
      });
    }

    const payload = {
      selected_fee_ids: body.selected_fee_ids || [],
      selected_requirement_ids: body.selected_requirement_ids || [],
      selected_student: body.selected_student || null,
      selected_students: Array.isArray(body.selected_students) ? body.selected_students : (body.selected_student ? [body.selected_student] : []),
      school_counter_credits_rwf: body.school_counter_credits_rwf || body.schoolCounterCreditsRwf || null,
      payment_plan: body.payment_plan || null,
      payer: body.payer || null,
      public_pay_no_login: !!body.public_pay_no_login,
      from_public_finder: !!body.from_public_finder,
      from_school_mini_site: !!body.from_school_mini_site,
    };

    if (String(payload?.payment_plan?.method || '').toLowerCase() === 'shule_avance') {
      await ensureShuleAvanceOrgTables();
      const sa0 = payload.payment_plan.shule_avance || {};
      const orgId = Number(sa0.organization_id || 0);
      const intentSt0 = String(body?.status || 'draft').trim().toLowerCase() || 'draft';

      if (!orgId) {
        if (intentSt0 !== 'draft') {
          return res.status(400).json({ success: false, message: 'Select a ShuleAvance organization' });
        }
      } else {
        const [[orgRow]] = await db.promisePool.execute(
          `SELECT id, org_name, is_active, applicant_categories_json FROM pro_shule_avance_organizations WHERE id = ? LIMIT 1`,
          [orgId]
        );
        if (!orgRow || !Number(orgRow.is_active)) {
          return res.status(400).json({
            success: false,
            message: 'That ShuleAvance organization is not accepting requests',
          });
        }
        const allowedCats = parseShuleOrgApplicantCategoriesJson(orgRow.applicant_categories_json);
        const rawCat = String(sa0.applicant_category ?? sa0.applicantCategory ?? '').trim();
        const idx = allowedCats.findIndex((a) => a.toLowerCase() === rawCat.toLowerCase());
        const catNorm = idx >= 0 ? allowedCats[idx] : '';
        if (intentSt0 !== 'draft') {
          if (!catNorm) {
            return res.status(400).json({
              success: false,
              message: 'Applicant category is not accepted by this ShuleAvance organization',
            });
          }
        }
        const nextSa = {
          ...sa0,
          organization_name: orgRow.org_name,
          financing_request_status: String(
            sa0.financing_request_status || (intentSt0 === 'draft' ? 'DRAFT' : 'SUBMITTED')
          ),
        };
        if (catNorm) nextSa.applicant_category = catNorm;
        payload.payment_plan.shule_avance = nextSa;
      }
    }

    const payerName = String(body?.payer?.name || '').trim() || null;
    const payerPhone = String(body?.payer?.phone || '').trim() || null;
    const shuleNotifyEmailRaw = String(
      body?.payment_plan?.shule_avance?.applicant_notification_email || ''
    ).trim();
    const payerEmailInput =
      String(payload?.payment_plan?.method || '').toLowerCase() === 'shule_avance' && shuleNotifyEmailRaw
        ? shuleNotifyEmailRaw
        : String(body?.payer?.email || '').trim() || null;
    const payerEmail = await resolvePayerEmailFromStudent(schoolId, payload.selected_student, payerEmailInput);
    let status = String(body?.status || 'draft').trim().toLowerCase() || 'draft';
    const payMode = String(body?.payment_plan?.payMode || '').trim().toLowerCase();
    const payMethod = String(body?.payment_plan?.method || '').trim().toLowerCase();
    const momoCfg = body?.payment_plan?.momo;
    const momoFlavor =
      typeof momoCfg === 'string'
        ? String(momoCfg).trim().toLowerCase()
        : String(momoCfg?.provider || momoCfg?.flavor || '').trim().toLowerCase();

    let provider = null;
    let providerStatus = null;
    let providerReference = null;
    let providerTid = null;
    let providerAuthkey = null;
    let providerPayload = null;

    let reuseUpgradeId = null;
    const reuseIntentId = parseInt(body.reuse_intent_id, 10);
    if (reuseIntentId) {
      const [[ex]] = await db.promisePool.execute(
        `SELECT id, school_id, babyeyi_id, status, invoice_no FROM babyeyi_payment_intents WHERE id = ? LIMIT 1`,
        [reuseIntentId]
      );
      const exSt = String(ex?.status || '').toLowerCase();
      if (
        ex
        && Number(ex.school_id) === schoolId
        && Number(ex.babyeyi_id) === babyeyiId
        && exSt === 'draft'
      ) {
        if (status === 'draft') {
          const invoiceStatus = computeInvoiceStatusFromIntentStatus(status, payload.payment_plan);
          const dueDays = Math.max(1, Number(process.env.INVOICE_DUE_DAYS || 14));
          const invoiceDueAt = new Date(Date.now() + dueDays * 24 * 60 * 60 * 1000);
          await db.promisePool.execute(
            `UPDATE babyeyi_payment_intents
             SET payload_json = ?, total_rwf = ?, payer_name = ?, payer_phone = ?, payer_email = ?, status = ?,
                 invoice_status = ?, invoice_due_at = ?
             WHERE id = ?`,
            [
              JSON.stringify(payload),
              total_rwf,
              payerName,
              payerPhone,
              payerEmail,
              status,
              invoiceStatus,
              invoiceDueAt,
              reuseIntentId,
            ]
          );
          const invoiceNo = ex.invoice_no || makeInvoiceNo(reuseIntentId);
          if (!ex.invoice_no) {
            await db.promisePool.execute(
              `UPDATE babyeyi_payment_intents SET invoice_no = ? WHERE id = ?`,
              [invoiceNo, reuseIntentId]
            );
          }
          notifyInvoiceStatusByIntentId(reuseIntentId, 'intent_draft_updated').catch(() => {});
          return res.status(200).json({
            success: true,
            intent_id: reuseIntentId,
            status,
            provider: null,
            provider_status: null,
            provider_reference: null,
            provider_tid: null,
            invoice: {
              invoice_id: reuseIntentId,
              invoice_no: invoiceNo,
              invoice_status: invoiceStatus,
              payer_email: payerEmail,
            },
            gateway_failed: false,
            message: 'Invoice preview updated',
            gateway_error: null,
          });
        }
        reuseUpgradeId = reuseIntentId;
      }
    }

  const shouldInitMtnMomo =
      payMode !== 'loan'
      && payMethod === 'momo'
      && status !== 'draft'
      && mtnMomoEnabled();

    const shouldInitXentriPay =
      payMode !== 'loan'
      && payMethod === 'momo'
      && status !== 'draft'
      && !shouldInitMtnMomo
      && xentripayEnabled();

    if (shouldInitMtnMomo) {
      const momoPhoneExplicit =
        momoCfg && typeof momoCfg === 'object' ? String(momoCfg.phone || '').trim() : '';
      const msisdn = toMsisdn250(momoPhoneExplicit) || toMsisdn250(payerPhone);
      const amount = Math.round(Number(total_rwf || 0));
      if (!msisdn) {
        return res.status(400).json({
          success: false,
          message: 'Enter a valid Rwanda MTN MoMo number (e.g. 07X XXX XXX).',
        });
      }
      if (!amount || amount < 1) {
        return res.status(400).json({ success: false, message: 'Amount must be at least 1 RWF.' });
      }
      const externalId = `be-${babyeyiId}-${schoolId}-${Date.now()}-${crypto.randomUUID()}`.slice(0, 64);
      const payerMsg = 'School fees payment';
      try {
        const _port = process.env.PORT || 8080;
        const _momoRes = await fetch(`http://127.0.0.1:${_port}/api/momo/request-to-pay`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            phone:         msisdn,
            amount:        amount,
            external_id:   externalId,
            payer_message: payerMsg,
            payee_note:    'Babyeyi school payment',
            school_id:     schoolId,
            babyeyi_id:    babyeyiId,
          }),
        });
        const _momoJson = await _momoRes.json().catch(() => ({}));
        if (!_momoRes.ok || !_momoJson.success) {
          const _err = new Error(_momoJson.message || `MTN MoMo failed (HTTP ${_momoRes.status})`);
          _err.mtnBody = _momoJson;
          throw _err;
        }
        const mtn = {
          referenceId:  _momoJson.referenceId,
          statusCode:   202,
          responseBody: null,
        };
        provider = 'mtn_momo';
        const mtnBody = mtn.responseBody && typeof mtn.responseBody === 'object' ? mtn.responseBody : null;
        const mtnSt = mtnBody ? mapMtnStatusToUpper(mtnBody.status) : '';
        if (['SUCCESSFUL', 'SUCCESS', 'COMPLETED'].includes(mtnSt)) {
          providerStatus = 'SUCCESSFUL';
        } else if (['FAILED', 'REJECTED', 'CANCELLED'].includes(mtnSt)) {
          providerStatus = 'FAILED';
        } else {
          providerStatus = 'PENDING';
        }
        providerReference = mtn.referenceId;
        providerTid = null;
        providerAuthkey = null;
        providerPayload = {
          referenceId: mtn.referenceId,
          externalId,
          httpStatus: mtn.statusCode,
          ...(mtnBody ? { mtnRequestToPayResponse: mtnBody } : {}),
        };
        status = providerStatus === 'SUCCESSFUL' ? 'paid' : providerStatus === 'FAILED' ? 'failed' : 'submitted';
      } catch (gatewayErr) {
        provider = 'mtn_momo';
        providerStatus = 'FAILED';
        providerPayload = {
          error: gatewayErr?.mtnBody || gatewayErr?.response?.data || gatewayErr.message || 'MTN MoMo error',
        };
        status = 'failed';
      }
    } else if (shouldInitXentriPay) {
      const momoPhoneExplicit =
        momoCfg && typeof momoCfg === 'object' ? String(momoCfg.phone || '').trim() : '';
      const phoneForGateway = momoPhoneExplicit || payerPhone;
      const msisdn = toMsisdn250(phoneForGateway);
      const cnumber = normalizeRwandaPhone(phoneForGateway);
      const email = payerEmail || 'payments@babyeyi.local';
      const amount = Math.round(Number(total_rwf || 0));
      if (!msisdn || !cnumber) {
        return res.status(400).json({
          success: false,
          message: 'A valid Rwanda payer phone is required for real-time MoMo payment.',
        });
      }
      if (!amount || amount < 1) {
        return res.status(400).json({ success: false, message: 'Amount must be at least 1 RWF.' });
      }
      try {
        const gateway = await xentripayCollectionInitiate({
          email,
          name: payerName || 'Parent',
          amount,
          cnumber,
          msisdn,
        });
        provider = 'xentripay';
        providerStatus = Number(gateway?.success || 0) === 1 ? 'PENDING' : 'FAILED';
        providerReference = String(gateway?.refid || '').trim() || null;
        providerTid = String(gateway?.tid || '').trim() || null;
        providerAuthkey = String(gateway?.authkey || '').trim() || null;
        providerPayload = gateway;
        status = providerStatus === 'FAILED' ? 'failed' : 'submitted';
      } catch (gatewayErr) {
        provider = 'xentripay';
        providerStatus = 'FAILED';
        providerPayload = { error: gatewayErr?.response?.data || gatewayErr.message || 'Gateway error' };
        status = 'failed';
      }
    }

    const invoiceStatus = computeInvoiceStatusFromIntentStatus(status, payload.payment_plan);
    const dueDays = Math.max(1, Number(process.env.INVOICE_DUE_DAYS || 14));
    const invoiceDueAt = new Date(Date.now() + dueDays * 24 * 60 * 60 * 1000);
    const paidAt = invoiceStatus === 'PAID' ? new Date() : null;
    let finalIntentId;
    let invoiceNo;
    if (reuseUpgradeId) {
      await db.promisePool.execute(
        `UPDATE babyeyi_payment_intents
         SET payload_json = ?, total_rwf = ?, payer_name = ?, payer_phone = ?, payer_email = ?, status = ?,
             provider = ?, provider_status = ?, provider_reference = ?, provider_tid = ?, provider_authkey = ?, provider_payload_json = ?,
             invoice_status = ?, invoice_paid_at = ?, invoice_due_at = ?
         WHERE id = ?`,
        [
          JSON.stringify(payload),
          total_rwf,
          payerName,
          payerPhone,
          payerEmail,
          status,
          provider,
          providerStatus,
          providerReference,
          providerTid,
          providerAuthkey,
          providerPayload ? JSON.stringify(providerPayload) : null,
          invoiceStatus,
          paidAt,
          invoiceDueAt,
          reuseUpgradeId,
        ]
      );
      const [[ex2]] = await db.promisePool.execute(
        `SELECT invoice_no FROM babyeyi_payment_intents WHERE id = ? LIMIT 1`,
        [reuseUpgradeId]
      );
      invoiceNo = ex2?.invoice_no || makeInvoiceNo(reuseUpgradeId);
      if (!ex2?.invoice_no) {
        await db.promisePool.execute(
          `UPDATE babyeyi_payment_intents SET invoice_no = ? WHERE id = ?`,
          [invoiceNo, reuseUpgradeId]
        );
      }
      finalIntentId = reuseUpgradeId;
    } else {
      const [r] = await db.promisePool.execute(
        `INSERT INTO babyeyi_payment_intents
         (school_id, babyeyi_id, payload_json, total_rwf, payer_name, payer_phone, payer_email, status,
          provider, provider_status, provider_reference, provider_tid, provider_authkey, provider_payload_json,
          invoice_status, invoice_paid_at, invoice_due_at)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [
          schoolId, babyeyiId, JSON.stringify(payload), total_rwf, payerName, payerPhone, payerEmail, status,
          provider, providerStatus, providerReference, providerTid, providerAuthkey, providerPayload ? JSON.stringify(providerPayload) : null,
          invoiceStatus, paidAt, invoiceDueAt,
        ]
      );
      finalIntentId = r.insertId;
      invoiceNo = makeInvoiceNo(r.insertId);
      await db.promisePool.execute(
        `UPDATE babyeyi_payment_intents SET invoice_no = ? WHERE id = ?`,
        [invoiceNo, r.insertId]
      );
    }
    if (['submitted', 'paid'].includes(String(status || '').toLowerCase())) {
      processLimitedAccessPaymentEffects({
        intentId: finalIntentId,
        schoolId,
        payload,
        payerPhone,
        amountRwf: total_rwf,
      }).catch(() => {});
    }
    const isShuleFinancingSubmit =
      String(payload?.payment_plan?.method || '').toLowerCase() === 'shule_avance' &&
      String(status || '').toLowerCase() === 'submitted';
    if (isShuleFinancingSubmit) {
      sendShuleAvanceFinancingApplicantEmail(finalIntentId, 'submitted').catch((e) => {
        console.warn('[shule-avance/email] submitted notify failed:', e.message);
      });
    } else {
      notifyInvoiceStatusByIntentId(finalIntentId, 'intent_created').catch((e) => {
        console.warn('[invoice/email] create notify failed:', e.message);
      });
    }

    const shouldInitRealtimeCollection = shouldInitMtnMomo || shouldInitXentriPay;
    const realtimeFailure = shouldInitRealtimeCollection && providerStatus === 'FAILED';
    let userMessage = 'Intent saved';
    if (realtimeFailure) {
      userMessage = shouldInitMtnMomo
        ? 'Payment intent saved. MTN MoMo could not be started — please try again or contact support.'
        : 'Payment intent saved. initiation failed, please retry or use Reconcile.';
    } else if (shouldInitRealtimeCollection) {
      userMessage = shouldInitMtnMomo
        ? 'Check your phone for the MTN MoMo prompt and approve the payment.'
        : 'Payment initiated. Confirm on your MoMo menu.';
    }
    return res.status(200).json({
      success: true,
      intent_id: finalIntentId,
      status,
      provider,
      provider_status: providerStatus,
      provider_reference: providerReference,
      provider_tid: providerTid,
      invoice: {
        invoice_id: finalIntentId,
        invoice_no: invoiceNo,
        invoice_status: invoiceStatus,
        payer_email: payerEmail,
      },
      gateway_failed: realtimeFailure,
      message: userMessage,
      gateway_error: realtimeFailure ? summarizeGatewayErrorForClient(providerPayload) : null,
    });
  } catch (err) {
    console.error('[public/babyeyi-pay/intent]', err);
    return res.status(500).json({ success: false, message: err.message || 'Failed' });
  }
});

// POST /api/public/babyeyi-pay/intent/:id/check-provider-status
router.post('/intent/:id/check-provider-status', async (req, res) => {
  try {
    await ensureIntentTable();
    const id = Number(req.params.id || 0);
    if (!id) return res.status(400).json({ success: false, message: 'Invalid intent id' });
    const [rows] = await db.promisePool.execute(
      `SELECT id, status, provider, provider_status, provider_reference, provider_tid, provider_payload_json, payload_json
       FROM babyeyi_payment_intents
       WHERE id = ?
       LIMIT 1`,
      [id]
    );
    const row = rows?.[0];
    if (!row) return res.status(404).json({ success: false, message: 'Intent not found' });
    const prov = String(row.provider || '').toLowerCase();

    if (prov === 'mtn_momo') {
      if (!mtnMomoEnabled()) {
        return res.status(503).json({ success: false, message: 'MTN MoMo is not configured on server' });
      }
      const ref = row.provider_reference || row.provider_tid;
      if (!ref) {
        return res.json({
          success: true,
          intent_id: id,
          status: String(row.status || 'failed').toLowerCase(),
          provider_status: String(row.provider_status || 'FAILED').toUpperCase() || 'FAILED',
          provider: 'mtn_momo',
          no_gateway_reference: true,
          message: 'MoMo was not started for this intent, so there is nothing to poll.',
        });
      }
      let gatewayResp = {};
      try {
        gatewayResp = await mtnGetRequestToPayStatus(ref);
      } catch (gatewayErr) {
        const mtnStatus = gatewayErr?.mtnStatus;
        const msg = String(gatewayErr?.message || '');
        const transient =
          !!gatewayErr?.networkError
          || mtnStatus === 429
          || (mtnStatus >= 500 && mtnStatus < 600)
          || /timeout|ECONNRESET|ENOTFOUND|ETIMEDOUT|ECONNREFUSED|socket/i.test(msg);
        const payload = {
          check_status_error: gatewayErr?.mtnBody || gatewayErr?.response?.data || msg || 'Gateway error',
          mtn_http_status: mtnStatus,
        };
        await db.promisePool.execute(
          `UPDATE babyeyi_payment_intents
           SET provider_payload_json = ?, last_provider_check_at = NOW()
           WHERE id = ?`,
          [JSON.stringify(payload), id]
        );
        console.warn('[public/babyeyi-pay] MTN status check failed', { intent_id: id, ref, transient, mtnStatus, message: msg });
        if (transient) {
          return res.json({
            success: true,
            intent_id: id,
            status: String(row.status || 'submitted').toLowerCase(),
            provider_status: 'PENDING',
            status_check_deferred: true,
            message: 'Could not reach MTN to refresh status yet; payment may still be processing.',
            gateway: null,
          });
        }
        return res.status(502).json({
          success: false,
          message: 'MTN MoMo status check failed',
          detail: msg.slice(0, 300),
        });
      }
      let prevPayload = {};
      try {
        if (row.provider_payload_json) {
          prevPayload = JSON.parse(row.provider_payload_json);
        }
      } catch (_) {}
      const postMtn = prevPayload?.mtnRequestToPayResponse;
      if (gatewayResp?.mtnNotFound && postMtn && typeof postMtn === 'object') {
        const { mtnNotFound: _drop, ...gr } = gatewayResp;
        gatewayResp = { ...gr, ...postMtn };
      }
      const raw = mapMtnStatusToUpper(gatewayResp?.status);
      const providerStatus = raw || String(row.provider_status || '').toUpperCase() || 'PENDING';
      let nextStatus = String(row.status || 'submitted').toLowerCase();
      if (providerStatus === 'SUCCESSFUL' || providerStatus === 'SUCCESS' || providerStatus === 'COMPLETED') {
        nextStatus = 'paid';
      } else if (['FAILED', 'REJECTED', 'CANCELLED'].includes(providerStatus)) {
        nextStatus = 'failed';
      } else if (!['paid', 'failed'].includes(nextStatus)) {
        nextStatus = 'submitted';
      }
      const financialId = String(gatewayResp?.financialTransactionId || '').trim() || null;
      let payPlanPoll = null;
      try {
        payPlanPoll = JSON.parse(row.payload_json || '{}')?.payment_plan || null;
      } catch (_) {}
      const invoiceStatusNow = computeInvoiceStatusFromIntentStatus(nextStatus, payPlanPoll);
      await db.promisePool.execute(
        `UPDATE babyeyi_payment_intents
         SET status = ?, provider_status = ?, provider_tid = COALESCE(NULLIF(?, ''), provider_tid),
             provider_payload_json = ?, invoice_status = ?, invoice_paid_at = CASE WHEN ? = 'PAID' THEN NOW() ELSE invoice_paid_at END,
             last_provider_check_at = NOW()
         WHERE id = ?`,
        [nextStatus, providerStatus, financialId, JSON.stringify(gatewayResp), invoiceStatusNow, invoiceStatusNow, id]
      );
      notifyInvoiceStatusByIntentId(id, 'mtn_status_check').catch((e) => {
        console.warn('[invoice/email] mtn status notify failed:', e.message);
      });
      return res.json({
        success: true,
        intent_id: id,
        status: nextStatus,
        invoice_status: invoiceStatusNow,
        provider_status: providerStatus,
        gateway: gatewayResp,
      });
    }

    if (prov !== 'xentripay') {
      return res.status(400).json({ success: false, message: 'Intent has no supported gateway transaction' });
    }
    if (!xentripayEnabled()) {
      return res.status(503).json({ success: false, message: 'XentriPay is not configured on server' });
    }
    const ref = row.provider_reference || row.provider_tid;
    if (!ref) {
      return res.json({
        success: true,
        intent_id: id,
        status: String(row.status || 'failed').toLowerCase(),
        provider_status: String(row.provider_status || 'FAILED').toUpperCase() || 'FAILED',
        provider: 'xentripay',
        no_gateway_reference: true,
        message: 'Gateway did not return a reference for this intent; nothing to poll.',
      });
    }
    let gatewayResp = {};
    try {
      gatewayResp = await xentripayCheckStatus(ref);
    } catch (gatewayErr) {
      await db.promisePool.execute(
        `UPDATE babyeyi_payment_intents
         SET provider_payload_json = ?, last_provider_check_at = NOW()
         WHERE id = ?`,
        [JSON.stringify({ check_status_error: gatewayErr?.response?.data || gatewayErr.message || 'Gateway error' }), id]
      );
      return res.status(502).json({ success: false, message: 'Gateway status check failed' });
    }
    const raw = String(gatewayResp?.data?.status || gatewayResp?.status || '').trim().toUpperCase();
    const providerStatus = raw || String(row.provider_status || '').toUpperCase() || 'PENDING';
    let nextStatus = String(row.status || 'submitted').toLowerCase();
    if (providerStatus === 'COMPLETED' || providerStatus === 'SUCCESS') nextStatus = 'paid';
    else if (providerStatus === 'FAILED' || providerStatus === 'REJECTED' || providerStatus === 'CANCELLED') nextStatus = 'failed';
    else if (!['paid', 'failed'].includes(nextStatus)) nextStatus = 'submitted';
    let payPlanX = null;
    try {
      payPlanX = JSON.parse(row.payload_json || '{}')?.payment_plan || null;
    } catch (_) {}
    const invoiceStatusNow = computeInvoiceStatusFromIntentStatus(nextStatus, payPlanX);
    await db.promisePool.execute(
      `UPDATE babyeyi_payment_intents
       SET status = ?, provider_status = ?, provider_payload_json = ?,
           invoice_status = ?, invoice_paid_at = CASE WHEN ? = 'PAID' THEN NOW() ELSE invoice_paid_at END,
           last_provider_check_at = NOW()
       WHERE id = ?`,
      [nextStatus, providerStatus, JSON.stringify(gatewayResp), invoiceStatusNow, invoiceStatusNow, id]
    );
    notifyInvoiceStatusByIntentId(id, 'xentripay_status_check').catch((e) => {
      console.warn('[invoice/email] xentripay status notify failed:', e.message);
    });
    return res.json({
      success: true,
      intent_id: id,
      status: nextStatus,
      invoice_status: invoiceStatusNow,
      provider_status: providerStatus,
      gateway: gatewayResp,
    });
  } catch (err) {
    console.error('[public/babyeyi-pay/intent/:id/check-provider-status]', err);
    return res.status(500).json({ success: false, message: err.message || 'Failed to check provider status' });
  }
});

// POST /api/public/babyeyi-pay/webhook/xentripay
router.post('/webhook/xentripay', async (req, res) => {
  try {
    await ensureIntentTable();
    await ensureWebhookLogsTable();
    const headerToken = String(
      req.headers['x-xentripay-webhook-token']
      || req.headers['x-webhook-token']
      || req.headers['authorization']
      || ''
    ).replace(/^Bearer\s+/i, '').trim();
    const queryToken = String(req.query?.token || '').trim();
    if (XENTRIPAY_WEBHOOK_TOKEN && headerToken !== XENTRIPAY_WEBHOOK_TOKEN && queryToken !== XENTRIPAY_WEBHOOK_TOKEN) {
      return res.status(401).json({ success: false, message: 'Invalid webhook token' });
    }

    const evt = extractXentriWebhookEvent(req.body || {});
    const headersForLog = {
      'user-agent': req.headers['user-agent'] || null,
      'x-forwarded-for': req.headers['x-forwarded-for'] || null,
      'x-xentripay-webhook-token': req.headers['x-xentripay-webhook-token'] ? '***' : null,
    };
    const [logInsert] = await db.promisePool.execute(
      `INSERT INTO xentripay_webhook_logs
       (event_type, provider_status, reference_value, payload_json, headers_json, processing_status)
       VALUES (?, ?, ?, ?, ?, 'received')`,
      [
        evt.event,
        evt.providerStatus,
        evt.reference,
        JSON.stringify(evt.payload || {}),
        JSON.stringify(headersForLog),
      ]
    );
    const webhookLogId = Number(logInsert?.insertId || 0);
    if (!evt.reference) {
      if (webhookLogId) {
        await db.promisePool.execute(
          `UPDATE xentripay_webhook_logs SET processing_status = 'ignored', error_message = ?, processed_at = NOW() WHERE id = ?`,
          ['Missing transaction reference in webhook payload', webhookLogId]
        );
      }
      return res.status(400).json({ success: false, message: 'Missing transaction reference in webhook payload' });
    }
    const nextStatus = mapProviderToLocalStatus(evt.providerStatus);
    const [preWh] = await db.promisePool.execute(
      `SELECT payload_json FROM babyeyi_payment_intents
       WHERE provider_reference = ? OR provider_tid = ? LIMIT 1`,
      [evt.reference, evt.reference]
    );
    let payPlanWh = null;
    try {
      payPlanWh = JSON.parse(preWh?.[0]?.payload_json || '{}')?.payment_plan || null;
    } catch (_) {}
    const invoiceStatusNow = computeInvoiceStatusFromIntentStatus(nextStatus, payPlanWh);
    const [update] = await db.promisePool.execute(
      `UPDATE babyeyi_payment_intents
       SET
         status = ?,
         provider = COALESCE(provider, 'xentripay'),
         provider_status = ?,
         provider_payload_json = ?,
         invoice_status = ?,
         invoice_paid_at = CASE WHEN ? = 'PAID' THEN NOW() ELSE invoice_paid_at END,
         last_provider_check_at = NOW()
       WHERE
         provider_reference = ?
         OR provider_tid = ?
       LIMIT 1`,
      [nextStatus, evt.providerStatus, JSON.stringify(evt.payload || {}), invoiceStatusNow, invoiceStatusNow, evt.reference, evt.reference]
    );
    if (!update?.affectedRows) {
      if (webhookLogId) {
        await db.promisePool.execute(
          `UPDATE xentripay_webhook_logs
           SET matched_intent = 0, processing_status = 'no_match', error_message = ?, processed_at = NOW()
           WHERE id = ?`,
          ['No payment intent matched webhook reference', webhookLogId]
        );
      }
      return res.status(404).json({
        success: false,
        message: 'No payment intent matched webhook reference',
        reference: evt.reference,
      });
    }
    if (webhookLogId) {
      const [intentRows] = await db.promisePool.execute(
        `SELECT id FROM babyeyi_payment_intents WHERE provider_reference = ? OR provider_tid = ? ORDER BY id DESC LIMIT 1`,
        [evt.reference, evt.reference]
      ).catch(() => [[]]);
      const intentId = Number(intentRows?.[0]?.id || 0) || null;
      if (intentId) {
        notifyInvoiceStatusByIntentId(intentId, 'xentripay_webhook').catch((e) => {
          console.warn('[invoice/email] webhook notify failed:', e.message);
        });
      }
      await db.promisePool.execute(
        `UPDATE xentripay_webhook_logs
         SET matched_intent = 1, intent_id = ?, processing_status = 'processed', processed_at = NOW()
         WHERE id = ?`,
        [intentId, webhookLogId]
      );
    }
    return res.json({
      success: true,
      message: 'Webhook processed',
      status: nextStatus,
      provider_status: evt.providerStatus,
      reference: evt.reference,
      event: evt.event,
    });
  } catch (err) {
    console.error('[public/babyeyi-pay/webhook/xentripay]', err);
    return res.status(500).json({ success: false, message: 'Webhook processing failed' });
  }
});

// GET /api/public/babyeyi-pay/admin-webhook-logs
router.get('/admin-webhook-logs', requireRole('SUPER_ADMIN', 'FULL_SYSTEM_CONTROLLER'), async (req, res) => {
  try {
    await ensureWebhookLogsTable();
    const page = Math.max(Number(req.query.page || 1), 1);
    const limit = Math.min(Math.max(Number(req.query.limit || 20), 1), 100);
    const offset = (page - 1) * limit;
    const search = String(req.query.search || '').trim();
    const processingStatus = String(req.query.processing_status || '').trim().toLowerCase();
    const matched = String(req.query.matched || '').trim().toLowerCase();
    const dateFrom = String(req.query.date_from || '').trim();
    const dateTo = String(req.query.date_to || '').trim();

    const where = [];
    const params = [];
    if (search) {
      const like = `%${search}%`;
      where.push(`(COALESCE(w.reference_value,'') LIKE ? OR COALESCE(w.event_type,'') LIKE ? OR COALESCE(w.provider_status,'') LIKE ? OR COALESCE(w.error_message,'') LIKE ?)`);
      params.push(like, like, like, like);
    }
    if (processingStatus) {
      where.push('LOWER(COALESCE(w.processing_status,\'received\')) = ?');
      params.push(processingStatus);
    }
    if (matched === 'yes' || matched === 'no') {
      where.push('w.matched_intent = ?');
      params.push(matched === 'yes' ? 1 : 0);
    }
    if (dateFrom) {
      where.push('DATE(w.created_at) >= ?');
      params.push(dateFrom);
    }
    if (dateTo) {
      where.push('DATE(w.created_at) <= ?');
      params.push(dateTo);
    }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const [rows] = await db.promisePool.query(
      `SELECT w.id, w.event_type, w.provider_status, w.reference_value, w.intent_id, w.matched_intent,
              w.processing_status, w.error_message, w.created_at, w.processed_at, i.status AS intent_status
       FROM xentripay_webhook_logs w
       LEFT JOIN babyeyi_payment_intents i ON i.id = w.intent_id
       ${whereSql}
       ORDER BY w.created_at DESC, w.id DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );
    const [countRows] = await db.promisePool.query(
      `SELECT COUNT(*) AS total FROM xentripay_webhook_logs w ${whereSql}`,
      params
    );
    const total = Number(countRows?.[0]?.total || 0);
    const [summaryRows] = await db.promisePool.execute(
      `SELECT
         COUNT(*) AS total_logs,
         SUM(CASE WHEN matched_intent = 1 THEN 1 ELSE 0 END) AS matched_logs,
         SUM(CASE WHEN LOWER(COALESCE(processing_status,'')) IN ('no_match','error','ignored') THEN 1 ELSE 0 END) AS problematic_logs
       FROM xentripay_webhook_logs`
    );
    return res.json({
      success: true,
      data: rows || [],
      page,
      limit,
      total,
      totalPages: Math.max(Math.ceil(total / limit), 1),
      summary: {
        total_logs: Number(summaryRows?.[0]?.total_logs || 0),
        matched_logs: Number(summaryRows?.[0]?.matched_logs || 0),
        problematic_logs: Number(summaryRows?.[0]?.problematic_logs || 0),
      },
    });
  } catch (err) {
    console.error('[public/babyeyi-pay/admin-webhook-logs]', err);
    return res.status(500).json({ success: false, message: err.message || 'Failed to load webhook logs' });
  }
});

// GET /api/public/babyeyi-pay/admin-webhook-logs/export.csv
router.get('/admin-webhook-logs/export.csv', requireRole('SUPER_ADMIN', 'FULL_SYSTEM_CONTROLLER'), async (req, res) => {
  try {
    await ensureWebhookLogsTable();
    const search = String(req.query.search || '').trim();
    const processingStatus = String(req.query.processing_status || '').trim().toLowerCase();
    const matched = String(req.query.matched || '').trim().toLowerCase();
    const dateFrom = String(req.query.date_from || '').trim();
    const dateTo = String(req.query.date_to || '').trim();

    const where = [];
    const params = [];
    if (search) {
      const like = `%${search}%`;
      where.push(`(COALESCE(w.reference_value,'') LIKE ? OR COALESCE(w.event_type,'') LIKE ? OR COALESCE(w.provider_status,'') LIKE ? OR COALESCE(w.error_message,'') LIKE ?)`);
      params.push(like, like, like, like);
    }
    if (processingStatus) {
      where.push('LOWER(COALESCE(w.processing_status,\'received\')) = ?');
      params.push(processingStatus);
    }
    if (matched === 'yes' || matched === 'no') {
      where.push('w.matched_intent = ?');
      params.push(matched === 'yes' ? 1 : 0);
    }
    if (dateFrom) {
      where.push('DATE(w.created_at) >= ?');
      params.push(dateFrom);
    }
    if (dateTo) {
      where.push('DATE(w.created_at) <= ?');
      params.push(dateTo);
    }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const [rows] = await db.promisePool.execute(
      `SELECT w.id, w.event_type, w.provider_status, w.reference_value, w.intent_id, w.matched_intent,
              w.processing_status, w.error_message, w.created_at, w.processed_at
       FROM xentripay_webhook_logs w
       ${whereSql}
       ORDER BY w.created_at DESC, w.id DESC`,
      params
    );
    const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const header = [
      'id', 'event_type', 'provider_status', 'reference_value', 'intent_id',
      'matched_intent', 'processing_status', 'error_message', 'created_at', 'processed_at',
    ];
    const lines = [header.map(esc).join(',')];
    (rows || []).forEach((r) => {
      lines.push([
        r.id,
        r.event_type,
        r.provider_status,
        r.reference_value,
        r.intent_id,
        r.matched_intent ? 'yes' : 'no',
        r.processing_status,
        r.error_message,
        r.created_at,
        r.processed_at,
      ].map(esc).join(','));
    });
    const csv = `\uFEFF${lines.join('\n')}\n`;
    const stamp = new Date().toISOString().slice(0, 10);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="xentripay-webhook-logs-${stamp}.csv"`);
    return res.status(200).send(csv);
  } catch (err) {
    console.error('[public/babyeyi-pay/admin-webhook-logs/export.csv]', err);
    return res.status(500).json({ success: false, message: err.message || 'Failed to export webhook logs csv' });
  }
});

// GET /api/public/babyeyi-pay/admin-webhook-logs/:id
router.get('/admin-webhook-logs/:id', requireRole('SUPER_ADMIN', 'FULL_SYSTEM_CONTROLLER'), async (req, res) => {
  try {
    await ensureWebhookLogsTable();
    const id = Number(req.params.id || 0);
    if (!id) return res.status(400).json({ success: false, message: 'Invalid webhook log id' });
    const [rows] = await db.promisePool.execute(
      `SELECT w.*, i.status AS intent_status
       FROM xentripay_webhook_logs w
       LEFT JOIN babyeyi_payment_intents i ON i.id = w.intent_id
       WHERE w.id = ?
       LIMIT 1`,
      [id]
    );
    const row = rows?.[0];
    if (!row) return res.status(404).json({ success: false, message: 'Webhook log not found' });
    let payload = null;
    let headers = null;
    try { payload = row.payload_json ? JSON.parse(row.payload_json) : null; } catch { payload = row.payload_json || null; }
    try { headers = row.headers_json ? JSON.parse(row.headers_json) : null; } catch { headers = row.headers_json || null; }
    return res.json({
      success: true,
      data: {
        id: row.id,
        event_type: row.event_type,
        provider_status: row.provider_status,
        reference_value: row.reference_value,
        intent_id: row.intent_id,
        intent_status: row.intent_status || null,
        matched_intent: !!row.matched_intent,
        processing_status: row.processing_status,
        error_message: row.error_message,
        created_at: row.created_at,
        processed_at: row.processed_at,
        payload,
        headers,
      },
    });
  } catch (err) {
    console.error('[public/babyeyi-pay/admin-webhook-logs/:id]', err);
    return res.status(500).json({ success: false, message: err.message || 'Failed to load webhook log detail' });
  }
});

// POST /api/public/babyeyi-pay/admin-webhook-logs/:id/reconcile
router.post('/admin-webhook-logs/:id/reconcile', requireRole('SUPER_ADMIN', 'FULL_SYSTEM_CONTROLLER'), async (req, res) => {
  try {
    await ensureWebhookLogsTable();
    await ensureIntentTable();
    if (!xentripayEnabled()) {
      return res.status(503).json({ success: false, message: 'XentriPay is not configured on server' });
    }
    const id = Number(req.params.id || 0);
    if (!id) return res.status(400).json({ success: false, message: 'Invalid webhook log id' });
    const [rows] = await db.promisePool.execute(
      `SELECT id, reference_value, intent_id FROM xentripay_webhook_logs WHERE id = ? LIMIT 1`,
      [id]
    );
    const row = rows?.[0];
    if (!row) return res.status(404).json({ success: false, message: 'Webhook log not found' });
    const ref = String(row.reference_value || '').trim();
    if (!ref) return res.status(400).json({ success: false, message: 'Webhook log has no reference' });
    const gatewayResp = await xentripayCheckStatus(ref);
    const raw = String(gatewayResp?.data?.status || gatewayResp?.status || '').trim().toUpperCase();
    const providerStatus = raw || 'PENDING';
    const nextStatus = mapProviderToLocalStatus(providerStatus);
    const [preRec] = await db.promisePool.execute(
      `SELECT payload_json FROM babyeyi_payment_intents
       WHERE id = ? OR provider_reference = ? OR provider_tid = ?
       ORDER BY id DESC LIMIT 1`,
      [row.intent_id || 0, ref, ref]
    );
    let payPlanRec = null;
    try {
      payPlanRec = JSON.parse(preRec?.[0]?.payload_json || '{}')?.payment_plan || null;
    } catch (_) {}
    const invoiceStatusNow = computeInvoiceStatusFromIntentStatus(nextStatus, payPlanRec);

    const [intentUpdate] = await db.promisePool.execute(
      `UPDATE babyeyi_payment_intents
       SET status = ?, provider = 'xentripay', provider_status = ?, provider_payload_json = ?,
           invoice_status = ?, invoice_paid_at = CASE WHEN ? = 'PAID' THEN NOW() ELSE invoice_paid_at END,
           last_provider_check_at = NOW()
       WHERE id = ? OR provider_reference = ? OR provider_tid = ?`,
      [nextStatus, providerStatus, JSON.stringify(gatewayResp || {}), invoiceStatusNow, invoiceStatusNow, row.intent_id || 0, ref, ref]
    );
    const [intentRows] = await db.promisePool.execute(
      `SELECT id FROM babyeyi_payment_intents
       WHERE id = ? OR provider_reference = ? OR provider_tid = ?
       ORDER BY id DESC LIMIT 1`,
      [row.intent_id || 0, ref, ref]
    ).catch(() => [[]]);
    const resolvedIntentId = Number(intentRows?.[0]?.id || row.intent_id || 0) || null;
    await db.promisePool.execute(
      `UPDATE xentripay_webhook_logs
       SET intent_id = ?, matched_intent = ?, processing_status = ?, provider_status = ?, processed_at = NOW(), error_message = NULL
       WHERE id = ?`,
      [
        resolvedIntentId,
        resolvedIntentId ? 1 : 0,
        intentUpdate?.affectedRows ? 'reconciled' : 'no_match',
        providerStatus,
        id,
      ]
    );
    if (resolvedIntentId) {
      notifyInvoiceStatusByIntentId(resolvedIntentId, 'admin_webhook_reconcile').catch((e) => {
        console.warn('[invoice/email] admin webhook reconcile notify failed:', e.message);
      });
    }
    return res.json({
      success: true,
      message: intentUpdate?.affectedRows ? 'Reconciliation complete' : 'No matching intent to reconcile',
      data: {
        webhook_log_id: id,
        intent_id: resolvedIntentId,
        provider_status: providerStatus,
        status: nextStatus,
      },
    });
  } catch (err) {
    console.error('[public/babyeyi-pay/admin-webhook-logs/:id/reconcile]', err);
    await db.promisePool.execute(
      `UPDATE xentripay_webhook_logs SET processing_status = 'error', error_message = ?, processed_at = NOW() WHERE id = ?`,
      [String(err.message || 'Reconciliation failed').slice(0, 255), Number(req.params.id || 0)]
    ).catch(() => {});
    return res.status(500).json({ success: false, message: err.message || 'Failed to reconcile webhook log' });
  }
});

// GET /api/public/babyeyi-pay/admin-intents?search=&page=&limit=
router.get('/admin-intents', requireRole('SUPER_ADMIN', 'FULL_SYSTEM_CONTROLLER'), async (req, res) => {
  try {
    await ensureIntentTable();
    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(req.query.limit) || 10, 1), 100);
    const offset = (page - 1) * limit;
    const { where, params } = buildIntentFilters(req.query);

    const [rows] = await db.promisePool.query(
      `SELECT i.id, i.school_id, i.babyeyi_id, i.total_rwf, i.status, i.created_at,
              i.payer_name, i.payer_phone, i.payer_email,
              i.provider, i.provider_status, i.provider_reference, i.provider_tid, i.last_provider_check_at, i.provider_payload_json,
              i.retry_count, i.last_retry_at,
              s.school_name, s.district, s.sector, b.class_name, b.term, b.academic_year,
              CASE WHEN ${SQL_PAYLOAD_GUEST_FINDER} = 1
                   THEN 'guest_finder' ELSE 'other' END AS pay_channel
       FROM babyeyi_payment_intents i
       LEFT JOIN schools s ON s.id = i.school_id
       LEFT JOIN school_babyeyi b ON b.id = i.babyeyi_id
       ${where}
       ORDER BY i.created_at DESC, i.id DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );
    const mappedRows = (rows || []).map((r) => ({
      ...r,
      provider_error_message: extractProviderErrorMessage(r.provider_payload_json),
      is_guest_finder: String(r.pay_channel || '') === 'guest_finder',
    }));
    const [countRows] = await db.promisePool.query(
      `SELECT COUNT(*) AS total
       FROM babyeyi_payment_intents i
       LEFT JOIN schools s ON s.id = i.school_id
       ${where}`,
      params
    );
    const total = Number(countRows?.[0]?.total || 0);
    return res.json({
      success: true,
      data: mappedRows,
      total,
      page,
      limit,
      totalPages: Math.max(Math.ceil(total / limit), 1),
    });
  } catch (err) {
    console.error('[public/babyeyi-pay/admin-intents]', err);
    return res.status(500).json({ success: false, message: err.message || 'Failed to load payment intents' });
  }
});

// POST /api/public/babyeyi-pay/admin-intents/:id/reconcile-provider
router.post('/admin-intents/:id/reconcile-provider', requireRole('SUPER_ADMIN', 'FULL_SYSTEM_CONTROLLER'), async (req, res) => {
  try {
    await ensureIntentTable();
    const id = Number(req.params.id || 0);
    if (!id) return res.status(400).json({ success: false, message: 'Invalid intent id' });
    if (!xentripayEnabled()) {
      return res.status(503).json({ success: false, message: 'XentriPay is not configured on server' });
    }
    const [rows] = await db.promisePool.execute(
      `SELECT id, provider, provider_reference, provider_tid, provider_payload_json, status, payload_json
       FROM babyeyi_payment_intents
       WHERE id = ?
       LIMIT 1`,
      [id]
    );
    const row = rows?.[0];
    if (!row) return res.status(404).json({ success: false, message: 'Payment intent not found' });
    if (String(row.provider || '').toLowerCase() !== 'xentripay') {
      return res.status(400).json({ success: false, message: 'Intent provider is not xentripay' });
    }
    let ref = String(row.provider_reference || row.provider_tid || '').trim();
    if (!ref) {
      ref = String(extractReferenceFromProviderPayload(row.provider_payload_json) || '').trim();
      if (ref) {
        await db.promisePool.execute(
          `UPDATE babyeyi_payment_intents
           SET provider_reference = COALESCE(NULLIF(provider_reference,''), ?)
           WHERE id = ?`,
          [ref, id]
        ).catch(() => {});
      }
    }
    if (!ref) return res.status(400).json({ success: false, message: 'Intent has no provider reference' });
    const gatewayResp = await xentripayCheckStatus(ref);
    const raw = String(gatewayResp?.data?.status || gatewayResp?.status || '').trim().toUpperCase();
    const providerStatus = raw || 'PENDING';
    const nextStatus = mapProviderToLocalStatus(providerStatus);
    let payPlanAd = null;
    try {
      payPlanAd = JSON.parse(row.payload_json || '{}')?.payment_plan || null;
    } catch (_) {}
    const invoiceStatusNow = computeInvoiceStatusFromIntentStatus(nextStatus, payPlanAd);
    await db.promisePool.execute(
      `UPDATE babyeyi_payment_intents
       SET status = ?, provider_status = ?, provider_payload_json = ?,
           invoice_status = ?, invoice_paid_at = CASE WHEN ? = 'PAID' THEN NOW() ELSE invoice_paid_at END,
           last_provider_check_at = NOW()
       WHERE id = ?`,
      [nextStatus, providerStatus, JSON.stringify(gatewayResp || {}), invoiceStatusNow, invoiceStatusNow, id]
    );
    notifyInvoiceStatusByIntentId(id, 'admin_reconcile_provider').catch((e) => {
      console.warn('[invoice/email] admin reconcile provider notify failed:', e.message);
    });
    return res.json({
      success: true,
      message: 'Intent reconciled',
      data: { id, status: nextStatus, provider_status: providerStatus },
    });
  } catch (err) {
    console.error('[public/babyeyi-pay/admin-intents/:id/reconcile-provider]', err);
    return res.status(500).json({ success: false, message: err.message || 'Failed to reconcile intent' });
  }
});

// POST /api/public/babyeyi-pay/admin-intents/:id/retry-collection
router.post('/admin-intents/:id/retry-collection', requireRole('SUPER_ADMIN', 'FULL_SYSTEM_CONTROLLER'), async (req, res) => {
  try {
    await ensureIntentTable();
    const id = Number(req.params.id || 0);
    if (!id) return res.status(400).json({ success: false, message: 'Invalid intent id' });
    if (!xentripayEnabled()) {
      return res.status(503).json({ success: false, message: 'XentriPay is not configured on server' });
    }
    const [rows] = await db.promisePool.execute(
      `SELECT id, total_rwf, status, payer_name, payer_phone, payer_email,
              provider, provider_status, provider_reference, provider_tid,
              payload_json, retry_count, last_retry_at
       FROM babyeyi_payment_intents
       WHERE id = ?
       LIMIT 1`,
      [id]
    );
    const row = rows?.[0];
    if (!row) return res.status(404).json({ success: false, message: 'Payment intent not found' });
    const provider = String(row.provider || '').toLowerCase();
    if (provider && provider !== 'xentripay') {
      return res.status(400).json({ success: false, message: 'Intent provider is not xentripay' });
    }
    const currentStatus = String(row.status || '').toLowerCase();
    if (currentStatus === 'paid') {
      return res.status(400).json({ success: false, message: 'Payment already paid; retry blocked' });
    }
    if (!['failed', 'submitted'].includes(currentStatus)) {
      return res.status(400).json({ success: false, message: 'Retry is allowed only for failed/submitted intents' });
    }
    const retries = Number(row.retry_count || 0);
    if (retries >= XENTRIPAY_MAX_RETRY) {
      return res.status(429).json({ success: false, message: `Retry limit reached (${XENTRIPAY_MAX_RETRY})` });
    }
    const lastRetryAt = row.last_retry_at ? new Date(row.last_retry_at) : null;
    if (lastRetryAt && Number.isFinite(lastRetryAt.getTime())) {
      const msSince = Date.now() - lastRetryAt.getTime();
      const minMs = XENTRIPAY_RETRY_COOLDOWN_MIN * 60 * 1000;
      if (minMs > 0 && msSince < minMs) {
        const waitSec = Math.ceil((minMs - msSince) / 1000);
        return res.status(429).json({ success: false, message: `Retry cooldown active. Wait ${waitSec}s` });
      }
    }
    const cnumber = normalizeRwandaPhone(row.payer_phone);
    const msisdn = toMsisdn250(row.payer_phone);
    if (!cnumber || !msisdn) {
      return res.status(400).json({ success: false, message: 'Valid Rwanda payer phone is required for retry' });
    }
    const amount = Math.round(Number(row.total_rwf || 0));
    if (!amount || amount < 1) {
      return res.status(400).json({ success: false, message: 'Invalid amount for retry' });
    }
    let payload = {};
    try { payload = JSON.parse(row.payload_json || '{}'); } catch { payload = {}; }
    const payMode = String(payload?.payment_plan?.payMode || '').toLowerCase();
    const method = String(payload?.payment_plan?.method || '').toLowerCase();
    if (payMode === 'loan' || method !== 'momo') {
      return res.status(400).json({ success: false, message: 'Retry collection only supports MoMo full-payment intents' });
    }
    let gateway = null;
    let providerStatus = 'FAILED';
    let nextStatus = 'failed';
    let providerReference = row.provider_reference || null;
    let providerTid = row.provider_tid || null;
    let providerAuthkey = null;
    let providerPayload = null;
    try {
      gateway = await xentripayCollectionInitiate({
        email: row.payer_email || 'payments@babyeyi.local',
        name: row.payer_name || 'Parent',
        amount,
        cnumber,
        msisdn,
      });
      providerStatus = Number(gateway?.success || 0) === 1 ? 'PENDING' : 'FAILED';
      nextStatus = providerStatus === 'FAILED' ? 'failed' : 'submitted';
      providerReference = String(gateway?.refid || '').trim() || providerReference;
      providerTid = String(gateway?.tid || '').trim() || providerTid;
      providerAuthkey = String(gateway?.authkey || '').trim() || null;
      providerPayload = gateway;
    } catch (gatewayErr) {
      providerPayload = { error: gatewayErr?.response?.data || gatewayErr.message || 'Gateway error' };
    }
    await db.promisePool.execute(
      `UPDATE babyeyi_payment_intents
       SET provider = 'xentripay',
           status = ?,
           provider_status = ?,
           provider_reference = ?,
           provider_tid = ?,
           provider_authkey = COALESCE(?, provider_authkey),
           provider_payload_json = ?,
           retry_count = COALESCE(retry_count, 0) + 1,
           last_retry_at = NOW(),
           last_provider_check_at = NOW()
       WHERE id = ?`,
      [nextStatus, providerStatus, providerReference, providerTid, providerAuthkey, JSON.stringify(providerPayload || {}), id]
    );
    return res.json({
      success: true,
      message: providerStatus === 'FAILED' ? 'Retry sent but gateway still failed' : 'Retry sent to gateway',
      data: {
        id,
        status: nextStatus,
        provider_status: providerStatus,
        provider_reference: providerReference,
        provider_tid: providerTid,
      },
    });
  } catch (err) {
    console.error('[public/babyeyi-pay/admin-intents/:id/retry-collection]', err);
    return res.status(500).json({ success: false, message: err.message || 'Failed to retry collection' });
  }
});

// GET /api/public/babyeyi-pay/admin-intents/filters
router.get('/admin-intents/filters', requireRole('SUPER_ADMIN', 'FULL_SYSTEM_CONTROLLER'), async (_req, res) => {
  try {
    await ensureIntentTable();
    const district = String(_req.query?.district || '').trim();
    const sector = String(_req.query?.sector || '').trim();
    const schoolFilter = [];
    const schoolParams = [];
    if (district) {
      schoolFilter.push('COALESCE(s.district, \'\') = ?');
      schoolParams.push(district);
    }
    if (sector) {
      schoolFilter.push('COALESCE(s.sector, \'\') = ?');
      schoolParams.push(sector);
    }
    const schoolWhere = schoolFilter.length ? `AND ${schoolFilter.join(' AND ')}` : '';
    const [districtRows] = await db.promisePool.execute(
      `SELECT DISTINCT COALESCE(s.district, '') AS district
       FROM babyeyi_payment_intents i
       LEFT JOIN schools s ON s.id = i.school_id
       WHERE COALESCE(s.district, '') <> ''
       ORDER BY district ASC`
    );
    const [sectorRows] = await db.promisePool.execute(
      `SELECT DISTINCT COALESCE(s.sector, '') AS sector
       FROM babyeyi_payment_intents i
       LEFT JOIN schools s ON s.id = i.school_id
       WHERE COALESCE(s.sector, '') <> ''
       ORDER BY sector ASC`
    );
    const [schoolRows] = await db.promisePool.execute(
      `SELECT DISTINCT s.id, s.school_name, s.district, s.sector
       FROM babyeyi_payment_intents i
       LEFT JOIN schools s ON s.id = i.school_id
       WHERE s.id IS NOT NULL ${schoolWhere}
       ORDER BY s.school_name ASC`,
      schoolParams
    );
    return res.json({
      success: true,
      data: {
        districts: districtRows.map((r) => r.district).filter(Boolean),
        sectors: sectorRows.map((r) => r.sector).filter(Boolean),
        schools: schoolRows || [],
      },
    });
  } catch (err) {
    console.error('[public/babyeyi-pay/admin-intents/filters]', err);
    return res.status(500).json({ success: false, message: 'Failed to load payment filters' });
  }
});

// GET /api/public/babyeyi-pay/admin-intents/export.csv
router.get('/admin-intents/export.csv', requireRole('SUPER_ADMIN', 'FULL_SYSTEM_CONTROLLER'), async (req, res) => {
  try {
    await ensureIntentTable();
    const { where, params } = buildIntentFilters(req.query || {});
    const [rows] = await db.promisePool.execute(
      `SELECT i.id, i.created_at, i.status, i.total_rwf,
              i.payer_name, i.payer_phone, i.payer_email,
              s.school_name, s.district, s.sector, b.class_name, b.term, b.academic_year,
              CASE WHEN ${SQL_PAYLOAD_GUEST_FINDER} = 1
                   THEN 'guest_finder' ELSE 'other' END AS pay_channel
       FROM babyeyi_payment_intents i
       LEFT JOIN schools s ON s.id = i.school_id
       LEFT JOIN school_babyeyi b ON b.id = i.babyeyi_id
       ${where}
       ORDER BY i.created_at DESC, i.id DESC`,
      params
    );
    const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const header = [
      'id', 'created_at', 'status', 'total_rwf',
      'payer_name', 'payer_phone', 'payer_email',
      'school_name', 'district', 'sector', 'class_name', 'term', 'academic_year',
      'pay_channel',
    ];
    const lines = [header.map(esc).join(',')];
    (rows || []).forEach((r) => {
      lines.push([
        r.id, r.created_at, r.status, r.total_rwf,
        r.payer_name, r.payer_phone, r.payer_email,
        r.school_name, r.district, r.sector, r.class_name, r.term, r.academic_year,
        r.pay_channel || 'other',
      ].map(esc).join(','));
    });
    const csv = `\uFEFF${lines.join('\n')}\n`;
    const today = new Date().toISOString().slice(0, 10);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="who-is-paying-${today}.csv"`);
    return res.status(200).send(csv);
  } catch (err) {
    console.error('[public/babyeyi-pay/admin-intents/export.csv]', err);
    return res.status(500).json({ success: false, message: 'Failed to export intents csv' });
  }
});

// GET /api/public/babyeyi-pay/admin-intents/:id/detail
router.get('/admin-intents/:id/detail', requireRole('SUPER_ADMIN', 'FULL_SYSTEM_CONTROLLER'), async (req, res) => {
  try {
    await ensureIntentTable();
    await ensureLoanRepaymentTable();
    const id = Number(req.params.id || 0);
    if (!id) return res.status(400).json({ success: false, message: 'Invalid intent id' });
    const [rows] = await db.promisePool.execute(
      `SELECT i.*, s.school_name, s.district, s.sector,
              b.class_name, b.term, b.academic_year
       FROM babyeyi_payment_intents i
       LEFT JOIN schools s ON s.id = i.school_id
       LEFT JOIN school_babyeyi b ON b.id = i.babyeyi_id
       WHERE i.id = ?
       LIMIT 1`,
      [id]
    );
    const intent = rows?.[0];
    if (!intent) return res.status(404).json({ success: false, message: 'Payment intent not found' });
    let payload = {};
    try { payload = JSON.parse(intent.payload_json || '{}'); } catch { payload = {}; }
    const feeIds = Array.isArray(payload.selected_fee_ids) ? payload.selected_fee_ids : [];
    const reqIds = Array.isArray(payload.selected_requirement_ids) ? payload.selected_requirement_ids : [];

    let fees = [];
    if (feeIds.length > 0) {
      let metaRow = null;
      try {
        const [metaRows] = await db.promisePool.execute(
          `SELECT id, school_id, academic_year, term, class_name, status, total_fee
           FROM school_babyeyi WHERE id = ? LIMIT 1`,
          [intent.babyeyi_id]
        );
        metaRow = metaRows?.[0] || null;
      } catch (_) {
        metaRow = null;
      }
      if (metaRow) {
        fees = await loadFeesForSelection(intent.babyeyi_id, feeIds, metaRow);
      }
    }
    let requirements = [];
    if (reqIds.length > 0) {
      const ph = reqIds.map(() => '?').join(',');
      const [reqRows] = await db.promisePool.execute(
        `SELECT bsr.id AS babyeyi_requirement_id, bsr.item AS requirement_name, bsr.description, bsr.quantity,
                COALESCE(rp.price, sr.default_price, bsr.cost, 0) AS unit_price
         FROM babyeyi_student_requirements bsr
         LEFT JOIN requirement_prices rp ON rp.babyeyi_id = bsr.babyeyi_id AND rp.babyeyi_requirement_id = bsr.id
         ${SQL_JOIN_STUDENT_REQ_BY_ITEM}
         WHERE bsr.babyeyi_id = ? AND bsr.id IN (${ph})
         ORDER BY bsr.sort_order, bsr.id`,
        [intent.babyeyi_id, ...reqIds]
      );
      requirements = (reqRows || []).map((r) => {
        const qty = parseRequirementQuantity(r.quantity);
        const unit = Number(r.unit_price || 0);
        const line = Math.round(unit * qty * 100) / 100;
        return { ...r, quantity_value: qty, unit_price_rwf: unit, line_total_rwf: line };
      });
    }

    const feesTotal = fees.reduce((s, f) => s + Number(f.amount || 0), 0);
    const reqTotal = requirements.reduce((s, r) => s + Number(r.line_total_rwf || 0), 0);
    const selectedTotal = Math.round((feesTotal + reqTotal) * 100) / 100;
    const intentTotal = Number(intent.total_rwf || 0);
    const [repRows] = await db.promisePool.execute(
      `SELECT id, receipt_no, amount_rwf, status, paid_by_phone, note, reviewed_by, reviewed_at, created_at
       FROM babyeyi_loan_repayments
       WHERE intent_id = ?
       ORDER BY created_at DESC, id DESC`,
      [id]
    ).catch(() => [[]]);
    const repayments = repRows || [];
    const loanPaid = repayments.reduce((s, r) => s + (String(r.status || '').toLowerCase() === 'approved' ? Number(r.amount_rwf || 0) : 0), 0);
    const loanPending = repayments.reduce((s, r) => s + (String(r.status || '').toLowerCase() === 'pending' ? Number(r.amount_rwf || 0) : 0), 0);
    const plan = buildLoanPlan(intentTotal, payload, intent.created_at);
    const loanTotalDue = Number(plan.total_due_rwf || 0);
    const remainingByLoan = Math.max(0, Math.round((loanTotalDue - loanPaid) * 100) / 100);
    const remaining = payload?.payment_plan?.payMode === 'loan'
      ? remainingByLoan
      : (String(intent.status || '').toLowerCase() === 'paid' ? 0 : intentTotal);
    const resolvedStudent = payload?.selected_student
      || payload?.student
      || payload?.pricingSnapshot?.student
      || (payload?.childName ? { student_name: payload.childName } : null);

    return res.json({
      success: true,
      data: {
        intent: {
          id: intent.id,
          status: intent.status,
          total_rwf: intentTotal,
          created_at: intent.created_at,
          payer_name: intent.payer_name,
          payer_phone: intent.payer_phone,
          payer_email: intent.payer_email,
          school_name: intent.school_name,
          district: intent.district,
          sector: intent.sector,
          class_name: intent.class_name,
          term: intent.term,
          academic_year: intent.academic_year,
          provider: intent.provider || null,
          provider_status: intent.provider_status || null,
          provider_reference: intent.provider_reference || null,
          provider_tid: intent.provider_tid || null,
          last_provider_check_at: intent.last_provider_check_at || null,
          provider_error_message: extractProviderErrorMessage(intent.provider_payload_json),
        },
        selected_fees: fees,
        selected_requirements: requirements,
        totals: {
          selected_fees_rwf: Math.round(feesTotal * 100) / 100,
          selected_requirements_rwf: Math.round(reqTotal * 100) / 100,
          selected_total_rwf: selectedTotal,
          intent_total_rwf: intentTotal,
          remaining_rwf: Math.round(remaining * 100) / 100,
        },
        loan: payload?.payment_plan?.payMode === 'loan'
          ? {
              pay_mode: 'loan',
              months: payload?.payment_plan?.loanMonths || null,
              frequency: payload?.payment_plan?.loanFreq || null,
              income_bracket: payload?.payment_plan?.incomeId || null,
              summary: payload?.payment_plan?.loanSummary || null,
              total_due_rwf: loanTotalDue,
              paid_rwf: Math.round(loanPaid * 100) / 100,
              pending_rwf: Math.round(loanPending * 100) / 100,
              remaining_rwf: remainingByLoan,
              extension_months: Number(plan.extension_months || 0),
              due_date: plan.due_date,
              overdue_months: Number(plan.overdue_months || 0),
              overdue_extra_rwf: Number(plan.overdue_extra_rwf || 0),
              monthly_installment_rwf: Number(plan.monthly_installment_rwf || 0),
              repayment_count: repayments.length,
              repayments,
              applicant: payload?.payment_plan?.loan_request
                ? {
                    bank_code: payload?.payment_plan?.loan_request?.bankCode || null,
                    bank_name: payload?.payment_plan?.loan_request?.bankName || null,
                    account_name: payload?.payment_plan?.loan_request?.applicantName || null,
                    account_number: payload?.payment_plan?.loan_request?.accountNumber || null,
                    national_id: payload?.payment_plan?.loan_request?.nationalId || null,
                  }
                : null,
            }
          : null,
        student: resolvedStudent,
      },
    });
  } catch (err) {
    console.error('[public/babyeyi-pay/admin-intents/:id/detail]', err);
    return res.status(500).json({ success: false, message: err.message || 'Failed to load payment detail' });
  }
});

// PUT /api/public/babyeyi-pay/admin-intents/:id/status
// Super admin updates payment intent lifecycle status.
router.put('/admin-intents/:id/status', requireRole('SUPER_ADMIN', 'FULL_SYSTEM_CONTROLLER'), async (req, res) => {
  try {
    await ensureIntentTable();
    const id = Number(req.params.id || 0);
    const status = String(req.body?.status || '').trim().toLowerCase();
    if (!id) {
      return res.status(400).json({ success: false, message: 'Invalid intent id' });
    }
    if (!VALID_INTENT_STATUSES.has(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status. Use submitted, paid, failed.' });
    }
    const [[prevIntent]] = await db.promisePool.execute(
      `SELECT payload_json FROM babyeyi_payment_intents WHERE id = ? LIMIT 1`,
      [id]
    );
    let payPlanAdm = null;
    try {
      payPlanAdm = JSON.parse(prevIntent?.payload_json || '{}')?.payment_plan || null;
    } catch (_) {}
    const invStAdm = computeInvoiceStatusFromIntentStatus(status, payPlanAdm);
    const [result] = await db.promisePool.execute(
      `UPDATE babyeyi_payment_intents
       SET status = ?,
           invoice_status = ?,
           invoice_paid_at = CASE WHEN ? = 'PAID' THEN NOW() ELSE invoice_paid_at END
       WHERE id = ?`,
      [status, invStAdm, invStAdm, id]
    );
    if (!result?.affectedRows) {
      return res.status(404).json({ success: false, message: 'Payment intent not found' });
    }
    const [rows] = await db.promisePool.execute(
      `SELECT id, status, updated_at, created_at FROM babyeyi_payment_intents WHERE id = ? LIMIT 1`,
      [id]
    ).catch(() => [[]]);
    notifyInvoiceStatusByIntentId(id, 'admin_manual_status').catch((e) => {
      console.warn('[invoice/email] admin manual status notify failed:', e.message);
    });
    return res.json({ success: true, message: 'Status updated', data: rows?.[0] || { id, status } });
  } catch (err) {
    console.error('[public/babyeyi-pay/admin-intents/:id/status]', err);
    return res.status(500).json({ success: false, message: err.message || 'Failed to update status' });
  }
});

// PUT /api/public/babyeyi-pay/admin-loan-repayments/:id/review
router.put('/admin-loan-repayments/:id/review', requireRole('SUPER_ADMIN', 'FULL_SYSTEM_CONTROLLER'), async (req, res) => {
  try {
    await ensureIntentTable();
    await ensureLoanRepaymentTable();
    const id = Number(req.params.id || 0);
    const status = String(req.body?.status || '').trim().toLowerCase();
    const note = String(req.body?.note || '').trim().slice(0, 255);
    if (!id) return res.status(400).json({ success: false, message: 'Invalid repayment id' });
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Use approved or rejected status' });
    }
    const [rows] = await db.promisePool.execute(
      `SELECT lr.id, lr.intent_id, i.total_rwf, i.payload_json, i.created_at
       FROM babyeyi_loan_repayments lr
       INNER JOIN babyeyi_payment_intents i ON i.id = lr.intent_id
       WHERE lr.id = ?
       LIMIT 1`,
      [id]
    );
    const row = rows?.[0];
    if (!row) return res.status(404).json({ success: false, message: 'Repayment not found' });

    const reviewer = String(req.session?.user?.id || req.session?.user?.email || 'super_admin');
    await db.promisePool.execute(
      `UPDATE babyeyi_loan_repayments
       SET status = ?, reviewed_by = ?, reviewed_at = NOW(), note = COALESCE(NULLIF(?, ''), note)
       WHERE id = ?`,
      [status, reviewer, note, id]
    );

    let payload = {};
    try { payload = JSON.parse(row.payload_json || '{}'); } catch { payload = {}; }
    const plan = buildLoanPlan(row.total_rwf, payload, row.created_at);
    const [sumRows] = await db.promisePool.execute(
      `SELECT COALESCE(SUM(CASE WHEN LOWER(COALESCE(status,'pending'))='approved' THEN amount_rwf ELSE 0 END),0) AS paid
       FROM babyeyi_loan_repayments
       WHERE intent_id = ?`,
      [row.intent_id]
    );
    const paid = Number(sumRows?.[0]?.paid || 0);
    const remaining = Math.max(0, Math.round((Number(plan.total_due_rwf || 0) - paid) * 100) / 100);
    const nextIntentStatus = remaining <= 0 ? 'paid' : 'submitted';
    const invoiceStatusNow = computeInvoiceStatusFromIntentStatus(nextIntentStatus, payload.payment_plan);
    await db.promisePool.execute(
      `UPDATE babyeyi_payment_intents
       SET status = ?, invoice_status = ?, invoice_paid_at = CASE WHEN ? = 'PAID' THEN NOW() ELSE invoice_paid_at END
       WHERE id = ?`,
      [nextIntentStatus, invoiceStatusNow, invoiceStatusNow, row.intent_id]
    );
    notifyInvoiceStatusByIntentId(row.intent_id, 'loan_review').catch((e) => {
      console.warn('[invoice/email] loan review notify failed:', e.message);
    });

    return res.json({
      success: true,
      message: `Repayment ${status}`,
      data: {
        repayment_id: id,
        intent_id: row.intent_id,
        repayment_status: status,
        intent_status: nextIntentStatus,
        paid_rwf: paid,
        remaining_rwf: remaining,
      },
    });
  } catch (err) {
    console.error('[public/babyeyi-pay/admin-loan-repayments/:id/review]', err);
    return res.status(500).json({ success: false, message: err.message || 'Failed to review repayment' });
  }
});

// PUT /api/public/babyeyi-pay/admin-intents/:id/loan-extension
router.put('/admin-intents/:id/loan-extension', requireRole('SUPER_ADMIN', 'FULL_SYSTEM_CONTROLLER'), async (req, res) => {
  try {
    await ensureIntentTable();
    const id = Number(req.params.id || 0);
    const extensionMonths = Math.max(0, Number(req.body?.extension_months || 0));
    if (!id) return res.status(400).json({ success: false, message: 'Invalid intent id' });
    const [rows] = await db.promisePool.execute(
      `SELECT id, payload_json FROM babyeyi_payment_intents WHERE id = ? LIMIT 1`,
      [id]
    );
    const row = rows?.[0];
    if (!row) return res.status(404).json({ success: false, message: 'Payment intent not found' });
    let payload = {};
    try { payload = JSON.parse(row.payload_json || '{}'); } catch { payload = {}; }
    payload.payment_plan = payload.payment_plan || {};
    payload.payment_plan.extensionMonths = extensionMonths;
    await db.promisePool.execute(
      `UPDATE babyeyi_payment_intents SET payload_json = ? WHERE id = ?`,
      [JSON.stringify(payload), id]
    );
    return res.json({ success: true, message: 'Loan extension updated', data: { id, extension_months: extensionMonths } });
  } catch (err) {
    console.error('[public/babyeyi-pay/admin-intents/:id/loan-extension]', err);
    return res.status(500).json({ success: false, message: err.message || 'Failed to update loan extension' });
  }
});

// POST /api/public/babyeyi-pay/admin-invoices/reminders/run
// Triggers unpaid reminders for invoices at 7 days, 3 days, and due day.
router.post('/admin-invoices/reminders/run', requireRole('SUPER_ADMIN', 'FULL_SYSTEM_CONTROLLER', 'SCHOOL_ADMIN', 'SCHOOL_MANAGER', 'ACCOUNTANT'), async (req, res) => {
  try {
    await ensureIntentTable();
    await ensureInvoiceReminderLogTable();
    const role = String(req.user?.role_code || '').toUpperCase();
    const userSchoolId = Number(req.user?.school_id || 0);
    const schoolScoped = ['SCHOOL_ADMIN', 'SCHOOL_MANAGER', 'ACCOUNTANT'].includes(role);
    const schoolId = schoolScoped ? userSchoolId : Number(req.body?.school_id || req.query?.school_id || 0);

    const whereSchool = schoolId ? 'AND i.school_id = ?' : '';
    const params = schoolId ? [schoolId] : [];
    const [rows] = await db.promisePool.execute(
      `SELECT i.id, i.invoice_no, i.invoice_status, i.invoice_due_at, i.total_rwf, i.payer_name, i.payer_phone, i.payer_email,
              s.school_name,
              JSON_UNQUOTE(JSON_EXTRACT(i.payload_json, '$.selected_student.student_name')) AS student_name,
              DATEDIFF(DATE(i.invoice_due_at), CURDATE()) AS days_to_due
       FROM babyeyi_payment_intents i
       LEFT JOIN schools s ON s.id = i.school_id
       WHERE UPPER(COALESCE(i.invoice_status, 'NOT_PAID')) = 'NOT_PAID'
         AND i.invoice_due_at IS NOT NULL
         ${whereSchool}
       ORDER BY i.invoice_due_at ASC, i.id ASC`,
      params
    );

    let scanned = 0;
    let sent = 0;
    let skipped = 0;
    for (const row of rows || []) {
      scanned += 1;
      const d = Number(row.days_to_due);
      const stage = d === 7 ? 'D7' : d === 3 ? 'D3' : d === 0 ? 'DUE' : null;
      if (!stage) continue;
      const [existing] = await db.promisePool.execute(
        `SELECT id FROM babyeyi_invoice_reminder_logs WHERE intent_id = ? AND reminder_stage = ? LIMIT 1`,
        [row.id, stage]
      );
      if (existing?.length) {
        skipped += 1;
        continue;
      }
      const result = await sendUnpaidReminderForIntent(row, stage === 'DUE' ? 'DUE' : stage.slice(1));
      await db.promisePool.execute(
        `INSERT INTO babyeyi_invoice_reminder_logs (intent_id, reminder_stage, sent_sms, sent_email)
         VALUES (?, ?, ?, ?)`,
        [row.id, stage, result.sms ? 1 : 0, result.email ? 1 : 0]
      );
      if (result.sent) sent += 1;
      else skipped += 1;
    }

    return res.json({
      success: true,
      message: 'Reminder run completed',
      scanned,
      sent,
      skipped,
    });
  } catch (err) {
    console.error('[public/babyeyi-pay/admin-invoices/reminders/run]', err);
    return res.status(500).json({ success: false, message: err.message || 'Failed to run reminders' });
  }
});

// GET /api/public/babyeyi-pay/invoices
// Roles: SUPER_ADMIN, FULL_SYSTEM_CONTROLLER, SCHOOL_ADMIN, SCHOOL_MANAGER, ACCOUNTANT
router.post('/invoices', requireRole('SUPER_ADMIN', 'FULL_SYSTEM_CONTROLLER', 'SCHOOL_ADMIN', 'SCHOOL_MANAGER', 'ACCOUNTANT'), async (req, res) => {
  try {
    await ensureIntentTable();
    const role = String(req.user?.role_code || '').toUpperCase();
    const userSchoolId = Number(req.user?.school_id || 0);
    const scopedSchoolId = ['SCHOOL_ADMIN', 'SCHOOL_MANAGER', 'ACCOUNTANT'].includes(role)
      ? userSchoolId
      : Number(req.body?.school_id || 0);
    if (!scopedSchoolId) return res.status(400).json({ success: false, message: 'school_id is required' });

    const body = req.body || {};
    const billTo = body.bill_to || {};
    const dueDateRaw = String(body.due_date || '').trim();
    const dueDate = dueDateRaw ? new Date(dueDateRaw) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    if (Number.isNaN(dueDate.getTime())) {
      return res.status(400).json({ success: false, message: 'due_date is invalid' });
    }

    const inputItems = Array.isArray(body.items) ? body.items : [];
    const items = inputItems
      .map((it) => ({
        id: String(it.id || ''),
        name: String(it.name || '').trim(),
        qty: Math.max(0, Number(it.qty || 0)),
        unitPrice: Math.max(0, Number(it.unitPrice ?? it.unit_price ?? 0)),
      }))
      .filter((it) => it.name && it.qty > 0);
    if (!items.length) {
      return res.status(400).json({ success: false, message: 'At least one invoice item is required' });
    }
    const subTotal = items.reduce((s, it) => s + (Number(it.qty) * Number(it.unitPrice)), 0);
    const taxRate = Math.max(0, Number(body.tax_rate || 0));
    const total = Math.round(subTotal + (subTotal * taxRate));

    const payloadJson = {
      selected_student: {
        student_name: String(billTo.name || '').trim() || 'Student',
        student_uid: String(billTo.uid || '').trim() || '',
        student_code: String(billTo.uid || '').trim() || '',
      },
      accountant_portal_invoice: {
        bill_to_class: String(billTo.class || '').trim() || '',
        items,
        taxRate,
        notes: String(body.notes || '').trim() || '',
      },
      payment_plan: {
        method: 'invoice',
      },
    };

    const payerName = String(billTo.name || '').trim() || 'Parent';
    const payerEmail = String(body.payer_email || '').trim() || null;
    const payerPhone = String(body.payer_phone || '').trim() || null;
    const babyeyiId = Number(body.babyeyi_id || 0);
    const [insertRes] = await db.promisePool.execute(
      `INSERT INTO babyeyi_payment_intents
       (school_id, babyeyi_id, payload_json, total_rwf, payer_name, payer_phone, payer_email, status, invoice_status, invoice_due_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'draft', 'NOT_PAID', ?)`,
      [scopedSchoolId, babyeyiId, JSON.stringify(payloadJson), total, payerName, payerPhone, payerEmail, dueDate]
    );
    const id = Number(insertRes?.insertId || 0);
    const invoiceNo = makeInvoiceNo(id);
    await db.promisePool.execute(`UPDATE babyeyi_payment_intents SET invoice_no = ? WHERE id = ?`, [invoiceNo, id]);

    return res.status(201).json({
      success: true,
      message: 'Invoice created',
      data: { id, invoice_no: invoiceNo },
    });
  } catch (err) {
    console.error('[public/babyeyi-pay/invoices POST]', err);
    return res.status(500).json({ success: false, message: err.message || 'Failed to create invoice' });
  }
});

router.get('/invoices', requireRole('SUPER_ADMIN', 'FULL_SYSTEM_CONTROLLER', 'SCHOOL_ADMIN', 'SCHOOL_MANAGER', 'ACCOUNTANT'), async (req, res) => {
  try {
    await ensureIntentTable();
    const role = String(req.user?.role_code || '').toUpperCase();
    const userSchoolId = Number(req.user?.school_id || 0);
    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 500);
    const offset = (page - 1) * limit;
    const student = String(req.query.student || '').trim();
    const email = String(req.query.email || '').trim();

    const scopedSchoolId = ['SCHOOL_ADMIN', 'SCHOOL_MANAGER', 'ACCOUNTANT'].includes(role)
      ? (userSchoolId || -1)
      : Number(req.query.school_id || 0);
    const { where: finalWhere, params: finalParams } = buildInvoiceFilters(
      { ...req.query, student, email },
      { schoolId: scopedSchoolId }
    );

    const [rows] = await db.promisePool.query(
      `SELECT i.id, i.invoice_no, i.invoice_status, i.invoice_paid_at, i.invoice_sent_at, i.created_at,
              i.status, i.total_rwf, i.payer_name, i.payer_phone, i.payer_email,
              i.school_id, i.babyeyi_id, i.provider, i.provider_status,
              s.school_name, s.district, s.sector,
              b.class_name, b.term, b.academic_year,
              JSON_UNQUOTE(JSON_EXTRACT(i.payload_json, '$.selected_student.student_name')) AS student_name,
              JSON_UNQUOTE(JSON_EXTRACT(i.payload_json, '$.selected_student.student_uid')) AS student_uid,
              JSON_UNQUOTE(JSON_EXTRACT(i.payload_json, '$.selected_student.student_code')) AS student_code,
              JSON_UNQUOTE(JSON_EXTRACT(i.payload_json, '$.selected_student.sdm_code')) AS sdm_code
       FROM babyeyi_payment_intents i
       LEFT JOIN schools s ON s.id = i.school_id
       LEFT JOIN school_babyeyi b ON b.id = i.babyeyi_id
       ${finalWhere}
       ORDER BY i.created_at DESC, i.id DESC
       LIMIT ? OFFSET ?`,
      [...finalParams, limit, offset]
    );
    const [countRows] = await db.promisePool.query(
      `SELECT COUNT(*) AS total
       FROM babyeyi_payment_intents i
       LEFT JOIN schools s ON s.id = i.school_id
       LEFT JOIN school_babyeyi b ON b.id = i.babyeyi_id
       ${finalWhere}`,
      finalParams
    );
    const total = Number(countRows?.[0]?.total || 0);
    return res.json({
      success: true,
      data: rows || [],
      total,
      page,
      limit,
      totalPages: Math.max(Math.ceil(total / limit), 1),
    });
  } catch (err) {
    console.error('[public/babyeyi-pay/invoices]', err);
    return res.status(500).json({ success: false, message: err.message || 'Failed to load invoices' });
  }
});

router.patch('/invoices/:id', requireRole('SUPER_ADMIN', 'FULL_SYSTEM_CONTROLLER', 'SCHOOL_ADMIN', 'SCHOOL_MANAGER', 'ACCOUNTANT'), async (req, res) => {
  try {
    await ensureIntentTable();
    const id = Number(req.params.id || 0);
    if (!id) return res.status(400).json({ success: false, message: 'Invalid invoice id' });
    const role = String(req.user?.role_code || '').toUpperCase();
    const userSchoolId = Number(req.user?.school_id || 0);
    const scopeForSchoolRoles = ['SCHOOL_ADMIN', 'SCHOOL_MANAGER', 'ACCOUNTANT'].includes(role);

    const [[row]] = await db.promisePool.execute(
      `SELECT id, school_id, invoice_status, invoice_due_at, payload_json, total_rwf, status
       FROM babyeyi_payment_intents
       WHERE id = ?
       LIMIT 1`,
      [id]
    );
    if (!row) return res.status(404).json({ success: false, message: 'Invoice not found' });
    if (scopeForSchoolRoles && Number(row.school_id || 0) !== userSchoolId) {
      return res.status(403).json({ success: false, message: 'Access denied for this school invoice' });
    }

    const action = String(req.body?.action || '').trim().toLowerCase();
    if (action === 'mark_paid') {
      await db.promisePool.execute(
        `UPDATE babyeyi_payment_intents
         SET status = 'paid',
             invoice_status = 'PAID',
             invoice_paid_at = NOW(),
             provider_status = COALESCE(provider_status, 'SUCCESS')
         WHERE id = ?`,
        [id]
      );
      notifyInvoiceStatusByIntentId(id, 'intent_updated').catch(() => {});
      return res.json({ success: true, message: 'Invoice marked as paid' });
    }
    if (action === 'mark_sent') {
      await db.promisePool.execute(
        `UPDATE babyeyi_payment_intents
         SET status = CASE WHEN status = 'draft' THEN 'sent' ELSE status END,
             invoice_sent_at = NOW()
         WHERE id = ?`,
        [id]
      );
      notifyInvoiceStatusByIntentId(id, 'intent_updated').catch(() => {});
      return res.json({ success: true, message: 'Invoice marked as sent' });
    }

    const dueDateRaw = String(req.body?.due_date || '').trim();
    const notesRaw = req.body?.notes;
    const body = req.body || {};
    const billTo = body.bill_to || {};
    const canEdit = String(row.invoice_status || 'NOT_PAID').toUpperCase() !== 'PAID';
    if (!canEdit) {
      return res.status(409).json({ success: false, message: 'Paid invoice cannot be edited' });
    }

    let payload = {};
    try {
      payload = row.payload_json ? JSON.parse(row.payload_json) : {};
    } catch {
      payload = {};
    }
    const ap = payload.accountant_portal_invoice || {};
    const nextItemsInput = Array.isArray(body.items) ? body.items : (Array.isArray(ap.items) ? ap.items : []);
    const nextItems = nextItemsInput
      .map((it) => ({
        id: String(it.id || ''),
        name: String(it.name || '').trim(),
        qty: Math.max(0, Number(it.qty || 0)),
        unitPrice: Math.max(0, Number(it.unitPrice ?? it.unit_price ?? 0)),
      }))
      .filter((it) => it.name && it.qty > 0);
    if (!nextItems.length) return res.status(400).json({ success: false, message: 'At least one invoice item is required' });

    const taxRate = Math.max(0, Number(body.tax_rate ?? ap.taxRate ?? ap.tax_rate ?? 0));
    const subTotal = nextItems.reduce((s, it) => s + (Number(it.qty) * Number(it.unitPrice)), 0);
    const total = Math.round(subTotal + (subTotal * taxRate));
    const dueDate = dueDateRaw ? new Date(dueDateRaw) : (row.invoice_due_at ? new Date(row.invoice_due_at) : new Date());
    if (Number.isNaN(dueDate.getTime())) return res.status(400).json({ success: false, message: 'due_date is invalid' });

    const studentName = String(billTo.name || payload?.selected_student?.student_name || '').trim() || 'Student';
    const studentUid = String(billTo.uid || payload?.selected_student?.student_uid || '').trim();
    const studentClass = String(billTo.class || ap.bill_to_class || '').trim();
    const notes = notesRaw == null ? String(ap.notes || '') : String(notesRaw || '');
    payload.selected_student = {
      ...(payload.selected_student || {}),
      student_name: studentName,
      student_uid: studentUid,
      student_code: studentUid,
    };
    payload.accountant_portal_invoice = {
      ...(payload.accountant_portal_invoice || {}),
      bill_to_class: studentClass,
      items: nextItems,
      taxRate,
      notes,
    };

    await db.promisePool.execute(
      `UPDATE babyeyi_payment_intents
       SET payload_json = ?, total_rwf = ?, payer_name = ?, invoice_due_at = ?
       WHERE id = ?`,
      [JSON.stringify(payload), total, studentName, dueDate, id]
    );
    return res.json({ success: true, message: 'Invoice updated' });
  } catch (err) {
    console.error('[public/babyeyi-pay/invoices/:id PATCH]', err);
    return res.status(500).json({ success: false, message: err.message || 'Failed to update invoice' });
  }
});

router.delete('/invoices/:id', requireRole('SUPER_ADMIN', 'FULL_SYSTEM_CONTROLLER', 'SCHOOL_ADMIN', 'SCHOOL_MANAGER', 'ACCOUNTANT'), async (req, res) => {
  try {
    await ensureIntentTable();
    const id = Number(req.params.id || 0);
    if (!id) return res.status(400).json({ success: false, message: 'Invalid invoice id' });
    const role = String(req.user?.role_code || '').toUpperCase();
    const userSchoolId = Number(req.user?.school_id || 0);
    const scopeForSchoolRoles = ['SCHOOL_ADMIN', 'SCHOOL_MANAGER', 'ACCOUNTANT'].includes(role);

    const [[row]] = await db.promisePool.execute(
      `SELECT id, school_id, invoice_status
       FROM babyeyi_payment_intents
       WHERE id = ?
       LIMIT 1`,
      [id]
    );
    if (!row) return res.status(404).json({ success: false, message: 'Invoice not found' });
    if (scopeForSchoolRoles && Number(row.school_id || 0) !== userSchoolId) {
      return res.status(403).json({ success: false, message: 'Access denied for this school invoice' });
    }
    if (String(row.invoice_status || '').toUpperCase() === 'PAID') {
      return res.status(409).json({ success: false, message: 'Paid invoice cannot be deleted' });
    }

    await db.promisePool.execute(`DELETE FROM babyeyi_loan_repayments WHERE intent_id = ?`, [id]).catch(() => {});
    await db.promisePool.execute(`DELETE FROM babyeyi_invoice_reminder_logs WHERE intent_id = ?`, [id]).catch(() => {});
    await db.promisePool.execute(`DELETE FROM babyeyi_payment_intents WHERE id = ?`, [id]);
    return res.json({ success: true, message: 'Invoice deleted' });
  } catch (err) {
    console.error('[public/babyeyi-pay/invoices/:id DELETE]', err);
    return res.status(500).json({ success: false, message: err.message || 'Failed to delete invoice' });
  }
});

router.get('/invoices/:id/detail', requireRole('SUPER_ADMIN', 'FULL_SYSTEM_CONTROLLER', 'SCHOOL_ADMIN', 'SCHOOL_MANAGER', 'ACCOUNTANT'), async (req, res) => {
  try {
    await ensureIntentTable();
    await ensureLoanRepaymentTable();
    const id = Number(req.params.id || 0);
    if (!id) return res.status(400).json({ success: false, message: 'Invalid invoice id' });
    const role = String(req.user?.role_code || '').toUpperCase();
    const userSchoolId = Number(req.user?.school_id || 0);
    const scopeForSchoolRoles = ['SCHOOL_ADMIN', 'SCHOOL_MANAGER', 'ACCOUNTANT'].includes(role);
    const bundle = await getInvoiceDetailBundleById(id);
    if (!bundle) return res.status(404).json({ success: false, message: 'Invoice not found' });
    if (scopeForSchoolRoles && Number(bundle.intent.school_id || 0) !== userSchoolId) {
      return res.status(403).json({ success: false, message: 'Access denied for this school invoice' });
    }
    return res.json({ success: true, data: bundle });
  } catch (err) {
    console.error('[public/babyeyi-pay/invoices/:id/detail]', err);
    return res.status(500).json({ success: false, message: err.message || 'Failed to load invoice detail' });
  }
});

router.get('/invoices/:id/print.pdf', requireRole('SUPER_ADMIN', 'FULL_SYSTEM_CONTROLLER', 'SCHOOL_ADMIN', 'SCHOOL_MANAGER', 'ACCOUNTANT'), async (req, res) => {
  try {
    await ensureIntentTable();
    const id = Number(req.params.id || 0);
    if (!id) return res.status(400).json({ success: false, message: 'Invalid invoice id' });
    const role = String(req.user?.role_code || '').toUpperCase();
    const userSchoolId = Number(req.user?.school_id || 0);
    const scopeForSchoolRoles = ['SCHOOL_ADMIN', 'SCHOOL_MANAGER', 'ACCOUNTANT'].includes(role);
    const bundle = await getInvoiceDetailBundleById(id);
    if (!bundle) return res.status(404).json({ success: false, message: 'Invoice not found' });
    if (scopeForSchoolRoles && Number(bundle.intent.school_id || 0) !== userSchoolId) {
      return res.status(403).json({ success: false, message: 'Access denied for this school invoice' });
    }
    const pdfBuffer = await generateInvoicePdfBuffer(bundle);
    const filename = `${safeFilenamePart(bundle.invoice.invoice_no || `invoice-${id}`)}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.send(pdfBuffer);
  } catch (err) {
    console.error('[public/babyeyi-pay/invoices/:id/print.pdf]', err);
    return res.status(500).json({ success: false, message: err.message || 'Failed to render invoice PDF' });
  }
});

// Public authenticity check for QR code scans (no auth)
router.get('/invoices/verify/:id', async (req, res) => {
  try {
    await ensureIntentTable();
    const id = Number(req.params.id || 0);
    const invoiceNo = String(req.query?.invoice_no || '').trim();
    if (!id || !invoiceNo) {
      return res.status(400).json({ success: false, valid: false, message: 'invoice id and invoice_no are required' });
    }
    const [rows] = await db.promisePool.execute(
      `SELECT i.id, i.invoice_no, i.invoice_status, i.invoice_paid_at, i.total_rwf, i.created_at,
              s.school_name,
              JSON_UNQUOTE(JSON_EXTRACT(i.payload_json, '$.selected_student.student_name')) AS student_name
       FROM babyeyi_payment_intents i
       LEFT JOIN schools s ON s.id = i.school_id
       WHERE i.id = ? AND i.invoice_no = ?
       LIMIT 1`,
      [id, invoiceNo]
    );
    const row = rows?.[0];
    if (!row) {
      return res.status(404).json({ success: true, valid: false, message: 'Invoice not found or does not match' });
    }
    return res.json({
      success: true,
      valid: true,
      data: {
        invoice_id: row.id,
        invoice_no: row.invoice_no,
        invoice_status: row.invoice_status || 'NOT_PAID',
        invoice_paid_at: row.invoice_paid_at || null,
        amount_rwf: Number(row.total_rwf || 0),
        created_at: row.created_at,
        school_name: row.school_name || null,
        student_name: row.student_name || null,
      },
    });
  } catch (err) {
    console.error('[public/babyeyi-pay/invoices/verify/:id]', err);
    return res.status(500).json({ success: false, valid: false, message: 'Failed to verify invoice' });
  }
});

// GET /api/public/babyeyi-pay/invoice/:id.pdf?invoice_no= — invoice PDF when id + invoice_no match (any status)
router.get('/invoice/:id.pdf', async (req, res) => {
  try {
    await ensureIntentTable();
    const id = Number(req.params.id || 0);
    const invoiceNo = String(req.query?.invoice_no || '').trim();
    if (!id || !invoiceNo) {
      return res.status(400).json({ success: false, message: 'intent id and invoice_no are required' });
    }
    const [rows] = await db.promisePool.execute(
      `SELECT id, invoice_no FROM babyeyi_payment_intents WHERE id = ? AND invoice_no = ? LIMIT 1`,
      [id, invoiceNo]
    );
    if (!rows?.[0]) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }
    const bundle = await getInvoiceDetailBundleById(id);
    if (!bundle) return res.status(404).json({ success: false, message: 'Invoice not found' });
    const pdfBuffer = await generateInvoicePdfBuffer(bundle);
    const filename = `${safeFilenamePart(`Invoice-${bundle.invoice.invoice_no || id}`)}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.send(pdfBuffer);
  } catch (err) {
    console.error('[public/babyeyi-pay/invoice/:id.pdf]', err);
    return res.status(500).json({ success: false, message: err.message || 'Failed to render invoice' });
  }
});

// GET /api/public/babyeyi-pay/receipt/:id.pdf?invoice_no= — download PAID receipt (same secrets as verify)
router.get('/receipt/:id.pdf', async (req, res) => {
  try {
    await ensureIntentTable();
    const id = Number(req.params.id || 0);
    const invoiceNo = String(req.query?.invoice_no || '').trim();
    if (!id || !invoiceNo) {
      return res.status(400).json({ success: false, message: 'intent id and invoice_no are required' });
    }
    const [rows] = await db.promisePool.execute(
      `SELECT id, invoice_no, invoice_status FROM babyeyi_payment_intents WHERE id = ? AND invoice_no = ? LIMIT 1`,
      [id, invoiceNo]
    );
    const row = rows?.[0];
    if (!row) {
      return res.status(404).json({ success: false, message: 'Receipt not found' });
    }
    if (String(row.invoice_status || '').toUpperCase() !== 'PAID') {
      return res.status(403).json({
        success: false,
        message: 'A downloadable receipt is available only after payment is confirmed as PAID.',
      });
    }
    const bundle = await getInvoiceDetailBundleById(id);
    if (!bundle) return res.status(404).json({ success: false, message: 'Receipt not found' });
    const pdfBuffer = await generatePaymentReceiptPdfBuffer(bundle);
    const filename = `${safeFilenamePart(`Receipt-${bundle.invoice.invoice_no || id}`)}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.send(pdfBuffer);
  } catch (err) {
    console.error('[public/babyeyi-pay/receipt/:id.pdf]', err);
    return res.status(500).json({ success: false, message: err.message || 'Failed to render receipt' });
  }
});

router.get('/invoices/export.xlsx', requireRole('SUPER_ADMIN', 'FULL_SYSTEM_CONTROLLER', 'SCHOOL_ADMIN', 'SCHOOL_MANAGER', 'ACCOUNTANT'), async (req, res) => {
  try {
    await ensureIntentTable();
    const role = String(req.user?.role_code || '').toUpperCase();
    const userSchoolId = Number(req.user?.school_id || 0);
    const scopedSchoolId = ['SCHOOL_ADMIN', 'SCHOOL_MANAGER', 'ACCOUNTANT'].includes(role)
      ? (userSchoolId || -1)
      : Number(req.query.school_id || 0);
    const { where, params } = buildInvoiceFilters(req.query || {}, { schoolId: scopedSchoolId });
    const [rows] = await db.promisePool.execute(
      `SELECT i.id, i.invoice_no, i.invoice_status, i.created_at, i.invoice_paid_at, i.total_rwf,
              i.payer_name, i.payer_phone, i.payer_email, s.school_name, b.class_name, b.term, b.academic_year,
              JSON_UNQUOTE(JSON_EXTRACT(i.payload_json, '$.selected_student.student_name')) AS student_name,
              JSON_UNQUOTE(JSON_EXTRACT(i.payload_json, '$.selected_student.student_uid')) AS student_uid,
              JSON_UNQUOTE(JSON_EXTRACT(i.payload_json, '$.selected_student.student_code')) AS student_code
       FROM babyeyi_payment_intents i
       LEFT JOIN schools s ON s.id = i.school_id
       LEFT JOIN school_babyeyi b ON b.id = i.babyeyi_id
       ${where}
       ORDER BY i.created_at DESC, i.id DESC`,
      params
    );
    const exportRows = (rows || []).map((r) => ({
      InvoiceNo: r.invoice_no || `INV-${r.id}`,
      InvoiceStatus: String(r.invoice_status || 'NOT_PAID').toUpperCase(),
      Student: r.student_name || r.student_code || r.student_uid || '',
      Class: r.class_name || '',
      Term: r.term || '',
      AcademicYear: r.academic_year || '',
      PayerName: r.payer_name || '',
      PayerEmail: r.payer_email || '',
      PayerPhone: r.payer_phone || '',
      AmountRWF: Number(r.total_rwf || 0),
      School: r.school_name || '',
      CreatedAt: r.created_at || '',
      PaidAt: r.invoice_paid_at || '',
    }));
    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, xlsx.utils.json_to_sheet(exportRows), 'Invoices');
    const buffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
    const fname = safeFilenamePart(`invoices-${new Date().toISOString().slice(0, 10)}`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${fname}.xlsx"`);
    return res.send(buffer);
  } catch (err) {
    console.error('[public/babyeyi-pay/invoices/export.xlsx]', err);
    return res.status(500).json({ success: false, message: 'Failed to export invoices Excel' });
  }
});

router.get('/invoices/export.pdf', requireRole('SUPER_ADMIN', 'FULL_SYSTEM_CONTROLLER', 'SCHOOL_ADMIN', 'SCHOOL_MANAGER', 'ACCOUNTANT'), async (req, res) => {
  try {
    await ensureIntentTable();
    const role = String(req.user?.role_code || '').toUpperCase();
    const userSchoolId = Number(req.user?.school_id || 0);
    const scopedSchoolId = ['SCHOOL_ADMIN', 'SCHOOL_MANAGER', 'ACCOUNTANT'].includes(role)
      ? (userSchoolId || -1)
      : Number(req.query.school_id || 0);
    const { where, params } = buildInvoiceFilters(req.query || {}, { schoolId: scopedSchoolId });
    const [rows] = await db.promisePool.execute(
      `SELECT i.id, i.invoice_no, i.invoice_status, i.created_at, i.invoice_paid_at, i.total_rwf,
              s.school_name, b.class_name, b.term, b.academic_year,
              JSON_UNQUOTE(JSON_EXTRACT(i.payload_json, '$.selected_student.student_name')) AS student_name,
              JSON_UNQUOTE(JSON_EXTRACT(i.payload_json, '$.selected_student.student_code')) AS student_code
       FROM babyeyi_payment_intents i
       LEFT JOIN schools s ON s.id = i.school_id
       LEFT JOIN school_babyeyi b ON b.id = i.babyeyi_id
       ${where}
       ORDER BY i.created_at DESC, i.id DESC`,
      params
    );
    const fname = safeFilenamePart(`invoices-${new Date().toISOString().slice(0, 10)}`);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${fname}.pdf"`);
    const doc = new PDFDocument({ margin: 36, size: 'A4', layout: 'landscape' });
    doc.pipe(res);
    doc.fontSize(15).text('School Invoices Report');
    doc.fontSize(9).fillColor('#666').text(`Generated: ${new Date().toLocaleString()}`);
    doc.moveDown(0.8);
    doc.fontSize(8).fillColor('#111');
    const left = 36;
    const widths = [110, 62, 120, 46, 52, 62, 70, 86];
    const headers = ['Invoice', 'Status', 'Student', 'Class', 'Term', 'Year', 'Amount', 'Created'];
    let y = doc.y;
    let x = left;
    headers.forEach((h, i) => { doc.text(h, x, y, { width: widths[i] }); x += widths[i]; });
    y += 14;
    (rows || []).forEach((r) => {
      if (y > 540) {
        doc.addPage();
        y = 40;
      }
      const vals = [
        r.invoice_no || `INV-${r.id}`,
        String(r.invoice_status || 'NOT_PAID').toUpperCase(),
        r.student_name || r.student_code || '—',
        r.class_name || '—',
        r.term || '—',
        String(r.academic_year || '—'),
        `${Number(r.total_rwf || 0).toLocaleString()} RWF`,
        r.created_at ? new Date(r.created_at).toLocaleDateString() : '—',
      ];
      x = left;
      vals.forEach((v, i) => { doc.text(String(v).slice(0, 30), x, y, { width: widths[i] }); x += widths[i]; });
      y += 12;
    });
    doc.end();
  } catch (err) {
    console.error('[public/babyeyi-pay/invoices/export.pdf]', err);
    return res.status(500).json({ success: false, message: 'Failed to export invoices PDF' });
  }
});

router.__sendShuleAvanceFinancingApplicantEmail = sendShuleAvanceFinancingApplicantEmail;
module.exports = router;
