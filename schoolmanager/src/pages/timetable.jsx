import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import {
    Calendar, Clock, MapPin, Search, ChevronLeft, ChevronRight, ChevronDown,
    List, Grid as GridIcon, Filter, Plus, FileText, CheckCircle, RefreshCw, X, Save,
    User, BookOpen, Hash, AlertTriangle, Loader2, Layout, Edit3, ArrowLeft, Printer, Download,
    Settings, Coffee, Tag, Users, GraduationCap, Info, Layers, SlidersHorizontal, Share2,
    Eye
} from 'lucide-react';

// Mock Data
const classHierarchy = [
  {
    name: 'Nursery',
    children: [
      { name: 'Baby Class' },
      { name: 'Middle Class' },
      { name: 'Top Class' },
    ]
  },
  {
    name: 'Primary',
    children: [
      { name: 'P1' },
      { name: 'P2' },
      { name: 'P3' },
      { name: 'P4' },
      { name: 'P5' },
      { name: 'P6' },
    ]
  },
  {
    name: 'Secondary',
    children: [
      { name: 'S1' },
      { name: 'S2' },
      { name: 'S3' },
      { 
        name: 'S4', 
        children: [
          { name: 'Senior 4 PCM' },
          { name: 'Senior 4 PCB' },
          { name: 'Senior 4 MCB' },
          { name: 'Senior 4 MEG' },
        ]
      },
      { 
        name: 'S6', 
        children: [
          { name: 'Senior 6 PCM' },
          { name: 'Senior 6 MCB' },
        ]
      }
    ]
  }
];

const mockSubjects = [
    { id: 1, name: 'Mathematics' },
    { id: 2, name: 'Physics' },
    { id: 3, name: 'Chemistry' },
    { id: 4, name: 'Biology' },
    { id: 5, name: 'English' },
    { id: 6, name: 'Computer Science' },
];

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

const mockTimetable = [
    { 
        id: 1, 
        teacher: 'Jean Baptiste Murenzi', 
        load: '18/24', 
        lessons: [
            { id: 101, day: 'Monday', time: '08:00', subject: 'Mathematics', group: 'Senior 4 PCM' },
            { id: 102, day: 'Tuesday', time: '08:50', subject: 'Mathematics', group: 'Senior 1 A' },
            { id: 103, day: 'Wednesday', time: '10:00', subject: 'Mathematics', group: 'Senior 6 MCB' },
        ] 
    },
    { 
        id: 2, 
        teacher: 'Marie Claire Uwase', 
        load: '20/24', 
        lessons: [
            { id: 201, day: 'Monday', time: '08:50', subject: 'Physics', group: 'Senior 4 PCM' },
            { id: 202, day: 'Monday', time: '10:50', subject: 'Physics', group: 'Senior 1 B' },
        ] 
    },
    { 
        id: 3, 
        teacher: 'Samuel Bizimana', 
        load: '15/24', 
        lessons: [
            { id: 301, day: 'Thursday', time: '12:40', subject: 'Computer Science', group: 'Senior 4 PCM' },
        ] 
    }
];

const TreeItem = ({ item, depth = 0, selectedClass, onSelect }) => {
  const [isOpen, setIsOpen] = useState(false);
  const hasChildren = item.children && item.children.length > 0;
  const isSelected = selectedClass === item.name;

  return (
    <div className="mb-0.5">
      <div 
        className={`flex items-center justify-between group px-2 py-1.5 rounded transition-all cursor-pointer text-[11px] ${
          depth === 0 ? 'text-slate-800 font-bold uppercase tracking-tight mt-2' : 
          isSelected ? 'bg-primary/5 text-primary font-black uppercase tracking-tight' : 'text-slate-600 hover:bg-slate-50 uppercase tracking-tight font-medium'
        }`}
        onClick={(e) => {
            if (hasChildren) {
                setIsOpen(!isOpen);
            } else {
                onSelect(item.name);
            }
        }}
      >
        <div className="flex items-center gap-1.5 overflow-hidden">
          {hasChildren && (
            <ChevronDown 
              size={12} 
              className={`text-slate-400 transition-transform ${!isOpen ? '-rotate-90' : ''}`} 
            />
          )}
          {!hasChildren && <div className="w-2 h-2 rounded-full bg-slate-200 ml-1"></div>}
          <span className="truncate">
            {item.name}
          </span>
        </div>
      </div>
      
      {isOpen && hasChildren && (
        <div className="ml-3 mt-1 border-l border-slate-100 pl-1.5 space-y-0.5">
          {item.children.map((child, idx) => (
            <TreeItem key={idx} item={child} depth={depth + 1} selectedClass={selectedClass} onSelect={onSelect} />
          ))}
        </div>
      )}
    </div>
  );
};

