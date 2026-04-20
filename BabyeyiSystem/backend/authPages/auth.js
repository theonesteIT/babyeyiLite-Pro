// ================================================================
// routes/Auth/auth.js  —  Session-Based Auth  v2.1
//
// KEY ENDPOINTS:
//   POST /api/auth/login                → httpOnly cookie session
//   GET  /api/auth/verify               → lightweight session check
//   POST /api/auth/signup-super-admin   → first-time SA (blocked if SA exists)
//   POST /api/auth/signup-full-system-controller → first FSC only (public)
//   GET/PUT /api/auth/system-config       → maintenance + write lock (FSC)
//   GET /api/auth/platform-users         → paginated users + PATCH active + bulk (FSC)
//   POST /api/auth/create-school        → SA creates a school + school admin
//   POST /api/auth/create-nesa-admin    → SA creates NESA admin
//   POST /api/auth/create-deo           → SA creates DEO (district)
//   GET  /api/auth/nesa-admins          → list NESA admins
//   GET  /api/auth/deo-admins           → list DEOs
//   PUT  /api/auth/nesa-admin/:id       → update NESA admin
//   PUT  /api/auth/deo-admin/:id        → update DEO
//   DELETE /api/auth/nesa-admin/:id     → soft-delete NESA admin
//   DELETE /api/auth/deo-admin/:id      → soft-delete DEO
//   GET  /api/auth/schools              → list schools
//   POST /api/auth/forgot-password
//   POST /api/auth/reset-password
// ================================================================

const express   = require('express');
const router    = express.Router();
const bcrypt    = require('bcryptjs');
const crypto    = require('crypto');
const nodePath  = require('path');
const fs        = require('fs');
const multer    = require('multer');
const rateLimit = require('express-rate-limit');

// ── Profile photo upload (must be under backend/uploads so express.static serves it) ──
const PROFILE_PHOTO_DIR = nodePath.join(__dirname, '..', 'uploads', 'profile-photos');
if (!fs.existsSync(PROFILE_PHOTO_DIR)) {
  fs.mkdirSync(PROFILE_PHOTO_DIR, { recursive: true });
  console.log('📁  Created: backend/uploads/profile-photos');
}
const profilePhotoStorage = multer.diskStorage({
  destination(_req, _file, cb) { cb(null, PROFILE_PHOTO_DIR); },
  filename(req, file, cb) {
    const ext = (nodePath.extname(file.originalname) || '.jpg').toLowerCase().replace(/jpeg/, 'jpg');
    cb(null, `profile-${req.session?.userId || 'user'}-${Date.now()}${ext}`);
  },
});
const uploadProfilePhoto = multer({
  storage: profilePhotoStorage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter(_req, file, cb) {
    const ok = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(file.mimetype);
    if (ok) return cb(null, true);
    cb(new Error('Only JPEG, PNG or WebP images allowed'));
  },
});

// ── Robust DB import — tries common path locations ─────────────
let promisePool;
const _dbCandidates = [
  nodePath.resolve(__dirname, '../../config/database'),
  nodePath.resolve(__dirname, '../config/database'),
  nodePath.resolve(__dirname, './config/database'),
];
for (const _p of _dbCandidates) {
  try { ({ promisePool } = require(_p)); break; } catch (_) {}
}
if (!promisePool) {
  console.error('❌  auth.js: Cannot find config/database — update the require path');
  process.exit(1);
}

const systemSettings = require('../utils/systemSettings');
const { ensureShuleAvanceOrgTables } = require('../BabyeyiRoutes/shuleAvanceOrgSchema');
const {
  ensureShuleAvanceTeacherCatalogTable,
  listTeacherCatalogAdmin,
  createTeacherCatalogItem,
  updateTeacherCatalogItem,
  deleteTeacherCatalogItem,
} = require('../BabyeyiRoutes/shuleAvanceCatalogStore');
const { applyRememberMeToSession } = require('../utils/sessionRememberMe');
const { getDistrictCode, formatSchoolCode } = require('../utils/rwandaDistrictCodes');
const {
  computeProAccessEffective,
  isSchoolAccessBlocked,
  loadSchoolModules,
  loadPermissionKeysForRole,
  mergeLegacyRolePermissionsJson,
} = require('../utils/schoolSubscription');

// ── Optional email service ─────────────────────────────────────
let sendEmail = async () => {};
const _emailCandidates = [
  nodePath.resolve(__dirname, '../../services/notification'),
  nodePath.resolve(__dirname, '../services/notification'),
];
for (const _p of _emailCandidates) {
  try { sendEmail = require(_p).sendEmail; break; } catch (_) {}
}

// ============================================================
// RATE LIMITERS
// ============================================================
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, max: 10,
  message: { success: false, message: 'Too many login attempts — try again in 15 minutes' },
  standardHeaders: true, legacyHeaders: false,
});

const resetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, max: 5,
  message: { success: false, message: 'Too many password reset requests' },
});

// ============================================================
// HELPERS
// ============================================================
async function hashPassword(pwd)        { return bcrypt.hash(pwd, 10); }
async function verifyPassword(pwd, hash){ return bcrypt.compare(pwd, hash); }
function generateToken()                { return crypto.randomBytes(32).toString('hex'); }

function generateUserUID(roleCode) {
  const ts  = Date.now().toString().slice(-6);
  const rnd = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `${roleCode}-${ts}${rnd}`;
}

function redirectForRole(roleCode) {
  const map = {
    SUPER_ADMIN:    '/superadmin/dashboard',
    FULL_SYSTEM_CONTROLLER: '/superadmin/control',
    NESA_ADMIN:     '/nesa-babyeyi-dashboard',
    DEO:            '/district-babyeyi-dashboard',
    SCHOOL_ADMIN:   '/school-babyeyi-dashboard',
    SCHOOL_MANAGER: '/school-babyeyi-dashboard',
    ACCOUNTANT:     '/accountant/dashboard',
    DOS:            '/dos/students',
    HOD:            '/hod/students',
    TEACHER:        '/teacher/dashboard',
    GATE_OFFICER:   '/gate/scanner',
    LIBRARIAN:      '/library/dashboard',
    STORE_MANAGER:  '/store/dashboard',
    AGENT:          '/agent/dashboard',
    SHULE_AVANCE_PARTNER: '/shule-avance/dashboard',
  };
  return map[roleCode] || '/login';
}

async function getNextDistrictSchoolCode(conn, districtCode) {
  const dd = String(districtCode || '').padStart(2, '0').slice(-2);
  if (!/^[0-9]{2}$/.test(dd)) throw new Error('Invalid district code');
  const [rows] = await conn.query(
    `SELECT school_code, district_code
     FROM schools
     WHERE deleted_at IS NULL
       AND (district_code = ? OR school_code LIKE ?)`,
    [dd, `${dd}%`]
  );
  let max = 0;
  for (const r of rows) {
    const exact = String(r.school_code || '').match(new RegExp(`^${dd}([0-9]{3})$`));
    let n = exact ? parseInt(exact[1], 10) : NaN;
    if (Number.isNaN(n)) {
      const slash = String(r.school_code || '').match(new RegExp(`^${dd}\\/([0-9]{3})$`));
      if (slash) n = parseInt(slash[1], 10);
    }
    if (!Number.isNaN(n) && n > max) max = n;
  }
  const next = max + 1;
  if (next > 999) throw new Error(`Maximum school codes (999) reached for district ${dd}`);
  return formatSchoolCode(dd, next);
}

// Guard: session must exist and role must match (case-insensitive)
function requireRole(req, res, ...roles) {
  if (!req.session?.userId) {
    res.status(401).json({ success: false, message: 'Not authenticated — please log in' });
    return false;
  }
  const allowed = roles.flat().map(r => String(r).toUpperCase());
  const code = (req.session.roleCode || '').toUpperCase();
  if (allowed.length && !allowed.includes(code)) {
    res.status(403).json({ success: false, message: `Access denied — requires: ${allowed.join(' or ')}` });
    return false;
  }
  return true;
}

/** SUPER_ADMIN and FULL_SYSTEM_CONTROLLER — same API tier in auth.js */
const ELEVATED_PLATFORM_ROLES = ['SUPER_ADMIN', 'FULL_SYSTEM_CONTROLLER'];

function requireElevatedPlatform(req, res) {
  return requireRole(req, res, ...ELEVATED_PLATFORM_ROLES);
}

/** Full System Controller only — platform / system control APIs */
function requireFullSystemController(req, res) {
  return requireRole(req, res, 'FULL_SYSTEM_CONTROLLER');
}

async function getRoleId(roleCode) {
  const [rows] = await promisePool.query(
    'SELECT id FROM roles WHERE role_code = ? LIMIT 1', [roleCode]
  );
  return rows[0]?.id || null;
}

