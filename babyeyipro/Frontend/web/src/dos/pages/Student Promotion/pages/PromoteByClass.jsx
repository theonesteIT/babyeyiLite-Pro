import { useEffect, useMemo, useState } from "react";
import {
  CheckSquare, Square, Eye, Download, Printer, Save, ChevronRight,
  Users, AlertTriangle, TrendingUp, CheckCircle, X, User, Check, Loader2,
} from "lucide-react";
import { useStudentPromotionData } from "../context/StudentPromotionDataContext";
import { buildClassNameFromParts } from "../utils/promotionMappers";
import { fetchClassReviewMetrics } from "../services/studentPromotionService";

const statusColors = {
  "Eligible": "bg-green-100 text-green-700 border-green-200",
  "Risky": "bg-amber-100 text-amber-700 border-amber-200",
  "Repeat Recommended": "bg-red-100 text-red-700 border-red-200",
  "Graduating": "bg-purple-100 text-purple-700 border-purple-200",
};

function disciplineFromStudentRow(student) {
  const raw = student._raw || {};
  const marks = raw.discipline_marks;
  if (marks != null && marks !== '' && !Number.isNaN(Number(marks))) {
    return Number(marks);
  }
  return null;
}

function mergeReviewMetrics(student, metrics) {
  const rawDiscipline = disciplineFromStudentRow(student);
  if (!metrics) {
    if (rawDiscipline == null) return student;
    return {
      ...student,
      disciplineRemaining: rawDiscipline,
      discipline: String(rawDiscipline),
      disciplineDeducted: 0,
    };
  }
  const remaining = Number(metrics.discipline_remaining);
  const deducted = Number(metrics.discipline_deducted);
  const total = Number(metrics.discipline_total);
  const morning = metrics.gate_morning_days != null ? Number(metrics.gate_morning_days) : null;
  const evening = metrics.gate_evening_days != null ? Number(metrics.gate_evening_days) : null;
  const pct = metrics.gate_attendance_pct;
  const finalRemaining = Number.isFinite(remaining)
    ? remaining
    : rawDiscipline != null
      ? rawDiscipline
      : null;
  return {
    ...student,
    disciplineRemaining: finalRemaining,
    disciplineDeducted: Number.isFinite(deducted) ? deducted : 0,
    disciplineTotal: Number.isFinite(total) ? total : null,
    discipline: finalRemaining != null ? String(finalRemaining) : student.discipline,
    gateMorning: morning,
    gateEvening: evening,
    attendance: pct != null ? pct : student.attendance,
    hasGateData: metrics != null,
  };
}

const inputCls =
  "w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 bg-gray-50 focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition";
const selectCls = inputCls;

