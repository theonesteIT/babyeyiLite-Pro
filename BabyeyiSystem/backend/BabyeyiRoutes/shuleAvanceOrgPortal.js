'use strict';

/**
 * ShuleAvance financing partner portal — session role SHULE_AVANCE_PARTNER.
 * Lists babyeyi_payment_intents routed to this organization (JSON payload).
 */

const express = require('express');
const router = express.Router();
const db = require('../config/database');

function pickDepositAccountFromBabyeyiRow(row) {
  let banks = [];
  try {
    const parsed = typeof row?.banks_json === 'string' ? JSON.parse(row.banks_json) : row?.banks_json;
    banks = Array.isArray(parsed) ? parsed : [];
  } catch (_) {
    banks = [];
  }
  const first = banks[0] || {};
  const bank_name = first.bankName || first.bank_name || row?.bank_name || null;
  const account_number = first.accountNumber || first.bank_account_no || row?.bank_account_no || null;
  const account_name = first.accountName || first.bank_account_name || null;
  const bank_branch = first.bankBranch || first.bank_branch || row?.bank_branch || null;
  return { bank_name, account_number, account_name, bank_branch };
}

function requirePartner(req, res, next) {
  if (!req.session?.userId) {
    return res.status(401).json({ success: false, message: 'Not authenticated' });
  }
  const role = String(req.session.roleCode || '').toUpperCase();
  if (role !== 'SHULE_AVANCE_PARTNER') {
    return res.status(403).json({ success: false, message: 'Partner access only' });
  }
  const orgId = Number(req.session.shuleAvanceOrgId || 0);
  if (!orgId) {
    return res.status(403).json({ success: false, message: 'No organization linked to this account' });
  }
  req.shuleAvanceOrgId = orgId;
  next();
}

router.use(requirePartner);

router.get('/me', async (req, res) => {
  try {
    const [rows] = await db.promisePool.execute(
      `SELECT id, org_name, org_type, contact_email, contact_phone, is_active, logo_url
       FROM pro_shule_avance_organizations WHERE id = ? LIMIT 1`,
      [req.shuleAvanceOrgId]
    );
    const org = rows?.[0];
    if (!org) return res.status(404).json({ success: false, message: 'Organization not found' });
    return res.json({ success: true, data: org });
  } catch (e) {
    console.error('[shule-avance-partner/me]', e);
    return res.status(500).json({ success: false, message: 'Failed' });
  }
});

router.get('/requests', async (req, res) => {
  try {
    const orgId = req.shuleAvanceOrgId;
    const [rows] = await db.promisePool.execute(
      `SELECT i.id, i.school_id, i.babyeyi_id, i.total_rwf, i.status, i.invoice_no, i.invoice_status,
              i.payer_name, i.payer_phone, i.payer_email, i.created_at, i.payload_json,
              b.bank_name, b.bank_account_no, b.bank_branch, b.banks_json
       FROM babyeyi_payment_intents i
       LEFT JOIN school_babyeyi b ON b.id = i.babyeyi_id AND b.school_id = i.school_id
       WHERE JSON_UNQUOTE(JSON_EXTRACT(i.payload_json, '$.payment_plan.shule_avance.organization_id')) = ?
       ORDER BY i.created_at DESC
       LIMIT 200`,
      [String(orgId)]
    );
    const list = (rows || []).map((r) => {
      let payload = {};
      try {
        payload = JSON.parse(r.payload_json || '{}');
      } catch (_) {}
      const sa = payload?.payment_plan?.shule_avance || {};
      const deposit = pickDepositAccountFromBabyeyiRow(r);
      return {
        id: r.id,
        school_id: r.school_id,
        babyeyi_id: r.babyeyi_id,
        total_rwf: Number(r.total_rwf || 0),
        intent_status: r.status,
        invoice_no: r.invoice_no,
        invoice_status: r.invoice_status,
        payer_name: r.payer_name,
        payer_phone: r.payer_phone,
        created_at: r.created_at,
        applicant_category: sa.applicant_category || null,
        purpose: sa.purpose || null,
        repayment_months: sa.repayment_period_months || null,
        financing_request_status: sa.financing_request_status || 'SUBMITTED',
        deposit_bank_name: deposit.bank_name,
        deposit_account_number: deposit.account_number,
        deposit_account_name: deposit.account_name,
        deposit_bank_branch: deposit.bank_branch,
      };
    });
    return res.json({ success: true, data: list });
  } catch (e) {
    console.error('[shule-avance-partner/requests]', e);
    return res.status(500).json({ success: false, message: 'Failed to load requests' });
  }
});

