'use strict';

const { promisePool } = require('../config/database');

const TABLE = 'platform_activity_logs';
let tableReady = false;

function safeTrim(v, max = 500) {
  if (v === null || v === undefined) return '';
  return String(v).trim().slice(0, max);
}

function getClientIp(req) {
  const xf = safeTrim(req?.headers?.['x-forwarded-for'], 120);
  const fromXf = xf ? xf.split(',')[0].trim() : '';
  return (
    fromXf
    || safeTrim(req?.ip, 64)
    || safeTrim(req?.socket?.remoteAddress, 64)
    || null
  );
}

function getUserAgent(req) {
  return safeTrim(req?.headers?.['user-agent'], 255) || null;
}

function resolveProductTier(req, schoolRow) {
  const school = schoolRow || req?.user?.school || req?.session?.user?.school || null;
  if (school) {
    const plan = safeTrim(school.subscription_plan, 32).toLowerCase();
    const proOn = Number(school.pro_enabled) === 1 || school.pro_access_effective === true;
    if (proOn || plan.includes('pro')) return 'pro';
    return 'lite';
  }
  const role = safeTrim(req?.user?.role_code, 64).toUpperCase();
  if (role === 'SUPER_ADMIN' || role === 'FULL_SYSTEM_CONTROLLER' || role === 'NESA_ADMIN' || role === 'DEO') {
    return 'platform';
  }
  return 'lite';
}

function resolveSchoolId(req) {
  return (
    req?.user?.school_id
    || req?.user?.school?.id
    || req?.session?.school_id
    || req?.session?.user?.school_id
    || req?.session?.user?.school?.id
    || null
  );
}

function resolveUserId(req) {
  return req?.user?.id || req?.session?.userId || req?.session?.user?.id || null;
}

function resolveRoleCode(req) {
  return safeTrim(req?.user?.role_code || req?.session?.user?.role?.code, 64).toUpperCase() || null;
}

function actorLabelFromReq(req) {
  const u = req?.user;
  if (!u) return null;
  const name = `${safeTrim(u.first_name, 80)} ${safeTrim(u.last_name, 80)}`.trim();
  return name || safeTrim(u.email, 120) || null;
}

async function ensurePlatformActivityTable() {
  if (tableReady) return;
  await promisePool.query(`
    CREATE TABLE IF NOT EXISTS ${TABLE} (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      event_category VARCHAR(32) NOT NULL DEFAULT 'system',
      event_type VARCHAR(80) NOT NULL,
      outcome VARCHAR(24) NOT NULL DEFAULT 'success',
      user_id INT UNSIGNED NULL,
      role_code VARCHAR(64) NULL,
      school_id INT UNSIGNED NULL,
      product_tier VARCHAR(16) NULL,
      actor_label VARCHAR(200) NULL,
      action_summary VARCHAR(500) NULL,
      http_method VARCHAR(10) NULL,
      endpoint VARCHAR(255) NULL,
      entity_type VARCHAR(64) NULL,
      entity_id VARCHAR(80) NULL,
      ip_address VARCHAR(64) NULL,
      user_agent VARCHAR(255) NULL,
      request_id VARCHAR(64) NULL,
      details_json JSON NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      KEY idx_platform_act_time (created_at),
      KEY idx_platform_act_user (user_id, created_at),
      KEY idx_platform_act_school (school_id, created_at),
      KEY idx_platform_act_category (event_category, event_type, created_at),
      KEY idx_platform_act_ip (ip_address, created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  tableReady = true;
}

/**
 * Fire-and-forget platform activity log (login, logout, API actions).
 */
async function logPlatformActivity({
  eventCategory = 'system',
  eventType,
  outcome = 'success',
  userId = null,
  roleCode = null,
  schoolId = null,
  productTier = null,
  actorLabel = null,
  actionSummary = null,
  httpMethod = null,
  endpoint = null,
  entityType = null,
  entityId = null,
  ipAddress = null,
  userAgent = null,
  requestId = null,
  details = null,
  req = null,
}) {
  const evt = safeTrim(eventType, 80);
  if (!evt) return;

  const meta = req ? { ip: getClientIp(req), ua: getUserAgent(req) } : {};
  const uid = userId ?? (req ? resolveUserId(req) : null);
  const sid = schoolId ?? (req ? resolveSchoolId(req) : null);
  const rc = roleCode ?? (req ? resolveRoleCode(req) : null);
  const tier = productTier ?? (req ? resolveProductTier(req) : null);
  const actor = actorLabel ?? (req ? actorLabelFromReq(req) : null);

  try {
    await ensurePlatformActivityTable();
    await promisePool.query(
      `INSERT INTO ${TABLE}
        (event_category, event_type, outcome, user_id, role_code, school_id, product_tier,
         actor_label, action_summary, http_method, endpoint, entity_type, entity_id,
         ip_address, user_agent, request_id, details_json)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        safeTrim(eventCategory, 32) || 'system',
        evt,
        safeTrim(outcome, 24) || 'success',
        uid ? Number(uid) : null,
        rc || null,
        sid ? Number(sid) : null,
        safeTrim(tier, 16) || null,
        actor || null,
        actionSummary ? safeTrim(actionSummary, 500) : null,
        httpMethod ? safeTrim(httpMethod, 10) : null,
        endpoint ? safeTrim(endpoint, 255) : null,
        entityType ? safeTrim(entityType, 64) : null,
        entityId != null ? safeTrim(entityId, 80) : null,
        ipAddress ?? meta.ip ?? null,
        userAgent ?? meta.ua ?? null,
        requestId ? safeTrim(requestId, 64) : null,
        details ? JSON.stringify(details) : null,
      ]
    );
  } catch (e) {
    console.warn('[platformActivityLog]', e.message);
  }
}

function logPlatformActivityAsync(payload) {
  void logPlatformActivity(payload).catch(() => {});
}

module.exports = {
  TABLE,
  ensurePlatformActivityTable,
  logPlatformActivity,
  logPlatformActivityAsync,
  getClientIp,
  getUserAgent,
  resolveProductTier,
  resolveSchoolId,
  resolveUserId,
  resolveRoleCode,
  actorLabelFromReq,
};