export default function PromoteByClass() {
  const {
    loading,
    groups,
    streams,
    streamsByGroup,
    academicYears,
    terms,
    termsForYear,
    academicYear,
    setAcademicYear,
    term,
    setTerm,
    getStudentsForClass,
    buildDestinationLabel,
    submitPromotion,
  } = useStudentPromotionData();

  const [step, setStep] = useState(1);
  const [currentClass, setCurrentClass] = useState("");
  const [currentStream, setCurrentStream] = useState("");
  const [destClassMode, setDestClassMode] = useState("select");
  const [destClass, setDestClass] = useState("");
  const [destClassManual, setDestClassManual] = useState("");
  const [destStream, setDestStream] = useState("");
  const [promoType, setPromoType] = useState("Normal Promotion");
  const [classStudents, setClassStudents] = useState([]);
  const [reviewMeta, setReviewMeta] = useState(null);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [selected, setSelected] = useState({});
  const [previewStudent, setPreviewStudent] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [promoted, setPromoted] = useState(false);
  const [comments, setComments] = useState({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [loadError, setLoadError] = useState(null);

  const destClassValue = destClassMode === "manual" ? destClassManual.trim() : destClass;

  useEffect(() => {
    if (groups.length && !currentClass) {
      setCurrentClass(groups[0]);
      setDestClass(groups[Math.min(1, groups.length - 1)] || groups[0]);
    }
  }, [groups, currentClass]);

  useEffect(() => {
    const tlist = termsForYear(academicYear);
    if (tlist.length && !tlist.includes(term)) setTerm(tlist[tlist.length - 1]);
  }, [academicYear, termsForYear, term, setTerm]);

  const streamSuggestions = useMemo(() => {
    if (currentClass && streamsByGroup[currentClass]?.length) return streamsByGroup[currentClass];
    return streams;
  }, [currentClass, streams, streamsByGroup]);

  const destStreamSuggestions = useMemo(() => {
    const dc = destClassMode === "manual" ? destClassManual : destClass;
    if (dc && streamsByGroup[dc]?.length) return streamsByGroup[dc];
    return streams;
  }, [destClassMode, destClass, destClassManual, streams, streamsByGroup]);

  const loadStudents = async () => {
    setLoadError(null);
    const streamFilter = currentStream.trim() || "";
    const list = getStudentsForClass(currentClass, streamFilter);
    const sourceClassName = buildClassNameFromParts(currentClass, streamFilter);

    setReviewLoading(true);
    try {
      const { byStudentId, meta } = await fetchClassReviewMetrics({
        academicYear,
        term,
        className: sourceClassName,
        studentIds: list.map((s) => s.id),
      });
      setReviewMeta(meta);
      const enriched = list.map((s) => mergeReviewMetrics(s, byStudentId[s.id]));
      const initial = {};
      enriched.forEach((s) => {
        initial[s.id] = s.status !== "Repeat Recommended";
      });
      setClassStudents(enriched);
      setSelected(initial);
      setStep(2);
      setSaveError(null);
    } catch (e) {
      setLoadError(e.message || "Failed to load discipline and attendance data");
      const initial = {};
      list.forEach((s) => {
        initial[s.id] = s.status !== "Repeat Recommended";
      });
      setClassStudents(list.map((s) => mergeReviewMetrics(s, null)));
      setSelected(initial);
      setStep(2);
    } finally {
      setReviewLoading(false);
    }
  };

  const toggleStudent = (id) => setSelected((p) => ({ ...p, [id]: !p[id] }));
  const selectAll = () => {
    const s = {};
    classStudents.forEach((st) => { s[st.id] = true; });
    setSelected(s);
  };
  const unselectAll = () => {
    const s = {};
    classStudents.forEach((st) => { s[st.id] = false; });
    setSelected(s);
  };
  const markRepeaters = () => {
    const s = {};
    classStudents.forEach((st) => { s[st.id] = st.status === "Eligible"; });
    setSelected(s);
  };

  const handleConfirmPromotion = async () => {
    const promoteIds = classStudents.filter((s) => selected[s.id]).map((s) => s.id);
    const repeaterIds = classStudents.filter((s) => !selected[s.id]).map((s) => s.id);
    const destination = buildDestinationLabel(destClassValue, destStream.trim());
    setSaving(true);
    setSaveError(null);
    try {
      await submitPromotion({
        promoteIds,
        repeaterIds,
        destinationClassName: destination,
        sourceClassName: buildClassNameFromParts(currentClass, currentStream.trim()),
        promotionType: promoType,
        year: academicYear,
        term,
      });
      setShowConfirm(false);
      setPromoted(true);
    } catch (e) {
      setSaveError(e.message || "Failed to save promotion");
    } finally {
      setSaving(false);
    }
  };

  const canLoadStudents = currentClass && destClassValue;

  const selectedCount = Object.values(selected).filter(Boolean).length;
  const repeaterCount = classStudents.length - selectedCount;

  const disciplineColor = (remaining, total) => {
    if (!Number.isFinite(remaining) || !Number.isFinite(total) || total <= 0) return "text-gray-600";
    const pct = (remaining / total) * 100;
    if (pct >= 70) return "text-green-600";
    if (pct >= 40) return "text-amber-600";
    return "text-red-600";
  };

  if (promoted) {
    return (
      <div className="p-6 max-w-2xl mx-auto text-center">
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-12">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle size={40} className="text-green-600" />
          </div>
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">
            Promotion Confirmed!
          </h2>
          <p className="text-gray-500 mb-6">
            {selectedCount} students promoted to {buildDestinationLabel(destClassValue, destStream.trim())}. {repeaterCount} students marked as repeaters.
          </p>
          <div className="flex justify-center gap-3">
            <button type="button" className="flex items-center gap-2 bg-amber-500 text-white px-5 py-2.5 rounded-xl font-semibold text-sm hover:bg-amber-600 transition">
              <Download size={16} /> Download Report
            </button>
            <button
              type="button"
              onClick={() => { setStep(1); setPromoted(false); }}
              className="flex items-center gap-2 bg-gray-100 text-gray-700 px-5 py-2.5 rounded-xl font-semibold text-sm hover:bg-gray-200 transition"
            >
              New Promotion
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto w-full">
      <div className="flex items-center gap-3 mb-6">
        {["Select Class", "Review Students", "Confirm & Promote"].map((label, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all ${step === i + 1 ? "bg-amber-500 text-white shadow-lg shadow-amber-200" : step > i + 1 ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-400"}`}>
              <span>{i + 1}</span>
              <span>{label}</span>
            </div>
            {i < 2 && <ChevronRight size={14} className="text-gray-300" />}
          </div>
        ))}
      </div>

      {step === 1 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-6">
            Select Academic Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Academic Year</label>
              <select value={academicYear} onChange={(e) => setAcademicYear(e.target.value)} className={selectCls}>
                {academicYears.map((o) => <option key={o}>{o}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Term</label>
              <select value={term} onChange={(e) => setTerm(e.target.value)} className={selectCls}>
                {terms.map((o) => <option key={o}>{o}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Current Class</label>
              <select value={currentClass} onChange={(e) => setCurrentClass(e.target.value)} className={selectCls}>
                {groups.map((o) => <option key={o}>{o}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                Current Stream <span className="text-gray-400 font-normal normal-case">(optional)</span>
              </label>
              <input
                type="text"
                list="current-stream-suggestions"
                value={currentStream}
                onChange={(e) => setCurrentStream(e.target.value)}
                placeholder="Leave empty for all streams in class"
                className={inputCls}
              />
              <datalist id="current-stream-suggestions">
                {streamSuggestions.map((o) => <option key={o} value={o} />)}
              </datalist>
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Destination Class</label>
              <div className="flex flex-wrap gap-2 mb-2">
                <button
                  type="button"
                  onClick={() => setDestClassMode("select")}
                  className={`text-[10px] font-bold uppercase px-3 py-1 rounded-lg ${destClassMode === "select" ? "bg-amber-500 text-white" : "bg-gray-100 text-gray-600"}`}
                >
                  Choose from list
                </button>
                <button
                  type="button"
                  onClick={() => setDestClassMode("manual")}
                  className={`text-[10px] font-bold uppercase px-3 py-1 rounded-lg ${destClassMode === "manual" ? "bg-amber-500 text-white" : "bg-gray-100 text-gray-600"}`}
                >
                  Type manual
                </button>
              </div>
              {destClassMode === "select" ? (
                <select value={destClass} onChange={(e) => setDestClass(e.target.value)} className={selectCls}>
                  {groups.map((o) => <option key={o}>{o}</option>)}
                </select>
              ) : (
                <input
                  type="text"
                  value={destClassManual}
                  onChange={(e) => setDestClassManual(e.target.value)}
                  placeholder="e.g. S2 or P5"
                  className={inputCls}
                />
              )}
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                Destination Stream <span className="text-gray-400 font-normal normal-case">(optional)</span>
              </label>
              <input
                type="text"
                list="dest-stream-suggestions"
                value={destStream}
                onChange={(e) => setDestStream(e.target.value)}
                placeholder="Optional — e.g. A, Science"
                className={inputCls}
              />
              <datalist id="dest-stream-suggestions">
                {destStreamSuggestions.map((o) => <option key={o} value={o} />)}
              </datalist>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Promotion Type</label>
              <select value={promoType} onChange={(e) => setPromoType(e.target.value)} className={selectCls}>
                {["Normal Promotion", "Repeat Class", "Graduation", "Conditional Promotion", "Transfer Promotion"].map((o) => (
                  <option key={o}>{o}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="mt-6">
            <button
              type="button"
              disabled={loading || reviewLoading || !canLoadStudents}
              onClick={loadStudents}
              className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white px-6 py-3 rounded-xl font-bold text-sm transition-colors shadow-lg shadow-amber-200"
            >
              {loading || reviewLoading ? <Loader2 size={16} className="animate-spin" /> : null}
              Load Students <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          {loadError && (
            <div className="bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-xl px-4 py-3">
              {loadError} — showing students without live discipline/attendance data.
            </div>
          )}
          {reviewMeta && !loadError && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-[11px] text-slate-600 flex flex-wrap gap-x-4 gap-y-1">
              <span>
                Discipline: max <strong>{reviewMeta.discipline_total}</strong> marks
                {reviewMeta.discipline_default != null && (
                  <> · school default <strong>{reviewMeta.discipline_default}</strong></>
                )}
              </span>
              <span>
                RFID gate ({reviewMeta.date_range?.from} → {reviewMeta.date_range?.to}): morning + evening scans
              </span>
            </div>
          )}

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: "Total Students", value: classStudents.length, icon: Users, color: "text-blue-600", bg: "bg-blue-50" },
              { label: "For Promotion", value: selectedCount, icon: TrendingUp, color: "text-green-600", bg: "bg-green-50" },
              { label: "Repeaters", value: repeaterCount, icon: AlertTriangle, color: "text-amber-600", bg: "bg-amber-50" },
              { label: "Eligible %", value: classStudents.length ? `${Math.round(selectedCount / classStudents.length * 100)}%` : "0%", icon: CheckCircle, color: "text-purple-600", bg: "bg-purple-50" },
            ].map((c) => {
              const Icon = c.icon;
              return (
                <div key={c.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl ${c.bg} flex items-center justify-center`}>
                    <Icon size={18} className={c.color} />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">{c.label}</p>
                    <p className={`text-xl font-semibold ${c.color}`}>{c.value}</p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-wrap gap-2 items-center">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider mr-2">Bulk Actions:</span>
            <button type="button" onClick={selectAll} className="flex items-center gap-1.5 text-xs font-semibold bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-lg transition">
              <CheckSquare size={13} /> Select All
            </button>
            <button type="button" onClick={unselectAll} className="flex items-center gap-1.5 text-xs font-semibold bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-lg transition">
              <Square size={13} /> Unselect All
            </button>
            <button type="button" onClick={markRepeaters} className="flex items-center gap-1.5 text-xs font-semibold bg-red-50 hover:bg-red-100 text-red-700 px-3 py-1.5 rounded-lg transition">
              <AlertTriangle size={13} /> Auto-Mark Repeaters
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[960px]">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="w-10 px-4 py-3 text-left"><input type="checkbox" className="rounded" onChange={() => selectAll()} /></th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Code</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Student Name</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Gender</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Avg Marks</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Gate Attendance</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Discipline Left</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {classStudents.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-4 py-8 text-center text-sm text-gray-400">
                        No students in this class. Choose another class or add students in Student Records.
                      </td>
                    </tr>
                  ) : null}
                  {classStudents.map((student) => {
                    const isSelected = selected[student.id];
                    const rem = student.disciplineRemaining;
                    const total = student.disciplineTotal;
                    return (
                      <tr key={student.id} className={`border-b border-gray-50 hover:bg-gray-50 transition-colors ${!isSelected ? "opacity-60 bg-red-50/30" : ""}`}>
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={!!isSelected}
                            onChange={() => toggleStudent(student.id)}
                            className="rounded accent-amber-500"
                          />
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-400 font-mono">{student.code}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-white text-xs font-bold">
                              {student.name[0]}
                            </div>
                            <span className="font-semibold text-gray-800">{student.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-gray-500">{student.gender}</td>
                        <td className="px-4 py-3">
                          <span className={`font-bold ${typeof student.avgMarks === "number" && student.avgMarks >= 70 ? "text-green-600" : typeof student.avgMarks === "number" && student.avgMarks >= 50 ? "text-amber-600" : "text-gray-600"}`}>
                            {typeof student.avgMarks === "number" ? `${student.avgMarks}%` : student.avgMarks}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {student.hasGateData || student.gateMorning != null ? (
                            <div className="text-xs leading-snug">
                              <div className="font-semibold text-gray-800">
                                {typeof student.attendance === "number" ? `${student.attendance}%` : "0%"}
                              </div>
                              <div className="text-gray-500">
                                AM {student.gateMorning ?? 0} · PM {student.gateEvening ?? 0}
                              </div>
                            </div>
                          ) : (
                            <span className="text-gray-400 text-xs">No RFID scans</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {Number.isFinite(rem) ? (
                            <div className="text-xs leading-snug">
                              <span className={`font-semibold text-base ${disciplineColor(rem, total)}`}>{rem}</span>
                              <span className="text-gray-400"> / {total ?? "—"}</span>
                              {Number.isFinite(student.disciplineDeducted) && student.disciplineDeducted > 0 ? (
                                <div className="text-red-600 font-medium">−{student.disciplineDeducted} from cases</div>
                              ) : (
                                <div className="text-gray-500">from student record</div>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-400 text-xs">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-xs font-bold px-2 py-1 rounded-lg border ${statusColors[student.status] || "bg-gray-100 text-gray-600 border-gray-200"}`}>
                            {student.status}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <button
                            type="button"
                            onClick={() => setPreviewStudent(student)}
                            className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-semibold transition"
                          >
                            <Eye size={13} /> View
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex gap-3">
            <button type="button" onClick={() => setStep(1)} className="text-sm font-semibold text-gray-500 hover:text-gray-700 px-4 py-2.5 rounded-xl border border-gray-200 hover:bg-gray-50 transition">
              ← Back
            </button>
            <button
              type="button"
              onClick={() => setShowConfirm(true)}
              disabled={!destClassValue}
              className="flex items-center gap-2 text-sm font-bold bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white px-6 py-2.5 rounded-xl transition shadow-lg shadow-amber-200 ml-auto"
            >
              Review & Confirm <ChevronRight size={15} />
            </button>
          </div>
        </div>
      )}

      {previewStudent && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden relative">
            <div className="p-6 text-center" style={{ background: "linear-gradient(135deg, #000435, #000a6b)" }}>
              <button type="button" onClick={() => setPreviewStudent(null)} className="absolute top-4 right-4 text-white/60 hover:text-white">
                <X size={20} />
              </button>
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-white text-2xl font-semibold mx-auto mb-3">
                {previewStudent.name[0]}
              </div>
              <h3 className="text-white font-semibold text-lg">{previewStudent.name}</h3>
              <p className="text-white/60 text-sm">{previewStudent.code} · {previewStudent.class} {previewStudent.stream}</p>
            </div>
            <div className="p-6 space-y-3">
              {[
                { label: "Average Marks", value: typeof previewStudent.avgMarks === "number" ? `${previewStudent.avgMarks}%` : previewStudent.avgMarks, color: "text-gray-800" },
                {
                  label: "RFID Gate (term)",
                  value: previewStudent.hasGateData
                    ? `${previewStudent.attendance ?? 0}% · Morning ${previewStudent.gateMorning ?? 0} · Evening ${previewStudent.gateEvening ?? 0}`
                    : "No RFID scans in range",
                  color: "text-gray-800",
                },
                {
                  label: "Discipline remaining",
                  value: Number.isFinite(previewStudent.disciplineRemaining)
                    ? `${previewStudent.disciplineRemaining} / ${previewStudent.disciplineTotal} (${previewStudent.disciplineDeducted || 0} deducted from cases)`
                    : "—",
                  color: disciplineColor(previewStudent.disciplineRemaining, previewStudent.disciplineTotal),
                },
                { label: "Promotion status", value: previewStudent.status, color: "text-amber-600" },
              ].map((row) => (
                <div key={row.label} className="flex items-center justify-between py-2 border-b border-gray-50">
                  <span className="text-sm text-gray-500">{row.label}</span>
                  <span className={`text-sm font-bold text-right max-w-[55%] ${row.color}`}>{row.value}</span>
                </div>
              ))}
              <div className="pt-2">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">DOS Comment</label>
                <textarea
                  className="w-full mt-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-amber-400 resize-none"
                  rows={2}
                  placeholder="Add comment..."
                  value={comments[previewStudent.id] || ""}
                  onChange={(e) => setComments((p) => ({ ...p, [previewStudent.id]: e.target.value }))}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {showConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8">
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Confirm Promotion
            </h3>
            <p className="text-sm text-gray-500 mb-6">Review the summary before final submission. This action cannot be undone.</p>
            <div className="bg-gray-50 rounded-2xl p-5 space-y-3 mb-6">
              <div className="flex justify-between text-sm"><span className="text-gray-500">Students Promoting</span><span className="font-bold text-green-600">{selectedCount}</span></div>
              <div className="flex justify-between text-sm"><span className="text-gray-500">Repeaters</span><span className="font-bold text-amber-600">{repeaterCount}</span></div>
              <div className="flex justify-between text-sm"><span className="text-gray-500">Destination</span><span className="font-bold text-gray-800">{buildDestinationLabel(destClassValue, destStream.trim())}</span></div>
              <div className="flex justify-between text-sm"><span className="text-gray-500">Promotion Type</span><span className="font-bold text-gray-800">{promoType}</span></div>
              <div className="flex justify-between text-sm"><span className="text-gray-500">Academic Year</span><span className="font-bold text-gray-800">{academicYear}</span></div>
            </div>
            {saveError ? <p className="text-sm text-red-600 mb-3">{saveError}</p> : null}
            <div className="flex gap-3">
              <button type="button" onClick={() => setShowConfirm(false)} className="flex-1 text-sm font-semibold text-gray-600 border border-gray-200 py-3 rounded-xl hover:bg-gray-50 transition">
                Cancel
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={handleConfirmPromotion}
                className="flex-1 inline-flex items-center justify-center gap-2 text-sm font-bold bg-amber-500 hover:bg-amber-600 disabled:opacity-60 text-white py-3 rounded-xl transition shadow-lg shadow-amber-200"
              >
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                Confirm Promotion
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
