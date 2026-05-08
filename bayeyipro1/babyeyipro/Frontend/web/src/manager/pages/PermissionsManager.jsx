import React, { useState, useEffect } from 'react';
import api from '../services/api';
import {
    ShieldCheck, Calendar, Clock, User, Filter,
    Plus, Search, CheckCircle, XCircle, ChevronDown,
    ChevronUp, Loader2, MessageSquare, AlertCircle, FileText, Eye, X
} from 'lucide-react';

export default function PermissionsManager() {
    const [permissions, setPermissions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeFilter, setActiveFilter] = useState('ALL'); // ALL, PENDING, APPROVED, REJECTED
    const [classFilter, setClassFilter] = useState('ALL');
    const [typeFilter, setTypeFilter] = useState('ALL');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [returnedDateFrom, setReturnedDateFrom] = useState('');
    const [returnedDateTo, setReturnedDateTo] = useState('');
    const [termFilter, setTermFilter] = useState('ALL');
    const [yearFilter, setYearFilter] = useState('ALL');
    const [selectedPermission, setSelectedPermission] = useState(null);

    // Students for the dropdown
    const [students, setStudents] = useState([]);
    const [studentSearch, setStudentSearch] = useState('');

    const [form, setForm] = useState({
        student_id: '',
        starts_at: '',
        ends_at: '',
        permission_type: 'MEDICAL',
        reason: ''
    });

    const fetchPermissions = async () => {
        setLoading(true);
        try {
            const res = await api.get('/permissions');
            if (res.data.success) {
                setPermissions(res.data.data);
            }
        } catch (err) {
            console.error('Failed to fetch permissions', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchStudents = async () => {
        try {
            const res = await api.get('/students', { params: { limit: 100 } });
            if (res.data.success) {
                setStudents(res.data.data);
            }
        } catch (err) {
            console.error('Failed to fetch students', err);
        }
    };

    useEffect(() => {
        fetchPermissions();
        fetchStudents();
    }, []);

    const handleCreate = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            const res = await api.post('/permissions', form);
            if (res.data.success) {
                setIsModalOpen(false);
                fetchPermissions();
                setForm({ student_id: '', starts_at: '', ends_at: '', permission_type: 'MEDICAL', reason: '' });
            }
        } catch (err) {
            console.error(err);
            alert('Failed to submit permission');
        } finally {
            setIsSaving(false);
        }
    };

    const handleStatusUpdate = async (id, status) => {
        try {
            const res = await api.patch(`/permissions/${id}/status`, { status });
            if (res.data.success) {
                fetchPermissions();
            }
        } catch (err) {
            console.error(err);
            alert('Failed to update status');
        }
    };

    const filteredPermissions = permissions.filter(p => {
        const matchesSearch = `${p.first_name || ''} ${p.last_name || ''}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
            String(p.student_uid || p.student_code || '').toLowerCase().includes(searchQuery.toLowerCase());
        const matchesFilter = activeFilter === 'ALL' || p.status === activeFilter;
        const matchesClass = classFilter === 'ALL' || String(p.class_name || '').toLowerCase() === String(classFilter || '').toLowerCase();
        const matchesType = typeFilter === 'ALL' || String(p.permission_type || '').toUpperCase() === String(typeFilter || '').toUpperCase();
        const startDate = p.starts_at ? new Date(p.starts_at) : null;
        const returnDate = p.actual_return_at ? new Date(p.actual_return_at) : null;
        const fromOk = !dateFrom || (startDate && startDate >= new Date(`${dateFrom}T00:00:00`));
        const toOk = !dateTo || (startDate && startDate <= new Date(`${dateTo}T23:59:59`));
        const returnFromOk = !returnedDateFrom || (returnDate && returnDate >= new Date(`${returnedDateFrom}T00:00:00`));
        const returnToOk = !returnedDateTo || (returnDate && returnDate <= new Date(`${returnedDateTo}T23:59:59`));
        const yearText = startDate ? String(startDate.getFullYear()) : '';
        const matchesYear = yearFilter === 'ALL' || yearText === yearFilter;
        const month = startDate ? startDate.getMonth() + 1 : 0;
        const termLabel = month >= 1 && month <= 4 ? 'TERM_1' : (month >= 5 && month <= 8 ? 'TERM_2' : 'TERM_3');
        const matchesTerm = termFilter === 'ALL' || termFilter === termLabel;
        return matchesSearch && matchesFilter && matchesClass && matchesType && fromOk && toOk && returnFromOk && returnToOk && matchesYear && matchesTerm;
    });

    const stats = {
        pending: permissions.filter(p => p.status === 'PENDING').length,
        approved: permissions.filter(p => p.status === 'APPROVED').length,
        active: permissions.filter(p => {
            const now = new Date();
            const start = new Date(p.starts_at);
            const end = new Date(p.ends_at);
            return p.status === 'APPROVED' && now >= start && now <= end;
        }).length,
        rejected: permissions.filter(p => p.status === 'REJECTED' || p.status === 'CANCELLED').length,
    };

    const reportTotals = (() => {
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const startOfWeek = new Date(startOfToday);
        startOfWeek.setDate(startOfToday.getDate() - 6);
        const startOfMonth = new Date(startOfToday);
        startOfMonth.setDate(startOfToday.getDate() - 29);
        const inRange = (p, start) => {
            const d = p?.starts_at ? new Date(p.starts_at) : null;
            return d && d >= start && d <= now;
        };
        return {
            today: permissions.filter((p) => inRange(p, startOfToday)).length,
            week: permissions.filter((p) => inRange(p, startOfWeek)).length,
            month: permissions.filter((p) => inRange(p, startOfMonth)).length,
        };
    })();

    const classOptions = ['ALL', ...Array.from(new Set(permissions.map((p) => p.class_name).filter(Boolean)))];
    const typeOptions = ['ALL', ...Array.from(new Set(permissions.map((p) => p.permission_type).filter(Boolean)))];
    const yearOptions = ['ALL', ...Array.from(new Set(permissions.map((p) => {
        const d = p?.starts_at ? new Date(p.starts_at) : null;
        return d && !Number.isNaN(d.getTime()) ? String(d.getFullYear()) : null;
    }).filter(Boolean))).sort((a, b) => Number(b) - Number(a))];

    return (
        <div className="animate-in fade-in duration-700 bg-re-bg min-h-screen pb-12">

            {/* ── Hero Section ── */}
            <div className="relative w-full min-h-[280px] overflow-hidden bg-[#c87800]">
                <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full border border-white/5 pointer-events-none" />
                <div className="absolute -top-12 -right-12 w-64 h-64 rounded-full border border-white/5 pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-[#FEBF10]/30 to-transparent pointer-events-none" />

                <div className="relative z-20 max-w-[1600px] mx-auto px-6 md:px-12 pt-12 pb-24 flex items-center gap-8">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2 mb-1">
                            <span className="w-5 h-1 rounded-full animate-pulse" style={{ background: "#FEBF10" }}></span>
                            <p className="text-[9px] font-black uppercase tracking-[0.3em]" style={{ color: "#FEBF10" }}>Organizational Resource</p>
                        </div>
                        <h1 className="text-2xl md:text-3xl font-semibold text-white tracking-tight leading-none mb-1 mt-1 uppercase" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                            Permissions & Excusals
                        </h1>
                        <p className="text-[10px] font-medium text-white/60 max-w-lg leading-relaxed uppercase tracking-widest" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                            Digital Out-Passes & Attendance Reconciliation Engine
                        </p>
                    </div>
                </div>
            </div>

            {/* ── Main Dashboard ── */}
            <div className="max-w-[1600px] mx-auto px-6 -mt-20 relative z-20 pb-20">
                <div className="bg-white rounded-t-[32px] shadow-2xl border border-black/5 overflow-hidden flex flex-col min-h-[600px]">

                    {/* Top Layer: Stats Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-4 border-b border-black/5">
                        <div className="lg:col-span-3 grid grid-cols-2 md:grid-cols-4 divide-x divide-y md:divide-y-0 divide-black/5">
                            {[
                                { label: 'Total Logs', value: permissions.length, icon: <FileText size={12} className="mb-1.5" /> },
                                { label: 'Pending Approval', value: stats.pending, icon: <Clock size={12} className="mb-1.5" />, color: "#FEBF10" },
                                { label: 'Approved Today', value: stats.approved, icon: <CheckCircle size={12} className="mb-1.5" />, color: "#10b981" },
                                { label: 'Currently Out', value: stats.active, icon: <ShieldCheck size={12} className="mb-1.5" />, color: "#FEBF10" },
                                { label: 'Rejected/Cancelled', value: stats.rejected, icon: <AlertCircle size={12} className="mb-1.5" />, color: "#EF4444" },
                                { label: 'Reports Today', value: reportTotals.today, icon: <Calendar size={12} className="mb-1.5" /> },
                                { label: 'Reports This Week', value: reportTotals.week, icon: <Calendar size={12} className="mb-1.5" /> },
                                { label: 'Reports This Month', value: reportTotals.month, icon: <Calendar size={12} className="mb-1.5" /> },
                            ].map((s, i) => (
                                <div key={i} className="p-3 sm:p-5 flex flex-col items-center justify-center text-center group hover:bg-re-bg/20 transition-all cursor-default">
                                    <div className="mb-1 sm:mb-1.5 opacity-40 shrink-0" style={{ color: s.color || "#1E3A5F" }}>
                                        {s.icon}
                                    </div>
                                    <span className="text-sm sm:text-xl font-black text-re-text tracking-tighter group-hover:text-[#1E3A5F] transition-colors">
                                        {s.value}
                                    </span>
                                    <p className="text-[6px] sm:text-[7px] font-black text-re-text-muted uppercase tracking-[0.2em] mt-0.5 opacity-60">
                                        {s.label}
                                    </p>
                                </div>
                            ))}
                        </div>

                        {/* Right Side Actions Section (Desktop) */}
                        <div className="hidden lg:flex flex-col border-l border-black/5 bg-re-bg/30 p-6 justify-center gap-3 relative">
                            <button
                                onClick={() => setIsModalOpen(true)}
                                className="w-full h-11 flex items-center justify-center gap-2 text-white rounded-xl font-black text-[9px] uppercase tracking-widest shadow-xl hover:scale-[1.02] active:scale-95 transition-all"
                                style={{ background: "linear-gradient(135deg, #1E3A5F 0%, #0D2644 100%)" }}
                            >
                                <Plus size={14} />
                                <span>Log Permission</span>
                            </button>
                        </div>
                    </div>

                    {/* Toolbar */}
                    <div className="px-6 py-4 bg-re-bg/10 border-b border-black/5 flex flex-col lg:flex-row items-center justify-between gap-4">
                        <div className="flex items-center gap-3 w-full lg:w-auto flex-wrap">
                            <div className="flex bg-white rounded-xl p-1 shadow-sm border border-black/5">
                                {['ALL', 'PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'].map(f => (
                                    <button
                                        key={f}
                                        onClick={() => setActiveFilter(f)}
                                        className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${activeFilter === f ? 'bg-[#1E3A5F] text-white shadow-md' : 'text-re-text-muted hover:bg-re-bg'
                                            }`}
                                    >
                                        {f}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="flex items-center gap-3 w-full lg:w-auto">
                            <div className="relative flex-1 lg:w-80 group">
                                <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-re-text-muted transition-colors group-focus-within:text-[#1E3A5F]" />
                                <input
                                    type="text"
                                    placeholder="Search by student or ID..."
                                    className="w-full h-11 pl-11 pr-4 bg-white border border-black/5 rounded-xl shadow-inner text-xs font-bold outline-none focus:ring-2 ring-[#1E3A5F]/10"
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                />
                            </div>
                            <select
                                className="h-11 px-3 bg-white border border-black/5 rounded-xl text-[10px] font-black uppercase tracking-widest outline-none"
                                value={classFilter}
                                onChange={(e) => setClassFilter(e.target.value)}
                            >
                                {classOptions.map((cls) => (
                                    <option key={cls} value={cls}>{cls === 'ALL' ? 'All Classes' : cls}</option>
                                ))}
                            </select>
                            <select
                                className="h-11 px-3 bg-white border border-black/5 rounded-xl text-[10px] font-black uppercase tracking-widest outline-none"
                                value={typeFilter}
                                onChange={(e) => setTypeFilter(e.target.value)}
                            >
                                {typeOptions.map((tp) => (
                                    <option key={tp} value={tp}>{tp === 'ALL' ? 'All Types' : tp}</option>
                                ))}
                            </select>
                            <input
                                type="date"
                                className="h-11 px-3 bg-white border border-black/5 rounded-xl text-[10px] font-black uppercase tracking-widest outline-none"
                                value={dateFrom}
                                onChange={(e) => setDateFrom(e.target.value)}
                            />
                            <input
                                type="date"
                                className="h-11 px-3 bg-white border border-black/5 rounded-xl text-[10px] font-black uppercase tracking-widest outline-none"
                                value={dateTo}
                                onChange={(e) => setDateTo(e.target.value)}
                            />
                            <input
                                type="date"
                                className="h-11 px-3 bg-white border border-black/5 rounded-xl text-[10px] font-black uppercase tracking-widest outline-none"
                                value={returnedDateFrom}
                                onChange={(e) => setReturnedDateFrom(e.target.value)}
                                title="Returned date from"
                            />
                            <input
                                type="date"
                                className="h-11 px-3 bg-white border border-black/5 rounded-xl text-[10px] font-black uppercase tracking-widest outline-none"
                                value={returnedDateTo}
                                onChange={(e) => setReturnedDateTo(e.target.value)}
                                title="Returned date to"
                            />
                            <select
                                className="h-11 px-3 bg-white border border-black/5 rounded-xl text-[10px] font-black uppercase tracking-widest outline-none"
                                value={termFilter}
                                onChange={(e) => setTermFilter(e.target.value)}
                            >
                                <option value="ALL">All Terms</option>
                                <option value="TERM_1">Term 1</option>
                                <option value="TERM_2">Term 2</option>
                                <option value="TERM_3">Term 3</option>
                            </select>
                            <select
                                className="h-11 px-3 bg-white border border-black/5 rounded-xl text-[10px] font-black uppercase tracking-widest outline-none"
                                value={yearFilter}
                                onChange={(e) => setYearFilter(e.target.value)}
                            >
                                {yearOptions.map((yy) => (
                                    <option key={yy} value={yy}>{yy === 'ALL' ? 'All Years' : yy}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Table */}
                    <div className="flex-1 overflow-x-auto">
                        {loading ? (
                            <div className="p-24 text-center">
                                <Loader2 size={40} className="text-re-orange animate-spin mx-auto mb-4" />
                                <p className="text-[10px] font-black text-re-text-muted uppercase tracking-widest">Accessing Vault...</p>
                            </div>
                        ) : (
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-re-bg/30">
                                        <th className="px-6 py-4 text-[9px] font-black text-re-text-muted uppercase tracking-widest border-b border-black/5">Student</th>
                                        <th className="px-6 py-4 text-[9px] font-black text-re-text-muted uppercase tracking-widest border-b border-black/5">Duration</th>
                                        <th className="px-6 py-4 text-[9px] font-black text-re-text-muted uppercase tracking-widest border-b border-black/5">Reason & Type</th>
                                        <th className="px-6 py-4 text-[9px] font-black text-re-text-muted uppercase tracking-widest border-b border-black/5">Status</th>
                                        <th className="px-6 py-4 text-[9px] font-black text-re-text-muted uppercase tracking-widest border-b border-black/5 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-black/5">
                                    {filteredPermissions.map(p => {
                                        const now = new Date();
                                        const active = p.status === 'APPROVED' && now >= new Date(p.starts_at) && now <= new Date(p.ends_at);

                                        return (
                                            <tr key={p.id} className="hover:bg-re-bg/20 transition-colors group">
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-full bg-re-bg border border-black/5 flex items-center justify-center shrink-0">
                                                            <User size={18} className="text-re-text-muted opacity-40" />
                                                        </div>
                                                        <div>
                                                            <div className="text-xs font-black text-re-text uppercase tracking-tight">{p.first_name} {p.last_name}</div>
                                                            <div className="text-[8px] font-bold text-re-text-muted uppercase tracking-widest">{p.student_uid} • {p.class_name}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="space-y-1">
                                                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-600">
                                                            <CheckCircle size={10} /> {new Date(p.starts_at).toLocaleString('en-US', { dateStyle: 'short', timeStyle: 'short' })}
                                                        </div>
                                                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-red-600">
                                                            <XCircle size={10} /> {new Date(p.ends_at).toLocaleString('en-US', { dateStyle: 'short', timeStyle: 'short' })}
                                                        </div>
                                                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-blue-700">
                                                            <Calendar size={10} /> Returned: {p.actual_return_at ? new Date(p.actual_return_at).toLocaleString('en-US', { dateStyle: 'short', timeStyle: 'short' }) : 'Not yet returned'}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="space-y-1">
                                                        <div className="inline-flex px-2 py-0.5 rounded bg-re-bg border border-black/5 text-[8px] font-black text-re-text-muted uppercase tracking-widest">
                                                            {p.permission_type}
                                                        </div>
                                                        <p className="text-[10px] font-bold text-re-text leading-tight max-w-[200px] truncate">{p.reason || 'No reason provided'}</p>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-2">
                                                        <span className={`px-2 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest ring-1 ${p.status === 'PENDING' ? 'bg-orange-50 text-orange-600 ring-orange-500/20' :
                                                                p.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-600 ring-emerald-500/20' :
                                                                    'bg-red-50 text-red-600 ring-red-500/20'
                                                            }`}>
                                                            {p.status}
                                                        </span>
                                                        {active && (
                                                            <span className="flex items-center gap-1 text-[8px] font-black text-emerald-500 uppercase tracking-widest bg-emerald-100/50 px-2 py-1 rounded-lg animate-pulse">
                                                                <ShieldCheck size={10} /> Currently Out
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <button
                                                            onClick={() => setSelectedPermission(p)}
                                                            className="h-8 w-8 bg-blue-50 text-blue-700 rounded-lg flex items-center justify-center hover:bg-blue-500 hover:text-white transition-all shadow-sm"
                                                            title="View permission details"
                                                        >
                                                            <Eye size={14} />
                                                        </button>
                                                        {p.status === 'PENDING' && (
                                                            <>
                                                                <button
                                                                    onClick={() => handleStatusUpdate(p.id, 'APPROVED')}
                                                                    className="h-8 w-8 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center hover:bg-emerald-500 hover:text-white transition-all shadow-sm"
                                                                >
                                                                    <CheckCircle size={14} />
                                                                </button>
                                                                <button
                                                                    onClick={() => handleStatusUpdate(p.id, 'REJECTED')}
                                                                    className="h-8 w-8 bg-red-50 text-red-600 rounded-lg flex items-center justify-center hover:bg-red-500 hover:text-white transition-all shadow-sm"
                                                                >
                                                                    <XCircle size={14} />
                                                                </button>
                                                            </>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        )}
                        {!loading && filteredPermissions.length === 0 && (
                            <div className="p-24 text-center">
                                <AlertCircle size={40} className="text-re-bg/40 mx-auto mb-4" />
                                <p className="text-[10px] font-black text-re-text-muted uppercase tracking-widest">No permission records found</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* ── CREATE PERMISSION MODAL ── */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#0a192f]/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white rounded-[40px] shadow-2xl border border-black/5 w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-300">
                        <div className="p-8 bg-gradient-to-br from-[#1E3A5F] to-[#0D2644] text-white">
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center backdrop-blur-md">
                                        <FileText size={20} style={{ color: "#FEBF10" }} />
                                    </div>
                                    <h3 className="text-lg font-black uppercase tracking-widest">Issue Out-Pass</h3>
                                </div>
                                <button onClick={() => setIsModalOpen(false)} className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-all">
                                    <XCircle size={20} />
                                </button>
                            </div>
                            <p className="text-[10px] font-bold text-white/60 uppercase tracking-widest">Create a validated permission window for a student</p>
                        </div>

                        <form onSubmit={handleCreate} className="p-8 space-y-6">
                            <div className="space-y-4">
                                <div className="space-y-1.5">
                                    <label className="text-[9px] font-black text-[#1E3A5F] uppercase tracking-widest ml-1">Select Student</label>
                                    <div className="relative">
                                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-re-text-muted">
                                            <Search size={14} />
                                        </div>
                                        <select
                                            required
                                            className="w-full h-12 pl-12 pr-4 bg-re-bg rounded-2xl border border-black/5 outline-none text-[11px] font-semibold appearance-none cursor-pointer"
                                            value={form.student_id}
                                            onChange={e => setForm({ ...form, student_id: e.target.value })}
                                        >
                                            <option value="">Choose Student From Registry...</option>
                                            {students.map(s => (
                                                <option key={s.id} value={s.id}>{s.name} ({s.id})</option>
                                            ))}
                                        </select>
                                        <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-re-text-muted pointer-events-none" />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-[9px] font-black text-[#1E3A5F] uppercase tracking-widest ml-1">From</label>
                                        <input
                                            required type="datetime-local"
                                            className="w-full h-12 px-4 bg-re-bg rounded-2xl border border-black/5 outline-none text-[10px] font-bold uppercase"
                                            value={form.starts_at}
                                            onChange={e => setForm({ ...form, starts_at: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[9px] font-black text-[#1E3A5F] uppercase tracking-widest ml-1">To</label>
                                        <input
                                            required type="datetime-local"
                                            className="w-full h-12 px-4 bg-re-bg rounded-2xl border border-black/5 outline-none text-[10px] font-bold uppercase"
                                            value={form.ends_at}
                                            onChange={e => setForm({ ...form, ends_at: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[9px] font-black text-[#1E3A5F] uppercase tracking-widest ml-1">Leave Type</label>
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                        {['MEDICAL', 'FAMILY', 'OFFICIAL', 'OTHER'].map(type => (
                                            <button
                                                key={type} type="button"
                                                onClick={() => setForm({ ...form, permission_type: type })}
                                                className={`py-2 rounded-xl text-[8px] font-black uppercase tracking-widest transition-all border ${form.permission_type === type ? 'bg-[#1E3A5F] text-white border-[#1E3A5F]' : 'bg-re-bg border-black/5 text-re-text-muted hover:border-[#1E3A5F]/30'
                                                    }`}
                                            >
                                                {type}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[9px] font-black text-[#1E3A5F] uppercase tracking-widest ml-1">Reason / Remarks</label>
                                    <textarea
                                        className="w-full h-24 p-4 bg-re-bg rounded-2xl border border-black/5 outline-none text-xs font-semibold resize-none"
                                        placeholder="Enter detailed reason for permission..."
                                        value={form.reason}
                                        onChange={e => setForm({ ...form, reason: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="flex items-center gap-3 pt-6">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="flex-1 h-13 rounded-2xl border border-black/5 text-re-text font-black text-[10px] uppercase tracking-[0.2em] hover:bg-re-bg transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSaving}
                                    className="flex-[2] h-13 rounded-2xl text-white font-black text-[10px] uppercase tracking-[0.2em] shadow-xl hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2"
                                    style={{ background: "linear-gradient(135deg, #1E3A5F 0%, #0D2644 100%)" }}
                                >
                                    {isSaving ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} style={{ color: "#FEBF10" }} />}
                                    Register Permission
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {selectedPermission && (
                <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-[#0a192f]/60 backdrop-blur-sm">
                    <div className="bg-white rounded-[28px] shadow-2xl border border-black/5 w-full max-w-3xl overflow-hidden">
                        <div className="px-6 py-5 bg-[#000435] text-white flex items-center justify-between">
                            <div>
                                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-white/70">Permission Details</p>
                                <h3 className="text-2xl font-black tracking-tight">PERM-{String(selectedPermission.id).padStart(6, '0')}</h3>
                            </div>
                            <button
                                onClick={() => setSelectedPermission(null)}
                                className="w-11 h-11 rounded-full bg-white/15 text-white flex items-center justify-center hover:bg-white/25 transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-6 bg-white">
                            <div className="grid grid-cols-1 gap-3">
                                {[
                                    ['Student', `${selectedPermission.first_name || ''} ${selectedPermission.last_name || ''}`.trim() || 'Unknown'],
                                    ['Student UID', selectedPermission.student_uid || selectedPermission.student_code || '—'],
                                    ['Class', selectedPermission.class_name || 'N/A'],
                                    ['Type', selectedPermission.permission_type || 'OTHER'],
                                    ['Reason', selectedPermission.reason || 'No reason provided'],
                                    ['Starts', new Date(selectedPermission.starts_at).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })],
                                    ['Ends', new Date(selectedPermission.ends_at).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })],
                                    ['Returned At', selectedPermission.actual_return_at ? new Date(selectedPermission.actual_return_at).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }) : 'Not yet returned'],
                                    ['Status', selectedPermission.status || '—'],
                                    ['Submitted By', `${selectedPermission.req_first || ''} ${selectedPermission.req_last || ''}`.trim() || 'System'],
                                ].map(([label, value]) => (
                                    <div key={label} className="flex items-start justify-between gap-6 py-2 border-b border-black/5">
                                        <p className="text-sm leading-none font-black text-[#1e2a3b]">{label}</p>
                                        <p className="text-base leading-tight text-right font-medium text-[#1e2a3b]">{value}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
