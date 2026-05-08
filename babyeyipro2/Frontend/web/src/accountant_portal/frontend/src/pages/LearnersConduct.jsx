import React, { useState, useEffect, useCallback } from 'react';
import {
    Activity, Search,
    TrendingDown, Download, Eye, AlertTriangle,
    ShieldAlert, CheckCircle, Plus, ShieldCheck, Tag, Loader2, RefreshCw, Filter, User, Printer
} from 'lucide-react';
import api from '../services/api';
import ConductMarksModal from '../components/ConductMarksModal';
import StudentDisciplineModal from '../components/StudentDisciplineModal';
import { exportTablePDF } from '../utils/pdfExport';

// ── Map UI term label → DB term string ─────────────────────────────
const TERM_MAP = {
    'Term 1': 'Term 1',
    'Term 2': 'Term 2',
    'Term 3': 'Term 3',
    'Annual Review': '',   // all terms
};

const TERMS = ['Term 1', 'Term 2', 'Term 3', 'Annual Review'];
const YEARS = ['2025-2026', '2024-2025', '2023-2024', '2022-2023'];

function fmtDate(raw) {
    if (!raw) return '—';
    const d = new Date(raw);
    const now = new Date();
    const diffMs = now - d;
    const diffH = diffMs / 36e5;
    if (diffH < 1) return 'Just now';
    if (diffH < 24) return `Today, ${d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`;
    if (diffH < 48) return 'Yesterday';
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

const EMPTY_STATS = {
    caseCount: '—',
    studentsAffected: '—',
    totalMarksRemoved: '—',
    totalMarksDefault: '—',
};

const LearnersConduct = () => {
    const [searchTerm, setSearchTerm]     = useState('');
    const [selectedTerm, setSelectedTerm] = useState('Term 1');
    const [selectedYear, setSelectedYear] = useState('2025-2026');
    const [selectedClass, setSelectedClass] = useState('All Classes');
    const [showMobileClassModal, setShowMobileClassModal] = useState(false);
    const [showMobileTermModal, setShowMobileTermModal] = useState(false);

    // Conduct Modal State
    const [isConductModalOpen, setIsConductModalOpen] = useState(false);
    const [conductStudent, setConductStudent]         = useState(null);
    const [detailsStudent, setDetailsStudent]         = useState(null);

    const openConductModal = (student = null) => {
        setConductStudent(student);
        setIsConductModalOpen(true);
    };

    // Data state
    const [students, setStudents]   = useState([]);
    const [stats, setStats]         = useState(EMPTY_STATS);
    const [loading, setLoading]     = useState(true);
    const [statsLoading, setStatsLoading] = useState(true);
    const [error, setError]         = useState(null);

    const [sortBy, setSortBy] = useState({ key: 'name', dir: 'asc' }); // key: name|class|standing|score

    const fetchData = useCallback(async () => {
        setLoading(true);
        setStatsLoading(true);
        setError(null);

        const termVal = TERM_MAP[selectedTerm] ?? selectedTerm;
        const params = {
            academic_year: selectedYear,
            ...(termVal ? { term: termVal } : {}),
            limit: 200,
        };

        try {
            const [studentsRes, summaryRes] = await Promise.all([
                api.get('/discipline/students-summary', { params }),
                api.get('/discipline/report-summary', { params: { academic_year: selectedYear, ...(termVal ? { term: termVal } : {}) } }),
            ]);

            if (studentsRes.data?.success) {
                setStudents(studentsRes.data.data || []);
            }
            if (summaryRes.data?.success) {
                const d = summaryRes.data.data;
                setStats({
                    caseCount:          d.case_count ?? 0,
                    studentsAffected:   d.students_affected ?? 0,
                    totalMarksRemoved:  Number(d.total_marks_removed ?? 0).toFixed(0),
                    totalMarksDefault:  d.total_marks_default ?? 100,
                });
            }
        } catch (e) {
            console.error('LearnersConduct fetch error:', e);
            setError('Failed to load discipline data. Please try again.');
        } finally {
            setLoading(false);
            setStatsLoading(false);
        }
    }, [selectedYear, selectedTerm]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Extract unique classes for the filter
    const uniqueClasses = ['All Classes', ...new Set(students.map(s => s.class_name || 'Unassigned'))].sort((a, b) => {
        if (a === 'All Classes') return -1;
        if (b === 'All Classes') return 1;
        return a.localeCompare(b);
    });

    // client-side search filter on fetched students
    const filteredStudents = students.filter(s => {
        const studentClass = s.class_name || 'Unassigned';
        const classMatch = selectedClass === 'All Classes' || studentClass === selectedClass;
        
        const name = `${s.first_name || ''} ${s.last_name || ''}`.toLowerCase();
        const cls  = studentClass.toLowerCase();
        const uid  = (s.student_uid || s.student_code || '').toLowerCase();
        const q    = searchTerm.toLowerCase();
        
        return classMatch && (!q || name.includes(q) || cls.includes(q) || uid.includes(q));
    });

    const getStudentName = (s) => `${s.first_name || ''} ${s.last_name || ''}`.trim();

    const sortedStudents = [...filteredStudents].sort((a, b) => {
        const dir = sortBy.dir === 'asc' ? 1 : -1;

        if (sortBy.key === 'class') {
            const av = String(a.class_name || 'Unassigned');
            const bv = String(b.class_name || 'Unassigned');
            return av.localeCompare(bv) * dir || getStudentName(a).localeCompare(getStudentName(b)) * dir;
        }

        if (sortBy.key === 'standing') {
            const aTotal = Number(a.discipline_total ?? 100) || 100;
            const bTotal = Number(b.discipline_total ?? 100) || 100;
            const aRem = Number(a.discipline_remaining ?? 0);
            const bRem = Number(b.discipline_remaining ?? 0);
            const av = aRem / aTotal;
            const bv = bRem / bTotal;
            return (av - bv) * dir || (aRem - bRem) * dir || getStudentName(a).localeCompare(getStudentName(b)) * dir;
        }

        if (sortBy.key === 'score') {
            const av = Number(a.discipline_remaining ?? 0);
            const bv = Number(b.discipline_remaining ?? 0);
            return (av - bv) * dir || getStudentName(a).localeCompare(getStudentName(b)) * dir;
        }

        // name
        return getStudentName(a).localeCompare(getStudentName(b)) * dir;
    });

    const toggleSort = (key) => {
        setSortBy((prev) => {
            if (prev.key !== key) return { key, dir: 'asc' };
            return { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' };
        });
    };

    const sortBadge = (key) => {
        if (sortBy.key !== key) return null;
        return (
            <span className="ml-1 inline-flex items-center text-[9px] font-black text-[#000435]/70">
                {sortBy.dir === 'asc' ? '↑' : '↓'}
            </span>
        );
    };

    const exportConductPdf = async (autoPrint = false) => {
        const showClassCol = selectedClass === 'All Classes';
        const headers = showClassCol
            ? ['UID', 'LEARNER', 'CLASS', 'REMAINING/100', 'REWARDED', 'DEDUCTED']
            : ['UID', 'LEARNER', 'REMAINING/100', 'REWARDED', 'DEDUCTED'];

        const rows = filteredStudents.map((s) => {
            const studentName = `${s.first_name || ''} ${s.last_name || ''}`.trim();
            const uid = s.student_uid || s.student_code || `#${s.id}`;
            const totalForStatus = Number(s.discipline_total ?? 100);
            const remaining = Number(s.discipline_remaining ?? 0);
            const deducted = Number(s.discipline_deducted ?? 0);
            const rewarded = Number(s.discipline_rewarded ?? 0);

            const base = [
                uid,
                studentName || '—',
                `${remaining.toFixed(0)}/100`,
                Number.isFinite(rewarded) ? rewarded.toFixed(0) : '0',
                deducted.toFixed(0),
            ];

            return showClassCol
                ? [base[0], base[1], (s.class_name || 'Unassigned'), base[2], base[3], base[4]]
                : base;
        });

        const termVal = TERM_MAP[selectedTerm] ?? selectedTerm;
        const filename = `discipline_log_${selectedYear}_${termVal || 'All_Terms'}_${selectedClass}`.replaceAll(' ', '_') + '.pdf';

        await exportTablePDF({
            title: 'Discipline Marks Log',
            metaLines: [
                `Academic Year: ${selectedYear}`,
                `Term: ${termVal || 'All Terms'}`,
                `Class: ${selectedClass}`,
                `Cases: ${stats.caseCount} · Students affected: ${stats.studentsAffected} · Marks removed: ${stats.totalMarksRemoved}/${stats.totalMarksDefault}`,
            ],
            headers,
            rows,
            filename,
            autoPrint,
            wrapColumns: [1],
        });
    };

    return (
        <>
        <div className="animate-in fade-in duration-700 bg-re-bg min-h-screen">
            <ConductMarksModal
                isOpen={isConductModalOpen}
                onClose={() => setIsConductModalOpen(false)}
                initialStudent={conductStudent}
                academicYear={selectedYear}
                term={selectedTerm}
                onSuccess={() => {
                    // Refresh data after successful recording
                    fetchData();
                }}
            />

            {/* ── High-Fidelity Hero Section ── */}
            <div className="relative w-full min-h-[280px] overflow-hidden bg-[#000435]">
                

                <div className="relative z-20 max-w-[1600px] mx-auto px-6 md:px-12 pt-16 pb-24 flex items-center gap-8">
                    <div className="hidden md:flex shrink-0 w-24 h-24 rounded-[32px] border border-white/10 bg-white/5 items-center justify-center backdrop-blur-xl shadow-2xl relative overflow-hidden group">
                        <div className="absolute inset-0 bg-gradient-to-br from-[#FEBF10]/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
                        <Activity size={40} style={{ color: "#FEBF10" }} className="group-hover:scale-110 transition-transform duration-500" />
                    </div>

                    <div className="space-y-1">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="w-6 h-1 rounded-full animate-pulse" style={{ background: "#FEBF10" }}></span>
                            <p className="text-[10px] font-black uppercase tracking-[0.3em]" style={{ color: "#FEBF10" }}>Behavioral Insight</p>
                        </div>
                        <h1 className="text-2xl sm:text-4xl md:text-5xl font-black text-white tracking-tighter leading-none mb-2 mt-2 uppercase">Learner <span style={{ color: "#FEBF10" }}>Conduct</span></h1>
                        <p className="text-[8px] sm:text-[10px] md:text-xs font-bold text-white/40 max-w-lg leading-relaxed uppercase tracking-widest italic opacity-60">Active Incident Logs & Institutional Conduct Metrics</p>
                    </div>
                </div>
            </div>

            {/* ── Consolidated High-Fidelity Card ── */}
            <div className="max-w-[1600px] mx-auto px-6 md:px-12 -mt-24 relative z-20 pb-20">
                <div className="bg-white rounded-t-[32px] shadow-2xl border border-black/5 overflow-hidden flex flex-col min-h-[500px]">

                    {/* Top Layer: Stats Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-4 border-b border-black/5">
                        <div className="lg:col-span-3 grid grid-cols-2 md:grid-cols-4 divide-x divide-y md:divide-y-0 divide-black/5">
                            {[
                                { label: 'Total Cases',         value: statsLoading ? '…' : String(stats.caseCount),        icon: <ShieldAlert size={14} className="text-red-500" /> },
                                { label: 'Students Affected',   value: statsLoading ? '…' : String(stats.studentsAffected),  icon: <ShieldCheck size={14} className="text-emerald-500" /> },
                                { label: 'Marks Removed',       value: statsLoading ? '…' : String(stats.totalMarksRemoved), icon: <TrendingDown size={14} /> },
                                { label: 'Total Mark (default)',value: statsLoading ? '…' : String(stats.totalMarksDefault),  icon: <AlertTriangle size={14} className="text-amber-500" /> },
                            ].map((stat, i) => (
                                <div key={i} className="p-4 sm:p-8 flex flex-col items-center justify-center text-center group hover:bg-re-bg/20 transition-all cursor-default">
                                    <div className="mb-1.5 sm:mb-2 opacity-40 shrink-0">{stat.icon}</div>
                                    <span className="text-sm sm:text-2xl font-black text-re-text tracking-tighter group-hover:text-[#000435] transition-colors">
                                        {stat.value}
                                    </span>
                                    <p className="text-[6px] sm:text-[8px] font-black text-re-text-muted uppercase tracking-[0.2em] mt-0.5 sm:mt-1 opacity-60">
                                        {stat.label}
                                    </p>
                                </div>
                            ))}
                        </div>

                        {/* Right Side Actions */}
                        <div className="hidden lg:flex flex-col border-l border-black/5 bg-re-bg/30 p-6 justify-center gap-3 relative">
                            <button
                                onClick={() => exportConductPdf(true)}
                                className="w-full h-11 flex items-center justify-center gap-2 text-white rounded-xl font-black text-[9px] uppercase tracking-widest shadow-xl hover:scale-[1.02] active:scale-95 transition-all"
                                style={{ background: "linear-gradient(135deg, #000435 0%, #0D2644 100%)" }}
                            >
                                <Printer size={14} />
                                <span>Print report</span>
                            </button>

                            {/* +/- Conduct Marks */}
                            <button
                                onClick={() => openConductModal(null)}
                                className="w-full h-11 flex items-center justify-center gap-2 bg-white border border-black/5 text-re-text font-black text-[9px] uppercase tracking-widest rounded-xl hover:bg-re-bg hover:border-[#000435]/20 hover:shadow-re-soft transition-all group"
                            >
                                <Activity size={14} className="opacity-60 group-hover:opacity-100 transition-opacity" style={{ color: "#000435" }} />
                                <span className="tracking-tighter">+/-</span> <span className="group-hover:text-[#000435]">Conduct Marks</span>
                            </button>
                        </div>
                    </div>

                    {/* Mobile Summary Bar (Red Text Buttons) */}
                    <div className="lg:hidden flex flex-col bg-white border-b border-black/5 divide-y divide-black/5">
                        <div className="flex items-center justify-between px-6 py-3">
                            <span className="text-[10px] font-black text-[#000435] uppercase tracking-widest">{selectedClass}</span>
                            <button
                                onClick={() => setShowMobileClassModal(true)}
                                className="text-[9px] font-black text-red-500 uppercase tracking-widest hover:underline"
                            >
                                Change Class
                            </button>
                        </div>
                        <div className="flex items-center justify-between px-6 py-3">
                            <span className="text-[10px] font-black text-[#000435] uppercase tracking-widest">{selectedTerm}</span>
                            <button
                                onClick={() => setShowMobileTermModal(true)}
                                className="text-[9px] font-black text-red-500 uppercase tracking-widest hover:underline"
                            >
                                Change Term
                            </button>
                        </div>
                        {/* Mobile Search Area */}
                        <div className="px-6 py-3 bg-re-bg/20">
                            <div className="relative w-full group">
                                <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-re-text-muted/50 group-focus-within:text-[#000435] transition-colors z-[1] pointer-events-none" />
                                <input
                                    type="text"
                                    placeholder="Search student or UID..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full h-10 bg-white rounded-lg outline-none border border-black/5 focus:border-[#000435]/20 text-[#000435] text-[10px] font-black uppercase tracking-tight pl-10 pr-4 shadow-[inset_0_2px_8px_rgba(15,23,42,0.04)]"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Middle Layer: Filter - Compact & Creative Toolbar (Desktop) */}
                    <div className="hidden lg:flex px-4 py-4 lg:px-3 lg:py-2 border-b border-black/5 flex-nowrap items-center justify-start gap-2 bg-re-bg/20 transition-all">
                        <div className="flex flex-nowrap items-center gap-2">
                            
                            {/* Class select (Compact) */}
                            <div className="relative w-[10.5rem] shrink-0 group">
                                <Filter size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#FEBF10] z-[1] pointer-events-none" />
                                <span className="absolute left-7 top-1/2 -translate-y-1/2 text-[8px] font-black uppercase text-re-text-muted tracking-[0.2em] pointer-events-none z-[1]">Class</span>
                                <select 
                                    className="w-full h-8 bg-white/80 rounded-lg outline-none border border-black/5 focus:border-[#000435]/20 focus:bg-white transition-all text-[#000435] text-[9px] font-black uppercase tracking-widest shadow-[inset_0_2px_8px_rgba(15,23,42,0.06),inset_0_-1px_0_rgba(255,255,255,0.5)] cursor-pointer appearance-none !pl-[4.5rem] pr-8"
                                    value={selectedClass}
                                    onChange={e => setSelectedClass(e.target.value)}
                                    style={{ backgroundImage: `url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%236b7280%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E')`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.5rem center', backgroundSize: '10px' }}
                                >
                                    {uniqueClasses.map(cls => (
                                        <option key={cls} value={cls}>{cls}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Year select (Compact) */}
                            <div className="relative w-[7.5rem] shrink-0">
                                <select
                                    value={selectedYear}
                                    onChange={(e) => setSelectedYear(e.target.value)}
                                    className="w-full h-8 bg-white/80 rounded-lg outline-none border border-black/5 focus:border-[#000435]/20 focus:bg-white transition-all text-[#000435] text-[9px] font-black uppercase tracking-widest shadow-[inset_0_2px_8px_rgba(15,23,42,0.06),inset_0_-1px_0_rgba(255,255,255,0.5)] cursor-pointer appearance-none pl-3 pr-8"
                                    style={{ backgroundImage: `url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%236b7280%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E')`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.5rem center', backgroundSize: '10px' }}
                                >
                                    {YEARS.map(year => (
                                        <option key={year} value={year}>{year}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Term select (Compact) */}
                            <div className="relative w-[7.5rem] shrink-0">
                                <select
                                    value={selectedTerm}
                                    onChange={(e) => setSelectedTerm(e.target.value)}
                                    className="w-full h-8 bg-white/80 rounded-lg outline-none border border-black/5 focus:border-[#000435]/20 focus:bg-white transition-all text-[#000435] text-[9px] font-black uppercase tracking-widest shadow-[inset_0_2px_8px_rgba(15,23,42,0.06),inset_0_-1px_0_rgba(255,255,255,0.5)] cursor-pointer appearance-none pl-3 pr-8"
                                    style={{ backgroundImage: `url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%236b7280%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E')`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.5rem center', backgroundSize: '10px' }}
                                >
                                    {TERMS.map(term => (
                                        <option key={term} value={term}>{term}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Search (Compact) */}
                            <div className="relative w-[14rem] group">
                                <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-re-text-muted/50 group-focus-within:text-[#000435] transition-colors z-[1] pointer-events-none" />
                                <input
                                    type="text"
                                    placeholder="Search student or UID..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full h-8 bg-white/80 rounded-lg outline-none border border-black/5 focus:border-[#000435]/20 focus:bg-white transition-all text-[#000435] text-[9px] font-black uppercase tracking-tight shadow-[inset_0_2px_8px_rgba(15,23,42,0.06),inset_0_-1px_0_rgba(255,255,255,0.5)] placeholder:text-[#000435]/30 !pl-8"
                                />
                            </div>
                        </div>

                        <div className="flex items-center gap-2 ml-auto shrink-0">
                            {/* Refresh */}
                            <button
                                onClick={fetchData}
                                disabled={loading}
                                className="h-8 w-8 flex items-center justify-center bg-white border border-black/5 rounded-lg hover:bg-re-bg transition-all shadow-sm disabled:opacity-40 shrink-0"
                            >
                                <RefreshCw size={12} className={`text-[#000435] ${loading ? 'animate-spin' : ''}`} />
                            </button>
                        </div>
                    </div>

                    {/* Error Banner */}
                    {error && (
                        <div className="mx-6 md:mx-8 mt-4 flex items-center gap-3 px-4 py-3 bg-red-50 border border-red-100 rounded-xl">
                            <AlertTriangle size={14} className="text-red-500 shrink-0" />
                            <p className="text-[10px] font-black text-red-700 uppercase tracking-widest">{error}</p>
                            <button onClick={fetchData} className="ml-auto text-[9px] font-black text-red-500 hover:underline uppercase tracking-widest">Retry</button>
                        </div>
                    )}

                    {/* Registry Table */}
                    <div className="overflow-x-auto bg-white flex-1">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-re-bg/20 border-b border-black/5">
                                    <th
                                        onClick={() => toggleSort('name')}
                                        className="px-4 sm:px-8 py-3 sm:py-4 text-[7px] sm:text-[8px] font-black text-re-text-muted uppercase tracking-[0.2em] opacity-40 border-r border-black/5 cursor-pointer select-none hover:opacity-70"
                                        title="Sort by learner name"
                                    >
                                        Learner Info {sortBadge('name')}
                                    </th>
                                    <th
                                        onClick={() => toggleSort('class')}
                                        className="hidden md:table-cell px-8 py-4 text-[8px] font-black text-re-text-muted uppercase tracking-[0.2em] opacity-40 border-r border-black/5 cursor-pointer select-none hover:opacity-70"
                                        title="Sort by class"
                                    >
                                        Classroom {sortBadge('class')}
                                    </th>
                                    <th
                                        onClick={() => toggleSort('standing')}
                                        className="hidden md:table-cell px-8 py-4 text-[8px] font-black text-re-text-muted uppercase tracking-[0.2em] opacity-40 border-r border-black/5 cursor-pointer select-none hover:opacity-70"
                                        title="Sort by conduct standing (remaining %)"
                                    >
                                        Conduct Standing {sortBadge('standing')}
                                    </th>
                                    <th
                                        onClick={() => toggleSort('score')}
                                        className="px-3 sm:px-8 py-3 sm:py-4 text-[7px] sm:text-[8px] font-black text-re-text-muted uppercase tracking-[0.2em] opacity-40 border-r border-black/5 text-center cursor-pointer select-none hover:opacity-70 md:hidden"
                                        title="Sort by remaining score"
                                    >
                                        Score {sortBadge('score')}
                                    </th>
                                    <th className="px-4 sm:px-8 py-3 sm:py-4 text-[7px] sm:text-[8px] font-black text-re-text-muted uppercase tracking-[0.2em] opacity-40 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-black/5">
                                {loading ? (
                                    <tr>
                                        <td colSpan="5" className="p-12 text-center">
                                            <div className="flex flex-col items-center gap-3">
                                                <Loader2 size={24} className="animate-spin text-[#000435]/40" />
                                                <p className="text-[10px] font-black text-re-text-muted uppercase tracking-widest">Loading Learners...</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : filteredStudents.length === 0 ? (
                                    <tr>
                                        <td colSpan="5" className="p-12 text-center">
                                            <div className="flex flex-col items-center gap-3">
                                                <div className="w-14 h-14 bg-re-bg rounded-2xl flex items-center justify-center border border-black/5">
                                                    <ShieldCheck size={24} className="text-emerald-400" />
                                                </div>
                                                <p className="text-[10px] font-black text-re-text-muted uppercase tracking-widest">
                                                    {searchTerm ? 'No learners match your search' : 'No learners found'}
                                                </p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    sortedStudents.map((s) => {
                                        const studentName = `${s.first_name || ''} ${s.last_name || ''}`.trim();
                                        const uid = s.student_uid || s.student_code || `#${s.id}`;
                                        const isCritical = s.discipline_remaining < (s.discipline_total * 0.5);
                                        const isWarning = !isCritical && s.discipline_remaining < (s.discipline_total * 0.75);
                                        
                                        return (
                                            <tr key={s.id} onClick={() => setDetailsStudent(s)} className="hover:bg-re-bg/60 even:bg-re-bg/20 transition-colors group cursor-pointer">
                                                {/* Student */}
                                                <td className="px-4 sm:px-8 py-3 sm:py-5 border-r border-black/5">
                                                    <div className="flex items-center gap-3 sm:gap-4">
                                                        <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full border flex-shrink-0 flex items-center justify-center shadow-inner overflow-hidden ${
                                                            isCritical ? 'bg-red-50 border-red-100 text-red-500' : 
                                                            isWarning ? 'bg-amber-50 border-amber-100 text-amber-500' : 
                                                            'bg-emerald-50 border-emerald-100 text-emerald-500'
                                                        }`}>
                                                            <User size={14} className="sm:w-4 sm:h-4 opacity-75" />
                                                        </div>
                                                        <div>
                                                            <p className="text-xs sm:text-sm font-black text-re-text tracking-tight uppercase leading-none mb-1 group-hover:text-[#000435] transition-colors">
                                                                {studentName}
                                                                {selectedClass === 'All Classes' && s.class_name && (
                                                                    <span className="md:hidden text-[9px] text-[#000435]/50 opacity-80 whitespace-nowrap ml-1 tracking-widest">
                                                                        ({s.class_name})
                                                                    </span>
                                                                )}
                                                            </p>
                                                            <p className="text-[7px] sm:text-[9px] font-bold text-re-text-muted opacity-80 uppercase tracking-widest leading-none truncate max-w-[220px]">
                                                                {uid}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </td>

                                                {/* Class */}
                                                <td className="hidden md:table-cell px-8 py-5 border-r border-black/5">
                                                    <p className="text-[10px] font-black text-[#000435] px-3 py-1 bg-[#000435]/5 rounded-lg w-fit transition-colors group-hover:bg-[#000435]/10">{s.class_name || 'Unassigned'}</p>
                                                </td>

                                                {/* Standing */}
                                                <td className="hidden md:table-cell px-8 py-5 border-r border-black/5">
                                                    <div className="flex flex-col gap-1">
                                                        <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg ring-1 ring-inset tracking-widest text-[8px] font-black uppercase w-fit ${
                                                            isCritical ? 'bg-red-50 text-red-600 ring-red-500/20' : 
                                                            isWarning ? 'bg-amber-50 text-amber-600 ring-amber-500/20' : 
                                                            'bg-emerald-50 text-emerald-600 ring-emerald-500/20'
                                                        }`}>
                                                            <span>Remaining: {Number(s.discipline_remaining).toFixed(0)} / {s.discipline_total}</span>
                                                        </div>
                                                        {s.discipline_deducted > 0 && (
                                                            <p className="text-[7px] font-bold text-re-text-muted opacity-50 uppercase tracking-widest mt-0.5">
                                                                Deducted: -{Number(s.discipline_deducted).toFixed(0)} pts
                                                            </p>
                                                        )}
                                                    </div>
                                                </td>

                                                {/* Score (Mobile only; desktop has Conduct Standing) */}
                                                <td className="px-3 sm:px-8 py-3 sm:py-5 border-r border-black/5 text-center md:hidden">
                                                    <div className="flex flex-col items-center justify-center">
                                                        <span className="text-sm sm:text-base font-black text-[#000435] tracking-tighter leading-none">{Number(s.discipline_remaining).toFixed(0)}</span>
                                                        <span className="text-[6px] sm:text-[7px] font-bold text-re-text-muted uppercase tracking-widest opacity-40 leading-none mt-0.5">/ {s.discipline_total}</span>
                                                    </div>
                                                </td>

                                                {/* Action */}
                                                <td className="px-4 sm:px-8 py-3 sm:py-5 text-right">
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            openConductModal({ 
                                                                id: uid, 
                                                                dbId: s.id,
                                                                name: studentName, 
                                                                grade: s.class_name || '' 
                                                            });
                                                        }}
                                                        className="h-8 px-3 sm:px-4 rounded-xl flex items-center justify-center gap-1 sm:gap-2 bg-white border border-black/5 text-re-text font-black text-[9px] uppercase tracking-widest shadow-sm hover:bg-re-bg hover:text-[#000435] transition-all ml-auto"
                                                    >
                                                        <Activity size={12} className="hidden sm:block" />
                                                        <span className="sm:hidden font-black text-[12px] leading-none tracking-tighter mb-0.5">+ / -</span>
                                                        <span className="hidden sm:inline">+/- Marks</span>
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Table Footer */}
                    <div className="flex px-4 sm:px-8 py-5 bg-re-bg/20 border-t border-black/5 flex-row items-center justify-between gap-4">
                        <div className="flex items-center gap-3 sm:gap-4">
                            <div className="hidden xs:flex items-center gap-2">
                                <div className="w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full animate-pulse" style={{ background: "#FEBF10" }}></div>
                                <p className="text-[6px] sm:text-[8px] font-black text-re-text-muted uppercase tracking-[0.2em] opacity-40 italic whitespace-nowrap">
                                    {loading ? 'Synchronizing...' : 'Discipline Log Verified'}
                                </p>
                            </div>
                            <div className="hidden xs:block w-px h-3 bg-black/10"></div>
                            <p className="text-[6px] sm:text-[8px] font-black text-re-text-muted uppercase tracking-[0.2em] opacity-40 italic whitespace-nowrap">
                                {loading ? '—' : `${filteredStudents.length} Learners`} · {selectedYear} · {selectedTerm}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        {/* Mobile Class Modal */}
        {showMobileClassModal && (
            <div className="fixed lg:hidden inset-0 z-[200] bg-black/50 flex flex-col justify-end backdrop-blur-sm animate-in fade-in duration-200">
                <div className="bg-white w-full rounded-t-3xl max-h-[80vh] flex flex-col animate-in slide-in-from-bottom-8 duration-300">
                    <div className="p-4 border-b border-black/5 flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase tracking-widest text-[#000435]">Select Class</span>
                        <button onClick={() => setShowMobileClassModal(false)} className="w-8 h-8 flex items-center justify-center bg-re-bg border border-black/5 rounded-full text-[#000435] font-black text-xs hover:bg-white shadow-sm transition-all">X</button>
                    </div>
                    <div className="overflow-y-auto p-4 flex flex-col gap-2">
                        {uniqueClasses.map(cls => (
                            <button
                                key={cls}
                                onClick={() => { setSelectedClass(cls); setShowMobileClassModal(false); }}
                                className={`p-4 rounded-xl text-[10px] font-black tracking-widest text-left border ${selectedClass === cls ? 'bg-[#000435] text-white border-[#000435]' : 'bg-white border-black/5 text-[#000435] hover:bg-re-bg'}`}
                            >
                                {cls}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        )}

        {/* Mobile Term Modal */}
        {showMobileTermModal && (
            <div className="fixed lg:hidden inset-0 z-[200] bg-black/50 flex flex-col justify-end backdrop-blur-sm animate-in fade-in duration-200">
                <div className="bg-white w-full rounded-t-3xl max-h-[80vh] flex flex-col animate-in slide-in-from-bottom-8 duration-300">
                    <div className="p-4 border-b border-black/5 flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase tracking-widest text-[#000435]">Select Term</span>
                        <button onClick={() => setShowMobileTermModal(false)} className="w-8 h-8 flex items-center justify-center bg-re-bg border border-black/5 rounded-full text-[#000435] font-black text-xs hover:bg-white shadow-sm transition-all">X</button>
                    </div>
                    <div className="overflow-y-auto p-4 flex flex-col gap-2">
                        {TERMS.map(term => (
                            <button
                                key={term}
                                onClick={() => { setSelectedTerm(term); setShowMobileTermModal(false); }}
                                className={`p-4 rounded-xl text-[10px] font-black tracking-widest text-left border ${selectedTerm === term ? 'bg-[#000435] text-white border-[#000435]' : 'bg-white border-black/5 text-[#000435] hover:bg-re-bg'}`}
                            >
                                {term}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        )}

        <StudentDisciplineModal
            isOpen={!!detailsStudent}
            onClose={(action) => {
                const shouldOpenConduct = action && typeof action === 'object' && action.openConductMarks;
                const s = detailsStudent;
                setDetailsStudent(null);

                if (shouldOpenConduct && s) {
                    const studentName = `${s.first_name || ''} ${s.last_name || ''}`.trim();
                    const uid = s.student_uid || s.student_code || `#${s.id}`;
                    openConductModal({
                        id: uid,
                        dbId: s.id,
                        name: studentName,
                        grade: s.class_name || '',
                    });
                }
            }}
            student={detailsStudent}
            academicYear={selectedYear}
            term={selectedTerm}
        />
    </>
    );
};

export default LearnersConduct;
