import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Users,
  Search,
  Loader2,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowRightLeft,
  FileText,
  CreditCard,
  ClipboardList,
} from "lucide-react";

import { Modal } from "./UI";

const API = import.meta.env.VITE_API_URL || "http://localhost:5100";

const C = {
  gold: "#FEBF10",
  goldDark: "#B88A00",
  dark: "#1A1200",
  goldBg: "#FFFBE8",
  goldBorder: "#FDEAA0",
  amberBg: "#FFF3CC",
};

function fmtDT(v) {
  if (!v) return "—";
  try {
    return new Date(v).toLocaleString();
  } catch {
    return "—";
  }
}

function statusBadge(status) {
  const s = String(status || "").toLowerCase();
  if (s === "approved") {
    return "bg-emerald-50 border-emerald-200 text-emerald-800";
  }
  if (s === "rejected") {
    return "bg-red-50 border-red-200 text-red-800";
  }
  return "bg-amber-50 border-amber-200 text-amber-800";
}

function paymentBadge(code) {
  const c = String(code || "").toLowerCase();
  if (c === "full_pay") return "bg-emerald-50 border-emerald-200 text-emerald-800";
  if (c === "not_paid") return "bg-amber-50 border-amber-200 text-amber-800";
  if (c === "remain_pay") return "bg-blue-50 border-blue-200 text-blue-800";
  return "bg-slate-100 border-slate-200 text-slate-700";
}

