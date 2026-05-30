/**
 * PublicPage.jsx — Babyeyi Landing Page
 * #000435 navy + amber · Tailwind only · Fully responsive (320px → 2560px)
 * Montserrat font · Modern premium design
 */

import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../context/AuthContext";
import BabyeyiPortalLoader from "../../components/BabyeyiPortalLoader";
import {
  GraduationCap, Globe, Users, BookOpen, Bell, Search, Star,
  ArrowRight, MapPin, BarChart3, Shield, Smartphone,
  Menu, X, Building2, Layers, Heart, Sparkles,
  LogIn, Facebook, Twitter, Instagram, Mail, Phone,
  Youtube, CreditCard, Send, Bot, Loader2, Package,
  ExternalLink, ChevronDown,
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
import mobileHero from "../../assets/mobile.png";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5100";
const TEACHER_PORTAL_URL =
  import.meta.env.VITE_TEACHER_PORTAL_URL || "https://ticha.babyeyi.rw";

/** Full checkout: tuition + requirement items + paid-at-school lines (`PaidAtSchool` with `includeRequirements`). Not the narrow `/paid-at-school` wizard. */
const PUBLIC_COMBINED_PAY_PATH = "/combined-tution-requrement";
const PUBLIC_LANGS = ["rw", "en", "fr"];

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

function LanguageSwitcher({ compact = false }) {
  const { t, i18n } = useTranslation();
  const baseLanguage = String(i18n.language || "en").slice(0, 2).toLowerCase();
  const current = PUBLIC_LANGS.includes(baseLanguage) ? baseLanguage : "en";

  return (
    <div
      className={`relative inline-flex items-center gap-2 rounded-xl px-2.5 py-1.5 text-white/90 ${
        compact ? "text-[11px]" : "text-[12px]"
      }`}
      style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.16)" }}
    >
      <Globe size={compact ? 12 : 13} className="text-amber-300" />
      <span className="font-semibold whitespace-nowrap">{t("language.label")}</span>
      <ChevronDown size={compact ? 12 : 13} className="text-white/70" />
      <select
        aria-label={t("language.switcherLabel")}
        value={current}
        onChange={(e) => i18n.changeLanguage(e.target.value)}
        className="absolute inset-0 opacity-0 cursor-pointer"
      >
        <option value="rw" className="text-[#000435]">🇷🇼 {t("language.rw")}</option>
        <option value="en" className="text-[#000435]">🇬🇧 {t("language.en")}</option>
        <option value="fr" className="text-[#000435]">🇫🇷 {t("language.fr")}</option>
      </select>
    </div>
  );
}

