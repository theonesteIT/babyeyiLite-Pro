import React, { useState, useMemo, useEffect } from 'react';
import {
  Activity, Search, TrendingDown, TrendingUp, Download, Eye, AlertTriangle,
  ShieldAlert, CheckCircle, Plus, ShieldCheck, Tag, Loader2, RefreshCw, 
  Filter, User, Printer, Banknote, CreditCard, ChevronDown, ArrowRight,
  UserPlus
} from 'lucide-react';
import StudentFeesModal from '../components/StudentFeesModal';
import RecordPaymentModal from '../components/RecordPaymentModal';
import api from '../services/api';

const TERMS = ['Term 1', 'Term 2', 'Term 3', 'Annual Review'];
const YEARS = ['2026-2027', '2025-2026', '2024-2025', '2023-2024', '2022-2023'];

function formatMoneyRWF(value) {
  const n = Number(value) || 0;
  return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'RWF', maximumFractionDigits: 0 }).format(n);
}

function formatCompactMoneyRWF(value) {
  const n = Number(value) || 0;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}K`;
  return `${Math.round(n)}`;
}

const Fees = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedTerm, setSelectedTerm] = useState('Term 1');
    const [selectedYear, setSelectedYear] = useState('2025-2026');
    const [selectedClass, setSelectedClass] = useState('All Classes');
    const [loading, setLoading] = useState(false);
    const [reportRows, setReportRows] = useState([]);
    const [paymentsRaw, setPaymentsRaw] = useState([]);
    const [classOptions, setClassOptions] = useState(['All Classes']);
    const [stats, setStats] = useState({ expected: 0, collected: 0, balance: 0, rate: '0%' });
    const [error, setError] = useState('');
    const [sortBy, setSortBy] = useState({ key: 'name', dir: 'asc' });

    // Modals
    const [detailsStudent, setDetailsStudent] = useState(null);
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

    const fetchReport = async () => {
        setLoading(true);
        setError('');
        try {
            const classParam = selectedClass === 'All Classes' ? '' : selectedClass;
            const res = await api.get('/accountant/reports/payments', {
                params: {
                    academic_year: selectedYear,
                    term: selectedTerm,
                    class_name: classParam || undefined,
                },
            });
            if (!res.data?.success) throw new Error(res.data?.message || 'Failed to load fees report');
            const data = res.data?.data || {};
            const rows = Array.isArray(data.rows) ? data.rows : [];
            const payRes = await api.get('/accountant/payments', { params: { limit: 300 } });
            const payRows = Array.isArray(payRes.data?.data) ? payRes.data.data : [];

            const learners = rows.map((r) => {
                const first = r.first_name || '';
                const last = r.last_name || '';
                const fullName = `${first} ${last}`.trim() || 'Learner';
                const totalDue = Number(r.total_due || 0);
                const totalPaid = Number(r.total_paid || 0);
                const remaining = r.remaining == null ? Math.max(0, totalDue - totalPaid) : Number(r.remaining || 0);
                return {
                    student_id: Number(r.student_id),
                    id: r.student_uid || r.student_code || String(r.student_id),
                    name: fullName,
                    class: r.class_name || '—',
                    amountToPay: totalDue,
                    paidThisTerm: totalPaid,
                    remaining,
                    status: r.status || 'unknown',
                };
            });

            const expected = learners.reduce((s, x) => s + Number(x.amountToPay || 0), 0);
            const collected = learners.reduce((s, x) => s + Number(x.paidThisTerm || 0), 0);
            const balance = learners.reduce((s, x) => s + Number(x.remaining || 0), 0);
            const rate = expected > 0 ? `${Math.round((collected / expected) * 100)}%` : '0%';

            setReportRows(learners);
            setPaymentsRaw(payRows);
            const classes = Array.isArray(data.class_names) ? data.class_names.filter(Boolean) : [];
            setClassOptions(['All Classes', ...classes]);
            setStats({ expected, collected, balance, rate });
        } catch (e) {
            setReportRows([]);
            setPaymentsRaw([]);
            setStats({ expected: 0, collected: 0, balance: 0, rate: '0%' });
            setError(e.message || 'Failed to load report');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchReport();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedYear, selectedTerm, selectedClass]);

    const filteredLearners = reportRows.filter(l => {
        const classMatch = selectedClass === 'All Classes' || l.class === selectedClass;
        const q = searchTerm.toLowerCase();
        const nameMatch = !q || l.name.toLowerCase().includes(q) || l.id.toLowerCase().includes(q);
        return classMatch && nameMatch;
    });

    const sortedStudents = [...filteredLearners].sort((a, b) => {
        const dir = sortBy.dir === 'asc' ? 1 : -1;
        if (sortBy.key === 'remaining') return (a.remaining - b.remaining) * dir;
        if (sortBy.key === 'class') return a.class.localeCompare(b.class) * dir;
        return a.name.localeCompare(b.name) * dir;
    });

    const toggleSort = (key) => {
        setSortBy(prev => ({
            key,
            dir: prev.key === key ? (prev.dir === 'asc' ? 'desc' : 'asc') : 'asc'
        }));
    };

    const sortBadge = (key) => {
        if (sortBy.key !== key) return null;
        return <span className="ml-1 text-[9px] font-black">{sortBy.dir === 'asc' ? '↑' : '↓'}</span>;
    };

    return (
        <>
            <div className="animate-in fade-in duration-700 bg-re-bg min-h-screen" style={{ fontFamily: "'Montserrat', sans-serif" }}>

                {/* ── High-Fidelity Hero Section (match discipline pattern) ── */}
                <div className="relative w-full min-h-[280px] overflow-hidden">
                    <div className="absolute inset-0 bg-[#0a192f]/85 z-10 backdrop-blur-[2px]"></div>
                    <img src="/teacher.jpg" alt="Hero Background" className="absolute inset-0 w-full h-full object-cover scale-105" />
                    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-[#1E3A5F]/40 via-transparent to-transparent z-10 max-w-[1600px] mx-auto"></div>

                    <div className="relative z-20 max-w-[1600px] mx-auto px-6 md:px-12 pt-16 pb-24 flex items-center gap-8">
                        <div className="hidden md:flex shrink-0 w-24 h-24 rounded-[32px] border border-white/10 bg-white/5 items-center justify-center backdrop-blur-xl shadow-2xl relative overflow-hidden group">
                            <div className="absolute inset-0 bg-gradient-to-br from-[#FEBF10]/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
                            <Banknote size={40} style={{ color: "#FEBF10" }} className="group-hover:scale-110 transition-transform duration-500" />
                        </div>

                        <div className="space-y-1">
                            <div className="flex items-center gap-2 mb-2">
                                <span className="w-6 h-1 rounded-full animate-pulse" style={{ background: "#FEBF10" }}></span>
                                <p className="text-[10px] font-black uppercase tracking-[0.3em]" style={{ color: "#FEBF10" }}>Financial Insight</p>
                            </div>
                            <h1 className="text-2xl sm:text-4xl md:text-5xl font-black text-white tracking-tighter leading-none mb-2 mt-2 uppercase">
                                Student <span style={{ color: "#FEBF10" }}>Fees</span>
                            </h1>
                            <p className="text-[8px] sm:text-[10px] md:text-xs font-bold text-white/40 max-w-lg leading-relaxed uppercase tracking-widest italic opacity-60">
                                Fee registry & collection metrics
                            </p>
                        </div>
                    </div>
                </div>

                {/* ── Consolidated High-Fidelity Card ── */}
                <div className="max-w-[1600px] mx-auto px-6 md:px-12 -mt-24 relative z-20 pb-20">
                    <div className="bg-white rounded-t-[32px] shadow-2xl border border-black/5 overflow-hidden flex flex-col min-h-[500px]">

                        {/* Stats Header Grid */}
                        <div className="grid grid-cols-1 lg:grid-cols-4 border-b border-black/5">
                            <div className="lg:col-span-3 grid grid-cols-2 md:grid-cols-4 divide-x divide-y md:divide-y-0 divide-black/5">
                                {[
                                    { label: 'Total Expected', value: formatCompactMoneyRWF(stats.expected), icon: <TrendingUp size={14} className="text-blue-500" /> },
                                    { label: 'Total Collected', value: formatCompactMoneyRWF(stats.collected), icon: <ShieldCheck size={14} className="text-emerald-500" /> },
                                    { label: 'Outstanding', value: formatCompactMoneyRWF(stats.balance), icon: <AlertTriangle size={14} className="text-red-500" /> },
                                    { label: 'Collection Rate', value: stats.rate, icon: <Activity size={14} className="text-amber-500" /> },
                                ].map((stat, i) => (
                                    <div key={i} className="p-4 sm:p-8 flex flex-col items-center justify-center text-center group hover:bg-re-bg/20 transition-all cursor-default">
                                        <div className="mb-1.5 sm:mb-2 opacity-40 shrink-0">{stat.icon}</div>
                                        <span className="text-sm sm:text-2xl font-black text-re-text tracking-tighter group-hover:text-[#1E3A5F] transition-colors">
                                            {stat.value}
                                        </span>
                                        <p className="text-[6px] sm:text-[8px] font-black text-re-text-muted uppercase tracking-[0.2em] mt-0.5 sm:mt-1 opacity-60">
                                            {stat.label}
                                        </p>
                                    </div>
                                ))}
                            </div>

                            <div className="hidden lg:flex flex-col border-l border-black/5 bg-re-bg/30 p-6 justify-center gap-3 relative">
                                <button
                                    onClick={() => {
                                        const params = new URLSearchParams({
                                            academic_year: selectedYear,
                                            term: selectedTerm,
                                        });
                                        if (selectedClass !== 'All Classes') params.set('class_name', selectedClass);
                                        const url = `${(import.meta.env.VITE_API_URL || 'http://localhost:5100')}/api/accountant/reports/payments/export.pdf?${params.toString()}`;
                                        window.open(url, '_blank');
                                    }}
                                    className="w-full h-11 flex items-center justify-center gap-2 text-white rounded-xl font-black text-[9px] uppercase tracking-widest shadow-xl hover:scale-[1.02] active:scale-95 transition-all"
                                    style={{ background: "linear-gradient(135deg, #1E3A5F 0%, #0D2644 100%)" }}
                                >
                                    <Printer size={14} />
                                    <span>Print report</span>
                                </button>
                                <button
                                    onClick={() => setIsPaymentModalOpen(true)}
                                    className="w-full h-11 flex items-center justify-center gap-2 bg-white border border-black/5 text-re-text font-black text-[9px] uppercase tracking-widest rounded-xl hover:bg-re-bg hover:border-[#1E3A5F]/20 hover:shadow-re-soft transition-all group"
                                >
                                    <Plus size={14} className="text-amber-500 group-hover:rotate-90 transition-transform duration-300" />
                                    <span className="group-hover:text-[#1E3A5F] transition-colors">Record Payment</span>
                                </button>
                            </div>
                        </div>

                        {/* Compact Toolbar */}
                        <div className="hidden lg:flex px-4 py-4 lg:px-3 lg:py-2 border-b border-black/5 flex-nowrap items-center justify-start gap-2 bg-re-bg/20 transition-all">
                            <div className="flex flex-nowrap items-center gap-2">
                                <div className="relative w-[10.5rem] shrink-0 group">
                                    <Filter size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-amber-500 z-[1]" />
                                    <span className="absolute left-7 top-1/2 -translate-y-1/2 text-[8px] font-black uppercase text-slate-400 tracking-[0.2em] z-[1]">Class</span>
                                    <select 
                                        className="w-full h-8 bg-white/80 rounded-lg outline-none border border-black/5 focus:border-[#1E3A5F]/20 focus:bg-white transition-all text-[#1E3A5F] text-[9px] font-black uppercase tracking-widest shadow-[inset_0_2px_8px_rgba(15,23,42,0.06),inset_0_-1px_0_rgba(255,255,255,0.5)] cursor-pointer appearance-none !pl-[4.5rem] pr-8"
                                        value={selectedClass}
                                        onChange={e => setSelectedClass(e.target.value)}
                                        style={{ backgroundImage: `url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%231E3A5F%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E')`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.5rem center', backgroundSize: '10px' }}
                                    >
                                        <option value="All Classes">All Classes</option>
                                        {classOptions.map((c) => (
                                            <option key={c} value={c}>{c}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="relative w-[7.5rem] shrink-0">
                                    <select
                                        value={selectedTerm}
                                        onChange={(e) => setSelectedTerm(e.target.value)}
                                        className="w-full h-8 bg-white/80 rounded-lg outline-none border border-black/5 focus:border-[#1E3A5F]/20 focus:bg-white transition-all text-[#1E3A5F] text-[9px] font-black uppercase tracking-widest shadow-[inset_0_2px_8px_rgba(15,23,42,0.06),inset_0_-1px_0_rgba(255,255,255,0.5)] cursor-pointer appearance-none pl-3 pr-8"
                                        style={{ backgroundImage: `url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%231E3A5F%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E')`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.5rem center', backgroundSize: '10px' }}
                                    >
                                        {TERMS.map(t => <option key={t} value={t}>{t}</option>)}
                                    </select>
                                </div>

                                <div className="relative w-[14rem] group">
                                    <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-re-text-muted/50 group-focus-within:text-[#1E3A5F] transition-colors z-[1] pointer-events-none" />
                                    <input
                                        type="text"
                                        placeholder="Search learner name or UID..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="w-full h-8 bg-white/80 rounded-lg outline-none border border-black/5 focus:border-[#1E3A5F]/20 focus:bg-white transition-all text-[#1E3A5F] text-[9px] font-black uppercase tracking-tight shadow-[inset_0_2px_8px_rgba(15,23,42,0.06),inset_0_-1px_0_rgba(255,255,255,0.5)] placeholder:text-[#1E3A5F]/30 !pl-8"
                                    />
                                </div>
                            </div>
                            <button onClick={fetchReport} className="h-8 w-8 flex items-center justify-center bg-white border border-black/5 rounded-lg hover:bg-re-bg transition-all shadow-sm disabled:opacity-40 shrink-0 ml-auto" disabled={loading}>
                                <RefreshCw size={12} className="text-[#1E3A5F]" />
                            </button>
                        </div>

                        {/* Registry Table */}
                        <div className="overflow-x-auto bg-white flex-1 min-h-[400px]">
                            {error ? (
                                <div className="px-6 py-4 text-[11px] font-bold text-red-600">{error}</div>
                            ) : null}
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-re-bg/20 border-b border-black/5">
                                        <th onClick={() => toggleSort('name')} className="px-4 sm:px-6 py-2.5 sm:py-3 text-[7px] sm:text-[8px] font-black text-re-text-muted uppercase tracking-[0.2em] opacity-40 border-r border-black/5 cursor-pointer select-none hover:opacity-70">
                                            Learner Info {sortBadge('name')}
                                        </th>
                                        <th onClick={() => toggleSort('class')} className="hidden md:table-cell px-6 py-3 text-[8px] font-black text-re-text-muted uppercase tracking-[0.2em] opacity-40 border-r border-black/5 cursor-pointer select-none hover:opacity-70">
                                            Classroom {sortBadge('class')}
                                        </th>
                                        <th className="hidden md:table-cell px-6 py-3 text-[8px] font-black text-re-text-muted uppercase tracking-[0.2em] opacity-40 border-r border-black/5 text-right">
                                            Amount to pay
                                        </th>
                                        <th className="hidden md:table-cell px-6 py-3 text-[8px] font-black text-re-text-muted uppercase tracking-[0.2em] opacity-40 border-r border-black/5 text-right">
                                            Paid (term)
                                        </th>
                                        <th onClick={() => toggleSort('remaining')} className="px-4 sm:px-6 py-2.5 sm:py-3 text-[8px] font-black text-re-text-muted uppercase tracking-[0.2em] opacity-40 cursor-pointer select-none hover:opacity-70 text-right border-r border-black/5">
                                            Remaining {sortBadge('remaining')}
                                        </th>
                                        <th className="px-4 sm:px-6 py-2.5 sm:py-3 text-right text-[8px] font-black text-re-text-muted uppercase tracking-[0.2em] opacity-40">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-black/5">
                                    {sortedStudents.map((s) => {
                                        return (
                                            <tr key={s.id} onClick={() => setDetailsStudent(s)} className="hover:bg-re-bg/60 even:bg-re-bg/20 transition-colors group cursor-pointer">
                                                {/* Learner */}
                                                <td className="px-4 sm:px-6 py-2.5 sm:py-3 border-r border-black/5">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-9 h-9 rounded-full border border-black/5 bg-slate-100 flex items-center justify-center shadow-inner shrink-0 text-[#1E3A5F]">
                                                            <User size={16} className="opacity-75" />
                                                        </div>
                                                        <div>
                                                            <p className="text-[13px] font-black text-[#1E3A5F] tracking-tight truncate group-hover:text-[#1E3A5F] transition-colors">{s.name}</p>
                                                            <p className="text-[8px] font-bold text-re-text-muted uppercase tracking-widest leading-none mt-1 opacity-50">{s.id}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                {/* Class */}
                                                <td className="hidden md:table-cell px-6 py-3 border-r border-black/5 font-black text-[#1E3A5F] text-[10px]">
                                                    <span className="bg-re-bg px-2 py-0.5 rounded-lg border border-black/5">{s.class}</span>
                                                </td>
                                                {/* Amount to pay (arrears + term due) */}
                                                <td className="hidden md:table-cell px-6 py-3 border-r border-black/5 text-right font-black text-[#1E3A5F] text-[11px]">
                                                    {formatMoneyRWF(s.amountToPay).replace('RWF', '')}
                                                </td>
                                                {/* Paid (this term) */}
                                                <td className="hidden md:table-cell px-6 py-3 border-r border-black/5 text-right font-black text-emerald-600 text-[11px]">
                                                    {s.paidThisTerm > 0 ? formatMoneyRWF(s.paidThisTerm).replace('RWF', '') : '—'}
                                                </td>
                                                {/* Remaining */}
                                                <td className="px-4 sm:px-6 py-2.5 sm:py-3 border-r border-black/5 text-right">
                                                    <p className={`text-[13px] font-black ${s.remaining > 0 ? 'text-red-500' : 'text-slate-300'}`}>
                                                        {formatMoneyRWF(s.remaining).replace('RWF', '')}
                                                    </p>
                                                </td>
                                                {/* Action */}
                                                <td className="px-4 sm:px-6 py-2.5 sm:py-3 text-right">
                                                    <button 
                                                        onClick={(e) => { e.stopPropagation(); setIsPaymentModalOpen(true); }}
                                                        className="h-7 px-3 rounded-xl flex items-center justify-center gap-1.5 bg-white border border-black/5 text-re-text font-black text-[9px] uppercase tracking-widest shadow-sm hover:bg-re-bg hover:text-[#1E3A5F] transition-all ml-auto"
                                                    >
                                                        <CreditCard size={12} className="text-amber-500 transition-colors" />
                                                        <span>Record</span>
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    {!loading && sortedStudents.length === 0 && (
                                        <tr>
                                            <td colSpan={6} className="px-6 py-8 text-center text-[10px] font-black text-re-text-muted uppercase tracking-widest opacity-50">
                                                No learners found for this filter
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Footer Summary */}
                        <div className="flex px-8 py-4 bg-slate-50/50 border-t border-black/5 items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="flex items-center gap-1.5">
                                    <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest italic opacity-60">Verified Records</p>
                                </div>
                                <div className="w-px h-3 bg-black/10" />
                                <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] opacity-40 italic">
                                    {filteredLearners.length} Participants · {selectedYear} · {selectedTerm}
                                </p>
                            </div>
                        </div>

                    </div>
                </div>
            </div>

            <StudentFeesModal
                isOpen={!!detailsStudent}
                onClose={(action) => {
                    setDetailsStudent(null);
                    if (action?.recordPayment) setIsPaymentModalOpen(true);
                }}
                student={detailsStudent}
                academicYear={selectedYear}
                term={selectedTerm}
                paymentHistory={paymentsRaw.filter((p) => Number(p.student_id) === Number(detailsStudent?.student_id))}
            />

            <RecordPaymentModal
                isOpen={isPaymentModalOpen}
                onClose={(result) => {
                    setIsPaymentModalOpen(false);
                    if (result?.saved) fetchReport();
                }}
                onSave={async ({ amount, method, note }) => {
                    if (!detailsStudent?.student_id) return;
                    await api.post('/accountant/payments', {
                        student_id: detailsStudent.student_id,
                        academic_year: selectedYear,
                        term: selectedTerm,
                        class_name: detailsStudent.class,
                        amount_paid: Number(amount),
                        notes: [method, note].filter(Boolean).join(' · '),
                    });
                }}
                student={detailsStudent}
                academicYear={selectedYear}
                term={selectedTerm}
            />
        </>
    );
};

export default Fees;
