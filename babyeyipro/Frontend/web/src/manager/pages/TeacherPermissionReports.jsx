import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Calendar, CheckCircle, Clock, Download, Eye, Loader2, RefreshCw, Shield, X } from 'lucide-react';
import api from '../services/api';
import ManagerOchreHeroShell from '../components/ManagerOchreHeroShell';

const STATUS_OPTIONS = ['All', 'pending', 'approved', 'rejected'];

function fmtDate(v) {
  if (!v) return '—';
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return String(v);
  return d.toLocaleDateString('en-RW', { year: 'numeric', month: 'short', day: '2-digit' });
}

const TYPE_EMOJI = {
  SICK_LEAVE: '🏥', PERSONAL: '👤', FAMILY: '👨‍👩‍👧', OFFICIAL: '📋',
  LATE_ARRIVAL: '⏰', EARLY_DEPARTURE: '🚪', OTHER: '📝',
};

function statusBadge(status) {
  const s = String(status || '').toLowerCase();
  const cls = s === 'approved' ? 'bg-emerald-100 text-emerald-700'
    : s === 'rejected' ? 'bg-red-100 text-red-700'
    : s === 'cancelled' ? 'bg-slate-200 text-slate-600'
    : 'bg-amber-100 text-amber-700';
  return <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${cls}`}>{s || 'pending'}</span>;
}

export default function TeacherPermissionReports() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('All');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [toast, setToast] = useState(null);
  const [viewPerm, setViewPerm] = useState(null);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 3800);
    return () => window.clearTimeout(t);
  }, [toast]);

  const load = async () => {
    setLoading(true);
    try {
      const params = {};
      if (statusFilter !== 'All') params.status = statusFilter;
      if (fromDate) params.from = fromDate;
      if (toDate) params.to = toDate;
      const res = await api.get('/reports/teacher-permissions', { params });
      if (res.data?.success) setRows(Array.isArray(res.data.data) ? res.data.data : []);
    } catch (e) {
      setToast({ type: 'error', message: e?.response?.data?.message || 'Failed to load permissions.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const summary = useMemo(() => ({
    total: rows.length,
    pending: rows.filter(r => r.status === 'pending').length,
    approved: rows.filter(r => r.status === 'approved').length,
    rejected: rows.filter(r => r.status === 'rejected').length,
  }), [rows]);

  const exportCsv = () => {
    if (!rows.length) return;
    const headers = ['#', 'Teacher', 'Type', 'Start Date', 'End Date', 'Reason', 'Status', 'Decision Note', 'Created At'];
    const csv = [headers.join(','), ...rows.map(r =>
      [r.id, `"${r.teacher_name}"`, r.permission_type, r.start_date?.slice(0, 10), r.end_date?.slice(0, 10), `"${(r.reason || '').replace(/"/g, '""')}"`, r.status, `"${(r.decision_note || '').replace(/"/g, '""')}"`, r.created_at?.slice(0, 10)].join(',')
    )].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'teacher-permissions-report.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  const kpiTiles = [
    { label: 'TOTAL', value: summary.total, bg: 'bg-white' },
    { label: 'PENDING', value: summary.pending, bg: 'bg-amber-50' },
    { label: 'APPROVED', value: summary.approved, bg: 'bg-emerald-50' },
    { label: 'REJECTED', value: summary.rejected, bg: 'bg-red-50' },
  ];

  return (
    <>
    <ManagerOchreHeroShell
      eyebrow="Staff Reports"
      title="Teacher Permission Reports"
      subtitle="View all teacher leave and permission requests, their status, and decision notes."
      HeroIcon={Shield}
      headerRight={
        <div className="flex gap-2 items-center">
          <button type="button" onClick={load} className="h-9 px-3 rounded-xl border border-white/20 bg-white/10 text-[10px] font-medium text-white flex items-center gap-1 hover:bg-white/15 transition-all">
            <RefreshCw size={13} /> Refresh
          </button>
          <button type="button" onClick={exportCsv} className="h-9 px-3 rounded-xl border border-white/20 bg-white/10 text-[10px] font-medium text-white flex items-center gap-1 hover:bg-white/15 transition-all">
            <Download size={13} /> Export CSV
          </button>
        </div>
      }
      kpiTiles={kpiTiles.map(t => (
        <div key={t.label} className={`${t.bg} border border-black/5 rounded-xl p-3 text-center`}>
          <p className="text-[11px] font-black text-[#1E3A5F]">{t.value}</p>
          <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">{t.label}</p>
        </div>
      ))}
      cardBody={
        <>
          <div className="p-4 border-b border-black/5 flex flex-wrap gap-2 items-center bg-slate-50/50">
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="h-9 rounded-xl border border-black/10 px-3 text-[10px] font-black uppercase text-slate-600">
              {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="h-9 rounded-xl border border-black/10 px-3 text-[10px] font-black text-slate-600" />
            <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="h-9 rounded-xl border border-black/10 px-3 text-[10px] font-black text-slate-600" />
            <button onClick={load} className="h-9 px-3 rounded-xl bg-[#1E3A5F] text-white text-[10px] font-black uppercase tracking-wider">Apply</button>
          </div>

          {loading ? (
            <div className="p-8 flex items-center gap-2 text-slate-400 text-[11px] font-black uppercase">
              <Loader2 size={16} className="animate-spin" /> Loading...
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50 border-b border-black/5">
                    {['#', 'Teacher', 'Type', 'Period', 'Days', 'Reason', 'Status', 'Decision Note', ''].map(h => (
                      <th key={h} className="px-3 py-3 text-[9px] font-black uppercase tracking-[0.15em] text-slate-400 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/5">
                  {rows.map(r => {
                    const days = Math.max(1, Math.ceil((new Date(r.end_date) - new Date(r.start_date)) / 86400000) + 1);
                    return (
                      <tr key={r.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-3 py-3 text-[10px] text-slate-400">{r.id}</td>
                        <td className="px-3 py-3">
                          <p className="text-[10px] font-black text-[#1E3A5F]">{r.teacher_name}</p>
                        </td>
                        <td className="px-3 py-3">
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold">
                            {TYPE_EMOJI[r.permission_type] || '📝'} {(r.permission_type || 'OTHER').replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-[10px] font-bold text-slate-600 whitespace-nowrap">
                          {fmtDate(r.start_date)} → {fmtDate(r.end_date)}
                        </td>
                        <td className="px-3 py-3 text-[11px] font-black text-slate-700 text-center">
                          <span className="inline-flex items-center gap-1"><Clock size={10} /> {days}</span>
                        </td>
                        <td className="px-3 py-3 text-[10px] font-bold text-slate-500 max-w-[200px]">
                          <p className="truncate">{r.reason || '—'}</p>
                        </td>
                        <td className="px-3 py-3">{statusBadge(r.status)}</td>
                        <td className="px-3 py-3 text-[10px] font-bold text-indigo-500 max-w-[180px]">
                          <p className="truncate italic">{r.decision_note || '—'}</p>
                        </td>
                        <td className="px-3 py-3">
                          <button type="button" title="View" onClick={() => setViewPerm(r)}
                            className="h-7 w-7 rounded-lg border border-blue-200 flex items-center justify-center text-blue-400 hover:bg-blue-50 hover:text-blue-600 transition-all">
                            <Eye size={12} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {!rows.length && (
                    <tr>
                      <td colSpan={9} className="px-4 py-12 text-center">
                        <Shield size={28} className="mx-auto mb-2 text-slate-300" />
                        <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">No teacher permission requests found</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </>
      }
    />

    {viewPerm && (
      <div className="fixed inset-0 z-[320] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setViewPerm(null)}>
        <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 duration-300" onClick={e => e.stopPropagation()}>
          <div className={`p-5 ${viewPerm.status === 'approved' ? 'bg-gradient-to-br from-emerald-600 to-emerald-800' : viewPerm.status === 'rejected' ? 'bg-gradient-to-br from-red-600 to-red-800' : 'bg-gradient-to-br from-[#c87800] to-[#a06000]'}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center">
                  <Shield size={18} className="text-white" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white">Permission Details</h3>
                  <p className="text-[10px] text-white/60 mt-0.5">#{viewPerm.id} · {viewPerm.status?.toUpperCase()}</p>
                </div>
              </div>
              <button type="button" onClick={() => setViewPerm(null)} className="p-2 bg-white/10 hover:bg-white/20 rounded-xl text-white/70 hover:text-white transition-all">
                <X size={16} />
              </button>
            </div>
          </div>
          <div className="p-5 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-50 rounded-xl p-3">
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Teacher</p>
                <p className="text-xs font-black text-[#1E3A5F] mt-1">{viewPerm.teacher_name}</p>
              </div>
              <div className="bg-slate-50 rounded-xl p-3">
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Type</p>
                <p className="text-xs font-bold text-slate-800 mt-1">{TYPE_EMOJI[viewPerm.permission_type] || '📝'} {(viewPerm.permission_type || 'OTHER').replace(/_/g, ' ')}</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-slate-50 rounded-xl p-3">
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Start</p>
                <p className="text-xs font-bold text-slate-800 mt-1 flex items-center gap-1"><Calendar size={10} /> {fmtDate(viewPerm.start_date)}</p>
              </div>
              <div className="bg-slate-50 rounded-xl p-3">
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">End</p>
                <p className="text-xs font-bold text-slate-800 mt-1 flex items-center gap-1"><Calendar size={10} /> {fmtDate(viewPerm.end_date)}</p>
              </div>
              <div className="bg-slate-50 rounded-xl p-3">
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Days</p>
                <p className="text-xs font-black text-slate-800 mt-1 flex items-center gap-1"><Clock size={10} /> {Math.max(1, Math.ceil((new Date(viewPerm.end_date) - new Date(viewPerm.start_date)) / 86400000) + 1)}</p>
              </div>
            </div>
            <div className="bg-slate-50 rounded-xl p-3">
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Status</p>
              <p className="mt-1">{statusBadge(viewPerm.status)}</p>
            </div>
            {viewPerm.reason && (
              <div className="bg-slate-50 rounded-xl p-3">
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Reason</p>
                <p className="text-xs text-slate-700 mt-1 whitespace-pre-wrap">{viewPerm.reason}</p>
              </div>
            )}
            {viewPerm.decision_note && (
              <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-3">
                <p className="text-[9px] font-black uppercase tracking-widest text-indigo-400">Decision Note</p>
                <p className="text-xs text-indigo-700 mt-1 italic whitespace-pre-wrap">{viewPerm.decision_note}</p>
              </div>
            )}
            {viewPerm.created_at && (
              <p className="text-[9px] text-slate-400 text-right">Submitted: {fmtDate(viewPerm.created_at)}</p>
            )}
          </div>
          <div className="p-4 bg-slate-50 border-t border-black/5 flex justify-end">
            <button type="button" onClick={() => setViewPerm(null)} className="h-10 px-6 rounded-xl bg-white border border-black/5 text-slate-600 font-black text-[10px] uppercase tracking-widest hover:bg-slate-100 transition-all">Close</button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}
