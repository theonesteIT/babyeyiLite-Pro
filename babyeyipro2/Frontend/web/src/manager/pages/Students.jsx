import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
    Users, Search, Plus, MoreVertical, GraduationCap,
    TrendingUp, Mail, UserCheck, Award, Filter, Activity, X, User,
    Phone, Clock, Home, Edit3, Printer, Eye, CheckCircle, Tag,
    FileText, FileSpreadsheet, Pencil
} from 'lucide-react';
import {
    RegistryPageShell,
    RegistryPageHeader,
    RegistryStatGrid,
    RegistryCard,
    ExportSplitButton,
} from '../components/RegistryPageChrome';
import api from '../services/api';
import ConductMarksModal from '../components/ConductMarksModal';
import StudentWizardModal from '../components/StudentWizardModal';
import studentService from '../services/studentService';
import schoolService from '../services/schoolService';
import { useAuth } from '../context/AuthContext';

// ── Student Detail Modal (Drawer: view + jump to full edit like School Admin) ─
const StudentModal = ({ student, onClose, onEditProfile }) => {
    if (!student) return null;

    const pick = (...vals) => {
        for (const v of vals) {
            if (v !== undefined && v !== null && String(v).trim() !== '') return v;
        }
        return null;
    };

    const detailPairs = [
        { label: 'Admission / UID', value: pick(student.student_code, student.student_uid, student.id) },
        { label: 'Gender', value: pick(student.gender) },
        { label: 'Date of birth', value: pick(student.date_of_birth) && String(student.date_of_birth).slice(0, 10) },
        { label: 'Class', value: pick(student.class_name, student.grade) },
        { label: 'Academic year', value: pick(student.academic_year) },
        { label: 'Residency', value: pick(student.residency_status) },
        { label: 'Father', value: pick(student.father_full_name) },
        { label: 'Mother', value: pick(student.mother_full_name) },
        { label: 'RFID UID', value: pick(student.rfid_uid) },
        { label: 'Fingerprint ID', value: pick(student.fingerprint_id) },
    ].filter((row) => row.value);

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
                <div className="flex items-center justify-between gap-3 px-5 sm:px-8 py-5 sm:py-6 border-b border-slate-100 bg-white shrink-0">
                    <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                        <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center text-re-text font-black text-base shadow-inner relative overflow-hidden shrink-0">
                            {student.student_photo_url ? (
                                <img src={`${api.defaults.baseURL.replace('/api', '')}${student.student_photo_url}`} className="w-full h-full object-cover relative z-10" alt="Student" />
                            ) : (
                                <>
                                    <span className="relative z-10 text-[#1E3A5F]">{student.name.charAt(0)}</span>
                                    <div className="absolute inset-0 opacity-5 bg-re-gold" />
                                </>
                            )}
                        </div>
                        <div className="min-w-0">
                            <h3 className="font-bold text-slate-900 text-base leading-tight tracking-tight truncate">{student.name}</h3>
                            <p className="text-[11px] text-slate-500 font-medium mt-0.5 truncate font-mono">
                                {pick(student.student_code, student.student_uid, student.id)}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                        {typeof onEditProfile === 'function' && (
                            <button
                                type="button"
                                onClick={() => onEditProfile(student)}
                                className="inline-flex items-center gap-1.5 rounded-xl bg-re-gold px-3 py-2 text-[12px] font-bold text-[#0b1530] shadow-sm hover:bg-re-gold-light transition-all"
                            >
                                <Pencil size={14} />
                                <span className="hidden xs:inline">Edit</span>
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={onClose}
                            className="p-2.5 hover:bg-slate-100 rounded-xl transition-all text-slate-500 hover:text-slate-800"
                            aria-label="Close"
                        >
                            <X size={18} />
                        </button>
                    </div>
                </div>

                {/* Drawer Body (Scrollable) */}
                <div className="flex-1 overflow-y-auto px-5 sm:px-8 py-6 sm:py-8 space-y-6 custom-scrollbar">

                    {detailPairs.length > 0 && (
                        <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-3">Student record</p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {detailPairs.map((row) => (
                                    <div key={row.label} className="rounded-xl border border-slate-100 bg-white px-3 py-2">
                                        <p className="text-[9px] uppercase tracking-wider font-semibold text-slate-400">{row.label}</p>
                                        <p className="text-[13px] font-semibold text-slate-800 break-words">{String(row.value)}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Status Alert (Premium Badge) */}
                    <div className={`flex items-center gap-3 px-4 py-3 rounded-2xl border ${student.status === 'Epic' ? 'bg-emerald-50 border-emerald-100/50' : 'bg-[#1E3A5F]/5 border-[#1E3A5F]/10'}`}>
                        <div className={`p-1.5 rounded-lg ${student.status === 'Epic' ? 'bg-emerald-500' : 'bg-[#1E3A5F]'} text-white`}>
                            <Award size={14} />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-re-text uppercase tracking-widest">{student.status} Performing Student</p>
                            <p className="text-[9px] text-re-text/40 font-bold uppercase tracking-tight leading-none mt-1">Academics: {student.grade} {student.academic_year ? `· ${student.academic_year}` : ''}</p>
                        </div>
                    </div>

                    {/* Academic Hero Section (Marks & Presence) */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-re-bg rounded-3xl p-5 border border-black/5 shadow-inner relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-16 h-16 bg-re-grad-purple opacity-5 rounded-full -mr-6 -mt-6 group-hover:scale-125 transition-transform duration-700" />
                            <p className="text-[8px] text-re-text-muted uppercase tracking-[0.2em] font-black mb-1 relative z-10 opacity-60">Avg Score</p>
                            <div className="flex items-baseline gap-1 relative z-10">
                                <span className="text-2xl font-black text-re-text tracking-tighter">{(student.gpa * 25).toFixed(0)}</span>
                                <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: "#FEBF10" }}>%</span>
                            </div>
                        </div>
                        <div className="bg-re-bg rounded-3xl p-5 border border-black/5 shadow-inner relative overflow-hidden group text-right">
                            <div className="absolute top-0 left-0 w-16 h-16 opacity-5 rounded-full -ml-6 -mt-6 group-hover:scale-125 transition-transform duration-700" style={{ background: "#FEBF10" }} />
                            <p className="text-[8px] text-re-text-muted uppercase tracking-[0.2em] font-black mb-1 relative z-10 opacity-60">Term Presence</p>
                            <div className="flex items-baseline gap-1 justify-end relative z-10">
                                <span className="text-2xl font-black text-re-text tracking-tighter">{student.attendance}</span>
                                <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: "#FEBF10" }}>%</span>
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
                            { label: 'Residency', value: student.residency_status || 'DAY', icon: Home },
                            { label: 'Institutional ID', value: student.id, icon: Tag },
                        ].map((item, i) => (
                            <div key={i} className="flex items-center justify-between group">
                                <div className="flex items-center gap-2">
                                    <item.icon size={11} className="opacity-30" style={{ color: "#FEBF10" }} />
                                    <span className="text-[10px] font-black text-re-text-muted uppercase tracking-widest">{item.label}</span>
                                </div>
                                <div className="flex-1 mx-3 border-b border-dashed border-black/10 group-hover:border-[#FEBF10]/30 transition-colors" />
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
                                { type: 'Presence', date: '1 week ago', msg: 'Recorded as Excused Absence for healthcare.', icon: UserCheck, color: 'text-re-navy', bg: 'bg-re-navy/5' }
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
                <div className="px-5 sm:px-8 py-5 border-t border-slate-100 bg-slate-50/50 flex flex-col gap-3">
                    {typeof onEditProfile === 'function' && (
                        <button
                            type="button"
                            onClick={() => onEditProfile(student)}
                            className="h-12 w-full flex items-center justify-center gap-2 rounded-2xl bg-re-gold text-[#0b1530] font-bold text-sm shadow-md hover:bg-re-gold-light transition-all"
                        >
                            <Pencil size={16} /> Full profile &amp; edit
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={() => onClose(true)}
                        className="h-12 w-full flex items-center justify-center gap-2 text-white rounded-2xl font-bold text-sm uppercase tracking-wide shadow-lg hover:opacity-95 active:scale-[0.99] transition-all"
                        style={{ background: "linear-gradient(135deg, #1E3A5F 0%, #0D2644 100%)" }}
                    >
                        <Activity size={16} /> Conduct marks
                    </button>
                    <div className="grid grid-cols-2 gap-3">
                        <a
                            href={student.phone && student.phone !== 'N/A' ? `tel:${String(student.phone).replace(/\s/g, '')}` : undefined}
                            className={`h-12 flex items-center justify-center gap-2 bg-white border border-slate-200 text-slate-800 font-semibold text-xs rounded-2xl hover:bg-slate-50 transition-all ${!student.phone || student.phone === 'N/A' ? 'pointer-events-none opacity-50' : ''}`}
                        >
                            <Phone size={15} className="text-re-gold" /> Call parent
                        </a>
                        <button
                            type="button"
                            className="h-12 flex items-center justify-center gap-2 bg-white border border-slate-200 text-slate-800 font-semibold text-xs rounded-2xl hover:bg-slate-50"
                            onClick={() => window.print()}
                        >
                            <Printer size={15} className="text-re-gold" /> Print
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
    const [showAddModal, setShowAddModal] = useState(false);
    const [isConductModalOpen, setIsConductModalOpen] = useState(false);
    const [conductStudent, setConductStudent] = useState(null);
    const [exportOpen, setExportOpen] = useState(false);

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
                    gender: s.gender || '',
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

    const isMale = (g) => /^m(ale)?$/i.test(String(g || '').trim()) || String(g || '').toLowerCase() === 'boy';
    const isFemale = (g) => /^f(emale)?$/i.test(String(g || '').trim()) || String(g || '').toLowerCase() === 'girl';

    const registryStatItems = useMemo(() => {
        const total = students.length;
        const boys = students.filter((s) => isMale(s.gender)).length;
        const girls = students.filter((s) => isFemale(s.gender)).length;
        const boarding = students.filter((s) => String(s.residency_status || '').toUpperCase() === 'BOARDING').length;
        return [
            {
                label: 'Total students',
                value: total.toLocaleString(),
                trend: stats.avgAttendance ? `Avg presence ${stats.avgAttendance}` : '—',
                icon: Users,
                tone: 'navy',
            },
            {
                label: 'Boys',
                value: boys.toLocaleString(),
                trend: total ? `${Math.round((boys / Math.max(total, 1)) * 100)}% of cohort` : '—',
                icon: UserCheck,
                tone: 'gold',
            },
            {
                label: 'Girls',
                value: girls.toLocaleString(),
                trend: total ? `${Math.round((girls / Math.max(total, 1)) * 100)}% of cohort` : '—',
                icon: Award,
                tone: 'emerald',
            },
            {
                label: 'Boarding',
                value: boarding.toLocaleString(),
                trend: total ? `${Math.round((boarding / Math.max(total, 1)) * 100)}% boarding` : '—',
                icon: Home,
                tone: 'violet',
            },
        ];
    }, [students, stats.avgAttendance]);

    return (
        <>
            <StudentWizardModal
                open={showAddModal}
                onClose={() => { setShowAddModal(false); setEditingStudent(null); }}
                editStudent={editingStudent}
                onSuccess={fetchContent}
                session={manager}
            />
            <StudentModal
                student={selectedStudent}
                onEditProfile={(s) => {
                    setSelectedStudent(null);
                    setEditingStudent(s);
                    setShowAddModal(true);
                }}
                onClose={(openConduct) => {
                    const prev = selectedStudent;
                    setSelectedStudent(null);
                    if (openConduct === true && prev) setTimeout(() => openConductModal(prev), 80);
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
                    <div className="relative bg-white w-full max-w-sm rounded-[2rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
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

            <RegistryPageShell>
                <RegistryPageHeader
                    overline="School community"
                    title="Students"
                    subtitle={`Enrollment, guardians, and identity — aligned with Babyeyi School Admin. ${manager?.school?.name ? `School: ${manager.school.name}.` : ''}`}
                    secondaryAction={(
                        <ExportSplitButton
                            open={exportOpen}
                            onOpen={setExportOpen}
                            onClose={() => setExportOpen(false)}
                        >
                            <button
                                type="button"
                                className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm font-medium text-slate-700 hover:bg-slate-50"
                                onClick={() => setExportOpen(false)}
                            >
                                <FileText size={16} className="text-re-gold shrink-0" /> Export PDF
                            </button>
                            <button
                                type="button"
                                className="flex w-full items-center gap-2 border-t border-slate-100 px-4 py-2.5 text-left text-sm font-medium text-slate-700 hover:bg-slate-50"
                                onClick={() => setExportOpen(false)}
                            >
                                <FileSpreadsheet size={16} className="text-re-gold shrink-0" /> Export Excel
                            </button>
                        </ExportSplitButton>
                    )}
                    primaryAction={(
                        <button
                            type="button"
                            onClick={() => { setEditingStudent(null); setShowAddModal(true); }}
                            className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-re-gold px-5 py-2.5 text-[13px] font-bold text-[#0b1530] shadow-[0_4px_14px_rgba(254,191,16,0.35)] hover:bg-re-gold-light transition-all"
                        >
                            <Plus size={18} strokeWidth={2.5} /> Add student
                        </button>
                    )}
                />

                <RegistryStatGrid items={registryStatItems} />

                <RegistryCard>
                    {/* Toolbar */}
                    <div className="flex flex-col gap-4 border-b border-slate-100 p-4 sm:p-6 bg-white">
                        <div className="relative w-full group">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-re-navy transition-colors" size={18} />
                            <input
                                type="search"
                                placeholder="Search by name, admission number, or class…"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-12 pr-4 text-sm font-medium text-slate-800 outline-none transition-all focus:border-re-gold/40 focus:bg-white focus:ring-2 focus:ring-re-gold/20"
                            />
                        </div>
                        <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2">
                            <button
                                type="button"
                                onClick={() => setShowClassFilter(!showClassFilter)}
                                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-xs font-semibold uppercase tracking-wide text-slate-600 hover:bg-slate-50"
                            >
                                <Filter size={15} className="text-re-gold" />
                                Class
                            </button>
                            <div className="relative flex-1 min-w-[140px]">
                                <button
                                    type="button"
                                    onClick={() => setShowYearFilter(!showYearFilter)}
                                    className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                                >
                                    <Clock size={15} className="text-re-gold shrink-0" />
                                    <span className="truncate">{selectedYear === 'All Years' ? 'Academic year' : selectedYear}</span>
                                </button>
                                {showYearFilter && (
                                    <>
                                        <button type="button" className="fixed inset-0 z-30" aria-label="Close" onClick={() => setShowYearFilter(false)} />
                                        <div className="absolute left-0 right-0 z-40 mt-2 max-h-56 overflow-y-auto rounded-2xl border border-slate-200 bg-white py-1 shadow-xl sm:right-auto sm:w-56">
                                            {['All Years', '2023', '2023-2024', '2024', '2024-2025', '2025', '2025-2026', '2026', '2026-2027', '2027'].map((year) => (
                                                <button
                                                    key={year}
                                                    type="button"
                                                    onClick={() => { setSelectedYear(year); setShowYearFilter(false); }}
                                                    className={`block w-full px-4 py-2.5 text-left text-sm font-medium ${selectedYear === year ? 'bg-re-navy text-white' : 'text-slate-700 hover:bg-slate-50'}`}
                                                >
                                                    {year}
                                                </button>
                                            ))}
                                        </div>
                                    </>
                                )}
                            </div>
                            <div className="relative flex-1 min-w-[140px]">
                                <button
                                    type="button"
                                    onClick={() => setShowResidencyFilter(!showResidencyFilter)}
                                    className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                                >
                                    <Home size={15} className="text-re-gold shrink-0" />
                                    <span className="truncate">{selectedResidency === 'All' ? 'Residency' : selectedResidency}</span>
                                </button>
                                {showResidencyFilter && (
                                    <>
                                        <button type="button" className="fixed inset-0 z-30" aria-label="Close" onClick={() => setShowResidencyFilter(false)} />
                                        <div className="absolute left-0 right-0 z-40 mt-2 rounded-2xl border border-slate-200 bg-white py-1 shadow-xl sm:right-auto sm:w-48">
                                            {['All', 'DAY', 'BOARDING'].map((res) => (
                                                <button
                                                    key={res}
                                                    type="button"
                                                    onClick={() => { setSelectedResidency(res); setShowResidencyFilter(false); }}
                                                    className={`block w-full px-4 py-2.5 text-left text-sm font-medium ${selectedResidency === res ? 'bg-re-navy text-white' : 'text-slate-700 hover:bg-slate-50'}`}
                                                >
                                                    {res === 'All' ? 'All types' : res}
                                                </button>
                                            ))}
                                        </div>
                                    </>
                                )}
                            </div>
                            <button
                                type="button"
                                onClick={() => openConductModal(null)}
                                className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 text-xs font-semibold text-re-navy hover:bg-white sm:flex-none"
                            >
                                <Activity size={16} /> Conduct
                            </button>
                        </div>
                    </div>

                    {showClassFilter && (
                        <div className="flex flex-wrap gap-2 border-b border-slate-100 bg-slate-50/80 px-4 py-3 sm:px-6">
                            <button
                                type="button"
                                onClick={() => setSelectedClass('View All')}
                                className={`rounded-full border px-4 py-1.5 text-xs font-semibold transition-all ${selectedClass === 'View All' ? 'border-re-navy bg-re-navy text-white' : 'border-slate-200 bg-white text-slate-600'}`}
                            >
                                All classes
                            </button>
                            {classes.map((cls) => (
                                <button
                                    key={cls}
                                    type="button"
                                    onClick={() => setSelectedClass(cls)}
                                    className={`rounded-full border px-4 py-1.5 text-xs font-semibold transition-all ${selectedClass === cls ? 'border-re-navy bg-re-navy text-white' : 'border-slate-200 bg-white text-slate-600'}`}
                                >
                                    {cls}
                                </button>
                            ))}
                            <button
                                type="button"
                                className="ml-auto md:hidden rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-re-gold"
                                onClick={() => setShowAllClassesModal(true)}
                            >
                                More
                            </button>
                        </div>
                    )}

                    <div className="overflow-x-auto">
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
                                            <div className="w-8 h-8 border-4 border-re-navy border-t-transparent rounded-full animate-spin mx-auto mb-4" style={{ borderColor: "#1E3A5F #0000 0000 0000" }}></div>
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
                                                                <p className="text-xs sm:text-sm font-black text-re-text tracking-tight uppercase leading-none mb-1 group-hover:text-[#1E3A5F] transition-colors">{s.name}</p>
                                                                <div className="flex items-center gap-2">
                                                                    <p className="text-[7px] sm:text-[9px] font-bold text-re-text-muted opacity-30 uppercase tracking-widest leading-none font-mono italic">{s.id}</p>
                                                                    <span className={`text-[6px] px-1 rounded-sm font-black uppercase tracking-tighter ${s.residency_status === 'BOARDING' ? 'bg-[#FEBF10]/20 text-[#1E3A5F]' : 'bg-black/5 text-re-text-muted opacity-40'}`}>
                                                                        {s.residency_status || 'DAY'}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="hidden md:table-cell px-8 py-5">
                                                        <div className="flex flex-col gap-0.5">
                                                            <p className="text-[10px] font-black text-re-text uppercase tracking-tight leading-none mb-1">{s.grade}</p>
                                                            <div className="flex items-center gap-1.5">
                                                                <span className="text-[8px] font-black text-[#FEBF10] uppercase tracking-[0.2em]">{s.academic_year || 'YEAR NOT SET'}</span>
                                                                <div className="w-1 h-3 bg-black/10 rounded-full shrink-0"></div>
                                                                <p className="text-[9px] font-bold text-re-text-muted opacity-30 uppercase tracking-widest leading-none">GPA {s.gpa}</p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="hidden md:table-cell px-8 py-5">
                                                        <div className="space-y-1.5 max-w-[100px]">
                                                            <div className="flex items-center justify-between">
                                                                <p className="text-[9px] font-black text-re-text">{s.attendance}%</p>
                                                            </div>
                                                            <div className="w-full h-1 bg-black/5 rounded-full overflow-hidden">
                                                                <div className="h-full" style={{ width: `${s.attendance}%`, background: s.attendance > 90 ? "linear-gradient(135deg, #1E3A5F 0%, #3D5A80 100%)" : "#FEBF10" }}></div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="hidden md:table-cell px-8 py-5">
                                                        <div className={`inline-flex px-3 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest ring-1 ring-inset ${s.status === 'Epic' ? 'bg-emerald-50 text-emerald-600 ring-emerald-500/20' :
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
                                                                            className={`absolute right-0 ${isLastItems ? 'bottom-full mb-2 origin-bottom-right' : 'top-full mt-2 origin-top-right'} w-48 bg-white border border-black/5 shadow-2xl rounded-2xl z-[50] overflow-hidden py-1 animate-in fade-in zoom-in-95 duration-150`}
                                                                            onClick={(e) => e.stopPropagation()}
                                                                        >
                                                                            <button
                                                                                className="w-full text-left px-4 py-3 text-[10px] font-black uppercase tracking-widest text-re-text hover:bg-re-bg transition-colors flex items-center gap-2.5"
                                                                                onClick={() => { setSelectedStudent(s); setOpenDropdownId(null); }}
                                                                            >
                                                                                <Eye size={13} className="text-re-text-muted" /> View Profile
                                                                            </button>
                                                                            <button
                                                                                className="w-full text-left px-4 py-3 text-[10px] font-black uppercase tracking-widest text-[#1E3A5F] hover:bg-re-navy/5 transition-colors flex items-center gap-2.5"
                                                                                onClick={() => { setEditingStudent(s); setShowAddModal(true); setOpenDropdownId(null); }}
                                                                            >
                                                                                <Edit3 size={13} /> Edit Identity
                                                                            </button>
                                                                            <button
                                                                                className="w-full text-left px-4 py-3 text-[10px] font-black uppercase tracking-widest hover:bg-re-navy/5 transition-colors flex items-center gap-2.5 border-t border-black/5"
                                                                                style={{ color: "#1E3A5F" }}
                                                                                onClick={() => { setOpenDropdownId(null); openConductModal(s); }}
                                                                            >
                                                                                <Activity size={13} /> <span className="tracking-tighter">+/-</span> Conduct Marks
                                                                            </button>
                                                                            <button
                                                                                className="w-full text-left px-4 py-3 text-[10px] font-black uppercase tracking-widest text-re-text hover:bg-re-bg transition-colors flex items-center gap-2.5"
                                                                                onClick={() => setOpenDropdownId(null)}
                                                                            >
                                                                                <Phone size={13} className="text-re-text-muted" /> Contact Parent
                                                                            </button>
                                                                            <button
                                                                                className="w-full text-left px-4 py-3 text-[10px] font-black uppercase tracking-widest text-re-text hover:bg-re-bg transition-colors flex items-center gap-2.5 border-t border-black/5"
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
                                                <td colSpan="5" className="p-12 text-center text-[10px] font-black text-re-text-muted uppercase tracking-widest italic opacity-40">No students found matching your criteria.</td>
                                            </tr>
                                        )}
                                    </>
                                )}
                            </tbody>
                        </table>
                    </div>

                    <div className="flex flex-col gap-3 border-t border-slate-100 bg-slate-50/60 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                        <p className="text-xs font-medium text-slate-500">
                            Showing <span className="font-semibold text-slate-800">{filteredStudents.length}</span> students
                            {selectedClass !== 'View All' && (
                                <span className="text-slate-400"> · Class: {selectedClass}</span>
                            )}
                        </p>
                        <p className="text-[11px] text-slate-400">Use row menu for view, full edit, or conduct.</p>
                    </div>
                </RegistryCard>
            </RegistryPageShell>
        </>
    );
};

export default Students;
