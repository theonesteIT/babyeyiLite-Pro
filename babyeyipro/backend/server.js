'use strict';

// ================================================================
// server.js  —  Babyeyi + Auth Standalone Server  v2.3
//
// v2.3 changes (on top of v2.2):
//   + Added admission routes at /api/admissions
//     (form builder, public apply, applications management)
//   + Added uploads/admission-files directory creation
//   + Added /api/admissions to MULTER_SELF_MANAGED exclusion list
//
// v2.2 changes:
//   + Added school mini-website routes at /api/mini-websites
//
// INSTALL:
//   npm install
//
// ENV (.env):
//   PORT=5100
//   DB_HOST=localhost
//   DB_PORT=3306
//   DB_USER=root
//   DB_PASSWORD=yourpassword
//   DB_NAME=school_db
//   SESSION_SECRET=<node -e "console.log(require('crypto').randomBytes(32).toString('hex'))">
//   BABYEYI_HASH_SECRET=<same command>
//   FRONTEND_URL=http://localhost:3000
//   NODE_ENV=development
// ================================================================

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const MySQLStoreFactory = require('express-mysql-session')(session);
const multer = require('multer');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const { testConnection, promisePool } = require('./config/database');
const { computeProAccessEffective, loadSchoolModules } = require('./utils/schoolSubscription');
const systemSettings = require('./utils/systemSettings');
const { ensureFullSystemControllerRole } = require('./utils/ensureRoles');
const { getAgentSessionPayload } = require('./BabyeyiRoutes/fieldAgentsRoutes');

/** SUPER_ADMIN and FULL_SYSTEM_CONTROLLER — exempt from maintenance session kill & write lock */
function isElevatedPlatformRole(roleCode) {
  const r = (roleCode || '').toUpperCase();
  return r === 'SUPER_ADMIN' || r === 'FULL_SYSTEM_CONTROLLER';
}

const app = express();
const PORT = process.env.PORT || 5100;

// ============================================================
// UPLOAD DIRECTORIES
// ============================================================
[
  'uploads/babyeyi',
  'uploads/babyeyi/deo',
  'uploads/babyeyi/qrcodes',
  'uploads/babyeyi/pdfs',
  'uploads/fee-limits',
  'uploads/mini-websites',          // cover, about & mission images
  'uploads/admission-files',        // ← NEW v2.3: admission application uploads
  'uploads/profile-photos',         // user profile images (school manager etc.)
  'uploads/student-profile-photos', // student identity photos (DOS wizard)
  'uploads/requirement-images',     // Super Admin catalog requirement images
  'uploads/service-icons',          // Super Admin voucher / student service icons
  'uploads/temp',
].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`📁  Created: ${dir}`);
  }
});

// ============================================================
// ENV GUARDS
// ============================================================
if (!process.env.SESSION_SECRET) {
  const crypto = require('crypto');
  process.env.SESSION_SECRET = crypto.randomBytes(32).toString('hex');
  console.warn('⚠️  SESSION_SECRET not set in .env — auto-generated for this session.');
  console.warn('   Add this to your .env to make it permanent:');
  console.warn(`   SESSION_SECRET=${process.env.SESSION_SECRET}`);
}
if (!process.env.BABYEYI_HASH_SECRET) {
  console.warn('⚠️  BABYEYI_HASH_SECRET not set — QR hashes using insecure default!');
}

// ============================================================
// SESSION STORE  (express-mysql-session — works with mysql2)
// ============================================================
const sessionStoreOptions = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'school_db',
  createDatabaseTable: true,
  clearExpired: true,
  checkExpirationInterval: 15 * 60 * 1000,
  expiration: 8 * 60 * 60 * 1000,
  schema: {
    tableName: 'app_sessions',
    columnNames: {
      session_id: 'session_id',
      expires: 'expires',
      data: 'data',
    },
  },
};

const sessionStore = new MySQLStoreFactory(sessionStoreOptions);

