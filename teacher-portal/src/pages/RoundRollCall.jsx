import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import {
    normalizeGradebookLabel,
    teacherInnerSelectCls,
    teacherInnerSearchCls,
} from '../utils/teacherGradebookUi';
import {
    Calendar,
    Users,
    CheckCircle,
    XCircle,
    FileText,
    Search,
    CheckSquare,
    Check,
    X,
    User,
    ChevronLeft,
    ChevronRight,
} from 'lucide-react';

export default function RoundRollCall() {
    const navigate = useNavigate();
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [classes, setClasses] = useState([]);
    const [selectedClass, setSelectedClass] = useState('');
    const [roster, setRoster] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(false);

    const shiftDateByDays = (delta) => {
        const d = new Date(selectedDate + 'T12:00:00');
        d.setDate(d.getDate() + delta);
        setSelectedDate(d.toISOString().split('T')[0]);
    };

    const fetchClasses = useCallback(async () => {
        try {
            const res = await api.get('/teacher-portal/classes');
            setClasses(res.data?.success ? res.data.data || [] : []);
        } catch (e) {
            console.error(e);
            setClasses([]);
        }
    }, []);

    useEffect(() => {
        fetchClasses();
    }, [fetchClasses]);

    useEffect(() => {
        if (!selectedClass) {
            setRoster([]);
            return;
        }
        let cancelled = false;
        (async () => {
            setLoading(true);
            try {
                const cn = normalizeGradebookLabel(selectedClass);
                const res = await api.get('/teacher-portal/round-roll-call', {
                    params: { class_name: cn, date: selectedDate },
                });
                if (cancelled) return;
                if (!res.data?.success) {
                    setRoster([]);
                    return;
                }
                const rows = Array.isArray(res.data.data?.roster) ? res.data.data.roster : [];
                setRoster(rows);
            } catch (err) {
                console.error(err);
                if (!cancelled) setRoster([]);
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [selectedClass, selectedDate]);

    const handleSave = async () => {
        if (!selectedClass) return alert('Select a class first.');
        if (!roster.length) return alert('No students in this class.');
        try {
            setLoading(true);
            const cn = normalizeGradebookLabel(selectedClass);
            const existingRes = await api.get('/teacher-portal/round-roll-call', {
                params: { class_name: cn, date: selectedDate },
            });
            if (existingRes.data?.success && existingRes.data?.data?.log_exists) {
                const ok = window.confirm(
                    'Round roll call already exists for this class and date. Overwrite it?'
                );
                if (!ok) return;
            }
            const records = roster.map((s) => ({
                student_id: s.id,
                status: s.status,
                remarks: s.remarks || '',
            }));
            const res = await api.post('/teacher-portal/round-roll-call', {
                class_name: cn,
                date: selectedDate,
                records,
            });
            if (res.data.success) {
                alert(`Round roll call saved for ${selectedClass} (${selectedDate}).`);
            }
        } catch (err) {
            console.error(err);
            alert(err.response?.data?.message || 'Failed to save. Check your connection.');
        } finally {
            setLoading(false);
        }
    };

    const handleStatusChange = (rowId, newStatus) => {
        setRoster((prev) =>
            prev.map((row) => (row.id === rowId ? { ...row, status: newStatus } : row))
        );
    };

    const handleMarkAll = (status) => {
        setRoster((prev) => prev.map((s) => ({ ...s, status })));
    };

    const searchNorm = searchQuery.trim().toLowerCase();
    const filtered = roster.filter((s) => {
        if (!searchNorm) return true;
        const name = (s.name || '').toLowerCase();
        const adm = String(s.adm ?? '').toLowerCase();
        return name.includes(searchNorm) || adm.includes(searchNorm);
    });

    const stats = {
        total: roster.length,
        present: roster.filter((s) => s.status === 'present').length,
        absent: roster.filter((s) => s.status === 'absent').length,
        excused: roster.filter((s) => s.status === 'excused').length,
    };

    return (
        <div className="animate-in fade-in duration-700 bg-re-bg min-h-screen pb-12">
            <section className="relative flex min-h-[220px] w-full items-center overflow-hidden bg-[#FF8C00] text-white shadow-none md:min-h-[260px]">
                <div className="absolute inset-0 z-[1]">
                    <img
                        src="/teacher.png"
                        alt=""
                        className="block h-full w-full object-cover object-top"
                    />
                    <div className="absolute inset-0 z-[2] bg-black/25" aria-hidden />
                </div>
                <div className="relative z-10 mx-auto w-full max-w-[1600px] px-7 pb-8 pt-12 md:px-10">
                    <div className="max-w-4xl space-y-1">
                        <div className="mb-2 flex items-center gap-2">
                            <span className="h-1 w-6 rounded-full bg-re-orange" />
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/80">
                                Roll Call Module
                            </span>
                        </div>
                        <h1 className="font-sans text-2xl font-black tracking-tight text-white md:text-4xl">
                            Round Roll Call
                        </h1>
                        <p className="text-xs font-bold text-white/85 max-w-xl">
                            Select a class and date, mark each learner Present, Absent, or Excused — saved once per
                            class per day (no period required).
                        </p>
                    </div>
                </div>
            </section>

            <div className="relative z-30 mx-auto max-w-[1600px] px-2 md:px-6 -mt-8">
                <div className="mb-3 flex flex-wrap gap-2 bg-white border border-black/5 rounded-2xl p-2 w-full md:w-fit">
                    <button
                        type="button"
                        onClick={() => navigate('/attendance')}
                        className="px-4 h-10 rounded-xl text-[10px] font-black uppercase tracking-widest bg-re-bg text-re-text-muted transition-colors hover:bg-re-bg/80"
                    >
                        Period attendance
                    </button>
                    <button
                        type="button"
                        aria-current="page"
                        className="px-4 h-10 rounded-xl text-[10px] font-black uppercase tracking-widest bg-re-grad-orange text-white"
                    >
                        Round roll call
                    </button>
                    <button
                        type="button"
                        onClick={() => navigate('/teacher-attendance')}
                        className="px-4 h-10 rounded-xl text-[10px] font-black uppercase tracking-widest bg-re-bg text-re-text-muted transition-colors hover:bg-re-bg/80"
                    >
                        Teacher attendance
                    </button>
                </div>

                <div className="flex flex-col overflow-hidden rounded-t-[2rem] border border-black/5 bg-white shadow-2xl">
                    <div className="grid grid-cols-2 divide-x divide-black/5 border-b border-black/5 md:grid-cols-4 md:divide-y-0">
                        {[
                            { label: 'Class size', value: stats.total, icon: <Users size={12} /> },
                            { label: 'Present', value: stats.present, icon: <CheckCircle size={12} /> },
                            { label: 'Absent', value: stats.absent, icon: <XCircle size={12} /> },
                            { label: 'Excused', value: stats.excused, icon: <FileText size={12} /> },
                        ].map((s, i) => (
                            <div
                                key={i}
                                className="flex flex-col items-center justify-center p-4 text-center hover:bg-re-bg/20 sm:p-6"
                            >
                                <div className="mb-1 text-re-orange opacity-40">{s.icon}</div>
                                <div className="text-xl font-black text-re-text sm:text-2xl">{s.value}</div>
                                <div className="mt-0.5 text-[7px] font-black uppercase tracking-[0.2em] text-re-text-muted opacity-70">
                                    {s.label}
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="flex flex-col gap-3 border-b border-black/5 bg-re-bg/20 px-4 py-4 lg:flex-row lg:flex-wrap lg:items-center">
                        <div className="relative min-w-[12rem] max-w-md flex-1">
                            <Users size={12} className="pointer-events-none absolute left-2 top-1/2 z-[1] -translate-y-1/2 text-re-text-muted" />
                            <select
                                value={selectedClass}
                                onChange={(e) => setSelectedClass(e.target.value)}
                                className={`${teacherInnerSelectCls} !pl-8`}
                            >
                                <option value="">Select class</option>
                                {classes.map((c) => (
                                    <option key={c} value={c}>
                                        {c}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => shiftDateByDays(-1)}
                                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-black/[0.07] bg-re-bg text-re-orange"
                                aria-label="Previous day"
                            >
                                <ChevronLeft size={18} />
                            </button>
                            <div className="relative min-w-[10rem]">
                                <Calendar
                                    size={12}
                                    className="pointer-events-none absolute left-2.5 top-1/2 z-[1] -translate-y-1/2 text-re-text-muted"
                                />
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
                                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-black/[0.07] bg-re-bg text-re-orange"
                                aria-label="Next day"
                            >
                                <ChevronRight size={18} />
                            </button>
                        </div>
                        <div className="relative min-w-0 flex-1 lg:max-w-sm">
                            <Search
                                size={12}
                                className="pointer-events-none absolute left-2.5 top-1/2 z-[1] -translate-y-1/2 text-re-text-muted/50"
                            />
                            <input
                                type="text"
                                placeholder="Search student..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className={`${teacherInnerSearchCls} !pl-8`}
                            />
                        </div>
                        <button
                            type="button"
                            onClick={handleSave}
                            disabled={!selectedClass || loading}
                            className="inline-flex h-10 items-center justify-center gap-1 rounded-xl bg-re-grad-orange px-4 text-[9px] font-black uppercase tracking-widest text-white shadow-md disabled:opacity-50 lg:h-8 lg:rounded-lg"
                        >
                            <CheckSquare size={14} /> Save roll
                        </button>
                    </div>

                    {selectedClass && (
                        <div className="flex flex-wrap items-center gap-2 border-b border-black/5 px-4 py-2">
                            <span className="text-[9px] font-black uppercase tracking-widest text-re-text-muted">
                                Bulk
                            </span>
                            <button
                                type="button"
                                onClick={() => handleMarkAll('present')}
                                className="rounded-lg bg-emerald-50 px-3 py-1.5 text-[9px] font-black uppercase tracking-widest text-emerald-700"
                            >
                                All present
                            </button>
                            <button
                                type="button"
                                onClick={() => handleMarkAll('absent')}
                                className="rounded-lg bg-red-50 px-3 py-1.5 text-[9px] font-black uppercase tracking-widest text-red-600"
                            >
                                All absent
                            </button>
                            <button
                                type="button"
                                onClick={() => handleMarkAll('excused')}
                                className="rounded-lg bg-blue-50 px-3 py-1.5 text-[9px] font-black uppercase tracking-widest text-blue-700"
                            >
                                All excused
                            </button>
                        </div>
                    )}

                    <div className="overflow-x-auto min-h-[160px]">
                        <table className="w-full min-w-[640px] border-collapse text-left">
                            <thead>
                                <tr>
                                    <th className="border-b border-r border-black/5 bg-re-bg/50 px-2 py-3 text-center text-[8px] font-black uppercase tracking-widest text-re-text-muted w-10">
                                        #
                                    </th>
                                    <th className="border-b border-r border-black/5 bg-re-bg/50 px-3 py-3 text-left text-[8px] font-black uppercase tracking-widest text-re-text-muted hidden sm:table-cell">
                                        ID
                                    </th>
                                    <th className="border-b border-r border-black/5 bg-re-bg/50 px-3 py-3 text-left text-[8px] font-black uppercase tracking-widest text-re-text-muted">
                                        Student
                                    </th>
                                    <th className="border-b border-black/5 bg-re-bg/50 px-3 py-3 text-center text-[8px] font-black uppercase tracking-widest text-re-text-muted min-w-[240px]">
                                        Status
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr>
                                        <td colSpan={4} className="p-12 text-center">
                                            <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-4 border-re-orange border-t-transparent" />
                                            <p className="text-[10px] font-black uppercase tracking-widest text-re-text-muted">
                                                Loading class…
                                            </p>
                                        </td>
                                    </tr>
                                ) : !selectedClass ? (
                                    <tr>
                                        <td
                                            colSpan={4}
                                            className="p-10 text-center text-sm font-bold text-re-text-muted"
                                        >
                                            Choose a class to load learners.
                                        </td>
                                    </tr>
                                ) : filtered.length === 0 ? (
                                    <tr>
                                        <td
                                            colSpan={4}
                                            className="p-10 text-center text-sm font-bold text-re-text-muted"
                                        >
                                            {roster.length === 0
                                                ? 'No students found for this class.'
                                                : 'No matches for your search.'}
                                        </td>
                                    </tr>
                                ) : (
                                    filtered.map((student, idx) => (
                                        <tr key={student.id} className="hover:bg-re-bg/30">
                                            <td className="border-r border-b border-black/5 px-2 py-2.5 text-center text-[10px] font-black text-gray-300">
                                                {idx + 1}
                                            </td>
                                            <td className="border-r border-b border-black/5 px-3 py-2.5 text-[10px] font-bold text-gray-500 uppercase tracking-widest hidden sm:table-cell">
                                                {student.adm}
                                            </td>
                                            <td className="border-r border-b border-black/5 px-2 py-2.5 align-middle">
                                                <div className="flex min-w-0 items-center gap-2">
                                                    <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-black/5 bg-re-bg">
                                                        <User size={12} className="opacity-40 text-re-text-muted" />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="truncate text-[11px] font-black text-re-text">
                                                            {student.name}
                                                        </p>
                                                        <p className="font-mono text-[9px] font-bold text-re-text-muted sm:hidden">
                                                            {student.adm}
                                                        </p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="border-b border-black/5 px-2 py-2">
                                                <div className="flex flex-col gap-2">
                                                    <div className="flex flex-wrap items-center justify-center gap-2">
                                                        <RoundStatusBtn
                                                            active={student.status === 'present'}
                                                            onClick={() => handleStatusChange(student.id, 'present')}
                                                            base="emerald"
                                                            icon={<Check size={14} strokeWidth={3} />}
                                                            label="Present"
                                                        />
                                                        <RoundStatusBtn
                                                            active={student.status === 'absent'}
                                                            onClick={() => handleStatusChange(student.id, 'absent')}
                                                            base="red"
                                                            icon={<X size={14} strokeWidth={3} />}
                                                            label="Absent"
                                                        />
                                                        <RoundStatusBtn
                                                            active={student.status === 'excused'}
                                                            onClick={() => handleStatusChange(student.id, 'excused')}
                                                            base="blue"
                                                            icon={<FileText size={13} />}
                                                            label="Excused"
                                                        />
                                                    </div>
                                                    <input
                                                        type="text"
                                                        value={student.remarks || ''}
                                                        onChange={(e) =>
                                                            setRoster((prev) =>
                                                                prev.map((row) =>
                                                                    row.id === student.id
                                                                        ? { ...row, remarks: e.target.value }
                                                                        : row
                                                                )
                                                            )
                                                        }
                                                        placeholder="Remarks"
                                                        className="h-8 w-full rounded-lg border border-black/10 px-2 text-[10px] placeholder:text-re-text-muted/50"
                                                    />
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}

function RoundStatusBtn({ active, onClick, base, icon, label }) {
    const themes = {
        emerald: {
            on: 'border-emerald-600 bg-emerald-500 text-white ring-emerald-500/30',
            off: 'border-emerald-200 bg-white text-emerald-600 hover:bg-emerald-50',
        },
        red: {
            on: 'border-red-600 bg-red-500 text-white ring-red-500/30',
            off: 'border-red-200 bg-white text-red-600 hover:bg-red-50',
        },
        blue: {
            on: 'border-blue-600 bg-blue-500 text-white ring-blue-500/30',
            off: 'border-blue-200 bg-white text-blue-600 hover:bg-blue-50',
        },
    };
    const t = themes[base];
    return (
        <button
            type="button"
            onClick={onClick}
            title={label}
            aria-label={label}
            className={`flex min-h-[40px] min-w-[40px] items-center justify-center rounded-xl border-2 text-[8px] font-black uppercase tracking-tighter ring-2 ring-transparent transition-all sm:min-h-0 sm:px-3 sm:py-1.5 ${
                active ? `${t.on} shadow-md` : t.off
            }`}
        >
            {icon}
            <span className="ml-1 hidden sm:inline">{label}</span>
        </button>
    );
}
