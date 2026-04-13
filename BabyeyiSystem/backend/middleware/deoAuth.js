// ================================================================
// middleware/deoAuth.js
//
// ROOT CAUSE FIX:
//   database.js exports { promisePool, testConnection } — NOT a
//   default object with .query(). Using db.query() where db is the
//   whole module causes "db.query is not a function" which the
//   try/catch silently swallows and returns USER_NOT_FOUND.
//
//   Fix: import promisePool directly and use promisePool.query().
//
// OTHER FIXES:
//   • district_assigned column now read — DEOs with district in
//     that column (vs generic district column) now resolve correctly
//   • req.deoUser.roleCode correctly set
//   • resolveUserId covers all session shapes
//
// ================================================================

const { promisePool } = require('../config/database');

// ── Safe query helper using promisePool ───────────────────────────
// CRITICAL: database.js exports { promisePool } not a default with
// .query(). The old code did db.query() which is undefined, causing
// a silent error that appeared as USER_NOT_FOUND.
const query = async (sql, params = []) => {
  const [rows] = await promisePool.query(sql, params);
  return rows;
};

// ── Allowed role_codes from the roles table ───────────────────────
const DEO_ROLE_CODES = ['DEO', 'deo', 'district_officer', 'district_education_officer'];

// ── Resolve user id from session (handles all session shapes) ─────
const resolveUserId = (req) => {
  return (
    req.session?.userId         ||
    req.session?.user?.id       ||
    req.user?.id                ||
    null
  );
};

// ════════════════════════════════════════════════════════════════
// deoAuth — main guard middleware
// ════════════════════════════════════════════════════════════════
const deoAuth = async (req, res, next) => {
  try {
    const userId = resolveUserId(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Not authenticated. Please log in.',
        code: 'NOT_AUTHENTICATED',
      });
    }

    // ── Single query: JOIN roles to get role_code ─────────────────
    // FIX: Added district_assigned to SELECT — this is the DEO-specific
    //      district column that was missing before, causing district to
    //      always resolve to null or the wrong value.
    //
    // users columns used:
    //   id, first_name, last_name, email, is_active,
    //   role_id (FK), district, district_assigned, province,
    //   sector, school_id
    // roles columns used:
    //   id, role_code, role_name
    const rows = await query(
      `SELECT
         u.id,
         u.first_name,
         u.last_name,
         u.email,
         u.photo,
         u.is_active,
         u.district,
         u.district_assigned,
         u.province,
         u.sector,
         u.school_id,
         r.role_code,
         r.role_name,
         s.district  AS school_district,
         s.province  AS school_province,
         s.sector    AS school_sector
       FROM users u
       LEFT JOIN roles   r ON r.id = u.role_id
       LEFT JOIN schools s ON s.id = u.school_id
       WHERE u.id = ? AND u.deleted_at IS NULL
       LIMIT 1`,
      [userId]
    );

    if (!rows.length) {
      return res.status(401).json({
        success: false,
        message: 'User not found. Session may be stale — please log in again.',
        code: 'USER_NOT_FOUND',
      });
    }

    const dbUser = rows[0];

    // ── Active check ──────────────────────────────────────────────
    if (dbUser.is_active === 0) {
      return res.status(403).json({
        success: false,
        message: 'Your account is inactive. Contact your administrator.',
        code: 'ACCOUNT_INACTIVE',
      });
    }

    // ── Role check ────────────────────────────────────────────────
    const roleCode = (dbUser.role_code || '').trim();
    const isDEO    = DEO_ROLE_CODES.some(r => r.toLowerCase() === roleCode.toLowerCase());

    if (!isDEO) {
      return res.status(403).json({
        success: false,
        message: `Access denied. DEO role required. Your role: "${roleCode || 'unknown'}"`,
        code: 'INSUFFICIENT_ROLE',
        yourRole: roleCode,
      });
    }

    // ── Resolve district ──────────────────────────────────────────
    // FIX: Priority order is now:
    //   1. district_assigned  — DEO-specific assignment (most authoritative)
    //   2. district           — general user district field
    //   3. school_district    — district from the school linked to the user
    //
    // Before this fix, district_assigned was never read from the DB,
    // so DEOs whose district was stored in district_assigned always got
    // a null district → 403 NO_DISTRICT_ASSIGNED error.
    const district =
      dbUser.district_assigned ||
      dbUser.district          ||
      dbUser.school_district   ||
      null;

    if (!district) {
      return res.status(403).json({
        success: false,
        message:
          'Your account has no district assigned. ' +
          'Please ask the system administrator to set your district ' +
          '(district_assigned or district field in users table).',
        code: 'NO_DISTRICT_ASSIGNED',
        userId,
      });
    }

    // ── Resolve province ──────────────────────────────────────────
    const province =
      dbUser.province        ||
      dbUser.school_province ||
      null;

    // ── Attach to req ─────────────────────────────────────────────
    req.deoUser = {
      id:           dbUser.id,
      fullName:     `${dbUser.first_name || ''} ${dbUser.last_name || ''}`.trim(),
      email:        dbUser.email,
      photo:        dbUser.photo || null,
      roleCode,                            // FIX: was previously missing / wrongly named
      roleName:     dbUser.role_name || roleCode,
      district,
      province,
      schoolId:     dbUser.school_id || null,
    };

    req.deoDistrict = district;
    req.deoProvince = province;

    // Keep req.user consistent with the rest of the app
    req.user = {
      ...(req.session?.user || {}),
      id:                dbUser.id,
      first_name:        dbUser.first_name,
      last_name:         dbUser.last_name,
      email:             dbUser.email,
      photo:             dbUser.photo || null,
      role_code:         roleCode,
      district,
      district_assigned: dbUser.district_assigned,
      province,
    };

    next();
  } catch (err) {
    // Log the FULL error so you can see what's actually failing
    console.error('[deoAuth] Unexpected error:', err.message);
    console.error('[deoAuth] Stack:', err.stack);
    res.status(500).json({
      success: false,
      message: 'Authentication check failed — server error.',
      code: 'AUTH_ERROR',
    });
  }
};

// ════════════════════════════════════════════════════════════════
// requireRole — generic guard for other roles
// Usage: router.get('/x', requireRole('SUPER_ADMIN'), handler)
// ════════════════════════════════════════════════════════════════
const requireRole = (...allowedRoles) => {
  const allowed = allowedRoles.flat().map(r => r.toLowerCase());
  return async (req, res, next) => {
    const userId = resolveUserId(req);
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Not authenticated', code: 'NOT_AUTHENTICATED' });
    }
    try {
      const rows = await query(
        `SELECT u.id, u.is_active, r.role_code
         FROM users u
         LEFT JOIN roles r ON r.id = u.role_id
         WHERE u.id = ? AND u.deleted_at IS NULL LIMIT 1`,
        [userId]
      );
      if (!rows.length) {
        return res.status(401).json({ success: false, message: 'User not found', code: 'USER_NOT_FOUND' });
      }
      const roleCode = (rows[0].role_code || '').toLowerCase();
      if (!allowed.includes(roleCode)) {
        return res.status(403).json({
          success: false,
          message: `Role "${rows[0].role_code}" is not allowed. Required: ${allowed.join(', ')}`,
          code: 'INSUFFICIENT_ROLE',
        });
      }
      req.user = { ...(req.session?.user || {}), ...rows[0] };
      next();
    } catch (err) {
      console.error('[requireRole]', err.message);
      res.status(500).json({ success: false, message: 'Role check failed', code: 'AUTH_ERROR' });
    }
  };
};

module.exports = { deoAuth, requireRole, DEO_ROLE_CODES };