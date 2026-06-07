import { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Check, Clock, Download, Eye, FileText, Printer, RefreshCw, Search,
  X, AlertCircle, CheckCircle2, DollarSign,
} from 'lucide-react';
import AccountantOchreHero from '../components/AccountantOchreHero';
import { useAuth } from '../context/AuthContext';
import {
  fetchProcurementStats, fetchPurchaseRequests, fetchRequisitions,
  createRequisition, fetchSchoolInfo,
} from '../../../../shared/procurement/procurementApi';
import { exportRequisitionPdf, downloadSamplePdf } from '../../../../shared/procurement/exportProcurementPdf';
import { amountInWordsRWF, formatMoneyRWF, fmtNum } from '../../../../shared/procurement/amountInWords';
import { REQN_STATUSES } from '../../../../shared/procurement/constants';
import { formatProcurementDate, paginateList } from '../../../../shared/procurement/procurementFormat';
import TablePagination from '../../../../shared/components/TablePagination';
import ProcurementDateFilterDrawer, { ProcurementFilterButton } from '../../../../shared/procurement/ProcurementDateFilterDrawer';
import {
  EMPTY_PROCUREMENT_DATE_FILTER,
  countActiveProcurementFilters,
  describeProcurementFilter,
  filterProcurementList,
} from '../../../../shared/procurement/procurementDateFilter';
import useProcurementAcademicOptions from '../../../../shared/procurement/useProcurementAcademicOptions';

const MODAL_TABS = [
  { id: 'info', label: 'Request Info' },
  { id: 'pricing', label: 'Items & Pricing' },
  { id: 'summary', label: 'Summary' },
];

