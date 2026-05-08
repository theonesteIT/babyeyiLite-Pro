import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { h } from '../utils/href';
import { createPortal } from 'react-dom';
import { AreaChart, Area, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import {
    GraduationCap, Search, ArrowLeft, Download, FileText, FileSpreadsheet,
    Eye, TrendingUp, Activity, User, BookOpen, ChevronDown, CheckCircle, AlertTriangle,
    X, Phone, Mail, Award, Clock, Tag, Home, Printer, Users
} from 'lucide-react';

// ── Student Detail Modal (Drawer Style) ──────────────────────────────────────
const StudentModal = ({ student, onClose }) => {
    if (!student) return null;

    // OPTIMIZATION: Pre-calculate complex SVG math geometries once, rather than inline 15 times in JSX
    const t1 = Math.max(20, student.gpa - 12);
    const t2 = Math.max(20, student.gpa - 5);
    const curr = student.gpa;
    const isStrong = student.gpa > 75;
    const isMid = student.gpa > 60;
    const strokeColor = isStrong ? "#1E3A5F" : (isMid ? "#FEBF10" : "#ef4444");

    return createPortal(
        <>
            {/* Backdrop Blur */}
            <div
                className="fixed inset-0 bg-black/40 backdrop-blur-md z-[100] animate-in fade-in duration-300"
                onClick={onClose}
            />

            {/* Right Side Drawer */}
            <div className="fixed inset-y-0 right-0 z-[110] w-full md:w-[420px] bg-white shadow-[-20px_0_60px_-15px_rgba(0,0,0,0.1)] flex flex-col animate-in slide-in-from-right duration-500 ease-out">

                {/* Drawer Header */}
                <div className="flex items-center justify-between px-8 py-6 border-b border-black/5 bg-white shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-re-bg border border-black/5 flex items-center justify-center text-re-text font-black text-lg shadow-inner relative overflow-hidden">
                            <span className="relative z-10" style={{ color: "#1E3A5F" }}>{student.name.charAt(0)}</span>
                            <div className="absolute inset-0 opacity-5" style={{ background: "#FEBF10" }}></div>
                        </div>
                        <div>
                            <h3 className="font-black text-re-text text-base leading-tight uppercase tracking-tight">{student.name}</h3>
                            <p className="text-[9px] text-re-text-muted font-bold flex items-center gap-1 uppercase tracking-widest mt-0.5 opacity-40">
                                <span className="w-1 h-1 rounded-full" style={{ background: "#FEBF10" }}></span>
                                Institutional ID: {student.id}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2.5 hover:bg-re-bg rounded-xl transition-all text-re-text-muted hover:text-[#1E3A5F] group"
                    >
                        <X size={18} className="group-hover:rotate-90 transition-transform duration-300" />
                    </button>
                </div>

                {/* Drawer Body (Scrollable) */}
                <div className="flex-1 overflow-y-auto px-8 py-8 space-y-8 custom-scrollbar">

                    {/* Status Alert (Premium Badge) */}
                    <div className={`flex items-center gap-3 px-4 py-3 rounded-2xl border ${student.status === 'Exceptional' ? 'bg-emerald-50 border-emerald-100/50' : student.status === 'Review Required' ? 'bg-red-50 border-red-100/50' : 'bg-re-navy/5 border-re-navy/10'}`}>
                        <div className={`p-1.5 rounded-lg ${student.status === 'Exceptional' ? 'bg-emerald-500' : student.status === 'Review Required' ? 'bg-red-500' : 'bg-[#1E3A5F]'} text-white`}>
                            <Award size={14} />
                        </div>
                        <div>
                            <p className={`text-[10px] font-black uppercase tracking-widest ${student.status === 'Review Required' ? 'text-red-600' : 'text-re-text'}`}>{student.status} Performing Student</p>
                            <p className="text-[9px] text-re-text/40 font-bold uppercase tracking-tight leading-none mt-0.5">Academic cycle normalized status</p>
                        </div>
                    </div>

                    {/* Academic Hero Section (Marks & Presence) */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-re-bg rounded-3xl p-5 border border-black/5 shadow-inner relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-16 h-16 bg-[#1E3A5F] opacity-5 rounded-full -mr-6 -mt-6 group-hover:scale-125 transition-transform duration-700" />
                            <p className="text-[8px] text-re-text-muted uppercase tracking-[0.2em] font-black mb-1 relative z-10 opacity-60">Avg Score</p>
                            <div className="flex items-baseline gap-1 relative z-10">
                                <span className="text-2xl font-black text-re-text tracking-tighter">{student.gpa}</span>
                                <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: "#FEBF10" }}>%</span>
                            </div>
                        </div>
                        <div className="bg-re-bg rounded-3xl p-5 border border-black/5 shadow-inner relative overflow-hidden group text-right">
                            <div className="absolute top-0 left-0 w-16 h-16 opacity-5 rounded-full -ml-6 -mt-6 group-hover:scale-125 transition-transform duration-700" style={{ background: "#FEBF10" }} />
                            <p className="text-[8px] text-re-text-muted uppercase tracking-[0.2em] font-black mb-1 relative z-10 opacity-60">Presence Status</p>
                            <div className="flex items-baseline gap-1 justify-end relative z-10">
                                <span className="text-[12px] font-black text-re-text tracking-tighter uppercase whitespace-nowrap">{student.attendance}</span>
                            </div>
                        </div>
                    </div>

                    {/* Detailed Info Matrix */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="text-[9px] font-black text-re-text-muted uppercase tracking-[0.3em] opacity-40">Profile Intelligence</span>
                            <div className="flex-1 h-px bg-black/5" />
                        </div>
                        {[
                            { label: 'Class Rank', value: '#' + student.rank, icon: TrendingUp },
                            { label: 'Math Mastery', value: student.math + '%', icon: FileText },
                            { label: 'Science Mastery', value: student.sci + '%', icon: FileText },
                            { label: 'English Mastery', value: student.eng + '%', icon: FileText },
                            { label: 'Institutional ID', value: student.id, icon: Tag }
                        ].map((item, i) => (
                            <div key={i} className="flex items-center justify-between group">
                                <div className="flex items-center gap-2">
                                    <item.icon size={11} className="opacity-30" style={{ color: "#FEBF10" }} />
                                    <span className="text-[10px] font-black text-re-text-muted uppercase tracking-widest">{item.label}</span>
                                </div>
                                <div className="flex-1 mx-3 border-b border-dashed border-black/10 group-hover:border-[#FEBF10]/30 transition-colors" />
                                <span className="text-[10px] font-black text-re-text uppercase tracking-tight">{item.value}</span>
                            </div>
                        ))}
                    </div>

                    {/* Performance History Chart (Recharts Integration) */}
                    <div className="space-y-4 pb-4">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="text-[9px] font-black text-re-text-muted uppercase tracking-[0.3em] opacity-40">Performance Trajectory</span>
                            <div className="flex-1 h-px bg-black/5" />
                        </div>

                        <div className="bg-re-bg/20 p-5 rounded-2xl border border-black/5 h-[220px] relative">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart
                                    data={[
                                        { name: 'Start', score: Math.max(0, t1 - 10) },
                                        { name: 'Term 1', score: Number(t1.toFixed(1)) },
                                        { name: 'Term 2', score: Number(t2.toFixed(1)) },
                                        { name: 'Current', score: curr }
                                    ]}
                                    margin={{ top: 10, right: 20, left: -5, bottom: 0 }}
                                >
                                    <defs>
                                        <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor={strokeColor} stopOpacity={0.6} />
                                            <stop offset="95%" stopColor={strokeColor} stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <XAxis
                                        dataKey="name"
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fontSize: 9, fill: '#9ca3af', fontWeight: 900, textTransform: 'uppercase' }}
                                        dy={10}
                                        padding={{ left: 10, right: 10 }}
                                    />
                                    <YAxis
                                        domain={['dataMin - 5', 'dataMax + 5']}
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fontSize: 9, fill: '#9ca3af', fontWeight: 900 }}
                                        tickFormatter={(val) => `${val}%`}
                                        width={40}
                                    />
                                    <RechartsTooltip
                                        cursor={{ stroke: 'rgba(0,0,0,0.05)', strokeWidth: 2, strokeDasharray: '3 3' }}
                                        contentStyle={{ backgroundColor: strokeColor, color: '#fff', borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.2)', fontSize: '12px', fontWeight: '900', padding: '8px 12px' }}
                                        itemStyle={{ color: '#fff' }}
                                        formatter={(value) => [`${value}%`, 'Score']}
                                        labelStyle={{ display: 'none' }}
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="score"
                                        stroke={strokeColor}
                                        strokeWidth={4}
                                        fillOpacity={1}
                                        fill="url(#colorScore)"
                                        dot={{ r: 4, strokeWidth: 2.5, fill: '#fff', stroke: strokeColor }}
                                        activeDot={{ r: 6.5, strokeWidth: 0, fill: strokeColor }}
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                {/* Drawer Footer (Actions) */}
                <div className="px-8 py-6 border-t border-black/5 bg-re-bg/20 grid grid-cols-2 gap-3">
                    <button
                        className="h-12 w-full flex items-center justify-center gap-2 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl hover:scale-[1.02] active:scale-95 transition-all"
                        style={{ background: "linear-gradient(135deg, #1E3A5F 0%, #0D2644 100%)" }}
                    >
                        <Phone size={15} /> <span className="tracking-tighter">Send to Parent</span>
                    </button>
                    <button className="h-12 w-full flex items-center justify-center gap-2 bg-white border border-black/5 text-re-text font-black text-[10px] uppercase tracking-widest rounded-2xl hover:bg-re-bg transition-all">
                        <Printer size={15} style={{ color: "#FEBF10" }} /> Report
                    </button>
                </div>
            </div>
        </>,
        document.body
    );
};

