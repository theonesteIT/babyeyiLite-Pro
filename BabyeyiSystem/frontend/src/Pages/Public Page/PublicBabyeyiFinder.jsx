import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { ArrowLeft, ShieldCheck, Sparkles } from "lucide-react";
import BabyeyiFinder from "./BabyeyiFinder";
import Heroimage from "../../assets/hero-image.png";

const DEFAULT_THEME = {
  p: "#1F2937",
  s: "transparent",
  a: "#FBBF24",
  dark: "#111827",
};
const SERVER = import.meta.env.VITE_API_URL || "http://localhost:5100";
const MINI_WEBSITES_API = `${SERVER}/api/mini-websites`;

function normalizeName(v) {
  return String(v || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

export default function PublicBabyeyiFinder() {
  const location = useLocation();
  const q = new URLSearchParams(location.search || "");

  const schoolIdFromUrl = q.get("schoolId") || "";
  const schoolNameFromUrl = q.get("schoolName") || "Selected School";
  const schoolSlugFromUrl = q.get("schoolSlug") || "";
  const studentCodeParam = (q.get("studentCode") || "").trim();
  const sdmIdParam = (q.get("sdmId") || q.get("sdm_id") || "").trim();
  const fromService = (q.get("fromService") || "").trim();
  /** Resolve school / prefill finder: official code first, else SDM ID from URL. */
  const codeFromUrl = studentCodeParam || sdmIdParam;

  const [resolvedSchool, setResolvedSchool] = useState({
    schoolId: schoolIdFromUrl,
    schoolName: schoolNameFromUrl,
    schoolSlug: schoolSlugFromUrl,
  });
  const [resolving, setResolving] = useState(false);
  const [resolveError, setResolveError] = useState("");

  const prefill = useMemo(() => ({
    ts: Date.now(),
    code: codeFromUrl,
    className: q.get("class") || "",
    academicYear: q.get("year") || "",
    term: q.get("term") || "",
    studentName: q.get("studentName") || "",
  }), [codeFromUrl, location.search]);

  useEffect(() => {
    if (schoolIdFromUrl) {
      setResolvedSchool({
        schoolId: schoolIdFromUrl,
        schoolName: schoolNameFromUrl,
        schoolSlug: schoolSlugFromUrl,
      });
      return;
    }
    if (!codeFromUrl) return;
    let cancelled = false;
    setResolving(true);
    setResolveError("");
    const resolveSchool = async () => {
      try {
        const lookupBody =
          sdmIdParam && !studentCodeParam
            ? { sdm_code: codeFromUrl }
            : { code: codeFromUrl };
        const lookupRes = await fetch(`${SERVER}/api/public/student-code-lookup`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(lookupBody),
        });
        const lookupJson = await lookupRes.json().catch(() => ({}));
        if (!lookupRes.ok || !lookupJson?.success || !lookupJson?.found || !lookupJson?.data) {
          throw new Error(lookupJson?.message || "Could not resolve school from this student code or SDM ID.");
        }

        const d = lookupJson.data;
        const sid = d.school_id || d.schoolId || "";
        const directSlug = d.school_slug || d.slug || d.schoolSlug || schoolSlugFromUrl || "";
        const directName = d.school_name || schoolNameFromUrl || "Selected School";

        if (sid) {
          if (!cancelled) {
            setResolvedSchool({
              schoolId: String(sid),
              schoolName: directName,
              schoolSlug: directSlug,
            });
          }
          return;
        }

        // Fallback 1: resolve from mini-website by slug.
        if (directSlug) {
          const bySlugRes = await fetch(`${MINI_WEBSITES_API}/slug/${encodeURIComponent(directSlug)}`);
          const bySlugJson = await bySlugRes.json().catch(() => ({}));
          if (bySlugRes.ok && bySlugJson?.data) {
            const mw = bySlugJson.data;
            const resolvedId = mw.schoolId || mw.id || mw.school_id || "";
            if (resolvedId && !cancelled) {
              setResolvedSchool({
                schoolId: String(resolvedId),
                schoolName: mw.name || directName,
                schoolSlug: mw.slug || directSlug,
              });
              return;
            }
          }
        }

        // Fallback 2: resolve from published schools list by school name.
        const listRes = await fetch(`${MINI_WEBSITES_API}?status=published&limit=500`);
        const listJson = await listRes.json().catch(() => ({}));
        if (!listRes.ok || !Array.isArray(listJson?.data)) {
          throw new Error("Could not resolve school from list.");
        }
        const target = normalizeName(directName);
        const match = listJson.data.find((s) => normalizeName(s.name) === target);
        if (!match) {
          throw new Error("Student found, but school mini-website is not yet available.");
        }
        const resolvedId = match.schoolId || match.id || match.school_id || "";
        if (!resolvedId) {
          throw new Error("Matched school is missing id.");
        }
        if (!cancelled) {
          setResolvedSchool({
            schoolId: String(resolvedId),
            schoolName: match.name || directName,
            schoolSlug: match.slug || directSlug,
          });
        }
      } catch (e) {
        if (!cancelled) setResolveError(e.message || "Failed to resolve school.");
      } finally {
        if (!cancelled) setResolving(false);
      }
    };

    resolveSchool();
    return () => { cancelled = true; };
  }, [schoolIdFromUrl, schoolNameFromUrl, schoolSlugFromUrl, codeFromUrl]);

  if (resolving) {
    return (
      <div className="min-h-screen relative overflow-hidden bg-[#0F172A] flex items-center justify-center p-4 sm:p-6">
        <img src={Heroimage} alt="" className="absolute inset-0 w-full h-full object-cover opacity-25" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#0B1220]/95 via-[#111827]/88 to-[#0B1220]/96" />
        <div className="relative z-10 w-full max-w-lg border border-amber-300/25 rounded-3xl p-6 text-center shadow-2xl bg-white/[0.06] backdrop-blur-xl">
          <h1 className="text-xl font-black text-white mb-2">Preparing Babyeyi Finder</h1>
          <p className="text-sm text-white/75">
            Resolving school information from the selected student...
          </p>
        </div>
      </div>
    );
  }

  if (!resolvedSchool.schoolId) {
    return (
      <div className="min-h-screen relative overflow-hidden bg-[#0F172A] flex items-center justify-center p-4 sm:p-6">
        <img src={Heroimage} alt="" className="absolute inset-0 w-full h-full object-cover opacity-25" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#0B1220]/95 via-[#111827]/88 to-[#0B1220]/96" />
        <div className="relative z-10 w-full max-w-lg border border-amber-300/25 rounded-3xl p-6 text-center shadow-2xl bg-white/[0.06] backdrop-blur-xl">
          <h1 className="text-xl font-black text-white mb-2">Babyeyi Finder</h1>
          <p className="text-sm text-white/75 mb-5">
            {resolveError || "Missing school reference. Please search a student again from the home page."}
          </p>
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-xl bg-amber-500 px-5 py-3 text-sm font-black text-slate-900 hover:bg-amber-400"
          >
            Go to Home
          </Link>
        </div>
      </div>
    );
  }

  const school = {
    id: resolvedSchool.schoolId,
    schoolId: resolvedSchool.schoolId,
    school_id: resolvedSchool.schoolId,
    name: resolvedSchool.schoolName,
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-slate-100">
      <img src={Heroimage} alt="" className="absolute inset-0 w-full h-full object-cover opacity-[0.12]" />
      <div className="absolute inset-0 bg-gradient-to-b from-white/95 via-slate-50/98 to-slate-100" />

      <div className="relative z-10">
        <div className="px-3 sm:px-6 pt-4 sm:pt-6">
          <div className="max-w-7xl mx-auto">
            <div className="rounded-2xl sm:rounded-3xl border border-slate-200/90 bg-white/95 shadow-lg px-3 sm:px-5 py-3 sm:py-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
              <div className="flex items-center justify-between sm:justify-start gap-2">
                <Link
                  to="/"
                  className="inline-flex items-center gap-1.5 rounded-xl bg-slate-100 px-3 py-2 text-xs sm:text-sm font-black text-slate-800 hover:bg-slate-200 transition-colors border border-slate-200"
                >
                  <ArrowLeft size={14} />
                  Back
                </Link>
                <div className="inline-flex items-center gap-1.5 rounded-xl bg-amber-100 border border-amber-200 px-2.5 py-1.5 text-[11px] sm:text-xs font-black text-amber-900">
                  <Sparkles size={12} />
                  Babyeyi Finder
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm sm:text-base font-black text-slate-900 truncate">{resolvedSchool.schoolName}</p>
                <p className="text-[11px] sm:text-xs text-slate-500 truncate">Professional school-fee document search and payment preview</p>
                {fromService ? (
                  <p className="mt-2 text-[11px] sm:text-xs font-bold text-amber-900 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1.5 inline-block">
                    Service: {fromService.replace(/-/g, " ")}
                  </p>
                ) : null}
              </div>
              <div className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-50 border border-emerald-200 px-2.5 py-1.5 text-[11px] sm:text-xs font-bold text-emerald-800 w-fit">
                <ShieldCheck size={12} />
                Secure Public Access
              </div>
            </div>
          </div>
        </div>

        <BabyeyiFinder
          school={school}
          theme={DEFAULT_THEME}
          schoolSlug={resolvedSchool.schoolSlug}
          openModal={true}
          lookupPrefill={prefill}
          autoOpenSingleResult={false}
          publicPayNoLogin
          finderLightSurface
        />
      </div>
    </div>
  );
}
