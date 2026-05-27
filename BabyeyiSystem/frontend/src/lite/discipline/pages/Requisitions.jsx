import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  ClipboardList,
  Plus,
  RefreshCw,
  Search,
  Upload,
  X,
  FileSpreadsheet,
} from 'lucide-react';
import DisciplineOchreHero from '../components/DisciplineOchreHero';

function fmtMoney(v) {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: 'RWF',
    maximumFractionDigits: 0,
  }).format(Number(v) || 0);
}

function fmtDate(raw) {
  if (!raw) return '—';
  return new Date(raw).toLocaleDateString('en-RW', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
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
      <div className="bg-white w-full sm:max-w-lg rounded-t-[28px] sm:rounded-[24px] shadow-sm border border-black/10 max-h-[92vh] flex flex-col">
        <div
          className="px-5 py-4 flex items-center justify-between shrink-0 rounded-t-[28px] sm:rounded-t-[24px]"
          style={{ background: 'linear-gradient(135deg,#c87800,#ab6800)' }}
        >
          <div className="flex items-center gap-2 text-white">
            <ClipboardList size={18} />
            <h2 className="text-sm font-semibold uppercase tracking-tight">New requisition</h2>
          </div>
          <button type="button" onClick={onClose} className="p-2 rounded-xl text-white/80 hover:bg-white/10">
            <X size={18} />
          </button>
        </div>
        <div className="p-5 space-y-3 overflow-y-auto flex-1">
          <input
            value={dept}
            onChange={(e) => setDept(e.target.value)}
            placeholder="Department / unit *"
            className="w-full h-11 rounded-xl bg-re-bg px-3 font-medium text-sm outline-none border border-black/10 focus:border-[#c87800]/40"
          />
          <input
            value={requester}
            onChange={(e) => setRequester(e.target.value)}
            placeholder="Your name (requester) *"
            className="w-full h-11 rounded-xl bg-re-bg px-3 font-medium text-sm outline-none border border-black/10 focus:border-[#c87800]/40"
          />
          <div className="grid grid-cols-2 gap-3">
            <input
              type="date"
              value={submitted}
              onChange={(e) => setSubmitted(e.target.value)}
              className="w-full h-11 rounded-xl bg-re-bg px-3 font-medium text-xs outline-none border border-black/10"
            />
            <input
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/[^\d]/g, ''))}
              inputMode="numeric"
              placeholder="Amount (RWF) *"
              className="w-full h-11 rounded-xl bg-re-bg px-3 font-medium text-sm outline-none border border-black/10 focus:border-[#c87800]/40"
            />
          </div>
          <textarea
            value={items}
            onChange={(e) => setItems(e.target.value)}
            placeholder="Items or services needed *"
            rows={4}
            className="w-full rounded-xl bg-re-bg px-3 py-2 font-medium text-sm outline-none border border-black/10 focus:border-[#c87800]/40 resize-none"
          />
          <label className="flex items-center gap-2 h-11 px-3 rounded-xl bg-re-bg border border-black/10 cursor-pointer">
            <Upload size={16} className="text-[#c87800] shrink-0" />
            <span className="text-xs font-medium text-re-text-muted truncate">{attachment ? attachment.name : 'Attachment (optional)'}</span>
            <input type="file" className="hidden" onChange={(e) => setAttachment(e.target.files?.[0] || null)} />
          </label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Note (optional)"
            rows={2}
            className="w-full rounded-xl bg-re-bg px-3 py-2 font-medium text-sm outline-none border border-black/10 resize-none"
          />
        </div>
        <div className="p-4 border-t border-black/10 flex justify-end gap-2 shrink-0">
          <button type="button" onClick={onClose} className="px-4 py-2.5 rounded-xl border border-black/10 font-medium text-[11px] uppercase text-slate-600">
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
            className="px-6 py-2.5 rounded-xl text-white font-semibold text-[11px] uppercase tracking-wide shadow-sm"
            style={{ background: 'linear-gradient(135deg,#c87800,#ab6800)' }}
          >
            Submit
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
    <div className="animate-in fade-in duration-500 bg-re-bg min-h-screen pb-20">
      <DisciplineOchreHero
        eyebrow="Procurement"
        titleLine="My"
        titleAccent="requisitions"
        subtitle="Submit requests for supplies or services and track finance review progress."
        icon={FileSpreadsheet}
        rightSlot={
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
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-white font-semibold text-[11px] uppercase tracking-wide shadow-sm border border-[#e5ad1f]/50 bg-[#FEBF10]/25 hover:bg-[#FEBF10]/35"
            >
              <Plus size={16} /> New request
            </button>
          </div>
        }
      />

      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 -mt-4 sm:-mt-5 md:-mt-6 pt-2 relative z-30">
        {error && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">{error}</div>
        )}

        <div className="bg-white rounded-[24px] shadow-sm border border-black/10 overflow-hidden">
          <div className="p-4 flex flex-wrap gap-3 border-b border-black/10 bg-re-bg/30">
            <div className="relative flex-1 min-w-[200px]">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search reference, dept, items…"
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-black/10 text-sm font-medium outline-none focus:ring-2 focus:ring-[#c87800]/20"
              />
            </div>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="rounded-xl border border-black/10 px-3 py-2 text-xs font-medium uppercase tracking-wide text-re-text outline-none"
            >
              <option>All</option>
              <option>pending</option>
              <option>approved</option>
              <option>rejected</option>
              <option>issued</option>
            </select>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="bg-re-bg/30 text-left">
                <tr>
                  <th className="px-4 py-3 text-[11px] font-medium uppercase tracking-wide text-re-text-muted">Ref</th>
                  <th className="px-4 py-3 text-[11px] font-medium uppercase tracking-wide text-re-text-muted">Dept</th>
                  <th className="px-4 py-3 text-[11px] font-medium uppercase tracking-wide text-re-text-muted">Items</th>
                  <th className="px-4 py-3 text-[11px] font-medium uppercase tracking-wide text-re-text-muted">Amount</th>
                  <th className="px-4 py-3 text-[11px] font-medium uppercase tracking-wide text-re-text-muted">Submitted</th>
                  <th className="px-4 py-3 text-[11px] font-medium uppercase tracking-wide text-re-text-muted">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5">
                {loading ? (
                  <tr><td className="px-4 py-10 text-center text-slate-500" colSpan={6}>Loading requisitions…</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td className="px-4 py-10 text-center text-slate-500" colSpan={6}>No requisitions found.</td></tr>
                ) : (
                  filtered.map((r) => (
                    <tr key={r.id} className="hover:bg-re-bg/25">
                      <td className="px-4 py-3 font-medium text-slate-800">REQ-{r.id}</td>
                      <td className="px-4 py-3 text-slate-700">{r.dept || '—'}</td>
                      <td className="px-4 py-3 text-slate-700">{r.items || '—'}</td>
                      <td className="px-4 py-3 text-slate-700 font-medium">{fmtMoney(r.amount)}</td>
                      <td className="px-4 py-3 text-slate-500">{fmtDate(r.submitted)}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium border ${STATUS_BADGE[r.status] || 'bg-slate-50 border-slate-200 text-slate-600'}`}>
                          {r.status || 'pending'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <AddModal open={modal} onClose={() => setModal(false)} defaultRequester={defaultRequester} onSubmit={createReq} />
    </div>
  );
}
