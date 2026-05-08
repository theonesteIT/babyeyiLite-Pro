import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    Shield, Activity, Users, Globe, Search, RefreshCw, ChevronLeft, ChevronRight,
    Clock, AlertTriangle, CheckCircle, LogIn, Edit3, Trash2, Plus, Eye,
    Download, Filter, X, Wifi, MapPin, User, Calendar
} from 'lucide-react';
import api from '../services/api';

// ─── helpers ──────────────────────────────────────────────────
function timeAgo(dateStr) {
    if (!dateStr) return '—';
    const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
    return new Date(dateStr).toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatDate(dateStr) {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleString('en', {
        month: 'short', day: 'numeric', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
    });
}

function parseEndpoint(ep = '') {
    const clean = ep.replace(/^\//, '');
    const parts = clean.split('/');
    return parts[0] || ep;
}

const ACTION_STYLE = {
    CREATE: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', icon: Plus },
    UPDATE: { bg: 'bg-amber-50',   text: 'text-amber-700',   border: 'border-amber-200',   icon: Edit3 },
    DELETE: { bg: 'bg-red-50',     text: 'text-red-700',     border: 'border-red-200',     icon: Trash2 },
    READ:   { bg: 'bg-blue-50',    text: 'text-blue-700',    border: 'border-blue-200',    icon: Eye },
    LOGIN:  { bg: 'bg-violet-50',  text: 'text-violet-700',  border: 'border-violet-200',  icon: LogIn },
};
function actionStyle(name = '') {
    const n = name.toUpperCase();
    for (const [k, v] of Object.entries(ACTION_STYLE)) if (n.includes(k)) return v;
    return { bg: 'bg-slate-50', text: 'text-slate-600', border: 'border-slate-200', icon: Activity };
}

const ROLE_COLORS = {
    SCHOOL_MANAGER: 'bg-[#1E3A5F]/10 text-[#1E3A5F]',
    SCHOOL_ADMIN:   'bg-[#1E3A5F]/10 text-[#1E3A5F]',
    TEACHER:        'bg-emerald-50 text-emerald-700',
    ACCOUNTANT:     'bg-amber-50 text-amber-700',
    DOS:            'bg-violet-50 text-violet-700',
    HOD:            'bg-blue-50 text-blue-700',
};
function roleColor(code = '') {
    return ROLE_COLORS[code?.toUpperCase()] || 'bg-slate-100 text-slate-600';
}

// ─── sub-components ───────────────────────────────────────────
const KpiCard = ({ icon: Icon, label, value, sub, accent = '#1E3A5F' }) => (
    <div className="bg-white border border-slate-100 rounded-2xl p-4 flex items-center gap-4 shadow-sm">
        <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: `${accent}12` }}>
            <Icon size={18} style={{ color: accent }} />
        </div>
        <div className="min-w-0">
            <p className="text-xl font-black text-slate-800 leading-none">{value ?? '—'}</p>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">{label}</p>
            {sub && <p className="text-[9px] text-slate-300 font-bold mt-0.5">{sub}</p>}
        </div>
    </div>
);

const Pagination = ({ page, totalPages, onPrev, onNext }) => (
    <div className="flex items-center justify-between pt-4 border-t border-slate-100">
        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
            Page {page} of {totalPages}
        </span>
        <div className="flex gap-2">
            <button onClick={onPrev} disabled={page <= 1}
                className="w-8 h-8 rounded-xl border border-slate-200 flex items-center justify-center hover:bg-slate-50 disabled:opacity-30 transition-all">
                <ChevronLeft size={14} className="text-slate-600" />
            </button>
            <button onClick={onNext} disabled={page >= totalPages}
                className="w-8 h-8 rounded-xl border border-slate-200 flex items-center justify-center hover:bg-slate-50 disabled:opacity-30 transition-all">
                <ChevronRight size={14} className="text-slate-600" />
            </button>
        </div>
    </div>
);

