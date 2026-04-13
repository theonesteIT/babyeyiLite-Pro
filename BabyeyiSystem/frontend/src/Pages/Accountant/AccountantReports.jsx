import { useState, useEffect, useCallback, useMemo } from "react";
import {
  FileBarChart, Loader2, Filter, CheckCircle2, XCircle, AlertTriangle, HelpCircle,
  FileSpreadsheet, FileText,
} from "lucide-react";

const API = import.meta.env.VITE_API_URL || "http://localhost:5100";

const TERMS = ["Term 1", "Term 2", "Term 3"];
const ACADEMIC_YEARS = ["2023-2024", "2024-2025", "2025-2026", "2026-2027", "2027-2028"];

function formatMoney(n) {
  if (n === null || n === undefined || Number.isNaN(Number(n))) return "—";
  return `${Number(n).toLocaleString()} RWF`;
}

const STATUS_META = {
  full_pay: { label: "Full pay", color: "bg-[#FDEAA0]/50 text-[#1A1200] border border-[#FEBF10]/40", icon: CheckCircle2 },
  full: { label: "No fee (0)", color: "bg-slate-100 text-slate-700", icon: CheckCircle2 },
  not_paid: { label: "Not paid", color: "bg-red-100 text-red-800", icon: XCircle },
  remain_pay: { label: "Remain to pay", color: "bg-[#FFF3CC] text-[#7A5C00] border border-[#FDEAA0]/80", icon: AlertTriangle },
  no_fee_card: { label: "No Babyeyi card", color: "bg-[#FFFBE8] text-[#3D2C00] border border-[#FDEAA0]", icon: HelpCircle },
  unknown: { label: "—", color: "bg-gray-100 text-gray-600", icon: HelpCircle },
};

