'use strict';

/**
 * Same MTN Collection path as public payments.jsx (publicBabyeyiPay → POST /api/momo/request-to-pay).
 * Uses MOMO_SUBSCRIPTION_KEY, MOMO_API_USER_ID, MOMO_API_KEY from .env (momoRoutes.js).
 */

function apiPort() {
  return Number(process.env.PORT) || 5100;
}

function isInternalMomoConfigured() {
  const sub = String(process.env.MTN_MOMO_SUBSCRIPTION_KEY || process.env.MOMO_SUBSCRIPTION_KEY || '').trim();
  const user = String(process.env.MTN_MOMO_API_USER || process.env.MOMO_API_USER_ID || '').trim();
  const key = String(process.env.MTN_MOMO_API_KEY || process.env.MOMO_API_KEY || '').trim();
  return !!(sub && user && key);
}

function internalMomoDisabledReason() {
  if (isInternalMomoConfigured()) return '';
  const missing = [];
  if (!(process.env.MTN_MOMO_SUBSCRIPTION_KEY || process.env.MOMO_SUBSCRIPTION_KEY)) {
    missing.push('MTN_MOMO_SUBSCRIPTION_KEY or MOMO_SUBSCRIPTION_KEY');
  }
  if (!(process.env.MTN_MOMO_API_USER || process.env.MOMO_API_USER_ID)) {
    missing.push('MTN_MOMO_API_USER or MOMO_API_USER_ID');
  }
  if (!(process.env.MTN_MOMO_API_KEY || process.env.MOMO_API_KEY)) {
    missing.push('MTN_MOMO_API_KEY or MOMO_API_KEY');
  }
  return missing.length ? `missing env: ${missing.join(', ')}` : '';
}

async function startInternalMomoRequestToPay({
  phoneMsisdn250,
  amountRwf,
  externalId,
  payerMessage,
  payeeNote,
  school_id,
  babyeyi_id,
  intent_id,
}) {
  const port = apiPort();
  const res = await fetch(`http://127.0.0.1:${port}/api/momo/request-to-pay`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      phone: phoneMsisdn250,
      amount: Number(amountRwf || 0),
      external_id: externalId,
      payer_message: payerMessage,
      payee_note: payeeNote,
      school_id: school_id || null,
      babyeyi_id: babyeyi_id || null,
      intent_id: intent_id || null,
    }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json.success) {
    const err = new Error(json.message || `MoMo initiation failed (HTTP ${res.status})`);
    err.httpStatus = res.status >= 400 && res.status < 600 ? res.status : 502;
    err.gateway = json;
    throw err;
  }
  return json;
}

async function getInternalMomoRequestToPayStatus(referenceId) {
  const port = apiPort();
  const res = await fetch(
    `http://127.0.0.1:${port}/api/momo/status/${encodeURIComponent(referenceId)}`
  );
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json.success) {
    const err = new Error(json.message || `MoMo status failed (HTTP ${res.status})`);
    err.httpStatus = res.status >= 400 && res.status < 600 ? res.status : 502;
    err.gateway = json;
    err.networkError = res.status >= 500 || res.status === 0;
    throw err;
  }
  return { status: json.status || 'PENDING', raw: json };
}

/** Minimal shim so classifyTeacherDealMtnStatus works with internal gateway status payloads. */
const internalMomoStatusMapper = {
  mapMtnStatusToUpper(raw) {
    return String(raw || '').trim().toUpperCase();
  },
};

module.exports = {
  isInternalMomoConfigured,
  internalMomoDisabledReason,
  startInternalMomoRequestToPay,
  getInternalMomoRequestToPayStatus,
  internalMomoStatusMapper,
};
