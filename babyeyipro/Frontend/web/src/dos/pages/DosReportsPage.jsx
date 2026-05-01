import { useState, useEffect, useMemo, useCallback } from "react";
import { FileBarChart, Filter, Loader2, AlertCircle, FileSpreadsheet, FileText } from "lucide-react";
import api from "../services/api";

const TERMS = ["Term 1", "Term 2", "Term 3"];
const ACADEMIC_YEARS = ["2023-2024", "2024-2025", "2025-2026", "2026-2027", "2027-2028"];

function fmt(n) {
  if (n === null || n === undefined || Number.isNaN(Number(n))) return "—";
  return Number(n).toLocaleString(undefined, { maximumFractionDigits: 2 });
}

export default function DosReportsPage() {
  const [academicYear, setAcademicYear] = useState("2025-2026");
  const [term, setTerm] = useState("Term 1");
  const [classFilter, setClassFilter] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [report, setReport] = useState(null);
  const [exporting, setExporting] = useState(null);

  const [studentsMeta, setStudentsMeta] = useState([]);

  const classOptions = useMemo(() => {
    const s = new Set();
    studentsMeta.forEach((st) => {
      if (st.class_name) s.add(st.class_name);
    });
    return Array.from(s).sort();
  }, [studentsMeta]);

  const loadMeta = useCallback(async () => {
    try {
      const { data: json } = await api.get("/students", {
        params: { paginate: false, limit: 3000 },
      });
      if (json.success) setStudentsMeta(json.data || []);
      else setStudentsMeta([]);
    } catch {
      setStudentsMeta([]);
    }
  }, []);

  useEffect(() => {
    loadMeta();
  }, [loadMeta]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = { academic_year: academicYear, term };
      if (classFilter) params.class_name = classFilter;
      const { data: json } = await api.get("/dos/reports/summary", { params });
      if (!json.success) {
        setError(json.message || "Failed to load DOS report");
        setReport(null);
        return;
      }
      setReport(json.data || null);
    } catch (err) {
      setError(err.response?.data?.message || "Cannot reach server");
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
      const params = { academic_year: academicYear, term };
      if (classFilter) params.class_name = classFilter;
      const slug = kind === "xlsx" ? "export.xlsx" : "export.pdf";
      setExporting(kind);
      setError(null);

      try {
        const response = await api.get(`/dos/reports/summary/${slug}`, {
          params,
          responseType: "blob",
        });
        const ct = response.headers["content-type"] || "";
        if (ct.includes("application/json")) {
          const text = await response.data.text();
          const j = JSON.parse(text);
          setError(j.message || "Export failed");
          return;
        }

        const blob = response.data;
        const dispo = response.headers["content-disposition"] || "";
        let filename = kind === "xlsx" ? "dos-report.xlsx" : "dos-report.pdf";
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
      } catch (err) {
        const data = err.response?.data;
        if (data instanceof Blob) {
          try {
            const text = await data.text();
            const j = JSON.parse(text);
            setError(j.message || "Export failed");
          } catch {
            setError("Cannot download export");
          }
        } else {
          setError(err.response?.data?.message || "Cannot download export");
        }
      } finally {
        setExporting(null);
      }
    },
    [academicYear, term, classFilter]
  );

  return (
    <div className="min-h-screen bg-re-bg" style={{ fontFamily: "'Montserrat', sans-serif" }}>
      {/* ── Hero Banner ── */}
      <section className="relative p-7 md:p-10 text-white overflow-hidden min-h-[180px] flex items-center bg-[#000435]">
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full border border-white/5 pointer-events-none" />
        <div className="absolute -top-12 -right-12 w-64 h-64 rounded-full border border-white/5 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-[#FEBF10]/30 to-transparent pointer-events-none" />
        <div className="relative z-10 max-w-5xl w-full">
          <div className="flex items-center gap-2 mb-2">
            <span className="h-0.5 w-6 rounded-full bg-[#FEBF10]" />
            <p className="text-[10px] font-black capitalize tracking-widest text-[#FEBF10]/80">Academic Reports</p>
          </div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight">DOS Reports</h1>
          <p className="text-xs font-bold text-white/60 max-w-xl mt-2">
            Totals by year, term, status &amp; class — filter a period to see counts and marks.
          </p>
        </div>
      </section>

      <div className="max-w-[1500px] mx-auto px-4 md:px-10 py-8 space-y-6">
        <div className="mb-6 sm:mb-8">
          <div className="inline-flex items-center gap-2 rounded-full bg-[#FFFBE8] px-3 py-1 text-xs font-bold text-[#7A5C00] ring-1 ring-[#FDEAA0]">
            <FileBarChart size={14} className="text-[#B88A00]" />
            DOS reports
          </div>
        </div>

      <div className="mb-6 rounded-3xl border border-[#FDEAA0]/80 bg-white p-4 shadow-md shadow-[#FDEAA0]/10 sm:p-6">
        <div className="flex flex-wrap items-end gap-4">
          <div className="min-w-[160px] flex-1">
            <label className="mb-1 block text-[0.65rem] font-bold uppercase text-slate-500">Academic year</label>
            <select
              value={academicYear}
              onChange={(e) => setAcademicYear(e.target.value)}
              className="w-full rounded-xl border border-[#FDEAA0] bg-white px-3 py-2.5 text-sm font-semibold text-[#1A1200] shadow-sm focus:border-[#FEBF10] focus:outline-none focus:ring-2 focus:ring-[#FEBF10]/30"
            >
              {ACADEMIC_YEARS.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

          <div className="min-w-[140px]">
            <label className="mb-1 block text-[0.65rem] font-bold uppercase text-slate-500">Term</label>
            <select
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              className="w-full rounded-xl border border-[#FDEAA0] bg-white px-3 py-2.5 text-sm font-semibold text-[#1A1200] shadow-sm focus:border-[#FEBF10] focus:outline-none focus:ring-2 focus:ring-[#FEBF10]/30"
            >
              {TERMS.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          <div className="min-w-[160px]">
            <label className="mb-1 block text-[0.65rem] font-bold uppercase text-slate-500">Class (optional)</label>
            <select
              value={classFilter}
              onChange={(e) => setClassFilter(e.target.value)}
              className="w-full rounded-xl border border-[#FDEAA0] bg-white px-3 py-2.5 text-sm font-semibold text-[#1A1200] shadow-sm focus:border-[#FEBF10] focus:outline-none focus:ring-2 focus:ring-[#FEBF10]/30"
            >
              <option value="">All classes</option>
              {classOptions.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={load}
            disabled={loading}
            className="h-[42px] px-5 rounded-xl bg-gradient-to-r from-[#1A1200] to-[#3D2C00] text-sm font-black text-[#FEBF10] shadow-sm disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Filter size={16} />}
            Refresh
          </button>

          <button
            type="button"
            onClick={() => downloadExport("xlsx")}
            disabled={!!exporting || loading}
            className="h-[42px] px-4 rounded-xl border border-[#FDEAA0] bg-[#FFFBE8] text-sm font-black text-[#3D2C00] hover:bg-[#FFF3CC] disabled:opacity-50 flex items-center gap-2"
          >
            {exporting === "xlsx" ? <Loader2 size={16} className="animate-spin" /> : <FileSpreadsheet size={16} />}
            Excel
          </button>

          <button
            type="button"
            onClick={() => downloadExport("pdf")}
            disabled={!!exporting || loading}
            className="h-[42px] px-4 rounded-xl border border-[#B88A00]/40 bg-[#FFF3CC] text-sm font-black text-[#1A1200] hover:bg-[#FDEAA0]/50 disabled:opacity-50 flex items-center gap-2"
          >
            {exporting === "pdf" ? <Loader2 size={16} className="animate-spin" /> : <FileText size={16} />}
            PDF
          </button>
        </div>
        <p className="mt-3 text-[0.7rem] text-slate-500">
          Export uses the same academic year, term, and class filter.
        </p>
      </div>

      {error && (
        <div className="mb-4 flex items-start gap-2 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          <AlertCircle size={18} className="shrink-0 mt-0.5" />
          {error}
        </div>
      )}

      {report && (
        <>
          <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[
              { label: "Default total marks", value: fmt(report.total_marks_default) },
              { label: "Students / learners", value: fmt(report.overall?.student_count) },
              { label: "Marks obtained (sum)", value: fmt(report.overall?.marks_obtained_total) },
              { label: "Marks remaining (sum)", value: fmt(report.overall?.marks_remaining_total) },
            ].map((c) => (
              <div key={c.label} className="rounded-2xl border border-[#FDEAA0]/70 bg-[#FFFBE8]/70 p-4 shadow-sm">
                <p className="text-[0.65rem] font-bold uppercase text-[#7A5C00]">{c.label}</p>
                <p className="mt-1 text-2xl font-black text-[#1A1200]">{c.value}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="rounded-3xl border border-slate-200/80 bg-white shadow-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-[#FDEAA0]/60 bg-[#FFFBE8]/90 font-black text-[#1A1200]">
                Totals by status
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[520px]">
                  <thead className="bg-[#FFFBE8] text-[0.65rem] uppercase font-bold text-[#7A5C00]">
                    <tr>
                      <th className="px-4 py-3 text-left">Status</th>
                      <th className="px-4 py-3 text-right">Learners</th>
                      <th className="px-4 py-3 text-right">Marks obtained</th>
                      <th className="px-4 py-3 text-right">Marks remaining</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(report.status_totals || []).map((r) => (
                      <tr key={r.status_code || r.status_label} className="hover:bg-[#FFFBE8]/50">
                        <td className="px-4 py-2.5 font-semibold text-[#1A1200]">{r.status_label}</td>
                        <td className="px-4 py-2.5 text-right font-black text-[#1A1200]">{r.student_count}</td>
                        <td className="px-4 py-2.5 text-right text-[#7A5C00] font-bold">{fmt(r.marks_obtained_total)}</td>
                        <td className="px-4 py-2.5 text-right text-[#B88A00] font-black">{fmt(r.marks_remaining_total)}</td>
                      </tr>
                    ))}
                    {(report.status_totals || []).length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-4 py-10 text-center text-slate-500">No data</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200/80 bg-white shadow-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-[#FDEAA0]/60 bg-[#FFFBE8]/90 font-black text-[#1A1200]">
                Totals by class
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[520px]">
                  <thead className="bg-[#FFFBE8] text-[0.65rem] uppercase font-bold text-[#7A5C00]">
                    <tr>
                      <th className="px-4 py-3 text-left">Class</th>
                      <th className="px-4 py-3 text-right">Learners</th>
                      <th className="px-4 py-3 text-right">Marks obtained</th>
                      <th className="px-4 py-3 text-right">Marks remaining</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(report.class_totals || []).map((r) => (
                      <tr key={r.class_name} className="hover:bg-[#FFFBE8]/50">
                        <td className="px-4 py-2.5 font-semibold text-[#1A1200]">{r.class_name}</td>
                        <td className="px-4 py-2.5 text-right font-black text-[#1A1200]">{r.student_count}</td>
                        <td className="px-4 py-2.5 text-right text-[#7A5C00] font-bold">{fmt(r.marks_obtained_total)}</td>
                        <td className="px-4 py-2.5 text-right text-[#B88A00] font-black">{fmt(r.marks_remaining_total)}</td>
                      </tr>
                    ))}
                    {(report.class_totals || []).length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-4 py-10 text-center text-slate-500">No data</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="mt-6 rounded-3xl border border-slate-200/80 bg-white shadow-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-[#FDEAA0]/60 bg-[#FFFBE8]/90 font-black text-[#1A1200]">
              By class + status (detailed)
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[720px]">
                <thead className="bg-[#FFFBE8] text-[0.65rem] uppercase font-bold text-[#7A5C00]">
                  <tr>
                    <th className="px-4 py-3 text-left">Class</th>
                    <th className="px-4 py-3 text-left">Status</th>
                    <th className="px-4 py-3 text-right">Learners</th>
                    <th className="px-4 py-3 text-right">Marks obtained</th>
                    <th className="px-4 py-3 text-right">Marks remaining</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(report.by_class_status || []).map((r, idx) => (
                    <tr key={`${r.class_name}-${r.status_code || idx}`} className="hover:bg-[#FFFBE8]/50">
                      <td className="px-4 py-2.5 font-semibold text-[#1A1200]">{r.class_name}</td>
                      <td className="px-4 py-2.5 font-semibold text-[#7A5C00]">{r.status_label}</td>
                      <td className="px-4 py-2.5 text-right font-black text-[#1A1200]">{r.student_count}</td>
                      <td className="px-4 py-2.5 text-right text-[#7A5C00] font-bold">{fmt(r.marks_obtained_total)}</td>
                      <td className="px-4 py-2.5 text-right text-[#B88A00] font-black">{fmt(r.marks_remaining_total)}</td>
                    </tr>
                  ))}
                  {(report.by_class_status || []).length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-10 text-center text-slate-500">No data</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {!report && loading && (
        <div className="py-16 text-center text-slate-500">
          <Loader2 className="inline animate-spin w-8 h-8 text-[#B88A00]" /> Loading report…
        </div>
      )}
      </div>
    </div>
  );
}

