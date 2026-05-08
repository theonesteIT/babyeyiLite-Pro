import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Search, RotateCcw, CheckCircle, Activity, AlertTriangle, User, Printer, RefreshCw } from 'lucide-react';
import { exportLibraryReportPdf } from '../utils/libraryPdf';
import api from '../services/api';

const Returns = () => {
  const [search, setSearch] = useState('');
  const [lateOnly, setLateOnly] = useState(false);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadReturns = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/borrowings', { params: { status: 'returned' } });
      setRows(res.data?.data || []);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadReturns();
  }, [loadReturns]);

  const ym = useMemo(() => new Date().toISOString().slice(0, 7), []);

  const stats = useMemo(() => {
    const total = rows.length;
    const late = rows.filter((r) => r.late_return).length;
    const onTime = rows.filter((r) => !r.late_return).length;
    const thisMonth = rows.filter((r) => {
      const d = r.returned_at || r.borrow_date;
      return d && String(d).startsWith(ym);
    }).length;
    return { total, late, onTime, thisMonth };
  }, [rows, ym]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows
      .filter((r) => {
        const lOk = !lateOnly || r.late_return;
        const qOk =
          !q
          || (r.borrower_name || '').toLowerCase().includes(q)
          || (r.book_title || '').toLowerCase().includes(q)
          || String(r.id).includes(q)
          || (r.book_isbn || '').toLowerCase().includes(q);
        return lOk && qOk;
      })
      .sort((a, b) => {
        const ad = new Date(b.returned_at || b.borrow_date || 0);
        const bd = new Date(a.returned_at || a.borrow_date || 0);
        return ad - bd;
      });
  }, [rows, search, lateOnly]);

  const exportPDF = () => {
    exportLibraryReportPdf({
      title: 'Returns history — Babyeyi School Library',
      subtitle: `Generated: ${new Date().toLocaleString()} · ${filtered.length} records`,
      fileName: 'returns-history.pdf',
      columns: [
        { key: 'id', label: 'Loan ID', w: 48 },
        { key: 'book_title', label: 'Book', w: 150 },
        { key: 'borrower_name', label: 'Borrower', w: 130 },
        { key: 'borrow_date', label: 'Issued', w: 72 },
        { key: 'return_date', label: 'Due', w: 72 },
        { key: 'returned_at', label: 'Returned', w: 72 },
        {
          key: 'late_return',
          label: 'Status',
          w: 70,
          format: (r) => (r.late_return ? 'Late' : 'On time'),
        },
      ],
      rows: filtered,
    });
  };

  return (
    <div className="animate-in fade-in duration-700 bg-re-bg min-h-screen" style={{ fontFamily: "'Montserrat', sans-serif" }}>
      <div className="relative w-full min-h-[200px] sm:min-h-[220px] overflow-hidden bg-[#c87800]">
        <div className="absolute -top-28 -right-28 w-[22rem] h-[22rem] rounded-full border border-white/[0.07] pointer-events-none" aria-hidden />
        <div className="absolute -top-14 -right-14 w-[15rem] h-[15rem] rounded-full border border-white/[0.06] pointer-events-none" aria-hidden />
        <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-[#FEBF10]/30 to-transparent pointer-events-none" aria-hidden />

        <div className="relative z-10 max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-12 pt-10 sm:pt-12 pb-20 sm:pb-24 flex items-center justify-between">
          <div className="space-y-1 max-w-3xl">
            <div className="flex items-center gap-2 mb-1">
              <span className="w-5 h-1 rounded-full bg-[#FEBF10]" aria-hidden />
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#FEBF10]">Circulation</p>
            </div>
            <h1 className="text-xl md:text-2xl font-semibold text-white tracking-tight leading-none mb-1 mt-1 uppercase">
              Returns History
            </h1>
            <p className="text-[10px] sm:text-[11px] font-medium text-white/60 tracking-wider">
              Completed loans from the database · Late vs on-time
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 md:px-12 -mt-12 sm:-mt-16 relative z-20 pb-20">
        <div className="bg-white rounded-t-[32px] shadow-2xl border border-black/5 overflow-hidden flex flex-col min-h-[500px]">
          <div className="grid grid-cols-1 lg:grid-cols-4 border-b border-black/5">
            <div className="lg:col-span-3 grid grid-cols-2 md:grid-cols-4 divide-x divide-y md:divide-y-0 divide-black/5">
              {[
                { label: 'Total Returns', value: loading ? '…' : stats.total, icon: <RotateCcw size={14} className="text-blue-500" /> },
                { label: 'On Time', value: loading ? '…' : stats.onTime, icon: <CheckCircle size={14} className="text-emerald-500" /> },
                { label: 'Late Returns', value: loading ? '…' : stats.late, icon: <AlertTriangle size={14} className="text-red-500" /> },
                { label: 'This Month', value: loading ? '…' : stats.thisMonth, icon: <Activity size={14} className="text-amber-500" /> },
              ].map((s, i) => (
                <div key={i} className="p-4 sm:p-8 flex flex-col items-center justify-center text-center group hover:bg-re-bg/20 transition-all cursor-default">
                  <div className="mb-1.5 sm:mb-2 opacity-40 shrink-0">{s.icon}</div>
                  <span className="text-sm sm:text-2xl font-semibold text-re-text tracking-tighter group-hover:text-[#1E3A5F] transition-colors">{s.value}</span>
                  <p className="text-[6px] sm:text-[8px] font-semibold text-re-text-muted uppercase tracking-[0.2em] mt-0.5 sm:mt-1 opacity-60">{s.label}</p>
                </div>
              ))}
            </div>
            <div className="hidden lg:flex flex-col border-l border-black/5 bg-re-bg/30 p-6 justify-center gap-3">
              <button
                type="button"
                onClick={exportPDF}
                className="w-full h-11 flex items-center justify-center gap-2 text-white rounded-xl font-semibold text-[9px] uppercase tracking-widest shadow-xl hover:scale-[1.02] transition-all"
                style={{ background: 'linear-gradient(135deg,#1E3A5F 0%,#0D2644 100%)' }}
              >
                <Printer size={14} /><span>Export PDF</span>
              </button>
              <button
                type="button"
                onClick={loadReturns}
                className="w-full h-9 flex items-center justify-center gap-2 text-[9px] font-semibold uppercase text-slate-500 border border-black/5 rounded-xl hover:bg-white"
              >
                <RefreshCw size={12} className={loading ? 'animate-spin' : ''} /> Refresh
              </button>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row lg:hidden px-3 py-2 border-b border-black/5 gap-2 bg-re-bg/20">
            <button
              type="button"
              onClick={exportPDF}
              className="h-9 flex items-center justify-center gap-2 text-white rounded-xl font-semibold text-[9px] uppercase"
              style={{ background: 'linear-gradient(135deg,#1E3A5F 0%,#0D2644 100%)' }}
            >
              <Printer size={14} /> PDF
            </button>
            <button type="button" onClick={loadReturns} className="h-9 border border-black/5 rounded-xl text-[9px] font-semibold uppercase">
              <RefreshCw size={12} className={loading ? 'inline animate-spin' : 'inline'} /> Refresh
            </button>
          </div>

          <div className="lg:hidden px-3 py-2 border-b border-black/5 flex flex-wrap items-center gap-2 bg-re-bg/20">
            <button
              type="button"
              onClick={() => setLateOnly((p) => !p)}
              className={`h-8 px-3 rounded-lg text-[9px] font-semibold uppercase border ${lateOnly ? 'bg-red-100 text-red-600 border-red-200' : 'bg-white border-black/5'}`}
            >
              Late only
            </button>
            <div className="relative flex-1 min-w-[12rem]">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-re-text-muted/50 pointer-events-none" />
              <input
                type="text"
                placeholder="Search…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full h-8 bg-white/80 rounded-lg outline-none border border-black/5 pl-8 text-[9px] font-semibold"
              />
            </div>
          </div>

          <div className="hidden lg:flex px-3 py-2 border-b border-black/5 items-center gap-2 bg-re-bg/20">
            <button
              type="button"
              onClick={() => setLateOnly((p) => !p)}
              className={`h-8 px-3 rounded-lg text-[9px] font-semibold uppercase tracking-widest border transition-all ${lateOnly ? 'bg-red-100 text-red-600 border-red-200' : 'bg-white border-black/5 text-re-text-muted hover:border-red-200'}`}
            >
              Late only
            </button>
            <div className="relative w-[16rem] group">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-re-text-muted/50 pointer-events-none" />
              <input
                type="text"
                placeholder="Search borrower or book…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full h-8 bg-white/80 rounded-lg outline-none border border-black/5 focus:border-[#1E3A5F]/20 text-[#1E3A5F] text-[9px] font-semibold shadow-[inset_0_2px_8px_rgba(15,23,42,0.06)] placeholder:text-[#1E3A5F]/30 pl-8"
              />
            </div>
          </div>

          <div className="overflow-x-auto bg-white flex-1 min-h-[400px]">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-re-bg/20 border-b border-black/5">
                  {['Borrower', 'Book', 'Issued', 'Due', 'Returned', 'Status'].map((h, i) => (
                    <th
                      key={h}
                      className={`px-4 sm:px-6 py-2.5 sm:py-3 text-[8px] font-semibold text-re-text-muted uppercase tracking-[0.2em] opacity-40 border-r border-black/5 ${i > 1 ? 'hidden md:table-cell' : ''} ${i >= 2 ? 'text-right' : ''}`}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5">
                {filtered.map((r) => {
                  const borrowerType = r.user_type === 'student' ? 'Student' : 'Staff';
                  const classOrRole = r.borrower_detail || '—';
                  const due = r.return_date || r.due_date;
                  const returned = r.returned_at || '—';
                  return (
                    <tr key={r.id} className="hover:bg-re-bg/60 even:bg-re-bg/20 transition-colors group">
                      <td className="px-4 sm:px-6 py-2.5 sm:py-3 border-r border-black/5">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full border border-black/5 bg-slate-100 flex items-center justify-center shadow-inner shrink-0 text-[#1E3A5F]">
                            <User size={16} className="opacity-75" />
                          </div>
                          <div>
                            <p className="text-[13px] font-semibold text-[#1E3A5F] tracking-tight">{r.borrower_name || '—'}</p>
                            <p className="text-[8px] font-bold text-re-text-muted uppercase tracking-widest opacity-50 mt-0.5">
                              {borrowerType}
                              {classOrRole !== '—' ? ` · ${classOrRole}` : ''}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 sm:px-6 py-2.5 sm:py-3 border-r border-black/5">
                        <span className="text-[11px] font-semibold text-[#1E3A5F]">{r.book_title || '—'}</span>
                      </td>
                      <td className="hidden md:table-cell px-6 py-3 border-r border-black/5 text-right font-semibold text-[#1E3A5F] text-[11px]">{r.borrow_date || '—'}</td>
                      <td className="hidden md:table-cell px-6 py-3 border-r border-black/5 text-right font-semibold text-slate-500 text-[11px]">{due || '—'}</td>
                      <td className="hidden md:table-cell px-6 py-3 border-r border-black/5 text-right font-semibold text-[#1E3A5F] text-[11px]">{returned}</td>
                      <td className="px-4 sm:px-6 py-2.5 sm:py-3 text-right">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-lg text-[9px] font-semibold uppercase tracking-wider border ${r.late_return ? 'bg-red-100 text-red-600 border-red-200' : 'bg-emerald-100 text-emerald-600 border-emerald-200'
                            }`}
                        >
                          {r.late_return ? 'Late' : 'On time'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
                {!loading && filtered.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-[10px] font-semibold text-re-text-muted uppercase tracking-widest opacity-50">
                      No returns found
                    </td>
                  </tr>
                )}
                {loading && (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-[10px] font-semibold text-re-text-muted uppercase tracking-widest">
                      Loading…
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="flex px-8 py-4 bg-slate-50/50 border-t border-black/5 items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                <p className="text-[8px] font-semibold text-slate-400 uppercase tracking-widest italic opacity-60">Returns log</p>
              </div>
              <div className="w-px h-3 bg-black/10" />
              <p className="text-[8px] font-semibold text-slate-400 uppercase tracking-[0.2em] opacity-40 italic">{filtered.length} records shown</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Returns;
