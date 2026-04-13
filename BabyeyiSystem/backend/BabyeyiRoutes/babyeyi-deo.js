// ================================================================
// routes/BabyeyiRoutes/babyeyi-deo.js  — v5 FIXED
// KEY FIXES:
//  1. Removed deo_sectors table dependency entirely
//  2. DEO district resolved: JWT → users table → query params
//  3. LEFT JOINs so requests with NULL school_id still appear
//  4. COALESCE on school_name/sector/district from both tables
//  5. Added GET /api/babyeyi/schools endpoint (for SchoolsView)
//  6. Added GET /api/babyeyi/monitoring endpoint (for MonitoringView)
//  7. Stats endpoint fully rewritten
//  8. FIX: s.school_type → COALESCE(s.school_category, '') in all queries
//          (schools table has school_category, not school_type)
// ================================================================

const express = require('express');
const router  = express.Router();
const multer  = require('multer');
const path    = require('path');
const fs      = require('fs');
const db      = require('../config/database');

const UPLOAD_DIR = 'uploads/babyeyi/deo/';
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext  = path.extname(file.originalname);
    const base = path.basename(file.originalname, ext).replace(/\s+/g, '-');
    cb(null, `${base}-${Date.now()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok = ['application/pdf','image/png','image/jpeg','image/jpg'].includes(file.mimetype);
    ok ? cb(null, true) : cb(new Error('Only PDF and images allowed'));
  },
}).fields([
  { name: 'approval_letter',      maxCount: 1 },
  { name: 'deo_signature',        maxCount: 1 },
  { name: 'deo_stamp',            maxCount: 1 },
  { name: 'rejection_letter',     maxCount: 1 },
  { name: 'rejection_signature',  maxCount: 1 },
  { name: 'rejection_stamp',      maxCount: 1 },
]);

// ── DB helper — handles both mysql2/promise and promisePool ──
const q = async (sql, params = []) => {
  const result = await db.query(sql, params);
  // mysql2 promise pool returns [rows, fields]; raw pool returns rows
  if (Array.isArray(result) && Array.isArray(result[0])) return result[0];
  return result;
};

const getIp = req =>
  req.headers['x-forwarded-for']?.split(',')[0].trim() ||
  req.socket?.remoteAddress || 'unknown';

// ── Resolve DEO's district/sector from JWT, DB, or query params ──
const resolveDeoFilter = async (req) => {
  const deoId     = req.user?.id       || null;
  const qDistrict = req.query.district || null;
  const qSector   = req.query.sector   || null;

  // 1. JWT payload already has district (if your auth middleware enriches it)
  if (req.user?.district) {
    return { district: req.user.district, sector: req.user.sector || qSector, deoId };
  }

  // 2. Look up from users table (district stored when DEO was created by NESA admin)
  if (deoId) {
    try {
      const rows = await q(
        'SELECT district, sector FROM users WHERE id = ? AND deleted_at IS NULL LIMIT 1',
        [deoId]
      );
      if (rows[0]?.district) {
        return { district: rows[0].district, sector: rows[0].sector || qSector, deoId };
      }
    } catch (e) {
      console.warn('[resolveDeoFilter] users lookup failed:', e.message);
    }
  }

  // 3. Fall back to query params sent explicitly from frontend
  return { district: qDistrict, sector: qSector, deoId };
};

// ── Build location WHERE snippet ──────────────────────────
const buildLocFilter = (district, sector, sAlias = 's', rAlias = 'r') => {
  if (!district) return { sql: '', params: [] };
  if (sector) {
    return {
      sql: `AND ((${sAlias}.district = ? AND ${sAlias}.sector = ?)
               OR (${rAlias}.district = ? AND ${rAlias}.sector = ? AND ${sAlias}.id IS NULL))`,
      params: [district, sector, district, sector],
    };
  }
  return {
    sql: `AND (${sAlias}.district = ? OR (${rAlias}.district = ? AND ${sAlias}.id IS NULL))`,
    params: [district, district],
  };
};

// ════════════════════════════════════════════════════════════
// GET /api/babyeyi/requests
// FIX: replaced s.school_type with COALESCE(s.school_category, '')
//      Also fixed b.class → b.class_name, b.category → b.school_category,
//      b.level → b.education_level  (actual column names in school_babyeyi)
// ════════════════════════════════════════════════════════════
router.get('/requests', async (req, res) => {
  try {
    const { status, page = 1, limit = 50 } = req.query;
    const { district, sector } = await resolveDeoFilter(req);
    const offset = (Number(page) - 1) * Number(limit);

    const loc = buildLocFilter(district, sector);
    let whereSQL  = `WHERE 1=1 ${loc.sql}`;
    const params  = [...loc.params];

    if (status) { whereSQL += ' AND r.nesa_status = ?'; params.push(status); }

    const rows = await q(
      `SELECT
         r.*,
         COALESCE(s.school_name, r.school_name, CONCAT('School #', r.school_id)) AS school_name,
         COALESCE(s.school_code, '')                    AS school_code,
         COALESCE(s.sector,   r.sector,   '')           AS sector,
         COALESCE(s.district, r.district, '')           AS district,
         COALESCE(s.school_category, '')                AS school_type,
         b.class_name                                   AS class,
         b.term,
         b.academic_year,
         b.school_category                              AS category,
         b.education_level                              AS level,
         COALESCE(b.total_fee, b.total_amount, 0)       AS total_fee,
         b.nesa_limit
       FROM babyeyi_increase_requests r
       LEFT JOIN school_babyeyi b ON b.id = r.babyeyi_id
       LEFT JOIN schools        s ON s.id = b.school_id
       ${whereSQL}
       ORDER BY COALESCE(r.submitted_at, r.created_at) DESC
       LIMIT ? OFFSET ?`,
      [...params, Number(limit), offset]
    );

    const cnt = await q(
      `SELECT COUNT(*) AS total
       FROM babyeyi_increase_requests r
       LEFT JOIN school_babyeyi b ON b.id = r.babyeyi_id
       LEFT JOIN schools        s ON s.id = b.school_id
       ${whereSQL}`,
      params
    );

    res.json({
      success: true,
      data: rows,
      pagination: {
        total: cnt[0]?.total || 0, page: Number(page), limit: Number(limit),
        pages: Math.ceil((cnt[0]?.total || 0) / Number(limit)),
      },
    });
  } catch (err) {
    console.error('[babyeyi/requests GET]', err);
    res.status(500).json({ success: false, message: 'Failed to fetch requests', error: err.message });
  }
});

// ════════════════════════════════════════════════════════════
// GET /api/babyeyi/schools  (used by SchoolsView)
// ════════════════════════════════════════════════════════════
router.get('/schools', async (req, res) => {
  try {
    const { district, sector } = await resolveDeoFilter(req);
    const qDistrict = req.query.district || district;
    const qSector   = req.query.sector   || sector;

    const conds = ['s.is_active = 1'];
    const params = [];
    if (qDistrict) { conds.push('s.district = ?'); params.push(qDistrict); }
    if (qSector)   { conds.push('s.sector = ?');   params.push(qSector);   }

    const rows = await q(
      `SELECT s.*,
              COUNT(DISTINCT b.id)  AS total_babyeyi_records,
              SUM(CASE WHEN b.exceeds_limit = 1 THEN 1 ELSE 0 END) AS exceeds_count,
              COUNT(DISTINCT r.id)  AS total_requests,
              SUM(CASE WHEN r.nesa_status IS NULL OR r.nesa_status = '' OR r.nesa_status = 'pending'
                        THEN 1 ELSE 0 END) AS pending_requests
       FROM schools s
       LEFT JOIN school_babyeyi b ON b.school_id = s.id AND b.is_active = 1
       LEFT JOIN babyeyi_increase_requests r ON r.babyeyi_id = b.id
       WHERE ${conds.join(' AND ')}
       GROUP BY s.id
       ORDER BY s.school_name ASC`,
      params
    );

    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('[babyeyi/schools GET]', err);
    res.status(500).json({ success: false, message: 'Failed to fetch schools', error: err.message });
  }
});

// ════════════════════════════════════════════════════════════
// GET /api/babyeyi/monitoring  (used by MonitoringView)
// FIX: replaced s.school_type with COALESCE(s.school_category, '')
// ════════════════════════════════════════════════════════════
router.get('/monitoring', async (req, res) => {
  try {
    const { district, sector } = await resolveDeoFilter(req);
    const qDistrict = req.query.district || district;
    const qSector   = req.query.sector   || sector;
    const page   = Number(req.query.page  || 1);
    const limit  = Number(req.query.limit || 100);
    const offset = (page - 1) * limit;

    const conds = ['b.is_active = 1'];
    const params = [];
    if (qDistrict) { conds.push('s.district = ?'); params.push(qDistrict); }
    if (qSector)   { conds.push('s.sector = ?');   params.push(qSector);   }
    const whereSQL = `WHERE ${conds.join(' AND ')}`;

    const rows = await q(
      `SELECT b.*,
              s.school_name,
              s.school_code,
              s.sector,
              s.district,
              COALESCE(s.school_category, '') AS school_type
       FROM school_babyeyi b
       JOIN schools s ON s.id = b.school_id
       ${whereSQL}
       ORDER BY b.exceeds_limit DESC, s.school_name ASC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    const cnt = await q(
      `SELECT COUNT(*) AS total FROM school_babyeyi b
       JOIN schools s ON s.id = b.school_id ${whereSQL}`,
      params
    );

    res.json({ success: true, data: rows, pagination: { total: cnt[0]?.total || 0, page, limit } });
  } catch (err) {
    console.error('[babyeyi/monitoring GET]', err);
    res.status(500).json({ success: false, message: 'Failed to fetch monitoring data', error: err.message });
  }
});

