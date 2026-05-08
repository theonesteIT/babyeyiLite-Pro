// ================================================================
// ClassKit / ShuleKit share tokens — opaque DB rows + OTP gate
//
// DESIGN: opaque database tokens (not JWT) — revoke by delete/flag,
// shorter audit trail in MySQL.
//
// Link lifetime default: CLASSKIT_SHARE_TTL_DAYS (fallback 14)
// OTP TTL: CLASSKIT_SHARE_OTP_MINUTES (fallback 15)
//
// OTP delivery: Email (SMTP) + SMS if SMS_API_URL set.
// WhatsApp: optional TWilio Content API stubs — logged when unset.
// ================================================================

'use strict';

const crypto = require('crypto');
const axios = require('axios');

const { promisePool } = require('../config/database');
const nodemailer = require('nodemailer');

const TABLE = 'parent_classkit_share_tokens';
const PEPPER_SOURCE = () =>
  trimStr(process.env.CLASSKIT_SHARE_SECRET) ||
  trimStr(process.env.SESSION_SECRET) ||
  'babyeyi_classkit_share_dev_pepper_CHANGE_ME';

function trimStr(v) {
  if (v === undefined || v === null) return '';
  return String(v).trim();
}

function ttlDaysDefault() {
  const n = Math.min(90, Math.max(1, Number(process.env.CLASSKIT_SHARE_TTL_DAYS || 14)));
  return Number.isFinite(n) ? n : 14;
}

function otpMinutesDefault() {
  const n = Math.min(60, Math.max(3, Number(process.env.CLASSKIT_SHARE_OTP_MINUTES || 15)));
  return Number.isFinite(n) ? n : 15;
}

