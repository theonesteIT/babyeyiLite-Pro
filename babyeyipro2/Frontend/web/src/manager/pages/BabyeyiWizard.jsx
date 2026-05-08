import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import {
    School, BookOpen, Landmark, PenTool, Layers,
    Users, Eye, ChevronRight, ChevronLeft, CheckCircle2,
    Plus, ShieldCheck, CreditCard, X, MoveRight,
    HelpCircle, Settings, Upload, Search, Download,
    Mail, MessageSquare, MoreVertical, Trash2, Edit3,
    Clock, Tag, CircleDollarSign, Send, FileText, Printer,
    Flag, User, Briefcase
} from 'lucide-react';

// ── OFFICIAL DOCUMENT VIEW (Scaled & Focused) ──────────────────────────────
const OfficialDocView = ({ doc, onClose }) => {
    return createPortal(
        <div className="fixed inset-0 z-[1100] flex items-center justify-center bg-re-navy/80 backdrop-blur-md p-4 sm:p-6 overflow-y-auto custom-scrollbar">
            <div className="relative w-full max-w-2xl h-auto max-h-[92vh] bg-white rounded-2xl shadow-3xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-500">

                {/* TOOLBAR - Compact */}
                <div className="sticky top-0 z-20 bg-re-navy px-5 py-2.5 flex items-center justify-between text-white shrink-0 shadow-lg">
                    <div className="flex items-center gap-3">
                        <button onClick={onClose} className="p-1.5 hover:bg-white/10 rounded-lg text-white/60 hover:text-white transition-all">
                            <X size={16} />
                        </button>
                        <div className="h-4 w-px bg-white/10 mx-1" />
                        <div>
                            <p className="text-[9px] font-black uppercase tracking-widest text-re-gold leading-none">Official Ledger</p>
                            <p className="text-[7px] font-bold opacity-40 uppercase tracking-tight mt-0.5">{doc.id}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button className="h-8 w-8 bg-white/10 hover:bg-white/20 rounded-lg flex items-center justify-center transition-all">
                            <Printer size={12} />
                        </button>
                        <button className="h-8 px-4 bg-re-gold text-re-navy rounded-lg text-[9px] font-black uppercase tracking-widest transition-all shadow-lg flex items-center gap-2 hover:scale-[1.02] active:scale-95">
                            <Download size={12} /> PDF
                        </button>
                    </div>
                </div>

                {/* PAPER BODY - Reduced Scale */}
                <div className="flex-1 bg-white p-8 relative overflow-y-auto custom-scrollbar">

                    {/* MINISTERIAL HEADER - Compact */}
                    <div className="flex items-center justify-between mb-8 gap-4 border-b border-re-navy pb-6">
                        <div className="w-16 h-16 border border-black/5 flex items-center justify-center p-1.5 rounded-lg bg-re-bg">
                            <School size={32} className="text-re-navy/10" />
                        </div>
                        <div className="flex-1 text-center font-serif">
                            <p className="text-[6px] font-black text-re-text-muted uppercase tracking-[0.3em] mb-1">Republic of Rwanda · MINEDUC · NESA</p>
                            <h1 className="text-lg font-black text-re-navy tracking-tighter uppercase mb-2">Rwanda Royal Academy</h1>
                            <div className="flex items-center justify-center gap-4 opacity-60">
                                <span className="text-[9px] font-bold text-re-navy">Nyarugenge</span>
                                <span className="text-[9px] font-bold text-re-navy">2024-2025</span>
                            </div>
                        </div>
                        <div className="w-16 h-16 flex items-center justify-center grayscale opacity-10">
                            <Flag size={32} />
                        </div>
                    </div>

                    {/* DOCUMENT CONTENT */}
                    <div className="space-y-8 font-serif text-re-navy">

                        <div className="p-4 bg-re-bg/20 rounded-xl border border-re-navy/5 text-center">
                            <p className="text-[7px] font-black text-re-gold uppercase tracking-widest mb-1">Administrative Authorization</p>
                            <p className="text-[11px] font-bold opacity-80 leading-relaxed italic">Fee parameters for: <strong className="not-italic text-re-navy font-black">{doc.class}</strong></p>
                        </div>

                        {/* FEE TABLE - Compact */}
                        <section>
                            <div className="flex items-center gap-2 mb-3">
                                <CircleDollarSign size={14} className="text-re-gold" />
                                <h3 className="text-[10px] font-black uppercase tracking-widest border-b border-re-gold pb-1">Ledger Breakdown</h3>
                            </div>
                            <table className="w-full text-left border-collapse">
                                <tbody className="divide-y divide-re-navy/5">
                                    <tr className="hover:bg-re-bg/20 text-[10px]">
                                        <td className="py-2.5 font-bold">Registration & Tuition</td>
                                        <td className="py-2.5 font-black font-mono text-right">45,000</td>
                                    </tr>
                                    <tr className="hover:bg-re-bg/20 text-[10px]">
                                        <td className="py-2.5 font-bold">Institutional Insurance</td>
                                        <td className="py-2.5 font-black font-mono text-right">8,000</td>
                                    </tr>
                                    <tr className="border-t border-re-navy pt-2">
                                        <td className="py-4 text-[11px] font-black uppercase">Grand Total</td>
                                        <td className="py-4 text-base font-black font-mono text-right text-re-navy">{doc.total} RWF</td>
                                    </tr>
                                </tbody>
                            </table>
                        </section>

                        {/* SIGNATURES - Scaled Down */}
                        <section className="pt-6 border-t border-black/5">
                            <div className="grid grid-cols-3 gap-4 text-center">
                                <div className="space-y-2">
                                    <p className="text-[8px] font-black uppercase opacity-20">Principal</p>
                                    <div className="h-10 border-b border-re-navy/10 flex flex-col items-center justify-end pb-1">
                                        <PenTool size={14} className="text-re-navy/5" />
                                    </div>
                                    <p className="text-[7px] font-bold italic opacity-20">RRA Academy</p>
                                </div>
                                <div className="flex flex-col items-center justify-center">
                                    <div className="w-14 h-14 border border-re-navy/5 p-1 rounded-lg bg-white shadow-sm flex items-center justify-center">
                                        <div className="grid grid-cols-3 grid-rows-3 gap-0.5 w-full h-full opacity-5">
                                            {[...Array(9)].map((_, i) => <div key={i} className="bg-re-navy" />)}
                                        </div>
                                    </div>
                                    <p className="text-[6px] font-black uppercase text-re-gold tracking-[0.2em] mt-1">Verify</p>
                                </div>
                                <div className="space-y-2">
                                    <p className="text-[8px] font-black uppercase opacity-20">Stamp Area</p>
                                    <div className="w-10 h-10 border border-dashed border-re-navy/10 rounded-full mx-auto flex items-center justify-center">
                                        <ShieldCheck size={16} className="text-re-navy/5" />
                                    </div>
                                    <p className="text-[7px] font-bold italic opacity-10">Official</p>
                                </div>
                            </div>
                        </section>
                    </div>

                    {/* FOOTER - Minimal */}
                    <div className="mt-12 text-center opacity-20">
                        <p className="text-[7px] font-black uppercase tracking-[0.3em]">Institutional Record · {doc.id}</p>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
};

// ── BABYEYI CARD (Optimized Registry Item) ──────────────────────────
const BabyeyiCard = ({ record, onView, onEdit, onSend, onDownloadPDF }) => {
    const isApproved = record.status === 'Approved';
    const [openDropdown, setOpenDropdown] = useState(false);

    return (
        <div className="group relative bg-white rounded-[24px] border border-re-navy/5 hover:border-re-gold/40 hover:shadow-[0_24px_64px_-16px_rgba(30,58,95,0.1)] transition-all duration-300 overflow-hidden flex flex-col h-full">
            {/* Top Status Belt */}
            <div className={`h-1 w-full ${isApproved ? 'bg-gradient-to-r from-emerald-400 to-teal-400' : 'bg-gradient-to-r from-re-gold to-orange-400'}`} />

            <div className="p-4 flex flex-col h-full">
                {/* Header Information */}
                <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-10 h-10 bg-re-navy rounded-xl flex items-center justify-center shrink-0 shadow-lg shadow-re-navy/10">
                            <span className="text-white font-black text-[9px] text-center leading-tight tracking-tight uppercase px-1">
                                {record.class.split(' ')[0]}
                            </span>
                        </div>
                        <div className="min-w-0">
                            <p className="font-extrabold text-re-navy text-sm md:text-base truncate tracking-tighter leading-none mb-1.5">{record.class} · {record.id}</p>
                            <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="inline-flex px-2 py-0.5 rounded-md bg-re-bg border border-black/5 text-[10px] font-black text-re-navy/60 uppercase tracking-widest">
                                    Term 01 · 24/25
                                </span>
                                <div className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-widest bg-re-bg border border-black/5`}>
                                    <div className={`w-1.5 h-1.5 rounded-full ${isApproved ? 'bg-emerald-500' : 'bg-re-gold'}`} />
                                    <span className={isApproved ? 'text-emerald-600' : 'text-re-gold'}>{record.status}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="relative">
                        <button
                            onClick={(e) => { e.stopPropagation(); setOpenDropdown(!openDropdown); }}
                            className="w-7 h-7 rounded-lg flex items-center justify-center text-re-navy/20 hover:bg-re-bg hover:text-re-gold transition-all"
                        >
                            <MoreVertical size={14} />
                        </button>
                        {openDropdown && (
                            <>
                                <div className="fixed inset-0 z-40" onClick={() => setOpenDropdown(false)} />
                                <div className="absolute right-0 top-full mt-1.5 w-44 bg-white border border-black/5 shadow-2xl rounded-xl z-50 overflow-hidden py-1 animate-in fade-in zoom-in-95 duration-150 border-t-2 border-re-navy">
                                    <button onClick={() => { onView(record); setOpenDropdown(false); }} className="w-full text-left px-4 py-2.5 text-[11px] font-black uppercase tracking-widest text-re-navy hover:bg-re-bg transition-colors flex items-center gap-2">
                                        <Eye size={14} className="text-re-gold" /> View Doc
                                    </button>
                                    <button onClick={() => { onEdit(record); setOpenDropdown(false); }} className="w-full text-left px-4 py-2.5 text-[11px] font-black uppercase tracking-widest text-re-navy hover:bg-re-bg transition-colors flex items-center gap-2">
                                        <Edit3 size={14} className="text-re-text-muted" /> Refine
                                    </button>
                                    <button className="w-full text-left px-4 py-2.5 text-[11px] font-black uppercase tracking-widest text-red-500 hover:bg-red-50 transition-colors flex items-center gap-2 border-t border-black/5">
                                        <Trash2 size={14} /> Delete
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>

                {/* Technical Data Grid - REPLACED STAFF WITH BANK */}
                <div className="grid grid-cols-2 gap-2 mb-4">
                    <div className="p-2.5 bg-re-bg/50 border border-black/5 rounded-xl transition-all">
                        <p className="text-[10px] font-black uppercase tracking-wider text-re-text-muted/70 mb-0.5">Total Balance</p>
                        <p className="text-sm font-black text-re-navy font-mono tracking-tighter">RWF {record.total}</p>
                    </div>
                    <div className="p-2.5 bg-re-bg/50 border border-black/5 rounded-xl transition-all">
                        <p className="text-[10px] font-black uppercase tracking-wider text-re-text-muted/70 mb-0.5">Settlement Bank</p>
                        <div className="flex items-center gap-1.5 min-w-0">
                            <Landmark size={12} className="text-re-gold shrink-0" />
                            <p className="text-xs font-black text-re-navy truncate tracking-tight">{record.bank || 'Bank of Kigali'}</p>
                        </div>
                    </div>
                </div>

                {/* Footer Action Bar - WhatsApp Optimized */}
                <div className="mt-auto pt-3 border-t border-black/5 flex items-center gap-2">
                    <button
                        onClick={() => onView(record)}
                        className="flex-1 h-9 bg-re-navy text-white rounded-xl font-black text-xs uppercase tracking-wider shadow-lg shadow-re-navy/10 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 group/btn"
                    >
                        <Eye size={14} className="group-hover/btn:text-re-gold" /> View Doc
                    </button>
                    <button
                        onClick={() => onSend(record.id)}
                        className="w-9 h-9 border border-black/5 text-[#25D366] rounded-xl flex items-center justify-center hover:bg-[#25D366] hover:text-white transition-all shadow-sm group/wa"
                        title="WhatsApp Sync"
                    >
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" className="group-hover/wa:scale-110 transition-transform"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg>
                    </button>
                    <button
                        onClick={() => onDownloadPDF(record.id)}
                        className="w-9 h-9 bg-re-bg border border-black/5 text-rose-500 rounded-xl flex items-center justify-center hover:bg-rose-500 hover:text-white transition-all shadow-sm"
                        title="Legacy PDF"
                    >
                        <Download size={14} />
                    </button>
                </div>
            </div>
        </div>
    );
};

// ── WIZARD MODAL COMPONENT ─────────────────────────────────────────────
const BabyeyiWizardModal = ({ onClose, editingDoc = null }) => {
    const [currentStep, setCurrentStep] = useState(1);
    const scrollRef = useRef(null);

    const scroll = (dir) => {
        if (scrollRef.current) {
            const amount = dir === 'left' ? -200 : 200;
            scrollRef.current.scrollBy({ left: amount, behavior: 'smooth' });
        }
    };

    return createPortal(
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 sm:p-6 overflow-hidden">
            <div className="absolute inset-0 bg-re-navy/60 backdrop-blur-xl animate-in fade-in duration-500" onClick={onClose} />
            <div className="relative w-full max-w-4xl max-h-[92vh] bg-re-bg rounded-[32px] shadow-[0_32px_128px_-15px_rgba(30,58,95,0.4)] border border-white/20 flex flex-col overflow-hidden animate-in zoom-in-95 fade-in duration-500 delay-150">

                {/* Header */}
                <div className="relative z-10 bg-re-grad-navy px-6 py-4 shrink-0">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2.5">
                            <div className="w-9 h-9 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 text-re-gold">
                                <Settings size={18} className="animate-spin-slow" />
                            </div>
                            <div>
                                <h1 className="text-xs font-black text-white uppercase tracking-widest leading-none">{editingDoc ? 'Refine Document' : 'Institutional Setup'}</h1>
                                <p className="text-[8px] font-bold text-white/40 uppercase tracking-tight mt-1">BabyeyiPro Wizard — {editingDoc ? editingDoc.id : 'New Session'}</p>
                            </div>
                        </div>
                        <button onClick={onClose} className="p-2 bg-white/5 hover:bg-white/10 rounded-xl transition-all text-white/40 hover:text-re-gold group">
                            <X size={16} className="group-hover:rotate-90 transition-all duration-300" />
                        </button>
                    </div>

                    {/* Stepper */}
                    <div className="relative flex items-center">
                        <div ref={scrollRef} className="flex items-center justify-between gap-2 overflow-x-auto scrollbar-none pb-1 scroll-smooth w-full px-2">
                            {STEPS.map((step, idx) => (
                                <div key={step.id} className="flex items-center shrink-0">
                                    <button onClick={() => setCurrentStep(step.id)} className={`flex items-center gap-2 transition-all outline-none ${currentStep === step.id ? 'opacity-100' : 'opacity-30 hover:opacity-60'}`}>
                                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center border transition-all ${currentStep === step.id ? 'bg-re-gold border-re-gold text-re-navy shadow-[0_0_15px_rgba(254,191,16,0.2)]' :
                                                currentStep > step.id ? 'bg-emerald-500 border-emerald-500 text-white' : 'bg-white/5 border-white/10 text-white'
                                            }`}>
                                            {currentStep > step.id ? <CheckCircle2 size={14} /> : <step.icon size={12} />}
                                        </div>
                                        <div className="text-left hidden lg:block">
                                            <p className={`text-[7px] font-black uppercase tracking-widest leading-none mb-0.5 text-white/40`}>Phase 0{step.id}</p>
                                            <p className="text-[9px] font-black text-white tracking-tight">{step.label}</p>
                                        </div>
                                    </button>
                                    {idx < 7 && <div className="w-4 h-px bg-white/10 mx-2" />}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto custom-scrollbar bg-re-bg/50 px-8 py-8">
                    <div className="max-w-3xl mx-auto space-y-6">
                        <div className="animate-in slide-in-from-bottom-2 duration-500">
                            <div className="flex items-center gap-2 mb-1">
                                <span className="w-5 h-0.5 bg-re-gold rounded-full" />
                                <p className="text-[7px] font-black text-re-gold uppercase tracking-[0.3em]">Operational Phase</p>
                            </div>
                            <h2 className="text-lg font-black text-re-navy tracking-tighter uppercase">{STEPS[currentStep - 1].label}</h2>
                        </div>
                        <div className="bg-white rounded-[20px] shadow-sm border border-black/5 p-6 min-h-[300px]">
                            {currentStep === 1 && <StepComponents.Step1 />}
                            {currentStep === 2 && <StepComponents.Step2 />}
                            {currentStep === 8 && <StepComponents.Step8 doc={editingDoc} />}
                            {currentStep > 2 && currentStep < 8 && <div className="p-20 text-center text-[10px] uppercase font-black opacity-20 tracking-[0.5em]">Module Under Calibration</div>}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="bg-white border-t border-black/5 px-8 py-3 items-center justify-between shrink-0 hidden sm:flex">
                    <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                        <p className="text-[7px] font-black text-re-text-muted uppercase tracking-[0.2em] opacity-30 italic">Cloud Synchronized</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={onClose} className="h-9 px-4 rounded-lg border border-black/5 text-re-navy font-black text-[9px] uppercase tracking-widest hover:bg-re-bg transition-all">Cancel</button>
                        <button onClick={() => currentStep === 8 ? onClose() : setCurrentStep(prev => prev + 1)} className="h-9 px-6 rounded-lg bg-re-grad-navy text-white font-black text-[9px] uppercase tracking-widest shadow-re-premium-navy hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-1.5">
                            {currentStep === 8 ? 'Finalize' : 'Continue'} <ChevronRight size={14} />
                        </button>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
};

const STEPS = [
    { id: 1, label: "School", icon: School },
    { id: 2, label: "Fees", icon: CreditCard },
    { id: 3, label: "Reqs", icon: BookOpen },
    { id: 4, label: "Bank", icon: Landmark },
    { id: 5, label: "Auth", icon: PenTool },
    { id: 6, label: "Notes", icon: Layers },
    { id: 7, label: "Leaders", icon: Users },
    { id: 8, label: "Submit", icon: Eye },
];

// ── REGISTRY VIEW (Main Page) ───────────────────────────────────────────
const BabyeyiRegistry = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [showWizard, setShowWizard] = useState(false);
    const [viewingDoc, setViewingDoc] = useState(null);
    const [editingDoc, setEditingDoc] = useState(null);
    const [loading, setLoading] = useState(true);

    const [records, setRecords] = useState([
        { id: 'BAB-2025-001', staff: 'Alain Munyaneza', date: 'Oct 24, 2024', status: 'Approved', total: '75,000', class: 'S4 MCB', bank: 'Bank of Kigali' },
        { id: 'BAB-2025-012', staff: 'Divine Uwase', date: 'Oct 28, 2024', status: 'Pending', total: '65,000', class: 'S1 A', bank: 'Cogebanque' },
        { id: 'BAB-2025-044', staff: 'Safi Ishimwe', date: 'Nov 02, 2024', status: 'Approved', total: '45,000', class: 'P6 B', bank: 'I&M Bank' },
        { id: 'BAB-2025-098', staff: 'John Doe', date: 'Nov 12, 2024', status: 'Pending', total: '12,000', class: 'P1 A', bank: 'Equity Bank' },
    ]);

    useEffect(() => {
        setTimeout(() => setLoading(false), 300);
    }, []);

    const handleSendToParent = (id) => {
        alert(`Initializing WhatsApp Notification for Doc: ${id}... [Conceptual Notify]`);
    };

    const handleDownloadPDF = (id) => {
        alert(`Generating Official PDF for ${id}... [Secure Process]`);
    };

    const filteredRecords = records.filter(r =>
        r.staff.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.class.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="animate-in fade-in duration-700 bg-re-bg min-h-screen">

            {showWizard && <BabyeyiWizardModal editingDoc={editingDoc} onClose={() => { setShowWizard(false); setEditingDoc(null); }} />}
            {viewingDoc && <OfficialDocView doc={viewingDoc} onClose={() => setViewingDoc(null)} />}

            {/* Hero Section - Compactified */}
            <div className="relative w-full h-[220px] overflow-hidden bg-[#c87800]">
                <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full border border-white/5 pointer-events-none" />
                <div className="absolute -top-12 -right-12 w-64 h-64 rounded-full border border-white/5 pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-[#FEBF10]/30 to-transparent pointer-events-none" />
                <div className="relative z-20 max-w-[1600px] mx-auto px-12 h-full flex items-center justify-between">
                    <div className="pb-4">
                        <div className="flex items-center gap-2 mb-2 mt-4">
                            <div className="w-6 h-1 bg-re-gold rounded-full" />
                            <p className="text-xs font-black text-re-gold uppercase tracking-[0.2em]">Official Institutional Registry</p>
                        </div>
                        <h1 className="text-2xl md:text-3xl font-semibold text-white tracking-tight uppercase leading-none mt-2 mb-3" style={{ fontFamily: "'Montserrat', sans-serif" }}>Babyeyi Ledgers</h1>
                        <p className="text-xs md:text-sm font-medium text-white/60 uppercase tracking-widest mt-2 italic max-w-lg leading-relaxed">Authority oversight for fee structures & compliance.</p>
                    </div>
                </div>
            </div>

            {/* Dashboard Content */}
            <div className="max-w-[1600px] mx-auto px-12 -mt-10 relative z-20 pb-20">
                <div className="bg-white rounded-t-[40px] shadow-2xl border border-black/5 overflow-hidden flex flex-col min-h-[600px]">

                    {/* Controls - Specialized Technical Sizing */}
                    <div className="px-8 py-4 border-b border-black/5 flex items-center gap-6 bg-white/50">
                        <div className="relative flex-1 group">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-re-text-muted/30 group-focus-within:text-re-gold transition-colors" size={14} />
                            <input
                                type="text"
                                placeholder="Search records..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full h-10 bg-re-bg rounded-xl pl-11 pr-6 font-bold outline-none border border-transparent focus:border-re-gold/10 focus:bg-white transition-all text-re-navy text-[11px] tracking-tight shadow-inner"
                            />
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => setShowWizard(true)}
                                className="h-10 px-6 bg-re-gold text-re-navy rounded-xl font-black text-[9px] uppercase tracking-widest shadow-re-premium hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
                            >
                                <Plus size={14} /> create new babyeyi
                            </button>
                        </div>
                    </div>

                    {/* Card Grid Registry */}
                    <div className="p-8 pb-16">
                        {loading ? (
                            <div className="p-32 text-center animate-pulse text-re-navy font-black text-sm uppercase tracking-widest opacity-40 italic">Synchronizing institutional registry...</div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3  gap-4">
                                {filteredRecords.map((r) => (
                                    <BabyeyiCard
                                        key={r.id}
                                        record={r}
                                        onView={setViewingDoc}
                                        onEdit={(doc) => { setEditingDoc(doc); setShowWizard(true); }}
                                        onSend={handleSendToParent}
                                        onDownloadPDF={handleDownloadPDF}
                                    />
                                ))}
                            </div>
                        )}

                        {filteredRecords.length === 0 && !loading && (
                            <div className="text-center py-24 opacity-40">
                                <BookOpen size={48} className="mx-auto mb-4" />
                                <p className="text-sm font-black uppercase tracking-widest text-[#1E3A5F]">No institutional records found</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

// ── UTILS & STEP COMPONENTS ───────────────────────────────────────

const Field = ({ label, placeholder, icon: Icon }) => (
    <div className="space-y-1">
        <p className="text-[7px] font-black uppercase text-re-navy opacity-30 tracking-widest ml-1">{label}</p>
        <div className="relative group">
            <Icon size={12} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-re-navy/30 group-focus-within:text-re-gold transition-all" />
            <input type="text" placeholder={placeholder} className="w-full h-9 bg-re-bg border border-black/5 rounded-lg pl-9 pr-4 text-[10px] font-bold text-re-navy outline-none focus:ring-1 ring-re-navy/10 shadow-[inset_0_2px_4px_rgba(0,0,0,0.05)] transition-all font-sans" />
        </div>
    </div>
);

const RowField = ({ name, amount }) => (
    <div className="flex items-center gap-2 group">
        <div className="flex-1 h-9 bg-re-bg border border-black/5 rounded-lg flex items-center px-3 shadow-[inset_0_2px_4px_rgba(0,0,0,0.05)] group-hover:bg-white transition-all">
            <span className="text-[9px] font-black text-re-navy uppercase tracking-tight">{name}</span>
        </div>
        <div className="w-28 h-9 bg-re-bg border border-black/5 rounded-lg flex items-center px-3 shadow-[inset_0_2px_4px_rgba(0,0,0,0.05)] group-hover:bg-white transition-all">
            <span className="text-[10px] font-black text-re-navy tracking-widest">RWF {amount}</span>
        </div>
    </div>
);

const StepComponents = {
    Step1: () => (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 animate-in fade-in duration-500">
            <Field label="School Name" placeholder="Rwanda Royal Academy" icon={School} />
            <Field label="School Code" placeholder="RRA-2025" icon={ShieldCheck} />
            <div className="md:col-span-2 space-y-2">
                <p className="text-[8px] font-black uppercase opacity-30 mt-2">Level Focus</p>
                <div className="flex gap-2">
                    {['Lower Secondary', 'Upper Secondary', 'TVET'].map(l => (
                        <button key={l} className="h-9 px-4 bg-re-bg border border-black/5 rounded-lg text-[8px] font-black uppercase">{l}</button>
                    ))}
                </div>
            </div>
        </div>
    ),
    Step2: () => (
        <div className="space-y-3 animate-in fade-in duration-500">
            <RowField name="Tuition Fee" amount="45,000" />
            <RowField name="Insurance" amount="8,000" />
            <button className="w-full h-9 border-2 border-dashed border-black/5 rounded-lg text-[8px] font-black uppercase text-re-text-muted hover:bg-re-bg transition-all flex items-center justify-center gap-2">
                <Plus size={14} /> Add Parameter
            </button>
        </div>
    ),
    Step8: ({ doc }) => (
        <div className="space-y-4 animate-in fade-in duration-500">
            <div className="p-5 bg-re-navy rounded-2xl text-white relative overflow-hidden">
                <div className="relative z-10 space-y-3">
                    <p className="text-[8px] font-black text-re-gold uppercase tracking-[0.4em]">Final Document Audit</p>
                    <div className="flex justify-between border-b border-white/5 pb-2">
                        <span className="text-[9px] font-black opacity-40 uppercase">Assigned Staff</span>
                        <span className="text-[9px] font-black uppercase">{doc?.staff || 'System Admin'}</span>
                    </div>
                </div>
            </div>
            <div className="flex items-center gap-2.5 p-3 bg-emerald-500/5 rounded-xl border border-emerald-500/10 text-emerald-600">
                <CheckCircle2 size={14} />
                <p className="text-[8px] font-black uppercase tracking-widest">Validation Successful</p>
            </div>
        </div>
    )
};

export default BabyeyiRegistry;
