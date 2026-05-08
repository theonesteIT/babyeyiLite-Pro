import React, { useState, useEffect, useCallback, useMemo } from "react";
import { createPortal } from 'react-dom';
import { useAuth } from "../context/AuthContext";
import { useAcademic } from "../context/AcademicContext";
import {
    Clock, AlertTriangle, TrendingUp,
    Activity, BarChart3, ChevronRight, ChevronDown, Building2,
    DollarSign, Loader2, X, RefreshCw,
    ShieldAlert, Users, Phone, Printer, UserCheck,
    Coins, GraduationCap, UserPlus, FileBarChart2, Receipt, MessageSquare as MessageIcon,
    Download, ShieldCheck,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import api from '../services/api';
import { h } from '../utils/href';

// ================================================================
// ANALYTICAL COMPONENTS
// ================================================================
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
const DonutChart = ({ data = [], size = 140, centerLabel = null, centerSub = 'TOTAL' }) => {
    if (!data.length) return null;
    const total = data.reduce((s, d) => s + d.value, 0);
    const cx = size / 2, cy = size / 2, R = size / 2 - 8, r = R * 0.58;

    if (total === 0) {
        return (
            <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
                <circle cx={cx} cy={cy} r={R} fill="#f1f5f9" stroke="white" strokeWidth="2" />
                <circle cx={cx} cy={cy} r={r - 4} fill="white" />
                <text x={cx} y={cy - 4} textAnchor="middle" fontSize="13" fontWeight="900" fill="#1e293b">{centerLabel != null ? centerLabel : '0'}</text>
                <text x={cx} y={cy + 10} textAnchor="middle" fontSize="7" fontWeight="600" fill="#94a3b8">{centerSub}</text>
            </svg>
        );
    }

    const slices = data.reduce((acc, d) => {
        const a = (d.value / total) * 2 * Math.PI;
        const angleStart = acc.angle;
        const angleEnd = acc.angle + a;
        const x1 = cx + R * Math.cos(angleStart), y1 = cy + R * Math.sin(angleStart);
        const x2 = cx + R * Math.cos(angleEnd), y2 = cy + R * Math.sin(angleEnd);
        const xi1 = cx + r * Math.cos(angleEnd - a), yi1 = cy + r * Math.sin(angleEnd - a);
        const xi2 = cx + r * Math.cos(angleEnd), yi2 = cy + r * Math.sin(angleEnd);
        const large = a > Math.PI ? 1 : 0;
        acc.list.push({
            ...d,
            path: `M${x1},${y1} A${R},${R} 0 ${large},1 ${x2},${y2} L${xi2},${yi2} A${r},${r} 0 ${large},0 ${xi1},${yi1} Z`,
        });
        acc.angle += a;
        return acc;
    }, { angle: -Math.PI / 2, list: [] }).list;
    return (
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
            {slices.map((s, i) => <path key={i} d={s.path} fill={s.color} stroke="white" strokeWidth="2" />)}
            <circle cx={cx} cy={cy} r={r - 4} fill="white" />
            <text x={cx} y={cy - 4} textAnchor="middle" fontSize="13" fontWeight="900" fill="#1e293b">{centerLabel != null ? centerLabel : total}</text>
            <text x={cx} y={cy + 10} textAnchor="middle" fontSize="7" fontWeight="600" fill="#94a3b8">{centerSub}</text>
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

const CLASS_SLICE_COLORS = ['#1E3A5F', '#FEBF10', '#10b981', '#6366f1', '#f43f5e', '#06b6d4', '#a855f7', '#eab308', '#0ea5e9', '#84cc16'];

const DualAcademicPerformanceChart = ({ boysEnd, girlsEnd, height = 210 }) => {
    const n = 6;
    const W = 560;
    const H = height;
    const PAD = { t: 18, r: 14, b: 32, l: 42 };
    const innerW = W - PAD.l - PAD.r;
    const innerH = H - PAD.t - PAD.b;
    const xs = Array.from({ length: n }, (_, i) => PAD.l + (i / (n - 1)) * innerW);
    const series = (end) =>
        Array.from({ length: n }, (_, i) => {
            const t = i / (n - 1);
            const base = end * (0.58 + 0.42 * t);
            return Math.max(0, Math.min(100, base + Math.sin(i * 0.85) * 2.8));
        });
    const boys = series(Math.max(0, Math.min(100, boysEnd)));
    const girls = series(Math.max(0, Math.min(100, girlsEnd)));
    const hi = Math.max(100, ...boys, ...girls, 1);
    const lo = Math.min(0, ...boys, ...girls);
    const rng = hi - lo || 1;
    const yScale = (v) => PAD.t + (1 - (v - lo) / rng) * innerH;
    const pathFrom = (arr) => arr.map((v, i) => `${i === 0 ? 'M' : 'L'}${xs[i].toFixed(1)},${yScale(v).toFixed(1)}`).join(' ');
    const navy = '#1E3A5F';
    const gold = '#FEBF10';
    const gridYs = [0, 0.25, 0.5, 0.75, 1].map((f) => PAD.t + (1 - f) * innerH);
    return (
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height }} preserveAspectRatio="xMidYMid meet">
            {gridYs.map((gy, i) => (
                <line key={i} x1={PAD.l} y1={gy} x2={W - PAD.r} y2={gy} stroke="#e8edf3" strokeWidth="1" strokeDasharray="4 4" />
            ))}
            {[0, 0.25, 0.5, 0.75, 1].map((f, i) => (
                <text key={i} x={PAD.l - 8} y={PAD.t + (1 - f) * innerH + 4} textAnchor="end" fontSize="10" fill="#94a3b8" fontWeight="600">
                    {Math.round(lo + f * rng)}%
                </text>
            ))}
            <path d={pathFrom(boys)} fill="none" stroke={navy} strokeWidth="2.75" strokeLinecap="round" strokeLinejoin="round" />
            <path d={pathFrom(girls)} fill="none" stroke={gold} strokeWidth="2.75" strokeLinecap="round" strokeLinejoin="round" />
            {xs.map((xp, i) => (
                <text key={i} x={xp} y={H - 10} textAnchor="middle" fontSize="10" fill="#64748b" fontWeight="600">{`W${i + 1}`}</text>
            ))}
        </svg>
    );
};

function pctFromOverviewField(v) {
    if (v == null || v === '') return 0;
    const n = parseFloat(String(v).replace(/%/g, '').trim());
    return Number.isFinite(n) ? Math.min(100, Math.max(0, n)) : 0;
}

function sparkSeriesDeltaPct(spark = []) {
    const vals = spark.map((d) => Number(d?.value) || 0).filter((_, i, a) => a.length >= 2);
    if (vals.length < 2) return null;
    const a = vals[0];
    const b = vals[vals.length - 1];
    if (!a && !b) return null;
    if (!a) return '+100%';
    const p = Math.round(((b - a) / Math.max(a, 1)) * 1000) / 10;
    return `${p >= 0 ? '+' : ''}${p}%`;
}

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

function formatRelativeShort(value) {
    if (!value) return 'Just now';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '';
    const sec = Math.round((Date.now() - d.getTime()) / 1000);
    if (sec < 60) return `${sec}s ago`;
    const min = Math.round(sec / 60);
    if (min < 60) return `${min}m ago`;
    const hr = Math.round(min / 60);
    if (hr < 48) return `${hr}h ago`;
    const day = Math.round(hr / 24);
    return `${day}d ago`;
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
    const navigate = useNavigate();
    const academic = useAcademic();
    const roleTokens = useMemo(() => {
        const set = new Set();
        const add = (v) => {
            const s = String(v || '').trim().toUpperCase();
            if (s) set.add(s);
        };
        add(manager?.role);
        add(manager?.user_type);
        add(manager?.staff_role);
        add(manager?.account_type);
        const roles = Array.isArray(manager?.roles) ? manager.roles : [];
        roles.forEach(add);
        return set;
    }, [manager]);
    const canUseDiscipline = useMemo(
        () =>
            ['HOD', 'HEAD_OF_DISCIPLINE', 'DISCIPLINE', 'DISCIPLINE_STAFF'].some((r) => roleTokens.has(r)),
        [roleTokens]
    );
    const canUseAccountant = useMemo(() => roleTokens.has('ACCOUNTANT'), [roleTokens]);
    const [loading, setLoading] = useState(true);
    const [lastUpdated, setLastUpdated] = useState(null);

    // Filter states for discipline data — seeded from the configured academic calendar
    const [filters, setFilters] = useState({
        academic_year: getCurrentAcademicYear(),
        term: getCurrentTerm(),
    });

    // Once the global academic settings load, update filters to match configured values
    useEffect(() => {
        if (!academic.loading && academic.currentTerm && academic.academicYear) {
            setFilters(prev => ({
                academic_year: prev.academic_year === getCurrentAcademicYear() ? academic.academicYear : prev.academic_year,
                term: prev.term === getCurrentTerm() ? academic.currentTerm : prev.term,
            }));
        }
    }, [academic.loading, academic.currentTerm, academic.academicYear]);

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
            sparkline: [{ value: 0 }],
            gateToday: { students_in: 0, staff_in: 0 },
        },
        revenue30d: 0,
        collections14d: [],
        termFinance: { expected: 0, collected: 0, outstanding: 0 },
        academicOverview: {
            exceptional: 0, expected: 0, needsReview: 0,
            hasRealData: false,
            boys: { count: "0", percentage: 0 },
            girls: { count: "0", percentage: 0 },
            sparkline: [{ value: 0 }]
        },
        termTrend: [],
        feeByClass: [],
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
    const [heroDropdown, setHeroDropdown] = useState(null);

    const loadDashboard = useCallback(async () => {
        setLoading(true);
        const { academic_year, term } = filters;

        try {
            const [managerRes, reportRes, permissionsRes, settingsRes, studentsRes, financeRes, termFinanceRes, enrollmentRes] = await Promise.allSettled([
                api.get('/dos/dashboard/stats'),
                canUseDiscipline
                    ? api.get('/discipline/report-summary', { params: { academic_year, term } })
                    : Promise.resolve({ data: { success: false, skipped: true } }),
                api.get('/permissions'),
                canUseDiscipline
                    ? api.get('/discipline/settings')
                    : Promise.resolve({ data: { success: false, skipped: true } }),
                canUseDiscipline
                    ? api.get('/discipline/students-summary', { params: { academic_year, term } })
                    : Promise.resolve({ data: { success: false, skipped: true } }),
                canUseAccountant
                    ? api.get('/accountant/overview')
                    : Promise.resolve({ data: { success: false, skipped: true } }),
                canUseAccountant
                    ? api.get('/accountant/reports/payments', { params: { academic_year, term } })
                    : Promise.resolve({ data: { success: false, skipped: true } }),
                api.get('/dos/class-enrollment'),
            ]);

            // Process Manager Stats
            if (managerRes.status === 'fulfilled' && managerRes.value.data?.success) {
                const d = managerRes.value.data.data;
                const totalStudents = d.totalStudents || 0;
                setStats(prev => ({
                    ...prev,
                    core: [
                        { label: "Total Students",    value: totalStudents.toLocaleString() },
                        { label: "Teaching Staff",    value: (d.totalTeachingStaff || 0).toLocaleString() },
                        { label: "Global Attendance", value: `${d.globalAttendance}%` },
                        { label: "Institutional GPA", value: `${d.institutionalGPA}%` },
                    ],
                    recentActivity:     d.activityLog || [],
                    attendanceOverview: d.attendanceOverview
                        ? { ...prev.attendanceOverview, ...d.attendanceOverview }
                        : prev.attendanceOverview,
                    academicOverview:   d.academicOverview || prev.academicOverview,
                    termTrend:          d.termTrend  || [],
                    feeByClass:         d.feeByClass || [],
                }));
            }

            // Process Finance Stats
            if (financeRes.status === 'fulfilled' && financeRes.value.data?.success) {
                const fin = financeRes.value.data.data;
                const collections14d = (fin.collections_last_14_days || []).map(d => ({
                    label: d.date
                        ? new Date(d.date + 'T00:00:00').toLocaleDateString('en', { month: 'short', day: 'numeric' })
                        : '',
                    value: Number(d.total_paid) || 0,
                }));
                setStats(p => ({ ...p, revenue30d: fin.last_30_days_total_paid || 0, collections14d }));
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

            // Process Class Enrollment (dedicated endpoint — overrides feeByClass from stats)
            if (enrollmentRes.status === 'fulfilled' && enrollmentRes.value.data?.success) {
                const { rows: classRows } = enrollmentRes.value.data.data;
                if (classRows?.length > 0) {
                    const feeByClass = classRows.map(r => ({
                        label: r.class_name,
                        value: r.student_count,
                    }));
                    setStats(p => ({ ...p, feeByClass }));
                }
            }
            // Fallback: use students_by_class from accountant overview if available
            if (
                enrollmentRes.status !== 'fulfilled' || !enrollmentRes.value.data?.success
            ) {
                const fin = financeRes.status === 'fulfilled' && financeRes.value.data?.success
                    ? financeRes.value.data.data : null;
                if (fin?.students_by_class?.length > 0) {
                    const feeByClass = fin.students_by_class.map(r => ({
                        label: r.class_name,
                        value: r.student_count,
                    }));
                    setStats(p => ({ ...p, feeByClass }));
                }
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
    }, [filters, canUseDiscipline, canUseAccountant]);

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

    const boysAvg = pctFromOverviewField(stats.academicOverview.boys.count);
    const girlsAvg = pctFromOverviewField(stats.academicOverview.girls.count);

    const feeLayout = useMemo(() => {
        const { expected, collected, outstanding } = stats.termFinance;
        const pct = expected > 0 ? Math.round((collected / expected) * 1000) / 10 : 0;
        const pending = Math.max(0, expected - collected - outstanding);
        const slices = [];
        if (collected > 0) slices.push({ label: 'Collected', value: collected, color: '#1E3A5F' });
        if (outstanding > 0) slices.push({ label: 'Outstanding', value: outstanding, color: '#FEBF10' });
        if (pending > 0) slices.push({ label: 'Remaining', value: pending, color: '#cbd5e1' });
        if (!slices.length && expected > 0) {
            slices.push({ label: 'Outstanding', value: Math.max(outstanding, expected), color: '#FEBF10' });
        }
        if (!slices.length && collected === 0 && outstanding === 0 && expected === 0) {
            return { slices: [], pct: 0 };
        }
        if (!slices.length) {
            slices.push({ label: 'Collected', value: Math.max(collected, 0.0001), color: '#e8edf3' });
        }
        return { slices, pct };
    }, [stats.termFinance]);

    const classDistribution = useMemo(
        () =>
            stats.feeByClass.map((c, i) => ({
                label: c.label,
                value: c.value,
                color: CLASS_SLICE_COLORS[i % CLASS_SLICE_COLORS.length],
            })),
        [stats.feeByClass]
    );

    const activityFeed = useMemo(() => {
        const raw = Array.isArray(stats.recentActivity) ? stats.recentActivity : [];
        return raw.slice(0, 8).map((a, i) => {
            if (typeof a === 'string') {
                return { id: `s-${i}`, title: a, subtitle: '', ts: null, tone: 'neutral' };
            }
            return {
                id: a.id ?? `a-${i}`,
                title: a.message || a.description || a.title || a.action || a.type || 'School activity',
                subtitle: a.details || a.class_name || a.user || a.module || '',
                ts: a.created_at || a.timestamp || a.time || a.date || null,
                tone: a.severity || a.kind || 'neutral',
            };
        });
    }, [stats.recentActivity]);

    const studentSparkDelta = sparkSeriesDeltaPct(stats.termTrend) ?? sparkSeriesDeltaPct(stats.academicOverview.sparkline);
    const feesSparkDelta = sparkSeriesDeltaPct(stats.collections14d);

    const dashHeroStats = useMemo(() => ([
        {
            label: 'Total students',
            value: stats.core[0].value,
            subValue: studentSparkDelta,
            icon: Users,
            onClick: () => navigate(h('/students')),
        },
        {
            label: 'Fees collected',
            value: stats.termFinance.collected > 1_000_000
                ? `${(stats.termFinance.collected / 1_000_000).toFixed(1)}M RWF`
                : `${stats.termFinance.collected.toLocaleString()} RWF`,
            subValue: feesSparkDelta || `${feeLayout.pct}% of term expected`,
            icon: Coins,
            onClick: () => navigate(h('/finance/payments')),
        },
        {
            label: 'Active classes',
            value: String(classDistribution.length || 0),
            subValue: 'Enrolled cohorts',
            icon: GraduationCap,
            onClick: () => navigate(h('/reports/academic')),
        },
        {
            label: 'Teachers',
            value: stats.core[1].value,
            subValue: 'Teaching personnel',
            icon: UserCheck,
            onClick: () => navigate(h('/hr')),
        },
    ]), [stats.core, stats.termFinance.collected, classDistribution.length, studentSparkDelta, feesSparkDelta, feeLayout.pct, navigate]);

    const quickActionItems = useMemo(() => ([
        { label: 'Add / review students', path: '/students' },
        { label: 'Collect fees', path: '/finance/payments' },
        { label: 'Academic reports', path: '/reports/academic' },
        { label: 'Invoices wizard', path: '/finance/wizard' },
        { label: 'Messages', path: '/chat' },
    ]), []);

    // Modal actions
    const openAttendanceModal = useCallback(async (kind) => {
        setAttendanceModal(kind);
        setAttendanceRows([]); setAttendanceError(null); setAttendanceLoading(true);
        if (!canUseDiscipline) {
            setAttendanceError('Attendance details are not available for your account role.');
            setAttendanceLoading(false);
            return;
        }
        try {
            const res = await api.get('/discipline/attendance-today-details', { params: { kind } });
            if (res.data?.success) setAttendanceRows(res.data.data || []);
            else setAttendanceError(res.data?.message || 'Failed to load details.');
        } catch { setAttendanceError('Failed to load attendance details.'); }
        finally { setAttendanceLoading(false); }
    }, [canUseDiscipline]);

    const openCasesModal = useCallback(async () => {
        setInsightModal('cases');
        setCasesRows([]); setCasesError(null); setCasesLoading(true);
        if (!canUseDiscipline) {
            setCasesError('Discipline case details are not available for your account role.');
            setCasesLoading(false);
            return;
        }
        try {
            const res = await api.get('/discipline/cases', { params: { academic_year: filters.academic_year, term: filters.term, limit: 80 } });
            if (res.data?.success) setCasesRows(res.data.data || []);
            else setCasesError(res.data?.message || 'Failed to load cases.');
        } catch { setCasesError('Failed to load cases.'); }
        finally { setCasesLoading(false); }
    }, [filters, canUseDiscipline]);

    // JSX Components for Modals
    const AttendanceModal = attendanceModal ? createPortal(
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white w-full max-w-2xl max-h-[90vh] rounded-[28px] shadow-sm border border-black/10 overflow-hidden flex flex-col">
                <div className="px-6 py-5 bg-gradient-to-br from-[#1E3A5F] to-[#0D2644] text-white shrink-0">
                    <div className="flex items-center justify-between gap-4">
                        <div className="min-w-0">
                            <p className="text-[9px] font-semibold uppercase tracking-[0.3em]" style={{ color: "#FEBF10" }}>Attendance Today</p>
                            <h3 className="text-base font-semibold uppercase tracking-widest mt-1 truncate">{attendanceModal === 'absent' ? 'Absent Learners' : 'Missed Courses'}</h3>
                        </div>
                        <button onClick={() => setAttendanceModal(null)} className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-all"><X size={18} /></button>
                    </div>
                </div>
                <div className="px-6 py-5 overflow-y-auto">
                    {attendanceError && <div className="p-3 bg-red-50 text-red-700 text-[10px] font-semibold uppercase tracking-widest rounded-xl mb-4">{attendanceError}</div>}
                    {attendanceLoading ? <Loader2 className="animate-spin mx-auto my-10" /> : attendanceRows.map(r => (
                        <div key={r.id} className="p-4 border border-black/5 rounded-2xl mb-3 flex items-center justify-between">
                            <div>
                                <p className="text-[11px] font-semibold text-slate-800 uppercase">{r.first_name} {r.last_name}</p>
                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{r.class_name}</p>
                            </div>
                            <a href={`tel:${r.father_phone || r.mother_phone}`} className="h-8 rounded-xl px-3 bg-re-bg border border-black/5 flex items-center gap-2 text-[9px] font-semibold uppercase"><Phone size={12} className="text-re-gold" />Call</a>
                        </div>
                    ))}
                </div>
            </div>
        </div>, document.body
    ) : null;

    const InsightModal = insightModal ? createPortal(
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white w-full max-w-2xl max-h-[90vh] rounded-[28px] shadow-sm border border-black/10 overflow-hidden flex flex-col">
                <div className="px-6 py-5 bg-gradient-to-br from-[#1E3A5F] to-[#0D2644] text-white shrink-0">
                    <div className="flex items-center justify-between gap-4">
                        <div className="min-w-0">
                            <p className="text-[9px] font-semibold uppercase tracking-[0.3em]" style={{ color: "#FEBF10" }}>Intelligence Insight</p>
                            <h3 className="text-base font-semibold uppercase tracking-widest mt-1 truncate">{insightModal === 'cases' ? 'Discipline Cases' : 'At-Risk Learners'}</h3>
                        </div>
                        <button onClick={() => setInsightModal(null)} className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-all"><X size={18} /></button>
                    </div>
                </div>
                <div className="px-6 py-5 overflow-y-auto">
                    {insightModal === 'cases' && casesError && (
                        <div className="p-3 bg-red-50 text-red-700 text-[10px] font-semibold uppercase tracking-widest rounded-xl mb-4">{casesError}</div>
                    )}
                    {insightModal === 'cases' ? (
                        casesLoading ? <Loader2 className="animate-spin mx-auto my-10" /> : casesRows.map(c => (
                            <div key={c.id} className="p-4 border border-black/5 rounded-2xl mb-3 flex justify-between">
                                <div><p className="text-[11px] font-semibold uppercase">{c.first_name} {c.last_name}</p><p className="text-[9px] font-bold text-slate-400 uppercase mt-1">{c.class_name} · {formatDateTime(c.created_at)}</p></div>
                                <span className="text-red-600 font-semibold text-xs">-{c.marks_deducted}</span>
                            </div>
                        ))
                    ) : disDerived.atRiskRows.map(r => (
                        <div key={r.id} className="p-4 border border-black/5 rounded-2xl mb-3 flex justify-between items-center">
                            <p className="text-[11px] font-semibold uppercase">{r.name}</p>
                            <span className={`text-sm font-semibold ${r.tone === 'critical' ? 'text-red-600' : 'text-amber-600'}`}>{r.pct}%</span>
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
        <div className="animate-in fade-in duration-500 bg-re-bg min-h-full pb-24 lg:pb-10">
            {AttendanceModal}
            {InsightModal}

            {/* ── Hero (aligned with HR Central institutional pattern) ── */}
            <div className="relative w-full min-h-[200px] sm:min-h-[220px] overflow-hidden bg-[#c87800]">
                <div className="absolute -top-28 -right-28 w-[22rem] h-[22rem] rounded-full border border-white/[0.07] pointer-events-none" aria-hidden />
                <div className="absolute -top-14 -right-14 w-[15rem] h-[15rem] rounded-full border border-white/[0.06] pointer-events-none" aria-hidden />
                <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-[#FEBF10]/30 to-transparent pointer-events-none" aria-hidden />

                <div className="relative z-10 max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-12 pt-10 sm:pt-12 pb-20 sm:pb-24">
                    <div className="space-y-1 max-w-3xl">
                        <div className="flex items-center gap-2 mb-1">
                            <span className="w-5 h-1 rounded-full bg-[#FEBF10]" aria-hidden />
                       
                        </div>
                        <h1 className="text-xl md:text-2xl font-semibold text-white tracking-tight leading-none mb-1 mt-1 uppercase" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                            Manager dashboard
                        </h1>
                        
                    </div>
                </div>
            </div>

            <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 -mt-4 sm:-mt-5 pt-2 relative z-20 mb-6 sm:mb-8">
                <div className="bg-white rounded-t-[32px] shadow-sm border border-black/10 overflow-hidden flex flex-col">
                    <div className="grid grid-cols-1 lg:grid-cols-4 border-b border-black/5">
                        <div className="lg:col-span-3 grid grid-cols-2 xl:grid-cols-4 divide-x divide-y lg:divide-y-0 divide-black/5">
                            {dashHeroStats.map((stat) => (
                                <button
                                    key={stat.label}
                                    type="button"
                                    onClick={stat.onClick}
                                    className="p-4 sm:p-5 flex flex-col items-center justify-center text-center group hover:bg-re-bg/40 transition-all cursor-pointer min-h-[7.5rem]"
                                >
                                    <div className="mb-1 sm:mb-1.5 opacity-40 shrink-0" style={{ color: '#FEBF10' }}>
                                        <stat.icon size={12} className="mb-1.5 mx-auto" strokeWidth={2} aria-hidden />
                                    </div>
                                    <span className="text-sm sm:text-lg font-semibold text-re-text tabular-nums tracking-tight group-hover:text-[#1E3A5F] transition-colors leading-snug">
                                        {stat.value}
                                    </span>
                                    <p className="text-[7px] sm:text-[8px] font-semibold text-re-text-muted uppercase tracking-[0.12em] mt-0.5 opacity-65">
                                        {stat.label}
                                    </p>
                                    {stat.subValue && (
                                        <p
                                            className={`text-[6px] sm:text-[7px] font-semibold uppercase tracking-[0.14em] mt-1 opacity-80 max-w-[11rem] ${String(stat.subValue).startsWith('-') ? 'text-rose-600' : 'text-[#1E3A5F]'}`}
                                        >
                                            {stat.subValue}
                                        </p>
                                    )}
                                </button>
                            ))}
                        </div>

                        <div className="hidden lg:flex flex-col border-t lg:border-t-0 lg:border-l border-black/5 bg-re-bg/30 p-6 justify-center gap-3 relative">
                            <div className="relative">
                                <button
                                    type="button"
                                    onClick={() => setHeroDropdown(heroDropdown === 'export' ? null : 'export')}
                                    className="w-full h-11 flex items-center justify-center gap-2 text-white rounded-xl font-medium text-[9px] uppercase tracking-widest border border-black/10 shadow-sm active:scale-95 transition-all"
                                    style={{ background: 'linear-gradient(135deg, #1E3A5F 0%, #0D2644 100%)' }}
                                >
                                    <Download size={14} aria-hidden />
                                    <span>Export records</span>
                                    <ChevronDown size={12} className={`transition-transform duration-300 ${heroDropdown === 'export' ? 'rotate-180' : ''}`} aria-hidden />
                                </button>
                                {heroDropdown === 'export' && (
                                    <>
                                        <button type="button" className="fixed inset-0 z-[40] cursor-default bg-transparent" aria-label="Dismiss" onClick={() => setHeroDropdown(null)} />
                                        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-black/10 shadow-md rounded-2xl overflow-hidden py-1 z-[50] animate-in slide-in-from-top-2 duration-200">
                                            <button
                                                type="button"
                                                className="w-full text-left px-4 py-3 text-[10px] font-semibold uppercase tracking-widest text-re-text hover:bg-re-bg transition-colors flex items-center gap-2.5"
                                                onClick={() => {
                                                    window.print();
                                                    setHeroDropdown(null);
                                                }}
                                            >
                                                <Printer size={14} style={{ color: '#FEBF10' }} aria-hidden /> Print overview
                                            </button>
                                            <button
                                                type="button"
                                                className="w-full text-left px-4 py-3 text-[10px] font-semibold uppercase tracking-widest text-re-text hover:bg-re-bg transition-colors flex items-center gap-2.5 border-t border-black/5"
                                                onClick={() => {
                                                    navigate(h('/reports/academic'));
                                                    setHeroDropdown(null);
                                                }}
                                            >
                                                <FileBarChart2 size={14} style={{ color: '#FEBF10' }} aria-hidden /> Open academic reports
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>

                            <div className="relative">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setHeroDropdown(heroDropdown === 'quick' ? null : 'quick');
                                    }}
                                    className="w-full h-11 flex items-center justify-center gap-2 bg-white border border-black/5 text-re-text font-medium text-[9px] uppercase tracking-widest rounded-xl hover:bg-re-bg transition-all"
                                >
                                    <ShieldCheck size={14} style={{ color: '#FEBF10' }} aria-hidden />
                                    <span>Quick actions</span>
                                    <ChevronDown size={12} className={`transition-transform duration-300 ${heroDropdown === 'quick' ? 'rotate-180' : ''}`} aria-hidden />
                                </button>
                                {heroDropdown === 'quick' && (
                                    <>
                                        <button type="button" className="fixed inset-0 z-[40] cursor-default bg-transparent" aria-label="Dismiss" onClick={() => setHeroDropdown(null)} />
                                        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-black/10 shadow-md rounded-2xl overflow-hidden py-1 z-[50] animate-in slide-in-from-top-2 duration-200 max-h-[min(60vh,20rem)] overflow-y-auto manager-sidebar-scroll">
                                            {quickActionItems.map((item) => (
                                                <button
                                                    key={item.path}
                                                    type="button"
                                                    className="w-full text-left px-4 py-3 text-[10px] font-semibold uppercase tracking-widest text-re-text hover:bg-re-bg transition-colors border-t border-black/5 first:border-t-0"
                                                    onClick={() => {
                                                        navigate(h(item.path));
                                                        setHeroDropdown(null);
                                                    }}
                                                >
                                                    {item.label}
                                                </button>
                                            ))}
                                        </div>
                                    </>
                                )}
                            </div>

                            <button
                                type="button"
                                onClick={() => {
                                    loadDashboard();
                                    setHeroDropdown(null);
                                }}
                                className="w-full h-11 flex items-center justify-center gap-2 rounded-xl font-medium text-[9px] uppercase tracking-widest text-[#1E3A5F] border border-[#FEBF10]/40 bg-[#FEBF10]/15 hover:bg-[#FEBF10]/25 transition-all"
                            >
                                <RefreshCw size={14} aria-hidden />
                                Refresh data
                            </button>
                        </div>
                    </div>

                    {/* Mobile / tablet CTAs */}
                    <div className="lg:hidden grid grid-cols-2 gap-2 p-4 border-b border-black/5 bg-white">
                        <div className="relative">
                            <button
                                type="button"
                                onClick={() => setHeroDropdown(heroDropdown === 'export' ? null : 'export')}
                                className="w-full h-10 flex items-center justify-center gap-2 text-white rounded-xl font-medium text-[9px] uppercase tracking-widest border border-black/10 shadow-sm"
                                style={{ background: 'linear-gradient(135deg, #1E3A5F 0%, #0D2644 100%)' }}
                            >
                                <Download size={14} aria-hidden />
                                Export
                                <ChevronDown size={11} className={heroDropdown === 'export' ? 'rotate-180' : ''} aria-hidden />
                            </button>
                            {heroDropdown === 'export' && (
                                <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-black/10 shadow-md rounded-xl overflow-hidden py-1 z-[50]">
                                    <button
                                        type="button"
                                        className="w-full text-left px-3 py-2.5 text-[10px] font-bold text-slate-800 hover:bg-slate-50"
                                        onClick={() => { window.print(); setHeroDropdown(null); }}
                                    >
                                        Print overview
                                    </button>
                                    <button
                                        type="button"
                                        className="w-full text-left px-3 py-2.5 text-[10px] font-bold text-slate-800 hover:bg-slate-50 border-t border-black/5"
                                        onClick={() => { navigate(h('/reports/academic')); setHeroDropdown(null); }}
                                    >
                                        Academic reports
                                    </button>
                                </div>
                            )}
                        </div>
                        <div className="relative">
                            <button
                                type="button"
                                onClick={() => setHeroDropdown(heroDropdown === 'quick' ? null : 'quick')}
                                className="w-full h-10 flex items-center justify-center gap-2 bg-[#FEBF10]/15 border border-[#FEBF10]/40 text-[#1E3A5F] rounded-xl font-medium text-[9px] uppercase tracking-widest"
                            >
                                Quick actions
                                <ChevronDown size={11} className={heroDropdown === 'quick' ? 'rotate-180' : ''} aria-hidden />
                            </button>
                            {heroDropdown === 'quick' && (
                                <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-black/10 shadow-md rounded-xl overflow-hidden py-1 z-[50] max-h-56 overflow-y-auto manager-sidebar-scroll">
                                    {quickActionItems.map((item) => (
                                        <button
                                            key={item.path}
                                            type="button"
                                            className="w-full text-left px-3 py-2.5 text-[13px] font-medium text-slate-700 hover:bg-slate-50 border-t border-black/5 first:border-t-0"
                                            onClick={() => { navigate(h(item.path)); setHeroDropdown(null); }}
                                        >
                                            {item.label}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Backdrops for hero dropdowns (mobile tap-outside when fixed layer not used) */}
            {heroDropdown && (
                <button type="button" className="fixed inset-0 z-[35] lg:hidden bg-transparent cursor-default" aria-label="Close menu" onClick={() => setHeroDropdown(null)} />
            )}

            <div className="px-4 sm:px-6 lg:px-8 py-5 sm:py-7 max-w-[1480px] mx-auto space-y-6 sm:space-y-8">

                {/* Discipline shortcuts (compact) */}
                {canUseDiscipline && (
                    <div className="flex flex-wrap gap-2">
                        <button
                            type="button"
                            onClick={() => openAttendanceModal('absent')}
                            className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-sm ring-1 ring-slate-200 hover:ring-re-gold/40"
                        >
                            <Clock size={14} /> Absent today
                            <span className="text-re-gold font-bold">{disDerived.attendanceToday.absent}</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => openAttendanceModal('missed')}
                            className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-sm ring-1 ring-slate-200 hover:ring-re-gold/40"
                        >
                            <AlertTriangle size={14} /> Missed courses
                            <span className="text-rose-600 font-bold">{disDerived.attendanceToday.missed_courses}</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => openCasesModal()}
                            className="inline-flex items-center gap-2 rounded-full bg-[#1E3A5F] px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-[#152d4a]"
                        >
                            <ShieldAlert size={14} /> Discipline cases
                        </button>
                    </div>
                )}

                {/* Academic + fees row */}
                <section className="grid grid-cols-1 xl:grid-cols-3 gap-4 lg:gap-6">
                    <div className="xl:col-span-2 rounded-2xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-[0_8px_30px_-22px_rgba(15,34,66,0.25)]">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                            <h2 className="text-sm sm:text-base font-bold text-slate-800">Academic performance overview</h2>
                            <div className="flex flex-wrap items-center gap-4 text-xs font-semibold">
                                <span className="inline-flex items-center gap-2 text-[#1E3A5F]">
                                    <span className="h-2 w-6 rounded-full bg-[#1E3A5F]" /> Boys average
                                </span>
                                <span className="inline-flex items-center gap-2 text-re-gold-dark">
                                    <span className="h-2 w-6 rounded-full bg-re-gold" /> Girls average
                                </span>
                            </div>
                        </div>
                        <DualAcademicPerformanceChart
                            boysEnd={boysAvg || pctFromOverviewField(stats.core[3].value)}
                            girlsEnd={girlsAvg || pctFromOverviewField(stats.core[3].value)}
                            height={220}
                        />
                        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/80 px-4 py-3">
                                <div>
                                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Boys average</p>
                                    <p className="text-lg font-bold text-[#1E3A5F] tabular-nums">
                                        {String(stats.academicOverview.boys.count || '').includes('%')
                                            ? stats.academicOverview.boys.count
                                            : `${boysAvg || pctFromOverviewField(stats.academicOverview.boys.count)}%`}
                                    </p>
                                </div>
                                <div className="h-10 w-24">
                                    <MiniSparkline data={stats.academicOverview.sparkline} color="#1E3A5F" height={40} />
                                </div>
                            </div>
                            <div className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/80 px-4 py-3">
                                <div>
                                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Girls average</p>
                                    <p className="text-lg font-bold text-re-gold-dark tabular-nums">
                                        {String(stats.academicOverview.girls.count || '').includes('%')
                                            ? stats.academicOverview.girls.count
                                            : `${girlsAvg || pctFromOverviewField(stats.academicOverview.girls.count)}%`}
                                    </p>
                                </div>
                                <div className="h-10 w-24">
                                    <MiniSparkline data={stats.academicOverview.sparkline} color="#FEBF10" height={40} />
                                </div>
                            </div>
                        </div>
                        <p className="mt-3 text-[11px] text-slate-400 font-medium">
                            {stats.academicOverview.hasRealData ? 'Modelled trend from recorded marks (6-week view).' : 'Trend is illustrative; institutional GPA from your latest sync.'}
                        </p>
                    </div>

                    <div className="rounded-2xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-[0_8px_30px_-22px_rgba(15,34,66,0.25)] flex flex-col">
                        <h2 className="text-sm sm:text-base font-bold text-slate-800 mb-4">Fee collection summary</h2>
                        <div className="flex flex-1 flex-col items-center justify-center gap-4">
                            {feeLayout.slices.length === 0 ? (
                                <div className="flex h-[168px] w-[168px] flex-col items-center justify-center rounded-full border-2 border-dashed border-slate-200 bg-slate-50 text-center p-6">
                                    <p className="text-2xl font-bold text-slate-800">{feeLayout.pct}%</p>
                                    <p className="text-[11px] font-semibold text-slate-500 mt-1 uppercase tracking-wide">No fee totals yet</p>
                                </div>
                            ) : (
                                <DonutChart
                                    data={feeLayout.slices}
                                    size={168}
                                    centerLabel={`${feeLayout.pct}%`}
                                    centerSub="collected"
                                />
                            )}
                            <ul className="w-full space-y-2 text-[13px]">
                                {['Collected', 'Outstanding', 'Remaining'].map((key) => {
                                    const { collected, outstanding, expected } = stats.termFinance;
                                    const remaining = Math.max(0, expected - collected - outstanding);
                                    const map = {
                                        Collected: { value: collected, color: '#1E3A5F' },
                                        Outstanding: { value: outstanding, color: '#FEBF10' },
                                        Remaining: { value: remaining, color: '#94a3b8' },
                                    };
                                    const row = map[key];
                                    return (
                                        <li key={key} className="flex items-center justify-between gap-2">
                                            <span className="inline-flex items-center gap-2 text-slate-600 font-medium">
                                                <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: row.color }} />
                                                {key}
                                            </span>
                                            <span className="font-semibold text-slate-800 tabular-nums">{row.value.toLocaleString()} RWF</span>
                                        </li>
                                    );
                                })}
                            </ul>
                        </div>
                        <Link
                            to={h('/finance')}
                            className="mt-4 inline-flex items-center justify-center gap-1 text-sm font-semibold text-re-navy hover:text-re-gold transition-colors"
                        >
                            View fee reports
                            <ChevronRight size={16} />
                        </Link>
                    </div>
                </section>

                {/* Bottom row */}
                <section className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6">
                    <div className="lg:col-span-4 rounded-2xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-[0_8px_30px_-22px_rgba(15,34,66,0.25)]">
                        <div className="flex items-center justify-between gap-2 mb-4">
                            <h2 className="text-sm font-bold text-slate-800">Students by class</h2>
                            {classDistribution.length > 0 && (
                                <span className="text-xs font-bold text-slate-500 tabular-nums">
                                    {classDistribution.reduce((s, c) => s + c.value, 0).toLocaleString()} total
                                </span>
                            )}
                        </div>
                        {classDistribution.length > 0 ? (
                            <div className="flex flex-col sm:flex-row items-center gap-4">
                                <DonutChart data={classDistribution} size={168} centerSub="students" />
                                <ul className="flex-1 w-full space-y-2 max-h-48 overflow-y-auto pr-1">
                                    {classDistribution.map((c) => (
                                        <li key={c.label} className="flex items-center justify-between text-[12px] gap-2">
                                            <span className="inline-flex items-center gap-2 min-w-0 font-medium text-slate-600">
                                                <span className="h-2 w-2 rounded-full shrink-0" style={{ background: c.color }} />
                                                <span className="truncate">{c.label}</span>
                                            </span>
                                            <span className="font-bold text-slate-800 tabular-nums shrink-0">{c.value}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center gap-2 py-12 text-slate-400 text-sm">
                                <BarChart3 size={32} className="opacity-40" />
                                No class distribution yet
                            </div>
                        )}
                    </div>

                    <div className="lg:col-span-4 rounded-2xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-[0_8px_30px_-22px_rgba(15,34,66,0.25)]">
                        <h2 className="text-sm font-bold text-slate-800 mb-4">Quick access</h2>
                        <div className="grid grid-cols-2 gap-3">
                            {[{
                                label: 'Add student',
                                icon: UserPlus,
                                path: '/students',
                            }, {
                                label: 'Collect fees',
                                icon: DollarSign,
                                path: '/finance/payments',
                            }, {
                                label: 'View reports',
                                icon: FileBarChart2,
                                path: '/reports/academic',
                            }, {
                                label: 'Invoices',
                                icon: Receipt,
                                path: '/finance/wizard',
                            }, {
                                label: 'School profile',
                                icon: Building2,
                                path: '/registry',
                            }, {
                                label: 'Messages',
                                icon: MessageIcon,
                                path: '/chat',
                            }].map((item) => (
                                <Link
                                    key={item.path}
                                    to={h(item.path)}
                                    className="flex flex-col items-center justify-center gap-2 rounded-xl border border-slate-100 bg-slate-50/60 px-3 py-4 text-center transition-all hover:border-re-gold/40 hover:bg-white hover:shadow-md"
                                >
                                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-slate-200/80 text-re-navy">
                                        <item.icon size={18} strokeWidth={2} />
                                    </div>
                                    <span className="text-[12px] font-semibold text-slate-700 leading-tight">{item.label}</span>
                                </Link>
                            ))}
                        </div>
                    </div>

                    <div className="lg:col-span-4 rounded-2xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-[0_8px_30px_-22px_rgba(15,34,66,0.25)] flex flex-col min-h-[280px]">
                        <h2 className="text-sm font-bold text-slate-800 mb-4">Recent activities</h2>
                        <ul className="space-y-3 flex-1 overflow-y-auto max-h-80 pr-1">
                            {activityFeed.length === 0 && (
                                <li className="text-sm text-slate-400 py-6 text-center">No recent events yet.</li>
                            )}
                            {activityFeed.map((row, idx) => {
                                const colors = ['bg-re-gold/15 text-re-gold-dark', 'bg-[#1E3A5F]/10 text-[#1E3A5F]', 'bg-emerald-100 text-emerald-700', 'bg-violet-100 text-violet-700', 'bg-rose-100 text-rose-700'];
                                const chip = colors[idx % colors.length];
                                return (
                                    <li key={row.id} className="flex gap-3">
                                        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${chip}`}>
                                            <Activity size={18} />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="text-[13px] font-semibold text-slate-800 leading-snug break-words">{row.title}</p>
                                            {row.subtitle && (
                                                <p className="text-[11px] text-slate-500 mt-0.5 truncate">{row.subtitle}</p>
                                            )}
                                            <p className="text-[11px] text-slate-400 mt-1 font-medium">{formatRelativeShort(row.ts)}</p>
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>
                    </div>
                </section>

                {/* Accountant trend + gate (secondary) */}
                <section className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
                    {canUseAccountant && stats.collections14d.length > 0 && (
                        <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-[0_8px_30px_-22px_rgba(15,34,66,0.25)]">
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                                    <TrendingUp className="text-re-gold" size={18} /> Fee collections · 14 days
                                </h3>
                                <span className="text-[11px] font-semibold text-slate-400">
                                    {(stats.revenue30d > 1_000_000
                                        ? `${(stats.revenue30d / 1_000_000).toFixed(1)}M`
                                        : stats.revenue30d.toLocaleString())} RWF / 30d
                                </span>
                            </div>
                            <LineAreaChart data={stats.collections14d} labelKey="label" valueKey="value" color="#10b981" height={120} />
                        </div>
                    )}
                    <div className={`rounded-2xl border border-slate-200/90 bg-white p-5 shadow-[0_8px_30px_-22px_rgba(15,34,66,0.25)] ${canUseAccountant && stats.collections14d.length > 0 ? '' : 'lg:col-span-2'}`}>
                        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                                <TrendingUp className="text-re-gold" size={18} /> Gate check-ins trend
                            </h3>
                            <span className="text-[11px] font-semibold text-emerald-600">
                                Live · {stats.attendanceOverview.gateToday.students_in} students · {stats.attendanceOverview.gateToday.staff_in} staff today
                            </span>
                        </div>
                        <LineAreaChart data={stats.termTrend} labelKey="label" valueKey="value" color="#FEBF10" height={120} />
                    </div>
                </section>
            </div>
        </div>
    );
};

export default Dashboard;