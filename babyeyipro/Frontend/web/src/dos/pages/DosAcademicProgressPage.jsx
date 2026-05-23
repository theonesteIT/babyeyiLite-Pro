import { useEffect, useMemo, useState, useCallback } from "react";
import { Filter, Loader2, AlertCircle, ShieldCheck, ChevronLeft, ChevronRight, X, BookOpen } from "lucide-react";
import api from "../services/api";
import DosOrangePageHero, { DosPageBody } from "../components/DosOrangePageHero";

const TERMS = ["Term 1", "Term 2", "Term 3"];
const ACADEMIC_YEARS = ["2023-2024", "2024-2025", "2025-2026", "2026-2027", "2027-2028"];

const STATUS_OPTIONS = [
  { code: "promoted", label: "Promoted" },
  { code: "repeated", label: "Repeated" },
  { code: "second_sitting", label: "Second sitting" },
  { code: "dropped", label: "Dropped" },
  { code: "other", label: "Other" },
];

function visiblePageNumbers(total, cur) {
  if (total <= 1) return [1];
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const set = new Set([1, total, cur, cur - 1, cur + 1]);
  return [...set].filter((n) => n >= 1 && n <= total).sort((a, b) => a - b);
}

function fmt(n) {
  if (n === null || n === undefined || Number.isNaN(Number(n))) return "—";
  return Number(n).toLocaleString(undefined, { maximumFractionDigits: 2 });
}

