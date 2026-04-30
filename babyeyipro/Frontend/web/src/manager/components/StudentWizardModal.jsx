import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
    X, Activity, User, Calendar, ShieldAlert, Loader2, FileText, 
    ChevronRight, AlertTriangle, ShieldCheck, Award, TrendingDown,
    Phone, Printer, Users, Home
} from 'lucide-react';
import api from '../services/api';
import { exportStudentDisciplineDetailsPDF } from '../utils/pdfExport';

export default function StudentDisciplineModal({ isOpen, onClose, student, academicYear, term }) {
    const [loading, setLoading] = useState(true);
    const [logs, setLogs] = useState([]);

    useEffect(() => {
        if (!isOpen || !student) return;

        let cancelled = false;
        const fetchLogs = async () => {
            setLoading(true);
            try {
                const apiTerm = term === 'Annual Review' || term === 'All Terms' ? '' : term;
                const res = await api.get('/discipline/cases', {
                    params: {
                        student_id: student.id,
                        academic_year: academicYear,
                        ...(apiTerm ? { term: apiTerm } : {}),
                        limit: 50
                    }
                });
                if (!cancelled && res.data?.success) {
                    setLogs(res.data.data || []);
                }
            } catch (err) {
                console.error('Failed to fetch discipline logs', err);
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        fetchLogs();

        return () => { cancelled = true; };
    }, [isOpen, student, academicYear, term]);

    if (!isOpen || !student) return null;

    const isCritical = student.discipline_remaining < (student.discipline_total * 0.5);
    const isWarning = !isCritical && student.discipline_remaining < (student.discipline_total * 0.75);
    
    // Calculate precise standings from logs
    const totalRewards = logs.reduce((sum, log) => {
        const pts = Number(log.marks_deducted);
        return pts < 0 ? sum + Math.abs(pts) : sum;
    }, 0);
    
    const totalDeductions = logs.reduce((sum, log) => {
        const pts = Number(log.marks_deducted);
        return pts > 0 ? sum + pts : sum;
    }, 0);

    // Status label logic
    const statusLabel = isCritical ? 'Critical' : isWarning ? 'Warning' : 'Excellent';
    const statusColor = isCritical ? 'red' : isWarning ? 'orange' : 'emerald';
    
    const parentPhone =
        student.father_phone ||
        student.mother_phone ||
        student.phone ||
        student.parent_phone ||
        '';

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
                        <div className="w-12 h-12 rounded-2xl bg-re-bg border border-black/5 flex items-center justify-center text-re-text font-black text-lg shadow-inner relative overflow-hidden shrink-0">
                            {student.student_photo_url ? (
                                <img src={`${api.defaults.baseURL.replace('/api', '')}${student.student_photo_url}`} className="w-full h-full object-cover relative z-10" alt="Student" />
                            ) : (
                                <>
                                    <span className="relative z-10" style={{ color: "#1E3A5F" }}>{student.first_name?.charAt(0) || <User size={20} />}</span>
                                    <div className="absolute inset-0 opacity-5" style={{ background: "#FEBF10" }}></div>
                                </>
                            )}
                        </div>
                        <div className="min-w-0">
                            <h3 className="font-black text-re-text text-base leading-tight uppercase tracking-tight truncate">{student.first_name} {student.last_name}</h3>
                            <div className="flex flex-col gap-0.5 mt-0.5">
                                <p className="text-[9px] text-re-text-muted font-bold flex items-center gap-1 uppercase tracking-widest opacity-40 truncate">
                                    <span className="w-1 h-1 rounded-full shrink-0" style={{ background: "#FEBF10" }}></span>
                                    UID: {student.student_uid || student.student_code || student.id}
                                </p>
                                <p className="text-[8px] text-[#1E3A5F] font-black flex items-center gap-1 uppercase tracking-[0.2em] truncate">
                                    {student.class_name || 'Unassigned'} Class
                                </p>
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
                <div className="flex-1 overflow-y-auto px-8 py-8 space-y-8 custom-scrollbar bg-white">

                    {/* Status Alert (Premium Badge) */}
                    <div className={`flex items-center gap-3 px-4 py-3 rounded-2xl border ${isCritical ? 'bg-red-50 border-red-100/50' : isWarning ? 'bg-orange-50 border-orange-100/50' : 'bg-emerald-50 border-emerald-100/50'}`}>
                        <div className={`p-1.5 rounded-lg ${isCritical ? 'bg-red-500' : isWarning ? 'bg-orange-500' : 'bg-emerald-500'} text-white`}>
                            {isCritical ? <ShieldAlert size={14} /> : isWarning ? <AlertTriangle size={14} /> : <ShieldCheck size={14} />}
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-re-text uppercase tracking-widest">{statusLabel} Conduct Status</p>
                            <p className="text-[9px] text-re-text/40 font-bold uppercase tracking-tight leading-none mt-1">Period: {term} {academicYear ? `· ${academicYear}` : ''}</p>
                        </div>
                    </div>

                    {/* Detailed Info Matrix (genzura styled) */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="text-[9px] font-black text-re-text-muted uppercase tracking-[0.3em] opacity-40">Profile Info</span>
                            <div className="flex-1 h-px bg-black/5" />
                        </div>
                        {[
                            { label: 'Guardian', value: student.father_full_name || student.mother_full_name || student.parent || 'N/A', icon: Users },
                            { label: 'Parent Phone', value: student.father_phone || student.mother_phone || student.phone || 'N/A', icon: Phone },
                            { label: 'Residency', value: student.residency_status || 'DAY', icon: Home },
                            { label: 'House / Loc.', value: student.province ? `${student.province}, ${student.district}` : 'Unknown', icon: Home },
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

                    {/* Academic Hero Section (Conduct Summary) */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-re-bg rounded-3xl p-5 border border-black/5 shadow-inner relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-16 h-16 bg-re-grad-purple opacity-5 rounded-full -mr-6 -mt-6 group-hover:scale-125 transition-transform duration-700" />
                            <p className="text-[8px] text-re-text-muted uppercase tracking-[0.2em] font-black mb-1 relative z-10 opacity-60">Current Score</p>
                            <div className="flex items-baseline gap-1 relative z-10">
                                <span className={`text-2xl font-black tracking-tighter ${isCritical ? 'text-red-500' : isWarning ? 'text-orange-500' : 'text-emerald-500'}`}>
                                    {Number(student.discipline_remaining).toFixed(0)}
                                </span>
                                <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: "#FEBF10" }}>/{student.discipline_total}</span>
                            </div>
                        </div>
                        <div className="bg-re-bg rounded-3xl p-5 border border-black/5 shadow-inner relative overflow-hidden group text-right">
                            <div className="absolute top-0 left-0 w-16 h-16 opacity-5 rounded-full -ml-6 -mt-6 group-hover:scale-125 transition-transform duration-700" style={{ background: "#FEBF10" }} />
                            <p className="text-[8px] text-re-text-muted uppercase tracking-[0.2em] font-black mb-1 relative z-10 opacity-60">Conduct Standing</p>
                            <div className="flex items-baseline gap-1 justify-end relative z-10">
                                <span className="text-xl font-black text-emerald-500 tracking-tighter">+{totalRewards}</span>
                                <span className="text-xl font-black text-re-text/20 mx-1">|</span>
                                <span className="text-xl font-black text-red-500 tracking-tighter">-{totalDeductions}</span>
                                <span className="text-[9px] font-black uppercase tracking-widest ml-1 opacity-60">Pts</span>
                            </div>
                        </div>
                    </div>

                {/* Behavioral Activity Log (Scholastic History) */}
                <div className="px-8 py-6 flex-1 overflow-y-auto">
                    <div className="flex items-center gap-2 mb-4">
                        <span className="text-[9px] font-black text-re-text-muted uppercase tracking-[0.3em] opacity-40">Disciplinary & Conduct Log</span>
                        <div className="flex-1 h-px bg-black/5" />
                    </div>

                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-10 gap-3">
                            <Loader2 size={24} className="animate-spin text-[#1E3A5F]/30" />
                            <p className="text-[8px] font-black text-re-text-muted uppercase tracking-[0.2em] opacity-40">Loading history...</p>
                        </div>
                    ) : logs.length === 0 ? (
                        <div className="text-center py-8">
                            <p className="text-[9px] font-black text-re-text-muted uppercase tracking-widest italic opacity-40">No disciplinary records found.</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {logs.map((log) => {
                                const pts = Number(log.marks_deducted);
                                const isNeutral = pts === 0;
                                const isPositive = pts < 0; // Negative deduction = positive reward
                                const isDeduction = pts > 0;
                                
                                const dateObj = new Date(log.created_at);
                                const dateStr = !isNaN(dateObj) ? dateObj.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Unknown Date';
                                
                                return (
                                    <div key={log.id} className="flex items-start gap-3 p-4 rounded-2xl bg-re-bg/50 border border-black/[0.02] group hover:bg-white hover:border-black/5 transition-all">
                                        <div className={`p-2 rounded-xl shrink-0 ${isPositive ? 'bg-emerald-50 text-emerald-500' : isDeduction ? 'bg-red-50 text-red-500' : 'bg-blue-50 text-blue-500'}`}>
                                            {isPositive ? <ShieldCheck size={14} /> : isDeduction ? <TrendingDown size={14} /> : <FileText size={14} />}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center justify-between mb-0.5">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[8px] font-black uppercase tracking-widest text-re-text">{log.lesson_subject || 'General'}</span>
                                                    <span className="w-1 h-1 bg-black/10 rounded-full"></span>
                                                    <span className="text-[8px] font-bold text-re-text-muted opacity-40 uppercase">{dateStr}</span>
                                                </div>
                                                <span className={`text-[10px] font-black uppercase tracking-widest ${isPositive ? 'text-emerald-500' : isDeduction ? 'text-red-500' : 'text-blue-500'}`}>
                                                    {isPositive ? '+' : isDeduction ? '-' : ''}{Math.abs(pts)} Pts
                                                </span>
                                            </div>
                                            <p className="text-[10px] font-bold text-re-text-muted leading-relaxed tracking-tight group-hover:text-re-text transition-colors mt-1">{log.description || 'No specific description provided.'}</p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
                </div>

                {/* Drawer Footer (Actions) */}
                <div className="px-8 py-5 border-t border-black/5 bg-re-bg/20 flex flex-col gap-2">
                    <button
                        onClick={() => onClose({ openConductMarks: true })}
                        className="h-10 w-full flex items-center justify-center gap-2 text-white rounded-xl font-black text-[9px] uppercase tracking-widest shadow-lg hover:scale-[1.02] active:scale-95 transition-all"
                        style={{ background: "linear-gradient(135deg, #1E3A5F 0%, #0D2644 100%)" }}
                    >
                        <Activity size={14} /> <span className="tracking-tighter">+/-</span> Conduct Marks
                    </button>
                    <div className="grid grid-cols-2 gap-2">
                        <a
                            href={parentPhone ? `tel:${parentPhone}` : undefined}
                            aria-disabled={!parentPhone}
                            title={parentPhone ? `Call ${parentPhone}` : 'No parent phone number'}
                            className={`h-9 flex items-center justify-center gap-2 bg-white border border-black/5 text-re-text font-black text-[9px] uppercase tracking-widest rounded-xl transition-all ${
                                parentPhone
                                    ? 'hover:bg-re-bg'
                                    : 'bg-re-bg/40 text-re-text/40 border-black/0 cursor-not-allowed opacity-70 pointer-events-none'
                            }`}
                        >
                            <Phone size={14} style={{ color: "#FEBF10" }} /> {parentPhone ? 'Parent' : 'No parent phone'}
                        </a>
                        <button
                            disabled={loading}
                            onClick={() => {
                                const studentName = `${student.first_name || ''} ${student.last_name || ''}`.trim() || 'student';
                                const uid = student.student_uid || student.student_code || student.id || '';
                                exportStudentDisciplineDetailsPDF({
                                    student,
                                    academicYear,
                                    term,
                                    logs,
                                    filename: `discipline_report_${studentName}_${uid}.pdf`.replaceAll(' ', '_'),
                                    autoPrint: true,
                                });
                            }}
                            className="h-9 flex items-center justify-center gap-2 bg-white border border-black/5 text-re-text font-black text-[9px] uppercase tracking-widest rounded-xl hover:bg-re-bg transition-all disabled:opacity-50"
                        >
                            <Printer size={14} style={{ color: "#FEBF10" }} /> Report
                        </button>
                    </div>
                </div>
            </div>
        </>,
        document.body
    );
}
