import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, CheckCircle2, Clock3, AlertCircle, Wallet, Filter, Landmark, GraduationCap, Download, Printer } from "lucide-react";
import { jsPDF } from "jspdf";

const API = import.meta.env.VITE_API_URL || "http://localhost:5100";

function statusBadge(status) {
  const s = String(status || "submitted").toLowerCase();
  if (s === "paid") return "bg-emerald-100 text-emerald-700 border-emerald-200";
  if (s === "failed") return "bg-red-100 text-red-700 border-red-200";
  if (s === "draft") return "bg-slate-100 text-slate-600 border-slate-200";
  return "bg-amber-100 text-amber-700 border-amber-200";
}

export default function PaymentsReport() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState({
    total: 0, paid: 0, submitted: 0, failed: 0, loans: 0, total_rwf: 0, paid_rwf: 0,
  });
  const [filters, setFilters] = useState({ schools: [], terms: [], academic_years: [] });

  const [schoolId, setSchoolId] = useState("");
  const [term, setTerm] = useState("");
  const [academicYear, setAcademicYear] = useState("");
  const [status, setStatus] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [loanDialog, setLoanDialog] = useState({ open: false, intentId: null, loading: false, data: null, error: "" });
  const [payAmount, setPayAmount] = useState("");
  const [payNote, setPayNote] = useState("");
  const [payBusy, setPayBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (schoolId) params.set("school_id", schoolId);
      if (term) params.set("term", term);
      if (academicYear) params.set("academic_year", academicYear);
      if (status !== "all") params.set("status", status);
      if (dateFrom) params.set("date_from", dateFrom);
      if (dateTo) params.set("date_to", dateTo);
      const res = await fetch(`${API}/api/parent-portal/payments-report?${params.toString()}`, {
        credentials: "include",
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) throw new Error(json.message || "Failed to Load Payment Report");
      setRows(Array.isArray(json.data) ? json.data : []);
      setSummary(json.summary || { total: 0, paid: 0, submitted: 0, failed: 0, loans: 0, total_rwf: 0, paid_rwf: 0 });
      setFilters(json.filters || { schools: [], terms: [], academic_years: [] });
    } catch (e) {
      setRows([]);
      setError(e.message || "Failed To Load Payment Report");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const schoolName = useMemo(() => {
    const found = (filters.schools || []).find((s) => String(s.id) === String(schoolId));
    return found?.school_name || "";
  }, [filters.schools, schoolId]);

  const exportCsv = async () => {
    try {
      const params = new URLSearchParams();
      if (schoolId) params.set("school_id", schoolId);
      if (term) params.set("term", term);
      if (academicYear) params.set("academic_year", academicYear);
      if (status !== "all") params.set("status", status);
      if (dateFrom) params.set("date_from", dateFrom);
      if (dateTo) params.set("date_to", dateTo);
      const res = await fetch(`${API}/api/parent-portal/payments-report/export.csv?${params.toString()}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed To Export CSV");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `parent-payments-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e.message || "Failed To Export CSV");
    }
  };

  const printPdf = () => {
    window.print();
  };

  const openLoanDetails = async (intentId) => {
    setLoanDialog({ open: true, intentId, loading: true, data: null, error: "" });
    try {
      const res = await fetch(`${API}/api/parent-portal/loan-intents/${intentId}/detail`, { credentials: "include" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) throw new Error(json.message || "Failed To Load Loan Detail");
      setLoanDialog({ open: true, intentId, loading: false, data: json.data, error: "" });
    } catch (e) {
      setLoanDialog({ open: true, intentId, loading: false, data: null, error: e.message || "Failed To Load Loan Detail" });
    }
  };

  const submitLoanPayment = async () => {
    if (!loanDialog.intentId) return;
    const amount = Number(payAmount || 0);
    if (!Number.isFinite(amount) || amount <= 0) {
      setLoanDialog((prev) => ({ ...prev, error: "Enter Valid Amount" }));
      return;
    }
    setPayBusy(true);
    setLoanDialog((prev) => ({ ...prev, error: "" }));
    try {
      const res = await fetch(`${API}/api/parent-portal/loan-intents/${loanDialog.intentId}/pay`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount_rwf: amount, note: payNote }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) throw new Error(json.message || "Failed To Record Loan Payment");
      setPayAmount("");
      setPayNote("");
      setLoanDialog((prev) => ({ ...prev, error: `Repayment Submitted. Receipt: ${json?.data?.receipt_no || "-"}. Waiting For Admin Approval.` }));
      await openLoanDetails(loanDialog.intentId);
      await load();
    } catch (e) {
      setLoanDialog((prev) => ({ ...prev, error: e.message || "Failed To Record Loan Payment" }));
    } finally {
      setPayBusy(false);
    }
  };

  const downloadRepaymentReceiptPdf = async (repaymentId) => {
    try {
      const res = await fetch(`${API}/api/parent-portal/loan-repayments/${repaymentId}/receipt`, { credentials: "include" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) throw new Error(json.message || "Failed To Load Receipt");
      const r = json.data || {};
      const pdf = new jsPDF({ unit: "mm", format: "a4" });
      let y = 18;
      const line = (label, value) => {
        pdf.setFont("helvetica", "bold");
        pdf.text(`${label}:`, 14, y);
        pdf.setFont("helvetica", "normal");
        pdf.text(String(value ?? "-"), 62, y);
        y += 8;
      };
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(16);
      pdf.text("Babyeyi Loan Repayment Receipt", 14, y);
      y += 10;
      pdf.setFontSize(11);
      line("Receipt Number", r.receipt_no || `RCP-${r.repayment_id}`);
      line("Repayment ID", r.repayment_id);
      line("Intent ID", r.intent_id);
      line("Student", r?.student?.student_name || "Student");
      line("School", r.school_name || "-");
      line("Class", r.class_name || "-");
      line("Term / Year", `${r.term || "-"} / ${r.academic_year || "-"}`);
      line("Amount", `${Number(r.amount_rwf || 0).toLocaleString()} RWF`);
      line("Status", String(r.status || "pending").toUpperCase());
      line("Paid At", r.created_at ? new Date(r.created_at).toLocaleString() : "-");
      line("Loan Duration", `${r?.loan?.months || 1} Months`);
      line("Extension", `${r?.loan?.extension_months || 0} Months`);
      line("Due Date", r?.loan?.due_date ? new Date(r.loan.due_date).toLocaleDateString() : "-");
      line("Monthly Installment", `${Number(r?.loan?.monthly_installment_rwf || 0).toLocaleString()} RWF`);
      if (r.note) line("Note", r.note);
      pdf.save(`${r.receipt_no || `repayment-${r.repayment_id}`}.pdf`);
    } catch (e) {
      setLoanDialog((prev) => ({ ...prev, error: e.message || "Failed To Download Receipt PDF" }));
    }
  };

  return (
    <div className="space-y-5 pb-6">
      <div className="flex items-center gap-3">
        <Link
          to="/parents/home"
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm hover:bg-slate-50"
          aria-label="Back To Home"
        >
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">Payments & Loans Report</h1>
          <p className="text-sm text-slate-500">Track Payments By Student, School, Term, And Academic Year</p>
        </div>
      </div>

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-[11px] font-bold text-slate-500 uppercase">Total Records</p>
          <p className="text-xl font-black text-slate-900 mt-1">{summary.total}</p>
        </div>
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
          <p className="text-[11px] font-bold text-emerald-700 uppercase">Paid</p>
          <p className="text-xl font-black text-emerald-700 mt-1">{summary.paid}</p>
        </div>
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-[11px] font-bold text-amber-700 uppercase">Submitted</p>
          <p className="text-xl font-black text-amber-700 mt-1">{summary.submitted}</p>
        </div>
        <div className="rounded-2xl border border-indigo-200 bg-indigo-50 p-4">
          <p className="text-[11px] font-bold text-indigo-700 uppercase">Loans</p>
          <p className="text-xl font-black text-indigo-700 mt-1">{summary.loans}</p>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 print:hidden">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="w-4 h-4 text-orange-600" />
          <p className="text-sm font-black text-slate-900">Filters</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2">
          <select value={schoolId} onChange={(e) => setSchoolId(e.target.value)} className="rounded-xl border border-slate-200 px-3 py-2 text-sm">
            <option value="">All Schools</option>
            {(filters.schools || []).map((s) => <option key={s.id} value={s.id}>{s.school_name}</option>)}
          </select>
          <select value={term} onChange={(e) => setTerm(e.target.value)} className="rounded-xl border border-slate-200 px-3 py-2 text-sm">
            <option value="">All Terms</option>
            {(filters.terms || []).map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <select value={academicYear} onChange={(e) => setAcademicYear(e.target.value)} className="rounded-xl border border-slate-200 px-3 py-2 text-sm">
            <option value="">All Academic Years</option>
            {(filters.academic_years || []).map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-xl border border-slate-200 px-3 py-2 text-sm">
            <option value="all">All Statuses</option>
            <option value="submitted">Submitted</option>
            <option value="paid">Paid</option>
            <option value="failed">Failed</option>
          </select>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
            aria-label="From Date"
          />
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
            aria-label="To Date"
          />
        </div>
        <div className="mt-3 flex gap-2 flex-wrap">
          <button type="button" onClick={load} className="rounded-xl bg-orange-500 text-white px-4 py-2 text-sm font-bold">
            Apply Filters
          </button>
          <button
            type="button"
            onClick={() => {
              setSchoolId("");
              setTerm("");
              setAcademicYear("");
              setStatus("all");
              setDateFrom("");
              setDateTo("");
              setTimeout(load, 0);
            }}
            className="rounded-xl border border-slate-200 bg-white text-slate-700 px-4 py-2 text-sm font-bold"
          >
            Clear
          </button>
          <button
            type="button"
            onClick={exportCsv}
            className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white text-slate-700 px-4 py-2 text-sm font-bold"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
          <button
            type="button"
            onClick={printPdf}
            className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white text-slate-700 px-4 py-2 text-sm font-bold"
          >
            <Printer className="w-4 h-4" />
            Print PDF
          </button>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="hidden print:block mb-4">
          <h2 className="text-lg font-black text-slate-900">Parent Payments & Loans Report</h2>
          <p className="text-xs text-slate-600">
            Generated On {new Date().toLocaleString()} | School: {schoolName || "All Schools"} | Term: {term || "All"} | Academic Year: {academicYear || "All"} | Status: {status === "all" ? "All" : status}
          </p>
          <p className="text-xs text-slate-600">
            Date Range: {dateFrom || "Any"} To {dateTo || "Any"}
          </p>
        </div>
        {loading ? (
          <p className="text-sm text-slate-500 py-10 text-center">Loading Payment Report...</p>
        ) : error ? (
          <p className="text-sm text-red-600 py-8 text-center">{error}</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-slate-500 py-8 text-center">No Payments Found For Selected Filters.</p>
        ) : (
          <ul className="space-y-2.5">
            {rows.map((r) => (
              <li key={r.id} className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-bold text-slate-900 truncate">{r.student_name || "Student"} {r.student_id ? `· ${r.student_id}` : ""}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5 inline-flex items-center gap-1">
                      <Landmark className="w-3.5 h-3.5" /> {r.school_name || schoolName || "School"} · {r.term || "-"} · {r.academic_year || "-"}
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5 inline-flex items-center gap-1">
                      <GraduationCap className="w-3.5 h-3.5" /> {r.class_name || "Class"}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-black text-emerald-700">{Number(r.total_rwf || 0).toLocaleString()} RWF</p>
                    <p className="text-[10px] text-slate-500">{r.created_at ? new Date(r.created_at).toLocaleDateString() : "-"}</p>
                  </div>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold border ${statusBadge(r.status)}`}>
                    {String(r.status || "submitted").toUpperCase()}
                  </span>
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border ${r.pay_mode === "loan" ? "bg-indigo-100 text-indigo-700 border-indigo-200" : "bg-slate-100 text-slate-700 border-slate-200"}`}>
                    {r.pay_mode === "loan" ? <Clock3 className="w-3 h-3" /> : <Wallet className="w-3 h-3" />}
                    {r.pay_mode === "loan" ? "LOAN" : "FULL PAYMENT"}
                  </span>
                  {r.status === "paid" ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : null}
                  {r.status === "failed" ? <AlertCircle className="w-4 h-4 text-red-600" /> : null}
                </div>
                {r.pay_mode === "loan" ? (
                  <div className="mt-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <p className="text-[11px] text-indigo-700 font-bold">
                      Loan Paid: {Number(r.loan_paid_rwf || 0).toLocaleString()} RWF · Remaining: {Number(r.loan_remaining_rwf || 0).toLocaleString()} RWF
                    </p>
                    <button
                      type="button"
                      onClick={() => openLoanDetails(r.id)}
                      className="rounded-lg border border-indigo-200 bg-indigo-50 text-indigo-700 px-3 py-1.5 text-xs font-bold self-start sm:self-auto"
                    >
                      See Loan Details
                    </button>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>
      {loanDialog.open ? (
        <div className="fixed inset-0 z-50 bg-slate-900/45 backdrop-blur-[1px] flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="w-full sm:max-w-xl rounded-t-2xl sm:rounded-2xl bg-white border border-slate-200 shadow-2xl p-4 sm:p-5 max-h-[90dvh] overflow-auto">
            <div className="flex items-center justify-between gap-2 mb-3">
              <p className="text-base font-black text-slate-900">Loan Details</p>
              <button type="button" onClick={() => setLoanDialog({ open: false, intentId: null, loading: false, data: null, error: "" })} className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-bold text-slate-600">Close</button>
            </div>
            {loanDialog.loading ? (
              <p className="text-sm text-slate-500 py-8 text-center">Loading Loan Detail...</p>
            ) : loanDialog.error ? (
              <p className="text-sm text-red-600 py-6 text-center">{loanDialog.error}</p>
            ) : (
              <>
                <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-3 space-y-1">
                  <p className="text-xs text-slate-600">Student: <span className="font-bold text-slate-900">{loanDialog.data?.student?.student_name || "Student"}</span></p>
                  <p className="text-xs text-slate-600">{loanDialog.data?.school_name || "School"} · {loanDialog.data?.term || "-"} · {loanDialog.data?.academic_year || "-"}</p>
                  <p className="text-xs text-slate-600">Total Due: <span className="font-bold text-slate-900">{Number(loanDialog.data?.loan?.total_due_rwf || 0).toLocaleString()} RWF</span></p>
                  <p className="text-xs text-emerald-700">Paid: <span className="font-bold">{Number(loanDialog.data?.loan?.paid_rwf || 0).toLocaleString()} RWF</span></p>
                  <p className="text-xs text-amber-700">Pending Approval: <span className="font-bold">{Number(loanDialog.data?.loan?.pending_rwf || 0).toLocaleString()} RWF</span></p>
                  <p className="text-xs text-red-600">Remaining: <span className="font-bold">{Number(loanDialog.data?.loan?.remaining_rwf || 0).toLocaleString()} RWF</span></p>
                  <p className="text-xs text-slate-600">Plan: <span className="font-bold">{Number(loanDialog.data?.loan?.months || 1)} Month(s)</span> · Extension: <span className="font-bold">{Number(loanDialog.data?.loan?.extension_months || 0)} Month(s)</span></p>
                  <p className="text-xs text-slate-600">Due Date: <span className="font-bold">{loanDialog.data?.loan?.due_date ? new Date(loanDialog.data.loan.due_date).toLocaleDateString() : "-"}</span> · Overdue: <span className="font-bold">{Number(loanDialog.data?.loan?.overdue_months || 0)} Month(s)</span></p>
                  <p className="text-xs text-slate-600">Overdue Extra: <span className="font-bold">{Number(loanDialog.data?.loan?.overdue_extra_rwf || 0).toLocaleString()} RWF</span> · Monthly: <span className="font-bold">{Number(loanDialog.data?.loan?.monthly_installment_rwf || 0).toLocaleString()} RWF</span></p>
                </div>

                <div className="mt-3 rounded-xl border border-slate-200 p-3">
                  <p className="text-xs font-bold text-slate-700 mb-2">Pay Loan</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <input type="number" min="1" step="1" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} placeholder="Amount (RWF)" className="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
                    <input type="text" value={payNote} onChange={(e) => setPayNote(e.target.value)} placeholder="Note (Optional)" className="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
                  </div>
                  <button type="button" onClick={submitLoanPayment} disabled={payBusy || Number(loanDialog.data?.loan?.remaining_rwf || 0) <= 0} className="mt-2 rounded-lg bg-orange-500 text-white px-4 py-2 text-sm font-bold disabled:opacity-50">
                    {payBusy ? "Processing..." : "Pay Loan"}
                  </button>
                  {Number(loanDialog.data?.loan?.remaining_rwf || 0) <= 0 ? <p className="text-xs text-emerald-700 mt-1">Loan Is Fully Paid.</p> : null}
                </div>

                <div className="mt-3 rounded-xl border border-slate-200 p-3">
                  <p className="text-xs font-bold text-slate-700 mb-2">Repayment History</p>
                  {(loanDialog.data?.repayments || []).length ? (
                    <ul className="space-y-1.5">
                      {(loanDialog.data.repayments || []).map((x) => (
                        <li key={x.id} className="text-xs border border-slate-100 rounded-lg px-2.5 py-2">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-slate-600">{new Date(x.created_at).toLocaleString()}</span>
                            <span className="font-bold text-emerald-700">{Number(x.amount_rwf || 0).toLocaleString()} RWF</span>
                          </div>
                          <div className="mt-1 flex items-center justify-between gap-2">
                            <span className={`inline-flex rounded-md px-2 py-0.5 border text-[10px] font-bold ${
                              String(x.status || "").toLowerCase() === "approved"
                                ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                                : String(x.status || "").toLowerCase() === "rejected"
                                  ? "bg-red-100 text-red-700 border-red-200"
                                  : "bg-amber-100 text-amber-700 border-amber-200"
                            }`}>
                              {String(x.status || "pending").toUpperCase()}
                            </span>
                            <button
                              type="button"
                              onClick={() => downloadRepaymentReceiptPdf(x.id)}
                              className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-[10px] font-bold text-slate-700"
                            >
                              <Download className="w-3 h-3" />
                              Receipt PDF
                            </button>
                          </div>
                          <p className="mt-1 text-[10px] text-slate-500">Receipt: {x.receipt_no || "-"}</p>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs text-slate-500">No Repayment Yet.</p>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

