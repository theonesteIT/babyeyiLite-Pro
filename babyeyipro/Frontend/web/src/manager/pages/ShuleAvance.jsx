import React, { useEffect, useState } from 'react';
import { CheckCircle2, Loader2, RefreshCw, XCircle } from 'lucide-react';
import api from '../services/api';

function fmtMoney(v) {
  const n = Number(v || 0);
  return `${n.toLocaleString()} RWF`;
}

export default function ShuleAvance() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [feedbackById, setFeedbackById] = useState({});

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/services/shule-avance/manager/pending-requests');
      if (!res.data?.success) throw new Error(res.data?.message || 'Could not load manager queue');
      setRows(res.data.data || []);
    } catch (e) {
      setError(e.response?.data?.message || e.message || 'Could not load manager queue');
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const decide = async (id, decision) => {
    const feedback = (feedbackById[id] || '').trim();
    setBusyId(id);
    setMessage('');
    setError('');
    try {
      const res = await api.patch(`/services/shule-avance/manager/invoice-requests/${id}/decision`, {
        decision,
        feedback,
      });
      if (!res.data?.success) throw new Error(res.data?.message || 'Decision failed');
      setMessage(decision === 'approved' ? 'Request approved.' : 'Request rejected.');
      await load();
    } catch (e) {
      setError(e.response?.data?.message || e.message || 'Could not save decision.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="min-h-screen bg-re-bg p-6 md:p-10 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-re-orange">School Manager Portal</p>
          <h1 className="text-2xl md:text-3xl font-black text-re-text tracking-tight">
            Shule<span className="text-re-orange">Avance</span> Manager Decisions
          </h1>
          <p className="text-xs font-bold text-slate-500 mt-1">
            Final decision stage after accountant review. Your feedback is visible to the teacher.
          </p>
        </div>
        <button
          type="button"
          onClick={load}
          className="h-10 px-4 rounded-xl border border-black/10 bg-white text-[10px] font-black uppercase tracking-widest text-slate-700 inline-flex items-center gap-2"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {message && <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800">{message}</div>}
      {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{error}</div>}

      <section className="bg-white rounded-2xl border border-black/5 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-black/5 flex items-center justify-between gap-3">
          <h2 className="text-sm font-black uppercase tracking-wider text-re-text">Pending For Manager Decision</h2>
          <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border border-slate-200 bg-slate-50 text-slate-700">
            {rows.length} pending
          </span>
        </div>

        {loading ? (
          <div className="py-16 flex items-center justify-center gap-2 text-slate-500">
            <Loader2 size={18} className="animate-spin" />
            <span className="text-sm font-bold">Loading queue...</span>
          </div>
        ) : rows.length === 0 ? (
          <div className="py-16 text-center text-sm font-bold text-slate-400">No requests waiting for manager decision.</div>
        ) : (
          <div className="divide-y divide-black/5">
            {rows.map((r) => (
              <div key={r.id} className="p-5 space-y-3">
                <div className="flex flex-wrap justify-between gap-3">
                  <div>
                    <p className="text-lg font-black text-re-text">{fmtMoney(r.amount_rwf)}</p>
                    <p className="text-xs font-bold text-slate-500 mt-1">
                      #{r.id} · {r.staff_name || `Teacher #${r.teacher_user_id}`} · {r.repayment_term_months} months
                    </p>
                    <p className="text-xs font-bold text-slate-500">
                      Submitted: {new Date(r.submitted_at).toLocaleString()}
                    </p>
                  </div>
                  <span className="h-fit text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full border bg-sky-50 text-sky-700 border-sky-200">
                    Sent To Manager
                  </span>
                </div>

                <div className="text-sm text-slate-700 space-y-1">
                  <p>
                    <span className="font-black text-slate-900">Purpose:</span> {r.purpose}
                  </p>
                  {r.vendor_label ? (
                    <p>
                      <span className="font-black text-slate-900">Vendor:</span> {r.vendor_label}
                    </p>
                  ) : null}
                  {r.details ? (
                    <p>
                      <span className="font-black text-slate-900">Details:</span> {r.details}
                    </p>
                  ) : null}
                  {r.accountant_note ? (
                    <p>
                      <span className="font-black text-slate-900">Accountant note:</span> {r.accountant_note}
                    </p>
                  ) : null}
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Feedback To Teacher</label>
                  <textarea
                    value={feedbackById[r.id] || ''}
                    onChange={(e) => setFeedbackById((m) => ({ ...m, [r.id]: e.target.value }))}
                    className="w-full min-h-[74px] rounded-lg border border-black/10 p-3 text-sm font-semibold outline-none focus:border-re-orange/40"
                    placeholder="Write clear feedback for teacher..."
                  />
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={busyId === r.id}
                    onClick={() => decide(r.id, 'approved')}
                    className="h-10 px-4 rounded-lg bg-emerald-600 text-white text-[10px] font-black uppercase tracking-widest inline-flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <CheckCircle2 size={14} /> Approve
                  </button>
                  <button
                    type="button"
                    disabled={busyId === r.id}
                    onClick={() => decide(r.id, 'rejected')}
                    className="h-10 px-4 rounded-lg border border-red-200 bg-red-50 text-red-700 text-[10px] font-black uppercase tracking-widest inline-flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <XCircle size={14} /> Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
