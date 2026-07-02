'use strict';

/**
 * 3-Level Procurement: Request → Requisition → Purchase Order
 */

const PROCUREMENT_REQUEST_ROLES = [
  'TEACHER', 'HOD', 'DOS', 'ACCOUNTANT', 'SCHOOL_ADMIN', 'SCHOOL_MANAGER',
  'STORE_MANAGER', 'STOREKEEPER', 'UNIFORM_MANAGER', 'LIBRARIAN', 'DISCIPLINE_STAFF', 'ASSETS_MANAGER', 'ASSET_MANAGER',
  'GATE_KEEPER', 'GATE_OFFICER', 'SCHOOL_REPRESENTATIVE', 'NETWORK_REPRESENTATIVE',
];
const PROCUREMENT_ACCOUNTANT_ROLES = ['ACCOUNTANT', 'SCHOOL_ADMIN', 'SCHOOL_MANAGER'];
const PROCUREMENT_MANAGER_ROLES = ['SCHOOL_ADMIN', 'SCHOOL_MANAGER'];
const PROCUREMENT_REQUISITION_READ_ROLES = ['ACCOUNTANT', 'SCHOOL_ADMIN', 'SCHOOL_MANAGER'];
const PROCUREMENT_PO_READ_ROLES = ['ACCOUNTANT', 'SCHOOL_ADMIN', 'SCHOOL_MANAGER'];