// ════════════════════════════════════════════════════════════
// GET /api/babyeyi/deo/stats
// ════════════════════════════════════════════════════════════
router.get('/deo/stats', async (req, res) => {
  try {
    const { district, sector } = await resolveDeoFilter(req);
    const qDistrict = req.query.district || district;
    const qSector   = req.query.sector   || sector;

    const schoolConds  = ['s.is_active = 1'];
    const schoolParams = [];
    if (qDistrict) { schoolConds.push('s.district = ?'); schoolParams.push(qDistrict); }
    if (qSector)   { schoolConds.push('s.sector = ?');   schoolParams.push(qSector);   }
    const schoolWhere = `WHERE ${schoolConds.join(' AND ')}`;

    const loc       = buildLocFilter(qDistrict, qSector);
    const reqWhere  = `WHERE 1=1 ${loc.sql}`;
    const reqParams = [...loc.params];

    const feeConds  = ['b.is_active = 1'];
    const feeParams = [];
    if (qDistrict) { feeConds.push('s.district = ?'); feeParams.push(qDistrict); }
    if (qSector)   { feeConds.push('s.sector = ?');   feeParams.push(qSector);   }

    const [ss, rs, fs] = await Promise.all([
      q(`SELECT COUNT(DISTINCT s.id) AS total_schools FROM schools s ${schoolWhere}`, schoolParams),
      q(`SELECT
           COUNT(*) AS total_requests,
           SUM(CASE WHEN r.nesa_status IS NULL OR r.nesa_status = '' OR r.nesa_status = 'pending' THEN 1 ELSE 0 END) AS pending,
           SUM(CASE WHEN r.nesa_status = 'approved'    THEN 1 ELSE 0 END) AS approved,
           SUM(CASE WHEN r.nesa_status = 'recommended' THEN 1 ELSE 0 END) AS recommended,
           SUM(CASE WHEN r.nesa_status = 'rejected'    THEN 1 ELSE 0 END) AS rejected
         FROM babyeyi_increase_requests r
         LEFT JOIN school_babyeyi b ON b.id = r.babyeyi_id
         LEFT JOIN schools        s ON s.id = b.school_id
         ${reqWhere}`, reqParams),
      q(`SELECT COUNT(*) AS total_records, SUM(b.exceeds_limit) AS exceeds_count, AVG(b.total_fee) AS avg_fee
         FROM school_babyeyi b JOIN schools s ON s.id = b.school_id
         WHERE ${feeConds.join(' AND ')}`, feeParams),
    ]);

    const totalSchools     = Number(ss[0]?.total_schools || 0);
    const schoolsExceeding = Number(fs[0]?.exceeds_count || 0);
    const complianceRate   = totalSchools > 0
      ? Math.round(((totalSchools - schoolsExceeding) / totalSchools) * 100) : 100;

    res.json({
      success: true,
      data: {
        total_schools: totalSchools,
        total_requests:   Number(rs[0]?.total_requests || 0),
        pending_requests: Number(rs[0]?.pending        || 0),
        approved:         Number(rs[0]?.approved       || 0),
        recommended:      Number(rs[0]?.recommended    || 0),
        rejected:         Number(rs[0]?.rejected       || 0),
        total_babyeyi:    Number(fs[0]?.total_records  || 0),
        schools_exceeding: schoolsExceeding,
        avg_fee:          Math.round(fs[0]?.avg_fee    || 0),
        compliance_rate:  complianceRate,
        district: qDistrict, sector: qSector,
      },
    });
  } catch (err) {
    console.error('[babyeyi/deo/stats]', err);
    res.status(500).json({ success: false, message: 'Failed to fetch DEO stats', error: err.message });
  }
});

