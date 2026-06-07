import { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  ChevronLeft, ChevronRight, Download, Eye, Plus, Printer, RefreshCw,
  Search, Send, ShoppingBag, X,
} from 'lucide-react';
import AccountantOchreHero from '../components/AccountantOchreHero';
import { useAuth } from '../context/AuthContext';
import {
  fetchProcurementStats, fetchRequisitions, fetchPurchaseOrders,
  createPurchaseOrder, fetchSchoolInfo, fetchSuppliers, createSupplier,
} from '../../../../shared/procurement/procurementApi';
import { exportPurchaseOrderPdf, downloadSamplePdf } from '../../../../shared/procurement/exportProcurementPdf';
import { amountInWordsRWF, formatMoneyRWF, fmtNum } from '../../../../shared/procurement/amountInWords';
import { T, REQN_STATUSES } from '../../../../shared/procurement/constants';
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

function ReqnStatusBadge({ status }) {
  const cfg = REQN_STATUSES[status] || REQN_STATUSES.pending;
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase border ${cfg.color}`}>
      {cfg.label}
    </span>
  );
}

const emptySupplier = () => ({
  name: '', title: '', tin: '', phone: '', email: '', address: '',
});

function CreatePoModal({ open, onClose, requisition, onSaved, userName }) {
  const [step, setStep] = useState(1);
  const [suppliers, setSuppliers] = useState([]);
  const [supplier, setSupplier] = useState(emptySupplier());
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [showNewSupplier, setShowNewSupplier] = useState(false);
  const [taxEnabled, setTaxEnabled] = useState(false);
  const [discountPercent, setDiscountPercent] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setStep(1);
    setError('');
    setSupplier(emptySupplier());
    setSelectedSupplierId('');
    setTaxEnabled(false);
    setDiscountPercent(0);
    fetchSuppliers().then(setSuppliers).catch(() => setSuppliers([]));
  }, [open]);

  const subtotal = Number(requisition?.grand_total || requisition?.subtotal || 0);
  const taxAmount = taxEnabled ? Math.round(subtotal * 0.18) : 0;
  const discountAmount = Math.round(subtotal * (Number(discountPercent) || 0) / 100);
  const grandTotal = subtotal + taxAmount - discountAmount;
  const words = amountInWordsRWF(grandTotal);

  const pickSupplier = (id) => {
    setSelectedSupplierId(id);
    const s = suppliers.find((x) => String(x.id) === String(id));
    if (s) {
      setSupplier({
        name: s.name || s.supplier_name || '',
        title: s.title || '',
        tin: s.tin || '',
        phone: s.phone || s.phone_number || '',
        email: s.email || '',
        address: s.address || '',
      });
    }
  };

  const addSupplier = async () => {
    try {
      const created = await createSupplier({
        name: supplier.name,
        tin: supplier.tin,
        phone: supplier.phone,
        email: supplier.email,
        address: supplier.address,
      });
      setSuppliers((prev) => [...prev, created]);
      setSelectedSupplierId(String(created.id));
      setShowNewSupplier(false);
    } catch (e) {
      setError(e.message);
    }
  };

  const generate = async () => {
    if (!supplier.name?.trim()) { setError('Supplier name is required'); return; }
    if (!requisition?.db_id) return;
    setSubmitting(true);
    setError('');
    try {
      await createPurchaseOrder({
        requisition_id: requisition.db_id,
        supplier_id: selectedSupplierId || null,
        supplier_name: supplier.name,
        supplier_title: supplier.title,
        supplier_tin: supplier.tin,
        supplier_phone: supplier.phone,
        supplier_email: supplier.email,
        supplier_address: supplier.address,
        purpose: requisition.purpose,
        subtotal,
        tax_enabled: taxEnabled,
        tax_percent: 18,
        discount_percent: Number(discountPercent) || 0,
        tax: taxAmount,
        discount: discountAmount,
        grand_total: grandTotal,
        amount_in_words: words,
        requested_by: requisition.requested_by,
        verified_by: requisition.reviewed_by || userName,
        approved_by: requisition.approved_by,
        items: requisition.items,
      });
      onSaved?.();
      onClose();
    } catch (e) {
      setError(e.message || 'Failed to generate PO');
    } finally {
      setSubmitting(false);
    }
  };

  if (!open || !requisition) return null;

  return createPortal(
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="px-6 py-5 text-white" style={{ background: `linear-gradient(135deg, ${T.navy}, #0D2644)` }}>
          <p className="text-[9px] uppercase tracking-widest text-white/60">Purchase Order</p>
          <h2 className="text-lg font-semibold">From {requisition.requisition_number}</h2>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {error && <div className="p-3 rounded-xl bg-red-50 text-red-700 text-sm">{error}</div>}

          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="text-[10px] uppercase tracking-widest text-black/50">Select Supplier</label>
                <select value={selectedSupplierId} onChange={(e) => pickSupplier(e.target.value)}
                  className="mt-1 w-full h-10 px-3 rounded-xl border border-black/10 text-sm">
                  <option value="">— Choose supplier —</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>{s.name || s.supplier_name}</option>
                  ))}
                </select>
              </div>
              <button type="button" onClick={() => setShowNewSupplier(!showNewSupplier)}
                className="flex items-center gap-2 text-xs font-semibold uppercase text-[#F59E0B]">
                <Plus size={14} /> Add New Supplier
              </button>
              {(showNewSupplier || !selectedSupplierId) && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-2xl border border-dashed border-[#F59E0B]/40 bg-amber-50/30">
                  {[
                    ['name', 'Supplier Name *', 'text'],
                    ['title', 'Supplier Title', 'text'],
                    ['tin', 'TIN Number *', 'text'],
                    ['phone', 'Phone Number *', 'tel'],
                    ['email', 'Email', 'email'],
                  ].map(([field, label, type]) => (
                    <div key={field}>
                      <label className="text-[10px] uppercase tracking-widest text-black/50">{label}</label>
                      <input type={type} value={supplier[field]}
                        onChange={(e) => setSupplier((s) => ({ ...s, [field]: e.target.value }))}
                        className="mt-1 w-full h-9 px-3 rounded-xl border border-black/10 text-sm" />
                    </div>
                  ))}
                  <div className="sm:col-span-2">
                    <label className="text-[10px] uppercase tracking-widest text-black/50">Address</label>
                    <input value={supplier.address} onChange={(e) => setSupplier((s) => ({ ...s, address: e.target.value }))}
                      className="mt-1 w-full h-9 px-3 rounded-xl border border-black/10 text-sm" />
                  </div>
                  {showNewSupplier && (
                    <div className="sm:col-span-2">
                      <button onClick={addSupplier} className="px-4 py-2 rounded-xl bg-[#000435] text-white text-xs font-semibold uppercase">Save Supplier</button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="rounded-2xl border border-black/5 p-4 bg-[#F7F8FC] space-y-2 text-sm">
              <p><span className="text-black/50">Requisition:</span> <strong>{requisition.requisition_number}</strong></p>
              <p><span className="text-black/50">Purpose:</span> {requisition.purpose}</p>
              <table className="w-full text-xs mt-3 border border-black/5 rounded-xl overflow-hidden">
                <thead><tr className="bg-amber-50"><th className="px-2 py-2 text-left">Item</th><th className="px-2 py-2 text-right">Qty</th><th className="px-2 py-2 text-right">Price</th><th className="px-2 py-2 text-right">Total</th></tr></thead>
                <tbody>
                  {(requisition.items || []).map((it, i) => (
                    <tr key={i} className="border-t border-black/5">
                      <td className="px-2 py-2">{it.item_name}</td>
                      <td className="px-2 py-2 text-right">{fmtNum(it.quantity)}</td>
                      <td className="px-2 py-2 text-right">{fmtNum(it.unit_price)}</td>
                      <td className="px-2 py-2 text-right">{fmtNum(it.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="p-4 rounded-2xl border border-black/5">
                  <p className="text-[10px] uppercase tracking-widest text-black/40 mb-2">Supplier</p>
                  <p className="font-semibold">{supplier.name}</p>
                  <p className="text-black/60 text-xs">{supplier.phone}</p>
                  <p className="text-black/60 text-xs">TIN: {supplier.tin || '—'}</p>
                </div>
                <div className="p-4 rounded-2xl border border-black/5 space-y-3">
                  <p className="text-[10px] uppercase tracking-widest text-black/40">Financial Summary</p>
                  <div className="flex justify-between text-xs"><span className="text-black/50">Subtotal</span><span>{formatMoneyRWF(subtotal)}</span></div>
                  <label className="flex items-center justify-between gap-3 cursor-pointer">
                    <span className="text-xs text-black/60">Apply VAT 18%</span>
                    <button type="button" onClick={() => setTaxEnabled((v) => !v)}
                      className={`relative w-11 h-6 rounded-full transition-colors ${taxEnabled ? 'bg-[#000435]' : 'bg-black/20'}`}>
                      <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${taxEnabled ? 'translate-x-5' : ''}`} />
                    </button>
                  </label>
                  {taxEnabled && (
                    <div className="flex justify-between text-xs"><span className="text-black/50">Tax (18%)</span><span>{formatMoneyRWF(taxAmount)}</span></div>
                  )}
                  <div>
                    <label className="text-[9px] uppercase text-black/40">Discount (%)</label>
                    <input type="number" min="0" max="100" step="0.5" value={discountPercent}
                      onChange={(e) => setDiscountPercent(e.target.value)}
                      className="mt-1 w-full h-8 px-2 rounded-lg border text-xs" />
                    {discountAmount > 0 && (
                      <p className="text-[10px] text-black/50 mt-1">− {formatMoneyRWF(discountAmount)}</p>
                    )}
                  </div>
                  <div className="pt-2 border-t border-black/5">
                    <p className="font-bold text-lg">{formatMoneyRWF(grandTotal)}</p>
                    <p className="text-[10px] italic text-black/50 mt-1">{words}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t flex justify-between">
          <button onClick={() => step > 1 ? setStep(step - 1) : onClose()} className="flex items-center gap-1 px-4 py-2 rounded-xl border text-xs font-semibold uppercase">
            <ChevronLeft size={14} /> {step > 1 ? 'Back' : 'Cancel'}
          </button>
          {step < 3 ? (
            <button onClick={() => setStep(step + 1)} className="flex items-center gap-1 px-5 py-2 rounded-xl text-xs font-semibold uppercase text-white" style={{ background: T.navy }}>
              Next <ChevronRight size={14} />
            </button>
          ) : (
            <button onClick={generate} disabled={submitting} className="flex items-center gap-1 px-5 py-2 rounded-xl text-xs font-semibold uppercase text-white disabled:opacity-50" style={{ background: 'linear-gradient(135deg,#F59E0B,#D97706)' }}>
              <Send size={14} /> Generate Purchase Order
            </button>
          )}
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

export default function PurchaseOrders() {
  const { staff } = useAuth();
  const userName = resolveName(staff);
  const [stats, setStats] = useState(null);
  const [orders, setOrders] = useState([]);
  const [requisitions, setRequisitions] = useState([]);
  const [reqnSearch, setReqnSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [school, setSchool] = useState(null);
  const [modalReqn, setModalReqn] = useState(null);
  const [viewPo, setViewPo] = useState(null);
  const [toast, setToast] = useState('');
  const [reqnPage, setReqnPage] = useState(1);
  const [reqnPageSize, setReqnPageSize] = useState(10);
  const [poPage, setPoPage] = useState(1);
  const [poPageSize, setPoPageSize] = useState(10);
  const [dateFilter, setDateFilter] = useState(EMPTY_PROCUREMENT_DATE_FILTER);
  const [filterOpen, setFilterOpen] = useState(false);
  const academicOptions = useProcurementAcademicOptions();
  const activeFilterCount = countActiveProcurementFilters(dateFilter);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [s, pos, reqns, sch] = await Promise.all([
        fetchProcurementStats(),
        fetchPurchaseOrders(),
        fetchRequisitions(),
        fetchSchoolInfo(),
      ]);
      setStats(s);
      setOrders(pos || []);
      setRequisitions(reqns || []);
      setSchool(sch);
    } catch (e) {
      setToast(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const poReqnIds = useMemo(() => new Set(orders.map((o) => o.requisition_id).filter(Boolean)), [orders]);

  const approvedReqns = useMemo(
    () => requisitions.filter((r) => r.status === 'approved' && !poReqnIds.has(r.db_id)),
    [requisitions, poReqnIds]
  );

  const filtered = useMemo(() => {
    let list = filterProcurementList(orders, 'po_date', dateFilter, academicOptions);
    if (!search.trim()) return list;
    const q = search.toLowerCase();
    return list.filter((o) =>
      (o.po_number || '').toLowerCase().includes(q) ||
      (o.supplier_name || '').toLowerCase().includes(q)
    );
  }, [orders, search, dateFilter, academicOptions]);

  const filteredReqns = useMemo(() => {
    let list = filterProcurementList(requisitions, 'requisition_date', dateFilter, academicOptions);
    if (reqnSearch.trim()) {
      const q = reqnSearch.toLowerCase();
      list = list.filter((r) =>
        (r.requisition_number || '').toLowerCase().includes(q) ||
        (r.purpose || '').toLowerCase().includes(q) ||
        (r.requested_by || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [requisitions, reqnSearch, dateFilter, academicOptions]);

  const reqnPagination = useMemo(() => paginateList(filteredReqns, reqnPage, reqnPageSize), [filteredReqns, reqnPage, reqnPageSize]);
  const poPagination = useMemo(() => paginateList(filtered, poPage, poPageSize), [filtered, poPage, poPageSize]);

  useEffect(() => { setReqnPage(1); }, [reqnSearch, reqnPageSize, dateFilter]);
  useEffect(() => { setPoPage(1); }, [search, poPageSize, dateFilter]);

  return (
    <div className="min-h-full bg-[#F7F8FC]">
      <AccountantOchreHero
        eyebrow="Procurement"
        titleLine="Purchase"
        titleAccent="Orders"
        subtitle="Staff request → accountant prices → manager approves requisition → create PO, print and pay."
        icon={ShoppingBag}
        rightSlot={
          <button onClick={() => downloadSamplePdf('purchase-order')}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 border border-white/20 text-white text-xs font-semibold uppercase">
            <Download size={14} /> Sample PDF
          </button>
        }
      />

      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 -mt-8 pb-12 relative z-10">
        {toast && (
          <div className="mb-4 p-3 rounded-xl bg-amber-50 text-amber-800 text-sm flex justify-between">
            {toast} <button onClick={() => setToast('')}><X size={14} /></button>
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {[
            ['Total POs', stats?.purchase_orders?.total ?? 0],
            ['Total PO Value', formatMoneyRWF(stats?.purchase_orders?.total_amount ?? 0)],
            ['Requisitions', requisitions.length],
            ['Ready for PO', approvedReqns.length],
          ].map(([label, val]) => (
            <div key={label} className="bg-white rounded-2xl border border-black/5 p-5 shadow-sm">
              <p className="text-[9px] uppercase tracking-widest text-black/40">{label}</p>
              <p className="text-xl font-semibold text-[#000435] mt-1">{val}</p>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <p className="text-xs text-black/50 font-medium">
            {activeFilterCount > 0
              ? <>Period: <strong className="text-[#000435]">{describeProcurementFilter(dateFilter, academicOptions)}</strong></>
              : 'Filter requisitions and purchase orders by academic year, term, month, week, or date range'}
          </p>
          <div className="flex gap-2">
            <ProcurementFilterButton activeCount={activeFilterCount} onClick={() => setFilterOpen(true)} />
            {activeFilterCount > 0 && (
              <button
                type="button"
                onClick={() => setDateFilter(EMPTY_PROCUREMENT_DATE_FILTER)}
                className="h-10 px-3 rounded-xl border border-black/10 text-xs font-semibold uppercase text-black/55"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {approvedReqns.length > 0 && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 mb-6">
            <p className="text-xs font-semibold uppercase tracking-widest text-emerald-800 mb-2">
              Manager-approved requisitions ready for PO
            </p>
            <div className="flex flex-wrap gap-2">
              {approvedReqns.map((r) => (
                <button key={r.db_id} onClick={() => setModalReqn(r)}
                  className="px-3 py-1.5 rounded-xl bg-white border border-emerald-200 text-xs font-medium hover:bg-emerald-100">
                  {r.requisition_number} — Create PO
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="bg-white rounded-3xl border border-black/5 shadow-sm overflow-hidden mb-6">
          <div className="px-5 py-4 border-b flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-[#000435] uppercase tracking-wide">Requisition Orders</h3>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-black/30" />
              <input value={reqnSearch} onChange={(e) => setReqnSearch(e.target.value)} placeholder="Search requisitions..."
                className="h-10 pl-9 pr-3 rounded-xl border border-black/10 text-sm w-48" />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#F7F8FC] text-[10px] uppercase tracking-widest text-black/50">
                  <th className="px-5 py-3 text-left">Requisition No</th>
                  <th className="px-5 py-3 text-left">Request No</th>
                  <th className="px-5 py-3 text-left">Requested By</th>
                  <th className="px-5 py-3 text-left">Reviewed By</th>
                  <th className="px-5 py-3 text-left">Approved By</th>
                  <th className="px-5 py-3 text-right">Amount</th>
                  <th className="px-5 py-3 text-left">Status</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={8} className="py-10 text-center text-black/40">Loading...</td></tr>
                ) : filteredReqns.length === 0 ? (
                  <tr><td colSpan={8} className="py-10 text-center text-black/40">No requisition orders yet</td></tr>
                ) : reqnPagination.items.map((r) => (
                  <tr key={r.db_id} className="border-t border-black/5 hover:bg-amber-50/20">
                    <td className="px-5 py-3.5 font-medium text-[#000435]">{r.requisition_number}</td>
                    <td className="px-5 py-3.5 text-black/60">{r.request_number || '—'}</td>
                    <td className="px-5 py-3.5">{r.requested_by || '—'}</td>
                    <td className="px-5 py-3.5">{r.reviewed_by || '—'}</td>
                    <td className="px-5 py-3.5">{r.approved_by || '—'}</td>
                    <td className="px-5 py-3.5 text-right font-medium">{formatMoneyRWF(r.grand_total)}</td>
                    <td className="px-5 py-3.5"><ReqnStatusBadge status={r.status} /></td>
                    <td className="px-5 py-3.5">
                      <div className="flex justify-end gap-1">
                        {r.status === 'approved' && !poReqnIds.has(r.db_id) && (
                          <button onClick={() => setModalReqn(r)} className="px-2.5 py-1.5 rounded-lg bg-[#000435] text-white text-[10px] font-semibold uppercase">Create PO</button>
                        )}
                        {poReqnIds.has(r.db_id) && (
                          <span className="text-[10px] text-emerald-600 font-semibold uppercase">PO Created</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <TablePagination
            page={reqnPagination.page}
            totalPages={reqnPagination.totalPages}
            total={reqnPagination.total}
            pageSize={reqnPageSize}
            itemCount={reqnPagination.items.length}
            pageStartIndex={reqnPagination.pageStartIndex}
            onPageChange={setReqnPage}
            onPageSizeChange={(n) => { setReqnPageSize(n); setReqnPage(1); }}
          />
        </div>

        <div className="bg-white rounded-3xl border border-black/5 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-[#000435] uppercase tracking-wide">Purchase Order Reports</h3>
            <div className="flex gap-2">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-black/30" />
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search PO..."
                  className="h-10 pl-9 pr-3 rounded-xl border border-black/10 text-sm w-44" />
              </div>
              <button onClick={load} className="p-2.5 rounded-xl border border-black/10"><RefreshCw size={16} className={loading ? 'animate-spin' : ''} /></button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#F7F8FC] text-[10px] uppercase tracking-widest text-black/50">
                  <th className="px-5 py-3 text-left">PO Number</th>
                  <th className="px-5 py-3 text-left">Date</th>
                  <th className="px-5 py-3 text-left">Requested By</th>
                  <th className="px-5 py-3 text-left">Accountant</th>
                  <th className="px-5 py-3 text-left">Manager</th>
                  <th className="px-5 py-3 text-left">Supplier</th>
                  <th className="px-5 py-3 text-right">Amount</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={8} className="py-12 text-center text-black/40">Loading...</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={8} className="py-12 text-center text-black/40">
                    <ShoppingBag size={32} className="mx-auto mb-2 opacity-30" />
                    No purchase orders yet
                  </td></tr>
                ) : poPagination.items.map((po) => (
                  <tr key={po.db_id} className="border-t border-black/5 hover:bg-amber-50/20">
                    <td className="px-5 py-3.5 font-medium text-[#000435]">{po.po_number}</td>
                    <td className="px-5 py-3.5 whitespace-nowrap">{formatProcurementDate(po.po_date)}</td>
                    <td className="px-5 py-3.5">{po.requested_by || '—'}</td>
                    <td className="px-5 py-3.5">{po.verified_by || '—'}</td>
                    <td className="px-5 py-3.5">{po.approved_by || '—'}</td>
                    <td className="px-5 py-3.5">{po.supplier_name}</td>
                    <td className="px-5 py-3.5 text-right font-medium">{formatMoneyRWF(po.grand_total)}</td>
                    <td className="px-5 py-3.5">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => setViewPo(po)} className="p-2 rounded-lg hover:bg-black/5"><Eye size={15} /></button>
                        <button onClick={() => exportPurchaseOrderPdf({ order: po, school })} className="p-2 rounded-lg hover:bg-black/5"><Download size={15} /></button>
                        <button onClick={() => exportPurchaseOrderPdf({ order: po, school, autoPrint: true })} className="p-2 rounded-lg hover:bg-black/5"><Printer size={15} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <TablePagination
            page={poPagination.page}
            totalPages={poPagination.totalPages}
            total={poPagination.total}
            pageSize={poPageSize}
            itemCount={poPagination.items.length}
            pageStartIndex={poPagination.pageStartIndex}
            onPageChange={setPoPage}
            onPageSizeChange={(n) => { setPoPageSize(n); setPoPage(1); }}
          />
        </div>
      </div>

      <ProcurementDateFilterDrawer
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        value={dateFilter}
        onApply={setDateFilter}
        academicOptions={academicOptions}
      />

      <CreatePoModal
        open={!!modalReqn}
        requisition={modalReqn}
        onClose={() => setModalReqn(null)}
        onSaved={() => { setToast('Purchase order generated'); load(); }}
        userName={userName}
      />

      {viewPo && createPortal(
        <>
          <div className="fixed inset-0 bg-black/40 z-[200]" onClick={() => setViewPo(null)} />
          <div className="fixed inset-y-0 right-0 z-[210] w-full md:w-[440px] bg-white shadow-2xl flex flex-col p-6 overflow-y-auto">
            <div className="flex justify-between mb-4">
              <div>
                <p className="text-[9px] uppercase tracking-widest text-black/40">Purchase Order</p>
                <h3 className="font-semibold text-[#000435]">{viewPo.po_number}</h3>
              </div>
              <button onClick={() => setViewPo(null)}><X size={18} /></button>
            </div>
            <div className="mt-4 space-y-2 text-sm">
              <p><span className="text-black/50">Supplier:</span> <strong>{viewPo.supplier_name}</strong></p>
              <p><span className="text-black/50">Requested By:</span> {viewPo.requested_by || '—'}</p>
              <p><span className="text-black/50">Verified By:</span> {viewPo.verified_by || '—'}</p>
              <p><span className="text-black/50">Approved By:</span> {viewPo.approved_by || '—'}</p>
              <p><span className="text-black/50">Subtotal:</span> {formatMoneyRWF(viewPo.subtotal)}</p>
              {viewPo.tax_enabled && <p><span className="text-black/50">Tax (18%):</span> {formatMoneyRWF(viewPo.tax)}</p>}
              {Number(viewPo.discount_percent) > 0 && (
                <p><span className="text-black/50">Discount ({viewPo.discount_percent}%):</span> {formatMoneyRWF(viewPo.discount)}</p>
              )}
              <p><span className="text-black/50">Grand Total:</span> <strong>{formatMoneyRWF(viewPo.grand_total)}</strong></p>
              <p className="text-xs italic text-black/50">{viewPo.amount_in_words || amountInWordsRWF(viewPo.grand_total)}</p>
            </div>
            <div className="mt-4 flex gap-2">
              <button onClick={() => exportPurchaseOrderPdf({ order: viewPo, school })} className="flex-1 h-10 rounded-xl border text-xs font-semibold uppercase flex items-center justify-center gap-1"><Download size={14} /> PDF</button>
              <button onClick={() => exportPurchaseOrderPdf({ order: viewPo, school, autoPrint: true })} className="flex-1 h-10 rounded-xl border text-xs font-semibold uppercase flex items-center justify-center gap-1"><Printer size={14} /> Print</button>
            </div>
          </div>
        </>,
        document.body
      )}
    </div>
  );
}
