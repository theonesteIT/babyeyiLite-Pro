import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Save, Plus, Coffee, BookOpen, Trash2, ArrowLeft, Calendar, Settings } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const mockPeriods = [
    { id: 1, period_name: 'Period 1', start_time: '08:00', end_time: '08:50', is_break: false },
    { id: 2, period_name: 'Period 2', start_time: '08:50', end_time: '09:40', is_break: false },
    { id: 3, period_name: 'Break', start_time: '09:40', end_time: '10:00', is_break: true },
    { id: 4, period_name: 'Period 3', start_time: '10:00', end_time: '10:50', is_break: false },
    { id: 5, period_name: 'Period 4', start_time: '10:50', end_time: '11:40', is_break: false },
    { id: 6, period_name: 'Lunch', start_time: '11:40', end_time: '12:40', is_break: true },
    { id: 7, period_name: 'Period 5', start_time: '12:40', end_time: '13:30', is_break: false },
    { id: 8, period_name: 'Period 6', start_time: '13:30', end_time: '14:20', is_break: false },
];

const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export default function SchoolDays() {
    const navigate = useNavigate();
    
    // State to track which day is currently being edited
    const [selectedDay, setSelectedDay] = useState('Monday');
    
    // State to store periods separately for each day
    const [periodsByDay, setPeriodsByDay] = useState({
        Monday: [...mockPeriods],
        Tuesday: [...mockPeriods],
        Wednesday: [...mockPeriods],
        Thursday: [...mockPeriods],
        Friday: [...mockPeriods],
        Saturday: [],
        Sunday: []
    });

    // Helper to get the periods for the currently selected day
    const currentPeriods = periodsByDay[selectedDay] || [];

    return (
        <div className="flex flex-col h-full bg-white border border-slate-200 overflow-hidden font-sans">
            {/* Global Action Bar */}
            <div className="flex items-center justify-between px-5 border-b border-slate-200 bg-white sticky top-0 z-20 shrink-0 h-14">
                <div className="flex items-center h-full gap-8">
                    <div className="flex items-center gap-3">
                        <button 
                            onClick={() => navigate('/')}
                            className="bg-primary hover:bg-primary/90 text-white px-4 py-1.5 rounded-md text-sm font-semibold tracking-wide shadow-sm transition flex items-center gap-2"
                        >
                            <ArrowLeft size={16} /> Home
                        </button>
                    </div>

                    <div className="flex items-center gap-2">
                        <h1 className="text-base font-semibold text-slate-800">School Days Planning</h1>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <button className="bg-primary text-white px-4 py-1.5 rounded-md text-sm font-bold tracking-wide shadow-sm flex items-center gap-2 hover:opacity-90">
                        <Save size={14} /> Save Configuration
                    </button>
                </div>
            </div>

            <div className="flex flex-1 overflow-hidden">
                {/* ── Left Sidebar - App Pattern ── */}
                <aside className="w-64 border-r border-slate-100 p-4 bg-white overflow-y-auto custom-scrollbar shrink-0">
                    <div className="space-y-8">
                        {/* Section 1: Day Navigation */}
                        <div className="space-y-2">
                            <h2 className="text-[10px] font-black text-slate-800 uppercase tracking-widest flex items-center gap-2 mb-3">
                                <Calendar className="w-3 h-3 text-primary" /> DAY SELECTION
                            </h2>
                            <nav className="space-y-1">
                                {WEEKDAYS.map((day, i) => (
                                    <div 
                                        key={day} 
                                        onClick={() => setSelectedDay(day)}
                                        className={`flex items-center justify-between px-3 py-2 rounded cursor-pointer transition-all ${
                                            selectedDay === day 
                                                ? 'bg-primary/5 border border-primary/20 shadow-[inset_0_1px_2px_rgba(0,0,0,0.02)]' 
                                                : 'hover:bg-slate-50 border border-transparent'
                                        }`}
                                    >
                                        <label className="flex items-center gap-3 cursor-pointer group" onClick={e => e.stopPropagation()}>
                                            <input 
                                                type="checkbox" 
                                                defaultChecked={i < 5} 
                                                className="w-3.5 h-3.5 text-primary rounded border-slate-300 focus:ring-primary" 
                                            />
                                            <span className={`text-[11px] font-bold uppercase tracking-tight ${
                                                selectedDay === day ? 'text-primary' : 'text-slate-600 group-hover:text-slate-800'
                                            }`}>
                                                {day}
                                            </span>
                                        </label>
                                        <span className={`text-[9px] font-bold ${selectedDay === day ? 'text-primary' : 'text-slate-300'}`}>
                                            {periodsByDay[day].length}
                                        </span>
                                    </div>
                                ))}
                            </nav>
                        </div>

                        {/* Section 2: Global Constraints */}
                        <div className="space-y-3">
                            <h2 className="text-[10px] font-black text-slate-800 uppercase tracking-widest flex items-center gap-2 mb-3">
                                <Settings className="w-3 h-3 text-primary" /> GLOBAL LIMITS
                            </h2>
                            <div className="bg-slate-50/50 border border-slate-100 p-3 rounded-lg space-y-3">
                                <div>
                                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-1">Campus Opens</label>
                                    <input type="time" defaultValue="07:30" className="w-full bg-white border border-slate-200 rounded px-2 py-1.5 text-xs font-bold text-slate-700 focus:border-primary outline-none" />
                                </div>
                                <div>
                                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-1">Campus Closes</label>
                                    <input type="time" defaultValue="16:00" className="w-full bg-white border border-slate-200 rounded px-2 py-1.5 text-xs font-bold text-slate-700 focus:border-primary outline-none" />
                                </div>
                            </div>
                        </div>
                    </div>
                </aside>

                {/* ── Right Content: Main Grid Matrix ── */}
                <main className="flex-1 overflow-auto bg-gray-50/30 custom-scrollbar flex flex-col">
                    {/* Header Action Bar */}
                    <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10 shadow-sm">
                        <div>
                            <h3 className="text-base font-bold text-slate-800 uppercase tracking-tight">{selectedDay} Plan</h3>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">Customize sessions and breaks</p>
                        </div>
                        <button className="flex items-center gap-2 text-[10px] font-black text-primary bg-primary/10 hover:bg-primary/20 px-3 py-1.5 rounded shadow-sm uppercase tracking-widest transition-all">
                            <Plus size={14} /> Add Period
                        </button>
                    </div>

                    {/* Table Area */}
                    <div className="flex-1 relative">
                        <AnimatePresence mode="wait">
                            <motion.div 
                                key={selectedDay}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                transition={{ duration: 0.2 }}
                                className="bg-white border-y border-slate-200 overflow-hidden absolute inset-0"
                            >
                                {currentPeriods.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-full text-center bg-white p-8">
                                        <Calendar size={32} className="text-slate-300 mb-3" />
                                        <p className="text-sm font-bold text-slate-500">No periods scheduled for {selectedDay}</p>
                                        <p className="text-xs text-slate-400 mt-1">This day is currently configured as a complete off-day.</p>
                                        <button className="mt-4 flex items-center gap-2 text-[11px] font-bold text-primary bg-white border border-primary/20 hover:bg-primary/5 px-4 py-2 rounded-lg uppercase tracking-widest transition-all">
                                            <Plus size={14} /> Initialize Schedule
                                        </button>
                                    </div>
                                ) : (
                                    <div className="h-full overflow-auto custom-scrollbar">
                                        <table className="w-full text-left border-collapse table-fixed">
                                            <thead className="sticky top-0 z-10">
                                                <tr className="border-b border-slate-200 text-slate-800 text-[11px] font-bold bg-white">
                                                    <th className="px-4 py-2 w-12 text-center border-r border-slate-100 uppercase tracking-wider">#</th>
                                                    <th className="px-4 py-2 border-r border-slate-100 uppercase tracking-wider">Period Name</th>
                                                    <th className="px-4 py-2 w-40 border-r border-slate-100 uppercase tracking-wider">Start Time</th>
                                                    <th className="px-4 py-2 w-40 border-r border-slate-100 uppercase tracking-wider">End Time</th>
                                                    <th className="px-4 py-2 w-24 text-center uppercase tracking-wider">Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody className="text-[11px]">
                                                <AnimatePresence>
                                                    {currentPeriods.map((period, index) => (
                                                        <motion.tr 
                                                            key={period.id} 
                                                            initial={{ opacity: 0, x: -10 }}
                                                            animate={{ opacity: 1, x: 0 }}
                                                            transition={{ duration: 0.2, delay: index * 0.05 }}
                                                            className={`border-b border-slate-200 cursor-pointer transition-colors hover:bg-primary/5 ${index % 2 !== 0 ? 'bg-slate-200' : 'bg-white'} group`}
                                                        >
                                                            <td className="px-4 py-2 text-slate-400 font-bold text-center">{index + 1}</td>
                                                            <td className="px-4 py-2">
                                                                <div className="flex items-center gap-3">
                                                                    {period.is_break ? (
                                                                        <div className="w-6 h-6 rounded bg-amber-100 flex items-center justify-center border border-amber-200">
                                                                            <Coffee size={12} className="text-amber-600" />
                                                                        </div>
                                                                    ) : (
                                                                        <div className="w-6 h-6 rounded bg-primary/10 flex items-center justify-center border border-primary/20">
                                                                            <BookOpen size={12} className="text-primary" />
                                                                        </div>
                                                                    )}
                                                                    <input 
                                                                        type="text" 
                                                                        defaultValue={period.period_name} 
                                                                        className={`text-xs font-bold bg-transparent border-b border-transparent group-hover:border-slate-300 focus:border-primary outline-none transition-all w-full max-w-[200px] ${period.is_break ? 'text-amber-700' : 'text-slate-800'}`} 
                                                                    />
                                                                </div>
                                                            </td>
                                                            <td className="px-4 py-2">
                                                                <div className="bg-slate-50 border border-slate-200 rounded px-2 py-1 inline-block">
                                                                    <input type="time" defaultValue={period.start_time} className="text-xs font-medium text-slate-700 bg-transparent outline-none" />
                                                                </div>
                                                            </td>
                                                            <td className="px-4 py-2">
                                                                <div className="bg-slate-50 border border-slate-200 rounded px-2 py-1 inline-block">
                                                                    <input type="time" defaultValue={period.end_time} className="text-xs font-medium text-slate-700 bg-transparent outline-none" />
                                                                </div>
                                                            </td>
                                                            <td className="px-4 py-2 text-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                                <button className="p-1.5 text-slate-400 hover:text-red-500 rounded hover:bg-red-50 transition-colors border border-transparent hover:border-red-100">
                                                                    <Trash2 size={14} />
                                                                </button>
                                                            </td>
                                                        </motion.tr>
                                                    ))}
                                                </AnimatePresence>
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </motion.div>
                        </AnimatePresence>
                    </div>
                </main>
            </div>
        </div>
    );
}