// ============================================================
// POST /api/auth/login
// ============================================================
router.post('/login', loginLimiter, async (req, res) => {
  try {
    const identifierRaw = req.body?.identifier ?? req.body?.email;
    const { password, schoolCode } = req.body || {};
    if (!identifierRaw || !password) {
      return res.status(400).json({ success: false, message: 'Identifier and password are required' });
    }

    const id = String(identifierRaw).trim().toLowerCase();
    const scNorm = schoolCode != null && String(schoolCode).trim() !== ''
      ? String(schoolCode).trim().toUpperCase()
      : '';

    // School managers must send school code so login joins exactly their school (no other school’s dashboard).
    const [roleProbe] = await promisePool.query(
      `SELECT r.role_code AS role_code
       FROM users u
       LEFT JOIN roles r ON u.role_id = r.id
       LEFT JOIN staff st ON u.id = st.user_id
       LEFT JOIN pro_shule_avance_organizations sao ON sao.user_id = u.id
       WHERE u.deleted_at IS NULL
         AND (
           u.email = ?
           OR u.user_uid = ?
           OR st.staff_id = ?
           OR st.username = ?
           OR LOWER(TRIM(sao.login_username)) = ?
         )
       LIMIT 1`,
      [id, id, id, id, id]
    );
    const probeRole = String(roleProbe[0]?.role_code || '').toUpperCase();
    if (
      (probeRole === 'SCHOOL_ADMIN' || probeRole === 'SCHOOL_MANAGER' || probeRole === 'ACCOUNTANT' || probeRole === 'HOD' || probeRole === 'DOS')
      && roleProbe.length > 0
      && !scNorm
    ) {
      return res.status(400).json({
        success: false,
        code: 'SCHOOL_CODE_REQUIRED',
        message: 'Enter your school code (same code as in the directory, e.g. 001).',
      });
    }

    // JOIN strategy: school link by manager_user_id only
    //  - School Admin / Manager → schools.manager_user_id = u.id
    //  - Staff/Teacher → staff.school_id = sc.id; users.school_id → sc.id = u.school_id
    const sql = `
      SELECT
        u.id, u.user_uid, u.email,
        u.role_id,
        u.first_name, u.last_name,
        u.photo,
        u.password_hash,
        u.is_active, u.is_locked, u.locked_until,
        u.failed_login_attempts,
        u.force_password_change,
        u.district, u.province, u.sector,
        u.school_id    AS user_school_id,
        r.role_code, r.role_name,
        r.permissions AS role_permissions_json,
        st.staff_id,
        sc.id          AS school_id,
        sc.school_name,
        sc.school_code,
        sc.email       AS school_email,
        sc.phone       AS school_phone,
        sc.district    AS school_district,
        sc.province    AS school_province,
        sc.status      AS school_record_status,
        sc.school_status AS school_access_status,
        sc.subscription_plan,
        sc.pro_enabled,
        sc.pro_start_date,
        sc.pro_end_date
      FROM users u
      LEFT JOIN roles   r  ON u.role_id    = r.id
      LEFT JOIN staff   st ON u.id         = st.user_id
      LEFT JOIN pro_shule_avance_organizations sao ON sao.user_id = u.id
      LEFT JOIN schools sc ON (
        sc.manager_user_id = u.id
        OR st.school_id    = sc.id
        OR sc.id           = u.school_id
      )
      WHERE (
        u.email     = ?
        OR u.user_uid = ?
        OR st.staff_id = ?
        OR st.username = ?
        OR LOWER(TRIM(sao.login_username)) = ?
      )
      AND u.deleted_at IS NULL
      ${scNorm ? 'AND sc.school_code = ?' : ''}
      LIMIT 1
    `;
    const params = [id, id, id, id, id];
    if (scNorm) params.push(scNorm);

    const [users] = await promisePool.query(sql, params);
    if (!users.length) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const user = users[0];

    // Platform access: new school_status + legacy status (not registration pending — handled below for managers)
    if (user.school_id && isSchoolAccessBlocked(user.school_access_status, user.school_record_status)) {
      const acc = String(user.school_access_status || '').toLowerCase();
      return res.status(403).json({
        success: false,
        code: acc === 'suspended' ? 'SCHOOL_SUSPENDED' : 'SCHOOL_INACTIVE',
        message: acc === 'suspended'
          ? 'Your school account is suspended. Contact the platform administrator.'
          : 'Your school account is not active. Contact the platform administrator.',
      });
    }

    // Lock check
    if (user.is_locked) {
      const until = user.locked_until ? new Date(user.locked_until) : null;
      if (!until || until > new Date()) {
        return res.status(403).json({
          success: false,
          locked: true,
          message: until ? `Account locked until ${until.toLocaleString()}` : 'Account locked — contact admin',
        });
      }
      await promisePool.query(
        'UPDATE users SET is_locked=0, locked_until=NULL, failed_login_attempts=0 WHERE id=?',
        [user.id]
      );
    }

    const roleCode = (user.role_code || '').toUpperCase();
    const isSchoolManager = roleCode === 'SCHOOL_ADMIN' || roleCode === 'SCHOOL_MANAGER';

    // For school managers/admins, ALWAYS enforce school approval before allowing login.
    // Some older rows may not join a school in the initial query (missing school_id / manager_user_id),
    // so we do a reliable lookup here.
    if (isSchoolManager) {
      try {
        const [schoolRows] = await promisePool.query(
          `SELECT id, status, school_status
           FROM schools
           WHERE deleted_at IS NULL
             AND (
               id = ?
               OR manager_user_id = ?
             )
           ${scNorm ? 'AND school_code = ?' : ''}
           ORDER BY (id = ?) DESC
           LIMIT 1`,
          scNorm
            ? [user.school_id || null, user.id, scNorm, user.school_id || null]
            : [user.school_id || null, user.id, user.school_id || null]
        );

        const school = schoolRows?.[0] || null;
        if (!school) {
          return res.status(403).json({
            success: false,
            code: 'SCHOOL_NOT_LINKED',
            message: 'Your school account is not linked yet. Please contact the Super Admin to activate your school.',
          });
        }

        const schoolStatus = (school.status || '').toString().toLowerCase();
        const accessStatus = (school.school_status || 'active').toString().toLowerCase();
        const activeByAccess = accessStatus === 'active';
        const activeByStatus = !schoolStatus || schoolStatus === 'active';
        const isSchoolApproved = activeByStatus && activeByAccess;

        if (!isSchoolApproved) {
          if (!activeByAccess) {
            return res.status(403).json({
              success: false,
              code: accessStatus === 'suspended' ? 'SCHOOL_SUSPENDED' : 'SCHOOL_INACTIVE',
              message: accessStatus === 'suspended'
                ? 'Your school account is suspended. Contact the platform administrator.'
                : 'Your school account is not active. Contact the platform administrator.',
            });
          }
          return res.status(403).json({
            success: false,
            code: schoolStatus === 'pending' ? 'SCHOOL_PENDING_APPROVAL' : 'SCHOOL_INACTIVE',
            message: schoolStatus === 'pending'
              ? 'Your school registration is pending approval by Super Admin.'
              : 'Your school is inactive. Please wait for Super Admin to activate it.',
          });
        }
      } catch (e) {
        console.error('[login] school approval check:', e.message);
        return res.status(500).json({ success: false, message: 'Login failed — please try again' });
      }
    }

    // Active user check (after school approval check so pending schools get the right message)
    if (!user.is_active) {
      return res.status(403).json({ success: false, message: 'Account inactive — contact administrator' });
    }

    // Password check
    const valid = await verifyPassword(password, user.password_hash);
    if (!valid) {
      await promisePool.query(
        'UPDATE users SET failed_login_attempts = failed_login_attempts + 1 WHERE id = ?', [user.id]
      );
      const [[upd]] = await promisePool.query(
        'SELECT failed_login_attempts FROM users WHERE id = ?', [user.id]
      );
      const attempts = upd.failed_login_attempts;
      const maxAttempts = 5;

      if (attempts >= maxAttempts) {
        await promisePool.query(
          `UPDATE users SET is_locked=1, locked_until=DATE_ADD(NOW(), INTERVAL 30 MINUTE) WHERE id=?`,
          [user.id]
        );
        return res.status(403).json({
          success: false, locked: true,
          message: 'Account locked for 30 minutes — too many failed attempts',
        });
      }

      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
        remainingAttempts: maxAttempts - attempts,
      });
    }

    const sys = await systemSettings.getSettings();
    if (
      sys.maintenance_mode
      && roleCode !== 'SUPER_ADMIN'
      && roleCode !== 'FULL_SYSTEM_CONTROLLER'
    ) {
      return res.status(503).json({
        success: false,
        code: 'SYSTEM_MAINTENANCE',
        message:
          'System maintenance — only Super Administrator or Full System Controller accounts can sign in right now.',
      });
    }

    // Reset failed attempts + update last login
    await promisePool.query(
      'UPDATE users SET failed_login_attempts=0, last_login=NOW(), last_login_ip=? WHERE id=?',
      [req.ip, user.id]
    );

    // For SCHOOL_ADMIN / SCHOOL_MANAGER: if JOIN didn't return a school, resolve from schools table
    if (isSchoolManager && !user.school_id) {
      let fallbackSchool = null;
      try {
        const [schoolRows] = await promisePool.query(
          `SELECT id, school_name, school_code, email, phone, district, province,
                  status AS school_record_status,
                  school_status AS school_access_status,
                  subscription_plan, pro_enabled, pro_start_date, pro_end_date
           FROM schools
           WHERE manager_user_id = ? AND (status = 'active' OR status IS NULL)
           LIMIT 1`,
          [user.id]
        );
        if (schoolRows && schoolRows.length > 0) {
          fallbackSchool = schoolRows[0];
          user.school_id = fallbackSchool.id;
          user.school_name = fallbackSchool.school_name;
          user.school_code = fallbackSchool.school_code;
          user.school_email = fallbackSchool.email;
          user.school_phone = fallbackSchool.phone;
          user.school_district = fallbackSchool.district;
          user.school_province = fallbackSchool.province;
          user.school_record_status = fallbackSchool.school_record_status;
          user.school_access_status = fallbackSchool.school_access_status;
          user.subscription_plan = fallbackSchool.subscription_plan;
          user.pro_enabled = fallbackSchool.pro_enabled;
          user.pro_start_date = fallbackSchool.pro_start_date;
          user.pro_end_date = fallbackSchool.pro_end_date;
          // Optionally sync users.school_id so next login JOIN works
          await promisePool.query('UPDATE users SET school_id = ? WHERE id = ?', [fallbackSchool.id, user.id]).catch(() => {});
        }
      } catch (e) {
        console.error('[login] school fallback query:', e.message);
      }
    }

    let agentProfile = null;
    if (roleCode === 'AGENT') {
      try {
        const [arows] = await promisePool.query(
          `SELECT province, district, all_sectors, sectors_json
           FROM field_agent_profiles WHERE user_id = ? LIMIT 1`,
          [user.id]
        );
        const ar = arows?.[0];
        if (ar) {
          let secs = [];
          try {
            secs = typeof ar.sectors_json === 'string' ? JSON.parse(ar.sectors_json) : ar.sectors_json;
          } catch {
            secs = [];
          }
          agentProfile = {
            province: ar.province,
            district: ar.district,
            all_sectors: !!ar.all_sectors,
            sectors: Array.isArray(secs) ? secs : [],
          };
        }
      } catch (e) {
        console.warn('[login] field_agent_profiles:', e.message);
      }
    }

    let shuleAvanceOrg = null;
    if (roleCode === 'SHULE_AVANCE_PARTNER') {
      try {
        await ensureShuleAvanceOrgTables();
        const [srows] = await promisePool.query(
          `SELECT id, org_name, org_type, contact_email, is_active, logo_url
           FROM pro_shule_avance_organizations WHERE user_id = ? LIMIT 1`,
          [user.id]
        );
        shuleAvanceOrg = srows?.[0] || null;
      } catch (e) {
        console.warn('[login] shule avance org:', e.message);
      }
      if (!shuleAvanceOrg || !Number(shuleAvanceOrg.is_active)) {
        return res.status(403).json({
          success: false,
          message: 'ShuleAvance partner account is inactive or not linked. Contact Babyeyi support.',
        });
      }
    }

    let modules = {};
    let permissionKeys = [];
    try {
      if (user.school_id) {
        modules = await loadSchoolModules(promisePool, user.school_id);
      }
      if (user.role_id) {
        const fromTable = await loadPermissionKeysForRole(promisePool, user.role_id);
        permissionKeys = mergeLegacyRolePermissionsJson(user.role_permissions_json, fromTable);
      }
    } catch (e) {
      console.warn('[login] modules/permissions:', e.message);
    }

    const proAccess = computeProAccessEffective({
      subscription_plan: user.subscription_plan,
      pro_enabled: user.pro_enabled,
      pro_end_date: user.pro_end_date,
    });

    // Store only userId in session
    req.session.regenerate(err => {
      if (err) {
        console.error('[login] session.regenerate:', err);
        return res.status(500).json({ success: false, message: 'Session error — please try again' });
      }
      req.session.userId    = user.id;
      req.session.roleCode  = user.role_code;
      req.session.shuleAvanceOrgId = shuleAvanceOrg ? Number(shuleAvanceOrg.id) : null;
      console.log(`🔐  User authenticated: ${user.email} | Role: ${user.role_code} | Session: ${req.session.id} `);
      console.log(`School context: ${user.school_name || 'N/A'} (${user.school_code || 'N/A'}) | Staff ID: ${user.staff_id || 'N/A'} school id: ${user.school_id ? '| School ID: ' + user.school_id : ''}`);

      req.session.loginTime = Date.now();
      // Store school_id at top level so babyeyi/school-info and resolveSchoolId always find it
      req.session.school_id  = user.school_id ? Number(user.school_id) : null;
      // Store enough in session so /api/session/me never needs a DB hit
      const schoolObj = user.school_id ? {
        id:       user.school_id,
        name:     user.school_name,
        code:     user.school_code,
        email:    user.school_email   || null,
        phone:    user.school_phone   || null,
        district: user.school_district || null,
        province: user.school_province || null,
        school_record_status: user.school_record_status ?? null,
        school_access_status: user.school_access_status || 'active',
        subscription_plan: user.subscription_plan || 'lite',
        pro_enabled: Number(user.pro_enabled) === 1,
        pro_start_date: user.pro_start_date || null,
        pro_end_date: user.pro_end_date || null,
        pro_access_effective: proAccess,
        modules,
      } : null;
      req.session.user = {
        id:         user.id,
        user_uid:   user.user_uid,
        email:      user.email,
        first_name: user.first_name,
        last_name:  user.last_name,
        full_name:  `${user.first_name} ${user.last_name}`,
        photo:      user.photo || null,
        role:       { code: user.role_code, name: user.role_name, id: user.role_id || null },
        permission_keys: permissionKeys,
        district:   user.district   || null,
        province:   user.province   || null,
        sector:     user.sector     || null,
        school:     schoolObj,
        school_id:  req.session.school_id,  // flat copy for consumers that expect it
        force_password_change: !!user.force_password_change,
        agent:      agentProfile,
        shule_avance_org: shuleAvanceOrg,
      };

      applyRememberMeToSession(req, req.body);

      req.session.save(saveErr => {
        if (saveErr) {
          console.error('[login] session.save:', saveErr);
          return res.status(500).json({ success: false, message: 'Session save error' });
        }
        console.log(`✅  Login: ${user.email} | Role: ${user.role_code} | Session: ${req.session.id}`);
        return res.json({
          success:  true,
          message:  'Login successful',
          redirect: redirectForRole(user.role_code),
          role:     user.role_code,
          school:   schoolObj,
          pro_access_effective: proAccess,
          permission_keys: permissionKeys,
          // No tokens — auth is fully cookie/session based
        });
      });
    });

  } catch (err) {
    console.error('❌  Login error:', err);
    res.status(500).json({ success: false, message: 'Login failed — please try again' });
  }
});

