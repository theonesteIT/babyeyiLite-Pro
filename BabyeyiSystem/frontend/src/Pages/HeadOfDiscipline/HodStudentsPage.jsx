import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Filter, Loader2, X, AlertCircle, User, GraduationCap, BookOpen, ShieldAlert,
} from "lucide-react";

const API = import.meta.env.VITE_API_URL || "http://localhost:5100";
const TERMS = ["Term 1", "Term 2", "Term 3"];
const ACADEMIC_YEARS = ["2023-2024", "2024-2025", "2025-2026", "2026-2027", "2027-2028"];

function fmtMarks(n) {
  if (n === null || n === undefined || Number.isNaN(Number(n))) return "—";
  return Number(n).toLocaleString(undefined, { maximumFractionDigits: 2 });
}

export default function HodStudentsPage() {
  const [studentsMeta, setStudentsMeta] = useState([]);
  const [loadingMeta, setLoadingMeta] = useState(true);
  const [academicYear, setAcademicYear] = useState("2025-2026");
  const [term, setTerm] = useState("Term 1");
  const [classFilter, setClassFilter] = useState("");
  const [enrolledYear, setEnrolledYear] = useState("");
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loadingList, setLoadingList] = useState(false);
  const [error, setError] = useState(null);

  const [modalStudent, setModalStudent] = useState(null);
  const [lesson, setLesson] = useState("");
  const [description, setDescription] = useState("");
  const [marksRemoved, setMarksRemoved] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);

  const loadMeta = useCallback(async () => {
    setLoadingMeta(true);
    try {
      const res = await fetch(`${API}/api/students?paginate=false&limit=3000`, { credentials: "include" });
      const json = await res.json();
      if (json.success) setStudentsMeta(json.data || []);
      else setStudentsMeta([]);
    } catch {
      setStudentsMeta([]);
    } finally {
      setLoadingMeta(false);
    }
  }, []);

  useEffect(() => {
    loadMeta();
  }, [loadMeta]);

  const classOptions = useMemo(() => {
    const s = new Set();
    studentsMeta.forEach((st) => {
      if (st.class_name) s.add(st.class_name);
    });
    return Array.from(s).sort();
  }, [studentsMeta]);

  const enrolledYearOptions = useMemo(() => {
    const s = new Set();
    studentsMeta.forEach((st) => {
      if (st.academic_year) s.add(st.academic_year);
    });
    return Array.from(s).sort();
  }, [studentsMeta]);

  const loadSummary = useCallback(async () => {
    setLoadingList(true);
    setError(null);
    try {
      const params = new URLSearchParams({ academic_year: academicYear, term });
      if (classFilter) params.set("class_name", classFilter);
      if (enrolledYear) params.set("filter_year", enrolledYear);
      const res = await fetch(`${API}/api/discipline/students-summary?${params}`, { credentials: "include" });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.message || "Failed to load list");
        setRows([]);
        setMeta(null);
        return;
      }
      setRows(json.data || []);
      setMeta(json.meta || null);
    } catch {
      setError("Network error");
      setRows([]);
    } finally {
      setLoadingList(false);
    }
  }, [academicYear, term, classFilter, enrolledYear]);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  const openModal = (st) => {
    setModalStudent(st);
    setLesson("");
    setDescription("");
    setMarksRemoved("");
    setFormError(null);
  };

  const closeModal = () => {
    setModalStudent(null);
  };

  const submitCase = async (e) => {
    e.preventDefault();
    if (!modalStudent) return;
    const m = parseFloat(String(marksRemoved).replace(/,/g, ""));
    if (Number.isNaN(m) || m <= 0) {
      setFormError("Enter a positive marks value to remove.");
      return;
    }
    setSubmitting(true);
    setFormError(null);
    try {
      const res = await fetch(`${API}/api/discipline/cases`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          student_id: modalStudent.id,
          academic_year: academicYear,
          term,
          lesson_subject: lesson.trim(),
          description: description.trim() || undefined,
          marks_deducted: m,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setFormError(json.message || "Could not save");
        return;
      }
      closeModal();
      loadSummary();
    } catch {
      setFormError("Network error");
    } finally {
      setSubmitting(false);
    }
  };

  const selectClass =
    "w-full rounded-xl border border-[#FDEAA0] bg-white px-3 py-2.5 text-sm font-semibold text-[#1A1200] shadow-sm focus:border-[#FEBF10] focus:outline-none focus:ring-2 focus:ring-[#FEBF10]/30";

  return (
    <>
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl font-black tracking-tight text-[#1A1200] sm:text-3xl">Students & discipline</h1>
        <p className="mt-1 max-w-2xl text-sm text-slate-600">
          Filter by class and academic context, then record a case. Remaining marks use your{" "}
          <span className="font-semibold text-[#7A5C00]">Discipline marks</span> default minus deductions this term.
        </p>
      </div>

      <div className="mb-6 rounded-2xl border border-[#FDEAA0]/80 bg-white p-4 shadow-md shadow-[#FDEAA0]/10 sm:p-5">
        <div className="mb-3 flex flex-wrap items-center gap-2 text-xs font-black uppercase tracking-wide text-[#7A5C00]">
          <Filter size={14} /> Filters
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <div>
            <label className="mb-1 block text-[0.65rem] font-bold uppercase text-slate-500">Discipline year</label>
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
          <div>
            <label className="mb-1 block text-[0.65rem] font-bold uppercase text-slate-500">
              Enrolled year <span className="font-normal normal-case text-slate-400">(optional)</span>
            </label>
            <select className={selectClass} value={enrolledYear} onChange={(e) => setEnrolledYear(e.target.value)}>
              <option value="">Any</option>
              {enrolledYearOptions.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <button
              type="button"
              onClick={loadSummary}
              disabled={loadingList}
              className="h-[42px] w-full rounded-xl bg-gradient-to-r from-[#1A1200] to-[#3D2C00] text-sm font-black text-[#FEBF10] shadow-sm transition hover:opacity-95 disabled:opacity-50"
            >
              {loadingList ? "Refreshing…" : "Refresh"}
            </button>
          </div>
        </div>
        {meta && (
          <p className="mt-3 text-[11px] font-semibold text-[#7A5C00]">
            Default cap for this school:{" "}
            <span className="font-black text-[#1A1200]">{fmtMarks(meta.total_marks)}</span> marks · period{" "}
            {meta.academic_year} · {meta.term}
          </p>
        )}
      </div>

      {error && (
        <div className="mb-4 flex items-start gap-2 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          <AlertCircle size={18} className="shrink-0" />
          {error}
        </div>
      )}

      <div className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="border-b border-[#FDEAA0]/60 bg-[#FFFBE8] text-left text-[0.65rem] font-bold uppercase text-[#7A5C00]">
              <tr>
                <th className="px-4 py-3">Code / ID</th>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Class</th>
                <th className="px-4 py-3">Enrolled yr</th>
                <th className="px-4 py-3 text-right">Removed</th>
                <th className="px-4 py-3 text-right">Remaining</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loadingMeta || loadingList ? (
                <tr>
                  <td colSpan={7} className="px-4 py-16 text-center text-slate-500">
                    <Loader2 className="mx-auto mb-2 h-8 w-8 animate-spin text-[#B88A00]" />
                    Loading students…
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-slate-500">
                    No students match these filters.
                  </td>
                </tr>
              ) : (
                rows.map((st) => (
                  <tr key={st.id} className="transition hover:bg-[#FFFBE8]/70">
                    <td className="px-4 py-3 font-mono text-xs text-slate-600">
                      {st.student_code || st.student_uid}
                    </td>
                    <td className="px-4 py-3 font-semibold text-[#1A1200]">
                      {st.first_name} {st.last_name}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{st.class_name || "—"}</td>
                    <td className="px-4 py-3 text-slate-600">{st.academic_year || "—"}</td>
                    <td className="px-4 py-3 text-right font-medium text-slate-700">
                      {fmtMarks(st.discipline_deducted)}
                    </td>
                    <td className="px-4 py-3 text-right font-black text-[#B88A00]">
                      {fmtMarks(st.discipline_remaining)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => openModal(st)}
                        className="inline-flex items-center gap-1 rounded-lg bg-gradient-to-r from-[#1A1200] to-[#3D2C00] px-3 py-1.5 text-[11px] font-black uppercase tracking-wide text-[#FEBF10] shadow-sm active:scale-[0.98] sm:text-xs"
                      >
                        <ShieldAlert size={14} />
                        Discipline
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modalStudent && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/50 p-3 backdrop-blur-sm sm:items-center sm:p-6">
          <button
            type="button"
            className="absolute inset-0 cursor-default border-0 bg-transparent p-0"
            aria-label="Close dialog"
            onClick={closeModal}
          />
          <div className="relative z-10 flex max-h-[min(92vh,640px)] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-[#FDEAA0] bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#FDEAA0]/60 bg-[#FFFBE8] px-4 py-3 sm:px-5">
              <div className="flex items-center gap-2 font-black text-[#1A1200]">
                <GraduationCap className="text-[#B88A00]" size={20} />
                Discipline case
              </div>
              <button type="button" onClick={closeModal} className="rounded-lg p-1.5 text-slate-500 hover:bg-white">
                <X size={22} />
              </button>
            </div>
            <form onSubmit={submitCase} className="flex flex-1 flex-col overflow-y-auto">
              <div className="space-y-3 border-b border-slate-100 bg-slate-50/80 px-4 py-4 sm:px-5">
                <div className="flex items-start gap-2">
                  <User size={16} className="mt-0.5 shrink-0 text-[#B88A00]" />
                  <div>
                    <p className="text-xs font-bold uppercase text-slate-500">Student</p>
                    <p className="font-black text-[#1A1200]">
                      {modalStudent.first_name} {modalStudent.last_name}
                    </p>
                    <p className="font-mono text-[11px] text-slate-600">
                      {modalStudent.student_code || modalStudent.student_uid} · {modalStudent.class_name || "—"}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-xl border border-[#FDEAA0]/60 bg-white px-3 py-2">
                    <span className="text-slate-500">Removed (term)</span>
                    <p className="font-bold text-slate-800">{fmtMarks(modalStudent.discipline_deducted)}</p>
                  </div>
                  <div className="rounded-xl border border-[#FDEAA0]/60 bg-white px-3 py-2">
                    <span className="text-slate-500">Remaining</span>
                    <p className="font-black text-[#B88A00]">{fmtMarks(modalStudent.discipline_remaining)}</p>
                  </div>
                </div>
                <p className="text-[11px] text-slate-500">
                  Period: <strong>{academicYear}</strong> · <strong>{term}</strong>
                </p>
              </div>
              <div className="flex-1 space-y-4 px-4 py-4 sm:px-5">
                {formError && (
                  <div className="flex gap-2 rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">
                    <AlertCircle size={14} className="shrink-0" />
                    {formError}
                  </div>
                )}
                <div>
                  <label className="mb-1 flex items-center gap-1 text-[0.65rem] font-bold uppercase text-slate-500">
                    <BookOpen size={12} /> Case / lesson <span className="text-red-500">*</span>
                  </label>
                  <input
                    required
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-medium focus:border-[#FEBF10] focus:outline-none focus:ring-2 focus:ring-[#FEBF10]/25"
                    placeholder="e.g. Mathematics — disruption"
                    value={lesson}
                    onChange={(e) => setLesson(e.target.value)}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[0.65rem] font-bold uppercase text-slate-500">
                    Description <span className="font-normal normal-case text-slate-400">(optional)</span>
                  </label>
                  <textarea
                    rows={3}
                    className="w-full resize-none rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:border-[#FEBF10] focus:outline-none focus:ring-2 focus:ring-[#FEBF10]/25"
                    placeholder="Brief details…"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[0.65rem] font-bold uppercase text-slate-500">
                    Marks to remove <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    required
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-bold focus:border-[#FEBF10] focus:outline-none focus:ring-2 focus:ring-[#FEBF10]/25"
                    value={marksRemoved}
                    onChange={(e) => setMarksRemoved(e.target.value)}
                  />
                  <p className="mt-1 text-[11px] text-slate-500">
                    New remaining will be calculated automatically (cannot exceed current remaining).
                  </p>
                </div>
              </div>
              <div className="flex flex-col-reverse gap-2 border-t border-slate-100 bg-white p-4 sm:flex-row sm:justify-end sm:px-5">
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-xl bg-gradient-to-r from-[#1A1200] to-[#3D2C00] px-5 py-3 text-sm font-black text-[#FEBF10] shadow-md disabled:opacity-50"
                >
                  {submitting ? "Saving…" : "Save case"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
