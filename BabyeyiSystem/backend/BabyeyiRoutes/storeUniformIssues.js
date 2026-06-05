'use strict';

/**
 * Store uniform distribution (issue) — students, stock OUT, billing charges.
 */
module.exports = function registerStoreUniformRoutes(router, deps) {
  const { promisePool, toMoney, appendAuditLog, STORE_READ_ROLES, STORE_WRITE_ROLES, requireRole } = deps;

  function trimStr(v) {
    return String(v || '').trim();
  }

  function issueYearPart(academicYear) {
    const y = trimStr(academicYear);
    if (!y) return String(new Date().getFullYear());
    if (/^\d{4}-\d{4}$/.test(y)) return y.split('-')[0];
    if (/^\d{4}$/.test(y)) return y;
    const m = y.match(/(\d{4})/);
    return m ? m[1] : String(new Date().getFullYear());
  }

  async function nextIssueNo(schoolId, academicYear, conn) {
    const pool = conn || promisePool;
    const prefix = `UI-${issueYearPart(academicYear)}-`;
    const [[row]] = await pool.query(
      `SELECT issue_no FROM store_uniform_issues
       WHERE school_id = ? AND issue_no LIKE ? AND deleted_at IS NULL
       ORDER BY id DESC LIMIT 1`,
      [schoolId, `${prefix}%`]
    );
    let seq = 1;
    if (row?.issue_no) {
      const m = String(row.issue_no).match(/(\d+)$/);
      if (m) seq = parseInt(m[1], 10) + 1;
    }
    return `${prefix}${String(seq).padStart(4, '0')}`;
  }

  async function loadClassStats(schoolId, className, academicYear) {
    const params = [schoolId];
    let where = 'school_id = ?';
    if (trimStr(className)) {
      where += ' AND TRIM(COALESCE(class_name, "")) = ?';
      params.push(trimStr(className));
    }
    if (trimStr(academicYear)) {
      where += ' AND TRIM(COALESCE(academic_year, "")) = ?';
      params.push(trimStr(academicYear));
    }
    const [[row]] = await promisePool.query(
      `SELECT COUNT(*) AS total,
              SUM(CASE WHEN gender = 'Male' THEN 1 ELSE 0 END) AS male,
              SUM(CASE WHEN gender = 'Female' THEN 1 ELSE 0 END) AS female
       FROM students WHERE ${where}`,
      params
    );
    return {
      total: Number(row?.total || 0),
      male: Number(row?.male || 0),
      female: Number(row?.female || 0),
    };
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

  // GET /store/uniform-issues/classes
  router.get('/store/uniform-issues/classes', requireRole(STORE_READ_ROLES), async (req, res) => {
    try {
      const { schoolId } = req.ctx;
      const academicYear = trimStr(req.query.academic_year || '');
      const classes = await listClasses(schoolId, academicYear);
      res.json({ success: true, data: classes });
    } catch (e) {
      console.error('[store/uniform-issues/classes]:', e.message);
      res.status(500).json({ success: false, message: 'Failed to load classes' });
    }
  });

  // GET /store/uniform-issues/class-stats
  router.get('/store/uniform-issues/class-stats', requireRole(STORE_READ_ROLES), async (req, res) => {
    try {
      const { schoolId } = req.ctx;
      const className = trimStr(req.query.class_name || '');
      const academicYear = trimStr(req.query.academic_year || '');
      if (!className) return res.status(400).json({ success: false, message: 'class_name is required' });
      const stats = await loadClassStats(schoolId, className, academicYear);
      res.json({ success: true, data: stats });
    } catch (e) {
      console.error('[store/uniform-issues/class-stats]:', e.message);
      res.status(500).json({ success: false, message: 'Failed to load class stats' });
    }
  });

  // GET /store/uniform-issues/students
  router.get('/store/uniform-issues/students', requireRole(STORE_READ_ROLES), async (req, res) => {
    try {
      const { schoolId } = req.ctx;
      const className = trimStr(req.query.class_name || '');
      const academicYear = trimStr(req.query.academic_year || '');
      const q = trimStr(req.query.q || '');
      const gender = trimStr(req.query.gender || '');
      if (!className) return res.status(400).json({ success: false, message: 'class_name is required' });

      const params = [schoolId, className];
      let sql = `
        SELECT id, student_uid, student_code, first_name, last_name, gender,
               TRIM(class_name) AS class_name, academic_year
        FROM students
        WHERE school_id = ? AND TRIM(COALESCE(class_name, '')) = ?
      `;
      if (academicYear) {
        sql += ' AND TRIM(COALESCE(academic_year, "")) = ?';
        params.push(academicYear);
      }
      if (gender === 'Male' || gender === 'Female') {
        sql += ' AND gender = ?';
        params.push(gender);
      }
      if (q) {
        sql += ` AND (student_uid LIKE ? OR student_code LIKE ? OR first_name LIKE ? OR last_name LIKE ?
                  OR CONCAT(first_name,' ',last_name) LIKE ?)`;
        const like = `%${q}%`;
        params.push(like, like, like, like, like);
      }
      sql += ' ORDER BY student_uid ASC, last_name ASC LIMIT 500';
      const [rows] = await promisePool.query(sql, params);
      const data = rows.map((r) => ({
        id: r.id,
        student_uid: r.student_uid || r.student_code || String(r.id),
        student_code: r.student_code,
        first_name: r.first_name,
        last_name: r.last_name,
        name: `${r.first_name || ''} ${r.last_name || ''}`.trim(),
        gender: r.gender,
        class_name: r.class_name,
        academic_year: r.academic_year,
        residency_status: 'DAY',
      }));
      res.json({ success: true, data });
    } catch (e) {
      console.error('[store/uniform-issues/students]:', e.message);
      res.status(500).json({ success: false, message: 'Failed to load students' });
    }
  });

  // GET /store/uniform-issues/analytics
  router.get('/store/uniform-issues/analytics', requireRole(STORE_READ_ROLES), async (req, res) => {
    try {
      const { schoolId } = req.ctx;
      const academicYear = trimStr(req.query.academic_year || '');
      const term = trimStr(req.query.term || '');
      const className = trimStr(req.query.class_name || '');
      const fromDate = trimStr(req.query.from_date || '');
      const toDate = trimStr(req.query.to_date || '');
      const finishedGoodId = Number(req.query.finished_good_id);

      let issueWhere = 'i.school_id = ? AND i.deleted_at IS NULL';
      const issueParams = [schoolId];
      if (academicYear) {
        issueWhere += ' AND i.academic_year = ?';
        issueParams.push(academicYear);
      }
      if (term) {
        issueWhere += ' AND i.term = ?';
        issueParams.push(term);
      }
      if (className) {
        issueWhere += ' AND i.class_name = ?';
        issueParams.push(className);
      }
      if (fromDate) {
        issueWhere += ' AND DATE(i.created_at) >= ?';
        issueParams.push(fromDate);
      }
      if (toDate) {
        issueWhere += ' AND DATE(i.created_at) <= ?';
        issueParams.push(toDate);
      }

      const [[totals]] = await promisePool.query(
        `SELECT COALESCE(SUM(i.total_amount), 0) AS total_sales,
                COALESCE(SUM(i.total_pieces), 0) AS total_pieces,
                COALESCE(SUM(i.students_count), 0) AS issue_student_slots
         FROM store_uniform_issues i WHERE ${issueWhere}`,
        issueParams
      );

      const [[served]] = await promisePool.query(
        `SELECT COUNT(DISTINCT sl.student_id) AS students_served
         FROM store_uniform_issue_student_lines sl
         INNER JOIN store_uniform_issues i ON i.id = sl.issue_id AND i.deleted_at IS NULL
         WHERE ${issueWhere.replace(/i\./g, 'i.')}`,
        issueParams
      );

      const [[stockVal]] = await promisePool.query(
        `SELECT COALESCE(SUM(stock * COALESCE(selling_price, 0)), 0) AS stock_value
         FROM store_finished_goods WHERE school_id = ? AND deleted_at IS NULL`,
        [schoolId]
      );

      let lineWhere = 'sl.school_id = ?';
      const lineParams = [schoolId];
      if (academicYear) {
        lineWhere += ' AND sl.academic_year = ?';
        lineParams.push(academicYear);
      }
      if (term) {
        lineWhere += ' AND sl.term = ?';
        lineParams.push(term);
      }
      if (className) {
        lineWhere += ' AND sl.class_name = ?';
        lineParams.push(className);
      }
      if (fromDate) {
        lineWhere += ' AND sl.issue_date >= ?';
        lineParams.push(fromDate);
      }
      if (toDate) {
        lineWhere += ' AND sl.issue_date <= ?';
        lineParams.push(toDate);
      }
      if (Number.isFinite(finishedGoodId) && finishedGoodId > 0) {
        lineWhere += ' AND sl.finished_good_id = ?';
        lineParams.push(finishedGoodId);
      }
      const [topItems] = await promisePool.query(
        `SELECT sl.item_name, SUM(sl.quantity) AS pieces, SUM(sl.amount) AS revenue
         FROM store_uniform_issue_student_lines sl
         INNER JOIN store_uniform_issues i ON i.id = sl.issue_id AND i.deleted_at IS NULL
         WHERE ${lineWhere}
         GROUP BY sl.item_name ORDER BY pieces DESC LIMIT 10`,
        lineParams
      );

      const [byClass] = await promisePool.query(
        `SELECT i.class_name, COALESCE(SUM(i.total_amount), 0) AS revenue
         FROM store_uniform_issues i
         WHERE ${issueWhere}
         GROUP BY i.class_name ORDER BY revenue DESC`,
        issueParams
      );

      res.json({
        success: true,
        data: {
          total_sales: Number(totals?.total_sales || 0),
          total_pieces: Number(totals?.total_pieces || 0),
          students_served: Number(served?.students_served || 0),
          stock_value: Number(stockVal?.stock_value || 0),
          top_items: topItems.map((r) => ({
            item_name: r.item_name,
            pieces: Number(r.pieces || 0),
            revenue: Number(r.revenue || 0),
          })),
          revenue_by_class: byClass.map((r) => ({
            class_name: r.class_name || '—',
            revenue: Number(r.revenue || 0),
          })),
        },
      });
    } catch (e) {
      console.error('[store/uniform-issues/analytics]:', e.message);
      res.status(500).json({ success: false, message: 'Failed to load analytics' });
    }
  });

  // GET /store/uniform-issues/profit-calculation — fabric cost out vs issue revenue by fabric
  router.get('/store/uniform-issues/profit-calculation', requireRole(STORE_READ_ROLES), async (req, res) => {
    try {
      const { schoolId } = req.ctx;
      const academicYear = trimStr(req.query.academic_year || '');
      const term = trimStr(req.query.term || '');
      const className = trimStr(req.query.class_name || '');
      const fromDate = trimStr(req.query.from_date || '');
      const toDate = trimStr(req.query.to_date || '');

      let stockoutWhere = 'o.school_id = ? AND o.deleted_at IS NULL';
      const stockoutParams = [schoolId];
      if (academicYear) {
        stockoutWhere += ' AND o.academic_year = ?';
        stockoutParams.push(academicYear);
      }
      if (term) {
        stockoutWhere += ' AND o.term = ?';
        stockoutParams.push(term);
      }
      if (fromDate) {
        stockoutWhere += ' AND o.out_date >= ?';
        stockoutParams.push(fromDate);
      }
      if (toDate) {
        stockoutWhere += ' AND o.out_date <= ?';
        stockoutParams.push(toDate);
      }

      const [fabricOutRows] = await promisePool.query(
        `SELECT TRIM(COALESCE(r.fabric_type, 'Unknown')) AS fabric_type,
                TRIM(COALESCE(r.color, '')) AS fabric_color,
                COALESCE(SUM(o.meters_out), 0) AS meters_out,
                COALESCE(SUM(o.meters_out * COALESCE(r.unit_cost, 0)), 0) AS total_fabric_cost
         FROM store_fabric_stockouts o
         INNER JOIN store_fabric_receipts r
           ON r.id = o.fabric_receipt_id AND r.school_id = o.school_id AND r.deleted_at IS NULL
         WHERE ${stockoutWhere}
         GROUP BY TRIM(COALESCE(r.fabric_type, 'Unknown')), TRIM(COALESCE(r.color, ''))`,
        stockoutParams
      );

      let issueWhere = 'i.school_id = ? AND i.deleted_at IS NULL';
      const issueParams = [schoolId];
      if (academicYear) {
        issueWhere += ' AND i.academic_year = ?';
        issueParams.push(academicYear);
      }
      if (term) {
        issueWhere += ' AND i.term = ?';
        issueParams.push(term);
      }
      if (className) {
        issueWhere += ' AND i.class_name = ?';
        issueParams.push(className);
      }
      if (fromDate) {
        issueWhere += ' AND DATE(i.created_at) >= ?';
        issueParams.push(fromDate);
      }
      if (toDate) {
        issueWhere += ' AND DATE(i.created_at) <= ?';
        issueParams.push(toDate);
      }

      const [issueRows] = await promisePool.query(
        `SELECT TRIM(COALESCE(fr.fabric_type, 'Unlinked')) AS fabric_type,
                TRIM(COALESCE(fr.color, '')) AS fabric_color,
                COALESCE(SUM(l.total_qty), 0) AS issue_qty,
                COALESCE(SUM(l.line_total), 0) AS total_issue_revenue
         FROM store_uniform_issue_lines l
         INNER JOIN store_uniform_issues i ON i.id = l.issue_id AND i.deleted_at IS NULL
         LEFT JOIN store_finished_goods fg
           ON fg.id = l.finished_good_id AND fg.school_id = l.school_id AND fg.deleted_at IS NULL
         LEFT JOIN store_fabric_receipts fr
           ON fr.id = fg.fabric_receipt_id AND fr.school_id = fg.school_id AND fr.deleted_at IS NULL
         WHERE ${issueWhere.replace(/i\./g, 'i.')}
         GROUP BY TRIM(COALESCE(fr.fabric_type, 'Unlinked')), TRIM(COALESCE(fr.color, ''))`,
        issueParams
      );

      const byKey = new Map();
      const keyOf = (type, color) => `${type}||${color}`;

      for (const row of fabricOutRows) {
        const fabricType = row.fabric_type || 'Unknown';
        const fabricColor = row.fabric_color || '';
        const key = keyOf(fabricType, fabricColor);
        const metersOut = Number(row.meters_out || 0);
        const totalFabricCost = Number(row.total_fabric_cost || 0);
        byKey.set(key, {
          fabric_type: fabricType,
          fabric_color: fabricColor,
          meters_out: metersOut,
          total_fabric_cost: totalFabricCost,
          fabric_unit_cost_avg: metersOut > 0 ? toMoney(totalFabricCost / metersOut) : 0,
          issue_qty: 0,
          total_issue_revenue: 0,
          issue_unit_price_avg: 0,
        });
      }

      for (const row of issueRows) {
        const fabricType = row.fabric_type || 'Unlinked';
        const fabricColor = row.fabric_color || '';
        const key = keyOf(fabricType, fabricColor);
        const issueQty = Number(row.issue_qty || 0);
        const totalIssueRevenue = Number(row.total_issue_revenue || 0);
        const existing = byKey.get(key) || {
          fabric_type: fabricType,
          fabric_color: fabricColor,
          meters_out: 0,
          total_fabric_cost: 0,
          fabric_unit_cost_avg: 0,
        };
        existing.issue_qty = issueQty;
        existing.total_issue_revenue = totalIssueRevenue;
        existing.issue_unit_price_avg = issueQty > 0 ? toMoney(totalIssueRevenue / issueQty) : 0;
        byKey.set(key, existing);
      }

      const rows = Array.from(byKey.values())
        .map((r) => ({
          ...r,
          profit_loss: toMoney(Number(r.total_issue_revenue || 0) - Number(r.total_fabric_cost || 0)),
        }))
        .sort((a, b) => Math.abs(b.profit_loss) - Math.abs(a.profit_loss));

      const summary = rows.reduce(
        (acc, r) => ({
          total_meters_out: acc.total_meters_out + Number(r.meters_out || 0),
          total_fabric_cost: acc.total_fabric_cost + Number(r.total_fabric_cost || 0),
          total_issue_qty: acc.total_issue_qty + Number(r.issue_qty || 0),
          total_issue_revenue: acc.total_issue_revenue + Number(r.total_issue_revenue || 0),
          total_profit_loss: acc.total_profit_loss + Number(r.profit_loss || 0),
        }),
        { total_meters_out: 0, total_fabric_cost: 0, total_issue_qty: 0, total_issue_revenue: 0, total_profit_loss: 0 }
      );
      summary.total_profit_loss = toMoney(summary.total_profit_loss);

      res.json({ success: true, data: { rows, summary } });
    } catch (e) {
      console.error('[store/uniform-issues/profit-calculation]:', e.message);
      res.status(500).json({ success: false, message: 'Failed to load profit calculation' });
    }
  });

  // GET /store/uniform-issues — optional filters: academic_year, class_name, student_q
  router.get('/store/uniform-issues', requireRole(STORE_READ_ROLES), async (req, res) => {
    try {
      const { schoolId } = req.ctx;
      const academicYear = trimStr(req.query.academic_year);
      const className = trimStr(req.query.class_name);
      const studentQ = trimStr(req.query.student_q);
      let sql = `SELECT i.* FROM store_uniform_issues i
         WHERE i.school_id = ? AND i.deleted_at IS NULL`;
      const params = [schoolId];
      if (academicYear) {
        sql += ` AND i.academic_year = ?`;
        params.push(academicYear);
      }
      if (className) {
        sql += ` AND i.class_name = ?`;
        params.push(className);
      }
      if (studentQ) {
        const like = `%${studentQ}%`;
        sql += ` AND EXISTS (
          SELECT 1 FROM store_uniform_issue_students st
          WHERE st.issue_id = i.id AND st.school_id = i.school_id
            AND (st.student_name LIKE ? OR st.student_uid LIKE ?)
        )`;
        params.push(like, like);
      }
      sql += ` ORDER BY i.id DESC LIMIT 200`;
      const [rows] = await promisePool.query(sql, params);
      res.json({ success: true, data: rows });
    } catch (e) {
      console.error('[store/uniform-issues GET]:', e.message);
      res.status(500).json({ success: false, message: 'Failed to load issues' });
    }
  });

  // GET /store/uniform-issues/student-history/:studentId
  router.get('/store/uniform-issues/student-history/:studentId', requireRole(STORE_READ_ROLES), async (req, res) => {
    try {
      const { schoolId } = req.ctx;
      const studentId = Number(req.params.studentId);
      if (!studentId) return res.status(400).json({ success: false, message: 'Invalid student id' });
      const [rows] = await promisePool.query(
        `SELECT sl.*, i.issue_no
         FROM store_uniform_issue_student_lines sl
         INNER JOIN store_uniform_issues i ON i.id = sl.issue_id AND i.deleted_at IS NULL
         WHERE sl.school_id = ? AND sl.student_id = ?
         ORDER BY sl.issue_date DESC, sl.id DESC`,
        [schoolId, studentId]
      );
      res.json({ success: true, data: rows });
    } catch (e) {
      console.error('[store/uniform-issues/student-history]:', e.message);
      res.status(500).json({ success: false, message: 'Failed to load student history' });
    }
  });

  // GET /store/uniform-issues/:id
  router.get('/store/uniform-issues/:id', requireRole(STORE_READ_ROLES), async (req, res) => {
    try {
      const { schoolId } = req.ctx;
      const id = Number(req.params.id);
      if (!id) return res.status(400).json({ success: false, message: 'Invalid id' });
      const [[issue]] = await promisePool.query(
        `SELECT * FROM store_uniform_issues WHERE id = ? AND school_id = ? AND deleted_at IS NULL LIMIT 1`,
        [id, schoolId]
      );
      if (!issue) return res.status(404).json({ success: false, message: 'Issue not found' });
      const [rawLines] = await promisePool.query(
        `SELECT * FROM store_uniform_issue_lines WHERE issue_id = ? AND school_id = ? ORDER BY id`,
        [id, schoolId]
      );
      const studentsCount = Number(issue.students_count) || 0;
      const lines = rawLines.map((l) => {
        let qtyPer = Number(l.qty_per_student || 0);
        if (qtyPer <= 0 && studentsCount > 0) {
          qtyPer = toMoney(Number(l.total_qty || 0) / studentsCount);
        }
        return { ...l, qty_per_student: qtyPer };
      });
      const [issueStudents] = await promisePool.query(
        `SELECT * FROM store_uniform_issue_students WHERE issue_id = ? AND school_id = ? ORDER BY student_uid`,
        [id, schoolId]
      );
      const [slots] = await promisePool.query(
        `SELECT * FROM store_uniform_issue_slots WHERE issue_id = ? AND school_id = ? ORDER BY student_id, slot_number`,
        [id, schoolId]
      );
      const slotsByStudent = new Map();
      for (const sl of slots) {
        const list = slotsByStudent.get(sl.student_id) || [];
        list.push(sl);
        slotsByStudent.set(sl.student_id, list);
      }
      const studentsWithSlots = issueStudents.length
        ? issueStudents.map((st) => ({
            ...st,
            slots: slotsByStudent.get(st.student_id) || [],
          }))
        : (
            await promisePool.query(
              `SELECT student_id, student_uid, student_name, SUM(amount) AS student_total, SUM(quantity) AS total_qty
               FROM store_uniform_issue_student_lines
               WHERE issue_id = ? AND school_id = ?
               GROUP BY student_id, student_uid, student_name ORDER BY student_uid`,
              [id, schoolId]
            )
          )[0].map((r) => ({ ...r, total_amount: r.student_total, slots: [] }));

      res.json({
        success: true,
        data: { ...issue, lines, students: studentsWithSlots },
      });
    } catch (e) {
      console.error('[store/uniform-issues/:id GET]:', e.message);
      res.status(500).json({ success: false, message: 'Failed to load issue' });
    }
  });

  async function restoreIssueStockAndClearChildren(conn, schoolId, issueId) {
    const [oldSlots] = await conn.query(
      `SELECT finished_good_id, SUM(quantity) AS qty
       FROM store_uniform_issue_slots
       WHERE issue_id = ? AND school_id = ? AND finished_good_id IS NOT NULL
       GROUP BY finished_good_id`,
      [issueId, schoolId]
    );
    for (const row of oldSlots) {
      const fgId = Number(row.finished_good_id);
      const qty = Number(row.qty || 0);
      if (!fgId || qty <= 0) continue;
      await conn.query(
        `UPDATE store_finished_goods SET stock = stock + ? WHERE id = ? AND school_id = ? AND deleted_at IS NULL`,
        [qty, fgId, schoolId]
      );
    }
    await conn.query(`DELETE FROM store_uniform_issue_slots WHERE issue_id = ? AND school_id = ?`, [issueId, schoolId]);
    await conn.query(`DELETE FROM store_uniform_issue_student_lines WHERE issue_id = ? AND school_id = ?`, [issueId, schoolId]);
    await conn.query(`DELETE FROM store_uniform_issue_students WHERE issue_id = ? AND school_id = ?`, [issueId, schoolId]);
    await conn.query(`DELETE FROM store_uniform_issue_lines WHERE issue_id = ? AND school_id = ?`, [issueId, schoolId]);
    await conn.query(`DELETE FROM store_uniform_student_charges WHERE issue_id = ? AND school_id = ?`, [issueId, schoolId]);
  }

  async function persistSlotBasedIssue(conn, ctx, body, res, existingIssue = null) {
    const { schoolId, userId, roleCode } = ctx;
    const academicYear = trimStr(body.academic_year);
    const term = trimStr(body.term);
    const className = trimStr(body.class_name);
    const postBilling = body.post_billing !== false;
    const issuedByName = trimStr(body.issued_by_name);
    const studentsIn = Array.isArray(body.students) ? body.students : [];

    if (!className) return res.status(400).json({ success: false, message: 'class_name is required' });
    if (!studentsIn.length) return res.status(400).json({ success: false, message: 'Configure at least one student' });

    const parsed = [];
    for (const st of studentsIn) {
      const studentId = Number(st.student_id);
      if (!studentId) continue;
      const slots = (Array.isArray(st.slots) ? st.slots : [])
        .map((sl) => ({
          slot_number: Number(sl.slot_number) || 0,
          slot_name: trimStr(sl.slot_name || sl.column_name || ''),
          label_name: trimStr(sl.label_name || sl.label),
          finished_good_id: Number(sl.finished_good_id) > 0 ? Number(sl.finished_good_id) : null,
          quantity: toMoney(sl.quantity),
          unit_price: toMoney(sl.unit_price),
        }))
        .filter((sl) => sl.label_name && sl.quantity > 0 && sl.slot_number > 0);
      if (slots.length) parsed.push({ student_id: studentId, slots });
    }
    if (!parsed.length) {
      return res.status(400).json({ success: false, message: 'Configure at least one uniform slot' });
    }

    const studentIds = parsed.map((p) => p.student_id);
    const fgTotals = new Map();
    for (const st of parsed) {
      for (const sl of st.slots) {
        if (!sl.finished_good_id) continue;
        fgTotals.set(sl.finished_good_id, (fgTotals.get(sl.finished_good_id) || 0) + sl.quantity);
      }
    }

    const restoredByFg = new Map();
    if (existingIssue?.id) {
      const [oldSlots] = await conn.query(
        `SELECT finished_good_id, SUM(quantity) AS qty
         FROM store_uniform_issue_slots
         WHERE issue_id = ? AND school_id = ? AND finished_good_id IS NOT NULL
         GROUP BY finished_good_id`,
        [existingIssue.id, schoolId]
      );
      for (const row of oldSlots) {
        restoredByFg.set(Number(row.finished_good_id), Number(row.qty || 0));
      }
    }

    const stockChecks = [];
    for (const [fgId, needed] of fgTotals.entries()) {
      const [[fg]] = await conn.query(
        `SELECT id, uniform_name, size, stock, selling_price
         FROM store_finished_goods WHERE id = ? AND school_id = ? AND deleted_at IS NULL FOR UPDATE`,
        [fgId, schoolId]
      );
      if (!fg) return res.status(400).json({ success: false, message: `Finished good #${fgId} not found` });
      const available = Number(fg.stock || 0) + (restoredByFg.get(fgId) || 0);
      stockChecks.push({ finished_good_id: fg.id, item_name: fg.uniform_name, needed, available, ok: available >= needed, fg });
      if (available < needed) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for ${fg.uniform_name}`,
          stock_errors: stockChecks.map((s) => ({ item_name: s.item_name, needed: s.needed, available: s.available, ok: s.ok })),
        });
      }
    }

    const [stuRows] = await conn.query(
      `SELECT id, student_uid, student_code, first_name, last_name FROM students WHERE school_id = ? AND id IN (?)`,
      [schoolId, studentIds]
    );
    if (stuRows.length !== studentIds.length) {
      return res.status(400).json({ success: false, message: 'One or more students not found' });
    }
    const studentMap = new Map(stuRows.map((s) => [s.id, s]));

    let totalPieces = 0;
    let totalAmount = 0;
    const aggLines = new Map();

    await conn.beginTransaction();
    const issueDate = new Date().toISOString().slice(0, 10);
    let issueId;
    let issueNo;

    if (existingIssue?.id) {
      issueId = existingIssue.id;
      issueNo = existingIssue.issue_no;
      await restoreIssueStockAndClearChildren(conn, schoolId, issueId);
    } else {
      issueNo = await nextIssueNo(schoolId, academicYear, conn);
    }

    for (const st of parsed) {
      for (const sl of st.slots) {
        totalPieces += sl.quantity;
        const amt = sl.quantity * sl.unit_price;
        totalAmount += amt;
        const key = `${sl.label_name}|${sl.finished_good_id || 0}|${sl.unit_price}`;
        const cur = aggLines.get(key) || { ...sl, total_qty: 0, line_total: 0, _studentIds: new Set() };
        cur.total_qty += sl.quantity;
        cur.line_total += amt;
        if (!cur._studentIds.has(st.student_id)) cur._studentIds.add(st.student_id);
        aggLines.set(key, cur);
      }
    }

    if (!existingIssue?.id) {
      const [insIssue] = await conn.query(
        `INSERT INTO store_uniform_issues
         (school_id, issue_no, academic_year, term, class_name, students_count, total_pieces, total_amount,
          issued_by_user_id, issued_by_name, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'posted')`,
        [schoolId, issueNo, academicYear || null, term || null, className, studentIds.length, totalPieces, totalAmount, userId, issuedByName || null]
      );
      issueId = insIssue.insertId;
    } else {
      await conn.query(
        `UPDATE store_uniform_issues
         SET students_count = ?, total_pieces = ?, total_amount = ?, issued_by_name = COALESCE(?, issued_by_name)
         WHERE id = ? AND school_id = ? AND deleted_at IS NULL`,
        [studentIds.length, totalPieces, totalAmount, issuedByName || null, issueId, schoolId]
      );
    }

    for (const [, line] of aggLines) {
      const studentsWithItem = line._studentIds ? line._studentIds.size : studentIds.length;
      const qtyPerStudent =
        studentsWithItem > 0 ? toMoney(Number(line.total_qty || 0) / studentsWithItem) : 0;
      await conn.query(
        `INSERT INTO store_uniform_issue_lines
         (issue_id, school_id, finished_good_id, item_name, qty_per_student, unit_price, total_qty, line_total)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          issueId,
          schoolId,
          line.finished_good_id,
          line.label_name,
          qtyPerStudent,
          line.unit_price,
          line.total_qty,
          line.line_total,
        ]
      );
    }

    for (const st of parsed) {
      const row = studentMap.get(st.student_id);
      const studentName = `${row.first_name || ''} ${row.last_name || ''}`.trim();
      const studentUid = row.student_uid || row.student_code || String(st.student_id);
      let stQty = 0;
      let stAmt = 0;
      for (const sl of st.slots) {
        stQty += sl.quantity;
        stAmt += sl.quantity * sl.unit_price;
      }

      const [insStu] = await conn.query(
        `INSERT INTO store_uniform_issue_students
         (issue_id, school_id, student_id, student_uid, student_name, total_qty, total_amount)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [issueId, schoolId, st.student_id, studentUid, studentName, stQty, stAmt]
      );
      const studentIssueId = insStu.insertId;

      for (const sl of st.slots) {
        const slotTotal = sl.quantity * sl.unit_price;
        await conn.query(
          `INSERT INTO store_uniform_issue_slots
           (student_issue_id, issue_id, school_id, student_id, slot_number, slot_name, label_name, finished_good_id, quantity, unit_price, total_amount)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            studentIssueId,
            issueId,
            schoolId,
            st.student_id,
            sl.slot_number,
            sl.slot_name || null,
            sl.label_name,
            sl.finished_good_id,
            sl.quantity,
            sl.unit_price,
            slotTotal,
          ]
        );
        await conn.query(
          `INSERT INTO store_uniform_issue_student_lines
           (issue_id, school_id, student_id, student_uid, student_name, finished_good_id, item_name,
            quantity, unit_price, amount, academic_year, term, class_name, issue_date)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [issueId, schoolId, st.student_id, studentUid, studentName, sl.finished_good_id, sl.label_name, sl.quantity, sl.unit_price, slotTotal, academicYear || null, term || null, className, issueDate]
        );
      }

      if (postBilling && stAmt > 0) {
        await conn.query(
          `INSERT INTO store_uniform_student_charges
           (school_id, issue_id, student_id, academic_year, term, class_name, amount_rwf, description, status)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending_accounting')`,
          [schoolId, issueId, st.student_id, academicYear || null, term || null, className, stAmt, `Uniform charges — ${issueNo}`]
        );
      }
    }

    for (const check of stockChecks) {
      const remaining = Number(check.fg.stock) - check.needed;
      await conn.query(`UPDATE store_finished_goods SET stock = ? WHERE id = ? AND school_id = ?`, [remaining, check.finished_good_id, schoolId]);
      await conn.query(
        `INSERT INTO store_movements
         (school_id, item_id, finished_good_id, uniform_issue_id, type, term, academic_year, movement_date,
          quantity, stock_after, unit_cost, ref, note, created_by_user_id)
         VALUES (?, ?, ?, ?, 'OUT', ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [schoolId, check.finished_good_id, check.finished_good_id, issueId, term || null, academicYear || null, issueDate, check.needed, remaining, check.fg.selling_price, issueNo, `Uniform issue OUT — ${check.item_name}`, userId]
      );
    }

    await conn.commit();
    await appendAuditLog({
      schoolId,
      userId,
      roleCode,
      endpoint: existingIssue?.id ? '/store/uniform-issues/:id' : '/store/uniform-issues',
      entityType: 'store_uniform_issue',
      entityId: issueId,
      action: existingIssue?.id ? 'update' : 'create',
      afterState: { issue_no: issueNo, students_count: studentIds.length, total_amount: totalAmount, mode: 'slots' },
    });
    const statusCode = existingIssue?.id ? 200 : 201;
    return res.status(statusCode).json({
      success: true,
      message: existingIssue?.id ? 'Uniform distribution updated' : 'Uniform issue saved',
      id: issueId,
      issue_no: issueNo,
      total_amount: totalAmount,
      total_pieces: totalPieces,
      billing_posted: postBilling,
      updated: Boolean(existingIssue?.id),
    });
  }

  // PATCH /store/uniform-issues/:id — replace slot distribution (same year / term / class)
  router.patch('/store/uniform-issues/:id', requireRole(STORE_WRITE_ROLES), async (req, res) => {
    const conn = await promisePool.getConnection();
    try {
      const { schoolId } = req.ctx;
      const id = Number(req.params.id);
      if (!id) return res.status(400).json({ success: false, message: 'Invalid id' });
      const [[issue]] = await conn.query(
        `SELECT id, issue_no, academic_year, term, class_name
         FROM store_uniform_issues WHERE id = ? AND school_id = ? AND deleted_at IS NULL LIMIT 1`,
        [id, schoolId]
      );
      if (!issue) return res.status(404).json({ success: false, message: 'Issue not found' });
      const body = req.body || {};
      const className = trimStr(body.class_name || issue.class_name);
      const academicYear = trimStr(body.academic_year || issue.academic_year);
      const term = trimStr(body.term || issue.term);
      if (trimStr(body.class_name) && trimStr(body.class_name) !== trimStr(issue.class_name)) {
        return res.status(400).json({ success: false, message: 'class_name must match the existing issue' });
      }
      if (!Array.isArray(body.students) || !body.students.length) {
        return res.status(400).json({ success: false, message: 'Configure at least one student' });
      }
      return await persistSlotBasedIssue(
        conn,
        req.ctx,
        { ...body, class_name: className, academic_year: academicYear, term },
        res,
        { id: issue.id, issue_no: issue.issue_no }
      );
    } catch (e) {
      await conn.rollback().catch(() => {});
      console.error('[store/uniform-issues/:id PATCH]:', e.message);
      return res.status(500).json({ success: false, message: e.message || 'Failed to update uniform issue' });
    } finally {
      conn.release();
    }
  });

  // POST /store/uniform-issues
  router.post('/store/uniform-issues', requireRole(STORE_WRITE_ROLES), async (req, res) => {
    const conn = await promisePool.getConnection();
    try {
      const { schoolId, userId, roleCode } = req.ctx;
      const body = req.body || {};
      if (Array.isArray(body.students) && body.students.length) {
        try {
          return await persistSlotBasedIssue(conn, req.ctx, body, res);
        } catch (e) {
          await conn.rollback().catch(() => {});
          console.error('[store/uniform-issues POST slots]:', e.message);
          return res.status(500).json({ success: false, message: e.message || 'Failed to save uniform issue' });
        } finally {
          conn.release();
        }
      }

      const academicYear = trimStr(body.academic_year);
      const term = trimStr(body.term);
      const className = trimStr(body.class_name);
      const studentIds = Array.isArray(body.student_ids) ? body.student_ids.map(Number).filter((n) => n > 0) : [];
      const items = Array.isArray(body.items) ? body.items : [];
      const postBilling = body.post_billing !== false;
      const issuedByName = trimStr(body.issued_by_name);

      if (!className) return res.status(400).json({ success: false, message: 'class_name is required' });
      if (!studentIds.length) return res.status(400).json({ success: false, message: 'Select at least one student' });
      if (!items.length) return res.status(400).json({ success: false, message: 'Add at least one distribution item' });

      const normalizedItems = items.map((it) => {
        const fgId = Number(it.finished_good_id);
        const qtyPer = toMoney(it.qty_per_student ?? it.quantity_per_student);
        const unitPrice = toMoney(it.unit_price ?? it.selling_price);
        const itemName = trimStr(it.item_name || it.uniform_name);
        return {
          finished_good_id: Number.isFinite(fgId) && fgId > 0 ? fgId : null,
          item_name: itemName,
          qty_per_student: qtyPer,
          unit_price: unitPrice,
        };
      });

      for (const it of normalizedItems) {
        if (!it.item_name) return res.status(400).json({ success: false, message: 'Each item needs a name' });
        if (it.qty_per_student <= 0) return res.status(400).json({ success: false, message: 'Quantity per student must be > 0' });
      }

      const studentCount = studentIds.length;
      const stockChecks = [];

      for (const it of normalizedItems) {
        if (!it.finished_good_id) continue;
        const needed = it.qty_per_student * studentCount;
        const [[fg]] = await conn.query(
          `SELECT id, uniform_name, size, stock, selling_price
           FROM store_finished_goods
           WHERE id = ? AND school_id = ? AND deleted_at IS NULL FOR UPDATE`,
          [it.finished_good_id, schoolId]
        );
        if (!fg) {
          return res.status(400).json({ success: false, message: `Finished good #${it.finished_good_id} not found` });
        }
        const available = Number(fg.stock || 0);
        stockChecks.push({
          finished_good_id: fg.id,
          item_name: it.item_name || fg.uniform_name,
          needed,
          available,
          ok: available >= needed,
          fg,
        });
        if (available < needed) {
          return res.status(400).json({
            success: false,
            message: `Insufficient stock for ${it.item_name || fg.uniform_name}`,
            stock_errors: stockChecks.map((s) => ({
              item_name: s.item_name,
              needed: s.needed,
              available: s.available,
              ok: s.ok,
            })),
          });
        }
      }

      const [stuRows] = await conn.query(
        `SELECT id, student_uid, student_code, first_name, last_name
         FROM students WHERE school_id = ? AND id IN (?)`,
        [schoolId, studentIds]
      );
      if (stuRows.length !== studentIds.length) {
        return res.status(400).json({ success: false, message: 'One or more students not found' });
      }
      const studentMap = new Map(stuRows.map((s) => [s.id, s]));

      let totalPieces = 0;
      let totalAmount = 0;
      const lineTotals = normalizedItems.map((it) => {
        const totalQty = it.qty_per_student * studentCount;
        const lineTotal = totalQty * it.unit_price;
        totalPieces += totalQty;
        totalAmount += lineTotal;
        return { ...it, total_qty: totalQty, line_total: lineTotal };
      });

      await conn.beginTransaction();
      const issueNo = await nextIssueNo(schoolId, academicYear, conn);
      const issueDate = new Date().toISOString().slice(0, 10);

      const [insIssue] = await conn.query(
        `INSERT INTO store_uniform_issues
         (school_id, issue_no, academic_year, term, class_name, students_count, total_pieces, total_amount,
          issued_by_user_id, issued_by_name, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'posted')`,
        [
          schoolId,
          issueNo,
          academicYear || null,
          term || null,
          className,
          studentCount,
          totalPieces,
          totalAmount,
          userId,
          issuedByName || null,
        ]
      );
      const issueId = insIssue.insertId;

      for (const line of lineTotals) {
        await conn.query(
          `INSERT INTO store_uniform_issue_lines
           (issue_id, school_id, finished_good_id, item_name, qty_per_student, unit_price, total_qty, line_total)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            issueId,
            schoolId,
            line.finished_good_id,
            line.item_name,
            line.qty_per_student,
            line.unit_price,
            line.total_qty,
            line.line_total,
          ]
        );
      }

      for (const studentId of studentIds) {
        const st = studentMap.get(studentId);
        const studentName = `${st.first_name || ''} ${st.last_name || ''}`.trim();
        const studentUid = st.student_uid || st.student_code || String(studentId);
        let studentTotal = 0;

        for (const line of lineTotals) {
          const qty = line.qty_per_student;
          const amount = qty * line.unit_price;
          studentTotal += amount;
          await conn.query(
            `INSERT INTO store_uniform_issue_student_lines
             (issue_id, school_id, student_id, student_uid, student_name, finished_good_id, item_name,
              quantity, unit_price, amount, academic_year, term, class_name, issue_date)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              issueId,
              schoolId,
              studentId,
              studentUid,
              studentName,
              line.finished_good_id,
              line.item_name,
              qty,
              line.unit_price,
              amount,
              academicYear || null,
              term || null,
              className,
              issueDate,
            ]
          );
        }

        if (postBilling && studentTotal > 0) {
          await conn.query(
            `INSERT INTO store_uniform_student_charges
             (school_id, issue_id, student_id, academic_year, term, class_name, amount_rwf, description, status)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending_accounting')`,
            [
              schoolId,
              issueId,
              studentId,
              academicYear || null,
              term || null,
              className,
              studentTotal,
              `Uniform charges — ${issueNo}`,
            ]
          );
        }
      }

      for (const check of stockChecks) {
        const prev = Number(check.fg.stock || 0);
        const issued = check.needed;
        const remaining = prev - issued;
        await conn.query(
          `UPDATE store_finished_goods SET stock = ? WHERE id = ? AND school_id = ?`,
          [remaining, check.finished_good_id, schoolId]
        );
        await conn.query(
          `INSERT INTO store_movements
           (school_id, item_id, finished_good_id, uniform_issue_id, type, term, academic_year, movement_date,
            quantity, stock_after, unit_cost, ref, note, created_by_user_id)
           VALUES (?, ?, ?, ?, 'OUT', ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            schoolId,
            check.finished_good_id,
            check.finished_good_id,
            issueId,
            term || null,
            academicYear || null,
            issueDate,
            issued,
            remaining,
            check.fg.selling_price,
            issueNo,
            `Uniform issue OUT — ${check.item_name}`,
            userId,
          ]
        );
      }

      await conn.commit();

      await appendAuditLog({
        schoolId,
        userId,
        roleCode,
        endpoint: '/store/uniform-issues',
        entityType: 'store_uniform_issue',
        entityId: issueId,
        action: 'create',
        afterState: { issue_no: issueNo, students_count: studentCount, total_amount: totalAmount },
      });

      res.status(201).json({
        success: true,
        message: 'Uniform issue saved',
        id: issueId,
        issue_no: issueNo,
        total_amount: totalAmount,
        total_pieces: totalPieces,
        billing_posted: postBilling,
      });
    } catch (e) {
      await conn.rollback().catch(() => {});
      console.error('[store/uniform-issues POST]:', e.message);
      res.status(500).json({ success: false, message: e.message || 'Failed to save uniform issue' });
    } finally {
      conn.release();
    }
  });

  // DELETE /store/uniform-issues/:id — restore stock, clear lines, soft-delete issue
  router.delete('/store/uniform-issues/:id', requireRole(STORE_WRITE_ROLES), async (req, res) => {
    const conn = await promisePool.getConnection();
    try {
      const { schoolId, userId, roleCode } = req.ctx;
      const id = Number(req.params.id);
      if (!id) return res.status(400).json({ success: false, message: 'Invalid id' });
      const [[issue]] = await conn.query(
        `SELECT id, issue_no, class_name, students_count, total_amount
         FROM store_uniform_issues WHERE id = ? AND school_id = ? AND deleted_at IS NULL LIMIT 1`,
        [id, schoolId]
      );
      if (!issue) return res.status(404).json({ success: false, message: 'Issue not found' });
      await conn.beginTransaction();
      await restoreIssueStockAndClearChildren(conn, schoolId, id);
      await conn.query(
        `UPDATE store_uniform_issues SET deleted_at = NOW(), status = 'deleted'
         WHERE id = ? AND school_id = ?`,
        [id, schoolId]
      );
      await conn.commit();
      await appendAuditLog({
        schoolId,
        userId,
        roleCode,
        endpoint: '/store/uniform-issues/:id',
        entityType: 'store_uniform_issue',
        entityId: id,
        action: 'delete',
        afterState: { issue_no: issue.issue_no, students_count: issue.students_count },
      });
      res.json({ success: true, message: 'Uniform issue deleted and stock restored' });
    } catch (e) {
      await conn.rollback().catch(() => {});
      console.error('[store/uniform-issues/:id DELETE]:', e.message);
      res.status(500).json({ success: false, message: e.message || 'Failed to delete uniform issue' });
    } finally {
      conn.release();
    }
  });
};