router.get('/requests/:id', async (req, res) => {
  try {
    const id = Number(req.params.id || 0);
    if (!id) return res.status(400).json({ success: false, message: 'Invalid id' });
    const orgId = String(req.shuleAvanceOrgId);
    const [rows] = await db.promisePool.execute(
      `SELECT i.*, s.school_name, s.district, s.sector, s.province,
              b.bank_name, b.bank_account_no, b.bank_branch, b.banks_json
       FROM babyeyi_payment_intents i
       LEFT JOIN schools s ON s.id = i.school_id
       LEFT JOIN school_babyeyi b ON b.id = i.babyeyi_id AND b.school_id = i.school_id
       WHERE i.id = ?
         AND JSON_UNQUOTE(JSON_EXTRACT(i.payload_json, '$.payment_plan.shule_avance.organization_id')) = ?
       LIMIT 1`,
      [id, orgId]
    );
    const row = rows?.[0];
    if (!row) return res.status(404).json({ success: false, message: 'Not found' });
    let payload = {};
    try {
      payload = JSON.parse(row.payload_json || '{}');
    } catch (_) {}
    const deposit = pickDepositAccountFromBabyeyiRow(row);
    return res.json({
      success: true,
      data: {
        ...row,
        payload_json: undefined,
        payload,
        deposit_bank_name: deposit.bank_name,
        deposit_account_number: deposit.account_number,
        deposit_account_name: deposit.account_name,
        deposit_bank_branch: deposit.bank_branch,
      },
    });
  } catch (e) {
    console.error('[shule-avance-partner/requests/:id]', e);
    return res.status(500).json({ success: false, message: 'Failed' });
  }
});

router.patch('/requests/:id', async (req, res) => {
  try {
    const id = Number(req.params.id || 0);
    const action = String(req.body?.action || '').toLowerCase();
    const note = String(req.body?.internal_note || '').slice(0, 2000);
    if (!id) return res.status(400).json({ success: false, message: 'Invalid id' });
    const orgId = String(req.shuleAvanceOrgId);

    const [rows] = await db.promisePool.execute(
      `SELECT id, payload_json, invoice_status FROM babyeyi_payment_intents
       WHERE id = ?
         AND JSON_UNQUOTE(JSON_EXTRACT(payload_json, '$.payment_plan.shule_avance.organization_id')) = ?
       LIMIT 1`,
      [id, orgId]
    );
    const row = rows?.[0];
    if (!row) return res.status(404).json({ success: false, message: 'Not found' });

    let payload = {};
    try {
      payload = JSON.parse(row.payload_json || '{}');
    } catch (_) {}
    if (!payload.payment_plan) payload.payment_plan = {};
    if (!payload.payment_plan.shule_avance) payload.payment_plan.shule_avance = {};

    const sa = payload.payment_plan.shule_avance;
    const hist = Array.isArray(sa.approval_history) ? sa.approval_history : [];

    let financing_request_status = sa.financing_request_status || 'SUBMITTED';
    let invoice_status = String(row.invoice_status || 'NOT_PAID').toUpperCase();

    if (action === 'approve') {
      financing_request_status = 'APPROVED';
      invoice_status = 'APPROVED';
    } else if (action === 'reject') {
      financing_request_status = 'REJECTED';
      invoice_status = 'REJECTED';
    } else if (action === 'request_info') {
      financing_request_status = 'NEEDS_MORE_INFO';
    } else if (action === 'mark_disbursed') {
      financing_request_status = 'DISBURSED';
      invoice_status = 'PAID';
    } else {
      return res.status(400).json({ success: false, message: 'Unknown action' });
    }

    hist.push({
      at: new Date().toISOString(),
      action,
      note: note || null,
      by_org_user_id: req.session.userId,
    });
    sa.financing_request_status = financing_request_status;
    sa.approval_history = hist;
    if (note) sa.partner_last_note = note;

    await db.promisePool.execute(
      `UPDATE babyeyi_payment_intents
       SET payload_json = ?, invoice_status = ?,
           invoice_paid_at = CASE WHEN ? = 'PAID' THEN COALESCE(invoice_paid_at, NOW()) ELSE invoice_paid_at END
       WHERE id = ?`,
      [JSON.stringify(payload), invoice_status, invoice_status, id]
    );

    if (action === 'approve') {
      try {
        const payRoutes = require('./publicBabyeyiPay');
        if (typeof payRoutes.__sendShuleAvanceFinancingApplicantEmail === 'function') {
          await payRoutes.__sendShuleAvanceFinancingApplicantEmail(id, 'approved');
        }
      } catch (e) {
        console.warn('[shule-avance-partner] approval email:', e.message);
      }
    }

    return res.json({ success: true, message: 'Updated', data: { financing_request_status, invoice_status } });
  } catch (e) {
    console.error('[shule-avance-partner/patch]', e);
    return res.status(500).json({ success: false, message: 'Update failed' });
  }
});

router.get('/stats', async (req, res) => {
  try {
    const orgId = String(req.shuleAvanceOrgId);
    const [rows] = await db.promisePool.execute(
      `SELECT
         COUNT(*) AS total,
         SUM(CASE WHEN UPPER(COALESCE(invoice_status,'')) = 'PENDING_APPROVAL' THEN 1 ELSE 0 END) AS pending,
         SUM(CASE WHEN UPPER(COALESCE(invoice_status,'')) = 'APPROVED' THEN 1 ELSE 0 END) AS approved,
         SUM(CASE WHEN UPPER(COALESCE(invoice_status,'')) = 'REJECTED' THEN 1 ELSE 0 END) AS rejected,
         SUM(CASE WHEN UPPER(COALESCE(invoice_status,'')) = 'PAID' THEN 1 ELSE 0 END) AS paid
       FROM babyeyi_payment_intents
       WHERE JSON_UNQUOTE(JSON_EXTRACT(payload_json, '$.payment_plan.shule_avance.organization_id')) = ?`,
      [orgId]
    );
    return res.json({ success: true, data: rows?.[0] || {} });
  } catch (e) {
    console.error('[shule-avance-partner/stats]', e);
    return res.status(500).json({ success: false, message: 'Failed' });
  }
});

module.exports = router;
