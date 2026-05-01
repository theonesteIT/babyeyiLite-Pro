// ================================================================
// library.js — School library (books, borrowings, search, reports)
//
// Mounted at /api — routes:
//   GET    /students/search?q=
//   GET    /staff/search?q=
//   GET|POST|PUT|DELETE /books[...]
//   POST   /books/bulk-csv
//   GET    /books/:id/qr.png
//   GET|POST /borrowings
//   PUT    /borrowings/return/:id
//   GET    /library/dashboard
//   GET    /library/notifications
//   GET    /library/reports/daily
//   GET    /library/reports/monthly
//   GET    /library/reports/condition
// ================================================================

const express = require('express');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const multer = require('multer');
const QRCode = require('qrcode');
const { promisePool } = require('../config/database');
const { requireRole } = require('../middleware/deoAuth');

const router = express.Router();

/** Same school finance / ops roles often need read access alongside librarian. */
const LIBRARY_ROLES = [
  'LIBRARIAN', 'SCHOOL_ADMIN', 'SCHOOL_MANAGER', 'DOS', 'HOD', 'ACCOUNTANT',
];

const DEFAULT_MAX_STUDENT_BOOKS = 4;
const DEFAULT_MAX_TEACHER_BOOKS = 8;

function maxStudentBooks() {
  const n = parseInt(process.env.LIBRARY_MAX_STUDENT_BOOKS || '', 10);
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_MAX_STUDENT_BOOKS;
}
function maxTeacherBooks() {
  const n = parseInt(process.env.LIBRARY_MAX_TEACHER_BOOKS || '', 10);
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_MAX_TEACHER_BOOKS;
}

function resolveSchoolId(req) {
  return (
    req.session?.school_id ||
    req.session?.user?.school_id ||
    req.session?.user?.school?.id ||
    req.user?.school_id ||
    null
  );
}

function trimStr(v) {
  if (v === undefined || v === null) return '';
  return String(v).trim();
}

function parseCsvLine(line) {
  const out = [];
  let cur = '';
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      inQ = !inQ;
    } else if (c === ',' && !inQ) {
      out.push(cur);
      cur = '';
    } else {
      cur += c;
    }
  }
  out.push(cur);
  return out.map((s) => s.trim().replace(/^"|"$/g, ''));
}

