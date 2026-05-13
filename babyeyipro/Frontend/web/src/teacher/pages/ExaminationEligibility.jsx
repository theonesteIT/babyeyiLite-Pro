import React, { useState, useEffect, useCallback, useMemo } from 'react';
import api from '../services/api';
import {
    GraduationCap,
    Loader2,
    RefreshCw,
    CheckCircle,
    XCircle,
    ChevronDown,
    AlertTriangle,
    Shield,
    Users,
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

export default function ExaminationEligibility() {
    const [classes, setClasses] = useState([]);
    const [selectedClass, setSelectedClass] = useState('');
    const [selectedYear, setSelectedYear] = useState('');
    const [selectedTerm, setSelectedTerm] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [data, setData] = useState(null);

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

    const loadList = useCallback(async () => {
        if (!selectedClass || !selectedYear || !selectedTerm) return;
        setLoading(true);
        setError('');
        try {
            const res = await api.get('/teacher-portal/examination-list', {
                params: {
                    class_name: selectedClass,
                    academic_year: selectedYear,
                    term: selectedTerm,
                },
            });
            if (!res.data?.success) throw new Error(res.data?.message || 'Failed to load');
            setData(res.data.data || null);
        } catch (e) {
            console.error(e);
            setError(e.response?.data?.message || e.message || 'Could not load list');
            setData(null);
        } finally {
            setLoading(false);
        }
    }, [selectedClass, selectedYear, selectedTerm]);

    useEffect(() => {
        if (selectedClass && selectedYear && selectedTerm) loadList();
        else setData(null);
    }, [selectedClass, selectedYear, selectedTerm, loadList]);

    const published = data?.published === true;
    const students = data?.students || [];
    const message = data?.message || '';

    const sortedStudents = useMemo(() => {
        const arr = [...students];
        arr.sort((a, b) => {
            const allowedDiff = Number(b.allowed_for_exam) - Number(a.allowed_for_exam);
            if (allowedDiff !== 0) return allowedDiff;
            const na = `${a.last_name || ''} ${a.first_name || ''}`.toLowerCase();
            const nb = `${b.last_name || ''} ${b.first_name || ''}`.toLowerCase();
            return na.localeCompare(nb);
        });
        return arr;
    }, [students]);

    const canLoad = Boolean(selectedClass && selectedYear && selectedTerm);

    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white pb-28 md:pb-10">
            <div className="relative overflow-hidden bg-[#000435] px-4 pb-16 pt-8 sm:px-6">
                <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-[#f59e0b]/15 blur-3xl" />
                <div className="relative mx-auto max-w-3xl">
                    <div className="flex items-start gap-4">
                        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/10">
                            <GraduationCap className="h-7 w-7 text-[#f59e0b]" strokeWidth={1.75} />
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#f59e0b]">Academic</p>
                            <h1 className="mt-1 text-2xl font-black tracking-tight text-white">Exam eligibility</h1>
                            <p className="mt-2 text-sm font-medium text-white/70 leading-relaxed">
                                After finance publishes the list, see who may sit exams for this class (fees + overrides).
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="relative z-[1] mx-auto max-w-3xl -mt-12 px-4 sm:px-6 space-y-5">
                <div className="rounded-2xl bg-white p-4 shadow-xl shadow-black/10 ring-1 ring-black/5 space-y-4">
                    <div className="grid gap-3 sm:grid-cols-3">
                        <label className="block space-y-1.5">
                            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">Academic year</span>
                            <div className="relative">
                                <select
                                    value={selectedYear}
                                    onChange={(e) => setSelectedYear(e.target.value)}
                                    className="w-full appearance-none rounded-xl border border-black/10 bg-white py-2.5 pl-3 pr-9 text-sm font-bold text-[#000435] focus:ring-2 focus:ring-[#f59e0b]/40"
                                >
                                    <option value="">Year</option>
                                    {YEARS.map((y) => (
                                        <option key={y} value={y}>
                                            {y}
                                        </option>
                                    ))}
                                </select>
                                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            </div>
                        </label>
                        <label className="block space-y-1.5">
                            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">Term</span>
                            <div className="relative">
                                <select
                                    value={selectedTerm}
                                    onChange={(e) => setSelectedTerm(e.target.value)}
                                    className="w-full appearance-none rounded-xl border border-black/10 bg-white py-2.5 pl-3 pr-9 text-sm font-bold text-[#000435] focus:ring-2 focus:ring-[#f59e0b]/40"
                                >
                                    <option value="">Term</option>
                                    {TERMS.map((t) => (
                                        <option key={t} value={t}>
                                            {t}
                                        </option>
                                    ))}
                                </select>
                                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            </div>
                        </label>
                        <label className="block space-y-1.5 sm:col-span-1">
                            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">Class</span>
                            <div className="relative">
                                <select
                                    value={selectedClass}
                                    onChange={(e) => setSelectedClass(e.target.value)}
                                    className="w-full appearance-none rounded-xl border border-black/10 bg-white py-2.5 pl-3 pr-9 text-sm font-bold text-[#000435] focus:ring-2 focus:ring-[#f59e0b]/40"
                                >
                                    <option value="">Choose class</option>
                                    {classes.map((c) => (
                                        <option key={c} value={c}>
                                            {c}
                                        </option>
                                    ))}
                                </select>
                                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            </div>
                        </label>
                    </div>

                    <button
                        type="button"
                        onClick={() => loadList()}
                        disabled={!canLoad || loading}
                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#000435] py-3 text-sm font-black uppercase tracking-wide text-white shadow-lg shadow-[#000435]/25 disabled:opacity-50 sm:w-auto sm:px-6"
                    >
                        {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <RefreshCw className="h-5 w-5" />}
                        Refresh list
                    </button>
                </div>

                {error && (
                    <div className="flex items-start gap-2 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-800 ring-1 ring-red-100">
                        <AlertTriangle className="h-5 w-5 shrink-0" />
                        {error}
                    </div>
                )}

                {loading && (
                    <div className="flex justify-center py-16">
                        <Loader2 className="h-10 w-10 animate-spin text-[#f59e0b]" />
                    </div>
                )}

                {!loading && data && !published && (
                    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center">
                        <Users className="mx-auto h-10 w-10 text-slate-300" />
                        <p className="mt-3 text-sm font-semibold text-slate-700">{message}</p>
                        <p className="mt-2 text-xs text-slate-500">
                            Ask finance to publish the examination list for this class and term.
                        </p>
                    </div>
                )}

                {!loading && published && (
                    <>
                        <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-emerald-50/80 px-4 py-3 ring-1 ring-emerald-100">
                            <CheckCircle className="h-5 w-5 text-emerald-600" />
                            <p className="text-sm font-bold text-emerald-900">
                                Published list · {data.counts?.allowed ?? 0} allowed · {data.counts?.blocked ?? 0}{' '}
                                blocked
                            </p>
                        </div>

                        <div className="hidden md:block overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
                            <table className="w-full text-left text-sm">
                                <thead>
                                    <tr className="border-b border-black/5 bg-slate-50">
                                        <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wider text-slate-500">
                                            Student
                                        </th>
                                        <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wider text-slate-500">
                                            Fees
                                        </th>
                                        <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wider text-slate-500 tabular-nums">
                                            Paid / Remain
                                        </th>
                                        <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wider text-slate-500">
                                            Exam
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-black/5">
                                    {sortedStudents.map((row) => (
                                        <tr key={row.student_id} className="hover:bg-slate-50/80">
                                            <td className="px-4 py-3">
                                                <p className="font-bold text-[#000435]">
                                                    {`${row.first_name || ''} ${row.last_name || ''}`.trim()}
                                                </p>
                                                <p className="text-[11px] text-slate-500">{row.student_uid || row.student_code}</p>
                                            </td>
                                            <td className="px-4 py-3 text-xs text-slate-600">{feeStatusLabel(row.fee_status)}</td>
                                            <td className="px-4 py-3 text-xs tabular-nums">
                                                <span className="font-semibold text-slate-800">{formatMoneyRWF(row.total_paid ?? 0)}</span>
                                                <span className="text-slate-400"> · </span>
                                                <span className="text-slate-600">
                                                    {row.remaining == null ? '—' : formatMoneyRWF(row.remaining)}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                {row.allowed_for_exam ? (
                                                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-black uppercase tracking-wide text-emerald-800 ring-1 ring-emerald-100">
                                                        <CheckCircle className="h-3.5 w-3.5" /> Allowed
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-1 text-[11px] font-black uppercase tracking-wide text-red-800 ring-1 ring-red-100">
                                                        <XCircle className="h-3.5 w-3.5" /> Not allowed
                                                    </span>
                                                )}
                                                {row.override_mode !== 'auto' && (
                                                    <p className="mt-1 flex items-center gap-1 text-[10px] font-semibold text-amber-700">
                                                        <Shield className="h-3 w-3" />
                                                        Finance override ({row.override_mode})
                                                    </p>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="md:hidden space-y-3">
                            {sortedStudents.map((row) => (
                                <div
                                    key={row.student_id}
                                    className={`rounded-2xl p-4 ring-1 ${
                                        row.allowed_for_exam
                                            ? 'bg-white ring-emerald-100 shadow-sm'
                                            : 'bg-red-50/40 ring-red-100'
                                    }`}
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <p className="font-black text-[#000435] leading-snug">
                                                {`${row.first_name || ''} ${row.last_name || ''}`.trim()}
                                            </p>
                                            <p className="text-[11px] font-medium text-slate-500 mt-0.5">
                                                {row.student_uid || row.student_code}
                                            </p>
                                        </div>
                                        {row.allowed_for_exam ? (
                                            <span className="shrink-0 rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-black uppercase text-emerald-900">
                                                Allowed
                                            </span>
                                        ) : (
                                            <span className="shrink-0 rounded-full bg-red-100 px-2.5 py-1 text-[10px] font-black uppercase text-red-900">
                                                Blocked
                                            </span>
                                        )}
                                    </div>
                                    <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                                        <div className="rounded-xl bg-white/80 px-3 py-2 ring-1 ring-black/5">
                                            <p className="text-[9px] font-black uppercase text-slate-400">Paid</p>
                                            <p className="font-bold tabular-nums">{formatMoneyRWF(row.total_paid ?? 0)}</p>
                                        </div>
                                        <div className="rounded-xl bg-white/80 px-3 py-2 ring-1 ring-black/5">
                                            <p className="text-[9px] font-black uppercase text-slate-400">Remain</p>
                                            <p className="font-bold tabular-nums">
                                                {row.remaining == null ? '—' : formatMoneyRWF(row.remaining)}
                                            </p>
                                        </div>
                                    </div>
                                    <p className="mt-2 text-[11px] text-slate-600">
                                        Fee: <span className="font-semibold">{feeStatusLabel(row.fee_status)}</span>
                                        {row.override_mode !== 'auto' && (
                                            <span className="ml-2 font-semibold text-amber-700">
                                                · Override: {row.override_mode}
                                            </span>
                                        )}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
