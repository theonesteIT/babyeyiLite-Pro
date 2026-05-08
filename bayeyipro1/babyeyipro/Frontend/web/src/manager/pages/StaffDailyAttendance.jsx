import React, { useState, useEffect, useMemo } from 'react';
import api from '../services/api';
import {
    Briefcase, Search, Users, CheckCircle, XCircle,
    Clock, LogIn, LogOut, ChevronDown, Check, X,
    User, RefreshCw, Save, AlertTriangle, Sun, Moon, Calendar
} from 'lucide-react';
import { useAcademic } from '../context/AcademicContext';
import { calcTermProgress, attendanceRate, rateColor } from '../utils/termProgress';

const STATUS_IN_OPTIONS  = ['Present', 'Late', 'Absent', 'Excused'];
const STATUS_OUT_OPTIONS = ['Checked out', 'Missing'];

const STATUS_IN_COLORS = {
    Present:  { active: 'bg-emerald-500 text-white ring-emerald-400/30', inactive: 'bg-white text-emerald-600 border-emerald-100 hover:bg-emerald-50' },
    Late:     { active: 'bg-amber-500 text-white ring-amber-400/30',     inactive: 'bg-white text-amber-600 border-amber-100 hover:bg-amber-50' },
    Absent:   { active: 'bg-red-500 text-white ring-red-400/30',         inactive: 'bg-white text-red-500 border-red-100 hover:bg-red-50' },
    Excused:  { active: 'bg-blue-500 text-white ring-blue-400/30',       inactive: 'bg-white text-blue-600 border-blue-100 hover:bg-blue-50' },
};

const STATUS_OUT_COLORS = {
    'Checked out': { active: 'bg-teal-500 text-white ring-teal-400/30',  inactive: 'bg-white text-teal-600 border-teal-100 hover:bg-teal-50' },
    Missing:       { active: 'bg-slate-500 text-white ring-slate-400/30', inactive: 'bg-white text-slate-500 border-slate-100 hover:bg-slate-50' },
};

const IN_ICONS  = { Present: <Check size={11} />, Late: <Clock size={11} />, Absent: <X size={11} />, Excused: <AlertTriangle size={11} /> };
const OUT_ICONS = { 'Checked out': <LogOut size={11} />, Missing: <X size={11} /> };

