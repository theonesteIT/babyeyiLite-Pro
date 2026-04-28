import { useState, useEffect, useCallback } from "react";
import { Loader2, RefreshCw, Eye, CheckCircle2, XCircle } from "lucide-react";

const API = import.meta.env.VITE_API_URL || "http://localhost:5100";
const BASE = `${API}/api/services`;

const STATUS_LABEL = {
  sent_to_manager: { label: "Sent to School Manager", cls: "bg-sky-100 text-sky-900 border-sky-200" },
  approved: { label: "Approved", cls: "bg-emerald-100 text-emerald-900 border-emerald-200" },
  rejected_by_manager: { label: "Rejected", cls: "bg-red-100 text-red-900 border-red-200" },
  pending_accountant: { label: "Pending (finance)", cls: "bg-amber-100 text-amber-900 border-amber-200" },
  rejected_by_accountant: { label: "Rejected (finance)", cls: "bg-red-100 text-red-900 border-red-200" },
};

function formatMoney(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return "—";
  return `${Math.round(v).toLocaleString()} RWF`;
}

async function jsonFetch(url, options = {}) {
  const res = await fetch(url, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  return { res, data };
}

/**
 * School Manager — Shule Avance approvals forwarded by the accountant.
 */
export default function SchoolManagerShuleAvance({ toast }) {
  const [status, setStatus] = useState("sent_to_manager");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState(null);
  const [decisionModal, setDecisionModal] = useState(null);
  const [feedback, setFeedback] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { res, data } = await jsonFetch(
        `${BASE}/shule-avance/manager/requests?status=${encodeURIComponent(status)}`
      );
      if (res.ok && data.success) setRows(Array.isArray(data.data) ? data.data : []);
      else setRows([]);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const id = window.setInterval(load, 32000);
    return () => window.clearInterval(id);
  }, [load]);

  const submitDecision = async (decision) => {
    if (!decisionModal?.id) return;
    setSubmitting(true);
    try {
      const { res, data } = await jsonFetch(
        `${BASE}/shule-avance/manager/invoice-requests/${decisionModal.id}/decision`,
        {
          method: "PATCH",
          body: JSON.stringify({ decision, feedback }),
        }
      );
      if (!res.ok || !data.success) {
        toast?.(data.message || "Could not save decision.", "error");
        setSubmitting(false);
        return;
      }
      toast?.(data.message || "Saved.", "success");
      setDecisionModal(null);
      setFeedback("");
      await load();
      setDetail(null);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="slide-up anim space-y-6">
      <div>
        <h2 className="text-xl font-black tracking-tight text-[#000435] sm:text-2xl">Shule Avance</h2>
        <p className="mt-1 text-sm text-slate-600">
          Review requests sent by your accountant and approve or reject with an optional comment.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">View</label>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded-xl border border-amber-200 bg-white px-3 py-2 text-sm font-bold text-slate-800"
        >
          <option value="sent_to_manager">Needs your decision</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected by manager</option>
          <option value="all">All</option>
        </select>
        <button
          type="button"
          onClick={() => load()}
          className="inline-flex items-center gap-2 rounded-xl border border-amber-200 bg-white px-3 py-2 text-xs font-black text-slate-700"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {loading && !rows.length ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-10 w-10 animate-spin text-amber-500" />
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-amber-100 bg-white shadow-md">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead className="border-b border-slate-100 bg-[#FFFBF0] text-[10px] font-black uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-3 py-3">ID</th>
                <th className="px-3 py-3">Staff</th>
                <th className="px-3 py-3">Role</th>
                <th className="px-3 py-3">Type</th>
                <th className="px-3 py-3">Amount</th>
                <th className="px-3 py-3">Status</th>
                <th className="px-3 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center font-semibold text-slate-500">
                    No requests in this view.
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.id} className="hover:bg-amber-50/40">
                    <td className="px-3 py-3 font-mono font-bold">#{r.id}</td>
                    <td className="px-3 py-3 font-semibold">{r.staff_name?.trim() || r.staff_email || "—"}</td>
                    <td className="px-3 py-3 text-xs font-bold">{r.submitter_role_code || "—"}</td>
                    <td className="px-3 py-3 capitalize">{r.request_type || "—"}</td>
                    <td className="px-3 py-3 font-black">{formatMoney(r.amount_rwf)}</td>
                    <td className="px-3 py-3">
                      <span
                        className={`inline-flex rounded-full border px-2.5 py-0.5 text-[10px] font-black uppercase ${
                          STATUS_LABEL[r.status]?.cls
                        }`}
                      >
                        {STATUS_LABEL[r.status]?.label || r.status}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => setDetail(r)}
                        className="mr-1 inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-[10px] font-black uppercase"
                      >
                        <Eye className="h-3 w-3" /> View
                      </button>
                      {r.status === "sent_to_manager" && (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              setDecisionModal({ ...r, _dec: "approved" });
                              setFeedback("");
                            }}
                            className="mr-1 inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2 py-1 text-[10px] font-black uppercase text-white"
                          >
                            <CheckCircle2 className="h-3 w-3" /> Approve
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setDecisionModal({ ...r, _dec: "rejected" });
                              setFeedback("");
                            }}
                            className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-2 py-1 text-[10px] font-black uppercase text-red-700"
                          >
                            <XCircle className="h-3 w-3" /> Reject
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {detail && (
        <div className="fixed inset-0 z-[200] flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white p-5 shadow-2xl sm:rounded-2xl">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-lg font-black text-[#000435]">Request #{detail.id}</h3>
              <button type="button" className="text-sm font-black" onClick={() => setDetail(null)}>
                Close
              </button>
            </div>
            <div className="space-y-2 text-sm text-slate-800">
              <p>
                <span className="font-black text-slate-500">Staff: </span>
                {detail.staff_name} ({detail.submitter_role_code})
              </p>
              <p>
                <span className="font-black text-slate-500">Type: </span>
                {detail.request_type}
              </p>
              <p>
                <span className="font-black text-slate-500">Amount: </span>
                {formatMoney(detail.amount_rwf)} · {detail.repayment_term_months} mo
              </p>
              <p>
                <span className="font-black text-slate-500">Summary: </span>
                {detail.purpose}
              </p>
              {detail.details ? (
                <p>
                  <span className="font-black text-slate-500">Details: </span>
                  {detail.details}
                </p>
              ) : null}
              {detail.accountant_note ? (
                <div className="rounded-xl border border-sky-200 bg-sky-50 p-3 text-sm text-sky-950">
                  <span className="font-black">Accountant note: </span>
                  {detail.accountant_note}
                </div>
              ) : null}
              {detail.manager_feedback ? (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm">
                  <span className="font-black">Manager comment: </span>
                  {detail.manager_feedback}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {decisionModal && (
        <div className="fixed inset-0 z-[210] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
            <h3 className="text-base font-black text-[#000435]">
              {decisionModal._dec === "approved" ? "Approve request" : "Reject request"}
            </h3>
            <p className="mt-1 text-xs text-slate-600">
              Optional comment — visible to the requester on their dashboard.
            </p>
            <textarea
              className="mt-3 min-h-[100px] w-full rounded-xl border border-slate-200 p-3 text-sm"
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="Reason or acknowledgement (optional)"
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-black"
                onClick={() => setDecisionModal(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={() => submitDecision(decisionModal._dec)}
                className={`rounded-xl px-4 py-2 text-xs font-black text-white disabled:opacity-50 ${
                  decisionModal._dec === "approved" ? "bg-emerald-600" : "bg-red-600"
                }`}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
