// ================================================================
// routes/BabyeyiRoutes/nesaBabyeyi.js  — v1
//
// NESA-level routes for Babyeyi fee increase request management.
// Handles:
//   GET  /api/nesa/babyeyi/stats              — national overview stats
//   GET  /api/nesa/babyeyi/requests           — all increase requests (filterable)
//   GET  /api/nesa/babyeyi/requests/:id       — single request detail
//   GET  /api/nesa/babyeyi/violations         — all schools exceeding limits
//   PATCH /api/nesa/babyeyi/requests/:id/approve  — NESA approve
//   PATCH /api/nesa/babyeyi/requests/:id/reject   — NESA reject
//
// Auth: uses nesaAuth middleware (role_code IN ('NESA_ADMIN','NESA_OFFICER','SUPER_ADMIN'))
//
// Mount in server.js:
//   const nesaBabyeyi = require('./routes/BabyeyiRoutes/nesaBabyeyi');
//   app.use('/api/nesa/babyeyi', nesaBabyeyi);
// ================================================================

'use strict';

const express = require('express');
const router  = express.Router();
const { promisePool } = require('../config/database');

// ── DB helper ─────────────────────────────────────────────────
const query = (sql, params = []) => promisePool.query(sql, params);

// ────────────────────────────────────────────────────────────────
// nesaAuth middleware
// Allows: NESA_ADMIN, NESA_OFFICER, SUPER_ADMIN, FULL_SYSTEM_CONTROLLER
// Reads identity from req.user (populated by server.js session hydration)
// ────────────────────────────────────────────────────────────────
const nesaAuth = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Not authenticated — please log in.' });
  }
  const allowed = ['NESA_ADMIN', 'NESA_OFFICER', 'SUPER_ADMIN', 'FULL_SYSTEM_CONTROLLER', 'ADMIN'];
  const code    = (req.user.role_code || '').toUpperCase();
  if (!allowed.includes(code)) {
    return res.status(403).json({ success: false, message: `Access denied. Role '${code}' is not permitted.` });
  }
  req.nesaUser = req.user;
  next();
};

router.use(nesaAuth);

// ── Parse classes_json (multi-class Babyeyi: P2, P3 share one doc) ───────
const parseClassesJson = (v) => {
  if (!v) return [];
  if (Array.isArray(v)) return v;
  try { return typeof v === 'string' ? JSON.parse(v) : []; } catch { return []; }
};

