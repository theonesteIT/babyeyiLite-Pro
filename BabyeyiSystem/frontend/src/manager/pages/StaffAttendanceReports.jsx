import React, { useState, useEffect, useMemo } from 'react';
import api from '../services/api';
import { useAcademic } from '../context/AcademicContext';
import {
    ClipboardCheck, Search, FileText, FileSpreadsheet,
    TrendingDown, Download, ChevronDown, UserCheck, Activity,
    User, CheckCircle, Plus, AlertTriangle, Users, RefreshCw
} from 'lucide-react';

const TERM_DAYS = {
    'Term 1 (Current)': 90,
    'Term 2': 90,
    'Term 3': 90,
    'Annual Review': 365,
};

function getTermRange(selectedYear, selectedTerm) {
    const [a, b] = String(selectedYear || '').split('-').map((v) => Number(v));
    if (!a || !b) return { from: '', to: '' };
    if (selectedTerm.includes('Term 1')) return { from: `${a}-09-01`, to: `${a}-12-31` };
    if (selectedTerm === 'Term 2') return { from: `${b}-01-01`, to: `${b}-04-30` };
    if (selectedTerm === 'Term 3') return { from: `${b}-05-01`, to: `${b}-08-31` };
    return { from: `${a}-09-01`, to: `${b}-08-31` };
}

function clipToToday(isoDate) {
    const t = new Date().toISOString().slice(0, 10);
    return !isoDate || isoDate > t ? t : isoDate;
}

function resolveStaffReportRange(selectedYear, selectedTerm, specificDate, academic) {
    if (specificDate) return { from: specificDate, to: specificDate };
    if (selectedTerm === 'Annual Review') return getTermRange(selectedYear, selectedTerm);
    const termName = String(selectedTerm || '').replace(/\s*\(Current\)\s*/i, '').trim();
    if (academic?.getTermDates && termName) {
        const cfg = academic.getTermDates(termName);
        if (cfg && cfg.start && cfg.end) return { from: cfg.start, to: cfg.end };
    }
    return getTermRange(selectedYear, selectedTerm);
}

