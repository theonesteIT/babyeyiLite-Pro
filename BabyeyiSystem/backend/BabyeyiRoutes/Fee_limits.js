// ================================================================
// routes/AccountantRoutes/feeLimits.js
// NESA Babyeyi — Fee Limits CRUD API
//
// Endpoints:
//   GET    /api/fee-limits            — list all (with filters)
//   GET    /api/fee-limits/stats      — summary counts
//   GET    /api/fee-limits/:id        — single record
//   POST   /api/fee-limits            — create
//   PUT    /api/fee-limits/:id        — full update
//   PATCH  /api/fee-limits/:id        — partial update
//   DELETE /api/fee-limits/:id        — soft-delete (is_active = 0)
//   GET    /api/fee-limits/audit/:id  — audit log for a record
// ================================================================

const express  = require('express');
const router   = express.Router();
const multer   = require('multer');
const path     = require('path');
const fs       = require('fs');
const db       = require('../config/database'); // adjust path to your db pool

// ── Multer for PDF uploads ─────────────────────────────────
const feeDocDir = 'uploads/fee-limits/';
if (!fs.existsSync(feeDocDir)) fs.mkdirSync(feeDocDir, { recursive: true });

const feeLimitStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, feeDocDir),
  filename:    (_req, file, cb) => {
    const ext  = path.extname(file.originalname);
    const base = path.basename(file.originalname, ext).replace(/\s+/g, '-');
    cb(null, `${base}-${Date.now()}${ext}`);
  },
});

const upload = multer({
  storage: feeLimitStorage,
  limits:  { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'application/pdf') return cb(null, true);
    cb(new Error('Only PDF files are allowed for regulation documents'));
  },
}).single('regulation_pdf');

// ── Helper: execute query with promise ─────────────────────
const query = (sql, params = []) => db.query(sql, params);
// ── Helper: get client IP ──────────────────────────────────
const getClientIp = (req) =>
  req.headers['x-forwarded-for']?.split(',')[0].trim() ||
  req.socket?.remoteAddress ||
  'unknown';

