import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Search,
  CalendarRange,
  Clock3,
  GraduationCap,
  BookOpen,
  UserCheck,
  UserMinus,
  DoorOpen,
  ClipboardList,
  ArrowLeft,
} from 'lucide-react';
import api from '../services/api';
import StorekeeperOchreHero from '../components/StorekeeperOchreHero';
import { h } from '../utils/href';

function fmtTime(v) {
  if (!v) return '—';
  return new Date(v).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

function fmtDate(v) {
  if (!v) return '—';
  const s = String(v).slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const [y, m, d] = s.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: '2-digit' });
  }
  return new Date(v).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: '2-digit' });
}

function toISODate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

const DATE_PRESETS = [
  { id: 'today', label: 'Today' },
  { id: 'yesterday', label: 'Yesterday' },
  { id: 'last7', label: 'Last 7 days' },
  { id: 'last30', label: 'Last 30 days' },
  { id: 'custom', label: 'Custom range' },
];

function presetRange(presetId) {
  const today = startOfToday();
  if (presetId === 'today') {
    const iso = toISODate(today);
    return { from_date: iso, to_date: iso };
  }
  if (presetId === 'yesterday') {
    const y = new Date(today);
    y.setDate(y.getDate() - 1);
    const iso = toISODate(y);
    return { from_date: iso, to_date: iso };
  }
  if (presetId === 'last7') {
    const from = new Date(today);
    from.setDate(from.getDate() - 6);
    return { from_date: toISODate(from), to_date: toISODate(today) };
  }
  if (presetId === 'last30') {
    const from = new Date(today);
    from.setDate(from.getDate() - 29);
    return { from_date: toISODate(from), to_date: toISODate(today) };
  }
  return { from_date: '', to_date: '' };
}

