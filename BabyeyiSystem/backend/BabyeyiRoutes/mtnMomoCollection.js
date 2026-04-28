/**
 * MTN MoMo Collection API (Rwanda) — OAuth + Request to Pay.
 * Endpoints: POST /collection/token/, POST /collection/v1_0/requesttopay,
 * GET /collection/v1_0/requesttopay/{referenceId}
 *
 * Postman collection note (docs/postman/MTN MOMO*.json): two different hosts and keys are mixed:
 *   - Sandbox provisioning: https://sandbox.momodeveloper.mtn.com/v1_0/apiuser — uses subscription key A (e.g. 86cd…).
 *   - Rwanda live API:    https://proxy.momoapi.mtn.co.rw/collection/... — uses subscription key B (e.g. 8d44…).
 * Use the Collection product subscription key + API user + API key that belong to the SAME environment
 * as MTN_MOMO_BASE_URL. Do not use sandbox keys against proxy.momoapi.mtn.co.rw (typical 401/403).
 *
 * Env (all required to enable):
 *   MTN_MOMO_BASE_URL           — https://proxy.momoapi.mtn.co.rw (production RW) or sandbox collection host if testing sandbox
 *   MTN_MOMO_SUBSCRIPTION_KEY   — Ocp-Apim-Subscription-Key for Collection on that host
 *   MTN_MOMO_API_USER           — API User UUID (Basic auth user for /collection/token/)
 *   MTN_MOMO_API_KEY            — API Key (Basic auth password)
 *   MTN_MOMO_TARGET_ENVIRONMENT   — mtnrwanda (must match portal / product)
 *
 * Per payment: new X-Reference-Id (UUID) + unique externalId — these are NOT the API User.
 * The API User + API Key are one merchant credential pair from the portal; tokens are auto-fetched and cached until expiry.
 *
 * Optional (Postman “PAYMENT REQUEST WEB”): after MTN returns 202 for requesttopay, some stacks call a
 * partner URL to push the MoMo prompt, e.g. POST https://hosomobile.rw/api/v1/momopay/pay
 *   ?phoneNumber=250…&referenceId=<same X-Reference-Id>&token=<access_token>
 * Set MTN_MOMO_HOSO_PAY_BASE=https://hosomobile.rw to enable this second step (failure is logged only;
 * the official MTN request already succeeded).
 */
const axios = require('axios');
const crypto = require('crypto');

const MTN_MOMO_BASE_URL = String(process.env.MTN_MOMO_BASE_URL || 'https://proxy.momoapi.mtn.co.rw').replace(/\/+$/, '');
const MTN_MOMO_SUBSCRIPTION_KEY = String(process.env.MTN_MOMO_SUBSCRIPTION_KEY || '').trim();
const MTN_MOMO_API_USER = String(process.env.MTN_MOMO_API_USER || '').trim();
const MTN_MOMO_API_KEY = String(process.env.MTN_MOMO_API_KEY || '').trim();
const MTN_MOMO_TARGET_ENVIRONMENT = String(process.env.MTN_MOMO_TARGET_ENVIRONMENT || 'mtnrwanda').trim();
const MTN_MOMO_CURRENCY = String(process.env.MTN_MOMO_CURRENCY || 'RWF').trim();
/** e.g. https://hosomobile.rw — if set, after successful requesttopay we POST to …/api/v1/momopay/pay (see Postman) */
const MTN_MOMO_HOSO_PAY_BASE = String(process.env.MTN_MOMO_HOSO_PAY_BASE || '').trim().replace(/\/+$/, '');

/** Sandbox sample key from MTN Postman — not accepted on proxy.momoapi.mtn.co.rw */
const MTN_MOMO_KNOWN_SANDBOX_SUBSCRIPTION_KEY = '8d44cd466d6448b1906705e640997896';

/** WAFs (e.g. F5) often return HTTP 200 + HTML "Request Rejected" — not the real MTN JSON API. */
const MTN_HTTP_HEADERS = {
  Accept: 'application/json',
  'User-Agent': 'Babyeyi-MoMo-Collection/1.0 (Node.js)',
};

function extractWafSupportIdFromBody(data) {
  const s = typeof data === 'string' ? data : '';
  const m = s.match(/support ID is:\s*([0-9]+)/i);
  return m ? m[1] : null;
}

function isWafOrHtmlBlockResponse(data, headers) {
  const ct = String(headers?.['content-type'] || headers?.['Content-Type'] || '').toLowerCase();
  if (ct.includes('text/html')) return true;
  if (typeof data === 'string') {
    if (/<\s*html[\s>]/i.test(data)) return true;
    if (/request rejected/i.test(data)) return true;
  }
  return false;
}

