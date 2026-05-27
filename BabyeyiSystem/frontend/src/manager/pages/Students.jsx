import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
    Users, Search, Plus, MoreVertical, GraduationCap,
    TrendingUp, Download, Mail, ChevronRight, TrendingDown,
    UserCheck, Award, Filter, Activity, UserPlus, X, User,
    Phone, Clock, Home, Tag, Edit3, Printer, Eye, CheckCircle, RefreshCw,
    FileText, FileSpreadsheet, Upload, ChevronDown, ChevronUp
} from 'lucide-react';
import api from '../services/api';
import ConductMarksModal from '../components/ConductMarksModal';
import StudentWizardModal from '../components/StudentWizardModal';
import studentService from '../services/studentService';
import schoolService from '../services/schoolService';
import { useAuth } from '../context/AuthContext';

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
                        <div className="w-12 h-12 rounded-2xl bg-re-bg border border-black/5 flex items-center justify-center text-re-text font-semibold text-lg shadow-inner relative overflow-hidden shrink-0">
                            {student.student_photo_url ? (
                                <img src={`${api.defaults.baseURL.replace('/api', '')}${student.student_photo_url}`} className="w-full h-full object-cover relative z-10" alt="Student" />
                            ) : (
                                <>
                                    <span className="relative z-10" style={{ color: "#1E3A5F" }}>{student.name.charAt(0)}</span>
                                    <div className="absolute inset-0 opacity-5" style={{ background: "#FEBF10" }}></div>
                                </>
                            )}
                        </div>
                        <div className="min-w-0">
                            <h3 className="font-semibold text-re-text text-base leading-tight uppercase tracking-tight truncate">{student.name}</h3>
                            <div className="flex flex-col gap-0.5 mt-0.5">
                                <p className="text-[9px] text-re-text-muted font-bold flex items-center gap-1 uppercase tracking-widest opacity-40 truncate">
                                    <span className="w-1 h-1 rounded-full shrink-0" style={{ background: "#FEBF10" }}></span>
                                    Institutional ID: {student.id}
                                </p>
                                {(student.rfid_uid || student.fingerprint_id) && (
                                    <p className="text-[8px] text-[#1E3A5F] font-semibold flex items-center gap-1 uppercase tracking-[0.2em] truncate">
                                        <Award size={8} />
                                        {student.rfid_uid ? 'RFID Active' : ''} {(student.rfid_uid && student.fingerprint_id) && '·'} {student.fingerprint_id ? 'Biometrics On' : ''}
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2.5 hover:bg-re-bg rounded-xl transition-all text-re-text-muted hover:text-[#1E3A5F] group"
                    >
                        <X size={18} className="group-hover:rotate-90 transition-transform duration-300" />
                    </button>
                </div>

                {/* Drawer Body (Scrollable) */}
                <div className="flex-1 overflow-y-auto px-8 py-8 space-y-8 custom-scrollbar">

                    {/* Status Alert (Premium Badge) */}
                    <div className={`flex items-center gap-3 px-4 py-3 rounded-2xl border ${student.status === 'Epic' ? 'bg-emerald-50 border-emerald-100/50' : 'bg-re-navy/5 border-re-navy/10'}`}>
                        <div className={`p-1.5 rounded-lg ${student.status === 'Epic' ? 'bg-emerald-500' : 'bg-[#1E3A5F]'} text-white`}>
                            <Award size={14} />
                        </div>
                        <div>
                            <p className="text-[10px] font-semibold text-re-text uppercase tracking-widest">{student.status} Performing Student</p>
                            <p className="text-[9px] text-re-text/40 font-bold uppercase tracking-tight leading-none mt-1">Academics: {student.grade} {student.academic_year ? `· ${student.academic_year}` : ''}</p>
                        </div>
                    </div>

                    {/* Academic Hero Section (Marks & Presence) */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-re-bg rounded-3xl p-5 border border-black/5 shadow-inner relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-16 h-16 bg-re-grad-purple opacity-5 rounded-full -mr-6 -mt-6 group-hover:scale-125 transition-transform duration-700" />
                            <p className="text-[8px] text-re-text-muted uppercase tracking-[0.2em] font-semibold mb-1 relative z-10 opacity-60">Avg Score</p>
                            <div className="flex items-baseline gap-1 relative z-10">
                                <span className="text-2xl font-semibold text-re-text tracking-tighter">{(student.gpa * 25).toFixed(0)}</span>
                                <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "#FEBF10" }}>%</span>
                            </div>
                        </div>
                        <div className="bg-re-bg rounded-3xl p-5 border border-black/5 shadow-inner relative overflow-hidden group text-right">
                            <div className="absolute top-0 left-0 w-16 h-16 opacity-5 rounded-full -ml-6 -mt-6 group-hover:scale-125 transition-transform duration-700" style={{ background: "#FEBF10" }} />
                            <p className="text-[8px] text-re-text-muted uppercase tracking-[0.2em] font-semibold mb-1 relative z-10 opacity-60">Term Presence</p>
                            <div className="flex items-baseline gap-1 justify-end relative z-10">
                                <span className="text-2xl font-semibold text-re-text tracking-tighter">{student.attendance}</span>
                                <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "#FEBF10" }}>%</span>
                            </div>
                        </div>
                    </div>

                    {/* Detailed Info Matrix (genzura styled) */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="text-[9px] font-semibold text-re-text-muted uppercase tracking-[0.3em] opacity-40">Profile Intelligence</span>
                            <div className="flex-1 h-px bg-black/5" />
                        </div>
                        {[
                            { label: 'Guardian', value: student.parent, icon: Users },
                            { label: 'Parent Phone', value: student.phone, icon: Phone },
                            { label: 'Email Context', value: student.email, icon: Mail },
                            { label: 'Enrollment', value: student.created_at ? new Date(student.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A', icon: Clock },
                            { label: 'House / Loc.', value: `${student.province}, ${student.district}`, icon: Home },
                            { label: 'Residency', value: student.residency_status || 'DAY', icon: Home },
                            { label: 'Institutional ID', value: student.id, icon: Tag },
                        ].map((item, i) => (
                            <div key={i} className="flex items-center justify-between group">
                                <div className="flex items-center gap-2">
                                    <item.icon size={11} className="opacity-30" style={{ color: "#FEBF10" }} />
                                    <span className="text-[10px] font-semibold text-re-text-muted uppercase tracking-widest">{item.label}</span>
                                </div>
                                <div className="flex-1 mx-3 border-b border-dashed border-black/10 group-hover:border-[#FEBF10]/30 transition-colors" />
                                <span className="text-[10px] font-semibold text-re-text uppercase tracking-tight">{item.value}</span>
                            </div>
                        ))}
                    </div>

                    {/* Behavioral Activity Log (Scholastic History) */}
                    <div>
                        <div className="flex items-center gap-2 mb-4">
                            <span className="text-[9px] font-semibold text-re-text-muted uppercase tracking-[0.3em] opacity-40">Scholastic Activity Log</span>
                            <div className="flex-1 h-px bg-black/5" />
                        </div>

                        <div className="space-y-3">
                            {[
                                { type: 'Academic', date: 'Yesterday', msg: 'Updated Mathematics term grade to 88%', icon: GraduationCap, color: 'text-re-purple', bg: 'bg-re-purple/5' },
                                { type: 'Behavioral', date: '3 days ago', msg: 'Added +2 Conduct Marks for voluntary assistance.', icon: Activity, color: 'text-emerald-500', bg: 'bg-emerald-50' },
                                { type: 'Presence', date: '1 week ago', msg: 'Recorded as Excused Absence for healthcare.', icon: UserCheck, color: 'text-re-navy', bg: 'bg-re-navy/5' }
                            ].map((log, i) => (
                                <div key={i} className="flex items-start gap-3 p-4 rounded-2xl bg-re-bg/50 border border-black/[0.02] group hover:bg-white hover:border-black/5 transition-all">
                                    <div className={`p-2 rounded-xl ${log.bg} ${log.color} shrink-0`}>
                                        <log.icon size={14} />
                                    </div>
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2 mb-0.5">
                                            <span className="text-[8px] font-semibold uppercase tracking-widest text-re-text">{log.type}</span>
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
                        className="h-12 w-full flex items-center justify-center gap-2 text-white rounded-2xl font-medium text-[10px] uppercase tracking-widest shadow-sm active:scale-95 transition-all"
                        style={{ background: "linear-gradient(135deg, #1E3A5F 0%, #0D2644 100%)" }}
                    >
                        <Activity size={15} /> <span className="tracking-tighter">+/-</span> Conduct Marks
                    </button>
                    <div className="grid grid-cols-2 gap-3">
                        <button className="h-12 flex items-center justify-center gap-2 bg-white border border-black/5 text-re-text font-medium text-[10px] uppercase tracking-widest rounded-2xl hover:bg-re-bg transition-all">
                            <Phone size={15} style={{ color: "#FEBF10" }} /> Contact Parent
                        </button>
                        <button className="h-12 flex items-center justify-center gap-2 bg-white border border-black/5 text-re-text font-medium text-[10px] uppercase tracking-widest rounded-2xl hover:bg-re-bg transition-all">
                            <Printer size={15} style={{ color: "#FEBF10" }} /> Report
                        </button>
                    </div>
                </div>
            </div>
        </>,
        document.body
    );
};

const Students = () => {
    const { manager } = useAuth();
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedClass, setSelectedClass] = useState('View All');
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [openDropdownId, setOpenDropdownId] = useState(null);
    const [showClassFilter, setShowClassFilter] = useState(false);
    const [selectedYear, setSelectedYear] = useState('All Years');
    const [showYearFilter, setShowYearFilter] = useState(false);
    const [selectedResidency, setSelectedResidency] = useState('All');
    const [showResidencyFilter, setShowResidencyFilter] = useState(false);
    const [showAllClassesModal, setShowAllClassesModal] = useState(false);
    const [editingStudent, setEditingStudent] = useState(null);
    const [isClassSelected, setIsClassSelected] = useState(window.innerWidth >= 768);
    const [showAddModal, setShowAddModal] = useState(false);

    // Conduct Modal State
    const [isConductModalOpen, setIsConductModalOpen] = useState(false);
    const [conductStudent, setConductStudent] = useState(null);
    const [activeDropdown, setActiveDropdown] = useState(null); // 'export' or 'actions'

    const openConductModal = (student = null) => {
        setConductStudent(student);
        setIsConductModalOpen(true);
    };

    const [students, setStudents] = useState([]);
    const [classes, setClasses] = useState([]);
    const [stats, setStats] = useState({
        totalEnrolled: '0',
        epicPercent: '0%',
        avgAttendance: '0%',
        diversityIndex: '0'
    });
    const [loading, setLoading] = useState(true);

    const fetchContent = React.useCallback(async () => {
        if (!manager?.school_id) return;
        setLoading(true);
        try {
            const studRes = await studentService.getStudents({
                q: searchTerm,
                class_name: selectedClass === 'View All' ? '' : selectedClass,
                academic_year: selectedYear === 'All Years' ? '' : selectedYear,
                residency_status: selectedResidency === 'All' ? '' : selectedResidency
            });

            if (studRes.success) {
                const mapped = (studRes.data || []).map(s => ({
                    ...s,
                    name: `${s.first_name || ''} ${s.last_name || ''}`.trim(),
                    id: s.student_uid || s.student_code || s.id,
                    grade: s.class_group_name
                        ? `${s.class_group_name} ${s.class_stream_name || ''} ${s.class_combination || ''}`.trim().toUpperCase()
                        : (s.class_name || 'N/A'),
                    stream: '', // Combined into grade above
                    status: 'Active',
                    attendance: 95,
                    gpa: 3.8,
                    parent: s.father_full_name || s.mother_full_name || 'N/A',
                    phone: s.father_phone || s.mother_phone || 'N/A',
                    email: s.father_email || 'N/A',
                    residency_status: s.residency_status || 'DAY'
                }));
                setStudents(mapped);

                setStats({
                    totalEnrolled: studRes.total?.toLocaleString() || '0',
                    epicPercent: '12%',
                    avgAttendance: '94%',
                    diversityIndex: '1.2'
                });
            }
            // ── Fetch Actual Classes ──
            const classRes = await schoolService.getGroups(manager.school_id);
            if (classRes.success && classRes.data?.length > 0) {
                const fullClassStrings = classRes.data.map(c =>
                    `${c.group_name} ${c.stream_name || ''} ${c.combination || ''}`.trim()
                );
                const uniqueGroups = [...new Set(fullClassStrings)];
                setClasses(uniqueGroups);
            } else {
                // Fallback to defaults if no classes defined
                setClasses(['S1', 'S2', 'S3', 'S4', 'S5', 'S6']);
            }
        } catch (e) {
            console.error("Failed to fetch students:", e);
        } finally {
            setLoading(false);
        }
    }, [manager, searchTerm, selectedClass, selectedYear, selectedResidency]);

    useEffect(() => {
        fetchContent();
    }, [fetchContent]);

    const filteredStudents = students;

    return (
        <div className="animate-in fade-in duration-700 bg-re-bg min-h-screen">
            <StudentWizardModal
                open={showAddModal}
                onClose={() => { setShowAddModal(false); setEditingStudent(null); }}
                editStudent={editingStudent}
                onSuccess={fetchContent}
                session={manager}
            />
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
                students={students}
            />

            {/* Mobile "More Classes" Modal */}
            {showAllClassesModal && createPortal(
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in" onClick={() => setShowAllClassesModal(false)} />
                    <div className="relative bg-white w-full max-w-sm rounded-[2rem] shadow-sm overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="px-6 py-5 border-b border-black/5 flex items-center justify-between">
                            <div>
                                <h3 className="text-sm font-semibold text-re-text uppercase tracking-widest">Select Class</h3>
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
                                    className={`h-12 flex items-center gap-2 px-4 rounded-xl border text-[10px] font-semibold uppercase tracking-widest transition-all ${selectedClass === cls
                                        ? 'bg-re-navy/10 border-re-navy/30 text-re-navy ring-1 ring-re-navy/30'
                                        : 'bg-white border-black/5 text-re-text-muted hover:border-black/10'
                                        }`}
                                >
                                    {selectedClass === cls && <CheckCircle size={14} className="text-re-navy" />}
                                    {cls}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>, document.body
            )}

            {/* ── High-Fidelity Hero Section (Institutional Pattern) ── */}
            <div className="relative w-full min-h-[280px] overflow-hidden bg-[#c87800]">
                <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full border border-white/5 pointer-events-none" />
                <div className="absolute -top-12 -right-12 w-64 h-64 rounded-full border border-white/5 pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-[#FEBF10]/30 to-transparent pointer-events-none" />

                <div className="relative z-20 max-w-[1600px] mx-auto px-6 md:px-12 pt-16 pb-24">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="w-6 h-1 rounded-full" style={{ background: "#FEBF10" }}></span>
                            <p className="text-[10px] font-semibold uppercase tracking-[0.3em]" style={{ color: "#FEBF10" }}>Institutional Repository</p>
                        </div>
                        <h1 className="text-2xl md:text-3xl font-semibold text-white tracking-tight leading-none mb-2 mt-2 uppercase" style={{ fontFamily: "'Montserrat', sans-serif" }}>Students List</h1>
                        <p className="text-[10px] font-medium text-white/60 max-w-lg leading-relaxed uppercase tracking-widest" style={{ fontFamily: "'Montserrat', sans-serif" }}>Professional Academic & Behavioral Analytics View</p>
                    </div>
                </div>
            </div>

            {/* ── Consolidated High-Fidelity Card (Dashboard Stats Style) ── */}
            <div className="max-w-[1600px] mx-auto px-6 md:px-12 -mt-4 sm:-mt-5 md:-mt-6 pt-2 relative z-20 pb-20">
                <div className="bg-white rounded-t-[32px] shadow-sm border border-black/10 overflow-hidden flex flex-col">

                    {/* Top Layer: Stats Grid + Actions (Dashboard Style) */}
                    <div className={`${!isClassSelected ? 'hidden md:grid' : 'grid'} grid-cols-1 lg:grid-cols-4 border-b border-black/5`}>
                        {/* Stats (3 columns on lg) */}
                        <div className="lg:col-span-3 grid grid-cols-2 md:grid-cols-4 divide-x divide-y md:divide-y-0 divide-black/5">
                            {[
                                { label: 'Total Enrolled', value: stats.totalEnrolled, icon: <Users size={14} className="mb-2" /> },
                                { label: 'Epic Status', value: stats.epicPercent, icon: <Award size={14} className="mb-2" /> },
                                { label: 'Attendance Avg', value: stats.avgAttendance, icon: <Activity size={14} className="mb-2" /> },
                                { label: 'Diversity Index', value: stats.diversityIndex, icon: <TrendingUp size={14} className="mb-2" /> }
                            ].map((stat, i) => (
                                <div key={i} className="p-4 sm:p-8 flex flex-col items-center justify-center text-center group hover:bg-re-bg/20 transition-all cursor-default">
                                    <div className="mb-1.5 sm:mb-2 opacity-40 shrink-0" style={{ color: "#FEBF10" }}>
                                        {stat.icon}
                                    </div>
                                    <span className="text-sm sm:text-2xl font-semibold text-re-text tracking-tighter group-hover:text-[#1E3A5F] transition-colors">
                                        {stat.value}
                                    </span>
                                    <p className="text-[6px] sm:text-[8px] font-semibold text-re-text-muted uppercase tracking-[0.2em] mt-0.5 sm:mt-1 opacity-60">
                                        {stat.label}
                                    </p>
                                </div>
                            ))}
                        </div>

                        {/* Right Side Actions Section (Desktop) */}
                        <div className="hidden lg:flex flex-col border-l border-black/5 bg-re-bg/30 p-6 justify-center gap-3 relative">
                            {/* Export Dropdown */}
                            <div className="relative">
                                <button
                                    onClick={() => setActiveDropdown(activeDropdown === 'export' ? null : 'export')}
                                    className="w-full h-11 flex items-center justify-center gap-2 text-white rounded-xl font-medium text-[9px] uppercase tracking-widest shadow-sm active:scale-95 transition-all"
                                    style={{ background: "linear-gradient(135deg, #1E3A5F 0%, #0D2644 100%)" }}
                                >
                                    <Download size={14} />
                                    <span>Export</span>
                                    <ChevronDown size={12} className={`transition-transform duration-300 ${activeDropdown === 'export' ? 'rotate-180' : ''}`} />
                                </button>

                                {activeDropdown === 'export' && (
                                    <>
                                        <div className="fixed inset-0 z-[40]" onClick={() => setActiveDropdown(null)} />
                                        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-black/10 shadow-md rounded-2xl overflow-hidden py-1 z-[50] animate-in slide-in-from-top-2 duration-200">
                                            <button className="w-full text-left px-4 py-3 text-[10px] font-semibold uppercase tracking-widest text-re-text hover:bg-re-bg transition-colors flex items-center gap-2.5">
                                                <FileText size={14} style={{ color: "#FEBF10" }} /> Export into PDF file
                                            </button>
                                            <button className="w-full text-left px-4 py-3 text-[10px] font-semibold uppercase tracking-widest text-re-text hover:bg-re-bg transition-colors flex items-center gap-2.5 border-t border-black/5">
                                                <FileSpreadsheet size={14} style={{ color: "#FEBF10" }} /> Export into Excel
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>

                            {/* Quick Actions Dropdown */}
                            <div className="relative">
                                <button
                                    onClick={() => setActiveDropdown(activeDropdown === 'actions' ? null : 'actions')}
                                    className="w-full h-11 flex items-center justify-center gap-2 bg-white border border-black/5 text-re-text font-medium text-[9px] uppercase tracking-widest rounded-xl hover:bg-re-bg hover:shadow-re-soft transition-all"
                                >
                                    <Activity size={14} style={{ color: "#FEBF10" }} />
                                    <span>Quick Actions</span>
                                    <ChevronDown size={12} className={`transition-transform duration-300 ${activeDropdown === 'actions' ? 'rotate-180' : ''}`} />
                                </button>

                                {activeDropdown === 'actions' && (
                                    <>
                                        <div className="fixed inset-0 z-[40]" onClick={() => setActiveDropdown(null)} />
                                        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-black/10 shadow-md rounded-2xl overflow-hidden py-1 z-[50] animate-in slide-in-from-top-2 duration-200">
                                            <button
                                                onClick={() => { setEditingStudent(null); setShowAddModal(true); setActiveDropdown(null); }}
                                                className="w-full text-left px-4 py-3 text-[10px] font-semibold uppercase tracking-widest text-[#1E3A5F] hover:bg-re-navy/5 transition-colors flex items-center gap-2.5"
                                            >
                                                <UserPlus size={14} /> Register New Student
                                            </button>
                                            <button className="w-full text-left px-4 py-3 text-[10px] font-semibold uppercase tracking-widest text-re-text hover:bg-re-bg transition-colors flex items-center gap-2.5 border-t border-black/5">
                                                <Upload size={14} style={{ color: "#FEBF10" }} /> Import Excel
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Middle Layer: Management Control (Integrated Search & Filter) */}
                    <div className={`${!isClassSelected ? 'hidden md:flex' : 'flex'} p-6 md:px-8 border-b border-black/5 flex-col md:flex-row items-center gap-4 bg-white/50`}>
                        <div className="relative flex-1 w-full group">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-re-text-muted/40 group-focus-within:text-[#1E3A5F] transition-colors" size={16} />
                            <input
                                type="text"
                                placeholder="Search records..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full h-10 sm:h-11 bg-re-bg rounded-xl pl-11 pr-4 font-extrabold outline-none border border-transparent focus:border-[#1E3A5F]/20 focus:bg-white transition-all text-re-text text-sm sm:text-xs tracking-tight shadow-inner"
                            />
                        </div>
                        <div className="flex items-center gap-2 w-full md:w-auto">
                            <button
                                onClick={() => setShowClassFilter(!showClassFilter)}
                                className="h-10 sm:h-11 px-3 sm:px-5 bg-white border border-black/5 rounded-xl flex items-center gap-1.5 sm:gap-2 text-re-text-muted font-semibold text-[8px] sm:text-[9px] uppercase tracking-widest hover:bg-re-bg transition-all shadow-sm whitespace-nowrap"
                            >
                                Filter By Class
                            </button>

                            <div className="relative">
                                <button
                                    onClick={() => setShowYearFilter(!showYearFilter)}
                                    className="h-10 sm:h-11 px-3 sm:px-5 bg-white border border-black/5 rounded-xl flex items-center gap-1.5 sm:gap-2 text-re-text-muted font-semibold text-[8px] sm:text-[9px] uppercase tracking-widest hover:bg-re-bg transition-all shadow-sm whitespace-nowrap"
                                >
                                    <Clock size={14} style={{ color: "#FEBF10" }} />
                                    {selectedYear === 'All Years' ? 'Filter By Year' : `Year: ${selectedYear}`}
                                </button>

                                {showYearFilter && (
                                    <>
                                        <div className="fixed inset-0 z-[40]" onClick={() => setShowYearFilter(false)} />
                                        <div className="absolute top-full right-0 mt-2 w-48 bg-white border border-black/10 shadow-md rounded-2xl overflow-hidden py-1 z-[50] animate-in slide-in-from-top-2 duration-200">
                                            {['All Years', '2023', '2023-2024', '2024', '2024-2025', '2025', '2025-2026', '2026', '2026-2027', '2027'].map(year => (
                                                <button
                                                    key={year}
                                                    onClick={() => { setSelectedYear(year); setShowYearFilter(false); fetchContent(); }}
                                                    className={`w-full text-left px-4 py-3 text-[10px] font-semibold uppercase tracking-widest transition-colors ${selectedYear === year ? 'bg-re-navy text-white' : 'text-re-text hover:bg-re-bg'}`}
                                                >
                                                    {year}
                                                </button>
                                            ))}
                                        </div>
                                    </>
                                )}
                            </div>

                            <div className="relative">
                                <button
                                    onClick={() => setShowResidencyFilter(!showResidencyFilter)}
                                    className="h-10 sm:h-11 px-3 sm:px-5 bg-white border border-black/5 rounded-xl flex items-center gap-1.5 sm:gap-2 text-re-text-muted font-semibold text-[8px] sm:text-[9px] uppercase tracking-widest hover:bg-re-bg transition-all shadow-sm whitespace-nowrap"
                                >
                                    <Home size={14} style={{ color: "#FEBF10" }} />
                                    {selectedResidency === 'All' ? 'Residency' : `Type: ${selectedResidency}`}
                                </button>

                                {showResidencyFilter && (
                                    <>
                                        <div className="fixed inset-0 z-[40]" onClick={() => setShowResidencyFilter(false)} />
                                        <div className="absolute top-full right-0 mt-2 w-48 bg-white border border-black/10 shadow-md rounded-2xl overflow-hidden py-1 z-[50] animate-in slide-in-from-top-2 duration-200">
                                            {['All', 'DAY', 'BOARDING'].map(res => (
                                                <button
                                                    key={res}
                                                    onClick={() => { setSelectedResidency(res); setShowResidencyFilter(false); fetchContent(); }}
                                                    className={`w-full text-left px-4 py-3 text-[10px] font-semibold uppercase tracking-widest transition-colors ${selectedResidency === res ? 'bg-re-navy text-white' : 'text-re-text hover:bg-re-bg'}`}
                                                >
                                                    {res === 'All' ? 'All Residents' : res}
                                                </button>
                                            ))}
                                        </div>
                                    </>
                                )}
                            </div>
                            <div className="w-px h-6 bg-black/5 hidden md:block"></div>
                            <button
                                onClick={() => openConductModal(null)}
                                className="h-10 sm:h-11 flex-1 md:flex-none px-3 sm:px-6 bg-re-bg border border-black/5 rounded-xl text-re-text font-semibold text-[8px] sm:text-[9px] uppercase tracking-widest hover:bg-white hover:border-[#1E3A5F]/20 transition-all shadow-sm group flex items-center gap-1.5 sm:gap-2 whitespace-nowrap"
                            >
                                <Activity size={14} className="opacity-60 group-hover:opacity-100 transition-opacity" style={{ color: "#1E3A5F" }} />
                                <span className="tracking-tighter">+/-</span> <span className="group-hover:text-[#1E3A5F]">Conduct Marks</span>
                            </button>
                        </div>
                    </div>

                    {/* Conditional Class Filter Section */}
                    {showClassFilter && (
                        <div className={`${!isClassSelected ? 'hidden md:flex' : 'flex'} px-6 md:px-8 py-4 bg-re-bg/20 border-b border-black/5 items-center overflow-x-auto gap-2 custom-scrollbar animate-in slide-in-from-top-2 fade-in duration-300`}>

                            {/* All Classes Option */}
                            <button
                                onClick={() => setSelectedClass('View All')}
                                className={`flex items-center justify-center gap-1.5 shrink-0 h-7 sm:h-9 px-3 sm:px-5 rounded-lg sm:rounded-xl border font-medium text-[7px] sm:text-[9px] uppercase tracking-widest transition-all whitespace-nowrap ${selectedClass === 'View All'
                                    ? 'text-white shadow-sm'
                                    : 'bg-white border-black/5 text-re-text-muted hover:bg-re-bg hover:text-re-text'
                                    }`}
                                style={selectedClass === 'View All' ? { background: "#1E3A5F", borderColor: "#1E3A5F" } : {}}
                            >
                                {selectedClass === 'View All' && <CheckCircle size={10} className="sm:w-3 sm:h-3 opacity-80" />}
                                All Classes
                            </button>

                            {/* Individual Classes */}
                            {classes.map((cls, idx) => (
                                <button
                                    key={cls}
                                    onClick={() => setSelectedClass(cls)}
                                    className={`flex items-center justify-center gap-1.5 shrink-0 h-7 sm:h-9 px-3 sm:px-5 rounded-lg sm:rounded-xl border font-medium text-[7px] sm:text-[9px] uppercase tracking-widest transition-all whitespace-nowrap ${idx > 1 ? 'hidden md:flex' : ''} ${selectedClass === cls
                                        ? 'text-white shadow-sm'
                                        : 'bg-white border-black/5 text-re-text-muted hover:bg-re-bg hover:text-re-text'
                                        }`}
                                    style={selectedClass === cls ? { background: "#1E3A5F", borderColor: "#1E3A5F" } : {}}
                                >
                                    {selectedClass === cls && <CheckCircle size={10} className="sm:w-3 sm:h-3 opacity-80" />}
                                    {cls}
                                </button>
                            ))}

                            {/* More Trigger for Mobile */}
                            <button
                                onClick={() => setShowAllClassesModal(true)}
                                className="md:hidden flex items-center justify-center gap-1.5 shrink-0 h-7 px-3 rounded-lg border border-black/5 bg-white font-semibold text-[7px] uppercase tracking-widest transition-all shadow-sm active:scale-95"
                                style={{ color: "#FEBF10" }}
                            >
                                <Plus size={10} /> More
                            </button>
                        </div>
                    )}

                    {/* Bottom Layer: Selection Gatekeeper or Scholastic Repository */}
                    {!isClassSelected && (
                        <div className="md:hidden p-4 sm:p-6 bg-re-bg/20 flex flex-col items-center justify-center text-center py-8 sm:py-12 animate-in fade-in zoom-in-95 duration-500">
                            <div className="w-12 h-12 sm:w-16 sm:h-16 bg-white rounded-2xl sm:rounded-[2rem] shadow-sm flex items-center justify-center mb-4 sm:mb-6 border border-black/5 animate-bounce" style={{ color: "#FEBF10" }}>
                                <GraduationCap size={24} className="sm:w-8 sm:h-8" />
                            </div>
                            <h2 className="text-lg sm:text-xl font-semibold text-re-text tracking-tighter uppercase mb-1 sm:mb-2">Select a Class</h2>
                            <p className="text-[8px] sm:text-[10px] text-re-text-muted font-bold uppercase tracking-widest leading-relaxed mb-6 sm:mb-8 max-w-[200px] sm:max-w-[240px]">Select a specific academic registry to view analytics.</p>

                            <div className="grid grid-cols-2 gap-2 sm:gap-3 w-full max-w-sm">
                                {classes.map(cls => (
                                    <button
                                        key={cls}
                                        onClick={() => {
                                            setSelectedClass(cls);
                                            setIsClassSelected(true);
                                        }}
                                        className="h-14 sm:h-16 flex  items-center justify-center gap-2.5 sm:gap-2 bg-white border border-black/5 rounded-xl sm:rounded-2xl shadow-sm transition-all group active:scale-95"
                                    >
                                        <div className="flex flex-col items-center gap-0.5">
                                            <span className="text-[9px] sm:text-[10px] font-semibold text-re-text group-hover:text-[#1E3A5F] uppercase">{cls}</span>
                                            <span className="text-[6px] sm:text-[7px] font-bold text-re-text-muted uppercase tracking-widest opacity-40 italic">View Registry</span>
                                        </div>
                                        <ChevronRight size={14} className="text-re-text-muted" />

                                    </button>
                                ))}
                                <button
                                    onClick={() => {
                                        setSelectedClass('View All');
                                        setIsClassSelected(true);
                                    }}
                                    className="col-span-2 h-12 sm:h-14 text-white rounded-xl sm:rounded-2xl font-semibold text-[8px] sm:text-[9px] uppercase tracking-widest shadow-sm active:scale-95 transition-all mt-1 sm:mt-2"
                                    style={{ background: "linear-gradient(135deg, #1E3A5F 0%, #0D2644 100%)" }}
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
                                    <div className="w-1.5 h-1.5 rounded-full" style={{ background: "#FEBF10" }}></div>
                                    <span className="text-[9px] font-semibold text-re-text uppercase tracking-widest">{selectedClass} Registry</span>
                                </div>
                                <button
                                    onClick={() => setIsClassSelected(false)}
                                    className="text-[8px] font-semibold uppercase tracking-widest hover:underline"
                                    style={{ color: "#FEBF10" }}
                                >
                                    Change Class
                                </button>
                            </div>
                        )}
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-re-bg/20 border-b border-black/5">
                                    <th className="px-4 sm:px-8 py-3 sm:py-4 text-[7px] sm:text-[8px] font-semibold text-re-text-muted uppercase tracking-[0.2em] opacity-40 border-r border-black/5 last:border-r-0">Student Info</th>
                                    <th className="hidden md:table-cell px-8 py-4 text-[8px] font-semibold text-re-text-muted uppercase tracking-[0.2em] opacity-40 border-r border-black/5">Academics</th>
                                    <th className="hidden md:table-cell px-8 py-4 text-[8px] font-semibold text-re-text-muted uppercase tracking-[0.2em] opacity-40 border-r border-black/5">Presence</th>
                                    <th className="hidden md:table-cell px-8 py-4 text-[8px] font-semibold text-re-text-muted uppercase tracking-[0.2em] opacity-40 border-r border-black/5">Status</th>
                                    <th className="px-4 sm:px-8 py-3 sm:py-4 text-[7px] sm:text-[8px] font-semibold text-re-text-muted uppercase tracking-[0.2em] opacity-40 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-black/5">
                                {loading ? (
                                    <tr>
                                        <td colSpan="5" className="p-12 text-center">
                                            <div className="w-8 h-8 border-4 border-re-navy border-t-transparent rounded-full animate-spin mx-auto mb-4" style={{ borderColor: "#1E3A5F #0000 0000 0000" }}></div>
                                            <p className="text-[10px] font-semibold text-re-text-muted uppercase tracking-widest">Accessing Central Registry...</p>
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
                                                            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-re-bg border border-black/5 flex-shrink-0 flex items-center justify-center text-re-text-muted transition-colors relative shadow-inner overflow-hidden group-hover:bg-white">
                                                                {s.student_photo_url ? (
                                                                    <img src={`${api.defaults.baseURL.replace('/api', '')}${s.student_photo_url}`} className="w-full h-full object-cover" alt="Student" />
                                                                ) : (
                                                                    <User size={12} className="sm:w-3.5 sm:h-3.5 opacity-40 text-re-text-muted" />
                                                                )}
                                                                <div className="absolute -bottom-1 -right-1 w-2.5 h-2.5 sm:w-3 h-3 bg-white border border-black/5 rounded-full flex items-center justify-center">
                                                                    <div className="w-1 h-1 sm:w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
                                                                </div>
                                                            </div>
                                                            <div>
                                                                <p className="text-xs sm:text-sm font-semibold text-re-text tracking-tight uppercase leading-none mb-1 group-hover:text-[#1E3A5F] transition-colors">{s.name}</p>
                                                                <div className="flex items-center gap-2">
                                                                    <p className="text-[7px] sm:text-[9px] font-bold text-re-text-muted opacity-30 uppercase tracking-widest leading-none font-mono italic">{s.id}</p>
                                                                    <span className={`text-[6px] px-1 rounded-sm font-semibold uppercase tracking-tighter ${s.residency_status === 'BOARDING' ? 'bg-[#FEBF10]/20 text-[#1E3A5F]' : 'bg-black/5 text-re-text-muted opacity-40'}`}>
                                                                        {s.residency_status || 'DAY'}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="hidden md:table-cell px-8 py-5">
                                                        <div className="flex flex-col gap-0.5">
                                                            <p className="text-[10px] font-semibold text-re-text uppercase tracking-tight leading-none mb-1">{s.grade}</p>
                                                            <div className="flex items-center gap-1.5">
                                                                <span className="text-[8px] font-semibold text-[#FEBF10] uppercase tracking-[0.2em]">{s.academic_year || 'YEAR NOT SET'}</span>
                                                                <div className="w-1 h-3 bg-black/10 rounded-full shrink-0"></div>
                                                                <p className="text-[9px] font-bold text-re-text-muted opacity-30 uppercase tracking-widest leading-none">GPA {s.gpa}</p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="hidden md:table-cell px-8 py-5">
                                                        <div className="space-y-1.5 max-w-[100px]">
                                                            <div className="flex items-center justify-between">
                                                                <p className="text-[9px] font-semibold text-re-text">{s.attendance}%</p>
                                                            </div>
                                                            <div className="w-full h-1 bg-black/5 rounded-full overflow-hidden">
                                                                <div className="h-full" style={{ width: `${s.attendance}%`, background: s.attendance > 90 ? "linear-gradient(135deg, #1E3A5F 0%, #3D5A80 100%)" : "#FEBF10" }}></div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="hidden md:table-cell px-8 py-5">
                                                        <div className={`inline-flex px-3 py-1.5 rounded-lg text-[8px] font-semibold uppercase tracking-widest ring-1 ring-inset ${s.status === 'Epic' ? 'bg-emerald-50 text-emerald-600 ring-emerald-500/20' :
                                                            s.status === 'Advanced' ? 'bg-blue-50 text-blue-600 ring-blue-500/20' :
                                                                'bg-re-navy/5 text-re-navy ring-re-navy/20'
                                                            }`} style={s.status !== 'Epic' && s.status !== 'Advanced' ? { color: "#1E3A5F" } : {}}>
                                                            {s.status}
                                                        </div>
                                                    </td>
                                                    <td className="px-4 sm:px-8 py-3 sm:py-5 text-right relative">
                                                        <div className="flex items-center gap-2 sm:gap-3 justify-end">
                                                            <button
                                                                className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center text-re-text-muted hover:bg-re-bg transition-all border border-transparent hover:border-black/5"
                                                                style={{ color: "inherit" }}
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
                                                                    className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center text-re-text-muted hover:bg-re-bg transition-all border border-transparent hover:border-black/5"
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
                                                                            className={`absolute right-0 ${isLastItems ? 'bottom-full mb-2 origin-bottom-right' : 'top-full mt-2 origin-top-right'} w-48 bg-white border border-black/10 shadow-md rounded-2xl z-[50] overflow-hidden py-1 animate-in fade-in zoom-in-95 duration-150`}
                                                                            onClick={(e) => e.stopPropagation()}
                                                                        >
                                                                            <button
                                                                                className="w-full text-left px-4 py-3 text-[10px] font-semibold uppercase tracking-widest text-re-text hover:bg-re-bg transition-colors flex items-center gap-2.5"
                                                                                onClick={() => { setSelectedStudent(s); setOpenDropdownId(null); }}
                                                                            >
                                                                                <Eye size={13} className="text-re-text-muted" /> View Profile
                                                                            </button>
                                                                            <button
                                                                                className="w-full text-left px-4 py-3 text-[10px] font-semibold uppercase tracking-widest text-[#1E3A5F] hover:bg-re-navy/5 transition-colors flex items-center gap-2.5"
                                                                                onClick={() => { setEditingStudent(s); setShowAddModal(true); setOpenDropdownId(null); }}
                                                                            >
                                                                                <Edit3 size={13} /> Edit Identity
                                                                            </button>
                                                                            <button
                                                                                className="w-full text-left px-4 py-3 text-[10px] font-semibold uppercase tracking-widest hover:bg-re-navy/5 transition-colors flex items-center gap-2.5 border-t border-black/5"
                                                                                style={{ color: "#1E3A5F" }}
                                                                                onClick={() => { setOpenDropdownId(null); openConductModal(s); }}
                                                                            >
                                                                                <Activity size={13} /> <span className="tracking-tighter">+/-</span> Conduct Marks
                                                                            </button>
                                                                            <button
                                                                                className="w-full text-left px-4 py-3 text-[10px] font-semibold uppercase tracking-widest text-re-text hover:bg-re-bg transition-colors flex items-center gap-2.5"
                                                                                onClick={() => setOpenDropdownId(null)}
                                                                            >
                                                                                <Phone size={13} className="text-re-text-muted" /> Contact Parent
                                                                            </button>
                                                                            <button
                                                                                className="w-full text-left px-4 py-3 text-[10px] font-semibold uppercase tracking-widest text-re-text hover:bg-re-bg transition-colors flex items-center gap-2.5 border-t border-black/5"
                                                                                onClick={() => setOpenDropdownId(null)}
                                                                            >
                                                                                <Printer size={13} className="text-re-text-muted" /> Export Report
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
                                                <td colSpan="5" className="p-12 text-center text-[10px] font-semibold text-re-text-muted uppercase tracking-widest italic opacity-40">No students found matching your criteria.</td>
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
                                <div className="w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full animate-pulse" style={{ background: "#FEBF10" }}></div>
                                <p className="text-[6px] sm:text-[8px] font-semibold text-re-text-muted uppercase tracking-[0.2em] opacity-40 italic whitespace-nowrap">Registry Synchronized</p>
                            </div>
                            <div className="hidden xs:block w-px h-3 bg-black/10"></div>
                            <p className="text-[6px] sm:text-[8px] font-semibold text-re-text-muted uppercase tracking-[0.2em] opacity-40 italic whitespace-nowrap">Displaying {filteredStudents.length} Records</p>
                        </div>

                        <div className="flex items-center gap-1 sm:gap-1.5">
                            <button className="h-7 sm:h-8 px-2 sm:px-4 rounded-lg bg-white border border-black/5 text-[7px] sm:text-[9px] font-semibold text-re-text-muted tracking-tighter opacity-40 hover:opacity-100 transition-all font-mono italic">Prev_set</button>
                            <div className="h-7 sm:h-8 px-3 sm:px-4 rounded-lg flex items-center justify-center bg-white border border-black/5 text-[7px] sm:text-[9px] font-semibold text-re-text tracking-tighter">Page 01</div>
                            <button
                                className="h-7 sm:h-8 px-3 sm:px-4 rounded-lg text-white text-[7px] sm:text-[9px] font-semibold shadow-sm tracking-tighter"
                                style={{ background: "linear-gradient(135deg, #1E3A5F 0%, #0D2644 100%)" }}
                            >
                                Next_set
                            </button>
                        </div>
                    </div>
                </div>

                {/* Brand/System Metadata */}
                <div className="flex flex-col md:flex-row items-center justify-between mt-8 px-4 gap-4">
                    <p className="text-[7px] text-re-text-muted font-semibold uppercase tracking-[0.3em] opacity-30 italic">Developed & Engineered by Babyeyi Intelligence Systems</p>
                    <div className="flex items-center gap-4 opacity-20">
                        <span className="text-[8px] font-semibold text-re-text uppercase tracking-widest">Phase 3</span>
                        <span className="text-[8px] font-semibold text-re-text uppercase tracking-widest">v1.2.0-Reloaded</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Students;
