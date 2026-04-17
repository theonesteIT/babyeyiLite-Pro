import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  CheckCircle2, ClipboardList, Download, Loader2, RefreshCw,
  Search, X, XCircle, Package, Tag, Hourglass,
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import api from '../services/api';
import PortalListPageLayout from '../components/PortalListPageLayout';
import { PORTAL } from '../config/portal';

function fmtMoney(v) {
  return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'RWF', maximumFractionDigits: 0 }).format(Number(v) || 0);
}
function fmtDate(raw) {
  if (!raw) return '—';
  return new Date(raw).toLocaleDateString('en-RW', { day: '2-digit', month: 'short', year: 'numeric' });
}

const STATUS_COLORS = {
  pending:  'bg-amber-100 text-amber-700 border-amber-200',
  approved: 'bg-re-navy/10 text-re-navy border-re-navy/25',
  rejected: 'bg-red-100 text-red-700 border-red-200',
  issued:   'bg-blue-100 text-blue-700 border-blue-200',
};

// ── Details drawer ────────────────────────────────────────────
const RequisitionDrawer = ({ req, onClose, onIssue, onReject }) => {
  if (!req) return null;
  return createPortal(
    <>
      <div className="fixed inset-0 bg-black/40 backdrop-blur-md z-[210]" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 z-[220] w-full md:w-[440px] bg-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
        <div className="flex items-center justify-between px-7 py-5 border-b border-black/5 shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-black/5 flex items-center justify-center font-black text-lg text-re-navy">
              {req.dept?.charAt(0) || 'R'}
            </div>
            <div>
              <h3 className="font-black text-re-navy text-sm uppercase tracking-tight">{req.dept}</h3>
              <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">{req.id} · {req.status}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-50 rounded-xl text-slate-400"><X size={18} /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-7 py-6 space-y-6">
          {[
            { label: 'Requester', value: req.requester },
            { label: 'Items requested', value: req.items },
            { label: 'Amount', value: fmtMoney(req.amount) },
            { label: 'Submitted', value: fmtDate(req.submitted) },
            { label: 'Reference', value: req.attachmentName || '—' },
            { label: 'Note', value: req.note || '—' },
          ].map(f => (
            <div key={f.label} className="flex items-start justify-between gap-4 group">
              <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 mt-0.5 shrink-0">{f.label}</span>
              <div className="flex-1 border-b border-dashed border-black/10" />
              <span className="text-[11px] font-black text-re-navy text-right max-w-[200px]">{f.value}</span>
            </div>
          ))}

          <div className={`inline-flex items-center px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider border ${STATUS_COLORS[req.status] || 'bg-slate-100 text-slate-500 border-slate-200'}`}>
            {req.status}
          </div>
        </div>

        {req.status === 'pending' && (
          <div className="px-7 py-5 border-t border-black/5 flex gap-3 shrink-0">
            <button
              onClick={() => { onReject(req); onClose(); }}
              className="flex-1 py-2.5 rounded-xl border border-red-200 text-red-500 font-black text-[10px] uppercase tracking-widest hover:bg-red-50 transition-all flex items-center justify-center gap-2"
            >
              <XCircle size={13} /> Reject
            </button>
            <button
              onClick={() => { onIssue(req); onClose(); }}
              className="flex-1 py-2.5 rounded-xl text-white font-black text-[10px] uppercase tracking-widest transition-all hover:scale-[1.02] flex items-center justify-center gap-2"
              style={{ background: 'linear-gradient(135deg,#1E3A5F,#0D2644)' }}
            >
              <CheckCircle2 size={13} /> Issue items
            </button>
          </div>
        )}
        {req.status === 'approved' && (
          <div className="px-7 py-5 border-t border-black/5 shrink-0">
            <button
              onClick={() => { onIssue(req); onClose(); }}
              className="w-full py-2.5 rounded-xl text-white font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2"
              style={{ background: 'linear-gradient(135deg,#1E3A5F,#0D2644)' }}
            >
              <Package size={13} /> Mark as issued
            </button>
          </div>
        )}
      </div>
    </>,
    document.body
  );
};

