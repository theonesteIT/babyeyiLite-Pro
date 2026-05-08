import React, { useState, useEffect, useMemo } from 'react';
import { useAcademic } from '../context/AcademicContext';
import { createPortal } from 'react-dom';
import {
    Users, Search, Mail, X, User, Tag,
    Printer, CheckCircle, Wallet,
    TrendingUp, Activity, Landmark, Filter,
    CircleDollarSign, AlertCircle, MoreVertical, Eye,
    Calendar, ShieldCheck, Bell,
    FileText, FileSpreadsheet,
} from 'lucide-react';
import {
    RegistryPageShell,
    RegistryPageHeader,
    RegistryStatGrid,
    RegistryCard,
    ExportSplitButton,
} from '../components/RegistryPageChrome';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import * as XLSX from 'xlsx';

const TERMS = ['Term 1', 'Term 2', 'Term 3', 'Annual Review'];
const STATUS_OPTIONS = [
    { value: 'all', label: 'All status' },
    { value: 'full_pay', label: 'Paid' },
    { value: 'not_paid', label: 'Not paid' },
    { value: 'remain_pay', label: 'Partial payment' },
];

function getAcademicYears(count = 6) {
    const now = new Date();
    const y = now.getFullYear();
    const start = now.getMonth() >= 7 ? y : y - 1;
    return Array.from({ length: count }, (_, i) => {
        const a = start - i;
        return `${a}-${a + 1}`;
    });
}

