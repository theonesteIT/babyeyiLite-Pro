/**
 * Academic year & term settings — same API as Pro manager System Configuration → Preferences.
 */
import { useState, useEffect, useCallback } from "react";
import { RefreshCw, Loader2, Plus, Save } from "lucide-react";
import api from "../../../services/api";

const TERM_OPTIONS = ["Term 1", "Term 2", "Term 3"];
const FONT = `"Montserrat", system-ui, sans-serif`;

function emptyTermDates(terms) {
  return terms.map((n) => ({ name: n, start: "", end: "" }));
}

function notifySettingsUpdated() {
  try {
    localStorage.removeItem("babyeyi_academic_settings");
  } catch { /* ignore */ }
  window.dispatchEvent(new CustomEvent("babyeyi-academic-settings-updated"));
}

function formatDate(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return iso;
  }
}

export default function AcademicPreferencesPanel({ toast }) {
  const [registry, setRegistry] = useState([]);
  const [academicYear, setAcademicYear] = useState("");
  const [newYear, setNewYear] = useState("");
  const [activeTerms, setActiveTerms] = useState(TERM_OPTIONS);
  const [termDates, setTermDates] = useState(emptyTermDates(TERM_OPTIONS));
  const [isSaving, setIsSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/dos/academic-calendar-settings");
      if (res.data?.success) {
        const d = res.data.data || {};
        const list = Array.isArray(d.academic_years_registry) ? d.academic_years_registry : [];
        setRegistry(list);
        const current = list.find((r) => r.is_current) || list[0];
        const year = d.current_academic_year || current?.academic_year || "";
        const terms = current?.active_terms?.length ? current.active_terms : TERM_OPTIONS;
        setAcademicYear(year);
        setActiveTerms(terms);
        const saved = current?.term_dates || d.term_dates || [];
        setTermDates(terms.map((n) => saved.find((x) => x.name === n) || { name: n, start: "", end: "" }));
      }
    } catch (e) {
      toast?.(e?.response?.data?.message || "Could not load academic settings", "error");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  const setTermDate = (termName, field, value) => {
    setTermDates((prev) => {
      const idx = prev.findIndex((d) => d.name === termName);
      if (idx === -1) return [...prev, { name: termName, start: field === "start" ? value : "", end: field === "end" ? value : "" }];
      return prev.map((d, i) => (i === idx ? { ...d, [field]: value } : d));
    });
  };

  const handleActiveTermsChange = (checked, term) => {
    const next = checked ? [...new Set([...activeTerms, term])] : activeTerms.filter((x) => x !== term);
    setActiveTerms(next);
    setTermDates((prev) => next.map((n) => prev.find((d) => d.name === n) || { name: n, start: "", end: "" }));
  };

  const selectYearForEdit = (row) => {
    setAcademicYear(row.academic_year);
    setActiveTerms(row.active_terms?.length ? row.active_terms : TERM_OPTIONS);
    setTermDates(
      (row.active_terms || TERM_OPTIONS).map((n) => row.term_dates?.find((x) => x.name === n) || { name: n, start: "", end: "" })
    );
  };

  const handleSaveCurrent = async () => {
    setIsSaving(true);
    try {
      const terms = activeTerms.map((t) => String(t).trim()).filter(Boolean);
      const res = await api.put("/dos/academic-calendar-settings", {
        current_academic_year: academicYear,
        active_terms: terms,
        term_dates: termDates,
      });
      if (res.data?.success) {
        setRegistry(res.data.data?.academic_years_registry || []);
        notifySettingsUpdated();
        toast?.("Current academic year and terms saved.", "success");
      }
    } catch (err) {
      toast?.(err.response?.data?.message || "Failed to save", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleRegisterYear = async () => {
    const y = String(newYear || "").trim();
    if (!/^\d{4}-\d{4}$/.test(y)) {
      toast?.("Enter academic year as YYYY-YYYY (e.g. 2026-2027).", "error");
      return;
    }
    setIsSaving(true);
    try {
      const res = await api.post("/dos/academic-years", {
        academic_year: y,
        active_terms: activeTerms,
        term_dates: termDates,
        set_as_current: false,
      });
      if (res.data?.success) {
        setRegistry(res.data.data?.academic_years_registry || []);
        setNewYear("");
        notifySettingsUpdated();
        toast?.(`Academic year ${y} registered.`, "success");
      }
    } catch (err) {
      toast?.(err.response?.data?.message || "Failed to register year", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSetCurrent = async (year) => {
    try {
      const res = await api.patch(`/dos/academic-years/${encodeURIComponent(year)}/current`);
      if (res.data?.success) {
        const d = res.data.data || {};
        setRegistry(d.academic_years_registry || []);
        setAcademicYear(d.current_academic_year || year);
        notifySettingsUpdated();
        toast?.(`${year} is now the current academic year.`, "success");
        load();
      }
    } catch (err) {
      toast?.(err.response?.data?.message || "Failed to set current year", "error");
    }
  };

  return (
    <div className="flex flex-col gap-4 sm:gap-5" style={{ fontFamily: FONT }}>
      <p className="text-xs sm:text-sm text-slate-500 leading-relaxed m-0">
        Set the <strong className="text-[#000435]">current</strong> academic year and active terms for Babyeyi, attendance, and reports.
        The Babyeyi wizard uses these values by default.
      </p>

      {/* Registry */}
      <section className="rounded-xl border border-slate-200 bg-slate-50/50 p-3 sm:p-4">
        <div className="flex flex-col xs:flex-row xs:items-center justify-between gap-2 mb-3">
          <h5 className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-[#000435] m-0">
            All academic years
          </h5>
          <button
            type="button"
            onClick={load}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 bg-white text-[11px] font-bold text-slate-600 hover:border-amber-300 hover:text-[#000435] transition-colors w-full sm:w-auto"
          >
            <RefreshCw size={12} /> Refresh
          </button>
        </div>

        {loading ? (
          <div className="py-10 flex justify-center">
            <Loader2 size={24} className="animate-spin text-amber-500" />
          </div>
        ) : registry.length === 0 ? (
          <p className="text-center text-slate-500 text-sm py-8 m-0">No academic years yet. Register one below.</p>
        ) : (
          <>
            {/* Mobile cards */}
            <div className="flex flex-col gap-2 sm:hidden">
              {registry.map((row) => (
                <div
                  key={row.academic_year}
                  className={`rounded-xl border p-3 ${
                    row.academic_year === academicYear
                      ? "border-amber-300 bg-amber-50/80"
                      : "border-slate-200 bg-white"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className="font-bold text-[#000435] text-sm">{row.academic_year}</span>
                    {row.is_current ? (
                      <span className="shrink-0 px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[9px] font-black uppercase">
                        Current
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-400 font-semibold">Registered</span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-600 mb-3 m-0">{(row.active_terms || []).join(" · ")}</p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => selectYearForEdit(row)}
                      className="flex-1 min-w-[72px] px-3 py-2 rounded-lg border border-slate-200 bg-white text-[11px] font-bold text-slate-700"
                    >
                      Edit
                    </button>
                    {!row.is_current && (
                      <button
                        type="button"
                        onClick={() => handleSetCurrent(row.academic_year)}
                        className="flex-1 min-w-[72px] px-3 py-2 rounded-lg bg-[#000435] text-amber-400 text-[11px] font-bold"
                      >
                        Set current
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop table */}
            <div className="hidden sm:block overflow-x-auto -mx-1 px-1">
              <table className="w-full min-w-[480px] text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 uppercase text-[9px] tracking-wide">
                    <th className="text-left py-2 px-2 font-bold">Year</th>
                    <th className="text-left py-2 px-2 font-bold">Status</th>
                    <th className="text-left py-2 px-2 font-bold">Terms</th>
                    <th className="text-right py-2 px-2 font-bold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {registry.map((row) => (
                    <tr
                      key={row.academic_year}
                      className={`border-b border-slate-100 ${
                        row.academic_year === academicYear ? "bg-amber-50/60" : ""
                      }`}
                    >
                      <td className="py-2.5 px-2 font-bold text-[#000435]">{row.academic_year}</td>
                      <td className="py-2.5 px-2">
                        {row.is_current ? (
                          <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[9px] font-black uppercase">
                            Current
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[10px] font-semibold">Registered</span>
                        )}
                      </td>
                      <td className="py-2.5 px-2 text-slate-600">{(row.active_terms || []).join(", ")}</td>
                      <td className="py-2.5 px-2 text-right">
                        <div className="flex justify-end gap-1.5 flex-wrap">
                          <button
                            type="button"
                            onClick={() => selectYearForEdit(row)}
                            className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white text-[10px] font-bold text-slate-700 hover:border-amber-300"
                          >
                            Edit
                          </button>
                          {!row.is_current && (
                            <button
                              type="button"
                              onClick={() => handleSetCurrent(row.academic_year)}
                              className="px-2.5 py-1 rounded-lg bg-[#000435] text-amber-400 text-[10px] font-bold"
                            >
                              Set current
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>

      {/* Register year */}
      <section className="rounded-xl border border-dashed border-amber-300/80 bg-amber-50/40 p-3 sm:p-4">
        <h5 className="text-xs font-bold text-[#000435] mb-3 m-0">Register another year</h5>
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 sm:items-end">
          <div className="flex-1 min-w-0">
            <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-500 mb-1">
              New academic year
            </label>
            <input
              value={newYear}
              onChange={(e) => setNewYear(e.target.value)}
              placeholder="2027-2028"
              className="w-full h-11 px-3 rounded-xl border border-slate-200 bg-white text-sm text-[#000435] outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20"
            />
          </div>
          <button
            type="button"
            disabled={isSaving}
            onClick={handleRegisterYear}
            className="w-full sm:w-auto h-11 px-5 inline-flex items-center justify-center gap-2 rounded-xl bg-[#000435] text-amber-400 text-xs font-bold disabled:opacity-60 shrink-0"
          >
            {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
            Add year
          </button>
        </div>
      </section>

      {/* Edit current */}
      <section className="rounded-xl border border-slate-200 bg-white p-3 sm:p-4">
        <h5 className="text-xs font-bold text-[#000435] mb-3 m-0">
          Edit year — {academicYear || "—"}
        </h5>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-500 mb-1">
              Academic year
            </label>
            <input
              value={academicYear}
              onChange={(e) => setAcademicYear(e.target.value)}
              placeholder="2026-2027"
              className="w-full h-11 px-3 rounded-xl border border-slate-200 bg-slate-50 text-sm text-[#000435] outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-500 mb-2">
              Active terms
            </label>
            <div className="flex flex-wrap gap-3">
              {TERM_OPTIONS.map((term) => (
                <label
                  key={term}
                  className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer select-none"
                >
                  <input
                    type="checkbox"
                    className="rounded border-slate-300 text-amber-500 focus:ring-amber-400"
                    checked={activeTerms.includes(term)}
                    onChange={(e) => handleActiveTermsChange(e.target.checked, term)}
                  />
                  {term}
                </label>
              ))}
            </div>
          </div>
        </div>

        {activeTerms.length > 0 && (
          <div className="mt-4 flex flex-col gap-2">
            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500 m-0">Term dates (optional)</p>
            {activeTerms.map((term) => {
              const cfg = termDates.find((d) => d.name === term) || { start: "", end: "" };
              return (
                <div
                  key={term}
                  className="flex flex-col gap-2 p-3 rounded-xl border border-slate-100 bg-slate-50/80 sm:flex-row sm:flex-wrap sm:items-center"
                >
                  <span className="text-[10px] font-black text-[#000435] sm:min-w-[52px]">{term}</span>
                  <input
                    type="date"
                    value={cfg.start}
                    onChange={(e) => setTermDate(term, "start", e.target.value)}
                    className="flex-1 min-w-0 h-10 px-2 rounded-lg border border-slate-200 bg-white text-xs sm:min-w-[130px]"
                  />
                  <span className="hidden sm:inline text-slate-400 text-xs">to</span>
                  <input
                    type="date"
                    value={cfg.end}
                    onChange={(e) => setTermDate(term, "end", e.target.value)}
                    className="flex-1 min-w-0 h-10 px-2 rounded-lg border border-slate-200 bg-white text-xs sm:min-w-[130px]"
                  />
                  {cfg.start && cfg.end && (
                    <span className="text-[10px] text-emerald-700 font-bold sm:ml-auto">
                      {formatDate(cfg.start)} – {formatDate(cfg.end)}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <button
          type="button"
          disabled={isSaving || !academicYear}
          onClick={handleSaveCurrent}
          className="mt-4 w-full sm:w-auto h-11 px-6 inline-flex items-center justify-center gap-2 rounded-xl bg-[#000435] text-amber-400 text-xs font-bold disabled:opacity-50"
        >
          {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          Save & set as current year
        </button>
      </section>
    </div>
  );
}
