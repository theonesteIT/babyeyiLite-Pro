import React, { useState, useEffect, useCallback, useMemo } from "react";
import { createPortal } from 'react-dom';
import { useAuth } from "../context/AuthContext";
import {
    FileText, CheckCircle, Clock, XCircle, AlertTriangle, TrendingUp,
    Activity, BarChart3, ArrowUpRight, ChevronRight, ChevronDown, Building2,
    DollarSign, BookOpen, Award, Zap, Loader2, Info, X, RefreshCw,
    ShieldAlert, Users, Phone, Printer, UserCheck
} from "lucide-react";
import { Link } from "react-router-dom";
import api from '../services/api';

// ================================================================
// ANALYTICAL COMPONENTS
// ================================================================
const Badge = ({ status }) => {
    const tone = {
      critical: 'bg-red-100 text-red-700 border-red-200',
      warning: 'bg-amber-100 text-amber-700 border-amber-200',
      good: 'bg-emerald-100 text-emerald-700 border-emerald-200',
      approved: 'bg-emerald-100 text-emerald-700 border-emerald-200',
      pending: 'bg-amber-100 text-amber-700 border-amber-200',
      rejected: 'bg-red-100 text-red-700 border-red-200',
    };
    const cls = tone[status?.toLowerCase()] || 'bg-slate-100 text-slate-600 border-slate-200';
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider border ${cls}`}>
        {status}
      </span>
    );
};

const LineAreaChart = ({ data = [], labelKey = "label", valueKey = "value", color = "#6366f1", height = 140, showGrid = true }) => {
    if (!data.length) return <div className="flex items-center justify-center text-slate-300 text-xs" style={{ height }}>No data</div>;
    const W = 500, H = height, PAD = { top: 16, bottom: 28, left: 36, right: 12 };
    const vals = data.map(d => Number(d[valueKey]) || 0);
    const max = Math.max(...vals, 1);
    const xStep = (W - PAD.left - PAD.right) / (data.length - 1 || 1);
    const toY = v => PAD.top + (1 - (v / max)) * (H - PAD.top - PAD.bottom);
    const toX = i => PAD.left + i * xStep;
    const pts = data.map((d, i) => ({ x: toX(i), y: toY(Number(d[valueKey]) || 0) }));
    const linePath = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
    const areaPath = linePath + ` L${pts[pts.length - 1].x.toFixed(1)},${(H - PAD.bottom).toFixed(1)} L${PAD.left},${(H - PAD.bottom).toFixed(1)} Z`;
    return (
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height }}>
            <defs>
                <linearGradient id={`ag${color.replace("#", "")}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={color} stopOpacity="0.25" />
                    <stop offset="100%" stopColor={color} stopOpacity="0.02" />
                </linearGradient>
            </defs>
            {showGrid && [0.25, 0.5, 0.75, 1].map(f => {
                const y = PAD.top + (1 - f) * (H - PAD.top - PAD.bottom);
                return <g key={f}><line x1={PAD.left} y1={y} x2={W - PAD.right} y2={y} stroke="#e2e8f0" strokeWidth="1" strokeDasharray="4,3" /><text x={PAD.left - 4} y={y + 4} textAnchor="end" fontSize="9" fill="#94a3b8" fontWeight="600">{Math.round(max * f)}</text></g>;
            })}
            <path d={areaPath} fill={`url(#ag${color.replace("#", "")})`} />
            <path d={linePath} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            {pts.map((p, i) => (
                <g key={i}>
                    <circle cx={p.x} cy={p.y} r="4" fill="white" stroke={color} strokeWidth="2.5" />
                    <circle cx={p.x} cy={p.y} r="2" fill={color} />
                    <text x={p.x} y={H - PAD.bottom + 12} textAnchor="middle" fontSize="9" fill="#64748b" fontWeight="600">{data[i][labelKey]}</text>
                    <text x={p.x} y={p.y - 9} textAnchor="middle" fontSize="9" fill={color} fontWeight="800">{vals[i]}</text>
                </g>
            ))}
        </svg>
    );
};

