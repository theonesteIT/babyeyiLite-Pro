// ================================================================
// routes/BabyeyiRoutes/districtBabyeyi.js  — v7 FIXED
//
// FIXES ON TOP OF v6:
//
//  ✅ FIX A: /increase-requests — collation mismatch crash
//     ERROR: "Illegal mix of collations (utf8mb4_bin,NONE) and
//             (utf8mb4_general_ci,COERCIBLE) for operation '='"
//     Root cause: COALESCE(ir.district, b.school_district) compares
//     a utf8mb4_bin column (school_district) against a plain string
//     literal from Node (utf8mb4_general_ci). MySQL rejects this.
//     Fix: wrap the comparison with CONVERT(...USING utf8mb4)
//     COLLATE utf8mb4_unicode_ci on both sides.
//
//  ✅ FIX B: /recommend — "Unknown column 'province' in 'field list'"
//     Root cause: ensureIncreaseRequest() INSERT listed columns
//     (sector, province) that do NOT exist in babyeyi_increase_requests.
//     Fix: removed sector and province from the INSERT — only insert
//     columns that actually exist in that table.
//
// All original v6 logic, middleware, helpers, and other routes
// are preserved exactly as-is.
// ================================================================

const express = require('express');
const router  = express.Router();
const multer  = require('multer');
const path    = require('path');
const fs      = require('fs');
const { promisePool } = require('../config/database');
const { deoAuth }     = require('../middleware/deoAuth');
const {
  getDeoPrefs,
  saveDeoPrefs,
  listNotificationsForUser,
  countUnread,
} = require('./districtDeoNotifications');
const {
  upsertSubscription,
  removeSubscription,
  getVapidPublicKey,
  isWebPushConfigured,
} = require('./webPushSubscriptions');

const DEO_ASSET_DIR = path.join(__dirname, '..', 'uploads', 'deo_assets');
if (!fs.existsSync(DEO_ASSET_DIR)) fs.mkdirSync(DEO_ASSET_DIR, { recursive: true });

const DEO_ASSET_URL_PREFIX = '/uploads/deo_assets/';

function isDuplicateColumnError(err) {
  return err?.code === 'ER_DUP_FIELD' || err?.code === 'ER_DUP_FIELDNAME';
}

/** Ensure users.signature_url + users.stamp_url exist (once per process). */
let deoAssetColumnsReady = null;
async function ensureDeoUserAssetColumns() {
  if (!deoAssetColumnsReady) {
    deoAssetColumnsReady = (async () => {
      for (const sql of [
        'ALTER TABLE users ADD COLUMN signature_url VARCHAR(500) NULL',
        'ALTER TABLE users ADD COLUMN stamp_url VARCHAR(500) NULL',
      ]) {
        try {
          await query(sql, []);
        } catch (e) {
          if (!isDuplicateColumnError(e)) throw e;
        }
      }
    })();
  }
  return deoAssetColumnsReady;
}

function deoAssetPublicUrl(filename) {
  return `${DEO_ASSET_URL_PREFIX}${filename}`;
}

const PROFILE_PHOTO_DIR = path.join(__dirname, '..', 'uploads', 'profile-photos');
if (!fs.existsSync(PROFILE_PHOTO_DIR)) fs.mkdirSync(PROFILE_PHOTO_DIR, { recursive: true });

const profilePhotoStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, PROFILE_PHOTO_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg';
    const uid = req.deoUser?.id || req.session?.userId || 'user';
    cb(null, `deo-profile-${uid}-${Date.now()}${ext}`);
  },
});
const _uploadProfilePhotoMulter = multer({
  storage: profilePhotoStorage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok = /^image\/(jpeg|jpg|png|webp)$/i.test(file.mimetype || '');
    ok ? cb(null, true) : cb(new Error('Only JPEG, PNG or WebP images allowed'));
  },
});

/** Skip global multipart parser — parse only on this route (avoids "Unexpected end of form"). */
const profilePhotoUpload = (req, res, next) => {
  const ct = String(req.headers['content-type'] || '').toLowerCase();
  if (!ct.includes('multipart/form-data')) {
    return res.status(400).json({ success: false, message: 'Expected multipart form upload' });
  }
  _uploadProfilePhotoMulter.single('photo')(req, res, (err) => {
    if (err) {
      const msg = String(err.message || 'Upload failed');
      const code = /unexpected end of form/i.test(msg) ? 400 : (err.status || 400);
      return res.status(code).json({ success: false, message: msg });
    }
    next();
  });
};

const deoAssetStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, DEO_ASSET_DIR),
  filename: (req, file, cb) => {
    const ext  = path.extname(file.originalname) || '.png';
    const type = file.fieldname === 'deo_stamp' ? 'stamp' : 'signature';
    const id   = req.deoUser?.id || req.session?.userId || req.params?.id || 'unknown';
    cb(null, `deo_${type}_${id}_${Date.now()}${ext}`);
  },
});

const _multerUpload = multer({
  storage: deoAssetStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok = /^image\/(jpeg|jpg|png|webp)$/.test(file.mimetype);
    ok ? cb(null, true) : cb(new Error('Only image files allowed for signature/stamp'));
  },
}).fields([
  { name: 'deo_signature', maxCount: 1 },
  { name: 'deo_stamp',     maxCount: 1 },
]);

const deoUpload = (req, res, next) => {
  const ct = req.headers['content-type'] || '';
  if (!ct.includes('multipart/form-data')) {
    req.files = req.files || {};
    return next();
  }
  _multerUpload(req, res, (err) => {
    if (!err) return next();
    const msg = (err.message || '').toLowerCase();
    if (msg.includes('unexpected end') || msg.includes('aborted') || err.code === 'LIMIT_UNEXPECTED_FILE') {
      req.files = req.files || {};
      req.body  = req.body  || {};
      return next();
    }
    return res.status(400).json({ success: false, message: err.message });
  });
};

const query = (sql, params = []) => promisePool.query(sql, params);

router.use(deoAuth);

const normalise = (r) => {
  if (!r) return r;
  return {
    ...r,
    class:    r.class_name      || r.class    || '',
    level:    r.education_level || r.level    || '',
    category: r.school_category || r.category || '',
    district: r.school_district || r.district || '',
    sector:   r.school_sector   || r.sector   || '',
    province: r.school_province || r.province || '',
  };
};

// ── District comparison with collation fix (avoids "Illegal mix of collations") ──
const districtMatch = (col) =>
  `CONVERT(${col} USING utf8mb4) COLLATE utf8mb4_unicode_ci = CONVERT(? USING utf8mb4) COLLATE utf8mb4_unicode_ci`;

