'use strict';

const {
  computeProAccessEffective,
  roleHasPermissionKey,
  mergeLegacyRolePermissionsJson,
} = require('../utils/schoolSubscription');

let promisePool;
try {
  ({ promisePool } = require('../config/database'));
} catch (_) {
  ({ promisePool } = require('../../config/database'));
}

/**
 * School must be allowed to use the platform (babyeyi.schools.school_status + legacy status).
 * Expects req.user populated (session hydration) or req.session.user with school snapshot.
 */
function requireSchoolActive(req, res, next) {
  const rc = (req.session?.roleCode || req.user?.role_code || '').toUpperCase();
  if (['SUPER_ADMIN', 'FULL_SYSTEM_CONTROLLER', 'NESA_ADMIN', 'DEO', 'AGENT'].includes(rc)) {
    return next();
  }
  const school = req.session?.user?.school || req.user?.school;
  const access = school?.school_access_status || 'active';
  const legacy = school?.school_record_status;
  const a = String(access || 'active').toLowerCase();
  if (a === 'suspended' || a === 'inactive') {
    return res.status(403).json({
      success: false,
      code: 'SCHOOL_SUSPENDED',
      message: 'This school account is suspended or inactive. Contact the platform administrator.',
    });
  }
  const l = String(legacy || '').toLowerCase();
  if (l === 'pending' || l === 'inactive' || l === 'suspended') {
    return res.status(403).json({
      success: false,
      code: 'SCHOOL_NOT_ACTIVE',
      message: 'Your school is not active yet.',
    });
  }
  return next();
}

/**
 * Pro feature route — school must have effective Pro access (plan + window + pro_enabled).
 */
function requireProSchool(req, res, next) {
  const rc = (req.session?.roleCode || req.user?.role_code || '').toUpperCase();
  if (['SUPER_ADMIN', 'FULL_SYSTEM_CONTROLLER'].includes(rc)) {
    return next();
  }
  const school = req.session?.user?.school || req.user?.school;
  if (!school?.id) {
    return res.status(403).json({ success: false, code: 'NO_SCHOOL', message: 'No school context' });
  }
  const ok = school.pro_access_effective === true
    || computeProAccessEffective({
      subscription_plan: school.subscription_plan,
      pro_enabled: school.pro_enabled,
      pro_end_date: school.pro_end_date,
    });
  if (!ok) {
    return res.status(403).json({
      success: false,
      code: 'PRO_REQUIRED',
      message: 'This action requires an active Pro subscription for your school.',
    });
  }
  return next();
}

/**
 * Optional module gate — when school.modules is present, require module_key to be enabled.
 */
function requireProModule(moduleKey) {
  return (req, res, next) => {
    const school = req.session?.user?.school || req.user?.school;
    const modules = school?.modules || {};
    if (moduleKey && Object.keys(modules).length > 0 && modules[moduleKey] === false) {
      return res.status(403).json({
        success: false,
        code: 'MODULE_DISABLED',
        message: `Pro module "${moduleKey}" is not enabled for your school.`,
      });
    }
    return next();
  };
}

/**
 * Permission key check using session permission_keys + legacy roles.permissions JSON.
 */
function requirePermission(permissionKey) {
  return async (req, res, next) => {
    try {
      const roleId = req.user?.role_id || req.session?.user?.role?.id;
      const legacyJson = req.user?.permissions;
      let keys = Array.isArray(req.session?.user?.permission_keys) ? req.session.user.permission_keys : [];
      keys = mergeLegacyRolePermissionsJson(legacyJson, keys);
      if (roleId && (!keys || !keys.length)) {
        const { loadPermissionKeysForRole } = require('../utils/schoolSubscription');
        const fromDb = await loadPermissionKeysForRole(promisePool, roleId);
        keys = mergeLegacyRolePermissionsJson(legacyJson, fromDb);
        if (req.session?.user) {
          req.session.user.permission_keys = keys;
        }
      }
      if (!roleHasPermissionKey(keys, permissionKey)) {
        return res.status(403).json({
          success: false,
          code: 'PERMISSION_DENIED',
          message: 'You do not have permission for this action.',
        });
      }
      return next();
    } catch (e) {
      console.error('[requirePermission]', e.message);
      return res.status(500).json({ success: false, message: 'Permission check failed' });
    }
  };
}

module.exports = {
  requireSchoolActive,
  requireProSchool,
  requireProModule,
  requirePermission,
};