/* ── Navbar ────────────────────────────────────────────────────── */
function Navbar() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);

  const links = [
    { label: t("public.homePage"), href: "/" },
    { label: t("public.payFees"), href: PUBLIC_COMBINED_PAY_PATH },
    { label: t("public.services"), href: "/services" },
    { label: t("public.features"), href: "/features" },
    { label: t("public.schools"), href: "/schools" },
  ];

  return (
    <nav
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-500 ${
        scrolled ? "bg-[#000435] shadow-[0_14px_48px_rgba(0,0,0,.5)]" : "bg-[#000435]"
      }`}
      style={{
        borderBottom: "1px solid rgba(251,191,36,0.22)",
        boxShadow: scrolled ? "0 10px 32px rgba(0, 4, 53, 0.4)" : "inset 0 -1px 0 rgba(255,255,255,0.06)",
      }}
    >
      <div className="max-w-[1400px] mx-auto px-3 sm:px-6 xl:px-10 2xl:px-16 flex items-center justify-between gap-1.5 xl:gap-2 h-12 sm:h-[62px] lg:h-14 xl:h-[70px]">
        <Link to="/" className="flex items-center shrink min-w-0 group">
          <img
            src={BabyeyiLogo}
            alt="Babyeyi logo"
            onError={(e) => {
              e.currentTarget.onerror = null;
              e.currentTarget.src = "/1BABYEYI LOGO FINAL.png";
            }}
            className="h-5 max-h-5 w-auto max-w-[74px] object-contain object-left transition-all duration-300 group-hover:brightness-110 sm:h-7 sm:max-h-none sm:max-w-[110px] lg:h-8 xl:h-9" />
        </Link>

        <div className="hidden lg:flex items-center rounded-2xl px-1.5 xl:px-2 py-1"
          style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
          {links.map((l) => (
            <Link key={l.label} to={l.href}
              className="relative px-2.5 xl:px-3 py-2 text-[13px] xl:text-[13.5px] font-semibold text-white hover:text-amber-300 transition-colors duration-200 group">
              {l.label}
              <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 h-[1.5px] w-0 bg-amber-400 rounded-full transition-all duration-300 group-hover:w-3/4" />
            </Link>
          ))}
        </div>

        <div className="hidden lg:flex items-center gap-3">
          <LanguageSwitcher />
          <a
            href={TEACHER_PORTAL_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="group relative inline-flex items-center gap-2 min-h-[40px] xl:min-h-[42px] px-3.5 xl:px-4.5 rounded-xl text-[12px] xl:text-[13px] font-bold text-white overflow-hidden whitespace-nowrap transition-all duration-300 hover:shadow-[0_6px_28px_rgba(56,189,248,0.35)] active:scale-[.97]"
            style={{
              background:
                "linear-gradient(135deg, rgba(14,165,233,0.22) 0%, rgba(99,102,241,0.18) 100%)",
              border: "1px solid rgba(125,211,252,0.45)",
            }}
          >
            <span
              className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
              style={{
                background:
                  "linear-gradient(135deg, rgba(56,189,248,0.35) 0%, rgba(129,140,248,0.28) 100%)",
              }}
              aria-hidden
            />
            <GraduationCap
              size={15}
              strokeWidth={2.5}
              className="relative z-[1] text-sky-200 group-hover:text-white transition-colors"
            />
            <span className="relative z-[1] tracking-tight whitespace-nowrap">{t("public.teacherPortal")}</span>
            <ExternalLink
              size={12}
              strokeWidth={2.5}
              className="relative z-[1] opacity-70 group-hover:opacity-100 transition-opacity"
            />
          </a>
          <Link to="/login-portal-select"
            className="btn-shine inline-flex items-center gap-2 min-h-[40px] xl:min-h-[42px] px-4 xl:px-5 rounded-xl font-black text-[12px] xl:text-[13px] text-[#000435] whitespace-nowrap transition-all duration-200 hover:shadow-[0_4px_20px_rgba(251,191,36,.4)] active:scale-[.97]"
            style={{ background: "linear-gradient(135deg,#FBBF24 0%,#F59E0B 100%)" }}>
            <LogIn size={14} strokeWidth={2.5} />{t("public.shuleManager")}
          </Link>
        </div>

        <div className="flex lg:hidden items-center gap-1.5 shrink-0">
          <Link to="/login-portal-select"
            className="btn-shine inline-flex items-center gap-1 h-7 px-2.5 rounded-lg text-[#000435] text-[10px] font-bold whitespace-nowrap"
            style={{ background: "linear-gradient(135deg,#FBBF24,#F59E0B)" }}>
            <LogIn size={11} strokeWidth={2.5} /> {t("public.shuleManager")}
          </Link>
          <button type="button" onClick={() => setOpen(!open)}
            className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors"
            style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}>
            {open ? <X size={15} className="text-white" /> : <Menu size={15} className="text-white" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="lg:hidden bg-[#000120] border-t px-4 pb-5 pt-2 space-y-1"
          style={{ borderColor: "rgba(251,191,36,0.12)" }}>
          <div className="px-1 py-2">
            <LanguageSwitcher compact />
          </div>
          {links.map((l) => (
            <Link key={l.label} to={l.href} onClick={() => setOpen(false)}
              className="flex px-4 py-3 rounded-xl text-[14px] font-semibold text-white hover:bg-white/6 hover:text-amber-400 transition-all">
              {l.label}
            </Link>
          ))}
          <div className="pt-2 space-y-2">
            <a
              href={TEACHER_PORTAL_URL}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setOpen(false)}
              className="flex items-center justify-center gap-2 w-full px-4 py-3 rounded-xl text-[14px] font-bold text-white transition-all hover:shadow-[0_4px_20px_rgba(56,189,248,0.3)]"
              style={{
                background:
                  "linear-gradient(135deg, rgba(14,165,233,0.25) 0%, rgba(99,102,241,0.2) 100%)",
                border: "1px solid rgba(125,211,252,0.45)",
              }}
            >
              <GraduationCap size={16} strokeWidth={2.5} className="text-sky-200" />
              {t("public.teacherPortal")}
              <ExternalLink size={13} strokeWidth={2.5} className="opacity-70" />
            </a>
            <Link to="/login-portal-select" onClick={() => setOpen(false)}
              className="btn-shine flex items-center justify-center gap-2 w-full px-4 py-3.5 rounded-xl text-[#000435] text-[14px] font-black"
              style={{ background: "linear-gradient(135deg,#FBBF24,#F59E0B)" }}>
              <LogIn size={16} strokeWidth={2.5} /> {t("public.shuleManager")}
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}

/* ── AI Search Box ─────────────────────────────────────────────── */
function AISearchBox() {
  const { t } = useTranslation();
  const [val, setVal] = useState("");
  const [ph, setPh] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [err, setErr] = useState(null);
  const timer = useRef(null);
  const pi = useRef(0); const ci = useRef(0);

  const prompts = [
    t("public.searchInputHint"),
    t("public.searchPromptPayFees"),
    t("public.searchPromptUid"),
    t("public.searchPromptTrades"),
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
  }, [t]);

  const lookup = async () => {
    const q = val.trim(); setErr(null); setResult(null);
    if (!q) { setErr(t("public.searchErrEnterCode")); return; }
    setLoading(true);
    try {
      const r = await fetch(`${API_BASE}/api/public/student-code-lookup`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code: q }) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || j.success === false) { setErr(j.message || t("public.searchErrLookupFailed")); return; }
      if (j.found) { setResult({ data: j.data, lookupCode: q }); return; }
      const sr = await fetch(`${API_BASE}/api/public/public-pay/school-catalog`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ school_code: q }) });
      const sj = await sr.json().catch(() => ({}));
      if (sr.ok && sj.success && sj.data?.school) { setResult({ school: sj.data, lookupCode: q }); return; }
      setResult({ notFound: true });
    } catch { setErr(t("public.searchErrNetwork")); }
    finally { setLoading(false); }
  };

  return (
    <div className="w-full max-w-[760px] xl:max-w-[860px] mt-0">
      <div className="flex items-center gap-2 mb-2.5 pl-1">
        {[0, 200, 400].map((d) => (
          <span key={d} className="w-1.5 h-1.5 rounded-full bg-[#000435] animate-pulse" style={{ animationDelay: `${d}ms` }} />
        ))}
        <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-[0.14em] sm:tracking-[0.18em] text-[#000435]">
          {t("public.searchBanner")}
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
          placeholder={ph || t("public.searchPlaceholder")}
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
          <button type="button" aria-label={t("public.close")} className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setResult(null)} />
          <div className="relative z-10 w-full sm:max-w-lg max-h-[88dvh] flex flex-col rounded-t-3xl sm:rounded-3xl overflow-hidden"
            style={{ background: "#000435", border: "2px solid rgba(251,191,36,0.3)", boxShadow: "0 32px 80px rgba(0,0,0,.8)" }}>
            <div className="flex items-center justify-between gap-2 px-5 py-4 shrink-0"
              style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
              <div className="flex items-center gap-2">
                <GraduationCap size={17} className="text-amber-400" />
                <span className="text-[14px] font-black text-white">
                  {result.data ? t("public.modalLearnerProfile") : result.school ? t("public.modalSchoolDetails") : t("public.modalNoMatchFound")}
                </span>
              </div>
              <button type="button" onClick={() => setResult(null)} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors">
                <X size={18} className="text-white/60" />
              </button>
            </div>
            <div className="overflow-y-auto px-5 py-5 flex-1 space-y-3">
              {result.notFound && (
                <div>
                  <p className="text-[15px] font-bold text-white mb-2">{t("public.modalNoLearnerOrSchoolFound")}</p>
                  <p className="text-[13px] text-white/55 leading-relaxed mb-4">{t("public.modalCheckStudentCode")}</p>
                  <Link to="/schools" onClick={() => setResult(null)}
                    className="btn-shine inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-[13px] font-black text-[#000435]"
                    style={{ background: "linear-gradient(135deg,#FBBF24,#F59E0B)" }}>
                    {t("public.getStartedCard3Title")}
                  </Link>
                </div>
              )}
              {(result.data || result.school) && (
                <div className="rounded-xl p-4 space-y-3"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
                  {(result.data
                    ? [[t("public.modalFieldStudent"), `${result.data.first_name || ""} ${result.data.last_name || ""}`.trim()], [t("public.modalFieldUid"), result.data.student_uid || "—"], [t("public.modalFieldClass"), result.data.class_name || "—"], [t("public.modalFieldSchool"), result.data.school_name || "—"]]
                    : result.school
                    ? [[t("public.modalFieldSchool"), result.school.school?.school_name || "—"], [t("public.modalFieldCode"), result.school.school?.school_code || "—"], [t("public.modalFieldLocation"), [result.school.school?.district, result.school.school?.province].filter(Boolean).join(", ") || "—"]]
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
                      <CreditCard size={15} strokeWidth={2.5} /> {t("public.modalPayFeesForStudent")}
                    </Link>
                    {slug ? (
                      <Link to={`/school/${encodeURIComponent(slug)}`} onClick={() => setResult(null)}
                        className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-3 text-[13px] font-black text-white transition-colors hover:bg-white/15"
                        style={{ border: "1.5px solid rgba(251,191,36,0.4)", background: "rgba(255,255,255,0.07)" }}>
                        <Globe size={15} strokeWidth={2.2} /> {t("public.modalSchoolMiniWebsite")} <ExternalLink size={13} className="opacity-60" />
                      </Link>
                    ) : (
                      <div className="flex flex-1 items-center justify-center rounded-xl px-3 py-2.5 text-[11px] font-medium text-white/40 text-center"
                        style={{ border: "1px dashed rgba(255,255,255,0.15)" }}>
                        {t("public.modalMiniWebsiteNotPublished")}
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
                      <CreditCard size={15} strokeWidth={2.5} /> {t("public.modalPayFeesFullCheckout")}
                    </Link>
                    <p className="text-[11px] text-white/45 text-center leading-snug px-1">
                      {t("public.modalTuitionHint")}
                    </p>
                  </div>
                );
              })()}
              <button type="button" onClick={() => setResult(null)}
                className="w-full py-3 rounded-xl text-white text-[13px] font-bold transition-colors hover:bg-white/12"
                style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)" }}>
                {t("public.close")}
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
  const { t } = useTranslation();
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
            {t("public.heroTitle1")}{" "}
            <span className="text-white">{t("public.heroTitle2")}</span>
            <br className="hidden sm:block" />
            {t("public.heroTitle3")}{" "}
            <span className="text-white"></span>
          </h1>

          {/* Hero cards (4 only) */}
          <div className="anim-su4 flex flex-col gap-2.5 sm:gap-3 w-full sm:max-w-[clamp(300px,90vw,490px)]">
            <div className="grid grid-cols-2 gap-2 sm:gap-3">
              <Link to={PUBLIC_COMBINED_PAY_PATH}
                className="btn-shine inline-flex items-center justify-center gap-1.5 sm:gap-2 rounded-2xl font-black text-amber-400 transition-all active:scale-[.97] hover:shadow-[0_8px_28px_rgba(251,191,36,.4)]"
                style={{ minHeight: "clamp(44px,5.5vw,56px)", fontSize: "clamp(11px,2.8vw,15px)", background: "#000435" }}>
                <CreditCard size={14} strokeWidth={2.5} className="shrink-0" /> {t("public.payFees")}
              </Link>
              <a href="/parents/login"
                className="inline-flex items-center justify-center gap-1.5 sm:gap-2 rounded-2xl font-black text-white transition-all hover:bg-white/8"
                style={{ minHeight: "clamp(44px,5.5vw,56px)", fontSize: "clamp(11px,2.8vw,15px)", background: "#000435" }}>
                <LogIn size={14} className="text-amber-300 shrink-0" /> {t("public.parentLogin")}
              </a>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:gap-3">
              <Link to="/register"
                className="inline-flex items-center justify-center gap-1.5 sm:gap-2 rounded-2xl font-semibold text-white transition-all hover:bg-amber-400/14"
                style={{ minHeight: "clamp(42px,5vw,52px)", fontSize: "clamp(10.5px,2.6vw,14px)",background: "#000435" }}>
                <Building2 size={14} className="text-amber-400 shrink-0" /> {t("public.registerSchool")}
              </Link>
              <Link to="/services"
                className="inline-flex items-center justify-center gap-1.5 sm:gap-2 rounded-2xl font-semibold text-white transition-all hover:bg-white/10"
                style={{ minHeight: "clamp(42px,5vw,52px)", fontSize: "clamp(10.5px,2.6vw,14px)", background: "#000435" }}>
                <Sparkles size={14} className="text-amber-200/80 shrink-0" /> {t("public.toolsServices")}
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
  const { t } = useTranslation();
  return (
    <section className="py-16 sm:py-24 xl:py-32 bg-[#000120]">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 xl:px-10 2xl:px-16">
        <SH eyebrow={t("public.demoEyebrow")} title={t("public.demoTitle")} light sub={t("public.demoSub")} />
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
                {t("public.comingSoon")}
              </span>
              <p className="text-[13px] font-medium text-white/40">{t("public.demoAvailableHere")}</p>
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
  const { t } = useTranslation();
  const tt = [
    { quote: t("public.testimonial1Quote"), author: "Jean Pierre Nkurunziza", role: t("public.testimonial1Role"), initials: "JN" },
    { quote: t("public.testimonial2Quote"), author: "Ange Uwimana", role: t("public.testimonial2Role"), initials: "AU" },
    { quote: t("public.testimonial3Quote"), author: "Marie Claire Ingabire", role: t("public.testimonial3Role"), initials: "MI" },
  ];
  return (
    <section className="py-16 sm:py-24 xl:py-32 bg-slate-50">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 xl:px-10 2xl:px-16">
        <SH eyebrow={t("public.testimonialsEyebrow")} title={t("public.testimonialsTitle")} sub={t("public.testimonialsSub")} />
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
  const { t } = useTranslation();
  const aa = [
    { Icon: CreditCard, title: t("public.getStartedCard1Title"), desc: t("public.getStartedCard1Desc"), cta: t("public.getStartedCard1Cta"), href: PUBLIC_COMBINED_PAY_PATH },
    { Icon: Package, title: t("public.getStartedCard2Title"), desc: t("public.getStartedCard2Desc"), cta: t("public.getStartedCard2Cta"), href: "/services" },
    { Icon: Search, title: t("public.getStartedCard3Title"), desc: t("public.getStartedCard3Desc"), cta: t("public.getStartedCard3Cta"), href: "/schools" },
    { Icon: GraduationCap, title: t("public.getStartedCard4Title"), desc: t("public.getStartedCard4Desc"), cta: t("public.getStartedCard4Cta"), href: "/schools" },
  ];
  return (
    <section className="py-16 sm:py-24 xl:py-32 bg-slate-50">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 xl:px-10 2xl:px-16">
        <SH eyebrow={t("public.getStartedEyebrow")} title={t("public.getStartedTitle")} sub={t("public.getStartedSub")} />
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
  const { t } = useTranslation();
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
          <span style={{ color: "#F59E0B" }}>{t("public.partnersTrustedWord")}</span>
          {" "}{t("public.partnersSentence")}
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
  const { t } = useTranslation();
  return (
    <section
      className="public-premium-cta-shell"
      style={{
        margin: "32px auto 16px",
        maxWidth: "min(1400px, calc(100% - 1.5rem))",
        borderRadius: 26,
        border: "1px solid rgba(251,191,36,0.42)",
        background: "linear-gradient(132deg,#000435 0%, #00084B 58%, #FBBF24 58%, #F59E0B 100%)",
        boxShadow: "0 22px 50px rgba(0,4,53,0.34)",
        overflow: "hidden",
      }}
    >
      <div style={{ padding: "1.15rem 1rem 1.05rem" }}>
        <div className="cta-grid-hero" style={{ display: "grid", gap: 16, gridTemplateColumns: "1fr" }}>
          <div style={{ position: "relative", zIndex: 2 }}>
            <div className="public-premium-cta-badge" style={{ display: "inline-flex", alignItems: "center", gap: 8, marginBottom: 10, padding: "6px 10px", borderRadius: 999, background: "rgba(255,255,255,0.09)", border: "1px solid rgba(251,191,36,0.38)" }}>
              <Sparkles size={13} color="#FBBF24" />
              <span style={{ color: "#fff", fontSize: 11, fontWeight: 900 }}>
                {t("public.getStartedToday")}
              </span>
            </div>

            <h3 className="public-premium-cta-title" style={{ margin: "0 0 8px", color: "#fff", fontWeight: 900, fontSize: "clamp(28px, 4.7vw, 48px)", lineHeight: 1.02 }}>
              {t("servicePage.premiumCtaTitle", { defaultValue: "Fata serivisi, ishyura cyangwa ubisabe babyeyi" })}
            </h3>
            <p style={{ margin: "0 0 14px", color: "rgba(255,255,255,0.78)", fontSize: 14, lineHeight: 1.55, maxWidth: 620 }}>
              {t("servicePage.premiumCtaSub", { defaultValue: "Babyeyi app iguha uburenganzira bwo kubona serivisi z'uburezi, kwishyura amafaranga, kuganira na agent no gukurikirana byose aho uri hose." })}
            </p>

            <div style={{ display: "grid", gap: 8, gridTemplateColumns: "repeat(auto-fit,minmax(255px,1fr))", marginBottom: 12 }}>
              <Link className="public-premium-cta-btn-main" to="/schools" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 7, minHeight: 45, borderRadius: 12, textDecoration: "none", fontWeight: 900, fontSize: 13, color: "#000435", background: "linear-gradient(135deg,#FBBF24,#F59E0B)" }}>
                <Search size={14} />
                {t("public.exploreSchools")}
              </Link>
              <Link className="public-premium-cta-btn-alt" to="/register" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 7, minHeight: 45, borderRadius: 12, textDecoration: "none", fontWeight: 800, fontSize: 13, color: "#fff", border: "1px solid rgba(251,191,36,0.5)", background: "rgba(255,255,255,0.06)" }}>
                <Building2 size={14} color="#FBBF24" />
                {t("public.registerSchool")}
              </Link>
              <Link className="public-premium-cta-btn-alt" to="/find-agent" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 7, minHeight: 45, borderRadius: 12, textDecoration: "none", fontWeight: 800, fontSize: 13, color: "#fff", border: "1px solid rgba(255,255,255,0.24)",
                 background: "rgba(255,255,255,0.04)", width: "100%" }}>
                <Users size={14} />
                {t("servicePage.premiumCtaSecondary", { defaultValue: "Ganira na Agent" })}
              </Link>
            </div>

          </div>

          <div className="cta-visual-wrap public-premium-cta-visual" style={{ position: "relative", minHeight: 290 }}>
            <div style={{ position: "absolute", right: 6, top: 8, bottom: 8, left: "22%", borderRadius: 18, background: "rgba(0,4,53,0.12)", border: "1px solid rgba(255,255,255,0.25)" }} />
            <div
              className="public-premium-cta-card"
              style={{
                position: "absolute",
                left: "2%",
                top: "8%",
                width: "42%",
                maxWidth: 220,
                minWidth: 150,
                borderRadius: 24,
                background: "#fff",
                border: "6px solid #111",
                boxShadow: "0 20px 36px rgba(0,0,0,.24)",
                transform: "rotate(-4deg)",
                padding: 10,
              }}
            >
              <div style={{ height: 14, borderRadius: 99, background: "#E2E8F0", marginBottom: 10 }} />
              <div style={{ height: 18, borderRadius: 8, background: "#FFF4D6", marginBottom: 8 }} />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 8 }}>
                <div style={{ height: 34, borderRadius: 8, background: "#F8FAFC", border: "1px solid #E2E8F0" }} />
                <div style={{ height: 34, borderRadius: 8, background: "#F8FAFC", border: "1px solid #E2E8F0" }} />
              </div>
              <div style={{ height: 42, borderRadius: 10, background: "#000435", color: "#FBBF24", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800 }}>
                babyeyi
              </div>
            </div>
            <img
              src={mobileHero}
              alt={t("servicePage.shulekitImageAlt")}
              style={{
                position: "absolute",
                right: 0,
                bottom: 0,
                width: "72%",
                maxWidth: 380,
                height: "auto",
                objectFit: "contain",
                filter: "drop-shadow(0 16px 26px rgba(0,4,53,.34))",
              }}
            />
          </div>
        </div>
      </div>
      <style>{`
        .public-premium-cta-shell {
          position: relative;
          isolation: isolate;
        }
        .public-premium-cta-shell::before {
          content: "";
          position: absolute;
          inset: -25% auto auto -20%;
          width: 52%;
          aspect-ratio: 1;
          border-radius: 999px;
          pointer-events: none;
          background: radial-gradient(circle, rgba(251,191,36,0.22) 0%, rgba(251,191,36,0) 72%);
          animation: publicPremiumGlow 5.2s ease-in-out infinite;
        }
        .public-premium-cta-shell::after {
          content: "";
          position: absolute;
          inset: auto -18% -30% auto;
          width: 48%;
          aspect-ratio: 1;
          border-radius: 999px;
          pointer-events: none;
          background: radial-gradient(circle, rgba(255,255,255,0.16) 0%, rgba(255,255,255,0) 74%);
          animation: publicPremiumGlow 6.4s ease-in-out infinite reverse;
        }
        .public-premium-cta-badge { animation: publicPremiumBadgeFloat 3.8s ease-in-out infinite; }
        .public-premium-cta-title { animation: publicPremiumTitleIn .72s ease-out both; }
        .public-premium-cta-visual { animation: publicPremiumVisualFloat 4.4s ease-in-out infinite; }
        .public-premium-cta-card { animation: publicPremiumCardTilt 6s ease-in-out infinite; transform-origin: center; }
        .public-premium-cta-btn-main, .public-premium-cta-btn-alt {
          transition: transform .22s ease, box-shadow .22s ease, background .22s ease;
        }
        .public-premium-cta-btn-main:hover, .public-premium-cta-btn-alt:hover {
          transform: translateY(-2px);
          box-shadow: 0 12px 24px rgba(0,4,53,.22);
        }
        @keyframes publicPremiumGlow {
          0%, 100% { transform: scale(1); opacity: .6; }
          50% { transform: scale(1.08); opacity: 1; }
        }
        @keyframes publicPremiumBadgeFloat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-3px); }
        }
        @keyframes publicPremiumVisualFloat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
        @keyframes publicPremiumCardTilt {
          0%, 100% { transform: rotate(-4deg); }
          50% { transform: rotate(-1deg); }
        }
        @keyframes publicPremiumTitleIn {
          0% { opacity: 0; transform: translateY(12px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @media (min-width: 980px) {
          .cta-grid-hero { grid-template-columns: 56% 44% !important; align-items: center; min-height: 430px; }
        }
        @media (max-width: 640px) {
          .cta-visual-wrap { min-height: 220px !important; }
        }
      `}</style>
    </section>
  );
}

/* ── Footer ────────────────────────────────────────────────────── */
function Footer() {
  const { t, i18n } = useTranslation();
  const localizedDate = new Intl.DateTimeFormat(i18n.language || "en", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());
  const cols = [
    { title: t("public.footerPlatform"), links: [{ l: t("public.footerAbout"), h: "#about" }, { l: t("public.features"), h: "/features", i: true }, { l: t("public.homePage"), h: "/", i: true }, { l: t("public.footerPricing"), h: "#pricing" }] },
    { title: t("public.footerSchools"),  links: [{ l: t("public.footerSearchSchools"), h: "/schools", i: true }, { l: t("public.footerPayByCode"), h: PUBLIC_COMBINED_PAY_PATH, i: true }, { l: t("public.registerSchool"), h: "/register", i: true }, { l: t("public.footerTvetTrades"), h: "/schools", i: true }] },
    { title: t("public.footerAccounts"), links: [{ l: t("public.footerSchoolManagerLogin"), h: "/login-portal-select", i: true }, { l: t("public.parentLogin"), h: "/parents/login", i: true }, { l: t("public.footerStaffLogin"), h: "/login/lite", i: true }, { l: t("public.services"), h: "/services", i: true }] },
    { title: t("public.footerSupport"),  links: [{ l: t("public.footerHelpCenter"), h: "#" }, { l: t("public.contactUs"), h: "#contact" }, { l: t("public.privacyPolicy"), h: "#" }, { l: t("public.terms"), h: "#" }] },
  ];
  return (
    <footer style={{ background: "#000435" }}>
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
              {t("public.brandTagline")}
            </p>
            <div className="mb-4">
              <LanguageSwitcher compact />
            </div>
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
        <p className="text-slate-700 mb-5" style={{ fontSize: "clamp(10px,0.85vw,12px)" }}>
          {t("public.today", { date: localizedDate })}
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-slate-700" style={{ fontSize: "clamp(10px,0.85vw,12px)" }}>
            © {new Date().getFullYear()} Babyeyi Rwanda. {t("public.allRightsReserved")}
          </p>
          <p className="text-slate-800" style={{ fontSize: "clamp(10px,0.85vw,12px)" }}>{t("public.madeWith")}</p>
        </div>
      </div>
    </footer>
  );
}

/* ── Root ──────────────────────────────────────────────────────── */
export default function PublicPage() {
  const { t, i18n } = useTranslation();
  const { loading: authLoading } = useAuth();
  const [langPulse, setLangPulse] = useState(0);

  useEffect(() => {
    document.title = "Babyeyi System";
  }, []);

  useEffect(() => {
    const onLanguageChanged = () => {
      setLangPulse((v) => v + 1);
      document.title = `Babyeyi System · ${t("language.label")}: ${i18n.language?.toUpperCase?.() || "EN"}`;
    };
    i18n.on("languageChanged", onLanguageChanged);
    return () => i18n.off("languageChanged", onLanguageChanged);
  }, [i18n, t]);

  if (authLoading) {
    return <BabyeyiPortalLoader message="Loading" />;
  }

  return (
    <div key={langPulse} className="animate-[fade-in_.35s_ease]">
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