import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import api from '../../services/api';

const STATUS_CYCLE = ['Present', 'Absent', 'Late', 'Excused'];

const STATUS_CONFIG = {
  NotMarked: {
    label: 'Not Marked',
    icon: '—',
    bg: 'bg-white',
    text: 'text-slate-500',
    border: 'border-slate-300',
    dot: 'bg-slate-400',
    badge: 'bg-slate-100 text-slate-700',
    ring: 'ring-slate-300',
    pill: 'bg-slate-400',
  },
  Present: {
    label: 'Present',
    icon: '✓',
    bg: 'bg-white',
    text: 'text-slate-900',
    border: 'border-slate-900',
    dot: 'bg-slate-900',
    badge: 'bg-slate-900 text-white',
    ring: 'ring-slate-400',
    pill: 'bg-slate-900',
  },
  Absent: {
    label: 'Absent',
    icon: '✕',
    bg: 'bg-amber-50',
    text: 'text-amber-800',
    border: 'border-amber-500',
    dot: 'bg-amber-600',
    badge: 'bg-amber-100 text-amber-800',
    ring: 'ring-amber-400',
    pill: 'bg-amber-500',
  },
  Late: {
    label: 'Late',
    icon: '⏰',
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    border: 'border-amber-300',
    dot: 'bg-amber-400',
    badge: 'bg-amber-100 text-amber-700',
    ring: 'ring-amber-400',
    pill: 'bg-amber-400',
  },
  Excused: {
    label: 'Excused',
    icon: '◆',
    bg: 'bg-white',
    text: 'text-slate-700',
    border: 'border-slate-500',
    dot: 'bg-slate-500',
    badge: 'bg-slate-100 text-slate-700',
    ring: 'ring-slate-400',
    pill: 'bg-slate-500',
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function currentPeriodFromTime(periods) {
  const now = new Date();
  const nowMins = now.getHours() * 60 + now.getMinutes();
  for (const p of periods) {
    const [sh, sm] = String(p.start_time || '00:00').split(':').map(Number);
    const [eh, em] = String(p.end_time || '00:00').split(':').map(Number);
    if (nowMins >= sh * 60 + sm && nowMins <= eh * 60 + em) return p.period;
  }
  return '';
}

function formatDate(dateStr) {
  return new Date(`${dateStr}T12:00:00`).toLocaleDateString('en-US', {
    weekday: 'long', day: '2-digit', month: 'short', year: 'numeric',
  });
}

function formatPeriodLabel(periodCode) {
  const m = String(periodCode || '').trim().match(/^P(\d+)$/i);
  if (!m) return String(periodCode || '');
  return `Period ${m[1]}`;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusCell({ status, isCurrentPeriod }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.Present;
  return (
    <div
      title={status}
      className={`
        group relative flex h-9 w-9 items-center justify-center rounded-xl border-2 font-black text-sm
        transition-all duration-150 select-none
        ${cfg.bg} ${cfg.text} ${cfg.border}
        ${cfg.ring}
        ${isCurrentPeriod ? 'shadow-md' : ''}
      `}
    >
      {cfg.icon}
      <span className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-gray-900 px-2 py-1 text-[10px] font-semibold text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100 z-50">
        {status}
      </span>
    </div>
  );
}

function StatCard({ label, value, sub, color }) {
  const tones = {
    navy: 'text-slate-900 border-slate-300',
    amber: 'text-amber-700 border-amber-300',
    neutral: 'text-slate-700 border-slate-200',
  };
  return (
    <div className={`rounded-2xl border bg-white p-4 shadow-sm ${tones[color] || tones.neutral}`}>
      <div className="text-2xl sm:text-3xl font-black tracking-tight">{value}</div>
      <div className="mt-1 text-[10px] sm:text-xs font-black uppercase tracking-widest">{label}</div>
      {sub && <div className="mt-0.5 text-[10px] sm:text-[11px] font-semibold opacity-70">{sub}</div>}
    </div>
  );
}

function RateBar({ rate }) {
  const color = rate >= 85 ? 'bg-slate-900' : 'bg-amber-500';
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 w-20 overflow-hidden rounded-full bg-gray-100">
        <div
          className={`h-full rounded-full transition-all duration-700 ${color}`}
          style={{ width: `${rate}%` }}
        />
      </div>
      <span className={`text-xs font-black ${rate >= 85 ? 'text-slate-900' : 'text-amber-700'}`}>
        {rate}%
      </span>
    </div>
  );
}

function PulseIndicator() {
  return (
    <span className="relative inline-flex h-2 w-2">
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
      <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-500" />
    </span>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function ClassAttendance() {
  const [meta, setMeta] = useState({ classes: [], timetableClasses: [], studentClasses: [], terms: [], years: [] });
  const [filters, setFilters] = useState({
    class_name:    '',
    term:          '',
    academic_year: '',
    date:          new Date().toISOString().slice(0, 10),
  });
  const [periods, setPeriods] = useState([]);
  const [rows, setRows] = useState([]);
  const [statuses, setStatuses] = useState({});
  const [remarks,  setRemarks]  = useState({});
  const [loading,  setLoading]  = useState(false);
  const [periodFilter, setPeriodFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [search, setSearch]             = useState('');
  const [lastSaved, setLastSaved]         = useState(null);
  const [activeStudentRow, setActiveStudentRow] = useState(null);
  const refreshTimerRef = useRef(null);
  const [timetableMode, setTimetableMode] = useState('exact_day');
  const classOptions = useMemo(() => {
    const base = (meta.classes || []).filter(Boolean);
    return Array.from(new Set(base.map((c) => String(c).trim()).filter(Boolean)));
  }, [meta.classes]);

  const syncStatusesFromRows = useCallback((roster, lessonPeriods) => {
    const nextStatuses = {};
    lessonPeriods.forEach((p) => {
      nextStatuses[p.period] = {};
    });
    roster.forEach((r) => {
      lessonPeriods.forEach((p) => {
        nextStatuses[p.period][r.student_id] = r.period_statuses?.[p.period] || 'NotMarked';
      });
    });
    setStatuses(nextStatuses);
    const nextRemarks = {};
    roster.forEach((r) => { nextRemarks[r.student_id] = r.remarks || ''; });
    setRemarks(nextRemarks);
  }, []);

  const loadMeta = useCallback(async () => {
    const res = await api.get('/teacher-portal/attendance-module/meta');
    if (!res.data?.success) return;
    const data = res.data.data || {};
    setMeta(data);
    const safeClasses = Array.from(
      new Set(((data.classes || []).map((c) => String(c || '').trim()).filter(Boolean)))
    );
    setFilters((f) => ({
      ...f,
      class_name: safeClasses.includes(f.class_name) ? f.class_name : (safeClasses[0] || ''),
      term: f.term || data.terms?.[0] || 'Term 1',
      academic_year: f.academic_year || data.years?.[0] || '2025-2026',
    }));
  }, []);

  const loadData = useCallback(async ({ silent = false } = {}) => {
    if (!filters.class_name || !filters.term || !filters.academic_year) return;
    if (!silent) setLoading(true);
    try {
      const res = await api.get('/teacher-portal/attendance-module/class-period', { params: filters });
      if (res.data?.success) {
        const lessonPeriods = res.data.data?.periods || [];
        const roster = res.data.data?.roster || [];
        setTimetableMode(res.data.data?.timetable_mode || 'exact_day');
        setPeriods(lessonPeriods);
        setRows(roster);
        syncStatusesFromRows(roster, lessonPeriods);
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, [filters, syncStatusesFromRows]);

  useEffect(() => {
    loadMeta();
  }, [loadMeta]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Real-time refresh from backend
  useEffect(() => {
    refreshTimerRef.current = setInterval(() => {
      loadData({ silent: true });
    }, 15000);
    return () => clearInterval(refreshTimerRef.current);
  }, [loadData]);

  const currentPeriod = useMemo(() => currentPeriodFromTime(periods), [periods]);

  // Derived data
  const periodSummary = useMemo(() => {
    const total = rows.length || 1;
    return periods.map(p => {
      const counts = { Present: 0, Absent: 0, Late: 0, Excused: 0, NotMarked: 0 };
      rows.forEach(s => {
        const st = statuses[p.period]?.[s.student_id] || 'NotMarked';
        if (counts[st] !== undefined) counts[st]++;
      });
      return { ...p, ...counts, rate: Math.round((counts.Present / total) * 100) };
    });
  }, [periods, statuses, rows]);

  const displayedPeriods = useMemo(
    () => (periodFilter === 'ALL' ? periods : periods.filter((p) => p.period === periodFilter)),
    [periods, periodFilter]
  );

  const filteredStudents = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter(s => {
      if (q && !s.student_name.toLowerCase().includes(q) && !s.student_uid.toLowerCase().includes(q)) return false;
      if (statusFilter === 'ALL') return true;
      const checkPeriods = displayedPeriods;
      return checkPeriods.some(p => (statuses[p.period]?.[s.student_id] || 'NotMarked') === statusFilter);
    });
  }, [search, statusFilter, displayedPeriods, rows, statuses]);

  const overallPresent = useMemo(() => {
    let total = 0, present = 0;
    periods.forEach(p => {
      rows.forEach(s => {
        total++;
        if ((statuses[p.period]?.[s.student_id] || 'NotMarked') === 'Present') present++;
      });
    });
    return total > 0 ? Math.round((present / total) * 100) : 0;
  }, [periods, statuses, rows]);

  const absentCount = useMemo(() => {
    return rows.filter(s =>
      periods.some(p => (statuses[p.period]?.[s.student_id] || 'NotMarked') === 'Absent')
    ).length;
  }, [periods, statuses, rows]);

  const getStudentPresentCount = (studentId) => {
    return periods.filter(p => (statuses[p.period]?.[studentId] || 'NotMarked') === 'Present').length;
  };

  const displayedPeriodSummary = useMemo(
    () => periodSummary.filter((p) => displayedPeriods.some((dp) => dp.period === p.period)),
    [periodSummary, displayedPeriods]
  );

  useEffect(() => {
    if (periodFilter !== 'ALL' && !periods.some((p) => p.period === periodFilter)) {
      setPeriodFilter('ALL');
    }
  }, [periodFilter, periods]);

  return (
    <div className="min-h-screen bg-white font-sans">
      {/* ── Top Header Bar ── */}
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-screen-2xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 shadow-sm">
              <span className="text-base font-black text-white">A</span>
            </div>
            <div>
              <h1 className="text-sm font-black tracking-tight text-slate-900">Class Attendance</h1>
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Teacher Portal</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-[11px] font-semibold text-slate-500">
            <PulseIndicator />
            <span className="hidden sm:inline">Live · auto-refresh every 15s</span>
            {lastSaved && (
              <span className="hidden sm:inline text-slate-400">· Saved {lastSaved.toLocaleTimeString()}</span>
            )}
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-screen-2xl space-y-5 px-4 py-5 sm:px-6">

        {/* ── Filter Bar ── */}
        <div className="rounded-2xl border border-slate-200 bg-white p-3 sm:p-4 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <div className="h-1.5 w-5 rounded-full bg-slate-900" />
            <span className="text-xs font-black uppercase tracking-widest text-slate-500">Apply Filters</span>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {[
              { key: 'class_name', label: 'Class', options: meta.classes },
              { key: 'term',       label: 'Term',  options: meta.terms },
              { key: 'academic_year', label: 'Year', options: meta.years },
            ].map(({ key, label, options }) => (
              <div key={key} className="flex flex-col gap-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</label>
                <select
                  value={filters[key]}
                  onChange={e => setFilters(f => ({ ...f, [key]: e.target.value }))}
                  className="h-10 w-full rounded-xl border-2 border-slate-100 bg-white px-3 text-xs font-bold text-slate-700 outline-none transition focus:border-slate-700 focus:bg-white"
                >
                  {(key === 'class_name' ? classOptions : options).map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
            ))}
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Date</label>
              <input
                type="date"
                value={filters.date}
                onChange={e => setFilters(f => ({ ...f, date: e.target.value }))}
                className="h-10 w-full rounded-xl border-2 border-slate-100 bg-white px-3 text-xs font-bold text-slate-700 outline-none transition focus:border-slate-700 focus:bg-white"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Mode</label>
              <div className="flex h-10 w-full items-center rounded-xl border-2 border-slate-100 bg-white px-3 text-xs font-black uppercase tracking-widest text-slate-500">
                Report only
              </div>
            </div>
          </div>
        </div>

        {/* ── Context Panel ── */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-900 px-4 py-4 sm:px-5 text-white shadow-sm">
          <div>
            <p className="text-lg font-black tracking-tight">
              Class: {filters.class_name} &nbsp;·&nbsp; {formatDate(filters.date)}
            </p>
            <p className="mt-0.5 text-xs font-semibold opacity-75">
              {filters.term} &nbsp;|&nbsp; {filters.academic_year} &nbsp;|&nbsp; {rows.length} students
              {currentPeriod && (
                <span className="ml-2 rounded-full bg-amber-500/30 px-2 py-0.5 text-[10px] font-black uppercase text-amber-200">
                  Now: {currentPeriod}
                </span>
              )}
            </p>
          </div>
          {loading && (
            <div className="flex items-center gap-2 rounded-xl bg-white/15 px-3 py-1.5 text-xs font-bold">
              <svg className="h-3 w-3 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4A8 8 0 014 12z"/>
              </svg>
              Loading…
            </div>
          )}
        </div>

        {/* ── Stat Cards ── */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-5">
          <StatCard label="Total Students" value={rows.length} color="navy" sub={`${periods.length} periods`} />
          <StatCard label="Overall Present" value={`${overallPresent}%`} color="navy" sub="across all periods" />
          <StatCard label="Absent Students" value={absentCount} color="amber" sub="at least 1 period" />
          <StatCard label="Active Periods" value={periods.length} color="navy" sub={filters.class_name} />
          <StatCard label="Late Today" value={
            rows.filter(s => periods.some(p => (statuses[p.period]?.[s.student_id]) === 'Late')).length
          } color="amber" sub="any period" />
        </div>

        {/* ── Period Summary Table ── */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
            <div className="flex items-center gap-2">
              <div className="h-1.5 w-5 rounded-full bg-slate-900" />
              <span className="text-xs font-black uppercase tracking-widest text-slate-600">Period Summary</span>
            </div>
            <span className="text-[10px] font-bold text-slate-400">
              {displayedPeriodSummary.length} periods loaded
              {timetableMode !== 'exact_day' ? ` · mode: ${timetableMode.replaceAll('_', ' ')}` : ''}
            </span>
          </div>
          {!displayedPeriodSummary.length && (
            <div className="border-b border-amber-100 bg-amber-50 px-5 py-3 text-xs font-semibold text-amber-800">
              No timetable periods found for class <b>{filters.class_name || '—'}</b> in selected filters.
              {classOptions.length > 0 && classOptions[0] !== filters.class_name && (
                <button
                  type="button"
                  onClick={() => setFilters((f) => ({ ...f, class_name: classOptions[0] }))}
                  className="ml-2 rounded-md border border-amber-300 bg-white px-2 py-1 text-[11px] font-black uppercase tracking-wide text-amber-700"
                >
                  Switch to {classOptions[0]}
                </button>
              )}
            </div>
          )}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px]">
              <thead>
                <tr className="bg-slate-50/80">
                  {['Period', 'Subject', 'Teacher', 'Present', 'Absent', 'Late', 'Excused', 'Rate'].map(h => (
                    <th key={h} className="px-4 py-2.5 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {displayedPeriodSummary.map((r, i) => (
                  <tr key={r.period} className={`border-t border-slate-50 transition hover:bg-slate-50/60 ${currentPeriod === r.period ? 'bg-blue-50/40' : ''}`}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {currentPeriod === r.period && <span className="flex h-1.5 w-1.5 rounded-full bg-amber-500" />}
                        <span className="rounded-lg bg-white border border-slate-200 px-2 py-0.5 text-xs font-black text-slate-800">
                          {formatPeriodLabel(r.period)}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm font-bold text-slate-700">{r.subject}</td>
                    <td className="px-4 py-3 text-xs font-semibold text-slate-500">{r.teacher}</td>
                    <td className="px-4 py-3 text-sm font-black text-slate-900">{r.Present}</td>
                    <td className="px-4 py-3 text-sm font-black text-amber-700">{r.Absent}</td>
                    <td className="px-4 py-3 text-sm font-black text-amber-600">{r.Late}</td>
                    <td className="px-4 py-3 text-sm font-black text-blue-600">{r.Excused}</td>
                    <td className="px-4 py-3"><RateBar rate={r.rate} /></td>
                  </tr>
                ))}
                {!displayedPeriodSummary.length && (
                  <tr>
                    <td colSpan={8} className="px-4 py-10 text-center text-sm font-semibold text-slate-400">
                      No timetable periods found for this class and date.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Filter Controls ── */}
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Filter by Period</label>
            <select
              value={periodFilter}
              onChange={e => setPeriodFilter(e.target.value)}
              className="h-9 rounded-xl border-2 border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 outline-none transition focus:border-slate-700"
            >
              <option value="ALL">All Periods</option>
              {periods.map(p => (
                <option key={p.period} value={p.period}>
                  {formatPeriodLabel(p.period)} — {p.subject}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Filter by Status</label>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="h-9 rounded-xl border-2 border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 outline-none transition focus:border-slate-700"
            >
              <option value="ALL">All Statuses</option>
              <option value="NotMarked">Not Marked</option>
              {STATUS_CYCLE.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1 flex-1 min-w-[180px]">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Search Student</label>
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M16.65 16.65A8 8 0 1116.65 2a8 8 0 010 14.65z" />
              </svg>
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Name or student ID…"
                className="h-9 w-full rounded-xl border-2 border-slate-200 bg-white pl-8 pr-3 text-xs font-bold text-slate-700 outline-none transition focus:border-slate-700"
              />
            </div>
          </div>
        </div>

        {/* ── Legend ── */}
        <div className="flex flex-wrap items-center gap-4 rounded-xl border border-slate-100 bg-white px-4 py-2.5">
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Legend</span>
          {['NotMarked', ...STATUS_CYCLE].map(s => {
            const cfg = STATUS_CONFIG[s];
            return (
              <div key={s} className="flex items-center gap-1.5">
                <div className={`flex h-6 w-6 items-center justify-center rounded-lg border-2 text-xs font-black ${cfg.bg} ${cfg.text} ${cfg.border}`}>{cfg.icon}</div>
                <span className="text-xs font-semibold text-slate-600">{s}</span>
              </div>
            );
          })}
          <span className="ml-auto text-[10px] font-semibold text-slate-400">Read-only attendance report</span>
        </div>

        {/* ── Main Attendance Table ── */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
            <div className="flex items-center gap-2">
              <div className="h-1.5 w-5 rounded-full bg-slate-900" />
              <span className="text-xs font-black uppercase tracking-widest text-slate-600">
                Attendance Register
              </span>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-black text-slate-500">
                {filteredStudents.length} students
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400">
              <PulseIndicator />
              Real-time
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px]">
              <thead>
                <tr className="bg-slate-50/80">
                  <th className="sticky left-0 z-10 bg-slate-50/90 px-4 py-2.5 text-left text-[10px] font-black uppercase tracking-widest text-slate-400 backdrop-blur-sm">
                    #
                  </th>
                  <th className="sticky left-8 z-10 bg-slate-50/90 px-4 py-2.5 text-left text-[10px] font-black uppercase tracking-widest text-slate-400 backdrop-blur-sm min-w-[160px]">
                    Student
                  </th>
                  {displayedPeriods.map(p => (
                    <th key={p.period} className={`px-3 py-2.5 text-center text-[10px] font-black uppercase tracking-widest ${currentPeriod === p.period ? 'text-slate-900' : 'text-slate-400'}`}>
                      <div className="flex flex-col items-center gap-0.5">
                        <span className={`${currentPeriod === p.period ? 'text-slate-900' : ''}`}>
                          {formatPeriodLabel(p.period)}
                        </span>
                        <span className="font-semibold normal-case text-slate-400">{p.subject}</span>
                      </div>
                    </th>
                  ))}
                  <th className="px-4 py-2.5 text-center text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Present
                  </th>
                  <th className="px-4 py-2.5 text-left text-[10px] font-black uppercase tracking-widest text-slate-400 min-w-[140px]">
                    Remarks
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map((s, i) => {
                  const presentCount = getStudentPresentCount(s.student_id);
                  const isActive = activeStudentRow === s.student_id;
                  const denominator = Math.max(1, displayedPeriods.length);
                  const presentInDisplayed = displayedPeriods.filter((p) => (statuses[p.period]?.[s.student_id] || 'NotMarked') === 'Present').length;
                  return (
                    <tr
                      key={s.student_id}
                      className={`border-t border-slate-50 transition-colors ${isActive ? 'bg-amber-50/40' : 'hover:bg-slate-50/60'}`}
                      onClick={() => setActiveStudentRow(isActive ? null : s.student_id)}
                    >
                      <td className="sticky left-0 z-10 bg-inherit px-4 py-2.5 text-[11px] font-bold text-slate-400">
                        {i + 1}
                      </td>
                      <td className="sticky left-8 z-10 bg-inherit px-4 py-2.5">
                        <div>
                          <p className="text-sm font-bold text-slate-800">{s.student_name}</p>
                          <p className="text-[10px] font-semibold text-slate-400">{s.student_id}</p>
                        </div>
                      </td>
                      {displayedPeriods.map(p => (
                        <td key={p.period} className="px-3 py-2.5 text-center" onClick={e => e.stopPropagation()}>
                          <div className="flex justify-center">
                            <StatusCell
                              status={statuses[p.period]?.[s.student_id] || 'NotMarked'}
                              isCurrentPeriod={currentPeriod === p.period}
                            />
                          </div>
                        </td>
                      ))}
                      <td className="px-4 py-2.5 text-center" onClick={e => e.stopPropagation()}>
                        <span className={`rounded-full px-2 py-0.5 text-xs font-black ${
                          presentCount === periods.length ? 'bg-slate-900 text-white'
                          : presentCount === 0 ? 'bg-amber-100 text-amber-800'
                          : 'bg-amber-100 text-amber-700'
                        }`}>
                          {presentInDisplayed}/{denominator}
                        </span>
                      </td>
                      <td className="px-4 py-2.5" onClick={e => e.stopPropagation()}>
                        <div className="w-full rounded-lg border-0 bg-slate-50 px-2.5 py-1.5 text-[11px] font-semibold text-slate-600 ring-1 ring-slate-200">
                          {remarks[s.student_id] || '—'}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filteredStudents.length === 0 && (
                  <tr>
                    <td colSpan={displayedPeriods.length + 4} className="px-4 py-12 text-center text-sm font-semibold text-slate-400">
                      No students match the current filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Bottom Summary Cards ── */}
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Students</p>
            <p className="mt-1 text-2xl font-black text-slate-900">{rows.length}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Overall Attendance Rate</p>
            <div className="mt-1 flex items-center gap-3">
              <p className={`text-2xl font-black ${overallPresent >= 85 ? 'text-slate-900' : 'text-amber-700'}`}>
                {overallPresent}%
              </p>
              <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${overallPresent >= 85 ? 'bg-slate-900' : 'bg-amber-500'}`}
                  style={{ width: `${overallPresent}%` }}
                />
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Absent (Any Period)</p>
            <p className={`mt-1 text-2xl font-black ${absentCount > 0 ? 'text-amber-700' : 'text-slate-900'}`}>
              {absentCount}
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}