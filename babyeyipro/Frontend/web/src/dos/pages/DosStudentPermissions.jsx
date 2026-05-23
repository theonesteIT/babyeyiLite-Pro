import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle, Calendar, CheckCircle, Clock, Eye, Filter, Loader2,
  RefreshCw, Search, ShieldCheck, ThumbsDown, ThumbsUp, Users, X,
} from 'lucide-react';
import api from '../services/api';
import DosOrangePageHero, { DosPageBody } from '../components/DosOrangePageHero';

const TYPE_EMOJI = { MEDICAL: '🏥', FAMILY: '👨‍👩‍👧', OFFICIAL: '📋', OTHER: '📝' };
const QUICK_FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'today', label: 'Today' },
  { key: 'week', label: 'This Week' },
  { key: 'month', label: 'This Month' },
];
const STATUS_OPTIONS = ['ALL', 'PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'];
const TERM_OPTIONS = ['ALL', 'Term 1', 'Term 2', 'Term 3'];

function fmtDate(v) {
  if (!v) return '—';
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return String(v);
  return d.toLocaleDateString('en-RW', { year: 'numeric', month: 'short', day: '2-digit' });
}
function fmtDateTime(v) {
  if (!v) return '—';
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return String(v);
  return d.toLocaleDateString('en-RW', { year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' });
}

function statusBadge(status) {
  const s = String(status || '').toUpperCase();
  const cls = s === 'APPROVED' ? 'bg-emerald-100 text-emerald-700'
    : s === 'REJECTED' ? 'bg-red-100 text-red-700'
    : s === 'CANCELLED' ? 'bg-slate-200 text-slate-600'
    : 'bg-amber-100 text-amber-700';
  return <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${cls}`}>{s || 'PENDING'}</span>;
}

function gateBadge(state) {
  if (!state || state === 'NOT_USED') return null;
  const m = { OUT: 'bg-blue-100 text-blue-700', BACK: 'bg-emerald-100 text-emerald-700', EXCEEDED: 'bg-red-100 text-red-700' };
  return <span className={`ml-1 px-1.5 py-0.5 rounded text-[8px] font-black uppercase ${m[state] || 'bg-slate-100 text-slate-500'}`}>{state}</span>;
}

function inferTerm(dateStr) {
  const m = new Date(dateStr).getMonth() + 1;
  if (m >= 1 && m <= 4) return 'Term 1';
  if (m >= 5 && m <= 8) return 'Term 2';
  return 'Term 3';
}

function startOfWeek() {
  const d = new Date(); d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - d.getDay());
  return d;
}
function startOfMonth() {
  const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(1);
  return d;
}

export default function DosStudentPermissions() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [quickFilter, setQuickFilter] = useState('all');
  const [classFilter, setClassFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [termFilter, setTermFilter] = useState('ALL');
  const [yearFilter, setYearFilter] = useState('ALL');
  const [viewPerm, setViewPerm] = useState(null);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [permRes, exceededRes] = await Promise.all([
        api.get('/permissions'),
        api.get('/discipline/permissions/exceeded-report', { params: { period: 'all' } }).catch(() => ({ data: { success: false } })),
      ]);
      if (permRes.data?.success) {
        let permRows = Array.isArray(permRes.data.data) ? permRes.data.data : [];
        if (exceededRes.data?.success && exceededRes.data.data?.data?.length) {
          const exceededMap = new Map(exceededRes.data.data.data.map(e => [e.student_id, e]));
          permRows = permRows.map(r => {
            const ex = exceededMap.get(r.student_id);
            if (ex && !r.exceeded_minutes) return { ...r, exceeded_minutes: ex.total_exceeded_minutes || 0 };
            return r;
          });
        }
        setRows(permRows);
      }
    } catch (e) {
      setToast({ type: 'error', msg: e?.response?.data?.message || 'Failed to load' });
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const classes = useMemo(() => {
    const s = new Set(rows.map(r => r.class_name).filter(Boolean));
    return ['ALL', ...Array.from(s).sort()];
  }, [rows]);

  const years = useMemo(() => {
    const s = new Set(rows.map(r => new Date(r.starts_at).getFullYear()).filter(Boolean));
    return ['ALL', ...Array.from(s).sort((a, b) => b - a)];
  }, [rows]);

  const filtered = useMemo(() => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const weekStart = startOfWeek();
    const monthStart = startOfMonth();
    const q = search.trim().toLowerCase();

    return rows.filter(r => {
      const d = new Date(r.starts_at);
      if (quickFilter === 'today' && d.toDateString() !== today.toDateString()) return false;
      if (quickFilter === 'week' && d < weekStart) return false;
      if (quickFilter === 'month' && d < monthStart) return false;
      if (statusFilter !== 'ALL' && (r.status || '').toUpperCase() !== statusFilter) return false;
      if (classFilter !== 'ALL' && r.class_name !== classFilter) return false;
      if (typeFilter !== 'ALL' && r.permission_type !== typeFilter) return false;
      if (termFilter !== 'ALL' && inferTerm(r.starts_at) !== termFilter) return false;
      if (yearFilter !== 'ALL' && new Date(r.starts_at).getFullYear() !== Number(yearFilter)) return false;
      if (q) {
        const name = `${r.first_name || ''} ${r.last_name || ''}`.toLowerCase();
        const uid = (r.student_uid || '').toLowerCase();
        if (!name.includes(q) && !uid.includes(q) && !(r.reason || '').toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [rows, search, statusFilter, quickFilter, classFilter, typeFilter, termFilter, yearFilter]);

  const summary = useMemo(() => ({
    total: filtered.length,
    pending: filtered.filter(r => r.status === 'PENDING').length,
    approved: filtered.filter(r => r.status === 'APPROVED').length,
    rejected: filtered.filter(r => r.status === 'REJECTED').length,
    out: filtered.filter(r => r.gate_scan_state === 'OUT').length,
    exceeded: filtered.filter(r => r.gate_scan_state === 'EXCEEDED').length,
  }), [filtered]);

  const updateStatus = async (id, status) => {
    try {
      await api.patch(`/permissions/${id}/status`, { status });
      setToast({ type: 'success', msg: `Permission ${status.toLowerCase()}` });
      load();
    } catch (e) {
      setToast({ type: 'error', msg: e?.response?.data?.message || 'Action failed' });
    }
  };

  return (
    <div className="min-h-screen bg-white font-sans">
      <DosOrangePageHero
        title="Student permissions"
        subtitle="View and manage all student leave and permission records."
        onRefresh={load}
        refreshing={loading}
      />

      <DosPageBody className="max-w-[1500px] -mt-4 sm:-mt-5 md:-mt-6 space-y-4">

        {/* Quick filters */}
        <div className="flex flex-wrap gap-2">
          {QUICK_FILTERS.map(f => (
            <button key={f.key} type="button" onClick={() => setQuickFilter(f.key)}
              className={`h-9 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                quickFilter === f.key
                  ? 'bg-[#1E3A5F] text-white shadow-lg shadow-[#1E3A5F]/20'
                  : 'bg-white border border-black/5 text-slate-600 hover:bg-slate-50'
              }`}>
              {f.label}
            </button>
          ))}
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
          {[
            ['Total', summary.total, 'bg-white'],
            ['Pending', summary.pending, 'bg-amber-50'],
            ['Approved', summary.approved, 'bg-emerald-50'],
            ['Rejected', summary.rejected, 'bg-red-50'],
            ['Currently Out', summary.out, 'bg-blue-50'],
            ['Exceeded', summary.exceeded, 'bg-rose-50'],
          ].map(([k, v, bg]) => (
            <div key={k} className={`${bg} border border-black/5 rounded-xl p-3 text-center`}>
              <p className="text-[13px] font-black text-[#1E3A5F]">{v}</p>
              <p className="text-[8px] font-black uppercase tracking-widest text-slate-400 mt-0.5">{k}</p>
            </div>
          ))}
        </div>

        {/* Advanced filters */}
        <div className="bg-white border border-black/5 rounded-2xl p-4 flex flex-wrap gap-2 items-center">
          <div className="relative flex-1 min-w-[160px]">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search student name or UID..."
              className="w-full h-9 rounded-xl bg-slate-50 pl-9 pr-3 text-[10px] font-bold border border-transparent focus:border-[#1E3A5F]/20 focus:ring-2 focus:ring-[#1E3A5F]/10 outline-none" />
          </div>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
            className="h-9 rounded-xl border border-black/10 px-3 text-[10px] font-black uppercase text-slate-600">
            {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s === 'ALL' ? 'All Status' : s}</option>)}
          </select>
          <select value={classFilter} onChange={e => setClassFilter(e.target.value)}
            className="h-9 rounded-xl border border-black/10 px-3 text-[10px] font-black uppercase text-slate-600">
            {classes.map(c => <option key={c} value={c}>{c === 'ALL' ? 'All Classes' : c}</option>)}
          </select>
          <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
            className="h-9 rounded-xl border border-black/10 px-3 text-[10px] font-black uppercase text-slate-600">
            {['ALL', 'MEDICAL', 'FAMILY', 'OFFICIAL', 'OTHER'].map(t => <option key={t} value={t}>{t === 'ALL' ? 'All Types' : t}</option>)}
          </select>
          <select value={termFilter} onChange={e => setTermFilter(e.target.value)}
            className="h-9 rounded-xl border border-black/10 px-3 text-[10px] font-black uppercase text-slate-600">
            {TERM_OPTIONS.map(t => <option key={t} value={t}>{t === 'ALL' ? 'All Terms' : t}</option>)}
          </select>
          <select value={yearFilter} onChange={e => setYearFilter(e.target.value)}
            className="h-9 rounded-xl border border-black/10 px-3 text-[10px] font-black uppercase text-slate-600">
            {years.map(y => <option key={y} value={y}>{y === 'ALL' ? 'All Years' : y}</option>)}
          </select>
          {(search || statusFilter !== 'ALL' || classFilter !== 'ALL' || typeFilter !== 'ALL' || termFilter !== 'ALL' || yearFilter !== 'ALL' || quickFilter !== 'all') && (
            <button type="button" onClick={() => { setSearch(''); setStatusFilter('ALL'); setClassFilter('ALL'); setTypeFilter('ALL'); setTermFilter('ALL'); setYearFilter('ALL'); setQuickFilter('all'); }}
              className="h-9 px-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-[10px] font-black flex items-center gap-1 hover:bg-red-100 transition-all">
              <X size={11} /> Clear
            </button>
          )}
        </div>

        {/* Table */}
        <div className="bg-white border border-black/5 rounded-2xl overflow-hidden">
          {loading ? (
            <div className="p-10 flex items-center justify-center gap-2 text-slate-400 text-[11px] font-black uppercase">
              <Loader2 size={18} className="animate-spin" /> Loading permissions...
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50 border-b border-black/5">
                    {['Student', 'Class', 'Type', 'Period', 'Reason', 'Status', 'Gate', 'Actions'].map(h => (
                      <th key={h} className="px-3 py-3 text-[9px] font-black uppercase tracking-[0.15em] text-slate-400 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/5">
                  {filtered.map(r => {
                    const name = `${r.first_name || ''} ${r.last_name || ''}`.trim();
                    const isPending = (r.status || '').toUpperCase() === 'PENDING';
                    return (
                      <tr key={r.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-[#1E3A5F]/10 flex items-center justify-center text-[10px] font-black text-[#1E3A5F] shrink-0">
                              {(r.first_name || '?')[0]}{(r.last_name || '?')[0]}
                            </div>
                            <div>
                              <p className="text-[10px] font-black text-[#1E3A5F]">{name || '—'}</p>
                              <p className="text-[9px] text-slate-400">{r.student_uid || `#${r.id}`}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-3 text-[10px] font-bold text-slate-600">{r.class_name || '—'}</td>
                        <td className="px-3 py-3">
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold">
                            {TYPE_EMOJI[r.permission_type] || '📝'} {(r.permission_type || 'OTHER')}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-[10px] font-bold text-slate-600 whitespace-nowrap">
                          <p>{fmtDateTime(r.starts_at)}</p>
                          <p className="text-slate-400">→ {fmtDateTime(r.ends_at)}</p>
                        </td>
                        <td className="px-3 py-3 text-[10px] font-bold text-slate-500 max-w-[180px]">
                          <p className="truncate">{r.reason || '—'}</p>
                        </td>
                        <td className="px-3 py-3">{statusBadge(r.status)}</td>
                        <td className="px-3 py-3">{gateBadge(r.gate_scan_state)}</td>
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-1">
                            <button type="button" title="View" onClick={() => setViewPerm(r)}
                              className="h-7 w-7 rounded-lg border border-blue-200 flex items-center justify-center text-blue-400 hover:bg-blue-50 hover:text-blue-600 transition-all">
                              <Eye size={12} />
                            </button>
                            {isPending && (
                              <>
                                <button type="button" title="Approve" onClick={() => updateStatus(r.id, 'APPROVED')}
                                  className="h-7 w-7 rounded-lg border border-emerald-200 flex items-center justify-center text-emerald-500 hover:bg-emerald-50 hover:text-emerald-700 transition-all">
                                  <ThumbsUp size={12} />
                                </button>
                                <button type="button" title="Reject" onClick={() => updateStatus(r.id, 'REJECTED')}
                                  className="h-7 w-7 rounded-lg border border-red-200 flex items-center justify-center text-red-400 hover:bg-red-50 hover:text-red-600 transition-all">
                                  <ThumbsDown size={12} />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {!filtered.length && (
                    <tr>
                      <td colSpan={8} className="px-4 py-14 text-center">
                        <ShieldCheck size={30} className="mx-auto mb-2 text-slate-200" />
                        <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">No student permissions match your filters</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
              {filtered.length > 0 && (
                <div className="px-4 py-3 border-t border-black/5 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                  Showing {filtered.length} of {rows.length} records
                </div>
              )}
            </div>
          )}
        </div>
      </DosPageBody>

      {/* View detail modal */}
      {viewPerm && (
        <div className="fixed inset-0 z-[320] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setViewPerm(null)}>
          <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 duration-300 max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className={`p-5 shrink-0 ${(viewPerm.status || '').toUpperCase() === 'APPROVED' ? 'bg-gradient-to-br from-emerald-600 to-emerald-800' : (viewPerm.status || '').toUpperCase() === 'REJECTED' ? 'bg-gradient-to-br from-red-600 to-red-800' : 'bg-gradient-to-br from-[#000435] to-[#0a1860]'}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center">
                    <ShieldCheck size={18} className="text-white" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-white">Permission Details</h3>
                    <p className="text-[10px] text-white/60 mt-0.5">#{viewPerm.id} · {(viewPerm.status || 'PENDING').toUpperCase()}</p>
                  </div>
                </div>
                <button type="button" onClick={() => setViewPerm(null)} className="p-2 bg-white/10 hover:bg-white/20 rounded-xl text-white/70 hover:text-white transition-all">
                  <X size={16} />
                </button>
              </div>
            </div>
            <div className="p-5 space-y-3 overflow-y-auto flex-1">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-50 rounded-xl p-3">
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Student</p>
                  <p className="text-xs font-black text-[#1E3A5F] mt-1">{viewPerm.first_name} {viewPerm.last_name}</p>
                  <p className="text-[9px] text-slate-400">{viewPerm.student_uid}</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-3">
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Class</p>
                  <p className="text-xs font-bold text-slate-800 mt-1">{viewPerm.class_name || '—'}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-50 rounded-xl p-3">
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Type</p>
                  <p className="text-xs font-bold text-slate-800 mt-1">{TYPE_EMOJI[viewPerm.permission_type] || '📝'} {viewPerm.permission_type || 'OTHER'}</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-3">
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Status</p>
                  <p className="mt-1">{statusBadge(viewPerm.status)} {gateBadge(viewPerm.gate_scan_state)}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-50 rounded-xl p-3">
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Starts At</p>
                  <p className="text-xs font-bold text-slate-800 mt-1 flex items-center gap-1"><Calendar size={10} /> {fmtDateTime(viewPerm.starts_at)}</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-3">
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Ends At</p>
                  <p className="text-xs font-bold text-slate-800 mt-1 flex items-center gap-1"><Calendar size={10} /> {fmtDateTime(viewPerm.ends_at)}</p>
                </div>
              </div>
              {(viewPerm.actual_out_at || viewPerm.actual_return_at) && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-blue-50 border border-blue-100 rounded-xl p-3">
                    <p className="text-[9px] font-black uppercase tracking-widest text-blue-400">Actual Out</p>
                    <p className="text-xs font-bold text-blue-700 mt-1">{fmtDateTime(viewPerm.actual_out_at)}</p>
                  </div>
                  <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3">
                    <p className="text-[9px] font-black uppercase tracking-widest text-emerald-400">Actual Return</p>
                    <p className="text-xs font-bold text-emerald-700 mt-1">{fmtDateTime(viewPerm.actual_return_at)}</p>
                  </div>
                </div>
              )}
              {viewPerm.exceeded_minutes > 0 && (
                <div className="bg-red-50 border border-red-100 rounded-xl p-3">
                  <p className="text-[9px] font-black uppercase tracking-widest text-red-400">Exceeded Time</p>
                  <p className="text-xs font-black text-red-700 mt-1">{viewPerm.exceeded_minutes} minutes over limit</p>
                </div>
              )}
              {viewPerm.reason && (
                <div className="bg-slate-50 rounded-xl p-3">
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Reason</p>
                  <p className="text-xs text-slate-700 mt-1 whitespace-pre-wrap">{viewPerm.reason}</p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-50 rounded-xl p-3">
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Requested By</p>
                  <p className="text-xs font-bold text-slate-800 mt-1">{viewPerm.req_first ? `${viewPerm.req_first} ${viewPerm.req_last}` : '—'}</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-3">
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Approved By</p>
                  <p className="text-xs font-bold text-slate-800 mt-1">{viewPerm.app_first ? `${viewPerm.app_first} ${viewPerm.app_last}` : '—'}</p>
                </div>
              </div>
              {viewPerm.created_at && (
                <p className="text-[9px] text-slate-400 text-right">Created: {fmtDateTime(viewPerm.created_at)}</p>
              )}
            </div>
            <div className="p-4 bg-slate-50 border-t border-black/5 flex justify-end shrink-0">
              <button type="button" onClick={() => setViewPerm(null)} className="h-10 px-6 rounded-xl bg-white border border-black/5 text-slate-600 font-black text-[10px] uppercase tracking-widest hover:bg-slate-100 transition-all">Close</button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed right-4 top-4 z-[260]">
          <div className={`max-w-[360px] px-3 py-2 rounded-xl border shadow-lg flex items-start gap-2 ${toast.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
            {toast.type === 'success' ? <CheckCircle size={14} className="mt-[1px]" /> : <AlertTriangle size={14} className="mt-[1px]" />}
            <p className="text-[11px] font-black">{toast.msg}</p>
          </div>
        </div>
      )}
    </div>
  );
}
