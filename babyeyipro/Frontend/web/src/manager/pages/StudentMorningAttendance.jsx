import React, { useState, useEffect, useMemo } from 'react';
import api from '../services/api';
import {
    Sun, Search, Users, CheckCircle, XCircle, Clock,
    ChevronDown, Check, X, Filter, CheckSquare,
    ChevronUp, User, BookOpen, RefreshCw, Save, Calendar, TrendingUp
} from 'lucide-react';
import { useAcademic } from '../context/AcademicContext';
import { calcTermProgress, attendanceRate, rateColor } from '../utils/termProgress';

export default function StudentMorningAttendance() {
    const academic = useAcademic();
    const [selectedDate, setSelectedDate]     = useState(new Date().toISOString().split('T')[0]);
    const [selectedClass, setSelectedClass]   = useState('');
    const [classes, setClasses]               = useState([]);
    const [students, setStudents]             = useState([]);
    const [totals, setTotals]                 = useState({ total: 0, onTime: 0, late: 0, absent: 0 });
    const [loading, setLoading]               = useState(false);
    const [saving, setSaving]                 = useState(false);
    const [saved, setSaved]                   = useState(false);
    const [error, setError]                   = useState(null);
    const [searchQuery, setSearchQuery]       = useState('');
    const [showFilters, setShowFilters]       = useState(false);
    // Term progress from backend
    const [termProgress, setTermProgress]     = useState(null);

    // Load term progress when academic context is ready
    useEffect(() => {
        if (academic.currentTerm) loadTermProgress();
    }, [academic.currentTerm]);

    const loadTermProgress = async () => {
        try {
            const res = await api.get('/dos/attendance/term-progress', { params: { term: academic.currentTerm } });
            if (res.data.success) setTermProgress(res.data.data);
        } catch (_) {}
    };

    useEffect(() => { loadClasses(); }, []);
    useEffect(() => { loadStudents(); }, [selectedDate, selectedClass]);

    const loadClasses = async () => {
        try {
            const res = await api.get('/dos/attendance/morning/students', {
                params: { date: new Date().toISOString().split('T')[0] },
            });
            if (res.data.success) setClasses(res.data.data.classes || []);
        } catch (_) {}
    };

    const loadStudents = async () => {
        setLoading(true);
        setError(null);
        setSaved(false);
        try {
            const params = { date: selectedDate };
            if (selectedClass) params.class_name = selectedClass;
            const res = await api.get('/dos/attendance/morning/students', { params });
            if (!res.data.success) { setError(res.data.message || 'Failed to load'); return; }
            const { students: rows, totals: t, classes: cls } = res.data.data;
            if (cls?.length) setClasses(cls);
            setStudents((rows || []).map(s => ({
                ...s,
                status_in: s.status_in || 'Absent',
            })));
            setTotals(t || { total: 0, onTime: 0, late: 0, absent: 0 });
        } catch (e) {
            setError(e.response?.data?.message || e.message || 'Could not load students');
        } finally {
            setLoading(false);
        }
    };

    const handleStatus = (studentId, status) => {
        setStudents(prev => prev.map(s => s.student_id === studentId ? { ...s, status_in: status } : s));
    };

    const markAll = (status) => setStudents(prev => prev.map(s => ({ ...s, status_in: status })));

    const handleSave = async () => {
        if (students.length === 0) return;
        setSaving(true);
        setError(null);
        try {
            const records = students.map(s => ({ student_id: s.student_id, status_in: s.status_in }));
            const res = await api.post('/dos/attendance/morning/students', { date: selectedDate, records });
            if (res.data.success) {
                setSaved(true);
                const onTime  = students.filter(s => s.status_in === 'On time').length;
                const late    = students.filter(s => s.status_in === 'Late').length;
                const absent  = students.filter(s => s.status_in === 'Absent').length;
                setTotals({ total: students.length, onTime, late, absent });
                setTimeout(() => setSaved(false), 3000);
            } else {
                setError(res.data.message || 'Save failed');
            }
        } catch (e) {
            setError(e.response?.data?.message || e.message || 'Save failed');
        } finally {
            setSaving(false);
        }
    };

    const filtered = useMemo(() =>
        students.filter(s =>
            s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (s.student_uid || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            (s.class_name  || '').toLowerCase().includes(searchQuery.toLowerCase())
        ),
        [students, searchQuery]
    );

    const attendanceRate = totals.total > 0
        ? Math.round(((totals.onTime + totals.late) / totals.total) * 100)
        : 0;

    return (
        <div className="animate-in fade-in duration-700 bg-re-bg min-h-screen pb-16">

            {/* ── Hero ── */}
            <div className="relative w-full min-h-[260px] overflow-hidden bg-gradient-to-br from-[#0b3d6b] via-[#1E3A5F] to-[#0a2644]">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(254,191,16,0.12),transparent_60%)] pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-[#FEBF10]/30 to-transparent pointer-events-none" />

                <div className="relative z-20 max-w-[1600px] mx-auto px-6 md:px-12 pt-14 pb-20">
                    <div className="flex items-center gap-5">
                        <div className="hidden md:flex shrink-0 w-20 h-20 rounded-[24px] border border-white/10 bg-white/5 items-center justify-center backdrop-blur-xl shadow-sm">
                            <Sun size={36} className="text-[#FEBF10]" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2 mb-2">
                                <span className="w-5 h-0.5 bg-[#FEBF10] rounded-full" />
                                <span className="text-[9px] font-semibold uppercase tracking-[0.3em] text-[#FEBF10]">Morning Roll Call</span>
                            </div>
                            <h1 className="text-2xl md:text-3xl font-semibold text-white tracking-tight leading-none" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                                Student <span className="text-[#FEBF10]">Morning</span> Attendance
                            </h1>
                            <p className="text-[10px] md:text-xs text-white/50 font-bold uppercase tracking-widest mt-2">
                                Daily morning check-in · mark On Time, Late or Absent for each student
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Content card ── */}
            <div className="relative z-30 max-w-[1600px] mx-auto px-2 md:px-6 -mt-14">
                <div className="bg-white rounded-t-[2.5rem] shadow-sm border border-black/10 overflow-hidden">

                    {/* ── Term Progress Banner ── */}
                    <TermProgressBanner
                        termProgress={termProgress}
                        todayOnTime={totals.onTime}
                        todayLate={totals.late}
                        currentTerm={academic.currentTerm}
                        termCfg={academic.getTermDates(academic.currentTerm)}
                        selectedDate={selectedDate}
                    />

                    {/* Stats row */}
                    <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-y md:divide-y-0 divide-black/5 border-b border-black/5">
                        {[
                            { label: 'Total Students', value: totals.total,    icon: <Users size={13} />,       color: 'text-slate-500' },
                            { label: 'Attendance Rate', value: `${attendanceRate}%`, icon: <CheckCircle size={13} />, color: 'text-emerald-500' },
                            { label: 'Late Arrivals',  value: totals.late,     icon: <Clock size={13} />,        color: 'text-amber-500' },
                            { label: 'Absent',         value: totals.absent,   icon: <XCircle size={13} />,      color: 'text-red-500' },
                        ].map((s, i) => (
                            <div key={i} className="p-4 sm:p-6 flex flex-col items-center justify-center text-center group hover:bg-slate-50 transition-all">
                                <div className={`${s.color} opacity-50 mb-1`}>{s.icon}</div>
                                <div className="text-lg sm:text-2xl font-semibold text-slate-800 tracking-tighter group-hover:text-[#1E3A5F]">{s.value}</div>
                                <div className="text-[8px] font-semibold text-slate-400 uppercase tracking-[0.18em] mt-0.5">{s.label}</div>
                            </div>
                        ))}
                    </div>

                    {/* Toolbar */}
                    <div className="px-4 py-3 border-b border-black/5 bg-slate-50/60 flex flex-col lg:flex-row items-center gap-3">

                        {/* Date */}
                        <div className="relative w-full lg:w-44">
                            <Sun size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="date"
                                value={selectedDate}
                                onChange={e => setSelectedDate(e.target.value)}
                                className="w-full pl-9 pr-3 h-10 bg-white border border-black/8 rounded-xl text-[11px] font-semibold text-slate-700 focus:outline-none focus:border-[#1E3A5F]/30 shadow-sm"
                            />
                        </div>

                        {/* Class filter */}
                        <div className="relative w-full lg:w-52">
                            <BookOpen size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <select
                                value={selectedClass}
                                onChange={e => setSelectedClass(e.target.value)}
                                className="w-full pl-9 pr-8 h-10 bg-white border border-black/8 rounded-xl text-[11px] font-semibold text-slate-700 appearance-none focus:outline-none focus:border-[#1E3A5F]/30 shadow-sm"
                            >
                                <option value="">All Classes</option>
                                {classes.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                            <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        </div>

                        {/* Search */}
                        <div className="relative flex-1 w-full">
                            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search student or admission no..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="w-full pl-9 pr-4 h-10 bg-white border border-black/8 rounded-xl text-[11px] font-bold text-slate-700 focus:outline-none focus:border-[#1E3A5F]/30 shadow-sm"
                            />
                        </div>

                        {/* Bulk actions */}
                        <div className="flex items-center gap-2 shrink-0">
                            <button onClick={() => markAll('On time')} className="h-10 px-3 bg-emerald-50 text-emerald-700 text-[9px] font-semibold uppercase tracking-wider rounded-xl border border-emerald-100 hover:bg-emerald-100 transition-colors">All On Time</button>
                            <button onClick={() => markAll('Absent')}  className="h-10 px-3 bg-red-50 text-red-600 text-[9px] font-semibold uppercase tracking-wider rounded-xl border border-red-100 hover:bg-red-100 transition-colors">All Absent</button>
                        </div>

                        {/* Refresh */}
                        <button
                            onClick={loadStudents}
                            disabled={loading}
                            className="h-10 w-10 flex items-center justify-center bg-white border border-black/8 rounded-xl text-slate-500 hover:bg-slate-100 transition-colors shrink-0"
                        >
                            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                        </button>

                        {/* Save */}
                        <button
                            onClick={handleSave}
                            disabled={saving || students.length === 0}
                            className={`h-10 px-5 flex items-center gap-2 rounded-xl text-[9px] font-semibold uppercase tracking-widest shadow transition-all shrink-0
                                ${saved ? 'bg-emerald-500 text-white' : 'bg-[#1E3A5F] text-white hover:bg-[#0d2644] active:scale-95'}`}
                        >
                            {saving ? <RefreshCw size={13} className="animate-spin" /> : saved ? <Check size={13} /> : <Save size={13} />}
                            {saving ? 'Saving…' : saved ? 'Saved!' : 'Save Records'}
                        </button>
                    </div>

                    {error && (
                        <div className="px-6 py-3 bg-red-50 border-b border-red-100 text-red-700 text-xs font-bold">{error}</div>
                    )}

                    {/* Table */}
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse min-w-[680px]">
                            <thead>
                                <tr className="bg-slate-50 border-b border-black/5">
                                    <th className="px-3 py-3 text-[8px] font-semibold text-slate-400 uppercase tracking-[0.2em] w-10 text-center border-r border-black/5">#</th>
                                    <th className="px-4 py-3 text-[8px] font-semibold text-slate-400 uppercase tracking-[0.2em] border-r border-black/5">Student</th>
                                    <th className="hidden sm:table-cell px-4 py-3 text-[8px] font-semibold text-slate-400 uppercase tracking-[0.2em] border-r border-black/5">Class</th>
                                    <th className="px-4 py-3 text-[8px] font-semibold text-slate-400 uppercase tracking-[0.2em] text-center">Morning Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr>
                                        <td colSpan={4} className="py-16 text-center">
                                            <RefreshCw className="animate-spin inline text-[#1E3A5F] mb-2" size={22} />
                                            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mt-2">Loading students…</p>
                                        </td>
                                    </tr>
                                ) : filtered.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="py-16 text-center">
                                            <Users size={28} className="inline text-slate-300 mb-3" />
                                            <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">No students found</p>
                                        </td>
                                    </tr>
                                ) : filtered.map((s, idx) => (
                                    <tr key={s.student_id} className="hover:bg-slate-50/80 transition-colors border-b border-black/4 group">
                                        <td className="px-3 py-3 text-center text-[10px] font-semibold text-slate-300 border-r border-black/5">{idx + 1}</td>
                                        <td className="px-4 py-3 border-r border-black/5">
                                            <div className="flex items-center gap-2.5">
                                                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 border border-black/5 flex items-center justify-center shrink-0 shadow-inner">
                                                    <User size={13} className="text-slate-400" />
                                                </div>
                                                <div>
                                                    <p className="text-[11px] font-semibold text-slate-800 group-hover:text-[#1E3A5F] transition-colors">{s.name}</p>
                                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">{s.student_uid || '—'}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="hidden sm:table-cell px-4 py-3 border-r border-black/5">
                                            <span className="text-[10px] font-semibold text-slate-600 uppercase tracking-wider bg-slate-100 px-2.5 py-1 rounded-lg">{s.class_name || '—'}</span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center justify-center gap-1.5">
                                                <MorningBtn
                                                    active={s.status_in === 'On time'}
                                                    onClick={() => handleStatus(s.student_id, 'On time')}
                                                    color="emerald"
                                                    icon={<Check size={12} />}
                                                    label="On Time"
                                                />
                                                <MorningBtn
                                                    active={s.status_in === 'Late'}
                                                    onClick={() => handleStatus(s.student_id, 'Late')}
                                                    color="amber"
                                                    icon={<Clock size={12} />}
                                                    label="Late"
                                                />
                                                <MorningBtn
                                                    active={s.status_in === 'Absent'}
                                                    onClick={() => handleStatus(s.student_id, 'Absent')}
                                                    color="red"
                                                    icon={<X size={12} />}
                                                    label="Absent"
                                                />
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Footer */}
                    <div className="px-6 py-4 bg-slate-50/60 border-t border-black/5 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-[#FEBF10] animate-pulse" />
                            <span className="text-[8px] font-semibold text-slate-400 uppercase tracking-[0.2em]">
                                Morning roll call · {selectedDate} {selectedClass ? `· ${selectedClass}` : '· All classes'}
                            </span>
                        </div>
                        <span className="text-[8px] font-semibold text-slate-400 uppercase tracking-widest">{filtered.length} shown</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ── Term Progress Banner ─────────────────────────────────────────────────────
function TermProgressBanner({ termProgress, todayOnTime, todayLate, currentTerm, termCfg, selectedDate }) {
    // Use frontend calc if backend data not yet loaded
    const progress = useMemo(() => {
        if (termProgress?.configured) return termProgress;
        return calcTermProgress(termCfg, selectedDate);
    }, [termProgress, termCfg, selectedDate]);

    const presentToday    = (todayOnTime || 0) + (todayLate || 0);
    const backendRate     = termProgress?.student?.attendancePct;
    const displayRate     = backendRate != null ? backendRate : attendanceRate(presentToday, progress.elapsedWorkingDays);
    const colors          = rateColor(displayRate);

    if (!progress.configured && !termCfg) {
        return (
            <div className="px-6 py-3 bg-amber-50 border-b border-amber-100 flex items-center gap-3">
                <Calendar size={14} className="text-amber-500 shrink-0" />
                <p className="text-[10px] font-semibold text-amber-700 uppercase tracking-widest">
                    No term dates configured — go to <span className="underline">Settings → Preferences</span> to set term start &amp; end dates for the progress bar.
                </p>
            </div>
        );
    }

    const termLabel = currentTerm || 'Current Term';

    return (
        <div className="px-5 py-4 border-b border-black/5 bg-gradient-to-r from-slate-50 to-white">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">

                {/* Left — attendance rate circle + label */}
                <div className="flex items-center gap-3 shrink-0">
                    <div className={`w-14 h-14 rounded-2xl ${colors.bg} border ${colors.ring.replace('ring-', 'border-').replace('/20', '/30')} flex flex-col items-center justify-center shadow-sm`}>
                        <span className={`text-base font-semibold ${colors.text} leading-none`}>{displayRate}%</span>
                        <span className="text-[7px] font-semibold text-slate-400 uppercase tracking-wider leading-tight mt-0.5">present</span>
                    </div>
                    <div>
                        <p className="text-[11px] font-semibold text-slate-800 uppercase tracking-tight">{termLabel} Attendance</p>
                        <p className="text-[9px] font-bold text-slate-400">
                            {progress.elapsedWorkingDays} of {progress.totalWorkingDays} working days elapsed
                        </p>
                        {progress.start && progress.end && (
                            <p className="text-[8px] font-bold text-slate-400 mt-0.5">
                                {progress.start} → {progress.end}
                            </p>
                        )}
                    </div>
                </div>

                {/* Right — progress bars */}
                <div className="flex-1 space-y-2.5 min-w-0">
                    {/* Attendance rate bar */}
                    <div>
                        <div className="flex items-center justify-between mb-1">
                            <span className="text-[8px] font-semibold text-slate-500 uppercase tracking-widest">Attendance Rate</span>
                            <span className={`text-[10px] font-semibold ${colors.text}`}>{displayRate}% present</span>
                        </div>
                        <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                            <div
                                className={`h-full ${colors.bar} rounded-full transition-all duration-700`}
                                style={{ width: `${Math.min(100, displayRate)}%` }}
                            />
                        </div>
                    </div>
                    {/* Term elapsed bar */}
                    <div>
                        <div className="flex items-center justify-between mb-1">
                            <span className="text-[8px] font-semibold text-slate-500 uppercase tracking-widest">Term Progress</span>
                            <span className="text-[10px] font-semibold text-slate-500">{progress.termProgressPct}% elapsed · {progress.remainingWorkingDays} days left</span>
                        </div>
                        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-[#1E3A5F]/30 rounded-full transition-all duration-700"
                                style={{ width: `${Math.min(100, progress.termProgressPct)}%` }}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function MorningBtn({ active, onClick, color, icon, label }) {
    const themes = {
        emerald: { active: 'bg-emerald-500 text-white ring-emerald-400/30 shadow-md', inactive: 'bg-white text-emerald-600 border-emerald-100 hover:bg-emerald-50' },
        amber:   { active: 'bg-amber-500 text-white ring-amber-400/30 shadow-md',   inactive: 'bg-white text-amber-600 border-amber-100 hover:bg-amber-50' },
        red:     { active: 'bg-red-500 text-white ring-red-400/30 shadow-md',       inactive: 'bg-white text-red-500 border-red-100 hover:bg-red-50' },
    };
    const t = themes[color];
    return (
        <button
            onClick={onClick}
            title={label}
            className={`flex items-center gap-1 px-2.5 h-8 rounded-xl border text-[9px] font-semibold uppercase tracking-widest transition-all duration-150 ring-2 ring-transparent
                ${active ? t.active + ' ring-2' : t.inactive}`}
        >
            {icon}
            <span className="hidden sm:inline">{label}</span>
        </button>
    );
}
