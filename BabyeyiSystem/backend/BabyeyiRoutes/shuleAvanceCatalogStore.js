'use strict';

const { promisePool } = require('../config/database');

let catalogTableReady = false;

async function ensureShuleAvanceTeacherCatalogTable() {
  if (catalogTableReady) return;
  await promisePool.query(`
    CREATE TABLE IF NOT EXISTS shule_avance_teacher_catalog (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      item_kind ENUM('service','cashout') NOT NULL,
      slug VARCHAR(64) NOT NULL,
      label VARCHAR(160) NOT NULL,
      description VARCHAR(500) NULL,
      income_rate_percent DECIMAL(8,4) NOT NULL DEFAULT 0 COMMENT 'Monthly % (simple interest model)',
      sort_order INT NOT NULL DEFAULT 0,
      is_active TINYINT(1) NOT NULL DEFAULT 1,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_sa_teacher_cat_kind_slug (item_kind, slug),
      KEY idx_sa_teacher_cat_kind_active (item_kind, is_active)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  const [[cnt]] = await promisePool.query('SELECT COUNT(*) AS n FROM shule_avance_teacher_catalog');
  if (Number(cnt?.n) === 0) {
    await promisePool.query(
      `INSERT INTO shule_avance_teacher_catalog
       (item_kind, slug, label, description, income_rate_percent, sort_order, is_active) VALUES
       ('service', 'cash_power', 'Cash Power', 'Electricity & prepaid power', 2.5, 10, 1),
       ('service', 'airtime_data', 'Airtime & Data', 'Mobile airtime and bundles', 2.5, 20, 1),
       ('service', 'teacher_deals', 'Teacher Deals', 'Curated offers for educators', 2.0, 30, 1),
       ('cashout', 'general', 'General cashout', 'Standard staff cash advance', 3.0, 10, 1),
       ('cashout', 'emergency', 'Emergency', 'Urgent personal need', 3.5, 20, 1)`
    );
  }
  catalogTableReady = true;
}

function normalizeSlug(s) {
  return String(s || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '')
    .slice(0, 64);
}

function normalizeRate(v) {
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0 || n > 100) return NaN;
  return Math.round(n * 10000) / 10000;
}

async function fetchActiveCatalogMaps() {
  await ensureShuleAvanceTeacherCatalogTable();
  const [rows] = await promisePool.query(
    `SELECT id, item_kind, slug, label, description, income_rate_percent, sort_order
     FROM shule_avance_teacher_catalog
     WHERE is_active = 1
     ORDER BY item_kind, sort_order ASC, id ASC`
  );
  const servicesBySlug = new Map();
  const cashoutsBySlug = new Map();
  for (const r of rows || []) {
    const row = {
      id: r.id,
      slug: r.slug,
      label: r.label,
      description: r.description,
      income_rate_percent: Number(r.income_rate_percent),
      sort_order: r.sort_order,
    };
    if (r.item_kind === 'service') servicesBySlug.set(r.slug, row);
    else cashoutsBySlug.set(r.slug, row);
  }
  return { servicesBySlug, cashoutsBySlug };
}

async function listTeacherCatalogAdmin(includeInactive) {
  await ensureShuleAvanceTeacherCatalogTable();
  const where = includeInactive ? '' : 'WHERE is_active = 1';
  const [rows] = await promisePool.query(
    `SELECT id, item_kind, slug, label, description, income_rate_percent, sort_order, is_active, created_at, updated_at
     FROM shule_avance_teacher_catalog ${where}
     ORDER BY item_kind, sort_order ASC, id ASC`
  );
  return rows || [];
}

async function createTeacherCatalogItem(body) {
  await ensureShuleAvanceTeacherCatalogTable();
  const item_kind = String(body?.item_kind || '').toLowerCase();
  if (!['service', 'cashout'].includes(item_kind)) {
    throw new Error('item_kind must be service or cashout');
  }
  let slug = normalizeSlug(body?.slug);
  if (!slug && body?.label) slug = normalizeSlug(body.label);
  if (!slug) throw new Error('slug or label is required');
  const label = String(body?.label || '').trim().slice(0, 160);
  if (!label) throw new Error('label is required');
  const description = body?.description != null ? String(body.description).trim().slice(0, 500) : null;
  const income_rate_percent = normalizeRate(body?.income_rate_percent ?? body?.income_rate);
  if (Number.isNaN(income_rate_percent)) throw new Error('income_rate_percent must be between 0 and 100');
  const sort_order = Number(body?.sort_order);
  const sort = Number.isFinite(sort_order) ? sort_order : 0;
  const is_active = body?.is_active !== undefined ? !!body.is_active : true;

  const [r] = await promisePool.query(
    `INSERT INTO shule_avance_teacher_catalog
     (item_kind, slug, label, description, income_rate_percent, sort_order, is_active)
     VALUES (?,?,?,?,?,?,?)`,
    [item_kind, slug, label, description, income_rate_percent, sort, is_active ? 1 : 0]
  );
  return r.insertId;
}

async function updateTeacherCatalogItem(id, body) {
  await ensureShuleAvanceTeacherCatalogTable();
  const nid = Number(id);
  if (!nid) throw new Error('Invalid id');
  const [[existing]] = await promisePool.query(
    'SELECT id FROM shule_avance_teacher_catalog WHERE id = ? LIMIT 1',
    [nid]
  );
  if (!existing) throw new Error('Not found');

  const fields = [];
  const vals = [];
  if (body.item_kind !== undefined) {
    const k = String(body.item_kind).toLowerCase();
    if (!['service', 'cashout'].includes(k)) throw new Error('item_kind must be service or cashout');
    fields.push('item_kind = ?');
    vals.push(k);
  }
  if (body.slug !== undefined) {
    const s = normalizeSlug(body.slug);
    if (!s) throw new Error('Invalid slug');
    fields.push('slug = ?');
    vals.push(s);
  }
  if (body.label !== undefined) {
    const label = String(body.label).trim().slice(0, 160);
    if (!label) throw new Error('label cannot be empty');
    fields.push('label = ?');
    vals.push(label);
  }
  if (body.description !== undefined) {
    fields.push('description = ?');
    vals.push(String(body.description).trim().slice(0, 500) || null);
  }
  if (body.income_rate_percent !== undefined || body.income_rate !== undefined) {
    const income_rate_percent = normalizeRate(body?.income_rate_percent ?? body?.income_rate);
    if (Number.isNaN(income_rate_percent)) throw new Error('income_rate_percent must be between 0 and 100');
    fields.push('income_rate_percent = ?');
    vals.push(income_rate_percent);
  }
  if (body.sort_order !== undefined) {
    const sort_order = Number(body.sort_order);
    fields.push('sort_order = ?');
    vals.push(Number.isFinite(sort_order) ? sort_order : 0);
  }
  if (body.is_active !== undefined) {
    fields.push('is_active = ?');
    vals.push(body.is_active ? 1 : 0);
  }
  if (!fields.length) return false;
  vals.push(nid);
  await promisePool.query(`UPDATE shule_avance_teacher_catalog SET ${fields.join(', ')} WHERE id = ?`, vals);
  return true;
}

async function deleteTeacherCatalogItem(id) {
  await ensureShuleAvanceTeacherCatalogTable();
  const nid = Number(id);
  if (!nid) throw new Error('Invalid id');
  const [r] = await promisePool.query('DELETE FROM shule_avance_teacher_catalog WHERE id = ? LIMIT 1', [nid]);
  return r.affectedRows > 0;
}

module.exports = {
  ensureShuleAvanceTeacherCatalogTable,
  fetchActiveCatalogMaps,
  listTeacherCatalogAdmin,
  createTeacherCatalogItem,
  updateTeacherCatalogItem,
  deleteTeacherCatalogItem,
  normalizeSlug,
  normalizeRate,
};
