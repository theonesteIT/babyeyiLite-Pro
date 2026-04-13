import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
    Users, Search, Download, Mail, ChevronRight, 
    ArrowRight, Activity, X, User, Phone, Tag, 
    Printer, CheckCircle, RefreshCw, Wallet,
    TrendingUp, TrendingDown, Landmark, Filter,
    CircleDollarSign, AlertCircle, MoreVertical, Eye,
    GraduationCap, Award, Clock, Home, Building2,
    Calendar, ShieldCheck
} from 'lucide-react';

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

const FeePayments = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [openDropdownId, setOpenDropdownId] = useState(null);
    const [showClassFilter, setShowClassFilter] = useState(false);
    const [selectedClass, setSelectedClass] = useState('View All');
    const [isClassSelected, setIsClassSelected] = useState(true);

    const [loading, setLoading] = useState(true);
    const classes = ['S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'P6', 'P5'];

    const [students, setStudents] = useState([
        { id: 'RRA-2024-001', name: 'Alain Munyaneza', grade: 'S4', stream: 'MCB', totalBill: 75000, paid: 75000, balance: 0, status: 'Fully Paid' },
        { id: 'RRA-2024-005', name: 'Divine Uwase', grade: 'S4', stream: 'PCB', totalBill: 75000, paid: 45000, balance: 30000, status: 'Partial' },
        { id: 'RRA-2024-012', name: 'Safi Ishimwe', grade: 'S1', stream: 'A', totalBill: 65000, paid: 10000, balance: 55000, status: 'Not Paid' },
        { id: 'RRA-2024-018', name: 'Manzi Kevin', grade: 'P6', stream: 'B', totalBill: 45000, paid: 45000, balance: 0, status: 'Fully Paid' },
        { id: 'RRA-2024-022', name: 'Bella Ingabire', grade: 'S6', stream: 'HEG', totalBill: 75000, paid: 70000, balance: 5000, status: 'Partial' },
        { id: 'RRA-2024-030', name: 'Eric Gakwaya', grade: 'S2', stream: 'A', totalBill: 65000, paid: 65000, balance: 0, status: 'Fully Paid' },
    ]);

    useEffect(() => {
        setTimeout(() => setLoading(false), 800);
    }, []);

    const stats = {
        totalEnrolled: '1,240',
        totalRevenue: 'RWF 42.5M',
        pendingRevenue: 'RWF 8.3M',
        collectionRate: '83.6%'
    };

    const filteredStudents = students.filter(s =>
        (s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            s.id.toLowerCase().includes(searchTerm.toLowerCase())) &&
        (selectedClass === 'View All' || s.grade === selectedClass)
    );

    return (
        <div className="animate-in fade-in duration-700 bg-re-bg min-h-screen">
            
            <StudentModal 
                student={selectedStudent} 
                onClose={() => setSelectedStudent(null)} 
            />

            {/* ── Hero Section ── */}
            <div className="relative w-full min-h-[280px] overflow-hidden">
                <div className="absolute inset-0 bg-re-navy/80 z-10 backdrop-blur-[2px]"></div>
                <img src="/teacher.jpg" alt="Hero" className="absolute inset-0 w-full h-full object-cover scale-105 brightness-50" />

                <div className="relative z-20 max-w-[1600px] mx-auto px-6 md:px-12 pt-16 pb-24">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="w-6 h-1 bg-re-gold rounded-full"></span>
                            <p className="text-[10px] font-black text-re-gold uppercase tracking-[0.3em]">Financial Repository</p>
                        </div>
                        <h1 className="text-2xl sm:text-4xl md:text-5xl font-black text-white tracking-tighter leading-none mb-2 mt-2 uppercase">
                            Student Fee <span className="text-re-gold">Registry</span>
                        </h1>
                        <p className="text-[6px] sm:text-[10px]  font-bold text-white/40 max-w-lg leading-relaxed uppercase tracking-widest italic opacity-60">
                            Professional Financial Oversight & Collection Intelligence
                        </p>
                    </div>
                </div>
            </div>

            {/* ── Main Dashboard Context ── */}
            <div className="max-w-[1600px] mx-auto px-6 md:px-12 -mt-24 relative z-20 pb-20">
                <div className="bg-white rounded-t-[32px] shadow-2xl border border-black/5 overflow-hidden flex flex-col">

                    {/* Stats Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-4 border-b border-black/5">
                        <div className="lg:col-span-3 grid grid-cols-2 md:grid-cols-4 divide-x divide-y md:divide-y-0 divide-black/5">
                            {[
                                { label: 'Active Students', value: stats.totalEnrolled, icon: <Users size={14} className="text-re-gold opacity-40 mb-2" /> },
                                { label: 'Revenue Collected', value: stats.totalRevenue, icon: <TrendingUp size={14} className="text-re-gold opacity-40 mb-2" /> },
                                { label: 'Outstanding Balance', value: stats.pendingRevenue, icon: <AlertCircle size={14} className="text-re-gold opacity-40 mb-2" /> },
                                { label: 'Collection Rate', value: stats.collectionRate, icon: <Activity size={14} className="text-re-gold opacity-40 mb-2" /> }
                            ].map((stat, i) => (
                                <div key={i} className="p-4 sm:p-8 flex flex-col items-center justify-center text-center group hover:bg-re-bg/20 transition-all cursor-default text-re-navy">
                                    {stat.icon && React.cloneElement(stat.icon, { size: 12, className: "text-re-gold opacity-40 mb-1.5 sm:mb-2" })}
                                    <span className="text-sm sm:text-xl font-black tracking-tighter group-hover:text-re-gold transition-colors">
                                        {stat.value}
                                    </span>
                                    <p className="text-[6px] sm:text-[8px] font-black text-re-text-muted uppercase tracking-[0.2em] mt-0.5 sm:mt-1 opacity-60">
                                        {stat.label}
                                    </p>
                                </div>
                            ))}
                        </div>

                        {/* Actions */}
                        <div className="hidden lg:flex flex-col border-l border-black/5 bg-re-bg/30 p-6 justify-center gap-3">
                            <button className="w-full h-11 flex items-center justify-center gap-2 bg-re-grad-navy text-white rounded-xl font-black text-[9px] uppercase tracking-widest shadow-re-premium-navy hover:scale-[1.02] active:scale-95 transition-all">
                                <Download size={14} />
                                Export Ledger
                            </button>
                            <button className="w-full h-11 flex items-center justify-center gap-2 bg-white border border-black/5 text-re-navy font-black text-[9px] uppercase tracking-widest rounded-xl hover:bg-re-bg hover:shadow-re-soft transition-all">
                                <Mail size={14} className="text-re-gold" />
                                Notify Arrears
                            </button>
                        </div>
                    </div>

                    {/* Controls */}
                    <div className="p-6 md:px-8 border-b border-black/5 flex flex-col md:flex-row items-center gap-4 bg-white/50">
                        <div className="relative flex-1 w-full group">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-re-text-muted/40 group-focus-within:text-re-gold transition-colors" size={16} />
                            <input
                                type="text"
                                placeholder="Search records..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full h-10 sm:h-11 bg-re-bg rounded-xl pl-11 pr-4 font-extrabold outline-none border border-transparent focus:border-re-gold/20 focus:bg-white transition-all text-re-navy text-sm sm:text-xs tracking-tight shadow-inner"
                            />
                        </div>
                        <div className="flex items-center gap-2 w-full md:w-auto">
                            <button
                                onClick={() => setShowClassFilter(!showClassFilter)}
                                className="h-10 sm:h-11 px-3 sm:px-5 bg-white border border-black/5 rounded-xl flex items-center gap-1.5 sm:gap-2 text-re-text-muted font-black text-[8px] sm:text-[9px] uppercase tracking-widest hover:bg-re-bg transition-all shadow-sm whitespace-nowrap"
                            >
                                <Filter size={14} className="text-re-gold" />
                                Filter By Class
                            </button>
                            <div className="w-px h-6 bg-black/5 hidden md:block"></div>
                            <button className="h-10 sm:h-11 flex-1 md:flex-none px-3 sm:px-6 bg-re-bg border border-black/5 rounded-xl text-re-navy font-black text-[8px] sm:text-[9px] uppercase tracking-widest hover:bg-white hover:border-re-gold/20 transition-all shadow-sm group flex items-center gap-1.5 sm:gap-2 whitespace-nowrap">
                                <Wallet size={14} className="text-re-gold opacity-60 group-hover:opacity-100 transition-opacity" />
                                Bulk Payment
                            </button>
                        </div>
                    </div>

                    {/* Filter Bar */}
                    {showClassFilter && (
                        <div className="px-6 md:px-8 py-4 bg-re-bg/20 border-b border-black/5 flex overflow-x-auto gap-2 custom-scrollbar animate-in slide-in-from-top-2 fade-in duration-300">
                            {['View All', ...classes].map((cls) => (
                                <button
                                    key={cls}
                                    onClick={() => setSelectedClass(cls)}
                                    className={`flex items-center justify-center gap-1.5 shrink-0 h-9 px-5 rounded-xl border font-black text-[9px] uppercase tracking-widest transition-all whitespace-nowrap ${selectedClass === cls
                                        ? 'bg-re-navy border-re-navy text-white shadow-re-premium-navy hover:scale-105'
                                        : 'bg-white border-black/5 text-re-text-muted hover:bg-re-bg hover:text-re-text'
                                    }`}
                                >
                                    {selectedClass === cls && <CheckCircle size={10} className="opacity-80" />}
                                    {cls}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Table View */}
                    <div className="overflow-x-auto bg-white">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-re-bg/20 border-b border-black/5">
                                    <th className="px-8 py-4 text-[8px] font-black text-re-text-muted uppercase tracking-[0.2em] opacity-40 border-r border-black/5 last:border-r-0">Student Info</th>
                                    <th className="hidden md:table-cell px-8 py-4 text-[8px] font-black text-re-text-muted uppercase tracking-[0.2em] opacity-40 border-r border-black/5">Class Registry</th>
                                    <th className="hidden md:table-cell px-8 py-4 text-[8px] font-black text-re-text-muted uppercase tracking-[0.2em] opacity-40 border-r border-black/5">Revenue (Expected)</th>
                                    <th className="hidden md:table-cell px-8 py-4 text-[8px] font-black text-re-text-muted uppercase tracking-[0.2em] opacity-40 border-r border-black/5">Status</th>
                                    <th className="px-8 py-4 text-[8px] font-black text-re-text-muted uppercase tracking-[0.2em] opacity-40 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-black/5">
                                {loading ? (
                                    <tr><td colSpan="5" className="p-20 text-center animate-pulse text-re-navy font-black text-xs">Syncing Distributed Ledger...</td></tr>
                                ) : (
                                    filteredStudents.map((s, idx) => {
                                        const isLastItems = idx >= filteredStudents.length - 2 && filteredStudents.length > 2;
                                        return (
                                            <tr 
                                                key={s.id} 
                                                onClick={() => setSelectedStudent(s)}
                                                className="hover:bg-re-bg/60 even:bg-re-bg/20 transition-colors group cursor-pointer"
                                            >
                                                <td className="px-8 py-5 border-r border-black/5 last:border-r-0">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-10 h-10 rounded-full bg-re-bg border border-black/5 flex-shrink-0 flex items-center justify-center text-re-navy font-black text-sm relative shadow-inner overflow-hidden group-hover:bg-white transition-colors">
                                                            <User size={12} className='text-gray-400'/>
                                                            <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-white border border-black/5 rounded-full flex items-center justify-center">
                                                                <div className={`w-1.5 h-1.5 ${s.balance === 0 ? 'bg-re-emerald' : 'bg-re-orange'} rounded-full`}></div>
                                                            </div>
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-black text-re-navy tracking-tight uppercase leading-none mb-1 group-hover:text-re-gold transition-colors">{s.name}</p>
                                                            <p className="text-[9px] font-bold text-re-text-muted opacity-30 uppercase tracking-widest leading-none font-mono italic">{s.id}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="hidden md:table-cell px-8 py-5 border-r border-black/5">
                                                    <div className="flex flex-col gap-0.5">
                                                        <p className="text-[10px] font-black text-re-navy uppercase tracking-tight">{s.grade}</p>
                                                        <p className="text-[9px] font-black text-re-gold uppercase italic">{s.stream}</p>
                                                    </div>
                                                </td>
                                                <td className="hidden md:table-cell px-8 py-5 border-r border-black/5 text-re-navy">
                                                    <p className="text-[10px] font-black uppercase tracking-tight">RWF {s.totalBill.toLocaleString()}</p>
                                                    <p className="text-[9px] font-bold text-re-emerald uppercase tracking-widest opacity-60">Paid: {s.paid.toLocaleString()}</p>
                                                </td>
                                                <td className="hidden md:table-cell px-8 py-5 border-r border-black/5">
                                                    <div className={`inline-flex px-3 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest ring-1 ring-inset ${s.balance === 0 ? 'bg-emerald-50 text-re-emerald ring-emerald-500/20' : 'bg-re-orange/5 text-re-orange ring-re-orange/20'}`}>
                                                        {s.balance === 0 ? 'Fully Settled' : `Bal: ${s.balance.toLocaleString()}`}
                                                    </div>
                                                </td>
                                                <td className="px-8 py-5 text-right relative">
                                                    <div className="flex items-center gap-3 justify-end items-center">
                                                        <button 
                                                            className="w-8 h-8 rounded-lg flex items-center justify-center text-re-text-muted hover:bg-re-bg hover:text-re-gold transition-all border border-transparent hover:border-black/5"
                                                            onClick={(e) => { e.stopPropagation(); }}
                                                        >
                                                            <Mail size={14} />
                                                        </button>
                                                        <div className="relative">
                                                            <button 
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setOpenDropdownId(openDropdownId === s.id ? null : s.id);
                                                                }}
                                                                className="w-8 h-8 rounded-lg flex items-center justify-center text-re-text-muted hover:bg-re-bg hover:text-re-gold transition-all border border-transparent hover:border-black/5"
                                                            >
                                                                <MoreVertical size={14} />
                                                            </button>
                                                            {openDropdownId === s.id && (
                                                                <>
                                                                    <div className="fixed inset-0 z-[40]" onClick={() => setOpenDropdownId(null)} />
                                                                    <div className={`absolute right-0 ${isLastItems ? 'bottom-full mb-2' : 'top-full mt-2'} w-48 bg-white border border-black/5 shadow-2xl rounded-2xl z-[50] overflow-hidden py-1 animate-in fade-in zoom-in-95 duration-150`}>
                                                                        <button className="w-full text-left px-4 py-3 text-[10px] font-black uppercase tracking-widest text-re-navy hover:bg-re-bg transition-colors flex items-center gap-2.5">
                                                                            <Eye size={13} className="text-re-text-muted" /> View Details
                                                                        </button>
                                                                        <button className="w-full text-left px-4 py-3 text-[10px] font-black uppercase tracking-widest text-re-gold hover:bg-re-gold/5 transition-colors flex items-center gap-2.5 border-t border-black/5">
                                                                            <Wallet size={13} /> Record Payment
                                                                        </button>
                                                                        <button className="w-full text-left px-4 py-3 text-[10px] font-black uppercase tracking-widest text-re-navy hover:bg-re-bg transition-colors flex items-center gap-2.5">
                                                                            <Printer size={13} className="text-re-text-muted" /> Statement
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

                    {/* Table Footer */}
                    <div className="px-8 py-5 bg-re-bg/20 border-t border-black/5 flex flex-row items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                                <div className="w-1.5 h-1.5 bg-re-gold rounded-full animate-pulse"></div>
                                <p className="text-[8px] font-black text-re-text-muted uppercase tracking-[0.2em] opacity-40 italic">Ledger Synchronized</p>
                            </div>
                            <div className="w-px h-3 bg-black/10"></div>
                            <p className="text-[8px] font-black text-re-text-muted uppercase tracking-[0.2em] opacity-40 italic">Displaying {filteredStudents.length} Records</p>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <button className="h-8 px-4 rounded-lg bg-white border border-black/5 text-[9px] font-black text-re-text-muted tracking-tighter opacity-40 hover:opacity-100 transition-all font-mono italic">Prev_set</button>
                            <div className="h-8 px-4 rounded-lg flex items-center justify-center bg-white border border-black/5 text-[9px] font-black text-re-navy tracking-tighter">Page 01</div>
                            <button className="h-8 px-4 rounded-lg bg-re-grad-navy text-white text-[9px] font-black shadow-re-premium-navy tracking-tighter">Next_set</button>
                        </div>
                    </div>
                </div>

                {/* System Meta */}
                <div className="flex flex-col md:flex-row items-center justify-between mt-8 px-4 gap-4">
                    <p className="text-[7px] text-re-text-muted font-black uppercase tracking-[0.3em] opacity-30 italic">Developed & Engineered by Babyeyi Intelligence Systems</p>
                    <div className="flex items-center gap-4 opacity-20 text-re-navy">
                        <span className="text-[8px] font-black uppercase tracking-widest">Finance OS</span>
                        <span className="text-[8px] font-black uppercase tracking-widest">v1.2.0-Reloaded</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FeePayments;
