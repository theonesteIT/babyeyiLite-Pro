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
} from 'lucide-react';

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

  useEffect(() => {
    if (open) setRequester(defaultRequester || '');
  }, [open, defaultRequester]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[230] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-lg rounded-t-[28px] sm:rounded-[24px] shadow-2xl border border-black/5 max-h-[92vh] flex flex-col">
        <div
          className="px-5 py-4 flex items-center justify-between shrink-0 rounded-t-[28px] sm:rounded-t-[24px]"
          style={{ background: 'linear-gradient(135deg,#FF8C00,#FF5E00)' }}
        >
          <div className="flex items-center gap-2 text-white">
            <ClipboardList size={18} />
            <h2 className="text-sm font-black uppercase tracking-tight">New requisition</h2>
          </div>
          <button type="button" onClick={onClose} className="p-2 rounded-xl text-white/80 hover:bg-white/10">
            <X size={18} />
          </button>
        </div>
        <div className="p-5 space-y-3 overflow-y-auto flex-1">
          <div className="grid grid-cols-1 gap-3">
            <input
              value={dept}
              onChange={(e) => setDept(e.target.value)}
              placeholder="Department / unit *"
              className="w-full h-11 rounded-xl bg-re-bg px-3 font-bold text-sm outline-none border border-black/5 focus:border-re-orange/40"
            />
            <input
              value={requester}
              onChange={(e) => setRequester(e.target.value)}
              placeholder="Your name (requester) *"
              className="w-full h-11 rounded-xl bg-re-bg px-3 font-bold text-sm outline-none border border-black/5 focus:border-re-orange/40"
            />
            <div className="grid grid-cols-2 gap-3">
              <input
                type="date"
                value={submitted}
                onChange={(e) => setSubmitted(e.target.value)}
                className="w-full h-11 rounded-xl bg-re-bg px-3 font-bold text-xs outline-none border border-black/5"
              />
              <input
                value={amount}
                onChange={(e) => setAmount(e.target.value.replace(/[^\d]/g, ''))}
                inputMode="numeric"
                placeholder="Amount (RWF) *"
                className="w-full h-11 rounded-xl bg-re-bg px-3 font-bold text-sm outline-none border border-black/5 focus:border-re-orange/40"
              />
            </div>
          </div>
          <textarea
            value={items}
            onChange={(e) => setItems(e.target.value)}
            placeholder="Items or services needed *"
            rows={4}
            className="w-full rounded-xl bg-re-bg px-3 py-2 font-bold text-sm outline-none border border-black/5 focus:border-re-orange/40 resize-none"
          />
          <label className="flex items-center gap-2 h-11 px-3 rounded-xl bg-re-bg border border-black/5 cursor-pointer">
            <Upload size={16} className="text-re-orange shrink-0" />
            <span className="text-xs font-bold text-re-text-muted truncate">{attachment ? attachment.name : 'Attachment (optional)'}</span>
            <input type="file" className="hidden" onChange={(e) => setAttachment(e.target.files?.[0] || null)} />
          </label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Note (optional)"
            rows={2}
            className="w-full rounded-xl bg-re-bg px-3 py-2 font-bold text-sm outline-none border border-black/5 resize-none"
          />
        </div>
        <div className="p-4 border-t border-black/5 flex justify-end gap-2 shrink-0">
          <button type="button" onClick={onClose} className="px-4 py-2.5 rounded-xl border border-black/5 font-black text-[10px] uppercase text-slate-600">
            Cancel
          </button>
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
            className="px-6 py-2.5 rounded-xl text-white font-black text-[10px] uppercase tracking-widest shadow-lg"
            style={{ background: 'linear-gradient(135deg,#FF8C00,#FF5E00)' }}
          >
            Submit to finance
          </button>
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
        <div className="absolute inset-0 bg-orange-950/65 z-10 backdrop-blur-[1px]" />
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
          <div className="p-4 flex flex-wrap gap-3 border-b border-black/5 bg-re-bg/30">
            <div className="relative flex-1 min-w-[200px]">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search reference, dept, items…"
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-black/5 text-sm font-bold outline-none focus:ring-2 focus:ring-re-orange/25"
              />
            </div>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="rounded-xl border border-black/5 px-3 py-2 text-xs font-black uppercase tracking-widest text-re-text outline-none"
            >
              {['All', 'pending', 'approved', 'rejected', 'issued'].map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
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
