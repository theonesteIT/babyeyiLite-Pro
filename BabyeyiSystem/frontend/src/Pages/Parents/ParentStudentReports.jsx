import { useCallback, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowLeft, FileText, GraduationCap, Loader2 } from "lucide-react";
import { useMergedParentChildren } from "../../hooks/useMergedParentChildren";
import ParentStudentReportCard from "../../components/Parents/ParentStudentReportCard";

const API = import.meta.env.VITE_API_URL || "";

export default function ParentStudentReports() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { children, loading: childrenLoading } = useMergedParentChildren();
  const [reports, setReports] = useState([]);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const studentId = searchParams.get("student") || "";
  const snapshotId = searchParams.get("report") || "";

  const loadReports = useCallback(async (sid) => {
    if (!sid) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API}/api/parent-portal/student-reports?student_id=${encodeURIComponent(sid)}`, { credentials: "include" });
      const json = await res.json();
      if (!json?.success) {
        setError(json?.message || "Failed to load reports");
        setReports([]);
        return;
      }
      setReports(json.data?.reports || []);
    } catch {
      setError("Failed to load reports");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadReport = useCallback(async (id) => {
    if (!id) { setReport(null); return; }
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/parent-portal/student-reports/${id}`, { credentials: "include" });
      const json = await res.json();
      if (json?.success) setReport(json.data);
      else setError(json?.message || "Report not found");
    } catch {
      setError("Failed to load report");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!studentId && children?.length) {
      const first = children[0];
      setSearchParams({ student: String(first.id || first.student_code || "") }, { replace: true });
    }
  }, [children, studentId, setSearchParams]);

  useEffect(() => {
    if (studentId) loadReports(studentId);
  }, [studentId, loadReports]);

  useEffect(() => {
    if (!studentId || !reports.length) {
      setReport(null);
      return;
    }
    if (!snapshotId) {
      setSearchParams({ student: studentId, report: String(reports[0].snapshot_id) }, { replace: true });
      return;
    }
    loadReport(snapshotId);
  }, [studentId, snapshotId, reports, loadReport, setSearchParams]);

  return (
    <div className="pb-8 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link to="/parents/home" className="p-2 rounded-full border border-slate-200 text-slate-600 hover:bg-slate-50">
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1 className="text-xl font-extrabold text-slate-900">School reports</h1>
          <p className="text-sm text-slate-500">Published report cards from your child&apos;s school</p>
        </div>
      </div>

      {childrenLoading ? (
        <div className="flex justify-center py-16"><Loader2 className="animate-spin text-slate-300" size={32} /></div>
      ) : (
        <>
          <div className="flex flex-wrap gap-2 mb-4">
            {(children || []).map((c) => {
              const id = String(c.id || c.student_code);
              const active = studentId === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setSearchParams({ student: id })}
                  className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-colors ${active ? "bg-[#000435] text-amber-400 border-[#000435]" : "bg-white text-slate-700 border-slate-200 hover:border-amber-300"}`}
                >
                  {c.first_name} {c.last_name}
                </button>
              );
            })}
          </div>

          {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

          {loading && !report ? (
            <div className="flex justify-center py-16"><Loader2 className="animate-spin text-slate-300" /></div>
          ) : reports.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center">
              <GraduationCap className="mx-auto text-slate-300 mb-3" size={40} />
              <p className="text-slate-600 font-medium">No published reports yet</p>
              <p className="text-sm text-slate-400 mt-1">Reports appear here after the school DOS publishes them.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-1 space-y-2">
                {reports.map((r) => (
                  <button
                    key={r.snapshot_id}
                    type="button"
                    onClick={() => setSearchParams({ student: studentId, report: String(r.snapshot_id) })}
                    className={`w-full text-left rounded-xl border p-4 transition-colors ${snapshotId === String(r.snapshot_id) ? "border-amber-400 bg-amber-50/50" : "border-slate-200 bg-white hover:border-slate-300"}`}
                  >
                    <div className="flex items-center gap-2">
                      <FileText size={16} className="text-amber-500 shrink-0" />
                      <div>
                        <p className="text-sm font-semibold text-slate-900 capitalize">{r.report_type?.replace("_", " ")}</p>
                        <p className="text-xs text-slate-500">{r.term} · {r.academic_year}</p>
                      </div>
                    </div>
                    <p className="text-xs text-slate-600 mt-2">Average: <strong>{r.average ?? "—"}%</strong> · Grade {r.grade || "—"}</p>
                  </button>
                ))}
              </div>
              <div className="lg:col-span-2">
                {report ? (
                  <ParentStudentReportCard report={report} school={report.school} />
                ) : (
                  <p className="text-sm text-slate-400 text-center py-12">Select a report</p>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
