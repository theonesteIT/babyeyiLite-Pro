import React, { useState, useEffect, useCallback, useMemo } from 'react';
import api from '../services/api';
import AccountantOchreHero from '../components/AccountantOchreHero';
import {
    GraduationCap,
    Loader2,
    RefreshCw,
    CheckCircle,
    XCircle,
    Shield,
    ChevronDown,
    Megaphone,
    AlertTriangle,
    Search,
} from 'lucide-react';

const TERMS = ['Term 1', 'Term 2', 'Term 3', 'Annual Review'];
const YEARS = ['2026-2027', '2025-2026', '2024-2025', '2023-2024', '2022-2023'];

function formatMoneyRWF(value) {
    const n = Number(value) || 0;
    return new Intl.NumberFormat(undefined, {
        style: 'currency',
        currency: 'RWF',
        maximumFractionDigits: 0,
    }).format(n);
}

/** Match first/last name, UID, student code, or internal id (partial, case-insensitive). */
function studentMatchesSearch(row, queryRaw) {
    const q = String(queryRaw || '')
        .trim()
        .toLowerCase()
        .replace(/\s+/g, ' ');
    if (!q) return true;
    const uid = String(row.student_uid ?? '').toLowerCase();
    const code = String(row.student_code ?? '').toLowerCase();
    const first = String(row.first_name ?? '').toLowerCase().trim();
    const last = String(row.last_name ?? '').toLowerCase().trim();
    const full = `${first} ${last}`.trim();
    const fullRev = `${last} ${first}`.trim();
    const idStr = String(row.student_id ?? '');
    return (
        full.includes(q) ||
        fullRev.includes(q) ||
        first.includes(q) ||
        last.includes(q) ||
        uid.includes(q) ||
        code.includes(q) ||
        idStr.includes(q)
    );
}

function feeStatusLabel(status) {
    const m = {
        full_pay: 'Full paid',
        full: 'Cleared',
        remain_pay: 'Partial',
        not_paid: 'Not paid',
        no_fee_card: 'No fee card',
        unknown: 'Unknown',
    };
    return m[String(status)] || status || '—';
}