/** Shared query filters from portal drawer (?academic_year, ?term, ?status, …). */
function appendBabyeyiListFilters(where, params, query, alias = 'b') {
  const year = query.academic_year || query.year;
  if (year) {
    where.push(`${alias}.academic_year = ?`);
    params.push(year);
  }
  if (query.term) {
    where.push(`${alias}.term = ?`);
    params.push(query.term);
  }
  if (query.status) {
    const statuses = String(query.status)
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (statuses.length === 1) {
      where.push(`${alias}.status = ?`);
      params.push(statuses[0]);
    } else if (statuses.length > 1) {
      where.push(`${alias}.status IN (${statuses.map(() => '?').join(',')})`);
      params.push(...statuses);
    }
  }
  if (query.category) {
    where.push(`${alias}.school_category = ?`);
    params.push(query.category);
  }
  if (query.level) {
    where.push(`${alias}.education_level = ?`);
    params.push(query.level);
  }
  if (query.sector) {
    where.push(`${alias}.school_sector = ?`);
    params.push(query.sector);
  }
  if (query.school_id) {
    where.push(`${alias}.school_id = ?`);
    params.push(query.school_id);
  }
  if (query.exceeds_limit === '1' || query.exceeds_limit === 'yes') {
    where.push(`${alias}.exceeds_limit = 1`);
  } else if (query.exceeds_limit === '0' || query.exceeds_limit === 'no') {
    where.push(`(${alias}.exceeds_limit = 0 OR ${alias}.exceeds_limit IS NULL)`);
  }
}

// ════════════════════════════════════════════════════════════════
// Helper: resolve DEO stored sig/stamp (users.signature_url, users.stamp_url or school)
// ════════════════════════════════════════════════════════════════
async function resolveDeoAssets(deoId) {
  try {
    let row;
    try {
      const [[r]] = await query(
        `SELECT u.signature_url, u.stamp_url AS deo_stamp, s.school_stamp_url AS school_stamp
         FROM users u LEFT JOIN schools s ON s.id = u.school_id WHERE u.id = ? LIMIT 1`,
        [deoId]
      );
      row = r;
    } catch (e) {
      if (e.code === 'ER_BAD_FIELD_ERROR') {
        const [[r]] = await query(
          `SELECT u.signature_url, s.school_stamp_url AS school_stamp
           FROM users u LEFT JOIN schools s ON s.id = u.school_id WHERE u.id = ? LIMIT 1`,
          [deoId]
        );
        row = r;
        if (row) row.deo_stamp = null;
      } else throw e;
    }
    return {
      sig:   row?.signature_url || null,
      stamp: row?.deo_stamp || row?.school_stamp || null,
    };
  } catch (_) {
    return { sig: null, stamp: null };
  }
}

// ════════════════════════════════════════════════════════════════
// Helper: upsert increase_request row
//
// ✅ FIX B applied here:
//    Removed 'sector' and 'province' from the INSERT column list.
//    Those columns do not exist in babyeyi_increase_requests.
//    Only columns confirmed to exist are used:
//      babyeyi_id, school_id, school_name, district,
//      requested_amount, current_limit, nesa_status, reason
// ════════════════════════════════════════════════════════════════
async function ensureIncreaseRequest(babyeyiId, district, deoId) {
  // Check if row exists
  const [[existing]] = await query(
    `SELECT id FROM babyeyi_increase_requests WHERE babyeyi_id = ? LIMIT 1`,
    [babyeyiId]
  );
  if (existing) return existing.id;

  // No row — fetch babyeyi data to populate required fields
  const [[b]] = await query(
    `SELECT school_id, school_name, school_district, school_sector, school_province,
            total_fee, nesa_limit, class_name, term, academic_year
     FROM school_babyeyi WHERE id = ? LIMIT 1`,
    [babyeyiId]
  );
  if (!b) return null;

  // ── FIX B: only insert columns that exist in babyeyi_increase_requests
  //    REMOVED:  sector, province  (these columns don't exist in that table)
  const [result] = await query(
    `INSERT INTO babyeyi_increase_requests
       (babyeyi_id, school_id, school_name, district,
        requested_amount, current_limit, nesa_status, reason, submitted_at, created_at)
     VALUES (?, ?, ?, ?, ?, ?, 'pending', 'DEO initiated recommendation', NOW(), NOW())`,
    [
      babyeyiId,
      b.school_id,
      b.school_name,
      district || b.school_district,
      b.total_fee   || 0,
      b.nesa_limit  || 0,
    ]
  );
  console.log(`[districtBabyeyi] Auto-created increase_request row ${result.insertId} for babyeyi ${babyeyiId}`);
  return result.insertId;
}

// ════════════════════════════════════════════════════════════════
// GET /api/district/babyeyi/me
// ════════════════════════════════════════════════════════════════
router.get('/me', (req, res) => {
  res.json({
    success: true,
    data: {
      id:       req.deoUser.id,
      fullName: req.deoUser.fullName,
      email:    req.deoUser.email,
      photo:    req.deoUser.photo || null,
      role:     req.deoUser.roleCode,
      roleName: req.deoUser.roleName,
      district: req.deoDistrict,
      province: req.deoProvince,
    },
  });
});

