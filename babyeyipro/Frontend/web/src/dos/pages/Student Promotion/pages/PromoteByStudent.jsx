import { useCallback, useEffect, useMemo, useState } from "react";
import { Search, User, CheckCircle, ArrowRight, Save, Loader2, RefreshCw } from "lucide-react";
import { useAuth } from "../../../context/AuthContext";
import { useStudentPromotionData } from "../context/StudentPromotionDataContext";
import PromotionShareBar from "../components/PromotionShareBar";
import PromotionPageHero, { PromotionPageBody } from "../components/PromotionPageHero";
import { buildClassNameFromParts, isAllYearTerm } from "../utils/promotionMappers";
import { disciplineColor, mergeReviewMetrics } from "../utils/promotionReviewMetrics";
import { buildStudentPromotionReport } from "../utils/promotionReportPdf";
import { fetchClassReviewMetrics } from "../services/studentPromotionService";

const promoTypes = [
  "Mid-Year Promotion",
  "Exceptional Promotion",
  "Transfer to Another Stream",
  "Demotion",
  "Reinstatement",
  "Normal Promotion",
];

const inputCls =
  "w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 bg-gray-50 focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition";
const selectCls = inputCls;

const statusColors = {
  Eligible: "bg-green-100 text-green-700",
  Risky: "bg-amber-100 text-amber-700",
  "Repeat Recommended": "bg-red-100 text-red-700",
  Graduating: "bg-purple-100 text-purple-700",
};