// ════════════════════════════════════════════════════════════
// PUT /api/babyeyi/requests/:id/review
// ════════════════════════════════════════════════════════════
router.put('/requests/:id/review', (req, res) => {
  upload(req, res, async (uploadErr) => {
    if (uploadErr) return res.status(400).json({ success: false, message: uploadErr.message });
    try {
      const { id } = req.params;
      const body = req.body, files = req.files || {};
      const deoId = body.reviewed_by || req.user?.id || null;
      const action = body.nesa_status;

      if (!['approved', 'recommended', 'rejected'].includes(action))
        return res.status(422).json({ success: false, message: 'nesa_status must be approved, recommended, or rejected' });
      if (!body.nesa_notes?.trim())
        return res.status(422).json({ success: false, message: 'nesa_notes is required' });
      if ((action === 'approved' || action === 'recommended') && !files.approval_letter?.[0])
        return res.status(422).json({ success: false, message: 'Approval letter is required' });
      if (action === 'rejected' && !files.rejection_letter?.[0])
        return res.status(422).json({ success: false, message: 'Rejection letter is required' });

      const existing = await q('SELECT * FROM babyeyi_increase_requests WHERE id = ?', [id]);
      if (!existing.length) return res.status(404).json({ success: false, message: 'Request not found' });
      if (['approved','recommended','rejected','nesa_rejected'].includes(existing[0].nesa_status))
        return res.status(409).json({ success: false, message: `Already reviewed: ${existing[0].nesa_status}` });

      const fp = f => f ? `/${UPLOAD_DIR}${f.filename}` : null;
      const al=files.approval_letter?.[0], ds=files.deo_signature?.[0], dk=files.deo_stamp?.[0];
      const rl=files.rejection_letter?.[0], rs=files.rejection_signature?.[0], rk=files.rejection_stamp?.[0];

      await q(
        `UPDATE babyeyi_increase_requests SET
           nesa_status=?,nesa_notes=?,deo_notes=?,reviewed_at=NOW(),reviewed_by=?,deo_id=?,deo_reviewed_at=NOW(),
           approval_letter_path=?,approval_letter_name=?,deo_signature_path=?,deo_signature_name=?,
           deo_stamp_path=?,deo_stamp_name=?,rejection_letter_path=?,rejection_letter_name=?,
           rejection_signature_path=?,rejection_signature_name=?,rejection_stamp_path=?,rejection_stamp_name=?
         WHERE id=?`,
        [action,body.nesa_notes,body.deo_notes||null,deoId,deoId,
         fp(al),al?.originalname||null,fp(ds),ds?.originalname||null,fp(dk),dk?.originalname||null,
         fp(rl),rl?.originalname||null,fp(rs),rs?.originalname||null,fp(rk),rk?.originalname||null,id]
      );

      try {
        await q(
          `INSERT INTO deo_action_log(request_id,deo_id,action,comment,deo_notes,
             approval_letter_path,approval_letter_name,deo_signature_path,deo_signature_name,
             deo_stamp_path,deo_stamp_name,rejection_letter_path,rejection_letter_name,
             rejection_signature_path,rejection_signature_name,rejection_stamp_path,rejection_stamp_name,ip_address)
           VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
          [id,deoId,action==='approved'?'district_approved':action==='recommended'?'approved':'rejected',
           body.nesa_notes,body.deo_notes||null,
           fp(al),al?.originalname||null,fp(ds),ds?.originalname||null,fp(dk),dk?.originalname||null,
           fp(rl),rl?.originalname||null,fp(rs),rs?.originalname||null,fp(rk),rk?.originalname||null,getIp(req)]
        );
      } catch(e){ console.warn('[deo_action_log]', e.message); }

      try { await q('UPDATE school_babyeyi SET status=? WHERE id=?',[action,existing[0].babyeyi_id]); }
      catch(e){ console.warn('[school_babyeyi]', e.message); }

      const updated = await q(
        `SELECT r.*,
                COALESCE(s.school_name, r.school_name, '') AS school_name,
                COALESCE(s.school_code, '')                AS school_code,
                COALESCE(s.sector,   r.sector,   '')       AS sector,
                COALESCE(s.district, r.district, '')       AS district,
                COALESCE(s.school_category, '')            AS school_type
         FROM babyeyi_increase_requests r
         LEFT JOIN school_babyeyi b ON b.id = r.babyeyi_id
         LEFT JOIN schools s ON s.id = b.school_id
         WHERE r.id = ?`, [id]
      );

      res.json({
        success: true,
        message: { approved: 'District approved.', recommended: 'Forwarded to NESA.', rejected: 'Rejected.' }[action],
        data: updated[0] || null,
      });
    } catch(err){
      console.error('[review]', err);
      res.status(500).json({ success: false, message: 'Review failed', error: err.message });
    }
  });
});

module.exports = router;