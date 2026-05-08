import { useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Search, CheckCircle2, UserRound, GraduationCap, Building2, Plus } from "lucide-react";
import { useMergedParentChildren } from "../../hooks/useMergedParentChildren";
import { normalizeChildForUi } from "../../utils/parentLocalChildren";
import AddChildModal from "../../components/Parents/AddChildModal";

function serviceMeta(kind) {
  if (kind === "uniform") {
    return {
      title: "Uniform Voucher",
      route: "/services/uniform-voucher/request",
      cta: "Continue to Uniform Voucher",
    };
  }
  return {
    title: "Shoes Voucher",
    route: "/services/shoes-voucher",
    cta: "Continue to Shoes Voucher",
  };
}

export default function ServiceStudentSelect() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const kind = String(searchParams.get("service") || "shoes").toLowerCase() === "uniform" ? "uniform" : "shoes";
  const meta = serviceMeta(kind);
  const { merged, loading, error, refreshLocal } = useMergedParentChildren();
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState(null);
  const [addOpen, setAddOpen] = useState(false);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    const base = (merged || []).map((c) => {
      const u = normalizeChildForUi(c);
      const full = `${u.first_name || ""} ${u.last_name || ""}`.trim();
      const sid = String(u.student_uid || u.student_code || u.sdm_code || u.id || "");
      return { raw: c, ui: u, full, sid };
    });
    if (!q) return base;
    return base.filter((r) => r.full.toLowerCase().includes(q) || r.sid.toLowerCase().includes(q));
  }, [merged, search]);

  const selected = rows.find((r) => String(r.raw?.id) === String(selectedId)) || null;
  const selectedCode = String(
    selected?.ui?.student_code || selected?.ui?.student_uid || selected?.ui?.sdm_code || selected?.raw?.student_code || "",
  ).trim();

  const onContinue = () => {
    if (!selectedCode) return;
    const qs = new URLSearchParams();
    qs.set("code", selectedCode);
    navigate(`${meta.route}?${qs.toString()}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50 to-white px-4 py-5">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <button
            type="button"
            onClick={() => navigate("/parents/services")}
            className="inline-flex items-center gap-1 text-sm font-bold text-slate-700"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <p className="text-[11px] font-bold text-orange-700">{meta.title}</p>
        </div>

        <div className="bg-white rounded-3xl border border-orange-100 shadow-sm p-4 sm:p-5">
          <h1 className="text-lg sm:text-xl font-black text-slate-900">Select your student</h1>
          <p className="text-sm text-slate-500 mt-1">
            Choose a registered student to start {meta.title}. You can also add a child first.
          </p>

          <div className="mt-4 flex justify-end">
            <button
              type="button"
              onClick={() => setAddOpen(true)}
              className="inline-flex items-center gap-1.5 text-sm font-bold text-orange-600"
            >
              <Plus size={18} strokeWidth={2.5} />
              Add child
            </button>
          </div>

          <div className="relative mt-3">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search student ID or name..."
              className="w-full rounded-2xl border border-slate-200 px-9 py-3 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
            />
          </div>

          {loading ? <p className="py-10 text-sm text-slate-500 text-center">Loading your students...</p> : null}
          {!loading && error ? <p className="py-8 text-sm text-red-600 text-center">{error}</p> : null}
          {!loading && !error && rows.length === 0 ? (
            <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-center">
              <p className="text-sm font-bold text-slate-900">No students linked yet</p>
              <p className="text-xs text-slate-600 mt-1">Add a child or ask school to register the learner with your parent phone.</p>
              <Link
                to="/parents/home"
                className="inline-flex mt-3 px-4 py-2 rounded-xl bg-orange-500 text-white text-xs font-bold"
              >
                Go to home
              </Link>
            </div>
          ) : null}

          {!loading && !error && rows.length > 0 ? (
            <ul className="mt-4 space-y-2.5">
              {rows.map((r) => {
                const active = String(selectedId) === String(r.raw.id);
                const code = String(r.ui.student_code || r.ui.student_uid || r.ui.sdm_code || "").trim();
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
                            <UserRound className="w-3.5 h-3.5" /> ID: {code || "No school code yet"}
                          </p>
                          <p className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1">
                            <GraduationCap className="w-3.5 h-3.5" /> {r.ui.class_name || r.ui.displayGrade || "Class not set"}
                          </p>
                          <p className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1">
                            <Building2 className="w-3.5 h-3.5" /> {r.ui.schoolLabel}
                          </p>
                        </div>
                        {active ? <CheckCircle2 className="w-5 h-5 text-orange-500 shrink-0" /> : null}
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : null}

          {selected && !selectedCode ? (
            <p className="mt-3 text-xs text-red-600">
              This child does not have a school student code yet, so voucher flow cannot continue.
            </p>
          ) : null}

          <button
            type="button"
            onClick={onContinue}
            disabled={!selected || !selectedCode}
            className="w-full mt-5 rounded-2xl py-3.5 bg-gradient-to-r from-orange-500 to-amber-500 text-white font-black text-sm disabled:opacity-45 disabled:cursor-not-allowed"
          >
            {meta.cta}
          </button>
        </div>
      </div>
      <AddChildModal open={addOpen} onClose={() => setAddOpen(false)} onSaved={refreshLocal} />
    </div>
  );
}
