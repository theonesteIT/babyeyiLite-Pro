'use strict';

/** Other inventory (stationery, lab, etc.) — batch stock-in / stock-out routes. */

function mountStoreOtherInventoryRoutes(router, deps) {
  const {
    promisePool,
    appendAuditLog,
    requireRole,
    STORE_READ_ROLES,
    STORE_WRITE_ROLES,
    toMoney,
    toOptionalMoney,
    parseSupplierDate,
    resolveInventoryCategory,
    appendFoodStockDateFilters,
  } = deps;

  function otherStockInPayloadFromBody(payload = {}) {
    const qty = toMoney(payload.quantity ?? payload.qty);
    const unitCost = toOptionalMoney(payload.unit_cost);
    const totalCost =
      payload.total_cost != null && payload.total_cost !== ''
        ? toMoney(payload.total_cost)
        : qty * (unitCost || 0);
    const remainingRaw = payload.remaining_quantity;
    const remaining =
      remainingRaw === '' || remainingRaw === null || remainingRaw === undefined
        ? qty
        : toMoney(remainingRaw);
    return {
      academic_year: String(payload.academic_year || '').trim() || null,
      term: String(payload.term || '').trim() || null,
      supplier_id: Number(payload.supplier_id) > 0 ? Number(payload.supplier_id) : null,
      receive_date: parseSupplierDate(payload.receive_date ?? payload.purchase_date),
      invoice_number: String(payload.invoice_number || '').trim() || null,
      category: resolveInventoryCategory(payload),
      item_name: String(payload.item_name || payload.name || '').trim(),
      quantity: qty,
      unit_type: String(payload.unit_type || payload.unit || 'pcs').trim() || 'pcs',
      unit_cost: unitCost,
      total_cost: totalCost,
      remaining_quantity: Math.min(remaining, qty),
      min_level: toMoney(payload.min_level ?? payload.reorder_level ?? 0),
      store_location: String(payload.store_location || payload.location || '').trim() || null,
      note: String(payload.note || '').trim() || null,
    };
  }

  function mapOtherStockInRow(row) {
    const qty = Number(row.quantity || 0);
    const remaining = Number(row.remaining_quantity ?? row.quantity ?? 0);
    return {
      id: row.id,
      academic_year: row.academic_year,
      term: row.term,
      supplier_id: row.supplier_id,
      supplier_name: row.supplier_name || null,
      receive_date: row.receive_date,
      invoice_number: row.invoice_number,
      category: row.category,
      item_name: row.item_name,
      quantity: qty,
      unit_type: row.unit_type || 'pcs',
      unit_cost: row.unit_cost != null ? Number(row.unit_cost) : null,
      total_cost: row.total_cost != null ? Number(row.total_cost) : null,
      remaining_quantity: remaining,
      min_level: Number(row.min_level || 0),
      store_location: row.store_location,
      note: row.note,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }

  function otherStockOutPayloadFromBody(payload = {}) {
    const qty = toMoney(payload.quantity ?? payload.qty);
    const stockInId = Number(payload.other_stock_in_id ?? payload.otherStockInId);
    let issuedTo = String(payload.issued_to || payload.issuedTo || '').trim();
    const issuedOther = String(payload.issued_other || payload.issuedOther || '').trim();
    if (issuedTo === 'Other' && issuedOther) issuedTo = issuedOther;
    return {
      other_stock_in_id: stockInId > 0 ? stockInId : null,
      academic_year: String(payload.academic_year || '').trim() || null,
      term: String(payload.term || '').trim() || null,
      issue_date: parseSupplierDate(payload.issue_date ?? payload.consumption_date ?? payload.date),
      quantity: qty,
      unit_type: String(payload.unit_type || payload.unit || '').trim() || null,
      issued_to: issuedTo,
      issued_other: issuedOther || null,
      note: String(payload.note || '').trim() || null,
    };
  }

  function mapOtherStockOutRow(row) {
    return {
      id: row.id,
      other_stock_in_id: row.other_stock_in_id,
      item_name: row.item_name || null,
      category: row.category || null,
      supplier_name: row.supplier_name || null,
      academic_year: row.academic_year,
      term: row.term,
      issue_date: row.issue_date,
      quantity: Number(row.quantity || 0),
      unit_type: row.unit_type || row.stock_unit_type || 'pcs',
      issued_to: row.issued_to,
      issued_other: row.issued_other,
      note: row.note,
      remaining_after: Number(row.remaining_after ?? 0),
      created_at: row.created_at,
    };
  }

  router.get('/store/other-stock-ins', requireRole(STORE_READ_ROLES), async (req, res) => {
    try {
      const { schoolId } = req.ctx;
      const academicYear = String(req.query.academic_year || '').trim();
      const term = String(req.query.term || '').trim();
      let sql = `SELECT r.*, s.name AS supplier_name
         FROM store_other_stock_ins r
         LEFT JOIN store_suppliers s ON s.id = r.supplier_id AND s.school_id = r.school_id AND s.deleted_at IS NULL
         WHERE r.school_id = ? AND r.deleted_at IS NULL`;
      const params = [schoolId];
      if (academicYear) {
        sql += ' AND r.academic_year = ?';
        params.push(academicYear);
      }
      if (term) {
        sql += ' AND r.term = ?';
        params.push(term);
      }
      sql = appendFoodStockDateFilters(sql, params, req.query, 'r.receive_date');
      sql += ' ORDER BY r.receive_date DESC, r.id DESC';
      const [rows] = await promisePool.query(sql, params);
      res.json({ success: true, data: rows.map((r) => mapOtherStockInRow(r)) });
    } catch (e) {
      console.error('[store/other-stock-ins GET]:', e.message);
      res.status(500).json({ success: false, message: 'Failed to load other stock in' });
    }
  });

  router.post('/store/other-stock-ins', requireRole(STORE_WRITE_ROLES), async (req, res) => {
    try {
      const { schoolId, userId, roleCode } = req.ctx;
      const p = otherStockInPayloadFromBody(req.body);
      if (!p.item_name) return res.status(400).json({ success: false, message: 'item_name is required' });
      if (p.quantity <= 0) return res.status(400).json({ success: false, message: 'quantity must be greater than 0' });
      if (p.supplier_id) {
        const [[sup]] = await promisePool.query(
          `SELECT id FROM store_suppliers WHERE id = ? AND school_id = ? AND deleted_at IS NULL LIMIT 1`,
          [p.supplier_id, schoolId]
        );
        if (!sup) return res.status(400).json({ success: false, message: 'Supplier not found' });
      }
      const [ins] = await promisePool.query(
        `INSERT INTO store_other_stock_ins
         (school_id, academic_year, term, supplier_id, receive_date, invoice_number, category,
          item_name, quantity, unit_type, unit_cost, total_cost, remaining_quantity, min_level,
          store_location, note)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          schoolId,
          p.academic_year,
          p.term,
          p.supplier_id,
          p.receive_date,
          p.invoice_number,
          p.category,
          p.item_name,
          p.quantity,
          p.unit_type,
          p.unit_cost,
          p.total_cost,
          p.remaining_quantity,
          p.min_level,
          p.store_location,
          p.note,
        ]
      );
      await appendAuditLog({
        schoolId,
        userId,
        roleCode,
        endpoint: '/store/other-stock-ins',
        entityType: 'store_other_stock_in',
        entityId: ins.insertId,
        action: 'create',
        afterState: { item_name: p.item_name, quantity: p.quantity },
      });
      res.status(201).json({ success: true, message: 'Item received', id: ins.insertId });
    } catch (e) {
      console.error('[store/other-stock-ins POST]:', e.message);
      res.status(500).json({ success: false, message: e.message || 'Failed to save other stock in' });
    }
  });

  router.patch('/store/other-stock-ins/:id', requireRole(STORE_WRITE_ROLES), async (req, res) => {
    try {
      const { schoolId, userId, roleCode } = req.ctx;
      const id = Number(req.params.id);
      if (!id) return res.status(400).json({ success: false, message: 'Invalid id' });
      const p = otherStockInPayloadFromBody(req.body);
      if (!p.item_name) return res.status(400).json({ success: false, message: 'item_name is required' });
      const [[existing]] = await promisePool.query(
        `SELECT id, quantity, remaining_quantity FROM store_other_stock_ins
         WHERE id = ? AND school_id = ? AND deleted_at IS NULL LIMIT 1`,
        [id, schoolId]
      );
      if (!existing) return res.status(404).json({ success: false, message: 'Stock record not found' });
      const issued = Number(existing.quantity || 0) - Number(existing.remaining_quantity || 0);
      if (p.quantity < issued) {
        return res.status(400).json({
          success: false,
          message: `Cannot set quantity below ${issued} already issued`,
        });
      }
      const newRemaining = Math.max(0, p.quantity - issued);
      await promisePool.query(
        `UPDATE store_other_stock_ins SET
          academic_year = ?, term = ?, supplier_id = ?, receive_date = ?, invoice_number = ?,
          category = ?, item_name = ?, quantity = ?, unit_type = ?, unit_cost = ?, total_cost = ?,
          remaining_quantity = ?, min_level = ?, store_location = ?, note = ?
         WHERE id = ? AND school_id = ? AND deleted_at IS NULL`,
        [
          p.academic_year,
          p.term,
          p.supplier_id,
          p.receive_date,
          p.invoice_number,
          p.category,
          p.item_name,
          p.quantity,
          p.unit_type,
          p.unit_cost,
          p.total_cost,
          newRemaining,
          p.min_level,
          p.store_location,
          p.note,
          id,
          schoolId,
        ]
      );
      await appendAuditLog({
        schoolId,
        userId,
        roleCode,
        endpoint: '/store/other-stock-ins/:id',
        entityType: 'store_other_stock_in',
        entityId: id,
        action: 'update',
        afterState: { item_name: p.item_name },
      });
      res.json({ success: true, message: 'Stock updated', remaining_quantity: newRemaining });
    } catch (e) {
      console.error('[store/other-stock-ins/:id PATCH]:', e.message);
      res.status(500).json({ success: false, message: 'Failed to update other stock in' });
    }
  });

  router.delete('/store/other-stock-ins/:id', requireRole(STORE_WRITE_ROLES), async (req, res) => {
    try {
      const { schoolId, userId, roleCode } = req.ctx;
      const id = Number(req.params.id);
      if (!id) return res.status(400).json({ success: false, message: 'Invalid id' });
      const [[row]] = await promisePool.query(
        `SELECT id, quantity, remaining_quantity FROM store_other_stock_ins
         WHERE id = ? AND school_id = ? AND deleted_at IS NULL LIMIT 1`,
        [id, schoolId]
      );
      if (!row) return res.status(404).json({ success: false, message: 'Stock record not found' });
      if (Number(row.remaining_quantity) < Number(row.quantity)) {
        return res.status(400).json({
          success: false,
          message: 'Cannot delete — issues exist for this batch. Remove stock outs first.',
        });
      }
      await promisePool.query(
        `UPDATE store_other_stock_ins SET deleted_at = NOW() WHERE id = ? AND school_id = ?`,
        [id, schoolId]
      );
      await appendAuditLog({
        schoolId,
        userId,
        roleCode,
        endpoint: '/store/other-stock-ins/:id',
        entityType: 'store_other_stock_in',
        entityId: id,
        action: 'soft_delete',
      });
      res.json({ success: true, message: 'Stock record deleted' });
    } catch (e) {
      console.error('[store/other-stock-ins/:id DELETE]:', e.message);
      res.status(500).json({ success: false, message: 'Failed to delete other stock in' });
    }
  });

  router.get('/store/other-stock-outs', requireRole(STORE_READ_ROLES), async (req, res) => {
    try {
      const { schoolId } = req.ctx;
      const academicYear = String(req.query.academic_year || '').trim();
      const term = String(req.query.term || '').trim();
      let sql = `SELECT c.*, r.item_name, r.category, r.unit_type AS stock_unit_type,
                        s.name AS supplier_name
         FROM store_other_stock_outs c
         INNER JOIN store_other_stock_ins r ON r.id = c.other_stock_in_id AND r.school_id = c.school_id AND r.deleted_at IS NULL
         LEFT JOIN store_suppliers s ON s.id = r.supplier_id AND s.school_id = r.school_id AND s.deleted_at IS NULL
         WHERE c.school_id = ? AND c.deleted_at IS NULL`;
      const params = [schoolId];
      if (academicYear) {
        sql += ' AND c.academic_year = ?';
        params.push(academicYear);
      }
      if (term) {
        sql += ' AND c.term = ?';
        params.push(term);
      }
      sql = appendFoodStockDateFilters(sql, params, req.query, 'c.issue_date');
      sql += ' ORDER BY c.issue_date DESC, c.id DESC';
      const [rows] = await promisePool.query(sql, params);
      res.json({ success: true, data: rows.map((r) => mapOtherStockOutRow(r)) });
    } catch (e) {
      console.error('[store/other-stock-outs GET]:', e.message);
      res.status(500).json({ success: false, message: 'Failed to load other stock outs' });
    }
  });

  router.post('/store/other-stock-outs', requireRole(STORE_WRITE_ROLES), async (req, res) => {
    const conn = await promisePool.getConnection();
    try {
      const { schoolId, userId, roleCode } = req.ctx;
      const p = otherStockOutPayloadFromBody(req.body);
      if (!p.other_stock_in_id) return res.status(400).json({ success: false, message: 'other_stock_in_id is required' });
      if (!p.issue_date) return res.status(400).json({ success: false, message: 'issue_date is required' });
      if (!p.issued_to) return res.status(400).json({ success: false, message: 'issued_to is required' });
      if (p.quantity <= 0) return res.status(400).json({ success: false, message: 'quantity must be greater than 0' });

      await conn.beginTransaction();
      const [[stock]] = await conn.query(
        `SELECT id, item_name, unit_type, remaining_quantity, academic_year, term
         FROM store_other_stock_ins
         WHERE id = ? AND school_id = ? AND deleted_at IS NULL
         FOR UPDATE`,
        [p.other_stock_in_id, schoolId]
      );
      if (!stock) {
        await conn.rollback();
        return res.status(404).json({ success: false, message: 'Stock batch not found' });
      }
      const remaining = Number(stock.remaining_quantity || 0);
      if (p.quantity > remaining) {
        await conn.rollback();
        return res.status(400).json({
          success: false,
          message: `Only ${remaining} ${stock.unit_type} available for ${stock.item_name}`,
        });
      }
      const unitType = p.unit_type || stock.unit_type || 'pcs';
      const remainingAfter = Math.max(0, remaining - p.quantity);
      await conn.query(
        `UPDATE store_other_stock_ins SET remaining_quantity = ? WHERE id = ? AND school_id = ?`,
        [remainingAfter, p.other_stock_in_id, schoolId]
      );
      const [ins] = await conn.query(
        `INSERT INTO store_other_stock_outs
         (school_id, other_stock_in_id, academic_year, term, issue_date, quantity, unit_type,
          issued_to, issued_other, note, remaining_after)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          schoolId,
          p.other_stock_in_id,
          p.academic_year || stock.academic_year,
          p.term || stock.term,
          p.issue_date,
          p.quantity,
          unitType,
          p.issued_to,
          p.issued_other,
          p.note,
          remainingAfter,
        ]
      );
      await conn.commit();
      await appendAuditLog({
        schoolId,
        userId,
        roleCode,
        endpoint: '/store/other-stock-outs',
        entityType: 'store_other_stock_out',
        entityId: ins.insertId,
        action: 'create',
        afterState: { other_stock_in_id: p.other_stock_in_id, quantity: p.quantity },
      });
      res.status(201).json({ success: true, message: 'Issue recorded', id: ins.insertId, remaining_after: remainingAfter });
    } catch (e) {
      await conn.rollback().catch(() => {});
      console.error('[store/other-stock-outs POST]:', e.message);
      res.status(500).json({ success: false, message: e.message || 'Failed to record issue' });
    } finally {
      conn.release();
    }
  });

  router.patch('/store/other-stock-outs/:id', requireRole(STORE_WRITE_ROLES), async (req, res) => {
    const conn = await promisePool.getConnection();
    try {
      const { schoolId, userId, roleCode } = req.ctx;
      const id = Number(req.params.id);
      if (!id) return res.status(400).json({ success: false, message: 'Invalid id' });
      const p = otherStockOutPayloadFromBody(req.body);
      if (!p.other_stock_in_id) return res.status(400).json({ success: false, message: 'other_stock_in_id is required' });
      if (!p.issue_date) return res.status(400).json({ success: false, message: 'issue_date is required' });
      if (!p.issued_to) return res.status(400).json({ success: false, message: 'issued_to is required' });
      if (p.quantity <= 0) return res.status(400).json({ success: false, message: 'quantity must be greater than 0' });

      await conn.beginTransaction();
      const [[existing]] = await conn.query(
        `SELECT c.id, c.other_stock_in_id, c.quantity
         FROM store_other_stock_outs c
         WHERE c.id = ? AND c.school_id = ? AND c.deleted_at IS NULL
         FOR UPDATE`,
        [id, schoolId]
      );
      if (!existing) {
        await conn.rollback();
        return res.status(404).json({ success: false, message: 'Issue record not found' });
      }

      const oldStockId = Number(existing.other_stock_in_id);
      const oldQty = Number(existing.quantity || 0);
      const newStockId = Number(p.other_stock_in_id);
      const newQty = Number(p.quantity);

      if (oldStockId !== newStockId) {
        const [[oldStock]] = await conn.query(
          `SELECT id, quantity, remaining_quantity, unit_type, academic_year, term, item_name
           FROM store_other_stock_ins WHERE id = ? AND school_id = ? AND deleted_at IS NULL FOR UPDATE`,
          [oldStockId, schoolId]
        );
        if (oldStock) {
          const restored = Math.min(
            Number(oldStock.quantity || 0),
            Number(oldStock.remaining_quantity || 0) + oldQty
          );
          await conn.query(
            `UPDATE store_other_stock_ins SET remaining_quantity = ? WHERE id = ? AND school_id = ?`,
            [restored, oldStockId, schoolId]
          );
        }
        const [[newStock]] = await conn.query(
          `SELECT id, item_name, quantity, remaining_quantity, unit_type, academic_year, term
           FROM store_other_stock_ins WHERE id = ? AND school_id = ? AND deleted_at IS NULL FOR UPDATE`,
          [newStockId, schoolId]
        );
        if (!newStock) {
          await conn.rollback();
          return res.status(404).json({ success: false, message: 'Stock batch not found' });
        }
        const rem = Number(newStock.remaining_quantity || 0);
        if (newQty > rem) {
          await conn.rollback();
          return res.status(400).json({
            success: false,
            message: `Only ${rem} ${newStock.unit_type} available for ${newStock.item_name}`,
          });
        }
        const remainingAfter = Math.max(0, rem - newQty);
        await conn.query(
          `UPDATE store_other_stock_ins SET remaining_quantity = ? WHERE id = ? AND school_id = ?`,
          [remainingAfter, newStockId, schoolId]
        );
        const unitType = p.unit_type || newStock.unit_type || 'pcs';
        await conn.query(
          `UPDATE store_other_stock_outs SET
           other_stock_in_id = ?, academic_year = ?, term = ?, issue_date = ?,
           quantity = ?, unit_type = ?, issued_to = ?, issued_other = ?, note = ?, remaining_after = ?
           WHERE id = ? AND school_id = ?`,
          [
            newStockId,
            p.academic_year || newStock.academic_year,
            p.term || newStock.term,
            p.issue_date,
            newQty,
            unitType,
            p.issued_to,
            p.issued_other,
            p.note,
            remainingAfter,
            id,
            schoolId,
          ]
        );
      } else {
        const [[stock]] = await conn.query(
          `SELECT id, item_name, quantity, remaining_quantity, unit_type, academic_year, term
           FROM store_other_stock_ins WHERE id = ? AND school_id = ? AND deleted_at IS NULL FOR UPDATE`,
          [newStockId, schoolId]
        );
        if (!stock) {
          await conn.rollback();
          return res.status(404).json({ success: false, message: 'Stock batch not found' });
        }
        const rem = Number(stock.remaining_quantity || 0);
        const maxAllowed = rem + oldQty;
        if (newQty > maxAllowed) {
          await conn.rollback();
          return res.status(400).json({
            success: false,
            message: `Only ${maxAllowed} ${stock.unit_type} available for ${stock.item_name}`,
          });
        }
        const remainingAfter = Math.max(0, rem + oldQty - newQty);
        await conn.query(
          `UPDATE store_other_stock_ins SET remaining_quantity = ? WHERE id = ? AND school_id = ?`,
          [remainingAfter, newStockId, schoolId]
        );
        const unitType = p.unit_type || stock.unit_type || 'pcs';
        await conn.query(
          `UPDATE store_other_stock_outs SET
           academic_year = ?, term = ?, issue_date = ?, quantity = ?, unit_type = ?,
           issued_to = ?, issued_other = ?, note = ?, remaining_after = ?
           WHERE id = ? AND school_id = ?`,
          [
            p.academic_year || stock.academic_year,
            p.term || stock.term,
            p.issue_date,
            newQty,
            unitType,
            p.issued_to,
            p.issued_other,
            p.note,
            remainingAfter,
            id,
            schoolId,
          ]
        );
      }

      await conn.commit();
      await appendAuditLog({
        schoolId,
        userId,
        roleCode,
        endpoint: '/store/other-stock-outs/:id',
        entityType: 'store_other_stock_out',
        entityId: id,
        action: 'update',
        afterState: { quantity: newQty },
      });
      res.json({ success: true, message: 'Issue updated' });
    } catch (e) {
      await conn.rollback().catch(() => {});
      console.error('[store/other-stock-outs/:id PATCH]:', e.message);
      res.status(500).json({ success: false, message: e.message || 'Failed to update issue' });
    } finally {
      conn.release();
    }
  });

  router.delete('/store/other-stock-outs/:id', requireRole(STORE_WRITE_ROLES), async (req, res) => {
    const conn = await promisePool.getConnection();
    try {
      const { schoolId, userId, roleCode } = req.ctx;
      const id = Number(req.params.id);
      if (!id) return res.status(400).json({ success: false, message: 'Invalid id' });

      await conn.beginTransaction();
      const [[row]] = await conn.query(
        `SELECT c.id, c.other_stock_in_id, c.quantity
         FROM store_other_stock_outs c
         WHERE c.id = ? AND c.school_id = ? AND c.deleted_at IS NULL
         FOR UPDATE`,
        [id, schoolId]
      );
      if (!row) {
        await conn.rollback();
        return res.status(404).json({ success: false, message: 'Issue record not found' });
      }
      const [[stock]] = await conn.query(
        `SELECT id, quantity, remaining_quantity FROM store_other_stock_ins
         WHERE id = ? AND school_id = ? AND deleted_at IS NULL FOR UPDATE`,
        [row.other_stock_in_id, schoolId]
      );
      if (stock) {
        const restored = Math.min(
          Number(stock.quantity || 0),
          Number(stock.remaining_quantity || 0) + Number(row.quantity || 0)
        );
        await conn.query(
          `UPDATE store_other_stock_ins SET remaining_quantity = ? WHERE id = ? AND school_id = ?`,
          [restored, row.other_stock_in_id, schoolId]
        );
      }
      await conn.query(
        `UPDATE store_other_stock_outs SET deleted_at = NOW() WHERE id = ? AND school_id = ?`,
        [id, schoolId]
      );
      await conn.commit();
      await appendAuditLog({
        schoolId,
        userId,
        roleCode,
        endpoint: '/store/other-stock-outs/:id',
        entityType: 'store_other_stock_out',
        entityId: id,
        action: 'soft_delete',
        afterState: { restored_quantity: row.quantity },
      });
      res.json({ success: true, message: 'Issue reversed' });
    } catch (e) {
      await conn.rollback().catch(() => {});
      console.error('[store/other-stock-outs/:id DELETE]:', e.message);
      res.status(500).json({ success: false, message: 'Failed to delete issue' });
    } finally {
      conn.release();
    }
  });
}

module.exports = { mountStoreOtherInventoryRoutes };
