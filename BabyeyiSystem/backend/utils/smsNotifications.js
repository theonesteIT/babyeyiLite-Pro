'use strict';

const axios = require('axios');

function trimStr(v) {
  return String(v ?? '').trim();
}

/** Rwanda mobile — aligned with students.js / parentWebPush.js */
function normalizeRwandaPhone(raw) {
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

function toSmsInternational(raw) {
  const local = normalizeRwandaPhone(raw);
  if (!local) return null;
  return `+250${local.slice(1)}`;
}

function toMsisdn250(raw) {
  const local = normalizeRwandaPhone(raw);
  if (!local) return null;
  return `250${local.slice(1)}`;
}

function responseText(data) {
  if (data == null) return '';
  if (typeof data === 'string') return data.trim();
  try {
    return JSON.stringify(data);
  } catch (_) {
    return String(data);
  }
}

function parseAfroBulkResponse(data, status) {
  const text = responseText(data);
  const lower = text.toLowerCase();
  let parsed = null;

  if (data && typeof data === 'object') parsed = data;
  else {
    try {
      parsed = JSON.parse(text);
    } catch (_) {
      parsed = null;
    }
  }

  if (parsed && typeof parsed === 'object') {
    const rawCode = parsed.response ?? parsed.code ?? parsed.status_code ?? parsed.StatusCode;
    if (rawCode != null && /^\d+$/.test(String(rawCode).trim())) {
      const code = String(rawCode).trim();
      const errorCodes = new Set(
        trimStr(process.env.AFROBULK_SMS_ERROR_CODES || '')
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
      );
      if (errorCodes.has(code)) {
        return { ok: false, error: `AfroBulk error code ${code}` };
      }
      // AfroBulk compose API returns a numeric id on success (e.g. {"response":"1016"}).
      if (status >= 200 && status < 300) {
        return { ok: true, response: text.slice(0, 500), providerCode: code };
      }
      return { ok: false, error: `AfroBulk HTTP ${status} (code ${code})` };
    }

    const statusVal = trimStr(parsed.status || parsed.Status || parsed.response?.status).toLowerCase();
    const successVal = parsed.success ?? parsed.Success ?? parsed.response?.success;
    const messageVal = trimStr(parsed.message || parsed.Message || parsed.error || parsed.response?.message);

    if (successVal === true || statusVal === 'success' || statusVal === 'sent') {
      return { ok: true, response: text.slice(0, 500) };
    }
    if (successVal === false || statusVal === 'failed' || statusVal === 'error' || statusVal === 'invalid_json') {
      return { ok: false, error: messageVal || text.slice(0, 500) };
    }
    if (messageVal && /(fail|invalid|insufficient|unauthorized|denied|error)/i.test(messageVal)) {
      return { ok: false, error: messageVal };
    }
  }

  if (status >= 400) return { ok: false, error: text.slice(0, 500) || `HTTP ${status}` };
  if (/(insufficient|invalid api|unauthorized|auth_failure|missing_apikey|error)/i.test(text)) {
    return { ok: false, error: text.slice(0, 500) };
  }
  if (/(success|sent|queued|accepted|submitted)/i.test(text)) {
    return { ok: true, response: text.slice(0, 500) };
  }
  if (status >= 200 && status < 300 && text) {
    return { ok: true, response: text.slice(0, 500), warn: 'unverified_response' };
  }
  return { ok: false, error: text.slice(0, 500) || `HTTP ${status}` };
}

function sanitizeSmsText(text) {
  return trimStr(text)
    .normalize('NFKC')
    .replace(/[\u2013\u2014\u2015]/g, '-')
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, '')
    .replace(/\s+/g, ' ')
    .slice(0, 480);
}

