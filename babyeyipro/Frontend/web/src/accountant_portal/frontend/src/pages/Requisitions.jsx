import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle2, ClipboardList, Download, FileText, Filter, RefreshCw, Search, Upload, X } from 'lucide-react';
import { jsPDF } from 'jspdf';
import api from '../services/api';
import PortalToast from '../components/PortalToast';

function formatMoneyRWF(value) {
  const n = Number(value) || 0;
  return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'RWF', maximumFractionDigits: 0 }).format(n);
}

const RequisitionDetailsDrawer = ({ isOpen, req, onClose, onApprove, onReject }) => {
  if (!isOpen || !req) return null;

  return createPortal(
    <>
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-md z-[210] animate-in fade-in duration-300"
        onClick={onClose}
      />

      <div className="fixed inset-y-0 right-0 z-[220] w-full md:w-[420px] bg-white shadow-[-20px_0_60px_-15px_rgba(0,0,0,0.1)] flex flex-col animate-in slide-in-from-right duration-500 ease-out">
        <div className="flex items-center justify-between px-8 py-6 border-b border-black/5 bg-white shrink-0">
          <div className="flex items-center gap-4 min-w-0">
            <div className="w-14 h-14 rounded-full border border-black/5 bg-white flex items-center justify-center font-black text-lg shadow-inner relative overflow-hidden shrink-0 text-[#000435]">
              <span>{req.dept?.charAt(0) || 'R'}</span>
            </div>
            <div className="min-w-0">
              <h3 className="font-black text-[#000435] text-base leading-tight uppercase tracking-tight truncate">{req.dept}</h3>
              <div className="flex flex-col gap-0.5 mt-0.5">
                <p className="text-[9px] text-[#000435] font-bold flex items-center gap-1 uppercase tracking-widest opacity-60 truncate">
                  <span className="w-1 h-1 rounded-full shrink-0 bg-amber-400" />
                  {req.id} · {req.status}
                </p>
                <p className="text-[8px] text-[#000435] font-black flex items-center gap-1 uppercase tracking-[0.2em] truncate">
                  {req.submitted} · {formatMoneyRWF(req.amount).replace('RWF', '')} RWF
                </p>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2.5 hover:bg-white rounded-xl transition-all text-[#000435] hover:text-[#000435] group"
          >
            <X size={18} className="group-hover:rotate-90 transition-transform duration-300" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-8 py-8 space-y-8 custom-scrollbar bg-white">
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[9px] font-black text-[#000435] uppercase tracking-[0.3em] opacity-40">Requisition Details</span>
              <div className="flex-1 h-px bg-black/5" />
            </div>
            {[
              { label: 'Requester', value: req.requester || '—', icon: ClipboardList },
              { label: 'Items', value: req.items || '—', icon: FileText },
              { label: 'Description', value: req.description || req.note || '—', icon: FileText },
              { label: 'Attachment', value: req.attachmentName || '—', icon: Upload },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between group">
                <div className="flex items-center gap-2">
                  <item.icon size={11} className="opacity-30 text-amber-500" />
                  <span className="text-[10px] font-black text-[#000435] uppercase tracking-widest">{item.label}</span>
                </div>
                <div className="flex-1 mx-3 border-b border-dashed border-black/10 group-hover:border-amber-200 transition-colors" />
                <span className="text-[10px] font-black uppercase tracking-tight text-[#000435] max-w-[180px] truncate text-right">
                  {item.value}
                </span>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white rounded-3xl p-5 border border-black/5 shadow-inner relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-16 h-16 bg-blue-500 opacity-5 rounded-full -mr-6 -mt-6 group-hover:scale-125 transition-transform duration-700" />
              <p className="text-[8px] text-[#000435] uppercase tracking-[0.2em] font-black mb-1 relative z-10 opacity-60">Status</p>
              <div className="flex items-baseline gap-1 relative z-10">
                <span className={`text-xl font-black tracking-tighter ${
                  req.status === 'approved' ? 'text-emerald-600' : req.status === 'rejected' ? 'text-red-600' : 'text-amber-600'
                }`}>
                  {req.status}
                </span>
              </div>
            </div>
            <div className="bg-white rounded-3xl p-5 border border-black/5 shadow-inner relative overflow-hidden group text-right">
              <div className="absolute top-0 left-0 w-16 h-16 bg-amber-500 opacity-5 rounded-full -ml-6 -mt-6 group-hover:scale-125 transition-transform duration-700" />
              <p className="text-[8px] text-[#000435] uppercase tracking-[0.2em] font-black mb-1 relative z-10 opacity-60">Amount</p>
              <div className="flex items-baseline gap-1 justify-end relative z-10">
                <span className="text-xl font-black text-[#000435] tracking-tighter">
                  {formatMoneyRWF(req.amount).replace('RWF', '')}
                </span>
                <span className="text-[9px] font-black uppercase tracking-widest ml-1 opacity-60">RWF</span>
              </div>
            </div>
          </div>
        </div>

        <div className="px-8 py-5 border-t border-black/5 bg-white/20">
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => onReject?.(req)}
              disabled={req.status === 'rejected'}
              className="h-10 w-full flex items-center justify-center gap-2 bg-white border border-black/5 text-red-600 font-black text-[9px] uppercase tracking-widest rounded-xl hover:bg-white transition-all disabled:opacity-40"
            >
              Reject
            </button>
            <button
              onClick={() => onApprove?.(req)}
              disabled={req.status === 'approved'}
              className="h-10 w-full flex items-center justify-center gap-2 text-white rounded-xl font-black text-[9px] uppercase tracking-widest shadow-lg hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-40 disabled:hover:scale-100"
              style={{ background: 'linear-gradient(135deg, #000435 0%, #0D2644 100%)' }}
            >
              Approve
            </button>
          </div>
        </div>
      </div>
    </>,
    document.body
  );
};

const AddRequisitionModal = ({ isOpen, onClose, onCreate }) => {
  const [dept, setDept] = useState('');
  const [requester, setRequester] = useState('');
  const [items, setItems] = useState('');
  const [amount, setAmount] = useState('');
  const [submitted, setSubmitted] = useState(() => new Date().toISOString().slice(0, 10));
  const [attachment, setAttachment] = useState(null);
  const [note, setNote] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[230]">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-md" onClick={() => onClose?.()} />
      <div className="absolute inset-x-0 top-10 md:top-16 mx-auto w-[92vw] max-w-2xl">
        <div className="relative w-full max-h-[92vh] bg-re-bg rounded-3xl shadow-[0_32px_128px_-15px_rgba(30,58,95,0.35)] border border-white/20 flex flex-col overflow-hidden animate-in zoom-in-95 fade-in duration-500">
          <div
            className="relative z-10 px-5 py-3 shrink-0"
            style={{ background: 'linear-gradient(135deg, #000435 0%, #0D2644 100%)' }}
          >
            <div className="flex items-center justify-between mb-2.5">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 text-re-gold shadow-md shadow-re-gold/10">
                  <ClipboardList size={16} />
                </div>
                <div>
                  <h1 className="text-[11px] font-black text-white uppercase tracking-widest leading-none">New Requisition</h1>
                  <p className="text-[7px] font-bold text-white/40 uppercase tracking-tight mt-1">Procurement · Request form</p>
                </div>
              </div>
              <button
                onClick={() => onClose?.()}
                className="p-1.5 bg-white/5 hover:bg-white/10 rounded-xl transition-all text-white/40 hover:text-re-gold group"
                aria-label="Close modal"
              >
                <X size={14} className="group-hover:rotate-90 transition-all duration-300" />
              </button>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
              <p className="text-[10px] font-black uppercase tracking-widest text-white/80">Attach quotation if available</p>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar bg-re-bg/50 p-5 md:p-6 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input
                value={dept}
                onChange={(e) => setDept(e.target.value)}
                placeholder="Department"
                className="w-full h-9 rounded-lg bg-re-bg px-3 outline-none border border-black/5 focus:border-[#000435]/20 focus:bg-white transition-all text-[#000435] text-[9px] sm:text-[10px] font-black uppercase tracking-widest shadow-[inset_0_2px_8px_rgba(15,23,42,0.06),inset_0_-1px_0_rgba(255,255,255,0.55)] placeholder:text-re-text-muted/40"
              />
              <input
                value={requester}
                onChange={(e) => setRequester(e.target.value)}
                placeholder="Requester"
                className="w-full h-9 rounded-lg bg-re-bg px-3 outline-none border border-black/5 focus:border-[#000435]/20 focus:bg-white transition-all text-[#000435] text-[9px] sm:text-[10px] font-black uppercase tracking-widest shadow-[inset_0_2px_8px_rgba(15,23,42,0.06),inset_0_-1px_0_rgba(255,255,255,0.55)] placeholder:text-re-text-muted/40"
              />
              <input
                type="date"
                value={submitted}
                onChange={(e) => setSubmitted(e.target.value)}
                className="w-full h-9 rounded-lg bg-re-bg px-3 outline-none border border-black/5 focus:border-[#000435]/20 focus:bg-white transition-all text-[#000435] text-[9px] sm:text-[10px] font-black uppercase tracking-widest shadow-[inset_0_2px_8px_rgba(15,23,42,0.06),inset_0_-1px_0_rgba(255,255,255,0.55)]"
              />
              <input
                value={amount}
                onChange={(e) => setAmount(e.target.value.replace(/[^\d]/g, ''))}
                inputMode="numeric"
                placeholder="Amount (RWF)"
                className="w-full h-9 rounded-lg bg-re-bg px-3 outline-none border border-black/5 focus:border-[#000435]/20 focus:bg-white transition-all text-[#000435] text-[9px] sm:text-[10px] font-black uppercase tracking-widest shadow-[inset_0_2px_8px_rgba(15,23,42,0.06),inset_0_-1px_0_rgba(255,255,255,0.55)] placeholder:text-re-text-muted/40"
              />
            </div>

            <textarea
              value={items}
              onChange={(e) => setItems(e.target.value)}
              placeholder="Items requested"
              className="w-full min-h-[90px] rounded-lg bg-re-bg px-3 py-2.5 outline-none border border-black/5 focus:border-[#000435]/20 focus:bg-white transition-all text-[#000435] text-[9px] sm:text-[10px] font-bold tracking-tight shadow-[inset_0_2px_8px_rgba(15,23,42,0.06),inset_0_-1px_0_rgba(255,255,255,0.55)] placeholder:text-re-text-muted/40 resize-none"
            />

            <label className="w-full h-9 rounded-lg bg-re-bg border border-black/5 px-3 flex items-center gap-2 cursor-pointer shadow-[inset_0_2px_8px_rgba(15,23,42,0.06),inset_0_-1px_0_rgba(255,255,255,0.55)] hover:bg-white hover:border-[#000435]/20 transition-all">
              <Upload size={14} className="text-amber-500 opacity-80" />
              <span className="text-[9px] font-black uppercase tracking-widest text-re-text-muted/60 truncate">
                {attachment ? attachment.name : 'Upload attachment'}
              </span>
              <input
                type="file"
                accept="image/*,application/pdf"
                className="hidden"
                onChange={(e) => setAttachment(e.target.files?.[0] || null)}
              />
            </label>

            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Note (optional)"
              className="w-full min-h-[80px] rounded-lg bg-re-bg px-3 py-2.5 outline-none border border-black/5 focus:border-[#000435]/20 focus:bg-white transition-all text-[#000435] text-[9px] sm:text-[10px] font-bold tracking-tight shadow-[inset_0_2px_8px_rgba(15,23,42,0.06),inset_0_-1px_0_rgba(255,255,255,0.55)] placeholder:text-re-text-muted/40 resize-none"
            />
            {!!errorMsg && (
              <p className="text-[10px] font-bold text-red-600">{errorMsg}</p>
            )}
          </div>

          <div className="bg-white border-t border-black/5 px-5 sm:px-6 py-2 flex items-center justify-between shrink-0 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
              <p className="text-[7px] font-black text-re-text-muted uppercase tracking-[0.2em] opacity-30 italic hidden sm:block">
                Ready to submit
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => onClose?.()} className="h-9 px-4 rounded-lg border border-black/5 text-re-navy font-black text-[9px] uppercase tracking-widest hover:bg-re-bg transition-all active:scale-95">
                Cancel
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={async () => {
                  const amt = Number(amount) || 0;
                  const cleanDept = dept.trim();
                  const cleanRequester = requester.trim();
                  const cleanItems = items.trim();
                  if (!cleanDept || !cleanRequester || !cleanItems) {
                    setErrorMsg('Department, requester and requested items are required.');
                    return;
                  }
                  if (amt <= 0) {
                    setErrorMsg('Amount must be greater than zero.');
                    return;
                  }
                  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(submitted || ''))) {
                    setErrorMsg('Submitted date must be valid.');
                    return;
                  }
                  setErrorMsg('');
                  setSubmitting(true);
                  try {
                    await onCreate?.({
                      dept: cleanDept,
                      requester: cleanRequester,
                      items: cleanItems,
                      amount: amt,
                      submitted,
                      attachmentName: attachment?.name || '',
                      note: note.trim(),
                    });
                    onClose?.();
                  } catch (e) {
                    setErrorMsg(e?.response?.data?.message || e.message || 'Failed to submit requisition.');
                  } finally {
                    setSubmitting(false);
                  }
                }}
                className="h-9 px-6 rounded-lg text-white font-black text-[9px] uppercase tracking-widest shadow-lg hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-60 disabled:hover:scale-100"
                style={{ background: 'linear-gradient(135deg, #000435 0%, #0D2644 100%)' }}
              >
                {submitting ? 'Submitting…' : 'Submit'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default function Requisitions() {
  const [searchTerm, setSearchTerm] = useState('');
  const [status, setStatus] = useState('All');
  const [teacherOnly, setTeacherOnly] = useState(false);
  const [details, setDetails] = useState(null);
  const [isAddOpen, setIsAddOpen] = useState(false);

  const [rows, setRows] = useState([]);
  const [toast, setToast] = useState(null);
  const [actionBusyKey, setActionBusyKey] = useState('');

  useEffect(() => {
    if (!toast) return undefined;
    const t = window.setTimeout(() => setToast(null), 3200);
    return () => window.clearTimeout(t);
  }, [toast]);

  const fetchRequisitions = async () => {
    try {
      const res = await api.get('/accountant/requisitions');
      if (res.data?.success) setRows(Array.isArray(res.data.data) ? res.data.data : []);
    } catch (e) {
      setToast({ type: 'error', message: e?.response?.data?.message || e.message || 'Failed to load requisitions.' });
    }
  };

  useEffect(() => {
    fetchRequisitions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const derived = useMemo(() => {
    const total = rows.reduce((s, r) => s + (Number(r.amount) || 0), 0);
    const pending = rows.filter((r) => r.status === 'pending').length;
    const approved = rows.filter((r) => r.status === 'approved').length;
    const rejected = rows.filter((r) => r.status === 'rejected').length;
    return { total, pending, approved, rejected };
  }, [rows]);

  const filtered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return rows.filter((r) => {
      const stOk = status === 'All' || r.status === status;
      const srcOk = !teacherOnly || String(r.source_portal || '').toLowerCase() === 'teacher';
      const qOk = !q || r.id.toLowerCase().includes(q) || r.dept.toLowerCase().includes(q) || r.requester.toLowerCase().includes(q);
      return stOk && srcOk && qOk;
    });
  }, [rows, searchTerm, status, teacherOnly]);

  const exportPdf = () => {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
    const W = doc.internal.pageSize.getWidth();
    const H = doc.internal.pageSize.getHeight();
    const NAVY = [30, 58, 95];
    const YELLOW = [254, 191, 16];
    const margin = 40;

    doc.setFillColor(...NAVY);
    doc.rect(0, 0, W, 64, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text('Requisitions Report', margin, 40);
    doc.setDrawColor(...YELLOW);
    doc.setLineWidth(3);
    doc.line(margin, 76, W - margin, 76);
    doc.setTextColor(30, 41, 59);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleString()}`, margin, 98);
    doc.text(`Status: ${status}`, margin, 114);

    const cols = [
      { k: 'id', label: 'ID', w: 78 },
      { k: 'dept', label: 'Dept', w: 90 },
      { k: 'requester', label: 'Requester', w: 150 },
      { k: 'amount', label: 'Amount', w: 90 },
      { k: 'status', label: 'Status', w: 60 },
    ];
    const headerY = 140;
    doc.setFillColor(241, 245, 249);
    doc.rect(margin, headerY - 14, W - margin * 2, 22, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    let x = margin;
    cols.forEach((c) => {
      doc.text(c.label, x, headerY);
      x += c.w;
    });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    let y = headerY + 22;
    filtered.forEach((r) => {
      if (y > H - 60) { doc.addPage(); y = 60; }
      let cx = margin;
      const cells = {
        id: r.id,
        dept: r.dept,
        requester: r.requester,
        amount: formatMoneyRWF(r.amount).replace('RWF', '').trim(),
        status: r.status,
      };
      cols.forEach((c) => {
        const t = String(cells[c.k] ?? '');
        doc.text(t.length > 26 ? `${t.slice(0, 25)}…` : t, cx, y);
        cx += c.w;
      });
      y += 18;
    });
    doc.save(`requisitions-report-${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  const updateStatus = async (r, nextStatus) => {
    if (!r || r.status === nextStatus) return;
    const dbId = Number(r?.db_id);
    if (!dbId) {
      setToast({ type: 'error', message: 'Requisition ID is invalid.' });
      return;
    }
    const key = `${r.id}:status:${nextStatus}`;
    setActionBusyKey(key);
    try {
      await api.patch(`/accountant/requisitions/${dbId}/status`, { status: nextStatus });
      await fetchRequisitions();
      setDetails((prev) => (prev && prev.id === r.id ? { ...prev, status: nextStatus } : prev));
      setToast({ type: 'success', message: `Requisition ${r.id} marked ${nextStatus}.` });
    } catch (e) {
      setToast({ type: 'error', message: e?.response?.data?.message || e.message || 'Status update failed.' });
    } finally {
      setActionBusyKey('');
    }
  };

  const editRequisition = async (r) => {
    const nextDept = window.prompt('Department:', r.dept || '');
    if (nextDept == null) return;
    const nextItems = window.prompt('Items requested:', r.items || '');
    if (nextItems == null) return;
    const nextAmountRaw = window.prompt('Amount (RWF):', String(r.amount || 0));
    if (nextAmountRaw == null) return;
    const nextAmount = Number(String(nextAmountRaw).replace(/[^\d.]/g, ''));
    if (!String(nextDept).trim() || !String(nextItems).trim()) {
      setToast({ type: 'error', message: 'Department and items are required.' });
      return;
    }
    if (!Number.isFinite(nextAmount) || nextAmount <= 0) {
      setToast({ type: 'error', message: 'Amount must be greater than zero.' });
      return;
    }
    const dbId = Number(r?.db_id);
    if (!dbId) {
      setToast({ type: 'error', message: 'Requisition ID is invalid.' });
      return;
    }
    const key = `${r.id}:edit`;
    setActionBusyKey(key);
    try {
      await api.patch(`/accountant/requisitions/${dbId}`, {
        dept: String(nextDept).trim(),
        items: String(nextItems).trim(),
        amount: nextAmount,
      });
      await fetchRequisitions();
      setToast({ type: 'success', message: `Requisition ${r.id} updated.` });
    } catch (e) {
      setToast({ type: 'error', message: e?.response?.data?.message || e.message || 'Update failed.' });
    } finally {
      setActionBusyKey('');
    }
  };

  const deleteRequisition = async (r) => {
    const yes = window.confirm(`Delete requisition ${r.id}?`);
    if (!yes) return;
    const dbId = Number(r?.db_id);
    if (!dbId) {
      setToast({ type: 'error', message: 'Requisition ID is invalid.' });
      return;
    }
    const key = `${r.id}:delete`;
    setActionBusyKey(key);
    try {
      await api.delete(`/accountant/requisitions/${dbId}`);
      await fetchRequisitions();
      setToast({ type: 'success', message: `Requisition ${r.id} deleted.` });
      setDetails((prev) => (prev?.id === r.id ? null : prev));
    } catch (e) {
      setToast({ type: 'error', message: e?.response?.data?.message || e.message || 'Delete failed.' });
    } finally {
      setActionBusyKey('');
    }
  };

  return (
    <div className="animate-in fade-in duration-700 bg-re-bg min-h-screen" style={{ fontFamily: "'Montserrat', sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />

      <div className="relative w-full min-h-[280px] overflow-hidden">
        <div className="absolute inset-0 bg-[#0a192f]/85 z-10 backdrop-blur-[2px]"></div>
        <img src="/teacher.jpg" alt="Hero Background" className="absolute inset-0 w-full h-full object-cover scale-105" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-[#000435]/40 via-transparent to-transparent z-10 max-w-[1600px] mx-auto"></div>

        <div className="relative z-20 max-w-[1600px] mx-auto px-6 md:px-12 pt-16 pb-24 flex items-center gap-8">
          <div className="hidden md:flex shrink-0 w-24 h-24 rounded-[32px] border border-white/10 bg-white/5 items-center justify-center backdrop-blur-xl shadow-2xl relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-[#FEBF10]/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
            <ClipboardList size={40} style={{ color: '#FEBF10' }} className="group-hover:scale-110 transition-transform duration-500" />
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-6 h-1 rounded-full animate-pulse" style={{ background: '#FEBF10' }}></span>
              <p className="text-[10px] font-black uppercase tracking-[0.3em]" style={{ color: '#FEBF10' }}>Procurement Flow</p>
            </div>
            <h1 className="text-2xl sm:text-4xl md:text-5xl font-black text-white tracking-tighter leading-none mb-2 mt-2 uppercase">
              Staff <span style={{ color: '#FEBF10' }}>Requisitions</span>
            </h1>
            <p className="text-[8px] sm:text-[10px] md:text-xs font-bold text-white/40 max-w-lg leading-relaxed uppercase tracking-widest italic opacity-60">
              Request review & approval queue
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-6 md:px-12 -mt-24 relative z-20 pb-20">
        <div className="bg-white rounded-t-[32px] shadow-2xl border border-black/5 overflow-hidden flex flex-col min-h-[520px]">
          <div className="grid grid-cols-1 lg:grid-cols-4 border-b border-black/5">
            <div className="lg:col-span-3 grid grid-cols-2 md:grid-cols-4 divide-x divide-y md:divide-y-0 divide-black/5">
              {[
                { label: 'Total value', value: formatMoneyRWF(derived.total).replace('RWF', ''), tone: 'text-[#000435]' },
                { label: 'Pending', value: String(derived.pending), tone: 'text-amber-600' },
                { label: 'Approved', value: String(derived.approved), tone: 'text-emerald-600' },
                { label: 'Rejected', value: String(derived.rejected), tone: 'text-red-500' },
              ].map((s, i) => (
                <div key={i} className="p-4 sm:p-8 flex flex-col items-center justify-center text-center group hover:bg-re-bg/20 transition-all cursor-default">
                  <span className={`text-sm sm:text-2xl font-black tracking-tighter ${s.tone}`}>{s.value}</span>
                  <p className="text-[6px] sm:text-[8px] font-black text-re-text-muted uppercase tracking-[0.2em] mt-0.5 sm:mt-1 opacity-60">{s.label}</p>
                </div>
              ))}
            </div>
            <div className="hidden lg:flex flex-col border-l border-black/5 bg-re-bg/30 p-6 justify-center gap-3 relative">
              <button
                onClick={() => setIsAddOpen(true)}
                className="w-full h-11 flex items-center justify-center gap-2 text-white rounded-xl font-black text-[9px] uppercase tracking-widest shadow-xl hover:scale-[1.02] active:scale-95 transition-all"
                style={{ background: 'linear-gradient(135deg, #000435 0%, #0D2644 100%)' }}
              >
                <span>New requisition</span>
              </button>
              <button
                type="button"
                onClick={exportPdf}
                className="w-full h-11 flex items-center justify-center gap-2 bg-white border border-black/5 text-re-text font-black text-[9px] uppercase tracking-widest rounded-xl hover:bg-re-bg hover:border-[#000435]/20 hover:shadow-re-soft transition-all group"
              >
                <Download size={14} className="opacity-60 group-hover:opacity-100 transition-opacity" style={{ color: '#000435' }} />
                <span className="group-hover:text-[#000435]">Export PDF</span>
              </button>
            </div>
          </div>

          <div className="hidden lg:flex px-4 py-4 lg:px-3 lg:py-2 border-b border-black/5 flex-nowrap items-center justify-start gap-2 bg-re-bg/20 transition-all">
            <div className="flex flex-nowrap items-center gap-2">
              <div className="relative w-[10.5rem] shrink-0 group">
                <Filter size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#FEBF10] z-[1] pointer-events-none" />
                <span className="absolute left-7 top-1/2 -translate-y-1/2 text-[8px] font-black uppercase text-re-text-muted tracking-[0.2em] pointer-events-none z-[1]">Status</span>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full h-8 bg-white/80 rounded-lg outline-none border border-black/5 focus:border-[#000435]/20 focus:bg-white transition-all text-[#000435] text-[9px] font-black uppercase tracking-widest shadow-[inset_0_2px_8px_rgba(15,23,42,0.06),inset_0_-1px_0_rgba(255,255,255,0.5)] cursor-pointer appearance-none !pl-[4.6rem] pr-8"
                >
                  {['All', 'pending', 'approved', 'rejected'].map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              <div className="relative w-[14rem] group">
                <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-re-text-muted/50 group-focus-within:text-[#000435] transition-colors z-[1] pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search ID, dept, requester..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full h-8 bg-white/80 rounded-lg outline-none border border-black/5 focus:border-[#000435]/20 focus:bg-white transition-all text-[#000435] text-[9px] font-black uppercase tracking-tight shadow-[inset_0_2px_8px_rgba(15,23,42,0.06),inset_0_-1px_0_rgba(255,255,255,0.5)] placeholder:text-[#000435]/30 !pl-8"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={() => fetchRequisitions()}
              className="h-8 w-8 flex items-center justify-center bg-white border border-black/5 rounded-lg hover:bg-re-bg transition-all shadow-sm disabled:opacity-40 shrink-0 ml-auto"
            >
              <RefreshCw size={12} className="text-[#000435]" />
            </button>
              <button
                type="button"
                onClick={() => setTeacherOnly((v) => !v)}
                className={`h-8 px-3 rounded-lg border text-[9px] font-black uppercase tracking-widest shadow-sm transition-all ${
                  teacherOnly ? 'bg-[#000435] text-white border-[#000435]' : 'bg-white text-[#000435] border-black/10'
                }`}
              >
                Teacher only
              </button>
          </div>

          <div className="overflow-x-auto bg-white flex-1">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-re-bg/20 border-b border-black/5">
                  <th className="px-4 sm:px-6 py-2.5 sm:py-3 text-[8px] font-black text-re-text-muted uppercase tracking-[0.2em] opacity-40 border-r border-black/5">Request</th>
                  <th className="hidden md:table-cell px-6 py-3 text-[8px] font-black text-re-text-muted uppercase tracking-[0.2em] opacity-40 border-r border-black/5">Department</th>
                  <th className="hidden lg:table-cell px-6 py-3 text-[8px] font-black text-re-text-muted uppercase tracking-[0.2em] opacity-40 border-r border-black/5">Description</th>
                  <th className="hidden md:table-cell px-6 py-3 text-[8px] font-black text-re-text-muted uppercase tracking-[0.2em] opacity-40 border-r border-black/5">Submitted</th>
                  <th className="px-4 sm:px-6 py-2.5 sm:py-3 text-right text-[8px] font-black text-re-text-muted uppercase tracking-[0.2em] opacity-40 border-r border-black/5">Amount</th>
                  <th className="px-4 sm:px-6 py-2.5 sm:py-3 text-right text-[8px] font-black text-re-text-muted uppercase tracking-[0.2em] opacity-40 border-r border-black/5">Status</th>
                  <th className="px-4 sm:px-6 py-2.5 sm:py-3 text-right text-[8px] font-black text-re-text-muted uppercase tracking-[0.2em] opacity-40">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5">
                {filtered.map((r) => {
                  const isBusy = actionBusyKey.startsWith(`${r.id}:`);
                  return (
                  <tr key={r.id} onClick={() => setDetails(r)} className="hover:bg-re-bg/60 even:bg-re-bg/20 transition-colors cursor-pointer">
                    <td className="px-4 sm:px-6 py-2.5 sm:py-3 border-r border-black/5">
                      <p className="text-[13px] font-black text-[#000435] tracking-tight truncate">{r.requester}</p>
                      <p className="text-[10px] font-bold text-[#000435] mt-0.5 truncate">
                        {r.description || r.note || 'No description'}
                      </p>
                      <p className="text-[8px] font-bold text-re-text-muted uppercase tracking-widest leading-none mt-1 opacity-50">{r.id}</p>
                    </td>
                    <td className="hidden md:table-cell px-6 py-3 border-r border-black/5 text-[11px] font-black text-[#000435]">{r.dept}</td>
                    <td className="hidden lg:table-cell px-6 py-3 border-r border-black/5 text-[10px] font-bold text-[#000435] max-w-[260px] truncate">
                      {r.description || r.note || '—'}
                    </td>
                    <td className="hidden md:table-cell px-6 py-3 border-r border-black/5 text-[10px] font-black text-[#000435]">{r.submitted}</td>
                    <td className="px-4 sm:px-6 py-2.5 sm:py-3 border-r border-black/5 text-right text-[12px] font-black text-[#000435]">
                      {formatMoneyRWF(r.amount).replace('RWF', '')}
                    </td>
                    <td className="px-4 sm:px-6 py-2.5 sm:py-3 border-r border-black/5 text-right">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest border ${
                        r.status === 'approved'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                          : r.status === 'rejected'
                            ? 'bg-red-50 text-red-700 border-red-100'
                            : 'bg-amber-50 text-amber-800 border-amber-100'
                      }`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="px-4 sm:px-6 py-2.5 sm:py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            updateStatus(r, 'rejected');
                          }}
                          className="h-7 px-3 rounded-xl bg-white border border-black/5 text-red-600 font-black text-[9px] uppercase tracking-widest shadow-sm hover:bg-re-bg transition-all disabled:opacity-40"
                          disabled={r.status === 'rejected' || isBusy}
                          title="Reject requisition"
                        >
                          {isBusy && actionBusyKey.endsWith(':rejected') ? 'Saving…' : 'Reject'}
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            updateStatus(r, 'approved');
                          }}
                          className="h-7 px-3 rounded-xl text-white font-black text-[9px] uppercase tracking-widest shadow-sm hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-40 disabled:hover:scale-100"
                          style={{ background: 'linear-gradient(135deg, #000435 0%, #0D2644 100%)' }}
                          disabled={r.status === 'approved' || isBusy}
                          title="Approve requisition"
                        >
                          {isBusy && actionBusyKey.endsWith(':approved') ? 'Saving…' : 'Approve'}
                        </button>
                        <button
                          type="button"
                          onClick={async (e) => {
                            e.stopPropagation();
                            await editRequisition(r);
                          }}
                          className="h-7 px-3 rounded-xl bg-white border border-black/5 text-[#000435] font-black text-[9px] uppercase tracking-widest shadow-sm hover:bg-re-bg transition-all"
                          disabled={isBusy}
                          title="Edit requisition"
                        >
                          {isBusy && actionBusyKey.endsWith(':edit') ? 'Saving…' : 'Edit'}
                        </button>
                        <button
                          type="button"
                          onClick={async (e) => {
                            e.stopPropagation();
                            await deleteRequisition(r);
                          }}
                          className="h-7 px-3 rounded-xl bg-white border border-red-200 text-red-600 font-black text-[9px] uppercase tracking-widest shadow-sm hover:bg-red-50 transition-all"
                          disabled={isBusy}
                          title="Delete requisition"
                        >
                          {isBusy && actionBusyKey.endsWith(':delete') ? 'Deleting…' : 'Delete'}
                        </button>
                      </div>
                    </td>
                  </tr>
                )})}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-6 py-10 text-center">
                      <p className="text-[9px] font-black text-re-text-muted uppercase tracking-widest opacity-40">No requisitions found.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="flex px-4 sm:px-8 py-5 bg-re-bg/20 border-t border-black/5 items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
              <p className="text-[8px] font-black text-re-text-muted uppercase tracking-widest italic opacity-60">
                {filtered.length} requests
              </p>
            </div>
            <p className="text-[8px] font-black text-re-text-muted uppercase tracking-[0.2em] opacity-40 italic">
              RWF
            </p>
          </div>
        </div>
      </div>

      <RequisitionDetailsDrawer
        isOpen={!!details}
        req={details}
        onClose={() => setDetails(null)}
        onApprove={(req) => updateStatus(req, 'approved')}
        onReject={(req) => updateStatus(req, 'rejected')}
      />

      <AddRequisitionModal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        onCreate={async (payload) => {
          await api.post('/accountant/requisitions', payload);
          await fetchRequisitions();
          setToast({ type: 'success', message: 'Requisition submitted successfully.' });
        }}
      />
      <PortalToast toast={toast} />
    </div>
  );
}

