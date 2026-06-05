import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Download, X, Search, Loader2, AlertCircle, Building2,
  Users, Wallet, CreditCard, RefreshCw, CheckCircle2,
} from "lucide-react";
import api from "../../services/api";
import { parseManagerAcademicSettings, yearOptionLabel } from "../../utils/academicCalendarFilters";
import {
  getPaidPayrollRuns,
  getApprovedPayrollRuns,
  getPayrollRun,
  mapLineToPaymentRow,
  groupPaymentsByBank,
  bankShortName,
  downloadBankPayrollReportExcel,
  employeePaymentStatus,
  formatPayrollPaymentDate,
} from "../../services/payrollDisbursementService";

const NAVY = "#000435";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const BANK_META = {
  BK: { label: "Bank of Kigali", code: "BK", color: "#1E40AF", bg: "#EFF6FF" },
  BPR: { label: "BPR Bank", code: "BPR", color: "#047857", bg: "#ECFDF5" },
  Equity: { label: "Equity Bank", code: "EQ", color: "#B45309", bg: "#FFFBEB" },
  "I&M": { label: "I&M Bank", code: "IM", color: "#7C3AED", bg: "#F5F3FF" },
  Ecobank: { label: "Ecobank", code: "EB", color: "#0F766E", bg: "#F0FDFA" },
};

function toPayrollYear(y) {
  const txt = String(y || "").trim();
  const m = txt.match(/\b(20\d{2}|19\d{2})\b/);
  if (m) return Number(m[1]);
  const n = Number(y);
  return Number.isFinite(n) ? n : new Date().getFullYear();
}

function fmtMoney(n) {
  return Number(n || 0).toLocaleString();
}

function bankMeta(name) {
  const short = bankShortName(name);
  return BANK_META[short] || { label: name || "Other Bank", code: short.slice(0, 2).toUpperCase(), color: NAVY, bg: "#F8FAFC" };
}

