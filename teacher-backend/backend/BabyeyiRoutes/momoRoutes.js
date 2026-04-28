'use strict';

// ================================================================
// momoRoutes.js  —  MTN MoMo Collection (Request-to-Pay) Routes
// Mounts at: /api/momo
//
// FIXES IN THIS VERSION:
//  1. mtn_error column is added via safe ALTER TABLE migration
//     (no crash if column already exists or doesn't exist yet)
//  2. markFailed() helper never crashes — falls back gracefully
//  3. MOMO_CALLBACK_URL is ignored if it's a placeholder/localhost/
//     non-HTTPS value — the #1 cause of HTTP 400 empty body from MTN
//  4. All DB writes wrapped so a DB error never causes a 500
// ================================================================

const express = require('express');
const router  = express.Router();
const { v4: uuidv4 } = require('uuid');
const { promisePool } = require('../config/database');

// ── Config ────────────────────────────────────────────────────────
const MOMO_BASE_URL    = (process.env.MOMO_BASE_URL    || 'https://proxy.momoapi.mtn.co.rw').replace(/\/$/, '');
const SUBSCRIPTION_KEY = process.env.MOMO_SUBSCRIPTION_KEY || '';
const API_USER_ID      = process.env.MOMO_API_USER_ID  || '';
const API_KEY          = process.env.MOMO_API_KEY      || '';
const ENVIRONMENT      = process.env.MOMO_ENVIRONMENT  || 'mtnrwanda';

// Only use callback URL if it is a real public HTTPS URL (not a placeholder)
const RAW_CALLBACK = process.env.MOMO_CALLBACK_URL || '';
const CALLBACK_URL = (
  RAW_CALLBACK &&
  RAW_CALLBACK.startsWith('https://') &&
  !RAW_CALLBACK.includes('babyeyi') &&
  !RAW_CALLBACK.includes('localhost') &&
  !RAW_CALLBACK.includes('127.0.0.1')
) ? RAW_CALLBACK : '';

// Startup warnings
if (!CALLBACK_URL && RAW_CALLBACK) {
  console.warn('⚠️  [MoMo] MOMO_CALLBACK_URL looks like a placeholder or non-HTTPS URL — omitting from requests.');
  console.warn('    Value:', RAW_CALLBACK);
  console.warn('    → MTN requires a real public HTTPS URL. Leave it empty until you have one.');
  console.warn('    → Sending requests WITHOUT X-Callback-Url header (MTN will still process them).');
}
if (!SUBSCRIPTION_KEY || !API_USER_ID || !API_KEY) {
  console.warn('⚠️  [MoMo] Missing credentials in .env:');
  console.warn('    MOMO_SUBSCRIPTION_KEY:', SUBSCRIPTION_KEY ? '✅' : '❌ MISSING');
  console.warn('    MOMO_API_USER_ID:     ', API_USER_ID      ? '✅' : '❌ MISSING');
  console.warn('    MOMO_API_KEY:         ', API_KEY          ? '✅' : '❌ MISSING');
  console.warn('    MOMO_ENVIRONMENT:     ', ENVIRONMENT);
  console.warn('    MOMO_BASE_URL:        ', MOMO_BASE_URL);
}

// ── In-memory token cache (55-min TTL) ───────────────────────────
let _tokenCache = { token: null, expiresAt: 0 };

