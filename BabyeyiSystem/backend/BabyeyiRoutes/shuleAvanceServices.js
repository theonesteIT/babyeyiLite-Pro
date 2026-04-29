'use strict';

const express = require('express');
const { promisePool } = require('../config/database');
const fs = require('fs');
const path = require('path');
const {
  ensureShuleAvanceTeacherCatalogTable,
  fetchActiveCatalogMaps,
} = require('./shuleAvanceCatalogStore');
const { ensureShuleAvanceOrgTables, ensureTeacherDealPartnerTable } = require('./shuleAvanceOrgSchema');

const router = express.Router();

const ROLE_ACCOUNTANT = 'ACCOUNTANT';
const MANAGER_ROLES = ['SCHOOL_ADMIN', 'SCHOOL_MANAGER'];
const DEAL_PRODUCT_ADMIN_ROLES = ['SUPER_ADMIN'];
/** Teachers, school staff (HOD/DOS), and accountants can submit requests */
const APPLICANT_ROLES = ['TEACHER', 'HOD', 'DOS', 'ACCOUNTANT'];
const LEGACY_APPLICANT_ROLES = ['TEACHER', 'HOD', 'DOS', 'SCHOOL_ADMIN', 'SCHOOL_MANAGER', 'ACCOUNTANT'];

const STATUS = {
  PENDING_ACCOUNTANT: 'pending_accountant',
  SENT_TO_MANAGER: 'sent_to_manager',
  APPROVED: 'approved',
  REJECTED_BY_ACCOUNTANT: 'rejected_by_accountant',
  REJECTED_BY_MANAGER: 'rejected_by_manager',
};

let tableReady = false;
let teacherDealProductsReady = false;
let teacherDealPartnersReady = false;

