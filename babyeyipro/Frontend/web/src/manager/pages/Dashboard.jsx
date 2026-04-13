import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import {
    FileText, CheckCircle, Clock, XCircle, AlertTriangle, TrendingUp,
    Activity, BarChart3, ArrowUpRight, ChevronRight, ChevronDown, Building2,
    DollarSign, BookOpen, Award, Zap, Loader2, Info, X, RefreshCw
} from "lucide-react";
import { Link } from "react-router-dom";
import { h } from "../utils/href";

// ================================================================
// LEGACY ANALYTICAL ENGINES (copied exactly from babyeyilite)
// ================================================================
const Badge = ({ status }) => {
    const map = {
        approved: "bg-emerald-100 text-emerald-700 border-emerald-200",
        rejected: "bg-red-100 text-red-700 border-red-200",
        pending: "bg-amber-100 text-amber-700 border-amber-200",
    };
    const cls = map[status?.toLowerCase()?.replace(/ /g, "_")] || "bg-slate-100 text-slate-600 border-slate-200";
    const label = status?.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()) || "—";
    return <span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-[11px] font-semibold border ${cls}`}>{label}</span>;
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
                            <button key={opt} onClick={() => { onChange(opt); setOpen(false); }} className="text-[9px] font-black text-slate-600 uppercase tracking-widest text-left px-3 py-2 hover:bg-slate-50 hover:text-[#FEBF10] rounded-lg transition-colors">
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
                <h3 className="text-[11px] font-black text-slate-800 uppercase tracking-[0.2em]">{title}</h3>
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
// HYBRID COMMAND CENTER
// ================================================================
const Dashboard = () => {
    const { manager } = useAuth();
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        core: [
            { label: "Total Students", value: "1,245" },
            { label: "Teaching Staff", value: "84" },
            { label: "Global Attendance", value: "94.8%" },
            { label: "Institutional GPA", value: "71.4%" },
        ],
        complianceRate: 0,
        termTrend: [
            { label: "Term 1", value: 92, approved: 89 },
            { label: "Term 2", value: 94, approved: 91 },
            { label: "Term 3", value: 91, approved: 88 },
        ],
        feeByClass: [
            { label: "S1", value: 7.5, limit: 10 },
            { label: "S2", value: 8.0, limit: 10 },
            { label: "S3", value: 8.5, limit: 10 },
            { label: "S4", value: 9.0, limit: 12 },
        ],
        recentActivity: [
            { id: "LOG-01", type: "Discipline", detail: "Behavioral alert in Senior 3", time: "10 min ago", status: "pending" },
            { id: "LOG-02", type: "Academic", detail: "Mid-Term Marks published", time: "2 hrs ago", status: "approved" },
            { id: "LOG-03", type: "Finance", detail: "Fee collection milestone", time: "5 hrs ago", status: "approved" },
            { id: "LOG-04", type: "Attendance", detail: "Staff absenteeism flag", time: "1 day ago", status: "rejected" }
        ],
        academicFilter: "This Term",
        attendanceOverview: {
            present: 1000, absent: 50,
            boys: { count: 0, percentage: 0 },
            girls: { count: 0, percentage: 0 },
            sparkline: [{ value: 0 }]
        },
        academicOverview: {
            exceptional: 10, expected: 10, needsReview: 10,
            boys: { count: "0", percentage: 0 },
            girls: { count: "0", percentage: 0 },
            sparkline: [{ value: 0 }]
        }
    });


    useEffect(() => {
        const fetchDashboardData = async () => {
            if (!manager?.school_id) return;
            try {
                // Fetch dynamic stats from our new backend endpoint
                const { default: api } = await import('../services/api');
                const response = await api.get('/dos/dashboard/stats');

                if (response.data && response.data.success) {
                    const dynamicStats = response.data.data;
                    setStats(prev => ({
                        ...prev,
                        core: [
                            { label: "Total Students", value: dynamicStats.totalStudents.toLocaleString() },
                            { label: "Teaching Staff", value: dynamicStats.totalTeachingStaff.toLocaleString() },
                            { label: "Global Attendance", value: `${dynamicStats.globalAttendance}%` },
                            { label: "Institutional GPA", value: `${dynamicStats.institutionalGPA}%` },
                        ],
                        recentActivity: dynamicStats.activityLog || prev.recentActivity,
                        attendanceOverview: dynamicStats.attendanceOverview || prev.attendanceOverview,
                        academicOverview: dynamicStats.academicOverview || prev.academicOverview
                    }));
                }
            } catch (error) {
                console.error("Dashboard data fetch error:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchDashboardData();
    }, [manager]);

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center bg-re-bg">
            <RefreshCw className="animate-spin text-re-orange" />
        </div>
    );

    return (
        <div className="animate-in fade-in duration-700 bg-re-bg min-h-screen">
            <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />

            {/* HERO (Inherited from Teacher Portal) */}
            <section className="relative p-7 md:p-10 text-white overflow-hidden min-h-[230px] flex items-center" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                <div className="absolute inset-0 z-0">
                    <img src="/teacher.jpg" className="w-full h-full object-cover shadow-2xl" />
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-[1px]"></div>
                </div>

                <div className="relative z-10 max-w-4xl">
                    <h1 className="text-2xl md:text-3xl font-black tracking-tight mb-2">
                        Welcome back, <span style={{ color: "#FEBF10" }}>{manager?.name || manager?.first_name || 'Executive Officer'}</span> 👋
                    </h1>
                    <p className="text-sm md:text-base font-bold opacity-90 max-w-2xl italic tracking-tight">
                        Institutional status: <span className="text-emerald-400">Optimal</span>. Strategic systems verified and synchronized for executive oversight.
                    </p>
                </div>
            </section>

            {/* MAIN CONTENT */}
            <div className="max-w-[1400px] mx-auto px-5 md:px-8 -mt-10 relative z-20 pb-14" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">

                    {/* LEFT SECTION */}
                    <div className="lg:col-span-3 space-y-5">

                        {/* STATS GRID (Inherited from Teacher Portal) */}
                        <div className="bg-white rounded-[24px] shadow-2xl border border-black/5 overflow-hidden grid grid-cols-2">
                            {stats.core.map((stat, i) => (
                                <div
                                    key={i}
                                    className={`p-5 flex flex-col items-center justify-center text-center border-gray-100 
                                    ${i % 2 === 0 ? 'border-r' : ''} 
                                    ${i < 2 ? 'border-b' : ''}`}
                                >
                                    <span className="text-xl md:text-2xl font-black tracking-tighter" style={{ color: "#1E3A5F" }}>
                                        {stat.value}
                                    </span>
                                    <p className="text-[10px] font-black text-re-text-muted uppercase tracking-widest mt-1 opacity-60">
                                        {stat.label}
                                    </p>
                                </div>
                            ))}
                        </div>

                        {/* ANALYTICAL TRENDS (Redesigned) */}
                        <div className="bg-white border border-slate-200 rounded-[24px] shadow-sm p-5">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="font-black text-slate-800 flex items-center gap-2 text-[11px] uppercase tracking-[0.2em]">
                                    <TrendingUp className="w-4 h-4" style={{ color: "#FEBF10" }} /> Core Metrics Progress
                                </h3>
                                <div className="flex items-center gap-3 text-[9px] font-black uppercase tracking-widest text-slate-400">
                                    <span className="flex items-center gap-1.5"><span className="w-3 h-1.5 rounded" style={{ background: "#FEBF10" }} /> Enrollment</span>
                                    <span className="flex items-center gap-1.5"><span className="w-3 h-1.5 rounded" style={{ background: "#1E3A5F" }} /> Avg. Score</span>
                                </div>
                            </div>
                            <LineAreaChart data={stats.termTrend} labelKey="label" valueKey="value" color="#FEBF10" height={130} />
                            <div className="mt-2">
                                <LineAreaChart data={stats.termTrend} labelKey="label" valueKey="approved" color="#1E3A5F" height={70} showGrid={false} />
                            </div>
                        </div>

                        {/* FEE VS LIMIT (Redesigned) */}
                        <div className="bg-white border border-slate-200 rounded-[24px] shadow-sm p-6 text-center">
                            <h3 className="font-black text-slate-800 flex items-center gap-3 justify-center mb-6 text-[11px] uppercase tracking-[0.2em]">
                                <BarChart3 className="w-4 h-4 text-emerald-500" /> Section Performance Summary
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

                    {/* RIGHT SECTION (Sidebar) */}
                    <div className="space-y-6 lg:col-span-2">

                        {/* OVERVIEW CARDS (Redesigned) */}
                        <OverviewCard
                            title="Attendance"
                            icon={CheckCircle}
                            iconColor="text-emerald-500"
                            filterValue={stats.attendanceFilter}
                            setFilterValue={(v) => setStats(prev => ({ ...prev, attendanceFilter: v }))}
                            dataPie={[
                                { label: "Present", value: stats.attendanceOverview.present, color: "#10b981" },
                                { label: "Absent", value: stats.attendanceOverview.absent, color: "#f43f5e" }
                            ]}
                            demographicStats={{
                                left: {
                                    count: stats.attendanceOverview.boys.count,
                                    label: "Boys",
                                    subtext: `${stats.attendanceOverview.boys.percentage}%`
                                },
                                right: {
                                    count: stats.attendanceOverview.girls.count,
                                    label: "Girls",
                                    subtext: `${stats.attendanceOverview.girls.percentage}%`
                                }
                            }}
                            sparklineData={stats.attendanceOverview.sparkline}
                            detailLabel="Active Trend vs Absences"
                            detailValue="+2.4% Optimal"
                            trendColor="#10b981"
                        />

                        <OverviewCard
                            title="Academic Overview"
                            icon={BookOpen}
                            iconColor="text-[#FEBF10]"
                            filterValue={stats.academicFilter}
                            setFilterValue={(v) => setStats(prev => ({ ...prev, academicFilter: v }))}
                            dataPie={[
                                { label: "Exceptional", value: stats.academicOverview.exceptional, color: "#FEBF10" },
                                { label: "Expected", value: stats.academicOverview.expected, color: "#FED44A" },
                                { label: "Needs Rev", value: stats.academicOverview.needsReview, color: "#ef4444" }
                            ]}
                            demographicStats={{
                                left: {
                                    count: `${stats.academicOverview.boys.count}%`,
                                    label: "Avg. Boys",
                                    subtext: "GPA Score"
                                },
                                right: {
                                    count: `${stats.academicOverview.girls.count}%`,
                                    label: "Avg. Girls",
                                    subtext: "GPA Score"
                                }
                            }}
                            sparklineData={stats.academicOverview.sparkline}
                            detailLabel="Institutional Performance"
                            detailValue="avg. 71.4% (GPA)"
                            trendColor="#FEBF10"
                        />

                        {/* SYSTEM LOGS */}
                        <div className="bg-white border border-slate-200 rounded-[24px] shadow-2xl overflow-hidden flex flex-col">
                            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                                <h3 className="font-black text-slate-800 flex items-center gap-2 text-[11px] uppercase tracking-widest">
                                    <Award className="w-4 h-4 text-amber-500" /> System Notifications Log
                                </h3>
                                <Link to={h("/settings")} className="text-[9px] font-black text-amber-600 uppercase hover:underline">
                                    View All →
                                </Link>
                            </div>
                            <div className="divide-y divide-slate-50">
                                {stats.recentActivity.map((log) => (
                                    <div key={log.id} className="flex items-center gap-4 px-6 py-4 hover:bg-slate-50 transition-all cursor-pointer group">
                                        <div className="w-9 h-9 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0 group-hover:bg-amber-100 transition-colors">
                                            {log.type === "Discipline" && <AlertTriangle className="w-4 h-4 text-slate-400 group-hover:text-amber-500" />}
                                            {log.type === "Academic" && <BookOpen className="w-4 h-4 text-slate-400 group-hover:text-emerald-500" />}
                                            {log.type === "Finance" && <DollarSign className="w-4 h-4 text-slate-400 group-hover:text-blue-500" />}
                                            {log.type === "Attendance" && <Activity className="w-4 h-4 text-slate-400 group-hover:text-red-500" />}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-black text-slate-800 text-xs tracking-tight">{log.detail}</p>
                                            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-1">{log.time} • {log.type}</p>
                                        </div>
                                        <div className="text-right shrink-0">
                                            <Badge status={log.status} />
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="p-6 border-t border-slate-50">
                                <button
                                    className="w-full flex items-center justify-center gap-2 py-3 text-white rounded-[20px] font-black text-[10px] uppercase tracking-widest shadow-xl active:scale-95 transition-all"
                                    style={{ background: "linear-gradient(135deg, #1E3A5F 0%, #0D2644 100%)" }}>
                                    <Zap className="w-4 h-4" style={{ color: "#FEBF10" }} /> Manage Global Alerts
                                </button>
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;