/** Presence attributed to the teacher on the timetable row for each roll-call mark. */
const StaffAttendanceReports = () => {
    const academic = useAcademic();
    const [searchTerm, setSearchTerm] = useState('');
    const [activeDropdown, setActiveDropdown] = useState(null);
    const [selectedTerm, setSelectedTerm] = useState('');
    const [selectedYear, setSelectedYear] = useState('');
    const [specificDate, setSpecificDate] = useState('');

    // Sync from global academic settings once ready
    useEffect(() => {
        if (!academic.loading && academic.currentTerm) {
            setSelectedTerm(prev => prev || academic.currentTerm);
            setSelectedYear(prev => prev || academic.academicYear);
        }
    }, [academic.loading, academic.currentTerm, academic.academicYear]);

    const [stats, setStats] = useState({
        globalPresence: '—',
        chronicAbsentees: '0',
        mostPresentClass: '—',
        termSync: 'Live',
    });
    const [range, setRange] = useState({ from: '', to: '' });
    const [staffRows, setStaffRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const terms = [...(academic.activeTerms.length ? academic.activeTerms : ['Term 1', 'Term 2', 'Term 3']), 'Annual Review'];
    const years = academic.academicYears;

    const load = async () => {
        setLoading(true);
        setError(null);
        try {
            const { from: rawFrom, to: rawTo } = resolveStaffReportRange(selectedYear, selectedTerm, specificDate, academic);
            const from = rawFrom;
            const to = specificDate ? rawTo : clipToToday(rawTo);
            const termParam = String(selectedTerm || '').replace(/\s*\(Current\)\s*/i, '').trim();
            const useExplicitDates = Boolean(specificDate) || selectedTerm === 'Annual Review';
            const metricsParams = useExplicitDates
                ? { from, to }
                : { term: termParam };

            const [res, metricsRes] = await Promise.all([
                api.get('/dos/reports/attendance/by-teacher', {
                    params: { from, to, days: TERM_DAYS[selectedTerm] || 90 },
                }),
                api.get('/dos/reports/hr/staff-metrics', { params: metricsParams }).catch(() => ({ data: { success: false } })),
            ]);

            if (!res.data.success) {
                setError(res.data.message || 'Failed to load');
                return;
            }
            const { stats: s, staff } = res.data.data || {};
            if (s) {
                setStats({
                    globalPresence: s.globalPresence ?? '—',
                    chronicAbsentees: s.chronicAbsentees ?? '0',
                    mostPresentClass: s.mostPresentClass ?? '—',
                    termSync: s.termSync ?? 'Live',
                });
            }
            setRange({ from, to });

            const metricsData = metricsRes.data?.success ? metricsRes.data.data : null;
            const byUser = new Map((metricsData?.staff || []).map((m) => [Number(m.user_id), m]));
            const enriched = (Array.isArray(staff) ? staff : []).map((row) => {
                const m = byUser.get(Number(row.id));
                return {
                    ...row,
                    gateReliabilityPct: m?.reliability_pct ?? null,
                    performanceOutOf100: m?.performance_out_of_100 ?? null,
                };
            });
            setStaffRows(enriched);
        } catch (e) {
            console.error(e);
            setError(e.response?.data?.message || e.message || 'Could not load report');
            setStaffRows([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (selectedTerm && selectedYear && !academic.loading) load();
    }, [selectedTerm, selectedYear, specificDate, academic.loading, academic.termDates]);

    const filteredAnalytics = useMemo(
        () =>
            staffRows.filter(
                (stf) =>
                    stf.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    stf.department.toLowerCase().includes(searchTerm.toLowerCase())
            ),
        [staffRows, searchTerm]
    );

    return (
        <div className="animate-in fade-in duration-700 bg-re-bg min-h-screen">
            <div className="relative w-full min-h-[280px] overflow-hidden bg-[#c87800]">
                <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full border border-white/5 pointer-events-none" />
                <div className="absolute -top-12 -right-12 w-64 h-64 rounded-full border border-white/5 pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-[#FEBF10]/30 to-transparent pointer-events-none" />

                <div className="relative z-20 max-w-[1600px] mx-auto px-6 md:px-12 pt-16 pb-24 flex items-center gap-8">
                    <div className="hidden md:flex shrink-0 w-24 h-24 rounded-[32px] border border-white/10 bg-white/5 items-center justify-center backdrop-blur-xl shadow-sm relative overflow-hidden group">
                        <div className="absolute inset-0 bg-gradient-to-br from-[#FEBF10]/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                        <ClipboardCheck size={40} style={{ color: '#FEBF10' }} className="" />
                    </div>

                    <div className="space-y-1">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="w-6 h-1 rounded-full animate-pulse" style={{ background: '#FEBF10' }} />
                            <p className="text-[10px] font-semibold uppercase tracking-[0.3em]" style={{ color: '#FEBF10' }}>Teaching staff · roll-call</p>
                        </div>
                        <h1 className="text-2xl md:text-3xl font-semibold text-white tracking-tight leading-none mb-2 mt-2 uppercase" style={{ fontFamily: "'Montserrat', sans-serif" }}>Staff Attendance</h1>
                        <p className="text-[10px] font-medium text-white/60 max-w-xl leading-relaxed uppercase tracking-widest" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                            Roll-call presence plus gate morning / evening reliability for the selected term (dates from Preferences when configured)
                        </p>
                    </div>
                </div>
            </div>

            <div className="max-w-[1600px] mx-auto px-6 md:px-12 -mt-4 sm:-mt-5 md:-mt-6 pt-2 relative z-20 pb-20">
                <div className="bg-white rounded-t-[32px] shadow-sm border border-black/10 overflow-hidden flex flex-col">

                    <div className="grid grid-cols-1 lg:grid-cols-4 border-b border-black/5">
                        <div className="lg:col-span-3 grid grid-cols-2 md:grid-cols-4 divide-x divide-y md:divide-y-0 divide-black/5">
                            <div className="p-4 sm:p-8 flex flex-col items-center justify-center text-center group hover:bg-re-bg/20 transition-all cursor-default relative overflow-hidden">
                                <div className="mb-1.5 sm:mb-2 opacity-40 shrink-0" style={{ color: '#FEBF10' }}>
                                    <UserCheck size={14} className="mb-2" />
                                </div>
                                <div className="flex items-baseline gap-1 relative z-10">
                                    <span className="text-sm sm:text-2xl font-semibold text-re-text tracking-tighter group-hover:text-[#1E3A5F] transition-colors">{stats.globalPresence}</span>
                                </div>
                                <p className="text-[6px] sm:text-[8px] font-semibold text-re-text-muted uppercase tracking-[0.2em] mt-0.5 sm:mt-1 opacity-60">Global presence</p>
                            </div>

                            {[
                                { label: 'Chronic absentees', value: stats.chronicAbsentees, icon: <AlertTriangle size={14} className="mb-2" /> },
                                { label: 'Top teacher', value: stats.mostPresentClass, icon: <Users size={14} className="mb-2" /> },
                                { label: 'Feed', value: stats.termSync, icon: <Activity size={14} className="mb-2" /> }
                            ].map((stat, i) => (
                                <div key={i} className="p-4 sm:p-8 flex flex-col items-center justify-center text-center group hover:bg-re-bg/20 transition-all cursor-default">
                                    <div className="mb-1.5 sm:mb-2 opacity-40 shrink-0" style={{ color: '#FEBF10' }}>
                                        {stat.icon}
                                    </div>
                                    <span className="text-sm sm:text-2xl font-semibold text-re-text tracking-tighter group-hover:text-[#1E3A5F] transition-colors">
                                        {stat.value}
                                    </span>
                                    <p className="text-[6px] sm:text-[8px] font-semibold text-re-text-muted uppercase tracking-[0.2em] mt-0.5 sm:mt-1 opacity-60">
                                        {stat.label}
                                    </p>
                                </div>
                            ))}
                        </div>

                        <div className="hidden lg:flex flex-col border-l border-black/5 bg-re-bg/30 p-6 justify-center gap-3 relative">
                            <button
                                type="button"
                                onClick={() => load()}
                                className="w-full h-11 flex items-center justify-center gap-2 bg-white border border-black/5 text-re-text font-medium text-[9px] uppercase tracking-widest rounded-xl hover:bg-re-bg"
                            >
                                <RefreshCw size={14} style={{ color: '#FEBF10' }} />
                                Refresh
                            </button>
                            <div className="relative">
                                <button
                                    onClick={() => setActiveDropdown(activeDropdown === 'export' ? null : 'export')}
                                    className="w-full h-11 flex items-center justify-center gap-2 text-white rounded-xl font-medium text-[9px] uppercase tracking-widest shadow-sm active:scale-95 transition-all"
                                    style={{ background: 'linear-gradient(135deg, #1E3A5F 0%, #0D2644 100%)' }}
                                >
                                    <Download size={14} />
                                    <span>Export</span>
                                    <ChevronDown size={12} className={`transition-transform duration-300 ${activeDropdown === 'export' ? 'rotate-180' : ''}`} />
                                </button>

                                {activeDropdown === 'export' && (
                                    <>
                                        <div className="fixed inset-0 z-[40]" onClick={() => setActiveDropdown(null)} />
                                        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-black/10 shadow-md rounded-2xl overflow-hidden py-1 z-[50] animate-in slide-in-from-top-2 duration-200">
                                            <button type="button" className="w-full text-left px-4 py-3 text-[10px] font-semibold uppercase tracking-widest text-[#1E3A5F] hover:bg-re-navy/5 transition-colors flex items-center gap-2.5 opacity-50 cursor-not-allowed">
                                                <FileText size={14} style={{ color: '#FEBF10' }} /> PDF (soon)
                                            </button>
                                            <button type="button" className="w-full text-left px-4 py-3 text-[10px] font-semibold uppercase tracking-widest text-re-text hover:bg-re-bg transition-colors flex items-center gap-2.5 border-t border-black/5 opacity-50 cursor-not-allowed">
                                                <FileSpreadsheet size={14} style={{ color: '#FEBF10' }} /> Excel (soon)
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>

                            <button
                                type="button"
                                className="w-full h-11 flex items-center justify-center gap-2 bg-white border border-black/5 text-re-text font-medium text-[9px] uppercase tracking-widest rounded-xl opacity-60 cursor-not-allowed"
                                disabled
                            >
                                <Plus size={14} style={{ color: '#FEBF10' }} />
                                Generate
                            </button>
                        </div>
                    </div>

                    <div className="flex p-6 md:px-8 border-b border-black/5 flex-col md:flex-row items-center gap-4 bg-white/50">
                        <div className="relative flex-1 w-full group">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-re-text-muted/40 group-focus-within:text-[#1E3A5F] transition-colors" size={16} />
                            <input
                                type="text"
                                placeholder="Search by name or department..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full h-10 sm:h-11 bg-re-bg rounded-xl pl-11 pr-4 font-extrabold outline-none border border-transparent focus:border-[#1E3A5F]/20 focus:bg-white transition-all text-re-text text-sm sm:text-xs tracking-tight shadow-inner"
                            />
                        </div>

                        <div className="flex items-center gap-2 w-full md:w-auto">
                            <select
                                value={selectedYear}
                                onChange={(e) => setSelectedYear(e.target.value)}
                                className="h-10 sm:h-11 px-3 sm:px-4 bg-white border border-black/5 rounded-xl text-re-text font-medium text-[9px] uppercase tracking-widest outline-none hover:bg-re-bg transition-colors cursor-pointer appearance-none shadow-sm"
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
                                        type="button"
                                        onClick={() => setSelectedTerm(term)}
                                        className={`px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg text-[8px] sm:text-[9px] font-semibold uppercase tracking-widest transition-all whitespace-nowrap ${selectedTerm === term
                                                ? 'bg-white text-[#1E3A5F] shadow-sm ring-1 ring-black/5'
                                                : 'text-re-text-muted hover:text-re-text'
                                            }`}
                                    >
                                        {term}
                                    </button>
                                ))}
                            </div>
                            <input
                                type="date"
                                value={specificDate}
                                onChange={(e) => setSpecificDate(e.target.value)}
                                className="h-10 sm:h-11 px-3 bg-white border border-black/5 rounded-xl text-re-text font-medium text-[9px] uppercase tracking-widest outline-none hover:bg-re-bg transition-colors"
                            />
                        </div>
                    </div>

                    {error && (
                        <div className="px-8 py-4 bg-red-50 text-red-800 text-sm font-bold border-b border-red-100">
                            {error}
                        </div>
                    )}

                    <div className="overflow-x-auto bg-white">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-re-bg/20 border-b border-black/5">
                                    <th className="px-4 sm:px-8 py-3 sm:py-4 text-[7px] sm:text-[8px] font-semibold text-re-text-muted uppercase tracking-[0.2em] opacity-40 border-r border-black/5 last:border-r-0">Teacher</th>
                                    <th className="hidden md:table-cell px-8 py-4 text-[8px] font-semibold text-re-text-muted uppercase tracking-[0.2em] opacity-40 border-r border-black/5">Roll-call</th>
                                    <th className="hidden md:table-cell px-8 py-4 text-[8px] font-semibold text-re-text-muted uppercase tracking-[0.2em] opacity-40 border-r border-black/5">Gate reliability</th>
                                    <th className="hidden md:table-cell px-8 py-4 text-[8px] font-semibold text-re-text-muted uppercase tracking-[0.2em] opacity-40 border-r border-black/5">Score /100</th>
                                    <th className="hidden md:table-cell px-8 py-4 text-[8px] font-semibold text-re-text-muted uppercase tracking-[0.2em] opacity-40 border-r border-black/5">Status</th>
                                    <th className="px-4 sm:px-8 py-3 sm:py-4 text-[7px] sm:text-[8px] font-semibold text-re-text-muted uppercase tracking-[0.2em] opacity-40 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-black/5">
                                {loading ? (
                                    <tr>
                                        <td colSpan={5} className="px-8 py-16 text-center">
                                            <RefreshCw className="animate-spin inline text-[#1E3A5F] mb-2" size={24} />
                                            <p className="text-xs font-semibold text-re-text-muted uppercase tracking-widest">Loading…</p>
                                        </td>
                                    </tr>
                                ) : filteredAnalytics.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-8 py-16 text-center text-sm text-re-text-muted font-bold">
                                            No data in this window. Staff appear after roll-call exists for their timetable periods.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredAnalytics.map((cls) => (
                                        <tr key={cls.id} className="hover:bg-re-bg/60 even:bg-re-bg/20 transition-colors group cursor-default">
                                            <td className="px-4 sm:px-8 py-3 sm:py-5 border-r border-black/5 last:border-r-0">
                                                <div className="flex items-center gap-3 sm:gap-4">
                                                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-re-bg border border-black/5 flex-shrink-0 flex items-center justify-center text-re-text-muted transition-colors relative shadow-inner overflow-hidden group-hover:bg-white">
                                                        <User size={12} className="sm:w-3.5 sm:h-3.5 opacity-40 text-re-text-muted" />
                                                    </div>
                                                    <div>
                                                        <p className="text-xs sm:text-sm font-semibold text-re-text tracking-tight uppercase leading-none mb-1 group-hover:text-[#1E3A5F] transition-colors">{cls.name}</p>
                                                        <p className="text-[7px] sm:text-[9px] font-bold text-re-text-muted opacity-40 uppercase tracking-widest leading-none">{cls.department}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="hidden md:table-cell px-8 py-5">
                                                <div className="space-y-1.5 max-w-[140px]">
                                                    <div className="flex items-center gap-2">
                                                        <p className="text-[9px] font-semibold text-re-text uppercase tracking-tight">{cls.absences} absent</p>
                                                        {cls.trend === 'up' ? <TrendingDown size={10} className="text-emerald-500" /> : <Activity size={10} className="text-red-500" />}
                                                    </div>
                                                    <div className="flex items-center justify-between gap-1">
                                                        <p className="text-[9px] font-semibold text-re-text">{cls.presenceRate}%</p>
                                                    </div>
                                                    <div className="w-full h-1.5 bg-black/5 rounded-full overflow-hidden">
                                                        <div className="h-full" style={{ width: `${cls.presenceRate}%`, background: cls.presenceRate >= 95 ? 'linear-gradient(135deg, #1E3A5F 0%, #3D5A80 100%)' : (cls.presenceRate >= 85 ? '#FEBF10' : '#ef4444') }} />
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="hidden md:table-cell px-8 py-5">
                                                <div className="space-y-1 max-w-[100px]">
                                                    <p className="text-[10px] font-semibold text-re-text">
                                                        {cls.gateReliabilityPct != null ? `${cls.gateReliabilityPct}%` : '—'}
                                                    </p>
                                                    <p className="text-[7px] font-bold text-re-text-muted uppercase tracking-wider opacity-60">morning + evening</p>
                                                </div>
                                            </td>
                                            <td className="hidden md:table-cell px-8 py-5">
                                                <p className="text-sm font-bold text-[#1E3A5F]">
                                                    {cls.performanceOutOf100 != null ? `${cls.performanceOutOf100}` : '—'}
                                                    <span className="text-[9px] font-semibold text-re-text-muted"> /100</span>
                                                </p>
                                            </td>
                                            <td className="hidden md:table-cell px-8 py-5">
                                                <div className={`inline-flex px-3 py-1.5 rounded-lg text-[8px] font-semibold uppercase tracking-widest ring-1 ring-inset ${cls.status === 'Exceptional' ? 'bg-emerald-50 text-emerald-600 ring-emerald-500/20' :
                                                        cls.status === 'Expected' ? 'bg-blue-50 text-blue-600 ring-blue-500/20' :
                                                            'bg-red-50 text-red-600 ring-red-500/20'
                                                    }`}>
                                                    {cls.status}
                                                </div>
                                            </td>
                                            <td className="px-4 sm:px-8 py-3 sm:py-5 text-right">
                                                <span className="text-[9px] font-bold text-re-text-muted uppercase">—</span>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    <div className="flex px-4 sm:px-8 py-5 bg-re-bg/20 border-t border-black/5 flex-row items-center justify-between gap-4">
                        <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
                            <div className="hidden xs:flex items-center gap-2">
                                <div className="w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full animate-pulse" style={{ background: '#FEBF10' }} />
                                <p className="text-[6px] sm:text-[8px] font-semibold text-re-text-muted uppercase tracking-[0.2em] opacity-40 italic whitespace-nowrap">Timetable-linked roll-call</p>
                            </div>
                            <div className="hidden xs:block w-px h-3 bg-black/10" />
                            <p className="text-[6px] sm:text-[8px] font-semibold text-re-text-muted uppercase tracking-[0.2em] opacity-40 italic whitespace-nowrap">
                                Analytics · {selectedYear} · {selectedTerm} · window {range.from && range.to ? `${range.from} → ${range.to}` : `${TERM_DAYS[selectedTerm] || 90} days`}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StaffAttendanceReports;
