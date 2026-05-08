'use strict';

// ================================================================
// server.js  —  Babyeyi + Auth Standalone Server  v2.3.1
//
// 🔧 FIX v2.3.1 — Two production bugs fixed:
//
//   1. sameSite: 'strict' → 'lax'
//      With SameSite=Strict the browser strips the session cookie on
//      EVERY top-level navigation (window.location.assign, <a href>).
//      Login set the cookie fine, but the very next page load to
//      /school-babyeyi-dashboard arrived with NO cookie → session/me
//      returned {"success":true,"data":null} (28 bytes) → ProtectedRoute
//      sent the user back to /login. Lax fixes this while still
//      blocking cross-site POST (CSRF protection preserved).
//
//   2. Cache-Control: no-store on /api/session/me
//      Browser was caching a 304 Not-Modified unauthenticated response
//      for session/me, so after login the dashboard received stale
//      "not logged in" data instead of the fresh session.
// ================================================================

const express           = require('express');
const cors              = require('cors');
const helmet            = require('helmet');
const compression       = require('compression');
const morgan            = require('morgan');
const rateLimit         = require('express-rate-limit');
const session           = require('express-session');
const cookieParser      = require('cookie-parser');
const MySQLStoreFactory = require('express-mysql-session')(session);
const multer            = require('multer');
const path              = require('path');
const fs                = require('fs');
require('dotenv').config();

const { testConnection, promisePool } = require('./config/database');

const app  = express();
const PORT = process.env.PORT || 8080;


// ============================================================
// UPLOAD DIRECTORIES
// ============================================================
[
  'uploads/babyeyi',
  'uploads/babyeyi/deo',
  'uploads/babyeyi/qrcodes',
  'uploads/babyeyi/pdfs',
  'uploads/fee-limits',
  'uploads/mini-websites',
  'uploads/admission-files',
  'uploads/profile-photos',
  'uploads/staff-identity-photos',
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
  console.warn(`   SESSION_SECRET=${process.env.SESSION_SECRET}`);
}
if (!process.env.BABYEYI_HASH_SECRET) {
  console.warn('⚠️  BABYEYI_HASH_SECRET not set — QR hashes using insecure default!');
}

// ============================================================
// SESSION STORE
// ============================================================
const sessionStore = new MySQLStoreFactory({
  host:                    process.env.DB_HOST     || 'localhost',
  port:          parseInt( process.env.DB_PORT     || '3306'),
  user:                    process.env.DB_USER     || 'root',
  password:                process.env.DB_PASSWORD || '',
  database:                process.env.DB_NAME     || 'school_db',
  createDatabaseTable:     true,
  clearExpired:            true,
  checkExpirationInterval: 15 * 60 * 1000,
  expiration:               8 * 60 * 60 * 1000,
  endConnectionOnClose:    false,
  schema: {
    tableName:   'app_sessions',
    columnNames: { session_id: 'session_id', expires: 'expires', data: 'data' },
  },
});

sessionStore.onReady()
  .then(() => console.log('✅  Session store (MySQL) ready'))
  .catch(err => console.error('❌  Session store failed:', err.message));

// ============================================================
// GLOBAL MIDDLEWARE
// ============================================================
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));

const getAllowedOrigins = () => {
  const envVal = process.env.FRONTEND_URL;
  if (process.env.NODE_ENV !== 'production') return true;
  if (!envVal) return false;
  const list = envVal.split(',').map(s => s.trim()).filter(Boolean);
  return list.length === 1 ? list[0] : list;
};

app.use(cors({
  origin:         getAllowedOrigins(),
  credentials:    true,
  methods:        ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));

app.use(cookieParser(process.env.SESSION_SECRET || 'babyeyi-default-secret'));

// ── Session ────────────────────────────────────────────────────
// ✅ FIX 1: sameSite is always 'lax' — never 'strict'
app.use(session({
  name:              'babyeyi_sid',
  secret:            process.env.SESSION_SECRET || 'babyeyi-default-secret',
  store:             sessionStore,
  resave:            false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'lax',   // ✅ FIXED: was 'strict' — strict blocks cookie on location.assign()
    maxAge:   8 * 60 * 60 * 1000,
  },
}));

