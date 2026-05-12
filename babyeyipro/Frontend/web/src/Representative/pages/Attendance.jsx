import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ClipboardCheck, Users, UserCheck, DoorOpen, ClipboardList, Clock,
  Search, CalendarRange, Loader2, RefreshCw, ChevronDown,
} from 'lucide-react';
import { useRepresentativeData } from '../context/RepresentativeContext';
import api from '../services/api';

const TABS = [
  { id: 'class', label: 'Class Attendance', icon: ClipboardCheck },
  { id: 'student', label: 'Student Entry / Exit', icon: Users },
  { id: 'teacher', label: 'Teacher Attendance', icon: UserCheck },
  { id: 'gate_logs', label: 'Gate Logs', icon: ClipboardList },
];

const STATUS_STYLE = {
  Present:   'bg-emerald-50 text-emerald-700 border-emerald-200',
  Absent:    'bg-rose-50 text-rose-700 border-rose-200',
  Late:      'bg-amber-50 text-amber-700 border-amber-200',
  Excused:   'bg-slate-50 text-slate-600 border-slate-200',
  NotMarked: 'bg-white text-slate-400 border-slate-200',
};
const STATUS_ICON = { Present: '✓', Absent: '✕', Late: '⏱', Excused: '◆', NotMarked: '—' };

function useSchoolId() {
  const { activeSchoolId } = useRepresentativeData();
  return activeSchoolId != null && activeSchoolId !== '' ? Number(activeSchoolId) : undefined;
}

function sp(schoolId) {
  return schoolId ? { school_id: schoolId } : {};
}

function fmtTime(v) {
  if (!v) return '—';
  return new Date(v).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}
function fmtDate(v) {
  if (!v) return '—';
  return new Date(v).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function RateBar({ rate }) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-100">
        <div className={`h-full rounded-full transition-all duration-700 ${rate >= 85 ? 'bg-emerald-500' : rate >= 60 ? 'bg-amber-400' : 'bg-rose-400'}`} style={{ width: `${rate}%` }} />
      </div>
      <span className={`text-[11px] font-semibold ${rate >= 85 ? 'text-emerald-700' : rate >= 60 ? 'text-amber-700' : 'text-rose-700'}`}>{rate}%</span>
    </div>
  );
}

function Stat({ label, value, sub }) {
  return (
    <div className="rounded-xl border border-slate-200/80 bg-white p-4">
      <p className="text-2xl font-bold tracking-tight text-slate-800">{value}</p>
      <p className="mt-1 text-[11px] font-medium uppercase tracking-wide text-slate-400">{label}</p>
      {sub && <p className="mt-0.5 text-[10px] text-slate-400">{sub}</p>}
    </div>
  );
}

function EmptyState({ text }) {
  return <div className="py-16 text-center text-sm font-medium text-slate-400">{text}</div>;
}

/* ═══════════════════════════════════════════════════════════════
   CLASS ATTENDANCE TAB
   ═══════════════════════════════════════════════════════════════ */
