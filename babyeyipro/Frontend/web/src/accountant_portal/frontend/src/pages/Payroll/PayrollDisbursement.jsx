import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CheckCircle, X, Download, Plus, Eye, Search, Loader2, AlertCircle, Lock, RefreshCw, Pencil, Trash2,
} from "lucide-react";
import api from "../../services/api";
import {
  parseManagerAcademicSettings,
  yearOptionLabel,
} from "../../utils/academicCalendarFilters";
import {
  getApprovedPayrollRuns,
  getPaidPayrollRuns,
  getPayrollRun,
  getDisbursementDeductionRules,
  createDisbursementDeductionRule,
  updateDisbursementDeductionRule,
  deleteDisbursementDeductionRule,
  applyScheduledDeductions,
  markPayrollRunPaidWithDetails,
  getPayrollRunAuditTrail,
  mapLineToPaymentRow,
  groupPaymentsByBank,
  downloadDisbursementExcel,
  downloadBankPaymentFile,
  downloadBankPaymentExcel,
  deletePayrollRun,
  isPayrollRunApproved,
  isPayrollRunPaid,
  isPayrollRunLocked,
  disbursementStatusLabel,
} from "../../services/payrollDisbursementService";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function toPayrollYear(y) {
  const txt = String(y || "").trim();
  const m = txt.match(/\b(20\d{2}|19\d{2})\b/);
  if (m) return Number(m[1]);
  const n = Number(txt);
  return Number.isFinite(n) ? n : new Date().getFullYear();
}

function monthToNumber(label) {
  const i = MONTHS.findIndex((m) => m.toLowerCase() === String(label || "").toLowerCase());
  return i >= 0 ? i + 1 : new Date().getMonth() + 1;
}

function fmtDate(d) {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return String(d);
  }
}