const jsonParser = express.json({ limit: '10mb' });
const urlencodedParser = express.urlencoded({ extended: true, limit: '10mb' });
app.use((req, res, next) => {
  const ct = String(req.headers['content-type'] || '').toLowerCase();
  if (ct.includes('multipart/form-data')) return next();
  return jsonParser(req, res, next);
});
app.use((req, res, next) => {
  const ct = String(req.headers['content-type'] || '').toLowerCase();
  if (ct.includes('multipart/form-data')) return next();
  return urlencodedParser(req, res, next);
});

app.get('/uploads/profile-photos/:filename', (req, res) => {
  const filename = req.params.filename;
  if (!filename || !/^[a-zA-Z0-9._-]+$/.test(filename)) return res.status(400).end();
  const primary = path.join(__dirname, 'uploads', 'profile-photos', filename);
  const legacy  = path.join(__dirname, '..', 'uploads', 'profile-photos', filename);
  if (fs.existsSync(primary)) return res.sendFile(primary);
  if (fs.existsSync(legacy))  return res.sendFile(legacy);
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
app.use('/api/', rateLimit({
  windowMs: 15 * 60 * 1000, max: 300,
  standardHeaders: true, legacyHeaders: false,
  message: { success: false, message: 'Too many requests — please slow down' },
  skip: req => {
    const p = (req.originalUrl || req.url || '').split('?')[0];
    return p.endsWith('/session/me') || p.endsWith('/district/babyeyi/me');
  },
}));

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
              u.school_id, u.force_password_change,
              r.role_code, r.role_name, r.permissions
       FROM users u
       JOIN roles r ON u.role_id = r.id
       WHERE u.id = ? AND u.deleted_at IS NULL
       LIMIT 1`,
      [req.session.userId]
    );
    if (rows.length > 0 && rows[0].is_active) {
      req.user = rows[0];
      const roleCode        = (req.user.role_code || '').toUpperCase();
      const isSchoolManager = roleCode === 'SCHOOL_ADMIN' || roleCode === 'SCHOOL_MANAGER';
      if (isSchoolManager && !req.user.school_id) {
        let schoolRows = [];
        try {
          [schoolRows] = await promisePool.query(
            `SELECT id, school_name, school_code, email, phone, district, province
             FROM schools
             WHERE manager_user_id = ?
               AND deleted_at IS NULL
               AND (status IS NULL OR status = 'active')
             LIMIT 1`,
            [req.session.userId]
          );
        } catch (_) { schoolRows = []; }
        if (schoolRows.length > 0 && schoolRows[0].id) {
          const s = schoolRows[0];
          req.user.school_id = s.id;
          req.user.school    = { id: s.id, name: s.school_name, code: s.school_code,
                                 email: s.email || null, phone: s.phone || null,
                                 district: s.district || null, province: s.province || null };
          if (!req.session.school_id) req.session.school_id = s.id;
          if (!req.session.user) req.session.user = {};
          req.session.user.school_id = s.id;
          req.session.user.school    = req.user.school;
        }
      }
    } else {
      req.session.destroy(() => {});
    }
  } catch (e) {
    console.error('[session hydration]', e.message);
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
// ============================================================
const globalUpload = multer({
  storage: multer.diskStorage({
    destination(_req, _file, cb) {
      const dest = 'uploads/temp/';
      if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
      cb(null, dest);
    },
    filename(_req, file, cb) {
      const ext  = path.extname(file.originalname);
      const base = path.basename(file.originalname, ext).replace(/\s+/g, '-');
      cb(null, `${base}-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
    },
  }),
  limits:     { fileSize: 5 * 1024 * 1024, fields: 20, files: 5 },
  fileFilter: (_req, file, cb) => {
    ['image/jpeg','image/jpg','image/png','image/webp','application/pdf'].includes(file.mimetype)
      ? cb(null, true) : cb(new Error(`File type not allowed: ${file.mimetype}`));
  },
});

const MULTER_SELF_MANAGED = [
  '/api/babyeyi', '/api/fee-limits', '/api/schools',
  '/api/mini-websites', '/api/admissions', '/api/public/schools',
  '/api/auth', '/api/students',
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
      `SELECT id, school_name, school_code, email, phone, district, province
       FROM schools
       WHERE manager_user_id = ?
         AND deleted_at IS NULL
         AND (status IS NULL OR status = 'active')
       LIMIT 1`,
      [userId]
    );
    if (rows.length > 0) {
      const s = rows[0];
      return { id: s.id, name: s.school_name, code: s.school_code,
               email: s.email || null, phone: s.phone || null,
               district: s.district || null, province: s.province || null };
    }
  } catch (e) {
    console.error('[session/me] resolveSchool:', e.message);
  }
  return null;
}

