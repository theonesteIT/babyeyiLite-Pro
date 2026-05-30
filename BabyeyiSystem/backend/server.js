'use strict';

// ================================================================
// server.js  —  Babyeyi + Auth Standalone Server  v2.3
// ================================================================

const express        = require('express');
const cors           = require('cors');
const helmet         = require('helmet');
const compression    = require('compression');
const morgan         = require('morgan');
const pinoHttp       = require('pino-http');
const rateLimit      = require('express-rate-limit');
const session        = require('express-session');
const cookieParser   = require('cookie-parser');
const MySQLStoreFactory = require('express-mysql-session')(session);
const multer         = require('multer');
const path           = require('path');
const fs             = require('fs');
const http           = require('http');
const { Server }     = require('socket.io');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const { testConnection, promisePool } = require('./config/database');
const { validateEnvironment } = require('./config/env.js');
const logger = require('./utils/logger');
const requestContext = require('./middleware/requestContext');
const { metricsMiddleware, metricsHandler } = require('./middleware/metrics');
const { computeProAccessEffective, loadSchoolModules } = require('./utils/schoolSubscription');
const systemSettings = require('./utils/systemSettings');
const { ensureFullSystemControllerRole } = require('./utils/ensureRoles');
const shuleAvanceOrgPortalRoutes = require('./BabyeyiRoutes/shuleAvanceOrgPortal');
const { getAgentSessionPayload } = require('./BabyeyiRoutes/fieldAgentsRoutes');
const chatModule = require('./BabyeyiRoutes/chatRoutes');
const { platformActivityMiddleware } = require('./middleware/platformActivityMiddleware');
const { logPlatformActivityAsync, resolveUserId, resolveRoleCode, resolveSchoolId, actorLabelFromReq, resolveProductTier } = require('./utils/platformActivityLog');
const { closeUserSessions } = require('./utils/schoolMonitoringHelpers');

/** SUPER_ADMIN and FULL_SYSTEM_CONTROLLER — exempt from maintenance session kill & write lock */
function isElevatedPlatformRole(roleCode) {
  const r = (roleCode || '').toUpperCase();
  return r === 'SUPER_ADMIN' || r === 'FULL_SYSTEM_CONTROLLER';
}

const app  = express();
const PORT = process.env.PORT || 5100;
const httpServer = http.createServer(app);
let io = null;

// ── FIX: Trust reverse proxy (nginx) so cookies work over HTTPS ──
app.set('trust proxy', 1);
// Disable ETag-based conditional responses so API calls return fresh 200 payloads.
app.set('etag', false);

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
  'uploads/student-profile-photos',
  'uploads/requirement-images',
  'uploads/service-icons',
  'uploads/standard-shule-kits',
  'uploads/uniform-vouchers',
  'uploads/temp',
  'uploads/library-covers',
].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`📁  Created: ${dir}`);
  }
});

// ============================================================
// ENV GUARDS
// ============================================================
validateEnvironment();
const sessionSecret = process.env.SESSION_SECRET || 'dev-only-session-secret-change-me';

