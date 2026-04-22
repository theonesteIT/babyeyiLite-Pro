import React, { useState, useEffect, useMemo } from 'react';
import api from '../services/api';
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

/** Presence attributed to the teacher on the timetable row for each roll-call mark. */
const StaffAttendanceReports = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [activeDropdown, setActiveDropdown] = useState(null);
    const [selectedTerm, setSelectedTerm] = useState('Term 1 (Current)');
    const [selectedYear, setSelectedYear] = useState('2024-2025');
    const [specificDate, setSpecificDate] = useState('');

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

    const terms = ['Term 1 (Current)', 'Term 2', 'Term 3', 'Annual Review'];
    const years = ['2024-2025', '2023-2024', '2022-2023'];

    const load = async () => {
        setLoading(true);
        setError(null);
        try {
            const termRange = getTermRange(selectedYear, selectedTerm);
            const from = specificDate || termRange.from;
            const to = specificDate || termRange.to;
            const res = await api.get('/dos/reports/attendance/by-teacher', {
                params: { from, to, days: TERM_DAYS[selectedTerm] || 90 },
            });
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
                if (s.range) setRange(s.range);
            }
            setStaffRows(Array.isArray(staff) ? staff : []);
        } catch (e) {
            console.error(e);
            setError(e.response?.data?.message || e.message || 'Could not load report');
            setStaffRows([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
    }, [selectedTerm, selectedYear, specificDate]);

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
            <div className="relative w-full min-h-[280px] overflow-hidden">
                <div className="absolute inset-0 bg-[#0a192f]/85 z-10 backdrop-blur-[2px]" />
                <img src="/teacher.jpg" alt="" className="absolute inset-0 w-full h-full object-cover scale-105" />
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-[#1E3A5F]/40 via-transparent to-transparent z-10 max-w-[1600px] mx-auto" />

                <div className="relative z-20 max-w-[1600px] mx-auto px-6 md:px-12 pt-16 pb-24 flex items-center gap-8">
                    <div className="hidden md:flex shrink-0 w-24 h-24 rounded-[32px] border border-white/10 bg-white/5 items-center justify-center backdrop-blur-xl shadow-2xl relative overflow-hidden group">
                        <div className="absolute inset-0 bg-gradient-to-br from-[#FEBF10]/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                        <ClipboardCheck size={40} style={{ color: '#FEBF10' }} className="group-hover:scale-110 transition-transform duration-500" />
                    </div>

                    <div className="space-y-1">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="w-6 h-1 rounded-full animate-pulse" style={{ background: '#FEBF10' }} />
                            <p className="text-[10px] font-black uppercase tracking-[0.3em]" style={{ color: '#FEBF10' }}>Teaching staff · roll-call</p>
                        </div>
                        <h1 className="text-2xl sm:text-4xl md:text-5xl font-black text-white tracking-tighter leading-none mb-2 mt-2 uppercase">Staff <span style={{ color: '#FEBF10' }}>Attendance</span></h1>
                        <p className="text-[8px] sm:text-[10px] md:text-xs font-bold text-white/40 max-w-xl leading-relaxed uppercase tracking-widest italic opacity-60">
                            Student presence in periods tied to each teacher on the timetable (not clock-in data)
                        </p>
                    </div>
                </div>
            </div>

            <div className="max-w-[1600px] mx-auto px-6 md:px-12 -mt-24 relative z-20 pb-20">
                <div className="bg-white rounded-t-[32px] shadow-2xl border border-black/5 overflow-hidden flex flex-col">

                    <div className="grid grid-cols-1 lg:grid-cols-4 border-b border-black/5">
                        <div className="lg:col-span-3 grid grid-cols-2 md:grid-cols-4 divide-x divide-y md:divide-y-0 divide-black/5">
                            <div className="p-4 sm:p-8 flex flex-col items-center justify-center text-center group hover:bg-re-bg/20 transition-all cursor-default relative overflow-hidden">
                                <div className="mb-1.5 sm:mb-2 opacity-40 shrink-0" style={{ color: '#FEBF10' }}>
                                    <UserCheck size={14} className="mb-2" />
                                </div>
                                <div className="flex items-baseline gap-1 relative z-10">
                                    <span className="text-sm sm:text-2xl font-black text-re-text tracking-tighter group-hover:text-[#1E3A5F] transition-colors">{stats.globalPresence}</span>
                                </div>
                                <p className="text-[6px] sm:text-[8px] font-black text-re-text-muted uppercase tracking-[0.2em] mt-0.5 sm:mt-1 opacity-60">Global presence</p>
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
                                    <span className="text-sm sm:text-2xl font-black text-re-text tracking-tighter group-hover:text-[#1E3A5F] transition-colors">
                                        {stat.value}
                                    </span>
                                    <p className="text-[6px] sm:text-[8px] font-black text-re-text-muted uppercase tracking-[0.2em] mt-0.5 sm:mt-1 opacity-60">
                                        {stat.label}
                                    </p>
                                </div>
                            ))}
                        </div>

                        <div className="hidden lg:flex flex-col border-l border-black/5 bg-re-bg/30 p-6 justify-center gap-3 relative">
                            <button
                                type="button"
                                onClick={() => load()}
                                className="w-full h-11 flex items-center justify-center gap-2 bg-white border border-black/5 text-re-text font-black text-[9px] uppercase tracking-widest rounded-xl hover:bg-re-bg"
                            >
                                <RefreshCw size={14} style={{ color: '#FEBF10' }} />
                                Refresh
                            </button>
                            <div className="relative">
                                <button 
                                    onClick={() => setActiveDropdown(activeDropdown === 'export' ? null : 'export')}
                                    className="w-full h-11 flex items-center justify-center gap-2 text-white rounded-xl font-black text-[9px] uppercase tracking-widest shadow-xl hover:scale-[1.02] active:scale-95 transition-all"
                                    style={{ background: 'linear-gradient(135deg, #1E3A5F 0%, #0D2644 100%)' }}
                                >
                                    <Download size={14} />
                                    <span>Export</span>
                                    <ChevronDown size={12} className={`transition-transform duration-300 ${activeDropdown === 'export' ? 'rotate-180' : ''}`} />
                                </button>

                                {activeDropdown === 'export' && (
                                    <>
                                        <div className="fixed inset-0 z-[40]" onClick={() => setActiveDropdown(null)} />
                                        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-black/5 shadow-2xl rounded-2xl overflow-hidden py-1 z-[50] animate-in slide-in-from-top-2 duration-200">
                                            <button type="button" className="w-full text-left px-4 py-3 text-[10px] font-black uppercase tracking-widest text-[#1E3A5F] hover:bg-re-navy/5 transition-colors flex items-center gap-2.5 opacity-50 cursor-not-allowed">
                                                <FileText size={14} style={{ color: '#FEBF10' }} /> PDF (soon)
                                            </button>
                                            <button type="button" className="w-full text-left px-4 py-3 text-[10px] font-black uppercase tracking-widest text-re-text hover:bg-re-bg transition-colors flex items-center gap-2.5 border-t border-black/5 opacity-50 cursor-not-allowed">
                                                <FileSpreadsheet size={14} style={{ color: '#FEBF10' }} /> Excel (soon)
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>

                            <button
                                type="button"
                                className="w-full h-11 flex items-center justify-center gap-2 bg-white border border-black/5 text-re-text font-black text-[9px] uppercase tracking-widest rounded-xl opacity-60 cursor-not-allowed"
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
                                        type="button"
                                        onClick={() => setSelectedTerm(term)}
                                        className={`px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg text-[8px] sm:text-[9px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                                            selectedTerm === term 
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
                                className="h-10 sm:h-11 px-3 bg-white border border-black/5 rounded-xl text-re-text font-black text-[9px] uppercase tracking-widest outline-none hover:bg-re-bg transition-colors"
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
                                    <th className="px-4 sm:px-8 py-3 sm:py-4 text-[7px] sm:text-[8px] font-black text-re-text-muted uppercase tracking-[0.2em] opacity-40 border-r border-black/5 last:border-r-0">Teacher</th>
                                    <th className="hidden md:table-cell px-8 py-4 text-[8px] font-black text-re-text-muted uppercase tracking-[0.2em] opacity-40 border-r border-black/5">Absent marks</th>
                                    <th className="hidden md:table-cell px-8 py-4 text-[8px] font-black text-re-text-muted uppercase tracking-[0.2em] opacity-40 border-r border-black/5">Presence</th>
                                    <th className="hidden md:table-cell px-8 py-4 text-[8px] font-black text-re-text-muted uppercase tracking-[0.2em] opacity-40 border-r border-black/5">Status</th>
                                    <th className="px-4 sm:px-8 py-3 sm:py-4 text-[7px] sm:text-[8px] font-black text-re-text-muted uppercase tracking-[0.2em] opacity-40 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-black/5">
                                {loading ? (
                                    <tr>
                                        <td colSpan={5} className="px-8 py-16 text-center">
                                            <RefreshCw className="animate-spin inline text-[#1E3A5F] mb-2" size={24} />
                                            <p className="text-xs font-black text-re-text-muted uppercase tracking-widest">Loading…</p>
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
                                                    <p className="text-xs sm:text-sm font-black text-re-text tracking-tight uppercase leading-none mb-1 group-hover:text-[#1E3A5F] transition-colors">{cls.name}</p>
                                                    <p className="text-[7px] sm:text-[9px] font-bold text-re-text-muted opacity-40 uppercase tracking-widest leading-none">{cls.department}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="hidden md:table-cell px-8 py-5">
                                            <div className="flex flex-col gap-0.5">
                                                <div className="flex items-center gap-2">
                                                    <p className="text-[10px] font-black text-re-text uppercase tracking-tight">{cls.absences} absent marks</p>
                                                    {cls.trend === 'up' ? <TrendingDown size={10} className="text-emerald-500" /> : <Activity size={10} className="text-red-500" />}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="hidden md:table-cell px-8 py-5">
                                            <div className="space-y-1.5 max-w-[120px]">
                                                <div className="flex items-center justify-between">
                                                    <p className="text-[9px] font-black text-re-text">{cls.presenceRate}% present</p>
                                                </div>
                                                <div className="w-full h-1.5 bg-black/5 rounded-full overflow-hidden">
                                                    <div className="h-full" style={{ width: `${cls.presenceRate}%`, background: cls.presenceRate >= 95 ? 'linear-gradient(135deg, #1E3A5F 0%, #3D5A80 100%)' : (cls.presenceRate >= 85 ? '#FEBF10' : '#ef4444') }} />
                                                </div>
                                            </div>
                                        </td>
                                        <td className="hidden md:table-cell px-8 py-5">
                                            <div className={`inline-flex px-3 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest ring-1 ring-inset ${
                                                    cls.status === 'Exceptional' ? 'bg-emerald-50 text-emerald-600 ring-emerald-500/20' :
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
                                <p className="text-[6px] sm:text-[8px] font-black text-re-text-muted uppercase tracking-[0.2em] opacity-40 italic whitespace-nowrap">Timetable-linked roll-call</p>
                            </div>
                            <div className="hidden xs:block w-px h-3 bg-black/10" />
                            <p className="text-[6px] sm:text-[8px] font-black text-re-text-muted uppercase tracking-[0.2em] opacity-40 italic whitespace-nowrap">
                                Analytics · {selectedYear} · {selectedTerm} · window {range.from && range.to ? `${range.from} → ${range.to}` : `${days} days`}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StaffAttendanceReports;