// ✅ FIX 2: No-cache headers on /api/session/me
app.get('/api/session/me', async (req, res) => {
  res.set({
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
    'Pragma':        'no-cache',
    'Expires':       '0',
  });

  try {
    if (req.session?.user) {
      const data = { ...req.session.user };
      if (req.user?.photo != null) data.photo = req.user.photo;

      const roleCode        = (data.role?.code || data.role_code || '').toUpperCase();
      const isSchoolManager = roleCode === 'SCHOOL_ADMIN' || roleCode === 'SCHOOL_MANAGER';
      if (isSchoolManager && !data.school_id && !data.school?.id && req.session.userId) {
        const school = await resolveSchoolForSession(req.session.userId);
        if (school) {
          data.school = school; data.school_id = school.id;
          req.session.school_id = school.id;
          req.session.user = { ...req.session.user, school, school_id: school.id };
        }
      }
      if (!data.school && (req.session.school_id || data.school_id)) {
        const sid  = req.session.school_id || data.school_id;
        data.school_id = sid;
        data.school    = { id: sid, name: null, code: null };
      }
      if (data.school && !data.school_id) data.school_id = data.school.id;
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
      return res.json({
        success: true,
        data: {
          id: req.user.id, user_uid: req.user.user_uid,
          email: req.user.email,
          first_name: req.user.first_name, last_name: req.user.last_name,
          full_name:  `${req.user.first_name} ${req.user.last_name}`,
          photo:      req.user.photo || null,
          role:       { code: req.user.role_code, name: req.user.role_name },
          district:   req.user.district || null, province: req.user.province || null,
          sector:     req.user.sector   || null,
          school, school_id: school?.id || schoolId || null,
          force_password_change: !!req.user.force_password_change,
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
  success: true, service: 'Babyeyi API Server', version: '2.3.1',
  auth: 'Cookie sessions (httpOnly babyeyi_sid, SameSite=Lax)',
}));

app.get('/api/health', (_req, res) => res.json({
  success: true, status: 'OK', uptime: `${Math.floor(process.uptime())}s`,
  cookie_sameSite: 'lax',
  warnings: [
    ...(!process.env.SESSION_SECRET      ? ['SESSION_SECRET not set']      : []),
    ...(!process.env.BABYEYI_HASH_SECRET ? ['BABYEYI_HASH_SECRET not set'] : []),
  ],
}));

// ============================================================
// ROUTE IMPORTS
// ============================================================
console.log('\n🔗  Importing routes…\n');
const authRoute              = require('./authPages/auth');                        console.log('  ✅  auth.js');
const babyeyiDeoRoute        = require('./BabyeyiRoutes/babyeyi-deo');             console.log('  ✅  babyeyi-deo.js');
const babyeyiRoute           = require('./BabyeyiRoutes/babyeyi');                 console.log('  ✅  babyeyi.js');
const babyeyiHashPatch       = require('./BabyeyiRoutes/babyeyi-hash-patch');      console.log('  ✅  babyeyi-hash-patch.js');
const feeLimitsRoute         = require('./BabyeyiRoutes/Fee_limits');              console.log('  ✅  feeLimits.js');
const schoolAddRoutes        = require('./BabyeyiRoutes/school-add');
const publicSchoolRegRoutes  = require('./BabyeyiRoutes/publicSchoolRegistration');
const districtBabyeyi        = require('./BabyeyiRoutes/DistrictBabyeyi');
const nesaBabyeyi            = require('./BabyeyiRoutes/nesaBabyeyi');
const miniWebsiteRoutes      = require('./BabyeyiRoutes/miniWebsites');            console.log('  ✅  miniWebsites.js');
const admissionRoutes        = require('./BabyeyiRoutes/admissionRoutes');         console.log('  ✅  admissionRoutes.js');
const requirementPriceRoutes = require('./BabyeyiRoutes/requirementPrice');        console.log('  ✅  requirementPrice.js');
const studentRoutes          = require('./BabyeyiRoutes/students');                console.log('  ✅  students.js');
const parentPortalRoutes     = require('./BabyeyiRoutes/parentPortal');             console.log('  ✅  parentPortal.js');
const fieldAgentsModule      = require('./BabyeyiRoutes/fieldAgentsRoutes');        console.log('  ✅  fieldAgentsRoutes.js');
const classkitShareRoutes    = require('./BabyeyiRoutes/classkitShareRoutes');       console.log('  ✅  classkitShareRoutes.js');

let locationRoutes = null;
try {
  locationRoutes = require('./locationsRoutes/locationRoutes');
  console.log('  ✅  locationRoutes.js');
} catch (e) {
  console.warn('  ⚠️   locationRoutes.js not found — run: npm install rwanda');
}
console.log('\n✅  All imports done\n');

// ============================================================
// ROUTE MOUNTING
// ============================================================
console.log('🔗  Mounting routes…\n');
app.use('/api/auth',               authRoute);
app.use('/api/babyeyi',            babyeyiDeoRoute);
app.use('/api/babyeyi',            babyeyiRoute);
app.use('/api/babyeyi',            babyeyiHashPatch);
app.use('/api/fee-limits',         feeLimitsRoute);
app.use('/api/public/schools',     publicSchoolRegRoutes);   console.log('  ✅  /api/public/schools/*');
app.use('/api/district/babyeyi',   districtBabyeyi);
app.use('/api/nesa/babyeyi',       nesaBabyeyi);
app.use('/api/mini-websites',      miniWebsiteRoutes);       console.log('  ✅  /api/mini-websites/*');
app.use('/api/admissions',         admissionRoutes);         console.log('  ✅  /api/admissions/*');
app.use('/api/requirement-prices', requirementPriceRoutes);  console.log('  ✅  /api/requirement-prices/*');
app.use('/api/field-agents',       fieldAgentsModule.adminRouter);
app.use('/api/agent',              fieldAgentsModule.agentRouter);
app.use('/api/public/agents',      fieldAgentsModule.publicRouter); console.log('  ✅  /api/field-agents/* | /api/agent/* | /api/public/agents/*');
fieldAgentsModule.ensureAgentRole().catch(() => {});
fieldAgentsModule.ensureProfileTable().catch(() => {});
app.use('/api',                    studentRoutes);           console.log('  ✅  /api/students/*');
app.use('/api',                    parentPortalRoutes);      console.log('  ✅  /api/parent-portal/*');
app.use('/api/public/classkit-share', classkitShareRoutes);  console.log('  ✅  /api/public/classkit-share/*');

if (locationRoutes) {
  app.use('/api/locations', locationRoutes); console.log('  ✅  /api/locations/*');
} else {
  app.use('/api/locations', (_req, res) =>
    res.status(503).json({ success: false, message: 'Location service unavailable' })
  );
}
app.use('/api', schoolAddRoutes);
console.log('✅  All routes mounted\n');

// ============================================================
// 404 + GLOBAL ERROR HANDLER
// ============================================================
app.use((req, res) => res.status(404).json({
  success: false, message: 'Route not found',
  method: req.method, path: req.originalUrl,
}));

// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error('❌  Global error:', err.message);
  if (err.code === 'LIMIT_FILE_SIZE')       return res.status(400).json({ success: false, message: 'File too large' });
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
    app.listen(PORT, '0.0.0.0',() => {
      console.log(`
╔══════════════════════════════════════════════════════════════╗
║            BABYEYI API SERVER  v2.3.1                       ║
╠══════════════════════════════════════════════════════════════╣
║  🚀  http://localhost:${String(PORT).padEnd(37)}║
║  🌍  ${(process.env.NODE_ENV || 'development').padEnd(45)}║
║  🍪  Session: httpOnly babyeyi_sid (SameSite=Lax ✅)        ║
║  🔐  HMAC: ${(process.env.BABYEYI_HASH_SECRET ? 'secret loaded ✓' : '⚠️  NOT SET').padEnd(41)}║
╚══════════════════════════════════════════════════════════════╝`);
    });
  } catch (err) {
    console.error('❌  Failed to start:', err.message);
    process.exit(1);
  }
};

process.on('SIGINT',             () => { console.log('\n👋  Shutting down…'); process.exit(0); });
process.on('SIGTERM',            () => { console.log('\n👋  Shutting down…'); process.exit(0); });
process.on('unhandledRejection', reason => console.error('❌  Unhandled rejection:', reason));
process.on('uncaughtException',  err    => { console.error('❌  Uncaught exception:', err.message); process.exit(1); });

startServer();
module.exports = app;