// ── Main ──────────────────────────────────────────────────────
export default function Requisitions() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('All');
  const [selected, setSelected] = useState(null);

  const fetch = async () => {
    setLoading(true);
    try {
      const res = await api.get('/store/requisitions');
      if (res.data?.success) setRows(Array.isArray(res.data.data) ? res.data.data : []);
      else {
        // Fallback: try accountant endpoint (same data)
        const r2 = await api.get('/accountant/requisitions');
        if (r2.data?.success) setRows(Array.isArray(r2.data.data) ? r2.data.data : []);
      }
    } catch (e) { console.warn('[Requisitions] fetch failed:', e.message); } finally { setLoading(false); }
  };

  useEffect(() => { fetch(); }, []);

  const patchStatus = async (row, newStatus) => {
    const id = row?.db_id ?? row?.id;
    if (id == null) return;
    try {
      await api.patch(`/store/requisitions/${id}/status`, { status: newStatus });
    } catch (e) {
      try { await api.patch(`/accountant/requisitions/${id}/status`, { status: newStatus }); } catch { /* ignore */ }
    }
    fetch();
  };

  const totals = useMemo(() => ({
    pending:  rows.filter(r => r.status === 'pending').length,
    approved: rows.filter(r => r.status === 'approved').length,
    issued:   rows.filter(r => r.status === 'issued').length,
    total:    rows.reduce((s, r) => s + (Number(r.amount) || 0), 0),
  }), [rows]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter(r => {
      const stOk = status === 'All' || r.status === status;
      const qOk = !q || r.id?.toLowerCase().includes(q) || r.dept?.toLowerCase().includes(q) || r.requester?.toLowerCase().includes(q) || r.items?.toLowerCase().includes(q);
      return stOk && qOk;
    });
  }, [rows, search, status]);

  const exportPDF = () => {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
    const W = doc.internal.pageSize.getWidth();
    doc.setFillColor(30, 58, 95);
    doc.rect(0, 0, W, 56, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('Requisitions — Babyeyi School Store', 40, 36);
    doc.setTextColor(30, 41, 59);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(`Generated: ${new Date().toLocaleString()} · Status: ${status}`, 40, 72);
    const cols = [
      { k: 'id', label: 'ID', w: 70 },
      { k: 'dept', label: 'Dept', w: 90 },
      { k: 'requester', label: 'Requester', w: 130 },
      { k: 'items', label: 'Items', w: 130 },
      { k: 'amount', label: 'Amount', w: 80 },
      { k: 'status', label: 'Status', w: 60 },
    ];
    let y = 96, x = 40;
    doc.setFillColor(241, 245, 249);
    doc.rect(40, y - 12, W - 80, 20, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    cols.forEach(c => { doc.text(c.label, x, y); x += c.w; });
    y += 18;
    doc.setFont('helvetica', 'normal');
    filtered.forEach(r => {
      if (y > 760) { doc.addPage(); y = 40; }
      x = 40;
      cols.forEach(c => {
        let val = r[c.k] ?? '';
        if (c.k === 'amount') val = fmtMoney(val);
        doc.text(String(val).substring(0, 22), x, y);
        x += c.w;
      });
      y += 16;
    });
    doc.save('requisitions.pdf');
  };

  const selectCls =
    'h-9 md:h-8 bg-white/80 rounded-lg outline-none border border-black/5 focus:border-[#1E3A5F]/20 focus:bg-white transition-all text-[#1E3A5F] text-[9px] font-black uppercase tracking-widest shadow-[inset_0_2px_8px_rgba(15,23,42,0.06)] cursor-pointer appearance-none px-3 pr-8';
  const selectChevron = {
    backgroundImage: `url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%231E3A5F%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E')`,
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'right 0.5rem center',
    backgroundSize: '10px',
  };

  return (
    <>
      <PortalListPageLayout
        eyebrow={PORTAL.brandLine}
        title="Store Requisitions"
        titleHighlight="Requisitions"
        subtitle="Department requests — review, approve, issue, or reject"
        heroIcon={ClipboardList}
        stats={[
          { label: 'Pending', value: totals.pending, icon: Hourglass },
          { label: 'Approved', value: totals.approved, icon: CheckCircle2 },
          { label: 'Issued', value: totals.issued, icon: Package },
          { label: 'Total value', value: fmtMoney(totals.total), icon: Tag },
        ]}
        rightColumn={(
          <>
            <button
              type="button"
              onClick={fetch}
              disabled={loading}
              className="w-full h-11 flex items-center justify-center gap-2 bg-white border border-black/5 text-re-text font-black text-[9px] uppercase tracking-widest rounded-xl hover:bg-re-bg transition-all"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin text-[#1E3A5F]' : 'text-[#1E3A5F]'} />
              Refresh
            </button>
            <button
              type="button"
              onClick={exportPDF}
              className="w-full h-11 flex items-center justify-center gap-2 text-white rounded-xl font-black text-[9px] uppercase tracking-widest shadow-xl hover:scale-[1.02] active:scale-95 transition-all"
              style={{ background: 'linear-gradient(135deg, #1E3A5F 0%, #0D2644 100%)' }}
            >
              <Download size={14} />
              Export PDF
            </button>
          </>
        )}
        toolbar={(
          <>
            <div className="relative w-full sm:w-[12rem] shrink-0">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[8px] font-black uppercase text-slate-400 tracking-[0.2em] z-[1] pointer-events-none">Status</span>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className={`w-full ${selectCls} !pl-14`}
                style={selectChevron}
              >
                {['All', 'pending', 'approved', 'issued', 'rejected'].map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div className="relative flex-1 min-w-[200px] group">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-re-text-muted/50 group-focus-within:text-[#1E3A5F] transition-colors z-[1] pointer-events-none" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search id, dept, requester, items…"
                className="w-full h-9 md:h-8 bg-white/80 rounded-lg outline-none border border-black/5 focus:border-[#1E3A5F]/20 focus:bg-white transition-all text-[#1E3A5F] text-[9px] font-black uppercase tracking-tight shadow-[inset_0_2px_8px_rgba(15,23,42,0.06)] placeholder:text-[#1E3A5F]/30 !pl-8"
              />
            </div>
          </>
        )}
      >
        {loading ? (
          <div className="flex items-center justify-center py-20 gap-3">
            <Loader2 size={22} className="animate-spin text-[#1E3A5F]/30" />
            <p className="text-[11px] font-black uppercase tracking-widest text-slate-400">Loading requisitions…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-2">
            <ClipboardList size={36} className="text-slate-200" />
            <p className="text-[11px] font-black uppercase tracking-widest text-slate-400">No requisitions match your filters</p>
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-re-bg/20 border-b border-black/5">
                {['Reference', 'Department', 'Requester', 'Items', 'Amount', 'Status'].map((h, hi) => (
                  <th
                    key={`req-th-${hi}`}
                    className="px-4 sm:px-6 py-3 text-[7px] sm:text-[8px] font-black text-re-text-muted uppercase tracking-[0.2em] opacity-50 border-r border-black/5 last:border-r-0"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {filtered.map((req) => (
                <tr
                  key={req.id}
                  onClick={() => setSelected(req)}
                  className="hover:bg-re-bg/60 even:bg-re-bg/20 transition-colors cursor-pointer group"
                >
                  <td className="px-4 sm:px-6 py-3 border-r border-black/5">
                    <p className="font-black text-[#1E3A5F] text-[11px]">{req.id}</p>
                    <p className="text-[8px] font-bold text-re-text-muted uppercase tracking-widest mt-0.5 opacity-60">{fmtDate(req.submitted)}</p>
                  </td>
                  <td className="px-4 sm:px-6 py-3 border-r border-black/5 text-[10px] font-black text-[#1E3A5F]">
                    <span className="inline-flex items-center gap-2">
                      <span className="w-8 h-8 rounded-lg bg-re-bg border border-black/5 flex items-center justify-center font-black text-[11px] shrink-0 group-hover:bg-[#1E3A5F] group-hover:text-white transition-colors">
                        {req.dept?.charAt(0) || 'R'}
                      </span>
                      <span className="truncate max-w-[140px]">{req.dept}</span>
                    </span>
                  </td>
                  <td className="px-4 sm:px-6 py-3 border-r border-black/5 text-[10px] font-bold text-slate-600 max-w-[120px] truncate">{req.requester}</td>
                  <td className="px-4 sm:px-6 py-3 border-r border-black/5 text-[10px] font-bold text-slate-500 max-w-[220px] truncate">{req.items}</td>
                  <td className="px-4 sm:px-6 py-3 border-r border-black/5 font-black text-[#1E3A5F] text-[11px]">{fmtMoney(req.amount)}</td>
                  <td className="px-4 sm:px-6 py-3">
                    <span className={`text-[8px] font-black px-2 py-0.5 rounded-full border ${STATUS_COLORS[req.status] || 'bg-slate-100 text-slate-500 border-slate-200'}`}>{req.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </PortalListPageLayout>

      <RequisitionDrawer
        req={selected}
        onClose={() => setSelected(null)}
        onIssue={row => patchStatus(row, 'issued')}
        onReject={row => patchStatus(row, 'rejected')}
      />
    </>
  );
}
