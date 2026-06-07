import { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  ClipboardList, Download, Eye, FileText, Plus, Printer, RefreshCw,
  Search, ShoppingCart, Trash2, X, ChevronRight, ChevronLeft, Save, Send,
} from 'lucide-react';
import {
  fetchPurchaseRequests, createPurchaseRequest,
  updatePurchaseRequest, submitPurchaseRequest, fetchSchoolInfo, searchInventoryItems,
} from './procurementApi';
import { exportPurchaseRequestPdf, downloadSamplePdf } from './exportProcurementPdf';
import { fmtNum } from './amountInWords';
import { T, REQUEST_STATUSES, PRIORITIES } from './constants';
import { formatProcurementDate, paginateList } from './procurementFormat';
import TablePagination from '../components/TablePagination';
import ProcurementApprovalSignatures from './ProcurementApprovalSignatures';

const emptyItem = () => ({ item_name: '', description: '', quantity: 1, unit: 'pcs', notes: '' });

function StatusBadge({ status }) {
  const cfg = REQUEST_STATUSES[status] || REQUEST_STATUSES.pending;
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wide border ${cfg.color}`}>
      {cfg.label}
    </span>
  );
}

function StatCard({ label, value, accent }) {
  return (
    <div className="bg-white rounded-2xl border border-black/5 p-5 shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow">
      <div className={`absolute top-0 right-0 w-20 h-20 rounded-full opacity-5 -mr-6 -mt-6 ${accent}`} />
      <p className="text-[9px] font-medium uppercase tracking-[0.2em] text-[#000435]/50 mb-1">{label}</p>
      <p className="text-2xl font-semibold text-[#000435] tracking-tight">{value}</p>
    </div>
  );
}

function RequestStepperModal({ open, onClose, onSaved, portalSource, userName, editRequest, approvalContacts }) {
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [searchQ, setSearchQ] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [form, setForm] = useState({
    request_date: new Date().toISOString().slice(0, 10),
    department: '',
    purpose: '',
    priority: 'normal',
    requested_by: userName || '',
    reviewer: approvalContacts?.reviewer || 'Accountant',
    approver: approvalContacts?.approver || 'School Manager',
    remarks: '',
    items: [emptyItem()],
  });

  useEffect(() => {
    if (!open) return;
    if (editRequest) {
      setForm({
        request_date: editRequest.request_date || new Date().toISOString().slice(0, 10),
        department: editRequest.department || '',
        purpose: editRequest.purpose || '',
        priority: editRequest.priority || 'normal',
        requested_by: editRequest.requested_by || userName || '',
        reviewer: editRequest.reviewer || approvalContacts?.reviewer || 'Accountant',
        approver: editRequest.approver || approvalContacts?.approver || 'School Manager',
        remarks: editRequest.remarks || '',
        items: editRequest.items?.length ? editRequest.items.map((it) => ({
          item_name: it.item_name || '',
          description: it.description || '',
          quantity: it.quantity || 1,
          unit: it.unit || 'pcs',
          notes: it.notes || '',
          inventory_item_id: it.inventory_item_id,
        })) : [emptyItem()],
      });
      setStep(1);
    } else {
      setForm({
        request_date: new Date().toISOString().slice(0, 10),
        department: '',
        purpose: '',
        priority: 'normal',
        requested_by: userName || '',
        reviewer: approvalContacts?.reviewer || 'Accountant',
        approver: approvalContacts?.approver || 'School Manager',
        remarks: '',
        items: [emptyItem()],
      });
      setStep(1);
    }
    setError('');
  }, [open, editRequest, userName, approvalContacts]);

  const searchItems = useCallback(async (q) => {
    setSearchQ(q);
    if (!q || q.length < 2) { setSearchResults([]); return; }
    try {
      const data = await searchInventoryItems(q);
      setSearchResults(data || []);
    } catch { setSearchResults([]); }
  }, []);

  const updateItem = (idx, field, value) => {
    setForm((f) => {
      const items = [...f.items];
      items[idx] = { ...items[idx], [field]: value };
      return { ...f, items };
    });
  };

  const addItem = () => setForm((f) => ({ ...f, items: [...f.items, emptyItem()] }));
  const removeItem = (idx) => setForm((f) => ({ ...f, items: f.items.filter((_, i) => i !== idx) }));

  const pickSearchItem = (idx, hit) => {
    updateItem(idx, 'item_name', hit.item_name);
    updateItem(idx, 'unit', hit.unit || 'pcs');
    if (hit.id) updateItem(idx, 'inventory_item_id', hit.id);
    setSearchResults([]);
    setSearchQ('');
  };

  const validate = () => {
    if (!form.purpose?.trim()) return 'Purpose is required';
    if (!form.items.length) return 'Add at least one item';
    for (const it of form.items) {
      if (!it.item_name?.trim()) return 'Each item needs a name';
      if (Number(it.quantity) <= 0) return 'Quantity must be greater than zero';
    }
    return '';
  };

  const save = async (asDraft) => {
    const err = asDraft ? '' : validate();
    if (err) { setError(err); return; }
    setSubmitting(true);
    setError('');
    try {
      const payload = { ...form, source_portal: portalSource, save_draft: asDraft };
      let result;
      if (editRequest?.db_id) {
        result = await updatePurchaseRequest(editRequest.db_id, { ...payload, status: asDraft ? 'draft' : 'pending' });
        if (!asDraft) await submitPurchaseRequest(editRequest.db_id);
      } else {
        result = await createPurchaseRequest({ ...payload, status: asDraft ? 'draft' : 'pending' });
      }
      onSaved?.(result);
      onClose();
    } catch (e) {
      setError(e.message || 'Failed to save');
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  const totalItems = form.items.length;

  return createPortal(
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="px-6 py-5 border-b border-black/5 flex items-center justify-between" style={{ background: `linear-gradient(135deg, ${T.navy} 0%, #0D2644 100%)` }}>
          <div>
            <p className="text-[9px] font-medium uppercase tracking-widest text-white/60">Purchase Request</p>
            <h2 className="text-lg font-semibold text-white">New Procurement Request</h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/10 text-white"><X size={18} /></button>
        </div>

        <div className="px-6 py-4 border-b border-black/5 bg-[#F7F8FC]">
          <div className="flex items-center gap-2">
            {['Request Info', 'Items', 'Review'].map((label, i) => {
              const n = i + 1;
              const active = step === n;
              const done = step > n;
              return (
                <div key={label} className="flex items-center gap-2 flex-1">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${active ? 'bg-[#F59E0B] text-[#000435]' : done ? 'bg-emerald-500 text-white' : 'bg-white border border-black/10 text-[#000435]/40'}`}>
                    {done ? '✓' : n}
                  </div>
                  <span className={`text-[10px] font-medium uppercase tracking-wide hidden sm:block ${active ? 'text-[#000435]' : 'text-[#000435]/40'}`}>{label}</span>
                  {i < 2 && <ChevronRight size={14} className="text-black/20 ml-auto" />}
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4">
          {error && <div className="p-3 rounded-xl bg-red-50 text-red-700 text-sm border border-red-100">{error}</div>}

          {step === 1 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-medium uppercase tracking-widest text-[#000435]/50">Request Date</label>
                <input type="date" value={form.request_date} onChange={(e) => setForm((f) => ({ ...f, request_date: e.target.value }))}
                  className="mt-1 w-full h-10 px-3 rounded-xl border border-black/10 text-sm" />
              </div>
              <div>
                <label className="text-[10px] font-medium uppercase tracking-widest text-[#000435]/50">Department</label>
                <input value={form.department} onChange={(e) => setForm((f) => ({ ...f, department: e.target.value }))}
                  placeholder="e.g. Kitchen, Science Lab"
                  className="mt-1 w-full h-10 px-3 rounded-xl border border-black/10 text-sm" />
              </div>
              <div className="sm:col-span-2">
                <label className="text-[10px] font-medium uppercase tracking-widest text-[#000435]/50">Purpose of Request *</label>
                <textarea value={form.purpose} onChange={(e) => setForm((f) => ({ ...f, purpose: e.target.value }))}
                  rows={2} placeholder="Describe why these items are needed"
                  className="mt-1 w-full px-3 py-2 rounded-xl border border-black/10 text-sm resize-none" />
              </div>
              <div>
                <label className="text-[10px] font-medium uppercase tracking-widest text-[#000435]/50">Priority</label>
                <select value={form.priority} onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))}
                  className="mt-1 w-full h-10 px-3 rounded-xl border border-black/10 text-sm">
                  {PRIORITIES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-medium uppercase tracking-widest text-[#000435]/50">Requested By</label>
                <input value={form.requested_by} readOnly className="mt-1 w-full h-10 px-3 rounded-xl border border-black/10 text-sm bg-gray-50" />
              </div>
              <div>
                <label className="text-[10px] font-medium uppercase tracking-widest text-[#000435]/50">Reviewer (Accountant)</label>
                <input value={form.reviewer} readOnly className="mt-1 w-full h-10 px-3 rounded-xl border border-black/10 text-sm bg-[#F7F8FC] text-[#000435]" />
              </div>
              <div>
                <label className="text-[10px] font-medium uppercase tracking-widest text-[#000435]/50">Approver (School Manager)</label>
                <input value={form.approver} readOnly className="mt-1 w-full h-10 px-3 rounded-xl border border-black/10 text-sm bg-[#F7F8FC] text-[#000435]" />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-black/30" />
                <input value={searchQ} onChange={(e) => searchItems(e.target.value)}
                  placeholder="Search existing inventory items..."
                  className="w-full h-10 pl-9 pr-3 rounded-xl border border-black/10 text-sm" />
                {searchResults.length > 0 && (
                  <div className="absolute z-10 top-full mt-1 w-full bg-white border border-black/10 rounded-xl shadow-lg max-h-40 overflow-y-auto">
                    {searchResults.map((hit) => (
                      <button key={`${hit.source}-${hit.id}`} type="button"
                        onClick={() => pickSearchItem(0, hit)}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-amber-50 border-b border-black/5 last:border-0">
                        {hit.item_name} <span className="text-black/40 text-xs">({hit.unit})</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="overflow-x-auto rounded-2xl border border-black/5">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-[#FEF3C7] text-[10px] uppercase tracking-widest text-[#000435]">
                      <th className="px-3 py-2.5 text-left font-semibold">Item</th>
                      <th className="px-3 py-2.5 text-left font-semibold">Description</th>
                      <th className="px-3 py-2.5 text-left font-semibold w-20">Qty</th>
                      <th className="px-3 py-2.5 text-left font-semibold w-20">Unit</th>
                      <th className="px-3 py-2.5 text-left font-semibold">Notes</th>
                      <th className="px-3 py-2.5 w-10" />
                    </tr>
                  </thead>
                  <tbody>
                    {form.items.map((it, idx) => (
                      <tr key={idx} className="border-t border-black/5">
                        <td className="px-2 py-1.5">
                          <input value={it.item_name} onChange={(e) => updateItem(idx, 'item_name', e.target.value)}
                            placeholder="Item name" className="w-full h-8 px-2 rounded-lg border border-black/10 text-xs" />
                        </td>
                        <td className="px-2 py-1.5">
                          <input value={it.description} onChange={(e) => updateItem(idx, 'description', e.target.value)}
                            className="w-full h-8 px-2 rounded-lg border border-black/10 text-xs" />
                        </td>
                        <td className="px-2 py-1.5">
                          <input type="number" min="1" value={it.quantity} onChange={(e) => updateItem(idx, 'quantity', e.target.value)}
                            className="w-full h-8 px-2 rounded-lg border border-black/10 text-xs" />
                        </td>
                        <td className="px-2 py-1.5">
                          <input value={it.unit} onChange={(e) => updateItem(idx, 'unit', e.target.value)}
                            className="w-full h-8 px-2 rounded-lg border border-black/10 text-xs" />
                        </td>
                        <td className="px-2 py-1.5">
                          <input value={it.notes} onChange={(e) => updateItem(idx, 'notes', e.target.value)}
                            className="w-full h-8 px-2 rounded-lg border border-black/10 text-xs" />
                        </td>
                        <td className="px-2 py-1.5">
                          <button type="button" onClick={() => removeItem(idx)} disabled={form.items.length <= 1}
                            className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg disabled:opacity-30">
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button type="button" onClick={addItem}
                className="flex items-center gap-2 px-4 py-2 rounded-xl border border-dashed border-[#F59E0B] text-[#000435] text-xs font-semibold uppercase tracking-wide hover:bg-amber-50">
                <Plus size={14} className="text-[#F59E0B]" /> Add More Item
              </button>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-black/5 p-5 bg-[#F7F8FC] space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-widest text-[#000435]/60">Request Summary</h3>
                {[
                  ['Department', form.department || '—'],
                  ['Purpose', form.purpose],
                  ['Priority', form.priority],
                  ['Requested By', form.requested_by],
                  ['Total Items', totalItems],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between text-sm">
                    <span className="text-[#000435]/50">{k}</span>
                    <span className="font-medium text-[#000435] text-right max-w-[60%]">{v}</span>
                  </div>
                ))}
              </div>
              <div className="rounded-2xl border border-black/5 overflow-hidden">
                <table className="w-full text-xs">
                  <thead><tr className="bg-[#000435] text-white"><th className="px-3 py-2 text-left">Item</th><th className="px-3 py-2 text-right">Qty</th><th className="px-3 py-2 text-left">Unit</th></tr></thead>
                  <tbody>
                    {form.items.map((it, i) => (
                      <tr key={i} className="border-t border-black/5">
                        <td className="px-3 py-2">{it.item_name}</td>
                        <td className="px-3 py-2 text-right">{fmtNum(it.quantity)}</td>
                        <td className="px-3 py-2">{it.unit}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <ProcurementApprovalSignatures
                requestedBy={form.requested_by}
                reviewer={form.reviewer}
                approver={form.approver}
                requestDate={form.request_date}
              />
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-black/5 flex items-center justify-between gap-3 bg-white">
          <div className="flex gap-2">
            {step > 1 && (
              <button type="button" onClick={() => setStep((s) => s - 1)}
                className="flex items-center gap-1 px-4 py-2 rounded-xl border border-black/10 text-xs font-semibold uppercase tracking-wide text-[#000435]">
                <ChevronLeft size={14} /> Back
              </button>
            )}
          </div>
          <div className="flex gap-2">
            {step < 3 ? (
              <button type="button" onClick={() => setStep((s) => s + 1)}
                className="flex items-center gap-1 px-5 py-2 rounded-xl text-xs font-semibold uppercase tracking-wide text-white"
                style={{ background: `linear-gradient(135deg, ${T.navy}, #0D2644)` }}>
                Next <ChevronRight size={14} />
              </button>
            ) : (
              <>
                <button type="button" onClick={() => save(true)} disabled={submitting}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-black/10 text-xs font-semibold uppercase tracking-wide text-[#000435] disabled:opacity-50">
                  <Save size={14} /> Save Draft
                </button>
                <button type="button" onClick={() => save(false)} disabled={submitting}
                  className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-semibold uppercase tracking-wide text-white disabled:opacity-50"
                  style={{ background: 'linear-gradient(135deg, #F59E0B, #D97706)' }}>
                  <Send size={14} /> Submit Request
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

function ViewRequestDrawer({ request, school, onClose, onEdit }) {
  if (!request) return null;
  return createPortal(
    <>
      <div className="fixed inset-0 bg-black/40 z-[200]" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 z-[210] w-full md:w-[440px] bg-white shadow-2xl flex flex-col">
        <div className="px-6 py-5 border-b flex items-center justify-between">
          <div>
            <p className="text-[9px] uppercase tracking-widest text-black/40">Purchase Request</p>
            <h3 className="font-semibold text-[#000435]">{request.request_number || request.id}</h3>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-black/5"><X size={18} /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <StatusBadge status={request.status} />
          {[
            ['Date', formatProcurementDate(request.request_date)],
            ['Department', request.department],
            ['Purpose', request.purpose],
            ['Priority', request.priority],
            ['Requested By', request.requested_by],
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between text-sm border-b border-dashed border-black/10 pb-2">
              <span className="text-black/50 text-xs uppercase tracking-wide">{k}</span>
              <span className="font-medium text-[#000435] text-right max-w-[55%]">{v || '—'}</span>
            </div>
          ))}
          <div>
            <p className="text-xs uppercase tracking-widest text-black/40 mb-2">Items ({request.items?.length || 0})</p>
            <div className="rounded-xl border border-black/5 overflow-hidden">
              <table className="w-full text-xs">
                <thead><tr className="bg-amber-50"><th className="px-3 py-2 text-left">Item</th><th className="px-3 py-2 text-right">Qty</th></tr></thead>
                <tbody>
                  {(request.items || []).map((it, i) => (
                    <tr key={i} className="border-t border-black/5">
                      <td className="px-3 py-2">{it.item_name}</td>
                      <td className="px-3 py-2 text-right">{fmtNum(it.quantity)} {it.unit}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <ProcurementApprovalSignatures
            requestedBy={request.requested_by}
            reviewer={request.reviewer || request.reviewed_by}
            approver={request.approver || request.approved_by}
            requestDate={request.request_date}
          />
        </div>
        <div className="p-4 border-t flex gap-2">
          <button onClick={() => exportPurchaseRequestPdf({ request, school })} className="flex-1 flex items-center justify-center gap-1.5 h-10 rounded-xl border border-black/10 text-xs font-semibold uppercase">
            <Download size={14} /> PDF
          </button>
          <button onClick={() => exportPurchaseRequestPdf({ request, school, autoPrint: true })} className="flex-1 flex items-center justify-center gap-1.5 h-10 rounded-xl border border-black/10 text-xs font-semibold uppercase">
            <Printer size={14} /> Print
          </button>
          {request.status === 'draft' && (
            <button onClick={() => { onEdit?.(request); onClose(); }} className="flex-1 h-10 rounded-xl text-xs font-semibold uppercase text-white" style={{ background: T.navy }}>
              Edit
            </button>
          )}
        </div>
      </div>
    </>,
    document.body
  );
}

export default function RequestOrder({
  portalSource = 'teacher',
  userName = '',
  HeroComponent = null,
  heroProps = {},
}) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editRequest, setEditRequest] = useState(null);
  const [viewRequest, setViewRequest] = useState(null);
  const [school, setSchool] = useState(null);
  const [toast, setToast] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const approvalContacts = useMemo(() => ({
    reviewer: school?.reviewer_name || school?.accountant_name || 'Accountant',
    approver: school?.approver_name || school?.manager_name || 'School Manager',
  }), [school]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [r, sch] = await Promise.all([
        fetchPurchaseRequests({ portal: portalSource }),
        fetchSchoolInfo(),
      ]);
      setRequests(r || []);
      setSchool(sch);
    } catch (e) {
      setToast(e.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [portalSource]);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    let list = requests;
    if (statusFilter) list = list.filter((r) => r.status === statusFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((r) =>
        (r.request_number || r.id || '').toLowerCase().includes(q) ||
        (r.purpose || '').toLowerCase().includes(q) ||
        (r.requested_by || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [requests, search, statusFilter]);

  const pagination = useMemo(() => paginateList(filtered, page, pageSize), [filtered, page, pageSize]);

  useEffect(() => { setPage(1); }, [search, statusFilter, pageSize]);

  const ownStats = useMemo(() => ({
    pending: requests.filter((r) => r.status === 'pending').length,
    under_review: requests.filter((r) => r.status === 'under_review').length,
    approved: requests.filter((r) => r.status === 'approved').length,
    rejected: requests.filter((r) => r.status === 'rejected').length,
    drafts: requests.filter((r) => r.status === 'draft').length,
  }), [requests]);

  const defaultHero = (
    <div className="relative w-full min-h-[180px] overflow-hidden bg-[#c87800] px-6 py-10">
      <h1 className="text-2xl font-semibold text-white">Purchase <span className="text-[#FEBF10]">Requests</span></h1>
      <p className="text-white/80 text-sm mt-1">Submit procurement requests for accountant review</p>
    </div>
  );

  return (
    <div className="min-h-full bg-[#F7F8FC]">
      {HeroComponent ? <HeroComponent {...heroProps} /> : defaultHero}

      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 -mt-8 pb-12 relative z-10">
        {toast && (
          <div className="mb-4 p-3 rounded-xl bg-amber-50 text-amber-800 text-sm border border-amber-100 flex justify-between">
            {toast}
            <button onClick={() => setToast('')}><X size={14} /></button>
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
          <StatCard label="Pending" value={ownStats.pending} accent="bg-amber-400" />
          <StatCard label="Under Review" value={ownStats.under_review} accent="bg-blue-400" />
          <StatCard label="Approved" value={ownStats.approved} accent="bg-emerald-400" />
          <StatCard label="Rejected" value={ownStats.rejected} accent="bg-red-400" />
          <StatCard label="Drafts" value={ownStats.drafts} accent="bg-slate-400" />
        </div>

        <div className="bg-white rounded-3xl border border-black/5 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-black/5 flex flex-wrap items-center gap-3 justify-between">
            <div className="flex items-center gap-2 flex-wrap">
              <button onClick={() => { setEditRequest(null); setModalOpen(true); }}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold uppercase tracking-wide text-white shadow-lg"
                style={{ background: `linear-gradient(135deg, ${T.navy}, #0D2644)` }}>
                <Plus size={14} /> Request Purchase
              </button>
              <button onClick={() => setStatusFilter(statusFilter === 'draft' ? '' : 'draft')}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-black/10 text-xs font-semibold uppercase tracking-wide text-[#000435]">
                <FileText size={14} /> Drafts ({ownStats.drafts})
              </button>
              <button onClick={() => downloadSamplePdf('request')}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-black/10 text-xs font-semibold uppercase tracking-wide text-[#000435]">
                <Download size={14} /> Sample PDF
              </button>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-black/30" />
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search requests..."
                  className="h-10 pl-9 pr-3 rounded-xl border border-black/10 text-sm w-48" />
              </div>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
                className="h-10 px-3 rounded-xl border border-black/10 text-sm">
                <option value="">All Status</option>
                {Object.entries(REQUEST_STATUSES).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </select>
              <button onClick={load} className="p-2.5 rounded-xl border border-black/10 hover:bg-black/5">
                <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#F7F8FC] text-[10px] uppercase tracking-widest text-[#000435]/60">
                  <th className="px-5 py-3 text-left font-semibold">Request No</th>
                  <th className="px-5 py-3 text-left font-semibold">Date</th>
                  <th className="px-5 py-3 text-left font-semibold">Purpose</th>
                  <th className="px-5 py-3 text-left font-semibold">Requested By</th>
                  <th className="px-5 py-3 text-left font-semibold">Status</th>
                  <th className="px-5 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={6} className="px-5 py-12 text-center text-black/40">Loading...</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={6} className="px-5 py-12 text-center text-black/40">
                    <ShoppingCart size={32} className="mx-auto mb-2 opacity-30" />
                    No purchase requests yet
                  </td></tr>
                ) : pagination.items.map((req) => (
                  <tr key={req.db_id || req.id} className="border-t border-black/5 hover:bg-amber-50/30 transition-colors">
                    <td className="px-5 py-3.5 font-medium text-[#000435]">{req.request_number || req.id}</td>
                    <td className="px-5 py-3.5 text-black/60 whitespace-nowrap">{formatProcurementDate(req.request_date)}</td>
                    <td className="px-5 py-3.5 max-w-[200px] truncate">{req.purpose}</td>
                    <td className="px-5 py-3.5">{req.requested_by}</td>
                    <td className="px-5 py-3.5"><StatusBadge status={req.status} /></td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => setViewRequest(req)} className="p-2 rounded-lg hover:bg-black/5" title="View"><Eye size={15} /></button>
                        <button onClick={() => exportPurchaseRequestPdf({ request: req, school })} className="p-2 rounded-lg hover:bg-black/5" title="PDF"><Download size={15} /></button>
                        <button onClick={() => exportPurchaseRequestPdf({ request: req, school, autoPrint: true })} className="p-2 rounded-lg hover:bg-black/5" title="Print"><Printer size={15} /></button>
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
        </div>
      </div>

      <RequestStepperModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSaved={() => { setToast('Request saved successfully'); load(); }}
        portalSource={portalSource}
        userName={userName}
        editRequest={editRequest}
        approvalContacts={approvalContacts}
      />
      <ViewRequestDrawer
        request={viewRequest}
        school={school}
        onClose={() => setViewRequest(null)}
        onEdit={(r) => { setEditRequest(r); setModalOpen(true); }}
      />
    </div>
  );
}
