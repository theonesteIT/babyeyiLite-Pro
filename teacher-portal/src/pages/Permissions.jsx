import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import TablePagination from '../components/TablePagination';
import PermissionRequestModal, { PERMISSION_TYPES } from '../components/PermissionRequestModal';
import {
  Calendar,
  CheckCircle,
  Clock,
  Eye,
  Loader2,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  Shield,
  Trash2,
  X,
  XCircle,
} from 'lucide-react';
import TeacherOrangeHero from '../components/TeacherOrangeHero';

function fmtDate(raw) {
  if (!raw) return '—';
  return new Date(raw).toLocaleDateString('en-RW', { day: '2-digit', month: 'short', year: 'numeric' });
}

const STATUS_BADGE = {
  pending: 'bg-amber-50 text-amber-800 border-amber-200',
  approved: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  rejected: 'bg-red-50 text-red-700 border-red-200',
  cancelled: 'bg-slate-100 text-slate-600 border-slate-200',
};

function typeLabel(value) {
  return PERMISSION_TYPES.find((p) => p.value === value)?.label || String(value || 'Other').replace(/_/g, ' ');
}

function permissionDays(start, end) {
  return Math.max(1, Math.ceil((new Date(end) - new Date(start)) / 86400000) + 1);
}

function StatCard({ icon: Icon, label, value, sub, iconClass }) {
  return (
    <div className="bg-white rounded-2xl border border-black/5 p-4 flex items-start gap-3 shadow-sm">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${iconClass}`}>
        <Icon size={18} />
      </div>
      <div>
        <p className="text-xl font-bold text-slate-800 tabular-nums">{value}</p>
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{label}</p>
        {sub ? <p className="text-[9px] text-slate-400 mt-0.5">{sub}</p> : null}
      </div>
    </div>
  );
}

export default function Permissions() {
  const { teacher } = useAuth();
  const teacherName = teacher?.name || teacher?.full_name || 'Teacher';
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modal, setModal] = useState(false);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('All');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [tab, setTab] = useState('All');
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [viewPerm, setViewPerm] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/teacher-portal/permissions');
      if (res.data?.success) setRows(Array.isArray(res.data.data) ? res.data.data : []);
    } catch (e) {
      setError(e?.response?.data?.message || 'Failed to load permissions');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const createPerm = async (payload) => {
    await api.post('/teacher-portal/permissions', payload);
    load();
  };

  const teacherMeta = useMemo(() => ({
    position: teacher?.position || teacher?.role_title || '',
    department: teacher?.department || teacher?.subject || '',
  }), [teacher]);

  const cancelPerm = async (id) => {
    if (!window.confirm('Cancel this permission request?')) return;
    try {
      await api.delete(`/teacher-portal/permissions/${id}`);
      load();
    } catch (e) {
      setError(e?.response?.data?.message || 'Failed to cancel');
    }
  };

  const counts = useMemo(() => ({
    total: rows.length,
    pending: rows.filter((r) => r.status === 'pending').length,
    approved: rows.filter((r) => r.status === 'approved').length,
    rejected: rows.filter((r) => r.status === 'rejected').length,
  }), [rows]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      const tabOk = tab === 'All'
        || (tab === 'Pending' && r.status === 'pending')
        || (tab === 'Approved' && r.status === 'approved')
        || (tab === 'Rejected' && r.status === 'rejected');
      const typeOk = typeFilter === 'All' || r.permission_type === typeFilter;
      const qOk = !q
        || typeLabel(r.permission_type).toLowerCase().includes(q)
        || (r.reason || '').toLowerCase().includes(q);
      const fromOk = !dateFrom || String(r.start_date || '').slice(0, 10) >= dateFrom;
      const toOk = !dateTo || String(r.end_date || '').slice(0, 10) <= dateTo;
      return tabOk && typeOk && qOk && fromOk && toOk;
    });
  }, [rows, search, typeFilter, dateFrom, dateTo, tab]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / rowsPerPage));
  const paginated = filtered.slice((page - 1) * rowsPerPage, page * rowsPerPage);

  useEffect(() => { setPage(1); }, [search, typeFilter, dateFrom, dateTo, tab, rowsPerPage]);

  const clearFilters = () => {
    setSearch('');
    setTypeFilter('All');
    setDateFrom('');
    setDateTo('');
    setTab('All');
  };

  const tabs = [
    { id: 'All', label: 'All Requests' },
    { id: 'Pending', label: `Pending (${counts.pending})` },
    { id: 'Approved', label: `Approved (${counts.approved})` },
    { id: 'Rejected', label: `Rejected (${counts.rejected})` },
  ];

  return (
    <div className="min-h-screen bg-re-bg font-sans">
      <TeacherOrangeHero
        title="Permission Requests"
        subtitle="Submit leave, late arrival, or early departure requests. Your manager reviews and approves."
        rightSlot={
          <>
            <button
              type="button"
              onClick={load}
              className="inline-flex items-center justify-center rounded-xl border border-white/25 bg-white/10 w-11 h-11 text-white hover:bg-white/20 transition-all"
              title="Refresh"
              aria-label="Refresh permissions"
            >
              <RefreshCw size={16} />
            </button>
            <button
              type="button"
              onClick={() => setModal(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-white font-bold text-[11px] border border-white/25 bg-white/15 hover:bg-white/25 transition-all"
            >
              <Plus size={16} /> Request Permission
            </button>
          </>
        }
      >
        <div className="flex md:hidden gap-2">
          <button type="button" onClick={load} className="inline-flex items-center justify-center rounded-xl border border-white/25 bg-white/10 w-11 h-11 text-white" aria-label="Refresh">
            <RefreshCw size={16} />
          </button>
          <button type="button" onClick={() => setModal(true)} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-white font-bold text-[11px] border border-white/25 bg-white/15">
            <Plus size={16} /> Request
          </button>
        </div>
      </TeacherOrangeHero>

      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 -mt-10 relative z-30 pb-16 space-y-5">
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-800">{error}</div>
        )}

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard icon={Shield} label="Total Requests" value={counts.total} sub="Your submissions" iconClass="text-sky-600 bg-sky-50" />
          <StatCard icon={Clock} label="Pending" value={counts.pending} sub="Awaiting manager" iconClass="text-orange-600 bg-orange-50" />
          <StatCard icon={CheckCircle} label="Approved" value={counts.approved} sub="Approved requests" iconClass="text-emerald-600 bg-emerald-50" />
          <StatCard icon={XCircle} label="Rejected" value={counts.rejected} sub="Declined requests" iconClass="text-red-600 bg-red-50" />
        </div>

        <div className="bg-white rounded-2xl border border-black/5 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-black/5 space-y-3">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by type or reason…"
                className="w-full h-10 rounded-xl bg-slate-50 pl-9 pr-4 text-xs font-bold border border-black/5 outline-none focus:border-re-orange/30 focus:ring-2 focus:ring-re-orange/10 transition-all"
              />
            </div>
            <div className="flex flex-wrap gap-2 items-center">
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="h-9 rounded-xl border border-black/5 px-3 text-xs font-bold bg-white outline-none min-w-[140px]"
              >
                <option value="All">All Types</option>
                {PERMISSION_TYPES.map((pt) => (
                  <option key={pt.value} value={pt.value}>{pt.label}</option>
                ))}
              </select>
              <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="h-9 rounded-xl border border-black/5 px-3 text-xs font-bold bg-white" />
              <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="h-9 rounded-xl border border-black/5 px-3 text-xs font-bold bg-white" />
              <button type="button" onClick={clearFilters} className="h-9 px-3 rounded-xl border border-black/5 text-xs font-bold text-slate-600 inline-flex items-center gap-1 hover:bg-slate-50">
                <RotateCcw size={12} /> Reset
              </button>
            </div>
          </div>

          <div className="flex flex-wrap gap-1 px-4 py-3 border-b border-black/5 bg-slate-50/50">
            {tabs.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${
                  tab === t.id ? 'bg-re-orange text-white shadow-sm' : 'text-slate-500 hover:bg-white hover:text-slate-700'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="flex items-center justify-center gap-3 py-20">
              <Loader2 className="animate-spin text-re-orange" size={22} />
              <span className="text-sm font-bold text-slate-400">Loading requests…</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center px-6">
              <Shield className="mx-auto text-slate-200 mb-3" size={40} />
              <p className="text-[11px] font-bold text-slate-400">No permission requests found</p>
              <button type="button" onClick={() => setModal(true)} className="mt-4 text-[11px] font-bold text-re-orange hover:underline">
                + Request permission
              </button>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-50 border-b border-black/5">
                      {['Type', 'Period', 'Days', 'Reason', 'Status', 'Submitted', 'Actions'].map((h) => (
                        <th key={h} className="px-4 py-3 text-[9px] font-bold uppercase tracking-[0.15em] text-slate-400 whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black/5">
                    {paginated.map((r) => {
                      const days = permissionDays(r.start_date, r.end_date);
                      return (
                        <tr key={r.id} className="hover:bg-re-bg/30 transition-colors">
                          <td className="px-4 py-3">
                            <p className="text-xs font-bold text-re-text">{typeLabel(r.permission_type)}</p>
                            <p className="text-[9px] text-slate-400">#{r.id}</p>
                          </td>
                          <td className="px-4 py-3 text-[11px] font-bold text-slate-600 whitespace-nowrap">
                            {fmtDate(r.start_date)} → {fmtDate(r.end_date)}
                          </td>
                          <td className="px-4 py-3 text-xs font-bold text-slate-700">
                            <span className="inline-flex items-center gap-1"><Clock size={11} /> {days}</span>
                          </td>
                          <td className="px-4 py-3 text-[11px] text-slate-600 max-w-[220px]">
                            <p className="truncate">{r.reason || '—'}</p>
                            {r.decision_note && (
                              <p className="text-[9px] text-indigo-600 italic mt-0.5 truncate">Manager: {r.decision_note}</p>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-block text-[10px] font-bold px-2.5 py-1 rounded-full border capitalize ${STATUS_BADGE[r.status] || STATUS_BADGE.pending}`}>
                              {r.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-[10px] font-bold text-slate-500 whitespace-nowrap">
                            {fmtDate(r.created_at)}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                title="View"
                                onClick={() => setViewPerm(r)}
                                className="h-7 w-7 rounded-lg border border-blue-200 flex items-center justify-center text-blue-400 hover:bg-blue-50 hover:text-blue-600 transition-all"
                              >
                                <Eye size={12} />
                              </button>
                              {r.status === 'pending' && (
                                <button
                                  type="button"
                                  title="Cancel"
                                  onClick={() => cancelPerm(r.id)}
                                  className="h-7 w-7 rounded-lg border border-red-200 flex items-center justify-center text-red-400 hover:bg-red-50 hover:text-red-600 transition-all"
                                >
                                  <Trash2 size={12} />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <TablePagination
                page={page}
                totalPages={totalPages}
                total={filtered.length}
                pageSize={rowsPerPage}
                itemCount={paginated.length}
                pageStartIndex={(page - 1) * rowsPerPage}
                onPageChange={setPage}
                onPageSizeChange={(n) => { setRowsPerPage(n); setPage(1); }}
              />
            </>
          )}
        </div>
      </div>

      <PermissionRequestModal
        open={modal}
        onClose={() => setModal(false)}
        teacherName={teacherName}
        teacherMeta={teacherMeta}
        onSubmit={createPerm}
      />

      {viewPerm && createPortal(
        <div className="fixed inset-0 z-[230] flex items-end sm:items-center justify-center bg-[#08111F]/60 backdrop-blur-md p-0 sm:p-4 animate-in fade-in duration-200" onClick={() => setViewPerm(null)}>
          <div className="bg-white w-full sm:max-w-lg rounded-t-[28px] sm:rounded-[28px] shadow-[0_20px_70px_-10px_rgba(0,0,0,0.3)] overflow-hidden animate-in slide-in-from-bottom-6 duration-400" onClick={(e) => e.stopPropagation()}>
            <div className={`p-5 ${viewPerm.status === 'approved' ? 'bg-gradient-to-br from-emerald-600 to-emerald-800' : viewPerm.status === 'rejected' ? 'bg-gradient-to-br from-red-600 to-red-800' : 'bg-[linear-gradient(135deg,#FF8C00,#FF5E00)]'}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-[14px] bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20">
                    <Shield size={18} className="text-white" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Permission Details</h3>
                    <p className="text-[10px] text-white/60 mt-0.5">#{viewPerm.id} · {viewPerm.status?.toUpperCase()}</p>
                  </div>
                </div>
                <button type="button" onClick={() => setViewPerm(null)} className="p-2 bg-white/10 hover:bg-white/20 rounded-xl text-white/70 hover:text-white transition-all">
                  <X size={16} />
                </button>
              </div>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-re-bg rounded-xl p-3">
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Type</p>
                  <p className="text-xs font-bold text-slate-800 mt-1">{typeLabel(viewPerm.permission_type)}</p>
                </div>
                <div className="bg-re-bg rounded-xl p-3">
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Status</p>
                  <p className="mt-1">
                    <span className={`inline-block text-[10px] font-bold px-2.5 py-1 rounded-full border capitalize ${STATUS_BADGE[viewPerm.status] || STATUS_BADGE.pending}`}>
                      {viewPerm.status}
                    </span>
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-re-bg rounded-xl p-3">
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Start</p>
                  <p className="text-xs font-bold text-slate-800 mt-1 flex items-center gap-1"><Calendar size={11} /> {fmtDate(viewPerm.start_date)}</p>
                </div>
                <div className="bg-re-bg rounded-xl p-3">
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">End</p>
                  <p className="text-xs font-bold text-slate-800 mt-1 flex items-center gap-1"><Calendar size={11} /> {fmtDate(viewPerm.end_date)}</p>
                </div>
                <div className="bg-re-bg rounded-xl p-3">
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Days</p>
                  <p className="text-xs font-bold text-slate-800 mt-1 flex items-center gap-1">
                    <Clock size={11} /> {permissionDays(viewPerm.start_date, viewPerm.end_date)}
                  </p>
                </div>
              </div>
              {viewPerm.reason && (
                <div className="bg-re-bg rounded-xl p-3">
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Reason</p>
                  <p className="text-xs text-slate-700 mt-1 whitespace-pre-wrap">{viewPerm.reason}</p>
                </div>
              )}
              {viewPerm.decision_note && (
                <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-3">
                  <p className="text-[9px] font-bold text-indigo-400 uppercase tracking-widest">Manager Decision Note</p>
                  <p className="text-xs text-indigo-700 mt-1 italic whitespace-pre-wrap">{viewPerm.decision_note}</p>
                </div>
              )}
              {viewPerm.created_at && (
                <p className="text-[9px] text-slate-400 text-right">Submitted: {fmtDate(viewPerm.created_at)}</p>
              )}
            </div>
            <div className="p-4 bg-re-bg border-t border-black/5 flex justify-end">
              <button type="button" onClick={() => setViewPerm(null)} className="h-10 px-6 rounded-xl bg-white border border-black/5 text-slate-600 font-bold text-[11px] hover:bg-slate-50 transition-all">Close</button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
