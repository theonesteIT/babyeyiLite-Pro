/**
 * PublicPage.jsx — Babyeyi Landing Page
 * #000435 navy + amber · Tailwind only · Fully responsive (320px → 2560px)
 * Montserrat font · Modern premium design
 */

import { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  GraduationCap, Globe, Users, BookOpen, Bell, Search, Star,
  ArrowRight, MapPin, BarChart3, Shield, Smartphone,
  Menu, X, Building2, Layers, Heart, Sparkles,
  LogIn, Facebook, Twitter, Instagram, Mail, Phone,
  Youtube, CreditCard, Send, Bot, Loader2, Package,
  ExternalLink,
} from "lucide-react";

import Heroimage from "../../assets/logo-bg2.png";
import HeroImageMobile from "../../assets/logo-bg-left.png";
import BabyeyiLogo from "../../assets/1BABYEYI LOGO FINAL.png";
import IconicLogo from "../../assets/PartnersLogo/iconic.png";
import NESLogo from "../../assets/PartnersLogo/Nesa.png";
import MTNLogo from "../../assets/PartnersLogo/mtn.png";
import UmwarimuLogo from "../../assets/PartnersLogo/umwarimu sacco.jpg";
import XentriLogo from "../../assets/PartnersLogo/xentriPay.png";
import AitelLogo from "../../assets/PartnersLogo/Aitel.png";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5100";

/** Full checkout: tuition + requirement items + paid-at-school lines (`PaidAtSchool` with `includeRequirements`). Not the narrow `/paid-at-school` wizard. */
const PUBLIC_COMBINED_PAY_PATH = "/combined-tution-requrement";

/** Logos in `src/assets/partner/` */
function partnersFromAssetsFolder() {
  const mods = import.meta.glob("../../assets/partner/*.{png,jpg,jpeg,svg,webp}", { eager: true });
  return Object.keys(mods)
    .sort((a, b) => a.localeCompare(b))
    .map((path) => {
      const mod = mods[path];
      const raw = mod?.default ?? mod;
      const logo = typeof raw === "string" ? raw : raw?.default;
      const file = path.split("/").pop().replace(/\.[^.]+$/i, "");
      const name = file
        .replace(/^[\d\s_-]+/i, "")
        .replace(/[-_]+/g, " ")
        .trim()
        .replace(/\b\w/g, (c) => c.toUpperCase()) || file;
      return logo ? { name, logo } : null;
    })
    .filter(Boolean);
}

/* ── Font ──────────────────────────────────────────────────────── */
const FontLoader = () => (
  <style>{`
    h1.hero-h1 {
      font-weight: 800 !important;
    }

    b, strong, .font-bold, .font-extrabold, .font-black {
      font-weight: 800 !important;
    }

    :root {
      --navy: #000435;
      --navy-deep: #000120;
      --navy-mid: #000c6b;
      --amber: #FBBF24;
      --amber-lt: #FCD34D;
      --amber-dk: #F59E0B;
    }

    @keyframes shimmer-sweep {
      0%   { background-position: -200% center; }
      100% { background-position:  200% center; }
    }
    @keyframes grain {
      0%,100%{ transform:translate(0,0);   }
      20%    { transform:translate(-1%,2%);}
      40%    { transform:translate(2%,-1%);}
      60%    { transform:translate(-2%,1%);}
      80%    { transform:translate(1%,-2%);}
    }
    @keyframes slide-up {
      from { opacity:0; transform:translateY(28px); }
      to   { opacity:1; transform:translateY(0);    }
    }
    @keyframes fade-in {
      from { opacity:0; } to { opacity:1; }
    }

    .anim-su  { animation: slide-up .7s cubic-bezier(.22,1,.36,1) both; }
    .anim-su2 { animation: slide-up .7s .12s cubic-bezier(.22,1,.36,1) both; }
    .anim-su3 { animation: slide-up .7s .22s cubic-bezier(.22,1,.36,1) both; }
    .anim-su4 { animation: slide-up .7s .35s cubic-bezier(.22,1,.36,1) both; }
    .anim-fi  { animation: fade-in 1s .5s both; }

    .shimmer {
      background: linear-gradient(90deg,#FBBF24 0%,#FDE68A 42%,#FBBF24 58%,#F59E0B 100%);
      background-size: 200% auto;
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      animation: shimmer-sweep 3.5s linear infinite;
      text-shadow: none !important;
      filter: none;
    }

    /* Noise grain — z-index:-1 so it never masks image layers */
    .noise::after {
      content:'';
      position:absolute;
      inset:0;
      z-index:0;
      opacity:.018;
      background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
      pointer-events:none;
      animation: grain 9s steps(10) infinite;
    }

    .stat-num {
      background: linear-gradient(135deg,#FBBF24,#FDE68A);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    /* Dot grid — used in demo/cta sections only, NOT hero */
    .dot-grid {
      background-image: radial-gradient(circle, rgba(251,191,36,.1) 1px, transparent 1px);
      background-size: 28px 28px;
    }

    .gb { position: relative; }
    .gb::before {
      content:'';
      position:absolute;
      inset:0;
      border-radius:inherit;
      padding:1px;
      background: linear-gradient(135deg,rgba(251,191,36,.5),rgba(251,191,36,.08),rgba(251,191,36,.4));
      -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
      -webkit-mask-composite: xor;
      mask-composite: exclude;
      pointer-events:none;
    }

    .sep { height:1px; background:linear-gradient(90deg,transparent,rgba(251,191,36,.22),transparent); }

    .btn-shine { position:relative; overflow:hidden; }
    .btn-shine::after {
      content:'';
      position:absolute;
      top:0; left:-75%;
      width:50%; height:100%;
      background:linear-gradient(90deg,transparent,rgba(255,255,255,.2),transparent);
      transform: skewX(-20deg);
      transition: left .55s;
    }
    .btn-shine:hover::after { left:130%; }

    /* Partner logos on WHITE background — slight dim + lift on hover */
    .partner-logo-light {
      transition: opacity .28s ease, transform .32s cubic-bezier(.22,1,.36,1), filter .28s ease;
      opacity: .82;
      filter: grayscale(0.15) brightness(0.95);
    }
    .partner-logo-light:hover {
      opacity: 1;
      filter: grayscale(0) brightness(1.05);
      transform: translateY(-4px);
    }
    /* MINEDUC / NESA — full colour, larger, always crisp */
    .partner-logo-light.partner-logo-emphasis {
      opacity: 1;
      filter: none;
    }
    .partner-logo-light.partner-logo-emphasis:hover {
      filter: brightness(1.02);
      transform: translateY(-3px);
    }

    ::-webkit-scrollbar       { width:5px; }
    ::-webkit-scrollbar-track { background:#000435; }
    ::-webkit-scrollbar-thumb { background:rgba(251,191,36,.4); border-radius:3px; }
  `}</style>
);

