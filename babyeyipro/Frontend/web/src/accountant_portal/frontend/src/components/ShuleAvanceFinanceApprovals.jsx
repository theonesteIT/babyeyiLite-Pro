import { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Building2,
  Loader2,
  RefreshCw,
  Send,
  XCircle,
  LayoutGrid,
  CheckCircle2,
  Ban,
  Filter,
  X,
} from 'lucide-react';
import api from '../services/api';

function fmtMoney(v) {
  const n = Number(v || 0);
  return `${n.toLocaleString()} RWF`;
}

const STATUS_LABEL = {
  pending_accountant: { label: 'Pending', cls: 'bg-amber-50 text-amber-900 border-amber-200' },
  sent_to_manager: { label: 'Sent to manager', cls: 'bg-sky-50 text-sky-800 border-sky-200' },
  approved: { label: 'Approved', cls: 'bg-emerald-50 text-emerald-900 border-emerald-200' },
  rejected_by_accountant: { label: 'Rejected (finance)', cls: 'bg-red-50 text-red-800 border-red-200' },
  rejected_by_manager: { label: 'Rejected (manager)', cls: 'bg-red-50 text-red-900 border-red-200' },
};

function isTeacherDealRequest(row) {
  return String(row?.request_type || '').toLowerCase() === 'service'
    && String(row?.service_category || '').toLowerCase() === 'teacher_deals';
}

