/**
 * PublicPage.jsx — Babyeyi Platform Landing Page v3.2
 * Route: /  or  /home
 * Montserrat typography · Hero: full-bleed image + left→right fade
 *
 * CHANGES v3.2 (BUG FIX):
 *  1. FIXED: Login button navigation — replaced window.location.href with useNavigate()
 *     to prevent full-page reload issues in React Router SPA context
 *  2. FIXED: All overlay divs in HeroSection explicitly have pointer-events-none
 *     to prevent click interception on the navbar Login button
 *  3. Removed duplicate onPointerDown + onClick handlers (single onClick is sufficient
 *     now that navigate() is used — no timing race condition)
 */

import { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  GraduationCap, Globe, Users, BookOpen, Bell, Search, Star,
  ArrowRight, ChevronRight, MapPin, Award, TrendingUp,
  BarChart3, Shield, Smartphone, Zap, CheckCircle2, Menu, X,
  Building2, Layers, MessageSquare, Heart, Sparkles, School,
  BookMarked, Activity, Calendar, Wrench, ExternalLink, LogIn,
  Facebook, Twitter, Instagram, Mail, Phone, Youtube,
  ChevronDown, Target, Lightbulb, CreditCard, Shirt, ShoppingBag,
  Send, Bot, Loader2
} from "lucide-react";

import Heroimage from "../../assets/hero-image.png";

const BABYeyiLogoUrl = "/1BABYEYI LOGO FINAL.png";
const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5100";

// ─── GOOGLE FONTS ─────────────────────────────────────────────────────────────
const FontLoader = () => (
  <link
    href="https://fonts.googleapis.com/css2?family=Montserrat:ital,wght@0,400;0,500;0,600;0,700;0,800;0,900;1,400;1,600;1,700&display=swap"
    rel="stylesheet"
  />
);

// ─── COUNTER HOOK ─────────────────────────────────────────────────────────────
function useCounter(target, duration = 2000, startOnMount = false) {
  const [count, setCount] = useState(0);
  const [started, setStarted] = useState(startOnMount);
  useEffect(() => {
    if (!started) return;
    let start = null;
    const step = ts => {
      if (!start) start = ts;
      const progress = Math.min((ts - start) / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(ease * target));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [started, target, duration]);
  return [count, () => setStarted(true)];
}

function useVisible(ref) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold: 0.2 }
    );
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);
  return visible;
}

function StatCounter({ target, suffix = "", label, icon, color }) {
  const ref = useRef(null);
  const visible = useVisible(ref);
  const [count, start] = useCounter(target, 1800);
  useEffect(() => { if (visible) start(); }, [visible]);

  return (
    <div ref={ref} className="flex flex-col items-center text-center p-6">
      <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4 shadow-lg"
        style={{ background: `${color}20` }}>
        <span style={{ color }}>{icon}</span>
      </div>
      <div className="font-black text-4xl sm:text-5xl text-white mb-1">
        {count.toLocaleString()}{suffix}
      </div>
      <div className="text-white/60 text-sm font-semibold">{label}</div>
    </div>
  );
}