function toRoleCode(req) {
  return String(req.user?.role_code || req.session?.user?.role?.code || '').toUpperCase();
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

function resolveUserId(req) {
  return req.session?.userId || req.session?.user?.id || req.user?.id || null;
}

function authGuard(req, res, next) {
  const userId = resolveUserId(req);
  if (!userId) {
    return res.status(401).json({ success: false, message: 'Not authenticated' });
  }
  const schoolId = resolveSchoolId(req);
  if (!schoolId) {
    return res.status(400).json({ success: false, message: 'No school linked to this account' });
  }
  req.ctx = { userId, schoolId, roleCode: toRoleCode(req) };
  next();
}

function requireRole(allowedRoles) {
  const accepted = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
  return (req, res, next) => {
    const roleCode = req.ctx?.roleCode || '';
    if (!accepted.includes(roleCode)) {
      return res.status(403).json({
        success: false,
        message: `Access denied for role "${roleCode || 'UNKNOWN'}"`,
      });
    }
    next();
  };
}

/** Any logged-in user (including Super Admin preview); catalog has no school scope */
function requireLoggedIn(req, res, next) {
  const userId = resolveUserId(req);
  if (!userId) {
    return res.status(401).json({ success: false, message: 'Not authenticated' });
  }
  next();
}

function requireDealProductAdmin(req, res, next) {
  const roleCode = toRoleCode(req);
  if (!DEAL_PRODUCT_ADMIN_ROLES.includes(roleCode)) {
    return res.status(403).json({ success: false, message: 'Only Super Admin can manage deal products' });
  }
  return next();
}

async function ensureTable() {
  if (tableReady) return;
  await promisePool.query(`
    CREATE TABLE IF NOT EXISTS shule_avance_requests (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      school_id INT UNSIGNED NOT NULL,
      teacher_user_id INT UNSIGNED NOT NULL,
      amount_rwf DECIMAL(14,2) NOT NULL,
      purpose TEXT NOT NULL,
      repayment_term_months INT UNSIGNED NOT NULL,
      vendor_label VARCHAR(160) NULL,
      details TEXT NULL,
      invoice_file_name VARCHAR(255) NULL,
      status VARCHAR(40) NOT NULL DEFAULT 'pending_accountant',
      accountant_note TEXT NULL,
      manager_feedback TEXT NULL,
      submitted_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      accountant_reviewed_at DATETIME NULL,
      accountant_reviewed_by INT UNSIGNED NULL,
      manager_reviewed_at DATETIME NULL,
      manager_reviewed_by INT UNSIGNED NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      KEY idx_sa_school (school_id),
      KEY idx_sa_teacher (teacher_user_id),
      KEY idx_sa_status (status),
      KEY idx_sa_submitted (submitted_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  const cols = [
    ['request_type', "VARCHAR(20) NOT NULL DEFAULT 'service'"],
    ['service_category', 'VARCHAR(64) NULL'],
    ['cashout_reason', 'TEXT NULL'],
    ['cashout_category_slug', 'VARCHAR(64) NULL'],
    ['deal_product_ids_json', 'TEXT NULL'],
    ['deal_products_snapshot_json', 'LONGTEXT NULL'],
    ['deal_products_total_rwf', 'DECIMAL(14,2) NULL'],
  ];
  for (const [name, def] of cols) {
    try {
      await promisePool.query(`ALTER TABLE shule_avance_requests ADD COLUMN ${name} ${def}`);
    } catch (e) {
      if (e.code !== 'ER_DUP_FIELDNAME') {
        console.warn(`[shule-avance] ALTER add ${name}:`, e.message);
      }
    }
  }

  await ensureShuleAvanceTeacherCatalogTable();
  await ensureTeacherDealProductsTable();
  tableReady = true;
}

async function ensureTeacherDealProductsTable() {
  if (teacherDealProductsReady) return;
  await ensureShuleAvanceOrgTables();
  await ensureTeacherDealPartnerTable();
  await promisePool.query(`
    CREATE TABLE IF NOT EXISTS shule_avance_teacher_deal_products (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      product_code VARCHAR(120) NULL,
      category VARCHAR(180) NULL,
      name VARCHAR(180) NOT NULL,
      price_rwf DECIMAL(14,2) NOT NULL DEFAULT 0,
      image_url VARCHAR(500) NULL,
      media_json LONGTEXT NULL,
      short_description VARCHAR(280) NULL,
      description LONGTEXT NULL,
      max_quantity INT UNSIGNED NULL,
      is_active TINYINT(1) NOT NULL DEFAULT 1,
      partner_org_id INT UNSIGNED NULL,
      created_by_user_id INT UNSIGNED NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      deleted_at DATETIME NULL,
      KEY idx_sadp_active (is_active),
      KEY idx_sadp_deleted (deleted_at),
      KEY idx_sadp_partner (partner_org_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  const alters = [
    ['partner_org_id', 'INT UNSIGNED NULL'],
    ['media_json', 'LONGTEXT NULL'],
    ['product_code', 'VARCHAR(120) NULL'],
    ['category', 'VARCHAR(180) NULL'],
    ['short_description', 'VARCHAR(280) NULL'],
    ['max_quantity', 'INT UNSIGNED NULL'],
  ];
  for (const [name, def] of alters) {
    try {
      await promisePool.query(`ALTER TABLE shule_avance_teacher_deal_products ADD COLUMN ${name} ${def}`);
    } catch (e) {
      if (e.code !== 'ER_DUP_FIELDNAME') {
        console.warn(`[shule-avance] ALTER add ${name}:`, e.message);
      }
    }
  }

  try {
    await promisePool.query(`ALTER TABLE shule_avance_teacher_deal_products MODIFY COLUMN description LONGTEXT NULL`);
  } catch (e) {
    if (e.code !== 'ER_DUP_FIELDNAME' && !String(e.message || '').includes('Duplicate column')) {
      console.warn('[shule-avance] ALTER modify description:', e.message);
    }
  }

  teacherDealProductsReady = true;
}

function toDealProductDto(r) {
  const media = [];
  if (r.media_json) {
    try {
      const parsed = typeof r.media_json === 'string' ? JSON.parse(r.media_json) : r.media_json;
      if (Array.isArray(parsed)) {
        media.push(...parsed.filter(Boolean));
      }
    } catch {}
  }
  if (!media.length && r.image_url) {
    media.push({ url: r.image_url, type: 'image' });
  }

  return {
    id: Number(r.id),
    product_code: r.product_code || null,
    category: r.category || null,
    name: r.name || '',
    short_description: r.short_description || null,
    price_rwf: Number(r.price_rwf || 0),
    image_url: r.image_url || '',
    description: r.description || '',
    max_quantity: r.max_quantity ? Number(r.max_quantity) : null,
    is_active: Number(r.is_active || 0) === 1,
    partner_org_id: r.partner_org_id ? Number(r.partner_org_id) : null,
    partner_org_name: r.partner_org_name || null,
    partner_org_login: r.partner_org_login || null,
    partner_org_logo: r.partner_org_logo || null,
    media: media,
  };
}

async function listTeacherDealProducts({ includeInactive = false } = {}) {
  await ensureTeacherDealProductsTable();
  const where = ['r.deleted_at IS NULL'];
  if (!includeInactive) where.push('r.is_active = 1');
  const [rows] = await promisePool.query(
    `SELECT r.id, r.product_code, r.category, r.name, r.short_description, r.price_rwf, r.image_url, r.description, r.max_quantity, r.is_active,
            r.partner_org_id, tp.org_name AS partner_org_name, tp.login_username AS partner_org_login, tp.logo_url AS partner_org_logo,
            r.media_json
     FROM shule_avance_teacher_deal_products r
     LEFT JOIN teacher_deal_partners tp ON tp.id = r.partner_org_id
     WHERE ${where.join(' AND ')}
     AND (r.partner_org_id IS NULL OR tp.is_active = 1)
     ORDER BY r.id DESC`
  );
  return (rows || []).map(toDealProductDto);
}

function normalizeProductIdList(raw) {
  if (Array.isArray(raw)) {
    return [...new Set(raw.map((x) => Number(x)).filter((n) => Number.isFinite(n) && n > 0))];
  }
  if (typeof raw === 'string') {
    const t = raw.trim();
    if (!t) return [];
    try {
      const parsed = JSON.parse(t);
      if (Array.isArray(parsed)) return normalizeProductIdList(parsed);
    } catch (_) {
      // ignore parse error and fallback to CSV parsing
    }
    return normalizeProductIdList(t.split(',').map((x) => x.trim()));
  }
  return [];
}

async function fetchTeacherDealProductsByIds(ids) {
  const cleanIds = normalizeProductIdList(ids);
  if (!cleanIds.length) return [];
  await ensureTeacherDealProductsTable();
  const [rows] = await promisePool.query(
    `SELECT id, product_code, category, name, short_description, price_rwf, image_url, description, max_quantity, is_active, partner_org_id, media_json
     FROM shule_avance_teacher_deal_products
     WHERE deleted_at IS NULL AND is_active = 1 AND id IN (?)`,
    [cleanIds]
  );
  return (rows || []).map(toDealProductDto);
}

function pickUploadedMediaFiles(req) {
  return Array.isArray(req.files) ? req.files : [];
}

async function persistProductMediaFile(file) {
  if (!file?.path) return null;
  const ext = (path.extname(file.originalname || '') || '.jpg').toLowerCase();
  const safeExt = /^[.](jpg|jpeg|png|webp|gif|mp4|mov|avi|pdf|webm)$/i.test(ext) ? ext : '.jpg';
  const relDir = path.join('uploads', 'shule-avance-deals');
  const absDir = path.join(__dirname, '..', relDir);
  fs.mkdirSync(absDir, { recursive: true });
  const name = `deal-${Date.now()}-${Math.round(Math.random() * 1e9)}${safeExt}`;
  const absPath = path.join(absDir, name);
  await fs.promises.rename(file.path, absPath);
  return `/${relDir.replace(/\\/g, '/')}/${name}`;
}

const ROW_SELECT = `r.id, r.school_id, r.teacher_user_id, r.amount_rwf, r.purpose, r.repayment_term_months,
              r.vendor_label, r.details, r.invoice_file_name, r.status, r.accountant_note, r.manager_feedback,
              r.submitted_at, r.accountant_reviewed_at, r.manager_reviewed_at, r.created_at, r.updated_at,
              r.request_type, r.service_category, r.cashout_reason, r.cashout_category_slug,
              r.deal_product_ids_json, r.deal_products_snapshot_json, r.deal_products_total_rwf`;

async function parseCreateBody(req, maps) {
  const { servicesBySlug, cashoutsBySlug } = maps;
  if (!servicesBySlug.size && !cashoutsBySlug.size) {
    return { error: 'ShuleAvance catalog is empty. Ask your platform administrator to configure services and cashout types.' };
  }

  const requestType = String(req.body?.request_type || 'service').toLowerCase();
  if (!['service', 'cashout'].includes(requestType)) {
    return { error: 'request_type must be service or cashout' };
  }
  let amount = Number(req.body?.amount_requested ?? req.body?.amount_rwf);
  const repayment = Number(req.body?.repayment_term_months ?? req.body?.repayment_term ?? 6);

  if (!amount || amount <= 0) {
    return { error: 'amount_requested must be greater than zero' };
  }
  if (!Number.isInteger(repayment) || repayment < 1 || repayment > 12) {
    return { error: 'repayment_term_months must be between 1 and 12' };
  }

  let purpose = '';
  let details = String(req.body?.details || '').trim() || null;
  let vendorLabel = String(req.body?.vendor_label || '').trim() || null;
  let serviceCategory = null;
  let cashoutReason = null;
  let cashoutCategorySlug = null;
  let dealProductIdsJson = null;
  let dealProductsSnapshotJson = null;
  let dealProductsTotalRwf = null;
  const invoiceFileName = String(req.body?.invoice_file_name || '').trim() || null;

  if (requestType === 'service') {
    if (!servicesBySlug.size) {
      return { error: 'No service categories are configured' };
    }
    serviceCategory = String(req.body?.service_category || '').trim();
    if (!servicesBySlug.has(serviceCategory)) {
      return { error: 'Select a valid service category' };
    }
    const cat = servicesBySlug.get(serviceCategory);
    if (serviceCategory === 'teacher_deals') {
      const selectedIds = normalizeProductIdList(
        req.body?.selected_deal_product_ids || req.body?.deal_product_ids || req.body?.product_ids
      );
      if (!selectedIds.length) {
        return { error: 'Select at least one Teacher Deal product' };
      }
      const selectedProducts = await fetchTeacherDealProductsByIds(selectedIds);
      if (!selectedProducts.length || selectedProducts.length !== selectedIds.length) {
        return { error: 'One or more selected Teacher Deal products are not available' };
      }
      const total = Number(
        selectedProducts.reduce((sum, p) => sum + Number(p.price_rwf || 0), 0).toFixed(2)
      );
      if (total <= 0) {
        return { error: 'Selected Teacher Deal products have invalid pricing' };
      }
      amount = total;
      dealProductsTotalRwf = total;
      const userDesc = String(req.body?.description || req.body?.purpose || '').trim();
      const lineItems = selectedProducts.map((p) => `${p.name} (${Number(p.price_rwf).toLocaleString()} RWF)`).join(', ');
      purpose = userDesc || `Teacher Deals purchase (${selectedProducts.length} item${selectedProducts.length > 1 ? 's' : ''})`;
      details = lineItems;
      vendorLabel = 'Teacher Deals Catalog';
      dealProductIdsJson = JSON.stringify(selectedProducts.map((p) => p.id));
      dealProductsSnapshotJson = JSON.stringify(selectedProducts);
    } else {
      const userDesc = String(req.body?.description || req.body?.purpose || '').trim();
      purpose = userDesc || `Service — ${cat.label}`;
      vendorLabel = cat.label;
    }
  } else {
    if (!cashoutsBySlug.size) {
      return { error: 'No cashout types are configured' };
    }
    cashoutCategorySlug = String(
      req.body?.cashout_category || req.body?.cashout_category_slug || ''
    ).trim();
    if (!cashoutsBySlug.has(cashoutCategorySlug)) {
      return { error: 'Select a valid cashout type' };
    }
    const co = cashoutsBySlug.get(cashoutCategorySlug);
    cashoutReason = String(req.body?.reason || req.body?.cashout_reason || req.body?.purpose || '').trim();
    if (!cashoutReason) {
      return { error: 'reason is required for cashout requests' };
    }
    purpose = `Cashout [${co.label}]: ${cashoutReason}`;
    details = String(req.body?.description || '').trim() || null;
  }

  return {
    value: {
      requestType,
      amount,
      repayment,
      purpose,
      details,
      vendorLabel,
      serviceCategory,
      cashoutReason,
      cashoutCategorySlug,
      invoiceFileName,
      dealProductIdsJson,
      dealProductsSnapshotJson,
      dealProductsTotalRwf,
    },
  };
}

async function handleApplicantCreate(req, res) {
  try {
    const { schoolId, userId } = req.ctx;
    await ensureShuleAvanceTeacherCatalogTable();
    const maps = await fetchActiveCatalogMaps();
    const parsed = await parseCreateBody(req, maps);
    if (parsed.error) {
      return res.status(400).json({ success: false, message: parsed.error });
    }
    const v = parsed.value;

    const [result] = await promisePool.query(
      `INSERT INTO shule_avance_requests
       (school_id, teacher_user_id, amount_rwf, purpose, repayment_term_months, vendor_label, details,
        invoice_file_name, status, request_type, service_category, cashout_reason, cashout_category_slug,
        deal_product_ids_json, deal_products_snapshot_json, deal_products_total_rwf)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        schoolId,
        userId,
        v.amount,
        v.purpose,
        v.repayment,
        v.vendorLabel,
        v.details,
        v.invoiceFileName,
        STATUS.PENDING_ACCOUNTANT,
        v.requestType,
        v.requestType === 'service' ? v.serviceCategory : null,
        v.requestType === 'cashout' ? v.cashoutReason : null,
        v.requestType === 'cashout' ? v.cashoutCategorySlug : null,
        v.requestType === 'service' ? v.dealProductIdsJson : null,
        v.requestType === 'service' ? v.dealProductsSnapshotJson : null,
        v.requestType === 'service' ? v.dealProductsTotalRwf : null,
      ]
    );

    res.status(201).json({ success: true, message: 'Request submitted to accountant', id: result.insertId });
  } catch (error) {
    console.error('[shule-avance] applicant create:', error.message);
    res.status(500).json({ success: false, message: 'Failed to submit request' });
  }
}

async function handleApplicantList(req, res) {
  try {
    const { schoolId, userId } = req.ctx;
    const [rows] = await promisePool.query(
      `SELECT ${ROW_SELECT}
       FROM shule_avance_requests r
       WHERE r.school_id = ? AND r.teacher_user_id = ?
       ORDER BY r.id DESC`,
      [schoolId, userId]
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('[shule-avance] applicant list:', error.message);
    res.status(500).json({ success: false, message: 'Failed to load your ShuleAvance requests' });
  }
}

async function handleApplicantUpdate(req, res) {
  try {
    const { schoolId, userId } = req.ctx;
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ success: false, message: 'Invalid request id' });

    const [[existing]] = await promisePool.query(
      `SELECT id, status, request_type, cashout_category_slug, service_category
       FROM shule_avance_requests WHERE id = ? AND school_id = ? AND teacher_user_id = ? LIMIT 1`,
      [id, schoolId, userId]
    );
    if (!existing) return res.status(404).json({ success: false, message: 'Request not found' });
    if (existing.status !== STATUS.PENDING_ACCOUNTANT) {
      return res.status(400).json({ success: false, message: 'Only pending requests can be edited' });
    }

    if (
      String(existing.request_type || '').toLowerCase() === 'cashout' &&
      !String(req.body?.cashout_category || req.body?.cashout_category_slug || '').trim() &&
      existing.cashout_category_slug
    ) {
      req.body = { ...req.body, cashout_category: existing.cashout_category_slug };
    }
    if (
      String(existing.request_type || '').toLowerCase() === 'service' &&
      !String(req.body?.service_category || '').trim() &&
      existing.service_category
    ) {
      req.body = { ...req.body, service_category: existing.service_category };
    }

    await ensureShuleAvanceTeacherCatalogTable();
    const maps = await fetchActiveCatalogMaps();
    const parsed = await parseCreateBody(req, maps);
    if (parsed.error) {
      return res.status(400).json({ success: false, message: parsed.error });
    }
    const v = parsed.value;

    await promisePool.query(
      `UPDATE shule_avance_requests
       SET amount_rwf = ?, purpose = ?, repayment_term_months = ?, vendor_label = ?, details = ?,
           invoice_file_name = ?, request_type = ?, service_category = ?, cashout_reason = ?, cashout_category_slug = ?,
           deal_product_ids_json = ?, deal_products_snapshot_json = ?, deal_products_total_rwf = ?
       WHERE id = ? AND school_id = ? AND teacher_user_id = ?`,
      [
        v.amount,
        v.purpose,
        v.repayment,
        v.vendorLabel,
        v.details,
        v.invoiceFileName,
        v.requestType,
        v.requestType === 'service' ? v.serviceCategory : null,
        v.requestType === 'cashout' ? v.cashoutReason : null,
        v.requestType === 'cashout' ? v.cashoutCategorySlug : null,
        v.requestType === 'service' ? v.dealProductIdsJson : null,
        v.requestType === 'service' ? v.dealProductsSnapshotJson : null,
        v.requestType === 'service' ? v.dealProductsTotalRwf : null,
        id,
        schoolId,
        userId,
      ]
    );

    res.json({ success: true, message: 'Request updated successfully' });
  } catch (error) {
    console.error('[shule-avance] applicant update:', error.message);
    res.status(500).json({ success: false, message: 'Failed to update request' });
  }
}

async function handleApplicantDelete(req, res) {
  try {
    const { schoolId, userId } = req.ctx;
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ success: false, message: 'Invalid request id' });

    const [result] = await promisePool.query(
      `DELETE FROM shule_avance_requests
       WHERE id = ? AND school_id = ? AND teacher_user_id = ? AND status = ?`,
      [id, schoolId, userId, STATUS.PENDING_ACCOUNTANT]
    );

    if (!result.affectedRows) {
      return res.status(400).json({
        success: false,
        message: 'Request not found or cannot be deleted after review',
      });
    }
    res.json({ success: true, message: 'Request deleted successfully' });
  } catch (error) {
    console.error('[shule-avance] applicant delete:', error.message);
    res.status(500).json({ success: false, message: 'Failed to delete request' });
  }
}

router.get('/shule-avance/catalog', requireLoggedIn, async (req, res) => {
  try {
    await ensureShuleAvanceTeacherCatalogTable();
    const [rows] = await promisePool.query(
      `SELECT item_kind, slug, label, description, income_rate_percent, sort_order
       FROM shule_avance_teacher_catalog
       WHERE is_active = 1
       ORDER BY item_kind ASC, sort_order ASC, id ASC`
    );
    const services = [];
    const cashouts = [];
    for (const r of rows || []) {
      const x = {
        slug: r.slug,
        label: r.label,
        description: r.description,
        income_rate_percent: Number(r.income_rate_percent),
        sort_order: r.sort_order,
      };
      if (r.item_kind === 'service') services.push(x);
      else cashouts.push(x);
    }
    res.json({ success: true, data: { services, cashouts } });
  } catch (error) {
    console.error('[shule-avance] catalog:', error.message);
    res.status(500).json({ success: false, message: 'Failed to load catalog' });
  }
});

router.get('/shule-avance/teacher-deal-products', requireLoggedIn, async (_req, res) => {
  try {
    const data = await listTeacherDealProducts();
    res.json({ success: true, data });
  } catch (error) {
    console.error('[shule-avance] teacher deal products:', error.message);
    res.status(500).json({ success: false, message: 'Failed to load Teacher Deal products' });
  }
});

router.get('/shule-avance/admin/teacher-deal-products', requireLoggedIn, requireDealProductAdmin, async (req, res) => {
  try {
    const includeInactive = String(req.query?.include_inactive || '').trim() === '1';
    const data = await listTeacherDealProducts({ includeInactive });
    res.json({ success: true, data });
  } catch (error) {
    console.error('[shule-avance] admin list teacher deal products:', error.message);
    res.status(500).json({ success: false, message: 'Failed to load Teacher Deal products' });
  }
});

router.post('/shule-avance/admin/teacher-deal-products', requireLoggedIn, requireDealProductAdmin, async (req, res) => {
  try {
    await ensureTeacherDealProductsTable();
    const userId = resolveUserId(req);
    const name = String(req.body?.name || '').trim();
    const productCode = String(req.body?.product_code || '').trim() || null;
    const category = String(req.body?.category || '').trim() || null;
    const shortDescription = String(req.body?.short_description || '').trim() || null;
    const description = String(req.body?.description || '').trim() || null;
    const price = Number(req.body?.price_rwf);
    const maxQuantity = req.body?.max_quantity ? Number(req.body.max_quantity) : null;
    const isActive = req.body?.is_active === undefined ? true : !!req.body.is_active;
    const partnerOrgId = req.body?.partner_org_id ? Number(req.body.partner_org_id) : null;

    if (!name) return res.status(400).json({ success: false, message: 'name is required' });
    if (!Number.isFinite(price) || price <= 0) {
      return res.status(400).json({ success: false, message: 'price_rwf must be greater than zero' });
    }
    if (partnerOrgId && !Number.isFinite(partnerOrgId)) {
      return res.status(400).json({ success: false, message: 'partner_org_id must be a valid id' });
    }

    const mediaFiles = pickUploadedMediaFiles(req);
    const mediaUrls = [];
    for (const file of mediaFiles) {
      const url = await persistProductMediaFile(file);
      if (url) mediaUrls.push({ url, type: String(file.mimetype || '').split('/')[0] || 'file' });
    }
    const imageUrl = mediaUrls.find((m) => m.type === 'image')?.url || null;
    const mediaJson = mediaUrls.length ? JSON.stringify(mediaUrls) : null;

    const [r] = await promisePool.query(
      `INSERT INTO shule_avance_teacher_deal_products
       (product_code, category, name, short_description, price_rwf, image_url, media_json, description, max_quantity, is_active, partner_org_id, created_by_user_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [productCode, category, name, shortDescription, Number(price.toFixed(2)), imageUrl, mediaJson, description, Number(maxQuantity || 0) || null, isActive ? 1 : 0, partnerOrgId, userId]
    );
    res.status(201).json({ success: true, id: r.insertId, message: 'Teacher Deal product created' });
  } catch (error) {
    console.error('[shule-avance] admin create teacher deal product:', error.message);
    res.status(500).json({ success: false, message: 'Failed to create Teacher Deal product' });
  }
});

router.put('/shule-avance/admin/teacher-deal-products/:id', requireLoggedIn, requireDealProductAdmin, async (req, res) => {
  try {
    await ensureTeacherDealProductsTable();
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ success: false, message: 'Invalid product id' });
    const [[existing]] = await promisePool.query(
      `SELECT id, image_url, media_json
       FROM shule_avance_teacher_deal_products
       WHERE id = ? AND deleted_at IS NULL
       LIMIT 1`,
      [id]
    );
    if (!existing) return res.status(404).json({ success: false, message: 'Product not found' });

    const fields = [];
    const vals = [];
    if (req.body?.product_code !== undefined) {
      fields.push('product_code = ?');
      vals.push(String(req.body.product_code || '').trim() || null);
    }
    if (req.body?.category !== undefined) {
      fields.push('category = ?');
      vals.push(String(req.body.category || '').trim() || null);
    }
    if (req.body?.name !== undefined) {
      const name = String(req.body.name || '').trim();
      if (!name) return res.status(400).json({ success: false, message: 'name cannot be empty' });
      fields.push('name = ?');
      vals.push(name);
    }
    if (req.body?.short_description !== undefined) {
      fields.push('short_description = ?');
      vals.push(String(req.body.short_description || '').trim() || null);
    }
    if (req.body?.price_rwf !== undefined) {
      const price = Number(req.body.price_rwf);
      if (!Number.isFinite(price) || price <= 0) {
        return res.status(400).json({ success: false, message: 'price_rwf must be greater than zero' });
      }
      fields.push('price_rwf = ?');
      vals.push(Number(price.toFixed(2)));
    }
    if (req.body?.max_quantity !== undefined) {
      const maxQuantity = req.body.max_quantity ? Number(req.body.max_quantity) : null;
      fields.push('max_quantity = ?');
      vals.push(maxQuantity !== null && Number.isFinite(maxQuantity) ? maxQuantity : null);
    }
    if (req.body?.description !== undefined) {
      fields.push('description = ?');
      vals.push(String(req.body.description || '').trim() || null);
    }
    if (req.body?.is_active !== undefined) {
      fields.push('is_active = ?');
      vals.push(req.body.is_active ? 1 : 0);
    }
    if (req.body?.partner_org_id !== undefined) {
      const partnerOrgId = req.body.partner_org_id ? Number(req.body.partner_org_id) : null;
      if (partnerOrgId !== null && !Number.isFinite(partnerOrgId)) {
        return res.status(400).json({ success: false, message: 'partner_org_id must be a valid id' });
      }
      fields.push('partner_org_id = ?');
      vals.push(partnerOrgId);
    }

    const mediaFiles = pickUploadedMediaFiles(req);
    if (mediaFiles.length) {
      const mediaUrls = [];
      for (const file of mediaFiles) {
        const url = await persistProductMediaFile(file);
        if (url) mediaUrls.push({ url, type: String(file.mimetype || '').split('/')[0] || 'file' });
      }
      if (mediaUrls.length) {
        const imageUrl = mediaUrls.find((m) => m.type === 'image')?.url || existing.image_url || null;
        fields.push('image_url = ?');
        vals.push(imageUrl);
        fields.push('media_json = ?');
        vals.push(JSON.stringify(mediaUrls));
      }
    }

    if (!fields.length) {
      return res.status(400).json({ success: false, message: 'No changes provided' });
    }
    vals.push(id);
    await promisePool.query(
      `UPDATE shule_avance_teacher_deal_products
       SET ${fields.join(', ')}
       WHERE id = ? AND deleted_at IS NULL`,
      vals
    );
    res.json({ success: true, message: 'Teacher Deal product updated' });
  } catch (error) {
    console.error('[shule-avance] admin update teacher deal product:', error.message);
    res.status(500).json({ success: false, message: 'Failed to update Teacher Deal product' });
  }
});

router.delete('/shule-avance/admin/teacher-deal-products/:id', requireLoggedIn, requireDealProductAdmin, async (req, res) => {
  try {
    await ensureTeacherDealProductsTable();
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ success: false, message: 'Invalid product id' });
    const [r] = await promisePool.query(
      `UPDATE shule_avance_teacher_deal_products
       SET deleted_at = NOW(), is_active = 0
       WHERE id = ? AND deleted_at IS NULL`,
      [id]
    );
    if (!r.affectedRows) return res.status(404).json({ success: false, message: 'Product not found' });
    res.json({ success: true, message: 'Teacher Deal product deleted' });
  } catch (error) {
    console.error('[shule-avance] admin delete teacher deal product:', error.message);
    res.status(500).json({ success: false, message: 'Failed to delete Teacher Deal product' });
  }
});

