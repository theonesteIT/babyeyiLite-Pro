import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  Wallet,
  Zap,
  Smartphone,
  Gift,
  Package,
  Banknote,
  Loader2,
  X,
  Filter,
  Pencil,
  Trash2,
  Eye,
  RefreshCw,
  ChevronRight,
  AlertCircle,
  CheckCircle2,
  Send,
  XCircle,
} from 'lucide-react';
import ShuleAvanceRepaymentCalculator from '../components/ShuleAvanceRepaymentCalculator';

const UPLOADS_BASE = (import.meta.env.VITE_UPLOADS_BASE || import.meta.env.VITE_API_URL || 'http://localhost:5100').replace(/\/$/, '');

function toAssetUrl(pathLike) {
  if (!pathLike || typeof pathLike !== 'string') return null;
  if (pathLike.startsWith('http://') || pathLike.startsWith('https://')) return pathLike;
  const clean = pathLike.replace(/\\/g, '/');
  return `${UPLOADS_BASE}${clean.startsWith('/') ? clean : `/${clean}`}`;
}

function pickServiceIcon(slug) {
  const s = String(slug || '').toLowerCase();
  if (s.includes('power')) return Zap;
  if (s.includes('air') || s.includes('data')) return Smartphone;
  if (s.includes('deal')) return Gift;
  return Wallet;
}

function pickCashoutIcon(slug) {
  const s = String(slug || '').toLowerCase();
  if (s.includes('emergency')) return AlertCircle;
  return Banknote;
}

const REPAYMENT_OPTIONS = Array.from({ length: 12 }, (_, i) => i + 1);

const STATUS_MAP = {
  pending_accountant: {
    label: 'Pending',
    short: 'Pending',
    className: 'bg-amber-100 text-amber-900 border-amber-200',
  },
  sent_to_manager: {
    label: 'Sent to School Manager',
    short: 'With manager',
    className: 'bg-sky-100 text-sky-900 border-sky-200',
  },
  approved: {
    label: 'Approved',
    short: 'Approved',
    className: 'bg-emerald-100 text-emerald-900 border-emerald-200',
  },
  rejected_by_accountant: {
    label: 'Rejected',
    short: 'Rejected',
    className: 'bg-red-100 text-red-900 border-red-200',
  },
  rejected_by_manager: {
    label: 'Rejected',
    short: 'Rejected',
    className: 'bg-red-100 text-red-900 border-red-200',
  },
};

function formatMoney(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return '—';
  return `${Math.round(v).toLocaleString()} RWF`;
}

function requestTypeLabel(row) {
  const t = String(row?.request_type || 'service').toLowerCase();
  return t === 'cashout' ? 'Cashout' : 'Service';
}

function categoryLabel(row, catalog) {
  const cat = catalog || { services: [], cashouts: [] };
  if (String(row?.request_type).toLowerCase() === 'cashout') {
    const slug = row?.cashout_category_slug;
    const found = cat.cashouts?.find((c) => c.slug === slug);
    return found?.label || row?.vendor_label || '—';
  }
  const k = row?.service_category;
  const found = cat.services?.find((c) => c.slug === k);
  return found?.label || row?.vendor_label || '—';
}

function resolveRateForRow(row, catalog) {
  if (!row || !catalog) return null;
  const rt = String(row.request_type || 'service').toLowerCase();
  if (rt === 'service') {
    const s = catalog.services?.find((x) => x.slug === row.service_category);
    return s?.income_rate_percent ?? null;
  }
  const c = catalog.cashouts?.find((x) => x.slug === row.cashout_category_slug);
  return c?.income_rate_percent ?? null;
}

function isTeacherDealRequestRow(row) {
  return (
    String(row?.request_type || '').toLowerCase() === 'service' &&
    String(row?.service_category || '').toLowerCase() === 'teacher_deals'
  );
}

function Modal({ open, onClose, title, children, wide }) {
  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        aria-label="Close"
        onClick={onClose}
      />
      <div
        className={`relative w-full sm:rounded-2xl bg-white shadow-2xl border border-black/5 max-h-[92vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200 ${
          wide ? 'max-w-lg sm:max-w-xl' : 'max-w-md'
        }`}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-black/5 bg-white/95 backdrop-blur px-4 py-3">
          <h2 className="text-sm font-black text-re-text uppercase tracking-tight">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-re-bg text-re-text-muted transition-colors"
            aria-label="Close dialog"
          >
            <X size={18} />
          </button>
        </div>
        <div className="p-4 sm:p-5">{children}</div>
      </div>
    </div>,
    document.body
  );
}

