// ================================================================
// Public ClassKit resume — OTP gate + scoped pricing cookie
//
// POST /api/public/classkit-share/start
// POST /api/public/classkit-share/send-otp
// POST /api/public/classkit-share/verify-otp
// GET  /api/public/classkit-share/pricing?student_id=
// ================================================================

'use strict';

const express = require('express');
const rateLimit = require('express-rate-limit');
const {
  lookupRowByPlainToken,
  isShareRowExpired,
  snapshotFromRow,
  issueOtpForRow,
  bumpOtpSendWindow,
  verifyOtpForRow,
  resolveGuestShareFromReq,
  sendOtpEmail,
  sendOtpSms,
  sendOtpTwilioWhatsApp,
  loadParentEmails,
  maskEmail,
  normalizeRwandaPhone: _nrp,
  ttlDaysDefault,
  otpMinutesDefault,
  ensureClasskitShareTable,
} = require('./classkitShareService');
const { fetchClasskitPricingForStudent } = require('./classkitPricingShared');
const { getRequestMeta, logParentAuditEvent } = require('../utils/parentAuditLog');

const router = express.Router();

router.use((_req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  next();
});

const shareLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
});

const otpSendLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
});

function cookieOpts(maxAgeMs) {
  const prod = process.env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    path: '/',
    sameSite: 'lax',
    secure: prod,
    maxAge: maxAgeMs,
  };
}

function cookieName() {
  return String(process.env.CLASSKIT_SHARE_COOKIE_NAME || 'by_classkit_ck').trim() || 'by_classkit_ck';
}

function maskPhoneTail(phone) {
  const p = String(phone || '').replace(/\D/g, '');
  if (p.length < 4) return null;
  return `…${p.slice(-4)}`;
}

/** Non-enumerating copy for bad tokens */
function opaqueInvalid() {
  return { success: false, code: 'LINK_INVALID_OR_EXPIRED', message: 'This link is invalid or has expired.' };
}

async function rowOrOpaque(plain) {
  const row = await lookupRowByPlainToken(plain);
  if (!row || isShareRowExpired(row)) return { row: null };
  return { row };
}

