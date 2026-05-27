import React, { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { toDateInputValue } from '../../shared/dateInput';
import {
    Settings, Calendar, Globe, Bell, Smartphone, Moon,
    Save, HardDrive, Plus, ShieldCheck, RefreshCw, X, Watch, Loader2,
    ChevronLeft, ChevronRight, Trash2, Clock, Users, BookOpen
} from 'lucide-react';

// ─── constants ────────────────────────────────────────────────
const EVENT_TYPES = [
    { value: 'HOLIDAY',   label: 'Holiday',   color: '#ef4444' },
    { value: 'EXAM',      label: 'Exam',      color: '#8b5cf6' },
    { value: 'SPORT',     label: 'Sport',     color: '#10b981' },
    { value: 'CEREMONY',  label: 'Ceremony',  color: '#FEBF10' },
    { value: 'MEETING',   label: 'Meeting',   color: '#3b82f6' },
    { value: 'TERM',      label: 'Term',      color: '#1E3A5F' },
    { value: 'OTHER',     label: 'Other',     color: '#64748b' },
];
const typeColor  = (t) => EVENT_TYPES.find(e => e.value === t)?.color || '#64748b';
const typeLabel  = (t) => EVENT_TYPES.find(e => e.value === t)?.label || t;

const MONTHS = ['January','February','March','April','May','June',
                'July','August','September','October','November','December'];
const DAYS   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

// ─── helpers ──────────────────────────────────────────────────
function calendarGrid(year, month) {
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells = [];
    for (let i = 0; i < firstDay; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    return cells;
}

// ─── sub-components ───────────────────────────────────────────
const Field = ({ label, children }) => (
    <div className="space-y-1.5">
        <label className="text-[9px] font-semibold text-[#1E3A5F] uppercase tracking-widest ml-1">{label}</label>
        {children}
    </div>
);

const inputCls = 'w-full h-11 px-4 bg-slate-50 rounded-2xl border border-black/5 focus:ring-2 ring-[#FEBF10]/50 outline-none text-xs font-bold';
const selectCls = `${inputCls} cursor-pointer`;

// ── MODAL wrapper ──────────────────────────────────────────────
const Modal = ({ title, subtitle, icon: Icon, onClose, children }) => (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-[#0a192f]/60 backdrop-blur-sm animate-in fade-in duration-300">
        <div className="bg-white rounded-[32px] shadow-sm border border-black/10 w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-6 bg-gradient-to-br from-[#1E3A5F] to-[#0D2644] text-white">
                <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center">
                            <Icon size={16} style={{ color: '#FEBF10' }} />
                        </div>
                        <h3 className="text-sm font-semibold uppercase tracking-widest">{title}</h3>
                    </div>
                    <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all">
                        <X size={15} />
                    </button>
                </div>
                <p className="text-[10px] font-bold text-white/50 uppercase tracking-widest">{subtitle}</p>
            </div>
            <div className="p-6">{children}</div>
        </div>
    </div>
);

// ─── ATTENDANCE EVENTS TAB ─────────────────────────────────────
const AttendanceEvents = () => {
    const [events, setEvents]     = useState([]);
    const [loading, setLoading]   = useState(false);
    const [saving, setSaving]     = useState(false);
    const [modal, setModal]       = useState(false);
    const [form, setForm]         = useState({
        event_name: '', start_time: '07:00', end_time: '08:00',
        late_threshold: '07:15', target_group: 'STUDENTS', residency_filter: 'ALL',
    });

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const res = await api.get('/iot/events');
            if (res.data?.success) setEvents(res.data.data || []);
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { load(); }, [load]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const res = await api.post('/iot/events', form);
            if (res.data?.success) { setModal(false); load(); }
            else alert(res.data?.message || 'Failed to save event');
        } catch (err) { alert(err.response?.data?.message || 'Failed to save event'); }
        finally { setSaving(false); }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Delete this attendance event?')) return;
        try {
            await api.delete(`/iot/events/${id}`);
            load();
        } catch (e) { console.error(e); }
    };

    return (
        <div className="space-y-5">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-semibold text-[#1E3A5F] uppercase tracking-tighter">Attendance Events</h2>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Define school-wide tracking time windows</p>
                </div>
                <button onClick={() => { setForm({ event_name:'', start_time:'07:00', end_time:'08:00', late_threshold:'07:15', target_group:'STUDENTS', residency_filter:'ALL' }); setModal(true); }}
                    className="h-9 px-4 rounded-xl flex items-center gap-1.5 text-white font-medium text-[9px] uppercase tracking-widest shadow-md active:scale-95 transition-all"
                    style={{ background: 'linear-gradient(135deg,#1E3A5F,#0D2644)' }}>
                    <Plus size={14} style={{ color: '#FEBF10' }} /> Create Event
                </button>
            </div>

            {loading ? (
                <div className="py-12 flex items-center justify-center">
                    <Loader2 size={24} className="animate-spin text-[#1E3A5F]" />
                </div>
            ) : events.length === 0 ? (
                <div className="py-14 text-center rounded-2xl border border-dashed border-black/10 bg-slate-50/50">
                    <Watch size={32} className="mx-auto mb-3 text-slate-200" />
                    <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest">No attendance events defined yet</p>
                    <p className="text-[9px] text-slate-300 font-bold mt-1">Click "Create Event" to add the first time window</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {events.map(ev => (
                        <div key={ev.id} className="bg-white border border-black/5 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all group relative overflow-hidden">
                            <button onClick={() => handleDelete(ev.id)} className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg hover:bg-red-50 text-red-400 hover:text-red-600">
                                <Trash2 size={13} />
                            </button>
                            <div className="flex items-start gap-4">
                                <div className="w-11 h-11 rounded-xl bg-[#1E3A5F]/8 flex items-center justify-center shrink-0 border border-black/5">
                                    <Clock size={18} className="text-[#1E3A5F]" />
                                </div>
                                <div className="flex-1 min-w-0 pr-6">
                                    <h3 className="text-xs font-semibold text-[#1E3A5F] uppercase tracking-tight truncate">{ev.event_name}</h3>
                                    <div className="flex flex-wrap items-center gap-3 mt-1.5">
                                        <span className="flex items-center gap-1 text-[9px] font-bold text-slate-500">
                                            <Clock size={9} /> {ev.start_time} – {ev.end_time}
                                        </span>
                                        <span className="flex items-center gap-1 text-[9px] font-bold text-amber-600">
                                            <ShieldCheck size={9} /> Late: {ev.late_threshold}
                                        </span>
                                    </div>
                                    <div className="flex flex-wrap gap-1.5 mt-2.5">
                                        <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-600 text-[8px] font-semibold uppercase tracking-widest">{ev.target_group}</span>
                                        <span className="px-2 py-0.5 rounded bg-slate-50 text-slate-500 text-[8px] font-semibold uppercase tracking-widest">{ev.residency_filter}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Modal */}
            {modal && (
                <Modal title="New Attendance Event" subtitle="Define a tracking window for gate scans" icon={Watch} onClose={() => setModal(false)}>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <Field label="Event Name">
                            <input required placeholder="e.g. Morning Assembly" className={inputCls}
                                value={form.event_name} onChange={e => setForm({ ...form, event_name: e.target.value })} />
                        </Field>
                        <div className="grid grid-cols-2 gap-3">
                            <Field label="Start Time">
                                <input type="time" className={inputCls} value={form.start_time} onChange={e => setForm({ ...form, start_time: e.target.value })} />
                            </Field>
                            <Field label="End Time">
                                <input type="time" className={inputCls} value={form.end_time} onChange={e => setForm({ ...form, end_time: e.target.value })} />
                            </Field>
                        </div>
                        <Field label="Late After">
                            <input type="time" className={inputCls} value={form.late_threshold} onChange={e => setForm({ ...form, late_threshold: e.target.value })} />
                        </Field>
                        <div className="grid grid-cols-2 gap-3">
                            <Field label="Target Group">
                                <select className={selectCls} value={form.target_group} onChange={e => setForm({ ...form, target_group: e.target.value })}>
                                    <option value="STUDENTS">Students</option>
                                    <option value="STAFF">Staff</option>
                                    <option value="BOTH">Both</option>
                                </select>
                            </Field>
                            <Field label="Residency">
                                <select className={selectCls} value={form.residency_filter} onChange={e => setForm({ ...form, residency_filter: e.target.value })}>
                                    <option value="ALL">All</option>
                                    <option value="BOARDING">Boarding</option>
                                    <option value="DAY">Day Students</option>
                                </select>
                            </Field>
                        </div>
                        <div className="flex gap-3 pt-2">
                            <button type="button" onClick={() => setModal(false)} className="flex-1 h-11 rounded-2xl border border-black/5 text-[#1E3A5F] font-medium text-[10px] uppercase tracking-widest hover:bg-slate-50 transition-all">Cancel</button>
                            <button type="submit" disabled={saving} className="flex-[1.5] h-11 rounded-2xl bg-[#1E3A5F] text-white font-medium text-[10px] uppercase tracking-widest shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2">
                                {saving ? <Loader2 size={15} className="animate-spin text-[#FEBF10]" /> : <Save size={15} style={{ color: '#FEBF10' }} />}
                                Save Event
                            </button>
                        </div>
                    </form>
                </Modal>
            )}
        </div>
    );
};

// ─── CALENDAR TAB ──────────────────────────────────────────────
const SchoolCalendar = () => {
    const today = new Date();
    const [year,  setYear]  = useState(today.getFullYear());
    const [month, setMonth] = useState(today.getMonth());
    const [events, setEvents]  = useState([]);
    const [loading, setLoading] = useState(false);
    const [saving,  setSaving]  = useState(false);
    const [modal,   setModal]   = useState(false);
    const [selected, setSelected] = useState(null); // day clicked
    const [form, setForm] = useState({ title: '', event_date: '', end_date: '', event_type: 'OTHER', description: '', color: '#1E3A5F' });

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const res = await api.get('/school/calendar-events', { params: { year, month: month + 1 } });
            if (res.data?.success) setEvents(res.data.data || []);
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    }, [year, month]);

    useEffect(() => { load(); }, [load]);

    const prevMonth = () => { if (month === 0) { setYear(y => y - 1); setMonth(11); } else setMonth(m => m - 1); };
    const nextMonth = () => { if (month === 11) { setYear(y => y + 1); setMonth(0); } else setMonth(m => m + 1); };

    const cells = calendarGrid(year, month);
    const pad = (n) => String(n).padStart(2, '0');
    const toDateStr = (d) => `${year}-${pad(month + 1)}-${pad(d)}`;

    const dayEvents = (d) => {
        if (!d) return [];
        const ds = toDateStr(d);
        return events.filter(ev => {
            const s = ev.event_date?.slice(0, 10);
            const e = ev.end_date?.slice(0, 10) || s;
            return ds >= s && ds <= e;
        });
    };

    const handleDayClick = (d) => {
        if (!d) return;
        setSelected(d);
        const ds = toDateStr(d);
        setForm({ title: '', event_date: ds, end_date: '', event_type: 'OTHER', description: '', color: '#1E3A5F' });
        setModal(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const payload = { ...form };
            if (!payload.end_date) delete payload.end_date;
            const res = await api.post('/school/calendar-events', payload);
            if (res.data?.success) { setModal(false); load(); }
            else alert(res.data?.message || 'Failed');
        } catch (err) { alert(err.response?.data?.message || 'Failed to save event'); }
        finally { setSaving(false); }
    };

    const handleDelete = async (id, e) => {
        e.stopPropagation();
        if (!window.confirm('Delete this event?')) return;
        try { await api.delete(`/school/calendar-events/${id}`); load(); }
        catch (err) { console.error(err); }
    };

    const isToday = (d) => d && today.getFullYear() === year && today.getMonth() === month && today.getDate() === d;

    return (
        <div className="space-y-5">
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h2 className="text-xl font-semibold text-[#1E3A5F] uppercase tracking-tighter">School Calendar</h2>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Manage school activities, events &amp; holidays</p>
                </div>
                <button onClick={() => { setForm({ title:'', event_date:toDateStr(today.getDate()), end_date:'', event_type:'OTHER', description:'', color:'#1E3A5F' }); setModal(true); }}
                    className="h-9 px-4 rounded-xl flex items-center gap-1.5 text-white font-medium text-[9px] uppercase tracking-widest shadow-md active:scale-95 transition-all"
                    style={{ background: 'linear-gradient(135deg,#1E3A5F,#0D2644)' }}>
                    <Plus size={14} style={{ color: '#FEBF10' }} /> Add Event
                </button>
            </div>

            {/* Event type legend */}
            <div className="flex flex-wrap gap-2">
                {EVENT_TYPES.map(t => (
                    <span key={t.value} className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-semibold uppercase tracking-widest border"
                        style={{ background: `${t.color}12`, color: t.color, borderColor: `${t.color}30` }}>
                        <span className="w-1.5 h-1.5 rounded-full" style={{ background: t.color }} />
                        {t.label}
                    </span>
                ))}
            </div>

            {/* Calendar nav */}
            <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                    <button onClick={prevMonth} className="w-8 h-8 rounded-xl border border-slate-200 flex items-center justify-center hover:bg-slate-50 transition-all">
                        <ChevronLeft size={15} className="text-slate-600" />
                    </button>
                    <div className="text-center">
                        <p className="text-base font-semibold text-[#1E3A5F] uppercase tracking-wide">{MONTHS[month]} {year}</p>
                        {loading && <Loader2 size={12} className="animate-spin text-slate-300 mx-auto mt-0.5" />}
                    </div>
                    <button onClick={nextMonth} className="w-8 h-8 rounded-xl border border-slate-200 flex items-center justify-center hover:bg-slate-50 transition-all">
                        <ChevronRight size={15} className="text-slate-600" />
                    </button>
                </div>

                {/* Day header */}
                <div className="grid grid-cols-7 bg-slate-50 border-b border-slate-100">
                    {DAYS.map(d => (
                        <div key={d} className="py-2 text-center text-[9px] font-semibold text-slate-400 uppercase tracking-widest">{d}</div>
                    ))}
                </div>

                {/* Grid */}
                <div className="grid grid-cols-7">
                    {cells.map((day, i) => {
                        const evs = dayEvents(day);
                        const todayFlag = isToday(day);
                        return (
                            <div
                                key={i}
                                onClick={() => day && handleDayClick(day)}
                                className={`min-h-[72px] border-b border-r border-slate-100 p-1.5 transition-colors ${day ? 'cursor-pointer hover:bg-slate-50/80' : 'bg-slate-50/30'} ${todayFlag ? 'bg-amber-50/60' : ''}`}
                            >
                                {day && (
                                    <>
                                        <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-[11px] font-semibold mb-1 ${todayFlag ? 'bg-[#1E3A5F] text-white' : 'text-slate-600'}`}>
                                            {day}
                                        </span>
                                        <div className="space-y-0.5">
                                            {evs.slice(0, 2).map(ev => (
                                                <div key={ev.id}
                                                    className="flex items-center gap-1 px-1 py-0.5 rounded text-[8px] font-semibold truncate group/ev"
                                                    style={{ background: `${typeColor(ev.event_type)}18`, color: typeColor(ev.event_type) }}>
                                                    <span className="truncate flex-1">{ev.title}</span>
                                                    <button onClick={(e) => handleDelete(ev.id, e)} className="opacity-0 group-hover/ev:opacity-100 shrink-0">×</button>
                                                </div>
                                            ))}
                                            {evs.length > 2 && (
                                                <span className="text-[8px] font-semibold text-slate-400">+{evs.length - 2} more</span>
                                            )}
                                        </div>
                                    </>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Upcoming events list */}
            {events.length > 0 && (
                <div>
                    <h3 className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-3">This Month — {events.length} Event{events.length !== 1 ? 's' : ''}</h3>
                    <div className="space-y-2">
                        {events.map(ev => (
                            <div key={ev.id} className="flex items-center gap-3 bg-white border border-slate-100 rounded-xl px-4 py-3 shadow-sm hover:shadow-md transition-all group">
                                <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: typeColor(ev.event_type) }} />
                                <div className="flex-1 min-w-0">
                                    <p className="text-[11px] font-semibold text-slate-800 truncate">{ev.title}</p>
                                    <p className="text-[9px] text-slate-400 font-bold">
                                        {ev.event_date?.slice(0, 10)}{ev.end_date ? ` → ${ev.end_date.slice(0, 10)}` : ''} · <span style={{ color: typeColor(ev.event_type) }}>{typeLabel(ev.event_type)}</span>
                                    </p>
                                </div>
                                {ev.description && <p className="text-[9px] text-slate-400 font-bold hidden md:block truncate max-w-[200px]">{ev.description}</p>}
                                <button onClick={(e) => handleDelete(ev.id, e)} className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-red-50 text-red-400 hover:text-red-600 transition-all">
                                    <Trash2 size={12} />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Modal */}
            {modal && (
                <Modal title="Add School Event" subtitle="Create a calendar activity or holiday" icon={Calendar} onClose={() => setModal(false)}>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <Field label="Event Title">
                            <input required placeholder="e.g. National Exam Week" className={inputCls}
                                value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
                        </Field>
                        <div className="grid grid-cols-2 gap-3">
                            <Field label="Start Date">
                                <input type="date" required className={inputCls}
                                    value={form.event_date} onChange={e => setForm({ ...form, event_date: e.target.value })} />
                            </Field>
                            <Field label="End Date (optional)">
                                <input type="date" className={inputCls}
                                    value={form.end_date} onChange={e => setForm({ ...form, end_date: e.target.value })} />
                            </Field>
                        </div>
                        <Field label="Event Type">
                            <select className={selectCls} value={form.event_type} onChange={e => setForm({ ...form, event_type: e.target.value, color: typeColor(e.target.value) })}>
                                {EVENT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                            </select>
                        </Field>
                        <Field label="Description (optional)">
                            <textarea rows={2} placeholder="Short description…"
                                className="w-full px-4 py-3 bg-slate-50 rounded-2xl border border-black/5 focus:ring-2 ring-[#FEBF10]/50 outline-none text-xs font-bold resize-none"
                                value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
                        </Field>
                        <div className="flex gap-3 pt-2">
                            <button type="button" onClick={() => setModal(false)} className="flex-1 h-11 rounded-2xl border border-black/5 text-[#1E3A5F] font-medium text-[10px] uppercase tracking-widest hover:bg-slate-50 transition-all">Cancel</button>
                            <button type="submit" disabled={saving} className="flex-[1.5] h-11 rounded-2xl bg-[#1E3A5F] text-white font-medium text-[10px] uppercase tracking-widest shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2">
                                {saving ? <Loader2 size={15} className="animate-spin text-[#FEBF10]" /> : <Save size={15} style={{ color: '#FEBF10' }} />}
                                Save Event
                            </button>
                        </div>
                    </form>
                </Modal>
            )}
        </div>
    );
};

// ─── PREFERENCES TAB ───────────────────────────────────────────
const TERM_OPTIONS = ['Term 1', 'Term 2', 'Term 3'];

function emptyTermDates(terms) {
    return terms.map((n) => ({ name: n, start: '', end: '' }));
}

const Preferences = () => {
    const [registry, setRegistry] = useState([]);
    const [academicYear, setAcademicYear] = useState('2026-2027');
    const [newYear, setNewYear] = useState('');
    const [activeTerms, setActiveTerms] = useState(['Term 1', 'Term 2', 'Term 3']);
    const [termDates, setTermDates] = useState(emptyTermDates(['Term 1', 'Term 2', 'Term 3']));
    const [darkMode, setDarkMode] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [loading, setLoading] = useState(true);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const res = await api.get('/dos/academic-calendar-settings');
            if (res.data?.success) {
                const d = res.data.data || {};
                const list = Array.isArray(d.academic_years_registry) ? d.academic_years_registry : [];
                setRegistry(list);
                const current = list.find((r) => r.is_current) || list[0];
                const year = d.current_academic_year || current?.academic_year || '2026-2027';
                const terms =
                    current?.active_terms?.length ? current.active_terms : ['Term 1', 'Term 2', 'Term 3'];
                setAcademicYear(year);
                setActiveTerms(terms);
                const saved = current?.term_dates || d.term_dates || [];
                setTermDates(
                    terms.map((n) => {
                        const row = saved.find((x) => x.name === n);
                        return row
                            ? { name: n, start: toDateInputValue(row.start), end: toDateInputValue(row.end) }
                            : { name: n, start: '', end: '' };
                    })
                );
            }
        } catch (_) {
            /* ignore */
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    const setTermDate = (termName, field, value) => {
        setTermDates((prev) => {
            const idx = prev.findIndex((d) => d.name === termName);
            if (idx === -1) return [...prev, { name: termName, start: field === 'start' ? value : '', end: field === 'end' ? value : '' }];
            return prev.map((d, i) => (i === idx ? { ...d, [field]: value } : d));
        });
    };

    const handleActiveTermsChange = (checked, term) => {
        const next = checked ? [...new Set([...activeTerms, term])] : activeTerms.filter((x) => x !== term);
        setActiveTerms(next);
        setTermDates((prev) => next.map((n) => prev.find((d) => d.name === n) || { name: n, start: '', end: '' }));
    };

    const selectYearForEdit = (row) => {
        setAcademicYear(row.academic_year);
        setActiveTerms(row.active_terms?.length ? row.active_terms : TERM_OPTIONS);
        setTermDates(
            row.active_terms.map((n) => {
                const td = row.term_dates?.find((x) => x.name === n);
                return td
                    ? { name: n, start: toDateInputValue(td.start), end: toDateInputValue(td.end) }
                    : { name: n, start: '', end: '' };
            })
        );
    };

    const handleSaveCurrent = async () => {
        setIsSaving(true);
        try {
            const terms = activeTerms.map((t) => String(t).trim()).filter(Boolean);
            const res = await api.put('/dos/academic-calendar-settings', {
                current_academic_year: academicYear,
                active_terms: terms,
                term_dates: termDates,
            });
            if (res.data?.success) {
                setRegistry(res.data.data?.academic_years_registry || []);
                alert('Current academic year saved.');
            }
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to save');
        } finally {
            setIsSaving(false);
        }
    };

    const handleRegisterYear = async () => {
        const y = String(newYear || '').trim();
        if (!/^\d{4}-\d{4}$/.test(y)) {
            alert('Enter academic year as YYYY-YYYY (e.g. 2026-2027).');
            return;
        }
        setIsSaving(true);
        try {
            const res = await api.post('/dos/academic-years', {
                academic_year: y,
                active_terms: activeTerms,
                term_dates: termDates,
                set_as_current: false,
            });
            if (res.data?.success) {
                setRegistry(res.data.data?.academic_years_registry || []);
                setNewYear('');
                alert(`Academic year ${y} registered.`);
            }
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to register year');
        } finally {
            setIsSaving(false);
        }
    };

    const handleSetCurrent = async (year) => {
        try {
            const res = await api.patch(`/dos/academic-years/${encodeURIComponent(year)}/current`);
            if (res.data?.success) {
                const d = res.data.data || {};
                setRegistry(d.academic_years_registry || []);
                setAcademicYear(d.current_academic_year || year);
                alert(`${year} is now the current academic year.`);
                load();
            }
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to set current year');
        }
    };

    const formatDate = (iso) => {
        if (!iso) return '—';
        try {
            return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
        } catch {
            return iso;
        }
    };

    return (
        <div className="space-y-5">
            <div>
                <h2 className="text-xl font-semibold text-[#1E3A5F] uppercase tracking-tighter">System Preferences</h2>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                    Register academic years, terms, and dates — used across DOS promotion, attendance, and reports
                </p>
            </div>

            {/* All academic years report */}
            <div className="bg-white border border-black/5 rounded-2xl p-5 shadow-sm space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                        <BookOpen size={14} className="text-[#FEBF10]" />
                        <h3 className="text-[10px] font-semibold uppercase tracking-widest text-[#1E3A5F]">
                            All academic years
                        </h3>
                    </div>
                    <button type="button" onClick={load} className="text-[10px] font-semibold text-[#1E3A5F] uppercase flex items-center gap-1">
                        <RefreshCw size={12} /> Refresh
                    </button>
                </div>

                {loading ? (
                    <div className="py-10 flex justify-center">
                        <Loader2 size={22} className="animate-spin text-[#1E3A5F]" />
                    </div>
                ) : registry.length === 0 ? (
                    <p className="text-sm text-slate-400 text-center py-8">
                        No academic years registered yet. Add your first year below.
                    </p>
                ) : (
                    <div className="overflow-x-auto -mx-1">
                        <table className="w-full text-left text-[11px] min-w-[640px]">
                            <thead>
                                <tr className="border-b border-black/10 text-[9px] uppercase tracking-wider text-slate-500">
                                    <th className="py-2 px-2">Year</th>
                                    <th className="py-2 px-2">Status</th>
                                    <th className="py-2 px-2">Terms</th>
                                    <th className="py-2 px-2">Term dates</th>
                                    <th className="py-2 px-2 text-right">Students</th>
                                    <th className="py-2 px-2 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {registry.map((row) => (
                                    <tr
                                        key={row.academic_year}
                                        className={`border-b border-black/5 hover:bg-slate-50/80 ${row.academic_year === academicYear ? 'bg-amber-50/50' : ''}`}
                                    >
                                        <td className="py-3 px-2 font-bold text-[#1E3A5F]">{row.academic_year}</td>
                                        <td className="py-3 px-2">
                                            {row.is_current ? (
                                                <span className="px-2 py-0.5 rounded-lg bg-emerald-100 text-emerald-800 text-[9px] font-bold uppercase">
                                                    Current
                                                </span>
                                            ) : (
                                                <span className="text-slate-400 text-[9px]">Registered</span>
                                            )}
                                        </td>
                                        <td className="py-3 px-2 text-slate-600">{(row.active_terms || []).join(', ')}</td>
                                        <td className="py-3 px-2">
                                            <div className="space-y-1">
                                                {(row.term_dates || []).map((t) => (
                                                    <div key={t.name} className="text-[10px] text-slate-600">
                                                        <span className="font-semibold text-[#1E3A5F]">{t.name}:</span>{' '}
                                                        {t.start && t.end ? `${formatDate(t.start)} → ${formatDate(t.end)}` : 'Dates not set'}
                                                    </div>
                                                ))}
                                            </div>
                                        </td>
                                        <td className="py-3 px-2 text-right font-semibold tabular-nums">{row.student_count ?? 0}</td>
                                        <td className="py-3 px-2 text-right">
                                            <div className="flex justify-end gap-1 flex-wrap">
                                                <button
                                                    type="button"
                                                    onClick={() => selectYearForEdit(row)}
                                                    className="px-2 py-1 rounded-lg bg-slate-100 text-[9px] font-semibold hover:bg-slate-200"
                                                >
                                                    Edit
                                                </button>
                                                {!row.is_current && (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleSetCurrent(row.academic_year)}
                                                        className="px-2 py-1 rounded-lg bg-[#1E3A5F] text-white text-[9px] font-semibold"
                                                    >
                                                        Set current
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Register new year */}
            <div className="bg-white border border-dashed border-amber-300/60 rounded-2xl p-5 shadow-sm space-y-4">
                <h3 className="text-[10px] font-semibold uppercase tracking-widest text-amber-700 flex items-center gap-2">
                    <Plus size={14} /> Register another academic year
                </h3>
                <div className="grid md:grid-cols-3 gap-4">
                    <Field label="New academic year">
                        <input
                            value={newYear}
                            onChange={(e) => setNewYear(e.target.value)}
                            placeholder="2027-2028"
                            className={inputCls}
                        />
                    </Field>
                    <div className="md:col-span-2 flex items-end">
                        <button
                            type="button"
                            disabled={isSaving}
                            onClick={handleRegisterYear}
                            className="h-11 px-5 rounded-xl bg-amber-500 text-[#000435] font-bold text-[10px] uppercase tracking-widest inline-flex items-center gap-2"
                        >
                            {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                            Add year to registry
                        </button>
                    </div>
                </div>
                <p className="text-[10px] text-slate-500">
                    Configure terms and dates in the editor below, then add the year. Use &quot;Set current&quot; when it becomes the active school year.
                </p>
            </div>

            {/* Edit current / selected year */}
            <div className="bg-white border border-black/5 rounded-2xl p-5 shadow-sm space-y-4">
                <div className="flex items-center gap-2 mb-1">
                    <Settings size={14} className="text-[#FEBF10]" />
                    <h3 className="text-[10px] font-semibold uppercase tracking-widest text-[#1E3A5F]">
                        Edit academic year — {academicYear}
                    </h3>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                    <Field label="Academic year (editor)">
                        <input
                            value={academicYear}
                            onChange={(e) => setAcademicYear(e.target.value)}
                            placeholder="2026-2027"
                            className={inputCls}
                        />
                    </Field>
                    <Field label="Active terms">
                        <div className="flex gap-3 h-11 items-center pl-3 flex-wrap">
                            {TERM_OPTIONS.map((term) => (
                                <label key={term} className="inline-flex items-center gap-1.5 text-[11px] font-semibold cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={activeTerms.includes(term)}
                                        onChange={(e) => handleActiveTermsChange(e.target.checked, term)}
                                        className="accent-[#1E3A5F]"
                                    />
                                    {term}
                                </label>
                            ))}
                        </div>
                    </Field>
                </div>
                {activeTerms.length > 0 && (
                    <div className="space-y-2 pt-1">
                        <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-widest">Term start &amp; end dates</p>
                        {activeTerms.map((term) => {
                            const cfg = termDates.find((d) => d.name === term) || { start: '', end: '' };
                            return (
                                <div
                                    key={term}
                                    className="flex flex-col sm:flex-row sm:items-center gap-2 p-3 bg-slate-50 rounded-xl border border-black/5"
                                >
                                    <span className="text-[10px] font-semibold text-[#1E3A5F] uppercase w-16 shrink-0">{term}</span>
                                    <input
                                        type="date"
                                        value={toDateInputValue(cfg.start)}
                                        onChange={(e) => setTermDate(term, 'start', e.target.value)}
                                        className="flex-1 h-9 px-3 rounded-xl border border-black/10 text-[11px] font-bold text-[#1E3A5F] outline-none focus:ring-2 ring-[#FEBF10]/40"
                                    />
                                    <span className="text-slate-400 font-semibold text-xs shrink-0">→</span>
                                    <input
                                        type="date"
                                        value={toDateInputValue(cfg.end)}
                                        onChange={(e) => setTermDate(term, 'end', e.target.value)}
                                        className="flex-1 h-9 px-3 rounded-xl border border-black/10 text-[11px] font-bold text-[#1E3A5F] outline-none focus:ring-2 ring-[#FEBF10]/40"
                                    />
                                    {cfg.start && cfg.end && (
                                        <span className="px-2 py-1 bg-emerald-50 text-emerald-700 text-[8px] font-semibold rounded-lg border border-emerald-100 shrink-0">
                                            Set
                                        </span>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
                <button
                    type="button"
                    disabled={isSaving}
                    onClick={handleSaveCurrent}
                    className="h-10 px-4 rounded-xl bg-[#1E3A5F] text-white font-medium text-[10px] uppercase tracking-widest inline-flex items-center gap-2 active:scale-95 transition-all"
                >
                    {isSaving ? <Loader2 size={14} className="animate-spin text-[#FEBF10]" /> : <Save size={14} style={{ color: '#FEBF10' }} />}
                    Save &amp; set as current year
                </button>
            </div>

            {/* Toggles */}
            <div className="space-y-2">
                {[
                    { icon: <Moon size={14}/>,       label:'Dark Mode',         desc:'Use a darker theme',                           active: darkMode, toggle:()=>setDarkMode(!darkMode) },
                    { icon: <Bell size={14}/>,        label:'Email Alerts',      desc:'Send emails for critical discipline issues',   active: true,     toggle:()=>{} },
                    { icon: <Smartphone size={14}/>,  label:'SMS Absence Alerts',desc:'Message parents when a student is absent',     active: false,    toggle:()=>{} },
                    { icon: <HardDrive size={14}/>,   label:'Daily Backup',      desc:'Save all data every night at 3:00 AM',         active: true,     toggle:()=>{} },
                ].map((p, i) => (
                    <div key={i} className="flex items-center justify-between p-4 bg-white border border-black/5 rounded-2xl shadow-sm">
                        <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${p.active ? 'bg-[#1E3A5F] text-white' : 'bg-slate-100 text-[#1E3A5F]/40'}`}>{p.icon}</div>
                            <div>
                                <p className="text-[10px] font-semibold uppercase tracking-widest text-[#1E3A5F]">{p.label}</p>
                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">{p.desc}</p>
                            </div>
                        </div>
                        <button onClick={p.toggle} className={`w-10 h-5 rounded-full relative transition-all ${p.active ? 'bg-emerald-500' : 'bg-black/10'}`}>
                            <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-all ${p.active ? 'left-5' : 'left-0.5'}`} />
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
};

// ─── MAIN PAGE ─────────────────────────────────────────────────
const TABS = [

    { id: 'calendar', label: 'School Calendar',   icon: Calendar },
    { id: 'prefs',    label: 'Preferences',        icon: Globe },
];

const SystemConfiguration = () => {
    const [activeTab, setActiveTab] = useState('events');

    return (
        <div className="animate-in fade-in duration-700 bg-slate-50/60 min-h-screen">
            {/* Hero */}
            <div className="relative w-full overflow-hidden bg-[#c87800]">
                <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full border border-white/5 pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-[#FEBF10]/30 to-transparent pointer-events-none" />
                <div className="relative z-20 max-w-[1600px] mx-auto px-6 md:px-12 pt-10 pb-16 flex items-center gap-5">
                    <div className="hidden md:flex shrink-0 w-16 h-16 rounded-2xl border border-white/10 bg-white/5 items-center justify-center backdrop-blur-xl">
                        <Settings size={32} style={{ color: '#FEBF10' }} />
                    </div>
                    <div>
                        <p className="text-[9px] font-semibold uppercase tracking-[0.2em] mb-1" style={{ color:'#FEBF10' }}>Settings Dashboard</p>
                        <h1 className="text-2xl md:text-3xl font-semibold text-white tracking-tight uppercase" style={{ fontFamily: "'Montserrat', sans-serif" }}>System Configuration</h1>
                        <p className="text-[10px] font-medium text-white/60 uppercase tracking-widest mt-1" style={{ fontFamily: "'Montserrat', sans-serif" }}>Events, school calendar &amp; preferences</p>
                    </div>
                </div>
            </div>

            {/* Panel */}
            <div className="max-w-[1600px] mx-auto px-4 md:px-8 -mt-10 relative z-20 pb-16">
                <div className="bg-white rounded-t-3xl shadow-sm border border-slate-100 overflow-hidden flex flex-col md:flex-row min-h-[500px]">

                    {/* Sidebar nav */}
                    <div className="w-full md:w-56 lg:w-60 bg-slate-50/60 border-r border-black/5 flex flex-col pt-5 shrink-0">
                        <div className="px-5 mb-4">
                            <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-[#1E3A5F]/50 flex items-center gap-1.5">
                                <HardDrive size={11} /> Settings Menu
                            </p>
                        </div>
                        <div className="flex flex-col space-y-0.5 px-3 mb-6">
                            {TABS.map(t => {
                                const T = t.icon;
                                const active = activeTab === t.id;
                                return (
                                    <button key={t.id} onClick={() => setActiveTab(t.id)}
                                        className={`flex items-center gap-3 px-4 py-2.5 rounded-xl font-medium text-[10px] uppercase tracking-widest transition-all ${active ? 'bg-white shadow-sm text-[#1E3A5F] ring-1 ring-black/5' : 'text-slate-500 hover:text-[#1E3A5F] hover:bg-white/60'}`}>
                                        <T size={13} className={active ? 'text-[#FEBF10]' : ''} />
                                        {t.label}
                                    </button>
                                );
                            })}
                        </div>
                        <div className="px-5 mt-auto pb-6 hidden md:block">
                            <div className="bg-white border border-black/5 p-3 rounded-2xl text-center">
                                <p className="text-[8px] font-semibold uppercase tracking-widest text-slate-400">System Status</p>
                                <p className="text-[10px] font-semibold uppercase tracking-tight text-emerald-500 mt-0.5">Online</p>
                            </div>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 p-5 md:p-8 animate-in fade-in zoom-in-95 duration-300">
                        {activeTab === 'events'   && <AttendanceEvents />}
                        {activeTab === 'calendar' && <SchoolCalendar />}
                        {activeTab === 'prefs'    && <Preferences />}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SystemConfiguration;
