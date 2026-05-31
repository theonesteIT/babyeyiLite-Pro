'use strict';

/**
 * Platform News & Announcements — public read + SuperAdmin CRUD.
 * Tables: platform_news, platform_top_banners, platform_popups
 */

const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { promisePool } = require('../config/database');

const router = express.Router();

const UPLOAD_REL = 'uploads/platform-content';
const UPLOAD_ABS = path.join(__dirname, '..', UPLOAD_REL);

const NEWS_CATEGORIES = [
  'announcements', 'payments', 'events', 'new_features',
  'education', 'system_updates', 'promotions', 'government',
];

const POPUP_TYPES = ['find_agent', 'promotion', 'registration', 'event', 'alert'];

function requireSuper(req, res, next) {
  if (!req.user) return res.status(401).json({ success: false, message: 'Not authenticated' });
  const code = (req.user.role_code || '').toUpperCase();
  if (!['SUPER_ADMIN', 'FULL_SYSTEM_CONTROLLER'].includes(code)) {
    return res.status(403).json({ success: false, message: 'Access denied' });
  }
  next();
}

function slugify(text) {
  return String(text || '')
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120) || `news-${Date.now()}`;
}

function parseJson(val, fallback = null) {
  if (val == null) return fallback;
  if (typeof val === 'object') return val;
  try { return JSON.parse(val); } catch { return fallback; }
}

function resolveUserId(req) {
  return req.session?.userId || req.session?.user?.id || req.user?.id || null;
}