export default function PromoteByStudent() {
  const { teacher } = useAuth();
  const {
    schoolName,
    groups,
    streams,
    streamsByGroup,
    searchStudents,
    buildDestinationLabel,
    submitPromotion,
    academicYears,
    terms,
    academicYear,
    setAcademicYear,
    term,
    setTerm,
    loading,
    refresh,
    dashboardStats,
  } = useStudentPromotionData();

  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(null);
  const [reviewMeta, setReviewMeta] = useState(null);
  const [metricsLoading, setMetricsLoading] = useState(false);
  const [metricsError, setMetricsError] = useState(null);

  const [newClassMode, setNewClassMode] = useState("select");
  const [newClass, setNewClass] = useState("");
  const [newClassManual, setNewClassManual] = useState("");
  const [newStreamMode, setNewStreamMode] = useState("select");
  const [newStream, setNewStream] = useState("");
  const [newStreamManual, setNewStreamManual] = useState("");

  const [reason, setReason] = useState("Normal Promotion");
  const [done, setDone] = useState(false);
  const [promotionReport, setPromotionReport] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const newClassValue = newClassMode === "manual" ? newClassManual.trim() : newClass;
  const newStreamValue = newStreamMode === "manual" ? newStreamManual.trim() : newStream.trim();
  const destinationLabel = buildDestinationLabel(newClassValue, newStreamValue);

  useEffect(() => {
    if (groups.length && !newClass) {
      setNewClass(groups[Math.min(1, groups.length - 1)] || groups[0]);
    }
  }, [groups, newClass]);

  const streamOpts = useMemo(() => {
    const cls = newClassMode === "manual" ? newClassManual.trim() : newClass;
    if (cls && streamsByGroup[cls]?.length) return streamsByGroup[cls];
    return streams;
  }, [newClass, newClassManual, newClassMode, streams, streamsByGroup]);

  const loadStudentMetrics = useCallback(
    async (student) => {
      if (!student?.id) return;
      setMetricsLoading(true);
      setMetricsError(null);
      setReviewMeta(null);
      try {
        const className =
          student.class_name || buildClassNameFromParts(student.class, student.stream);
        const { byStudentId, meta } = await fetchClassReviewMetrics({
          academicYear,
          term,
          className,
          studentIds: [student.id],
        });
        setReviewMeta(meta);
        const schoolMax = meta?.discipline_total ?? meta?.discipline_default;
        setSelected(mergeReviewMetrics(student, byStudentId[student.id], schoolMax));
      } catch (e) {
        setMetricsError(e.message || "Could not load marks and attendance");
        setSelected(mergeReviewMetrics(student, null, null));
      } finally {
        setMetricsLoading(false);
      }
    },
    [academicYear, term]
  );

  const pickStudent = (s) => {
    setQuery(s.name);
    setSelected(s);
    loadStudentMetrics(s);
  };

  useEffect(() => {
    if (selected?.id) loadStudentMetrics(selected);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [academicYear, term]);

  const filtered = query.length > 1 ? searchStudents(query) : [];

  const canPromote = Boolean(newClassValue);

  const heroStats = useMemo(
    () => [
      { label: "School students", value: String(dashboardStats.total) },
      { label: "Eligible", value: String(dashboardStats.eligible) },
      { label: "Academic year", value: academicYear || "—" },
      { label: "Term", value: term || "—" },
    ],
    [dashboardStats, academicYear, term]
  );

  const handlePromote = async () => {
    if (!selected || !canPromote) return;
    setSaving(true);
    setError(null);
    try {
      await submitPromotion({
        promoteIds: [selected.id],
        repeaterIds: [],
        destinationClassName: destinationLabel,
        sourceClassName: selected.class_name || buildClassNameFromParts(selected.class, selected.stream),
        promotionType: reason,
        year: academicYear,
        term,
      });
      const officerName = teacher
        ? `${teacher.first_name || ""} ${teacher.last_name || ""}`.trim()
        : "";
      setPromotionReport(
        buildStudentPromotionReport({
          schoolName,
          academicYear,
          term,
          promotionType: reason,
          sourceClass:
            selected.class_name || buildClassNameFromParts(selected.class, selected.stream),
          destinationClass: destinationLabel,
          performedBy: officerName,
          student: selected,
        })
      );
      setDone(true);
    } catch (e) {
      setError(e.message || "Promotion failed");
    } finally {
      setSaving(false);
    }
  };

  const rem = selected?.disciplineRemaining;
  const discTotal =
    selected?.disciplineTotal ?? reviewMeta?.discipline_total ?? reviewMeta?.discipline_default;

  if (done) {
    return (
      <div className="p-6 max-w-xl mx-auto">
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-12 text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-5">
            <CheckCircle size={40} className="text-green-600" />
          </div>
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">Student Promoted!</h2>
          <p className="text-gray-500 mb-2">
            {selected?.name} has been moved to {destinationLabel} via {reason}.
          </p>
          <p className="text-xs text-gray-400 mb-6">
            Download or share the promotion report for your records.
          </p>
          <PromotionShareBar report={promotionReport} className="mb-6" />
          <button
            type="button"
            onClick={() => {
              setDone(false);
              setPromotionReport(null);
              setSelected(null);
              setQuery("");
              setReviewMeta(null);
              setMetricsError(null);
            }}
            className="bg-amber-500 text-white px-6 py-2.5 rounded-xl font-bold text-sm hover:bg-amber-600 transition"
          >
            Promote Another Student
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-white animate-in fade-in duration-500">
      <PromotionPageHero
        title="Promote by Student"
        subtitle="Search a learner, review marks and discipline, then move them to a new class or stream."
        heroStats={heroStats}
        onRefresh={refresh}
        refreshing={loading}
      />
      <PromotionPageBody maxWidth="max-w-3xl" className="space-y-5">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h3 className="text-base font-semibold text-gray-800 mb-4">Academic period</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
              Academic Year
            </label>
            <select value={academicYear} onChange={(e) => setAcademicYear(e.target.value)} className={selectCls}>
              {academicYears.map((o) => (
                <option key={o}>{o}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Term</label>
            <select value={term} onChange={(e) => setTerm(e.target.value)} className={selectCls}>
              {terms.map((o) => (
                <option key={o}>{o}</option>
              ))}
            </select>
            <p className="text-[10px] text-gray-400 mt-1.5">All Year combines every term for marks &amp; attendance.</p>
          </div>
        </div>

        <h3 className="text-base font-semibold text-gray-800 mb-4">Search Student</h3>
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            className="w-full pl-9 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition"
            placeholder="Search by name or student ID..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelected(null);
              setReviewMeta(null);
              setMetricsError(null);
            }}
            disabled={loading}
          />
        </div>
        {filtered.length > 0 && !selected && (
          <div className="mt-3 border border-gray-100 rounded-xl overflow-hidden shadow-sm">
            {filtered.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => pickStudent(s)}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-amber-50 transition border-b border-gray-50 last:border-0 text-left"
              >
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                  {s.name[0]}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-800">{s.name}</p>
                  <p className="text-xs text-gray-400">
                    {s.code} · {s.class_name || `${s.class} ${s.stream}`.trim()}
                  </p>
                </div>
                <span
                  className={`text-xs font-bold px-2 py-1 rounded-lg ${statusColors[s.status] || "bg-gray-100 text-gray-600"}`}
                >
                  {s.status}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {selected && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center">
                <User size={22} className="text-amber-600" />
              </div>
              <div>
                <h4 className="font-semibold text-gray-800">{selected.name}</h4>
                <p className="text-xs text-gray-400">
                  {selected.code} · Current: {selected.class_name || `${selected.class} ${selected.stream}`.trim()}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => loadStudentMetrics(selected)}
              disabled={metricsLoading}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-600 border border-gray-200 px-3 py-2 rounded-lg hover:bg-gray-50 disabled:opacity-60"
            >
              <RefreshCw size={14} className={metricsLoading ? "animate-spin" : ""} />
              Refresh
            </button>
          </div>

          {metricsLoading && (
            <div className="flex items-center gap-2 text-sm text-gray-500 py-2">
              <Loader2 size={16} className="animate-spin text-amber-500" />
              Loading marks, discipline, and gate attendance…
            </div>
          )}

          {metricsError && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              {metricsError} — showing basic student record only.
            </div>
          )}

          {reviewMeta && !metricsLoading && (
            <p className="text-[11px] text-slate-600">
              {(reviewMeta.all_year || isAllYearTerm(term)) && (
                <span className="mr-2">
                  Combined <strong>all terms</strong> ·
                </span>
              )}
              Gate scans {reviewMeta.date_range?.from} → {reviewMeta.date_range?.to}
            </p>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
              <p className="text-[10px] font-bold uppercase text-gray-400 tracking-wider">Avg marks</p>
              <p
                className={`text-lg font-bold mt-1 ${
                  typeof selected.avgMarks === "number" && selected.avgMarks >= 70
                    ? "text-green-600"
                    : typeof selected.avgMarks === "number" && selected.avgMarks >= 50
                      ? "text-amber-600"
                      : "text-gray-700"
                }`}
              >
                {typeof selected.avgMarks === "number" ? `${selected.avgMarks}%` : selected.avgMarks ?? "—"}
              </p>
            </div>
            <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
              <p className="text-[10px] font-bold uppercase text-gray-400 tracking-wider">Gate attendance</p>
              {selected.hasGateData || selected.gateMorning != null ? (
                <div className="mt-1">
                  <p className="text-lg font-bold text-gray-800">
                    {typeof selected.attendance === "number" ? `${selected.attendance}%` : "0%"}
                  </p>
                  <p className="text-[10px] text-gray-500">
                    AM {selected.gateMorning ?? 0} · PM {selected.gateEvening ?? 0}
                  </p>
                </div>
              ) : (
                <p className="text-sm text-gray-400 mt-2">No RFID scans</p>
              )}
            </div>
            <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
              <p className="text-[10px] font-bold uppercase text-gray-400 tracking-wider">Discipline left</p>
              {Number.isFinite(rem) ? (
                <div className="mt-1">
                  <p className={`text-lg font-bold ${disciplineColor(rem, discTotal)}`}>
                    {rem}
                    <span className="text-sm text-gray-400 font-semibold"> / {discTotal ?? "—"}</span>
                  </p>
                  {Number.isFinite(selected.disciplineDeducted) && selected.disciplineDeducted > 0 ? (
                    <p className="text-[10px] text-red-600">−{selected.disciplineDeducted} from cases</p>
                  ) : (
                    <p className="text-[10px] text-gray-500">from student record</p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-gray-400 mt-2">—</p>
              )}
            </div>
            <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
              <p className="text-[10px] font-bold uppercase text-gray-400 tracking-wider">Status</p>
              <span
                className={`inline-block mt-2 text-xs font-bold px-2 py-1 rounded-lg ${statusColors[selected.status] || "bg-gray-100 text-gray-600"}`}
              >
                {selected.status}
              </span>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-3">Promotion Details</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                  New Class
                </label>
                <div className="flex flex-wrap gap-2 mb-2">
                  <button
                    type="button"
                    onClick={() => setNewClassMode("select")}
                    className={`text-[10px] font-bold uppercase px-3 py-1 rounded-lg ${newClassMode === "select" ? "bg-amber-500 text-white" : "bg-gray-100 text-gray-600"}`}
                  >
                    Choose from list
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewClassMode("manual")}
                    className={`text-[10px] font-bold uppercase px-3 py-1 rounded-lg ${newClassMode === "manual" ? "bg-amber-500 text-white" : "bg-gray-100 text-gray-600"}`}
                  >
                    Type manual
                  </button>
                </div>
                {newClassMode === "select" ? (
                  <select value={newClass} onChange={(e) => setNewClass(e.target.value)} className={selectCls}>
                    {groups.map((o) => (
                      <option key={o}>{o}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={newClassManual}
                    onChange={(e) => setNewClassManual(e.target.value)}
                    placeholder="e.g. S2 or TOP"
                    className={inputCls}
                  />
                )}
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                  New Stream <span className="text-gray-400 font-normal normal-case">(optional)</span>
                </label>
                <div className="flex flex-wrap gap-2 mb-2">
                  <button
                    type="button"
                    onClick={() => setNewStreamMode("select")}
                    className={`text-[10px] font-bold uppercase px-3 py-1 rounded-lg ${newStreamMode === "select" ? "bg-amber-500 text-white" : "bg-gray-100 text-gray-600"}`}
                  >
                    Choose / suggest
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewStreamMode("manual")}
                    className={`text-[10px] font-bold uppercase px-3 py-1 rounded-lg ${newStreamMode === "manual" ? "bg-amber-500 text-white" : "bg-gray-100 text-gray-600"}`}
                  >
                    Type manual
                  </button>
                </div>
                {newStreamMode === "select" ? (
                  <>
                    <input
                      type="text"
                      list="student-promo-stream-suggestions"
                      value={newStream}
                      onChange={(e) => setNewStream(e.target.value)}
                      placeholder="Leave empty if not needed — e.g. A, Science"
                      className={inputCls}
                    />
                    <datalist id="student-promo-stream-suggestions">
                      {streamOpts.map((o) => (
                        <option key={o} value={o} />
                      ))}
                    </datalist>
                  </>
                ) : (
                  <input
                    type="text"
                    value={newStreamManual}
                    onChange={(e) => setNewStreamManual(e.target.value)}
                    placeholder="Type stream manually (optional)"
                    className={inputCls}
                  />
                )}
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                  Promotion Type
                </label>
                <select value={reason} onChange={(e) => setReason(e.target.value)} className={selectCls}>
                  {promoTypes.map((o) => (
                    <option key={o}>{o}</option>
                  ))}
                </select>
              </div>
            </div>

            {destinationLabel && (
              <p className="text-xs text-gray-500 mt-3">
                Destination: <strong className="text-gray-800">{destinationLabel}</strong>
              </p>
            )}
          </div>

          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          {!canPromote && (
            <p className="text-sm text-amber-700">Enter a destination class before promoting.</p>
          )}

          <button
            type="button"
            disabled={saving || !canPromote || metricsLoading}
            onClick={handlePromote}
            className="w-full flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-60 text-white font-bold py-3 rounded-xl transition shadow-lg shadow-amber-200"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            Confirm Promotion <ArrowRight size={15} />
          </button>
        </div>
      )}

      {!selected && !loading && (
        <div className="text-center py-12">
          <User size={40} className="text-gray-200 mx-auto mb-3" />
          <p className="text-sm text-gray-400">Search for a student above to begin individual promotion</p>
        </div>
      )}
      </PromotionPageBody>
    </div>
  );
}