function getSchoolName() {
  try {
    const raw = localStorage.getItem("user") || localStorage.getItem("authUser") || "{}";
    const u = JSON.parse(raw);
    return u?.school?.name || u?.school_name || "";
  } catch {
    return "";
  }
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

function StatusBadge({ status }) {
  const paid = String(status).toLowerCase() === "paid";
  return (
    <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-full ${paid ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${paid ? "bg-emerald-500" : "bg-amber-500"}`} />
      {paid ? "Paid" : "Processing"}
    </span>
  );
}

function BankEmployeesModal({ bankName, rows, runDetail, onClose, onExport, exporting }) {
  const [search, setSearch] = useState("");
  const meta = bankMeta(bankName);
  const paymentDate = formatPayrollPaymentDate(runDetail);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (bankShortName(r.bankName || r.bank) !== bankShortName(bankName)) return false;
      if (!q) return true;
      return r.name.toLowerCase().includes(q) || String(r.account).includes(q) || String(r.id).includes(q);
    });
  }, [rows, bankName, search]);

  const total = filtered.reduce((s, r) => s + Number(r.finalPayable || 0), 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/45 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white w-full max-w-4xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Modal header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-start gap-4 shrink-0" style={{ background: meta.bg }}>
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center text-sm font-black shrink-0"
            style={{ background: meta.color, color: "#fff" }}
          >
            {meta.code}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-black text-lg text-[#000435]">{meta.label}</p>
            <p className="text-xs text-slate-500 mt-0.5">
              {filtered.length} employees · RWF {fmtMoney(total)} · {runDetail?.runNumber || "—"}
            </p>
          </div>
          <button type="button" onClick={onClose} className="p-2 rounded-xl hover:bg-white/60 text-slate-500">
            <X size={18} />
          </button>
        </div>

        {/* Toolbar */}
        <div className="px-5 py-3 border-b border-slate-100 flex flex-wrap items-center gap-3 shrink-0">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search employee or account…"
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </div>
          <button
            type="button"
            onClick={() => onExport(bankName)}
            disabled={exporting || !filtered.length}
            className="inline-flex items-center gap-2 bg-[#000435] hover:bg-[#000435]/90 disabled:opacity-60 text-white font-bold text-sm px-4 py-2.5 rounded-xl"
          >
            {exporting ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
            Generate & Download
          </button>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-y-auto">
          <table className="w-full">
            <thead className="sticky top-0 bg-slate-50 border-b border-slate-100">
              <tr>
                {["Employee", "Account Number", "Amount Paid (RWF)", "Status", "Payment Date"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-400">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.lineDbId || `${r.id}-${r.name}`} className="border-b border-slate-50 hover:bg-amber-50/40">
                  <td className="px-4 py-3">
                    <p className="text-sm font-semibold text-[#000435]">{r.name}</p>
                    <p className="text-[10px] text-slate-400">{r.id || "—"} · {r.dept || "Staff"}</p>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500 font-mono">{r.account || "—"}</td>
                  <td className="px-4 py-3 text-sm font-bold text-emerald-600">{fmtMoney(r.finalPayable)}</td>
                  <td className="px-4 py-3"><StatusBadge status={r.paymentStatus} /></td>
                  <td className="px-4 py-3 text-xs text-slate-500">{r.paymentDate || paymentDate}</td>
                </tr>
              ))}
              {!filtered.length && (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-sm text-slate-400">No employees found for this bank.</td>
                </tr>
              )}
            </tbody>
            {filtered.length > 0 && (
              <tfoot className="sticky bottom-0 bg-[#000435] text-white">
                <tr>
                  <td className="px-4 py-3 text-xs font-bold" colSpan={2}>TOTAL ({filtered.length} employees)</td>
                  <td className="px-4 py-3 text-sm font-black">RWF {fmtMoney(total)}</td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}

export default function BankPayroll() {
  const [year, setYear] = useState("");
  const [month, setMonth] = useState(MONTHS[new Date().getMonth()]);
  const [payrollNum, setPayrollNum] = useState("");
  const [statusFilter, setStatusFilter] = useState("Paid");
  const [yearOptions, setYearOptions] = useState([]);
  const [runs, setRuns] = useState([]);
  const [runDetail, setRunDetail] = useState(null);
  const [paymentRows, setPaymentRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [error, setError] = useState("");
  const [modalBank, setModalBank] = useState(null);
  const [exportBusy, setExportBusy] = useState("");
  const [toast, setToast] = useState("");

  const payrollYear = useMemo(() => toPayrollYear(year), [year]);

  useEffect(() => {
    api.get("/dos/academic-calendar-settings")
      .then((res) => {
        if (!res.data?.success) return;
        const parsed = parseManagerAcademicSettings(res.data.data || {});
        const y = parsed.currentYear || String(new Date().getFullYear());
        setYearOptions((parsed.years?.length ? parsed.years : [y]).map((v) => {
          const row = parsed.registry?.find((r) => String(r.academic_year) === String(v));
          return { value: v, label: yearOptionLabel(row) || v };
        }));
        setYear(y);
      })
      .catch(() => {
        const y = String(new Date().getFullYear());
        setYearOptions([{ value: y, label: y }]);
        setYear(y);
      });
  }, []);

  const enrichRows = useCallback((lines, detail) => {
    const status = employeePaymentStatus(detail?.status);
    const paymentDate = formatPayrollPaymentDate(detail);
    return (lines || []).map((line) => ({
      ...mapLineToPaymentRow(line),
      paymentStatus: status,
      paymentDate,
    }));
  }, []);

  const loadRuns = useCallback(async () => {
    if (!year) return;
    setLoading(true);
    setError("");
    setRunDetail(null);
    setPaymentRows([]);
    setModalBank(null);
    try {
      const fetcher = statusFilter === "Approved" ? getApprovedPayrollRuns : getPaidPayrollRuns;
      const data = await fetcher({ month, year: payrollYear, academicYear: year, limit: 50 });
      setRuns(data);
      const match = data.find((r) => r.runNumber === payrollNum) || data[0];
      if (!match) {
        setPayrollNum("");
        return;
      }
      setPayrollNum(match.runNumber);
    } catch (e) {
      setRuns([]);
      setPayrollNum("");
      setError(e?.response?.data?.message || "Failed to load payroll runs.");
    } finally {
      setLoading(false);
    }
  }, [year, month, payrollYear, payrollNum, statusFilter]);

  const loadRunDetail = useCallback(async (runId) => {
    if (!runId) {
      setRunDetail(null);
      setPaymentRows([]);
      return;
    }
    setLoadingDetail(true);
    setError("");
    try {
      const detail = await getPayrollRun(runId);
      setRunDetail(detail);
      setPaymentRows(enrichRows(detail?.lines, detail));
    } catch (e) {
      setRunDetail(null);
      setPaymentRows([]);
      setError(e?.response?.data?.message || "Failed to load payroll details.");
    } finally {
      setLoadingDetail(false);
    }
  }, [enrichRows]);

  useEffect(() => {
    if (year) loadRuns();
  }, [year, month, statusFilter, loadRuns]);

  useEffect(() => {
    const run = runs.find((r) => r.runNumber === payrollNum) || runs[0];
    if (run?.db_id) loadRunDetail(run.db_id);
  }, [runs, payrollNum, loadRunDetail]);

  const payrollOptions = useMemo(() => {
    if (!runs.length) return [{ value: "", label: "No payroll run" }];
    return runs.map((r) => ({ value: r.runNumber, label: `${r.runNumber} · ${r.staffCount || 0} staff` }));
  }, [runs]);

  const bankSummary = useMemo(() => groupPaymentsByBank(paymentRows), [paymentRows]);

  const totals = useMemo(() => ({
    employees: paymentRows.length,
    amount: paymentRows.reduce((s, r) => s + Number(r.finalPayable || 0), 0),
    banks: bankSummary.length,
  }), [paymentRows, bankSummary]);

  const handleExportBank = async (bankName) => {
    if (!runDetail || !paymentRows.length) return;
    setExportBusy(bankName);
    try {
      await downloadBankPayrollReportExcel({
        bankName,
        rows: paymentRows,
        runDetail,
        schoolName: getSchoolName(),
      });
      setToast(`${bankMeta(bankName).label} file downloaded`);
      setTimeout(() => setToast(""), 3500);
    } catch (e) {
      setError(e?.message || "Failed to generate Excel file.");
    } finally {
      setExportBusy("");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      <div className="bg-white border-b border-slate-100 px-4 lg:px-8 py-4">
        <h1 className="text-[#000435] font-black text-xl">Bank Transfers</h1>
        <p className="text-slate-400 text-xs mt-0.5">Generate payment files for all supported banks</p>
      </div>

      <div className="px-4 lg:px-8 py-6 max-w-7xl mx-auto space-y-6">
        {error && (
          <div className="rounded-xl px-4 py-3 text-sm font-medium flex items-start gap-2 bg-amber-50 text-amber-800 border border-amber-100">
            <AlertCircle size={16} className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
          <p className="font-bold text-[#000435] text-sm mb-4">Select Period</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <SelectBox label="Academic Year" value={year} onChange={setYear} options={yearOptions.length ? yearOptions : [{ value: year, label: year }]} />
            <SelectBox label="Month" value={month} onChange={setMonth} options={MONTHS} />
            <SelectBox label="Payroll Status" value={statusFilter} onChange={setStatusFilter} options={["Paid", "Approved"]} />
            <SelectBox label="Payroll No." value={payrollNum} onChange={setPayrollNum} options={payrollOptions} disabled={!runs.length} />
          </div>
          <button
            type="button"
            onClick={loadRuns}
            disabled={loading}
            className="mt-4 inline-flex items-center gap-2 bg-amber-400 hover:bg-amber-500 disabled:opacity-60 text-[#000435] font-bold text-sm px-4 py-2.5 rounded-xl"
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
            Refresh
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: "Total Amount", value: loadingDetail ? "…" : `RWF ${(totals.amount / 1_000_000).toFixed(1)}M`, sub: fmtMoney(totals.amount), icon: Wallet, accent: "bg-amber-100 text-amber-600" },
            { label: "Employees", value: loadingDetail ? "…" : totals.employees, sub: runDetail?.runNumber || "—", icon: Users, accent: "bg-blue-100 text-blue-600" },
            { label: "Banks", value: loadingDetail ? "…" : totals.banks, sub: runDetail ? `${runDetail.monthLabel} ${runDetail.payYear}` : "—", icon: Building2, accent: "bg-emerald-100 text-emerald-600" },
          ].map(({ label, value, sub, icon: Icon, accent }) => (
            <div key={label} className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{label}</p>
                  <p className="text-2xl font-black text-[#000435] mt-1">{value}</p>
                  <p className="text-xs text-slate-400 mt-1">{sub}</p>
                </div>
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${accent}`}>
                  <Icon size={20} />
                </div>
              </div>
            </div>
          ))}
        </div>

        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-black text-[#000435] text-sm flex items-center gap-2">
              <CreditCard size={15} className="text-amber-500" />
              Bank Breakdown
            </h2>
            {loadingDetail && <Loader2 size={16} className="animate-spin text-slate-400" />}
          </div>

          {!loadingDetail && !bankSummary.length && (
            <div className="bg-white rounded-2xl border border-slate-100 p-10 text-center text-sm text-slate-400">
              No bank data for this period. Run payroll and mark it {statusFilter === "Paid" ? "paid" : "approved"} first.
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {bankSummary.map((bank) => {
              const meta = bankMeta(bank.name);
              return (
                <div
                  key={bank.name}
                  className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden hover:shadow-md transition-all cursor-pointer group"
                  onClick={() => setModalBank(bank.name)}
                >
                  <div className="px-4 py-4 flex items-center gap-3" style={{ background: NAVY }}>
                    <div className="w-10 h-10 rounded-xl bg-amber-400 flex items-center justify-center text-[#000435] text-xs font-black shrink-0">
                      {meta.code}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-black text-sm text-white truncate">{meta.label}</p>
                      <p className="text-[10px] text-white/50">Code: {meta.code}</p>
                    </div>
                  </div>
                  <div className="px-4 py-4 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-slate-400">Employees</span>
                      <span className="text-sm font-bold text-blue-600">{bank.employees}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-slate-400">Total Amount</span>
                      <span className="text-sm font-bold text-emerald-600">RWF {fmtMoney(bank.amount)}</span>
                    </div>
                  </div>
                  <div className="px-4 pb-4">
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setModalBank(bank.name); }}
                      className="w-full flex items-center justify-center gap-2 bg-amber-50 hover:bg-amber-100 text-amber-700 font-bold text-xs py-2.5 rounded-lg transition-colors group-hover:bg-amber-100"
                    >
                      <Download size={12} /> View & Generate File
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {modalBank && (
        <BankEmployeesModal
          bankName={modalBank}
          rows={paymentRows}
          runDetail={runDetail}
          onClose={() => setModalBank(null)}
          onExport={handleExportBank}
          exporting={exportBusy === modalBank}
        />
      )}

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-[#000435] text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-2 z-50">
          <CheckCircle2 size={16} className="text-amber-400" />
          <span className="font-bold text-sm">{toast}</span>
          <button type="button" onClick={() => setToast("")} className="ml-2 text-white/40 hover:text-white">
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