// ============================================================
// GET /api/auth/verify  — lightweight session check
// ============================================================
router.get('/verify', (req, res) => {
  if (!req.session?.userId) {
    return res.status(401).json({ success: false, message: 'Not authenticated' });
  }
  res.json({ success: true, data: { id: req.session.userId, role: req.session.roleCode } });
});

// ============================================================
// POST /api/auth/signup-super-admin  — first-time only
// ============================================================
router.post('/signup-super-admin', async (req, res) => {
  try {
    const { email, password, first_name, last_name, phone } = req.body;

    if (!email || !password || !first_name || !last_name) {
      return res.status(400).json({
        success: false,
        message: 'email, password, first_name, last_name are required',
      });
    }
    if (password.length < 8) {
      return res.status(400).json({ success: false, message: 'Password must be at least 8 characters' });
    }

    // Block if any Super Admin already exists
    const [[{ count }]] = await promisePool.query(
      `SELECT COUNT(*) AS count FROM users u
       JOIN roles r ON u.role_id = r.id
       WHERE r.role_code = 'SUPER_ADMIN' AND u.deleted_at IS NULL`
    );
    if (Number(count) >= 1) {
      return res.status(403).json({
        success: false,
        message: 'Super Admin already exists — sign in, or ask a Full System Controller to create another account.',
      });
    }

    const roleId = await getRoleId('SUPER_ADMIN');
    if (!roleId) return res.status(500).json({ success: false, message: 'SUPER_ADMIN role not found in database' });

    const [[existing]] = await promisePool.query(
      'SELECT id FROM users WHERE email = ? LIMIT 1', [email]
    );
    if (existing) return res.status(409).json({ success: false, message: 'Email already registered' });

    const hash     = await hashPassword(password);
    const user_uid = generateUserUID('SA');

    const [result] = await promisePool.query(
      `INSERT INTO users
         (user_uid, email, phone, password_hash, first_name, last_name,
          role_id, is_active, is_verified, created_at)
       VALUES (?,?,?,?,?,?,?,1,1,NOW())`,
      [user_uid, email, phone || null, hash, first_name, last_name, roleId]
    );

    console.log(`✅  Super Admin created: ${email} (id=${result.insertId})`);
    res.status(201).json({
      success: true,
      message: 'Super Admin account created — you can now log in',
      data: { id: result.insertId, user_uid, email, first_name, last_name },
    });

  } catch (err) {
    console.error('❌  signup-super-admin:', err);
    res.status(500).json({ success: false, message: 'Signup failed', error: err.message });
  }
});

// ============================================================
// POST /api/auth/signup-full-system-controller  — first FSC only (public)
// ============================================================
router.post('/signup-full-system-controller', async (req, res) => {
  try {
    const { email, password, first_name, last_name, phone } = req.body;

    if (!email || !password || !first_name || !last_name) {
      return res.status(400).json({
        success: false,
        message: 'email, password, first_name, last_name are required',
      });
    }
    if (password.length < 8) {
      return res.status(400).json({ success: false, message: 'Password must be at least 8 characters' });
    }

    const [[{ count }]] = await promisePool.query(
      `SELECT COUNT(*) AS count FROM users u
       JOIN roles r ON u.role_id = r.id
       WHERE r.role_code = 'FULL_SYSTEM_CONTROLLER' AND u.deleted_at IS NULL`
    );
    if (Number(count) >= 1) {
      return res.status(403).json({
        success: false,
        message:
          'A Full System Controller already exists — sign in at /login, or ask them to create another account from the control dashboard.',
      });
    }

    const roleId = await getRoleId('FULL_SYSTEM_CONTROLLER');
    if (!roleId) {
      return res.status(500).json({
        success: false,
        message: 'FULL_SYSTEM_CONTROLLER role not found — restart the API server once to seed roles',
      });
    }

    const em = String(email).trim().toLowerCase();
    const [[existing]] = await promisePool.query(
      'SELECT id FROM users WHERE email = ? LIMIT 1', [em]
    );
    if (existing) return res.status(409).json({ success: false, message: 'Email already registered' });

    const hash = await hashPassword(password);
    const user_uid = generateUserUID('FSC');

    const [result] = await promisePool.query(
      `INSERT INTO users
         (user_uid, email, phone, password_hash, first_name, last_name,
          role_id, is_active, is_verified, created_at)
       VALUES (?,?,?,?,?,?,?,1,1,NOW())`,
      [user_uid, em, phone || null, hash, first_name, last_name, roleId]
    );

    console.log(`✅  Full System Controller created (signup): ${em} (id=${result.insertId})`);
    res.status(201).json({
      success: true,
      message: 'Account created — sign in at /login to open the control dashboard.',
      data: { id: result.insertId, user_uid, email: em, first_name, last_name, role: 'FULL_SYSTEM_CONTROLLER' },
    });
  } catch (err) {
    console.error('❌  signup-full-system-controller:', err);
    res.status(500).json({ success: false, message: 'Signup failed', error: err.message });
  }
});

// ============================================================
// POST /api/auth/create-school
// Super Admin creates a school AND its School Admin account.
//
// Body:
//   school_name*, school_code(optional: AUTO), province*, district*, sector*,
//   cell, school_type (Public|Private|Boarding|TVET),
//   school_email, school_phone, school_address,
//   admin_first_name*, admin_last_name*, admin_email*,
//   admin_phone, admin_password*
// ============================================================
router.post('/create-school', async (req, res) => {
  if (!requireElevatedPlatform(req, res)) return;
  const conn = await promisePool.getConnection();
  try {
    await conn.beginTransaction();

    const {
      school_name, school_code, province, district, sector, cell,
      school_type    = 'Public',
      school_email, school_phone, school_address,
      admin_first_name, admin_last_name,
      admin_email, admin_phone, admin_password,
    } = req.body;

    // Required fields
    if (!school_name || !province || !district || !sector) {
      await conn.rollback(); conn.release();
      return res.status(400).json({
        success: false,
        message: 'school_name, province, district, sector are required',
      });
    }
    if (!admin_first_name || !admin_last_name || !admin_email || !admin_password) {
      await conn.rollback(); conn.release();
      return res.status(400).json({
        success: false,
        message: 'admin_first_name, admin_last_name, admin_email, admin_password are required',
      });
    }
    if (admin_password.length < 8) {
      await conn.rollback(); conn.release();
      return res.status(400).json({ success: false, message: 'Admin password must be at least 8 characters' });
    }

    const districtCode = getDistrictCode(district);
    if (!districtCode) {
      await conn.rollback(); conn.release();
      return res.status(400).json({ success: false, message: 'Invalid district; cannot generate school code' });
    }
    let finalSchoolCode = school_code != null ? String(school_code).trim().toUpperCase() : '';
    if (!finalSchoolCode || finalSchoolCode === 'AUTO') {
      finalSchoolCode = await getNextDistrictSchoolCode(conn, districtCode);
    } else if (!new RegExp(`^${districtCode}[0-9]{3}$`).test(finalSchoolCode)) {
      await conn.rollback(); conn.release();
      return res.status(400).json({
        success: false,
        message: `school_code must match district format ${districtCode}001`,
      });
    }

    // Duplicate checks
    const [[dupSchool]] = await conn.query(
      'SELECT id FROM schools WHERE school_code = ? LIMIT 1', [finalSchoolCode]
    );
    if (dupSchool) {
      await conn.rollback(); conn.release();
      return res.status(409).json({ success: false, message: `School code '${finalSchoolCode}' already exists` });
    }

    const [[dupAdmin]] = await conn.query(
      'SELECT id FROM users WHERE email = ? LIMIT 1', [admin_email]
    );
    if (dupAdmin) {
      await conn.rollback(); conn.release();
      return res.status(409).json({ success: false, message: `Admin email '${admin_email}' already registered` });
    }

    // Get SCHOOL_ADMIN role
    const [[saRole]] = await conn.query(
      "SELECT id FROM roles WHERE role_code = 'SCHOOL_ADMIN' LIMIT 1"
    );
    if (!saRole) {
      await conn.rollback(); conn.release();
      return res.status(500).json({ success: false, message: 'SCHOOL_ADMIN role not found in database' });
    }

    // 1. Create school admin user
    const adminHash    = await hashPassword(admin_password);
    const adminUserUID = generateUserUID('SADMIN');

    const [adminResult] = await conn.query(
      `INSERT INTO users
         (user_uid, email, phone, password_hash, first_name, last_name,
          province, district, sector,
          role_id, is_active, is_verified, created_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,1,1,NOW())`,
      [adminUserUID, admin_email, admin_phone || null, adminHash,
       admin_first_name, admin_last_name,
       province, district, sector,
       saRole.id]
    );
    const adminUserId = adminResult.insertId;

    // 2. Create school (link to admin)
    const [schoolResult] = await conn.query(
      `INSERT INTO schools
         (school_name, school_code, email, phone, address,
          province, district, sector, cell,
          school_type, admin_id, is_active, created_at, updated_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,1,NOW(),NOW())`,
      [school_name, finalSchoolCode,
       school_email || admin_email,
       school_phone || admin_phone || null,
       school_address || null,
       province, district, sector, cell || null,
       school_type, adminUserId]
    );
    const schoolId = schoolResult.insertId;

    // 3. Update admin user's school_id (if column exists)
    await conn.query(
      'UPDATE users SET school_id = ? WHERE id = ?', [schoolId, adminUserId]
    ).catch(() => {}); // ignore if school_id column doesn't exist on users

    await conn.commit();
    conn.release();

    console.log(`✅  School created: ${school_name} (id=${schoolId}) | Admin: ${admin_email}`);

    res.status(201).json({
      success: true,
      message: `School '${school_name}' created with admin account`,
      data: {
        school: {
          id:   schoolId,
          name: school_name,
          code: finalSchoolCode,
          province, district, sector,
          type: school_type,
        },
        admin: {
          id:        adminUserId,
          user_uid:  adminUserUID,
          email:     admin_email,
          full_name: `${admin_first_name} ${admin_last_name}`,
          role:      'SCHOOL_ADMIN',
        },
      },
    });

  } catch (err) {
    await conn.rollback();
    conn.release();
    console.error('❌  create-school:', err);
    res.status(500).json({ success: false, message: 'Failed to create school', error: err.message });
  }
});