function buildAfroBulkParams({ apiKey, phone, message }) {
  const intl = toSmsInternational(phone);
  const msisdn = toMsisdn250(phone);
  const body = sanitizeSmsText(message);
  if (!intl || !msisdn || !body) return null;

  return {
    intl,
    msisdn,
    body,
    params: new URLSearchParams({
      api_key: apiKey,
      from_type: trimStr(process.env.AFROBULK_SMS_FROM_TYPE) || 'sender_id',
      from_number: trimStr(process.env.AFROBULK_SMS_FROM_NUMBER) || '250791902917',
      sender_id: trimStr(process.env.AFROBULK_SMS_SENDER_ID) || 'MOPAS-MFA',
      to_numbers: intl,
      body,
      isSchedule: '',
      schedule: '',
    }),
  };
}

async function requestAfroBulk(params) {
  const baseUrl = trimStr(process.env.AFROBULK_SMS_API_BASE) || 'https://afrobulksms.com/api/sent/compose';
  const query = params.toString();
  const url = `${baseUrl}?${query}`;
  if (url.length > 1800) {
    console.warn('[sms/afrobulksms] URL too long:', url.length, 'chars');
  }
  const res = await axios.get(url, {
    timeout: 20000,
    validateStatus: () => true,
    headers: { Accept: 'application/json, text/plain, */*' },
  });
  return { res, parsed: parseAfroBulkResponse(res.data, res.status), urlLength: url.length };
}

async function sendViaAfroBulk({ phone, message }) {
  const apiKey = trimStr(process.env.AFROBULK_SMS_API_KEY);
  if (!apiKey) return null;

  const built = buildAfroBulkParams({ apiKey, phone, message });
  if (!built) return { sent: false, skipped: 'invalid_phone_or_message' };

  try {
    let { res, parsed } = await requestAfroBulk(built.params);

    if (!parsed.ok && built.intl.startsWith('+')) {
      const retryParams = new URLSearchParams(built.params);
      retryParams.set('to_numbers', built.msisdn);
      ({ res, parsed } = await requestAfroBulk(retryParams));
    }

    if (parsed.ok) {
      const providerCode = parsed.providerCode || null;
      console.info(
        '[sms/afrobulksms] accepted for',
        built.intl,
        providerCode ? `(ref ${providerCode})` : '',
        `"${built.body.slice(0, 80)}${built.body.length > 80 ? '...' : ''}"`
      );
      return {
        sent: true,
        to: built.intl,
        providerCode,
        providerResponse: parsed.response || responseText(res.data).slice(0, 500),
      };
    }

    console.warn('[sms/afrobulksms] provider rejected:', parsed.error || responseText(res.data).slice(0, 300));
    return {
      sent: false,
      skipped: 'sms_send_failed',
      to: built.intl,
      error: parsed.error || `HTTP ${res.status}`,
      providerResponse: responseText(res.data).slice(0, 500),
    };
  } catch (err) {
    console.warn('[sms/afrobulksms]', err.message);
    return { sent: false, skipped: 'sms_send_failed', error: err.message };
  }
}

async function sendViaLegacyPost({ phone, message }) {
  const localPhone = normalizeRwandaPhone(phone);
  const text = trimStr(message);
  const smsApiUrl = trimStr(process.env.SMS_API_URL);
  if (!smsApiUrl) {
    return { sent: false, skipped: 'sms_not_configured' };
  }
  if (!localPhone || !text) return { sent: false, skipped: 'invalid_phone_or_message' };

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
    return { sent: true, to: toSmsInternational(localPhone) };
  } catch (err) {
    console.warn('[sms/legacy]', err.message);
    return { sent: false, skipped: 'sms_send_failed', error: err.message };
  }
}

/**
 * Send SMS to a parent/guardian phone (AfroBulk preferred, legacy POST fallback).
 */
async function sendParentSms({ phone, message }) {
  const afro = await sendViaAfroBulk({ phone, message });
  if (afro !== null) return afro;
  return sendViaLegacyPost({ phone, message });
}

function isSmsConfigured() {
  return !!(trimStr(process.env.AFROBULK_SMS_API_KEY) || trimStr(process.env.SMS_API_URL));
}

module.exports = {
  sendParentSms,
  sanitizeSmsText,
  toSmsInternational,
  toMsisdn250,
  normalizeRwandaPhone,
  isSmsConfigured,
};
