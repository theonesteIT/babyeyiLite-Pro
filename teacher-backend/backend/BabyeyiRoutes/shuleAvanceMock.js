/**
 * ShuleAvance — DEMO / mock API (in-memory, resets on server restart).
 * Flow: staff KYC → onboard → invoice request → finance approves → mock disbursement + salary deduction schedule.
 *
 * Routes (all under /api):
 *   GET    /services/shule-avance/status
 *   POST   /services/shule-avance/kyc
 *   POST   /services/shule-avance/onboard
 *   POST   /services/shule-avance/invoice-requests
 *   DELETE /services/shule-avance/invoice-requests/:id
 *   POST   /services/shule-avance/apply          (legacy alias → invoice-requests)
 *   DELETE /services/shule-avance/cancel/:id     (legacy alias → cancel pending)
 *   GET    /services/shule-avance/finance/pending-invoices
 *   PATCH  /services/shule-avance/finance/invoice-requests/:id/approve
 *   PATCH  /services/shule-avance/finance/invoice-requests/:id/reject
 */

const express = require('express');

const router = express.Router();

const STAFF_SUBMIT_ROLES = [
  'TEACHER', 'HOD', 'DOS', 'STORE_MANAGER', 'DISCIPLINE_STAFF', 'LIBRARIAN', 'NURSE', 'SECRETARY',
];

/** @type {Map<string, { kyc: object, onboarded: boolean }>} */
const profiles = new Map();
/** @type {Array<object>} */
let invoiceRequests = [];
let nextReqId = 1;

function key(schoolId, userId) {
  return `${Number(schoolId) || 0}:${Number(userId)}`;
}

function ctx(req) {
  const userId = req.session?.userId || req.session?.user?.id || null;
  const schoolId = req.session?.school_id ?? req.session?.user?.school_id ?? req.session?.user?.school?.id ?? null;
  const role = String(req.session?.roleCode || req.session?.user?.role?.code || '').toUpperCase();
  const user = req.session?.user || null;
  const fullName = user?.full_name || [user?.first_name, user?.last_name].filter(Boolean).join(' ') || user?.email || `User ${userId}`;
  return { userId, schoolId, role, user, fullName };
}

function requireAuth(req, res, next) {
  const { userId } = ctx(req);
  if (!userId) {
    return res.status(401).json({ success: false, message: 'Not authenticated' });
  }
  return next();
}

function canSubmitInvoice(role) {
  return STAFF_SUBMIT_ROLES.includes(role);
}

function isFinanceRole(role) {
  return ['ACCOUNTANT', 'SCHOOL_MANAGER', 'SCHOOL_ADMIN', 'DOS'].includes(role);
}

function getProfile(schoolId, userId) {
  const k = key(schoolId, userId);
  if (!profiles.has(k)) {
    profiles.set(k, {
      kyc: {
        national_id: '',
        phone: '',
        bank_or_mm: '',
        submitted_at: null,
      },
      onboarded: false,
    });
  }
  return profiles.get(k);
}

function maskId(id) {
  const s = String(id || '').replace(/\s/g, '');
  if (s.length < 4) return '—';
  return `***${s.slice(-4)}`;
}

function buildSchedule(totalRwf, months) {
  const m = Math.max(1, Math.min(24, Number(months) || 6));
  const per = Math.ceil(Number(totalRwf) / m);
  const rows = [];
  const now = new Date();
  for (let i = 0; i < m; i += 1) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const payrollMonth = d.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
    const isFirst = i === 0;
    rows.push({
      period: i + 1,
      due_rwf: i === m - 1 ? Number(totalRwf) - per * (m - 1) : per,
      paid_rwf: isFirst ? per : 0,
      status: isFirst ? 'paid' : i === 1 ? 'next' : 'upcoming',
      payroll_month: payrollMonth,
    });
  }
  if (rows.length >= 2) rows[1].status = 'next';
  return rows;
}

function requestsForStaff(schoolId, userId) {
  return invoiceRequests.filter(
    (r) => Number(r.school_id) === Number(schoolId) && Number(r.staff_user_id) === Number(userId)
  );
}

function activeFacilityForStaff(schoolId, userId) {
  const list = requestsForStaff(schoolId, userId).filter((r) => r.status === 'active_repayment');
  return list.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))[0] || null;
}

