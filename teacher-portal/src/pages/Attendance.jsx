import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import {
    normalizeGradebookLabel,
    teacherInnerSelectCls,
    teacherInnerSearchCls,
} from '../utils/teacherGradebookUi';
import {
    Calendar, Users, CheckCircle, XCircle, Clock,
    FileText, Search, ChevronDown, Check, X, Filter, BarChart2, CheckSquare, List,
    ChevronUp, User, ChevronLeft, ChevronRight,
} from 'lucide-react';

export default function Attendance() {
    const navigate = useNavigate();
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [selectedClass, setSelectedClass] = useState(null);
    const [selectedClassFilter, setSelectedClassFilter] = useState('');
    const [selectedLesson, setSelectedLesson] = useState(null);
    const [lessons, setLessons] = useState([]);
    const [isClassSelected, setIsClassSelected] = useState(false);
    const [showMobileFilters, setShowMobileFilters] = useState(false);
    const [showBulkActions, setShowBulkActions] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(false);
    const [roster, setRoster] = useState([]);
    const [dailySummary, setDailySummary] = useState([]);
    const [weeklySummary, setWeeklySummary] = useState(null);
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [showMobileChartPanel, setShowMobileChartPanel] = useState(false);
    const [periodScope, setPeriodScope] = useState('daily');

    const getDayName = (dateStr) => {
        const date = new Date(dateStr + 'T12:00:00');
        return date.toLocaleDateString('en-US', { weekday: 'long' });
    };

    const shiftDateByDays = (delta) => {
        const d = new Date(selectedDate + 'T12:00:00');
        d.setDate(d.getDate() + delta);
        setSelectedDate(d.toISOString().split('T')[0]);
    };

    const rosterClassForLesson = (lesson) =>
        lesson?.roster_class_name || lesson?.group || '';

    const classOptionsFromLessons = Array.from(
        new Set((lessons || []).map((l) => rosterClassForLesson(l)).filter(Boolean))
    );

    const dayNameForDate = getDayName(selectedDate);

    const lessonsForScope = useMemo(() => {
        if (periodScope !== 'daily') return lessons;
        return lessons.filter(
            (l) => String(l.day || '').toLowerCase() === dayNameForDate.toLowerCase()
        );
    }, [lessons, periodScope, dayNameForDate]);

    const periodOptions = selectedClassFilter
        ? lessonsForScope.filter((l) => rosterClassForLesson(l) === selectedClassFilter)
        : lessonsForScope;

    const lessonClassDisplay = (lesson) => {
        if (!lesson) return '';
        if (lesson.class_alternatives?.length > 1) {
            return `${lesson.group} (${lesson.class_alternatives.join(' · ')})`;
        }
        return lesson.group || '';
    };

    const selectLesson = (lesson) => {
        setSelectedClass(rosterClassForLesson(lesson));
        setSelectedLesson(lesson);
        setIsClassSelected(true);
    };

    useEffect(() => {
        fetchLessons();
        setSelectedLesson(null);
        setIsClassSelected(false);
        setSelectedClassFilter('');
    }, [selectedDate]);

    useEffect(() => {
        if (!selectedLesson) return;
        const stillVisible = periodOptions.some((l) => l.id === selectedLesson.id);
        if (!stillVisible) {
            setSelectedLesson(null);
            setIsClassSelected(false);
            setSelectedClass(null);
        }
    }, [periodOptions, selectedLesson]);

    useEffect(() => {
        if (selectedClass && selectedLesson) {
            fetchRosterAndSaved();
        }
    }, [selectedClass, selectedLesson?.id, selectedDate]);

    useEffect(() => {
        fetchDailySummary();
        fetchWeeklySummary();
    }, [selectedDate, selectedClass]);

    const fetchLessons = async () => {
        setLoading(true);
        try {
            // Full timetable; filtered client-side by day when periodScope is "daily".
            const res = await api.get('/teacher-portal/timetable');
            setLessons(res.data?.success ? (res.data.data || []) : []);
        } catch (err) {
            console.error('Failed to fetch lessons:', err);
            setLessons([]);
        } finally {
            setLoading(false);
        }
    };


    const rosterLabelsForLesson = (lesson) => {
        if (!lesson) return [];
        const labels = [];
        if (lesson.roster_class_name) labels.push(normalizeGradebookLabel(lesson.roster_class_name));
        if (Array.isArray(lesson.class_alternatives)) {
            lesson.class_alternatives.forEach((c) => {
                const n = normalizeGradebookLabel(c);
                if (n && !labels.includes(n)) labels.push(n);
            });
        }
        const group = normalizeGradebookLabel(lesson.group);
        if (group && !labels.includes(group)) labels.push(group);
        return labels;
    };

    const fetchRosterAndSaved = async () => {
        if (!selectedClass || !selectedLesson) return;
        setLoading(true);
        try {
            const classLabels = rosterLabelsForLesson(selectedLesson);
            const className = classLabels[0] || normalizeGradebookLabel(selectedClass);
            const res = await api.get('/teacher-portal/students', {
                params: {
                    class_name: className,
                    scope: 'attendance',
                    date: selectedDate,
                    ...(classLabels.length > 1 ? { class_labels: classLabels.join(',') } : {}),
                },
            });
            if (!res.data.success) {
                setRoster([]);
                return;
            }

            const rawList = Array.isArray(res.data.data) ? res.data.data : [];
            let rows = rawList.map((s) => ({
                id: s.row_id,
                adm: s.id,
                name: s.name,
                gender: s.gender === 'Male' ? 'M' : s.gender === 'Female' ? 'F' : '—',
                status: s.active_permission ? 'permission' : 'present',
                remarks: '',
                active_permission: s.active_permission,
                residency_status: s.residency_status || 'DAY',
            }));

            const attRes = await api.get('/teacher-portal/attendance', {
                params: { timetable_id: selectedLesson.id, date: selectedDate },
            });
            if (attRes.data.success && attRes.data.data?.records?.length) {
                const byId = Object.fromEntries(
                    attRes.data.data.records.map((r) => [r.student_id, r.status])
                );
                rows = rows.map((row) =>
                    byId[row.id] != null
                        ? {
                            ...row,
                            status: byId[row.id],
                            remarks: (attRes.data.data.records.find((x) => x.student_id === row.id)?.remarks || ''),
                        }
                        : row
                );
            }
            setRoster(rows);
        } catch (err) {
            console.error('Failed to fetch roster:', err);
            setRoster([]);
        } finally {
            setLoading(false);
        }
    };

    const fetchDailySummary = async () => {
        try {
            const res = await api.get('/teacher-portal/attendance-summary/daily', {
                params: { date: selectedDate, class_name: selectedClass || undefined },
            });
            if (res.data?.success) setDailySummary(res.data.data || []);
        } catch (err) {
            console.error('Failed to load daily summary', err);
            setDailySummary([]);
        }
    };

    const fetchWeeklySummary = async () => {
        try {
            const res = await api.get('/teacher-portal/attendance-summary/weekly', {
                params: { date: selectedDate },
            });
            if (res.data?.success) setWeeklySummary(res.data.data || null);
        } catch (err) {
            console.error('Failed to load weekly summary', err);
            setWeeklySummary(null);
        }
    };

    const handleSave = async () => {
        if (!selectedLesson) return alert("Select a lesson/period first.");
        if (roster.length === 0) return alert('No students loaded for this class.');

        try {
            setLoading(true);
            const existing = await api.get('/teacher-portal/attendance', {
                params: { timetable_id: selectedLesson.id, date: selectedDate },
            });
            if (existing.data?.success && existing.data?.data?.log_id) {
                const overwrite = window.confirm('Attendance already exists for this class and date. Do you want to overwrite it?');
                if (!overwrite) return;
            }

            const records = roster.map(s => ({ student_id: s.id, status: s.status, remarks: s.remarks || '' }));
            const res = await api.post('/teacher-portal/attendance', {
                records,
                date: selectedDate,
                timetable_id: selectedLesson.id
            });
            if (res.data.success) {
                alert(
                    `Attendance successfully marked for ${selectedLesson.subject} (${lessonClassDisplay(selectedLesson)})!`
                );
            }
        } catch (err) {
            console.error(err);
            alert('Failed to save attendance. Check connection to API.');
        } finally {
            setLoading(false);
        }
    };

    const handleStatusChange = (id, newStatus) => {
        setRoster(prev => prev.map(student =>
            student.id === id ? { ...student, status: newStatus } : student
        ));
    };
    const selectedStudentDetails = selectedStudent
        ? roster.find((s) => s.id === selectedStudent.id) || selectedStudent
        : null;
    const selectedStudentWeeklyRows = selectedStudentDetails?.adm && weeklySummary?.rows?.length
        ? weeklySummary.rows.filter((r) => String(r.student_uid) === String(selectedStudentDetails.adm))
        : [];

    const handleMarkAll = (status) => {
        const resolved = status === 'none' ? 'absent' : status;
        setRoster((prev) => prev.map((student) => ({ ...student, status: resolved })));
    };

    const searchNorm = searchQuery.trim().toLowerCase();
    const filteredRoster = roster.filter((s) => {
        if (!searchNorm) return true;
        const name = (s.name || '').toLowerCase();
        const adm = String(s.adm ?? '').toLowerCase();
        return name.includes(searchNorm) || adm.includes(searchNorm);
    });

    const stats = {
        total: roster.length,
        present: roster.filter(s => s.status === 'present').length,
        absent: roster.filter(s => s.status === 'absent').length,
        late: roster.filter(s => s.status === 'late').length,
        permission: roster.filter(s => s.status === 'permission').length,
    };

    const attendanceRate =
        stats.total > 0
            ? Math.round(((stats.present + stats.late) / stats.total) * 100)
            : 0;

    return (
        <div className="animate-in fade-in duration-700 bg-re-bg min-h-screen pb-12">

            {/* Hero — solid #FF8C00 (matches Dashboard.jsx; no gradients / glows) */}
            <section className="relative flex min-h-[260px] w-full items-center overflow-hidden bg-[#FF8C00] text-white shadow-none md:min-h-[300px]">
                <div className="absolute inset-0 z-[1]">
                    <img
                        src="/teacher.png"
                        alt=""
                        className="block h-full w-full object-cover object-top transition-transform duration-[8s] ease-in-out hover:scale-[1.04]"
                    />
                    <div className="absolute inset-0 z-[2] bg-black/25" aria-hidden />
                </div>

                <div className="absolute left-6 top-6 z-10 hidden md:flex items-center gap-2 rounded-full border border-white/25 bg-black/25 px-4 py-1.5 text-[10px] font-semibold tracking-[0.14em] text-white/95 backdrop-blur-md">
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-white" />
                    ShuleTicha · Secure
                </div>

                <div className="relative z-10 mx-auto w-full max-w-[1600px] px-7 pb-10 pt-14 md:px-10 md:pb-12 md:pt-12">
                    <div className="max-w-4xl space-y-1">
                        <div className="mb-2 flex items-center gap-2">
                            <span className="h-1 w-6 rounded-full bg-re-orange" />
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/80">Roll Call Module</span>
                        </div>
                        <h1 className="font-sans text-2xl font-black tracking-tight text-white md:text-4xl lg:text-5xl">
                            Daily Attendance
                        </h1>
                    </div>
                </div>
            </section>

            {/* ── Main Content Area ── */}
            <div className="relative z-30 max-w-[1600px] mx-auto px-2 md:px-6 -mt-10">
                <div className="mb-3 bg-white border border-black/5 rounded-2xl p-2 flex flex-wrap gap-2 w-full md:w-fit">
                    <button
                        type="button"
                        aria-current="page"
                        className="px-4 h-10 rounded-xl text-[10px] font-black uppercase tracking-widest bg-re-grad-orange text-white"
                    >
                        Period attendance
                    </button>
                    <button
                        type="button"
                        onClick={() => navigate('/round-roll-call')}
                        className="px-4 h-10 rounded-xl text-[10px] font-black uppercase tracking-widest bg-re-bg text-re-text-muted transition-colors hover:bg-re-bg/80"
                    >
                        Round Roll Call
                    </button>
                    <button
                        type="button"
                        onClick={() => navigate('/teacher-attendance')}
                        className="px-4 h-10 rounded-xl text-[10px] font-black uppercase tracking-widest bg-re-bg text-re-text-muted transition-colors hover:bg-re-bg/80"
                    >
                        Teacher attendance
                    </button>
                </div>

                <div className="flex bg-white rounded-t-[2.5rem] shadow-2xl border border-black/5 overflow-hidden flex-col">

                    {/* Mobile: date always visible (header row is hidden on small screens until a period is chosen) */}
                    <div className="lg:hidden px-3 py-3 border-b border-black/5 bg-white flex flex-col gap-2">
                        <div className="flex items-center justify-between gap-2">
                            <span className="text-[10px] font-black uppercase tracking-widest text-re-text-muted">Attendance date</span>
                            <button
                                type="button"
                                onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
                                className="text-[9px] font-black uppercase tracking-widest text-re-orange px-2 py-1 rounded-lg bg-re-orange/10"
                            >
                                Today
                            </button>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => shiftDateByDays(-1)}
                                className="shrink-0 h-11 w-11 flex items-center justify-center rounded-xl border border-black/10 bg-re-bg text-re-orange active:scale-95"
                                aria-label="Previous day"
                            >
                                <ChevronLeft size={20} />
                            </button>
                            <div className="relative flex-1 min-w-0">
                                <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-re-text-muted pointer-events-none z-10" />
                                <input
                                    type="date"
                                    value={selectedDate}
                                    onChange={(e) => setSelectedDate(e.target.value)}
                                    className="w-full pl-10 pr-3 h-11 bg-white border border-black/10 rounded-xl text-xs font-black text-re-text focus:outline-none focus:ring-2 focus:ring-re-orange/20"
                                />
                            </div>
                            <button
                                type="button"
                                onClick={() => shiftDateByDays(1)}
                                className="shrink-0 h-11 w-11 flex items-center justify-center rounded-xl border border-black/10 bg-re-bg text-re-orange active:scale-95"
                                aria-label="Next day"
                            >
                                <ChevronRight size={20} />
                            </button>
                        </div>
                        <p className="text-[14px]  font-bold text-re-text-muted leading-snug">
                            Use arrows or the calendar to move to another day, then choose a period below.
                        </p>
                    </div>

                    {/* Integrated Stats Grid (Students-Style) */}
                    <div className={`${!isClassSelected ? 'hidden lg:grid' : 'grid'} grid-cols-2 lg:grid-cols-4 divide-x divide-y lg:divide-y-0 divide-black/5 border-b border-black/5`}>
                        {[
                            { label: 'Total Scoped', value: stats.total, icon: <Users size={12} /> },
                            { label: 'Present Ratio', value: `${attendanceRate}%`, icon: <CheckCircle size={12} /> },
                            { label: 'Missing Registry', value: stats.absent, icon: <XCircle size={12} /> },
                            { label: 'Late/Excused', value: stats.late + stats.permission, icon: <Clock size={12} /> }
                        ].map((s, i) => (
                            <div key={i} className="p-4 sm:p-8 flex flex-col items-center justify-center text-center group hover:bg-re-bg/20 transition-all">
                                <div className="text-re-orange opacity-40 mb-1.5 sm:mb-2">{s.icon}</div>
                                <div className="text-sm sm:text-2xl font-black text-re-text tracking-tighter group-hover:text-re-orange">{s.value}</div>
                                <div className="text-[6px] sm:text-[8px] font-black text-re-text-muted uppercase tracking-[0.2em] mt-0.5 opacity-60">{s.label}</div>
                            </div>
                        ))}
                    </div>

                    {/* Header/Controls — RecordMarks-style compact bar on desktop */}
                    <div className="flex px-4 py-4 lg:px-3 lg:py-2 border-b border-black/5 flex-col lg:flex-row lg:flex-nowrap lg:items-center lg:justify-start gap-4 lg:gap-2 bg-re-bg/20">

                        <div className="flex items-center gap-3 lg:gap-2 w-full lg:w-auto lg:shrink-0">
                            <div className="relative hidden lg:block lg:min-w-[12rem] lg:max-w-[22rem] shrink-0">
                                <Users size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-re-text-muted z-[1] pointer-events-none" />
                                <select
                                    value={selectedLesson?.id || ''}
                                    onChange={(e) => {
                                        const lesson = periodOptions.find(l => l.id.toString() === e.target.value);
                                        if (lesson) {
                                            setSelectedLesson(lesson);
                                            setSelectedClass(rosterClassForLesson(lesson));
                                            setIsClassSelected(true);
                                        }
                                    }}
                                    className={`${teacherInnerSelectCls} !pl-8 shadow-[inset_0_2px_8px_rgba(15,23,42,0.11),inset_0_-1px_0_rgba(255,255,255,0.55)]`}
                                >
                                    <option value="">Select Period / Lesson</option>
                                    {periodOptions.map(lesson => (
                                        <option key={lesson.id} value={lesson.id}>
                                            {lesson.subject} — {lessonClassDisplay(lesson)} ({lesson.time})
                                            {lesson.teacher_name ? ` · ${lesson.teacher_name}` : ''}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="relative hidden lg:block lg:min-w-[9rem] lg:max-w-[14rem] shrink-0">
                                <select
                                    value={selectedClassFilter}
                                    onChange={(e) => {
                                        setSelectedClassFilter(e.target.value);
                                        setSelectedLesson(null);
                                        setIsClassSelected(false);
                                    }}
                                    className={`${teacherInnerSelectCls} shadow-[inset_0_2px_8px_rgba(15,23,42,0.11),inset_0_-1px_0_rgba(255,255,255,0.55)]`}
                                >
                                    <option value="">All classes</option>
                                    {classOptionsFromLessons.map((className) => (
                                        <option key={className} value={className}>{className}</option>
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
                            <div className="relative w-full lg:w-auto hidden lg:flex items-center gap-1.5 lg:shrink-0">
                                <button
                                    type="button"
                                    onClick={() => shiftDateByDays(-1)}
                                    className="shrink-0 h-10 lg:h-8 w-10 lg:w-8 flex items-center justify-center rounded-xl lg:rounded-lg border border-black/[0.07] bg-re-bg text-re-orange shadow-[inset_0_2px_6px_rgba(15,23,42,0.06)] hover:bg-white/80 transition-colors"
                                    title="Previous day"
                                >
                                    <ChevronLeft size={16} className="lg:w-[15px] lg:h-[15px]" />
                                </button>
                                <div className="relative flex-1 min-w-[7rem] lg:min-w-[8.5rem] lg:max-w-[10rem]">
                                    <Calendar size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-re-text-muted z-[1] pointer-events-none" />
                                    <input
                                        type="date"
                                        value={selectedDate}
                                        onChange={(e) => setSelectedDate(e.target.value)}
                                        className={`${teacherInnerSearchCls} !pl-9 font-black uppercase tracking-widest`}
                                    />
                                </div>
                                <button
                                    type="button"
                                    onClick={() => shiftDateByDays(1)}
                                    className="shrink-0 h-10 lg:h-8 w-10 lg:w-8 flex items-center justify-center rounded-xl lg:rounded-lg border border-black/[0.07] bg-re-bg text-re-orange shadow-[inset_0_2px_6px_rgba(15,23,42,0.06)] hover:bg-white/80 transition-colors"
                                    title="Next day"
                                >
                                    <ChevronRight size={16} className="lg:w-[15px] lg:h-[15px]" />
                                </button>
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
                                onClick={handleSave}
                                className="hidden lg:inline-flex h-8 px-3 bg-re-grad-orange text-white text-nowrap font-black text-[7px] uppercase tracking-tight rounded-lg hover:shadow-re-glow transition-all items-center gap-1 active:scale-95"
                            >
                                <CheckSquare size={12} /> Save records
                            </button>
                        </div>
                    </div>

                    {/* ── Period Picker — visible on all screen sizes ── */}
                    <div className="border-b border-black/5 bg-gradient-to-b from-re-bg/40 to-white/60 px-3 sm:px-4 py-4 space-y-3">
                        {/* Header row */}
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                            <div className="flex items-center gap-2 min-w-0">
                                <span className="w-5 h-5 rounded-lg bg-re-orange/10 flex items-center justify-center shrink-0">
                                    <Clock size={11} className="text-re-orange" />
                                </span>
                                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-re-text truncate">
                                    {dayNameForDate}
                                    <span className="text-re-text-muted font-bold normal-case ml-1">
                                        — {periodOptions.length} period{periodOptions.length !== 1 ? 's' : ''}
                                        {periodScope === 'daily' ? ' today' : ' total'}
                                    </span>
                                </p>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                                <div className="flex p-1 rounded-xl bg-re-bg border border-black/[0.06] w-full sm:w-auto">
                                    {[
                                        { id: 'daily', label: 'Daily', hint: 'This date only' },
                                        { id: 'all', label: 'All periods', hint: 'Full week' },
                                    ].map((opt) => (
                                        <button
                                            key={opt.id}
                                            type="button"
                                            title={opt.hint}
                                            onClick={() => setPeriodScope(opt.id)}
                                            className={`flex-1 sm:flex-none px-3 h-8 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${
                                                periodScope === opt.id
                                                    ? 'bg-re-grad-orange text-white shadow-sm'
                                                    : 'text-re-text-muted hover:text-re-text'
                                            }`}
                                        >
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>
                                {classOptionsFromLessons.length > 1 && (
                                    <select
                                        value={selectedClassFilter}
                                        onChange={(e) => {
                                            setSelectedClassFilter(e.target.value);
                                            setSelectedLesson(null);
                                            setIsClassSelected(false);
                                        }}
                                        className="h-8 rounded-xl border border-black/10 px-2.5 text-[10px] font-black uppercase tracking-widest bg-white min-w-[7rem]"
                                    >
                                        <option value="">All classes</option>
                                        {classOptionsFromLessons.map((cn) => (
                                            <option key={cn} value={cn}>{cn}</option>
                                        ))}
                                    </select>
                                )}
                                {selectedLesson && (
                                    <button
                                        type="button"
                                        onClick={() => { setSelectedLesson(null); setIsClassSelected(false); }}
                                        className="h-8 px-3 rounded-xl bg-re-orange/10 text-re-orange text-[9px] font-black uppercase tracking-widest hover:bg-re-orange/20 transition-colors"
                                    >
                                        Clear
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Period cards — horizontal scroll on mobile, grid on larger screens */}
                        {loading && lessons.length === 0 ? (
                            <div className="flex items-center justify-center gap-2 py-6 text-[10px] font-black text-re-text-muted uppercase tracking-widest">
                                <div className="w-4 h-4 border-2 border-re-orange border-t-transparent rounded-full animate-spin" />
                                Loading schedule…
                            </div>
                        ) : periodOptions.length > 0 ? (
                            <div className="flex sm:grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5 overflow-x-auto sm:overflow-visible pb-1 sm:pb-0 snap-x snap-mandatory sm:snap-none -mx-1 px-1 sm:mx-0 sm:px-0 custom-scrollbar">
                                {periodOptions.map((lesson, idx) => {
                                    const active = selectedLesson?.id === lesson.id;
                                    const palette = [
                                        { border: '#f97316', bg: 'rgba(249,115,22,0.08)' },
                                        { border: '#6366f1', bg: 'rgba(99,102,241,0.08)' },
                                        { border: '#10b981', bg: 'rgba(16,185,129,0.08)' },
                                        { border: '#3b82f6', bg: 'rgba(59,130,246,0.08)' },
                                        { border: '#a855f7', bg: 'rgba(168,85,247,0.08)' },
                                        { border: '#ef4444', bg: 'rgba(239,68,68,0.08)' },
                                    ];
                                    const c = palette[idx % palette.length];
                                    return (
                                        <button
                                            key={lesson.id}
                                            type="button"
                                            onClick={() => selectLesson(lesson)}
                                            className={`relative shrink-0 w-[min(82vw,17rem)] sm:w-auto snap-start text-left rounded-2xl border p-3.5 transition-all duration-200 overflow-hidden ${active
                                                ? 'border-re-orange bg-white shadow-lg ring-2 ring-re-orange/20 scale-[1.01]'
                                                : 'border-black/[0.07] bg-white hover:shadow-md hover:border-re-orange/30 active:scale-[0.99]'
                                                }`}
                                        >
                                            {active && (
                                                <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-re-orange animate-pulse" />
                                            )}
                                            <div>
                                                <p className="text-[11px] font-black text-re-text uppercase tracking-tight truncate leading-tight">
                                                    {lesson.subject}
                                                </p>
                                                <p className="text-[9px] font-bold text-re-text-muted uppercase tracking-widest truncate mt-0.5">
                                                    {lessonClassDisplay(lesson)}
                                                </p>
                                                <span
                                                    className="mt-2 inline-flex items-center gap-1 text-[8px] font-black px-2 py-0.5 rounded-md uppercase tracking-tight"
                                                    style={{ backgroundColor: active ? '#fff7ed' : c.bg, color: active ? '#f97316' : c.border }}
                                                >
                                                    <Clock size={9} />
                                                    {lesson.day} · {lesson.time}
                                                </span>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-8 gap-2 px-4">
                                <div className="w-10 h-10 rounded-full bg-re-bg flex items-center justify-center mb-1">
                                    <Calendar size={18} className="text-re-text-muted opacity-40" />
                                </div>
                                <p className="text-[10px] font-black text-re-text-muted uppercase tracking-widest text-center">
                                    {periodScope === 'daily' ? 'No periods for this date' : 'No periods scheduled'}
                                </p>
                                <p className="text-[9px] font-bold text-re-text-muted text-center max-w-[280px] leading-relaxed">
                                    {periodScope === 'daily'
                                        ? `No timetable entries on ${dayNameForDate} (${selectedDate}). Try another date or switch to All periods.`
                                        : 'No timetable entries found. Contact your school admin if this looks wrong.'}
                                </p>
                                {periodScope === 'daily' && lessons.length > 0 && (
                                    <button
                                        type="button"
                                        onClick={() => setPeriodScope('all')}
                                        className="mt-1 text-[9px] font-black uppercase tracking-widest text-re-orange px-3 py-1.5 rounded-lg bg-re-orange/10"
                                    >
                                        Show all periods
                                    </button>
                                )}
                            </div>
                        )}
                    </div>


                    {/* Bulk Actions Section */}
                    {isClassSelected && (
                        <div className="lg:hidden px-4 py-2 border-b border-black/5 bg-white">
                            <button
                                onClick={() => setShowBulkActions(!showBulkActions)}
                                className="w-full flex justify-between items-center gap-2 text-[10px] font-black uppercase tracking-widest transition-all"
                            >
                                <div className="flex items-center gap-2">
                                    <List size={14} className="text-re-orange" /> bulk actions
                                </div>
                                {showBulkActions ? <ChevronUp size={14} className="text-re-orange" /> : <ChevronDown size={14} />}
                            </button>
                        </div>
                    )}

                    {/* Collapsible Mobile Bulk Actions Toolbar */}
                    <div
                        className={`px-4 py-3 bg-white border-b border-black/5 items-center justify-between overflow-x-auto gap-4 transition-all duration-300 animate-in slide-in-from-top-2 ${!isClassSelected
                            ? 'hidden'
                            : showBulkActions
                                ? 'flex'
                                : 'hidden lg:flex'
                            }`}
                    >
                        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-re-text-muted shrink-0">
                            <Filter size={12} /> Bulk Actions
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                            <button onClick={() => handleMarkAll('present')} className="px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors">Mark All Present</button>
                            <button onClick={() => handleMarkAll('absent')} className="px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest bg-red-50 text-red-600 hover:bg-red-100 transition-colors">Mark All Absent</button>
                            <button onClick={() => handleMarkAll('none')} className="px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest bg-gray-50 text-gray-600 hover:bg-gray-100 transition-colors">Clear All</button>
                        </div>
                    </div>

                    <div className={`${!isClassSelected ? 'hidden lg:block' : 'block'} bg-white overflow-x-auto lg:overflow-x-auto max-lg:overflow-x-hidden custom-scrollbar min-h-[120px]`}>
                        {isClassSelected && (
                            <div className="lg:hidden border-b border-black/5 bg-white">
                                <div className="px-4 pt-3 pb-2 flex items-center justify-between gap-2 border-b border-black/5">
                                    <div className="flex items-center gap-2 min-w-0">
                                        <div className="w-1.5 h-1.5 bg-re-orange rounded-full shrink-0" />
                                        <span className="text-[9px] font-black text-re-text uppercase tracking-widest truncate">
                                            {selectedLesson
                                                ? `${selectedLesson.subject} @ ${lessonClassDisplay(selectedLesson)}`
                                                : 'Attendance Record'}
                                        </span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setIsClassSelected(false);
                                            setSelectedLesson(null);
                                        }}
                                        className="text-[8px] font-black text-re-orange uppercase tracking-widest hover:underline shrink-0"
                                    >
                                        Change Period
                                    </button>
                                </div>
                                <div className="px-3 py-3 bg-gradient-to-b from-re-bg/40 to-white space-y-2">
                                    <p className="text-[9px] font-black uppercase tracking-[0.2em] text-re-text-muted text-center">
                                        Status legend — tap a matching icon per student
                                    </p>
                                    <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2.5">
                                        <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-emerald-700">
                                            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500 text-white shadow-sm shrink-0" aria-hidden><Check size={16} strokeWidth={3} /></span>
                                            Present
                                        </span>
                                        <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-red-600">
                                            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white border-2 border-red-500 text-red-600 shrink-0" aria-hidden><X size={16} strokeWidth={3} /></span>
                                            Absent
                                        </span>
                                        <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-orange-600">
                                            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white border-2 border-orange-500 text-orange-600 shrink-0" aria-hidden><Clock size={16} /></span>
                                            Late
                                        </span>
                                        <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-blue-600">
                                            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white border-2 border-blue-500 text-blue-600 shrink-0" aria-hidden><FileText size={15} /></span>
                                            Excused
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )}
                        <table className="w-full text-left border-collapse table-fixed max-lg:w-full lg:min-w-[720px]">
                            <thead>
                                <tr>
                                    <th className="border-b border-r border-black/5 bg-re-bg/50 px-1.5 sm:px-2 py-3 text-center text-[7px] sm:text-[9px] font-black uppercase tracking-widest text-re-text-muted w-[2.25rem] sm:w-12">#</th>
                                    <th className="border-b border-r border-black/5 bg-re-bg/50 px-2 sm:px-4 py-3 text-left text-[7px] sm:text-[9px] font-black uppercase tracking-widest text-re-text-muted w-24 hidden sm:table-cell">Roll No</th>
                                    <th className="border-b border-r border-black/5 bg-re-bg/50 px-2 sm:px-4 py-3 text-left text-[7px] sm:text-[9px] font-black uppercase tracking-widest text-re-text-muted max-lg:w-[38%] lg:w-auto">Student</th>
                                    <th className="border-b border-black/5 bg-re-bg/50 px-2 sm:px-4 py-3 text-center text-[7px] sm:text-[9px] font-black uppercase tracking-widest text-re-text-muted max-lg:w-[52%] lg:min-w-[280px]">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr>
                                        <td colSpan="4" className="p-12 text-center">
                                            <div className="w-8 h-8 border-4 border-re-orange border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                                            <p className="text-[10px] font-black text-re-text-muted uppercase tracking-widest">Fetching Central Registry...</p>
                                        </td>
                                    </tr>
                                ) : (
                                    <>
                                        {filteredRoster.map((student, idx) => (
                                            <tr
                                                key={student.id}
                                                className="hover:bg-re-bg/30 transition-colors"
                                            >
                                                <td className="border-r border-b border-black/5 px-2 py-3 text-center text-[10px] font-black text-gray-300">
                                                    {idx + 1}
                                                </td>
                                                <td className="border-r border-b border-black/5 px-2 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-widest hidden sm:table-cell">
                                                    {student.adm}
                                                </td>
                                                <td className="border-r border-b border-black/5 px-2 py-3 min-w-0 align-middle">
                                                    <div className="flex items-center gap-2 sm:gap-3 min-w-0 overflow-hidden">
                                                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-re-bg border border-black/5 flex-shrink-0 flex items-center justify-center text-re-text-muted transition-colors relative shadow-inner overflow-hidden group-hover:bg-white">
                                                        <User size={12} className="sm:w-3.5 sm:h-3.5 opacity-40 text-re-text-muted" />
                                                        <div className="absolute -bottom-1 -right-1 w-2.5 h-2.5 sm:w-3 h-3 bg-white border border-black/5 rounded-full flex items-center justify-center">
                                                            <div className="w-1 h-1 sm:w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
                                                        </div>
                                                    </div>
                                                    <div
                                                        className="flex-1 min-w-0 cursor-pointer"
                                                        onClick={() => setSelectedStudent(student)}
                                                        role="button"
                                                        tabIndex={0}
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter' || e.key === ' ') {
                                                                e.preventDefault();
                                                                setSelectedStudent(student);
                                                            }
                                                        }}
                                                    >
                                                        <h4 className="text-[11px] sm:text-xs font-black tracking-tight text-re-text truncate block">{student.name}</h4>
                                                        <p className="sm:hidden text-[9px] font-mono font-bold text-re-text-muted/90 truncate">{student.adm}</p>
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            <span className="text-[8px] sm:text-[9px] font-bold text-re-text-muted uppercase tracking-widest">{student.gender}</span>
                                                            {student.active_permission && (
                                                                <span className="text-[7px] px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded-md font-black uppercase tracking-tighter border border-blue-100 flex items-center gap-1">
                                                                    <FileText size={8} /> Excused
                                                                </span>
                                                            )}
                                                            <span className={`text-[7px] px-1.5 py-0.5 rounded-md font-black uppercase tracking-tighter ${student.residency_status === 'BOARDING' ? 'bg-orange-50 text-orange-600 border border-orange-100' : 'bg-gray-50 text-gray-400 border border-black/5'}`}>
                                                                {student.residency_status}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    </div>
                                                </td>
                                                <td className="border-b border-black/5 px-1.5 sm:px-3 py-2 sm:py-3 align-top">
                                                    <div className="flex flex-col gap-2 min-w-0">
                                                        <div className="grid grid-cols-4 gap-1 sm:flex sm:flex-wrap sm:items-center sm:justify-center sm:gap-2">
                                                            <StatusButton
                                                                active={student.status === 'present'}
                                                                onClick={() => handleStatusChange(student.id, 'present')}
                                                                baseColor="emerald"
                                                                icon={<Check size={14} className="sm:w-3 sm:h-3" />}
                                                                label="Present"
                                                            />
                                                            <StatusButton
                                                                active={student.status === 'absent'}
                                                                onClick={() => handleStatusChange(student.id, 'absent')}
                                                                baseColor="red"
                                                                icon={<X size={14} className="sm:w-3 sm:h-3" />}
                                                                label="Absent"
                                                            />
                                                            <StatusButton
                                                                active={student.status === 'late'}
                                                                onClick={() => handleStatusChange(student.id, 'late')}
                                                                baseColor="orange"
                                                                icon={<Clock size={14} className="sm:w-3 sm:h-3" />}
                                                                label="Late"
                                                            />
                                                            <StatusButton
                                                                active={student.status === 'permission'}
                                                                onClick={() => handleStatusChange(student.id, 'permission')}
                                                                baseColor="blue"
                                                                icon={<FileText size={13} className="sm:w-3 sm:h-3" />}
                                                                label="Excused"
                                                            />
                                                        </div>
                                                        <input
                                                            type="text"
                                                            value={student.remarks || ''}
                                                            onChange={(e) =>
                                                                setRoster((prev) =>
                                                                    prev.map((row) =>
                                                                        row.id === student.id ? { ...row, remarks: e.target.value } : row
                                                                    )
                                                                )
                                                            }
                                                            placeholder="Remarks"
                                                            className="w-full min-h-[36px] sm:h-8 rounded-lg border border-black/10 px-2 text-[10px] sm:text-[10px] placeholder:text-re-text-muted/50"
                                                        />
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                        {filteredRoster.length === 0 && roster.length > 0 && searchNorm && (
                                            <tr>
                                                <td colSpan="4" className="p-8 text-center text-sm font-bold text-re-text-muted">
                                                    No students match your search. Clear the search box to see the full class list.
                                                </td>
                                            </tr>
                                        )}
                                        {filteredRoster.length === 0 && roster.length === 0 && !loading && isClassSelected && (
                                            <tr>
                                                <td colSpan="4" className="p-8 text-center text-sm font-bold text-re-text-muted leading-relaxed max-w-md mx-auto">
                                                    No students were returned for class <span className="text-re-text">{selectedClass}</span>. Usually this means the class name on the timetable does not exactly match the class name on student records—ask your manager to align them—or there are no students enrolled in this class.
                                                </td>
                                            </tr>
                                        )}
                                    </>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Mobile Footer Area */}
                {isClassSelected && (
                    <div className="lg:hidden p-4 bg-re-bg/20 border-t border-black/5 flex flex-col gap-3">
                        <button
                            onClick={handleSave}
                            className="w-full h-12 bg-re-grad-orange text-white font-black text-[10px] uppercase tracking-[0.2em] rounded-2xl shadow-re-glow active:scale-95 transition-transform flex items-center justify-center gap-2.5"
                        >
                            <CheckSquare size={16} /> Save Records
                        </button>
                        <div className="text-[7px] font-black text-re-text-muted text-center uppercase tracking-widest opacity-40">
                            Confirming roll call for {selectedDate}
                        </div>
                    </div>
                )}

                <div className="mt-4 grid lg:grid-cols-2 gap-4">
                        <div className="bg-white border border-black/5 rounded-2xl p-4">
                            <h3 className="text-xs font-black uppercase tracking-widest text-re-text mb-3">Daily Attendance Summary</h3>
                            {dailySummary.length === 0 ? (
                                <p className="text-xs text-re-text-muted font-bold">No daily summary available.</p>
                            ) : (
                                <div className="space-y-2">
                                    {dailySummary.map((row, idx) => (
                                        <div key={`${row.class_name}-${row.subject_name}-${idx}`} className="p-3 rounded-xl bg-re-bg/40 border border-black/5">
                                            <p className="text-xs font-black text-re-text">{row.class_name} - {row.subject_name}</p>
                                            <p className="text-[11px] font-bold text-re-text-muted">
                                                Total {row.total_students} | Present {row.present_count} | Absent {row.absent_count} | Late {row.late_count} | Excused {row.excused_count}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        <div className="bg-white border border-black/5 rounded-2xl p-4">
                            <h3 className="text-xs font-black uppercase tracking-widest text-re-text mb-3">Weekly Attendance Snapshot</h3>
                            {!weeklySummary?.rows?.length ? (
                                <p className="text-xs text-re-text-muted font-bold">No weekly summary available.</p>
                            ) : (
                                <p className="text-[11px] text-re-text-muted font-bold">
                                    {weeklySummary.rows.length} records from {weeklySummary.start} to {weeklySummary.end}
                                </p>
                            )}
                        </div>
                    </div>
            </div>
            <>
                    {/* Mobile floating chart toggle */}
                    <button
                        type="button"
                        onClick={() => setShowMobileChartPanel((v) => !v)}
                        className="lg:hidden fixed bottom-24 right-4 z-[120] w-12 h-12 rounded-full bg-re-grad-orange text-white shadow-re-glow flex items-center justify-center"
                        aria-label="Toggle attendance charts"
                    >
                        <BarChart2 size={18} />
                    </button>

                    {/* Mobile chart panel */}
                    {showMobileChartPanel && (
                        <div className="lg:hidden fixed bottom-40 right-3 left-3 z-[120] bg-white border border-black/10 rounded-2xl shadow-2xl p-3 space-y-3">
                            <div className="flex items-center justify-between">
                                <h3 className="text-[10px] font-black uppercase tracking-widest text-re-text">Attendance Charts</h3>
                                <button
                                    type="button"
                                    onClick={() => setShowMobileChartPanel(false)}
                                    className="text-re-text-muted"
                                >
                                    <X size={14} />
                                </button>
                            </div>
                            <div className="text-[10px] font-bold text-re-text-muted">
                                Daily items: {dailySummary.length} · Weekly records: {weeklySummary?.rows?.length || 0}
                            </div>
                        </div>
                    )}
            </>

            {/* Student drawer modal */}
            {selectedStudentDetails && (
                <>
                    <div
                        className="fixed inset-0 z-[150] bg-black/15 backdrop-blur-[1px]"
                        onClick={() => setSelectedStudent(null)}
                    />
                    <div className="fixed inset-y-0 right-0 z-[151] w-full sm:max-w-md md:max-w-lg bg-white/98 shadow-2xl border-l border-black/10 overflow-y-auto rounded-l-3xl">
                        <div className="sticky top-0 z-10 bg-white/95 backdrop-blur border-b border-black/5 px-4 sm:px-5 py-4">
                            <div className="flex items-center justify-between">
                                <h3 className="text-sm font-black uppercase tracking-widest text-re-text">Student Attendance</h3>
                                <button onClick={() => setSelectedStudent(null)} className="text-re-text-muted hover:text-re-text transition-colors">
                                    <X size={16} />
                                </button>
                            </div>
                            <p className="text-[10px] font-bold text-re-text-muted mt-1 uppercase tracking-wider">Quick details and mark actions</p>
                        </div>
                        <div className="p-4 sm:p-5">
                            <div className="space-y-2 mb-4 bg-re-bg/40 border border-black/5 rounded-2xl p-3">
                                <p className="text-xs font-black text-re-text">{selectedStudentDetails.name}</p>
                                <p className="text-[10px] font-bold text-re-text-muted">ID: {selectedStudentDetails.adm}</p>
                                <p className="text-[10px] font-bold text-re-text-muted">Class: {selectedClass || '—'}</p>
                            </div>
                            <div className="space-y-2 mb-4">
                                <p className="text-[10px] font-black uppercase tracking-widest text-re-text-muted">Quick Mark</p>
                                <div className="grid grid-cols-2 gap-2">
                                    <button onClick={() => handleStatusChange(selectedStudentDetails.id, 'present')} className="h-10 rounded-xl text-[10px] font-black uppercase bg-emerald-50 text-emerald-700 border border-emerald-100">Present</button>
                                    <button onClick={() => handleStatusChange(selectedStudentDetails.id, 'absent')} className="h-10 rounded-xl text-[10px] font-black uppercase bg-red-50 text-red-700 border border-red-100">Absent</button>
                                    <button onClick={() => handleStatusChange(selectedStudentDetails.id, 'late')} className="h-10 rounded-xl text-[10px] font-black uppercase bg-orange-50 text-orange-700 border border-orange-100">Late</button>
                                    <button onClick={() => handleStatusChange(selectedStudentDetails.id, 'permission')} className="h-10 rounded-xl text-[10px] font-black uppercase bg-blue-50 text-blue-700 border border-blue-100">Excused</button>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <p className="text-[10px] font-black uppercase tracking-widest text-re-text-muted">Weekly History</p>
                                {!selectedStudentWeeklyRows.length ? (
                                    <p className="text-xs font-bold text-re-text-muted">No weekly history available.</p>
                                ) : (
                                    <div className="space-y-2">
                                        {selectedStudentWeeklyRows.map((row, idx) => (
                                            <div key={`${row.record_date}-${idx}`} className="p-2 rounded-lg bg-re-bg/40 border border-black/5">
                                                <p className="text-[11px] font-black text-re-text">{row.record_date}</p>
                                                <p className="text-[10px] font-bold text-re-text-muted">{row.status}</p>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <div className="mt-5 pt-3 border-t border-black/10 flex justify-end">
                                <button
                                    type="button"
                                    onClick={() => setSelectedStudent(null)}
                                    className="h-11 px-5 rounded-xl border border-black/15 text-re-text font-black text-[10px] uppercase tracking-widest hover:bg-re-bg w-full sm:w-auto"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}

// ── Helpers ────────────────────────────────────────────────────────

const StatusButton = ({ active, onClick, baseColor, icon, label }) => {

    const colors = {
        emerald: {
            active: 'bg-emerald-500 text-white ring-emerald-500/30 hover:bg-emerald-600 border-emerald-600',
            inactive: 'bg-white text-emerald-600 border-emerald-200 hover:bg-emerald-50 ring-black/5'
        },
        red: {
            active: 'bg-red-500 text-white ring-red-500/30 hover:bg-red-600 border-red-600',
            inactive: 'bg-white text-red-600 border-red-200 hover:bg-red-50 ring-black/5'
        },
        orange: {
            active: 'bg-orange-500 text-white ring-orange-500/30 hover:bg-orange-600 border-orange-600',
            inactive: 'bg-white text-orange-600 border-orange-200 hover:bg-orange-50 ring-black/5'
        },
        blue: {
            active: 'bg-blue-500 text-white ring-blue-500/30 hover:bg-blue-600 border-blue-600',
            inactive: 'bg-white text-blue-600 border-blue-200 hover:bg-blue-50 ring-black/5'
        }
    };

    const theme = colors[baseColor];

    return (
        <button
            type="button"
            onClick={onClick}
            title={label}
            aria-label={label}
            className={`
                flex items-center justify-center transition-all duration-200 ring-2 ring-transparent gap-0.5
                min-h-[42px] min-w-0 w-full sm:min-w-0 sm:w-auto h-9 sm:h-8 px-0 sm:px-2 rounded-xl sm:rounded-lg border-2 sm:border text-[7px] sm:text-[8px] font-black uppercase tracking-tighter sm:tracking-widest
                max-lg:aspect-square max-lg:max-h-[44px] max-lg:max-w-[44px] max-lg:mx-auto
                ${active ? theme.active + ' shadow-md sm:scale-[1.02]' : theme.inactive}
            `}
        >
            {icon}
            <span className="hidden lg:inline">{label}</span>
        </button>
    );
};

const UserFallback = ({ gender }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 opacity-40">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
        <circle cx="12" cy="7" r="4"></circle>
    </svg>
);