export default function DosAcademicProgressPage() {
  const [studentsMeta, setStudentsMeta] = useState([]);

  const [academicYear, setAcademicYear] = useState("2025-2026");
  const [term, setTerm] = useState("Term 1");
  const [classFilter, setClassFilter] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [totalMarksDefault, setTotalMarksDefault] = useState(100);

  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(15);
  const [totalPages, setTotalPages] = useState(1);

  const [modalStudent, setModalStudent] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState(null);

  const [statusCode, setStatusCode] = useState("promoted");
  const [otherLabel, setOtherLabel] = useState("");
  const [marksObtained, setMarksObtained] = useState("");
  const [notes, setNotes] = useState("");

  const classOptions = useMemo(() => {
    const s = new Set();
    studentsMeta
      .filter((st) => !academicYear || st.academic_year === academicYear)
      .forEach((st) => {
        if (st.class_name) s.add(st.class_name);
      });
    return Array.from(s).sort();
  }, [studentsMeta, academicYear]);

  const remainingPreview = useMemo(() => {
    const v = parseFloat(String(marksObtained).replace(/,/g, ""));
    const n = Number.isNaN(v) ? null : v;
    if (n === null) return totalMarksDefault;
    return Math.max(0, Number((totalMarksDefault - n).toFixed(2)));
  }, [marksObtained, totalMarksDefault]);

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

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        academic_year: academicYear,
        term,
        page,
        limit,
      };
      if (classFilter) params.class_name = classFilter;

      const { data: json } = await api.get("/dos/progress/students", { params });
      if (!json.success) {
        setError(json.message || "Failed to load progress list");
        setRows([]);
        setTotal(0);
        return;
      }

      setRows(json.data || []);
      setTotal(Number(json.total || 0));
      setTotalPages(Number(json.totalPages || 1));
      setTotalMarksDefault(Number(json.meta?.total_marks_default ?? 100));
    } catch (err) {
      setError(err.response?.data?.message || "Network error");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [academicYear, term, classFilter, page, limit]);

  useEffect(() => {
    loadMeta();
  }, [loadMeta]);

  useEffect(() => {
    setPage(1);
  }, [academicYear, term, classFilter]);

  useEffect(() => {
    load();
  }, [load]);

  const openModal = (st) => {
    setModalStudent(st);
    setFormError(null);
    setStatusCode(st.status_code ? String(st.status_code) : "promoted");
    setOtherLabel(st.status_code === "other" ? (st.status_label && st.status_label !== "Other" ? st.status_label : "") : "");
    setMarksObtained(String(st.marks_obtained ?? ""));
    setNotes(st.notes ? String(st.notes) : "");
  };

  const closeModal = () => {
    if (!saving) setModalStudent(null);
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!modalStudent) return;
    setFormError(null);

    const code = statusCode;
    if (!code) {
      setFormError("Select a status.");
      return;
    }
    const m = parseFloat(String(marksObtained).replace(/,/g, ""));
    if (Number.isNaN(m) || m < 0) {
      setFormError("Enter valid marks obtained.");
      return;
    }
    if (m > totalMarksDefault) {
      setFormError(`Marks obtained cannot exceed ${totalMarksDefault}.`);
      return;
    }
    if (code === "other") {
      const ol = otherLabel.trim();
      if (!ol) {
        setFormError("Enter the other status label.");
        return;
      }
    }

    setSaving(true);
    try {
      const { data: json } = await api.post("/dos/progress", {
        student_id: modalStudent.id,
        academic_year: academicYear,
        term,
        class_name: modalStudent.class_name,
        status_code: code,
        status_label: code === "other" ? otherLabel.trim() : undefined,
        marks_obtained: m,
        notes: notes.trim() || undefined,
      });
      if (!json.success) {
        setFormError(json.message || "Failed to save progress");
        return;
      }
      closeModal();
      await load();
    } catch (err) {
      setFormError(err.response?.data?.message || "Network error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <DosOrangePageHero
        title="Academic progress"
        subtitle="Select year and term, then set each learner’s status and marks. Remaining is calculated from your DOS default total marks."
      />
      <DosPageBody className="-mt-4 sm:-mt-5 md:-mt-6">

      {error && (
        <div className="mb-4 flex items-start gap-2 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          <AlertCircle size={18} className="shrink-0 mt-0.5" />
          {error}
        </div>
      )}

      <div className="mb-6 rounded-2xl border border-[#FDEAA0]/80 bg-white p-4 shadow-md shadow-[#FDEAA0]/10 sm:p-5">
        <div className="flex flex-wrap items-end gap-4">
          <div className="min-w-[160px] flex-1">
            <label className="mb-1 block text-[0.65rem] font-bold uppercase text-slate-500">Academic year</label>
            <select
              value={academicYear}
              onChange={(e) => setAcademicYear(e.target.value)}
              className="w-full rounded-xl border border-[#FDEAA0] bg-white px-3 py-2.5 text-sm font-semibold text-[#1A1200] shadow-sm focus:border-[#FEBF10] focus:outline-none focus:ring-2 focus:ring-[#FEBF10]/30"
            >
              {ACADEMIC_YEARS.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
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
                <option key={t} value={t}>
                  {t}
                </option>
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
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div className="flex-1 min-w-[180px]">
            <div className="mb-1 flex items-center justify-between">
              <span className="text-[0.65rem] font-bold uppercase text-slate-500">Default total</span>
              <span className="text-[0.65rem] font-black text-[#7A5C00]">{fmt(totalMarksDefault)} marks</span>
            </div>
            <div className="w-full rounded-xl border border-[#FDEAA0] bg-[#FFFBE8] px-3 py-2.5 text-sm font-semibold text-[#1A1200]">
              Remaining = total - marks obtained
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200/80 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-[#FDEAA0]/60 bg-[#FFFBE8]/90 px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 font-black text-[#1A1200]">
              <Filter size={16} />
              Learners
            </div>
            <div className="text-[11px] font-semibold text-[#7A5C00]">
              {loading ? "Loading…" : `${total} learners`}
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[760px]">
            <thead className="bg-[#FFFBE8] text-left text-[0.65rem] font-bold uppercase text-[#7A5C00]">
              <tr>
                <th className="px-4 py-3">Code / ID</th>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Class</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Marks</th>
                <th className="px-4 py-3 text-right">Remaining</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-14 text-center text-slate-500">
                    <Loader2 className="inline animate-spin w-6 h-6 text-[#B88A00] mr-2" />
                    Loading learners…
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-14 text-center text-slate-500">
                    No learners found for this filter.
                  </td>
                </tr>
              ) : (
                rows.map((st) => (
                  <tr key={st.id} className="hover:bg-[#FFFBE8]/70">
                    <td className="px-4 py-3 font-mono text-xs text-slate-600">{st.student_code || st.student_uid}</td>
                    <td className="px-4 py-3 font-semibold text-[#1A1200]">
                      {st.first_name} {st.last_name}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{st.class_name || "—"}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 rounded-full border border-[#FDEAA0] bg-[#FFFBE8] px-2 py-1 text-[11px] font-black text-[#7A5C00]">
                        <ShieldCheck size={12} />
                        {st.status_label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-black text-[#B88A00]">{fmt(st.marks_obtained)}</td>
                    <td className="px-4 py-3 text-right font-black text-[#1A1200]">{fmt(st.marks_remaining)}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => openModal(st)}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#1A1200] to-[#3D2C00] px-4 py-2 text-[11px] font-black text-[#FEBF10] shadow-md shadow-[#1A1200]/15 hover:opacity-95 active:scale-[0.99]"
                      >
                        Set status
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {total > 0 && (
          <div className="border-t border-[#FDEAA0]/60 bg-[#FFFBE8]/60 px-4 py-3 flex flex-wrap items-center justify-between gap-3">
            <p className="text-[11px] font-semibold text-[#7A5C00]">
              Showing{" "}
              <span className="font-black text-[#1A1200]">{(page - 1) * limit + 1}</span>–
              <span className="font-black text-[#1A1200]">{Math.min(page * limit, total)}</span> of{" "}
              <span className="font-black text-[#1A1200]">{total}</span>
            </p>
            <div className="flex items-center gap-1">
              <button
                type="button"
                aria-label="Previous page"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[#FDEAA0] bg-white text-[#1A1200] shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeft size={18} />
              </button>
              <div className="flex flex-wrap items-center gap-0.5 px-1">
                {visiblePageNumbers(totalPages, page).map((num, idx, arr) => {
                  const prev = arr[idx - 1];
                  const gap = prev != null && num - prev > 1;
                  return (
                    <span key={num} className="flex items-center gap-0.5">
                      {gap ? <span className="px-1 text-xs font-bold text-[#B88A00]">…</span> : null}
                      <button
                        type="button"
                        onClick={() => setPage(num)}
                        className={`min-w-[2rem] rounded-lg px-2 py-1.5 text-xs font-black transition ${
                          page === num
                            ? "bg-gradient-to-r from-[#1A1200] to-[#3D2C00] text-[#FEBF10] shadow-sm"
                            : "text-[#7A5C00] hover:bg-[#FFF3CC]"
                        }`}
                      >
                        {num}
                      </button>
                    </span>
                  );
                })}
              </div>
              <button
                type="button"
                aria-label="Next page"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[#FDEAA0] bg-white text-[#1A1200] shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        )}
      </div>
      </DosPageBody>

      {modalStudent && (
        <div className="fixed inset-0 z-[200] flex items-end justify-center bg-black/55 p-3 backdrop-blur-sm sm:items-center sm:p-6">
          <div className="fixed inset-0" onClick={closeModal} />
          <div className="relative z-10 w-full max-w-md overflow-hidden rounded-3xl border border-[#FDEAA0] bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-[#FDEAA0]/60 bg-[#FFFBE8] px-4 py-3">
              <div className="flex items-center gap-2 font-black text-[#1A1200]">
                <BookOpen size={18} className="text-[#B88A00]" />
                Update student progress
              </div>
              <button type="button" onClick={closeModal} className="rounded-xl p-1.5 hover:bg-slate-50">
                <X size={22} className="text-slate-600" />
              </button>
            </div>

            <form onSubmit={submit} className="flex flex-col max-h-[92vh]">
              <div className="px-4 py-4 overflow-y-auto">
                {formError && (
                  <div className="mb-3 flex items-start gap-2 rounded-2xl border border-red-100 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
                    <AlertCircle size={16} className="shrink-0 mt-0.5" />
                    {formError}
                  </div>
                )}

                <div className="rounded-2xl border border-[#FDEAA0]/60 bg-[#FFFBE8]/70 px-3 py-3">
                  <div className="font-bold text-[#1A1200]">
                    {modalStudent.first_name} {modalStudent.last_name}
                  </div>
                  <div className="font-mono text-[11px] text-slate-600 mt-0.5">
                    {modalStudent.student_code || modalStudent.student_uid} · {modalStudent.class_name || "—"}
                  </div>
                  <div className="mt-2 flex gap-2">
                    <div className="flex-1 rounded-xl border border-[#FDEAA0]/60 bg-white px-3 py-2">
                      <div className="text-[10px] font-bold uppercase text-slate-500">Total</div>
                      <div className="font-black text-[#1A1200]">{fmt(totalMarksDefault)}</div>
                    </div>
                    <div className="flex-1 rounded-xl border border-[#FDEAA0]/60 bg-white px-3 py-2">
                      <div className="text-[10px] font-bold uppercase text-slate-500">Remaining</div>
                      <div className="font-black text-[#B88A00]">{fmt(remainingPreview)}</div>
                    </div>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-4">
                  <div>
                    <label className="mb-1 block text-[0.65rem] font-bold uppercase text-slate-500">Status</label>
                    <select
                      value={statusCode}
                      onChange={(e) => setStatusCode(e.target.value)}
                      className="w-full rounded-xl border border-[#FDEAA0] bg-white px-3 py-2.5 text-sm font-semibold text-[#1A1200] shadow-sm focus:border-[#FEBF10] focus:outline-none focus:ring-2 focus:ring-[#FEBF10]/30"
                    >
                      {STATUS_OPTIONS.map((s) => (
                        <option key={s.code} value={s.code}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {statusCode === "other" && (
                    <div>
                      <label className="mb-1 block text-[0.65rem] font-bold uppercase text-slate-500">Other status label</label>
                      <input
                        value={otherLabel}
                        onChange={(e) => setOtherLabel(e.target.value)}
                        className="w-full rounded-xl border border-[#FDEAA0] bg-white px-3 py-2.5 text-sm font-semibold text-[#1A1200] shadow-sm focus:border-[#FEBF10] focus:outline-none focus:ring-2 focus:ring-[#FEBF10]/30"
                        placeholder="e.g. Transfer pending"
                      />
                    </div>
                  )}

                  <div>
                    <label className="mb-1 block text-[0.65rem] font-bold uppercase text-slate-500">Marks obtained</label>
                    <input
                      type="number"
                      min={0}
                      max={totalMarksDefault}
                      step={0.01}
                      required
                      value={marksObtained}
                      onChange={(e) => setMarksObtained(e.target.value)}
                      className="w-full rounded-xl border border-[#FDEAA0] bg-white px-3 py-2.5 text-sm font-bold text-[#1A1200] shadow-sm focus:border-[#FEBF10] focus:outline-none focus:ring-2 focus:ring-[#FEBF10]/30"
                    />
                    <p className="mt-1 text-[11px] text-slate-500">Remaining updates automatically from the default total.</p>
                  </div>

                  <div>
                    <label className="mb-1 block text-[0.65rem] font-bold uppercase text-slate-500">Notes (optional)</label>
                    <textarea
                      rows={3}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="w-full rounded-xl border border-[#FDEAA0] bg-white px-3 py-2.5 text-sm font-medium shadow-sm focus:border-[#FEBF10] focus:outline-none focus:ring-2 focus:ring-[#FEBF10]/30"
                      placeholder="Short remark…"
                    />
                  </div>
                </div>
              </div>

              <div className="px-4 py-4 border-t border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2">
                <button type="button" disabled={saving} onClick={closeModal} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50">
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="rounded-xl bg-gradient-to-r from-[#1A1200] to-[#3D2C00] px-5 py-2.5 text-sm font-black text-[#FEBF10] shadow-md shadow-[#1A1200]/15 disabled:opacity-50">
                  {saving ? (
                    <span className="inline-flex items-center gap-2">
                      <Loader2 size={16} className="animate-spin" />
                      Saving…
                    </span>
                  ) : (
                    "Save"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