// ════════════════════════════════════════════════════════════════
// GET /api/district/babyeyi/stats
// ════════════════════════════════════════════════════════════════
router.get('/stats', async (req, res) => {
  try {
    const district = req.deoDistrict;
    const bWhere = [districtMatch('b.school_district'), 'b.is_active = 1'];
    const bParams = [district];
    appendBabyeyiListFilters(bWhere, bParams, req.query);
    const bWhereSQL = `WHERE ${bWhere.join(' AND ')}`;

    const [[totals]] = await query(
      `SELECT
         COUNT(*)                                         AS total,
         COALESCE(SUM(b.status = 'approved'),  0)        AS approved,
         COALESCE(SUM(b.status = 'pending'),   0)        AS pending,
         COALESCE(SUM(b.status = 'rejected'),  0)        AS rejected,
         COALESCE(SUM(b.status = 'draft'),     0)        AS draft,
         COALESCE(SUM(b.exceeds_limit = 1),    0)        AS exceeds_count,
         COUNT(DISTINCT b.academic_year)                 AS years_count,
         COUNT(DISTINCT b.school_id)                     AS schools_count,
         COALESCE(AVG(b.total_fee),  0)                  AS avg_fee,
         COALESCE(SUM(b.total_fee),  0)                  AS total_fees_collected
       FROM school_babyeyi b
       ${bWhereSQL}`,
      bParams
    );

    const reqWhere = [
      `CONVERT(COALESCE(ir.district, b.school_district) USING utf8mb4) COLLATE utf8mb4_unicode_ci
       = CONVERT(? USING utf8mb4) COLLATE utf8mb4_unicode_ci`,
    ];
    const reqParams = [district];
    appendBabyeyiListFilters(reqWhere, reqParams, req.query);
    if (req.query.request_status) {
      reqWhere.push('ir.nesa_status = ?');
      reqParams.push(req.query.request_status);
    }
    const reqWhereSQL = `WHERE ${reqWhere.join(' AND ')}`;

    const [[reqStat]] = await query(
      `SELECT
         COUNT(*)                                         AS total_requests,
         COALESCE(SUM(ir.nesa_status = 'pending'),     0) AS pending_requests,
         COALESCE(SUM(ir.nesa_status = 'approved'),    0) AS approved_requests,
         COALESCE(SUM(ir.nesa_status = 'rejected'),    0) AS rejected_requests,
         COALESCE(SUM(ir.nesa_status = 'recommended'), 0) AS recommended_requests
       FROM babyeyi_increase_requests ir
       INNER JOIN school_babyeyi b ON b.id = ir.babyeyi_id AND b.is_active = 1
       ${reqWhereSQL}`,
      reqParams
    );

    const [sectorBreakdown] = await query(
      `SELECT
         COALESCE(b.school_sector, 'Unknown')   AS sector,
         COUNT(*)                               AS total,
         COALESCE(SUM(b.status='approved'), 0)  AS approved,
         COALESCE(SUM(b.status='pending'),  0)  AS pending,
         COALESCE(SUM(b.total_fee), 0)          AS total_fees
       FROM school_babyeyi b
       ${bWhereSQL}
       GROUP BY b.school_sector
       ORDER BY total DESC`,
      bParams
    );

    const [schoolBreakdown] = await query(
      `SELECT
         b.school_id,
         COALESCE(b.school_name, s.school_name, 'Unknown') AS school_name,
         b.school_sector,
         COUNT(*)                                           AS total,
         COALESCE(SUM(b.status='approved'), 0)             AS approved,
         COALESCE(SUM(b.status='pending'),  0)             AS pending,
         COALESCE(SUM(b.total_fee), 0)                     AS total_fees
       FROM school_babyeyi b
       LEFT JOIN schools s ON s.id = b.school_id
       ${bWhereSQL}
       GROUP BY b.school_id, b.school_name, s.school_name, b.school_sector
       ORDER BY total DESC
       LIMIT 20`,
      bParams
    );

    res.json({
      success:  true,
      district: req.deoDistrict,
      province: req.deoProvince,
      data: {
        ...totals,
        ...reqStat,
        sector_breakdown: sectorBreakdown,
        school_breakdown: schoolBreakdown,
      },
    });
  } catch (err) {
    console.error('[districtBabyeyi/stats]', err.message);
    res.status(500).json({ success: false, message: 'Failed to load district stats' });
  }
});

// ════════════════════════════════════════════════════════════════
// GET /api/district/babyeyi/analytics
// Filterable analytics for reports: ?term=1&academic_year=2024-2025&sector=Kayonza
// ════════════════════════════════════════════════════════════════
router.get('/analytics', async (req, res) => {
  try {
    const district = req.deoDistrict;
    const { term, academic_year, sector } = req.query;

    const baseWhere = [districtMatch('b.school_district'), 'b.is_active = 1'];
    const baseParams = [district];
    appendBabyeyiListFilters(baseWhere, baseParams, { term, academic_year, sector, ...req.query });
    const whereSQL = `WHERE ${baseWhere.join(' AND ')}`;

    const [sectorBreakdown] = await query(
      `SELECT
         COALESCE(b.school_sector, 'Unknown') AS sector,
         COUNT(*) AS total,
         COALESCE(SUM(b.status='approved'), 0) AS approved,
         COALESCE(SUM(b.status='pending'), 0) AS pending,
         COALESCE(SUM(b.exceeds_limit = 1), 0) AS exceeds_count,
         COALESCE(SUM(b.total_fee), 0) AS total_fees
       FROM school_babyeyi b
       ${whereSQL}
       GROUP BY b.school_sector
       ORDER BY total DESC`,
      baseParams
    );

    const [termBreakdown] = await query(
      `SELECT
         COALESCE(b.term, '—') AS term,
         COUNT(*) AS total,
         COALESCE(SUM(b.status='approved'), 0) AS approved,
         COALESCE(SUM(b.status='pending'), 0) AS pending,
         COALESCE(SUM(b.exceeds_limit = 1), 0) AS exceeds_count
       FROM school_babyeyi b
       ${whereSQL}
       GROUP BY b.term
       ORDER BY b.term`,
      baseParams
    );

    const [yearBreakdown] = await query(
      `SELECT
         COALESCE(b.academic_year, '—') AS academic_year,
         COUNT(*) AS total,
         COALESCE(SUM(b.status='approved'), 0) AS approved,
         COALESCE(SUM(b.status='pending'), 0) AS pending,
         COALESCE(SUM(b.exceeds_limit = 1), 0) AS exceeds_count
       FROM school_babyeyi b
       ${whereSQL}
       GROUP BY b.academic_year
       ORDER BY b.academic_year DESC`,
      baseParams
    );

    const tablePage  = Math.max(1, Number(req.query.page) || 1);
    const tableLimit = Math.min(50, Math.max(5, Number(req.query.limit) || 12));
    const tableOffset = (tablePage - 1) * tableLimit;

    const groupFrom = `
       FROM school_babyeyi b
       LEFT JOIN schools s ON s.id = b.school_id
       ${whereSQL}
       GROUP BY b.school_id, b.school_name, s.school_name, b.school_sector, b.academic_year, b.term`;

    const [[{ tableTotal }]] = await query(
      `SELECT COUNT(*) AS tableTotal FROM (SELECT 1 AS x ${groupFrom}) AS grouped`,
      baseParams
    );
    const totalTableRows = Number(tableTotal) || 0;

    const [schoolRequests] = await query(
      `SELECT
         b.school_id,
         COALESCE(b.school_name, s.school_name, 'Unknown') AS school_name,
         b.school_sector,
         b.academic_year,
         b.term,
         COUNT(b.id) AS total_babyeyi,
         COALESCE(SUM(b.status='approved'), 0) AS approved,
         COALESCE(SUM(b.status='pending'), 0) AS pending,
         COALESCE(SUM(b.exceeds_limit = 1), 0) AS increase_requests
       ${groupFrom}
       ORDER BY increase_requests DESC, total_babyeyi DESC
       LIMIT ? OFFSET ?`,
      [...baseParams, tableLimit, tableOffset]
    );

    res.json({
      success: true,
      district: req.deoDistrict,
      filters: { term: term || null, academic_year: academic_year || null, sector: sector || null },
      data: {
        sector_breakdown: sectorBreakdown,
        term_breakdown: termBreakdown,
        year_breakdown: yearBreakdown,
        school_requests: schoolRequests,
        school_requests_pagination: {
          total: totalTableRows,
          page: tablePage,
          limit: tableLimit,
          pages: Math.max(1, Math.ceil(totalTableRows / tableLimit) || 1),
        },
      },
    });
  } catch (err) {
    console.error('[districtBabyeyi/analytics]', err.message);
    res.status(500).json({ success: false, message: 'Failed to load analytics' });
  }
});