// ── Helper: write audit log ────────────────────────────────
const writeAudit = async (feeLimitId, action, oldValues, newValues, req) => {
  try {
    await query(
      `INSERT INTO fee_limit_audit_log
        (fee_limit_id, action, changed_by, old_values, new_values, ip_address, user_agent)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        feeLimitId,
        action,
        req.user?.id || null,
        oldValues ? JSON.stringify(oldValues) : null,
        newValues ? JSON.stringify(newValues) : null,
        getClientIp(req),
        req.headers['user-agent'] || null,
      ]
    );
  } catch (e) {
    console.warn('[fee-limits] Audit log write failed:', e.message);
  }
};

// ── Validation helper ──────────────────────────────────────
const VALID_CATEGORIES = ['Public', 'Boarding', 'TVET'];
const VALID_LEVELS     = ['Nursery', 'Primary', 'Secondary', 'TSS'];
const VALID_TERMS      = ['Term 1', 'Term 2', 'Term 3', 'Full Year'];

/** Normalize multipart body before validation (legacy University → Secondary, trim strings). */
function normalizeFeeLimitPayload(body = {}) {
  const out = { ...body };
  if (out.category != null) {
    out.category = String(out.category).trim();
    if (out.category === 'Private') out.category = 'Public';
  }
  if (out.level != null) {
    out.level = String(out.level).trim();
    if (out.level === 'University') out.level = 'Secondary';
  }
  if (out.term != null) out.term = String(out.term).trim();
  if (out.academic_year != null) out.academic_year = String(out.academic_year).trim();
  if (out.max_amount != null && out.max_amount !== '') {
    out.max_amount = String(out.max_amount).trim();
  }
  return out;
}

function validatePayload(body) {
  const b = normalizeFeeLimitPayload(body);
  const errors = [];
  if (!b.category || !VALID_CATEGORIES.includes(b.category))
    errors.push(`category must be one of: ${VALID_CATEGORIES.join(', ')}`);
  if (!b.level || !VALID_LEVELS.includes(b.level))
    errors.push(`level must be one of: ${VALID_LEVELS.join(', ')}`);
  if (!b.term || !VALID_TERMS.includes(b.term))
    errors.push(`term must be one of: ${VALID_TERMS.join(', ')}`);
  if (!b.academic_year || !/^\d{4}-\d{4}$/.test(b.academic_year))
    errors.push('academic_year must match format YYYY-YYYY (e.g. 2024-2025)');
  const amt = Number(b.max_amount);
  if (!b.max_amount || isNaN(amt) || amt <= 0)
    errors.push('max_amount must be a positive number');
  return { errors, normalized: b };
}

// ================================================================
// GET /api/fee-limits/stats
// ================================================================
router.get('/stats', async (req, res) => {
  try {
    const [totals] = await query(`
      SELECT
        COUNT(*)                                              AS total,
        SUM(category = 'Public')                             AS public_count,
        SUM(category = 'Private')                            AS private_count,
        SUM(category = 'Boarding')                           AS boarding_count,
        SUM(category = 'TVET')                               AS tvet_count,
        COUNT(DISTINCT academic_year)                        AS years_count,
        MAX(max_amount)                                      AS max_fee,
        MIN(max_amount)                                      AS min_fee,
        AVG(max_amount)                                      AS avg_fee
      FROM fee_limits
      WHERE is_active = 1
    `);

    res.json({ success: true, data: totals });
  } catch (err) {
    console.error('[fee-limits/stats]', err);
    res.status(500).json({ success: false, message: 'Failed to fetch stats' });
  }
});

// ================================================================
// GET /api/fee-limits
// Query params: category, level, term, academic_year, search, page, limit
// ================================================================
router.get('/', async (req, res) => {
  try {
    const {
      category, level, term, academic_year,
      search, active = '1',
      page = 1, limit = 50, sort = 'id', order = 'ASC',
    } = req.query;

    const safeCols = ['id','category','level','term','academic_year','max_amount','created_at'];
    const sortCol  = safeCols.includes(sort) ? sort : 'id';
    const sortDir  = order.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

    let where  = [];
    let params = [];

    if (active !== 'all') { where.push('is_active = ?'); params.push(active === '1' ? 1 : 0); }
    if (category)         { where.push('category = ?');       params.push(category); }
    if (level)            { where.push('level = ?');           params.push(level); }
    if (term)             { where.push('term = ?');            params.push(term); }
    if (academic_year)    { where.push('academic_year = ?');   params.push(academic_year); }
    if (search) {
      where.push('(regulation_ref LIKE ? OR notes LIKE ? OR academic_year LIKE ?)');
      const like = `%${search}%`;
      params.push(like, like, like);
    }

    const whereSQL = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const offset   = (Math.max(1, Number(page)) - 1) * Number(limit);

    const [rows, [{ total }]] = await Promise.all([
      query(
        `SELECT * FROM fee_limits ${whereSQL}
         ORDER BY ${sortCol} ${sortDir}
         LIMIT ? OFFSET ?`,
        [...params, Number(limit), offset]
      ),
      query(`SELECT COUNT(*) AS total FROM fee_limits ${whereSQL}`, params),
    ]);

    res.json({
      success:  true,
      data:     rows,
      pagination: {
        total,
        page:   Number(page),
        limit:  Number(limit),
        pages:  Math.ceil(total / Number(limit)),
      },
    });
  } catch (err) {
    console.error('[fee-limits/GET]', err);
    res.status(500).json({ success: false, message: 'Failed to fetch fee limits' });
  }
});

// ================================================================
// GET /api/fee-limits/audit/:id
// ================================================================
router.get('/audit/:id', async (req, res) => {
  try {
    const logs = await query(
      `SELECT * FROM fee_limit_audit_log
       WHERE fee_limit_id = ?
       ORDER BY changed_at DESC
       LIMIT 100`,
      [req.params.id]
    );
    res.json({ success: true, data: logs });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch audit log' });
  }
});

// ================================================================
// GET /api/fee-limits/:id
// ================================================================
router.get('/:id', async (req, res) => {
  try {
    const [row] = await query(
      'SELECT * FROM fee_limits WHERE id = ? AND is_active = 1',
      [req.params.id]
    );
    if (!row) return res.status(404).json({ success: false, message: 'Fee limit not found' });
    res.json({ success: true, data: row });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch fee limit' });
  }
});

// ================================================================
// POST /api/fee-limits
// ================================================================
router.post('/', (req, res) => {
  upload(req, res, async (uploadErr) => {
    if (uploadErr) return res.status(400).json({ success: false, message: uploadErr.message });

    try {
      const body   = normalizeFeeLimitPayload(req.body);
      const { errors, normalized } = validatePayload(body);
      if (errors.length) {
        return res.status(422).json({ success: false, message: errors[0], errors });
      }

      // Check for duplicate active limit
      const [existing] = await query(
        `SELECT id FROM fee_limits
         WHERE category = ? AND level = ? AND term = ? AND academic_year = ? AND is_active = 1`,
        [normalized.category, normalized.level, normalized.term, normalized.academic_year]
      );
      if (existing) {
        return res.status(409).json({
          success: false,
          message: `An active fee limit for ${normalized.category} ${normalized.level} ${normalized.term} (${normalized.academic_year}) already exists. Use PUT to update it.`,
          existing_id: existing.id,
        });
      }

      const docPath  = req.file ? `/uploads/fee-limits/${req.file.filename}` : null;
      const docName  = req.file ? req.file.originalname : null;

      const result = await query(
        `INSERT INTO fee_limits
          (category, level, term, academic_year, max_amount, regulation_ref,
           effective_date, notes, document_path, document_name, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          normalized.category, normalized.level, normalized.term, normalized.academic_year,
          Number(normalized.max_amount),
          normalized.regulation_ref || null, normalized.effective_date || null,
          normalized.notes || null, docPath, docName,
          req.user?.id || null,
        ]
      );

      const newRecord = await query('SELECT * FROM fee_limits WHERE id = ?', [result.insertId]);
      await writeAudit(result.insertId, 'created', null, newRecord[0], req);

      res.status(201).json({
        success: true,
        message: 'Fee limit created successfully',
        data:    newRecord[0],
      });
    } catch (err) {
      console.error('[fee-limits/POST]', err);
      res.status(500).json({ success: false, message: 'Failed to create fee limit' });
    }
  });
});