// ─── Activity Log Tab ─────────────────────────────────────────
const ActivityLog = () => {
    const [rows, setRows]         = useState([]);
    const [loading, setLoading]   = useState(true);
    const [error, setError]       = useState(null);
    const [page, setPage]         = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [total, setTotal]       = useState(0);
    const [search, setSearch]     = useState('');
    const [portal, setPortal]     = useState('');
    const [action, setAction]     = useState('');
    const searchTimer             = useRef(null);

    const fetch = useCallback(async (pg = 1, sr = search, pt = portal, ac = action) => {
        setLoading(true); setError(null);
        try {
            const params = { page: pg, limit: 50 };
            if (sr) params.action = sr;
            if (pt) params.portal = pt;
            if (ac) params.action = ac;
            const res = await api.get('/admin/portal-audit-logs', { params });
            if (res.data?.success) {
                setRows(res.data.data || []);
                setPage(res.data.pagination?.page || 1);
                setTotalPages(res.data.pagination?.totalPages || 1);
                setTotal(res.data.pagination?.total || 0);
            } else { setError(res.data?.message || 'Failed'); }
        } catch { setError('Failed to load activity logs.'); }
        finally { setLoading(false); }
    }, [search, portal, action]);

    useEffect(() => { fetch(1); }, [portal, action]);

    const handleSearch = (v) => {
        setSearch(v);
        clearTimeout(searchTimer.current);
        searchTimer.current = setTimeout(() => fetch(1, v, portal, action), 400);
    };

    return (
        <div className="space-y-4">
            {/* Filters */}
            <div className="flex flex-wrap gap-3">
                <div className="relative flex-1 min-w-[180px]">
                    <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        value={search} onChange={e => handleSearch(e.target.value)}
                        placeholder="Search action…"
                        className="w-full pl-8 pr-3 py-2.5 text-[11px] font-bold bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/20 placeholder:text-slate-300"
                    />
                </div>
                <select value={portal} onChange={e => { setPortal(e.target.value); setPage(1); }}
                    className="px-3 py-2.5 text-[11px] font-bold bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/20 text-slate-600">
                    <option value="">All portals</option>
                    <option value="teacher">Teacher</option>
                    <option value="accountant">Accountant</option>
                    <option value="manager">Manager</option>
                    <option value="admin">Admin</option>
                    <option value="store">Store</option>
                </select>
                <button onClick={() => fetch(page)} className="flex items-center gap-1.5 px-3 py-2.5 bg-[#1E3A5F] text-white rounded-xl text-[11px] font-black uppercase tracking-wide hover:bg-[#0D2644] transition-colors">
                    <RefreshCw size={12} className={loading ? 'animate-spin' : ''} /> Refresh
                </button>
            </div>

            {/* Total */}
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                {total.toLocaleString()} entries
            </p>

            {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-100 rounded-xl text-[11px] text-red-600 font-bold">
                    <AlertTriangle size={14} /> {error}
                </div>
            )}

            {/* Table — desktop */}
            <div className="hidden md:block overflow-hidden rounded-2xl border border-slate-100">
                <table className="w-full text-left">
                    <thead>
                        <tr className="bg-slate-50 border-b border-slate-100">
                            {['Action', 'Endpoint', 'Entity', 'Role', 'Time'].map(h => (
                                <th key={h} className="px-4 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={5} className="px-4 py-12 text-center">
                                <RefreshCw size={20} className="animate-spin text-slate-300 mx-auto" />
                            </td></tr>
                        ) : rows.length === 0 ? (
                            <tr><td colSpan={5} className="px-4 py-12 text-center text-[11px] font-bold text-slate-300">No activity found</td></tr>
                        ) : rows.map(r => {
                            const s = actionStyle(r.action_name);
                            const S = s.icon;
                            return (
                                <tr key={r.id} className="border-b border-slate-50 hover:bg-slate-50/60 transition-colors">
                                    <td className="px-4 py-3">
                                        <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-black border ${s.bg} ${s.text} ${s.border}`}>
                                            <S size={10} /> {r.action_name || '—'}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 max-w-[200px]">
                                        <p className="text-[11px] font-bold text-slate-700 truncate">{r.endpoint || '—'}</p>
                                        <p className="text-[9px] text-slate-400 font-bold mt-0.5 uppercase tracking-wider">{parseEndpoint(r.endpoint)}</p>
                                    </td>
                                    <td className="px-4 py-3">
                                        <p className="text-[11px] font-bold text-slate-600">{r.entity_type || '—'}</p>
                                        {r.entity_id && <p className="text-[9px] text-slate-400 font-bold">#{r.entity_id}</p>}
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={`inline-flex px-2 py-1 rounded-lg text-[9px] font-black ${roleColor(r.role_code)}`}>
                                            {r.role_code || '—'}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <p className="text-[11px] font-bold text-slate-600 whitespace-nowrap">{timeAgo(r.created_at)}</p>
                                        <p className="text-[9px] text-slate-300 font-bold">{formatDate(r.created_at).split(',')[0]}</p>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Cards — mobile */}
            <div className="md:hidden space-y-3">
                {loading ? (
                    <div className="py-12 text-center"><RefreshCw size={20} className="animate-spin text-slate-300 mx-auto" /></div>
                ) : rows.length === 0 ? (
                    <div className="py-12 text-center text-[11px] font-bold text-slate-300">No activity found</div>
                ) : rows.map(r => {
                    const s = actionStyle(r.action_name);
                    const S = s.icon;
                    return (
                        <div key={r.id} className="bg-white border border-slate-100 rounded-2xl p-4 space-y-2">
                            <div className="flex items-center justify-between gap-2">
                                <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-black border ${s.bg} ${s.text} ${s.border}`}>
                                    <S size={10} /> {r.action_name || '—'}
                                </span>
                                <span className="text-[10px] font-bold text-slate-400">{timeAgo(r.created_at)}</span>
                            </div>
                            <p className="text-[11px] font-bold text-slate-700 truncate">{r.endpoint || '—'}</p>
                            <div className="flex items-center gap-2">
                                <span className={`inline-flex px-2 py-0.5 rounded-lg text-[9px] font-black ${roleColor(r.role_code)}`}>{r.role_code || '—'}</span>
                                {r.entity_type && <span className="text-[9px] text-slate-400 font-bold">{r.entity_type}</span>}
                            </div>
                        </div>
                    );
                })}
            </div>

            <Pagination page={page} totalPages={totalPages}
                onPrev={() => fetch(page - 1)} onNext={() => fetch(page + 1)} />
        </div>
    );
};

