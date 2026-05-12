import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRepresentativeData } from '../context/RepresentativeContext';
import RepresentativeHeroShell from '../components/RepresentativeHeroShell';
import {
  fetchRepresentativeDisciplineOverview,
  fetchRepresentativeDisciplineStudents,
} from '../services/api';
import {
  ShieldAlert,
  Users,
  AlertTriangle,
  TrendingDown,
  CheckCircle2,
  Search,
  ChevronDown,
  BarChart3,
  RefreshCw,
  ArrowUpDown,
  Loader2,
} from 'lucide-react';

const TABS = [
  { id: 'overview', label: 'Overview', icon: BarChart3 },
  { id: 'students', label: 'All Students', icon: Users },
  { id: 'analytics', label: 'School Comparison', icon: ArrowUpDown },
];

function fmt(n) {
  if (n == null) return '0';
  return Number(n).toLocaleString('en-RW', { maximumFractionDigits: 1 });
}

function marksColor(marks) {
  if (marks < 20) return 'text-rose-600 bg-rose-50';
  if (marks < 50) return 'text-amber-600 bg-amber-50';
  return 'text-emerald-600 bg-emerald-50';
}

function marksBadge(marks) {
  if (marks < 20) return { label: 'Critical', cls: 'bg-rose-100 text-rose-700' };
  if (marks < 50) return { label: 'Warning', cls: 'bg-amber-100 text-amber-700' };
  return { label: 'Good', cls: 'bg-emerald-100 text-emerald-700' };
}

function ProgressBar({ value, max }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  const bg = pct < 20 ? 'bg-rose-500' : pct < 50 ? 'bg-amber-500' : 'bg-emerald-500';
  return (
    <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
      <div className={`h-full rounded-full ${bg} transition-all duration-500`} style={{ width: `${pct}%` }} />
    </div>
  );
}