// ============================================================
// SESSION STORE
// ============================================================
const sessionStoreOptions = {
  host:               process.env.DB_HOST     || 'localhost',
  port:     parseInt( process.env.DB_PORT     || '3306'),
  user:               process.env.DB_USER     || 'root',
  password:           process.env.DB_PASSWORD || '',
  database:           process.env.DB_NAME     || 'school_db',
  createDatabaseTable: true,
  clearExpired:        true,
  checkExpirationInterval: 15 * 60 * 1000,
  expiration:          8 * 60 * 60 * 1000,
  schema: {
    tableName:   'app_sessions',
    columnNames: {
      session_id: 'session_id',
      expires:    'expires',
      data:       'data',
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

const getAllowedOrigins = () => {
  /** Merge FRONTEND_URL + ALLOWED_ORIGINS (comma-separated), dedupe. */
  const mergeOriginEnv = () => {
    const a = (process.env.FRONTEND_URL || '').split(',').map((s) => s.trim()).filter(Boolean);
    const b = (process.env.ALLOWED_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean);
    return [...new Set([...a, ...b])];
  };
  if (process.env.NODE_ENV !== 'production') return true;
  const list = mergeOriginEnv();
  if (list.length === 0) return false;
  return list.length === 1 ? list[0] : list;
};

app.use(cors({
  origin:      getAllowedOrigins(),
  credentials: true,
  methods:     ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));
app.use(requestContext);
app.use(
  pinoHttp({
    logger,
    customProps: (req) => ({
      requestId: req.requestId,
      userId: req.session?.userId || null,
      role: req.user?.role_code || null,
    }),
  })
);
app.use(metricsMiddleware);

io = new Server(httpServer, {
  cors: {
    origin: getAllowedOrigins(),
    credentials: true,
    methods: ['GET', 'POST'],
  },
});
app.set('io', io);

app.use(cookieParser(sessionSecret));

// ── FIX: Session cookie — secure only in production (nginx handles HTTPS)
// sameSite 'none' requires secure=true, but that breaks localhost dev.
// In production behind nginx: secure=true + sameSite='none' works correctly.
const sessionMiddleware = session({
  name:   'babyeyi_sid',
  secret: sessionSecret,
  store:  sessionStore,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge:   8 * 60 * 60 * 1000,
  },
});
app.use(sessionMiddleware);

// Do not run body parsers on multipart — they can interfere with multer/busboy ("Unexpected end of form").
const jsonParser = express.json({ limit: '50mb' });
const urlencodedParser = express.urlencoded({ extended: true, limit: '50mb' });
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
  if (!filename || !/^[a-zA-Z0-9._-]+$/.test(filename)) {
    return res.status(400).end();
  }
  const primaryPath = path.join(__dirname, 'uploads', 'profile-photos', filename);
  const legacyPath  = path.join(__dirname, '..', 'uploads', 'profile-photos', filename);
  if (fs.existsSync(primaryPath)) return res.sendFile(primaryPath);
  if (fs.existsSync(legacyPath))  return res.sendFile(legacyPath);
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
    return (
      p.endsWith('/session/me') ||
      p.endsWith('/district/babyeyi/me') ||
      p.endsWith('/chat/schools') ||
      p.endsWith('/chat/unread-count') ||
      p.endsWith('/teacher-portal/timetable') ||
      p.endsWith('/teacher-portal/timetable-filters') ||
      p.endsWith('/teacher-portal/attendance-summary/daily') ||
      p.endsWith('/teacher-portal/attendance-summary/weekly') ||
      p.startsWith('/api/superadmin/audit') ||
      p.startsWith('/api/superadmin/school-monitor')
    );
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
        req.session.destroy(() => {});
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
        } catch (_) { schoolRows = []; }
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
      req.session.destroy(() => {});
    }
  } catch (e) {
    console.error('[session hydration]', e.message);
  }
  next();
});

app.use(platformActivityMiddleware);

