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
    Tag,
} from 'lucide-react';

function normalizeRollLabel(s) {
    return String(s ?? '').trim().slice(0, 160);
}

export default function RoundRollCall() {
    const navigate = useNavigate();
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [classes, setClasses] = useState([]);
    const [selectedClass, setSelectedClass] = useState('');
    const [rollName, setRollName] = useState('');
    const [sessions, setSessions] = useState([]);
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
        if (!selectedClass || !selectedDate) {
            setSessions([]);
            return;
        }
        let cancelled = false;
        (async () => {
            try {
                const cn = normalizeGradebookLabel(selectedClass);
                const res = await api.get('/teacher-portal/round-roll-call/sessions', {
                    params: { class_name: cn, date: selectedDate },
                });
                if (!cancelled && res.data?.success) {
                    setSessions(Array.isArray(res.data.data?.sessions) ? res.data.data.sessions : []);
                }
            } catch (e) {
                if (!cancelled) setSessions([]);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [selectedClass, selectedDate]);

    const rollLabelNorm = normalizeRollLabel(rollName);
    const canLoadRoster = Boolean(selectedClass && rollLabelNorm.length >= 1);

    useEffect(() => {
        if (!canLoadRoster) {
            setRoster([]);
            return;
        }
        let cancelled = false;
        (async () => {
            setLoading(true);
            try {
                const cn = normalizeGradebookLabel(selectedClass);
                const res = await api.get('/teacher-portal/round-roll-call', {
                    params: { class_name: cn, date: selectedDate, roll_label: rollLabelNorm },
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
    }, [selectedClass, selectedDate, rollLabelNorm, canLoadRoster]);

    const handleSave = async () => {
        if (!selectedClass) return alert('Choose a class.');
        if (!rollLabelNorm) return alert('Enter a roll name (e.g. Morning Prep).');
        if (!roster.length) return alert('No students loaded.');
        try {
            setLoading(true);
            const cn = normalizeGradebookLabel(selectedClass);
            const existingRes = await api.get('/teacher-portal/round-roll-call', {
                params: { class_name: cn, date: selectedDate, roll_label: rollLabelNorm },
            });
            if (existingRes.data?.success && existingRes.data?.data?.log_exists) {
                const ok = window.confirm(
                    `Replace saved "${rollLabelNorm}" roll for ${selectedClass} on ${selectedDate}?`
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
                roll_label: rollLabelNorm,
                records,
            });
            if (res.data.success) {
                alert(`Saved “${rollLabelNorm}” for ${selectedClass}.`);
                const sr = await api.get('/teacher-portal/round-roll-call/sessions', {
                    params: { class_name: cn, date: selectedDate },
                });
                if (sr.data?.success) {
                    setSessions(Array.isArray(sr.data.data?.sessions) ? sr.data.data.sessions : []);
                }
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

    const pickSession = (label) => {
        setRollName(label);
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
        <div className="animate-in fade-in duration-700 bg-[#f0f2f9] min-h-screen pb-28 md:pb-12">
            {/* Hero — shorter on mobile */}
            <section className="relative flex min-h-[160px] w-full items-end overflow-hidden bg-[#FF8C00] text-white md:min-h-[220px] md:items-center">
                <div className="absolute inset-0 z-[1]">
                    <img
                        src="/teacher.png"
                        alt=""
                        className="block h-full w-full object-cover object-top opacity-95 md:opacity-100"
                    />
                    <div className="absolute inset-0 z-[2] bg-gradient-to-t from-black/50 via-black/20 to-black/10 md:bg-black/25" aria-hidden />
                </div>
                <div className="relative z-10 mx-auto w-full max-w-[1600px] px-4 pb-6 pt-10 md:px-10 md:pb-8 md:pt-12">
                    <div className="max-w-3xl space-y-1">
                        <span className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-black/20 px-3 py-1 text-[9px] font-black uppercase tracking-[0.2em] text-white/90 backdrop-blur-sm">
                            Roll call module
                        </span>
                        <h1 className="font-sans text-xl font-black tracking-tight text-white md:text-4xl">
                            Round roll call
                        </h1>
                        
                    </div>
                </div>
            </section>

            <div className="relative z-30 mx-auto max-w-[1600px] px-3 md:px-6 -mt-6 md:-mt-8">
                <div className="mb-3 flex flex-wrap gap-2 rounded-2xl border border-black/5 bg-white p-2 shadow-sm md:w-fit">
                    <button
                        type="button"
                        onClick={() => navigate('/attendance')}
                        className="min-h-[44px] rounded-xl px-4 text-[10px] font-black uppercase tracking-widest bg-slate-50 text-slate-600 transition-colors active:scale-[0.98] md:h-10 md:min-h-0"
                    >
                        Period attendance
                    </button>
                    <button
                        type="button"
                        aria-current="page"
                        className="min-h-[44px] rounded-xl px-4 text-[10px] font-black uppercase tracking-widest bg-re-grad-orange text-white shadow-md md:h-10 md:min-h-0"
                    >
                        Round roll call
                    </button>
                    <button
                        type="button"
                        onClick={() => navigate('/teacher-attendance')}
                        className="min-h-[44px] rounded-xl px-4 text-[10px] font-black uppercase tracking-widest bg-slate-50 text-slate-600 transition-colors active:scale-[0.98] md:h-10 md:min-h-0"
                    >
                        Teacher attendance
                    </button>
                </div>

                <div className="flex flex-col overflow-hidden rounded-2xl border border-black/5 bg-white shadow-xl md:rounded-t-[2rem]">
                    <div className="grid grid-cols-2 divide-x divide-black/5 border-b border-black/5 md:grid-cols-4">
                        {[
                            { label: 'Class size', value: stats.total, icon: <Users size={14} className="text-re-orange/70" /> },
                            { label: 'Present', value: stats.present, icon: <CheckCircle size={14} className="text-emerald-500/80" /> },
                            { label: 'Absent', value: stats.absent, icon: <XCircle size={14} className="text-red-500/80" /> },
                            { label: 'Excused', value: stats.excused, icon: <FileText size={14} className="text-blue-500/80" /> },
                        ].map((s, i) => (
                            <div
                                key={i}
                                className="flex flex-col items-center justify-center px-2 py-4 text-center sm:p-6"
                            >
                                <div className="mb-1 opacity-90">{s.icon}</div>
                                <div className="text-2xl font-black tabular-nums text-re-text">{s.value}</div>
                                <div className="mt-0.5 text-[8px] font-black uppercase tracking-[0.18em] text-re-text-muted">
                                    {s.label}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Setup card — mobile-first */}
                    <div className="space-y-3 border-b border-black/5 bg-gradient-to-b from-slate-50/80 to-white p-4 md:p-5">
                        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-12 lg:items-end lg:gap-4">
                            <label className="block lg:col-span-4">
                                <span className="mb-1.5 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-re-text-muted">
                                    <Tag size={12} className="text-re-orange" />
                                    Roll name <span className="text-red-500">*</span>
                                </span>
                                <input
                                    type="text"
                                    value={rollName}
                                    onChange={(e) => setRollName(e.target.value)}
                                    placeholder="e.g. Morning Prep, Registration"
                                    maxLength={160}
                                    className="min-h-[48px] w-full rounded-xl border border-black/10 bg-white px-3 text-[14px] font-bold text-re-text shadow-inner outline-none ring-re-orange/20 placeholder:text-slate-400 focus:border-re-orange/40 focus:ring-2 md:min-h-[44px] md:text-sm"
                                />
                            </label>
                            <div className="relative lg:col-span-3">
                                <Users size={14} className="pointer-events-none absolute left-3 top-1/2 z-[1] -translate-y-1/2 text-re-text-muted" />
                                <select
                                    value={selectedClass}
                                    onChange={(e) => setSelectedClass(e.target.value)}
                                    className={`${teacherInnerSelectCls} !min-h-[48px] !pl-10 md:!min-h-[44px]`}
                                >
                                    <option value="">Choose class</option>
                                    {classes.map((c) => (
                                        <option key={c} value={c}>
                                            {c}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex items-center gap-2 lg:col-span-5">
                                <button
                                    type="button"
                                    onClick={() => shiftDateByDays(-1)}
                                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-black/10 bg-white text-re-orange shadow-sm active:scale-95 md:h-10 md:w-10"
                                    aria-label="Previous day"
                                >
                                    <ChevronLeft size={20} />
                                </button>
                                <div className="relative min-w-0 flex-1">
                                    <Calendar
                                        size={14}
                                        className="pointer-events-none absolute left-3 top-1/2 z-[1] -translate-y-1/2 text-re-text-muted"
                                    />
                                    <input
                                        type="date"
                                        value={selectedDate}
                                        onChange={(e) => setSelectedDate(e.target.value)}
                                        className={`${teacherInnerSearchCls} !min-h-[48px] !pl-11 font-bold md:!min-h-[44px]`}
                                    />
                                </div>
                                <button
                                    type="button"
                                    onClick={() => shiftDateByDays(1)}
                                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-black/10 bg-white text-re-orange shadow-sm active:scale-95 md:h-10 md:w-10"
                                    aria-label="Next day"
                                >
                                    <ChevronRight size={20} />
                                </button>
                            </div>
                        </div>

                        {sessions.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                                <span className="w-full text-[9px] font-black uppercase tracking-widest text-re-text-muted md:w-auto md:shrink-0 md:py-1.5">
                                    Saved rolls this day
                                </span>
                                {sessions.map((s) => (
                                    <button
                                        key={`${s.roll_label}-${s.log_id}`}
                                        type="button"
                                        onClick={() => pickSession(s.roll_label)}
                                        className={`rounded-full border px-3 py-1.5 text-[11px] font-bold transition-colors ${
                                            normalizeRollLabel(rollName) === normalizeRollLabel(s.roll_label)
                                                ? 'border-re-orange bg-orange-50 text-re-orange'
                                                : 'border-black/10 bg-white text-re-text hover:border-re-orange/40'
                                        }`}
                                    >
                                        {s.roll_label || '(unnamed)'}
                                    </button>
                                ))}
                            </div>
                        )}

                        <div className="relative">
                            <Search
                                size={14}
                                className="pointer-events-none absolute left-3 top-1/2 z-[1] -translate-y-1/2 text-re-text-muted/60"
                            />
                            <input
                                type="text"
                                placeholder="Search learner…"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className={`${teacherInnerSearchCls} !min-h-[44px] !pl-10`}
                            />
                        </div>

                        {!canLoadRoster && selectedClass && (
                            <p className="rounded-xl bg-amber-50 px-3 py-2 text-[12px] font-semibold text-amber-900">
                                Enter a <strong>roll name</strong> (e.g. Morning Prep) to load your class list.
                            </p>
                        )}

                        <button
                            type="button"
                            onClick={handleSave}
                            disabled={!canLoadRoster || !roster.length || loading}
                            className="hidden w-full min-h-[52px] items-center justify-center gap-2 rounded-2xl bg-re-grad-orange text-[11px] font-black uppercase tracking-[0.15em] text-white shadow-lg shadow-orange-500/25 disabled:opacity-45 md:inline-flex md:min-h-0 md:w-auto md:rounded-xl md:px-6 md:py-2.5"
                        >
                            <CheckSquare size={18} /> Save roll
                        </button>
                    </div>

                    {selectedClass && canLoadRoster && (
                        <div className="flex flex-wrap items-center gap-2 border-b border-black/5 bg-white px-4 py-3">
                            <span className="text-[9px] font-black uppercase tracking-widest text-re-text-muted">Bulk</span>
                            <button
                                type="button"
                                onClick={() => handleMarkAll('present')}
                                className="min-h-[40px] rounded-xl bg-emerald-50 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-emerald-700 active:scale-[0.98]"
                            >
                                All present
                            </button>
                            <button
                                type="button"
                                onClick={() => handleMarkAll('absent')}
                                className="min-h-[40px] rounded-xl bg-red-50 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-red-600 active:scale-[0.98]"
                            >
                                All absent
                            </button>
                            <button
                                type="button"
                                onClick={() => handleMarkAll('excused')}
                                className="min-h-[40px] rounded-xl bg-blue-50 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-blue-700 active:scale-[0.98]"
                            >
                                All excused
                            </button>
                        </div>
                    )}

                    {/* Mobile cards */}
                    <div className="md:hidden">
                        {loading && canLoadRoster ? (
                            <div className="flex flex-col items-center gap-3 py-16">
                                <div className="h-10 w-10 animate-spin rounded-full border-4 border-re-orange border-t-transparent" />
                                <p className="text-[11px] font-bold uppercase tracking-widest text-re-text-muted">
                                    Loading learners…
                                </p>
                            </div>
                        ) : !selectedClass ? (
                            <p className="py-14 text-center text-sm font-semibold text-re-text-muted">
                                Choose a class and roll name to begin.
                            </p>
                                ) : !canLoadRoster ? (
                            <p className="py-14 text-center text-sm font-semibold text-re-text-muted">
                                Enter a roll name above (e.g. Morning Prep).
                            </p>
                        ) : filtered.length === 0 ? (
                            <p className="py-14 text-center text-sm font-semibold text-re-text-muted">
                                {roster.length === 0
                                    ? 'No learners found for this class.'
                                    : 'No matches for your search.'}
                            </p>
                        ) : (
                            <ul className="divide-y divide-black/5">
                                {filtered.map((student, idx) => (
                                    <li key={student.id} className="bg-white px-4 py-4">
                                        <div className="flex gap-3">
                                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-black/5 bg-slate-50">
                                                <User size={18} className="text-slate-400" />
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-start justify-between gap-2">
                                                    <span className="text-[10px] font-black text-slate-400">#{idx + 1}</span>
                                                    <span className="font-mono text-[10px] font-bold text-slate-500">{student.adm}</span>
                                                </div>
                                                <p className="mt-0.5 text-[14px] font-black leading-snug text-re-text">{student.name}</p>
                                            </div>
                                        </div>
                                        <div className="mt-4 grid grid-cols-3 gap-2">
                                            <RoundStatusBtn
                                                active={student.status === 'present'}
                                                onClick={() => handleStatusChange(student.id, 'present')}
                                                base="emerald"
                                                icon={<Check size={16} strokeWidth={3} />}
                                                label="Present"
                                                showLabel
                                            />
                                            <RoundStatusBtn
                                                active={student.status === 'absent'}
                                                onClick={() => handleStatusChange(student.id, 'absent')}
                                                base="red"
                                                icon={<X size={16} strokeWidth={3} />}
                                                label="Absent"
                                                showLabel
                                            />
                                            <RoundStatusBtn
                                                active={student.status === 'excused'}
                                                onClick={() => handleStatusChange(student.id, 'excused')}
                                                base="blue"
                                                icon={<FileText size={15} />}
                                                label="Excused"
                                                showLabel
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
                                            className="mt-3 min-h-[44px] w-full rounded-xl border border-black/10 px-3 text-[13px] placeholder:text-slate-400"
                                        />
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>

                    {/* Desktop table */}
                    <div className="hidden overflow-x-auto md:block">
                        <table className="w-full min-w-[720px] border-collapse text-left">
                            <thead>
                                <tr>
                                    <th className="border-b border-r border-black/5 bg-slate-50 px-2 py-3 text-center text-[9px] font-black uppercase tracking-widest text-re-text-muted w-11">
                                        #
                                    </th>
                                    <th className="border-b border-r border-black/5 bg-slate-50 px-3 py-3 text-left text-[9px] font-black uppercase tracking-widest text-re-text-muted hidden sm:table-cell">
                                        ID
                                    </th>
                                    <th className="border-b border-r border-black/5 bg-slate-50 px-3 py-3 text-left text-[9px] font-black uppercase tracking-widest text-re-text-muted">
                                        Student
                                    </th>
                                    <th className="border-b border-black/5 bg-slate-50 px-3 py-3 text-center text-[9px] font-black uppercase tracking-widest text-re-text-muted min-w-[260px]">
                                        Status
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading && canLoadRoster ? (
                                    <tr>
                                        <td colSpan={4} className="p-12 text-center">
                                            <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-4 border-re-orange border-t-transparent" />
                                            <p className="text-[10px] font-black uppercase tracking-widest text-re-text-muted">
                                                Loading…
                                            </p>
                                        </td>
                                    </tr>
                                ) : !selectedClass ? (
                                    <tr>
                                        <td colSpan={4} className="p-10 text-center text-sm font-bold text-re-text-muted">
                                            Choose a class and roll name.
                                        </td>
                                    </tr>
                                ) : !canLoadRoster ? (
                                    <tr>
                                        <td colSpan={4} className="p-10 text-center text-sm font-bold text-re-text-muted">
                                            Enter a roll name.
                                        </td>
                                    </tr>
                                ) : filtered.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="p-10 text-center text-sm font-bold text-re-text-muted">
                                            {roster.length === 0
                                                ? 'No students found for this class.'
                                                : 'No search matches.'}
                                        </td>
                                    </tr>
                                ) : (
                                    filtered.map((student, idx) => (
                                        <tr key={student.id} className="hover:bg-re-bg/30">
                                            <td className="border-r border-b border-black/5 px-2 py-3 text-center text-[11px] font-black text-slate-300">
                                                {idx + 1}
                                            </td>
                                            <td className="border-r border-b border-black/5 px-3 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest hidden sm:table-cell">
                                                {student.adm}
                                            </td>
                                            <td className="border-r border-b border-black/5 px-2 py-3 align-middle">
                                                <div className="flex min-w-0 items-center gap-2">
                                                    <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-black/5 bg-re-bg">
                                                        <User size={12} className="opacity-40 text-re-text-muted" />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="truncate text-[12px] font-black text-re-text">{student.name}</p>
                                                        <p className="font-mono text-[9px] font-bold text-re-text-muted sm:hidden">{student.adm}</p>
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
                                                                    row.id === student.id ? { ...row, remarks: e.target.value } : row
                                                                )
                                                            )
                                                        }
                                                        placeholder="Remarks"
                                                        className="h-8 w-full rounded-lg border border-black/10 px-2 text-[11px]"
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

            {/* Sticky save — mobile */}
            <div className="fixed bottom-[4.5rem] left-0 right-0 z-[85] border-t border-black/10 bg-white/95 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-8px_30px_rgba(0,0,0,0.08)] backdrop-blur-md md:hidden">
                <button
                    type="button"
                    onClick={handleSave}
                    disabled={!canLoadRoster || !roster.length || loading}
                    className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-2xl bg-re-grad-orange text-[11px] font-black uppercase tracking-[0.2em] text-white shadow-lg disabled:opacity-45 active:scale-[0.99]"
                >
                    <CheckSquare size={20} /> Save roll
                </button>
                {rollLabelNorm && selectedClass && (
                    <p className="mt-2 text-center text-[10px] font-bold uppercase tracking-widest text-slate-400">
                        {rollLabelNorm} · {selectedClass}
                    </p>
                )}
            </div>
        </div>
    );
}

function RoundStatusBtn({ active, onClick, base, icon, label, showLabel }) {
    const themes = {
        emerald: {
            on: 'border-emerald-600 bg-emerald-500 text-white ring-emerald-500/30',
            off: 'border-emerald-200 bg-white text-emerald-700 hover:bg-emerald-50',
        },
        red: {
            on: 'border-red-600 bg-red-500 text-white ring-red-500/30',
            off: 'border-red-200 bg-white text-red-700 hover:bg-red-50',
        },
        blue: {
            on: 'border-blue-600 bg-blue-500 text-white ring-blue-500/30',
            off: 'border-blue-200 bg-white text-blue-700 hover:bg-blue-50',
        },
    };
    const t = themes[base];
    return (
        <button
            type="button"
            onClick={onClick}
            title={label}
            aria-label={label}
            className={`flex flex-col items-center justify-center gap-0.5 rounded-xl border-2 py-2.5 text-[9px] font-black uppercase tracking-wide ring-2 ring-transparent transition-all active:scale-[0.97] sm:flex-row sm:gap-1 sm:py-1.5 sm:text-[8px] ${
                showLabel ? 'min-h-[72px] flex-1 sm:min-h-0' : 'min-h-[40px] min-w-[40px] px-2 sm:min-h-0'
            } ${active ? `${t.on} shadow-md` : t.off}`}
        >
            {icon}
            <span className={showLabel ? 'leading-tight' : 'hidden sm:inline'}>{label}</span>
        </button>
    );
}
