import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { PORTAL } from '../config/portal';
import { exportTablePDF } from '../utils/pdfExport';
import {
    GraduationCap, TrendingUp, Search, ChevronDown,
    Download, Save, FileText, CheckCircle, BarChart2,
    Users, BookOpen, Clock, Activity, Printer, Filter, ChevronUp, User
} from 'lucide-react';

export default function RecordMarks() {
    const [selectedClass, setSelectedClass] = useState('Senior 3A');
    const [isClassSelected, setIsClassSelected] = useState(window.innerWidth >= 1024);
    const [showMobileFilters, setShowMobileFilters] = useState(false);
    const [selectedSubject, setSelectedSubject] = useState('Mathematics');
    const [selectedTerm, setSelectedTerm] = useState('Term 1');
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(false);
    const [marks, setMarks] = useState([]);

    useEffect(() => {
        if (isClassSelected) {
            fetchStudents();
        }
    }, [isClassSelected, selectedClass]);

    const fetchStudents = async () => {
        setLoading(true);
        try {
            const res = await api.get('/students', { params: { class_name: selectedClass } });
            if (res.data.success) {
                setMarks(res.data.data.map(s => ({
                    id: s.id,
                    adm: s.student_uid,
                    name: `${s.first_name} ${s.last_name}`,
                    gender: s.gender === 'Male' ? 'M' : 'F',
                    cat1: 0,
                    cat2: 0,
                    exam: 0
                })));
            }
        } catch (err) {
            console.error('Failed to fetch students:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        const assessmentName = window.prompt("Enter assessment name (e.g. 'Term 1 Mid-Term', 'Unit 4 Quiz'):", `${selectedTerm} Final Total`);
        if (!assessmentName) return;

        try {
            // 1. Create the assessment first
            const assessmentRes = await api.post('/teacher-portal/assessments', {
                class_name: selectedClass,
                subject_name: selectedSubject,
                assessment_name: assessmentName,
                max_score: 100
            });

            if (!assessmentRes.data.success) {
                 return alert('Failed to create assessment framework.');
            }
            const assessment_id = assessmentRes.data.assessment_id;

            // 2. Map and submit the marks
            const marksData = marks.map(m => ({ student_id: m.id, value: calculateTotal(m) }));
            const res = await api.post('/teacher-portal/marks', {
                assessment_id,
                marks: marksData
            });
            if (res.data.success) {
                alert(`Marks successfully recorded for ${assessmentName}!`);
            }
        } catch (err) {
            console.error(err);
            alert('Failed to record marks. Check connection to API.');
        }
    };

    const handleMarkChange = (id, field, value) => {
        const numValue = value === '' ? '' : Math.min(Number(value), field === 'exam' ? 60 : 30);
        setMarks(prev => prev.map(m =>
            m.id === id ? { ...m, [field]: numValue } : m
        ));
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

    const exportPdf = async (autoPrint = false) => {
        const headers = ['#', 'ADM', 'STUDENT', 'CAT 1', 'CAT 2', 'EXAM', 'TOTAL', 'GRADE'];
        const rows = filteredMarks.map((m, idx) => {
            const total = calculateTotal(m);
            const grade = calculateGrade(total);
            return [
                String(idx + 1).padStart(2, '0'),
                m.adm,
                m.name,
                String(m.cat1 ?? ''),
                String(m.cat2 ?? ''),
                String(m.exam ?? ''),
                String(total),
                grade.label
            ];
        });

        await exportTablePDF({
            title: 'Marks Entry Sheet',
            metaLines: [
                `Class: ${selectedClass}`,
                `Subject: ${selectedSubject}`,
                `Term: ${selectedTerm}`
            ],
            headers,
            rows,
            filename: `marks_entry_${selectedClass}_${selectedSubject}_${selectedTerm}.pdf`.replaceAll(' ', '_'),
            autoPrint
        });
    };

    const stats = {
        avg: Math.round(marks.reduce((acc, m) => acc + calculateTotal(m), 0) / marks.length),
        highest: Math.max(...marks.map(calculateTotal)),
        passRate: Math.round((marks.filter(m => calculateTotal(m) >= 50).length / marks.length) * 100)
    };

    return (
        <div className="animate-in fade-in duration-700 bg-re-bg min-h-screen pb-12">

            {/* ── High-Fidelity Hero Section ── */}
            <div className="relative w-full min-h-[300px] overflow-hidden">
                <div className="absolute inset-0 bg-orange-950/70 z-10 backdrop-blur-[2px]"></div>
                <img src={PORTAL.heroImage} alt="" className="absolute inset-0 w-full h-full object-cover scale-105 opacity-100" />
                <div className="absolute inset-0 bg-gradient-to-r from-transparent to-transparent z-[5]"></div>

                <div className="relative z-20 max-w-[1600px] mx-auto px-6 md:px-12 pt-16 pb-24">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="w-6 h-1 bg-re-orange rounded-full"></span>
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/80">Marks entry</span>
                        </div>
                        <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight">
                            Record marks
                        </h1>
                        <p className="text-xs md:text-sm text-white/70 font-bold max-w-xl leading-relaxed">
                            Enter or update scores for {selectedClass} • {selectedSubject} when your role includes delegated assessment duties.
                        </p>
                    </div>

                </div>
            </div>

            {/* ── Main Content Area ── */}
            <div className="relative z-30 max-w-[1600px] mx-auto px-2 md:px-6 -mt-16">
                <div className="bg-white rounded-t-[2.5rem] shadow-2xl border border-black/5 overflow-hidden flex flex-col">

                    {/* High-Density Stats Grid */}
                    <div className={`${!isClassSelected ? 'hidden lg:grid' : 'grid'} grid-cols-2 lg:grid-cols-3 divide-x divide-y lg:divide-y-0 divide-black/5 border-b border-black/5`}>
                        {[
                            { label: 'Class Average', value: `${stats.avg}%`, icon: <TrendingUp size={12} /> },
                            { label: 'Pass Ratio', value: `${stats.passRate}%`, icon: <CheckCircle size={12} /> },
                            { label: 'Highest Mark', value: `${stats.highest}%`, icon: <Activity size={12} /> }
                        ].map((s, i) => (
                            <div key={i} className="p-4 sm:p-8 flex flex-col items-center justify-center text-center group hover:bg-re-bg/20 transition-all">
                                <div className="text-re-orange opacity-40 mb-1.5 sm:mb-2">{s.icon}</div>
                                <div className="text-sm sm:text-2xl font-black text-re-text tracking-tighter group-hover:text-re-orange">{s.value}</div>
                                <div className="text-[6px] sm:text-[8px] font-black text-re-text-muted uppercase tracking-[0.2em] mt-0.5 opacity-60">{s.label}</div>
                            </div>
                        ))}
                    </div>

                    {/* Controls Toolbar */}
                    <div className={`${!isClassSelected ? 'hidden lg:flex' : 'flex'} px-4 py-4 border-b border-black/5 flex flex-col lg:flex-row items-center justify-between gap-4 bg-re-bg/20`}>
                        <div className="flex items-center gap-3 w-full lg:w-auto">
                            {/* Class Selector (Desktop) */}
                            <div className="relative hidden lg:block flex-1 lg:w-40">
                                <Users size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-re-text-muted" />
                                <select
                                    value={selectedClass}
                                    onChange={(e) => setSelectedClass(e.target.value)}
                                    className="w-full pl-9 pr-4 h-10 bg-white border border-black/5 rounded-xl text-[10px] font-black uppercase tracking-widest text-re-text appearance-none focus:outline-none"
                                >
                                    <option>Senior 1A</option>
                                    <option>Senior 3A</option>
                                    <option>Senior 5 Sci</option>
                                </select>
                                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-re-text-muted pointer-events-none" />
                            </div>

                            {/* Mobile Filter Toggle */}
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

                        {/* Collapsible Mobile Section */}
                        <div className={`${showMobileFilters ? 'flex' : 'hidden lg:flex'} flex-col lg:flex-row items-center gap-3 w-full lg:w-auto animate-in slide-in-from-top-2 duration-300`}>
                            <div className="relative w-full lg:w-48">
                                <BookOpen size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-re-text-muted" />
                                <select
                                    value={selectedSubject}
                                    onChange={(e) => setSelectedSubject(e.target.value)}
                                    className="w-full pl-9 pr-4 h-10 bg-white border border-black/5 rounded-xl text-[10px] font-black uppercase tracking-widest text-re-text appearance-none focus:outline-none"
                                >
                                    <option>Mathematics</option>
                                    <option>Physics</option>
                                </select>
                                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-re-text-muted pointer-events-none" />
                            </div>
                            <div className="relative w-full lg:w-32">
                                <Clock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-re-text-muted" />
                                <select
                                    value={selectedTerm}
                                    onChange={(e) => setSelectedTerm(e.target.value)}
                                    className="w-full pl-9 pr-4 h-10 bg-white border border-black/5 rounded-xl text-[10px] font-black uppercase tracking-widest text-re-text appearance-none focus:outline-none"
                                >
                                    <option>Term 1</option>
                                    <option>Term 2</option>
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

                            {/* Desktop Save Records */}
                            <button 
                                onClick={handleSave}
                                className="hidden lg:flex h-10 px-6 bg-re-grad-orange text-white text-nowrap     font-black text-[9px] uppercase tracking-widest rounded-xl hover:shadow-re-glow transition-all items-center gap-2 active:scale-95"
                            >
                                <Save size={14} /> Save records
                            </button>
                        </div>
                    </div>

                    {/* Mobile Class Selection Gatekeeper */}
                    {!isClassSelected && (
                        <div className="lg:hidden p-6 bg-re-bg/20 flex flex-col items-center justify-center text-center py-12 animate-in fade-in zoom-in-95 duration-500">
                            <div className="w-16 h-16 bg-white rounded-[2rem] shadow-xl flex items-center justify-center text-re-orange mb-6 border border-black/5 animate-bounce">
                                <GraduationCap size={32} />
                            </div>
                            <h2 className="text-xl font-black text-re-text tracking-tighter uppercase mb-2">Select Class</h2>
                            <p className="text-[10px] text-re-text-muted font-bold uppercase tracking-widest leading-relaxed mb-8 max-w-[240px]">Choose a class to start recording academic marks.</p>

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
                                            <span className="text-[10px] font-black text-re-text group-hover:text-re-orange uppercase">{cls}</span>
                                            <span className="text-[7px] font-bold text-re-text-muted uppercase tracking-widest opacity-40 italic">Registry</span>
                                        </div>
                                        <ChevronDown size={14} className="text-re-text-muted -rotate-90" />
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className={`${!isClassSelected ? 'hidden lg:block' : 'block'} w-full overflow-hidden`}>
                        {/* Mobile Table Header */}
                        {isClassSelected && (
                            <div className="lg:hidden px-6 py-3 bg-white border-b border-black/5 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 bg-re-orange rounded-full"></div>
                                    <span className="text-[9px] font-black text-re-text uppercase tracking-widest">{selectedClass} Registry</span>
                                </div>
                                <button
                                    onClick={() => setIsClassSelected(false)}
                                    className="text-[8px] font-black text-re-orange uppercase tracking-widest hover:underline"
                                >
                                    Change Class
                                </button>
                            </div>
                        )}

                        {/* Table View */}
                        <div className="overflow-x-auto custom-scrollbar">
                            <table className="w-full text-left border-collapse min-w-full sm:min-w-[800px]">
                                <thead>
                                    <tr>
                                        <th className="bg-re-bg/50 border-b border-r border-black/5 px-2 sm:px-4 py-4 text-[7px] sm:text-[9px] font-black uppercase tracking-widest text-re-text-muted w-10 text-center">#</th>
                                        <th className="bg-re-bg/50 border-b border-r border-black/5 px-2 sm:px-4 py-4 text-[7px] sm:text-[9px] font-black uppercase tracking-widest text-re-text-muted">Student Details</th>
                                        <th className="bg-re-bg/50 border-b border-r border-black/5 px-1 sm:px-4 py-4 text-[7px] sm:text-[9px] font-black uppercase tracking-widest text-re-text-muted w-16 sm:w-20 text-center">CAT 1</th>
                                        <th className="bg-re-bg/50 border-b border-r border-black/5 px-1 sm:px-4 py-4 text-[7px] sm:text-[9px] font-black uppercase tracking-widest text-re-text-muted w-16 sm:w-20 text-center">CAT 2</th>
                                        <th className="bg-re-bg/50 border-b border-r border-black/5 px-1 sm:px-4 py-4 text-[7px] sm:text-[9px] font-black uppercase tracking-widest text-re-text-muted w-16 sm:w-20 text-center">Exam</th>
                                        <th className="bg-re-bg/50 border-b border-r border-black/5 px-1 sm:px-4 py-4 text-[7px] sm:text-[9px] font-black uppercase tracking-widest text-re-text-muted w-12 sm:w-16 text-center">Total</th>
                                        <th className="bg-re-bg/50 border-b border-black/5 px-1 sm:px-4 py-4 text-[7px] sm:text-[9px] font-black uppercase tracking-widest text-re-text-muted w-12 sm:w-16 text-center">Grade</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-black/5">
                                    {loading ? (
                                        <tr>
                                            <td colSpan="7" className="p-12 text-center">
                                                <div className="w-8 h-8 border-4 border-re-orange border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                                                <p className="text-[10px] font-black text-re-text-muted uppercase tracking-widest">Fetching Central Records...</p>
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredMarks.map((m, idx) => {
                                        const total = calculateTotal(m);
                                        const grade = calculateGrade(total);
                                        return (
                                            <tr key={m.id} className="hover:bg-re-bg/30 transition-colors group">
                                                <td className="border-r border-b border-black/5 px-2 sm:px-4 py-4 text-center text-[10px] font-black text-gray-300">
                                                    {idx + 1}
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
                                                <td className="border-r border-b border-black/5 px-1 sm:px-4 py-4">
                                                    <input
                                                        type="number"
                                                        value={m.cat1}
                                                        onChange={(e) => handleMarkChange(m.id, 'cat1', e.target.value)}
                                                        className="w-full min-w-[50px] h-10 bg-re-bg/50 border border-transparent rounded-xl text-center font-black text-sm text-re-text focus:bg-white focus:border-re-orange/30 focus:shadow-re-glow transition-all px-1"
                                                    />
                                                </td>
                                                <td className="border-r border-b border-black/5 px-1 sm:px-4 py-4">
                                                    <input
                                                        type="number"
                                                        value={m.cat2}
                                                        onChange={(e) => handleMarkChange(m.id, 'cat2', e.target.value)}
                                                        className="w-full min-w-[50px] h-10 bg-re-bg/50 border border-transparent rounded-xl text-center font-black text-sm text-re-text focus:bg-white focus:border-re-orange/30 focus:shadow-re-glow transition-all px-1"
                                                    />
                                                </td>
                                                <td className="border-r border-b border-black/5 px-1 sm:px-4 py-4">
                                                    <input
                                                        type="number"
                                                        value={m.exam}
                                                        onChange={(e) => handleMarkChange(m.id, 'exam', e.target.value)}
                                                        className="w-full min-w-[50px] h-10 bg-re-bg/50 border border-transparent rounded-xl text-center font-black text-sm text-re-text focus:bg-white focus:border-re-orange/30 focus:shadow-re-glow transition-all px-1"
                                                    />
                                                </td>
                                                <td className="border-r border-b border-black/5 px-1 sm:px-4 py-4 text-center">
                                                    <span className="text-sm font-black text-re-text tracking-tighter">{total}</span>
                                                </td>
                                                <td className="border-b border-black/5 px-1 sm:px-4 py-4 text-center">
                                                    <div className={`inline-flex h-7 w-7 flex items-center justify-center px-1 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ring-1 ring-inset ${grade.color}`}>
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

                        {/* Footer / Actions */}
                        <div className="px-6 py-5 bg-re-bg/10 border-t border-black/5 flex flex-col sm:flex-row items-center justify-between gap-4">
                            <div className="flex items-center gap-4 text-[8px] font-black text-re-text-muted uppercase tracking-[0.2em] opacity-40 italic order-2 sm:order-1">
                                <Activity size={12} /> Scholastic Analytics Sync Active
                            </div>
                            <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto order-1 sm:order-2">
                                <div className="flex items-center gap-3 w-full sm:w-auto">
                                    <button
                                        onClick={() => exportPdf(true)}
                                        className="flex-1 sm:flex-none h-12 sm:h-9 px-4 bg-white border border-black/5 text-re-text font-black text-[9px] uppercase tracking-widest rounded-2xl hover:bg-re-bg transition-all flex items-center justify-center gap-2"
                                    >
                                        <Printer size={14} /> Print
                                    </button>
                                    <button
                                        onClick={() => exportPdf(false)}
                                        className="flex-1 sm:flex-none h-12 sm:h-9 px-4 bg-white border border-black/5 text-re-text font-black text-[9px] uppercase tracking-widest rounded-2xl hover:bg-re-bg transition-all flex items-center justify-center gap-2"
                                    >
                                        <Download size={14} /> Export
                                    </button>
                                </div>
                                <button className="lg:hidden w-full h-14 bg-re-grad-orange text-white font-black text-xs uppercase tracking-[0.2em] rounded-2xl shadow-re-glow flex items-center justify-center gap-3 active:scale-95 transition-all">
                                    <Save size={18} /> Save Records
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
