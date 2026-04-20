import { useState, useEffect, useCallback } from "react";
import {
  Wallet,
  Banknote,
  Loader2,
  RefreshCw,
  Send,
  XCircle,
  Eye,
  Filter,
  Zap,
  Smartphone,
  Gift,
  ChevronRight,
  AlertCircle,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";

const API = import.meta.env.VITE_API_URL || "http://localhost:5100";
const BASE = `${API}/api/services`;

const SERVICE_CATEGORIES = [
  { key: "cash_power", label: "Cash Power", Icon: Zap },
  { key: "airtime_data", label: "Airtime & Data", Icon: Smartphone },
  { key: "teacher_deals", label: "Teacher Deals", Icon: Gift },
];

const REPAYMENT_OPTIONS = Array.from({ length: 12 }, (_, i) => i + 1);

const STATUS_LABEL = {
  pending_accountant: { label: "Pending", cls: "bg-amber-100 text-amber-900 border-amber-200" },
  sent_to_manager: { label: "Sent to School Manager", cls: "bg-sky-100 text-sky-900 border-sky-200" },
  approved: { label: "Approved", cls: "bg-emerald-100 text-emerald-900 border-emerald-200" },
  rejected_by_accountant: { label: "Rejected", cls: "bg-red-100 text-red-900 border-red-200" },
  rejected_by_manager: { label: "Rejected", cls: "bg-red-100 text-red-900 border-red-200" },
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

export default function AccountantShuleAvance() {
  const auth = useAuth();
  const userId = auth.user && auth.user !== false ? auth.user.id : null;

  const [tab, setTab] = useState("mine");
  const [mine, setMine] = useState([]);
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [qFilter, setQFilter] = useState("pending_accountant");

  const [flowOpen, setFlowOpen] = useState(false);
  const [flowKind, setFlowKind] = useState(null);
  const [stepCategory, setStepCategory] = useState(null);
  const [amount, setAmount] = useState("");
  const [repayment, setRepayment] = useState(6);
  const [description, setDescription] = useState("");
  const [cashoutReason, setCashoutReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState(null);

  const [detail, setDetail] = useState(null);
  const [sendModal, setSendModal] = useState(null);
  const [rejectModal, setRejectModal] = useState(null);
  const [noteDraft, setNoteDraft] = useState("");

  const loadMine = useCallback(async () => {
    const { res, data } = await jsonFetch(`${BASE}/shule-avance/applicant/my-requests`);
    if (res.ok && data.success) setMine(Array.isArray(data.data) ? data.data : []);
    else setMine([]);
  }, []);

  const loadQueue = useCallback(async () => {
    const { res, data } = await jsonFetch(
      `${BASE}/shule-avance/finance/requests?status=${encodeURIComponent(qFilter)}`
    );
    if (res.ok && data.success) setQueue(Array.isArray(data.data) ? data.data : []);
    else setQueue([]);
  }, [qFilter]);

  const refresh = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      await Promise.all([loadMine(), loadQueue()]);
    } catch {
      setErr("Could not load data.");
    } finally {
      setLoading(false);
    }
  }, [loadMine, loadQueue]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    loadQueue();
  }, [loadQueue]);

  useEffect(() => {
    const id = window.setInterval(() => {
      loadMine();
      loadQueue();
    }, 30000);
    return () => window.clearInterval(id);
  }, [loadMine, loadQueue]);

  const resetForm = () => {
    setAmount("");
    setRepayment(6);
    setDescription("");
    setCashoutReason("");
    setStepCategory(null);
  };

  const submitOwn = async () => {
    setSubmitting(true);
    setErr(null);
    try {
      const amt = Number(String(amount).replace(/[^\d.]/g, ""));
      if (!amt || amt <= 0) {
        setErr("Enter a valid amount.");
        setSubmitting(false);
        return;
      }
      const body =
        flowKind === "service"
          ? {
              request_type: "service",
              service_category: stepCategory,
              description: String(description || "").trim(),
              amount_requested: amt,
              repayment_term_months: Number(repayment),
            }
          : {
              request_type: "cashout",
              reason: String(cashoutReason || "").trim(),
              description: String(description || "").trim() || undefined,
              amount_requested: amt,
              repayment_term_months: Number(repayment),
            };
      if (flowKind === "service" && !stepCategory) {
        setErr("Select a service category.");
        setSubmitting(false);
        return;
      }
      if (flowKind === "cashout" && !body.reason) {
        setErr("Add a reason.");
        setSubmitting(false);
        return;
      }
      const { res, data } = await jsonFetch(`${BASE}/shule-avance/applicant/requests`, {
        method: "POST",
        body: JSON.stringify(body),
      });
      if (!res.ok || !data.success) {
        setErr(data.message || "Submit failed.");
        setSubmitting(false);
        return;
      }
      setFlowOpen(false);
      setFlowKind(null);
      resetForm();
      await loadMine();
      setTab("mine");
    } catch {
      setErr("Submit failed.");
    } finally {
      setSubmitting(false);
    }
  };

  const sendToManager = async () => {
    if (!sendModal?.id) return;
    setSubmitting(true);
    try {
      const { res, data } = await jsonFetch(
        `${BASE}/shule-avance/finance/invoice-requests/${sendModal.id}/send-to-manager`,
        { method: "PATCH", body: JSON.stringify({ note: noteDraft }) }
      );
      if (!res.ok || !data.success) {
        alert(data.message || "Failed");
        setSubmitting(false);
        return;
      }
      setSendModal(null);
      setNoteDraft("");
      await loadQueue();
    } finally {
      setSubmitting(false);
    }
  };

  const rejectStaff = async () => {
    if (!rejectModal?.id) return;
    setSubmitting(true);
    try {
      const { res, data } = await jsonFetch(
        `${BASE}/shule-avance/finance/invoice-requests/${rejectModal.id}/reject`,
        { method: "PATCH", body: JSON.stringify({ note: noteDraft }) }
      );
      if (!res.ok || !data.success) {
        alert(data.message || "Failed");
        setSubmitting(false);
        return;
      }
      setRejectModal(null);
      setNoteDraft("");
      await loadQueue();
    } finally {
      setSubmitting(false);
    }
  };

  if (auth.loading || loading) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="h-10 w-10 animate-spin text-[#FEBF10]" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-black tracking-tight text-[#1A1200] sm:text-3xl">Shule Avance</h1>
        <p className="mt-1 text-sm text-slate-600">
          Submit your own requests, review staff submissions, and forward them to the school manager.
        </p>
      </div>

      {err && (
        <div className="flex items-start gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-800">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          {err}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => {
            resetForm();
            setFlowKind("service");
            setFlowOpen(true);
          }}
          className="flex items-center gap-4 rounded-2xl border border-[#FDEAA0] bg-white p-5 text-left shadow-md transition hover:shadow-lg"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100">
            <Wallet className="h-6 w-6 text-[#B88A00]" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Service</p>
            <p className="font-black text-[#1A1200]">Service request</p>
            <p className="text-xs font-semibold text-slate-500">Cash Power, Airtime &amp; Data, Teacher Deals</p>
          </div>
          <ChevronRight className="h-5 w-5 text-slate-400" />
        </button>
        <button
          type="button"
          onClick={() => {
            resetForm();
            setFlowKind("cashout");
            setFlowOpen(true);
          }}
          className="flex items-center gap-4 rounded-2xl border border-[#FDEAA0] bg-white p-5 text-left shadow-md transition hover:shadow-lg"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-100">
            <Banknote className="h-6 w-6 text-sky-800" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Cashout</p>
            <p className="font-black text-[#1A1200]">Cashout request</p>
            <p className="text-xs font-semibold text-slate-500">Advance with reason &amp; repayment</p>
          </div>
          <ChevronRight className="h-5 w-5 text-slate-400" />
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-b border-[#FDEAA0]/80 pb-3">
        {[
          { id: "mine", label: "My requests" },
          { id: "queue", label: "School queue (teachers & staff)" },
        ].map((x) => (
          <button
            key={x.id}
            type="button"
            onClick={() => setTab(x.id)}
            className={`rounded-xl px-4 py-2 text-sm font-black transition ${
              tab === x.id
                ? "bg-[#1A1200] text-[#FEBF10]"
                : "bg-white text-slate-600 border border-[#FDEAA0]"
            }`}
          >
            {x.label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => refresh()}
          className="ml-auto inline-flex items-center gap-2 rounded-xl border border-[#FDEAA0] bg-white px-3 py-2 text-xs font-black text-slate-700"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh
        </button>
      </div>

      {tab === "mine" && (
        <div className="overflow-hidden rounded-2xl border border-[#FDEAA0]/80 bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-100 bg-[#FFFBF0] text-[10px] font-black uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-4 py-3">ID</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {mine.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center font-semibold text-slate-500">
                    No requests yet.
                  </td>
                </tr>
              ) : (
                mine.map((r) => (
                  <tr key={r.id} className="hover:bg-[#FFFBF0]/50">
                    <td className="px-4 py-3 font-mono font-bold">#{r.id}</td>
                    <td className="px-4 py-3 font-semibold capitalize">{r.request_type || "service"}</td>
                    <td className="px-4 py-3 font-black">{formatMoney(r.amount_rwf)}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full border px-2.5 py-0.5 text-[10px] font-black uppercase ${
                          STATUS_LABEL[r.status]?.cls || "bg-slate-100"
                        }`}
                      >
                        {STATUS_LABEL[r.status]?.label || r.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => setDetail(r)}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-[10px] font-black uppercase text-slate-700"
                      >
                        <Eye className="h-3 w-3" /> View
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {tab === "queue" && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Filter className="h-4 w-4 text-slate-500" />
            <span className="text-xs font-black uppercase text-slate-500">Filter</span>
            <select
              value={qFilter}
              onChange={(e) => setQFilter(e.target.value)}
              className="rounded-xl border border-[#FDEAA0] bg-white px-3 py-2 text-sm font-bold text-slate-800"
            >
              <option value="all">All</option>
              <option value="pending_accountant">Pending (action)</option>
              <option value="sent_to_manager">Sent to manager</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
            <p className="text-xs text-slate-500">
              Teachers, HOD, DOS, and your own requests appear here. Use filters to focus the queue.
            </p>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-[#FDEAA0]/80 bg-white shadow-sm">
            <table className="w-full min-w-[880px] text-left text-sm">
              <thead className="border-b border-slate-100 bg-[#FFFBF0] text-[10px] font-black uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-3 py-3">ID</th>
                  <th className="px-3 py-3">By</th>
                  <th className="px-3 py-3">Role</th>
                  <th className="px-3 py-3">Type</th>
                  <th className="px-3 py-3">Amount</th>
                  <th className="px-3 py-3">Status</th>
                  <th className="px-3 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {queue.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center font-semibold text-slate-500">
                      No requests for this filter.
                    </td>
                  </tr>
                ) : (
                  queue.map((r) => (
                    <tr key={r.id} className="hover:bg-[#FFFBF0]/50">
                      <td className="px-3 py-3 font-mono font-bold">#{r.id}</td>
                      <td className="px-3 py-3 font-semibold text-slate-800">
                        {r.staff_name?.trim() || r.staff_email || "—"}
                        {userId && Number(r.teacher_user_id) === Number(userId) ? (
                          <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-[9px] font-black uppercase text-amber-900">
                            You
                          </span>
                        ) : null}
                      </td>
                      <td className="px-3 py-3 text-xs font-bold text-slate-600">
                        {r.submitter_role_code || "—"}
                      </td>
                      <td className="px-3 py-3 capitalize">{r.request_type || "service"}</td>
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
                        {r.status === "pending_accountant" &&
                          !(userId && Number(r.teacher_user_id) === Number(userId)) && (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                setSendModal(r);
                                setNoteDraft("");
                              }}
                              className="mr-1 inline-flex items-center gap-1 rounded-lg bg-[#1A1200] px-2 py-1 text-[10px] font-black uppercase text-[#FEBF10]"
                            >
                              <Send className="h-3 w-3" /> To manager
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setRejectModal(r);
                                setNoteDraft("");
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
        </div>
      )}

      {/* Create modal */}
      {flowOpen && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4">
          <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl">
            <div className="sticky top-0 flex items-center justify-between border-b px-4 py-3">
              <h2 className="text-sm font-black uppercase">
                {flowKind === "cashout" ? "Cashout request" : "Service request"}
              </h2>
              <button
                type="button"
                className="rounded-lg px-2 py-1 text-xs font-black"
                onClick={() => {
                  setFlowOpen(false);
                  setFlowKind(null);
                  resetForm();
                }}
              >
                Close
              </button>
            </div>
            <div className="space-y-4 p-4">
              {flowKind === "service" && !stepCategory && (
                <div className="space-y-2">
                  {SERVICE_CATEGORIES.map(({ key, label, Icon }) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setStepCategory(key)}
                      className="flex w-full items-center gap-3 rounded-xl border border-slate-200 p-3 text-left hover:border-[#FEBF10]"
                    >
                      <Icon className="h-5 w-5 text-[#B88A00]" />
                      <span className="font-black">{label}</span>
                    </button>
                  ))}
                </div>
              )}
              {flowKind === "service" && stepCategory && (
                <>
                  <p className="text-xs font-bold text-slate-600">
                    Service:{" "}
                    <span className="text-[#1A1200]">
                      {SERVICE_CATEGORIES.find((c) => c.key === stepCategory)?.label}
                    </span>
                  </p>
                  <label className="block text-[10px] font-black uppercase text-slate-500">Amount (RWF)</label>
                  <input
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 font-bold"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                  />
                  <label className="block text-[10px] font-black uppercase text-slate-500">Repayment</label>
                  <select
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 font-bold"
                    value={repayment}
                    onChange={(e) => setRepayment(Number(e.target.value))}
                  >
                    {REPAYMENT_OPTIONS.map((m) => (
                      <option key={m} value={m}>
                        {m} months
                      </option>
                    ))}
                  </select>
                  <label className="block text-[10px] font-black uppercase text-slate-500">
                    Description <span className="font-semibold normal-case text-slate-400">(optional)</span>
                  </label>
                  <textarea
                    className="min-h-[88px] w-full rounded-xl border border-slate-200 px-3 py-2 font-bold"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Optional notes for finance"
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-black"
                      onClick={() => setStepCategory(null)}
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={submitOwn}
                      className="ml-auto rounded-xl bg-[#1A1200] px-4 py-2 text-xs font-black text-[#FEBF10] disabled:opacity-50"
                    >
                      {submitting ? "…" : "Submit"}
                    </button>
                  </div>
                </>
              )}
              {flowKind === "cashout" && (
                <>
                  <label className="block text-[10px] font-black uppercase text-slate-500">Amount (RWF)</label>
                  <input
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 font-bold"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                  />
                  <label className="block text-[10px] font-black uppercase text-slate-500">Reason</label>
                  <textarea
                    className="min-h-[72px] w-full rounded-xl border border-slate-200 px-3 py-2 font-bold"
                    value={cashoutReason}
                    onChange={(e) => setCashoutReason(e.target.value)}
                  />
                  <label className="block text-[10px] font-black uppercase text-slate-500">Repayment</label>
                  <select
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 font-bold"
                    value={repayment}
                    onChange={(e) => setRepayment(Number(e.target.value))}
                  >
                    {REPAYMENT_OPTIONS.map((m) => (
                      <option key={m} value={m}>
                        {m} months
                      </option>
                    ))}
                  </select>
                  <label className="block text-[10px] font-black uppercase text-slate-500">
                    Description (optional)
                  </label>
                  <textarea
                    className="min-h-[64px] w-full rounded-xl border border-slate-200 px-3 py-2 font-bold"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={submitOwn}
                    className="w-full rounded-xl bg-[#1A1200] py-3 text-xs font-black text-[#FEBF10] disabled:opacity-50"
                  >
                    {submitting ? "…" : "Submit cashout"}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Detail */}
      {detail && (
        <div className="fixed inset-0 z-[110] flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white p-5 shadow-xl sm:rounded-2xl">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-lg font-black">Request #{detail.id}</h3>
              <button type="button" className="text-sm font-black" onClick={() => setDetail(null)}>
                Close
              </button>
            </div>
            <div className="space-y-2 text-sm">
              <p>
                <span className="font-black text-slate-500">By: </span>
                {detail.staff_name || "—"} ({detail.submitter_role_code || "—"})
              </p>
              <p>
                <span className="font-black text-slate-500">Type: </span>
                {detail.request_type}
              </p>
              <p>
                <span className="font-black text-slate-500">Amount: </span>
                {formatMoney(detail.amount_rwf)}
              </p>
              <p>
                <span className="font-black text-slate-500">Purpose / notes: </span>
                {detail.purpose}
              </p>
              {detail.details ? (
                <p>
                  <span className="font-black text-slate-500">Details: </span>
                  {detail.details}
                </p>
              ) : null}
              {detail.accountant_note ? (
                <p className="rounded-xl bg-sky-50 p-3 text-sky-950">
                  <span className="font-black">Finance note: </span>
                  {detail.accountant_note}
                </p>
              ) : null}
              {detail.manager_feedback ? (
                <p className="rounded-xl bg-emerald-50 p-3 text-emerald-950">
                  <span className="font-black">Manager: </span>
                  {detail.manager_feedback}
                </p>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {sendModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
            <h3 className="text-base font-black">Send to school manager</h3>
            <p className="mt-1 text-xs text-slate-600">
              Optional note for the manager (context on this request).
            </p>
            <textarea
              className="mt-3 min-h-[96px] w-full rounded-xl border border-slate-200 p-3 text-sm"
              value={noteDraft}
              onChange={(e) => setNoteDraft(e.target.value)}
              placeholder="Comment for the school manager…"
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-black"
                onClick={() => setSendModal(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={sendToManager}
                className="rounded-xl bg-[#1A1200] px-4 py-2 text-xs font-black text-[#FEBF10] disabled:opacity-50"
              >
                Send
              </button>
            </div>
          </div>
        </div>
      )}

      {rejectModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
            <h3 className="text-base font-black">Reject request</h3>
            <p className="mt-1 text-xs text-slate-600">Optional note to the requester (shown on their dashboard).</p>
            <textarea
              className="mt-3 min-h-[96px] w-full rounded-xl border border-slate-200 p-3 text-sm"
              value={noteDraft}
              onChange={(e) => setNoteDraft(e.target.value)}
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-black"
                onClick={() => setRejectModal(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={rejectStaff}
                className="rounded-xl bg-red-600 px-4 py-2 text-xs font-black text-white disabled:opacity-50"
              >
                Reject
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