export default function ShuleAvance() {
  const { teacher } = useAuth();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');

  const [flowOpen, setFlowOpen] = useState(false);
  const [flowKind, setFlowKind] = useState(null);
  const [stepCategory, setStepCategory] = useState(null);
  const [stepCashoutCategory, setStepCashoutCategory] = useState(null);

  const [catalog, setCatalog] = useState({ services: [], cashouts: [] });
  const [dealProducts, setDealProducts] = useState([]);
  const [selectedDealProductIds, setSelectedDealProductIds] = useState([]);
  const [dealPreview, setDealPreview] = useState(null);
  const [teacherDealsStep, setTeacherDealsStep] = useState('products');

  const [amount, setAmount] = useState('');
  const [repayment, setRepayment] = useState(6);
  const [description, setDescription] = useState('');
  const [cashoutReason, setCashoutReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [detailRow, setDetailRow] = useState(null);
  const [editRow, setEditRow] = useState(null);

  const selectedDealProducts = useMemo(
    () => dealProducts.filter((p) => selectedDealProductIds.includes(Number(p.id))),
    [dealProducts, selectedDealProductIds]
  );
  const teacherDealsTotal = useMemo(
    () => selectedDealProducts.reduce((sum, p) => sum + Number(p.price_rwf || 0), 0),
    [selectedDealProducts]
  );

  const loadCatalog = useCallback(async () => {
    try {
      const res = await api.get('/services/shule-avance/catalog');
      if (res.data?.success && res.data.data) {
        setCatalog({
          services: Array.isArray(res.data.data.services) ? res.data.data.services : [],
          cashouts: Array.isArray(res.data.data.cashouts) ? res.data.data.cashouts : [],
        });
      }
    } catch {
      /* non-fatal */
    }
  }, []);

  const loadTeacherDealProducts = useCallback(async () => {
    try {
      const res = await api.get('/services/shule-avance/teacher-deal-products');
      if (res.data?.success) {
        setDealProducts(Array.isArray(res.data.data) ? res.data.data : []);
      } else {
        setDealProducts([]);
      }
    } catch {
      setDealProducts([]);
    }
  }, []);

  const load = useCallback(async (silent) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    setError(null);
    try {
      const [reqRes] = await Promise.all([
        api.get('/services/shule-avance/applicant/my-requests'),
        loadCatalog(),
        loadTeacherDealProducts(),
      ]);
      if (reqRes.data?.success) setRows(Array.isArray(reqRes.data.data) ? reqRes.data.data : []);
      else setRows([]);
    } catch (e) {
      setError(e.response?.data?.message || 'Could not load ShuleAvance requests.');
      setRows([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [loadCatalog, loadTeacherDealProducts]);

  useEffect(() => {
    load(false);
  }, [load]);

  useEffect(() => {
    const id = window.setInterval(() => load(true), 28000);
    return () => window.clearInterval(id);
  }, [load]);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (filter === 'all') return true;
      if (filter === 'rejected') {
        return r.status === 'rejected_by_accountant' || r.status === 'rejected_by_manager';
      }
      return r.status === filter;
    });
  }, [rows, filter]);

  const resetForm = () => {
    setAmount('');
    setRepayment(6);
    setDescription('');
    setCashoutReason('');
    setStepCategory(null);
    setStepCashoutCategory(null);
    setSelectedDealProductIds([]);
    setDealPreview(null);
    setTeacherDealsStep('products');
  };

  const openService = () => {
    resetForm();
    setFlowKind('service');
    setStepCategory(null);
    setFlowOpen(true);
  };

  const openCashout = () => {
    resetForm();
    setFlowKind('cashout');
    setStepCashoutCategory(null);
    setFlowOpen(true);
  };

  const closeFlow = () => {
    setFlowOpen(false);
    setFlowKind(null);
    resetForm();
  };

  const submitRequest = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const isTeacherDeals = flowKind === 'service' && stepCategory === 'teacher_deals';
      const amt = isTeacherDeals ? Number(teacherDealsTotal) : Number(String(amount).replace(/[^\d.]/g, ''));
      if (!amt || amt <= 0) {
        setError('Enter a valid amount.');
        setSubmitting(false);
        return;
      }
      const body =
        flowKind === 'service'
          ? {
              request_type: 'service',
              service_category: stepCategory,
              description: String(description || '').trim(),
              amount_requested: amt,
              repayment_term_months: Number(repayment),
              selected_deal_product_ids: isTeacherDeals ? selectedDealProductIds : undefined,
            }
          : {
              request_type: 'cashout',
              cashout_category: stepCashoutCategory,
              reason: String(cashoutReason || '').trim(),
              description: String(description || '').trim() || undefined,
              amount_requested: amt,
              repayment_term_months: Number(repayment),
            };

      if (flowKind === 'service' && !stepCategory) {
        setError('Select a service category.');
        setSubmitting(false);
        return;
      }
      if (flowKind === 'cashout' && !stepCashoutCategory) {
        setError('Select a cashout type.');
        setSubmitting(false);
        return;
      }
      if (isTeacherDeals && !selectedDealProductIds.length) {
        setError('Select at least one Teacher Deal product.');
        setSubmitting(false);
        return;
      }
      if (flowKind === 'cashout' && !body.reason) {
        setError('Add a reason for this cashout.');
        setSubmitting(false);
        return;
      }

      const res = await api.post('/services/shule-avance/applicant/requests', body);
      if (res.data?.success) {
        closeFlow();
        await load(true);
      } else {
        setError(res.data?.message || 'Submit failed.');
      }
    } catch (e) {
      setError(e.response?.data?.message || 'Submit failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const submitUpdate = async () => {
    if (!editRow?.id) return;
    setSubmitting(true);
    setError(null);
    try {
      const amt = Number(String(amount).replace(/[^\d.]/g, ''));
      if (!amt || amt <= 0) {
        setError('Enter a valid amount.');
        setSubmitting(false);
        return;
      }
      const kind = String(editRow.request_type || 'service').toLowerCase();
      const body =
        kind === 'service'
          ? {
              request_type: 'service',
              service_category: stepCategory || editRow.service_category,
              description: String(description || '').trim(),
              amount_requested: amt,
              repayment_term_months: Number(repayment),
            }
          : {
              request_type: 'cashout',
              cashout_category: stepCashoutCategory || editRow.cashout_category_slug,
              reason: String(cashoutReason || '').trim(),
              description: String(description || '').trim() || undefined,
              amount_requested: amt,
              repayment_term_months: Number(repayment),
            };

      if (kind === 'service' && !(stepCategory || editRow.service_category)) {
        setError('Select a service category.');
        setSubmitting(false);
        return;
      }
      if (kind === 'cashout' && !(stepCashoutCategory || editRow.cashout_category_slug)) {
        setError('Select a cashout type.');
        setSubmitting(false);
        return;
      }
      if (kind === 'cashout' && !body.reason) {
        setError('Add a reason for this cashout.');
        setSubmitting(false);
        return;
      }

      const res = await api.put(`/services/shule-avance/applicant/requests/${editRow.id}`, body);
      if (res.data?.success) {
        setEditRow(null);
        resetForm();
        await load(true);
      } else {
        setError(res.data?.message || 'Update failed.');
      }
    } catch (e) {
      setError(e.response?.data?.message || 'Update failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const deleteRow = async (id) => {
    if (!window.confirm('Delete this request? You can only delete items still pending with finance.')) return;
    try {
      await api.delete(`/services/shule-avance/applicant/requests/${id}`);
      await load(true);
      setDetailRow(null);
    } catch (e) {
      alert(e.response?.data?.message || 'Could not delete.');
    }
  };

  const openEdit = (row) => {
    setEditRow(row);
    setAmount(String(row.amount_rwf ?? ''));
    setRepayment(Number(row.repayment_term_months) || 6);
    setStepCategory(row.service_category || null);
    setStepCashoutCategory(row.cashout_category_slug || null);
    if (String(row.request_type).toLowerCase() === 'cashout') {
      setCashoutReason(String(row.cashout_reason || row.purpose || ''));
      setDescription(String(row.details || ''));
    } else {
      setDescription(String(row.purpose || ''));
      setCashoutReason('');
    }
  };

  if (loading && !rows.length) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center bg-re-bg">
        <Loader2 className="h-10 w-10 animate-spin text-re-orange" />
      </div>
    );
  }

  return (
    <div className="animate-in fade-in duration-500 bg-re-bg min-h-screen pb-16">
      <div className="relative w-full overflow-hidden border-b border-black/5 bg-[linear-gradient(135deg,#0E1F35,#1B3354)]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,140,0,0.18),transparent_40%)]" />
        <div className="relative z-10 mx-auto max-w-[1200px] px-5 py-10 md:py-12">
          <p className="text-[10px] font-black uppercase tracking-[0.35em] text-white/50">Staff benefit</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-white md:text-4xl">
            Shule <span className="text-re-orange">Avance</span>
          </h1>
          <p className="mt-2 max-w-xl text-sm font-bold text-white/70">
            Request a service advance or a cashout, track every step, and see school decisions in one place.
          </p>
          {teacher?.first_name ? (
            <p className="mt-4 text-xs font-bold text-white/50">
              Signed in as <span className="text-white/90">{teacher.first_name}</span>
            </p>
          ) : null}
        </div>
      </div>

      <div className="mx-auto max-w-[1200px] px-4 py-8 md:px-6">
        {error && (
          <div className="mb-4 flex items-start gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-bold text-red-700">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        {/* New request */}
        <div className="mb-8 grid gap-4 sm:grid-cols-2">
          <button
            type="button"
            onClick={openService}
            className="group flex items-center gap-4 rounded-[24px] border border-black/5 bg-white p-5 text-left shadow-xl transition hover:-translate-y-0.5 hover:shadow-2xl"
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-re-orange/10 text-re-orange">
              <Wallet className="h-7 w-7" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-black uppercase tracking-widest text-re-text-muted">Option A</p>
              <p className="text-lg font-black text-re-text">Service request</p>
              <p className="mt-1 text-[11px] font-bold text-re-text-muted">
                Cash Power, Airtime &amp; Data, or Teacher Deals
              </p>
            </div>
            <ChevronRight className="h-5 w-5 shrink-0 text-re-text-muted opacity-40 transition group-hover:translate-x-0.5 group-hover:opacity-100" />
          </button>

          <button
            type="button"
            onClick={openCashout}
            className="group flex items-center gap-4 rounded-[24px] border border-black/5 bg-white p-5 text-left shadow-xl transition hover:-translate-y-0.5 hover:shadow-2xl"
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-100 text-sky-800">
              <Banknote className="h-7 w-7" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-black uppercase tracking-widest text-re-text-muted">Option B</p>
              <p className="text-lg font-black text-re-text">Cashout request</p>
              <p className="mt-1 text-[11px] font-bold text-re-text-muted">
                Cash advance with reason and repayment plan
              </p>
            </div>
            <ChevronRight className="h-5 w-5 shrink-0 text-re-text-muted opacity-40 transition group-hover:translate-x-0.5 group-hover:opacity-100" />
          </button>
        </div>

        {/* Filters + refresh */}
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 text-re-text">
            <Filter className="h-4 w-4 text-re-text-muted" />
            <span className="text-[10px] font-black uppercase tracking-widest text-re-text-muted">Status</span>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="rounded-xl border border-black/10 bg-white px-3 py-2 text-xs font-bold outline-none focus:ring-2 focus:ring-re-orange/30"
            >
              <option value="all">All</option>
              <option value="pending_accountant">Pending</option>
              <option value="sent_to_manager">Sent to School Manager</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
          <button
            type="button"
            onClick={() => load(true)}
            disabled={refreshing}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-black/10 bg-white px-4 py-2 text-[10px] font-black uppercase tracking-widest text-re-text shadow-sm"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {/* List */}
        <div className="overflow-hidden rounded-[24px] border border-black/5 bg-white shadow-xl">
          <div className="hidden grid-cols-12 gap-2 border-b border-black/5 bg-re-bg/80 px-4 py-3 text-[9px] font-black uppercase tracking-widest text-re-text-muted md:grid">
            <div className="col-span-1">ID</div>
            <div className="col-span-2">Type</div>
            <div className="col-span-2">Category</div>
            <div className="col-span-2">Amount</div>
            <div className="col-span-2">Repay</div>
            <div className="col-span-2">Status</div>
            <div className="col-span-1 text-right">Actions</div>
          </div>

          {filtered.length === 0 ? (
            <div className="px-4 py-12 text-center text-sm font-bold text-re-text-muted">
              No requests match this filter yet.
            </div>
          ) : (
            <ul className="divide-y divide-black/5">
              {filtered.map((r) => (
                <li key={r.id} className="px-4 py-4 transition hover:bg-re-bg/40">
                  <div className="flex flex-col gap-3 md:grid md:grid-cols-12 md:items-center md:gap-2">
                    <div className="flex items-center justify-between md:col-span-1">
                      <span className="text-[10px] font-black text-re-text-muted md:hidden">ID</span>
                      <span className="font-mono text-xs font-black text-re-text">#{r.id}</span>
                    </div>
                    <div className="flex items-center justify-between md:col-span-2">
                      <span className="text-[10px] font-black text-re-text-muted md:hidden">Type</span>
                      <span className="text-xs font-bold">{requestTypeLabel(r)}</span>
                    </div>
                    <div className="flex items-center justify-between md:col-span-2">
                      <span className="text-[10px] font-black text-re-text-muted md:hidden">Category</span>
                      <span className="text-xs font-bold">{categoryLabel(r, catalog)}</span>
                    </div>
                    <div className="flex items-center justify-between md:col-span-2">
                      <span className="text-[10px] font-black text-re-text-muted md:hidden">Amount</span>
                      <span className="text-xs font-black">{formatMoney(r.amount_rwf)}</span>
                    </div>
                    <div className="flex items-center justify-between md:col-span-2">
                      <span className="text-[10px] font-black text-re-text-muted md:hidden">Repayment</span>
                      <span className="text-xs font-bold">{r.repayment_term_months} mo</span>
                    </div>
                    <div className="flex items-center justify-between md:col-span-2">
                      <span className="text-[10px] font-black text-re-text-muted md:hidden">Status</span>
                      <span
                        className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wide ${
                          STATUS_MAP[r.status]?.className || 'bg-slate-100 text-slate-700 border-slate-200'
                        }`}
                      >
                        {STATUS_MAP[r.status]?.label || r.status}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center justify-end gap-2 md:col-span-1">
                      <button
                        type="button"
                        onClick={() => setDetailRow(r)}
                        className="inline-flex items-center gap-1 rounded-lg border border-black/10 bg-white px-2.5 py-1.5 text-[9px] font-black uppercase tracking-wider text-re-text hover:border-re-orange/40"
                      >
                        <Eye className="h-3.5 w-3.5" /> View
                      </button>
                      {r.status === 'pending_accountant' && (
                        <>
                          {!isTeacherDealRequestRow(r) ? (
                            <button
                              type="button"
                              onClick={() => openEdit(r)}
                              className="inline-flex items-center gap-1 rounded-lg border border-black/10 bg-white px-2.5 py-1.5 text-[9px] font-black uppercase tracking-wider text-re-text hover:border-re-orange/40"
                            >
                              <Pencil className="h-3.5 w-3.5" /> Edit
                            </button>
                          ) : null}
                          <button
                            type="button"
                            onClick={() => deleteRow(r.id)}
                            className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-2.5 py-1.5 text-[9px] font-black uppercase tracking-wider text-red-700"
                          >
                            <Trash2 className="h-3.5 w-3.5" /> Delete
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                  <p className="mt-2 text-[10px] font-bold text-re-text-muted md:pl-0">
                    Submitted {r.submitted_at ? new Date(r.submitted_at).toLocaleString() : '—'}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Create flow */}
      <Modal
        open={flowOpen}
        onClose={closeFlow}
        wide
        title={flowKind === 'cashout' ? 'Cashout request' : 'Service request'}
      >
        {flowKind === 'service' && !stepCategory && (
          <div className="space-y-3">
            <p className="text-xs font-bold text-re-text-muted">Choose a service category</p>
            <div className="grid gap-3 sm:grid-cols-1">
              {(catalog.services || []).map(({ slug, label, description, income_rate_percent }) => {
                const Icon = pickServiceIcon(slug);
                return (
                  <button
                    key={slug}
                    type="button"
                    onClick={() => {
                      setStepCategory(slug);
                      if (slug === 'teacher_deals') {
                        setTeacherDealsStep('products');
                      }
                    }}
                    className="flex items-center gap-3 rounded-2xl border border-black/10 bg-re-bg/80 p-4 text-left transition hover:border-re-orange/40 hover:bg-white"
                  >
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white shadow-inner">
                      <Icon className="h-5 w-5 text-re-orange" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-black text-re-text">{label}</p>
                      <p className="text-[11px] font-bold text-re-text-muted">{description || '—'}</p>
                      <p className="text-[10px] font-black text-re-orange/90 mt-1">
                        {Number(income_rate_percent).toFixed(2)}% / month est.
                      </p>
                    </div>
                    <ChevronRight className="ml-auto h-4 w-4 text-re-text-muted shrink-0" />
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {flowKind === 'service' && stepCategory && (
          <div className="space-y-4">
            <div className="rounded-xl border border-re-orange/30 bg-re-orange/5 px-3 py-2 text-[11px] font-bold text-re-text">
              Service type:{' '}
              <span className="font-black">
                {catalog.services?.find((c) => c.slug === stepCategory)?.label || stepCategory}
              </span>
            </div>

            {stepCategory === 'teacher_deals' ? (
              <>
                <div className="space-y-2">
                  <p className="text-[9px] font-black uppercase tracking-widest text-re-text-muted">
                    {teacherDealsStep === 'products' ? 'Step 1: Products' : 'Step 2: Repayment'}
                  </p>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border ${
                        teacherDealsStep === 'products'
                          ? 'bg-re-orange text-white border-re-orange'
                          : 'bg-white text-slate-500 border-slate-200'
                      }`}
                    >
                      Step 1: Products
                    </span>
                    <span
                      className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border ${
                        teacherDealsStep === 'repayment'
                          ? 'bg-re-orange text-white border-re-orange'
                          : 'bg-white text-slate-500 border-slate-200'
                      }`}
                    >
                      Step 2: Repayment
                    </span>
                  </div>
                </div>

                {teacherDealsStep === 'products' ? (
                  <div className="space-y-3">
                    <p className="text-[10px] font-black uppercase tracking-widest text-re-text-muted">
                      Select one or many products
                    </p>
                    <div className="grid gap-3 sm:grid-cols-2 max-h-[360px] overflow-y-auto pr-1">
                      {dealProducts.map((p) => {
                        const isChecked = selectedDealProductIds.includes(Number(p.id));
                        return (
                          <div
                            key={p.id}
                            role="button"
                            tabIndex={0}
                            onClick={() => {
                              const id = Number(p.id);
                              setSelectedDealProductIds((prev) =>
                                prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
                              );
                            }}
                            onKeyDown={(ev) => {
                              if (ev.key === 'Enter' || ev.key === ' ') {
                                ev.preventDefault();
                                const id = Number(p.id);
                                setSelectedDealProductIds((prev) =>
                                  prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
                                );
                              }
                            }}
                            className={`rounded-xl border p-3 flex gap-3 items-start cursor-pointer transition-all ${
                              isChecked ? 'border-re-orange bg-orange-50/40 shadow-sm' : 'border-black/10 bg-white'
                            }`}
                          >
                            <div className="relative w-16 h-16 rounded-lg border border-black/10 bg-re-bg overflow-hidden shrink-0 flex items-center justify-center">
                              {p.image_url ? (
                                <img src={toAssetUrl(p.image_url)} alt={p.name} className="w-full h-full object-cover" />
                              ) : (
                                <Package className="h-4 w-4 text-slate-400" />
                              )}
                              <button
                                type="button"
                                onClick={(ev) => {
                                  ev.stopPropagation();
                                  setDealPreview(p);
                                }}
                                className="absolute right-1 top-1 h-6 w-6 rounded-full bg-black/60 text-white inline-flex items-center justify-center hover:bg-black/75"
                              >
                                <Eye className="h-3 w-3" />
                              </button>
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-[11px] font-black text-re-text truncate">{p.name}</p>
                              <p className="text-[10px] font-black text-re-orange">{formatMoney(p.price_rwf)}</p>
                              <p className="mt-1 text-[9px] font-black uppercase tracking-widest text-slate-500">
                                {isChecked ? 'Selected' : 'Tap to select'}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                      {!dealProducts.length ? (
                        <div className="sm:col-span-2 rounded-xl border border-dashed border-black/10 bg-white p-4 text-xs font-bold text-re-text-muted">
                          No Teacher Deal products available yet.
                        </div>
                      ) : null}
                    </div>

                    <div className="rounded-xl border border-amber-200 bg-amber-50/80 px-3 py-3 flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-amber-800">
                          Selected: {selectedDealProductIds.length} product(s)
                        </p>
                        <p className="text-sm font-black text-re-text mt-0.5">
                          Total products: {formatMoney(teacherDealsTotal)}
                        </p>
                      </div>
                      <button
                        type="button"
                        disabled={!selectedDealProductIds.length}
                        onClick={() => setTeacherDealsStep('repayment')}
                        className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#FF8C00] to-[#FF5E00] px-5 py-2.5 text-[10px] font-black uppercase tracking-widest text-white shadow-lg disabled:opacity-50"
                      >
                        Continue
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-re-text-muted">
                        Products total (RWF)
                      </label>
                      <input
                        className="mt-1 w-full rounded-xl border border-black/10 bg-re-bg px-3 py-2.5 text-sm font-bold outline-none"
                        value={teacherDealsTotal}
                        readOnly
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-re-text-muted">
                        Repayment period
                      </label>
                      <select
                        className="mt-1 w-full rounded-xl border border-black/10 bg-re-bg px-3 py-2.5 text-sm font-bold outline-none focus:ring-2 focus:ring-re-orange/30"
                        value={repayment}
                        onChange={(e) => setRepayment(Number(e.target.value))}
                      >
                        {REPAYMENT_OPTIONS.map((m) => (
                          <option key={m} value={m}>
                            {m} months
                          </option>
                        ))}
                      </select>
                    </div>
                    <ShuleAvanceRepaymentCalculator
                      principal={teacherDealsTotal}
                      monthlyRatePercent={catalog.services?.find((c) => c.slug === stepCategory)?.income_rate_percent}
                      months={repayment}
                      title="Live estimate"
                      className="mt-1"
                    />
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-re-text-muted">
                        Description <span className="font-bold normal-case text-re-text-muted/70">(optional)</span>
                      </label>
                      <textarea
                        className="mt-1 min-h-[88px] w-full resize-none rounded-xl border border-black/10 bg-re-bg px-3 py-2.5 text-sm font-bold outline-none focus:ring-2 focus:ring-re-orange/30"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Extra context for finance (optional)"
                      />
                    </div>
                    <div className="flex flex-wrap gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setTeacherDealsStep('products')}
                        className="rounded-xl border border-black/10 bg-white px-4 py-2.5 text-[10px] font-black uppercase tracking-widest"
                      >
                        Back
                      </button>
                      <button
                        type="button"
                        disabled={submitting}
                        onClick={submitRequest}
                        className="ml-auto inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#FF8C00] to-[#FF5E00] px-5 py-2.5 text-[10px] font-black uppercase tracking-widest text-white shadow-lg disabled:opacity-50"
                      >
                        {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                        Submit
                      </button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-re-text-muted">
                    Amount (RWF)
                  </label>
                  <input
                    className="mt-1 w-full rounded-xl border border-black/10 bg-re-bg px-3 py-2.5 text-sm font-bold outline-none focus:ring-2 focus:ring-re-orange/30"
                    inputMode="numeric"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="e.g. 150000"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-re-text-muted">
                    Repayment period
                  </label>
                  <select
                    className="mt-1 w-full rounded-xl border border-black/10 bg-re-bg px-3 py-2.5 text-sm font-bold outline-none focus:ring-2 focus:ring-re-orange/30"
                    value={repayment}
                    onChange={(e) => setRepayment(Number(e.target.value))}
                  >
                    {REPAYMENT_OPTIONS.map((m) => (
                      <option key={m} value={m}>
                        {m} months
                      </option>
                    ))}
                  </select>
                </div>
                <ShuleAvanceRepaymentCalculator
                  principal={amount}
                  monthlyRatePercent={catalog.services?.find((c) => c.slug === stepCategory)?.income_rate_percent}
                  months={repayment}
                  title="Live estimate"
                  className="mt-1"
                />
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-re-text-muted">
                    Description <span className="font-bold normal-case text-re-text-muted/70">(optional)</span>
                  </label>
                  <textarea
                    className="mt-1 min-h-[88px] w-full resize-none rounded-xl border border-black/10 bg-re-bg px-3 py-2.5 text-sm font-bold outline-none focus:ring-2 focus:ring-re-orange/30"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Extra context for finance (optional)"
                  />
                </div>
                <div className="flex flex-wrap gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setStepCategory(null)}
                    className="rounded-xl border border-black/10 bg-white px-4 py-2.5 text-[10px] font-black uppercase tracking-widest"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={submitRequest}
                    className="ml-auto inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#FF8C00] to-[#FF5E00] px-5 py-2.5 text-[10px] font-black uppercase tracking-widest text-white shadow-lg disabled:opacity-50"
                  >
                    {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    Submit
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {flowKind === 'cashout' && !stepCashoutCategory && (
          <div className="space-y-3">
            <p className="text-xs font-bold text-re-text-muted">Choose a cashout type</p>
            <div className="grid gap-3">
              {(catalog.cashouts || []).map(({ slug, label, description, income_rate_percent }) => {
                const Icon = pickCashoutIcon(slug);
                return (
                  <button
                    key={slug}
                    type="button"
                    onClick={() => setStepCashoutCategory(slug)}
                    className="flex items-center gap-3 rounded-2xl border border-black/10 bg-re-bg/80 p-4 text-left transition hover:border-sky-400/50 hover:bg-white"
                  >
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-sky-50 text-sky-800">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-black text-re-text">{label}</p>
                      <p className="text-[11px] font-bold text-re-text-muted">{description || '—'}</p>
                      <p className="text-[10px] font-black text-sky-800/90 mt-1">
                        {Number(income_rate_percent).toFixed(2)}% / month est.
                      </p>
                    </div>
                    <ChevronRight className="ml-auto h-4 w-4 text-re-text-muted shrink-0" />
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {flowKind === 'cashout' && stepCashoutCategory && (
          <div className="space-y-4">
            <div className="rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-[11px] font-bold text-slate-800">
              Cashout type:{' '}
              <span className="font-black">
                {catalog.cashouts?.find((c) => c.slug === stepCashoutCategory)?.label || stepCashoutCategory}
              </span>
            </div>
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-re-text-muted">
                Amount (RWF)
              </label>
              <input
                className="mt-1 w-full rounded-xl border border-black/10 bg-re-bg px-3 py-2.5 text-sm font-bold outline-none focus:ring-2 focus:ring-re-orange/30"
                inputMode="numeric"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-re-text-muted">Reason</label>
              <textarea
                className="mt-1 min-h-[72px] w-full resize-none rounded-xl border border-black/10 bg-re-bg px-3 py-2.5 text-sm font-bold outline-none focus:ring-2 focus:ring-re-orange/30"
                value={cashoutReason}
                onChange={(e) => setCashoutReason(e.target.value)}
                placeholder="Why do you need this cashout?"
              />
            </div>
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-re-text-muted">
                Repayment period
              </label>
              <select
                className="mt-1 w-full rounded-xl border border-black/10 bg-re-bg px-3 py-2.5 text-sm font-bold outline-none focus:ring-2 focus:ring-re-orange/30"
                value={repayment}
                onChange={(e) => setRepayment(Number(e.target.value))}
              >
                {REPAYMENT_OPTIONS.map((m) => (
                  <option key={m} value={m}>
                    {m} months
                  </option>
                ))}
              </select>
            </div>
            <ShuleAvanceRepaymentCalculator
              principal={amount}
              monthlyRatePercent={catalog.cashouts?.find((c) => c.slug === stepCashoutCategory)?.income_rate_percent}
              months={repayment}
              title="Live estimate"
            />
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-re-text-muted">
                Description <span className="font-bold normal-case text-re-text-muted/70">(optional)</span>
              </label>
              <textarea
                className="mt-1 min-h-[64px] w-full resize-none rounded-xl border border-black/10 bg-re-bg px-3 py-2.5 text-sm font-bold outline-none focus:ring-2 focus:ring-re-orange/30"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setStepCashoutCategory(null)}
                className="rounded-xl border border-black/10 bg-white px-4 py-2.5 text-[10px] font-black uppercase tracking-widest"
              >
                Back
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={submitRequest}
                className="ml-auto flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#FF8C00] to-[#FF5E00] px-5 py-3 text-[10px] font-black uppercase tracking-widest text-white shadow-lg disabled:opacity-50 sm:flex-none"
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Submit cashout
              </button>
            </div>
          </div>
        )}
      </Modal>

      <Modal open={!!dealPreview} onClose={() => setDealPreview(null)} title="Product preview">
        {dealPreview ? (
          <div className="space-y-3">
            <div className="h-56 rounded-2xl border border-black/10 bg-re-bg overflow-hidden flex items-center justify-center">
              {dealPreview.image_url ? (
                <img src={toAssetUrl(dealPreview.image_url)} alt={dealPreview.name} className="w-full h-full object-cover" />
              ) : (
                <Package className="h-5 w-5 text-slate-400" />
              )}
            </div>
            <div>
              <p className="text-lg font-black text-re-text">{dealPreview.name}</p>
              <p className="text-sm font-black text-re-orange mt-1">{formatMoney(dealPreview.price_rwf)}</p>
              <p className="text-sm font-bold text-re-text-muted mt-2">{dealPreview.description || 'No description.'}</p>
            </div>
          </div>
        ) : null}
      </Modal>

      {/* Detail */}
      <Modal open={!!detailRow} onClose={() => setDetailRow(null)} wide title={`Request #${detailRow?.id || ''}`}>
        {detailRow && (
          <div className="space-y-4 text-sm">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <p className="text-[9px] font-black uppercase tracking-widest text-re-text-muted">Type</p>
                <p className="font-bold">{requestTypeLabel(detailRow)}</p>
              </div>
              <div>
                <p className="text-[9px] font-black uppercase tracking-widest text-re-text-muted">Category</p>
                <p className="font-bold">{categoryLabel(detailRow, catalog)}</p>
              </div>
              <div>
                <p className="text-[9px] font-black uppercase tracking-widest text-re-text-muted">Amount</p>
                <p className="font-black">{formatMoney(detailRow.amount_rwf)}</p>
              </div>
              <div>
                <p className="text-[9px] font-black uppercase tracking-widest text-re-text-muted">Repayment</p>
                <p className="font-bold">{detailRow.repayment_term_months} months</p>
              </div>
            </div>
            <div>
              <p className="text-[9px] font-black uppercase tracking-widest text-re-text-muted">
                {String(detailRow.request_type).toLowerCase() === 'cashout' ? 'Reason' : 'Description'}
              </p>
              <p className="font-bold text-re-text">
                {String(detailRow.request_type).toLowerCase() === 'cashout'
                  ? detailRow.cashout_reason || detailRow.purpose || '—'
                  : detailRow.purpose || '—'}
              </p>
            </div>
            <ShuleAvanceRepaymentCalculator
              principal={detailRow.amount_rwf}
              monthlyRatePercent={resolveRateForRow(detailRow, catalog)}
              months={detailRow.repayment_term_months}
              title="Repayment calculator"
              className="mt-2"
            />
            {detailRow.details ? (
              <div>
                <p className="text-[9px] font-black uppercase tracking-widest text-re-text-muted">Extra detail</p>
                <p className="font-bold text-re-text">{detailRow.details}</p>
              </div>
            ) : null}
            <div className="rounded-2xl border border-black/10 bg-re-bg/60 p-4">
              <p className="text-[9px] font-black uppercase tracking-widest text-re-text-muted">Status</p>
              <div className="mt-2 flex items-center gap-2">
                <span
                  className={`inline-flex items-center rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-wide ${
                    STATUS_MAP[detailRow.status]?.className
                  }`}
                >
                  {STATUS_MAP[detailRow.status]?.label || detailRow.status}
                </span>
                {detailRow.status === 'approved' && <CheckCircle2 className="h-5 w-5 text-emerald-600" />}
                {(detailRow.status === 'rejected_by_accountant' || detailRow.status === 'rejected_by_manager') && (
                  <XCircle className="h-5 w-5 text-red-600" />
                )}
              </div>
            </div>
            {detailRow.accountant_note ? (
              <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4">
                <p className="text-[9px] font-black uppercase tracking-widest text-sky-800">Finance note</p>
                <p className="mt-1 text-sm font-bold text-sky-950">{detailRow.accountant_note}</p>
              </div>
            ) : null}
            {detailRow.manager_feedback ? (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                <p className="text-[9px] font-black uppercase tracking-widest text-emerald-900">School manager</p>
                <p className="mt-1 text-sm font-bold text-emerald-950">{detailRow.manager_feedback}</p>
              </div>
            ) : null}
            <div className="flex flex-wrap gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDetailRow(null)}
                className="rounded-xl border border-black/10 bg-white px-4 py-2 text-[10px] font-black uppercase tracking-widest"
              >
                Close
              </button>
              {detailRow.status === 'pending_accountant' && (
                <>
                  {!isTeacherDealRequestRow(detailRow) ? (
                    <button
                      type="button"
                      onClick={() => {
                        setDetailRow(null);
                        openEdit(detailRow);
                      }}
                      className="rounded-xl border border-re-orange/40 bg-re-orange/10 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-re-text"
                    >
                      Edit request
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => deleteRow(detailRow.id)}
                    className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-red-700"
                  >
                    Delete
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Edit */}
      <Modal open={!!editRow} onClose={() => { setEditRow(null); resetForm(); }} wide title="Update request">
        {editRow && (
          <div className="space-y-4">
            {String(editRow.request_type).toLowerCase() === 'service' && (
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-re-text-muted">Service category</p>
                <div className="mt-2 grid gap-2">
                  {(catalog.services || []).map(({ slug, label }) => {
                    const Icon = pickServiceIcon(slug);
                    return (
                      <button
                        key={slug}
                        type="button"
                        onClick={() => setStepCategory(slug)}
                        className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-left text-xs font-bold transition ${
                          (stepCategory || editRow.service_category) === slug
                            ? 'border-re-orange bg-re-orange/10'
                            : 'border-black/10 bg-white'
                        }`}
                      >
                        <Icon className="h-4 w-4 text-re-orange" />
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            {String(editRow.request_type).toLowerCase() === 'cashout' && (
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-re-text-muted">Cashout type</p>
                <div className="mt-2 grid gap-2">
                  {(catalog.cashouts || []).map(({ slug, label }) => {
                    const Icon = pickCashoutIcon(slug);
                    return (
                      <button
                        key={slug}
                        type="button"
                        onClick={() => setStepCashoutCategory(slug)}
                        className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-left text-xs font-bold transition ${
                          (stepCashoutCategory || editRow.cashout_category_slug) === slug
                            ? 'border-sky-400 bg-sky-50'
                            : 'border-black/10 bg-white'
                        }`}
                      >
                        <Icon className="h-4 w-4 text-sky-800" />
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-re-text-muted">Amount (RWF)</label>
              <input
                className="mt-1 w-full rounded-xl border border-black/10 bg-re-bg px-3 py-2.5 text-sm font-bold"
                inputMode="numeric"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-re-text-muted">Repayment</label>
              <select
                className="mt-1 w-full rounded-xl border border-black/10 bg-re-bg px-3 py-2.5 text-sm font-bold"
                value={repayment}
                onChange={(e) => setRepayment(Number(e.target.value))}
              >
                {REPAYMENT_OPTIONS.map((m) => (
                  <option key={m} value={m}>
                    {m} months
                  </option>
                ))}
              </select>
            </div>
            <ShuleAvanceRepaymentCalculator
              principal={amount}
              monthlyRatePercent={
                String(editRow.request_type).toLowerCase() === 'service'
                  ? catalog.services?.find((c) => c.slug === (stepCategory || editRow.service_category))
                      ?.income_rate_percent
                  : catalog.cashouts?.find((c) => c.slug === (stepCashoutCategory || editRow.cashout_category_slug))
                      ?.income_rate_percent
              }
              months={repayment}
              title="Live estimate"
            />
            {String(editRow.request_type).toLowerCase() === 'service' ? (
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-re-text-muted">
                  Description <span className="font-bold normal-case text-re-text-muted/70">(optional)</span>
                </label>
                <textarea
                  className="mt-1 min-h-[80px] w-full rounded-xl border border-black/10 bg-re-bg px-3 py-2.5 text-sm font-bold"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
            ) : (
              <>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-re-text-muted">Reason</label>
                  <textarea
                    className="mt-1 min-h-[72px] w-full rounded-xl border border-black/10 bg-re-bg px-3 py-2.5 text-sm font-bold"
                    value={cashoutReason}
                    onChange={(e) => setCashoutReason(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-re-text-muted">
                    Description (optional)
                  </label>
                  <textarea
                    className="mt-1 min-h-[64px] w-full rounded-xl border border-black/10 bg-re-bg px-3 py-2.5 text-sm font-bold"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>
              </>
            )}
            <button
              type="button"
              disabled={submitting}
              onClick={submitUpdate}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#FF8C00] to-[#FF5E00] px-5 py-3 text-[10px] font-black uppercase tracking-widest text-white disabled:opacity-50"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Save changes
            </button>
          </div>
        )}
      </Modal>
    </div>
  );
}
