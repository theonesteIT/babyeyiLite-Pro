'use strict';

const crypto = require('crypto');
const { promisePool } = require('../config/database');
const { ensureSchoolMonitoringTables } = require('./schoolMonitoringSchema');

function safeTrim(v, max = 255) {
  if (v === null || v === undefined) return '';
  return String(v).trim().slice(0, max);
}

function parseDevice(userAgent) {
  const ua = safeTrim(userAgent, 255);
  if (!ua) return 'Unknown device';
  if (/iphone|ipad/i.test(ua)) return 'Safari / iOS';
  if (/android/i.test(ua)) return 'Chrome / Android';
  if (/firefox/i.test(ua)) return 'Firefox';
  if (/edg/i.test(ua)) return 'Edge / Windows';
  if (/chrome/i.test(ua)) return 'Chrome';
  if (/mac/i.test(ua)) return 'Safari / Mac';
  if (/windows/i.test(ua)) return 'Chrome / Windows';
  return ua.slice(0, 60);
}

function deviceFingerprint(userAgent, ip) {
  const raw = `${safeTrim(userAgent, 200)}|${safeTrim(ip, 64)}`;
  return crypto.createHash('sha256').update(raw).digest('hex').slice(0, 32);
}

function sessionPresenceStatus(lastActivityAt) {
  if (!lastActivityAt) return 'offline';
  const t = new Date(lastActivityAt).getTime();
  if (Number.isNaN(t)) return 'offline';
  const diff = Date.now() - t;
  if (diff < 5 * 60_000) return 'online';
  if (diff < 20 * 60_000) return 'idle';
  return 'offline';
}

async function upsertUserDevice({ userId, userAgent, ip }) {
  if (!userId) return;
  await ensureSchoolMonitoringTables();
  const fp = deviceFingerprint(userAgent, ip);
  const label = parseDevice(userAgent);
  await promisePool.query(
    `INSERT INTO user_devices (user_id, device_fingerprint, device_label, user_agent, last_ip, last_seen_at)
     VALUES (?, ?, ?, ?, ?, NOW())
     ON DUPLICATE KEY UPDATE
       device_label = VALUES(device_label),
       user_agent = VALUES(user_agent),
       last_ip = VALUES(last_ip),
       last_seen_at = NOW()`,
    [userId, fp, label, safeTrim(userAgent, 255) || null, safeTrim(ip, 64) || null]
  );
}

async function upsertUserSession({
  sessionKey,
  userId,
  schoolId,
  roleCode,
  productTier,
  ip,
  userAgent,
}) {
  if (!sessionKey || !userId) return;
  await ensureSchoolMonitoringTables();
  const device = parseDevice(userAgent);
  await promisePool.query(
    `INSERT INTO user_sessions
      (session_key, user_id, school_id, role_code, product_tier, ip_address, user_agent, device_label, status, login_at, last_activity_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'online', NOW(), NOW())
     ON DUPLICATE KEY UPDATE
       user_id = VALUES(user_id),
       school_id = VALUES(school_id),
       role_code = VALUES(role_code),
       product_tier = VALUES(product_tier),
       ip_address = VALUES(ip_address),
       user_agent = VALUES(user_agent),
       device_label = VALUES(device_label),
       status = 'online',
       last_activity_at = NOW(),
       logout_at = NULL,
       is_forced_logout = 0`,
    [
      sessionKey,
      userId,
      schoolId || null,
      roleCode || null,
      productTier || null,
      ip || null,
      safeTrim(userAgent, 255) || null,
      device,
    ]
  );
  await upsertUserDevice({ userId, userAgent, ip });
  await promisePool.query(
    `INSERT INTO user_status_tracking (user_id, school_id, status, last_seen_at, last_ip, is_disabled, is_locked)
     VALUES (?, ?, 'online', NOW(), ?, 0, 0)
     ON DUPLICATE KEY UPDATE
       school_id = VALUES(school_id),
       status = 'online',
       last_seen_at = NOW(),
       last_ip = VALUES(last_ip),
       updated_at = NOW()`,
    [userId, schoolId || null, ip || null]
  );
}

