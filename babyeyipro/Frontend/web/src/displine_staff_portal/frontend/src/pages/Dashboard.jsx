import { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Clock,
  FileText,
  Loader2,
  MessageSquare,
  RefreshCw,
  ShieldAlert,
  TrendingUp,
  UserCheck,
  Users,
  Phone,
  Printer,
  X,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { PORTAL } from '../config/portal';

const DEFAULT_TOTAL_MARKS = 100;

const Badge = ({ status }) => {
  const tone = {
    critical: 'bg-red-100 text-red-700 border-red-200',
    warning: 'bg-amber-100 text-amber-700 border-amber-200',
    good: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    approved: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    pending: 'bg-amber-100 text-amber-700 border-amber-200',
    rejected: 'bg-red-100 text-red-700 border-red-200',
  };

  const cls = tone[status] || 'bg-slate-100 text-slate-600 border-slate-200';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider border ${cls}`}>
      {status}
    </span>
  );
};

const LineAreaChart = ({ data = [], labelKey = 'label', valueKey = 'value', color = '#1E3A5F', height = 140, showGrid = true }) => {
  if (!data.length) return <div className="flex items-center justify-center text-slate-300 text-xs" style={{ height }}>No data</div>;

  const W = 500;
  const H = height;
  const PAD = { top: 16, bottom: 28, left: 36, right: 12 };
  const vals = data.map((d) => Number(d[valueKey]) || 0);
  const max = Math.max(...vals, 1);
  const xStep = (W - PAD.left - PAD.right) / (data.length - 1 || 1);
  const toY = (v) => PAD.top + (1 - v / max) * (H - PAD.top - PAD.bottom);
  const toX = (i) => PAD.left + i * xStep;
  const pts = data.map((d, i) => ({ x: toX(i), y: toY(Number(d[valueKey]) || 0) }));
  const linePath = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const areaPath = `${linePath} L${pts[pts.length - 1].x.toFixed(1)},${(H - PAD.bottom).toFixed(1)} L${PAD.left},${(H - PAD.bottom).toFixed(1)} Z`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height }}>
      <defs>
        <linearGradient id={`ag${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      {showGrid && [0.25, 0.5, 0.75, 1].map((f) => {
        const y = PAD.top + (1 - f) * (H - PAD.top - PAD.bottom);
        return (
          <g key={f}>
            <line x1={PAD.left} y1={y} x2={W - PAD.right} y2={y} stroke="#e2e8f0" strokeWidth="1" strokeDasharray="4,3" />
            <text x={PAD.left - 4} y={y + 4} textAnchor="end" fontSize="9" fill="#94a3b8" fontWeight="600">
              {Math.round(max * f)}
            </text>
          </g>
        );
      })}
      <path d={areaPath} fill={`url(#ag${color.replace('#', '')})`} />
      <path d={linePath} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {pts.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r="4" fill="white" stroke={color} strokeWidth="2.5" />
          <circle cx={p.x} cy={p.y} r="2" fill={color} />
          <text x={p.x} y={H - PAD.bottom + 12} textAnchor="middle" fontSize="9" fill="#64748b" fontWeight="600">
            {data[i][labelKey]}
          </text>
          <text x={p.x} y={p.y - 9} textAnchor="middle" fontSize="9" fill={color} fontWeight="800">
            {vals[i]}
          </text>
        </g>
      ))}
    </svg>
  );
};

const DonutChart = ({ data = [], size = 140 }) => {
  if (!data.length) return null;

  const total = data.reduce((sum, item) => sum + item.value, 0);
  const cx = size / 2;
  const cy = size / 2;
  const R = size / 2 - 8;
  const r = R * 0.58;

  if (total === 0) {
    return (
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={cx} cy={cy} r={R} fill="#f1f5f9" stroke="white" strokeWidth="2" />
        <circle cx={cx} cy={cy} r={r - 4} fill="white" />
        <text x={cx} y={cy - 4} textAnchor="middle" fontSize="13" fontWeight="900" fill="#1e293b">0</text>
        <text x={cx} y={cy + 10} textAnchor="middle" fontSize="7" fontWeight="600" fill="#94a3b8">TOTAL</text>
      </svg>
    );
  }

  const slices = data.reduce(
    (acc, d) => {
      let a = (d.value / total) * 2 * Math.PI;
      if (a >= 2 * Math.PI) a = Math.PI * 1.9999;
      const startAngle = acc.angle;
      const endAngle = startAngle + a;
      const x1 = cx + R * Math.cos(startAngle);
      const y1 = cy + R * Math.sin(startAngle);
      const x2 = cx + R * Math.cos(endAngle);
      const y2 = cy + R * Math.sin(endAngle);
      const xi1 = cx + r * Math.cos(startAngle);
      const yi1 = cy + r * Math.sin(startAngle);
      const xi2 = cx + r * Math.cos(endAngle);
      const yi2 = cy + r * Math.sin(endAngle);
      const large = a > Math.PI ? 1 : 0;

      acc.slices.push({
        ...d,
        path: `M${x1},${y1} A${R},${R} 0 ${large},1 ${x2},${y2} L${xi2},${yi2} A${r},${r} 0 ${large},0 ${xi1},${yi1} Z`,
      });
      return { angle: endAngle, slices: acc.slices };
    },
    { angle: -Math.PI / 2, slices: [] }
  ).slices;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {slices.map((slice, i) => <path key={i} d={slice.path} fill={slice.color} stroke="white" strokeWidth="2" />)}
      <circle cx={cx} cy={cy} r={r - 4} fill="white" />
      <text x={cx} y={cy - 4} textAnchor="middle" fontSize="13" fontWeight="900" fill="#1e293b">{total}</text>
      <text x={cx} y={cy + 10} textAnchor="middle" fontSize="7" fontWeight="600" fill="#94a3b8">TOTAL</text>
    </svg>
  );
};