// ── Row normaliser (maps DB columns → consistent shape) ───────
const normaliseRequest = (r) => {
  const classesArr = parseClassesJson(r.b_classes_json);
  const primaryClass = r.b_class_name || r.class_name || (classesArr[0]) || '—';
  const classes = classesArr.length ? classesArr : (primaryClass && primaryClass !== '—' ? [primaryClass] : []);
  return {
  // IDs
  id:                   r.id,
  babyeyi_id:           r.babyeyi_id,
  request_id:           r.id,

  // School info (from JOIN)
  school_name:          r.b_school_name  || r.school_name  || `School #${r.school_id  || '?'}`,
  school_id:            r.b_school_id    || r.school_id    || null,
  district:             r.b_district     || r.district     || '—',
  sector:               r.b_sector       || r.sector       || '—',
  province:             r.b_province     || r.province     || '—',
  school_category:      r.b_category     || r.school_category || '—',
  education_level:      r.b_level        || r.education_level || '—',
  class_name:           primaryClass,
  classes,  // e.g. ['P2','P3'] when Babyeyi is shared across classes
  term:                 r.b_term         || r.term         || '—',
  academic_year:        r.b_academic_year|| r.academic_year|| '—',

  // Fees
  total_fee:            Number(r.b_total_fee   ?? r.total_fee   ?? 0),
  nesa_limit:           Number(r.b_nesa_limit  ?? r.nesa_limit  ?? 0),
  requested_amount:     Number(r.requested_amount ?? r.b_total_fee ?? r.total_fee ?? 0),
  current_limit:        Number(r.current_limit    ?? r.b_nesa_limit ?? r.nesa_limit ?? 0),

  // Status
  nesa_status:          r.nesa_status  || 'pending',
  reason:               r.reason       || r.description || '',

  // DEO review
  deo_id:               r.deo_id            || null,
  deo_notes:            r.deo_notes         || null,
  deo_reviewed_at:      r.deo_reviewed_at   || null,

  // NESA review
  nesa_notes:           r.nesa_notes        || null,
  nesa_reviewed_at:     r.nesa_reviewed_at  || null,
  nesa_reviewed_by:     r.nesa_reviewed_by  || null,

  // Documents
  parent_rep_doc_path:  r.parent_rep_doc_path  || null,
  parent_rep_doc_name:  r.parent_rep_doc_name  || null,
  budget_doc_path:      r.budget_doc_path      || null,
  budget_doc_name:      r.budget_doc_name      || null,
  deo_signature_path:   r.deo_signature_path   || null,
  deo_signature_name:   r.deo_signature_name   || null,
  deo_stamp_path:       r.deo_stamp_path       || null,
  deo_stamp_name:       r.deo_stamp_name       || null,
  approval_letter_path: r.approval_letter_path || null,
  approval_letter_name: r.approval_letter_name || null,
  rejection_letter_path:r.rejection_letter_path|| null,
  rejection_letter_name:r.rejection_letter_name|| null,

  // Timestamps
  submitted_at:  r.submitted_at  || r.created_at || null,
  created_at:    r.created_at    || null,
  updated_at:    r.updated_at    || null,
  };
};

// ════════════════════════════════════════════════════════════════
// GET /api/nesa/babyeyi/stats
// National aggregate overview
// ════════════════════════════════════════════════════════════════
router.get('/stats', async (req, res) => {
  try {
    // ── Request-level stats ───────────────────────────────────
    const [[reqStats]] = await query(`
      SELECT
        COUNT(*)                                              AS total_requests,
        COALESCE(SUM(ir.nesa_status = 'pending'),         0) AS pending,
        COALESCE(SUM(ir.nesa_status = 'recommended'),     0) AS recommended,
        COALESCE(SUM(ir.nesa_status = 'approved'),        0) AS approved,
        COALESCE(SUM(ir.nesa_status = 'rejected'),        0) AS rejected,
        COALESCE(SUM(ir.nesa_status = 'nesa_rejected'),   0) AS nesa_rejected,
        COUNT(DISTINCT ir.district)                           AS districts_count
      FROM babyeyi_increase_requests ir
    `);

    // ── Babyeyi-level violation stats (schools exceeding limit) ─
    const [[violStats]] = await query(`
      SELECT
        COUNT(*)                                              AS total_babyeyi,
        COALESCE(SUM(b.exceeds_limit = 1),                0) AS exceeds_count,
        COALESCE(SUM(b.is_active = 1),                    0) AS active_count,
        COUNT(DISTINCT b.school_id)                           AS schools_count,
        COUNT(DISTINCT b.school_district)                     AS districts_with_babyeyi
      FROM school_babyeyi b
      WHERE b.is_active = 1
    `);

    // ── Per-district breakdown for requests ───────────────────
    const [districtBreakdown] = await query(`
      SELECT
        COALESCE(ir.district, 'Unknown')              AS district,
        COUNT(*)                                       AS total,
        COALESCE(SUM(ir.nesa_status='recommended'), 0) AS recommended,
        COALESCE(SUM(ir.nesa_status='approved'),    0) AS approved,
        COALESCE(SUM(ir.nesa_status='pending'),     0) AS pending,
        COALESCE(SUM(ir.nesa_status='rejected'),    0) AS rejected
      FROM babyeyi_increase_requests ir
      GROUP BY ir.district
      ORDER BY total DESC
      LIMIT 30
    `);

    // ── Monthly trend (last 12 months of submissions) ─────────
  const [monthlyTrend] = await query(`
      SELECT
        DATE_FORMAT(ir.submitted_at, '%b %Y') AS label,
        DATE_FORMAT(ir.submitted_at, '%Y-%m') AS month_key,
        COUNT(*)                               AS total,
        COALESCE(SUM(ir.nesa_status='approved'), 0) AS approved
      FROM babyeyi_increase_requests ir
      WHERE ir.submitted_at >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
      GROUP BY month_key, label
      ORDER BY month_key ASC
    `);

    // ── Violations by district (from school_babyeyi) ──────────
    const [districtViolations] = await query(`
      SELECT
        COALESCE(b.school_district, 'Unknown')  AS label,
        COUNT(*)                                 AS value
      FROM school_babyeyi b
      WHERE b.exceeds_limit = 1 AND b.is_active = 1
      GROUP BY b.school_district
      ORDER BY value DESC
      LIMIT 10
    `);

    res.json({
      success: true,
      data: {
        ...reqStats,
        ...violStats,
        // combined pending for "needs action" count
        needs_action: Number(reqStats.pending || 0) + Number(reqStats.recommended || 0),
        district_breakdown:   districtBreakdown,
        monthly_trend:        monthlyTrend,
        district_violations:  districtViolations,
      },
    });
  } catch (err) {
    console.error('[nesaBabyeyi/stats]', err.message);
    res.status(500).json({ success: false, message: 'Failed to load NESA stats' });
  }
});