// POST { token }
router.post('/start', shareLimiter, async (req, res) => {
  try {
    await ensureClasskitShareTable();
    const plain = String(req.body?.token || '').trim();
    const { row } = await rowOrOpaque(plain);
    if (!row) return res.status(404).json(opaqueInvalid());

    const guest = await resolveGuestShareFromReq(req);
    if (guest && Number(guest.id) === Number(row.id) && Number(guest.student_id) === Number(row.student_id)) {
      const meta = getRequestMeta(req);
      void logParentAuditEvent({
        parentPortalAccountId: row.parent_portal_account_id,
        parentPhone: row.owner_phone,
        actorType: 'guest_link',
        eventType: 'classkit_share_link_opened',
        entityType: 'student',
        entityId: String(row.student_id),
        channel: 'link',
        outcome: 'success',
        ipAddress: meta.ip,
        userAgent: meta.userAgent,
        details: { otp_required: false, guest_cookie_reused: true },
      }).catch(() => {});
      const snap = snapshotFromRow(row);
      return res.json({
        success: true,
        otp_required: false,
        student_id: row.student_id,
        access_type: row.access_type,
        snapshot: snap,
        expires_in_days: ttlDaysDefault(),
      });
    }

    const emails = await loadParentEmails(row.parent_portal_account_id);
    const meta = getRequestMeta(req);
    void logParentAuditEvent({
      parentPortalAccountId: row.parent_portal_account_id,
      parentPhone: row.owner_phone,
      actorType: 'guest_link',
      eventType: 'classkit_share_link_opened',
      entityType: 'student',
      entityId: String(row.student_id),
      channel: 'link',
      outcome: 'pending_otp',
      ipAddress: meta.ip,
      userAgent: meta.userAgent,
      details: { otp_required: true, has_email_channel: emails.list.length > 0 },
    }).catch(() => {});
    return res.json({
      success: true,
      otp_required: true,
      student_id: row.student_id,
      masked_email: emails.list[0] ? maskEmail(emails.list[0]) : null,
      phone_tail: maskPhoneTail(row.owner_phone),
      channels: {
        email: emails.list.length > 0,
        sms: !!process.env.SMS_API_URL,
        whatsapp: !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_WHATSAPP_FROM),
      },
      otp_ttl_minutes: otpMinutesDefault(),
    });
  } catch (e) {
    console.error('[classkit-share/start]', e);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST { token, channel: 'email'|'sms'|'whatsapp' }
router.post('/send-otp', otpSendLimiter, async (req, res) => {
  try {
    await ensureClasskitShareTable();
    const plain = String(req.body?.token || '').trim();
    const channel = String(req.body?.channel || 'email').toLowerCase();
    const { row } = await rowOrOpaque(plain);
    if (!row) return res.status(404).json(opaqueInvalid());

    const bump = await bumpOtpSendWindow(row.id);
    if (!bump.ok) return res.status(bump.status).json({ success: false, message: bump.message });

    const { otpPlain, otpMin, emails } = await issueOtpForRow(row);
    const meta = getRequestMeta(req);

    const results = [];
    if (channel === 'whatsapp') {
      const wa = await sendOtpTwilioWhatsApp(row.owner_phone, otpPlain);
      results.push({ channel: 'whatsapp', ...wa });
      if (!wa.ok) {
        const sm = await sendOtpSms(row.owner_phone, otpPlain);
        results.push({ channel: 'sms_fallback', ...sm });
      }
    } else if (channel === 'sms') {
      const sm = await sendOtpSms(row.owner_phone, otpPlain);
      results.push({ channel: 'sms', ...sm });
    } else {
      const to = emails.list[0];
      if (!to) {
        return res.status(400).json({
          success: false,
          message: 'No email on file for this parent account — use SMS or add a recovery email in Babyeyi.',
        });
      }
      const em = await sendOtpEmail({ to, otp: otpPlain, ttlMin: otpMin });
      results.push({ channel: 'email', ...em });
    }

    void logParentAuditEvent({
      parentPortalAccountId: row.parent_portal_account_id,
      parentPhone: row.owner_phone,
      actorType: 'guest_link',
      eventType: 'classkit_share_otp_sent',
      entityType: 'student',
      entityId: String(row.student_id),
      channel,
      outcome: results.some((r) => r.ok) ? 'success' : 'failed',
      ipAddress: meta.ip,
      userAgent: meta.userAgent,
      details: {
        delivered_hint: results.some((r) => r.ok),
        ttl_minutes: otpMin,
      },
    }).catch(() => {});
    return res.json({
      success: true,
      delivered_hint: results.some((r) => r.ok),
      ttl_minutes: otpMin,
      message: 'If this link is valid, a code was sent to the parent contact on file.',
    });
  } catch (e) {
    console.error('[classkit-share/send-otp]', e);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST { token, otp }
router.post('/verify-otp', shareLimiter, async (req, res) => {
  try {
    await ensureClasskitShareTable();
    const plain = String(req.body?.token || '').trim();
    const otp = String(req.body?.otp || '').trim();
    const { row } = await rowOrOpaque(plain);
    if (!row) return res.status(404).json(opaqueInvalid());

    const meta = getRequestMeta(req);
    const v = await verifyOtpForRow(row, otp);
    if (!v.ok) {
      void logParentAuditEvent({
        parentPortalAccountId: row.parent_portal_account_id,
        parentPhone: row.owner_phone,
        actorType: 'guest_link',
        eventType: 'classkit_share_otp_verify',
        entityType: 'student',
        entityId: String(row.student_id),
        channel: 'otp',
        outcome: 'failed',
        ipAddress: meta.ip,
        userAgent: meta.userAgent,
        details: { status: v.status, reason: v.message },
      }).catch(() => {});
      return res.status(v.status).json({ success: false, message: v.message });
    }

    const maxAge = new Date(v.guest_expires_at).getTime() - Date.now();
    res.cookie(cookieName(), v.guest_cookie_value, cookieOpts(maxAge));
    void logParentAuditEvent({
      parentPortalAccountId: row.parent_portal_account_id,
      parentPhone: row.owner_phone,
      actorType: 'guest_link',
      eventType: 'classkit_share_otp_verify',
      entityType: 'student',
      entityId: String(row.student_id),
      channel: 'otp',
      outcome: 'success',
      ipAddress: meta.ip,
      userAgent: meta.userAgent,
      details: { guest_cookie_issued: true, access_type: row.access_type },
    }).catch(() => {});
    const snap = snapshotFromRow(row);
    return res.json({
      success: true,
      student_id: row.student_id,
      access_type: row.access_type,
      snapshot: snap,
    });
  } catch (e) {
    console.error('[classkit-share/verify-otp]', e);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET pricing — guest cookie only
router.get('/pricing', shareLimiter, async (req, res) => {
  try {
    await ensureClasskitShareTable();
    const row = await resolveGuestShareFromReq(req);
    if (!row) {
      return res.status(401).json({ success: false, message: 'Verify the link with the code sent to the parent first.' });
    }
    const studentId = Number(req.query.student_id || 0);
    if (!studentId || studentId !== Number(row.student_id)) {
      return res.status(403).json({ success: false, message: 'Student does not match this secure link.' });
    }
    const accessType = row.access_type === 'FULL' ? 'FULL' : 'LIMITED';
    const out = await fetchClasskitPricingForStudent(studentId, accessType);
    if (!out.ok) {
      return res.status(out.status).json({ success: false, message: out.message });
    }
    const meta = getRequestMeta(req);
    void logParentAuditEvent({
      parentPortalAccountId: row.parent_portal_account_id,
      parentPhone: row.owner_phone,
      actorType: 'guest_link',
      eventType: 'classkit_share_pricing_opened',
      entityType: 'student',
      entityId: String(row.student_id),
      channel: 'cookie',
      outcome: 'success',
      ipAddress: meta.ip,
      userAgent: meta.userAgent,
      details: { access_type: accessType },
    }).catch(() => {});
    return res.json({ success: true, data: out.data, share: { via: 'classkit_share_cookie' } });
  } catch (e) {
    console.error('[classkit-share/pricing]', e);
    return res.status(500).json({ success: false, message: 'Failed to load pricing' });
  }
});

module.exports = router;