const ModernBarChart = ({ data = [], labelKey = "label", valueKey = "value", color = "#6366f1", height = 160, secondaryKey, secondaryColor = "#10b981" }) => {
    if (!data.length) return <div style={{ height }} />;
    const W = 500, H = height, PAD = { top: 20, bottom: 30, left: 8, right: 8 };
    const allVals = data.flatMap(d => [Number(d[valueKey]) || 0, secondaryKey ? Number(d[secondaryKey]) || 0 : 0]);
    const max = Math.max(...allVals, 1);
    const barW = (W - PAD.left - PAD.right) / (data.length * (secondaryKey ? 2.8 : 1.8));
    const gap = (W - PAD.left - PAD.right - barW * (secondaryKey ? 2 : 1) * data.length) / (data.length + 1);
    return (
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height }}>
            <defs>
                {data.map((_, i) => <linearGradient key={i} id={`bg${i}p`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={color} /><stop offset="100%" stopColor={color} stopOpacity="0.5" /></linearGradient>)}
                {secondaryKey && data.map((_, i) => <linearGradient key={`s${i}`} id={`bg${i}s`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={secondaryColor} /><stop offset="100%" stopColor={secondaryColor} stopOpacity="0.5" /></linearGradient>)}
            </defs>
            {[0.25, 0.5, 0.75, 1].map(f => <line key={f} x1={PAD.left} y1={PAD.top + (1 - f) * (H - PAD.top - PAD.bottom)} x2={W - PAD.right} y2={PAD.top + (1 - f) * (H - PAD.top - PAD.bottom)} stroke="#e2e8f0" strokeWidth="1" strokeDasharray="3,2" />)}
            {data.map((d, i) => {
                const v1 = Number(d[valueKey]) || 0, v2 = secondaryKey ? Number(d[secondaryKey]) || 0 : 0;
                const bh1 = Math.max((v1 / max) * (H - PAD.top - PAD.bottom), 3), bh2 = Math.max((v2 / max) * (H - PAD.top - PAD.bottom), 3);
                const gW = secondaryKey ? barW * 2 + 4 : barW;
                const x0 = PAD.left + gap + i * (gW + gap);
                return (
                    <g key={i}>
                        <rect x={x0} y={H - PAD.bottom - bh1} width={barW} height={bh1} rx="4" fill={`url(#bg${i}p)`} />
                        <text x={x0 + barW / 2} y={H - PAD.bottom - bh1 - 5} textAnchor="middle" fontSize="9" fill={color} fontWeight="800">{v1}</text>
                        {secondaryKey && <><rect x={x0 + barW + 4} y={H - PAD.bottom - bh2} width={barW} height={bh2} rx="4" fill={`url(#bg${i}s)`} /><text x={x0 + barW + 4 + barW / 2} y={H - PAD.bottom - bh2 - 5} textAnchor="middle" fontSize="9" fill={secondaryColor} fontWeight="800">{v2}</text></>}
                        <text x={x0 + (gW) / 2} y={H - PAD.bottom + 12} textAnchor="middle" fontSize="9" fill="#64748b" fontWeight="600">{(d[labelKey] || "").slice(0, 6)}</text>
                    </g>
                );
            })}
        </svg>
    );
};

const DonutChart = ({ data = [], size = 140 }) => {
    if (!data.length) return null;
    const total = data.reduce((s, d) => s + d.value, 0);
    const cx = size / 2, cy = size / 2, R = size / 2 - 8, r = R * 0.58;

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

    let angle = -Math.PI / 2;
    const slices = data.map(d => {
        const a = (d.value / total) * 2 * Math.PI;
        const x1 = cx + R * Math.cos(angle), y1 = cy + R * Math.sin(angle);
        angle += a;
        const x2 = cx + R * Math.cos(angle), y2 = cy + R * Math.sin(angle);
        const xi1 = cx + r * Math.cos(angle - a), yi1 = cy + r * Math.sin(angle - a);
        const xi2 = cx + r * Math.cos(angle), yi2 = cy + r * Math.sin(angle);
        const large = a > Math.PI ? 1 : 0;
        return { ...d, path: `M${x1},${y1} A${R},${R} 0 ${large},1 ${x2},${y2} L${xi2},${yi2} A${r},${r} 0 ${large},0 ${xi1},${yi1} Z` };
    });
    return (
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
            {slices.map((s, i) => <path key={i} d={s.path} fill={s.color} stroke="white" strokeWidth="2" />)}
            <circle cx={cx} cy={cy} r={r - 4} fill="white" />
            <text x={cx} y={cy - 4} textAnchor="middle" fontSize="13" fontWeight="900" fill="#1e293b">{total}</text>
            <text x={cx} y={cy + 10} textAnchor="middle" fontSize="7" fontWeight="600" fill="#94a3b8">TOTAL</text>
        </svg>
    );
};