function toDealPartnerDto(r) {
  return {
    id: Number(r.id),
    org_name: r.org_name || '',
    partner_code: r.partner_code || null,
    login_username: r.login_username || null,
    contact_email: r.contact_email || null,
    contact_phone: r.contact_phone || null,
    logo_url: r.logo_url || null,
    description: r.description || null,
    is_active: Number(r.is_active || 0) === 1,
    created_at: r.created_at,
    updated_at: r.updated_at,
  };
}

async function listTeacherDealPartners() {
  await ensureTeacherDealPartnerTable();
  const [rows] = await promisePool.query(
    `SELECT id, org_name, partner_code, login_username, contact_email, contact_phone, description, is_active
     FROM teacher_deal_partners
     WHERE deleted_at IS NULL
     ORDER BY id DESC`
  );
  return (rows || []).map(toDealPartnerDto);
}

router.get('/shule-avance/admin/teacher-deal-partners', requireLoggedIn, requireDealProductAdmin, async (req, res) => {
  try {
    const data = await listTeacherDealPartners();
    res.json({ success: true, data });
  } catch (error) {
    console.error('[shule-avance] admin list teacher deal partners:', error.message);
    res.status(500).json({ success: false, message: 'Failed to load teacher deal partners' });
  }
});

router.post('/shule-avance/admin/teacher-deal-partners', requireLoggedIn, requireDealProductAdmin, async (req, res) => {
  try {
    await ensureTeacherDealPartnerTable();
    const createdBy = resolveUserId(req);
    const orgName = String(req.body?.org_name || '').trim();
    const loginUsername = String(req.body?.login_username || '').trim() || null;
    const partnerCode = String(req.body?.partner_code || '').trim() || null;
    const contactEmail = String(req.body?.contact_email || '').trim() || null;
    const contactPhone = String(req.body?.contact_phone || '').trim() || null;
    const description = String(req.body?.description || '').trim() || null;
    const isActive = req.body?.is_active === undefined ? true : !!req.body.is_active;

    let logoUrl = null;
    const files = pickUploadedMediaFiles(req);
    const logoFile = files.find(f => f.fieldname === 'logo' || f.fieldname === 'logo_url');
    if (logoFile) {
      logoUrl = await persistProductMediaFile(logoFile);
    }

    if (!orgName) return res.status(400).json({ success: false, message: 'org_name is required' });
    if (!loginUsername) return res.status(400).json({ success: false, message: 'login_username is required' });
    if (!contactEmail) return res.status(400).json({ success: false, message: 'contact_email is required' });

    const [r] = await promisePool.query(
      `INSERT INTO teacher_deal_partners
       (org_name, partner_code, login_username, contact_email, contact_phone, logo_url, description, is_active, created_by_user_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [orgName, partnerCode, loginUsername, contactEmail, contactPhone, logoUrl, description, isActive ? 1 : 0, createdBy]
    );
    res.status(201).json({ success: true, id: r.insertId, message: 'Teacher Deal partner created' });
  } catch (error) {
    console.error('[shule-avance] admin create teacher deal partner:', error.message);
    res.status(500).json({ success: false, message: 'Failed to create teacher deal partner' });
  }
});

router.put('/shule-avance/admin/teacher-deal-partners/:id', requireLoggedIn, requireDealProductAdmin, async (req, res) => {
  try {
    await ensureTeacherDealPartnerTable();
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ success: false, message: 'Invalid partner id' });
    const fields = [];
    const vals = [];
    if (req.body?.org_name !== undefined) {
      const orgName = String(req.body.org_name || '').trim();
      if (!orgName) return res.status(400).json({ success: false, message: 'org_name cannot be empty' });
      fields.push('org_name = ?');
      vals.push(orgName);
    }
    if (req.body?.login_username !== undefined) {
      fields.push('login_username = ?');
      vals.push(String(req.body.login_username || '').trim() || null);
    }
    if (req.body?.partner_code !== undefined) {
      fields.push('partner_code = ?');
      vals.push(String(req.body.partner_code || '').trim() || null);
    }
    if (req.body?.contact_email !== undefined) {
      fields.push('contact_email = ?');
      vals.push(String(req.body.contact_email || '').trim() || null);
    }
    if (req.body?.contact_phone !== undefined) {
      fields.push('contact_phone = ?');
      vals.push(String(req.body.contact_phone || '').trim() || null);
    }
    if (req.body?.description !== undefined) {
      fields.push('description = ?');
      vals.push(String(req.body.description || '').trim() || null);
    }
    if (req.body?.is_active !== undefined) {
      fields.push('is_active = ?');
      vals.push(req.body.is_active ? 1 : 0);
    }
    const files = pickUploadedMediaFiles(req);
    const logoFile = files.find(f => f.fieldname === 'logo' || f.fieldname === 'logo_url');
    if (logoFile) {
      const logoUrl = await persistProductMediaFile(logoFile);
      if (logoUrl) {
        fields.push('logo_url = ?');
        vals.push(logoUrl);
      }
    }
    if (!fields.length) {
      return res.status(400).json({ success: false, message: 'No changes provided' });
    }
    vals.push(id);
    await promisePool.query(
      `UPDATE teacher_deal_partners SET ${fields.join(', ')} WHERE id = ? AND deleted_at IS NULL`,
      vals
    );
    res.json({ success: true, message: 'Teacher Deal partner updated' });
  } catch (error) {
    console.error('[shule-avance] admin update teacher deal partner:', error.message);
    res.status(500).json({ success: false, message: 'Failed to update teacher deal partner' });
  }
});

router.delete('/shule-avance/admin/teacher-deal-partners/:id', requireLoggedIn, requireDealProductAdmin, async (req, res) => {
  try {
    await ensureTeacherDealPartnerTable();
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ success: false, message: 'Invalid partner id' });
    const [r] = await promisePool.query(
      `UPDATE teacher_deal_partners SET deleted_at = NOW(), is_active = 0 WHERE id = ? AND deleted_at IS NULL`,
      [id]
    );
    if (!r.affectedRows) return res.status(404).json({ success: false, message: 'Partner not found' });
    res.json({ success: true, message: 'Teacher Deal partner deleted' });
  } catch (error) {
    console.error('[shule-avance] admin delete teacher deal partner:', error.message);
    res.status(500).json({ success: false, message: 'Failed to delete teacher deal partner' });
  }
});

router.use(authGuard);
router.use(async (_req, res, next) => {
  try {
    await ensureTable();
    next();
  } catch (error) {
    console.error('[shule-avance] ensureTable failed:', error.message);
    res.status(500).json({ success: false, message: 'Failed to initialize ShuleAvance storage' });
  }
});

// Applicant CRUD (teachers, HOD, DOS, accountants)
router.get('/shule-avance/applicant/my-requests', requireRole(APPLICANT_ROLES), handleApplicantList);
router.post('/shule-avance/applicant/requests', requireRole(APPLICANT_ROLES), handleApplicantCreate);
router.put('/shule-avance/applicant/requests/:id', requireRole(APPLICANT_ROLES), handleApplicantUpdate);
router.delete('/shule-avance/applicant/requests/:id', requireRole(APPLICANT_ROLES), handleApplicantDelete);

router.get('/shule-avance/teacher/my-requests', requireRole(APPLICANT_ROLES), handleApplicantList);
router.post('/shule-avance/teacher/requests', requireRole(APPLICANT_ROLES), handleApplicantCreate);
router.put('/shule-avance/teacher/requests/:id', requireRole(APPLICANT_ROLES), handleApplicantUpdate);
router.delete('/shule-avance/teacher/requests/:id', requireRole(APPLICANT_ROLES), handleApplicantDelete);

// Accountant: finance queue (all school requests from staff)
router.get('/shule-avance/finance/requests', requireRole(ROLE_ACCOUNTANT), async (req, res) => {
  try {
    const { schoolId } = req.ctx;
    const raw = String(req.query?.status || 'all').toLowerCase();
    const allowed = [
      'all',
      STATUS.PENDING_ACCOUNTANT,
      STATUS.SENT_TO_MANAGER,
      STATUS.APPROVED,
      'rejected',
    ];
    if (!allowed.includes(raw)) {
      return res.status(400).json({ success: false, message: 'Invalid status filter' });
    }

    let where = 'r.school_id = ?';
    const params = [schoolId];
    if (raw === STATUS.PENDING_ACCOUNTANT) {
      where += ' AND r.status = ?';
      params.push(STATUS.PENDING_ACCOUNTANT);
    } else if (raw === STATUS.SENT_TO_MANAGER) {
      where += ' AND r.status = ?';
      params.push(STATUS.SENT_TO_MANAGER);
    } else if (raw === STATUS.APPROVED) {
      where += ' AND r.status = ?';
      params.push(STATUS.APPROVED);
    } else if (raw === 'rejected') {
      where += ' AND r.status IN (?, ?)';
      params.push(STATUS.REJECTED_BY_ACCOUNTANT, STATUS.REJECTED_BY_MANAGER);
    }

    const [rows] = await promisePool.query(
      `SELECT ${ROW_SELECT},
              TRIM(CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, ''))) AS staff_name,
              u.email AS staff_email,
              COALESCE(rl.role_code, '') AS submitter_role_code
       FROM shule_avance_requests r
       LEFT JOIN users u ON u.id = r.teacher_user_id
       LEFT JOIN roles rl ON rl.id = u.role_id
       WHERE ${where}
       ORDER BY r.id DESC`,
      params
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('[shule-avance] finance requests:', error.message);
    res.status(500).json({ success: false, message: 'Failed to load requests' });
  }
});

router.get('/shule-avance/finance/pending-invoices', requireRole(ROLE_ACCOUNTANT), async (req, res) => {
  try {
    const { schoolId } = req.ctx;
    const [rows] = await promisePool.query(
      `SELECT ${ROW_SELECT},
              TRIM(CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, ''))) AS staff_name,
              u.email AS staff_email,
              COALESCE(rl.role_code, '') AS submitter_role_code
       FROM shule_avance_requests r
       LEFT JOIN users u ON u.id = r.teacher_user_id
       LEFT JOIN roles rl ON rl.id = u.role_id
       WHERE r.school_id = ? AND r.status = ?
       ORDER BY r.id DESC`,
      [schoolId, STATUS.PENDING_ACCOUNTANT]
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('[shule-avance] finance pending:', error.message);
    res.status(500).json({ success: false, message: 'Failed to load pending finance queue' });
  }
});

router.patch('/shule-avance/finance/invoice-requests/:id/send-to-manager', requireRole(ROLE_ACCOUNTANT), async (req, res) => {
  try {
    const { schoolId, userId } = req.ctx;
    const id = Number(req.params.id);
    const note = String(req.body?.note || req.body?.comment || '').trim();
    if (!id) return res.status(400).json({ success: false, message: 'Invalid request id' });

    const [result] = await promisePool.query(
      `UPDATE shule_avance_requests
       SET status = ?, accountant_note = ?, accountant_reviewed_at = NOW(), accountant_reviewed_by = ?
       WHERE id = ? AND school_id = ? AND status = ?`,
      [STATUS.SENT_TO_MANAGER, note || null, userId, id, schoolId, STATUS.PENDING_ACCOUNTANT]
    );
    if (!result.affectedRows) {
      return res.status(400).json({ success: false, message: 'Request not found or already handled' });
    }
    res.json({ success: true, message: 'Request sent to school manager for decision' });
  } catch (error) {
    console.error('[shule-avance] finance send-to-manager:', error.message);
    res.status(500).json({ success: false, message: 'Failed to send request to manager' });
  }
});

router.patch('/shule-avance/finance/invoice-requests/:id/reject', requireRole(ROLE_ACCOUNTANT), async (req, res) => {
  try {
    const { schoolId, userId } = req.ctx;
    const id = Number(req.params.id);
    const note = String(req.body?.note || '').trim();
    if (!id) return res.status(400).json({ success: false, message: 'Invalid request id' });

    const [result] = await promisePool.query(
      `UPDATE shule_avance_requests
       SET status = ?, accountant_note = ?, accountant_reviewed_at = NOW(), accountant_reviewed_by = ?
       WHERE id = ? AND school_id = ? AND status = ?`,
      [STATUS.REJECTED_BY_ACCOUNTANT, note || null, userId, id, schoolId, STATUS.PENDING_ACCOUNTANT]
    );
    if (!result.affectedRows) {
      return res.status(400).json({ success: false, message: 'Request not found or already handled' });
    }
    res.json({ success: true, message: 'Request rejected' });
  } catch (error) {
    console.error('[shule-avance] finance reject:', error.message);
    res.status(500).json({ success: false, message: 'Failed to reject request' });
  }
});

// Manager: list with optional status (default: awaiting manager decision)
router.get('/shule-avance/manager/requests', requireRole(MANAGER_ROLES), async (req, res) => {
  try {
    const { schoolId } = req.ctx;
    const raw = String(req.query?.status || 'sent_to_manager').toLowerCase();
    let where = 'r.school_id = ?';
    const params = [schoolId];

    if (raw === 'sent_to_manager' || raw === 'pending') {
      where += ' AND r.status = ?';
      params.push(STATUS.SENT_TO_MANAGER);
    } else if (raw === STATUS.APPROVED) {
      where += ' AND r.status = ?';
      params.push(STATUS.APPROVED);
    } else if (raw === 'rejected') {
      where += ' AND r.status = ?';
      params.push(STATUS.REJECTED_BY_MANAGER);
    } else if (raw === 'all') {
      /* no extra filter */
    } else {
      where += ' AND r.status = ?';
      params.push(STATUS.SENT_TO_MANAGER);
    }

    const [rows] = await promisePool.query(
      `SELECT ${ROW_SELECT},
              TRIM(CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, ''))) AS staff_name,
              u.email AS staff_email,
              COALESCE(rl.role_code, '') AS submitter_role_code
       FROM shule_avance_requests r
       LEFT JOIN users u ON u.id = r.teacher_user_id
       LEFT JOIN roles rl ON rl.id = u.role_id
       WHERE ${where}
       ORDER BY r.id DESC`,
      params
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('[shule-avance] manager requests:', error.message);
    res.status(500).json({ success: false, message: 'Failed to load manager queue' });
  }
});

router.get('/shule-avance/manager/pending-requests', requireRole(MANAGER_ROLES), async (req, res) => {
  try {
    const { schoolId } = req.ctx;
    const [rows] = await promisePool.query(
      `SELECT ${ROW_SELECT},
              TRIM(CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, ''))) AS staff_name,
              u.email AS staff_email,
              COALESCE(rl.role_code, '') AS submitter_role_code
       FROM shule_avance_requests r
       LEFT JOIN users u ON u.id = r.teacher_user_id
       LEFT JOIN roles rl ON rl.id = u.role_id
       WHERE r.school_id = ? AND r.status = ?
       ORDER BY r.id DESC`,
      [schoolId, STATUS.SENT_TO_MANAGER]
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('[shule-avance] manager pending:', error.message);
    res.status(500).json({ success: false, message: 'Failed to load manager queue' });
  }
});

router.patch('/shule-avance/manager/invoice-requests/:id/decision', requireRole(MANAGER_ROLES), async (req, res) => {
  try {
    const { schoolId, userId } = req.ctx;
    const id = Number(req.params.id);
    const decision = String(req.body?.decision || '').toLowerCase();
    const feedback = String(req.body?.feedback || req.body?.comment || '').trim();
    if (!id) return res.status(400).json({ success: false, message: 'Invalid request id' });
    if (!['approved', 'rejected'].includes(decision)) {
      return res.status(400).json({ success: false, message: 'decision must be approved or rejected' });
    }

    const nextStatus = decision === 'approved' ? STATUS.APPROVED : STATUS.REJECTED_BY_MANAGER;
    const [result] = await promisePool.query(
      `UPDATE shule_avance_requests
       SET status = ?, manager_feedback = ?, manager_reviewed_at = NOW(), manager_reviewed_by = ?
       WHERE id = ? AND school_id = ? AND status = ?`,
      [nextStatus, feedback || null, userId, id, schoolId, STATUS.SENT_TO_MANAGER]
    );
    if (!result.affectedRows) {
      return res.status(400).json({ success: false, message: 'Request not found or already handled' });
    }
    res.json({ success: true, message: decision === 'approved' ? 'Request approved' : 'Request rejected' });
  } catch (error) {
    console.error('[shule-avance] manager decision:', error.message);
    res.status(500).json({ success: false, message: 'Failed to save manager decision' });
  }
});

// Legacy endpoints
router.get('/shule-avance/status', async (req, res) => {
  try {
    const { schoolId, userId } = req.ctx;
    const [rows] = await promisePool.query(
      `SELECT id, amount_rwf AS amount_requested, repayment_term_months, purpose, status, submitted_at AS created_at,
              request_type, service_category, details, vendor_label, cashout_reason, cashout_category_slug,
              accountant_note, manager_feedback, deal_product_ids_json, deal_products_snapshot_json, deal_products_total_rwf
       FROM shule_avance_requests
       WHERE school_id = ? AND teacher_user_id = ?
       ORDER BY id DESC`,
      [schoolId, userId]
    );
    const active = rows.find((r) =>
      [STATUS.PENDING_ACCOUNTANT, STATUS.SENT_TO_MANAGER].includes(r.status)
    );
    res.json({
      success: true,
      has_active_application: !!active,
      active_loan: active || null,
      history: rows,
    });
  } catch (error) {
    console.error('[shule-avance] legacy status:', error.message);
    res.status(500).json({ success: false, message: 'Failed to load status' });
  }
});

router.post('/shule-avance/apply', requireRole(LEGACY_APPLICANT_ROLES), async (req, res) => {
  try {
    await ensureShuleAvanceTeacherCatalogTable();
    const maps = await fetchActiveCatalogMaps();
    const firstCash = maps.cashoutsBySlug.keys().next().value;
    if (!firstCash) {
      return res.status(400).json({ success: false, message: 'No cashout types configured' });
    }
    req.body = {
      ...req.body,
      request_type: 'cashout',
      cashout_category: req.body?.cashout_category || req.body?.cashout_category_slug || firstCash,
      reason: req.body?.reason || req.body?.purpose,
      description: req.body?.details,
    };
    return handleApplicantCreate(req, res);
  } catch (error) {
    console.error('[shule-avance] legacy apply:', error.message);
    res.status(500).json({ success: false, message: 'Failed to submit request' });
  }
});

router.delete('/shule-avance/cancel/:id', requireRole(APPLICANT_ROLES), (req, res) =>
  handleApplicantDelete(req, res)
);

module.exports = router;