export default function AccountantReports() {
  const [academicYear, setAcademicYear] = useState("2025-2026");
  const [term, setTerm] = useState("Term 1");
  const [classFilter, setClassFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState(null);
  const [error, setError] = useState(null);
  const [exporting, setExporting] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ academic_year: academicYear, term });
      if (classFilter) params.set("class_name", classFilter);
      const res = await fetch(`${API}/api/accountant/reports/payments?${params}`, {
        credentials: "include",
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.message || "Failed to load report");
        setReport(null);
        return;
      }
      setReport(json.data);
    } catch {
      setError("Cannot reach server");
      setReport(null);
    } finally {
      setLoading(false);
    }
  }, [academicYear, term, classFilter]);

  useEffect(() => {
    load();
  }, [load]);

  const downloadExport = useCallback(
    async (kind) => {
      const params = new URLSearchParams({ academic_year: academicYear, term });
      if (classFilter) params.set("class_name", classFilter);
      const slug = kind === "xlsx" ? "export.xlsx" : "export.pdf";
      setExporting(kind);
      setError(null);
      try {
        const res = await fetch(`${API}/api/accountant/reports/payments/${slug}?${params}`, {
          credentials: "include",
        });
        const ct = res.headers.get("content-type") || "";
        if (!res.ok) {
          if (ct.includes("application/json")) {
            const j = await res.json().catch(() => ({}));
            setError(j.message || "Export failed");
          } else {
            setError("Export failed");
          }
          return;
        }
        const blob = await res.blob();
        const dispo = res.headers.get("Content-Disposition") || "";
        let filename = kind === "xlsx" ? "fee-report.xlsx" : "fee-report.pdf";
        const m = /filename\*=UTF-8''([^;\n]+)|filename="([^"]+)"/i.exec(dispo);
        const raw = m ? decodeURIComponent((m[1] || m[2] || "").trim()) : "";
        if (raw) filename = raw.replace(/^["']|["']$/g, "");
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        a.rel = "noopener";
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
      } catch {
        setError("Cannot download export");
      } finally {
        setExporting(null);
      }
    },
    [academicYear, term, classFilter]
  );

  const classOptions = report?.class_names || [];

  const filteredRows = useMemo(() => {
    const rows = report?.rows || [];
    if (statusFilter === "all") return rows;
    if (statusFilter === "full_pay") {
      return rows.filter((r) => r.status === "full_pay" || r.status === "full");
    }
    return rows.filter((r) => r.status === statusFilter);
  }, [report, statusFilter]);

  const sum = report?.summary;

  return (
    <>
      <div className="mb-6 sm:mb-8">
        <div className="inline-flex items-center gap-2 rounded-full bg-[#FFFBE8] px-3 py-1 text-xs font-bold text-[#7A5C00] ring-1 ring-[#FDEAA0]">
          <FileBarChart size={14} className="text-[#B88A00]" />
          Fee analytics
        </div>
        <h1 className="mt-3 text-2xl font-black tracking-tight text-[#1A1200] sm:text-3xl">Payment report</h1>
        <p className="mt-1 text-sm text-slate-500">
          Filter by academic year and term, export to Excel or PDF, and review payment status.
        </p>
      </div>

      <div className="rounded-3xl border border-[#FDEAA0]/80 bg-white p-4 shadow-xl shadow-[#FDEAA0]/30 sm:p-6">
          <div className="flex flex-wrap items-end gap-4 mb-6">
            <div>
              <label className="block text-[0.65rem] font-bold text-slate-500 uppercase mb-1">Academic year</label>
              <select
                value={academicYear}
                onChange={(e) => setAcademicYear(e.target.value)}
                className="rounded-xl border border-[#FDEAA0] px-3 py-2.5 text-sm font-semibold min-w-[140px]"
              >
                {ACADEMIC_YEARS.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[0.65rem] font-bold text-slate-500 uppercase mb-1">Term</label>
              <select
                value={term}
                onChange={(e) => setTerm(e.target.value)}
                className="rounded-xl border border-[#FDEAA0] px-3 py-2.5 text-sm font-semibold min-w-[120px]"
              >
                {TERMS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[0.65rem] font-bold text-slate-500 uppercase mb-1">Class (optional)</label>
              <select
                value={classFilter}
                onChange={(e) => setClassFilter(e.target.value)}
                className="rounded-xl border border-[#FDEAA0] px-3 py-2.5 text-sm font-semibold min-w-[140px]"
              >
                <option value="">All classes</option>
                {classOptions.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              onClick={load}
              disabled={loading}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#1A1200] to-[#3D2C00] text-[#FEBF10] font-black text-sm hover:opacity-95 disabled:opacity-50"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Filter size={16} />}
              Refresh
            </button>
            <button
              type="button"
              onClick={() => downloadExport("xlsx")}
              disabled={!!exporting || loading}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[#FDEAA0] bg-[#FFFBE8] text-[#3D2C00] font-black text-sm hover:bg-[#FFF3CC] disabled:opacity-50"
            >
              {exporting === "xlsx" ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <FileSpreadsheet size={16} />
              )}
              Excel
            </button>
            <button
              type="button"
              onClick={() => downloadExport("pdf")}
              disabled={!!exporting || loading}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[#B88A00]/40 bg-[#FFF3CC] text-[#1A1200] font-black text-sm hover:bg-[#FDEAA0]/50 disabled:opacity-50"
            >
              {exporting === "pdf" ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <FileText size={16} />
              )}
              PDF
            </button>
          </div>
          <p className="text-[0.7rem] text-slate-500 -mt-2 mb-2">
            Excel and PDF use the same academic year, term, and class filter as above (includes all payment statuses).
          </p>

          {error && (
            <div className="mb-4 rounded-2xl bg-red-50 border border-red-100 px-4 py-3 text-sm font-semibold text-red-700">
              {error}
            </div>
          )}

          {sum && (
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-8">
              <div className="rounded-2xl border border-[#FDEAA0]/80 bg-[#FFFBE8] p-4">
                <div className="text-[0.65rem] font-bold text-[#7A5C00] uppercase">Students</div>
                <div className="text-2xl font-black text-[#1A1200]">{sum.total_students}</div>
              </div>
              <div className="rounded-2xl border border-[#FEBF10]/50 bg-[#FDEAA0]/30 p-4">
                <div className="text-[0.65rem] font-bold text-[#7A5C00] uppercase">Full pay</div>
                <div className="text-2xl font-black text-[#1A1200]">{sum.full_pay}</div>
              </div>
              <div className="rounded-2xl border border-red-100 bg-red-50/80 p-4">
                <div className="text-[0.65rem] font-bold text-red-800 uppercase">Not paid</div>
                <div className="text-2xl font-black text-red-900">{sum.not_paid}</div>
              </div>
              <div className="rounded-2xl border border-amber-100 bg-amber-50/80 p-4">
                <div className="text-[0.65rem] font-bold text-amber-900 uppercase">Remain to pay</div>
                <div className="text-2xl font-black text-amber-950">{sum.remain_pay}</div>
              </div>
              <div className="rounded-2xl border border-[#FDEAA0] bg-[#FFFBE8] p-4 col-span-2 lg:col-span-1">
                <div className="text-[0.65rem] font-bold text-[#7A5C00] uppercase">No Babyeyi</div>
                <div className="text-2xl font-black text-[#1A1200]">{sum.no_fee_card}</div>
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-2 mb-4">
            {[
              { id: "all", label: "All" },
              { id: "full_pay", label: "Full pay" },
              { id: "not_paid", label: "Not paid" },
              { id: "remain_pay", label: "Remain to pay" },
              { id: "no_fee_card", label: "No Babyeyi" },
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setStatusFilter(t.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-black uppercase tracking-wide transition-colors ${
                  statusFilter === t.id
                    ? "bg-gradient-to-r from-[#1A1200] to-[#3D2C00] text-[#FEBF10] shadow-sm shadow-[#1A1200]/15"
                    : "bg-[#FFFBE8] text-[#7A5C00] border border-[#FDEAA0]/60 hover:bg-[#FFF3CC]"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="overflow-x-auto rounded-2xl border border-[#FDEAA0]/60">
            <table className="w-full text-sm">
              <thead className="bg-[#FFFBE8] text-[0.65rem] uppercase font-bold text-[#7A5C00]">
                <tr>
                  <th className="text-left px-4 py-3">Student</th>
                  <th className="text-left px-4 py-3">Code</th>
                  <th className="text-left px-4 py-3">Class</th>
                  <th className="text-right px-4 py-3">Due (Babyeyi)</th>
                  <th className="text-right px-4 py-3">Paid</th>
                  <th className="text-right px-4 py-3">Remain</th>
                  <th className="text-left px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading && (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-slate-500">
                      <Loader2 className="inline animate-spin w-5 h-5 mr-2" />
                      Loading…
                    </td>
                  </tr>
                )}
                {!loading &&
                  filteredRows.map((r) => {
                    const meta = STATUS_META[r.status] || STATUS_META.unknown;
                    const Icon = meta.icon;
                    return (
                      <tr key={r.student_id} className="hover:bg-[#FFFBE8]/80">
                        <td className="px-4 py-3 font-semibold text-[#1A1200]">
                          {r.first_name} {r.last_name}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-slate-600">
                          {r.student_code || r.student_uid}
                        </td>
                        <td className="px-4 py-3 text-slate-600">{r.class_name || "—"}</td>
                        <td className="px-4 py-3 text-right font-medium">{formatMoney(r.total_due)}</td>
                        <td className="px-4 py-3 text-right font-medium text-[#7A5C00]">
                          {formatMoney(r.total_paid)}
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-amber-800">
                          {r.remaining != null ? formatMoney(r.remaining) : "—"}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[0.7rem] font-black ${meta.color}`}
                          >
                            <Icon size={12} />
                            {meta.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                {!loading && filteredRows.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-slate-500">
                      No rows for this filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <p className="mt-4 text-xs text-slate-500 leading-relaxed">
            <strong className="text-slate-700">How it works:</strong> Expected fee comes from the Babyeyi card for each
            student&apos;s class, academic year, and term. Paid amounts are summed from fee records for the same year
            and term. &quot;Remain to pay&quot; is due minus paid when the student has not cleared the full amount.
          </p>
      </div>
    </>
  );
}