export default function StudentTransferPage({ toast, t, session }) {
  const schoolId = session?.schoolId ?? session?.school_id ?? session?.school?.id ?? null;

  const [studentUid, setStudentUid] = useState("");
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState(null);
  const [lookup, setLookup] = useState(null);

  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [requesting, setRequesting] = useState(false);

  const [transfersLoading, setTransfersLoading] = useState(false);
  const [transfersError, setTransfersError] = useState(null);
  const [transfers, setTransfers] = useState([]);

  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyRequest, setHistoryRequest] = useState(null);

  const refreshTransfers = useCallback(async () => {
    if (!schoolId) return;
    setTransfersLoading(true);
    setTransfersError(null);
    try {
      const res = await fetch(`${API}/api/student-transfers/my?limit=50`, { credentials: "include" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) throw new Error(json.message || "Failed to load transfers");
      setTransfers(json.data?.transfers || []);
    } catch (e) {
      setTransfersError(e.message || "Failed to load transfers");
      setTransfers([]);
    } finally {
      setTransfersLoading(false);
    }
  }, [schoolId]);

  useEffect(() => {
    refreshTransfers();
  }, [refreshTransfers]);

  const canRequest = lookup?.request_eligibility?.canRequest;
  const pendingExists = lookup?.request_eligibility?.pending_request_exists;
  const studentMatchesYourSchool = lookup?.request_eligibility?.student_current_school_matches_session;

  const doLookup = useCallback(async () => {
    const uid = studentUid.trim();
    if (!uid) return;
    setLookupLoading(true);
    setLookupError(null);
    setLookup(null);
    setReason("");
    setNotes("");
    try {
      const res = await fetch(`${API}/api/student-transfers/lookup?student_uid=${encodeURIComponent(uid)}`, {
        credentials: "include",
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) throw new Error(json.message || "Lookup failed");
      setLookup(json.data);
    } catch (e) {
      setLookupError(e.message || "Lookup failed");
    } finally {
      setLookupLoading(false);
    }
  }, [studentUid]);

  const doRequestTransfer = useCallback(async () => {
    const uid = studentUid.trim();
    if (!uid) return;
    if (!reason.trim()) {
      toast?.("Please enter a transfer reason.", "warning");
      return;
    }
    setRequesting(true);
    try {
      const res = await fetch(`${API}/api/student-transfers/request`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          student_uid: uid,
          reason,
          notes,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) throw new Error(json.message || "Request failed");
      toast?.("Transfer request sent. Waiting old school approval.", "success");
      setLookup(null);
      setStudentUid("");
      setReason("");
      setNotes("");
      await refreshTransfers();
    } catch (e) {
      toast?.(e.message || "Request failed", "error");
    } finally {
      setRequesting(false);
    }
  }, [studentUid, reason, notes, toast, refreshTransfers]);

  const decideRequest = useCallback(
    async (requestId, action, decisionNotes = "") => {
      try {
        const res = await fetch(`${API}/api/student-transfers/${requestId}/decision`, {
          method: "PUT",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action, notes: decisionNotes }),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok || !json.success) throw new Error(json.message || "Decision failed");
        toast?.(`Transfer ${json.data?.status || action} successfully updated.`, "success");
        setHistoryOpen(false);
        setHistoryRequest(null);
        await refreshTransfers();
      } catch (e) {
        toast?.(e.message || "Decision failed", "error");
      }
    },
    [toast, refreshTransfers]
  );

  const incomingPendingCount = useMemo(
    () => transfers.filter((r) => r.direction === "incoming" && r.status === "pending").length,
    [transfers]
  );

  return (
    <div className="w-full">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#FFFBE8] border border-[#FDEAA0] flex items-center justify-center">
            <ArrowRightLeft className="w-5 h-5 text-[#B88A00]" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-[#1A1200]">Student Transfer / Replacement</h1>
            <p className="text-sm text-slate-600 mt-0.5">Receive students and coordinate approval with the old school.</p>
          </div>
        </div>
        <div className="rounded-2xl border border-[#FDEAA0]/70 bg-[#FFFBE8]/70 px-3 py-2 text-sm font-semibold text-[#7A5C00]">
          Incoming pending: {incomingPendingCount}
        </div>
      </div>

      {/* Lookup + request */}
      <div className="rounded-3xl border border-[#FDEAA0]/80 bg-white shadow-sm shadow-[#FDEAA0]/20 p-4 sm:p-6 mb-6">
        <div className="flex items-start gap-3 mb-3">
          <div className="w-9 h-9 rounded-2xl bg-[#FFFBE8] border border-[#FDEAA0] flex items-center justify-center">
            <Search className="w-4 h-4 text-[#B88A00]" />
          </div>
          <div>
            <h2 className="font-semibold text-[#1A1200] text-lg">Receive Student</h2>
            <p className="text-sm text-slate-600">Enter the student UID, review details, then request transfer.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
          <div className="sm:col-span-2">
            <label className="block text-[0.65rem] font-bold uppercase text-slate-500 mb-1">
              Student ID (Student UID)
            </label>
            <input
              value={studentUid}
              onChange={(e) => setStudentUid(e.target.value)}
              placeholder="e.g. 202526266468"
              className="w-full rounded-xl border border-[#FDEAA0] bg-[#FFFBE8] px-3 py-2.5 text-sm font-semibold text-[#1A1200] shadow-sm focus:outline-none focus:ring-2 focus:ring-[#FEBF10]/30"
              inputMode="numeric"
            />
          </div>
          <button
            type="button"
            onClick={doLookup}
            disabled={lookupLoading || !studentUid.trim()}
            className="h-[42px] px-5 rounded-xl bg-gradient-to-r from-[#1A1200] to-[#3D2C00] text-sm font-semibold text-[#FEBF10] shadow-sm disabled:opacity-50 flex items-center gap-2 justify-center"
          >
            {lookupLoading ? <Loader2 className="animate-spin" size={16} /> : <Search size={16} />}
            Retrieve
          </button>
        </div>

        {lookupError && (
          <div className="mt-3 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 flex items-start gap-2">
            <AlertCircle size={18} className="mt-0.5" />
            {lookupError}
          </div>
        )}

        {lookup && (
          <div className="mt-5">
            <div className="rounded-3xl border border-[#FDEAA0]/70 bg-[#FFFBE8]/70 p-4 mb-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-bold uppercase text-[#7A5C00] tracking-widest">Student snapshot</div>
                  <div className="mt-1 font-semibold text-[#1A1200] text-lg">
                    {lookup.student.full_name}{" "}
                    <span className="font-mono text-[#B88A00] text-sm">
                      ({lookup.student.student_code || lookup.student.student_uid})
                    </span>
                  </div>
                  <div className="text-sm text-slate-600 mt-0.5">
                    Class: <span className="font-semibold">{lookup.student.class_name || "—"}</span> · Academic year:{" "}
                    <span className="font-semibold">{lookup.student.academic_year || lookup.selected_period.academic_year || "—"}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {pendingExists && (
                    <span className={`inline-flex items-center px-3 py-1 rounded-lg border ${statusBadge("pending")} text-[11px] font-semibold`}>
                      Pending request already exists
                    </span>
                  )}
                  {studentMatchesYourSchool && (
                    <span className="inline-flex items-center px-3 py-1 rounded-lg border bg-amber-50 border-amber-200 text-amber-800 text-[11px] font-semibold">
                      Student already in your school
                    </span>
                  )}
                  {!canRequest && !pendingExists && !studentMatchesYourSchool && (
                    <span className="inline-flex items-center px-3 py-1 rounded-lg border bg-slate-100 border-slate-200 text-slate-700 text-[11px] font-semibold">
                      Not eligible
                    </span>
                  )}
                </div>
              </div>
              <div className="mt-3 text-sm text-slate-600">
                Previous school: <span className="font-semibold">{lookup.previous_school.name}</span>{" "}
                {lookup.previous_school.code ? <span className="font-mono text-[#B88A00]">({lookup.previous_school.code})</span> : null}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="rounded-3xl border border-slate-200/80 bg-white overflow-hidden">
                <div className="px-4 py-3 border-b border-[#FDEAA0]/60 bg-[#FFFBE8]/90 font-semibold text-[#1A1200]">
                  Full profile
                </div>
                <div className="p-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <div className="text-[0.65rem] font-bold uppercase text-slate-500">Gender</div>
                      <div className="font-semibold text-[#1A1200]">{lookup.student.gender || "—"}</div>
                    </div>
                    <div>
                      <div className="text-[0.65rem] font-bold uppercase text-slate-500">Nationality</div>
                      <div className="font-semibold text-[#1A1200]">{lookup.student.nationality || "—"}</div>
                    </div>
                    <div>
                      <div className="text-[0.65rem] font-bold uppercase text-slate-500">Father</div>
                      <div className="font-semibold text-[#1A1200]">{lookup.student.father_full_name || "—"}</div>
                      <div className="text-sm text-slate-600 break-words">{lookup.student.father_phone || lookup.student.father_email || "—"}</div>
                    </div>
                    <div>
                      <div className="text-[0.65rem] font-bold uppercase text-slate-500">Mother</div>
                      <div className="font-semibold text-[#1A1200]">{lookup.student.mother_full_name || "—"}</div>
                      <div className="text-sm text-slate-600 break-words">{lookup.student.mother_phone || lookup.student.mother_email || "—"}</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200/80 bg-white overflow-hidden">
                <div className="px-4 py-3 border-b border-[#FDEAA0]/60 bg-[#FFFBE8]/90 font-semibold text-[#1A1200]">
                  Payment status (previous school)
                </div>
                <div className="p-4">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <CreditCard size={16} className="text-[#B88A00]" />
                      <div className="text-sm font-semibold text-[#1A1200]">
                        {lookup.payment.payment_status_label}
                      </div>
                    </div>
                    <span
                      className={`inline-flex items-center px-3 py-1 rounded-lg border ${paymentBadge(lookup.payment.payment_status_code)} text-[11px] font-semibold`}
                    >
                      {lookup.payment.payment_status_code}
                    </span>
                  </div>

                  <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <div className="rounded-2xl border border-[#FDEAA0]/60 bg-[#FFFBE8]/60 p-3">
                      <div className="text-[0.65rem] font-bold uppercase text-slate-500">Total due</div>
                      <div className="mt-1 font-semibold text-[#1A1200]">{Number(lookup.payment.total_due || 0).toLocaleString()}</div>
                    </div>
                    <div className="rounded-2xl border border-[#FDEAA0]/60 bg-[#FFFBE8]/60 p-3">
                      <div className="text-[0.65rem] font-bold uppercase text-slate-500">Paid</div>
                      <div className="mt-1 font-semibold text-[#1A1200]">{Number(lookup.payment.amount_paid_total || 0).toLocaleString()}</div>
                    </div>
                    <div className="rounded-2xl border border-[#FDEAA0]/60 bg-[#FFFBE8]/60 p-3">
                      <div className="text-[0.65rem] font-bold uppercase text-slate-500">Remaining</div>
                      <div className="mt-1 font-semibold text-[#1A1200]">{Number(lookup.payment.remaining_balance || 0).toLocaleString()}</div>
                    </div>
                  </div>

                  <div className="mt-3 text-xs text-slate-500">
                    Period: {lookup.selected_period.academic_year || "—"} · {lookup.selected_period.term || "—"}
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="rounded-3xl border border-slate-200/80 bg-white overflow-hidden">
                <div className="px-4 py-3 border-b border-[#FDEAA0]/60 bg-[#FFFBE8]/90 font-semibold text-[#1A1200]">
                  DOS academic records
                </div>
                <div className="p-4">
                  {lookup.dos_records?.length ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm min-w-[380px]">
                        <thead className="bg-[#FFFBE8] text-[0.65rem] uppercase font-bold text-[#7A5C00]">
                          <tr>
                            <th className="px-3 py-2 text-left">Year</th>
                            <th className="px-3 py-2 text-left">Term</th>
                            <th className="px-3 py-2 text-left">Status</th>
                            <th className="px-3 py-2 text-right">Marks obtained</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {lookup.dos_records.map((r, idx) => (
                            <tr key={`${r.academic_year}-${r.term}-${idx}`}>
                              <td className="px-3 py-2 font-semibold">{r.academic_year}</td>
                              <td className="px-3 py-2 text-slate-700">{r.term}</td>
                              <td className="px-3 py-2 font-semibold text-[#7A5C00]">{r.status_label || r.status_code}</td>
                              <td className="px-3 py-2 text-right font-semibold text-[#1A1200]">{Number(r.marks_obtained || 0).toLocaleString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-sm text-slate-500">No DOS records found.</div>
                  )}
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200/80 bg-white overflow-hidden">
                <div className="px-4 py-3 border-b border-[#FDEAA0]/60 bg-[#FFFBE8]/90 font-semibold text-[#1A1200]">
                  Discipline snapshot
                </div>
                <div className="p-4">
                  {lookup.discipline ? (
                    <>
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="text-sm text-slate-700">
                          Deducted: <span className="font-semibold text-[#B88A00]">{Number(lookup.discipline.discipline_deducted_total || 0).toLocaleString()}</span>
                          {" · "}
                          Remaining:{" "}
                          <span className="font-semibold text-[#1A1200]">{Number(lookup.discipline.discipline_remaining_total || 0).toLocaleString()}</span>
                        </div>
                        <div className="text-xs text-slate-500">
                          {lookup.discipline.academic_year || lookup.selected_period.academic_year || "—"} · {lookup.discipline.term || lookup.selected_period.term || "—"}
                        </div>
                      </div>
                      <div className="mt-3">
                        {lookup.discipline.cases?.length ? (
                          <div className="space-y-2">
                            {lookup.discipline.cases.slice(0, 4).map((c) => (
                              <div key={c.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
                                <div className="flex items-start justify-between gap-2">
                                  <div>
                                    <div className="font-semibold text-[#1A1200] text-sm">{c.lesson_subject}</div>
                                    <div className="text-xs text-slate-600">{c.description ? c.description : "—"}</div>
                                  </div>
                                  <div className="text-right">
                                    <div className="text-[0.65rem] font-bold uppercase text-slate-500">Deducted</div>
                                    <div className="font-semibold text-[#B88A00]">{Number(c.marks_deducted || 0).toLocaleString()}</div>
                                  </div>
                                </div>
                                <div className="mt-2 text-xs text-slate-500 flex items-center gap-2">
                                  <Clock size={14} className="text-slate-400" />
                                  {fmtDT(c.created_at)}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-sm text-slate-500">No discipline cases for this period.</div>
                        )}
                      </div>
                    </>
                  ) : (
                    <div className="text-sm text-slate-500">No discipline data.</div>
                  )}
                </div>
              </div>
            </div>

            {/* Request form */}
            <div className="mt-4 rounded-3xl border border-[#FDEAA0]/70 bg-[#FFFBE8]/50 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="text-xs font-bold uppercase tracking-widest text-[#7A5C00]">Transfer decision</div>
                  <div className="mt-1 font-semibold text-[#1A1200] text-lg">Request Transfer to your school</div>
                  <div className="text-sm text-slate-600 mt-0.5">Send a request to the old school manager for review.</div>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[0.65rem] font-bold uppercase text-slate-500 mb-1">Reason for transfer</label>
                  <input
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="e.g. moving to new area / family reasons"
                    className="w-full rounded-xl border border-[#FDEAA0] bg-white px-3 py-2.5 text-sm font-semibold text-[#1A1200] shadow-sm focus:outline-none focus:ring-2 focus:ring-[#FEBF10]/30"
                    disabled={!canRequest || requesting}
                  />
                </div>
                <div>
                  <label className="block text-[0.65rem] font-bold uppercase text-slate-500 mb-1">Notes (optional)</label>
                  <input
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Anything you want to add"
                    className="w-full rounded-xl border border-[#FDEAA0] bg-white px-3 py-2.5 text-sm font-semibold text-[#1A1200] shadow-sm focus:outline-none focus:ring-2 focus:ring-[#FEBF10]/30"
                    disabled={!canRequest || requesting}
                  />
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={doRequestTransfer}
                  disabled={!canRequest || requesting}
                  className="h-[44px] px-5 rounded-xl bg-gradient-to-r from-[#1A1200] to-[#3D2C00] text-sm font-semibold text-[#FEBF10] shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {requesting ? <Loader2 size={16} className="animate-spin" /> : <ArrowRightLeft size={16} />}
                  Request Transfer
                </button>
                {!canRequest && (
                  <div className="text-sm text-slate-600">
                    {pendingExists
                      ? "A pending transfer already exists for this student."
                      : studentMatchesYourSchool
                        ? "This student is already in your school."
                        : "You cannot request this transfer right now."}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Requests list */}
      <div className="rounded-3xl border border-[#FDEAA0]/80 bg-white shadow-sm shadow-[#FDEAA0]/20 p-4 sm:p-6">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <h2 className="font-semibold text-[#1A1200] text-lg">Transfer Requests</h2>
            <p className="text-sm text-slate-600">Approve incoming requests or track your outgoing ones.</p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-2xl border border-[#FDEAA0]/70 bg-[#FFFBE8]/70 px-3 py-2 text-sm font-semibold text-[#7A5C00]">
            <ClipboardList size={16} />
            {transfers.length} total
          </div>
        </div>

        {transfersError && (
          <div className="mb-3 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            {transfersError}
          </div>
        )}

        {transfersLoading ? (
          <div className="py-14 text-center text-slate-500">
            <Loader2 className="inline animate-spin w-8 h-8 text-[#B88A00]" />
          </div>
        ) : transfers.length === 0 ? (
          <div className="py-14 text-center text-slate-500">
            No transfer requests yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[860px]">
              <thead className="bg-[#FFFBE8] text-[0.65rem] uppercase font-bold text-[#7A5C00]">
                <tr>
                  <th className="px-4 py-3 text-left">Student</th>
                  <th className="px-4 py-3 text-left">From → To</th>
                  <th className="px-4 py-3 text-left">Period / class</th>
                  <th className="px-4 py-3 text-left">Reason</th>
                  <th className="px-4 py-3 text-right">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {transfers.map((r) => (
                  <tr key={r.id} className="hover:bg-[#FFFBE8]/40">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-[#1A1200]">{r.student.full_name}</div>
                      <div className="text-xs text-slate-600 font-mono">{r.student.student_code || r.student.student_uid}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-[#7A5C00]">{r.from_school_name}</div>
                      <div className="text-xs text-slate-600">to {r.to_school_name}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm text-slate-700">{r.student.class_name || "—"}</div>
                      <div className="text-xs text-slate-500">{r.student.academic_year || "—"}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {r.reason ? <div className="max-w-[240px] truncate" title={r.reason}>{r.reason}</div> : "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className={`inline-flex items-center px-3 py-1 rounded-lg border ${statusBadge(r.status)} text-[11px] font-semibold`}>
                        {r.status}
                      </span>
                      <div className="text-xs text-slate-500 mt-1">
                        {fmtDT(r.created_at)}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2 flex-wrap">
                        <button
                          type="button"
                          onClick={() => {
                            setHistoryRequest(r);
                            setHistoryOpen(true);
                          }}
                          className="px-3 py-2 rounded-xl border border-[#FDEAA0] bg-[#FFFBE8] text-[#3D2C00] text-xs font-semibold hover:bg-[#FFF3CC]"
                        >
                          View history
                        </button>

                        {r.direction === "incoming" && r.status === "pending" && (
                          <>
                            <button
                              type="button"
                              onClick={() => decideRequest(r.id, "approve", "")}
                              className="px-3 py-2 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-800 text-xs font-semibold hover:bg-emerald-100"
                            >
                              Approve
                            </button>
                            <button
                              type="button"
                              onClick={() => decideRequest(r.id, "reject", "")}
                              className="px-3 py-2 rounded-xl border border-red-200 bg-red-50 text-red-800 text-xs font-semibold hover:bg-red-100"
                            >
                              Reject
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* History modal */}
      {historyOpen && historyRequest && (
        <Modal
          title={`Transfer history — ${historyRequest.student.full_name}`}
          onClose={() => {
            setHistoryOpen(false);
            setHistoryRequest(null);
          }}
          size="max-w-3xl"
        >
          <div className="grid grid-cols-1 gap-4">
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <div className="text-xs font-bold uppercase tracking-widest text-slate-500">Request info</div>
              <div className="mt-2 text-sm text-slate-700">
                <div><span className="font-semibold text-[#1A1200]">From:</span> {historyRequest.from_school_name}</div>
                <div><span className="font-semibold text-[#1A1200]">To:</span> {historyRequest.to_school_name}</div>
                <div className="mt-1"><span className="font-semibold text-[#1A1200]">Reason:</span> {historyRequest.reason || "—"}</div>
                <div className="mt-1"><span className="font-semibold text-[#1A1200]">Notes (new school):</span> {historyRequest.notes_from_to_school || "—"}</div>
                <div className="mt-1"><span className="font-semibold text-[#1A1200]">Notes (old school):</span> {historyRequest.notes_from_from_school || "—"}</div>
                <div className="mt-1"><span className="font-semibold text-[#1A1200]">Status:</span> {historyRequest.status}</div>
                <div className="mt-1 text-xs text-slate-500"><span className="font-semibold">Created:</span> {fmtDT(historyRequest.created_at)}</div>
                {historyRequest.approved_at || historyRequest.rejected_at ? (
                  <div className="mt-1 text-xs text-slate-500">
                    <span className="font-semibold">{historyRequest.approved_at ? "Approved at:" : "Rejected at:"}</span>{" "}
                    {fmtDT(historyRequest.approved_at || historyRequest.rejected_at)}
                  </div>
                ) : null}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-100 bg-white p-4">
              <div className="text-xs font-bold uppercase tracking-widest text-slate-500">History log</div>
              <div className="mt-3 space-y-2">
                {(historyRequest.logs || []).length ? (
                  historyRequest.logs.map((l, idx) => (
                    <div key={`${l.action}-${idx}`} className="flex items-start justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50 p-3">
                      <div>
                        <div className="font-semibold text-[#1A1200] text-sm">{l.action}</div>
                        <div className="text-sm text-slate-700">{l.note || "—"}</div>
                      </div>
                      <div className="text-xs text-slate-500 whitespace-nowrap">{fmtDT(l.created_at)}</div>
                    </div>
                  ))
                ) : (
                  <div className="text-sm text-slate-500">No history events available.</div>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-100 bg-white p-4">
              <div className="text-xs font-bold uppercase tracking-widest text-slate-500">Notifications</div>
              <div className="mt-3 space-y-2">
                {historyRequest.notifications?.length ? (
                  historyRequest.notifications.map((n, idx) => (
                    <div key={`${n.notification_type}-${idx}`} className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="font-semibold text-[#1A1200] text-sm">{n.notification_type}</div>
                          <div className="text-sm text-slate-700">{n.message}</div>
                        </div>
                        <div className="text-right text-xs text-slate-500 whitespace-nowrap">
                          {fmtDT(n.created_at)}
                          <div className={`mt-1 text-[10px] font-bold ${n.is_read ? "text-emerald-700" : "text-amber-700"}`}>
                            {n.is_read ? "Read" : "Unread"}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-sm text-slate-500">No notifications recorded.</div>
                )}
              </div>
            </div>

            {historyRequest.direction === "incoming" && historyRequest.status === "pending" && (
              <div className="rounded-2xl border border-slate-100 bg-white p-4">
                <div className="text-xs font-bold uppercase tracking-widest text-slate-500">Notes (for decision)</div>
                <div className="mt-2">
                  <textarea
                    className="w-full rounded-xl border border-[#FDEAA0] bg-[#FFFBE8] px-3 py-2.5 text-sm font-semibold text-[#1A1200] shadow-sm focus:outline-none focus:ring-2 focus:ring-[#FEBF10]/30 min-h-[90px]"
                    value={historyRequest._decision_notes || ""}
                    onChange={(e) => setHistoryRequest((p) => ({ ...p, _decision_notes: e.target.value, notes_from_from_school: e.target.value }))}
                    placeholder="Write a note for approve/reject (optional)."
                  />
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2 justify-end">
                  <button
                    type="button"
                    onClick={() => decideRequest(historyRequest.id, "approve", historyRequest.notes_from_from_school || "")}
                    className="px-4 py-2 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-800 text-xs font-semibold hover:bg-emerald-100"
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    onClick={() => decideRequest(historyRequest.id, "reject", historyRequest.notes_from_from_school || "")}
                    className="px-4 py-2 rounded-xl border border-red-200 bg-red-50 text-red-800 text-xs font-semibold hover:bg-red-100"
                  >
                    Reject
                  </button>
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}