let tablesReady = false;
async function ensureLibraryTables() {
  if (tablesReady) return;

  await promisePool.query(`
    CREATE TABLE IF NOT EXISTS library_books (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      school_id INT UNSIGNED NOT NULL,
      title VARCHAR(255) NOT NULL,
      isbn VARCHAR(100) NOT NULL,
      author VARCHAR(255) NOT NULL,
      category VARCHAR(100) NOT NULL,
      quantity INT NOT NULL DEFAULT 0,
      available_quantity INT NOT NULL DEFAULT 0,
      shelf_location VARCHAR(50) NOT NULL,
      \`condition\` ENUM('New','Good','Old','Damaged') NOT NULL DEFAULT 'Good',
      publisher VARCHAR(255) NULL,
      \`year\` INT NULL,
      edition VARCHAR(50) NULL,
      language VARCHAR(50) NULL,
      description TEXT NULL,
      cover_image VARCHAR(255) NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_library_school_isbn (school_id, isbn),
      KEY idx_library_school (school_id),
      KEY idx_library_category (school_id, category)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  await promisePool.query(`
    CREATE TABLE IF NOT EXISTS library_borrowings (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      school_id INT UNSIGNED NOT NULL,
      user_type ENUM('student','teacher') NOT NULL,
      user_id INT UNSIGNED NOT NULL,
      book_id INT UNSIGNED NOT NULL,
      quantity INT NOT NULL DEFAULT 1,
      borrow_date DATE NOT NULL,
      return_date DATE NOT NULL,
      status ENUM('borrowed','returned','late') NOT NULL DEFAULT 'borrowed',
      notes TEXT NULL,
      returned_at DATE NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      KEY idx_lb_school (school_id),
      KEY idx_lb_book (book_id),
      KEY idx_lb_user (school_id, user_type, user_id),
      KEY idx_lb_status (school_id, status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  await promisePool.query('ALTER TABLE library_borrowings ADD COLUMN notes TEXT NULL').catch(() => {});
  await promisePool.query('ALTER TABLE library_borrowings ADD COLUMN returned_at DATE NULL').catch(() => {});
  await promisePool
    .query(
      "ALTER TABLE library_books MODIFY `condition` ENUM('New','Good','Old','Damaged') NOT NULL DEFAULT 'Good'"
    )
    .catch(() => {});

  tablesReady = true;
}

const LIB_COVER_DIR = path.join(__dirname, '..', 'uploads', 'library-covers');
if (!fs.existsSync(LIB_COVER_DIR)) fs.mkdirSync(LIB_COVER_DIR, { recursive: true });

const coverUpload = multer({
  storage: multer.diskStorage({
    destination(_req, _file, cb) {
      cb(null, LIB_COVER_DIR);
    },
    filename(_req, file, cb) {
      const extRaw = path.extname(file.originalname || '').toLowerCase();
      const ext = ['.jpg', '.jpeg', '.png', '.webp'].includes(extRaw) ? extRaw : '.jpg';
      cb(null, `cover-${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`);
    },
  }),
  limits: { fileSize: 4 * 1024 * 1024, files: 1 },
  fileFilter(_req, file, cb) {
    const ok = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(file.mimetype);
    cb(ok ? null : new Error('Only jpg/png/webp'), ok);
  },
});

const csvUpload = multer({
  storage: multer.diskStorage({
    destination(_req, _file, cb) {
      cb(null, path.join(__dirname, '..', 'uploads', 'temp'));
    },
    filename(_req, file, cb) {
      cb(null, `lib-csv-${Date.now()}-${file.originalname || 'upload.csv'}`);
    },
  }),
  limits: { fileSize: 3 * 1024 * 1024, files: 1 },
});

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function deriveBorrowingStatus(returnDateStr, currentStatus) {
  if (currentStatus === 'returned') return 'returned';
  const due = new Date(`${returnDateStr}T23:59:59`);
  if (due < new Date()) return 'late';
  return 'borrowed';
}

// ════════════════════════════════════════════════════════════════
// GET /students/search
// ════════════════════════════════════════════════════════════════
router.get('/students/search', requireRole(LIBRARY_ROLES), async (req, res) => {
  try {
    await ensureLibraryTables();
    const schoolId = resolveSchoolId(req);
    if (!schoolId) return res.status(400).json({ success: false, message: 'School not found in session.' });

    const q = trimStr(req.query.q || '');
    if (q.length < 1) {
      return res.json({ success: true, data: [] });
    }

    const like = `%${q}%`;
    // Do not JOIN school_classes on class_id — many schools only have students.class_name (no class_id column).
    const [rows] = await promisePool.query(
      `SELECT s.id, s.first_name, s.last_name, s.student_code, s.student_uid, s.sdm_code,
              s.class_name,
              CONCAT(s.first_name, ' ', s.last_name) AS full_name
       FROM students s
       WHERE s.school_id = ?
         AND (
           s.student_code LIKE ? OR s.student_uid LIKE ? OR s.sdm_code LIKE ?
           OR s.first_name LIKE ? OR s.last_name LIKE ?
           OR CONCAT(s.first_name, ' ', s.last_name) LIKE ?
         )
       ORDER BY s.last_name ASC, s.first_name ASC
       LIMIT 40`,
      [schoolId, like, like, like, like, like, like]
    );

    const data = (rows || []).map((r) => {
      const cls = trimStr(r.class_name) || '—';
      return {
        id: r.id,
        name: trimStr(r.full_name),
        class_name: cls,
        code: r.student_code || r.student_uid || String(r.id),
        student_code: r.student_code,
        sdms_code: r.sdm_code,
      };
    });

    return res.json({ success: true, data });
  } catch (err) {
    console.error('GET /students/search', err);
    return res.status(500).json({ success: false, message: 'Search failed' });
  }
});

// ════════════════════════════════════════════════════════════════
// GET /staff/search  (teachers / staff directory)
// ════════════════════════════════════════════════════════════════
router.get('/staff/search', requireRole(LIBRARY_ROLES), async (req, res) => {
  try {
    await ensureLibraryTables();
    const schoolId = resolveSchoolId(req);
    if (!schoolId) return res.status(400).json({ success: false, message: 'School not found in session.' });

    const q = trimStr(req.query.q || '');
    if (q.length < 1) {
      return res.json({ success: true, data: [] });
    }

    const like = `%${q}%`;
    const [rows] = await promisePool.query(
      `SELECT u.id AS user_id, u.first_name, u.last_name, u.user_uid,
              st.staff_id,
              r.role_name,
              r.role_code
       FROM staff st
       INNER JOIN users u ON u.id = st.user_id AND u.deleted_at IS NULL
       INNER JOIN roles r ON r.id = u.role_id
       WHERE st.school_id = ?
         AND (
           st.staff_id LIKE ? OR u.user_uid LIKE ?
           OR u.first_name LIKE ? OR u.last_name LIKE ?
           OR CONCAT(u.first_name, ' ', u.last_name) LIKE ?
           OR u.email LIKE ? OR u.phone LIKE ? OR u.username LIKE ?
         )
       ORDER BY u.last_name ASC, u.first_name ASC
       LIMIT 40`,
      [schoolId, like, like, like, like, like, like, like, like]
    );

    const userIds = (rows || []).map((r) => r.user_id);
    let teachingMap = {};
    if (userIds.length) {
      try {
        const placeholders = userIds.map(() => '?').join(',');
        const [ttRows] = await promisePool.query(
          `SELECT st.user_id,
                  GROUP_CONCAT(DISTINCT CONCAT(tt.subject_name, ' · ', tt.class_name) ORDER BY tt.subject_name SEPARATOR ' | ') AS teaching
           FROM academic_timetables tt
           INNER JOIN staff st ON st.id = tt.staff_id AND st.school_id = tt.school_id
           WHERE tt.school_id = ? AND st.user_id IN (${placeholders})
           GROUP BY st.user_id`,
          [schoolId, ...userIds]
        );
        teachingMap = Object.fromEntries((ttRows || []).map((t) => [t.user_id, t.teaching]));
      } catch {
        teachingMap = {};
      }
    }

    const data = (rows || []).map((r) => ({
      user_id: r.user_id,
      name: `${trimStr(r.first_name)} ${trimStr(r.last_name)}`.trim(),
      role: r.role_name || r.role_code || 'Staff',
      staff_id: r.staff_id || r.user_uid,
      course_teaching: teachingMap[r.user_id] || '—',
    }));

    return res.json({ success: true, data });
  } catch (err) {
    console.error('GET /staff/search', err);
    return res.status(500).json({ success: false, message: 'Staff search failed' });
  }
});

// ════════════════════════════════════════════════════════════════
// Books CRUD
// ════════════════════════════════════════════════════════════════

router.get('/books', requireRole(LIBRARY_ROLES), async (req, res) => {
  try {
    await ensureLibraryTables();
    const schoolId = resolveSchoolId(req);
    if (!schoolId) return res.status(400).json({ success: false, message: 'School not found in session.' });

    const q = trimStr(req.query.q || '');
    const category = trimStr(req.query.category || '');
    const author = trimStr(req.query.author || '');
    const availability = trimStr(req.query.availability || ''); // in_stock | out | low

    let sql = `SELECT * FROM library_books WHERE school_id = ?`;
    const params = [schoolId];

    if (q) {
      sql += ` AND (title LIKE ? OR author LIKE ? OR isbn LIKE ? OR category LIKE ? OR shelf_location LIKE ?)`;
      const like = `%${q}%`;
      params.push(like, like, like, like, like);
    }
    if (category) {
      sql += ` AND category = ?`;
      params.push(category);
    }
    if (author) {
      sql += ` AND author LIKE ?`;
      params.push(`%${author}%`);
    }
    if (availability === 'in_stock') {
      sql += ` AND available_quantity > 0`;
    } else if (availability === 'out') {
      sql += ` AND available_quantity = 0`;
    } else if (availability === 'low') {
      sql += ` AND available_quantity > 0 AND available_quantity < 3`;
    }

    sql += ` ORDER BY title ASC`;

    const [rows] = await promisePool.query(sql, params);
    const base = (process.env.PUBLIC_API_URL || '').replace(/\/$/, '') || '';
    const data = (rows || []).map((b) => ({
      ...b,
      cover_image_url: b.cover_image
        ? `${base}/uploads/library-covers/${b.cover_image}`
        : null,
    }));
    return res.json({ success: true, data });
  } catch (err) {
    console.error('GET /books', err);
    return res.status(500).json({ success: false, message: 'Failed to list books' });
  }
});

router.get('/books/:id/qr.png', requireRole(LIBRARY_ROLES), async (req, res) => {
  try {
    await ensureLibraryTables();
    const schoolId = resolveSchoolId(req);
    const id = Number(req.params.id);
    if (!schoolId || Number.isNaN(id)) return res.status(400).end();

    const [[b]] = await promisePool.query(
      'SELECT id, isbn, title FROM library_books WHERE id = ? AND school_id = ? LIMIT 1',
      [id, schoolId]
    );
    if (!b) return res.status(404).end();

    const payload = JSON.stringify({ t: 'library_book', id: b.id, isbn: b.isbn, title: b.title });
    const png = await QRCode.toBuffer(payload, { type: 'png', width: 256, margin: 1 });
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    return res.send(png);
  } catch (err) {
    console.error('GET /books/:id/qr.png', err);
    return res.status(500).end();
  }
});

function optionalCoverUpload(req, res, next) {
  const ct = req.headers['content-type'] || '';
  if (ct.includes('multipart/form-data')) {
    return coverUpload.single('cover_image')(req, res, (err) => {
      if (err) return res.status(400).json({ success: false, message: err.message || 'Upload failed' });
      next();
    });
  }
  next();
}

router.post(
  '/books',
  requireRole(LIBRARY_ROLES),
  optionalCoverUpload,
  async (req, res) => {
    try {
      await ensureLibraryTables();
      const schoolId = resolveSchoolId(req);
      if (!schoolId) return res.status(400).json({ success: false, message: 'School not found in session.' });

      const body = req.body || {};
      const title = trimStr(body.title);
      const isbn = trimStr(body.isbn);
      const author = trimStr(body.author);
      const category = trimStr(body.category);
      const shelf_location = trimStr(body.shelf_location);
      const cond = trimStr(body.condition || body.book_condition || 'Good');
      const quantity = Math.max(0, parseInt(body.quantity, 10) || 0);

      if (!title || !isbn || !author || !category || !shelf_location) {
        return res.status(400).json({ success: false, message: 'Missing required fields' });
      }
      if (!['New', 'Good', 'Old', 'Damaged'].includes(cond)) {
        return res.status(400).json({ success: false, message: 'Invalid condition' });
      }
      if (quantity < 1) {
        return res.status(400).json({ success: false, message: 'Quantity must be at least 1' });
      }

      const publisher = trimStr(body.publisher) || null;
      const year = body.year !== undefined && body.year !== '' ? parseInt(body.year, 10) : null;
      const edition = trimStr(body.edition) || null;
      const language = trimStr(body.language) || null;
      const description = trimStr(body.description) || null;
      const cover_image = req.file?.filename || null;

      const [r] = await promisePool.query(
        `INSERT INTO library_books (
          school_id, title, isbn, author, category, quantity, available_quantity,
          shelf_location, \`condition\`, publisher, \`year\`, edition, language, description, cover_image
        ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [
          schoolId, title, isbn, author, category, quantity, quantity,
          shelf_location, cond, publisher, Number.isFinite(year) ? year : null,
          edition, language, description, cover_image,
        ]
      );

      const [[created]] = await promisePool.query(
        'SELECT * FROM library_books WHERE id = ? LIMIT 1',
        [r.insertId]
      );
      return res.status(201).json({ success: true, data: created });
    } catch (err) {
      if (err.code === 'ER_DUP_ENTRY') {
        return res.status(409).json({ success: false, message: 'ISBN already exists for this school' });
      }
      console.error('POST /books', err);
      return res.status(500).json({ success: false, message: 'Failed to create book' });
    }
  }
);

router.put(
  '/books/:id',
  requireRole(LIBRARY_ROLES),
  optionalCoverUpload,
  async (req, res) => {
    try {
      await ensureLibraryTables();
      const schoolId = resolveSchoolId(req);
      const id = Number(req.params.id);
      if (!schoolId || Number.isNaN(id)) return res.status(400).json({ success: false, message: 'Invalid request' });

      const [[existing]] = await promisePool.query(
        'SELECT * FROM library_books WHERE id = ? AND school_id = ? LIMIT 1',
        [id, schoolId]
      );
      if (!existing) return res.status(404).json({ success: false, message: 'Book not found' });

      const body = req.body || {};
      const title = trimStr(body.title ?? existing.title);
      const isbn = trimStr(body.isbn ?? existing.isbn);
      const author = trimStr(body.author ?? existing.author);
      const category = trimStr(body.category ?? existing.category);
      const shelf_location = trimStr(body.shelf_location ?? existing.shelf_location);
      const cond = trimStr(body.condition ?? existing.condition);
      const quantity = Math.max(0, parseInt(body.quantity ?? existing.quantity, 10) || 0);

      if (!title || !isbn || !author || !category || !shelf_location) {
        return res.status(400).json({ success: false, message: 'Missing required fields' });
      }
      if (!['New', 'Good', 'Old', 'Damaged'].includes(cond)) {
        return res.status(400).json({ success: false, message: 'Invalid condition' });
      }
      if (quantity < 1) {
        return res.status(400).json({ success: false, message: 'Quantity must be at least 1' });
      }

      const [[sumRow]] = await promisePool.query(
        `SELECT COALESCE(SUM(quantity),0) AS out_qty FROM library_borrowings
         WHERE book_id = ? AND school_id = ? AND status IN ('borrowed','late')`,
        [id, schoolId]
      );
      const outQty = Number(sumRow?.out_qty || 0);
      const available_quantity = Math.max(0, quantity - outQty);

      let cover_image = existing.cover_image;
      if (req.file?.filename) {
        if (existing.cover_image) {
          const oldPath = path.join(LIB_COVER_DIR, existing.cover_image);
          fs.unlink(oldPath, () => {});
        }
        cover_image = req.file.filename;
      }

      const publisher = body.publisher !== undefined ? (trimStr(body.publisher) || null) : existing.publisher;
      const year =
        body.year !== undefined
          ? (body.year === '' || body.year === null
              ? null
              : parseInt(body.year, 10))
          : existing.year;
      const edition = body.edition !== undefined ? (trimStr(body.edition) || null) : existing.edition;
      const language = body.language !== undefined ? (trimStr(body.language) || null) : existing.language;
      const description =
        body.description !== undefined ? (trimStr(body.description) || null) : existing.description;

      await promisePool.query(
        `UPDATE library_books SET
          title=?, isbn=?, author=?, category=?, quantity=?, available_quantity=?,
          shelf_location=?, \`condition\`=?, publisher=?, \`year\`=?, edition=?, language=?, description=?,
          cover_image=?
         WHERE id=? AND school_id=?`,
        [
          title, isbn, author, category, quantity, available_quantity,
          shelf_location, cond, publisher, Number.isFinite(year) ? year : null, edition, language, description,
          cover_image, id, schoolId,
        ]
      );

      const [[updated]] = await promisePool.query(
        'SELECT * FROM library_books WHERE id = ? LIMIT 1',
        [id]
      );
      return res.json({ success: true, data: updated });
    } catch (err) {
      if (err.code === 'ER_DUP_ENTRY') {
        return res.status(409).json({ success: false, message: 'ISBN already exists for this school' });
      }
      console.error('PUT /books/:id', err);
      return res.status(500).json({ success: false, message: 'Failed to update book' });
    }
  }
);

router.delete('/books/:id', requireRole(LIBRARY_ROLES), async (req, res) => {
  try {
    await ensureLibraryTables();
    const schoolId = resolveSchoolId(req);
    const id = Number(req.params.id);
    if (!schoolId || Number.isNaN(id)) return res.status(400).json({ success: false, message: 'Invalid request' });

    const [[row]] = await promisePool.query(
      'SELECT id, cover_image FROM library_books WHERE id = ? AND school_id = ? LIMIT 1',
      [id, schoolId]
    );
    if (!row) return res.status(404).json({ success: false, message: 'Book not found' });

    const [[a]] = await promisePool.query(
      `SELECT COUNT(*) AS c FROM library_borrowings WHERE book_id = ? AND school_id = ? AND status IN ('borrowed','late')`,
      [id, schoolId]
    );
    if (Number(a?.c) > 0) {
      return res.status(400).json({ success: false, message: 'Cannot delete: active borrowings exist' });
    }

    await promisePool.query('DELETE FROM library_borrowings WHERE book_id = ? AND school_id = ?', [id, schoolId]);
    await promisePool.query('DELETE FROM library_books WHERE id = ? AND school_id = ?', [id, schoolId]);

    if (row.cover_image) {
      fs.unlink(path.join(LIB_COVER_DIR, row.cover_image), () => {});
    }
    return res.json({ success: true, message: 'Book removed' });
  } catch (err) {
    console.error('DELETE /books/:id', err);
    return res.status(500).json({ success: false, message: 'Failed to delete book' });
  }
});

router.post(
  '/books/bulk-csv',
  requireRole(LIBRARY_ROLES),
  csvUpload.single('file'),
  async (req, res) => {
    try {
      await ensureLibraryTables();
      const schoolId = resolveSchoolId(req);
      if (!schoolId) return res.status(400).json({ success: false, message: 'School not found in session.' });
      if (!req.file?.path) return res.status(400).json({ success: false, message: 'CSV file required' });

      const raw = fs.readFileSync(req.file.path, 'utf8');
      fs.unlink(req.file.path, () => {});

      const lines = raw.split(/\r?\n/).filter((l) => trimStr(l));
      if (lines.length < 2) {
        return res.status(400).json({ success: false, message: 'CSV must include a header row and one data row' });
      }

      const header = parseCsvLine(lines[0]).map((h) => h.toLowerCase().replace(/\s+/g, '_'));
      const idx = (name) => header.indexOf(name);

      let inserted = 0;
      const errors = [];

      for (let i = 1; i < lines.length; i++) {
        const cols = parseCsvLine(lines[i]);
        if (!cols.some((c) => trimStr(c))) continue;

        const get = (aliases) => {
          for (const a of aliases) {
            const j = idx(a);
            if (j >= 0 && cols[j] !== undefined) return trimStr(cols[j]);
          }
          return '';
        };

        const title = get(['title', 'book_title']);
        const isbn = get(['isbn', 'book_code', 'code']);
        const author = get(['author']);
        const category = get(['category', 'genre']);
        const quantity = parseInt(get(['quantity', 'copies']), 10) || 0;
        const shelf_location = get(['shelf_location', 'shelf', 'location']);
        const cond = get(['condition']) || 'Good';
        const publisher = get(['publisher']) || null;
        const yearRaw = get(['year', 'year_of_publication']);
        const year = yearRaw ? parseInt(yearRaw, 10) : null;
        const edition = get(['edition']) || null;
        const language = get(['language']) || null;
        const description = get(['description']) || null;

        if (!title || !isbn || !author || !category || !shelf_location || quantity < 1) {
          errors.push({ line: i + 1, message: 'Missing required columns' });
          continue;
        }
        if (!['New', 'Good', 'Old', 'Damaged'].includes(cond)) {
          errors.push({ line: i + 1, message: 'Invalid condition' });
          continue;
        }

        try {
          await promisePool.query(
            `INSERT INTO library_books (
              school_id, title, isbn, author, category, quantity, available_quantity,
              shelf_location, \`condition\`, publisher, \`year\`, edition, language, description
            ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
            [
              schoolId, title, isbn, author, category, quantity, quantity,
              shelf_location, cond, publisher, Number.isFinite(year) ? year : null,
              edition, language, description,
            ]
          );
          inserted += 1;
        } catch (e) {
          if (e.code === 'ER_DUP_ENTRY') {
            errors.push({ line: i + 1, message: 'Duplicate ISBN' });
          } else {
            errors.push({ line: i + 1, message: e.message || 'Insert failed' });
          }
        }
      }

      return res.json({
        success: true,
        inserted,
        errors,
        message: `Imported ${inserted} book(s)`,
      });
    } catch (err) {
      console.error('POST /books/bulk-csv', err);
      return res.status(500).json({ success: false, message: 'Bulk import failed' });
    }
  }
);

// ════════════════════════════════════════════════════════════════
// Borrowings
// ════════════════════════════════════════════════════════════════

router.get('/borrowings', requireRole(LIBRARY_ROLES), async (req, res) => {
  try {
    await ensureLibraryTables();
    const schoolId = resolveSchoolId(req);
    if (!schoolId) return res.status(400).json({ success: false, message: 'School not found in session.' });

    const statusFilter = trimStr(req.query.status || 'active'); // active | returned | all
    const userType = trimStr(req.query.user_type || '');
    const userId = parseInt(req.query.user_id, 10);

    let sql = `
      SELECT lb.*, bk.title AS book_title, bk.isbn AS book_isbn,
        CASE
          WHEN lb.user_type = 'student' THEN CONCAT(s.first_name, ' ', s.last_name)
          ELSE CONCAT(u.first_name, ' ', u.last_name)
        END AS borrower_name,
        CASE
          WHEN lb.user_type = 'student' THEN COALESCE(NULLIF(s.class_name,''), '—')
          ELSE COALESCE(r.role_name, r.role_code, 'Teacher')
        END AS borrower_detail
      FROM library_borrowings lb
      INNER JOIN library_books bk ON bk.id = lb.book_id AND bk.school_id = lb.school_id
      LEFT JOIN students s ON lb.user_type = 'student' AND s.id = lb.user_id AND s.school_id = lb.school_id
      LEFT JOIN users u ON lb.user_type = 'teacher' AND u.id = lb.user_id
      LEFT JOIN roles r ON u.role_id = r.id
      WHERE lb.school_id = ?
    `;
    const params = [schoolId];

    if (statusFilter === 'active') {
      sql += ` AND lb.status IN ('borrowed','late')`;
    } else if (statusFilter === 'returned') {
      sql += ` AND lb.status = 'returned'`;
    }

    if (userType && ['student', 'teacher'].includes(userType) && Number.isFinite(userId)) {
      sql += ` AND lb.user_type = ? AND lb.user_id = ?`;
      params.push(userType, userId);
    }

    sql +=
      statusFilter === 'returned'
        ? ` ORDER BY COALESCE(lb.returned_at, lb.borrow_date) DESC, lb.id DESC LIMIT 500`
        : ` ORDER BY lb.borrow_date DESC, lb.id DESC LIMIT 500`;

    const [rows] = await promisePool.query(sql, params);
    const today = todayStr();
    const data = (rows || []).map((r) => {
      const st = r.status === 'returned' ? 'returned' : deriveBorrowingStatus(r.return_date, r.status);
      let daysOverdue = 0;
      if (st !== 'returned' && r.return_date) {
        const dueEod = new Date(`${r.return_date}T23:59:59`);
        if (dueEod < new Date()) {
          daysOverdue = Math.max(0, Math.floor((Date.now() - dueEod.getTime()) / 86400000));
        }
      }
      let lateReturn = false;
      if (r.status === 'returned' && r.returned_at && r.return_date) {
        lateReturn = new Date(r.returned_at) > new Date(`${r.return_date}T23:59:59`);
      }
      return {
        ...r,
        status: st,
        overdue: st === 'late',
        due_date: r.return_date,
        days_overdue: daysOverdue,
        late_return: lateReturn,
      };
    });

    return res.json({ success: true, data, server_date: today });
  } catch (err) {
    console.error('GET /borrowings', err);
    return res.status(500).json({ success: false, message: 'Failed to list borrowings' });
  }
});

router.post('/borrowings', requireRole(LIBRARY_ROLES), async (req, res) => {
  const conn = await promisePool.getConnection();
  try {
    await ensureLibraryTables();
    const schoolId = resolveSchoolId(req);
    if (!schoolId) {
      conn.release();
      return res.status(400).json({ success: false, message: 'School not found in session.' });
    }

    const body = req.body || {};
    const userType = trimStr(body.user_type);
    const userId = parseInt(body.user_id, 10);
    const bookId = parseInt(body.book_id, 10);
    const qty = Math.max(1, parseInt(body.quantity, 10) || 1);
    const borrow_date = trimStr(body.borrow_date) || todayStr();
    const return_date = trimStr(body.return_date);
    const notes = trimStr(body.notes) || null;

    if (!['student', 'teacher'].includes(userType) || !Number.isFinite(userId) || !Number.isFinite(bookId)) {
      conn.release();
      return res.status(400).json({ success: false, message: 'Invalid borrower or book' });
    }
    if (!return_date) {
      conn.release();
      return res.status(400).json({ success: false, message: 'Return date is required' });
    }
    if (new Date(return_date) < new Date(borrow_date)) {
      conn.release();
      return res.status(400).json({ success: false, message: 'Return date must be on or after borrow date' });
    }

    await conn.beginTransaction();

    const [[book]] = await conn.query(
      'SELECT * FROM library_books WHERE id = ? AND school_id = ? FOR UPDATE',
      [bookId, schoolId]
    );
    if (!book) {
      await conn.rollback();
      conn.release();
      return res.status(404).json({ success: false, message: 'Book not found' });
    }
    if (book.available_quantity < qty) {
      await conn.rollback();
      conn.release();
      return res.status(400).json({ success: false, message: 'Not enough copies available' });
    }

    if (userType === 'student') {
      const [[st]] = await conn.query(
        'SELECT id FROM students WHERE id = ? AND school_id = ? LIMIT 1',
        [userId, schoolId]
      );
      if (!st) {
        await conn.rollback();
        conn.release();
        return res.status(400).json({ success: false, message: 'Student not found' });
      }
    } else {
      const [[st]] = await conn.query(
        `SELECT u.id FROM staff st INNER JOIN users u ON u.id = st.user_id
         WHERE u.id = ? AND st.school_id = ? LIMIT 1`,
        [userId, schoolId]
      );
      if (!st) {
        await conn.rollback();
        conn.release();
        return res.status(400).json({ success: false, message: 'Staff member not found' });
      }
    }

    const maxBooks = userType === 'student' ? maxStudentBooks() : maxTeacherBooks();
    const [[cntRow]] = await conn.query(
      `SELECT COALESCE(SUM(quantity),0) AS n FROM library_borrowings
       WHERE school_id = ? AND user_type = ? AND user_id = ? AND status IN ('borrowed','late')`,
      [schoolId, userType, userId]
    );
    const current = Number(cntRow?.n || 0);
    if (current + qty > maxBooks) {
      await conn.rollback();
      conn.release();
      return res.status(400).json({
        success: false,
        message: `Borrowing limit reached (${maxBooks} books for this user type)`,
      });
    }

    const status = deriveBorrowingStatus(return_date, 'borrowed');

    const [ins] = await conn.query(
      `INSERT INTO library_borrowings (
        school_id, user_type, user_id, book_id, quantity, borrow_date, return_date, status, notes
      ) VALUES (?,?,?,?,?,?,?,?,?)`,
      [schoolId, userType, userId, bookId, qty, borrow_date, return_date, status, notes]
    );

    await conn.query(
      'UPDATE library_books SET available_quantity = available_quantity - ? WHERE id = ? AND school_id = ?',
      [qty, bookId, schoolId]
    );

    await conn.commit();
    conn.release();

    const [[created]] = await promisePool.query(
      `SELECT lb.*, bk.title AS book_title FROM library_borrowings lb
       INNER JOIN library_books bk ON bk.id = lb.book_id
       WHERE lb.id = ? LIMIT 1`,
      [ins.insertId]
    );

    return res.status(201).json({ success: true, data: created });
  } catch (err) {
    try {
      await conn.rollback();
    } catch {}
    conn.release();
    console.error('POST /borrowings', err);
    return res.status(500).json({ success: false, message: 'Borrow failed' });
  }
});

router.put('/borrowings/return/:id', requireRole(LIBRARY_ROLES), async (req, res) => {
  const conn = await promisePool.getConnection();
  try {
    await ensureLibraryTables();
    const schoolId = resolveSchoolId(req);
    const borrowId = parseInt(req.params.id, 10);
    if (!schoolId || Number.isNaN(borrowId)) {
      conn.release();
      return res.status(400).json({ success: false, message: 'Invalid request' });
    }

    await conn.beginTransaction();

    const [[row]] = await conn.query(
      'SELECT * FROM library_borrowings WHERE id = ? AND school_id = ? FOR UPDATE',
      [borrowId, schoolId]
    );
    if (!row) {
      await conn.rollback();
      conn.release();
      return res.status(404).json({ success: false, message: 'Borrowing not found' });
    }
    if (row.status === 'returned') {
      await conn.rollback();
      conn.release();
      return res.status(400).json({ success: false, message: 'Already returned' });
    }

    await conn.query(
      `UPDATE library_borrowings SET status = 'returned', returned_at = CURDATE() WHERE id = ? AND school_id = ?`,
      [borrowId, schoolId]
    );

    await conn.query(
      'UPDATE library_books SET available_quantity = available_quantity + ? WHERE id = ? AND school_id = ?',
      [row.quantity, row.book_id, schoolId]
    );

    await conn.commit();
    conn.release();

    return res.json({ success: true, message: 'Book returned' });
  } catch (err) {
    try {
      await conn.rollback();
    } catch {}
    conn.release();
    console.error('PUT /borrowings/return/:id', err);
    return res.status(500).json({ success: false, message: 'Return failed' });
  }
});

// ════════════════════════════════════════════════════════════════
// Dashboard & notifications & reports
// ════════════════════════════════════════════════════════════════

router.get('/library/dashboard', requireRole(LIBRARY_ROLES), async (req, res) => {
  try {
    await ensureLibraryTables();
    const schoolId = resolveSchoolId(req);
    if (!schoolId) return res.status(400).json({ success: false, message: 'School not found in session.' });

    const [[booksAgg]] = await promisePool.query(
      `SELECT
         COUNT(*) AS total_titles,
         COALESCE(SUM(quantity),0) AS total_copies,
         COALESCE(SUM(available_quantity),0) AS available_copies
       FROM library_books WHERE school_id = ?`,
      [schoolId]
    );

    const [[loanAgg]] = await promisePool.query(
      `SELECT
         COUNT(*) AS active_loans,
         SUM(CASE WHEN return_date < CURDATE() AND status IN ('borrowed','late') THEN 1 ELSE 0 END) AS overdue_loans
       FROM library_borrowings WHERE school_id = ? AND status IN ('borrowed','late')`,
      [schoolId]
    );

    const [topRows] = await promisePool.query(
      `SELECT bk.title, bk.id AS book_id, COUNT(*) AS borrow_count
       FROM library_borrowings lb
       INNER JOIN library_books bk ON bk.id = lb.book_id
       WHERE lb.school_id = ?
       GROUP BY bk.id, bk.title
       ORDER BY borrow_count DESC
       LIMIT 8`,
      [schoolId]
    );

    const totalCopies = Number(booksAgg?.total_copies || 0);
    const available = Number(booksAgg?.available_copies || 0);
    const borrowed = Math.max(0, totalCopies - available);

    return res.json({
      success: true,
      data: {
        total_titles: Number(booksAgg?.total_titles || 0),
        total_copies: totalCopies,
        available_copies: available,
        borrowed_copies: borrowed,
        active_loans: Number(loanAgg?.active_loans || 0),
        overdue_loans: Number(loanAgg?.overdue_loans || 0),
        top_borrowed: topRows || [],
      },
    });
  } catch (err) {
    console.error('GET /library/dashboard', err);
    return res.status(500).json({ success: false, message: 'Dashboard failed' });
  }
});

router.get('/library/notifications', requireRole(LIBRARY_ROLES), async (req, res) => {
  try {
    await ensureLibraryTables();
    const schoolId = resolveSchoolId(req);
    if (!schoolId) return res.status(400).json({ success: false, message: 'School not found in session.' });

    const [rows] = await promisePool.query(
      `SELECT lb.id, lb.return_date, lb.user_type,
        CASE
          WHEN lb.user_type = 'student' THEN CONCAT(s.first_name, ' ', s.last_name)
          ELSE CONCAT(u.first_name, ' ', u.last_name)
        END AS borrower_name,
        bk.title AS book_title
       FROM library_borrowings lb
       INNER JOIN library_books bk ON bk.id = lb.book_id
       LEFT JOIN students s ON lb.user_type = 'student' AND s.id = lb.user_id
       LEFT JOIN users u ON lb.user_type = 'teacher' AND u.id = lb.user_id
       WHERE lb.school_id = ? AND lb.status IN ('borrowed','late')
         AND lb.return_date <= DATE_ADD(CURDATE(), INTERVAL 2 DAY)
       ORDER BY lb.return_date ASC
       LIMIT 50`,
      [schoolId]
    );

    const data = (rows || []).map((r) => ({
      ...r,
      kind: new Date(`${r.return_date}T23:59:59`) < new Date() ? 'overdue' : 'due_soon',
    }));

    return res.json({ success: true, data });
  } catch (err) {
    console.error('GET /library/notifications', err);
    return res.status(500).json({ success: false, message: 'Notifications failed' });
  }
});

router.get('/library/reports/daily', requireRole(LIBRARY_ROLES), async (req, res) => {
  try {
    await ensureLibraryTables();
    const schoolId = resolveSchoolId(req);
    if (!schoolId) return res.status(400).json({ success: false, message: 'School not found in session.' });

    const day = trimStr(req.query.date || todayStr());

    const [borrowed] = await promisePool.query(
      `SELECT lb.*, bk.title AS book_title,
        CASE
          WHEN lb.user_type = 'student' THEN CONCAT(s.first_name, ' ', s.last_name)
          ELSE CONCAT(u.first_name, ' ', u.last_name)
        END AS borrower_name
       FROM library_borrowings lb
       INNER JOIN library_books bk ON bk.id = lb.book_id
       LEFT JOIN students s ON lb.user_type = 'student' AND s.id = lb.user_id
       LEFT JOIN users u ON lb.user_type = 'teacher' AND u.id = lb.user_id
       WHERE lb.school_id = ? AND lb.borrow_date = ?`,
      [schoolId, day]
    );

    const [returned] = await promisePool.query(
      `SELECT lb.*, bk.title AS book_title,
        CASE
          WHEN lb.user_type = 'student' THEN CONCAT(s.first_name, ' ', s.last_name)
          ELSE CONCAT(u.first_name, ' ', u.last_name)
        END AS borrower_name
       FROM library_borrowings lb
       INNER JOIN library_books bk ON bk.id = lb.book_id
       LEFT JOIN students s ON lb.user_type = 'student' AND s.id = lb.user_id
       LEFT JOIN users u ON lb.user_type = 'teacher' AND u.id = lb.user_id
       WHERE lb.school_id = ? AND lb.status = 'returned' AND lb.returned_at = ?`,
      [schoolId, day]
    );

    return res.json({ success: true, date: day, borrowed, returned });
  } catch (err) {
    console.error('GET /library/reports/daily', err);
    return res.status(500).json({ success: false, message: 'Daily report failed' });
  }
});

router.get('/library/reports/monthly', requireRole(LIBRARY_ROLES), async (req, res) => {
  try {
    await ensureLibraryTables();
    const schoolId = resolveSchoolId(req);
    if (!schoolId) return res.status(400).json({ success: false, message: 'School not found in session.' });

    const y = parseInt(req.query.year || String(new Date().getFullYear()), 10);
    const m = parseInt(req.query.month || String(new Date().getMonth() + 1), 10);
    if (!Number.isFinite(y) || !Number.isFinite(m) || m < 1 || m > 12) {
      return res.status(400).json({ success: false, message: 'Invalid year/month' });
    }

    const pad = (n) => String(n).padStart(2, '0');
    const start = `${y}-${pad(m)}-01`;
    const endDate = new Date(y, m, 0);
    const end = `${y}-${pad(m)}-${pad(endDate.getDate())}`;

    const [[agg]] = await promisePool.query(
      `SELECT
         COUNT(*) AS total_transactions,
         SUM(CASE WHEN status IN ('borrowed','late') THEN 1 ELSE 0 END) AS outstanding_created,
         SUM(CASE WHEN status = 'returned' THEN 1 ELSE 0 END) AS returns_recorded
       FROM library_borrowings
       WHERE school_id = ? AND borrow_date BETWEEN ? AND ?`,
      [schoolId, start, end]
    );

    const [byDay] = await promisePool.query(
      `SELECT borrow_date AS day, COUNT(*) AS cnt
       FROM library_borrowings
       WHERE school_id = ? AND borrow_date BETWEEN ? AND ?
       GROUP BY borrow_date ORDER BY borrow_date ASC`,
      [schoolId, start, end]
    );

    return res.json({
      success: true,
      year: y,
      month: m,
      range: { start, end },
      summary: agg,
      borrowings_by_day: byDay,
    });
  } catch (err) {
    console.error('GET /library/reports/monthly', err);
    return res.status(500).json({ success: false, message: 'Monthly report failed' });
  }
});

router.get('/library/reports/condition', requireRole(LIBRARY_ROLES), async (req, res) => {
  try {
    await ensureLibraryTables();
    const schoolId = resolveSchoolId(req);
    if (!schoolId) return res.status(400).json({ success: false, message: 'School not found in session.' });

    const [rows] = await promisePool.query(
      `SELECT id, title, isbn, author, category, quantity, available_quantity, \`condition\`, shelf_location
       FROM library_books
       WHERE school_id = ? AND \`condition\` = 'Damaged'
       ORDER BY title ASC`,
      [schoolId]
    );

    return res.json({ success: true, data: rows });
  } catch (err) {
    console.error('GET /library/reports/condition', err);
    return res.status(500).json({ success: false, message: 'Condition report failed' });
  }
});

router.get('/library/limits', requireRole(LIBRARY_ROLES), async (req, res) => {
  try {
    return res.json({
      success: true,
      data: {
        max_student_books: maxStudentBooks(),
        max_teacher_books: maxTeacherBooks(),
      },
    });
  } catch (err) {
    console.error('GET /library/limits', err);
    return res.status(500).json({ success: false, message: 'Failed' });
  }
});

router.get('/library/reports/overdue', requireRole(LIBRARY_ROLES), async (req, res) => {
  try {
    await ensureLibraryTables();
    const schoolId = resolveSchoolId(req);
    if (!schoolId) return res.status(400).json({ success: false, message: 'School not found in session.' });

    const [rows] = await promisePool.query(
      `SELECT lb.*, bk.title AS book_title, bk.isbn AS book_isbn,
        CASE
          WHEN lb.user_type = 'student' THEN CONCAT(s.first_name, ' ', s.last_name)
          ELSE CONCAT(u.first_name, ' ', u.last_name)
        END AS borrower_name,
        CASE
          WHEN lb.user_type = 'student' THEN COALESCE(NULLIF(s.class_name,''), '—')
          ELSE COALESCE(r.role_name, r.role_code, 'Staff')
        END AS borrower_detail,
        DATEDIFF(CURDATE(), lb.return_date) AS days_past_due
       FROM library_borrowings lb
       INNER JOIN library_books bk ON bk.id = lb.book_id AND bk.school_id = lb.school_id
       LEFT JOIN students s ON lb.user_type = 'student' AND s.id = lb.user_id AND s.school_id = lb.school_id
       LEFT JOIN users u ON lb.user_type = 'teacher' AND u.id = lb.user_id
       LEFT JOIN roles r ON u.role_id = r.id
       WHERE lb.school_id = ?
         AND lb.status IN ('borrowed','late')
         AND lb.return_date < CURDATE()
       ORDER BY lb.return_date ASC, lb.id ASC
       LIMIT 500`,
      [schoolId]
    );

    return res.json({ success: true, data: rows || [], server_date: todayStr() });
  } catch (err) {
    console.error('GET /library/reports/overdue', err);
    return res.status(500).json({ success: false, message: 'Overdue report failed' });
  }
});

router.get('/library/reports/book-inventory', requireRole(LIBRARY_ROLES), async (req, res) => {
  try {
    await ensureLibraryTables();
    const schoolId = resolveSchoolId(req);
    if (!schoolId) return res.status(400).json({ success: false, message: 'School not found in session.' });

    const [rows] = await promisePool.query(
      `SELECT
         bk.id,
         bk.title,
         bk.isbn,
         bk.author,
         bk.category,
         bk.shelf_location,
         bk.quantity AS total_copies,
         bk.available_quantity AS in_library,
         bk.available_quantity AS total_remain_in_stock,
         GREATEST(0, bk.quantity - bk.available_quantity) AS copies_out,
         COALESCE((
           SELECT SUM(lb.quantity) FROM library_borrowings lb
           WHERE lb.book_id = bk.id AND lb.school_id = bk.school_id
         ), 0) AS borrowed_qty,
         COALESCE((
           SELECT SUM(lb.quantity) FROM library_borrowings lb
           WHERE lb.book_id = bk.id AND lb.school_id = bk.school_id
             AND lb.status = 'returned'
         ), 0) AS returned_qty,
         COALESCE((
           SELECT SUM(lb.quantity) FROM library_borrowings lb
           WHERE lb.book_id = bk.id AND lb.school_id = bk.school_id
             AND lb.status IN ('borrowed','late')
         ), 0) AS on_loan_qty
       FROM library_books bk
       WHERE bk.school_id = ?
       ORDER BY bk.title ASC`,
      [schoolId]
    );

    return res.json({ success: true, data: rows || [] });
  } catch (err) {
    console.error('GET /library/reports/book-inventory', err);
    return res.status(500).json({ success: false, message: 'Book inventory report failed' });
  }
});

module.exports = router;
