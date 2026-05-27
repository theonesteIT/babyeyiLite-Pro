'use strict';

const {
  logPlatformActivityAsync,
  resolveProductTier,
  resolveSchoolId,
  resolveUserId,
  resolveRoleCode,
  actorLabelFromReq,
} = require('../utils/platformActivityLog');
const {
  touchUserSessionActivity,
  recordActivityLog,
} = require('../utils/schoolMonitoringHelpers');

const SKIP_PATH_RE = [
  /^\/api\/session\/me$/i,
  /^\/api\/health$/i,
  /^\/api\/chat\/unread-count/i,
  /^\/api\/teacher-portal\/timetable/i,
  /^\/api\/teacher-portal\/attendance-summary/i,
  /^\/api\/district\/babyeyi\/me/i,
  /^\/api\/superadmin\/audit/i,
  /^\/uploads\//i,
];

const SENSITIVE_GET_RE = [
  /^\/api\/auth\/super-admins/i,
  /^\/api\/admin\/portal-audit-logs/i,
  /^\/api\/admin\/staff-logins/i,
  /^\/api\/public\/babyeyi-pay\/admin-webhook-logs/i,
];

function shouldSkipLog(req) {
  const path = (req.originalUrl || req.url || '').split('?')[0];
  return SKIP_PATH_RE.some((re) => re.test(path));
}

function shouldLogRequest(req) {
  if (shouldSkipLog(req)) return false;
  const path = (req.originalUrl || req.url || '').split('?')[0];
  if (!path.startsWith('/api/')) return false;

  const method = String(req.method || 'GET').toUpperCase();
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) return true;
  if (method === 'GET' && SENSITIVE_GET_RE.some((re) => re.test(path))) return true;
  return false;
}

function buildActionSummary(req, statusCode) {
  const method = String(req.method || 'GET').toUpperCase();
  const path = (req.originalUrl || req.url || '').split('?')[0];
  const sc = Number(statusCode) || 0;
  const statusLabel = sc >= 500 ? 'server_error' : sc >= 400 ? 'client_error' : 'ok';
  return `${method} ${path} → ${sc} (${statusLabel})`;
}

function inferModuleFromPath(path) {
  const p = String(path || '').toLowerCase();
  if (p.includes('/auth/')) return 'Auth';
  if (p.includes('babyeyi')) return 'Fees';
  if (p.includes('accountant') || p.includes('budget') || p.includes('payroll') || p.includes('payment')) return 'Finance';
  if (p.includes('teacher-portal') || p.includes('/teacher')) return 'Teachers';
  if (p.includes('/store/') || p.includes('inventory')) return 'Inventory';
  if (p.includes('student') || p.includes('admission')) return 'Students';
  if (p.includes('parent-portal')) return 'Parent Portal';
  if (p.includes('discipline')) return 'Discipline';
  if (p.includes('nesa') || p.includes('district')) return 'Government';
  if (p.includes('superadmin')) return 'Super Admin';
  return 'System';
}

/**
 * Attach after session hydration — logs authenticated API writes automatically.
 */
function platformActivityMiddleware(req, res, next) {
  if (!shouldLogRequest(req)) return next();

  const started = Date.now();
  res.on('finish', () => {
    const userId = resolveUserId(req);
    const path = (req.originalUrl || req.url || '').split('?')[0];
    const isAuthLogin = /^\/api\/auth\/login$/i.test(path);
    if (isAuthLogin) return;

    if (!userId && res.statusCode < 400) return;

    const outcome = res.statusCode >= 500 ? 'failed'
      : res.statusCode >= 400 ? 'failed'
        : 'success';

    logPlatformActivityAsync({
      req,
      eventCategory: 'api',
      eventType: `api_${String(req.method || 'GET').toLowerCase()}`,
      outcome,
      userId,
      roleCode: resolveRoleCode(req),
      schoolId: resolveSchoolId(req),
      productTier: resolveProductTier(req),
      actorLabel: actorLabelFromReq(req),
      actionSummary: buildActionSummary(req, res.statusCode),
      httpMethod: req.method,
      endpoint: path.slice(0, 255),
      entityType: inferModuleFromPath(path),
      requestId: req.id || req.headers['x-request-id'],
      details: {
        status_code: res.statusCode,
        duration_ms: Date.now() - started,
        school_id: resolveSchoolId(req),
      },
    });

    if (userId && res.statusCode < 500) {
      touchUserSessionActivity(userId).catch(() => {});
      if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(String(req.method || '').toUpperCase()) && res.statusCode < 400) {
        recordActivityLog({
          userId,
          schoolId: resolveSchoolId(req),
          roleCode: resolveRoleCode(req),
          module: inferModuleFromPath(path),
          actionType: `${req.method} ${path.split('/').filter(Boolean).slice(-1)[0] || 'action'}`,
          actionSummary: buildActionSummary(req, res.statusCode),
          riskLevel: res.statusCode >= 400 ? 'Medium' : 'Low',
          ip: req.ip,
          userAgent: req.headers['user-agent'],
          productTier: resolveProductTier(req),
          sourceTable: 'platform_activity_logs',
        }).catch(() => {});
      }
    }
  });

  next();
}

module.exports = { platformActivityMiddleware };
