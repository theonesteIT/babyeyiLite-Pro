import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle2, Download, Filter, RefreshCw, Search, Users, X } from 'lucide-react';
import { jsPDF } from 'jspdf';
import api from '../services/api';

function formatMoneyRWF(value) {
  const n = Number(value) || 0;
  return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'RWF', maximumFractionDigits: 0 }).format(n);
}

const PayrollRunDrawer = ({ isOpen, run, onClose }) => {
  if (!isOpen || !run) return null;

  return createPortal(
    <>
      <div className="fixed inset-0 bg-black/40 backdrop-blur-md z-[210] animate-in fade-in duration-300" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 z-[220] w-full md:w-[420px] bg-white shadow-[-20px_0_60px_-15px_rgba(0,0,0,0.1)] flex flex-col animate-in slide-in-from-right duration-500 ease-out">
        <div className="flex items-center justify-between px-8 py-6 border-b border-black/5 bg-white shrink-0">
          <div className="flex items-center gap-4 min-w-0">
            <div className="w-14 h-14 rounded-full border border-black/5 bg-slate-50 flex items-center justify-center font-black text-lg shadow-inner shrink-0 text-[#1E3A5F]">
              <span>{run.period?.charAt(0) || 'P'}</span>
            </div>
            <div className="min-w-0">
              <h3 className="font-black text-[#1E3A5F] text-base leading-tight uppercase tracking-tight truncate">{run.period}</h3>
              <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest opacity-60 truncate">
                {run.id} · {run.status}
              </p>
              <p className="text-[8px] text-[#1E3A5F] font-black uppercase tracking-[0.2em] truncate">
                Staff {run.staffCount} · Gross {formatMoneyRWF(run.grossTotal).replace('RWF', '')} RWF
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2.5 hover:bg-slate-50 rounded-xl transition-all text-slate-400 hover:text-[#1E3A5F] group">
            <X size={18} className="group-hover:rotate-90 transition-transform duration-300" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-8 py-8 space-y-8 custom-scrollbar bg-white">
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em] opacity-40">Run Summary</span>
              <div className="flex-1 h-px bg-black/5" />
            </div>
            {[
              { k: 'Period', v: run.period },
              { k: 'Status', v: run.status },
              { k: 'Staff count', v: String(run.staffCount) },
              { k: 'Gross total', v: formatMoneyRWF(run.grossTotal) },
            ].map((x) => (
              <div key={x.k} className="flex items-center justify-between group">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{x.k}</span>
                <div className="flex-1 mx-3 border-b border-dashed border-black/10 group-hover:border-amber-200 transition-colors" />
                <span className="text-[10px] font-black uppercase tracking-tight text-[#1E3A5F]">{x.v}</span>
              </div>
            ))}
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em] opacity-40">Staff payouts</span>
              <div className="flex-1 h-px bg-black/5" />
            </div>
            {(run.lines || []).map((l) => (
              <div key={l.id} className="flex items-start gap-3 p-4 rounded-2xl bg-slate-50/50 border border-black/[0.02] hover:bg-white hover:border-black/5 transition-all">
                <div className="p-2 rounded-xl shrink-0 bg-emerald-50 text-emerald-500">
                  <Users size={14} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] font-black text-[#1E3A5F] truncate">{l.staff}</p>
                    <p className="text-[11px] font-black text-[#1E3A5F]">{formatMoneyRWF(l.gross).replace('RWF', '')} RWF</p>
                  </div>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest opacity-40 mt-1">
                    {l.dept} · {l.role}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>,
    document.body
  );
};

export default function PayrollHistory() {
  const [searchTerm, setSearchTerm] = useState('');
  const [status, setStatus] = useState('All');
  const [details, setDetails] = useState(null);

  const [runs, setRuns] = useState([]);

  const fetchRuns = async () => {
    try {
      const res = await api.get('/accountant/payroll/runs');
      if (res.data?.success) setRuns(Array.isArray(res.data.data) ? res.data.data : []);
    } catch (e) {
      console.warn('[PayrollHistory] Failed to load runs:', e.message);
    }
  };

  useEffect(() => {
    fetchRuns();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openRunDetails = async (run) => {
    try {
      const key = run?.db_id != null ? String(run.db_id) : run?.id;
      const res = await api.get(`/accountant/payroll/runs/${encodeURIComponent(key)}`);
      if (res.data?.success && res.data.data) {
        setDetails(res.data.data);
        return;
      }
    } catch (e) {
      console.warn('[PayrollHistory] Failed to load run details:', e.message);
    }
    setDetails(run);
  };

  const derived = useMemo(() => {
    const processed = runs.filter((r) => r.status === 'processed').length;
    const pending = runs.filter((r) => r.status === 'pending').length;
    const totalGross = runs.reduce((s, r) => s + (Number(r.grossTotal) || 0), 0);
    return { processed, pending, totalGross };
  }, [runs]);

  const filtered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return runs.filter((r) => {
      const stOk = status === 'All' || r.status === status;
      const qOk = !q || r.id.toLowerCase().includes(q) || r.period.toLowerCase().includes(q);
      return stOk && qOk;
    });
  }, [runs, searchTerm, status]);

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
    doc.text('Payroll Runs Report', margin, 40);
    doc.setDrawColor(...YELLOW);
    doc.setLineWidth(3);
    doc.line(margin, 76, W - margin, 76);
    doc.setTextColor(30, 41, 59);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleString()}`, margin, 98);
    doc.text(`Status: ${status}`, margin, 114);

    const cols = [
      { k: 'period', label: 'Period', w: 140 },
      { k: 'id', label: 'Run ID', w: 140 },
      { k: 'staffCount', label: 'Staff', w: 60 },
      { k: 'grossTotal', label: 'Gross', w: 110 },
      { k: 'status', label: 'Status', w: 70 },
    ];
    const headerY = 140;
    doc.setFillColor(241, 245, 249);
    doc.rect(margin, headerY - 14, W - margin * 2, 22, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    let x = margin;
    cols.forEach((c) => { doc.text(c.label, x, headerY); x += c.w; });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    let y = headerY + 22;
    filtered.forEach((r) => {
      if (y > H - 60) { doc.addPage(); y = 60; }
      let cx = margin;
      const cells = {
        period: r.period,
        id: r.id,
        staffCount: String(r.staffCount),
        grossTotal: formatMoneyRWF(r.grossTotal).replace('RWF', '').trim(),
        status: r.status,
      };
      cols.forEach((c) => {
        const t = String(cells[c.k] ?? '');
        doc.text(t.length > 26 ? `${t.slice(0, 25)}…` : t, cx, y);
        cx += c.w;
      });
      y += 18;
    });
    doc.save(`payroll-runs-${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  const triggerPayroll = async () => {
    try {
      const res = await api.post('/accountant/payroll/runs/trigger', {});
      if (res.data?.success) {
        await fetchRuns();
        return;
      }
      window.alert(res.data?.message || 'Could not trigger payroll.');
    } catch (e) {
      const msg = e?.response?.data?.message || e.message || 'Could not trigger payroll.';
      window.alert(msg);
    }
  };

  return (
    <div className="animate-in fade-in duration-700 bg-re-bg min-h-screen" style={{ fontFamily: "'Montserrat', sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />

      <div className="relative w-full min-h-[280px] overflow-hidden">
        <div className="absolute inset-0 bg-[#0a192f]/85 z-10 backdrop-blur-[2px]"></div>
        <img src="/teacher.jpg" alt="Hero Background" className="absolute inset-0 w-full h-full object-cover scale-105" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-[#1E3A5F]/40 via-transparent to-transparent z-10 max-w-[1600px] mx-auto"></div>

        <div className="relative z-20 max-w-[1600px] mx-auto px-6 md:px-12 pt-16 pb-24 flex items-center gap-8">
          <div className="hidden md:flex shrink-0 w-24 h-24 rounded-[32px] border border-white/10 bg-white/5 items-center justify-center backdrop-blur-xl shadow-2xl relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-[#FEBF10]/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
            <Users size={40} style={{ color: '#FEBF10' }} className="group-hover:scale-110 transition-transform duration-500" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-6 h-1 rounded-full animate-pulse" style={{ background: '#FEBF10' }}></span>
              <p className="text-[10px] font-black uppercase tracking-[0.3em]" style={{ color: '#FEBF10' }}>Payroll Runs</p>
            </div>
            <h1 className="text-2xl sm:text-4xl md:text-5xl font-black text-white tracking-tighter leading-none mb-2 mt-2 uppercase">
              Payroll <span style={{ color: '#FEBF10' }}>History</span>
            </h1>
            <p className="text-[8px] sm:text-[10px] md:text-xs font-bold text-white/40 max-w-lg leading-relaxed uppercase tracking-widest italic opacity-60">
              View runs, export reports, and trigger payroll
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-6 md:px-12 -mt-24 relative z-20 pb-20">
        <div className="bg-white rounded-t-[32px] shadow-2xl border border-black/5 overflow-hidden flex flex-col min-h-[520px]">
          <div className="grid grid-cols-1 lg:grid-cols-4 border-b border-black/5">
            <div className="lg:col-span-3 grid grid-cols-2 md:grid-cols-4 divide-x divide-y md:divide-y-0 divide-black/5">
              {[
                { label: 'Total gross', value: formatMoneyRWF(derived.totalGross).replace('RWF', ''), tone: 'text-[#1E3A5F]' },
                { label: 'Processed', value: String(derived.processed), tone: 'text-emerald-600' },
                { label: 'Pending', value: String(derived.pending), tone: 'text-amber-600' },
                { label: 'Runs', value: String(runs.length), tone: 'text-slate-600' },
              ].map((s, i) => (
                <div key={i} className="p-4 sm:p-8 flex flex-col items-center justify-center text-center group hover:bg-re-bg/20 transition-all cursor-default">
                  <span className={`text-sm sm:text-2xl font-black tracking-tighter ${s.tone}`}>{s.value}</span>
                  <p className="text-[6px] sm:text-[8px] font-black text-re-text-muted uppercase tracking-[0.2em] mt-0.5 sm:mt-1 opacity-60">{s.label}</p>
                </div>
              ))}
            </div>
            <div className="hidden lg:flex flex-col border-l border-black/5 bg-re-bg/30 p-6 justify-center gap-3 relative">
              <button
                type="button"
                onClick={triggerPayroll}
                className="w-full h-11 flex items-center justify-center gap-2 text-white rounded-xl font-black text-[9px] uppercase tracking-widest shadow-xl hover:scale-[1.02] active:scale-95 transition-all"
                style={{ background: 'linear-gradient(135deg, #1E3A5F 0%, #0D2644 100%)' }}
              >
                <CheckCircle2 size={14} />
                <span>Trigger payroll</span>
              </button>
              <button
                type="button"
                onClick={exportPdf}
                className="w-full h-11 flex items-center justify-center gap-2 bg-white border border-black/5 text-re-text font-black text-[9px] uppercase tracking-widest rounded-xl hover:bg-re-bg hover:border-[#1E3A5F]/20 hover:shadow-re-soft transition-all group"
              >
                <Download size={14} className="opacity-60 group-hover:opacity-100 transition-opacity" style={{ color: '#1E3A5F' }} />
                <span className="group-hover:text-[#1E3A5F]">Export PDF</span>
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
                  className="w-full h-8 bg-white/80 rounded-lg outline-none border border-black/5 focus:border-[#1E3A5F]/20 focus:bg-white transition-all text-[#1E3A5F] text-[9px] font-black uppercase tracking-widest shadow-[inset_0_2px_8px_rgba(15,23,42,0.06),inset_0_-1px_0_rgba(255,255,255,0.5)] cursor-pointer appearance-none !pl-[4.6rem] pr-8"
                >
                  {['All', 'processed', 'pending'].map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              <div className="relative w-[14rem] group">
                <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-re-text-muted/50 group-focus-within:text-[#1E3A5F] transition-colors z-[1] pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search run ID or period..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full h-8 bg-white/80 rounded-lg outline-none border border-black/5 focus:border-[#1E3A5F]/20 focus:bg-white transition-all text-[#1E3A5F] text-[9px] font-black uppercase tracking-tight shadow-[inset_0_2px_8px_rgba(15,23,42,0.06),inset_0_-1px_0_rgba(255,255,255,0.5)] placeholder:text-[#1E3A5F]/30 !pl-8"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={() => fetchRuns()}
              className="h-8 w-8 flex items-center justify-center bg-white border border-black/5 rounded-lg hover:bg-re-bg transition-all shadow-sm disabled:opacity-40 shrink-0 ml-auto"
            >
              <RefreshCw size={12} className="text-[#1E3A5F]" />
            </button>
          </div>

          <div className="overflow-x-auto bg-white flex-1">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-re-bg/20 border-b border-black/5">
                  <th className="px-4 sm:px-6 py-2.5 sm:py-3 text-[8px] font-black text-re-text-muted uppercase tracking-[0.2em] opacity-40 border-r border-black/5">Run</th>
                  <th className="hidden md:table-cell px-6 py-3 text-[8px] font-black text-re-text-muted uppercase tracking-[0.2em] opacity-40 border-r border-black/5">Period</th>
                  <th className="hidden md:table-cell px-6 py-3 text-[8px] font-black text-re-text-muted uppercase tracking-[0.2em] opacity-40 border-r border-black/5 text-right">Staff</th>
                  <th className="px-4 sm:px-6 py-2.5 sm:py-3 text-right text-[8px] font-black text-re-text-muted uppercase tracking-[0.2em] opacity-40 border-r border-black/5">Gross</th>
                  <th className="px-4 sm:px-6 py-2.5 sm:py-3 text-right text-[8px] font-black text-re-text-muted uppercase tracking-[0.2em] opacity-40">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5">
                {filtered.map((r) => (
                  <tr key={r.id} onClick={() => openRunDetails(r)} className="hover:bg-re-bg/60 even:bg-re-bg/20 transition-colors cursor-pointer">
                    <td className="px-4 sm:px-6 py-2.5 sm:py-3 border-r border-black/5">
                      <p className="text-[13px] font-black text-[#1E3A5F] tracking-tight truncate">{r.id}</p>
                      <p className="text-[8px] font-bold text-re-text-muted uppercase tracking-widest leading-none mt-1 opacity-50">{r.period}</p>
                    </td>
                    <td className="hidden md:table-cell px-6 py-3 border-r border-black/5 text-[11px] font-black text-[#1E3A5F]">{r.period}</td>
                    <td className="hidden md:table-cell px-6 py-3 border-r border-black/5 text-right text-[11px] font-black text-[#1E3A5F]">{r.staffCount}</td>
                    <td className="px-4 sm:px-6 py-2.5 sm:py-3 border-r border-black/5 text-right text-[12px] font-black text-[#1E3A5F]">
                      {formatMoneyRWF(r.grossTotal).replace('RWF', '')}
                    </td>
                    <td className="px-4 sm:px-6 py-2.5 sm:py-3 text-right">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest border ${r.status === 'processed' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-amber-50 text-amber-800 border-amber-100'}`}>
                        {r.status}
                      </span>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-10 text-center">
                      <p className="text-[9px] font-black text-re-text-muted uppercase tracking-widest opacity-40">No payroll runs found.</p>
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
                {filtered.length} runs
              </p>
            </div>
            <p className="text-[8px] font-black text-re-text-muted uppercase tracking-[0.2em] opacity-40 italic">
              RWF
            </p>
          </div>
        </div>
      </div>

      <PayrollRunDrawer isOpen={!!details} run={details} onClose={() => setDetails(null)} />
    </div>
  );
}