// ════════════════════════════════════════════════════════════════
// GET /api/district/babyeyi/list
// ✅ v6: Expose both nesa_status AND request_status so frontend works
// ════════════════════════════════════════════════════════════════
router.get('/list', async (req, res) => {
  try {
    const district = req.deoDistrict;
    const {
      status, year, term, category, level,
      sector, school_id, search,
      request_status, exceeds_limit,
      page  = 1,
      limit = 20,
    } = req.query;

    const where  = [districtMatch('b.school_district'), 'b.is_active = 1'];
    const params = [district];

    appendBabyeyiListFilters(where, params, {
      academic_year: year,
      year,
      term,
      status,
      category,
      level,
      sector,
      school_id,
      exceeds_limit,
    });
    if (request_status) { where.push('ir.nesa_status = ?'); params.push(request_status); }

    if (search) {
      where.push('(b.class_name LIKE ? OR b.academic_year LIKE ? OR b.doc_id LIKE ? OR b.school_name LIKE ?)');
      const like = `%${search}%`;
      params.push(like, like, like, like);
    }

    const whereSQL = `WHERE ${where.join(' AND ')}`;
    const offset   = (Number(page) - 1) * Number(limit);

    const [[rows], [[{ total }]]] = await Promise.all([
      query(
        `SELECT
           b.*,
           ir.id            AS request_id,
           ir.nesa_status   AS nesa_status,
           ir.nesa_status   AS request_status,
           ir.deo_notes,
           ir.nesa_notes
         FROM school_babyeyi b
         LEFT JOIN babyeyi_increase_requests ir ON ir.babyeyi_id = b.id
         ${whereSQL}
         ORDER BY b.created_at DESC
         LIMIT ? OFFSET ?`,
        [...params, Number(limit), offset]
      ),
      query(
        `SELECT COUNT(*) AS total
         FROM school_babyeyi b
         LEFT JOIN babyeyi_increase_requests ir ON ir.babyeyi_id = b.id
         ${whereSQL}`,
        params
      ),
    ]);

    res.json({
      success:  true,
      district: req.deoDistrict,
      province: req.deoProvince,
      data:     rows.map(normalise),
      pagination: {
        total,
        page:  Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (err) {
    console.error('[districtBabyeyi/list]', err.message);
    res.status(500).json({ success: false, message: 'Failed to load babyeyi list' });
  }
});

// ════════════════════════════════════════════════════════════════
// GET /api/district/babyeyi/increase-requests
//
// ✅ v6: Use COALESCE(ir.district, b.school_district) so auto-inserted
//        rows (which may have NULL district) are still returned.
//
// ✅ FIX A: collation mismatch — changed:
//    Before: WHERE (COALESCE(ir.district, b.school_district) = ?)
//    After:  WHERE CONVERT(COALESCE(ir.district, b.school_district) USING utf8mb4)
//                    COLLATE utf8mb4_unicode_ci
//                  = CONVERT(? USING utf8mb4) COLLATE utf8mb4_unicode_ci
// ════════════════════════════════════════════════════════════════
router.get('/increase-requests', async (req, res) => {
  try {
    const district = req.deoDistrict;
    const { status, academic_year, term, year, page = 1, limit = 20 } = req.query;
    const yearFilter = academic_year || year;

    // ── FIX A: cast both sides to a common collation ──────────
    const where  = [
      `CONVERT(COALESCE(ir.district, b.school_district) USING utf8mb4) COLLATE utf8mb4_unicode_ci
       = CONVERT(? USING utf8mb4) COLLATE utf8mb4_unicode_ci`,
    ];
    const params = [district];
    if (status) { where.push('ir.nesa_status = ?'); params.push(status); }
    appendBabyeyiListFilters(where, params, { ...req.query, academic_year: yearFilter, year: yearFilter, term });

    const whereSQL = `WHERE ${where.join(' AND ')}`;
    const offset   = (Number(page) - 1) * Number(limit);

    const [[rows], [[{ total }]]] = await Promise.all([
      query(
        `SELECT
           ir.*,
           b.class_name,
           b.classes_json,
           b.term          AS b_term,
           b.academic_year AS b_academic_year,
           b.school_category, b.education_level,
           b.total_fee     AS b_total_fee,
           b.nesa_limit    AS b_nesa_limit,
           b.school_id     AS b_school_id,
           b.school_name   AS b_school_name,
           b.school_sector,
           b.school_district,
           b.doc_id, b.pdf_path
         FROM babyeyi_increase_requests ir
         LEFT JOIN school_babyeyi b ON b.id = ir.babyeyi_id
         ${whereSQL}
         ORDER BY ir.submitted_at DESC, ir.created_at DESC
         LIMIT ? OFFSET ?`,
        [...params, Number(limit), offset]
      ),
      query(
        `SELECT COUNT(*) AS total
         FROM babyeyi_increase_requests ir
         LEFT JOIN school_babyeyi b ON b.id = ir.babyeyi_id
         ${whereSQL}`,
        params
      ),
    ]);

    const parseClasses = (v) => {
      if (!v) return [];
      if (Array.isArray(v)) return v;
      try { return typeof v === 'string' ? JSON.parse(v) : []; } catch { return []; }
    };

    const merged = rows.map(r => {
      const classesArr = parseClasses(r.classes_json);
      const primaryClass = r.class_name || (classesArr[0]) || '';
      return {
        ...r,
        class_name:    primaryClass,
        class:         primaryClass,
        classes:       classesArr.length ? classesArr : (primaryClass ? [primaryClass] : []),
        term:          r.term          || r.b_term          || '',
        academic_year: r.academic_year || r.b_academic_year || '',
        total_fee:     r.b_total_fee   != null ? r.b_total_fee  : (r.total_fee   || r.requested_amount || 0),
        nesa_limit:    r.b_nesa_limit  != null ? r.b_nesa_limit : (r.nesa_limit  || r.current_limit    || 0),
        school_name:   r.b_school_name || r.school_name     || '',
        school_id:     r.b_school_id   || r.school_id       || null,
        district:      r.district || r.school_district || '',
        parent_rep_doc_path:  r.parent_rep_doc_path  || null,
        parent_rep_doc_name:  r.parent_rep_doc_name  || null,
        budget_doc_path:      r.budget_doc_path      || null,
        budget_doc_name:      r.budget_doc_name      || null,
        deo_signature_path:   r.deo_signature_path   || null,
        deo_stamp_path:       r.deo_stamp_path       || null,
        approval_letter_path: r.approval_letter_path || null,
        b_term: undefined, b_academic_year: undefined,
        b_total_fee: undefined, b_nesa_limit: undefined,
        b_school_name: undefined, b_school_id: undefined,
        classes_json: undefined,
      };
    });

    const districtWhere = `CONVERT(COALESCE(ir.district, b.school_district) USING utf8mb4) COLLATE utf8mb4_unicode_ci
       = CONVERT(? USING utf8mb4) COLLATE utf8mb4_unicode_ci`;
    const [summaryRows] = await query(
      `SELECT ir.nesa_status AS status, COUNT(*) AS c
       FROM babyeyi_increase_requests ir
       LEFT JOIN school_babyeyi b ON b.id = ir.babyeyi_id
       WHERE ${districtWhere}
       GROUP BY ir.nesa_status`,
      [district]
    );
    const summary = { total: 0, pending: 0, recommended: 0, approved: 0, rejected: 0 };
    for (const row of summaryRows || []) {
      const st = String(row.status || '').toLowerCase();
      const c = Number(row.c || 0);
      summary.total += c;
      if (st === 'pending') summary.pending = c;
      else if (st === 'recommended') summary.recommended = c;
      else if (st === 'approved') summary.approved = c;
      else if (st === 'rejected') summary.rejected = c;
    }

    res.json({
      success:  true,
      district: req.deoDistrict,
      data:     merged.map(normalise),
      summary,
      pagination: {
        total,
        page:  Number(page),
        limit: Number(limit),
        pages: Math.max(1, Math.ceil(total / Number(limit)) || 1),
      },
    });
  } catch (err) {
    console.error('[districtBabyeyi/increase-requests]', err.message);
    res.status(500).json({ success: false, message: 'Failed to load increase requests' });
  }
});

// ════════════════════════════════════════════════════════════════
// GET /api/district/babyeyi/schools/list
// ════════════════════════════════════════════════════════════════
router.get('/schools/list', async (req, res) => {
  try {
    const district = req.deoDistrict;
    const { search, page = 1, limit = 30 } = req.query;

    const where  = ['s.district = ?'];
    const params = [district];
    if (search) {
      where.push('(s.school_name LIKE ? OR s.school_code LIKE ?)');
      params.push(`%${search}%`, `%${search}%`);
    }

    const offset = (Number(page) - 1) * Number(limit);

    const [[rows], [[{ total }]]] = await Promise.all([
      query(
        `SELECT
           s.id, s.school_name, s.school_code,
           s.school_category, s.sector, s.district,
           s.phone, s.email, s.status,
           COUNT(b.id)               AS total_babyeyi,
           SUM(b.status = 'approved') AS approved_babyeyi,
           SUM(b.status = 'pending')  AS pending_babyeyi
         FROM schools s
         LEFT JOIN school_babyeyi b ON b.school_id = s.id AND b.is_active = 1
         WHERE ${where.join(' AND ')}
         GROUP BY s.id
         ORDER BY s.school_name ASC
         LIMIT ? OFFSET ?`,
        [...params, Number(limit), offset]
      ),
      query(
        `SELECT COUNT(DISTINCT s.id) AS total
         FROM schools s WHERE ${where.join(' AND ')}`,
        params
      ),
    ]);

    res.json({
      success:  true,
      district: req.deoDistrict,
      data:     rows,
      pagination: { total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / Number(limit)) },
    });
  } catch (err) {
    console.error('[districtBabyeyi/schools/list]', err.message);
    res.status(500).json({ success: false, message: 'Failed to load schools' });
  }
});

// ════════════════════════════════════════════════════════════════
// GET /api/district/babyeyi/deo-assets — load saved DEO signature & stamp (for reuse on approve/reject)
// ════════════════════════════════════════════════════════════════
router.get('/deo-assets', async (req, res) => {
  try {
    await ensureDeoUserAssetColumns();
    const stored = await resolveDeoAssets(req.deoUser.id);
    let logo_url = null;
    try {
      const [[r]] = await query(
        `SELECT s.logo_url FROM users u LEFT JOIN schools s ON s.id = u.school_id WHERE u.id = ? LIMIT 1`,
        [req.deoUser.id]
      );
      logo_url = r?.logo_url || null;
    } catch (e) {
      if (e.code !== 'ER_BAD_FIELD_ERROR') throw e;
    }
    res.json({
      success: true,
      data: {
        signature_url: stored.sig || null,
        stamp_url:     stored.stamp || null,
        logo_url,
      },
    });
  } catch (err) {
    console.error('[districtBabyeyi/deo-assets GET]', err.code, err.message);
    res.status(500).json({ success: false, message: 'Failed to load DEO assets' });
  }
});

// ════════════════════════════════════════════════════════════════
// POST /api/district/babyeyi/deo-assets — save DEO signature & stamp (first time or change)
// ════════════════════════════════════════════════════════════════
router.post('/deo-assets', deoUpload, async (req, res) => {
  try {
    await ensureDeoUserAssetColumns();
    const deoId = req.deoUser.id;
    const files = req.files || {};
    const sigFile   = files.deo_signature?.[0];
    const stampFile = files.deo_stamp?.[0];
    const sigPath   = sigFile   ? deoAssetPublicUrl(sigFile.filename)   : null;
    const stampPath = stampFile ? deoAssetPublicUrl(stampFile.filename) : null;

    if (!sigPath && !stampPath) {
      const stored = await resolveDeoAssets(deoId);
      return res.json({
        success: true,
        message: 'No new signature or stamp uploaded. Existing DEO assets are kept.',
        data: {
          signature_url: stored.sig || null,
          stamp_url:     stored.stamp || null,
        },
      });
    }

    if (sigPath && stampPath) {
      await query('UPDATE users SET signature_url = ?, stamp_url = ? WHERE id = ?', [sigPath, stampPath, deoId]);
    } else if (sigPath) {
      await query('UPDATE users SET signature_url = ? WHERE id = ?', [sigPath, deoId]);
    } else {
      await query('UPDATE users SET stamp_url = ? WHERE id = ?', [stampPath, deoId]);
    }

    const stored = await resolveDeoAssets(deoId);
    res.json({
      success: true,
      message: 'DEO authorization assets saved. They will be used when you approve/reject or send to NESA.',
      data: {
        signature_url: stored.sig || sigPath || null,
        stamp_url:     stored.stamp || stampPath || null,
      },
    });
  } catch (err) {
    console.error('[districtBabyeyi/POST deo-assets]', err.code, err.message);
    res.status(500).json({ success: false, message: err.message || 'Failed to save assets' });
  }
});

// ════════════════════════════════════════════════════════════════
// Settings, notifications, web push & profile (MUST be before /:id)
// ════════════════════════════════════════════════════════════════
router.get('/settings', async (req, res) => {
  try {
    const prefs = await getDeoPrefs(req.deoUser.id);
    res.json({
      success: true,
      data: {
        email: req.deoUser.email,
        fullName: req.deoUser.fullName,
        photo: req.deoUser.photo || null,
        district: req.deoDistrict,
        province: req.deoProvince || null,
        ...prefs,
      },
    });
  } catch (err) {
    console.error('[districtBabyeyi/settings GET]', err.message);
    res.status(500).json({ success: false, message: 'Failed to load settings' });
  }
});

router.patch('/settings', async (req, res) => {
  try {
    const userId = req.deoUser.id;
    const body = req.body || {};

    if (body.email != null) {
      const email = String(body.email).trim().toLowerCase();
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({ success: false, message: 'Valid email is required' });
      }
      const [dupRows] = await query(
        `SELECT id FROM users WHERE email = ? AND id != ? AND deleted_at IS NULL LIMIT 1`,
        [email, userId]
      );
      if (dupRows?.[0]) {
        return res.status(409).json({ success: false, message: 'Email is already in use' });
      }
      await query(`UPDATE users SET email = ? WHERE id = ?`, [email, userId]);
      req.deoUser.email = email;
    }

    const prefs = await getDeoPrefs(userId);
    await saveDeoPrefs(userId, {
      emailNotifications: body.emailNotifications != null ? !!body.emailNotifications : prefs.emailNotifications,
      pushNotifications: body.pushNotifications != null ? !!body.pushNotifications : prefs.pushNotifications,
      inAppNotifications: body.inAppNotifications != null ? !!body.inAppNotifications : prefs.inAppNotifications,
      darkMode: body.darkMode != null ? !!body.darkMode : prefs.darkMode,
      defaultAcademicYear: body.defaultAcademicYear ?? body.default_academic_year ?? prefs.defaultAcademicYear ?? '',
      defaultTerm: body.defaultTerm ?? body.default_term ?? prefs.defaultTerm ?? '',
    });

    const updated = await getDeoPrefs(userId);
    res.json({
      success: true,
      message: 'Settings saved',
      data: {
        email: req.deoUser.email,
        fullName: req.deoUser.fullName,
        photo: req.deoUser.photo || null,
        district: req.deoDistrict,
        ...updated,
      },
    });
  } catch (err) {
    console.error('[districtBabyeyi/settings PATCH]', err.message);
    res.status(500).json({ success: false, message: 'Failed to save settings' });
  }
});

router.post('/profile/photo', profilePhotoUpload, async (req, res) => {
  try {
    if (!req.file?.filename) {
      return res.status(400).json({ success: false, message: 'No image file uploaded' });
    }
    const photoPath = '/uploads/profile-photos/' + req.file.filename;
    await promisePool.query('UPDATE users SET photo = ? WHERE id = ?', [photoPath, req.deoUser.id]);
    req.deoUser.photo = photoPath;
    if (req.session?.user) req.session.user.photo = photoPath;
    res.json({
      success: true,
      message: 'Profile photo updated',
      data: { photo: photoPath },
    });
  } catch (err) {
    console.error('[districtBabyeyi/profile/photo]', err.message);
    res.status(500).json({ success: false, message: err.message || 'Failed to upload photo' });
  }
});

router.get('/notifications', async (req, res) => {
  try {
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 40));
    const [items, unread] = await Promise.all([
      listNotificationsForUser(req.deoUser.id, limit),
      countUnread(req.deoUser.id),
    ]);
    res.json({ success: true, data: items, unread });
  } catch (err) {
    console.error('[districtBabyeyi/notifications]', err.message);
    res.status(500).json({ success: false, message: 'Failed to load notifications' });
  }
});

