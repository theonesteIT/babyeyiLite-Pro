import React, { useState, useEffect } from 'react';
import api from '../services/api';
import {
    Settings, Wifi, Calendar, Globe, Bell, Smartphone, Moon, Sun,
    Save, HardDrive, Plus, ShieldCheck, MapPin, Tag, RefreshCw, X, Radio, Watch, Loader2
} from 'lucide-react';

const SystemConfiguration = () => {
    const [activeTab, setActiveTab] = useState('rfid'); // 'rfid', 'preferences', 'events'
    const [darkMode, setDarkMode] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState(null);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isEventModalOpen, setIsEventModalOpen] = useState(false);

    // New Device Form State
    const [newDevice, setNewDevice] = useState({
        device_uid: '',
        device_label: '',
        device_type: 'GATE_SCANNER',
        purpose: '',
        mapped_event_id: '',
        mapped_class_id: ''
    });

    // RFID Configurations from Backend
    const [rfidModules, setRfidModules] = useState([]);
    const [events, setEvents] = useState([]);
    const [classes, setClasses] = useState([]);
    const [selectedEvent, setSelectedEvent] = useState(null);
    const [academicYear, setAcademicYear] = useState('2025-2026');
    const [activeTerms, setActiveTerms] = useState(['Term 1', 'Term 2', 'Term 3']);

    const [eventForm, setEventForm] = useState({
        event_name: '',
        start_time: '07:00',
        end_time: '08:00',
        late_threshold: '07:15',
        target_group: 'STUDENTS',
        residency_filter: 'ALL'
    });

    const fetchDevices = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const res = await api.get('/iot/devices');
            if (res.data.success) {
                setRfidModules(res.data.data);
            }
        } catch (err) {
            console.error('Failed to fetch devices:', err);
            setError('Could not load hardware modules');
        } finally {
            setIsLoading(false);
        }
    };

    const fetchEvents = async () => {
        setIsLoading(true);
        try {
            const res = await api.get('/iot/events');
            if (res.data.success) {
                setEvents(res.data.data);
            }
        } catch (err) {
            console.error('Failed to fetch events:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchClasses = async () => {
        try {
            const res = await api.get('/dos/registry/classes');
            if (res.data.success) {
                setClasses(res.data.data);
            }
        } catch (err) {
            console.error('Failed to fetch classes:', err);
        }
    };

    const fetchAcademicSettings = async () => {
        try {
            const res = await api.get('/dos/academic-calendar-settings');
            if (res.data?.success) {
                const data = res.data.data || {};
                setAcademicYear(data.current_academic_year || '2025-2026');
                setActiveTerms(Array.isArray(data.active_terms) && data.active_terms.length ? data.active_terms : ['Term 1', 'Term 2', 'Term 3']);
            }
        } catch (err) {
            console.error('Failed to fetch academic settings:', err);
        }
    };

    useEffect(() => {
        if (activeTab === 'rfid') {
            fetchDevices();
            fetchEvents();
            fetchClasses();
        } else if (activeTab === 'events') {
            fetchEvents();
        } else if (activeTab === 'preferences') {
            fetchAcademicSettings();
        }
    }, [activeTab]);

    const handleSaveAcademicSettings = async () => {
        setIsSaving(true);
        try {
            const terms = activeTerms.map((t) => String(t).trim()).filter(Boolean);
            const res = await api.put('/dos/academic-calendar-settings', {
                current_academic_year: academicYear,
                active_terms: terms,
            });
            if (res.data?.success) {
                alert('Academic settings saved.');
            }
        } catch (err) {
            console.error('Failed to save academic settings:', err);
            alert(err.response?.data?.message || 'Failed to save academic settings');
        } finally {
            setIsSaving(false);
        }
    };

    const handleAddDevice = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            const res = await api.post('/iot/devices', newDevice);
            if (res.data.success) {
                setIsAddModalOpen(false);
                setNewDevice({ device_uid: '', device_label: '', device_type: 'GATE_SCANNER', purpose: '', mapped_event_id: '', mapped_class_id: '' });
                fetchDevices();
            }
        } catch (err) {
            console.error('Failed to add device:', err);
            alert(err.response?.data?.message || 'Failed to register device');
        } finally {
            setIsSaving(false);
        }
    };

    const handleSaveEvent = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            const res = await api.post('/iot/events', eventForm);
            if (res.data.success) {
                setIsEventModalOpen(false);
                fetchEvents();
            }
        } catch (err) {
            console.error('Failed to save event:', err);
            alert('Failed to save event');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteEvent = async (id) => {
        if (!window.confirm('Are you sure you want to delete this event?')) return;
        try {
            const res = await api.delete(`/iot/events/${id}`);
            if (res.data.success) {
                fetchEvents();
            }
        } catch (err) {
            console.error('Failed to delete event:', err);
        }
    };

    const locations = ['Main Entrance', 'P6 Block A', 'P5 Block B', 'Media Center', 'Cafeteria', 'Staff Lounge', 'Sports Complex'];

    return (
        <div className="animate-in fade-in duration-700 bg-re-bg min-h-screen">
            
            {/* ── High-Fidelity Hero Section ── */}
            <div className="relative w-full min-h-[220px] overflow-hidden">
                <div className="absolute inset-0 bg-[#0a192f]/85 z-10 backdrop-blur-[2px]"></div>
                <img src="/teacher.jpg" alt="Hero Background" className="absolute inset-0 w-full h-full object-cover scale-105 opacity-40 mix-blend-overlay z-0" />
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-[#1E3A5F]/40 via-transparent to-transparent z-10 max-w-[1600px] mx-auto"></div>

                <div className="relative z-20 max-w-[1600px] mx-auto px-6 md:px-12 pt-12 pb-16 flex items-center gap-6">
                    <div className="hidden md:flex shrink-0 w-20 h-20 rounded-3xl border border-white/10 bg-white/5 items-center justify-center backdrop-blur-xl shadow-2xl relative overflow-hidden group">
                        <div className="absolute inset-0 bg-gradient-to-br from-[#FEBF10]/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
                        <Settings size={40} style={{ color: "#FEBF10" }} className="group-hover:rotate-90 transition-transform duration-700" />
                    </div>

                    <div className="space-y-1">
                        <div className="flex items-center gap-2 mb-1.5">
                            <span className="w-5 h-1 rounded-full animate-pulse" style={{ background: "#FEBF10" }}></span>
                            <p className="text-[9px] font-black uppercase tracking-[0.2em]" style={{ color: "#FEBF10" }}>Settings Dashboard</p>
                        </div>
                        <h1 className="text-xl sm:text-3xl md:text-4xl font-black text-white tracking-tighter leading-none mb-1.5 uppercase">System <span style={{ color: "#FEBF10" }}>Configuration</span></h1>
                        <p className="text-[10px] md:text-xs font-medium text-white/60 max-w-lg leading-relaxed uppercase tracking-widest italic">Manage devices, school terms, and settings</p>
                    </div>
                </div>
            </div>

            {/* ── Interactive Command Center Console ── */}
            <div className="max-w-[1600px] mx-auto px-6 md:px-12 -mt-16 relative z-20 pb-16">
                <div className="bg-white rounded-t-3xl shadow-2xl border border-black/5 overflow-hidden flex flex-col md:flex-row min-h-[500px]">

                    {/* Left Sidebar Layout (Navigation) */}
                    <div className="w-full md:w-56 lg:w-64 bg-re-bg/30 border-r border-black/5 flex flex-col pt-5 shrink-0 relative">
                        <div className="px-5 mb-4">
                            <h3 className="text-[9px] font-black uppercase tracking-[0.2em] text-[#1E3A5F]/50 flex items-center gap-1.5">
                                <HardDrive size={12} /> Settings Menu
                            </h3>
                        </div>

                        <div className="flex flex-col space-y-0.5 px-3 mb-6">
                            <button 
                                onClick={() => setActiveTab('rfid')}
                                className={`flex items-center gap-3 px-4 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${
                                    activeTab === 'rfid' ? 'bg-white shadow-sm text-[#1E3A5F] ring-1 ring-black/5' : 'text-re-text-muted hover:text-re-text hover:bg-re-bg'
                                }`}
                            >
                                <Wifi size={14} className={activeTab === 'rfid' ? "text-[#FEBF10]" : ""} /> Scanner Devices
                            </button>
                            <button 
                                onClick={() => setActiveTab('events')}
                                className={`flex items-center gap-3 px-4 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${
                                    activeTab === 'events' ? 'bg-white shadow-sm text-[#1E3A5F] ring-1 ring-black/5' : 'text-re-text-muted hover:text-re-text hover:bg-re-bg'
                                }`}
                            >
                                <Calendar size={14} className={activeTab === 'events' ? "text-[#FEBF10]" : ""} /> Attendance Events
                            </button>
                            <button 
                                onClick={() => setActiveTab('preferences')}
                                className={`flex items-center gap-3 px-4 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${
                                    activeTab === 'preferences' ? 'bg-white shadow-sm text-[#1E3A5F] ring-1 ring-black/5' : 'text-re-text-muted hover:text-re-text hover:bg-re-bg'
                                }`}
                            >
                                <Globe size={14} className={activeTab === 'preferences' ? "text-[#FEBF10]" : ""} /> Preferences
                            </button>
                        </div>

                        <div className="px-5 mt-auto pb-6 hidden md:block">
                            <div className="bg-white border border-black/5 p-3 rounded-2xl shadow-inner text-center">
                                <Watch size={16} className="mx-auto mb-1.5 opacity-20 text-[#1E3A5F]" />
                                <p className="text-[8px] font-black uppercase tracking-widest text-re-text-muted">System Status</p>
                                <p className="text-[10px] font-black uppercase tracking-tight text-emerald-500 mt-1">Online</p>
                            </div>
                        </div>
                    </div>

                    {/* Right Output Layout (Content) */}
                    <div className="flex-1 p-5 md:p-8 animate-in fade-in zoom-in-95 duration-300">
                        
                        {/* ── TAB: RFID HARDWARE MATRIX ── */}
                        {activeTab === 'rfid' && (
                            <div className="space-y-6 animate-in slide-in-from-right-4 duration-500">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h2 className="text-lg md:text-xl font-black text-[#1E3A5F] uppercase tracking-tighter">Scanner Devices</h2>
                                        <p className="text-[9px] font-bold text-re-text-muted uppercase tracking-widest mt-1">Manage where scanners are located</p>
                                    </div>
                                    <button 
                                        onClick={() => setIsAddModalOpen(true)}
                                        className="h-9 px-4 rounded-xl flex items-center justify-center gap-1.5 text-white font-black text-[9px] uppercase tracking-widest shadow-md hover:scale-105 active:scale-95 transition-all" style={{ background: "linear-gradient(135deg, #1E3A5F 0%, #0D2644 100%)" }}
                                    >
                                        <Plus size={14} style={{ color: "#FEBF10" }} /> Add Scanner
                                    </button>
                                </div>

                                <div className="bg-white border border-black/5 rounded-2xl overflow-hidden shadow-sm relative min-h-[200px]">
                                    {isLoading && (
                                        <div className="absolute inset-0 bg-white/50 backdrop-blur-[1px] z-30 flex items-center justify-center">
                                            <Loader2 size={24} className="text-[#1E3A5F] animate-spin" />
                                        </div>
                                    )}

                                    {error ? (
                                        <div className="p-12 text-center">
                                            <p className="text-[10px] font-black text-red-500 uppercase tracking-widest">{error}</p>
                                            <button onClick={fetchDevices} className="mt-4 text-[9px] font-black text-[#FEBF10] uppercase tracking-widest flex items-center gap-2 mx-auto">
                                                <RefreshCw size={12} /> Retry
                                            </button>
                                        </div>
                                    ) : rfidModules.length === 0 && !isLoading ? (
                                        <div className="p-12 text-center">
                                            <div className="w-12 h-12 bg-re-bg rounded-2xl flex items-center justify-center mx-auto mb-4 border border-black/5">
                                                <Wifi size={24} className="text-[#1E3A5F]/20" />
                                            </div>
                                            <p className="text-[10px] font-black text-re-text-muted uppercase tracking-widest">No hardware modules registered yet</p>
                                        </div>
                                    ) : (
                                        <table className="w-full text-left border-collapse">
                                            <thead>
                                                <tr className="bg-re-bg/50 border-b border-black/5">
                                                    <th className="px-5 py-3 text-[9px] font-black text-re-text-muted uppercase tracking-[0.2em]">Scanner UID</th>
                                                    <th className="px-5 py-3 text-[9px] font-black text-re-text-muted uppercase tracking-[0.2em]">Label / Purpose</th>
                                                    <th className="px-5 py-3 text-[9px] font-black text-re-text-muted uppercase tracking-[0.2em]">Status</th>
                                                    <th className="px-5 py-3 text-[9px] font-black text-re-text-muted uppercase tracking-[0.2em]">Mapping</th>
                                                    <th className="px-5 py-3 text-[9px] font-black text-re-text-muted uppercase tracking-[0.2em] text-right">Config</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-black/5 bg-white">
                                                {rfidModules.map((hw) => (
                                                    <tr key={hw.id} className="hover:bg-re-bg/20 transition-colors group">
                                                        <td className="px-5 py-3.5">
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-8 h-8 rounded-lg bg-re-bg border border-black/5 flex-shrink-0 flex items-center justify-center shadow-inner relative">
                                                                    <Radio size={14} className="text-[#1E3A5F] opacity-70" />
                                                                    {hw.status === 'Online' && (
                                                                        <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-white animate-pulse"></span>
                                                                    )}
                                                                </div>
                                                                <div>
                                                                    <p className="text-[11px] font-black text-re-text uppercase tracking-tight">{hw.device_uid}</p>
                                                                    <p className="text-[8px] font-bold text-re-text-muted uppercase tracking-widest">{hw.device_type?.replace('_', ' ')}</p>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-5 py-3.5">
                                                            <div className="space-y-1">
                                                                <p className="text-[10px] font-black text-[#1E3A5F] uppercase tracking-tight">{hw.device_label || 'Unnamed Device'}</p>
                                                                <p className="text-[8px] font-black text-blue-600/70 uppercase tracking-widest opacity-75">{hw.purpose || 'Global Access'}</p>
                                                            </div>
                                                        </td>
                                                        <td className="px-5 py-3.5">
                                                            <div className={`inline-flex px-2 py-1 rounded-md text-[8px] font-black uppercase tracking-widest ring-1 ring-inset ${
                                                                    hw.status === 'Online' ? 'bg-emerald-50 text-emerald-600 ring-emerald-500/20' : 'bg-red-50 text-red-600 ring-red-500/20'
                                                                }`}>
                                                                {hw.status}
                                                            </div>
                                                        </td>
                                                        <td className="px-5 py-3.5">
                                                            <div className="flex flex-col gap-1.5">
                                                                {hw.mapped_event_id && (
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="w-2 h-2 rounded-full bg-[#FEBF10]"></span>
                                                                        <p className="text-[10px] font-black text-[#1E3A5F] uppercase tracking-tight">
                                                                            Pulse: {events.find(e => e.id === hw.mapped_event_id)?.event_name || 'Event'}
                                                                        </p>
                                                                    </div>
                                                                )}
                                                                {hw.mapped_class_id && (
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                                                                        <p className="text-[10px] font-black text-[#1E3A5F] uppercase tracking-tight">
                                                                            Class: {(() => {
                                                                                const c = classes.find(c => c.id === hw.mapped_class_id);
                                                                                return c ? `${c.group_name} ${c.stream_name || ''}` : `Class #${hw.mapped_class_id}`;
                                                                            })()}
                                                                        </p>
                                                                    </div>
                                                                )}
                                                                {!hw.mapped_event_id && !hw.mapped_class_id && (
                                                                    <p className="text-[9px] font-bold text-re-text-muted uppercase italic">Unmapped / General</p>
                                                                )}
                                                            </div>
                                                        </td>
                                                        <td className="px-5 py-3.5 text-right">
                                                            <button className="h-7 px-3 rounded-lg border border-black/5 text-re-text font-black text-[9px] uppercase tracking-widest hover:bg-re-bg transition-colors shadow-sm bg-white">Setup</button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    )}
                                </div>
                            </div>
                        )}


                        {/* ── TAB: ATTENDANCE EVENTS ── */}
                        {activeTab === 'events' && (
                            <div className="space-y-6 animate-in slide-in-from-right-4 duration-500">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h2 className="text-lg md:text-xl font-black text-[#1E3A5F] uppercase tracking-tighter">Attendance Events</h2>
                                        <p className="text-[9px] font-bold text-re-text-muted uppercase tracking-widest mt-1">Define school-wide tracking windows</p>
                                    </div>
                                    <button 
                                        onClick={() => {
                                            setEventForm({ event_name: '', start_time: '07:00', end_time: '08:00', late_threshold: '07:15', target_group: 'STUDENTS', residency_filter: 'ALL' });
                                            setIsEventModalOpen(true);
                                        }}
                                        className="h-9 px-4 rounded-xl flex items-center justify-center gap-1.5 text-white font-black text-[9px] uppercase tracking-widest shadow-md hover:scale-105 active:scale-95 transition-all" style={{ background: "linear-gradient(135deg, #1E3A5F 0%, #0D2644 100%)" }}
                                    >
                                        <Plus size={14} style={{ color: "#FEBF10" }} /> Create Event
                                    </button>
                                </div>

                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                    {events.map((event) => (
                                        <div key={event.id} className="bg-white border border-black/5 p-5 rounded-2xl shadow-sm hover:shadow-md transition-all group relative overflow-hidden">
                                            <div className="absolute top-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                                <button onClick={() => handleDeleteEvent(event.id)} className="text-red-500 hover:text-red-700 p-1">
                                                    <X size={14} />
                                                </button>
                                            </div>
                                            <div className="flex items-start gap-4">
                                                <div className="w-12 h-12 rounded-xl bg-re-bg flex items-center justify-center shrink-0 border border-black/5">
                                                    <Watch size={20} className="text-[#1E3A5F]" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h3 className="text-xs font-black text-[#1E3A5F] uppercase tracking-tight truncate">{event.event_name}</h3>
                                                    <div className="flex items-center gap-3 mt-1.5">
                                                        <div className="flex items-center gap-1 text-[9px] font-bold text-re-text-muted">
                                                            <Calendar size={10} /> {event.start_time} - {event.end_time}
                                                        </div>
                                                        <div className="flex items-center gap-1 text-[9px] font-bold text-orange-500">
                                                            <ShieldCheck size={10} /> Late: {event.late_threshold}
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2 mt-3 mb-1">
                                                        <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-600 text-[8px] font-black uppercase tracking-widest">
                                                            {event.target_group}
                                                        </span>
                                                        <span className="px-2 py-0.5 rounded bg-gray-50 text-gray-600 text-[8px] font-black uppercase tracking-widest">
                                                            {event.residency_filter} RESIDENCY
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    {events.length === 0 && !isLoading && (
                                        <div className="col-span-full py-12 text-center bg-re-bg/20 rounded-2xl border border-dashed border-black/10">
                                            <p className="text-[10px] font-black text-re-text-muted uppercase tracking-widest">No attendance events defined yet</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}


                        {/* ── TAB: PREFERENCES ── */}
                        {activeTab === 'preferences' && (
                            <div className="space-y-6 animate-in slide-in-from-right-4 duration-500">
                                <div>
                                    <h2 className="text-lg md:text-xl font-black text-[#1E3A5F] uppercase tracking-tighter">System Preferences</h2>
                                    <p className="text-[9px] font-bold text-re-text-muted uppercase tracking-widest mt-1">Manage notifications and features</p>
                                </div>

                                <div className="space-y-3">
                                    <div className="p-4 bg-white border border-black/5 shadow-sm rounded-2xl">
                                        <h3 className="text-[10px] font-black uppercase tracking-widest text-[#1E3A5F] mb-3">Academic Calendar</h3>
                                        <div className="grid md:grid-cols-2 gap-3">
                                            <div>
                                                <label className="block text-[9px] font-black uppercase tracking-widest text-re-text-muted mb-1">Current Academic Year</label>
                                                <input
                                                    value={academicYear}
                                                    onChange={(e) => setAcademicYear(e.target.value)}
                                                    placeholder="2025-2026"
                                                    className="w-full h-10 rounded-xl border border-black/10 px-3 text-xs font-bold"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[9px] font-black uppercase tracking-widest text-re-text-muted mb-1">Active Terms</label>
                                                <div className="flex gap-2">
                                                    {['Term 1', 'Term 2', 'Term 3'].map((term) => {
                                                        const checked = activeTerms.includes(term);
                                                        return (
                                                            <label key={term} className="inline-flex items-center gap-1 text-[10px] font-black">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={checked}
                                                                    onChange={(e) => {
                                                                        setActiveTerms((prev) => e.target.checked ? [...new Set([...prev, term])] : prev.filter((x) => x !== term));
                                                                    }}
                                                                />
                                                                {term}
                                                            </label>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="mt-3">
                                            <button
                                                type="button"
                                                disabled={isSaving}
                                                onClick={handleSaveAcademicSettings}
                                                className="h-10 px-4 rounded-xl bg-[#1E3A5F] text-white font-black text-[10px] uppercase tracking-widest inline-flex items-center gap-2"
                                            >
                                                {isSaving ? <Loader2 size={14} className="animate-spin text-[#FEBF10]" /> : <Save size={14} style={{ color: "#FEBF10" }} />}
                                                Save Academic Calendar
                                            </button>
                                        </div>
                                    </div>
                                    {[
                                        { icon: <Moon size={14} />, label: "Dark Mode", desc: "Use a darker theme for the interface", active: darkMode, toggle: () => setDarkMode(!darkMode) },
                                        { icon: <Bell size={14} />, label: "Email Alerts", desc: "Send emails for critical discipline issues", active: true, toggle: () => {} },
                                        { icon: <Smartphone size={14} />, label: "SMS Absence Alerts", desc: "Message parents when a student is absent", active: false, toggle: () => {} },
                                        { icon: <HardDrive size={14} />, label: "Daily Backup", desc: "Save all data every night at 3:00 AM", active: true, toggle: () => {} }
                                    ].map((pref, i) => (
                                        <div key={i} className="flex items-center justify-between p-4 bg-white border border-black/5 shadow-sm rounded-2xl group">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors ${pref.active ? "bg-[#1E3A5F] text-white" : "bg-re-bg text-[#1E3A5F]/40"}`}>
                                                    {pref.icon}
                                                </div>
                                                <div>
                                                    <h3 className="text-[10px] font-black uppercase tracking-widest text-[#1E3A5F]">{pref.label}</h3>
                                                    <p className="text-[9px] font-bold text-re-text-muted uppercase tracking-wider">{pref.desc}</p>
                                                </div>
                                            </div>
                                            <button 
                                                onClick={pref.toggle}
                                                className={`w-10 h-5 rounded-full transition-all relative ${pref.active ? "bg-emerald-500" : "bg-black/10"}`}
                                            >
                                                <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-all ${pref.active ? "left-5" : "left-0.5"}`}></span>
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                    </div>
                </div>
            </div>
            {/* ── ADD DEVICE MODAL ── */}
            {isAddModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#0a192f]/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white rounded-[32px] shadow-2xl border border-black/5 w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-300">
                        <div className="p-8 bg-gradient-to-br from-[#1E3A5F] to-[#0D2644] text-white">
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center backdrop-blur-md">
                                        <Wifi size={18} style={{ color: "#FEBF10" }} />
                                    </div>
                                    <h3 className="text-sm font-black uppercase tracking-widest">Register Hardware</h3>
                                </div>
                                <button onClick={() => setIsAddModalOpen(false)} className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-all">
                                    <X size={16} />
                                </button>
                            </div>
                            <p className="text-[10px] font-bold text-white/60 uppercase tracking-widest">Add new NodeMCU scanner to the network</p>
                        </div>

                        <form onSubmit={handleAddDevice} className="p-8 space-y-6">
                            <div className="space-y-4">
                                <div className="space-y-1.5">
                                    <label className="text-[9px] font-black text-[#1E3A5F] uppercase tracking-widest ml-1">Device MAC Address / UID</label>
                                    <div className="relative">
                                        <Tag size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#1E3A5F]/40" />
                                        <input 
                                            required
                                            placeholder="e.g. 8C:AA:B5:12:34:56"
                                            className="w-full h-12 pl-12 pr-4 bg-re-bg rounded-2xl border border-black/5 focus:ring-2 ring-[#FEBF10]/50 outline-none text-xs font-bold uppercase"
                                            value={newDevice.device_uid}
                                            onChange={e => setNewDevice({...newDevice, device_uid: e.target.value})}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[9px] font-black text-[#1E3A5F] uppercase tracking-widest ml-1">Custom Label</label>
                                    <div className="relative">
                                        <MapPin size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#1E3A5F]/40" />
                                        <input 
                                            required
                                            placeholder="e.g. Main Gate Scanner"
                                            className="w-full h-12 pl-12 pr-4 bg-re-bg rounded-2xl border border-black/5 focus:ring-2 ring-[#FEBF10]/50 outline-none text-xs font-bold"
                                            value={newDevice.device_label}
                                            onChange={e => setNewDevice({...newDevice, device_label: e.target.value})}
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-[9px] font-black text-[#1E3A5F] uppercase tracking-widest ml-1">Device Type</label>
                                        <select 
                                            className="w-full h-12 px-4 bg-re-bg rounded-2xl border border-black/5 outline-none text-[10px] font-black uppercase tracking-widest cursor-pointer"
                                            value={newDevice.device_type}
                                            onChange={e => setNewDevice({...newDevice, device_type: e.target.value})}
                                        >
                                            <option value="GATE_SCANNER">Gate Scanner</option>
                                            <option value="CLASS_READER">Class Reader</option>
                                            <option value="LIBRARY_GATE">Library Gate</option>
                                            <option value="POS_SCANNER">POS Scanner</option>
                                        </select>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[9px] font-black text-[#1E3A5F] uppercase tracking-widest ml-1">Scan Purpose</label>
                                        <input 
                                            placeholder="e.g. Attendance"
                                            className="w-full h-12 px-4 bg-re-bg rounded-2xl border border-black/5 outline-none text-xs font-bold"
                                            value={newDevice.purpose}
                                            onChange={e => setNewDevice({...newDevice, purpose: e.target.value})}
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-[9px] font-black text-[#1E3A5F] uppercase tracking-widest ml-1">Associated Pulse</label>
                                        <div className="relative">
                                            <Radio size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#1E3A5F]/40" />
                                            <select 
                                                className="w-full h-11 pl-12 pr-4 bg-re-bg rounded-2xl border border-black/5 outline-none text-[10px] font-black uppercase tracking-widest cursor-pointer appearance-none"
                                                value={newDevice.mapped_event_id}
                                                onChange={e => setNewDevice({...newDevice, mapped_event_id: e.target.value})}
                                            >
                                                <option value="">No Pulse</option>
                                                {events.map(ev => (
                                                    <option key={ev.id} value={ev.id}>{ev.event_name}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[9px] font-black text-[#1E3A5F] uppercase tracking-widest ml-1">Mapped Class</label>
                                        <div className="relative">
                                            <Plus size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#1E3A5F]/40" />
                                            <select 
                                                className="w-full h-11 pl-12 pr-4 bg-re-bg rounded-2xl border border-black/5 outline-none text-[10px] font-black uppercase tracking-widest cursor-pointer appearance-none"
                                                value={newDevice.mapped_class_id}
                                                onChange={e => setNewDevice({...newDevice, mapped_class_id: e.target.value})}
                                            >
                                                <option value="">No Class</option>
                                                {classes.map(c => (
                                                    <option key={c.id} value={c.id}>{c.group_name} {c.stream_name || ''}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-3 pt-4">
                                <button 
                                    type="button"
                                    onClick={() => setIsAddModalOpen(false)}
                                    className="flex-1 h-12 rounded-2xl border border-black/5 text-[#1E3A5F] font-black text-[10px] uppercase tracking-widest hover:bg-re-bg transition-all"
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="submit"
                                    disabled={isSaving}
                                    className="flex-[1.5] h-12 rounded-2xl bg-[#1E3A5F] text-white font-black text-[10px] uppercase tracking-widest shadow-lg shadow-[#1E3A5F]/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2"
                                >
                                    {isSaving ? <Loader2 size={16} className="animate-spin text-[#FEBF10]" /> : <Save size={16} style={{ color: "#FEBF10" }} />}
                                    Save Registry
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            {/* ── ATTENDANCE EVENT MODAL ── */}
            {isEventModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#0a192f]/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white rounded-[32px] shadow-2xl border border-black/5 w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-300">
                        <div className="p-8 bg-gradient-to-br from-[#1E3A5F] to-[#0D2644] text-white">
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center backdrop-blur-md">
                                        <Watch size={18} style={{ color: "#FEBF10" }} />
                                    </div>
                                    <h3 className="text-sm font-black uppercase tracking-widest">New Event</h3>
                                </div>
                                <button onClick={() => setIsEventModalOpen(false)} className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-all">
                                    <X size={16} />
                                </button>
                            </div>
                            <p className="text-[10px] font-bold text-white/60 uppercase tracking-widest">Define tracking window for scans</p>
                        </div>

                        <form onSubmit={handleSaveEvent} className="p-8 space-y-4">
                            <div className="space-y-1.5">
                                <label className="text-[9px] font-black text-[#1E3A5F] uppercase tracking-widest ml-1">Event Name</label>
                                <input 
                                    required
                                    placeholder="e.g. Morning Assembly"
                                    className="w-full h-11 px-4 bg-re-bg rounded-2xl border border-black/5 outline-none text-xs font-bold"
                                    value={eventForm.event_name}
                                    onChange={e => setEventForm({...eventForm, event_name: e.target.value})}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-[9px] font-black text-[#1E3A5F] uppercase tracking-widest ml-1">Start Time</label>
                                    <input type="time" className="w-full h-11 px-4 bg-re-bg rounded-2xl border border-black/5 outline-none text-xs font-bold"
                                        value={eventForm.start_time} onChange={e => setEventForm({...eventForm, start_time: e.target.value})} />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[9px] font-black text-[#1E3A5F] uppercase tracking-widest ml-1">End Time</label>
                                    <input type="time" className="w-full h-11 px-4 bg-re-bg rounded-2xl border border-black/5 outline-none text-xs font-bold"
                                        value={eventForm.end_time} onChange={e => setEventForm({...eventForm, end_time: e.target.value})} />
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[9px] font-black text-[#1E3A5F] uppercase tracking-widest ml-1">Late Threshold</label>
                                <input type="time" className="w-full h-11 px-4 bg-re-bg rounded-2xl border border-black/5 outline-none text-xs font-bold"
                                    value={eventForm.late_threshold} onChange={e => setEventForm({...eventForm, late_threshold: e.target.value})} />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-[9px] font-black text-[#1E3A5F] uppercase tracking-widest ml-1">Target Group</label>
                                    <select className="w-full h-11 px-4 bg-re-bg rounded-2xl border border-black/5 outline-none text-[10px] font-black uppercase tracking-widest cursor-pointer"
                                        value={eventForm.target_group} onChange={e => setEventForm({...eventForm, target_group: e.target.value})}>
                                        <option value="STUDENTS">Students</option>
                                        <option value="STAFF">Staff</option>
                                        <option value="BOTH">Both</option>
                                    </select>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[9px] font-black text-[#1E3A5F] uppercase tracking-widest ml-1">Residency</label>
                                    <select className="w-full h-11 px-4 bg-re-bg rounded-2xl border border-black/5 outline-none text-[10px] font-black uppercase tracking-widest cursor-pointer"
                                        value={eventForm.residency_filter} onChange={e => setEventForm({...eventForm, residency_filter: e.target.value})}>
                                        <option value="ALL">All Students</option>
                                        <option value="BOARDING">Boarding Only</option>
                                        <option value="DAY">Day Students Only</option>
                                    </select>
                                </div>
                            </div>

                            <div className="flex items-center gap-3 pt-4">
                                <button type="button" onClick={() => setIsEventModalOpen(false)} className="flex-1 h-12 rounded-2xl border border-black/5 text-[#1E3A5F] font-black text-[10px] uppercase tracking-widest hover:bg-re-bg transition-all">Cancel</button>
                                <button type="submit" disabled={isSaving} className="flex-[1.5] h-12 rounded-2xl bg-[#1E3A5F] text-white font-black text-[10px] uppercase tracking-widest shadow-lg hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2">
                                    {isSaving ? <Loader2 size={16} className="animate-spin text-[#FEBF10]" /> : <Save size={16} style={{ color: "#FEBF10" }} />} Save Event
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SystemConfiguration;