function normalizeEmail(raw) {
  const v = trimStr(raw).toLowerCase();
  if (!v || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return null;
  return v;
}

/** New random URL-safe token (~43 chars before encoding) */
function generatePlainShareToken() {
  return crypto.randomBytes(32).toString('base64url');
}

function sha256Hex(s) {
  return crypto.createHash('sha256').update(String(s), 'utf8').digest('hex');
}

/** Store only SHA256(plain_token) unique row */
function hashShareTokenPlain(plain) {
  return sha256Hex(`${PEPPER_SOURCE()}:pct:${plain}`);
}

function hashOtpDigits({ rowId, plainOtp }) {
  return sha256Hex(`${PEPPER_SOURCE()}:pct_otp:${rowId}:${plainOtp}`);
}

function hashGuestProof({ rowId, plainSecret }) {
  return sha256Hex(`${PEPPER_SOURCE()}:pct_guest:${rowId}:${plainSecret}`);
}

function maskEmail(e) {
  const v = normalizeEmail(e);
  if (!v) return null;
  const [a, b] = v.split('@');
  if (a.length <= 2) return `${a[0]}***@${b}`;
  return `${a.slice(0, 2)}***@${b}`;
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

async function ensureClasskitShareTable() {
  const days = ttlDaysDefault();
  await promisePool.query(`
    CREATE TABLE IF NOT EXISTS ${TABLE} (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      token_hash CHAR(64) NOT NULL,
      parent_portal_account_id INT UNSIGNED NOT NULL,
      owner_phone VARCHAR(36) NOT NULL,
      snapshot_json JSON NOT NULL,
      student_id INT UNSIGNED NOT NULL,
      access_type ENUM('FULL','LIMITED') NOT NULL DEFAULT 'LIMITED',
      expires_at DATETIME NOT NULL,
      otp_code_hash CHAR(64) NULL,
      otp_expires_at DATETIME NULL,
      otp_attempts SMALLINT UNSIGNED NOT NULL DEFAULT 0,
      otp_send_count SMALLINT UNSIGNED NOT NULL DEFAULT 0,
      otp_window_started_at DATETIME NULL,
      verified_at DATETIME NULL,
      guest_secret_hash CHAR(64) NULL,
      guest_expires_at DATETIME NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_pct_token_hash (token_hash),
      KEY idx_pct_student (student_id),
      KEY idx_pct_expires (expires_at),
      KEY idx_pct_parent (parent_portal_account_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  void days;
}

async function lookupRowByPlainToken(plain) {
  if (!trimStr(plain)) return null;
  const th = hashShareTokenPlain(plain);
  const [[row]] = await promisePool.query(
    `SELECT * FROM ${TABLE} WHERE token_hash = ? LIMIT 1`,
    [th]
  );
  return row || null;
}

function isShareRowExpired(row) {
  if (!row || !row.expires_at) return true;
  return Date.now() > new Date(row.expires_at).getTime();
}

function snapshotFromRow(row) {
  try {
    const raw = row?.snapshot_json;
    if (!raw) return {};
    return typeof raw === 'string' ? JSON.parse(raw) : raw;
  } catch (_) {
    return {};
  }
}

/** Parent session: mint token */
async function createShareTokenRecord({
  parentPortalAccountId,
  ownerPhone,
  studentId,
  accessType,
  snapshot,
}) {
  await ensureClasskitShareTable();
  const plainToken = generatePlainShareToken();
  const token_hash = hashShareTokenPlain(plainToken);
  const ttlMs = ttlDaysDefault() * 24 * 60 * 60 * 1000;
  const expires_at = new Date(Date.now() + ttlMs);

  await promisePool.query(
    `INSERT INTO ${TABLE}
      (token_hash, parent_portal_account_id, owner_phone, snapshot_json, student_id, access_type, expires_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      token_hash,
      Number(parentPortalAccountId),
      trimStr(ownerPhone),
      JSON.stringify(snapshot || {}),
      Number(studentId),
      accessType === 'FULL' ? 'FULL' : 'LIMITED',
      expires_at,
    ]
  );

  return { plain_token: plainToken, expires_at: expires_at.toISOString() };
}

async function loadParentEmails(accountId) {
  const aid = Number(accountId);
  if (!aid) return { recovery: null, any: [] };
  const [[acc]] = await promisePool.query(
    `SELECT recovery_email, father_email, mother_email
     FROM parent_portal_accounts WHERE id = ? LIMIT 1`,
    [aid]
  );
  const out = [];
  const push = (e) => {
    const n = normalizeEmail(e);
    if (n && !out.includes(n)) out.push(n);
  };
  push(acc?.recovery_email);
  push(acc?.father_email);
  push(acc?.mother_email);
  return { recovery: normalizeEmail(acc?.recovery_email), list: out };
}

let mailerSingleton = false;
/** @returns {ReturnType<typeof nodemailer.createTransport>|false|null} */
function getMailer() {
  if (mailerSingleton !== false) return mailerSingleton;
  if (!process.env.SMTP_USER) {
    mailerSingleton = null;
    return null;
  }
  mailerSingleton = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
  return mailerSingleton;
}

async function sendOtpEmail({ to, otp, ttlMin }) {
  const transport = getMailer();
  if (!transport) {
    console.warn('[classkit-share] SMTP_USER not configured — OTP email skipped. OTP:', otp, 'to:', to);
    return { ok: false, skipped: true };
  }
  const from = process.env.SMTP_FROM || `"Babyeyi" <${process.env.SMTP_USER}>`;
  const subject = `Babyeyi verification code (${ttlMin} min)`;
  const text = [
    `Your Babyeyi ClassKit link verification code is: ${otp}`,
    '',
    `It expires in ${ttlMin} minutes. If you did not request this, ignore this message.`,
  ].join('\n');
  try {
    await transport.sendMail({ from, to, subject, text });
    return { ok: true };
  } catch (e) {
    console.error('[classkit-share/email]', e.message);
    return { ok: false, error: e.message };
  }
}

async function sendOtpSms(phoneNorm, otp) {
  const localPhone = normalizeRwandaPhone(phoneNorm);
  if (!localPhone) return { ok: false, skipped: 'invalid_phone' };
  const smsApiUrl = trimStr(process.env.SMS_API_URL);
  const text = `Babyeyi verification code: ${otp}. Valid ${otpMinutesDefault()} min.`;
  if (!smsApiUrl) {
    console.warn('[classkit-share] SMS_API_URL not set — OTP SMS skipped. Code:', otp, '→', localPhone);
    return { ok: false, skipped: 'sms_not_configured' };
  }
  try {
    const headers = { 'Content-Type': 'application/json' };
    const bearer = trimStr(process.env.SMS_API_BEARER);
    if (bearer) headers.Authorization = `Bearer ${bearer}`;
    await axios.post(
      smsApiUrl,
      {
        to: `250${localPhone.slice(1)}`,
        message: text.slice(0, 600),
        sender: trimStr(process.env.SMS_SENDER || 'BABYEYI').slice(0, 16),
      },
      { headers, timeout: 20000 }
    );
    return { ok: true };
  } catch (e) {
    console.warn('[classkit-share/sms]', e.message);
    return { ok: false, error: e.message };
  }
}

/**
 * WhatsApp via Twilio (optional). Requires TWILIO_ACCOUNT_SID + TWILIO_AUTH_TOKEN
 * + TWILIO_WHATSAPP_FROM (+123...) and optionally TWILIO_WHATSAPP_CONTENT_SID for templates.
 */
async function sendOtpTwilioWhatsApp(phoneNorm, otp) {
  const sid = trimStr(process.env.TWILIO_ACCOUNT_SID);
  const token = trimStr(process.env.TWILIO_AUTH_TOKEN);
  const fromWa = trimStr(process.env.TWILIO_WHATSAPP_FROM); // whatsapp:+1415...
  const tpl = trimStr(process.env.TWILIO_WHATSAPP_CONTENT_SID);
  const local = normalizeRwandaPhone(phoneNorm);
  if (!sid || !token || !fromWa || !local) {
    console.warn(
      '[classkit-share/whatsapp] TWilio WhatsApp env incomplete — skipping. Need TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_FROM'
    );
    return { ok: false, skipped: true };
  }
  const to = `whatsapp:+250${local.slice(1)}`;
  try {
    const auth = Buffer.from(`${sid}:${token}`).toString('base64');
    const url = `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`;
    const params = new URLSearchParams();
    params.set('To', to);
    params.set('From', fromWa.startsWith('whatsapp:') ? fromWa : `whatsapp:${fromWa}`);
    if (tpl) {
      params.set('ContentSid', tpl);
      params.set('ContentVariables', JSON.stringify({ 1: String(otp) }));
    } else {
      params.set(
        'Body',
        `Babyeyi code: ${otp}. Valid ${otpMinutesDefault()} min. Do not share this code with anyone except to open your child's school kit checkout.`
      );
    }
    await axios.post(url, params.toString(), {
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      timeout: 20000,
    });
    return { ok: true };
  } catch (e) {
    console.warn('[classkit-share/whatsapp]', e.response?.data || e.message);
    return { ok: false, error: String(e.response?.data?.message || e.message) };
  }
}

async function issueOtpForRow(row) {
  await ensureClasskitShareTable();
  const otpPlain = String(crypto.randomInt(100000, 1000000));
  const otp_hash = hashOtpDigits({ rowId: row.id, plainOtp: otpPlain });
  const otpMin = otpMinutesDefault();
  const otp_expires_at = new Date(Date.now() + otpMin * 60 * 1000);

  await promisePool.query(
    `UPDATE ${TABLE}
     SET otp_code_hash = ?, otp_expires_at = ?, otp_attempts = 0, updated_at = NOW()
     WHERE id = ?`,
    [otp_hash, otp_expires_at, row.id]
  );

  const emails = await loadParentEmails(row.parent_portal_account_id);
  return { otpPlain, otpMin, otp_expires_at, emails };
}

async function bumpOtpSendWindow(rowId) {
  await ensureClasskitShareTable();
  const [[fresh]] = await promisePool.query(
    `SELECT otp_send_count, otp_window_started_at FROM ${TABLE} WHERE id = ? LIMIT 1`,
    [rowId]
  );
  if (!fresh) return { ok: false, status: 404, message: 'Not found' };
  const windowStart = fresh.otp_window_started_at ? new Date(fresh.otp_window_started_at).getTime() : 0;
  const resets = !windowStart || Date.now() - windowStart > 3 * 60 * 60 * 1000;
  const prev = resets ? 0 : Number(fresh.otp_send_count || 0);
  if (!resets && prev >= 8) {
    return { ok: false, status: 429, message: 'Too many OTP requests — try later' };
  }
  await promisePool.query(
    `UPDATE ${TABLE}
     SET otp_send_count = ?,
         otp_window_started_at = CASE WHEN ? = 1 THEN NOW() ELSE otp_window_started_at END
     WHERE id = ?`,
    [prev + 1, resets ? 1 : 0, rowId]
  );
  return { ok: true };
}

async function verifyOtpForRow(row, plainOtp) {
  await ensureClasskitShareTable();
  if (!trimStr(plainOtp) || plainOtp.length < 6) {
    return { ok: false, status: 400, message: 'Invalid code format' };
  }
  const maxAttempts = Math.min(
    20,
    Math.max(5, Number(process.env.CLASSKIT_SHARE_MAX_OTP_ATTEMPTS || 10))
  );
  const attempts = Number(row.otp_attempts || 0) + 1;
  await promisePool.query(`UPDATE ${TABLE} SET otp_attempts = ? WHERE id = ?`, [attempts, row.id]);

  const otex = row.otp_expires_at ? new Date(row.otp_expires_at).getTime() : 0;
  if (!row.otp_code_hash || Date.now() > otex) {
    return { ok: false, status: 400, message: 'Code expired — request a new one' };
  }
  const expectHex = hashOtpDigits({ rowId: row.id, plainOtp: String(plainOtp).trim() });
  const storedHex = String(row.otp_code_hash || '').trim();
  let timingSafe = false;
  try {
    const a = Buffer.from(expectHex, 'hex');
    const b = Buffer.from(storedHex, 'hex');
    if (a.length === b.length && a.length > 0) timingSafe = crypto.timingSafeEqual(a, b);
  } catch (_) {
    timingSafe = false;
  }
  if (!timingSafe) {
    if (attempts >= maxAttempts) {
      return { ok: false, status: 429, message: 'Too many wrong attempts — start over with a fresh link from the parent' };
    }
    return { ok: false, status: 400, message: 'Incorrect code' };
  }

  const guestPlain = crypto.randomBytes(32).toString('base64url');
  const guest_hash = hashGuestProof({ rowId: row.id, plainSecret: guestPlain });
  const guest_ttl_ms = ttlDaysDefault() * 24 * 60 * 60 * 1000;
  const guest_expires_at = new Date(Date.now() + guest_ttl_ms);

  await promisePool.query(
    `UPDATE ${TABLE}
     SET verified_at = NOW(),
         otp_code_hash = NULL,
         otp_expires_at = NULL,
         guest_secret_hash = ?,
         guest_expires_at = ?,
         updated_at = NOW()
     WHERE id = ?`,
    [guest_hash, guest_expires_at, row.id]
  );

  return { ok: true, guest_cookie_value: `${row.id}:${guestPlain}`, guest_expires_at };
}

async function resolveGuestShareFromReq(req) {
  const cookieName = trimStr(process.env.CLASSKIT_SHARE_COOKIE_NAME) || 'by_classkit_ck';
  const raw = trimStr(req.cookies?.[cookieName]);
  if (!raw) return null;
  const m = raw.match(/^([0-9]+):(.+)$/);
  if (!m) return null;
  const id = Number(m[1]);
  const secret = m[2];
  if (!Number.isFinite(id) || id <= 0 || secret.length < 20) return null;
  const gh = hashGuestProof({ rowId: id, plainSecret: secret });
  const [[row]] = await promisePool.query(
    `SELECT * FROM ${TABLE} WHERE id = ? AND guest_secret_hash = ? LIMIT 1`,
    [id, gh]
  );
  if (!row || !row.verified_at) return null;
  const gex = row.guest_expires_at ? new Date(row.guest_expires_at).getTime() : 0;
  if (Date.now() > gex) return null;
  const r2 = row;
  await promisePool.query(`UPDATE ${TABLE} SET updated_at = NOW() WHERE id = ?`, [r2.id]).catch(() => {});
  return r2;
}

module.exports = {
  TABLE,
  ensureClasskitShareTable,
  ttlDaysDefault,
  otpMinutesDefault,
  normalizeEmail,
  maskEmail,
  hashShareTokenPlain,
  lookupRowByPlainToken,
  isShareRowExpired,
  snapshotFromRow,
  createShareTokenRecord,
  loadParentEmails,
  issueOtpForRow,
  bumpOtpSendWindow,
  verifyOtpForRow,
  resolveGuestShareFromReq,
  sendOtpEmail,
  sendOtpSms,
  sendOtpTwilioWhatsApp,
};