function ReqnStatusBadge({ status }) {
  const cfg = REQN_STATUSES[status] || REQN_STATUSES.pending;
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase border ${cfg.color}`}>
      {cfg.label}
    </span>
  );
}

function PendingPricingBadge() {
  return (
    <span className="inline-flex items-center px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide bg-amber-100 text-amber-800 border border-amber-200">
      Pending Pricing
    </span>
  );
}

function RequisitionPricingModal({ open, onClose, request, onSaved, userName, school }) {
  const [activeTab, setActiveTab] = useState('pricing');
  const [items, setItems] = useState([]);
  const [remarks, setRemarks] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open || !request) return;
    setActiveTab('pricing');
    setRemarks('');
    setError('');
    setItems((request.items || []).map((it) => ({
      ...it,
      unit_price: it.unit_price || '',
      total: (Number(it.quantity) || 0) * (Number(it.unit_price) || 0),
    })));
  }, [open, request]);

  const subtotal = useMemo(() => items.reduce((s, it) => s + (Number(it.total) || 0), 0), [items]);
  const grandTotal = subtotal;
  const words = amountInWordsRWF(grandTotal);
  const reviewerName = userName || school?.accountant_name || school?.reviewer_name || 'Accountant';
  const approverName = school?.manager_name || school?.approver_name || 'School Manager';

  const updatePrice = (idx, value) => {
    setItems((prev) => {
      const next = [...prev];
      const it = { ...next[idx], unit_price: value };
      const qty = Number(it.quantity) || 0;
      const price = Number(it.unit_price) || 0;
      it.total = qty * price;
      next[idx] = it;
      return next;
    });
  };

  const save = async () => {
    if (!request?.db_id) return;
    const missingPrice = items.some((it) => !Number(it.unit_price));
    if (missingPrice) {
      setError('Please enter unit price for all items');
      setActiveTab('pricing');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await createRequisition({
        request_id: request.db_id,
        purpose: request.purpose,
        items,
        remarks,
        amount_in_words: words,
        reviewed_by: reviewerName,
      });
      onSaved?.();
      onClose();
    } catch (e) {
      setError(e.message || 'Failed to create requisition');
    } finally {
      setSubmitting(false);
    }
  };

  if (!open || !request) return null;

  return createPortal(
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-3 sm:p-6">
      <div className="absolute inset-0 bg-[#000435]/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden border border-black/5">
        {/* Header */}
        <div className="px-5 sm:px-6 py-4 border-b border-black/5 flex items-start justify-between gap-4 bg-white">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <PendingPricingBadge />
              <span className="text-[10px] font-semibold uppercase tracking-widest text-black/40">
                Requisition Details
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-[#000435] truncate">
              {request.request_number || request.id}
            </h2>
            <p className="text-xs text-black/50 mt-0.5 truncate">{request.purpose}</p>
          </div>
          <button type="button" onClick={onClose} className="p-2 rounded-xl hover:bg-black/5 text-black/50 shrink-0">
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="px-5 sm:px-6 border-b border-black/5 bg-[#FAFBFD]">
          <div className="flex gap-6">
            {MODAL_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`py-3 text-xs font-semibold uppercase tracking-wide border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-[#F59E0B] text-[#000435]'
                    : 'border-transparent text-black/40 hover:text-black/60'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-5">
          {error && (
            <div className="mb-4 p-3 rounded-xl bg-red-50 text-red-700 text-sm border border-red-100 flex items-center gap-2">
              <AlertCircle size={16} /> {error}
            </div>
          )}

          {activeTab === 'info' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                ['Request Number', request.request_number || request.id],
                ['Date Requested', formatProcurementDate(request.request_date)],
                ['Requested By', request.requested_by],
                ['Department', request.department],
                ['Priority', request.priority],
                ['Reviewer (Accountant)', reviewerName],
                ['Approver (Manager)', approverName],
              ].map(([label, value]) => (
                <div key={label} className="p-4 rounded-xl border border-black/5 bg-[#F7F8FC]">
                  <p className="text-[10px] uppercase tracking-widest text-black/40 mb-1">{label}</p>
                  <p className="text-sm font-semibold text-[#000435] capitalize">{value || '—'}</p>
                </div>
              ))}
              <div className="sm:col-span-2 p-4 rounded-xl border border-black/5 bg-[#F7F8FC]">
                <p className="text-[10px] uppercase tracking-widest text-black/40 mb-1">Purpose</p>
                <p className="text-sm text-[#000435]">{request.purpose || '—'}</p>
              </div>
            </div>
          )}

          {activeTab === 'pricing' && (
            <div className="space-y-4">
              <p className="text-xs font-semibold uppercase tracking-widest text-black/50">Requested Items</p>
              <div className="overflow-x-auto rounded-xl border border-black/5">
                <table className="w-full text-sm min-w-[640px]">
                  <thead>
                    <tr className="bg-[#F7F8FC] text-[10px] uppercase tracking-widest text-black/50">
                      <th className="px-4 py-3 text-left w-10">#</th>
                      <th className="px-4 py-3 text-left">Item</th>
                      <th className="px-4 py-3 text-right w-20">Qty</th>
                      <th className="px-4 py-3 text-left w-24">Unit</th>
                      <th className="px-4 py-3 text-right w-36">Unit Price (RWF)</th>
                      <th className="px-4 py-3 text-right w-32">Total (RWF)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((it, idx) => (
                      <tr key={idx} className="border-t border-black/5 hover:bg-amber-50/30">
                        <td className="px-4 py-3 text-black/40 text-xs">{idx + 1}</td>
                        <td className="px-4 py-3">
                          <p className="font-medium text-[#000435]">{it.item_name}</p>
                          {it.description && <p className="text-[10px] text-black/40 mt-0.5">{it.description}</p>}
                        </td>
                        <td className="px-4 py-3 text-right font-medium">{fmtNum(it.quantity)}</td>
                        <td className="px-4 py-3 text-black/60 text-xs">{it.unit || 'pcs'}</td>
                        <td className="px-4 py-3">
                          <input
                            type="number"
                            min="0"
                            step="1"
                            placeholder="0"
                            value={it.unit_price}
                            onChange={(e) => updatePrice(idx, e.target.value)}
                            className="w-full h-9 px-3 rounded-lg border border-black/10 text-right text-sm focus:outline-none focus:ring-2 focus:ring-amber-300/50 focus:border-amber-400"
                          />
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-[#000435]">
                          {fmtNum(it.total)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'summary' && (
            <div className="space-y-5 max-w-lg">
              <div className="rounded-xl border border-black/5 overflow-hidden">
                <div className="px-4 py-3 bg-[#F7F8FC] border-b border-black/5">
                  <p className="text-[10px] uppercase tracking-widest text-black/40">Financial Summary</p>
                </div>
                <div className="p-4 space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-black/50">Subtotal</span>
                    <span className="font-medium">{formatMoneyRWF(subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-black/50">Tax (0%)</span>
                    <span className="font-medium">0 RWF</span>
                  </div>
                  <div className="flex justify-between pt-3 border-t border-black/5">
                    <span className="font-bold text-[#000435]">Grand Total</span>
                    <span className="font-bold text-lg text-[#F59E0B]">{formatMoneyRWF(grandTotal)}</span>
                  </div>
                </div>
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-widest text-black/40">Amount in Words</label>
                <p className="mt-1 p-3 rounded-xl bg-[#F7F8FC] border border-black/5 text-sm italic text-black/70">
                  {words}
                </p>
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-widest text-black/40">Remarks (optional)</label>
                <textarea
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  rows={3}
                  placeholder="Add notes for the manager..."
                  className="mt-1 w-full px-3 py-2 rounded-xl border border-black/10 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-amber-300/50"
                />
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="p-3 rounded-xl border border-black/5 bg-white">
                  <p className="text-[10px] uppercase text-black/40">Reviewed By</p>
                  <p className="font-semibold text-[#000435] mt-0.5">{reviewerName}</p>
                </div>
                <div className="p-3 rounded-xl border border-black/5 bg-white">
                  <p className="text-[10px] uppercase text-black/40">Approver</p>
                  <p className="font-semibold text-[#000435] mt-0.5">{approverName}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 sm:px-6 py-4 border-t border-black/5 bg-white flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl border border-black/15 text-xs font-semibold uppercase text-[#000435] hover:bg-black/5"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={save}
            disabled={submitting}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-semibold uppercase text-white disabled:opacity-50 shadow-lg"
            style={{ background: 'linear-gradient(135deg, #F59E0B, #D97706)' }}
          >
            <Check size={16} />
            {submitting ? 'Saving...' : 'Save & Submit'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

function resolveName(user) {
  if (!user) return '';
  return user.full_name || user.name ||
    [user.first_name, user.last_name].filter(Boolean).join(' ') ||
    user.username || '';
}

export default function RequisitionOrders() {
  const { staff } = useAuth();
  const userName = resolveName(staff);
  const [stats, setStats] = useState(null);
  const [requests, setRequests] = useState([]);
  const [requisitions, setRequisitions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mainTab, setMainTab] = useState('requisitions');
  const [reqnFilter, setReqnFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [school, setSchool] = useState(null);
  const [modalRequest, setModalRequest] = useState(null);
  const [viewReqn, setViewReqn] = useState(null);
  const [toast, setToast] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [pendingPage, setPendingPage] = useState(1);
  const [pendingPageSize, setPendingPageSize] = useState(10);
  const [dateFilter, setDateFilter] = useState(EMPTY_PROCUREMENT_DATE_FILTER);
  const [filterOpen, setFilterOpen] = useState(false);
  const academicOptions = useProcurementAcademicOptions();
  const activeFilterCount = countActiveProcurementFilters(dateFilter);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [s, pending, underReview, reqns, sch] = await Promise.all([
        fetchProcurementStats(),
        fetchPurchaseRequests({ status: 'pending' }),
        fetchPurchaseRequests({ status: 'under_review' }),
        fetchRequisitions(),
        fetchSchoolInfo(),
      ]);
      setStats(s);
      setRequests([...(pending || []), ...(underReview || [])]);
      setRequisitions(reqns || []);
      setSchool(sch);
    } catch (e) {
      setToast(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const pendingRequests = useMemo(() =>
    requests.filter((r) => ['pending', 'under_review'].includes(r.status)),
  [requests]);

  const reqnStats = useMemo(() => ({
    total: requisitions.length,
    pending: requisitions.filter((r) => r.status === 'pending').length,
    approved: requisitions.filter((r) => r.status === 'approved').length,
    rejected: requisitions.filter((r) => r.status === 'rejected').length,
  }), [requisitions]);

  const filteredReqns = useMemo(() => {
    let list = filterProcurementList(requisitions, 'requisition_date', dateFilter, academicOptions);
    if (reqnFilter !== 'all') list = list.filter((r) => r.status === reqnFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((r) =>
        (r.requisition_number || '').toLowerCase().includes(q) ||
        (r.request_number || '').toLowerCase().includes(q) ||
        (r.purpose || '').toLowerCase().includes(q) ||
        (r.requested_by || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [requisitions, reqnFilter, search, dateFilter, academicOptions]);

  const filteredPending = useMemo(() => {
    let list = filterProcurementList(pendingRequests, 'request_date', dateFilter, academicOptions);
    if (!search.trim()) return list;
    const q = search.toLowerCase();
    return list.filter((r) =>
      (r.request_number || '').toLowerCase().includes(q) ||
      (r.requested_by || '').toLowerCase().includes(q) ||
      (r.purpose || '').toLowerCase().includes(q)
    );
  }, [pendingRequests, search, dateFilter, academicOptions]);

  const pagination = useMemo(() => paginateList(filteredReqns, page, pageSize), [filteredReqns, page, pageSize]);
  const pendingPagination = useMemo(
    () => paginateList(filteredPending, pendingPage, pendingPageSize),
    [filteredPending, pendingPage, pendingPageSize]
  );

  useEffect(() => { setPage(1); }, [reqnFilter, search, pageSize, dateFilter]);
  useEffect(() => { setPendingPage(1); }, [search, pendingPageSize, dateFilter]);

  const kpiCards = [
    { label: 'Pending Pricing', value: pendingRequests.length, icon: Clock, accent: 'text-amber-500 bg-amber-50' },
    { label: 'Total Requisitions', value: reqnStats.total, icon: FileText, accent: 'text-blue-600 bg-blue-50' },
    { label: 'Approved', value: reqnStats.approved, icon: CheckCircle2, accent: 'text-emerald-600 bg-emerald-50' },
    { label: 'Total Amount', value: formatMoneyRWF(stats?.requisitions?.total_amount ?? 0), icon: DollarSign, accent: 'text-[#000435] bg-slate-50', small: true },
  ];

  return (
    <div className="min-h-full bg-[#F7F8FC]">
      <AccountantOchreHero
        eyebrow="Procurement"
        titleLine="Requisition"
        titleAccent="Orders"
        subtitle="Set pricing on staff requests. Manager approves once before purchase orders."
        icon={FileText}
        rightSlot={
          <button onClick={() => downloadSamplePdf('requisition')}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 border border-white/20 text-white text-xs font-semibold uppercase">
            <Download size={14} /> Sample PDF
          </button>
        }
      />

      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 -mt-8 pb-12 relative z-10">
        {toast && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-50 text-emerald-800 text-sm flex justify-between border border-emerald-100">
            {toast} <button type="button" onClick={() => setToast('')}><X size={14} /></button>
          </div>
        )}

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          {kpiCards.map(({ label, value, icon: Icon, accent, small }) => (
            <div key={label} className="bg-white rounded-2xl border border-black/5 p-5 shadow-sm flex items-start gap-3">
              <div className={`p-2.5 rounded-xl ${accent}`}>
                <Icon size={18} />
              </div>
              <div className="min-w-0">
                <p className="text-[9px] uppercase tracking-widest text-black/40">{label}</p>
                <p className={`font-semibold text-[#000435] mt-0.5 truncate ${small ? 'text-base' : 'text-xl'}`}>{value}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-3xl border border-black/5 shadow-sm overflow-hidden">
          {/* Main tabs */}
          <div className="px-5 py-4 border-b flex flex-wrap items-center justify-between gap-3">
            <div className="flex gap-1 p-1 bg-[#F7F8FC] rounded-xl">
              {[
                ['requisitions', 'Requisition Orders', FileText],
                ['pending', 'Pending Pricing', Clock, pendingRequests.length],
              ].map(([id, label, Icon, count]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => { setMainTab(id); setSearch(''); }}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold uppercase transition-all ${
                    mainTab === id ? 'bg-[#000435] text-white shadow-sm' : 'text-black/50 hover:text-black/70'
                  }`}
                >
                  <Icon size={14} />
                  {label}
                  {count > 0 && (
                    <span className={`min-w-[1.25rem] h-5 px-1.5 rounded-full text-[10px] font-bold flex items-center justify-center ${
                      mainTab === id ? 'bg-amber-400 text-[#000435]' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {count}
                    </span>
                  )}
                </button>
              ))}
            </div>
            <div className="flex gap-2 flex-wrap">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-black/30" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={mainTab === 'pending' ? 'Search requests...' : 'Search requisitions...'}
                  className="h-10 pl-9 pr-3 rounded-xl border border-black/10 text-sm w-40 sm:w-44"
                />
              </div>
              <ProcurementFilterButton activeCount={activeFilterCount} onClick={() => setFilterOpen(true)} />
              <button type="button" onClick={load} className="p-2.5 rounded-xl border border-black/10">
                <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>
          {activeFilterCount > 0 && (
            <div className="px-5 py-2 border-b border-black/5 bg-amber-50/50 flex items-center justify-between gap-2 text-xs text-amber-900/80">
              <span>Showing: <strong>{describeProcurementFilter(dateFilter, academicOptions)}</strong></span>
              <button type="button" onClick={() => setDateFilter(EMPTY_PROCUREMENT_DATE_FILTER)} className="font-semibold underline">
                Clear
              </button>
            </div>
          )}

          {/* Requisition Orders tab */}
          {mainTab === 'requisitions' && (
            <>
              <div className="px-5 py-3 border-b bg-white flex gap-1 flex-wrap">
                {[
                  ['all', 'All Requisitions'],
                  ['pending', 'Under Review'],
                  ['approved', 'Approved'],
                  ['rejected', 'Rejected'],
                ].map(([t, label]) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setReqnFilter(t)}
                    className={`px-4 py-2 rounded-xl text-xs font-semibold uppercase transition-colors ${
                      reqnFilter === t ? 'bg-[#000435] text-white' : 'text-black/50 hover:bg-black/5'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#F7F8FC] text-[10px] uppercase tracking-widest text-black/50">
                  <th className="px-5 py-3 text-left">Requisition No</th>
                  <th className="px-5 py-3 text-left">Request No</th>
                  <th className="px-5 py-3 text-left">Date</th>
                  <th className="px-5 py-3 text-left">Requested By</th>
                  <th className="px-5 py-3 text-left">Reviewed By</th>
                  <th className="px-5 py-3 text-left">Purpose</th>
                  <th className="px-5 py-3 text-right">Amount</th>
                  <th className="px-5 py-3 text-left">Status</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={9} className="py-12 text-center text-black/40">Loading...</td></tr>
                ) : filteredReqns.length === 0 ? (
                  <tr><td colSpan={9} className="py-12 text-center text-black/40">No requisitions yet</td></tr>
                ) : pagination.items.map((r) => (
                  <tr key={r.db_id} className="border-t border-black/5 hover:bg-amber-50/20">
                    <td className="px-5 py-3.5 font-medium text-[#000435]">{r.requisition_number}</td>
                    <td className="px-5 py-3.5 text-black/60">{r.request_number || '—'}</td>
                    <td className="px-5 py-3.5 whitespace-nowrap">{formatProcurementDate(r.requisition_date)}</td>
                    <td className="px-5 py-3.5">{r.requested_by || '—'}</td>
                    <td className="px-5 py-3.5">{r.reviewed_by || '—'}</td>
                    <td className="px-5 py-3.5 max-w-[160px] truncate" title={r.purpose}>{r.purpose}</td>
                    <td className="px-5 py-3.5 text-right font-medium">{formatMoneyRWF(r.grand_total)}</td>
                    <td className="px-5 py-3.5"><ReqnStatusBadge status={r.status} /></td>
                    <td className="px-5 py-3.5">
                      <div className="flex justify-end gap-1">
                        <button type="button" onClick={() => setViewReqn(r)} className="p-2 rounded-lg hover:bg-black/5"><Eye size={15} /></button>
                        <button type="button" onClick={() => exportRequisitionPdf({ requisition: r, school })} className="p-2 rounded-lg hover:bg-black/5"><Download size={15} /></button>
                        <button type="button" onClick={() => exportRequisitionPdf({ requisition: r, school, autoPrint: true })} className="p-2 rounded-lg hover:bg-black/5"><Printer size={15} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
              </div>
              <TablePagination
                page={pagination.page}
                totalPages={pagination.totalPages}
                total={pagination.total}
                pageSize={pageSize}
                itemCount={pagination.items.length}
                pageStartIndex={pagination.pageStartIndex}
                onPageChange={setPage}
                onPageSizeChange={(n) => { setPageSize(n); setPage(1); }}
              />
            </>
          )}

          {/* Pending Pricing tab */}
          {mainTab === 'pending' && (
            <>
              <div className="px-5 py-3 border-b bg-amber-50/40">
                <p className="text-xs text-amber-900/80">
                  Purchase requests submitted by staff — click <strong>Set Pricing</strong> to add prices and create a requisition.
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-[#F7F8FC] text-[10px] uppercase tracking-widest text-black/50">
                      <th className="px-5 py-3 text-left">Request No</th>
                      <th className="px-5 py-3 text-left">Requested By</th>
                      <th className="px-5 py-3 text-left">Date</th>
                      <th className="px-5 py-3 text-left">Department</th>
                      <th className="px-5 py-3 text-left">Purpose</th>
                      <th className="px-5 py-3 text-center">Items</th>
                      <th className="px-5 py-3 text-left">Status</th>
                      <th className="px-5 py-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr><td colSpan={8} className="py-12 text-center text-black/40">Loading...</td></tr>
                    ) : filteredPending.length === 0 ? (
                      <tr><td colSpan={8} className="py-12 text-center text-black/40">No requests awaiting pricing</td></tr>
                    ) : pendingPagination.items.map((r) => (
                      <tr key={r.db_id} className="border-t border-black/5 hover:bg-amber-50/20">
                        <td className="px-5 py-3.5 font-semibold text-[#000435]">{r.request_number}</td>
                        <td className="px-5 py-3.5">{r.requested_by || '—'}</td>
                        <td className="px-5 py-3.5 whitespace-nowrap">{formatProcurementDate(r.request_date)}</td>
                        <td className="px-5 py-3.5 text-black/60">{r.department || '—'}</td>
                        <td className="px-5 py-3.5 max-w-[180px] truncate" title={r.purpose}>{r.purpose}</td>
                        <td className="px-5 py-3.5 text-center">{r.total_items || r.items?.length || '—'}</td>
                        <td className="px-5 py-3.5"><PendingPricingBadge /></td>
                        <td className="px-5 py-3.5 text-right">
                          <button
                            type="button"
                            onClick={() => setModalRequest(r)}
                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-[10px] font-bold uppercase text-white shadow-sm"
                            style={{ background: 'linear-gradient(135deg, #F59E0B, #D97706)' }}
                          >
                            <DollarSign size={12} /> Set Pricing
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <TablePagination
                page={pendingPagination.page}
                totalPages={pendingPagination.totalPages}
                total={pendingPagination.total}
                pageSize={pendingPageSize}
                itemCount={pendingPagination.items.length}
                pageStartIndex={pendingPagination.pageStartIndex}
                onPageChange={setPendingPage}
                onPageSizeChange={(n) => { setPendingPageSize(n); setPendingPage(1); }}
              />
            </>
          )}
        </div>
      </div>

      <RequisitionPricingModal
        open={!!modalRequest}
        request={modalRequest}
        onClose={() => setModalRequest(null)}
        onSaved={() => { setToast('Requisition submitted for manager approval'); load(); }}
        userName={userName}
        school={school}
      />

      <ProcurementDateFilterDrawer
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        value={dateFilter}
        onApply={setDateFilter}
        academicOptions={academicOptions}
      />

      {viewReqn && createPortal(
        <>
          <div className="fixed inset-0 bg-black/40 z-[200]" onClick={() => setViewReqn(null)} />
          <div className="fixed inset-y-0 right-0 z-[210] w-full md:w-[440px] bg-white shadow-2xl flex flex-col overflow-hidden">
            <div className="px-6 py-5 border-b flex justify-between items-start">
              <div>
                <ReqnStatusBadge status={viewReqn.status} />
                <h3 className="font-bold text-[#000435] mt-2">{viewReqn.requisition_number}</h3>
                <p className="text-xs text-black/50">{viewReqn.request_number}</p>
              </div>
              <button type="button" onClick={() => setViewReqn(null)}><X size={18} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3">
                {[
                  ['Requested By', viewReqn.requested_by],
                  ['Reviewed By', viewReqn.reviewed_by],
                  ['Approved By', viewReqn.approved_by],
                  ['Date', formatProcurementDate(viewReqn.requisition_date)],
                ].map(([k, v]) => (
                  <div key={k} className="p-3 rounded-xl bg-[#F7F8FC]">
                    <p className="text-[10px] uppercase text-black/40">{k}</p>
                    <p className="font-medium text-[#000435] mt-0.5">{v || '—'}</p>
                  </div>
                ))}
              </div>
              <p className="text-black/60">{viewReqn.purpose}</p>
              <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/50">
                <p className="text-[10px] uppercase text-black/40">Grand Total</p>
                <p className="text-xl font-bold text-[#F59E0B]">{formatMoneyRWF(viewReqn.grand_total)}</p>
                <p className="text-xs italic text-black/50 mt-1">{viewReqn.amount_in_words || amountInWordsRWF(viewReqn.grand_total)}</p>
              </div>
              <table className="w-full text-xs border border-black/5 rounded-xl overflow-hidden">
                <thead><tr className="bg-[#F7F8FC]"><th className="px-3 py-2 text-left">Item</th><th className="px-3 py-2 text-right">Total</th></tr></thead>
                <tbody>
                  {(viewReqn.items || []).map((it, i) => (
                    <tr key={i} className="border-t border-black/5">
                      <td className="px-3 py-2">{it.item_name}</td>
                      <td className="px-3 py-2 text-right">{fmtNum(it.total)} RWF</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>,
        document.body
      )}
    </div>
  );
}
