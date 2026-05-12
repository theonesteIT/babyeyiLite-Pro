import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity, BarChart2, Clock, Eye, Loader2, RefreshCw, Search, Filter,
  CheckCircle2, XCircle, AlertTriangle, ChevronDown,
} from 'lucide-react';
import { useRepresentativeData } from '../../context/RepresentativeContext';
import api from '../../services/api';

function sp(schoolId) { return schoolId ? { school_id: schoolId } : {}; }
function fmt12(t) {
  if (!t) return '—';
  const [h, m] = t.split(':').map(Number);
  return `${(h % 12) || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
}

const STATUS_MAP = {
  on_time: { label: 'On Time', cls: 'bg-emerald-50 text-emerald-700', icon: CheckCircle2 },
  late:    { label: 'Late',    cls: 'bg-amber-50 text-amber-700',    icon: Clock },
  before:  { label: 'Early Exit', cls: 'bg-sky-50 text-sky-700',     icon: AlertTriangle },
  missed:  { label: 'Missed',  cls: 'bg-rose-50 text-rose-600',      icon: XCircle },
};

function StatusPill({ status }) {
  const s = STATUS_MAP[status] || STATUS_MAP.on_time;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${s.cls}`}>
      <s.icon size={10} /> {s.label}
    </span>
  );
}

function Stat({ label, value, color = 'text-slate-800' }) {
  return (
    <div className="rounded-xl border border-slate-200/80 bg-white p-4">
      <p className={`text-2xl font-bold tracking-tight ${color}`}>{value}</p>
      <p className="mt-1 text-[10px] font-medium uppercase tracking-wide text-slate-400">{label}</p>
    </div>
  );
}

function RateBar({ rate, className = '' }) {
  const color = rate >= 85 ? 'bg-emerald-500' : rate >= 60 ? 'bg-amber-400' : 'bg-rose-400';
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="h-1.5 flex-1 max-w-[80px] overflow-hidden rounded-full bg-slate-100">
        <div className={`h-full rounded-full transition-all duration-700 ${color}`} style={{ width: `${rate}%` }} />
      </div>
      <span className="text-[11px] font-semibold text-slate-600">{rate}%</span>
    </div>
  );
}

const TABS = [
  { key: 'live', label: 'Live Log', icon: Activity },
  { key: 'reports', label: 'Reports', icon: Eye },
  { key: 'analytics', label: 'Analytics', icon: BarChart2 },
];

