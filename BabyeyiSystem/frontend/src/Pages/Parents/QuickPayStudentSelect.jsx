import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, CheckCircle2, Search, UserRound, GraduationCap, Building2, ArrowRight, AlertCircle } from "lucide-react";
import { useMergedParentChildren } from "../../hooks/useMergedParentChildren";
import { normalizeChildForUi } from "../../utils/parentLocalChildren";
import { useAuth } from "../../context/AuthContext";

export default function QuickPayStudentSelect() {
  const navigate = useNavigate();
  const auth = useAuth();
  const { merged, loading, error } = useMergedParentChildren();
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState(null);
  const [draft, setDraft] = useState(null);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("babyeyi_public_pay_draft");
      if (raw) setDraft(JSON.parse(raw));
    } catch {
      setDraft(null);
    }
  }, []);

  const wantedClass = useMemo(() => {
    const raw =
      draft?.pricingSnapshot?.babyeyi?.class_name ||
      (typeof draft?.docLabel === "string" ? draft.docLabel.split("·")[0] : "") ||
      "";
    return String(raw || "").trim().toLowerCase();
  }, [draft]);

  const wantedSchool = useMemo(
    () => String(draft?.schoolName || "").trim().toLowerCase(),
    [draft]
  );

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    const base = (merged || []).map((c) => {
      const u = normalizeChildForUi(c);
      const full = `${u.first_name || ""} ${u.last_name || ""}`.trim();
      const sid = String(u.student_uid || u.student_id || u.id || "");
      const cls = String(u.class_name || u.grade_label || u.displayGrade || "");
      const sch = String(u.school_name || "");
      const classMatch = wantedClass && cls.trim().toLowerCase() === wantedClass;
      const schoolMatch = wantedSchool && sch.trim().toLowerCase() === wantedSchool;
      const score = classMatch ? 2 : 0;
      return { raw: c, ui: u, full, sid, cls, sch, classMatch, schoolMatch, score };
    });
    const filtered = !q
      ? base
      : base.filter((r) =>
          r.full.toLowerCase().includes(q)
          || r.sid.toLowerCase().includes(q)
          || r.cls.toLowerCase().includes(q)
        );
    return filtered.sort((a, b) => b.score - a.score || a.full.localeCompare(b.full));
  }, [merged, search, wantedClass, wantedSchool]);

  const selected = rows.find((r) => String(r.raw?.id) === String(selectedId)) || null;
  const allRows = useMemo(() => {
    return (merged || []).map((c) => {
      const u = normalizeChildForUi(c);
      const cls = String(u.class_name || u.grade_label || u.displayGrade || "");
      const classMatch = wantedClass && cls.trim().toLowerCase() === wantedClass;
      return { raw: c, ui: u, classMatch };
    });
  }, [merged, wantedClass]);
  const classMatchedCount = allRows.filter((r) => r.classMatch).length;
  const hasClassMatch = classMatchedCount > 0;
  const finderHref = draft?.schoolSlug ? `/school/${draft.schoolSlug}#babyeyi` : "/schools";

  const onContinue = () => {
    if (!selected?.raw || !selected?.classMatch) return;
    try {
      sessionStorage.setItem(
        "babyeyi_quickpay_selected_student_id",
        String(selected.raw.id)
      );
    } catch {}
    navigate("/parents/classkit", {
      state: { preselectStudentId: selected.raw.id, fromQuickPay: true },
    });
  };

  if (!draft?.fromPublicFinder) {
    return (
      <div className="min-h-screen bg-slate-50 p-4">
        <div className="max-w-md mx-auto bg-white rounded-3xl border border-slate-200 p-6 text-center">
          <p className="text-sm text-slate-600">No public payment draft found. Start from View &amp; pay first.</p>
          <Link to="/schools" className="inline-flex mt-4 px-4 py-2 rounded-xl bg-orange-500 text-white text-sm font-bold">
            Go to schools
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50 to-white px-4 py-5">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <button
            type="button"
            onClick={() => navigate("/parents/home")}
            className="inline-flex items-center gap-1 text-sm font-bold text-slate-700"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <p className="text-[11px] font-bold text-orange-700">Quick Pay</p>
        </div>

        <div className="bg-white rounded-3xl border border-orange-100 shadow-sm p-4 sm:p-5">
          <h1 className="text-lg sm:text-xl font-black text-slate-900">Select your student</h1>
          <p className="text-sm text-slate-500 mt-1">
            Choose the learner to continue payment. You can search by student ID, name, or class.
          </p>
          <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2">
            <p className="text-[11px] text-emerald-700 font-bold">
              Matched from Public View &amp; Pay: {draft?.docLabel || "Selected document"}
            </p>
          </div>
          {!loading && !error && !hasClassMatch && (
            <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-3">
              <p className="text-sm font-bold text-red-700">
                You don&apos;t have students on this class.
              </p>
              <p className="text-xs text-red-700 mt-1">
                You are not allowed to continue. Select the actual class for your student from Babyeyi Finder.
              </p>
              <a
                href={finderHref}
                className="inline-flex mt-2 px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs font-bold"
              >
                Return to Babyeyi Finder
              </a>
            </div>
          )}

          <div className="relative mt-4">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search student ID, name, class..."
              className="w-full rounded-2xl border border-slate-200 px-9 py-3 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
            />
          </div>

          {loading && <p className="py-10 text-sm text-slate-500 text-center">Loading your students...</p>}
          {!loading && error && <p className="py-8 text-sm text-red-600 text-center">{error}</p>}
          {!loading && !error && rows.length === 0 && (
            <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-center">
              <AlertCircle className="w-5 h-5 text-amber-700 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-900">No Registered Student Found</p>
              <p className="text-xs text-slate-600 mt-1">Complete registration so your students can be linked to your account.</p>
              <Link
                to={`/parents/register${auth.user?.parent_phone ? `?phone=${encodeURIComponent(auth.user.parent_phone)}` : ""}`}
                className="inline-flex mt-3 px-4 py-2 rounded-xl bg-orange-500 text-white text-xs font-bold"
              >
                Go To Registration
              </Link>
            </div>
          )}

          {!loading && !error && rows.length > 0 && (
            <ul className="mt-4 space-y-2.5">
              {rows.map((r) => {
                const active = String(selectedId) === String(r.raw.id);
                return (
                  <li key={r.raw.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(r.raw.id)}
                      className={[
                        "w-full text-left rounded-2xl border px-3 py-3 transition-all",
                        active ? "border-orange-400 bg-orange-50 ring-2 ring-orange-100" : "border-slate-200 bg-white",
                      ].join(" ")}
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl bg-orange-500 text-white flex items-center justify-center font-black shrink-0">
                          {(r.ui.first_name || "?").slice(0, 1)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-black text-slate-900 truncate">{r.full || "Student"}</p>
                          <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
                            <UserRound className="w-3.5 h-3.5" /> ID: {r.sid || "—"}
                          </p>
                          <p className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1">
                            <GraduationCap className="w-3.5 h-3.5" /> {r.cls || "Class not set"}
                          </p>
                          <p className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1">
                            <Building2 className="w-3.5 h-3.5" /> {r.ui.schoolLabel}
                          </p>
                          {r.classMatch && (
                            <span className="inline-flex mt-2 rounded-lg bg-emerald-100 text-emerald-700 text-[10px] font-bold px-2 py-0.5">
                              Suggested match
                            </span>
                          )}
                        </div>
                        {active && <CheckCircle2 className="w-5 h-5 text-orange-500 shrink-0" />}
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          <button
            type="button"
            onClick={onContinue}
            disabled={!selected || !selected.classMatch || !hasClassMatch}
            className="w-full mt-5 rounded-2xl py-3.5 bg-gradient-to-r from-orange-500 to-amber-500 text-white font-black text-sm disabled:opacity-45 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
          >
            Continue To Classkit
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