/** Normalize `<input type="datetime-local">` or ISO strings for MySQL DATETIME. */
function toMySqlDateTime(value) {
  if (value == null || value === '') return null;
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    const pad = (n) => String(n).padStart(2, '0');
    return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())} ${pad(value.getHours())}:${pad(value.getMinutes())}:${pad(value.getSeconds())}`;
  }
  const raw = String(value).trim();
  if (!raw) return null;
  const normalized = raw.replace('T', ' ').replace(/\.\d{3}Z?$/, '').slice(0, 19);
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(normalized)) return `${normalized}:00`;
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(normalized)) return normalized;
  return null;
}

/** NULL publish_at = visible immediately on the public site. */
function resolvePublishAt(status, rawPublishAt) {
  const normalized = toMySqlDateTime(rawPublishAt);
  if (status === 'published' && !normalized) return null;
  return normalized;
}

async function repairPublishedNewsVisibility() {
  try {
    const [result] = await promisePool.query(`
      UPDATE platform_news
      SET publish_at = NOW()
      WHERE status = 'published'
        AND publish_at IS NOT NULL
        AND publish_at > NOW()
    `);
    if (result?.affectedRows > 0) {
      console.log(`[platformContent] repaired ${result.affectedRows} published news row(s) with future publish_at`);
    }
  } catch (e) {
    console.warn('[platformContent] repairPublishedNewsVisibility', e.message);
  }
}

function pickLang(translations, lang, field) {
  const t = parseJson(translations, {}) || {};
  const order = [lang, 'en', 'rw', 'fr'];
  for (const l of order) {
    if (t[l]?.[field]) return t[l][field];
  }
  return '';
}

function localizeNews(row, lang) {
  if (!row) return null;
  const tr = parseJson(row.translations_json, {}) || {};
  const title = pickLang(tr, lang, 'title') || row.slug;
  const excerpt = pickLang(tr, lang, 'excerpt');
  return {
    id: row.id,
    slug: row.slug,
    category: row.category,
    title,
    excerpt,
    body: pickLang(tr, lang, 'body'),
    meta_title: pickLang(tr, lang, 'meta_title') || title,
    meta_description: pickLang(tr, lang, 'meta_description') || excerpt,
    meta_keywords: pickLang(tr, lang, 'meta_keywords') || '',
    tags: parseJson(row.tags_json, []),
    attachments: parseJson(row.attachments_json, []),
    featured_image: row.featured_image,
    gallery: parseJson(row.gallery_json, []),
    author_name: row.author_name,
    publish_at: row.publish_at,
    is_featured: !!row.is_featured,
    is_breaking: !!row.is_breaking,
    view_count: row.view_count || 0,
    like_count: row.like_count || 0,
    share_count: row.share_count || 0,
    status: row.status,
  };
}

function localizeBanner(row, lang) {
  if (!row) return null;
  const tr = parseJson(row.translations_json, {}) || {};
  return {
    id: row.id,
    title: pickLang(tr, lang, 'title'),
    message: pickLang(tr, lang, 'message'),
    cta_text: pickLang(tr, lang, 'cta_text') || row.cta_text,
    cta_link: row.cta_link,
    bg_color: row.bg_color || '#000435',
    text_color: row.text_color || '#ffffff',
    icon: row.icon || 'megaphone',
    priority: row.priority,
  };
}

function localizePopup(row, lang) {
  if (!row) return null;
  const tr = parseJson(row.translations_json, {}) || {};
  return {
    id: row.id,
    popup_type: row.popup_type,
    title: pickLang(tr, lang, 'title'),
    description: pickLang(tr, lang, 'description'),
    cta_text: pickLang(tr, lang, 'cta_text'),
    cta_link: row.cta_link,
    image_url: row.image_url,
    animation_type: row.animation_type,
    delay_seconds: row.delay_seconds,
    trigger_rule: row.trigger_rule,
    scroll_percent: row.scroll_percent,
    frequency: row.frequency,
    show_close_button: !!row.show_close_button,
  };
}

function isActiveSchedule(row) {
  const now = new Date();
  if (row.start_at && new Date(row.start_at) > now) return false;
  if (row.end_at && new Date(row.end_at) < now) return false;
  return !!row.is_active;
}

let tablesReady = false;

async function ensureTables() {
  if (tablesReady) return;
  if (!fs.existsSync(UPLOAD_ABS)) fs.mkdirSync(UPLOAD_ABS, { recursive: true });

  await promisePool.query(`
    CREATE TABLE IF NOT EXISTS platform_news (
      id INT AUTO_INCREMENT PRIMARY KEY,
      slug VARCHAR(160) NOT NULL UNIQUE,
      category VARCHAR(64) NOT NULL DEFAULT 'announcements',
      translations_json LONGTEXT NOT NULL,
      tags_json TEXT NULL,
      featured_image VARCHAR(512) NULL,
      author_name VARCHAR(120) NULL,
      author_id INT NULL,
      publish_at DATETIME NULL,
      expiry_at DATETIME NULL,
      status ENUM('draft','published','archived') NOT NULL DEFAULT 'draft',
      is_featured TINYINT(1) NOT NULL DEFAULT 0,
      is_breaking TINYINT(1) NOT NULL DEFAULT 0,
      view_count INT NOT NULL DEFAULT 0,
      like_count INT NOT NULL DEFAULT 0,
      sort_order INT NOT NULL DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_status_publish (status, publish_at),
      INDEX idx_category (category),
      INDEX idx_featured (is_featured)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  await promisePool.query(`
    CREATE TABLE IF NOT EXISTS platform_top_banners (
      id INT AUTO_INCREMENT PRIMARY KEY,
      translations_json LONGTEXT NOT NULL,
      cta_link VARCHAR(512) NULL,
      cta_text VARCHAR(120) NULL,
      bg_color VARCHAR(32) NOT NULL DEFAULT '#000435',
      text_color VARCHAR(32) NOT NULL DEFAULT '#ffffff',
      icon VARCHAR(64) NOT NULL DEFAULT 'megaphone',
      priority ENUM('high','medium','low') NOT NULL DEFAULT 'medium',
      start_at DATETIME NULL,
      end_at DATETIME NULL,
      is_active TINYINT(1) NOT NULL DEFAULT 1,
      click_count INT NOT NULL DEFAULT 0,
      sort_order INT NOT NULL DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_active (is_active, start_at, end_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  await promisePool.query(`
    CREATE TABLE IF NOT EXISTS platform_popups (
      id INT AUTO_INCREMENT PRIMARY KEY,
      popup_type VARCHAR(64) NOT NULL DEFAULT 'promotion',
      translations_json LONGTEXT NOT NULL,
      cta_link VARCHAR(512) NULL,
      image_url VARCHAR(512) NULL,
      animation_type ENUM('slide','fade','zoom') NOT NULL DEFAULT 'slide',
      delay_seconds INT NOT NULL DEFAULT 7,
      trigger_rule ENUM('timer','scroll','both') NOT NULL DEFAULT 'both',
      scroll_percent INT NOT NULL DEFAULT 40,
      position VARCHAR(32) NOT NULL DEFAULT 'bottom-right',
      device_type ENUM('all','desktop','mobile') NOT NULL DEFAULT 'all',
      frequency ENUM('once_day','once_session','always') NOT NULL DEFAULT 'once_day',
      show_close_button TINYINT(1) NOT NULL DEFAULT 1,
      start_at DATETIME NULL,
      end_at DATETIME NULL,
      is_active TINYINT(1) NOT NULL DEFAULT 1,
      view_count INT NOT NULL DEFAULT 0,
      click_count INT NOT NULL DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_active_popup (is_active, start_at, end_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  tablesReady = true;
  await ensureNewsColumns();
  await seedDefaultsIfEmpty();
  await repairPublishedNewsVisibility();
}

async function ensureNewsColumns() {
  const alters = [
    'ADD COLUMN share_count INT NOT NULL DEFAULT 0',
    'ADD COLUMN attachments_json TEXT NULL',
    'ADD COLUMN gallery_json TEXT NULL',
  ];
  for (const clause of alters) {
    const col = clause.match(/ADD COLUMN (\w+)/)?.[1];
    if (!col) continue;
    try {
      const [cols] = await promisePool.query(`SHOW COLUMNS FROM platform_news LIKE ?`, [col]);
      if (!cols?.length) await promisePool.query(`ALTER TABLE platform_news ${clause}`);
    } catch (e) {
      if (!String(e.message).includes('Duplicate column')) console.warn('[platformContent] ensureNewsColumns', col, e.message);
    }
  }
}

async function seedDefaultsIfEmpty() {
  const [[{ c: bannerCount }]] = await promisePool.query('SELECT COUNT(*) AS c FROM platform_top_banners');
  if (Number(bannerCount) === 0) {
    const defaults = [
      {
        translations_json: JSON.stringify({
          en: { title: 'Payments', message: 'New: Schools can now receive payments instantly with Babyeyi.', cta_text: 'Learn more' },
          rw: { title: 'Kwishyura', message: 'Bishya: Amashuri ashobora kwakira amafaranga ako kanya na Babyeyi.', cta_text: 'Menya byinshi' },
          fr: { title: 'Paiements', message: 'Nouveau : paiements instantanés pour les écoles avec Babyeyi.', cta_text: 'En savoir plus' },
        }),
        cta_link: '/news',
        priority: 'high',
        sort_order: 1,
      },
      {
        translations_json: JSON.stringify({
          en: { message: 'Order ShuleKit uniforms and supplies online through Babyeyi.', cta_text: 'Shop now' },
          rw: { message: 'Gura ShuleKit n\'ibikoresho by\'ishuri kuri Babyeyi.', cta_text: 'Gura ubu' },
          fr: { message: 'Commandez ShuleKit et fournitures scolaires sur Babyeyi.', cta_text: 'Acheter' },
        }),
        cta_link: '/services',
        priority: 'medium',
        sort_order: 2,
      },
      {
        translations_json: JSON.stringify({
          en: { message: 'Find a Babyeyi Agent near you for fee payments and support.', cta_text: 'Find Agent' },
          rw: { message: 'Shaka Babyeyi Agent hafi yawe ku kwishyura no kubona ubufasha.', cta_text: 'Shaka Agent' },
          fr: { message: 'Trouvez un agent Babyeyi près de chez vous.', cta_text: 'Trouver un agent' },
        }),
        cta_link: '/find-agent',
        priority: 'low',
        sort_order: 3,
      },
    ];
    for (const b of defaults) {
      await promisePool.query(
        `INSERT INTO platform_top_banners (translations_json, cta_link, bg_color, text_color, priority, is_active, sort_order)
         VALUES (?, ?, '#000435', '#ffffff', ?, 1, ?)`,
        [b.translations_json, b.cta_link, b.priority, b.sort_order]
      );
    }
  }

  const [[{ c: newsCount }]] = await promisePool.query('SELECT COUNT(*) AS c FROM platform_news');
  if (Number(newsCount) === 0) {
    const defaultNews = [
      {
        slug: 'new-instant-school-fee-payments',
        category: 'announcements',
        is_featured: 1,
        translations_json: JSON.stringify({
          en: {
            title: 'New: Instant School Fee Payments',
            excerpt: 'Schools can now receive tuition and other school fee payments instantly through Babyeyi using mobile money and bank channels.',
            body: 'Schools can now receive tuition and other school fee payments instantly through Babyeyi using mobile money and bank channels.',
          },
          rw: {
            title: 'Bishya: Kwishyura amafaranga y\'ishuri ako kanya',
            excerpt: 'Amashuri ashobora kwakira amafaranga y\'ishuri ako kanya binyuze muri Babyeyi.',
            body: 'Amashuri ashobora kwakira amafaranga y\'ishuri ako kanya binyuze muri Babyeyi.',
          },
          fr: {
            title: 'Nouveau : paiements instantanés des frais scolaires',
            excerpt: 'Les écoles peuvent recevoir les frais de scolarité instantanément via Babyeyi.',
            body: 'Les écoles peuvent recevoir les frais de scolarité instantanément via Babyeyi.',
          },
        }),
      },
      {
        slug: 'shulekit-order-school-supplies-online',
        category: 'new_features',
        is_featured: 1,
        translations_json: JSON.stringify({
          en: {
            title: 'ShuleKit — Order School Supplies Online',
            excerpt: 'Parents can conveniently order school supplies online and receive them through schools or authorized agents.',
            body: 'Parents can conveniently order school supplies online and receive them through schools or authorized agents.',
          },
          rw: {
            title: 'ShuleKit — Gura ibikoresho by\'ishuri kuri interineti',
            excerpt: 'Ababyeyi bashobora gura ibikoresho by\'ishuri kuri interineti.',
            body: 'Ababyeyi bashobora gura ibikoresho by\'ishuri kuri interineti.',
          },
          fr: {
            title: 'ShuleKit — Commander les fournitures scolaires en ligne',
            excerpt: 'Les parents peuvent commander les fournitures scolaires en ligne.',
            body: 'Les parents peuvent commander les fournitures scolaires en ligne.',
          },
        }),
      },
      {
        slug: 'babyeyi-agent-network-expanding-across-rwanda',
        category: 'new_features',
        is_featured: 0,
        translations_json: JSON.stringify({
          en: {
            title: 'Babyeyi Agent Network Expanding Across Rwanda',
            excerpt: 'Babyeyi is expanding its agent network to provide better support and services in more districts.',
            body: 'Babyeyi is expanding its agent network to provide better support and services in more districts.',
          },
          rw: {
            title: 'Urusobe rwa Babyeyi Agent ruraguka mu Rwanda',
            excerpt: 'Babyeyi iragura urusobe rwa Agent kugira ngo itange serivisi nziza mu turere twinshi.',
            body: 'Babyeyi iragura urusobe rwa Agent kugira ngo itange serivisi nziza mu turere twinshi.',
          },
          fr: {
            title: 'Le réseau d\'agents Babyeyi s\'étend au Rwanda',
            excerpt: 'Babyeyi étend son réseau d\'agents pour mieux servir les familles.',
            body: 'Babyeyi étend son réseau d\'agents pour mieux servir les familles.',
          },
        }),
      },
    ];
    for (const item of defaultNews) {
      await promisePool.query(
        `INSERT INTO platform_news
          (slug, category, translations_json, status, is_featured, publish_at, author_name)
         VALUES (?, ?, ?, 'published', ?, NULL, 'Babyeyi Team')`,
        [item.slug, item.category, item.translations_json, item.is_featured ? 1 : 0]
      );
    }
  }
}

router.use(async (req, res, next) => {
  try {
    await ensureTables();
    next();
  } catch (e) {
    console.error('[platformContent] ensureTables', e);
    res.status(500).json({ success: false, message: 'Database setup failed' });
  }
});

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_ABS),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase() || '.jpg';
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024, fields: 30, files: 1 },
});

