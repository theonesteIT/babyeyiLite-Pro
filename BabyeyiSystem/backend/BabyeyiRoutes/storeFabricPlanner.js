'use strict';

/**
 * Store uniform fabric planner — yield calculator, production plans, consumption tracking.
 */
module.exports = function registerStoreFabricPlannerRoutes(router, deps) {
  const { promisePool, appendAuditLog, STORE_READ_ROLES, STORE_WRITE_ROLES, requireRole } = deps;

  function trimStr(v) {
    return String(v || '').trim();
  }

  function num(v, fallback = 0) {
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
  }

  async function recordFabricStockout(conn, { schoolId, fabricReceiptId, metersOut, purpose, note, outDate }) {
    const [[receipt]] = await conn.query(
      `SELECT id, meters, remaining_meters, academic_year, term
       FROM store_fabric_receipts
       WHERE id = ? AND school_id = ? AND deleted_at IS NULL
       FOR UPDATE`,
      [fabricReceiptId, schoolId]
    );
    if (!receipt) throw new Error('Fabric receipt not found');
    const remaining = Number(receipt.remaining_meters ?? 0);
    if (metersOut > remaining) {
      throw new Error(`Only ${remaining}m available on this fabric batch`);
    }
    const remainingAfter = Math.max(0, remaining - metersOut);
    await conn.query(
      `UPDATE store_fabric_receipts SET remaining_meters = ? WHERE id = ? AND school_id = ?`,
      [remainingAfter, fabricReceiptId, schoolId]
    );
    const [ins] = await conn.query(
      `INSERT INTO store_fabric_stockouts
       (school_id, fabric_receipt_id, academic_year, term, out_date, meters_out, purpose, note, remaining_after)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        schoolId,
        fabricReceiptId,
        receipt.academic_year,
        receipt.term,
        outDate,
        metersOut,
        purpose,
        note,
        remainingAfter,
      ]
    );
    return { id: ins.insertId, remainingAfter };
  }

  async function getOrCreatePlanner(schoolId, academicYear, conn) {
    const pool = conn || promisePool;
    const year = trimStr(academicYear);
    const [[existing]] = await pool.query(
      `SELECT id FROM store_fabric_planners
       WHERE school_id = ? AND academic_year = ? LIMIT 1`,
      [schoolId, year]
    );
    if (existing?.id) return existing.id;
    const [ins] = await pool.query(
      `INSERT INTO store_fabric_planners (school_id, academic_year) VALUES (?, ?)`,
      [schoolId, year]
    );
    return ins.insertId;
  }

  async function loadPlannerBundle(schoolId, academicYear) {
    const year = trimStr(academicYear);
    if (!year) return null;

    const [[planner]] = await promisePool.query(
      `SELECT * FROM store_fabric_planners
       WHERE school_id = ? AND academic_year = ? LIMIT 1`,
      [schoolId, year]
    );
    if (!planner) return null;

    const plannerId = planner.id;

    const [classRows] = await promisePool.query(
      `SELECT class_name, student_count FROM store_fabric_planner_classes
       WHERE planner_id = ? AND school_id = ? ORDER BY class_name`,
      [plannerId, schoolId]
    );

    const [uniformRows] = await promisePool.query(
      `SELECT id, uniform_name, meters_per_child, per_class_mode, sort_order
       FROM store_fabric_planner_uniform_types
       WHERE planner_id = ? AND school_id = ?
       ORDER BY sort_order, id`,
      [plannerId, schoolId]
    );

    const uniformIds = uniformRows.map((r) => r.id);
    let classMeterRows = [];
    if (uniformIds.length) {
      const [cm] = await promisePool.query(
        `SELECT uniform_type_id, class_name, meters
         FROM store_fabric_planner_class_meters
         WHERE school_id = ? AND uniform_type_id IN (?)`,
        [schoolId, uniformIds]
      );
      classMeterRows = cm;
    }

    const classMetersByUniform = {};
    classMeterRows.forEach((row) => {
      if (!classMetersByUniform[row.uniform_type_id]) classMetersByUniform[row.uniform_type_id] = {};
      classMetersByUniform[row.uniform_type_id][row.class_name] = num(row.meters);
    });

    const uniformTypes = uniformRows.map((u) => ({
      id: u.id,
      name: u.uniform_name,
      metersPerChild: num(u.meters_per_child),
      perClassMode: Boolean(u.per_class_mode),
      classMeters: classMetersByUniform[u.id] || {},
    }));

    const [[plan]] = await promisePool.query(
      `SELECT id, reserved_fabric, student_total, fabric_stockout_id, created_at
       FROM store_fabric_planner_production_plans
       WHERE planner_id = ? AND school_id = ?
       ORDER BY id DESC LIMIT 1`,
      [plannerId, schoolId]
    );

    let productionPlan = null;
    if (plan) {
      const [planItems] = await promisePool.query(
        `SELECT uniform_name, quantity, meters_per_child
         FROM store_fabric_planner_plan_items WHERE plan_id = ? ORDER BY id`,
        [plan.id]
      );
      productionPlan = {
        id: plan.id,
        reservedFabric: num(plan.reserved_fabric),
        studentTotal: Number(plan.student_total || 0),
        fabricStockoutId: plan.fabric_stockout_id,
        createdAt: plan.created_at,
        items: planItems.map((it) => ({
          name: it.uniform_name,
          quantity: Number(it.quantity || 0),
          metersPerChild: num(it.meters_per_child),
        })),
      };
    }

    const [consumptionRows] = await promisePool.query(
      `SELECT id, uniform_name, produced, distributed, recorded_at
       FROM store_fabric_planner_consumption
       WHERE planner_id = ? AND school_id = ? AND deleted_at IS NULL
       ORDER BY recorded_at DESC, id DESC`,
      [plannerId, schoolId]
    );

    let colorAllocations = {};
    try {
      colorAllocations = planner.color_allocations
        ? typeof planner.color_allocations === 'string'
          ? JSON.parse(planner.color_allocations)
          : planner.color_allocations
        : {};
    } catch {
      colorAllocations = {};
    }

    return {
      id: plannerId,
      academicYear: planner.academic_year,
      term: planner.term || '',
      fabricRollName: planner.fabric_roll_name || '',
      fabricType: planner.fabric_type || '',
      availableFabric: planner.available_fabric != null ? num(planner.available_fabric) : '',
      fabricReceiptId: planner.fabric_receipt_id || '',
      supplierName: planner.supplier_name || '',
      costPerMeter: planner.cost_per_meter != null ? num(planner.cost_per_meter) : '',
      wasteAllowance: num(planner.waste_allowance),
      colorAllocations,
      selectedClasses: classRows.map((c) => c.class_name),
      classCounts: Object.fromEntries(classRows.map((c) => [c.class_name, Number(c.student_count || 0)])),
      uniformTypes,
      productionPlan,
      consumptionRecords: consumptionRows.map((r) => ({
        id: r.id,
        uniform: r.uniform_name,
        produced: Number(r.produced || 0),
        distributed: Number(r.distributed || 0),
        recordedAt: r.recorded_at,
      })),
    };
  }

  async function nextPlanNo(schoolId, academicYear) {
    const yearPart = trimStr(academicYear).split('-')[0] || new Date().getFullYear();
    const prefix = `PLAN-${yearPart}-`;
    const [[row]] = await promisePool.query(
      `SELECT plan_no FROM store_fabric_planner_production_plans
       WHERE school_id = ? AND plan_no LIKE ? ORDER BY id DESC LIMIT 1`,
      [schoolId, `${prefix}%`]
    );
    let seq = 1;
    if (row?.plan_no) {
      const m = String(row.plan_no).match(/(\d+)$/);
      if (m) seq = parseInt(m[1], 10) + 1;
    }
    return `${prefix}${String(seq).padStart(3, '0')}`;
  }

  async function loadDashboard(schoolId, academicYear) {
    const year = trimStr(academicYear);

    const [[fabricStock]] = await promisePool.query(
      `SELECT COALESCE(SUM(remaining_meters), 0) AS total_meters
       FROM store_fabric_receipts WHERE school_id = ? AND deleted_at IS NULL`,
      [schoolId]
    );
    const totalFabricStock = num(fabricStock?.total_meters);

    const [[reservedRow]] = await promisePool.query(
      `SELECT COALESCE(SUM(reserved_fabric), 0) AS reserved
       FROM store_fabric_planner_production_plans
       WHERE school_id = ? AND status IN ('approved', 'in_production', 'completed')
       ${year ? 'AND planner_id IN (SELECT id FROM store_fabric_planners WHERE school_id = ? AND academic_year = ?)' : ''}`,
      year ? [schoolId, schoolId, year] : [schoolId]
    );
    const fabricReserved = num(reservedRow?.reserved);

    const fabricAvailable = Math.max(0, totalFabricStock - fabricReserved);

    let studentsRequiring = 0;
    if (year) {
      const [[stu]] = await promisePool.query(
        `SELECT COUNT(*) AS total FROM students
         WHERE school_id = ? AND TRIM(COALESCE(academic_year, '')) = ?`,
        [schoolId, year]
      );
      studentsRequiring = Number(stu?.total || 0);
    }

    const [consumptionTrend] = await promisePool.query(
      `SELECT DATE_FORMAT(o.out_date, '%b') AS month_label,
              MONTH(o.out_date) AS month_num,
              COALESCE(SUM(o.meters_out), 0) AS meters
       FROM store_fabric_stockouts o
       WHERE o.school_id = ? AND o.deleted_at IS NULL
         AND o.out_date >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
       GROUP BY MONTH(o.out_date), DATE_FORMAT(o.out_date, '%b')
       ORDER BY month_num`,
      [schoolId]
    );

    let demandByClass = [];
    if (year) {
      const [rows] = await promisePool.query(
        `SELECT TRIM(class_name) AS class_name, COUNT(*) AS count
         FROM students
         WHERE school_id = ? AND TRIM(COALESCE(academic_year, '')) = ?
           AND TRIM(COALESCE(class_name, '')) <> ''
         GROUP BY TRIM(class_name) ORDER BY count DESC LIMIT 12`,
        [schoolId, year]
      );
      const total = rows.reduce((s, r) => s + Number(r.count || 0), 0) || 1;
      demandByClass = rows.map((r) => ({
        name: r.class_name,
        value: Number(r.count || 0),
        percent: Math.round((Number(r.count || 0) / total) * 100),
      }));
    }

    const [mostProduced] = await promisePool.query(
      `SELECT uniform_name AS name, COALESCE(SUM(produced), 0) AS qty
       FROM store_fabric_planner_consumption
       WHERE school_id = ? AND deleted_at IS NULL
       GROUP BY uniform_name ORDER BY qty DESC LIMIT 8`,
      [schoolId]
    );

    const [lowFabric] = await promisePool.query(
      `SELECT fabric_type, color, remaining_meters
       FROM store_fabric_receipts
       WHERE school_id = ? AND deleted_at IS NULL AND remaining_meters > 0 AND remaining_meters < 100
       ORDER BY remaining_meters ASC LIMIT 5`,
      [schoolId]
    );

    const [recentPlans] = await promisePool.query(
      `SELECT p.id, p.plan_no, p.fabric_type, p.student_total, p.status, p.reserved_fabric,
              p.required_fabric, p.remaining_fabric, p.created_at
       FROM store_fabric_planner_production_plans p
       WHERE p.school_id = ?
       ${year ? 'AND p.planner_id IN (SELECT id FROM store_fabric_planners WHERE school_id = ? AND academic_year = ?)' : ''}
       ORDER BY p.id DESC LIMIT 10`,
      year ? [schoolId, schoolId, year] : [schoolId]
    );

    const [pendingPlans] = await promisePool.query(
      `SELECT p.id, p.plan_no, p.status FROM store_fabric_planner_production_plans p
       WHERE p.school_id = ? AND p.status = 'draft'
       ORDER BY p.id DESC LIMIT 5`,
      [schoolId]
    );

    const planner = year ? await loadPlannerBundle(schoolId, year) : null;
    let expectedUniforms = 0;
    let fabricShortage = 0;
    if (planner?.uniformTypes?.length && planner.availableFabric) {
      const primary = planner.uniformTypes[0];
      const per = num(primary.metersPerChild) || 1;
      expectedUniforms = Math.floor(num(planner.availableFabric) / per);
      const demand = planner.uniformTypes.reduce((s, u) => {
        const students = (planner.selectedClasses || []).reduce(
          (sum, cls) => sum + Number(planner.classCounts[cls] || 0),
          0
        );
        return s + students * num(u.metersPerChild);
      }, 0);
      const withWaste = demand * (1 + num(planner.wasteAllowance) / 100);
      if (withWaste > num(planner.availableFabric)) {
        fabricShortage = Math.round((withWaste - num(planner.availableFabric)) * 10) / 10;
      }
    } else if (fabricAvailable > 0) {
      expectedUniforms = Math.floor(fabricAvailable / 1.5);
    }

    const alerts = [];
    lowFabric.forEach((f) => {
      alerts.push({
        type: 'warning',
        message: `${f.fabric_type}${f.color ? ` (${f.color})` : ''} below 100m — ${num(f.remaining_meters)}m left`,
      });
    });
    if (fabricShortage > 0) {
      alerts.push({ type: 'danger', message: `Fabric shortage: ${fabricShortage}m needed for current plan` });
    }
    pendingPlans.forEach((p) => {
      alerts.push({ type: 'info', message: `Production plan ${p.plan_no || `#${p.id}`} pending approval` });
    });

    return {
      kpis: {
        totalFabricStock,
        fabricReserved,
        fabricAvailable,
        expectedUniforms,
        studentsRequiring,
        fabricShortage,
      },
      consumptionTrend: consumptionTrend.map((r) => ({
        month: r.month_label,
        meters: num(r.meters),
      })),
      demandByClass,
      mostProduced: mostProduced.map((r) => ({ name: r.name, qty: Number(r.qty || 0) })),
      alerts,
      recentPlans: recentPlans.map((p) => ({
        id: p.id,
        planNo: p.plan_no || `PLAN-${p.id}`,
        fabric: p.fabric_type || '—',
        students: Number(p.student_total || 0),
        status: p.status || 'draft',
        reservedFabric: num(p.reserved_fabric),
        requiredFabric: num(p.required_fabric),
        remainingFabric: num(p.remaining_fabric),
        createdAt: p.created_at,
      })),
      planner,
    };
  }

  // GET /store/fabric-planner/dashboard
  router.get('/store/fabric-planner/dashboard', requireRole(STORE_READ_ROLES), async (req, res) => {
    try {
      const { schoolId } = req.ctx;
      const academicYear = trimStr(req.query.academic_year || '');
      const data = await loadDashboard(schoolId, academicYear);
      res.json({ success: true, data });
    } catch (e) {
      console.error('[store/fabric-planner/dashboard GET]:', e.message);
      res.status(500).json({ success: false, message: 'Failed to load fabric planner dashboard' });
    }
  });

  // GET /store/fabric-planner
  router.get('/store/fabric-planner', requireRole(STORE_READ_ROLES), async (req, res) => {
    try {
      const { schoolId } = req.ctx;
      const academicYear = trimStr(req.query.academic_year || '');
      if (!academicYear) {
        return res.status(400).json({ success: false, message: 'academic_year is required' });
      }
      const data = await loadPlannerBundle(schoolId, academicYear);
      res.json({
        success: true,
        data: data || {
          academicYear,
          fabricType: '',
          availableFabric: '',
          fabricReceiptId: '',
          selectedClasses: [],
          classCounts: {},
          uniformTypes: [],
          productionPlan: null,
          consumptionRecords: [],
        },
      });
    } catch (e) {
      console.error('[store/fabric-planner GET]:', e.message);
      res.status(500).json({ success: false, message: 'Failed to load fabric planner' });
    }
  });

  // PUT /store/fabric-planner
  router.put('/store/fabric-planner', requireRole(STORE_WRITE_ROLES), async (req, res) => {
    const conn = await promisePool.getConnection();
    try {
      const { schoolId, userId, roleCode } = req.ctx;
      const p = req.body || {};
      const academicYear = trimStr(p.academic_year || '');
      if (!academicYear) {
        return res.status(400).json({ success: false, message: 'academic_year is required' });
      }

      const selectedClasses = Array.isArray(p.selected_classes) ? p.selected_classes.map(trimStr).filter(Boolean) : [];
      const classCounts = p.class_counts && typeof p.class_counts === 'object' ? p.class_counts : {};
      const uniformTypes = Array.isArray(p.uniform_types) ? p.uniform_types : [];

      await conn.beginTransaction();
      const plannerId = await getOrCreatePlanner(schoolId, academicYear, conn);

      const colorAllocations = p.color_allocations || p.colorAllocations || null;
      await conn.query(
        `UPDATE store_fabric_planners
         SET fabric_roll_name = ?, fabric_type = ?, available_fabric = ?, fabric_receipt_id = ?,
             supplier_name = ?, cost_per_meter = ?, waste_allowance = ?, color_allocations = ?, term = ?
         WHERE id = ? AND school_id = ?`,
        [
          trimStr(p.fabric_roll_name || p.fabricRollName) || null,
          trimStr(p.fabric_type || p.fabricType) || null,
          p.available_fabric === '' || p.available_fabric == null ? null : num(p.available_fabric ?? p.availableFabric),
          p.fabric_receipt_id || p.fabricReceiptId ? Number(p.fabric_receipt_id || p.fabricReceiptId) : null,
          trimStr(p.supplier_name || p.supplierName) || null,
          p.cost_per_meter != null || p.costPerMeter != null ? num(p.cost_per_meter ?? p.costPerMeter) : null,
          num(p.waste_allowance ?? p.wasteAllowance),
          colorAllocations ? JSON.stringify(colorAllocations) : null,
          trimStr(p.term || '') || null,
          plannerId,
          schoolId,
        ]
      );

      await conn.query(
        `DELETE FROM store_fabric_planner_classes WHERE planner_id = ? AND school_id = ?`,
        [plannerId, schoolId]
      );
      for (const cls of selectedClasses) {
        await conn.query(
          `INSERT INTO store_fabric_planner_classes (planner_id, school_id, class_name, student_count)
           VALUES (?, ?, ?, ?)`,
          [plannerId, schoolId, cls, Number(classCounts[cls] || 0)]
        );
      }

      const [existingUniforms] = await conn.query(
        `SELECT id FROM store_fabric_planner_uniform_types WHERE planner_id = ? AND school_id = ?`,
        [plannerId, schoolId]
      );
      const existingIds = existingUniforms.map((r) => r.id);
      if (existingIds.length) {
        await conn.query(
          `DELETE FROM store_fabric_planner_class_meters
           WHERE school_id = ? AND uniform_type_id IN (?)`,
          [schoolId, existingIds]
        );
      }
      await conn.query(
        `DELETE FROM store_fabric_planner_uniform_types WHERE planner_id = ? AND school_id = ?`,
        [plannerId, schoolId]
      );

      let sortOrder = 0;
      for (const u of uniformTypes) {
        const name = trimStr(u.name || u.uniform_name);
        if (!name) continue;
        const [ins] = await conn.query(
          `INSERT INTO store_fabric_planner_uniform_types
           (planner_id, school_id, uniform_name, meters_per_child, per_class_mode, sort_order)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [
            plannerId,
            schoolId,
            name,
            num(u.meters_per_child ?? u.metersPerChild, 0),
            u.per_class_mode || u.perClassMode ? 1 : 0,
            sortOrder++,
          ]
        );
        const uniformTypeId = ins.insertId;
        const classMeters = u.class_meters || u.classMeters || {};
        if (u.per_class_mode || u.perClassMode) {
          for (const cls of selectedClasses) {
            const meters = classMeters[cls];
            if (meters == null || meters === '') continue;
            await conn.query(
              `INSERT INTO store_fabric_planner_class_meters (uniform_type_id, school_id, class_name, meters)
               VALUES (?, ?, ?, ?)`,
              [uniformTypeId, schoolId, cls, num(meters)]
            );
          }
        }
      }

      await conn.commit();

      await appendAuditLog({
        schoolId,
        userId,
        roleCode,
        endpoint: '/store/fabric-planner',
        entityType: 'store_fabric_planner',
        entityId: plannerId,
        action: 'save',
        afterState: { academic_year: academicYear, classes: selectedClasses.length },
      });

      const data = await loadPlannerBundle(schoolId, academicYear);
      res.json({ success: true, message: 'Fabric planner saved', data });
    } catch (e) {
      await conn.rollback();
      console.error('[store/fabric-planner PUT]:', e.message);
      res.status(500).json({ success: false, message: e.message || 'Failed to save fabric planner' });
    } finally {
      conn.release();
    }
  });

  // POST /store/fabric-planner/production-plan
  router.post('/store/fabric-planner/production-plan', requireRole(STORE_WRITE_ROLES), async (req, res) => {
    const conn = await promisePool.getConnection();
    try {
      const { schoolId, userId, roleCode } = req.ctx;
      const p = req.body || {};
      const academicYear = trimStr(p.academic_year || '');
      if (!academicYear) {
        return res.status(400).json({ success: false, message: 'academic_year is required' });
      }
      const items = Array.isArray(p.items) ? p.items : [];
      if (!items.length) {
        return res.status(400).json({ success: false, message: 'items are required' });
      }

      const reservedFabric = num(p.reserved_fabric ?? p.reservedFabric);
      const studentTotal = Number(p.student_total ?? p.studentTotal ?? 0);
      const fabricReceiptId = p.fabric_receipt_id || p.fabricReceiptId ? Number(p.fabric_receipt_id || p.fabricReceiptId) : null;
      const status = trimStr(p.status || 'draft') || 'draft';
      const fabricType = trimStr(p.fabric_type || p.fabricType) || null;
      const requiredFabric = num(p.required_fabric ?? p.requiredFabric);
      const remainingFabric = num(p.remaining_fabric ?? p.remainingFabric);
      const classesJson = p.classes || p.selected_classes || p.selectedClasses || [];
      const reserveNow = status === 'approved' || status === 'in_production' || p.reserve_fabric;

      await conn.beginTransaction();
      const plannerId = await getOrCreatePlanner(schoolId, academicYear, conn);
      const planNo = await nextPlanNo(schoolId, academicYear);

      let fabricStockoutId = null;
      if (reserveNow && fabricReceiptId && reservedFabric > 0) {
        const note = `Fabric planner: ${items.map((it) => `${it.quantity}× ${it.name || it.uniform_name}`).join(', ')}`;
        const stockoutResult = await recordFabricStockout(conn, {
          schoolId,
          fabricReceiptId,
          metersOut: reservedFabric,
          purpose: 'Production',
          note,
          outDate: new Date().toISOString().slice(0, 10),
        });
        fabricStockoutId = stockoutResult?.id || null;
      }

      const [planIns] = await conn.query(
        `INSERT INTO store_fabric_planner_production_plans
         (planner_id, school_id, plan_no, status, fabric_type, classes_json,
          reserved_fabric, required_fabric, remaining_fabric, student_total, fabric_stockout_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          plannerId,
          schoolId,
          planNo,
          status,
          fabricType,
          JSON.stringify(classesJson),
          reserveNow ? reservedFabric : 0,
          requiredFabric,
          remainingFabric,
          studentTotal,
          fabricStockoutId,
        ]
      );
      const planId = planIns.insertId;

      for (const it of items) {
        const name = trimStr(it.name || it.uniform_name);
        if (!name) continue;
        await conn.query(
          `INSERT INTO store_fabric_planner_plan_items (plan_id, uniform_name, quantity, meters_per_child)
           VALUES (?, ?, ?, ?)`,
          [planId, name, Number(it.quantity || 0), num(it.meters_per_child ?? it.metersPerChild)]
        );
      }

      await conn.commit();

      await appendAuditLog({
        schoolId,
        userId,
        roleCode,
        endpoint: '/store/fabric-planner/production-plan',
        entityType: 'store_fabric_planner_plan',
        entityId: planId,
        action: 'create',
        afterState: { reserved_fabric: reservedFabric, student_total: studentTotal },
      });

      const data = await loadPlannerBundle(schoolId, academicYear);
      res.status(201).json({
        success: true,
        message: fabricStockoutId ? 'Production plan created and fabric reserved' : 'Production plan created',
        data,
        plan_no: planNo,
        fabric_stockout_id: fabricStockoutId,
      });
    } catch (e) {
      await conn.rollback();
      console.error('[store/fabric-planner/production-plan POST]:', e.message);
      res.status(500).json({ success: false, message: e.message || 'Failed to create production plan' });
    } finally {
      conn.release();
    }
  });

  // POST /store/fabric-planner/consumption
  router.post('/store/fabric-planner/consumption', requireRole(STORE_WRITE_ROLES), async (req, res) => {
    try {
      const { schoolId, userId, roleCode } = req.ctx;
      const p = req.body || {};
      const academicYear = trimStr(p.academic_year || '');
      const uniformName = trimStr(p.uniform_name || p.uniform);
      const produced = Number(p.produced || 0);
      const distributed = Number(p.distributed || 0);
      if (!academicYear) return res.status(400).json({ success: false, message: 'academic_year is required' });
      if (!uniformName) return res.status(400).json({ success: false, message: 'uniform is required' });
      if (produced <= 0) return res.status(400).json({ success: false, message: 'produced must be greater than 0' });

      const plannerId = await getOrCreatePlanner(schoolId, academicYear);
      const [ins] = await promisePool.query(
        `INSERT INTO store_fabric_planner_consumption (planner_id, school_id, uniform_name, produced, distributed)
         VALUES (?, ?, ?, ?, ?)`,
        [plannerId, schoolId, uniformName, produced, distributed]
      );

      await appendAuditLog({
        schoolId,
        userId,
        roleCode,
        endpoint: '/store/fabric-planner/consumption',
        entityType: 'store_fabric_planner_consumption',
        entityId: ins.insertId,
        action: 'create',
        afterState: { uniform_name: uniformName, produced },
      });

      const data = await loadPlannerBundle(schoolId, academicYear);
      res.status(201).json({ success: true, message: 'Consumption recorded', data });
    } catch (e) {
      console.error('[store/fabric-planner/consumption POST]:', e.message);
      res.status(500).json({ success: false, message: e.message || 'Failed to record consumption' });
    }
  });

  function parseClassesJson(raw) {
    try {
      const v = typeof raw === 'string' ? JSON.parse(raw) : raw;
      return Array.isArray(v) ? v : [];
    } catch {
      return [];
    }
  }

  function mapPlanSummary(row) {
    return {
      id: row.id,
      plannerId: row.planner_id,
      planNo: row.plan_no || `PLAN-${row.id}`,
      academicYear: row.academic_year || '',
      term: row.term || '',
      fabricType: row.fabric_type || row.planner_fabric_type || '',
      fabricRollName: row.fabric_roll_name || '',
      supplierName: row.supplier_name || '',
      students: Number(row.student_total || 0),
      status: row.status || 'draft',
      reservedFabric: num(row.reserved_fabric),
      requiredFabric: num(row.required_fabric),
      remainingFabric: num(row.remaining_fabric),
      availableFabric: row.available_fabric != null ? num(row.available_fabric) : null,
      costPerMeter: row.cost_per_meter != null ? num(row.cost_per_meter) : null,
      wasteAllowance: row.waste_allowance != null ? num(row.waste_allowance) : null,
      classes: parseClassesJson(row.classes_json),
      createdAt: row.created_at,
    };
  }

  async function loadPlanDetail(schoolId, planId) {
    const [[row]] = await promisePool.query(
      `SELECT p.*, pl.academic_year, pl.term, pl.fabric_roll_name, pl.fabric_type AS planner_fabric_type,
              pl.available_fabric, pl.supplier_name, pl.cost_per_meter, pl.waste_allowance, pl.fabric_receipt_id
       FROM store_fabric_planner_production_plans p
       INNER JOIN store_fabric_planners pl ON pl.id = p.planner_id AND pl.school_id = p.school_id
       WHERE p.id = ? AND p.school_id = ? LIMIT 1`,
      [planId, schoolId]
    );
    if (!row) return null;
    const [items] = await promisePool.query(
      `SELECT uniform_name, quantity, meters_per_child FROM store_fabric_planner_plan_items WHERE plan_id = ? ORDER BY id`,
      [planId]
    );
    const [classRows] = await promisePool.query(
      `SELECT class_name, student_count FROM store_fabric_planner_classes
       WHERE planner_id = ? AND school_id = ? ORDER BY class_name`,
      [row.planner_id, schoolId]
    );
    const [consumptionRows] = await promisePool.query(
      `SELECT id, uniform_name, produced, distributed, recorded_at
       FROM store_fabric_planner_consumption
       WHERE planner_id = ? AND school_id = ? AND deleted_at IS NULL ORDER BY recorded_at DESC`,
      [row.planner_id, schoolId]
    );
    const planner = await loadPlannerBundle(schoolId, row.academic_year);
    return {
      ...mapPlanSummary(row),
      fabricReceiptId: row.fabric_receipt_id || '',
      items: items.map((it) => ({
        name: it.uniform_name,
        quantity: Number(it.quantity || 0),
        metersPerChild: num(it.meters_per_child),
      })),
      classDetails: classRows.map((c) => ({
        className: c.class_name,
        studentCount: Number(c.student_count || 0),
      })),
      consumptionRecords: consumptionRows.map((r) => ({
        id: r.id,
        uniform: r.uniform_name,
        produced: Number(r.produced || 0),
        distributed: Number(r.distributed || 0),
        recordedAt: r.recorded_at,
      })),
      planner,
    };
  }

  // GET /store/fabric-planner/plans
  router.get('/store/fabric-planner/plans', requireRole(STORE_READ_ROLES), async (req, res) => {
    try {
      const { schoolId } = req.ctx;
      const academicYear = trimStr(req.query.academic_year || '');
      const status = trimStr(req.query.status || '');
      const params = [schoolId];
      let sql = `
        SELECT p.*, pl.academic_year, pl.term, pl.fabric_roll_name, pl.fabric_type AS planner_fabric_type,
               pl.available_fabric, pl.supplier_name, pl.cost_per_meter, pl.waste_allowance
        FROM store_fabric_planner_production_plans p
        INNER JOIN store_fabric_planners pl ON pl.id = p.planner_id AND pl.school_id = p.school_id
        WHERE p.school_id = ?`;
      if (academicYear) {
        sql += ' AND pl.academic_year = ?';
        params.push(academicYear);
      }
      if (status) {
        sql += ' AND p.status = ?';
        params.push(status);
      }
      sql += ' ORDER BY p.id DESC LIMIT 200';
      const [rows] = await promisePool.query(sql, params);
      res.json({ success: true, data: rows.map(mapPlanSummary) });
    } catch (e) {
      console.error('[store/fabric-planner/plans GET]:', e.message);
      res.status(500).json({ success: false, message: 'Failed to load plans' });
    }
  });

  // GET /store/fabric-planner/plans/:id
  router.get('/store/fabric-planner/plans/:id', requireRole(STORE_READ_ROLES), async (req, res) => {
    try {
      const { schoolId } = req.ctx;
      const id = Number(req.params.id);
      if (!id) return res.status(400).json({ success: false, message: 'Invalid id' });
      const data = await loadPlanDetail(schoolId, id);
      if (!data) return res.status(404).json({ success: false, message: 'Plan not found' });
      res.json({ success: true, data });
    } catch (e) {
      console.error('[store/fabric-planner/plans/:id GET]:', e.message);
      res.status(500).json({ success: false, message: 'Failed to load plan' });
    }
  });

  // DELETE /store/fabric-planner/plans/:id
  router.delete('/store/fabric-planner/plans/:id', requireRole(STORE_WRITE_ROLES), async (req, res) => {
    try {
      const { schoolId, userId, roleCode } = req.ctx;
      const id = Number(req.params.id);
      if (!id) return res.status(400).json({ success: false, message: 'Invalid id' });
      const [[plan]] = await promisePool.query(
        `SELECT id, plan_no, status FROM store_fabric_planner_production_plans WHERE id = ? AND school_id = ?`,
        [id, schoolId]
      );
      if (!plan) return res.status(404).json({ success: false, message: 'Plan not found' });
      if (['approved', 'in_production', 'completed', 'distributed'].includes(plan.status)) {
        return res.status(400).json({ success: false, message: 'Cannot delete an approved or active plan' });
      }
      await promisePool.query(`DELETE FROM store_fabric_planner_plan_items WHERE plan_id = ?`, [id]);
      await promisePool.query(`DELETE FROM store_fabric_planner_production_plans WHERE id = ? AND school_id = ?`, [id, schoolId]);
      await appendAuditLog({
        schoolId,
        userId,
        roleCode,
        endpoint: '/store/fabric-planner/plans/:id',
        entityType: 'store_fabric_planner_plan',
        entityId: id,
        action: 'delete',
        afterState: { plan_no: plan.plan_no },
      });
      res.json({ success: true, message: 'Plan deleted' });
    } catch (e) {
      console.error('[store/fabric-planner/plans/:id DELETE]:', e.message);
      res.status(500).json({ success: false, message: 'Failed to delete plan' });
    }
  });

  // PATCH /store/fabric-planner/plans/:id/status
  router.patch('/store/fabric-planner/plans/:id/status', requireRole(STORE_WRITE_ROLES), async (req, res) => {
    const conn = await promisePool.getConnection();
    try {
      const { schoolId, userId, roleCode } = req.ctx;
      const id = Number(req.params.id);
      const status = trimStr(req.body?.status || '');
      const academicYear = trimStr(req.body?.academic_year || req.query?.academic_year || '');
      if (!id || !status) return res.status(400).json({ success: false, message: 'id and status are required' });

      await conn.beginTransaction();
      const [[plan]] = await conn.query(
        `SELECT p.*, pl.fabric_receipt_id, pl.academic_year
         FROM store_fabric_planner_production_plans p
         INNER JOIN store_fabric_planners pl ON pl.id = p.planner_id AND pl.school_id = p.school_id
         WHERE p.id = ? AND p.school_id = ? FOR UPDATE`,
        [id, schoolId]
      );
      if (!plan) {
        await conn.rollback();
        return res.status(404).json({ success: false, message: 'Plan not found' });
      }

      let fabricStockoutId = plan.fabric_stockout_id;
      if (status === 'approved' && !fabricStockoutId && plan.fabric_receipt_id && num(plan.required_fabric) > 0) {
        const stockoutResult = await recordFabricStockout(conn, {
          schoolId,
          fabricReceiptId: plan.fabric_receipt_id,
          metersOut: num(plan.required_fabric),
          purpose: 'Production',
          note: `Approved plan ${plan.plan_no || id}`,
          outDate: new Date().toISOString().slice(0, 10),
        });
        fabricStockoutId = stockoutResult.id;
      }

      await conn.query(
        `UPDATE store_fabric_planner_production_plans
         SET status = ?, reserved_fabric = CASE WHEN ? = 'approved' THEN COALESCE(required_fabric, reserved_fabric) ELSE reserved_fabric END,
             fabric_stockout_id = COALESCE(?, fabric_stockout_id)
         WHERE id = ? AND school_id = ?`,
        [status, status, fabricStockoutId, id, schoolId]
      );
      await conn.commit();

      await appendAuditLog({
        schoolId,
        userId,
        roleCode,
        endpoint: '/store/fabric-planner/plans/:id/status',
        entityType: 'store_fabric_planner_plan',
        entityId: id,
        action: 'status_update',
        afterState: { status },
      });

      const year = academicYear || plan.academic_year;
      const data = year ? await loadPlannerBundle(schoolId, year) : null;
      res.json({ success: true, message: 'Plan status updated', data });
    } catch (e) {
      await conn.rollback();
      console.error('[store/fabric-planner/plans/:id/status PATCH]:', e.message);
      res.status(500).json({ success: false, message: e.message || 'Failed to update plan status' });
    } finally {
      conn.release();
    }
  });

  // DELETE /store/fabric-planner/consumption/:id
  router.delete('/store/fabric-planner/consumption/:id', requireRole(STORE_WRITE_ROLES), async (req, res) => {
    try {
      const { schoolId, userId, roleCode } = req.ctx;
      const id = Number(req.params.id);
      const academicYear = trimStr(req.query.academic_year || '');
      if (!id) return res.status(400).json({ success: false, message: 'Invalid id' });

      const [r] = await promisePool.query(
        `UPDATE store_fabric_planner_consumption c
         INNER JOIN store_fabric_planners p ON p.id = c.planner_id AND p.school_id = c.school_id
         SET c.deleted_at = NOW()
         WHERE c.id = ? AND c.school_id = ? AND c.deleted_at IS NULL`,
        [id, schoolId]
      );
      if (!r.affectedRows) return res.status(404).json({ success: false, message: 'Record not found' });

      await appendAuditLog({
        schoolId,
        userId,
        roleCode,
        endpoint: '/store/fabric-planner/consumption/:id',
        entityType: 'store_fabric_planner_consumption',
        entityId: id,
        action: 'soft_delete',
        afterState: { deleted_at: true },
      });

      const data = academicYear ? await loadPlannerBundle(schoolId, academicYear) : null;
      res.json({ success: true, message: 'Consumption removed', data });
    } catch (e) {
      console.error('[store/fabric-planner/consumption DELETE]:', e.message);
      res.status(500).json({ success: false, message: 'Failed to delete consumption' });
    }
  });
};