async function touchUserSessionActivity(userId) {
  if (!userId) return;
  await ensureSchoolMonitoringTables();
  await promisePool.query(
    `UPDATE user_sessions SET last_activity_at = NOW(),
      status = CASE
        WHEN logout_at IS NOT NULL THEN status
        ELSE 'online'
      END
     WHERE user_id = ? AND logout_at IS NULL
     ORDER BY last_activity_at DESC LIMIT 3`,
    [userId]
  );
  const st = sessionPresenceStatus(new Date());
  await promisePool.query(
    `UPDATE user_status_tracking SET status = ?, last_seen_at = NOW(), updated_at = NOW() WHERE user_id = ?`,
    [st === 'offline' ? 'idle' : st, userId]
  );
}

async function closeUserSessions(userId, forced = false) {
  if (!userId) return;
  await ensureSchoolMonitoringTables();
  await promisePool.query(
    `UPDATE user_sessions SET status = 'offline', logout_at = NOW(), is_forced_logout = ?
     WHERE user_id = ? AND logout_at IS NULL`,
    [forced ? 1 : 0, userId]
  );
  await promisePool.query(
    `UPDATE user_status_tracking SET status = 'offline', updated_at = NOW() WHERE user_id = ?`,
    [userId]
  );
}

async function recordLoginAttempt({
  userId,
  schoolId,
  roleCode,
  outcome,
  ip,
  userAgent,
  productTier,
  identifierHint,
  failureReason,
}) {
  await ensureSchoolMonitoringTables();
  await promisePool.query(
    `INSERT INTO login_attempts
      (user_id, school_id, role_code, identifier_hint, outcome, ip_address, user_agent, product_tier, failure_reason)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      userId || null,
      schoolId || null,
      roleCode || null,
      identifierHint || null,
      outcome || 'failed',
      ip || null,
      safeTrim(userAgent, 255) || null,
      productTier || null,
      failureReason || null,
    ]
  );
}

async function recordActivityLog({
  userId,
  schoolId,
  roleCode,
  module,
  actionType,
  actionSummary,
  entityType,
  entityId,
  beforeValue,
  afterValue,
  riskLevel,
  ip,
  userAgent,
  productTier,
  sourceTable,
  sourceId,
}) {
  await ensureSchoolMonitoringTables();
  const [r] = await promisePool.query(
    `INSERT INTO activity_logs
      (user_id, school_id, role_code, module, action_type, action_summary, entity_type, entity_id,
       before_value, after_value, risk_level, ip_address, user_agent, product_tier, source_table, source_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      userId || null,
      schoolId || null,
      roleCode || null,
      module || null,
      actionType || 'action',
      actionSummary || null,
      entityType || null,
      entityId != null ? String(entityId) : null,
      beforeValue != null ? String(beforeValue).slice(0, 4000) : null,
      afterValue != null ? String(afterValue).slice(0, 4000) : null,
      riskLevel || 'Low',
      ip || null,
      safeTrim(userAgent, 255) || null,
      productTier || null,
      sourceTable || null,
      sourceId || null,
    ]
  );
  return r.insertId;
}

async function maybeFlagSuspicious({
  userId,
  schoolId,
  threatType,
  detail,
  riskLevel = 'High',
  ip,
  activityLogId,
}) {
  await ensureSchoolMonitoringTables();
  await promisePool.query(
    `INSERT INTO suspicious_activities (user_id, school_id, threat_type, detail, risk_level, status, ip_address, activity_log_id)
     VALUES (?, ?, ?, ?, ?, 'Pending', ?, ?)`,
    [userId || null, schoolId || null, threatType, detail, riskLevel, ip || null, activityLogId || null]
  );
  if (userId) {
    await promisePool.query(
      `UPDATE user_status_tracking SET is_suspicious = 1, updated_at = NOW() WHERE user_id = ?`,
      [userId]
    );
  }
}

async function recordAuditTrail({ userId, schoolId, trailType, description, meta, ip }) {
  await ensureSchoolMonitoringTables();
  await promisePool.query(
    `INSERT INTO audit_trails (user_id, school_id, trail_type, description, meta_json, ip_address)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [userId || null, schoolId || null, trailType, description, meta ? JSON.stringify(meta) : null, ip || null]
  );
}

module.exports = {
  parseDevice,
  deviceFingerprint,
  sessionPresenceStatus,
  upsertUserSession,
  touchUserSessionActivity,
  closeUserSessions,
  recordLoginAttempt,
  recordActivityLog,
  maybeFlagSuspicious,
  recordAuditTrail,
  upsertUserDevice,
};