const MAX_NEWS_GALLERY_EXTRA = 4;

const uploadNews = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024, fields: 50, files: 5 },
});

const newsUploadFields = uploadNews.fields([
  { name: 'featured_image', maxCount: 1 },
  { name: 'gallery_images', maxCount: MAX_NEWS_GALLERY_EXTRA },
]);

function mergeNewsGallery(body, reqFiles, existingRow) {
  const kept = parseJson(body.existing_gallery_json, parseJson(existingRow?.gallery_json, []));
  const safeKept = Array.isArray(kept) ? kept.filter(Boolean) : [];
  const newPaths = (reqFiles?.gallery_images || []).map((f) => `/${UPLOAD_REL}/${f.filename}`);
  const seen = new Set();
  const merged = [];
  for (const u of [...safeKept, ...newPaths]) {
    const key = String(u);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    merged.push(key);
  }
  return merged.slice(0, MAX_NEWS_GALLERY_EXTRA);
}

function newsFeaturedPath(body, reqFiles, existingRow) {
  const file = reqFiles?.featured_image?.[0];
  if (file) return `/${UPLOAD_REL}/${file.filename}`;
  if (body.existing_featured_image) return body.existing_featured_image;
  if (body.featured_image) return body.featured_image;
  return existingRow?.featured_image ?? null;
}