export default function Timetable() {
    const navigate = useNavigate();
    const [isWizardOpen, setIsWizardOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [viewMode, setViewMode] = useState('Draft'); // Draft or Review

    // Data States
    const [subjects] = useState(mockSubjects);
    const [periods] = useState(mockPeriods);
    const [timetable, setTimetable] = useState(mockTimetable);

    // Selection States
    const [selectedClass, setSelectedClass] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [wizardContext, setWizardContext] = useState({ day: '', period_id: '', start_time: '', end_time: '', teacher: null });

    // Form State
    const [assignment, setAssignment] = useState({
        subject_name: '',
        staff_id: '',
        room: '',
    });

    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

    // Flat list of classes for the dropdowns
    const flatClasses = [];
    const extractClasses = (items) => {
        items.forEach(item => {
            if (item.children) extractClasses(item.children);
            else flatClasses.push(item);
        });
    };
    extractClasses(classHierarchy);

    const handleOpenWizard = (teacherData, day, period, prefilledClass = '', existingLesson = null) => {
        setWizardContext({ 
            day, 
            period_id: period.id, 
            start_time: period.start_time, 
            end_time: period.end_time, 
            prefilledClass, 
            lesson_id: existingLesson?.id || null,
            teacher: teacherData
        });
        setAssignment({ 
            subject_name: existingLesson?.subject || '',
            staff_id: existingLesson?.teacherId || teacherData?.id || '',
            room: existingLesson?.group || prefilledClass || ''
        });
        setIsWizardOpen(true);
    };

    const getSubjectColorTheme = (subjectName) => {
        if (!subjectName) return 'bg-white border-slate-100 text-[#000435]';
        const themes = [
            'bg-blue-50 border-blue-100 text-blue-700',
            'bg-emerald-50 border-emerald-100 text-emerald-700',
            'bg-purple-50 border-purple-100 text-purple-700',
            'bg-amber-50 border-amber-100 text-amber-700',
            'bg-rose-50 border-rose-100 text-rose-700',
            'bg-indigo-50 border-indigo-100 text-indigo-700',
        ];
        let hash = 0;
        for (let i = 0; i < subjectName.length; i++) hash = subjectName.charCodeAt(i) + ((hash << 5) - hash);
        return themes[Math.abs(hash) % themes.length];
    };

    const handleSaveAssignment = () => {
        setSaving(true);
        setTimeout(() => {
            const newEntry = {
                id: Math.random(),
                day: wizardContext.day,
                time: wizardContext.start_time,
                subject: assignment.subject_name,
                group: assignment.room
            };
            setTimetable(prev => prev.map(t => {
                if (t.id === parseInt(assignment.staff_id)) return { ...t, lessons: [...t.lessons, newEntry] };
                return t;
            }));
            setIsWizardOpen(false);
            setSaving(false);
        }, 800);
    };

    return (
        <div className="flex flex-col h-full bg-white border border-slate-200 overflow-hidden font-sans">
            {/* Global Action Bar - Matching Odoo/Staff Pattern */}
            <div className="flex items-center justify-between px-5 py-2 border-b border-slate-200 bg-white sticky top-0 z-20 shrink-0">
                <div className="flex items-center gap-3">
                    <button 
                        onClick={() => navigate('/')}
                        className="bg-primary hover:bg-primary/90 text-white px-4 py-1.5 rounded-md text-sm font-semibold tracking-wide shadow-sm transition no-underline flex items-center gap-2"
                    >
                        <Save size={14} /> Finish & Save
                    </button>

                    <div className="flex items-center gap-2">
                        <h1 className="text-base font-semibold text-slate-800">Timetable</h1>
                    </div>
                </div>

                <div className="flex items-center gap-5">
                    {/* Search Field */}
                    <div className="flex items-center border border-slate-300 rounded-md overflow-hidden focus-within:border-primary/60 bg-white">
                        <div className="flex items-center px-3 py-1.5">
                            <Search className="w-4 h-4 text-slate-400 mr-2" />
                            <input
                                type="text"
                                placeholder="Search matrix..."
                                className="w-52 text-sm bg-transparent focus:outline-none placeholder:text-slate-400 font-medium"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* View Switch / Draft & Review Mode */}
                    <div className="flex items-center border border-slate-300 rounded-md overflow-hidden bg-white shadow-sm font-bold text-[10px] uppercase tracking-widest">
                        <button 
                            onClick={() => setViewMode('Draft')}
                            className={`px-4 py-2 transition-all ${viewMode === 'Draft' ? 'bg-slate-100 text-primary border-r border-slate-300' : 'text-slate-400 hover:bg-slate-50 border-r border-slate-300'}`}
                        >
                            Draft
                        </button>
                        <button 
                            onClick={() => setViewMode('Review')}
                            className={`px-4 py-2 transition-all ${viewMode === 'Review' ? 'bg-slate-100 text-primary' : 'text-slate-400 hover:bg-slate-50'}`}
                        >
                            Review
                        </button>
                    </div>
                </div>
            </div>

            <div className="flex flex-1 overflow-hidden">
                {/* ── Left Sidebar - Tree Structure ── */}
                <aside className="w-64 border-r border-slate-100 p-4 bg-white overflow-y-auto custom-scrollbar shrink-0">
                    <div className="space-y-8">
                        {/* Section 1: Classes Tree */}
                        <div className="space-y-2">
                            <h2 className="text-[10px] font-black text-slate-800 uppercase tracking-widest flex items-center gap-2 mb-3">
                                <GraduationCap className="w-3 h-3 text-primary" /> CLASSES
                            </h2>
                            <nav className="space-y-1">
                                <div 
                                    onClick={() => setSelectedClass('')}
                                    className={`flex items-center justify-between px-3 py-1.5 rounded cursor-pointer text-[11px] font-bold transition-all uppercase tracking-tight ${selectedClass === '' ? 'bg-primary/5 text-primary font-black' : 'text-slate-500 hover:bg-slate-50'}`}
                                >
                                    <span>Faculty Overview</span>
                                </div>
                                
                                <div className="mt-4">
                                    {classHierarchy.map((node, idx) => (
                                        <TreeItem 
                                            key={idx} 
                                            item={node} 
                                            selectedClass={selectedClass} 
                                            onSelect={setSelectedClass} 
                                        />
                                    ))}
                                </div>
                            </nav>
                        </div>

                        {/* Section 2: Quick Actions */}
                        <div className="space-y-3">
                            <h2 className="text-[10px] font-black text-slate-800 uppercase tracking-widest flex items-center gap-2 mb-3">
                                <Share2 className="w-3 h-3 text-primary" /> DISPATCH
                            </h2>
                            <nav className="space-y-0.5">
                                <div className="flex items-center justify-between px-3 py-1.5 rounded cursor-pointer text-[11px] font-bold text-slate-500 hover:bg-slate-50 hover:text-primary transition-all group border border-transparent uppercase tracking-tight">
                                    <div className="flex items-center gap-2">
                                        <Printer size={14} className="text-slate-300 group-hover:text-primary" />
                                        <span>Print Schedule</span>
                                    </div>
                                </div>
                                <div className="flex items-center justify-between px-3 py-1.5 rounded cursor-pointer text-[11px] font-bold text-slate-500 hover:bg-slate-50 hover:text-primary transition-all group border border-transparent uppercase tracking-tight">
                                    <div className="flex items-center gap-2">
                                        <FileText size={14} className="text-slate-300 group-hover:text-primary" />
                                        <span>Export PDF</span>
                                    </div>
                                </div>
                            </nav>
                        </div>
                    </div>
                </aside>

                {/* ── Right Content: Main Grid Matrix ── */}
                <main className="flex-1 overflow-auto bg-gray-50/30 custom-scrollbar">
                    <table className="w-full border-collapse table-fixed min-w-[1000px]">
                        <thead>
                            <tr className="bg-white sticky top-0 z-10 border-b border-slate-200 shadow-sm">
                                <th className="w-52 p-4 border-r border-slate-200 text-[11px] font-bold text-slate-800 uppercase tracking-wider text-left bg-white">
                                    {selectedClass ? 'Class / Period' : 'Faculty / Period'}
                                </th>
                                {days.map(day => (
                                    <th key={day} className="p-4 border-r border-slate-200 text-[11px] font-bold text-slate-800 uppercase tracking-wider text-center bg-white">
                                        {day}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {(() => {
                                if (!selectedClass) {
                                    // ─── FACULTY OVERVIEW MODE ───
                                    const filteredTimetable = searchQuery 
                                        ? timetable.filter(t => t.teacher.toLowerCase().includes(searchQuery.toLowerCase()))
                                        : timetable;

                                    return filteredTimetable.map((teacherData, index) => {
                                        const teacherLessons = teacherData.lessons || [];
                                        return (
                                            <tr key={`faculty-${teacherData.id}`} className={`border-b border-slate-200 cursor-pointer transition-colors hover:bg-primary/5 ${index % 2 !== 0 ? 'bg-slate-200' : 'bg-white'}`}>
                                                <td className="px-4 py-3 border-r border-slate-200 bg-white sticky left-0 z-10 shadow-[2px_0_5px_rgba(0,0,0,0.02)]">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-7 h-7 rounded bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary border border-primary/20 uppercase">
                                                            {teacherData.teacher.charAt(0)}
                                                        </div>
                                                        <div>
                                                            <p className="text-[11px] font-bold text-slate-700 leading-none">{teacherData.teacher}</p>
                                                            <p className="text-[9px] font-medium text-slate-400 mt-1 uppercase tracking-tighter">Load: {teacherData.load}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                {days.map(day => (
                                                    <td key={`${day}-${teacherData.id}`} className="p-1.5 border-r border-slate-200 align-top">
                                                        <div className="space-y-1.5">
                                                            {periods.map(period => {
                                                                if (period.is_break) {
                                                                    return (
                                                                        <div key={`period-${period.id}`} className="py-1 px-2 bg-slate-50 border border-slate-100 rounded flex items-center justify-between opacity-50">
                                                                            <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">{period.period_name}</span>
                                                                            <span className="text-[8px] font-bold text-slate-300">{period.start_time}</span>
                                                                        </div>
                                                                    );
                                                                }

                                                                const lesson = teacherLessons.find(l => l.day === day && l.time.includes(period.start_time));
                                                                const themeClasses = lesson ? getSubjectColorTheme(lesson.subject) : 'bg-white border-slate-100 text-slate-300';
                                                                
                                                                return (
                                                                    <div key={`period-${period.id}`} className={`relative p-2 border rounded group hover:border-primary/40 transition-all text-left shadow-sm ${themeClasses}`}>
                                                                        <div className="flex items-center justify-between mb-1 opacity-60">
                                                                            <span className="text-[8px] font-bold uppercase tracking-wider">{period.period_name}</span>
                                                                            <span className="text-[8px] font-medium">{period.start_time}</span>
                                                                        </div>
                                                                        {lesson ? (
                                                                            <div className="relative">
                                                                                <p className="text-[10px] font-bold uppercase truncate leading-tight w-[90%] tracking-tight">{lesson.subject}</p>
                                                                                <p className="text-[9px] font-medium opacity-70 uppercase truncate mt-0.5">{lesson.group}</p>
                                                                                <div className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                                    <Edit3 size={10} className="text-primary/40 hover:text-primary cursor-pointer" onClick={() => handleOpenWizard(teacherData, day, period, '', lesson)} />
                                                                                </div>
                                                                            </div>
                                                                        ) : (
                                                                            <div 
                                                                                className="h-6 mt-1 border border-dashed border-slate-200 rounded flex items-center justify-center opacity-40 group-hover:opacity-100 transition-all cursor-pointer hover:bg-primary/5 hover:border-primary/30"
                                                                                onClick={() => handleOpenWizard(teacherData, day, period)}
                                                                            >
                                                                                <Plus size={12} className="text-primary" />
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

                                // ─── CLASS MODE OVERVIEW (Identical to Faculty Mode) ───
                                let classLessons = [];
                                timetable.forEach(teacher => {
                                    (teacher.lessons || []).filter(l => selectedClass.includes(l.group)).forEach(l => {
                                        classLessons.push({ ...l, teacherName: teacher.teacher, teacherId: teacher.id });
                                    });
                                });

                                return (
                                    <tr key={`class-${selectedClass}`} className={`border-b border-slate-200 cursor-pointer transition-colors hover:bg-primary/5 bg-white`}>
                                        <td className="px-4 py-3 border-r border-slate-200 bg-white sticky left-0 z-10 shadow-[2px_0_5px_rgba(0,0,0,0.02)] align-top">
                                            <div className="flex items-center gap-3">
                                                <div className="w-7 h-7 rounded bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary border border-primary/20 uppercase">
                                                    {selectedClass.charAt(0)}
                                                </div>
                                                <div>
                                                    <p className="text-[11px] font-bold text-slate-700 leading-none">{selectedClass}</p>
                                                    <p className="text-[9px] font-medium text-slate-400 mt-1 uppercase tracking-tighter">Assignments: {classLessons.length}</p>
                                                </div>
                                            </div>
                                        </td>
                                        {days.map(day => (
                                            <td key={`${day}-${selectedClass}`} className="p-1.5 border-r border-slate-200 align-top">
                                                <div className="space-y-1.5">
                                                    {periods.map(period => {
                                                        if (period.is_break) {
                                                            return (
                                                                <div key={`period-${period.id}`} className="py-1 px-2 bg-slate-50 border border-slate-100 rounded flex items-center justify-between opacity-50">
                                                                    <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">{period.period_name}</span>
                                                                    <span className="text-[8px] font-bold text-slate-300">{period.start_time}</span>
                                                                </div>
                                                            );
                                                        }

                                                        const lesson = classLessons.find(l => l.day === day && l.time.includes(period.start_time));
                                                        const themeClasses = lesson ? getSubjectColorTheme(lesson.subject) : 'bg-white border-slate-100 text-slate-300';
                                                        
                                                        return (
                                                            <div key={`period-${period.id}`} className={`relative p-2 border rounded group hover:border-primary/40 transition-all text-left shadow-sm ${themeClasses}`}>
                                                                <div className="flex items-center justify-between mb-1 opacity-60">
                                                                    <span className="text-[8px] font-bold uppercase tracking-wider">{period.period_name}</span>
                                                                    <span className="text-[8px] font-medium">{period.start_time}</span>
                                                                </div>
                                                                {lesson ? (
                                                                    <div className="relative">
                                                                        <p className="text-[10px] font-bold uppercase truncate leading-tight w-[90%] tracking-tight">{lesson.subject}</p>
                                                                        <p className="text-[9px] font-medium opacity-70 uppercase truncate mt-0.5">{lesson.teacherName}</p>
                                                                        <div className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                            <Edit3 size={10} className="text-primary/40 hover:text-primary cursor-pointer" onClick={() => handleOpenWizard(null, day, period, selectedClass, lesson)} />
                                                                        </div>
                                                                    </div>
                                                                ) : (
                                                                    <div 
                                                                        className="h-6 mt-1 border border-dashed border-slate-200 rounded flex items-center justify-center opacity-40 group-hover:opacity-100 transition-all cursor-pointer hover:bg-primary/5 hover:border-primary/30"
                                                                        onClick={() => handleOpenWizard(null, day, period, selectedClass)}
                                                                    >
                                                                        <Plus size={12} className="text-primary" />
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
                </main>
            </div>

            {/* Timetable Wizard Modal - Using standard Form Pattern */}
            <AnimatePresence>
                {isWizardOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6" style={{ background: 'rgba(15,23,42,0.45)', backdropFilter: 'blur(2px)' }}>
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.95, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 10 }}
                            className="relative bg-white rounded-xl shadow-2xl w-full max-w-md flex flex-col overflow-hidden"
                        >
                            <div className="flex items-start justify-between px-7 pt-6 pb-4 border-b border-slate-100">
                                <div className="flex items-center gap-4">
                                    {wizardContext.teacher ? (
                                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary border border-primary/20 uppercase shadow-sm">
                                            {wizardContext.teacher.teacher.charAt(0)}
                                        </div>
                                    ) : (
                                        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                                            <Layout size={18} />
                                        </div>
                                    )}
                                    <div>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Scheduling · {wizardContext.day} {wizardContext.start_time}</p>
                                        <h2 className="text-base font-bold text-slate-800">
                                            {wizardContext.teacher ? wizardContext.teacher.teacher : 'Assign Faculty Asset'}
                                        </h2>
                                    </div>
                                </div>
                                <button onClick={() => setIsWizardOpen(false)} className="text-slate-300 hover:text-slate-500 transition-colors mt-0.5 ml-4">
                                    <X size={18} />
                                </button>
                            </div>
                            
                            <div className="flex-1 overflow-y-auto px-7 py-6">
                                <div className="space-y-6">
                                    <div className="grid grid-cols-3 items-center gap-4">
                                        <label className="text-sm font-semibold text-slate-700">Class Unit<span className="text-red-400 ml-0.5">*</span></label>
                                        <div className="col-span-2 relative">
                                            <select 
                                                value={assignment.room}
                                                onChange={e => setAssignment({...assignment, room: e.target.value})}
                                                className="w-full text-sm bg-transparent border-b border-slate-200 py-1.5 focus:outline-none focus:border-primary appearance-none cursor-pointer transition-colors"
                                            >
                                                <option value="">Select Class...</option>
                                                {flatClasses.map(c => (
                                                    <option key={`room-${c.name}`} value={c.name}>{c.name}</option>
                                                ))}
                                                <option disabled>──────────</option>
                                                <option value="Science Laboratory">Science Laboratory</option>
                                                <option value="Computer Lab">Computer Lab</option>
                                                <option value="Main Library">Main Library</option>
                                            </select>
                                            <ChevronDown className="w-4 h-4 text-slate-400 absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none" />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-3 items-center gap-4">
                                        <label className="text-sm font-semibold text-slate-700">Subject<span className="text-red-400 ml-0.5">*</span></label>
                                        <div className="col-span-2 relative">
                                            <select 
                                                value={assignment.subject_name}
                                                onChange={e => setAssignment({...assignment, subject_name: e.target.value})}
                                                className="w-full text-sm bg-transparent border-b border-slate-200 py-1.5 focus:outline-none focus:border-primary appearance-none cursor-pointer transition-colors"
                                            >
                                                <option value="">Select Subject...</option>
                                                {subjects.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                                            </select>
                                            <ChevronDown className="w-4 h-4 text-slate-400 absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none" />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-3 items-center gap-4">
                                        <label className="text-sm font-semibold text-slate-700">Teacher<span className="text-red-400 ml-0.5">*</span></label>
                                        <div className="col-span-2 relative">
                                            <select 
                                                value={assignment.staff_id}
                                                onChange={e => setAssignment({...assignment, staff_id: e.target.value})}
                                                className="w-full text-sm bg-transparent border-b border-slate-200 py-1.5 focus:outline-none focus:border-primary appearance-none cursor-pointer transition-colors"
                                            >
                                                <option value="">Select Faculty...</option>
                                                {timetable.map(t => <option key={`opt-${t.id}`} value={t.id}>{t.teacher}</option>)}
                                            </select>
                                            <ChevronDown className="w-4 h-4 text-slate-400 absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none" />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="px-7 py-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-end gap-3">
                                <button 
                                    onClick={() => setIsWizardOpen(false)} 
                                    className="text-slate-500 hover:text-slate-700 px-5 py-2 rounded-lg font-bold text-[11px] uppercase tracking-wider border border-slate-200 hover:border-slate-300 transition-all"
                                >
                                    Cancel
                                </button>
                                <button 
                                    onClick={handleSaveAssignment}
                                    disabled={saving || !assignment.subject_name || !assignment.staff_id || !assignment.room}
                                    className="hover:opacity-90 disabled:opacity-50 text-white px-5 py-2 rounded-lg font-bold text-[11px] uppercase tracking-wider shadow-md transition-all flex items-center gap-2 bg-primary"
                                >
                                    {saving && <Loader2 size={13} className="animate-spin" />}
                                    {saving ? 'Saving...' : 'Assign Faculty'}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
