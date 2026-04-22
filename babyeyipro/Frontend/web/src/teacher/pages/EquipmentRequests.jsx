import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { jsPDF } from 'jspdf';
import * as XLSX from 'xlsx';
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  Download,
  Loader2,
  Package,
  RefreshCw,
  Search,
  X,
  XCircle,
} from 'lucide-react';
import api from '../services/api';

const PRIORITIES = ['Low', 'Medium', 'High'];
const STATUS_FLOW = ['pending', 'approved', 'rejected', 'issued', 'returned', 'cancelled'];

function getApiErrorMessage(error, fallback) {
  return error?.response?.data?.message || error?.message || fallback;
}

function fmtDate(v) {
  if (!v) return '—';
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return String(v);
  return d.toLocaleDateString('en-RW', { year: 'numeric', month: 'short', day: '2-digit' });
}

function statusBadge(status) {
  const s = String(status || '').toLowerCase();
  const cls = s === 'approved'
    ? 'bg-emerald-100 text-emerald-700'
    : s === 'rejected'
      ? 'bg-red-100 text-red-700'
      : s === 'issued'
        ? 'bg-blue-100 text-blue-700'
        : s === 'returned'
          ? 'bg-purple-100 text-purple-700'
          : s === 'cancelled'
            ? 'bg-slate-200 text-slate-600'
            : 'bg-amber-100 text-amber-700';
  return <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${cls}`}>{s || 'pending'}</span>;
}

function availabilityBadge(kind) {
  if (kind === 'out_of_stock') return <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-red-100 text-red-700 uppercase">Out of stock</span>;
  if (kind === 'low_stock') return <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 uppercase">Low stock</span>;
  return <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 uppercase">Available</span>;
}

function RequestModal({ open, mode, equipment, initial, onClose, onSubmit }) {
  const [form, setForm] = useState({
    item_id: '',
    quantity_requested: '',
    submitted: new Date().toISOString().slice(0, 10),
    purpose: '',
    priority_level: 'Medium',
    expected_return_date: '',
    attachmentName: '',
    note: '',
  });
  const [err, setErr] = useState('');
  const selectedItem = useMemo(() => equipment.find((x) => Number(x.id) === Number(form.item_id)), [equipment, form.item_id]);

  useEffect(() => {
    if (!open) return;
    setErr('');
    if (initial) {
      setForm({
        item_id: initial.item_id || '',
        quantity_requested: initial.qty || '',
        submitted: String(initial.submitted || '').slice(0, 10) || new Date().toISOString().slice(0, 10),
        purpose: initial.purpose || '',
        priority_level: initial.priority_level ? String(initial.priority_level).replace(/^\w/, (m) => m.toUpperCase()) : 'Medium',
        expected_return_date: initial.expected_return_date ? String(initial.expected_return_date).slice(0, 10) : '',
        attachmentName: initial.attachmentName || '',
        note: initial.note || '',
      });
    } else {
      setForm({
        item_id: '',
        quantity_requested: '',
        submitted: new Date().toISOString().slice(0, 10),
        purpose: '',
        priority_level: 'Medium',
        expected_return_date: '',
        attachmentName: '',
        note: '',
      });
    }
  }, [open, initial]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[220]">
      <div className="absolute inset-0 bg-black/45 backdrop-blur-sm" onClick={onClose} />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="w-full max-w-2xl bg-white rounded-2xl border border-black/10 shadow-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-black/5 flex items-center justify-between">
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">Teacher requisition</p>
              <h3 className="text-sm font-black text-[#1E3A5F]">{mode === 'edit' ? 'Edit request' : 'New equipment request'}</h3>
            </div>
            <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-50 text-slate-400"><X size={16} /></button>
          </div>
          <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="md:col-span-2">
              <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 block mb-1">Select equipment *</label>
              <select
                value={form.item_id}
                onChange={(e) => setForm((f) => ({ ...f, item_id: e.target.value }))}
                className="w-full h-10 rounded-xl border border-black/10 px-3 text-[11px] font-bold text-[#1E3A5F]"
              >
                <option value="">Choose item from stock...</option>
                {equipment.map((it) => (
                  <option key={it.id} value={it.id}>
                    {it.name} ({it.quantity} {it.unit}) - {it.availability.replace('_', ' ')}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 block mb-1">Quantity *</label>
              <input
                type="number"
                min="1"
                value={form.quantity_requested}
                onChange={(e) => setForm((f) => ({ ...f, quantity_requested: e.target.value }))}
                className="w-full h-10 rounded-xl border border-black/10 px-3 text-[11px] font-bold text-[#1E3A5F]"
              />
              {selectedItem ? (
                <p className="text-[10px] font-bold text-slate-500 mt-1">Available: {selectedItem.quantity} {selectedItem.unit}</p>
              ) : null}
            </div>
            <div>
              <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 block mb-1">Request date</label>
              <input
                type="date"
                value={form.submitted}
                onChange={(e) => setForm((f) => ({ ...f, submitted: e.target.value }))}
                className="w-full h-10 rounded-xl border border-black/10 px-3 text-[11px] font-bold text-[#1E3A5F]"
              />
            </div>
            <div>
              <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 block mb-1">Priority level</label>
              <select
                value={form.priority_level}
                onChange={(e) => setForm((f) => ({ ...f, priority_level: e.target.value }))}
                className="w-full h-10 rounded-xl border border-black/10 px-3 text-[11px] font-bold text-[#1E3A5F]"
              >
                {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 block mb-1">Expected return date</label>
              <input
                type="date"
                value={form.expected_return_date}
                onChange={(e) => setForm((f) => ({ ...f, expected_return_date: e.target.value }))}
                className="w-full h-10 rounded-xl border border-black/10 px-3 text-[11px] font-bold text-[#1E3A5F]"
              />
            </div>
            <div>
              <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 block mb-1">Supporting file (optional)</label>
              <input
                type="file"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  setForm((f) => ({ ...f, attachmentName: file?.name || '' }));
                }}
                className="w-full h-10 rounded-xl border border-black/10 px-3 text-[11px] font-bold text-[#1E3A5F] file:mr-3 file:border-0 file:bg-slate-100 file:px-2 file:py-1 file:rounded-lg"
              />
            </div>
            <div className="md:col-span-2">
              <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 block mb-1">Purpose / reason</label>
              <textarea
                rows={3}
                value={form.purpose}
                onChange={(e) => setForm((f) => ({ ...f, purpose: e.target.value }))}
                placeholder="For practical lesson..."
                className="w-full rounded-xl border border-black/10 px-3 py-2 text-[11px] font-bold text-[#1E3A5F]"
              />
            </div>
            <div className="md:col-span-2">
              <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 block mb-1">Note (optional)</label>
              <textarea
                rows={2}
                value={form.note}
                onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
                className="w-full rounded-xl border border-black/10 px-3 py-2 text-[11px] font-bold text-[#1E3A5F]"
              />
            </div>
            {!!err && <p className="md:col-span-2 text-[11px] font-bold text-red-600">{err}</p>}
          </div>
          <div className="px-5 py-4 bg-slate-50 border-t border-black/5 flex justify-between">
            <button
              type="button"
              onClick={() => {
                setErr('');
                setForm({
                  item_id: '',
                  quantity_requested: '',
                  submitted: new Date().toISOString().slice(0, 10),
                  purpose: '',
                  priority_level: 'Medium',
                  expected_return_date: '',
                  attachmentName: '',
                  note: '',
                });
              }}
              className="h-9 px-4 rounded-xl border border-black/10 bg-white text-[10px] font-black uppercase tracking-wider text-slate-600"
            >
              Reset
            </button>
            <div className="flex gap-2">
              <button onClick={onClose} className="h-9 px-4 rounded-xl border border-black/10 bg-white text-[10px] font-black uppercase tracking-wider text-slate-600">Cancel</button>
              <button
                onClick={async () => {
                  const qty = Number(form.quantity_requested || 0);
                  if (!form.item_id || qty <= 0) {
                    setErr('Please select equipment and valid quantity.');
                    return;
                  }
                  if (selectedItem && qty > Number(selectedItem.quantity || 0)) {
                    setErr(`Cannot request more than available stock (${selectedItem.quantity}).`);
                    return;
                  }
                  setErr('');
                  await onSubmit({
                    item_id: Number(form.item_id),
                    quantity_requested: qty,
                    submitted: form.submitted,
                    purpose: form.purpose,
                    priority_level: String(form.priority_level || 'Medium').toLowerCase(),
                    expected_return_date: form.expected_return_date || null,
                    attachmentName: form.attachmentName || null,
                    note: form.note || null,
                  });
                }}
                className="h-9 px-5 rounded-xl bg-[#1E3A5F] text-white text-[10px] font-black uppercase tracking-wider"
              >
                {mode === 'edit' ? 'Save changes' : 'Submit request'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

function DetailsModal({ row, onClose }) {
  if (!row) return null;
  return createPortal(
    <div className="fixed inset-0 z-[230]">
      <div className="absolute inset-0 bg-black/45 backdrop-blur-sm" onClick={onClose} />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="w-full max-w-xl bg-white rounded-2xl border border-black/10 shadow-2xl">
          <div className="px-5 py-4 border-b border-black/5 flex items-center justify-between">
            <h3 className="text-sm font-black text-[#1E3A5F]">Request details - {row.id}</h3>
            <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-50 text-slate-400"><X size={16} /></button>
          </div>
          <div className="p-5 space-y-2 text-[12px] font-bold text-slate-700">
            <p><span className="text-slate-400 uppercase text-[10px]">Equipment:</span> {row.item_name || row.items}</p>
            <p><span className="text-slate-400 uppercase text-[10px]">Quantity:</span> {row.qty || 0}</p>
            <p><span className="text-slate-400 uppercase text-[10px]">Purpose:</span> {row.purpose || '—'}</p>
            <p><span className="text-slate-400 uppercase text-[10px]">Priority:</span> {row.priority_level || '—'}</p>
            <p><span className="text-slate-400 uppercase text-[10px]">Status:</span> {statusBadge(row.status)}</p>
            <p><span className="text-slate-400 uppercase text-[10px]">Submitted:</span> {fmtDate(row.submitted)}</p>
            <p><span className="text-slate-400 uppercase text-[10px]">Approval date:</span> {fmtDate(row.approved_at)}</p>
            <p><span className="text-slate-400 uppercase text-[10px]">Issued date:</span> {fmtDate(row.issued_at)}</p>
            <p><span className="text-slate-400 uppercase text-[10px]">Expected return:</span> {fmtDate(row.expected_return_date)}</p>
            <p><span className="text-slate-400 uppercase text-[10px]">Store/Admin feedback:</span> {row.status_note || row.note || '—'}</p>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default function EquipmentRequests() {
  const [loading, setLoading] = useState(true);
  const [equipment, setEquipment] = useState([]);
  const [requests, setRequests] = useState([]);
  const [toast, setToast] = useState(null);
  const [searchEquipment, setSearchEquipment] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [dateFilter, setDateFilter] = useState('');
  const [equipmentFilter, setEquipmentFilter] = useState('All');
  const [modal, setModal] = useState({ open: false, mode: 'create', row: null });
  const [details, setDetails] = useState(null);
  const [busyId, setBusyId] = useState(0);

  useEffect(() => {
    if (!toast) return undefined;
    const t = window.setTimeout(() => setToast(null), 3800);
    return () => window.clearTimeout(t);
  }, [toast]);

  const load = async () => {
    setLoading(true);
    try {
      const [eqRes, reqRes] = await Promise.allSettled([
        api.get('/teacher-portal/inventory-equipment', { params: { q: searchEquipment || undefined } }),
        api.get('/teacher-portal/requisitions'),
      ]);
      if (eqRes.status === 'fulfilled' && eqRes.value.data?.success) setEquipment(eqRes.value.data.data || []);
      if (reqRes.status === 'fulfilled' && reqRes.value.data?.success) setRequests(reqRes.value.data.data || []);
      if (eqRes.status === 'rejected' || reqRes.status === 'rejected') {
        const err = eqRes.status === 'rejected' ? eqRes.reason : reqRes.reason;
        setToast({
          type: 'error',
          message: getApiErrorMessage(err, 'Failed to refresh requests.'),
          retryAction: 'load',
        });
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    return requests.filter((r) => {
      const stOk = statusFilter === 'All' || r.status === statusFilter;
      const eqOk = equipmentFilter === 'All' || String(r.item_id || '') === equipmentFilter;
      const dOk = !dateFilter || String(r.submitted || '').slice(0, 10) === dateFilter;
      return stOk && eqOk && dOk;
    });
  }, [requests, statusFilter, equipmentFilter, dateFilter]);

  const notifications = useMemo(() => {
    return requests
      .filter((r) => ['approved', 'rejected', 'issued', 'returned'].includes(String(r.status || '').toLowerCase()))
      .slice(0, 4);
  }, [requests]);

  const submitCreate = async (payload) => {
    try {
      await api.post('/teacher-portal/requisitions', payload);
      setModal({ open: false, mode: 'create', row: null });
      setToast({ type: 'success', message: 'Request submitted successfully.' });
      await load();
    } catch (error) {
      setToast({ type: 'error', message: getApiErrorMessage(error, 'Failed to submit request.') });
    }
  };

  const submitEdit = async (payload) => {
    if (!modal.row?.db_id) return;
    try {
      await api.patch(`/teacher-portal/requisitions/${modal.row.db_id}`, payload);
      setModal({ open: false, mode: 'create', row: null });
      setToast({ type: 'success', message: 'Request updated successfully.' });
      await load();
    } catch (error) {
      setToast({ type: 'error', message: getApiErrorMessage(error, 'Failed to update request.') });
    }
  };

  const cancelRequest = async (row) => {
    if (!row?.db_id) return;
    setBusyId(row.db_id);
    try {
      await api.delete(`/teacher-portal/requisitions/${row.db_id}`);
      setToast({ type: 'success', message: 'Request cancelled.' });
      await load();
    } catch (error) {
      setToast({ type: 'error', message: getApiErrorMessage(error, 'Failed to cancel request.') });
    } finally {
      setBusyId(0);
    }
  };

  const exportExcel = () => {
    const rows = filtered.map((r) => ({
      request_id: r.id,
      equipment: r.item_name || r.items,
      quantity: r.qty || 0,
      status: r.status,
      requested_date: String(r.submitted || '').slice(0, 10),
      purpose: r.purpose || '',
      priority: r.priority_level || '',
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'MyRequests');
    XLSX.writeFile(wb, 'teacher-equipment-requests.xlsx');
  };

  const exportPdf = () => {
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Teacher Equipment Requests', 40, 40);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Generated: ${new Date().toLocaleString()}`, 40, 58);
    let y = 82;
    filtered.forEach((r) => {
      if (y > 780) {
        doc.addPage();
        y = 40;
      }
      doc.text(`${r.id} | ${r.item_name || r.items} | qty ${r.qty || 0} | ${r.status} | ${String(r.submitted || '').slice(0, 10)}`, 40, y);
      y += 14;
    });
    doc.save('teacher-equipment-requests.pdf');
  };

  return (
    <div className="animate-in fade-in duration-500 bg-re-bg min-h-screen p-5 md:p-8">
      <div className="max-w-[1400px] mx-auto space-y-4">
        <div className="bg-white border border-black/5 rounded-2xl p-4 md:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.22em] text-slate-400">Teacher stock requests</p>
              <h1 className="text-xl font-black text-[#1E3A5F]">Request Equipment</h1>
            </div>
            <div className="flex gap-2">
              <button onClick={load} className="h-9 px-3 rounded-xl bg-white border border-black/10 text-[10px] font-black uppercase tracking-wider text-slate-600 flex items-center gap-1"><RefreshCw size={13} />Refresh</button>
              <button onClick={exportExcel} className="h-9 px-3 rounded-xl bg-white border border-black/10 text-[10px] font-black uppercase tracking-wider text-slate-600 flex items-center gap-1"><Download size={13} />Excel</button>
              <button onClick={exportPdf} className="h-9 px-3 rounded-xl bg-white border border-black/10 text-[10px] font-black uppercase tracking-wider text-slate-600 flex items-center gap-1"><Download size={13} />PDF</button>
              <button onClick={() => setModal({ open: true, mode: 'create', row: null })} className="h-9 px-4 rounded-xl bg-[#1E3A5F] text-white text-[10px] font-black uppercase tracking-wider">New request</button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 bg-white border border-black/5 rounded-2xl overflow-hidden">
            <div className="p-4 border-b border-black/5 flex flex-wrap gap-2 items-center">
              <div className="relative flex-1 min-w-[220px]">
                <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={searchEquipment}
                  onChange={(e) => setSearchEquipment(e.target.value)}
                  placeholder="Search equipment in stock..."
                  className="w-full h-9 rounded-xl border border-black/10 pl-8 pr-3 text-[11px] font-bold text-[#1E3A5F]"
                />
              </div>
              <button onClick={load} className="h-9 px-3 rounded-xl bg-slate-100 text-[10px] font-black uppercase tracking-wider text-slate-600">Search</button>
            </div>
            <div className="overflow-x-auto">
              {loading ? (
                <div className="p-8 flex items-center gap-2 text-slate-400 text-[11px] font-black uppercase"><Loader2 size={16} className="animate-spin" />Loading stock...</div>
              ) : (
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-50 border-b border-black/5">
                      {['Equipment', 'Category', 'Available qty', 'Status'].map((h) => (
                        <th key={h} className="px-4 py-3 text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black/5">
                    {equipment.map((it) => (
                      <tr key={it.id}>
                        <td className="px-4 py-3 text-[11px] font-black text-[#1E3A5F]">{it.name}</td>
                        <td className="px-4 py-3 text-[10px] font-bold text-slate-500">{it.category || '—'}</td>
                        <td className="px-4 py-3 text-[11px] font-black text-slate-700">{it.quantity} {it.unit}</td>
                        <td className="px-4 py-3">{availabilityBadge(it.availability)}</td>
                      </tr>
                    ))}
                    {!equipment.length && (
                      <tr><td className="px-4 py-6 text-[11px] font-black uppercase text-slate-400" colSpan={4}>No equipment found.</td></tr>
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          <div className="bg-white border border-black/5 rounded-2xl p-4">
            <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-[#1E3A5F] mb-3">Notifications</h3>
            <div className="space-y-2">
              {notifications.map((n) => (
                <div key={n.id} className="p-3 rounded-xl bg-slate-50 border border-black/5">
                  <p className="text-[10px] font-black text-slate-700">{n.item_name || n.items}</p>
                  <p className="text-[9px] font-bold text-slate-500 mt-1">{statusBadge(n.status)}</p>
                </div>
              ))}
              {!notifications.length && (
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">No new updates.</p>
              )}
            </div>
          </div>
        </div>

        <div className="bg-white border border-black/5 rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-black/5 flex flex-wrap items-center gap-2">
            <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-[#1E3A5F] mr-auto">My requests</h3>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="h-9 rounded-xl border border-black/10 px-3 text-[10px] font-black uppercase text-slate-600">
              <option value="All">All status</option>
              {STATUS_FLOW.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <select value={equipmentFilter} onChange={(e) => setEquipmentFilter(e.target.value)} className="h-9 rounded-xl border border-black/10 px-3 text-[10px] font-black uppercase text-slate-600">
              <option value="All">All equipment</option>
              {equipment.map((it) => <option key={it.id} value={String(it.id)}>{it.name}</option>)}
            </select>
            <input type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} className="h-9 rounded-xl border border-black/10 px-3 text-[10px] font-black text-slate-600" />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 border-b border-black/5">
                  {['Request ID', 'Equipment', 'Quantity', 'Status', 'Date requested', 'Action'].map((h) => (
                    <th key={h} className="px-4 py-3 text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5">
                {filtered.map((r) => (
                  <tr key={r.id}>
                    <td className="px-4 py-3 text-[10px] font-black text-[#1E3A5F]">{r.id}</td>
                    <td className="px-4 py-3 text-[10px] font-bold text-slate-600">{r.item_name || r.items}</td>
                    <td className="px-4 py-3 text-[11px] font-black text-slate-700">{r.qty || 0}</td>
                    <td className="px-4 py-3">{statusBadge(r.status)}</td>
                    <td className="px-4 py-3 text-[10px] font-bold text-slate-500">{fmtDate(r.submitted)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button onClick={() => setDetails(r)} className="h-7 px-3 rounded-lg border border-black/10 bg-white text-[9px] font-black uppercase tracking-wider text-slate-600">View</button>
                        {r.status === 'pending' ? (
                          <>
                            <button onClick={() => setModal({ open: true, mode: 'edit', row: r })} className="h-7 px-3 rounded-lg border border-black/10 bg-white text-[9px] font-black uppercase tracking-wider text-[#1E3A5F]">Edit</button>
                            <button
                              onClick={() => cancelRequest(r)}
                              disabled={busyId === r.db_id}
                              className="h-7 px-3 rounded-lg border border-red-200 bg-red-50 text-[9px] font-black uppercase tracking-wider text-red-600"
                            >
                              {busyId === r.db_id ? '...' : 'Cancel'}
                            </button>
                          </>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
                {!filtered.length && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-[10px] font-black uppercase tracking-wider text-slate-400 text-center">
                      No requests found for selected filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <RequestModal
        open={modal.open}
        mode={modal.mode}
        equipment={equipment}
        initial={modal.row}
        onClose={() => setModal({ open: false, mode: 'create', row: null })}
        onSubmit={modal.mode === 'edit' ? submitEdit : submitCreate}
      />
      <DetailsModal row={details} onClose={() => setDetails(null)} />
      {toast ? (
        <div className="fixed right-4 top-4 z-[260]">
          <div
            className={`max-w-[360px] px-3 py-2 rounded-xl border shadow-lg flex items-start gap-2 ${
              toast.type === 'error'
                ? 'bg-red-50 border-red-200 text-red-700'
                : 'bg-emerald-50 border-emerald-200 text-emerald-700'
            }`}
          >
            {toast.type === 'error' ? <AlertTriangle size={14} className="mt-[1px]" /> : <CheckCircle2 size={14} className="mt-[1px]" />}
            <div className="space-y-1">
              <p className="text-[11px] font-black">{toast.message}</p>
              {toast.retryAction === 'load' ? (
                <button
                  type="button"
                  onClick={() => {
                    setToast(null);
                    load();
                  }}
                  className="h-6 px-2 rounded-md border border-current/30 bg-white/70 text-[9px] font-black uppercase tracking-wider"
                >
                  Retry
                </button>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