// ═══════════════════════════════════════════════════════════════
// GET status (staff)
// ═══════════════════════════════════════════════════════════════
router.get('/services/shule-avance/status', requireAuth, (req, res) => {
  try {
    const { userId, schoolId, role, fullName } = ctx(req);
    const prof = getProfile(schoolId, userId);
    const kycComplete = !!(prof.kyc?.national_id && prof.kyc?.phone);
    const requests = requestsForStaff(schoolId, userId).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    const active = activeFacilityForStaff(schoolId, userId);

    let outstanding = {
      total_rwf: 0,
      principal_rwf: 0,
      fees_rwf: 0,
      deducted_to_date_rwf: 0,
      remaining_rwf: 0,
      why_balance: [],
    };
    let repayment_schedule = [];
    let next_payroll_deduction_rwf = 0;
    let next_deduction_date = null;

    if (active) {
      const principal = Number(active.amount_rwf) || 0;
      const fees = Math.round(principal * 0.03);
      const total = principal + fees;
      repayment_schedule = active.repayment_schedule || [];
      const paidSum = repayment_schedule.reduce((s, row) => s + (Number(row.paid_rwf) || 0), 0);
      outstanding = {
        total_rwf: total,
        principal_rwf: principal,
        fees_rwf: fees,
        deducted_to_date_rwf: paidSum,
        remaining_rwf: Math.max(0, total - paidSum),
        why_balance: [
          {
            label: 'Principal (invoice)',
            amount_rwf: principal,
            hint: 'Amount the school or partner paid to settle your uploaded invoice.',
          },
          {
            label: 'Service & admin fee (mock 3%)',
            amount_rwf: fees,
            hint: 'Illustrative platform / partner fee included in what you repay.',
          },
          {
            label: 'Already deducted on payslips',
            amount_rwf: paidSum,
            hint: 'Sum of payroll check-offs posted so far for this facility.',
          },
          {
            label: 'Still to repay',
            amount_rwf: Math.max(0, total - paidSum),
            hint: 'This is what remains before the facility is fully closed.',
          },
        ],
      };
      const nextRow = repayment_schedule.find((r) => r.status === 'next' || r.status === 'upcoming');
      if (nextRow) {
        next_payroll_deduction_rwf = Number(nextRow.due_rwf) || 0;
        next_deduction_date = active.next_deduction_date || null;
      }
    }

    const hasPending = requests.some((r) => r.status === 'pending_approval');

    return res.json({
      success: true,
      demo: true,
      kyc_complete: kycComplete,
      avance_onboarded: !!prof.onboarded && kycComplete,
      staff_profile: {
        full_name: fullName,
        masked_national_id: maskId(prof.kyc?.national_id),
        phone: prof.kyc?.phone || '',
      },
      outstanding,
      repayment_schedule,
      next_payroll_deduction_rwf,
      next_deduction_date,
      invoice_requests: requests,
      has_pending_approval: hasPending,
      // Legacy fields for old UI (optional)
      has_active_application: hasPending,
      active_loan: hasPending
        ? (() => {
            const p = requests.find((r) => r.status === 'pending_approval');
            return p
              ? {
                  id: p.id,
                  status: 'pending',
                  amount_requested: p.amount_rwf,
                  repayment_term_months: p.terms_months,
                  created_at: p.created_at,
                }
              : null;
          })()
        : null,
      history: requests
        .filter((r) => ['rejected', 'cancelled', 'active_repayment'].includes(r.status))
        .map((r) => ({
          id: r.id,
          amount_requested: r.amount_rwf,
          status: r.status === 'active_repayment' ? 'completed' : r.status,
          created_at: r.created_at,
        })),
    });
  } catch (e) {
    console.error('[shuleAvanceMock] status', e);
    return res.status(500).json({ success: false, message: 'Failed to load ShuleAvance demo state' });
  }
});

router.post('/services/shule-avance/kyc', requireAuth, (req, res) => {
  const { userId, schoolId, role } = ctx(req);
  if (!canSubmitInvoice(role)) {
    return res.status(403).json({ success: false, message: 'Only teaching / school staff can complete KYC for this demo.' });
  }
  const prof = getProfile(schoolId, userId);
  const b = req.body || {};
  prof.kyc = {
    national_id: String(b.national_id || '').trim(),
    phone: String(b.phone || '').trim(),
    bank_or_mm: String(b.bank_or_mm || '').trim(),
    submitted_at: new Date().toISOString(),
  };
  return res.json({ success: true, message: 'KYC saved (demo).' });
});