/* ── Counter ───────────────────────────────────────────────────── */
function useCounter(target, duration = 1800) {
  const [count, setCount] = useState(0);
  const [started, setStarted] = useState(false);
  useEffect(() => {
    if (!started) return;
    let s = null;
    const step = (ts) => {
      if (!s) s = ts;
      const p = Math.min((ts - s) / duration, 1);
      setCount(Math.floor((1 - Math.pow(1 - p, 3)) * target));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [started, target, duration]);
  return [count, () => setStarted(true)];
}

function useVisible(ref) {
  const [v, setV] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setV(true); obs.disconnect(); }
    }, { threshold: 0.15 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);
  return v;
}

/* ── Navbar ────────────────────────────────────────────────────── */
function Navbar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);

  const links = [
    { label: "Home page", href: "/" },
    { label: "Pay Fees",  href: PUBLIC_COMBINED_PAY_PATH },
    { label: "Services",  href: "/services" },
    { label: "Features",  href: "/features" },
    { label: "Schools",   href: "/schools" },
  ];

  return (
    <nav
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-500 ${
        scrolled ? "bg-[#000435] shadow-[0_4px_32px_rgba(0,0,0,.5)]" : "bg-[#000435]/90 backdrop-blur-xl"
      }`}
      style={{ borderBottom: "1px solid rgba(251,191,36,0.18)" }}
    >
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 xl:px-10 2xl:px-16 flex items-center justify-between h-14 sm:h-[62px] xl:h-[70px]">
        <Link to="/" className="flex items-center shrink-0 group">
          <img
            src={BabyeyiLogo}
            alt="Babyeyi logo"
            onError={(e) => {
              e.currentTarget.onerror = null;
              e.currentTarget.src = "/1BABYEYI LOGO FINAL.png";
            }}
            className="h-9 sm:h-10 xl:h-[42px] w-auto object-contain transition-all duration-300 group-hover:brightness-110" />
        </Link>

        <div className="hidden lg:flex items-center">
          {links.map((l) => (
            <Link key={l.label} to={l.href}
              className="relative px-3.5 xl:px-4 py-2 text-[13.5px] xl:text-[14px] font-semibold text-white/55 hover:text-amber-400 transition-colors duration-200 group">
              {l.label}
              <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 h-[1.5px] w-0 bg-amber-400 rounded-full transition-all duration-300 group-hover:w-3/4" />
            </Link>
          ))}
        </div>

        <div className="hidden lg:flex items-center gap-3">
          <Link to="/register"
            className="px-4 py-2 rounded-xl text-[13px] font-semibold text-white/60 border border-white/10 hover:border-amber-400/50 hover:text-amber-400 transition-all duration-200">
            Register School
          </Link>
          <Link to="/login-portal-select"
            className="btn-shine inline-flex items-center gap-2 min-h-[40px] xl:min-h-[42px] px-5 xl:px-6 rounded-xl font-black text-[13px] xl:text-[14px] text-[#000435] transition-all duration-200 hover:shadow-[0_4px_20px_rgba(251,191,36,.4)] active:scale-[.97]"
            style={{ background: "linear-gradient(135deg,#FBBF24 0%,#F59E0B 100%)" }}>
            <LogIn size={14} strokeWidth={2.5} />Login
          </Link>
        </div>

        <div className="flex lg:hidden items-center gap-2">
          <Link to="/login-portal-select"
            className="btn-shine inline-flex items-center gap-1.5 h-9 px-3.5 rounded-xl text-[#000435] text-[12px] font-black"
            style={{ background: "linear-gradient(135deg,#FBBF24,#F59E0B)" }}>
            <LogIn size={13} strokeWidth={2.5} /> Login
          </Link>
          <button type="button" onClick={() => setOpen(!open)}
            className="w-9 h-9 rounded-xl flex items-center justify-center transition-colors"
            style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}>
            {open ? <X size={17} className="text-white" /> : <Menu size={17} className="text-white" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="lg:hidden bg-[#000120] border-t px-4 pb-5 pt-2 space-y-1"
          style={{ borderColor: "rgba(251,191,36,0.12)" }}>
          {links.map((l) => (
            <Link key={l.label} to={l.href} onClick={() => setOpen(false)}
              className="flex px-4 py-3 rounded-xl text-[14px] font-semibold text-white/65 hover:bg-white/6 hover:text-amber-400 transition-all">
              {l.label}
            </Link>
          ))}
          <div className="pt-2 space-y-2">
            <Link to="/register" onClick={() => setOpen(false)}
              className="flex items-center justify-center gap-2 w-full px-4 py-3 rounded-xl border text-amber-400 text-[14px] font-bold transition-all hover:bg-amber-400/8"
              style={{ borderColor: "rgba(251,191,36,0.35)" }}>
              Register School
            </Link>
            <Link to="/login-portal-select" onClick={() => setOpen(false)}
              className="btn-shine flex items-center justify-center gap-2 w-full px-4 py-3.5 rounded-xl text-[#000435] text-[14px] font-black"
              style={{ background: "linear-gradient(135deg,#FBBF24,#F59E0B)" }}>
              <LogIn size={16} strokeWidth={2.5} /> Login to Babyeyi
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}

/* ── AI Search Box ─────────────────────────────────────────────── */
function AISearchBox() {
  const [val, setVal] = useState("");
  const [ph, setPh] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [err, setErr] = useState(null);
  const timer = useRef(null);
  const pi = useRef(0); const ci = useRef(0);

  const prompts = [
    "Enter student code or SDM ID (e.g. BEY123456789)…",
    "Find me a good school in Musanze with TVET programs…",
    "Which schools offer A-Level Sciences near Kigali?",
    "Look up my child's Babyeyi student UID…",
  ];

  useEffect(() => {
    const type = () => {
      const cur = prompts[pi.current];
      if (ci.current < cur.length) {
        setPh(cur.slice(0, ci.current + 1)); ci.current++;
        timer.current = setTimeout(type, 45);
      } else {
        timer.current = setTimeout(() => {
          const e = () => {
            if (ci.current > 0) { ci.current--; setPh(cur.slice(0, ci.current)); timer.current = setTimeout(e, 22); }
            else { pi.current = (pi.current + 1) % prompts.length; timer.current = setTimeout(type, 400); }
          };
          e();
        }, 2200);
      }
    };
    timer.current = setTimeout(type, 800);
    return () => clearTimeout(timer.current);
  }, []);

  const lookup = async () => {
    const q = val.trim(); setErr(null); setResult(null);
    if (!q) { setErr("Enter a student UID, code, or school directory code."); return; }
    setLoading(true);
    try {
      const r = await fetch(`${API_BASE}/api/public/student-code-lookup`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code: q }) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || j.success === false) { setErr(j.message || "Lookup failed."); return; }
      if (j.found) { setResult({ data: j.data, lookupCode: q }); return; }
      const sr = await fetch(`${API_BASE}/api/public/public-pay/school-catalog`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ school_code: q }) });
      const sj = await sr.json().catch(() => ({}));
      if (sr.ok && sj.success && sj.data?.school) { setResult({ school: sj.data, lookupCode: q }); return; }
      setResult({ notFound: true });
    } catch { setErr("Network error — check your connection."); }
    finally { setLoading(false); }
  };

  return (
    <div className="w-full max-w-[760px] xl:max-w-[860px] mt-0">
      <div className="flex items-center gap-2 mb-2.5 pl-1">
        {[0, 200, 400].map((d) => (
          <span key={d} className="w-1.5 h-1.5 rounded-full bg-[#000435] animate-pulse" style={{ animationDelay: `${d}ms` }} />
        ))}
        <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-[0.14em] sm:tracking-[0.18em] text-[#000435]">
          SDMS Code / ShuleCard ID
        </span>
      </div>

      <div
        className="flex items-center gap-2 sm:gap-2.5 p-2 sm:p-2.5 rounded-2xl sm:rounded-3xl"
        style={{
          border: "2px solid #000435",
          background: "rgba(251,191,36,0.35)",
          boxShadow: "0 8px 24px rgba(0,4,53,0.15)",
          backdropFilter: "blur(10px)",
        }}
      >
        <div
          className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: "#000435" }}
        >
          <Bot size={17} className="text-amber-400" />
        </div>
        <input
          type="text" value={val}
          onChange={(e) => { setVal(e.target.value); setErr(null); setResult(null); }}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); lookup(); } }}
          placeholder={ph || "Student code or question…"}
          className="flex-1 min-w-0 rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 text-[13px] sm:text-[14px] text-[#000435] placeholder:text-slate-400 outline-none"
          style={{
            background: "rgba(255,255,255,0.95)",
            border: "1px solid rgba(0,4,53,0.15)",
            caretColor: "#F59E0B",
          }}
        />
        <button
          type="button"
          onClick={lookup}
          disabled={loading}
          className="shrink-0 w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center transition-all disabled:opacity-70"
          style={{
            background: "linear-gradient(135deg,#FBBF24,#F59E0B)",
            border: "1px solid rgba(0,4,53,0.25)",
          }}>
          {loading
            ? <Loader2 size={16} className="animate-spin text-[#000435]" />
            : <Send size={15} className="text-[#000435]" strokeWidth={2.8} />}
        </button>
      </div>

      {err && <p className="text-[12px] text-amber-200/75 font-medium mt-2 pl-1">{err}</p>}

      {result && (
        <div className="fixed inset-0 z-[300] flex items-end sm:items-center justify-center p-0 sm:p-6">
          <button type="button" aria-label="Close" className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setResult(null)} />
          <div className="relative z-10 w-full sm:max-w-lg max-h-[88dvh] flex flex-col rounded-t-3xl sm:rounded-3xl overflow-hidden"
            style={{ background: "#000435", border: "2px solid rgba(251,191,36,0.3)", boxShadow: "0 32px 80px rgba(0,0,0,.8)" }}>
            <div className="flex items-center justify-between gap-2 px-5 py-4 shrink-0"
              style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
              <div className="flex items-center gap-2">
                <GraduationCap size={17} className="text-amber-400" />
                <span className="text-[14px] font-black text-white">
                  {result.data ? "Learner Profile" : result.school ? "School Details" : "No Match Found"}
                </span>
              </div>
              <button type="button" onClick={() => setResult(null)} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors">
                <X size={18} className="text-white/60" />
              </button>
            </div>
            <div className="overflow-y-auto px-5 py-5 flex-1 space-y-3">
              {result.notFound && (
                <div>
                  <p className="text-[15px] font-bold text-white mb-2">No Learner or School Found</p>
                  <p className="text-[13px] text-white/55 leading-relaxed mb-4">Check the student UID, official code, or school directory code.</p>
                  <Link to="/schools" onClick={() => setResult(null)}
                    className="btn-shine inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-[13px] font-black text-[#000435]"
                    style={{ background: "linear-gradient(135deg,#FBBF24,#F59E0B)" }}>
                    Find a School
                  </Link>
                </div>
              )}
              {(result.data || result.school) && (
                <div className="rounded-xl p-4 space-y-3"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
                  {(result.data
                    ? [["Student", `${result.data.first_name || ""} ${result.data.last_name || ""}`.trim()], ["UID", result.data.student_uid || "—"], ["Class", result.data.class_name || "—"], ["School", result.data.school_name || "—"]]
                    : result.school
                    ? [["School", result.school.school?.school_name || "—"], ["Code", result.school.school?.school_code || "—"], ["Location", [result.school.school?.district, result.school.school?.province].filter(Boolean).join(", ") || "—"]]
                    : []
                  ).map(([k, v]) => (
                    <div key={k} className="flex justify-between gap-3 pb-2 last:pb-0"
                      style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                      <span className="text-[10.5px] font-black uppercase tracking-wider text-white/40">{k}</span>
                      <span className="text-[13px] font-semibold text-white text-right">{v}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="px-5 py-4 shrink-0 space-y-2.5" style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}>
              {result.data && (() => {
                const st = String(result.data.student_uid || result.data.student_code || result.data.sdm_code || "").trim();
                const payHref = st
                  ? `${PUBLIC_COMBINED_PAY_PATH}?code=${encodeURIComponent(st)}`
                  : PUBLIC_COMBINED_PAY_PATH;
                const slug = String(result.data.mini_website_slug || "").trim();
                return (
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Link to={payHref} onClick={() => setResult(null)}
                      className="btn-shine inline-flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-3 text-[13px] font-black text-[#000435] transition-colors"
                      style={{ background: "linear-gradient(135deg,#FBBF24,#F59E0B)" }}>
                      <CreditCard size={15} strokeWidth={2.5} /> Pay fees for this student
                    </Link>
                    {slug ? (
                      <Link to={`/school/${encodeURIComponent(slug)}`} onClick={() => setResult(null)}
                        className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-3 text-[13px] font-black text-white transition-colors hover:bg-white/15"
                        style={{ border: "1.5px solid rgba(251,191,36,0.4)", background: "rgba(255,255,255,0.07)" }}>
                        <Globe size={15} strokeWidth={2.2} /> School mini-website <ExternalLink size={13} className="opacity-60" />
                      </Link>
                    ) : (
                      <div className="flex flex-1 items-center justify-center rounded-xl px-3 py-2.5 text-[11px] font-medium text-white/40 text-center"
                        style={{ border: "1px dashed rgba(255,255,255,0.15)" }}>
                        Mini-website not published yet
                      </div>
                    )}
                  </div>
                );
              })()}
              {result.school && !result.data && (() => {
                const code = String(result.lookupCode || "").trim();
                const payHref = code
                  ? `${PUBLIC_COMBINED_PAY_PATH}?code=${encodeURIComponent(code)}`
                  : PUBLIC_COMBINED_PAY_PATH;
                return (
                  <div className="flex flex-col gap-2">
                    <Link to={payHref} onClick={() => setResult(null)}
                      className="btn-shine inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-[13px] font-black text-[#000435] transition-colors"
                      style={{ background: "linear-gradient(135deg,#FBBF24,#F59E0B)" }}>
                      <CreditCard size={15} strokeWidth={2.5} /> Pay fees (full checkout)
                    </Link>
                    <p className="text-[11px] text-white/45 text-center leading-snug px-1">
                      Tuition, school requirements, and paid-at-school items — use your student code when asked.
                    </p>
                  </div>
                );
              })()}
              <button type="button" onClick={() => setResult(null)}
                className="w-full py-3 rounded-xl text-white text-[13px] font-bold transition-colors hover:bg-white/12"
                style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)" }}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Hero ──────────────────────────────────────────────────────── */
function HeroSection() {
  return (
    <section className="relative w-full overflow-hidden pt-14 sm:pt-[62px] xl:pt-[70px]" style={{ minHeight: "100svh" }}>

      {/* ── Desktop BG image (sm+) ── */}
      <div className="absolute inset-0 z-0 pointer-events-none hidden sm:block"
        style={{
          backgroundImage: `url(${Heroimage})`,
          backgroundSize: "cover",
          backgroundPosition: "center top",
        }} />

      {/* ── Mobile BG image ──
           The mother & child figures sit in the LEFT ~28% of the wide landscape source.
           Using background-position "22% center" pulls them rightward into the viewport
           so they are clearly centred on a 320–640px screen without cropping their faces.
      ── */}
      <div
        className="absolute inset-0 z-0 pointer-events-none sm:hidden"
        style={{
          backgroundImage: `url(${HeroImageMobile})`,
          backgroundSize: "cover",
          backgroundPosition: "22% center",
          backgroundRepeat: "no-repeat",
          transform: "translateZ(0)",
          WebkitTransform: "translateZ(0)",
        }}
      />

      {/* Desktop overlay */}
      <div className="absolute inset-0 z-[1] pointer-events-none hidden sm:block"
        />

      {/* Mobile overlay — lighter so the amber BG + figures remain vivid */}
      <div className="absolute inset-0 z-[1] pointer-events-none sm:hidden"
         />

      {/* NO grid lines on hero — removed as requested */}

      {/* Amber radial bloom top-right (desktop only) */}
      <div className="absolute -top-40 -right-40 w-[600px] h-[600px] rounded-full pointer-events-none z-[2] hidden lg:block"
        />

      {/* Content — on mobile, block starts lower (not vertically centered) */}
      <div className="relative z-[11] max-w-[1400px] mx-auto px-4 sm:px-6 xl:px-10 2xl:px-16 flex flex-col justify-start sm:justify-center py-8 sm:py-20 xl:py-24"
        style={{ minHeight: "calc(100svh - 70px)" }}>
        {/*
          MOBILE ONLY — push hero (h1 + buttons + search) further DOWN the screen:
          Edit the clamp() in the class on the next line:
            clamp(MIN_REM, VIEWPORT_PART, MAX_REM)
            • Raise MIN_REM  → never less than this inset from the top
            • Raise middle   → more push on taller phones (try 18svh … 28svh)
            • Raise MAX_REM  → cap how far down it can go
          sm:mt-0 resets this on tablet/desktop so layout there stays unchanged.
        */}
        <div className="w-full max-w-[min(100%,540px)] sm:max-w-[600px] xl:max-w-[700px] 2xl:max-w-[780px] mt-[clamp(8rem,65svh,14rem)] sm:mt-0">

          {/* H1 — hidden on mobile as requested */}
          <h1
            className="hero-h1 anim-su2 leading-[1.08] mb-4 sm:mb-6"
            style={{
              fontSize: "clamp(1.55rem, 5vw, 3rem)",
              color: "#ffffff",
              letterSpacing: "-0.02em",
              fontWeight: 500,
              
            }}
          >
            An Integrated{" "}
            <span className="text-white">Digital Platform for Equitable</span>
            <br className="hidden sm:block" />
            {"School Readiness "} {" "}
            <span className="text-white"></span>
          </h1>

          {/* Hero cards (4 only) */}
          <div className="anim-su4 flex flex-col gap-2.5 sm:gap-3 w-full sm:max-w-[clamp(300px,90vw,490px)]">
            <div className="grid grid-cols-2 gap-2 sm:gap-3">
              <Link to={PUBLIC_COMBINED_PAY_PATH}
                className="btn-shine inline-flex items-center justify-center gap-1.5 sm:gap-2 rounded-2xl font-black text-amber-400 transition-all active:scale-[.97] hover:shadow-[0_8px_28px_rgba(251,191,36,.4)]"
                style={{ minHeight: "clamp(44px,5.5vw,56px)", fontSize: "clamp(11px,2.8vw,15px)", background: "#000435" }}>
                <CreditCard size={14} strokeWidth={2.5} className="shrink-0" /> Pay Fees
              </Link>
              <a href="/parents/login"
                className="inline-flex items-center justify-center gap-1.5 sm:gap-2 rounded-2xl font-black text-white transition-all hover:bg-white/8"
                style={{ minHeight: "clamp(44px,5.5vw,56px)", fontSize: "clamp(11px,2.8vw,15px)", background: "#000435" }}>
                <LogIn size={14} className="text-amber-300 shrink-0" /> Parent Login
              </a>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:gap-3">
              <Link to="/register"
                className="inline-flex items-center justify-center gap-1.5 sm:gap-2 rounded-2xl font-semibold text-white transition-all hover:bg-amber-400/14"
                style={{ minHeight: "clamp(42px,5vw,52px)", fontSize: "clamp(10.5px,2.6vw,14px)",background: "#000435" }}>
                <Building2 size={14} className="text-amber-400 shrink-0" /> Register School
              </Link>
              <Link to="/services"
                className="inline-flex items-center justify-center gap-1.5 sm:gap-2 rounded-2xl font-semibold text-white transition-all hover:bg-white/10"
                style={{ minHeight: "clamp(42px,5vw,52px)", fontSize: "clamp(10.5px,2.6vw,14px)", background: "#000435" }}>
                <Sparkles size={14} className="text-amber-200/80 shrink-0" /> Tools & Services
              </Link>
            </div>
          </div>

          <div className="mt-6 sm:mt-7 w-full">
            <AISearchBox />
          </div>
        </div>
      </div>

    </section>
  );
}

/* ── Section Header ────────────────────────────────────────────── */
function SH({ eyebrow, title, sub, light = false }) {
  return (
    <div className="text-center mb-10 sm:mb-14 xl:mb-16">
      <div className={`inline-flex items-center gap-2 text-[10.5px] font-black uppercase tracking-[0.2em] mb-4 ${light ? "text-amber-400" : "text-amber-600"}`}>
        <span className={`w-8 h-px ${light ? "bg-amber-400" : "bg-amber-500"}`} />
        {eyebrow}
        <span className={`w-8 h-px ${light ? "bg-amber-400" : "bg-amber-500"}`} />
      </div>
      <h2 className={`font-black tracking-tight mb-3 ${light ? "text-white" : "text-[#000435]"}`}
        style={{ fontSize: "clamp(1.55rem, 3.2vw, 2.7rem)", letterSpacing: "-0.025em" }}>
        {title}
      </h2>
      {sub && (
        <p className={`max-w-lg xl:max-w-xl mx-auto ${light ? "text-white/45" : "text-slate-500"}`}
          style={{ fontSize: "clamp(14px,1.4vw,16px)" }}>
          {sub}
        </p>
      )}
    </div>
  );
}

/* ── How It Works ──────────────────────────────────────────────── */
function HowItWorksSection() {
  const ss = [
    { step: "01", title: "School Registers", desc: "School administrators register on Babyeyi and set up their profile in minutes.", Icon: Building2 },
    { step: "02", title: "Build Mini-Website", desc: "Use the guided wizard to add programs, fees, gallery, leadership, and admissions.", Icon: Layers },
    { step: "03", title: "Publish & Share", desc: "Publish your school page and share one link with families and your community.", Icon: Globe },
    { step: "04", title: "Families Engage", desc: "Parents discover your school, review details, and apply or pay online.", Icon: Heart },
  ];
  return (
    <section id="how" className="py-16 sm:py-24 xl:py-32 bg-white">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 xl:px-10 2xl:px-16">
        <SH eyebrow="How It Works" title="Simple. Fast. Powerful." sub="A modern flow built to be clear on every screen size." />
        <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4 xl:gap-6">
          {ss.map((s, i) => (
            <div key={i}
              className="group relative rounded-2xl p-6 xl:p-8 hover:-translate-y-1 transition-all duration-300"
              style={{ border: "1px solid #f1f5f9", background: "linear-gradient(145deg,#ffffff,#f8fafc)" }}
              onMouseEnter={(e) => e.currentTarget.style.borderColor = "#FBBF24"}
              onMouseLeave={(e) => e.currentTarget.style.borderColor = "#f1f5f9"}>
              <span className="font-black text-slate-100 leading-none mb-4 block select-none"
                style={{ fontSize: "3.5rem", letterSpacing: "-0.05em" }}>{s.step}</span>
              <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-4 transition-all duration-300 group-hover:scale-105"
                style={{ background: "rgba(251,191,36,0.1)", border: "1.5px solid rgba(251,191,36,0.2)" }}>
                <s.Icon size={20} className="text-amber-500 group-hover:text-amber-600 transition-colors" />
              </div>
              <h3 className="font-black text-[#000435] mb-2" style={{ fontSize: "clamp(14px,1.2vw,16px)" }}>{s.title}</h3>
              <p className="text-slate-500 leading-relaxed" style={{ fontSize: "clamp(12px,1vw,13.5px)" }}>{s.desc}</p>
              {i < ss.length - 1 && (
                <ArrowRight size={17} className="absolute top-1/2 -right-3 -translate-y-1/2 text-amber-300 hidden xl:block" />
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── Demo Video ────────────────────────────────────────────────── */
function DemoSection() {
  return (
    <section className="py-16 sm:py-24 xl:py-32 bg-[#000120]">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 xl:px-10 2xl:px-16">
        <SH eyebrow="Platform Demo" title="See Babyeyi in Action" light sub="Demo video is coming soon." />
        <div className="relative rounded-3xl overflow-hidden shadow-2xl" style={{ paddingBottom: "56.25%", border: "1px solid rgba(251,191,36,0.15)" }}>
          <div className="absolute inset-0 flex flex-col items-center justify-center"
            style={{ background: "linear-gradient(135deg,#000435 0%,#000c6b 100%)" }}>
            <div className="dot-grid absolute inset-0 opacity-60" />
            <div className="relative z-10 flex flex-col items-center gap-4">
              <div className="w-16 h-16 rounded-full flex items-center justify-center"
                style={{ background: "rgba(251,191,36,0.1)", border: "1.5px solid rgba(251,191,36,0.3)" }}>
                <Youtube size={28} className="text-amber-400" />
              </div>
              <span className="px-5 py-1.5 rounded-full text-[11px] font-black uppercase tracking-[0.18em] text-amber-400"
                style={{ border: "1px solid rgba(251,191,36,0.3)", background: "rgba(251,191,36,0.08)" }}>
                Coming Soon
              </span>
              <p className="text-[13px] font-medium text-white/40">Demo video will be available here.</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── Stats Section ─────────────────────────────────────────────── */
function StatsSection() {
  const ss = [
    { target: 500,    suffix: "+", label: "Schools",   Icon: Building2     },
    { target: 200000, suffix: "+", label: "Students",  Icon: GraduationCap },
    { target: 10000,  suffix: "+", label: "Teachers",  Icon: Users          },
    { target: 30,     suffix: "",  label: "Districts",  Icon: MapPin         },
  ];
  return (
    <section className="py-16 sm:py-24 xl:py-32 bg-[#000435]">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 xl:px-10 2xl:px-16">
        <SH eyebrow="By the Numbers" title="Growing Every Day" light sub="Trusted by schools and families across all provinces of Rwanda." />
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 xl:gap-6">
          {ss.map((s, i) => {
            const ref = useRef(null);
            const visible = useVisible(ref);
            const [count, start] = useCounter(s.target, 1800);
            useEffect(() => { if (visible) start(); }, [visible]);
            return (
              <div ref={ref} key={i}
                className="gb flex flex-col items-center text-center rounded-2xl p-6 xl:p-8 transition-all duration-300 hover:-translate-y-1"
                style={{ background: "rgba(255,255,255,0.04)" }}>
                <div className="w-12 h-12 xl:w-14 xl:h-14 rounded-2xl flex items-center justify-center mb-5"
                  style={{ background: "rgba(251,191,36,0.1)", border: "1px solid rgba(251,191,36,0.2)" }}>
                  <s.Icon size={22} className="text-amber-400" />
                </div>
                <span className="stat-num font-black leading-none mb-1.5"
                  style={{ fontSize: "clamp(2rem,4vw,3.2rem)" }}>
                  {count.toLocaleString()}{s.suffix}
                </span>
                <span className="text-white/45 font-semibold" style={{ fontSize: "clamp(12px,1vw,14px)" }}>{s.label}</span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ── Testimonials ──────────────────────────────────────────────── */
function TestimonialsSection() {
  const tt = [
    { quote: "Babyeyi has transformed how we communicate with parents. All school information at their fingertips.", author: "Jean Pierre Nkurunziza", role: "Headmaster, GS Gahini", initials: "JN" },
    { quote: "As a parent, I love checking programs, fee structure, and applying for my child's admission online.", author: "Ange Uwimana", role: "Parent, Kigali", initials: "AU" },
    { quote: "The admission system saves so much time. Everything is digital, organised, and instant.", author: "Marie Claire Ingabire", role: "School Secretary, GS Kayonza", initials: "MI" },
  ];
  return (
    <section className="py-16 sm:py-24 xl:py-32 bg-slate-50">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 xl:px-10 2xl:px-16">
        <SH eyebrow="Testimonials" title="Trusted Across Rwanda" sub="Hear from schools and parents already using Babyeyi." />
        <div className="grid md:grid-cols-3 gap-4 xl:gap-6">
          {tt.map((t, i) => (
            <div key={i}
              className="bg-white rounded-2xl p-6 xl:p-8 relative overflow-hidden transition-all duration-300 hover:-translate-y-1"
              style={{ border: "1px solid #f1f5f9" }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#FBBF24"; e.currentTarget.style.boxShadow = "0 12px 40px rgba(251,191,36,0.12)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#f1f5f9"; e.currentTarget.style.boxShadow = "none"; }}>
              <span className="absolute top-3 right-4 font-black leading-none text-slate-50 select-none" style={{ fontSize: "5rem" }}>❝</span>
              <div className="flex gap-0.5 mb-5">
                {[...Array(5)].map((_, j) => <Star key={j} size={13} className="fill-amber-400 text-amber-400" />)}
              </div>
              <p className="text-slate-600 leading-relaxed mb-6 relative z-10" style={{ fontSize: "clamp(13px,1.1vw,14px)" }}>"{t.quote}"</p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-[13px] text-amber-400 shrink-0"
                  style={{ background: "#000435" }}>
                  {t.initials}
                </div>
                <div>
                  <p className="font-black text-[#000435]" style={{ fontSize: "clamp(12px,1vw,13px)" }}>{t.author}</p>
                  <p className="text-slate-400" style={{ fontSize: "clamp(10px,0.8vw,11px)" }}>{t.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── Get Started ───────────────────────────────────────────────── */
function GetStartedSection() {
  const aa = [
    { Icon: CreditCard,    title: "Pay School Fees",     desc: "Tuition, requirements, and paid-at-school lines — one checkout. MTN MoMo. No account needed.", cta: "Pay Now",           href: PUBLIC_COMBINED_PAY_PATH },
    { Icon: Package,       title: "Order a ShuleKit",    desc: "Get your child's school kit — uniforms, shoes, stationery — delivered or collected at school.",    cta: "Shop Services",    href: "/services"      },
    { Icon: Search,        title: "Find a School",       desc: "Search 500+ schools by district, level, or TVET trade. Compare programs, fees, and facilities.",    cta: "Explore Schools",  href: "/schools"       },
    { Icon: GraduationCap, title: "Apply for Admission", desc: "Submit your child's admission application online. Get a reference number instantly.",               cta: "Start Application",href: "/schools"       },
  ];
  return (
    <section className="py-16 sm:py-24 xl:py-32 bg-slate-50">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 xl:px-10 2xl:px-16">
        <SH eyebrow="Get Started" title="What Would You Like to Do?" sub="Modern shortcuts designed for speed, clarity, and mobile-first access." />
        <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4 xl:gap-5">
          {aa.map((a, i) => (
            <div key={i}
              className="group relative rounded-2xl overflow-hidden transition-all duration-300 hover:-translate-y-1 bg-white"
              style={{ border: "1px solid #f1f5f9" }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#FBBF24"; e.currentTarget.style.boxShadow = "0 16px 48px rgba(251,191,36,0.1)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#f1f5f9"; e.currentTarget.style.boxShadow = "none"; }}>
              <div className="p-5 xl:p-6">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-5 transition-transform duration-300 group-hover:scale-105"
                  style={{ background: "rgba(0,4,53,0.06)", border: "1.5px solid rgba(0,4,53,0.1)" }}>
                  <a.Icon size={22} className="text-[#000435]" />
                </div>
                <h3 className="font-black text-[#000435] mb-2" style={{ fontSize: "clamp(14px,1.2vw,17px)" }}>{a.title}</h3>
                <p className="text-slate-500 leading-relaxed mb-5" style={{ fontSize: "clamp(12px,1vw,13.5px)" }}>{a.desc}</p>
                <Link to={a.href}
                  className="btn-shine inline-flex items-center gap-2 rounded-xl px-4 py-2.5 font-black text-[#000435] transition-all hover:shadow-[0_4px_16px_rgba(251,191,36,.35)]"
                  style={{ fontSize: "clamp(12px,1vw,13px)", background: "linear-gradient(135deg,#FBBF24,#F59E0B)", minHeight: "40px" }}>
                  {a.cta} <ArrowRight size={13} />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── Partners — bundled logos from `src/assets/PartnersLogo/` + CDN where no local file ── */
const TRUSTED_PARTNERS = [
   { name: "MTN RWANDA", full: "Mobile Money Payments", logo: MTNLogo },
  { name: "Umwarimu Sacco", full: "Teachers' Sacco", logo: UmwarimuLogo },
  { name: "Iconic", full: "Iconic InnovatorZ", logo: IconicLogo, emphasize: true },
  { name: "NESA", full: "Nat. Exam & School Inspection", logo: NESLogo, emphasize: true },
  { name: "XentriPay", full: "Payments partner", logo: XentriLogo },
  { name: "Airtel", full: "Airtel Rwanda", logo: AitelLogo },
];

function PartnersSection() {
  const fromPartnerDir = partnersFromAssetsFolder();
  const seen = new Set(TRUSTED_PARTNERS.map((p) => p.name.toLowerCase()));
  const extra = fromPartnerDir.filter((p) => p?.name && !seen.has(String(p.name).toLowerCase()));
  const pp = [...TRUSTED_PARTNERS, ...extra];

  return (
    <section className="relative py-16 sm:py-20 xl:py-28 bg-white overflow-hidden"
      style={{ borderTop: "1px solid #f1f5f9", borderBottom: "1px solid #f1f5f9" }}>

      {/* Subtle dot pattern background */}
      <div className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: "radial-gradient(circle, rgba(0,4,53,0.045) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }} />

      <div className="relative max-w-[1200px] mx-auto px-4 sm:px-6 xl:px-10 2xl:px-16">

        {/* Headline */}
        <p className="text-center font-semibold text-[#000435] max-w-2xl mx-auto leading-snug mb-12 sm:mb-14 xl:mb-16"
          style={{ fontSize: "clamp(15px, 1.75vw, 19px)" }}>
          <span style={{ color: "#F59E0B" }}>Trusted</span>
          {" "}by schools, families, and partners across Rwanda — aligned with national education institutions and industry leaders.
        </p>

        {/* ── Partner cards: 3 per row (sm+), 2 per row on narrow phones — modern cards, mobile-first ── */}
        <div
          className="grid w-full max-w-4xl mx-auto grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 md:gap-5 lg:gap-6 auto-rows-fr items-stretch [contain:layout]"
        >
          {pp.map((p, i) => (
            <div
              key={`${p.name}-${i}`}
              className={`
                group relative flex min-h-[138px] flex-col items-center justify-between gap-3
                w-full rounded-2xl bg-gradient-to-b from-white to-slate-50/90
                px-3 py-4 sm:min-h-[160px] sm:px-4 sm:py-5 md:min-h-[176px] md:py-6
                shadow-[0_2px_16px_-4px_rgba(0,4,53,0.07)]
                transition-all duration-300 ease-out
                hover:shadow-[0_16px_40px_-12px_rgba(245,158,11,0.18)] hover:-translate-y-0.5
                active:scale-[0.99] motion-reduce:transition-none motion-reduce:hover:translate-y-0
              `}
            >
              <div
                className="flex min-h-[62px] flex-1 w-full flex-col items-center justify-center sm:min-h-[72px]"
              >
                <img
                  src={p.logo}
                  alt={p.name}
                  className={`partner-logo-light max-h-full w-auto${p.emphasize ? " partner-logo-emphasis" : ""}`}
                  style={{
                    height: p.name === "Iconic"
                      ? "clamp(74px, 18vw, 126px)"
                      : p.emphasize
                        ? "clamp(48px, 12vw, 84px)"
                        : "clamp(34px, 9vw, 56px)",
                    maxHeight: p.name === "Iconic" ? "126px" : (p.emphasize ? "84px" : "56px"),
                    width: "auto",
                    maxWidth: "min(100%, 220px)",
                    objectFit: "contain",
                    objectPosition: "center",
                    display: "block",
                  }}
                  onError={(e) => {
                    e.target.style.display = "none";
                    const fb = e.target.nextElementSibling;
                    if (fb) fb.style.display = "flex";
                  }}
                />

                {/* Initials fallback — shown only when image fails */}
                <div
                  className="flex h-14 w-14 items-center justify-center rounded-xl sm:h-16 sm:w-16 shrink-0"
                  style={{
                    display: "none",
                    background: "rgba(0,4,53,0.05)",
                    fontWeight: 800,
                    fontSize: "clamp(10px,2.8vw,12px)",
                    color: "#F59E0B",
                    letterSpacing: "0.04em",
                  }}
                >
                  {p.name.slice(0, 3).toUpperCase()}
                </div>
              </div>

              <p
                className="w-full text-center font-bold leading-snug text-[#000435]/55 transition-colors duration-200 group-hover:text-amber-600 px-0.5"
                style={{
                  fontSize: "clamp(8.5px, 2.4vw, 11px)",
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                }}
              >
                {p.name}
              </p>
            </div>
          ))}
        </div>

        {/* Bottom rule */}
        <div className="mt-12 sm:mt-16" style={{ height: "1px", background: "linear-gradient(90deg,transparent,rgba(0,4,53,0.1),transparent)" }} />
       
      </div>
    </section>
  );
}

/* ── CTA ───────────────────────────────────────────────────────── */
function CTASection() {
  const navigate = useNavigate();
  return (
    <section className="py-16 sm:py-24 xl:py-32 bg-[#000435] relative overflow-hidden noise">
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: "radial-gradient(ellipse 70% 60% at 50% 50%, rgba(251,191,36,0.07) 0%, transparent 70%)" }} />
      <div className="dot-grid absolute inset-0 pointer-events-none opacity-50" />

      <div className="relative z-10 max-w-3xl xl:max-w-4xl mx-auto px-4 sm:px-6 text-center">
        <div className="inline-flex items-center gap-2 text-[10.5px] font-black uppercase tracking-[0.2em] text-amber-400 mb-5">
          <span className="w-8 h-px bg-amber-400" /> Get Started Today <span className="w-8 h-px bg-amber-400" />
        </div>
        <h2 className="font-black text-white tracking-tight mb-4" style={{ fontSize: "clamp(1.7rem,4.5vw,3.4rem)", letterSpacing: "-0.025em" }}>
          Bring Your School<br />
          <span className="shimmer">Online Today</span>
        </h2>
        <p className="text-white/45 mb-10 max-w-lg mx-auto leading-relaxed" style={{ fontSize: "clamp(14px,1.4vw,16px)" }}>
          Join hundreds of Rwandan schools already using Babyeyi to connect with parents and communities.
        </p>
        <div className="max-w-xl mx-auto space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <button type="button" onClick={() => navigate("/schools")}
              className="btn-shine inline-flex items-center justify-center gap-2 rounded-2xl font-black text-[#000435] transition-all active:scale-[.97] hover:shadow-[0_8px_28px_rgba(251,191,36,.4)]"
              style={{ minHeight: "clamp(48px,5.5vw,56px)", fontSize: "clamp(12px,1.2vw,15px)", background: "linear-gradient(135deg,#FBBF24,#F59E0B)" }}>
              <Search size={16} strokeWidth={2.5} /> Explore Schools
            </button>
            <Link to="/register"
              className="inline-flex items-center justify-center gap-2 rounded-2xl font-black text-white transition-all hover:bg-white/8"
              style={{ minHeight: "clamp(48px,5.5vw,56px)", fontSize: "clamp(12px,1.2vw,15px)" }}>
              <Building2 size={16} className="text-amber-300" /> Register School
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Link to="/login-portal-select"
              className="inline-flex items-center justify-center gap-2 rounded-2xl font-semibold text-white transition-all hover:bg-amber-400/14"
              style={{ minHeight: "clamp(44px,5vw,52px)", fontSize: "clamp(12px,1.1vw,14px)", background: "rgba(251,191,36,0.07)" }}>
              <GraduationCap size={16} className="text-amber-400" /> School Manager
            </Link>
            <Link to="/parents/login"
              className="inline-flex items-center justify-center gap-2 rounded-2xl font-semibold text-white transition-all hover:bg-white/10"
              style={{ minHeight: "clamp(44px,5vw,52px)", fontSize: "clamp(12px,1.1vw,14px)", background: "rgba(255,255,255,0.05)" }}>
              <Users size={16} className="text-amber-200/80" /> Parent Login
            </Link>
          </div>
        </div>
        <p className="text-white/20 mt-6" style={{ fontSize: "clamp(10px,0.85vw,11px)" }}>
          No credit card needed · Free for all Rwandan schools
        </p>
      </div>
    </section>
  );
}

/* ── Footer ────────────────────────────────────────────────────── */
function Footer() {
  const cols = [
    { title: "Platform", links: [{ l: "About Babyeyi", h: "#about" }, { l: "Features", h: "/features", i: true }, { l: "Home page", h: "/", i: true }, { l: "Pricing", h: "#pricing" }] },
    { title: "Schools",  links: [{ l: "Search Schools", h: "/schools", i: true }, { l: "Pay by School Code", h: PUBLIC_COMBINED_PAY_PATH, i: true }, { l: "Register School", h: "/register", i: true }, { l: "TVET Trades", h: "/schools", i: true }] },
    { title: "Accounts", links: [{ l: "School Manager Login", h: "/login-portal-select", i: true }, { l: "Parent Login", h: "/parents/login", i: true }, { l: "Staff Login", h: "/login/lite", i: true }, { l: "Services", h: "/services", i: true }] },
    { title: "Support",  links: [{ l: "Help Center", h: "#" }, { l: "Contact Us", h: "#contact" }, { l: "Privacy Policy", h: "#" }, { l: "Terms of Service", h: "#" }] },
  ];
  return (
    <footer style={{ background: "#000018" }}>
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 xl:px-10 2xl:px-16 pt-12 xl:pt-16 pb-8">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 xl:gap-12 mb-10 xl:mb-14">
          <div className="col-span-2 md:col-span-1">
            <Link to="/" className="flex items-center gap-2.5 mb-4">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ background: "linear-gradient(135deg,#FBBF24,#F59E0B)" }}>
                <GraduationCap size={17} className="text-[#000435]" />
              </div>
              <span className="font-black text-[17px] text-white">
                baby<span className="text-amber-400">eyi</span><span style={{ color: "rgba(251,191,36,0.5)" }}>.rw</span>
              </span>
            </Link>
            <p className="text-slate-600 leading-relaxed mb-5" style={{ fontSize: "clamp(12px,1vw,13px)" }}>
              Connecting schools, parents, and communities.
            </p>
            <div className="flex gap-2">
              {[{ Icon: Facebook, bg: "#1877F2" }, { Icon: Twitter, bg: "#1DA1F2" }, { Icon: Instagram, bg: "#E4405F" }, { Icon: Youtube, bg: "#FF0000" }].map(({ Icon, bg }, i) => (
                <a key={i} href="#"
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-white transition-all hover:scale-110 hover:shadow-lg"
                  style={{ background: bg }}>
                  <Icon size={14} />
                </a>
              ))}
            </div>
          </div>
          {cols.map((col) => (
            <div key={col.title}>
              <h4 className="font-black text-white text-[10.5px] uppercase tracking-[0.12em] mb-4 xl:mb-5">{col.title}</h4>
              <ul className="space-y-2.5">
                {col.links.map(({ l, h, i }) => (
                  <li key={l}>
                    {i
                      ? <Link to={h} className="text-slate-600 font-medium hover:text-amber-400 transition-colors" style={{ fontSize: "clamp(12px,1vw,13px)" }}>{l}</Link>
                      : <a href={h} className="text-slate-600 font-medium hover:text-amber-400 transition-colors" style={{ fontSize: "clamp(12px,1vw,13px)" }}>{l}</a>
                    }
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="sep mb-6" />

        <div className="flex flex-wrap gap-5 mb-6">
          {[{ Icon: Mail, v: "hello@babyeyi.rw" }, { Icon: Phone, v: "+250 788 000 000" }, { Icon: MapPin, v: "Kigali, Rwanda" }].map(({ Icon, v }) => (
            <div key={v} className="flex items-center gap-2 text-slate-600 font-medium" style={{ fontSize: "clamp(12px,1vw,13px)" }}>
              <Icon size={13} className="text-amber-400 shrink-0" /> {v}
            </div>
          ))}
        </div>

        <div className="sep mb-6" />

        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-slate-700" style={{ fontSize: "clamp(10px,0.85vw,12px)" }}>
            © {new Date().getFullYear()} Babyeyi Rwanda. All rights reserved.
          </p>
          <p className="text-slate-800" style={{ fontSize: "clamp(10px,0.85vw,12px)" }}>Made with Edupoto</p>
        </div>
      </div>
    </footer>
  );
}

/* ── Root ──────────────────────────────────────────────────────── */
export default function PublicPage() {
  useEffect(() => {
    document.title = "Babyeyi.rw — Connecting Schools & Communities in Rwanda";
  }, []);

  return (
    <div>
      <FontLoader />
      <Navbar />
      <HeroSection />
      <GetStartedSection />
      {/* <HowItWorksSection /> */}
      <DemoSection />
      <PartnersSection />
      <TestimonialsSection />
      <CTASection />
      <Footer />
    </div>
  );
}