import React, { useState, useEffect } from 'react';
import api from '../services/api';
import {
    GraduationCap, TrendingUp, Search, ChevronDown,
    Download, Save, FileText, CheckCircle, BarChart2,
    Users, BookOpen, Clock, Activity, Printer, Filter, ChevronUp, User, AlertCircle,
} from 'lucide-react';
import {
    teacherInnerSelectCls,
    teacherInnerSearchCls,
    teacherInnerScoreCls,
    buildSubjectsForClass,
    normalizeGradebookLabel,
} from '../utils/teacherGradebookUi';

export default function RecordMarks() {
    const [classes, setClasses] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [selectedClass, setSelectedClass] = useState('');
    const [isClassSelected, setIsClassSelected] = useState(false);
    const [showMobileFilters, setShowMobileFilters] = useState(false);
    const [selectedSubject, setSelectedSubject] = useState('');
    const [selectedTerm, setSelectedTerm] = useState('Term 1');
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(false);
    /** @type {{ slug: string, label: string, sort_order: number, default_max_score: number|null }[]} */
    const [columns, setColumns] = useState([]);
    const [marks, setMarks] = useState([]);
    const [saveColumnSlug, setSaveColumnSlug] = useState('');
    /** API / empty roster message for this class+subject */
    const [matrixNotice, setMatrixNotice] = useState(null);
    const [registryClassHint, setRegistryClassHint] = useState(null);
    const [matrixLoadFailed, setMatrixLoadFailed] = useState(false);
    /** @type {{ class_name: string, subject_name: string }[]} */
    const [timetablePairs, setTimetablePairs] = useState([]);
    const [filterMode, setFilterMode] = useState('registry'); // 'timetable' | 'registry'

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
            loadGradebookMatrix();
        }
    }, [isClassSelected, selectedClass, selectedSubject]);

    useEffect(() => {
        if (columns.length && !saveColumnSlug) {
            setSaveColumnSlug(columns[0].slug);
        }
    }, [columns, saveColumnSlug]);

    const loadGradebookMatrix = async () => {
        setLoading(true);
        setMatrixNotice(null);
        setRegistryClassHint(null);
        setMatrixLoadFailed(false);
        const className = normalizeGradebookLabel(selectedClass);
        const subjectName = normalizeGradebookLabel(selectedSubject);
        try {
            const res = await api.get('/teacher-portal/gradebook-matrix', {
                params: { class_name: className, subject_name: subjectName },
            });
            if (!res.data.success) {
                setColumns([]);
                setMarks([]);
                setMatrixLoadFailed(true);
                setMatrixNotice(
                    res.data?.message || 'Could not load the gradebook. Check your connection or try again.'
                );
                return;
            }
            const payload = res.data.data || {};
            const cols = Array.isArray(payload.columns) ? payload.columns : [];
            const rawStudents = Array.isArray(payload.students) ? payload.students : [];
            setColumns(cols);
            setMarks(
                rawStudents.map((s) => ({
                    id: s.student_id,
                    adm: s.student_uid,
                    name: s.name,
                    gender: s.gender === 'Male' ? 'M' : 'F',
                    scores: { ...(s.scores || {}) },
                }))
            );
            const regLabel = payload.student_class_name;
            setRegistryClassHint(
                rawStudents.length > 0 && regLabel
                    ? `Roster uses the registration label “${regLabel}” (your selection “${className}” still matches after spacing and capitals are normalized).`
                    : null
            );
            if (rawStudents.length === 0) {
                setMatrixNotice(
                    `No students matched class “${className}” for this subject. Spacing and letter case are already normalized, so the label must still be the same class (for example “S4 A” will not match “Senior 4 Arts”). Try another class, use the full directory if your timetable label is wrong, or ask your school manager to align the timetable and student registration.`
                );
            }
        } catch (err) {
            console.error('Failed to load gradebook:', err);
            setColumns([]);
            setMarks([]);
            setMatrixLoadFailed(true);
            setMatrixNotice(err.response?.data?.message || 'Failed to load gradebook.');
        } finally {
            setLoading(false);
        }
    };

    const maxForSlug = (slug) => {
        const c = columns.find((x) => x.slug === slug);
        const d = c?.default_max_score;
        return d != null && !Number.isNaN(Number(d)) ? Number(d) : 100;
    };

    const handleSaveColumn = async () => {
        const slug = saveColumnSlug || columns[0]?.slug;
        if (!slug) return alert('No gradebook columns are configured. Ask your school manager to add them under Gradebook columns.');
        const className = normalizeGradebookLabel(selectedClass);
        const subjectName = normalizeGradebookLabel(selectedSubject);
        const col = columns.find((c) => c.slug === slug);
        const defaultName = `${selectedTerm} ${col?.label || slug}`;
        const assessmentName = window.prompt(
            `Assessment title (e.g. “Week 4 quiz”, “CAT 1”). Counts toward: ${col?.label || slug}.`,
            defaultName
        );
        if (!assessmentName) return;

        const maxScore = maxForSlug(slug);
        const marksData = marks
            .map((m) => {
                const raw = m.scores?.[slug];
                const v = raw === '' || raw == null ? null : Number(raw);
                if (v == null || Number.isNaN(v)) return null;
                return { student_id: m.id, value: Math.min(v, maxScore) };
            })
            .filter(Boolean);
        if (!marksData.length) {
            return alert('Enter at least one score for this column before saving.');
        }

        try {
            const assessmentRes = await api.post('/teacher-portal/assessments', {
                class_name: className,
                subject_name: subjectName,
                assessment_name: assessmentName,
                max_score: maxScore,
                column_slug: slug,
            });

            if (!assessmentRes.data.success) {
                return alert('Failed to create assessment.');
            }
            const assessment_id = assessmentRes.data.assessment_id;

            const res = await api.post('/teacher-portal/marks', {
                assessment_id,
                marks: marksData,
            });
            if (res.data.success) {
                alert(`Saved ${marksData.length} marks for “${assessmentName}” → ${col?.label || slug}.`);
                loadGradebookMatrix();
            }
        } catch (err) {
            console.error(err);
            alert(err.response?.data?.message || 'Failed to record marks.');
        }
    };

    const handleMarkChange = (id, slug, value) => {
        const cap = maxForSlug(slug);
        const numValue = value === '' ? '' : Math.min(Math.max(Number(value), 0), cap);
        setMarks((prev) =>
            prev.map((m) =>
                m.id === id ? { ...m, scores: { ...m.scores, [slug]: numValue } } : m
            )
        );
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

    const q = searchQuery.trim().toLowerCase();
    const filteredMarks = marks.filter((s) => {
        if (!q) return true;
        return (s.name || '').toLowerCase().includes(q) || String(s.adm || '').toLowerCase().includes(q);
    });

    const stats = {
        avg: marks.length
            ? Math.round(marks.reduce((acc, m) => acc + calculateTotal(m), 0) / marks.length)
            : 0,
        highest: marks.length ? Math.max(...marks.map(calculateTotal)) : 0,
        passRate: marks.length
            ? Math.round((marks.filter((m) => calculateTotal(m) >= 50).length / marks.length) * 100)
            : 0,
    };

    return (
        <div className="animate-in fade-in duration-700 bg-re-bg min-h-screen pb-12">

            {/* ── High-Fidelity Hero Section ── */}
            <div className="relative w-full min-h-[300px] overflow-hidden">
                <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(8,17,31,0.92),rgba(18,35,58,0.84),rgba(33,49,74,0.78))] z-10 backdrop-blur-[2px]"></div>
                <div className="absolute inset-0 z-10 bg-[radial-gradient(circle_at_top_right,rgba(255,140,0,0.20),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(255,184,0,0.10),transparent_24%)]"></div>
                <img src="/teacher.jpg" alt="Hero" className="absolute inset-0 w-full h-full object-cover scale-105 opacity-100" />

                <div className="relative z-20 max-w-[1600px] mx-auto px-6 md:px-12 pt-16 pb-24">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="w-6 h-1 bg-re-orange rounded-full"></span>
                            <span className="text-[10px] font-bold text-white/80">Academic Grading</span>
                        </div>
                        <h1 className="text-3xl md:text-5xl font-bold text-white">
                            Students Marks
                        </h1>
                        <p className="text-[12px] md:text-sm text-white/70 font-medium max-w-xl leading-relaxed opacity-80">
                            {selectedClass} · {selectedSubject}. Fill columns in any order; pick the column, Save, and name each round (quiz, CAT, exam—your wording).
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
                                <div className="text-sm sm:text-2xl font-bold text-re-text group-hover:text-re-orange">{s.value}</div>
                                <div className="text-[10px] font-semibold text-re-text-muted mt-0.5 opacity-60">{s.label}</div>
                            </div>
                        ))}
                    </div>

                    {/* Controls Toolbar — compact on desktop */}
                    <div className={`${!isClassSelected ? 'hidden lg:flex' : 'flex'} px-4 py-4 lg:px-3 lg:py-2 border-b border-black/5 flex flex-col lg:flex-row lg:flex-nowrap lg:items-center lg:justify-start gap-4 lg:gap-2 bg-re-bg/20`}>
                        <div className="flex items-center gap-3 lg:gap-2 w-full lg:w-auto lg:shrink-0">
                            {/* Class Selector (Desktop) */}
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

                            {/* Mobile Filter Toggle */}
                            <button
                                onClick={() => setShowMobileFilters(!showMobileFilters)}
                                className="lg:hidden w-full flex justify-between items-center gap-2 text-[10px] font-bold transition-all"
                            >
                                <div className="flex items-center gap-2">
                                    <Filter size={14} className="text-re-orange" /> show filters
                                </div>
                                {showMobileFilters ? <ChevronUp size={14} className="text-re-orange" /> : <ChevronDown size={14} />}
                            </button>

                        </div>

                        {/* Collapsible Mobile Section */}
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
                            <div className="relative w-full lg:w-[5.5rem] lg:shrink-0">
                                <Clock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-re-text-muted lg:hidden z-[1] pointer-events-none" />
                                <Clock size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-re-text-muted hidden lg:block z-[1] pointer-events-none" />
                                <select
                                    value={selectedTerm}
                                    onChange={(e) => setSelectedTerm(e.target.value)}
                                    className={`${teacherInnerSelectCls} !pl-10 lg:!pl-8`}
                                >
                                    <option>Term 1</option>
                                    <option>Term 2</option>
                                </select>
                            </div>

                            <div className="relative w-full lg:flex-1 lg:min-w-[7rem] lg:max-w-[11rem] group">
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

                            <div className="flex flex-col sm:flex-row gap-2 lg:gap-1.5 w-full lg:w-auto lg:items-center lg:shrink-0">
                                <select
                                    value={saveColumnSlug}
                                    onChange={(e) => setSaveColumnSlug(e.target.value)}
                                    className={`${teacherInnerSelectCls} lg:max-w-[8rem] lg:!px-2 lg:!pl-2`}
                                    title="Save marks into this gradebook column; name the assessment when prompted (any title you use in class)."
                                >
                                    {columns.length === 0 && <option value="">No columns</option>}
                                    {columns.map((c) => (
                                        <option key={c.slug} value={c.slug}>{c.label}</option>
                                    ))}
                                </select>
                                <button
                                    type="button"
                                    onClick={handleSaveColumn}
                                    className="hidden lg:inline-flex h-8 px-3 bg-re-grad-orange text-white text-nowrap font-bold text-[10px] rounded-lg hover:shadow-re-glow transition-all items-center gap-1 active:scale-95"
                                >
                                    <Save size={12} /> Save
                                </button>
                            </div>
                        </div>
                    </div>

                    {registryClassHint && isClassSelected && !loading && !matrixLoadFailed && (
                        <div className="mx-4 mt-3 rounded-xl border border-sky-200/80 bg-sky-50/90 px-4 py-2.5 text-[10px] font-bold text-sky-950/90 leading-snug">
                            {registryClassHint}
                        </div>
                    )}

                    {/* Mobile Class Selection Gatekeeper */}
                    {!isClassSelected && (
                        <div className="lg:hidden p-6 bg-re-bg/20 flex flex-col items-center justify-center text-center py-12 animate-in fade-in zoom-in-95 duration-500">
                            <div className="w-16 h-16 bg-white rounded-[2rem] shadow-xl flex items-center justify-center text-re-orange mb-6 border border-black/5 animate-bounce">
                                <GraduationCap size={32} />
                            </div>
                            <h2 className="text-xl font-bold text-re-text mb-2">Select Class</h2>
                            <p className="text-[10px] text-re-text-muted font-bold leading-relaxed mb-8 max-w-[240px]">Choose a class to start recording academic marks.</p>

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
                                            <span className="text-[10px] font-bold text-re-text group-hover:text-re-orange">{cls}</span>
                                            <span className="text-[10px] font-medium text-re-text-muted opacity-40 italic">Registry</span>
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
                                    <span className="text-[10px] font-bold text-re-text">{selectedClass} Registry</span>
                                </div>
                                <button
                                    onClick={() => setIsClassSelected(false)}
                                    className="text-[10px] font-bold text-re-orange hover:underline"
                                >
                                    Change Class
                                </button>
                            </div>
                        )}

                        {!loading && isClassSelected && matrixNotice && (
                            <div
                                className={`mx-4 mt-4 mb-2 flex gap-3 rounded-xl border px-4 py-3 text-left shadow-sm ${
                                    matrixLoadFailed
                                        ? 'border-red-200/90 bg-red-50/90'
                                        : 'border-amber-200/80 bg-amber-50/90'
                                }`}
                            >
                                <AlertCircle
                                    className={`w-5 h-5 shrink-0 mt-0.5 ${matrixLoadFailed ? 'text-red-600' : 'text-amber-600'}`}
                                />
                                <div>
                                    <p
                                        className={`text-[10px] font-bold ${
                                            matrixLoadFailed ? 'text-red-900/90' : 'text-amber-900/90'
                                        }`}
                                    >
                                        {matrixLoadFailed ? 'Gradebook could not load' : 'No students in this class'}
                                    </p>
                                    <p className="text-[11px] font-bold text-re-text/90 leading-snug mt-1">{matrixNotice}</p>
                                </div>
                            </div>
                        )}

                        {/* Table View */}
                        <div className="overflow-x-auto custom-scrollbar">
                            <table className="w-full text-left border-collapse min-w-full">
                                <thead>
                                    <tr>
                                        <th className="bg-re-bg/50 border-b border-r border-black/5 px-2 sm:px-4 py-4 text-[10px] font-bold text-re-text-muted w-10 text-center">#</th>
                                        <th className="bg-re-bg/50 border-b border-r border-black/5 px-2 sm:px-4 py-4 text-[10px] font-bold text-re-text-muted">Student Details</th>
                                        {columns.map((c) => (
                                            <th
                                                key={c.slug}
                                                className="bg-re-bg/50 border-b border-r border-black/5 px-1 sm:px-4 py-4 text-[10px] font-bold text-re-text-muted w-16 sm:w-24 text-center"
                                                title={c.default_max_score != null ? `Max ${c.default_max_score}` : undefined}
                                            >
                                                <span className="block">{c.label}</span>
                                                {c.default_max_score != null && (
                                                    <span className="block text-[10px] font-medium opacity-50">max {c.default_max_score}</span>
                                                )}
                                            </th>
                                        ))}
                                        <th className="bg-re-bg/50 border-b border-r border-black/5 px-1 sm:px-4 py-4 text-[10px] font-bold text-re-text-muted w-12 sm:w-16 text-center">Total</th>
                                        <th className="bg-re-bg/50 border-b border-black/5 px-1 sm:px-4 py-4 text-[10px] font-bold text-re-text-muted w-12 sm:w-16 text-center">Grade</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-black/5">
                                    {loading ? (
                                        <tr>
                                            <td colSpan={4 + columns.length} className="p-12 text-center">
                                                <div className="w-8 h-8 border-4 border-re-orange border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                                                <p className="text-[10px] font-bold text-re-text-muted">Fetching Central Records...</p>
                                            </td>
                                        </tr>
                                    ) : matrixLoadFailed ? (
                                        <tr>
                                            <td colSpan={8} className="p-8 text-center text-[10px] font-bold text-re-text-muted">
                                                See the alert above — the gradebook did not load.
                                            </td>
                                        </tr>
                                    ) : columns.length === 0 ? (
                                        <tr>
                                            <td colSpan={4} className="p-10 text-center text-[10px] font-bold text-re-text-muted">
                                                No gradebook columns yet. Your school manager can add them under Gradebook columns.
                                            </td>
                                        </tr>
                                    ) : marks.length === 0 ? (
                                        <tr>
                                            <td colSpan={4 + columns.length} className="p-10 text-center">
                                                <p className="text-[11px] font-bold text-re-text mb-1">No students to display</p>
                                                <p className="text-[10px] font-bold text-re-text-muted leading-relaxed max-w-lg mx-auto">
                                                    Details are in the yellow notice above (class name must match the registry).
                                                </p>
                                            </td>
                                        </tr>
                                    ) : filteredMarks.length === 0 ? (
                                        <tr>
                                            <td colSpan={4 + columns.length} className="p-10 text-center text-[10px] font-bold text-re-text-muted">
                                                No students match your search. Clear the search box to see everyone.
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredMarks.map((m, idx) => {
                                            const total = calculateTotal(m);
                                            const grade = calculateGrade(total);
                                            return (
                                                <tr key={m.id} className="hover:bg-re-bg/30 transition-colors group">
                                                    <td className="border-r border-b border-black/5 px-2 sm:px-4 py-4 text-center text-[10px] font-bold text-gray-300">
                                                        {idx + 1}
                                                    </td>
                                                    <td className="border-r border-b border-black/5 px-2 sm:px-4 py-4 min-w-0 overflow-hidden">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-8 h-8 rounded-full bg-re-bg flex-shrink-0 flex items-center justify-center font-bold text-[10px] text-gray-400 border border-black/5 group-hover:bg-white transition-colors">
                                                                <User size={14} className="opacity-40" />
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <h4 className="text-[11px] font-bold text-re-text truncate block">{m.name}</h4>
                                                                <p className="text-[10px] font-medium text-re-text-muted opacity-40">{m.adm}</p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    {columns.map((c) => (
                                                        <td key={c.slug} className="border-r border-b border-black/5 px-1.5 sm:px-3 py-3 align-middle">
                                                            <input
                                                                type="number"
                                                                inputMode="decimal"
                                                                value={m.scores?.[c.slug] ?? ''}
                                                                onChange={(e) => handleMarkChange(m.id, c.slug, e.target.value)}
                                                                className={teacherInnerScoreCls}
                                                                placeholder="—"
                                                            />
                                                        </td>
                                                    ))}
                                                    <td className="border-r border-b border-black/5 px-1 sm:px-4 py-4 text-center">
                                                        <span className="text-sm font-bold text-re-text">{total}</span>
                                                    </td>
                                                    <td className="border-b border-black/5 px-1 sm:px-4 py-4 text-center">
                                                        <div className={`inline-flex h-7 w-7 flex items-center justify-center px-1 py-1 rounded-full text-[10px] font-bold ring-1 ring-inset ${grade.color}`}>
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
                            <div className="flex items-center gap-4 text-[10px] font-medium text-re-text-muted opacity-40 italic order-2 sm:order-1">
                                <Activity size={12} /> Scholastic Analytics Sync Active
                            </div>
                            <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto order-1 sm:order-2">
                                <div className="flex items-center gap-3 w-full sm:w-auto">
                                    <button className="flex-1 sm:flex-none h-12 sm:h-9 px-4 bg-white border border-black/5 text-re-text font-bold text-[10px] rounded-2xl hover:bg-re-bg transition-all flex items-center justify-center gap-2">
                                        <Printer size={14} /> Print
                                    </button>
                                    <button className="flex-1 sm:flex-none h-12 sm:h-9 px-4 bg-white border border-black/5 text-re-text font-bold text-[10px] rounded-2xl hover:bg-re-bg transition-all flex items-center justify-center gap-2">
                                        <Download size={14} /> Export
                                    </button>
                                </div>
                                <button
                                    type="button"
                                    onClick={handleSaveColumn}
                                    className="lg:hidden w-full h-14 bg-re-grad-orange text-white font-bold text-sm rounded-2xl shadow-re-glow flex items-center justify-center gap-3 active:scale-95 transition-all"
                                >
                                    <Save size={18} /> Save column marks
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