// ════════════════════════════════════════════════════════════════
// GET /api/nesa/babyeyi/analytics
// Filterable analytics: ?district=&sector=&academic_year=&term=
// Returns district_breakdown, district_violations, year_breakdown, monthly_trend, sector_breakdown
// ════════════════════════════════════════════════════════════════
router.get('/analytics', async (req, res) => {
  try {
    const { district, sector, academic_year, term } = req.query;

    const reqWhere = [];
    const reqParams = [];
    const bWhere = ['b.is_active = 1'];
    const bParams = [];

    if (district) {
      reqWhere.push('ir.district = ?');
      reqParams.push(district);
      bWhere.push('b.school_district = ?');
      bParams.push(district);
    }
    if (sector) {
      reqWhere.push('b.school_sector = ?');
      reqParams.push(sector);
      bWhere.push('b.school_sector = ?');
      bParams.push(sector);
    }
    if (academic_year) {
      reqWhere.push('b.academic_year = ?');
      reqParams.push(academic_year);
      bWhere.push('b.academic_year = ?');
      bParams.push(academic_year);
    }
    if (term) {
      reqWhere.push('b.term = ?');
      reqParams.push(term);
      bWhere.push('b.term = ?');
      bParams.push(term);
    }

    const reqWhereSQL = reqWhere.length ? `WHERE ${reqWhere.join(' AND ')}` : '';
    const bWhereSQL = `WHERE ${bWhere.join(' AND ')}`;

    // District breakdown (from requests, join babyeyi for filters)
    const [districtBreakdown] = await query(
      `SELECT
         COALESCE(ir.district, 'Unknown') AS district,
         COUNT(*) AS total,
         COALESCE(SUM(ir.nesa_status='recommended'), 0) AS recommended,
         COALESCE(SUM(ir.nesa_status='approved'), 0) AS approved,
         COALESCE(SUM(ir.nesa_status='pending'), 0) AS pending,
         COALESCE(SUM(ir.nesa_status IN ('rejected','nesa_rejected')), 0) AS rejected
       FROM babyeyi_increase_requests ir
       LEFT JOIN school_babyeyi b ON b.id = ir.babyeyi_id
       ${reqWhereSQL}
       GROUP BY ir.district
       ORDER BY total DESC
       LIMIT 30`,
      reqParams
    );

    // Violations by district (from school_babyeyi exceeds_limit)
    const [districtViolations] = await query(
      `SELECT
         COALESCE(b.school_district, 'Unknown') AS label,
         COUNT(*) AS value
       FROM school_babyeyi b
       ${bWhereSQL} AND b.exceeds_limit = 1
       GROUP BY b.school_district
       ORDER BY value DESC
       LIMIT 15`,
      bParams
    );

    // Increase requests by academic year
    const [yearBreakdown] = await query(
      `SELECT
         COALESCE(b.academic_year, '—') AS academic_year,
         COUNT(*) AS total,
         COALESCE(SUM(ir.nesa_status='approved'), 0) AS approved,
         COALESCE(SUM(ir.nesa_status IN ('pending','recommended')), 0) AS pending
       FROM babyeyi_increase_requests ir
       LEFT JOIN school_babyeyi b ON b.id = ir.babyeyi_id
       ${reqWhereSQL}
       GROUP BY b.academic_year
       ORDER BY b.academic_year DESC
       LIMIT 10`,
      reqParams
    );

    // Monthly trend (filtered)
    const [monthlyTrend] = await query(
      `SELECT
         DATE_FORMAT(ir.submitted_at, '%b %Y') AS label,
         DATE_FORMAT(ir.submitted_at, '%Y-%m') AS month_key,
         COUNT(*) AS total,
         COALESCE(SUM(ir.nesa_status='approved'), 0) AS approved
       FROM babyeyi_increase_requests ir
       LEFT JOIN school_babyeyi b ON b.id = ir.babyeyi_id
       ${reqWhereSQL} AND ir.submitted_at >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
       GROUP BY month_key, label
       ORDER BY month_key ASC`,
      reqParams
    );

    // Sector breakdown (from requests/violations)
    const [sectorBreakdown] = await query(
      `SELECT
         COALESCE(b.school_sector, 'Unknown') AS sector,
         COUNT(*) AS total
       FROM babyeyi_increase_requests ir
       LEFT JOIN school_babyeyi b ON b.id = ir.babyeyi_id
       ${reqWhereSQL}
       GROUP BY b.school_sector
       ORDER BY total DESC
       LIMIT 20`,
      reqParams
    );

    // Distinct districts/sectors/years/terms for filter dropdowns
    const [[districtsRow]] = await query(
      `SELECT GROUP_CONCAT(DISTINCT ir.district ORDER BY ir.district SEPARATOR ',') AS list FROM babyeyi_increase_requests ir WHERE ir.district IS NOT NULL AND ir.district != ''`
    );
    const [[sectorsRow]] = await query(
      `SELECT GROUP_CONCAT(DISTINCT b.school_sector ORDER BY b.school_sector SEPARATOR ',') AS list FROM school_babyeyi b WHERE b.school_sector IS NOT NULL AND b.school_sector != '' AND b.is_active = 1 LIMIT 1`
    );
    const [[yearsRow]] = await query(
      `SELECT GROUP_CONCAT(DISTINCT b.academic_year ORDER BY b.academic_year DESC SEPARATOR ',') AS list FROM school_babyeyi b WHERE b.academic_year IS NOT NULL AND b.is_active = 1 LIMIT 1`
    );

    const districtsList = (districtsRow?.list || '').split(',').filter(Boolean);
    const sectorsList = (sectorsRow?.list || '').split(',').filter(Boolean);
    const yearsList = (yearsRow?.list || '').split(',').filter(Boolean);
    const termsList = ['Term 1', 'Term 2', 'Term 3'];

    res.json({
      success: true,
      filters: { district: district || null, sector: sector || null, academic_year: academic_year || null, term: term || null },
      filterOptions: { districts: districtsList, sectors: sectorsList, academic_years: yearsList, terms: termsList },
      data: {
        district_breakdown: districtBreakdown,
        district_violations: districtViolations,
        year_breakdown: yearBreakdown,
        monthly_trend: monthlyTrend,
        sector_breakdown: sectorBreakdown,
      },
    });
  } catch (err) {
    console.error('[nesaBabyeyi/analytics]', err.message);
    res.status(500).json({ success: false, message: 'Failed to load analytics' });
  }
});