// ============================================================
// GET /api/auth/schools  — list all schools
// ============================================================
router.get('/schools', async (req, res) => {
  if (!requireRole(req, res, 'SUPER_ADMIN', 'FULL_SYSTEM_CONTROLLER', 'NESA_ADMIN')) return;
  try {
    const [rows] = await promisePool.query(
      `SELECT
         s.id, s.school_name, s.school_code, s.email, s.phone,
         s.province, s.district, s.sector, s.cell,
         s.school_type, s.is_active, s.created_at,
         s.status AS school_record_status,
         s.school_status AS school_access_status,
         s.subscription_plan, s.pro_enabled, s.pro_start_date, s.pro_end_date,
         u.id            AS admin_id,
         u.email         AS admin_email,
         CONCAT(u.first_name,' ',u.last_name) AS admin_name
       FROM schools s
       LEFT JOIN users u ON u.id = s.admin_id
       WHERE s.is_active = 1
       ORDER BY s.school_name ASC`
    );
    res.json({ success: true, data: rows, total: rows.length });
  } catch (err) {
    console.error('❌  GET /schools:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch schools' });
  }
});

// ============================================================
// PATCH /api/auth/schools/:schoolId/subscription  — Super Admin / FSC
// Body: subscription_plan?, pro_enabled?, pro_start_date?, pro_end_date?, school_status?
// ============================================================
router.patch('/schools/:schoolId/subscription', async (req, res) => {
  if (!requireElevatedPlatform(req, res)) return;
  const schoolId = parseInt(req.params.schoolId, 10);
  if (!schoolId) {
    return res.status(400).json({ success: false, message: 'Invalid school id' });
  }
  const {
    subscription_plan,
    pro_enabled,
    pro_start_date,
    pro_end_date,
    school_status,
  } = req.body || {};

  const updates = [];
  const params = [];
  if (subscription_plan != null && ['lite', 'pro'].includes(String(subscription_plan).toLowerCase())) {
    updates.push('subscription_plan = ?');
    params.push(String(subscription_plan).toLowerCase());
  }
  if (pro_enabled != null) {
    updates.push('pro_enabled = ?');
    params.push(pro_enabled ? 1 : 0);
  }
  if (pro_start_date !== undefined) {
    updates.push('pro_start_date = ?');
    params.push(pro_start_date ? pro_start_date : null);
  }
  if (pro_end_date !== undefined) {
    updates.push('pro_end_date = ?');
    params.push(pro_end_date ? pro_end_date : null);
  }
  if (school_status != null && ['active', 'inactive', 'suspended'].includes(String(school_status).toLowerCase())) {
    updates.push('school_status = ?');
    params.push(String(school_status).toLowerCase());
  }
  if (!updates.length) {
    return res.status(400).json({ success: false, message: 'No valid fields to update' });
  }
  params.push(schoolId);
  try {
    await promisePool.query(
      `UPDATE schools SET ${updates.join(', ')}, updated_at = NOW() WHERE id = ? AND deleted_at IS NULL`,
      params
    );
    const [[row]] = await promisePool.query(
      `SELECT id, school_name, school_code, subscription_plan, pro_enabled, pro_start_date, pro_end_date, school_status
       FROM schools WHERE id = ? LIMIT 1`,
      [schoolId]
    );
    res.json({ success: true, message: 'School subscription updated', data: row });
  } catch (err) {
    console.error('❌  PATCH /schools/:id/subscription:', err);
    res.status(500).json({ success: false, message: 'Update failed', error: err.message });
  }
});

// ============================================================
// PATCH /api/auth/schools/:schoolId/manager-credentials
// Super Admin / FSC — update school manager login email + optional password
// (users row linked via schools.manager_user_id or schools.admin_id)
// Body: { login_email: string, new_password?: string }
// ============================================================
router.patch('/schools/:schoolId/manager-credentials', async (req, res) => {
  if (!requireElevatedPlatform(req, res)) return;
  const schoolId = parseInt(req.params.schoolId, 10);
  if (!schoolId) {
    return res.status(400).json({ success: false, message: 'Invalid school id' });
  }

  const { login_email, new_password } = req.body || {};
  const emailNorm = login_email != null ? String(login_email).trim().toLowerCase() : '';
  if (!emailNorm || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailNorm)) {
    return res.status(400).json({ success: false, message: 'Valid login_email is required' });
  }
  const pwdRaw = new_password != null ? String(new_password) : '';
  if (pwdRaw.length > 0 && pwdRaw.length < 8) {
    return res.status(400).json({ success: false, message: 'Password must be at least 8 characters' });
  }

  const conn = await promisePool.getConnection();
  try {
    await conn.beginTransaction();

    const [[school]] = await conn.query(
      `SELECT id, COALESCE(manager_user_id, admin_id) AS manager_id
       FROM schools WHERE id = ? AND deleted_at IS NULL`,
      [schoolId]
    );
    if (!school) {
      await conn.rollback();
      return res.status(404).json({ success: false, message: 'School not found' });
    }
    const managerId = school.manager_id;
    if (!managerId) {
      await conn.rollback();
      return res.status(404).json({
        success: false,
        message: 'No school manager account is linked to this school',
      });
    }

    const [[mgr]] = await conn.query(
      `SELECT u.id, u.email, r.role_code
       FROM users u
       INNER JOIN roles r ON r.id = u.role_id
       WHERE u.id = ? AND u.deleted_at IS NULL`,
      [managerId]
    );
    if (!mgr) {
      await conn.rollback();
      return res.status(404).json({ success: false, message: 'Manager user not found' });
    }
    const rc = (mgr.role_code || '').toUpperCase();
    if (rc !== 'SCHOOL_ADMIN' && rc !== 'SCHOOL_MANAGER') {
      await conn.rollback();
      return res.status(400).json({
        success: false,
        message: 'Linked user is not a school manager account',
      });
    }

    const [[dup]] = await conn.query(
      'SELECT id FROM users WHERE email = ? AND id != ? AND deleted_at IS NULL LIMIT 1',
      [emailNorm, managerId]
    );
    if (dup) {
      await conn.rollback();
      return res.status(409).json({
        success: false,
        message: 'That email is already used by another account',
      });
    }

    if (pwdRaw.length > 0) {
      const hash = await hashPassword(pwdRaw);
      await conn.query(
        `UPDATE users SET
           email = ?,
           password_hash = ?,
           failed_login_attempts = 0,
           is_locked = 0,
           locked_until = NULL,
           updated_at = NOW()
         WHERE id = ?`,
        [emailNorm, hash, managerId]
      );
    } else {
      await conn.query(
        'UPDATE users SET email = ?, updated_at = NOW() WHERE id = ?',
        [emailNorm, managerId]
      );
    }

    await conn.query(
      'UPDATE schools SET manager_user_id = COALESCE(manager_user_id, ?) WHERE id = ?',
      [managerId, schoolId]
    ).catch(() => {});

    await conn.commit();
    res.json({
      success: true,
      message: 'School manager login updated',
      data: { manager_id: managerId, login_email: emailNorm, password_changed: pwdRaw.length > 0 },
    });
  } catch (err) {
    await conn.rollback().catch(() => {});
    console.error('❌  PATCH /schools/:id/manager-credentials:', err);
    res.status(500).json({ success: false, message: 'Update failed', error: err.message });
  } finally {
    conn.release();
  }
});

// ============================================================
// GET /api/auth/schools/:schoolId/modules
// ============================================================
router.get('/schools/:schoolId/modules', async (req, res) => {
  if (!requireElevatedPlatform(req, res)) return;
  const schoolId = parseInt(req.params.schoolId, 10);
  if (!schoolId) return res.status(400).json({ success: false, message: 'Invalid school id' });
  try {
    const modules = await loadSchoolModules(promisePool, schoolId);
    res.json({ success: true, data: modules });
  } catch (err) {
    console.error('❌  GET /schools/:id/modules:', err);
    res.status(500).json({ success: false, message: 'Failed to load modules' });
  }
});

// ============================================================
// PUT /api/auth/schools/:schoolId/modules
// Body: { "attendance": true, "marks": false }  or { "modules": { ... } }
// ============================================================
router.put('/schools/:schoolId/modules', async (req, res) => {
  if (!requireElevatedPlatform(req, res)) return;
  const schoolId = parseInt(req.params.schoolId, 10);
  if (!schoolId) return res.status(400).json({ success: false, message: 'Invalid school id' });
  const raw = req.body?.modules && typeof req.body.modules === 'object' ? req.body.modules : req.body;
  if (!raw || typeof raw !== 'object') {
    return res.status(400).json({ success: false, message: 'Expected JSON object of module_key → boolean' });
  }
  const conn = await promisePool.getConnection();
  try {
    await conn.beginTransaction();
    for (const [key, val] of Object.entries(raw)) {
      if (!key || typeof key !== 'string') continue;
      const enabled = !!val;
      await conn.query(
        `INSERT INTO school_module_access (school_id, module_key, is_enabled)
         VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE is_enabled = VALUES(is_enabled), updated_at = NOW()`,
        [schoolId, key, enabled ? 1 : 0]
      );
    }
    await conn.commit();
    const modules = await loadSchoolModules(promisePool, schoolId);
    res.json({ success: true, message: 'Modules updated', data: modules });
  } catch (err) {
    await conn.rollback().catch(() => {});
    console.error('❌  PUT /schools/:id/modules:', err);
    res.status(500).json({ success: false, message: 'Failed to update modules', error: err.message });
  } finally {
    conn.release();
  }
});

