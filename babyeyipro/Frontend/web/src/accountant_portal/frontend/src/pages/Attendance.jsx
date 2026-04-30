import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { PORTAL } from '../config/portal';
import {
    Calendar, Users, CheckCircle, XCircle, Clock,
    FileText, Search, ChevronDown, Check, X, Filter, CheckSquare, List,
    ChevronUp, User, Lock, AlertCircle,
} from 'lucide-react';

const READ_ONLY = !!PORTAL.attendanceReadOnly;

export default function Attendance() {
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [selectedClass, setSelectedClass] = useState(null);
    const [selectedLesson, setSelectedLesson] = useState(null);
    const [lessons, setLessons] = useState([]);
    const [isClassSelected, setIsClassSelected] = useState(false);
    const [showMobileFilters, setShowMobileFilters] = useState(false);
    const [showBulkActions, setShowBulkActions] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(false);
    const [roster, setRoster] = useState([]);
    /** Saved roll from academic_attendance_logs for this period/date (read-only oversight). */
    const [rollMeta, setRollMeta] = useState({ logId: null, recordCount: 0 });

    const getDayName = (dateStr) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', { weekday: 'long' });
    };

    useEffect(() => {
        fetchLessons();
        setSelectedLesson(null);
        setIsClassSelected(false);
        setSelectedClass(null);
    }, [selectedDate]);

    const fetchLessons = async () => {
        setLoading(true);
        try {
            const day = getDayName(selectedDate);
            const res = await api.get('/teacher-portal/timetable', { params: { day } });
            if (res.data.success) {
                setLessons(res.data.data || []);
            }
        } catch (err) {
            console.error('Failed to fetch lessons:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchRoster = useCallback(async () => {
        if (!selectedClass || !selectedLesson) return;
        setLoading(true);
        try {
            const res = await api.get('/teacher-portal/students', {
                params: { class_name: selectedClass, date: selectedDate },
            });
            if (!res.data.success) {
                setRoster([]);
                setRollMeta({ logId: null, recordCount: 0 });
                return;
            }

            const base = res.data.data.map((s) => ({
                id: s.row_id,
                adm: s.id,
                name: s.name,
                gender: s.gender === 'Male' ? 'M' : 'F',
                status: s.active_permission ? 'permission' : READ_ONLY ? 'unset' : 'present',
                active_permission: s.active_permission,
                residency_status: s.residency_status || 'DAY',
            }));

            const attRes = await api.get('/teacher-portal/attendance', {
                params: { timetable_id: selectedLesson.id, date: selectedDate },
            });

            const payload = attRes.data?.data;
            const logId = payload?.log_id ?? null;
            const records = payload?.records || [];
            const byStudent = new Map(records.map((r) => [r.student_id, r.status]));

            const merged = base.map((st) => {
                const saved = byStudent.get(st.id);
                if (saved !== undefined) {
                    return { ...st, status: saved };
                }
                if (READ_ONLY) {
                    return { ...st, status: st.active_permission ? 'permission' : 'unset' };
                }
                return { ...st, status: st.active_permission ? 'permission' : 'present' };
            });

            setRoster(merged);
            setRollMeta({ logId, recordCount: records.length });
        } catch (err) {
            console.error('Failed to fetch roster:', err);
            setRoster([]);
            setRollMeta({ logId: null, recordCount: 0 });
        } finally {
            setLoading(false);
        }
    }, [selectedClass, selectedLesson, selectedDate]);

    useEffect(() => {
        if (selectedClass && selectedLesson) {
            fetchRoster();
        }
    }, [selectedClass, selectedLesson, selectedDate, fetchRoster]);

    const handleSave = async () => {
        if (READ_ONLY) return;
        if (!selectedLesson) return alert('Select a period / class block first.');

        try {
            setLoading(true);
            const records = roster.map((s) => ({ student_id: s.id, status: s.status }));
            const res = await api.post('/teacher-portal/attendance', {
                records,
                date: selectedDate,
                timetable_id: selectedLesson.id,
            });
            if (res.data.success) {
                alert(`Attendance successfully marked for ${selectedLesson.subject} (${selectedLesson.group})!`);
                fetchRoster();
            }
        } catch (err) {
            console.error(err);
            const msg = err.response?.data?.message || 'Failed to save attendance.';
            alert(msg);
        } finally {
            setLoading(false);
        }
    };

    const handleStatusChange = (id, newStatus) => {
        if (READ_ONLY) return;
        setRoster((prev) =>
            prev.map((student) => (student.id === id ? { ...student, status: newStatus } : student))
        );
    };

    const handleMarkAll = (status) => {
        if (READ_ONLY) return;
        setRoster((prev) => prev.map((student) => ({ ...student, status })));
    };

    const filteredRoster = roster.filter(
        (s) =>
            s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            String(s.adm).toLowerCase().includes(searchQuery.toLowerCase())
    );

    const stats = {
        total: roster.length,
        present: roster.filter((s) => s.status === 'present').length,
        absent: roster.filter((s) => s.status === 'absent').length,
        late: roster.filter((s) => s.status === 'late').length,
        permission: roster.filter((s) => s.status === 'permission').length,
        unset: roster.filter((s) => s.status === 'unset').length,
    };

    const attendanceRate =
        stats.total > 0 ? Math.round((stats.present / stats.total) * 100) : 0;

    const statItems = READ_ONLY
        ? [
              { label: 'On class list', value: stats.total, icon: <Users size={12} /> },
              { label: 'Present (saved)', value: stats.present, icon: <CheckCircle size={12} /> },
              { label: 'Absent', value: stats.absent, icon: <XCircle size={12} /> },
              { label: 'Late / excused', value: stats.late + stats.permission, icon: <Clock size={12} /> },
              { label: 'Not on roll', value: stats.unset, icon: <AlertCircle size={12} /> },
          ]
        : [
              { label: 'Total Scoped', value: stats.total, icon: <Users size={12} /> },
              { label: 'Present Ratio', value: `${attendanceRate}%`, icon: <CheckCircle size={12} /> },
              { label: 'Missing Registry', value: stats.absent, icon: <XCircle size={12} /> },
              { label: 'Late/Excused', value: stats.late + stats.permission, icon: <Clock size={12} /> },
          ];

    return (
        <div className="animate-in fade-in duration-700 bg-re-bg min-h-screen pb-12">
            <div className="relative w-full min-h-[300px] overflow-hidden">
                <div className="absolute inset-0  bg-orange-950/70 z-10 backdrop-blur-[2px]"></div>
                <img src={PORTAL.heroImage} alt="" className="absolute inset-0 w-full h-full object-cover scale-105 opacity-100" />
                <div className="absolute inset-0 bg-gradient-to-r from-transparent to-transparent z-[5]"></div>

                <div className="relative z-20 max-w-[1600px] mx-auto px-6 md:px-12 pt-16 pb-24">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                            <span className="w-6 h-1 bg-re-orange rounded-full"></span>
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/80">
                                Attendance oversight
                            </span>
                            {READ_ONLY && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-white">
                                    <Lock size={10} /> Read-only
                                </span>
                            )}
                        </div>
                        <h1 className="text-2xl md:text-5xl font-black text-white tracking-tight">
                            {READ_ONLY ? 'Attendance (oversight)' : 'Attendance (shared school data)'}
                        </h1>
                        <p className="text-[10px] md:text-sm text-white/70 font-bold max-w-xl leading-relaxed">
                            {READ_ONLY
                                ? 'View the period roll teachers have saved, plus approved leave. You cannot submit attendance — this is enforced in the API for Head of discipline.'
                                : 'Periods and class groups come from the same academic setup teachers use.'}
                        </p>
                    </div>
                </div>
            </div>

            <div className="relative z-30 max-w-[1600px] mx-auto px-2 md:px-6 -mt-16">
                <div className="bg-white rounded-t-[2.5rem] shadow-2xl border border-black/5 overflow-hidden flex flex-col">
                    <div className="px-4 md:px-8 pt-6 pb-2 border-b border-black/5 bg-amber-50/50">
                        <p className="text-[9px] font-black uppercase tracking-widest text-amber-900/80 mb-2">
                            {READ_ONLY ? 'How this connects to school data' : 'Why this matches the teacher portal'}
                        </p>
                        <p className="text-[11px] md:text-xs font-bold text-amber-950/95 leading-relaxed max-w-4xl">
                            {PORTAL.copy?.attendanceExplainer}
                        </p>
                        <Link
                            to="/permissions"
                            className="inline-block mt-3 text-[10px] font-black uppercase tracking-widest text-amber-900 underline underline-offset-2"
                        >
                            Open student permissions (excused / leave windows) →
                        </Link>
                    </div>

                    <div
                        className={`${!isClassSelected ? 'hidden lg:grid' : 'grid'} grid-cols-2 ${READ_ONLY ? 'lg:grid-cols-5' : 'lg:grid-cols-4'} divide-x divide-y lg:divide-y-0 divide-black/5 border-b border-black/5`}
                    >
                        {statItems.map((s, i) => (
                            <div
                                key={s.label}
                                className="p-4 sm:p-8 flex flex-col items-center justify-center text-center group hover:bg-re-bg/20 transition-all"
                            >
                                <div className="text-re-orange opacity-40 mb-1.5 sm:mb-2">{s.icon}</div>
                                <div className="text-sm sm:text-2xl font-black text-re-text tracking-tighter group-hover:text-re-orange">
                                    {s.value}
                                </div>
                                <div className="text-[6px] sm:text-[8px] font-black text-re-text-muted uppercase tracking-[0.2em] mt-0.5 opacity-60">
                                    {s.label}
                                </div>
                            </div>
                        ))}
                    </div>

                    {READ_ONLY && isClassSelected && selectedLesson && (
                        <div className="px-4 md:px-8 py-3 border-b border-black/5 bg-re-bg/30 flex flex-wrap items-center gap-3 text-[10px] font-bold text-re-text-muted">
                            <span className="font-black uppercase tracking-widest text-re-text">Saved roll</span>
                            {rollMeta.logId ? (
                                <span className="rounded-full bg-emerald-50 text-emerald-800 px-2 py-0.5 font-black uppercase tracking-tighter">
                                    On file ({rollMeta.recordCount} learners)
                                </span>
                            ) : (
                                <span className="rounded-full bg-white text-[#000435] px-2 py-0.5 font-black uppercase tracking-tighter">
                                    No teacher roll saved for this date &amp; period yet
                                </span>
                            )}
                        </div>
                    )}

                    <div
                        className={`${!isClassSelected ? 'hidden lg:flex' : 'flex'} px-4 py-3 border-b border-black/5 flex-col lg:flex-row items-center justify-between gap-3 bg-re-bg/10`}
                    >
                        <div className="flex items-center gap-3 w-full lg:w-auto">
                            <div className="relative hidden lg:block flex-1 lg:w-64 group">
                                <Users size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-re-text-muted transition-colors" />
                                <select
                                    value={selectedLesson?.id || ''}
                                    onChange={(e) => {
                                        const lesson = lessons.find((l) => l.id.toString() === e.target.value);
                                        if (lesson) {
                                            setSelectedLesson(lesson);
                                            setSelectedClass(lesson.group);
                                            setIsClassSelected(true);
                                        }
                                    }}
                                    className="w-full pl-9 pr-8 h-10 bg-white border border-black/5 rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-widest text-re-text appearance-none focus:outline-none focus:border-re-orange/20 shadow-sm"
                                >
                                    <option value="">Select period / class block</option>
                                    {lessons.map((lesson) => (
                                        <option key={lesson.id} value={lesson.id}>
                                            {lesson.subject} - {lesson.group} ({lesson.time})
                                        </option>
                                    ))}
                                </select>
                                <ChevronDown
                                    size={14}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-re-text-muted pointer-events-none"
                                />
                            </div>

                            <button
                                onClick={() => setShowMobileFilters(!showMobileFilters)}
                                className={`lg:hidden w-full  flex justify-between items-center gap-2 text-[10px] font-black uppercase tracking-widest transition-all `}
                            >
                                <div className="flex items-center gap-2">
                                    <Filter size={14} className="text-re-orange" /> show filters
                                </div>
                                {showMobileFilters ? <ChevronUp size={14} className="text-re-orange" /> : <ChevronDown size={14} />}
                            </button>
                        </div>

                        <div
                            className={`${showMobileFilters ? 'flex' : 'hidden lg:flex'} flex-col lg:flex-row items-center gap-3 w-full lg:w-auto animate-in slide-in-from-top-2 duration-300`}
                        >
                            <div className="relative w-full lg:w-48">
                                <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-re-text-muted" />
                                <input
                                    type="date"
                                    value={selectedDate}
                                    onChange={(e) => setSelectedDate(e.target.value)}
                                    className="w-full pl-9 pr-4 h-10 bg-white border border-black/5 rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-widest text-re-text focus:outline-none focus:border-re-orange/20"
                                />
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

                            {!READ_ONLY && (
                                <button
                                    onClick={handleSave}
                                    className="hidden lg:flex h-10 px-6 bg-re-grad-orange text-white font-black text-[9px] uppercase tracking-widest rounded-xl hover:shadow-re-glow transition-all items-center gap-2 active:scale-95"
                                >
                                    <CheckSquare size={14} /> Save records
                                </button>
                            )}
                        </div>
                    </div>

                    {!isClassSelected && (
                        <div className="lg:hidden p-6 bg-re-bg/20 flex flex-col items-center justify-center text-center py-12 animate-in fade-in zoom-in-95 duration-500">
                            <div className="w-16 h-16 bg-white rounded-[2rem] shadow-xl flex items-center justify-center text-re-orange mb-6 border border-black/5 animate-bounce">
                                <CheckSquare size={32} />
                            </div>
                            <h2 className="text-xl font-black text-re-text tracking-tighter uppercase mb-2">Select a period</h2>
                            <p className="text-[10px] text-re-text-muted font-bold uppercase tracking-widest leading-relaxed mb-8 max-w-[260px]">
                                Pick a period for {getDayName(selectedDate)} to load the class list and{' '}
                                {READ_ONLY ? 'the saved roll (if any).' : 'record attendance.'}
                            </p>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-lg">
                                {lessons.length > 0 ? (
                                    lessons.map((lesson) => (
                                        <button
                                            key={lesson.id}
                                            onClick={() => {
                                                setSelectedClass(lesson.group);
                                                setSelectedLesson(lesson);
                                                setIsClassSelected(true);
                                            }}
                                            className="h-20 flex items-center justify-between bg-white border border-black/5 rounded-2xl shadow-sm hover:border-re-orange/30 hover:bg-re-orange/5 transition-all group active:scale-95 px-5"
                                        >
                                            <div className="flex flex-col items-start gap-1">
                                                <span className="text-[10px] font-black text-re-text group-hover:text-re-orange uppercase">
                                                    {lesson.subject}
                                                </span>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[8px] font-bold text-re-text px-1.5 py-0.5 bg-re-bg rounded uppercase opacity-60 tracking-tighter">
                                                        {lesson.group}
                                                    </span>
                                                    <span className="text-[8px] font-medium text-re-text-muted uppercase tracking-widest">
                                                        {lesson.time}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="w-8 h-8 rounded-full bg-re-bg flex items-center justify-center text-re-orange group-hover:bg-re-orange group-hover:text-white transition-colors">
                                                <ChevronDown size={14} className="-rotate-90" />
                                            </div>
                                        </button>
                                    ))
                                ) : (
                                    <div className="col-span-2 py-8 bg-white/50 rounded-2xl border border-dashed border-black/10">
                                        <p className="text-[10px] font-black text-re-text-muted uppercase tracking-widest">
                                            No periods found for {getDayName(selectedDate)}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {isClassSelected && !READ_ONLY && (
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

                    {!READ_ONLY && (
                        <div
                            className={`${
                                isClassSelected && (showBulkActions ? 'flex' : 'hidden lg:flex')
                            } px-4 py-3 bg-white border-b border-black/5 items-center justify-between overflow-x-auto gap-4 transition-all duration-300 animate-in slide-in-from-top-2`}
                        >
                            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-re-text-muted shrink-0">
                                <Filter size={12} /> Bulk Actions
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                                <button
                                    onClick={() => handleMarkAll('present')}
                                    className="px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors"
                                >
                                    Mark All Present
                                </button>
                                <button
                                    onClick={() => handleMarkAll('absent')}
                                    className="px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                                >
                                    Mark All Absent
                                </button>
                                <button
                                    onClick={() => handleMarkAll('present')}
                                    className="px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest bg-gray-50 text-[#000435] hover:bg-gray-100 transition-colors"
                                >
                                    Reset to present
                                </button>
                            </div>
                        </div>
                    )}

                    <div className={`${!isClassSelected ? 'hidden lg:block' : 'block'} bg-white overflow-x-auto custom-scrollbar`}>
                        {isClassSelected && (
                            <div className="lg:hidden px-6 py-3 bg-white border-b border-black/5 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 bg-re-orange rounded-full"></div>
                                    <span className="text-[9px] font-black text-re-text uppercase tracking-widest">
                                        {selectedLesson
                                            ? `${selectedLesson.subject} @ ${selectedLesson.group}`
                                            : 'Attendance Record'}
                                    </span>
                                </div>
                                <button
                                    onClick={() => {
                                        setIsClassSelected(false);
                                        setSelectedLesson(null);
                                        setSelectedClass(null);
                                    }}
                                    className="text-[8px] font-black text-re-orange uppercase tracking-widest hover:underline"
                                >
                                    Change Period
                                </button>
                            </div>
                        )}
                        <table className="w-full text-left border-collapse min-w-full sm:min-w-[800px]">
                            <thead>
                                <tr>
                                    <th className="border-b border-r border-black/5 bg-re-bg/50 px-2 py-3 text-center text-[7px] sm:text-[9px] font-black uppercase tracking-widest text-re-text-muted w-8 sm:w-12">
                                        #
                                    </th>
                                    <th className="border-b border-r border-black/5 bg-re-bg/50 px-4 py-3 text-left text-[7px] sm:text-[9px] font-black uppercase tracking-widest text-re-text-muted w-24 hidden sm:table-cell">
                                        Roll No
                                    </th>
                                    <th className="border-b border-r border-black/5 bg-re-bg/50 px-4 py-3 text-left text-[7px] sm:text-[9px] font-black uppercase tracking-widest text-re-text-muted">
                                        Student Details
                                    </th>
                                    <th className="border-b border-black/5 bg-re-bg/50 px-4 py-3 text-center text-[7px] sm:text-[9px] font-black uppercase tracking-widest text-re-text-muted w-[180px] sm:w-[280px]">
                                        {READ_ONLY ? 'Recorded status' : 'Status'}
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr>
                                        <td colSpan="4" className="p-12 text-center">
                                            <div className="w-8 h-8 border-4 border-re-orange border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                                            <p className="text-[10px] font-black text-re-text-muted uppercase tracking-widest">
                                                Loading class &amp; roll…
                                            </p>
                                        </td>
                                    </tr>
                                ) : (
                                    <>
                                        {filteredRoster.map((student, idx) => (
                                            <tr key={student.id} className="hover:bg-re-bg/30 transition-colors">
                                                <td className="border-r border-b border-black/5 px-2 py-3 text-center text-[10px] font-black text-[#000435]">
                                                    {idx + 1}
                                                </td>
                                                <td className="border-r border-b border-black/5 px-2 py-3 text-[10px] font-bold text-[#000435] uppercase tracking-widest hidden sm:table-cell">
                                                    {student.adm}
                                                </td>
                                                <td className="border-r border-b border-black/5 px-2 py-3 flex items-center gap-2 sm:gap-3 min-w-0 overflow-hidden">
                                                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-re-bg border border-black/5 flex-shrink-0 flex items-center justify-center text-re-text-muted transition-colors relative shadow-inner overflow-hidden group-hover:bg-white">
                                                        <User size={12} className="sm:w-3.5 sm:h-3.5 opacity-40 text-re-text-muted" />
                                                        <div className="absolute -bottom-1 -right-1 w-2.5 h-2.5 sm:w-3 h-3 bg-white border border-black/5 rounded-full flex items-center justify-center">
                                                            <div className="w-1 h-1 sm:w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
                                                        </div>
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <h4 className="text-[11px] sm:text-xs font-black tracking-tight text-re-text truncate block">
                                                            {student.name}
                                                        </h4>
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            <span className="text-[8px] sm:text-[9px] font-bold text-re-text-muted uppercase tracking-widest">
                                                                {student.gender}
                                                            </span>
                                                            {student.active_permission && (
                                                                <span className="text-[7px] px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded-md font-black uppercase tracking-tighter border border-blue-100 flex items-center gap-1">
                                                                    <FileText size={8} /> Leave approved
                                                                </span>
                                                            )}
                                                            <span
                                                                className={`text-[7px] px-1.5 py-0.5 rounded-md font-black uppercase tracking-tighter ${
                                                                    student.residency_status === 'BOARDING'
                                                                        ? 'bg-orange-50 text-orange-600 border border-orange-100'
                                                                        : 'bg-gray-50 text-[#000435] border border-black/5'
                                                                }`}
                                                            >
                                                                {student.residency_status}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="border-b border-black/5 px-2 py-3">
                                                    {READ_ONLY ? (
                                                        <OversightStatusPill status={student.status} />
                                                    ) : (
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
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                        {filteredRoster.length === 0 && (
                                            <tr>
                                                <td colSpan="4" className="p-8 text-center text-sm font-bold text-re-text-muted">
                                                    No students match your search.
                                                </td>
                                            </tr>
                                        )}
                                    </>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {isClassSelected && !READ_ONLY && (
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
            </div>
        </div>
    );
}

function OversightStatusPill({ status }) {
    const map = {
        present: { label: 'Present', className: 'bg-emerald-50 text-emerald-800 ring-emerald-200' },
        absent: { label: 'Absent', className: 'bg-red-50 text-red-800 ring-red-200' },
        late: { label: 'Late', className: 'bg-orange-50 text-orange-900 ring-orange-200' },
        permission: { label: 'Excused', className: 'bg-blue-50 text-blue-800 ring-blue-200' },
        unset: { label: 'Not on roll', className: 'bg-white text-[#000435] ring-slate-200' },
    };
    const m = map[status] || map.unset;
    return (
        <div className="flex justify-center">
            <span
                className={`inline-flex items-center rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-wider ring-1 ${m.className}`}
            >
                {m.label}
            </span>
        </div>
    );
}

const StatusButton = ({ active, onClick, baseColor, icon, label }) => {
    const colors = {
        emerald: {
            active: 'bg-emerald-500 text-white ring-emerald-500/30 hover:bg-emerald-600',
            inactive: 'bg-white text-emerald-600 border-black/5 hover:bg-emerald-50 ring-black/5',
        },
        red: {
            active: 'bg-red-500 text-white ring-red-500/30 hover:bg-red-600',
            inactive: 'bg-white text-red-600 border-black/5 hover:bg-red-50 ring-black/5',
        },
        orange: {
            active: 'bg-orange-500 text-white ring-orange-500/30 hover:bg-orange-600',
            inactive: 'bg-white text-orange-600 border-black/5 hover:bg-orange-50 ring-black/5',
        },
        blue: {
            active: 'bg-blue-500 text-white ring-blue-500/30 hover:bg-blue-600',
            inactive: 'bg-white text-blue-600 border-black/5 hover:bg-blue-50 ring-black/5',
        },
    };

    const theme = colors[baseColor];

    return (
        <button
            type="button"
            onClick={onClick}
            title={label}
            className={`
                flex items-center justify-center transition-all duration-200 ring-2 ring-transparent gap-1
                h-7 w-7 sm:w-auto sm:h-8 px-1.5 sm:px-2 rounded-full xl:rounded-lg border text-[8px] font-black uppercase tracking-widest
                ${active ? theme.active + ' shadow-md scale-[1.02]' : theme.inactive}
            `}
        >
            {icon}
            <span className="hidden xl:inline">{label}</span>
        </button>
    );
};