// ─── Staff Logins Tab ─────────────────────────────────────────
const StaffLogins = () => {
    const [rows, setRows]         = useState([]);
    const [loading, setLoading]   = useState(true);
    const [error, setError]       = useState(null);
    const [page, setPage]         = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [total, setTotal]       = useState(0);
    const [search, setSearch]     = useState('');
    const searchTimer             = useRef(null);

    const fetch = useCallback(async (pg = 1, sr = search) => {
        setLoading(true); setError(null);
        try {
            const res = await api.get('/admin/staff-logins', { params: { page: pg, limit: 60, search: sr } });
            if (res.data?.success) {
                setRows(res.data.data || []);
                setPage(res.data.pagination?.page || 1);
                setTotalPages(res.data.pagination?.totalPages || 1);
                setTotal(res.data.pagination?.total || 0);
            } else { setError(res.data?.message || 'Failed'); }
        } catch { setError('Failed to load staff logins.'); }
        finally { setLoading(false); }
    }, [search]);

    useEffect(() => { fetch(1); }, []);

    const handleSearch = (v) => {
        setSearch(v);
        clearTimeout(searchTimer.current);
        searchTimer.current = setTimeout(() => fetch(1, v), 400);
    };

    const loggedInToday = rows.filter(r => {
        if (!r.last_login) return false;
        const d = new Date(r.last_login);
        const now = new Date();
        return d.toDateString() === now.toDateString();
    }).length;

    return (
        <div className="space-y-4">
            {/* Search bar */}
            <div className="flex flex-wrap gap-3">
                <div className="relative flex-1 min-w-[200px]">
                    <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        value={search} onChange={e => handleSearch(e.target.value)}
                        placeholder="Search by name or email…"
                        className="w-full pl-8 pr-3 py-2.5 text-[11px] font-bold bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/20 placeholder:text-slate-300"
                    />
                </div>
                <button onClick={() => fetch(page)} className="flex items-center gap-1.5 px-3 py-2.5 bg-[#1E3A5F] text-white rounded-xl text-[11px] font-black uppercase tracking-wide hover:bg-[#0D2644] transition-colors">
                    <RefreshCw size={12} className={loading ? 'animate-spin' : ''} /> Refresh
                </button>
            </div>

            {/* Mini stats */}
            <div className="flex gap-3 flex-wrap text-[10px] font-black text-slate-400 uppercase tracking-widest">
                <span>{total.toLocaleString()} total staff</span>
                <span className="text-slate-200">·</span>
                <span className="text-emerald-600">{loggedInToday} logged in today</span>
            </div>

            {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-100 rounded-xl text-[11px] text-red-600 font-bold">
                    <AlertTriangle size={14} /> {error}
                </div>
            )}

            {/* Grid — cards */}
            {loading ? (
                <div className="py-14 text-center"><RefreshCw size={22} className="animate-spin text-slate-200 mx-auto" /></div>
            ) : rows.length === 0 ? (
                <div className="py-14 text-center text-[11px] font-bold text-slate-300">No staff records found</div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {rows.map(r => {
                        const isToday = r.last_login
                            ? new Date(r.last_login).toDateString() === new Date().toDateString()
                            : false;
                        const initials = `${(r.first_name || '?')[0]}${(r.last_name || '')[0] || ''}`.toUpperCase();
                        return (
                            <div key={r.id} className={`bg-white border rounded-2xl p-4 space-y-3 transition-all hover:shadow-md ${isToday ? 'border-emerald-200' : 'border-slate-100'}`}>
                                {/* Header */}
                                <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-[13px] font-black shrink-0 ${isToday ? 'bg-emerald-100 text-emerald-700' : 'bg-[#1E3A5F]/10 text-[#1E3A5F]'}`}>
                                        {initials}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[12px] font-black text-slate-800 truncate uppercase tracking-tight">
                                            {r.first_name} {r.last_name}
                                        </p>
                                        <p className="text-[9px] text-slate-400 font-bold truncate">{r.email || '—'}</p>
                                    </div>
                                    {isToday && (
                                        <span className="flex items-center gap-1 px-2 py-0.5 bg-emerald-50 border border-emerald-200 rounded-full text-[8px] font-black text-emerald-600">
                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Online
                                        </span>
                                    )}
                                </div>

                                {/* Role */}
                                <div className="flex items-center justify-between">
                                    <span className={`inline-flex px-2 py-1 rounded-lg text-[9px] font-black ${roleColor(r.role_code)}`}>
                                        {r.role_code || 'No role'}
                                    </span>
                                    {r.failed_login_attempts > 0 && (
                                        <span className="flex items-center gap-1 text-[9px] font-black text-amber-600">
                                            <AlertTriangle size={10} /> {r.failed_login_attempts} failed
                                        </span>
                                    )}
                                </div>

                                {/* Login details */}
                                <div className="space-y-1.5 pt-1 border-t border-slate-50">
                                    <div className="flex items-center gap-2 text-[10px] text-slate-500 font-bold">
                                        <Clock size={11} className="text-slate-300 shrink-0" />
                                        <span className="truncate">
                                            {r.last_login ? formatDate(r.last_login) : 'Never logged in'}
                                        </span>
                                    </div>
                                    {r.last_login && (
                                        <div className="flex items-center gap-2 text-[10px] text-slate-400 font-bold">
                                            <Globe size={11} className="text-slate-300 shrink-0" />
                                            <span className="font-mono text-[10px]">{r.last_login_ip || 'IP not recorded'}</span>
                                        </div>
                                    )}
                                    <div className="flex items-center gap-2 text-[9px] text-slate-300 font-bold">
                                        <Calendar size={11} className="shrink-0" />
                                        {r.last_login ? timeAgo(r.last_login) : '—'}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            <Pagination page={page} totalPages={totalPages}
                onPrev={() => fetch(page - 1)} onNext={() => fetch(page + 1)} />
        </div>
    );
};

// ─── Main Audit Center Page ───────────────────────────────────
const AuditCenter = () => {
    const [tab, setTab] = useState('activity');
    const [kpi, setKpi] = useState({ todayActivity: 0, weekLogins: 0, uniqueIps: 0 });

    useEffect(() => {
        (async () => {
            try {
                const [actRes, loginRes] = await Promise.allSettled([
                    api.get('/admin/portal-audit-logs', { params: { limit: 200, from: new Date().toISOString().slice(0, 10) } }),
                    api.get('/admin/staff-logins', { params: { limit: 200 } }),
                ]);
                const acts  = actRes.status  === 'fulfilled' && actRes.value.data?.success  ? actRes.value.data.data  : [];
                const logins = loginRes.status === 'fulfilled' && loginRes.value.data?.success ? loginRes.value.data.data : [];

                const weekAgo = Date.now() - 7 * 86400_000;
                const weekLogins = logins.filter(r => r.last_login && new Date(r.last_login).getTime() > weekAgo).length;
                const uniqueIps  = new Set(logins.map(r => r.last_login_ip).filter(Boolean)).size;

                setKpi({ todayActivity: acts.length, weekLogins, uniqueIps });
            } catch { /* ignore */ }
        })();
    }, []);

    const TABS = [
        { id: 'activity', label: 'Activity Log',   icon: Activity },
        { id: 'logins',   label: 'Staff Logins',   icon: LogIn },
    ];

    return (
        <div className="min-h-screen bg-slate-50/60 pb-20" style={{ fontFamily: "'Montserrat', sans-serif" }}>
            <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />

            {/* ── Page header ── */}
            <div className="relative bg-[#c87800] px-5 md:px-8 py-10 overflow-hidden">
                <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full border border-white/5 pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none" />
                <div className="relative max-w-6xl mx-auto flex items-center gap-4">
                    <div className="hidden md:flex w-14 h-14 rounded-2xl border border-white/10 bg-white/10 items-center justify-center shrink-0 backdrop-blur-xl">
                        <Shield size={26} className="text-white" />
                    </div>
                    <div>
                        <p className="text-[9px] font-semibold uppercase tracking-[0.25em] text-white/60 mb-0.5" style={{ fontFamily: "'Montserrat', sans-serif" }}>Security Dashboard</p>
                        <h1 className="text-2xl md:text-3xl font-semibold text-white uppercase tracking-tight" style={{ fontFamily: "'Montserrat', sans-serif" }}>Audit Center</h1>
                        <p className="text-[10px] font-medium text-white/60 uppercase tracking-widest mt-0.5" style={{ fontFamily: "'Montserrat', sans-serif" }}>School system activity &amp; access logs</p>
                    </div>
                </div>
            </div>

            <div className="max-w-6xl mx-auto px-4 md:px-8 py-6 space-y-6">

                {/* ── KPI strip ── */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <KpiCard icon={Activity}    label="Activities Today"     value={kpi.todayActivity}  sub="Portal operations"    accent="#1E3A5F" />
                    <KpiCard icon={Users}        label="Staff Logins (7d)"    value={kpi.weekLogins}     sub="Unique accounts"       accent="#10b981" />
                    <KpiCard icon={Globe}        label="Unique IP Addresses"  value={kpi.uniqueIps}      sub="Across all staff"      accent="#FEBF10" />
                </div>

                {/* ── Tab panel ── */}
                <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">

                    {/* Tab bar */}
                    <div className="flex border-b border-slate-100 bg-slate-50/60">
                        {TABS.map(t => {
                            const T = t.icon;
                            const active = tab === t.id;
                            return (
                                <button
                                    key={t.id}
                                    onClick={() => setTab(t.id)}
                                    className={`flex items-center gap-2 px-5 py-3.5 text-[11px] font-black uppercase tracking-widest transition-all border-b-2 ${active ? 'border-[#1E3A5F] text-[#1E3A5F] bg-white' : 'border-transparent text-slate-400 hover:text-slate-600 hover:bg-white/60'}`}
                                >
                                    <T size={13} />
                                    <span className="hidden sm:inline">{t.label}</span>
                                </button>
                            );
                        })}
                    </div>

                    {/* Tab content */}
                    <div className="p-4 md:p-6">
                        {tab === 'activity' && <ActivityLog />}
                        {tab === 'logins'   && <StaffLogins />}
                    </div>
                </div>

                {/* ── Footer note ── */}
                <p className="text-center text-[9px] font-bold text-slate-300 uppercase tracking-widest pb-4">
                    Babyeyi Audit Center · All times are server-local · Data is school-scoped
                </p>
            </div>
        </div>
    );
};

export default AuditCenter;