// OPTIMIZATION: Hoist fully static mocks outside React runtime scope to prevent garbage collection sweeps and re-allocation on re-renders
const MOCK_STATS = {
    avgGpa: '89.5',
    gpaTrend: '+1.4',
    passRate: '98%',
    headTeacher: 'John Doe'
};

const MOCK_SUBJECTS = [
    { name: "Mathematics", avg: 92, trend: "up", status: "Strong" },
    { name: "Science", avg: 74, trend: "down", status: "Weak" },
    { name: "English", avg: 88, trend: "up", status: "Expected" },
    { name: "Kinyarwanda", avg: 95, trend: "up", status: "Strong" }
];

const MOCK_STUDENTS = [
    { id: 'STU-001', name: 'Alice Mutoni', gpa: 94.2, math: 98, sci: 92, eng: 92, trend: 'up', status: 'Exceptional', rank: 1, attendance: 'Perfect' },
    { id: 'STU-002', name: 'Bob Nkurunziza', gpa: 88.5, math: 85, sci: 90, eng: 90, trend: 'up', status: 'Expected', rank: 2, attendance: 'Good' },
    { id: 'STU-003', name: 'Charlie Kabera', gpa: 62.1, math: 45, sci: 60, eng: 81, trend: 'down', status: 'Review Required', rank: 5, attendance: 'Critical Absences' },
    { id: 'STU-004', name: 'Diana Uwase', gpa: 91.0, math: 90, sci: 88, eng: 95, trend: 'up', status: 'Exceptional', rank: 3, attendance: 'Good' },
    { id: 'STU-005', name: 'Eve Mugisha', gpa: 68.4, math: 55, sci: 70, eng: 80, trend: 'up', status: 'Review Required', rank: 4, attendance: 'Warning Level' }
];

