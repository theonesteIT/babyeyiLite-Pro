import React, { useState, useEffect } from 'react';
import {
    Calendar, Clock, MapPin, Search, ChevronLeft, ChevronRight, ChevronDown, ChevronUp,
    List, Grid as GridIcon, Filter, Plus, FileText, CheckCircle, RefreshCw
} from 'lucide-react';
import api from '../services/api';

export default function Timetable() {
    const [view, setView] = useState('grid'); // 'grid' or 'list'
    const [selectedDay, setSelectedDay] = useState('Monday');
    const [mockSchedule, setMockSchedule] = useState([]);
    const [filterOptions, setFilterOptions] = useState({ classes: [], terms: [], academicYears: [] });
    const [selectedClass, setSelectedClass] = useState('');
    const [selectedTerm, setSelectedTerm] = useState('');
    const [selectedAcademicYear, setSelectedAcademicYear] = useState('');
    const [loading, setLoading] = useState(true);
    const [showMobileFilters, setShowMobileFilters] = useState(false);

    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

    useEffect(() => {
        const fetchFilterOptions = async () => {
            try {
                const res = await api.get('/teacher-portal/timetable-filters');
                if (res.data?.success) {
                    setFilterOptions(res.data.data || { classes: [], terms: [], academicYears: [] });
                }
            } catch (e) {
                console.error('Failed to load timetable filters', e);
            }
        };
        fetchFilterOptions();
    }, []);

    useEffect(() => {
        const fetchTimetable = async () => {
            try {
                setLoading(true);
                const res = await api.get('/teacher-portal/timetable', {
                    params: {
                        class_name: selectedClass || undefined,
                        term: selectedTerm || undefined,
                        academic_year: selectedAcademicYear || undefined,
                    },
                });
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
    }, [selectedClass, selectedTerm, selectedAcademicYear]);

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
            <div className="hidden md:block relative w-full min-h-[280px] overflow-hidden">
                <div className="absolute inset-0 bg-orange-950/70 z-10 backdrop-blur-[2px]"></div>
                {/* Fallback pattern if teacher.jpg isn't perfectly suitable */}
                <img src="/teacher.jpg" alt="Hero" className="absolute inset-0 w-full h-full object-cover scale-105 opacity-100" />
                <div className="absolute inset-0 bg-gradient-to-r from-transparent to-transparent z-[5]"></div>

                <div className="relative z-20 max-w-[1600px] mx-auto px-6 md:px-12 pt-16 pb-24">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="w-6 h-1 bg-re-orange rounded-full"></span>
                            <span className="text-[10px] font-bold text-white/80">Scheduler Module</span>
                        </div>
                        <h1 className="text-3xl md:text-5xl font-bold text-white leading-none">
                            My <span className="text-re-orange">Timetable</span>
                        </h1>
                        <p className="text-[10px] md:text-sm text-white/70 font-medium max-w-xl leading-relaxed">
                            Navigate your weekly teaching schedule. Plan your classes, monitor practical labs, and sync administrative meetings automatically.
                        </p>
                    </div>
                </div>
            </div>

            {/* ── Main Content Area ── */}
            <div className="relative z-30 max-w-[1600px] mx-auto px-0 md:px-12 mt-0 md:-mt-20">
                <div className="bg-white md:rounded-t-[2rem] shadow-none md:shadow-2xl border-none md:border border-black/5 overflow-hidden flex flex-col min-h-screen md:min-h-0">

                    {/* Header/Controls inside the card */}
                    <div className="px-6 py-5 border-b border-black/5 flex flex-col xl:flex-row items-center justify-between gap-4 bg-white md:bg-re-bg/20">

                        <div className="flex flex-col sm:flex-row items-center gap-4 w-full xl:w-auto">
                            {/* View Switcher */}
                            <div className="hidden md:flex bg-re-bg/50 md:bg-white p-1 rounded-xl shadow-sm border border-black/5 w-full sm:w-auto overflow-x-auto custom-scrollbar">
                                <button
                                    onClick={() => setView('grid')}
                                    className={`flex-1 sm:flex-none flex items-center justify-center gap-2 h-10 px-3 sm:px-6 rounded-lg text-[11px] font-bold transition-all ${view === 'grid' ? 'bg-white md:bg-re-bg text-re-orange border border-re-orange/10 shadow-sm' : 'text-re-text-muted hover:text-re-text'}`}
                                >
                                    <Calendar size={14} /> Weekly Grid
                                </button>
                                <button
                                    onClick={() => setView('list')}
                                    className={`flex-1 sm:flex-none flex items-center justify-center gap-2 h-10 px-3 sm:px-6 rounded-lg text-[11px] font-bold transition-all ${view === 'list' ? 'bg-white md:bg-re-bg text-re-orange border border-re-orange/10 shadow-sm' : 'text-re-text-muted hover:text-re-text'}`}
                                >
                                    <List size={14} /> Daily Agenda
                                </button>
                            </div>

                            {/* Day Selector (Mobile/List only) */}
                            <div className={`w-full sm:w-auto flex items-center gap-1.5 sm:gap-2 ${view === 'grid' ? 'hidden sm:flex' : 'flex'}`}>
                                <button className="w-10 h-10 flex items-center justify-center bg-white border border-black/5 rounded-xl text-re-text-muted hover:text-re-orange hover:bg-re-orange/5 transition-all">
                                    <ChevronLeft size={16} />
                                </button>
                                <div className="flex-1 relative min-w-[120px]">
                                    <select
                                        value={selectedDay}
                                        onChange={(e) => setSelectedDay(e.target.value)}
                                        className="w-full h-10 bg-white border border-black/5 rounded-xl text-xs font-bold text-re-text text-center appearance-none px-4"
                                    >
                                        {days.map(d => <option key={d} value={d}>{d}</option>)}
                                    </select>
                                    <ChevronDown size={10} className="absolute right-3 top-1/2 -translate-y-1/2 text-re-text-muted opacity-40 pointer-events-none" />
                                </div>
                                <button className="w-10 h-10 flex items-center justify-center bg-white border border-black/5 rounded-xl text-re-text-muted hover:text-re-orange hover:bg-re-orange/5 transition-all">
                                    <ChevronRight size={16} />
                                </button>
                            </div>
                        </div>

                        {/* Actions moved to footer for mobile clarity */}
                        <div className="hidden xl:flex items-center gap-3 w-full xl:w-auto">
                            <button className="h-11 px-6 bg-white border border-black/5 text-re-text font-bold text-[11px] rounded-xl hover:bg-re-bg transition-all flex items-center justify-center gap-2 shadow-sm">
                                <FileText size={14} className="text-re-orange opacity-70" /> Export PDF
                            </button>
                            <button className="h-11 px-6 bg-re-grad-orange text-white font-bold text-[11px] rounded-xl shadow-re-glow hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2">
                                <Plus size={14} /> Reschedule
                            </button>
                        </div>
                    </div>
                    <div className="px-6 py-3 border-b border-black/5 bg-white flex flex-col md:flex-row gap-2">
                        <button
                            onClick={() => setShowMobileFilters(!showMobileFilters)}
                            className="md:hidden w-full flex justify-between items-center gap-2 text-[11px] font-bold transition-all"
                        >
                            <div className="flex items-center gap-2 text-re-text">
                                <Filter size={14} className="text-re-orange" /> Timetable filters
                            </div>
                            {showMobileFilters ? <ChevronUp size={14} className="text-re-orange" /> : <ChevronDown size={14} className="text-re-text-muted/40" />}
                        </button>

                        <div className={`${showMobileFilters ? 'flex' : 'hidden md:flex'} flex-col md:flex-row gap-2 w-full animate-in slide-in-from-top-2 duration-300`}>
                            <select
                                value={selectedClass}
                                onChange={(e) => setSelectedClass(e.target.value)}
                                className="h-10 px-3 rounded-xl border border-black/10 text-xs font-bold text-re-text"
                            >
                                <option value="">All classes</option>
                                {filterOptions.classes.map((cls) => (
                                    <option key={cls} value={cls}>{cls}</option>
                                ))}
                            </select>
                            <select
                                value={selectedTerm}
                                onChange={(e) => setSelectedTerm(e.target.value)}
                                className="h-10 px-3 rounded-xl border border-black/10 text-xs font-bold text-re-text"
                            >
                                <option value="">All terms</option>
                                {filterOptions.terms.map((term) => (
                                    <option key={term} value={term}>{term}</option>
                                ))}
                            </select>
                            <select
                                value={selectedAcademicYear}
                                onChange={(e) => setSelectedAcademicYear(e.target.value)}
                                className="h-10 px-3 rounded-xl border border-black/10 text-xs font-bold text-re-text"
                            >
                                <option value="">All academic years</option>
                                {filterOptions.academicYears.map((year) => (
                                    <option key={year} value={year}>{year}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Content inside the card */}
                    <div className="bg-white">
                        {loading && (
                            <div className="p-6 text-[10px] font-bold text-re-text-muted text-center">
                                Loading timetable...
                            </div>
                        )}
                        {view === 'grid' ? (
                            <div className="bg-white shadow-sm border border-black/5 overflow-x-auto custom-scrollbar">
                                <table className="w-full text-left border-collapse table-fixed">
                                    <thead>
                                        <tr>
                                            <th className="w-12 sm:w-24 border-r border-b border-black/5 bg-re-bg/50 p-1 sm:p-4"></th>
                                            {days.map(day => (
                                                <th key={day} className="border-b border-r border-black/5 bg-re-bg/50 p-1 sm:p-4 text-center text-[10px] font-bold text-re-text-muted">
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
                                                    const session = mockSchedule.find(s => s.day === day && s.time.startsWith(time));
                                                    return (
                                                        <td key={`${day}-${time}`} className="border-r border-b border-black/5 h-20 sm:h-32 align-top transition-all">
                                                            {session && (
                                                                <div className={`h-full p-1 sm:p-4 flex flex-col gap-0.5 sm:gap-2 ring-1 ring-inset ${getColorClasses(session.color)}`}>
                                                                    <div className="flex items-center justify-between">
                                                                        <span className="text-[10px] font-bold opacity-70 truncate">{session.type}</span>
                                                                        <div className="hidden sm:flex w-5 h-5 rounded-md bg-white/50 items-center justify-center">
                                                                            <CheckCircle size={10} className="opacity-60" />
                                                                        </div>
                                                                    </div>
                                                                    <div>
                                                                        <h4 className="text-[11px] sm:text-sm font-bold leading-tight truncate sm:whitespace-normal">{session.subject}</h4>
                                                                        <p className="text-[10px] font-medium opacity-80 mt-0.5 sm:mt-1 truncate">{session.group}</p>
                                                                    </div>
                                                                    <div className="mt-auto flex items-center gap-1 text-[10px] font-bold opacity-80 truncate">
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
                                <h3 className="text-[11px] font-bold text-re-text-muted px-2">
                                    {selectedDay}'s Classes
                                </h3>
                                {todaySchedule.length === 0 ? (
                                    <div className="bg-white md:rounded-3xl p-12 text-center flex flex-col items-center justify-center animate-in fade-in zoom-in-95 duration-700">
                                        <div className="relative mb-6">
                                            <div className="absolute inset-0 bg-re-orange/10 rounded-full blur-3xl scale-150"></div>
                                            <img 
                                                src="no_student_found.png" 
                                                alt="No sessions" 
                                                className="w-48 h-48 md:w-64 md:h-64 object-contain relative z-10" 
                                            />
                                        </div>
                                        <h3 className="text-base font-bold text-re-text">No Classes Scheduled</h3>
                                        <p className="text-[11px] font-medium text-re-text-muted mt-2 max-w-xs mx-auto leading-relaxed">Enjoy your free time! No teaching sessions found for this specific date.</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
                                        {todaySchedule.map(session => (
                                            <div key={session.id} className={`bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-black/5 shadow-lg relative overflow-hidden group hover:-translate-y-1 transition-all duration-300`}>
                                                <div className={`absolute top-0 right-0 w-16 h-16 sm:w-24 sm:h-24 blur-[30px] sm:blur-[40px] opacity-20 -mr-6 -mt-6 rounded-full ${session.color === 'blue' ? 'bg-blue-500' : session.color === 'emerald' ? 'bg-emerald-500' : 'bg-purple-500'}`}></div>

                                                <div className="flex items-center justify-between mb-3 sm:mb-4 relative z-10">
                                                    <div className={`px-2 py-1 sm:px-3 sm:py-1.5 rounded-lg text-[10px] font-bold ring-1 ring-inset ${getColorClasses(session.color)}`}>
                                                        {session.type}
                                                    </div>
                                                    <button className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-re-bg text-re-text-muted flex items-center justify-center hover:bg-re-orange hover:text-white transition-colors">
                                                        <GridIcon size={10} className="sm:w-3 sm:h-3" />
                                                    </button>
                                                </div>

                                                <div className="relative z-10 mb-5 sm:mb-6">
                                                    <h3 className="text-base sm:text-xl font-bold text-re-text">{session.subject}</h3>
                                                    <p className="text-[11px] font-bold text-re-text-muted mt-1">{session.group}</p>
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
                        <div className="xl:hidden px-6 py-5 bg-re-bg/20 border-t border-black/5">
                            <button className="w-full h-11 px-6 bg-white border border-black/5 text-re-text font-bold text-[11px] rounded-xl hover:bg-re-bg transition-all flex items-center justify-center gap-2 shadow-sm">
                                <FileText size={12} className="text-re-orange opacity-70" /> Export PDF
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