router.patch('/notifications/:id/read', async (req, res) => {
  try {
    await query(
      `UPDATE staff_portal_notifications SET is_read = 1 WHERE id = ? AND user_id = ?`,
      [req.params.id, req.deoUser.id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to mark read' });
  }
});

router.post('/notifications/read-all', async (req, res) => {
  try {
    await query(
      `UPDATE staff_portal_notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0`,
      [req.deoUser.id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to mark all read' });
  }
});

router.get('/push/vapid-key', (_req, res) => {
  if (!isWebPushConfigured()) {
    return res.json({ success: true, publicKey: null, configured: false });
  }
  res.json({ success: true, publicKey: getVapidPublicKey(), configured: true });
});

router.post('/push/subscribe', async (req, res) => {
  try {
    const sub = req.body?.subscription;
    if (!sub?.endpoint) {
      return res.status(400).json({ success: false, message: 'Invalid subscription' });
    }
    await upsertSubscription(req.deoUser.id, sub);
    res.json({ success: true, message: 'Push subscription saved' });
  } catch (err) {
    res.status(err.status || 500).json({ success: false, message: err.message || 'Subscribe failed' });
  }
});

router.post('/push/unsubscribe', async (req, res) => {
  try {
    await removeSubscription(req.deoUser.id, req.body?.endpoint);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Unsubscribe failed' });
  }
});

// ════════════════════════════════════════════════════════════════
// GET /api/district/babyeyi/:id  (numeric babyeyi id only)
// ════════════════════════════════════════════════════════════════
router.get('/:id', async (req, res) => {
  try {
    if (!/^\d+$/.test(String(req.params.id || ''))) {
      return res.status(404).json({ success: false, message: 'Not found' });
    }
    const district = req.deoDistrict;

    const [rows] = await query(
      `SELECT * FROM school_babyeyi
       WHERE id = ? AND ${districtMatch('school_district')} AND is_active = 1
       LIMIT 1`,
      [req.params.id, district]
    );

    if (!rows.length) {
      return res.status(404).json({ success: false, message: 'Document not found in your district.' });
    }

    const b = normalise(rows[0]);

    const [[payments], [studentReqs], [classReqsRaw], [signatures], [increaseReq]] = await Promise.all([
      query('SELECT * FROM babyeyi_payments WHERE babyeyi_id = ? ORDER BY sort_order', [b.id]),
      query('SELECT * FROM babyeyi_student_requirements WHERE babyeyi_id = ? ORDER BY sort_order', [b.id]),
      query(
        `SELECT id, COALESCE(item, information) AS item, details, COALESCE(sort_order, 0) AS sort_order
         FROM babyeyi_class_requirements
         WHERE babyeyi_id = ? ORDER BY COALESCE(sort_order, 0)`,
        [b.id]
      ),
      query('SELECT * FROM babyeyi_signatures WHERE babyeyi_id = ?', [b.id]),
      query(
        `SELECT ir.*
         FROM babyeyi_increase_requests ir
         WHERE ir.babyeyi_id = ?
         LIMIT 1`,
        [b.id]
      ),
    ]);

    res.json({
      success: true,
      data: {
        ...b,
        payments,
        student_requirements: studentReqs,
        class_requirements:   classReqsRaw,
        signatures:           signatures[0] || null,
        increase_request:     increaseReq[0] || null,
      },
    });
  } catch (err) {
    console.error('[districtBabyeyi/:id]', err.message);
    res.status(500).json({ success: false, message: 'Failed to load document' });
  }
});

// ════════════════════════════════════════════════════════════════
// PATCH /api/district/babyeyi/:id/approve
// ✅ v6: ensureIncreaseRequest() guarantees a row exists before UPDATE
// ════════════════════════════════════════════════════════════════
router.patch('/:id/approve', deoUpload, async (req, res) => {
  try {
    const district = req.deoDistrict;
    const deoId    = req.deoUser.id;
    const files    = req.files || {};

    const [rows] = await query(
      `SELECT id, status, school_name FROM school_babyeyi WHERE id = ? AND ${districtMatch('school_district')} AND is_active = 1 LIMIT 1`,
      [req.params.id, district]
    );
    if (!rows.length) {
      return res.status(404).json({ success: false, message: 'Document not found in your district.' });
    }

    // Ensure the increase_request row exists (v6 fix, FIX B applied inside)
    await ensureIncreaseRequest(req.params.id, district, deoId);

    const sigFile   = files.deo_signature?.[0];
    const stampFile = files.deo_stamp?.[0];
    const sigPath   = sigFile   ? deoAssetPublicUrl(sigFile.filename)   : null;
    const stampPath = stampFile ? deoAssetPublicUrl(stampFile.filename) : null;

    let resolvedSigPath = sigPath, resolvedStampPath = stampPath;
    if (!resolvedSigPath || !resolvedStampPath) {
      const stored = await resolveDeoAssets(deoId);
      if (!resolvedSigPath)   resolvedSigPath   = stored.sig;
      if (!resolvedStampPath) resolvedStampPath = stored.stamp;
    }

    if (sigPath || stampPath) {
      await ensureDeoUserAssetColumns();
      if (sigPath && stampPath) {
        await query('UPDATE users SET signature_url = ?, stamp_url = ? WHERE id = ?', [sigPath, stampPath, deoId]);
      } else if (sigPath) {
        await query('UPDATE users SET signature_url = ? WHERE id = ?', [sigPath, deoId]);
      } else if (stampPath) {
        await query('UPDATE users SET stamp_url = ? WHERE id = ?', [stampPath, deoId]);
      }
    }

    await query('UPDATE school_babyeyi SET status = ? WHERE id = ?', ['approved', req.params.id]);

    await query(
      `UPDATE babyeyi_increase_requests
       SET nesa_status        = 'approved',
           deo_id             = ?,
           deo_notes          = ?,
           deo_reviewed_at    = NOW(),
           reviewed_at        = NOW(),
           reviewed_by        = ?,
           district           = COALESCE(NULLIF(district,''), ?),
           deo_signature_path = COALESCE(?, deo_signature_path),
           deo_signature_name = COALESCE(?, deo_signature_name),
           deo_stamp_path     = COALESCE(?, deo_stamp_path),
           deo_stamp_name     = COALESCE(?, deo_stamp_name)
       WHERE babyeyi_id = ?`,
      [
        deoId,
        req.body?.notes || null,
        deoId,
        district,
        resolvedSigPath,
        sigFile?.originalname   || null,
        resolvedStampPath,
        stampFile?.originalname || null,
        req.params.id,
      ]
    );

    console.log(`[districtBabyeyi] DEO ${deoId} (${district}) APPROVED babyeyi ${req.params.id}`);
    res.json({ success: true, message: `Babyeyi approved — ${district}`, deo_signature_path: resolvedSigPath, deo_stamp_path: resolvedStampPath });
  } catch (err) {
    console.error('[districtBabyeyi/approve]', err.message);
    res.status(500).json({ success: false, message: 'Failed to approve' });
  }
});

// ════════════════════════════════════════════════════════════════
// PATCH /api/district/babyeyi/:id/reject
// ✅ v6: ensureIncreaseRequest() guarantees a row exists before UPDATE
// ════════════════════════════════════════════════════════════════
router.patch('/:id/reject', deoUpload, async (req, res) => {
  try {
    const district = req.deoDistrict;
    const deoId    = req.deoUser.id;
    const files    = req.files || {};
    const body     = req.body || {};

    const [rows] = await query(
      `SELECT id FROM school_babyeyi WHERE id = ? AND ${districtMatch('school_district')} AND is_active = 1 LIMIT 1`,
      [req.params.id, district]
    );
    if (!rows.length) {
      return res.status(404).json({ success: false, message: 'Document not found in your district.' });
    }

    // Accept rejection reason from common body keys (JSON or multipart form).
    // If none is provided, fall back to a generic message instead of failing.
    const rawNotes = body.notes ?? body.rejection_reason ?? body.reason ?? body.comment ?? '';
    const notes = String(rawNotes || '').trim() || 'Rejected by DEO';

    await ensureIncreaseRequest(req.params.id, district, deoId);

    const sigFile   = files.deo_signature?.[0];
    const stampFile = files.deo_stamp?.[0];
    const sigPath   = sigFile   ? deoAssetPublicUrl(sigFile.filename)   : null;
    const stampPath = stampFile ? deoAssetPublicUrl(stampFile.filename) : null;

    let resolvedSigPath = sigPath, resolvedStampPath = stampPath;
    if (!resolvedSigPath || !resolvedStampPath) {
      const stored = await resolveDeoAssets(deoId);
      if (!resolvedSigPath)   resolvedSigPath   = stored.sig;
      if (!resolvedStampPath) resolvedStampPath = stored.stamp;
    }

    if (sigPath || stampPath) {
      await ensureDeoUserAssetColumns();
      if (sigPath && stampPath) {
        await query('UPDATE users SET signature_url = ?, stamp_url = ? WHERE id = ?', [sigPath, stampPath, deoId]);
      } else if (sigPath) {
        await query('UPDATE users SET signature_url = ? WHERE id = ?', [sigPath, deoId]);
      } else if (stampPath) {
        await query('UPDATE users SET stamp_url = ? WHERE id = ?', [stampPath, deoId]);
      }
    }

    await query('UPDATE school_babyeyi SET status = ? WHERE id = ?', ['rejected', req.params.id]);

    const updateBase = `UPDATE babyeyi_increase_requests
       SET nesa_status        = 'rejected',
           deo_id             = ?,
           deo_notes          = ?,
           deo_reviewed_at    = NOW(),
           reviewed_at        = NOW(),
           reviewed_by        = ?,
           district           = COALESCE(NULLIF(?,''), district),
           deo_signature_path = COALESCE(?, deo_signature_path),
           deo_signature_name = COALESCE(?, deo_signature_name),
           deo_stamp_path     = COALESCE(?, deo_stamp_path),
           deo_stamp_name     = COALESCE(?, deo_stamp_name)`;
    const paramsBase = [
      deoId, notes, deoId, district,
      resolvedSigPath, sigFile?.originalname || null,
      resolvedStampPath, stampFile?.originalname || null,
    ];
    try {
      await query(
        `${updateBase},
           rejection_signature_path = COALESCE(?, rejection_signature_path),
           rejection_stamp_path     = COALESCE(?, rejection_stamp_path)
         WHERE babyeyi_id = ?`,
        [...paramsBase, resolvedSigPath, resolvedStampPath, req.params.id]
      );
    } catch (colErr) {
      if (colErr.code === 'ER_BAD_FIELD_ERROR') {
        await query(`${updateBase} WHERE babyeyi_id = ?`, [...paramsBase, req.params.id]);
      } else throw colErr;
    }

    console.log(`[districtBabyeyi] DEO ${deoId} (${district}) REJECTED babyeyi ${req.params.id}`);
    res.json({ success: true, message: 'Babyeyi rejected.', deo_signature_path: resolvedSigPath, deo_stamp_path: resolvedStampPath });
  } catch (err) {
    console.error('[districtBabyeyi/reject]', err.message);
    res.status(500).json({ success: false, message: err.message || 'Failed to reject' });
  }
});

// ════════════════════════════════════════════════════════════════
// PATCH /api/district/babyeyi/:id/recommend
//
// ✅ v6: ensureIncreaseRequest() creates the row if missing,
//        then UPDATE sets nesa_status = 'recommended'
//        so NESA can query it via /api/nesa/babyeyi/requests
//
// ✅ FIX B lives inside ensureIncreaseRequest() above —
//    the INSERT no longer references non-existent columns
//    (sector, province) in babyeyi_increase_requests.
// ════════════════════════════════════════════════════════════════
router.patch('/:id/recommend', deoUpload, async (req, res) => {
  try {
    const district = req.deoDistrict;
    const deoId    = req.deoUser.id;
    const files    = req.files || {};

    const [rows] = await query(
      `SELECT id FROM school_babyeyi WHERE id = ? AND ${districtMatch('school_district')} AND is_active = 1 LIMIT 1`,
      [req.params.id, district]
    );
    if (!rows.length) {
      return res.status(404).json({ success: false, message: 'Document not found in your district.' });
    }

    // Creates the row if it doesn't exist (FIX B lives inside here)
    const reqRowId = await ensureIncreaseRequest(req.params.id, district, deoId);
    if (!reqRowId) {
      return res.status(500).json({ success: false, message: 'Could not resolve increase request record.' });
    }

    const sigFile   = files.deo_signature?.[0];
    const stampFile = files.deo_stamp?.[0];
    const sigPath   = sigFile   ? deoAssetPublicUrl(sigFile.filename)   : null;
    const stampPath = stampFile ? deoAssetPublicUrl(stampFile.filename) : null;

    let resolvedSigPath = sigPath, resolvedStampPath = stampPath;
    if (!resolvedSigPath || !resolvedStampPath) {
      const stored = await resolveDeoAssets(deoId);
      if (!resolvedSigPath)   resolvedSigPath   = stored.sig;
      if (!resolvedStampPath) resolvedStampPath = stored.stamp;
    }

    if (sigPath || stampPath) {
      await ensureDeoUserAssetColumns();
      if (sigPath && stampPath) {
        await query('UPDATE users SET signature_url = ?, stamp_url = ? WHERE id = ?', [sigPath, stampPath, deoId]);
      } else if (sigPath) {
        await query('UPDATE users SET signature_url = ? WHERE id = ?', [sigPath, deoId]);
      } else if (stampPath) {
        await query('UPDATE users SET stamp_url = ? WHERE id = ?', [stampPath, deoId]);
      }
    }

    const [updateResult] = await query(
      `UPDATE babyeyi_increase_requests
       SET nesa_status        = 'recommended',
           deo_id             = ?,
           deo_notes          = ?,
           deo_reviewed_at    = NOW(),
           reviewed_at        = NOW(),
           reviewed_by        = ?,
           district           = COALESCE(NULLIF(district,''), ?),
           deo_signature_path = COALESCE(?, deo_signature_path),
           deo_signature_name = COALESCE(?, deo_signature_name),
           deo_stamp_path     = COALESCE(?, deo_stamp_path),
           deo_stamp_name     = COALESCE(?, deo_stamp_name)
       WHERE babyeyi_id = ?`,
      [
        deoId,
        req.body?.notes || null,
        deoId,
        district,
        resolvedSigPath,   sigFile?.originalname   || null,
        resolvedStampPath, stampFile?.originalname || null,
        req.params.id,
      ]
    );

    console.log(`[districtBabyeyi] DEO ${deoId} (${district}) RECOMMENDED babyeyi ${req.params.id} to NESA (affected: ${updateResult.affectedRows})`);

    const [[schoolRow]] = await query(
      `SELECT COALESCE(school_name, 'School') AS school_name FROM school_babyeyi WHERE id = ? LIMIT 1`,
      [req.params.id]
    );

    const { notifyNesaDeoRecommended } = require('./nesaNotifications');
    notifyNesaDeoRecommended({
      schoolName: schoolRow?.school_name || 'School',
      district,
      babyeyiId: Number(req.params.id),
      requestId: reqRowId,
    }).catch((e) => console.warn('[districtBabyeyi] NESA notify:', e.message));

    res.json({
      success:  true,
      message:  `Increase request recommended to NESA by ${district} DEO.`,
      district: req.deoDistrict,
      request_row_id: reqRowId,
      deo_signature_path: resolvedSigPath,
      deo_stamp_path:     resolvedStampPath,
    });
  } catch (err) {
    console.error('[districtBabyeyi/recommend]', err.message);
    res.status(500).json({ success: false, message: 'Failed to recommend' });
  }
});

module.exports = router;