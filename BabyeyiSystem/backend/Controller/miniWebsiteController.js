// BabyeyiControllers/miniWebsiteController.js
// ================================================================
//  Mini-Website Controller — BabyEyi / EduRwanda  v5.1
//
//  CHANGES:
//  ✅ Leadership photos are handled via leaderPhoto_0..N only.
//     "Head Teacher" is saved as role_type='head'; the other roles are role_type='other'.
// ================================================================
'use strict';

const { promisePool: db } = require('../config/database');
const path = require('path');

// ─── HELPERS ─────────────────────────────────────────────────────────────────

const tryJson = (v) => {
  if (v == null) return null;
  if (typeof v !== 'string') return v;
  try { return JSON.parse(v); } catch { return null; }
};
const toJson = (v) => (v == null ? null : JSON.stringify(v));
const toTitleLabel = (raw) => String(raw || '')
  .replace(/^custom:/i, '')
  .replace(/[-_]+/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()
  .split(' ')
  .filter(Boolean)
  .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
  .join(' ');

/** Is this a temporary browser blob URL? */
const isBlob = (url) => typeof url === 'string' && url.startsWith('blob:');

/**
 * toUrl — Converts ANY stored path to a clean /uploads/… string.
 *
 * The DB contains mixed formats:
 *   /uploads/school_assets/school_3_asset_xxx.jpg   → fine
 *   uploads\mini-websites\cover-image-xxx.jpg        → backslash + no leading /
 *   /uploads\school-logos\gsgahini-xxx.jpg           → mixed
 */
const toUrl = (filePath) => {
  if (!filePath) return null;
  if (filePath.startsWith('http')) return filePath;
  if (isBlob(filePath)) return null;
  let norm = filePath.replace(/\\/g, '/');
  const stripped = norm.replace(/^\//, '');
  const idx = stripped.indexOf('uploads/');
  if (idx !== -1) return '/' + stripped.slice(idx);
  return '/uploads/' + path.basename(norm);
};

/** Get the first uploaded file URL for a multer field. */
const fileOf = (files, field) => {
  if (!files) return null;
  const f = files[field];
  if (!f) return null;
  const file = Array.isArray(f) ? f[0] : f;
  return file?.path ? toUrl(file.path) : null;
};

const slugify = (str = '') =>
  str.toLowerCase().trim()
     .replace(/[^\w\s-]/g, '')
     .replace(/[\s_]+/g, '-')
     .replace(/-+/g, '-')
     .replace(/^-+|-+$/g, '');

async function uniqueSlug(conn, base, excludeId = null) {
  let slug = base || 'school', n = 1;
  for (;;) {
    const q = excludeId
      ? 'SELECT id FROM school_mini_websites WHERE slug = ? AND id <> ?'
      : 'SELECT id FROM school_mini_websites WHERE slug = ?';
    const [[row]] = await conn.query(q, excludeId ? [slug, excludeId] : [slug]);
    if (!row) return slug;
    slug = `${base}-${n++}`;
  }
}

// ─── MAPPERS ─────────────────────────────────────────────────────────────────

function schoolToForm(s) {
  if (!s) return {};
  return {
    schoolId:         s.id,
    name:             s.school_name          || '',
    code:             s.school_code          || '',
    category:         s.school_category      || '',
    ownership:        s.ownership_type       || '',
    founded:          s.year_established ? String(s.year_established) : '',
    educationLevels:  tryJson(s.education_levels) || [],
    province:         s.province             || '',
    district:         s.district             || '',
    sector:           s.sector               || '',
    cell:             s.cell                 || '',
    village:          s.village              || '',
    address:          s.full_address         || '',
    mapUrl:           s.map_url              || '',
    phone:            s.phone                || '',
    email:            s.email                || '',
    postalAddress:    s.postal_address       || '',
    website:          s.website              || '',
    logoPreview:      toUrl(s.logo_url),
    signaturePreview: toUrl(s.head_signature_url),
    stampPreview:     toUrl(s.school_stamp_url),
    schoolStatus:     s.status               || 'active',
  };
}

function miniToForm(m) {
  if (!m) return {};
  const albums = (tryJson(m.albums) || []).map(a => ({
    ...a,
    images: (a.images || [])
      .filter(img => img.url && !isBlob(img.url))
      .map(img => ({ id: img.id, url: img.url, caption: img.caption || '' })),
  }));
  return {
    miniId:         m.id,
    slug:           m.slug             || '',
    siteStatus:     m.status           || 'draft',
    publishedAt:    m.published_at     || null,
    coverPreview:   toUrl(m.cover_url),
    aboutPreview:   toUrl(m.about_image_url),
    missionPreview: toUrl(m.mission_image_url),
    background:     m.background       || '',
    mission:        m.mission          || '',
    vision:         m.vision           || '',
    coreValues:     tryJson(m.core_values) || [],
    facebook:       m.facebook         || '',
    twitter:        m.twitter          || '',
    instagram:      m.instagram        || '',
    template:       m.template         || 'modern',
    colorTheme:     m.color_theme      || 'blue',
    customColors:   tryJson(m.custom_colors) || null,
    sections:       tryJson(m.sections)      || null,
    aLevelCombos:   tryJson(m.a_level_combinations) || [],
    tvetTrades:     tryJson(m.tvet_trades)           || [],
    internationalPrimaryPrograms: tryJson(m.international_primary_programs) || [],
    internationalOtherPrograms:   tryJson(m.international_other_programs)   || [],
    admission:      tryJson(m.admission) || {},
    fees:           tryJson(m.fees)      || {},
    albums,
    newsItems:      tryJson(m.news_items) || [],
  };
}

// ─── BODY PARSER ─────────────────────────────────────────────────────────────

function parseBody(body, files) {
  const scalars = {
    background: body.background || null,
    mission:    body.mission    || null,
    vision:     body.vision     || null,
    facebook:   body.facebook   || null,
    twitter:    body.twitter    || null,
    instagram:  body.instagram  || null,
    template:   body.template   || 'modern',
    colorTheme: body.colorTheme || 'blue',
  };
  const coreValues   = tryJson(body.coreValues)   || [];
  const aLevelCombos = tryJson(body.aLevelCombos) || [];
  const tvetTrades   = tryJson(body.tvetTrades)   || [];
  const internationalPrimaryPrograms = tryJson(body.internationalPrimaryPrograms) || [];
  const internationalOtherPrograms   = tryJson(body.internationalOtherPrograms)   || [];
  const customColors = tryJson(body.customColors);
  const sections     = tryJson(body.sections);

  // ── Leaders ──────────────────────────────────────────────────────────────
  let leaders = tryJson(body.leaders) || [];
  leaders = leaders.map((l, idx) => {
    const photoFile = fileOf(files, `leaderPhoto_${idx}`);
    const existingPhoto = isBlob(l.photoPreview) ? null : (l.photoPreview || null);
    return {
      id:       l.id    || null,
      name:     (l.name  || '').trim(),
      role:     (l.role  || '').trim(),
      phone:    l.phone  || null,
      email:    l.email  || null,
      photoUrl: photoFile || existingPhoto,
    };
  }).filter(l => l.name);

  // ── Admission ────────────────────────────────────────────────────────────
  let admission = tryJson(body.admission);
  if (admission && typeof admission === 'object') {
    admission = {
      openDate:     admission.openDate     || null,
      closeDate:    admission.closeDate    || null,
      year:         admission.year         || null,
      contactPhone: admission.contactPhone || null,
      steps:        Array.isArray(admission.steps)        ? admission.steps.filter(Boolean)        : [],
      requirements: Array.isArray(admission.requirements) ? admission.requirements.filter(Boolean) : [],
      documents:    Array.isArray(admission.documents)    ? admission.documents.filter(Boolean)    : [],
      notes:        admission.notes || null,
    };
  } else { admission = null; }

  // ── Fees ─────────────────────────────────────────────────────────────────
  const BASE_VALID = new Set(['nursery', 'primary', 'olevel', 'alevel', 'tvet']);
  let fees = tryJson(body.fees);
  if (fees && typeof fees === 'object') {
    const clean = {};
    for (const [lv, d] of Object.entries(fees)) {
      const key = String(lv || '').trim().toLowerCase();
      const isCustom = key.startsWith('custom:');
      if ((!BASE_VALID.has(key) && !isCustom) || !d?.items?.length) continue;
      const items = d.items.filter(i => i?.type || i?.fee_type).map((i, idx) => ({
        type:   (i.type || i.fee_type || '').trim(),
        amount: parseFloat(i.amount) || 0,
        period: i.period || 'Per Term',
        sort:   idx,
      }));
      if (items.length) {
        clean[key] = {
          label: isCustom ? toTitleLabel(d.label || key) : null,
          currency: d.currency || 'RWF',
          notes: d.notes || null,
          items,
        };
      }
    }
    fees = Object.keys(clean).length ? clean : null;
  } else { fees = null; }

  // ── Albums — strip blob URLs ──────────────────────────────────────────────
  let albums = tryJson(body.albums);
  if (Array.isArray(albums)) {
    albums = albums.map(a => ({
      id:          a.id,
      title:       (a.title || '').trim(),
      date:        a.date        || null,
      category:    a.category    || 'Event',
      description: a.description || null,
      images: (a.images || [])
        .filter(img => img.url && !isBlob(img.url))
        .map(img => ({ id: img.id, url: toUrl(img.url), caption: img.caption || '' })),
    }));
  } else { albums = null; }

  let newsItems = tryJson(body.newsItems);
  if (Array.isArray(newsItems)) {
    newsItems = newsItems
      .filter(n => n && String(n.title || '').trim())
      .slice(0, 50)
      .map((n, i) => ({
        id: String(n.id || `news-${i}`).slice(0, 64),
        title: String(n.title || '').trim().slice(0, 200),
        excerpt: String(n.excerpt || '').trim().slice(0, 2000),
        body: String(n.body || '').trim().slice(0, 16000),
        date: n.date ? String(n.date).slice(0, 40) : null,
        socialUrl: n.socialUrl ? String(n.socialUrl).trim().slice(0, 500) : null,
        socialLabel: n.socialLabel ? String(n.socialLabel).trim().slice(0, 120) : null,
      }));
  } else {
    newsItems = null;
  }

  const coverPath        = fileOf(files, 'cover');
  const aboutImagePath   = fileOf(files, 'aboutImage');
  const missionImagePath = fileOf(files, 'missionImage');
  return {
    ...scalars, coreValues, aLevelCombos, tvetTrades, customColors, sections,
    leaders, admission, fees, albums, newsItems,
    internationalPrimaryPrograms,
    internationalOtherPrograms,
    coverPath, aboutImagePath, missionImagePath,
  };
}

async function ensureNewsItemsColumn(conn) {
  try {
    const [rows] = await conn.query(
      'SHOW COLUMNS FROM school_mini_websites WHERE Field = ?',
      ['news_items']
    );
    if (rows?.length) return;
    await conn.query('ALTER TABLE school_mini_websites ADD COLUMN news_items TEXT NULL');
  } catch (e) {
    if (String(e?.code || '').includes('ER_DUP_FIELDNAME')) return;
    if (String(e?.message || '').toLowerCase().includes('duplicate')) return;
    throw e;
  }
}

async function ensureInternationalColumns(conn) {
  const cols = [
    { name: 'international_primary_programs', type: 'TEXT NULL' },
    { name: 'international_other_programs',   type: 'TEXT NULL' },
  ];
  for (const c of cols) {
    try {
      const [rows] = await conn.query(
        'SHOW COLUMNS FROM school_mini_websites WHERE Field = ?',
        [c.name]
      );
      if (rows?.length) continue;
      await conn.query(`ALTER TABLE school_mini_websites ADD COLUMN ${c.name} ${c.type}`);
    } catch (e) {
      // Ignore "already exists" and similar harmless errors.
      if (String(e?.code || '').includes('ER_DUP_FIELDNAME')) continue;
      if (String(e?.message || '').toLowerCase().includes('duplicate')) continue;
      // Re-throw for anything else: we need DB columns to be present.
      throw e;
    }
  }
}

// ─── SYNC HELPERS ────────────────────────────────────────────────────────────

/**
 * True when the wizard role should map to role_type='head' in school_leaders.
 * (UI label is usually "Head Teacher"; tolerate "Head", "Head 1", etc.)
 */
function isHeadTeacherRole(role) {
  const r = String(role || '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
  if (r === 'head teacher' || r === 'head') return true;
  // e.g. "Head 1", "head 2"
  if (/^head\s*\d+$/.test(r)) return true;
  return false;
}

/**
 * Sync the leadership team to school_leaders.
 * We treat "Head Teacher" as role_type='head' and everything else as role_type='other'
 * (role_title stores the exact label: Director of Study, Director of Discipline, Secretary).
 *
 * Note: There is no UNIQUE(school_id, role_type) on school_leaders, so INSERT…ON DUPLICATE KEY
 * never updated an existing head row — each save inserted another 'head' row and the API kept
 * returning the oldest id first. We UPDATE by id or INSERT once, and remove duplicate head rows.
 */
async function syncLeaders(conn, schoolId, leaders) {
  const clean = Array.isArray(leaders) ? leaders.filter(l => l?.name) : [];

  const head = clean.find(l => isHeadTeacherRole(l.role)) || null;
  const others = clean.filter(l => !isHeadTeacherRole(l.role));

  // Replace "other" leaders fully (3 fixed roles in UI)
  await conn.query(
    "DELETE FROM school_leaders WHERE school_id = ? AND role_type = 'other'",
    [schoolId]
  );

  for (let i = 0; i < others.length; i++) {
    const l = others[i];
    await conn.query(
      `INSERT INTO school_leaders
         (school_id, role_type, full_name, role_title, phone, email, photo_url, sort_order)
       VALUES (?, 'other', ?, ?, ?, ?, ?, ?)`,
      [schoolId, l.name, l.role || null, l.phone || null, l.email || null, l.photoUrl || null, i]
    );
  }

  if (head) {
    const [headRows] = await conn.query(
      `SELECT id FROM school_leaders WHERE school_id = ? AND role_type = 'head' ORDER BY id ASC`,
      [schoolId]
    );
    if (headRows.length) {
      const keepId = headRows[0].id;
      if (headRows.length > 1) {
        await conn.query(
          `DELETE FROM school_leaders WHERE school_id = ? AND role_type = 'head' AND id <> ?`,
          [schoolId, keepId]
        );
      }
      await conn.query(
        `UPDATE school_leaders SET
           full_name = ?,
           role_title = 'Head Teacher',
           phone = ?,
           email = ?,
           photo_url = COALESCE(?, photo_url),
           sort_order = 0
         WHERE id = ?`,
        [head.name, head.phone || null, head.email || null, head.photoUrl || null, keepId]
      );
    } else {
      await conn.query(
        `INSERT INTO school_leaders
           (school_id, role_type, full_name, role_title, phone, email, photo_url, sort_order)
         VALUES (?, 'head', ?, 'Head Teacher', ?, ?, ?, 0)`,
        [schoolId, head.name, head.phone || null, head.email || null, head.photoUrl || null]
      );
    }
  }
}

/**
 * Sync albums → gallery_albums + gallery_images tables.
 */
async function syncGallery(conn, schoolId, albums) {
  if (!albums?.length) return;
  for (let si = 0; si < albums.length; si++) {
    const a = albums[si];
    if (!a.title) continue;
    const useId = (typeof a.id === 'number' && a.id > 0 && a.id < 2147483647) ? a.id : null;
    const [res] = await conn.query(
      `INSERT INTO gallery_albums
         (id, school_id, title, category, event_date, description, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         title       = VALUES(title),
         category    = VALUES(category),
         event_date  = VALUES(event_date),
         description = VALUES(description),
         sort_order  = VALUES(sort_order)`,
      [useId, schoolId, a.title, a.category || 'Event', a.date || null, a.description || null, si]
    );
    const albumDbId = res.insertId || useId;
    if (!albumDbId) continue;
    const realImages = (a.images || []).filter(img => img.url && !isBlob(img.url));
    if (realImages.length) {
      await conn.query('DELETE FROM gallery_images WHERE album_id = ?', [albumDbId]);
      for (let ii = 0; ii < realImages.length; ii++) {
        const img = realImages[ii];
        await conn.query(
          `INSERT INTO gallery_images (album_id, school_id, image_url, caption, sort_order)
           VALUES (?, ?, ?, ?, ?)`,
          [albumDbId, schoolId, toUrl(img.url), img.caption || null, ii]
        );
      }
    }
  }
}

/** Load full gallery from gallery_albums + gallery_images tables. */
async function loadGallery(schoolId) {
  const [dbAlbums] = await db.query(
    'SELECT * FROM gallery_albums WHERE school_id = ? ORDER BY sort_order, created_at',
    [schoolId]
  );
  const result = [];
  for (const album of dbAlbums) {
    const [imgs] = await db.query(
      'SELECT * FROM gallery_images WHERE album_id = ? ORDER BY sort_order',
      [album.id]
    );
    result.push({
      id:          album.id,
      title:       album.title       || '',
      date:        album.event_date  || '',
      category:    album.category    || 'Event',
      description: album.description || '',
      images: imgs.map(i => ({
        id:      i.id,
        url:     toUrl(i.image_url),
        caption: i.caption || '',
      })),
    });
  }
  return result;
}

/** Load all leaders for a school from school_leaders. */
async function loadLeaders(schoolId) {
  const [rows] = await db.query(
    `SELECT id, role_type, full_name, role_title, phone, email,
            photo_url, signature_url, stamp_url, sort_order
     FROM school_leaders WHERE school_id = ? ORDER BY role_type, sort_order`,
    [schoolId]
  );
  return rows;
}

// ─── CONTROLLER METHODS ──────────────────────────────────────────────────────

// GET /mini-websites
exports.list = async (req, res, next) => {
  try {
    const { province, district, search, status, page = 1, limit = 50 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);
    const conds = ['s.deleted_at IS NULL'], params = [];
    if (province) { conds.push('s.province = ?'); params.push(province); }
    if (district) { conds.push('s.district = ?'); params.push(district); }
    if (search)   { conds.push('(s.school_name LIKE ? OR s.school_code LIKE ?)'); params.push(`%${search}%`, `%${search}%`); }
    if (status)   { conds.push('mw.status = ?'); params.push(status); }
    const where = conds.join(' AND ');
    const [[{ total }]] = await db.query(
      `SELECT COUNT(*) AS total FROM schools s LEFT JOIN school_mini_websites mw ON mw.school_id = s.id WHERE ${where}`,
      params
    );
    const [rows] = await db.query(
      `SELECT s.id, s.school_name, s.school_code, s.province, s.district,
              s.logo_url, s.status AS school_status,
              s.ownership_type, s.school_category, s.education_levels,
              s.a_level_combinations AS school_a_level_combinations,
              s.tvet_trades AS school_tvet_trades,
              mw.id AS mini_id, mw.slug, mw.status AS site_status,
              mw.published_at, mw.template, mw.color_theme, mw.cover_url,
              mw.a_level_combinations, mw.tvet_trades
       FROM schools s LEFT JOIN school_mini_websites mw ON mw.school_id = s.id
       WHERE ${where} ORDER BY s.school_name ASC LIMIT ? OFFSET ?`,
      [...params, Number(limit), offset]
    );
    res.json({
      success: true,
      data: rows.map(r => ({
        ...r,
        logoUrl:  toUrl(r.logo_url),
        coverUrl: toUrl(r.cover_url),
        educationLevels: tryJson(r.education_levels, []),
        aLevelCombos: (() => {
          const miniCombos = tryJson(r.a_level_combinations) || [];
          const schoolCombos = tryJson(r.school_a_level_combinations) || [];
          return Array.isArray(miniCombos) && miniCombos.length ? miniCombos : schoolCombos;
        })(),
        tvetTrades: (() => {
          const miniTrades = tryJson(r.tvet_trades) || [];
          const schoolTrades = tryJson(r.school_tvet_trades) || [];
          return Array.isArray(miniTrades) && miniTrades.length ? miniTrades : schoolTrades;
        })(),
      })),
      pagination: { total: Number(total), page: Number(page), limit: Number(limit), pages: Math.ceil(Number(total) / Number(limit)) },
    });
  } catch (e) { next(e); }
};

// GET /mini-websites/school/:schoolId
exports.getBySchool = async (req, res, next) => {
  try {
    const { schoolId } = req.params;
    const [[school]] = await db.query('SELECT * FROM schools WHERE id = ? AND deleted_at IS NULL', [schoolId]);
    if (!school) return res.status(404).json({ success: false, message: 'School not found' });

    const [[mini]] = await db.query('SELECT * FROM school_mini_websites WHERE school_id = ?', [schoolId]);
    const allLeaders = await loadLeaders(schoolId);
    const head   = allLeaders.find(l => l.role_type === 'head');
    const others = allLeaders.filter(l => l.role_type === 'other');

    const form = { ...schoolToForm(school) };
    const leaders = [];
    if (head) {
      leaders.push({
        id: head.id,
        name: head.full_name || '',
        role: 'Head Teacher',
        phone: head.phone || '',
        email: head.email || '',
        photoPreview: toUrl(head.photo_url),
      });
      if (head.signature_url) form.signaturePreview = toUrl(head.signature_url);
      if (head.stamp_url)     form.stampPreview     = toUrl(head.stamp_url);
    }
    others.forEach(l => {
      leaders.push({
        id: l.id,
        name: l.full_name || '',
        role: l.role_title || '',
        phone: l.phone || '',
        email: l.email || '',
        photoPreview: toUrl(l.photo_url),
      });
    });
    form.leaders = leaders;

    const galleryAlbums = await loadGallery(schoolId);
    const miniForm = mini ? miniToForm(mini) : {};
    if (galleryAlbums.length) miniForm.albums = galleryAlbums;

    res.json({ success: true, data: { ...form, ...miniForm, autofilled: !mini } });
  } catch (e) { next(e); }
};

// GET /mini-websites/slug/:slug  (public — published only)
exports.getBySlug = async (req, res, next) => {
  try {
    const [[mini]] = await db.query(
      "SELECT * FROM school_mini_websites WHERE slug = ? AND status = 'published'",
      [req.params.slug]
    );
    if (!mini) return res.status(404).json({ success: false, message: 'Published page not found' });

    const [[school]] = await db.query('SELECT * FROM schools WHERE id = ? AND deleted_at IS NULL', [mini.school_id]);
    const allLeaders = await loadLeaders(mini.school_id);
    const head   = allLeaders.find(l => l.role_type === 'head');
    const others = allLeaders.filter(l => l.role_type === 'other');

    const form = { ...schoolToForm(school || {}) };
    const leaders = [];
    if (head) {
      leaders.push({
        id: head.id,
        name: head.full_name || '',
        role: 'Head Teacher',
        phone: head.phone || '',
        email: head.email || '',
        photoPreview: toUrl(head.photo_url),
      });
      if (head.signature_url) form.signaturePreview = toUrl(head.signature_url);
      if (head.stamp_url)     form.stampPreview     = toUrl(head.stamp_url);
    }
    others.forEach(l => {
      leaders.push({
        id: l.id,
        name: l.full_name || '',
        role: l.role_title || '',
        phone: l.phone || '',
        email: l.email || '',
        photoPreview: toUrl(l.photo_url),
      });
    });
    form.leaders = leaders;

    const galleryAlbums = await loadGallery(mini.school_id);
    const miniForm = miniToForm(mini);
    if (galleryAlbums.length) miniForm.albums = galleryAlbums;

    res.json({ success: true, data: { ...form, ...miniForm } });
  } catch (e) { next(e); }
};

// GET /mini-websites/:miniId
exports.getById = async (req, res, next) => {
  try {
    const [[mini]] = await db.query('SELECT * FROM school_mini_websites WHERE id = ?', [req.params.miniId]);
    if (!mini) return res.status(404).json({ success: false, message: 'Mini-website not found' });
    const [[school]] = await db.query('SELECT * FROM schools WHERE id = ?', [mini.school_id]);
    res.json({ success: true, data: { ...schoolToForm(school || {}), ...miniToForm(mini) } });
  } catch (e) { next(e); }
};

// POST /mini-websites
exports.create = async (req, res, next) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    await ensureInternationalColumns(conn);
    await ensureNewsItemsColumn(conn);
    const { schoolId } = req.body;
    if (!schoolId) { await conn.rollback(); conn.release(); return res.status(400).json({ success: false, message: 'schoolId is required' }); }

    const [[school]] = await conn.query('SELECT id, school_name FROM schools WHERE id = ? AND deleted_at IS NULL', [schoolId]);
    if (!school) { await conn.rollback(); conn.release(); return res.status(404).json({ success: false, message: 'School not found' }); }

    const [[existing]] = await conn.query('SELECT id FROM school_mini_websites WHERE school_id = ?', [schoolId]);
    if (existing) { await conn.rollback(); conn.release(); return res.status(409).json({ success: false, message: 'Already exists. Use PUT.', miniId: existing.id }); }

    const f    = parseBody(req.body, req.files || {});
    const slug = await uniqueSlug(conn, slugify(school.school_name));

    const [result] = await conn.query(
      `INSERT INTO school_mini_websites
         (school_id, slug, status, cover_url, about_image_url, mission_image_url,
          background, mission, vision, core_values, facebook, twitter, instagram,
          template, color_theme, custom_colors, sections,
          a_level_combinations, tvet_trades,
          international_primary_programs, international_other_programs,
          admission, fees, albums, news_items)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        schoolId, slug, 'draft',
        f.coverPath || null, f.aboutImagePath || null, f.missionImagePath || null,
        f.background, f.mission, f.vision, toJson(f.coreValues),
        f.facebook, f.twitter, f.instagram,
        f.template, f.colorTheme, toJson(f.customColors), toJson(f.sections),
        toJson(f.aLevelCombos), toJson(f.tvetTrades),
        toJson(f.internationalPrimaryPrograms || []),
        toJson(f.internationalOtherPrograms || []),
        toJson(f.admission), toJson(f.fees), toJson(f.albums),
        toJson(f.newsItems),
      ]
    );

    // ── Sync leaders (head + other roles) ────────────────────────────────
    if (f.leaders.length) await syncLeaders(conn, schoolId, f.leaders);

    // ── Sync gallery ──────────────────────────────────────────────────────
    if (f.albums?.length) await syncGallery(conn, schoolId, f.albums);

    await conn.commit();
    conn.release();
    res.status(201).json({
      success: true, message: 'Mini-website created',
      data: { miniId: result.insertId, slug, schoolId: Number(schoolId) },
    });
  } catch (e) { await conn.rollback(); conn.release(); next(e); }
};

// PUT /mini-websites/:miniId
exports.update = async (req, res, next) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    await ensureInternationalColumns(conn);
    await ensureNewsItemsColumn(conn);
    const { miniId } = req.params;
    const [[mini]] = await conn.query('SELECT id, slug, school_id FROM school_mini_websites WHERE id = ?', [miniId]);
    if (!mini) { await conn.rollback(); conn.release(); return res.status(404).json({ success: false, message: 'Mini-website not found' }); }

    const f = parseBody(req.body, req.files || {});
    await conn.query(
      `UPDATE school_mini_websites SET
         cover_url            = COALESCE(?, cover_url),
         about_image_url      = COALESCE(?, about_image_url),
         mission_image_url    = COALESCE(?, mission_image_url),
         background           = ?,
         mission              = ?, vision = ?, core_values = ?,
         facebook = ?, twitter = ?, instagram = ?,
         template = ?, color_theme = ?, custom_colors = ?, sections = ?,
         a_level_combinations = ?, tvet_trades = ?,
         international_primary_programs = ?, international_other_programs = ?,
         admission = ?, fees = ?, albums = ?, news_items = ?
       WHERE id = ?`,
      [
        f.coverPath || null, f.aboutImagePath || null, f.missionImagePath || null,
        f.background,
        f.mission, f.vision, toJson(f.coreValues),
        f.facebook, f.twitter, f.instagram,
        f.template, f.colorTheme, toJson(f.customColors), toJson(f.sections),
        toJson(f.aLevelCombos), toJson(f.tvetTrades),
        toJson(f.internationalPrimaryPrograms || []),
        toJson(f.internationalOtherPrograms || []),
        toJson(f.admission), toJson(f.fees), toJson(f.albums),
        toJson(f.newsItems),
        miniId,
      ]
    );

    // ── Sync leaders (head + other roles) ────────────────────────────────
    if (f.leaders.length) await syncLeaders(conn, mini.school_id, f.leaders);

    // ── Sync gallery ──────────────────────────────────────────────────────
    if (f.albums?.length) await syncGallery(conn, mini.school_id, f.albums);

    await conn.commit();
    conn.release();
    res.json({ success: true, message: 'Updated', data: { miniId: Number(miniId), slug: mini.slug, schoolId: mini.school_id } });
  } catch (e) { await conn.rollback(); conn.release(); next(e); }
};

// POST /mini-websites/gallery-images
exports.uploadGalleryImages = async (req, res, next) => {
  try {
    const { albumId, schoolId } = req.body;
    if (!albumId || !schoolId) return res.status(400).json({ success: false, message: 'albumId and schoolId required' });
    const files = [].concat(req.files?.images || []);
    if (!files.length) return res.status(400).json({ success: false, message: 'No images uploaded' });
    const captions = [].concat(tryJson(req.body.captions) || req.body.captions || []);
    const inserted = [];
    for (let i = 0; i < files.length; i++) {
      const imgUrl = toUrl(files[i].path);
      const [r] = await db.query(
        'INSERT INTO gallery_images (album_id, school_id, image_url, caption, sort_order) VALUES (?,?,?,?,?)',
        [albumId, schoolId, imgUrl, captions[i] || null, i]
      );
      inserted.push({ id: r.insertId, url: imgUrl, caption: captions[i] || '' });
    }
    res.json({ success: true, data: inserted });
  } catch (e) { next(e); }
};

// PATCH /mini-websites/:miniId/publish
exports.publish = async (req, res, next) => {
  try {
    const [[mini]] = await db.query('SELECT id, slug FROM school_mini_websites WHERE id = ?', [req.params.miniId]);
    if (!mini) return res.status(404).json({ success: false, message: 'Not found' });
    await db.query("UPDATE school_mini_websites SET status = 'published', published_at = COALESCE(published_at, NOW()) WHERE id = ?", [req.params.miniId]);
    const [[u]] = await db.query('SELECT published_at FROM school_mini_websites WHERE id = ?', [req.params.miniId]);
    res.json({ success: true, data: { miniId: Number(req.params.miniId), slug: mini.slug, status: 'published', publishedAt: u?.published_at } });
  } catch (e) { next(e); }
};

// PATCH /mini-websites/:miniId/unpublish
exports.unpublish = async (req, res, next) => {
  try {
    await db.query("UPDATE school_mini_websites SET status = 'draft' WHERE id = ?", [req.params.miniId]);
    res.json({ success: true, data: { miniId: Number(req.params.miniId), status: 'draft' } });
  } catch (e) { next(e); }
};

// DELETE /mini-websites/:miniId
exports.remove = async (req, res, next) => {
  try {
    const [r] = await db.query('DELETE FROM school_mini_websites WHERE id = ?', [req.params.miniId]);
    if (!r.affectedRows) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, message: 'Deleted' });
  } catch (e) { next(e); }
};

// GET /mini-websites/filter-options
exports.getFilterOptions = async (req, res) => {
  try {
    // Keep filter-options dataset aligned with /mini-websites?status=published.
    const [rows] = await db.query(
      `SELECT
         mw.a_level_combinations AS miniALevelCombos,
         mw.tvet_trades AS miniTvetTrades,
         s.a_level_combinations AS schoolALevelCombos,
         s.tvet_trades AS schoolTvetTrades
       FROM school_mini_websites mw
       INNER JOIN schools s ON s.id = mw.school_id
       WHERE mw.status = 'published'
         AND s.deleted_at IS NULL`
    );
    const comboMap = new Map();
    const tradeSet = new Set();
    for (const row of rows) {
      const miniCombos = tryJson(row.miniALevelCombos) || [];
      const schoolCombos = tryJson(row.schoolALevelCombos) || [];
      const combos = Array.isArray(miniCombos) && miniCombos.length ? miniCombos : schoolCombos;
      for (const c of combos) {
        if (!c) continue;
        const code = (c.code || c).toString().trim().toUpperCase();
        const full = c.full || c.name || '';
        if (code && !comboMap.has(code)) comboMap.set(code, full);
      }
      const miniTrades = tryJson(row.miniTvetTrades) || [];
      const schoolTrades = tryJson(row.schoolTvetTrades) || [];
      const trades = Array.isArray(miniTrades) && miniTrades.length ? miniTrades : schoolTrades;
      for (const t of trades) {
        if (t && typeof t === 'string') tradeSet.add(t.trim());
      }
    }
    const aLevelCombos = [...comboMap.entries()]
      .map(([code, full]) => ({ code, full }))
      .sort((a, b) => a.code.localeCompare(b.code));
    const tvetTrades = [...tradeSet].sort();
    return res.json({ success: true, data: { aLevelCombos, tvetTrades } });
  } catch (err) {
    console.error('[getFilterOptions]', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────