// ============================================================
// POST /api/auth/create-nesa-admin  (Super Admin only)
// ============================================================
router.post('/create-nesa-admin', async (req, res) => {
  if (!requireElevatedPlatform(req, res)) return;
  try {
    const { first_name, last_name, email, phone, password } = req.body;

    if (!first_name || !last_name || !email || !password) {
      return res.status(400).json({ success: false, message: 'first_name, last_name, email, password required' });
    }
    if (password.length < 8) {
      return res.status(400).json({ success: false, message: 'Password must be at least 8 characters' });
    }

    const [[existing]] = await promisePool.query(
      'SELECT id FROM users WHERE email = ? LIMIT 1', [email]
    );
    if (existing) return res.status(409).json({ success: false, message: 'Email already registered' });

    const roleId = await getRoleId('NESA_ADMIN');
    if (!roleId) return res.status(500).json({ success: false, message: 'NESA_ADMIN role not found' });

    const hash     = await hashPassword(password);
    const user_uid = generateUserUID('NESA');

    const [result] = await promisePool.query(
      `INSERT INTO users
         (user_uid, email, phone, password_hash, first_name, last_name,
          role_id, is_active, is_verified, created_at)
       VALUES (?,?,?,?,?,?,?,1,1,NOW())`,
      [user_uid, email, phone || null, hash, first_name, last_name, roleId]
    );

    // Send welcome email (non-blocking)
    sendEmail(email, 'Your NESA Admin Account',
      `Hello ${first_name},\n\nYour NESA Admin account has been created.\nEmail: ${email}\n\nLog in at: ${process.env.FRONTEND_URL || 'http://localhost:3000'}/login`
    ).catch(() => {});

    res.status(201).json({
      success: true,
      message: 'NESA Admin account created',
      data: { id: result.insertId, user_uid, email, first_name, last_name, role: 'NESA_ADMIN' },
    });

  } catch (err) {
    console.error('❌  create-nesa-admin:', err);
    res.status(500).json({ success: false, message: 'Failed to create NESA Admin', error: err.message });
  }
});

// ============================================================
// GET /api/auth/nesa-admins
// ============================================================
router.get('/nesa-admins', async (req, res) => {
  if (!requireElevatedPlatform(req, res)) return;
  try {
    const [rows] = await promisePool.query(
      `SELECT u.id, u.user_uid, u.email, u.phone, u.first_name, u.last_name,
              CONCAT(u.first_name,' ',u.last_name) AS full_name,
              u.is_active, u.created_at
       FROM users u JOIN roles r ON u.role_id = r.id
       WHERE r.role_code = 'NESA_ADMIN' AND u.deleted_at IS NULL
       ORDER BY u.created_at DESC`
    );
    res.json({ success: true, data: rows, total: rows.length });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch NESA admins' });
  }
});

// ============================================================
// PUT /api/auth/nesa-admin/:id
// ============================================================
router.put('/nesa-admin/:id', async (req, res) => {
  if (!requireElevatedPlatform(req, res)) return;
  try {
    const { first_name, last_name, email, phone, password, is_active } = req.body;
    const fields = ['first_name=?','last_name=?','email=?','phone=?'];
    const vals   = [first_name, last_name, email, phone || null];
    if (password)              { fields.push('password_hash=?'); vals.push(await hashPassword(password)); }
    if (is_active !== undefined){ fields.push('is_active=?');    vals.push(is_active ? 1 : 0); }
    vals.push(req.params.id);
    await promisePool.query(`UPDATE users SET ${fields.join(',')} WHERE id=?`, vals);
    res.json({ success: true, message: 'NESA Admin updated' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Update failed', error: err.message });
  }
});

// ============================================================
// DELETE /api/auth/nesa-admin/:id
// ============================================================
router.delete('/nesa-admin/:id', async (req, res) => {
  if (!requireElevatedPlatform(req, res)) return;
  try {
    await promisePool.query(
      'UPDATE users SET deleted_at=NOW(), is_active=0 WHERE id=?', [req.params.id]
    );
    res.json({ success: true, message: 'NESA Admin deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Delete failed' });
  }
});

// ============================================================
// POST /api/auth/create-deo  (Super Admin only)
// ============================================================
router.post('/create-deo', async (req, res) => {
  if (!requireElevatedPlatform(req, res)) return;
  try {
    const { first_name, last_name, email, phone, password, district, province, sector } = req.body;

    if (!first_name || !last_name || !email || !password || !district) {
      return res.status(400).json({
        success: false,
        message: 'first_name, last_name, email, password, district are required',
      });
    }
    if (password.length < 8) {
      return res.status(400).json({ success: false, message: 'Password must be at least 8 characters' });
    }

    const [[existing]] = await promisePool.query(
      'SELECT id FROM users WHERE email = ? LIMIT 1', [email]
    );
    if (existing) return res.status(409).json({ success: false, message: 'Email already registered' });

    const roleId = await getRoleId('DEO');
    if (!roleId) return res.status(500).json({ success: false, message: 'DEO role not found' });

    const hash     = await hashPassword(password);
    const user_uid = generateUserUID('DEO');

    const [result] = await promisePool.query(
      `INSERT INTO users
         (user_uid, email, phone, password_hash, first_name, last_name,
          district, province, sector,
          role_id, is_active, is_verified, created_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,1,1,NOW())`,
      [user_uid, email, phone || null, hash,
       first_name, last_name,
       district, province || null, sector || null,
       roleId]
    );

    sendEmail(email, 'Your DEO Account',
      `Hello ${first_name},\n\nYour District Education Officer account has been created.\nDistrict: ${district}\nEmail: ${email}\n\nLog in at: ${process.env.FRONTEND_URL || 'http://localhost:3000'}/login`
    ).catch(() => {});

    res.status(201).json({
      success: true,
      message: 'DEO account created',
      data: {
        id: result.insertId, user_uid, email,
        first_name, last_name,
        district, province: province || null, sector: sector || null,
        role: 'DEO',
      },
    });

  } catch (err) {
    console.error('❌  create-deo:', err);
    res.status(500).json({ success: false, message: 'Failed to create DEO', error: err.message });
  }
});

// ============================================================
// GET /api/auth/deo-admins
// ============================================================
router.get('/deo-admins', async (req, res) => {
  if (!requireElevatedPlatform(req, res)) return;
  try {
    const [rows] = await promisePool.query(
      `SELECT u.id, u.user_uid, u.email, u.phone, u.first_name, u.last_name,
              CONCAT(u.first_name,' ',u.last_name) AS full_name,
              u.district, u.province, u.sector,
              u.is_active, u.created_at
       FROM users u JOIN roles r ON u.role_id = r.id
       WHERE r.role_code = 'DEO' AND u.deleted_at IS NULL
       ORDER BY u.district ASC, u.created_at DESC`
    );
    res.json({ success: true, data: rows, total: rows.length });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch DEOs' });
  }
});

// ============================================================
// PUT /api/auth/deo-admin/:id
// ============================================================
router.put('/deo-admin/:id', async (req, res) => {
  if (!requireElevatedPlatform(req, res)) return;
  try {
    const { first_name, last_name, email, phone, district, province, sector, password, is_active } = req.body;
    const fields = ['first_name=?','last_name=?','email=?','phone=?','district=?','province=?','sector=?'];
    const vals   = [first_name, last_name, email, phone || null, district, province || null, sector || null];
    if (password)              { fields.push('password_hash=?'); vals.push(await hashPassword(password)); }
    if (is_active !== undefined){ fields.push('is_active=?');    vals.push(is_active ? 1 : 0); }
    vals.push(req.params.id);
    await promisePool.query(`UPDATE users SET ${fields.join(',')} WHERE id=?`, vals);
    res.json({ success: true, message: 'DEO updated' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Update failed', error: err.message });
  }
});

// ============================================================
// DELETE /api/auth/deo-admin/:id
// ============================================================
router.delete('/deo-admin/:id', async (req, res) => {
  if (!requireElevatedPlatform(req, res)) return;
  try {
    await promisePool.query(
      'UPDATE users SET deleted_at=NOW(), is_active=0 WHERE id=?', [req.params.id]
    );
    res.json({ success: true, message: 'DEO deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Delete failed' });
  }
});

// ============================================================
// POST /api/auth/forgot-password
// ============================================================
router.post('/forgot-password', resetLimiter, async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, message: 'Email is required' });

    const [users] = await promisePool.query(
      'SELECT id, first_name FROM users WHERE email=? AND deleted_at IS NULL LIMIT 1', [email]
    );
    if (users.length) {
      const token = generateToken();
      await promisePool.query(
        `UPDATE users SET
           password_reset_token   = ?,
           password_reset_expires = DATE_ADD(NOW(), INTERVAL 10 MINUTE)
         WHERE id = ?`,
        [token, users[0].id]
      );
      const link = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${token}`;
      await sendEmail(email, 'Reset Your Password',
        `Hi ${users[0].first_name},\n\nClick to reset your password:\n${link}\n\nExpires in 10 minutes.`
      ).catch(() => {});
    }
    res.json({ success: true, message: 'If that email exists, a reset link has been sent' });
  } catch (err) {
    console.error('❌  forgot-password:', err);
    res.status(500).json({ success: false, message: 'Request failed' });
  }
});

// ============================================================
// POST /api/auth/reset-password
// ============================================================
router.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) {
      return res.status(400).json({ success: false, message: 'Token and newPassword are required' });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ success: false, message: 'Password must be at least 8 characters' });
    }

    const [users] = await promisePool.query(
      `SELECT id FROM users
       WHERE password_reset_token=? AND password_reset_expires > NOW() AND deleted_at IS NULL
       LIMIT 1`,
      [token]
    );
    if (!users.length) {
      return res.status(400).json({ success: false, message: 'Invalid or expired reset link' });
    }

    const hash = await hashPassword(newPassword);
    await promisePool.query(
      `UPDATE users SET
         password_hash=?, password_reset_token=NULL, password_reset_expires=NULL,
         failed_login_attempts=0, is_locked=0, locked_until=NULL
       WHERE id=?`,
      [hash, users[0].id]
    );

    res.json({ success: true, message: 'Password reset — you can now log in' });
  } catch (err) {
    console.error('❌  reset-password:', err);
    res.status(500).json({ success: false, message: 'Reset failed' });
  }
});

// ============================================================
// PUT /api/auth/change-password — logged-in user changes own password
// ============================================================
router.put('/change-password', async (req, res) => {
  if (!req.session?.userId) {
    return res.status(401).json({ success: false, message: 'Not authenticated' });
  }
  try {
    const { currentPassword, newPassword } = req.body;
    if (!newPassword) {
      return res.status(400).json({ success: false, message: 'newPassword is required' });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ success: false, message: 'New password must be at least 8 characters' });
    }

    const [[user]] = await promisePool.query(
      'SELECT email, first_name, password_hash, force_password_change FROM users WHERE id = ? AND deleted_at IS NULL LIMIT 1',
      [req.session.userId]
    );
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    const isForcedChange = !!user.force_password_change;
    if (!isForcedChange) {
      if (!currentPassword) {
        return res.status(400).json({ success: false, message: 'currentPassword is required' });
      }
      const valid = await verifyPassword(currentPassword, user.password_hash);
      if (!valid) {
        return res.status(400).json({ success: false, message: 'Current password is incorrect' });
      }
    }

    const hash = await hashPassword(newPassword);
    await promisePool.query(
      `UPDATE users
       SET password_hash = ?,
           failed_login_attempts = 0,
           is_locked = 0,
           locked_until = NULL,
           force_password_change = 0,
           updated_at = NOW()
       WHERE id = ?`,
      [hash, req.session.userId]
    );

    // Keep session in sync so UI updates without requiring a new login
    if (req.session.user) {
      req.session.user.force_password_change = false;
    }

    // Confirmation email (non-blocking)
    sendEmail(
      user.email,
      'Your password was changed',
      `Hi ${user.first_name || 'there'},\n\nYour password was changed successfully.\n\nIf you did not make this change, please reset your password immediately and contact support.`
    ).catch(() => {});

    res.json({ success: true, message: 'Password changed successfully' });
  } catch (err) {
    console.error('❌  change-password:', err);
    res.status(500).json({ success: false, message: 'Failed to change password' });
  }
});

// ============================================================
// POST /api/auth/profile/photo — upload profile image (logged-in user)
// ============================================================
// ============================================================
// GET /api/auth/system-config/public  — no auth (login page banner)
// ============================================================
router.get('/system-config/public', async (_req, res) => {
  try {
    const s = await systemSettings.getSettings();
    res.json({
      success: true,
      data: {
        maintenance_mode: s.maintenance_mode,
        block_non_super_writes: s.block_non_super_writes,
      },
    });
  } catch (err) {
    console.error('❌  system-config/public:', err);
    res.status(500).json({ success: false, message: 'Failed to load system status' });
  }
});

// ============================================================
// GET /api/auth/system-config  — Full System Controller only
// ============================================================
router.get('/system-config', async (req, res) => {
  if (!requireFullSystemController(req, res)) return;
  try {
    const s = await systemSettings.getSettings();
    const [[{ nonSuperTotal }]] = await promisePool.query(
      `SELECT COUNT(*) AS nonSuperTotal FROM users u
       JOIN roles r ON u.role_id = r.id
       WHERE u.deleted_at IS NULL
         AND r.role_code NOT IN ('SUPER_ADMIN','FULL_SYSTEM_CONTROLLER')`
    );
    const [[{ nonSuperActive }]] = await promisePool.query(
      `SELECT COUNT(*) AS nonSuperActive FROM users u
       JOIN roles r ON u.role_id = r.id
       WHERE u.deleted_at IS NULL
         AND r.role_code NOT IN ('SUPER_ADMIN','FULL_SYSTEM_CONTROLLER')
         AND u.is_active = 1`
    );
    const [[{ saCount }]] = await promisePool.query(
      `SELECT COUNT(*) AS saCount FROM users u
       JOIN roles r ON u.role_id = r.id
       WHERE u.deleted_at IS NULL AND r.role_code = 'SUPER_ADMIN'`
    );
    const [[{ fscCount }]] = await promisePool.query(
      `SELECT COUNT(*) AS fscCount FROM users u
       JOIN roles r ON u.role_id = r.id
       WHERE u.deleted_at IS NULL AND r.role_code = 'FULL_SYSTEM_CONTROLLER'`
    );
    res.json({
      success: true,
      data: {
        ...s,
        non_super_user_total: Number(nonSuperTotal) || 0,
        non_super_user_active: Number(nonSuperActive) || 0,
        super_admin_count: Number(saCount) || 0,
        full_system_controller_count: Number(fscCount) || 0,
      },
    });
  } catch (err) {
    console.error('❌  system-config:', err);
    res.status(500).json({ success: false, message: 'Failed to load configuration' });
  }
});

// ============================================================
// PUT /api/auth/system-config  — Full System Controller only
// Body: { maintenance_mode?: boolean, block_non_super_writes?: boolean }
// ============================================================
router.put('/system-config', async (req, res) => {
  if (!requireFullSystemController(req, res)) return;
  try {
    const { maintenance_mode, block_non_super_writes } = req.body || {};
    if (typeof maintenance_mode === 'boolean') {
      await systemSettings.setSetting('maintenance_mode', maintenance_mode);
    }
    if (typeof block_non_super_writes === 'boolean') {
      await systemSettings.setSetting('block_non_super_writes', block_non_super_writes);
    }
    const s = await systemSettings.getSettings();
    res.json({ success: true, message: 'Settings updated', data: s });
  } catch (err) {
    console.error('❌  system-config PUT:', err);
    res.status(500).json({ success: false, message: 'Failed to update configuration' });
  }
});

// ============================================================
// POST /api/auth/platform-users/bulk-disable-non-controller
// Deactivates every user except Full System Controller (includes Super Admins, staff, etc.)
// ============================================================
router.post('/platform-users/bulk-disable-non-controller', async (req, res) => {
  if (!requireFullSystemController(req, res)) return;
  try {
    const [r] = await promisePool.query(
      `UPDATE users u
       JOIN roles r ON u.role_id = r.id
       SET u.is_active = 0, u.updated_at = NOW()
       WHERE u.deleted_at IS NULL AND r.role_code <> 'FULL_SYSTEM_CONTROLLER'`
    );
    res.json({
      success: true,
      message: 'All accounts except Full System Controller are now disabled (logins blocked for those users).',
      affectedRows: r.affectedRows,
    });
  } catch (err) {
    console.error('❌  bulk-disable-non-controller:', err);
    res.status(500).json({ success: false, message: 'Bulk disable failed' });
  }
});

// ============================================================
// POST /api/auth/platform-users/bulk-enable-non-controller
// Reactivates every user except the controller role is unchanged; enables all non-FSC users.
// ============================================================
router.post('/platform-users/bulk-enable-non-controller', async (req, res) => {
  if (!requireFullSystemController(req, res)) return;
  try {
    const [r] = await promisePool.query(
      `UPDATE users u
       JOIN roles r ON u.role_id = r.id
       SET u.is_active = 1, u.updated_at = NOW()
       WHERE u.deleted_at IS NULL AND r.role_code <> 'FULL_SYSTEM_CONTROLLER'`
    );
    res.json({
      success: true,
      message: 'All non–Full System Controller accounts are now enabled.',
      affectedRows: r.affectedRows,
    });
  } catch (err) {
    console.error('❌  bulk-enable-non-controller:', err);
    res.status(500).json({ success: false, message: 'Bulk enable failed' });
  }
});

// ============================================================
// GET /api/auth/platform-users  — paginated list (FSC only)
// Query: page, limit, search
// ============================================================
router.get('/platform-users', async (req, res) => {
  if (!requireFullSystemController(req, res)) return;
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 35));
    const offset = (page - 1) * limit;
    const search = (req.query.search || '').trim();
    let where = 'WHERE u.deleted_at IS NULL';
    const params = [];
    if (search) {
      where += ` AND (
        u.email LIKE ? OR u.first_name LIKE ? OR u.last_name LIKE ?
        OR CONCAT(COALESCE(u.first_name,''),' ',COALESCE(u.last_name,'')) LIKE ?
        OR u.user_uid LIKE ? OR r.role_code LIKE ?
      )`;
      const q = `%${search}%`;
      params.push(q, q, q, q, q, q);
    }
    const [rows] = await promisePool.query(
      `SELECT u.id, u.user_uid, u.email, u.first_name, u.last_name, u.is_active, u.created_at,
              r.role_code, r.role_name
       FROM users u
       JOIN roles r ON r.id = u.role_id
       ${where}
       ORDER BY u.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );
    const [[{ total }]] = await promisePool.query(
      `SELECT COUNT(*) AS total FROM users u JOIN roles r ON r.id = u.role_id ${where}`,
      params
    );
    res.json({
      success: true,
      data: rows,
      total: Number(total) || 0,
      page,
      limit,
    });
  } catch (err) {
    console.error('❌  platform-users:', err);
    res.status(500).json({ success: false, message: 'Failed to list users' });
  }
});