export default function StaffDailyAttendance() {
    const academic = useAcademic();
    const [selectedDate, setSelectedDate]   = useState(new Date().toISOString().split('T')[0]);
    const [staff, setStaff]                 = useState([]);
    const [totals, setTotals]               = useState({ total: 0, present: 0, late: 0, absent: 0, excused: 0, checkedOut: 0 });
    const [loading, setLoading]             = useState(false);
    const [saving, setSaving]               = useState(false);
    const [saved, setSaved]                 = useState(false);
    const [error, setError]                 = useState(null);
    const [searchQuery, setSearchQuery]     = useState('');
    const [activeTab, setActiveTab]         = useState('morning');  // 'morning' | 'evening'
    const [termProgress, setTermProgress]   = useState(null);

    useEffect(() => { loadStaff(); }, [selectedDate]);

    useEffect(() => {
        if (academic.currentTerm) loadTermProgress();
    }, [academic.currentTerm]);

    const loadTermProgress = async () => {
        try {
            const res = await api.get('/dos/attendance/term-progress', { params: { term: academic.currentTerm } });
            if (res.data.success) setTermProgress(res.data.data);
        } catch (_) {}
    };

    const loadStaff = async () => {
        setLoading(true);
        setError(null);
        setSaved(false);
        try {
            const res = await api.get('/dos/attendance/morning/staff', { params: { date: selectedDate } });
            if (!res.data.success) { setError(res.data.message || 'Failed to load'); return; }
            const { staff: rows, totals: t } = res.data.data;
            setStaff((rows || []).map(s => ({
                ...s,
                status_in:  s.status_in  || 'Absent',
                status_out: s.status_out || 'Missing',
            })));
            setTotals(t || { total: 0, present: 0, late: 0, absent: 0, excused: 0, checkedOut: 0 });
        } catch (e) {
            setError(e.response?.data?.message || e.message || 'Could not load staff');
        } finally {
            setLoading(false);
        }
    };

    const handleIn  = (id, status) => setStaff(p => p.map(s => s.teacher_id === id ? { ...s, status_in: status  } : s));
    const handleOut = (id, status) => setStaff(p => p.map(s => s.teacher_id === id ? { ...s, status_out: status } : s));

    const markAllIn  = (status) => setStaff(p => p.map(s => ({ ...s, status_in:  status })));
    const markAllOut = (status) => setStaff(p => p.map(s => ({ ...s, status_out: status })));

    const handleSave = async () => {
        if (staff.length === 0) return;
        setSaving(true);
        setError(null);
        try {
            const records = staff.map(s => ({
                teacher_id: s.teacher_id,
                status_in:  s.status_in,
                status_out: s.status_out,
            }));
            const res = await api.post('/dos/attendance/morning/staff', { date: selectedDate, records });
            if (res.data.success) {
                setSaved(true);
                const present    = staff.filter(s => s.status_in === 'Present').length;
                const late       = staff.filter(s => s.status_in === 'Late').length;
                const absent     = staff.filter(s => s.status_in === 'Absent').length;
                const excused    = staff.filter(s => s.status_in === 'Excused').length;
                const checkedOut = staff.filter(s => s.status_out === 'Checked out').length;
                setTotals({ total: staff.length, present, late, absent, excused, checkedOut });
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
        staff.filter(s =>
            s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (s.role_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            (s.role_code  || '').toLowerCase().includes(searchQuery.toLowerCase())
        ),
        [staff, searchQuery]
    );

    const presentRate = totals.total > 0
        ? Math.round(((totals.present + totals.late) / totals.total) * 100)
        : 0;

    return (
        <div className="animate-in fade-in duration-700 bg-re-bg min-h-screen pb-16">

            {/* ── Hero ── */}
            <div className="relative w-full min-h-[260px] overflow-hidden bg-gradient-to-br from-[#1E3A5F] via-[#263e5e] to-[#0d2644]">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(254,191,16,0.10),transparent_55%)] pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-[#FEBF10]/30 to-transparent pointer-events-none" />

                <div className="relative z-20 max-w-[1600px] mx-auto px-6 md:px-12 pt-14 pb-20">
                    <div className="flex items-center gap-5">
                        <div className="hidden md:flex shrink-0 w-20 h-20 rounded-[24px] border border-white/10 bg-white/5 items-center justify-center backdrop-blur-xl shadow-2xl">
                            <Briefcase size={36} className="text-[#FEBF10]" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2 mb-2">
                                <span className="w-5 h-0.5 bg-[#FEBF10] rounded-full" />
                                <span className="text-[9px] font-black uppercase tracking-[0.3em] text-[#FEBF10]">Staff Roll Call</span>
                            </div>
                            <h1 className="text-2xl md:text-3xl font-semibold text-white tracking-tight leading-none" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                                Staff <span className="text-[#FEBF10]">Daily</span> Attendance
                            </h1>
                            <p className="text-[10px] md:text-xs text-white/50 font-bold uppercase tracking-widest mt-2">
                                Morning check-in · evening check-out · mark every staff member for {selectedDate}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Content card ── */}
            <div className="relative z-30 max-w-[1600px] mx-auto px-2 md:px-6 -mt-14">
                <div className="bg-white rounded-t-[2.5rem] shadow-2xl border border-black/5 overflow-hidden">

                    {/* ── Term Progress Banner ── */}
                    <StaffTermProgressBanner
                        termProgress={termProgress}
                        totals={totals}
                        currentTerm={academic.currentTerm}
                        termCfg={academic.getTermDates(academic.currentTerm)}
                        selectedDate={selectedDate}
                    />

                    {/* Stats */}
                    <div className="grid grid-cols-3 md:grid-cols-6 divide-x divide-y md:divide-y-0 divide-black/5 border-b border-black/5">
                        {[
                            { label: 'Total Staff',   value: totals.total,      icon: <Users size={12} />,       color: 'text-slate-400' },
                            { label: 'Present Rate',  value: `${presentRate}%`, icon: <CheckCircle size={12} />, color: 'text-emerald-500' },
                            { label: 'Late',          value: totals.late,       icon: <Clock size={12} />,        color: 'text-amber-500' },
                            { label: 'Absent',        value: totals.absent,     icon: <XCircle size={12} />,      color: 'text-red-500' },
                            { label: 'Excused',       value: totals.excused,    icon: <AlertTriangle size={12} />,color: 'text-blue-500' },
                            { label: 'Checked Out',   value: totals.checkedOut, icon: <LogOut size={12} />,       color: 'text-teal-500' },
                        ].map((s, i) => (
                            <div key={i} className="p-3 sm:p-5 flex flex-col items-center justify-center text-center group hover:bg-slate-50 transition-all">
                                <div className={`${s.color} opacity-50 mb-1`}>{s.icon}</div>
                                <div className="text-base sm:text-xl font-black text-slate-800 tracking-tighter group-hover:text-[#1E3A5F]">{s.value}</div>
                                <div className="text-[7px] font-black text-slate-400 uppercase tracking-[0.18em] mt-0.5">{s.label}</div>
                            </div>
                        ))}
                    </div>

                    {/* Tab selector + toolbar */}
                    <div className="px-4 pt-3 pb-0 border-b border-black/5 bg-slate-50/50 flex flex-col gap-3">

                        {/* Morning / Evening tabs */}
                        <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1 w-fit">
                            <button
                                onClick={() => setActiveTab('morning')}
                                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${activeTab === 'morning' ? 'bg-white text-[#1E3A5F] shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                            >
                                <Sun size={11} /> Morning
                            </button>
                            <button
                                onClick={() => setActiveTab('evening')}
                                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${activeTab === 'evening' ? 'bg-white text-[#1E3A5F] shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                            >
                                <Moon size={11} /> Evening
                            </button>
                        </div>

                        {/* Toolbar row */}
                        <div className="flex flex-col lg:flex-row items-center gap-3 pb-3">
                            {/* Date */}
                            <div className="relative w-full lg:w-44">
                                <Sun size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                    type="date"
                                    value={selectedDate}
                                    onChange={e => setSelectedDate(e.target.value)}
                                    className="w-full pl-9 pr-3 h-10 bg-white border border-black/8 rounded-xl text-[11px] font-black text-slate-700 focus:outline-none focus:border-[#1E3A5F]/30 shadow-sm"
                                />
                            </div>

                            {/* Search */}
                            <div className="relative flex-1 w-full">
                                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Search staff name or role…"
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                    className="w-full pl-9 pr-4 h-10 bg-white border border-black/8 rounded-xl text-[11px] font-bold text-slate-700 focus:outline-none focus:border-[#1E3A5F]/30 shadow-sm"
                                />
                            </div>

                            {/* Bulk */}
                            {activeTab === 'morning' ? (
                                <div className="flex items-center gap-2 shrink-0">
                                    <button onClick={() => markAllIn('Present')} className="h-10 px-3 bg-emerald-50 text-emerald-700 text-[9px] font-black uppercase tracking-wider rounded-xl border border-emerald-100 hover:bg-emerald-100 transition-colors">All Present</button>
                                    <button onClick={() => markAllIn('Absent')}  className="h-10 px-3 bg-red-50 text-red-600 text-[9px] font-black uppercase tracking-wider rounded-xl border border-red-100 hover:bg-red-100 transition-colors">All Absent</button>
                                </div>
                            ) : (
                                <div className="flex items-center gap-2 shrink-0">
                                    <button onClick={() => markAllOut('Checked out')} className="h-10 px-3 bg-teal-50 text-teal-700 text-[9px] font-black uppercase tracking-wider rounded-xl border border-teal-100 hover:bg-teal-100 transition-colors">All Checked Out</button>
                                    <button onClick={() => markAllOut('Missing')}     className="h-10 px-3 bg-slate-100 text-slate-600 text-[9px] font-black uppercase tracking-wider rounded-xl border border-slate-200 hover:bg-slate-200 transition-colors">All Missing</button>
                                </div>
                            )}

                            <button
                                onClick={loadStaff}
                                disabled={loading}
                                className="h-10 w-10 flex items-center justify-center bg-white border border-black/8 rounded-xl text-slate-500 hover:bg-slate-100 transition-colors shrink-0"
                            >
                                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                            </button>

                            <button
                                onClick={handleSave}
                                disabled={saving || staff.length === 0}
                                className={`h-10 px-5 flex items-center gap-2 rounded-xl text-[9px] font-black uppercase tracking-widest shadow transition-all shrink-0
                                    ${saved ? 'bg-emerald-500 text-white' : 'bg-[#1E3A5F] text-white hover:bg-[#0d2644] active:scale-95'}`}
                            >
                                {saving ? <RefreshCw size={13} className="animate-spin" /> : saved ? <Check size={13} /> : <Save size={13} />}
                                {saving ? 'Saving…' : saved ? 'Saved!' : 'Save Records'}
                            </button>
                        </div>
                    </div>

                    {error && (
                        <div className="px-6 py-3 bg-red-50 border-b border-red-100 text-red-700 text-xs font-bold">{error}</div>
                    )}

                    {/* Table */}
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse min-w-[680px]">
                            <thead>
                                <tr className="bg-slate-50 border-b border-black/5">
                                    <th className="px-3 py-3 text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] w-10 text-center border-r border-black/5">#</th>
                                    <th className="px-4 py-3 text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] border-r border-black/5">Staff Member</th>
                                    <th className="hidden md:table-cell px-4 py-3 text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] border-r border-black/5">Role</th>
                                    <th className="px-4 py-3 text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] text-center">
                                        {activeTab === 'morning' ? (
                                            <span className="flex items-center justify-center gap-1.5"><Sun size={11} /> Morning Check-In</span>
                                        ) : (
                                            <span className="flex items-center justify-center gap-1.5"><Moon size={11} /> Evening Check-Out</span>
                                        )}
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr>
                                        <td colSpan={4} className="py-16 text-center">
                                            <RefreshCw className="animate-spin inline text-[#1E3A5F] mb-2" size={22} />
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">Loading staff…</p>
                                        </td>
                                    </tr>
                                ) : filtered.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="py-16 text-center">
                                            <Users size={28} className="inline text-slate-300 mb-3" />
                                            <p className="text-xs font-black text-slate-400 uppercase tracking-widest">No staff found</p>
                                        </td>
                                    </tr>
                                ) : filtered.map((s, idx) => (
                                    <tr key={s.teacher_id} className="hover:bg-slate-50/80 transition-colors border-b border-black/4 group">
                                        <td className="px-3 py-3 text-center text-[10px] font-black text-slate-300 border-r border-black/5">{idx + 1}</td>
                                        <td className="px-4 py-3 border-r border-black/5">
                                            <div className="flex items-center gap-2.5">
                                                <StaffAvatar name={s.name} />
                                                <div>
                                                    <p className="text-[11px] font-black text-slate-800 group-hover:text-[#1E3A5F] transition-colors">{s.name}</p>
                                                    {activeTab === 'morning' ? (
                                                        <StatusChip status={s.status_in} type="in" />
                                                    ) : (
                                                        <StatusChip status={s.status_out} type="out" />
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="hidden md:table-cell px-4 py-3 border-r border-black/5">
                                            <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider bg-slate-100 px-2.5 py-1 rounded-lg">
                                                {s.role_name || s.role_code || '—'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center justify-center gap-1.5 flex-wrap">
                                                {activeTab === 'morning' ? (
                                                    STATUS_IN_OPTIONS.map(opt => (
                                                        <DayBtn
                                                            key={opt}
                                                            active={s.status_in === opt}
                                                            onClick={() => handleIn(s.teacher_id, opt)}
                                                            theme={STATUS_IN_COLORS[opt]}
                                                            icon={IN_ICONS[opt]}
                                                            label={opt}
                                                        />
                                                    ))
                                                ) : (
                                                    STATUS_OUT_OPTIONS.map(opt => (
                                                        <DayBtn
                                                            key={opt}
                                                            active={s.status_out === opt}
                                                            onClick={() => handleOut(s.teacher_id, opt)}
                                                            theme={STATUS_OUT_COLORS[opt]}
                                                            icon={OUT_ICONS[opt]}
                                                            label={opt}
                                                        />
                                                    ))
                                                )}
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
                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em]">
                                Staff daily attendance · {selectedDate} · {activeTab === 'morning' ? 'Morning in' : 'Evening out'}
                            </span>
                        </div>
                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{filtered.length} staff shown</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ── Staff Term Progress Banner ────────────────────────────────────────────────
function StaffTermProgressBanner({ termProgress, totals, currentTerm, termCfg, selectedDate }) {
    const progress = useMemo(() => {
        if (termProgress?.configured) return termProgress;
        return calcTermProgress(termCfg, selectedDate);
    }, [termProgress, termCfg, selectedDate]);

    const backendRate  = termProgress?.staff?.attendancePct;
    const todayPresent = (totals?.present || 0) + (totals?.late || 0);
    const displayRate  = backendRate != null ? backendRate : attendanceRate(todayPresent, progress.elapsedWorkingDays);
    const colors       = rateColor(displayRate);

    if (!progress.configured && !termCfg) {
        return (
            <div className="px-6 py-3 bg-amber-50 border-b border-amber-100 flex items-center gap-3">
                <Calendar size={14} className="text-amber-500 shrink-0" />
                <p className="text-[10px] font-black text-amber-700 uppercase tracking-widest">
                    No term dates set — go to <span className="underline">Settings → Preferences</span> to enable the attendance progress bar.
                </p>
            </div>
        );
    }

    return (
        <div className="px-5 py-4 border-b border-black/5 bg-gradient-to-r from-slate-50 to-white">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex items-center gap-3 shrink-0">
                    <div className={`w-14 h-14 rounded-2xl ${colors.bg} border ${colors.ring.replace('ring-', 'border-').replace('/20', '/30')} flex flex-col items-center justify-center shadow-sm`}>
                        <span className={`text-base font-black ${colors.text} leading-none`}>{displayRate}%</span>
                        <span className="text-[7px] font-black text-slate-400 uppercase tracking-wider leading-tight mt-0.5">present</span>
                    </div>
                    <div>
                        <p className="text-[11px] font-black text-slate-800 uppercase tracking-tight">{currentTerm || 'Term'} Staff Attendance</p>
                        <p className="text-[9px] font-bold text-slate-400">
                            {progress.elapsedWorkingDays} of {progress.totalWorkingDays} working days elapsed
                        </p>
                        {progress.start && progress.end && (
                            <p className="text-[8px] font-bold text-slate-400 mt-0.5">{progress.start} → {progress.end}</p>
                        )}
                    </div>
                </div>

                <div className="flex-1 space-y-2.5 min-w-0">
                    <div>
                        <div className="flex items-center justify-between mb-1">
                            <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Staff Attendance Rate</span>
                            <span className={`text-[10px] font-black ${colors.text}`}>{displayRate}% present</span>
                        </div>
                        <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                            <div
                                className={`h-full ${colors.bar} rounded-full transition-all duration-700`}
                                style={{ width: `${Math.min(100, displayRate)}%` }}
                            />
                        </div>
                    </div>
                    <div>
                        <div className="flex items-center justify-between mb-1">
                            <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Term Progress</span>
                            <span className="text-[10px] font-black text-slate-500">{progress.termProgressPct}% elapsed · {progress.remainingWorkingDays} days left</span>
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

function StaffAvatar({ name }) {
    const initials = (name || '??').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
    const palettes = [
        'from-[#1E3A5F] to-[#0d2644]',
        'from-amber-500 to-orange-500',
        'from-teal-500 to-emerald-500',
        'from-blue-500 to-indigo-500',
        'from-purple-500 to-pink-500',
    ];
    const bg = palettes[(name || '').charCodeAt(0) % palettes.length];
    return (
        <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${bg} flex items-center justify-center text-white text-[11px] font-black shrink-0 shadow-sm`}>
            {initials}
        </div>
    );
}

function StatusChip({ status, type }) {
    if (!status) return null;
    const map = {
        in: {
            Present:       'text-emerald-600 bg-emerald-50 border-emerald-100',
            Late:          'text-amber-600 bg-amber-50 border-amber-100',
            Absent:        'text-red-600 bg-red-50 border-red-100',
            Excused:       'text-blue-600 bg-blue-50 border-blue-100',
        },
        out: {
            'Checked out': 'text-teal-600 bg-teal-50 border-teal-100',
            Missing:       'text-slate-500 bg-slate-100 border-slate-200',
        },
    };
    const cls = (map[type] || {})[status] || 'text-slate-400 bg-slate-50 border-slate-100';
    return (
        <span className={`inline-block mt-0.5 text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md border ${cls}`}>{status}</span>
    );
}

function DayBtn({ active, onClick, theme, icon, label }) {
    return (
        <button
            onClick={onClick}
            title={label}
            className={`flex items-center gap-1 px-2.5 h-8 rounded-xl border text-[9px] font-black uppercase tracking-widest transition-all duration-150 ring-2 ring-transparent
                ${active ? theme.active + ' ring-2 shadow-md' : theme.inactive}`}
        >
            {icon}
            <span className="hidden sm:inline">{label}</span>
        </button>
    );
}
