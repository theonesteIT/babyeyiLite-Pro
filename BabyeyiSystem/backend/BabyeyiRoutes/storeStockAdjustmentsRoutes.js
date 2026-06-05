'use strict';

/** Stock adjustments across inventory, food batches, and other batches. */

function mountStoreStockAdjustmentsRoutes(router, deps) {
  const {
    promisePool,
    appendAuditLog,
    requireRole,
    STORE_READ_ROLES,
    STORE_WRITE_ROLES,
    toMoney,
    parseSupplierDate,
    appendFoodStockDateFilters,
  } = deps;

  const REASONS = ['Damaged', 'Expired', 'Lost', 'Returned', 'Correction', 'Other'];
  const MODES = ['decrease', 'increase', 'set'];

  function payloadFromBody(body = {}) {
    const mode = String(body.mode || body.adjustment_mode || 'decrease').toLowerCase();
    let reason = String(body.reason || '').trim();
    const reasonOther = String(body.reason_other || '').trim();
    if (reason === 'Other' && reasonOther) reason = reasonOther;
    if (!reason) reason = 'Correction';
    return {
      source_type: String(body.source_type || '').toLowerCase(),
      source_id: Number(body.source_id),
      mode: MODES.includes(mode) ? mode : 'decrease',
      quantity: toMoney(body.quantity),
      reason,
      note: String(body.note || '').trim() || null,
      adjustment_date: parseSupplierDate(body.adjustment_date || body.date),
      academic_year: String(body.academic_year || '').trim() || null,
      term: String(body.term || '').trim() || null,
    };
  }

  function mapRow(row) {
    return {
      id: row.id,
      source_type: row.source_type,
      source_id: row.source_id,
      item_name: row.item_name,
      category: row.category || '',
      unit: row.unit || '',
      mode: row.mode,
      reason: row.reason,
      note: row.note,
      quantity: Number(row.quantity || 0),
      quantity_before: Number(row.quantity_before || 0),
      quantity_after: Number(row.quantity_after || 0),
      academic_year: row.academic_year,
      term: row.term,
      adjustment_date: row.adjustment_date,
      created_at: row.created_at,
    };
  }

  async function loadSource(conn, schoolId, sourceType, sourceId) {
    if (sourceType === 'inventory') {
      const [[row]] = await conn.query(
        `SELECT id, name AS item_name, category, unit, quantity
         FROM store_inventory_items
         WHERE id = ? AND school_id = ? AND deleted_at IS NULL LIMIT 1`,
        [sourceId, schoolId]
      );
      if (!row) return null;
      return {
        source_type: 'inventory',
        source_id: row.id,
        item_name: row.item_name,
        category: row.category || 'Other',
        unit: row.unit || 'pcs',
        qty: Number(row.quantity || 0),
        table: 'inventory',
      };
    }
    if (sourceType === 'food') {
      const [[row]] = await conn.query(
        `SELECT id, item_name, unit_type AS unit, remaining_quantity AS quantity
         FROM store_food_stock_ins
         WHERE id = ? AND school_id = ? AND deleted_at IS NULL LIMIT 1`,
        [sourceId, schoolId]
      );
      if (!row) return null;
      return {
        source_type: 'food',
        source_id: row.id,
        item_name: row.item_name,
        category: 'Food',
        unit: row.unit || 'kg',
        qty: Number(row.quantity || 0),
        table: 'food',
      };
    }
    if (sourceType === 'other') {
      const [[row]] = await conn.query(
        `SELECT id, item_name, category, unit_type AS unit, remaining_quantity AS quantity
         FROM store_other_stock_ins
         WHERE id = ? AND school_id = ? AND deleted_at IS NULL LIMIT 1`,
        [sourceId, schoolId]
      );
      if (!row) return null;
      return {
        source_type: 'other',
        source_id: row.id,
        item_name: row.item_name,
        category: row.category || 'Other',
        unit: row.unit || 'pcs',
        qty: Number(row.quantity || 0),
        table: 'other',
      };
    }
    return null;
  }

  async function applyQty(conn, schoolId, src, nextQty) {
    if (src.table === 'inventory') {
      await conn.query(
        `UPDATE store_inventory_items SET quantity = ? WHERE id = ? AND school_id = ? AND deleted_at IS NULL`,
        [nextQty, src.source_id, schoolId]
      );
    } else if (src.table === 'food') {
      await conn.query(
        `UPDATE store_food_stock_ins SET remaining_quantity = ? WHERE id = ? AND school_id = ? AND deleted_at IS NULL`,
        [nextQty, src.source_id, schoolId]
      );
    } else if (src.table === 'other') {
      await conn.query(
        `UPDATE store_other_stock_ins SET remaining_quantity = ? WHERE id = ? AND school_id = ? AND deleted_at IS NULL`,
        [nextQty, src.source_id, schoolId]
      );
    }
  }

  function computeNextQty(before, mode, amount) {
    if (mode === 'set') return Math.max(0, amount);
    if (mode === 'increase') return Math.max(0, before + amount);
    return Math.max(0, before - amount);
  }

  router.get('/store/stock-adjustments', requireRole(STORE_READ_ROLES), async (req, res) => {
    try {
      const { schoolId } = req.ctx;
      let sql = `SELECT * FROM store_stock_adjustments WHERE school_id = ? AND deleted_at IS NULL`;
      const params = [schoolId];
      const year = String(req.query.academic_year || '').trim();
      const term = String(req.query.term || '').trim();
      if (year) {
        sql += ' AND academic_year = ?';
        params.push(year);
      }
      if (term) {
        sql += ' AND term = ?';
        params.push(term);
      }
      sql = appendFoodStockDateFilters(sql, params, req.query, 'adjustment_date');
      sql += ' ORDER BY adjustment_date DESC, id DESC LIMIT 500';
      const [rows] = await promisePool.query(sql, params);
      res.json({ success: true, data: rows.map(mapRow), reasons: REASONS, modes: MODES });
    } catch (e) {
      console.error('[store/stock-adjustments GET]:', e.message);
      res.status(500).json({ success: false, message: 'Failed to load adjustments' });
    }
  });

  router.get('/store/stock-adjustments/sources', requireRole(STORE_READ_ROLES), async (req, res) => {
    try {
      const { schoolId } = req.ctx;
      const [inv] = await promisePool.query(
        `SELECT id, name AS item_name, category, unit, quantity
         FROM store_inventory_items WHERE school_id = ? AND deleted_at IS NULL ORDER BY name`,
        [schoolId]
      );
      const [food] = await promisePool.query(
        `SELECT id, item_name, unit_type AS unit, remaining_quantity AS quantity, receive_date
         FROM store_food_stock_ins WHERE school_id = ? AND deleted_at IS NULL AND remaining_quantity > 0
         ORDER BY item_name`,
        [schoolId]
      );
      const [other] = await promisePool.query(
        `SELECT id, item_name, category, unit_type AS unit, remaining_quantity AS quantity, receive_date
         FROM store_other_stock_ins WHERE school_id = ? AND deleted_at IS NULL AND remaining_quantity > 0
         ORDER BY item_name`,
        [schoolId]
      );
      res.json({
        success: true,
        data: {
          inventory: inv.map((r) => ({
            source_type: 'inventory',
            source_id: r.id,
            item_name: r.item_name,
            category: r.category || 'Other',
            unit: r.unit || 'pcs',
            quantity: Number(r.quantity || 0),
            label: `${r.item_name} (${r.quantity} ${r.unit || 'pcs'})`,
          })),
          food: food.map((r) => ({
            source_type: 'food',
            source_id: r.id,
            item_name: r.item_name,
            category: 'Food',
            unit: r.unit || 'kg',
            quantity: Number(r.quantity || 0),
            label: `${r.item_name} — ${r.quantity} ${r.unit} left`,
          })),
          other: other.map((r) => ({
            source_type: 'other',
            source_id: r.id,
            item_name: r.item_name,
            category: r.category || 'Other',
            unit: r.unit || 'pcs',
            quantity: Number(r.quantity || 0),
            label: `${r.item_name} — ${r.quantity} ${r.unit} (${r.category})`,
          })),
        },
      });
    } catch (e) {
      console.error('[store/stock-adjustments/sources GET]:', e.message);
      res.status(500).json({ success: false, message: 'Failed to load stock sources' });
    }
  });

  router.post('/store/stock-adjustments', requireRole(STORE_WRITE_ROLES), async (req, res) => {
    const conn = await promisePool.getConnection();
    try {
      const { schoolId, userId, roleCode } = req.ctx;
      const p = payloadFromBody(req.body);
      if (!['inventory', 'food', 'other'].includes(p.source_type)) {
        return res.status(400).json({ success: false, message: 'Invalid source_type' });
      }
      if (!p.source_id) return res.status(400).json({ success: false, message: 'source_id is required' });
      if (p.quantity <= 0) return res.status(400).json({ success: false, message: 'quantity must be greater than 0' });
      if (!p.adjustment_date) return res.status(400).json({ success: false, message: 'adjustment_date is required' });

      await conn.beginTransaction();
      const src = await loadSource(conn, schoolId, p.source_type, p.source_id);
      if (!src) {
        await conn.rollback();
        return res.status(404).json({ success: false, message: 'Stock item not found' });
      }
      const before = src.qty;
      const after = computeNextQty(before, p.mode, p.quantity);
      if (p.mode === 'decrease' && p.quantity > before) {
        await conn.rollback();
        return res.status(400).json({
          success: false,
          message: `Cannot decrease by ${p.quantity} — only ${before} ${src.unit} available`,
        });
      }

      await applyQty(conn, schoolId, src, after);
      const [ins] = await conn.query(
        `INSERT INTO store_stock_adjustments
         (school_id, source_type, source_id, item_name, category, unit, mode, reason, note,
          quantity, quantity_before, quantity_after, academic_year, term, adjustment_date)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          schoolId,
          src.source_type,
          src.source_id,
          src.item_name,
          src.category,
          src.unit,
          p.mode,
          p.reason,
          p.note,
          p.quantity,
          before,
          after,
          p.academic_year,
          p.term,
          p.adjustment_date,
        ]
      );
      await conn.commit();
      await appendAuditLog({
        schoolId,
        userId,
        roleCode,
        endpoint: '/store/stock-adjustments',
        entityType: 'store_stock_adjustment',
        entityId: ins.insertId,
        action: 'create',
        afterState: { item_name: src.item_name, mode: p.mode, quantity_after: after },
      });
      res.status(201).json({ success: true, message: 'Adjustment recorded', id: ins.insertId });
    } catch (e) {
      await conn.rollback().catch(() => {});
      console.error('[store/stock-adjustments POST]:', e.message);
      res.status(500).json({ success: false, message: e.message || 'Failed to save adjustment' });
    } finally {
      conn.release();
    }
  });

  router.delete('/store/stock-adjustments/:id', requireRole(STORE_WRITE_ROLES), async (req, res) => {
    const conn = await promisePool.getConnection();
    try {
      const { schoolId, userId, roleCode } = req.ctx;
      const id = Number(req.params.id);
      if (!id) return res.status(400).json({ success: false, message: 'Invalid id' });

      await conn.beginTransaction();
      const [[row]] = await conn.query(
        `SELECT * FROM store_stock_adjustments WHERE id = ? AND school_id = ? AND deleted_at IS NULL FOR UPDATE`,
        [id, schoolId]
      );
      if (!row) {
        await conn.rollback();
        return res.status(404).json({ success: false, message: 'Adjustment not found' });
      }
      const src = await loadSource(conn, schoolId, row.source_type, row.source_id);
      if (src) {
        await applyQty(conn, schoolId, src, Number(row.quantity_before || 0));
      }
      await conn.query(
        `UPDATE store_stock_adjustments SET deleted_at = NOW() WHERE id = ? AND school_id = ?`,
        [id, schoolId]
      );
      await conn.commit();
      await appendAuditLog({
        schoolId,
        userId,
        roleCode,
        endpoint: '/store/stock-adjustments/:id',
        entityType: 'store_stock_adjustment',
        entityId: id,
        action: 'revert',
        afterState: { restored: row.quantity_before },
      });
      res.json({ success: true, message: 'Adjustment reverted' });
    } catch (e) {
      await conn.rollback().catch(() => {});
      console.error('[store/stock-adjustments/:id DELETE]:', e.message);
      res.status(500).json({ success: false, message: 'Failed to revert adjustment' });
    } finally {
      conn.release();
    }
  });
}

module.exports = { mountStoreStockAdjustmentsRoutes };