// ============================================================
// PATCH /api/auth/platform-users/:id/active  — FSC only
// ============================================================
router.patch('/platform-users/:id/active', async (req, res) => {
  if (!requireFullSystemController(req, res)) return;
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id) || id < 1) {
      return res.status(400).json({ success: false, message: 'Invalid user id' });
    }
    const { is_active } = req.body || {};
    if (typeof is_active !== 'boolean') {
      return res.status(400).json({ success: false, message: 'Body must include is_active (boolean)' });
    }
    if (!is_active && id === req.session.userId) {
      return res.status(403).json({
        success: false,
        message: 'You cannot deactivate your own account.',
      });
    }
    const [[u]] = await promisePool.query(
      'SELECT id FROM users WHERE id = ? AND deleted_at IS NULL LIMIT 1',
      [id]
    );
    if (!u) return res.status(404).json({ success: false, message: 'User not found' });
    await promisePool.query(
      'UPDATE users SET is_active = ?, updated_at = NOW() WHERE id = ?',
      [is_active ? 1 : 0, id]
    );
    res.json({
      success: true,
      message: is_active ? 'User enabled.' : 'User disabled.',
    });
  } catch (err) {
    console.error('❌  platform-users/:id/active:', err);
    res.status(500).json({ success: false, message: 'Failed to update user' });
  }
});

// ============================================================
// GET /api/auth/super-admins/list  — Full System Controller only
// List all Super Administrator accounts for enable/disable management.
// ============================================================
router.get('/super-admins/list', async (req, res) => {
  if (!requireFullSystemController(req, res)) return;
  try {
    const [rows] = await promisePool.query(
      `SELECT u.id, u.user_uid, u.email, u.first_name, u.last_name,
              u.is_active, u.created_at
       FROM users u
       JOIN roles r ON u.role_id = r.id
       WHERE u.deleted_at IS NULL AND r.role_code = 'SUPER_ADMIN'
       ORDER BY u.email ASC`
    );
    res.json({ success: true, data: rows, total: rows.length });
  } catch (err) {
    console.error('❌  super-admins/list:', err);
    res.status(500).json({ success: false, message: 'Failed to list Super Admins' });
  }
});

// ============================================================
// PATCH /api/auth/super-admins/:id/active  — Full System Controller only
// Body: { is_active: boolean }
// ============================================================
router.patch('/super-admins/:id/active', async (req, res) => {
  if (!requireFullSystemController(req, res)) return;
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id) || id < 1) {
      return res.status(400).json({ success: false, message: 'Invalid user id' });
    }
    const { is_active } = req.body || {};
    if (typeof is_active !== 'boolean') {
      return res.status(400).json({ success: false, message: 'Body must include is_active (boolean)' });
    }

    if (!is_active && id === req.session.userId) {
      return res.status(403).json({
        success: false,
        message: 'You cannot deactivate your own account from this screen.',
      });
    }

    const [[u]] = await promisePool.query(
      `SELECT u.id, r.role_code FROM users u
       JOIN roles r ON u.role_id = r.id
       WHERE u.id = ? AND u.deleted_at IS NULL LIMIT 1`,
      [id]
    );
    if (!u) return res.status(404).json({ success: false, message: 'User not found' });
    if ((u.role_code || '').toUpperCase() !== 'SUPER_ADMIN') {
      return res.status(403).json({ success: false, message: 'That account is not a Super Administrator' });
    }

    await promisePool.query(
      'UPDATE users SET is_active = ?, updated_at = NOW() WHERE id = ?',
      [is_active ? 1 : 0, id]
    );

    res.json({
      success: true,
      message: is_active ? 'Super Admin account is now enabled.' : 'Super Admin account is now disabled.',
    });
  } catch (err) {
    console.error('❌  super-admins/:id/active:', err);
    res.status(500).json({ success: false, message: 'Failed to update Super Admin' });
  }
});

