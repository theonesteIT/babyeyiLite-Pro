import React, { useState, useEffect } from 'react';
import {
    Calendar, Clock, MapPin, Search, ChevronLeft, ChevronRight, ChevronUp,
    List, Grid as GridIcon, Filter, Plus, FileText, CheckCircle , ChevronDown
} from 'lucide-react';
import api from '../services/api';
import { teacherInnerSearchCls, teacherInnerSelectCls } from '../utils/teacherGradebookUi';

export default function Timetable() {
    const [view, setView] = useState('grid'); // 'grid' or 'list'
    const [selectedDay, setSelectedDay] = useState('Monday');
    const [searchQuery, setSearchQuery] = useState('');
    const [showMobileFilters, setShowMobileFilters] = useState(false);
    const [mockSchedule, setMockSchedule] = useState([]);

    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

    useEffect(() => {
        const fetchTimetable = async () => {
            try {
                const res = await api.get('/teacher-portal/timetable');
                if (res.data.success) {
                    setMockSchedule(res.data.data || []);
                }
            } catch (e) {
                console.error('Failed to load timetable', e);
            }
        };
        fetchTimetable();
    }, []);

    const searchNorm = searchQuery.trim().toLowerCase();
    const scheduleMatches = (session) => {
        if (!searchNorm) return true;
        return [session.subject, session.group, session.room, session.type]
            .filter(Boolean)
            .some((value) => String(value).toLowerCase().includes(searchNorm));
    };

    const todaySchedule = mockSchedule
        .filter(s => s.day === selectedDay && scheduleMatches(s))
        .sort((a, b) => a.time.localeCompare(b.time));

    const getColorClasses = (color) => {
        switch (color) {
            case 'blue': return 'bg-blue-50 text-blue-700 ring-blue-500/20';
            case 'emerald': return 'bg-emerald-50 text-emerald-700 ring-emerald-500/20';
            case 'purple': return 'bg-purple-50 text-purple-700 ring-purple-500/20';
            default: return 'bg-re-orange/5 text-re-orange ring-re-orange/20';
        }
    };

    return (
        <div className="animate-in fade-in duration-700 bg-re-bg min-h-screen pb-12">

            {/* ── High-Fidelity Hero Section ── */}
            <div className="relative w-full min-h-[280px] overflow-hidden">
                <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(8,17,31,0.92),rgba(18,35,58,0.84),rgba(33,49,74,0.78))] z-10 backdrop-blur-[2px]"></div>
                <div className="absolute inset-0 z-10 bg-[radial-gradient(circle_at_top_right,rgba(255,140,0,0.20),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(255,184,0,0.10),transparent_24%)]"></div>
                <img src="/teacher.jpg" alt="Hero" className="absolute inset-0 w-full h-full object-cover scale-105 opacity-100" />

                <div className="relative z-20 max-w-[1600px] mx-auto px-6 md:px-12 pt-16 pb-24">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="w-6 h-1 bg-re-orange rounded-full"></span>
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/80">Schedular Module</span>
                        </div>
                        <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight">
                            My <span className="text-re-orange">Timetable</span>
                        </h1>
                        <p className="text-xs md:text-sm text-white/70 font-bold max-w-xl leading-relaxed">
                            Navigate your weekly teaching schedule. Plan your classes, monitor practical labs, and sync administrative meetings automatically.
                        </p>
                    </div>
                </div>
            </div>

            {/* ── Main Content Area ── */}
            <div className="relative z-30 max-w-[1600px] mx-auto px-4 md:px-12 -mt-20">
                <div className="bg-white rounded-t-[1.6rem] shadow-2xl border border-black/5 overflow-hidden flex flex-col">

                    {/* Header/Controls inside the card */}
                    <div className="px-4 py-4 lg:px-3 lg:py-2 border-b border-black/5 flex flex-col lg:flex-row lg:flex-nowrap lg:items-center gap-4 lg:gap-2 bg-re-bg/20">
                        <div className="flex items-center gap-3 lg:gap-2 w-full lg:w-auto lg:shrink-0">
                            <div className="hidden lg:flex bg-white p-1 rounded-lg shadow-sm border border-black/[0.07] shrink-0">
                                <button
                                    onClick={() => setView('grid')}
                                    className={`inline-flex items-center justify-center gap-1.5 h-6 px-3 rounded-md text-[7px] font-black uppercase tracking-widest transition-all ${view === 'grid' ? 'bg-re-bg text-re-orange border border-re-orange/10' : 'text-re-text-muted hover:text-re-text hover:bg-re-bg/50'}`}
                                >
                                    <Calendar size={11} /> Grid
                                </button>
                                <button
                                    onClick={() => setView('list')}
                                    className={`inline-flex items-center justify-center gap-1.5 h-6 px-3 rounded-md text-[7px] font-black uppercase tracking-widest transition-all ${view === 'list' ? 'bg-re-bg text-re-orange border border-re-orange/10' : 'text-re-text-muted hover:text-re-text hover:bg-re-bg/50'}`}
                                >
                                    <List size={11} /> Agenda
                                </button>
                            </div>

                            <button
                                onClick={() => setShowMobileFilters(!showMobileFilters)}
                                className="lg:hidden w-full flex justify-between items-center gap-2 text-[10px] font-black uppercase tracking-widest transition-all"
                            >
                                <div className="flex items-center gap-2">
                                    <Filter size={14} className="text-re-orange" /> show filters
                                </div>
                                {showMobileFilters ? <ChevronUp size={14} className="text-re-orange" /> : <ChevronDown size={14} />}
                            </button>
                        </div>

                        <div className={`${showMobileFilters ? 'flex' : 'hidden lg:flex'} flex-col lg:flex-row lg:flex-nowrap lg:items-center gap-3 lg:gap-2 w-full lg:flex-1 lg:min-w-0 animate-in slide-in-from-top-2 duration-300`}>
                            <div className="flex lg:hidden bg-white p-1 rounded-xl shadow-sm border border-black/5 w-full overflow-x-auto custom-scrollbar">
                                <button
                                    onClick={() => setView('grid')}
                                    className={`flex-1 flex items-center justify-center gap-2 h-8 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all ${view === 'grid' ? 'bg-re-bg text-re-orange border border-re-orange/10' : 'text-re-text-muted hover:text-re-text hover:bg-re-bg/50'}`}
                                >
                                    <Calendar size={12} /> Weekly Grid
                                </button>
                                <button
                                    onClick={() => setView('list')}
                                    className={`flex-1 flex items-center justify-center gap-2 h-8 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all ${view === 'list' ? 'bg-re-bg text-re-orange border border-re-orange/10' : 'text-re-text-muted hover:text-re-text hover:bg-re-bg/50'}`}
                                >
                                    <List size={12} /> Daily Agenda
                                </button>
                            </div>

                            <div className="flex items-center gap-2 w-full lg:w-auto lg:shrink-0">
                                <button
                                    type="button"
                                    onClick={() => {
                                        const idx = days.indexOf(selectedDay);
                                        setSelectedDay(days[(idx - 1 + days.length) % days.length]);
                                    }}
                                    className="shrink-0 h-10 lg:h-8 w-10 lg:w-8 flex items-center justify-center rounded-xl lg:rounded-lg border border-black/[0.07] bg-re-bg text-re-orange shadow-[inset_0_2px_6px_rgba(15,23,42,0.06)] hover:bg-white/80 transition-colors"
                                >
                                    <ChevronLeft size={16} className="lg:w-[15px] lg:h-[15px]" />
                                </button>
                                <div className="relative flex-1 min-w-[8.5rem] lg:w-[8.75rem] lg:flex-none">
                                    <Calendar size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-re-text-muted z-[1] pointer-events-none" />
                                    <select
                                        value={selectedDay}
                                        onChange={(e) => setSelectedDay(e.target.value)}
                                        className={`${teacherInnerSelectCls} !pl-8`}
                                    >
                                        {days.map(d => <option key={d} value={d}>{d}</option>)}
                                    </select>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => {
                                        const idx = days.indexOf(selectedDay);
                                        setSelectedDay(days[(idx + 1) % days.length]);
                                    }}
                                    className="shrink-0 h-10 lg:h-8 w-10 lg:w-8 flex items-center justify-center rounded-xl lg:rounded-lg border border-black/[0.07] bg-re-bg text-re-orange shadow-[inset_0_2px_6px_rgba(15,23,42,0.06)] hover:bg-white/80 transition-colors"
                                >
                                    <ChevronRight size={16} className="lg:w-[15px] lg:h-[15px]" />
                                </button>
                            </div>

                            <div className="relative w-full lg:flex-1 lg:min-w-[7rem] lg:max-w-[12rem] group">
                                <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-re-text-muted/50 group-focus-within:text-re-orange transition-colors lg:hidden z-[1] pointer-events-none" />
                                <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-re-text-muted/50 group-focus-within:text-re-orange transition-colors hidden lg:block z-[1] pointer-events-none" />
                                <input
                                    type="text"
                                    placeholder="Search lesson..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className={`${teacherInnerSearchCls} !pl-10 lg:!pl-8`}
                                />
                            </div>

                            <div className="hidden lg:flex items-center gap-1.5 w-full lg:w-auto lg:shrink-0">
                                <button className="h-8 px-3 bg-white border border-black/[0.07] text-re-text font-black text-[7px] uppercase tracking-tight rounded-lg hover:bg-re-bg transition-all flex items-center justify-center gap-1.5 shadow-sm">
                                    <FileText size={12} className="text-re-orange opacity-70" /> Export PDF
                                </button>
                                <button className="h-8 px-3 bg-re-grad-orange text-white font-black text-[7px] uppercase tracking-tight rounded-lg shadow-re-glow hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-1.5">
                                    <Plus size={12} /> Reschedule
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Content inside the card */}
                    <div className="bg-white">
                        {view === 'grid' ? (
                            <div className="bg-white shadow-sm border border-black/5 overflow-x-auto custom-scrollbar">
                                <table className="w-full text-left border-collapse table-fixed">
                                    <thead>
                                        <tr>
                                            <th className="w-12 sm:w-24 border-r border-b border-black/5 bg-re-bg/50 p-1 sm:p-4"></th>
                                            {days.map(day => (
                                                <th key={day} className="border-b border-r border-black/5 bg-re-bg/50 p-1 sm:p-4 text-center text-[7px] sm:text-[10px] font-black uppercase tracking-[0.05em] sm:tracking-widest text-re-text-muted">
                                                    {day.substring(0, 3)}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {['08:00', '10:00', '12:00', '14:00', '16:00'].map(time => (
                                            <tr key={time}>
                                                <td className="border-r border-b border-black/5 bg-re-bg p-1 sm:p-4 text-center text-[8px] sm:text-xs font-bold text-gray-400 w-12 sm:w-24 sticky left-0 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                                                    {time}
                                                </td>
                                                {days.map(day => {
                                                    const session = mockSchedule.find(s => s.day === day && s.time.startsWith(time) && scheduleMatches(s));
                                                    return (
                                                        <td key={`${day}-${time}`} className="border-r border-b border-black/5 h-20 sm:h-32 align-top transition-all">
                                                            {session && (
                                                                <div className={`h-full p-1 sm:p-4 flex flex-col gap-0.5 sm:gap-2 ring-1 ring-inset ${getColorClasses(session.color)}`}>
                                                                    <div className="flex items-center justify-between">
                                                                        <span className="text-[6px] sm:text-[10px] font-black uppercase tracking-widest opacity-70 truncate">{session.type}</span>
                                                                        <div className="hidden sm:flex w-5 h-5 rounded-md bg-white/50 items-center justify-center">
                                                                            <CheckCircle size={10} className="opacity-60" />
                                                                        </div>
                                                                    </div>
                                                                    <div>
                                                                        <h4 className="text-[8px] sm:text-sm font-black tracking-tight leading-[1] sm:leading-tight truncate sm:whitespace-normal">{session.subject}</h4>
                                                                        <p className="text-[7px] sm:text-[10px] font-bold opacity-80 mt-0.5 sm:mt-1 truncate">{session.group}</p>
                                                                    </div>
                                                                    <div className="mt-auto flex items-center gap-1 text-[7px] sm:text-[9px] font-bold uppercase tracking-widest opacity-80 truncate">
                                                                        <MapPin size={8} className="sm:w-2.5 sm:h-2.5" /> <span className="truncate">{session.room}</span>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </td>
                                                    );
                                                })}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="space-y-4 p-3">
                                <h3 className="text-sm font-black uppercase tracking-widest text-re-text-muted px-2">
                                    {selectedDay}'s Classes
                                </h3>
                                {todaySchedule.length === 0 ? (
                                    <div className="bg-white rounded-2xl sm:rounded-3xl p-6 sm:p-12 text-center border border-black/5 shadow-sm">
                                        <div className="w-12 h-12 sm:w-16 sm:h-16 bg-re-bg rounded-xl sm:rounded-2xl mx-auto flex items-center justify-center text-gray-300 mb-4">
                                            <Calendar size={20} className="sm:w-6 sm:h-6" />
                                        </div>
                                        <h3 className="text-[10px] sm:text-sm font-black text-re-text tracking-tight uppercase">No Classes Scheduled</h3>
                                        <p className="text-[8px] sm:text-[10px] font-bold text-re-text-muted uppercase tracking-widest mt-2 block">Enjoy your free time!</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
                                        {todaySchedule.map(session => (
                                            <div key={session.id} className={`bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-black/5 shadow-lg relative overflow-hidden group hover:-translate-y-1 transition-all duration-300`}>
                                                <div className={`absolute top-0 right-0 w-16 h-16 sm:w-24 sm:h-24 blur-[30px] sm:blur-[40px] opacity-20 -mr-6 -mt-6 rounded-full ${session.color === 'blue' ? 'bg-blue-500' : session.color === 'emerald' ? 'bg-emerald-500' : 'bg-purple-500'}`}></div>

                                                <div className="flex items-center justify-between mb-3 sm:mb-4 relative z-10">
                                                    <div className={`px-2 py-1 sm:px-3 sm:py-1.5 rounded-lg text-[7px] sm:text-[8px] font-black uppercase tracking-widest ring-1 ring-inset ${getColorClasses(session.color)}`}>
                                                        {session.type}
                                                    </div>
                                                    <button className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-re-bg text-re-text-muted flex items-center justify-center hover:bg-re-orange hover:text-white transition-colors">
                                                        <GridIcon size={10} className="sm:w-3 sm:h-3" />
                                                    </button>
                                                </div>

                                                <div className="relative z-10 mb-5 sm:mb-6">
                                                    <h3 className="text-base sm:text-xl font-black text-re-text tracking-tight">{session.subject}</h3>
                                                    <p className="text-[10px] sm:text-[11px] font-bold text-re-text-muted uppercase tracking-widest mt-1">{session.group}</p>
                                                </div>

                                                <div className="space-y-2 sm:space-y-3 relative z-10 border-t border-black/5 pt-3 sm:pt-4">
                                                    <div className="flex items-center gap-2 sm:gap-3 text-[11px] sm:text-xs font-bold text-gray-600">
                                                        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-re-bg flex items-center justify-center text-gray-400">
                                                            <Clock size={12} className="sm:w-3.5 sm:h-3.5" />
                                                        </div>
                                                        {session.time}
                                                    </div>
                                                    <div className="flex items-center gap-2 sm:gap-3 text-[11px] sm:text-xs font-bold text-gray-600">
                                                        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-re-bg flex items-center justify-center text-gray-400">
                                                            <MapPin size={12} className="sm:w-3.5 sm:h-3.5" />
                                                        </div>
                                                        {session.room}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Mobile Actions Footer */}
                        <div className="xl:hidden px-6 py-5 bg-re-bg/20 border-t border-black/5 flex flex-row items-center gap-3">
                            <button className="flex-1 h-11 px-6 bg-white border border-black/5 text-re-text font-black text-[9px] uppercase tracking-widest rounded-xl hover:bg-re-bg transition-all flex items-center justify-center gap-2 shadow-sm">
                                <FileText size={12} className="text-re-orange opacity-70" /> Export PDF
                            </button>
                            <button className="flex-1 h-11 px-6 bg-re-grad-orange text-white font-black text-[9px] uppercase tracking-widest rounded-xl shadow-re-glow hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2">
                                <Plus size={12} /> Reschedule
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