// ================================================================
// PUT /api/fee-limits/:id  (full update)
// ================================================================
router.put('/:id', (req, res) => {
  upload(req, res, async (uploadErr) => {
    if (uploadErr) return res.status(400).json({ success: false, message: uploadErr.message });

    try {
      const { id } = req.params;
      const body    = normalizeFeeLimitPayload(req.body);

      const [old] = await query('SELECT * FROM fee_limits WHERE id = ? AND is_active = 1', [id]);
      if (!old) return res.status(404).json({ success: false, message: 'Fee limit not found' });

      const { errors, normalized } = validatePayload(body);
      if (errors.length) {
        return res.status(422).json({ success: false, message: errors[0], errors });
      }

      // Check for conflict with a different record
      const [conflict] = await query(
        `SELECT id FROM fee_limits
         WHERE category = ? AND level = ? AND term = ? AND academic_year = ?
           AND is_active = 1 AND id != ?`,
        [normalized.category, normalized.level, normalized.term, normalized.academic_year, id]
      );
      if (conflict) {
        return res.status(409).json({
          success: false,
          message: `Another fee limit for ${normalized.category} ${normalized.level} ${normalized.term} (${normalized.academic_year}) already exists.`,
        });
      }

      const docPath = req.file ? `/uploads/fee-limits/${req.file.filename}` : old.document_path;
      const docName = req.file ? req.file.originalname : old.document_name;

      await query(
        `UPDATE fee_limits SET
          category=?, level=?, term=?, academic_year=?, max_amount=?,
          regulation_ref=?, effective_date=?, notes=?,
          document_path=?, document_name=?, updated_by=?
         WHERE id=?`,
        [
          normalized.category, normalized.level, normalized.term, normalized.academic_year,
          Number(normalized.max_amount),
          normalized.regulation_ref || null, normalized.effective_date || null,
          normalized.notes || null, docPath, docName,
          req.user?.id || null, id,
        ]
      );

      const [updated] = await query('SELECT * FROM fee_limits WHERE id = ?', [id]);
      await writeAudit(id, 'updated', old, updated, req);

      res.json({ success: true, message: 'Fee limit updated', data: updated });
    } catch (err) {
      console.error('[fee-limits/PUT]', err);
      res.status(500).json({ success: false, message: 'Failed to update fee limit' });
    }
  });
});

// ================================================================
// PATCH /api/fee-limits/:id  (partial update — no file)
// ================================================================
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const [old]   = await query('SELECT * FROM fee_limits WHERE id = ? AND is_active = 1', [id]);
    if (!old) return res.status(404).json({ success: false, message: 'Fee limit not found' });

    const allowed = [
      'category', 'level', 'term', 'academic_year', 'max_amount',
      'regulation_ref', 'effective_date', 'notes',
    ];

    const fields  = [];
    const values  = [];

    allowed.forEach((key) => {
      if (req.body[key] !== undefined) {
        fields.push(`${key} = ?`);
        values.push(req.body[key]);
      }
    });

    if (!fields.length)
      return res.status(400).json({ success: false, message: 'No valid fields provided' });

    fields.push('updated_by = ?');
    values.push(req.user?.id || null);
    values.push(id);

    await query(`UPDATE fee_limits SET ${fields.join(', ')} WHERE id = ?`, values);

    const [updated] = await query('SELECT * FROM fee_limits WHERE id = ?', [id]);
    await writeAudit(id, 'updated', old, updated, req);

    res.json({ success: true, message: 'Fee limit updated', data: updated });
  } catch (err) {
    console.error('[fee-limits/PATCH]', err);
    res.status(500).json({ success: false, message: 'Failed to patch fee limit' });
  }
});

// ================================================================
// DELETE /api/fee-limits/:id  (soft delete)
// ================================================================
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const [old]   = await query('SELECT * FROM fee_limits WHERE id = ? AND is_active = 1', [id]);
    if (!old) return res.status(404).json({ success: false, message: 'Fee limit not found' });

    await query(
      'UPDATE fee_limits SET is_active = 0, updated_by = ? WHERE id = ?',
      [req.user?.id || null, id]
    );

    await writeAudit(id, 'deleted', old, null, req);

    res.json({ success: true, message: 'Fee limit deleted (soft)' });
  } catch (err) {
    console.error('[fee-limits/DELETE]', err);
    res.status(500).json({ success: false, message: 'Failed to delete fee limit' });
  }
});

module.exports = router;