export default function AllGateLogsReports() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState({
    students_entered: 0,
    students_exited: 0,
    late_arrivals: 0,
    school_days: 0,
  });
  const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0, total_pages: 1 });
  const [academicYears, setAcademicYears] = useState([]);
  const [terms, setTerms] = useState([]);
  const [datePreset, setDatePreset] = useState('yesterday');
  const [specificDate, setSpecificDate] = useState('');
  const [filters, setFilters] = useState({
    from_date: '',
    to_date: '',
    role: 'STUDENT',
    session: 'all',
    search: '',
    term: 'ALL',
    academic_year: 'ALL',
  });

  const query = useMemo(() => {
    const p = { page: pagination.page, limit: pagination.limit, ...filters };
    if (p.term === 'ALL') delete p.term;
    if (p.academic_year === 'ALL') delete p.academic_year;
    if (!p.search) delete p.search;
    if (!p.from_date) delete p.from_date;
    if (!p.to_date) delete p.to_date;
    return p;
  }, [filters, pagination.page, pagination.limit]);

  const loadFilterOptions = async () => {
    try {
      const res = await api.get('/gate/attendance/filter-options');
      if (res?.data?.success) {
        const data = res.data.data || {};
        setAcademicYears(Array.isArray(data.academic_years) ? data.academic_years : []);
        setTerms(Array.isArray(data.terms) ? data.terms : []);
      }
    } catch (_) {
      // Page still works with date filters only
    }
  };

  const loadLogs = async () => {
    try {
      setLoading(true);
      const res = await api.get('/gate/attendance/logs', { params: query });
      if (res?.data?.success) {
        setRows(res.data.data || []);
        setSummary(res.data.summary || {
          students_entered: 0,
          students_exited: 0,
          late_arrivals: 0,
          school_days: 0,
        });
        setPagination((prev) => ({ ...prev, ...(res.data.pagination || prev) }));
      }
    } catch (error) {
      console.error('Failed to load gate logs reports:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFilterOptions();
    const initial = presetRange('yesterday');
    setFilters((prev) => ({ ...prev, ...initial }));
  }, []);

  useEffect(() => {
    loadLogs();
  }, [query]);

  const applyDatePreset = (presetId) => {
    setDatePreset(presetId);
    setSpecificDate('');
    if (presetId === 'custom') return;
    const range = presetRange(presetId);
    setFilters((prev) => ({ ...prev, ...range }));
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const applySpecificDate = (value) => {
    setSpecificDate(value);
    setDatePreset('specific');
    if (!value) return;
    setFilters((prev) => ({ ...prev, from_date: value, to_date: value }));
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const setFilter = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPagination((prev) => ({ ...prev, page: 1 }));
    if (key === 'from_date' || key === 'to_date') setDatePreset('custom');
  };

  const rangeLabel = useMemo(() => {
    if (filters.from_date && filters.to_date && filters.from_date === filters.to_date) {
      return fmtDate(filters.from_date);
    }
    if (filters.from_date && filters.to_date) {
      return `${fmtDate(filters.from_date)} – ${fmtDate(filters.to_date)}`;
    }
    if (filters.from_date) return `From ${fmtDate(filters.from_date)}`;
    if (filters.to_date) return `Until ${fmtDate(filters.to_date)}`;
    return 'All dates';
  }, [filters.from_date, filters.to_date]);

  return (
    <div className="space-y-6">
      <StorekeeperOchreHero
        eyebrow="Gate reports"
        titleLine="Student"
        titleAccent="Arrival Logs"
        subtitle="See how many students entered school by day, week, term, or academic year — for meal and stock planning."
        icon={ClipboardList}
        rightSlot={
          <Link
            to={h('/gate-attendance')}
            className="inline-flex items-center gap-2 rounded-xl border border-white/25 bg-white/10 px-4 py-2.5 text-sm font-bold text-white hover:bg-white/15 transition-colors"
          >
            <ArrowLeft size={16} />
            Live gate
          </Link>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 -mt-8 relative z-10 px-1">
        {[
          { label: 'Students entered', value: summary.students_entered, icon: UserCheck, tone: 'text-emerald-700 bg-emerald-50 border-emerald-100' },
          { label: 'Students exited', value: summary.students_exited, icon: UserMinus, tone: 'text-sky-700 bg-sky-50 border-sky-100' },
          { label: 'Late arrivals', value: summary.late_arrivals, icon: Clock3, tone: 'text-amber-700 bg-amber-50 border-amber-100' },
          { label: 'School days in range', value: summary.school_days, icon: DoorOpen, tone: 'text-slate-700 bg-slate-50 border-slate-200' },
        ].map((card) => (
          <div key={card.label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <card.icon size={16} className={card.tone.split(' ')[0]} />
            <div className="mt-2 text-3xl font-black text-slate-900">{card.value}</div>
            <div className="mt-1 text-[11px] font-semibold uppercase tracking-widest text-slate-500">{card.label}</div>
            <p className="mt-1 text-[10px] text-slate-400">{rangeLabel}</p>
          </div>
        ))}
      </div>

      <div className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">All arrival logs</h2>
            <p className="text-xs font-semibold text-slate-500">
              Filter by quick period, specific date, academic year, or term.
            </p>
          </div>
          <div className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-700">
            {pagination.total} log rows
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {DATE_PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => applyDatePreset(p.id)}
              className={`rounded-xl px-3 py-2 text-xs font-bold transition-colors ${
                datePreset === p.id
                  ? 'bg-[#c87800] text-white shadow-sm'
                  : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="rounded-xl border border-slate-200 bg-white p-2">
            <span className="mb-1 inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
              <CalendarRange size={12} />
              Specific date
            </span>
            <input
              type="date"
              value={specificDate}
              onChange={(e) => applySpecificDate(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-2 py-2 text-xs font-bold text-slate-800 outline-none focus:border-[#c87800]"
            />
          </label>
          <label className="rounded-xl border border-slate-200 bg-white p-2">
            <span className="mb-1 inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
              <CalendarRange size={12} />
              From date
            </span>
            <input
              type="date"
              value={filters.from_date}
              onChange={(e) => setFilter('from_date', e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-2 py-2 text-xs font-bold text-slate-800 outline-none focus:border-[#c87800]"
            />
          </label>
          <label className="rounded-xl border border-slate-200 bg-white p-2">
            <span className="mb-1 inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
              <CalendarRange size={12} />
              To date
            </span>
            <input
              type="date"
              value={filters.to_date}
              onChange={(e) => setFilter('to_date', e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-2 py-2 text-xs font-bold text-slate-800 outline-none focus:border-[#c87800]"
            />
          </label>
          <label className="rounded-xl border border-slate-200 bg-white p-2">
            <span className="mb-1 inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
              <Clock3 size={12} />
              Session
            </span>
            <select
              value={filters.session}
              onChange={(e) => setFilter('session', e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-2 py-2 text-xs font-bold text-slate-800 outline-none focus:border-[#c87800]"
            >
              <option value="all">All sessions</option>
              <option value="morning_only">Morning entry only</option>
              <option value="evening_only">Evening exit only</option>
              <option value="both">Both sessions</option>
            </select>
          </label>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <label className="rounded-xl border border-slate-200 bg-white p-2 lg:col-span-1">
            <span className="mb-1 inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
              <Search size={12} />
              Search
            </span>
            <input
              value={filters.search}
              onChange={(e) => setFilter('search', e.target.value)}
              placeholder="Name, card UID, student ID…"
              className="w-full rounded-lg border border-slate-200 px-2 py-2 text-xs font-bold text-slate-800 outline-none placeholder:text-slate-400 focus:border-[#c87800]"
            />
          </label>
          <label className="rounded-xl border border-slate-200 bg-white p-2">
            <span className="mb-1 inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
              <GraduationCap size={12} />
              Academic year
            </span>
            <select
              value={filters.academic_year}
              onChange={(e) => setFilter('academic_year', e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-2 py-2 text-xs font-bold text-slate-800 outline-none focus:border-[#c87800]"
            >
              <option value="ALL">All years</option>
              {academicYears.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </label>
          <label className="rounded-xl border border-slate-200 bg-white p-2">
            <span className="mb-1 inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
              <BookOpen size={12} />
              Term
            </span>
            <select
              value={filters.term}
              onChange={(e) => setFilter('term', e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-2 py-2 text-xs font-bold text-slate-800 outline-none focus:border-[#c87800]"
            >
              <option value="ALL">All terms</option>
              {terms.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200">
          <div className="overflow-x-auto">
            <table className="min-w-[900px] w-full">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  {['Date', 'Name', 'Student ID', 'Card UID', 'Morning', 'Evening', 'Status', 'Term', 'Year'].map((col) => (
                    <th
                      key={col}
                      className="px-3 py-3 text-left text-[10px] font-semibold uppercase tracking-widest text-slate-600"
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr>
                    <td colSpan={9} className="px-4 py-16 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-8 h-8 rounded-xl border-2 border-[#c87800] border-t-transparent animate-spin" />
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Loading logs…</p>
                      </div>
                    </td>
                  </tr>
                )}
                {!loading && rows.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-4 py-16 text-center text-sm font-semibold text-slate-500">
                      No student gate logs for the selected filters.
                    </td>
                  </tr>
                )}
                {!loading &&
                  rows.map((r) => {
                    const status = r.evening_check_out
                      ? 'Left school'
                      : r.morning_check_in
                        ? 'In school'
                        : 'No entry';
                    const statusClass = r.evening_check_out
                      ? 'bg-slate-800 text-white'
                      : r.morning_check_in
                        ? 'bg-sky-100 text-sky-700'
                        : 'bg-slate-100 text-slate-500';
                    const late = String(r.morning_status || '').toLowerCase() === 'late';
                    return (
                      <tr key={r.id} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="px-3 py-2 text-xs font-semibold text-slate-700">{fmtDate(r.attendance_date)}</td>
                        <td className="px-3 py-2 text-xs font-semibold text-slate-900">{r.person_name}</td>
                        <td className="px-3 py-2 text-xs font-semibold text-slate-600">{r.person_ref || '—'}</td>
                        <td className="px-3 py-2 text-xs font-mono font-bold text-[#c87800]">{r.card_uid}</td>
                        <td className="px-3 py-2 text-xs font-mono font-bold text-emerald-700">
                          {fmtTime(r.morning_check_in)}
                          {late && <span className="ml-1 text-[10px] font-black text-amber-600">LATE</span>}
                        </td>
                        <td className="px-3 py-2 text-xs font-mono font-bold text-sky-700">{fmtTime(r.evening_check_out)}</td>
                        <td className="px-3 py-2">
                          <span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${statusClass}`}>{status}</span>
                        </td>
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
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 disabled:opacity-40"
            >
              Previous
            </button>
            <button
              type="button"
              disabled={pagination.page >= pagination.total_pages || loading}
              onClick={() => setPagination((p) => ({ ...p, page: p.page + 1 }))}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
