import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  CheckCircle2,
  Loader2,
  RefreshCw,
  XCircle,
  LayoutGrid,
  Ban,
  Filter,
  X,
  Send,
  Wallet,
} from 'lucide-react';
import api from '../services/api';
import ManagerOchreHeroShell from '../components/ManagerOchreHeroShell';

function fmtMoney(v) {
  const n = Number(v || 0);
  return `${n.toLocaleString()} RWF`;
}

const STATUS_LABEL = {
  sent_to_manager: { label: 'Awaiting you', cls: 'bg-sky-50 text-sky-800 border-sky-200' },
  approved: { label: 'Approved', cls: 'bg-emerald-50 text-emerald-900 border-emerald-200' },
  rejected_by_manager: { label: 'Rejected', cls: 'bg-red-50 text-red-800 border-red-200' },
  pending_accountant: { label: 'With finance', cls: 'bg-amber-50 text-amber-900 border-amber-200' },
  rejected_by_accountant: { label: 'Rejected (finance)', cls: 'bg-red-50 text-red-700 border-red-200' },
};

function isTeacherDealRequest(row) {
  return String(row?.request_type || '').toLowerCase() === 'service'
    && String(row?.service_category || '').toLowerCase() === 'teacher_deals';
}

function Modal({ open, title, subtitle, children, onClose }) {
  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-[500] flex items-end justify-center p-0 sm:items-center sm:p-4">
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-[2px]"
        aria-label="Close"
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col rounded-t-[24px] bg-white shadow-sm sm:rounded-2xl border border-slate-200/80 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4 bg-gradient-to-r from-[#0f172a] to-[#14532d] text-white">
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wide">{title}</h3>
            {subtitle ? (
              <p className="mt-1 text-[11px] font-semibold text-white/80 leading-snug">{subtitle}</p>
            ) : null}
          </div>
          <button type="button" onClick={onClose} className="rounded-xl p-2 hover:bg-white/10" aria-label="Close">
            <X size={18} />
          </button>
        </div>
        <div className="overflow-y-auto p-5">{children}</div>
      </div>
    </div>,
    document.body
  );
}

