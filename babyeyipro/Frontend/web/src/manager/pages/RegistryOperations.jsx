import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
    Activity, Book, BookOpen, CheckCircle, ChevronRight,
    Clock, GraduationCap, Layout, List, Plus, Save,
    Settings, Smartphone, X, Loader2, Search, Filter,
    Calendar as CalendarIcon, MapPin, Hash, Trash2, Edit3,
    CheckSquare, Square, Table2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import GradebookColumns from './GradebookColumns';
import { createPortal } from 'react-dom';
import api from '../services/api';
import {
    operationsInnerSelectCls,
    operationsInnerInputCls,
    operationsInnerInputMonoCls,
    operationsInnerTimeCls,
} from '../utils/operationsFormUi';

export default function RegistryOperations() {
    const { manager } = useAuth();
    const [searchParams, setSearchParams] = useSearchParams();
    const [activeTab, setActiveTab] = useState(() =>
        searchParams.get('tab') === 'gradebook' ? 'gradebook' : 'subjects'
    );
    const [loading, setLoading] = useState(true);

    const selectTab = (id) => {
        setActiveTab(id);
        if (id === 'gradebook') {
            setSearchParams({ tab: 'gradebook' }, { replace: true });
        } else {
            setSearchParams({}, { replace: true });
        }
    };

    useEffect(() => {
        if (searchParams.get('tab') === 'gradebook') {
            setActiveTab('gradebook');
        } else {
            setActiveTab((prev) => (prev === 'gradebook' ? 'subjects' : prev));
        }
    }, [searchParams]);

    // Data States
    const [subjects, setSubjects] = useState([]);
    const [terms, setTerms] = useState([]);
    const [holidays, setHolidays] = useState([]);
    const [periods, setPeriods] = useState([]);
    const [pulses, setPulses] = useState([]);
    const [classes, setClasses] = useState([]);

    // Modal States
    const [activeModal, setActiveModal] = useState(null); // 'subject_config', 'term', 'milestone', 'holiday', 'period', 'pulse'
    const [editingItem, setEditingItem] = useState(null);
    const [saving, setSaving] = useState(false);

    // Form States
    const [subjectConfig, setSubjectConfig] = useState({ subject_id: '', class_name: '', subject_code: '', periods_per_week: 1, credits: 1, priority_level: 0 });
    const [termForm, setTermForm] = useState({ name: '', start_date: '', end_date: '', is_active: 1 });
    const [milestoneForm, setMilestoneForm] = useState({ term_id: '', name: '', timing: '', sort_order: 0 });
    const [holidayForm, setHolidayForm] = useState({ name: '', start_date: '', end_date: '' });
    const [periodForm, setPeriodForm] = useState({ period_name: '', start_time: '', end_time: '', is_break: 0, sort_order: 0 });
    const [pulseForm, setPulseForm] = useState({ event_name: '', start_time: '08:00', end_time: '17:00', late_threshold: '08:15', target_group: 'STUDENTS', residency_filter: 'ALL', days_active: 'Mon,Tue,Wed,Thu,Fri' });
    const [subjectForm, setSubjectForm] = useState({ name: '', category: 'General', subject_code: '' });

    useEffect(() => {
        fetchInitialData();
    }, [manager]);

    const fetchInitialData = async () => {
        if (!manager?.school_id) return;
        setLoading(true);
        try {
            const [subjRes, termRes, holRes, perRes, pulseRes, classRes] = await Promise.all([
                api.get('/dos/subjects'),
                api.get('/dos/calendar/terms'),
                api.get('/dos/calendar/holidays'),
                api.get('/dos/calendar/periods'),
                api.get('/iot/events'),
                api.get('/dos/registry/classes')
            ]);

            if (subjRes.data.success) setSubjects(subjRes.data.data);
            if (termRes.data.success) setTerms(termRes.data.data);
            if (holRes.data.success) setHolidays(holRes.data.data);
            if (perRes.data.success) setPeriods(perRes.data.data);
            if (pulseRes.data.success) setPulses(pulseRes.data.data);
            if (classRes.data.success) setClasses(classRes.data.data);

        } catch (err) {
            console.error("Registry fetch failed:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveSubjectConfig = async () => {
        setSaving(true);
        try {
            const res = await api.post('/dos/subjects/config', subjectConfig);
            if (res.data.success) {
                setActiveModal(null);
                fetchInitialData();
            }
        } catch (err) { alert(err.response?.data?.message || "Failed to save config"); }
        finally { setSaving(false); }
    };

    const handleSaveNewSubject = async () => {
        setSaving(true);
        try {
            const res = await api.post('/dos/subjects', subjectForm);
            if (res.data.success) {
                setActiveModal(null);
                setSubjectForm({ name: '', category: 'General', subject_code: '' });
                fetchInitialData();
            }
        } catch (err) { alert(err.response?.data?.message || "Failed to create subject"); }
        finally { setSaving(false); }
    };

    const handleSaveMilestone = async () => {
        setSaving(true);
        try {
            const res = await api.post('/dos/calendar/milestones', milestoneForm);
            if (res.data.success) {
                setActiveModal(null);
                fetchInitialData();
            }
        } catch (err) { console.error(err); }
        finally { setSaving(false); }
    };

    const handleDeletePeriod = async (id) => {
        if (!window.confirm('Delete this period?')) return;
        try {
            await api.delete(`/dos/calendar/periods/${id}`);
            fetchInitialData();
        } catch (err) { console.error(err); }
    };

    const handleSaveTerm = async () => {
        setSaving(true);
        try {
            const res = await api.post('/dos/calendar/terms', termForm);
            if (res.data.success) {
                setActiveModal(null);
                fetchInitialData();
            }
        } catch (err) { console.error(err); }
        finally { setSaving(false); }
    };

    const handleSavePeriod = async () => {
        setSaving(true);
        try {
            const res = await api.post('/dos/calendar/periods', periodForm);
            if (res.data.success) {
                setActiveModal(null);
                fetchInitialData();
            }
        } catch (err) { console.error(err); }
        finally { setSaving(false); }
    };

    const handleSavePulse = async () => {
        setSaving(true);
        try {
            const res = await api.post('/iot/events', pulseForm);
            if (res.data.success) {
                setActiveModal(null);
                fetchInitialData();
            }
        } catch (err) { console.error(err); }
        finally { setSaving(false); }
    };

    const toggleDay = (day) => {
        const days = pulseForm.days_active.split(',').filter(Boolean);
        const nextDays = days.includes(day) ? days.filter(d => d !== day) : [...days, day];
        setPulseForm({ ...pulseForm, days_active: nextDays.join(',') });
    };

    const daysOfWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    return (
        <div className="animate-in fade-in duration-700 bg-re-bg min-h-screen pb-12 font-sans lowercase">

            {/* ── High-Fidelity Hero Section ── */}
            <div className="relative w-full min-h-[220px] overflow-hidden" style={{ backgroundImage: `url(./teacher.jpg)`, backgroundSize: 'cover', backgroundPosition: 'center' }}>
                <div className="absolute inset-0 bg-[#0a192f]/85 z-10 backdrop-blur-[2px]"></div>

                <div className="relative z-20 max-w-[1600px] mx-auto px-6 md:px-12 pt-12 pb-16 flex items-center gap-6 text-white text-center">
                    <div className="hidden md:flex shrink-0 w-20 h-20 rounded-3xl border border-white/10 bg-white/5 items-center justify-center backdrop-blur-xl shadow-2xl relative overflow-hidden group">
                        <div className="absolute inset-0 bg-gradient-to-br from-[#FEBF10]/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
                        <Settings size={40} style={{ color: "#FEBF10" }} className="group-hover:scale-110 transition-transform duration-500" />
                    </div>

                    <div className="space-y-1 w-full md:w-auto">
                        <div className="flex items-center justify-center md:justify-start gap-2 mb-1.5">
                            <span className="w-5 h-1 rounded-full animate-pulse" style={{ background: "#FEBF10" }}></span>
                            <p className="text-[9px] font-black uppercase tracking-[0.2em]" style={{ color: "#FEBF10" }}>Robust Institutional Setup</p>
                        </div>
                        <h1 className="text-xl sm:text-3xl md:text-4xl font-black tracking-tighter leading-none mb-1.5 uppercase">School <span style={{ color: "#FEBF10" }}>Operations</span></h1>
                        <p className="text-[10px] md:text-xs font-medium text-white/60 max-w-lg leading-relaxed uppercase tracking-widest italic mx-auto md:mx-0">Manage the technical heart of the institution: Calendar, periods, NESA subjects, and IoT pulses</p>
                    </div>
                </div>
            </div>

            {/* ── Main Content Area ── */}
            <div className="max-w-[1600px] mx-auto px-6 md:px-12 -mt-16 relative z-30 pb-16">
                <div className="bg-white rounded-t-3xl shadow-2xl border border-black/5 flex flex-col md:flex-row min-h-[600px] overflow-hidden">

                    {/* Left Navigation Sidebar */}
                    <div className="w-full md:w-64 bg-re-bg/20 border-r border-black/5 flex flex-col pt-6 shrink-0">
                        <div className="px-3 space-y-1">
                            {[
                                { id: 'subjects', label: 'Subject Registry', icon: BookOpen },
                                { id: 'calendar', label: 'Academic Calendar', icon: CalendarIcon },
                                { id: 'periods', label: 'Day Periods', icon: Clock },
                                { id: 'pulses', label: 'Operational Pulses', icon: Activity },
                                { id: 'gradebook', label: 'Gradebook columns', icon: Table2 },
                            ].map(tab => (
                                <button
                                    key={tab.id}
                                    type="button"
                                    onClick={() => selectTab(tab.id)}
                                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${activeTab === tab.id ? 'bg-white shadow-sm text-[#1E3A5F]' : 'text-[#1E3A5F]/40 hover:text-[#1E3A5F] hover:bg-white/50'}`}
                                >
                                    <tab.icon size={14} className={activeTab === tab.id ? 'text-[#FEBF10]' : ''} /> {tab.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Content Panel */}
                    <div className="flex-1 p-6 md:p-10 animate-in fade-in zoom-in-95 duration-500">
                        {loading ? (
                            <div className="h-[400px] flex flex-col items-center justify-center gap-4">
                                <Loader2 className="animate-spin text-[#FEBF10]" size={32} />
                                <p className="text-[10px] font-black uppercase tracking-widest text-[#1E3A5F]/40 italic">Syncing Departmental Repository...</p>
                            </div>
                        ) : activeTab === 'subjects' ? (
                            <div className="space-y-8">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h2 className="text-base font-black text-[#1E3A5F] uppercase tracking-tight">NESA Subject Registry</h2>
                                        <p className="text-[9px] font-bold text-[#1E3A5F]/40 uppercase tracking-widest mt-0.5">Configure credits, periodic distribution, and codes</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => setActiveModal('new_subject')}
                                            className="h-8 px-4 bg-white text-[#1E3A5F] border border-[#1E3A5F]/10 rounded-lg font-black text-[8px] uppercase tracking-widest flex items-center gap-2 hover:bg-re-bg transition-all"
                                        >
                                            <Plus size={12} style={{ color: "#FEBF10" }} /> New Subject
                                        </button>
                                        <button
                                            onClick={() => { setSubjectConfig({ ...subjectConfig, subject_id: subjects[0]?.id || '' }); setActiveModal('subject_config'); }}
                                            className="h-8 px-4 bg-[#1E3A5F] text-white rounded-lg font-black text-[8px] uppercase tracking-widest flex items-center gap-2 shadow-sm hover:scale-105 active:scale-95 transition-all"
                                        >
                                            <Plus size={12} style={{ color: "#FEBF10" }} /> Link Config
                                        </button>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {subjects.map(s => (
                                        <div key={s.id} className="bg-white p-5 rounded-2xl border border-black/5 hover:border-[#FEBF10]/30 transition-all group shadow-sm flex flex-col">
                                            <div className="flex items-center justify-between mb-4">
                                                <div className="w-10 h-10 rounded-xl bg-re-bg flex items-center justify-center text-[#1E3A5F]/40 group-hover:bg-[#1E3A5F] group-hover:text-[#FEBF10] transition-colors">
                                                    <Book size={20} />
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => { setEditingItem(s); setSubjectConfig({ subject_id: s.id, class_name: '', subject_code: s.subject_code || '', periods_per_week: 1, credits: 1, priority_level: 0 }); setActiveModal('subject_config'); }}
                                                        className="p-1.5 hover:bg-re-bg rounded-lg text-re-text-muted hover:text-[#1E3A5F] transition-all"
                                                    >
                                                        <Edit3 size={14} />
                                                    </button>
                                                </div>
                                            </div>
                                            <h3 className="text-sm font-black text-[#1E3A5F] uppercase tracking-tight">{s.name}</h3>
                                            <div className="flex items-center gap-2 mt-2">
                                                <span className="text-[8px] font-black uppercase px-2 py-0.5 rounded bg-emerald-50 text-emerald-600 ring-1 ring-emerald-500/10">{s.category}</span>
                                                <span className="text-[8px] font-black uppercase px-2 py-0.5 rounded bg-blue-50 text-blue-600 ring-1 ring-blue-500/10">{s.subject_code || 'UNSET'}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : activeTab === 'calendar' ? (
                            <div className="space-y-8">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h2 className="text-xl font-black text-[#1E3A5F] uppercase tracking-tight">Academic Calendar</h2>
                                        <p className="text-[10px] font-bold text-[#1E3A5F]/40 uppercase tracking-widest mt-1">Timeline for terms, exams, and national holidays</p>
                                    </div>
                                    <button
                                        onClick={() => setActiveModal('term')}
                                        className="h-10 px-6 bg-[#1E3A5F] text-white rounded-xl font-black text-[9px] uppercase tracking-widest flex items-center gap-2"
                                    >
                                        <Plus size={14} style={{ color: "#FEBF10" }} /> Create Term
                                    </button>
                                </div>

                                <div className="space-y-6">
                                    {terms.map(term => (
                                        <div key={term.id} className="bg-white border border-black/5 rounded-2xl overflow-hidden shadow-sm">
                                            <div className="px-6 py-4 bg-re-bg/20 flex items-center justify-between border-b border-black/5">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-[#1E3A5F] shadow-sm">
                                                        <CalendarIcon size={18} />
                                                    </div>
                                                    <div>
                                                        <h4 className="text-xs font-black text-[#1E3A5F] uppercase tracking-widest">{term.name}</h4>
                                                        <p className="text-[9px] font-bold text-re-text-muted uppercase tracking-widest">{term.start_date} → {term.end_date}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    {term.is_active ? (
                                                        <span className="text-[8px] font-black uppercase px-2 py-0.5 rounded bg-emerald-100 text-emerald-700 tracking-widest flex items-center gap-1">
                                                            <CheckCircle size={10} /> CURRENT ACTIVE
                                                        </span>
                                                    ) : <span className="text-[8px] font-black uppercase px-2 py-0.5 rounded bg-gray-100 text-gray-400 tracking-widest">In-Active</span>}
                                                </div>
                                            </div>
                                            <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                                                {term.breakdowns?.map(b => (
                                                    <div key={b.id} className="p-4 rounded-xl border border-black/5 bg-white hover:border-[#FEBF10]/30 transition-all flex items-center justify-between group">
                                                        <div>
                                                            <p className="text-[9px] font-black text-[#1E3A5F] uppercase tracking-tight">{b.name}</p>
                                                            <p className="text-[8px] font-bold text-re-text-muted mt-0.5">{b.timing}</p>
                                                        </div>
                                                        <ChevronRight size={14} className="text-re-text-muted group-hover:text-[#FEBF10] transition-colors" />
                                                    </div>
                                                ))}
                                                <button
                                                    onClick={() => { setMilestoneForm({ ...milestoneForm, term_id: term.id }); setActiveModal('milestone'); }}
                                                    className="p-4 rounded-xl border-2 border-dashed border-black/5 flex items-center justify-center gap-2 text-[9px] font-black uppercase text-re-text-muted hover:bg-re-bg/50 transition-all"
                                                >
                                                    <Plus size={14} /> Add Milestone
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : activeTab === 'gradebook' ? (
                            <GradebookColumns embedded />
                        ) : activeTab === 'periods' ? (
                            <div className="space-y-8">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h2 className="text-xl font-black text-[#1E3A5F] uppercase tracking-tight">School Day Periods</h2>
                                        <p className="text-[10px] font-bold text-[#1E3A5F]/40 uppercase tracking-widest mt-1">Define the logical time segments for the institution</p>
                                    </div>
                                    <button
                                        onClick={() => setActiveModal('period')}
                                        className="h-10 px-6 bg-[#1E3A5F] text-white rounded-xl font-black text-[9px] uppercase tracking-widest flex items-center gap-2"
                                    >
                                        <Plus size={14} style={{ color: "#FEBF10" }} /> Define Period
                                    </button>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {periods.map(p => (
                                        <div key={p.id} className={`p-5 rounded-2xl border flex items-center justify-between ${p.is_break ? 'bg-amber-50 border-amber-500/10' : 'bg-white border-black/5'} shadow-sm group`}>
                                            <div className="flex items-center gap-4">
                                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-inner ${p.is_break ? 'bg-amber-500 text-white' : 'bg-re-bg text-[#1E3A5F]'}`}>
                                                    {p.is_break ? <Coffee size={18} /> : <Clock size={18} />}
                                                </div>
                                                <div>
                                                    <p className="text-[11px] font-black text-[#1E3A5F] uppercase tracking-widest">{p.period_name}</p>
                                                    <p className="text-[9px] font-bold text-re-text-muted uppercase tracking-widest">{p.start_time.substring(0, 5)} — {p.end_time.substring(0, 5)}</p>
                                                </div>
                                            </div>
                                            <button onClick={() => handleDeletePeriod(p.id)} className="opacity-0 group-hover:opacity-100 text-red-500 p-2 hover:bg-red-50 rounded-lg transition-all">
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : activeTab === 'pulses' ? (
                            <div className="space-y-8">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h2 className="text-xl font-black text-[#1E3A5F] uppercase tracking-tight">Robust Operational Pulses</h2>
                                        <p className="text-[10px] font-bold text-[#1E3A5F]/40 uppercase tracking-widest mt-1">Define automated scanning windows with day pinpointing</p>
                                    </div>
                                    <button
                                        onClick={() => setActiveModal('pulse')}
                                        className="h-10 px-6 bg-[#1E3A5F] text-white rounded-xl font-black text-[9px] uppercase tracking-widest flex items-center gap-2 shadow-re-glow hover:scale-105"
                                    >
                                        <Plus size={14} style={{ color: "#FEBF10" }} /> Create Pulse
                                    </button>
                                </div>

                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                    {pulses.map(pulse => (
                                        <div key={pulse.id} className="bg-white p-6 rounded-3xl border border-black/5 hover:border-[#FEBF10]/30 transition-all shadow-sm flex flex-col gap-4 relative overflow-hidden group">
                                            <div className="flex items-center justify-between relative z-10">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 rounded-2xl bg-[#1E3A5F]/5 flex items-center justify-center text-[#1E3A5F] group-hover:bg-[#1E3A5F] group-hover:text-[#FEBF10] transition-all">
                                                        <Activity size={24} />
                                                    </div>
                                                    <div>
                                                        <h3 className="text-sm font-black text-[#1E3A5F] uppercase tracking-tight">{pulse.event_name}</h3>
                                                        <p className="text-[9px] font-bold text-re-text-muted uppercase tracking-[0.2em]">{pulse.start_time.substring(0, 5)} - {pulse.end_time.substring(0, 5)} <span className="text-orange-500 ml-2">LATE: {pulse.late_threshold.substring(0, 5)}</span></p>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-1.5 flex-wrap relative z-10">
                                                {daysOfWeek.map(d => (
                                                    <span key={d} className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-lg border transition-all ${pulse.days_active.includes(d) ? 'bg-[#1E3A5F] text-[#FEBF10] border-[#1E3A5F]' : 'bg-re-bg text-re-text-muted border-transparent'}`}>
                                                        {d}
                                                    </span>
                                                ))}
                                            </div>

                                            <div className="flex items-center justify-between border-t border-black/5 pt-4 mt-2">
                                                <div className="flex gap-2">
                                                    <span className="text-[8px] font-black uppercase px-2 py-1 bg-blue-50 text-blue-600 rounded-md tracking-widest">{pulse.target_group}</span>
                                                    <span className="text-[8px] font-black uppercase px-2 py-1 bg-gray-50 text-gray-500 rounded-md tracking-widest">{pulse.residency_filter} RESIDENCY</span>
                                                </div>
                                                <button onClick={() => { setEditingItem(pulse); setPulseForm({ event_name: pulse.event_name, start_time: pulse.start_time, end_time: pulse.end_time, late_threshold: pulse.late_threshold, target_group: pulse.target_group, residency_filter: pulse.residency_filter, days_active: pulse.days_active }); setActiveModal('pulse'); }} className="text-[9px] font-black uppercase tracking-widest text-[#1E3A5F] opacity-30 hover:opacity-100 hover:text-[#FEBF10] transition-all">Edit Logic</button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : null}
                    </div>
                </div>
            </div>

            {/* General Modal Handler */}
            {activeModal && createPortal(
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-6 backdrop-blur-md bg-[#0a192f]/40 animate-in fade-in duration-300">
                    <div className="bg-white w-full max-w-lg rounded-3xl shadow-[0_32px_128px_-15px_rgba(30,58,95,0.4)] overflow-hidden animate-in zoom-in-95 duration-300 border border-white/20">
                        {/* Modal Header */}
                        <div className="px-6 py-5 bg-[#1E3A5F] text-white flex items-center justify-between uppercase">
                            <h3 className="font-black text-[10px] tracking-widest">
                                {activeModal === 'subject_config' ? 'NESA Standard Link' :
                                    activeModal === 'term' ? 'New Academic Term' :
                                        activeModal === 'new_subject' ? 'Register New Subject' :
                                            activeModal === 'milestone' ? 'Add Term Milestone' :
                                                activeModal === 'period' ? 'Day Logic Define' :
                                                    activeModal === 'pulse' ? 'Operational Trigger' : 'Config Modal'}
                            </h3>
                            <button onClick={() => setActiveModal(null)} className="hover:text-[#FEBF10] transition-colors"><X size={20} /></button>
                        </div>

                        <div className="p-8 space-y-6">
                            {activeModal === 'new_subject' ? (
                                <div className="space-y-4">
                                    <div className="space-y-1.5">
                                        <label className="text-[8px] font-black uppercase text-[#1E3A5F]/40 tracking-widest ml-1">Subject Name</label>
                                        <input className={operationsInnerInputCls} placeholder="E.G. MATHEMATICS"
                                            value={subjectForm.name} onChange={e => setSubjectForm({ ...subjectForm, name: e.target.value })} />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[8px] font-black uppercase text-[#1E3A5F]/40 tracking-widest ml-1">Subject Category</label>
                                        <select className={operationsInnerSelectCls}
                                            value={subjectForm.category} onChange={e => setSubjectForm({ ...subjectForm, category: e.target.value })}>
                                            <option value="General">General</option>
                                            <option value="Science">Science</option>
                                            <option value="Languages">Languages</option>
                                            <option value="Social Studies">Social Studies</option>
                                            <option value="Arts & Sports">Arts & Sports</option>
                                            <option value="Technical">Technical</option>
                                        </select>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[8px] font-black uppercase text-[#1E3A5F]/40 tracking-widest ml-1">Universal Subject Code</label>
                                        <input className={operationsInnerInputMonoCls} placeholder="E.G. MAT-UNI"
                                            value={subjectForm.subject_code} onChange={e => setSubjectForm({ ...subjectForm, subject_code: e.target.value })} />
                                    </div>
                                    <button onClick={handleSaveNewSubject} disabled={saving} className="w-full h-12 bg-[#1E3A5F] text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-xl flex items-center justify-center gap-2 mt-4">
                                        {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Register New Subject
                                    </button>
                                </div>
                            ) : activeModal === 'subject_config' ? (
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="text-[8px] font-black uppercase text-[#1E3A5F]/40 tracking-widest ml-1">Focus Subject</label>
                                            <select className={operationsInnerSelectCls}
                                                value={subjectConfig.subject_id} onChange={e => setSubjectConfig({ ...subjectConfig, subject_id: e.target.value })}>
                                                {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                            </select>
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[8px] font-black uppercase text-[#1E3A5F]/40 tracking-widest ml-1">Target Class</label>
                                            <select className={operationsInnerSelectCls}
                                                value={subjectConfig.class_name} onChange={e => setSubjectConfig({ ...subjectConfig, class_name: e.target.value })}>
                                                <option value="">Select Class</option>
                                                {classes.map(c => <option key={c.id} value={`${c.group_name} ${c.stream_name || ''}`}>{c.group_name} {c.stream_name || ''}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[8px] font-black uppercase text-[#1E3A5F]/40 tracking-widest ml-1">Subject Registry Code</label>
                                        <input className={operationsInnerInputMonoCls} placeholder="E.G. PHY-SEC-01"
                                            value={subjectConfig.subject_code} onChange={e => setSubjectConfig({ ...subjectConfig, subject_code: e.target.value })} />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="text-[8px] font-black uppercase text-[#1E3A5F]/40 tracking-widest ml-1">Periods / Week</label>
                                            <input type="number" className={`${operationsInnerInputCls} !normal-case tabular-nums`}
                                                value={subjectConfig.periods_per_week} onChange={e => setSubjectConfig({ ...subjectConfig, periods_per_week: e.target.value })} />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[8px] font-black uppercase text-[#1E3A5F]/40 tracking-widest ml-1">Subject Credits</label>
                                            <input type="number" className={`${operationsInnerInputCls} !normal-case tabular-nums`}
                                                value={subjectConfig.credits} onChange={e => setSubjectConfig({ ...subjectConfig, credits: e.target.value })} />
                                        </div>
                                    </div>
                                    <button onClick={handleSaveSubjectConfig} disabled={saving} className="w-full h-12 bg-[#1E3A5F] text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-xl flex items-center justify-center gap-2">
                                        {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Save NESA Standards
                                    </button>
                                </div>
                            ) : activeModal === 'pulse' ? (
                                <div className="space-y-4">
                                    <div className="space-y-1.5">
                                        <label className="text-[8px] font-black uppercase text-[#1E3A5F]/40 tracking-widest ml-1">Pulse Trigger Name</label>
                                        <input className={operationsInnerInputCls} placeholder="E.G. ARRIVAL SCAN"
                                            value={pulseForm.event_name} onChange={e => setPulseForm({ ...pulseForm, event_name: e.target.value })} />
                                    </div>
                                    <div className="grid grid-cols-3 gap-3">
                                        <div className="space-y-1.5">
                                            <label className="text-[8px] font-black uppercase text-[#1E3A5F]/40 tracking-widest ml-1">Start</label>
                                            <input type="time" className={operationsInnerTimeCls}
                                                value={pulseForm.start_time} onChange={e => setPulseForm({ ...pulseForm, start_time: e.target.value })} />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[8px] font-black uppercase text-[#1E3A5F]/40 tracking-widest ml-1">End</label>
                                            <input type="time" className={operationsInnerTimeCls}
                                                value={pulseForm.end_time} onChange={e => setPulseForm({ ...pulseForm, end_time: e.target.value })} />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[8px] font-black uppercase text-[#1E3A5F]/40 tracking-widest ml-1 text-orange-500">Late</label>
                                            <input type="time" className={operationsInnerTimeCls}
                                                value={pulseForm.late_threshold} onChange={e => setPulseForm({ ...pulseForm, late_threshold: e.target.value })} />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[8px] font-black uppercase text-[#1E3A5F]/40 tracking-widest ml-1">Active Days (Pinpoint)</label>
                                        <div className="flex flex-wrap gap-2">
                                            {daysOfWeek.map(d => (
                                                <button key={d} onClick={() => toggleDay(d)} className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase transition-all shadow-sm ${pulseForm.days_active.includes(d) ? 'bg-[#1E3A5F] text-[#FEBF10] shadow-[#1E3A5F]/30' : 'bg-re-bg text-re-text-muted hover:bg-white'}`}>
                                                    {d}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="text-[8px] font-black uppercase text-[#1E3A5F]/40 tracking-widest ml-1">Target</label>
                                            <select className={operationsInnerSelectCls}
                                                value={pulseForm.target_group} onChange={e => setPulseForm({ ...pulseForm, target_group: e.target.value })}>
                                                <option value="STUDENTS">Students Only</option>
                                                <option value="STAFF">Staff Only</option>
                                                <option value="BOTH">Everyone</option>
                                            </select>
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[8px] font-black uppercase text-[#1E3A5F]/40 tracking-widest ml-1">Residency</label>
                                            <select className={operationsInnerSelectCls}
                                                value={pulseForm.residency_filter} onChange={e => setPulseForm({ ...pulseForm, residency_filter: e.target.value })}>
                                                <option value="ALL">All Residency</option>
                                                <option value="BOARDING">Boarding Only</option>
                                                <option value="DAY">Day Learners Only</option>
                                            </select>
                                        </div>
                                    </div>
                                    <button onClick={handleSavePulse} disabled={saving} className="w-full h-12 bg-[#FEBF10] text-[#1E3A5F] rounded-xl font-black text-[10px] uppercase tracking-widest shadow-xl flex items-center justify-center gap-2">
                                        {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Finalize Pulse Config
                                    </button>
                                </div>
                            ) : activeModal === 'period' ? (
                                <div className="space-y-4">
                                    <div className="space-y-1.5">
                                        <label className="text-[8px] font-black uppercase text-[#1E3A5F]/40 tracking-widest ml-1">Period Identity</label>
                                        <input className={operationsInnerInputCls} placeholder="E.G. PERIOD 1"
                                            value={periodForm.period_name} onChange={e => setPeriodForm({ ...periodForm, period_name: e.target.value })} />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="text-[8px] font-black uppercase text-[#1E3A5F]/40 tracking-widest ml-1">Start Time</label>
                                            <input type="time" className={operationsInnerTimeCls}
                                                value={periodForm.start_time} onChange={e => setPeriodForm({ ...periodForm, start_time: e.target.value })} />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[8px] font-black uppercase text-[#1E3A5F]/40 tracking-widest ml-1">End Time</label>
                                            <input type="time" className={operationsInnerTimeCls}
                                                value={periodForm.end_time} onChange={e => setPeriodForm({ ...periodForm, end_time: e.target.value })} />
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 p-4 bg-re-bg/20 rounded-xl cursor-pointer" onClick={() => setPeriodForm({ ...periodForm, is_break: periodForm.is_break ? 0 : 1 })}>
                                        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${periodForm.is_break ? 'bg-[#1E3A5F] border-[#1E3A5F]' : 'border-black/5'}`}>
                                            {periodForm.is_break && <CheckCircle size={14} className="text-[#FEBF10]" />}
                                        </div>
                                        <span className="text-[10px] font-black uppercase text-[#1E3A5F] tracking-widest">Mark as Institutional Break</span>
                                    </div>
                                    <button onClick={handleSavePeriod} disabled={saving} className="w-full h-12 bg-[#1E3A5F] text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-xl flex items-center justify-center gap-2">
                                        {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Register Slot
                                    </button>
                                </div>
                            ) : activeModal === 'milestone' ? (
                                <div className="space-y-4">
                                    <div className="space-y-1.5">
                                        <label className="text-[8px] font-black uppercase text-[#1E3A5F]/40 tracking-widest ml-1">Milestone Name</label>
                                        <input className={operationsInnerInputCls} placeholder="E.G. MID-TERM EXAMS"
                                            value={milestoneForm.name} onChange={e => setMilestoneForm({ ...milestoneForm, name: e.target.value })} />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="text-[8px] font-black uppercase text-[#1E3A5F]/40 tracking-widest ml-1">Timing / Period</label>
                                            <input className={operationsInnerInputCls} placeholder="E.G. WEEK 6"
                                                value={milestoneForm.timing} onChange={e => setMilestoneForm({ ...milestoneForm, timing: e.target.value })} />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[8px] font-black uppercase text-[#1E3A5F]/40 tracking-widest ml-1">Display Order</label>
                                            <input type="number" className={`${operationsInnerInputCls} !normal-case tabular-nums`}
                                                value={milestoneForm.sort_order} onChange={e => setMilestoneForm({ ...milestoneForm, sort_order: e.target.value })} />
                                        </div>
                                    </div>
                                    <button onClick={handleSaveMilestone} disabled={saving} className="w-full h-12 bg-[#1E3A5F] text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-xl flex items-center justify-center gap-2">
                                        {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Confirm Milestone
                                    </button>
                                </div>
                            ) : activeModal === 'term' ? (
                                <div className="space-y-4">
                                    <div className="space-y-1.5">
                                        <label className="text-[8px] font-black uppercase text-[#1E3A5F]/40 tracking-widest ml-1">Term Name</label>
                                        <input className={operationsInnerInputCls} placeholder="E.G. TERM ONE 2025"
                                            value={termForm.name} onChange={e => setTermForm({ ...termForm, name: e.target.value })} />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="text-[8px] font-black uppercase text-[#1E3A5F]/40 tracking-widest ml-1">Start Date</label>
                                            <input type="date" className={`${operationsInnerInputCls} !normal-case tabular-nums`}
                                                value={termForm.start_date} onChange={e => setTermForm({ ...termForm, start_date: e.target.value })} />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[8px] font-black uppercase text-[#1E3A5F]/40 tracking-widest ml-1">End Date</label>
                                            <input type="date" className={`${operationsInnerInputCls} !normal-case tabular-nums`}
                                                value={termForm.end_date} onChange={e => setTermForm({ ...termForm, end_date: e.target.value })} />
                                        </div>
                                    </div>
                                    <button onClick={handleSaveTerm} disabled={saving} className="w-full h-12 bg-[#1E3A5F] text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-xl flex items-center justify-center gap-2">
                                        {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Save Term Context
                                    </button>
                                </div>
                            ) : null}
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}

const Coffee = (props) => (
    <svg
        {...props}
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
    >
        <path d="M17 8h1a4 4 0 1 1 0 8h-1" />
        <path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z" />
        <line x1="6" x2="6" y1="2" y2="4" />
        <line x1="10" x2="10" y1="2" y2="4" />
        <line x1="14" x2="14" y1="2" y2="4" />
    </svg>
);