function mountProcurementRoutes(router, deps) {
  const {
    promisePool,
    appendAuditLog,
    requireRole,
    toMoney,
    resolveUserId,
    resolveSchoolId,
    notifyBudgetSchoolRoles,
  } = deps;

  let schemaReady = false;

  async function ensureProcurementSchema() {
    if (schemaReady) return;
    await promisePool.query(`
      CREATE TABLE IF NOT EXISTS procurement_requests (
        id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        school_id INT UNSIGNED NOT NULL,
        request_number VARCHAR(32) NOT NULL,
        request_date DATE NOT NULL,
        department VARCHAR(128) NOT NULL DEFAULT '',
        purpose TEXT NOT NULL,
        priority VARCHAR(16) NOT NULL DEFAULT 'normal',
        requested_by_user_id INT UNSIGNED NOT NULL,
        requested_by_name VARCHAR(128) NULL,
        reviewer_name VARCHAR(128) NULL DEFAULT 'Accountant',
        approver_name VARCHAR(128) NULL DEFAULT 'School Manager',
        status VARCHAR(32) NOT NULL DEFAULT 'draft',
        source_portal VARCHAR(32) NOT NULL DEFAULT 'teacher',
        total_items INT UNSIGNED NOT NULL DEFAULT 0,
        rejection_reason TEXT NULL,
        remarks TEXT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        submitted_at DATETIME NULL,
        reviewed_at DATETIME NULL,
        approved_at DATETIME NULL,
        UNIQUE KEY uq_proc_req_school_num (school_id, request_number),
        KEY idx_proc_req_school_status (school_id, status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    await promisePool.query(`
      CREATE TABLE IF NOT EXISTS procurement_request_items (
        id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        request_id INT UNSIGNED NOT NULL,
        item_name VARCHAR(255) NOT NULL,
        description TEXT NULL,
        quantity DECIMAL(14,2) NOT NULL DEFAULT 0,
        unit VARCHAR(32) NOT NULL DEFAULT 'pcs',
        notes TEXT NULL,
        inventory_item_id INT UNSIGNED NULL,
        sort_order INT UNSIGNED NOT NULL DEFAULT 0,
        KEY idx_proc_req_items_req (request_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    await promisePool.query(`
      CREATE TABLE IF NOT EXISTS procurement_requisitions (
        id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        school_id INT UNSIGNED NOT NULL,
        request_id INT UNSIGNED NOT NULL,
        requisition_number VARCHAR(32) NOT NULL,
        requisition_date DATE NOT NULL,
        purpose TEXT NULL,
        requested_by_name VARCHAR(128) NULL,
        subtotal DECIMAL(16,2) NOT NULL DEFAULT 0,
        grand_total DECIMAL(16,2) NOT NULL DEFAULT 0,
        amount_in_words TEXT NULL,
        remarks TEXT NULL,
        reviewed_by_name VARCHAR(128) NULL,
        approved_by_name VARCHAR(128) NULL,
        status VARCHAR(32) NOT NULL DEFAULT 'pending',
        rejection_reason TEXT NULL,
        created_by_user_id INT UNSIGNED NOT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        reviewed_at DATETIME NULL,
        approved_at DATETIME NULL,
        UNIQUE KEY uq_proc_reqn_school_num (school_id, requisition_number),
        KEY idx_proc_reqn_school_status (school_id, status),
        KEY idx_proc_reqn_request (request_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    await promisePool.query(`
      CREATE TABLE IF NOT EXISTS procurement_requisition_items (
        id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        requisition_id INT UNSIGNED NOT NULL,
        item_name VARCHAR(255) NOT NULL,
        description TEXT NULL,
        quantity DECIMAL(14,2) NOT NULL DEFAULT 0,
        unit VARCHAR(32) NOT NULL DEFAULT 'pcs',
        unit_price DECIMAL(16,2) NOT NULL DEFAULT 0,
        total DECIMAL(16,2) NOT NULL DEFAULT 0,
        notes TEXT NULL,
        sort_order INT UNSIGNED NOT NULL DEFAULT 0,
        KEY idx_proc_reqn_items_reqn (requisition_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    await promisePool.query(`
      CREATE TABLE IF NOT EXISTS procurement_purchase_orders (
        id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        school_id INT UNSIGNED NOT NULL,
        requisition_id INT UNSIGNED NOT NULL,
        po_number VARCHAR(32) NOT NULL,
        po_date DATE NOT NULL,
        supplier_id INT UNSIGNED NULL,
        supplier_name VARCHAR(255) NOT NULL,
        supplier_title VARCHAR(128) NULL,
        supplier_tin VARCHAR(64) NULL,
        supplier_phone VARCHAR(64) NULL,
        supplier_email VARCHAR(128) NULL,
        supplier_address TEXT NULL,
        purpose TEXT NULL,
        subtotal DECIMAL(16,2) NOT NULL DEFAULT 0,
        tax DECIMAL(16,2) NOT NULL DEFAULT 0,
        discount DECIMAL(16,2) NOT NULL DEFAULT 0,
        grand_total DECIMAL(16,2) NOT NULL DEFAULT 0,
        amount_in_words TEXT NULL,
        status VARCHAR(32) NOT NULL DEFAULT 'draft',
        prepared_by_name VARCHAR(128) NULL,
        verified_by_name VARCHAR(128) NULL,
        approved_by_name VARCHAR(128) NULL,
        created_by_user_id INT UNSIGNED NOT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        issued_at DATETIME NULL,
        UNIQUE KEY uq_proc_po_school_num (school_id, po_number),
        KEY idx_proc_po_school_status (school_id, status),
        KEY idx_proc_po_reqn (requisition_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    await promisePool.query(`
      CREATE TABLE IF NOT EXISTS procurement_po_items (
        id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        purchase_order_id INT UNSIGNED NOT NULL,
        item_name VARCHAR(255) NOT NULL,
        description TEXT NULL,
        quantity DECIMAL(14,2) NOT NULL DEFAULT 0,
        unit VARCHAR(32) NOT NULL DEFAULT 'pcs',
        unit_price DECIMAL(16,2) NOT NULL DEFAULT 0,
        amount DECIMAL(16,2) NOT NULL DEFAULT 0,
        sort_order INT UNSIGNED NOT NULL DEFAULT 0,
        KEY idx_proc_po_items_po (purchase_order_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    for (const stmt of [
      `ALTER TABLE procurement_purchase_orders ADD COLUMN requested_by_name VARCHAR(128) NULL`,
      `ALTER TABLE procurement_purchase_orders ADD COLUMN tax_enabled TINYINT NOT NULL DEFAULT 0`,
      `ALTER TABLE procurement_purchase_orders ADD COLUMN tax_percent DECIMAL(5,2) NOT NULL DEFAULT 0`,
      `ALTER TABLE procurement_purchase_orders ADD COLUMN discount_percent DECIMAL(5,2) NOT NULL DEFAULT 0`,
    ]) {
      try { await promisePool.query(stmt); } catch { /* column exists */ }
    }

    schemaReady = true;
  }

  async function nextNumber(schoolId, prefix, table, column) {
    const year = new Date().getFullYear();
    const pattern = `${prefix}-${year}-%`;
    const [[row]] = await promisePool.query(
      `SELECT ${column} AS num FROM ${table}
       WHERE school_id = ? AND ${column} LIKE ?
       ORDER BY id DESC LIMIT 1`,
      [schoolId, pattern]
    );
    let seq = 1;
    if (row?.num) {
      const parts = String(row.num).split('-');
      const last = Number(parts[parts.length - 1]);
      if (Number.isFinite(last)) seq = last + 1;
    }
    return `${prefix}-${year}-${String(seq).padStart(5, '0')}`;
  }

  async function fetchSchoolInfo(schoolId) {
    const [[school]] = await promisePool.query(
      `SELECT id, school_name, school_code, full_address, phone, email, website, logo_url,
              province, district, sector, postal_address, head_teacher_name, head_teacher_phone
       FROM schools WHERE id = ? LIMIT 1`,
      [schoolId]
    ).catch(() => [[null]]);
    if (!school) {
      return { id: schoolId, name: 'School', address: '', phone: '', email: '', logo_url: null };
    }
    return {
      id: school.id,
      name: school.school_name || 'School',
      school_name: school.school_name,
      school_code: school.school_code,
      address: school.full_address || '',
      full_address: school.full_address,
      phone: school.phone || '',
      email: school.email || '',
      website: school.website || '',
      logo_url: school.logo_url || null,
      province: school.province,
      district: school.district,
      sector: school.sector,
      postal_address: school.postal_address,
      head_teacher_name: school.head_teacher_name,
      head_teacher_phone: school.head_teacher_phone,
    };
  }

  async function fetchUserName(userId) {
    if (!userId) return null;
    const [[u]] = await promisePool.query(
      `SELECT COALESCE(NULLIF(TRIM(CONCAT(first_name,' ',last_name)),''), username, email) AS name
       FROM users WHERE id = ? LIMIT 1`,
      [userId]
    ).catch(() => [[null]]);
    return u?.name || null;
  }

  async function fetchSchoolRoleContacts(schoolId) {
    const school = await fetchSchoolInfo(schoolId);
    const [rows] = await promisePool.query(
      `SELECT r.role_code,
              COALESCE(NULLIF(TRIM(CONCAT(u.first_name,' ',u.last_name)),''), u.username, u.email) AS name
       FROM users u
       INNER JOIN roles r ON r.id = u.role_id
       WHERE u.school_id = ? AND u.deleted_at IS NULL
         AND r.role_code IN ('ACCOUNTANT', 'SCHOOL_MANAGER', 'SCHOOL_ADMIN')
       ORDER BY u.id ASC`,
      [schoolId]
    ).catch(() => [[]]);
    let accountantName = null;
    let managerName = null;
    for (const row of rows || []) {
      if (row.role_code === 'ACCOUNTANT' && !accountantName) accountantName = row.name;
      if (['SCHOOL_MANAGER', 'SCHOOL_ADMIN'].includes(row.role_code) && !managerName) managerName = row.name;
    }
    return {
      accountant_name: accountantName || 'Accountant',
      manager_name: managerName || school.head_teacher_name || 'School Manager',
      reviewer_name: accountantName || 'Accountant',
      approver_name: managerName || school.head_teacher_name || 'School Manager',
    };
  }

  function mapRequestRow(row, items = []) {
    return {
      db_id: row.id,
      id: row.request_number,
      request_number: row.request_number,
      request_date: row.request_date,
      department: row.department,
      purpose: row.purpose,
      priority: row.priority,
      requested_by: row.requested_by_name,
      requested_by_user_id: row.requested_by_user_id,
      reviewer: row.reviewer_name,
      reviewed_by: row.reviewer_name,
      approver: row.approver_name,
      approved_by: row.status === 'approved' ? row.approver_name : null,
      status: row.status,
      source_portal: row.source_portal,
      total_items: Number(row.total_items || items.length),
      rejection_reason: row.rejection_reason,
      remarks: row.remarks,
      items,
      submitted_at: row.submitted_at,
      reviewed_at: row.reviewed_at,
      approved_at: row.approved_at,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }

  function mapRequisitionRow(row, items = [], request = null) {
    return {
      db_id: row.id,
      id: row.requisition_number,
      requisition_number: row.requisition_number,
      requisition_date: row.requisition_date,
      request_id: row.request_id,
      request_number: request?.request_number || null,
      purpose: row.purpose,
      requested_by: row.requested_by_name,
      subtotal: Number(row.subtotal),
      grand_total: Number(row.grand_total),
      amount_in_words: row.amount_in_words,
      remarks: row.remarks,
      reviewed_by: row.reviewed_by_name,
      approved_by: row.approved_by_name,
      status: row.status,
      rejection_reason: row.rejection_reason,
      items,
      request,
      reviewed_at: row.reviewed_at,
      approved_at: row.approved_at,
      created_at: row.created_at,
    };
  }

  function mapPurchaseOrderRow(row, items = [], requisition = null) {
    return {
      db_id: row.id,
      id: row.po_number,
      po_number: row.po_number,
      po_date: row.po_date,
      requisition_id: row.requisition_id,
      requisition_number: requisition?.requisition_number || null,
      supplier_id: row.supplier_id,
      supplier_name: row.supplier_name,
      supplier_title: row.supplier_title,
      supplier_tin: row.supplier_tin,
      supplier_phone: row.supplier_phone,
      supplier_email: row.supplier_email,
      supplier_address: row.supplier_address,
      purpose: row.purpose,
      subtotal: Number(row.subtotal),
      tax: Number(row.tax),
      discount: Number(row.discount),
      grand_total: Number(row.grand_total),
      amount_in_words: row.amount_in_words,
      status: row.status,
      prepared_by: row.prepared_by_name,
      requested_by: row.requested_by_name || requisition?.requested_by_name || null,
      verified_by: row.verified_by_name || requisition?.reviewed_by_name || null,
      approved_by: row.approved_by_name || requisition?.approved_by_name || null,
      tax_enabled: Boolean(row.tax_enabled),
      tax_percent: Number(row.tax_percent || 0),
      discount_percent: Number(row.discount_percent || 0),
      items,
      requisition,
      issued_at: row.issued_at,
      created_at: row.created_at,
    };
  }

  async function loadRequestItems(requestId) {
    const [rows] = await promisePool.query(
      `SELECT * FROM procurement_request_items WHERE request_id = ? ORDER BY sort_order, id`,
      [requestId]
    );
    return rows.map((r) => ({
      id: r.id,
      item_name: r.item_name,
      description: r.description,
      quantity: Number(r.quantity),
      unit: r.unit,
      notes: r.notes,
      inventory_item_id: r.inventory_item_id,
    }));
  }

  async function loadRequisitionItems(requisitionId) {
    const [rows] = await promisePool.query(
      `SELECT * FROM procurement_requisition_items WHERE requisition_id = ? ORDER BY sort_order, id`,
      [requisitionId]
    );
    return rows.map((r) => ({
      id: r.id,
      item_name: r.item_name,
      description: r.description,
      quantity: Number(r.quantity),
      unit: r.unit,
      unit_price: Number(r.unit_price),
      total: Number(r.total),
      notes: r.notes,
    }));
  }

  async function loadPoItems(poId) {
    const [rows] = await promisePool.query(
      `SELECT * FROM procurement_po_items WHERE purchase_order_id = ? ORDER BY sort_order, id`,
      [poId]
    );
    return rows.map((r) => ({
      id: r.id,
      item_name: r.item_name,
      description: r.description,
      quantity: Number(r.quantity),
      unit: r.unit,
      unit_price: Number(r.unit_price),
      amount: Number(r.amount),
    }));
  }

  router.use('/procurement', async (req, res, next) => {
    try {
      await ensureProcurementSchema();
      next();
    } catch (e) {
      res.status(500).json({ success: false, message: e.message });
    }
  });

  // ── Stats ──────────────────────────────────────────────────────────────
  router.get('/procurement/stats', requireRole(PROCUREMENT_REQUEST_ROLES), async (req, res) => {
    try {
      const { schoolId } = req.ctx;
      const [reqStats] = await promisePool.query(
        `SELECT
           SUM(status = 'pending') AS pending,
           SUM(status = 'under_review') AS under_review,
           SUM(status = 'approved') AS approved,
           SUM(status = 'rejected') AS rejected,
           SUM(status = 'converted') AS converted,
           COUNT(*) AS total
         FROM procurement_requests WHERE school_id = ?`,
        [schoolId]
      );
      const [reqnStats] = await promisePool.query(
        `SELECT COUNT(*) AS total, SUM(grand_total) AS total_amount
         FROM procurement_requisitions WHERE school_id = ? AND status != 'rejected'`,
        [schoolId]
      );
      const [poStats] = await promisePool.query(
        `SELECT COUNT(*) AS total, SUM(grand_total) AS total_amount
         FROM procurement_purchase_orders WHERE school_id = ?`,
        [schoolId]
      );
      res.json({
        success: true,
        data: {
          requests: {
            pending: Number(reqStats[0]?.pending || 0),
            under_review: Number(reqStats[0]?.under_review || 0),
            approved: Number(reqStats[0]?.approved || 0),
            rejected: Number(reqStats[0]?.rejected || 0),
            converted: Number(reqStats[0]?.converted || 0),
            total: Number(reqStats[0]?.total || 0),
          },
          requisitions: {
            total: Number(reqnStats[0]?.total || 0),
            total_amount: Number(reqnStats[0]?.total_amount || 0),
          },
          purchase_orders: {
            total: Number(poStats[0]?.total || 0),
            total_amount: Number(poStats[0]?.total_amount || 0),
          },
        },
      });
    } catch (e) {
      res.status(500).json({ success: false, message: e.message });
    }
  });

  // ── School info for PDFs ───────────────────────────────────────────────
  router.get('/procurement/school-info', requireRole(PROCUREMENT_REQUEST_ROLES), async (req, res) => {
    try {
      const school = await fetchSchoolInfo(req.ctx.schoolId);
      const contacts = await fetchSchoolRoleContacts(req.ctx.schoolId);
      res.json({ success: true, data: { ...school, ...contacts } });
    } catch (e) {
      res.status(500).json({ success: false, message: e.message });
    }
  });

  // ── Suppliers (accountant can manage for PO) ─────────────────────────────
  router.get('/procurement/suppliers', requireRole(PROCUREMENT_ACCOUNTANT_ROLES), async (req, res) => {
    try {
      const [rows] = await promisePool.query(
        `SELECT id, name, contact_person, phone, email, tin, website, address, categories, status
         FROM store_suppliers
         WHERE school_id = ? AND deleted_at IS NULL
         ORDER BY name ASC`,
        [req.ctx.schoolId]
      );
      res.json({ success: true, data: rows });
    } catch (e) {
      res.status(500).json({ success: false, message: e.message });
    }
  });

  router.post('/procurement/suppliers', requireRole(PROCUREMENT_ACCOUNTANT_ROLES), async (req, res) => {
    try {
      const body = req.body || {};
      const name = String(body.name || '').trim();
      if (!name) return res.status(400).json({ success: false, message: 'name is required' });
      const [result] = await promisePool.query(
        `INSERT INTO store_suppliers
         (school_id, name, contact_person, phone, email, tin, website, address, categories, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')`,
        [
          req.ctx.schoolId,
          name,
          String(body.contact_person || body.title || '').trim() || null,
          String(body.phone || '').trim() || null,
          String(body.email || '').trim() || null,
          String(body.tin || '').trim() || null,
          String(body.website || '').trim() || null,
          String(body.address || '').trim() || null,
          String(body.categories || '').trim() || null,
        ]
      );
      res.status(201).json({
        success: true,
        data: {
          id: result.insertId,
          name,
          phone: body.phone || null,
          email: body.email || null,
          tin: body.tin || null,
          address: body.address || null,
        },
      });
    } catch (e) {
      res.status(500).json({ success: false, message: e.message });
    }
  });

  // ── Search inventory items ───────────────────────────────────────────────
  router.get('/procurement/inventory-search', requireRole(PROCUREMENT_REQUEST_ROLES), async (req, res) => {
    try {
      const q = String(req.query.q || '').trim();
      const { schoolId } = req.ctx;
      const like = `%${q}%`;
      const [rows] = await promisePool.query(
        `(SELECT id, name AS item_name, category, unit_type AS unit, 'inventory' AS source
          FROM store_inventory_items
          WHERE school_id = ? AND deleted_at IS NULL AND (? = '' OR name LIKE ?)
          LIMIT 20)
         UNION ALL
         (SELECT id, item_name, category, unit_type AS unit, 'food' AS source
          FROM store_food_stock_ins
          WHERE school_id = ? AND (? = '' OR item_name LIKE ?)
          GROUP BY item_name LIMIT 10)`,
        [schoolId, q, like, schoolId, q, like]
      ).catch(() => [[]]);
      res.json({ success: true, data: rows });
    } catch (e) {
      res.status(500).json({ success: false, message: e.message });
    }
  });

  // ── Purchase Requests ────────────────────────────────────────────────────
  router.get('/procurement/requests', requireRole(PROCUREMENT_REQUEST_ROLES), async (req, res) => {
    try {
      const { schoolId } = req.ctx;
      const status = String(req.query.status || '').trim();
      const portal = String(req.query.portal || '').trim();
      let sql = `SELECT * FROM procurement_requests WHERE school_id = ?`;
      const params = [schoolId];
      if (status) { sql += ` AND status = ?`; params.push(status); }
      if (portal) { sql += ` AND source_portal = ?`; params.push(portal); }
      sql += ` ORDER BY created_at DESC LIMIT 500`;
      const [rows] = await promisePool.query(sql, params);
      const data = await Promise.all(rows.map(async (r) => {
        const items = await loadRequestItems(r.id);
        return mapRequestRow(r, items);
      }));
      res.json({ success: true, data });
    } catch (e) {
      res.status(500).json({ success: false, message: e.message });
    }
  });

  router.get('/procurement/requests/:id', requireRole(PROCUREMENT_REQUEST_ROLES), async (req, res) => {
    try {
      const id = Number(req.params.id);
      const [[row]] = await promisePool.query(
        `SELECT * FROM procurement_requests WHERE id = ? AND school_id = ?`,
        [id, req.ctx.schoolId]
      );
      if (!row) return res.status(404).json({ success: false, message: 'Request not found' });
      const items = await loadRequestItems(row.id);
      res.json({ success: true, data: mapRequestRow(row, items) });
    } catch (e) {
      res.status(500).json({ success: false, message: e.message });
    }
  });

  router.post('/procurement/requests', requireRole(PROCUREMENT_REQUEST_ROLES), async (req, res) => {
    try {
      const { schoolId, userId } = req.ctx;
      const body = req.body || {};
      const items = Array.isArray(body.items) ? body.items : [];
      const isDraft = body.status === 'draft' || body.save_draft === true;
      const requestNumber = await nextNumber(schoolId, 'REQ', 'procurement_requests', 'request_number');
      const userName = body.requested_by || await fetchUserName(userId);
      const requestDate = body.request_date || new Date().toISOString().slice(0, 10);
      const contacts = await fetchSchoolRoleContacts(schoolId);

      const [result] = await promisePool.query(
        `INSERT INTO procurement_requests
         (school_id, request_number, request_date, department, purpose, priority,
          requested_by_user_id, requested_by_name, reviewer_name, approver_name,
          status, source_portal, total_items, remarks)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [
          schoolId, requestNumber, requestDate,
          String(body.department || '').trim(),
          String(body.purpose || '').trim() || 'General procurement',
          String(body.priority || 'normal').toLowerCase(),
          userId, userName,
          String(body.reviewer || contacts.reviewer_name).trim(),
          String(body.approver || contacts.approver_name).trim(),
          isDraft ? 'draft' : 'pending',
          String(body.source_portal || 'teacher').trim(),
          items.length,
          String(body.remarks || '').trim() || null,
        ]
      );
      const requestId = result.insertId;
      for (let i = 0; i < items.length; i++) {
        const it = items[i];
        await promisePool.query(
          `INSERT INTO procurement_request_items
           (request_id, item_name, description, quantity, unit, notes, inventory_item_id, sort_order)
           VALUES (?,?,?,?,?,?,?,?)`,
          [
            requestId,
            String(it.item_name || it.item || '').trim() || 'Item',
            String(it.description || '').trim() || null,
            toMoney(it.quantity ?? it.qty ?? 1),
            String(it.unit || 'pcs').trim(),
            String(it.notes || '').trim() || null,
            Number(it.inventory_item_id) > 0 ? Number(it.inventory_item_id) : null,
            i,
          ]
        );
      }
      if (!isDraft) {
        await promisePool.query(
          `UPDATE procurement_requests SET submitted_at = NOW() WHERE id = ?`,
          [requestId]
        );
        notifyBudgetSchoolRoles?.(schoolId, ['ACCOUNTANT'], {
          title: 'New Purchase Request',
          body: `${requestNumber} ready for requisition pricing`,
          url: '/accountant/requisition-orders',
        });
      }
      await appendAuditLog?.(req, 'procurement_request_create', { request_id: requestId, request_number: requestNumber });
      const itemsLoaded = await loadRequestItems(requestId);
      const [[row]] = await promisePool.query(`SELECT * FROM procurement_requests WHERE id = ?`, [requestId]);
      res.status(201).json({ success: true, data: mapRequestRow(row, itemsLoaded) });
    } catch (e) {
      res.status(500).json({ success: false, message: e.message });
    }
  });

  router.patch('/procurement/requests/:id', requireRole(PROCUREMENT_REQUEST_ROLES), async (req, res) => {
    try {
      const id = Number(req.params.id);
      const body = req.body || {};
      const [[existing]] = await promisePool.query(
        `SELECT * FROM procurement_requests WHERE id = ? AND school_id = ?`,
        [id, req.ctx.schoolId]
      );
      if (!existing) return res.status(404).json({ success: false, message: 'Request not found' });

      const status = body.status ? String(body.status) : existing.status;
      const updates = [];
      const params = [];
      if (body.purpose != null) { updates.push('purpose = ?'); params.push(String(body.purpose).trim()); }
      if (body.department != null) { updates.push('department = ?'); params.push(String(body.department).trim()); }
      if (body.priority != null) { updates.push('priority = ?'); params.push(String(body.priority).toLowerCase()); }
      if (body.remarks != null) { updates.push('remarks = ?'); params.push(String(body.remarks).trim() || null); }
      if (body.status != null) {
        updates.push('status = ?');
        params.push(status);
        if (status === 'pending') updates.push('submitted_at = NOW()');
        if (status === 'under_review') updates.push('reviewed_at = NOW()');
        if (status === 'approved') updates.push('approved_at = NOW()');
        if (status === 'rejected') {
          updates.push('rejection_reason = ?');
          params.push(String(body.rejection_reason || '').trim() || null);
        }
      }
      if (updates.length) {
        params.push(id);
        await promisePool.query(`UPDATE procurement_requests SET ${updates.join(', ')} WHERE id = ?`, params);
      }
      if (Array.isArray(body.items)) {
        await promisePool.query(`DELETE FROM procurement_request_items WHERE request_id = ?`, [id]);
        for (let i = 0; i < body.items.length; i++) {
          const it = body.items[i];
          await promisePool.query(
            `INSERT INTO procurement_request_items
             (request_id, item_name, description, quantity, unit, notes, inventory_item_id, sort_order)
             VALUES (?,?,?,?,?,?,?,?)`,
            [
              id,
              String(it.item_name || it.item || '').trim() || 'Item',
              String(it.description || '').trim() || null,
              toMoney(it.quantity ?? it.qty ?? 1),
              String(it.unit || 'pcs').trim(),
              String(it.notes || '').trim() || null,
              Number(it.inventory_item_id) > 0 ? Number(it.inventory_item_id) : null,
              i,
            ]
          );
        }
        await promisePool.query(
          `UPDATE procurement_requests SET total_items = ? WHERE id = ?`,
          [body.items.length, id]
        );
      }
      const items = await loadRequestItems(id);
      const [[row]] = await promisePool.query(`SELECT * FROM procurement_requests WHERE id = ?`, [id]);
      res.json({ success: true, data: mapRequestRow(row, items) });
    } catch (e) {
      res.status(500).json({ success: false, message: e.message });
    }
  });

  router.patch('/procurement/requests/:id/decision', requireRole(PROCUREMENT_MANAGER_ROLES), async (req, res) => {
    try {
      const id = Number(req.params.id);
      const decision = String(req.body?.decision || req.body?.status || '').toLowerCase();
      if (!['approved', 'rejected'].includes(decision)) {
        return res.status(400).json({ success: false, message: 'decision must be approved or rejected' });
      }
      const [[row]] = await promisePool.query(
        `SELECT * FROM procurement_requests WHERE id = ? AND school_id = ?`,
        [id, req.ctx.schoolId]
      );
      if (!row) return res.status(404).json({ success: false, message: 'Request not found' });
      if (!['pending', 'under_review'].includes(row.status)) {
        return res.status(400).json({ success: false, message: 'Request is not pending approval' });
      }
      const approverName = await fetchUserName(req.ctx.userId) || 'School Manager';
      if (decision === 'approved') {
        await promisePool.query(
          `UPDATE procurement_requests SET status = 'approved', approved_at = NOW(), approver_name = ? WHERE id = ?`,
          [approverName, id]
        );
        notifyBudgetSchoolRoles?.(req.ctx.schoolId, ['ACCOUNTANT'], {
          title: 'Purchase Request Approved',
          body: `${row.request_number} ready for requisition pricing`,
          url: '/accountant/requisition-orders',
        });
      } else {
        await promisePool.query(
          `UPDATE procurement_requests SET status = 'rejected', rejection_reason = ?, approved_at = NOW(), approver_name = ? WHERE id = ?`,
          [String(req.body.rejection_reason || '').trim() || null, approverName, id]
        );
      }
      const items = await loadRequestItems(id);
      const [[updated]] = await promisePool.query(`SELECT * FROM procurement_requests WHERE id = ?`, [id]);
      res.json({ success: true, data: mapRequestRow(updated, items) });
    } catch (e) {
      res.status(500).json({ success: false, message: e.message });
    }
  });

  router.post('/procurement/requests/:id/submit', requireRole(PROCUREMENT_REQUEST_ROLES), async (req, res) => {
    try {
      const id = Number(req.params.id);
      const [[row]] = await promisePool.query(
        `SELECT * FROM procurement_requests WHERE id = ? AND school_id = ?`,
        [id, req.ctx.schoolId]
      );
      if (!row) return res.status(404).json({ success: false, message: 'Request not found' });
      await promisePool.query(
        `UPDATE procurement_requests SET status = 'pending', submitted_at = NOW() WHERE id = ?`,
        [id]
      );
      notifyBudgetSchoolRoles?.(req.ctx.schoolId, ['ACCOUNTANT'], {
        title: 'Purchase Request Submitted',
        body: `${row.request_number} ready for requisition pricing`,
        url: '/accountant/requisition-orders',
      });
      const items = await loadRequestItems(id);
      const [[updated]] = await promisePool.query(`SELECT * FROM procurement_requests WHERE id = ?`, [id]);
      res.json({ success: true, data: mapRequestRow(updated, items) });
    } catch (e) {
      res.status(500).json({ success: false, message: e.message });
    }
  });

  // ── Requisitions (Accountant) ────────────────────────────────────────────
  router.get('/procurement/requisitions', requireRole(PROCUREMENT_REQUISITION_READ_ROLES), async (req, res) => {
    try {
      const { schoolId } = req.ctx;
      const status = String(req.query.status || '').trim();
      let sql = `SELECT * FROM procurement_requisitions WHERE school_id = ?`;
      const params = [schoolId];
      if (status) { sql += ` AND status = ?`; params.push(status); }
      sql += ` ORDER BY created_at DESC LIMIT 500`;
      const [rows] = await promisePool.query(sql, params);
      const data = await Promise.all(rows.map(async (r) => {
        const items = await loadRequisitionItems(r.id);
        const [[reqRow]] = await promisePool.query(
          `SELECT request_number FROM procurement_requests WHERE id = ?`,
          [r.request_id]
        );
        return mapRequisitionRow(r, items, reqRow ? { request_number: reqRow.request_number } : null);
      }));
      res.json({ success: true, data });
    } catch (e) {
      res.status(500).json({ success: false, message: e.message });
    }
  });

  router.get('/procurement/requisitions/:id', requireRole(PROCUREMENT_ACCOUNTANT_ROLES), async (req, res) => {
    try {
      const id = Number(req.params.id);
      const [[row]] = await promisePool.query(
        `SELECT * FROM procurement_requisitions WHERE id = ? AND school_id = ?`,
        [id, req.ctx.schoolId]
      );
      if (!row) return res.status(404).json({ success: false, message: 'Requisition not found' });
      const items = await loadRequisitionItems(row.id);
      const [[reqRow]] = await promisePool.query(`SELECT * FROM procurement_requests WHERE id = ?`, [row.request_id]);
      const reqItems = reqRow ? await loadRequestItems(reqRow.id) : [];
      res.json({
        success: true,
        data: mapRequisitionRow(row, items, reqRow ? mapRequestRow(reqRow, reqItems) : null),
      });
    } catch (e) {
      res.status(500).json({ success: false, message: e.message });
    }
  });

  router.post('/procurement/requisitions', requireRole(PROCUREMENT_ACCOUNTANT_ROLES), async (req, res) => {
    try {
      const { schoolId, userId } = req.ctx;
      const body = req.body || {};
      const requestId = Number(body.request_id);
      if (!requestId) return res.status(400).json({ success: false, message: 'request_id required' });

      const [[reqRow]] = await promisePool.query(
        `SELECT * FROM procurement_requests WHERE id = ? AND school_id = ?`,
        [requestId, schoolId]
      );
      if (!reqRow) return res.status(404).json({ success: false, message: 'Request not found' });
      if (!['pending', 'under_review'].includes(reqRow.status)) {
        return res.status(400).json({ success: false, message: 'Request is not available for requisition' });
      }

      const items = Array.isArray(body.items) ? body.items : await loadRequestItems(requestId);
      let subtotal = 0;
      const pricedItems = items.map((it, i) => {
        const qty = toMoney(it.quantity ?? it.qty ?? 1);
        const unitPrice = toMoney(it.unit_price ?? it.unitPrice ?? 0);
        const total = qty * unitPrice;
        subtotal += total;
        return { ...it, quantity: qty, unit_price: unitPrice, total, sort_order: i };
      });
      const grandTotal = subtotal;
      const reqnNumber = await nextNumber(schoolId, 'RQN', 'procurement_requisitions', 'requisition_number');
      const reviewerName = body.reviewed_by || await fetchUserName(userId);

      const [result] = await promisePool.query(
        `INSERT INTO procurement_requisitions
         (school_id, request_id, requisition_number, requisition_date, purpose, requested_by_name,
          subtotal, grand_total, amount_in_words, remarks, reviewed_by_name, status, created_by_user_id)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [
          schoolId, requestId, reqnNumber,
          body.requisition_date || new Date().toISOString().slice(0, 10),
          String(body.purpose || reqRow.purpose).trim(),
          reqRow.requested_by_name,
          subtotal, grandTotal,
          String(body.amount_in_words || '').trim() || null,
          String(body.remarks || '').trim() || null,
          reviewerName,
          'pending',
          userId,
        ]
      );
      const reqnId = result.insertId;
      for (const it of pricedItems) {
        await promisePool.query(
          `INSERT INTO procurement_requisition_items
           (requisition_id, item_name, description, quantity, unit, unit_price, total, notes, sort_order)
           VALUES (?,?,?,?,?,?,?,?,?)`,
          [
            reqnId,
            String(it.item_name || it.item || '').trim(),
            String(it.description || '').trim() || null,
            it.quantity,
            String(it.unit || 'pcs').trim(),
            it.unit_price,
            it.total,
            String(it.notes || '').trim() || null,
            it.sort_order,
          ]
        );
      }
      await promisePool.query(
        `UPDATE procurement_requests SET status = 'converted', reviewed_at = NOW(), reviewer_name = COALESCE(?, reviewer_name) WHERE id = ?`,
        [reviewerName, requestId]
      );
      notifyBudgetSchoolRoles?.(schoolId, PROCUREMENT_MANAGER_ROLES, {
        title: 'Requisition Pending Approval',
        body: `${reqnNumber} requires manager approval`,
        url: '/manager/procurement-approvals',
      });
      const itemsLoaded = await loadRequisitionItems(reqnId);
      const [[row]] = await promisePool.query(`SELECT * FROM procurement_requisitions WHERE id = ?`, [reqnId]);
      res.status(201).json({ success: true, data: mapRequisitionRow(row, itemsLoaded, mapRequestRow(reqRow, items)) });
    } catch (e) {
      res.status(500).json({ success: false, message: e.message });
    }
  });

  router.patch('/procurement/requisitions/:id/status', requireRole(PROCUREMENT_MANAGER_ROLES), async (req, res) => {
    try {
      const id = Number(req.params.id);
      const status = String(req.body?.status || '').toLowerCase();
      const [[row]] = await promisePool.query(
        `SELECT * FROM procurement_requisitions WHERE id = ? AND school_id = ?`,
        [id, req.ctx.schoolId]
      );
      if (!row) return res.status(404).json({ success: false, message: 'Requisition not found' });

      const updates = ['status = ?'];
      const params = [status];
      if (status === 'approved') {
        updates.push('approved_at = NOW()');
        updates.push('approved_by_name = ?');
        params.push(String(req.body.approved_by || await fetchUserName(req.ctx.userId) || 'School Manager'));
        updates.push('reviewed_at = COALESCE(reviewed_at, NOW())');
      }
      if (status === 'rejected') {
        updates.push('rejection_reason = ?');
        params.push(String(req.body.rejection_reason || '').trim() || null);
      }
      params.push(id);
      await promisePool.query(`UPDATE procurement_requisitions SET ${updates.join(', ')} WHERE id = ?`, params);

      if (status === 'approved') {
        notifyBudgetSchoolRoles?.(req.ctx.schoolId, ['ACCOUNTANT'], {
          title: 'Requisition Approved',
          body: `${row.requisition_number} ready for Purchase Order`,
          url: '/accountant/purchase-orders',
        });
      }
      const items = await loadRequisitionItems(id);
      const [[updated]] = await promisePool.query(`SELECT * FROM procurement_requisitions WHERE id = ?`, [id]);
      res.json({ success: true, data: mapRequisitionRow(updated, items) });
    } catch (e) {
      res.status(500).json({ success: false, message: e.message });
    }
  });

  // ── Purchase Orders (Accountant) ───────────────────────────────────────
  router.get('/procurement/purchase-orders', requireRole(PROCUREMENT_PO_READ_ROLES), async (req, res) => {
    try {
      const { schoolId } = req.ctx;
      const [rows] = await promisePool.query(
        `SELECT * FROM procurement_purchase_orders WHERE school_id = ? ORDER BY created_at DESC LIMIT 500`,
        [schoolId]
      );
      const data = await Promise.all(rows.map(async (r) => {
        const items = await loadPoItems(r.id);
        const [[reqn]] = await promisePool.query(
          `SELECT * FROM procurement_requisitions WHERE id = ?`,
          [r.requisition_id]
        );
        return mapPurchaseOrderRow(r, items, reqn || null);
      }));
      res.json({ success: true, data });
    } catch (e) {
      res.status(500).json({ success: false, message: e.message });
    }
  });

  router.get('/procurement/purchase-orders/:id', requireRole(PROCUREMENT_ACCOUNTANT_ROLES), async (req, res) => {
    try {
      const id = Number(req.params.id);
      const [[row]] = await promisePool.query(
        `SELECT * FROM procurement_purchase_orders WHERE id = ? AND school_id = ?`,
        [id, req.ctx.schoolId]
      );
      if (!row) return res.status(404).json({ success: false, message: 'PO not found' });
      const items = await loadPoItems(row.id);
      const [[reqn]] = await promisePool.query(`SELECT * FROM procurement_requisitions WHERE id = ?`, [row.requisition_id]);
      res.json({ success: true, data: mapPurchaseOrderRow(row, items, reqn) });
    } catch (e) {
      res.status(500).json({ success: false, message: e.message });
    }
  });

  router.post('/procurement/purchase-orders', requireRole(PROCUREMENT_ACCOUNTANT_ROLES), async (req, res) => {
    try {
      const { schoolId, userId } = req.ctx;
      const body = req.body || {};
      const requisitionId = Number(body.requisition_id);
      if (!requisitionId) return res.status(400).json({ success: false, message: 'requisition_id required' });

      const [[reqn]] = await promisePool.query(
        `SELECT * FROM procurement_requisitions WHERE id = ? AND school_id = ? AND status = 'approved'`,
        [requisitionId, schoolId]
      );
      if (!reqn) return res.status(400).json({ success: false, message: 'Approved requisition required' });

      const reqnItems = await loadRequisitionItems(requisitionId);
      const poNumber = await nextNumber(schoolId, 'PO', 'procurement_purchase_orders', 'po_number');
      const subtotal = toMoney(body.subtotal ?? reqn.subtotal);
      const taxEnabled = body.tax_enabled === true || body.tax_enabled === 1 || body.tax_enabled === '1';
      const taxPercent = taxEnabled ? toMoney(body.tax_percent ?? 18) : 0;
      const discountPercent = toMoney(body.discount_percent ?? 0);
      const tax = taxEnabled ? toMoney(body.tax ?? (subtotal * taxPercent / 100)) : 0;
      const discount = toMoney(body.discount ?? (subtotal * discountPercent / 100));
      const grandTotal = toMoney(body.grand_total ?? subtotal + tax - discount);
      const accountantName = String(body.verified_by || reqn.reviewed_by_name || await fetchUserName(userId) || 'Accountant').trim();
      const managerName = String(body.approved_by || reqn.approved_by_name || 'School Manager').trim();
      const requestedBy = String(body.requested_by || reqn.requested_by_name || '').trim() || null;

      const [result] = await promisePool.query(
        `INSERT INTO procurement_purchase_orders
         (school_id, requisition_id, po_number, po_date, supplier_id, supplier_name, supplier_title,
          supplier_tin, supplier_phone, supplier_email, supplier_address, purpose,
          subtotal, tax, discount, grand_total, amount_in_words, status,
          prepared_by_name, verified_by_name, approved_by_name, requested_by_name,
          tax_enabled, tax_percent, discount_percent, created_by_user_id, issued_at)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,NOW())`,
        [
          schoolId, requisitionId, poNumber,
          body.po_date || new Date().toISOString().slice(0, 10),
          Number(body.supplier_id) > 0 ? Number(body.supplier_id) : null,
          String(body.supplier_name || '').trim() || 'Supplier',
          String(body.supplier_title || '').trim() || null,
          String(body.supplier_tin || '').trim() || null,
          String(body.supplier_phone || '').trim() || null,
          String(body.supplier_email || '').trim() || null,
          String(body.supplier_address || '').trim() || null,
          String(body.purpose || reqn.purpose).trim(),
          subtotal, tax, discount, grandTotal,
          String(body.amount_in_words || '').trim() || null,
          'issued',
          accountantName,
          accountantName,
          managerName,
          requestedBy,
          taxEnabled ? 1 : 0,
          taxPercent,
          discountPercent,
          userId,
        ]
      );
      const poId = result.insertId;
      const poItems = Array.isArray(body.items) && body.items.length ? body.items : reqnItems;
      for (let i = 0; i < poItems.length; i++) {
        const it = poItems[i];
        const qty = toMoney(it.quantity ?? it.qty ?? 1);
        const unitPrice = toMoney(it.unit_price ?? it.unitPrice ?? 0);
        const amount = toMoney(it.amount ?? it.total ?? qty * unitPrice);
        await promisePool.query(
          `INSERT INTO procurement_po_items
           (purchase_order_id, item_name, description, quantity, unit, unit_price, amount, sort_order)
           VALUES (?,?,?,?,?,?,?,?)`,
          [
            poId,
            String(it.item_name || it.item || '').trim(),
            String(it.description || '').trim() || null,
            qty,
            String(it.unit || 'pcs').trim(),
            unitPrice,
            amount,
            i,
          ]
        );
      }
      await appendAuditLog?.(req, 'procurement_po_create', { po_id: poId, po_number: poNumber });
      const itemsLoaded = await loadPoItems(poId);
      const [[row]] = await promisePool.query(`SELECT * FROM procurement_purchase_orders WHERE id = ?`, [poId]);
      res.status(201).json({ success: true, data: mapPurchaseOrderRow(row, itemsLoaded, reqn) });
    } catch (e) {
      res.status(500).json({ success: false, message: e.message });
    }
  });
}

module.exports = { mountProcurementRoutes, PROCUREMENT_REQUEST_ROLES, PROCUREMENT_ACCOUNTANT_ROLES };
