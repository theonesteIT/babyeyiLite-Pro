import React, { useState, useEffect } from 'react';
import {
    Calendar, Clock, MapPin, ChevronLeft, ChevronRight, ChevronDown,
    List, Grid as GridIcon, CheckCircle,
} from 'lucide-react';
import api from '../services/api';
import { PORTAL } from '../config/portal';

export default function Timetable() {
    const [view, setView] = useState('grid'); // 'grid' or 'list'
    const [selectedDay, setSelectedDay] = useState('Monday');
    const [mockSchedule, setMockSchedule] = useState([]);
    const [loading, setLoading] = useState(true);

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
            } finally {
                setLoading(false);
            }
        };
        fetchTimetable();
    }, []);

    const todaySchedule = mockSchedule.filter(s => s.day === selectedDay).sort((a, b) => a.time.localeCompare(b.time));

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
            <div className="relative w-full min-h-[280px] overflow-hidden bg-[#000435]">
                <div className="absolute inset-0 bg-orange-950/70 z-10 backdrop-blur-[2px]"></div>
                <img src={PORTAL.heroImage} alt="" className="absolute inset-0 w-full h-full object-cover scale-105 opacity-100" />
                <div className="absolute inset-0 bg-gradient-to-r from-transparent to-transparent z-[5]"></div>

                <div className="relative z-20 max-w-[1600px] mx-auto px-6 md:px-12 pt-16 pb-24">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="w-6 h-1 bg-re-orange rounded-full"></span>
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/80">School schedule</span>
                        </div>
                        <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight">
                            School <span className="text-re-orange">schedule</span>
                        </h1>
                        <p className="text-xs md:text-sm text-white/70 font-bold max-w-xl leading-relaxed">
                            Reference only: where teaching blocks run across the school. For duty, corridor checks, and knowing where a class should be — not your personal teaching timetable.
                        </p>
                    </div>
                </div>
            </div>

            {/* ── Main Content Area ── */}
            <div className="relative z-30 max-w-[1600px] mx-auto px-4 md:px-12 -mt-20">
                <div className="bg-white rounded-t-[2rem] shadow-2xl border border-black/5 overflow-hidden flex flex-col">

                    {/* Header/Controls inside the card */}
                    <div className="px-6 py-5 border-b border-black/5 flex flex-col xl:flex-row items-center justify-between gap-4 bg-white md:bg-re-bg/20">

                        <div className="flex flex-col sm:flex-row items-center gap-4 w-full xl:w-auto">
                            {/* View Controls */}
                            <div className="flex bg-white p-1 rounded-xl shadow-sm border border-black/5 w-full sm:w-auto overflow-x-auto custom-scrollbar">
                                <button
                                    onClick={() => setView('grid')}
                                    className={`flex-1 sm:flex-none flex items-center justify-center gap-2 h-8 sm:h-10 px-3 sm:px-6 rounded-lg text-[8px] sm:text-[10px] font-black uppercase tracking-widest transition-all ${view === 'grid' ? 'bg-re-bg text-re-orange border border-re-orange/10' : 'text-re-text-muted hover:text-re-text hover:bg-re-bg/50'}`}
                                >
                                    <Calendar size={12} className="sm:w-3.5 sm:h-3.5" /> Weekly Grid
                                </button>
                                <button
                                    onClick={() => setView('list')}
                                    className={`flex-1 sm:flex-none flex items-center justify-center gap-2 h-8 sm:h-10 px-3 sm:px-6 rounded-lg text-[8px] sm:text-[10px] font-black uppercase tracking-widest transition-all ${view === 'list' ? 'bg-re-bg text-re-orange border border-re-orange/10' : 'text-re-text-muted hover:text-re-text hover:bg-re-bg/50'}`}
                                >
                                    <List size={12} className="sm:w-3.5 sm:h-3.5" /> Daily Agenda
                                </button>
                            </div>

                            {/* Day Selector (Mobile/List only) */}
                            <div className={`w-full sm:w-auto flex items-center gap-1.5 sm:gap-2 ${view === 'grid' ? 'hidden sm:flex' : 'flex'}`}>
                                <button className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center bg-white border border-black/5 rounded-lg sm:rounded-xl text-re-text-muted hover:text-re-orange hover:bg-re-orange/5 transition-all focus:outline-none">
                                    <ChevronLeft size={14} className="sm:w-4 sm:h-4" />
                                </button>
                                <div className="flex-1 relative">
                                    <select
                                        value={selectedDay}
                                        onChange={(e) => setSelectedDay(e.target.value)}
                                        className="w-full h-8 sm:h-10 bg-white border border-black/5 rounded-lg sm:rounded-xl text-[8px] sm:text-xs font-black uppercase tracking-widest text-re-text text-center focus:outline-none focus:border-re-orange/30 appearance-none px-2"
                                    >
                                        {days.map(d => <option key={d} value={d}>{d}</option>)}
                                    </select>
                                    <ChevronDown size={10} className="absolute right-2 top-1/2 -translate-y-1/2 text-re-text-muted opacity-40 pointer-events-none sm:hidden" />
                                </div>
                                <button className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center bg-white border border-black/5 rounded-lg sm:rounded-xl text-re-text-muted hover:text-re-orange hover:bg-re-orange/5 transition-all focus:outline-none">
                                    <ChevronRight size={14} className="sm:w-4 sm:h-4" />
                                </button>
                            </div>
                        </div>

                        <div className="hidden xl:flex flex-1 min-w-0 max-w-xl items-center">
                            <p className="text-[9px] md:text-[10px] font-bold text-re-text-muted leading-snug">
                                {PORTAL.copy?.timetableExplainer}
                            </p>
                        </div>
                    </div>

                    <div className="px-4 md:px-6 py-3 border-b border-black/5 bg-re-bg/40 xl:hidden">
                        <p className="text-[9px] font-bold text-re-text-muted leading-relaxed">
                            {PORTAL.copy?.timetableExplainer}
                        </p>
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
                                                <td className="border-r border-b border-black/5 bg-re-bg p-1 sm:p-4 text-center text-[8px] sm:text-xs font-bold text-[#000435] w-12 sm:w-24 sticky left-0 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                                                    {time}
                                                </td>
                                                {days.map(day => {
                                                    const session = mockSchedule.find(s => s.day === day && s.time.startsWith(time));
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
                                    {selectedDay}&apos;s periods (school-wide)
                                </h3>
                                {todaySchedule.length === 0 ? (
                                    <div className="bg-white rounded-2xl sm:rounded-3xl p-6 sm:p-12 text-center border border-black/5 shadow-sm">
                                        <div className="w-12 h-12 sm:w-16 sm:h-16 bg-re-bg rounded-xl sm:rounded-2xl mx-auto flex items-center justify-center text-[#000435] mb-4">
                                            <Calendar size={20} className="sm:w-6 sm:h-6" />
                                        </div>
                                        <h3 className="text-[10px] sm:text-sm font-black text-re-text tracking-tight uppercase">No periods in this view</h3>
                                        <p className="text-[8px] sm:text-[10px] font-bold text-re-text-muted uppercase tracking-widest mt-2 block">
                                            Check academic timetable data in school manager, or try another day.
                                        </p>
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
                                                    <div className="flex items-center gap-2 sm:gap-3 text-[11px] sm:text-xs font-bold text-[#000435]">
                                                        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-re-bg flex items-center justify-center text-[#000435]">
                                                            <Clock size={12} className="sm:w-3.5 sm:h-3.5" />
                                                        </div>
                                                        {session.time}
                                                    </div>
                                                    <div className="flex items-center gap-2 sm:gap-3 text-[11px] sm:text-xs font-bold text-[#000435]">
                                                        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-re-bg flex items-center justify-center text-[#000435]">
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

                    </div>
                </div>
            </div>
        </div>
    );
}
