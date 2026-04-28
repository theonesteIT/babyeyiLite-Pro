// ================================================================
// requirementPrice.js — Student Requirements Pricing Management
//
// When filtering by academic_year, school_id, term, class_id we resolve the
// babyeyi row (school_babyeyi) and load requirements from babyeyi_student_requirements
// for that babyeyi only. Prices are stored in requirement_prices by babyeyi_requirement_id
// (id from babyeyi_student_requirements).
//
// Tables: requirement_prices can store by requirement_id (legacy) or babyeyi_requirement_id
// ================================================================

const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const router = express.Router();
const db = require('../config/database');

const query = (sql, params = []) => db.query(sql, params);

/** Avoid ER_CANT_AGGREGATE_2COLLATIONS when joining student_requirements.name to babyeyi_student_requirements.item */
const SQL_JOIN_STUDENT_REQ_BY_ITEM = `LEFT JOIN student_requirements sr ON CONVERT(TRIM(LOWER(sr.name)) USING utf8mb4) COLLATE utf8mb4_unicode_ci = CONVERT(TRIM(LOWER(bsr.item)) USING utf8mb4) COLLATE utf8mb4_unicode_ci`;

async function runDDLIgnoringDuplicates(sql) {
  try {
    await db.promisePool.execute(sql);
  } catch (e) {
    if (e.code === 'ER_DUP_FIELDNAME' || e.code === 'ER_DUP_KEYNAME' || e.code === 'ER_DUP_INDEX') return;
    throw e;
  }
}

