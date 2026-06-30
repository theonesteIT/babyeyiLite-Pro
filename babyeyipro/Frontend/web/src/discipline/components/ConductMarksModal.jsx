import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
    X, Search, AlertCircle, Plus, Minus, CheckCircle,
    Activity, Users, ChevronRight, User, Trash2, ArrowLeft, ArrowRight, Loader2, Grid, Award,
    ListChecks
} from 'lucide-react';
import api from '../services/api';
import {
    conductCaseSmsMessage,
    mergeParentNotifySummaries,
    readParentNotificationsFromCaseResponse,
} from '../utils/parentNotifySummary';

const CATALOGUE = [
    { id: 'c1', name: 'Late Arrival', category: 'Lateness', points: -2 },
    { id: 'c2', name: 'No Uniform', category: 'Discipline', points: -3 },
    { id: 'c3', name: 'Bullying / Fighting', category: 'Discipline', points: -10 },
    { id: 'c4', name: 'Active Participation', category: 'Academic', points: 3 },
    { id: 'c5', name: 'Exceptional Homework', category: 'Academic', points: 2 },
    { id: 'c6', name: 'Helping Peers', category: 'Social', points: 2 },
    { id: 'c7', name: 'Disruptive Behavior', category: 'Discipline', points: -2 },
    { id: 'c8', name: 'Damaging Property', category: 'Discipline', points: -5 },
    { id: 'c9', name: 'Outstanding Leadership', category: 'Social', points: 5 },
    { id: 'c10', name: 'Skipping Class', category: 'Attendance', points: -5 }
];

