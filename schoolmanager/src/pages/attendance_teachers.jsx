import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Calendar, Save, Search, X, FileText, Users, Download, Filter, 
    Check, Minus, ChevronDown, Coffee
} from 'lucide-react';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

const PERIODS = [
    { id: 1, name: 'Period 1', time: '08:00', is_break: false },
    { id: 2, name: 'Period 2', time: '08:50', is_break: false },
    { id: 3, name: 'Break',    time: '09:40', is_break: true  },
    { id: 4, name: 'Period 3', time: '10:00', is_break: false },
    { id: 5, name: 'Period 4', time: '10:50', is_break: false },
    { id: 6, name: 'Lunch',    time: '11:40', is_break: true  },
    { id: 7, name: 'Period 5', time: '12:40', is_break: false },
    { id: 8, name: 'Period 6', time: '13:30', is_break: false },
];

// attendance[teacherId][day][periodId] = 'present' | 'absent' | 'na'
function buildDefaultAttendance(teachers) {
    const att = {};
    teachers.forEach(t => {
        att[t.id] = {};
        DAYS.forEach(day => {
            att[t.id][day] = {};
            PERIODS.filter(p => !p.is_break).forEach(p => {
                att[t.id][day][p.id] = 'present';
            });
        });
    });
    return att;
}

const departments = ['All', 'Math', 'English', 'Science', 'History', 'PE', 'Art'];

const mockTeachers = [
    { id: 1, name: 'Jean Baptiste Murenzi', dept: 'Math' },
    { id: 2, name: 'Sandrine Umubyeyi',     dept: 'English' },
    { id: 3, name: 'Patrick Nshimiyimana',  dept: 'Science' },
    { id: 4, name: 'Alice Mukandekezi',     dept: 'History' },
    { id: 5, name: 'Robert Habimana',       dept: 'PE' },
    { id: 6, name: 'Claire Nyirahabimana',  dept: 'Art' },
];