function parseRequirementQuantity(raw) {
  if (raw == null || raw === '') return 1;
  const s = String(raw).trim();
  const m = s.match(/(\d+(?:\.\d+)?)/);
  if (m) {
    const n = parseFloat(m[1]);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return 1;
}

const REQ_IMG_DIR = path.join(__dirname, '..', 'uploads', 'requirement-images');
const requirementImageStorage = multer.diskStorage({
  destination(_req, _file, cb) {
    if (!fs.existsSync(REQ_IMG_DIR)) fs.mkdirSync(REQ_IMG_DIR, { recursive: true });
    cb(null, REQ_IMG_DIR);
  },
  filename(_req, file, cb) {
    const ext = path.extname(file.originalname || '').toLowerCase() || '.jpg';
    const safe = ['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext) ? ext : '.jpg';
    cb(null, `req-${Date.now()}-${Math.round(Math.random() * 1e9)}${safe}`);
  },
});
const uploadRequirementImage = multer({
  storage: requirementImageStorage,
  limits: { fileSize: 3 * 1024 * 1024 },
  fileFilter(_req, file, cb) {
    const ok = /^image\//.test(file.mimetype || '');
    if (ok) return cb(null, true);
    cb(new Error('Only image files are allowed'));
  },
});

// ── Constants ─────────────────────────────────────────────────
const VALID_TERMS = ['Term 1', 'Term 2', 'Term 3', 'Full Year'];
const VALID_CLASSES = ['N1', 'N2', 'N3', 'P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'L1', 'L2', 'L3'];

// ── Ensure tables exist and migrations (babyeyi_requirement_id) ─
const ensureTables = async () => {
  const createStudentReqs = `
    CREATE TABLE IF NOT EXISTS student_requirements (
      id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(300) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_name (name(255))
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`;
  const createRequirementPrices = `
    CREATE TABLE IF NOT EXISTS requirement_prices (
      id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      requirement_id INT UNSIGNED NULL,
      babyeyi_requirement_id INT UNSIGNED NULL COMMENT 'id from babyeyi_student_requirements',
      school_id INT UNSIGNED NOT NULL,
      class_id VARCHAR(20) NOT NULL,
      babyeyi_id INT UNSIGNED NULL,
      term VARCHAR(50) NOT NULL,
      academic_year VARCHAR(20) NOT NULL,
      price DECIMAL(12,2) NOT NULL DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_babyeyi_req (babyeyi_id, babyeyi_requirement_id),
      INDEX idx_school (school_id),
      INDEX idx_babyeyi (babyeyi_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`;
  try {
    await query(createStudentReqs);
    await query(createRequirementPrices);
    await runDDLIgnoringDuplicates(
      `ALTER TABLE student_requirements ADD COLUMN default_price DECIMAL(12,2) NULL DEFAULT NULL AFTER name`
    );
    await runDDLIgnoringDuplicates(
      `ALTER TABLE student_requirements ADD COLUMN image_url VARCHAR(512) NULL DEFAULT NULL AFTER default_price`
    );
    await runDDLIgnoringDuplicates(
      `ALTER TABLE requirement_prices ADD COLUMN babyeyi_requirement_id INT UNSIGNED NULL COMMENT 'id from babyeyi_student_requirements'`
    );
    try {
      await query(`ALTER TABLE requirement_prices MODIFY requirement_id INT UNSIGNED NULL`);
    } catch (e) {
      if (e.code !== 'ER_BAD_FIELD_ERROR') throw e;
    }
    await runDDLIgnoringDuplicates(
      `ALTER TABLE requirement_prices ADD UNIQUE KEY uq_babyeyi_req (babyeyi_id, babyeyi_requirement_id)`
    );
  } catch (e) {
    console.warn('[requirementPrice] ensureTables:', e.message);
  }
};

// Seed student_requirements from babyeyi_student_requirements if empty
const seedRequirementsIfEmpty = async () => {
  const existing = await query('SELECT COUNT(*) AS c FROM student_requirements');
  if (existing[0]?.c > 0) return;
  try {
    const [rows] = await db.promisePool.execute(
      `SELECT DISTINCT TRIM(item) AS name FROM babyeyi_student_requirements WHERE item IS NOT NULL AND TRIM(item) != ''`
    );
    for (const r of rows) {
      if (r.name) {
        await query('INSERT IGNORE INTO student_requirements (name) VALUES (?)', [r.name]);
      }
    }
    if (rows.length === 0) {
      await query('INSERT IGNORE INTO student_requirements (name) VALUES (?)', ['Exercise Books']);
      await query('INSERT IGNORE INTO student_requirements (name) VALUES (?)', ['School Uniform']);
      await query('INSERT IGNORE INTO student_requirements (name) VALUES (?)', ['Mathematical Set']);
    }
  } catch (e) {
    console.warn('[requirementPrice] seedRequirements:', e.message);
  }
};

// ── Auth: SUPER_ADMIN or FULL_SYSTEM_CONTROLLER ─────────────────
const requireSuperAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Not authenticated' });
  }
  const role = (req.user.role_code || '').toUpperCase();
  if (role !== 'SUPER_ADMIN' && role !== 'FULL_SYSTEM_CONTROLLER') {
    return res.status(403).json({ success: false, message: 'Super Admin or Full System Controller only' });
  }
  next();
};

router.use(requireSuperAdmin);

// ================================================================
// GET /api/requirement-prices/options — filter dropdown data
// ================================================================
router.get('/options', async (req, res) => {
  try {
    await ensureTables();
    const [schools] = await db.promisePool.execute(
      `SELECT id, school_name AS name, school_code AS code, district FROM schools WHERE deleted_at IS NULL AND (status IS NULL OR status = 'active') ORDER BY school_name`
    );
    const [districts] = await db.promisePool.execute(
      `SELECT DISTINCT district AS value FROM schools WHERE district IS NOT NULL AND district != '' ORDER BY district`
    );
    const districtsList = districts.map(r => r.value).filter(Boolean);
    const [sectors] = await db.promisePool.execute(
      `SELECT DISTINCT sector AS value FROM schools WHERE sector IS NOT NULL AND TRIM(sector) != '' ORDER BY sector`
    ).catch(() => [[{ value: null }]]);
    const sectorsList = (sectors || []).map(r => r.value).filter(Boolean);
    const [years] = await db.promisePool.execute(
      `SELECT DISTINCT academic_year AS value FROM school_babyeyi WHERE academic_year IS NOT NULL AND academic_year != '' ORDER BY academic_year DESC LIMIT 20`
    );
    const academicYears = years.map(r => r.value).filter(Boolean);
    if (academicYears.length === 0) {
      const y = new Date().getFullYear();
      academicYears.push(`${y - 1}-${y}`, `${y}-${y + 1}`);
    }
    return res.json({
      success: true,
      data: {
        schools,
        districts: districtsList,
        sectors: sectorsList,
        academicYears,
        terms: VALID_TERMS,
        classes: VALID_CLASSES,
      },
    });
  } catch (err) {
    console.error('[requirement-prices/options]', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ================================================================
// GET /api/requirement-prices/list — list all requirement_prices with optional filters
// Query: school_id, academic_year, district, class_id (all optional)
// ================================================================
router.get('/list', async (req, res) => {
  try {
    await ensureTables();
    const school_id = req.query.school_id != null ? parseInt(req.query.school_id, 10) : null;
    const academic_year = (req.query.academic_year || '').trim();
    const district = (req.query.district || '').trim();
    const class_id = (req.query.class_id || req.query.class || '').trim();

    const where = [];
    const params = [];

    if (school_id) {
      where.push('rp.school_id = ?');
      params.push(school_id);
    }
    if (academic_year) {
      where.push('rp.academic_year = ?');
      params.push(academic_year);
    }
    if (district) {
      where.push('s.district = ?');
      params.push(district);
    }
    if (class_id) {
      where.push('rp.class_id = ?');
      params.push(class_id);
    }

    const whereSQL = where.length ? `AND ${where.join(' AND ')}` : '';

    const rows = await query(
      `SELECT rp.id, rp.school_id, rp.class_id, rp.term, rp.academic_year, rp.price,
              rp.babyeyi_id, rp.babyeyi_requirement_id,
              s.school_name, s.district,
              COALESCE(bsr.item, sr.name) AS requirement_name
       FROM requirement_prices rp
       LEFT JOIN schools s ON s.id = rp.school_id
       LEFT JOIN babyeyi_student_requirements bsr ON bsr.id = rp.babyeyi_requirement_id
       LEFT JOIN student_requirements sr ON sr.id = rp.requirement_id
       WHERE 1=1 ${whereSQL}
       ORDER BY rp.academic_year DESC, s.school_name, rp.class_id, rp.term, rp.id`,
      params
    );

    return res.json({ success: true, data: rows });
  } catch (err) {
    console.error('[requirement-prices/list]', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ================================================================
// DELETE /api/requirement-prices/by-class — delete all prices for a class
// Body/Query: school_id, academic_year, term, class_id
// ================================================================
router.delete('/by-class', async (req, res) => {
  try {
    const body = req.body && Object.keys(req.body).length ? req.body : req.query;
    const school_id = body.school_id != null ? parseInt(body.school_id, 10) : null;
    const academic_year = (body.academic_year || '').trim();
    const term = (body.term || '').trim();
    const class_id = (body.class_id || body.class || '').trim();
    if (!school_id || !academic_year || !term || !class_id) {
      return res.status(400).json({ success: false, message: 'school_id, academic_year, term and class_id required' });
    }
    const [result] = await db.promisePool.execute(
      'DELETE FROM requirement_prices WHERE school_id = ? AND academic_year = ? AND term = ? AND class_id = ?',
      [school_id, academic_year, term, class_id]
    );
    return res.json({ success: true, message: 'Class pricing deleted', deleted: result.affectedRows });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ================================================================
// GET /api/requirement-prices/requirements — list all requirement names
// ================================================================
router.get('/requirements', async (req, res) => {
  try {
    await ensureTables();
    await seedRequirementsIfEmpty();
    let rows;
    try {
      rows = await query('SELECT id, name, default_price, image_url FROM student_requirements ORDER BY id ASC');
    } catch (e) {
      if (e.code === 'ER_BAD_FIELD_ERROR') {
        try {
          rows = await query('SELECT id, name, default_price FROM student_requirements ORDER BY id ASC');
          rows = (rows || []).map((r) => ({ ...r, image_url: null }));
        } catch (e2) {
          if (e2.code === 'ER_BAD_FIELD_ERROR') {
            rows = await query('SELECT id, name FROM student_requirements ORDER BY id ASC');
            rows = (rows || []).map((r) => ({ ...r, default_price: null, image_url: null }));
          } else throw e2;
        }
      } else throw e;
    }
    return res.json({ success: true, data: rows });
  } catch (err) {
    console.error('[requirement-prices/requirements]', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ================================================================
// PUT /api/requirement-prices/catalog-defaults — bulk update default_price (and optional image_url) on student_requirements
// Body: { items: [{ student_requirement_id, default_price, image_url? }] }  image_url: string URL or null to clear
// ================================================================
router.put('/catalog-defaults', async (req, res) => {
  try {
    await ensureTables();
    const items = Array.isArray(req.body?.items) ? req.body.items : [];
    for (const it of items) {
      const sid = parseInt(it.student_requirement_id, 10);
      if (!sid) continue;
      const raw = it.default_price;
      const default_price = raw === '' || raw == null ? null : parseFloat(raw);
      if (default_price != null && (Number.isNaN(default_price) || default_price < 0)) {
        return res.status(400).json({ success: false, message: 'Invalid default_price' });
      }
      let imageUrl = it.image_url;
      if (imageUrl !== undefined && imageUrl !== null) {
        imageUrl = String(imageUrl).trim();
        if (imageUrl === '') imageUrl = null;
        if (imageUrl && imageUrl.length > 512) {
          return res.status(400).json({ success: false, message: 'image_url too long' });
        }
      }
      if (imageUrl !== undefined) {
        await query('UPDATE student_requirements SET default_price = ?, image_url = ? WHERE id = ?', [default_price, imageUrl, sid]);
      } else {
        await query('UPDATE student_requirements SET default_price = ? WHERE id = ?', [default_price, sid]);
      }
    }
    return res.json({ success: true, message: 'Catalog defaults updated' });
  } catch (err) {
    console.error('[requirement-prices/catalog-defaults]', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ================================================================
// POST /api/requirement-prices/requirements/:id/image — upload catalog image (multipart field "image")
// ================================================================
router.post('/requirements/:id/image', uploadRequirementImage.single('image'), async (req, res) => {
  try {
    await ensureTables();
    const sid = parseInt(req.params.id, 10);
    if (!sid) return res.status(400).json({ success: false, message: 'Invalid id' });
    if (!req.file) return res.status(400).json({ success: false, message: 'No image file' });
    const publicUrl = `/uploads/requirement-images/${req.file.filename}`;
    await query('UPDATE student_requirements SET image_url = ? WHERE id = ?', [publicUrl, sid]);
    const rows = await query('SELECT id, name, default_price, image_url FROM student_requirements WHERE id = ?', [sid]);
    return res.json({ success: true, image_url: publicUrl, data: rows[0] || { id: sid, image_url: publicUrl } });
  } catch (err) {
    console.error('[requirement-prices/requirements/:id/image]', err);
    return res.status(500).json({ success: false, message: err.message || 'Upload failed' });
  }
});

// ================================================================
// DELETE /api/requirement-prices/requirements/:id/image — remove catalog image
// ================================================================
router.delete('/requirements/:id/image', async (req, res) => {
  try {
    await ensureTables();
    const sid = parseInt(req.params.id, 10);
    if (!sid) return res.status(400).json({ success: false, message: 'Invalid id' });
    const rows = await query('SELECT image_url FROM student_requirements WHERE id = ?', [sid]);
    const prev = rows[0]?.image_url;
    if (prev && typeof prev === 'string' && prev.startsWith('/uploads/requirement-images/')) {
      const fname = path.basename(prev);
      const full = path.join(REQ_IMG_DIR, fname);
      if (fs.existsSync(full)) fs.unlinkSync(full);
    }
    await query('UPDATE student_requirements SET image_url = NULL WHERE id = ?', [sid]);
    return res.json({ success: true, message: 'Image removed' });
  } catch (err) {
    console.error('[requirement-prices/requirements/:id/image DELETE]', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ================================================================
// GET /api/requirement-prices/browse/schools — Super Admin: schools by district / sector
// ================================================================
router.get('/browse/schools', async (req, res) => {
  try {
    await ensureTables();
    const district = (req.query.district || '').trim();
    const sector = (req.query.sector || '').trim();
    let sql = `
      SELECT s.id, s.school_name, s.district, s.sector, s.school_code,
        (SELECT COUNT(*) FROM school_babyeyi sb WHERE sb.school_id = s.id AND sb.is_active = 1) AS babyeyi_count
      FROM schools s
      WHERE s.deleted_at IS NULL AND (s.status IS NULL OR s.status = 'active')
    `;
    const params = [];
    if (district) {
      sql += ' AND s.district = ?';
      params.push(district);
    }
    if (sector) {
      sql += ' AND TRIM(s.sector) = ?';
      params.push(sector);
    }
    sql += ' ORDER BY s.school_name ASC';
    const rows = await query(sql, params);
    return res.json({ success: true, data: rows });
  } catch (err) {
    console.error('[requirement-prices/browse/schools]', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ================================================================
// GET /api/requirement-prices/browse/school-babyeyi — all babyeyi rows for a school
// Query: school_id (required)
// ================================================================
router.get('/browse/school-babyeyi', async (req, res) => {
  try {
    await ensureTables();
    const school_id = req.query.school_id != null ? parseInt(req.query.school_id, 10) : null;
    if (!school_id) return res.status(400).json({ success: false, message: 'school_id required' });
    const q = (req.query.q || '').trim();
    const params = [school_id];
    let whereExtra = '';
    if (q) {
      whereExtra = ` AND (
        sb.class_name LIKE ? OR sb.academic_year LIKE ? OR sb.term LIKE ? OR COALESCE(sb.status,'') LIKE ?
      )`;
      const like = `%${q}%`;
      params.push(like, like, like, like);
    }
    const rows = await query(
      `SELECT sb.id, sb.academic_year, sb.term, sb.class_name, sb.status, sb.total_fee, sb.doc_id, sb.created_at,
              sch.school_name AS school_name
       FROM school_babyeyi sb
       LEFT JOIN schools sch ON sch.id = sb.school_id
       WHERE sb.school_id = ? AND sb.is_active = 1 ${whereExtra}
       ORDER BY sb.academic_year DESC, sb.term, sb.class_name`,
      params
    );
    const out = [];
    for (const r of rows) {
      let reqTotal = 0;
      try {
        const lineRows = await query(
          `SELECT bsr.quantity,
                  COALESCE(rp.price, sr.default_price, bsr.cost, 0) AS unit_price
           FROM babyeyi_student_requirements bsr
           LEFT JOIN requirement_prices rp ON rp.babyeyi_id = bsr.babyeyi_id AND rp.babyeyi_requirement_id = bsr.id
           ${SQL_JOIN_STUDENT_REQ_BY_ITEM}
           WHERE bsr.babyeyi_id = ?`,
          [r.id]
        );
        for (const lr of lineRows) {
          const unit = Number(lr.unit_price || 0);
          const qty = parseRequirementQuantity(lr.quantity);
          reqTotal += unit * qty;
        }
      } catch (e) {
        if (e.code === 'ER_BAD_FIELD_ERROR') {
          const lineRows = await query(
            `SELECT bsr.quantity, COALESCE(rp.price, sr.default_price, 0) AS unit_price
             FROM babyeyi_student_requirements bsr
             LEFT JOIN requirement_prices rp ON rp.babyeyi_id = bsr.babyeyi_id AND rp.babyeyi_requirement_id = bsr.id
             ${SQL_JOIN_STUDENT_REQ_BY_ITEM}
             WHERE bsr.babyeyi_id = ?`,
            [r.id]
          );
          for (const lr of lineRows) {
            const unit = Number(lr.unit_price || 0);
            const qty = parseRequirementQuantity(lr.quantity);
            reqTotal += unit * qty;
          }
        } else throw e;
      }
      reqTotal = Math.round(reqTotal * 100) / 100;
      out.push({ ...r, requirements_price_total: reqTotal });
    }
    return res.json({ success: true, data: out });
  } catch (err) {
    console.error('[requirement-prices/browse/school-babyeyi]', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ================================================================
// GET /api/requirement-prices/browse/babyeyi-detail/:babyeyiId — requirements + prices + total
// ================================================================
router.get('/browse/babyeyi-detail/:babyeyiId', async (req, res) => {
  try {
    await ensureTables();
    const babyeyiId = parseInt(req.params.babyeyiId, 10);
    if (!babyeyiId) return res.status(400).json({ success: false, message: 'Invalid babyeyi id' });
    const meta = await query(
      `SELECT sb.id, sb.school_id, sb.academic_year, sb.term, sb.class_name, sb.status, sb.doc_id,
              s.school_name, s.district, s.sector
       FROM school_babyeyi sb
       LEFT JOIN schools s ON s.id = sb.school_id
       WHERE sb.id = ? AND sb.is_active = 1 LIMIT 1`,
      [babyeyiId]
    );
    if (!meta.length) return res.status(404).json({ success: false, message: 'Babyeyi not found' });
    let lines;
    try {
      lines = await query(
        `SELECT bsr.id AS babyeyi_requirement_id, bsr.item AS requirement_name, bsr.description, bsr.quantity,
                rp.price AS stored_price,
                sr.default_price AS catalog_default_price,
                sr.image_url AS catalog_image_url,
                COALESCE(rp.price, sr.default_price, bsr.cost, 0) AS unit_price
         FROM babyeyi_student_requirements bsr
         LEFT JOIN requirement_prices rp ON rp.babyeyi_id = bsr.babyeyi_id AND rp.babyeyi_requirement_id = bsr.id
         ${SQL_JOIN_STUDENT_REQ_BY_ITEM}
         WHERE bsr.babyeyi_id = ?
         ORDER BY bsr.sort_order, bsr.id`,
        [babyeyiId]
      );
    } catch (e) {
      if (e.code === 'ER_BAD_FIELD_ERROR') {
        lines = await query(
          `SELECT bsr.id AS babyeyi_requirement_id, bsr.item AS requirement_name, bsr.quantity,
                  rp.price AS stored_price,
                  sr.default_price AS catalog_default_price,
                  sr.image_url AS catalog_image_url,
                  COALESCE(rp.price, sr.default_price, 0) AS unit_price
           FROM babyeyi_student_requirements bsr
           LEFT JOIN requirement_prices rp ON rp.babyeyi_id = bsr.babyeyi_id AND rp.babyeyi_requirement_id = bsr.id
           ${SQL_JOIN_STUDENT_REQ_BY_ITEM}
           WHERE bsr.babyeyi_id = ?
           ORDER BY bsr.sort_order, bsr.id`,
          [babyeyiId]
        );
      } else throw e;
    }
    lines = lines.map((l) => {
      const unit = Number(l.unit_price ?? 0);
      const qty = parseRequirementQuantity(l.quantity);
      const lineTotal = Math.round(unit * qty * 100) / 100;
      return {
        ...l,
        unit_price_rwf: unit,
        quantity_value: qty,
        line_total_rwf: lineTotal,
        price: lineTotal,
      };
    });
    const total = lines.reduce((s, l) => s + l.line_total_rwf, 0);
    return res.json({
      success: true,
      data: {
        babyeyi: meta[0],
        requirements: lines,
        total_requirements_rwf: total,
      },
    });
  } catch (err) {
    console.error('[requirement-prices/browse/babyeyi-detail]', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ================================================================
// POST /api/requirement-prices/requirements — create requirement name
// ================================================================
router.post('/requirements', async (req, res) => {
  try {
    await ensureTables();
    const name = (req.body.name || '').trim();
    if (!name) return res.status(400).json({ success: false, message: 'name is required' });
    let defaultPrice = null;
    const rawPrice = req.body.default_price;
    if (rawPrice != null && rawPrice !== '') {
      const n = parseFloat(rawPrice);
      if (!Number.isFinite(n) || n < 0) {
        return res.status(400).json({ success: false, message: 'default_price must be a non-negative number' });
      }
      defaultPrice = n;
    }
    const [result] = await db.promisePool.execute(
      'INSERT INTO student_requirements (name, default_price) VALUES (?, ?)',
      [name, defaultPrice]
    );
    const id = result.insertId;
    let rows;
    try {
      [rows] = await db.promisePool.execute(
        'SELECT id, name, default_price, image_url FROM student_requirements WHERE id = ?',
        [id]
      );
    } catch (e) {
      [rows] = await db.promisePool.execute('SELECT id, name FROM student_requirements WHERE id = ?', [id]);
    }
    return res.status(201).json({ success: true, data: rows[0] });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ success: false, message: 'Requirement name already exists' });
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ================================================================
// PUT /api/requirement-prices/requirements/:id
// ================================================================
router.put('/requirements/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const name = (req.body.name || '').trim();
    if (!name) return res.status(400).json({ success: false, message: 'name is required' });
    await query('UPDATE student_requirements SET name = ? WHERE id = ?', [name, id]);
    if (typeof db.promisePool === 'undefined') return res.json({ success: true });
    const [rows] = await db.promisePool.execute('SELECT id, name FROM student_requirements WHERE id = ?', [id]);
    return res.json({ success: true, data: rows[0] || { id, name } });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ================================================================
// DELETE /api/requirement-prices/requirements/:id
// ================================================================
router.delete('/requirements/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    await query('DELETE FROM student_requirements WHERE id = ?', [id]);
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ================================================================
// GET /api/requirement-prices — get requirements for that class babyeyi only
// Resolves babyeyi by school_id + academic_year + term + class_name (class_id),
// then loads from babyeyi_student_requirements for that babyeyi_id.
// Query: academic_year, school_id, term, class_id (class name e.g. P1, S1)
// ================================================================
router.get('/', async (req, res) => {
  try {
    await ensureTables();
    const academic_year = (req.query.academic_year || '').trim();
    const school_id = req.query.school_id != null ? parseInt(req.query.school_id, 10) : null;
    const term = (req.query.term || '').trim();
    const class_id = (req.query.class_id || req.query.class || '').trim();

    if (!academic_year || !school_id || !term || !class_id) {
      return res.json({
        success: true,
        data: [],
        message: 'Select Academic Year, School, Term and Class then click Load Requirements',
      });
    }

    // Resolve babyeyi for this exact combination (school + year + term + class)
    const babyeyiRows = await query(
      `SELECT id FROM school_babyeyi 
       WHERE school_id = ? AND academic_year = ? AND term = ? AND class_name = ? AND is_active = 1 
       LIMIT 1`,
      [school_id, academic_year, term, class_id]
    );
    const babyeyi_id = babyeyiRows[0]?.id || null;

    if (!babyeyi_id) {
      return res.json({
        success: true,
        data: [],
        message: 'No babyeyi record found for this School, Academic Year, Term and Class. Create the babyeyi first.',
      });
    }

    // Load requirements for this babyeyi + catalog default_price (student_requirements)
    let requirements;
    try {
      requirements = await query(
        `SELECT bsr.id, bsr.item, bsr.cost,
                sr.id AS student_requirement_id, sr.default_price AS catalog_default_price
         FROM babyeyi_student_requirements bsr
         ${SQL_JOIN_STUDENT_REQ_BY_ITEM}
         WHERE bsr.babyeyi_id = ? ORDER BY bsr.sort_order, bsr.id`,
        [babyeyi_id]
      );
    } catch (e) {
      if (e.code === 'ER_BAD_FIELD_ERROR') {
        requirements = await query(
          `SELECT id, item, cost FROM babyeyi_student_requirements WHERE babyeyi_id = ? ORDER BY sort_order`,
          [babyeyi_id]
        );
        requirements = (requirements || []).map((r) => ({ ...r, student_requirement_id: null, catalog_default_price: null }));
      } else throw e;
    }

    // Load existing prices for this babyeyi (keyed by babyeyi_requirement_id)
    const prices = await query(
      `SELECT babyeyi_requirement_id, price FROM requirement_prices 
       WHERE babyeyi_id = ? AND babyeyi_requirement_id IS NOT NULL`,
      [babyeyi_id]
    );
    const priceMap = {};
    prices.forEach(p => { priceMap[p.babyeyi_requirement_id] = p.price; });

    const data = requirements.map(r => {
      const stored = priceMap[r.id];
      const catalogDef = r.catalog_default_price != null ? Number(r.catalog_default_price) : null;
      const fallbackCost = r.cost != null ? Number(r.cost) : null;
      let price = '';
      if (stored != null && stored !== '') price = Number(stored);
      else if (catalogDef != null && !Number.isNaN(catalogDef)) price = catalogDef;
      else if (fallbackCost != null && !Number.isNaN(fallbackCost)) price = fallbackCost;
      else price = '';
      return {
        requirement_id: r.id,
        requirement_name: r.item || '',
        student_requirement_id: r.student_requirement_id || null,
        catalog_default_price: catalogDef,
        price,
      };
    });

    return res.json({
      success: true,
      data,
      filters: { academic_year, school_id, term, class_id, babyeyi_id },
    });
  } catch (err) {
    console.error('[requirement-prices GET]', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ================================================================
// POST /api/requirement-prices — save/upsert prices for class babyeyi
// Body: { academic_year, school_id, term, class_id, prices: [{ requirement_id (babyeyi_requirement_id), price }] }
// ================================================================
router.post('/', async (req, res) => {
  try {
    await ensureTables();
    const body = req.body || {};
    const academic_year = (body.academic_year || '').trim();
    const school_id = body.school_id != null ? parseInt(body.school_id, 10) : null;
    const term = (body.term || '').trim();
    const class_id = (body.class_id || body.class || '').trim();
    const prices = Array.isArray(body.prices) ? body.prices : [];

    if (!academic_year || !school_id || !term || !class_id) {
      return res.status(400).json({ success: false, message: 'academic_year, school_id, term and class_id are required' });
    }

    // Resolve babyeyi for this exact combination (same as GET)
    const babyeyiRows = await query(
      `SELECT id FROM school_babyeyi 
       WHERE school_id = ? AND academic_year = ? AND term = ? AND class_name = ? AND is_active = 1 
       LIMIT 1`,
      [school_id, academic_year, term, class_id]
    );
    const babyeyi_id = babyeyiRows[0]?.id || null;

    if (!babyeyi_id) {
      return res.status(400).json({
        success: false,
        message: 'No babyeyi record for this School, Academic Year, Term and Class. Create the babyeyi first.',
      });
    }

    for (const p of prices) {
      const babyeyi_requirement_id = p.requirement_id != null ? parseInt(p.requirement_id, 10) : null;
      const price = p.price !== '' && p.price != null ? parseFloat(p.price) : 0;
      if (!babyeyi_requirement_id) continue;
      await query(
        `INSERT INTO requirement_prices (babyeyi_id, babyeyi_requirement_id, school_id, class_id, term, academic_year, price)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE price = VALUES(price), updated_at = CURRENT_TIMESTAMP`,
        [babyeyi_id, babyeyi_requirement_id, school_id, class_id, term, academic_year, price]
      );
    }

    return res.json({ success: true, message: 'Prices saved successfully' });
  } catch (err) {
    console.error('[requirement-prices POST]', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ================================================================
// GET /api/requirement-prices/:id — single price record (by requirement_prices.id)
// ================================================================
router.get('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ success: false, message: 'Invalid id' });
    const rows = await query(
      `SELECT rp.*, s.school_name, s.district,
              COALESCE(bsr.item, sr.name) AS requirement_name
       FROM requirement_prices rp
       LEFT JOIN schools s ON s.id = rp.school_id
       LEFT JOIN babyeyi_student_requirements bsr ON bsr.id = rp.babyeyi_requirement_id
       LEFT JOIN student_requirements sr ON sr.id = rp.requirement_id
       WHERE rp.id = ?`,
      [id]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Not found' });
    return res.json({ success: true, data: rows[0] });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ================================================================
// PUT /api/requirement-prices/:id — update single price record
// ================================================================
router.put('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const price = req.body.price != null ? parseFloat(req.body.price) : null;
    if (price === null || isNaN(price)) return res.status(400).json({ success: false, message: 'price is required' });
    await query('UPDATE requirement_prices SET price = ? WHERE id = ?', [price, id]);
    const rows = await query('SELECT * FROM requirement_prices WHERE id = ?', [id]);
    return res.json({ success: true, data: rows[0] });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ================================================================
// DELETE /api/requirement-prices/:id — delete single price record
// ================================================================
router.delete('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    await query('DELETE FROM requirement_prices WHERE id = ?', [id]);
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