function assertNotWafHtml(data, headers, label) {
  if (!isWafOrHtmlBlockResponse(data, headers)) return;
  const sid = extractWafSupportIdFromBody(data);
  const hint = sid ? ` Gateway support ID: ${sid}.` : '';
  throw new Error(
    `${label}: MTN edge returned an HTML block page (not API JSON).${hint} `
    + 'Your subscription key and API key are not the issue — the HTTP request was rejected before the API (IP/geo/WAF). '
    + 'Run the server from an MTN-approved network, ask MTN to allowlist your server IP, or contact MTN MoMo support with the support ID.'
  );
}

function rejectPollResponseIfHtmlBlock(res, label) {
  if (res.status >= 200 && res.status < 300 && isWafOrHtmlBlockResponse(res.data, res.headers)) {
    assertNotWafHtml(res.data, res.headers, label);
  }
}

function mtnMomoEnabled() {
  return !!(MTN_MOMO_SUBSCRIPTION_KEY && MTN_MOMO_API_USER && MTN_MOMO_API_KEY);
}

if (
  mtnMomoEnabled()
  && MTN_MOMO_BASE_URL.includes('proxy.momoapi.mtn.co.rw')
  && MTN_MOMO_SUBSCRIPTION_KEY === MTN_MOMO_KNOWN_SANDBOX_SUBSCRIPTION_KEY
) {
  console.warn(
    '[mtnMomo] Production base URL (proxy.momoapi.mtn.co.rw) is paired with the known sandbox subscription key — set MTN_MOMO_SUBSCRIPTION_KEY to your Rwanda Collection primary key from the MTN portal.'
  );
}

function buildBasicAuthHeader() {
  const raw = `${MTN_MOMO_API_USER}:${MTN_MOMO_API_KEY}`;
  return `Basic ${Buffer.from(raw, 'utf8').toString('base64')}`;
}

/** In-memory OAuth cache — same Postman flow: POST /collection/token/ then Bearer on RTP + GET status. */
let tokenCache = { accessToken: '', expiresAtMs: 0 };
const TOKEN_REFRESH_SKEW_MS = 60_000;
const DEFAULT_TOKEN_EXPIRES_SEC = 3600;

function invalidateMtnTokenCache() {
  tokenCache = { accessToken: '', expiresAtMs: 0 };
}

/**
 * Fetches OAuth access_token (or returns cached until near expiry).
 * Uses MTN_MOMO_API_USER + MTN_MOMO_API_KEY (Basic) + subscription key — same as Postman "TOKEN".
 */
async function getCollectionAccessToken() {
  const now = Date.now();
  if (
    tokenCache.accessToken
    && tokenCache.expiresAtMs > now + TOKEN_REFRESH_SKEW_MS
  ) {
    return tokenCache.accessToken;
  }

  const { data, status, headers } = await axios.post(
    `${MTN_MOMO_BASE_URL}/collection/token/`,
    {},
    {
      headers: {
        ...MTN_HTTP_HEADERS,
        Authorization: buildBasicAuthHeader(),
        'Ocp-Apim-Subscription-Key': MTN_MOMO_SUBSCRIPTION_KEY,
      },
      timeout: 30000,
      validateStatus: () => true,
    }
  );
  if (status >= 400) {
    invalidateMtnTokenCache();
    const msg = extractMtnError(data) || `Token request failed (${status})`;
    const err = new Error(msg);
    err.mtnStatus = status;
    err.mtnBody = data;
    throw err;
  }
  try {
    assertNotWafHtml(data, headers, 'MTN /collection/token/');
  } catch (e) {
    invalidateMtnTokenCache();
    throw e;
  }
  const token = String(data?.access_token || '').trim();
  if (!token) {
    invalidateMtnTokenCache();
    throw new Error('MTN MoMo token response missing access_token (got non-JSON or empty body)');
  }
  const expiresInSec = Math.max(
    60,
    Number(data?.expires_in) || DEFAULT_TOKEN_EXPIRES_SEC
  );
  tokenCache = {
    accessToken: token,
    expiresAtMs: now + expiresInSec * 1000,
  };
  return token;
}

/** MTN may echo a canonical id in Location or JSON; GET status must use the same id the platform indexed. */
function extractReferenceIdFromLocation(location) {
  if (!location || typeof location !== 'string') return null;
  const m = location.match(/requesttopay\/([0-9a-f-]{36})/i);
  return m ? m[1].toLowerCase() : null;
}

function resolveEffectiveReferenceId(sentReferenceId, data, headers) {
  const fromLoc = extractReferenceIdFromLocation(headers?.location);
  if (fromLoc) return fromLoc;
  const d = data && typeof data === 'object' ? data : {};
  const fromBody = d.referenceId || d.reference_id || d.referenceID;
  if (fromBody != null && String(fromBody).trim()) {
    return String(fromBody).trim().toLowerCase();
  }
  return String(sentReferenceId || '').trim().toLowerCase();
}