// ── Financial Detail Drawer (Inherited & Adapted Pattern) ──────────────────
const StudentModal = ({ student, onClose }) => {
    if (!student) return null;

    return createPortal(
        <>
            {/* Backdrop Blur */}
            <div
                className="fixed inset-0 bg-black/40 backdrop-blur-md z-[100] animate-in fade-in duration-300"
                onClick={onClose}
            />

            {/* Right Side Drawer */}
            <div className="fixed inset-y-0 right-0 z-[110] w-full md:w-[420px] bg-white shadow-[-20px_0_60px_-15px_rgba(30,58,95,0.1)] flex flex-col animate-in slide-in-from-right duration-500 ease-out border-l border-re-navy/10">

                {/* Drawer Header */}
                <div className="flex items-center justify-between px-8 py-6 border-b border-black/5 bg-white shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-re-bg border border-black/5 flex items-center justify-center text-re-navy font-black text-lg shadow-inner relative overflow-hidden">
                            <span className="relative z-10">{student.name.charAt(0)}</span>
                            <div className="absolute inset-0 bg-re-grad-navy opacity-5"></div>
                        </div>
                        <div>
                            <h3 className="font-black text-re-navy text-base leading-tight uppercase tracking-tight">{student.name}</h3>
                            <p className="text-[9px] text-re-text-muted font-bold flex items-center gap-1 uppercase tracking-widest mt-0.5 opacity-40">
                                <span className="w-1 h-1 bg-re-gold rounded-full"></span>
                                Ledger ID: {student.id}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2.5 hover:bg-re-bg rounded-xl transition-all text-re-text-muted hover:text-re-gold group"
                    >
                        <X size={18} className="group-hover:rotate-90 transition-transform duration-300" />
                    </button>
                </div>

                {/* Drawer Body (Scrollable) */}
                <div className="flex-1 overflow-y-auto px-8 py-8 space-y-8 custom-scrollbar">

                    {/* Financial Status Alert */}
                    <div className={`flex items-center gap-3 px-4 py-3 rounded-2xl border ${student.balance === 0 ? 'bg-emerald-50 border-emerald-100/50' : 'bg-re-gold/5 border-re-gold/10'}`}>
                        <div className={`p-1.5 rounded-lg ${student.balance === 0 ? 'bg-re-emerald' : 'bg-re-gold'} text-white`}>
                            <ShieldCheck size={14} />
                        </div>
                        <div>
                            <p className={`text-[10px] font-black uppercase tracking-widest ${student.balance === 0 ? 'text-re-emerald' : 'text-re-navy'}`}>
                                {student.balance === 0 ? 'Fully Settled' : 'Outstanding Liability'}
                            </p>
                            <p className="text-[9px] text-re-navy/40 font-bold uppercase tracking-tight leading-none mt-0.5">
                                Current term financial status for {student.grade} {student.stream}
                            </p>
                        </div>
                    </div>

                    {/* Financial Hero Section (Investment vs liability) */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-re-bg rounded-3xl p-5 border border-black/5 shadow-inner relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-16 h-16 bg-re-grad-navy opacity-5 rounded-full -mr-6 -mt-6 group-hover:scale-125 transition-transform duration-700" />
                            <p className="text-[8px] text-re-navy uppercase tracking-[0.2em] font-black mb-1 relative z-10 opacity-60">Total Paid</p>
                            <div className="flex items-baseline gap-1 relative z-10">
                                <span className="text-xl font-black text-re-navy tracking-tighter">RWF {student.paid.toLocaleString()}</span>
                            </div>
                        </div>
                        <div className="bg-re-bg rounded-3xl p-5 border border-black/5 shadow-inner relative overflow-hidden group text-right">
                            <div className="absolute top-0 left-0 w-16 h-16 bg-re-grad-gold opacity-5 rounded-full -ml-6 -mt-6 group-hover:scale-125 transition-transform duration-700" />
                            <p className="text-[8px] text-re-navy uppercase tracking-[0.2em] font-black mb-1 relative z-10 opacity-60">Balance Due</p>
                            <div className="flex items-baseline gap-1 justify-end relative z-10">
                                <span className="text-xl font-black text-re-orange tracking-tighter">RWF {student.balance.toLocaleString()}</span>
                            </div>
                        </div>
                    </div>

                    {/* Detailed Info Matrix */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="text-[9px] font-black text-re-text-muted uppercase tracking-[0.3em] opacity-40">Financial Context</span>
                            <div className="flex-1 h-px bg-black/5" />
                        </div>
                        {[
                            { label: 'Expected Total', value: `RWF ${student.totalBill.toLocaleString()}`, icon: CircleDollarSign },
                            { label: 'Payment Status', value: student.status, icon: ShieldCheck },
                            { label: 'Current Term', value: 'Term 1, 2025', icon: Calendar },
                            { label: 'Guardian', value: 'Parent Name', icon: Users },
                            { label: 'Institutional ID', value: student.id, icon: Tag },
                        ].map((item, i) => (
                            <div key={i} className="flex items-center justify-between group">
                                <div className="flex items-center gap-2">
                                    <item.icon size={11} className="text-re-gold opacity-60" />
                                    <span className="text-[10px] font-black text-re-text-muted uppercase tracking-widest">{item.label}</span>
                                </div>
                                <div className="flex-1 mx-3 border-b border-dashed border-black/10 group-hover:border-re-gold/30 transition-colors" />
                                <span className="text-[10px] font-black text-re-navy uppercase tracking-tight">{item.value}</span>
                            </div>
                        ))}
                    </div>

                    {/* Transaction Activity Log (Mirroring Activity Log pattern) */}
                    <div>
                        <div className="flex items-center gap-2 mb-4">
                            <span className="text-[9px] font-black text-re-text-muted uppercase tracking-[0.3em] opacity-40">Transaction Audit Trail</span>
                            <div className="flex-1 h-px bg-black/5" />
                        </div>

                        <div className="space-y-3">
                            {[
                                { type: 'Payment', date: 'Yesterday', msg: `Recorded RWF ${student.balance === 0 ? '15,000' : '5,000'} via Bank Transfer.`, icon: Landmark, color: 'text-re-emerald', bg: 'bg-emerald-50' },
                                { type: 'Invoice', date: '1 week ago', msg: 'Term 1 Institutional Invoice generated and sent.', icon: Printer, color: 'text-re-navy', bg: 'bg-re-bg' },
                                { type: 'Reminder', date: '2 weeks ago', msg: 'Automated fee reminder sent to registered guardian.', icon: Mail, color: 'text-re-gold', bg: 'bg-re-gold/5' }
                            ].map((log, i) => (
                                <div key={i} className="flex items-start gap-3 p-4 rounded-2xl bg-re-bg/50 border border-black/[0.02] group hover:bg-white hover:border-black/5 transition-all">
                                    <div className={`p-2 rounded-xl ${log.bg} ${log.color} shrink-0`}>
                                        <log.icon size={14} />
                                    </div>
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2 mb-0.5">
                                            <span className="text-[8px] font-black uppercase tracking-widest text-re-navy">{log.type}</span>
                                            <span className="w-1 h-1 bg-black/10 rounded-full"></span>
                                            <span className="text-[8px] font-bold text-re-text-muted opacity-40 uppercase">{log.date}</span>
                                        </div>
                                        <p className="text-[10px] font-bold text-re-text-muted leading-relaxed tracking-tight group-hover:text-re-navy transition-colors">{log.msg}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Drawer Footer (Actions) */}
                <div className="px-8 py-6 border-t border-black/5 bg-re-bg/20 flex flex-col gap-3">
                    <button className="h-12 w-full flex items-center justify-center gap-2 bg-re-grad-navy text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-re-premium-navy hover:scale-[1.02] active:scale-95 transition-all">
                        <Wallet size={15} /> Record New Payment
                    </button>
                    <div className="grid grid-cols-2 gap-3">
                        <button className="h-12 flex items-center justify-center gap-2 bg-white border border-black/5 text-re-navy font-black text-[10px] uppercase tracking-widest rounded-2xl hover:bg-re-bg transition-all">
                            <Printer size={15} className="text-re-gold" /> Statement
                        </button>
                        <button className="h-12 flex items-center justify-center gap-2 bg-white border border-black/5 text-re-navy font-black text-[10px] uppercase tracking-widest rounded-2xl hover:bg-re-bg transition-all">
                            <Mail size={15} className="text-re-gold" /> Reminder
                        </button>
                    </div>
                </div>
            </div>
        </>,
        document.body
    );
};

function feeStatusBadge(status) {
    const s = String(status || '');
    if (s.includes('Fully')) return { cls: 'bg-emerald-50 text-emerald-800 ring-emerald-500/25', label: 'Paid' };
    if (s.includes('Partial')) return { cls: 'bg-amber-50 text-amber-900 ring-amber-500/25', label: 'Partial' };
    if (s.includes('Not')) return { cls: 'bg-rose-50 text-rose-800 ring-rose-500/25', label: 'Unpaid' };
    return { cls: 'bg-slate-50 text-slate-700 ring-slate-500/20', label: s || '—' };
}

const FeePayments = () => {
    const { manager } = useAuth();
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [exportOpen, setExportOpen] = useState(false);
    const [feeToast, setFeeToast] = useState(null);
    const academic = useAcademic();
    const [openDropdownId, setOpenDropdownId] = useState(null);
    const [showClassFilter, setShowClassFilter] = useState(false);
    const [selectedClass, setSelectedClass] = useState('View All');
    const [selectedStatus, setSelectedStatus] = useState('all');
    const [selectedTerm, setSelectedTerm] = useState('');
    const [selectedYear, setSelectedYear] = useState('');

    // Seed from global academic settings once loaded
    useEffect(() => {
        if (!academic.loading && academic.currentTerm) {
            setSelectedTerm(prev => prev || academic.currentTerm);
            setSelectedYear(prev => prev || academic.academicYear);
        }
    }, [academic.loading, academic.currentTerm, academic.academicYear]);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [students, setStudents] = useState([]);
    const [classes, setClasses] = useState([]);
    const yearOptions = academic.academicYears.length ? academic.academicYears : getAcademicYears();

    useEffect(() => {
        if (!selectedTerm || !selectedYear) return;
        let cancelled = false;
        const run = async () => {
            setLoading(true);
            setError('');
            try {
                const params = {
                    academic_year: selectedYear,
                    term: selectedTerm,
                };
                if (selectedClass !== 'View All') params.class_name = selectedClass;
                if (selectedStatus !== 'all') params.status = selectedStatus;
                const { data } = await api.get('/manager/finance/payments/report', { params });
                if (!data?.success) throw new Error(data?.message || 'Failed to load fee registry');
                const rows = Array.isArray(data?.data?.rows) ? data.data.rows : [];
                const classNames = Array.isArray(data?.data?.class_names) ? data.data.class_names : [];
                const mapped = rows.map((r) => {
                    const totalBill = Number(r.total_due || 0);
                    const paid = Number(r.total_paid || 0);
                    const balance = r.remaining == null ? Math.max(0, totalBill - paid) : Number(r.remaining || 0);
                    const st = String(r.status || '').toLowerCase();
                    const statusLabel =
                        st === 'full_pay' || st === 'full'
                            ? 'Fully Paid'
                            : st === 'remain_pay'
                                ? 'Partial'
                                : st === 'not_paid'
                                    ? 'Not Paid'
                                    : 'No Fee Card';
                    return {
                        id: r.student_uid || r.student_code || String(r.student_id || ''),
                        dbId: Number(r.student_id || 0),
                        name: `${r.first_name || ''} ${r.last_name || ''}`.trim() || 'Learner',
                        grade: r.class_name || '—',
                        stream: '',
                        totalBill,
                        paid,
                        balance,
                        status: statusLabel,
                    };
                });
                if (!cancelled) {
                    setStudents(mapped);
                    setClasses(classNames.filter(Boolean));
                }
            } catch (e) {
                if (!cancelled) {
                    setStudents([]);
                    setError(e?.response?.data?.message || e.message || 'Failed to load fee registry');
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        };
        run();
        return () => {
            cancelled = true;
        };
    }, [selectedClass, selectedStatus, selectedTerm, selectedYear]);

    useEffect(() => {
        if (!feeToast) return undefined;
        const t = window.setTimeout(() => setFeeToast(null), 3200);
        return () => window.clearTimeout(t);
    }, [feeToast]);

    const filteredStudents = students.filter(s =>
        (s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            s.id.toLowerCase().includes(searchTerm.toLowerCase())) &&
        (selectedClass === 'View All' || s.grade === selectedClass)
    );

    const exportLedgerCsv = () => {
        const header = [
            'Student ID',
            'Student Name',
            'Class',
            'Expected Total (RWF)',
            'Paid (RWF)',
            'Remaining (RWF)',
            'Status',
            'Term',
            'Academic Year',
        ];
        const lines = filteredStudents.map((s) => [
            s.id,
            s.name,
            s.grade || '',
            Number(s.totalBill || 0),
            Number(s.paid || 0),
            Number(s.balance || 0),
            s.status,
            selectedTerm,
            selectedYear,
        ]);
        const csv = [header, ...lines]
            .map((line) => line.map((x) => `"${String(x ?? '').replace(/"/g, '""')}"`).join(','))
            .join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const classPart = (selectedClass === 'View All' ? 'all-classes' : selectedClass).replace(/\s+/g, '-');
        const statusPart = String(selectedStatus || 'all').replace(/\s+/g, '-');
        a.download = `student-fee-ledger-${selectedYear}-${selectedTerm.replace(/\s+/g, '-')}-${classPart}-${statusPart}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const exportLedgerXlsx = () => {
        const classPart = (selectedClass === 'View All' ? 'all-classes' : selectedClass).replace(/\s+/g, '-');
        const statusPart = String(selectedStatus || 'all').replace(/\s+/g, '-');
        const rowsForExport = filteredStudents.map((s) => ({
            'Student ID': s.id,
            'Student Name': s.name,
            Class: s.grade || '',
            'Expected Total (RWF)': Number(s.totalBill || 0),
            'Paid (RWF)': Number(s.paid || 0),
            'Remaining (RWF)': Number(s.balance || 0),
            Status: s.status,
            Term: selectedTerm,
            'Academic Year': selectedYear,
        }));
        const worksheet = XLSX.utils.json_to_sheet(rowsForExport);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Fee Ledger');
        XLSX.writeFile(
            workbook,
            `student-fee-ledger-${selectedYear}-${selectedTerm.replace(/\s+/g, '-')}-${classPart}-${statusPart}.xlsx`
        );
    };

    const stats = useMemo(() => {
        const totalDue = filteredStudents.reduce((s, x) => s + Number(x.totalBill || 0), 0);
        const totalPaid = filteredStudents.reduce((s, x) => s + Number(x.paid || 0), 0);
        const totalRemain = filteredStudents.reduce((s, x) => s + Number(x.balance || 0), 0);
        const rate = totalDue > 0 ? `${Math.round((totalPaid / totalDue) * 1000) / 10}%` : '0%';
        return {
            totalEnrolled: filteredStudents.length.toLocaleString(),
            totalRevenue: `RWF ${Math.round(totalPaid).toLocaleString()}`,
            pendingRevenue: `RWF ${Math.round(totalRemain).toLocaleString()}`,
            collectionRate: rate,
        };
    }, [filteredStudents]);

    const registryStatItems = useMemo(
        () => [
            {
                label: 'Active students',
                value: stats.totalEnrolled,
                trend: `${selectedTerm} · ${selectedYear}`,
                icon: Users,
                tone: 'navy',
            },
            {
                label: 'Revenue collected',
                value: stats.totalRevenue,
                trend: 'Paid to date',
                icon: TrendingUp,
                tone: 'gold',
            },
            {
                label: 'Outstanding balance',
                value: stats.pendingRevenue,
                trend: 'Remaining liability',
                icon: AlertCircle,
                tone: 'emerald',
            },
            {
                label: 'Collection rate',
                value: stats.collectionRate,
                trend: 'Of expected fees',
                icon: Activity,
                tone: 'violet',
            },
        ],
        [stats, selectedTerm, selectedYear]
    );

    return (
        <div className="animate-in fade-in duration-700 bg-re-bg min-h-full pb-20 lg:pb-12">

            {feeToast && (
                <div className="fixed top-4 right-4 z-[300] max-w-sm rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-900 shadow-xl">
                    {feeToast}
                </div>
            )}

            <StudentModal
                student={selectedStudent}
                onClose={() => setSelectedStudent(null)}
            />

            <RegistryPageShell>
                <RegistryPageHeader
                    overline="Finance center"
                    title="Student fee payments"
                    subtitle={`Balances, collection rate, and fee status — mobile-friendly tables with horizontal scroll. ${manager?.school?.name ? `School: ${manager.school.name}.` : ''}`}
                    secondaryAction={(
                        <ExportSplitButton
                            open={exportOpen}
                            onOpen={setExportOpen}
                            onClose={() => setExportOpen(false)}
                        >
                            <button
                                type="button"
                                className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm font-medium text-slate-700 hover:bg-slate-50"
                                onClick={() => { exportLedgerCsv(); setExportOpen(false); }}
                            >
                                <FileText size={16} className="text-re-gold shrink-0" /> Export CSV
                            </button>
                            <button
                                type="button"
                                className="flex w-full items-center gap-2 border-t border-slate-100 px-4 py-2.5 text-left text-sm font-medium text-slate-700 hover:bg-slate-50"
                                onClick={() => { exportLedgerXlsx(); setExportOpen(false); }}
                            >
                                <FileSpreadsheet size={16} className="text-re-gold shrink-0" /> Export Excel
                            </button>
                        </ExportSplitButton>
                    )}
                    primaryAction={(
                        <button
                            type="button"
                            onClick={() => setFeeToast('Arrears reminders will use your school notification settings (coming soon).')}
                            className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-re-gold px-5 py-2.5 text-[13px] font-bold text-[#0b1530] shadow-[0_4px_14px_rgba(254,191,16,0.35)] hover:bg-re-gold-light transition-all"
                        >
                            <Bell size={18} strokeWidth={2.5} />
                            Notify arrears
                        </button>
                    )}
                />

                <RegistryStatGrid items={registryStatItems} />

                <RegistryCard>
                    {/* Controls */}
                    <div className="space-y-4 border-b border-slate-100 bg-white p-4 sm:p-6">
                        <div className="relative w-full group">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-re-navy transition-colors" size={18} />
                            <input
                                type="search"
                                placeholder="Search by name or student ID…"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-12 pr-4 text-sm font-medium text-slate-800 outline-none transition-all focus:border-re-gold/40 focus:bg-white focus:ring-2 focus:ring-re-gold/20"
                            />
                        </div>
                        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
                            <button
                                type="button"
                                onClick={() => setShowClassFilter(!showClassFilter)}
                                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-xs font-semibold uppercase tracking-wide text-slate-600 hover:bg-slate-50"
                            >
                                <Filter size={15} className="text-re-gold" />
                                Filter by class
                            </button>
                            <select
                                value={selectedStatus}
                                onChange={(e) => setSelectedStatus(e.target.value)}
                                className="h-11 min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 sm:max-w-[200px]"
                            >
                                {STATUS_OPTIONS.map((s) => (
                                    <option key={s.value} value={s.value}>{s.label}</option>
                                ))}
                            </select>
                            <select
                                value={selectedTerm}
                                onChange={(e) => setSelectedTerm(e.target.value)}
                                className="h-11 min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 sm:max-w-[180px]"
                            >
                                {[...(academic.activeTerms.length ? academic.activeTerms : TERMS), 'Annual Review'].map((t) => (
                                    <option key={t} value={t}>{t}</option>
                                ))}
                            </select>
                            <select
                                value={selectedYear}
                                onChange={(e) => setSelectedYear(e.target.value)}
                                className="h-11 min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 sm:max-w-[160px]"
                            >
                                {yearOptions.map((y) => (
                                    <option key={y} value={y}>{y}</option>
                                ))}
                            </select>
                            <button
                                type="button"
                                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 text-xs font-bold uppercase tracking-wide text-slate-700 hover:bg-slate-100"
                            >
                                <Wallet size={15} className="text-re-gold" />
                                Bulk payment
                            </button>
                        </div>
                    </div>

                    {/* Filter Bar */}
                    {showClassFilter && (
                        <div className="flex gap-2 overflow-x-auto border-b border-slate-100 bg-slate-50/80 px-4 py-3 sm:px-6">
                            {['View All', ...classes].map((cls) => (
                                <button
                                    key={cls}
                                    type="button"
                                    onClick={() => setSelectedClass(cls)}
                                    className={`flex shrink-0 items-center justify-center gap-1.5 rounded-full border px-4 py-2 text-[10px] font-bold uppercase tracking-wide transition-all ${selectedClass === cls
                                        ? 'border-re-navy bg-re-navy text-white shadow-sm'
                                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                                        }`}
                                >
                                    {selectedClass === cls && <CheckCircle size={10} className="opacity-90" />}
                                    {cls}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Table View */}
                    <div className="overflow-x-auto bg-white">
                        {error ? (
                            <div className="px-8 py-3 text-[10px] font-black uppercase tracking-widest text-red-600 border-b border-black/5">
                                {error}
                            </div>
                        ) : null}
                        <table className="min-w-[720px] w-full border-collapse text-left">
                            <thead>
                                <tr className="border-b border-slate-200 bg-slate-50/90">
                                    <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-wide text-slate-500 sm:px-6">Student</th>
                                    <th className="hidden px-4 py-3 text-[10px] font-semibold uppercase tracking-wide text-slate-500 sm:table-cell sm:px-6">Admission / ID</th>
                                    <th className="hidden px-4 py-3 text-[10px] font-semibold uppercase tracking-wide text-slate-500 md:table-cell md:px-6">Class</th>
                                    <th className="hidden px-4 py-3 text-right text-[10px] font-semibold uppercase tracking-wide text-slate-500 lg:table-cell lg:px-6">Total fees</th>
                                    <th className="hidden px-4 py-3 text-right text-[10px] font-semibold uppercase tracking-wide text-slate-500 lg:table-cell lg:px-6">Paid</th>
                                    <th className="hidden px-4 py-3 text-right text-[10px] font-semibold uppercase tracking-wide text-slate-500 lg:table-cell lg:px-6">Balance</th>
                                    <th className="hidden px-4 py-3 text-[10px] font-semibold uppercase tracking-wide text-slate-500 sm:table-cell sm:px-6">Status</th>
                                    <th className="px-4 py-3 text-right text-[10px] font-semibold uppercase tracking-wide text-slate-500 sm:px-6">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {loading ? (
                                    <tr>
                                        <td colSpan="8" className="p-16 text-center text-sm font-medium text-slate-500">
                                            Loading fee registry…
                                        </td>
                                    </tr>
                                ) : (
                                    filteredStudents.map((s, idx) => {
                                        const isLastItems = idx >= filteredStudents.length - 2 && filteredStudents.length > 2;
                                        const badge = feeStatusBadge(s.status);
                                        return (
                                            <tr
                                                key={s.id}
                                                onClick={() => setSelectedStudent(s)}
                                                className="cursor-pointer transition-colors hover:bg-slate-50/80"
                                            >
                                                <td className="px-4 py-4 sm:px-6">
                                                    <div className="flex items-center gap-3">
                                                        <div className="relative flex h-10 w-10 flex-shrink-0 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-slate-50 text-sm font-bold text-re-navy">
                                                            <User size={14} className="text-slate-400" />
                                                            <span
                                                                className={`absolute bottom-0.5 right-0.5 h-2.5 w-2.5 rounded-full border-2 border-white ${s.balance === 0 ? 'bg-emerald-500' : 'bg-amber-500'}`}
                                                            />
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="truncate text-sm font-bold text-slate-900">{s.name}</p>
                                                            <p className="truncate font-mono text-[10px] text-slate-400">{s.id}</p>
                                                            <div className="mt-1 flex flex-wrap items-center gap-2 lg:hidden">
                                                                <span className={`inline-flex rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide ring-1 ring-inset ${badge.cls}`}>
                                                                    {badge.label}
                                                                </span>
                                                                <span className="text-[10px] font-semibold tabular-nums text-slate-600">
                                                                    Bal RWF {s.balance.toLocaleString()}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="hidden px-4 py-4 font-mono text-xs text-slate-600 sm:table-cell sm:px-6">{s.id}</td>
                                                <td className="hidden px-4 py-4 text-sm font-semibold text-slate-800 md:table-cell md:px-6">{s.grade}</td>
                                                <td className="hidden px-4 py-4 text-right text-sm font-semibold tabular-nums text-slate-800 lg:table-cell lg:px-6">
                                                    RWF {s.totalBill.toLocaleString()}
                                                </td>
                                                <td className="hidden px-4 py-4 text-right text-sm font-semibold tabular-nums text-emerald-700 lg:table-cell lg:px-6">
                                                    RWF {s.paid.toLocaleString()}
                                                </td>
                                                <td className="hidden px-4 py-4 text-right text-sm font-bold tabular-nums text-slate-900 lg:table-cell lg:px-6">
                                                    RWF {s.balance.toLocaleString()}
                                                </td>
                                                <td className="hidden px-4 py-4 sm:table-cell sm:px-6">
                                                    <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ring-1 ring-inset ${badge.cls}`}>
                                                        {badge.label}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-4 text-right sm:px-6">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <button
                                                            type="button"
                                                            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition-all hover:border-re-gold/40 hover:text-re-navy"
                                                            onClick={(e) => { e.stopPropagation(); }}
                                                            aria-label="Email"
                                                        >
                                                            <Mail size={16} />
                                                        </button>
                                                        <div className="relative">
                                                            <button
                                                                type="button"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setOpenDropdownId(openDropdownId === s.id ? null : s.id);
                                                                }}
                                                                className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition-all hover:border-re-gold/40 hover:text-re-navy"
                                                                aria-label="More"
                                                            >
                                                                <MoreVertical size={16} />
                                                            </button>
                                                            {openDropdownId === s.id && (
                                                                <>
                                                                    <button type="button" className="fixed inset-0 z-[40]" aria-label="Close menu" onClick={() => setOpenDropdownId(null)} />
                                                                    <div className={`absolute right-0 z-50 w-48 overflow-hidden rounded-2xl border border-slate-200 bg-white py-1 shadow-xl ${isLastItems ? 'bottom-full mb-2' : 'top-full mt-2'}`}>
                                                                        <button type="button" className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50">
                                                                            <Eye size={14} className="text-slate-400" /> View details
                                                                        </button>
                                                                        <button type="button" className="flex w-full items-center gap-2 border-t border-slate-100 px-4 py-2.5 text-left text-xs font-semibold text-re-navy hover:bg-slate-50">
                                                                            <Wallet size={14} className="text-re-gold" /> Record payment
                                                                        </button>
                                                                        <button type="button" className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50">
                                                                            <Printer size={14} className="text-slate-400" /> Statement
                                                                        </button>
                                                                    </div>
                                                                </>
                                                            )}
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>

                    <div className="flex flex-col gap-2 border-t border-slate-100 bg-slate-50/80 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                        <p className="text-xs text-slate-500">
                            <span className="font-semibold text-slate-800">{filteredStudents.length}</span>
                            {' '}
                            students · {selectedTerm} · {selectedYear}
                            {selectedClass !== 'View All' ? ` · ${selectedClass}` : ''}
                        </p>
                        <p className="text-[11px] text-slate-400">Scroll horizontally on small screens to see all columns.</p>
                    </div>
                </RegistryCard>
            </RegistryPageShell>
        </div>
    );
};

export default FeePayments;
