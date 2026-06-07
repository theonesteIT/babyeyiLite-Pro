import { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  CheckCircle2, XCircle, RefreshCw, Search, X, FileText, ShoppingBag,
  Download, Printer, Eye,
} from 'lucide-react';
import ManagerOchreHeroShell from '../components/ManagerOchreHeroShell';
import {
  fetchProcurementStats, fetchRequisitions, fetchPurchaseOrders,
  updateRequisitionStatus, fetchSchoolInfo,
} from '../../shared/procurement/procurementApi';
import {
  exportRequisitionPdf, exportPurchaseOrderPdf,
} from '../../shared/procurement/exportProcurementPdf';
import { formatMoneyRWF } from '../../shared/procurement/amountInWords';
import { REQN_STATUSES } from '../../shared/procurement/constants';
import { formatProcurementDate, paginateList } from '../../shared/procurement/procurementFormat';
import TablePagination from '../../shared/components/TablePagination';
import ProcurementDateFilterDrawer, { ProcurementFilterButton } from '../../shared/procurement/ProcurementDateFilterDrawer';
import {
  EMPTY_PROCUREMENT_DATE_FILTER,
  countActiveProcurementFilters,
  describeProcurementFilter,
  filterProcurementList,
} from '../../shared/procurement/procurementDateFilter';
import useProcurementAcademicOptions from '../../shared/procurement/useProcurementAcademicOptions';

const NAVY = '#000435';

