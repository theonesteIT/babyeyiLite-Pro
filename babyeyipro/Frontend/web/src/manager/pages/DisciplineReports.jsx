import React, { useState, useEffect, useCallback } from 'react';
import {
    Activity, Search, FileText, FileSpreadsheet,
    TrendingDown, Download, Eye, ChevronDown, AlertTriangle,
    ShieldAlert, CheckCircle, Plus, ShieldCheck, Tag, Loader2, RefreshCw
} from 'lucide-react';
import api from '../services/api';
import ConductMarksModal from '../components/ConductMarksModal';

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

const DisciplineReports = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [activeDropdown, setActiveDropdown] = useState(null);
    const [selectedTerm, setSelectedTerm] = useState('Term 1');
    const [selectedYear, setSelectedYear] = useState('2025-2026');

    // Conduct Modal State
    const [isConductModalOpen, setIsConductModalOpen] = useState(false);
    const [conductStudent, setConductStudent] = useState(null);

    const openConductModal = (student = null) => {
        setConductStudent(student);
        setIsConductModalOpen(true);
    };

    // Data state
    const [cases, setCases] = useState([]);
    const [stats, setStats] = useState(EMPTY_STATS);
    const [loading, setLoading] = useState(true);
    const [statsLoading, setStatsLoading] = useState(true);
    const [error, setError] = useState(null);

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
            const [casesRes, summaryRes] = await Promise.all([
                api.get('/discipline/cases', { params }),
                api.get('/discipline/report-summary', { params: { academic_year: selectedYear, ...(termVal ? { term: termVal } : {}) } }),
            ]);

            if (casesRes.data?.success) {
                setCases(casesRes.data.data || []);
            }
            if (summaryRes.data?.success) {
                const d = summaryRes.data.data;
                setStats({
                    caseCount: d.case_count ?? 0,
                    studentsAffected: d.students_affected ?? 0,
                    totalMarksRemoved: Number(d.total_marks_removed ?? 0).toFixed(0),
                    totalMarksDefault: d.total_marks_default ?? 100,
                });
            }
        } catch (e) {
            console.error('DisciplineReports fetch error:', e);
            setError('Failed to load discipline data. Please try again.');
        } finally {
            setLoading(false);
            setStatsLoading(false);
        }
    }, [selectedYear, selectedTerm]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // client-side search filter on fetched cases
    const filteredCases = cases.filter(c => {
        const name = `${c.first_name || ''} ${c.last_name || ''}`.toLowerCase();
        const cls = (c.class_name || '').toLowerCase();
        const subj = (c.lesson_subject || '').toLowerCase();
        const desc = (c.description || '').toLowerCase();
        const q = searchTerm.toLowerCase();
        return !q || name.includes(q) || cls.includes(q) || subj.includes(q) || desc.includes(q);
    });

    return (
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
                <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full border border-white/5 pointer-events-none" />
                <div className="absolute -top-12 -right-12 w-64 h-64 rounded-full border border-white/5 pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-[#FEBF10]/30 to-transparent pointer-events-none" />

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
                        <h1 className="text-2xl sm:text-4xl md:text-5xl font-black text-white tracking-tighter leading-none mb-2 mt-2 uppercase">Student <span style={{ color: "#FEBF10" }}>Discipline</span></h1>
                        <p className="text-[8px] sm:text-[10px] md:text-xs font-bold text-white/40 max-w-lg leading-relaxed uppercase tracking-widest italic opacity-60">Active Incident Logs & Institutional Conduct Metrics</p>
                    </div>
                </div>
            </div>

            {/* ── Consolidated High-Fidelity Card ── */}
            <div className="max-w-[1600px] mx-auto px-6 md:px-12 -mt-24 relative z-20 pb-20">
                <div className="bg-white rounded-t-[32px] shadow-2xl border border-black/5 overflow-hidden flex flex-col">

                    {/* Top Layer: Stats Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-4 border-b border-black/5">
                        <div className="lg:col-span-3 grid grid-cols-2 md:grid-cols-4 divide-x divide-y md:divide-y-0 divide-black/5">
                            {[
                                { label: 'Total Cases', value: statsLoading ? '…' : String(stats.caseCount), icon: <ShieldAlert size={14} className="text-red-500" /> },
                                { label: 'Students Affected', value: statsLoading ? '…' : String(stats.studentsAffected), icon: <ShieldCheck size={14} className="text-emerald-500" /> },
                                { label: 'Marks Removed', value: statsLoading ? '…' : String(stats.totalMarksRemoved), icon: <TrendingDown size={14} /> },
                                { label: 'Total Mark (default)', value: statsLoading ? '…' : String(stats.totalMarksDefault), icon: <AlertTriangle size={14} className="text-amber-500" /> },
                            ].map((stat, i) => (
                                <div key={i} className="p-4 sm:p-8 flex flex-col items-center justify-center text-center group hover:bg-re-bg/20 transition-all cursor-default">
                                    <div className="mb-1.5 sm:mb-2 opacity-40 shrink-0">{stat.icon}</div>
                                    <span className="text-sm sm:text-2xl font-black text-re-text tracking-tighter group-hover:text-[#1E3A5F] transition-colors">
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
                            {/* Export Dropdown */}
                            <div className="relative">
                                <button
                                    onClick={() => setActiveDropdown(activeDropdown === 'export' ? null : 'export')}
                                    className="w-full h-11 flex items-center justify-center gap-2 text-white rounded-xl font-black text-[9px] uppercase tracking-widest shadow-xl hover:scale-[1.02] active:scale-95 transition-all"
                                    style={{ background: "linear-gradient(135deg, #1E3A5F 0%, #0D2644 100%)" }}
                                >
                                    <Download size={14} />
                                    <span>Export Logs</span>
                                    <ChevronDown size={12} className={`transition-transform duration-300 ${activeDropdown === 'export' ? 'rotate-180' : ''}`} />
                                </button>

                                {activeDropdown === 'export' && (
                                    <>
                                        <div className="fixed inset-0 z-[40]" onClick={() => setActiveDropdown(null)} />
                                        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-black/5 shadow-2xl rounded-2xl overflow-hidden py-1 z-[50] animate-in slide-in-from-top-2 duration-200">
                                            <button className="w-full text-left px-4 py-3 text-[10px] font-black uppercase tracking-widest text-[#1E3A5F] hover:bg-re-navy/5 transition-colors flex items-center gap-2.5">
                                                <FileText size={14} style={{ color: "#FEBF10" }} /> Official PDF Log
                                            </button>
                                            <button className="w-full text-left px-4 py-3 text-[10px] font-black uppercase tracking-widest text-re-text hover:bg-re-bg transition-colors flex items-center gap-2.5 border-t border-black/5">
                                                <FileSpreadsheet size={14} style={{ color: "#FEBF10" }} /> Extract Analytics (Excel)
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>

                            {/* +/- Conduct Marks */}
                            <button
                                onClick={() => openConductModal(null)}
                                className="w-full h-11 flex items-center justify-center gap-2 bg-white border border-black/5 text-re-text font-black text-[9px] uppercase tracking-widest rounded-xl hover:bg-re-bg hover:border-[#1E3A5F]/20 hover:shadow-re-soft transition-all group"
                            >
                                <Activity size={14} className="opacity-60 group-hover:opacity-100 transition-opacity" style={{ color: "#1E3A5F" }} />
                                <span className="tracking-tighter">+/-</span> <span className="group-hover:text-[#1E3A5F]">Conduct Marks</span>
                            </button>
                        </div>
                    </div>

                    {/* Middle Layer: Filter */}
                    <div className="flex p-6 md:px-8 border-b border-black/5 flex-col md:flex-row items-center gap-4 bg-white/50">
                        <div className="relative flex-1 w-full group">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-re-text-muted/40 group-focus-within:text-[#1E3A5F] transition-colors" size={16} />
                            <input
                                type="text"
                                placeholder="Search by student, class, subject..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full h-10 sm:h-11 bg-re-bg rounded-xl pl-11 pr-4 font-extrabold outline-none border border-transparent focus:border-[#1E3A5F]/20 focus:bg-white transition-all text-re-text text-sm sm:text-xs tracking-tight shadow-inner"
                            />
                        </div>

                        <div className="flex items-center gap-2 w-full md:w-auto">
                            {/* Year select */}
                            <select
                                value={selectedYear}
                                onChange={(e) => setSelectedYear(e.target.value)}
                                className="h-10 sm:h-11 px-3 sm:px-4 bg-white border border-black/5 rounded-xl text-re-text font-black text-[9px] uppercase tracking-widest outline-none hover:bg-re-bg transition-colors cursor-pointer appearance-none shadow-sm"
                                style={{ backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`, backgroundPosition: 'right 0.5rem center', backgroundRepeat: 'no-repeat', backgroundSize: '1.5em 1.5em', paddingRight: '2.5rem' }}
                            >
                                {YEARS.map(year => (
                                    <option key={year} value={year}>{year}</option>
                                ))}
                            </select>

                            {/* Term pills */}
                            <div className="flex bg-re-bg rounded-xl border border-black/5 p-1 overflow-x-auto hide-scrollbar">
                                {TERMS.map(term => (
                                    <button
                                        key={term}
                                        onClick={() => setSelectedTerm(term)}
                                        className={`px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg text-[8px] sm:text-[9px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${selectedTerm === term
                                                ? 'bg-white text-[#1E3A5F] shadow-sm ring-1 ring-black/5'
                                                : 'text-re-text-muted hover:text-re-text'
                                            }`}
                                    >
                                        {term}
                                    </button>
                                ))}
                            </div>

                            {/* Refresh */}
                            <button
                                onClick={fetchData}
                                disabled={loading}
                                className="h-10 sm:h-11 w-10 sm:w-11 flex items-center justify-center bg-white border border-black/5 rounded-xl hover:bg-re-bg transition-all shadow-sm disabled:opacity-40"
                            >
                                <RefreshCw size={14} className={`text-[#1E3A5F] ${loading ? 'animate-spin' : ''}`} />
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
                    <div className="overflow-x-auto bg-white">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-re-bg/20 border-b border-black/5">
                                    <th className="px-4 sm:px-8 py-3 sm:py-4 text-[7px] sm:text-[8px] font-black text-re-text-muted uppercase tracking-[0.2em] opacity-40 border-r border-black/5">Student Info</th>
                                    <th className="hidden md:table-cell px-8 py-4 text-[8px] font-black text-re-text-muted uppercase tracking-[0.2em] opacity-40 border-r border-black/5">Incident Detail</th>
                                    <th className="hidden md:table-cell px-8 py-4 text-[8px] font-black text-re-text-muted uppercase tracking-[0.2em] opacity-40 border-r border-black/5">Class · Date</th>
                                    <th className="hidden md:table-cell px-8 py-4 text-[8px] font-black text-re-text-muted uppercase tracking-[0.2em] opacity-40 border-r border-black/5">Marks Impact</th>
                                    <th className="px-4 sm:px-8 py-3 sm:py-4 text-[7px] sm:text-[8px] font-black text-re-text-muted uppercase tracking-[0.2em] opacity-40 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-black/5">
                                {loading ? (
                                    <tr>
                                        <td colSpan="5" className="p-12 text-center">
                                            <div className="flex flex-col items-center gap-3">
                                                <Loader2 size={24} className="animate-spin text-[#1E3A5F]/40" />
                                                <p className="text-[10px] font-black text-re-text-muted uppercase tracking-widest">Loading Discipline Registry...</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : filteredCases.length === 0 ? (
                                    <tr>
                                        <td colSpan="5" className="p-12 text-center">
                                            <div className="flex flex-col items-center gap-3">
                                                <div className="w-14 h-14 bg-re-bg rounded-2xl flex items-center justify-center border border-black/5">
                                                    <ShieldCheck size={24} className="text-emerald-400" />
                                                </div>
                                                <p className="text-[10px] font-black text-re-text-muted uppercase tracking-widest">
                                                    {searchTerm ? 'No cases match your search' : 'No discipline cases recorded'}
                                                </p>
                                                <p className="text-[9px] text-re-text-muted/50 font-bold uppercase tracking-widest italic">
                                                    {selectedTerm} · {selectedYear}
                                                </p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    filteredCases.map((c) => {
                                        const studentName = `${c.first_name || ''} ${c.last_name || ''}`.trim();
                                        const uid = c.student_uid || c.student_code || `#${c.student_id}`;
                                        return (
                                            <tr key={c.id} className="hover:bg-re-bg/60 even:bg-re-bg/20 transition-colors group cursor-default">
                                                {/* Student + description */}
                                                <td className="px-4 sm:px-8 py-3 sm:py-5 border-r border-black/5">
                                                    <div className="flex items-center gap-3 sm:gap-4">
                                                        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl border flex-shrink-0 flex items-center justify-center bg-red-50 border-red-100 text-red-500 shadow-inner overflow-hidden">
                                                            <AlertTriangle size={12} className="sm:w-3.5 sm:h-3.5" />
                                                        </div>
                                                        <div>
                                                            <p className="text-xs sm:text-sm font-black text-re-text tracking-tight uppercase leading-none mb-1 group-hover:text-[#1E3A5F] transition-colors">{studentName}</p>
                                                            <p className="text-[7px] sm:text-[9px] font-bold text-re-text-muted opacity-80 uppercase tracking-widest leading-none truncate max-w-[220px]">
                                                                {uid}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </td>

                                                {/* Subject */}
                                                <td className="hidden md:table-cell px-8 py-5">
                                                    <p className="text-[10px] font-black text-re-text uppercase tracking-tight">{c.lesson_subject || '—'}</p>
                                                    {c.description && c.description !== uid && (
                                                        <p className="text-[8px] font-bold text-re-text-muted/60 uppercase tracking-widest mt-1 italic">
                                                            {c.description}
                                                        </p>
                                                    )}
                                                </td>

                                                {/* Class + Date */}
                                                <td className="hidden md:table-cell px-8 py-5">
                                                    <p className="text-[9px] font-black text-[#1E3A5F]">{c.class_name || '—'}</p>
                                                    <p className="text-[8px] font-bold text-re-text-muted mt-0.5">{fmtDate(c.created_at)}</p>
                                                </td>

                                                {/* Marks */}
                                                <td className="hidden md:table-cell px-8 py-5">
                                                    <div className="flex flex-col gap-1">
                                                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-red-50 text-red-600 ring-1 ring-inset ring-red-500/20 text-[8px] font-black uppercase tracking-widest w-fit">
                                                            <span>-{Number(c.marks_deducted).toFixed(0)} pts</span>
                                                        </div>
                                                        <p className="text-[7px] font-bold text-re-text-muted opacity-50 uppercase tracking-widest">
                                                            Remaining: {Number(c.marks_remaining_after).toFixed(0)}
                                                        </p>
                                                    </div>
                                                </td>

                                                {/* Action */}
                                                <td className="px-4 sm:px-8 py-3 sm:py-5 text-right">
                                                    <button
                                                        onClick={() => openConductModal({
                                                            id: uid,
                                                            dbId: c.student_id,
                                                            name: studentName,
                                                            grade: c.class_name || ''
                                                        })}
                                                        className="h-8 px-4 rounded-xl flex items-center justify-center gap-2 bg-white border border-black/5 text-re-text font-black text-[9px] uppercase tracking-widest shadow-sm hover:bg-re-bg hover:text-[#1E3A5F] transition-all ml-auto"
                                                    >
                                                        <Activity size={12} />
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
                                {loading ? '—' : `${filteredCases.length} Cases`} · {selectedYear} · {selectedTerm}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DisciplineReports;