router.post('/services/shule-avance/onboard', requireAuth, (req, res) => {
  const { userId, schoolId, role } = ctx(req);
  if (!canSubmitInvoice(role)) {
    return res.status(403).json({ success: false, message: 'Only teaching / school staff can onboard for this demo.' });
  }
  const prof = getProfile(schoolId, userId);
  const kycOk = !!(prof.kyc?.national_id && prof.kyc?.phone);
  if (!kycOk) {
    return res.status(400).json({ success: false, message: 'Complete KYC before onboarding to ShuleAvance.' });
  }
  prof.onboarded = true;
  return res.json({ success: true, message: 'Welcome to ShuleAvance (demo). You can now submit invoice requests.' });
});

router.post('/services/shule-avance/invoice-requests', requireAuth, (req, res) => {
  const { userId, schoolId, role, fullName } = ctx(req);
  if (!canSubmitInvoice(role)) {
    return res.status(403).json({ success: false, message: 'Your role cannot submit invoice requests in this demo.' });
  }
  const prof = getProfile(schoolId, userId);
  if (!prof.onboarded || !(prof.kyc?.national_id && prof.kyc?.phone)) {
    return res.status(400).json({ success: false, message: 'Finish KYC and ShuleAvance onboarding first.' });
  }
  const existingActive = requestsForStaff(schoolId, userId).filter((r) => r.status === 'active_repayment');
  if (existingActive.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Demo: settle or wait until your current facility ends before opening another invoice line.',
    });
  }
  const b = req.body || {};
  const amount = Math.round(Number(b.amount_rwf ?? b.amount_requested));
  const terms = Math.max(1, Math.min(18, Number(b.terms_months ?? b.repayment_term_months) || 6));
  if (!amount || amount < 1000) {
    return res.status(400).json({ success: false, message: 'Enter a valid invoice amount (RWF).' });
  }
  const row = {
    id: nextReqId++,
    school_id: schoolId,
    staff_user_id: userId,
    staff_name: fullName,
    vendor_label: String(b.vendor_label || b.vendor || 'Supplier').trim(),
    details: String(b.details || b.purpose || '').trim(),
    invoice_file_name: String(b.invoice_file_name || b.invoice_name || 'invoice.pdf').trim(),
    amount_rwf: amount,
    terms_months: terms,
    status: 'pending_approval',
    payer: null,
    repayment_schedule: [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    next_deduction_date: null,
  };
  invoiceRequests.push(row);
  return res.status(201).json({ success: true, data: row });
});

router.delete('/services/shule-avance/invoice-requests/:id', requireAuth, (req, res) => {
  const { userId, schoolId } = ctx(req);
  const id = Number(req.params.id);
  const idx = invoiceRequests.findIndex(
    (r) => r.id === id && Number(r.staff_user_id) === Number(userId) && Number(r.school_id) === Number(schoolId)
  );
  if (idx === -1) return res.status(404).json({ success: false, message: 'Request not found.' });
  if (invoiceRequests[idx].status !== 'pending_approval') {
    return res.status(400).json({ success: false, message: 'Only pending requests can be cancelled.' });
  }
  invoiceRequests.splice(idx, 1);
  return res.json({ success: true });
});