export default function ShuleAvance() {
  const [allRows, setAllRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [tableFilter, setTableFilter] = useState('sent_to_manager');

  const [modal, setModal] = useState(null);
  const [feedbackDraft, setFeedbackDraft] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/services/shule-avance/manager/requests?status=all');
      if (!res.data?.success) throw new Error(res.data?.message || 'Could not load');
      setAllRows(Array.isArray(res.data.data) ? res.data.data : []);
    } catch (e) {
      setError(e.response?.data?.message || e.message || 'Could not load');
      setAllRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const stats = useMemo(() => {
    const total = allRows.length;
    const approved = allRows.filter((r) => r.status === 'approved').length;
    const rejected = allRows.filter((r) => r.status === 'rejected_by_manager').length;
    const awaiting = allRows.filter((r) => r.status === 'sent_to_manager').length;
    return { total, approved, rejected, awaiting };
  }, [allRows]);

  const filteredRows = useMemo(() => {
    if (tableFilter === 'all') return allRows;
    if (tableFilter === 'sent_to_manager') {
      return allRows.filter((r) => r.status === 'sent_to_manager');
    }
    if (tableFilter === 'approved') return allRows.filter((r) => r.status === 'approved');
    if (tableFilter === 'rejected') return allRows.filter((r) => r.status === 'rejected_by_manager');
    if (tableFilter === 'other') {
      return allRows.filter(
        (r) =>
          r.status === 'pending_accountant' ||
          r.status === 'rejected_by_accountant'
      );
    }
    return allRows;
  }, [allRows, tableFilter]);

  const closeModal = () => {
    setModal(null);
    setFeedbackDraft('');
  };

  const submitDecision = async () => {
    if (!modal?.row?.id || !modal?.decision) return;
    const id = modal.row.id;
    const decision = modal.decision;
    setBusyId(id);
    setMessage('');
    setError('');
    try {
      const res = await api.patch(`/services/shule-avance/manager/invoice-requests/${id}/decision`, {
        decision,
        feedback: feedbackDraft.trim(),
      });
      if (!res.data?.success) throw new Error(res.data?.message || 'Decision failed');
      setMessage(decision === 'approved' ? 'Request approved.' : 'Request rejected.');
      closeModal();
      await load();
    } catch (e) {
      setError(e.response?.data?.message || e.message || 'Could not save decision.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <>
      <ManagerOchreHeroShell
        outerClassName="animate-in fade-in duration-500 bg-re-bg min-h-screen pb-16"
        eyebrow="School manager"
        title="Teacher Avance"
        subtitle="Decisions & history — review forwarded requests, approve or reject with optional comments."
        HeroIcon={Wallet}
        headerRight={(
          <button
            type="button"
            onClick={load}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-white/25 bg-white/10 text-white text-[10px] font-semibold uppercase tracking-widest hover:bg-white/15 transition-colors"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        )}
        kpiTiles={[
          {
            key: 'all',
            label: 'Total records',
            value: stats.total,
            subValue: 'All stored',
            icon: LayoutGrid,
            onClick: () => setTableFilter('all'),
            selected: tableFilter === 'all',
          },
          {
            key: 'sent_to_manager',
            label: 'Needs decision',
            value: stats.awaiting,
            subValue: 'Awaiting you',
            icon: Send,
            onClick: () => setTableFilter('sent_to_manager'),
            selected: tableFilter === 'sent_to_manager',
          },
          {
            key: 'approved',
            label: 'Approved',
            value: stats.approved,
            subValue: 'By you',
            icon: CheckCircle2,
            onClick: () => setTableFilter('approved'),
            selected: tableFilter === 'approved',
          },
          {
            key: 'rejected',
            label: 'Rejected',
            value: stats.rejected,
            subValue: 'By you',
            icon: Ban,
            onClick: () => setTableFilter('rejected'),
            selected: tableFilter === 'rejected',
          },
        ]}
        pageBody={(
          <div className="max-w-[1600px] mx-auto px-4 sm:px-6 md:px-10 space-y-6 pt-2">
            {message && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800">
                {message}
              </div>
            )}
            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
                {error}
              </div>
            )}

            <section className="bg-white rounded-2xl border border-black/5 shadow-sm overflow-hidden">
        <div className="px-4 sm:px-5 py-4 border-b border-black/5 flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-re-text">Shule Avance records</h2>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Filter size={16} className="text-slate-500 shrink-0" />
            <select
              value={tableFilter}
              onChange={(e) => setTableFilter(e.target.value)}
              className="flex-1 sm:flex-none rounded-xl border border-black/10 bg-white px-3 py-2 text-xs font-bold text-slate-800 min-w-[200px]"
            >
              <option value="sent_to_manager">Awaiting my decision</option>
              <option value="all">All statuses</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected (by manager)</option>
              <option value="other">With finance / rejected by finance</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="py-16 flex items-center justify-center gap-2 text-slate-500">
            <Loader2 size={18} className="animate-spin" />
            <span className="text-sm font-bold">Loading…</span>
          </div>
        ) : filteredRows.length === 0 ? (
          <div className="py-16 text-center text-sm font-bold text-slate-400">No requests in this filter.</div>
        ) : (
          <>
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-4 py-3">ID</th>
                    <th className="px-4 py-3">Staff</th>
                    <th className="px-4 py-3">Teacher Deals</th>
                    <th className="px-4 py-3">Amount</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/5">
                  {filteredRows.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50/60">
                      <td className="px-4 py-3 font-mono font-bold">#{r.id}</td>
                      <td className="px-4 py-3">
                        <p className="font-bold text-re-text">{r.staff_name || `User #${r.teacher_user_id}`}</p>
                        <p className="text-[10px] text-slate-500">{r.submitter_role_code}</p>
                      </td>
                      <td className="px-4 py-3 font-semibold">{fmtMoney(r.amount_rwf)}</td>
                      <td className="px-4 py-3">
                        {isTeacherDealRequest(r) ? (
                          <span className="inline-flex rounded-full border px-2 py-0.5 text-[9px] font-semibold uppercase bg-fuchsia-50 text-fuchsia-800 border-fuchsia-200">
                            Teacher Deals
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-slate-300">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full border px-2 py-0.5 text-[9px] font-semibold uppercase ${
                            STATUS_LABEL[r.status]?.cls || 'bg-slate-100'
                          }`}
                        >
                          {STATUS_LABEL[r.status]?.label || r.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {r.status === 'sent_to_manager' ? (
                          <>
                            <button
                              type="button"
                              disabled={busyId === r.id}
                              onClick={() => {
                                setFeedbackDraft('');
                                setModal({ decision: 'approved', row: r });
                              }}
                              className="mr-2 inline-flex items-center gap-1 h-9 px-3 rounded-lg bg-emerald-600 text-white text-[10px] font-semibold uppercase disabled:opacity-50"
                            >
                              <CheckCircle2 size={14} /> Approve
                            </button>
                            <button
                              type="button"
                              disabled={busyId === r.id}
                              onClick={() => {
                                setFeedbackDraft('');
                                setModal({ decision: 'rejected', row: r });
                              }}
                              className="inline-flex items-center gap-1 h-9 px-3 rounded-lg border border-red-200 bg-red-50 text-red-700 text-[10px] font-semibold uppercase disabled:opacity-50"
                            >
                              <XCircle size={14} /> Reject
                            </button>
                          </>
                        ) : (
                          <span className="text-[10px] font-bold text-slate-400">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="md:hidden divide-y divide-black/5">
              {filteredRows.map((r) => (
                <div key={r.id} className="p-4 space-y-2">
                  <div className="flex justify-between gap-2">
                    <p className="text-lg font-semibold text-re-text">{fmtMoney(r.amount_rwf)}</p>
                    <span
                      className={`h-fit text-[9px] font-semibold uppercase px-2 py-1 rounded-full border ${
                        STATUS_LABEL[r.status]?.cls
                      }`}
                    >
                      {STATUS_LABEL[r.status]?.label || r.status}
                    </span>
                  </div>
                  <p className="text-xs font-bold text-slate-600">
                    {r.staff_name || `User #${r.teacher_user_id}`} · #{r.id}
                  </p>
                  <p className="text-xs text-slate-600 line-clamp-2">{r.purpose}</p>
                  {isTeacherDealRequest(r) ? (
                    <p className="inline-flex rounded-full border px-2 py-0.5 text-[9px] font-semibold uppercase bg-fuchsia-50 text-fuchsia-800 border-fuchsia-200">
                      Teacher Deals
                    </p>
                  ) : null}
                  {r.accountant_note ? (
                    <p className="text-[10px] text-sky-800 bg-sky-50 rounded-lg p-2">
                      <span className="font-semibold">Finance:</span> {r.accountant_note}
                    </p>
                  ) : null}
                  {r.status === 'sent_to_manager' ? (
                    <div className="flex flex-col gap-2 pt-2">
                      <button
                        type="button"
                        disabled={busyId === r.id}
                        onClick={() => {
                          setFeedbackDraft('');
                          setModal({ decision: 'approved', row: r });
                        }}
                        className="h-11 w-full rounded-xl bg-emerald-600 text-white text-[10px] font-semibold uppercase"
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        disabled={busyId === r.id}
                        onClick={() => {
                          setFeedbackDraft('');
                          setModal({ decision: 'rejected', row: r });
                        }}
                        className="h-11 w-full rounded-xl border border-red-200 bg-red-50 text-red-700 text-[10px] font-semibold uppercase"
                      >
                        Reject
                      </button>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </>
        )}
      </section>
          </div>
        )}
      />

      <Modal
        open={!!modal}
        onClose={closeModal}
        title={modal?.decision === 'approved' ? 'Approve request' : 'Reject request'}
        subtitle={
          modal?.decision === 'approved'
            ? 'Optional message to the requester — visible on their dashboard.'
            : 'Optional reason — visible to the requester.'
        }
      >
        <div className="rounded-xl bg-slate-50 border border-slate-100 p-3 mb-4 text-xs text-slate-700">
          <p className="font-semibold text-re-text">#{modal?.row?.id} · {fmtMoney(modal?.row?.amount_rwf)}</p>
          <p className="mt-1 font-semibold line-clamp-3">{modal?.row?.purpose}</p>
        </div>
        <label className="block text-[10px] font-semibold uppercase tracking-widest text-slate-500 mb-2">
          Comment (optional)
        </label>
        <textarea
          value={feedbackDraft}
          onChange={(e) => setFeedbackDraft(e.target.value)}
          className="w-full min-h-[120px] rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold outline-none focus:ring-2 focus:ring-re-orange/30"
          placeholder="Add context for your decision…"
        />
        <div className="mt-4 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
          <button
            type="button"
            onClick={closeModal}
            className="h-11 px-4 rounded-xl border border-slate-200 text-xs font-semibold uppercase text-slate-700"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={busyId === modal?.row?.id}
            onClick={submitDecision}
            className={`h-11 px-5 rounded-xl text-xs font-semibold uppercase text-white disabled:opacity-50 ${
              modal?.decision === 'approved' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'
            }`}
          >
            {busyId === modal?.row?.id ? 'Saving…' : modal?.decision === 'approved' ? 'Confirm approval' : 'Confirm rejection'}
          </button>
        </div>
      </Modal>
    </>
  );
}
