import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  Download, Printer, Mail, Eye, FileText, Search,
  CheckCircle, X, FileArchive, Loader2, AlertCircle, Settings2,
} from "lucide-react";
import api from "../../services/api";
import { parseManagerAcademicSettings, yearOptionLabel } from "../../utils/academicCalendarFilters";
import { getPaidPayrollRuns, getPayrollRun, mapLineToPaymentRow } from "../../services/payrollDisbursementService";
import { buildPayslipData, getSchoolInfo } from "../../utils/payslipBuilder";
import { getPayslipBranding, mapPayslipBranding } from "../../services/payslipBrandingService";
import ModernPayslipDocument from "../../components/ModernPayslipDocument";
import { exportPayslipPdf, printPayslip } from "../../utils/exportPayslipPdf";

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

function SelectBox({ label, value, onChange, options }) {
  return (
    <div>
      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full appearance-none border border-slate-200 bg-white rounded-xl px-4 py-2.5 text-sm font-semibold text-[#000435] focus:outline-none focus:ring-2 focus:ring-amber-400 pr-9"
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

function PayslipPreview({ payslip, runMeta, schoolBranding, onClose }) {
  const docRef = useRef(null);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState('');
  const school = useMemo(
    () => schoolBranding || getSchoolInfo(),
    [schoolBranding],
  );
  const data = useMemo(() => buildPayslipData(payslip, runMeta, school), [payslip, runMeta, school]);

  const handleDownload = async () => {
    if (!docRef.current) {
      setExportError('Payslip is still loading. Wait a moment and try again.');
      return;
    }
    setExporting(true);
    setExportError('');
    try {
      const safeId = String(data.employee.id || 'staff').replace(/[^\w-]+/g, '-').slice(0, 40);
      const safeMonth = data.meta.monthLabel.replace(/\s+/g, '-');
      await exportPayslipPdf(docRef.current, `payslip-${safeId}-${safeMonth}.pdf`);
    } catch (e) {
      console.error('[Payslip PDF]', e);
      setExportError(e?.message || 'Failed to generate PDF. Try Print, or check the browser console.');
    } finally {
      setExporting(false);
    }
  };

  const handlePrint = () => {
    if (docRef.current) printPayslip(docRef.current);
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-slate-100 w-full max-w-4xl h-full overflow-y-auto shadow-2xl flex flex-col">
        <div className="sticky top-0 z-10 bg-white border-b border-slate-200 px-5 py-3 flex items-center justify-between">
          <div>
            <p className="font-black text-[#000435]">Payslip Preview</p>
            <p className="text-xs text-slate-400">{payslip?.name} · {data.meta.monthLabel}</p>
          </div>
          <button type="button" onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100 text-slate-500"><X size={18} /></button>
        </div>

        <div className="flex-1 p-4 sm:p-6">
          <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
            <ModernPayslipDocument ref={docRef} data={data} />
          </div>
        </div>

        {exportError && (
          <div className="mx-5 mb-0 rounded-xl px-4 py-2.5 text-xs font-medium bg-red-50 text-red-800 border border-red-100 flex items-start gap-2">
            <AlertCircle size={14} className="shrink-0 mt-0.5" />
            <span>{exportError}</span>
          </div>
        )}
        <div className="sticky bottom-0 bg-white border-t border-slate-200 px-5 py-4 flex gap-2 shadow-[0_-4px_20px_rgba(0,0,0,0.06)]">
          <button type="button" onClick={onClose} className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50">Close</button>
          <button type="button" onClick={handleDownload} disabled={exporting} className="flex-1 flex items-center justify-center gap-2 bg-amber-400 hover:bg-amber-500 disabled:opacity-60 text-[#000435] font-bold text-sm rounded-xl py-2.5">
            {exporting ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
            Download PDF
          </button>
          <button type="button" onClick={handlePrint} className="flex-1 flex items-center justify-center gap-2 border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 py-2.5">
            <Printer size={14} /> Print
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Payslips() {
  const [year, setYear] = useState("");
  const [month, setMonth] = useState(MONTHS[new Date().getMonth()]);
  const [payrollNum, setPayrollNum] = useState("");
  const [dept, setDept] = useState("all");
  const [position, setPosition] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);
  const [payslips, setPayslips] = useState([]);
  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [yearOptions, setYearOptions] = useState([]);
  const [runMeta, setRunMeta] = useState({});
  const [schoolBranding, setSchoolBranding] = useState(null);

  const payrollYear = useMemo(() => toPayrollYear(year), [year]);

  useEffect(() => {
    getPayslipBranding()
      .then(setSchoolBranding)
      .catch(() => {
        setSchoolBranding(mapPayslipBranding({}));
      });
  }, []);

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

  const loadPayslips = useCallback(async () => {
    if (!year) return;
    setLoading(true);
    setError("");
    try {
      const paidRuns = await getPaidPayrollRuns({ month, year: payrollYear, academicYear: year, limit: 50 });
      setRuns(paidRuns);
      const match = paidRuns.find((r) => r.runNumber === payrollNum) || paidRuns[0];
      if (!match) {
        setPayslips([]);
        setPayrollNum("");
        return;
      }
      setPayrollNum(match.runNumber);
      const detail = await getPayrollRun(match.db_id);
      setRunMeta({
        runNumber: detail.runNumber,
        monthLabel: detail.monthLabel,
        payYear: detail.payYear,
        paymentDate: detail.paymentDate,
        paymentMethod: detail.paymentMethod,
        paidAt: detail.paidAt,
        createdAt: detail.created_at,
        status: detail.status || 'paid',
        academicYear: detail.academicYear,
      });
      const rows = (detail?.lines || []).map((line) => {
        const p = mapLineToPaymentRow(line);
        return {
          id: p.id,
          name: p.name,
          dept: p.dept,
          position: line.role || p.dept,
          netSalary: p.finalPayable || p.netSalary,
          status: "generated",
          downloaded: false,
          emailed: false,
          month: `${detail.monthLabel} ${detail.payYear}`,
          detail: { ...p, raw: line },
        };
      });
      setPayslips(rows);
    } catch (e) {
      setPayslips([]);
      setError(e?.response?.data?.message || "Failed to load payslips. Mark a payroll as paid first.");
    } finally {
      setLoading(false);
    }
  }, [year, month, payrollYear, payrollNum]);

  useEffect(() => {
    if (year) loadPayslips();
  }, [year, month, loadPayslips]);

  const payrollOptions = useMemo(() => {
    if (!runs.length) return [{ value: "", label: "No paid payroll" }];
    return runs.map((r) => ({ value: r.runNumber, label: r.runNumber }));
  }, [runs]);

  const departments = useMemo(() => ["all", ...new Set(payslips.map((p) => p.dept).filter(Boolean))], [payslips]);
  const positions = useMemo(() => ["all", ...new Set(payslips.map((p) => p.position).filter(Boolean))], [payslips]);

  const filtered = payslips.filter((p) => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) || String(p.id).includes(search);
    const matchStatus = statusFilter === "all" || p.status === statusFilter;
    const matchDept = dept === "all" || p.dept === dept;
    const matchPos = position === "all" || p.position === position;
    return matchSearch && matchStatus && matchDept && matchPos;
  });

  const stats = {
    total: payslips.length,
    generated: payslips.filter((p) => p.status === "generated").length,
    downloaded: payslips.filter((p) => p.downloaded).length,
    emailed: payslips.filter((p) => p.emailed).length,
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      {/* Header */}
      <div className="bg-white border-b border-slate-100 px-4 lg:px-8 py-4 flex flex-wrap items-center gap-3">
        <div>
          <h1 className="text-[#000435] font-black text-xl">Payslips Management</h1>
          <p className="text-slate-400 text-xs">View, generate, download and manage employee payslips</p>
        </div>
        <div className="ml-auto flex gap-2 flex-wrap">
          <Link
            to="../settings"
            className="flex items-center gap-2 border border-slate-200 text-slate-600 font-semibold text-sm px-4 py-2.5 rounded-xl hover:bg-slate-50"
          >
            <Settings2 size={15} /> Signature & assets
          </Link>
          <button type="button" className="flex items-center gap-2 border border-slate-200 text-slate-600 font-semibold text-sm px-4 py-2.5 rounded-xl hover:bg-slate-50">
            <FileText size={15} /> Generate Payslips
          </button>
          <button className="flex items-center gap-2 border border-slate-200 text-slate-600 font-semibold text-sm px-4 py-2.5 rounded-xl hover:bg-slate-50">
            <FileArchive size={15} /> Download All PDFs
          </button>
          <button className="flex items-center gap-2 bg-amber-400 hover:bg-amber-500 text-[#000435] font-bold text-sm px-4 py-2.5 rounded-xl transition-colors">
            <Mail size={15} /> Email Payslips
          </button>
        </div>
      </div>

      <div className="px-4 lg:px-8 py-6 max-w-7xl mx-auto space-y-6">
        {error && (
          <div className="rounded-xl px-4 py-3 text-sm font-medium flex items-start gap-2 bg-amber-50 text-amber-800 border border-amber-100">
            <AlertCircle size={16} className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
          <p className="font-bold text-[#000435] text-sm mb-4">Filter Payslips</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <SelectBox label="Academic Year" value={year} onChange={setYear} options={yearOptions.length ? yearOptions : [{ value: year, label: year }]} />
            <SelectBox label="Month" value={month} onChange={setMonth} options={MONTHS} />
            <SelectBox label="Payroll No." value={payrollNum} onChange={setPayrollNum} options={payrollOptions} />
            <SelectBox label="Department" value={dept} onChange={setDept} options={departments} />
            <SelectBox label="Position" value={position} onChange={setPosition} options={positions} />
            <SelectBox label="Status" value={statusFilter} onChange={setStatusFilter} options={["all", "generated", "downloaded", "emailed"]} />
          </div>
          <button type="button" onClick={loadPayslips} disabled={loading} className="mt-4 inline-flex items-center gap-2 bg-amber-400 hover:bg-amber-500 disabled:opacity-60 text-[#000435] font-bold text-sm px-4 py-2.5 rounded-xl">
            {loading ? <Loader2 size={14} className="animate-spin" /> : null}
            Load Payslips
          </button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Total Employees", value: stats.total },
            { label: "Payslips Generated", value: stats.generated },
            { label: "Downloaded", value: stats.downloaded },
            { label: "Emailed", value: stats.emailed },
          ].map(({ label, value }) => (
            <div key={label} className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
              <p className="text-2xl font-black text-[#000435]">{value}</p>
              <p className="text-xs text-slate-400 mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        {/* Search */}
        <div className="relative">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search employee…"
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
        </div>

        {/* Payslips Table */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="px-4 py-3 text-left">
                    <input type="checkbox" className="w-4 h-4 rounded border-slate-300 text-amber-400" />
                  </th>
                  {["Employee ID", "Employee Name", "Department", "Position", "Net Salary", "Status", ""].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-400">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr><td colSpan={8} className="px-4 py-8 text-center text-sm text-slate-400"><Loader2 size={16} className="inline animate-spin mr-2" />Loading payslips…</td></tr>
                )}
                {!loading && !filtered.length && (
                  <tr><td colSpan={8} className="px-4 py-8 text-center text-sm text-slate-400">No payslips found. Payslips are generated when payroll is marked as paid.</td></tr>
                )}
                {!loading && filtered.map(p => (
                  <tr key={p.id} className="border-b border-slate-50 hover:bg-amber-50/30 group">
                    <td className="px-4 py-3">
                      <input type="checkbox" className="w-4 h-4 rounded border-slate-300 text-amber-400" />
                    </td>
                    <td className="px-4 py-3 text-xs font-bold text-[#000435]">{p.id}</td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-semibold text-[#000435]">{p.name}</span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">{p.dept}</td>
                    <td className="px-4 py-3 text-xs text-slate-500">{p.position}</td>
                    <td className="px-4 py-3 text-xs font-bold text-[#000435]">{p.netSalary.toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full ${p.status === "generated" ? "bg-green-500" : "bg-amber-500"}`} />
                        <span className="text-xs font-bold text-slate-600 capitalize">{p.status}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                      <button onClick={() => setSelected(p)} className="p-1.5 rounded-lg hover:bg-blue-100 text-slate-400 hover:text-blue-600"><Eye size={13} /></button>
                      <button className="p-1.5 rounded-lg hover:bg-amber-100 text-slate-400 hover:text-amber-600"><Download size={13} /></button>
                      <button className="p-1.5 rounded-lg hover:bg-green-100 text-slate-400 hover:text-green-600"><Mail size={13} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Bulk Actions */}
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex flex-wrap items-center gap-3">
          <CheckCircle size={16} className="text-amber-600" />
          <span className="text-sm font-bold text-amber-700">Select employees above to</span>
          <button className="text-xs bg-white hover:bg-amber-100 text-amber-700 font-bold px-3 py-1.5 rounded-lg border border-amber-300">Download Selected</button>
          <button className="text-xs bg-white hover:bg-amber-100 text-amber-700 font-bold px-3 py-1.5 rounded-lg border border-amber-300">Email Selected</button>
          <button className="text-xs bg-white hover:bg-amber-100 text-amber-700 font-bold px-3 py-1.5 rounded-lg border border-amber-300">Print Selected</button>
        </div>

      </div>

      {/* Payslip Preview */}
      {selected && (
        <PayslipPreview
          payslip={selected}
          runMeta={runMeta}
          schoolBranding={schoolBranding}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}