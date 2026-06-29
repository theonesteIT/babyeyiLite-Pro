import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BarChart3, Building2, Download, Eye, FileSpreadsheet, FileText, Loader2,
  RefreshCw, TrendingUp, Users, Wallet, AlertCircle, CheckCircle2, X,
} from "lucide-react";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart,
  Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import api from "../../services/api";
import { getPayrollRuns, getPayrollRun, isPayrollRunPaid } from "../../services/payrollRunService";
import { getEmployeePayrollDeductions } from "../../services/payrollTemplateService";
import { listTerminationsForPayrollMonth } from "../../services/terminationBenefitsService";
import { buildPayrollPreviewRows } from "../../utils/payrollPreview";
import { filterPayrollEmployeeDeductions } from "../../utils/payrollEmployeeDeductions";
import {
  parseManagerAcademicSettings,
  yearOptionLabel,
  resolvePayrollCalendarYear,
} from "../../utils/academicCalendarFilters";
import {
  computeReportAnalytics,
  registerRowsFromRunDetail,
  runStatusLabel,
  sumBankReportRows,
  sumTaxReportRows,
  enrichRegisterRowForReports,
  resolveBankReportColumns,
  resolveTaxReportColumns,
  buildPreviewReportRows,
} from "../../utils/payrollReportTables";
import {
  downloadBankPayrollReportPdf,
  downloadTaxPayrollReportPdf,
  downloadBankPayrollReportExcel,
  downloadTaxPayrollReportExcel,
} from "../../utils/payrollReportExport";
import PayrollReportRegisterTable from "../../components/PayrollReportRegisterTable";
import AccountantOchreHero from "../../components/AccountantOchreHero";

const NAVY = "#000435";
const AMBER = "#F59E0B";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const MONTH_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const TABS = [
  { id: "tax", label: "Tax Payroll", icon: FileText },
  { id: "bank", label: "Bank Payroll", icon: Building2 },
];

const CHART_COLORS = ["#000435", "#F59E0B", "#DC2626", "#059669", "#2563EB", "#7C3AED"];

function toPayrollYear(academicYear, month) {
  return resolvePayrollCalendarYear(academicYear, month);
}

function getSchoolName() {
  try {
    const raw = localStorage.getItem("user") || localStorage.getItem("authUser") || "{}";
    const u = JSON.parse(raw);
    return u?.school?.name || u?.school_name || "School";
  } catch {
    return "School";
  }
}

function fmtMoney(n) {
  return Number(n || 0).toLocaleString();
}