export default function ExaminationList() {
    const [selectedTerm, setSelectedTerm] = useState('');
    const [selectedYear, setSelectedYear] = useState('');
    const [termOptions] = useState(TERMS);
    const [yearOptions] = useState(YEARS);
    const [classOptions, setClassOptions] = useState([]);
    const [selectedClass, setSelectedClass] = useState('');
    const [loading, setLoading] = useState(false);
    const [publishing, setPublishing] = useState(false);
    const [overrideBusy, setOverrideBusy] = useState(null);
    const [error, setError] = useState('');
    const [data, setData] = useState(null);
    const [studentSearch, setStudentSearch] = useState('');

    const loadClassNames = useCallback(async () => {
        if (!selectedYear || !selectedTerm) return;
        try {
            const res = await api.get('/accountant/reports/payments', {
                params: { academic_year: selectedYear, term: selectedTerm },
            });
            if (!res.data?.success) return;
            const names = Array.isArray(res.data.data?.class_names) ? res.data.data.class_names.filter(Boolean) : [];
            setClassOptions(names);
        } catch (_) {
            setClassOptions([]);
        }
    }, [selectedYear, selectedTerm]);

    useEffect(() => {
        loadClassNames();
    }, [loadClassNames]);

    const loadExamList = useCallback(async () => {
        if (!selectedYear || !selectedTerm || !selectedClass) return;
        setLoading(true);
        setError('');
        try {
            const res = await api.get('/accountant/examination-list', {
                params: {
                    academic_year: selectedYear,
                    term: selectedTerm,
                    class_name: selectedClass,
                },
            });
            if (!res.data?.success) throw new Error(res.data?.message || 'Failed to load');
            setData(res.data.data || null);
        } catch (e) {
            console.error(e);
            setError(e.response?.data?.message || e.message || 'Could not load examination list');
            setData(null);
        } finally {
            setLoading(false);
        }
    }, [selectedYear, selectedTerm, selectedClass]);

    useEffect(() => {
        if (selectedClass) loadExamList();
        else setData(null);
    }, [selectedClass, selectedYear, selectedTerm, loadExamList]);

    useEffect(() => {
        setStudentSearch('');
    }, [selectedClass, selectedYear, selectedTerm]);

    const handlePublish = async () => {
        if (!selectedYear || !selectedTerm || !selectedClass) return;
        setPublishing(true);
        setError('');
        try {
            const res = await api.post('/accountant/examination-list/publish', {
                academic_year: selectedYear,
                term: selectedTerm,
                class_name: selectedClass,
            });
            if (!res.data?.success) throw new Error(res.data?.message || 'Publish failed');
            setData(res.data.data || null);
        } catch (e) {
            setError(e.response?.data?.message || e.message || 'Publish failed');
        } finally {
            setPublishing(false);
        }
    };

    const setOverride = async (studentId, override_mode) => {
        if (!selectedYear || !selectedTerm || !selectedClass) return;
        setOverrideBusy(studentId);
        setError('');
        try {
            const res = await api.patch('/accountant/examination-list/override', {
                academic_year: selectedYear,
                term: selectedTerm,
                class_name: selectedClass,
                student_id: studentId,
                override_mode,
            });
            if (!res.data?.success) throw new Error(res.data?.message || 'Update failed');
            setData(res.data.data || null);
        } catch (e) {
            setError(e.response?.data?.message || e.message || 'Could not update student');
        } finally {
            setOverrideBusy(null);
        }
    };

    const summary = useMemo(() => {
        if (!data?.counts) return null;
        return data.counts;
    }, [data]);

    const students = data?.students || [];
    const published = Boolean(data?.published);

    const filteredStudents = useMemo(
        () => students.filter((row) => studentMatchesSearch(row, studentSearch)),
        [students, studentSearch]
    );

    return (
        <div className="pb-28 lg:pb-12">
            <AccountantOchreHero
                eyebrow="Finance · Exams"
                titleLine="Examination"
                titleAccent="eligibility list"
                subtitle="Review fee clearance per learner, grant exceptions, then publish so teachers see who may sit exams."
                icon={GraduationCap}
                rightSlot={
                    <button
                        type="button"
                        onClick={() => loadExamList()}
                        disabled={loading || !selectedClass}
                        className="inline-flex items-center gap-2 rounded-xl bg-white/15 px-4 py-2.5 text-sm font-medium text-white ring-1 ring-white/20 hover:bg-white/25 disabled:opacity-50"
                    >
                        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                        Refresh
                    </button>
                }
            />

            <div className="relative z-[1] -mt-14 max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-12 space-y-6">
                <div className="rounded-2xl bg-white shadow-[0_20px_60px_-24px_rgba(0,0,0,0.18)] ring-1 ring-black/5 p-4 sm:p-6 space-y-5">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                        <div>
                            <h2 className="text-lg font-semibold text-re-text tracking-tight">Filters</h2>
                            <p className="text-xs text-re-text-muted mt-1">
                                Same fee totals as Student Fees — unpaid or partial balances block exams unless you override.
                            </p>
                        </div>
                        {summary && (
                            <div className="flex flex-wrap gap-2">
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-semibold text-emerald-800 ring-1 ring-emerald-100">
                                    <CheckCircle className="h-3.5 w-3.5" />
                                    Allowed {summary.allowed}
                                </span>
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-3 py-1 text-[11px] font-semibold text-red-800 ring-1 ring-red-100">
                                    <XCircle className="h-3.5 w-3.5" />
                                    Blocked {summary.blocked}
                                </span>
                                {published ? (
                                    <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-50 px-3 py-1 text-[11px] font-semibold text-sky-900 ring-1 ring-sky-100">
                                        <Megaphone className="h-3.5 w-3.5" />
                                        Published
                                    </span>
                                ) : (
                                    <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-[11px] font-semibold text-amber-900 ring-1 ring-amber-100">
                                        Draft — not visible to teachers
                                    </span>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <label className="block space-y-1.5">
                            <span className="text-[10px] font-semibold uppercase tracking-wider text-re-text-muted">Academic year</span>
                            <div className="relative">
                                <select
                                    value={selectedYear}
                                    onChange={(e) => {
                                        setSelectedYear(e.target.value);
                                        setSelectedClass('');
                                    }}
                                    className="w-full appearance-none rounded-xl border border-black/10 bg-white py-2.5 pl-3 pr-9 text-sm font-medium text-re-text focus:ring-2 focus:ring-[#FEBF10]/40"
                                >
                                    <option value="">Select year</option>
                                    {yearOptions.map((y) => (
                                        <option key={y} value={y}>
                                            {y}
                                        </option>
                                    ))}
                                </select>
                                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-re-text-muted" />
                            </div>
                        </label>
                        <label className="block space-y-1.5">
                            <span className="text-[10px] font-semibold uppercase tracking-wider text-re-text-muted">Term</span>
                            <div className="relative">
                                <select
                                    value={selectedTerm}
                                    onChange={(e) => {
                                        setSelectedTerm(e.target.value);
                                        setSelectedClass('');
                                    }}
                                    className="w-full appearance-none rounded-xl border border-black/10 bg-white py-2.5 pl-3 pr-9 text-sm font-medium text-re-text focus:ring-2 focus:ring-[#FEBF10]/40"
                                >
                                    <option value="">Select term</option>
                                    {termOptions.map((t) => (
                                        <option key={t} value={t}>
                                            {t}
                                        </option>
                                    ))}
                                </select>
                                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-re-text-muted" />
                            </div>
                        </label>
                        <label className="block space-y-1.5">
                            <span className="text-[10px] font-semibold uppercase tracking-wider text-re-text-muted">Class</span>
                            <div className="relative">
                                <select
                                    value={selectedClass}
                                    onChange={(e) => setSelectedClass(e.target.value)}
                                    disabled={!selectedYear || !selectedTerm}
                                    className="w-full appearance-none rounded-xl border border-black/10 bg-white py-2.5 pl-3 pr-9 text-sm font-medium text-re-text focus:ring-2 focus:ring-[#FEBF10]/40 disabled:opacity-50"
                                >
                                    <option value="">Choose class</option>
                                    {classOptions.map((c) => (
                                        <option key={c} value={c}>
                                            {c}
                                        </option>
                                    ))}
                                </select>
                                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-re-text-muted" />
                            </div>
                        </label>
                    </div>

                    {error && (
                        <div className="flex items-start gap-2 rounded-xl bg-red-50 px-3 py-2.5 text-sm text-red-800 ring-1 ring-red-100">
                            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                            {error}
                        </div>
                    )}
                </div>

                {!selectedClass ? (
                    <div className="rounded-2xl border border-dashed border-black/15 bg-white/60 px-6 py-12 text-center text-sm text-re-text-muted">
                        Select academic year, term, and class to load learners.
                    </div>
                ) : loading ? (
                    <div className="flex justify-center py-16">
                        <Loader2 className="h-10 w-10 animate-spin text-[#FEBF10]" />
                    </div>
                ) : (
                    <>
                        <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
                            <label className="block">
                                <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-re-text-muted">
                                    Search student (name, UID, or code)
                                </span>
                                <div className="relative">
                                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-re-text-muted" />
                                    <input
                                        type="search"
                                        value={studentSearch}
                                        onChange={(e) => setStudentSearch(e.target.value)}
                                        placeholder="Type to filter learners…"
                                        autoComplete="off"
                                        className="w-full rounded-xl border border-black/10 bg-white py-2.5 pl-10 pr-3 text-sm font-medium text-re-text placeholder:text-re-text-muted/70 focus:ring-2 focus:ring-[#FEBF10]/40"
                                    />
                                </div>
                                {studentSearch.trim() ? (
                                    <p className="mt-1.5 text-[11px] font-medium text-re-text-muted">
                                        Showing {filteredStudents.length} of {students.length} learners
                                    </p>
                                ) : null}
                            </label>
                        </div>

                        {/* Desktop table */}
                        <div className="hidden md:block overflow-x-auto rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
                            <table className="w-full text-left text-sm">
                                <thead>
                                    <tr className="border-b border-black/5 bg-re-bg/40">
                                        <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-re-text-muted">
                                            Student
                                        </th>
                                        <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-re-text-muted">
                                            Fee status
                                        </th>
                                        <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-re-text-muted tabular-nums">
                                            Due
                                        </th>
                                        <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-re-text-muted tabular-nums">
                                            Paid
                                        </th>
                                        <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-re-text-muted tabular-nums">
                                            Remain
                                        </th>
                                        <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-re-text-muted">
                                            Exam
                                        </th>
                                        <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-re-text-muted">
                                            Override
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-black/5">
                                    {filteredStudents.length === 0 ? (
                                        <tr>
                                            <td colSpan={7} className="px-4 py-10 text-center text-sm text-re-text-muted">
                                                {students.length === 0
                                                    ? 'No learners in this class for the selected period.'
                                                    : `No learners match “${studentSearch.trim()}”. Try another name or code.`}
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredStudents.map((row) => (
                                        <tr key={row.student_id} className="hover:bg-re-bg/30">
                                            <td className="px-4 py-3">
                                                <p className="font-semibold text-re-text">
                                                    {`${row.first_name || ''} ${row.last_name || ''}`.trim() || '—'}
                                                </p>
                                                <p className="text-[11px] text-re-text-muted">{row.student_uid || row.student_code}</p>
                                            </td>
                                            <td className="px-4 py-3 text-xs">{feeStatusLabel(row.fee_status)}</td>
                                            <td className="px-4 py-3 tabular-nums text-xs">{formatMoneyRWF(row.total_due ?? 0)}</td>
                                            <td className="px-4 py-3 tabular-nums text-xs">{formatMoneyRWF(row.total_paid ?? 0)}</td>
                                            <td className="px-4 py-3 tabular-nums text-xs font-medium">
                                                {row.remaining == null ? '—' : formatMoneyRWF(row.remaining)}
                                            </td>
                                            <td className="px-4 py-3">
                                                {row.allowed_for_exam ? (
                                                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-800">
                                                        <CheckCircle className="h-3 w-3" /> Allowed
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-semibold text-red-800">
                                                        <XCircle className="h-3 w-3" /> Blocked
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex flex-wrap gap-1">
                                                    <button
                                                        type="button"
                                                        disabled={overrideBusy === row.student_id}
                                                        onClick={() => setOverride(row.student_id, 'allow')}
                                                        className="rounded-lg bg-emerald-600/90 px-2 py-1 text-[10px] font-semibold text-white hover:bg-emerald-600 disabled:opacity-50"
                                                    >
                                                        Allow
                                                    </button>
                                                    <button
                                                        type="button"
                                                        disabled={overrideBusy === row.student_id}
                                                        onClick={() => setOverride(row.student_id, 'auto')}
                                                        className="rounded-lg bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-700 hover:bg-slate-200 disabled:opacity-50"
                                                    >
                                                        Fee rule
                                                    </button>
                                                    <button
                                                        type="button"
                                                        disabled={overrideBusy === row.student_id}
                                                        onClick={() => setOverride(row.student_id, 'deny')}
                                                        className="rounded-lg bg-red-600/90 px-2 py-1 text-[10px] font-semibold text-white hover:bg-red-600 disabled:opacity-50"
                                                    >
                                                        Block
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                        )))}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile cards */}
                        <div className="md:hidden space-y-3">
                            {filteredStudents.length === 0 ? (
                                <div className="rounded-2xl border border-dashed border-black/15 bg-re-bg/40 px-4 py-10 text-center text-sm text-re-text-muted">
                                    {students.length === 0
                                        ? 'No learners in this class.'
                                        : 'No learners match your search.'}
                                </div>
                            ) : (
                            filteredStudents.map((row) => (
                                <div
                                    key={row.student_id}
                                    className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5 space-y-3"
                                >
                                    <div className="flex items-start justify-between gap-2">
                                        <div>
                                            <p className="font-bold text-re-text leading-snug">
                                                {`${row.first_name || ''} ${row.last_name || ''}`.trim()}
                                            </p>
                                            <p className="text-[11px] text-re-text-muted mt-0.5">{row.student_uid || row.student_code}</p>
                                        </div>
                                        {row.allowed_for_exam ? (
                                            <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-emerald-800 ring-1 ring-emerald-100">
                                                <CheckCircle className="h-3.5 w-3.5" /> Allowed
                                            </span>
                                        ) : (
                                            <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-red-800 ring-1 ring-red-100">
                                                <XCircle className="h-3.5 w-3.5" /> Blocked
                                            </span>
                                        )}
                                    </div>
                                    <div className="grid grid-cols-3 gap-2 text-center rounded-xl bg-re-bg/50 py-2">
                                        <div>
                                            <p className="text-[9px] uppercase tracking-wider text-re-text-muted">Due</p>
                                            <p className="text-xs font-semibold tabular-nums">{formatMoneyRWF(row.total_due ?? 0)}</p>
                                        </div>
                                        <div>
                                            <p className="text-[9px] uppercase tracking-wider text-re-text-muted">Paid</p>
                                            <p className="text-xs font-semibold tabular-nums">{formatMoneyRWF(row.total_paid ?? 0)}</p>
                                        </div>
                                        <div>
                                            <p className="text-[9px] uppercase tracking-wider text-re-text-muted">Remain</p>
                                            <p className="text-xs font-semibold tabular-nums">
                                                {row.remaining == null ? '—' : formatMoneyRWF(row.remaining)}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between text-xs">
                                        <span className="text-re-text-muted">Fee: {feeStatusLabel(row.fee_status)}</span>
                                        {row.override_mode !== 'auto' && (
                                            <span className="inline-flex items-center gap-1 text-amber-700 font-medium">
                                                <Shield className="h-3 w-3" />
                                                Override: {row.override_mode}
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            type="button"
                                            disabled={overrideBusy === row.student_id}
                                            onClick={() => setOverride(row.student_id, 'allow')}
                                            className="flex-1 rounded-xl bg-emerald-600 py-2.5 text-xs font-bold text-white disabled:opacity-50"
                                        >
                                            Allow exam
                                        </button>
                                        <button
                                            type="button"
                                            disabled={overrideBusy === row.student_id}
                                            onClick={() => setOverride(row.student_id, 'auto')}
                                            className="flex-1 rounded-xl bg-slate-100 py-2.5 text-xs font-bold text-slate-800 disabled:opacity-50"
                                        >
                                            Fee rule
                                        </button>
                                        <button
                                            type="button"
                                            disabled={overrideBusy === row.student_id}
                                            onClick={() => setOverride(row.student_id, 'deny')}
                                            className="flex-1 rounded-xl bg-red-600 py-2.5 text-xs font-bold text-white disabled:opacity-50"
                                        >
                                            Block
                                        </button>
                                    </div>
                                </div>
                            )))}
                        </div>
                    </>
                )}
            </div>

            {/* Mobile publish bar */}
            {selectedClass && !loading && (
                <div className="lg:hidden fixed bottom-[4.5rem] left-0 right-0 z-[90] border-t border-black/10 bg-white/95 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-8px_30px_rgba(0,0,0,0.08)] backdrop-blur-md">
                    <button
                        type="button"
                        onClick={handlePublish}
                        disabled={publishing}
                        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#c87800] to-[#a56000] py-3.5 text-sm font-bold uppercase tracking-wide text-white shadow-lg disabled:opacity-60"
                    >
                        {publishing ? <Loader2 className="h-5 w-5 animate-spin" /> : <Megaphone className="h-5 w-5" />}
                        Publish for teachers
                    </button>
                    <p className="mt-2 text-center text-[10px] text-re-text-muted">
                        Teachers only see this class after publish.
                    </p>
                </div>
            )}

            {/* Desktop publish */}
            {selectedClass && !loading && (
                <div className="hidden lg:flex max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-12 mt-8 justify-end">
                    <button
                        type="button"
                        onClick={handlePublish}
                        disabled={publishing}
                        className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-[#c87800] to-[#a56000] px-6 py-3 text-sm font-bold text-white shadow-lg disabled:opacity-60"
                    >
                        {publishing ? <Loader2 className="h-5 w-5 animate-spin" /> : <Megaphone className="h-5 w-5" />}
                        Publish examination list for teachers
                    </button>
                </div>
            )}
        </div>
    );
}