export default function ConductMarksModal({ isOpen, onClose, initialStudent = null, students = [] }) {
    const [mobileStep, setMobileStep] = useState('items'); // 'items' | 'summary'
    const [search, setSearch] = useState('');
    const [rows, setRows] = useState([]);
    const [student, setStudent] = useState(null);
    const [note, setNote] = useState('');
    const [success, setSuccess] = useState(false);
    const [showSearch, setShowSearch] = useState(false);
    const [showBrowser, setShowBrowser] = useState(false);
    const [showStudents, setShowStudents] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [smsNotice, setSmsNotice] = useState('');
    const searchRef = useRef(null);
    const searchInputRef = useRef(null);

    useEffect(() => {
        if (isOpen) {
            setRows([]);
            setStudent(initialStudent || null);
            setNote('');
            setSuccess(false);
            setSmsNotice('');
            setSearch('');
            setMobileStep('items');
        }
    }, [isOpen, initialStudent]);

    useEffect(() => {
        const handler = (e) => {
            if (searchRef.current && !searchRef.current.contains(e.target)) setShowSearch(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const filtered = CATALOGUE.filter(p =>
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.category.toLowerCase().includes(search.toLowerCase())
    );

    const addCriteria = useCallback((criterion) => {
        setRows(prev => {
            const existing = prev.find(r => r.id === criterion.id);
            if (existing) return prev.map(r => r.id === criterion.id ? { ...r, qty: r.qty + 1 } : r);
            return [...prev, { ...criterion, qty: 1 }];
        });
        setSearch(''); setShowSearch(false);
    }, []);

    const updateQty = (id, delta) =>
        setRows(prev => prev.map(r => r.id === id ? { ...r, qty: Math.max(1, r.qty + delta) } : r));

    const removeRow = (id) => setRows(prev => prev.filter(r => r.id !== id));

    const totalPoints = rows.reduce((s, r) => s + (r.qty * r.points), 0);
    const totalQty = rows.reduce((s, r) => s + r.qty, 0);
    const canSubmit = rows.length > 0 && student !== null;

    if (!isOpen) return null;

    // ── Success Screen ────────────────────────────────────────────────────────
    if (success) {
        return createPortal(
            <>
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-white/95 backdrop-blur-md" onClick={() => setSuccess(false)} />
                    <div className="relative bg-white w-full max-w-sm rounded-[2rem] shadow-2xl overflow-hidden text-center p-8 border border-re-orange/10">
                        <div className="mb-6 relative">
                            <div className="w-20 h-20 bg-re-orange/10 rounded-full mx-auto flex items-center justify-center relative z-10">
                                <CheckCircle size={40} className="text-re-orange" />
                            </div>
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-re-orange/10 rounded-full animate-pulse z-0" />
                        </div>

                        <h3 className="text-xl font-black text-gray-900 mb-2 mt-4 tracking-tight">Marks Recorded!</h3>
                        <p className="text-xs text-gray-500 mb-6 leading-relaxed px-4">
                            The conduct points have been successfully assigned to {student?.name}.
                        </p>

                        <div className="bg-gray-50 rounded-2xl p-4 mb-6 space-y-2 border border-black/5">
                            <div className="flex justify-between items-center text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                <span>Total Adjustments</span>
                                <span className="text-gray-500">{totalQty} actions</span>
                            </div>
                            <div className="flex justify-between items-center text-[10px] font-black text-gray-400 uppercase tracking-widest pt-1 border-t border-black/5">
                                <span>Net Points Impact</span>
                                <span className={totalPoints >= 0 ? "text-emerald-500" : "text-red-500"}>
                                    {totalPoints > 0 ? '+' : ''}{totalPoints} Pts
                                </span>
                            </div>
                        </div>

                        {totalPoints < 0 && smsNotice ? (
                            <div className={`rounded-2xl px-4 py-3 mb-6 border text-left ${
                                smsNotice.startsWith('SMS sent')
                                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                                    : 'bg-amber-50 border-amber-200 text-amber-900'
                            }`}>
                                <p className="text-[10px] font-black uppercase tracking-widest opacity-70">Parent SMS</p>
                                <p className="text-xs font-bold mt-1">{smsNotice}</p>
                            </div>
                        ) : null}

                        <div className="space-y-3">
                            <button
                                onClick={() => {
                                    setRows([]);
                                    setStudent(initialStudent || null);
                                    setNote('');
                                    setSuccess(false);
                                    setSmsNotice('');
                                }}
                                className="w-full py-4 bg-re-grad-orange text-white rounded-2xl text-xs font-black shadow-re-glow hover:scale-[1.02] active:scale-95 transition-all"
                            >
                                Add More Marks
                            </button>
                            <button
                                onClick={onClose}
                                className="w-full py-4 bg-white border border-black/5 text-gray-500 rounded-2xl text-xs font-black hover:bg-re-bg active:scale-95 transition-all"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            </>,
            document.body
        );
    }

    // ── Items Panel (Left Side) ───────────────────────────────────────────────
    const ItemsPanel = (
        <div className="flex flex-col flex-1 min-h-0 bg-white">
            <div className="px-4 pt-4 pb-2 shrink-0 relative" ref={searchRef}>
                <div className="flex gap-2">
                    {/* Search input */}
                    <div className="flex-1 flex items-center bg-white border border-black/5 rounded-xl overflow-hidden shadow-inner focus-within:ring-2 focus-within:ring-re-orange/20 transition">
                        <div className="w-1 h-full bg-re-orange shrink-0" />
                        <Search className="text-gray-400 w-5 h-5 ml-3 mr-2 shrink-0" />
                        <input
                            ref={searchInputRef}
                            value={search}
                            onChange={e => { setSearch(e.target.value); setShowSearch(true); }}
                            onFocus={() => setShowSearch(true)}
                            placeholder="Search criteria (e.g. Uniform)..."
                            className="w-full p-2 bg-transparent outline-none text-sm font-semibold"
                        />
                        {search.length > 0 && (
                            <button onClick={() => { setSearch(''); setShowSearch(false); }} className="pr-2">
                                <X size={13} className="text-gray-300 hover:text-gray-500" />
                            </button>
                        )}
                    </div>

                    {/* Browse all criteria */}
                    <button
                        onClick={() => setShowBrowser(true)}
                        title="Browse all criteria"
                        className="w-10 h-10 shrink-0 flex items-center justify-center bg-re-bg border border-black/5 text-re-orange rounded-xl hover:bg-re-orange/10 transition"
                    >
                        <ListChecks size={16} />
                    </button>
                </div>

                {/* Search dropdown */}
                {showSearch && search.length > 0 && (
                    <div className="absolute left-4 right-4 z-20 mt-1 bg-white border border-black/5 rounded-xl shadow-2xl overflow-hidden max-h-56 overflow-y-auto">
                        {filtered.length === 0 ? (
                            <div className="flex items-center gap-2 px-4 py-3 text-xs font-bold text-gray-400">
                                <AlertCircle size={13} /> No criteria found
                            </div>
                        ) : filtered.map(p => (
                            <button
                                key={p.id}
                                onMouseDown={() => addCriteria(p)}
                                className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-re-bg transition text-left border-b border-black/5 last:border-0"
                            >
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border border-black/5 ${p.points < 0 ? 'bg-red-50' : 'bg-emerald-50'}`}>
                                    {p.points < 0 ? <Minus size={14} className="text-red-500" /> : <Plus size={14} className="text-emerald-500" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-semibold text-gray-900 truncate">{p.name}</p>
                                    <p className="text-[10px] text-gray-400">{p.category}</p>
                                </div>
                                <span className={`text-xs font-black shrink-0 ${p.points < 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                                    {p.points > 0 ? '+' : ''}{p.points} Pts
                                </span>
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Cart table */}
            <div className="flex-1 overflow-y-auto px-4 pb-3">
                {rows.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full py-10 text-center gap-3">
                        <div className="w-14 h-14 bg-re-bg rounded-full flex items-center justify-center border border-black/5">
                            <Activity size={24} className="text-gray-300" />
                        </div>
                        <div>
                            <p className="text-xs font-black text-gray-400 uppercase tracking-widest">No Criteria Added</p>
                            <p className="text-[11px] font-bold text-gray-300 mt-0.5">Search or browse to assign marks</p>
                        </div>
                        <button
                            onClick={() => setShowBrowser(true)}
                            className="mt-2 flex items-center justify-center gap-2 px-6 py-2.5 bg-re-orange/10 text-re-orange rounded-xl text-xs font-bold hover:bg-re-orange/20 transition-all border border-re-orange/20"
                        >
                            <Plus size={14} /> Add Criteria
                        </button>
                    </div>
                ) : (
                    <>
                        <div className="rounded-xl border border-black/5 overflow-hidden">
                            <div className="grid grid-cols-12 bg-re-bg px-3 py-2 border-b border-black/5">
                                <span className="col-span-6 text-[9px] font-black text-gray-400 uppercase tracking-widest">Criteria</span>
                                <span className="col-span-3 text-[9px] font-black text-gray-400 uppercase tracking-widest text-center">Occurrences</span>
                                <span className="col-span-3 text-[9px] font-black text-gray-400 uppercase tracking-widest text-right">Points</span>
                            </div>
                            {rows.map((row, i) => (
                                <div key={row.id} className={`grid grid-cols-12 items-center px-3 py-2.5 border-b border-black/5 last:border-0 ${i % 2 === 0 ? 'bg-white' : 'bg-re-bg/20'}`}>
                                    <div className="col-span-6 flex items-center gap-2 min-w-0">
                                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border border-black/5 ${row.points < 0 ? 'bg-red-50' : 'bg-emerald-50'}`}>
                                            {row.points < 0 ? <Minus size={10} className="text-red-500" /> : <Plus size={10} className="text-emerald-500" />}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-xs font-bold text-gray-900 truncate leading-tight">{row.name}</p>
                                            <p className="text-[9px] font-bold text-gray-400 truncate">{row.category}</p>
                                        </div>
                                    </div>
                                    <div className="col-span-3 flex items-center justify-center gap-1">
                                        <button onClick={() => updateQty(row.id, -1)} className="w-5 h-5 rounded-md bg-re-bg hover:bg-gray-200 flex items-center justify-center transition border border-black/5">
                                            <Minus size={10} className="text-gray-600" />
                                        </button>
                                        <span className="w-5 text-center text-xs font-black text-gray-900">{row.qty}</span>
                                        <button onClick={() => updateQty(row.id, +1)} className="w-5 h-5 rounded-md bg-re-bg hover:bg-re-orange/10 flex items-center justify-center transition border border-black/5">
                                            <Plus size={10} className="text-gray-600" />
                                        </button>
                                    </div>
                                    <div className="col-span-3 flex items-center justify-end gap-2">
                                        <span className={`text-xs font-black ${row.points < 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                                            {(row.points * row.qty) > 0 ? '+' : ''}{(row.points * row.qty)}
                                        </span>
                                        <button onClick={() => removeRow(row.id)} className="p-1.5 hover:bg-red-50 text-red-400 hover:text-red-600 rounded-lg transition shrink-0">
                                            <Trash2 size={13} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <button
                            onClick={() => setShowBrowser(true)}
                            className="w-full mt-3 flex items-center justify-center gap-2 py-3 border-2 border-dashed border-black/10 rounded-xl text-gray-400 hover:text-re-orange hover:border-re-orange/30 hover:bg-re-orange/5 transition-all font-bold text-xs"
                        >
                            <Plus size={14} /> Add another criteria
                        </button>

                        {/* Quick Overview */}
                        <div className="mt-3 flex items-center justify-between bg-re-bg px-4 py-3 border border-black/5 rounded-xl">
                            <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">
                                Net Point Impact ({totalQty} actions)
                            </span>
                            <span className={`text-sm font-black ${totalPoints > 0 ? 'text-emerald-500' : totalPoints < 0 ? 'text-red-500' : 'text-gray-900'}`}>
                                {totalPoints > 0 ? '+' : ''}{totalPoints} Pts
                            </span>
                        </div>
                    </>
                )}
            </div>

            {/* Mobile continue button */}
            <div className="md:hidden px-4 py-3 border-t border-black/5 shrink-0">
                <button
                    onClick={() => setMobileStep('summary')}
                    disabled={rows.length === 0}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-black transition active:scale-95 ${rows.length > 0 ? 'bg-re-grad-orange text-white shadow-re-glow hover:scale-[1.02]' : 'bg-re-bg text-gray-400 cursor-not-allowed'
                        }`}
                >
                    <span className="uppercase tracking-widest text-[10px]">Continue to Assignment</span>
                    <ArrowRight size={15} />
                </button>
            </div>
        </div>
    );

    // ── Summary Panel (Right Side) ────────────────────────────────────────────
    const SummaryPanel = (
        <div className="flex flex-col h-full bg-re-bg/30">
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">

                {/* Student Picker */}
                <div>
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5 block">
                        Target Student
                    </label>
                    <div
                        role="button"
                        tabIndex={0}
                        onClick={() => { if (!initialStudent) setShowStudents(true); }}
                        className={`w-full flex items-center gap-0 bg-white border border-black/5 rounded-xl overflow-hidden shadow-inner ${!initialStudent ? 'hover:border-re-orange/30 cursor-pointer' : 'opacity-90 cursor-default'} transition focus:ring-2 focus:ring-re-orange/50 focus:outline-none`}
                    >
                        <div className="w-1 h-10 bg-re-orange shrink-0" />
                        {student ? (
                            <div className="flex items-center ml-2 mr-1.5 shrink-0 w-6 h-6 bg-re-bg rounded-full border border-black/5 justify-center">
                                <span className="text-[8px] font-black">{student.name.charAt(0)}</span>
                            </div>
                        ) : (
                            <User className="text-gray-400 w-4 h-4 ml-3 mr-2 shrink-0" />
                        )}

                        <div className="flex-1 py-2 px-1 flex flex-col justify-center">
                            <span className={`text-xs ${student ? 'text-gray-900 font-bold' : 'text-gray-400 font-medium'}`}>
                                {student?.name || 'Select student...'}
                            </span>
                            {student && <span className="text-[9px] font-bold text-gray-400">{student.id} · {student.grade}</span>}
                        </div>

                        {!initialStudent && (student
                            ? <button type="button" onClick={e => { e.stopPropagation(); setStudent(null); }} className="pr-3"><X size={13} className="text-gray-300 hover:text-red-400" /></button>
                            : <ChevronRight size={14} className="text-gray-300 mr-3" />
                        )}
                    </div>
                </div>

                {/* Note */}
                <div>
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1 block">
                        Review Context <span className="text-gray-300 font-normal lowercase">(optional)</span>
                    </label>
                    <textarea
                        value={note} onChange={e => setNote(e.target.value)}
                        placeholder="Add specific context to this conduct update..." rows={3}
                        className="w-full px-3 py-2 text-xs font-bold text-gray-700 border border-black/5 rounded-xl bg-white outline-none focus:ring-2 focus:ring-re-orange/30 resize-none shadow-sm"
                    />
                </div>
            </div>

            {/* Submit */}
            <div className="px-4 py-4 border-t border-black/5 shrink-0 bg-white">
                <button
                    onClick={async () => {
                        if (!canSubmit || submitting) return;

                        const idToUse = student?.row_id || student?._raw?.id || student?.dbId;
                        if (!idToUse) {
                            alert('Missing internal student ID. Please re-select the student.');
                            return;
                        }

                        setSubmitting(true);
                        try {
                            const notifySummaries = [];
                            let recorded = 0;
                            for (const row of rows) {
                                const pts = row.points * row.qty;
                                const marksDeducted = -pts;
                                if (marksDeducted <= 0) continue;

                                const res = await api.post('/discipline/cases', {
                                    student_id: idToUse,
                                    lesson_subject: row.name,
                                    description: note || null,
                                    marks_deducted: marksDeducted,
                                });
                                notifySummaries.push(readParentNotificationsFromCaseResponse(res));
                                recorded += 1;
                            }
                            if (recorded === 0) {
                                alert('Add at least one deduction criterion to record conduct marks.');
                                return;
                            }

                            const merged = mergeParentNotifySummaries(notifySummaries);
                            setSmsNotice(conductCaseSmsMessage(merged) || '');
                            setSuccess(true);
                        } catch (err) {
                            console.error('Failed to record conduct marks:', err);
                            alert(err.response?.data?.message || 'Failed to record one or more marks. Please try again.');
                        } finally {
                            setSubmitting(false);
                        }
                    }}
                    disabled={!canSubmit || submitting}
                    className={`w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-[10px] uppercase tracking-widest font-black transition-all ${canSubmit && !submitting ? 'bg-re-grad-orange text-white shadow-re-glow hover:scale-[1.02] active:scale-95' : 'bg-re-bg text-gray-400 cursor-not-allowed border border-black/5'
                        }`}
                >
                    {submitting ? <Loader2 size={15} className="animate-spin" /> : <Activity size={15} />}
                    {submitting ? 'Processing...' : `Record Conduct Marks`}
                </button>
            </div>
        </div>
    );

    // ── Modals / Overlays ─────────────────────────────────────────────────────
    // (Simplified for this mock view: just the main ones)
    const BrowserOverlay = showBrowser && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowBrowser(false)} />
            <div className="relative bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden max-h-[80vh] flex flex-col">
                <div className="px-5 py-4 border-b border-black/5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-re-bg flex items-center justify-center text-re-orange">
                            <Grid size={16} />
                        </div>
                        <div>
                            <p className="text-sm font-black text-gray-900 tracking-tight">Full Catalogue</p>
                            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Browse Criteria</p>
                        </div>
                    </div>
                    <button onClick={() => setShowBrowser(false)} className="p-2 hover:bg-re-bg rounded-xl transition">
                        <X size={15} className="text-gray-500" />
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-2">
                    {CATALOGUE.map(c => (
                        <button key={c.id} onClick={() => { addCriteria(c); setShowBrowser(false); }} className="w-full flex items-center justify-between px-4 py-3 border border-black/5 rounded-xl hover:bg-re-bg hover:border-re-orange/20 transition-all text-left">
                            <div>
                                <p className="text-xs font-bold text-gray-900">{c.name}</p>
                                <p className="text-[10px] font-bold text-gray-400">{c.category}</p>
                            </div>
                            <span className={`text-xs font-black ${c.points > 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                                {c.points > 0 ? '+' : ''}{c.points} Pts
                            </span>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );

    const StudentPickerOverlay = showStudents && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowStudents(false)} />
            <div className="relative bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden max-h-[80vh] flex flex-col">
                <div className="px-5 py-4 border-b border-black/5 flex items-center justify-between relative z-10 bg-white">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-re-bg flex items-center justify-center text-re-orange">
                            <Users size={16} />
                        </div>
                        <div>
                            <p className="text-sm font-black text-gray-900 tracking-tight">Select Student</p>
                            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Search Database</p>
                        </div>
                    </div>
                    <button onClick={() => setShowStudents(false)} className="p-2 hover:bg-re-bg rounded-xl transition">
                        <X size={15} className="text-gray-500" />
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-2">
                    {students.map(s => (
                        <button key={s.id} onClick={() => { setStudent(s); setShowStudents(false); }} className="w-full flex items-center gap-3 px-4 py-3 border border-black/5 rounded-xl hover:bg-re-bg hover:border-re-orange/20 transition-all text-left">
                            <div className="w-8 h-8 rounded-lg bg-re-bg border border-black/5 flex items-center justify-center font-black text-[10px] text-gray-400">
                                {s.name.charAt(0)}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-xs font-bold text-gray-900 truncate">{s.name}</p>
                                <p className="text-[10px] font-bold text-gray-400">{s.id} · {s.grade}</p>
                            </div>
                            <ChevronRight size={14} className="text-gray-300" />
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );

    return createPortal(
        <>
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[80]" onClick={onClose} />

            {/* Sub-modals inside portal directly */}
            {BrowserOverlay}
            {StudentPickerOverlay}

            {/* MOBILE CONTAINER */}
            <div className="fixed inset-0 z-[90] flex md:hidden flex-col bg-white">
                <div className="flex items-center justify-between px-4 py-3 border-b border-black/5 shrink-0 bg-white shadow-sm">
                    <div className="flex items-center gap-2">
                        {mobileStep === 'summary' ? (
                            <button onClick={() => setMobileStep('items')} className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-gray-600">
                                <div className="p-1.5 bg-re-bg rounded-lg border border-black/5"><ArrowLeft size={13} className="text-gray-600" /></div>
                                Back
                            </button>
                        ) : (
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 bg-re-bg border border-black/5 rounded-xl flex items-center justify-center">
                                    <Activity size={15} className="text-re-orange" />
                                </div>
                                <span className="text-xs font-black uppercase tracking-widest text-gray-900">Conduct</span>
                            </div>
                        )}
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-re-bg border border-transparent hover:border-black/5 rounded-xl transition">
                        <X size={15} className="text-gray-500" />
                    </button>
                </div>
                <div className="flex-1 min-h-0 flex flex-col">
                    {mobileStep === 'items' && ItemsPanel}
                    {mobileStep === 'summary' && SummaryPanel}
                </div>
            </div>

            {/* DESKTOP CONTAINER */}
            <div className="hidden md:flex fixed inset-0 z-[90] items-center justify-center p-6">
                <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl min-h-[500px] flex flex-col max-h-[90vh] overflow-hidden border border-black/5">
                    <div className="flex items-center justify-between px-6 py-5 border-b border-black/5 shrink-0 bg-white relative z-10 shadow-sm">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-re-bg rounded-xl border border-black/5 flex items-center justify-center">
                                <Activity size={18} className="text-re-orange" />
                            </div>
                            <div>
                                <h2 className="text-sm font-black text-gray-900 uppercase tracking-widest leading-tight">Assign Conduct Marks</h2>
                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Update Disciplinary & Academic Records</p>
                            </div>
                        </div>
                        <button onClick={onClose} className="p-2 bg-re-bg border border-black/5 hover:bg-white hover:border-re-orange/20 rounded-xl transition-all shadow-sm">
                            <X size={16} className="text-gray-500" />
                        </button>
                    </div>
                    <div className="flex flex-1 min-h-0 overflow-hidden bg-white">
                        <div className="flex-[3] min-w-0 border-r border-black/5 flex flex-col">{ItemsPanel}</div>
                        <div className="flex-[2] shrink-0 flex flex-col">{SummaryPanel}</div>
                    </div>
                </div>
            </div>
        </>,
        document.body
    );
}
