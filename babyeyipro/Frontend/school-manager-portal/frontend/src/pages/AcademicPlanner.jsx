import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { exportTimetablePDF } from '../utils/exportTimetablePDF';
import {
    Calendar, Clock, MapPin, Search, ChevronLeft, ChevronRight, ChevronDown,
    List, Grid as GridIcon, Filter, Plus, FileText, CheckCircle, RefreshCw, X, Save,
    User, BookOpen, Hash, AlertTriangle, Loader2, Layout, Edit3
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import heroImg from '../assets/hero.png';

export default function AcademicPlanner() {
    const { manager } = useAuth();
    const [view, setView] = useState('grid');
    const [loading, setLoading] = useState(true);
    const [isWizardOpen, setIsWizardOpen] = useState(false);
    const [saving, setSaving] = useState(false);

    // Data States
    const [classes, setClasses] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [staff, setStaff] = useState([]);
    const [periods, setPeriods] = useState([]);
    const [timetable, setTimetable] = useState([]);
    const [subjectConfigs, setSubjectConfigs] = useState([]);

    // Selection States
    const [selectedClass, setSelectedClass] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [wizardContext, setWizardContext] = useState({ day: '', period_id: '', start_time: '', end_time: '' });

    // Form State
    const [assignment, setAssignment] = useState({
        subject_name: '',
        staff_id: '',
        room: '',
    });

    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

    useEffect(() => {
        fetchData();
    }, [manager]);

    const fetchData = async () => {
        if (!manager?.school_id) return;
        setLoading(true);
        try {
            const [classRes, subjRes, perRes, ttRes] = await Promise.all([
                api.get('/dos/registry/classes'),
                api.get('/dos/subjects'),
                api.get('/dos/calendar/periods'),
                api.get('/dos/timetable/master')
            ]);

            if (classRes.data.success) {
                setClasses(classRes.data.data);
            }
            if (subjRes.data.success) setSubjects(subjRes.data.data);
            if (perRes.data.success) setPeriods(perRes.data.data);
            if (ttRes.data.success) {
                // Ensure array uniqueness to avoid duplicate keys caused by possible backend joins
                const uniqueTimetable = Array.from(new Map(ttRes.data.data.map(t => [t.id, t])).values());
                setTimetable(uniqueTimetable);
            }
        } catch (err) {
            console.error("Planner fetch failed:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleOpenWizard = (teacherData, day, period, prefilledClass = '', existingLesson = null) => {
        setWizardContext({ day, period_id: period.id, start_time: period.start_time, end_time: period.end_time, prefilledClass, lesson_id: existingLesson?.id || null });
        setAssignment({ 
            subject_name: existingLesson?.subject || '',
            staff_id: existingLesson?.teacherId || teacherData?.id || '',
            room: existingLesson?.group || prefilledClass || ''
        });
        setIsWizardOpen(true);
    };

    const getSubjectColorTheme = (subjectName) => {
        if (!subjectName) return 'bg-white border-black/5 text-[#1E3A5F]';
        
        const themes = [
            'bg-blue-50 border-blue-200 text-blue-900',
            'bg-emerald-50 border-emerald-200 text-emerald-900',
            'bg-purple-50 border-purple-200 text-purple-900',
            'bg-amber-50 border-amber-200 text-amber-900',
            'bg-rose-50 border-rose-200 text-rose-900',
            'bg-indigo-50 border-indigo-200 text-indigo-900',
            'bg-teal-50 border-teal-200 text-teal-900',
            'bg-fuchsia-50 border-fuchsia-200 text-fuchsia-900'
        ];
        
        let hash = 0;
        for (let i = 0; i < subjectName.length; i++) {
            hash = subjectName.charCodeAt(i) + ((hash << 5) - hash);
        }
        return themes[Math.abs(hash) % themes.length];
    };

    const handleSaveAssignment = async () => {
        setSaving(true);
        try {
            const payload = {
                class_name: selectedClass,
                subject_name: assignment.subject_name,
                staff_id: assignment.staff_id,
                day_of_week: wizardContext.day,
                start_time: wizardContext.start_time,
                end_time: wizardContext.end_time,
                room: assignment.room
            };
            const res = await api.post('/dos/timetable', payload);
            if (res.data.success) {
                setIsWizardOpen(false);
                setAssignment({ subject_name: '', staff_id: '', room: '' });
                fetchData();
            }
        } catch (err) {
            alert(err.response?.data?.message || "Overlap or collision detected in timetable matrix.");
        } finally {
            setSaving(false);
        }
    };

    // Filter timetable for currently selected class
    const classRows = timetable.find(t => t.group === selectedClass)?.lessons || [];
    
    // Aggregation for display
    const getSlotContent = (day, periodName) => {
        // Since timetable/master returns formatted data, we might need to match carefully
        // or refetch specifically for the class. For now, let's use the master data.
        const matches = [];
        timetable.forEach(teacher => {
            teacher.lessons.forEach(l => {
                if (l.group === selectedClass && l.day === day && l.time.includes(periods.find(p => p.period_name === periodName)?.start_time?.substring(0,5))) {
                    matches.push({ ...l, teacherName: teacher.teacher });
                }
            });
        });
        return matches;
    };

    return (
        <div className="animate-in fade-in duration-700 bg-re-bg min-h-screen pb-12 font-sans lowercase">

            {/* ── High-Fidelity Hero Section ── */}
            <div className="relative w-full min-h-[220px] overflow-hidden" style={{ backgroundImage: `url(${heroImg})`, backgroundSize: 'cover', backgroundPosition: 'center' }}>
                <div className="absolute inset-0 bg-[#0a192f]/85 z-10 backdrop-blur-[2px]"></div>
                <div className="relative z-20 max-w-[1600px] mx-auto px-6 md:px-12 pt-12 pb-16 flex items-center gap-6">
                    <div className="hidden md:flex shrink-0 w-20 h-20 rounded-3xl border border-white/10 bg-white/5 items-center justify-center backdrop-blur-xl shadow-2xl relative overflow-hidden group">
                        <div className="absolute inset-0 bg-gradient-to-br from-[#FEBF10]/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
                        <Layout size={40} style={{ color: "#FEBF10" }} className="group-hover:scale-110 transition-transform duration-500" />
                    </div>

                    <div className="space-y-1">
                        <div className="flex items-center gap-2 mb-1.5">
                            <span className="w-5 h-1 rounded-full animate-pulse" style={{ background: "#FEBF10" }}></span>
                            <p className="text-[9px] font-black uppercase tracking-[0.2em]" style={{ color: "#FEBF10" }}>Academic Master Planner</p>
                        </div>
                        <h1 className="text-xl sm:text-3xl md:text-4xl font-black text-white tracking-tighter leading-none mb-1.5 uppercase">Timetable <span style={{ color: "#FEBF10" }}>Wizard</span></h1>
                        <p className="text-[10px] md:text-xs font-medium text-white/60 max-w-lg leading-relaxed uppercase tracking-widest italic">Coordinate faculty loads, room assignments, and period distribution for the entire school</p>
                    </div>
                </div>
            </div>

            {/* ── Main Content Area ── */}
            <div className="relative z-30 max-w-[1600px] mx-auto px-4 md:px-12 -mt-16 pb-16">
                <div className="bg-white rounded-t-3xl shadow-2xl border border-black/5 overflow-hidden flex flex-col min-h-[600px]">

                    {/* Toolbar */}
                    <div className="px-6 py-5 border-b border-black/5 flex flex-col xl:flex-row items-center justify-between gap-4 bg-re-bg/20">
                        <div className="flex flex-col sm:flex-row items-center gap-4 w-full xl:w-auto">
                            <div className="h-9 w-full sm:w-[320px] bg-re-bg border border-transparent focus-within:border-[#1E3A5F]/20 focus-within:bg-white rounded-lg px-3 flex items-center gap-2 shadow-inner transition-all pr-1 relative">
                                <Filter size={14} className="text-[#FEBF10]" />
                                <span className="text-[8px] font-black uppercase text-[#1E3A5F] tracking-[0.2em] opacity-80 border-r border-[#1E3A5F]/10 pr-2 whitespace-nowrap">View By Class</span>
                                <select 
                                    className="bg-transparent text-[10px] font-black uppercase tracking-widest text-[#1E3A5F] outline-none cursor-pointer border-none pl-2 appearance-none pr-8 w-full h-full"
                                    value={selectedClass}
                                    onChange={e => setSelectedClass(e.target.value)}
                                    style={{ backgroundImage: `url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%236b7280%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E')`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.5rem center', backgroundSize: '10px' }}
                                >
                                    <option value="">Faculty Overview (All Staff)</option>
                                    {classes.map(c => {
                                        const label = `${c.group_name} ${c.stream_name || ''} ${c.combination ? `[${c.combination}]` : ''}`.trim();
                                        return <option key={c.id} value={label}>{label}</option>;
                                    })}
                                </select>
                            </div>

                            {!selectedClass && (
                                <div className="h-9 w-full sm:w-64 bg-re-bg border border-transparent focus-within:border-[#1E3A5F]/20 focus-within:bg-white rounded-lg px-3 flex items-center gap-2 shadow-inner transition-all">
                                    <Search size={14} className="text-[#1E3A5F]/40" />
                                    <input 
                                        type="text"
                                        placeholder="Search Faculty..."
                                        className="bg-transparent text-[10px] font-black uppercase tracking-widest text-[#1E3A5F] outline-none w-full placeholder:text-[#1E3A5F]/40"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                    />
                                </div>
                            )}
                        </div>

                        <div className="flex items-center gap-3 w-full xl:w-auto">
                             <button 
                                onClick={() => exportTimetablePDF(timetable, days, periods, selectedClass)}
                                className="h-10 px-6 bg-white border border-black/5 text-[#1E3A5F] rounded-xl font-black text-[9px] uppercase tracking-widest flex items-center gap-2 shadow-sm transition-all hover:border-[#FEBF10] hover:text-[#FEBF10]"
                            >
                                <FileText size={14} /> Export PDF
                            </button>
                        </div>
                    </div>

                    {/* Grid Matrix */}
                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse table-fixed min-w-[900px]">
                            <thead className="bg-[#1E3A5F]">
                                <tr>
                                    <th className="w-40 p-3 border-b border-r border-white/10 text-[9px] font-black uppercase tracking-widest text-[#FEBF10] text-left">Faculty Member</th>
                                    {days.map(day => (
                                        <th key={day} className="p-3 border-b border-r border-white/10 text-[10px] font-black uppercase tracking-widest text-white text-left">{day}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {(() => {
                                    if (!selectedClass) {
                                        const filteredTimetable = searchQuery 
                                            ? timetable.filter(t => t.teacher.toLowerCase().includes(searchQuery.toLowerCase()))
                                            : timetable;

                                        return filteredTimetable.map(teacherData => {
                                            const teacherLessons = teacherData.lessons || [];
                                            return (
                                                <tr key={`faculty-${teacherData.id}`}>
                                                    <td className="p-4 border-r border-b border-black/5 bg-re-bg/5 text-left align-top">
                                                        <p className="text-[11px] font-black text-[#1E3A5F] uppercase leading-tight">{teacherData.teacher}</p>
                                                        <p className="text-[8px] font-bold text-re-text-muted uppercase mt-1">Load: {teacherData.load}</p>
                                                    </td>
                                                    {days.map(day => (
                                                        <td key={`${day}-${teacherData.id}`} className="p-1 border-r border-b border-black/5 align-top">
                                                            <div className="space-y-0.5">
                                                                {periods.map(period => {
                                                                    if (period.is_break) {
                                                                        return (
                                                                            <div key={`period-${period.id}`} className="relative py-0.5 px-1.5 border border-amber-500/10 rounded-md bg-amber-50/30 text-center flex items-center justify-between opacity-80 shadow-sm">
                                                                                <span className="text-[6.5px] font-black uppercase tracking-[0.2em] text-amber-700">{period.period_name}</span>
                                                                                <span className="text-[6px] font-bold text-amber-600/50">{period.start_time.substring(0,5)}</span>
                                                                            </div>
                                                                        );
                                                                    }

                                                                    const lesson = teacherLessons.find(l => l.day === day && l.time.includes(period.start_time.substring(0,5)));
                                                                    const themeClasses = lesson ? getSubjectColorTheme(lesson.subject) : 'bg-white border-black/5 text-[#1E3A5F]';
                                                                    
                                                                    return (
                                                                        <div key={`period-${period.id}`} className={`relative p-1.5 border rounded-md group hover:border-[#FEBF10]/60 transition-all text-left shadow-sm ${themeClasses}`}>
                                                                            <div className="flex items-center justify-between mb-0.5 border-b border-black/5 pb-0.5">
                                                                                <span className="text-[6.5px] font-black opacity-60 uppercase tracking-wider">{period.period_name}</span>
                                                                                <span className="text-[6px] font-bold opacity-50">{period.start_time.substring(0,5)}</span>
                                                                            </div>
                                                                            {lesson ? (
                                                                                <div className="relative">
                                                                                    <p className="text-[8px] font-black uppercase truncate leading-tight w-[90%]">{lesson.subject}</p>
                                                                                    <p className="text-[7px] font-bold opacity-70 uppercase truncate">{lesson.group}</p>
                                                                                    <div className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                                        <Edit3 size={8} className="opacity-40 hover:opacity-100 cursor-pointer" onClick={() => handleOpenWizard(teacherData, day, period, '', lesson)} />
                                                                                    </div>
                                                                                </div>
                                                                            ) : (
                                                                                <div 
                                                                                    className="h-4 mt-0.5 bg-black/[0.03] rounded flex items-center justify-center opacity-30 group-hover:opacity-100 transition-all cursor-pointer hover:bg-[#FEBF10]/10 border border-transparent hover:border-[#FEBF10]/30"
                                                                                    onClick={() => handleOpenWizard(teacherData, day, period)}
                                                                                >
                                                                                    <Plus size={10} className="text-[#1E3A5F] opacity-50 group-hover:opacity-100" />
                                                                                    <span className="text-[5px] font-black text-[#1E3A5F] uppercase ml-1 opacity-0 group-hover:opacity-70 transition-opacity">Assign</span>
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        </td>
                                                    ))}
                                                </tr>
                                            );
                                        });
                                    }

                                    // View By Class Override
                                    let classLessons = [];
                                    timetable.forEach(teacher => {
                                        const matchingLessons = (teacher.lessons || []).filter(l => selectedClass.includes(l.group));
                                        matchingLessons.forEach(l => {
                                            classLessons.push({ ...l, teacherName: teacher.teacher, teacherId: teacher.id });
                                        });
                                    });

                                    return (
                                        <tr key={`class-${selectedClass}`}>
                                            <td className="p-4 border-r border-b border-black/5 bg-re-bg/5 text-left align-top">
                                                <p className="text-[11px] font-black text-[#1E3A5F] uppercase leading-tight">{selectedClass}</p>
                                                <p className="text-[8px] font-bold text-re-text-muted uppercase mt-1">Class Timetable</p>
                                                <p className="text-[8px] font-bold text-[#FEBF10] uppercase mt-1 px-2 py-0.5 bg-[#1E3A5F] inline-block rounded">{classLessons.length} ASSIGNMENTS</p>
                                            </td>
                                            {days.map(day => (
                                                <td key={`${day}-${selectedClass}`} className="p-1 border-r border-b border-black/5 align-top">
                                                    <div className="space-y-0.5">
                                                        {periods.map(period => {
                                                            if (period.is_break) {
                                                                return (
                                                                    <div key={`period-${period.id}`} className="relative py-0.5 px-1.5 border border-amber-500/10 rounded-md bg-amber-50/30 text-center flex items-center justify-between opacity-80 shadow-sm">
                                                                        <span className="text-[6.5px] font-black uppercase tracking-[0.2em] text-amber-700">{period.period_name}</span>
                                                                        <span className="text-[6px] font-bold text-amber-600/50">{period.start_time.substring(0,5)}</span>
                                                                    </div>
                                                                );
                                                            }

                                                            const lesson = classLessons.find(l => l.day === day && l.time.includes(period.start_time.substring(0,5)));
                                                            const themeClasses = lesson ? getSubjectColorTheme(lesson.subject) : 'bg-white border-black/5 text-[#1E3A5F]';
                                                            
                                                            return (
                                                                <div key={`period-${period.id}`} className={`relative p-1.5 border rounded-md group hover:border-[#FEBF10]/60 transition-all text-left shadow-sm ${themeClasses}`}>
                                                                    <div className="flex items-center justify-between mb-0.5 border-b border-black/5 pb-0.5">
                                                                        <span className="text-[6.5px] font-black opacity-60 uppercase tracking-wider">{period.period_name}</span>
                                                                        <span className="text-[6px] font-bold opacity-50">{period.start_time.substring(0,5)}</span>
                                                                    </div>
                                                                    {lesson ? (
                                                                        <div className="relative">
                                                                            <p className="text-[8px] font-black uppercase truncate leading-tight w-[90%]">{lesson.subject}</p>
                                                                            <p className="text-[7px] font-bold opacity-70 uppercase truncate">{lesson.teacherName}</p>
                                                                            <div className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                                <Edit3 size={8} className="opacity-40 hover:opacity-100 cursor-pointer" onClick={() => handleOpenWizard(null, day, period, selectedClass, lesson)} />
                                                                            </div>
                                                                        </div>
                                                                    ) : (
                                                                            <div 
                                                                                className="h-4 mt-0.5 bg-black/[0.03] rounded flex items-center justify-center opacity-30 group-hover:opacity-100 transition-all cursor-pointer hover:bg-[#FEBF10]/10 border border-transparent hover:border-[#FEBF10]/30"
                                                                                onClick={() => handleOpenWizard(null, day, period, selectedClass)}
                                                                            >
                                                                            <Plus size={10} className="text-[#1E3A5F] opacity-50 group-hover:opacity-100" />
                                                                            <span className="text-[5px] font-black text-[#1E3A5F] uppercase ml-1 opacity-0 group-hover:opacity-70 transition-opacity">Assign</span>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </td>
                                            ))}
                                        </tr>
                                    );
                                })()}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Timetable Wizard Modal */}
            {isWizardOpen && createPortal(
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-6 backdrop-blur-md bg-[#0a192f]/40 animate-in fade-in duration-300">
                    <div className="bg-white w-full max-w-lg rounded-3xl shadow-[0_32px_128px_-15px_rgba(30,58,95,0.4)] overflow-hidden border border-white/20 animate-in zoom-in-95 duration-300">
                        <div className="px-6 py-5 bg-[#1E3A5F] text-white flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center border border-white/20 text-[#FEBF10]">
                                    <Settings size={16} />
                                </div>
                                <h3 className="font-black text-[10px] uppercase tracking-widest">Assign Faculty Asset</h3>
                            </div>
                            <button onClick={() => setIsWizardOpen(false)} className="text-white/40 hover:text-[#FEBF10] transition-colors">
                                <X size={20} />
                            </button>
                        </div>
                        
                        <div className="p-8 space-y-6">
                            <div className="p-4 bg-re-bg/30 rounded-2xl flex items-center justify-between">
                                <div>
                                    <p className="text-[8px] font-black uppercase text-[#1E3A5F]/40 tracking-widest leading-none">Context</p>
                                    <h4 className="text-xs font-black text-[#1E3A5F] uppercase mt-1">{selectedClass} · {wizardContext.day}</h4>
                                </div>
                                <div className="text-right">
                                    <p className="text-[8px] font-black uppercase text-re-gold tracking-widest leading-none">Slot</p>
                                    <h4 className="text-xs font-black text-[#1E3A5F] uppercase mt-1">{wizardContext.start_time.substring(0,5)}</h4>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[9px] font-black text-[#1E3A5F] uppercase tracking-[0.2em] mb-1.5 opacity-80">Subject Unit</label>
                                        <select 
                                            value={assignment.subject_name}
                                            onChange={e => setAssignment({...assignment, subject_name: e.target.value})}
                                            className="w-full h-9 bg-re-bg rounded-lg px-3 outline-none border border-transparent focus:border-[#1E3A5F]/20 focus:bg-white transition-all text-[#1E3A5F] text-[10px] font-black uppercase tracking-tight shadow-inner cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%236b7280%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E')] bg-[length:10px_10px] bg-no-repeat bg-[position:right_1rem_center] pr-10"
                                        >
                                            <option value="">Select Subject</option>
                                            {subjects.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-[9px] font-black text-[#1E3A5F] uppercase tracking-[0.2em] mb-1.5 opacity-80">Assigned Teacher</label>
                                        <select 
                                            value={assignment.staff_id}
                                            onChange={e => setAssignment({...assignment, staff_id: e.target.value})}
                                            className="w-full h-9 bg-re-bg rounded-lg px-3 outline-none border border-transparent focus:border-[#1E3A5F]/20 focus:bg-white transition-all text-[#1E3A5F] text-[10px] font-black uppercase tracking-tight shadow-inner cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%236b7280%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E')] bg-[length:10px_10px] bg-no-repeat bg-[position:right_1rem_center] pr-10"
                                        >
                                            <option value="">Select Faculty Member</option>
                                            {timetable.map(t => <option key={`opt-${t.id}`} value={t.id}>{t.teacher}</option>)}
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-[9px] font-black text-[#1E3A5F] uppercase tracking-[0.2em] mb-1.5 opacity-80">Location / Class</label>
                                    <select 
                                        value={assignment.room}
                                        onChange={e => setAssignment({...assignment, room: e.target.value})}
                                        className="w-full h-9 bg-re-bg rounded-lg px-3 outline-none border border-transparent focus:border-[#1E3A5F]/20 focus:bg-white transition-all text-[#1E3A5F] text-[10px] font-black uppercase tracking-tight shadow-inner cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%236b7280%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E')] bg-[length:10px_10px] bg-no-repeat bg-[position:right_1rem_center] pr-10"
                                    >
                                        <option value="">Assign Location/Class</option>
                                        {classes.map(c => {
                                            const label = `${c.group_name} ${c.stream_name || ''} ${c.combination ? `[${c.combination}]` : ''}`.trim();
                                            return <option key={`room-${c.id}`} value={label}>{label}</option>;
                                        })}
                                        <option disabled>──────────</option>
                                        <option value="Science Laboratory">Science Laboratory</option>
                                        <option value="Computer Lab">Computer Lab</option>
                                        <option value="Main Library">Main Library</option>
                                        <option value="Sports Field">Sports Field</option>
                                    </select>
                                </div>
                            </div>

                            <div className="pt-2">
                                <button 
                                    onClick={handleSaveAssignment}
                                    disabled={saving || !assignment.subject_name || !assignment.staff_id}
                                    className="w-full h-12 bg-[#1E3A5F] text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-xl flex items-center justify-center gap-2 hover:bg-[#FEBF10] hover:text-[#1E3A5F] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} 
                                    {saving ? 'Saving...' : 'Assign Lesson'}
                                </button>
                                <p className="text-[7px] font-black text-re-text-muted uppercase text-center mt-4 tracking-[0.2em] opacity-40 italic">Syncing with Registry NESA standards... [Automatic Checks]</p>
                            </div>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}

const Settings = (props) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
);
const Coffee = (props) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 8h1a4 4 0 1 1 0 8h-1"/><path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z"/><line x1="6" x2="6" y1="2" y2="4"/><line x1="10" x2="10" y1="2" y2="4"/><line x1="14" x2="14" y1="2" y2="4"/></svg>
);
