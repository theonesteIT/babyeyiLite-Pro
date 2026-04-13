import { useState, useEffect, useCallback, useMemo } from "react";
import { FileBarChart, Loader2, Filter, AlertCircle } from "lucide-react";

const API = import.meta.env.VITE_API_URL || "http://localhost:5100";
const TERMS = ["Term 1", "Term 2", "Term 3"];
const ACADEMIC_YEARS = ["2023-2024", "2024-2025", "2025-2026", "2026-2027", "2027-2028"];

function fmt(n) {
  if (n === null || n === undefined || Number.isNaN(Number(n))) return "—";
  return Number(n).toLocaleString(undefined, { maximumFractionDigits: 2 });
}

export default function HodReportsPage() {
  const [academicYear, setAcademicYear] = useState("2025-2026");
  const [term, setTerm] = useState("Term 1");
  const [summary, setSummary] = useState(null);
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [studentsMeta, setStudentsMeta] = useState([]);
  const [classFilter, setClassFilter] = useState("");

  const classOptions = useMemo(() => {
    const s = new Set();
    studentsMeta.forEach((st) => {
      if (st.class_name) s.add(st.class_name);
    });
    return Array.from(s).sort();
  }, [studentsMeta]);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API}/api/students?paginate=false&limit=2000`, { credentials: "include" });
        const json = await res.json();
        if (json.success) setStudentsMeta(json.data || []);
      } catch {
        /* ignore */
      }
    })();
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const sp = new URLSearchParams({ academic_year: academicYear, term });
      const [r1, r2] = await Promise.all([
        fetch(`${API}/api/discipline/report-summary?${sp}`, { credentials: "include" }).then((r) => r.json()),
        fetch(`${API}/api/discipline/cases?${sp}${classFilter ? `&class_name=${encodeURIComponent(classFilter)}` : ""}&limit=300`, {
          credentials: "include",
        }).then((r) => r.json()),
      ]);
      if (!r1.success) {
        setError(r1.message || "Report failed");
        setSummary(null);
      } else {
        setSummary(r1.data);
      }
      if (!r2.success) {
        setCases([]);
      } else {
        setCases(r2.data || []);
      }
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }, [academicYear, term, classFilter]);

  useEffect(() => {
    load();
  }, [load]);

  const selectClass =
    "w-full rounded-xl border border-[#FDEAA0] bg-white px-3 py-2.5 text-sm font-semibold text-[#1A1200] focus:ring-2 focus:ring-[#FEBF10]/30";

  return (
    <>
      <div className="mb-6 sm:mb-8">
        <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-[#FFFBE8] px-3 py-1 text-xs font-bold text-[#7A5C00] ring-1 ring-[#FDEAA0]">
          <FileBarChart size={14} className="text-[#B88A00]" />
          Discipline analytics
        </div>
        <h1 className="text-2xl font-black tracking-tight text-[#1A1200] sm:text-3xl">Reports</h1>
        <p className="mt-1 max-w-2xl text-sm text-slate-600">
          Summary for the selected period and a detailed log of discipline cases. Works on small screens — scroll tables
          horizontally if needed.
        </p>
      </div>

      <div className="mb-6 rounded-2xl border border-[#FDEAA0]/80 bg-white p-4 shadow-md sm:p-5">
        <div className="mb-3 flex flex-wrap items-center gap-2 text-xs font-black uppercase tracking-wide text-[#7A5C00]">
          <Filter size={14} /> Filters
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="mb-1 block text-[0.65rem] font-bold uppercase text-slate-500">Academic year</label>
            <select className={selectClass} value={academicYear} onChange={(e) => setAcademicYear(e.target.value)}>
              {ACADEMIC_YEARS.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-[0.65rem] font-bold uppercase text-slate-500">Term</label>
            <select className={selectClass} value={term} onChange={(e) => setTerm(e.target.value)}>
              {TERMS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-[0.65rem] font-bold uppercase text-slate-500">Class</label>
            <select className={selectClass} value={classFilter} onChange={(e) => setClassFilter(e.target.value)}>
              <option value="">All classes</option>
              {classOptions.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <button
              type="button"
              onClick={load}
              disabled={loading}
              className="h-[42px] w-full rounded-xl bg-gradient-to-r from-[#1A1200] to-[#3D2C00] text-sm font-black text-[#FEBF10] disabled:opacity-50"
            >
              {loading ? "Loading…" : "Refresh"}
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-4 flex gap-2 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          <AlertCircle size={18} />
          {error}
        </div>
      )}

      {summary && (
        <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            { label: "Default total", value: fmt(summary.total_marks_default), sub: "marks setting" },
            { label: "Cases logged", value: summary.case_count, sub: "this filter" },
            { label: "Students affected", value: summary.students_affected, sub: "unique" },
            { label: "Marks removed", value: fmt(summary.total_marks_removed), sub: "sum" },
          ].map((c) => (
            <div
              key={c.label}
              className="rounded-2xl border border-[#FDEAA0]/70 bg-[#FFFBE8]/80 p-4 shadow-sm"
            >
              <p className="text-[0.65rem] font-bold uppercase text-[#7A5C00]">{c.label}</p>
              <p className="mt-1 text-2xl font-black text-[#1A1200]">{c.value}</p>
              <p className="text-[10px] font-medium text-slate-500">{c.sub}</p>
            </div>
          ))}
        </div>
      )}

      {summary?.by_class?.length > 0 && (
        <div className="mb-6 rounded-2xl border border-[#FDEAA0]/60 bg-white p-4 shadow-sm sm:p-5">
          <h3 className="mb-3 text-sm font-black text-[#1A1200]">By class</h3>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[280px] text-sm">
              <thead className="text-left text-[0.65rem] font-bold uppercase text-[#7A5C00]">
                <tr>
                  <th className="pb-2 pr-4">Class</th>
                  <th className="pb-2 pr-4">Cases</th>
                  <th className="pb-2">Marks removed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {summary.by_class.map((r) => (
                  <tr key={r.class_name}>
                    <td className="py-2 font-semibold text-[#1A1200]">{r.class_name}</td>
                    <td className="py-2">{r.case_count}</td>
                    <td className="py-2 font-medium">{fmt(r.marks_removed)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="rounded-3xl border border-slate-200/80 bg-white shadow-xl">
        <div className="border-b border-[#FDEAA0]/60 bg-[#FFFBE8]/90 px-4 py-3 sm:px-5">
          <h3 className="font-black text-[#1A1200]">Case log</h3>
          <p className="text-xs text-slate-500">Most recent first</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="bg-[#FFFBE8] text-left text-[0.65rem] font-bold uppercase text-[#7A5C00]">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Student</th>
                <th className="px-4 py-3">Class</th>
                <th className="px-4 py-3">Lesson / case</th>
                <th className="px-4 py-3 text-right">Removed</th>
                <th className="px-4 py-3 text-right">After</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-slate-500">
                    <Loader2 className="mx-auto h-8 w-8 animate-spin text-[#B88A00]" />
                  </td>
                </tr>
              ) : cases.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-slate-500">
                    No cases for this filter.
                  </td>
                </tr>
              ) : (
                cases.map((c) => (
                  <tr key={c.id} className="hover:bg-[#FFFBE8]/50">
                    <td className="whitespace-nowrap px-4 py-2.5 text-xs text-slate-600">
                      {c.created_at ? new Date(c.created_at).toLocaleString() : "—"}
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="font-semibold text-[#1A1200]">
                        {c.first_name} {c.last_name}
                      </div>
                      <div className="font-mono text-[11px] text-slate-500">
                        {c.student_code || c.student_uid}
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-slate-600">{c.class_name || "—"}</td>
                    <td className="max-w-[200px] px-4 py-2.5">
                      <div className="font-medium text-slate-800">{c.lesson_subject}</div>
                      {c.description ? (
                        <div className="line-clamp-2 text-[11px] text-slate-500">{c.description}</div>
                      ) : null}
                    </td>
                    <td className="px-4 py-2.5 text-right font-bold text-[#B88A00]">{fmt(c.marks_deducted)}</td>
                    <td className="px-4 py-2.5 text-right font-semibold text-slate-700">
                      {fmt(c.marks_remaining_after)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