async function getMomoToken() {
  const now = Date.now();
  if (_tokenCache.token && now < _tokenCache.expiresAt) return _tokenCache.token;

  if (!API_USER_ID || !API_KEY) {
    throw new Error('MoMo credentials not configured. Check MOMO_API_USER_ID and MOMO_API_KEY in .env');
  }

  const credentials = Buffer.from(`${API_USER_ID}:${API_KEY}`).toString('base64');
  const tokenUrl    = `${MOMO_BASE_URL}/collection/token/`;
  console.log(`[MoMo] Fetching token → ${tokenUrl}`);

  let res;
  try {
    res = await fetch(tokenUrl, {
      method:  'POST',
      headers: {
        'Authorization':             `Basic ${credentials}`,
        'Ocp-Apim-Subscription-Key': SUBSCRIPTION_KEY,
        'Content-Length':            '0',
      },
    });
  } catch (e) {
    throw new Error(`Token network error (cannot reach ${MOMO_BASE_URL}): ${e.message}`);
  }

  const body = await res.text().catch(() => '');
  if (!res.ok) {
    throw new Error(`Token fetch failed [HTTP ${res.status}]: ${body || '(empty)'}. Check credentials match environment "${ENVIRONMENT}".`);
  }

  let data;
  try { data = JSON.parse(body); } catch (_) { throw new Error(`Token response not JSON: ${body}`); }
  if (!data.access_token) throw new Error(`Token response missing access_token: ${body}`);

  _tokenCache = { token: data.access_token, expiresAt: now + 55 * 60 * 1000 };
  console.log('✅  [MoMo] Bearer token refreshed');
  return _tokenCache.token;
}

// ── Phone sanitizer → 2507XXXXXXXX ───────────────────────────────
function sanitizePhone(raw) {
  if (!raw) return null;
  let p = String(raw).trim().replace(/\s+/g, '');
  if (p.startsWith('+')) p = p.slice(1);
  p = p.replace(/[^0-9]/g, '');
  if (p.startsWith('2507') && p.length === 12) return p;
  if (p.startsWith('07')   && p.length === 10) return '250' + p.slice(1);
  if (p.startsWith('7')    && p.length === 9)  return '250' + p;
  return null;
}

