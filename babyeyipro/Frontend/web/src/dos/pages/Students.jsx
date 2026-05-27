import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
    Users, Search, Plus, MoreVertical, GraduationCap,
    TrendingUp, Download, Mail, ChevronRight, TrendingDown,
    UserCheck, Award, Filter, Activity, UserPlus, X, User,
    Phone, Clock, Home, Tag, Edit3, Printer, Eye, CheckCircle, RefreshCw
} from 'lucide-react';
import api from '../services/api';
import ConductMarksModal from '../components/ConductMarksModal';
import StudentIdentityRegistrationModal from '../components/StudentIdentityRegistrationModal';
import TeacherOrangeHero from '../../shared/components/TeacherOrangeHero';
import { PORTAL } from '../config/portal';
import { useAuth } from '../context/AuthContext';

const ASSET_BASE = api.defaults.baseURL.replace('/api', '');

// ── Student Detail Modal (Drawer Style) ──────────────────────────────────────
const StudentModal = ({ student, onClose }) => {
    if (!student) return null;

    return createPortal(
        <>
            {/* Backdrop Blur */}
            <div
                className="fixed inset-0 bg-black/40 backdrop-blur-md z-[100] animate-in fade-in duration-300"
                onClick={onClose}
            />

            {/* Right Side Drawer */}
            <div className="fixed inset-y-0 right-0 z-[110] w-full md:w-[420px] bg-white shadow-[-20px_0_60px_-15px_rgba(0,0,0,0.1)] flex flex-col animate-in slide-in-from-right duration-500 ease-out">

                {/* Drawer Header */}
                <div className="flex items-center justify-between px-8 py-6 border-b border-black/5 bg-white shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-re-bg border border-black/5 flex items-center justify-center text-re-text font-black text-lg shadow-inner relative overflow-hidden">
                            {student.student_photo_url ? (
                                <img src={`${ASSET_BASE}${student.student_photo_url}`} className="w-full h-full object-cover relative z-10" alt="Student" />
                            ) : (
                                <>
                                    <span className="relative z-10">{student.name.charAt(0)}</span>
                                    <div className="absolute inset-0 bg-re-grad-orange opacity-5"></div>
                                </>
                            )}
                        </div>
                        <div>
                            <h3 className="font-black text-re-text text-base leading-tight uppercase tracking-tight">{student.name}</h3>
                            <p className="text-[9px] text-re-text-muted font-bold flex items-center gap-1 uppercase tracking-widest mt-0.5 opacity-40">
                                <span className="w-1 h-1 bg-re-orange rounded-full"></span>
                                Institutional ID: {student.id}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2.5 hover:bg-re-bg rounded-xl transition-all text-re-text-muted hover:text-re-orange group"
                    >
                        <X size={18} className="group-hover:rotate-90 transition-transform duration-300" />
                    </button>
                </div>

                {/* Drawer Body (Scrollable) */}
                <div className="flex-1 overflow-y-auto px-8 py-8 space-y-8 custom-scrollbar">

                    {/* Status Alert (Premium Badge) */}
                    <div className={`flex items-center gap-3 px-4 py-3 rounded-2xl border ${student.status === 'Epic' ? 'bg-emerald-50 border-emerald-100/50' : 'bg-re-orange/5 border-re-orange/10'}`}>
                        <div className={`p-1.5 rounded-lg ${student.status === 'Epic' ? 'bg-emerald-500' : 'bg-re-orange'} text-white`}>
                            <Award size={14} />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-re-text uppercase tracking-widest">{student.status} Performing Student</p>
                            <p className="text-[9px] text-re-text/40 font-bold uppercase tracking-tight leading-none mt-0.5">Academic cycle normalized for {student.grade} {student.stream}</p>
                        </div>
                    </div>

                    {/* Academic Hero Section (Marks & Presence) */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-re-bg rounded-3xl p-5 border border-black/5 shadow-inner relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-16 h-16 bg-re-grad-purple opacity-5 rounded-full -mr-6 -mt-6 group-hover:scale-125 transition-transform duration-700" />
                            <p className="text-[8px] text-re-text-muted uppercase tracking-[0.2em] font-black mb-1 relative z-10 opacity-60">Avg Score</p>
                            <div className="flex items-baseline gap-1 relative z-10">
                                <span className="text-2xl font-black text-re-text tracking-tighter">{(student.gpa * 25).toFixed(0)}</span>
                                <span className="text-[10px] font-black text-re-orange uppercase tracking-widest">%</span>
                            </div>
                        </div>
                        <div className="bg-re-bg rounded-3xl p-5 border border-black/5 shadow-inner relative overflow-hidden group text-right">
                            <div className="absolute top-0 left-0 w-16 h-16 bg-re-grad-orange opacity-5 rounded-full -ml-6 -mt-6 group-hover:scale-125 transition-transform duration-700" />
                            <p className="text-[8px] text-re-text-muted uppercase tracking-[0.2em] font-black mb-1 relative z-10 opacity-60">Term Presence</p>
                            <div className="flex items-baseline gap-1 justify-end relative z-10">
                                <span className="text-2xl font-black text-re-text tracking-tighter">{student.attendance}</span>
                                <span className="text-[10px] font-black text-re-orange uppercase tracking-widest">%</span>
                            </div>
                        </div>
                    </div>

                    {/* Detailed Info Matrix (genzura styled) */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="text-[9px] font-black text-re-text-muted uppercase tracking-[0.3em] opacity-40">Profile Intelligence</span>
                            <div className="flex-1 h-px bg-black/5" />
                        </div>
                        {[
                            { label: 'Guardian', value: student.parent, icon: Users },
                            { label: 'Parent Phone', value: student.phone, icon: Phone },
                            { label: 'Email Context', value: student.email, icon: Mail },
                            { label: 'Enrollment', value: student.created_at ? new Date(student.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A', icon: Clock },
                            { label: 'House / Loc.', value: `${student.province}, ${student.district}`, icon: Home },
                            { label: 'Institutional ID', value: student.id, icon: Tag },
                        ].map((item, i) => (
                            <div key={i} className="flex items-center justify-between group">
                                <div className="flex items-center gap-2">
                                    <item.icon size={11} className="text-re-orange opacity-30" />
                                    <span className="text-[10px] font-black text-re-text-muted uppercase tracking-widest">{item.label}</span>
                                </div>
                                <div className="flex-1 mx-3 border-b border-dashed border-black/10 group-hover:border-re-orange/30 transition-colors" />
                                <span className="text-[10px] font-black text-re-text uppercase tracking-tight">{item.value}</span>
                            </div>
                        ))}
                    </div>

                    {/* Behavioral Activity Log (Scholastic History) */}
                    <div>
                        <div className="flex items-center gap-2 mb-4">
                            <span className="text-[9px] font-black text-re-text-muted uppercase tracking-[0.3em] opacity-40">Scholastic Activity Log</span>
                            <div className="flex-1 h-px bg-black/5" />
                        </div>

                        <div className="space-y-3">
                            {[
                                { type: 'Academic', date: 'Yesterday', msg: 'Updated Mathematics term grade to 88%', icon: GraduationCap, color: 'text-re-purple', bg: 'bg-re-purple/5' },
                                { type: 'Behavioral', date: '3 days ago', msg: 'Added +2 Conduct Marks for voluntary assistance.', icon: Activity, color: 'text-emerald-500', bg: 'bg-emerald-50' },
                                { type: 'Presence', date: '1 week ago', msg: 'Recorded as Excused Absence for healthcare.', icon: UserCheck, color: 'text-re-orange', bg: 'bg-re-orange/5' }
                            ].map((log, i) => (
                                <div key={i} className="flex items-start gap-3 p-4 rounded-2xl bg-re-bg/50 border border-black/[0.02] group hover:bg-white hover:border-black/5 transition-all">
                                    <div className={`p-2 rounded-xl ${log.bg} ${log.color} shrink-0`}>
                                        <log.icon size={14} />
                                    </div>
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2 mb-0.5">
                                            <span className="text-[8px] font-black uppercase tracking-widest text-re-text">{log.type}</span>
                                            <span className="w-1 h-1 bg-black/10 rounded-full"></span>
                                            <span className="text-[8px] font-bold text-re-text-muted opacity-40 uppercase">{log.date}</span>
                                        </div>
                                        <p className="text-[10px] font-bold text-re-text-muted leading-relaxed tracking-tight group-hover:text-re-text transition-colors">{log.msg}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Drawer Footer (Actions) */}
                <div className="px-8 py-6 border-t border-black/5 bg-re-bg/20 flex flex-col gap-3">
                    <button
                        onClick={() => onClose(true)}
                        className="h-12 w-full flex items-center justify-center gap-2 bg-re-grad-orange text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-re-glow hover:scale-[1.02] active:scale-95 transition-all"
                    >
                        <Activity size={15} /> <span className="tracking-tighter">+/-</span> Conduct Marks
                    </button>
                    <div className="grid grid-cols-2 gap-3">
                        <button className="h-12 flex items-center justify-center gap-2 bg-white border border-black/5 text-re-text font-black text-[10px] uppercase tracking-widest rounded-2xl hover:bg-re-bg transition-all">
                            <Phone size={15} className="text-re-orange" /> Contact Parent
                        </button>
                        <button className="h-12 flex items-center justify-center gap-2 bg-white border border-black/5 text-re-text font-black text-[10px] uppercase tracking-widest rounded-2xl hover:bg-re-bg transition-all">
                            <Printer size={15} className="text-re-orange" /> Report
                        </button>
                    </div>
                </div>
            </div>
        </>,
        document.body
    );
};

const Students = () => {
    const { teacher } = useAuth();
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [openDropdownId, setOpenDropdownId] = useState(null);
    const [showClassFilter, setShowClassFilter] = useState(false);
    const [selectedClass, setSelectedClass] = useState('View All');
    const [showAllClassesModal, setShowAllClassesModal] = useState(false);
    const [isClassSelected, setIsClassSelected] = useState(window.innerWidth >= 768);
    const [showIdentityModal, setShowIdentityModal] = useState(false);

    // Conduct Modal State
    const [isConductModalOpen, setIsConductModalOpen] = useState(false);
    const [conductStudent, setConductStudent] = useState(null);

    const openConductModal = (student = null) => {
        setConductStudent(student);
        setIsConductModalOpen(true);
    };

    const [mockStudents, setMockStudents] = useState([]);
    const [classes, setClasses] = useState([]);
    const [stats, setStats] = useState({
        totalEnrolled: '0',
        epicPercent: '0%',
        avgAttendance: '0%',
        diversityIndex: '1.0'
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStudents = async () => {
             try {
                 const res = await api.get('/teacher-portal/students');
                 if (res.data.success) {
                     setMockStudents(res.data.data || []);
                     if (res.data.stats) {
                         setStats({
                             totalEnrolled: res.data.stats.totalEnrolled?.toLocaleString(),
                             epicPercent: res.data.stats.epicPercent + '%',
                             avgAttendance: res.data.stats.avgAttendance + '%',
                             diversityIndex: res.data.stats.diversityIndex
                         });
                     }
                 }
             } catch (e) {
                 console.error(e);
             } finally {
                 setLoading(false);
             }
        };
        const fetchClasses = async () => {
             try {
                 const res = await api.get('/teacher-portal/classes');
                 if (res.data.success) {
                     setClasses(res.data.data || []);
                 }
             } catch (e) {
                 console.error('Failed to fetch classes:', e);
             }
         };

         fetchStudents();
         fetchClasses();
    }, []);

    const filteredStudents = mockStudents.filter(s =>
        (s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            s.id.toLowerCase().includes(searchTerm.toLowerCase())) &&
        (selectedClass === 'View All' || s.grade === selectedClass)
    );

    return (
        <div className="animate-in fade-in duration-700 bg-white min-h-screen">
            <StudentModal
                student={selectedStudent}
                onClose={(openConduct) => {
                    setSelectedStudent(null);
                    if (openConduct === true) setTimeout(() => openConductModal(selectedStudent), 100);
                }}
            />

            <ConductMarksModal
                isOpen={isConductModalOpen}
                onClose={() => setIsConductModalOpen(false)}
                initialStudent={conductStudent}
                students={mockStudents}
            />
            <StudentIdentityRegistrationModal
                open={showIdentityModal}
                onClose={() => setShowIdentityModal(false)}
                session={{ schoolName: teacher?.school?.name || teacher?.school_name || 'School' }}
                toast={() => {}}
                onSaved={async () => {
                    try {
                        const res = await api.get('/teacher-portal/students');
                        if (res.data?.success) {
                            setMockStudents(res.data.data || []);
                        }
                    } catch (_) { /* noop */ }
                }}
            />

            {/* Mobile "More Classes" Modal */}
            {showAllClassesModal && createPortal(
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in" onClick={() => setShowAllClassesModal(false)} />
                    <div className="relative bg-white w-full max-w-sm rounded-[2rem] shadow-sm overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="px-6 py-5 border-b border-black/5 flex items-center justify-between">
                            <div>
                                <h3 className="text-sm font-black text-re-text uppercase tracking-widest">Select Class</h3>
                                <p className="text-[10px] text-re-text-muted font-bold mt-0.5">Filter the students table</p>
                            </div>
                            <button onClick={() => setShowAllClassesModal(false)} className="w-8 h-8 flex items-center justify-center rounded-xl bg-re-bg text-re-text-muted hover:bg-black/10 transition-colors">
                                <X size={14} />
                            </button>
                        </div>
                        <div className="p-4 grid grid-cols-2 gap-2">
                            {classes.map(cls => (
                                <button
                                    key={cls}
                                    onClick={() => {
                                        setSelectedClass(cls);
                                        setShowAllClassesModal(false);
                                    }}
                                    className={`h-12 flex items-center gap-2 px-4 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all ${selectedClass === cls
                                        ? 'bg-re-orange/10 border-re-orange/30 text-re-orange ring-1 ring-re-orange/30'
                                        : 'bg-white border-black/5 text-re-text-muted hover:border-black/10'
                                        }`}
                                >
                                    {selectedClass === cls && <CheckCircle size={14} className="text-re-orange" />}
                                    {cls}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>, document.body
            )}

            <TeacherOrangeHero
                title={`Welcome back, ${teacher?.first_name || 'Director'}`}
                subtitle={`Student registry — rosters and analytics for ${PORTAL.roleLabel.toLowerCase()} oversight.`}
            />

            <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 -mt-10 pt-2 relative z-20 pb-20">
                <div className="bg-white rounded-t-[32px] shadow-sm border border-black/10 overflow-hidden flex flex-col">

                    {/* Top Layer: Stats Grid + Actions (Dashboard Style) */}
                    <div className={`${!isClassSelected ? 'hidden md:grid' : 'grid'} grid-cols-1 lg:grid-cols-4 border-b border-black/5`}>
                        {/* Stats (3 columns on lg) */}
                        <div className="lg:col-span-3 grid grid-cols-2 md:grid-cols-2 divide-x divide-y md:divide-y-0 divide-black/5">
                            {[
                                { label: 'Total Enrolled', value: stats.totalEnrolled, icon: <Users size={14} className="text-re-orange opacity-40 mb-2" /> },
                              
                                { label: 'Attendance Avg', value: stats.avgAttendance, icon: <Activity size={14} className="text-re-orange opacity-40 mb-2" /> },
                              
                            ].map((stat, i) => (
                                <div key={i} className="p-4 sm:p-8 flex flex-col items-center justify-center text-center group hover:bg-re-bg/20 transition-all cursor-default">
                                    {stat.icon && React.cloneElement(stat.icon, { size: 12, className: "text-re-orange opacity-40 mb-1.5 sm:mb-2" })}
                                    <span className="text-sm sm:text-2xl font-black text-re-text tracking-tighter group-hover:text-re-orange transition-colors">
                                        {stat.value}
                                    </span>
                                    <p className="text-[6px] sm:text-[8px] font-black text-re-text-muted uppercase tracking-[0.2em] mt-0.5 sm:mt-1 opacity-60">
                                        {stat.label}
                                    </p>
                                </div>
                            ))}
                        </div>

                        {/* Right Side Actions Section (Desktop) */}
                        <div className="hidden lg:flex flex-col border-l border-black/5 bg-re-bg/30 p-6 justify-center gap-3">
                            <button className="w-full h-11 flex items-center justify-center gap-2 bg-re-grad-orange text-white rounded-xl font-black text-[9px] uppercase tracking-widest shadow-re-glow hover:scale-[1.02] active:scale-95 transition-all">
                                <Download size={14} />
                                Export Registry
                            </button>
                            <button className="w-full h-11 flex items-center justify-center gap-2 bg-white border border-black/5 text-re-text font-black text-[9px] uppercase tracking-widest rounded-xl hover:bg-re-bg hover:shadow-re-soft transition-all">
                                <Mail size={14} className="text-re-orange" />
                                Notify Parents
                            </button>
                        </div>
                    </div>

                    {/* Middle Layer: Management Control (Integrated Search & Filter) */}
                    <div className={`${!isClassSelected ? 'hidden md:flex' : 'flex'} p-6 md:px-8 border-b border-black/5 flex-col md:flex-row items-center gap-4 bg-white/50`}>
                        <div className="relative flex-1 w-full group">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-re-text-muted/40 group-focus-within:text-re-orange transition-colors" size={16} />
                            <input
                                type="text"
                                placeholder="Search records..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full h-10 sm:h-11 bg-re-bg rounded-xl pl-11 pr-4 font-extrabold outline-none border border-transparent focus:border-re-orange/20 focus:bg-white transition-all text-re-text text-sm sm:text-xs tracking-tight shadow-inner"
                            />
                        </div>
                        <div className="flex items-center gap-2 w-full md:w-auto">
                            <button
                                onClick={() => setShowClassFilter(!showClassFilter)}
                                className="h-10 sm:h-11 px-3 sm:px-5 bg-white border border-black/5 rounded-xl flex items-center gap-1.5 sm:gap-2 text-re-text-muted font-black text-[8px] sm:text-[9px] uppercase tracking-widest hover:bg-re-bg transition-all shadow-sm whitespace-nowrap"
                            >
                                <Filter size={14} className="text-re-orange" />
                                Filter By Class
                            </button>
                            <div className="w-px h-6 bg-black/5 hidden md:block"></div>
                            <button
                                onClick={() => openConductModal(null)}
                                className="h-10 sm:h-11 flex-1 md:flex-none px-3 sm:px-6 bg-re-bg border border-black/5 rounded-xl text-re-text font-black text-[8px] sm:text-[9px] uppercase tracking-widest hover:bg-white hover:border-re-orange/20 transition-all shadow-sm group flex items-center gap-1.5 sm:gap-2 whitespace-nowrap"
                            >
                                <Activity size={14} className="text-re-orange opacity-60 group-hover:opacity-100 transition-opacity" />
                                <span className="tracking-tighter">+/-</span> <span className="text-re-orange group-hover:text-re-orange">Conduct Marks</span>
                            </button>
                        </div>
                    </div>

                    {/* Conditional Class Filter Section */}
                    {showClassFilter && (
                        <div className={`${!isClassSelected ? 'hidden md:flex' : 'flex'} px-6 md:px-8 py-4 bg-re-bg/20 border-b border-black/5 items-center overflow-x-auto gap-2 custom-scrollbar animate-in slide-in-from-top-2 fade-in duration-300`}>

                            {/* All Classes Option */}
                            <button
                                onClick={() => setSelectedClass('View All')}
                                className={`flex items-center justify-center gap-1.5 shrink-0 h-7 sm:h-9 px-3 sm:px-5 rounded-lg sm:rounded-xl border font-black text-[7px] sm:text-[9px] uppercase tracking-widest transition-all whitespace-nowrap ${selectedClass === 'View All'
                                    ? 'bg-re-orange border-re-orange text-white shadow-re-glow hover:scale-105'
                                    : 'bg-white border-black/5 text-re-text-muted hover:bg-re-bg hover:text-re-text'
                                    }`}
                            >
                                {selectedClass === 'View All' && <CheckCircle size={10} className="sm:w-3 sm:h-3 opacity-80" />}
                                All Classes
                            </button>

                            {/* Individual Classes */}
                            {classes.map((cls, idx) => (
                                <button
                                    key={cls}
                                    onClick={() => setSelectedClass(cls)}
                                    className={`flex items-center justify-center gap-1.5 shrink-0 h-7 sm:h-9 px-3 sm:px-5 rounded-lg sm:rounded-xl border font-black text-[7px] sm:text-[9px] uppercase tracking-widest transition-all whitespace-nowrap ${idx > 1 ? 'hidden md:flex' : ''} ${selectedClass === cls
                                        ? 'bg-re-orange border-re-orange text-white shadow-re-glow hover:scale-105'
                                        : 'bg-white border-black/5 text-re-text-muted hover:bg-re-bg hover:text-re-text'
                                        }`}
                                >
                                    {selectedClass === cls && <CheckCircle size={10} className="sm:w-3 sm:h-3 opacity-80" />}
                                    {cls}
                                </button>
                            ))}

                            {/* More Trigger for Mobile */}
                            <button
                                onClick={() => setShowAllClassesModal(true)}
                                className="md:hidden flex items-center justify-center gap-1.5 shrink-0 h-7 px-3 rounded-lg border border-black/5 bg-white text-re-orange font-black text-[7px] uppercase tracking-widest transition-all shadow-sm active:scale-95"
                            >
                                <Plus size={10} /> More
                            </button>
                        </div>
                    )}

                    {/* Bottom Layer: Selection Gatekeeper or Scholastic Repository */}
                    {!isClassSelected && (
                        <div className="md:hidden p-4 sm:p-6 bg-re-bg/20 flex flex-col items-center justify-center text-center py-8 sm:py-12 animate-in fade-in zoom-in-95 duration-500">
                            <div className="w-12 h-12 sm:w-16 sm:h-16 bg-white rounded-2xl sm:rounded-[2rem] shadow-sm flex items-center justify-center text-re-orange mb-4 sm:mb-6 border border-black/5 animate-bounce">
                                <GraduationCap size={24} className="sm:w-8 sm:h-8" />
                            </div>
                            <h2 className="text-lg sm:text-xl font-black text-re-text tracking-tighter uppercase mb-1 sm:mb-2">Select a Class</h2>
                            <p className="text-[8px] sm:text-[10px] text-re-text-muted font-bold uppercase tracking-widest leading-relaxed mb-6 sm:mb-8 max-w-[200px] sm:max-w-[240px]">Select a specific academic registry to view analytics.</p>

                            <div className="grid grid-cols-2 gap-2 sm:gap-3 w-full max-w-sm">
                                {classes.map(cls => (
                                    <button
                                        key={cls}
                                        onClick={() => {
                                            setSelectedClass(cls);
                                            setIsClassSelected(true);
                                        }}
                                        className="h-14 sm:h-16 flex  items-center justify-center gap-2.5 sm:gap-2 bg-white border border-black/5 rounded-xl sm:rounded-2xl shadow-sm hover:border-re-orange/30 hover:bg-re-orange/5 transition-all group active:scale-95"
                                    >
                                        <div className="flex flex-col items-center gap-0.5">
                                            <span className="text-[9px] sm:text-[10px] font-black text-re-text group-hover:text-re-orange uppercase">{cls}</span>
                                            <span className="text-[6px] sm:text-[7px] font-bold text-re-text-muted uppercase tracking-widest opacity-40 italic">View Registry</span>
                                        </div>
                                        {/* chevron right  */}
                                        <ChevronRight size={14} className="text-re-text-muted" />

                                    </button>
                                ))}
                                <button
                                    onClick={() => {
                                        setSelectedClass('View All');
                                        setIsClassSelected(true);
                                    }}
                                    className="col-span-2 h-12 sm:h-14 bg-re-grad-orange text-white rounded-xl sm:rounded-2xl font-black text-[8px] sm:text-[9px] uppercase tracking-widest shadow-re-glow hover:scale-105 active:scale-95 transition-all mt-1 sm:mt-2"
                                >
                                    View All Students
                                </button>
                            </div>
                        </div>
                    )}

                    <div className={`${!isClassSelected ? 'hidden md:block' : 'block'} overflow-x-auto bg-white`}>
                        {isClassSelected && (
                            <div className="md:hidden px-6 py-3 bg-white border-b border-black/5 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 bg-re-orange rounded-full"></div>
                                    <span className="text-[9px] font-black text-re-text uppercase tracking-widest">{selectedClass} Registry</span>
                                </div>
                                <button
                                    onClick={() => setIsClassSelected(false)}
                                    className="text-[8px] font-black text-re-orange uppercase tracking-widest hover:underline"
                                >
                                    Change Class
                                </button>
                            </div>
                        )}
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-re-bg/20 border-b border-black/5">
                                    <th className="px-4 sm:px-8 py-3 sm:py-4 text-[7px] sm:text-[8px] font-black text-re-text-muted uppercase tracking-[0.2em] opacity-40 border-r border-black/5 last:border-r-0">Student Info</th>
                                    <th className="hidden md:table-cell px-8 py-4 text-[8px] font-black text-re-text-muted uppercase tracking-[0.2em] opacity-40 border-r border-black/5">Academics</th>
                                    <th className="hidden md:table-cell px-8 py-4 text-[8px] font-black text-re-text-muted uppercase tracking-[0.2em] opacity-40 border-r border-black/5">Presence</th>
                                    <th className="hidden md:table-cell px-8 py-4 text-[8px] font-black text-re-text-muted uppercase tracking-[0.2em] opacity-40 border-r border-black/5">Status</th>
                                    <th className="px-4 sm:px-8 py-3 sm:py-4 text-[7px] sm:text-[8px] font-black text-re-text-muted uppercase tracking-[0.2em] opacity-40 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-black/5">
                                {loading ? (
                                    <tr>
                                        <td colSpan="5" className="p-12 text-center">
                                            <div className="w-8 h-8 border-4 border-re-orange border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                                            <p className="text-[10px] font-black text-re-text-muted uppercase tracking-widest">Accessing Central Registry...</p>
                                        </td>
                                    </tr>
                                ) : (
                                    <>
                                        {filteredStudents.map((s, index) => {
                                            const isLastItems = index >= filteredStudents.length - 2 && filteredStudents.length > 2;
                                            return (
                                                <tr
                                                    key={s.id}
                                                    onClick={() => setSelectedStudent(s)}
                                                    className="hover:bg-re-bg/60 even:bg-re-bg/20 transition-colors group cursor-pointer"
                                                >
                                                    <td className="px-4 sm:px-8 py-3 sm:py-5 border-r border-black/5 last:border-r-0">
                                                        <div className="flex items-center gap-3 sm:gap-4">
                                                            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-re-bg border border-black/5 flex-shrink-0 flex items-center justify-center text-re-text-muted transition-colors relative shadow-inner overflow-hidden group-hover:bg-white">
                                                                {s.student_photo_url ? (
                                                                    <img src={`${ASSET_BASE}${s.student_photo_url}`} className="w-full h-full object-cover relative z-10" alt="Student" />
                                                                ) : (
                                                                    <User size={12} className="sm:w-3.5 sm:h-3.5 opacity-40 text-re-text-muted" />
                                                                )}
                                                                <div className="absolute -bottom-1 -right-1 w-2.5 h-2.5 sm:w-3 h-3 bg-white border border-black/5 rounded-full flex items-center justify-center">
                                                                    <div className="w-1 h-1 sm:w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
                                                                </div>
                                                            </div>
                                                            <div>
                                                                <p className="text-xs sm:text-sm font-black text-re-text tracking-tight uppercase leading-none mb-1 group-hover:text-re-orange transition-colors">{s.name}</p>
                                                                <p className="text-[7px] sm:text-[9px] font-bold text-re-text-muted opacity-30 uppercase tracking-widest leading-none font-mono italic">{s.id}</p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="hidden md:table-cell px-8 py-5">
                                                        <div className="flex flex-col gap-0.5">
                                                            <p className="text-[10px] font-black text-re-text uppercase tracking-tight">{s.grade}</p>
                                                            <div className="flex items-center gap-2">
                                                                <p className="text-[9px] font-bold text-re-text-muted opacity-30 uppercase tracking-widest">GPA {s.gpa}</p>
                                                                <div className="w-1 h-3 bg-black/5 rounded-full shrink-0"></div>
                                                                <p className="text-[9px] font-black text-re-orange uppercase italic">{s.stream}</p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="hidden md:table-cell px-8 py-5">
                                                        <div className="space-y-1.5 max-w-[100px]">
                                                            <div className="flex items-center justify-between">
                                                                <p className="text-[9px] font-black text-re-text">{s.attendance}%</p>
                                                            </div>
                                                            <div className="w-full h-1 bg-black/5 rounded-full overflow-hidden">
                                                                <div className={`h-full ${s.attendance > 90 ? 'bg-re-grad-purple shadow-re-glow' : 'bg-re-grad-orange'}`} style={{ width: `${s.attendance}%` }}></div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="hidden md:table-cell px-8 py-5">
                                                        <div className={`inline-flex px-3 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest ring-1 ring-inset ${s.status === 'Epic' ? 'bg-emerald-50 text-emerald-600 ring-emerald-500/20' :
                                                            s.status === 'Advanced' ? 'bg-blue-50 text-blue-600 ring-blue-500/20' :
                                                                'bg-re-orange/5 text-re-orange ring-re-orange/20'
                                                            }`}>
                                                            {s.status}
                                                        </div>
                                                    </td>
                                                    <td className="px-4 sm:px-8 py-3 sm:py-5 text-right relative">
                                                        <div className="flex items-center gap-2 sm:gap-3 justify-end">
                                                            <button
                                                                className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center text-re-text-muted hover:bg-re-bg hover:text-re-orange transition-all border border-transparent hover:border-black/5"
                                                                onClick={(e) => { e.stopPropagation(); }}
                                                            >
                                                                <Mail size={12} className="sm:w-3.5 sm:h-3.5" />
                                                            </button>
                                                            <div className="relative">
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setOpenDropdownId(openDropdownId === s.id ? null : s.id);
                                                                    }}
                                                                    className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center text-re-text-muted hover:bg-re-bg hover:text-re-orange transition-all border border-transparent hover:border-black/5"
                                                                >
                                                                    <MoreVertical size={12} className="sm:w-3.5 sm:h-3.5" />
                                                                </button>

                                                                {/* Dropdown Menu */}
                                                                {openDropdownId === s.id && (
                                                                    <>
                                                                        <div
                                                                            className="fixed inset-0 z-[40]"
                                                                            onClick={(e) => { e.stopPropagation(); setOpenDropdownId(null); }}
                                                                        />
                                                                        <div
                                                                            className={`absolute right-0 ${isLastItems ? 'bottom-full mb-2 origin-bottom-right' : 'top-full mt-2 origin-top-right'} w-48 bg-white border border-black/5 shadow-sm rounded-2xl z-[50] overflow-hidden py-1 animate-in fade-in zoom-in-95 duration-150`}
                                                                            onClick={(e) => e.stopPropagation()}
                                                                        >
                                                                            <button
                                                                                className="w-full text-left px-4 py-3 text-[10px] font-black uppercase tracking-widest text-re-text hover:bg-re-bg transition-colors flex items-center gap-2.5"
                                                                                onClick={() => { setSelectedStudent(s); setOpenDropdownId(null); }}
                                                                            >
                                                                                <Eye size={13} className="text-re-text-muted" /> View Profile
                                                                            </button>
                                                                            <button
                                                                                className="w-full text-left px-4 py-3 text-[10px] font-black uppercase tracking-widest text-re-orange hover:bg-re-orange/5 transition-colors flex items-center gap-2.5 border-t border-black/5"
                                                                                onClick={() => {
                                                                                    setOpenDropdownId(null);
                                                                                    setShowIdentityModal(true);
                                                                                }}
                                                                            >
                                                                                <Edit3 size={13} /> Edit Identity / Photo
                                                                            </button>
                                                                        </div>
                                                                    </>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                        {filteredStudents.length === 0 && (
                                            <tr>
                                                <td colSpan="5" className="p-12 text-center text-[10px] font-black text-re-text-muted uppercase tracking-widest italic opacity-40">No students found matching your criteria.</td>
                                            </tr>
                                        )}
                                    </>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Table Footer: Continuous Search Stats */}
                    <div className={`${!isClassSelected ? 'hidden md:flex' : 'flex'} px-4 sm:px-8 py-5 bg-re-bg/20 border-t border-black/5 flex flex-row items-center justify-between gap-4`}>
                        <div className="flex items-center gap-3 sm:gap-4">
                            <div className="hidden xs:flex items-center gap-2">
                                <div className="w-1 h-1 sm:w-1.5 sm:h-1.5 bg-re-orange rounded-full animate-pulse"></div>
                                <p className="text-[6px] sm:text-[8px] font-black text-re-text-muted uppercase tracking-[0.2em] opacity-40 italic whitespace-nowrap">Registry Synchronized</p>
                            </div>
                            <div className="hidden xs:block w-px h-3 bg-black/10"></div>
                            <p className="text-[6px] sm:text-[8px] font-black text-re-text-muted uppercase tracking-[0.2em] opacity-40 italic whitespace-nowrap">Displaying {filteredStudents.length} Records</p>
                        </div>

                        <div className="flex items-center gap-1 sm:gap-1.5">
                            <button className="h-7 sm:h-8 px-2 sm:px-4 rounded-lg bg-white border border-black/5 text-[7px] sm:text-[9px] font-black text-re-text-muted tracking-tighter opacity-40 hover:opacity-100 transition-all font-mono italic">Prev_set</button>
                            <div className="h-7 sm:h-8 px-3 sm:px-4 rounded-lg flex items-center justify-center bg-white border border-black/5 text-[7px] sm:text-[9px] font-black text-re-text tracking-tighter">Page 01</div>
                            <button className="h-7 sm:h-8 px-3 sm:px-4 rounded-lg bg-re-grad-orange text-white text-[7px] sm:text-[9px] font-black shadow-re-glow tracking-tighter">Next_set</button>
                        </div>
                    </div>
                </div>

                {/* Brand/System Metadata */}
                <div className="flex flex-col md:flex-row items-center justify-between mt-8 px-4 gap-4">
                    <p className="text-[7px] text-re-text-muted font-black uppercase tracking-[0.3em] opacity-30 italic">Developed & Engineered by Babyeyi Intelligence Systems</p>
                    <div className="flex items-center gap-4 opacity-20">
                        <span className="text-[8px] font-black text-re-text uppercase tracking-widest">Phase 3</span>
                        <span className="text-[8px] font-black text-re-text uppercase tracking-widest">v1.2.0-Reloaded</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Students;