export default function TeacherAttendance() {
    const [selectedDept, setSelectedDept] = useState('All');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [searchQuery, setSearchQuery] = useState('');
    const [attendance, setAttendance] = useState(() => buildDefaultAttendance(mockTeachers));

    // Derive week start from selected date (Monday)
    const getWeekDates = (d) => {
        const dt = new Date(d);
        const day = dt.getDay();
        const monday = new Date(dt);
        monday.setDate(dt.getDate() - ((day + 6) % 7));
        return DAYS.map((name, i) => {
            const dd = new Date(monday);
            dd.setDate(monday.getDate() + i);
            return { name, label: dd.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) };
        });
    };
    const weekDays = getWeekDates(date);

    const toggle = (teacherId, day, periodId) => {
        setAttendance(prev => {
            const cur = prev[teacherId][day][periodId];
            const next = cur === 'present' ? 'absent' : cur === 'absent' ? 'na' : 'present';
            return {
                ...prev,
                [teacherId]: {
                    ...prev[teacherId],
                    [day]: { ...prev[teacherId][day], [periodId]: next }
                }
            };
        });
    };

    const filtered = mockTeachers.filter(t => {
        const deptMatch = selectedDept === 'All' || t.dept === selectedDept;
        const searchMatch = t.name.toLowerCase().includes(searchQuery.toLowerCase());
        return deptMatch && searchMatch;
    });

    const CellIcon = ({ status }) => {
        if (status === 'present') return <Check size={13} className="text-emerald-500 stroke-[3] mx-auto" />;
        if (status === 'absent')  return <X     size={13} className="text-rose-500 stroke-[3] mx-auto" />;
        return <Minus size={12} className="text-slate-300 mx-auto" />;
    };

    const cellBg = (status) => {
        if (status === 'present') return 'bg-emerald-50 hover:bg-emerald-100';
        if (status === 'absent')  return 'bg-rose-50 hover:bg-rose-100';
        return 'bg-white hover:bg-slate-50';
    };

    return (
        <div className="flex flex-col h-full bg-white border border-slate-200 overflow-hidden font-sans">
            {/* Action Bar */}
            <div className="flex items-center justify-between px-5 border-b border-slate-200 bg-white shrink-0 h-14">
                <div className="flex items-center gap-6">
                    <button className="bg-primary hover:bg-primary/90 text-white px-4 py-1.5 rounded-md text-sm font-semibold tracking-wide shadow-sm transition flex items-center gap-2">
                        <Save size={14} /> Submit Register
                    </button>
                    <h1 className="text-base font-semibold text-slate-800">Teacher Attendance</h1>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex items-center border border-slate-300 rounded-md overflow-hidden focus-within:border-primary/60 bg-white">
                        <div className="flex items-center px-3 py-1.5">
                            <Search className="w-4 h-4 text-slate-400 mr-2" />
                            <input
                                type="text"
                                placeholder="Search teacher..."
                                className="w-44 text-sm bg-transparent focus:outline-none placeholder:text-slate-400 font-medium"
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="flex items-center border border-slate-300 rounded-md bg-white px-3 py-1.5 focus-within:border-primary/60">
                        <Calendar size={14} className="text-slate-400 mr-2" />
                        <input type="date" value={date} onChange={e => setDate(e.target.value)} className="text-sm font-bold text-slate-700 outline-none bg-transparent" />
                    </div>
                </div>
            </div>

            <div className="flex flex-1 overflow-hidden">
                {/* Sidebar */}
                <aside className="w-56 border-r border-slate-100 p-4 bg-white overflow-y-auto custom-scrollbar shrink-0">
                    <h2 className="text-[10px] font-black text-slate-800 uppercase tracking-widest flex items-center gap-2 mb-3">
                        <Users className="w-3 h-3 text-primary" /> DEPARTMENT
                    </h2>
                    <nav className="space-y-0.5">
                        {departments.map(dept => (
                            <div
                                key={dept}
                                onClick={() => setSelectedDept(dept)}
                                className={`flex items-center justify-between px-2 py-1.5 rounded cursor-pointer text-[11px] transition-all font-bold uppercase tracking-tight border ${dept === selectedDept ? 'bg-primary/5 text-primary border-primary/20' : 'text-slate-600 hover:bg-slate-50 border-transparent'}`}
                            >
                                <span>{dept}</span>
                                <span className={`text-[10px] ${dept === selectedDept ? 'text-primary' : 'text-slate-400'}`}>
                                    {dept === 'All' ? mockTeachers.length : mockTeachers.filter(t => t.dept === dept).length}
                                </span>
                            </div>
                        ))}
                    </nav>

                    <div className="mt-8">
                        <h2 className="text-[10px] font-black text-slate-800 uppercase tracking-widest flex items-center gap-2 mb-3">
                            <Filter className="w-3 h-3 text-primary" /> REPORTS
                        </h2>
                        <nav className="space-y-0.5">
                            <div className="flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer text-[11px] font-bold text-slate-500 hover:bg-slate-50 hover:text-primary transition-all group border border-transparent uppercase tracking-tight">
                                <Download size={13} className="text-slate-300 group-hover:text-primary" /> Export PDF
                            </div>
                            <div className="flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer text-[11px] font-bold text-slate-500 hover:bg-slate-50 hover:text-primary transition-all group border border-transparent uppercase tracking-tight">
                                <FileText size={13} className="text-slate-300 group-hover:text-primary" /> Attendance Log
                            </div>
                        </nav>
                    </div>
                </aside>

                {/* Main Grid — matches timetable.jsx exactly */}
                <main className="flex-1 overflow-auto bg-gray-50/30 custom-scrollbar">
                    <table className="w-full border-collapse table-fixed min-w-[1000px]">
                        <thead>
                            <tr className="bg-white sticky top-0 z-10 border-b border-slate-200 shadow-sm">
                                <th className="w-52 p-4 border-r border-slate-200 text-[11px] font-bold text-slate-800 uppercase tracking-wider text-left bg-white">
                                    Teacher
                                </th>
                                {weekDays.map(d => (
                                    <th key={d.name} className="p-4 border-r border-slate-200 text-[11px] font-bold text-slate-800 uppercase tracking-wider text-center bg-white">
                                        <div className="flex flex-col items-center gap-0.5">
                                            <span>{d.name}</span>
                                            <span className="text-[9px] font-medium text-slate-400 normal-case tracking-normal">{d.label}</span>
                                        </div>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            <AnimatePresence>
                                {filtered.map((teacher, index) => (
                                    <motion.tr
                                        key={teacher.id}
                                        initial={{ opacity: 0, y: 6 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0 }}
                                        transition={{ duration: 0.18, delay: index * 0.04 }}
                                        className={`border-b border-slate-200 transition-colors hover:bg-primary/5 ${index % 2 !== 0 ? 'bg-slate-200' : 'bg-white'}`}
                                    >
                                        {/* Teacher identity cell */}
                                        <td className="px-4 py-3 border-r border-slate-200 bg-white sticky left-0 z-10 shadow-[2px_0_5px_rgba(0,0,0,0.02)]">
                                            <div className="flex items-center gap-3">
                                                <div className="w-7 h-7 rounded bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary border border-primary/20 uppercase shrink-0">
                                                    {teacher.name.charAt(0)}
                                                </div>
                                                <div>
                                                    <p className="text-[11px] font-bold text-slate-700 leading-none">{teacher.name}</p>
                                                    <p className="text-[9px] font-medium text-slate-400 mt-1 uppercase tracking-tighter">{teacher.dept}</p>
                                                </div>
                                            </div>
                                        </td>

                                        {/* Day columns */}
                                        {weekDays.map(d => (
                                            <td key={d.name} className="p-1.5 border-r border-slate-200 align-top">
                                                <div className="space-y-1.5">
                                                    {PERIODS.map(period => {
                                                        if (period.is_break) {
                                                            return (
                                                                <div key={period.id} className="py-1 px-2 bg-slate-50 border border-slate-100 rounded flex items-center justify-between opacity-50">
                                                                    <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">{period.name}</span>
                                                                    <Coffee size={9} className="text-slate-300" />
                                                                </div>
                                                            );
                                                        }

                                                        const status = attendance[teacher.id]?.[d.name]?.[period.id] || 'na';
                                                        return (
                                                            <div
                                                                key={period.id}
                                                                onClick={() => toggle(teacher.id, d.name, period.id)}
                                                                className={`relative p-2 border rounded cursor-pointer transition-all shadow-sm ${
                                                                    status === 'present' ? 'bg-emerald-50 border-emerald-100' :
                                                                    status === 'absent'  ? 'bg-rose-50 border-rose-100' :
                                                                    'bg-white border-slate-100 hover:border-primary/30'
                                                                }`}
                                                            >
                                                                <div className="flex items-center justify-between mb-1 opacity-60">
                                                                    <span className="text-[8px] font-bold uppercase tracking-wider text-slate-500">{period.name}</span>
                                                                    <span className="text-[8px] font-medium text-slate-400">{period.time}</span>
                                                                </div>
                                                                <div className="flex items-center justify-center h-5">
                                                                    <CellIcon status={status} />
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </td>
                                        ))}
                                    </motion.tr>
                                ))}
                            </AnimatePresence>
                        </tbody>
                    </table>
                </main>
            </div>
        </div>
    );
}