function OverviewTab({ data }) {
  if (!data) return null;
  const { classes, recent_cases, settings } = data;
  const maxMarks = settings?.[0]?.total_marks || 100;

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-black/[0.06] shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-black/5">
          <h3 className="text-xs font-semibold text-re-text uppercase tracking-widest">Class Breakdown</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[10px] text-re-text-muted uppercase tracking-wider border-b border-black/5">
                <th className="text-left px-5 py-3 font-semibold">Class</th>
                <th className="text-right px-4 py-3 font-semibold">Students</th>
                <th className="text-right px-4 py-3 font-semibold">Avg Marks</th>
                <th className="text-right px-4 py-3 font-semibold">Min</th>
                <th className="text-right px-4 py-3 font-semibold">Max</th>
                <th className="text-right px-4 py-3 font-semibold">Critical</th>
                <th className="px-5 py-3 font-semibold w-32">Health</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/[0.03]">
              {classes.map((c, i) => (
                <tr key={i} className="hover:bg-re-bg/40 transition-colors">
                  <td className="px-5 py-3 font-medium text-re-text">{c.class_name || 'Unassigned'}</td>
                  <td className="text-right px-4 py-3 text-re-text-muted">{c.student_count}</td>
                  <td className="text-right px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-md text-xs font-medium ${marksColor(c.avg_marks)}`}>
                      {fmt(c.avg_marks)}
                    </span>
                  </td>
                  <td className="text-right px-4 py-3 text-re-text-muted">{fmt(c.min_marks)}</td>
                  <td className="text-right px-4 py-3 text-re-text-muted">{fmt(c.max_marks)}</td>
                  <td className="text-right px-4 py-3">
                    {c.critical_count > 0 ? (
                      <span className="text-rose-600 font-semibold">{c.critical_count}</span>
                    ) : (
                      <span className="text-re-text-muted">0</span>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    <ProgressBar value={c.avg_marks} max={maxMarks} />
                  </td>
                </tr>
              ))}
              {!classes.length && (
                <tr><td colSpan={7} className="px-5 py-10 text-center text-re-text-muted text-sm">No class data available</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {recent_cases.length > 0 && (
        <div className="bg-white rounded-2xl border border-black/[0.06] shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-black/5">
            <h3 className="text-xs font-semibold text-re-text uppercase tracking-widest">Recent Discipline Cases</h3>
            <p className="text-[10px] text-re-text-muted mt-0.5">Last 50 cases across selected schools</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[10px] text-re-text-muted uppercase tracking-wider border-b border-black/5">
                  <th className="text-left px-5 py-3 font-semibold">Student</th>
                  <th className="text-left px-4 py-3 font-semibold">Class</th>
                  <th className="text-left px-4 py-3 font-semibold">Subject</th>
                  <th className="text-right px-4 py-3 font-semibold">Deducted</th>
                  <th className="text-right px-4 py-3 font-semibold">Remaining</th>
                  <th className="text-left px-5 py-3 font-semibold">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/[0.03]">
                {recent_cases.slice(0, 20).map((c) => (
                  <tr key={c.id} className="hover:bg-re-bg/40 transition-colors">
                    <td className="px-5 py-3">
                      <p className="font-medium text-re-text">{c.student_name}</p>
                      {c.school_name && <p className="text-[10px] text-re-text-muted">{c.school_name}</p>}
                    </td>
                    <td className="px-4 py-3 text-re-text-muted">{c.class_name || '—'}</td>
                    <td className="px-4 py-3 text-re-text-muted">{c.lesson_subject || '—'}</td>
                    <td className="text-right px-4 py-3 text-rose-600 font-semibold">-{fmt(c.marks_deducted)}</td>
                    <td className="text-right px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-md text-xs font-medium ${marksColor(c.marks_remaining_after)}`}>
                        {fmt(c.marks_remaining_after)}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-re-text-muted text-xs">
                      {c.created_at ? new Date(c.created_at).toLocaleDateString('en-RW', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function StudentsTab({ schoolId }) {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [sortField, setSortField] = useState('class_name');
  const [sortDir, setSortDir] = useState('asc');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchRepresentativeDisciplineStudents(schoolId)
      .then((res) => { if (!cancelled) setStudents(res.data || []); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [schoolId]);

  const classes = useMemo(() => [...new Set(students.map((s) => s.class_name))].sort(), [students]);

  const filtered = useMemo(() => {
    let list = students;
    if (classFilter) list = list.filter((s) => s.class_name === classFilter);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((s) => s.name.toLowerCase().includes(q) || s.code.toLowerCase().includes(q));
    }
    list = [...list].sort((a, b) => {
      let av = a[sortField], bv = b[sortField];
      if (typeof av === 'string') av = av.toLowerCase();
      if (typeof bv === 'string') bv = bv.toLowerCase();
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    return list;
  }, [students, classFilter, search, sortField, sortDir]);

  const toggleSort = (field) => {
    if (sortField === field) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortField(field); setSortDir('asc'); }
  };

  const lowStudents = useMemo(() => students.filter((s) => s.discipline_marks < 20), [students]);

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="w-6 h-6 text-re-text-muted animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {lowStudents.length > 0 && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle size={16} className="text-rose-600" />
            <h4 className="text-xs font-semibold text-rose-800 uppercase tracking-wider">{lowStudents.length} Students with Critical Marks (&lt; 20)</h4>
          </div>
          <div className="flex flex-wrap gap-2">
            {lowStudents.slice(0, 12).map((s) => (
              <span key={s.id} className="text-xs bg-white border border-rose-200 rounded-lg px-2.5 py-1 text-rose-700">
                {s.name} <span className="text-rose-500">({s.class_name} — {fmt(s.discipline_marks)})</span>
              </span>
            ))}
            {lowStudents.length > 12 && <span className="text-xs text-rose-500 self-center">+{lowStudents.length - 12} more</span>}
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-re-text-muted" />
          <input type="text" placeholder="Search student name or code..." value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-black/10 text-sm focus:outline-none focus:ring-2 focus:ring-[#FEBF10]/40 bg-white" />
        </div>
        <div className="relative">
          <select value={classFilter} onChange={(e) => setClassFilter(e.target.value)}
            className="appearance-none pl-4 pr-8 py-2.5 rounded-xl border border-black/10 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#FEBF10]/40 cursor-pointer">
            <option value="">All Classes ({students.length})</option>
            {classes.map((c) => (
              <option key={c} value={c}>{c} ({students.filter((s) => s.class_name === c).length})</option>
            ))}
          </select>
          <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-re-text-muted pointer-events-none" />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-black/[0.06] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[10px] text-re-text-muted uppercase tracking-wider border-b border-black/5">
                <th className="text-left px-5 py-3 font-semibold">#</th>
                <th className="text-left px-4 py-3 font-semibold cursor-pointer select-none" onClick={() => toggleSort('name')}>
                  Student {sortField === 'name' && (sortDir === 'asc' ? '↑' : '↓')}
                </th>
                <th className="text-left px-4 py-3 font-semibold cursor-pointer select-none" onClick={() => toggleSort('class_name')}>
                  Class {sortField === 'class_name' && (sortDir === 'asc' ? '↑' : '↓')}
                </th>
                <th className="text-left px-4 py-3 font-semibold hidden lg:table-cell">School</th>
                <th className="text-right px-4 py-3 font-semibold cursor-pointer select-none" onClick={() => toggleSort('discipline_marks')}>
                  Marks {sortField === 'discipline_marks' && (sortDir === 'asc' ? '↑' : '↓')}
                </th>
                <th className="text-center px-5 py-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/[0.03]">
              {filtered.map((s, i) => {
                const badge = marksBadge(s.discipline_marks);
                return (
                  <tr key={s.id} className="hover:bg-re-bg/40 transition-colors">
                    <td className="px-5 py-3 text-re-text-muted text-xs">{i + 1}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-re-text">{s.name}</p>
                      <p className="text-[10px] text-re-text-muted">{s.code}</p>
                    </td>
                    <td className="px-4 py-3 text-re-text-muted">{s.class_name}</td>
                    <td className="px-4 py-3 text-re-text-muted hidden lg:table-cell text-xs">{s.school_name}</td>
                    <td className="text-right px-4 py-3">
                      <span className={`px-2.5 py-1 rounded-md text-xs font-semibold ${marksColor(s.discipline_marks)}`}>
                        {fmt(s.discipline_marks)}
                      </span>
                    </td>
                    <td className="text-center px-5 py-3">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider ${badge.cls}`}>
                        {badge.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {!filtered.length && (
                <tr><td colSpan={6} className="px-5 py-12 text-center text-re-text-muted">No students found</td></tr>
              )}
            </tbody>
          </table>
        </div>
        {filtered.length > 0 && (
          <div className="px-5 py-3 border-t border-black/5 text-[10px] text-re-text-muted font-semibold uppercase tracking-wider">
            Showing {filtered.length} of {students.length} students
          </div>
        )}
      </div>
    </div>
  );
}

function AnalyticsTab({ data }) {
  if (!data) return null;
  const { school_comparison } = data;
  if (!school_comparison?.length) {
    return <div className="text-center py-12 text-re-text-muted">No school comparison data available</div>;
  }

  const best = [...school_comparison].sort((a, b) => b.avg_marks - a.avg_marks);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-black/[0.06] shadow-sm p-5">
        <h3 className="text-xs font-semibold text-re-text uppercase tracking-widest mb-4">School Discipline Ranking</h3>
        <div className="space-y-5">
          {best.map((s, i) => {
            const total = s.total_students || 1;
            const goodPct = (s.good / total) * 100;
            const warnPct = (s.warning / total) * 100;
            const critPct = (s.critical / total) * 100;
            return (
              <div key={s.school_id} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                      i === 0 ? 'bg-emerald-100 text-emerald-700' : i === best.length - 1 && best.length > 1 ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-600'
                    }`}>{i + 1}</span>
                    <span className="text-sm font-medium text-re-text">{s.school_name}</span>
                  </div>
                  <span className={`text-sm font-semibold ${marksColor(s.avg_marks).split(' ')[0]}`}>
                    Avg: {fmt(s.avg_marks)}
                  </span>
                </div>
                <div className="flex h-3 rounded-full overflow-hidden bg-slate-100">
                  <div className="bg-emerald-500 transition-all" style={{ width: `${goodPct}%` }} />
                  <div className="bg-amber-400 transition-all" style={{ width: `${warnPct}%` }} />
                  <div className="bg-rose-500 transition-all" style={{ width: `${critPct}%` }} />
                </div>
                <div className="flex gap-4 text-[10px] text-re-text-muted font-medium">
                  <span>{s.total_students} students</span>
                  <span className="text-emerald-600">{s.good} good</span>
                  <span className="text-amber-600">{s.warning} warning</span>
                  <span className="text-rose-600">{s.critical} critical</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {school_comparison.map((s) => {
          const total = s.total_students || 1;
          return (
            <div key={s.school_id} className="bg-white rounded-2xl border border-black/[0.06] shadow-sm p-5">
              <h4 className="text-sm font-semibold text-re-text mb-3 truncate">{s.school_name}</h4>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <p className="text-[10px] text-re-text-muted uppercase tracking-wider font-semibold">Students</p>
                  <p className="text-lg font-semibold text-re-text">{s.total_students}</p>
                </div>
                <div>
                  <p className="text-[10px] text-re-text-muted uppercase tracking-wider font-semibold">Avg Marks</p>
                  <p className={`text-lg font-semibold ${marksColor(s.avg_marks).split(' ')[0]}`}>{fmt(s.avg_marks)}</p>
                </div>
              </div>
              <div className="space-y-2">
                {[
                  { label: 'Good (≥50)', count: s.good, color: 'text-emerald-600', bg: 'bg-emerald-500' },
                  { label: 'Warning (20-49)', count: s.warning, color: 'text-amber-600', bg: 'bg-amber-400' },
                  { label: 'Critical (<20)', count: s.critical, color: 'text-rose-600', bg: 'bg-rose-500' },
                ].map((r) => (
                  <div key={r.label}>
                    <div className="flex items-center justify-between text-[10px] mb-0.5">
                      <span className={`${r.color} font-semibold`}>{r.label}</span>
                      <span className="font-semibold text-re-text-muted">{r.count} ({Math.round((r.count / total) * 100)}%)</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                      <div className={`h-full ${r.bg} rounded-full`} style={{ width: `${(r.count / total) * 100}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function RepresentativeDiscipline() {
  const { activeSchoolId, activeSchool, schools } = useRepresentativeData();
  const [tab, setTab] = useState('overview');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    fetchRepresentativeDisciplineOverview(activeSchoolId)
      .then((res) => setData(res.data))
      .catch((err) => setError(err?.response?.data?.message || 'Failed to load discipline data'))
      .finally(() => setLoading(false));
  }, [activeSchoolId]);

  useEffect(() => { load(); }, [load]);

  const kpis = data ? [
    { key: 'ts', label: 'Total students', value: fmt(data.kpis.total_students), icon: Users },
    { key: 'am', label: 'Avg marks', value: fmt(data.kpis.avg_marks), icon: ShieldAlert },
    { key: 'gd', label: 'Good (≥50)', value: fmt(data.kpis.good), icon: CheckCircle2 },
    { key: 'wr', label: 'Warning (20–49)', value: fmt(data.kpis.warning), icon: AlertTriangle },
    { key: 'cr', label: 'Critical (<20)', value: fmt(data.kpis.critical), icon: TrendingDown },
  ] : [
    { key: 'ts', label: 'Total students', value: '—', icon: Users },
    { key: 'am', label: 'Avg marks', value: '—', icon: ShieldAlert },
    { key: 'gd', label: 'Good', value: '—', icon: CheckCircle2 },
    { key: 'wr', label: 'Warning', value: '—', icon: AlertTriangle },
    { key: 'cr', label: 'Critical', value: '—', icon: TrendingDown },
  ];

  return (
    <RepresentativeHeroShell
      onRefresh={load}
      eyebrow={activeSchool ? `Discipline · ${activeSchool.school_name}` : 'Discipline & Conduct'}
      title="Discipline Reports"
      subtitle="Monitor student discipline marks, identify at-risk students, and compare conduct across assigned schools."
      HeroIcon={ShieldAlert}
      headerRight={
        <div className="flex flex-wrap gap-2">
          <span className="inline-flex items-center rounded-full bg-black/15 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-white ring-1 ring-white/35">
            {loading ? <Loader2 size={12} className="animate-spin mr-1.5" /> : null}
            {loading ? 'Loading' : 'Live data'}
          </span>
        </div>
      }
      kpiTiles={kpis}
      pageBody={
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 space-y-5 pb-10">
          <div className="flex gap-1 bg-white rounded-2xl border border-black/[0.06] p-1 shadow-sm overflow-x-auto">
            {TABS.map((t) => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all whitespace-nowrap ${
                  tab === t.id ? 'bg-[#FEBF10]/15 text-[#1E3A5F] ring-1 ring-[#FEBF10]/30' : 'text-re-text-muted hover:text-re-text hover:bg-re-bg/50'
                }`}>
                <t.icon size={14} />
                {t.label}
              </button>
            ))}
          </div>

          {loading && !data ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="w-8 h-8 text-[#FEBF10] animate-spin mb-3" />
              <p className="text-sm text-re-text-muted font-medium">Loading discipline data...</p>
            </div>
          ) : error ? (
            <div className="text-center py-16">
              <ShieldAlert className="w-10 h-10 text-re-text-muted/40 mx-auto mb-3" />
              <p className="text-re-text font-semibold">{error}</p>
              <button onClick={load} className="mt-3 text-xs text-[#1E3A5F] font-semibold uppercase tracking-wider hover:underline">Try again</button>
            </div>
          ) : (
            <>
              {tab === 'overview' && <OverviewTab data={data} />}
              {tab === 'students' && <StudentsTab schoolId={activeSchoolId} />}
              {tab === 'analytics' && <AnalyticsTab data={data} />}
            </>
          )}
        </div>
      }
    />
  );
}