// ============================================================
// POST /api/auth/create-super-admin  — SUPER_ADMIN
// Creates an additional Super Administrator (same role as you).
// ============================================================
router.post('/create-super-admin', async (req, res) => {
  if (!requireFullSystemController(req, res)) return;
  try {
    const { email, password, first_name, last_name, phone } = req.body || {};
    if (!email || !password || !first_name || !last_name) {
      return res.status(400).json({
        success: false,
        message: 'email, password, first_name, and last_name are required',
      });
    }
    if (password.length < 8) {
      return res.status(400).json({ success: false, message: 'Password must be at least 8 characters' });
    }

    const roleId = await getRoleId('SUPER_ADMIN');
    if (!roleId) return res.status(500).json({ success: false, message: 'SUPER_ADMIN role not found in database' });

    const em = String(email).trim().toLowerCase();
    const [[existing]] = await promisePool.query(
      'SELECT id FROM users WHERE email = ? LIMIT 1', [em]
    );
    if (existing) return res.status(409).json({ success: false, message: 'Email already registered' });

    const hash = await hashPassword(password);
    const user_uid = generateUserUID('SA');

    const [result] = await promisePool.query(
      `INSERT INTO users
         (user_uid, email, phone, password_hash, first_name, last_name,
          role_id, is_active, is_verified, created_at)
       VALUES (?,?,?,?,?,?,?,1,1,NOW())`,
      [user_uid, em, phone || null, hash, first_name, last_name, roleId]
    );

    res.status(201).json({
      success: true,
      message: 'Super Admin account created — they can sign in on the main login page.',
      data: { id: result.insertId, user_uid, email: em, first_name, last_name },
    });
  } catch (err) {
    console.error('❌  create-super-admin:', err);
    res.status(500).json({ success: false, message: 'Failed to create Super Admin', error: err.message });
  }
});

// ============================================================
// POST /api/auth/create-full-system-controller
// Creates a Full System Controller user (dashboard: /superadmin/control)
// ============================================================
router.post('/create-full-system-controller', async (req, res) => {
  if (!requireFullSystemController(req, res)) return;
  try {
    const { email, password, first_name, last_name, phone } = req.body || {};
    if (!email || !password || !first_name || !last_name) {
      return res.status(400).json({
        success: false,
        message: 'email, password, first_name, and last_name are required',
      });
    }
    if (password.length < 8) {
      return res.status(400).json({ success: false, message: 'Password must be at least 8 characters' });
    }

    const roleId = await getRoleId('FULL_SYSTEM_CONTROLLER');
    if (!roleId) {
      return res.status(500).json({
        success: false,
        message: 'FULL_SYSTEM_CONTROLLER role not found — restart the API server to seed the role',
      });
    }

    const em = String(email).trim().toLowerCase();
    const [[existing]] = await promisePool.query(
      'SELECT id FROM users WHERE email = ? LIMIT 1', [em]
    );
    if (existing) return res.status(409).json({ success: false, message: 'Email already registered' });

    const hash = await hashPassword(password);
    const user_uid = generateUserUID('FSC');

    const [result] = await promisePool.query(
      `INSERT INTO users
         (user_uid, email, phone, password_hash, first_name, last_name,
          role_id, is_active, is_verified, created_at)
       VALUES (?,?,?,?,?,?,?,1,1,NOW())`,
      [user_uid, em, phone || null, hash, first_name, last_name, roleId]
    );

    res.status(201).json({
      success: true,
      message: 'Full System Controller created — they sign in at /login and land on /system-controller/dashboard.',
      data: { id: result.insertId, user_uid, email: em, first_name, last_name, role: 'FULL_SYSTEM_CONTROLLER' },
    });
  } catch (err) {
    console.error('❌  create-full-system-controller:', err);
    res.status(500).json({ success: false, message: 'Failed to create account', error: err.message });
  }
});

// ============================================================
// ShuleAvance partner organizations (Super Admin / FSC)
// ============================================================
const SHULE_CAT_DEFAULT = ['Parent', 'Teacher', 'Director'];

/** Free-text or array: comma / semicolon / newline separated labels, max 30 entries, 120 chars each. */
function sanitizeApplicantCategoriesInput(value) {
  if (value == null) return [...SHULE_CAT_DEFAULT];
  const arr = Array.isArray(value) ? value : String(value).split(/[,;\n\r]+/);
  const out = [];
  const seen = new Set();
  for (const x of arr) {
    const t = String(x).trim().replace(/\s+/g, ' ');
    if (!t || t.length > 120) continue;
    const k = t.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(t);
    if (out.length >= 30) break;
  }
  return out.length ? out : [...SHULE_CAT_DEFAULT];
}

function parseShuleAvanceApplicantCategories(body) {
  const raw =
    body?.applicant_categories ??
    body?.applicantCategories ??
    body?.applicant_categories_text;
  return sanitizeApplicantCategoriesInput(raw);
}

function normalizeOrgApplicantCategoriesRow(row) {
  if (!row) return row;
  let cats = [...SHULE_CAT_DEFAULT];
  const j = row.applicant_categories_json;
  if (j != null) {
    try {
      const p = typeof j === 'string' ? JSON.parse(j) : j;
      cats = sanitizeApplicantCategoriesInput(p);
    } catch (_) {}
  }
  const { applicant_categories_json, ...rest } = row;
  const rateNum = row.rate_percent == null ? null : Number(row.rate_percent);
  return {
    ...rest,
    applicant_categories: cats,
    rate_percent: Number.isFinite(rateNum) ? rateNum : null,
    rate_is_monthly: !!Number(row.rate_is_monthly || 0),
    disbursement_account_type: normalizeDisbursementAccountTypeInput(row.disbursement_account_type, 'SCHOOL_ACCOUNT'),
  };
}

function normalizeRatePercentInput(value) {
  if (value === undefined) return undefined;
  if (value === null || value === '') return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0 || n > 100) return NaN;
  return Math.round(n * 1000) / 1000;
}

function normalizeDisbursementAccountTypeInput(value, fallback = 'SCHOOL_ACCOUNT') {
  if (value === undefined || value === null || value === '') return fallback;
  const v = String(value).trim().toUpperCase();
  if (v === 'PERSONAL_ACCOUNT' || v === 'SCHOOL_ACCOUNT' || v === 'OTHER') return v;
  return fallback;
}

