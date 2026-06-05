'use strict';

/**
 * Storekeeper — student school requirements lists and per-student fulfillment.
 */
module.exports = function registerStoreStudentRequirementsRoutes(router, deps) {
  const { promisePool, appendAuditLog, STORE_READ_ROLES, STORE_WRITE_ROLES, requireRole } = deps;

  function trimStr(v) {
    return String(v || '').trim();
  }

  async function ensureTables() {
    await promisePool.query(`
      CREATE TABLE IF NOT EXISTS store_student_requirement_lists (
        id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        school_id INT UNSIGNED NOT NULL,
        academic_year VARCHAR(64) NULL,
        term VARCHAR(32) NULL,
        class_name VARCHAR(120) NOT NULL,
        title VARCHAR(255) NULL,
        deleted_at DATETIME NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uq_store_req_list (school_id, academic_year, term, class_name),
        KEY idx_store_req_list_school (school_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await promisePool.query(`
      CREATE TABLE IF NOT EXISTS store_student_requirement_items (
        id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        list_id INT UNSIGNED NOT NULL,
        school_id INT UNSIGNED NOT NULL,
        catalog_requirement_id INT UNSIGNED NULL,
        name VARCHAR(300) NOT NULL,
        required_qty DECIMAL(10,2) NOT NULL DEFAULT 1,
        sort_order INT NOT NULL DEFAULT 0,
        deleted_at DATETIME NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        KEY idx_store_req_items_list (list_id),
        KEY idx_store_req_items_school (school_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await promisePool.query(`
      CREATE TABLE IF NOT EXISTS store_student_requirement_fulfillment (
        id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        list_id INT UNSIGNED NOT NULL,
        school_id INT UNSIGNED NOT NULL,
        student_id INT UNSIGNED NOT NULL,
        requirement_item_id INT UNSIGNED NOT NULL,
        submitted_qty DECIMAL(10,2) NOT NULL DEFAULT 0,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uq_store_req_fulfill (list_id, student_id, requirement_item_id),
        KEY idx_store_req_fulfill_school (school_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  }

  async function listClasses(schoolId, academicYear) {
    const params = [schoolId];
    let where = 'school_id = ? AND TRIM(COALESCE(class_name, "")) <> ""';
    if (trimStr(academicYear)) {
      where += ' AND TRIM(COALESCE(academic_year, "")) = ?';
      params.push(trimStr(academicYear));
    }
    const [rows] = await promisePool.query(
      `SELECT TRIM(class_name) AS class_name, COUNT(*) AS count
       FROM students WHERE ${where}
       GROUP BY TRIM(class_name) ORDER BY TRIM(class_name)`,
      params
    );
    return rows.map((r) => ({ class_name: r.class_name, count: Number(r.count || 0) }));
  }

  async function listStudents(schoolId, { className, academicYear, q }) {
    const cls = trimStr(className);
    if (!cls) return [];
    const params = [schoolId, cls];
    let sql = `
      SELECT id, student_uid, student_code, first_name, last_name, gender,
             TRIM(class_name) AS class_name, academic_year
      FROM students
      WHERE school_id = ? AND TRIM(COALESCE(class_name, '')) = ?
    `;
    if (trimStr(academicYear)) {
      sql += ' AND TRIM(COALESCE(academic_year, "")) = ?';
      params.push(trimStr(academicYear));
    }
    const search = trimStr(q);
    if (search) {
      sql += ` AND (student_uid LIKE ? OR student_code LIKE ? OR first_name LIKE ? OR last_name LIKE ?
                OR CONCAT(first_name,' ',last_name) LIKE ?)`;
      const like = `%${search}%`;
      params.push(like, like, like, like, like);
    }
    sql += ' ORDER BY student_uid ASC, last_name ASC LIMIT 500';
    const [rows] = await promisePool.query(sql, params);
    return rows.map((r) => ({
      id: r.id,
      student_uid: r.student_uid || r.student_code || String(r.id),
      student_code: r.student_code,
      first_name: r.first_name,
      last_name: r.last_name,
      name: `${r.first_name || ''} ${r.last_name || ''}`.trim(),
      gender: r.gender,
      class_name: r.class_name,
      academic_year: r.academic_year,
    }));
  }

  async function loadCatalog() {
    try {
      const [rows] = await promisePool.query(
        `SELECT id, name, description, quantity, default_price
         FROM student_requirements ORDER BY id ASC`
      );
      return rows.map((r) => ({
        id: r.id,
        name: r.name,
        description: r.description || '',
        quantity: r.quantity || '',
        default_price: r.default_price != null ? Number(r.default_price) : null,
      }));
    } catch {
      const [rows] = await promisePool.query(`SELECT id, name FROM student_requirements ORDER BY id ASC`);
      return (rows || []).map((r) => ({
        id: r.id,
        name: r.name,
        description: '',
        quantity: '',
        default_price: null,
      }));
    }
  }

  async function getOrCreateList(schoolId, { academicYear, term, className }, conn) {
    const pool = conn || promisePool;
    const year = trimStr(academicYear) || null;
    const termVal = trimStr(term) || null;
    const cls = trimStr(className);
    if (!cls) return null;

    const [[existing]] = await pool.query(
      `SELECT * FROM store_student_requirement_lists
       WHERE school_id = ? AND class_name = ?
         AND COALESCE(academic_year, '') = COALESCE(?, '')
         AND COALESCE(term, '') = COALESCE(?, '')
         AND deleted_at IS NULL LIMIT 1`,
      [schoolId, cls, year, termVal]
    );
    if (existing) return existing;

    const [ins] = await pool.query(
      `INSERT INTO store_student_requirement_lists
       (school_id, academic_year, term, class_name, title)
       VALUES (?, ?, ?, ?, ?)`,
      [schoolId, year, termVal, cls, `${cls} requirements`]
    );
    const [[created]] = await pool.query(
      `SELECT * FROM store_student_requirement_lists WHERE id = ? AND school_id = ? LIMIT 1`,
      [ins.insertId, schoolId]
    );
    return created;
  }

  async function loadBoard(schoolId, filters) {
    await ensureTables();
    const academicYear = trimStr(filters.academic_year);
    const term = trimStr(filters.term);
    const className = trimStr(filters.class_name);
    if (!className) {
      return { list: null, requirements: [], students: [], fulfillment: {} };
    }

    const list = await getOrCreateList(schoolId, { academicYear, term, className });
    if (!list) {
      return { list: null, requirements: [], students: [], fulfillment: {} };
    }

    const [items] = await promisePool.query(
      `SELECT id, catalog_requirement_id, name, required_qty, sort_order
       FROM store_student_requirement_items
       WHERE list_id = ? AND school_id = ? AND deleted_at IS NULL
       ORDER BY sort_order ASC, id ASC`,
      [list.id, schoolId]
    );

    const students = await listStudents(schoolId, { className, academicYear });

    const fulfillment = {};
    if (items.length && students.length) {
      const [rows] = await promisePool.query(
        `SELECT student_id, requirement_item_id, submitted_qty
         FROM store_student_requirement_fulfillment
         WHERE list_id = ? AND school_id = ?`,
        [list.id, schoolId]
      );
      for (const row of rows) {
        fulfillment[`${row.student_id}-${row.requirement_item_id}`] = {
          submitted: Number(row.submitted_qty || 0),
        };
      }
    }

    for (const st of students) {
      for (const req of items) {
        const key = `${st.id}-${req.id}`;
        if (!fulfillment[key]) {
          fulfillment[key] = { submitted: 0, required: Number(req.required_qty || 0) };
        } else {
          fulfillment[key].required = Number(req.required_qty || 0);
        }
      }
    }

    return {
      list: {
        id: list.id,
        academic_year: list.academic_year,
        term: list.term,
        class_name: list.class_name,
        title: list.title,
      },
      requirements: items.map((r) => ({
        id: r.id,
        catalog_requirement_id: r.catalog_requirement_id,
        name: r.name,
        requiredQty: Number(r.required_qty || 0),
      })),
      students,
      fulfillment,
    };
  }

  router.get('/store/student-requirements/classes', requireRole(STORE_READ_ROLES), async (req, res) => {
    try {
      await ensureTables();
      const { schoolId } = req.ctx;
      const academicYear = trimStr(req.query.academic_year || '');
      const classes = await listClasses(schoolId, academicYear);
      res.json({ success: true, data: classes });
    } catch (e) {
      console.error('[store/student-requirements/classes]:', e.message);
      res.status(500).json({ success: false, message: 'Failed to load classes' });
    }
  });

  router.get('/store/student-requirements/students', requireRole(STORE_READ_ROLES), async (req, res) => {
    try {
      await ensureTables();
      const { schoolId } = req.ctx;
      const className = trimStr(req.query.class_name || '');
      if (!className) return res.status(400).json({ success: false, message: 'class_name is required' });
      const students = await listStudents(schoolId, {
        className,
        academicYear: trimStr(req.query.academic_year || ''),
        q: trimStr(req.query.q || ''),
      });
      res.json({ success: true, data: students });
    } catch (e) {
      console.error('[store/student-requirements/students]:', e.message);
      res.status(500).json({ success: false, message: 'Failed to load students' });
    }
  });

  router.get('/store/student-requirements/catalog', requireRole(STORE_READ_ROLES), async (req, res) => {
    try {
      await ensureTables();
      const catalog = await loadCatalog();
      res.json({ success: true, data: catalog });
    } catch (e) {
      console.error('[store/student-requirements/catalog]:', e.message);
      res.status(500).json({ success: false, message: 'Failed to load requirement catalog' });
    }
  });

  router.get('/store/student-requirements/board', requireRole(STORE_READ_ROLES), async (req, res) => {
    try {
      const { schoolId } = req.ctx;
      const board = await loadBoard(schoolId, req.query);
      res.json({ success: true, data: board });
    } catch (e) {
      console.error('[store/student-requirements/board]:', e.message);
      res.status(500).json({ success: false, message: 'Failed to load requirements board' });
    }
  });

  router.put('/store/student-requirements/items', requireRole(STORE_WRITE_ROLES), async (req, res) => {
    const conn = await promisePool.getConnection();
    try {
      await ensureTables();
      const { schoolId, userId, roleCode } = req.ctx;
      const academicYear = trimStr(req.body.academic_year);
      const term = trimStr(req.body.term);
      const className = trimStr(req.body.class_name);
      const items = Array.isArray(req.body.items) ? req.body.items : [];
      if (!className) return res.status(400).json({ success: false, message: 'class_name is required' });

      await conn.beginTransaction();
      const list = await getOrCreateList(schoolId, { academicYear, term, className }, conn);
      if (!list) {
        await conn.rollback();
        return res.status(400).json({ success: false, message: 'Could not create requirement list' });
      }

      await conn.query(
        `UPDATE store_student_requirement_items SET deleted_at = NOW()
         WHERE list_id = ? AND school_id = ? AND deleted_at IS NULL`,
        [list.id, schoolId]
      );

      const saved = [];
      let order = 0;
      for (const raw of items) {
        const name = trimStr(raw.name);
        if (!name) continue;
        const requiredQty = Math.max(0, Number(raw.required_qty ?? raw.requiredQty) || 0) || 1;
        const catalogId = Number(raw.catalog_requirement_id ?? raw.catalogRequirementId);
        const [ins] = await conn.query(
          `INSERT INTO store_student_requirement_items
           (list_id, school_id, catalog_requirement_id, name, required_qty, sort_order)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [
            list.id,
            schoolId,
            Number.isFinite(catalogId) && catalogId > 0 ? catalogId : null,
            name,
            requiredQty,
            order++,
          ]
        );
        saved.push({
          id: ins.insertId,
          name,
          requiredQty,
          catalog_requirement_id: Number.isFinite(catalogId) && catalogId > 0 ? catalogId : null,
        });
      }

      await conn.commit();
      await appendAuditLog({
        schoolId,
        userId,
        roleCode,
        action: 'store_student_requirements_save_items',
        entityType: 'store_student_requirement_list',
        entityId: list.id,
        afterState: { class_name: className, item_count: saved.length },
      });

      const board = await loadBoard(schoolId, { academic_year: academicYear, term, class_name: className });
      res.json({ success: true, data: board });
    } catch (e) {
      await conn.rollback();
      console.error('[store/student-requirements/items PUT]:', e.message);
      res.status(500).json({ success: false, message: 'Failed to save requirements' });
    } finally {
      conn.release();
    }
  });

  router.patch('/store/student-requirements/fulfillment', requireRole(STORE_WRITE_ROLES), async (req, res) => {
    try {
      await ensureTables();
      const { schoolId, userId, roleCode } = req.ctx;
      const academicYear = trimStr(req.body.academic_year);
      const term = trimStr(req.body.term);
      const className = trimStr(req.body.class_name);
      const studentId = Number(req.body.student_id);
      const requirementItemId = Number(req.body.requirement_item_id);
      const submittedQty = Math.max(0, Number(req.body.submitted_qty ?? req.body.submitted) || 0);

      if (!className) return res.status(400).json({ success: false, message: 'class_name is required' });
      if (!studentId) return res.status(400).json({ success: false, message: 'student_id is required' });
      if (!requirementItemId) return res.status(400).json({ success: false, message: 'requirement_item_id is required' });

      const list = await getOrCreateList(schoolId, { academicYear, term, className });
      if (!list) return res.status(404).json({ success: false, message: 'Requirement list not found' });

      const [[item]] = await promisePool.query(
        `SELECT id, required_qty FROM store_student_requirement_items
         WHERE id = ? AND list_id = ? AND school_id = ? AND deleted_at IS NULL LIMIT 1`,
        [requirementItemId, list.id, schoolId]
      );
      if (!item) return res.status(404).json({ success: false, message: 'Requirement item not found' });

      const capped = Math.min(submittedQty, Number(item.required_qty || 0));

      await promisePool.query(
        `INSERT INTO store_student_requirement_fulfillment
         (list_id, school_id, student_id, requirement_item_id, submitted_qty)
         VALUES (?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE submitted_qty = VALUES(submitted_qty), updated_at = NOW()`,
        [list.id, schoolId, studentId, requirementItemId, capped]
      );

      await appendAuditLog({
        schoolId,
        userId,
        roleCode,
        action: 'store_student_requirements_fulfillment',
        entityType: 'store_student_requirement_fulfillment',
        entityId: requirementItemId,
        afterState: { student_id: studentId, submitted_qty: capped },
      });

      res.json({
        success: true,
        data: {
          student_id: studentId,
          requirement_item_id: requirementItemId,
          submitted: capped,
          required: Number(item.required_qty || 0),
        },
      });
    } catch (e) {
      console.error('[store/student-requirements/fulfillment PATCH]:', e.message);
      res.status(500).json({ success: false, message: 'Failed to update fulfillment' });
    }
  });
};