function StatusBadge({ status, map }) {
  const cfg = map[status] || { label: status, color: 'bg-slate-100 text-slate-600 border-slate-200' };
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase border ${cfg.color}`}>
      {cfg.label}
    </span>
  );
}

function RejectModal({ open, onClose, onConfirm }) {
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (open) setReason('');
  }, [open]);
  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
        <div className="px-5 py-4 text-white" style={{ background: NAVY }}>
          <h3 className="font-semibold">Reject Requisition</h3>
        </div>
        <div className="p-5 space-y-3">
          <label className="text-xs font-semibold uppercase text-black/50">Reason</label>
          <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3}
            className="w-full px-3 py-2 rounded-xl border border-black/10 text-sm" placeholder="Why is this rejected?" />
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl border text-xs font-semibold uppercase">Cancel</button>
            <button type="button" disabled={!reason.trim() || saving} onClick={async () => {
              setSaving(true);
              try { await onConfirm(reason); onClose(); } finally { setSaving(false); }
            }} className="px-4 py-2 rounded-xl bg-red-600 text-white text-xs font-semibold uppercase disabled:opacity-50">
              Reject
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default function ProcurementManagerApprovals() {
  const [tab, setTab] = useState('requisitions');
  const [stats, setStats] = useState(null);
  const [requisitions, setRequisitions] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [school, setSchool] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState('');
  const [rejectReqn, setRejectReqn] = useState(null);
  const [viewItem, setViewItem] = useState(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [dateFilter, setDateFilter] = useState(EMPTY_PROCUREMENT_DATE_FILTER);
  const [filterOpen, setFilterOpen] = useState(false);
  const academicOptions = useProcurementAcademicOptions();
  const activeFilterCount = countActiveProcurementFilters(dateFilter);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [s, reqns, pos, sch] = await Promise.all([
        fetchProcurementStats(),
        fetchRequisitions({ status: 'pending' }),
        fetchPurchaseOrders(),
        fetchSchoolInfo(),
      ]);
      setStats(s);
      setRequisitions(reqns || []);
      setPurchaseOrders(pos || []);
      setSchool(sch);
    } catch (e) {
      setToast(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filteredReqns = useMemo(() => {
    let list = filterProcurementList(requisitions, 'requisition_date', dateFilter, academicOptions);
    if (!search.trim()) return list;
    const q = search.toLowerCase();
    return list.filter((r) =>
      (r.requisition_number || '').toLowerCase().includes(q) ||
      (r.purpose || '').toLowerCase().includes(q) ||
      (r.requested_by || '').toLowerCase().includes(q)
    );
  }, [requisitions, search, dateFilter, academicOptions]);

  const filteredPos = useMemo(() => {
    let list = filterProcurementList(purchaseOrders, 'po_date', dateFilter, academicOptions);
    if (!search.trim()) return list;
    const q = search.toLowerCase();
    return list.filter((po) =>
      (po.po_number || '').toLowerCase().includes(q) ||
      (po.supplier_name || '').toLowerCase().includes(q) ||
      (po.requested_by || '').toLowerCase().includes(q)
    );
  }, [purchaseOrders, search, dateFilter, academicOptions]);

  const activeList = tab === 'requisitions' ? filteredReqns : filteredPos;
  const pagination = useMemo(() => paginateList(activeList, page, pageSize), [activeList, page, pageSize]);

  useEffect(() => { setPage(1); }, [tab, search, pageSize, dateFilter]);

  const approveReqn = async (reqn) => {
    try {
      await updateRequisitionStatus(reqn.db_id, { status: 'approved' });
      setToast(`${reqn.requisition_number} approved — accountant can create PO`);
      load();
    } catch (e) { setToast(e.message); }
  };

  const rejectReqnAction = async (reqn, reason) => {
    await updateRequisitionStatus(reqn.db_id, { status: 'rejected', rejection_reason: reason });
    setToast(`${reqn.requisition_number} rejected`);
    load();
  };

  const kpiTiles = [
    { key: 'pending-reqn', label: 'Pending Requisitions', value: requisitions.length, icon: FileText },
    { key: 'po-total', label: 'Purchase Orders', value: stats?.purchase_orders?.total ?? purchaseOrders.length, icon: ShoppingBag },
    { key: 'po-value', label: 'Total PO Value', value: formatMoneyRWF(stats?.purchase_orders?.total_amount ?? 0), icon: CheckCircle2 },
    { key: 'reqn-value', label: 'Requisition Value', value: formatMoneyRWF(stats?.requisitions?.total_amount ?? 0) },
  ];

  return (
    <>
      <ManagerOchreHeroShell
        eyebrow="Procurement"
        title="Procurement Approvals"
        subtitle="Approve priced requisitions once. Staff requests go directly to the accountant for pricing."
        HeroIcon={CheckCircle2}
        headerRight={(
          <button type="button" onClick={load} className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white/10 text-white text-xs font-bold border border-white/20 hover:bg-white/20">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
        )}
        kpiTiles={kpiTiles}
        cardBody={(
          <div className="p-4 sm:p-5 space-y-4">
            {toast && (
              <div className="p-3 rounded-xl bg-amber-50 text-amber-800 text-sm flex justify-between">
                {toast} <button type="button" onClick={() => setToast('')}><X size={14} /></button>
              </div>
            )}

            <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center justify-between gap-3">
              <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
                {[
                  ['requisitions', 'Pending Requisitions', FileText],
                  ['purchase-orders', 'Purchase Order Reports', ShoppingBag],
                ].map(([t, label, Icon]) => (
                  <button key={t} type="button" onClick={() => setTab(t)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold uppercase transition-all ${tab === t ? 'bg-white shadow text-[#000435]' : 'text-black/50'}`}>
                    <Icon size={14} /> {label}
                  </button>
                ))}
              </div>
              <div className="flex flex-1 flex-wrap items-center gap-2 sm:justify-end">
                <div className="relative flex-1 sm:max-w-xs min-w-[140px]">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-black/30" />
                  <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search..."
                    className="h-10 w-full pl-9 pr-3 rounded-xl border border-black/10 text-sm" />
                </div>
                <ProcurementFilterButton activeCount={activeFilterCount} onClick={() => setFilterOpen(true)} />
              </div>
            </div>
            {activeFilterCount > 0 && (
              <div className="px-1 py-2 rounded-xl bg-amber-50/60 flex items-center justify-between gap-2 text-xs text-amber-900/80">
                <span>Showing: <strong>{describeProcurementFilter(dateFilter, academicOptions)}</strong></span>
                <button type="button" onClick={() => setDateFilter(EMPTY_PROCUREMENT_DATE_FILTER)} className="font-semibold underline">
                  Clear
                </button>
              </div>
            )}

            <div className="overflow-x-auto rounded-2xl border border-black/5">
              {tab === 'requisitions' ? (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-[#F7F8FC] text-[10px] uppercase tracking-widest text-black/50">
                      <th className="px-5 py-3 text-left">Requisition No</th>
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
                      <tr><td colSpan={7} className="py-12 text-center text-black/40">Loading...</td></tr>
                  ) : filteredReqns.length === 0 ? (
                    <tr><td colSpan={7} className="py-12 text-center text-black/40">No pending requisitions</td></tr>
                  ) : pagination.items.map((r) => (
                      <tr key={r.db_id} className="border-t border-black/5 hover:bg-amber-50/20">
                        <td className="px-5 py-3.5 font-medium">{r.requisition_number}</td>
                        <td className="px-5 py-3.5">{r.requested_by || '—'}</td>
                        <td className="px-5 py-3.5">{r.reviewed_by || '—'}</td>
                        <td className="px-5 py-3.5 max-w-[180px] truncate">{r.purpose}</td>
                        <td className="px-5 py-3.5 text-right font-medium">{formatMoneyRWF(r.grand_total)}</td>
                        <td className="px-5 py-3.5"><StatusBadge status={r.status} map={REQN_STATUSES} /></td>
                        <td className="px-5 py-3.5">
                          <div className="flex justify-end gap-1">
                            <button type="button" onClick={() => setViewItem({ type: 'requisition', data: r })} className="p-2 rounded-lg hover:bg-black/5"><Eye size={15} /></button>
                            <button type="button" onClick={() => exportRequisitionPdf({ requisition: r, school })} className="p-2 rounded-lg hover:bg-black/5"><Download size={15} /></button>
                            <button type="button" onClick={() => approveReqn(r)} className="p-2 rounded-lg hover:bg-emerald-50 text-emerald-600"><CheckCircle2 size={15} /></button>
                            <button type="button" onClick={() => setRejectReqn(r)} className="p-2 rounded-lg hover:bg-red-50 text-red-600"><XCircle size={15} /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
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
                  ) : filteredPos.length === 0 ? (
                    <tr><td colSpan={8} className="py-12 text-center text-black/40">No purchase orders yet</td></tr>
                  ) : pagination.items.map((po) => (
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
                            <button type="button" onClick={() => setViewItem({ type: 'po', data: po })} className="p-2 rounded-lg hover:bg-black/5"><Eye size={15} /></button>
                            <button type="button" onClick={() => exportPurchaseOrderPdf({ order: po, school })} className="p-2 rounded-lg hover:bg-black/5"><Download size={15} /></button>
                            <button type="button" onClick={() => exportPurchaseOrderPdf({ order: po, school, autoPrint: true })} className="p-2 rounded-lg hover:bg-black/5"><Printer size={15} /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
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
          </div>
        )}
      />

      <ProcurementDateFilterDrawer
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        value={dateFilter}
        onApply={setDateFilter}
        academicOptions={academicOptions}
      />

      <RejectModal
        open={!!rejectReqn}
        onClose={() => setRejectReqn(null)}
        onConfirm={(reason) => rejectReqnAction(rejectReqn, reason)}
      />

      {viewItem && createPortal(
        <>
          <div className="fixed inset-0 bg-black/40 z-[200]" onClick={() => setViewItem(null)} />
          <div className="fixed inset-y-0 right-0 z-[210] w-full md:w-[420px] bg-white shadow-2xl flex flex-col p-6 overflow-y-auto">
            <div className="flex justify-between mb-4">
              <div>
                <p className="text-[9px] uppercase tracking-widest text-black/40">
                  {viewItem.type === 'po' ? 'Purchase Order' : 'Requisition'}
                </p>
                <h3 className="font-semibold text-[#000435]">
                  {viewItem.data.po_number || viewItem.data.requisition_number}
                </h3>
              </div>
              <button type="button" onClick={() => setViewItem(null)}><X size={18} /></button>
            </div>
            <div className="space-y-2 text-sm">
              <p><span className="text-black/50">Purpose:</span> {viewItem.data.purpose}</p>
              <p><span className="text-black/50">Requested By:</span> {viewItem.data.requested_by || '—'}</p>
              {(viewItem.type === 'requisition' || viewItem.type === 'po') && (
                <p><span className="text-black/50">Reviewed By:</span> {viewItem.data.reviewed_by || viewItem.data.verified_by || '—'}</p>
              )}
              {viewItem.type === 'po' && (
                <p><span className="text-black/50">Approved By:</span> {viewItem.data.approved_by || '—'}</p>
              )}
              <p><span className="text-black/50">Amount:</span> <strong>{formatMoneyRWF(viewItem.data.grand_total)}</strong></p>
            </div>
            <div className="mt-4 flex gap-2">
              {viewItem.type === 'po' ? (
                <>
                  <button type="button" onClick={() => exportPurchaseOrderPdf({ order: viewItem.data, school })} className="flex-1 h-10 rounded-xl border text-xs font-semibold uppercase flex items-center justify-center gap-1"><Download size={14} /> PDF</button>
                  <button type="button" onClick={() => exportPurchaseOrderPdf({ order: viewItem.data, school, autoPrint: true })} className="flex-1 h-10 rounded-xl border text-xs font-semibold uppercase flex items-center justify-center gap-1"><Printer size={14} /> Print</button>
                </>
              ) : (
                <>
                  <button type="button" onClick={() => exportRequisitionPdf({ requisition: viewItem.data, school })} className="flex-1 h-10 rounded-xl border text-xs font-semibold uppercase flex items-center justify-center gap-1"><Download size={14} /> PDF</button>
                  <button type="button" onClick={() => exportRequisitionPdf({ requisition: viewItem.data, school, autoPrint: true })} className="flex-1 h-10 rounded-xl border text-xs font-semibold uppercase flex items-center justify-center gap-1"><Printer size={14} /> Print</button>
                </>
              )}
            </div>
          </div>
        </>,
        document.body
      )}
    </>
  );
}
