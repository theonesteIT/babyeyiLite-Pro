import React, { useEffect, useMemo, useState } from 'react';
import { Loader2, Pencil, Plus, RefreshCw, Trash2 } from 'lucide-react';
import api from '../services/api';

const initialForm = {
  amount_requested: '',
  purpose: '',
  repayment_term_months: 6,
  vendor_label: '',
  details: '',
  invoice_file_name: '',
};

const statusMeta = {
  pending_accountant: { label: 'Pending Accountant', cls: 'bg-amber-50 text-amber-800 border-amber-200' },
  sent_to_manager: { label: 'Sent To Manager', cls: 'bg-sky-50 text-sky-800 border-sky-200' },
  approved: { label: 'Approved', cls: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
  rejected_by_accountant: { label: 'Rejected By Accountant', cls: 'bg-red-50 text-red-700 border-red-200' },
  rejected_by_manager: { label: 'Rejected By Manager', cls: 'bg-red-50 text-red-700 border-red-200' },
};

function fmtMoney(v) {
  const n = Number(v || 0);
  return `${n.toLocaleString()} RWF`;
}

function canEditOrDelete(status) {
  return status === 'pending_accountant';
}

export default function ShuleAvance() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState(null);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/services/shule-avance/teacher/my-requests');
      if (res.data?.success) {
        setRows(res.data.data || []);
      } else {
        setError(res.data?.message || 'Could not load requests.');
      }
    } catch (e) {
      setError(e.response?.data?.message || 'Could not load requests.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const pendingCount = useMemo(
    () => rows.filter((r) => r.status === 'pending_accountant' || r.status === 'sent_to_manager').length,
    [rows]
  );

  const resetForm = () => {
    setForm(initialForm);
    setEditingId(null);
  };

  const submitForm = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setMessage('');
    try {
      if (editingId) {
        const res = await api.put(`/services/shule-avance/teacher/requests/${editingId}`, form);
        if (!res.data?.success) throw new Error(res.data?.message || 'Update failed');
        setMessage('Request updated successfully.');
      } else {
        const res = await api.post('/services/shule-avance/teacher/requests', form);
        if (!res.data?.success) throw new Error(res.data?.message || 'Create failed');
        setMessage('Request submitted. Accountant can now review it.');
      }
      resetForm();
      await load();
    } catch (e2) {
      setError(e2.response?.data?.message || e2.message || 'Could not save request.');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (row) => {
    setEditingId(row.id);
    setForm({
      amount_requested: String(row.amount_rwf || ''),
      purpose: row.purpose || '',
      repayment_term_months: Number(row.repayment_term_months || 6),
      vendor_label: row.vendor_label || '',
      details: row.details || '',
      invoice_file_name: row.invoice_file_name || '',
    });
    setMessage('');
    setError('');
  };

  const handleDelete = async (id) => {
    const yes = window.confirm('Delete this request?');
    if (!yes) return;
    setError('');
    setMessage('');
    try {
      const res = await api.delete(`/services/shule-avance/teacher/requests/${id}`);
      if (!res.data?.success) throw new Error(res.data?.message || 'Delete failed');
      setMessage('Request deleted.');
      if (editingId === id) resetForm();
      await load();
    } catch (e) {
      setError(e.response?.data?.message || e.message || 'Could not delete request.');
    }
  };

  return (
    <div className="min-h-screen bg-re-bg p-6 md:p-10 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-black text-re-orange uppercase tracking-[0.2em]">Teacher Portal</p>
          <h1 className="text-2xl md:text-3xl font-black text-re-text tracking-tight">
            Shule<span className="text-re-orange">Avance</span> Requests
          </h1>
          <p className="text-xs text-re-text-muted font-bold mt-1">
            Create, update, and track requests. Approved or rejected feedback appears here.
          </p>
        </div>
        <button
          type="button"
          onClick={load}
          className="h-10 px-4 rounded-xl border border-black/10 bg-white text-[10px] font-black uppercase tracking-widest text-slate-700 inline-flex items-center gap-2"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {message && <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800">{message}</div>}
      {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{error}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <section className="lg:col-span-1 bg-white rounded-2xl border border-black/5 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <Plus size={16} className="text-re-orange" />
            <h2 className="text-sm font-black uppercase tracking-wider text-re-text">{editingId ? 'Edit Request' : 'New Request'}</h2>
          </div>
          <form className="space-y-3" onSubmit={submitForm}>
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Amount (RWF)</label>
              <input
                type="number"
                min="1"
                required
                value={form.amount_requested}
                onChange={(e) => setForm((f) => ({ ...f, amount_requested: e.target.value }))}
                className="w-full h-10 rounded-lg border border-black/10 px-3 text-sm font-semibold outline-none focus:border-re-orange/40"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Repayment Months</label>
              <select
                value={form.repayment_term_months}
                onChange={(e) => setForm((f) => ({ ...f, repayment_term_months: Number(e.target.value) }))}
                className="w-full h-10 rounded-lg border border-black/10 px-3 text-sm font-semibold outline-none focus:border-re-orange/40"
              >
                {[3, 6, 9, 12, 18, 24].map((m) => (
                  <option key={m} value={m}>
                    {m} months
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Purpose</label>
              <textarea
                required
                value={form.purpose}
                onChange={(e) => setForm((f) => ({ ...f, purpose: e.target.value }))}
                className="w-full min-h-[78px] rounded-lg border border-black/10 p-3 text-sm font-semibold outline-none focus:border-re-orange/40"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Vendor (Optional)</label>
              <input
                value={form.vendor_label}
                onChange={(e) => setForm((f) => ({ ...f, vendor_label: e.target.value }))}
                className="w-full h-10 rounded-lg border border-black/10 px-3 text-sm font-semibold outline-none focus:border-re-orange/40"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Extra Details</label>
              <textarea
                value={form.details}
                onChange={(e) => setForm((f) => ({ ...f, details: e.target.value }))}
                className="w-full min-h-[68px] rounded-lg border border-black/10 p-3 text-sm font-semibold outline-none focus:border-re-orange/40"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Invoice File Name</label>
              <input
                value={form.invoice_file_name}
                onChange={(e) => setForm((f) => ({ ...f, invoice_file_name: e.target.value }))}
                className="w-full h-10 rounded-lg border border-black/10 px-3 text-sm font-semibold outline-none focus:border-re-orange/40"
              />
            </div>
            <div className="flex gap-2 pt-1">
              <button
                type="submit"
                disabled={saving}
                className="flex-1 h-10 rounded-lg bg-re-grad-orange text-white text-[10px] font-black uppercase tracking-widest disabled:opacity-50 inline-flex items-center justify-center gap-2"
              >
                {saving ? <Loader2 size={14} className="animate-spin" /> : null}
                {editingId ? 'Update Request' : 'Submit Request'}
              </button>
              {editingId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="h-10 px-4 rounded-lg border border-black/10 bg-white text-[10px] font-black uppercase tracking-widest text-slate-600"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </section>

        <section className="lg:col-span-2 bg-white rounded-2xl border border-black/5 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-black/5 flex items-center justify-between gap-3">
            <h2 className="text-sm font-black uppercase tracking-wider text-re-text">My Requests</h2>
            <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border border-slate-200 bg-slate-50 text-slate-700">
              Open: {pendingCount}
            </span>
          </div>
          {loading ? (
            <div className="py-16 flex items-center justify-center gap-2 text-slate-500">
              <Loader2 size={18} className="animate-spin" />
              <span className="text-sm font-bold">Loading requests...</span>
            </div>
          ) : rows.length === 0 ? (
            <div className="py-16 text-center text-sm font-bold text-slate-400">No requests yet.</div>
          ) : (
            <div className="divide-y divide-black/5">
              {rows.map((r) => {
                const meta = statusMeta[r.status] || { label: r.status, cls: 'bg-slate-50 text-slate-700 border-slate-200' };
                return (
                  <div key={r.id} className="p-5 space-y-3">
                    <div className="flex flex-wrap justify-between gap-3">
                      <div>
                        <p className="text-lg font-black text-re-text">{fmtMoney(r.amount_rwf)}</p>
                        <p className="text-xs text-slate-500 font-bold mt-1">
                          #{r.id} · {r.repayment_term_months} months · {new Date(r.submitted_at).toLocaleString()}
                        </p>
                      </div>
                      <span className={`h-fit text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full border ${meta.cls}`}>
                        {meta.label}
                      </span>
                    </div>

                    <div className="text-sm text-slate-700 space-y-1">
                      <p>
                        <span className="font-black text-slate-900">Purpose:</span> {r.purpose}
                      </p>
                      {r.vendor_label ? (
                        <p>
                          <span className="font-black text-slate-900">Vendor:</span> {r.vendor_label}
                        </p>
                      ) : null}
                      {r.details ? (
                        <p>
                          <span className="font-black text-slate-900">Details:</span> {r.details}
                        </p>
                      ) : null}
                      {r.invoice_file_name ? (
                        <p>
                          <span className="font-black text-slate-900">Invoice:</span> {r.invoice_file_name}
                        </p>
                      ) : null}
                    </div>

                    {(r.accountant_note || r.manager_feedback) && (
                      <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 space-y-1">
                        {r.accountant_note ? (
                          <p className="text-sm text-slate-700">
                            <span className="font-black">Accountant note:</span> {r.accountant_note}
                          </p>
                        ) : null}
                        {r.manager_feedback ? (
                          <p className="text-sm text-slate-700">
                            <span className="font-black">Manager feedback:</span> {r.manager_feedback}
                          </p>
                        ) : null}
                      </div>
                    )}

                    {canEditOrDelete(r.status) && (
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => handleEdit(r)}
                          className="h-9 px-3 rounded-lg border border-slate-300 bg-white text-slate-700 text-[10px] font-black uppercase tracking-widest inline-flex items-center gap-1.5"
                        >
                          <Pencil size={12} /> Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(r.id)}
                          className="h-9 px-3 rounded-lg border border-red-200 bg-red-50 text-red-700 text-[10px] font-black uppercase tracking-widest inline-flex items-center gap-1.5"
                        >
                          <Trash2 size={12} /> Delete
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
import React, { useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Wallet,
  CheckCircle,
  ArrowRight,
  FileText,
  Upload,
  User,
  Clock,
  X,
  Plus,
  Gauge,
  Landmark,
  ShieldCheck,
  TrendingUp,
  ScrollText,
} from 'lucide-react';

const fmt = (n) => `${Number(n || 0).toLocaleString()} RWF`;

/** Illustrative payroll net for UI copy (real engine uses live salary from the school). */
const ILLUSTRATIVE_MONTHLY_NET_RWF = 450000;
const MAX_REPAYMENT_SHARE_OF_NET = 0.35;

const SHULE_AVANCE_PILLARS = [
  {
    id: 'risk',
    icon: Gauge,
    title: 'Risk engine',
    subtitle: 'Salary-based validation',
    body: 'Each facility is sized to your contract net pay and a safe share of income, so payroll check-offs stay predictable.',
    emphasis: true,
  },
  {
    id: 'disburse',
    icon: Landmark,
    title: 'Disbursement clarity',
    subtitle: 'Who gets paid',
    body: 'Approved funds are settled to the supplier on the invoice. You repay via payroll; the school or partner is the payer of record.',
    emphasis: false,
  },
  {
    id: 'invoice',
    icon: ShieldCheck,
    title: 'Invoice validation',
    subtitle: 'Compliance layer',
    body: 'Vendor, amounts, line items, and attachments are checked against policy before finance releases any payment.',
    emphasis: false,
  },
  {
    id: 'growth',
    icon: TrendingUp,
    title: 'Credit growth',
    subtitle: 'Earns with behaviour',
    body: 'On-time payroll repayments and clean history improve your eligible limit over time; missed cycles pause new requests.',
    emphasis: false,
  },
  {
    id: 'audit',
    icon: ScrollText,
    title: 'Audit & traceability',
    subtitle: 'Immutable trail',
    body: 'Every submission, approval, and deduction carries references you and finance can reconcile on payslips and statements.',
    emphasis: false,
  },
];

function buildSchedule(principalRwf, termsMonths) {
  const fees = Math.round(Number(principalRwf) * 0.03);
  const total = Number(principalRwf) + fees;
  const m = Math.max(1, Math.min(18, Number(termsMonths) || 6));
  const base = Math.floor(total / m);
  const rows = [];
  const now = new Date();
  for (let i = 0; i < m; i += 1) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const payrollMonth = d.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
    const due = i === m - 1 ? total - base * (m - 1) : base;
    const isFirst = i === 0;
    rows.push({
      period: i + 1,
      due_rwf: due,
      paid_rwf: isFirst ? due : 0,
      status: isFirst ? 'paid' : i === 1 ? 'next' : 'upcoming',
      payroll_month: payrollMonth,
    });
  }
  return { fees_rwf: fees, total_rwf: total, rows };
}

function outstandingFromActive(inv) {
  if (!inv || inv.status !== 'active_repayment') {
    return {
      total_rwf: 0,
      principal_rwf: 0,
      fees_rwf: 0,
      deducted_to_date_rwf: 0,
      remaining_rwf: 0,
      schedule: [],
      next_payroll_deduction_rwf: 0,
      next_deduction_date: null,
    };
  }
  const principal = Number(inv.amount_rwf) || 0;
  const { fees_rwf, total_rwf, rows } = buildSchedule(principal, inv.terms_months);
  const paidSum = rows.reduce((s, r) => s + (Number(r.paid_rwf) || 0), 0);
  const remaining = Math.max(0, total_rwf - paidSum);
  const nextRow = rows.find((r) => r.status === 'next' || r.status === 'upcoming');
  const nd = new Date();
  nd.setMonth(nd.getMonth() + 1);
  return {
    total_rwf,
    principal_rwf: principal,
    fees_rwf,
    deducted_to_date_rwf: paidSum,
    remaining_rwf: remaining,
    schedule: rows,
    next_payroll_deduction_rwf: nextRow ? Number(nextRow.due_rwf) : 0,
    next_deduction_date: nd.toISOString().slice(0, 10),
  };
}

function createFullSeed() {
  const active = {
    id: 2,
    vendor_label: 'Ikirezi Stationers Ltd',
    amount_rwf: 480000,
    terms_months: 6,
    details: 'A4 paper (20 rims), markers, flip-chart pads for science block.',
    invoice_file_name: 'INV-IKR-2026-014.pdf',
    status: 'active_repayment',
    payer: 'school',
    created_at: new Date(Date.now() - 86400000 * 12).toISOString(),
  };
  const pending = {
    id: 3,
    vendor_label: 'TechWorld Ltd',
    amount_rwf: 125000,
    terms_months: 3,
    details: 'HDMI cables, wireless presenter for staff room.',
    invoice_file_name: 'quotation-techworld.pdf',
    status: 'pending_approval',
    payer: null,
    created_at: new Date().toISOString(),
  };
  return {
    kyc_status: 'verified',
    avance_onboarded: true,
    staff_profile: { masked_national_id: '***6789', phone: '+250 788 123 456', bank_or_mm: 'MTN MoMo · 078…' },
    invoice_requests: [pending, active],
  };
}

function KycModal({ open, onClose, kycForm, setKycForm, onSubmit }) {
  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-[230] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-lg rounded-t-[28px] sm:rounded-[24px] shadow-2xl border border-black/5 max-h-[92vh] flex flex-col">
        <div
          className="px-5 py-4 flex items-center justify-between shrink-0 rounded-t-[28px] sm:rounded-t-[24px]"
          style={{ background: 'linear-gradient(135deg,#FF8C00,#FF5E00)' }}
        >
          <div className="flex items-center gap-2 text-white">
            <User size={18} />
            <h2 className="text-sm font-black uppercase tracking-tight">Complete KYC</h2>
          </div>
          <button type="button" onClick={onClose} className="p-2 rounded-xl text-white/80 hover:bg-white/10">
            <X size={18} />
          </button>
        </div>
        <form onSubmit={onSubmit} className="p-5 space-y-3 overflow-y-auto flex-1">
          <div className="space-y-1">
            <label className="text-[9px] font-black text-re-text-muted uppercase tracking-widest">National ID</label>
            <input
              className="w-full h-11 rounded-xl bg-re-bg px-3 font-bold text-sm outline-none border border-black/5 focus:border-re-orange/40"
              value={kycForm.national_id}
              onChange={(e) => setKycForm((f) => ({ ...f, national_id: e.target.value }))}
              placeholder="1199080012345678"
              required
            />
          </div>
          <div className="space-y-1">
            <label className="text-[9px] font-black text-re-text-muted uppercase tracking-widest">Phone</label>
            <input
              className="w-full h-11 rounded-xl bg-re-bg px-3 font-bold text-sm outline-none border border-black/5 focus:border-re-orange/40"
              value={kycForm.phone}
              onChange={(e) => setKycForm((f) => ({ ...f, phone: e.target.value }))}
              placeholder="+250 7XX XXX XXX"
              required
            />
          </div>
          <div className="space-y-1">
            <label className="text-[9px] font-black text-re-text-muted uppercase tracking-widest">Bank or MoMo</label>
            <input
              className="w-full h-11 rounded-xl bg-re-bg px-3 font-bold text-sm outline-none border border-black/5 focus:border-re-orange/40"
              value={kycForm.bank_or_mm}
              onChange={(e) => setKycForm((f) => ({ ...f, bank_or_mm: e.target.value }))}
              placeholder="MTN MoMo · 078…"
            />
          </div>
          <button
            type="submit"
            className="w-full bg-re-grad-orange text-white py-3 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg mt-2"
          >
            Submit for verification
          </button>
        </form>
      </div>
    </div>,
    document.body
  );
}

function InvoiceRequestModal({ open, onClose, invoiceForm, setInvoiceForm, onSubmit, disabled, disabledReason }) {
  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-[230] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-lg rounded-t-[28px] sm:rounded-[24px] shadow-2xl border border-black/5 max-h-[92vh] flex flex-col">
        <div
          className="px-5 py-4 flex items-center justify-between shrink-0 rounded-t-[28px] sm:rounded-t-[24px]"
          style={{ background: 'linear-gradient(135deg,#FF8C00,#FF5E00)' }}
        >
          <div className="flex items-center gap-2 text-white">
            <FileText size={18} />
            <h2 className="text-sm font-black uppercase tracking-tight">New avance request</h2>
          </div>
          <button type="button" onClick={onClose} className="p-2 rounded-xl text-white/80 hover:bg-white/10">
            <X size={18} />
          </button>
        </div>
        <form
          onSubmit={(e) => {
            onSubmit(e);
          }}
          className="p-5 space-y-3 overflow-y-auto flex-1"
        >
          <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/50 p-3 space-y-2">
            <p className="text-[9px] font-black uppercase tracking-widest text-emerald-900 flex items-center gap-1.5">
              <ShieldCheck size={14} className="shrink-0" /> Invoice validation & compliance
            </p>
            <ul className="text-[10px] font-bold text-emerald-900/85 space-y-1 leading-snug list-disc pl-4">
              <li>Vendor must match the invoice; amounts reconciled to line items.</li>
              <li>Attachment stored for audit; duplicate-invoice checks at finance.</li>
              <li>Salary-based risk engine runs before any disbursement is approved.</li>
            </ul>
          </div>
          <div className="space-y-1">
            <label className="text-[9px] font-black text-re-text-muted uppercase tracking-widest">Vendor</label>
            <input
              className="w-full h-11 rounded-xl bg-re-bg px-3 font-bold text-sm outline-none border border-black/5 focus:border-re-orange/40"
              value={invoiceForm.vendor_label}
              onChange={(e) => setInvoiceForm((f) => ({ ...f, vendor_label: e.target.value }))}
              placeholder="Supplier name"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[9px] font-black text-re-text-muted uppercase tracking-widest">Amount (RWF)</label>
              <input
                type="number"
                className="w-full h-11 rounded-xl bg-re-bg px-3 font-bold text-sm outline-none border border-black/5 focus:border-re-orange/40"
                value={invoiceForm.amount_rwf}
                onChange={(e) => setInvoiceForm((f) => ({ ...f, amount_rwf: e.target.value }))}
                placeholder="450000"
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-black text-re-text-muted uppercase tracking-widest">Months</label>
              <select
                className="w-full h-11 rounded-xl bg-re-bg px-3 font-bold text-sm outline-none border border-black/5 focus:border-re-orange/40"
                value={invoiceForm.terms_months}
                onChange={(e) => setInvoiceForm((f) => ({ ...f, terms_months: Number(e.target.value) }))}
              >
                {[3, 6, 9, 12].map((m) => (
                  <option key={m} value={m}>
                    {m} months
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-[9px] font-black text-re-text-muted uppercase tracking-widest">Details</label>
            <textarea
              className="w-full min-h-[88px] rounded-xl bg-re-bg p-3 font-bold text-sm outline-none border border-black/5 focus:border-re-orange/40 resize-y"
              value={invoiceForm.details}
              onChange={(e) => setInvoiceForm((f) => ({ ...f, details: e.target.value }))}
              placeholder="Line items…"
              required
            />
          </div>
          <label className="flex items-center gap-2 text-[9px] font-black text-re-text-muted uppercase tracking-widest">
            <Upload size={12} /> Attachment
          </label>
          <input
            type="file"
            className="text-[11px] font-bold w-full"
            onChange={(e) => {
              const f = e.target.files?.[0];
              setInvoiceForm((prev) => ({ ...prev, invoice_file_name: f?.name || '' }));
            }}
          />
          {disabled && disabledReason && (
            <p className="text-[11px] font-bold text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">{disabledReason}</p>
          )}
          <button
            type="submit"
            disabled={disabled}
            className="w-full bg-re-grad-orange text-white py-3 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg disabled:opacity-40"
          >
            Submit avance request
          </button>
        </form>
      </div>
    </div>,
    document.body
  );
}

export default function ShuleAvance() {
  const [mock, setMock] = useState(() => createFullSeed());
  const [kycForm, setKycForm] = useState({ national_id: '', phone: '', bank_or_mm: '' });
  const [invoiceForm, setInvoiceForm] = useState({
    vendor_label: '',
    amount_rwf: '',
    details: '',
    terms_months: 6,
    invoice_file_name: '',
  });
  const [kycModalOpen, setKycModalOpen] = useState(false);
  const [invoiceModalOpen, setInvoiceModalOpen] = useState(false);
  const idRef = useRef(100);

  const kycOk = mock.kyc_status === 'verified' || mock.kyc_status === 'certificate_pending';
  const kycVerified = mock.kyc_status === 'verified';
  const kycCertificatePending = mock.kyc_status === 'certificate_pending';
  const kycPending = mock.kyc_status === 'pending';

  const activeInv = useMemo(
    () => (mock.invoice_requests || []).find((r) => r.status === 'active_repayment'),
    [mock.invoice_requests]
  );

  const derived = useMemo(() => outstandingFromActive(activeInv), [activeInv]);

  const pendingCount = useMemo(
    () => (mock.invoice_requests || []).filter((r) => r.status === 'pending_approval').length,
    [mock.invoice_requests]
  );

  const hasPending = pendingCount > 0;
  const onboarded = mock.avance_onboarded;

  const submitKycModal = (e) => {
    e.preventDefault();
    const nid = kycForm.national_id.trim();
    const ph = kycForm.phone.trim();
    if (!nid || !ph) return;
    const masked = nid.length >= 4 ? `***${nid.slice(-4)}` : '***';
    setMock((m) => ({
      ...m,
      kyc_status: 'verified',
      staff_profile: {
        masked_national_id: masked,
        phone: ph,
        bank_or_mm: kycForm.bank_or_mm.trim() || '—',
      },
    }));
    setKycModalOpen(false);
  };

  const submitOnboard = () => {
    setMock((m) => ({ ...m, avance_onboarded: true }));
  };

  const submitInvoice = (e) => {
    e.preventDefault();
    if (hasPending || activeInv) return;
    const amt = Number(invoiceForm.amount_rwf);
    if (!invoiceForm.vendor_label.trim() || !invoiceForm.details.trim() || !amt || amt < 1000) return;
    idRef.current += 1;
    const row = {
      id: idRef.current,
      vendor_label: invoiceForm.vendor_label.trim(),
      amount_rwf: amt,
      terms_months: Number(invoiceForm.terms_months) || 6,
      details: invoiceForm.details.trim(),
      invoice_file_name: invoiceForm.invoice_file_name || 'invoice.pdf',
      status: 'pending_approval',
      payer: null,
      created_at: new Date().toISOString(),
    };
    setMock((m) => ({ ...m, invoice_requests: [row, ...(m.invoice_requests || [])] }));
    setInvoiceForm((f) => ({ ...f, vendor_label: '', amount_rwf: '', details: '', invoice_file_name: '' }));
    setInvoiceModalOpen(false);
  };

  const cancelRequest = (id) => {
    if (!window.confirm('Withdraw this pending request?')) return;
    setMock((m) => ({
      ...m,
      invoice_requests: (m.invoice_requests || []).filter((r) => r.id !== id),
    }));
  };

  const simulateApprove = (id, payer) => {
    setMock((m) => ({
      ...m,
      invoice_requests: (m.invoice_requests || []).map((r) => {
        if (r.status === 'active_repayment') {
          return { ...r, status: 'settled_demo', payer: r.payer };
        }
        if (r.id === id && r.status === 'pending_approval') {
          return { ...r, status: 'active_repayment', payer: payer || 'school' };
        }
        return r;
      }),
    }));
  };

  const outstanding = {
    total_rwf: derived.total_rwf,
    principal_rwf: derived.principal_rwf,
    fees_rwf: derived.fees_rwf,
    deducted_to_date_rwf: derived.deducted_to_date_rwf,
    remaining_rwf: derived.remaining_rwf,
  };
  const schedule = derived.schedule;
  const next_payroll_deduction_rwf = derived.next_payroll_deduction_rwf;
  const next_deduction_date = derived.next_deduction_date;

  const hasBalance = (outstanding.remaining_rwf || 0) > 0;

  const facilityStatusLabel = useMemo(() => {
    if (activeInv) return 'Active';
    if (hasPending) return 'Awaiting finance';
    return 'None';
  }, [activeInv, hasPending]);

  const numericStats = useMemo(
    () => [
      {
        value: fmt(outstanding.remaining_rwf),
        label: 'Outstanding',
      },
      {
        value: activeInv && next_payroll_deduction_rwf ? fmt(next_payroll_deduction_rwf) : '—',
        label: 'Next payroll check-off',
      },
      {
        value: String(pendingCount),
        label: 'Pending approval',
      },
      {
        value: facilityStatusLabel,
        label: 'Facility',
      },
    ],
    [
      outstanding.remaining_rwf,
      activeInv,
      next_payroll_deduction_rwf,
      pendingCount,
      facilityStatusLabel,
    ]
  );

  const invoiceModalDisabled = hasPending || !!activeInv;
  const invoiceModalReason = hasPending
    ? 'You already have an avance request with finance.'
    : activeInv
      ? 'Close your current facility before opening a new avance request.'
      : '';

  const riskSnapshot = useMemo(() => {
    const monthlyBudget = Math.round(ILLUSTRATIVE_MONTHLY_NET_RWF * MAX_REPAYMENT_SHARE_OF_NET);
    let nextDeduction = 0;
    if (activeInv) {
      const row = derived.schedule.find((r) => r.status === 'next' || r.status === 'upcoming');
      nextDeduction = row ? Number(row.due_rwf) : 0;
    }
    const pending = (mock.invoice_requests || []).find((r) => r.status === 'pending_approval');
    let pendingMonthly = null;
    let pendingFits = null;
    if (pending) {
      const { total_rwf, rows } = buildSchedule(pending.amount_rwf, pending.terms_months);
      pendingMonthly = rows.length ? Math.ceil(total_rwf / rows.length) : 0;
      pendingFits = pendingMonthly <= monthlyBudget;
    }
    return {
      monthlyBudget,
      net: ILLUSTRATIVE_MONTHLY_NET_RWF,
      nextDeduction,
      hasActive: !!activeInv,
      pendingMonthly,
      pendingFits,
      hasPending: !!pending,
      activeWithinBudget: !activeInv || nextDeduction <= monthlyBudget,
    };
  }, [activeInv, derived.schedule, mock.invoice_requests]);

  const auditLog = useMemo(() => {
    const items = [];
    (mock.invoice_requests || []).forEach((r) => {
      const y = new Date(r.created_at).getFullYear();
      items.push({
        key: `${r.id}-req`,
        ref: `SA-REQ-${y}-${String(r.id).padStart(4, '0')}`,
        title: 'Request captured',
        detail: `${r.vendor_label} · ${fmt(r.amount_rwf)}`,
        at: r.created_at,
      });
      items.push({
        key: `${r.id}-cmp`,
        ref: `SA-CMP-${y}-${r.id}`,
        title: 'Compliance index',
        detail: 'Vendor, amount, attachment fingerprint (audit trail).',
        at: r.created_at,
      });
      if (r.status === 'pending_approval') {
        items.push({
          key: `${r.id}-risk`,
          ref: `SA-RISK-${r.id}`,
          title: 'Risk engine',
          detail: 'Salary-based repayment check — awaiting finance.',
          at: r.created_at,
        });
      }
      if (r.status === 'active_repayment') {
        items.push({
          key: `${r.id}-dis`,
          ref: `SA-DIS-${y}-${r.id}`,
          title: 'Disbursement record',
          detail: `Payer: ${r.payer === 'partner' ? 'Partner' : 'School'} → supplier on invoice.`,
          at: r.created_at,
        });
      }
    });
    return items
      .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
      .slice(0, 12);
  }, [mock.invoice_requests]);

  return (
    <div className="animate-in fade-in duration-700 bg-re-bg min-h-screen">
      <section className="relative p-7 md:p-10 text-white overflow-hidden min-h-[200px] md:min-h-[230px] flex items-center">
        <div className="absolute inset-0 z-0">
          <img src={import.meta.env.BASE_URL + "teacher.jpg"} alt="" className="w-full h-full object-cover shadow-2xl" />
          <div className="absolute inset-0 bg-black/50 backdrop-blur-[1px]" />
        </div>

        <div className="relative z-10 w-full max-w-[1300px] mx-auto">
          <div className="max-w-2xl space-y-2">
            <div className="flex items-center gap-2">
              <span className="w-6 h-1 bg-re-orange rounded-full" />
              <p className="text-[10px] font-black text-re-orange uppercase tracking-[0.28em]">Umwalimu · ShuleAvance</p>
            </div>
            <h1 className="text-2xl md:text-4xl font-black tracking-tight text-white">
              Shule<span className="text-re-orange">Avance</span>
            </h1>
            <p className="text-sm md:text-base font-bold text-white/90 max-w-xl leading-snug">
              Invoice-backed support sized to your salary, with clear disbursement, compliance checks, and a full audit trail on every step.
            </p>
          </div>
        </div>
      </section>

      <div className="max-w-[1300px] mx-auto px-5 md:px-8 -mt-10 relative z-20 pb-14">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 space-y-5">
            <div className="bg-white rounded-[24px] shadow-2xl border border-black/5 overflow-hidden grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 divide-x divide-y divide-gray-100 lg:divide-y-0">
              {kycPending ? (
                <button
                  type="button"
                  onClick={() => setKycModalOpen(true)}
                  className="p-5 flex flex-col items-center justify-center text-center min-h-[104px] gap-1.5 transition-colors cursor-pointer hover:bg-re-bg/60"
                >
                  <div className="relative flex items-center justify-center w-10 h-10 rounded-full bg-re-bg border border-black/5">
                    <User className="text-re-text" size={22} strokeWidth={2} />
                  </div>
                  <span className="text-base sm:text-lg font-black leading-tight text-re-text">Pending</span>
                  <p className="text-[9px] font-black text-re-text-muted uppercase tracking-widest opacity-60">KYC</p>
                </button>
              ) : (
                <div className="p-5 flex flex-col items-center justify-center text-center min-h-[104px] gap-1.5">
                  <div className="relative flex items-center justify-center w-10 h-10 rounded-full bg-re-bg border border-black/5">
                    <User className="text-re-text" size={22} strokeWidth={2} />
                    {kycVerified && (
                      <CheckCircle
                        className="absolute -bottom-0.5 -right-0.5 text-emerald-500 bg-white rounded-full"
                        size={18}
                        strokeWidth={2.5}
                      />
                    )}
                    {kycCertificatePending && (
                      <Clock className="absolute -bottom-0.5 -right-0.5 text-amber-600 bg-white rounded-full" size={18} strokeWidth={2.5} />
                    )}
                  </div>
                  <span
                    className={`text-base sm:text-lg font-black leading-tight ${
                      kycVerified ? 'text-emerald-700' : kycCertificatePending ? 'text-amber-800' : 'text-re-text'
                    }`}
                  >
                    {kycVerified ? 'Verified' : kycCertificatePending ? 'Certificate pending' : 'Pending'}
                  </span>
                  <p className="text-[9px] font-black text-re-text-muted uppercase tracking-widest opacity-60">KYC</p>
                </div>
              )}
              {numericStats.map((stat) => (
                <div
                  key={stat.label}
                  className="p-5 flex flex-col items-center justify-center text-center min-h-[104px]"
                >
                  <span className="text-base sm:text-lg font-black text-re-text text-center leading-tight">{stat.value}</span>
                  <p className="text-[9px] font-black text-re-text-muted uppercase tracking-widest mt-1.5 opacity-60">
                    {stat.label}
                  </p>
                </div>
              ))}
            </div>

            <section className="bg-white rounded-[24px] shadow-xl border border-black/5 overflow-hidden border-l-4 border-l-re-orange">
              <div className="px-5 py-4 border-b border-black/5 flex flex-wrap items-center justify-between gap-2 bg-re-bg/40">
                <div className="flex items-center gap-2">
                  <Gauge className="text-re-orange shrink-0" size={20} />
                  <div>
                    <h2 className="text-[11px] font-black uppercase tracking-[0.18em] text-re-text">Risk engine</h2>
                    <p className="text-[9px] font-bold text-re-text-muted uppercase tracking-widest mt-0.5">
                      Salary-based validation (primary control)
                    </p>
                  </div>
                </div>
                <span className="text-[8px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                  Illustrative payroll preview
                </span>
              </div>
              <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4 text-[11px] font-bold text-re-text-muted">
                <div className="space-y-2">
                  <p>
                    Contract net (illustrative):{' '}
                    <span className="text-re-text font-black">{fmt(riskSnapshot.net)}</span> / month
                  </p>
                  <p>
                    Max repayment budget ({Math.round(MAX_REPAYMENT_SHARE_OF_NET * 100)}% of net):{' '}
                    <span className="text-re-orange font-black">{fmt(riskSnapshot.monthlyBudget)}</span> / month
                  </p>
                  {riskSnapshot.hasActive && (
                    <p>
                      Next payroll check-off:{' '}
                      <span className="text-re-text font-black">{fmt(riskSnapshot.nextDeduction)}</span>
                      {riskSnapshot.activeWithinBudget ? (
                        <span className="text-emerald-700 font-black"> · Within budget</span>
                      ) : (
                        <span className="text-amber-700 font-black"> · Review with finance</span>
                      )}
                    </p>
                  )}
                  {riskSnapshot.hasPending && riskSnapshot.pendingMonthly != null && (
                    <p>
                      Pending request (approx. monthly share):{' '}
                      <span className="text-re-text font-black">{fmt(riskSnapshot.pendingMonthly)}</span>
                      {riskSnapshot.pendingFits ? (
                        <span className="text-emerald-700 font-black"> · Within salary cap</span>
                      ) : (
                        <span className="text-amber-700 font-black"> · Above cap — finance may adjust terms</span>
                      )}
                    </p>
                  )}
                </div>
                <div className="rounded-xl bg-re-bg border border-black/5 p-4 space-y-2">
                  <p className="text-[10px] font-black uppercase tracking-widest text-re-text">Credit growth</p>
                  <p className="leading-relaxed">
                    Limits move with verified payroll and clean repayment. Missed check-offs pause new avance requests until the
                    facility is back in good standing.
                  </p>
                </div>
              </div>
            </section>

            <section className="bg-white rounded-[24px] shadow-xl border border-black/5 p-5 md:p-6">
              <h2 className="text-[11px] font-black text-re-text uppercase tracking-[0.2em] opacity-80 mb-4">
                How the platform protects you & the school
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {SHULE_AVANCE_PILLARS.map((p) => {
                  const Icon = p.icon;
                  return (
                    <div
                      key={p.id}
                      className={`rounded-2xl border p-4 flex gap-3 ${
                        p.emphasis ? 'border-re-orange/40 bg-orange-50/40 shadow-inner' : 'border-black/5 bg-re-bg/30'
                      }`}
                    >
                      <div
                        className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${
                          p.emphasis ? 'bg-re-orange/15 text-re-orange' : 'bg-white text-re-text-muted border border-black/5'
                        }`}
                      >
                        <Icon size={18} strokeWidth={2.2} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] font-black uppercase tracking-tight text-re-text">{p.title}</p>
                        <p className="text-[9px] font-bold text-re-orange uppercase tracking-widest mt-0.5">{p.subtitle}</p>
                        <p className="text-[11px] font-bold text-re-text-muted leading-snug mt-1.5">{p.body}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {kycOk && !onboarded && (
              <section className="bg-white rounded-[24px] shadow-xl border border-black/5 p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-black text-re-text uppercase tracking-tight">Join ShuleAvance</h2>
                  <p className="text-[11px] text-re-text-muted font-bold mt-1 max-w-lg">
                    Confirm you have read the product terms. You can request invoice-backed support after onboarding.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={submitOnboard}
                  className="inline-flex items-center gap-2 bg-re-grad-orange text-white px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shrink-0"
                >
                  Complete onboarding <ArrowRight size={14} />
                </button>
              </section>
            )}

            <section className="bg-white rounded-[24px] shadow-xl border border-black/5 overflow-hidden">
              <div className="px-5 py-4 border-b border-black/5 flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-[11px] font-black text-re-text uppercase tracking-[0.2em] opacity-70">My avance history</h2>
                {onboarded && (
                  <button
                    type="button"
                    onClick={() => setInvoiceModalOpen(true)}
                    disabled={!kycVerified || kycCertificatePending}
                    className="inline-flex items-center gap-2 rounded-xl bg-re-grad-orange text-white px-4 py-2.5 text-[9px] font-black uppercase tracking-widest shadow-md disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Plus size={14} strokeWidth={3} /> New avance request
                  </button>
                )}
              </div>
              <div className="divide-y divide-black/5">
                {(mock.invoice_requests || []).length === 0 ? (
                  <div className="p-10 text-center text-[11px] font-bold text-re-text-muted">No avance history yet.</div>
                ) : (
                  (mock.invoice_requests || []).map((r) => (
                    <div key={r.id} className="px-5 py-4 flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="font-black text-re-text text-sm">{r.vendor_label}</p>
                        <p className="text-[10px] text-re-text-muted font-bold mt-0.5">
                          #{r.id} · {r.terms_months} mo · {r.invoice_file_name}
                        </p>
                        <p className="text-[10px] text-slate-500 mt-1 max-w-xl">{r.details}</p>
                        <p className="text-[9px] font-bold text-slate-500 mt-1.5 max-w-xl leading-snug">
                          {r.status === 'pending_approval' && (
                            <>
                              <span className="text-re-text-muted font-black uppercase tracking-wider">Disbursement: </span>
                              On approval, payment is released to <span className="text-re-text">{r.vendor_label}</span> (school or
                              partner as payer of record).
                            </>
                          )}
                          {r.status === 'active_repayment' && (
                            <>
                              <span className="text-re-text-muted font-black uppercase tracking-wider">Disbursement: </span>
                              Supplier paid; you repay via payroll — payer:{' '}
                              <span className="text-re-text">{r.payer === 'partner' ? 'Partner' : 'School'}</span>.
                            </>
                          )}
                          {r.status === 'settled_demo' && (
                            <>
                              <span className="text-re-text-muted font-black uppercase tracking-wider">Audit: </span>
                              Facility closed; repayment trail retained for payslip reconciliation.
                            </>
                          )}
                        </p>
                        {r.status === 'pending_approval' && (
                          <div className="mt-2 flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => simulateApprove(r.id, 'school')}
                              className="text-[9px] font-black uppercase px-2 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100/80"
                            >
                              Approved · school pays
                            </button>
                            <button
                              type="button"
                              onClick={() => simulateApprove(r.id, 'partner')}
                              className="text-[9px] font-black uppercase px-2 py-1 rounded-lg bg-sky-50 text-sky-800 border border-sky-200 hover:bg-sky-100/80"
                            >
                              Approved · partner pays
                            </button>
                          </div>
                        )}
                      </div>
                      <div className="text-right flex flex-col items-end gap-2">
                        <p className="text-lg font-black text-re-text">{fmt(r.amount_rwf)}</p>
                        <span
                          className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full border ${
                            r.status === 'pending_approval'
                              ? 'bg-amber-50 text-amber-800 border-amber-200'
                              : r.status === 'active_repayment'
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                : r.status === 'settled_demo'
                                  ? 'bg-slate-100 text-slate-600 border-slate-200'
                                  : 'bg-slate-50 text-slate-600 border-slate-200'
                          }`}
                        >
                          {r.status === 'pending_approval'
                            ? 'Pending finance'
                            : r.status === 'active_repayment'
                              ? `Active · ${r.payer || 'school'}`
                              : r.status === 'settled_demo'
                                ? 'Settled'
                                : r.status}
                        </span>
                        {r.status === 'pending_approval' && (
                          <button
                            type="button"
                            onClick={() => cancelRequest(r.id)}
                            className="text-[9px] font-black text-red-500 uppercase tracking-widest hover:underline"
                          >
                            Withdraw
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>
          </div>

          <div className="space-y-5 lg:sticky lg:top-20 h-fit">
            <section className="bg-white rounded-[24px] shadow-xl border border-black/5 p-6">
              <div className="flex items-center gap-2 mb-3">
                <Wallet className="text-re-orange" size={18} />
                <h2 className="text-[11px] font-black uppercase tracking-[0.2em] text-re-text-muted">My balance</h2>
              </div>
              {!hasBalance && !schedule.length ? (
                <p className="text-sm font-bold text-re-text-muted">
                  No active facility. Submit an avance request or wait for finance to approve a pending one.
                </p>
              ) : (
                <>
                  <p className="text-3xl font-black text-re-text tracking-tight">{fmt(outstanding.remaining_rwf)}</p>
                  <p className="text-[10px] font-bold text-re-text-muted uppercase tracking-widest mt-1">Outstanding</p>
                  <div className="mt-4 space-y-2 text-[11px]">
                    <div className="flex justify-between font-bold text-slate-600">
                      <span>Principal</span>
                      <span>{fmt(outstanding.principal_rwf)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-slate-600">
                      <span>Service fee (3%)</span>
                      <span>{fmt(outstanding.fees_rwf)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-slate-600">
                      <span>Deducted to date</span>
                      <span>{fmt(outstanding.deducted_to_date_rwf)}</span>
                    </div>
                  </div>
                  <div className="mt-4 p-3 rounded-xl bg-re-bg border border-black/5">
                    <p className="text-[9px] font-black uppercase text-re-text-muted mb-1">Next payroll check-off</p>
                    <p className="text-lg font-black text-re-text">{fmt(next_payroll_deduction_rwf)}</p>
                    {next_deduction_date && (
                      <p className="text-[10px] font-bold text-slate-500 mt-1">Around {next_deduction_date}</p>
                    )}
                  </div>
                </>
              )}
            </section>

            <section className="bg-white rounded-[24px] shadow-xl border border-black/5 overflow-hidden">
              <div className="px-6 py-4 border-b border-black/5 flex items-center gap-2">
                <Clock size={16} className="text-re-orange" />
                <h2 className="text-[11px] font-black uppercase tracking-[0.2em] text-re-text-muted">Repayment schedule</h2>
              </div>
              <div className="max-h-[320px] overflow-y-auto divide-y divide-black/5">
                {schedule.length === 0 ? (
                  <p className="p-6 text-[11px] font-bold text-re-text-muted">Your schedule appears here once a facility is active.</p>
                ) : (
                  schedule.map((row) => (
                    <div key={row.period} className="px-6 py-3 flex justify-between items-center text-[11px]">
                      <div>
                        <p className="font-black text-re-text">Period {row.period}</p>
                        <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">{row.payroll_month}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-black text-re-text">{fmt(row.due_rwf)}</p>
                        <span
                          className={`text-[8px] font-black uppercase ${
                            row.status === 'paid' ? 'text-emerald-600' : row.status === 'next' ? 'text-re-orange' : 'text-slate-400'
                          }`}
                        >
                          {row.status}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>

            <section className="bg-white rounded-[24px] shadow-xl border border-black/5 overflow-hidden">
              <div className="px-5 py-4 border-b border-black/5 flex items-center gap-2">
                <ScrollText size={16} className="text-re-orange shrink-0" />
                <h2 className="text-[11px] font-black uppercase tracking-[0.2em] text-re-text-muted">Audit & traceability</h2>
              </div>
              <div className="max-h-[280px] overflow-y-auto divide-y divide-black/5">
                {auditLog.length === 0 ? (
                  <p className="p-5 text-[11px] font-bold text-re-text-muted">Events appear here as you submit avance requests.</p>
                ) : (
                  auditLog.map((entry) => (
                    <div key={entry.key} className="px-5 py-3">
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <span className="text-[9px] font-black font-mono text-re-orange tracking-tight">{entry.ref}</span>
                        <span className="text-[9px] font-bold text-slate-400">
                          {new Date(entry.at).toLocaleString('en-RW', { dateStyle: 'short', timeStyle: 'short' })}
                        </span>
                      </div>
                      <p className="text-[11px] font-black text-re-text mt-1">{entry.title}</p>
                      <p className="text-[10px] font-bold text-re-text-muted leading-snug mt-0.5">{entry.detail}</p>
                    </div>
                  ))
                )}
              </div>
            </section>
          </div>
        </div>
      </div>

      <KycModal
        open={kycModalOpen}
        onClose={() => setKycModalOpen(false)}
        kycForm={kycForm}
        setKycForm={setKycForm}
        onSubmit={submitKycModal}
      />
      <InvoiceRequestModal
        open={invoiceModalOpen}
        onClose={() => setInvoiceModalOpen(false)}
        invoiceForm={invoiceForm}
        setInvoiceForm={setInvoiceForm}
        onSubmit={submitInvoice}
        disabled={invoiceModalDisabled}
        disabledReason={invoiceModalReason}
      />
    </div>
  );
}
