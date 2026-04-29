import React, { useState, useEffect } from 'react';
import api from '../services/api';
import {
    TrendingUp, Search, ChevronDown,
    Download, CheckCircle, BarChart2,
    Users, BookOpen, Clock, Activity, Printer,
    ArrowUpRight, ArrowDownRight, Award, Filter, ChevronUp, User
} from 'lucide-react';
import {
    teacherInnerSelectCls,
    teacherInnerSearchCls,
    buildSubjectsForClass,
    normalizeGradebookLabel,
} from '../utils/teacherGradebookUi';

export default function ViewMarks() {
    const [classes, setClasses] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [selectedClass, setSelectedClass] = useState('');
    const [isClassSelected, setIsClassSelected] = useState(false);
    const [showMobileFilters, setShowMobileFilters] = useState(false);
    const [selectedSubject, setSelectedSubject] = useState('');
    const [selectedTerm, setSelectedTerm] = useState('Term 1');
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(false);
    const [columns, setColumns] = useState([]);
    const [marks, setMarks] = useState([]);
    const [timetablePairs, setTimetablePairs] = useState([]);
    const [filterMode, setFilterMode] = useState('registry');

    useEffect(() => {
        fetchMetadata();
    }, []);

    const fetchMetadata = async () => {
        try {
            const fbRes = await api.get('/teacher-portal/gradebook-filters');
            const pairs =
                fbRes.data.success && Array.isArray(fbRes.data.data?.pairs)
                    ? fbRes.data.data.pairs
                    : [];
            if (pairs.length > 0) {
                setFilterMode('timetable');
                setTimetablePairs(pairs);
                const uniqClasses = [...new Set(pairs.map((p) => p.class_name))].sort((a, b) =>
                    a.localeCompare(b)
                );
                setClasses(uniqClasses);
                const firstClass = uniqClasses[0] || '';
                setSelectedClass(firstClass);
                const subs = await buildSubjectsForClass(api, firstClass, pairs);
                setSubjects(subs);
                setSelectedSubject(subs[0] || '');
                if (typeof window !== 'undefined' && window.innerWidth >= 1024) setIsClassSelected(true);
            } else {
                setFilterMode('registry');
                setTimetablePairs([]);
                const [classesRes, subjectsRes] = await Promise.all([
                    api.get('/dos/registry/classes'),
                    api.get('/dos/subjects'),
                ]);
                if (classesRes.data.success) {
                    const classList = classesRes.data.data.map((c) =>
                        `${c.group_name} ${c.stream_name} ${c.combination || ''}`.trim()
                    );
                    setClasses(classList);
                    if (classList.length > 0) {
                        setSelectedClass((prev) => prev || classList[0]);
                        if (typeof window !== 'undefined' && window.innerWidth >= 1024) {
                            setIsClassSelected(true);
                        }
                    }
                }
                if (subjectsRes.data.success) {
                    const subjectList = subjectsRes.data.data.map((s) => s.name);
                    setSubjects(subjectList);
                    setSelectedSubject((prev) => prev || subjectList[0] || '');
                }
            }
        } catch (err) {
            console.error('Failed to fetch metadata:', err);
        }
    };

    useEffect(() => {
        if (filterMode !== 'timetable' || !selectedClass || !timetablePairs.length) return;
        let cancelled = false;
        (async () => {
            const subs = await buildSubjectsForClass(api, selectedClass, timetablePairs);
            if (cancelled) return;
            setSubjects(subs);
            setSelectedSubject((prev) => (subs.includes(prev) ? prev : subs[0] || ''));
        })();
        return () => {
            cancelled = true;
        };
    }, [selectedClass, filterMode, timetablePairs]);

    useEffect(() => {
        if (filterMode !== 'registry' || !selectedClass) return;
        let cancelled = false;
        (async () => {
            const configured = await buildSubjectsForClass(api, selectedClass, []);
            if (cancelled) return;
            if (configured.length) {
                setSubjects(configured);
                setSelectedSubject((prev) => (configured.includes(prev) ? prev : configured[0] || ''));
                return;
            }
            const res = await api.get('/dos/subjects');
            if (cancelled || !res.data.success) return;
            const all = (res.data.data || []).map((s) => s.name);
            setSubjects(all);
            setSelectedSubject((prev) => (all.includes(prev) ? prev : all[0] || ''));
        })();
        return () => {
            cancelled = true;
        };
    }, [selectedClass, filterMode]);

    useEffect(() => {
        if (isClassSelected && selectedClass && selectedSubject) {
            fetchMarks();
        }
    }, [isClassSelected, selectedClass, selectedSubject, selectedTerm]);

    const fetchMarks = async () => {
        setLoading(true);
        try {
            const res = await api.get('/teacher-portal/gradebook-matrix', {
                params: {
                    class_name: normalizeGradebookLabel(selectedClass),
                    subject_name: normalizeGradebookLabel(selectedSubject),
                },
            });
            if (res.data.success) {
                const { columns: cols, students } = res.data.data;
                setColumns(cols || []);
                const rows = (students || []).map((s) => {
                    const parts = (cols || []).map((c) => Number(s.scores?.[c.slug]) || 0);
                    const trend =
                        parts.length >= 2
                            ? parts[parts.length - 1] > parts[0]
                                ? 'up'
                                : parts[parts.length - 1] < parts[0]
                                    ? 'down'
                                    : 'flat'
                            : 'flat';
                    return {
                        id: s.student_id,
                        adm: s.student_uid,
                        name: s.name,
                        scores: { ...(s.scores || {}) },
                        trend,
                    };
                });
                setMarks(rows);
            }
        } catch (err) {
            console.error('Failed to fetch marks', err);
        } finally {
            setLoading(false);
        }
    };

    const calculateTotal = (m) =>
        columns.reduce((acc, c) => acc + (Number(m.scores?.[c.slug]) || 0), 0);
    const calculateGrade = (total) => {
        if (total >= 90) return { label: 'A+', color: 'text-emerald-600 bg-emerald-50 ring-emerald-500/20' };
        if (total >= 80) return { label: 'A', color: 'text-emerald-500 bg-emerald-50 ring-emerald-500/10' };
        if (total >= 70) return { label: 'B', color: 'text-blue-500 bg-blue-50 ring-blue-500/10' };
        if (total >= 60) return { label: 'C', color: 'text-orange-500 bg-orange-50 ring-orange-500/10' };
        if (total >= 50) return { label: 'D', color: 'text-amber-600 bg-amber-50 ring-amber-500/10' };
        return { label: 'E', color: 'text-red-500 bg-red-50 ring-red-500/10' };
    };

    const qv = searchQuery.trim().toLowerCase();
    const filteredMarks = marks.filter((s) => {
        if (!qv) return true;
        return (s.name || '').toLowerCase().includes(qv) || String(s.adm || '').toLowerCase().includes(qv);
    });

    const stats = {
        avg: marks.length ? Math.round(marks.reduce((acc, m) => acc + calculateTotal(m), 0) / marks.length) : 0,
        highest: marks.length ? Math.max(...marks.map(calculateTotal)) : 0,
        passRate: marks.length ? Math.round((marks.filter(m => calculateTotal(m) >= 50).length / marks.length) * 100) : 0
    };

    const formatParts = (m) =>
        columns
            .map((c) => {
                const v = m.scores?.[c.slug];
                if (v == null || v === '') return null;
                return `${c.label}: ${v}`;
            })
            .filter(Boolean)
            .join(' · ') || '—';

    return (
        <div className="animate-in fade-in duration-700 bg-re-bg min-h-screen pb-12">

            {/* ── High-Fidelity Hero Section ── */}
            <div className="relative w-full min-h-[300px] overflow-hidden">
                <div className="absolute inset-0 bg-orange-950/70 z-10 backdrop-blur-[2px]"></div>
                <img src={import.meta.env.BASE_URL + "teacher.jpg"} alt="Hero" className="absolute inset-0 w-full h-full object-cover scale-105 opacity-100" />
                <div className="absolute inset-0 bg-gradient-to-r from-transparent to-transparent z-[5]"></div>

                <div className="relative z-20 max-w-[1600px] mx-auto px-6 md:px-12 pt-16 pb-24">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="w-6 h-1 bg-re-orange rounded-full"></span>
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/80">Performance Analytics</span>
                        </div>
                        <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight">
                            View Marks
                        </h1>
                        <p className="text-xs md:text-sm text-white/70 font-bold max-w-xl leading-relaxed uppercase tracking-widest opacity-60">
                            Scholastic performance breakdown for {selectedClass} • {selectedSubject}.
                        </p>
                    </div>

                </div>
            </div>

            {/* ── Main Content Area ── */}
            <div className="relative z-30 max-w-[1600px] mx-auto px-2 md:px-6 -mt-16">
                <div className="bg-white rounded-t-[2.5rem] shadow-2xl border border-black/5 overflow-hidden flex flex-col">

                    {/* Integrated Stats Grid */}
                    <div className={`${!isClassSelected ? 'hidden lg:grid' : 'grid'} grid-cols-2 lg:grid-cols-3 divide-x divide-y lg:divide-y-0 divide-black/5 border-b border-black/5`}>
                        {[
                            { label: 'Class Average', value: `${stats.avg}%`, icon: <Activity size={12} /> },
                            { label: 'Highest Mark', value: `${stats.highest}%`, icon: <Award size={12} /> },
                            { label: 'Pass Ratio', value: `${stats.passRate}%`, icon: <CheckCircle size={12} /> }
                        ].map((s, i) => (
                            <div key={i} className="p-4 sm:p-8 flex flex-col items-center justify-center text-center group hover:bg-re-bg/20 transition-all">
                                <div className="text-re-orange opacity-40 mb-1.5 sm:mb-2">{s.icon}</div>
                                <div className="text-sm sm:text-2xl font-black text-re-text tracking-tighter group-hover:text-re-orange">{s.value}</div>
                                <div className="text-[6px] sm:text-[8px] font-black text-re-text-muted uppercase tracking-[0.2em] mt-0.5 opacity-60">{s.label}</div>
                            </div>
                        ))}
                    </div>

                    {/* Controls Toolbar */}
                    <div className={`${!isClassSelected ? 'hidden lg:flex' : 'flex'} px-4 py-4 lg:px-3 lg:py-2 border-b border-black/5 flex flex-col lg:flex-row lg:flex-nowrap lg:items-center lg:justify-start gap-4 lg:gap-2 bg-re-bg/20`}>
                        <div className="flex items-center gap-3 lg:gap-2 w-full lg:w-auto lg:shrink-0">
                            <div className="relative hidden lg:block lg:w-[9.5rem] shrink-0">
                                <Users size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-re-text-muted z-[1] pointer-events-none" />
                                <select
                                    value={selectedClass}
                                    onChange={(e) => setSelectedClass(e.target.value)}
                                    className={`${teacherInnerSelectCls} !pl-8 shadow-[inset_0_2px_8px_rgba(15,23,42,0.11),inset_0_-1px_0_rgba(255,255,255,0.55)]`}
                                >
                                    {classes.map(cls => (
                                        <option key={cls} value={cls}>{cls}</option>
                                    ))}
                                </select>
                            </div>

                            <button
                                onClick={() => setShowMobileFilters(!showMobileFilters)}
                                className="lg:hidden w-full flex justify-between items-center gap-2 text-[10px] font-black uppercase tracking-widest transition-all"
                            >
                                <div className="flex items-center gap-2">
                                    <Filter size={14} className="text-re-orange" /> show filters
                                </div>
                                {showMobileFilters ? <ChevronUp size={14} className="text-re-orange" /> : <ChevronDown size={14} />}
                            </button>
                        </div>

                        <div className={`${showMobileFilters ? 'flex' : 'hidden lg:flex'} flex-col lg:flex-row lg:flex-nowrap lg:items-center gap-3 lg:gap-2 w-full lg:flex-1 lg:min-w-0 animate-in slide-in-from-top-2 duration-300`}>
                            <div className="relative w-full lg:w-[10.5rem] lg:shrink-0">
                                <BookOpen size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-re-text-muted lg:hidden z-[1] pointer-events-none" />
                                <BookOpen size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-re-text-muted hidden lg:block z-[1] pointer-events-none" />
                                <select
                                    value={selectedSubject}
                                    onChange={(e) => setSelectedSubject(e.target.value)}
                                    className={`${teacherInnerSelectCls} !pl-10 lg:!pl-8`}
                                >
                                    {subjects.map(sub => (
                                        <option key={sub} value={sub}>{sub}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="relative w-full lg:flex-1 lg:min-w-[7rem] lg:max-w-[14rem] group">
                                <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-re-text-muted/50 group-focus-within:text-re-orange transition-colors lg:hidden z-[1] pointer-events-none" />
                                <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-re-text-muted/50 group-focus-within:text-re-orange transition-colors hidden lg:block z-[1] pointer-events-none" />
                                <input
                                    type="text"
                                    placeholder="Search student..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className={`${teacherInnerSearchCls} !pl-10 lg:!pl-8`}
                                />
                            </div>

                            <button
                                type="button"
                                className="w-full lg:w-auto h-10 lg:h-8 px-5 lg:px-4 bg-re-bg border border-black/[0.08] text-re-text font-black text-[9px] lg:text-[8px] uppercase tracking-widest rounded-xl lg:rounded-lg hover:bg-white shadow-[inset_0_2px_6px_rgba(15,23,42,0.06)] transition-all flex items-center justify-center gap-2 shrink-0"
                            >
                                <Printer size={14} className="lg:w-3.5 lg:h-3.5" /> Export PDF
                            </button>
                        </div>
                    </div>

                    {/* Mobile Class Selection Gatekeeper */}
                    {!isClassSelected && (
                        <div className="lg:hidden p-6 bg-re-bg/20 flex flex-col items-center justify-center text-center py-12 animate-in fade-in zoom-in-95 duration-500">
                            <div className="w-16 h-16 bg-white rounded-[2rem] shadow-xl flex items-center justify-center text-re-orange mb-6 border border-black/5 animate-bounce">
                                <Award size={32} />
                            </div>
                            <h2 className="text-xl font-black text-re-text tracking-tighter uppercase mb-2">Select Class</h2>
                            <p className="text-[10px] text-re-text-muted font-bold uppercase tracking-widest leading-relaxed mb-8 max-w-[240px]">Choose a class to view academic performance marks.</p>

                            <div className="grid grid-cols-2 gap-3 w-full max-w-sm">
                                {classes.map(cls => (
                                    <button
                                        key={cls}
                                        onClick={() => {
                                            setSelectedClass(cls);
                                            setIsClassSelected(true);
                                        }}
                                        className="h-16 flex items-center justify-center gap-2.5 bg-white border border-black/5 rounded-2xl shadow-sm hover:border-re-orange/30 hover:bg-re-orange/5 transition-all group active:scale-95 px-4"
                                    >
                                        <div className="flex flex-col items-center gap-0.5">
                                            <span className="text-[10px] font-black text-re-text group-hover:text-re-orange uppercase">{cls}</span>
                                            <span className="text-[7px] font-bold text-re-text-muted uppercase tracking-widest opacity-40 italic">Performance</span>
                                        </div>
                                        <ChevronDown size={14} className="text-re-text-muted -rotate-90" />
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className={`${!isClassSelected ? 'hidden lg:block' : 'block'} w-full overflow-hidden`}>
                        {/* Table View */}
                        <div className="overflow-x-auto custom-scrollbar">
                            {isClassSelected && (
                                <div className="lg:hidden px-6 py-3 bg-white border-b border-black/5 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 bg-re-orange rounded-full"></div>
                                        <span className="text-[9px] font-black text-re-text uppercase tracking-widest">{selectedClass} Performance</span>
                                    </div>
                                    <button
                                        onClick={() => setIsClassSelected(false)}
                                        className="text-[8px] font-black text-re-orange uppercase tracking-widest hover:underline"
                                    >
                                        Change Class
                                    </button>
                                </div>
                            )}
                            <table className="w-full text-left border-collapse min-w-full sm:min-w-[900px]">
                                <thead>
                                    <tr>
                                        <th className="bg-re-bg/50 border-b border-r border-black/5 px-2 sm:px-4 py-4 text-[7px] sm:text-[9px] font-black uppercase tracking-widest text-re-text-muted w-10 text-center">Rank</th>
                                        <th className="bg-re-bg/50 border-b border-r border-black/5 px-2 sm:px-4 py-4 text-[7px] sm:text-[9px] font-black uppercase tracking-widest text-re-text-muted">Student Details</th>
                                        <th className="bg-re-bg/50 border-b border-r border-black/5 px-1 sm:px-4 py-4 text-[7px] sm:text-[9px] font-black uppercase tracking-widest text-re-text-muted w-12 text-center">Trend</th>
                                        {columns.map((c) => (
                                            <th
                                                key={c.slug}
                                                className="bg-re-bg/50 border-b border-r border-black/5 px-1 sm:px-3 py-4 text-[7px] sm:text-[9px] font-black uppercase tracking-widest text-re-text-muted w-14 text-center"
                                            >
                                                {c.label}
                                            </th>
                                        ))}
                                        <th className="bg-re-bg/50 border-b border-r border-black/5 px-1 sm:px-4 py-4 text-[7px] sm:text-[9px] font-black uppercase tracking-widest text-re-text-muted min-w-[120px] text-center hidden md:table-cell">Breakdown</th>
                                        <th className="bg-re-bg/50 border-b border-r border-black/5 px-4 py-4 text-[7px] sm:text-[9px] font-black uppercase tracking-widest text-re-text-muted w-24 text-center hidden sm:table-cell">Performance Bar</th>
                                        <th className="bg-re-bg/50 border-b border-r border-black/5 px-1 sm:px-4 py-4 text-[7px] sm:text-[9px] font-black uppercase tracking-widest text-re-text-muted w-16 text-center">Total</th>
                                        <th className="bg-re-bg/50 border-b border-black/5 px-1 sm:px-4 py-4 text-[7px] sm:text-[9px] font-black uppercase tracking-widest text-re-text-muted w-16 text-center">Grade</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-black/5">
                                    {loading ? (
                                        <tr>
                                            <td colSpan={6 + columns.length} className="p-12 text-center">
                                                <div className="w-8 h-8 border-4 border-re-orange border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                                                <p className="text-[10px] font-black text-re-text-muted uppercase tracking-widest">Loading marks…</p>
                                            </td>
                                        </tr>
                                    ) : columns.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="p-10 text-center text-[10px] font-bold text-re-text-muted uppercase tracking-widest">
                                                No gradebook columns configured yet.
                                            </td>
                                        </tr>
                                    ) : (
                                    [...filteredMarks].sort((a, b) => calculateTotal(b) - calculateTotal(a)).map((m, idx) => {
                                        const total = calculateTotal(m);
                                        const grade = calculateGrade(total);
                                        return (
                                            <tr key={m.id} className="hover:bg-re-bg/30 transition-colors group">
                                                <td className="border-r border-b border-black/5 px-2 sm:px-4 py-4 text-center text-[10px] font-black text-re-text-muted/40 font-mono">
                                                    {(idx + 1).toString().padStart(2, '0')}
                                                </td>
                                                <td className="border-r border-b border-black/5 px-2 sm:px-4 py-4 min-w-0 overflow-hidden">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-full bg-re-bg flex-shrink-0 flex items-center justify-center font-black text-[10px] text-gray-400 border border-black/5 group-hover:bg-white transition-colors">
                                                            <User size={14} className="opacity-40" />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <h4 className="text-[11px] font-black text-re-text truncate block">{m.name}</h4>
                                                            <p className="text-[9px] font-bold text-re-text-muted uppercase tracking-widest opacity-40">{m.adm}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="border-r border-b border-black/5 px-1 sm:px-4 py-4 text-center">
                                                    <div className="flex justify-center">
                                                        {m.trend === 'up' ? <ArrowUpRight size={14} className="text-emerald-500" /> :
                                                            m.trend === 'down' ? <ArrowDownRight size={14} className="text-red-500" /> :
                                                                <div className="w-3 h-px bg-gray-300" />}
                                                    </div>
                                                </td>
                                                {columns.map((c) => (
                                                    <td key={c.slug} className="border-r border-b border-black/5 px-1 sm:px-3 py-4 text-center">
                                                        <span className="text-[11px] font-black text-re-text">
                                                            {m.scores?.[c.slug] != null && m.scores[c.slug] !== '' ? m.scores[c.slug] : '—'}
                                                        </span>
                                                    </td>
                                                ))}
                                                <td className="border-r border-b border-black/5 px-2 py-4 text-center hidden md:table-cell max-w-[200px]">
                                                    <span className="text-[8px] font-bold text-re-text-muted leading-snug block truncate" title={formatParts(m)}>
                                                        {formatParts(m)}
                                                    </span>
                                                </td>
                                                <td className="border-r border-b border-black/5 px-4 py-4 hidden sm:table-cell">
                                                    <div className="w-full bg-re-bg h-1.5 rounded-full overflow-hidden border border-black/5">
                                                        <div
                                                            className={`h-full transition-all duration-1000 ${total >= 80 ? 'bg-re-grad-purple shadow-re-glow' : total >= 50 ? 'bg-re-grad-orange' : 'bg-red-500'}`}
                                                            style={{ width: `${total}%` }}
                                                        />
                                                    </div>
                                                </td>
                                                <td className="border-r border-b border-black/5 px-1 sm:px-4 py-4 text-center">
                                                    <span className="text-sm font-black text-re-text tracking-tighter">{total}</span>
                                                </td>
                                                <td className="border-b border-black/5 px-1 sm:px-4 py-4 text-center">
                                                    <div className={`inline-flex h-7 w-7 flex items-center justify-center px-1.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest ring-1 ring-inset ${grade.color}`}>
                                                        {grade.label}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Footer */}
                        <div className="px-6 py-5 bg-re-bg/10 border-t border-black/5 flex flex-col sm:flex-row items-center justify-between gap-4">
                            <div className="flex items-center gap-4 text-[8px] font-black text-re-text-muted uppercase tracking-[0.2em] opacity-40 italic">
                                Report Generated: {new Date().toLocaleDateString()}
                            </div>
                            <div className="flex items-center gap-2 w-full sm:w-auto">
                                <button className="w-full sm:w-auto h-10 px-6 rounded-2xl bg-re-grad-orange text-white text-[10px] font-black shadow-re-glow tracking-widest uppercase active:scale-95 transition-all">Generate Report Cards</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