function fmtTime(d) {
  if (!d) return "";
  try {
    return new Date(d).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

function fmtMoney(n) {
  return Number(n || 0).toLocaleString();
}

function SelectBox({ label, value, onChange, options, disabled }) {
  return (
    <div>
      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="w-full appearance-none border border-slate-200 bg-white rounded-xl px-4 py-2.5 text-sm font-semibold text-[#000435] focus:outline-none focus:ring-2 focus:ring-amber-400 pr-9 disabled:opacity-60"
      >
        {options.map((o) => {
          const val = typeof o === "string" ? o : o.value;
          const lbl = typeof o === "string" ? o : o.label;
          return <option key={val} value={val}>{lbl}</option>;
        })}
      </select>
    </div>
  );
}

export default function PayrollDisbursement() {
  const [academicYear, setAcademicYear] = useState("");
  const [month, setMonth] = useState(MONTHS[new Date().getMonth()]);
  const [payrollNum, setPayrollNum] = useState("");
  const [statusFilter, setStatusFilter] = useState("Approved");
  const [availableYears, setAvailableYears] = useState([]);
  const [academicRegistry, setAcademicRegistry] = useState([]);
  const [academicLoaded, setAcademicLoaded] = useState(false);

  const [runs, setRuns] = useState([]);
  const [selectedRunId, setSelectedRunId] = useState(null);
  const [runDetail, setRunDetail] = useState(null);
  const [historyRuns, setHistoryRuns] = useState([]);
  const [auditTrail, setAuditTrail] = useState([]);

  const [loading, setLoading] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [actionBusy, setActionBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("all");
  const [bankFilter, setBankFilter] = useState("all");
  const [tab, setTab] = useState("disbursement");

  const [showDeductionModal, setShowDeductionModal] = useState(false);
  const [editingRuleId, setEditingRuleId] = useState(null);
  const [deductionRules, setDeductionRules] = useState([]);
  const [loadingRules, setLoadingRules] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [verified, setVerified] = useState({ approval: false, review: false, accounts: false, ready: false });

  const emptyDeductionForm = () => ({
    deductionType: "Welfare",
    applyTo: "all",
    amountType: "fixed",
    amount: "",
    reason: "",
    monthScope: "single",
    effectiveMonth: month,
    frequency: "always",
  });

  const [deductionForm, setDeductionForm] = useState(emptyDeductionForm);
  const [paymentForm, setPaymentForm] = useState({
    paymentDate: new Date().toISOString().slice(0, 10),
    paymentReference: "",
    transactionNumber: "",
    paymentMethod: "Bank Transfer",
  });

  const payrollYear = useMemo(() => toPayrollYear(academicYear), [academicYear]);
  const isLocked = isPayrollRunLocked(runDetail?.status);

  const yearOptions = useMemo(() => {
    if (!availableYears.length) return [{ value: String(new Date().getFullYear()), label: String(new Date().getFullYear()) }];
    return availableYears.map((y) => {
      const row = academicRegistry.find((r) => String(r.academic_year) === String(y));
      return { value: y, label: yearOptionLabel(row) || y };
    });
  }, [availableYears, academicRegistry]);

  useEffect(() => {
    api.get("/dos/academic-calendar-settings")
      .then((res) => {
        if (!res.data?.success) return;
        const parsed = parseManagerAcademicSettings(res.data.data || {});
        const year = parsed.currentYear || String(new Date().getFullYear());
        setAcademicRegistry(parsed.registry || []);
        setAvailableYears(parsed.years?.length ? parsed.years : [year]);
        setAcademicYear(year);
        setAcademicLoaded(true);
      })
      .catch(() => {
        const y = String(new Date().getFullYear());
        setAvailableYears([y]);
        setAcademicYear(y);
        setAcademicLoaded(true);
      });
  }, []);

  const loadRuns = useCallback(async () => {
    if (!academicYear) return;
    setLoading(true);
    setError("");
    try {
      const fetcher = statusFilter === "Paid" ? getPaidPayrollRuns : getApprovedPayrollRuns;
      const data = await fetcher({ month, year: payrollYear, academicYear, limit: 100 });
      setRuns(data);
      const first = data[0];
      setSelectedRunId((prev) => {
        if (prev && data.some((r) => r.db_id === prev)) return prev;
        return first?.db_id ?? null;
      });
      setPayrollNum((prev) => {
        if (prev && data.some((r) => r.runNumber === prev)) return prev;
        return first?.runNumber || "";
      });
    } catch (e) {
      setRuns([]);
      setSelectedRunId(null);
      setError(e?.response?.data?.message || "Failed to load payroll runs");
    } finally {
      setLoading(false);
    }
  }, [academicYear, month, payrollYear, statusFilter]);

  const loadHistory = useCallback(async () => {
    if (!academicYear) return;
    try {
      const data = await getPaidPayrollRuns({ academicYear, limit: 100 });
      setHistoryRuns(data);
    } catch {
      setHistoryRuns([]);
    }
  }, [academicYear]);

  useEffect(() => {
    if (academicLoaded) loadRuns();
  }, [academicLoaded, loadRuns]);

  useEffect(() => {
    if (tab === "history" && academicLoaded) loadHistory();
  }, [tab, academicLoaded, loadHistory]);

  const loadDeductionRules = useCallback(async () => {
    if (!academicYear) return;
    setLoadingRules(true);
    try {
      const data = await getDisbursementDeductionRules({ academicYear });
      setDeductionRules(data);
    } catch {
      setDeductionRules([]);
    } finally {
      setLoadingRules(false);
    }
  }, [academicYear]);

  useEffect(() => {
    if (academicLoaded) loadDeductionRules();
  }, [academicLoaded, loadDeductionRules]);

  const loadRunDetail = useCallback(async (id, options = {}) => {
    if (id == null) {
      setRunDetail(null);
      setAuditTrail([]);
      return;
    }
    setLoadingDetail(true);
    try {
      let detail = await getPayrollRun(id);
      const skipScheduled = options.skipScheduledApply === true;
      if (
        !skipScheduled
        && detail
        && isPayrollRunApproved(detail.status)
        && !isPayrollRunPaid(detail.status)
      ) {
        try {
          await applyScheduledDeductions(id);
          detail = await getPayrollRun(id);
        } catch {
          /* scheduled apply is best-effort */
        }
      }
      const audit = await getPayrollRunAuditTrail(id);
      setRunDetail(detail);
      setAuditTrail(audit);
      if (detail?.runNumber) setPayrollNum(detail.runNumber);
      const approved = isPayrollRunApproved(detail?.status);
      setVerified({
        approval: approved || isPayrollRunPaid(detail?.status),
        review: approved || isPayrollRunPaid(detail?.status),
        accounts: false,
        ready: false,
      });
    } catch (e) {
      setRunDetail(null);
      setAuditTrail([]);
      setError(e?.response?.data?.message || "Failed to load payroll details");
    } finally {
      setLoadingDetail(false);
    }
  }, []);

  useEffect(() => {
    if (selectedRunId != null) loadRunDetail(selectedRunId);
    else setRunDetail(null);
  }, [selectedRunId, loadRunDetail]);

  const paymentRows = useMemo(() => {
    const lines = Array.isArray(runDetail?.lines) ? runDetail.lines : [];
    return lines.map(mapLineToPaymentRow);
  }, [runDetail]);

  const departments = useMemo(() => {
    const set = new Set(paymentRows.map((p) => p.dept).filter(Boolean));
    return ["all", ...[...set].sort()];
  }, [paymentRows]);

  const banks = useMemo(() => {
    const set = new Set(paymentRows.map((p) => p.bank).filter(Boolean));
    return ["all", ...[...set].sort()];
  }, [paymentRows]);

  const filteredPayments = useMemo(() => {
    const q = search.trim().toLowerCase();
    return paymentRows.filter((p) => {
      const matchSearch = !q || p.name.toLowerCase().includes(q) || String(p.id).toLowerCase().includes(q);
      const matchDept = deptFilter === "all" || p.dept === deptFilter;
      const matchBank = bankFilter === "all" || p.bank === bankFilter;
      return matchSearch && matchDept && matchBank;
    });
  }, [paymentRows, search, deptFilter, bankFilter]);

  const bankSummary = useMemo(() => groupPaymentsByBank(paymentRows), [paymentRows]);

  const summary = useMemo(() => {
    const gross = Number(runDetail?.grossTotal || 0);
    const net = Number(runDetail?.netTotal || 0);
    const disbursement = paymentRows.reduce((s, p) => s + p.finalPayable, 0) || Number(runDetail?.disbursementTotal || net);
    const extraTotal = paymentRows.reduce((s, p) => s + p.extraDeduction, 0);
    return {
      employees: paymentRows.length || Number(runDetail?.staffCount || 0),
      gross,
      deductions: Math.max(0, gross - net) + extraTotal,
      net,
      bankPayable: disbursement,
    };
  }, [runDetail, paymentRows]);

  const payrollNumOptions = useMemo(() => {
    if (!runs.length) return [{ value: "", label: "No payroll found" }];
    return runs.map((r) => ({ value: r.runNumber, label: `${r.runNumber} (${disbursementStatusLabel(r.status)})` }));
  }, [runs]);

  const handleLoadPayroll = () => {
    const match = runs.find((r) => r.runNumber === payrollNum);
    if (match) {
      setSelectedRunId(match.db_id);
      setNotice("");
      setError("");
    } else if (selectedRunId != null) {
      loadRunDetail(selectedRunId);
    } else {
      setError(statusFilter === "Approved"
        ? "No approved payroll found for this period. Run payroll first and ensure it is approved."
        : "No payroll found for the selected filters.");
    }
  };

  const handlePayrollNumChange = (val) => {
    setPayrollNum(val);
    const match = runs.find((r) => r.runNumber === val);
    if (match) setSelectedRunId(match.db_id);
  };

  const deductionPreview = useMemo(() => {
    const amount = Number(deductionForm.amount || 0);
    if (!amount) return { count: 0, perEmployee: 0, total: 0 };
    const targets = deductionForm.applyTo === "selected"
      ? paymentRows.filter((p) => p.staffUserId)
      : paymentRows;
    const count = targets.length;
    const perEmployee = deductionForm.amountType === "percentage"
      ? Math.round(targets.reduce((s, p) => s + (p.netSalary * amount) / 100, 0) / Math.max(count, 1))
      : amount;
    const total = deductionForm.amountType === "percentage"
      ? targets.reduce((s, p) => s + Math.round((p.netSalary * amount) / 100), 0)
      : amount * count;
    return { count, perEmployee, total };
  }, [deductionForm, paymentRows]);

  const openAddDeductionModal = () => {
    setEditingRuleId(null);
    setDeductionForm({ ...emptyDeductionForm(), effectiveMonth: month });
    setShowDeductionModal(true);
  };

  const openEditDeductionRule = (rule) => {
    setEditingRuleId(rule.id);
    setDeductionForm({
      deductionType: rule.deductionType,
      applyTo: rule.applyTo,
      amountType: rule.amountType,
      amount: String(rule.amount),
      reason: rule.reason,
      monthScope: rule.monthScope,
      effectiveMonth: rule.effectiveMonth ? MONTHS[rule.effectiveMonth - 1] : month,
      frequency: rule.frequency,
    });
    setShowDeductionModal(true);
  };

  const handleSaveDeduction = async () => {
    const amount = Number(deductionForm.amount || 0);
    if (!amount) {
      setError("Enter a valid deduction amount.");
      return;
    }
    if (deductionForm.monthScope === "single" && !deductionForm.effectiveMonth) {
      setError("Select an effective month or choose all months.");
      return;
    }
    setActionBusy(true);
    setError("");
    try {
      const payload = {
        deductionType: deductionForm.deductionType,
        applyTo: deductionForm.applyTo,
        amountType: deductionForm.amountType,
        amount,
        reason: deductionForm.reason,
        monthScope: deductionForm.monthScope,
        effectiveMonth: deductionForm.effectiveMonth,
        frequency: deductionForm.frequency,
        academicYear,
      };

      if (editingRuleId) {
        const upd = await updateDisbursementDeductionRule(editingRuleId, payload);
        if (upd?.success === false) throw new Error(upd.message || "Update failed");
        setNotice("Deduction rule updated. Changes apply to future matching payrolls.");
      } else if (selectedRunId && !isLocked) {
        await createDisbursementDeductionRule({
          ...payload,
          applyToRunId: selectedRunId,
        });
        setNotice(
          deductionForm.frequency === "always"
            ? `Deduction saved and applied. It will repeat every ${deductionForm.monthScope === "all" ? "month" : deductionForm.effectiveMonth} automatically.`
            : `Deduction applied once for ${deductionForm.monthScope === "all" ? "the next payroll" : deductionForm.effectiveMonth}.`
        );
        await loadRunDetail(selectedRunId);
      } else {
        await createDisbursementDeductionRule(payload);
        setNotice("Deduction rule saved.");
      }

      setShowDeductionModal(false);
      setEditingRuleId(null);
      await loadDeductionRules();
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to save deduction");
    } finally {
      setActionBusy(false);
    }
  };

  const handleDeleteRule = async (rule) => {
    const periodHint = runDetail?.monthLabel && !isLocked
      ? `\n\nExtra deduction (e.g. ${Number(rule.amount || 0).toLocaleString()} RWF) will be removed from the ${runDetail.monthLabel} ${runDetail.payYear || ""} employee table and saved in the database.`
      : "";
    const ok = window.confirm(
      `Remove "${rule.deductionType}" deduction (${rule.monthScopeLabel}, ${rule.frequencyLabel})?${periodHint}\n\nPaid payrolls are not changed.`
    );
    if (!ok) return;
    setActionBusy(true);
    setError("");
    try {
      const res = await deleteDisbursementDeductionRule(rule.id);
      setNotice(res?.message || "Deduction rule removed.");
      await loadDeductionRules();
      if (selectedRunId && !isLocked) {
        await loadRunDetail(selectedRunId, { skipScheduledApply: true });
      }
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || "Failed to delete rule");
    } finally {
      setActionBusy(false);
    }
  };

  const handleMarkPaid = async () => {
    if (selectedRunId == null || isLocked) return;
    setActionBusy(true);
    setError("");
    try {
      const res = await markPayrollRunPaidWithDetails(selectedRunId, paymentForm);
      const count = res?.data?.payslipsGenerated ?? paymentRows.length;
      setNotice(`Payroll marked as paid. ${count} payslips generated and archived.`);
      setShowPaymentModal(false);
      setStatusFilter("Paid");
      await loadRuns();
      await loadRunDetail(selectedRunId);
      await loadHistory();
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to mark payroll as paid");
    } finally {
      setActionBusy(false);
    }
  };

  const canOpenMarkPaid = !isLocked && isPayrollRunApproved(runDetail?.status);
  const canConfirmMarkPaid = canOpenMarkPaid
    && verified.approval
    && verified.review
    && verified.accounts
    && verified.ready;
  const canDeleteRun = !isLocked && runDetail && isPayrollRunApproved(runDetail?.status);

  const handleDeletePayrollRun = async () => {
    if (selectedRunId == null || isLocked) return;
    const ok = window.confirm(
      `Delete payroll ${payrollNum || selectedRunId}?\n\nThis removes all staff lines and cannot be undone.`
    );
    if (!ok) return;
    setActionBusy(true);
    setError("");
    try {
      await deletePayrollRun(selectedRunId);
      setNotice("Payroll run deleted.");
      setSelectedRunId(null);
      setRunDetail(null);
      await loadRuns();
      await loadDeductionRules();
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || "Failed to delete payroll");
    } finally {
      setActionBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      <div className="bg-white border-b border-slate-100 px-4 lg:px-8 py-4 flex flex-wrap items-center gap-3">
        <div>
          <h1 className="text-[#000435] font-black text-xl">Payroll Disbursement</h1>
          <p className="text-slate-400 text-xs">Payment processing & bank transfers</p>
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          {isLocked && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-100 text-emerald-800 text-xs font-bold">
              <Lock size={13} /> PAID — Locked
            </span>
          )}
          {canDeleteRun && (
            <button
              type="button"
              onClick={handleDeletePayrollRun}
              disabled={actionBusy}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-red-200 text-red-700 text-xs font-bold hover:bg-red-50 disabled:opacity-50"
            >
              <Trash2 size={14} /> Delete Payroll
            </button>
          )}
          {canOpenMarkPaid && (
            <button
              type="button"
              onClick={() => setShowPaymentModal(true)}
              disabled={actionBusy}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-green-600 hover:bg-green-700 text-white text-sm font-black shadow-md disabled:opacity-50"
            >
              <CheckCircle size={18} /> Mark as Paid
            </button>
          )}
        </div>
      </div>

      <div className="px-4 lg:px-8 py-6 max-w-7xl mx-auto space-y-6">
        {(error || notice) && (
          <div className={`rounded-xl px-4 py-3 text-sm font-medium flex items-start gap-2 ${error ? "bg-red-50 text-red-700 border border-red-100" : "bg-emerald-50 text-emerald-800 border border-emerald-100"}`}>
            {error ? <AlertCircle size={16} className="shrink-0 mt-0.5" /> : <CheckCircle size={16} className="shrink-0 mt-0.5" />}
            <span>{error || notice}</span>
            <button type="button" className="ml-auto opacity-60 hover:opacity-100" onClick={() => { setError(""); setNotice(""); }}><X size={14} /></button>
          </div>
        )}

        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
          <p className="font-bold text-[#000435] text-sm mb-4">Load Payroll</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <SelectBox label="Academic Year" value={academicYear} onChange={setAcademicYear} options={yearOptions} />
            <SelectBox label="Month" value={month} onChange={setMonth} options={MONTHS} />
            <SelectBox label="Payroll Number" value={payrollNum} onChange={handlePayrollNumChange} options={payrollNumOptions} disabled={!runs.length} />
            <SelectBox label="Status" value={statusFilter} onChange={setStatusFilter} options={["Approved", "Paid", "Draft", "Rejected"]} />
            <button
              type="button"
              onClick={handleLoadPayroll}
              disabled={loading}
              className="mt-6 w-full flex items-center justify-center gap-2 bg-amber-400 hover:bg-amber-500 disabled:opacity-60 text-[#000435] font-bold text-sm px-4 py-2.5 rounded-xl transition-colors"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : null}
              Load Payroll
            </button>
          </div>
          {statusFilter !== "Approved" && statusFilter !== "Paid" && (
            <p className="mt-3 text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
              Only approved payrolls can be processed for disbursement. Draft and rejected payrolls cannot be paid.
            </p>
          )}
        </div>

        {runDetail && (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {[
                { label: "Employees", value: summary.employees },
                { label: "Gross Salary", value: `RWF ${fmtMoney(summary.gross)}` },
                { label: "Total Deductions", value: `RWF ${fmtMoney(summary.deductions)}` },
                { label: "Total Net Salary", value: `RWF ${fmtMoney(summary.net)}` },
                { label: "Total Bank Payable", value: `RWF ${fmtMoney(summary.bankPayable)}` },
              ].map(({ label, value }) => (
                <div key={label} className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
                  <p className="text-lg font-black text-[#000435]">{value}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{label}</p>
                </div>
              ))}
            </div>

            <div className="flex gap-1 bg-white rounded-xl border border-slate-100 p-1 w-fit">
              {["disbursement", "history", "audit"].map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTab(t)}
                  className={`px-4 py-2 rounded-lg text-xs font-bold capitalize transition-all ${tab === t ? "bg-[#000435] text-white" : "text-slate-500 hover:text-[#000435]"}`}
                >
                  {t === "disbursement" ? "Disbursement" : t === "history" ? "History" : "Audit Trail"}
                </button>
              ))}
            </div>
          </>
        )}

        {loadingDetail && (
          <div className="flex items-center justify-center gap-2 py-12 text-slate-400 text-sm">
            <Loader2 size={18} className="animate-spin" /> Loading payroll details…
          </div>
        )}

        {tab === "disbursement" && runDetail && !loadingDetail && (
          <div className="space-y-6">
            {/* Scheduled deduction rules */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-bold text-[#000435] text-sm">Scheduled Payment Deductions</p>
                  <p className="text-xs text-slate-400 mt-0.5">Recurring rules — auto-apply when you load payroll (no need to reconfigure each month)</p>
                </div>
                {!isLocked && (
                  <button
                    type="button"
                    onClick={openAddDeductionModal}
                    className="flex items-center gap-2 bg-amber-400 hover:bg-amber-500 text-[#000435] font-bold text-xs px-4 py-2 rounded-xl"
                  >
                    <Plus size={14} /> Add Deduction Rule
                  </button>
                )}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100">
                      {["Type", "Amount", "Apply To", "Months", "Frequency", "Reason", "Applied", "Actions"].map((h) => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-400">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {loadingRules && (
                      <tr><td colSpan={8} className="px-4 py-6 text-center text-sm text-slate-400"><Loader2 size={14} className="inline animate-spin mr-2" />Loading rules…</td></tr>
                    )}
                    {!loadingRules && !deductionRules.length && (
                      <tr><td colSpan={8} className="px-4 py-6 text-center text-sm text-slate-400">No scheduled deductions. Add a rule to apply welfare, loans, or penalties automatically.</td></tr>
                    )}
                    {!loadingRules && deductionRules.map((rule) => (
                      <tr key={rule.id} className="border-b border-slate-50 hover:bg-slate-50/80">
                        <td className="px-4 py-3 text-xs font-semibold">{rule.deductionType}</td>
                        <td className="px-4 py-3 text-xs">
                          {rule.amountType === "percentage" ? `${rule.amount}%` : `RWF ${fmtMoney(rule.amount)}`}
                        </td>
                        <td className="px-4 py-3 text-xs capitalize">{rule.applyTo}</td>
                        <td className="px-4 py-3 text-xs">
                          <span className={`px-2 py-0.5 rounded-lg font-bold ${rule.monthScope === "all" ? "bg-blue-100 text-blue-800" : "bg-slate-100 text-slate-700"}`}>
                            {rule.monthScopeLabel}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs">
                          <span className={`px-2 py-0.5 rounded-lg font-bold ${rule.frequency === "always" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>
                            {rule.frequencyLabel}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-500 max-w-[140px] truncate" title={rule.reason}>{rule.reason || "—"}</td>
                        <td className="px-4 py-3 text-xs font-semibold">{rule.timesApplied}×</td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1">
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); openEditDeductionRule(rule); }}
                              disabled={actionBusy || isLocked}
                              className="p-1.5 rounded-lg hover:bg-blue-100 text-slate-400 hover:text-blue-600 disabled:opacity-40"
                              title={isLocked ? "Paid payroll is locked" : "Edit"}
                            >
                              <Pencil size={13} />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); handleDeleteRule(rule); }}
                              disabled={actionBusy}
                              className="p-1.5 rounded-lg hover:bg-red-100 text-slate-400 hover:text-red-600 disabled:opacity-40"
                              title="Delete rule"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
                <div className="relative flex-1 min-w-[200px]">
                  <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search employee…"
                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                </div>
                <select value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)} className="px-4 py-2.5 border border-slate-200 bg-white rounded-xl text-sm font-semibold text-[#000435]">
                  {departments.map((d) => <option key={d} value={d}>{d === "all" ? "All Departments" : d}</option>)}
                </select>
                <select value={bankFilter} onChange={(e) => setBankFilter(e.target.value)} className="px-4 py-2.5 border border-slate-200 bg-white rounded-xl text-sm font-semibold text-[#000435]">
                  {banks.map((b) => <option key={b} value={b}>{b === "all" ? "All Banks" : b}</option>)}
                </select>
                <button
                  type="button"
                  onClick={() => downloadDisbursementExcel({ rows: filteredPayments, runNumber: runDetail.runNumber, filename: `disbursement-${runDetail.runNumber}.csv` })}
                  className="flex items-center gap-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 font-bold text-sm px-4 py-2.5 rounded-xl"
                >
                  <Download size={14} /> Export Excel
                </button>
                {!isLocked && (
                  <button
                    type="button"
                    onClick={openAddDeductionModal}
                    className="flex items-center gap-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 font-bold text-sm px-4 py-2.5 rounded-xl"
                  >
                    <Plus size={14} /> Add Payment Deduction
                  </button>
                )}
                {!isLocked && (
                  <button
                    type="button"
                    onClick={() => selectedRunId != null && loadRunDetail(selectedRunId)}
                    className="flex items-center gap-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 font-bold text-sm px-4 py-2.5 rounded-xl"
                  >
                    <RefreshCw size={14} /> Recalculate Final Payable
                  </button>
                )}
              </div>

              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100">
                        {["Staff ID", "Employee", "Bank", "Account Number", "Net Salary", "Extra Ded.", "Final Payable", ""].map((h) => (
                          <th key={h} className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-400">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredPayments.map((p) => (
                        <tr key={p.lineDbId || p.id} className="border-b border-slate-50 hover:bg-amber-50/30 group">
                          <td className="px-4 py-3 text-xs font-bold text-[#000435]">{p.id || "—"}</td>
                          <td className="px-4 py-3">
                            <span className="text-xs font-semibold text-[#000435]">{p.name}</span>
                          </td>
                          <td className="px-4 py-3 text-xs text-slate-500">{p.bank}</td>
                          <td className="px-4 py-3 text-xs text-slate-400">{p.account || "—"}</td>
                          <td className="px-4 py-3 text-xs font-semibold text-[#000435]">{fmtMoney(p.netSalary)}</td>
                          <td className="px-4 py-3 text-xs text-red-500">{fmtMoney(p.extraDeduction)}</td>
                          <td className="px-4 py-3 text-xs font-bold text-green-600">{fmtMoney(p.finalPayable)}</td>
                          <td className="px-4 py-3 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button type="button" onClick={() => setSelectedEmployee(p)} className="p-1.5 rounded-lg hover:bg-blue-100 text-slate-400 hover:text-blue-600">
                              <Eye size={13} />
                            </button>
                          </td>
                        </tr>
                      ))}
                      {!filteredPayments.length && (
                        <tr><td colSpan={8} className="px-4 py-8 text-center text-sm text-slate-400">No employees match your filters.</td></tr>
                      )}
                      {filteredPayments.length > 0 && (
                        <tr className="bg-[#000435] text-white font-bold">
                          <td colSpan={5} className="px-4 py-3 text-xs">TOTAL</td>
                          <td className="px-4 py-3 text-xs">{fmtMoney(filteredPayments.reduce((s, p) => s + p.extraDeduction, 0))}</td>
                          <td className="px-4 py-3 text-xs">RWF {fmtMoney(filteredPayments.reduce((s, p) => s + p.finalPayable, 0))}</td>
                          <td />
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
              <p className="font-bold text-[#000435] text-sm mb-4">Bank Payment Summary</p>
              <div className="space-y-2">
                {bankSummary.map((bank) => (
                  <div key={bank.name} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl hover:bg-amber-50">
                    <div>
                      <p className="text-sm font-bold text-[#000435]">{bank.name}</p>
                      <p className="text-xs text-slate-400">{bank.employees} employees</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <p className="text-sm font-bold text-green-600">RWF {fmtMoney(bank.amount)}</p>
                      <button
                        type="button"
                        onClick={() => downloadBankPaymentExcel({ bankName: bank.name, rows: paymentRows, runNumber: runDetail.runNumber, monthLabel: runDetail.monthLabel }).catch(() => downloadBankPaymentFile({ bankName: bank.name, rows: paymentRows, runNumber: runDetail.runNumber, monthLabel: runDetail.monthLabel }))}
                        className="px-3 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-700 font-bold text-xs rounded-lg transition-colors"
                      >
                        Excel {bank.name}
                      </button>
                    </div>
                  </div>
                ))}
                {!bankSummary.length && <p className="text-sm text-slate-400">No bank data available.</p>}
              </div>
            </div>

            {!isLocked && (
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                <p className="font-bold text-[#000435] text-sm mb-4">Payment Verification</p>
                <div className="space-y-2">
                  {[
                    { label: "Payroll Approved", key: "approval" },
                    { label: "Payroll Reviewed", key: "review" },
                    { label: "Bank Accounts Verified", key: "accounts" },
                    { label: "Ready For Payment", key: "ready" },
                  ].map((item) => (
                    <label key={item.key} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg cursor-pointer hover:bg-amber-50">
                      <input
                        type="checkbox"
                        checked={verified[item.key]}
                        onChange={(e) => setVerified((v) => ({ ...v, [item.key]: e.target.checked }))}
                        className="w-5 h-5 rounded border-slate-300 text-amber-400 focus:ring-amber-400"
                      />
                      <span className="text-sm font-semibold text-[#000435]">{verified[item.key] ? "✓ " : ""}{item.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {canOpenMarkPaid && (
              <button
                type="button"
                onClick={() => setShowPaymentModal(true)}
                disabled={actionBusy}
                className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white font-black text-base py-4 rounded-2xl transition-colors shadow-lg"
              >
                <CheckCircle size={20} /> Mark Payroll As Paid
              </button>
            )}
          </div>
        )}

        {tab === "history" && (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  {["Month", "Payroll No.", "Employees", "Net Pay", "Bank Payable", "Status", "Actions"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-400">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {historyRuns.map((r) => (
                  <tr key={r.db_id} className="border-b border-slate-50 hover:bg-slate-50">
                    <td className="px-4 py-3 text-sm">{r.monthLabel} {r.payYear}</td>
                    <td className="px-4 py-3 text-sm font-semibold">{r.runNumber}</td>
                    <td className="px-4 py-3 text-sm">{r.staffCount}</td>
                    <td className="px-4 py-3 text-sm">RWF {(r.netTotal / 1_000_000).toFixed(1)}M</td>
                    <td className="px-4 py-3 text-sm">RWF {((r.disbursementTotal || r.netTotal) / 1_000_000).toFixed(1)}M</td>
                    <td className="px-4 py-3"><span className="text-xs font-bold px-2 py-1 rounded-lg bg-emerald-100 text-emerald-800">Paid</span></td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => { setSelectedRunId(r.db_id); setPayrollNum(r.runNumber); setStatusFilter("Paid"); setTab("disbursement"); }}
                        className="text-xs font-bold text-amber-700 hover:underline"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
                {!historyRuns.length && (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-sm text-slate-400">No paid payroll history yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {tab === "audit" && (
          <div className="space-y-2">
            {auditTrail.map((log) => (
              <div key={log.id} className="bg-white rounded-2xl border border-slate-100 p-4 flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
                  <CheckCircle size={18} className="text-amber-600" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-bold text-[#000435]">{log.action}</p>
                    <span className="text-xs text-slate-400">{fmtTime(log.date)}</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">By {log.user}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{fmtDate(log.date)}</p>
                </div>
              </div>
            ))}
            {!auditTrail.length && (
              <p className="text-sm text-slate-400 text-center py-8">Select a payroll to view its audit trail.</p>
            )}
          </div>
        )}
      </div>

      {showDeductionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 sticky top-0 bg-white z-10">
              <h3 className="font-black text-[#000435]">{editingRuleId ? "Edit Deduction Rule" : "Add Payment Deduction"}</h3>
              <button type="button" onClick={() => { setShowDeductionModal(false); setEditingRuleId(null); }} className="p-1.5 rounded-lg hover:bg-slate-100"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Deduction Type</label>
                <select
                  value={deductionForm.deductionType}
                  onChange={(e) => setDeductionForm((f) => ({ ...f, deductionType: e.target.value }))}
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                >
                  {["Loan Recovery", "Penalty", "Welfare", "Salary Advance", "Other"].map((o) => <option key={o}>{o}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Apply To</label>
                <select
                  value={deductionForm.applyTo}
                  onChange={(e) => setDeductionForm((f) => ({ ...f, applyTo: e.target.value }))}
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                >
                  <option value="all">All Employees</option>
                  <option value="selected">Selected Employees</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Amount Type</label>
                  <select
                    value={deductionForm.amountType}
                    onChange={(e) => setDeductionForm((f) => ({ ...f, amountType: e.target.value }))}
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                  >
                    <option value="fixed">Fixed Amount</option>
                    <option value="percentage">Percentage</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Amount</label>
                  <input
                    type="number"
                    value={deductionForm.amount}
                    onChange={(e) => setDeductionForm((f) => ({ ...f, amount: e.target.value }))}
                    placeholder="10,000"
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Reason</label>
                <textarea
                  value={deductionForm.reason}
                  onChange={(e) => setDeductionForm((f) => ({ ...f, reason: e.target.value }))}
                  placeholder="Staff Welfare Contribution"
                  rows={2}
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Effective Month</label>
                <div className="grid grid-cols-2 gap-2 mb-2">
                  {[
                    { value: "single", label: "One month only" },
                    { value: "all", label: "All months" },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setDeductionForm((f) => ({ ...f, monthScope: opt.value }))}
                      className={`py-2 px-3 rounded-xl text-xs font-bold border transition-colors ${
                        deductionForm.monthScope === opt.value
                          ? "bg-[#000435] text-white border-[#000435]"
                          : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                {deductionForm.monthScope === "single" && (
                  <select
                    value={deductionForm.effectiveMonth}
                    onChange={(e) => setDeductionForm((f) => ({ ...f, effectiveMonth: e.target.value }))}
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                  >
                    {MONTHS.map((m) => <option key={m} value={m}>{m}</option>)}
                  </select>
                )}
                {deductionForm.monthScope === "all" && (
                  <p className="text-xs text-blue-700 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">Applies to every month when payroll is loaded.</p>
                )}
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">How Often</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { value: "once", label: "Once", hint: "First matching payroll only" },
                    { value: "always", label: "Always", hint: "Every matching month until deleted" },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setDeductionForm((f) => ({ ...f, frequency: opt.value }))}
                      className={`py-2.5 px-3 rounded-xl text-left border transition-colors ${
                        deductionForm.frequency === opt.value
                          ? "bg-amber-400 border-amber-500 text-[#000435]"
                          : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      <span className="text-xs font-black block">{opt.label}</span>
                      <span className="text-[10px] opacity-80">{opt.hint}</span>
                    </button>
                  ))}
                </div>
              </div>
              {!editingRuleId && selectedRunId && !isLocked && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                  <p className="text-xs text-amber-700">
                    <strong>Preview:</strong> {deductionPreview.count} Employees | Deduction: {fmtMoney(deductionPreview.perEmployee)} | Total Impact: {fmtMoney(deductionPreview.total)}
                  </p>
                  <p className="text-[10px] text-amber-600 mt-1">Will apply to current payroll and save as a reusable rule.</p>
                </div>
              )}
            </div>
            <div className="px-6 py-4 border-t border-slate-100 flex gap-2 justify-end sticky bottom-0 bg-white">
              <button type="button" onClick={() => { setShowDeductionModal(false); setEditingRuleId(null); }} className="px-4 py-2 rounded-xl text-sm text-slate-500 hover:bg-slate-100">Cancel</button>
              <button type="button" onClick={handleSaveDeduction} disabled={actionBusy} className="px-6 py-2 rounded-xl text-sm font-bold bg-amber-400 hover:bg-amber-500 text-[#000435] transition-colors disabled:opacity-60">
                {actionBusy ? "Saving…" : editingRuleId ? "Update Rule" : "Save & Apply"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h3 className="font-black text-[#000435]">Confirm Payment</h3>
              <button type="button" onClick={() => setShowPaymentModal(false)} className="p-1.5 rounded-lg hover:bg-slate-100"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Payment Date</label>
                <input type="date" value={paymentForm.paymentDate} onChange={(e) => setPaymentForm((f) => ({ ...f, paymentDate: e.target.value }))} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Payment Reference</label>
                <input type="text" value={paymentForm.paymentReference} onChange={(e) => setPaymentForm((f) => ({ ...f, paymentReference: e.target.value }))} placeholder="REF-2026-06-001" className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Transaction Number</label>
                <input type="text" value={paymentForm.transactionNumber} onChange={(e) => setPaymentForm((f) => ({ ...f, transactionNumber: e.target.value }))} placeholder="TXN-20260601-001" className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Payment Method</label>
                <select value={paymentForm.paymentMethod} onChange={(e) => setPaymentForm((f) => ({ ...f, paymentMethod: e.target.value }))} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400">
                  {["Bank Transfer", "Cash", "Mobile Money", "Cheque"].map((o) => <option key={o}>{o}</option>)}
                </select>
              </div>
              <div className="border border-slate-200 rounded-xl p-4 space-y-2">
                <p className="text-xs font-bold text-slate-500 uppercase">Confirm before payment</p>
                {[
                  { label: "Payroll Approved", key: "approval" },
                  { label: "Payroll Reviewed", key: "review" },
                  { label: "Bank Accounts Verified", key: "accounts" },
                  { label: "Ready For Payment", key: "ready" },
                ].map((item) => (
                  <label key={item.key} className="flex items-center gap-3 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={verified[item.key]}
                      onChange={(e) => setVerified((v) => ({ ...v, [item.key]: e.target.checked }))}
                      className="w-4 h-4 rounded border-slate-300 text-green-600"
                    />
                    <span>{item.label}</span>
                  </label>
                ))}
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                <p className="text-xs text-amber-700"><strong>Warning:</strong> Once marked as paid, this payroll cannot be edited or deleted. {paymentRows.length} payslips will be generated automatically.</p>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-slate-100 flex gap-2 justify-end">
              <button type="button" onClick={() => setShowPaymentModal(false)} className="px-4 py-2 rounded-xl text-sm text-slate-500 hover:bg-slate-100">Cancel</button>
              <button
                type="button"
                onClick={handleMarkPaid}
                disabled={actionBusy || !canConfirmMarkPaid}
                className="px-6 py-2 rounded-xl text-sm font-bold bg-green-600 hover:bg-green-700 text-white transition-colors disabled:opacity-50"
              >
                {actionBusy ? "Processing…" : "Confirm Mark As Paid"}
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedEmployee && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/30" onClick={() => setSelectedEmployee(null)} />
          <div className="relative bg-white w-full max-w-sm h-full overflow-y-auto shadow-2xl p-6 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-black text-[#000435]">Payment Details</h3>
              <button type="button" onClick={() => setSelectedEmployee(null)} className="p-1.5 rounded-lg hover:bg-slate-100"><X size={16} /></button>
            </div>
            <div className="bg-[#000435] rounded-2xl p-4 text-white">
              <p className="font-black text-lg">{selectedEmployee.name}</p>
              <p className="text-white/50 text-xs mt-1">ID: {selectedEmployee.id}</p>
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase mb-2">Earnings</p>
              {[
                { label: "Basic Salary", value: selectedEmployee.basic },
                { label: "Transport", value: selectedEmployee.transportAllowance },
                { label: "Housing", value: selectedEmployee.housingAllowance },
                { label: "Other Allowances", value: selectedEmployee.othersAllowance },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between py-1.5 border-b border-slate-50 text-sm">
                  <span className="text-slate-500">{label}</span>
                  <span>{fmtMoney(value)}</span>
                </div>
              ))}
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase mb-2">Deductions</p>
              {[
                { label: "PAYE", value: selectedEmployee.paye },
                { label: "RSSB", value: selectedEmployee.rssb },
                { label: "RAMA", value: selectedEmployee.rama },
                { label: "CBHI", value: selectedEmployee.cbhi },
                { label: "Additional Deductions", value: selectedEmployee.extraDeduction },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between py-1.5 border-b border-slate-50 text-sm">
                  <span className="text-slate-500">{label}</span>
                  <span className={label.includes("Additional") ? "text-red-500" : ""}>{fmtMoney(value)}</span>
                </div>
              ))}
            </div>
            {[
              { label: "Net Salary", value: selectedEmployee.netSalary },
              { label: "Final Payable", value: selectedEmployee.finalPayable, bold: true },
              { label: "Bank", value: selectedEmployee.bankName || selectedEmployee.bank },
              { label: "Account", value: selectedEmployee.account || "—" },
            ].map(({ label, value, bold }) => (
              <div key={label} className={`flex justify-between py-2 border-b border-slate-100 text-sm ${bold ? "font-bold" : ""}`}>
                <span className="text-slate-500">{label}</span>
                <span className={bold ? "text-green-600" : ""}>{typeof value === "number" ? fmtMoney(value) : value}</span>
              </div>
            ))}
            {isPayrollRunPaid(runDetail?.status) && (
              <div className="flex gap-2 pt-4">
                <button type="button" className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50">View Payslip</button>
                <button type="button" className="flex-1 py-2.5 bg-amber-100 rounded-xl text-sm font-bold text-amber-700 hover:bg-amber-200">Download PDF</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
