import React, { useEffect, useMemo, useState } from 'react';
import { Search, Filter, CalendarRange, ShieldCheck, Clock3, GraduationCap, BookOpen } from 'lucide-react';
import api from '../../services/api';

function fmtTime(v) {
  if (!v) return '—';
  return new Date(v).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

function fmtDate(v) {
  if (!v) return '—';
  return new Date(v).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: '2-digit' });
}

export default function AllGateLogs() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0, total_pages: 1 });
  const [academicYears, setAcademicYears] = useState([]);
  const [terms, setTerms] = useState([]);
  const [filters, setFilters] = useState({
    from_date: '',
    to_date: '',
    role: 'ALL',
    session: 'all',
    search: '',
    term: 'ALL',
    academic_year: 'ALL',
  });

  const query = useMemo(() => {
    const p = {
      page: pagination.page,
      limit: pagination.limit,
      ...filters,
    };
    if (p.role === 'ALL') delete p.role;
    if (p.term === 'ALL') delete p.term;
    if (p.academic_year === 'ALL') delete p.academic_year;
    if (!p.search) delete p.search;
    if (!p.from_date) delete p.from_date;
    if (!p.to_date) delete p.to_date;
    return p;
  }, [filters, pagination.page, pagination.limit]);

  const loadLogs = async () => {
    try {
      setLoading(true);
      const res = await api.get('/gate/attendance/logs', { params: query });
      if (res?.data?.success) {
        setRows(res.data.data || []);
        setPagination((prev) => ({ ...prev, ...(res.data.pagination || prev) }));
      }
    } catch (error) {
      console.error('Failed to load all gate logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAcademicOptions = async () => {
    try {
      const res = await api.get('/dos/academic-calendar-settings');
      if (res?.data?.success) {
        const y = String(res.data.data?.current_academic_year || '').trim();
        const t = Array.isArray(res.data.data?.active_terms) ? res.data.data.active_terms : [];
        setAcademicYears(y ? [y] : []);
        setTerms(t);
      }
    } catch (_) {
      // Optional helper filters; keep page usable even if this fails
    }
  };

  useEffect(() => {
    loadAcademicOptions();
  }, []);

  useEffect(() => {
    loadLogs();
  }, [query]);

  const setFilter = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  return (
    <div className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-black text-slate-900">All Gate Logs</h2>
          <p className="text-xs font-semibold text-slate-500">Full attendance history with advanced filters.</p>
        </div>
        <div className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-700">
          {pagination.total} records
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="rounded-xl border border-slate-200 bg-white p-2">
          <span className="mb-1 inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-slate-500"><CalendarRange size={12} />From Date</span>
          <input type="date" value={filters.from_date} onChange={(e) => setFilter('from_date', e.target.value)} className="w-full rounded-lg border border-slate-200 px-2 py-2 text-xs font-bold text-slate-800 outline-none focus:border-amber-500" />
        </label>
        <label className="rounded-xl border border-slate-200 bg-white p-2">
          <span className="mb-1 inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-slate-500"><CalendarRange size={12} />To Date</span>
          <input type="date" value={filters.to_date} onChange={(e) => setFilter('to_date', e.target.value)} className="w-full rounded-lg border border-slate-200 px-2 py-2 text-xs font-bold text-slate-800 outline-none focus:border-amber-500" />
        </label>
        <label className="rounded-xl border border-slate-200 bg-white p-2">
          <span className="mb-1 inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-slate-500"><ShieldCheck size={12} />Role</span>
          <select value={filters.role} onChange={(e) => setFilter('role', e.target.value)} className="w-full rounded-lg border border-slate-200 px-2 py-2 text-xs font-bold text-slate-800 outline-none focus:border-amber-500">
            <option value="ALL">All Roles</option>
            <option value="STUDENT">Student</option>
            <option value="STAFF">Staff</option>
          </select>
        </label>
        <label className="rounded-xl border border-slate-200 bg-white p-2">
          <span className="mb-1 inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-slate-500"><Clock3 size={12} />Session</span>
          <select value={filters.session} onChange={(e) => setFilter('session', e.target.value)} className="w-full rounded-lg border border-slate-200 px-2 py-2 text-xs font-bold text-slate-800 outline-none focus:border-amber-500">
            <option value="all">All Sessions</option>
            <option value="morning_only">Morning Only</option>
            <option value="evening_only">Evening Only</option>
            <option value="both">Both Sessions</option>
          </select>
        </label>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="rounded-xl border border-slate-200 bg-white p-2 lg:col-span-2">
          <span className="mb-1 inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-slate-500"><Search size={12} />Search</span>
          <input value={filters.search} onChange={(e) => setFilter('search', e.target.value)} placeholder="Name, card UID, ref ID..." className="w-full rounded-lg border border-slate-200 px-2 py-2 text-xs font-bold text-slate-800 outline-none placeholder:text-slate-400 focus:border-amber-500" />
        </label>
        <label className="rounded-xl border border-slate-200 bg-white p-2">
          <span className="mb-1 inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-slate-500"><GraduationCap size={12} />Academic Year</span>
          <select value={filters.academic_year} onChange={(e) => setFilter('academic_year', e.target.value)} className="w-full rounded-lg border border-slate-200 px-2 py-2 text-xs font-bold text-slate-800 outline-none focus:border-amber-500">
            <option value="ALL">All Years</option>
            {academicYears.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </label>
        <label className="rounded-xl border border-slate-200 bg-white p-2">
          <span className="mb-1 inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-slate-500"><BookOpen size={12} />Term</span>
          <select value={filters.term} onChange={(e) => setFilter('term', e.target.value)} className="w-full rounded-lg border border-slate-200 px-2 py-2 text-xs font-bold text-slate-800 outline-none focus:border-amber-500">
            <option value="ALL">All Terms</option>
            {terms.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </label>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200">
        <div className="overflow-x-auto">
          <table className="min-w-[980px] w-full">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                {['Date', 'Name', 'Role', 'Card UID', 'Ref ID', 'Morning', 'Evening', 'Status', 'Term', 'Academic Year'].map((h) => (
                  <th key={h} className="px-3 py-3 text-left text-[10px] font-black uppercase tracking-widest text-slate-600">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {!loading && rows.length === 0 && (
                <tr><td colSpan={10} className="px-4 py-16 text-center text-sm font-semibold text-slate-500">No logs found for current filters.</td></tr>
              )}
              {rows.map((r) => {
                const status = r.evening_check_out ? 'Out of School' : r.morning_check_in ? 'In School' : 'No Entry';
                const statusClass = r.evening_check_out ? 'bg-slate-900 text-white' : r.morning_check_in ? 'bg-sky-100 text-sky-700' : 'bg-slate-100 text-slate-500';
                return (
                  <tr key={r.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-3 py-2 text-xs font-semibold text-slate-700">{fmtDate(r.attendance_date)}</td>
                    <td className="px-3 py-2 text-xs font-black text-slate-900">{r.person_name}</td>
                    <td className="px-3 py-2 text-xs font-bold text-slate-700">{String(r.person_type || '').toUpperCase()}</td>
                    <td className="px-3 py-2 text-xs font-mono font-bold text-amber-600">{r.card_uid}</td>
                    <td className="px-3 py-2 text-xs font-semibold text-slate-600">{r.person_ref || '—'}</td>
                    <td className="px-3 py-2 text-xs font-mono font-bold text-emerald-700">{fmtTime(r.morning_check_in)}</td>
                    <td className="px-3 py-2 text-xs font-mono font-bold text-sky-700">{fmtTime(r.evening_check_out)}</td>
                    <td className="px-3 py-2"><span className={`rounded-full px-2 py-1 text-[10px] font-black ${statusClass}`}>{status}</span></td>
                    <td className="px-3 py-2 text-xs font-semibold text-slate-700">{r.term || '—'}</td>
                    <td className="px-3 py-2 text-xs font-semibold text-slate-700">{r.academic_year || '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-xs font-semibold text-slate-500">
          Page {pagination.page} of {pagination.total_pages}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={pagination.page <= 1 || loading}
            onClick={() => setPagination((p) => ({ ...p, page: p.page - 1 }))}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-black text-slate-700 disabled:opacity-40"
          >
            Previous
          </button>
          <button
            type="button"
            disabled={pagination.page >= pagination.total_pages || loading}
            onClick={() => setPagination((p) => ({ ...p, page: p.page + 1 }))}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-black text-slate-700 disabled:opacity-40"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
