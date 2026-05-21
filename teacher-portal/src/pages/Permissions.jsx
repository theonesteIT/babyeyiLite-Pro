import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  Calendar,
  CheckCircle,
  ChevronRight,
  Clock,
  ClipboardList,
  Eye,
  FileText,
  Filter,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Shield,
  Trash2,
  User,
  X,
} from 'lucide-react';
import TeacherOrangeHero from '../components/TeacherOrangeHero';

function fmtDate(raw) {
  if (!raw) return '—';
  return new Date(raw).toLocaleDateString('en-RW', { day: '2-digit', month: 'short', year: 'numeric' });
}

const PERMISSION_TYPES = [
  { value: 'SICK_LEAVE', label: 'Sick Leave' },
  { value: 'PERSONAL', label: 'Personal' },
  { value: 'FAMILY', label: 'Family'},
  { value: 'OFFICIAL', label: 'Official'},
  { value: 'LATE_ARRIVAL', label: 'Late Arrival' },
  { value: 'EARLY_DEPARTURE', label: 'Early Departure' },
  { value: 'OTHER', label: 'Other' },
];

const STATUS_BADGE = {
  pending: 'bg-amber-50 text-amber-800 border-amber-200',
  approved: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  rejected: 'bg-red-50 text-red-700 border-red-200',
  cancelled: 'bg-slate-100 text-slate-600 border-slate-200',
};