app.use(async (req, res, next) => {
  const url = (req.originalUrl || req.url || '').split('?')[0];
  if (!url.startsWith('/api/')) return next();
  const skip = [
    '/api/auth/login',
    '/api/auth/signup-super-admin',
    '/api/auth/signup-full-system-controller',
    '/api/auth/system-config/public',
    '/api/session/logout',
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
// SOCKET.IO — realtime chat transport
// ============================================================
io.engine.use((req, res, next) => {
  sessionMiddleware(req, res, next);
});

io.use((socket, next) => {
  try {
    const fakeReq = { session: socket.request.session, user: null };
    const identity = chatModule.resolveUserIdentity(fakeReq);
    if (!identity) return next(new Error('NOT_AUTHENTICATED'));
    socket.data.identity = identity;
    return next();
  } catch (err) {
    return next(err);
  }
});

const onlineUserSockets = new Map();
const onlineParentSockets = new Map();

function bumpCount(map, key) {
  const n = Number(map.get(key) || 0) + 1;
  map.set(key, n);
}

function dropCount(map, key) {
  const n = Number(map.get(key) || 0) - 1;
  if (n <= 0) map.delete(key);
  else map.set(key, n);
}

function emitPresenceForIdentity(identity, schoolIds, status) {
  try {
    for (const sid of schoolIds || []) {
      io.to(`chat:presence:school:${sid}`).emit('chat:presence-changed', {
        school_id: Number(sid),
        identity: identity.type === 'USER'
          ? { type: 'USER', user_id: identity.user_id }
          : { type: 'PARENT', parent_phone: identity.parent_phone },
        status,
        online_count: identity.type === 'USER'
          ? Number(onlineUserSockets.get(identity.user_id) || 0)
          : Number(onlineParentSockets.get(identity.parent_phone) || 0),
      });
    }
  } catch (_e) {}
}

io.on('connection', (socket) => {
  const identity = socket.data?.identity;
  if (!identity) {
    socket.disconnect(true);
    return;
  }

  const initPresence = async () => {
    try {
      const schools = await chatModule.resolveIdentitySchools(identity, { session: socket.request.session, user: null });
      socket.data.schoolIds = (schools || []).map((s) => Number(s.id)).filter(Boolean);
    } catch {
      socket.data.schoolIds = [];
    }
    if (identity.type === 'USER' && identity.user_id) {
      socket.join(`chat:user:${identity.user_id}`);
      bumpCount(onlineUserSockets, identity.user_id);
    }
    if (identity.type === 'PARENT' && identity.parent_phone) {
      socket.join(`chat:parent:${identity.parent_phone}`);
      bumpCount(onlineParentSockets, identity.parent_phone);
    }
    emitPresenceForIdentity(identity, socket.data.schoolIds || [], 'online');
  };
  initPresence();

  socket.on('chat:presence-subscribe', async (payload = {}) => {
    try {
      const schoolId = Number(payload.school_id || 0);
      if (!schoolId) return;
      const fakeReq = { session: socket.request.session, user: null };
      const schools = await chatModule.resolveIdentitySchools(identity, fakeReq);
      if (!schools.some((s) => Number(s.id) === schoolId)) return;
      socket.join(`chat:presence:school:${schoolId}`);
    } catch (_err) {}
  });

  socket.on('chat:join-thread', async (payload = {}) => {
    try {
      const threadId = Number(payload.thread_id || 0);
      if (!threadId) return;
      const schoolId = Number(payload.school_id || 0);
      if (!schoolId) return;
      const canRead = await (async () => {
        if (identity.type === 'USER') {
          const [[row]] = await promisePool.query(
            `SELECT id FROM school_chat_participants
             WHERE thread_id = ? AND school_id = ? AND participant_type = 'USER' AND user_id = ? LIMIT 1`,
            [threadId, schoolId, identity.user_id]
          );
          return !!row;
        }
        const [[row]] = await promisePool.query(
          `SELECT id FROM school_chat_participants
           WHERE thread_id = ? AND school_id = ? AND participant_type = 'PARENT' AND parent_phone = ? LIMIT 1`,
          [threadId, schoolId, identity.parent_phone]
        );
        return !!row;
      })();
      if (canRead) {
        socket.join(`chat:thread:${threadId}`);
      }
    } catch (_err) {}
  });

  socket.on('chat:typing', async (payload = {}) => {
    try {
      const threadId = Number(payload.thread_id || 0);
      const schoolId = Number(payload.school_id || 0);
      const isTyping = Boolean(payload.is_typing);
      if (!threadId || !schoolId) return;
      const canRead = await (async () => {
        if (identity.type === 'USER') {
          const [[row]] = await promisePool.query(
            `SELECT id FROM school_chat_participants
             WHERE thread_id = ? AND school_id = ? AND participant_type = 'USER' AND user_id = ? LIMIT 1`,
            [threadId, schoolId, identity.user_id]
          );
          return !!row;
        }
        const [[row]] = await promisePool.query(
          `SELECT id FROM school_chat_participants
           WHERE thread_id = ? AND school_id = ? AND participant_type = 'PARENT' AND parent_phone = ? LIMIT 1`,
          [threadId, schoolId, identity.parent_phone]
        );
        return !!row;
      })();
      if (!canRead) return;
      socket.to(`chat:thread:${threadId}`).emit('chat:typing', {
        thread_id: threadId,
        school_id: schoolId,
        is_typing: isTyping,
        sender: identity.type === 'USER'
          ? { type: 'USER', user_id: identity.user_id }
          : { type: 'PARENT', parent_phone: identity.parent_phone },
      });
    } catch (_err) {}
  });

  socket.on('disconnect', () => {
    if (identity.type === 'USER' && identity.user_id) {
      dropCount(onlineUserSockets, identity.user_id);
    }
    if (identity.type === 'PARENT' && identity.parent_phone) {
      dropCount(onlineParentSockets, identity.parent_phone);
    }
    emitPresenceForIdentity(identity, socket.data.schoolIds || [], 'offline');
  });
});

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
  limits: { fileSize: 20 * 1024 * 1024, fields: 20, files: 5 },
  fileFilter(_req, file, cb) {
    ['image/jpeg','image/jpg','image/png','image/webp','application/pdf']
      .includes(file.mimetype) ? cb(null, true) : cb(new Error(`File type not allowed: ${file.mimetype}`));
  },
});

const MULTER_SELF_MANAGED = [
  '/api/babyeyi',
  '/api/district/babyeyi',
  '/api/fee-limits',
  '/api/schools',
  '/api/mini-websites',
  '/api/admissions',
  '/api/public/schools',
  '/api/auth',
  '/api/students',
  '/api/chat',
  '/api/requirement-prices',
  '/api/student-services',
  '/api/standard-shule-kits',
  '/api/uniform-vouchers',
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
const SCHOOL_ROW_SELECT = `SELECT id, school_name, school_code, email, phone, district, province,
              status AS school_record_status,
              school_status AS school_access_status,
              subscription_plan, pro_enabled, pro_start_date, pro_end_date
       FROM schools`;

async function rowToSchoolSessionPayload(s) {
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

async function resolveSchoolForSession(userId) {
  try {
    let [rows] = await promisePool.query(
      `${SCHOOL_ROW_SELECT}
       WHERE manager_user_id = ?
         AND (deleted_at IS NULL AND (status IS NULL OR status = 'active'))
       LIMIT 1`,
      [userId]
    );
    if (!rows?.length) {
      const [[u]] = await promisePool.query(
        `SELECT school_id FROM users WHERE id = ? AND deleted_at IS NULL LIMIT 1`,
        [userId]
      );
      if (u?.school_id) {
        [rows] = await promisePool.query(
          `${SCHOOL_ROW_SELECT}
           WHERE id = ?
             AND (deleted_at IS NULL AND (status IS NULL OR status = 'active'))
           LIMIT 1`,
          [u.school_id]
        );
      }
    }
    if (rows && rows.length > 0) {
      return rowToSchoolSessionPayload(rows[0]);
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
      if (req.user && req.user.photo != null) {
        data.photo = req.user.photo;
      }
      const roleCode = (data.role?.code || data.role_code || '').toUpperCase();
      // Refresh school subscription/Pro flags for any logged-in user linked to a school (managers, DOS, teachers, etc.)
      if (req.session.userId) {
        const fresh = await resolveSchoolForSession(req.session.userId);
        if (fresh) {
          data.school = fresh;
          data.school_id = fresh.id;
          req.session.school_id = fresh.id;
          req.session.user = { ...req.session.user, school: fresh, school_id: fresh.id };
        }
      }
      if (!data.school && (req.session.school_id || data.school_id)) {
        const sid = req.session.school_id || data.school_id;
        data.school_id = sid;
        data.school    = { id: sid, name: null, code: null };
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
      if (req.session?.userId) {
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
          id:         req.user.id,
          user_uid:   req.user.user_uid,
          email:      req.user.email,
          first_name: req.user.first_name,
          last_name:  req.user.last_name,
          full_name:  `${req.user.first_name} ${req.user.last_name}`,
          photo:      req.user.photo || null,
          role:       { code: req.user.role_code, name: req.user.role_name },
          district:   req.user.district  || null,
          province:   req.user.province  || null,
          sector:     req.user.sector    || null,
          school,
          school_id:  school?.id || schoolId || null,
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
  const userId = resolveUserId(req);
  const parentId = req.session?.parentPortalAccountId || null;
  if (userId) {
    closeUserSessions(userId, false).catch(() => {});
  }
  if (userId || parentId) {
    logPlatformActivityAsync({
      req,
      eventCategory: 'auth',
      eventType: 'logout',
      outcome: 'success',
      userId: userId || null,
      roleCode: resolveRoleCode(req) || (parentId ? 'PARENT' : null),
      schoolId: resolveSchoolId(req),
      productTier: resolveProductTier(req),
      actorLabel: actorLabelFromReq(req) || (parentId ? 'Parent' : null),
      actionSummary: userId ? 'User signed out' : 'Parent signed out',
      details: { parent_portal_account_id: parentId || null },
    });
  }
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
    auth:         '/api/auth/*',
    session:      'GET /api/session/me  |  POST /api/session/logout',
    babyeyi:      '/api/babyeyi/*',
    feeLimits:    '/api/fee-limits/*',
    locations:    '/api/locations/*',
    miniWebsites: '/api/mini-websites/*',
    admissions:   '/api/admissions/*',
  },
}));

app.get('/api/health', (_req, res) => res.json({
  success: true, status: 'OK', uptime: `${Math.floor(process.uptime())}s`,
  warnings: [
    ...(!process.env.SESSION_SECRET      ? ['SESSION_SECRET not set']      : []),
    ...(!process.env.BABYEYI_HASH_SECRET ? ['BABYEYI_HASH_SECRET not set'] : []),
  ],
}));
app.get('/api/metrics', metricsHandler);

// ============================================================
// ROUTE IMPORTS
// ============================================================
console.log('\n🔗  Importing routes…\n');

const authRoute        = require('./authPages/auth');
console.log('  ✅  auth.js');
const babyeyiDeoRoute  = require('./BabyeyiRoutes/babyeyi-deo');
console.log('  ✅  babyeyi-deo.js');
const babyeyiRoute     = require('./BabyeyiRoutes/babyeyi');
console.log('  ✅  babyeyi.js');
const babyeyiHashPatch = require('./BabyeyiRoutes/babyeyi-hash-patch');
console.log('  ✅  babyeyi-hash-patch.js');
const feeLimitsRoute   = require('./BabyeyiRoutes/Fee_limits');
console.log('  ✅  feeLimits.js');
const schoolAddRoutes  = require('./BabyeyiRoutes/school-add');
const publicSchoolRegistrationRoutes = require('./BabyeyiRoutes/publicSchoolRegistration');
const districtBabyeyi  = require('./BabyeyiRoutes/DistrictBabyeyi');
const nesaBabyeyi      = require('./BabyeyiRoutes/nesaBabyeyi');
const miniWebsiteRoutes = require('./BabyeyiRoutes/miniWebsites');
console.log('  ✅  miniWebsites.js');
const admissionRoutes = require('./BabyeyiRoutes/admissionRoutes');
console.log('  ✅  admissionRoutes.js');
const requirementPriceRoutes = require('./BabyeyiRoutes/requirementPrice');
console.log('  ✅  requirementPrice.js');
const publicBabyeyiPayRoutes = require('./BabyeyiRoutes/publicBabyeyiPay');
console.log('  ✅  publicBabyeyiPay.js');
const momoRoutes = require('./BabyeyiRoutes/momoRoutes');
console.log('  ✅  momoRoutes.js');
const publicPaySchoolFlowRoutes = require('./BabyeyiRoutes/publicPaySchoolFlow');
console.log('  ✅  publicPaySchoolFlow.js');
const studentRoutes    = require('./BabyeyiRoutes/students');
console.log('  ✅  students.js');
const schoolStaffRoutes = require('./BabyeyiRoutes/schoolStaff');
console.log('  ✅  schoolStaff.js');
const accountantFeesRoutes = require('./BabyeyiRoutes/accountantFees');
console.log('  ✅  accountantFees.js');
const disciplineRoutes = require('./BabyeyiRoutes/discipline');
console.log('  ✅  discipline.js');
const dosAcademicRoutes = require('./BabyeyiRoutes/dosAcademic');
console.log('  ✅  dosAcademic.js');
const teacherPortalRoutes = require('./BabyeyiRoutes/teacherPortal');
console.log('  ✅  teacherPortal.js');
const schoolRoleOperationsRoutes = require('./BabyeyiRoutes/schoolRoleOperations');
console.log('  ✅  schoolRoleOperations.js');
const portalOperationsRoutes = require('./BabyeyiRoutes/portalOperations');
console.log('  ✅  portalOperations.js');
const schoolClassesRouter = require('./BabyeyiRoutes/schoolClasses');
console.log('  ✅  schoolClasses.js');
const studentPermissionsRoutes = require('./BabyeyiRoutes/studentPermissions');
console.log('  ✅  studentPermissions.js');
const shuleAvanceServicesRoutes = require('./BabyeyiRoutes/shuleAvanceServices');
console.log('  ✅  shuleAvanceServices.js');
const studentTransferRoutes = require('./BabyeyiRoutes/studentTransfer');
console.log('  ✅  studentTransfer.js');
const libraryRoutes = require('./BabyeyiRoutes/library');
console.log('  ✅  library.js (GET /api/books, borrowings, …)');
const parentPortalRoutes = require('./BabyeyiRoutes/parentPortal');
console.log('  ✅  parentPortal.js');
const onlineServiceRoutes = require('./BabyeyiRoutes/onlineServiceRoutes');
console.log('  ✅  onlineServiceRoutes.js');
const studentCardsRoutes = require('./BabyeyiRoutes/studentCards');
console.log('  ✅  studentCards.js');

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

app.use('/api/auth',        authRoute);
app.use('/api/shule-avance-partner', shuleAvanceOrgPortalRoutes);
console.log('  ✅  /api/shule-avance-partner/*');
app.use('/api/babyeyi',     babyeyiDeoRoute);
app.use('/api/babyeyi',     babyeyiRoute);
app.use('/api/babyeyi',     babyeyiHashPatch);
app.use('/api/fee-limits',  feeLimitsRoute);
app.use('/api/public/schools', publicSchoolRegistrationRoutes);
console.log('  ✅  /api/public/schools/*');
app.use('/api/district/babyeyi', districtBabyeyi);
app.use('/api/nesa/babyeyi',     nesaBabyeyi);
app.use('/api/mini-websites', miniWebsiteRoutes);
console.log('  ✅  /api/mini-websites/*');
app.use('/api/admissions', admissionRoutes);
console.log('  ✅  /api/admissions/*');
app.use('/api/requirement-prices', requirementPriceRoutes);
console.log('  ✅  /api/requirement-prices/*');

const superAdminAuditRoutes = require('./BabyeyiRoutes/superAdminAudit');
app.use('/api/superadmin/audit', superAdminAuditRoutes);
console.log('  ✅  /api/superadmin/audit/*');

const schoolMonitoringRoutes = require('./BabyeyiRoutes/schoolMonitoring');
app.use('/api/superadmin/school-monitor', schoolMonitoringRoutes);
console.log('  ✅  /api/superadmin/school-monitor/*');

const studentServicesRoutes = require('./BabyeyiRoutes/studentServicesRoutes');
app.use('/api/student-services', studentServicesRoutes);
console.log('  ✅  /api/student-services/*');

const standardShuleKitRoutes = require('./BabyeyiRoutes/standardShuleKitRoutes');
app.use('/api/standard-shule-kits', standardShuleKitRoutes);
console.log('  ✅  /api/standard-shule-kits/*');

const uniformVoucherRoutes = require('./BabyeyiRoutes/uniformVoucherRoutes');
app.use('/api/uniform-vouchers', uniformVoucherRoutes);
console.log('  ✅  /api/uniform-vouchers/*');

app.use('/api/public/babyeyi-pay', publicBabyeyiPayRoutes);
console.log('  ✅  /api/public/babyeyi-pay/*');

const classkitShareRoutes = require('./BabyeyiRoutes/classkitShareRoutes');
app.use('/api/public/classkit-share', classkitShareRoutes);
console.log('  ✅  /api/public/classkit-share/* (OTP + guest pricing)');

const fieldAgentsModule = require('./BabyeyiRoutes/fieldAgentsRoutes');
app.use('/api/field-agents', fieldAgentsModule.adminRouter);
app.use('/api/agent', fieldAgentsModule.agentRouter);
app.use('/api/public/agents', fieldAgentsModule.publicRouter);
console.log('  ✅  /api/field-agents/*  |  /api/agent/*  |  /api/public/agents/*');
fieldAgentsModule.ensureAgentRole().catch(() => {});
fieldAgentsModule.ensureProfileTable().catch(() => {});

const representativesModule = require('./BabyeyiRoutes/representativesRoutes');
app.use('/api/representatives', representativesModule.adminRouter);
app.use('/api/representative', representativesModule.repRouter);
console.log('  ✅  /api/representatives/*  |  /api/representative/*');
representativesModule.ensureSchema().catch((e) => console.warn('[representatives] ensureSchema:', e.message));

// IMPORTANT: momoRoutes must be mounted BEFORE publicBabyeyiPay calls it internally
app.use('/api/momo', momoRoutes);
console.log('  ✅  /api/momo/*');

app.use('/api/public/public-pay', publicPaySchoolFlowRoutes);
console.log('  ✅  /api/public/public-pay/*');
// Library API — mount before parent portal, chat, portal ops, etc. so /api/books and /api/students/search resolve
app.use('/api', libraryRoutes);
console.log('  ✅  /api/books · /api/borrowings · /students/search (early mount)');
app.use('/api', parentPortalRoutes);
console.log('  ✅  /api/parent-portal/* (early — before babyeyi-finder alias)');
app.use('/api', onlineServiceRoutes);
console.log('  ✅  /api/online-service/*');
app.use('/api', studentCardsRoutes);
console.log('  ✅  /api/student-cards/*');
app.use('/api/parent-portal/public/babyeyi-finder', publicBabyeyiPayRoutes);
console.log('  ✅  /api/parent-portal/public/babyeyi-finder/*');
app.use('/api', studentRoutes);
console.log('  ✅  /api/students/*');
app.use('/api', schoolStaffRoutes);
console.log('  ✅  /api/school/staff/*');
app.use('/api', accountantFeesRoutes);
console.log('  ✅  /api/accountant/*');
app.use('/api', disciplineRoutes);
console.log('  ✅  /api/discipline/*');
app.use('/api', dosAcademicRoutes);
console.log('  ✅  /api/dos/*');
app.use('/api', schoolClassesRouter);
console.log('  ✅  /api/schools/:id/classes');
app.use('/api/teacher-portal', teacherPortalRoutes);
console.log('  ✅  /api/teacher-portal/*');
app.use('/api', schoolRoleOperationsRoutes);
console.log('  ✅  /api/library/*  /api/stock/*  /api/gate/*');
app.use('/api', portalOperationsRoutes);
console.log('  ✅  /api/store/*  /api/accountant/requisitions|expenses|payroll/*  /api/teacher-portal/requisitions  /api/tools/ticha-ai/*');
app.use('/api', chatModule.router);
console.log('  ✅  /api/chat/*');
app.use('/api', studentPermissionsRoutes);
console.log('  ✅  /api/permissions/*');
app.use('/api/services', shuleAvanceServicesRoutes);
console.log('  ✅  /api/services/shule-avance/*');
app.use('/api', studentTransferRoutes);
console.log('  ✅  /api/student-transfers/*');
// libraryRoutes mounted early (after public-pay)

if (locationRoutes) {
  app.use('/api/locations', locationRoutes);
  console.log('  ✅  /api/locations/*');
} else {
  app.use('/api/locations', (_req, res) =>
    res.status(503).json({ success: false, message: 'Location service unavailable — npm install rwanda' })
  );
}

app.use('/api', schoolAddRoutes);
console.log('✅  All routes mounted\n');

// ============================================================
// 404
// ============================================================
app.use((req, res) => {
  res.status(404).json({
    success: false, message: 'Route not found',
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
  if (err.code === 'LIMIT_FILE_SIZE')       return res.status(400).json({ success: false, message: 'File too large — each image must be under 30 MB. Please reduce the image size and try again.' });
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
    // Migrations now own schema evolution. Keep this call disabled in runtime.

    httpServer.listen(PORT, () => {
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
║  GET  /api/chat/schools             → chat schools          ║
║  GET  /api/chat/staff               → school staff directory║
║  GET  /api/chat/threads             → inbox threads         ║
║  POST /api/chat/threads/:id/messages→ send chat message     ║
╚══════════════════════════════════════════════════════════════╝`);
    });

    try {
      const ruleScheduler = require('./BabyeyiRoutes/feeReminderRuleScheduler');
      ruleScheduler.startFeeReminderRuleScheduler(60_000);
      console.log('⏰  Fee reminder auto-rules scheduler active (checks every 60s)');
    } catch (schedErr) {
      console.warn('⚠️  Fee reminder scheduler not started:', schedErr.message);
    }

    try {
      const incompleteOrderScheduler = require('./BabyeyiRoutes/parentIncompleteOrderScheduler');
      incompleteOrderScheduler.startParentIncompleteOrderScheduler(3600_000);
      console.log('⏰  Parent incomplete-order scheduler active (hourly — reminders at 7/14/21d, delete at 25d)');
    } catch (schedErr) {
      console.warn('⚠️  Incomplete-order scheduler not started:', schedErr.message);
    }
  } catch (err) {
    console.error('❌  Failed to start:', err.message);
    process.exit(1);
  }
};

process.on('SIGINT',  () => { console.log('\n👋  Shutting down…'); process.exit(0); });
process.on('SIGTERM', () => { console.log('\n👋  Shutting down…'); process.exit(0); });
process.on('unhandledRejection', reason => console.error('❌  Unhandled rejection:', reason));
process.on('uncaughtException',  err    => { console.error('❌  Uncaught exception:', err.message); process.exit(1); });

startServer();
module.exports = app;