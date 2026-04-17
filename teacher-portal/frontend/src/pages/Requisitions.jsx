import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  ClipboardList,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Upload,
  X,
  FileSpreadsheet,
  Filter,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  Building2,
  User,
  Banknote,
  Calendar,
  CheckCircle,
  CheckCircle2,
  Paperclip,
} from 'lucide-react';
import { teacherInnerSearchCls, teacherInnerSelectCls } from '../utils/teacherGradebookUi';

function fmtMoney(v) {
  return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'RWF', maximumFractionDigits: 0 }).format(Number(v) || 0);
}

function fmtDate(raw) {
  if (!raw) return '—';
  return new Date(raw).toLocaleDateString('en-RW', { day: '2-digit', month: 'short', year: 'numeric' });
}

const STATUS_BADGE = {
  pending: 'bg-amber-50 text-amber-800 border-amber-200',
  approved: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  rejected: 'bg-red-50 text-red-700 border-red-200',
  issued: 'bg-sky-50 text-sky-800 border-sky-200',
};



function AddModal({ open, onClose, defaultRequester, onSubmit }) {
  const [dept, setDept] = useState('');
  const [requester, setRequester] = useState(defaultRequester || '');
  const [items, setItems] = useState('');
  const [amount, setAmount] = useState('');
  const [submitted, setSubmitted] = useState(() => new Date().toISOString().slice(0, 10));
  const [attachment, setAttachment] = useState(null);
  const [note, setNote] = useState('');
  const [activeStep, setActiveStep] = useState(1);

  useEffect(() => {
    if (open) {
      setRequester(defaultRequester || '');
      setActiveStep(1);
    }
  }, [open, defaultRequester]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[230] flex items-end sm:items-center justify-center bg-[#08111F]/60 backdrop-blur-md p-0 sm:p-4 animate-in fade-in duration-300">
      <div className="bg-white w-full sm:max-w-xl rounded-t-[32px] sm:rounded-[32px] shadow-[0_20px_70px_-10px_rgba(0,0,0,0.3)] border border-white/20 overflow-hidden flex flex-col animate-in slide-in-from-bottom-8 duration-500">
        
        {/* Header - Simple & Premium */}
        <div className="relative p-6 bg-[linear-gradient(135deg,#FF8C00,#FF5E00)] overflow-hidden shrink-0">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/20 blur-3xl rounded-full mr-[-2rem] mt-[-2rem]"></div>
          <div className="flex items-center justify-between relative z-10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-[14px] bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 shadow-inner">
                <ClipboardList size={18} className="text-white" />
              </div>
              <div>
                <h1 className="text-[11px] font-black text-white uppercase tracking-widest leading-none">
                  New Requisition
                </h1>
                <p className="text-[8px] font-black text-white/50 uppercase tracking-[0.2em] mt-1">
                  Procurement · Official Request
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-2 bg-white/10 hover:bg-white/20 rounded-[12px] transition-all text-white/70 hover:text-white group"
            >
              <X size={16} className="group-hover:rotate-90 transition-all duration-300" />
            </button>
          </div>
        </div>

        {/* Body - Split Steps */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar bg-white px-5 py-6">
          <div className="w-full mx-auto space-y-5 animate-in fade-in duration-500">
            {activeStep === 1 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 animate-in slide-in-from-right-4">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-re-text-muted uppercase tracking-[0.15em] opacity-60 ml-1">
                    Department / Unit <span className="text-red-400 ml-0.5">*</span>
                  </label>
                  <div className="relative group">
                    <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-re-orange group-focus-within:scale-110 transition-transform">
                      <Building2 size={16} />
                    </div>
                    <input
                      value={dept}
                      onChange={(e) => setDept(e.target.value)}
                      placeholder="Ex: ICT Department"
                      className="w-full h-12 rounded-[16px] bg-re-bg pl-11 pr-4 font-black text-[12px] outline-none border border-transparent shadow-inner focus:border-re-orange/30 focus:bg-white focus:ring-2 focus:ring-re-orange/15 transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-re-text-muted uppercase tracking-[0.15em] opacity-60 ml-1">
                    Requester Name <span className="text-red-400 ml-0.5">*</span>
                  </label>
                  <div className="relative group">
                    <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-re-orange group-focus-within:scale-110 transition-transform">
                      <User size={16} />
                    </div>
                    <input
                      value={requester}
                      onChange={(e) => setRequester(e.target.value)}
                      placeholder="Enter full name"
                      className="w-full h-12 rounded-[16px] bg-re-bg pl-11 pr-4 font-black text-[12px] outline-none border border-transparent shadow-inner focus:border-re-orange/30 focus:bg-white focus:ring-2 focus:ring-re-orange/15 transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-re-text-muted uppercase tracking-[0.15em] opacity-60 ml-1">
                    Application Date <span className="text-red-400 ml-0.5">*</span>
                  </label>
                  <div className="relative group">
                    <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-re-orange">
                      <Calendar size={16} />
                    </div>
                    <input
                      type="date"
                      value={submitted}
                      onChange={(e) => setSubmitted(e.target.value)}
                      className="w-full h-12 rounded-[16px] bg-re-bg pl-11 pr-4 font-black text-[12px] outline-none border border-transparent shadow-inner focus:border-re-orange/30 focus:bg-white focus:ring-2 focus:ring-re-orange/15 transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-re-text-muted uppercase tracking-[0.15em] opacity-60 ml-1">
                    Total Amount (RWF) <span className="text-red-400 ml-0.5">*</span>
                  </label>
                  <div className="relative group">
                    <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-re-orange">
                      <Banknote size={16} />
                    </div>
                    <input
                      value={amount}
                      onChange={(e) => setAmount(e.target.value.replace(/[^\d]/g, ''))}
                      inputMode="numeric"
                      placeholder="0"
                      className="w-full h-12 rounded-[16px] bg-re-bg pl-11 pr-4 font-black text-[14px] tabular-nums outline-none border border-transparent shadow-inner focus:border-re-orange/30 focus:bg-white focus:ring-2 focus:ring-re-orange/15 transition-all"
                    />
                  </div>
                </div>
              </div>
            )}

            {activeStep === 2 && (
              <div className="space-y-5 animate-in slide-in-from-right-4">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-re-text-muted uppercase tracking-[0.15em] opacity-60 ml-1">
                    Items or Services Description <span className="text-red-400 ml-0.5">*</span>
                  </label>
                  <textarea
                    value={items}
                    onChange={(e) => setItems(e.target.value)}
                    placeholder="List the items or services you are requesting with their estimated costs..."
                    rows={4}
                    className="w-full rounded-[20px] bg-re-bg px-4 py-3 font-bold text-xs outline-none border border-transparent shadow-inner focus:border-re-orange/30 focus:bg-white focus:ring-2 focus:ring-re-orange/15 transition-all resize-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-re-text-muted uppercase tracking-[0.15em] opacity-60 ml-1">
                      Supporting Documents
                    </label>
                    <label className="flex items-center gap-3 h-14 px-4 rounded-[20px] bg-re-bg border border-dashed border-black/10 cursor-pointer hover:bg-white hover:border-re-orange/30 transition-all group">
                      <div className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center text-re-text-muted group-hover:text-re-orange transition-colors border border-black/5 group-hover:border-re-orange/20">
                        <Upload size={18} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-black text-re-text truncate">{attachment ? attachment.name : 'Click to upload attachment'}</p>
                        <p className="text-[8px] font-bold text-re-text-muted/60 uppercase tracking-widest mt-0.5">{attachment ? 'Ready to send' : 'PDF or Image (Optional)'}</p>
                      </div>
                      <input type="file" className="hidden" onChange={(e) => setAttachment(e.target.files?.[0] || null)} />
                    </label>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-re-text-muted uppercase tracking-[0.15em] opacity-60 ml-1">
                      Additional Notes
                    </label>
                    <textarea
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="Any extra info for the finance team..."
                      rows={2}
                      className="w-full rounded-[20px] bg-re-bg px-4 py-3 font-bold text-xs outline-none border border-transparent shadow-inner focus:border-re-orange/30 focus:bg-white focus:ring-2 focus:ring-re-orange/15 transition-all resize-none"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer - Multi-Step Navigation */}
        <div className="p-5 bg-re-bg shadow-[0_-4px_20px_rgba(0,0,0,0.03)] border-t border-black/5 flex items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={() => {
              if (activeStep === 1) onClose();
              else setActiveStep(1);
            }}
            className="h-11 px-6 rounded-[16px] bg-white border border-black/5 text-re-text font-black text-[10px] uppercase tracking-widest hover:bg-slate-50 transition-all active:scale-95"
          >
            {activeStep === 1 ? 'Cancel' : 'Back'}
          </button>

          {activeStep === 1 ? (
            <button
              type="button"
              onClick={() => setActiveStep(2)}
              className="h-11 px-8 rounded-[16px] bg-re-grad-orange text-white font-black text-[10px] uppercase tracking-widest shadow-re-glow active:scale-95 transition-all inline-flex items-center gap-2 group"
            >
              Continue <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                const amt = Number(amount) || 0;
                if (!dept.trim() || !requester.trim() || !items.trim() || amt <= 0) return;
                onSubmit({
                  dept: dept.trim(),
                  requester: requester.trim(),
                  items: items.trim(),
                  amount: amt,
                  submitted,
                  attachmentName: attachment?.name || '',
                  note: note.trim(),
                });
              }}
              className="h-11 px-8 rounded-[16px] bg-re-grad-orange text-white font-black text-[10px] uppercase tracking-[0.2em] shadow-re-glow active:scale-95 transition-all inline-flex items-center gap-2 group"
            >
              <CheckCircle size={14} /> Submit to Finance
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

export default function Requisitions() {
  const { teacher } = useAuth();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('All');
  const [modal, setModal] = useState(false);
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  const defaultRequester = [teacher?.first_name, teacher?.last_name].filter(Boolean).join(' ').trim() || teacher?.full_name || '';

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/teacher-portal/requisitions');
      if (res.data?.success) setRows(Array.isArray(res.data.data) ? res.data.data : []);
      else setError(res.data?.message || 'Failed to load');
    } catch (e) {
      setError(e.response?.data?.message || 'Could not load requisitions.');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      const st = status === 'All' || r.status === status;
      const match =
        !q ||
        String(r.id).toLowerCase().includes(q) ||
        r.dept?.toLowerCase().includes(q) ||
        r.requester?.toLowerCase().includes(q) ||
        r.items?.toLowerCase().includes(q);
      return st && match;
    });
  }, [rows, search, status]);

  const createReq = async (payload) => {
    try {
      await api.post('/teacher-portal/requisitions', {
        dept: payload.dept,
        requester: payload.requester,
        items: payload.items,
        amount: payload.amount,
        submitted: payload.submitted,
        attachmentName: payload.attachmentName,
        note: payload.note,
      });
      setModal(false);
      load();
    } catch (e) {
      setError(e.response?.data?.message || 'Submit failed');
    }
  };

  return (
    <div className="animate-in fade-in duration-500 bg-re-bg min-h-screen pb-24">
      <div className="relative w-full min-h-[200px] overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(8,17,31,0.92),rgba(18,35,58,0.84),rgba(33,49,74,0.78))] z-10 backdrop-blur-[2px]" />
        <div className="absolute inset-0 z-10 bg-[radial-gradient(circle_at_top_right,rgba(255,140,0,0.20),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(255,184,0,0.10),transparent_24%)]"></div>
        <img src="/teacher.jpg" alt="" className="absolute inset-0 w-full h-full object-cover scale-105 opacity-90" />
        <div className="relative z-20 max-w-[1200px] mx-auto px-6 py-12 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[10px] font-black text-re-orange uppercase tracking-[0.25em] mb-2">Procurement</p>
            <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight flex items-center gap-3">
              <FileSpreadsheet className="text-re-orange shrink-0" size={32} />
              My requisitions
            </h1>
            <p className="text-[11px] font-bold text-white/75 mt-2 max-w-lg">
              Submit requests for supplies or services. Your school accountant reviews and approves them here on Babyeyi.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => load()}
              className="p-2.5 rounded-xl bg-white/10 border border-white/20 text-white hover:bg-white/15"
            >
              <RefreshCw size={16} />
            </button>
            <button
              type="button"
              onClick={() => setModal(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-white font-black text-[10px] uppercase tracking-widest shadow-lg"
              style={{ background: 'linear-gradient(135deg,#FF8C00,#FF5E00)' }}
            >
              <Plus size={16} /> New request
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-[1200px] mx-auto px-6 -mt-8 relative z-30">
        {error && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-800">{error}</div>
        )}

        <div className="bg-white rounded-[24px] shadow-xl border border-black/5 overflow-hidden">
          <div className="px-4 py-4 lg:px-3 lg:py-2 border-b border-black/5 flex flex-col lg:flex-row lg:flex-nowrap lg:items-center gap-4 lg:gap-2 bg-re-bg/20">
            <div className="flex items-center gap-3 lg:gap-2 w-full lg:w-auto lg:shrink-0">
              <button
                onClick={() => setShowMobileFilters(!showMobileFilters)}
                className="lg:hidden w-full flex justify-between items-center gap-2 text-[10px] font-black uppercase tracking-widest transition-all"
              >
                <div className="flex items-center gap-2">
                  <Filter size={14} className="text-re-orange" /> show filters
                </div>
                {showMobileFilters ? <ChevronUp size={14} className="text-re-orange" /> : <ChevronDown size={14} />}
              </button>
            </div>

            <div className={`${showMobileFilters ? 'flex' : 'hidden lg:flex'} flex-col lg:flex-row lg:flex-nowrap lg:items-center gap-3 lg:gap-2 w-full lg:flex-1 lg:min-w-0 animate-in slide-in-from-top-2 duration-300`}>
              <div className="relative w-full lg:flex-1 lg:min-w-[7rem] lg:max-w-[15rem] group">
                <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-re-text-muted/50 group-focus-within:text-re-orange transition-colors lg:hidden z-[1] pointer-events-none" />
                <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-re-text-muted/50 group-focus-within:text-re-orange transition-colors hidden lg:block z-[1] pointer-events-none" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search requisition..."
                  className={`${teacherInnerSearchCls} !pl-10 lg:!pl-8`}
                />
              </div>
              <div className="relative w-full lg:w-[8rem] lg:shrink-0">
                <Filter size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-re-text-muted z-[1] pointer-events-none" />
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className={`${teacherInnerSelectCls} !pl-8`}
                >
                  {['All', 'pending', 'approved', 'rejected', 'issued'].map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center gap-3 py-20">
              <Loader2 className="animate-spin text-re-orange" size={22} />
              <span className="text-sm font-bold text-slate-400">Loading…</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center px-6">
              <ClipboardList className="mx-auto text-slate-200 mb-3" size={40} />
              <p className="text-sm font-black text-slate-400 uppercase tracking-widest">No requisitions yet</p>
              <button type="button" onClick={() => setModal(true)} className="mt-4 text-xs font-black text-re-orange uppercase hover:underline">
                + Create your first request
              </button>
            </div>
          ) : (
            <div className="divide-y divide-black/5">
              {filtered.map((r) => (
                <div key={r.db_id || r.id} className="px-5 py-4 hover:bg-re-bg/40 transition-colors">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-black text-re-text text-sm">{r.dept}</p>
                      <p className="text-[11px] font-bold text-slate-500 mt-0.5">{r.requester}</p>
                      <p className="text-xs text-slate-600 mt-2 max-w-2xl">{r.items}</p>
                      <p className="text-[10px] font-bold text-slate-400 mt-2 font-mono">
                        {r.id} · {fmtDate(r.submitted)}
                        {r.attachmentName ? ` · 📎 ${r.attachmentName}` : ''}
                      </p>
                      {r.note ? <p className="text-[10px] text-slate-400 mt-1 italic">{r.note}</p> : null}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-lg font-black text-re-text">{fmtMoney(r.amount)}</p>
                      <span
                        className={`inline-block mt-1 text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border ${
                          STATUS_BADGE[r.status] || 'bg-slate-50 text-slate-600 border-slate-200'
                        }`}
                      >
                        {r.status}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <AddModal open={modal} onClose={() => setModal(false)} defaultRequester={defaultRequester} onSubmit={createReq} />
    </div>
  );
}