function Modal({ open, title, subtitle, children, onClose, wide }) {
  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-[500] flex items-end justify-center p-0 sm:items-center sm:p-4">
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-[2px]"
        aria-label="Close"
        onClick={onClose}
      />
      <div
        className={`relative z-10 w-full animate-in fade-in zoom-in-95 duration-200 rounded-t-[24px] bg-white shadow-2xl sm:rounded-2xl border border-slate-200/80 ${
          wide ? 'max-w-lg' : 'max-w-md'
        } max-h-[90vh] overflow-hidden flex flex-col`}
      >
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4 bg-gradient-to-r from-[#0f172a] to-[#000435] text-white">
          <div>
            <h3 className="text-sm font-black uppercase tracking-wide">{title}</h3>
            {subtitle ? <p className="mt-1 text-[11px] font-semibold text-white/75 leading-snug">{subtitle}</p> : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 hover:bg-white/10 transition-colors"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>
        <div className="overflow-y-auto p-5">{children}</div>
      </div>
    </div>,
    document.body
  );
}

export default function ShuleAvanceFinanceApprovals() {
  const [allRows, setAllRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [tableFilter, setTableFilter] = useState('pending_accountant');

  const [modal, setModal] = useState(null);
  const [noteDraft, setNoteDraft] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setErr('');
    try {
      const res = await api.get('/services/shule-avance/finance/requests?status=all');
      if (!res.data?.success) throw new Error(res.data?.message || 'Failed to load');
      setAllRows(Array.isArray(res.data.data) ? res.data.data : []);
    } catch (e) {
      setErr(e.response?.data?.message || e.message || 'Failed to load queue');
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
    const rejected = allRows.filter(
      (r) => r.status === 'rejected_by_accountant' || r.status === 'rejected_by_manager'
    ).length;
    const needsAction = allRows.filter((r) => r.status === 'pending_accountant').length;
    return { total, approved, rejected, needsAction };
  }, [allRows]);

  const filteredRows = useMemo(() => {
    if (tableFilter === 'all') return allRows;
    if (tableFilter === 'pending_accountant') {
      return allRows.filter((r) => r.status === 'pending_accountant');
    }
    if (tableFilter === 'sent_to_manager') return allRows.filter((r) => r.status === 'sent_to_manager');
    if (tableFilter === 'approved') return allRows.filter((r) => r.status === 'approved');
    if (tableFilter === 'rejected') {
      return allRows.filter(
        (r) => r.status === 'rejected_by_accountant' || r.status === 'rejected_by_manager'
      );
    }
    return allRows;
  }, [allRows, tableFilter]);

  const openSendModal = (row) => {
    setNoteDraft('');
    setModal({ type: 'send', row });
  };

  const openRejectModal = (row) => {
    setNoteDraft('');
    setModal({ type: 'reject', row });
  };

  const closeModal = () => {
    setModal(null);
    setNoteDraft('');
  };

  const submitSend = async () => {
    if (!modal?.row?.id) return;
    const id = modal.row.id;
    setBusyId(id);
    setMsg('');
    setErr('');
    try {
      const res = await api.patch(`/services/shule-avance/finance/invoice-requests/${id}/send-to-manager`, {
        note: noteDraft.trim(),
      });
      if (!res.data?.success) throw new Error(res.data?.message || 'Action failed');
      setMsg('Request sent to school manager.');
      closeModal();
      await load();
    } catch (e) {
      setErr(e.response?.data?.message || e.message || 'Could not send.');
    } finally {
      setBusyId(null);
    }
  };

  const submitReject = async () => {
    if (!modal?.row?.id) return;
    const id = modal.row.id;
    setBusyId(id);
    setMsg('');
    setErr('');
    try {
      const res = await api.patch(`/services/shule-avance/finance/invoice-requests/${id}/reject`, {
        note: noteDraft.trim(),
      });
      if (!res.data?.success) throw new Error(res.data?.message || 'Action failed');
      setMsg('Request rejected. The staff member can see this on their dashboard.');
      closeModal();
      await load();
    } catch (e) {
      setErr(e.response?.data?.message || e.message || 'Could not reject.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="bg-white rounded-[28px] shadow-2xl border border-black/5 overflow-hidden">
      <div className="px-4 sm:px-8 py-5 border-b border-black/5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <Building2 size={18} className="text-[#000435] shrink-0" />
          <h2 className="text-sm font-black text-[#000435] uppercase tracking-tight truncate">
            ShuleAvance · Accountant Queue
          </h2>
        </div>
        <button
          type="button"
          onClick={load}
          className="inline-flex items-center gap-2 h-9 px-3 rounded-xl border border-black/5 text-[10px] font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Stats — responsive grid */}
      <div className="px-4 sm:px-8 pt-5 grid grid-cols-2 lg:grid-cols-4 gap-3">
        <button
          type="button"
          onClick={() => {
            setTableFilter('all');
          }}
          className={`rounded-2xl border p-4 text-left transition shadow-sm hover:shadow-md ${
            tableFilter === 'all' ? 'border-[#000435] ring-2 ring-[#000435]/20' : 'border-black/5'
          }`}
        >
          <div className="flex items-center gap-2 text-slate-500 mb-1">
            <LayoutGrid size={14} />
            <span className="text-[9px] font-black uppercase tracking-widest">Total</span>
          </div>
          <p className="text-2xl font-black text-[#000435]">{stats.total}</p>
          <p className="text-[10px] font-bold text-slate-400 mt-0.5">All requests</p>
        </button>
        <button
          type="button"
          onClick={() => setTableFilter('approved')}
          className={`rounded-2xl border p-4 text-left transition shadow-sm hover:shadow-md ${
            tableFilter === 'approved' ? 'border-emerald-500 ring-2 ring-emerald-500/20' : 'border-black/5'
          }`}
        >
          <div className="flex items-center gap-2 text-emerald-700 mb-1">
            <CheckCircle2 size={14} />
            <span className="text-[9px] font-black uppercase tracking-widest">Approved</span>
          </div>
          <p className="text-2xl font-black text-emerald-700">{stats.approved}</p>
          <p className="text-[10px] font-bold text-slate-400 mt-0.5">Final approval</p>
        </button>
        <button
          type="button"
          onClick={() => setTableFilter('rejected')}
          className={`rounded-2xl border p-4 text-left transition shadow-sm hover:shadow-md ${
            tableFilter === 'rejected' ? 'border-red-400 ring-2 ring-red-400/20' : 'border-black/5'
          }`}
        >
          <div className="flex items-center gap-2 text-red-700 mb-1">
            <Ban size={14} />
            <span className="text-[9px] font-black uppercase tracking-widest">Rejected</span>
          </div>
          <p className="text-2xl font-black text-red-700">{stats.rejected}</p>
          <p className="text-[10px] font-bold text-slate-400 mt-0.5">Finance or manager</p>
        </button>
        <button
          type="button"
          onClick={() => setTableFilter('pending_accountant')}
          className={`rounded-2xl border p-4 text-left transition shadow-sm hover:shadow-md ${
            tableFilter === 'pending_accountant' ? 'border-amber-500 ring-2 ring-amber-500/20' : 'border-black/5'
          }`}
        >
          <div className="flex items-center gap-2 text-amber-800 mb-1">
            <span className="text-[9px] font-black uppercase tracking-widest">Action</span>
          </div>
          <p className="text-2xl font-black text-amber-800">{stats.needsAction}</p>
          <p className="text-[10px] font-bold text-slate-400 mt-0.5">Awaiting you</p>
        </button>
      </div>

      {msg ? (
        <div className="mx-4 sm:mx-8 mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-[11px] font-bold text-emerald-900">
          {msg}
        </div>
      ) : null}
      {err ? (
        <div className="mx-4 sm:mx-8 mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-[11px] font-bold text-red-700">
          {err}
        </div>
      ) : null}

      <div className="p-4 sm:p-8 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex items-center gap-2 text-slate-600">
            <Filter size={16} />
            <span className="text-[10px] font-black uppercase tracking-widest">Filter list</span>
          </div>
          <select
            value={tableFilter}
            onChange={(e) => setTableFilter(e.target.value)}
            className="w-full sm:w-auto min-w-[200px] rounded-xl border border-black/10 bg-white px-3 py-2.5 text-xs font-bold text-slate-800"
          >
            <option value="pending_accountant">Needs my action (pending)</option>
            <option value="all">All statuses</option>
            <option value="sent_to_manager">Sent to school manager</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-12 text-slate-400">
            <Loader2 className="animate-spin" size={20} />
            <span className="text-[11px] font-black uppercase tracking-widest">Loading...</span>
          </div>
        ) : filteredRows.length === 0 ? (
          <p className="text-center text-[12px] font-bold text-slate-400 py-10">
            No requests in this view.
          </p>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto rounded-2xl border border-black/5">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-[10px] font-black uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-4 py-3">ID</th>
                    <th className="px-4 py-3">Staff</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Teacher Deals</th>
                    <th className="px-4 py-3">Amount</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/5">
                  {filteredRows.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50/80">
                      <td className="px-4 py-3 font-mono font-bold text-slate-700">#{r.id}</td>
                      <td className="px-4 py-3">
                        <p className="font-bold text-[#000435]">{r.staff_name || '—'}</p>
                        <p className="text-[10px] text-slate-500">{r.submitter_role_code || ''}</p>
                      </td>
                      <td className="px-4 py-3 capitalize text-xs font-semibold">{r.request_type || '—'}</td>
                      <td className="px-4 py-3 font-black">{fmtMoney(r.amount_rwf)}</td>
                      <td className="px-4 py-3">
                        {isTeacherDealRequest(r) ? (
                          <span className="inline-flex rounded-full border px-2 py-0.5 text-[9px] font-black uppercase bg-fuchsia-50 text-fuchsia-800 border-fuchsia-200">
                            Teacher Deals
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-slate-300">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full border px-2 py-0.5 text-[9px] font-black uppercase ${
                            STATUS_LABEL[r.status]?.cls || 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {STATUS_LABEL[r.status]?.label || r.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        {r.status === 'pending_accountant' ? (
                          <>
                            <button
                              type="button"
                              disabled={busyId === r.id}
                              onClick={() => openSendModal(r)}
                              className="mr-2 inline-flex items-center gap-1 h-9 px-3 rounded-xl text-[10px] font-black uppercase text-white shadow-sm disabled:opacity-50"
                              style={{ background: 'linear-gradient(135deg,#000435,#0D2644)' }}
                            >
                              <Send size={14} /> To manager
                            </button>
                            <button
                              type="button"
                              disabled={busyId === r.id}
                              onClick={() => openRejectModal(r)}
                              className="inline-flex items-center gap-1 h-9 px-3 rounded-xl text-[10px] font-black uppercase text-red-600 border border-red-200 bg-red-50"
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

            {/* Mobile cards */}
            <div className="md:hidden space-y-3">
              {filteredRows.map((r) => (
                <div
                  key={r.id}
                  className="rounded-2xl border border-black/5 p-4 space-y-3 bg-slate-50/40"
                >
                  <div className="flex justify-between gap-2">
                    <div>
                      <p className="font-black text-[#000435]">{r.staff_name || `User #${r.teacher_user_id}`}</p>
                      <p className="text-[10px] font-bold text-slate-500">
                        #{r.id} · {r.submitter_role_code || 'Staff'}
                      </p>
                    </div>
                    <span
                      className={`h-fit text-[9px] font-black uppercase px-2 py-1 rounded-full border ${
                        STATUS_LABEL[r.status]?.cls || 'bg-slate-100'
                      }`}
                    >
                      {STATUS_LABEL[r.status]?.label || r.status}
                    </span>
                  </div>
                  <p className="text-lg font-black text-[#000435]">{fmtMoney(r.amount_rwf)}</p>
                  <p className="text-[11px] text-slate-600 line-clamp-3">{r.purpose}</p>
                  {isTeacherDealRequest(r) ? (
                    <p className="inline-flex rounded-full border px-2 py-0.5 text-[9px] font-black uppercase bg-fuchsia-50 text-fuchsia-800 border-fuchsia-200">
                      Teacher Deals
                    </p>
                  ) : null}
                  {r.status === 'pending_accountant' ? (
                    <div className="flex flex-col gap-2">
                      <button
                        type="button"
                        disabled={busyId === r.id}
                        onClick={() => openSendModal(r)}
                        className="h-11 w-full rounded-xl text-[10px] font-black uppercase text-white"
                        style={{ background: 'linear-gradient(135deg,#000435,#0D2644)' }}
                      >
                        Send to school manager
                      </button>
                      <button
                        type="button"
                        disabled={busyId === r.id}
                        onClick={() => openRejectModal(r)}
                        className="h-11 w-full rounded-xl text-[10px] font-black uppercase text-red-600 border border-red-200 bg-white"
                      >
                        Reject request
                      </button>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <Modal
        open={modal?.type === 'send'}
        onClose={closeModal}
        title="Send to school manager"
        subtitle="Add an optional note for the school manager and the requester. This is stored on the request."
        wide
      >
        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">
          Note / description
        </label>
        <textarea
          value={noteDraft}
          onChange={(e) => setNoteDraft(e.target.value)}
          className="w-full min-h-[120px] rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-[#000435]/30"
          placeholder="Context for the manager (optional but recommended)…"
        />
        <div className="mt-4 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
          <button
            type="button"
            onClick={closeModal}
            className="h-11 px-4 rounded-xl border border-slate-200 text-xs font-black uppercase text-slate-700"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={busyId === modal?.row?.id}
            onClick={submitSend}
            className="h-11 px-5 rounded-xl text-xs font-black uppercase text-white disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg,#000435,#0D2644)' }}
          >
            {busyId === modal?.row?.id ? 'Sending…' : 'Confirm & send'}
          </button>
        </div>
      </Modal>

      <Modal
        open={modal?.type === 'reject'}
        onClose={closeModal}
        title="Reject request"
        subtitle="The reason is visible to the staff member on their Shule Avance dashboard."
        wide
      >
        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">
          Reason (optional)
        </label>
        <textarea
          value={noteDraft}
          onChange={(e) => setNoteDraft(e.target.value)}
          className="w-full min-h-[120px] rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-red-500/25"
          placeholder="Explain briefly why this request cannot proceed…"
        />
        <div className="mt-4 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
          <button
            type="button"
            onClick={closeModal}
            className="h-11 px-4 rounded-xl border border-slate-200 text-xs font-black uppercase text-slate-700"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={busyId === modal?.row?.id}
            onClick={submitReject}
            className="h-11 px-5 rounded-xl text-xs font-black uppercase text-white bg-red-600 hover:bg-red-700 disabled:opacity-50"
          >
            {busyId === modal?.row?.id ? 'Saving…' : 'Confirm rejection'}
          </button>
        </div>
      </Modal>
    </div>
  );
}