function ClassAttendanceTab({ schoolId }) {
  const [meta, setMeta] = useState({ classes: [], terms: [], years: [] });
  const [filters, setFilters] = useState({ class_name: '', term: '', academic_year: '', date: new Date().toISOString().slice(0, 10) });
  const [periods, setPeriods] = useState([]);
  const [rows, setRows] = useState([]);
  const [statuses, setStatuses] = useState({});
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const timerRef = useRef(null);

  const loadMeta = useCallback(async () => {
    try {
      const res = await api.get('/teacher-portal/attendance-module/meta', { params: sp(schoolId) });
      if (!res.data?.success) return;
      const d = res.data.data || {};
      setMeta(d);
      setFilters(f => ({
        ...f,
        class_name: f.class_name || (d.classes || [])[0] || '',
        term: f.term || (d.terms || [])[0] || 'Term 1',
        academic_year: f.academic_year || (d.years || [])[0] || '',
      }));
    } catch (_) {}
  }, [schoolId]);

  const loadData = useCallback(async (silent = false) => {
    if (!filters.class_name) return;
    if (!silent) setLoading(true);
    try {
      const res = await api.get('/teacher-portal/attendance-module/class-period', { params: { ...filters, ...sp(schoolId) } });
      if (res.data?.success) {
        const p = res.data.data?.periods || [];
        const r = res.data.data?.roster || [];
        setPeriods(p);
        setRows(r);
        const next = {};
        p.forEach(pr => { next[pr.period] = {}; });
        r.forEach(s => { p.forEach(pr => { next[pr.period][s.student_id] = s.period_statuses?.[pr.period] || 'NotMarked'; }); });
        setStatuses(next);
      }
    } catch (_) {} finally { if (!silent) setLoading(false); }
  }, [filters, schoolId]);

  useEffect(() => { loadMeta(); }, [loadMeta]);
  useEffect(() => { loadData(); }, [loadData]);
  useEffect(() => {
    timerRef.current = setInterval(() => loadData(true), 20000);
    return () => clearInterval(timerRef.current);
  }, [loadData]);

  const overallRate = useMemo(() => {
    let t = 0, p = 0;
    periods.forEach(pr => { rows.forEach(s => { t++; if ((statuses[pr.period]?.[s.student_id]) === 'Present') p++; }); });
    return t > 0 ? Math.round((p / t) * 100) : 0;
  }, [periods, rows, statuses]);

  const absentCount = useMemo(() =>
    rows.filter(s => periods.some(p => (statuses[p.period]?.[s.student_id]) === 'Absent')).length,
  [periods, rows, statuses]);

  const periodSummary = useMemo(() => {
    const total = rows.length || 1;
    return periods.map(p => {
      const c = { Present: 0, Absent: 0, Late: 0, Excused: 0, NotMarked: 0 };
      rows.forEach(s => { const st = statuses[p.period]?.[s.student_id] || 'NotMarked'; if (c[st] !== undefined) c[st]++; });
      return { ...p, ...c, rate: Math.round((c.Present / total) * 100) };
    });
  }, [periods, rows, statuses]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? rows.filter(s => s.student_name?.toLowerCase().includes(q) || s.student_uid?.toLowerCase().includes(q)) : rows;
  }, [rows, search]);

  const classOptions = useMemo(() => [...new Set((meta.classes || []).map(c => String(c).trim()).filter(Boolean))], [meta.classes]);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-5">
        {[
          { key: 'class_name', label: 'Class', options: classOptions },
          { key: 'term', label: 'Term', options: meta.terms },
          { key: 'academic_year', label: 'Year', options: meta.years },
        ].map(({ key, label, options }) => (
          <div key={key}>
            <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-slate-400">{label}</label>
            <select value={filters[key]} onChange={e => setFilters(f => ({ ...f, [key]: e.target.value }))}
              className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 outline-none focus:border-slate-400 transition">
              {(options || []).map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
        ))}
        <div>
          <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-slate-400">Date</label>
          <input type="date" value={filters.date} onChange={e => setFilters(f => ({ ...f, date: e.target.value }))}
            className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 outline-none focus:border-slate-400 transition" />
        </div>
        <div className="flex items-end">
          <button onClick={() => loadData()} disabled={loading}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-slate-800 px-3 text-[11px] font-semibold text-white hover:bg-slate-700 transition disabled:opacity-50">
            {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />} Refresh
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Students" value={rows.length} sub={`${periods.length} periods`} />
        <Stat label="Overall rate" value={`${overallRate}%`} />
        <Stat label="Absent" value={absentCount} sub="at least 1 period" />
        <Stat label="Late" value={rows.filter(s => periods.some(p => (statuses[p.period]?.[s.student_id]) === 'Late')).length} />
      </div>

      {/* Period summary */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="border-b border-slate-100 px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Period Summary</div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px]">
            <thead><tr className="bg-slate-50/60">
              {['Period', 'Subject', 'Teacher', 'Present', 'Absent', 'Late', 'Rate'].map(h => (
                <th key={h} className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wide text-slate-400">{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {periodSummary.map(r => (
                <tr key={r.period} className="border-t border-slate-50 hover:bg-slate-50/50 transition">
                  <td className="px-4 py-2.5 text-xs font-medium text-slate-700">{r.period}</td>
                  <td className="px-4 py-2.5 text-xs font-medium text-slate-700">{r.subject}</td>
                  <td className="px-4 py-2.5 text-xs text-slate-500">{r.teacher}</td>
                  <td className="px-4 py-2.5 text-xs font-semibold text-emerald-700">{r.Present}</td>
                  <td className="px-4 py-2.5 text-xs font-semibold text-rose-600">{r.Absent}</td>
                  <td className="px-4 py-2.5 text-xs font-semibold text-amber-600">{r.Late}</td>
                  <td className="px-4 py-2.5"><RateBar rate={r.rate} /></td>
                </tr>
              ))}
              {!periodSummary.length && <tr><td colSpan={7}><EmptyState text="No periods found for this class and date." /></td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search student…"
          className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-8 pr-3 text-xs font-medium text-slate-700 outline-none focus:border-slate-400 transition" />
      </div>

      {/* Student grid */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="border-b border-slate-100 px-4 py-3 flex items-center justify-between">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Attendance Register — {filtered.length} students</span>
          <span className="flex items-center gap-1.5 text-[10px] text-slate-400"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />Live</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px]">
            <thead><tr className="bg-slate-50/60">
              <th className="sticky left-0 z-10 bg-slate-50/90 px-4 py-2 text-left text-[10px] font-semibold uppercase tracking-wide text-slate-400 w-8">#</th>
              <th className="sticky left-8 z-10 bg-slate-50/90 px-4 py-2 text-left text-[10px] font-semibold uppercase tracking-wide text-slate-400 min-w-[140px]">Student</th>
              {periods.map(p => (
                <th key={p.period} className="px-3 py-2 text-center text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                  {p.period}<br /><span className="font-normal normal-case text-slate-300">{p.subject}</span>
                </th>
              ))}
              <th className="px-4 py-2 text-center text-[10px] font-semibold uppercase tracking-wide text-slate-400">Present</th>
            </tr></thead>
            <tbody>
              {filtered.map((s, i) => {
                const pc = periods.filter(p => (statuses[p.period]?.[s.student_id]) === 'Present').length;
                return (
                  <tr key={s.student_id} className="border-t border-slate-50 hover:bg-slate-50/50 transition">
                    <td className="sticky left-0 z-10 bg-inherit px-4 py-2 text-[11px] text-slate-400">{i + 1}</td>
                    <td className="sticky left-8 z-10 bg-inherit px-4 py-2">
                      <p className="text-xs font-medium text-slate-700">{s.student_name}</p>
                      <p className="text-[10px] text-slate-400">{s.student_uid}</p>
                    </td>
                    {periods.map(p => {
                      const st = statuses[p.period]?.[s.student_id] || 'NotMarked';
                      return (
                        <td key={p.period} className="px-3 py-2 text-center">
                          <span title={st} className={`inline-flex h-7 w-7 items-center justify-center rounded-lg border text-xs font-semibold ${STATUS_STYLE[st] || STATUS_STYLE.NotMarked}`}>
                            {STATUS_ICON[st] || '—'}
                          </span>
                        </td>
                      );
                    })}
                    <td className="px-4 py-2 text-center">
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                        pc === periods.length ? 'bg-emerald-50 text-emerald-700' : pc === 0 ? 'bg-rose-50 text-rose-600' : 'bg-amber-50 text-amber-700'
                      }`}>{pc}/{periods.length}</span>
                    </td>
                  </tr>
                );
              })}
              {!filtered.length && <tr><td colSpan={periods.length + 3}><EmptyState text="No students match filters." /></td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 px-1">
        {['Present', 'Absent', 'Late', 'Excused', 'NotMarked'].map(s => (
          <div key={s} className="flex items-center gap-1.5">
            <span className={`inline-flex h-5 w-5 items-center justify-center rounded border text-[10px] font-semibold ${STATUS_STYLE[s]}`}>{STATUS_ICON[s]}</span>
            <span className="text-[11px] text-slate-500">{s === 'NotMarked' ? 'Not Marked' : s}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   STUDENT ENTRY / EXIT TAB
   ═══════════════════════════════════════════════════════════════ */
function StudentEntryExitTab({ schoolId }) {
  const [meta, setMeta] = useState({ classes: [] });
  const [className, setClassName] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [rows, setRows] = useState([]);
  const [totals, setTotals] = useState({});
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [grid, setGrid] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get('/teacher-portal/attendance-module/meta', { params: sp(schoolId) });
        if (res.data?.success) {
          const cl = res.data.data?.classes || [];
          setMeta({ classes: cl });
          setClassName(p => p || cl[0] || '');
        }
      } catch (_) {}
    })();
  }, [schoolId]);

  useEffect(() => {
    if (!className) return;
    setLoading(true);
    api.get('/teacher-portal/attendance-module/student-entry-exit', { params: { class_name: className, date, ...sp(schoolId) } })
      .then(res => { if (res.data?.success) { setRows(res.data.data?.rows || []); setTotals(res.data.data?.totals || {}); } })
      .catch(() => {}).finally(() => setLoading(false));
  }, [className, date, schoolId]);

  useEffect(() => {
    if (!className) return;
    api.get('/teacher-portal/attendance-module/student-entry-exit/monthly-grid', { params: { class_name: className, month, year, ...sp(schoolId) } })
      .then(res => { if (res.data?.success) setGrid(res.data.data?.grid || []); })
      .catch(() => {});
  }, [className, month, year, schoolId]);

  const rate = useMemo(() => {
    const t = Number(totals.total_students || 0);
    return t ? Math.round(((Number(totals.on_time || 0) + Number(totals.late || 0)) / t) * 100) : 0;
  }, [totals]);

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-slate-400">Class</label>
          <select value={className} onChange={e => setClassName(e.target.value)}
            className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 outline-none focus:border-slate-400 transition">
            {meta.classes.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-slate-400">Date</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)}
            className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 outline-none focus:border-slate-400 transition" />
        </div>
        <div className="flex items-end gap-4">
          <Stat label="Attendance rate" value={`${rate}%`} />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Stat label="On time" value={totals.on_time || 0} />
        <Stat label="Late" value={totals.late || 0} />
        <Stat label="Missing checkout" value={totals.missing || 0} />
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="border-b border-slate-100 px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
          Daily Entry / Exit — {rows.length} students {loading && <Loader2 size={12} className="inline animate-spin ml-2" />}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px]">
            <thead><tr className="bg-slate-50/60">
              {['Student', 'Check-in', 'Status In', 'Check-out', 'Status Out'].map(h => (
                <th key={h} className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wide text-slate-400">{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.student_id} className="border-t border-slate-50 hover:bg-slate-50/50 transition">
                  <td className="px-4 py-2.5 text-xs font-medium text-slate-700">{r.student_name}</td>
                  <td className="px-4 py-2.5 text-xs font-mono text-slate-600">{r.check_in ? new Date(r.check_in).toLocaleTimeString() : '—'}</td>
                  <td className="px-4 py-2.5"><StatusPill status={r.status_in || 'Absent'} /></td>
                  <td className="px-4 py-2.5 text-xs font-mono text-slate-600">{r.check_out ? new Date(r.check_out).toLocaleTimeString() : '—'}</td>
                  <td className="px-4 py-2.5"><StatusPill status={r.status_out || 'Missing'} /></td>
                </tr>
              ))}
              {!rows.length && <tr><td colSpan={5}><EmptyState text="No entry/exit data for this date." /></td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {/* Monthly grid */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="border-b border-slate-100 px-4 py-3 flex flex-wrap items-center gap-3">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Monthly Grid</span>
          <input type="number" min={1} max={12} value={month} onChange={e => setMonth(Number(e.target.value || 1))}
            className="h-8 w-16 rounded-lg border border-slate-200 px-2 text-xs font-medium text-slate-700 outline-none" />
          <input type="number" value={year} onChange={e => setYear(Number(e.target.value || new Date().getFullYear()))}
            className="h-8 w-20 rounded-lg border border-slate-200 px-2 text-xs font-medium text-slate-700 outline-none" />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1200px] text-[11px]">
            <thead><tr className="bg-slate-50/60">
              <th className="px-2 py-2 text-left font-semibold text-slate-400">Student</th>
              {Array.from({ length: 31 }, (_, i) => <th key={i} className="px-1 py-2 text-center font-semibold text-slate-400">{i + 1}</th>)}
              <th className="px-2 py-2 text-center font-semibold text-slate-400">P</th>
              <th className="px-2 py-2 text-center font-semibold text-slate-400">L</th>
              <th className="px-2 py-2 text-center font-semibold text-slate-400">A</th>
            </tr></thead>
            <tbody>
              {grid.map(r => (
                <tr key={r.student_id} className="border-t border-slate-50">
                  <td className="px-2 py-1.5 font-medium text-slate-700 whitespace-nowrap">{r.student_name}</td>
                  {Array.from({ length: 31 }, (_, i) => {
                    const d = String(i + 1).padStart(2, '0');
                    const v = r.days?.[d] || 'Absent';
                    const cls = v === 'Present' ? 'bg-emerald-50 text-emerald-600' : v === 'Late' ? 'bg-amber-50 text-amber-600' : 'bg-rose-50 text-rose-500';
                    return <td key={d} className={`px-1 py-1 text-center font-semibold ${cls}`}>{v === 'Present' ? 'P' : v === 'Late' ? 'L' : 'A'}</td>;
                  })}
                  <td className="px-2 py-1.5 text-center font-semibold text-emerald-700">{r.present_days}</td>
                  <td className="px-2 py-1.5 text-center font-semibold text-amber-600">{r.late_days}</td>
                  <td className="px-2 py-1.5 text-center font-semibold text-rose-600">{r.absent_days}</td>
                </tr>
              ))}
              {!grid.length && <tr><td colSpan={35}><EmptyState text="No monthly data available." /></td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StatusPill({ status }) {
  const s = String(status || '').toLowerCase();
  const cls = s === 'present' || s === 'on_time' ? 'bg-emerald-50 text-emerald-700'
    : s === 'late' ? 'bg-amber-50 text-amber-700'
    : s === 'absent' ? 'bg-rose-50 text-rose-600'
    : 'bg-slate-100 text-slate-500';
  return <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize ${cls}`}>{status}</span>;
}

/* ═══════════════════════════════════════════════════════════════
   TEACHER ATTENDANCE TAB
   ═══════════════════════════════════════════════════════════════ */
function TeacherAttendanceTab({ schoolId }) {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [rows, setRows] = useState([]);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [grid, setGrid] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    api.get('/teacher-portal/attendance-module/teacher', { params: { date, ...sp(schoolId) } })
      .then(res => { if (res.data?.success) setRows(res.data.data || []); })
      .catch(() => {}).finally(() => setLoading(false));
  }, [date, schoolId]);

  useEffect(() => {
    api.get('/teacher-portal/attendance-module/teacher/monthly-grid', { params: { month, year, ...sp(schoolId) } })
      .then(res => { if (res.data?.success) setGrid(res.data.data?.grid || []); })
      .catch(() => {});
  }, [month, year, schoolId]);

  const presentCount = useMemo(() => rows.filter(r => r.status_in === 'Present' || r.check_in).length, [rows]);

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-slate-400">Date</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)}
            className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 outline-none focus:border-slate-400 transition" />
        </div>
        <Stat label="Teachers present" value={presentCount} sub={`of ${rows.length}`} />
        <Stat label="Absent" value={rows.length - presentCount} />
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="border-b border-slate-100 px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
          Daily Teacher Attendance {loading && <Loader2 size={12} className="inline animate-spin ml-2" />}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[500px]">
            <thead><tr className="bg-slate-50/60">
              {['Teacher', 'Status', 'Check-in Time', 'Remarks'].map(h => (
                <th key={h} className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wide text-slate-400">{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.teacher_id} className="border-t border-slate-50 hover:bg-slate-50/50 transition">
                  <td className="px-4 py-2.5 text-xs font-medium text-slate-700">{r.teacher_name}</td>
                  <td className="px-4 py-2.5"><StatusPill status={r.status_in || (r.check_in ? 'Present' : 'Absent')} /></td>
                  <td className="px-4 py-2.5 text-xs font-mono text-slate-600">{r.check_in ? new Date(r.check_in).toLocaleTimeString() : '—'}</td>
                  <td className="px-4 py-2.5 text-xs text-slate-500">{r.remarks || '—'}</td>
                </tr>
              ))}
              {!rows.length && <tr><td colSpan={4}><EmptyState text="No teacher attendance data." /></td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {/* Monthly grid */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="border-b border-slate-100 px-4 py-3 flex flex-wrap items-center gap-3">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Monthly Grid</span>
          <input type="number" min={1} max={12} value={month} onChange={e => setMonth(Number(e.target.value || 1))}
            className="h-8 w-16 rounded-lg border border-slate-200 px-2 text-xs font-medium text-slate-700 outline-none" />
          <input type="number" value={year} onChange={e => setYear(Number(e.target.value || new Date().getFullYear()))}
            className="h-8 w-20 rounded-lg border border-slate-200 px-2 text-xs font-medium text-slate-700 outline-none" />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1200px] text-[11px]">
            <thead><tr className="bg-slate-50/60">
              <th className="px-2 py-2 text-left font-semibold text-slate-400">Teacher</th>
              {Array.from({ length: 31 }, (_, i) => <th key={i} className="px-1 py-2 text-center font-semibold text-slate-400">{i + 1}</th>)}
              <th className="px-2 py-2 text-center font-semibold text-slate-400">P</th>
              <th className="px-2 py-2 text-center font-semibold text-slate-400">L</th>
              <th className="px-2 py-2 text-center font-semibold text-slate-400">A</th>
            </tr></thead>
            <tbody>
              {grid.map(r => (
                <tr key={r.teacher_id} className="border-t border-slate-50">
                  <td className="px-2 py-1.5 font-medium text-slate-700 whitespace-nowrap">{r.teacher_name}</td>
                  {Array.from({ length: 31 }, (_, i) => {
                    const d = String(i + 1).padStart(2, '0');
                    const v = r.days?.[d] || 'Absent';
                    const cls = v === 'Present' ? 'bg-emerald-50 text-emerald-600' : v === 'Late' ? 'bg-amber-50 text-amber-600' : 'bg-rose-50 text-rose-500';
                    return <td key={d} className={`px-1 py-1 text-center font-semibold ${cls}`}>{v === 'Present' ? 'P' : v === 'Late' ? 'L' : 'A'}</td>;
                  })}
                  <td className="px-2 py-1.5 text-center font-semibold text-emerald-700">{r.present_days}</td>
                  <td className="px-2 py-1.5 text-center font-semibold text-amber-600">{r.late_days}</td>
                  <td className="px-2 py-1.5 text-center font-semibold text-rose-600">{r.absent_days}</td>
                </tr>
              ))}
              {!grid.length && <tr><td colSpan={35}><EmptyState text="No monthly data available." /></td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   GATE LOGS TAB
   ═══════════════════════════════════════════════════════════════ */
function GateLogsTab({ schoolId }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0, total_pages: 1 });
  const [filters, setFilters] = useState({ from_date: '', to_date: '', role: 'ALL', session: 'all', search: '' });

  const query = useMemo(() => {
    const p = { page: pagination.page, limit: pagination.limit, ...filters, ...sp(schoolId) };
    if (p.role === 'ALL') delete p.role;
    if (!p.search) delete p.search;
    if (!p.from_date) delete p.from_date;
    if (!p.to_date) delete p.to_date;
    return p;
  }, [filters, pagination.page, pagination.limit, schoolId]);

  useEffect(() => {
    setLoading(true);
    api.get('/gate/attendance/logs', { params: query })
      .then(res => { if (res.data?.success) { setRows(res.data.data || []); setPagination(p => ({ ...p, ...(res.data.pagination || p) })); } })
      .catch(() => {}).finally(() => setLoading(false));
  }, [query]);

  const setFilter = (k, v) => { setFilters(f => ({ ...f, [k]: v })); setPagination(p => ({ ...p, page: 1 })); };

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <div>
          <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-slate-400">From</label>
          <input type="date" value={filters.from_date} onChange={e => setFilter('from_date', e.target.value)}
            className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 outline-none focus:border-slate-400 transition" />
        </div>
        <div>
          <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-slate-400">To</label>
          <input type="date" value={filters.to_date} onChange={e => setFilter('to_date', e.target.value)}
            className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 outline-none focus:border-slate-400 transition" />
        </div>
        <div>
          <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-slate-400">Role</label>
          <select value={filters.role} onChange={e => setFilter('role', e.target.value)}
            className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 outline-none focus:border-slate-400 transition">
            <option value="ALL">All Roles</option>
            <option value="STUDENT">Student</option>
            <option value="STAFF">Staff</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-slate-400">Session</label>
          <select value={filters.session} onChange={e => setFilter('session', e.target.value)}
            className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 outline-none focus:border-slate-400 transition">
            <option value="all">All</option>
            <option value="morning_only">Morning</option>
            <option value="evening_only">Evening</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-slate-400">Search</label>
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={filters.search} onChange={e => setFilter('search', e.target.value)} placeholder="Name, UID…"
              className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-8 pr-3 text-xs font-medium text-slate-700 outline-none focus:border-slate-400 transition" />
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="border-b border-slate-100 px-4 py-3 flex items-center justify-between">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            Gate Logs {loading && <Loader2 size={12} className="inline animate-spin ml-2" />}
          </span>
          <span className="text-[11px] font-medium text-slate-400">{pagination.total} records</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px]">
            <thead><tr className="bg-slate-50/60">
              {['Date', 'Name', 'Role', 'Card UID', 'Morning', 'Evening', 'Status'].map(h => (
                <th key={h} className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wide text-slate-400">{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {rows.map(r => {
                const st = r.evening_check_out ? 'Checked out' : r.morning_check_in ? 'In school' : 'No entry';
                const stCls = r.evening_check_out ? 'bg-slate-100 text-slate-600' : r.morning_check_in ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-600';
                return (
                  <tr key={r.id} className="border-t border-slate-50 hover:bg-slate-50/50 transition">
                    <td className="px-4 py-2.5 text-xs font-medium text-slate-600">{fmtDate(r.attendance_date)}</td>
                    <td className="px-4 py-2.5 text-xs font-medium text-slate-700">{r.person_name}</td>
                    <td className="px-4 py-2.5 text-xs font-medium text-slate-500 uppercase">{r.person_type}</td>
                    <td className="px-4 py-2.5 text-xs font-mono text-amber-600">{r.card_uid}</td>
                    <td className="px-4 py-2.5 text-xs font-mono text-emerald-600">{fmtTime(r.morning_check_in)}</td>
                    <td className="px-4 py-2.5 text-xs font-mono text-sky-600">{fmtTime(r.evening_check_out)}</td>
                    <td className="px-4 py-2.5"><span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${stCls}`}>{st}</span></td>
                  </tr>
                );
              })}
              {!loading && !rows.length && <tr><td colSpan={7}><EmptyState text="No gate logs found." /></td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="text-xs font-medium text-slate-400">Page {pagination.page} of {pagination.total_pages}</span>
        <div className="flex gap-2">
          <button disabled={pagination.page <= 1 || loading} onClick={() => setPagination(p => ({ ...p, page: p.page - 1 }))}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition disabled:opacity-40">Previous</button>
          <button disabled={pagination.page >= pagination.total_pages || loading} onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition disabled:opacity-40">Next</button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   MAIN ATTENDANCE PAGE
   ═══════════════════════════════════════════════════════════════ */
export default function RepresentativeAttendance() {
  const { activeSchool } = useRepresentativeData();
  const schoolId = useSchoolId();
  const [tab, setTab] = useState('class');

  return (
    <div className="animate-in fade-in duration-500 bg-[#f0f2f8] min-h-full pb-24">
      {/* Hero */}
      <div className="relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #000435 0%, #000320 60%, #00021a 100%)' }}>
        <div className="absolute -top-16 -right-16 w-56 h-56 rounded-full border border-white/[0.04] pointer-events-none" />
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber-400/30 to-transparent" />
        <div className="relative z-10 px-4 sm:px-6 lg:px-8 pt-8 pb-14 max-w-[1600px] mx-auto">
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <span className="w-4 h-0.5 rounded-full bg-amber-400" />
                <span className="text-[10px] font-semibold uppercase tracking-[0.25em] text-amber-400/80">
                  {activeSchool ? activeSchool.school_name : 'All Schools'} · Attendance
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white tracking-tight" style={{ fontFamily: "'Montserrat',sans-serif" }}>
                Attendance Dashboard
              </h1>
              <p className="text-sm text-white/50 mt-2 max-w-xl leading-relaxed">
                Class period attendance, student entry &amp; exit, teacher check-in, and gate logs.
              </p>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-xl bg-white/10 px-3 py-2 text-[11px] font-semibold text-white/70 ring-1 ring-white/10">
              <Clock size={14} className="text-amber-400" /> Live tracking
            </span>
          </div>
        </div>
      </div>

      <div className="px-4 sm:px-6 lg:px-8 -mt-8 relative z-20 max-w-[1600px] mx-auto space-y-5">
        {/* Tabs */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden">
          <div className="flex flex-wrap gap-1 p-2 bg-slate-50/50 border-b border-slate-100">
            {TABS.map(({ id, label, icon: Icon }) => (
              <button key={id} type="button" onClick={() => setTab(id)}
                className={`inline-flex items-center gap-2 h-9 rounded-lg px-4 text-[11px] font-semibold tracking-wide transition-all ${
                  tab === id
                    ? 'bg-[#000435] text-white shadow-sm'
                    : 'text-slate-500 hover:bg-white hover:text-slate-700'
                }`}>
                <Icon size={14} strokeWidth={1.75} /> {label}
              </button>
            ))}
          </div>

          <div className="p-4 sm:p-6">
            {tab === 'class' && <ClassAttendanceTab schoolId={schoolId} />}
            {tab === 'student' && <StudentEntryExitTab schoolId={schoolId} />}
            {tab === 'teacher' && <TeacherAttendanceTab schoolId={schoolId} />}
            {tab === 'gate_logs' && <GateLogsTab schoolId={schoolId} />}
          </div>
        </div>
      </div>
    </div>
  );
}