function extractMtnError(payload) {
  if (!payload) return null;
  if (typeof payload === 'string') return payload.slice(0, 500);
  const code = payload.code != null ? String(payload.code) : '';
  const m = payload.message || payload.error || payload.err;
  if (typeof m === 'string') return (code ? `[${code}] ` : '') + m.slice(0, 450);
  try {
    return JSON.stringify(payload).slice(0, 500);
  } catch (_) {
    return null;
  }
}

/**
 * Initiates Request to Pay — customer receives MTN MoMo prompt on handset.
 * @returns {{ referenceId: string, statusCode: number }}
 */
async function requestToPay({
  amount,
  currency,
  externalId,
  msisdn250,
  payerMessage,
  payeeNote,
}) {
  const bodyBase = {
    amount: String(Math.max(1, Math.round(Number(amount || 0)))),
    currency: currency || MTN_MOMO_CURRENCY,
    externalId: String(externalId || 'pay').slice(0, 64),
    payer: {
      partyIdType: 'MSISDN',
      partyId: String(msisdn250).replace(/\D/g, ''),
    },
    payerMessage: String(payerMessage || 'School payment').slice(0, 140),
    payeeNote: String(payeeNote || 'Babyeyi').slice(0, 140),
  };

  let lastStatus;
  let lastData;
  let referenceId;
  let token;

  for (let authAttempt = 0; authAttempt < 2; authAttempt++) {
    token = await getCollectionAccessToken();
    referenceId = crypto.randomUUID();

    const { status, data, headers } = await axios.post(
      `${MTN_MOMO_BASE_URL}/collection/v1_0/requesttopay`,
      bodyBase,
      {
        headers: {
          ...MTN_HTTP_HEADERS,
          Authorization: `Bearer ${token}`,
          'X-Reference-Id': referenceId,
          'X-Target-Environment': MTN_MOMO_TARGET_ENVIRONMENT,
          'Ocp-Apim-Subscription-Key': MTN_MOMO_SUBSCRIPTION_KEY,
          'Content-Type': 'application/json',
        },
        timeout: 35000,
        validateStatus: () => true,
      }
    );
    lastStatus = status;
    lastData = data;

    if (status === 401 && authAttempt === 0) {
      invalidateMtnTokenCache();
      continue;
    }

    if (status !== 202 && status !== 200) {
      const msg = extractMtnError(data) || `Request to pay failed (${status})`;
      const err = new Error(msg);
      err.mtnStatus = status;
      err.mtnBody = data;
      throw err;
    }

    try {
      assertNotWafHtml(data, headers, 'MTN /collection/v1_0/requesttopay');
    } catch (e) {
      e.mtnStatus = status;
      e.mtnBody = data;
      throw e;
    }

    const effectiveRef = resolveEffectiveReferenceId(referenceId, data, headers);
    if (effectiveRef !== String(referenceId).trim().toLowerCase()) {
      console.info('[mtnMomo] requesttopay MTN reference differs from client X-Reference-Id', {
        clientXReferenceId: referenceId,
        effectiveReferenceId: effectiveRef,
        location: headers?.location || null,
      });
    }
    if (data != null && (typeof data !== 'object' || Object.keys(data).length > 0)) {
      const sample = typeof data === 'string' ? data.slice(0, 400) : JSON.stringify(data).slice(0, 600);
      console.info('[mtnMomo] requesttopay response body (truncated)', sample);
    }

    console.info('[mtnMomo] requesttopay accepted', { referenceId: effectiveRef, httpStatus: status });

    if (MTN_MOMO_HOSO_PAY_BASE) {
      await notifyHosomobileMomopay({
        accessToken: token,
        referenceId: effectiveRef,
        msisdn250,
        amount: bodyBase.amount,
        currency: bodyBase.currency,
        externalId: bodyBase.externalId,
        payerMessage: bodyBase.payerMessage,
        payeeNote: bodyBase.payeeNote,
      });
    }

    return { referenceId: effectiveRef, statusCode: status, responseBody: data };
  }

  const msg = extractMtnError(lastData) || `Request to pay failed (${lastStatus})`;
  const err = new Error(msg);
  err.mtnStatus = lastStatus;
  err.mtnBody = lastData;
  throw err;
}

/**
 * Matches Postman “PAYMENT REQUEST WEB”: POST …/momopay/pay?phoneNumber&referenceId&token
 * plus Bearer + MTN headers (collection uses the same token as query param).
 */