function fmtCompact(n) {
  const v = Number(n || 0);
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)}K`;
  return String(Math.round(v));
}

const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-100 rounded-xl shadow-lg px-3 py-2 text-xs">
      <p className="font-bold text-[#000435] mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }} className="font-medium">
          {p.name}: {typeof p.value === "number" ? fmtMoney(p.value) : p.value}
        </p>
      ))}
    </div>
  );
};

function FilterBar({ academicYear, setAcademicYear, month, setMonth, yearOptions, monthOptions, runOptions, selectedRunId, onRunChange, onRefresh, loading }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
        <label className="block">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1 block">Academic Year</span>
          <select
            value={academicYear}
            onChange={(e) => setAcademicYear(e.target.value)}
            className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-semibold text-[#000435] focus:outline-none focus:ring-2 focus:ring-amber-400"
          >
            {yearOptions.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1 block">Month</span>
          <select
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-semibold text-[#000435] focus:outline-none focus:ring-2 focus:ring-amber-400"
          >
            {monthOptions.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </label>
        <label className="block lg:col-span-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1 block">Payroll Run</span>
          <select
            value={selectedRunId}
            onChange={(e) => onRunChange(e.target.value)}
            className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-semibold text-[#000435] focus:outline-none focus:ring-2 focus:ring-amber-400"
          >
            {runOptions.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </label>
        <button
          type="button"
          onClick={onRefresh}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-60"
        >
          {loading ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />}
          Refresh
        </button>
      </div>
    </div>
  );
}

function StatCard({ label, value, sub, icon: Icon }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-4 md:p-5 shadow-sm hover:shadow-md transition-shadow">
      <Icon size={22} className="text-amber-500 mb-3" strokeWidth={2} />
      <p className="text-xl md:text-2xl font-black text-[#000435] tabular-nums">{value}</p>
      <p className="text-xs text-slate-500 mt-0.5 font-medium">{label}</p>
      {sub ? <p className="text-[11px] text-amber-600 font-semibold mt-1">{sub}</p> : null}
    </div>
  );
}

function RegisterTableModal({
  open,
  onClose,
  title,
  subtitle,
  variant,
  rows,
  totalRow,
  bankColumns = [],
  taxColumns = [],
  onExportPdf,
  onExportExcel,
  exporting,
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 md:p-6">
      <button
        type="button"
        className="absolute inset-0 bg-[#000435]/55 backdrop-blur-sm"
        aria-label="Close register table"
        onClick={onClose}
      />
      <div
        className="relative flex flex-col w-full max-w-[98vw] h-[94vh] bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="register-modal-title"
      >
        <div className="shrink-0 bg-[#000435] border-b-4 border-amber-400 px-4 sm:px-6 py-4 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 id="register-modal-title" className="text-white font-black text-lg sm:text-xl tracking-tight truncate">
              {title}
            </h2>
            <p className="text-amber-400/90 text-xs sm:text-sm mt-0.5 truncate">{subtitle}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 p-2 rounded-xl bg-white/10 hover:bg-white/20 text-amber-400 transition-colors"
            aria-label="Cancel"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-hidden p-3 sm:p-4 bg-slate-50 flex flex-col">
          {rows.length ? (
            <PayrollReportRegisterTable
              variant={variant}
              rows={rows}
              totalRow={totalRow}
              bankColumns={bankColumns}
              taxColumns={taxColumns}
              maxHeight="none"
              fillHeight
            />
          ) : (
            <div className="h-full min-h-[200px] flex items-center justify-center text-sm text-slate-400">
              No register data for this period.
            </div>
          )}
        </div>

        <div className="shrink-0 border-t border-slate-100 px-4 sm:px-6 py-3 flex flex-wrap items-center justify-end gap-2 bg-white">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onExportExcel}
            disabled={exporting || !rows.length}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-[#000435] hover:bg-slate-50 disabled:opacity-50"
          >
            {exporting ? <Loader2 size={15} className="animate-spin" /> : <FileSpreadsheet size={15} />}
            Export Excel
          </button>
          <button
            type="button"
            onClick={onExportPdf}
            disabled={exporting || !rows.length}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-500 text-[#000435] text-sm font-bold disabled:opacity-50"
          >
            {exporting ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
            Export PDF
          </button>
        </div>
      </div>
    </div>
  );
}

function RunStatusBanner({ status, runNumber, isPreview }) {
  const paid = isPayrollRunPaid(status);
  return (
    <div className={`rounded-2xl px-4 py-3 flex items-center gap-3 border ${
      paid ? "bg-emerald-50 border-emerald-200" : isPreview ? "bg-slate-50 border-slate-200" : "bg-amber-50 border-amber-200"
    }`}
    >
      {paid ? <CheckCircle2 size={18} className="text-emerald-600 shrink-0" /> : <AlertCircle size={18} className="text-amber-600 shrink-0" />}
      <div className="text-sm">
        <p className="font-bold text-[#000435]">
          {isPreview ? "Preview from staff profiles — no saved payroll run for this period" : runNumber || "Payroll run"}
        </p>
        <p className="text-slate-500 text-xs mt-0.5">
          Status: <strong className={paid ? "text-emerald-700" : "text-amber-700"}>{isPreview ? "Preview" : runStatusLabel(status)}</strong>
          {isPreview ? " · Run payroll to save official register data" : paid ? " · Disbursement complete" : " · Awaiting payment on Salary Payment"}
        </p>
      </div>
    </div>
  );
}

function AnalyticsPanel({ analytics, trendData, deductionBreakdown, tab }) {
  const piePaid = [
    { name: "Paid runs", value: analytics.paidRunsCount || 0 },
    { name: "Processing", value: analytics.processingRunsCount || 0 },
  ].filter((x) => x.value > 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label="Employees"
          value={analytics.employeeCount}
          sub={`${analytics.runStatusLabel} period`}
          icon={Users}
        />
        <StatCard
          label="Gross Payroll"
          value={`${fmtCompact(analytics.grossTotal)} RWF`}
          sub={`PAYE ${fmtCompact(analytics.payeTotal)}`}
          icon={TrendingUp}
        />
        <StatCard
          label={tab === "tax" ? "Tax Net (excl. Mutuelle)" : "Bank Net Payable"}
          value={`${fmtCompact(tab === "tax" ? analytics.taxNetTotal : analytics.bankNetTotal)} RWF`}
          sub={tab === "bank" && analytics.mutuelTotal ? `Mutuelle ${fmtCompact(analytics.mutuelTotal)} deducted` : "Before CBHI on tax view"}
          icon={Wallet}
        />
        <StatCard
          label={tab === "bank" ? "Other Deductions" : "CSR 14% Total"}
          value={tab === "bank" ? `${fmtCompact(analytics.otherDedTotal)} RWF` : `${fmtCompact(analytics.csrTotal)} RWF`}
          sub={tab === "bank" ? "Advances, SACCO, etc." : `RAMA ${fmtCompact(analytics.ramaTotal)}`}
          icon={BarChart3}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
          <h3 className="font-bold text-[#000435] text-sm">Monthly Gross & Net Trend</h3>
          <p className="text-xs text-slate-400 mt-0.5 mb-4">Academic year payroll runs</p>
          <div className="h-56">
            {trendData.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData}>
                  <defs>
                    <linearGradient id="grossGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={AMBER} stopOpacity={0.35} />
                      <stop offset="95%" stopColor={AMBER} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E4E8F0" />
                  <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => fmtCompact(v)} />
                  <Tooltip content={<ChartTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Area type="monotone" dataKey="gross" name="Gross" stroke={AMBER} fill="url(#grossGrad)" strokeWidth={2} />
                  <Line type="monotone" dataKey="net" name="Net" stroke={NAVY} strokeWidth={2} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-sm text-slate-400">No trend data for this year</div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
          <h3 className="font-bold text-[#000435] text-sm">Deduction Breakdown</h3>
          <p className="text-xs text-slate-400 mt-0.5 mb-4">{tab === "tax" ? "Statutory (excl. Mutuelle)" : "Including Mutuelle & other"}</p>
          <div className="h-56">
            {deductionBreakdown.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={deductionBreakdown} layout="vertical" margin={{ left: 8, right: 16 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E4E8F0" />
                  <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={(v) => fmtCompact(v)} />
                  <YAxis type="category" dataKey="name" width={72} tick={{ fontSize: 10 }} />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="amount" radius={[0, 6, 6, 0]}>
                    {deductionBreakdown.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-sm text-slate-400">No deduction data</div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm lg:col-span-2">
          <h3 className="font-bold text-[#000435] text-sm">Net Salary Comparison</h3>
          <p className="text-xs text-slate-400 mt-0.5 mb-4">Tax net vs bank net by month</p>
          <div className="h-48">
            {trendData.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E4E8F0" />
                  <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => fmtCompact(v)} />
                  <Tooltip content={<ChartTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Line type="monotone" dataKey="taxNet" name="Tax net" stroke={NAVY} strokeWidth={2} />
                  <Line type="monotone" dataKey="bankNet" name="Bank net" stroke="#059669" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-sm text-slate-400">No comparison data</div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
          <h3 className="font-bold text-[#000435] text-sm">Run Status Mix</h3>
          <p className="text-xs text-slate-400 mt-0.5 mb-2">Academic year</p>
          <div className="h-44">
            {piePaid.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={piePaid} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={42} outerRadius={64} paddingAngle={3}>
                    {piePaid.map((_, i) => (
                      <Cell key={i} fill={i === 0 ? "#059669" : AMBER} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-sm text-slate-400">No runs yet</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PayrollReports() {
  const [activeTab, setActiveTab] = useState("tax");
  const [showTableModal, setShowTableModal] = useState(false);
  const [academicYear, setAcademicYear] = useState("");
  const [month, setMonth] = useState(MONTHS[new Date().getMonth()]);
  const [yearOptions, setYearOptions] = useState([]);
  const [availableRuns, setAvailableRuns] = useState([]);
  const [yearRuns, setYearRuns] = useState([]);
  const [selectedRunId, setSelectedRunId] = useState("");
  const [runDetail, setRunDetail] = useState(null);
  const [previewRows, setPreviewRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState("");
  const [isPreview, setIsPreview] = useState(false);
  const [activeTemplate, setActiveTemplate] = useState(null);

  const payrollYear = useMemo(() => toPayrollYear(academicYear, month), [academicYear, month]);
  const payrollMonthNum = useMemo(() => MONTHS.indexOf(month) + 1, [month]);
  const schoolName = getSchoolName();

  useEffect(() => {
    api.get("/dos/academic-calendar-settings")
      .then((res) => {
        if (!res.data?.success) return;
        const parsed = parseManagerAcademicSettings(res.data.data || {});
        const y = parsed.currentYear || String(new Date().getFullYear());
        const years = parsed.years?.length ? parsed.years : [y];
        setYearOptions(years.map((v) => {
          const row = parsed.registry?.find((r) => String(r.academic_year) === String(v));
          return { value: v, label: yearOptionLabel(row) || v };
        }));
        setAcademicYear(y);
      })
      .catch(() => {
        const y = String(new Date().getFullYear());
        setYearOptions([{ value: y, label: y }]);
        setAcademicYear(y);
      });
  }, []);

  const loadPreview = useCallback(async () => {
    const [tplRes, staffRes, empDedRows, terminationPayrolls] = await Promise.all([
      api.get("/accountant/payroll/templates/active").catch(() => null),
      api.get("/accountant/payroll/staff/search", { params: { query: "", limit: 500 } }).catch(() => null),
      getEmployeePayrollDeductions().catch(() => []),
      listTerminationsForPayrollMonth(payrollMonthNum, payrollYear).catch(() => []),
    ]);
    const template = tplRes?.data?.data || null;
    setActiveTemplate(template);
    const staffRaw = Array.isArray(staffRes?.data?.data) ? staffRes.data.data : [];
    const empDeductions = filterPayrollEmployeeDeductions(Array.isArray(empDedRows) ? empDedRows : []);
    const preview = buildPayrollPreviewRows(
      staffRaw,
      template,
      empDeductions,
      {},
      null,
      Array.isArray(terminationPayrolls) ? terminationPayrolls : [],
    );
    const enriched = buildPreviewReportRows(preview.rows, template);
    setPreviewRows(enriched);
    setRunDetail(null);
    setIsPreview(true);
  }, [payrollMonthNum, payrollYear]);

  const loadReport = useCallback(async (runIdOverride = null) => {
    if (!academicYear || !month) return;
    setLoading(true);
    setError("");
    try {
      const [periodRuns, allYearRuns] = await Promise.all([
        getPayrollRuns({ month, year: payrollYear, academicYear, limit: 20 }),
        getPayrollRuns({ academicYear, limit: 50 }),
      ]);
      setAvailableRuns(periodRuns);
      setYearRuns(allYearRuns);

      const pick = (runIdOverride && periodRuns.find((r) => String(r.db_id || r.id) === String(runIdOverride)))
        || periodRuns[0];

      if (!pick) {
        await loadPreview();
        setSelectedRunId("preview");
        return;
      }

      const runId = pick.db_id || pick.id;
      setSelectedRunId(String(runId));
      const [detail, tplRes] = await Promise.all([
        getPayrollRun(runId),
        api.get("/accountant/payroll/templates/active").catch(() => null),
      ]);
      setRunDetail(detail);
      setActiveTemplate(tplRes?.data?.data || null);
      setIsPreview(false);
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to load payroll report.");
      await loadPreview();
      setSelectedRunId("preview");
    } finally {
      setLoading(false);
    }
  }, [academicYear, month, payrollYear, loadPreview]);

  useEffect(() => {
    if (academicYear) loadReport();
  }, [academicYear, month, payrollYear]);

  const reportRows = useMemo(() => {
    if (isPreview) return previewRows;
    if (!runDetail) return [];
    return registerRowsFromRunDetail(runDetail, activeTemplate);
  }, [isPreview, previewRows, runDetail, activeTemplate]);

  const bankColumns = useMemo(
    () => resolveBankReportColumns(reportRows, activeTemplate),
    [reportRows, activeTemplate],
  );

  const taxColumns = useMemo(
    () => resolveTaxReportColumns(reportRows, activeTemplate),
    [reportRows, activeTemplate],
  );

  const analytics = useMemo(() => {
    const base = computeReportAnalytics(reportRows, runDetail);
    const paidRunsCount = yearRuns.filter((r) => isPayrollRunPaid(r.status)).length;
    const processingRunsCount = yearRuns.length - paidRunsCount;
    return { ...base, paidRunsCount, processingRunsCount };
  }, [reportRows, runDetail, yearRuns]);

  const trendData = useMemo(() => {
    const byMonth = new Map();
    for (const run of yearRuns) {
      const m = run.monthLabel || MONTHS[(Number(run.payMonth || 1)) - 1] || "—";
      const short = MONTH_SHORT[MONTHS.indexOf(m)] || m.slice(0, 3);
      byMonth.set(short, {
        month: short,
        gross: Number(run.grossTotal || 0),
        net: Number(run.netTotal || 0),
        taxNet: Number(run.netTotal || 0),
        bankNet: Number(run.disbursementTotal || run.netTotal || 0),
        status: runStatusLabel(run.status),
      });
    }
    return MONTH_SHORT.map((m) => byMonth.get(m) || { month: m, gross: 0, net: 0, taxNet: 0, bankNet: 0 });
  }, [yearRuns]);

  const deductionBreakdown = useMemo(() => {
    if (activeTab === "tax") {
      return [
        { name: "PAYE", amount: analytics.payeTotal },
        { name: "CSR 14%", amount: analytics.csrTotal },
        { name: "RAMA", amount: analytics.ramaTotal },
      ].filter((x) => x.amount > 0);
    }
    return [
      { name: "PAYE", amount: analytics.payeTotal },
      { name: "CSR 14%", amount: analytics.csrTotal },
      { name: "RAMA", amount: analytics.ramaTotal },
      { name: "Mutuelle", amount: analytics.mutuelTotal },
      { name: "Other", amount: analytics.otherDedTotal },
    ].filter((x) => x.amount > 0);
  }, [activeTab, analytics]);

  const taxTotals = useMemo(() => (reportRows.length ? sumTaxReportRows(reportRows) : null), [reportRows]);
  const bankTotals = useMemo(() => (reportRows.length ? sumBankReportRows(reportRows) : null), [reportRows]);

  const runOptions = useMemo(() => {
    const opts = availableRuns.map((r) => ({
      value: String(r.db_id || r.id),
      label: `${r.runNumber || "Run"} · ${runStatusLabel(r.status)} · ${fmtMoney(r.netTotal)} net`,
    }));
    if (!opts.length) opts.push({ value: "preview", label: "Preview (no saved run)" });
    return opts;
  }, [availableRuns]);

  const periodLabel = `PAYROLL ${String(month).toUpperCase()} ${payrollYear} (${academicYear})`;

  const handleExportPdf = async () => {
    setExporting(true);
    try {
      const payload = {
        rows: reportRows,
        schoolName,
        periodLabel,
        runStatus: isPreview ? "Preview" : runStatusLabel(runDetail?.status),
        filename: `${activeTab}-payroll-${month}-${payrollYear}.pdf`,
      };
      if (activeTab === "tax") {
        downloadTaxPayrollReportPdf({ ...payload, totalRow: taxTotals });
      } else {
        downloadBankPayrollReportPdf({ ...payload, totalRow: bankTotals });
      }
    } finally {
      setExporting(false);
    }
  };

  const handleExportExcel = async () => {
    setExporting(true);
    try {
      const payload = {
        rows: reportRows,
        schoolName,
        periodLabel,
        runStatus: isPreview ? "Preview" : runStatusLabel(runDetail?.status),
        filename: `${activeTab}-payroll-${month}-${payrollYear}.xlsx`,
      };
      if (activeTab === "tax") {
        downloadTaxPayrollReportExcel({ ...payload, totalRow: taxTotals });
      } else {
        downloadBankPayrollReportExcel({ ...payload, totalRow: bankTotals });
      }
    } finally {
      setExporting(false);
    }
  };

  const monthOptions = MONTHS;

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-10">
      <AccountantOchreHero
        eyebrow="Payroll"
        titleLine="Payroll"
        titleAccent="Reports"
        subtitle="Tax and bank payroll analytics with register export — filter by academic year and month."
      />

      <div className="max-w-[1600px] mx-auto px-4 lg:px-8 mt-6 space-y-5">
        {/* Tabs — below hero, not overlapping ochre band */}
        <div className="flex flex-wrap gap-2 bg-white rounded-2xl border border-slate-100 p-1.5 shadow-sm">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => { setActiveTab(tab.id); setShowTableModal(false); }}
                className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all
                  ${activeTab === tab.id ? "bg-[#000435] text-white shadow-md" : "text-slate-500 hover:text-[#000435] hover:bg-slate-50"}`}
              >
                <Icon size={16} />
                {tab.label}
              </button>
            );
          })}
        </div>

        <FilterBar
          academicYear={academicYear}
          setAcademicYear={setAcademicYear}
          month={month}
          setMonth={setMonth}
          yearOptions={yearOptions.length ? yearOptions : [{ value: academicYear, label: academicYear }]}
          monthOptions={monthOptions}
          runOptions={runOptions}
          selectedRunId={selectedRunId}
          onRunChange={(v) => {
            setSelectedRunId(v);
            if (v && v !== "preview") loadReport(v);
          }}
          onRefresh={() => loadReport(selectedRunId !== "preview" ? selectedRunId : null)}
          loading={loading}
        />

        {error && (
          <div className="rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-700 flex items-center gap-2">
            <AlertCircle size={16} /> {error}
          </div>
        )}

        <RunStatusBanner
          status={runDetail?.status || "preview"}
          runNumber={runDetail?.runNumber}
          isPreview={isPreview}
        />

        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => setShowTableModal(true)}
            disabled={loading || !reportRows.length}
            className="inline-flex items-center gap-2 bg-[#000435] hover:bg-[#000435]/90 disabled:opacity-50 text-white font-bold text-sm px-5 py-2.5 rounded-xl transition-colors"
          >
            <Eye size={16} />
            View register table
          </button>
          <button
            type="button"
            onClick={handleExportPdf}
            disabled={exporting || !reportRows.length}
            className="inline-flex items-center gap-2 bg-amber-400 hover:bg-amber-500 disabled:opacity-60 text-[#000435] font-bold text-sm px-5 py-2.5 rounded-xl"
          >
            {exporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
            Export PDF
          </button>
          <button
            type="button"
            onClick={handleExportExcel}
            disabled={exporting || !reportRows.length}
            className="inline-flex items-center gap-2 border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-60 text-[#000435] font-bold text-sm px-5 py-2.5 rounded-xl"
          >
            {exporting ? <Loader2 size={16} className="animate-spin" /> : <FileSpreadsheet size={16} />}
            Export Excel
          </button>
          <p className="text-xs text-slate-500 ml-auto">
            {activeTab === "tax"
              ? "Tax view: full register without Mutuelle (CBHI 0.5%) · net = income before Mutuelle"
              : "Bank view: full register with Mutuelle + other deductions · final net = bank payable"}
          </p>
        </div>

        {loading ? (
          <div className="py-20 flex flex-col items-center gap-3 text-slate-400">
            <Loader2 size={32} className="animate-spin text-amber-400" />
            <p className="text-sm font-medium">Loading payroll report…</p>
          </div>
        ) : (
          <AnalyticsPanel
            analytics={analytics}
            trendData={trendData}
            deductionBreakdown={deductionBreakdown}
            tab={activeTab}
          />
        )}

        <RegisterTableModal
          open={showTableModal}
          onClose={() => setShowTableModal(false)}
          title={activeTab === "tax" ? "Tax Payroll Register" : "Bank Payroll Register"}
          subtitle={`${periodLabel} · ${reportRows.length} employees`}
          variant={activeTab}
          rows={reportRows}
          totalRow={activeTab === "tax" ? taxTotals : bankTotals}
          bankColumns={bankColumns}
          taxColumns={taxColumns}
          onExportPdf={handleExportPdf}
          onExportExcel={handleExportExcel}
          exporting={exporting}
        />
      </div>
    </div>
  );
}