sessionStore.onReady().then(() => {
  console.log('✅  Session store (MySQL) ready');
}).catch(err => {
  console.error('❌  Session store failed to connect:', err.message);
});

// ============================================================
// GLOBAL MIDDLEWARE
// ============================================================
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));

// ── CORS ──────────────────────────────────────────────────────
const getAllowedOrigins = () => {
  const envVal = process.env.FRONTEND_URL;
  if (process.env.NODE_ENV !== 'production') return true;
  if (!envVal) return false;
  const list = envVal.split(',').map(s => s.trim()).filter(Boolean);
  return list.length === 1 ? list[0] : list;
};

app.use(cors({
  origin: getAllowedOrigins(),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));

app.use(cookieParser(process.env.SESSION_SECRET || 'babyeyi-default-secret'));

// ── Session ────────────────────────────────────────────────────
app.use(session({
  name: 'babyeyi_sid',
  secret: process.env.SESSION_SECRET || 'babyeyi-default-secret',
  store: sessionStore,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
    maxAge: 8 * 60 * 60 * 1000,
  },
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Profile photos: serve from backend/uploads/profile-photos, with fallback for legacy path
app.get('/uploads/profile-photos/:filename', (req, res) => {
  const filename = req.params.filename;
  if (!filename || !/^[a-zA-Z0-9._-]+$/.test(filename)) {
    return res.status(400).end();
  }
  const primaryDir = path.join(__dirname, 'uploads', 'profile-photos');
  const primaryPath = path.join(primaryDir, filename);
  const legacyDir = path.join(__dirname, '..', 'uploads', 'profile-photos');
  const legacyPath = path.join(legacyDir, filename);
  if (fs.existsSync(primaryPath)) {
    return res.sendFile(primaryPath);
  }
  if (fs.existsSync(legacyPath)) {
    return res.sendFile(legacyPath);
  }
  res.status(404).end();
});

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(compression());
app.use(process.env.NODE_ENV === 'development' ? morgan('dev') : morgan('combined'));

app.use((req, _res, next) => {
  console.log(`📡  ${req.method} ${req.url}${req.session?.userId ? ` [uid:${req.session.userId}]` : ''}`);
  next();
});

// ============================================================
// RATE LIMITING
// ============================================================
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, max: 300,
  standardHeaders: true, legacyHeaders: false,
  message: { success: false, message: 'Too many requests — please slow down' },
  skip: (req) => {
    const p = (req.originalUrl || req.url || '').split('?')[0];
    return p.endsWith('/session/me') || p.endsWith('/district/babyeyi/me');
  },
});
app.use('/api/', apiLimiter);

app.use('/api/auth/login', rateLimit({
  windowMs: 15 * 60 * 1000, max: 10,
  standardHeaders: true, legacyHeaders: false,
  message: { success: false, message: 'Too many login attempts — try again in 15 min' },
}));

app.use('/api/babyeyi/verify', rateLimit({
  windowMs: 15 * 60 * 1000, max: 600,
  standardHeaders: true, legacyHeaders: false,
  message: { success: false, message: 'Verification rate limit exceeded' },
}));

// ============================================================
// SESSION HYDRATION
// ============================================================
app.use(async (req, _res, next) => {
  if (!req.session?.userId) return next();
  try {
    const [rows] = await promisePool.query(
      `SELECT u.id, u.user_uid, u.email, u.first_name, u.last_name,
              u.photo, u.is_active, u.district, u.province, u.sector,
              u.school_id, u.role_id,
              u.force_password_change,
              r.role_code, r.role_name, r.permissions
       FROM users u
       JOIN roles r ON u.role_id = r.id
       WHERE u.id = ? AND u.deleted_at IS NULL
       LIMIT 1`,
      [req.session.userId]
    );
    if (rows.length > 0 && rows[0].is_active) {
      const sys = await systemSettings.getSettings();
      const rc = (rows[0].role_code || '').toUpperCase();
      if (sys.maintenance_mode && !isElevatedPlatformRole(rc)) {
        req.session.destroy(() => { });
        return next();
      }
      req.user = rows[0];
      const roleCode = (req.user.role_code || '').toUpperCase();
      const isSchoolManager = roleCode === 'SCHOOL_ADMIN' || roleCode === 'SCHOOL_MANAGER';
      if (isSchoolManager && !req.user.school_id) {
        let schoolRows = [];
        try {
          [schoolRows] = await promisePool.query(
            `SELECT id, school_name, school_code, email, phone, district, province,
                    status AS school_record_status,
                    school_status AS school_access_status,
                    subscription_plan, pro_enabled, pro_start_date, pro_end_date
             FROM schools WHERE manager_user_id = ? AND (deleted_at IS NULL AND (status IS NULL OR status = 'active')) LIMIT 1`,
            [req.session.userId]
          );
        } catch (_) {
          [schoolRows] = [];
        }
        if (schoolRows && schoolRows.length > 0 && schoolRows[0].id) {
          const s = schoolRows[0];
          let modules = {};
          try {
            modules = await loadSchoolModules(promisePool, s.id);
          } catch (_) {}
          const pro_access_effective = computeProAccessEffective({
            subscription_plan: s.subscription_plan,
            pro_enabled: s.pro_enabled,
            pro_end_date: s.pro_end_date,
          });
          const schoolPayload = {
            id: s.id,
            name: s.school_name,
            code: s.school_code,
            email: s.email || null,
            phone: s.phone || null,
            district: s.district || null,
            province: s.province || null,
            school_record_status: s.school_record_status ?? null,
            school_access_status: s.school_access_status || 'active',
            subscription_plan: s.subscription_plan || 'lite',
            pro_enabled: Number(s.pro_enabled) === 1,
            pro_start_date: s.pro_start_date || null,
            pro_end_date: s.pro_end_date || null,
            pro_access_effective,
            modules,
          };
          req.user.school_id = s.id;
          req.user.school = schoolPayload;
          if (!req.session.school_id) req.session.school_id = s.id;
          if (!req.session.user) req.session.user = {};
          req.session.user.school_id = s.id;
          req.session.user.school = schoolPayload;
        }
      }
    } else {
      req.session.destroy(() => { });
    }
  } catch (e) {
    console.error('[session hydration]', e.message);
  }
  next();
});

// ── Block mutating API calls for non–Super Admin when global flag is on ──
app.use(async (req, res, next) => {
  const url = (req.originalUrl || req.url || '').split('?')[0];
  if (!url.startsWith('/api/')) return next();
  const skip = [
    '/api/auth/login',
    '/api/auth/signup-super-admin',
    '/api/auth/signup-full-system-controller',
    '/api/auth/system-config/public',
    '/api/session/logout',
    '/api/teacher-portal',
  ];
  if (skip.some(s => url.startsWith(s))) return next();
  try {
    const settings = await systemSettings.getSettings();
    if (!settings.block_non_super_writes) return next();
    const method = (req.method || 'GET').toUpperCase();
    if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') return next();
    const role = req.user?.role_code || req.session?.roleCode;
    if (role && isElevatedPlatformRole(role)) return next();
    return res.status(503).json({
      success: false,
      code: 'SYSTEM_ACTIONS_DISABLED',
      message: 'System changes are temporarily disabled for users who are not Super Admin or Full System Controller.',
    });
  } catch (e) {
    console.error('[block_non_super_writes]', e.message);
  }
  next();
});

function requireAuth(req, res, allowedRoles = []) {
  if (!req.user) {
    res.status(401).json({ success: false, message: 'Not authenticated — please log in' });
    return false;
  }
  if (allowedRoles.length > 0 && !allowedRoles.includes(req.user.role_code)) {
    res.status(403).json({ success: false, message: 'Access denied for your role' });
    return false;
  }
  return true;
}
app.set('requireAuth', requireAuth);

// ============================================================
// GLOBAL MULTER PASS-THROUGH
// ─────────────────────────────────────────────────────────────
// Routes that manage their OWN multer instances must be listed
// in the exclusion array below so the global handler doesn't
// intercept their multipart uploads first.
//
// Excluded:  /api/babyeyi   /api/fee-limits   /api/schools
//            /api/mini-websites               /api/admissions
//            /api/public/schools              /api/requirement-prices
// ============================================================
const globalUpload = multer({
  storage: multer.diskStorage({
    destination(_req, _file, cb) {
      const dest = 'uploads/temp/';
      if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
      cb(null, dest);
    },
    filename(_req, file, cb) {
      const ext = path.extname(file.originalname);
      const base = path.basename(file.originalname, ext).replace(/\s+/g, '-');
      cb(null, `${base}-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024, fields: 20, files: 5 },
  fileFilter(_req, file, cb) {
    ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf']
      .includes(file.mimetype) ? cb(null, true) : cb(new Error(`File type not allowed: ${file.mimetype}`));
  },
});

// ── Paths whose routes handle their own multer ────────────────
const MULTER_SELF_MANAGED = [
  '/api/babyeyi',
  '/api/fee-limits',
  '/api/schools',
  '/api/mini-websites',   // mini-website routes use their own multer
  '/api/admissions',      // admission routes use their own multer
  '/api/public/schools',  // public school registration handles its own multer
  '/api/auth',            // auth profile photo upload uses its own multer
  '/api/students',        // students import handles its own multer
  '/api/requirement-prices', // Super Admin catalog images (requirementPrice.js multer)
  '/api/student-services',   // service icons (studentServicesRoutes.js multer)
  '/api/school/staff',       // staff hire with optional photo upload
];

app.use((req, res, next) => {
  const ct = req.headers['content-type'] || '';
  if (!ct.includes('multipart/form-data')) return next();
  if (MULTER_SELF_MANAGED.some(p => req.originalUrl.startsWith(p))) return next();
  globalUpload.any()(req, res, err => {
    if (err) return res.status(400).json({ success: false, message: err.message });
    next();
  });
});

// ============================================================
// SESSION ENDPOINTS
// ============================================================
async function resolveSchoolForSession(userId) {
  try {
    const [rows] = await promisePool.query(
      `SELECT id, school_name, school_code, email, phone, district, province,
              status AS school_record_status,
              school_status AS school_access_status,
              subscription_plan, pro_enabled, pro_start_date, pro_end_date
       FROM schools
       WHERE manager_user_id = ?
         AND (deleted_at IS NULL AND (status IS NULL OR status = 'active'))
       LIMIT 1`,
      [userId]
    );
    if (rows && rows.length > 0) {
      const s = rows[0];
      const pro_access_effective = computeProAccessEffective({
        subscription_plan: s.subscription_plan,
        pro_enabled: s.pro_enabled,
        pro_end_date: s.pro_end_date,
      });
      let modules = {};
      try {
        modules = await loadSchoolModules(promisePool, s.id);
      } catch (_) {}
      return {
        id: s.id,
        name: s.school_name,
        code: s.school_code,
        email: s.email || null,
        phone: s.phone || null,
        district: s.district || null,
        province: s.province || null,
        school_record_status: s.school_record_status ?? null,
        school_access_status: s.school_access_status || 'active',
        subscription_plan: s.subscription_plan || 'lite',
        pro_enabled: Number(s.pro_enabled) === 1,
        pro_start_date: s.pro_start_date || null,
        pro_end_date: s.pro_end_date || null,
        pro_access_effective,
        modules,
      };
    }
  } catch (e) {
    console.error('[session/me] resolveSchool:', e.message);
  }
  return null;
}

app.get('/api/session/me', async (req, res) => {
  try {
    if (req.session?.user) {
      const data = { ...req.session.user };
      // Prefer fresh photo from DB (req.user) so profile upload shows immediately after refresh
      if (req.user && req.user.photo != null) {
        data.photo = req.user.photo;
      }
      const roleCode = (data.role?.code || data.role_code || '').toUpperCase();
      const isSchoolManager = roleCode === 'SCHOOL_ADMIN' || roleCode === 'SCHOOL_MANAGER';
      if (isSchoolManager && !data.school_id && !data.school?.id && req.session.userId) {
        const school = await resolveSchoolForSession(req.session.userId);
        if (school) {
          data.school = school;
          data.school_id = school.id;
          req.session.school_id = school.id;
          req.session.user = { ...req.session.user, school, school_id: school.id };
        }
      }
      if (!data.school && (req.session.school_id || data.school_id)) {
        const sid = req.session.school_id || data.school_id;
        data.school_id = sid;
        data.school = { id: sid, name: null, code: null };
      }
      if (data.school && !data.school_id) data.school_id = data.school.id;
      if (roleCode === 'AGENT' && req.session.userId) {
        try {
          const agent = await getAgentSessionPayload(req.session.userId);
          data.agent = agent;
          req.session.user = { ...req.session.user, agent };
        } catch (e) {
          console.error('[session/me] agent refresh:', e.message);
        }
      }
      return res.json({ success: true, data });
    }

    if (req.user) {
      const schoolId = req.user.school_id || req.session?.school_id;
      let school = req.user.school || (schoolId ? { id: schoolId, name: null, code: null } : null);
      const roleCode = (req.user.role_code || '').toUpperCase();
      if ((roleCode === 'SCHOOL_ADMIN' || roleCode === 'SCHOOL_MANAGER') && !school?.id && req.session?.userId) {
        const resolved = await resolveSchoolForSession(req.session.userId);
        if (resolved) school = resolved;
      }
      let agent = null;
      if (roleCode === 'AGENT' && req.user.id) {
        try {
          agent = await getAgentSessionPayload(req.user.id);
        } catch (e) {
          console.error('[session/me] agent refresh (req.user):', e.message);
        }
      }
      return res.json({
        success: true,
        data: {
          id: req.user.id,
          user_uid: req.user.user_uid,
          email: req.user.email,
          first_name: req.user.first_name,
          last_name: req.user.last_name,
          full_name: `${req.user.first_name} ${req.user.last_name}`,
          photo: req.user.photo || null,
          role: { code: req.user.role_code, name: req.user.role_name },
          district: req.user.district || null,
          province: req.user.province || null,
          sector: req.user.sector || null,
          school,
          school_id: school?.id || schoolId || null,
          force_password_change: !!req.user.force_password_change,
          agent,
        },
      });
    }

    return res.json({ success: true, data: null });
  } catch (err) {
    console.error('[session/me]', err);
    return res.status(500).json({ success: false, message: 'Session error' });
  }
});

app.post('/api/session/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) return res.status(500).json({ success: false, message: 'Logout failed' });
    res.clearCookie('babyeyi_sid');
    res.json({ success: true, message: 'Logged out successfully' });
  });
});

// ============================================================
// HEALTH / ROOT
// ============================================================
app.get('/', (_req, res) => res.json({
  success: true, service: 'Babyeyi API Server', version: '2.3.0',
  auth: 'Cookie sessions (httpOnly babyeyi_sid)',
  routes: {
    auth: '/api/auth/*',
    session: 'GET /api/session/me  |  POST /api/session/logout',
    babyeyi: '/api/babyeyi/*',
    feeLimits: '/api/fee-limits/*',
    locations: '/api/locations/*',
    miniWebsites: '/api/mini-websites/*',
    admissions: '/api/admissions/*',   // ← NEW v2.3
  },
}));

app.get('/api/health', (_req, res) => res.json({
  success: true, status: 'OK', uptime: `${Math.floor(process.uptime())}s`,
  warnings: [
    ...(!process.env.SESSION_SECRET ? ['SESSION_SECRET not set'] : []),
    ...(!process.env.BABYEYI_HASH_SECRET ? ['BABYEYI_HASH_SECRET not set'] : []),
  ],
}));

// ============================================================
// ROUTE IMPORTS
// ============================================================
console.log('\n🔗  Importing routes…\n');

const authRoute = require('./authPages/auth');
console.log('  ✅  auth.js');

const babyeyiDeoRoute = require('./BabyeyiRoutes/babyeyi-deo');
console.log('  ✅  babyeyi-deo.js');

const babyeyiRoute = require('./BabyeyiRoutes/babyeyi');
console.log('  ✅  babyeyi.js');

const babyeyiHashPatch = require('./BabyeyiRoutes/babyeyi-hash-patch');
console.log('  ✅  babyeyi-hash-patch.js');

const feeLimitsRoute = require('./BabyeyiRoutes/Fee_limits');
console.log('  ✅  feeLimits.js');

const schoolAddRoutes = require('./BabyeyiRoutes/school-add');
const publicSchoolRegistrationRoutes = require('./BabyeyiRoutes/publicSchoolRegistration');
const districtBabyeyi = require('./BabyeyiRoutes/DistrictBabyeyi');
const nesaBabyeyi = require('./BabyeyiRoutes/nesaBabyeyi');

// ── mini-website routes ───────────────────────────────────────
const miniWebsiteRoutes = require('./BabyeyiRoutes/miniWebsites');
console.log('  ✅  miniWebsites.js');

// ── NEW v2.3: admission routes ────────────────────────────────
const admissionRoutes = require('./BabyeyiRoutes/admissionRoutes');
console.log('  ✅  admissionRoutes.js');

// ── Requirement prices (Super Admin) ──────────────────────────
const requirementPriceRoutes = require('./BabyeyiRoutes/requirementPrice');
console.log('  ✅  requirementPrice.js');
const publicBabyeyiPayRoutes = require('./BabyeyiRoutes/publicBabyeyiPay');
console.log('  ✅  publicBabyeyiPay.js');

const momoRoutes = require('./BabyeyiRoutes/momoRoutes');
console.log('  ✅  momoRoutes.js');

const publicPaySchoolFlowRoutes = require('./BabyeyiRoutes/publicPaySchoolFlow');
console.log('  ✅  publicPaySchoolFlow.js');
const studentRoutes = require('./BabyeyiRoutes/students');
console.log('  ✅  students.js');
const schoolStaffRoutes = require('./BabyeyiRoutes/schoolStaff');
console.log('  ✅  schoolStaff.js');
const accountantFeesRoutes = require('./BabyeyiRoutes/accountantFees');
console.log('  ✅  accountantFees.js');
const disciplineRoutes = require('./BabyeyiRoutes/discipline');
console.log('  ✅  discipline.js');
const dosAcademicRoutes = require('./BabyeyiRoutes/dosAcademic');
console.log('  ✅  dosAcademic.js');
const studentTransferRoutes = require('./BabyeyiRoutes/studentTransfer');
const notificationsHubRoutes = require('./BabyeyiRoutes/notificationsHub');
console.log('  ✅  studentTransfer.js');
console.log('  ✅  notificationsHub.js');
const parentPortalRoutes     = require('./BabyeyiRoutes/parentPortal');
const schoolClassesRouter    = require('./BabyeyiRoutes/schoolClasses');
const studentPermissionsRoutes = require('./BabyeyiRoutes/studentPermissions');
console.log('  ✅  parentPortal.js');
console.log('  ✅  schoolClasses.js');
console.log('  ✅  studentPermissions.js');
// ─────────────────────────────────────────────────────────────

let locationRoutes = null;
try {
  locationRoutes = require('./locationsRoutes/locationRoutes');
  console.log('  ✅  locationRoutes.js');
} catch (e) {
  console.warn(`  ⚠️   locationRoutes.js not found — run: npm install rwanda`);
}

console.log('\n✅  All imports done\n');

// ============================================================
// ROUTE MOUNTING
// ============================================================
console.log('🔗  Mounting routes…\n');

app.get('/debug-ping', (req, res) => res.send('pong-v1'));


app.use('/api/auth', authRoute);
app.use('/api/notifications', notificationsHubRoutes);
app.use('/api/babyeyi', babyeyiDeoRoute);   // DEO-specific paths FIRST
app.use('/api/babyeyi', babyeyiRoute);       // broad CRUD + verify
app.use('/api/babyeyi', babyeyiHashPatch);   // verify fallback
app.use('/api/fee-limits', feeLimitsRoute);
app.use('/api/public/schools', publicSchoolRegistrationRoutes);
console.log('  ✅  /api/public/schools/*');
app.use('/api/district/babyeyi', districtBabyeyi);
app.use('/api/nesa/babyeyi', nesaBabyeyi);

// ── mini-website routes ───────────────────────────────────────
app.use('/api/mini-websites', miniWebsiteRoutes);
console.log('  ✅  /api/mini-websites/*');

// ── NEW v2.3: admission routes ────────────────────────────────
app.use('/api/admissions', admissionRoutes);
console.log('  ✅  /api/admissions/*');

// ── Requirement prices (Super Admin) ─────────────────────────
app.use('/api/requirement-prices', requirementPriceRoutes);
console.log('  ✅  /api/requirement-prices/*');
const studentServicesRoutes = require('./BabyeyiRoutes/studentServicesRoutes');
app.use('/api/student-services', studentServicesRoutes);
console.log('  ✅  /api/student-services/*');
app.use('/api/public/babyeyi-pay', publicBabyeyiPayRoutes);
console.log('  ✅  /api/public/babyeyi-pay/*');

const fieldAgentsModule = require('./BabyeyiRoutes/fieldAgentsRoutes');
app.use('/api/field-agents', fieldAgentsModule.adminRouter);
app.use('/api/agent', fieldAgentsModule.agentRouter);
console.log('  ✅  /api/field-agents/*  |  /api/agent/*');
fieldAgentsModule.ensureAgentRole().catch(() => { });
fieldAgentsModule.ensureProfileTable().catch(() => { });

app.use('/api/momo', momoRoutes);
console.log('  ✅  /api/momo/*');

app.use('/api/public/public-pay', publicPaySchoolFlowRoutes);
console.log('  ✅  /api/public/public-pay/*');
// Parent portal MUST be registered before the alias mount below, otherwise
// POST /api/parent-portal/public/babyeyi-finder/student-lookup is swallowed by
// the babyeyi-pay router (no POST /student-lookup there) → 404.
app.use('/api/dos', (req, res, next) => {
  console.log(`📡 [SERVER] Request to /api/dos hit server.js: ${req.method} ${req.path}`);
  next();
}, dosAcademicRoutes);
console.log('  ✅  /api/dos/* (priority mount)');

app.use('/api', parentPortalRoutes);

console.log('  ✅  /api/parent-portal/* (early — before babyeyi-finder alias)');
// Same router — parent-facing URL for Babyeyi Finder guest pay (pricing + intent)
app.use('/api/parent-portal/public/babyeyi-finder', publicBabyeyiPayRoutes);
console.log('  ✅  /api/parent-portal/public/babyeyi-finder/*');
// ── Students (School Manager) ────────────────────────────────
app.use('/api', studentRoutes);
console.log('  ✅  /api/students/*');
app.use('/api', schoolStaffRoutes);
console.log('  ✅  /api/school/staff/*');
app.use('/api', accountantFeesRoutes);
console.log('  ✅  /api/accountant/*');
app.use('/api', disciplineRoutes);
console.log('  ✅  /api/discipline/*');
app.use('/api', schoolClassesRouter);
console.log('  ✅  /api/schools/:id/classes/*');

const teacherPortalRoutes = require('./BabyeyiRoutes/teacherPortal');
app.use('/api/teacher-portal', teacherPortalRoutes);
console.log('  ✅  /api/teacher-portal/*');

const iotAttendanceRoutes = require('./BabyeyiRoutes/iotAttendance');
app.use('/api/iot', iotAttendanceRoutes);
console.log('  ✅  /api/iot/*');

app.use('/api', studentPermissionsRoutes);
console.log('  ✅  /api/permissions/*');
app.use('/api', studentTransferRoutes);
// parentPortalRoutes mounted earlier (before /api/parent-portal/public/babyeyi-finder alias)
// ─────────────────────────────────────────────────────────────

if (locationRoutes) {
  app.use('/api/locations', locationRoutes);
  console.log('  ✅  /api/locations/*');
} else {
  app.use('/api/locations', (_req, res) =>
    res.status(503).json({ success: false, message: 'Location service unavailable — npm install rwanda' })
  );
}

// Keep this after /api/locations to avoid route shadowing
app.use('/api', schoolAddRoutes);

console.log('✅  All routes mounted\n');

// ============================================================
// 404
// ============================================================
app.use((req, res) => {
  res.status(404).json({
    success: false, message: 'Route not found (TRACER-DOS-DEBUG)',
    method: req.method, path: req.originalUrl,
    hint: 'GET / for available endpoints',
  });
});

// ============================================================
// GLOBAL ERROR HANDLER
// ============================================================
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error('❌  Global error:', err.message);
  if (err.code === 'LIMIT_FILE_SIZE') return res.status(400).json({ success: false, message: 'File too large' });
  if (err.code === 'LIMIT_UNEXPECTED_FILE') return res.status(400).json({ success: false, message: `Unexpected field: ${err.field}` });
  res.status(err.status || 500).json({
    success: false, message: err.message || 'Internal Server Error',
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });
});

// ============================================================
// SERVER START
// ============================================================
const startServer = async () => {
  try {
    console.log('🔄  Testing database connection…');
    const connected = await testConnection();
    if (!connected) { console.error('❌  DB connection failed'); process.exit(1); }
    console.log('✅  Database connected\n');

    await ensureFullSystemControllerRole();

    app.listen(PORT, () => {
      console.log(`
╔══════════════════════════════════════════════════════════════╗
║            BABYEYI API SERVER  v2.3.0                       ║
╠══════════════════════════════════════════════════════════════╣
║  🚀  http://localhost:${String(PORT).padEnd(37)}║
║  🌍  ${(process.env.NODE_ENV || 'development').padEnd(45)}║
║  🍪  Session: httpOnly babyeyi_sid cookie                   ║
║  🔐  HMAC: ${(process.env.BABYEYI_HASH_SECRET ? 'secret loaded ✓' : '⚠️  NOT SET').padEnd(41)}║
╠══════════════════════════════════════════════════════════════╣
║  KEY ENDPOINTS                                              ║
║  POST /api/auth/login              → sets session cookie    ║
║  GET  /api/session/me              → current user (id+role) ║
║  POST /api/session/logout          → clears cookie          ║
║  POST /api/auth/signup-super-admin → first-time SA setup    ║
║  POST /api/auth/create-school      → create school (SA)     ║
║  POST /api/auth/create-nesa-admin  → create NESA admin (SA) ║
║  POST /api/auth/create-deo         → create DEO admin (SA)  ║
║  GET  /api/mini-websites           → school website list    ║
║  GET  /api/mini-websites/school/:id→ wizard loader          ║
║  POST /api/mini-websites           → create mini-website    ║
║  PUT  /api/mini-websites/:id       → update mini-website    ║
║  PATCH /api/mini-websites/:id/publish → publish             ║
║  GET  /api/admissions/school/:id   → get admission form     ║
║  POST /api/admissions/school/:id   → create/update form     ║
║  GET  /api/admissions/slug/:slug   → public form by slug    ║
║  POST /api/admissions/forms/:id/apply → submit application  ║
╚══════════════════════════════════════════════════════════════╝`);
    });
  } catch (err) {
    console.error('❌  Failed to start:', err.message);
    process.exit(1);
  }
};

process.on('SIGINT', () => { console.log('\n👋  Shutting down…'); process.exit(0); });
process.on('SIGTERM', () => { console.log('\n👋  Shutting down…'); process.exit(0); });
process.on('unhandledRejection', reason => console.error('❌  Unhandled rejection:', reason));
process.on('uncaughtException', err => { console.error('❌  Uncaught exception:', err.message); process.exit(1); });

startServer();
module.exports = app;