// ════════════════════════════════════════════════════════════════
// GET /api/nesa/babyeyi/requests
// All increase requests — filterable, paginated
// ?status=recommended|pending|approved|rejected|all
// ?district=GASABO
// ?search=school+name
// ?page=1&limit=20
// ════════════════════════════════════════════════════════════════
router.get('/requests', async (req, res) => {
  try {
    const {
      status,
      district,
      search,
      page  = 1,
      limit = 20,
    } = req.query;

    const where  = [];
    const params = [];

    // Status filter — "pending" tab should show both pending + recommended
    if (status && status !== 'all') {
      if (status === 'pending') {
        where.push(`ir.nesa_status IN ('pending','recommended')`);
      } else if (status === 'rejected') {
        where.push(`ir.nesa_status IN ('rejected','nesa_rejected')`);
      } else {
        where.push('ir.nesa_status = ?');
        params.push(status);
      }
    }

    if (district) {
      where.push('ir.district = ?');
      params.push(district);
    }

    if (search) {
      where.push(`(
        b.school_name LIKE ? OR
        ir.district   LIKE ? OR
        b.class_name  LIKE ? OR
        b.doc_id      LIKE ?
      )`);
      const like = `%${search}%`;
      params.push(like, like, like, like);
    }

    const whereSQL = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const offset   = (Number(page) - 1) * Number(limit);

    const [[rows], [[{ total }]]] = await Promise.all([
      query(
        `SELECT
           ir.*,
           b.school_name   AS b_school_name,
           b.school_id     AS b_school_id,
           b.school_district AS b_district,
           b.school_sector   AS b_sector,
           b.school_province AS b_province,
           b.school_category AS b_category,
           b.education_level AS b_level,
           b.class_name      AS b_class_name,
           b.classes_json    AS b_classes_json,
           b.term            AS b_term,
           b.academic_year   AS b_academic_year,
           b.total_fee       AS b_total_fee,
           b.nesa_limit      AS b_nesa_limit,
           b.doc_id,
           b.pdf_path,
           b.exceeds_limit
         FROM babyeyi_increase_requests ir
         LEFT JOIN school_babyeyi b ON b.id = ir.babyeyi_id
         ${whereSQL}
         ORDER BY
           FIELD(ir.nesa_status,'recommended','pending','approved','rejected','nesa_rejected'),
           ir.submitted_at DESC
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

    res.json({
      success: true,
      data: rows.map(normaliseRequest),
      pagination: {
        total,
        page:  Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (err) {
    console.error('[nesaBabyeyi/requests]', err.message);
    res.status(500).json({ success: false, message: 'Failed to load requests' });
  }
});

// ════════════════════════════════════════════════════════════════
// GET /api/nesa/babyeyi/requests/:id
// Single request — full detail including all document paths
// ════════════════════════════════════════════════════════════════
router.get('/requests/:id', async (req, res) => {
  try {
    const [[rows]] = await query(
      `SELECT
         ir.*,
         b.school_name   AS b_school_name,
         b.school_id     AS b_school_id,
         b.school_district AS b_district,
         b.school_sector   AS b_sector,
         b.school_province AS b_province,
         b.school_category AS b_category,
         b.education_level AS b_level,
         b.class_name      AS b_class_name,
         b.classes_json    AS b_classes_json,
         b.term            AS b_term,
         b.academic_year   AS b_academic_year,
         b.total_fee       AS b_total_fee,
         b.nesa_limit      AS b_nesa_limit,
         b.doc_id, b.pdf_path, b.exceeds_limit, b.status AS babyeyi_status
       FROM babyeyi_increase_requests ir
       LEFT JOIN school_babyeyi b ON b.id = ir.babyeyi_id
       WHERE ir.id = ?
       LIMIT 1`,
      [req.params.id]
    );

    if (!rows) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    res.json({ success: true, data: normaliseRequest(rows) });
  } catch (err) {
    console.error('[nesaBabyeyi/requests/:id]', err.message);
    res.status(500).json({ success: false, message: 'Failed to load request detail' });
  }
});

// ════════════════════════════════════════════════════════════════
// GET /api/nesa/babyeyi/violations
// All school_babyeyi rows where exceeds_limit = 1
// ?district=GASABO  ?search=name  ?page=1&limit=20
// ════════════════════════════════════════════════════════════════
router.get('/violations', async (req, res) => {
  try {
    const { district, search, page = 1, limit = 50 } = req.query;

    const where  = ['b.exceeds_limit = 1', 'b.is_active = 1'];
    const params = [];

    if (district) { where.push('b.school_district = ?'); params.push(district); }
    if (search) {
      where.push('(b.school_name LIKE ? OR b.school_district LIKE ? OR b.doc_id LIKE ?)');
      const like = `%${search}%`;
      params.push(like, like, like);
    }

    const whereSQL = `WHERE ${where.join(' AND ')}`;
    const offset   = (Number(page) - 1) * Number(limit);

    const [[rows], [[{ total }]]] = await Promise.all([
      query(
        `SELECT
           b.id,
           b.school_id,
           COALESCE(b.school_name, s.school_name, 'Unknown') AS school_name,
           b.school_district  AS district,
           b.school_sector    AS sector,
           b.school_province  AS province,
           b.school_category  AS category,
           b.education_level  AS level,
           b.class_name,
           b.term,
           b.academic_year,
           b.total_fee,
           b.nesa_limit,
           b.exceeds_limit,
           b.status,
           b.doc_id,
           b.created_at,
           -- increase request status if any
           ir.id            AS request_id,
           ir.nesa_status   AS request_status,
           ir.submitted_at  AS request_submitted_at,
           ir.deo_notes,
           ir.nesa_notes
         FROM school_babyeyi b
         LEFT JOIN schools s ON s.id = b.school_id
         LEFT JOIN babyeyi_increase_requests ir ON ir.babyeyi_id = b.id
         ${whereSQL}
         ORDER BY (b.total_fee - b.nesa_limit) DESC
         LIMIT ? OFFSET ?`,
        [...params, Number(limit), offset]
      ),
      query(
        `SELECT COUNT(*) AS total
         FROM school_babyeyi b
         ${whereSQL}`,
        params
      ),
    ]);

    res.json({
      success: true,
      data: rows,
      pagination: {
        total,
        page:  Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (err) {
    console.error('[nesaBabyeyi/violations]', err.message);
    res.status(500).json({ success: false, message: 'Failed to load violations' });
  }
});

// ════════════════════════════════════════════════════════════════
// PATCH /api/nesa/babyeyi/requests/:id/approve
// NESA final approval of a fee increase request
// Body: { notes?: string }
// ════════════════════════════════════════════════════════════════
router.patch('/requests/:id/approve', async (req, res) => {
  try {
    const nesaUserId = req.nesaUser.id;
    const notes      = req.body?.notes || 'Approved by NESA';

    // Verify the request exists
    const [[ir]] = await query(
      `SELECT ir.id, ir.babyeyi_id, ir.nesa_status, b.school_name, b.school_district
       FROM babyeyi_increase_requests ir
       LEFT JOIN school_babyeyi b ON b.id = ir.babyeyi_id
       WHERE ir.id = ?
       LIMIT 1`,
      [req.params.id]
    );

    if (!ir) {
      return res.status(404).json({ success: false, message: 'Request not found.' });
    }

    // Allow re-approval of already-approved records (idempotent)
    // But block approving already-rejected ones to prevent mistakes
    if (ir.nesa_status === 'rejected' || ir.nesa_status === 'nesa_rejected') {
      return res.status(409).json({
        success: false,
        message: `Cannot approve — this request was already rejected (status: ${ir.nesa_status}).`,
      });
    }

    // Update the increase request
   await query(
      `UPDATE babyeyi_increase_requests
       SET nesa_status  = 'approved',
           nesa_notes   = ?,
           reviewed_at  = NOW(),
           reviewed_by  = ?
       WHERE id = ?`,
      [notes, nesaUserId, req.params.id]
    );

    // Also update the parent school_babyeyi status to 'approved'
    if (ir.babyeyi_id) {
      await query(
        `UPDATE school_babyeyi SET status = 'approved' WHERE id = ?`,
        [ir.babyeyi_id]
      );
    }

    console.log(`[nesaBabyeyi] NESA user ${nesaUserId} APPROVED request ${req.params.id} (babyeyi: ${ir.babyeyi_id})`);

    res.json({
      success:    true,
      message:    `Fee increase request approved by NESA for ${ir.school_name || 'school'}.`,
      request_id: req.params.id,
      babyeyi_id: ir.babyeyi_id,
    });
  } catch (err) {
    console.error('[nesaBabyeyi/approve]', err.message);
    res.status(500).json({ success: false, message: 'Failed to approve request' });
  }
});

// ════════════════════════════════════════════════════════════════
// PATCH /api/nesa/babyeyi/requests/:id/reject
// NESA rejection of a fee increase request
// Body: { notes: string }  — rejection notes are required
// ════════════════════════════════════════════════════════════════
router.patch('/requests/:id/reject', async (req, res) => {
  try {
    const nesaUserId = req.nesaUser.id;
    const notes      = (req.body?.notes || '').trim();

    if (!notes) {
      return res.status(400).json({
        success: false,
        message: 'Rejection reason (notes) is required.',
      });
    }

    // Verify the request exists
    const [[ir]] = await query(
      `SELECT ir.id, ir.babyeyi_id, ir.nesa_status, b.school_name, b.school_district
       FROM babyeyi_increase_requests ir
       LEFT JOIN school_babyeyi b ON b.id = ir.babyeyi_id
       WHERE ir.id = ?
       LIMIT 1`,
      [req.params.id]
    );

    if (!ir) {
      return res.status(404).json({ success: false, message: 'Request not found.' });
    }

    if (ir.nesa_status === 'approved') {
      return res.status(409).json({
        success: false,
        message: 'Cannot reject — this request was already approved.',
      });
    }

    // Update the increase request
 await query(
      `UPDATE babyeyi_increase_requests
       SET nesa_status  = 'nesa_rejected',
           nesa_notes   = ?,
           reviewed_at  = NOW(),
           reviewed_by  = ?
       WHERE id = ?`,
      [notes, nesaUserId, req.params.id]
    );

    // Also update the parent school_babyeyi status back to 'rejected'
    if (ir.babyeyi_id) {
      await query(
        `UPDATE school_babyeyi SET status = 'rejected' WHERE id = ?`,
        [ir.babyeyi_id]
      );
    }

    console.log(`[nesaBabyeyi] NESA user ${nesaUserId} REJECTED request ${req.params.id} (babyeyi: ${ir.babyeyi_id})`);

    res.json({
      success:    true,
      message:    `Fee increase request rejected by NESA for ${ir.school_name || 'school'}.`,
      request_id: req.params.id,
      babyeyi_id: ir.babyeyi_id,
    });
  } catch (err) {
    console.error('[nesaBabyeyi/reject]', err.message);
    res.status(500).json({ success: false, message: 'Failed to reject request' });
  }
});

// ════════════════════════════════════════════════════════════════
// GET /api/nesa/babyeyi/notifications
// Real notifications from DB — recent requests + violations
// ════════════════════════════════════════════════════════════════
router.get('/notifications', async (req, res) => {
  try {
    const { limit = 20 } = req.query;
    const notifications = [];

    // Recent pending/recommended increase requests
    const [recentRequests] = await query(
      `SELECT
         ir.id, ir.nesa_status, ir.submitted_at, ir.deo_reviewed_at,
         ir.school_name, ir.district
       FROM babyeyi_increase_requests ir
       WHERE ir.submitted_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
       ORDER BY ir.submitted_at DESC
       LIMIT ?`,
      [Number(limit)]
    );

    for (const r of recentRequests) {
      const timeAgo = getTimeAgo(r.submitted_at);
      if (r.nesa_status === 'recommended') {
        notifications.push({
          id:      `req_rec_${r.id}`,
          type:    'request',
          title:   '📋 Recommended by DEO',
          body:    `${r.school_name} (${r.district}) fee increase recommended to NESA.`,
          is_read: false,
          time:    timeAgo,
          created_at: r.submitted_at,
        });
      } else if (r.nesa_status === 'pending') {
        notifications.push({
          id:      `req_pend_${r.id}`,
          type:    'request',
          title:   '📋 New Increase Request',
          body:    `${r.school_name} (${r.district}) submitted a fee increase request.`,
          is_read: false,
          time:    timeAgo,
          created_at: r.submitted_at,
        });
      } else if (r.nesa_status === 'approved') {
        notifications.push({
          id:      `req_app_${r.id}`,
          type:    'approved',
          title:   '✅ Request Approved',
          body:    `${r.school_name} fee increase request has been approved.`,
          is_read: true,
          time:    timeAgo,
          created_at: r.submitted_at,
        });
      } else if (r.nesa_status === 'rejected' || r.nesa_status === 'nesa_rejected') {
        notifications.push({
          id:      `req_rej_${r.id}`,
          type:    'rejected',
          title:   '❌ Request Rejected',
          body:    `${r.school_name} fee increase request has been rejected.`,
          is_read: true,
          time:    timeAgo,
          created_at: r.submitted_at,
        });
      }
    }

    // Recent violations (schools exceeding limit)
    const [recentViolations] = await query(
      `SELECT
         b.id, b.school_name, b.school_district, b.total_fee,
         b.nesa_limit, b.created_at
       FROM school_babyeyi b
       WHERE b.exceeds_limit = 1
         AND b.is_active = 1
         AND b.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
       ORDER BY b.created_at DESC
       LIMIT 10`
    );

    for (const v of recentViolations) {
      const pct = v.nesa_limit
        ? Math.round(((v.total_fee - v.nesa_limit) / v.nesa_limit) * 100)
        : 0;
      notifications.push({
        id:      `viol_${v.id}`,
        type:    'violation',
        title:   '🚨 New Violation Detected',
        body:    `${v.school_name} (${v.school_district}) set fees ${pct}% above the NESA limit.`,
        is_read: false,
        time:    getTimeAgo(v.created_at),
        created_at: v.created_at,
      });
    }

    // Sort by created_at descending
    notifications.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    res.json({
      success: true,
      data: notifications.slice(0, Number(limit)),
      unread_count: notifications.filter(n => !n.is_read).length,
    });
  } catch (err) {
    console.error('[nesaBabyeyi/notifications]', err.message);
    res.status(500).json({ success: false, message: 'Failed to load notifications' });
  }
});

// ── Time-ago helper ───────────────────────────────────────────
function getTimeAgo(date) {
  if (!date) return '—';
  const diff = Date.now() - new Date(date).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins  <  1) return 'just now';
  if (mins  < 60) return `${mins} min ago`;
  if (hours < 24) return `${hours} hr ago`;
  return `${days} day${days > 1 ? 's' : ''} ago`;
}

module.exports = router;