async function notifyHosomobileMomopay({
  accessToken,
  referenceId,
  msisdn250,
  amount,
  currency,
  externalId,
  payerMessage,
  payeeNote,
}) {
  const base = MTN_MOMO_HOSO_PAY_BASE;
  if (!base) return;
  const phone = String(msisdn250 || '').replace(/\D/g, '');
  if (!phone || !referenceId || !accessToken) return;

  const url = `${base}/api/v1/momopay/pay`;
  const postBody = {
    externalId: String(externalId || 'pay').slice(0, 64),
    amount: String(amount),
    currency: currency || MTN_MOMO_CURRENCY,
    payer: { partyIdType: 'MSISDN', partyId: phone },
    payerMessage: String(payerMessage || 'Payment').slice(0, 140),
    payeeNote: String(payeeNote || 'Babyeyi').slice(0, 140),
  };
  try {
    const { status, data } = await axios.post(
      url,
      postBody,
      {
        params: {
          phoneNumber: phone,
          referenceId: String(referenceId),
          token: String(accessToken),
        },
        headers: {
          ...MTN_HTTP_HEADERS,
          Authorization: `Bearer ${accessToken}`,
          'Ocp-Apim-Subscription-Key': MTN_MOMO_SUBSCRIPTION_KEY,
          'X-Target-Environment': MTN_MOMO_TARGET_ENVIRONMENT,
          'X-Reference-Id': String(referenceId),
          'Content-Type': 'application/json',
        },
        timeout: 25000,
        validateStatus: () => true,
      }
    );
    if (status >= 400) {
      console.warn('[mtnMomo] hosomobile momopay/pay returned', status, extractMtnError(data) || data);
    }
  } catch (e) {
    console.warn('[mtnMomo] hosomobile momopay/pay failed:', e.message);
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Rwanda proxy (docs/postman/MTN MOMO*.json):
 * - "GET PAYMENT REQUEST": GET …/requesttopay/{id} — Bearer + Ocp-Apim-Subscription-Key + X-Target-Environment only (no X-Reference-Id).
 * - "GET PAYMENT REQUEST WEB APP": POST same URL with empty body — some stacks need this when GET returns 404.
 */
async function fetchRequestToPayStatusRw(referenceId, token) {
  const id = String(referenceId || '').trim().toLowerCase();
  const url = `${MTN_MOMO_BASE_URL}/collection/v1_0/requesttopay/${encodeURIComponent(id)}`;
  const commonHeaders = {
    ...MTN_HTTP_HEADERS,
    Authorization: `Bearer ${token}`,
    'X-Target-Environment': MTN_MOMO_TARGET_ENVIRONMENT,
    'Ocp-Apim-Subscription-Key': MTN_MOMO_SUBSCRIPTION_KEY,
  };

  let res = await axios.get(url, {
    headers: commonHeaders,
    timeout: 30000,
    validateStatus: () => true,
  });

  if (res.status === 404) {
    res = await axios.post(
      url,
      {},
      {
        headers: {
          ...commonHeaders,
          'Content-Type': 'application/json',
        },
        timeout: 30000,
        validateStatus: () => true,
      }
    );
  }

  return res;
}

async function getRequestToPayStatus(referenceId) {
  const id = String(referenceId || '').trim().toLowerCase();
  if (!id) throw new Error('Missing MTN reference id');

  let data;
  let status;

  for (let authAttempt = 0; authAttempt < 2; authAttempt++) {
    const token = await getCollectionAccessToken();
    try {
      let res = await fetchRequestToPayStatusRw(id, token);
      rejectPollResponseIfHtmlBlock(res, 'MTN requesttopay status poll');
      data = res.data;
      status = res.status;

      if (status === 401 && authAttempt === 0) {
        invalidateMtnTokenCache();
        continue;
      }

      if (status === 404) {
        await sleep(2000);
        res = await fetchRequestToPayStatusRw(id, token);
        rejectPollResponseIfHtmlBlock(res, 'MTN requesttopay status poll (retry)');
        data = res.data;
        status = res.status;
      }
    } catch (e) {
      const err = new Error(e.message || 'MTN requesttopay status network error');
      err.networkError = true;
      err.cause = e;
      throw err;
    }
    break;
  }

  if (status === 404) {
    console.warn(
      '[mtnMomo] requesttopay status: GET and POST (Rwanda) still 404 after delay — MTN has no RTP for this referenceId, or credentials/subscription do not match the RTP that was created.',
      { referenceId: id }
    );
    return { status: 'PENDING', mtnNotFound: true };
  }

  if (status >= 400) {
    const msg = extractMtnError(data) || `Status check failed (${status})`;
    const err = new Error(msg);
    err.mtnStatus = status;
    err.mtnBody = data;
    throw err;
  }
  return data || {};
}

function mapMtnStatusToUpper(raw) {
  return String(raw || '').trim().toUpperCase();
}

module.exports = {
  mtnMomoEnabled,
  requestToPay,
  getRequestToPayStatus,
  mapMtnStatusToUpper,
  invalidateMtnTokenCache,
};