router.post('/services/shule-avance/apply', requireAuth, (req, res, next) => {
  req.body = {
    ...(req.body || {}),
    amount_rwf: req.body?.amount_requested,
    terms_months: req.body?.repayment_term_months,
    details: req.body?.purpose,
    vendor_label: req.body?.vendor_label || 'Salary advance',
    invoice_file_name: req.body?.invoice_file_name || 'application.pdf',
  };
  next();
}, (req, res) => {
  const { userId, schoolId, role, fullName } = ctx(req);
  if (!canSubmitInvoice(role)) {
    return res.status(403).json({ success: false, message: 'Your role cannot submit in this demo.' });
  }
  const prof = getProfile(schoolId, userId);
  if (!prof.onboarded || !(prof.kyc?.national_id && prof.kyc?.phone)) {
    return res.status(400).json({ success: false, message: 'Finish KYC and onboarding first.' });
  }
  const existingActive = requestsForStaff(schoolId, userId).filter((r) => r.status === 'active_repayment');
  if (existingActive.length > 0) {
    return res.status(400).json({ success: false, message: 'Demo: an active facility is already open for this account.' });
  }
  const b = req.body || {};
  const amount = Math.round(Number(b.amount_rwf));
  const terms = Math.max(1, Math.min(18, Number(b.terms_months) || 6));
  if (!amount || amount < 1000) {
    return res.status(400).json({ success: false, message: 'Invalid amount.' });
  }
  const row = {
    id: nextReqId++,
    school_id: schoolId,
    staff_user_id: userId,
    staff_name: fullName,
    vendor_label: String(b.vendor_label || '').trim() || 'Salary advance',
    details: String(b.details || '').trim(),
    invoice_file_name: String(b.invoice_file_name || '').trim() || 'application.pdf',
    amount_rwf: amount,
    terms_months: terms,
    status: 'pending_approval',
    payer: null,
    repayment_schedule: [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    next_deduction_date: null,
  };
  invoiceRequests.push(row);
  return res.status(201).json({ success: true, data: row });
});

router.delete('/services/shule-avance/cancel/:id', requireAuth, (req, res) => {
  const { userId, schoolId } = ctx(req);
  const id = Number(req.params.id);
  const idx = invoiceRequests.findIndex(
    (r) => r.id === id && Number(r.staff_user_id) === Number(userId) && Number(r.school_id) === Number(schoolId)
  );
  if (idx === -1) return res.status(404).json({ success: false, message: 'Not found.' });
  if (invoiceRequests[idx].status !== 'pending_approval') {
    return res.status(400).json({ success: false, message: 'Only pending can be cancelled.' });
  }
  invoiceRequests.splice(idx, 1);
  return res.json({ success: true });
});

router.get('/services/shule-avance/finance/pending-invoices', requireAuth, (req, res) => {
  const { schoolId, role } = ctx(req);
  if (!isFinanceRole(role)) {
    return res.status(403).json({ success: false, message: 'Accountant or school manager access required.' });
  }
  const pending = invoiceRequests.filter(
    (r) => r.status === 'pending_approval' && Number(r.school_id) === Number(schoolId)
  );
  return res.json({ success: true, data: pending });
});

router.patch('/services/shule-avance/finance/invoice-requests/:id/approve', requireAuth, (req, res) => {
  const { schoolId, role } = ctx(req);
  if (!isFinanceRole(role)) {
    return res.status(403).json({ success: false, message: 'Accountant or school manager access required.' });
  }
  const id = Number(req.params.id);
  const row = invoiceRequests.find((r) => r.id === id && Number(r.school_id) === Number(schoolId));
  if (!row) return res.status(404).json({ success: false, message: 'Request not found.' });
  if (row.status !== 'pending_approval') {
    return res.status(400).json({ success: false, message: 'Not pending approval.' });
  }
  const payer = ['school', 'partner'].includes(String(req.body?.payer).toLowerCase())
    ? String(req.body.payer).toLowerCase()
    : 'school';
  const schedule = buildSchedule(row.amount_rwf + Math.round(row.amount_rwf * 0.03), row.terms_months);
  const next = new Date();
  next.setMonth(next.getMonth() + 1);
  row.status = 'active_repayment';
  row.payer = payer;
  row.repayment_schedule = schedule;
  row.updated_at = new Date().toISOString();
  row.approved_at = new Date().toISOString();
  row.next_deduction_date = next.toISOString().slice(0, 10);
  return res.json({ success: true, data: row });
});

router.patch('/services/shule-avance/finance/invoice-requests/:id/reject', requireAuth, (req, res) => {
  const { schoolId, role } = ctx(req);
  if (!isFinanceRole(role)) {
    return res.status(403).json({ success: false, message: 'Accountant or school manager access required.' });
  }
  const id = Number(req.params.id);
  const row = invoiceRequests.find((r) => r.id === id && Number(r.school_id) === Number(schoolId));
  if (!row) return res.status(404).json({ success: false, message: 'Request not found.' });
  if (row.status !== 'pending_approval') {
    return res.status(400).json({ success: false, message: 'Not pending.' });
  }
  row.status = 'rejected';
  row.reject_note = String(req.body?.note || '').trim();
  row.updated_at = new Date().toISOString();
  return res.json({ success: true, data: row });
});

module.exports = router;