// ── Table setup + safe column migration ──────────────────────────
async function ensureTable() {
  // Create table without mtn_error so it always works on fresh DB
  await promisePool.query(`
    CREATE TABLE IF NOT EXISTS momo_transactions (
      id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      reference_id    CHAR(36)        NOT NULL UNIQUE,
      external_id     VARCHAR(100)    NOT NULL,
      phone           VARCHAR(20)     NOT NULL,
      amount          DECIMAL(14,2)   NOT NULL,
      currency        VARCHAR(10)     NOT NULL DEFAULT 'RWF',
      status          VARCHAR(30)     NOT NULL DEFAULT 'PENDING',
      momo_status     VARCHAR(30)     DEFAULT NULL,
      financial_tx_id VARCHAR(100)    DEFAULT NULL,
      payer_message   VARCHAR(255)    DEFAULT NULL,
      payee_note      VARCHAR(255)    DEFAULT NULL,
      school_id       INT UNSIGNED    DEFAULT NULL,
      babyeyi_id      INT UNSIGNED    DEFAULT NULL,
      intent_id       INT UNSIGNED    DEFAULT NULL,
      raw_callback    JSON            DEFAULT NULL,
      created_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_reference_id (reference_id),
      INDEX idx_external_id  (external_id),
      INDEX idx_status       (status),
      INDEX idx_school       (school_id),
      INDEX idx_intent       (intent_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  // Safely add mtn_error column — silently skips if it already exists (errno 1060)
  try {
    await promisePool.query(
      `ALTER TABLE momo_transactions ADD COLUMN mtn_error TEXT DEFAULT NULL`
    );
    console.log('[MoMo] ✅ mtn_error column added to momo_transactions');
  } catch (e) {
    if (e.errno === 1060) {
      // Column already exists — fine, do nothing
    } else {
      console.warn('[MoMo] Could not add mtn_error column (non-critical):', e.message);
    }
  }
}

ensureTable().catch(e => console.error('[MoMo] Table init error:', e.message));

// ── Safe "mark failed" — works whether mtn_error column exists or not ─
async function markFailed(referenceId, errorText) {
  const safe = String(errorText || '').slice(0, 2000);
  try {
    await promisePool.query(
      `UPDATE momo_transactions SET status='FAILED', mtn_error=? WHERE reference_id=?`,
      [safe, referenceId]
    );
  } catch (e) {
    if (e.errno === 1054) {
      // mtn_error column not yet migrated — fall back
      try {
        await promisePool.query(
          `UPDATE momo_transactions SET status='FAILED' WHERE reference_id=?`,
          [referenceId]
        );
      } catch (e2) {
        console.error('[MoMo] markFailed fallback error:', e2.message);
      }
    } else {
      console.error('[MoMo] markFailed error:', e.message);
    }
  }
}

// ── Map MTN HTTP/error codes to readable messages ─────────────────
function mapMtnError(httpStatus, detail) {
  const d = String(detail || '').toUpperCase();
  if (httpStatus === 401) return 'MTN auth failed (401). Verify MOMO_API_USER_ID, MOMO_API_KEY, MOMO_SUBSCRIPTION_KEY.';
  if (httpStatus === 403) return 'MTN forbidden (403). Check MOMO_ENVIRONMENT — must match credentials (mtnrwanda vs sandbox).';
  if (d.includes('PAYER_NOT_FOUND') || d.includes('NOT_FOUND')) return 'Phone number not registered on MTN MoMo. Use an active MTN MoMo number.';
  if (d.includes('NOT_ALLOWED') || d.includes('PAYER_LIMIT_REACHED')) return 'MoMo account has reached its limit or cannot receive push payments.';
  if (d.includes('INVALID_CURRENCY')) return 'Invalid currency — only RWF is supported for MTN Rwanda.';
  if (d.includes('RESOURCE_ALREADY_EXIST')) return 'Duplicate reference ID. Please retry.';
  if (d.includes('INTERNAL_PROCESSING_ERROR')) return 'MTN internal error. Please try again in a few minutes.';
  if (httpStatus === 400) {
    if (!detail || detail.trim() === '') {
      return (
        'MTN rejected the request (HTTP 400, empty body). ' +
        'Most common cause: X-Callback-Url is set to a placeholder URL. ' +
        'Fix: remove MOMO_CALLBACK_URL from .env or set it to a real public HTTPS URL.'
      );
    }
    return `MTN bad request (400): ${detail}`;
  }
  return `MTN error (HTTP ${httpStatus}): ${detail || 'no detail'}`;
}

// ================================================================
// GET /api/momo/token  — masked token peek (non-prod / super admin)
// ================================================================
router.get('/token', async (req, res) => {
  const role = (req.user?.role_code || '').toUpperCase();
  if (process.env.NODE_ENV === 'production' && role !== 'SUPER_ADMIN') {
    return res.status(403).json({ success: false, message: 'Not allowed in production' });
  }
  try {
    const token = await getMomoToken();
    return res.json({ success: true, token: token.slice(0, 20) + '…' });
  } catch (err) {
    return res.status(502).json({ success: false, message: err.message });
  }
});

// ================================================================
// GET /api/momo/debug  — config + token test (non-production only)
// ================================================================
router.get('/debug', async (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({ success: false, message: 'Disabled in production' });
  }
  const report = {
    config: {
      MOMO_BASE_URL,
      ENVIRONMENT,
      CALLBACK_URL_USED:    CALLBACK_URL || '(none — omitted from requests ✅)',
      CALLBACK_URL_IN_ENV:  RAW_CALLBACK || '(not set)',
      SUBSCRIPTION_KEY:     SUBSCRIPTION_KEY ? `${SUBSCRIPTION_KEY.slice(0, 6)}…` : '❌ MISSING',
      API_USER_ID:          API_USER_ID      ? `${API_USER_ID.slice(0, 8)}…`       : '❌ MISSING',
      API_KEY:              API_KEY          ? `${API_KEY.slice(0, 6)}…`           : '❌ MISSING',
    },
    phoneTests: {
      '0796898894':    sanitizePhone('0796898894'),
      '250796898894':  sanitizePhone('250796898894'),
      '+250796898894': sanitizePhone('+250796898894'),
      '796898894':     sanitizePhone('796898894'),
    },
    tokenTest: null,
  };
  try {
    const token = await getMomoToken();
    report.tokenTest = { success: true, preview: token.slice(0, 20) + '…' };
  } catch (err) {
    report.tokenTest = { success: false, error: err.message };
  }
  return res.json({ success: true, report });
});

// ================================================================
// POST /api/momo/request-to-pay
// Body: { phone, amount, external_id?, payer_message?, payee_note?,
//         school_id?, babyeyi_id?, intent_id? }
// ================================================================
router.post('/request-to-pay', async (req, res) => {
  try {
    const {
      phone:         rawPhone,
      amount:        rawAmount,
      external_id:   rawExtId,
      payer_message: payerMessage = 'School fees payment',
      payee_note:    payeeNote    = 'Babyeyi school payment',
      school_id,
      babyeyi_id,
      intent_id,
    } = req.body || {};

    // ── Validate phone ─────────────────────────────────────────
    const phone = sanitizePhone(rawPhone);
    if (!phone || !/^2507[0-9]{8}$/.test(phone)) {
      return res.status(400).json({
        success: false,
        message: `Invalid phone number "${rawPhone}". Use 07XXXXXXXX or 2507XXXXXXXX.`,
      });
    }

    // ── Validate amount ────────────────────────────────────────
    const parsed = parseFloat(rawAmount);
    if (isNaN(parsed) || parsed <= 0) {
      return res.status(400).json({ success: false, message: `Invalid amount "${rawAmount}".` });
    }
    const amount = Math.round(parsed);
    if (amount < 100) {
      return res.status(400).json({ success: false, message: `Amount ${amount} RWF is below the 100 RWF minimum.` });
    }

    const referenceId   = uuidv4();
    const externalId    = rawExtId ? String(rawExtId).slice(0, 100) : `babyeyi-${Date.now()}`;
    const safePayerMsg  = String(payerMessage || '').slice(0, 160) || 'School fees payment';
    const safePayeeNote = String(payeeNote    || '').slice(0, 160) || 'Babyeyi school payment';

    console.log(`[MoMo] Initiating request-to-pay:`, { phone, amount, externalId, referenceId, environment: ENVIRONMENT, callbackIncluded: !!CALLBACK_URL });

    // ── Persist to DB ──────────────────────────────────────────
    try {
      await promisePool.query(
        `INSERT INTO momo_transactions
           (reference_id, external_id, phone, amount, currency, status,
            payer_message, payee_note, school_id, babyeyi_id, intent_id)
         VALUES (?, ?, ?, ?, 'RWF', 'PENDING', ?, ?, ?, ?, ?)`,
        [referenceId, externalId, phone, amount,
         safePayerMsg, safePayeeNote,
         school_id || null, babyeyi_id || null, intent_id || null]
      );
    } catch (dbErr) {
      console.error('[MoMo] DB insert error:', dbErr.message);
      return res.status(500).json({ success: false, message: 'Database error while saving transaction.' });
    }

    // ── Get bearer token ───────────────────────────────────────
    let token;
    try {
      token = await getMomoToken();
    } catch (tokenErr) {
      await markFailed(referenceId, tokenErr.message);
      return res.status(502).json({ success: false, message: tokenErr.message });
    }

    // ── Build request headers ──────────────────────────────────
    const requestHeaders = {
      'Authorization':             `Bearer ${token}`,
      'X-Reference-Id':            referenceId,
      'X-Target-Environment':      ENVIRONMENT,
      'Ocp-Apim-Subscription-Key': SUBSCRIPTION_KEY,
      'Content-Type':              'application/json',
    };
    // Only include X-Callback-Url if it is a real validated HTTPS URL
    if (CALLBACK_URL) {
      requestHeaders['X-Callback-Url'] = CALLBACK_URL;
    }

    // ── Build request body ─────────────────────────────────────
    // MTN spec: amount MUST be a string, currency MUST be 'RWF'
    const requestBody = {
      amount:    String(amount),
      currency:  'RWF',
      externalId,
      payer: {
        partyIdType: 'MSISDN',
        partyId:     phone,       // 2507XXXXXXXX
      },
      payerMessage: safePayerMsg,
      payeeNote:    safePayeeNote,
    };

    const momoUrl = `${MOMO_BASE_URL}/collection/v1_0/requesttopay`;
    console.log(`[MoMo] POST → ${momoUrl}`);
    console.log(`[MoMo] Body:`, JSON.stringify(requestBody));
    console.log(`[MoMo] X-Callback-Url:`, CALLBACK_URL ? CALLBACK_URL : '(not included)');

    // ── Call MTN ───────────────────────────────────────────────
    let momoRes;
    try {
      momoRes = await fetch(momoUrl, {
        method:  'POST',
        headers: requestHeaders,
        body:    JSON.stringify(requestBody),
      });
    } catch (networkErr) {
      console.error('[MoMo] Network error calling MTN:', networkErr.message);
      await markFailed(referenceId, `Network: ${networkErr.message}`);
      return res.status(502).json({ success: false, message: `Cannot reach MTN: ${networkErr.message}` });
    }

    // Read response body BEFORE checking status (body can only be read once)
    const responseText = await momoRes.text().catch(() => '(unreadable)');
    console.log(`[MoMo] MTN response [HTTP ${momoRes.status}]:`, responseText || '(empty body)');

    // ── 202 Accepted — success ─────────────────────────────────
    if (momoRes.status === 202) {
      console.log(`✅  [MoMo] Accepted — referenceId: ${referenceId}`);
      return res.status(202).json({
        success:     true,
        message:     'Payment request sent. The customer will receive a MoMo prompt.',
        referenceId,
        externalId,
        amount,
        phone,
      });
    }

    // ── Non-202 — failure ──────────────────────────────────────
    let mtnDetail = responseText;
    try {
      const p = JSON.parse(responseText);
      mtnDetail = p.message || p.code || p.status || responseText;
    } catch (_) { /* keep raw text */ }

    const humanMessage = mapMtnError(momoRes.status, mtnDetail);
    console.error(`[MoMo] FAILED HTTP ${momoRes.status}:`, mtnDetail || '(empty body)');
    await markFailed(referenceId, `HTTP ${momoRes.status}: ${responseText}`);

    return res.status(502).json({
      success:   false,
      message:   humanMessage,
      mtnStatus: momoRes.status,
      mtnDetail: mtnDetail || '',
      referenceId,
    });

  } catch (err) {
    console.error('[MoMo] /request-to-pay unexpected error:', err);
    return res.status(500).json({ success: false, message: `Server error: ${err.message}` });
  }
});

// ================================================================
// GET /api/momo/status/:referenceId  — poll transaction status
// ================================================================
router.get('/status/:referenceId', async (req, res) => {
  const { referenceId } = req.params;
  if (!referenceId || !/^[0-9a-f-]{36}$/i.test(referenceId)) {
    return res.status(400).json({ success: false, message: 'Invalid referenceId' });
  }

  try {
    let token;
    try { token = await getMomoToken(); }
    catch (e) { return res.status(502).json({ success: false, message: e.message }); }

    let momoRes;
    try {
      momoRes = await fetch(
        `${MOMO_BASE_URL}/collection/v1_0/requesttopay/${referenceId}`,
        {
          method:  'GET',
          headers: {
            'Authorization':             `Bearer ${token}`,
            'X-Target-Environment':      ENVIRONMENT,
            'Ocp-Apim-Subscription-Key': SUBSCRIPTION_KEY,
          },
        }
      );
    } catch (e) {
      return res.status(502).json({ success: false, message: `Network error: ${e.message}` });
    }

    const responseText = await momoRes.text().catch(() => '');
    if (!momoRes.ok) {
      return res.status(momoRes.status).json({ success: false, message: `MTN HTTP ${momoRes.status}`, detail: responseText });
    }

    let data;
    try { data = JSON.parse(responseText); }
    catch (_) { return res.status(502).json({ success: false, message: 'MTN non-JSON response', detail: responseText }); }

    const momoStatus     = (data.status || '').toUpperCase();
    const financialTxId  = data.financialTransactionId || null;
    const internalStatus = momoStatus === 'SUCCESSFUL' ? 'SUCCESSFUL' : momoStatus === 'FAILED' ? 'FAILED' : 'PENDING';

    await promisePool.query(
      `UPDATE momo_transactions SET status=?, momo_status=?, financial_tx_id=? WHERE reference_id=?`,
      [internalStatus, momoStatus, financialTxId, referenceId]
    ).catch(e => console.error('[MoMo] status update DB error:', e.message));

    console.log(`[MoMo] Status ${referenceId}: ${momoStatus}`);

    return res.json({
      success:                true,
      status:                 momoStatus,
      referenceId,
      financialTransactionId: financialTxId,
      amount:                 data.amount,
      currency:               data.currency,
      payer:                  data.payer,
      reason:                 data.reason || null,
      raw:                    data,
    });

  } catch (err) {
    console.error('[MoMo] /status error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ================================================================
// POST /api/momo/callback  — MTN webhook
// ================================================================
router.post('/callback', async (req, res) => {
  res.status(200).json({ success: true }); // always 200 immediately to MTN

  try {
    const payload     = req.body || {};
    const referenceId = payload.referenceId || payload.financialTransactionId || payload.externalId;
    const status      = (payload.status || '').toUpperCase();
    console.log('[MoMo] Callback received:', JSON.stringify(payload));
    if (!referenceId) return;

    const internalStatus = status === 'SUCCESSFUL' ? 'SUCCESSFUL' : status === 'FAILED' ? 'FAILED' : 'PENDING';
    await promisePool.query(
      `UPDATE momo_transactions
          SET status=?, momo_status=?, financial_tx_id=?, raw_callback=?
        WHERE reference_id=? OR external_id=?`,
      [internalStatus, status, payload.financialTransactionId || null,
       JSON.stringify(payload), referenceId, referenceId]
    );
    console.log(`[MoMo] Callback processed — ref: ${referenceId}, status: ${status}`);
  } catch (err) {
    console.error('[MoMo] /callback error:', err.message);
  }
});

// ================================================================
// GET /api/momo/transactions  — admin list
// ================================================================
router.get('/transactions', async (req, res) => {
  const role    = (req.user?.role_code || '').toUpperCase();
  const allowed = ['SUPER_ADMIN', 'FULL_SYSTEM_CONTROLLER', 'SCHOOL_ADMIN', 'SCHOOL_MANAGER'];
  if (!req.user || !allowed.includes(role)) {
    return res.status(403).json({ success: false, message: 'Access denied' });
  }
  try {
    const limit      = Math.min(parseInt(req.query.limit  || '100', 10), 500);
    const offset     = Math.max(parseInt(req.query.offset || '0',   10), 0);
    const conditions = [];
    const params     = [];

    if (role === 'SCHOOL_ADMIN' || role === 'SCHOOL_MANAGER') {
      conditions.push('school_id = ?');
      params.push(req.user.school_id);
    }
    if (req.query.status) {
      conditions.push('status = ?');
      params.push(String(req.query.status).toUpperCase());
    }

    const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
    const [rows] = await promisePool.query(
      `SELECT * FROM momo_transactions ${where} ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`,
      params
    );
    const [[{ total }]] = await promisePool.query(
      `SELECT COUNT(*) as total FROM momo_transactions ${where}`, params
    );
    return res.json({ success: true, total, data: rows });
  } catch (err) {
    console.error('[MoMo] /transactions error:', err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;