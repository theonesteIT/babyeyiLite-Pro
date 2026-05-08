import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAcademic } from '../context/AcademicContext';
import {
    TrendingUp, Search, ChevronDown,
    Download, CheckCircle, BarChart2,
    Users, BookOpen, Clock, Activity, Printer,
    ArrowUpRight, ArrowDownRight, Award, Filter, ChevronUp, User
} from 'lucide-react';

export default function ViewMarks() {
    const academic = useAcademic();
    const [selectedClass, setSelectedClass] = useState('Senior 3A');
    const [isClassSelected, setIsClassSelected] = useState(window.innerWidth >= 1024);
    const [showMobileFilters, setShowMobileFilters] = useState(false);
    const [selectedSubject, setSelectedSubject] = useState('Mathematics');
    const [selectedTerm, setSelectedTerm] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(false);
    const [marks, setMarks] = useState([]);

    useEffect(() => {
        if (!academic.loading && academic.currentTerm) {
            setSelectedTerm(prev => prev || academic.currentTerm);
        }
    }, [academic.loading, academic.currentTerm]);

    useEffect(() => {
        if (isClassSelected) {
            fetchMarks();
        }
    }, [isClassSelected, selectedClass, selectedSubject, selectedTerm]);

    const fetchMarks = async () => {
        setLoading(true);
        try {
            // In a real app we'd fetch actual marks, for now we fetch students and put 0s or randoms
            const res = await api.get('/students', { params: { class_name: selectedClass } });
            if (res.data.success) {
                setMarks(res.data.data.map(s => ({
                    id: s.id,
                    adm: s.student_uid,
                    name: `${s.first_name} ${s.last_name}`,
                    cat1: Math.floor(Math.random() * 30),
                    cat2: Math.floor(Math.random() * 30),
                    exam: Math.floor(Math.random() * 40) + 20,
                    trend: Math.random() > 0.5 ? 'up' : 'down'
                })));
            }
        } catch (err) {
            console.error('Failed to fetch marks');
        } finally {
            setLoading(false);
        }
    };

    const calculateTotal = (m) => (Number(m.cat1) || 0) + (Number(m.cat2) || 0) + (Number(m.exam) || 0);
    const calculateGrade = (total) => {
        if (total >= 90) return { label: 'A+', color: 'text-emerald-600 bg-emerald-50 ring-emerald-500/20' };
        if (total >= 80) return { label: 'A', color: 'text-emerald-500 bg-emerald-50 ring-emerald-500/10' };
        if (total >= 70) return { label: 'B', color: 'text-blue-500 bg-blue-50 ring-blue-500/10' };
        if (total >= 60) return { label: 'C', color: 'text-orange-500 bg-orange-50 ring-orange-500/10' };
        if (total >= 50) return { label: 'D', color: 'text-amber-600 bg-amber-50 ring-amber-500/10' };
        return { label: 'E', color: 'text-red-500 bg-red-50 ring-red-500/10' };
    };

    const filteredMarks = marks.filter(s =>
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.adm.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const stats = {
        avg: marks.length ? Math.round(marks.reduce((acc, m) => acc + calculateTotal(m), 0) / marks.length) : 0,
        highest: marks.length ? Math.max(...marks.map(calculateTotal)) : 0,
        passRate: marks.length ? Math.round((marks.filter(m => calculateTotal(m) >= 50).length / marks.length) * 100) : 0
    };

    return (
        <div className="animate-in fade-in duration-700 bg-re-bg min-h-screen pb-12">

            {/* ── High-Fidelity Hero Section ── */}
            <div className="relative w-full min-h-[300px] overflow-hidden bg-[#c87800]">
                <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full border border-white/5 pointer-events-none" />
                <div className="absolute -top-12 -right-12 w-64 h-64 rounded-full border border-white/5 pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-[#FEBF10]/30 to-transparent pointer-events-none" />

                <div className="relative z-20 max-w-[1600px] mx-auto px-6 md:px-12 pt-16 pb-24">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="w-6 h-1 bg-re-orange rounded-full"></span>
                            <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/80">Performance Analytics</span>
                        </div>
                        <h1 className="text-2xl md:text-3xl font-semibold text-white tracking-tight" style={{ fontFamily: "'Montserrat', sans-serif" }}>
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
                <div className="bg-white rounded-t-[2.5rem] shadow-sm border border-black/10 overflow-hidden flex flex-col">

                    {/* Integrated Stats Grid */}
                    <div className={`${!isClassSelected ? 'hidden lg:grid' : 'grid'} grid-cols-2 lg:grid-cols-3 divide-x divide-y lg:divide-y-0 divide-black/5 border-b border-black/5`}>
                        {[
                            { label: 'Class Average', value: `${stats.avg}%`, icon: <Activity size={12} /> },
                            { label: 'Highest Mark', value: `${stats.highest}%`, icon: <Award size={12} /> },
                            { label: 'Pass Ratio', value: `${stats.passRate}%`, icon: <CheckCircle size={12} /> }
                        ].map((s, i) => (
                            <div key={i} className="p-4 sm:p-8 flex flex-col items-center justify-center text-center group hover:bg-re-bg/20 transition-all">
                                <div className="text-re-orange opacity-40 mb-1.5 sm:mb-2">{s.icon}</div>
                                <div className="text-sm sm:text-2xl font-semibold text-re-text tracking-tighter group-hover:text-re-orange">{s.value}</div>
                                <div className="text-[6px] sm:text-[8px] font-semibold text-re-text-muted uppercase tracking-[0.2em] mt-0.5 opacity-60">{s.label}</div>
                            </div>
                        ))}
                    </div>

                    {/* Controls Toolbar */}
                    <div className={`${!isClassSelected ? 'hidden lg:flex' : 'flex'} px-4 py-4 border-b border-black/5 flex flex-col lg:flex-row items-center justify-between gap-4 bg-re-bg/20`}>
                        <div className="flex items-center gap-3 w-full lg:w-auto">
                            {/* Class Selector */}
                            <div className="relative hidden lg:block flex-1 lg:w-40">
                                <Users size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-re-text-muted" />
                                <select
                                    value={selectedClass}
                                    readOnly
                                    className="w-full pl-9 pr-4 h-10 bg-white border border-black/5 rounded-xl text-[10px] font-semibold uppercase tracking-widest text-re-text appearance-none focus:outline-none"
                                >
                                    <option>{selectedClass}</option>
                                </select>
                                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-re-text-muted pointer-events-none" />
                            </div>

                            {/* Mobile Filter Toggle */}
                            <button
                                onClick={() => setShowMobileFilters(!showMobileFilters)}
                                className="lg:hidden w-full flex justify-between items-center gap-2 text-[10px] font-semibold uppercase tracking-widest transition-all"
                            >
                                <div className="flex items-center gap-2">
                                    <Filter size={14} className="text-re-orange" /> show filters
                                </div>
                                {showMobileFilters ? <ChevronUp size={14} className="text-re-orange" /> : <ChevronDown size={14} />}
                            </button>
                        </div>

                        {/* Collapsible Mobile Section */}
                        <div className={`${showMobileFilters ? 'flex' : 'hidden lg:flex'} flex-col lg:flex-row items-center gap-3 w-full lg:w-auto animate-in slide-in-from-top-2 duration-300`}>
                            <div className="relative w-full lg:w-48">
                                <BookOpen size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-re-text-muted" />
                                <select
                                    value={selectedSubject}
                                    onChange={(e) => setSelectedSubject(e.target.value)}
                                    className="w-full pl-9 pr-4 h-10 bg-white border border-black/5 rounded-xl text-[10px] font-semibold uppercase tracking-widest text-re-text appearance-none focus:outline-none focus:border-re-orange/20"
                                >
                                    <option>Mathematics</option>
                                    <option>Chemistry</option>
                                    <option>Physics</option>
                                </select>
                                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-re-text-muted pointer-events-none" />
                            </div>

                            <div className="relative w-full lg:w-64 group">
                                <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-re-text-muted/40 group-focus-within:text-re-orange transition-colors" />
                                <input
                                    type="text"
                                    placeholder="Search student..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-10 pr-4 h-10 bg-white border border-black/5 rounded-xl text-[10px] sm:text-xs font-bold text-re-text focus:outline-none focus:border-re-orange/20 shadow-inner"
                                />
                            </div>

                            <button className="w-full lg:w-auto h-10 px-5 bg-re-bg border border-black/5 text-re-text font-medium text-[9px] uppercase tracking-widest rounded-xl hover:bg-white transition-all flex items-center justify-center gap-2">
                                <Printer size={14} /> Export PDF
                            </button>
                        </div>
                    </div>

                    {/* Mobile Class Selection Gatekeeper */}
                    {!isClassSelected && (
                        <div className="lg:hidden p-6 bg-re-bg/20 flex flex-col items-center justify-center text-center py-12 animate-in fade-in zoom-in-95 duration-500">
                            <div className="w-16 h-16 bg-white rounded-[2rem] shadow-sm flex items-center justify-center text-re-orange mb-6 border border-black/5 animate-bounce">
                                <Award size={32} />
                            </div>
                            <h2 className="text-xl font-semibold text-re-text tracking-tighter uppercase mb-2">Select Class</h2>
                            <p className="text-[10px] text-re-text-muted font-bold uppercase tracking-widest leading-relaxed mb-8 max-w-[240px]">Choose a class to view academic performance marks.</p>

                            <div className="grid grid-cols-2 gap-3 w-full max-w-sm">
                                {['Senior 1A', 'Senior 2B', 'Senior 3A', 'Senior 5 Sci'].map(cls => (
                                    <button
                                        key={cls}
                                        onClick={() => {
                                            setSelectedClass(cls);
                                            setIsClassSelected(true);
                                        }}
                                        className="h-16 flex items-center justify-center gap-2.5 bg-white border border-black/5 rounded-2xl shadow-sm hover:border-re-orange/30 hover:bg-re-orange/5 transition-all group active:scale-95 px-4"
                                    >
                                        <div className="flex flex-col items-center gap-0.5">
                                            <span className="text-[10px] font-semibold text-re-text group-hover:text-re-orange uppercase">{cls}</span>
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
                                        <span className="text-[9px] font-semibold text-re-text uppercase tracking-widest">{selectedClass} Performance</span>
                                    </div>
                                    <button
                                        onClick={() => setIsClassSelected(false)}
                                        className="text-[8px] font-semibold text-re-orange uppercase tracking-widest hover:underline"
                                    >
                                        Change Class
                                    </button>
                                </div>
                            )}
                            <table className="w-full text-left border-collapse min-w-full sm:min-w-[900px]">
                                <thead>
                                    <tr>
                                        <th className="bg-re-bg/50 border-b border-r border-black/5 px-2 sm:px-4 py-4 text-[7px] sm:text-[9px] font-semibold uppercase tracking-widest text-re-text-muted w-10 text-center">Rank</th>
                                        <th className="bg-re-bg/50 border-b border-r border-black/5 px-2 sm:px-4 py-4 text-[7px] sm:text-[9px] font-semibold uppercase tracking-widest text-re-text-muted">Student Details</th>
                                        <th className="bg-re-bg/50 border-b border-r border-black/5 px-1 sm:px-4 py-4 text-[7px] sm:text-[9px] font-semibold uppercase tracking-widest text-re-text-muted w-12 text-center">Trend</th>
                                        <th className="bg-re-bg/50 border-b border-r border-black/5 px-1 sm:px-4 py-4 text-[7px] sm:text-[9px] font-semibold uppercase tracking-widest text-re-text-muted w-24 text-center">Assessment</th>
                                        <th className="bg-re-bg/50 border-b border-r border-black/5 px-4 py-4 text-[7px] sm:text-[9px] font-semibold uppercase tracking-widest text-re-text-muted w-24 text-center hidden sm:table-cell">Performance Bar</th>
                                        <th className="bg-re-bg/50 border-b border-r border-black/5 px-1 sm:px-4 py-4 text-[7px] sm:text-[9px] font-semibold uppercase tracking-widest text-re-text-muted w-16 text-center">Final Mark</th>
                                        <th className="bg-re-bg/50 border-b border-black/5 px-1 sm:px-4 py-4 text-[7px] sm:text-[9px] font-semibold uppercase tracking-widest text-re-text-muted w-16 text-center">Grade</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-black/5">
                                    {filteredMarks.sort((a, b) => calculateTotal(b) - calculateTotal(a)).map((m, idx) => {
                                        const total = calculateTotal(m);
                                        const grade = calculateGrade(total);
                                        return (
                                            <tr key={m.id} className="hover:bg-re-bg/30 transition-colors group">
                                                <td className="border-r border-b border-black/5 px-2 sm:px-4 py-4 text-center text-[10px] font-semibold text-re-text-muted/40 font-mono">
                                                    {(idx + 1).toString().padStart(2, '0')}
                                                </td>
                                                <td className="border-r border-b border-black/5 px-2 sm:px-4 py-4 min-w-0 overflow-hidden">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-full bg-re-bg flex-shrink-0 flex items-center justify-center font-semibold text-[10px] text-gray-400 border border-black/5 group-hover:bg-white transition-colors">
                                                            <User size={14} className="opacity-40" />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <h4 className="text-[11px] font-semibold text-re-text truncate block">{m.name}</h4>
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
                                                <td className="border-r border-b border-black/5 px-1 sm:px-4 py-4 text-center">
                                                    <div className="flex flex-col items-center">
                                                        <span className="text-[10px] font-semibold text-re-text">{m.cat1 + m.cat2 + m.exam}/100</span>
                                                        <span className="text-[7px] font-bold text-re-text-muted uppercase tracking-[0.1em] opacity-40">Weighted Avg</span>
                                                    </div>
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
                                                    <span className="text-sm font-semibold text-re-text tracking-tighter">{total}</span>
                                                </td>
                                                <td className="border-b border-black/5 px-1 sm:px-4 py-4 text-center">
                                                    <div className={`inline-flex h-7 w-7 flex items-center justify-center px-1.5 py-0.5 rounded-full text-[9px] font-semibold uppercase tracking-widest ring-1 ring-inset ${grade.color}`}>
                                                        {grade.label}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {/* Footer */}
                        <div className="px-6 py-5 bg-re-bg/10 border-t border-black/5 flex flex-col sm:flex-row items-center justify-between gap-4">
                            <div className="flex items-center gap-4 text-[8px] font-semibold text-re-text-muted uppercase tracking-[0.2em] opacity-40 italic">
                                Report Generated: {new Date().toLocaleDateString()}
                            </div>
                            <div className="flex items-center gap-2 w-full sm:w-auto">
                                <button className="w-full sm:w-auto h-10 px-6 rounded-2xl bg-re-grad-orange text-white text-[10px] font-semibold shadow-re-glow tracking-widest uppercase active:scale-95 transition-all">Generate Report Cards</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
