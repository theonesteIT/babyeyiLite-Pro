'use strict';

const { promisePool } = require('../config/database');

const TABLE = 'parent_portal_audit_logs';

function safeTrim(v) {
  if (v === null || v === undefined) return '';
  return String(v).trim();
}

async function ensureParentAuditLogTable() {
  await promisePool.query(`
    CREATE TABLE IF NOT EXISTS ${TABLE} (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      parent_portal_account_id INT UNSIGNED NULL,
      parent_phone VARCHAR(32) NULL,
      actor_type VARCHAR(32) NOT NULL DEFAULT 'parent',
      event_type VARCHAR(80) NOT NULL,
      entity_type VARCHAR(40) NULL,
      entity_id VARCHAR(64) NULL,
      channel VARCHAR(32) NULL,
      outcome VARCHAR(24) NOT NULL DEFAULT 'success',
      ip_address VARCHAR(64) NULL,
      user_agent VARCHAR(255) NULL,
      details_json JSON NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      KEY idx_parent_audit_parent (parent_portal_account_id),
      KEY idx_parent_audit_phone (parent_phone),
      KEY idx_parent_audit_event_time (event_type, created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
}

function getRequestMeta(req) {
  const xf = safeTrim(req?.headers?.['x-forwarded-for']);
  const ip = safeTrim((xf ? xf.split(',')[0] : '') || req?.ip || req?.socket?.remoteAddress || '');
  const userAgent = safeTrim(req?.headers?.['user-agent']).slice(0, 255) || null;
  return {
    ip: ip || null,
    userAgent,
  };
}

async function logParentAuditEvent({
  parentPortalAccountId = null,
  parentPhone = null,
  actorType = 'parent',
  eventType,
  entityType = null,
  entityId = null,
  channel = null,
  outcome = 'success',
  details = null,
  ipAddress = null,
  userAgent = null,
}) {
  const evt = safeTrim(eventType).slice(0, 80);
  if (!evt) return;
  await ensureParentAuditLogTable();
  await promisePool.query(
    `INSERT INTO ${TABLE}
      (parent_portal_account_id, parent_phone, actor_type, event_type, entity_type, entity_id, channel, outcome, ip_address, user_agent, details_json)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      parentPortalAccountId ? Number(parentPortalAccountId) : null,
      safeTrim(parentPhone) || null,
      safeTrim(actorType).slice(0, 32) || 'parent',
      evt,
      safeTrim(entityType).slice(0, 40) || null,
      safeTrim(entityId).slice(0, 64) || null,
      safeTrim(channel).slice(0, 32) || null,
      safeTrim(outcome).slice(0, 24) || 'success',
      safeTrim(ipAddress).slice(0, 64) || null,
      safeTrim(userAgent).slice(0, 255) || null,
      details ? JSON.stringify(details) : null,
    ],
  );
}

async function listParentAuditEvents({
  parentPortalAccountId = null,
  parentPhone = null,
  limit = 60,
  offset = 0,
}) {
  await ensureParentAuditLogTable();
  const lim = Math.min(200, Math.max(1, Number(limit || 60)));
  const off = Math.max(0, Number(offset || 0));
  const where = [];
  const params = [];
  if (parentPortalAccountId) {
    where.push('parent_portal_account_id = ?');
    params.push(Number(parentPortalAccountId));
  }
  const phone = safeTrim(parentPhone);
  if (phone) {
    where.push('parent_phone = ?');
    params.push(phone);
  }
  if (where.length === 0) return { rows: [], total: 0, limit: lim, offset: off };

  const whereSql = where.join(' OR ');

  const [[countRow]] = await promisePool.query(
    `SELECT COUNT(*) AS c FROM ${TABLE} WHERE ${whereSql}`,
    params,
  );
  const total = Number(countRow?.c || 0);

  const [rows] = await promisePool.query(
    `SELECT id, actor_type, event_type, entity_type, entity_id, channel, outcome, ip_address, user_agent, details_json, created_at
     FROM ${TABLE}
     WHERE ${whereSql}
     ORDER BY id DESC
     LIMIT ? OFFSET ?`,
    [...params, lim, off],
  );
  const mapped = (rows || []).map((r) => {
    let details = null;
    try {
      details = r.details_json ? (typeof r.details_json === 'string' ? JSON.parse(r.details_json) : r.details_json) : null;
    } catch (_) {
      details = null;
    }
    return {
      id: Number(r.id),
      actor_type: r.actor_type,
      event_type: r.event_type,
      entity_type: r.entity_type,
      entity_id: r.entity_id,
      channel: r.channel,
      outcome: r.outcome,
      ip_address: r.ip_address,
      user_agent: r.user_agent,
      details,
      created_at: r.created_at,
    };
  });
  return { rows: mapped, total, limit: lim, offset: off };
}

module.exports = {
  ensureParentAuditLogTable,
  getRequestMeta,
  logParentAuditEvent,
  listParentAuditEvents,
};