const OverviewCard = ({ title, icon, iconColor, dataPie, subStats, trendColor }) => {
  const Icon = icon;

  return (
    <div className="bg-white border border-slate-200 rounded-[24px] shadow-2xl p-6 flex flex-col items-center relative w-full">
      <div className="flex items-center justify-between gap-2 mb-6 w-full">
        <div className="flex items-center gap-2">
          <Icon size={16} className={iconColor} />
          <h3 className="text-[11px] font-black text-slate-800 uppercase tracking-[0.2em]">{title}</h3>
        </div>
        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Live</span>
      </div>

      <DonutChart data={dataPie} size={150} />

      <div className="w-full mt-6 space-y-3">
        <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-slate-500 bg-slate-50 p-3 rounded-xl border border-slate-100 shadow-inner">
          <div className="flex flex-col items-center flex-1">
            <span className="text-[#1E3A5F] font-black">{subStats.left.count}</span>
            <span className="text-[8px] font-black text-slate-400 mt-0.5 tracking-[0.2em]">{subStats.left.label}</span>
          </div>
          <div className="w-px h-8 bg-slate-200" />
          <div className="flex flex-col items-center flex-1">
            <span className={`${trendColor} font-black`}>{subStats.right.count}</span>
            <span className="text-[8px] font-black text-slate-400 mt-0.5 tracking-[0.2em]">{subStats.right.label}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

function getCurrentAcademicYear() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  return month >= 7 ? `${year}-${year + 1}` : `${year - 1}-${year}`;
}

function getCurrentTerm() {
  const month = new Date().getMonth() + 1;
  if (month <= 4) return 'Term 2';
  if (month <= 8) return 'Term 3';
  return 'Term 1';
}

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function getMarksPct(student, totalMarks) {
  const raw = toNumber(student?.marks_remaining, 0);
  if (raw <= 100 && totalMarks > 100) return raw;
  if (!totalMarks) return raw;
  return Math.max(0, Math.min(100, (raw / totalMarks) * 100));
}

function formatDateTime(value) {
  if (!value) return 'No time';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return 'No time';
  return d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

function activityMeta(activity) {
  if (activity.kind === 'permission') {
    if (activity.status === 'APPROVED') return { icon: UserCheck, tone: 'approved' };
    if (activity.status === 'PENDING') return { icon: Clock, tone: 'pending' };
    return { icon: ShieldAlert, tone: 'rejected' };
  }

  if (activity.tone === 'critical') return { icon: AlertTriangle, tone: 'critical' };
  if (activity.tone === 'warning') return { icon: ShieldAlert, tone: 'warning' };
  return { icon: Users, tone: 'good' };
}

export default function Dashboard() {
    const [filters, setFilters] = useState({
      academic_year: getCurrentAcademicYear(),
      term: getCurrentTerm(),
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [lastUpdated, setLastUpdated] = useState(null);
    const [dashboard, setDashboard] = useState({
      totalMarks: DEFAULT_TOTAL_MARKS,
      reportSummary: null,
      permissions: [],
      students: [],
    });

    const [attendanceModal, setAttendanceModal] = useState(null); // 'absent' | 'missed' | null
    const [attendanceRows, setAttendanceRows] = useState([]);
    const [attendanceLoading, setAttendanceLoading] = useState(false);
    const [attendanceError, setAttendanceError] = useState(null);

    const [insightModal, setInsightModal] = useState(null); // 'cases' | 'risk' | null
    const [casesRows, setCasesRows] = useState([]);
    const [casesLoading, setCasesLoading] = useState(false);
    const [casesError, setCasesError] = useState(null);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);

    const { academic_year, term } = filters;

    const [reportRes, permissionsRes, settingsRes, studentsRes] = await Promise.allSettled([
      api.get('/discipline/report-summary', { params: { academic_year, term } }),
      api.get('/permissions'),
      api.get('/discipline/settings'),
      api.get('/discipline/students-summary', { params: { academic_year, term } }),
    ]);

    const failures = [];

    const reportSummary = reportRes.status === 'fulfilled' && reportRes.value.data?.success
      ? reportRes.value.data.data || null
      : (failures.push('conduct summary'), null);

    const permissions = permissionsRes.status === 'fulfilled' && permissionsRes.value.data?.success
      ? permissionsRes.value.data.data || []
      : (failures.push('permissions'), []);

    const studentsRaw = studentsRes.status === 'fulfilled' && studentsRes.value.data?.success
      ? studentsRes.value.data.data || []
      : (failures.push('learner standings'), []);

    // Map discipline_remaining to the format expected by getMarksPct (marks_remaining)
    const students = studentsRaw.map(s => ({
      ...s,
      marks_remaining: s.discipline_remaining
    }));

    const totalMarks = settingsRes.status === 'fulfilled' && settingsRes.value.data?.success
      ? toNumber(settingsRes.value.data.data?.total_marks, toNumber(reportSummary?.total_marks_default, DEFAULT_TOTAL_MARKS))
      : toNumber(reportSummary?.total_marks_default, DEFAULT_TOTAL_MARKS);

    if (failures.length === 4) {
      setDashboard({
        totalMarks: DEFAULT_TOTAL_MARKS,
        reportSummary: null,
        permissions: [],
        students: [],
      });
      setError('Could not load dashboard data from the live portal services.');
      setLoading(false);
      return;
    }

    if (failures.length > 0) {
      setError(`Some dashboard panels could not refresh: ${failures.join(', ')}.`);
    }

    setDashboard({ totalMarks, reportSummary, permissions, students });
    setLastUpdated(new Date());
    setLoading(false);
  }, [filters]);

  useEffect(() => {
    Promise.resolve().then(loadDashboard);
  }, [loadDashboard]);

  const derived = useMemo(() => {
    const totalMarks = dashboard.totalMarks || DEFAULT_TOTAL_MARKS;
    const students = dashboard.students || [];
    const permissions = dashboard.permissions || [];
    const reportSummary = dashboard.reportSummary;
    const now = lastUpdated ? new Date(lastUpdated).getTime() : 0;

    const criticalStudents = students.filter((student) => getMarksPct(student, totalMarks) < 50);
    const warningStudents = students.filter((student) => {
      const pct = getMarksPct(student, totalMarks);
      return pct >= 50 && pct < 75;
    });
    const goodStudents = students.filter((student) => getMarksPct(student, totalMarks) >= 75);
    const atRiskStudents = criticalStudents.concat(warningStudents);
    const activePermissions = permissions.filter((permission) => {
      const endsAt = new Date(permission.ends_at || permission.end_date || permission.updated_at || permission.created_at).getTime();
      return permission.status !== 'REJECTED' && (!Number.isFinite(endsAt) || endsAt >= now);
    });

    const avgMarks = students.length
      ? Math.round(students.reduce((sum, student) => sum + getMarksPct(student, totalMarks), 0) / students.length)
      : 0;

    const classTrend = (reportSummary?.by_class || [])
      .map((row) => ({
        label: row.class_name || 'Class',
        value: toNumber(row.case_count, 0),
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);

    const watchlist = [...students]
      .filter((student) => getMarksPct(student, totalMarks) < 100)
      .sort((a, b) => getMarksPct(a, totalMarks) - getMarksPct(b, totalMarks))
      .slice(0, 4)
      .map((student) => ({
        label: student.class_name || 'Unassigned',
        value: Math.round(getMarksPct(student, totalMarks)),
        studentName: `${student.first_name || ''} ${student.last_name || ''}`.trim() || student.student_uid || 'Learner',
      }));

    const recentPermissions = [...permissions]
      .sort((a, b) => new Date(b.updated_at || b.created_at || b.starts_at).getTime() - new Date(a.updated_at || a.created_at || a.starts_at).getTime())
      .slice(0, 4)
      .map((permission) => ({
        id: `permission-${permission.id}`,
        kind: 'permission',
        title: `${permission.first_name || ''} ${permission.last_name || ''}`.trim() || 'Learner permission',
        detail: `${permission.permission_type || 'Permission'}${permission.class_name ? ` · ${permission.class_name}` : ''}`,
        time: formatDateTime(permission.updated_at || permission.created_at || permission.starts_at),
        status: (permission.status || 'PENDING').toLowerCase(),
      }));

    const atRiskSnapshots = criticalStudents.concat(warningStudents)
      .slice(0, Math.max(0, 4 - recentPermissions.length))
      .map((student) => ({
        id: `student-${student.id}`,
        kind: 'student',
        title: `${student.first_name || ''} ${student.last_name || ''}`.trim() || student.student_uid || 'Learner',
        detail: `${student.class_name || 'Class not set'} · ${Math.round(getMarksPct(student, totalMarks))}% conduct remaining`,
        time: student.student_uid || 'Student record',
        tone: getMarksPct(student, totalMarks) < 50 ? 'critical' : 'warning',
        status: getMarksPct(student, totalMarks) < 50 ? 'critical' : 'warning',
      }));
    return {
      activePeriod: {
        academic_year: reportSummary?.meta?.academic_year || filters.academic_year,
        term: reportSummary?.meta?.term || filters.term,
        total_marks: totalMarks,
      },
      studentCount: students.length,
      totalMarks,
      casesToday: toNumber(reportSummary?.case_count, 0),
      // Students affected by discipline cases (not conduct standing)
      studentsAffected: toNumber(reportSummary?.students_affected, 0),
      // At-risk learners based on conduct standing thresholds
      atRiskCount: atRiskStudents.length,
      atRiskRows: atRiskStudents
        .map((s) => ({
          id: s.id,
          name: `${s.first_name || ''} ${s.last_name || ''}`.trim() || s.student_uid || 'Learner',
          uid: s.student_uid || s.student_code || `#${s.id}`,
          cls: s.class_name || '—',
          pct: Math.round(getMarksPct(s, totalMarks)),
          tone: getMarksPct(s, totalMarks) < 50 ? 'critical' : 'warning',
        }))
        .sort((a, b) => a.pct - b.pct),
      activePermissions: activePermissions.length,
      averageStanding: avgMarks,
      classTrend,
      watchlist,
      recentActivity: [...recentPermissions, ...atRiskSnapshots].slice(0, 4),
      standingPie: [
        { label: 'Good', value: goodStudents.length, color: '#10b981' },
        { label: 'Warning', value: warningStudents.length, color: '#f59e0b' },
        { label: 'Critical', value: criticalStudents.length, color: '#ef4444' },
      ],
      approvedPermissions: activePermissions.filter((permission) => permission.status === 'APPROVED').length,
      pendingPermissions: permissions.filter((permission) => permission.status === 'PENDING').length,
      permissionRows: activePermissions
        .sort((a, b) => new Date(a.ends_at || a.updated_at || a.created_at).getTime() - new Date(b.ends_at || b.updated_at || b.created_at).getTime())
        .slice(0, 4),
      demographics: reportSummary?.demographics || { boys: 0, girls: 0 },
      attendanceToday: reportSummary?.attendance_today || { absent: 0, missed_courses: 0 },
    };
  }, [dashboard, lastUpdated]);

  const openAttendanceModal = useCallback(async (kind) => {
    setAttendanceModal(kind);
    setAttendanceRows([]);
    setAttendanceError(null);
    setAttendanceLoading(true);
    try {
      const res = await api.get('/discipline/attendance-today-details', { params: { kind } });
      if (res.data?.success) {
        setAttendanceRows(res.data.data || []);
      } else {
        setAttendanceError(res.data?.message || 'Failed to load details.');
      }
    } catch (e) {
      console.error('attendance-today-details failed', e);
      setAttendanceError('Failed to load attendance details.');
    } finally {
      setAttendanceLoading(false);
    }
  }, []);

  const AttendanceModal = attendanceModal ? createPortal(
    <div className="fixed inset-0 z-[240] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white w-full max-w-2xl max-h-[90vh] rounded-[28px] shadow-2xl border border-black/5 overflow-hidden flex flex-col">
        <div className="px-6 py-5 bg-gradient-to-br from-[#1E3A5F] to-[#0D2644] text-white shrink-0">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[9px] font-black uppercase tracking-[0.3em]" style={{ color: "#FEBF10" }}>
                Attendance • Today
              </p>
              <h3 className="text-base font-black uppercase tracking-widest leading-tight mt-1 truncate">
                {attendanceModal === 'absent' ? 'Absent today' : 'Missed classes today'}
              </h3>
              <p className="text-[9px] font-bold text-white/60 uppercase tracking-widest mt-1 truncate">
                {derived.activePeriod.academic_year} · {derived.activePeriod.term}
              </p>
            </div>
            <button
              onClick={() => setAttendanceModal(null)}
              className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-all shrink-0"
              title="Close"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="px-6 py-5 overflow-y-auto">
          {attendanceError && (
            <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-red-700">
              {attendanceError}
            </div>
          )}

          {attendanceLoading ? (
            <div className="py-16 flex flex-col items-center justify-center text-slate-400 gap-3">
              <Loader2 className="animate-spin" />
              <p className="text-[10px] font-black uppercase tracking-widest">Loading details…</p>
            </div>
          ) : attendanceRows.length === 0 ? (
            <div className="py-14 text-center text-slate-400">
              <div className="mx-auto w-32 h-32 opacity-25">
                <img
                  src={import.meta.env.BASE_URL + "undraw_no-data_ig65 (1).svg"}
                  alt="Empty"
                  className="w-full h-full object-contain grayscale"
                />
              </div>
              <p className="mt-3 text-[10px] font-black uppercase tracking-widest text-slate-400">
                Nothing flagged for review
              </p>
              <p className="mt-2 text-[9px] font-bold uppercase tracking-widest text-slate-300">
                Try refresh or check later
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {attendanceRows.map((r) => {
                const name = `${r.first_name || ''} ${r.last_name || ''}`.trim() || 'Learner';
                const uid = r.student_uid || r.student_code || `#${r.id}`;
                const cls = r.class_name || '—';
                const parentPhone = r.father_phone || r.mother_phone || '';
                const callDisabled = !parentPhone;
                return (
                  <div key={`${r.id}-${uid}`} className="rounded-2xl border border-black/5 bg-white shadow-sm overflow-hidden">
                    <div className="px-4 py-3 flex items-start gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0">
                        <Users size={16} className="text-[#1E3A5F]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-black text-slate-800 uppercase tracking-tight truncate">{name}</p>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1 truncate">{uid} • {cls}</p>
                        {attendanceModal === 'absent' ? (
                          <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-2">
                            Status: <span className="font-black text-amber-700">{r.status || 'ABSENT'}</span>
                          </p>
                        ) : (
                          <div className="mt-2">
                            {(r.missed_periods && r.missed_periods.length > 0) ? (
                              <div className="space-y-1">
                                {r.missed_periods.slice(0, 6).map((p, idx) => (
                                  <div key={idx} className="flex items-center justify-between text-[9px] font-black uppercase tracking-widest text-slate-500 bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 shadow-inner">
                                    <span className="truncate mr-3">{p.subject_name || 'Period'}</span>
                                    <span className="text-[#1E3A5F] shrink-0">{p.start_time} - {p.end_time}</span>
                                  </div>
                                ))}
                                {r.missed_periods.length > 6 && (
                                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                                    +{r.missed_periods.length - 6} more periods
                                  </p>
                                )}
                              </div>
                            ) : (
                              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                                {r.missed_periods_note || r.remarks || 'Missed classes flagged.'}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col gap-2 shrink-0">
                        <a
                          href={callDisabled ? undefined : `tel:${parentPhone}`}
                          aria-disabled={callDisabled}
                          title={callDisabled ? 'No parent phone number' : `Call ${parentPhone}`}
                          className={`h-9 px-3 rounded-2xl flex items-center justify-center gap-2 text-[9px] font-black uppercase tracking-widest border transition-all ${
                            callDisabled ? 'bg-slate-50 text-slate-300 border-slate-100 pointer-events-none' : 'bg-white border-black/5 hover:bg-slate-50'
                          }`}
                        >
                          <Phone size={14} className="text-[#FEBF10]" />
                          Call
                        </a>
                        <button
                          onClick={() => window.location.assign('/attendance')}
                          className="h-9 px-3 rounded-2xl flex items-center justify-center gap-2 text-[9px] font-black uppercase tracking-widest text-white shadow-md hover:scale-[1.02] active:scale-95 transition-all"
                          style={{ background: "linear-gradient(135deg, #1E3A5F 0%, #0D2644 100%)" }}
                          title="Open attendance page"
                        >
                          <Printer size={14} className="text-[#FEBF10]" />
                          Open
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  ) : null;

  const openCasesModal = useCallback(async () => {
    setInsightModal('cases');
    setCasesRows([]);
    setCasesError(null);
    setCasesLoading(true);
    try {
      const res = await api.get('/discipline/cases', {
        params: {
          academic_year: filters.academic_year,
          term: filters.term,
          limit: 80,
        },
      });
      if (res.data?.success) setCasesRows(res.data.data || []);
      else setCasesError(res.data?.message || 'Failed to load cases.');
    } catch (e) {
      console.error('discipline/cases failed', e);
      setCasesError('Failed to load cases.');
    } finally {
      setCasesLoading(false);
    }
  }, [filters.academic_year, filters.term]);

  const InsightModal = insightModal ? createPortal(
    <div className="fixed inset-0 z-[245] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white w-full max-w-3xl max-h-[90vh] rounded-[28px] shadow-2xl border border-black/5 overflow-hidden flex flex-col">
        <div className="px-6 py-5 bg-gradient-to-br from-[#1E3A5F] to-[#0D2644] text-white shrink-0">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[9px] font-black uppercase tracking-[0.3em]" style={{ color: "#FEBF10" }}>
                Dashboard insight
              </p>
              <h3 className="text-base font-black uppercase tracking-widest leading-tight mt-1 truncate">
                {insightModal === 'cases' ? 'Cases this term' : 'At-risk students'}
              </h3>
              <p className="text-[9px] font-bold text-white/60 uppercase tracking-widest mt-1 truncate">
                {derived.activePeriod.academic_year} · {derived.activePeriod.term}
              </p>
            </div>
            <button
              onClick={() => setInsightModal(null)}
              className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-all shrink-0"
              title="Close"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="px-6 py-5 overflow-y-auto">
          {insightModal === 'cases' && (
            <>
              {casesError && (
                <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-red-700">
                  {casesError}
                </div>
              )}

              {casesLoading ? (
                <div className="py-16 flex flex-col items-center justify-center text-slate-400 gap-3">
                  <Loader2 className="animate-spin" />
                  <p className="text-[10px] font-black uppercase tracking-widest">Loading cases…</p>
                </div>
              ) : casesRows.length === 0 ? (
                <div className="py-14 text-center text-slate-400">
                  <div className="mx-auto w-32 h-32 opacity-25">
                    <img
                      src={import.meta.env.BASE_URL + "undraw_no-data_ig65 (1).svg"}
                      alt="Empty"
                      className="w-full h-full object-contain grayscale"
                    />
                  </div>
                  <p className="mt-3 text-[10px] font-black uppercase tracking-widest text-slate-400">
                    No cases recorded in this period
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 border border-slate-100 rounded-2xl overflow-hidden">
                  {casesRows.map((c) => {
                    const name = `${c.first_name || ''} ${c.last_name || ''}`.trim() || 'Learner';
                    const uid = c.student_uid || c.student_code || `#${c.student_id}`;
                    return (
                      <div key={c.id} className="px-5 py-4 hover:bg-slate-50 transition-all">
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0">
                            <p className="font-black text-slate-800 text-[11px] uppercase tracking-tight truncate">
                              {name} <span className="text-slate-400 font-bold">({uid})</span>
                            </p>
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1 truncate">
                              {c.class_name || '—'} · {c.lesson_subject || 'General'} · {formatDateTime(c.created_at)}
                            </p>
                            {c.description && (
                              <p className="text-[11px] font-bold text-slate-600 mt-2">
                                {c.description}
                              </p>
                            )}
                          </div>
                          <div className="shrink-0 text-right">
                            <p className="text-[10px] font-black uppercase tracking-widest text-red-600">
                              -{Math.abs(Number(c.marks_deducted || 0))}
                            </p>
                            <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 mt-1">
                              Remaining {Math.round(Number(c.marks_remaining_after || 0))}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {insightModal === 'risk' && (
            <>
              {(() => {
                const rows = derived.atRiskRows || [];

                if (!rows.length) {
                  return (
                    <div className="py-14 text-center text-slate-400">
                      <div className="mx-auto w-32 h-32 opacity-25">
                        <img
                          src={import.meta.env.BASE_URL + "undraw_no-data_ig65 (1).svg"}
                          alt="Empty"
                          className="w-full h-full object-contain grayscale"
                        />
                      </div>
                      <p className="mt-3 text-[10px] font-black uppercase tracking-widest text-slate-400">
                        No learners flagged as at-risk
                      </p>
                    </div>
                  );
                }

                return (
                  <div className="divide-y divide-slate-100 border border-slate-100 rounded-2xl overflow-hidden">
                    {rows.map((r) => (
                      <div key={r.id} className="px-5 py-4 hover:bg-slate-50 transition-all flex items-center justify-between gap-4">
                        <div className="min-w-0">
                          <p className="font-black text-slate-800 text-[11px] uppercase tracking-tight truncate">
                            {r.name} <span className="text-slate-400 font-bold">({r.uid})</span>
                          </p>
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1 truncate">
                            {r.cls}
                          </p>
                        </div>
                        <div className="shrink-0 text-right">
                          <span className={`text-sm font-black ${r.tone === 'critical' ? 'text-red-600' : 'text-amber-600'}`}>{r.pct}%</span>
                          <p className="text-[9px] font-bold uppercase tracking-widest text-slate-300 mt-1">
                            conduct remaining
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </>
          )}
        </div>

        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 shrink-0 flex items-center justify-end gap-2">
          <Link
            to={insightModal === 'cases' ? '/conduct/reports' : '/students'}
            className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-[9px] font-black uppercase tracking-widest text-slate-600 hover:text-[#1E3A5F] hover:border-[#1E3A5F]/30 transition-all"
          >
            Open {insightModal === 'cases' ? 'reports' : 'learners'} <ArrowRight size={12} />
          </Link>
        </div>
      </div>
    </div>,
    document.body
  ) : null;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-re-bg">
        <Loader2 className="animate-spin text-re-navy opacity-40" />
      </div>
    );
  }

  return (
    <div className="animate-in fade-in duration-700 bg-re-bg min-h-screen">
      {AttendanceModal}
      {InsightModal}
      <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />

      <section className="relative p-7 md:p-10 text-white overflow-hidden min-h-[230px] flex items-center" style={{ fontFamily: "'Montserrat', sans-serif" }}>
        <div className="absolute inset-0 z-0">
          <img src={PORTAL.heroImage} alt={PORTAL.heroImageAlt} className="w-full h-full object-cover shadow-2xl" />
          <div className="absolute inset-0 bg-black/55 backdrop-blur-[1px]" />
        </div>

        <div className="relative z-10 max-w-5xl w-full">
          <div className="flex flex-wrap items-center justify-between gap-6">
            <div className="flex flex-col gap-1">
              <h1 className="text-2xl md:text-3xl font-black tracking-tight">
                Discipline Dashboard
              </h1>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
                <p className="text-[10px] font-black uppercase tracking-widest text-white/80">
                  {derived.activePeriod.academic_year} · {derived.activePeriod.term} · {derived.studentCount} Learners · {derived.activePeriod.total_marks} MAX
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="flex bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-1">
                <select 
                  className="bg-transparent text-[10px] font-black uppercase tracking-widest text-white outline-none px-2 py-1 cursor-pointer"
                  value={filters.academic_year}
                  onChange={e => setFilters({...filters, academic_year: e.target.value})}
                >
                  <option value="2024-2025" className="text-slate-800">2024-2025</option>
                  <option value="2025-2026" className="text-slate-800">2025-2026</option>
                </select>
                <div className="w-px h-4 bg-white/20 self-center mx-1" />
                <select 
                  className="bg-transparent text-[10px] font-black uppercase tracking-widest text-white outline-none px-2 py-1 cursor-pointer"
                  value={filters.term}
                  onChange={e => setFilters({...filters, term: e.target.value})}
                >
                  <option value="Term 1" className="text-slate-800">Term 1</option>
                  <option value="Term 2" className="text-slate-800">Term 2</option>
                  <option value="Term 3" className="text-slate-800">Term 3</option>
                </select>
              </div>

              <button
                type="button"
                onClick={loadDashboard}
                className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-white backdrop-blur-sm hover:bg-white/15 transition-all active:scale-95"
              >
                <RefreshCw size={14} />
              </button>
            </div>
          </div>

          {lastUpdated && (
            <p className="mt-3 text-[10px] font-black uppercase tracking-widest text-white/65">
              Last updated {formatDateTime(lastUpdated)}
            </p>
          )}
        </div>
      </section>

      <div className="max-w-[1400px] mx-auto px-5 md:px-8 -mt-10 relative z-20 pb-14" style={{ fontFamily: "'Montserrat', sans-serif" }}>
        {error && (
          <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-950 flex items-start gap-2">
            <AlertCircle size={18} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
          <div className="lg:col-span-3 space-y-5">
            <div className="bg-white rounded-[24px] shadow-2xl border border-black/5 overflow-hidden grid grid-cols-2">
              {[
                { label: 'Cases this term', value: derived.casesToday, onClick: () => openCasesModal() },
                { label: 'At-risk Students', value: derived.atRiskCount, onClick: () => setInsightModal('risk') },
                { label: 'Active permissions', value: derived.activePermissions, onClick: () => window.location.assign('/permissions') },
              ].map((stat, i) => (
                <button
                  key={stat.label}
                  type="button"
                  onClick={stat.onClick}
                  className={`p-5 flex flex-col items-center justify-center text-center border-gray-100 ${i % 2 === 0 ? 'border-r' : ''} ${i < 2 ? 'border-b' : ''} hover:bg-slate-50/60 transition-all active:scale-[0.99]`}
                >
                  <span className="text-xl md:text-2xl font-black tracking-tighter text-[#1E3A5F]">
                    {stat.value}
                  </span>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1 opacity-70">
                    {stat.label}
                  </p>
                </button>
              ))}
              
              <div className="p-3.5 flex flex-col justify-center items-center text-center border-gray-100">
                <span className="text-lg md:text-xl font-black tracking-tighter text-[#1E3A5F] leading-none">
                  {derived.studentCount}
                </span>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1 opacity-70 text-center w-full">
                  Actual Students
                </p>
                <div className="w-full h-px bg-slate-100 my-2" />
                <div className="flex items-center justify-center gap-1.5 text-[8.5px] font-black uppercase tracking-widest text-[#1E3A5F] mb-1.5 w-full">
                  <span>Boys : {derived.demographics.boys > 0 ? derived.demographics.boys : Math.floor(derived.studentCount * 0.48)}</span>
                  <span className="text-slate-200">|</span>
                  <span>Girls : {derived.demographics.girls > 0 ? derived.demographics.girls : derived.studentCount - Math.floor(derived.studentCount * 0.48)}</span>
                </div>
                <div className="flex flex-col gap-1 text-[8.5px] font-bold text-slate-500 w-full bg-slate-50 rounded-lg py-1.5 px-2 border border-slate-100">
                  <button
                    type="button"
                    onClick={() => openAttendanceModal('absent')}
                    className="flex justify-between items-center text-left w-full bg-transparent px-0 py-0 border-0 outline-none transition group"
                    title="View absent students"
                  >
                    <span className="uppercase tracking-widest group-hover:text-[#1E3A5F] transition-colors">Absent Today</span>
                    <span className="font-black text-amber-600 group-hover:text-amber-700 transition-colors">{derived.attendanceToday.absent}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => openAttendanceModal('missed')}
                    className="flex justify-between items-center text-left w-full bg-transparent px-0 py-0 border-0 outline-none transition group"
                    title="View missed classes"
                  >
                    <span className="uppercase tracking-widest group-hover:text-[#1E3A5F] transition-colors">Missed Courses Today</span>
                    <span className="font-black text-red-500 group-hover:text-red-600 transition-colors">{derived.attendanceToday.missed_courses}</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-[24px] shadow-sm p-5">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-black text-slate-800 flex items-center gap-2 text-[11px] uppercase tracking-[0.2em]">
                  <TrendingUp className="w-4 h-4 text-[#FEBF10]" /> Cases by class
                </h3>
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                  {getCurrentAcademicYear()} · {getCurrentTerm()}
                </span>
              </div>
              <LineAreaChart data={derived.classTrend} labelKey="label" valueKey="value" color="#10b981" height={160} />
            </div>

            <div className="bg-white border border-slate-200 rounded-[24px] shadow-2xl overflow-hidden flex flex-col">
              <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <h3 className="font-black text-slate-800 flex items-center gap-2 text-[11px] uppercase tracking-widest">
                  <ShieldAlert className="w-4 h-4 text-amber-500" /> Latest discipline activity
                </h3>
                <Link to="/conduct/reports" className="text-[9px] font-black text-[#1E3A5F] uppercase hover:underline">
                  Open reports
                </Link>
              </div>
              <div className="divide-y divide-slate-50">
                {derived.recentActivity.length === 0 ? (
                  <div className="px-6 py-8 text-sm font-bold text-slate-400">
                    No live activity available yet.
                  </div>
                ) : (
                  derived.recentActivity.map((activity) => {
                    const meta = activityMeta(activity);
                    const Icon = meta.icon;
                    return (
                      <div key={activity.id} className="flex items-center gap-4 px-6 py-5 hover:bg-slate-50 transition-all group">
                        <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0 group-hover:bg-[#1E3A5F] group-hover:text-white transition-all">
                          <Icon size={16} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-black text-slate-800 text-sm tracking-tight truncate">{activity.title}</p>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">{activity.detail}</p>
                          <p className="text-[10px] text-slate-300 font-bold uppercase tracking-widest mt-1">{activity.time}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <Badge status={activity.status} />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          <div className="space-y-6 lg:col-span-2">
            <OverviewCard
              title="Conduct Standing"
              icon={UserCheck}
              iconColor="text-emerald-500"
              dataPie={derived.standingPie}
              subStats={{
                left: { count: derived.standingPie[0].value, label: 'Good' },
                right: { count: derived.standingPie[2].value, label: 'Critical' },
              }}
              trendColor="text-red-500"
            />

            <div className="bg-white border border-slate-200 rounded-[24px] shadow-2xl overflow-hidden flex flex-col">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <h3 className="font-black text-slate-800 flex items-center gap-2 text-[11px] uppercase tracking-widest">
                  <FileText className="w-4 h-4 text-[#1E3A5F]" /> Active permissions
                </h3>
                <span className="text-[10px] font-black text-[#1E3A5F] bg-slate-100 px-2 py-0.5 rounded-full tracking-tighter">
                  {derived.activePermissions} LIVE
                </span>
              </div>
              <div className="divide-y divide-slate-50">
                {derived.permissionRows.length === 0 ? (
                  <div className="px-6 py-8 text-sm font-bold text-slate-400">
                    No active permission windows right now.
                  </div>
                ) : (
                  derived.permissionRows.map((permission) => (
                    <div key={permission.id} className="px-6 py-4 hover:bg-slate-50 transition-all group">
                      <div className="flex justify-between items-start mb-1 gap-3">
                        <p className="font-black text-slate-800 text-[11px] tracking-tight group-hover:text-[#1E3A5F] transition-colors">
                          {`${permission.first_name || ''} ${permission.last_name || ''}`.trim() || 'Learner'}
                          <span className="text-slate-400 font-bold ml-1">({permission.class_name || 'Class'})</span>
                        </p>
                        <span className="text-[8px] font-black text-emerald-600 uppercase tracking-widest">
                          {permission.status || 'PENDING'}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-none opacity-70">
                        {permission.permission_type || 'Permission'} · Ends {formatDateTime(permission.ends_at)}
                      </p>
                    </div>
                  ))
                )}
              </div>
              <Link to="/permissions" className="p-4 bg-slate-50/50 border-t border-slate-100 text-center text-[9px] font-black text-slate-400 uppercase tracking-widest hover:text-[#1E3A5F] transition-all">
                View all permissions
              </Link>
            </div>

            <div className="bg-white border border-slate-200 rounded-[24px] shadow-2xl overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <h3 className="font-black text-slate-800 flex items-center gap-2 text-[11px] uppercase tracking-widest">
                  <AlertTriangle className="w-4 h-4 text-red-500" /> Watchlist
                </h3>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Marks cap {derived.totalMarks}
                </span>
              </div>
              <div className="divide-y divide-slate-50">
                {derived.watchlist.length === 0 ? (
                  <div className="px-6 py-8 text-sm font-bold text-slate-400">
                    No learners on the watchlist yet.
                  </div>
                ) : (
                  derived.watchlist.map((row) => (
                    <div key={`${row.studentName}-${row.label}`} className="px-6 py-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="font-black text-slate-800 text-[11px] tracking-tight">{row.studentName}</p>
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">{row.label}</p>
                        </div>
                        <span className={`text-sm font-black ${row.value < 50 ? 'text-red-600' : row.value < 75 ? 'text-amber-600' : 'text-emerald-600'}`}>
                          {row.value}%
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="relative rounded-[24px] p-6 text-white shadow-re-premium-purple overflow-hidden group cursor-pointer active:scale-95 transition-all" style={{ background: 'linear-gradient(135deg, #1E3A5F 0%, #3D5A80 100%)' }}>
              <div className="absolute inset-0 opacity-10 mix-blend-overlay">
                <img src={PORTAL.heroImage} alt="" className="w-full h-full object-cover grayscale" />
              </div>
              <div className="relative z-10 flex flex-col gap-4">
                <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-md shadow-inner">
                  <MessageSquare size={18} className="text-white" />
                </div>
                <div>
                  <h4 className="font-black text-xs tracking-widest uppercase leading-none opacity-90 text-[#FEBF10]">Next action</h4>
                  <p className="text-[10px] text-white font-bold leading-snug mt-2 opacity-80">
                    Review flagged learners, approve pending permissions, and keep case pressure low in the highest-risk classes.
                  </p>
                </div>
                <Link to="/students" className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest group-hover:gap-2.5 transition-all text-[#FEBF10]">
                  Open learners discipline <ArrowRight size={12} />
                </Link>
              </div>
              <div className="absolute -bottom-10 -right-10 w-28 h-28 bg-white/20 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-1000" />
              <div className="absolute -top-10 -left-10 w-20 h-20 bg-white/10 rounded-full blur-2xl" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