// ─── ANIMATED AI PROMPT BOX (student code lookup + prompts) ─────────────────
function BabyeyiAIBox() {
  const font = "'Montserrat', sans-serif";
  const [inputVal, setInputVal] = useState("");
  const [placeholder, setPlaceholder] = useState("");
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupResult, setLookupResult] = useState(null);
  const [lookupError, setLookupError] = useState(null);

  const closeLookupModal = () => {
    setLookupResult(null);
  };

  useEffect(() => {
    const open = !!(lookupResult?.data || lookupResult?.notFound || lookupResult?.schoolCatalog);
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") setLookupResult(null);
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [lookupResult]);

  const prompts = [
    "Enter student code or SDM ID (e.g. BEY123456789)…",
    "Try your school directory code (printed on invoices)…",
    "Find me a good school in Musanze with TVET programs…",
    "Which schools offer A-Level Sciences near Kigali?",
    "Look up my child’s Babyeyi student UID…",
    "Show schools with computer lab facilities in Huye…",
  ];
  const promptIndex = useRef(0);
  const charIndex = useRef(0);
  const typingRef = useRef(null);

  useEffect(() => {
    const typeNext = () => {
      const current = prompts[promptIndex.current];
      if (charIndex.current < current.length) {
        setPlaceholder(current.slice(0, charIndex.current + 1));
        charIndex.current++;
        typingRef.current = setTimeout(typeNext, 45);
      } else {
        typingRef.current = setTimeout(() => {
          const erase = () => {
            if (charIndex.current > 0) {
              charIndex.current--;
              setPlaceholder(current.slice(0, charIndex.current));
              typingRef.current = setTimeout(erase, 22);
            } else {
              promptIndex.current = (promptIndex.current + 1) % prompts.length;
              typingRef.current = setTimeout(typeNext, 400);
            }
          };
          erase();
        }, 2200);
      }
    };
    typingRef.current = setTimeout(typeNext, 800);
    return () => clearTimeout(typingRef.current);
  }, []);

  const runLookup = async () => {
    const q = inputVal.trim();
    setLookupError(null);
    setLookupResult(null);
    if (!q) {
      setLookupError("Enter a student UID, official code, SDM ID, or school directory code.");
      return;
    }
    setLookupLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/public/student-code-lookup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: q }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json.success === false) {
        setLookupError(json.message || "Lookup failed. Try again.");
        return;
      }
      if (json.found) {
        setLookupResult({ data: json.data });
        return;
      }

      const schRes = await fetch(`${API_BASE}/api/public/public-pay/school-catalog`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ school_code: q }),
      });
      const schJson = await schRes.json().catch(() => ({}));
      if (schRes.ok && schJson.success && schJson.data?.school) {
        setLookupResult({ schoolCatalog: schJson.data });
        return;
      }

      setLookupResult({ notFound: true });
    } catch {
      setLookupError("Network error — check your connection.");
    } finally {
      setLookupLoading(false);
    }
  };

  return (
    <div
      className="w-full max-w-[min(100%,28rem)] sm:max-w-xl mt-5 sm:mt-6"
      style={{
        animation: "aiBoxSlideIn 0.7s cubic-bezier(0.22,1,0.36,1) both",
        animationDelay: "0.3s",
      }}
    >
      <style>{`
        @keyframes aiBoxSlideIn {
          from { opacity: 0; transform: translateY(18px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes aiGlow {
          0%, 100% { box-shadow: 0 0 0 0px rgba(251,191,36,0), 0 8px 32px rgba(0,0,0,0.35); }
          50%       { box-shadow: 0 0 0 3px rgba(251,191,36,0.18), 0 8px 32px rgba(251,191,36,0.2); }
        }
        @keyframes aiPulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%       { opacity: 0.6; transform: scale(0.92); }
        }
        @keyframes shimmer {
          0%   { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        .ai-box-glow {
          animation: aiGlow 3s ease-in-out infinite;
        }
        .ai-dot { animation: aiPulse 1.4s ease-in-out infinite; }
        .ai-dot:nth-child(2) { animation-delay: 0.2s; }
        .ai-dot:nth-child(3) { animation-delay: 0.4s; }
      `}</style>

      <div className="flex items-center gap-2 mb-2 pl-1 flex-wrap">
        <div className="flex gap-1 shrink-0">
          <span className="ai-dot w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" />
          <span className="ai-dot w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" />
          <span className="ai-dot w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" />
        </div>
        <span
          className="text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.14em] sm:tracking-[0.18em]"
          style={{
            fontFamily: font,
            background: "linear-gradient(90deg, #FBBF24, #FDE68A, #FBBF24)",
            backgroundSize: "200% auto",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            animation: "shimmer 3s linear infinite",
          }}
        >
          Babyeyi AI
        </span>
      </div>

      <div
        className="ai-box-glow relative flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 p-3 sm:px-4 sm:py-3.5 rounded-2xl"
        style={{
          background: "rgba(17,24,39,0.88)",
          border: "1px solid rgba(251,191,36,0.35)",
          backdropFilter: "blur(16px)",
        }}
      >
        <div
          className="flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center mx-auto sm:mx-0"
          style={{ background: "rgba(251,191,36,0.15)" }}
        >
          <Bot size={16} style={{ color: "#FBBF24" }} />
        </div>
        <input
          type="text"
          value={inputVal}
          onChange={e => {
            setInputVal(e.target.value);
            setLookupError(null);
            setLookupResult(null);
          }}
          onKeyDown={e => {
            if (e.key === "Enter") {
              e.preventDefault();
              runLookup();
            }
          }}
          placeholder={placeholder || "Student code, UID, or question…"}
          className="flex-1 outline-none text-sm min-w-0 w-full px-3 py-2 sm:py-2 rounded-xl border border-white/10 bg-white/[0.06] placeholder:text-white/45"
          style={{
            fontFamily: font,
            color: "rgba(255,255,255,0.88)",
            caretColor: "#FBBF24",
          }}
        />
        <button
          type="button"
          onClick={runLookup}
          disabled={lookupLoading}
          className="flex-shrink-0 w-full sm:w-10 h-10 sm:h-9 rounded-xl flex items-center justify-center transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-60 touch-manipulation"
          style={{
            background: inputVal
              ? "linear-gradient(135deg, #FBBF24, #F59E0B)"
              : "rgba(251,191,36,0.12)",
          }}
        >
          {lookupLoading ? (
            <Loader2 size={18} className="animate-spin" style={{ color: "#111827" }} />
          ) : (
            <Send
              size={14}
              style={{ color: inputVal ? "#111827" : "rgba(251,191,36,0.5)" }}
              strokeWidth={2.5}
            />
          )}
        </button>
      </div>

      {lookupError && (
        <p className="text-[11px] sm:text-xs mt-2 px-1 text-amber-200/90 font-medium" style={{ fontFamily: font }}>
          {lookupError}
        </p>
      )}

      {(lookupResult?.data || lookupResult?.notFound || lookupResult?.schoolCatalog) && (
        <div
          className="fixed inset-0 z-[420] flex items-end sm:items-center justify-center p-0 sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="student-lookup-modal-title"
        >
          <button
            type="button"
            className="absolute inset-0 bg-black/65 backdrop-blur-sm"
            aria-label="Close"
            onClick={closeLookupModal}
          />
          <div
            className="relative z-10 w-full sm:max-w-[min(94vw,760px)] h-[min(90dvh,760px)] sm:h-auto sm:max-h-[88vh] flex flex-col overflow-hidden rounded-t-3xl sm:rounded-3xl border border-amber-300/55 shadow-2xl"
            style={{
              background: "linear-gradient(165deg, rgba(31,41,55,0.98) 0%, rgba(17,24,39,0.99) 100%)",
              boxShadow: "0 24px 48px rgba(0,0,0,0.45)",
            }}
          >
            <div className="flex shrink-0 items-center justify-between gap-2.5 border-b border-white/20 px-3 py-2.5 min-[360px]:px-4 min-[360px]:py-3 sm:px-6 sm:py-4">
              <div className="flex min-w-0 items-center gap-2">
                <GraduationCap size={18} className="text-amber-400 shrink-0" strokeWidth={2.25} />
                <h2
                  id="student-lookup-modal-title"
                  className="truncate text-[13px] min-[360px]:text-sm sm:text-base font-extrabold tracking-wide text-amber-100"
                  style={{ fontFamily: font }}
                >
                  {lookupResult.data
                    ? "Learner Profile"
                    : lookupResult.schoolCatalog
                      ? "School Details"
                      : "No Match Found"}
                </h2>
              </div>
              <button
                type="button"
                onClick={closeLookupModal}
                className="shrink-0 rounded-xl p-1.5 min-[360px]:p-2 text-white/90 transition hover:bg-white/10 hover:text-white"
                aria-label="Close"
              >
                <X size={22} strokeWidth={2.25} />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3 min-[360px]:px-4 min-[360px]:py-4 sm:px-6 sm:py-5">
              {lookupResult.data && (
                <div className="space-y-2.5 min-[360px]:space-y-3 sm:space-y-4">
                  {(() => {
                    const schoolId =
                      lookupResult.data.school_id ||
                      lookupResult.data.schoolId ||
                      "";
                    const d = lookupResult.data;
                    const q = new URLSearchParams();
                    q.set("openBabyeyi", "1");
                    if (d.student_code) {
                      q.set("studentCode", d.student_code);
                    } else if (d.sdm_code) {
                      q.set("sdmId", d.sdm_code);
                    } else {
                      const fallback = d.student_uid || inputVal.trim() || "";
                      if (fallback) q.set("studentCode", fallback);
                    }
                    if (d.academic_year) q.set("year", d.academic_year);
                    if (d.term) q.set("term", d.term);
                    if (d.class_name || d.class) q.set("class", d.class_name || d.class);
                    const studentName = `${d.first_name || ""} ${d.last_name || ""}`.trim();
                    if (studentName) q.set("studentName", studentName);
                    if (schoolId) q.set("schoolId", String(schoolId));
                    if (d.school_name) q.set("schoolName", d.school_name);
                    if (d.school_slug || d.slug || d.schoolSlug) {
                      q.set("schoolSlug", d.school_slug || d.slug || d.schoolSlug);
                    }
                    const href = `/babyeyi-finder?${q.toString()}`;
                    const payFeesHref = `/pay-by-school?code=${encodeURIComponent(
                      String(d.school_code || "").trim()
                    )}`;
                    return (
                      <div className="sticky top-0 z-10 -mx-1 px-1 pt-0.5 pb-2 bg-gradient-to-b from-slate-900/98 via-slate-900/86 to-transparent space-y-2">
                        <Link
                          to={href}
                          onClick={closeLookupModal}
                          className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-300 via-amber-400 to-amber-500 px-3.5 py-3 text-[13px] min-[360px]:text-sm font-black text-slate-900 shadow-lg shadow-amber-500/30 transition hover:brightness-105"
                          style={{ fontFamily: font }}
                        >
                          <ArrowRight size={15} />
                          Open Babyeyi for This Student
                        </Link>
                        <div className="grid grid-cols-1 min-[400px]:grid-cols-2 gap-2">
                          {d.mini_website_slug ? (
                            <Link
                              to={`/school/${encodeURIComponent(d.mini_website_slug)}`}
                              onClick={closeLookupModal}
                              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-amber-400/45 bg-white/[0.06] px-3 py-2.5 text-[12px] min-[360px]:text-[13px] font-bold text-amber-100 hover:bg-white/10 transition-colors"
                              style={{ fontFamily: font }}
                            >
                              <Globe size={15} className="text-amber-400 shrink-0" />
                              School mini website
                            </Link>
                          ) : null}
                          <Link
                            to={payFeesHref}
                            onClick={closeLookupModal}
                            className={`inline-flex items-center justify-center gap-2 rounded-2xl border border-white/20 bg-white/[0.07] px-3 py-2.5 text-[12px] min-[360px]:text-[13px] font-bold text-white hover:bg-white/12 transition-colors ${
                              d.mini_website_slug ? "" : "min-[400px]:col-span-2"
                            }`}
                            style={{ fontFamily: font }}
                          >
                            <CreditCard size={15} className="text-amber-400 shrink-0" />
                            Pay school fees
                          </Link>
                        </div>
                      </div>
                    );
                  })()}

                  <div className="rounded-2xl border border-amber-300/40 bg-white/[0.05] p-2.5 min-[360px]:p-3 sm:p-4">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-white/65 mb-1" style={{ fontFamily: font }}>Learner Name</p>
                    <p className="text-[15px] min-[360px]:text-base sm:text-lg font-black text-white leading-tight" style={{ fontFamily: font }}>
                      {lookupResult.data.first_name} {lookupResult.data.last_name}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 min-[360px]:gap-3">
                    <div className="rounded-2xl border border-white/20 bg-white/[0.05] p-2.5 min-[360px]:p-3">
                      <p className="text-[10px] font-bold uppercase tracking-wide text-white/65" style={{ fontFamily: font }}>Student Code / UID</p>
                      <p className="text-sm font-mono font-semibold text-amber-100 break-all mt-1" style={{ fontFamily: font }}>
                        {lookupResult.data.student_uid || "—"}
                      </p>
                      {lookupResult.data.student_code ? (
                        <p className="text-[11px] text-white/75 mt-1" style={{ fontFamily: font }}>
                          Official Code: {lookupResult.data.student_code}
                        </p>
                      ) : null}
                    </div>
                    <div className="rounded-2xl border border-white/20 bg-white/[0.05] p-2.5 min-[360px]:p-3">
                      <p className="text-[10px] font-bold uppercase tracking-wide text-white/65 flex items-center gap-1" style={{ fontFamily: font }}>
                        <BookOpen size={12} className="opacity-70" /> Class
                      </p>
                      <p className="text-sm font-semibold text-white mt-1" style={{ fontFamily: font }}>{lookupResult.data.class_name || "—"}</p>
                    </div>
                    <div className="rounded-2xl border border-white/20 bg-white/[0.05] p-2.5 min-[360px]:p-3">
                      <p className="text-[10px] font-bold uppercase tracking-wide text-white/65" style={{ fontFamily: font }}>Academic Year</p>
                      <p className="text-sm font-semibold text-white mt-1" style={{ fontFamily: font }}>{lookupResult.data.academic_year || "—"}</p>
                    </div>
                    <div className="rounded-2xl border border-white/20 bg-white/[0.05] p-2.5 min-[360px]:p-3">
                      <p className="text-[10px] font-bold uppercase tracking-wide text-white/65" style={{ fontFamily: font }}>Term</p>
                      <p className="text-sm font-semibold text-white mt-1" style={{ fontFamily: font }}>{lookupResult.data.term || "—"}</p>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/20 bg-white/[0.05] p-2.5 min-[360px]:p-3">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-white/65 flex items-center gap-1" style={{ fontFamily: font }}>
                      <Building2 size={12} className="opacity-70" /> School
                    </p>
                    <p className="text-sm font-semibold text-white leading-snug mt-1" style={{ fontFamily: font }}>
                      {lookupResult.data.school_name || "—"}
                    </p>
                  </div>

                  {(lookupResult.data.district || lookupResult.data.province) && (
                    <div className="rounded-2xl border border-white/20 bg-white/[0.05] p-2.5 min-[360px]:p-3">
                      <p className="text-[10px] font-bold uppercase tracking-wide text-white/65 flex items-center gap-1" style={{ fontFamily: font }}>
                        <MapPin size={12} className="opacity-70" /> Location
                      </p>
                      <p className="text-sm text-white/95 leading-snug mt-1" style={{ fontFamily: font }}>
                        {[lookupResult.data.sector, lookupResult.data.district, lookupResult.data.province].filter(Boolean).join(", ")}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {lookupResult.schoolCatalog && (() => {
                const sch = lookupResult.schoolCatalog.school;
                const combos = lookupResult.schoolCatalog.combinations || [];
                const payHref = `/pay-by-school?code=${encodeURIComponent(String(sch?.school_code || "").trim())}`;
                return (
                  <div className="space-y-2.5 min-[360px]:space-y-3 sm:space-y-4">
                    <div className="sticky top-0 z-10 -mx-1 px-1 pt-0.5 pb-2 bg-gradient-to-b from-slate-900/98 via-slate-900/86 to-transparent">
                      <div className="grid grid-cols-1 min-[400px]:grid-cols-2 gap-2">
                        {sch?.mini_website_slug ? (
                          <Link
                            to={`/school/${encodeURIComponent(sch.mini_website_slug)}`}
                            onClick={closeLookupModal}
                            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-amber-400/45 bg-white/[0.06] px-3 py-2.5 text-[12px] min-[360px]:text-[13px] font-bold text-amber-100 hover:bg-white/10 transition-colors"
                            style={{ fontFamily: font }}
                          >
                            <Globe size={15} className="text-amber-400 shrink-0" />
                            School mini website
                          </Link>
                        ) : null}
                        <Link
                          to={payHref}
                          onClick={closeLookupModal}
                          className={`inline-flex items-center justify-center gap-2 rounded-2xl border border-white/20 bg-white/[0.07] px-3 py-2.5 text-[12px] min-[360px]:text-[13px] font-bold text-white hover:bg-white/12 transition-colors ${
                            sch?.mini_website_slug ? "" : "min-[400px]:col-span-2"
                          }`}
                          style={{ fontFamily: font }}
                        >
                          <CreditCard size={15} className="text-amber-400 shrink-0" />
                          Pay school fees
                        </Link>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-amber-300/40 bg-white/[0.05] p-2.5 min-[360px]:p-3 sm:p-4">
                      <p className="text-[10px] font-bold uppercase tracking-wide text-white/65 mb-1" style={{ fontFamily: font }}>School name</p>
                      <p className="text-[15px] min-[360px]:text-base sm:text-lg font-black text-white leading-tight" style={{ fontFamily: font }}>
                        {sch?.school_name || "—"}
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 min-[360px]:gap-3">
                      <div className="rounded-2xl border border-white/20 bg-white/[0.05] p-2.5 min-[360px]:p-3">
                        <p className="text-[10px] font-bold uppercase tracking-wide text-white/65" style={{ fontFamily: font }}>Directory code</p>
                        <p className="text-sm font-mono font-semibold text-amber-100 break-all mt-1" style={{ fontFamily: font }}>
                          {sch?.school_code || "—"}
                        </p>
                      </div>
                      {sch?.school_category ? (
                        <div className="rounded-2xl border border-white/20 bg-white/[0.05] p-2.5 min-[360px]:p-3">
                          <p className="text-[10px] font-bold uppercase tracking-wide text-white/65" style={{ fontFamily: font }}>Category</p>
                          <p className="text-sm font-semibold text-white mt-1" style={{ fontFamily: font }}>{sch.school_category}</p>
                        </div>
                      ) : null}
                      {sch?.education_levels ? (
                        <div className="rounded-2xl border border-white/20 bg-white/[0.05] p-2.5 min-[360px]:p-3 sm:col-span-2">
                          <p className="text-[10px] font-bold uppercase tracking-wide text-white/65" style={{ fontFamily: font }}>Levels offered</p>
                          <p className="text-sm text-white/95 mt-1 leading-snug" style={{ fontFamily: font }}>{sch.education_levels}</p>
                        </div>
                      ) : null}
                    </div>

                    {(sch?.sector || sch?.district || sch?.province) && (
                      <div className="rounded-2xl border border-white/20 bg-white/[0.05] p-2.5 min-[360px]:p-3">
                        <p className="text-[10px] font-bold uppercase tracking-wide text-white/65 flex items-center gap-1" style={{ fontFamily: font }}>
                          <MapPin size={12} className="opacity-70" /> Location
                        </p>
                        <p className="text-sm text-white/95 leading-snug mt-1" style={{ fontFamily: font }}>
                          {[sch.sector, sch.district, sch.province].filter(Boolean).join(", ")}
                        </p>
                      </div>
                    )}

                    {(sch?.phone || sch?.email) && (
                      <div className="rounded-2xl border border-white/20 bg-white/[0.05] p-2.5 min-[360px]:p-3 space-y-1.5">
                        {sch.phone ? (
                          <p className="text-sm text-white/90 flex items-start gap-2" style={{ fontFamily: font }}>
                            <Phone size={14} className="text-amber-400 shrink-0 mt-0.5" />
                            <span>{sch.phone}</span>
                          </p>
                        ) : null}
                        {sch.email ? (
                          <p className="text-sm text-white/90 flex items-start gap-2 break-all" style={{ fontFamily: font }}>
                            <Mail size={14} className="text-amber-400 shrink-0 mt-0.5" />
                            <span>{sch.email}</span>
                          </p>
                        ) : null}
                      </div>
                    )}

                    <div className="rounded-2xl border border-white/15 bg-white/[0.03] p-2.5 min-[360px]:p-3">
                      <p className="text-[10px] font-bold uppercase tracking-wide text-white/55 mb-1" style={{ fontFamily: font }}>Published fee documents</p>
                      <p className="text-sm font-semibold text-white/90" style={{ fontFamily: font }}>
                        {combos.length
                          ? `${combos.length} class / term combination${combos.length === 1 ? "" : "s"} available for online payment.`
                          : "No published Babyeyi fee documents yet — contact the school office."}
                      </p>
                    </div>
                  </div>
                );
              })()}

              {lookupResult.notFound && (
                <div style={{ fontFamily: font }}>
                  <p className="text-base font-bold text-white">No Learner or School Found</p>
                  <p className="text-sm text-white/80 mt-2 leading-relaxed">
                    Check the student UID, official code, or your school&apos;s directory code. You can also find a school to enroll.
                  </p>
                  <div className="mt-4 flex flex-col sm:flex-row gap-2">
                    <Link
                      to="/schools"
                      onClick={closeLookupModal}
                      className="inline-flex items-center justify-center rounded-xl bg-amber-500 px-4 py-2.5 text-xs font-bold text-slate-900 hover:bg-amber-400 transition-colors"
                    >
                      Find a School
                    </Link>
                    <Link
                      to="/parents/register"
                      onClick={closeLookupModal}
                      className="inline-flex items-center justify-center rounded-xl border border-white/25 px-4 py-2.5 text-xs font-bold text-white/90 hover:bg-white/10 transition-colors"
                    >
                      Parent Account
                    </Link>
                  </div>
                </div>
              )}
            </div>

            <div className="shrink-0 border-t border-white/20 p-3 min-[360px]:p-4 sm:px-6 bg-[rgba(10,14,24,0.8)] backdrop-blur-md">
              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  type="button"
                  onClick={closeLookupModal}
                  className="w-full rounded-xl bg-amber-500 px-4 py-3.5 text-sm font-black text-slate-900 shadow-lg shadow-amber-500/20 transition hover:bg-amber-400"
                  style={{ fontFamily: font }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <p
        className="text-[10px] sm:text-[11px] mt-2 pl-1 leading-relaxed max-w-xl"
        style={{ fontFamily: font, color: "rgba(255,255,255,0.28)" }}
      >
        Tip: enter your child&apos;s Babyeyi <span className="text-white/45">student UID, official code</span>, or the school&apos;s{" "}
        <span className="text-white/45">directory code</span> for school details. General questions: use Explore Schools or browse{" "}
        <Link to="/schools" className="text-amber-400/90 font-semibold hover:underline">all schools</Link>.
      </p>
    </div>
  );
}

// ─── NAVBAR ──────────────────────────────────────────────────────────────────
function LandingNav() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);

  return (
    <nav
      className="fixed top-0 left-0 right-0 z-50 transition-all duration-500"
      style={{
        background: scrolled ? "rgba(31,41,55,0.97)" : "rgba(31,41,55,0.78)",
        backdropFilter: scrolled ? "blur(24px)" : "none",
        borderBottom: scrolled ? "1px solid rgba(251,191,36,0.12)" : "1px solid rgba(251,191,36,0.08)",
      }}
    >
      <div className="max-w-[1700px] mx-auto px-5 sm:px-8 2xl:px-12 3xl:px-16 h-18 flex items-center justify-between" style={{ height: "72px" }}>
        {/* Logo */}
        <Link to="/" className="flex items-center gap-3 group">
          <img
            src={BABYeyiLogoUrl}
            alt="Babyeyi"
            className="w-[176px] h-[86px] 2xl:w-[220px] 2xl:h-[104px] object-contain transition-transform group-hover:scale-[1.03]"
            style={{ filter: "drop-shadow(0 8px 24px rgba(0,0,0,0.28))" }}
          />
        </Link>

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-1 2xl:gap-2">
          {[
            { label: "Features", href: "#features" },
            { label: "Schools", href: "/schools" },
            { label: "Pay fees", href: "/pay-by-school" },
            { label: "About", href: "#about" },
          ].map(l => (
            <a
              key={l.label}
              href={l.href}
              className="px-4 py-2 2xl:px-5 2xl:py-2.5 rounded-xl text-sm 2xl:text-base font-semibold text-white/65 hover:text-white hover:bg-white/8 transition-all"
              style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 600 }}
            >
              {l.label}
            </a>
          ))}
        </div>

        <div className="hidden md:flex items-center relative z-[90] pointer-events-auto">
          <a
            href="/login"
            className="inline-flex items-center justify-center gap-2 min-h-[48px] 2xl:min-h-[56px] px-7 2xl:px-9 rounded-2xl text-sm 2xl:text-base font-extrabold tracking-wide transition-all duration-300 hover:scale-[1.03] active:scale-[0.98] shadow-lg hover:shadow-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#1F2937]"
            style={{
              fontFamily: "'Montserrat', sans-serif",
              background: "linear-gradient(145deg, #FDE68A 0%, #FBBF24 45%, #F59E0B 100%)",
              color: "#111827",
              boxShadow: "0 4px 14px rgba(251, 191, 36, 0.45), inset 0 1px 0 rgba(255,255,255,0.45)",
              border: "1px solid rgba(253, 230, 138, 0.95)",
            }}
          >
            <LogIn size={18} strokeWidth={2.5} /> Login
          </a>
        </div>

        <div className="flex md:hidden items-center gap-1.5 xs:gap-2 shrink-0 min-w-0 relative z-[90] pointer-events-auto">
          <a
            href="/login"
            aria-label="Log in to Babyeyi"
            className="inline-flex items-center justify-center gap-1 h-8.5 sm:h-9 min-w-[78px] max-w-[44vw] px-2.5 sm:px-3.5 rounded-lg sm:rounded-xl text-[10px] sm:text-[11px] font-extrabold tracking-wide whitespace-nowrap leading-none transition-all active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#1F2937] touch-manipulation"
            style={{
              fontFamily: "'Montserrat', sans-serif",
              background: "linear-gradient(145deg, #FDE68A 0%, #FBBF24 50%, #F59E0B 100%)",
              color: "#111827",
              boxShadow: "0 2px 10px rgba(251, 191, 36, 0.36), inset 0 1px 0 rgba(255,255,255,0.4)",
              border: "1px solid rgba(253, 230, 138, 0.9)",
            }}
          >
            <LogIn size={13} strokeWidth={2.5} /> <span className="truncate">Login</span>
          </a>
          <button
            type="button"
            onClick={() => setMenuOpen(m => !m)}
            className="min-w-[40px] min-h-[40px] w-10 h-10 sm:w-11 sm:h-11 rounded-lg sm:rounded-xl bg-white/12 border border-white/15 flex items-center justify-center text-white hover:bg-white/22 transition-colors"
            aria-expanded={menuOpen}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
          >
            {menuOpen ? <X size={18} strokeWidth={2.25} /> : <Menu size={18} strokeWidth={2.25} />}
          </button>
        </div>
      </div>

      {menuOpen && (
        <div
          className="md:hidden px-4 pb-4 space-y-1"
          style={{ background: "rgba(31,41,55,0.99)" }}
        >
          <a
            href="#features"
            onClick={() => setMenuOpen(false)}
            className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-bold text-white/75 hover:bg-white/10 hover:text-white transition-all"
            style={{ fontFamily: "'Montserrat', sans-serif" }}
          >
            Features
          </a>
          <Link
            to="/schools"
            onClick={() => setMenuOpen(false)}
            className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-bold text-white/75 hover:bg-white/10 hover:text-white transition-all"
            style={{ fontFamily: "'Montserrat', sans-serif" }}
          >
            Schools
          </Link>
          <Link
            to="/pay-by-school"
            onClick={() => setMenuOpen(false)}
            className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-bold text-amber-200/95 hover:bg-white/10 hover:text-white transition-all"
            style={{ fontFamily: "'Montserrat', sans-serif" }}
          >
            <CreditCard size={16} className="opacity-90" />
            Pay by school code
          </Link>
          <a
            href="#about"
            onClick={() => setMenuOpen(false)}
            className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-bold text-white/75 hover:bg-white/10 hover:text-white transition-all"
            style={{ fontFamily: "'Montserrat', sans-serif" }}
          >
            About
          </a>
          <a
            href="/login"
            onClick={() => setMenuOpen(false)}
            className="flex items-center justify-center gap-2 w-full mx-1 mt-2 px-4 py-3.5 rounded-2xl text-sm font-extrabold text-center transition-all active:scale-[0.99] touch-manipulation"
            style={{
              fontFamily: "'Montserrat', sans-serif",
              background: "linear-gradient(145deg, #FDE68A 0%, #FBBF24 50%, #F59E0B 100%)",
              color: "#111827",
              boxShadow: "0 4px 16px rgba(251, 191, 36, 0.35)",
            }}
          >
            <LogIn size={18} strokeWidth={2.5} /> Login
          </a>
          <p className="px-4 pt-3 pb-1 text-[11px] text-white/40 text-center" style={{ fontFamily: "'Montserrat', sans-serif" }}>
            Use the hero buttons below for Explore, Register, and more.
          </p>
        </div>
      )}
    </nav>
  );
}

// ─── HERO ────────────────────────────────────────────────────────────────────
function HeroSection({ onSearchSchools }) {
  const font = "'Montserrat', sans-serif";

  // Landing hero should be simple (no overlapping service cards).
  // Full catalog is on `/services`.
  const featureCards = [];

  return (
    <section className="relative min-h-screen w-full overflow-hidden">
      {/* Full-viewport background image — pointer-events-none so it never blocks clicks */}
      <div
        className="absolute inset-0 w-full min-h-full pointer-events-none"
        style={{
          backgroundImage: `url(${Heroimage})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
        aria-hidden
      />

      {/* ✅ FIX: Left → right gradient overlay — explicitly pointer-events-none */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "linear-gradient(90deg, rgba(31,41,55,0.99) 0%, rgba(31,41,55,0.93) 14%, rgba(31,41,55,0.78) 30%, rgba(31,41,55,0.42) 55%, rgba(31,41,55,0.14) 78%, rgba(31,41,55,0) 94%)",
        }}
      />

      {/* ✅ FIX: Noise texture — explicitly pointer-events-none */}
      <div
        className="absolute inset-0 opacity-[0.035] pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E")`,
          backgroundSize: "200px 200px",
        }}
      />

      {/* ✅ FIX: Bottom border accent line — explicitly pointer-events-none */}
      <div
        className="absolute pointer-events-none z-[1]"
        style={{
          top: "72px",
          left: 0,
          right: 0,
          height: "1px",
          background: "linear-gradient(90deg, transparent 0%, rgba(251,191,36,0.25) 30%, rgba(251,191,36,0.45) 50%, rgba(251,191,36,0.25) 70%, transparent 100%)",
        }}
      />

      <div className="relative z-10 max-w-[1700px] mx-auto px-6 sm:px-10 lg:px-14 2xl:px-16 3xl:px-20 min-h-screen flex flex-col pt-[72px] pb-24 2xl:pb-28 box-border">
        <div className="flex-1 flex flex-col justify-center max-w-2xl 2xl:max-w-3xl w-full pt-6 sm:pt-10 lg:pt-8 2xl:pt-12">

          <h1
            className="mb-6 leading-[1.08] w-full"
            style={{
              fontFamily: font,
              fontSize: "clamp(2.1rem, 3.8vw, 5.25rem)",
              color: "white",
              letterSpacing: "-0.02em",
              fontWeight: 800,
            }}
          >
            An Integrated{" "}
            <span style={{ color: "#FBBF24", fontWeight: 800 }}>Digital Platform</span>{" "}
            for Equitable School Readiness
          </h1>

          <div
            className="mb-8 w-full"
            style={{
              width: 56,
              height: 3,
              background: "linear-gradient(90deg, #FBBF24, #F59E0B)",
              borderRadius: 99,
            }}
          />

          <div className="w-full max-w-[min(100%,28rem)] sm:max-w-xl 2xl:max-w-2xl space-y-3 sm:space-y-4 2xl:space-y-5 mb-6">
            {/* Row 1 */}
            <div className="grid grid-cols-2 gap-3 sm:gap-4 2xl:gap-5">
              <button
                type="button"
                onClick={onSearchSchools}
                className="touch-manipulation group flex flex-col sm:flex-row items-center justify-center gap-2 min-h-[3.25rem] sm:min-h-[3.5rem] 2xl:min-h-[4rem] w-full min-w-0 px-3 sm:px-4 2xl:px-5 py-3.5 2xl:py-4 rounded-2xl font-bold text-xs sm:text-sm 2xl:text-base transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-xl"
                style={{
                  fontFamily: font,
                  fontWeight: 700,
                  background: "linear-gradient(145deg, #FDE68A 0%, #FBBF24 40%, #F59E0B 100%)",
                  color: "#111827",
                  boxShadow: "0 8px 24px rgba(251,191,36,0.35), inset 0 1px 0 rgba(255,255,255,0.35)",
                  border: "1px solid rgba(253,230,138,0.85)",
                }}
              >
                <Search size={18} className="shrink-0 opacity-90" strokeWidth={2.25} />
                <span className="text-center leading-snug">Explore Schools</span>
              </button>

              <Link
                to="/register"
                className="touch-manipulation group flex flex-col sm:flex-row items-center justify-center gap-2 min-h-[3.25rem] sm:min-h-[3.5rem] 2xl:min-h-[4rem] w-full min-w-0 px-3 sm:px-4 2xl:px-5 py-3.5 2xl:py-4 rounded-2xl font-bold text-xs sm:text-sm 2xl:text-base transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] border backdrop-blur-md bg-white/[0.07] hover:bg-white/[0.12]"
                style={{
                  fontFamily: font,
                  fontWeight: 700,
                  color: "rgba(255,255,255,0.92)",
                  borderColor: "rgba(255,255,255,0.22)",
                  boxShadow: "0 4px 20px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.06)",
                }}
              >
                <Building2 size={18} className="shrink-0 text-amber-300/90" strokeWidth={2.25} />
                <span className="text-center leading-snug">Register Your School</span>
              </Link>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <Link
                to="/school-manager/login"
                className="touch-manipulation flex flex-col sm:flex-row items-center justify-center gap-2 min-h-[3.25rem] sm:min-h-[3.5rem] w-full min-w-0 px-3 sm:px-4 py-3.5 rounded-2xl font-bold text-xs sm:text-sm transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] border backdrop-blur-md bg-amber-500/[0.08] hover:bg-amber-400/[0.12]"
                style={{
                  fontFamily: font,
                  fontWeight: 700,
                  color: "rgba(255,255,255,0.92)",
                  borderColor: "rgba(251,191,36,0.45)",
                  boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
                }}
              >
                <GraduationCap size={18} className="shrink-0 text-amber-300" strokeWidth={2.25} />
                <span className="text-center leading-snug">School Manager Login</span>
              </Link>

              <Link
                to="/parents/login"
                className="touch-manipulation flex flex-col sm:flex-row items-center justify-center gap-2 min-h-[3.25rem] sm:min-h-[3.5rem] w-full min-w-0 px-3 sm:px-4 py-3.5 rounded-2xl font-bold text-xs sm:text-sm transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] border backdrop-blur-md bg-white/[0.07] hover:bg-white/[0.12]"
                style={{
                  fontFamily: font,
                  fontWeight: 700,
                  color: "rgba(255,255,255,0.92)",
                  borderColor: "rgba(255,255,255,0.2)",
                  boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
                }}
              >
                <Users size={18} strokeWidth={2.25} className="shrink-0 text-amber-200/90" />
                <span className="text-center leading-snug">Parent Login</span>
              </Link>
            </div>

            <Link
              to="/services"
              className="touch-manipulation flex flex-col sm:flex-row items-center justify-center gap-2 min-h-[3.25rem] sm:min-h-[3.5rem] 2xl:min-h-[4rem] w-full min-w-0 px-3 sm:px-4 2xl:px-5 py-3.5 2xl:py-4 rounded-2xl font-bold text-xs sm:text-sm 2xl:text-base transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] border backdrop-blur-md bg-emerald-500/[0.12] hover:bg-emerald-400/[0.18]"
              style={{
                fontFamily: font,
                fontWeight: 700,
                color: "rgba(255,255,255,0.95)",
                borderColor: "rgba(52,211,153,0.45)",
                boxShadow: "0 6px 24px rgba(16,185,129,0.15), inset 0 1px 0 rgba(255,255,255,0.06)",
              }}
            >
              <Sparkles size={18} className="shrink-0 text-emerald-300" strokeWidth={2.25} />
              <span className="text-center leading-snug">
                Services <span className="opacity-90 font-semibold">&amp; Tools</span>
              </span>
            </Link>

          </div>

          {/* Stats badges */}
          <div className="flex flex-wrap gap-2 w-full" style={{ fontFamily: font }}>
            {[
              { val: "500+", label: "Schools" },
              { val: "50,000+", label: "Teachers" },
              { val: "2M+", label: "Students" },
              { val: "Free", label: "To Access" },
            ].map(s => (
              <div
                key={s.label}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl"
                style={{
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.1)",
                }}
              >
                <span className="font-bold text-base" style={{ color: "#FBBF24" }}>{s.val}</span>
                <span className="text-xs font-medium" style={{ color: "rgba(255,255,255,0.4)" }}>{s.label}</span>
              </div>
            ))}
          </div>

          <BabyeyiAIBox />
        </div>

        {/* Service/tool cards removed from landing. See `/services` for the full catalog. */}
      </div>

      {/* Scroll chevron */}
      <div className="absolute bottom-7 left-1/2 -translate-x-1/2 opacity-30 animate-bounce z-10 pointer-events-none">
        <ChevronDown size={20} className="text-amber-400" />
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </section>
  );
}

// ─── FEATURES ────────────────────────────────────────────────────────────────
function FeaturesSection() {
  const features = [
    { icon: <Globe size={22} />, title: "School Mini-Websites", desc: "Every school gets a professional, fully customizable website with their own branding, domain slug, and content.", color: "#3B82F6" },
    { icon: <Users size={22} />, title: "Parent Engagement", desc: "Parents can follow school updates, view announcements, track academic programs, and stay connected.", color: "#10B981" },
    { icon: <BookOpen size={22} />, title: "Academic Programs", desc: "View A-Level combinations, TVET trades, education levels, and detailed curriculum information.", color: "#8B5CF6" },
    { icon: <Bell size={22} />, title: "Events & Announcements", desc: "Schools can post important dates, events, and announcements that reach parents instantly.", color: "#F59E0B" },
    { icon: <Search size={22} />, title: "Advanced School Search", desc: "Find any school in Rwanda by name, district, sector, education level, or TVET trade.", color: "#EC4899" },
    { icon: <GraduationCap size={22} />, title: "Online Admissions", desc: "Schools create custom admission forms. Students apply online and receive reference numbers instantly.", color: "#F97316" },
    { icon: <BarChart3 size={22} />, title: "Transparent Information", desc: "Fee structures, leadership teams, and school details are public and up-to-date.", color: "#06B6D4" },
    { icon: <Shield size={22} />, title: "Secure & Reliable", desc: "Built for Rwandan schools with secure data handling, reliable uptime, and mobile-first design.", color: "#84CC16" },
    { icon: <Smartphone size={22} />, title: "Mobile Friendly", desc: "Every school website is fully responsive — parents access information on any device, anywhere.", color: "#A855F7" },
    { icon: <Bot size={22} />, title: "Agent Assistant", desc: "An in-platform assistant to guide parents and schools through payments, admissions, and support questions.", color: "#0EA5E9" },
    { icon: <BookMarked size={22} />, title: "ShulePapeterie", desc: "Dedicated stationery and learning material service to help families prepare learners quickly and affordably.", color: "#F43F5E" },
  ];

  return (
    <section id="features" className="py-24 sm:py-32" style={{ background: "#F9FAFB" }}>
      <div className="max-w-[1700px] mx-auto px-6 sm:px-8 2xl:px-12 3xl:px-16">
        <div className="text-center mb-16">
          <div
            className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.22em] mb-4"
            style={{ fontFamily: "'Montserrat', sans-serif", color: "#D97706" }}
          >
            <span className="w-8 h-px bg-amber-500 block" />
            Platform Features
            <span className="w-8 h-px bg-amber-500 block" />
          </div>
          <h2
            className="text-4xl sm:text-5xl font-black text-gray-900 mb-4"
            style={{ fontFamily: "'Montserrat', sans-serif", letterSpacing: "-0.02em" }}
          >
            Everything Schools Need
          </h2>
          <p className="text-gray-500 text-lg max-w-xl mx-auto" style={{ fontFamily: "'Montserrat', sans-serif" }}>
            A complete digital platform designed for Rwanda's education ecosystem.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((f, i) => (
            <div key={i} className="bg-white rounded-2xl p-7 border border-gray-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-5 transition-transform group-hover:scale-110"
                style={{ background: `${f.color}14`, color: f.color }}>
                {f.icon}
              </div>
              <h3 className="font-bold text-gray-900 text-base mb-2" style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 700 }}>{f.title}</h3>
              <p className="text-gray-500 text-sm leading-relaxed" style={{ fontFamily: "'Montserrat', sans-serif" }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── DEMO SECTION ─────────────────────────────────────────────────────────────
function DemoSection() {
  return (
    <section className="py-24 sm:py-32" style={{ background: "#1F2937" }}>
      <div className="max-w-5xl mx-auto px-6 sm:px-8 text-center">
        <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.22em] mb-4 text-amber-400" style={{ fontFamily: "'Montserrat', sans-serif" }}>
          <span className="w-8 h-px bg-amber-400 block" /> Platform Demo <span className="w-8 h-px bg-amber-400 block" />
        </div>
        <h2 className="text-4xl sm:text-5xl font-black text-white mb-4"
          style={{ fontFamily: "'Montserrat', sans-serif", letterSpacing: "-0.02em" }}>
          See Babyeyi in Action
        </h2>
        <p className="text-white/50 text-lg mb-12 max-w-xl mx-auto" style={{ fontFamily: "'Montserrat', sans-serif" }}>
          Demo video is coming soon.
        </p>
        <div className="relative rounded-2xl overflow-hidden bg-gray-900 border border-white/8 shadow-2xl" style={{ paddingBottom: "56.25%" }}>
          <div className="absolute inset-0 flex flex-col items-center justify-center"
            style={{ background: "linear-gradient(135deg, #1F2937, #374151)" }}>
            <div
              className="relative z-10 px-5 py-2 rounded-full text-xs font-black uppercase tracking-widest"
              style={{ background: "rgba(251,191,36,0.15)", color: "#FBBF24", border: "1px solid rgba(251,191,36,0.35)", fontFamily: "'Montserrat', sans-serif" }}
            >
              Coming Soon
            </div>
            <p className="relative z-10 font-semibold text-sm mt-4" style={{ fontFamily: "'Montserrat', sans-serif", color: "rgba(255,255,255,0.55)" }}>
              Demo video will be available here.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── STATS SECTION ────────────────────────────────────────────────────────────
function StatsSection() {
  return (
    <section className="py-20 sm:py-28" style={{ background: "#111827" }}>
      <div className="max-w-6xl mx-auto px-6 sm:px-8">
        <div className="text-center mb-14">
          <h2 className="text-3xl sm:text-4xl font-black text-white mb-3"
            style={{ fontFamily: "'Montserrat', sans-serif", letterSpacing: "-0.02em" }}>
            Babyeyi by the Numbers
          </h2>
          <p className="text-white/40 text-base" style={{ fontFamily: "'Montserrat', sans-serif" }}>Growing every day across Rwanda</p>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-1 sm:gap-4 rounded-2xl overflow-hidden"
          style={{ background: "rgba(251,191,36,0.05)", border: "1px solid rgba(251,191,36,0.1)" }}>
          <StatCounter target={500} suffix="+" label="Schools" icon={<Building2 size={22} />} color="#FBBF24" />
          <StatCounter target={200000} suffix="+" label="Students" icon={<GraduationCap size={22} />} color="#FBBF24" />
          <StatCounter target={10000} suffix="+" label="Teachers" icon={<Users size={22} />} color="#FBBF24" />
          <StatCounter target={30} suffix="" label="Districts Covered" icon={<MapPin size={22} />} color="#FBBF24" />
        </div>
      </div>
    </section>
  );
}

// ─── HOW IT WORKS ─────────────────────────────────────────────────────────────
function HowItWorksSection() {
  const steps = [
    { step: "01", title: "School Registers", desc: "School administrators register on Babyeyi and set up their profile.", icon: <Building2 size={22} />, color: "#FBBF24" },
    { step: "02", title: "Build Mini-Website", desc: "Use our wizard to add programs, fees, gallery, leadership, and admission forms.", icon: <Layers size={22} />, color: "#FBBF24" },
    { step: "03", title: "Publish & Share", desc: "Publish at school/your-school-name and share with parents.", icon: <Globe size={22} />, color: "#FBBF24" },
    { step: "04", title: "Parents Connect", desc: "Families find your school, view all details, and apply for admission online.", icon: <Heart size={22} />, color: "#FBBF24" },
  ];

  return (
    <section className="py-24 sm:py-32 bg-white">
      <div className="max-w-[1700px] mx-auto px-6 sm:px-8 2xl:px-12 3xl:px-16">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.22em] mb-4" style={{ fontFamily: "'Montserrat', sans-serif", color: "#D97706" }}>
            <span className="w-8 h-px bg-amber-500 block" /> How It Works <span className="w-8 h-px bg-amber-500 block" />
          </div>
          <h2 className="text-4xl sm:text-5xl font-black text-gray-900 mb-4"
            style={{ fontFamily: "'Montserrat', sans-serif", letterSpacing: "-0.02em" }}>
            Simple. Fast. Powerful.
          </h2>
          <p className="text-gray-500 text-lg max-w-xl mx-auto" style={{ fontFamily: "'Montserrat', sans-serif" }}>Get your school online in minutes, not months.</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {steps.map((s, i) => (
            <div key={i} className="relative rounded-2xl p-8 border border-gray-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
              <div className="text-gray-100 mb-4" style={{ fontSize: "3.5rem", fontFamily: "'Montserrat', sans-serif", lineHeight: 1, letterSpacing: "-0.04em" }}>{s.step}</div>
              <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-4"
                style={{ background: "rgba(251,191,36,0.12)", color: "#D97706" }}>{s.icon}</div>
              <h3 className="font-bold text-gray-900 text-base mb-2" style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 700 }}>{s.title}</h3>
              <p className="text-gray-500 text-sm leading-relaxed" style={{ fontFamily: "'Montserrat', sans-serif" }}>{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── TESTIMONIALS ─────────────────────────────────────────────────────────────
function TestimonialsSection() {
  const testimonials = [
    { quote: "Babyeyi has transformed how we communicate with parents. They now have access to all school information at their fingertips.", author: "Jean Pierre Nkurunziza", role: "Headmaster, GS Gahini", initials: "JN", color: "#1F2937" },
    { quote: "As a parent, I love being able to check the school's programs, fee structure, and even apply for my child's admission online.", author: "Ange Uwimana", role: "Parent, Kigali", initials: "AU", color: "#FBBF24" },
    { quote: "The admission system saves so much time. We no longer handle piles of paper applications — everything is digital and organized.", author: "Marie Claire Ingabire", role: "School Secretary, GS Kayonza", initials: "MI", color: "#1F2937" },
  ];

  return (
    <section className="py-24 sm:py-32" style={{ background: "#F9FAFB" }}>
      <div className="max-w-[1700px] mx-auto px-6 sm:px-8 2xl:px-12 3xl:px-16">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.22em] mb-4" style={{ fontFamily: "'Montserrat', sans-serif", color: "#D97706" }}>
            <span className="w-8 h-px bg-amber-500 block" /> Testimonials <span className="w-8 h-px bg-amber-500 block" />
          </div>
          <h2 className="text-4xl sm:text-5xl font-black text-gray-900 mb-4"
            style={{ fontFamily: "'Montserrat', sans-serif", letterSpacing: "-0.02em" }}>
            Trusted by Schools Across Rwanda
          </h2>
        </div>
        <div className="grid md:grid-cols-3 gap-5">
          {testimonials.map((t, i) => (
            <div key={i} className="bg-white rounded-2xl p-8 border border-gray-100 hover:shadow-xl transition-shadow duration-300 relative overflow-hidden">
              <div className="absolute top-5 right-6 text-7xl font-black leading-none text-gray-50" aria-hidden>❝</div>
              <div className="flex gap-1 mb-5">
                {[...Array(5)].map((_, j) => <Star key={j} size={13} className="fill-amber-400 text-amber-400" />)}
              </div>
              <p className="text-gray-600 text-sm leading-relaxed mb-6 relative z-10" style={{ fontFamily: "'Montserrat', sans-serif" }}>"{t.quote}"</p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm"
                  style={{ background: t.color, color: t.color === "#FBBF24" ? "#1F2937" : "white", fontFamily: "'Montserrat', sans-serif" }}>{t.initials}</div>
                <div>
                  <div className="font-bold text-gray-900 text-sm" style={{ fontFamily: "'Montserrat', sans-serif" }}>{t.author}</div>
                  <div className="text-gray-400 text-xs" style={{ fontFamily: "'Montserrat', sans-serif" }}>{t.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── NEWS ─────────────────────────────────────────────────────────────────────
function NewsSection() {
  const font = "'Montserrat', sans-serif";
  const [open, setOpen] = useState(null);

  const posts = [
    {
      id: "1",
      category: "Curriculum",
      title: "New Competence-Based Curriculum Updates for 2025",
      excerpt: "Rwanda's REB has released updated guidelines for the CBC framework, affecting all secondary schools starting next term.",
      body: "Rwanda's REB has released updated guidelines for the Competence-Based Curriculum (CBC). Schools are aligning lesson plans and assessment practices with the new framework. Parents should expect clearer learning outcomes and competency reports from the next term onward.",
      date: "Mar 8, 2026",
      color: "#3B82F6",
      socialUrl: "https://www.facebook.com/",
      socialLabel: "Discuss on Facebook",
    },
    {
      id: "2",
      category: "TVET",
      title: "Expanding Career Opportunities Through TVET Education",
      excerpt: "Technical and vocational training continues to grow as Rwanda focuses on skills-based workforce development.",
      body: "TVET pathways are expanding across districts with new trades and employer partnerships. Students can explore hands-on careers in ICT, construction, hospitality, and more — with clearer pathways from school to work.",
      date: "Mar 5, 2026",
      color: "#F59E0B",
      socialUrl: "https://twitter.com/",
      socialLabel: "Follow updates on X",
    },
    {
      id: "3",
      category: "Exams",
      title: "National Examination Schedules — What Parents Should Know",
      excerpt: "REB has announced the national exam timetables for primary leaving and senior secondary examinations.",
      body: "National exam timetables are published for primary leaving and senior secondary levels. Check dates with your school, plan revision time, and ensure registration details are correct well before deadlines.",
      date: "Feb 28, 2026",
      color: "#10B981",
      socialUrl: "https://www.instagram.com/",
      socialLabel: "See reminders on Instagram",
    },
  ];

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === "Escape") setOpen(null); };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <section className="py-24 sm:py-32 bg-white overflow-x-hidden">
      <div className="max-w-[1700px] mx-auto px-6 sm:px-8 2xl:px-12 3xl:px-16 min-w-0">
        <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4 mb-14">
          <div>
            <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.22em] mb-3" style={{ fontFamily: font, color: "#D97706" }}>
              <span className="w-8 h-px bg-amber-500 block" /> Education News
            </div>
            <h2 className="text-4xl sm:text-5xl font-black text-gray-900"
              style={{ fontFamily: font, letterSpacing: "-0.02em" }}>Latest in Education</h2>
          </div>
          <span className="text-sm font-bold text-gray-400" style={{ fontFamily: font }}>
            Tap a story to read in full
          </span>
        </div>
        <div className="grid md:grid-cols-3 gap-5">
          {posts.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setOpen(p)}
              className="group text-left rounded-2xl border border-gray-100 overflow-hidden hover:shadow-xl transition-all duration-300 cursor-pointer"
            >
              <div className="h-40 flex items-center justify-center relative"
                style={{ background: `linear-gradient(135deg, ${p.color}18, ${p.color}06)` }}>
                <BookMarked size={44} style={{ color: `${p.color}50` }} />
                <span className="absolute top-4 left-4 px-3 py-1.5 rounded-full text-xs font-bold text-white"
                  style={{ background: p.color, fontFamily: font }}>{p.category}</span>
              </div>
              <div className="p-6">
                <div className="text-xs text-gray-400 font-semibold mb-2 flex items-center gap-1.5" style={{ fontFamily: font }}>
                  <Calendar size={11} /> {p.date}
                </div>
                <h3 className="font-bold text-gray-900 text-base mb-3 leading-snug group-hover:text-amber-600 transition-colors"
                  style={{ fontFamily: font, fontWeight: 700 }}>{p.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed" style={{ fontFamily: font }}>{p.excerpt}</p>
                <div className="flex items-center gap-1.5 mt-4 text-amber-600 text-sm font-bold group-hover:gap-2.5 transition-all" style={{ fontFamily: font }}>
                  Read more <ArrowRight size={12} />
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {open && (
        <div className="fixed inset-0 z-[400] flex items-end sm:items-center justify-center p-0 sm:p-6" role="dialog" aria-modal="true" aria-labelledby="public-news-title">
          <button type="button" className="absolute inset-0 bg-black/55 backdrop-blur-sm" aria-label="Close" onClick={() => setOpen(null)} />
          <div className="relative z-10 w-full sm:max-w-lg max-h-[min(90dvh,680px)] flex flex-col rounded-t-3xl sm:rounded-3xl bg-white shadow-2xl border border-gray-100 overflow-hidden">
            <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-gray-100 shrink-0">
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-widest mb-1" style={{ fontFamily: font, color: "#D97706" }}>{open.date}</p>
                <h3 id="public-news-title" className="font-black text-gray-900 text-lg leading-snug pr-2" style={{ fontFamily: font }}>{open.title}</h3>
              </div>
              <button type="button" onClick={() => setOpen(null)} className="shrink-0 p-2 rounded-xl hover:bg-gray-100" aria-label="Close">
                <X size={22} />
              </button>
            </div>
            <div className="overflow-y-auto px-5 py-4 flex-1 min-h-0">
              <p className="text-gray-600 text-sm leading-relaxed whitespace-pre-wrap" style={{ fontFamily: font }}>{open.body || open.excerpt}</p>
              <div className="mt-6 pt-4 border-t border-gray-100 flex flex-col gap-2">
                <p className="text-[10px] font-black uppercase tracking-wider text-gray-400" style={{ fontFamily: font }}>Social</p>
                {open.socialUrl ? (
                  <a
                    href={open.socialUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-sm font-bold text-amber-600 hover:underline"
                    style={{ fontFamily: font }}
                  >
                    <ExternalLink size={14} /> {open.socialLabel || "Open link"}
                  </a>
                ) : null}
                    <p className="text-xs text-gray-500" style={{ fontFamily: font }}>
                      School mini-sites can link each story to Facebook, X, or Instagram posts from the Design → News step in the school manager.
                    </p>
              </div>
            </div>
            <div className="px-5 py-4 border-t border-gray-100 shrink-0">
              <button
                type="button"
                onClick={() => setOpen(null)}
                className="w-full py-3 rounded-2xl font-black text-sm text-white"
                style={{ fontFamily: font, background: "#D97706" }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

// ─── CTA ─────────────────────────────────────────────────────────────────────
function CTASection() {
  const navigate = useNavigate();
  return (
    <section className="py-24 sm:py-32 relative overflow-hidden" style={{ background: "#1F2937" }}>
      <div className="absolute inset-0 opacity-[0.06] pointer-events-none" style={{
        backgroundImage: `linear-gradient(rgba(251,191,36,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(251,191,36,0.8) 1px, transparent 1px)`,
        backgroundSize: "60px 60px",
      }} />
      <div className="absolute top-0 right-0 w-96 h-96 rounded-full opacity-15 blur-[80px] pointer-events-none" style={{ background: "#FBBF24" }} />
      <div className="relative z-10 max-w-3xl mx-auto px-6 sm:px-8 text-center">
        <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.22em] mb-6 text-amber-400" style={{ fontFamily: "'Montserrat', sans-serif" }}>
          <span className="w-8 h-px bg-amber-400 block" /> Get Started Today <span className="w-8 h-px bg-amber-400 block" />
        </div>
        <h2 className="text-4xl sm:text-5xl font-black text-white mb-5"
          style={{ fontFamily: "'Montserrat', sans-serif", letterSpacing: "-0.02em" }}>
          Bring Your School<br />
          <span style={{ color: "#FBBF24", fontStyle: "italic" }}>Online Today</span>
        </h2>
        <p className="text-white/50 text-lg mb-10 max-w-lg mx-auto" style={{ fontFamily: "'Montserrat', sans-serif" }}>
          Join hundreds of Rwandan schools already using Babyeyi to connect with parents and communities.
        </p>
        <div className="w-full max-w-xl mx-auto space-y-4 mb-2">
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <button
              type="button"
              onClick={() => navigate("/schools")}
              className="touch-manipulation flex flex-col sm:flex-row items-center justify-center gap-2 min-h-[3.25rem] sm:min-h-[3.5rem] w-full px-3 py-3.5 rounded-2xl font-bold text-xs sm:text-sm transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg"
              style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 700, background: "linear-gradient(145deg, #FDE68A 0%, #FBBF24 45%, #F59E0B 100%)", color: "#111827", boxShadow: "0 8px 24px rgba(251,191,36,0.35)", border: "1px solid rgba(253,230,138,0.85)" }}
            >
              <Search size={18} strokeWidth={2.25} /> Explore Schools
            </button>
            <Link
              to="/register"
              className="touch-manipulation flex flex-col sm:flex-row items-center justify-center gap-2 min-h-[3.25rem] sm:min-h-[3.5rem] w-full px-3 py-3.5 rounded-2xl font-bold text-xs sm:text-sm border border-white/25 text-white hover:bg-white/10 transition-all"
              style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 700 }}
            >
              <Building2 size={18} strokeWidth={2.25} /> Register Your School
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <Link
              to="/school-manager/login"
              className="touch-manipulation flex flex-col sm:flex-row items-center justify-center gap-2 min-h-[3.25rem] sm:min-h-[3.5rem] w-full px-3 py-3.5 rounded-2xl font-bold text-xs sm:text-sm border border-amber-400/50 text-amber-50 hover:bg-white/8 transition-all"
              style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 700 }}
            >
              <GraduationCap size={18} strokeWidth={2.25} /> School Manager Login
            </Link>
            <Link
              to="/parents/login"
              className="touch-manipulation flex flex-col sm:flex-row items-center justify-center gap-2 min-h-[3.25rem] sm:min-h-[3.5rem] w-full px-3 py-3.5 rounded-2xl font-bold text-xs sm:text-sm border border-white/25 text-white hover:bg-white/10 transition-all"
              style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 700 }}
            >
              <Users size={18} strokeWidth={2.25} /> Parent Login
            </Link>
          </div>
        </div>
        <p className="text-white/25 text-xs mt-5" style={{ fontFamily: "'Montserrat', sans-serif" }}>
          After registration, your school is <span className="text-amber-300">pending</span> until reviewed and <span className="text-emerald-300">approved</span> by a Super Admin.
        </p>
        <p className="text-white/25 text-xs mt-1" style={{ fontFamily: "'Montserrat', sans-serif" }}>No credit card needed · Free for all Rwandan schools</p>
      </div>
    </section>
  );
}

// ─── FOOTER ──────────────────────────────────────────────────────────────────
function LandingFooter() {
  const cols = [
    { title: "Platform", links: [{ label: "About Babyeyi", href: "#about" }, { label: "Features", href: "#features" }, { label: "School Manager Login", href: "/school-manager/login" }, { label: "Parent Login", href: "/parents/login" }, { label: "Staff Login", href: "/login" }, { label: "Pricing", href: "#pricing" }, { label: "How It Works", href: "#how" }] },
    { title: "Schools", links: [{ label: "Search Schools", href: "/schools" }, { label: "Pay by school code", href: "/pay-by-school" }, { label: "Academic Programs", href: "/schools" }, { label: "TVET Trades", href: "/schools" }, { label: "Register School", href: "/register" }] },
    { title: "Support", links: [{ label: "Help Center", href: "#" }, { label: "Contact Us", href: "#contact" }, { label: "FAQs", href: "#" }, { label: "Documentation", href: "#" }] },
    { title: "Legal", links: [{ label: "Privacy Policy", href: "#" }, { label: "Terms of Service", href: "#" }, { label: "Cookie Policy", href: "#" }] },
  ];

  return (
    <footer style={{ background: "#111827" }}>
      <div className="max-w-[1700px] mx-auto px-6 sm:px-8 2xl:px-12 3xl:px-16 pt-16 pb-8">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-10 mb-16">
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg" style={{ background: "linear-gradient(135deg, #FBBF24, #F59E0B)" }}>
                <GraduationCap size={18} style={{ color: "#1F2937" }} />
              </div>
              <div>
                <span className="font-black text-white text-xl" style={{ fontFamily: "'Montserrat', sans-serif" }}>babyeyi</span>
                <span className="text-amber-400 font-black text-xl" style={{ fontFamily: "'Montserrat', sans-serif" }}>.rw</span>
              </div>
            </div>
            <p className="text-gray-500 text-sm leading-relaxed mb-5" style={{ fontFamily: "'Montserrat', sans-serif" }}>
              Connecting schools, parents, and communities.
            </p>
            <div className="flex gap-2">
              {[
                { icon: <Facebook size={14} />, href: "#", bg: "#1877F2" },
                { icon: <Twitter size={14} />, href: "#", bg: "#1DA1F2" },
                { icon: <Instagram size={14} />, href: "#", bg: "#E4405F" },
                { icon: <Youtube size={14} />, href: "#", bg: "#FF0000" },
              ].map((s, i) => (
                <a key={i} href={s.href} className="w-9 h-9 rounded-xl flex items-center justify-center text-white hover:scale-110 transition-transform" style={{ background: s.bg }}>{s.icon}</a>
              ))}
            </div>
          </div>
          {cols.map(col => (
            <div key={col.title}>
              <h4 className="font-bold text-white text-xs mb-4 uppercase tracking-widest" style={{ fontFamily: "'Montserrat', sans-serif" }}>{col.title}</h4>
              <ul className="space-y-2.5">
                {col.links.map(l => (
                  <li key={l.label}>
                    {l.href.startsWith("/") ? (
                      <Link
                        to={l.href}
                        className="text-gray-500 text-sm hover:text-amber-400 transition-colors font-medium" style={{ fontFamily: "'Montserrat', sans-serif" }}
                      >
                        {l.label}
                      </Link>
                    ) : (
                      <a href={l.href} className="text-gray-500 text-sm hover:text-amber-400 transition-colors font-medium" style={{ fontFamily: "'Montserrat', sans-serif" }}>{l.label}</a>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap gap-6 pb-8 border-b border-white/5">
          {[{ icon: <Mail size={13} />, val: "hello@babyeyi.rw" }, { icon: <Phone size={13} />, val: "+250 788 000 000" }, { icon: <MapPin size={13} />, val: "Kigali, Rwanda" }].map(c => (
            <div key={c.val} className="flex items-center gap-2 text-sm text-gray-500 font-medium" style={{ fontFamily: "'Montserrat', sans-serif" }}>
              <span className="text-amber-400">{c.icon}</span> {c.val}
            </div>
          ))}
        </div>
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-gray-600 text-xs" style={{ fontFamily: "'Montserrat', sans-serif" }}>© {new Date().getFullYear()} Babyeyi Rwanda. All rights reserved.</p>
          <p className="text-gray-700 text-xs" style={{ fontFamily: "'Montserrat', sans-serif" }}>Made with ❤️ for Rwanda's schools</p>
        </div>
      </div>
    </footer>
  );
}

// ─── MAIN EXPORT ─────────────────────────────────────────────────────────────
export default function PublicPage() {
  const navigate = useNavigate();
  const goSchools = () => navigate("/schools");

  useEffect(() => {
    document.title = "Babyeyi.rw — Connecting Schools & Communities in Rwanda";
  }, []);

  return (
    <div style={{ fontFamily: "'Montserrat', sans-serif" }}>
      <FontLoader />
      <LandingNav />
      <HeroSection onSearchSchools={goSchools} />
      <FeaturesSection />
      <DemoSection />
      <StatsSection />
      <HowItWorksSection />
      <TestimonialsSection />
      <NewsSection />
      <CTASection />
      <LandingFooter />
    </div>
  );
}