function handleMulterErrors(handler) {
  return (req, res, next) => {
    handler(req, res, (err) => {
      if (err) {
        console.error('[platformContent] multer', err);
        return res.status(400).json({ success: false, message: err.message || 'Invalid upload' });
      }
      next();
    });
  };
}

/* ── PUBLIC ─────────────────────────────────────────────────────── */

router.get('/public/top-banners', async (req, res) => {
  try {
    const lang = (req.query.lang || 'en').slice(0, 2);
    const [rows] = await promisePool.query(
      `SELECT * FROM platform_top_banners WHERE is_active = 1 ORDER BY sort_order ASC, id DESC`
    );
    const active = (rows || [])
      .filter(isActiveSchedule)
      .map((r) => localizeBanner(r, lang))
      .filter((b) => b.message || b.title);
    res.json({ success: true, data: active });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

router.post('/public/top-banners/:id/click', async (req, res) => {
  try {
    await promisePool.query('UPDATE platform_top_banners SET click_count = click_count + 1 WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

router.get('/public/news', async (req, res) => {
  try {
    const lang = (req.query.lang || 'en').slice(0, 2);
    const category = req.query.category;
    const search = String(req.query.search || '').trim();
    const featured = req.query.featured === '1';
    const sort = req.query.sort === 'oldest' ? 'ASC'
      : req.query.sort === 'popular' ? 'DESC' : 'DESC';
    const orderBy = req.query.sort === 'popular'
      ? `view_count DESC, publish_at DESC, id DESC`
      : `is_featured DESC, is_breaking DESC, publish_at ${sort}, id ${sort}`;
    const limit = Math.min(parseInt(req.query.limit, 10) || 12, 50);
    const offset = Math.max(parseInt(req.query.offset, 10) || 0, 0);

    let sql = `SELECT * FROM platform_news WHERE status = 'published'
      AND (publish_at IS NULL OR publish_at <= NOW())
      AND (expiry_at IS NULL OR expiry_at >= NOW())`;
    const params = [];

    if (category) { sql += ' AND category = ?'; params.push(category); }
    if (featured) { sql += ' AND is_featured = 1'; }
    if (search) {
      sql += ' AND (slug LIKE ? OR translations_json LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }
    sql += ` ORDER BY ${orderBy} LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const [rows] = await promisePool.query(sql, params);
    res.json({ success: true, data: (rows || []).map((r) => localizeNews(r, lang)), limit, offset });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

router.get('/public/news/:slug', async (req, res) => {
  try {
    const lang = (req.query.lang || 'en').slice(0, 2);
    const [rows] = await promisePool.query('SELECT * FROM platform_news WHERE slug = ? LIMIT 1', [req.params.slug]);
    const row = rows?.[0];
    if (!row || row.status !== 'published') {
      return res.status(404).json({ success: false, message: 'News not found' });
    }
    const [[schedule]] = await promisePool.query(
      `SELECT
         (publish_at IS NOT NULL AND publish_at > NOW()) AS not_yet,
         (expiry_at IS NOT NULL AND expiry_at < NOW()) AS expired
       FROM platform_news WHERE id = ? LIMIT 1`,
      [row.id]
    );
    if (schedule?.not_yet) {
      return res.status(404).json({ success: false, message: 'News not published yet' });
    }
    if (schedule?.expired) {
      return res.status(404).json({ success: false, message: 'News expired' });
    }
    res.json({ success: true, data: localizeNews(row, lang) });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

router.post('/public/news/:id/view', async (req, res) => {
  try {
    await promisePool.query('UPDATE platform_news SET view_count = view_count + 1 WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

router.post('/public/news/:id/like', async (req, res) => {
  try {
    await promisePool.query('UPDATE platform_news SET like_count = like_count + 1 WHERE id = ?', [req.params.id]);
    const [[row]] = await promisePool.query('SELECT like_count FROM platform_news WHERE id = ?', [req.params.id]);
    res.json({ success: true, like_count: row?.like_count || 0 });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

router.post('/public/news/:id/share', async (req, res) => {
  try {
    await promisePool.query('UPDATE platform_news SET share_count = share_count + 1 WHERE id = ?', [req.params.id]);
    const [[row]] = await promisePool.query('SELECT share_count FROM platform_news WHERE id = ?', [req.params.id]);
    res.json({ success: true, share_count: row?.share_count || 0 });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

router.get('/public/popups/active', async (req, res) => {
  try {
    const lang = (req.query.lang || 'en').slice(0, 2);
    const device = req.query.device || 'desktop';
    const [rows] = await promisePool.query(
      `SELECT * FROM platform_popups WHERE is_active = 1 ORDER BY id DESC`
    );
    const match = (rows || []).find((r) => {
      if (!isActiveSchedule(r)) return false;
      if (r.device_type === 'desktop' && device === 'mobile') return false;
      if (r.device_type === 'mobile' && device !== 'mobile') return false;
      return true;
    });
    if (!match) return res.json({ success: true, data: null });
    await promisePool.query('UPDATE platform_popups SET view_count = view_count + 1 WHERE id = ?', [match.id]);
    res.json({ success: true, data: localizePopup(match, lang) });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

router.post('/public/popups/:id/click', async (req, res) => {
  try {
    await promisePool.query('UPDATE platform_popups SET click_count = click_count + 1 WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

/* ── ADMIN DASHBOARD ────────────────────────────────────────────── */

router.get('/admin/stats', requireSuper, async (_req, res) => {
  try {
    const now = new Date();
    const [[newsTotal]] = await promisePool.query('SELECT COUNT(*) AS c FROM platform_news');
    const [[newsDraft]] = await promisePool.query("SELECT COUNT(*) AS c FROM platform_news WHERE status = 'draft'");
    const [[newsViews]] = await promisePool.query('SELECT COALESCE(SUM(view_count),0) AS c FROM platform_news');
    const [[activePopups]] = await promisePool.query('SELECT COUNT(*) AS c FROM platform_popups WHERE is_active = 1');
    const [[scheduledBanners]] = await promisePool.query(
      'SELECT COUNT(*) AS c FROM platform_top_banners WHERE is_active = 1 AND start_at > ?', [now]
    );
    const [[expiredPopups]] = await promisePool.query(
      'SELECT COUNT(*) AS c FROM platform_popups WHERE end_at IS NOT NULL AND end_at < ?', [now]
    );
    res.json({
      success: true,
      data: {
        totalNews: newsTotal?.c || 0,
        draftPosts: newsDraft?.c || 0,
        totalViews: newsViews?.c || 0,
        activePopups: activePopups?.c || 0,
        scheduledAnnouncements: scheduledBanners?.c || 0,
        expiredAds: expiredPopups?.c || 0,
      },
    });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

/* ── ADMIN NEWS CRUD ────────────────────────────────────────────── */

router.get('/admin/news', requireSuper, async (_req, res) => {
  try {
    const [rows] = await promisePool.query('SELECT * FROM platform_news ORDER BY id DESC');
    res.json({ success: true, data: rows || [] });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

router.post('/admin/news', requireSuper, handleMulterErrors(newsUploadFields), async (req, res) => {
  try {
    const body = req.body || {};
    const translations = parseJson(body.translations_json, {});
    const enTitle = translations?.en?.title || body.title || 'Untitled';
    const slug = body.slug ? slugify(body.slug) : slugify(enTitle);
    const image = newsFeaturedPath(body, req.files, null);
    const gallery = mergeNewsGallery(body, req.files, null);
    const status = body.status || 'draft';
    const publishAt = resolvePublishAt(status, body.publish_at);

    const [existing] = await promisePool.query('SELECT id FROM platform_news WHERE slug = ?', [slug]);
    const finalSlug = existing?.length ? `${slug}-${Date.now()}` : slug;

    const [result] = await promisePool.query(
      `INSERT INTO platform_news
        (slug, category, translations_json, tags_json, featured_image, gallery_json, author_name, author_id,
         publish_at, expiry_at, status, is_featured, is_breaking, sort_order)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        finalSlug,
        body.category || 'announcements',
        JSON.stringify(translations),
        JSON.stringify(parseJson(body.tags_json, [])),
        image,
        JSON.stringify(gallery),
        body.author_name || req.user?.full_name || req.user?.name || 'Babyeyi Team',
        resolveUserId(req),
        publishAt,
        toMySqlDateTime(body.expiry_at),
        status,
        body.is_featured === '1' || body.is_featured === true ? 1 : 0,
        body.is_breaking === '1' || body.is_breaking === true ? 1 : 0,
        parseInt(body.sort_order, 10) || 0,
      ]
    );
    if (body.attachments_json) {
      await promisePool.query('UPDATE platform_news SET attachments_json = ? WHERE id = ?', [
        typeof body.attachments_json === 'string' ? body.attachments_json : JSON.stringify(body.attachments_json),
        result.insertId,
      ]);
    }
    await repairPublishedNewsVisibility();
    res.json({ success: true, id: result.insertId, slug: finalSlug });
  } catch (e) {
    console.error('[platformContent] POST admin/news', e);
    res.status(500).json({ success: false, message: e.message });
  }
});

router.put('/admin/news/:id', requireSuper, handleMulterErrors(newsUploadFields), async (req, res) => {
  try {
    const body = req.body || {};
    const id = req.params.id;
    const [[row]] = await promisePool.query('SELECT * FROM platform_news WHERE id = ?', [id]);
    if (!row) return res.status(404).json({ success: false, message: 'Not found' });

    const translations = parseJson(body.translations_json, parseJson(row.translations_json, {}));
    const slug = body.slug ? slugify(body.slug) : row.slug;
    const image = newsFeaturedPath(body, req.files, row);
    const gallery = mergeNewsGallery(body, req.files, row);
    const status = body.status || row.status;
    const publishAt = resolvePublishAt(status, body.publish_at);

    await promisePool.query(
      `UPDATE platform_news SET slug=?, category=?, translations_json=?, tags_json=?, featured_image=?, gallery_json=?,
        author_name=?, publish_at=?, expiry_at=?, status=?, is_featured=?, is_breaking=?, sort_order=?
       WHERE id=?`,
      [
        slug,
        body.category || row.category,
        JSON.stringify(translations),
        JSON.stringify(parseJson(body.tags_json, parseJson(row.tags_json, []))),
        image,
        JSON.stringify(gallery),
        body.author_name || row.author_name,
        publishAt,
        body.expiry_at !== undefined ? toMySqlDateTime(body.expiry_at) : toMySqlDateTime(row.expiry_at),
        status,
        body.is_featured === '1' || body.is_featured === true ? 1 : body.is_featured === '0' || body.is_featured === false ? 0 : row.is_featured,
        body.is_breaking === '1' || body.is_breaking === true ? 1 : body.is_breaking === '0' || body.is_breaking === false ? 0 : row.is_breaking,
        parseInt(body.sort_order, 10) || row.sort_order,
        id,
      ]
    );
    await repairPublishedNewsVisibility();
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

router.delete('/admin/news/:id', requireSuper, async (req, res) => {
  try {
    await promisePool.query('DELETE FROM platform_news WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

/* ── ADMIN TOP BANNERS ──────────────────────────────────────────── */

router.get('/admin/top-banners', requireSuper, async (_req, res) => {
  try {
    const [rows] = await promisePool.query('SELECT * FROM platform_top_banners ORDER BY sort_order ASC, id DESC');
    res.json({ success: true, data: rows || [] });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

router.post('/admin/top-banners', requireSuper, async (req, res) => {
  try {
    const b = req.body || {};
    const [result] = await promisePool.query(
      `INSERT INTO platform_top_banners
        (translations_json, cta_link, cta_text, bg_color, text_color, icon, priority, start_at, end_at, is_active, sort_order)
       VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
      [
        JSON.stringify(parseJson(b.translations_json, {})),
        b.cta_link || null,
        b.cta_text || null,
        b.bg_color || '#000435',
        b.text_color || '#ffffff',
        b.icon || 'megaphone',
        b.priority || 'medium',
        b.start_at || null,
        b.end_at || null,
        b.is_active === '0' || b.is_active === false ? 0 : 1,
        parseInt(b.sort_order, 10) || 0,
      ]
    );
    res.json({ success: true, id: result.insertId });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

router.put('/admin/top-banners/:id', requireSuper, async (req, res) => {
  try {
    const b = req.body || {};
    await promisePool.query(
      `UPDATE platform_top_banners SET translations_json=?, cta_link=?, cta_text=?, bg_color=?, text_color=?,
        icon=?, priority=?, start_at=?, end_at=?, is_active=?, sort_order=? WHERE id=?`,
      [
        JSON.stringify(parseJson(b.translations_json, {})),
        b.cta_link || null,
        b.cta_text || null,
        b.bg_color || '#000435',
        b.text_color || '#ffffff',
        b.icon || 'megaphone',
        b.priority || 'medium',
        b.start_at || null,
        b.end_at || null,
        b.is_active === '0' || b.is_active === false ? 0 : 1,
        parseInt(b.sort_order, 10) || 0,
        req.params.id,
      ]
    );
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

router.delete('/admin/top-banners/:id', requireSuper, async (req, res) => {
  try {
    await promisePool.query('DELETE FROM platform_top_banners WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

/* ── ADMIN POPUPS ───────────────────────────────────────────────── */

router.get('/admin/popups', requireSuper, async (_req, res) => {
  try {
    const [rows] = await promisePool.query('SELECT * FROM platform_popups ORDER BY id DESC');
    res.json({ success: true, data: rows || [] });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

router.post('/admin/popups', requireSuper, handleMulterErrors(upload.single('popup_image')), async (req, res) => {
  try {
    const b = req.body || {};
    const image = req.file ? `/${UPLOAD_REL}/${req.file.filename}` : b.image_url || null;
    const [result] = await promisePool.query(
      `INSERT INTO platform_popups
        (popup_type, translations_json, cta_link, image_url, animation_type, delay_seconds, trigger_rule,
         scroll_percent, position, device_type, frequency, show_close_button, start_at, end_at, is_active)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        b.popup_type || 'promotion',
        JSON.stringify(parseJson(b.translations_json, {})),
        b.cta_link || null,
        image,
        b.animation_type || 'slide',
        parseInt(b.delay_seconds, 10) || 7,
        b.trigger_rule || 'both',
        parseInt(b.scroll_percent, 10) || 40,
        b.position || 'bottom-right',
        b.device_type || 'all',
        b.frequency || 'once_day',
        b.show_close_button === '0' || b.show_close_button === false ? 0 : 1,
        b.start_at || null,
        b.end_at || null,
        b.is_active === '0' || b.is_active === false ? 0 : 1,
      ]
    );
    res.json({ success: true, id: result.insertId });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

router.put('/admin/popups/:id', requireSuper, handleMulterErrors(upload.single('popup_image')), async (req, res) => {
  try {
    const b = req.body || {};
    const [[row]] = await promisePool.query('SELECT * FROM platform_popups WHERE id = ?', [req.params.id]);
    if (!row) return res.status(404).json({ success: false, message: 'Not found' });
    const image = req.file ? `/${UPLOAD_REL}/${req.file.filename}` : (b.image_url ?? row.image_url);

    await promisePool.query(
      `UPDATE platform_popups SET popup_type=?, translations_json=?, cta_link=?, image_url=?, animation_type=?,
        delay_seconds=?, trigger_rule=?, scroll_percent=?, position=?, device_type=?, frequency=?,
        show_close_button=?, start_at=?, end_at=?, is_active=? WHERE id=?`,
      [
        b.popup_type || row.popup_type,
        JSON.stringify(parseJson(b.translations_json, parseJson(row.translations_json, {}))),
        b.cta_link ?? row.cta_link,
        image,
        b.animation_type || row.animation_type,
        parseInt(b.delay_seconds, 10) || row.delay_seconds,
        b.trigger_rule || row.trigger_rule,
        parseInt(b.scroll_percent, 10) || row.scroll_percent,
        b.position || row.position,
        b.device_type || row.device_type,
        b.frequency || row.frequency,
        b.show_close_button === '0' || b.show_close_button === false ? 0 : b.show_close_button === '1' || b.show_close_button === true ? 1 : row.show_close_button,
        b.start_at !== undefined ? b.start_at || null : row.start_at,
        b.end_at !== undefined ? b.end_at || null : row.end_at,
        b.is_active === '0' || b.is_active === false ? 0 : b.is_active === '1' || b.is_active === true ? 1 : row.is_active,
        req.params.id,
      ]
    );
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

router.delete('/admin/popups/:id', requireSuper, async (req, res) => {
  try {
    await promisePool.query('DELETE FROM platform_popups WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

module.exports = router;
module.exports.NEWS_CATEGORIES = NEWS_CATEGORIES;
module.exports.POPUP_TYPES = POPUP_TYPES;
