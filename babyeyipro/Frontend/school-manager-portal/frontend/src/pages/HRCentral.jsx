import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
    Users, Search, Plus, MoreVertical, Briefcase,
    TrendingUp, Download, Mail, ChevronRight,
    UserCheck, Award, Filter, Activity, UserPlus, X, User,
    Phone, Clock, Home, Tag, Printer, Eye, CheckCircle, RefreshCw, Camera,
    FileText, FileSpreadsheet, Upload, ChevronDown, Building2, ShieldCheck, FileSignature, Loader2,
    Fingerprint, CreditCard, IdCard, Edit3
} from 'lucide-react';
import staffService from '../services/staffService';
import { useAuth } from '../context/AuthContext';

// ── Staff Detail Modal (Drawer Style) ──────────────────────────────────────
const StaffModal = ({ staff, onClose }) => {
    if (!staff) return null;

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
                <div className="flex items-center justify-between px-6 py-4 border-b border-black/5 bg-white shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-re-bg border border-black/5 flex items-center justify-center text-re-text font-black text-base shadow-inner relative overflow-hidden">
                            <span className="relative z-10" style={{ color: "#1E3A5F" }}>{staff.name?.charAt(0)}</span>
                            <div className="absolute inset-0 opacity-5" style={{ background: "#FEBF10" }}></div>
                        </div>
                        <div>
                            <h3 className="font-black text-re-text text-sm leading-tight uppercase tracking-tight">{staff.name}</h3>
                            <p className="text-[8px] text-re-text-muted font-bold flex items-center gap-1 uppercase tracking-widest mt-0.5 opacity-40">
                                <span className="w-1 h-1 rounded-full" style={{ background: "#FEBF10" }}></span>
                                Staff ID: {staff.id}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-re-bg rounded-lg transition-all text-re-text-muted hover:text-[#1E3A5F] group"
                    >
                        <X size={16} className="group-hover:rotate-90 transition-transform duration-300" />
                    </button>
                </div>

                {/* Drawer Body (Scrollable) */}
                <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6 custom-scrollbar">

                    {/* Status Alert (Premium Badge) */}
                    <div className={`flex items-center gap-3 px-4 py-3 rounded-2xl border ${staff.status === 'Exceptional' ? 'bg-emerald-50 border-emerald-100/50' : 'bg-re-navy/5 border-re-navy/10'}`}>
                        <div className={`p-1.5 rounded-lg ${staff.status === 'Exceptional' ? 'bg-emerald-500' : 'bg-[#1E3A5F]'} text-white`}>
                            <ShieldCheck size={14} />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-re-text uppercase tracking-widest">{staff.status || 'Standard'} Personnel Rating</p>
                            <p className="text-[9px] text-re-text/40 font-bold uppercase tracking-tight leading-none mt-0.5">Performance aligned with Core Values</p>
                        </div>
                    </div>

                    {/* HR Hero Section (Evaluation & Presence) */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-re-bg rounded-3xl p-5 border border-black/5 shadow-inner relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-16 h-16 bg-re-grad-purple opacity-5 rounded-full -mr-6 -mt-6 group-hover:scale-125 transition-transform duration-700" />
                            <p className="text-[8px] text-re-text-muted uppercase tracking-[0.2em] font-black mb-1 relative z-10 opacity-60">Evaluation Score</p>
                            <div className="flex items-baseline gap-1 relative z-10">
                                <span className="text-2xl font-black text-re-text tracking-tighter">{staff.evaluation || 85}</span>
                                <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: "#FEBF10" }}>%</span>
                            </div>
                        </div>
                        <div className="bg-re-bg rounded-3xl p-5 border border-black/5 shadow-inner relative overflow-hidden group text-right">
                            <div className="absolute top-0 left-0 w-16 h-16 opacity-5 rounded-full -ml-6 -mt-6 group-hover:scale-125 transition-transform duration-700" style={{ background: "#FEBF10" }} />
                            <p className="text-[8px] text-re-text-muted uppercase tracking-[0.2em] font-black mb-1 relative z-10 opacity-60">Attendance</p>
                            <div className="flex items-baseline gap-1 justify-end relative z-10">
                                <span className="text-2xl font-black text-re-text tracking-tighter">{staff.attendance || 90}</span>
                                <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: "#FEBF10" }}>%</span>
                            </div>
                        </div>
                    </div>

                    {/* Detailed Info Matrix */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="text-[9px] font-black text-re-text-muted uppercase tracking-[0.3em] opacity-40">HR Intelligence</span>
                            <div className="flex-1 h-px bg-black/5" />
                        </div>
                        {[
                            { label: 'Role/Position', value: staff.role, icon: Briefcase },
                            { label: 'Department', value: staff.department, icon: Building2 },
                            { label: 'Primary Contact', value: staff.phone || 'N/A', icon: Phone },
                            { label: 'Institutional Email', value: staff.email, icon: Mail },
                            { label: 'Contract Origination', value: staff.joinedDate, icon: Clock },
                        ].map((item, i) => (
                            <div key={i} className="flex items-center justify-between group">
                                <div className="flex items-center gap-2">
                                    <item.icon size={11} className="opacity-30" style={{ color: "#FEBF10" }} />
                                    <span className="text-[10px] font-black text-re-text-muted uppercase tracking-widest">{item.label}</span>
                                </div>
                                <div className="flex-1 mx-3 border-b border-dashed border-black/10 group-hover:border-[#FEBF10]/30 transition-colors" />
                                <span className="text-[10px] font-black text-re-text uppercase tracking-tight text-right truncate max-w-[150px]" title={item.value}>{item.value}</span>
                            </div>
                        ))}
                    </div>

                    {/* Behavioral Activity Log (HR History) */}
                    <div>
                        <div className="flex items-center gap-2 mb-4">
                            <span className="text-[9px] font-black text-re-text-muted uppercase tracking-[0.3em] opacity-40">Personnel Activity Log</span>
                            <div className="flex-1 h-px bg-black/5" />
                        </div>

                        <div className="space-y-3">
                            {[
                                { type: 'Appraisal', date: 'Last Month', msg: 'Termly performance review finalized at Expected level.', icon: FileSignature, color: 'text-emerald-500', bg: 'bg-emerald-50' },
                                { type: 'Presence', date: '3 weeks ago', msg: 'Approved excused absence for professional development.', icon: UserCheck, color: 'text-re-purple', bg: 'bg-re-purple/5' },
                                { type: 'Role Auth', date: '1 year ago', msg: 'Contract renewed successfully for upcoming academic cycle.', icon: ShieldCheck, color: 'text-[#1E3A5F]', bg: 'bg-slate-100' }
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
                <div className="px-6 py-4 border-t border-black/5 bg-re-bg/20 flex flex-col gap-2.5">
                    <button
                        onClick={() => onClose()}
                        className="h-10 w-full flex items-center justify-center gap-2 text-white rounded-xl font-black text-[9px] uppercase tracking-widest shadow-xl hover:scale-[1.02] active:scale-95 transition-all"
                        style={{ background: "linear-gradient(135deg, #1E3A5F 0%, #0D2644 100%)" }}
                    >
                        <FileSignature size={14} /> Request Formal Appraisal
                    </button>
                    <div className="grid grid-cols-2 gap-2.5">
                        <button className="h-10 flex items-center justify-center gap-2 bg-white border border-black/5 text-re-text font-black text-[9px] uppercase tracking-widest rounded-xl hover:bg-re-bg transition-all">
                            <Mail size={14} style={{ color: "#FEBF10" }} /> Send Notice
                        </button>
                        <button className="h-10 flex items-center justify-center gap-2 bg-white border border-black/5 text-re-text font-black text-[9px] uppercase tracking-widest rounded-xl hover:bg-re-bg transition-all">
                            <Printer size={14} style={{ color: "#FEBF10" }} /> Print HR File
                        </button>
                    </div>
                </div>
            </div>
        </>,
        document.body
    );
};
const HireModal = ({ isOpen, onClose, onHire, onEdit, editingStaff, departments }) => {
    const isEditMode = !!editingStaff;
    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState({
        first_name: '', last_name: '', email: '', 
        phone: '', role_code: '',
        rfid_uid: '', fingerprint_id: '', identity_remarks: ''
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [photo, setPhoto] = useState(null);
    const [preview, setPreview] = useState(null);

    // Pre-fill form when editing
    useEffect(() => {
        if (isEditMode && editingStaff) {
            const nameParts = (editingStaff.name || '').split(' ');
            setFormData({
                first_name: nameParts[0] || '',
                last_name: nameParts.slice(1).join(' ') || '',
                email: editingStaff.email || '',
                phone: editingStaff.phone !== 'N/A' ? editingStaff.phone : '',
                role_code: editingStaff.role_code || '',
                rfid_uid: editingStaff.rfid_uid || '',
                fingerprint_id: editingStaff.fingerprint_id || '',
                identity_remarks: editingStaff.identity_remarks || ''
            });
            // Show existing photo as preview
            if (editingStaff.photo) {
                setPreview((import.meta.env.VITE_API_URL || 'http://localhost:5100') + editingStaff.photo);
            }
            setStep(1);
        } else if (!isEditMode) {
            setFormData({ first_name: '', last_name: '', email: '', phone: '', role_code: '', rfid_uid: '', fingerprint_id: '', identity_remarks: '' });
            setPhoto(null);
            setPreview(null);
            setStep(1);
        }
    }, [editingStaff, isEditMode]);

    if (!isOpen) return null;

    const handlePhotoChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setPhoto(file);
            setPreview(URL.createObjectURL(file));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        
        if (isEditMode) {
            // Edit mode: send JSON for biometrics, separate call for photo
            const biometricPayload = {
                rfid_uid: formData.rfid_uid || null,
                fingerprint_id: formData.fingerprint_id || null,
                identity_remarks: formData.identity_remarks || null,
            };
            const success = await onEdit(editingStaff.id, biometricPayload, photo);
            setIsSubmitting(false);
            if (success) onClose();
        } else {
            // Create mode: multipart FormData
            const data = new FormData();
            Object.keys(formData).forEach(key => data.append(key, formData[key]));
            if (photo) data.append('photo', photo);
            const success = await onHire(data);
            setIsSubmitting(false);
            if (success) {
                setPhoto(null);
                setPreview(null);
                onClose();
            }
        }
    };

    return createPortal(
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-[#0a192f]/70 backdrop-blur-sm animate-in fade-in duration-300" onClick={onClose} />
            <div className="relative bg-white w-full max-w-lg rounded-[2rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 border border-white/10 flex flex-col max-h-[90vh]">
                {/* Header Phase */}
                <div className="px-5 py-2.5 flex items-center justify-between shadow-md shrink-0 relative z-10" style={{ background: "linear-gradient(135deg, #1E3A5F 0%, #0D2644 100%)" }}>
                    <div className="flex items-center gap-2 min-w-0">
                        <div className="w-7 h-7 rounded-lg bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center shadow-md shadow-re-gold/10 shrink-0">
                            {isEditMode ? <Edit3 size={14} className="text-re-gold" /> : <UserPlus size={15} className="text-re-gold" />}
                        </div>
                        <div className="min-w-0 pb-0.5">
                            <h3 className="text-[10px] font-black text-white truncate uppercase tracking-widest leading-none">{isEditMode ? `Edit — ${editingStaff?.name?.split(' ')[0]}` : 'Hire Personnel'}</h3>
                            <p className="text-[6px] text-white/40 font-bold uppercase tracking-tight mt-0.5 truncate">{isEditMode ? 'Update Biometrics & Profile' : 'Institutional Provisioning'}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center text-white/40 hover:text-re-gold hover:bg-white/10 transition-all shrink-0">
                        <X size={12} className="hover:rotate-90 transition-all duration-300" />
                    </button>
                </div>

                {/* Compact Stepper */}
                <div className="bg-re-grad-navy relative flex items-center shrink-0 border-t border-white/10">
                    <div className="flex items-center justify-between overflow-x-auto scrollbar-none pb-0.5 scroll-smooth w-full px-5 py-2">
                        <div className="flex items-center shrink-0">
                            <button onClick={() => setStep(1)} disabled={isSubmitting} className={`flex items-center gap-1.5 transition-all outline-none ${step === 1 ? 'opacity-100' : 'opacity-40 hover:opacity-80'}`}>
                                <div className={`w-6 h-6 rounded-md flex items-center justify-center border transition-all ${
                                    step === 1 ? 'bg-re-gold border-re-gold text-[#1E3A5F] shadow-[0_0_15px_rgba(254,191,16,0.2)]' : 'bg-emerald-500 border-emerald-500 text-white'
                                }`}>
                                    {step > 1 ? <CheckCircle size={12} /> : <User size={10} />}
                                </div>
                                <div className="text-left">
                                    <p className="text-[6px] font-black uppercase tracking-widest leading-none mb-0.5 text-white/50">Phase 01</p>
                                    <p className="text-[8px] font-black text-white tracking-tight leading-none">Profile & Role</p>
                                </div>
                            </button>
                            <div className="w-4 h-px bg-white/10 mx-3" />
                            <button onClick={() => setStep(2)} disabled={isSubmitting} className={`flex items-center gap-1.5 transition-all outline-none ${step === 2 ? 'opacity-100' : 'opacity-40 hover:opacity-80'}`}>
                                <div className={`w-6 h-6 rounded-md flex items-center justify-center border transition-all ${
                                    step === 2 ? 'bg-re-gold border-re-gold text-[#1E3A5F] shadow-[0_0_15px_rgba(254,191,16,0.2)]' : 'bg-white/5 border-white/10 text-white'
                                }`}>
                                    <Fingerprint size={10} />
                                </div>
                                <div className="text-left">
                                    <p className="text-[6px] font-black uppercase tracking-widest leading-none mb-0.5 text-white/50">Phase 02</p>
                                    <p className="text-[8px] font-black text-white tracking-tight leading-none">Biometrics</p>
                                </div>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Scrollable Body */}
                <div className="flex-1 overflow-y-auto custom-scrollbar bg-re-bg/50">
                    <form id="hire-personnel-form" onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4">
                        {step === 1 && (
                          <div className="space-y-4 animate-in slide-in-from-right-4">
                        {/* Photo Upload Section */}
                        <div className="flex flex-col items-center justify-center pb-4">
                            <div className="relative group">
                                <div className="w-20 h-20 rounded-2xl bg-re-bg border-2 border-dashed border-black/10 flex items-center justify-center overflow-hidden transition-all group-hover:border-[#FEBF10]/50">
                                    {preview ? (
                                        <img src={preview} alt="Preview" className="w-full h-full object-cover" />
                                    ) : (
                                        <Camera size={24} className="text-re-text-muted opacity-30" />
                                    )}
                                </div>
                                <input 
                                    type="file" 
                                    accept="image/*" 
                                    onChange={handlePhotoChange}
                                    className="absolute inset-0 opacity-0 cursor-pointer"
                                    title="Upload Profile Picture"
                                />
                                <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-white rounded-xl shadow-lg border border-black/5 flex items-center justify-center text-[#1E3A5F] group-hover:scale-110 transition-transform">
                                    <Plus size={16} />
                                </div>
                            </div>
                            <p className="text-[8px] font-black text-re-text-muted uppercase tracking-[0.2em] mt-3 opacity-40">Profile Photo (Optional)</p>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <p className="text-[7px] font-black text-re-text-muted uppercase tracking-[0.2em] ml-1">First Name</p>
                                <input required value={formData.first_name} onChange={e => setFormData({...formData, first_name: e.target.value})} placeholder="e.g. Jean" className="w-full h-9 bg-re-bg/80 border border-black/5 rounded-xl px-4 text-[10px] font-black outline-none focus:ring-1 ring-re-navy/10 transition-all shadow-inner" />
                            </div>
                            <div className="space-y-1">
                                <p className="text-[7px] font-black text-re-text-muted uppercase tracking-[0.2em] ml-1">Last Name</p>
                                <input required value={formData.last_name} onChange={e => setFormData({...formData, last_name: e.target.value})} placeholder="e.g. Pierre" className="w-full h-9 bg-re-bg/80 border border-black/5 rounded-xl px-4 text-[10px] font-black outline-none focus:ring-1 ring-re-navy/10 transition-all shadow-inner" />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <p className="text-[7px] font-black text-re-text-muted uppercase tracking-[0.2em] ml-1">Email Addr</p>
                                <input required type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} placeholder="e.g. name@school.rw" className="w-full h-9 bg-re-bg/80 border border-black/5 rounded-xl px-4 text-[10px] font-black outline-none focus:ring-1 ring-re-navy/10 transition-all shadow-inner" />
                            </div>
                            <div className="space-y-1">
                                <p className="text-[7px] font-black text-re-text-muted uppercase tracking-[0.2em] ml-1">Phone</p>
                                <input value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full h-9 bg-re-bg/80 border border-black/5 rounded-xl px-4 text-[10px] font-black outline-none focus:ring-1 ring-re-navy/10 transition-all shadow-inner" placeholder="250..." />
                            </div>
                        </div>

                        {/* Role — full width */}
                        <div className="space-y-1">
                            <p className="text-[7px] font-black text-re-text-muted uppercase tracking-[0.2em] ml-1">Role</p>
                            {isEditMode ? (
                                <div className="w-full h-9 bg-re-bg/50 border border-black/5 rounded-xl px-4 flex items-center gap-2 shadow-inner">
                                    <span className="text-[10px] font-black text-[#1E3A5F] uppercase tracking-widest">{formData.role_code || editingStaff?.role || '—'}</span>
                                    <span className="ml-auto text-[7px] font-black text-re-text-muted opacity-40 uppercase tracking-widest italic">Read-only</span>
                                </div>
                            ) : (
                                <select required value={formData.role_code} onChange={e => setFormData({...formData, role_code: e.target.value})} className="w-full h-9 bg-re-bg/80 border border-black/5 rounded-xl px-4 text-[10px] font-black outline-none focus:ring-1 ring-re-navy/10 transition-all uppercase appearance-none shadow-inner">
                                    <option value="">Select...</option>
                                    <option value="TEACHER">Teacher</option>
                                    <option value="DOS">DOS</option>
                                    <option value="HOD">HOD</option>
                                    <option value="ACCOUNTANT">Accountant</option>
                                    <option value="LIBRARIAN">Librarian</option>
                                    <option value="GATE_OFFICER">Gate Officer</option>
                                    <option value="STORE_MANAGER">Store Manager</option>
                                </select>
                            )}
                        </div>

                        {/* End of Step 1 */}
                        </div>
                        )}

                        {step === 2 && (
                          <div className="space-y-4 animate-in slide-in-from-right-4">
                            <div className="space-y-3">
                                <p className="text-[9px] font-black text-[#1E3A5F] uppercase tracking-widest border-b border-black/10 pb-2 mb-2">Gate Integration & Biometrics</p>
                                
                                <div className="space-y-1">
                                    <p className="text-[7px] font-black text-re-text-muted uppercase tracking-[0.2em] ml-1">RFID Gateway Tag UID</p>
                                    <div className="relative">
                                      <CreditCard className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#1E3A5F]/30" size={14} />
                                      <input type="text" value={formData.rfid_uid} onChange={e => setFormData({...formData, rfid_uid: e.target.value})} placeholder="Scan or enter RFID card..." className="w-full h-9 bg-re-bg/80 border border-black/5 rounded-xl pl-10 pr-4 text-[10px] font-black outline-none focus:ring-1 ring-re-navy/10 transition-all shadow-inner uppercase" />
                                    </div>
                                </div>
                                
                                <div className="space-y-1">
                                    <p className="text-[7px] font-black text-re-text-muted uppercase tracking-[0.2em] ml-1">Biometric Fingerprint ID</p>
                                    <div className="relative">
                                      <Fingerprint className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#1E3A5F]/30" size={14} />
                                      <input type="text" value={formData.fingerprint_id} onChange={e => setFormData({...formData, fingerprint_id: e.target.value})} placeholder="Assign device fingerprint ID..." className="w-full h-9 bg-re-bg/80 border border-black/5 rounded-xl pl-10 pr-4 text-[10px] font-black outline-none focus:ring-1 ring-re-navy/10 transition-all shadow-inner uppercase" />
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <p className="text-[7px] font-black text-re-text-muted uppercase tracking-[0.2em] ml-1">Identity/Access Remarks</p>
                                    <div className="relative">
                                      <FileText className="absolute left-3.5 top-3.5 text-[#1E3A5F]/30" size={14} />
                                      <textarea placeholder="Special access constraints..." value={formData.identity_remarks} onChange={e => setFormData({...formData, identity_remarks: e.target.value})} className="w-full bg-re-bg/80 border border-black/5 rounded-xl pl-10 pr-4 py-3 min-h-[60px] text-[10px] font-black outline-none focus:ring-1 ring-re-navy/10 transition-all shadow-inner resize-none uppercase" />
                                    </div>
                                </div>
                            </div>

                            {/* Auto-credentials info banner */}
                            <div className="flex items-start gap-3 px-4 py-3.5 rounded-xl border border-black/5 bg-white shadow-sm mt-4">
                                <div className="p-1.5 rounded-lg text-white shrink-0 mt-0.5" style={{ background: '#1E3A5F' }}>
                                    <Mail size={12} />
                                </div>
                                <div>
                                    <p className="text-[9px] font-black uppercase tracking-widest" style={{ color: '#1E3A5F' }}>System Instructions</p>
                                    <p className="text-[8px] font-bold leading-relaxed mt-1" style={{ color: '#6b7280' }}>
                                        A secure <span className="font-black" style={{ color: '#1E3A5F' }}>password</span> &amp; <span className="font-black" style={{ color: '#1E3A5F' }}>Staff Login</span> will be auto-generated and emailed upon finalizing enrollment.
                                    </p>
                                </div>
                            </div>
                          </div>
                        )}
                    </form>
                </div>

                {/* Sticky Footer */}
                <div className="px-5 sm:px-6 py-3 bg-white border-t border-black/5 flex items-center justify-between shrink-0">
                    <button 
                        type="button" 
                        onClick={step === 1 ? onClose : () => setStep(1)} 
                        className="h-9 px-4 rounded-lg border border-black/5 text-[9px] font-black uppercase tracking-widest text-[#1E3A5F] hover:bg-re-bg transition-all active:scale-95"
                    >
                        {step === 1 ? 'Cancel' : 'Back'}
                    </button>

                    <div className="flex items-center gap-2">
                        {/* In edit mode: always show Save. In create step 1: show Continue. In create step 2: show Enroll */}
                        {isEditMode ? (
                            <>
                                {/* Navigate between steps in edit mode */}
                                {step === 1 && (
                                    <button
                                        type="button"
                                        onClick={() => setStep(2)}
                                        className="h-9 px-4 rounded-lg border border-black/5 text-[9px] font-black uppercase tracking-widest text-[#1E3A5F] hover:bg-re-bg transition-all active:scale-95 flex items-center gap-1"
                                    >
                                        Biometrics <ChevronRight size={12} />
                                    </button>
                                )}
                                <button
                                    type="submit"
                                    form="hire-personnel-form"
                                    disabled={isSubmitting}
                                    className="h-9 px-6 rounded-lg font-black text-[9px] uppercase tracking-widest shadow-lg flex items-center justify-center gap-2 text-[#1E3A5F] bg-re-gold hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
                                >
                                    {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : <><CheckCircle size={14} /> Save Changes</>}
                                </button>
                            </>
                        ) : step === 1 ? (
                            <button 
                                type="button" 
                                onClick={(e) => {
                                    e.preventDefault();
                                    const formEl = document.getElementById('hire-personnel-form');
                                    if (formEl.checkValidity()) {
                                        setStep(2);
                                    } else {
                                        formEl.reportValidity();
                                    }
                                }} 
                                className="h-9 px-6 rounded-lg bg-re-grad-navy text-white font-black text-[9px] uppercase tracking-widest shadow-md hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-1.5"
                            >
                                Continue <ChevronRight size={14} />
                            </button>
                        ) : (
                            <button 
                                type="submit" 
                                form="hire-personnel-form"
                                disabled={isSubmitting} 
                                className="h-9 px-6 rounded-lg font-black text-[9px] uppercase tracking-widest shadow-lg flex items-center justify-center gap-2 text-[#1E3A5F] bg-re-gold hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50" 
                            >
                                {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : <><CheckCircle size={14} /> Enroll Personnel</>}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
};

const HRCentral = () => {
    const { manager } = useAuth();
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedStaff, setSelectedStaff] = useState(null);
    const [openDropdownId, setOpenDropdownId] = useState(null);
    const [showDeptFilter, setShowDeptFilter] = useState(false);
    const [selectedDept, setSelectedDept] = useState('All Departments');
    const [showAllDeptsModal, setShowAllDeptsModal] = useState(false);
    const [isDeptSelected, setIsDeptSelected] = useState(window.innerWidth >= 768);
    const [activeDropdown, setActiveDropdown] = useState(null);
    const [showHireModal, setShowHireModal] = useState(false);
    const [editingStaff, setEditingStaff] = useState(null);

    const openEditModal = (staffMember) => {
        setEditingStaff(staffMember);
        setShowHireModal(true);
        setOpenDropdownId(null);
    };

    const closeHireModal = () => {
        setShowHireModal(false);
        setEditingStaff(null);
    };

    const [staff, setStaff] = useState([]);
    const [isActionLoading, setIsActionLoading] = useState(false);
    const departments = ['Academic Staff', 'Administration', 'Leadership', 'Support Staff'];

    const handleResendInvite = async (staffId) => {
        if (!window.confirm("This will reset the staff password and send a new invitation email. Proceed?")) return;
        setIsActionLoading(true);
        try {
            await staffService.resendInvitation(staffId);
            window.alert("Invitation resent successfully.");
        } catch (error) {
            window.alert(error.response?.data?.message || "Failed to resend invitation.");
        } finally {
            setIsActionLoading(false);
            setOpenDropdownId(null);
        }
    };
    
    const [stats, setStats] = useState({
        totalStaff: '0',
        activePercent: '100%',
        presentCount: 0,
        absentCount: 0,
        avgEvaluation: '85%',
        retentionRate: '98%'
    });
    const [loading, setLoading] = useState(true);

    const fetchStaff = async () => {
        if (!manager?.school_id) return;
        setLoading(true);
        try {
            const res = await staffService.getStaff();
            if (res.success) {
                const mapped = (res.data || []).map(s => {
                    // Semi-deterministic variation for evaluation and attendance for a "live" feel
                    const seed = (s.id || 0) % 15;
                    const evalScore = 80 + seed;
                    const attenScore = 90 + (seed % 10);
                    
                    return {
                        id: s.user_uid || s.id,
                        real_id: s.id,
                        name: `${s.first_name || ''} ${s.last_name || ''}`.trim(),
                        role: s.role_name || s.role_code,
                        role_code: s.role_code || '',
                        department: s.role_code === 'TEACHER' ? 'Academic Staff' : 
                                   ['HOD', 'DOS'].includes(s.role_code) ? 'Leadership' :
                                   ['ACCOUNTANT'].includes(s.role_code) ? 'Administration' : 'Support Staff',
                        phone: s.phone || 'N/A',
                        email: s.email,
                        photo: s.photo,
                        location: s.sector ? `${s.sector}, ${s.district}` : (s.district || 'N/A'),
                        status: s.is_active ? 'Expected' : 'Inactive',
                        evaluation: evalScore,
                        attendance: attenScore,
                        joinedDate: s.created_at ? new Date(s.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A',
                        rfid_uid: s.rfid_uid,
                        fingerprint_id: s.fingerprint_id,
                        identity_remarks: s.identity_remarks
                    };
                });
                setStaff(mapped);
                
                // Calculate real stats
                const total = mapped.length;
                const active = mapped.filter(s => s.status === 'Expected').length;
                const activePct = total > 0 ? Math.round((active / total) * 100) : 0;
                
                // Calculate Average Evaluation (Scale 1-10)
                const avgEval = mapped.length > 0 
                    ? (mapped.reduce((acc, curr) => acc + curr.evaluation, 0) / (mapped.length * 10)).toFixed(1)
                    : '0.0';

                // Calculate Retention Rate (Mocked logic but based on active/total)
                const retention = total > 0 ? (95 + (activePct / 20)).toFixed(1) : '0.0';
                
                setStats({ 
                    totalStaff: total.toString(),
                    activePercent: `${activePct}%`,
                    presentCount: active,
                    absentCount: total - active,
                    avgEvaluation: avgEval,
                    retentionRate: `${retention}%`
                });
            }
        } catch (err) {
            console.error("Failed to fetch staff:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStaff();
    }, [manager]);

    const handleHire = async (formData) => {
        try {
            const res = await staffService.createStaff(formData);
            if (res.success) {
                alert("Personnel account created successfully!");
                fetchStaff();
                return true;
            }
        } catch (err) {
            console.error("Failed to hire staff:", err);
            alert(err.response?.data?.message || "Hiring failed. Please check inputs.");
            return false;
        }
    };

    const handleEditStaff = async (staffId, biometricPayload, photoFile) => {
        try {
            // 1. Update biometrics (always)
            const res = await staffService.updateStaff(staffId, biometricPayload);
            if (!res.success) throw new Error(res.message || 'Update failed');

            // 2. If a new photo was chosen, upload it separately
            if (photoFile) {
                const photoData = new FormData();
                photoData.append('photo', photoFile);
                await staffService.updateStaffPhoto(staffId, photoData);
            }

            alert("Staff profile updated successfully!");
            fetchStaff();
            return true;
        } catch (err) {
            console.error("Failed to update staff:", err);
            alert(err.response?.data?.message || err.message || "Update failed. Please try again.");
            return false;
        }
    };

    const filteredStaff = staff.filter(s =>
        (s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            s.id.toLowerCase().includes(searchTerm.toLowerCase()) || 
            s.role.toLowerCase().includes(searchTerm.toLowerCase())) &&
        (selectedDept === 'All Departments' || s.department === selectedDept)
    );

    return (
        <div className="animate-in fade-in duration-700 bg-re-bg min-h-screen">
            <StaffModal
                staff={selectedStaff}
                onClose={() => setSelectedStaff(null)}
            />

            <HireModal 
                isOpen={showHireModal}
                onClose={closeHireModal}
                onHire={handleHire}
                onEdit={handleEditStaff}
                editingStaff={editingStaff}
                departments={departments}
            />

            {/* Mobile "More Departments" Modal */}
            {showAllDeptsModal && createPortal(
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in" onClick={() => setShowAllDeptsModal(false)} />
                    <div className="relative bg-white w-full max-w-sm rounded-[2rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="px-6 py-5 border-b border-black/5 flex items-center justify-between">
                            <div>
                                <h3 className="text-sm font-black text-re-text uppercase tracking-widest">Select Department</h3>
                                <p className="text-[10px] text-re-text-muted font-bold mt-0.5">Filter the staff overview</p>
                            </div>
                            <button onClick={() => setShowAllDeptsModal(false)} className="w-8 h-8 flex items-center justify-center rounded-xl bg-re-bg text-re-text-muted hover:bg-black/10 transition-colors">
                                <X size={14} />
                            </button>
                        </div>
                        <div className="p-4 grid grid-cols-2 gap-2">
                            {departments.map(dept => (
                                <button
                                    key={dept}
                                    onClick={() => {
                                        setSelectedDept(dept);
                                        setShowAllDeptsModal(false);
                                    }}
                                    className={`h-12 flex items-center gap-2 px-4 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all ${selectedDept === dept
                                        ? 'bg-re-navy/10 border-re-navy/30 text-re-navy ring-1 ring-re-navy/30'
                                        : 'bg-white border-black/5 text-re-text-muted hover:border-black/10'
                                        }`}
                                >
                                    {selectedDept === dept && <CheckCircle size={14} className="text-re-navy" />}
                                    {dept}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>, document.body
            )}

            {/* ── High-Fidelity Hero Section (Institutional Pattern) ── */}
            <div className="relative w-full min-h-[220px] overflow-hidden">
                <div className="absolute inset-0 bg-[#0a192f]/85 z-10 backdrop-blur-[2px]"></div>
                {/* Fallback image to generic school/dashboard asset or standard teacher asset */}
                <img src="/teacher.jpg" alt="Hero" className="absolute inset-0 w-full h-full object-cover scale-105 opacity-50  " />
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-[#1E3A5F]/40 via-transparent to-transparent z-10 max-w-[1600px] mx-auto"></div>

                <div className="relative z-20 max-w-[1600px] mx-auto px-6 md:px-12 pt-12 pb-16 flex items-center gap-8">
                    {/* Big Icon for Desktop */}
                    <div className="space-y-1">
                        <div className="flex items-center gap-2 mb-1">
                            <span className="w-5 h-1 rounded-full animate-pulse" style={{ background: "#FEBF10" }}></span>
                            <p className="text-[9px] font-black uppercase tracking-[0.3em]" style={{ color: "#FEBF10" }}>Organizational Resource</p>
                        </div>
                        <h1 className="text-xl sm:text-3xl md:text-3xl font-black text-white tracking-tighter leading-none mb-1 mt-1 uppercase">HR <span style={{ color: "#FEBF10" }}>Central</span></h1>
                        <p className="text-[8px] sm:text-[9px] md:text-[11px] font-bold text-white/40 max-w-lg leading-relaxed uppercase tracking-widest italic opacity-60">Professional Personnel & Leadership Management Engine</p>
                    </div>
                </div>
            </div>

            {/* ── Consolidated High-Fidelity Card (Dashboard Stats Style) ── */}
            <div className="max-w-[1600px] mx-auto px-6 md:px-12 -mt-24 relative z-20 pb-20">
                <div className="bg-white rounded-t-[32px] shadow-2xl border border-black/5 overflow-hidden flex flex-col">

                    {/* Top Layer: Stats Grid + Actions (Dashboard Style) */}
                    <div className={`${!isDeptSelected ? 'hidden md:grid' : 'grid'} grid-cols-1 lg:grid-cols-4 border-b border-black/5`}>
                        {/* Stats (3 columns on lg) */}
                        <div className="lg:col-span-3 grid grid-cols-2 md:grid-cols-4 divide-x divide-y md:divide-y-0 divide-black/5">
                             {[
                                { label: 'Total Personnel', value: stats.totalStaff, icon: <Users size={12} className="mb-1.5" /> },
                                { 
                                    label: 'Active Present', 
                                    value: stats.activePercent, 
                                    subValue: `${stats.presentCount} present | ${stats.absentCount} absent`,
                                    icon: <Activity size={12} className="mb-1.5" /> 
                                },
                                { label: 'Evaluation Avg', value: stats.avgEvaluation, icon: <Award size={12} className="mb-1.5" /> },
                                { label: 'Retention Rate', value: stats.retentionRate, icon: <TrendingUp size={12} className="mb-1.5" /> }
                            ].map((stat, i) => (
                                <div key={i} className="p-3 sm:p-5 flex flex-col items-center justify-center text-center group hover:bg-re-bg/20 transition-all cursor-default">
                                    <div className="mb-1 sm:mb-1.5 opacity-40 shrink-0" style={{ color: "#FEBF10" }}>
                                        {stat.icon}
                                    </div>
                                    <span className="text-sm sm:text-xl font-black text-re-text tracking-tighter group-hover:text-[#1E3A5F] transition-colors">
                                        {stat.value}
                                    </span>
                                    <p className="text-[6px] sm:text-[7px] font-black text-re-text-muted uppercase tracking-[0.2em] mt-0.5 opacity-60">
                                        {stat.label}
                                    </p>
                                    {stat.subValue && (
                                        <p className="text-[6px] sm:text-[7px] font-black uppercase tracking-widest mt-0.5 opacity-30" style={{ color: "#1E3A5F" }}>
                                            {stat.subValue}
                                        </p>
                                    )}
                                </div>
                            ))}
                        </div>

                        {/* Right Side Actions Section (Desktop) */}
                        <div className="hidden lg:flex flex-col border-l border-black/5 bg-re-bg/30 p-6 justify-center gap-3 relative">
                            {/* Export Dropdown */}
                            <div className="relative">
                                <button 
                                    onClick={() => setActiveDropdown(activeDropdown === 'export' ? null : 'export')}
                                    className="w-full h-11 flex items-center justify-center gap-2 text-white rounded-xl font-black text-[9px] uppercase tracking-widest shadow-xl hover:scale-[1.02] active:scale-95 transition-all"
                                    style={{ background: "linear-gradient(135deg, #1E3A5F 0%, #0D2644 100%)" }}
                                >
                                    <Download size={14} />
                                    <span>Export Records</span>
                                    <ChevronDown size={12} className={`transition-transform duration-300 ${activeDropdown === 'export' ? 'rotate-180' : ''}`} />
                                </button>

                                {activeDropdown === 'export' && (
                                    <>
                                        <div className="fixed inset-0 z-[40]" onClick={() => setActiveDropdown(null)} />
                                        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-black/5 shadow-2xl rounded-2xl overflow-hidden py-1 z-[50] animate-in slide-in-from-top-2 duration-200">
                                            <button className="w-full text-left px-4 py-3 text-[10px] font-black uppercase tracking-widest text-re-text hover:bg-re-bg transition-colors flex items-center gap-2.5">
                                                <FileText size={14} style={{ color: "#FEBF10" }} /> Export into PDF
                                            </button>
                                            <button className="w-full text-left px-4 py-3 text-[10px] font-black uppercase tracking-widest text-re-text hover:bg-re-bg transition-colors flex items-center gap-2.5 border-t border-black/5">
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
                                    className="w-full h-11 flex items-center justify-center gap-2 bg-white border border-black/5 text-re-text font-black text-[9px] uppercase tracking-widest rounded-xl hover:bg-re-bg hover:shadow-re-soft transition-all"
                                >
                                    <ShieldCheck size={14} style={{ color: "#FEBF10" }} />
                                    <span>HR Actions</span>
                                    <ChevronDown size={12} className={`transition-transform duration-300 ${activeDropdown === 'actions' ? 'rotate-180' : ''}`} />
                                </button>

                                {activeDropdown === 'actions' && (
                                    <>
                                        <div className="fixed inset-0 z-[40]" onClick={() => setActiveDropdown(null)} />
                                        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-black/5 shadow-2xl rounded-2xl overflow-hidden py-1 z-[50] animate-in slide-in-from-top-2 duration-200">
                                            <button 
                                                onClick={() => { setShowHireModal(true); setActiveDropdown(null); }}
                                                className="w-full text-left px-4 py-3 text-[10px] font-black uppercase tracking-widest text-[#1E3A5F] hover:bg-re-navy/5 transition-colors flex items-center gap-2.5"
                                            >
                                                <UserPlus size={14} /> Hire New Staff
                                            </button>
                                            <button className="w-full text-left px-4 py-3 text-[10px] font-black uppercase tracking-widest text-re-text hover:bg-re-bg transition-colors flex items-center gap-2.5 border-t border-black/5">
                                                <Upload size={14} style={{ color: "#FEBF10" }} /> Import Roster
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Middle Layer: Management Control (Integrated Search & Filter) */}
                    <div className={`${!isDeptSelected ? 'hidden md:flex' : 'flex'} p-4 md:px-8 border-b border-black/5 flex-col md:flex-row items-center gap-3 bg-white/50`}>
                        <div className="relative flex-1 w-full group">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-re-text-muted/40 group-focus-within:text-[#1E3A5F] transition-colors" size={14} />
                            <input
                                type="text"
                                placeholder="Search by name, ID or role..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full h-9 sm:h-10 bg-re-bg rounded-xl pl-11 pr-4 font-extrabold outline-none border border-transparent focus:border-[#1E3A5F]/20 focus:bg-white transition-all text-re-text text-sm sm:text-xs tracking-tight shadow-inner"
                            />
                        </div>
                        <div className="flex items-center gap-2 w-full md:w-auto">
                            <button
                                onClick={() => setShowDeptFilter(!showDeptFilter)}
                                className="h-9 sm:h-10 px-3 sm:px-5 bg-white border border-black/5 rounded-xl flex items-center gap-1.5 sm:gap-2 text-re-text-muted font-black text-[8px] sm:text-[9px] uppercase tracking-widest hover:bg-re-bg transition-all shadow-sm whitespace-nowrap"
                            >
                                <Filter size={13} style={{ color: "#FEBF10" }} />
                                Filter By Dept
                            </button>
                        </div>
                    </div>

                    {/* Conditional Dept Filter Section */}
                    {showDeptFilter && (
                        <div className={`${!isDeptSelected ? 'hidden md:flex' : 'flex'} px-6 md:px-8 py-4 bg-re-bg/20 border-b border-black/5 items-center overflow-x-auto gap-2 custom-scrollbar animate-in slide-in-from-top-2 fade-in duration-300`}>

                            {/* All Depts Option */}
                            <button
                                onClick={() => setSelectedDept('All Departments')}
                                className={`flex items-center justify-center gap-1.5 shrink-0 h-7 sm:h-9 px-3 sm:px-5 rounded-lg sm:rounded-xl border font-black text-[7px] sm:text-[9px] uppercase tracking-widest transition-all whitespace-nowrap ${selectedDept === 'All Departments'
                                    ? 'text-white shadow-xl hover:scale-105'
                                    : 'bg-white border-black/5 text-re-text-muted hover:bg-re-bg hover:text-re-text'
                                    }`}
                                style={selectedDept === 'All Departments' ? { background: "#1E3A5F", borderColor: "#1E3A5F" } : {}}
                            >
                                {selectedDept === 'All Departments' && <CheckCircle size={10} className="sm:w-3 sm:h-3 opacity-80" />}
                                All Departments
                            </button>

                            {/* Individual Depts */}
                            {departments.map((dept, idx) => (
                                <button
                                    key={dept}
                                    onClick={() => setSelectedDept(dept)}
                                    className={`flex items-center justify-center gap-1.5 shrink-0 h-7 sm:h-9 px-3 sm:px-5 rounded-lg sm:rounded-xl border font-black text-[7px] sm:text-[9px] uppercase tracking-widest transition-all whitespace-nowrap ${idx > 1 ? 'hidden md:flex' : ''} ${selectedDept === dept
                                        ? 'text-white shadow-xl hover:scale-105'
                                        : 'bg-white border-black/5 text-re-text-muted hover:bg-re-bg hover:text-re-text'
                                        }`}
                                    style={selectedDept === dept ? { background: "#1E3A5F", borderColor: "#1E3A5F" } : {}}
                                >
                                    {selectedDept === dept && <CheckCircle size={10} className="sm:w-3 sm:h-3 opacity-80" />}
                                    {dept}
                                </button>
                            ))}

                            {/* More Trigger for Mobile */}
                            <button
                                onClick={() => setShowAllDeptsModal(true)}
                                className="md:hidden flex items-center justify-center gap-1.5 shrink-0 h-7 px-3 rounded-lg border border-black/5 bg-white font-black text-[7px] uppercase tracking-widest transition-all shadow-sm active:scale-95"
                                style={{ color: "#FEBF10" }}
                            >
                                <Plus size={10} /> More
                            </button>
                        </div>
                    )}

                    {/* Bottom Layer: Selection Gatekeeper or Records Repository */}
                    {!isDeptSelected && (
                        <div className="md:hidden p-4 sm:p-6 bg-re-bg/20 flex flex-col items-center justify-center text-center py-8 sm:py-12 animate-in fade-in zoom-in-95 duration-500">
                            <div className="w-12 h-12 sm:w-16 sm:h-16 bg-white rounded-2xl sm:rounded-[2rem] shadow-xl flex items-center justify-center mb-4 sm:mb-6 border border-black/5 animate-bounce" style={{ color: "#FEBF10" }}>
                                <Briefcase size={24} className="sm:w-8 sm:h-8" />
                            </div>
                            <h2 className="text-lg sm:text-xl font-black text-re-text tracking-tighter uppercase mb-1 sm:mb-2">Select a Division</h2>
                            <p className="text-[8px] sm:text-[10px] text-re-text-muted font-bold uppercase tracking-widest leading-relaxed mb-6 sm:mb-8 max-w-[200px] sm:max-w-[240px]">Select a specific institutional department to view personnel.</p>

                            <div className="grid grid-cols-2 gap-2 sm:gap-3 w-full max-w-sm">
                                {departments.map(dept => (
                                    <button
                                        key={dept}
                                        onClick={() => {
                                            setSelectedDept(dept);
                                            setIsDeptSelected(true);
                                        }}
                                        className="h-14 sm:h-16 flex  items-center justify-center gap-2.5 sm:gap-2 bg-white border border-black/5 rounded-xl sm:rounded-2xl shadow-sm transition-all group active:scale-95"
                                    >
                                        <div className="flex flex-col items-center gap-0.5">
                                            <span className="text-[9px] sm:text-[10px] font-black text-re-text group-hover:text-[#1E3A5F] uppercase">{dept}</span>
                                            <span className="text-[6px] sm:text-[7px] font-bold text-re-text-muted uppercase tracking-widest opacity-40 italic">View Roster</span>
                                        </div>
                                        <ChevronRight size={14} className="text-re-text-muted" />

                                    </button>
                                ))}
                                <button
                                    onClick={() => {
                                        setSelectedDept('All Departments');
                                        setIsDeptSelected(true);
                                    }}
                                    className="col-span-2 h-12 sm:h-14 text-white rounded-xl sm:rounded-2xl font-black text-[8px] sm:text-[9px] uppercase tracking-widest shadow-xl hover:scale-105 active:scale-95 transition-all mt-1 sm:mt-2"
                                    style={{ background: "linear-gradient(135deg, #1E3A5F 0%, #0D2644 100%)" }}
                                >
                                    View All Personnel
                                </button>
                            </div>
                        </div>
                    )}

                    <div className={`${!isDeptSelected ? 'hidden md:block' : 'block'} overflow-x-auto bg-white`}>
                        {isDeptSelected && (
                            <div className="md:hidden px-6 py-3 bg-white border-b border-black/5 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full" style={{ background: "#FEBF10" }}></div>
                                    <span className="text-[9px] font-black text-re-text uppercase tracking-widest">{selectedDept} Roster</span>
                                </div>
                                <button
                                    onClick={() => setIsDeptSelected(false)}
                                    className="text-[8px] font-black uppercase tracking-widest hover:underline"
                                    style={{ color: "#FEBF10" }}
                                >
                                    Change Dept
                                </button>
                            </div>
                        )}
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-re-bg/20 border-b border-black/5">
                                    <th className="px-4 sm:px-8 py-2.5 sm:py-3 text-[7px] sm:text-[8px] font-black text-re-text-muted uppercase tracking-[0.2em] opacity-40 border-r border-black/5 last:border-r-0">Personnel Info</th>
                                    <th className="hidden md:table-cell px-8 py-3 text-[8px] font-black text-re-text-muted uppercase tracking-[0.2em] opacity-40 border-r border-black/5">Designation</th>
                                    <th className="hidden md:table-cell px-8 py-3 text-[8px] font-black text-re-text-muted uppercase tracking-[0.2em] opacity-40 border-r border-black/5">Reliability</th>
                                    <th className="hidden md:table-cell px-8 py-3 text-[8px] font-black text-re-text-muted uppercase tracking-[0.2em] opacity-40 border-r border-black/5">Performance</th>
                                    <th className="px-4 sm:px-8 py-2.5 sm:py-3 text-[7px] sm:text-[8px] font-black text-re-text-muted uppercase tracking-[0.2em] opacity-40 text-right">Records</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-black/5">
                                {loading ? (
                                    <tr>
                                        <td colSpan="5" className="p-12 text-center">
                                            <div className="w-8 h-8 border-4 border-re-navy border-t-transparent rounded-full animate-spin mx-auto mb-4" style={{ borderColor: "#1E3A5F #0000 0000 0000" }}></div>
                                            <p className="text-[10px] font-black text-re-text-muted uppercase tracking-widest">Querying Personnel DB...</p>
                                        </td>
                                    </tr>
                                ) : (
                                    <>
                                        {filteredStaff.map((s, index) => {
                                            const isLastItems = index >= filteredStaff.length - 2 && filteredStaff.length > 2;
                                            return (
                                                <tr
                                                    key={s.id}
                                                    onClick={() => setSelectedStaff(s)}
                                                    className="hover:bg-re-bg/60 even:bg-re-bg/20 transition-colors group cursor-pointer"
                                                >
                                                    <td className="px-4 sm:px-8 py-2 sm:py-3 border-r border-black/5 last:border-r-0">
                                                        <div className="flex items-center gap-3 sm:gap-4">
                                                            <div className="w-8 h-8 rounded-full bg-re-bg border border-black/5 flex-shrink-0 flex items-center justify-center text-re-text-muted transition-colors relative shadow-inner overflow-hidden group-hover:bg-white">
                                                                {s.photo ? (
                                                                    <img 
                                                                        src={(import.meta.env.VITE_API_URL || 'http://localhost:5100') + s.photo} 
                                                                        className="w-full h-full object-cover" 
                                                                        alt={s.name}
                                                                    />
                                                                ) : (
                                                                    <User size={12} className="sm:w-3.5 sm:h-3.5 opacity-40 text-re-text-muted" />
                                                                )}
                                                                <div className="absolute -bottom-1 -right-1 w-2.5 h-2.5 bg-white border border-black/5 rounded-full flex items-center justify-center">
                                                                    <div className={`w-1 h-1 sm:w-1.5 h-1.5 rounded-full ${s.status === 'Expected' ? 'bg-emerald-500' : 'bg-red-400'}`}></div>
                                                                </div>
                                                            </div>
                                                            <div>
                                                                <p className="text-[11px] font-black text-re-text tracking-tight uppercase leading-none mb-0.5 group-hover:text-[#1E3A5F] transition-colors">{s.name}</p>
                                                                <p className="text-[7px] sm:text-[8px] font-bold text-re-text-muted opacity-30 uppercase tracking-widest leading-none font-mono italic">{s.id}</p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="hidden md:table-cell px-8 py-5">
                                                        <div className="flex flex-col gap-0.5">
                                                            <p className="text-[10px] font-black text-re-text uppercase tracking-tight truncate max-w-[150px]">{s.role}</p>
                                                            <div className="flex items-center gap-2">
                                                                <p className="text-[9px] font-bold text-re-text-muted opacity-50 uppercase tracking-widest">{s.department}</p>
                                                                {(s.rfid_uid || s.fingerprint_id) && (
                                                                    <div className="flex items-center gap-1 bg-black/5 px-1.5 py-0.5 rounded ml-1">
                                                                        {s.rfid_uid && <IdCard size={10} className="text-[#1E3A5F] opacity-70" title="RFID Card Assigned" />}
                                                                        {s.fingerprint_id && <Fingerprint size={10} className="text-emerald-500 opacity-70" title="Biometric Fingerprint Assigned" />}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="hidden md:table-cell px-8 py-5">
                                                        <div className="space-y-1.5 max-w-[100px]">
                                                            <div className="flex items-center justify-between">
                                                                <p className="text-[9px] font-black text-re-text">{s.attendance}% Present</p>
                                                            </div>
                                                            <div className="w-full h-1 bg-black/5 rounded-full overflow-hidden">
                                                                <div className="h-full" style={{ width: `${s.attendance}%`, background: s.attendance >= 95 ? "linear-gradient(135deg, #1E3A5F 0%, #3D5A80 100%)" : "#FEBF10" }}></div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="hidden md:table-cell px-8 py-5">
                                                        <div className={`inline-flex px-3 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest ring-1 ring-inset ${s.status === 'Exceptional' ? 'bg-emerald-50 text-emerald-600 ring-emerald-500/20' :
                                                            s.status === 'Expected' ? 'bg-blue-50 text-blue-600 ring-blue-500/20' :
                                                                'bg-re-navy/5 text-re-navy ring-re-navy/20'
                                                            }`} style={s.status !== 'Exceptional' && s.status !== 'Expected' ? { color: "#1E3A5F" } : {}}>
                                                            {s.status} Score: {s.evaluation}
                                                        </div>
                                                    </td>
                                                    <td className="px-4 sm:px-8 py-3 sm:py-5 text-right relative">
                                                        <div className="flex items-center gap-2 sm:gap-3 justify-end">
                                                            <button
                                                                className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center text-re-text-muted hover:bg-re-bg transition-all border border-transparent hover:border-black/5"
                                                                style={{ color: "inherit" }}
                                                                onClick={(e) => { e.stopPropagation(); }}
                                                            >
                                                                <Phone size={12} className="sm:w-3.5 sm:h-3.5" />
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
                                                                                className="w-full text-left px-4 py-3 text-[10px] font-black uppercase tracking-widest text-[#1E3A5F] hover:bg-re-navy/5 transition-colors flex items-center gap-2.5"
                                                                                onClick={() => { setSelectedStaff(s); setOpenDropdownId(null); }}
                                                                            >
                                                                                <Eye size={13} /> View Full File
                                                                            </button>
                                                                            <button
                                                                                className="w-full text-left px-4 py-3 text-[10px] font-black uppercase tracking-widest text-emerald-600 hover:bg-emerald-50 transition-colors flex items-center gap-2.5 border-t border-black/5"
                                                                                onClick={() => openEditModal(s)}
                                                                            >
                                                                                <Edit3 size={13} /> Edit Staff
                                                                            </button>
                                                                            <button
                                                                                className="w-full text-left px-4 py-3 text-[10px] font-black uppercase tracking-widest text-re-text hover:bg-re-bg transition-colors flex items-center gap-2.5 border-t border-black/5"
                                                                                onClick={() => handleResendInvite(s.id)}
                                                                                disabled={isActionLoading}
                                                                            >
                                                                                {isActionLoading ? <Loader2 size={13} className="animate-spin" /> : <Mail size={13} className="text-[#FEBF10]" />} 
                                                                                Resend Invitation
                                                                            </button>
                                                                            <button
                                                                                className="w-full text-left px-4 py-3 text-[10px] font-black uppercase tracking-widest text-re-text hover:bg-re-bg transition-colors flex items-center gap-2.5 border-t border-black/5"
                                                                                onClick={() => setOpenDropdownId(null)}
                                                                            >
                                                                                <FileSignature size={13} className="text-re-text-muted" /> Add Appraisal
                                                                            </button>
                                                                            <button
                                                                                className="w-full text-left px-4 py-3 text-[10px] font-black uppercase tracking-widest text-re-text hover:bg-re-bg transition-colors flex items-center gap-2.5 border-t border-black/5"
                                                                                onClick={() => setOpenDropdownId(null)}
                                                                            >
                                                                                <Printer size={13} className="text-re-text-muted" /> Export Profile
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
                                        {filteredStaff.length === 0 && (
                                            <tr>
                                                <td colSpan="5" className="p-12 text-center text-[10px] font-black text-re-text-muted uppercase tracking-widest italic opacity-40">No personnel records found matching your criteria.</td>
                                            </tr>
                                        )}
                                    </>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Table Footer */}
                    <div className={`${!isDeptSelected ? 'hidden md:flex' : 'flex'} px-4 sm:px-8 py-4 bg-re-bg/20 border-t border-black/5 flex flex-row items-center justify-between gap-4`}>
                        <div className="flex items-center gap-3 sm:gap-4">
                            <div className="hidden xs:flex items-center gap-2">
                                <div className="w-1 h-1 rounded-full animate-pulse" style={{ background: "#FEBF10" }}></div>
                                <p className="text-[6px] sm:text-[7px] font-black text-re-text-muted uppercase tracking-[0.2em] opacity-40 italic whitespace-nowrap">HR Database Sync</p>
                            </div>
                            <div className="hidden xs:block w-px h-3 bg-black/10"></div>
                            <p className="text-[6px] sm:text-[7px] font-black text-re-text-muted uppercase tracking-[0.2em] opacity-40 italic whitespace-nowrap">Displaying {filteredStaff.length} Records</p>
                        </div>

                        <div className="flex items-center gap-1 sm:gap-1.5">
                            <button className="h-7 sm:h-7.5 px-2 sm:px-3 rounded-lg bg-white border border-black/5 text-[7px] sm:text-[8px] font-black text-re-text-muted tracking-tighter opacity-40 hover:opacity-100 transition-all font-mono italic">Prev_set</button>
                            <div className="h-7 sm:h-7.5 px-3 sm:px-4 rounded-lg flex items-center justify-center bg-white border border-black/5 text-[7px] sm:text-[8px] font-black text-re-text tracking-tighter">Page 01</div>
                            <button 
                                className="h-7 sm:h-7.5 px-3 sm:px-4 rounded-lg text-white text-[7px] sm:text-[8px] font-black shadow-xl tracking-tighter"
                                style={{ background: "linear-gradient(135deg, #1E3A5F 0%, #0D2644 100%)" }}
                            >
                                Next_set
                            </button>
                        </div>
                    </div>
                </div>

                {/* Brand/System Metadata */}
                <div className="flex flex-col md:flex-row items-center justify-between mt-8 px-4 gap-4">
                    <p className="text-[7px] text-re-text-muted font-black uppercase tracking-[0.3em] opacity-30 italic">Developed & Engineered by Babyeyi Intelligence Systems</p>
                    <div className="flex items-center gap-4 opacity-20">
                        <span className="text-[8px] font-black text-re-text uppercase tracking-widest">HR Module</span>
                        <span className="text-[8px] font-black text-re-text uppercase tracking-widest">v1.2.0-Reloaded</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default HRCentral;
