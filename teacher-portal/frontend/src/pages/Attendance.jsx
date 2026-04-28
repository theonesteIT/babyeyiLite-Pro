import React, { useState, useEffect } from 'react';
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
    const [attendanceMode, setAttendanceMode] = useState('student');
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
    const [selectedStudents, setSelectedStudents] = useState([]);
    const [dailySummary, setDailySummary] = useState([]);
    const [weeklySummary, setWeeklySummary] = useState(null);
    const [teacherAttendanceStatus, setTeacherAttendanceStatus] = useState('Present');
    const [teacherAttendanceRemarks, setTeacherAttendanceRemarks] = useState('');
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [showMobileChartPanel, setShowMobileChartPanel] = useState(false);

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
    const periodOptions = selectedClassFilter
        ? lessons.filter((l) => rosterClassForLesson(l) === selectedClassFilter)
        : lessons;

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
        if (selectedClass && selectedLesson) {
            fetchRosterAndSaved();
        }
    }, [selectedClass, selectedLesson?.id, selectedDate]);

    useEffect(() => {
        if (attendanceMode !== 'student') return;
        fetchDailySummary();
        fetchWeeklySummary();
    }, [attendanceMode, selectedDate, selectedClass]);

    useEffect(() => {
        if (attendanceMode !== 'teacher') return;
        fetchTeacherAttendance();
    }, [attendanceMode, selectedDate]);

    const fetchLessons = async () => {
        setLoading(true);
        try {
            const res = await api.get('/teacher-portal/timetable');
            setLessons(res.data?.success ? (res.data.data || []) : []);
        } catch (err) {
            console.error('Failed to fetch lessons:', err);
            setLessons([]);
        } finally {
            setLoading(false);
        }
    };

    const fetchRosterAndSaved = async () => {
        if (!selectedClass || !selectedLesson) return;
        setLoading(true);
        try {
            const className = normalizeGradebookLabel(selectedClass);
            const res = await api.get('/teacher-portal/students', {
                params: { class_name: className, date: selectedDate },
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

    const fetchTeacherAttendance = async () => {
        try {
            const res = await api.get('/teacher-portal/teacher-attendance', { params: { date: selectedDate } });
            if (res.data?.success && res.data.data) {
                setTeacherAttendanceStatus(res.data.data.status || 'Present');
                setTeacherAttendanceRemarks(res.data.data.remarks || '');
            } else {
                setTeacherAttendanceStatus('Present');
                setTeacherAttendanceRemarks('');
            }
        } catch (err) {
            console.error('Failed to load teacher attendance', err);
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
        setRoster((prev) =>
            prev.map((student) => {
                if (selectedStudents.length && !selectedStudents.includes(student.id)) return student;
                return { ...student, status: resolved };
            })
        );
    };

    const toggleStudentSelect = (id) => {
        setSelectedStudents((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
    };

    const toggleSelectAll = () => {
        if (selectedStudents.length === filteredRoster.length) {
            setSelectedStudents([]);
        } else {
            setSelectedStudents(filteredRoster.map((s) => s.id));
        }
    };

    const handleTeacherAttendanceSave = async () => {
        try {
            setLoading(true);
            const res = await api.post('/teacher-portal/teacher-attendance', {
                date: selectedDate,
                status: teacherAttendanceStatus,
                remarks: teacherAttendanceRemarks,
            });
            if (res.data?.success) {
                alert('Teacher attendance saved.');
            }
        } catch (err) {
            console.error(err);
            alert('Failed to save teacher attendance');
        } finally {
            setLoading(false);
        }
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
        <div className="animate-in fade-in duration-700 bg-white md:bg-re-bg min-h-screen pt-0">

            {/* ── High-Fidelity Hero Section ── */}
            <div className="hidden md:block relative w-full min-h-[300px] overflow-hidden">
                <div className="absolute inset-0  bg-orange-950/70 z-10 backdrop-blur-[2px]"></div>
                {/* Fallback pattern */}
                <img src="/teacher.jpg" alt="Hero" className="absolute inset-0 w-full h-full object-cover scale-105 opacity-100" />
                <div className="absolute inset-0 bg-gradient-to-r from-transparent to-transparent z-[5]"></div>

                <div className="relative z-20 max-w-[1600px] mx-auto px-6 md:px-12 pt-16 pb-24">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="w-6 h-1 bg-re-orange rounded-full"></span>
                            <span className="text-[10px] font-bold text-white/80">Roll Call Module</span>
                        </div>
                        <h1 className="text-2xl md:text-5xl font-bold text-white leading-none">
                            Daily Attendance
                        </h1>
                        <p className="text-[10px] md:text-sm text-white/70 font-medium max-w-xl leading-relaxed">
                            Log attendance and manage behavioral records precisely. Use fast toggles to mark students absent, late, or excused.
                        </p>
                    </div>

                </div>
            </div>

            {/* ── Main Content Area ── */}
            <div className="relative z-30 max-w-[1600px] mx-auto px-0 md:px-6 mt-0 md:-mt-16 pb-10 md:pb-20">
                <div className="hidden md:flex mb-3 bg-white md:bg-white/80 md:backdrop-blur-sm md:border border-black/5 md:rounded-2xl p-2 gap-2 w-full md:w-fit">
                    <button
                        type="button"
                        onClick={() => setAttendanceMode('student')}
                        className={`px-4 h-10 rounded-xl text-[10px] font-bold ${
                            attendanceMode === 'student' ? 'bg-re-grad-orange text-white' : 'bg-re-bg text-re-text-muted'
                        }`}
                    >
                        Student Attendance
                    </button>
                    <button
                        type="button"
                        onClick={() => setAttendanceMode('teacher')}
                        className={`px-4 h-10 rounded-xl text-[10px] font-bold ${
                            attendanceMode === 'teacher' ? 'bg-re-grad-orange text-white' : 'bg-re-bg text-re-text-muted'
                        }`}
                    >
                        Teacher Attendance
                    </button>
                </div>

                <div className={`${attendanceMode === 'teacher' ? 'hidden' : 'flex'} bg-white md:rounded-t-[2.5rem] md:shadow-2xl md:border md:border-black/5 overflow-hidden flex flex-col min-h-[calc(100vh-120px)] md:min-h-0`}>

                    {/* Mobile: date always visible (header row is hidden on small screens until a period is chosen) */}
                    <div className="lg:hidden px-6 py-4 border-b border-black/5 bg-white flex flex-col gap-3">
                        <div className="flex items-center gap-3">
                            <button
                                type="button"
                                onClick={() => shiftDateByDays(-1)}
                                className="shrink-0 h-10 w-10 flex items-center justify-center rounded-xl border border-black/5 bg-re-bg text-re-orange active:scale-95 transition-all"
                                aria-label="Previous day"
                            >
                                <ChevronLeft size={18} />
                            </button>
                            <div className="relative flex-1 min-w-0">
                                <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-re-text-muted/40 pointer-events-none z-10" />
                                <input
                                    type="date"
                                    value={selectedDate}
                                    onChange={(e) => setSelectedDate(e.target.value)}
                                    className="w-full pl-9 pr-3 h-10 bg-re-bg border border-black/5 rounded-xl text-[11px] font-bold text-re-text focus:outline-none focus:border-re-orange/30 transition-all"
                                />
                            </div>
                            <button
                                type="button"
                                onClick={() => shiftDateByDays(1)}
                                className="shrink-0 h-10 w-10 flex items-center justify-center rounded-xl border border-black/5 bg-re-bg text-re-orange active:scale-95 transition-all"
                                aria-label="Next day"
                            >
                                <ChevronRight size={18} />
                            </button>
                        </div>
                    </div>

                    {/* Integrated Stats Grid (Students-Style) */}
                    <div className="hidden lg:grid grid-cols-2 lg:grid-cols-4 divide-x divide-y lg:divide-y-0 divide-black/5 border-b border-black/5">
                        {[
                            { label: 'Total Scoped', value: stats.total, icon: <Users size={12} /> },
                            { label: 'Present Ratio', value: `${attendanceRate}%`, icon: <CheckCircle size={12} /> },
                            { label: 'Missing Registry', value: stats.absent, icon: <XCircle size={12} /> },
                            { label: 'Late/Excused', value: stats.late + stats.permission, icon: <Clock size={12} /> }
                        ].map((s, i) => (
                            <div key={i} className="p-4 sm:p-8 flex flex-col items-center justify-center text-center group hover:bg-re-bg/20 transition-all">
                                <div className="text-re-orange opacity-40 mb-1.5 sm:mb-2">{s.icon}</div>
                                <div className="text-sm sm:text-2xl font-bold text-re-text group-hover:text-re-orange">{s.value}</div>
                                <div className="text-[10px] font-bold text-re-text-muted mt-0.5 opacity-60">{s.label}</div>
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

                            {isClassSelected && roster.length > 0 && (
                                <button
                                    onClick={() => setShowMobileFilters(!showMobileFilters)}
                                    className="lg:hidden w-full flex justify-between items-center gap-2 text-[10px] font-bold transition-all"
                                >
                                    <div className="flex items-center gap-2">
                                        <Filter size={14} className="text-re-orange" /> show filters
                                    </div>
                                    {showMobileFilters ? <ChevronUp size={14} className="text-re-orange" /> : <ChevronDown size={14} />}
                                </button>
                            )}
                        </div>

                        <div className={`${(isClassSelected && showMobileFilters) ? 'flex' : 'hidden lg:flex'} flex-col lg:flex-row lg:flex-nowrap lg:items-center gap-3 lg:gap-2 w-full lg:flex-1 lg:min-w-0 animate-in slide-in-from-top-2 duration-300`}>
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
                                        className={`${teacherInnerSearchCls} !pl-9 font-bold`}
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
                                className="hidden lg:inline-flex h-8 px-3 bg-re-grad-orange text-white text-nowrap font-bold text-[11px] rounded-lg hover:shadow-re-glow transition-all items-center gap-1 active:scale-95"
                            >
                                <CheckSquare size={12} /> Save records
                            </button>
                        </div>
                    </div>

                    {/* Mobile: period selection list */}
                    {!isClassSelected && (
                        <div className="lg:hidden bg-white animate-in fade-in zoom-in-95 duration-500 pb-10">
                            <div className="px-6 py-4 flex items-center justify-between">
                                <h3 className="text-sm font-bold text-re-text">Select Period</h3>
                                <p className="text-[10px] font-medium text-re-text-muted">{getDayName(selectedDate)}</p>
                            </div>
                            <div className="flex flex-col">
                                {periodOptions.length > 0 ? (
                                    periodOptions.map((lesson, i) => (
                                        <button
                                            key={lesson.id}
                                            onClick={() => selectLesson(lesson)}
                                            className={`flex items-center gap-4 px-6 py-4 hover:bg-re-bg active:bg-re-bg transition-all group ${i !== 0 ? 'border-t border-black/5' : ''}`}
                                        >
                                            <div className="w-10 h-10 rounded-xl bg-re-grad-orange text-white flex items-center justify-center shadow-re-glow shrink-0">
                                                <Calendar size={18} />
                                            </div>
                                            <div className="flex-1 text-left">
                                                <span className="text-[11px] font-bold text-re-text uppercase tracking-tight block">{lesson.subject}</span>
                                                <p className="text-[9px] text-re-text-muted font-bold opacity-40 italic mt-0.5">
                                                    {lessonClassDisplay(lesson)} · {lesson.time}
                                                </p>
                                            </div>
                                            <ChevronRight size={16} className="text-re-text-muted/40 group-hover:text-re-orange group-hover:translate-x-1 transition-all" />
                                        </button>
                                    ))
                                ) : (
                                    <div className="p-12 text-center">
                                        <p className="text-[10px] font-bold text-re-text-muted italic opacity-40 leading-relaxed">
                                            No periods found for this date. Change the date above to try another day.
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Bulk Actions Section */}
                    {isClassSelected && roster.length > 0 && (
                        <div className="lg:hidden px-4 py-2 border-b border-black/5 bg-white">
                            <button
                                onClick={() => setShowBulkActions(!showBulkActions)}
                                className="w-full flex justify-between items-center gap-2 text-[10px] font-bold transition-all"
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
                        className={`px-4 py-3 bg-white border-b border-black/5 items-center justify-between overflow-x-auto gap-4 transition-all duration-300 animate-in slide-in-from-top-2 ${
                            (!isClassSelected || roster.length === 0)
                                ? 'hidden'
                                : showBulkActions
                                    ? 'flex'
                                    : 'hidden lg:flex'
                        }`}
                    >
                        <div className="flex items-center gap-2 text-[10px] font-bold text-re-text-muted shrink-0">
                            <Filter size={12} /> Bulk Actions
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                            <button onClick={() => handleMarkAll('present')} className="px-3 py-1.5 rounded-lg text-[10px] font-bold bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors">Mark All Present</button>
                            <button onClick={() => handleMarkAll('absent')} className="px-3 py-1.5 rounded-lg text-[10px] font-bold bg-red-50 text-red-600 hover:bg-red-100 transition-colors">Mark All Absent</button>
                            <button onClick={() => handleMarkAll('none')} className="px-3 py-1.5 rounded-lg text-[10px] font-bold bg-gray-50 text-gray-600 hover:bg-gray-100 transition-colors">Clear All</button>
                        </div>
                    </div>

                    <div className={`${!isClassSelected ? 'hidden lg:block' : 'block'} bg-white overflow-x-auto custom-scrollbar min-h-[120px]`}>
                        {isClassSelected && (
                            <>
                                <div className="lg:hidden px-6 py-3 bg-white border-b border-black/5 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 bg-re-orange rounded-full"></div>
                                        <span className="text-[11px] font-bold text-re-text">
                                            {selectedLesson.subject} @ {lessonClassDisplay(selectedLesson)}
                                        </span>
                                    </div>
                                    <button
                                        onClick={() => {
                                            setIsClassSelected(false);
                                            setSelectedLesson(null);
                                        }}
                                        className="text-[11px] font-bold text-re-orange hover:underline"
                                    >
                                        Change Period
                                    </button>
                                </div>

                                {/* Mobile Persistent Toolbar */}
                                {isClassSelected && roster.length > 0 && (
                                    <div className="lg:hidden px-6 py-3 bg-re-bg/40 border-b border-black/5 flex items-center gap-3 w-full">
                                        <div className="relative flex-1 group">
                                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-re-text-muted/40 group-focus-within:text-re-orange transition-colors pointer-events-none" />
                                            <input
                                                type="text"
                                                placeholder="Search student..."
                                                value={searchQuery}
                                                onChange={(e) => setSearchQuery(e.target.value)}
                                                className={`${teacherInnerSearchCls} !pl-9`}
                                            />
                                        </div>
                                        <div className="h-4 w-px bg-black/10"></div>
                                        <button 
                                            onClick={handleSave}
                                            className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-600 whitespace-nowrap active:scale-95 transition-all"
                                        >
                                            <CheckSquare size={14} /> Save
                                        </button>
                                    </div>
                                )}
                            </>
                        )}
                        {isClassSelected && roster.length > 0 && (
                            <table className="w-full text-left border-collapse min-w-full sm:min-w-[800px]">
                                <thead>
                                    <tr>
                                        <th className="border-b border-r border-black/5 bg-re-bg/50 px-2 py-3 text-center">
                                            <input
                                                type="checkbox"
                                                checked={filteredRoster.length > 0 && selectedStudents.length === filteredRoster.length}
                                                onChange={toggleSelectAll}
                                            />
                                        </th>
                                        <th className="border-b border-r border-black/5 bg-re-bg/50 px-2 py-3 text-center text-[10px] font-medium text-re-text-muted w-8 sm:w-12">#</th>
                                        <th className="border-b border-r border-black/5 bg-re-bg/50 px-4 py-3 text-left text-[10px] font-medium text-re-text-muted w-24 hidden sm:table-cell">Roll No</th>
                                        <th className="border-b border-r border-black/5 bg-re-bg/50 px-4 py-3 text-left text-[10px] font-medium text-re-text-muted">Student Details</th>
                                        <th className="border-b border-black/5 bg-re-bg/50 px-4 py-3 text-center text-[10px] font-medium text-re-text-muted w-[180px] sm:w-[280px]">Status</th>
                                    </tr>
                                </thead>
                            <tbody>
                                {loading ? (
                                    <tr>
                                        <td colSpan="5" className="p-12 text-center">
                                            <div className="w-8 h-8 border-4 border-re-orange border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                                            <p className="text-[10px] font-bold text-re-text-muted">Fetching Central Registry...</p>
                                        </td>
                                    </tr>
                                ) : (
                                    <>
                                        {filteredRoster.map((student, idx) => (
                                            <tr
                                                key={student.id}
                                                className="hover:bg-re-bg/30 transition-colors"
                                            >
                                                <td className="border-r border-b border-black/5 px-2 py-3 text-center">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedStudents.includes(student.id)}
                                                        onChange={() => toggleStudentSelect(student.id)}
                                                        onClick={(e) => e.stopPropagation()}
                                                    />
                                                </td>
                                                <td className="border-r border-b border-black/5 px-2 py-3 text-center text-[10px] font-bold text-gray-300">
                                                    {idx + 1}
                                                </td>
                                                <td className="border-r border-b border-black/5 px-2 py-3 text-[10px] font-bold text-gray-500 italic hidden sm:table-cell">
                                                    {student.adm}
                                                </td>
                                                <td className="border-r border-b border-black/5 px-2 py-3 flex items-center gap-2 sm:gap-3 min-w-0 overflow-hidden">
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
                                                        <h4 className="text-[11px] sm:text-xs font-bold text-re-text truncate block">{student.name}</h4>
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-[10px] font-medium text-re-text-muted">{student.gender}</span>
                                                            {student.active_permission && (
                                                                <span className="text-[10px] px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded-md font-medium border border-blue-100 flex items-center gap-1">
                                                                    <FileText size={8} /> Excused
                                                                </span>
                                                            )}
                                                            <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-medium ${student.residency_status === 'BOARDING' ? 'bg-orange-50 text-orange-600 border border-orange-100' : 'bg-gray-50 text-gray-400 border border-black/5'}`}>
                                                                {student.residency_status}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="border-b border-black/5 px-2 py-3">
                                                    <div className="flex flex-col gap-2">
                                                        <div className="flex items-center justify-center gap-2">
                                                        <StatusButton
                                                            active={student.status === 'present'}
                                                            onClick={() => handleStatusChange(student.id, 'present')}
                                                            baseColor="emerald"
                                                            icon={<Check size={12} />}
                                                            label="Present"
                                                        />
                                                        <StatusButton
                                                            active={student.status === 'absent'}
                                                            onClick={() => handleStatusChange(student.id, 'absent')}
                                                            baseColor="red"
                                                            icon={<X size={12} />}
                                                            label="Absent"
                                                        />
                                                        <StatusButton
                                                            active={student.status === 'late'}
                                                            onClick={() => handleStatusChange(student.id, 'late')}
                                                            baseColor="orange"
                                                            icon={<Clock size={12} />}
                                                            label="Late"
                                                        />
                                                        <StatusButton
                                                            active={student.status === 'permission'}
                                                            onClick={() => handleStatusChange(student.id, 'permission')}
                                                            baseColor="blue"
                                                            icon={<FileText size={12} />}
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
                                                            placeholder="Remarks (optional)"
                                                            className="w-full h-8 rounded-lg border border-black/10 px-2 text-[10px]"
                                                        />
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                        {filteredRoster.length === 0 && roster.length > 0 && searchNorm && (
                                            <tr>
                                                <td colSpan="5" className="p-8 text-center text-sm font-bold text-re-text-muted">
                                                    No students match your search. Clear the search box to see the full class list.
                                                </td>
                                            </tr>
                                        )}
                                    </>
                                )}
                            </tbody>
                        </table>
                    )}

                        {isClassSelected && roster.length === 0 && !loading && (
                            <div className="flex flex-col items-center justify-center py-20 px-6 text-center animate-in fade-in zoom-in-95 duration-700">
                                <div className="relative mb-8">
                                    <div className="absolute inset-0 bg-re-orange/10 rounded-full blur-3xl scale-150"></div>
                                    <img 
                                        src="no_student_found.png" 
                                        alt="Empty Registry" 
                                        className="w-48 h-48 md:w-64 md:h-64 object-contain relative z-10"
                                    />
                                </div>
                                <h3 className="text-base font-bold text-re-text mb-2">Registry Unavailable</h3>
                                <p className="text-[11px] font-medium text-re-text-muted leading-relaxed max-w-sm">
                                    No students were returned for <span className="text-re-orange font-bold">{selectedClass}</span>. 
                                    This usually means student records are being synced or there are no enrollments for this period.
                                </p>
                                <button
                                    onClick={() => setIsClassSelected(false)}
                                    className="mt-6 px-6 h-10 rounded-xl bg-re-bg border border-black/5 text-[11px] font-bold text-re-orange hover:bg-re-orange/5 transition-all"
                                >
                                    Try Another Period
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Mobile Footer Area */}
                {isClassSelected && roster.length > 0 && (
                    <div className="lg:hidden p-4 bg-re-bg/20 border-t border-black/5 flex flex-col gap-3">
                        <button
                            onClick={handleSave}
                            className="w-full h-12 bg-re-grad-orange text-white font-bold text-[11px] rounded-2xl shadow-re-glow active:scale-95 transition-transform flex items-center justify-center gap-2.5"
                        >
                            <CheckSquare size={16} /> Save Records
                        </button>
                        <div className="text-[10px] font-bold text-re-text-muted text-center opacity-40">
                            Confirming roll call for {selectedDate}
                        </div>
                    </div>
                )}

                {attendanceMode === 'teacher' && (
                    <div className="hidden lg:block bg-white rounded-[2rem] shadow-2xl border border-black/5 overflow-hidden p-6 space-y-4">
                        <h3 className="text-sm font-bold   text-re-text">Teacher Attendance</h3>
                        <div className="grid md:grid-cols-3 gap-3">
                            <input
                                type="date"
                                value={selectedDate}
                                onChange={(e) => setSelectedDate(e.target.value)}
                                className="h-11 px-3 rounded-xl border border-black/10 text-xs font-bold"
                            />
                            <select
                                value={teacherAttendanceStatus}
                                onChange={(e) => setTeacherAttendanceStatus(e.target.value)}
                                className="h-11 px-3 rounded-xl border border-black/10 text-xs font-bold"
                            >
                                <option>Present</option>
                                <option>Absent</option>
                                <option>Late</option>
                                <option>Excused</option>
                            </select>
                            <button
                                type="button"
                                onClick={handleTeacherAttendanceSave}
                                className="h-11 bg-re-grad-orange text-white font-bold text-[10px]   rounded-xl"
                            >
                                Save Teacher Attendance
                            </button>
                        </div>
                        <textarea
                            value={teacherAttendanceRemarks}
                            onChange={(e) => setTeacherAttendanceRemarks(e.target.value)}
                            placeholder="Remarks (optional)"
                            className="w-full min-h-[90px] rounded-xl border border-black/10 p-3 text-sm"
                        />
                    </div>
                )}

                {attendanceMode === 'student' && (
                    <div className="mt-4 hidden lg:grid lg:grid-cols-2 gap-4">
                        <div className="bg-white border border-black/5 rounded-2xl p-4">
                            <h3 className="text-xs font-bold   text-re-text mb-3">Daily Attendance Summary</h3>
                            {dailySummary.length === 0 ? (
                                <p className="text-xs text-re-text-muted font-bold">No daily summary available.</p>
                            ) : (
                                <div className="space-y-2">
                                    {dailySummary.map((row, idx) => (
                                        <div key={`${row.class_name}-${row.subject_name}-${idx}`} className="p-3 rounded-xl bg-re-bg/40 border border-black/5">
                                            <p className="text-xs font-bold text-re-text">{row.class_name} - {row.subject_name}</p>
                                            <p className="text-[11px] font-bold text-re-text-muted">
                                                Total {row.total_students} | Present {row.present_count} | Absent {row.absent_count} | Late {row.late_count} | Excused {row.excused_count}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        <div className="bg-white border border-black/5 rounded-2xl p-4">
                            <h3 className="text-xs font-bold   text-re-text mb-3">Weekly Attendance Snapshot</h3>
                            {!weeklySummary?.rows?.length ? (
                                <p className="text-xs text-re-text-muted font-bold">No weekly summary available.</p>
                            ) : (
                                <p className="text-[11px] text-re-text-muted font-bold">
                                    {weeklySummary.rows.length} records from {weeklySummary.start} to {weeklySummary.end}
                                </p>
                            )}
                        </div>
                    </div>
                )}
            </div>
                {attendanceMode === 'student' && (
                    <>
                        {/* Mobile floating chart toggle */}


                        {/* Mobile chart panel */}
                        {showMobileChartPanel && (
                            <div className="lg:hidden fixed bottom-40 right-3 left-3 z-[120] bg-white border border-black/10 rounded-2xl shadow-2xl p-3 space-y-3">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-[10px] font-bold   text-re-text">Attendance Charts</h3>
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
                )}

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
                                    <h3 className="text-sm font-bold   text-re-text">Student Attendance</h3>
                                    <button onClick={() => setSelectedStudent(null)} className="text-re-text-muted hover:text-re-text transition-colors">
                                        <X size={16} />
                                    </button>
                                </div>
                                <p className="text-[10px] font-bold text-re-text-muted mt-1  tracking-wider">Quick details and mark actions</p>
                            </div>
                            <div className="p-4 sm:p-5">
                            <div className="space-y-2 mb-4 bg-re-bg/40 border border-black/5 rounded-2xl p-3">
                                <p className="text-xs font-bold text-re-text">{selectedStudentDetails.name}</p>
                                <p className="text-[10px] font-bold text-re-text-muted">ID: {selectedStudentDetails.adm}</p>
                                <p className="text-[10px] font-bold text-re-text-muted">Class: {selectedClass || '—'}</p>
                            </div>
                            <div className="space-y-2 mb-4">
                                <p className="text-[10px] font-bold   text-re-text-muted">Quick Mark</p>
                                <div className="grid grid-cols-2 gap-2">
                                    <button onClick={() => handleStatusChange(selectedStudentDetails.id, 'present')} className="h-10 rounded-xl text-[10px] font-bold  bg-emerald-50 text-emerald-700 border border-emerald-100">Present</button>
                                    <button onClick={() => handleStatusChange(selectedStudentDetails.id, 'absent')} className="h-10 rounded-xl text-[10px] font-bold  bg-red-50 text-red-700 border border-red-100">Absent</button>
                                    <button onClick={() => handleStatusChange(selectedStudentDetails.id, 'late')} className="h-10 rounded-xl text-[10px] font-bold  bg-orange-50 text-orange-700 border border-orange-100">Late</button>
                                    <button onClick={() => handleStatusChange(selectedStudentDetails.id, 'permission')} className="h-10 rounded-xl text-[10px] font-bold  bg-blue-50 text-blue-700 border border-blue-100">Excused</button>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <p className="text-[10px] font-bold   text-re-text-muted">Weekly History</p>
                                {!selectedStudentWeeklyRows.length ? (
                                    <p className="text-xs font-bold text-re-text-muted">No weekly history available.</p>
                                ) : (
                                    <div className="space-y-2">
                                        {selectedStudentWeeklyRows.map((row, idx) => (
                                            <div key={`${row.record_date}-${idx}`} className="p-2 rounded-lg bg-re-bg/40 border border-black/5">
                                                <p className="text-[11px] font-bold text-re-text">{row.record_date}</p>
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
                                    className="h-11 px-5 rounded-xl border border-black/15 text-re-text font-bold text-[10px]   hover:bg-re-bg w-full sm:w-auto"
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

const StatusButton = ({ active, onClick, baseColor, icon, label, isMobile }) => {

    const colors = {
        emerald: {
            active: 'bg-emerald-500 text-white ring-emerald-500/30 hover:bg-emerald-600',
            inactive: 'bg-white text-emerald-600 border-black/5 hover:bg-emerald-50 ring-black/5'
        },
        red: {
            active: 'bg-red-500 text-white ring-red-500/30 hover:bg-red-600',
            inactive: 'bg-white text-red-600 border-black/5 hover:bg-red-50 ring-black/5'
        },
        orange: {
            active: 'bg-orange-500 text-white ring-orange-500/30 hover:bg-orange-600',
            inactive: 'bg-white text-orange-600 border-black/5 hover:bg-orange-50 ring-black/5'
        },
        blue: {
            active: 'bg-blue-500 text-white ring-blue-500/30 hover:bg-blue-600',
            inactive: 'bg-white text-blue-600 border-black/5 hover:bg-blue-50 ring-black/5'
        }
    };

    const theme = colors[baseColor];

    return (
        <button
            onClick={onClick}
            title={label}
            className={`
                flex items-center justify-center transition-all duration-200 ring-2 ring-transparent gap-1
                h-7 w-7 sm:w-auto sm:h-8 px-1.5 sm:px-2 rounded-full xl:rounded-lg border text-[8px] font-medium  
                ${active ? theme.active + ' shadow-md scale-[1.02]' : theme.inactive}
            `}
        >
            {icon}
            <span className="hidden xl:inline">{label}</span>
        </button>
    );
};

const UserFallback = ({ gender }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 opacity-40">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
        <circle cx="12" cy="7" r="4"></circle>
    </svg>
);