const MiniSparkline = ({ data = [], color = "#6366f1", height = 32 }) => {
    if (!data.length) return null;
    const W = 150, H = height, PAD = 2;
    const vals = data.map(d => Number(d.value) || 0);
    const max = Math.max(...vals, 1);
    const min = Math.min(...vals, 0);
    const range = max - min || 1;
    const xStep = (W - PAD * 2) / (data.length - 1 || 1);
    const pts = vals.map((v, i) => ({ x: PAD + i * xStep, y: PAD + (1 - (v - min) / range) * (H - PAD * 2) }));
    const linePath = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
    return (
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full preserve-3d">
            <path d={linePath} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx={pts[pts.length - 1].x} cy={pts[pts.length - 1].y} r="3" fill="white" stroke={color} strokeWidth="1.5" />
        </svg>
    );
};

const DashboardFilter = ({ value, onChange }) => {
    const [open, setOpen] = useState(false);
    return (
        <div className="relative">
            <div onClick={() => setOpen(!open)} className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 cursor-pointer hover:bg-slate-100 transition-colors">
                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{value}</span>
                <ChevronDown size={10} className="text-slate-400" />
            </div>
            {open && (
                <>
                    <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
                    <div className="absolute right-0 top-full mt-1 bg-white border border-slate-100 shadow-2xl rounded-xl p-1.5 z-50 w-36 flex flex-col">
                        {["Today", "This Term", "Last Term", "This Year"].map(opt => (
                            <button key={opt} onClick={() => { onChange(opt); setOpen(false); }} className="text-[7px] font-black text-slate-600 uppercase tracking-widest text-left px-2 py-1 hover:bg-slate-50 hover:text-[#FEBF10] rounded-lg transition-colors">
                                {opt}
                            </button>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
};

const OverviewCard = ({ title, icon: Icon, iconColor, dataPie, demographicStats, sparklineData, detailLabel, detailValue, trendColor, filterValue, setFilterValue }) => (
    <div className="bg-white border border-slate-200 rounded-[24px] shadow-2xl p-6 flex flex-col items-center relative w-full">
        <div className="flex items-center justify-between gap-2 mb-6 w-full">
            <div className="flex items-center gap-2">
                <Icon size={16} className={iconColor} />
                <h3 className="text-[8px] font-black text-slate-800 uppercase tracking-[0.2em]">{title}</h3>
            </div>
            <DashboardFilter value={filterValue} onChange={setFilterValue} />
        </div>

        <DonutChart data={dataPie} size={150} />

        <div className="w-full mt-6 space-y-3">
            <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-slate-500 bg-slate-50 p-3 rounded-xl border border-slate-100 shadow-inner">
                <div className="flex flex-col items-center flex-1">
                    <span className="text-[#1E3A5F] font-black">{demographicStats.left.count} {demographicStats.left.label}</span>
                    <span className="text-[8px] font-black text-slate-400 mt-0.5 tracking-[0.2em]">{demographicStats.left.subtext}</span>
                </div>
                <div className="w-px h-8 bg-slate-200"></div>
                <div className="flex flex-col items-center flex-1">
                    <span className="text-emerald-600 font-black">{demographicStats.right.count} {demographicStats.right.label}</span>
                    <span className="text-[8px] font-black text-slate-400 mt-0.5 tracking-[0.2em]">{demographicStats.right.subtext}</span>
                </div>
            </div>

            <div className="flex items-center justify-between gap-3 p-3 bg-white border border-slate-100 rounded-xl shadow-[0_2px_10px_-3px_rgba(0,0,0,0.05)] overflow-hidden relative">
                <div className="flex-1 flex flex-col items-start gap-1 relative z-10 bg-white/80 pr-2">
                    <span className="text-[8px] text-slate-400 font-black uppercase tracking-widest">{detailLabel}</span>
                    <span className="text-xs font-black text-slate-800 tracking-tight">{detailValue}</span>
                </div>
                <div className="w-24 h-10 shrink-0 relative z-0">
                    <MiniSparkline data={sparklineData} color={trendColor} />
                </div>
            </div>
        </div>
    </div>
);

// ================================================================
// DATES & UTILS
// ================================================================
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

function formatDateTime(value) {
    if (!value) return 'No time';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return 'No time';
    return d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

function toNumber(value, fallback = 0) {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
}

const DEFAULT_TOTAL_MARKS = 100;
function getMarksPct(student, totalMarks) {
    const raw = toNumber(student?.marks_remaining, 0);
    if (raw <= 100 && totalMarks > 100) return raw;
    if (!totalMarks) return raw;
    return Math.max(0, Math.min(100, (raw / totalMarks) * 100));
}

// ================================================================
// DASHBOARD COMPONENT
// ================================================================
const Dashboard = () => {
    const { manager } = useAuth();
    const [loading, setLoading] = useState(true);
    const [lastUpdated, setLastUpdated] = useState(null);

    // Filter states for discipline data
    const [filters, setFilters] = useState({
        academic_year: getCurrentAcademicYear(),
        term: getCurrentTerm(),
    });

    // Integrated State
    const [stats, setStats] = useState({
        core: [
            { label: "Total Students", value: "0" },
            { label: "Teaching Staff", value: "0" },
            { label: "Global Attendance", value: "0%" },
            { label: "Institutional GPA", value: "0%" },
        ],
        recentActivity: [],
        attendanceOverview: {
            present: 0, absent: 0,
            boys: { count: 0, percentage: 0 },
            girls: { count: 0, percentage: 0 },
            sparkline: [{ value: 0 }]
        },
        revenue30d: 0,
        termFinance: { expected: 0, collected: 0, outstanding: 0 },
        academicOverview: {
            exceptional: 0, expected: 0, needsReview: 0,
            boys: { count: "0", percentage: 0 },
            girls: { count: "0", percentage: 0 },
            sparkline: [{ value: 0 }]
        },
        termTrend: [],
        feeByClass: []
    });

    const [disData, setDisData] = useState({
        totalMarks: DEFAULT_TOTAL_MARKS,
        reportSummary: null,
        permissions: [],
        students: [],
    });

    // Modals
    const [attendanceModal, setAttendanceModal] = useState(null);
    const [attendanceRows, setAttendanceRows] = useState([]);
    const [attendanceLoading, setAttendanceLoading] = useState(false);
    const [attendanceError, setAttendanceError] = useState(null);
    const [insightModal, setInsightModal] = useState(null);
    const [casesRows, setCasesRows] = useState([]);
    const [casesLoading, setCasesLoading] = useState(false);
    const [casesError, setCasesError] = useState(null);

    const loadDashboard = useCallback(async () => {
        setLoading(true);
        const { academic_year, term } = filters;

        try {
            const [managerRes, reportRes, permissionsRes, settingsRes, studentsRes, financeRes, termFinanceRes] = await Promise.allSettled([
                api.get('/dos/dashboard/stats'),
                api.get('/discipline/report-summary', { params: { academic_year, term } }),
                api.get('/permissions'),
                api.get('/discipline/settings'),
                api.get('/discipline/students-summary', { params: { academic_year, term } }),
                api.get('/accountant/overview'),
                api.get('/accountant/reports/payments', { params: { academic_year, term } }),
            ]);

            // Process Manager Stats
            if (managerRes.status === 'fulfilled' && managerRes.value.data?.success) {
                const dynamicStats = managerRes.value.data.data;
                const totalStudents = dynamicStats.totalStudents || 0;
                setStats(prev => ({
                    ...prev,
                    core: [
                        { label: "Total Students", value: totalStudents.toLocaleString() },
                        { label: "Teaching Staff", value: dynamicStats.totalTeachingStaff.toLocaleString() },
                        { label: "Global Attendance", value: `${dynamicStats.globalAttendance}%` },
                        { label: "Institutional GPA", value: `${dynamicStats.institutionalGPA}%` },
                    ],
                    recentActivity: dynamicStats.activityLog || [],
                    attendanceOverview: dynamicStats.attendanceOverview || prev.attendanceOverview,
                    academicOverview: dynamicStats.academicOverview || prev.academicOverview,
                    termTrend: dynamicStats.termTrend || [],
                    feeByClass: dynamicStats.feeByClass || []
                }));
            }

            // Process Finance Stats
            if (financeRes.status === 'fulfilled' && financeRes.value.data?.success) {
                const fin = financeRes.value.data.data;
                setStats(p => ({ ...p, revenue30d: fin.last_30_days_total_paid || 0 }));
            }

            // Process Term Finance
            if (termFinanceRes.status === 'fulfilled' && termFinanceRes.value.data?.success) {
                const rows = termFinanceRes.value.data.data.rows || [];
                const summary = rows.reduce((acc, r) => ({
                    expected: acc.expected + (Number(r.total_due) || 0),
                    collected: acc.collected + (Number(r.total_paid) || 0),
                    outstanding: acc.outstanding + (Number(r.remaining) || 0)
                }), { expected: 0, collected: 0, outstanding: 0 });
                setStats(p => ({ ...p, termFinance: summary }));
            }

            // Process Discipline Stats
            const reportSummary = reportRes.status === 'fulfilled' && reportRes.value.data?.success ? reportRes.value.data.data : null;
            const permissions = permissionsRes.status === 'fulfilled' && permissionsRes.value.data?.success ? permissionsRes.value.data.data : [];
            const studentsRaw = studentsRes.status === 'fulfilled' && studentsRes.value.data?.success ? studentsRes.value.data.data : [];
            const students = studentsRaw.map(s => ({ ...s, marks_remaining: s.discipline_remaining }));
            const totalMarks = settingsRes.status === 'fulfilled' && settingsRes.value.data?.success
                ? toNumber(settingsRes.value.data.data?.total_marks, DEFAULT_TOTAL_MARKS)
                : DEFAULT_TOTAL_MARKS;

            setDisData({ totalMarks, reportSummary, permissions, students });
            setLastUpdated(new Date());
        } catch (error) {
            console.error("Dashboard multi-fetch error:", error);
        } finally {
            setLoading(false);
        }
    }, [filters]);

    useEffect(() => {
        loadDashboard();
    }, [loadDashboard]);

    // Discipline-Specific Derived Stats (for the top cards)
    const disDerived = useMemo(() => {
        const totalMarks = disData.totalMarks || DEFAULT_TOTAL_MARKS;
        const students = disData.students || [];
        const permissions = disData.permissions || [];
        const reportSummary = disData.reportSummary;

        const criticalStudents = students.filter((student) => getMarksPct(student, totalMarks) < 50);
        const warningStudents = students.filter((student) => {
            const pct = getMarksPct(student, totalMarks);
            return pct >= 50 && pct < 75;
        });
        const atRiskStudents = criticalStudents.concat(warningStudents);
        const now = lastUpdated ? new Date(lastUpdated).getTime() : 0;
        const activePermsCount = permissions.filter((p) => {
            const ends = new Date(p.ends_at || p.end_date || p.updated_at).getTime();
            return p.status !== 'REJECTED' && (!Number.isFinite(ends) || ends >= now);
        }).length;

        const classTrend = (reportSummary?.by_class || [])
            .map((row) => ({ label: row.class_name || 'Class', value: toNumber(row.case_count, 0) }))
            .sort((a, b) => b.value - a.value).slice(0, 6);

        return {
            studentCount: students.length,
            casesToday: toNumber(reportSummary?.case_count, 0),
            atRiskCount: atRiskStudents.length,
            activePermissions: activePermsCount,
            demographics: reportSummary?.demographics || { boys: 0, girls: 0 },
            attendanceToday: reportSummary?.attendance_today || { absent: 0, missed_courses: 0 },
            atRiskRows: atRiskStudents.map(s => ({
                id: s.id, name: `${s.first_name} ${s.last_name}`, uid: s.student_uid,
                pct: Math.round(getMarksPct(s, totalMarks)), tone: getMarksPct(s, totalMarks) < 50 ? 'critical' : 'warning'
            })),
            classTrend
        };
    }, [disData, lastUpdated]);

    // Modals
    const openAttendanceModal = useCallback(async (kind) => {
        setAttendanceModal(kind);
        setAttendanceRows([]); setAttendanceError(null); setAttendanceLoading(true);
        try {
            const res = await api.get('/discipline/attendance-today-details', { params: { kind } });
            if (res.data?.success) setAttendanceRows(res.data.data || []);
            else setAttendanceError(res.data?.message || 'Failed to load details.');
        } catch (e) { setAttendanceError('Failed to load attendance details.'); }
        finally { setAttendanceLoading(false); }
    }, []);

    const openCasesModal = useCallback(async () => {
        setInsightModal('cases');
        setCasesRows([]); setCasesError(null); setCasesLoading(true);
        try {
            const res = await api.get('/discipline/cases', { params: { academic_year: filters.academic_year, term: filters.term, limit: 80 } });
            if (res.data?.success) setCasesRows(res.data.data || []);
            else setCasesError(res.data?.message || 'Failed to load cases.');
        } catch (e) { setCasesError('Failed to load cases.'); }
        finally { setCasesLoading(false); }
    }, [filters]);

    // JSX Components for Modals
    const AttendanceModal = attendanceModal ? createPortal(
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white w-full max-w-2xl max-h-[90vh] rounded-[28px] shadow-2xl border border-black/5 overflow-hidden flex flex-col">
                <div className="px-6 py-5 bg-gradient-to-br from-[#1E3A5F] to-[#0D2644] text-white shrink-0">
                    <div className="flex items-center justify-between gap-4">
                        <div className="min-w-0">
                            <p className="text-[9px] font-black uppercase tracking-[0.3em]" style={{ color: "#FEBF10" }}>Attendance Today</p>
                            <h3 className="text-base font-black uppercase tracking-widest mt-1 truncate">{attendanceModal === 'absent' ? 'Absent Learners' : 'Missed Courses'}</h3>
                        </div>
                        <button onClick={() => setAttendanceModal(null)} className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-all"><X size={18} /></button>
                    </div>
                </div>
                <div className="px-6 py-5 overflow-y-auto">
                    {attendanceError && <div className="p-3 bg-red-50 text-red-700 text-[10px] font-black uppercase tracking-widest rounded-xl mb-4">{attendanceError}</div>}
                    {attendanceLoading ? <Loader2 className="animate-spin mx-auto my-10" /> : attendanceRows.map(r => (
                        <div key={r.id} className="p-4 border border-black/5 rounded-2xl mb-3 flex items-center justify-between">
                            <div>
                                <p className="text-[11px] font-black text-slate-800 uppercase">{r.first_name} {r.last_name}</p>
                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{r.class_name}</p>
                            </div>
                            <a href={`tel:${r.father_phone || r.mother_phone}`} className="h-8 rounded-xl px-3 bg-re-bg border border-black/5 flex items-center gap-2 text-[9px] font-black uppercase"><Phone size={12} className="text-re-gold" />Call</a>
                        </div>
                    ))}
                </div>
            </div>
        </div>, document.body
    ) : null;

    const InsightModal = insightModal ? createPortal(
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white w-full max-w-2xl max-h-[90vh] rounded-[28px] shadow-2xl border border-black/5 overflow-hidden flex flex-col">
                <div className="px-6 py-5 bg-gradient-to-br from-[#1E3A5F] to-[#0D2644] text-white shrink-0">
                    <div className="flex items-center justify-between gap-4">
                        <div className="min-w-0">
                            <p className="text-[9px] font-black uppercase tracking-[0.3em]" style={{ color: "#FEBF10" }}>Intelligence Insight</p>
                            <h3 className="text-base font-black uppercase tracking-widest mt-1 truncate">{insightModal === 'cases' ? 'Discipline Cases' : 'At-Risk Learners'}</h3>
                        </div>
                        <button onClick={() => setInsightModal(null)} className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-all"><X size={18} /></button>
                    </div>
                </div>
                <div className="px-6 py-5 overflow-y-auto">
                    {insightModal === 'cases' ? (
                        casesLoading ? <Loader2 className="animate-spin mx-auto my-10" /> : casesRows.map(c => (
                            <div key={c.id} className="p-4 border border-black/5 rounded-2xl mb-3 flex justify-between">
                                <div><p className="text-[11px] font-black uppercase">{c.first_name} {c.last_name}</p><p className="text-[9px] font-bold text-slate-400 uppercase mt-1">{c.class_name} · {formatDateTime(c.created_at)}</p></div>
                                <span className="text-red-600 font-black text-xs">-{c.marks_deducted}</span>
                            </div>
                        ))
                    ) : disDerived.atRiskRows.map(r => (
                        <div key={r.id} className="p-4 border border-black/5 rounded-2xl mb-3 flex justify-between items-center">
                            <p className="text-[11px] font-black uppercase">{r.name}</p>
                            <span className={`text-sm font-black ${r.tone === 'critical' ? 'text-red-600' : 'text-amber-600'}`}>{r.pct}%</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>, document.body
    ) : null;

    if (loading && !stats.core[0].value) return (
        <div className="min-h-screen flex items-center justify-center bg-re-bg">
            <RefreshCw className="animate-spin text-re-navy" />
        </div>
    );

    return (
        <div className="animate-in fade-in duration-700 bg-re-bg min-h-screen pb-20">
            {AttendanceModal}
            {InsightModal}
            <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />

            {/* HERO */}
            <section className="relative p-7 md:p-10 text-white overflow-hidden min-h-[230px] flex items-center" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                <div className="absolute inset-0 z-0">
                    <img src="/teacher.jpg" className="w-full h-full object-cover shadow-2xl" alt="School hero" />
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-[1px]"></div>
                </div>
                <div className="relative z-10 max-w-4xl">
                    <h1 className="text-2xl md:text-3xl font-black tracking-tight mb-2">
                        Welcome back, <span style={{ color: "#FEBF10" }}>{manager?.name || 'Executive Officer'}</span> 
                    </h1>
                    <p className="text-sm md:text-base font-bold opacity-90 max-w-2xl italic tracking-tight">
                        Institutional status: <span className="text-emerald-400">Optimal</span>. Strategic systems verified and synchronized for executive oversight.
                    </p>
                </div>
            </section>

            {/* MAIN CONTENT */}
            <div className="max-w-[1400px] mx-auto px-5 md:px-8 -mt-10 relative z-20" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">

                    {/* LEFT SECTION */}
                    <div className="lg:col-span-3 space-y-5">

                        {/* DISCIPLINARY STATS GRID (NEW 3+1 Hybrid) */}
                        <div className="bg-white rounded-[24px] shadow-2xl border border-black/5 overflow-hidden grid grid-cols-2">
                            {[
                                { label: 'Total Students', value: stats.core[0].value, onClick: () => window.location.assign('/students') },
                                { 
                                    label: `EXPECTANCY: ${stats.termFinance.expected > 1000000 ? (stats.termFinance.expected / 1000000).toFixed(1) + 'M' : stats.termFinance.expected.toLocaleString()} RWF`, 
                                    value: `${stats.termFinance.collected > 1000000 ? (stats.termFinance.collected / 1000000).toFixed(1) + 'M' : stats.termFinance.collected.toLocaleString()} RWF`, 
                                    onClick: () => window.location.assign('/finance/payments'), 
                                    sub: `COLLECTED: ${stats.termFinance.collected > 1000000 ? (stats.termFinance.collected/1000000).toFixed(1)+'M' : stats.termFinance.collected.toLocaleString()} | DEBITS: ${stats.termFinance.outstanding > 1000000 ? (stats.termFinance.outstanding/1000000).toFixed(1)+'M' : stats.termFinance.outstanding.toLocaleString()}`,
                                    smallText: true
                                },
                                { label: 'Active permissions', value: disDerived.activePermissions, onClick: () => {} },
                            ].map((stat, i) => (
                                <button
                                    key={stat.label}
                                    type="button"
                                    onClick={stat.onClick}
                                    className={`p-5 flex flex-col items-center justify-center text-center border-gray-100 ${i % 2 === 0 ? 'border-r' : ''} ${i < 2 ? 'border-b' : ''} hover:bg-slate-50/60 transition-all active:scale-[0.99]`}
                                >
                                    <span className={`${stat.smallText ? 'text-base md:text-lg' : 'text-xl md:text-2xl'} font-black tracking-tighter text-[#1E3A5F]`}>{stat.value}</span>
                                    <p className={`${stat.smallText ? 'text-[8.5px]' : 'text-[10px]'} font-black text-slate-400 uppercase tracking-widest mt-1 opacity-70`}>{stat.label}</p>
                                    {stat.sub && <p className="text-[7px] font-black text-slate-400 uppercase mt-1.5 leading-tight whitespace-nowrap">{stat.sub}</p>}
                                </button>
                            ))}
                            <div className="p-3.5 flex flex-col justify-center items-center text-center border-gray-100">
                                <span className="text-lg md:text-xl font-black tracking-tighter text-[#1E3A5F] leading-none">{disDerived.studentCount}</span>
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1 opacity-70">Actual Students</p>
                                <div className="w-full h-px bg-slate-100 my-2" />
                                <div className="flex items-center justify-center gap-3 text-[8.5px] font-black uppercase tracking-widest text-[#1E3A5F] mb-1.5">
                                    <span>Boys : {disDerived.demographics.boys}</span>
                                    <span className="text-slate-200">|</span>
                                    <span>Girls : {disDerived.demographics.girls}</span>
                                </div>
                                <div className="flex flex-col gap-1 w-full bg-slate-50 rounded-lg p-1.5 border border-slate-100">
                                    <button onClick={() => openAttendanceModal('absent')} className="flex justify-between text-[8px] font-black uppercase hover:text-amber-600 transition-colors px-1">
                                        <span>Absent Today</span>
                                        <span className="text-amber-600">{disDerived.attendanceToday.absent}</span>
                                    </button>
                                    <button onClick={() => openAttendanceModal('missed')} className="flex justify-between text-[8px] font-black uppercase hover:text-red-500 transition-colors px-1">
                                        <span>Missed Courses</span>
                                        <span className="text-red-500">{disDerived.attendanceToday.missed_courses}</span>
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* EXECUTIVE CHARTS (RESTORED) */}
                        <div className="bg-white border border-slate-200 rounded-[24px] shadow-sm p-5">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="font-black text-slate-800 flex items-center gap-2 text-[11px] uppercase tracking-[0.2em]">
                                    <TrendingUp className="w-4 h-4" style={{ color: "#FEBF10" }} /> School Development Trends
                                </h3>
                            </div>
                            <LineAreaChart data={stats.termTrend} labelKey="label" valueKey="value" color="#FEBF10" height={130} />
                            <div className="mt-2 text-center text-[10px] font-black text-slate-300 uppercase tracking-widest">
                                Institutional Enrollment & Avg. GPA Trends
                            </div>
                        </div>

                        <div className="bg-white border border-slate-200 rounded-[24px] shadow-sm p-6 text-center">
                            <h3 className="font-black text-slate-800 flex items-center gap-3 justify-center mb-6 text-[11px] uppercase tracking-[0.2em]">
                                <BarChart3 className="w-4 h-4 text-emerald-500" /> Section Achievement Overview
                            </h3>
                            <ModernBarChart
                                data={stats.feeByClass} labelKey="label" valueKey="value"
                                color="#FEBF10" secondaryKey="limit" secondaryColor="#1E3A5F" height={160}
                            />
                            <div className="flex items-center gap-6 mt-4 justify-center">
                                <span className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-slate-400">
                                    <span className="w-3 h-2 rounded" style={{ background: "#FEBF10" }} />Current Year
                                </span>
                                <span className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-slate-400">
                                    <span className="w-3 h-2 rounded" style={{ background: "#1E3A5F" }} />Previous Year
                                </span>
                            </div>
                        </div>

                    </div>

                    {/* SIDEBAR (RESTORED) */}
                    <div className="space-y-6 lg:col-span-2">
                        <OverviewCard
                            title="Academic Performance"
                            icon={BookOpen}
                            iconColor="text-[#FEBF10]"
                            filterValue={stats.academicFilter || "This Term"}
                            setFilterValue={(v) => setStats(p => ({ ...p, academicFilter: v }))}
                            dataPie={[
                                { label: "Exceptional", value: stats.academicOverview.exceptional, color: "#FEBF10" },
                                { label: "Expected", value: stats.academicOverview.expected, color: "#FED44A" },
                                { label: "Needs Rev", value: stats.academicOverview.needsReview, color: "#ef4444" }
                            ]}
                            demographicStats={{
                                left: { count: `${stats.academicOverview.boys.count}%`, label: "Avg. Boys", subtext: "GPA Score" },
                                right: { count: `${stats.academicOverview.girls.count}%`, label: "Avg. Girls", subtext: "GPA Score" }
                            }}
                            sparklineData={stats.academicOverview.sparkline}
                            detailLabel="GPA Performance"
                            detailValue={stats.core[3].value}
                            trendColor="#FEBF10"
                        />

                        <OverviewCard
                            title="Attendance Overview"
                            icon={CheckCircle}
                            iconColor="text-emerald-500"
                            filterValue={stats.attendanceFilter || "This Term"}
                            setFilterValue={(v) => setStats(p => ({ ...p, attendanceFilter: v }))}
                            dataPie={[
                                { label: "Present", value: stats.attendanceOverview.present, color: "#10b981" },
                                { label: "Absent", value: stats.attendanceOverview.absent, color: "#f43f5e" }
                            ]}
                            demographicStats={{
                                left: { count: stats.attendanceOverview.boys.count, label: "Boys", subtext: `${stats.attendanceOverview.boys.percentage}%` },
                                right: { count: stats.attendanceOverview.girls.count, label: "Girls", subtext: `${stats.attendanceOverview.girls.percentage}%` }
                            }}
                            sparklineData={stats.attendanceOverview.sparkline}
                            detailLabel="Institutional Attendance"
                            detailValue={`${stats.core[2].value} Optimal`}
                            trendColor="#10b981"
                        />

                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;