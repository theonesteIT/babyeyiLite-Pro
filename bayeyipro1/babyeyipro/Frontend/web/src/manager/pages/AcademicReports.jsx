import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAcademic } from '../context/AcademicContext';
import {
    GraduationCap, Search, FileText, FileSpreadsheet,
    TrendingUp, Download, Eye, ChevronDown, Award, Activity,
    BookOpen, CheckCircle, Plus, Calendar, AlertTriangle, RefreshCw
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { h } from '../utils/href';

const AcademicReports = () => {
    const navigate = useNavigate();
    const { manager } = useAuth();
    const academic = useAcademic();
    const [searchTerm, setSearchTerm] = useState('');
    const [activeDropdown, setActiveDropdown] = useState(null);
    const [selectedTerm, setSelectedTerm] = useState('');
    const [selectedYear, setSelectedYear] = useState('');
    const [loading, setLoading] = useState(true);

    // Seed from global academic settings once loaded
    useEffect(() => {
        if (!academic.loading && academic.currentTerm) {
            setSelectedTerm(prev => prev || academic.currentTerm);
            setSelectedYear(prev => prev || academic.academicYear);
        }
    }, [academic.loading, academic.currentTerm, academic.academicYear]);

    const [stats, setStats] = useState({
        instGpa: '--',
        gpaTrend: '',
        masteryRate: '--',
        topClass: '--'
    });
    const [classAnalytics, setClassAnalytics] = useState([]);

    const terms = [...(academic.activeTerms.length ? academic.activeTerms : ['Term 1', 'Term 2', 'Term 3']), 'Annual Review'];
    const years = academic.academicYears;

    useEffect(() => {
        const fetchAnalytics = async () => {
            if (!manager?.school_id || !selectedYear || !selectedTerm) return;
            setLoading(true);
            try {
                const params = {};
                if (selectedYear) params.academic_year = selectedYear;
                if (selectedTerm && selectedTerm !== 'Annual Review') params.term = selectedTerm;
                const res = await api.get('/dos/class-analytics', { params });
                if (res.data?.success) {
                    const d = res.data.data;
                    setClassAnalytics(d.classes || []);
                    setStats({
                        instGpa: d.instGpa,
                        gpaTrend: d.classes.length > 0 ? '+Live' : '',
                        masteryRate: d.classes.filter(c => c.passRate >= 50).length + '/' + d.classCount,
                        topClass: d.topClass
                    });
                }
            } catch (e) {
                console.error('Academic analytics fetch error:', e);
            } finally {
                setLoading(false);
            }
        };
        fetchAnalytics();
    }, [manager, selectedYear, selectedTerm]);

    const filteredAnalytics = classAnalytics.filter(cls =>
        cls.class.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cls.headTeacher.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="animate-in fade-in duration-700 bg-re-bg min-h-screen">

            {/* ── High-Fidelity Hero Section (Institutional Pattern) ── */}
            <div className="relative w-full min-h-[280px] overflow-hidden bg-[#c87800]">
                <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full border border-white/5 pointer-events-none" />
                <div className="absolute -top-12 -right-12 w-64 h-64 rounded-full border border-white/5 pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-[#FEBF10]/30 to-transparent pointer-events-none" />

                <div className="relative z-20 max-w-[1600px] mx-auto px-6 md:px-12 pt-16 pb-24 flex items-center gap-8">
                    {/* Big Icon for Desktop */}
                    <div className="hidden md:flex shrink-0 w-24 h-24 rounded-[32px] border border-white/10 bg-white/5 items-center justify-center backdrop-blur-xl shadow-2xl relative overflow-hidden group">
                        <div className="absolute inset-0 bg-gradient-to-br from-[#FEBF10]/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
                        <GraduationCap size={40} style={{ color: "#FEBF10" }} className="group-hover:scale-110 transition-transform duration-500" />
                    </div>

                    <div className="space-y-1">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="w-6 h-1 rounded-full animate-pulse" style={{ background: "#FEBF10" }}></span>
                            <p className="text-[10px] font-black uppercase tracking-[0.3em]" style={{ color: "#FEBF10" }}>Institutional Intelligence</p>
                        </div>
                        <h1 className="text-2xl md:text-3xl font-semibold text-white tracking-tight leading-none mb-2 mt-2 uppercase" style={{ fontFamily: "'Montserrat', sans-serif" }}>Academic Reports</h1>
                        <p className="text-[10px] font-medium text-white/60 max-w-lg leading-relaxed uppercase tracking-widest" style={{ fontFamily: "'Montserrat', sans-serif" }}>Scholastic Performance & Actionable Data Analytics</p>
                    </div>
                </div>
            </div>

            {/* ── Consolidated High-Fidelity Card (Dashboard Stats Style) ── */}
            <div className="max-w-[1600px] mx-auto px-6 md:px-12 -mt-24 relative z-20 pb-20">
                <div className="bg-white rounded-t-[32px] shadow-2xl border border-black/5 overflow-hidden flex flex-col">

                    {/* Top Layer: Stats Grid + Actions (Dashboard Style) */}
                    <div className="grid grid-cols-1 lg:grid-cols-4 border-b border-black/5">
                        {/* Stats (3 columns on lg) */}
                        <div className="lg:col-span-3 grid grid-cols-2 md:grid-cols-4 divide-x divide-y md:divide-y-0 divide-black/5">
                            <div className="p-4 sm:p-8 flex flex-col items-center justify-center text-center group hover:bg-re-bg/20 transition-all cursor-default relative overflow-hidden">
                                <div className="mb-1.5 sm:mb-2 opacity-40 shrink-0" style={{ color: "#FEBF10" }}>
                                    <Award size={14} className="mb-2" />
                                </div>
                                <div className="flex items-baseline gap-1 relative z-10">
                                    <span className="text-sm sm:text-2xl font-black text-re-text tracking-tighter group-hover:text-[#1E3A5F] transition-colors">{stats.instGpa}</span>
                                    <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500">{stats.gpaTrend}</span>
                                </div>
                                <p className="text-[6px] sm:text-[8px] font-black text-re-text-muted uppercase tracking-[0.2em] mt-0.5 sm:mt-1 opacity-60">Institutional GPA</p>
                            </div>

                            {[
                                { label: 'Top Class', value: stats.topClass, icon: <Activity size={14} className="mb-2" /> },
                                { label: 'Subject Mastery', value: stats.masteryRate, icon: <BookOpen size={14} className="mb-2" /> },
                                { label: 'Term Sync', value: 'Live', icon: <RefreshCw size={14} className="mb-2" /> }
                            ].map((stat, i) => (
                                <div key={i} className="p-4 sm:p-8 flex flex-col items-center justify-center text-center group hover:bg-re-bg/20 transition-all cursor-default">
                                    <div className="mb-1.5 sm:mb-2 opacity-40 shrink-0" style={{ color: "#FEBF10" }}>
                                        {stat.icon}
                                    </div>
                                    <span className="text-sm sm:text-2xl font-black text-re-text tracking-tighter group-hover:text-[#1E3A5F] transition-colors">
                                        {stat.value}
                                    </span>
                                    <p className="text-[6px] sm:text-[8px] font-black text-re-text-muted uppercase tracking-[0.2em] mt-0.5 sm:mt-1 opacity-60">
                                        {stat.label}
                                    </p>
                                </div>
                            ))}
                        </div>

                        {/* Right Side Actions Section (Desktop) */}
                        <div className="hidden lg:flex flex-col border-l border-black/5 bg-re-bg/30 p-6 justify-center gap-3 relative">
                            {/* Export Dropdown */}
                            <div className="relative">
                                <button
                                    onClick={() => setActiveDropdown(activeDropdown === 'export' ? null : 'export')}
                                    className="w-full h-11 flex items-center justify-center gap-2 text-white rounded-xl font-black text-[9px] uppercase tracking-widest shadow-xl hover:scale-[1.02] active:scale-95 transition-all"
                                    style={{ background: "linear-gradient(135deg, #1E3A5F 0%, #0D2644 100%)" }}
                                >
                                    <Download size={14} />
                                    <span>Export Report</span>
                                    <ChevronDown size={12} className={`transition-transform duration-300 ${activeDropdown === 'export' ? 'rotate-180' : ''}`} />
                                </button>

                                {activeDropdown === 'export' && (
                                    <>
                                        <div className="fixed inset-0 z-[40]" onClick={() => setActiveDropdown(null)} />
                                        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-black/5 shadow-2xl rounded-2xl overflow-hidden py-1 z-[50] animate-in slide-in-from-top-2 duration-200">
                                            <button className="w-full text-left px-4 py-3 text-[10px] font-black uppercase tracking-widest text-[#1E3A5F] hover:bg-re-navy/5 transition-colors flex items-center gap-2.5">
                                                <FileText size={14} style={{ color: "#FEBF10" }} /> Official PDF (NESA)
                                            </button>
                                            <button className="w-full text-left px-4 py-3 text-[10px] font-black uppercase tracking-widest text-re-text hover:bg-re-bg transition-colors flex items-center gap-2.5 border-t border-black/5">
                                                <FileSpreadsheet size={14} style={{ color: "#FEBF10" }} /> Custom Excel Data
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>

                            {/* Generate Dropdown */}
                            <div className="relative">
                                <button
                                    onClick={() => setActiveDropdown(activeDropdown === 'generate' ? null : 'generate')}
                                    className="w-full h-11 flex items-center justify-center gap-2 bg-white border border-black/5 text-re-text font-black text-[9px] uppercase tracking-widest rounded-xl hover:bg-re-bg hover:shadow-re-soft transition-all"
                                >
                                    <Plus size={14} style={{ color: "#FEBF10" }} />
                                    <span>Generate New</span>
                                    <ChevronDown size={12} className={`transition-transform duration-300 ${activeDropdown === 'generate' ? 'rotate-180' : ''}`} />
                                </button>

                                {activeDropdown === 'generate' && (
                                    <>
                                        <div className="fixed inset-0 z-[40]" onClick={() => setActiveDropdown(null)} />
                                        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-black/5 shadow-2xl rounded-2xl overflow-hidden py-1 z-[50] animate-in slide-in-from-top-2 duration-200">
                                            <button className="w-full text-left px-4 py-3 text-[10px] font-black uppercase tracking-widest text-re-text hover:bg-re-bg transition-colors flex items-center gap-2.5">
                                                <Calendar size={14} /> Termly Synthesis
                                            </button>
                                            <button className="w-full text-left px-4 py-3 text-[10px] font-black uppercase tracking-widest text-re-text hover:bg-re-bg transition-colors flex items-center gap-2.5 border-t border-black/5">
                                                <AlertTriangle size={14} className="text-red-500" /> Intervention List
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Middle Layer: Term Control & Rapid Search */}
                    <div className="flex p-6 md:px-8 border-b border-black/5 flex-col md:flex-row items-center gap-4 bg-white/50">
                        <div className="relative flex-1 w-full group">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-re-text-muted/40 group-focus-within:text-[#1E3A5F] transition-colors" size={16} />
                            <input
                                type="text"
                                placeholder="Search analytics by class or teacher..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full h-10 sm:h-11 bg-re-bg rounded-xl pl-11 pr-4 font-extrabold outline-none border border-transparent focus:border-[#1E3A5F]/20 focus:bg-white transition-all text-re-text text-sm sm:text-xs tracking-tight shadow-inner"
                            />
                        </div>

                        <div className="flex items-center gap-2 w-full md:w-auto">
                            <select
                                value={selectedYear}
                                onChange={(e) => setSelectedYear(e.target.value)}
                                className="h-10 sm:h-11 px-3 sm:px-4 bg-white border border-black/5 rounded-xl text-re-text font-black text-[9px] uppercase tracking-widest outline-none hover:bg-re-bg transition-colors cursor-pointer appearance-none shadow-sm"
                                style={{ backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`, backgroundPosition: 'right 0.5rem center', backgroundRepeat: 'no-repeat', backgroundSize: '1.5em 1.5em', paddingRight: '2.5rem' }}
                            >
                                {years.map(year => (
                                    <option key={year} value={year}>{year}</option>
                                ))}
                            </select>

                            <div className="flex bg-re-bg rounded-xl border border-black/5 p-1 overflow-x-auto hide-scrollbar">
                                {terms.map(term => (
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
                        </div>
                    </div>

                    {/* Analytics Roster Layer */}
                    <div className="overflow-x-auto bg-white">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-re-bg/20 border-b border-black/5">
                                    <th className="px-4 sm:px-8 py-3 sm:py-4 text-[7px] sm:text-[8px] font-black text-re-text-muted uppercase tracking-[0.2em] opacity-40 border-r border-black/5 last:border-r-0">Class Intel</th>
                                    <th className="hidden md:table-cell px-8 py-4 text-[8px] font-black text-re-text-muted uppercase tracking-[0.2em] opacity-40 border-r border-black/5">Performance Core</th>
                                    <th className="hidden md:table-cell px-8 py-4 text-[8px] font-black text-re-text-muted uppercase tracking-[0.2em] opacity-40 border-r border-black/5">Metrics Overview</th>
                                    <th className="hidden md:table-cell px-8 py-4 text-[8px] font-black text-re-text-muted uppercase tracking-[0.2em] opacity-40 border-r border-black/5">Status</th>
                                    <th className="px-4 sm:px-8 py-3 sm:py-4 text-[7px] sm:text-[8px] font-black text-re-text-muted uppercase tracking-[0.2em] opacity-40 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-black/5">
                                {loading ? (
                                    <tr>
                                        <td colSpan="5" className="p-12 text-center">
                                            <div className="w-8 h-8 border-4 rounded-full animate-spin mx-auto mb-4" style={{ borderColor: '#1E3A5F transparent transparent transparent' }}></div>
                                            <p className="text-[10px] font-black text-re-text-muted uppercase tracking-widest">Loading Analytics...</p>
                                        </td>
                                    </tr>
                                ) : filteredAnalytics.length === 0 ? (
                                    <tr>
                                        <td colSpan="5" className="p-12 text-center text-[10px] font-black text-re-text-muted uppercase tracking-widest italic opacity-40">
                                            No academic records found for this period. Enter marks via the DOS module to see data here.
                                        </td>
                                    </tr>
                                ) : filteredAnalytics.map((cls) => (
                                    <tr
                                        key={cls.id}
                                        onClick={() => navigate(h(`/reports/academic/class/${encodeURIComponent(cls.class)}`))}
                                        className="hover:bg-re-bg/60 even:bg-re-bg/20 transition-colors group cursor-pointer"
                                    >
                                        <td className="px-4 sm:px-8 py-3 sm:py-5 border-r border-black/5 last:border-r-0">
                                            <div className="flex items-center gap-3 sm:gap-4">
                                                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-re-bg border border-black/5 flex-shrink-0 flex items-center justify-center text-re-text-muted transition-colors relative shadow-inner overflow-hidden group-hover:bg-white">
                                                    <BookOpen size={12} className="sm:w-3.5 sm:h-3.5 opacity-40 text-re-text-muted" />
                                                </div>
                                                <div>
                                                    <p className="text-xs sm:text-sm font-black text-re-text tracking-tight uppercase leading-none mb-1 group-hover:text-[#1E3A5F] transition-colors">{cls.class}</p>
                                                    <p className="text-[7px] sm:text-[9px] font-bold text-re-text-muted opacity-30 uppercase tracking-widest leading-none">HM: {cls.headTeacher}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="hidden md:table-cell px-8 py-5">
                                            <div className="flex flex-col gap-0.5">
                                                <div className="flex items-center gap-2">
                                                    <p className="text-[10px] font-black text-re-text uppercase tracking-tight">GPA: {cls.avgGpa}</p>
                                                    {cls.trend === 'up' ? <TrendingUp size={10} className="text-emerald-500" /> : <Activity size={10} className="text-red-500" />}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="hidden md:table-cell px-8 py-5">
                                            <div className="space-y-1.5 max-w-[120px]">
                                                <div className="flex items-center justify-between">
                                                    <p className="text-[9px] font-black text-re-text">{cls.passRate}% Pass Rate</p>
                                                </div>
                                                <div className="w-full h-1.5 bg-black/5 rounded-full overflow-hidden">
                                                    <div className="h-full" style={{ width: `${cls.passRate}%`, background: cls.passRate >= 90 ? "linear-gradient(135deg, #1E3A5F 0%, #3D5A80 100%)" : (cls.passRate >= 70 ? "#FEBF10" : "#ef4444") }}></div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="hidden md:table-cell px-8 py-5">
                                            <div className={`inline-flex px-3 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest ring-1 ring-inset ${cls.status === 'Exceptional' ? 'bg-emerald-50 text-emerald-600 ring-emerald-500/20' :
                                                cls.status === 'Expected' ? 'bg-blue-50 text-blue-600 ring-blue-500/20' :
                                                    'bg-red-50 text-red-600 ring-red-500/20'
                                                }`}>
                                                {cls.status}
                                            </div>
                                        </td>
                                        <td className="px-4 sm:px-8 py-3 sm:py-5 text-right">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    navigate(h(`/reports/academic/class/${encodeURIComponent(cls.class)}`));
                                                }}
                                                className="h-8 px-4 rounded-xl flex items-center justify-center gap-2 bg-white border border-black/5 text-re-text font-black text-[9px] uppercase tracking-widest shadow-sm hover:bg-re-bg hover:text-[#1E3A5F] transition-all ml-auto"
                                            >
                                                <Eye size={12} />
                                                <span className="hidden sm:inline">Details</span>
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Table Footer */}
                    <div className="flex px-4 sm:px-8 py-5 bg-re-bg/20 border-t border-black/5 flex-row items-center justify-between gap-4">
                        <div className="flex items-center gap-3 sm:gap-4">
                            <div className="hidden xs:flex items-center gap-2">
                                <div className="w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full animate-pulse" style={{ background: "#FEBF10" }}></div>
                                <p className="text-[6px] sm:text-[8px] font-black text-re-text-muted uppercase tracking-[0.2em] opacity-40 italic whitespace-nowrap">Analytics Verified</p>
                            </div>
                            <div className="hidden xs:block w-px h-3 bg-black/10"></div>
                            <p className="text-[6px] sm:text-[8px] font-black text-re-text-muted uppercase tracking-[0.2em] opacity-40 italic whitespace-nowrap">Analytics for {selectedYear} • {selectedTerm}</p>
                        </div>
                    </div>
                </div>

                {/* Brand/System Metadata */}
                <div className="flex flex-col md:flex-row items-center justify-between mt-8 px-4 gap-4">
                    <p className="text-[7px] text-re-text-muted font-black uppercase tracking-[0.3em] opacity-30 italic">Powered by Babyeyi Intelligence Core</p>
                    <div className="flex items-center gap-4 opacity-20">
                        <span className="text-[8px] font-black text-re-text uppercase tracking-widest">Analytics Module</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AcademicReports;