router.post('/create-shule-avance-organization', async (req, res) => {
  if (!requireElevatedPlatform(req, res)) return;
  try {
    await ensureShuleAvanceOrgTables();
    const b = req.body || {};
    const org_name = String(b.org_name || '').trim();
    const org_type = String(b.org_type || 'INTERNAL_PARTNER').trim().slice(0, 32);
    const contact_person = String(b.contact_person || '').trim().slice(0, 180);
    const contact_email = String(b.contact_email || '').trim().toLowerCase();
    const contact_phone = String(b.contact_phone || '').trim().slice(0, 40) || null;
    const login_username = String(b.login_username || '').trim().toLowerCase();
    const password = String(b.password || '');
    const address = String(b.address || '').trim() || null;
    const description = String(b.description || '').trim().slice(0, 4000) || null;
    const notes = String(b.notes || '').trim().slice(0, 4000) || null;
    const is_active = b.is_active !== undefined ? !!b.is_active : true;
    const rate_is_monthly = !!(b.rate_is_monthly ?? b.is_rate_monthly ?? b.rateMonthly);
    const disbursement_account_type = normalizeDisbursementAccountTypeInput(
      b.disbursement_account_type ?? b.disbursementAccountType,
      'SCHOOL_ACCOUNT'
    );
    const applicant_categories = parseShuleAvanceApplicantCategories(b);
    const rate_percent = normalizeRatePercentInput(
      b.rate_percent ?? b.income_rate_percent ?? b.income_rate
    );
    if (Number.isNaN(rate_percent)) {
      return res.status(400).json({ success: false, message: 'income rate must be between 0 and 100' });
    }
    if (!org_name || !contact_email || !login_username || !password) {
      return res.status(400).json({
        success: false,
        message: 'org_name, contact_email, login_username, and password are required',
      });
    }
    if (password.length < 8) {
      return res.status(400).json({ success: false, message: 'Password must be at least 8 characters' });
    }
    const [[dupMail]] = await promisePool.query('SELECT id FROM users WHERE email = ? LIMIT 1', [contact_email]);
    if (dupMail) return res.status(409).json({ success: false, message: 'Email already registered' });
    const [[dupOrg]] = await promisePool.query(
      `SELECT id FROM pro_shule_avance_organizations
       WHERE LOWER(login_username) = ? OR LOWER(contact_email) = ? LIMIT 1`,
      [login_username, contact_email]
    );
    if (dupOrg) {
      return res.status(409).json({ success: false, message: 'Username or organization email already exists' });
    }

    const roleId = await getRoleId('SHULE_AVANCE_PARTNER');
    if (!roleId) return res.status(500).json({ success: false, message: 'SHULE_AVANCE_PARTNER role not found' });

    const hash = await hashPassword(password);
    const user_uid = generateUserUID('SAV');
    const fn = (contact_person || org_name).slice(0, 80);
    const ln = 'Partner';
    const [ur] = await promisePool.query(
      `INSERT INTO users (user_uid, email, phone, password_hash, first_name, last_name, role_id, is_active, is_verified, created_at)
       VALUES (?,?,?,?,?,?,?,1,1,NOW())`,
      [user_uid, contact_email, contact_phone, hash, fn, ln, roleId]
    );
    const newUserId = ur.insertId;
    const [or] = await promisePool.query(
      `INSERT INTO pro_shule_avance_organizations
       (user_id, org_name, org_type, login_username, contact_person, contact_email, contact_phone, address, description, notes, is_active, applicant_categories_json, rate_percent, rate_is_monthly, disbursement_account_type)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        newUserId,
        org_name,
        org_type,
        login_username,
        contact_person || null,
        contact_email,
        contact_phone,
        address,
        description,
        notes,
        is_active ? 1 : 0,
        JSON.stringify(applicant_categories),
        rate_percent,
        rate_is_monthly ? 1 : 0,
        disbursement_account_type,
      ]
    );

    res.status(201).json({
      success: true,
      message: 'ShuleAvance organization created — partner signs in with email or username on the main login page.',
      data: { id: or.insertId, user_id: newUserId, login_username, email: contact_email },
    });
  } catch (err) {
    console.error('❌  create-shule-avance-organization:', err);
    res.status(500).json({ success: false, message: err.message || 'Failed to create organization' });
  }
});

router.get('/shule-avance-organizations', async (req, res) => {
  if (!requireElevatedPlatform(req, res)) return;
  try {
    await ensureShuleAvanceOrgTables();
    const [rows] = await promisePool.query(
      `SELECT o.id, o.org_name, o.org_type, o.login_username, o.contact_person, o.contact_email, o.contact_phone,
              o.is_active, o.created_at, o.user_id, o.address, o.description, o.notes, o.applicant_categories_json, o.rate_percent, o.rate_is_monthly, o.disbursement_account_type,
              u.is_active AS user_is_active
       FROM pro_shule_avance_organizations o
       JOIN users u ON u.id = o.user_id AND u.deleted_at IS NULL
       ORDER BY o.created_at DESC`
    );
    res.json({ success: true, data: (rows || []).map(normalizeOrgApplicantCategoriesRow) });
  } catch (err) {
    console.error('❌  shule-avance-organizations:', err);
    res.status(500).json({ success: false, message: 'Failed to list organizations' });
  }
});

router.get('/shule-avance-organization/:id', async (req, res) => {
  if (!requireElevatedPlatform(req, res)) return;
  try {
    await ensureShuleAvanceOrgTables();
    const id = parseInt(req.params.id, 10);
    if (!id) return res.status(400).json({ success: false, message: 'Invalid id' });
    const [rows] = await promisePool.query(
      `SELECT o.*, u.is_active AS user_is_active
       FROM pro_shule_avance_organizations o
       JOIN users u ON u.id = o.user_id
       WHERE o.id = ? LIMIT 1`,
      [id]
    );
    const row = rows?.[0];
    if (!row) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data: normalizeOrgApplicantCategoriesRow(row) });
  } catch (err) {
    console.error('❌  shule-avance-organization get:', err);
    res.status(500).json({ success: false, message: 'Failed to load organization' });
  }
});

router.put('/shule-avance-organization/:id', async (req, res) => {
  if (!requireElevatedPlatform(req, res)) return;
  try {
    await ensureShuleAvanceOrgTables();
    const id = parseInt(req.params.id, 10);
    if (!id) return res.status(400).json({ success: false, message: 'Invalid id' });
    const b = req.body || {};
    const [[org]] = await promisePool.query(
      'SELECT id, user_id FROM pro_shule_avance_organizations WHERE id = ? LIMIT 1',
      [id]
    );
    if (!org) return res.status(404).json({ success: false, message: 'Not found' });

    const org_name = b.org_name !== undefined ? String(b.org_name).trim() : null;
    const org_type = b.org_type !== undefined ? String(b.org_type).trim().slice(0, 32) : null;
    const contact_person = b.contact_person !== undefined ? String(b.contact_person).trim().slice(0, 180) : null;
    const contact_email = b.contact_email !== undefined ? String(b.contact_email).trim().toLowerCase() : null;
    const contact_phone = b.contact_phone !== undefined ? String(b.contact_phone).trim().slice(0, 40) : undefined;
    const login_username = b.login_username !== undefined ? String(b.login_username).trim().toLowerCase() : null;
    const address = b.address !== undefined ? String(b.address).trim() : undefined;
    const description = b.description !== undefined ? String(b.description).trim().slice(0, 4000) : undefined;
    const notes = b.notes !== undefined ? String(b.notes).trim().slice(0, 4000) : undefined;
    const is_active = b.is_active !== undefined ? (b.is_active ? 1 : 0) : undefined;
    const rate_is_monthly = b.rate_is_monthly !== undefined || b.is_rate_monthly !== undefined || b.rateMonthly !== undefined
      ? (!!(b.rate_is_monthly ?? b.is_rate_monthly ?? b.rateMonthly) ? 1 : 0)
      : undefined;
    const disbursement_account_type =
      b.disbursement_account_type !== undefined || b.disbursementAccountType !== undefined
        ? normalizeDisbursementAccountTypeInput(
            b.disbursement_account_type ?? b.disbursementAccountType,
            'SCHOOL_ACCOUNT'
          )
        : undefined;
    const rate_percent = normalizeRatePercentInput(
      b.rate_percent ?? b.income_rate_percent ?? b.income_rate
    );
    if (Number.isNaN(rate_percent)) {
      return res.status(400).json({ success: false, message: 'income rate must be between 0 and 100' });
    }
    const password = b.password ? String(b.password) : '';

    if (contact_email) {
      const [[em]] = await promisePool.query(
        'SELECT id FROM users WHERE email = ? AND id <> ? LIMIT 1',
        [contact_email, org.user_id]
      );
      if (em) return res.status(409).json({ success: false, message: 'Email already in use' });
    }
    if (login_username) {
      const [[un]] = await promisePool.query(
        `SELECT id FROM pro_shule_avance_organizations WHERE LOWER(login_username) = ? AND id <> ? LIMIT 1`,
        [login_username, id]
      );
      if (un) return res.status(409).json({ success: false, message: 'Username already in use' });
    }

    const ofields = [];
    const ovals = [];
    if (org_name) { ofields.push('org_name=?'); ovals.push(org_name); }
    if (org_type) { ofields.push('org_type=?'); ovals.push(org_type); }
    if (contact_person !== null && b.contact_person !== undefined) { ofields.push('contact_person=?'); ovals.push(contact_person); }
    if (contact_email) { ofields.push('contact_email=?'); ovals.push(contact_email); }
    if (contact_phone !== undefined) { ofields.push('contact_phone=?'); ovals.push(contact_phone || null); }
    if (login_username) { ofields.push('login_username=?'); ovals.push(login_username); }
    if (address !== undefined) { ofields.push('address=?'); ovals.push(address || null); }
    if (description !== undefined) { ofields.push('description=?'); ovals.push(description || null); }
    if (notes !== undefined) { ofields.push('notes=?'); ovals.push(notes || null); }
    if (is_active !== undefined) { ofields.push('is_active=?'); ovals.push(is_active); }
    if (rate_percent !== undefined) { ofields.push('rate_percent=?'); ovals.push(rate_percent); }
    if (rate_is_monthly !== undefined) { ofields.push('rate_is_monthly=?'); ovals.push(rate_is_monthly); }
    if (disbursement_account_type !== undefined) { ofields.push('disbursement_account_type=?'); ovals.push(disbursement_account_type); }
    if (
      b.applicant_categories !== undefined ||
      b.applicantCategories !== undefined ||
      b.applicant_categories_json !== undefined
    ) {
      const ac = parseShuleAvanceApplicantCategories(b);
      ofields.push('applicant_categories_json=?');
      ovals.push(JSON.stringify(ac));
    }
    if (ofields.length) {
      ovals.push(id);
      await promisePool.query(
        `UPDATE pro_shule_avance_organizations SET ${ofields.join(', ')} WHERE id=?`,
        ovals
      );
    }

    const ufields = [];
    const uvals = [];
    if (contact_email) { ufields.push('email=?'); uvals.push(contact_email); }
    if (contact_phone !== undefined) { ufields.push('phone=?'); uvals.push(contact_phone || null); }
    if (password && password.length >= 8) {
      ufields.push('password_hash=?');
      uvals.push(await hashPassword(password));
    }
    if (is_active !== undefined) { ufields.push('is_active=?'); uvals.push(is_active); }
    if (ufields.length) {
      uvals.push(org.user_id);
      await promisePool.query(`UPDATE users SET ${ufields.join(', ')} WHERE id=?`, uvals);
    }

    res.json({ success: true, message: 'Organization updated' });
  } catch (err) {
    console.error('❌  shule-avance-organization put:', err);
    res.status(500).json({ success: false, message: err.message || 'Update failed' });
  }
});

router.delete('/shule-avance-organization/:id', async (req, res) => {
  if (!requireElevatedPlatform(req, res)) return;
  try {
    await ensureShuleAvanceOrgTables();
    const id = parseInt(req.params.id, 10);
    if (!id) return res.status(400).json({ success: false, message: 'Invalid id' });
    const [[org]] = await promisePool.query(
      'SELECT id, user_id FROM pro_shule_avance_organizations WHERE id = ? LIMIT 1',
      [id]
    );
    if (!org) return res.status(404).json({ success: false, message: 'Not found' });
    await promisePool.query('UPDATE pro_shule_avance_organizations SET is_active = 0 WHERE id = ?', [id]);
    await promisePool.query(
      'UPDATE users SET is_active = 0, deleted_at = COALESCE(deleted_at, NOW()) WHERE id = ?',
      [org.user_id]
    );
    res.json({ success: true, message: 'Organization removed; partner login is disabled.' });
  } catch (err) {
    console.error('❌  shule-avance-organization delete:', err);
    res.status(500).json({ success: false, message: err.message || 'Delete failed' });
  }
});

// ── ShuleAvance teacher catalog (Super Admin — global rates for all schools) ──
router.get('/shule-avance-teacher-catalog', async (req, res) => {
  if (!requireElevatedPlatform(req, res)) return;
  try {
    await ensureShuleAvanceTeacherCatalogTable();
    const includeInactive = String(req.query?.include_inactive || '') === '1';
    const rows = await listTeacherCatalogAdmin(includeInactive);
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('❌  shule-avance-teacher-catalog GET:', err);
    res.status(500).json({ success: false, message: err.message || 'Failed to load catalog' });
  }
});

router.post('/shule-avance-teacher-catalog', async (req, res) => {
  if (!requireElevatedPlatform(req, res)) return;
  try {
    await ensureShuleAvanceTeacherCatalogTable();
    const id = await createTeacherCatalogItem(req.body || {});
    res.status(201).json({ success: true, message: 'Catalog item created', id });
  } catch (err) {
    const code = err.code === 'ER_DUP_ENTRY' ? 409 : 400;
    res.status(code).json({ success: false, message: err.message || 'Create failed' });
  }
});

router.patch('/shule-avance-teacher-catalog/:id', async (req, res) => {
  if (!requireElevatedPlatform(req, res)) return;
  try {
    await ensureShuleAvanceTeacherCatalogTable();
    const id = parseInt(req.params.id, 10);
    if (!id) return res.status(400).json({ success: false, message: 'Invalid id' });
    await updateTeacherCatalogItem(id, req.body || {});
    res.json({ success: true, message: 'Updated' });
  } catch (err) {
    const code = err.message === 'Not found' ? 404 : 400;
    res.status(code).json({ success: false, message: err.message || 'Update failed' });
  }
});

router.delete('/shule-avance-teacher-catalog/:id', async (req, res) => {
  if (!requireElevatedPlatform(req, res)) return;
  try {
    await ensureShuleAvanceTeacherCatalogTable();
    const id = parseInt(req.params.id, 10);
    if (!id) return res.status(400).json({ success: false, message: 'Invalid id' });
    const ok = await deleteTeacherCatalogItem(id);
    if (!ok) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message || 'Delete failed' });
  }
});

router.post('/profile/photo', uploadProfilePhoto.single('photo'), async (req, res) => {
  if (!req.session?.userId) {
    return res.status(401).json({ success: false, message: 'Not authenticated' });
  }
  try {
    if (!req.file || !req.file.path) {
      return res.status(400).json({ success: false, message: 'No image file uploaded' });
    }
    // URL path for frontend: /uploads/profile-photos/filename
    const photoPath = '/uploads/profile-photos/' + req.file.filename;

    await promisePool.query(
      'UPDATE users SET photo = ? WHERE id = ?',
      [photoPath, req.session.userId]
    );

    if (req.session.user) {
      req.session.user.photo = photoPath;
    }

    res.json({
      success: true,
      message: 'Profile photo updated',
      data: { photo: photoPath },
    });
  } catch (err) {
    console.error('❌  profile/photo:', err);
    res.status(500).json({ success: false, message: err.message || 'Failed to upload photo' });
  }
});

module.exports = router;