function AddModal({ open, onClose, teacherName, onSubmit }) {
  const [type, setType] = useState('PERSONAL');
  const [customType, setCustomType] = useState('');
  const [startDate, setStartDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');
  const [step, setStep] = useState(1);

  useEffect(() => {
    if (open) {
      setType('PERSONAL');
      setCustomType('');
      setStartDate(new Date().toISOString().slice(0, 10));
      setEndDate(new Date().toISOString().slice(0, 10));
      setReason('');
      setDescription('');
      setStep(1);
    }
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[230] flex items-end sm:items-center justify-center bg-[#08111F]/60 backdrop-blur-md p-0 sm:p-4 animate-in fade-in duration-300">
      <div className="bg-white w-full sm:max-w-xl rounded-t-[32px] sm:rounded-[32px] shadow-[0_20px_70px_-10px_rgba(0,0,0,0.3)] border border-white/20 overflow-hidden flex flex-col animate-in slide-in-from-bottom-8 duration-500">
        <div className="relative p-6 bg-[linear-gradient(135deg,#FF8C00,#FF5E00)] overflow-hidden shrink-0">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/20 blur-3xl rounded-full mr-[-2rem] mt-[-2rem]"></div>
          <div className="flex items-center justify-between relative z-10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-[14px] bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 shadow-inner">
                <Shield size={18} className="text-white" />
              </div>
              <div>
                <h1 className="text-[11px] font-bold text-white leading-none">Request Permission</h1>
                <p className="text-[10px] font-bold text-white/50 mt-1">Leave · Absence · Official</p>
              </div>
            </div>
            <button type="button" onClick={onClose} className="p-2 bg-white/10 hover:bg-white/20 rounded-[12px] transition-all text-white/70 hover:text-white group">
              <X size={16} className="group-hover:rotate-90 transition-all duration-300" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar bg-white px-5 py-6">
          <div className="w-full mx-auto space-y-5 animate-in fade-in duration-500">
            {step === 1 && (
              <div className="space-y-5 animate-in slide-in-from-right-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-re-text-muted opacity-60 ml-1">Permission Type <span className="text-red-400 ml-0.5">*</span></label>
                  <div className="relative group">
                    <Shield size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-re-orange pointer-events-none z-[1]" />
                    <select value={type} onChange={(e) => { setType(e.target.value); if (e.target.value !== 'OTHER') setCustomType(''); }}
                      className="w-full h-12 rounded-[16px] bg-re-bg pl-11 pr-4 font-bold text-[12px] outline-none border border-transparent shadow-inner focus:border-re-orange/30 focus:bg-white focus:ring-2 focus:ring-re-orange/15 transition-all appearance-none cursor-pointer">
                      {PERMISSION_TYPES.map(pt => (
                        <option key={pt.value} value={pt.value}>{pt.emoji} {pt.label}</option>
                      ))}
                    </select>
                    <ChevronRight size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 rotate-90 text-slate-400 pointer-events-none" />
                  </div>
                </div>
                {type === 'OTHER' && (
                  <div className="space-y-1.5 animate-in slide-in-from-top-2 duration-300">
                    <label className="text-[10px] font-bold text-re-text-muted opacity-60 ml-1">Specify Type <span className="text-red-400 ml-0.5">*</span></label>
                    <div className="relative group">
                      <FileText size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-re-orange" />
                      <input type="text" value={customType} onChange={(e) => setCustomType(e.target.value)}
                        placeholder="e.g. Medical Appointment, Workshop..."
                        className="w-full h-12 rounded-[16px] bg-re-bg pl-11 pr-4 font-bold text-[12px] outline-none border border-transparent shadow-inner focus:border-re-orange/30 focus:bg-white focus:ring-2 focus:ring-re-orange/15 transition-all" />
                    </div>
                  </div>
                )}
                {/* <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-re-text-muted opacity-60 ml-1">Description <span className="text-slate-300 ml-0.5">(optional)</span></label>
                  <textarea value={description} onChange={(e) => setDescription(e.target.value)}
                    placeholder="Add any additional details or context..."
                    rows={3}
                    className="w-full rounded-[16px] bg-re-bg px-4 py-3 font-bold text-xs outline-none border border-transparent shadow-inner focus:border-re-orange/30 focus:bg-white focus:ring-2 focus:ring-re-orange/15 transition-all resize-none" />
                </div> */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-re-text-muted opacity-60 ml-1">Start Date <span className="text-red-400 ml-0.5">*</span></label>
                    <div className="relative group">
                      <Calendar size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-re-orange" />
                      <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
                        className="w-full h-12 rounded-[16px] bg-re-bg pl-11 pr-4 font-bold text-[12px] outline-none border border-transparent shadow-inner focus:border-re-orange/30 focus:bg-white focus:ring-2 focus:ring-re-orange/15 transition-all" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-re-text-muted opacity-60 ml-1">End Date <span className="text-red-400 ml-0.5">*</span></label>
                    <div className="relative group">
                      <Calendar size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-re-orange" />
                      <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)}
                        className="w-full h-12 rounded-[16px] bg-re-bg pl-11 pr-4 font-bold text-[12px] outline-none border border-transparent shadow-inner focus:border-re-orange/30 focus:bg-white focus:ring-2 focus:ring-re-orange/15 transition-all" />
                    </div>
                  </div>
                </div>
              </div>
            )}
            {step === 2 && (
              <div className="space-y-5 animate-in slide-in-from-right-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-re-text-muted opacity-60 ml-1">Reason / Description <span className="text-red-400 ml-0.5">*</span></label>
                  <textarea value={reason} onChange={(e) => setReason(e.target.value)}
                    placeholder="Explain the reason for your permission request..."
                    rows={5}
                    className="w-full rounded-[20px] bg-re-bg px-4 py-3 font-bold text-xs outline-none border border-transparent shadow-inner focus:border-re-orange/30 focus:bg-white focus:ring-2 focus:ring-re-orange/15 transition-all resize-none" />
                </div>
                <div className="bg-re-bg rounded-[16px] p-4 space-y-2">
                  <p className="text-[10px] font-bold text-slate-500">Summary</p>
                  <div className="flex flex-wrap gap-2 text-[10px]">
                    <span className="px-2 py-1 rounded-lg bg-white border border-black/5 font-bold">
                      {PERMISSION_TYPES.find(p => p.value === type)?.emoji}{' '}
                      {type === 'OTHER' && customType.trim() ? customType.trim() : PERMISSION_TYPES.find(p => p.value === type)?.label}
                    </span>
                    <span className="px-2 py-1 rounded-lg bg-white border border-black/5 font-bold">{startDate} → {endDate}</span>
                    {description.trim() && <span className="px-2 py-1 rounded-lg bg-white border border-black/5 font-bold truncate max-w-[200px]">📝 {description.trim()}</span>}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="p-5 bg-re-bg shadow-[0_-4px_20px_rgba(0,0,0,0.03)] border-t border-black/5 flex items-center justify-between gap-3 shrink-0">
          <button type="button" onClick={() => { if (step === 1) onClose(); else setStep(1); }}
            className="h-11 px-6 rounded-[16px] bg-white border border-black/5 text-re-text font-bold text-[11px] hover:bg-slate-50 transition-all active:scale-95">
            {step === 1 ? 'Cancel' : 'Back'}
          </button>
          {step === 1 ? (
            <button type="button"
              onClick={() => {
                if (!startDate || !endDate) return;
                if (type === 'OTHER' && !customType.trim()) return;
                setStep(2);
              }}
              className="h-11 px-8 rounded-[16px] bg-re-grad-orange text-white font-bold text-[11px] shadow-re-glow active:scale-95 transition-all inline-flex items-center gap-2 group">
              Continue <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
            </button>
          ) : (
            <button type="button"
              onClick={() => {
                if (!reason.trim() || !startDate || !endDate) return;
                const payload = {
                  permission_type: type,
                  start_date: startDate,
                  end_date: endDate,
                  reason: type === 'OTHER' && customType.trim() ? `[${customType.trim()}] ${reason.trim()}` : reason.trim(),
                  teacher_name: teacherName,
                };
                if (description.trim()) payload.description = description.trim();
                onSubmit(payload);
              }}
              className="h-11 px-8 rounded-[16px] bg-re-grad-orange text-white font-bold text-[11px] shadow-re-glow active:scale-95 transition-all inline-flex items-center gap-2 group">
              <CheckCircle size={14} /> Submit Request
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

export default function Permissions() {
  const { teacher } = useAuth();
  const teacherName = teacher?.name || teacher?.full_name || 'Teacher';
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modal, setModal] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [saving, setSaving] = useState(false);
  const [viewPerm, setViewPerm] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/teacher-portal/permissions');
      if (res.data?.success) setRows(Array.isArray(res.data.data) ? res.data.data : []);
    } catch (e) {
      setError(e?.response?.data?.message || 'Failed to load permissions');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const createPerm = async (payload) => {
    setSaving(true);
    try {
      await api.post('/teacher-portal/permissions', payload);
      setModal(false);
      load();
    } catch (e) {
      setError(e?.response?.data?.message || 'Submit failed');
    } finally {
      setSaving(false);
    }
  };

  const cancelPerm = async (id) => {
    if (!window.confirm('Cancel this permission request?')) return;
    try {
      await api.delete(`/teacher-portal/permissions/${id}`);
      load();
    } catch (e) {
      setError(e?.response?.data?.message || 'Failed to cancel');
    }
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter(r => {
      const stOk = statusFilter === 'All' || r.status === statusFilter;
      const qOk = !q || (r.permission_type || '').toLowerCase().includes(q) || (r.reason || '').toLowerCase().includes(q);
      return stOk && qOk;
    });
  }, [rows, search, statusFilter]);

  const counts = useMemo(() => ({
    total: rows.length,
    pending: rows.filter(r => r.status === 'pending').length,
    approved: rows.filter(r => r.status === 'approved').length,
    rejected: rows.filter(r => r.status === 'rejected').length,
  }), [rows]);

  return (
    <div className="min-h-screen bg-re-bg font-sans">
      <TeacherOrangeHero
        title={`Welcome back, ${teacher?.first_name || 'Teacher'}`}
        subtitle="Request leave, late arrival, early departure or any other permission. Your DOS reviews and approves."
        rightSlot={
          <>
            <button
              type="button"
              onClick={load}
              className="inline-flex items-center justify-center rounded-xl border border-white/25 bg-white/10 w-11 h-11 text-white hover:bg-white/20 transition-all"
              title="Refresh"
              aria-label="Refresh permissions"
            >
              <RefreshCw size={16} />
            </button>
            <button
              type="button"
              onClick={() => setModal(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-white font-bold text-[11px] border border-white/25 bg-white/15 hover:bg-white/25 transition-all"
            >
              <Plus size={16} /> Request Permission
            </button>
          </>
        }
      >
        <div className="flex md:hidden gap-2">
          <button
            type="button"
            onClick={load}
            className="inline-flex items-center justify-center rounded-xl border border-white/25 bg-white/10 w-11 h-11 text-white"
            aria-label="Refresh permissions"
          >
            <RefreshCw size={16} />
          </button>
          <button
            type="button"
            onClick={() => setModal(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-white font-bold text-[11px] border border-white/25 bg-white/15"
          >
            <Plus size={16} /> Request Permission
          </button>
        </div>
      </TeacherOrangeHero>

      <div className="max-w-[1200px] mx-auto px-6 -mt-10 relative z-30 pb-10 space-y-4">
        {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-800">{error}</div>}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            ['Total', counts.total, 'bg-slate-50'],
            ['Pending', counts.pending, 'bg-amber-50'],
            ['Approved', counts.approved, 'bg-emerald-50'],
            ['Rejected', counts.rejected, 'bg-red-50'],
          ].map(([label, val, bg]) => (
            <div key={label} className={`${bg} rounded-2xl border border-black/5 p-4 text-center`}>
              <p className="text-2xl font-bold text-slate-800">{val}</p>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{label}</p>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-[24px] shadow-xl border border-black/5 overflow-hidden">
          <div className="px-5 py-4 border-b border-black/5 flex flex-wrap gap-3 items-center bg-re-bg/20">
            <div className="relative flex-1 min-w-[180px] group">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-re-orange transition-colors z-[1]" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search permissions..."
                className="w-full h-10 rounded-xl bg-white pl-9 pr-4 text-xs font-bold border border-black/5 outline-none focus:border-re-orange/30 focus:ring-2 focus:ring-re-orange/10 transition-all" />
            </div>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
              className="h-10 rounded-xl border border-black/5 px-3 text-xs font-bold bg-white outline-none">
              {['All', 'pending', 'approved', 'rejected'].map(s => <option key={s} value={s}>{s === 'All' ? 'All Status' : s}</option>)}
            </select>
          </div>

          {loading ? (
            <div className="flex items-center justify-center gap-3 py-20">
              <Loader2 className="animate-spin text-re-orange" size={22} />
              <span className="text-sm font-bold text-slate-400">Loading…</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center px-6">
              <Shield className="mx-auto text-slate-200 mb-3" size={40} />
              <p className="text-[11px] font-bold text-slate-400">No permission requests yet</p>
              <button type="button" onClick={() => setModal(true)} className="mt-4 text-[11px] font-bold text-re-orange hover:underline">
                + Request your first permission
              </button>
            </div>
          ) : (
            <div className="divide-y divide-black/5">
              {filtered.map((r) => {
                const pt = PERMISSION_TYPES.find(p => p.value === r.permission_type) || PERMISSION_TYPES[6];
                const days = Math.max(1, Math.ceil((new Date(r.end_date) - new Date(r.start_date)) / 86400000) + 1);
                return (
                  <div key={r.id} className="px-5 py-4 hover:bg-re-bg/40 transition-colors">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="flex gap-3">
                        <div className="w-10 h-10 rounded-xl bg-re-bg flex items-center justify-center text-lg shrink-0">{pt.emoji}</div>
                        <div>
                          <p className="font-bold text-re-text text-sm">{pt.label}</p>
                          <p className="text-[10px] text-slate-500 mt-0.5 flex items-center gap-2">
                            <span className="inline-flex items-center gap-1"><Calendar size={10} /> {fmtDate(r.start_date)} → {fmtDate(r.end_date)}</span>
                            <span className="inline-flex items-center gap-1"><Clock size={10} /> {days} day{days > 1 ? 's' : ''}</span>
                          </p>
                          {r.reason && <p className="text-xs text-slate-600 mt-2 max-w-xl">{r.reason}</p>}
                          {r.decision_note && (
                            <p className="text-[10px] text-indigo-600 mt-1 italic">DOS: {r.decision_note}</p>
                          )}
                        </div>
                      </div>
                      <div className="text-right shrink-0 flex flex-col items-end gap-2">
                        <span className={`inline-block text-[10px] font-bold px-2.5 py-1 rounded-full border ${STATUS_BADGE[r.status] || STATUS_BADGE.pending}`}>
                          {r.status}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <button type="button" onClick={() => setViewPerm(r)}
                            className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-500 hover:text-blue-700 transition-colors">
                            <Eye size={11} /> View
                          </button>
                          {r.status === 'pending' && (
                            <button type="button" onClick={() => cancelPerm(r.id)}
                              className="inline-flex items-center gap-1 text-[10px] font-bold text-red-400 hover:text-red-600 transition-colors">
                              <Trash2 size={11} /> Cancel
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <AddModal open={modal} onClose={() => setModal(false)} teacherName={teacherName} onSubmit={createPerm} />

      {viewPerm && createPortal(
        <div className="fixed inset-0 z-[230] flex items-end sm:items-center justify-center bg-[#08111F]/60 backdrop-blur-md p-0 sm:p-4 animate-in fade-in duration-200" onClick={() => setViewPerm(null)}>
          <div className="bg-white w-full sm:max-w-lg rounded-t-[28px] sm:rounded-[28px] shadow-[0_20px_70px_-10px_rgba(0,0,0,0.3)] overflow-hidden animate-in slide-in-from-bottom-6 duration-400" onClick={e => e.stopPropagation()}>
            <div className={`p-5 ${viewPerm.status === 'approved' ? 'bg-gradient-to-br from-emerald-600 to-emerald-800' : viewPerm.status === 'rejected' ? 'bg-gradient-to-br from-red-600 to-red-800' : 'bg-[linear-gradient(135deg,#FF8C00,#FF5E00)]'}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-[14px] bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20">
                    <Shield size={18} className="text-white" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Permission Details</h3>
                    <p className="text-[10px] text-white/60 mt-0.5">#{viewPerm.id} · {viewPerm.status?.toUpperCase()}</p>
                  </div>
                </div>
                <button type="button" onClick={() => setViewPerm(null)} className="p-2 bg-white/10 hover:bg-white/20 rounded-xl text-white/70 hover:text-white transition-all">
                  <X size={16} />
                </button>
              </div>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-re-bg rounded-xl p-3">
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Type</p>
                  <p className="text-xs font-bold text-slate-800 mt-1">{(PERMISSION_TYPES.find(p => p.value === viewPerm.permission_type) || PERMISSION_TYPES[6]).emoji} {(viewPerm.permission_type || 'OTHER').replace(/_/g, ' ')}</p>
                </div>
                <div className="bg-re-bg rounded-xl p-3">
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Status</p>
                  <p className="mt-1"><span className={`inline-block text-[10px] font-bold px-2.5 py-1 rounded-full border ${STATUS_BADGE[viewPerm.status] || STATUS_BADGE.pending}`}>{viewPerm.status}</span></p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-re-bg rounded-xl p-3">
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Start Date</p>
                  <p className="text-xs font-bold text-slate-800 mt-1 flex items-center gap-1"><Calendar size={11} /> {fmtDate(viewPerm.start_date)}</p>
                </div>
                <div className="bg-re-bg rounded-xl p-3">
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">End Date</p>
                  <p className="text-xs font-bold text-slate-800 mt-1 flex items-center gap-1"><Calendar size={11} /> {fmtDate(viewPerm.end_date)}</p>
                </div>
              </div>
              <div className="bg-re-bg rounded-xl p-3">
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Duration</p>
                <p className="text-xs font-bold text-slate-800 mt-1 flex items-center gap-1"><Clock size={11} /> {Math.max(1, Math.ceil((new Date(viewPerm.end_date) - new Date(viewPerm.start_date)) / 86400000) + 1)} day(s)</p>
              </div>
              {viewPerm.reason && (
                <div className="bg-re-bg rounded-xl p-3">
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Reason</p>
                  <p className="text-xs text-slate-700 mt-1 whitespace-pre-wrap">{viewPerm.reason}</p>
                </div>
              )}
              {viewPerm.decision_note && (
                <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-3">
                  <p className="text-[9px] font-bold text-indigo-400 uppercase tracking-widest">DOS Decision Note</p>
                  <p className="text-xs text-indigo-700 mt-1 italic whitespace-pre-wrap">{viewPerm.decision_note}</p>
                </div>
              )}
              {viewPerm.created_at && (
                <p className="text-[9px] text-slate-400 text-right">Submitted: {fmtDate(viewPerm.created_at)}</p>
              )}
            </div>
            <div className="p-4 bg-re-bg border-t border-black/5 flex justify-end">
              <button type="button" onClick={() => setViewPerm(null)} className="h-10 px-6 rounded-xl bg-white border border-black/5 text-slate-600 font-bold text-[11px] hover:bg-slate-50 transition-all">Close</button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