export default function RepTeacherPeriodAttendance() {
  const { activeSchool, activeSchoolId } = useRepresentativeData();
  const schoolId = activeSchoolId != null && activeSchoolId !== '' ? Number(activeSchoolId) : undefined;

  const [tab, setTab] = useState('live');
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [timetable, setTimetable] = useState([]);
  const [settings, setSettings] = useState({});
  const [error, setError] = useState(null);

  const [filterDate, setFilterDate] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterClass, setFilterClass] = useState('');
  const [filterTeacher, setFilterTeacher] = useState('');
  const [searchQ, setSearchQ] = useState('');
  const [reportRows, setReportRows] = useState([]);
  const [loadingReports, setLoadingReports] = useState(false);

  const getToday = () => ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][new Date().getDay()];

  const loadPageData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const p = sp(schoolId);
      const [settingsRes, teachersRes, timetableRes, logsRes] = await Promise.all([
        api.get('/dos/teacher-period/settings', { params: p }),
        api.get('/dos/teacher-period/teachers', { params: p }),
        api.get('/dos/teacher-period/timetable', { params: { day: getToday(), ...p } }),
        api.get('/dos/teacher-period/logs', { params: { date: new Date().toISOString().slice(0, 10), ...p } }),
      ]);
      setSettings(settingsRes?.data?.data || {});
      setTeachers((teachersRes?.data?.data || []).map(t => ({
        id: t.teacher_id, name: t.teacher_name, uid: t.teacher_uid, card_uid: t.card_uid || '',
      })));
      setTimetable((timetableRes?.data?.data || []).map(s => ({
        id: s.id, teacher_id: s.teacher_id, teacher_name: s.teacher_name, class: s.class_name,
        subject: s.subject_name, start_time: String(s.start_time || '').slice(0, 5), end_time: String(s.end_time || '').slice(0, 5),
      })));
      setLogs((logsRes?.data?.data || []).map(l => ({
        id: l.id, teacher_id: l.teacher_id, teacher_name: l.teacher_name, class: l.class_name,
        subject: l.subject_name, period: l.period || `${String(l.start_time || '').slice(0, 5)}-${String(l.end_time || '').slice(0, 5)}`,
        start_time: String(l.start_time || '').slice(0, 5), end_time: String(l.end_time || '').slice(0, 5),
        entry_time: l.entry_time || null, exit_time: l.exit_time || null,
        exit_status: String(l.exit_status || '').toLowerCase() || null, scan_source: l.scan_source || null,
        status: String(l.status || 'ON_TIME').toLowerCase(), late_mins: Number(l.late_minutes || 0),
        date: l.period_date || new Date().toISOString().slice(0, 10),
      })));
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to load data');
    } finally { setLoading(false); }
  }, [schoolId]);

  useEffect(() => { loadPageData(); }, [loadPageData]);

  const loadReports = useCallback(async () => {
    setLoadingReports(true);
    try {
      const params = { ...sp(schoolId) };
      if (filterDate) params.date = filterDate;
      if (filterStatus) params.status = filterStatus.toUpperCase();
      if (filterClass) params.class_name = filterClass;
      if (filterTeacher) {
        const t = teachers.find(x => x.name === filterTeacher);
        if (t?.id) params.teacher_id = t.id;
      }
      const res = await api.get('/dos/teacher-period/logs', { params });
      setReportRows((res?.data?.data || []).map(l => ({
        id: l.id, teacher_name: l.teacher_name, class: l.class_name, subject: l.subject_name,
        period: `${String(l.start_time || '').slice(0, 5)}-${String(l.end_time || '').slice(0, 5)}`,
        entry_time: l.entry_time || null, exit_time: l.exit_time || null,
        exit_status: String(l.exit_status || '').toLowerCase() || null,
        status: String(l.status || 'ON_TIME').toLowerCase(), late_mins: Number(l.late_minutes || 0),
        date: l.period_date || '',
      })));
    } catch (_) {} finally { setLoadingReports(false); }
  }, [filterDate, filterStatus, filterClass, filterTeacher, teachers, schoolId]);

  useEffect(() => { if (tab === 'reports') loadReports(); }, [tab, loadReports]);

  const filteredLogs = useMemo(() => logs.filter(l => {
    if (searchQ && !l.teacher_name?.toLowerCase().includes(searchQ.toLowerCase()) && !l.subject?.toLowerCase().includes(searchQ.toLowerCase())) return false;
    return true;
  }), [logs, searchQ]);

  const totalPeriods = logs.length;
  const onTimeCount = logs.filter(l => l.status === 'on_time').length;
  const lateCount = logs.filter(l => l.status === 'late').length;
  const missedCount = logs.filter(l => l.status === 'missed').length;
  const attendancePct = totalPeriods > 0 ? Math.round(((onTimeCount + lateCount) / totalPeriods) * 100) : 0;

  const teacherStats = useMemo(() => teachers.map(t => {
    const tL = logs.filter(l => l.teacher_id === t.id);
    return { ...t, total: tL.length, on_time: tL.filter(l => l.status === 'on_time').length, late: tL.filter(l => l.status === 'late').length, missed: tL.filter(l => l.status === 'missed').length };
  }).filter(t => t.total > 0).sort((a, b) => b.total - a.total), [teachers, logs]);

  const uniqueClasses = useMemo(() => [...new Set(logs.map(l => l.class).filter(Boolean))].sort(), [logs]);

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
                  {activeSchool ? activeSchool.school_name : 'All Schools'} · Teacher Period Attendance
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white tracking-tight" style={{ fontFamily: "'Montserrat',sans-serif" }}>
                Teacher Period Attendance
              </h1>
              <p className="text-sm text-white/50 mt-2 max-w-xl leading-relaxed">
                Track teacher class-period check-ins, late entries, early exits, and attendance analytics.
              </p>
            </div>
            <button onClick={loadPageData} disabled={loading}
              className="inline-flex items-center gap-1.5 rounded-xl bg-white/10 px-3.5 py-2.5 text-[11px] font-semibold text-white ring-1 ring-white/10 hover:bg-white/20 transition disabled:opacity-50 shrink-0">
              {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />} Refresh
            </button>
          </div>
        </div>
      </div>

      <div className="px-4 sm:px-6 lg:px-8 -mt-8 relative z-20 max-w-[1600px] mx-auto space-y-5">
        {error && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
            {error}
            <button onClick={loadPageData} className="ml-3 underline">Retry</button>
          </div>
        )}

        {/* KPI row */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          <Stat label="Total periods" value={totalPeriods} />
          <Stat label="On time" value={onTimeCount} color="text-emerald-700" />
          <Stat label="Late entries" value={lateCount} color="text-amber-700" />
          <Stat label="Missed" value={missedCount} color="text-rose-600" />
          <Stat label="Attendance rate" value={`${attendancePct}%`} />
        </div>

        {/* Main card */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden">
          {/* Tabs */}
          <div className="flex flex-wrap gap-1 p-2 bg-slate-50/50 border-b border-slate-100">
            {TABS.map(({ key, label, icon: Icon }) => (
              <button key={key} type="button" onClick={() => setTab(key)}
                className={`inline-flex items-center gap-2 h-9 rounded-lg px-4 text-[11px] font-semibold tracking-wide transition-all ${
                  tab === key ? 'bg-[#000435] text-white shadow-sm' : 'text-slate-500 hover:bg-white hover:text-slate-700'
                }`}>
                <Icon size={14} strokeWidth={1.75} /> {label}
              </button>
            ))}
          </div>

          <div className="p-4 sm:p-6">
            {/* LIVE LOG TAB */}
            {tab === 'live' && (
              <div className="space-y-5">
                <div className="relative max-w-sm">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input value={searchQ} onChange={e => setSearchQ(e.target.value)} placeholder="Search teacher or subject…"
                    className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-8 pr-3 text-xs font-medium text-slate-700 outline-none focus:border-slate-400 transition" />
                </div>

                <div className="overflow-hidden rounded-xl border border-slate-200">
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[700px]">
                      <thead><tr className="bg-slate-50/60">
                        {['Teacher', 'Class', 'Subject', 'Period', 'Entry', 'Exit', 'Status', 'Late (min)'].map(h => (
                          <th key={h} className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wide text-slate-400">{h}</th>
                        ))}
                      </tr></thead>
                      <tbody>
                        {filteredLogs.map(l => (
                          <tr key={l.id} className="border-t border-slate-50 hover:bg-slate-50/50 transition">
                            <td className="px-4 py-2.5 text-xs font-medium text-slate-700">{l.teacher_name}</td>
                            <td className="px-4 py-2.5 text-xs text-slate-600">{l.class}</td>
                            <td className="px-4 py-2.5 text-xs text-slate-600">{l.subject}</td>
                            <td className="px-4 py-2.5 text-xs font-mono text-slate-500">{fmt12(l.start_time)} - {fmt12(l.end_time)}</td>
                            <td className="px-4 py-2.5 text-xs font-mono text-emerald-600">{l.entry_time ? fmt12(l.entry_time) : '—'}</td>
                            <td className="px-4 py-2.5 text-xs font-mono text-sky-600">{l.exit_time ? fmt12(l.exit_time) : '—'}</td>
                            <td className="px-4 py-2.5"><StatusPill status={l.exit_status === 'before' ? 'before' : l.status} /></td>
                            <td className="px-4 py-2.5 text-xs font-semibold text-slate-600">{l.late_mins > 0 ? l.late_mins : '—'}</td>
                          </tr>
                        ))}
                        {!filteredLogs.length && (
                          <tr><td colSpan={8} className="py-16 text-center text-sm font-medium text-slate-400">
                            {loading ? 'Loading…' : 'No period logs for today.'}
                          </td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* REPORTS TAB */}
            {tab === 'reports' && (
              <div className="space-y-5">
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-slate-400">Date</label>
                    <input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)}
                      className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 outline-none focus:border-slate-400 transition" />
                  </div>
                  <div>
                    <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-slate-400">Status</label>
                    <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                      className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 outline-none focus:border-slate-400 transition">
                      <option value="">All</option>
                      <option value="on_time">On Time</option>
                      <option value="late">Late</option>
                      <option value="missed">Missed</option>
                      <option value="before">Early Exit</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-slate-400">Class</label>
                    <select value={filterClass} onChange={e => setFilterClass(e.target.value)}
                      className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 outline-none focus:border-slate-400 transition">
                      <option value="">All Classes</option>
                      {uniqueClasses.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-slate-400">Teacher</label>
                    <select value={filterTeacher} onChange={e => setFilterTeacher(e.target.value)}
                      className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 outline-none focus:border-slate-400 transition">
                      <option value="">All Teachers</option>
                      {teachers.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
                    </select>
                  </div>
                </div>

                <div className="overflow-hidden rounded-xl border border-slate-200">
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[700px]">
                      <thead><tr className="bg-slate-50/60">
                        {['Date', 'Teacher', 'Class', 'Subject', 'Period', 'Entry', 'Exit', 'Status', 'Late'].map(h => (
                          <th key={h} className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wide text-slate-400">{h}</th>
                        ))}
                      </tr></thead>
                      <tbody>
                        {reportRows.map(l => (
                          <tr key={l.id} className="border-t border-slate-50 hover:bg-slate-50/50 transition">
                            <td className="px-4 py-2.5 text-xs font-medium text-slate-600">{l.date || '—'}</td>
                            <td className="px-4 py-2.5 text-xs font-medium text-slate-700">{l.teacher_name}</td>
                            <td className="px-4 py-2.5 text-xs text-slate-600">{l.class}</td>
                            <td className="px-4 py-2.5 text-xs text-slate-600">{l.subject}</td>
                            <td className="px-4 py-2.5 text-xs font-mono text-slate-500">{l.period}</td>
                            <td className="px-4 py-2.5 text-xs font-mono text-emerald-600">{l.entry_time ? fmt12(l.entry_time) : '—'}</td>
                            <td className="px-4 py-2.5 text-xs font-mono text-sky-600">{l.exit_time ? fmt12(l.exit_time) : '—'}</td>
                            <td className="px-4 py-2.5"><StatusPill status={l.exit_status === 'before' ? 'before' : l.status} /></td>
                            <td className="px-4 py-2.5 text-xs font-semibold text-slate-600">{l.late_mins > 0 ? `${l.late_mins}m` : '—'}</td>
                          </tr>
                        ))}
                        {!reportRows.length && (
                          <tr><td colSpan={9} className="py-16 text-center text-sm font-medium text-slate-400">
                            {loadingReports ? 'Loading…' : 'No records found for selected filters.'}
                          </td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* ANALYTICS TAB */}
            {tab === 'analytics' && (
              <div className="space-y-5">
                <div className="overflow-hidden rounded-xl border border-slate-200">
                  <div className="border-b border-slate-100 px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    Teacher Performance — {teacherStats.length} teachers with activity
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[600px]">
                      <thead><tr className="bg-slate-50/60">
                        {['Teacher', 'Total Periods', 'On Time', 'Late', 'Missed', 'Rate'].map(h => (
                          <th key={h} className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wide text-slate-400">{h}</th>
                        ))}
                      </tr></thead>
                      <tbody>
                        {teacherStats.map(t => {
                          const rate = t.total > 0 ? Math.round(((t.on_time + t.late) / t.total) * 100) : 0;
                          return (
                            <tr key={t.id} className="border-t border-slate-50 hover:bg-slate-50/50 transition">
                              <td className="px-4 py-2.5 text-xs font-medium text-slate-700">{t.name}</td>
                              <td className="px-4 py-2.5 text-xs text-slate-600">{t.total}</td>
                              <td className="px-4 py-2.5 text-xs font-semibold text-emerald-700">{t.on_time}</td>
                              <td className="px-4 py-2.5 text-xs font-semibold text-amber-700">{t.late}</td>
                              <td className="px-4 py-2.5 text-xs font-semibold text-rose-600">{t.missed}</td>
                              <td className="px-4 py-2.5"><RateBar rate={rate} /></td>
                            </tr>
                          );
                        })}
                        {!teacherStats.length && (
                          <tr><td colSpan={6} className="py-16 text-center text-sm font-medium text-slate-400">No teacher activity data yet.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Today's timetable */}
                <div className="overflow-hidden rounded-xl border border-slate-200">
                  <div className="border-b border-slate-100 px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    Today's Timetable — {getToday()} — {timetable.length} slots
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[500px]">
                      <thead><tr className="bg-slate-50/60">
                        {['Teacher', 'Class', 'Subject', 'Time'].map(h => (
                          <th key={h} className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wide text-slate-400">{h}</th>
                        ))}
                      </tr></thead>
                      <tbody>
                        {timetable.map(s => (
                          <tr key={s.id} className="border-t border-slate-50 hover:bg-slate-50/50 transition">
                            <td className="px-4 py-2.5 text-xs font-medium text-slate-700">{s.teacher_name}</td>
                            <td className="px-4 py-2.5 text-xs text-slate-600">{s.class}</td>
                            <td className="px-4 py-2.5 text-xs text-slate-600">{s.subject}</td>
                            <td className="px-4 py-2.5 text-xs font-mono text-slate-500">{fmt12(s.start_time)} - {fmt12(s.end_time)}</td>
                          </tr>
                        ))}
                        {!timetable.length && (
                          <tr><td colSpan={4} className="py-12 text-center text-sm font-medium text-slate-400">No timetable data for today.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