const ClassAcademicReport = () => {
    const { className } = useParams();
    const decodedClassName = decodeURIComponent(className);
    const navigate = useNavigate();

    const [searchTerm, setSearchTerm] = useState('');
    const [activeDropdown, setActiveDropdown] = useState(null);
    const [selectedStudent, setSelectedStudent] = useState(null);

    // OPTIMIZATION: Memoize filtered arrays to stop blocking main thread when typing in search
    const atRiskStudents = React.useMemo(() => MOCK_STUDENTS.filter(s => s.status === 'Review Required'), []);

    const filteredAnalytics = React.useMemo(() => {
        return MOCK_STUDENTS.filter(stu =>
            stu.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            stu.id.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [searchTerm]);

    return (
        <div className="animate-in fade-in duration-700 bg-re-bg min-h-screen">
            <StudentModal student={selectedStudent} onClose={() => setSelectedStudent(null)} />

            {/* ── High-Fidelity Hero Section ── */}
            <div className="relative w-full min-h-[280px] overflow-hidden bg-[#c87800]">
                <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full border border-white/5 pointer-events-none" />
                <div className="absolute -top-12 -right-12 w-64 h-64 rounded-full border border-white/5 pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-[#FEBF10]/30 to-transparent pointer-events-none" />

                <div className="relative z-20 max-w-[1600px] mx-auto px-6 md:px-12 pt-20 pb-24 flex items-center gap-8">
                    <button
                        onClick={() => navigate(h('/reports/academic'))}
                        className="absolute top-8 left-6 md:left-12 flex items-center gap-2 text-white/60 hover:text-white transition-colors font-bold uppercase tracking-widest text-[10px]"
                    >
                        <ArrowLeft size={14} /> Back to Global Reports
                    </button>
                    <div className="hidden md:flex shrink-0 w-24 h-24 rounded-[32px] border border-white/10 bg-white/5 items-center justify-center backdrop-blur-xl shadow-2xl relative overflow-hidden group">
                        <div className="absolute inset-0 bg-gradient-to-br from-[#FEBF10]/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
                        <BookOpen size={40} style={{ color: "#FEBF10" }} className="group-hover:scale-110 transition-transform duration-500" />
                    </div>

                    <div className="space-y-1">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="w-6 h-1 rounded-full animate-pulse" style={{ background: "#FEBF10" }}></span>
                            <p className="text-[10px] font-black uppercase tracking-[0.3em]" style={{ color: "#FEBF10" }}>Class Intel Overview</p>
                        </div>
                        <h1 className="text-2xl md:text-3xl font-semibold text-white tracking-tight leading-none mb-2 uppercase" style={{ fontFamily: "'Montserrat', sans-serif" }}>{decodedClassName} Analytics</h1>
                        <p className="text-[8px] sm:text-[10px] md:text-xs font-bold text-white/40 max-w-lg leading-relaxed uppercase tracking-widest italic opacity-60">Student-level academic performance mapping</p>
                    </div>
                </div>
            </div>

            {/* ── Consolidated High-Fidelity Card ── */}
            <div className="max-w-[1600px] mx-auto px-6 md:px-12 -mt-24 relative z-20 pb-20">
                <div className="bg-white rounded-t-[32px] shadow-2xl border border-black/5 overflow-hidden flex flex-col">

                    {/* Top Layer: Stats Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-4 border-b border-black/5">
                        <div className="lg:col-span-3 grid grid-cols-2 md:grid-cols-4 divide-x divide-y md:divide-y-0 divide-black/5">
                            <div className="p-4 sm:p-8 flex flex-col items-center justify-center text-center group hover:bg-re-bg/20 transition-all cursor-default relative overflow-hidden">
                                <div className="mb-1.5 sm:mb-2 opacity-40 shrink-0" style={{ color: "#FEBF10" }}>
                                    <GraduationCap size={14} className="mb-2" />
                                </div>
                                <div className="flex items-baseline gap-1 relative z-10">
                                    <span className="text-sm sm:text-2xl font-black text-re-text tracking-tighter group-hover:text-[#1E3A5F] transition-colors">{MOCK_STATS.avgGpa}</span>
                                    <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500">{MOCK_STATS.gpaTrend}</span>
                                </div>
                                <p className="text-[6px] sm:text-[8px] font-black text-re-text-muted uppercase tracking-[0.2em] mt-0.5 sm:mt-1 opacity-60">Class GPA</p>
                            </div>

                            {[
                                { label: 'Pass Rate', value: MOCK_STATS.passRate, icon: <CheckCircle size={14} className="mb-2" /> },
                                { label: 'Head Teacher', value: MOCK_STATS.headTeacher, icon: <User size={14} className="mb-2" /> },
                                { label: 'Class Rank', value: '#1', icon: <TrendingUp size={14} className="mb-2" /> }
                            ].map((stat, i) => (
                                <div key={i} className="p-4 sm:p-8 flex flex-col items-center justify-center text-center group hover:bg-re-bg/20 transition-all cursor-default">
                                    <div className="mb-1.5 sm:mb-2 opacity-40 shrink-0" style={{ color: "#FEBF10" }}>
                                        {stat.icon}
                                    </div>
                                    <span className="text-sm sm:text-2xl font-black text-re-text tracking-tighter group-hover:text-[#1E3A5F] transition-colors">{stat.value}</span>
                                    <p className="text-[6px] sm:text-[8px] font-black text-re-text-muted uppercase tracking-[0.2em] mt-0.5 sm:mt-1 opacity-60">{stat.label}</p>
                                </div>
                            ))}
                        </div>

                        {/* Actions */}
                        <div className="hidden lg:flex flex-col border-l border-black/5 bg-re-bg/30 p-6 justify-center gap-3 relative">
                            <button
                                className="w-full h-11 px-4 flex items-center justify-center gap-2 text-white rounded-xl font-black text-[9px] uppercase tracking-widest shadow-xl hover:scale-[1.02] active:scale-95 transition-all whitespace-nowrap"
                                style={{ background: "linear-gradient(135deg, #1E3A5F 0%, #0D2644 100%)" }}
                            >
                                <Download size={14} className="opacity-70" />
                                <span>Class Roster PDF</span>
                            </button>
                            <button
                                className="w-full h-11 px-4 flex items-center justify-center gap-2 bg-white border border-black/5 text-re-text font-black text-[9px] uppercase tracking-widest rounded-xl hover:bg-re-bg transition-all hover:shadow-sm whitespace-nowrap"
                            >
                                <Download size={14} style={{ color: "#FEBF10" }} />
                                <span>Gradebook Excel</span>
                            </button>
                        </div>
                    </div>

                    {/* ERP Diagnostics Layer */}
                    <div className="grid grid-cols-1 xl:grid-cols-3 border-b border-black/5 divide-y xl:divide-y-0 xl:divide-x divide-black/5 bg-white">

                        {/* Subject Mastery Panel */}
                        <div className="xl:col-span-2 p-6 md:p-8 bg-re-bg/20">
                            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#1E3A5F] mb-4">Subject Mastery Matrix</h3>
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                {MOCK_SUBJECTS.map((sub, i) => (
                                    <div key={i} className="bg-white p-4 rounded-xl border border-black/5 shadow-sm relative overflow-hidden group">
                                        <div className="absolute top-0 right-0 p-2">
                                            {sub.status === 'Weak' ? <AlertTriangle size={12} className="text-red-500" /> : <CheckCircle size={12} className="text-emerald-500 opacity-50" />}
                                        </div>
                                        <p className="text-[9px] font-bold text-re-text-muted uppercase tracking-widest">{sub.name}</p>
                                        <div className="flex items-baseline gap-1 mt-1">
                                            <p className="text-xl font-black text-re-text tracking-tighter">{sub.avg}%</p>
                                        </div>
                                        <div className="w-full h-1 bg-black/5 rounded-full mt-3 overflow-hidden">
                                            <div className="h-full" style={{ width: `${sub.avg}%`, background: sub.status === 'Weak' ? '#ef4444' : '#1E3A5F' }}></div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* At-Risk Intervention Panel */}
                        <div className="p-6 md:p-8 bg-red-50/50">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-red-600 flex items-center gap-1.5"><AlertTriangle size={12} /> Intervention Hotlist</h3>
                                <span className="bg-red-100 text-red-600 text-[8px] font-black px-2 py-0.5 rounded-md uppercase tracking-widest">{atRiskStudents.length} Flagged</span>
                            </div>
                            <div className="space-y-2">
                                {atRiskStudents.map(stu => (
                                    <div
                                        key={stu.id}
                                        onClick={() => setSelectedStudent(stu)}
                                        className="bg-white p-3 rounded-lg border border-red-100 flex items-center justify-between shadow-sm group hover:border-red-200 transition-colors cursor-pointer"
                                    >
                                        <div>
                                            <p className="text-xs font-black text-re-text leading-tight group-hover:text-red-600 transition-colors">{stu.name}</p>
                                            <p className="text-[8px] font-bold text-red-500 uppercase tracking-widest mt-0.5">GPA: {stu.gpa} | {stu.attendance}</p>
                                        </div>
                                        <button className="w-6 h-6 rounded-md bg-red-50 flex items-center justify-center text-red-600 hover:bg-red-600 hover:text-white transition-colors">
                                            <User size={10} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Filter */}
                    <div className="flex p-6 md:px-8 border-b border-black/5 flex-col md:flex-row items-center gap-4 bg-white/50">
                        <div className="relative flex-1 w-full group">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-re-text-muted/40 group-focus-within:text-[#1E3A5F] transition-colors" size={16} />
                            <input
                                type="text"
                                placeholder="Search by student name or ID..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full h-10 sm:h-11 bg-re-bg rounded-xl pl-11 pr-4 font-extrabold outline-none border border-transparent focus:border-[#1E3A5F]/20 focus:bg-white transition-all text-re-text text-sm sm:text-xs tracking-tight shadow-inner"
                            />
                        </div>
                    </div>

                    {/* Analytics Roster Layer */}
                    <div className="overflow-x-auto bg-white">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-re-bg/20 border-b border-black/5">
                                    <th className="px-4 sm:px-8 py-3 sm:py-4 text-[7px] sm:text-[8px] font-black text-re-text-muted uppercase tracking-[0.2em] opacity-40 border-r border-black/5 last:border-r-0">Student Profile</th>
                                    <th className="hidden md:table-cell px-6 py-4 text-[8px] font-black text-re-text-muted uppercase tracking-[0.2em] opacity-40 border-r border-black/5">Cum. GPA</th>
                                    <th className="hidden lg:table-cell px-6 py-4 text-[8px] font-black text-re-text-muted uppercase tracking-[0.2em] opacity-40 border-r border-black/5">Core Mastery (M, S, E)</th>
                                    <th className="hidden xl:table-cell px-6 py-4 text-[8px] font-black text-re-text-muted uppercase tracking-[0.2em] opacity-40 border-r border-black/5">Alt. Risk Factor</th>
                                    <th className="px-4 sm:px-8 py-3 sm:py-4 text-[7px] sm:text-[8px] font-black text-re-text-muted uppercase tracking-[0.2em] opacity-40 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-black/5">
                                {filteredAnalytics.map((stu) => (
                                    <tr
                                        key={stu.id}
                                        onClick={() => setSelectedStudent(stu)}
                                        className="hover:bg-re-bg/60 even:bg-re-bg/20 transition-colors group cursor-pointer"
                                    >
                                        <td className="px-4 sm:px-8 py-3 sm:py-5 border-r border-black/5 last:border-r-0">
                                            <div className="flex items-center gap-3 sm:gap-4">
                                                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-re-bg border border-black/5 flex-shrink-0 flex items-center justify-center text-re-text-muted transition-colors relative shadow-inner overflow-hidden group-hover:bg-white">
                                                    <User size={12} className="sm:w-3.5 sm:h-3.5 opacity-40 text-re-text-muted" />
                                                </div>
                                                <div>
                                                    <p className="text-xs sm:text-sm font-black text-re-text tracking-tight uppercase leading-none mb-1 group-hover:text-[#1E3A5F] transition-colors">{stu.name}</p>
                                                    <p className="text-[7px] sm:text-[9px] font-bold text-re-text-muted opacity-30 uppercase tracking-widest leading-none">ID: {stu.id}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="hidden md:table-cell px-6 py-5">
                                            <div className="flex flex-col gap-0.5">
                                                <div className="flex items-center gap-2">
                                                    <p className="text-[10px] font-black text-re-text uppercase tracking-tight">GPA: {stu.gpa}</p>
                                                    {stu.trend === 'up' ? <TrendingUp size={10} className="text-emerald-500" /> : <Activity size={10} className="text-red-500" />}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="hidden lg:table-cell px-6 py-5">
                                            <div className="flex gap-1.5">
                                                <span className={`px-2 py-1 rounded-md text-[8px] font-bold ${stu.math < 70 ? 'bg-red-50 text-red-600 ring-1 ring-inset ring-red-500/20' : 'bg-re-bg text-re-text-muted'}`}>M: {stu.math}</span>
                                                <span className={`px-2 py-1 rounded-md text-[8px] font-bold ${stu.sci < 70 ? 'bg-red-50 text-red-600 ring-1 ring-inset ring-red-500/20' : 'bg-re-bg text-re-text-muted'}`}>S: {stu.sci}</span>
                                                <span className={`px-2 py-1 rounded-md text-[8px] font-bold ${stu.eng < 70 ? 'bg-red-50 text-red-600 ring-1 ring-inset ring-red-500/20' : 'bg-re-bg text-re-text-muted'}`}>E: {stu.eng}</span>
                                            </div>
                                        </td>
                                        <td className="hidden xl:table-cell px-6 py-5">
                                            <div className="flex items-center gap-1.5 ">
                                                {stu.attendance.includes('Critical') ? <AlertTriangle size={10} className="text-red-500" /> : <CheckCircle size={10} className="text-emerald-500 opacity-30" />}
                                                <p className={`text-[9px] font-bold uppercase tracking-tight ${stu.attendance.includes('Critical') ? 'text-red-600' : 'text-re-text'}`}>{stu.attendance}</p>
                                            </div>
                                        </td>
                                        <td className="px-4 sm:px-8 py-3 sm:py-5 text-right">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setSelectedStudent(stu);
                                                }}
                                                className="h-8 px-4 rounded-xl flex items-center justify-center gap-2 bg-white border border-black/5 text-re-text font-black text-[9px] uppercase tracking-widest shadow-sm hover:bg-re-bg hover:text-[#1E3A5F] transition-all ml-auto"
                                            >
                                                <Eye size={12} />
                                                <span className="hidden sm:inline">Profile</span>
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ClassAcademicReport;
